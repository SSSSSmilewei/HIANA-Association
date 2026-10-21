import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../data/api_client.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../widgets/common.dart';

/// 晚自习打卡：每晚一次；会长开了“现场口令”时要输屏幕上的 4 位数。不统计连续天数。
class CheckinPage extends ConsumerStatefulWidget {
  const CheckinPage({super.key});

  @override
  ConsumerState<CheckinPage> createState() => _CheckinPageState();
}

class _CheckinPageState extends ConsumerState<CheckinPage> {
  final _code = TextEditingController();
  final _snackbar = MiuixSnackbarHostState();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  /// 现在（北京时间）是否在 "19:00-21:30" 这样的时间段里。后端会再检查一次，这里只决定按钮能不能点。
  bool _inWindow(String window) {
    final m = RegExp(r'^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$').firstMatch(window);
    if (m == null) return true;
    int min(int h, int mm) => h * 60 + mm;
    final now = DateTime.now().toUtc().add(const Duration(hours: 8));
    final t = min(now.hour, now.minute);
    final from = min(int.parse(m[1]!), int.parse(m[2]!));
    final to = min(int.parse(m[3]!), int.parse(m[4]!));
    return from <= to ? t >= from && t <= to : t >= from || t <= to; // 跨零点的时间段
  }

  Future<void> _checkIn(CheckinState s) async {
    if (s.requireCode && _code.text.trim().length != 4) {
      setState(() => _error = '输入屏幕上今天的 4 位数');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final r = await ref.read(apiProvider).checkIn(code: s.requireCode ? _code.text.trim() : null);
      _snackbar.showSnackbar(r.ok ? '打卡成功，${hhmm(r.at)}' : '今晚已经打过卡了');
      _code.clear();
      ref.invalidate(checkinProvider);
      ref.invalidate(heatmapProvider); // 打卡也算站内学习记录
    } on ApiException catch (e) {
      setState(() => _error = e.message); // 时间外、口令不对：后端的中文说明
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(checkinProvider);
    return HianaPage(
      title: '晚自习打卡',
      snackbar: _snackbar,
      onRefresh: () => ref.refresh(checkinProvider.future).then((_) {}, onError: (_) {}),
      children: state.when(
        loading: () => const [LoadingBlock()],
        error: (e, _) => [NoticeCard(message: '$e', actionLabel: '重试', onAction: () => ref.invalidate(checkinProvider))],
        data: (s) => _body(context, s),
      ),
    );
  }

  List<Widget> _body(BuildContext context, CheckinState s) {
    final theme = MiuixTheme.of(context);
    final c = theme.colors;
    final done = s.checkedAt != null;
    final open = _inWindow(s.window);
    return [
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        child: MiuixCard(
          insideMargin: const EdgeInsets.symmetric(horizontal: 16, vertical: 28),
          child: Column(
            children: [
              MiuixText('${s.today} · 打卡时间 ${s.windowText}', color: c.onSurfaceVariantSummary, fontSize: 13),
              const SizedBox(height: 10),
              MiuixText(done ? '今晚已打卡' : '还没打卡', style: theme.textStyles.headline1, color: done ? c.primary : c.onSurface),
              const SizedBox(height: 6),
              MiuixText(
                done ? '${hhmm(s.checkedAt!)} 打的卡，累计 ${s.total} 次' : '累计 ${s.total} 次',
                color: c.onSurfaceVariantSummary,
              ),
            ],
          ),
        ),
      ),
      if (!done) ...[
        if (!open) NoticeCard(message: '现在不在打卡时间，晚自习打卡时间是 ${s.windowText}', warning: false),
        if (s.requireCode && open)
          Section(
            title: '现场口令',
            padding: const EdgeInsets.all(12),
            children: [
              MiuixTextField(
                controller: _code,
                label: '屏幕上今天的 4 位数',
                useLabelAsPlaceholder: true,
                singleLine: true,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _checkIn(s),
              ),
            ],
          ),
        if (_error != null) NoticeCard(message: _error!),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: WideButton(text: _busy ? '正在打卡…' : '打卡', enabled: open && !_busy, onPressed: () => _checkIn(s)),
        ),
      ],
    ];
  }
}
