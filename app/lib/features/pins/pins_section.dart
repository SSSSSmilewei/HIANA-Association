import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../data/api_client.dart';
import '../../data/pins.dart';
import '../../data/providers.dart';
import '../../widgets/ui.dart';
import '../auth/guest.dart';

const kPinBlue = Color(0xFF2563EB);

/// 讲义下面的“本页的钉子”：同学钉在这一页上的问题。点开看讨论、回复。
class PinsSection extends ConsumerWidget {
  const PinsSection({super.key, required this.course, required this.page});
  final String course;
  final String page;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final h = Hx.of(context);
    final key = '$course/$page';
    final pins = ref.watch(pinsProvider(key)).valueOrNull ?? const [];
    if (pins.isEmpty) return const SizedBox.shrink();
    final sorted = [...pins]
      ..sort((a, b) {
        final r = (a.resolved ? 1 : 0) - (b.resolved ? 1 : 0);
        return r != 0 ? r : b.votes - a.votes;
      });
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHead(
          '本页的钉子',
          trailing: Text(
            '${pins.length} 个',
            style: TextStyle(fontSize: 13, color: h.sub),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: HxCard(
            padding: const EdgeInsets.all(6),
            child: Column(
              children: [
                for (final p in sorted)
                  Pressable(
                    scale: 0.99,
                    onTap: () =>
                        context.pushPage(PinThreadPage(pinsKey: key, id: p.id)),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          PinDot(pin: p),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  p.anchorLabel ?? '这一页',
                                  style: TextStyle(fontSize: 12, color: h.sub),
                                ),
                                Text(
                                  p.messages.isEmpty
                                      ? ''
                                      : p.messages.first.body,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 15,
                                    height: 1.45,
                                    color: h.ink,
                                  ),
                                ),
                                Text(
                                  [
                                    p.resolved
                                        ? '已解决'
                                        : p.answered
                                        ? '${p.messages.length - 1} 条回复'
                                        : '等回复',
                                    if (p.votes > 0) '${p.votes} 人也想问',
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
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
          child: Text(
            '想在某一段上钉问题，请在网页上打开这一页。',
            style: TextStyle(fontSize: 12, color: h.sub),
          ),
        ),
      ],
    );
  }
}

/// 钉子的圆点：空心 = 等回复，实心 = 有人回了，灰色 = 已解决
class PinDot extends StatelessWidget {
  const PinDot({super.key, required this.pin});
  final Pin pin;

  @override
  Widget build(BuildContext context) {
    final grey = const Color(0xFF9CA3AF);
    final solid = pin.answered && !pin.resolved;
    return Container(
      width: 22,
      height: 22,
      margin: const EdgeInsets.only(top: 2),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: solid ? kPinBlue : const Color(0xFFFFFFFF),
        border: Border.all(color: pin.resolved ? grey : kPinBlue, width: 2),
      ),
    );
  }
}

/// 一颗钉子的讨论
class PinThreadPage extends ConsumerStatefulWidget {
  const PinThreadPage({super.key, required this.pinsKey, required this.id});
  final String pinsKey;
  final String id;

  @override
  ConsumerState<PinThreadPage> createState() => _PinThreadPageState();
}

class _PinThreadPageState extends ConsumerState<PinThreadPage> {
  final _text = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _act(Future<Pin> Function() fn) async {
    setState(() => _busy = true);
    try {
      await fn();
      ref.invalidate(pinsProvider(widget.pinsKey));
    } on ApiException catch (e) {
      if (mounted) showHxToast(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final guest = ref.watch(isGuestProvider);
    final all = ref.watch(pinsProvider(widget.pinsKey)).valueOrNull;
    final pin = all?.where((p) => p.id == widget.id).firstOrNull;
    final api = ref.read(apiProvider);
    final ai = ref.watch(aiEnabledProvider).valueOrNull ?? false;
    return HianaPage(
      title: pin?.anchorLabel ?? '钉子',
      showBack: true,
      onRefresh: () => ref
          .refresh(pinsProvider(widget.pinsKey).future)
          .then((_) {}, onError: (_) {}),
      children: pin == null
          ? [
              const Padding(
                padding: EdgeInsets.all(12),
                child: EmptyCard(title: '这颗钉子不见了'),
              ),
            ]
          : [
              for (final m in pin.messages)
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                  child: HxCard(
                    color: m.agent ? h.tint : null,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          m.author,
                          style: TextStyle(fontSize: 13, color: h.sub),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          m.body,
                          style: TextStyle(
                            fontSize: 15,
                            height: 1.55,
                            color: h.ink,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              if (!guest) ...[
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: HxButton(
                          pin.voted
                              ? '已想问 · ${pin.votes}'
                              : '我也想问${pin.votes > 0 ? ' · ${pin.votes}' : ''}',
                          kind: HxButtonKind.ghost,
                          enabled: !_busy,
                          onTap: () => _act(() => api.votePin(pin.id)),
                        ),
                      ),
                      if (pin.mine) ...[
                        const SizedBox(width: 10),
                        Expanded(
                          child: HxButton(
                            pin.resolved ? '重新打开' : '标成已解决',
                            kind: HxButtonKind.ghost,
                            enabled: !_busy,
                            onTap: () => _act(
                              () => api.resolvePin(pin.id, !pin.resolved),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (ai && !pin.resolved)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
                    child: HxButton(
                      _busy ? 'AI 正在想…' : '请 AI 回答',
                      kind: HxButtonKind.ghost,
                      expand: true,
                      enabled: !_busy,
                      onTap: () => _act(() => api.askAiPin(pin.id)),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                  child: MiuixTextField(
                    controller: _text,
                    label: pin.mine ? '补充一句，或者接着问' : '你知道答案？写下来',
                    useLabelAsPlaceholder: true,
                    maxLines: 4,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 24),
                  child: HxButton(
                    '回复',
                    expand: true,
                    busy: _busy,
                    onTap: () {
                      final t = _text.text.trim();
                      if (t.isEmpty) return;
                      _act(() async {
                        final p = await api.replyPin(pin.id, t);
                        _text.clear();
                        return p;
                      });
                    },
                  ),
                ),
              ] else
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 4, 12, 24),
                  child: HxButton(
                    '登录后参与讨论',
                    kind: HxButtonKind.ghost,
                    expand: true,
                    onTap: () => requireLogin(context, ref),
                  ),
                ),
            ],
    );
  }
}
