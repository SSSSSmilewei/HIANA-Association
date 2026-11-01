import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hiana_app/app/home_shell.dart';
import 'package:hiana_app/app/miuix_root.dart';

/// 启动后主界面要真的有大小：1.3.0 曾经因为 MiuixScaffold 给的是宽松约束，主界面缩成 0×0，整屏白。
void main() {
  testWidgets('启动后主界面铺满屏幕，底部标签栏看得见', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.625;
    addTearDown(tester.view.reset);
    // 令牌存储：当作没登录（游客）
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
      (call) async => null,
    );

    await tester.pumpWidget(const ProviderScope(child: HianaApp()));
    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 200));
    }

    expect(find.byType(HomeShell), findsOneWidget);
    final size = tester.getSize(find.byType(PageView));
    expect(size.width, greaterThan(300));
    expect(size.height, greaterThan(600));
    for (final tab in ['首页', '课程', '签到', '我的']) {
      expect(find.text(tab), findsWidgets);
    }
  });
}
