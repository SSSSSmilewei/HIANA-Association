import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/hiana_page.dart';
import '../../core/heatmap.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../widgets/common.dart';
import '../../widgets/heatmap_view.dart';

/// 首页：本周主线、路线进度、本周任务、今晚打卡状态、最近 17 周热力图。
class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  Future<void> _refresh(WidgetRef ref) => Future.wait([
        ref.refresh(courseProvider.future),
        ref.refresh(checkinProvider.future),
        ref.refresh(heatmapProvider.future),
      ]).then((_) {}, onError: (_) {});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final course = ref.watch(courseProvider);
    final checkin = ref.watch(checkinProvider);
    final heatmap = ref.watch(heatmapProvider);
    final name = ref.watch(sessionProvider).valueOrNull?.member?.name;

    final hour = DateTime.now().toUtc().add(const Duration(hours: 8)).hour;
    final hello = hour < 5 ? '夜深了' : hour < 11 ? '早上好' : hour < 13 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
    return HianaPage(
      title: name == null ? '首页' : '$name，$hello',
      onRefresh: () => _refresh(ref),
      children: [
        ...course.when(
          loading: () => const [LoadingBlock()],
          error: (e, _) => [NoticeCard(message: '$e', actionLabel: '重试', onAction: () => ref.invalidate(courseProvider))],
          data: (c) => _courseBlocks(context, c),
        ),
        checkin.maybeWhen(
          data: (s) => Section(
            title: '今晚',
            children: [
              MiuixBasicComponent(
                title: s.checkedAt == null ? '还没打卡' : '已打卡',
                summary: s.checkedAt == null ? '晚自习打卡时间 ${s.windowText}，在“打卡”页完成' : '${hhmm(s.checkedAt!)} 打的卡，累计 ${s.total} 次',
              ),
            ],
          ),
          orElse: () => const SizedBox.shrink(),
        ),
        heatmap.maybeWhen(
          data: (h) => Section(
            title: '最近 17 周',
            padding: const EdgeInsets.all(16),
            children: [HeatmapView(grid: overview(h.series, h.today, weeks: 17), unit: '个来源有记录')],
          ),
          orElse: () => const SizedBox.shrink(),
        ),
      ],
    );
  }

  List<Widget> _courseBlocks(BuildContext context, Course c) {
    final week = c.thisWeek;
    if (week == null) return [const NoticeCard(message: '这周没有排主线内容，等会长更新', warning: false)];
    final colors = MiuixTheme.of(context).colors;
    final styles = MiuixTheme.of(context).textStyles;
    final done = c.currentWeek + 1;
    return [
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        child: MiuixCard(
          insideMargin: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              MiuixText('${c.name} · 第 ${c.currentWeek} 周', color: colors.onSurfaceVariantSummary, fontSize: 13),
              const SizedBox(height: 4),
              MiuixText(week.title, style: styles.title2),
              const SizedBox(height: 6),
              MiuixText(week.summary, color: colors.onSurfaceVariantSummary),
              const SizedBox(height: 14),
              MiuixLinearProgressIndicator(progress: done / c.weeks.length),
              const SizedBox(height: 6),
              MiuixText('路线进度 $done / ${c.weeks.length} 周', color: colors.onSurfaceVariantSummary, fontSize: 13),
            ],
          ),
        ),
      ),
      Section(
        title: '本周任务',
        children: [
          for (final t in week.tasks)
            MiuixArrowPreference(
              title: t.title,
              summary: t.detail,
              enabled: t.href != null,
              onClick: t.href == null ? null : () => launchUrl(Uri.parse(t.href!), mode: LaunchMode.externalApplication),
            ),
        ],
      ),
    ];
  }
}
