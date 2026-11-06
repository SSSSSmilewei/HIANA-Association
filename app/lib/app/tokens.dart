import 'dart:ui' show FontFeature;

import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';

import 'palettes.dart';

/// HIANA 液态玻璃的颜色和动效，和网页端 src/client/styles/tokens.css、palettes.css 同一套。
/// 浅色 / 深色跟着 MiuixTheme 的亮度走，配色跟着「我的 → 外观」选的主题走；页面里用 `Hx.of(context)` 取。
class Hx {
  const Hx._({
    required this.dark,
    required this.bg,
    required this.surface,
    required this.well,
    required this.line,
    required this.lineStrong,
    required this.ink,
    required this.sub,
    required this.navIdle,
    required this.track,
    required this.accent,
    required this.accentText,
    required this.cta,
    required this.ctaShadow,
    required this.tint,
    required this.nextBg,
    required this.now,
    required this.glass,
    required this.glassStrong,
    required this.glassEdge,
    required this.glassHi,
    required this.glassShadow,
    required this.pill,
    required this.night,
    required this.wall,
    required this.heatLine,
    required this.heat,
    required this.okBg,
    required this.okInk,
    required this.mutedBg,
    required this.mutedInk,
    required this.badBg,
    required this.badInk,
    this.ctaInk = const Color(0xFFFFFFFF),
    this.nightInk = const Color(0xFFFFF6EE),
    this.nightSub = const Color(0xFFE5CDBB),
    this.nightAccent = const Color(0xFFFFAA6B),
    this.nightHeat = const [
      Color(0x0FFFFFFF),
      Color(0xFF5A2D17),
      Color(0xFF9C4419),
      Color(0xFFE2601F),
      Color(0xFFFF4A3D),
    ],
    this.mono = 'monospace',
  });

  final bool dark;
  final Color bg;
  final Color surface;
  final Color well;
  final Color line;
  final Color lineStrong;
  final Color ink;
  final Color sub;
  final Color navIdle;
  final Color track;
  final Color accent;
  final Color accentText;
  final Color cta;
  final Color ctaShadow;
  final Color tint;
  final Color nextBg;
  final Color now;
  final Color glass;
  final Color glassStrong;
  final Color glassEdge;
  final Color glassHi;
  final Color glassShadow;
  final Color pill;
  final Color night;
  final Color wall;
  final Color heatLine;
  final List<Color> heat; // 1–4 档；0 档只描边
  final Color okBg;
  final Color okInk;
  final Color mutedBg;
  final Color mutedInk;
  final Color badBg;
  final Color badInk;

  /// 主按钮上的字（浅色主按钮的主题是深色字）
  final Color ctaInk;

  /// 深色卡片（浅色模式下反色）上的文字、次要文字、强调色和热力格子
  final Color nightInk;
  final Color nightSub;
  final Color nightAccent;
  final List<Color> nightHeat;

  /// 代码用的字体（导入了代码字体时是它的名字）
  final String mono;

  /// 换代码字体：其他颜色不变
  Hx withMono(String family) => Hx._(
    dark: dark,
    bg: bg,
    surface: surface,
    well: well,
    line: line,
    lineStrong: lineStrong,
    ink: ink,
    sub: sub,
    navIdle: navIdle,
    track: track,
    accent: accent,
    accentText: accentText,
    cta: cta,
    ctaShadow: ctaShadow,
    tint: tint,
    nextBg: nextBg,
    now: now,
    glass: glass,
    glassStrong: glassStrong,
    glassEdge: glassEdge,
    glassHi: glassHi,
    glassShadow: glassShadow,
    pill: pill,
    night: night,
    wall: wall,
    heatLine: heatLine,
    heat: heat,
    okBg: okBg,
    okInk: okInk,
    mutedBg: mutedBg,
    mutedInk: mutedInk,
    badBg: badBg,
    badInk: badInk,
    ctaInk: ctaInk,
    nightInk: nightInk,
    nightSub: nightSub,
    nightAccent: nightAccent,
    nightHeat: nightHeat,
    mono: family,
  );

  /// 由 7 个基色推导整套颜色，规则与网页 styles/palettes.css 一致（color-mix 换成 [mix] / [fade]）。
  /// [tweaks] 是个别主题在推导结果上的微调。
  factory Hx.derive(
    PaletteBase p, {
    required bool dark,
    Map<String, Object> tweaks = const {},
  }) {
    const red = Color(0xFFE5484D);
    const black = Color(0xFF000000);
    final night = dark ? p.surface : p.ink;
    final nightInk = dark ? p.ink : p.bg;
    Color t(String k, Color v) => tweaks[k] as Color? ?? v;
    return Hx._(
      dark: dark,
      bg: p.bg,
      surface: p.surface,
      well: mix(p.ink, 0.06, p.bg),
      line: fade(p.ink, 0.12),
      lineStrong: fade(p.ink, 0.40),
      ink: p.ink,
      sub: mix(p.ink, 0.66, p.bg),
      navIdle: mix(p.ink, 0.80, p.bg),
      track: fade(p.ink, 0.12),
      accent: p.accent,
      accentText: p.text,
      cta: p.cta,
      ctaInk: p.ctaInk,
      ctaShadow: t('ctaShadow', fade(p.cta, 0.30)),
      tint: t('tint', fade(p.accent, 0.16)),
      nextBg: t('nextBg', fade(p.accent, 0.10)),
      now: mix(p.accent, 0.60, red),
      glass: fade(p.surface, 0.62),
      glassStrong: fade(p.surface, 0.88),
      glassEdge: fade(p.ink, 0.12),
      glassHi: fade(p.ink, 0.06),
      // 深色模式的阴影必须是黑的，不能用浅色文字色调出光晕
      glassShadow: dark ? fade(black, 0.5) : fade(p.ink, 0.16),
      pill: mix(p.ink, 0.09, p.surface),
      night: night,
      nightInk: nightInk,
      nightSub: mix(nightInk, 0.72, night),
      nightAccent: mix(p.accent, 0.60, nightInk),
      nightHeat: [
        fade(nightInk, 0.08),
        mix(p.accent, 0.28, night),
        mix(p.accent, 0.52, night),
        mix(p.accent, 0.76, night),
        p.accent,
      ],
      wall: t('wall', p.bg),
      heatLine: fade(p.ink, 0.14),
      heat:
          tweaks['heat'] as List<Color>? ??
          (dark
              // 深色底上热力图收敛一些，避免最亮的格子刺眼
              ? [
                  mix(p.accent, 0.14, p.bg),
                  mix(p.accent, 0.28, p.bg),
                  mix(p.accent, 0.46, p.bg),
                  mix(p.accent, 0.68, p.bg),
                ]
              : [
                  mix(p.accent, 0.24, p.bg),
                  mix(p.accent, 0.46, p.bg),
                  mix(p.accent, 0.70, p.bg),
                  mix(p.accent, 0.92, p.ink),
                ]),
      okBg: t('okBg', fade(p.accent, 0.16)),
      okInk: t('okInk', p.text),
      mutedBg: fade(p.ink, 0.08),
      mutedInk: mix(p.ink, 0.75, p.bg),
      badBg: fade(red, 0.14),
      badInk: mix(red, 0.78, p.ink),
    );
  }

  /// 某个配色主题的浅色或深色那一套
  static Hx forPalette(Palette p, {required bool dark}) {
    if (p.id == kHianaPaletteId) return dark ? darkTheme : light;
    return Hx.derive(
      p.base(dark),
      dark: dark,
      tweaks: dark ? p.darkTweaks : p.lightTweaks,
    );
  }

  static const light = Hx._(
    dark: false,
    bg: Color(0xFFF6F5F3),
    surface: Color(0xFFFFFFFF),
    well: Color(0xFFF4F1ED),
    line: Color(0x141B1A19),
    lineStrong: Color(0x381B1A19),
    ink: Color(0xFF1B1A19),
    sub: Color(0xFF66625E),
    navIdle: Color(0xFF4E4A46),
    track: Color(0x141B1A19),
    accent: Color(0xFFF26B1D),
    accentText: Color(0xFFB8460B),
    cta: Color(0xFFC2410F),
    ctaShadow: Color(0x47C2410F),
    tint: Color(0x1FF26B1D),
    nextBg: Color(0x14F26B1D),
    now: Color(0xFFE03A2F),
    glass: Color(0x94FFFFFF),
    glassStrong: Color(0xDBFFFFFF),
    glassEdge: Color(0xD9FFFFFF),
    glassHi: Color(0xF2FFFFFF),
    glassShadow: Color(0x1F5A280A),
    pill: Color(0xEBFFFFFF),
    night: Color(0xFF2B1B13),
    wall: Color(0xFFFFF1E6),
    heatLine: Color(0x2EB8460B),
    heat: [
      Color(0xFFFFD9BA),
      Color(0xFFFFAA6B),
      Color(0xFFF26B1D),
      Color(0xFFD52A20),
    ],
    okBg: Color(0x1FF26B1D),
    okInk: Color(0xFFB8460B),
    mutedBg: Color(0xFFF1EEEA),
    mutedInk: Color(0xFF4E4A46),
    badBg: Color(0x1AE03A2F),
    badInk: Color(0xFFB32A20),
  );

  static const darkTheme = Hx._(
    dark: true,
    bg: Color(0xFF0E0D0C),
    surface: Color(0xFF1C1A19),
    well: Color(0x0DFFFFFF),
    line: Color(0x14FFFFFF),
    lineStrong: Color(0x3DFFFFFF),
    ink: Color(0xFFF3F1EE),
    sub: Color(0xFFA8A29C),
    navIdle: Color(0xFFC9C3BD),
    track: Color(0x1AFFFFFF),
    accent: Color(0xFFFF7A2E),
    accentText: Color(0xFFFF9A5C),
    cta: Color(0xFFC2410F),
    ctaShadow: Color(0x59C2410F),
    tint: Color(0x29FF7A2E),
    nextBg: Color(0x1AFF7A2E),
    now: Color(0xFFFF5145),
    glass: Color(0x8C282422),
    glassStrong: Color(0xDB24201E),
    glassEdge: Color(0x24FFFFFF),
    glassHi: Color(0x1AFFFFFF),
    glassShadow: Color(0x73000000),
    pill: Color(0x1FFFFFFF),
    night: Color(0xFF211510),
    wall: Color(0xFF160F0B),
    heatLine: Color(0x24FF9A5C),
    heat: [
      Color(0xFF5A2D17),
      Color(0xFF9C4419),
      Color(0xFFE2601F),
      Color(0xFFFF4A3D),
    ],
    okBg: Color(0x29FF7A2E),
    okInk: Color(0xFFFF9A5C),
    mutedBg: Color(0x14FFFFFF),
    mutedInk: Color(0xFFD8D2CC),
    badBg: Color(0x29FF5145),
    badInk: Color(0xFFFF8A80),
  );

  static Hx of(BuildContext context) {
    final dark = MiuixTheme.of(context).brightness == Brightness.dark;
    final scope = context.dependOnInheritedWidgetOfExactType<HxScope>();
    if (scope == null) return dark ? darkTheme : light;
    return dark ? scope.dark : scope.light;
  }

  /// 第 [level] 档（0–4）的填充色；0 档返回 null（只描边）。
  Color? heatColor(int level) =>
      level <= 0 ? null : heat[level > 4 ? 3 : level - 1];
}

/// 当前配色主题的浅、深两套颜色，放在 App 根部（miuix_root.dart）。
class HxScope extends InheritedWidget {
  const HxScope({
    super.key,
    required this.light,
    required this.dark,
    required super.child,
  });
  final Hx light;
  final Hx dark;

  @override
  bool updateShouldNotify(HxScope old) =>
      old.light != light || old.dark != dark;
}

/// 动效：进场快、退场更快；弹簧只用在面板、按下回弹和成功动画上。
class HxMotion {
  static const fast = Duration(milliseconds: 140);
  static const mid = Duration(milliseconds: 220);
  static const slow = Duration(milliseconds: 360);
  static const ease = Cubic(0.22, 1, 0.36, 1);
  static const easeIn = Cubic(0.4, 0, 1, 1);
}

/// 数字用等宽数字，表格和时间不会跳。
const kTabular = [FontFeature.tabularFigures()];
