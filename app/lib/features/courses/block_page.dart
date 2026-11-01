import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../data/blocks.dart';
import '../../data/providers.dart';
import '../../widgets/hx_icons.dart';
import '../../widgets/markdown_view.dart';
import '../../widgets/ui.dart';
import 'course_page.dart';
import 'lesson_page.dart' show openHref;

/// 知识块：手机上用大纲树展示（网站宽屏是导图）。每个阶段一张卡片，卡片里是课程和子分组。
class BlockPage extends ConsumerWidget {
  const BlockPage({super.key, required this.slug});
  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final h = Hx.of(context);
    final block = ref.watch(blockProvider(slug));
    final all = ref.watch(blocksProvider).valueOrNull ?? const [];
    final progress = ref.watch(courseProgressProvider);
    return HianaPage(
      title: block.valueOrNull?.title ?? '知识块',
      showBack: true,
      onRefresh: () =>
          ref.refresh(coursesProvider.future).then((_) {}, onError: (_) {}),
      children: block.when(
        loading: () => const [
          Padding(
            padding: EdgeInsets.all(12),
            child: Skeleton(height: 320, radius: 22),
          ),
        ],
        error: (e, _) => [
          Padding(
            padding: const EdgeInsets.all(12),
            child: ErrorCard(
              error: e,
              onRetry: () => ref.invalidate(blockProvider(slug)),
            ),
          ),
        ],
        data: (b) {
          final ratio = b.ratio(progress);
          final next = b.nextCourse(progress);
          final nextBlocks = [
            for (final s in b.next) ...all.where((x) => x.slug == s),
          ];
          final meta = [
            if (b.audience.isNotEmpty) '适合：${b.audience}',
            if (b.periods > 0) '必学部分${blockHours(b.periods)}起',
          ];
          return [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    b.summary,
                    style: TextStyle(fontSize: 16, height: 1.5, color: h.ink),
                  ),
                  for (final m in meta)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        m,
                        style: TextStyle(fontSize: 13, color: h.sub),
                      ),
                    ),
                  if (ratio > 0) ...[
                    const SizedBox(height: 12),
                    Text(
                      '完成 ${(ratio * 100).round()}%',
                      style: TextStyle(
                        fontSize: 13,
                        color: h.sub,
                        fontFeatures: kTabular,
                      ),
                    ),
                    const SizedBox(height: 6),
                    HxBar(ratio),
                  ],
                ],
              ),
            ),
            if (next?.course != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                child: HxCard(
                  color: h.nextBg,
                  onTap: () => context.pushPage(CoursePage(slug: next.course!)),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              ratio > 0 ? '接下来' : '从这里开始',
                              style: TextStyle(fontSize: 13, color: h.sub),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              next!.courseTitle ?? next.course!,
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                color: h.ink,
                              ),
                            ),
                            if (next.note != null)
                              Text(
                                next.note!,
                                style: TextStyle(fontSize: 13, color: h.sub),
                              ),
                          ],
                        ),
                      ),
                      HxIconView(
                        HxIcon.arrowRight,
                        size: 18,
                        color: h.accentText,
                      ),
                    ],
                  ),
                ),
              ),
            if (b.intro.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 4),
                child: MarkdownView(
                  source: b.intro,
                  onLink: (href) => openHref(context, href),
                ),
              ),
            for (final n in b.nodes) ..._stage(context, n, progress),
            if (nextBlocks.isNotEmpty) ...[
              const SectionHead('学完以后'),
              for (final x in nextBlocks)
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                  child: BlockCard(b: x),
                ),
            ],
            const SizedBox(height: 24),
          ];
        },
      ),
    );
  }

  /// 第一层节点：分组 → 小标题 + 一张卡片；课程、链接 → 单独一张卡片
  List<Widget> _stage(
    BuildContext context,
    BlockNode n,
    double Function(String) progress,
  ) {
    final h = Hx.of(context);
    if (n.kind != BlockNodeKind.group) {
      return [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
          child: HxCard(
            padding: const EdgeInsets.all(6),
            child: _Leaf(n: n, progress: progress),
          ),
        ),
      ];
    }
    return [
      SectionHead(
        n.title ?? '',
        trailing: _GroupTags(n: n, progress: progress),
      ),
      if (n.note != null)
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
          child: Text(n.note!, style: TextStyle(fontSize: 13, color: h.sub)),
        ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: HxCard(
          padding: const EdgeInsets.all(6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final c in n.children) _Branch(n: c, progress: progress),
            ],
          ),
        ),
      ),
    ];
  }
}

class _GroupTags extends StatelessWidget {
  const _GroupTags({required this.n, required this.progress});
  final BlockNode n;
  final double Function(String) progress;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final r = n.ratio(progress);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (r != null && r >= 1) HxTag('完成', bg: h.okBg, fg: h.okInk),
        if (n.pick != null) ...[
          const SizedBox(width: 6),
          HxTag(
            '${n.children.length} 选 ${n.pick}',
            bg: h.tint,
            fg: h.accentText,
          ),
        ],
        if (n.optional) ...[const SizedBox(width: 6), const HxTag('选学')],
      ],
    );
  }
}

/// 卡片里的一个节点；子分组缩进一层，左边一条线。
class _Branch extends StatelessWidget {
  const _Branch({required this.n, required this.progress});
  final BlockNode n;
  final double Function(String) progress;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    if (n.kind != BlockNodeKind.group) return _Leaf(n: n, progress: progress);
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 10, 6, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  n.title ?? '',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: h.ink,
                  ),
                ),
              ),
              _GroupTags(n: n, progress: progress),
            ],
          ),
          Container(
            margin: const EdgeInsets.only(top: 4),
            padding: const EdgeInsets.only(left: 4),
            decoration: BoxDecoration(
              border: Border(left: BorderSide(color: h.line, width: 2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final c in n.children) _Branch(n: c, progress: progress),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Leaf extends StatelessWidget {
  const _Leaf({required this.n, required this.progress});
  final BlockNode n;
  final double Function(String) progress;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final isLink = n.kind == BlockNodeKind.link;
    final r = isLink ? null : progress(n.course!);
    final items = n.itemTitles;
    final meta = [
      if (n.optional) '选学',
      if (n.periods > 0) blockHours(n.periods),
    ].join('  ');
    return Pressable(
      onTap: () => isLink
          ? openHref(context, n.linkUrl!)
          : context.pushPage(CoursePage(slug: n.course!)),
      scale: 0.99,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isLink ? n.linkLabel! : (n.courseTitle ?? n.course!),
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isLink ? h.accentText : h.ink,
                    ),
                  ),
                  if (n.note != null)
                    Text(
                      n.note!,
                      style: TextStyle(fontSize: 13, height: 1.5, color: h.sub),
                    ),
                  if (items.isNotEmpty)
                    Text(
                      '重点：${items.take(3).join('、')}${items.length > 3 ? ' 等 ${items.length} 项' : ''}',
                      style: TextStyle(fontSize: 13, height: 1.5, color: h.sub),
                    ),
                  if (meta.isNotEmpty)
                    Text(meta, style: TextStyle(fontSize: 12, color: h.sub)),
                ],
              ),
            ),
            if (r != null && r >= 1)
              HxTag('学完', bg: h.okBg, fg: h.okInk)
            else if (r != null && r > 0)
              HxTag('在学 ${(r * 100).round()}%', bg: h.tint, fg: h.accentText),
            const SizedBox(width: 4),
            HxIconView(
              isLink ? HxIcon.external : HxIcon.arrowRight,
              size: 16,
              color: h.sub,
            ),
          ],
        ),
      ),
    );
  }
}

/// 课程页、首页上的知识块卡片
class BlockCard extends ConsumerWidget {
  const BlockCard({super.key, required this.b});
  final BlockSummary b;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final h = Hx.of(context);
    final progress = ref.watch(courseProgressProvider);
    final started = b.courses.any((s) => progress(s) > 0);
    return HxCard(
      onTap: () => context.pushPage(BlockPage(slug: b.slug)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  b.audience,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 13, color: h.sub),
                ),
              ),
              if (started) HxTag('在学', bg: h.tint, fg: h.accentText),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            b.title,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: h.ink,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            b.summary,
            style: TextStyle(fontSize: 14, height: 1.5, color: h.sub),
          ),
          const SizedBox(height: 8),
          Text(
            [
              '${b.courses.length} 门课',
              if (b.periods > 0) '${blockHours(b.periods)}起',
            ].join('  ·  '),
            style: TextStyle(
              fontSize: 13,
              color: h.sub,
              fontFeatures: kTabular,
            ),
          ),
        ],
      ),
    );
  }
}
