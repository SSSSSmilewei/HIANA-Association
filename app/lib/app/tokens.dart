import 'dart:ui' show FontFeature;

import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';

/// HIANA 液态玻璃的颜色和动效，和网页端 src/client/styles/tokens.css 同一套。
/// 浅色 / 深色跟着 MiuixTheme 的亮度走；页面里用 `Hx.of(context)` 取。
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

  static const nightInk = Color(0xFFFFF6EE);
  static const nightSub = Color(0xFFE5CDBB);
  static const nightAccent = Color(0xFFFFAA6B);
  static const nightHeat = [Color(0x0FFFFFFF), Color(0xFF5A2D17), Color(0xFF9C4419), Color(0xFFE2601F), Color(0xFFFF4A3D)];

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
    heat: [Color(0xFFFFD9BA), Color(0xFFFFAA6B), Color(0xFFF26B1D), Color(0xFFD52A20)],
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
    heat: [Color(0xFF5A2D17), Color(0xFF9C4419), Color(0xFFE2601F), Color(0xFFFF4A3D)],
    okBg: Color(0x29FF7A2E),
    okInk: Color(0xFFFF9A5C),
    mutedBg: Color(0x14FFFFFF),
    mutedInk: Color(0xFFD8D2CC),
    badBg: Color(0x29FF5145),
    badInk: Color(0xFFFF8A80),
  );

  static Hx of(BuildContext context) => MiuixTheme.of(context).brightness == Brightness.dark ? darkTheme : light;

  /// 第 [level] 档（0–4）的填充色；0 档返回 null（只描边）。
  Color? heatColor(int level) => level <= 0 ? null : heat[level > 4 ? 3 : level - 1];
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
