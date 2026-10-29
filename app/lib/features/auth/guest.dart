import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../data/providers.dart';
import '../../widgets/ui.dart';
import 'login_page.dart';

/// 在需要账号的操作开头调用：游客会打开登录页并返回 true（调用方直接 return）；已登录返回 false。
///   if (requireLogin(context, ref)) return;
bool requireLogin(BuildContext context, WidgetRef ref) {
  if (!ref.read(isGuestProvider)) return false;
  context.pushPage(const LoginPage());
  return true;
}

/// 登录 / 注册两个按钮，游客提示里用。
class LoginButtons extends StatelessWidget {
  const LoginButtons({super.key});

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 10,
    runSpacing: 10,
    children: [
      HxButton('登录', onTap: () => context.pushPage(const LoginPage())),
      HxButton(
        '用邀请码注册',
        kind: HxButtonKind.ghost,
        onTap: () => context.pushPage(const LoginPage(initialTab: 1)),
      ),
    ],
  );
}

/// 整页都需要账号的标签（签到、我的）在游客状态下显示这个。
class GuestPrompt extends StatelessWidget {
  const GuestPrompt({
    super.key,
    required this.title,
    required this.body,
    this.showLogin = true,
  });
  final String title;
  final String body;

  /// false：已经登录、只是这个账号用不了（例如校外账号的签到页）
  final bool showLogin;

  @override
  Widget build(BuildContext context) => HianaPage(
    title: title,
    children: [
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: showLogin
            ? EmptyCard(
                title: '登录后才能用',
                body: body,
                action: const LoginButtons(),
              )
            : EmptyCard(title: body),
      ),
    ],
  );
}
