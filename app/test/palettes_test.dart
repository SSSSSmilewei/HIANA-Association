import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hiana_app/app/palettes.dart';
import 'package:hiana_app/app/tokens.dart';

void main() {
  test('内置配色和网页一样是 12 套，默认 shanmoew-mizu', () {
    expect(kPalettes.length, 12);
    expect(kPalettes.where((p) => p.id == kDefaultPaletteId), hasLength(1));
  });

  test('HIANA JSON 导出后能再导入', () {
    final mizu = kPalettes.first;
    final p = parsePalette(mizu.exportJson(), id: 'x')!;
    expect(p.light.values, mizu.light.values);
    expect(p.dark.values, mizu.dark.values);
  });

  test('base16、VS Code、CSS 变量都能认出来', () {
    expect(parsePalette('scheme: "Test"\nbase00: "1d1f21"\nbase05: "c5c8c6"\nbase0D: "81a2be"', id: 'a')?.label, 'Test');
    final vs = parsePalette('{"name":"V","colors":{"editor.background":"#1e1e1e","editor.foreground":"#d4d4d4","focusBorder":"#007acc"}}', id: 'b')!;
    expect(vs.light.bg, const Color(0xFF1E1E1E));
    expect(parsePalette(':root{--bg:#ffffff;--ink:#111111;--accent:#ff0000}', id: 'c'), isNotNull);
    expect(parsePalette('随便一段文字', id: 'd'), isNull);
  });

  test('只给底色、文字、强调色时补全按钮字色', () {
    final p = parsePalette('{"bg":"#ffffff","ink":"#111111","accent":"#ffee00"}', id: 'e')!;
    // 亮黄按钮上用深色字
    expect(p.light.ctaInk, const Color(0xFF111111));
  });

  test('推导：mix 与 CSS color-mix 一致；海纳橙用原来的颜色', () {
    final m = mix(const Color(0xFF000000), 0.5, const Color(0xFFFFFFFF));
    expect((m.r * 255).round(), 128);
    final hiana = kPalettes.firstWhere((p) => p.id == kHianaPaletteId);
    expect(Hx.forPalette(hiana, dark: false), same(Hx.light));
    final nord = Hx.forPalette(kPalettes.firstWhere((p) => p.id == 'nord'), dark: true);
    expect(nord.bg, const Color(0xFF2E3440));
    expect(nord.night, const Color(0xFF3B4252)); // 深色模式的深色卡片用表面色
  });
}
