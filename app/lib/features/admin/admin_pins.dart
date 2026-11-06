import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../data/admin.dart';
import '../../widgets/ui.dart';
import '../pins/pins_section.dart';
import 'admin_home.dart';

final adminPinsProvider = FutureProvider.autoDispose<List<AdminPin>>(
  (ref) => ref.watch(adminApiProvider).pins(),
);

/// 蓝色钉子收件箱（对照网页 /admin/pins）：最近 100 颗钉子，没解决的在前；点开回复、标已解决或删除。
class AdminPinsPage extends ConsumerWidget {
  const AdminPinsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final h = Hx.of(context);
    final list = ref.watch(adminPinsProvider);
    return HianaPage(
      title: '蓝色钉子收件箱',
      showBack: true,
      onRefresh: () =>
          ref.refresh(adminPinsProvider.future).then((_) {}, onError: (_) {}),
      children: [
        ...list.when(
          loading: () => [
            const Padding(
              padding: EdgeInsets.all(12),
              child: Skeleton(height: 300, radius: 22),
            ),
          ],
          error: (e, _) => [
            Padding(
              padding: const EdgeInsets.all(12),
              child: ErrorCard(
                error: e,
                onRetry: () => ref.invalidate(adminPinsProvider),
              ),
            ),
          ],
          data: (pins) => [
            if (pins.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: EmptyCard(title: '还没有人钉过问题'),
              ),
            for (final p in pins)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                child: HxCard(
                  onTap: () async {
                    await context.pushPage(
                      PinThreadPage(
                        pinsKey: '${p.course}/${p.page}',
                        id: p.pin.id,
                        showSource: true,
                      ),
                    );
                    ref.invalidate(adminPinsProvider);
                  },
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      PinDot(pin: p.pin),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              [
                                p.courseTitle,
                                p.itemTitle,
                                if (p.pin.anchorLabel != null)
                                  p.pin.anchorLabel!,
                              ].join(' · '),
                              style: TextStyle(fontSize: 12, color: h.sub),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              p.pin.messages.isEmpty
                                  ? ''
                                  : p.pin.messages.first.body,
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 15,
                                height: 1.45,
                                color: h.ink,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              [
                                p.pin.author,
                                p.pin.resolved
                                    ? '已解决'
                                    : p.pin.answered
                                    ? '${p.pin.messages.length - 1} 条回复'
                                    : '等待回复',
                                if (p.pin.votes > 0) '${p.pin.votes} 人也想问',
                                dayOfMs(p.updatedAt) == cnToday()
                                    ? '今天 ${hhmm(p.updatedAt)}'
                                    : longDay(
                                        dayOfMs(p.updatedAt),
                                        weekday: false,
                                      ),
                              ].join(' · '),
                              style: TextStyle(fontSize: 12, color: h.sub),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}
