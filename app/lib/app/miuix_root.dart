// 全项目唯一允许 import material.dart 的文件（tool/check_no_material.sh 会检查）。
// MaterialApp 只用来提供本地化、导航和文本编辑基建；透明 Material 只给 flutter_miuix 的输入框当祖先。
// 这里不使用任何 Material 可见控件。
import 'package:flutter/material.dart' show ColorScheme, Material, MaterialApp, MaterialType, NoSplash, ThemeData;
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/providers.dart';
import '../features/auth/auth_gate.dart';

class HianaApp extends ConsumerWidget {
  const HianaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    return MiuixThemeController(
      colorSchemeMode: mode,
      child: Builder(
        builder: (context) {
          final theme = MiuixTheme.of(context);
          return MaterialApp(
            title: '协会学习',
            debugShowCheckedModeBanner: false,
            // 只为了让 flutter_miuix 内部用到的文本编辑基建取到颜色；关掉水波纹，避免出现 Material 观感
            theme: ThemeData(
              useMaterial3: true,
              brightness: theme.brightness,
              colorScheme: ColorScheme.fromSeed(seedColor: theme.colors.primary, brightness: theme.brightness),
              splashFactory: NoSplash.splashFactory,
              scaffoldBackgroundColor: theme.colors.background,
            ),
            locale: const Locale('zh', 'CN'),
            supportedLocales: const [Locale('zh', 'CN')],
            localizationsDelegates: GlobalMaterialLocalizations.delegates,
            home: const AuthGate(),
          );
        },
      ),
    );
  }
}

/// 给 flutter_miuix 的输入框提供 Material 祖先（透明，不画任何东西）。
/// 其他文件需要时用这个组件，不要自己 import material.dart。
class MaterialSurface extends StatelessWidget {
  const MaterialSurface({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Material(type: MaterialType.transparency, child: child);
}
