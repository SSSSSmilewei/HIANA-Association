import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/miuix_root.dart';
import 'data/look.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // 先读好外观（配色、导入的字体），第一帧就是选好的样子，不会先闪一下默认色
  initialLook = await Look.load();
  runApp(const ProviderScope(child: HianaApp()));
}
