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
import '../../widgets/kit.dart';
import '../../widgets/markdown_view.dart';
import '../auth/guest.dart';
import '../courses/lesson_page.dart';

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
            '想在某一段上钉问题：长按那一段。段落右侧的蓝点是已有的钉子。',
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
  const PinThreadPage({
    super.key,
    required this.pinsKey,
    required this.id,
    this.showSource = false,
  });
  final String pinsKey;
  final String id;

  /// 从管理后台的收件箱打开时显示“打开讲义”
  final bool showSource;

  @override
  ConsumerState<PinThreadPage> createState() => _PinThreadPageState();
}

class _PinThreadPageState extends ConsumerState<PinThreadPage> {
  final _text = TextEditingController();
  bool _busy = false;
  PinMessage? _deletingMsg;
  bool _withdrawing = false;

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
    final admin = ref.watch(
      sessionProvider.select((s) => s.valueOrNull?.isAdmin ?? false),
    );
    // 提问的人在别人回复之前能撤回；管理员随时能删
    final replied =
        pin != null && pin.messages.skip(1).any((m) => m.agent || !m.mine);
    final canWithdraw = pin != null && (admin || (pin.mine && !replied));
    final i = widget.pinsKey.indexOf('/');
    return HianaPage(
      title: pin?.anchorLabel ?? '钉子',
      showBack: true,
      overlays: [
        ConfirmDialog(
          show: _deletingMsg != null,
          title: '删除这条回复？',
          summary: '删除后其他人也看不到了。',
          okText: '删除',
          onCancel: () => setState(() => _deletingMsg = null),
          onOk: () {
            final m = _deletingMsg!;
            setState(() => _deletingMsg = null);
            _act(() => api.deletePinMessage(widget.id, m.id));
          },
        ),
        ConfirmDialog(
          show: _withdrawing,
          title: admin && !(pin?.mine ?? false) ? '删除这颗钉子？' : '撤回这个问题？',
          summary: '问题和全部回复都会删除。',
          okText: admin && !(pin?.mine ?? false) ? '删除' : '撤回',
          onCancel: () => setState(() => _withdrawing = false),
          onOk: () async {
            setState(() => _withdrawing = false);
            try {
              await api.deletePin(widget.id);
              ref.invalidate(pinsProvider(widget.pinsKey));
              if (context.mounted) {
                showHxToast(context, '已删除');
                Navigator.of(context).maybePop();
              }
            } on ApiException catch (e) {
              if (context.mounted) showHxToast(context, e.message, error: true);
            }
          },
        ),
      ],
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
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                m.author,
                                style: TextStyle(fontSize: 13, color: h.sub),
                              ),
                            ),
                            if (m != pin.messages.first && (m.mine || admin))
                              Pressable(
                                onTap: () => setState(() => _deletingMsg = m),
                                semanticLabel: '删除这条回复',
                                child: Text(
                                  '删除',
                                  style: TextStyle(fontSize: 13, color: h.sub),
                                ),
                              ),
                          ],
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
                      if (pin.mine || admin) ...[
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
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
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
                if (widget.showSource || canWithdraw)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
                    child: Row(
                      children: [
                        if (widget.showSource)
                          Expanded(
                            child: HxButton(
                              '打开讲义',
                              kind: HxButtonKind.quiet,
                              onTap: () => context.pushPage(
                                LessonPage(
                                  slug: widget.pinsKey.substring(0, i),
                                  page: widget.pinsKey.substring(i + 1),
                                ),
                              ),
                            ),
                          ),
                        if (widget.showSource && canWithdraw)
                          const SizedBox(width: 10),
                        if (canWithdraw)
                          Expanded(
                            child: HxButton(
                              pin.mine ? '撤回问题' : '删除钉子',
                              kind: HxButtonKind.quiet,
                              onTap: () => setState(() => _withdrawing = true),
                            ),
                          ),
                      ],
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

/// 钉一个问题：长按讲义的一段（或一道练手题）后打开。引用这一段的开头，写一句问题。
class NewPinPage extends ConsumerStatefulWidget {
  const NewPinPage({
    super.key,
    required this.course,
    required this.page,
    required this.anchor,
  });
  final String course;
  final String page;
  final PinAnchor anchor;

  @override
  ConsumerState<NewPinPage> createState() => _NewPinPageState();
}

class _NewPinPageState extends ConsumerState<NewPinPage> {
  final _text = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final body = _text.text.trim();
    if (body.isEmpty) {
      setState(() => _error = '写一句你的问题');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final key = '${widget.course}/${widget.page}';
    try {
      final pin = await ref.read(apiProvider).createPin(
        course: widget.course,
        page: widget.page,
        anchorKey: widget.anchor.key,
        anchorLabel: widget.anchor.label,
        snippet: widget.anchor.snippet.isEmpty ? null : widget.anchor.snippet,
        body: body,
      );
      ref.invalidate(pinsProvider(key));
      if (!mounted) return;
      showHxToast(context, '问题已钉上，有人回复后钉子会变成实心');
      Navigator.of(context).pushReplacement(
        MiuixPageRoute<void>(
          builder: (_) => PinThreadPage(pinsKey: key, id: pin.id),
        ),
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return HianaPage(
      title: '钉一个问题',
      showBack: true,
      collapsible: false,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: HxCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  widget.anchor.label,
                  style: TextStyle(fontSize: 13, color: h.sub),
                ),
                if (widget.anchor.snippet.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                    decoration: BoxDecoration(
                      color: h.well,
                      border: const Border(
                        left: BorderSide(color: kPinBlue, width: 3),
                      ),
                    ),
                    child: Text(
                      widget.anchor.snippet,
                      maxLines: 4,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 14, height: 1.5, color: h.ink),
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                MiuixTextField(
                  controller: _text,
                  label: '哪里没看懂？写一句你的问题',
                  useLabelAsPlaceholder: true,
                  minLines: 4,
                ),
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Text(_error!, style: TextStyle(fontSize: 13, color: h.badInk)),
                ],
                const SizedBox(height: 14),
                HxButton('钉上', busy: _busy, enabled: !_busy, onTap: _submit),
              ],
            ),
          ),
        ),
        const FootNote('钉子所有人都能看到；同学和管理员会在讨论里回复，接入 AI 后也可以请 AI 回答。'),
      ],
    );
  }
}
