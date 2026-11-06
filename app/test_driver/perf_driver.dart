import 'package:integration_test/integration_test_driver.dart';

/// 掉帧检查的驱动：把每个场景的帧耗时摘要写到 build/ 下。
/// 用法见 integration_test/scroll_perf_test.dart 开头。
Future<void> main() => integrationDriver(
  responseDataCallback: (data) async {
    if (data == null) return;
    await writeResponseData(data, testOutputFilename: 'scroll_perf');
  },
);
