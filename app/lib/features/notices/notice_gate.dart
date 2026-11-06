import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/tokens.dart';
import '../../data/api_client.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../widgets/markdown_view.dart';
import '../../widgets/ui.dart';

const _recentMs = 30 * 86400000;

/// 登录后：有未确认的新公告（30 天内）就弹窗，点“我已阅读”记到账号上，按时间从旧到新逐条显示。
/// 对照网页 src/client/components/NoticeGate.tsx。关掉不确认的，这次打开 App 不再弹。
class NoticeGate extends ConsumerStatefulWidget {
  const NoticeGate({super.key});

  @override
  ConsumerState<NoticeGate> createState() => _NoticeGateState();
}

class _NoticeGateState extends ConsumerState<NoticeGate> {
  static final _skipped = <String>{};
  bool _busy = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    if (ref.watch(isGuestProvider)) return const SizedBox.shrink();
    final now = DateTime.now().millisecondsSinceEpoch;
    final pending =
        (ref.watch(noticesProvider).valueOrNull ?? const <Notice>[])
            .where(
              (n) =>
                  !n.isCompetition &&
                  !n.confirmed &&
                  now - n.createdAt < _recentMs &&
                  !_skipped.contains(n.id),
            )
            .toList()
          ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    final n = pending.firstOrNull;

    Future<void> confirm() async {
      if (n == null) return;
      setState(() {
        _busy = true;
        _error = null;
      });
      try {
        await ref.read(apiProvider).confirmNotice(n.id);
        _skipped.add(n.id); // 列表刷新回来之前先别再弹这一条
        ref.invalidate(noticesProvider);
      } on ApiException catch (e) {
        _error = e.message;
      } finally {
        if (mounted) setState(() => _busy = false);
      }
    }

    return MiuixOverlayDialog(
      show: n != null,
      title: n?.title ?? '',
      summary: n == null
          ? null
          : [
              longDay(dayOfMs(n.createdAt), weekday: false),
              if (n.author != null) n.author!,
            ].join(' · '),
      onDismissRequest: () {
        if (n != null) setState(() => _skipped.add(n.id));
      },
      content: n == null
          ? const SizedBox.shrink()
          : Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (n.body.isNotEmpty)
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: MediaQuery.sizeOf(context).height * 0.45,
                    ),
                    child: SingleChildScrollView(child: NoticeBody(n.body)),
                  ),
                if (n.docUrl != null)
                  Pressable(
                    onTap: () => launchUrl(
                      Uri.parse(n.docUrl!),
                      mode: LaunchMode.externalApplication,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        '相关链接',
                        style: TextStyle(fontSize: 14, color: h.accentText),
                      ),
                    ),
                  ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      '确认失败，请重试：$_error',
                      style: TextStyle(fontSize: 13, color: h.badInk),
                    ),
                  ),
                if (pending.length > 1)
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: Text(
                      '还有 ${pending.length - 1} 条未确认',
                      style: TextStyle(fontSize: 12, color: h.sub),
                    ),
                  ),
                const SizedBox(height: 14),
                HxButton(
                  '我已阅读',
                  expand: true,
                  busy: _busy,
                  enabled: !_busy,
                  onTap: confirm,
                ),
              ],
            ),
    );
  }
}
