// 全项目唯一允许 import material.dart 的文件（tool/check_no_material.sh 会检查）。
// MaterialApp 只用来提供本地化、导航和文本编辑基建；透明 Material 只给 flutter_miuix 的输入框当祖先。
// 这里不使用任何 Material 可见控件。
import 'package:flutter/material.dart'
    show ColorScheme, Material, MaterialApp, MaterialType, NoSplash, ThemeData;
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/providers.dart';
import '../features/auth/auth_gate.dart';
import '../data/look.dart';
import 'palettes.dart';
import 'tokens.dart';

/// miuix 组件（开关、输入框、对话框……）的颜色跟着当前配色主题走
MiuixColors _miuixColors(Hx h, MiuixColors base) => base.copy(
  primary: h.cta,
  onPrimary: h.ctaInk,
  primaryVariant: h.cta,
  onPrimaryVariant: h.ctaInk,
  primaryContainer: h.cta,
  onPrimaryContainer: h.ctaInk,
  background: h.bg,
  onBackground: h.ink,
  surface: h.surface,
  onSurface: h.ink,
  surfaceContainer: h.surface,
  onSurfaceContainer: h.ink,
  onSurfaceVariantSummary: h.sub,
  secondaryContainer: h.well,
  onSecondaryContainer: h.sub,
  tertiaryContainer: h.tint,
  dividerLine: h.line,
);

/// 导入的正文字体用到 miuix 的全部文本样式上
MiuixTextStyles _textStyles(String? family) {
  final d = defaultTextStyles();
  if (family == null) return d;
  TextStyle f(TextStyle s) => s.copyWith(fontFamily: family);
  return d.copy(
    main: f(d.main),
    paragraph: f(d.paragraph),
    body1: f(d.body1),
    body2: f(d.body2),
    button: f(d.button),
    footnote1: f(d.footnote1),
    footnote2: f(d.footnote2),
    headline1: f(d.headline1),
    headline2: f(d.headline2),
    subtitle: f(d.subtitle),
    title1: f(d.title1),
    title2: f(d.title2),
    title3: f(d.title3),
    title4: f(d.title4),
  );
}

class HianaApp extends ConsumerWidget {
  const HianaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    final look = ref.watch(lookProvider);
    final mono = look.mono?.family ?? 'monospace';
    final sans = look.sans?.family;
    final light = Hx.forPalette(look.palette, dark: false).withMono(mono);
    final dark = Hx.forPalette(look.palette, dark: true).withMono(mono);
    final lightColors = _miuixColors(light, lightColorScheme());
    var darkColors = _miuixColors(dark, darkColorScheme());
    // 海纳橙深色模式的主色比按钮色亮一些（和原来一致）
    if (look.palette.id == kHianaPaletteId) {
      darkColors = darkColors.copy(primary: const Color(0xFFE2601F));
    }
    return HxScope(
      light: light,
      dark: dark,
      child: MiuixThemeController(
        colorSchemeMode: mode,
        lightColors: lightColors,
        darkColors: darkColors,
        textStyles: _textStyles(sans),
        child: Builder(
          builder: (context) {
            final theme = MiuixTheme.of(context);
            return MaterialApp(
              title: '海纳协会',
              debugShowCheckedModeBanner: false,
              // 只为了让 flutter_miuix 内部用到的文本编辑基建取到颜色；关掉水波纹，避免出现 Material 观感
              theme: ThemeData(
                useMaterial3: true,
                brightness: theme.brightness,
                colorScheme: ColorScheme.fromSeed(
                  seedColor: theme.colors.primary,
                  brightness: theme.brightness,
                ),
                splashFactory: NoSplash.splashFactory,
                fontFamily: sans,
                scaffoldBackgroundColor: theme.colors.background,
              ),
              locale: const Locale('zh', 'CN'),
              supportedLocales: const [Locale('zh', 'CN')],
              localizationsDelegates: GlobalMaterialLocalizations.delegates,
              // 页面里直接用 Text 时的默认样式（没有 Material 的 Scaffold 提供它）
              // 字号：在系统字号的基础上再乘外观里选的倍数
              builder: (context, child) {
                final mq = MediaQuery.of(context);
                return MediaQuery(
                  data: mq.copyWith(
                    textScaler: TextScaler.linear(
                      mq.textScaler.scale(14) / 14 * look.textScale,
                    ),
                  ),
                  child: DefaultTextStyle(
                    style: TextStyle(
                      color: Hx.of(context).ink,
                      fontSize: 15,
                      height: 1.45,
                      fontFamily: sans,
                    ),
                    child: child ?? const SizedBox.shrink(),
                  ),
                );
              },
              home: const AuthGate(),
            );
          },
        ),
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
  Widget build(BuildContext context) =>
      Material(type: MaterialType.transparency, child: child);
}
