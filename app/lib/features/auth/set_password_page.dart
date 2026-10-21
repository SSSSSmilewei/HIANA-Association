import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../data/api_client.dart';
import '../../data/providers.dart';
import '../../widgets/common.dart';

/// 设置或修改密码。[firstTime] 为 true 时是口令激活后的必经一步：没有返回按钮，也不需要当前密码。
class SetPasswordPage extends ConsumerStatefulWidget {
  const SetPasswordPage({super.key, this.firstTime = false});
  final bool firstTime;

  @override
  ConsumerState<SetPasswordPage> createState() => _SetPasswordPageState();
}

class _SetPasswordPageState extends ConsumerState<SetPasswordPage> {
  final _current = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _snackbar = MiuixSnackbarHostState();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_password.text != _confirm.text) {
      setState(() => _error = '两次输入的新密码不一样');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      // 长度等规则由后端检查，错误文案原样显示
      await ref.read(sessionProvider.notifier).setPassword(
            password: _password.text,
            confirm: _confirm.text,
            current: widget.firstTime ? null : _current.text,
          );
      if (!widget.firstTime && mounted) {
        _snackbar.showSnackbar('密码已修改');
        Navigator.of(context).maybePop();
      }
      // 第一次设置成功后 AuthGate 会切到主界面
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(sessionProvider).valueOrNull;
    final colors = MiuixTheme.of(context).colors;
    MiuixTextField field(TextEditingController c, String label, {bool last = false}) => MiuixTextField(
          controller: c,
          label: label,
          useLabelAsPlaceholder: true,
          singleLine: true,
          obscureText: true,
          textInputAction: last ? TextInputAction.done : TextInputAction.next,
          onSubmitted: last ? (_) => _save() : null,
        );
    return HianaPage(
      title: widget.firstTime ? '设置密码' : '修改密码',
      showBack: !widget.firstTime,
      snackbar: _snackbar,
      children: [
        if (widget.firstTime && me?.member != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(28, 0, 28, 16),
            child: MiuixText(
              '${me!.member!.name}，口令已经用掉了。设置一个自己的密码，以后用学号 ${me.member!.studentNo} 和这个密码登录。',
              color: colors.onSurfaceVariantSummary,
            ),
          ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!widget.firstTime) ...[field(_current, '当前密码'), const SizedBox(height: 12)],
              field(_password, '新密码'),
              const SizedBox(height: 12),
              field(_confirm, '再输一次新密码', last: true),
            ],
          ),
        ),
        if (_error != null) ...[const SizedBox(height: 16), NoticeCard(message: _error!)],
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 20, 12, 0),
          child: WideButton(text: _busy ? '正在保存…' : '保存密码', enabled: !_busy, onPressed: _save),
        ),
      ],
    );
  }
}
