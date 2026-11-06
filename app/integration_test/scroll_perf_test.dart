/// 掉帧检查：在真机或模拟器上以 profile 模式滑动主要页面，记录每帧的构建和光栅化耗时。
///
///   flutter drive --profile --driver=test_driver/perf_driver.dart \
///     --target=integration_test/scroll_perf_test.dart \
///     --dart-define=HIANA_API=http://10.0.2.2:8787 --dart-define=PERF_TOKEN=<登录令牌>
///
/// 结果在 build/scroll_perf.json：每个场景的 average / 90th / 99th / worst 帧耗时（毫秒）
/// 和超过 16 ms 的帧数。60 Hz 屏幕上一帧的预算是 16.7 ms。
library;

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hiana_app/app/miuix_root.dart';
import 'package:hiana_app/data/token_store.dart';
import 'package:integration_test/integration_test.dart';

const _token = String.fromEnvironment('PERF_TOKEN');

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  binding.framePolicy = LiveTestWidgetsFlutterBindingFramePolicy.fullyLive;

  testWidgets('主要页面滑动', (tester) async {
    if (_token.isNotEmpty) await TokenStore().save(_token);
    await tester.pumpWidget(const ProviderScope(child: HianaApp()));
    await _settle(tester, 6);

    Future<void> scroll(String name, {int times = 4}) async {
      final list = find.byType(Scrollable).hitTestable().first;
      await binding.watchPerformance(() async {
        for (var i = 0; i < times; i++) {
          await tester.fling(list, const Offset(0, -900), 2500);
          await _settle(tester, 1);
        }
        for (var i = 0; i < times; i++) {
          await tester.fling(list, const Offset(0, 900), 2500);
          await _settle(tester, 1);
        }
      }, reportKey: name);
    }

    await scroll('首页');

    // 左右滑动切换标签
    await binding.watchPerformance(() async {
      for (var i = 0; i < 3; i++) {
        await tester.fling(find.byType(PageView), const Offset(-600, 0), 2000);
        await _settle(tester, 1);
      }
      for (var i = 0; i < 3; i++) {
        await tester.fling(find.byType(PageView), const Offset(600, 0), 2000);
        await _settle(tester, 1);
      }
    }, reportKey: '切换标签');

    await tester.tap(find.text('课程').last);
    await _settle(tester, 3);
    await scroll('课程目录', times: 6);

    await tester.tap(find.text('我的').last);
    await _settle(tester, 3);
    await scroll('我的');

    // 打开一篇长讲义并滑动
    await tester.tap(find.text('课程').last);
    await _settle(tester, 2);
    await binding.watchPerformance(() async {
      await tester.tap(find.textContaining('CS50x').first);
      await _settle(tester, 3);
    }, reportKey: '打开课程页');
    await tester.tap(find.textContaining('开始学').first.hitTestable());
    await _settle(tester, 1);
    await binding.watchPerformance(() async {
      await _settle(tester, 4);
    }, reportKey: '打开讲义');
    await scroll('讲义', times: 6);
  });
}

/// 不用 pumpAndSettle：页面上有循环动画（加载骨架、实时圆点）时它永远等不到结束
Future<void> _settle(WidgetTester tester, int seconds) async {
  for (var i = 0; i < seconds * 10; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}
