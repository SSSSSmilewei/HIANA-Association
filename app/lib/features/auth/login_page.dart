import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../data/api_client.dart';
import '../../data/providers.dart';
import '../../widgets/common.dart';

/// 学号：9 位数字（和后端一致；登录时不检查，兼容以前录入的账号）。
final _studentNoRe = RegExp(r'^\d{9}$');

/// 校外账号的用户名（和后端 USERNAME_RE 一致）
final _usernameRe = RegExp(r'^[a-z][a-z0-9_-]{2,19}$');

/// 登录页：登录、用邀请码注册（校内 / 校外）、用重置码找回密码。流程和网页端一致。
/// 从游客状态推入；成功后自动返回原来的页面。
class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key, this.initialTab = 0});

  /// 0 = 登录，1 = 注册，2 = 忘记密码
  final int initialTab;

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  late int _tab = widget.initialTab;
  bool _external = false; // 注册校外账号
  final _account = TextEditingController();
  final _username = TextEditingController();
  final _email = TextEditingController();
  final _org = TextEditingController();
  final _studentNo = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _name = TextEditingController();
  final _className = TextEditingController();
  final _invite = TextEditingController();
  final _code = TextEditingController();
  bool _busy = false;
  bool? _registrationOpen;
  String? _error;

  @override
  void initState() {
    super.initState();
    ref.read(apiProvider).registrationOpen().then((v) {
      if (mounted) setState(() => _registrationOpen = v);
    }, onError: (_) {});
  }

  @override
  void dispose() {
    for (final c in [
      _account,
      _username,
      _email,
      _org,
      _studentNo,
      _password,
      _confirm,
      _name,
      _className,
      _invite,
      _code,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  String? _check() {
    if (_tab != 1 && _account.text.trim().isEmpty) return '填上账号';
    if (_tab == 1 &&
        !_external &&
        !_studentNoRe.hasMatch(_studentNo.text.trim())) {
      return '学号是 9 位数字';
    }
    if (_tab == 1 &&
        _external &&
        !_usernameRe.hasMatch(_username.text.trim().toLowerCase())) {
      return '用户名 3–20 位，小写字母开头，只能用小写字母、数字、_ 和 -';
    }
    if (_password.text.isEmpty) return '填上密码';
    if (_tab == 1 && _invite.text.trim().isEmpty) return '填上邀请码';
    if (_tab == 1 && _name.text.trim().isEmpty) {
      return _external ? '填上昵称' : '填上姓名';
    }
    if (_tab == 2 && _code.text.trim().length < 4) return '填上管理员给你的重置码';
    if (_tab != 0 && _password.text != _confirm.text) return '两次输入的密码不一样';
    return null;
  }

  Future<void> _submit() async {
    final problem = _check();
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }
    final session = ref.read(sessionProvider.notifier);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final account = _account.text.trim();
      switch (_tab) {
        case 0:
          await session.login(account, _password.text);
        case 1 when _external:
          await session.registerExternal(
            username: _username.text.trim().toLowerCase(),
            name: _name.text.trim(),
            email: _email.text.trim(),
            org: _org.text.trim(),
            password: _password.text,
            confirm: _confirm.text,
            invite: _invite.text.trim(),
          );
        case 1:
          await session.register(
            studentNo: _studentNo.text.trim(),
            name: _name.text.trim(),
            className: _className.text.trim(),
            password: _password.text,
            confirm: _confirm.text,
            invite: _invite.text.trim(),
          );
        default:
          await session.resetPassword(
            account: account,
            code: _code.text.trim(),
            password: _password.text,
            confirm: _confirm.text,
          );
      }
      HapticFeedback.lightImpact();
      if (mounted) Navigator.of(context).maybePop();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = MiuixTheme.of(context).colors;
    MiuixTextField field(
      TextEditingController c,
      String label, {
      bool secret = false,
      bool number = false,
      bool email = false,
      bool last = false,
    }) => MiuixTextField(
      controller: c,
      label: label,
      useLabelAsPlaceholder: true,
      singleLine: true,
      obscureText: secret,
      keyboardType: number
          ? TextInputType.number
          : (email ? TextInputType.emailAddress : null),
      textInputAction: last ? TextInputAction.done : TextInputAction.next,
      onSubmitted: last ? (_) => _submit() : null,
    );
    Widget hint(String text) => Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: MiuixText(
        text,
        color: colors.onSurfaceVariantSummary,
        fontSize: 13,
      ),
    );
    const gap = SizedBox(height: 12);
    final closed = _tab == 1 && _registrationOpen == false;

    final fields = switch (_tab) {
      0 => [
        field(_account, '账号', email: true),
        hint('校内填学号，校外填用户名或邮箱。'),
        gap,
        field(_password, '密码', secret: true, last: true),
      ],
      1 => [
        MiuixTabRow(
          tabs: const ['校内', '校外'],
          selectedTabIndex: _external ? 1 : 0,
          onTabSelected: (i) => setState(() {
            _external = i == 1;
            _error = null;
          }),
        ),
        gap,
        field(_invite, _external ? '校外邀请码（找会长要）' : '邀请码（找会长要）'),
        gap,
        if (_external) ...[
          field(_username, '用户名', email: true),
          hint('3–20 位，小写字母开头，可用小写字母、数字、_ 和 -。登录用它。'),
          gap,
          field(_name, '昵称'),
          gap,
          field(_email, '邮箱（可以不填，也能用来登录）', email: true),
          gap,
          field(_org, '学校 / 单位（可以不填）'),
          gap,
        ] else ...[
          field(_studentNo, '学号（9 位数字）', number: true),
          gap,
          field(_name, '姓名'),
          hint('填真名，签到表和名单上用的是它。'),
          gap,
          field(_className, '班级（可以不填）'),
          gap,
        ],
        field(_password, '密码（至少 8 位）', secret: true),
        gap,
        field(_confirm, '再输一次密码', secret: true, last: true),
      ],
      _ => [
        hint('忘了密码就找会长，在后台给你生成一个重置码。以前拿到口令、还没激活的同学，也在这里用口令设密码。'),
        gap,
        field(_account, '账号（学号 / 用户名 / 邮箱）', email: true),
        gap,
        field(_code, '重置码'),
        gap,
        field(_password, '新密码（至少 8 位）', secret: true),
        gap,
        field(_confirm, '再输一次新密码', secret: true, last: true),
      ],
    };

    return HianaPage(
      title: '登录',
      showBack: true,
      collapsible: false,
      children: [
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: MiuixTabRow(
            tabs: const ['登录', '注册', '忘记密码'],
            selectedTabIndex: _tab,
            onTabSelected: (i) => setState(() {
              _tab = i;
              _error = null;
            }),
          ),
        ),
        const SizedBox(height: 16),
        if (closed)
          const NoticeCard(message: '现在没有开放注册。需要账号的话请联系会长。', warning: false)
        else ...[
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: fields,
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 16),
            NoticeCard(message: _error!),
          ],
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 20, 12, 0),
            child: WideButton(
              text: _busy ? '请稍候…' : const ['登录', '注册并登录', '设置新密码并登录'][_tab],
              enabled: !_busy,
              onPressed: _submit,
            ),
          ),
        ],
      ],
    );
  }
}
