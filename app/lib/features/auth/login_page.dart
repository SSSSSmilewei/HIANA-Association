import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../data/api_client.dart';
import '../../data/providers.dart';
import '../../widgets/common.dart';

/// 登录页：学号 + 密码；第一次用的同学切到“用口令激活”。流程和网页端一致。
class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  int _tab = 0; // 0 = 学号登录，1 = 口令激活
  final _studentNo = TextEditingController();
  final _password = TextEditingController();
  final _code = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _studentNo.dispose();
    _password.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final session = ref.read(sessionProvider.notifier);
    String? problem;
    if (_tab == 0 && (_studentNo.text.trim().isEmpty || _password.text.isEmpty)) problem = '填上学号和密码';
    if (_tab == 1 && _code.text.trim().length < 4) problem = '填上会长发给你的口令';
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_tab == 0) {
        await session.login(_studentNo.text.trim(), _password.text);
      } else {
        await session.activate(_code.text.trim());
      }
      // 成功后 AuthGate 会自动切到下一页
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = MiuixTheme.of(context).colors;
    return HianaPage(
      title: '智慧网络算法协会',
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(28, 0, 28, 20),
          child: MiuixText('CS50x 主线、晚自习打卡、学习热力图', color: colors.onSurfaceVariantSummary),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: MiuixTabRow(
            tabs: const ['学号登录', '口令激活'],
            selectedTabIndex: _tab,
            onTabSelected: (i) => setState(() {
              _tab = i;
              _error = null;
            }),
          ),
        ),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: _tab == 0
                ? [
                    MiuixTextField(
                      controller: _studentNo,
                      label: '学号',
                      useLabelAsPlaceholder: true,
                      singleLine: true,
                      keyboardType: TextInputType.number,
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 12),
                    MiuixTextField(
                      controller: _password,
                      label: '密码',
                      useLabelAsPlaceholder: true,
                      singleLine: true,
                      obscureText: true,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _submit(),
                    ),
                  ]
                : [
                    MiuixTextField(
                      controller: _code,
                      label: '会长发的口令',
                      useLabelAsPlaceholder: true,
                      singleLine: true,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _submit(),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                      child: MiuixText(
                        '口令只能用一次。激活后马上设置自己的密码，之后用学号和密码登录。',
                        color: colors.onSurfaceVariantSummary,
                        fontSize: 13,
                      ),
                    ),
                  ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 16),
          NoticeCard(message: _error!),
        ],
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 20, 12, 0),
          child: WideButton(text: _busy ? '正在登录…' : (_tab == 0 ? '登录' : '激活账号'), enabled: !_busy, onPressed: _submit),
        ),
      ],
    );
  }
}
