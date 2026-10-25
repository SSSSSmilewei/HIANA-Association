import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../app/home_shell.dart';
import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../core/heatmap.dart';
import '../../data/api_client.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../widgets/heat.dart';
import '../../widgets/hx_icons.dart';
import '../../widgets/ui.dart';
import '../checkin/attendance_phase.dart';
import '../checkin/checkin_page.dart';
import '../courses/course_page.dart';
import '../notices/notices_page.dart';

/// 首页：问候和教学周、热力墙上的签到卡、每门在学课程的下一步、公告和比赛。
class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final h = Hx.of(context);
    final me = ref.watch(sessionProvider).valueOrNull?.member;
    final cal = ref.watch(calendarProvider).valueOrNull;
    final att = ref.watch(attendanceProvider);
    final next = ref.watch(nextProvider);
    final notices = ref.watch(noticesProvider);
    final heat = ref.watch(heatmapProvider).valueOrNull;
    final grid = heat == null ? null : overview(heat.series, heat.today, weeks: 30);
    final today = cal?.today ?? att.valueOrNull?.today;

    return HianaPage(
      title: '${greeting()}，${me?.name ?? ''}',
      onRefresh: () async {
        ref.invalidate(calendarProvider);
        ref.invalidate(noticesProvider);
        refreshLearning(ref);
        await ref.refresh(attendanceProvider.future).then((_) {}, onError: (_) {});
      },
      children: [
        if (today != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(28, 0, 28, 14),
            child: Text(
              [if (cal?.week != null) '第 ${cal!.week} 周', longDay(today)].join(' · '),
              style: TextStyle(fontSize: 14, color: h.sub),
            ),
          ),
        // 热力墙 + 玻璃签到卡
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: Container(
              height: 276,
              color: h.wall,
              child: Stack(
                children: [
                  Positioned.fill(child: HeatWall(grid: grid)),
                  Positioned(
                    left: 10,
                    right: 10,
                    bottom: 10,
                    child: Rise(
                      index: 4,
                      child: Glass(
                        radius: 22,
                        padding: const EdgeInsets.fromLTRB(18, 16, 16, 16),
                        child: att.when(
                          loading: () => const _CardSkeleton(),
                          error: (e, _) => Text('$e', style: TextStyle(color: h.sub, fontSize: 13)),
                          data: (s) => _CheckinCard(s: s),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        SectionHead(
          '接下来',
          trailing: _LinkText('全部课程', onTap: () => ShellTabs.of(context)?.call(1)),
        ),
        ...next.when(
          loading: () => [const Padding(padding: EdgeInsets.symmetric(horizontal: 12), child: Skeleton(height: 210, radius: 22))],
          error: (e, _) => [Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: ErrorCard(error: e, onRetry: () => ref.invalidate(nextProvider)))],
          data: (items) => items.isEmpty
              ? [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: EmptyCard(
                      title: '还没选课',
                      body: '先选三门必修：Missing Semester、Git 和 CS50x。选了的课会在这里显示下一步该学什么。',
                      action: HxButton('去选课', onTap: () => ShellTabs.of(context)?.call(1)),
                    ),
                  ),
                ]
              : [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: HxCard(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Column(
                        children: [
                          for (var i = 0; i < items.length; i++) ...[
                            if (i > 0) Padding(padding: const EdgeInsets.only(left: 70), child: Container(height: 1, color: h.line)),
                            Rise(index: i, child: _NextRow(item: items[i])),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
        ),
        ...notices.maybeWhen(
          data: (list) => _noticeBlocks(context, list, today),
          orElse: () => const <Widget>[],
        ),
      ],
    );
  }

  List<Widget> _noticeBlocks(BuildContext context, List<Notice> list, String? today) {
    final h = Hx.of(context);
    final plain = list.where((n) => !n.isCompetition).take(2).toList();
    final comps = list.where((n) => n.isCompetition && (n.deadline == null || today == null || n.deadline!.compareTo(today) >= 0)).toList()
      ..sort((a, b) => (a.deadline ?? '9999').compareTo(b.deadline ?? '9999'));
    if (plain.isEmpty && comps.isEmpty) return const [];
    void open() => context.pushPage(const NoticesPage());
    return [
      SectionHead('公告与比赛', trailing: _LinkText('全部', onTap: open)),
      if (comps.isNotEmpty)
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          child: _CompetitionTeaser(n: comps.first, today: today, more: comps.length - 1, onTap: open),
        ),
      if (plain.isNotEmpty)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: HxCard(
            onTap: open,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
            child: Column(
              children: [
                for (var i = 0; i < plain.length; i++)
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(border: i > 0 ? Border(top: BorderSide(color: h.line)) : null),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (plain[i].pinned) ...[HxTag('置顶', bg: h.tint, fg: h.accentText, bold: true), const SizedBox(width: 10)],
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(plain[i].title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: h.ink)),
                              if (plain[i].body.isNotEmpty)
                                Text(plain[i].body, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13, color: h.sub)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
    ];
  }
}

class _LinkText extends StatelessWidget {
  const _LinkText(this.text, {required this.onTap});
  final String text;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return Pressable(
      onTap: onTap,
      semanticLabel: text,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(text, style: TextStyle(fontSize: 14, color: h.accentText)),
            const SizedBox(width: 2),
            HxIconView(HxIcon.arrowRight, size: 16, color: h.accentText, stroke: 2),
          ],
        ),
      ),
    );
  }
}

class _CardSkeleton extends StatelessWidget {
  const _CardSkeleton();

  @override
  Widget build(BuildContext context) => const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [Skeleton(height: 20, width: 120), SizedBox(height: 10), Skeleton(height: 28, width: 180), SizedBox(height: 12), Skeleton(height: 44, width: 150, radius: 16)],
      );
}

/// 首页签到卡：按现在的情况给一句话和一个按钮。
class _CheckinCard extends StatelessWidget {
  const _CheckinCard({required this.s});
  final AttendanceState s;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final p = phaseOf(s, DateTime.now().millisecondsSinceEpoch);
    final window = '${s.evening.windowStart} – ${s.evening.windowEnd}';
    void openCheckin(String go) => context.pushPage(CheckinPage(standalone: true, go: go));

    Widget title(String t) => Text(t, style: TextStyle(fontSize: 21, height: 1.3, fontWeight: FontWeight.w700, color: h.ink));
    Widget sub(String t) => Padding(padding: const EdgeInsets.only(top: 2), child: Text(t, style: TextStyle(fontSize: 13, color: h.sub)));
    Widget top(Widget tag, String right) => Row(
          children: [
            tag,
            const Spacer(),
            Text(right, style: TextStyle(fontSize: 12, color: h.sub, fontFeatures: kTabular)),
          ],
        );

    final (Widget head, String t, String s2, Widget? action) = switch (p) {
      PhaseIn(:final scene, :final inAt, :final minutes, :final endsAt) => (
          top(HxTag('${kindLabel(scene)} · 学习中', bg: h.tint, fg: h.accentText, dot: h.accent, bold: true), '${hhmm(inAt)} 签到'),
          '已经学了 ${minutesText(minutes)}',
          '离开前拍照签退。忘了的话 ${hhmm(endsAt)} 会自动结束。',
          HxButton('拍照签退', icon: HxIcon.camera, onTap: () => openCheckin('out')),
        ),
      PhaseOpen(:final remaining) => (
          top(HxTag('晚自习进行中', bg: h.tint, fg: h.accentText, dot: h.now, bold: true), window),
          '你还没签到',
          '还有 ${minutesText(remaining)}结束，到教室后拍一张现场照片。',
          HxButton('拍照签到', icon: HxIcon.camera, onTap: () => openCheckin('evening')),
        ),
      PhaseDone(:final inAt, :final outAt, :final auto) => (
          top(HxTag('今晚签到了', bg: h.okBg, fg: h.okInk), window),
          '${hhmm(inAt)} – ${outAt == null ? '进行中' : hhmm(outAt)}',
          auto ? '这次没签退，按结束时间记的。下次走前记得拍一张。' : '今天的格子已经亮了。',
          null,
        ),
      PhaseLater(:final opensAt) => (
          top(HxTag('今晚有晚自习'), window),
          '${hhmm(opensAt)} 起可以签到',
          '在大创场地学习的话，现在就可以签场地。',
          HxButton('场地签到', kind: HxButtonKind.ghost, onTap: () => openCheckin('venue')),
        ),
      PhaseNone(:final next) => (
          top(HxTag('今天没有晚自习'), next == null ? '' : '下次：$next ${s.evening.windowStart}'),
          '去大创场地学一会儿？',
          '进场拍照签到，离开拍照签退。',
          HxButton('场地签到', icon: HxIcon.camera, onTap: () => openCheckin('venue')),
        ),
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        head,
        const SizedBox(height: 10),
        title(t),
        sub(s2),
        if (action != null) ...[const SizedBox(height: 12), action],
      ],
    );
  }
}

/// “接下来”的一行：课程、下一个单元、打勾完成。
class _NextRow extends ConsumerStatefulWidget {
  const _NextRow({required this.item});
  final NextItem item;

  @override
  ConsumerState<_NextRow> createState() => _NextRowState();
}

class _NextRowState extends ConsumerState<_NextRow> {
  bool _busy = false;
  bool _done = false;

  Future<void> _complete() async {
    final u = widget.item.next;
    if (u == null || _busy) return;
    HapticFeedback.lightImpact();
    setState(() {
      _busy = true;
      _done = true;
    });
    try {
      final next = await ref.read(apiProvider).setUnitDone(widget.item.slug, u.id, true);
      if (mounted) showHxToast(context, next == null ? '${widget.item.title} 全部学完了' : '完成了。下一步：${next.title}');
      refreshLearning(ref);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _done = false);
        showHxToast(context, e.message, error: true);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final it = widget.item;
    final u = it.next;
    return Pressable(
      onTap: () => context.pushPage(CoursePage(slug: it.slug)),
      scale: 0.985,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
        child: Row(
          children: [
            HxRing(
              ratio: it.progress.ratio,
              size: 44,
              child: HxIconView(kindIcon(u?.kind ?? 'reading'), size: 16, color: h.accentText),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${it.title} · ${it.progress.doneUnits}/${it.progress.units}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: h.sub),
                  ),
                  const SizedBox(height: 2),
                  Text(u?.title ?? '学完了', maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: h.ink)),
                  if (u != null) Text('${u.kindLabel} · ${u.periods} 课时', style: TextStyle(fontSize: 12, color: h.sub)),
                ],
              ),
            ),
            if (u != null) CheckCircle(done: _done, onTap: _complete, label: '标记完成：${u.title}', next: true),
          ],
        ),
      ),
    );
  }
}

/// 打勾的圆圈：完成时填满橙色，对勾画出来。
class CheckCircle extends StatelessWidget {
  const CheckCircle({super.key, required this.done, required this.onTap, required this.label, this.next = false});
  final bool done;
  final VoidCallback onTap;
  final String label;
  final bool next;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return Pressable(
      onTap: onTap,
      scale: 0.9,
      semanticLabel: label,
      child: SizedBox(
        width: 48,
        height: 48,
        child: Center(
          child: AnimatedContainer(
            duration: HxMotion.mid,
            curve: HxMotion.ease,
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: done ? h.accent : const Color(0x00000000),
              border: done ? null : Border.all(color: next ? h.accent : h.lineStrong, width: 1.5),
            ),
            child: AnimatedScale(
              scale: done ? 1 : 0.4,
              duration: const Duration(milliseconds: 360),
              curve: Curves.easeOutBack,
              child: AnimatedOpacity(
                opacity: done ? 1 : 0,
                duration: HxMotion.fast,
                child: const Center(child: HxIconView(HxIcon.check, size: 20, color: Color(0xFFFFFFFF), stroke: 2.4)),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CompetitionTeaser extends StatelessWidget {
  const _CompetitionTeaser({required this.n, required this.today, required this.more, required this.onTap});
  final Notice n;
  final String? today;
  final int more;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final days = n.deadline != null && today != null ? daysBetween(today!, n.deadline!) : null;
    return Pressable(
      onTap: onTap,
      scale: 0.985,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Container(
          color: h.night,
          padding: const EdgeInsets.fromLTRB(18, 16, 16, 16),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Positioned(
                right: -40,
                top: -36,
                child: Transform.rotate(
                  angle: -0.14,
                  child: SizedBox(
                    width: 150,
                    child: Wrap(
                      spacing: 4,
                      runSpacing: 4,
                      children: [
                        for (var j = 0; j < 30; j++)
                          Container(
                            width: 21,
                            height: 21,
                            decoration: BoxDecoration(color: Hx.nightHeat[(j * 13 + j * j) % 5], borderRadius: BorderRadius.circular(6)),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const HxTag('比赛', bg: Color(0x2EFFAA6B), fg: Color(0xFFFFC79C), bold: true),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: 220,
                    child: Text(n.title, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: Hx.nightInk)),
                  ),
                  if (n.body.isNotEmpty)
                    SizedBox(
                      width: 240,
                      child: Text(n.body, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, color: Hx.nightSub)),
                    ),
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (days != null) ...[
                        Text('$days', style: const TextStyle(fontSize: 36, height: 1, fontWeight: FontWeight.w700, color: Hx.nightAccent, fontFeatures: kTabular)),
                        const SizedBox(width: 6),
                        Text(
                          '天后截止${n.joined ? ' · 你已登记' : n.entries.isNotEmpty ? ' · ${n.entries.length} 人登记' : ''}',
                          style: const TextStyle(fontSize: 13, color: Hx.nightSub),
                        ),
                      ] else
                        Text(n.joined ? '你已登记' : '长期有效', style: const TextStyle(fontSize: 13, color: Hx.nightSub)),
                      const Spacer(),
                      if (more > 0) Text('还有 $more 场', style: const TextStyle(fontSize: 13, color: Hx.nightSub)),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
