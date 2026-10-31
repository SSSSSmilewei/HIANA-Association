import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../widgets/ui.dart';
import 'block_page.dart';
import 'course_page.dart';

/// 课程目录：按分类浏览；有站内条目的课排最前。
class CoursesPage extends ConsumerStatefulWidget {
  const CoursesPage({super.key});

  @override
  ConsumerState<CoursesPage> createState() => _CoursesPageState();
}

class _CoursesPageState extends ConsumerState<CoursesPage> {
  final _q = TextEditingController();
  String? _cat;

  @override
  void initState() {
    super.initState();
    _q.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final courses = ref.watch(coursesProvider);
    final blocks = ref.watch(blocksProvider).valueOrNull ?? const [];
    final q = _q.text.trim();
    return HianaPage(
      title: '课程',
      onRefresh: () {
        ref.invalidate(blocksProvider);
        return ref
            .refresh(coursesProvider.future)
            .then((_) {}, onError: (_) {});
      },
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
          child: MiuixTextField(
            controller: _q,
            label: '搜索课程、学校、语言',
            useLabelAsPlaceholder: true,
            singleLine: true,
          ),
        ),
        ...courses.when(
          loading: () => [
            for (var i = 0; i < 3; i++)
              const Padding(
                padding: EdgeInsets.fromLTRB(12, 12, 12, 0),
                child: Skeleton(height: 120, radius: 22),
              ),
          ],
          error: (e, _) => [
            Padding(
              padding: const EdgeInsets.all(12),
              child: ErrorCard(
                error: e,
                onRetry: () => ref.invalidate(coursesProvider),
              ),
            ),
          ],
          data: (list) {
            final cats = <String>[];
            for (final c in list) {
              if (!cats.contains(c.category)) cats.add(c.category);
            }
            final browsing = q.isEmpty && _cat == null;
            final shown = list
                .where(
                  (c) => c.matches(q) && (_cat == null || c.category == _cat),
                )
                .toList();
            final hosted = browsing
                ? shown.where((c) => c.hosted).toList()
                : <CourseSummary>[];
            final rest = browsing
                ? shown.where((c) => !c.hosted).toList()
                : shown;
            Widget rows(List<CourseSummary> cs) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: HxCard(
                padding: EdgeInsets.zero,
                child: Column(
                  children: [
                    for (var i = 0; i < cs.length; i++) ...[
                      if (i > 0) Container(height: 1, color: h.line),
                      _CatalogRow(c: cs[i]),
                    ],
                  ],
                ),
              ),
            );
            return [
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 4),
                child: Row(
                  children: [
                    _Chip(
                      label: '全部',
                      on: _cat == null,
                      onTap: () => setState(() => _cat = null),
                    ),
                    for (final c in cats)
                      _Chip(
                        label: c,
                        on: _cat == c,
                        onTap: () =>
                            setState(() => _cat = _cat == c ? null : c),
                      ),
                  ],
                ),
              ),
              if (shown.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: EmptyCard(title: q.isEmpty ? '没有课程' : '没有找到“$q”'),
                ),
              if (browsing && blocks.isNotEmpty) ...[
                const SectionHead('知识块'),
                for (final b in blocks)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                    child: BlockCard(b: b),
                  ),
              ],
              if (hosted.isNotEmpty) const SectionHead('站内学习'),
              for (final c in hosted)
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                  child: CourseCard(c: c),
                ),
              if (browsing) ...[
                for (final cat in cats)
                  if (rest.any((c) => c.category == cat)) ...[
                    SectionHead(
                      cat,
                      trailing: Text(
                        '${rest.where((c) => c.category == cat).length} 门',
                        style: TextStyle(fontSize: 13, color: h.sub),
                      ),
                    ),
                    rows(rest.where((c) => c.category == cat).toList()),
                  ],
              ] else if (rest.isNotEmpty) ...[
                SectionHead('${rest.length} 门'),
                rows(rest),
              ],
            ];
          },
        ),
      ],
    );
  }
}

class _CatalogRow extends StatelessWidget {
  const _CatalogRow({required this.c});
  final CourseSummary c;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final meta = [
      if (c.provider.isNotEmpty) c.provider,
      if (c.difficulty > 0) stars(c.difficulty),
    ].join('  ');
    return Pressable(
      onTap: () => context.pushPage(CoursePage(slug: c.slug)),
      scale: 0.99,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    c.title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: h.ink,
                    ),
                  ),
                ),
                if (c.enrollStatus == 'done')
                  HxTag('学完', bg: h.okBg, fg: h.okInk)
                else if (c.enrollStatus == 'active')
                  HxTag('在学', bg: h.tint, fg: h.accentText),
              ],
            ),
            if (c.summary.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(
                c.summary,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 14, height: 1.55, color: h.sub),
              ),
            ],
            if (meta.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(meta, style: TextStyle(fontSize: 13, color: h.sub)),
            ],
          ],
        ),
      ),
    );
  }
}

class CourseCard extends StatelessWidget {
  const CourseCard({super.key, required this.c});
  final CourseSummary c;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final st = c.enrollStatus;
    final enrolled = st == 'active' || st == 'paused' || st == 'done';
    return HxCard(
      onTap: () => context.pushPage(CoursePage(slug: c.slug)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  c.provider,
                  style: TextStyle(fontSize: 14, color: h.sub),
                ),
              ),
              if (c.learners > 0)
                Text(
                  '${c.learners} 人在学',
                  style: TextStyle(fontSize: 13, color: h.sub),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Hero(
            tag: 'course-${c.slug}',
            child: Text(
              c.title,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: h.ink,
                decoration: TextDecoration.none,
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            c.summary,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 14, height: 1.55, color: h.sub),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              HxTag('${c.itemCount} 项'),
              if (c.hours.isNotEmpty) HxTag(c.hours),
              if (c.difficulty > 0)
                Text(
                  stars(c.difficulty),
                  style: TextStyle(fontSize: 13, color: h.accentText),
                ),
            ],
          ),
          if (enrolled) ...[
            const SizedBox(height: 12),
            Text(
              '${st == 'done'
                  ? '学完了'
                  : st == 'paused'
                  ? '暂停中'
                  : '已学'} ${c.progress.doneItems} / ${c.progress.items}',
              style: TextStyle(fontSize: 13, color: h.sub),
            ),
            const SizedBox(height: 6),
            HxBar(c.progress.ratio),
          ],
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.on, required this.onTap});
  final String label;
  final bool on;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: Pressable(
        onTap: onTap,
        semanticLabel: label,
        child: AnimatedContainer(
          duration: HxMotion.fast,
          height: 34,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: on ? h.ink : h.well,
            borderRadius: BorderRadius.circular(17),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: on ? FontWeight.w600 : FontWeight.w400,
              color: on ? h.bg : h.ink,
            ),
          ),
        ),
      ),
    );
  }
}
