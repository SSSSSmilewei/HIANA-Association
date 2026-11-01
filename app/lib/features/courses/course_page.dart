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
import '../auth/guest.dart';
import '../../app/page_transition.dart';
import '../../widgets/markdown_view.dart';
import '../home/home_page.dart' show CheckCircle;
import 'lesson_page.dart';

/// 课程详情：基本信息、进度，下面分“介绍”（中文介绍、官方介绍、资源）和“内容”（模块 → 条目）。
class CoursePage extends ConsumerStatefulWidget {
  const CoursePage({super.key, required this.slug});
  final String slug;

  @override
  ConsumerState<CoursePage> createState() => _CoursePageState();
}

class _CoursePageState extends ConsumerState<CoursePage> {
  CourseDetail? _local; // 乐观更新：先在本地打勾，接口回来再以服务器为准
  int _pace = 6;
  int? _tab; // 0 介绍，1 内容；null = 按状态自动选

  Future<void> _toggle(CourseDetail c, CourseItem u) async {
    if (requireLogin(context, ref)) return;
    final done = !c.done.contains(u.id);
    HapticFeedback.lightImpact();
    setState(
      () => _local = c.copyWith(
        done: done ? {...c.done, u.id} : ({...c.done}..remove(u.id)),
        enrollStatus: c.enrollStatus ?? 'active',
      ),
    );
    try {
      final next = await ref.read(apiProvider).setItemDone(c.slug, u.id, done);
      if (done && next == null && mounted) showHxToast(context, '全部学完了');
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
    if (requireLogin(context, ref)) return;
    try {
      await ref.read(apiProvider).setEnrollment(c.slug, status);
      if (mounted) {
        setState(() => _local = c.copyWith(enrollStatus: status));
        showHxToast(
          context,
          const {'paused': '已暂停', 'dropped': '已移出', 'done': '已标记学完'}[status] ??
              '已加入',
        );
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
            child: remote.hasError
                ? ErrorCard(
                    error: remote.error!,
                    onRetry: () => ref.invalidate(courseProvider(widget.slug)),
                  )
                : const Skeleton(height: 360, radius: 24),
          ),
        ],
      );
    }
    final total = c.totalPeriods;
    final donePeriods = c.donePeriods;
    final ratio = total == 0 ? 0.0 : donePeriods / total;
    final next = c.next;
    final weeks = ((total - donePeriods) / _pace).ceil();
    final st = c.enrollStatus;
    final enrolled = st == 'active' || st == 'paused' || st == 'done';
    final tab = !c.hosted
        ? 0
        : (_tab ?? (enrolled || c.done.isNotEmpty ? 1 : 0));
    final facts = <(String, String)>[
      if (c.prerequisites.isNotEmpty) ('先修', c.prerequisites),
      if (c.language.isNotEmpty) ('语言', c.language),
      if (total > 0)
        ('学时', '$total 课时，约 ${(total * 45 / 60).round()} 小时')
      else if (c.hours.isNotEmpty)
        ('学时', c.hours),
      if (c.difficulty > 0) ('难度', stars(c.difficulty)),
    ];
    final kicker = [
      if (c.category.isNotEmpty) c.category,
      if (c.provider.isNotEmpty) c.provider,
    ].join(' / ');

    return HianaPage(
      title: c.title,
      showBack: true,
      onRefresh: () => ref
          .refresh(courseProvider(widget.slug).future)
          .then((_) {}, onError: (_) {}),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (kicker.isNotEmpty)
                Text(kicker, style: TextStyle(fontSize: 14, color: h.sub)),
              const SizedBox(height: 4),
              Hero(
                tag: 'course-${c.slug}',
                child: Text(
                  c.title,
                  style: TextStyle(
                    fontSize: 24,
                    height: 1.3,
                    fontWeight: FontWeight.w700,
                    color: h.ink,
                    decoration: TextDecoration.none,
                  ),
                ),
              ),
              if (c.titleEn != null && c.titleEn != c.title) ...[
                const SizedBox(height: 2),
                Text(c.titleEn!, style: TextStyle(fontSize: 14, color: h.sub)),
              ],
              if (c.summary.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  c.summary,
                  style: TextStyle(fontSize: 16, height: 1.6, color: h.ink),
                ),
              ],
              if (facts.isNotEmpty) ...[
                const SizedBox(height: 14),
                Container(height: 1, color: h.line),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 28,
                  runSpacing: 10,
                  children: [
                    for (final f in facts)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            f.$1,
                            style: TextStyle(fontSize: 13, color: h.sub),
                          ),
                          Text(
                            f.$2,
                            style: TextStyle(fontSize: 15, color: h.ink),
                          ),
                        ],
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 16, 12, 0),
          child: HxCard(
            radius: 24,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (c.hosted) ...[
                  Row(
                    children: [
                      HxRing(
                        ratio: ratio,
                        size: 72,
                        stroke: 8,
                        child: Text(
                          '${(ratio * 100).round()}%',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: h.ink,
                            fontFeatures: kTabular,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${c.done.length} / ${c.items.length}',
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w700,
                                color: h.ink,
                                fontFeatures: kTabular,
                              ),
                            ),
                            Text(
                              '已学 $donePeriods / $total 课时',
                              style: TextStyle(
                                fontSize: 13,
                                color: h.sub,
                                fontFeatures: kTabular,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (next != null) ...[
                    const SizedBox(height: 14),
                    HxButton(
                      '${c.done.isEmpty ? '开始学' : '继续学'}：${next.title}',
                      expand: true,
                      onTap: () => context.pushPage(
                        LessonPage(slug: c.slug, page: next.entry),
                      ),
                    ),
                  ],
                  if (st != 'done' && total > 0) ...[
                    const SizedBox(height: 16),
                    Text('每周课时', style: TextStyle(fontSize: 13, color: h.sub)),
                    const SizedBox(height: 8),
                    HxSeg<int>(
                      options: const [(4, '4'), (6, '6'), (8, '8'), (10, '10')],
                      value: _pace,
                      flat: true,
                      onChanged: (v) => setState(() => _pace = v),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '按这个节奏还要 $weeks 周',
                      style: TextStyle(fontSize: 14, color: h.ink),
                    ),
                  ],
                ] else ...[
                  Text(
                    '这门课在原网站学习，这里记录进度。',
                    style: TextStyle(fontSize: 14, color: h.sub),
                  ),
                  if (st == 'done') ...[
                    const SizedBox(height: 8),
                    HxTag('学完了', bg: h.okBg, fg: h.okInk),
                  ],
                ],
                if (c.peers.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: Text(
                      '${c.peers.take(3).join('、')}${c.peers.length > 3 ? ' 等 ${c.peers.length} 人' : ''}也在学',
                      style: TextStyle(fontSize: 13, color: h.sub),
                    ),
                  ),
                const SizedBox(height: 12),
                if (!enrolled)
                  HxButton(
                    '加入我的课程',
                    kind: c.hosted ? HxButtonKind.ghost : HxButtonKind.primary,
                    expand: true,
                    onTap: () => _enroll(c, 'active'),
                  )
                else if (st == 'paused')
                  HxButton(
                    '继续学',
                    expand: true,
                    onTap: () => _enroll(c, 'active'),
                  )
                else
                  Row(
                    children: [
                      if (!c.hosted && st == 'active')
                        Expanded(
                          child: HxButton(
                            '标记学完',
                            expand: true,
                            onTap: () => _enroll(c, 'done'),
                          ),
                        ),
                      if (c.hosted && st == 'active')
                        Expanded(
                          child: HxButton(
                            '暂停',
                            kind: HxButtonKind.quiet,
                            expand: true,
                            onTap: () => _enroll(c, 'paused'),
                          ),
                        ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: HxButton(
                          '移出',
                          kind: HxButtonKind.quiet,
                          expand: true,
                          onTap: () => _enroll(c, 'dropped'),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
        if (c.hosted)
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 20, 12, 0),
            child: HxSeg<int>(
              options: [(0, '介绍与资源'), (1, '课程内容 ${c.items.length}')],
              value: tab,
              onChanged: (v) => setState(() => _tab = v),
            ),
          ),
        if (tab == 0) ..._intro(context, c) else ..._contents(context, c, next),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Text(c.license, style: TextStyle(fontSize: 13, color: h.sub)),
        ),
      ],
    );
  }

  List<Widget> _intro(BuildContext context, CourseDetail c) {
    final h = Hx.of(context);
    final pkg = ref.watch(packageProvider(c.slug));
    final groups = <String, List<CourseLink>>{};
    for (final l in c.links) {
      groups
          .putIfAbsent(
            kLinkKindLabel.containsKey(l.kind) ? l.kind : 'other',
            () => [],
          )
          .add(l);
    }
    Widget source(String note, CourseLink? s) => Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        [
          note,
          if (s != null) '来自 ${s.label}',
        ].where((x) => x.isNotEmpty).join('，'),
        style: TextStyle(fontSize: 13, color: h.sub),
      ),
    );
    return [
      ...pkg.when(
        loading: () => [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Skeleton(height: 200, radius: 12),
          ),
        ],
        error: (e, _) => [
          Padding(
            padding: const EdgeInsets.all(12),
            child: ErrorCard(
              error: e,
              onRetry: () => ref.invalidate(packageProvider(c.slug)),
            ),
          ),
        ],
        data: (p) => [
          if (p.community != null) ...[
            const SectionHead('课程介绍'),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  source('', p.communitySource),
                  MarkdownView(
                    source: p.community!,
                    onLink: (href) => openHref(context, href),
                  ),
                ],
              ),
            ),
          ],
          if (p.official != null) ...[
            const SectionHead('官方介绍'),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  source('中文翻译', p.officialSource),
                  MarkdownView(
                    source: p.official!,
                    onLink: (href) => openHref(context, href),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
      if (groups.isNotEmpty) ...[
        const SectionHead('课程资源'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: HxCard(
            radius: 22,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final k in kLinkKindLabel.keys)
                  if (groups[k] != null) ...[
                    Padding(
                      padding: const EdgeInsets.only(top: 6, bottom: 6),
                      child: Text(
                        kLinkKindLabel[k]!,
                        style: TextStyle(fontSize: 13, color: h.sub),
                      ),
                    ),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [for (final l in groups[k]!) _ExtLink(link: l)],
                    ),
                    const SizedBox(height: 6),
                  ],
              ],
            ),
          ),
        ),
      ],
    ];
  }

  /// 复制到 CourseTable 的里课表：没学完的条目一行一张卡片（和网站一致）
  void _copyPlan(BuildContext context, String title, List<CourseItem> left) {
    final group = title.split(RegExp('[：:（(]')).first.trim();
    final text = left.map((it) => '${it.title}（${it.periods} 节）').join('\n');
    Clipboard.setData(ClipboardData(text: text));
    HapticFeedback.lightImpact();
    showHxToast(
      context,
      '已复制 ${left.length} 张卡片。在 CourseTable 里课表点“+”，课程填“$group”，粘贴进去',
    );
  }

  List<Widget> _contents(
    BuildContext context,
    CourseDetail c,
    CourseItem? next,
  ) {
    final h = Hx.of(context);
    final single = c.modules.length == 1;
    final left = [
      for (final m in c.modules)
        for (final it in m.items)
          if (!c.done.contains(it.id) && !it.optional) it,
    ];
    return [
      if (left.isNotEmpty)
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 12, 16, 0),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  '还有 ${left.length} 项没学完',
                  style: TextStyle(fontSize: 13, color: h.sub),
                ),
              ),
              Pressable(
                onTap: () => _copyPlan(context, c.title, left),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    '加到里课表',
                    style: TextStyle(fontSize: 14, color: h.accentText),
                  ),
                ),
              ),
            ],
          ),
        ),
      for (final m in c.modules)
        if (m.items.isNotEmpty) ...[
          if (single)
            const SizedBox(height: 12)
          else
            SectionHead(
              m.group == null ? m.title : '${m.group} · ${m.title}',
              trailing: Text(
                '${m.items.where((it) => c.done.contains(it.id)).length} / ${m.items.length}',
                style: TextStyle(
                  fontSize: 13,
                  color: h.sub,
                  fontFeatures: kTabular,
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: HxCard(
              radius: 24,
              padding: const EdgeInsets.all(6),
              child: Column(
                children: [
                  for (final it in m.items)
                    _ItemRow(
                      slug: c.slug,
                      u: it,
                      done: c.done.contains(it.id),
                      solved: c.solved[it.id]?.length ?? 0,
                      isNext: next?.id == it.id,
                      onToggle: () => _toggle(c, it),
                    ),
                ],
              ),
            ),
          ),
        ],
    ];
  }
}

class _ItemRow extends StatelessWidget {
  const _ItemRow({
    required this.slug,
    required this.u,
    required this.done,
    required this.solved,
    required this.isNext,
    required this.onToggle,
  });
  final String slug;
  final CourseItem u;
  final bool done;
  final int solved;
  final bool isNext;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return AnimatedContainer(
      duration: HxMotion.mid,
      padding: const EdgeInsets.fromLTRB(4, 8, 12, 10),
      decoration: BoxDecoration(
        color: isNext ? h.nextBg : null,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CheckCircle(
            done: done,
            next: isNext,
            onTap: onToggle,
            label: '${done ? '取消完成' : '标记完成'}：${u.title}',
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Pressable(
              onTap: () =>
                  context.pushPage(LessonPage(slug: slug, page: u.entry)),
              scale: 0.99,
              child: Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      u.title,
                      style: TextStyle(
                        fontSize: 16,
                        height: 1.4,
                        fontWeight: isNext ? FontWeight.w600 : FontWeight.w500,
                        color: done ? h.sub : h.ink,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: u.kindLabel,
                            style: TextStyle(
                              color: u.isTask ? h.accentText : h.ink,
                              fontWeight: u.isTask
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                            ),
                          ),
                          TextSpan(text: '  ${u.periods} 课时'),
                          if (u.optional) const TextSpan(text: '  选学'),
                          if (u.practiceTotal > 0)
                            TextSpan(text: '  练手 $solved / ${u.practiceTotal}'),
                        ],
                      ),
                      style: TextStyle(fontSize: 13, height: 1.5, color: h.sub),
                    ),
                  ],
                ),
              ),
            ),
          ),
          HxIconView(HxIcon.arrowRight, size: 16, color: h.sub),
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
      onTap: () =>
          launchUrl(Uri.parse(link.url), mode: LaunchMode.externalApplication),
      semanticLabel: '打开 ${link.label}',
      child: Container(
        height: 34,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: h.well,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(link.label, style: TextStyle(fontSize: 14, color: h.ink)),
            const SizedBox(width: 4),
            HxIconView(HxIcon.external, size: 12, color: h.sub, stroke: 2.2),
          ],
        ),
      ),
    );
  }
}
