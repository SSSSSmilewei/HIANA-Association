import 'dart:convert';

import 'package:flutter/widgets.dart';

/// 配色主题（与网页 src/client/prefs.ts 的 PALETTES、styles/palettes.css 同一套）。
/// 每个主题只写 7 个基色（浅、深各一套），其余颜色都由基色推导（见 tokens.dart 的 Hx.derive）。
/// 导入的配色支持和网页一样的几种格式（见 [parsePalette]）。

class PaletteBase {
  const PaletteBase({
    required this.bg,
    required this.surface,
    required this.ink,
    required this.accent,
    required this.text,
    required this.cta,
    required this.ctaInk,
  });

  /// 底色、卡片表面、正文、强调色、文字里的强调色、主按钮、主按钮上的字
  final Color bg;
  final Color surface;
  final Color ink;
  final Color accent;
  final Color text;
  final Color cta;
  final Color ctaInk;

  static const keys = ['bg', 'surface', 'ink', 'accent', 'text', 'cta', 'ctaInk'];

  List<Color> get values => [bg, surface, ink, accent, text, cta, ctaInk];

  Map<String, String> toJson() => {
    for (var i = 0; i < keys.length; i++) keys[i]: colorHex(values[i]),
  };

  static PaletteBase? fromJson(Object? j) {
    if (j is! Map) return null;
    return complete(pickBase(j.cast<String, Object?>()));
  }
}

class Palette {
  const Palette({
    required this.id,
    required this.label,
    required this.light,
    required this.dark,
    this.lightTweaks = const {},
    this.darkTweaks = const {},
    this.custom = false,
  });
  final String id;
  final String label;
  final PaletteBase light;
  final PaletteBase dark;

  /// 个别主题在推导结果上的微调（与 palettes.css 里该主题多写的变量一致）
  final Map<String, Object> lightTweaks;
  final Map<String, Object> darkTweaks;

  /// 用户导入的
  final bool custom;

  PaletteBase base(bool dark) => dark ? this.dark : light;

  /// 导出成 HIANA JSON（和网页的“导出配色”一样，可以在网页上导入）
  String exportJson() => const JsonEncoder.withIndent('  ').convert({
    'name': label,
    'light': light.toJson(),
    'dark': dark.toJson(),
  });

  Map<String, Object?> toJson() => {
    'id': id,
    'name': label,
    'light': light.toJson(),
    'dark': dark.toJson(),
  };

  static Palette? fromStored(Object? j) {
    if (j is! Map) return null;
    final l = PaletteBase.fromJson(j['light']);
    final d = PaletteBase.fromJson(j['dark']);
    if (l == null || d == null || j['id'] is! String) return null;
    return Palette(
      id: j['id'] as String,
      label: '${j['name'] ?? '自定义'}',
      light: l,
      dark: d,
      custom: true,
    );
  }
}

Color _c(int v) => Color(v);

PaletteBase _b(int bg, int surface, int ink, int accent, int text, int cta, int ctaInk) =>
    PaletteBase(
      bg: _c(bg),
      surface: _c(surface),
      ink: _c(ink),
      accent: _c(accent),
      text: _c(text),
      cta: _c(cta),
      ctaInk: _c(ctaInk),
    );

/// 海纳橙：App 原来的配色（网页 tokens.css 的默认橙色），颜色写死在 Hx.light / Hx.darkTheme
const kHianaPaletteId = 'hiana';

/// 默认配色，与网页 DEFAULT_PALETTE 一致
const kDefaultPaletteId = 'shanmoew-mizu';

final kPalettes = <Palette>[
  Palette(
    id: 'shanmoew-mizu',
    label: 'shanmoew-mizu',
    // 主色很浅，直接当文字看不清：文字、链接用同色相压深的 #1d6b80，主按钮用浅色底 + 深色字
    light: _b(0xFFF2F9FA, 0xFFFFFFFF, 0xFF102C35, 0xFF3E9FB8, 0xFF1D6B80, 0xFFADD8E6, 0xFF0E3340),
    dark: _b(0xFF0C1A20, 0xFF13262E, 0xFFE3F3F6, 0xFFADD8E6, 0xFFBCE2E8, 0xFFBCE2E8, 0xFF0C1A20),
    lightTweaks: {
      'ctaShadow': const Color(0x473E9FB8),
      'tint': const Color(0x6BADD8E6),
      'nextBg': const Color(0x3DA5C9C1),
      'okBg': const Color(0x4288BFBF),
      'okInk': const Color(0xFF22615D),
      'heat': const [Color(0xFFDCF0F3), Color(0xFFAFDFE4), Color(0xFF6FB9CC), Color(0xFF2A7F96)],
    },
    darkTweaks: {
      'ctaShadow': const Color(0x66000000),
      'tint': const Color(0x29ADD8E6),
      'nextBg': const Color(0x1FA5C9C1),
      'okBg': const Color(0x2E88BFBF),
      'okInk': const Color(0xFFA5C9C1),
      'heat': const [Color(0xFF16313A), Color(0xFF24505D), Color(0xFF4F8FA1), Color(0xFFADD8E6)],
    },
  ),
  // 海纳橙的基色只用来画设置里的预览；实际颜色见 Hx.light / Hx.darkTheme
  Palette(
    id: kHianaPaletteId,
    label: '海纳橙',
    light: _b(0xFFF6F5F3, 0xFFFFFFFF, 0xFF1B1A19, 0xFFF26B1D, 0xFFB8460B, 0xFFC2410F, 0xFFFFFFFF),
    dark: _b(0xFF0E0D0C, 0xFF1C1A19, 0xFFF3F1EE, 0xFFFF7A2E, 0xFFFF9A5C, 0xFFC2410F, 0xFFFFFFFF),
  ),
  Palette(
    id: 'nord',
    label: 'Nord',
    light: _b(0xFFECEFF4, 0xFFFFFFFF, 0xFF2E3440, 0xFF5E81AC, 0xFF4C6A91, 0xFF5E81AC, 0xFFFFFFFF),
    dark: _b(0xFF2E3440, 0xFF3B4252, 0xFFECEFF4, 0xFF88C0D0, 0xFF88C0D0, 0xFF88C0D0, 0xFF2E3440),
  ),
  Palette(
    id: 'catppuccin',
    label: 'Catppuccin',
    light: _b(0xFFEFF1F5, 0xFFFFFFFF, 0xFF4C4F69, 0xFF8839EF, 0xFF8839EF, 0xFF8839EF, 0xFFFFFFFF),
    dark: _b(0xFF1E1E2E, 0xFF313244, 0xFFCDD6F4, 0xFFCBA6F7, 0xFFCBA6F7, 0xFFCBA6F7, 0xFF1E1E2E),
  ),
  Palette(
    id: 'tokyo-night',
    label: 'Tokyo Night',
    light: _b(0xFFE6E7ED, 0xFFFFFFFF, 0xFF343B58, 0xFF2E7DE9, 0xFF2563C9, 0xFF2E7DE9, 0xFFFFFFFF),
    dark: _b(0xFF1A1B26, 0xFF24283B, 0xFFC0CAF5, 0xFF7AA2F7, 0xFF7AA2F7, 0xFF7AA2F7, 0xFF1A1B26),
  ),
  Palette(
    id: 'dracula',
    label: 'Dracula',
    light: _b(0xFFFFFBEB, 0xFFFFFFFF, 0xFF1F1F1F, 0xFF644AC9, 0xFF644AC9, 0xFF644AC9, 0xFFFFFFFF),
    dark: _b(0xFF282A36, 0xFF343746, 0xFFF8F8F2, 0xFFBD93F9, 0xFFBD93F9, 0xFFBD93F9, 0xFF282A36),
  ),
  Palette(
    id: 'gruvbox',
    label: 'Gruvbox',
    light: _b(0xFFFBF1C7, 0xFFF9F5D7, 0xFF3C3836, 0xFFB57614, 0xFF9D5F0D, 0xFFB57614, 0xFFFBF1C7),
    dark: _b(0xFF282828, 0xFF3C3836, 0xFFEBDBB2, 0xFFFABD2F, 0xFFFABD2F, 0xFFD79921, 0xFF282828),
  ),
  Palette(
    id: 'one',
    label: 'One',
    light: _b(0xFFFAFAFA, 0xFFFFFFFF, 0xFF383A42, 0xFF4078F2, 0xFF3366D6, 0xFF4078F2, 0xFFFFFFFF),
    dark: _b(0xFF282C34, 0xFF2F343E, 0xFFABB2BF, 0xFF61AFEF, 0xFF61AFEF, 0xFF61AFEF, 0xFF282C34),
  ),
  Palette(
    id: 'solarized',
    label: 'Solarized',
    light: _b(0xFFFDF6E3, 0xFFEEE8D5, 0xFF073642, 0xFF268BD2, 0xFF1A6FAE, 0xFF268BD2, 0xFFFDF6E3),
    dark: _b(0xFF002B36, 0xFF073642, 0xFF93A1A1, 0xFF268BD2, 0xFF4AA3E0, 0xFF268BD2, 0xFFFDF6E3),
  ),
  Palette(
    id: 'kanagawa',
    label: 'Kanagawa',
    light: _b(0xFFF2ECBC, 0xFFF9F4D2, 0xFF545464, 0xFF4D699B, 0xFF43598A, 0xFF4D699B, 0xFFF9F4D2),
    dark: _b(0xFF1F1F28, 0xFF2A2A37, 0xFFDCD7BA, 0xFF7E9CD8, 0xFF7E9CD8, 0xFF7E9CD8, 0xFF1F1F28),
  ),
  Palette(
    id: 'rose-pine',
    label: 'Rosé Pine',
    light: _b(0xFFFAF4ED, 0xFFFFFAF3, 0xFF575279, 0xFF907AA9, 0xFF7A6592, 0xFF7A6592, 0xFFFFFAF3),
    dark: _b(0xFF191724, 0xFF1F1D2E, 0xFFE0DEF4, 0xFFC4A7E7, 0xFFC4A7E7, 0xFFC4A7E7, 0xFF191724),
  ),
  Palette(
    id: 'vesper',
    label: 'Vesper',
    light: _b(0xFFF6F1EA, 0xFFFFFFFF, 0xFF1C1C1C, 0xFFC2662A, 0xFFA4521D, 0xFFA4521D, 0xFFFFFFFF),
    dark: _b(0xFF101010, 0xFF1A1A1A, 0xFFE6E6E6, 0xFFFFC799, 0xFFFFC799, 0xFFFFC799, 0xFF101010),
  ),
];

/* ---------- 颜色计算 ---------- */

String colorHex(Color c) {
  int ch(double v) => (v * 255).round().clamp(0, 255);
  return '#${[ch(c.r), ch(c.g), ch(c.b)].map((v) => v.toRadixString(16).padLeft(2, '0')).join()}';
}

/// CSS 的 color-mix(in srgb, a p%, b)
Color mix(Color a, double p, Color b) => Color.from(
  alpha: a.a * p + b.a * (1 - p),
  red: a.r * p + b.r * (1 - p),
  green: a.g * p + b.g * (1 - p),
  blue: a.b * p + b.b * (1 - p),
);

/// color-mix(in srgb, a p%, transparent)：同色，透明度为 p
Color fade(Color a, double p) => a.withValues(alpha: a.a * p);

/// 两个颜色的对比度（WCAG），用来挑按钮上的字色、判断强调色能不能直接当文字
double contrast(Color a, Color b) {
  final x = a.computeLuminance(), y = b.computeLuminance();
  final hi = x > y ? x : y, lo = x > y ? y : x;
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------- 解析导入的配色（对照网页 src/client/theme.ts） ---------- */

final _hexRe = RegExp(r'^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$');

Color? parseHex(Object? v) {
  if (v is! String) return null;
  final s = v.trim().replaceAll(RegExp(r'''^["']|["']$'''), '');
  final m = _hexRe.firstMatch(s);
  if (m == null) return null;
  var h = m[1]!.toLowerCase();
  if (h.length == 3) h = h.split('').map((c) => '$c$c').join();
  return Color(0xFF000000 | int.parse(h.substring(0, 6), radix: 16));
}

Map<String, Color> pickBase(Map<String, Object?> o) {
  const alias = {
    'background': 'bg',
    'foreground': 'ink',
    'fg': 'ink',
    'primary': 'accent',
    'cta-ink': 'ctaInk',
    'cta_ink': 'ctaInk',
  };
  final out = <String, Color>{};
  for (final e in o.entries) {
    final key = PaletteBase.keys.contains(e.key) ? e.key : alias[e.key];
    final c = parseHex(e.value);
    if (key != null && c != null) out[key] = c;
  }
  return out;
}

/// 由“底色、表面、文字、强调色”补全 7 个基色（和网页 complete 一样）
PaletteBase? complete(Map<String, Color> p) {
  final bg = p['bg'];
  final ink = p['ink'];
  final accent = p['accent'] ?? p['cta'] ?? p['text'];
  if (bg == null || ink == null || accent == null) return null;
  final cta = p['cta'] ?? accent;
  return PaletteBase(
    bg: bg,
    surface: p['surface'] ?? bg,
    ink: ink,
    accent: accent,
    // 文字里的强调色要在底色上读得清，不够就退到正文色
    text: p['text'] ?? (contrast(accent, bg) >= 3 ? accent : ink),
    cta: cta,
    ctaInk: p['ctaInk'] ?? (contrast(cta, bg) >= contrast(cta, ink) ? bg : ink),
  );
}

Palette _both(String id, String name, PaletteBase one) =>
    Palette(id: id, label: name, light: one, dark: one, custom: true);

String _clip(String s) => s.trim().isEmpty ? '自定义' : (s.trim().length > 40 ? s.trim().substring(0, 40) : s.trim());

Palette? _fromBase16(String id, String text) {
  Color? get(String n) {
    final m = RegExp('["\']?base$n["\']?\\s*[:=]\\s*["\']?#?([0-9a-fA-F]{6})', caseSensitive: false).firstMatch(text);
    return m == null ? null : parseHex(m[1]);
  }

  final b00 = get('00'), b05 = get('05');
  if (b00 == null || b05 == null) return null;
  final name = RegExp(r'''^\s*["']?(?:scheme|name)["']?\s*:\s*["']?([^"'\n,]+)''', multiLine: true).firstMatch(text)?[1] ?? 'base16';
  final accent = get('0D') ?? get('0E') ?? get('08') ?? b05;
  final one = complete({'bg': b00, 'surface': get('01') ?? b00, 'ink': b05, 'accent': accent});
  return one == null ? null : _both(id, _clip(name), one);
}

Palette? _fromVscode(String id, Map<String, Object?> o) {
  final c = (o['colors'] as Map).cast<String, Object?>();
  Color? g(List<String> ks) {
    for (final k in ks) {
      final v = parseHex(c[k]);
      if (v != null) return v;
    }
    return null;
  }

  final p = <String, Color>{};
  void put(String k, Color? v) {
    if (v != null) p[k] = v;
  }

  put('bg', g(['editor.background']));
  put('surface', g(['sideBar.background', 'editorWidget.background', 'panel.background', 'editor.background']));
  put('ink', g(['editor.foreground', 'foreground']));
  put('accent', g(['focusBorder', 'button.background', 'textLink.foreground', 'activityBarBadge.background']));
  put('text', g(['textLink.foreground']));
  put('cta', g(['button.background']));
  put('ctaInk', g(['button.foreground']));
  final one = complete(p);
  return one == null ? null : _both(id, _clip('${o['name'] ?? 'VS Code'}'), one);
}

Palette? _fromCss(String id, String text, String fallback) {
  final vars = <String, Object?>{};
  for (final m in RegExp(r'--(?:p-)?([\w-]+)\s*:\s*([^;}]+);?').allMatches(text)) {
    final k = m[1]!.replaceAllMapped(RegExp(r'-(\w)'), (x) => x[1]!.toUpperCase());
    vars[k] = m[2];
  }
  final one = complete(pickBase(vars));
  return one == null ? null : _both(id, fallback, one);
}

/// 解析一段配色文本；认不出返回 null。支持的格式和网页一样：
///  - HIANA JSON：{ "name", "light": { bg, surface, ink, accent, text, cta, ctaInk }, "dark": {…} }（也可以只给一套）
///  - base16 / base24（YAML 或 JSON）
///  - VS Code 颜色主题 JSON（colors 字段）
///  - CSS 变量：--bg、--surface、--ink、--accent… 或 --p-bg…
/// 只给一套颜色时，深浅两种模式都用这一套。
Palette? parsePalette(String text, {required String id, String fallbackName = '自定义'}) {
  final t = text.trim();
  if (t.isEmpty) return null;
  Object? json;
  try {
    json = jsonDecode(t.replaceAll(RegExp(r'^\s*//.*$', multiLine: true), ''));
  } on FormatException {
    json = null;
  }
  if (json is Map) {
    final o = json.cast<String, Object?>();
    if (o['colors'] is Map) return _fromVscode(id, o);
    if (o['light'] != null || o['dark'] != null) {
      final l = o['light'] is Map ? complete(pickBase((o['light'] as Map).cast<String, Object?>())) : null;
      final d = o['dark'] is Map ? complete(pickBase((o['dark'] as Map).cast<String, Object?>())) : null;
      if (l == null && d == null) return null;
      return Palette(
        id: id,
        label: _clip('${o['name'] ?? fallbackName}'),
        light: (l ?? d)!,
        dark: (d ?? l)!,
        custom: true,
      );
    }
    if (RegExp(r'base0[0-9a-f]', caseSensitive: false).hasMatch(t)) return _fromBase16(id, t);
    final one = complete(pickBase(o));
    return one == null ? null : _both(id, _clip('${o['name'] ?? fallbackName}'), one);
  }
  if (RegExp(r'''base0[0-9a-f]\s*["']?\s*[:=]''', caseSensitive: false).hasMatch(t)) {
    return _fromBase16(id, t);
  }
  if (RegExp(r'--[\w-]+\s*:').hasMatch(t)) return _fromCss(id, t, fallbackName);
  return null;
}
