import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/home_shell.dart';
import '../../data/providers.dart';
import '../../widgets/common.dart';
import 'login_page.dart';
import 'set_password_page.dart';

/// 根据登录状态决定显示哪一页：未登录 → 登录；刚激活 → 设密码；学员 → 主界面。
class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final bg = MiuixTheme.of(context).colors.background;
    return session.when(
      loading: () => ColoredBox(color: bg, child: const Center(child: MiuixCircularProgressIndicator())),
      // 断网等情况：保留令牌，给一个重试入口，而不是直接退出登录
      error: (e, _) => ColoredBox(
        color: bg,
        child: Center(
          child: NoticeCard(
            message: '$e',
            actionLabel: '重试',
            onAction: () => ref.read(sessionProvider.notifier).retry(),
          ),
        ),
      ),
      data: (me) {
        if (!me.isMember) return const LoginPage();
        if (me.needsPassword) return const SetPasswordPage(firstTime: true);
        return const HomeShell();
      },
    );
  }
}
