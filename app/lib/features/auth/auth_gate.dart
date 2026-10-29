import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/home_shell.dart';
import '../../data/providers.dart';
import '../../widgets/common.dart';

/// 启动时等登录状态确认好，然后进主界面。没登录也进主界面（游客模式），
/// 登录、注册在需要的地方打开 LoginPage。
class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final bg = MiuixTheme.of(context).colors.background;
    return session.when(
      loading: () => ColoredBox(
        color: bg,
        child: const Center(child: MiuixCircularProgressIndicator()),
      ),
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
      data: (_) => const HomeShell(),
    );
  }
}
