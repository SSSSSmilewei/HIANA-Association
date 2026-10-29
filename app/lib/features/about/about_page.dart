import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../app/tokens.dart';
import '../../data/providers.dart';
import '../../widgets/ui.dart';

/// 协会介绍和学生成就，同一页。内容和网页共用 src/shared/association.ts。
class AboutPage extends ConsumerWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final h = Hx.of(context);
    final data = ref.watch(associationProvider);
    return HianaPage(
      title: '协会',
      showBack: true,
      onRefresh: () =>
          ref.refresh(associationProvider.future).then((_) {}, onError: (_) {}),
      children: data.when(
        loading: () => [
          const Padding(
            padding: EdgeInsets.all(12),
            child: Skeleton(height: 400, radius: 22),
          ),
        ],
        error: (e, _) => [
          Padding(
            padding: const EdgeInsets.all(12),
            child: ErrorCard(
              error: e,
              onRetry: () => ref.invalidate(associationProvider),
            ),
          ),
        ],
        data: (a) {
          final national = a.honors.where((x) => x.national).toList();
          final provincial = a.honors.where((x) => !x.national).toList();
          final people = a.honors.expand((x) => x.people).toSet().length;
          TextStyle body() =>
              TextStyle(fontSize: 13.5, height: 1.55, color: h.sub);
          return [
            Padding(
              padding: const EdgeInsets.fromLTRB(28, 0, 28, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${a.school} · ${a.founded}成立',
                    style: TextStyle(fontSize: 12, color: h.sub),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    a.name,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: h.ink,
                    ),
                  ),
                  Text(a.slogan, style: TextStyle(fontSize: 14, color: h.sub)),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 14, 12, 0),
              child: HxCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('宗旨', style: TextStyle(fontSize: 12, color: h.sub)),
                    const SizedBox(height: 4),
                    Text(
                      a.motto,
                      style: TextStyle(
                        fontSize: 17,
                        height: 1.5,
                        fontWeight: FontWeight.w600,
                        color: h.ink,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SectionHead('四个技术方向'),
            for (var i = 0; i < a.directions.length; i++)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                child: HxCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '0${i + 1}  ${a.directions[i].$1}',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: h.ink,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(a.directions[i].$2, style: body()),
                    ],
                  ),
                ),
              ),
            const SectionHead('部门'),
            _List(items: a.departments),
            const SectionHead('一年怎么过'),
            _List(items: a.year, numbered: true),
            SectionHead(
              '学生成就 · 国家级 ${national.length} · 省级 ${provincial.length} · $people 人',
            ),
            for (final x in national)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                child: HxCard(
                  color: h.night,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      HxTag(
                        '全国${x.rank == '国一'
                            ? '一'
                            : x.rank == '国二'
                            ? '二'
                            : '三'}等奖',
                        bg: h.accent,
                        fg: const Color(0xFFFFFFFF),
                        bold: true,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        x.contest,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFFFFFFFF),
                        ),
                      ),
                      if (x.detail != null)
                        Text(
                          x.detail!,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xCCFFFFFF),
                          ),
                        ),
                      const SizedBox(height: 8),
                      Text(
                        '${x.people.join('、')}${x.team ? '（团队成员）' : ''}${x.date != null ? ' · ${x.date}' : ''}',
                        style: const TextStyle(
                          fontSize: 14,
                          color: Color(0xFFFFFFFF),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: HxCard(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 4,
                ),
                child: Column(
                  children: [
                    for (var i = 0; i < provincial.length; i++)
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          border: i > 0
                              ? Border(top: BorderSide(color: h.line))
                              : null,
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              width: 54,
                              child: HxTag(
                                provincial[i].rank,
                                bg: h.tint,
                                fg: h.accentText,
                                bold: true,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    provincial[i].contest,
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                      color: h.ink,
                                    ),
                                  ),
                                  if (provincial[i].detail != null)
                                    Text(
                                      provincial[i].detail!,
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: h.sub,
                                      ),
                                    ),
                                  Text(
                                    '${provincial[i].people.join('、')}${provincial[i].team ? ' · 团队' : ''}${provincial[i].date != null ? ' · ${provincial[i].date}' : ''}',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      color: h.ink,
                                    ),
                                  ),
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
            const SectionHead('加入'),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: HxCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (var i = 0; i < a.joinSteps.length; i++)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text(
                          '${i + 1}. ${a.joinSteps[i]}',
                          style: TextStyle(
                            fontSize: 14,
                            height: 1.5,
                            color: h.ink,
                          ),
                        ),
                      ),
                    const SizedBox(height: 4),
                    Text('指导老师：${a.teachers.join('、')}', style: body()),
                  ],
                ),
              ),
            ),
          ];
        },
      ),
    );
  }
}

class _List extends StatelessWidget {
  const _List({required this.items, this.numbered = false});
  final List<(String, String)> items;
  final bool numbered;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: HxCard(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Column(
          children: [
            for (var i = 0; i < items.length; i++)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  border: i > 0 ? Border(top: BorderSide(color: h.line)) : null,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: numbered ? 22 : 60,
                      child: Text(
                        numbered ? '${i + 1}' : items[i].$1,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: h.accentText,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (numbered)
                            Text(
                              items[i].$1,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: h.ink,
                              ),
                            ),
                          Text(
                            items[i].$2,
                            style: TextStyle(
                              fontSize: 13,
                              height: 1.5,
                              color: h.sub,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
