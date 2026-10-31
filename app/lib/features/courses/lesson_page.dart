import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../data/api_client.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../widgets/markdown_view.dart';
import '../../widgets/ui.dart';
import '../auth/guest.dart';
import 'course_page.dart';
import '../pins/pins_section.dart';
import 'practice_card.dart';

/// 讲义里的链接：站内课程页、讲义页在 App 里打开，其余交给浏览器。
void openHref(BuildContext context, String href) {
  final lesson = RegExp(r'^/courses/([\w-]+)/learn/([\w-]+)').firstMatch(href);
  if (lesson != null) {
    context.pushPage(LessonPage(slug: lesson[1]!, page: lesson[2]!));
    return;
  }
  final course = RegExp(r'^/courses/([\w-]+)/?(#.*)?$').firstMatch(href);
  if (course != null) {
    context.pushPage(CoursePage(slug: course[1]!));
    return;
  }
  final uri = Uri.tryParse(href.startsWith('/') ? '$kBaseUrl$href' : href);
  if (uri != null &&
      (uri.scheme == 'https' ||
          uri.scheme == 'http' ||
          uri.scheme == 'mailto')) {
    launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

/// 条目的一页：正文、这一项的其他页、视频和链接、练手题、标记完成、上一页下一页。
/// [page] 是页面 id；没有页面的条目用条目 id。
class LessonPage extends ConsumerWidget {
  const LessonPage({super.key, required this.slug, required this.page});
  final String slug;
  final String page;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final h = Hx.of(context);
    final pkgAsync = ref.watch(packageProvider(slug));
    final detail = ref.watch(courseProvider(slug)).valueOrNull;
    final pkg = pkgAsync.valueOrNull;
    final at = pkg?.locate(page);
    final item = at?.$1;
    final pg = at?.$2;
    // 正文：包里有 body 就用，否则取 /learn/<slug>/<page>.md
    final body = pg == null
        ? null
        : (pg.body != null
              ? AsyncValue.data(pg.body!)
              : ref.watch(lessonProvider('$slug/${pg.id}')));
    final title = item == null
        ? '讲义'
        : (pg != null && item.pages.length > 1
              ? '${item.title} · ${pg.title}'
              : item.title);

    final flat = <(CourseItem, String, String)>[];
    if (pkg != null) {
      for (final it in pkg.items) {
        if (it.pages.isEmpty) {
          flat.add((it, it.id, it.title));
        } else {
          for (final p in it.pages) {
            flat.add((it, p.id, p.title));
          }
        }
      }
    }
    final idx = flat.indexWhere((x) => x.$2 == page);
    final prev = idx > 0 ? flat[idx - 1] : null;
    final next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;
    final done = item != null && (detail?.done.contains(item.id) ?? false);
    final lastPage =
        item != null && (item.pages.isEmpty || item.pages.last.id == page);
    void go(String id) => Navigator.of(context).pushReplacement(
      MiuixPageRoute<void>(
        builder: (_) => LessonPage(slug: slug, page: id),
      ),
    );

    Future<void> toggle() async {
      if (item == null || requireLogin(context, ref)) return;
      HapticFeedback.lightImpact();
      try {
        await ref.read(apiProvider).setItemDone(slug, item.id, !done);
        refreshLearning(ref);
        ref.invalidate(courseProvider(slug));
      } on ApiException catch (e) {
        if (context.mounted) showHxToast(context, e.message, error: true);
      }
    }

    if (pkg == null) {
      return HianaPage(
        title: '讲义',
        showBack: true,
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: pkgAsync.hasError
                ? ErrorCard(
                    error: pkgAsync.error!,
                    onRetry: () => ref.invalidate(packageProvider(slug)),
                  )
                : const Skeleton(height: 400, radius: 12),
          ),
        ],
      );
    }
    if (item == null) {
      return const HianaPage(
        title: '讲义',
        showBack: true,
        children: [
          Padding(
            padding: EdgeInsets.all(12),
            child: EmptyCard(title: '没有这一页'),
          ),
        ],
      );
    }

    return HianaPage(
      title: title,
      showBack: true,
      onRefresh: () async {
        ref.invalidate(packageProvider(slug));
        if (pg != null) ref.invalidate(lessonProvider('$slug/${pg.id}'));
      },
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
          child: Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: item.kindLabel,
                  style: TextStyle(
                    color: item.isTask ? h.accentText : h.ink,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                TextSpan(text: '  ${item.periods} 课时'),
              ],
            ),
            style: TextStyle(fontSize: 13, color: h.sub),
          ),
        ),
        if (item.pages.length > 1)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
            child: Row(
              children: [
                for (final p in item.pages)
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: Pressable(
                      onTap: p.id == page ? () {} : () => go(p.id),
                      child: HxTag(
                        p.title,
                        bg: p.id == page ? h.ink : h.well,
                        fg: p.id == page ? h.bg : h.ink,
                        bold: p.id == page,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        if (body != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: body.when(
              loading: () => const Skeleton(height: 400, radius: 12),
              error: (e, _) => ErrorCard(
                error: e,
                onRetry: () =>
                    ref.invalidate(lessonProvider('$slug/${pg!.id}')),
              ),
              // 第一行标题和页面标题重复
              data: (src) => MarkdownView(
                source: src.replaceFirst(RegExp(r'^\s*#\s+.*\n'), ''),
                onLink: (href) => openHref(context, href),
              ),
            ),
          ),
        if (item.videos.isNotEmpty ||
            item.links.isNotEmpty ||
            item.submit != null)
          _Resources(item: item),
        if (item.practice.isNotEmpty && lastPage) ...[
          SectionHead(
            '练手',
            trailing: Text(
              '做对 ${item.practice.where((q) => detail?.solved[item.id]?.contains(q.id) ?? false).length} / ${item.practice.length}',
              style: TextStyle(
                fontSize: 13,
                color: h.sub,
                fontFeatures: kTabular,
              ),
            ),
          ),
          for (var i = 0; i < item.practice.length; i++)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: PracticeCard(
                no: i + 1,
                q: item.practice[i],
                solved:
                    detail?.solved[item.id]?.contains(item.practice[i].id) ??
                    false,
                webUrl:
                    '$kBaseUrl/courses/$slug/learn/$page#q-${item.practice[i].id}',
                onSolved: () async {
                  if (ref.read(isGuestProvider)) return;
                  try {
                    await ref
                        .read(apiProvider)
                        .solvePractice(slug, item.id, item.practice[i].id);
                    ref.invalidate(courseProvider(slug));
                    refreshLearning(ref);
                  } on ApiException {
                    // 记录失败不打扰做题
                  }
                },
              ),
            ),
        ],
        if (!slug.startsWith('local-'))
          PinsSection(course: slug, page: page),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: HxButton(
            done ? '已完成' : '标记完成',
            kind: done ? HxButtonKind.ghost : HxButtonKind.primary,
            expand: true,
            onTap: toggle,
          ),
        ),
        if (item.practice.isNotEmpty && !lastPage)
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
            child: HxButton(
              '去练手（${item.practice.length} 题）',
              kind: HxButtonKind.quiet,
              expand: true,
              onTap: () => go(item.pages.last.id),
            ),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
          child: Row(
            children: [
              Expanded(
                child: prev == null
                    ? const SizedBox.shrink()
                    : _Pager(
                        label: '上一页',
                        title: prev.$1.id == item.id ? prev.$3 : prev.$1.title,
                        onTap: () => go(prev.$2),
                      ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: next == null
                    ? const SizedBox.shrink()
                    : _Pager(
                        label: '下一页',
                        title: next.$1.id == item.id ? next.$3 : next.$1.title,
                        end: true,
                        onTap: () => go(next.$2),
                      ),
              ),
            ],
          ),
        ),
        if (detail != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: Text(
              detail.license,
              style: TextStyle(fontSize: 13, color: h.sub),
            ),
          ),
      ],
    );
  }
}

class _Resources extends StatelessWidget {
  const _Resources({required this.item});
  final CourseItem item;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    Widget row(String label, List<CourseLink> links) => Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: h.sub)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [for (final l in links) _LinkChip(link: l)],
          ),
        ],
      ),
    );
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      child: HxCard(
        radius: 22,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (item.videos.isNotEmpty) row('视频', item.videos),
            if (item.links.isNotEmpty) row('链接', item.links),
            if (item.submit != null) ...[
              row('正式提交', [item.submit!]),
              Text(
                '这里的练手题只是热身，作业按原课程的要求在那边完成和提交。',
                style: TextStyle(fontSize: 13, height: 1.5, color: h.sub),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _LinkChip extends StatelessWidget {
  const _LinkChip({required this.link});
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
        child: Text(
          link.label,
          style: TextStyle(fontSize: 14, height: 34 / 14, color: h.ink),
        ),
      ),
    );
  }
}

class _Pager extends StatelessWidget {
  const _Pager({
    required this.label,
    required this.title,
    required this.onTap,
    this.end = false,
  });
  final String label;
  final String title;
  final VoidCallback onTap;
  final bool end;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return HxCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      radius: 14,
      child: Column(
        crossAxisAlignment: end
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: h.sub)),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: h.ink,
            ),
          ),
        ],
      ),
    );
  }
}
