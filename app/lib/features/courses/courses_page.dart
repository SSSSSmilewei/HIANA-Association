import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../widgets/ui.dart';
import 'course_page.dart';

/// 课程目录：先学三门必修，其余按兴趣选。选了的课会出现在首页“接下来”里。
class CoursesPage extends ConsumerStatefulWidget {
  const CoursesPage({super.key});

  @override
  ConsumerState<CoursesPage> createState() => _CoursesPageState();
}

class _CoursesPageState extends ConsumerState<CoursesPage> {
  String _area = 'all';

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final courses = ref.watch(coursesProvider);
    return HianaPage(
      title: '课程',
      onRefresh: () => ref.refresh(coursesProvider.future).then((_) {}, onError: (_) {}),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(28, 0, 28, 14),
          child: Text(
            '先学三门必修：Missing Semester 打基础，Git 学会交作业，然后跟主线 CS50x。',
            style: TextStyle(fontSize: 14, height: 1.5, color: h.sub),
          ),
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              for (final a in kAreas)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: _Chip(label: a.$2, on: _area == a.$1, onTap: () => setState(() => _area = a.$1)),
                ),
            ],
          ),
        ),
        ...courses.when(
          loading: () => [
            for (var i = 0; i < 3; i++) const Padding(padding: EdgeInsets.fromLTRB(12, 12, 12, 0), child: Skeleton(height: 200, radius: 22)),
          ],
          error: (e, _) => [Padding(padding: const EdgeInsets.all(12), child: ErrorCard(error: e, onRetry: () => ref.invalidate(coursesProvider)))],
          data: (list) {
            final shown = list.where((c) => _area == 'all' || c.area == _area).toList();
            final req = shown.where((c) => c.required).toList();
            final opt = shown.where((c) => !c.required).toList();
            final allReq = list.where((c) => c.required).toList();
            if (shown.isEmpty) {
              return [const Padding(padding: EdgeInsets.all(12), child: EmptyCard(title: '这个方向还没有课', body: '想学什么，可以跟会长提。'))];
            }
            return [
              if (req.isNotEmpty) const SectionHead('必修 · 按这个顺序学'),
              for (var i = 0; i < req.length; i++)
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                  child: Rise(index: i, child: CourseCard(c: req[i], step: (allReq.indexOf(req[i]) + 1).toString().padLeft(2, '0'))),
                ),
              if (opt.isNotEmpty) const SectionHead('选修'),
              for (var i = 0; i < opt.length; i++)
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                  child: Rise(index: i + req.length, child: CourseCard(c: opt[i])),
                ),
            ];
          },
        ),
      ],
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
    return Pressable(
      onTap: onTap,
      semanticLabel: label,
      child: AnimatedContainer(
        duration: HxMotion.mid,
        curve: HxMotion.ease,
        height: 38,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: on ? h.ink : h.surface,
          borderRadius: BorderRadius.circular(19),
          border: Border.all(color: on ? h.ink : h.line),
        ),
        child: Text(label, style: TextStyle(fontSize: 14, color: on ? h.bg : h.navIdle, fontWeight: on ? FontWeight.w600 : FontWeight.w400)),
      ),
    );
  }
}

class CourseCard extends StatelessWidget {
  const CourseCard({super.key, required this.c, this.step});
  final CourseSummary c;
  final String? step;

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
              Expanded(child: Text(c.code, style: TextStyle(fontSize: 11, letterSpacing: 0.6, fontWeight: FontWeight.w500, color: h.sub, fontFamily: 'monospace'))),
              if (step != null)
                Text(step!, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: h.accentText, fontFamily: 'monospace'))
              else if (c.learners > 0)
                Text('${c.learners} 人在学', style: TextStyle(fontSize: 12, color: h.sub)),
            ],
          ),
          const SizedBox(height: 8),
          Hero(
            tag: 'course-${c.slug}',
            child: Text(c.title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: h.ink, decoration: TextDecoration.none)),
          ),
          const SizedBox(height: 6),
          Text(c.summary, maxLines: 3, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13, height: 1.55, color: h.sub)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              HxTag('${c.progress.totalPeriods} 课时'),
              HxTag(kDifficulty[c.difficulty.clamp(1, 5).toInt()]),
              HxTag(kAccess[c.accessLevel] ?? ''),
            ],
          ),
          const SizedBox(height: 14),
          Container(height: 1, color: h.line),
          const SizedBox(height: 12),
          if (enrolled)
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${st == 'done' ? '学完了' : st == 'paused' ? '暂停中' : '已学'} ${c.progress.doneUnits} / ${c.progress.units} 单元',
                        style: TextStyle(fontSize: 12, color: h.sub),
                      ),
                      const SizedBox(height: 6),
                      HxBar(c.progress.ratio),
                    ],
                  ),
                ),
                const SizedBox(width: 14),
                HxTag(st == 'done' ? '回顾' : '继续', bg: h.tint, fg: h.accentText, bold: true),
              ],
            )
          else
            Row(
              children: [
                Expanded(child: Text('先修：${c.prerequisites}', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13, color: h.sub))),
                HxTag('看看', bg: h.tint, fg: h.accentText, bold: true),
              ],
            ),
        ],
      ),
    );
  }
}
