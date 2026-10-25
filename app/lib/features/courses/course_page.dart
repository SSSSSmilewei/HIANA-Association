import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/hiana_page.dart';
import '../../app/tokens.dart';
import '../../data/api_client.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../widgets/hx_icons.dart';
import '../../widgets/ui.dart';
import '../home/home_page.dart' show CheckCircle;

/// 课程详情：为什么学、怎么上、进度和预计周数、单元列表（点圆圈标记完成）。
class CoursePage extends ConsumerStatefulWidget {
  const CoursePage({super.key, required this.slug});
  final String slug;

  @override
  ConsumerState<CoursePage> createState() => _CoursePageState();
}

class _CoursePageState extends ConsumerState<CoursePage> {
  CourseDetail? _local; // 乐观更新：先在本地打勾，接口回来再以服务器为准
  int _pace = 6;
  bool _all = false;

  Future<void> _toggle(CourseDetail c, Unit u) async {
    final done = !c.done.contains(u.id);
    HapticFeedback.lightImpact();
    setState(() => _local = c.copyWith(done: done ? {...c.done, u.id} : ({...c.done}..remove(u.id)), enrollStatus: c.enrollStatus ?? 'active'));
    try {
      final next = await ref.read(apiProvider).setUnitDone(c.slug, u.id, done);
      if (done && next == null && mounted) showHxToast(context, '${c.title} 全部学完了');
      refreshLearning(ref);
      _reload(c.slug);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _local = c);
        showHxToast(context, e.message, error: true);
      }
    }
  }

  Future<void> _enroll(CourseDetail c, String status) async {
    try {
      await ref.read(apiProvider).setEnrollment(c.slug, status);
      if (mounted) {
        setState(() => _local = c.copyWith(enrollStatus: status));
        showHxToast(context, status == 'paused' ? '已暂停，进度都保留着' : '选上了，首页会显示它的下一步');
      }
      refreshLearning(ref);
      _reload(c.slug);
    } on ApiException catch (e) {
      if (mounted) showHxToast(context, e.message, error: true);
    }
  }

  /// 重新拉一次课程详情，拿到后丢掉本地的乐观版本。
  void _reload(String slug) {
    ref.invalidate(courseProvider(slug));
    ref.read(courseProvider(slug).future).then((_) {
      if (mounted) setState(() => _local = null);
    }, onError: (_) {});
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final remote = ref.watch(courseProvider(widget.slug));
    final c = _local ?? remote.valueOrNull;
    if (c == null) {
      return HianaPage(
        title: '课程',
        showBack: true,
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: remote.hasError ? ErrorCard(error: remote.error!, onRetry: () => ref.invalidate(courseProvider(widget.slug))) : const Skeleton(height: 360, radius: 24),
          ),
        ],
      );
    }
    final total = c.totalPeriods;
    final donePeriods = c.donePeriods;
    final ratio = total == 0 ? 0.0 : donePeriods / total;
    final next = c.next;
    final weeks = ((total - donePeriods) / _pace).ceil();
    final shown = _all || c.units.length <= 12 ? c.units : c.units.sublist(0, 10);
    final st = c.enrollStatus;

    return HianaPage(
      title: c.title,
      showBack: true,
      onRefresh: () => ref.refresh(courseProvider(widget.slug).future).then((_) {}, onError: (_) {}),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(28, 0, 28, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(c.code, style: TextStyle(fontSize: 11, letterSpacing: 0.6, color: h.sub, fontFamily: 'monospace')),
              const SizedBox(height: 6),
              Hero(
                tag: 'course-${c.slug}',
                child: Text(c.title, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: h.ink, decoration: TextDecoration.none)),
              ),
              if (c.titleEn != null) Text('${c.titleEn} · ${c.university}', style: TextStyle(fontSize: 12, color: h.sub)),
              const SizedBox(height: 10),
              Text(c.summary, style: TextStyle(fontSize: 15, height: 1.65, color: h.ink)),
            ],
          ),
        ),
        if (c.why != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 14, 12, 0),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: h.tint, borderRadius: BorderRadius.circular(18)),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  HxIconView(HxIcon.star, size: 20, color: h.accentText),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('为什么学', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: h.accentText)),
                        const SizedBox(height: 2),
                        Text(c.why!, style: TextStyle(fontSize: 14, height: 1.6, color: h.ink)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        // 进度
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
          child: HxCard(
            radius: 24,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    HxRing(
                      ratio: ratio,
                      size: 76,
                      stroke: 8,
                      child: Text('${(ratio * 100).round()}%', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: h.ink, fontFeatures: kTabular)),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('已学 ${c.done.length} / ${c.units.length} 单元', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: h.ink)),
                          Text('$donePeriods / $total 课时', style: TextStyle(fontSize: 13, color: h.sub, fontFeatures: kTabular)),
                          if (c.peers.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                '${c.peers.take(2).join('、')}${c.peers.length > 2 ? ' 等 ${c.peers.length} 人' : ''}也在学',
                                style: TextStyle(fontSize: 12, color: h.sub),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (st != 'done') ...[
                  const SizedBox(height: 16),
                  Text('每周能学几课时', style: TextStyle(fontSize: 13, color: h.sub)),
                  const SizedBox(height: 8),
                  HxSeg<int>(options: const [(4, '4'), (6, '6'), (8, '8'), (10, '10')], value: _pace, flat: true, onChanged: (v) => setState(() => _pace = v)),
                  const SizedBox(height: 8),
                  Text('照这个速度，还要 $weeks 周学完', style: TextStyle(fontSize: 14, color: h.ink)),
                ],
                const SizedBox(height: 16),
                if (st == null || st == 'dropped')
                  HxButton('选这门课', expand: true, onTap: () => _enroll(c, 'active'))
                else if (st == 'paused')
                  HxButton('继续学', expand: true, onTap: () => _enroll(c, 'active'))
                else if (st == 'active')
                  HxButton('先暂停这门课', kind: HxButtonKind.quiet, expand: true, onTap: () => _enroll(c, 'paused'))
                else
                  HxTag('学完了', bg: h.okBg, fg: h.okInk),
              ],
            ),
          ),
        ),
        // 怎么上
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
          child: HxCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _InfoLine(icon: HxIcon.video, title: '视频', text: c.video),
                const SizedBox(height: 12),
                _InfoLine(icon: HxIcon.code, title: '作业', text: c.homework),
              ],
            ),
          ),
        ),
        const SectionHead('单元'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: HxCard(
            radius: 24,
            padding: const EdgeInsets.all(6),
            child: Column(
              children: [
                for (final u in shown)
                  _UnitRow(u: u, done: c.done.contains(u.id), isNext: next?.id == u.id, onToggle: () => _toggle(c, u)),
              ],
            ),
          ),
        ),
        if (c.units.length > 12)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Center(
              child: HxButton(_all ? '收起' : '展开剩下的 ${c.units.length - 10} 个单元', kind: HxButtonKind.ghost, height: 44, onTap: () => setState(() => _all = !_all)),
            ),
          ),
        if (c.resources.isNotEmpty) ...[
          const SectionHead('资料'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Wrap(spacing: 8, runSpacing: 8, children: [for (final l in c.resources) _ExtLink(link: l)]),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(28, 10, 28, 0),
            child: Text('课程内容版权：${c.license}', style: TextStyle(fontSize: 12, color: h.sub)),
          ),
        ],
      ],
    );
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.icon, required this.title, required this.text});
  final HxIcon icon;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(padding: const EdgeInsets.only(top: 2), child: HxIconView(icon, size: 20, color: h.sub)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: h.ink)),
              Text(text, style: TextStyle(fontSize: 13, height: 1.5, color: h.sub)),
            ],
          ),
        ),
      ],
    );
  }
}

class _UnitRow extends StatelessWidget {
  const _UnitRow({required this.u, required this.done, required this.isNext, required this.onToggle});
  final Unit u;
  final bool done;
  final bool isNext;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return AnimatedContainer(
      duration: HxMotion.mid,
      padding: const EdgeInsets.fromLTRB(4, 8, 12, 10),
      decoration: BoxDecoration(color: isNext ? h.nextBg : null, borderRadius: BorderRadius.circular(18)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CheckCircle(done: done, next: isNext, onTap: onToggle, label: '${done ? '取消完成' : '标记完成'}：${u.title}'),
          const SizedBox(width: 6),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        u.title,
                        style: TextStyle(fontSize: 15, height: 1.4, fontWeight: isNext ? FontWeight.w600 : FontWeight.w500, color: done ? h.sub : h.ink),
                      ),
                      if (isNext) HxTag('下一步', bg: h.cta, fg: const Color(0xFFFFFFFF), bold: true),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text('${u.kindLabel} · ${u.periods} 课时${u.note != null ? ' · ${u.note}' : ''}', style: TextStyle(fontSize: 12, height: 1.5, color: h.sub)),
                  if (u.links.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Wrap(spacing: 6, runSpacing: 6, children: [for (final l in u.links) _ExtLink(link: l)]),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ExtLink extends StatelessWidget {
  const _ExtLink({required this.link});
  final CourseLink link;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return Pressable(
      onTap: () => launchUrl(Uri.parse(link.url), mode: LaunchMode.externalApplication),
      semanticLabel: '打开 ${link.label}',
      child: Container(
        height: 34,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(color: h.well, borderRadius: BorderRadius.circular(12)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(link.label, style: TextStyle(fontSize: 13, color: h.ink)),
            const SizedBox(width: 4),
            HxIconView(HxIcon.external, size: 12, color: h.sub, stroke: 2.2),
          ],
        ),
      ),
    );
  }
}
