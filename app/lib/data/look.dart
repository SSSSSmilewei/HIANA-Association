import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';

import '../app/palettes.dart';

/// 外观：配色主题（内置 + 导入的）、正文字体、代码字体、字号。
/// 只存在这台手机上（网页的外观设置存在浏览器里，两边互不影响；导出 / 导入配色可以在两边之间搬）。
/// 启动时在 main() 里先读好（[Look.load]），第一帧就是选好的配色，不会先闪一下默认色。

/// 字号档位：小、标准、大、特大
const kTextScales = [(0.9, '小'), (1.0, '标准'), (1.1, '大'), (1.2, '特大')];

/// 导入的字体：文件存在 App 的文档目录，启动时用 FontLoader 注册成 [family]
class FontChoice {
  const FontChoice({
    required this.name,
    required this.path,
    required this.family,
  });

  /// 给人看的名字（文件名或网址里的文件名）
  final String name;
  final String path;

  /// 注册用的字体族名，每次导入都不同（同一个名字只能注册一次）
  final String family;

  Map<String, String> toJson() => {
    'name': name,
    'path': path,
    'family': family,
  };

  static FontChoice? fromJson(Object? j) {
    if (j is! Map || j['path'] is! String || j['family'] is! String) {
      return null;
    }
    return FontChoice(
      name: '${j['name'] ?? '字体'}',
      path: j['path'] as String,
      family: j['family'] as String,
    );
  }
}

enum FontSlot { sans, mono }

class Look {
  const Look({
    this.paletteId = kDefaultPaletteId,
    this.customs = const [],
    this.sans,
    this.mono,
    this.textScale = 1.0,
  });
  final String paletteId;
  final List<Palette> customs;
  final FontChoice? sans;
  final FontChoice? mono;
  final double textScale;

  List<Palette> get all => [...kPalettes, ...customs];

  Palette get palette =>
      all.where((p) => p.id == paletteId).firstOrNull ??
      kPalettes.firstWhere((p) => p.id == kDefaultPaletteId);

  FontChoice? font(FontSlot s) => s == FontSlot.sans ? sans : mono;

  Look copyWith({
    String? paletteId,
    List<Palette>? customs,
    FontChoice? sans,
    bool clearSans = false,
    FontChoice? mono,
    bool clearMono = false,
    double? textScale,
  }) => Look(
    paletteId: paletteId ?? this.paletteId,
    customs: customs ?? this.customs,
    sans: clearSans ? null : (sans ?? this.sans),
    mono: clearMono ? null : (mono ?? this.mono),
    textScale: textScale ?? this.textScale,
  );

  Map<String, Object?> toJson() => {
    'palette': paletteId,
    'customs': [for (final c in customs) c.toJson()],
    'sans': sans?.toJson(),
    'mono': mono?.toJson(),
    'scale': textScale,
  };

  factory Look.fromJson(Map<String, Object?> j) {
    final scale = (j['scale'] as num?)?.toDouble() ?? 1.0;
    return Look(
      paletteId: j['palette'] as String? ?? kDefaultPaletteId,
      customs: [
        for (final c in (j['customs'] as List? ?? const []))
          ?Palette.fromStored(c),
      ],
      sans: FontChoice.fromJson(j['sans']),
      mono: FontChoice.fromJson(j['mono']),
      textScale: kTextScales.any((s) => s.$1 == scale) ? scale : 1.0,
    );
  }

  static const _key = 'hiana_look';
  static const _storage = FlutterSecureStorage();

  /// 读出保存的外观，并注册导入的字体。出任何错都退回默认外观，不挡启动
  static Future<Look> load() async {
    try {
      final raw = await _storage.read(key: _key);
      if (raw == null) return const Look();
      var look = Look.fromJson(
        (jsonDecode(raw) as Map).cast<String, Object?>(),
      );
      for (final slot in FontSlot.values) {
        final f = look.font(slot);
        if (f != null && !await registerFont(f)) {
          look = slot == FontSlot.sans
              ? look.copyWith(clearSans: true)
              : look.copyWith(clearMono: true);
        }
      }
      return look;
    } catch (_) {
      return const Look();
    }
  }

  Future<void> save() => _storage.write(key: _key, value: jsonEncode(toJson()));
}

/// 注册一个导入的字体；文件不在了或读不出来返回 false
Future<bool> registerFont(FontChoice f) async {
  try {
    final file = File(f.path);
    if (!await file.exists()) return false;
    final bytes = await file.readAsBytes();
    await (FontLoader(
      f.family,
    )..addFont(Future.value(ByteData.sublistView(bytes)))).load();
    return true;
  } catch (_) {
    return false;
  }
}

/// 检查是不是 Flutter 能用的字体文件（TrueType / OpenType / 字体集）。网页字体 WOFF / WOFF2 不能用
String? checkFontBytes(Uint8List b) {
  if (b.length < 12) return '文件太小，不是字体文件';
  final tag = String.fromCharCodes(b.sublist(0, 4));
  if (tag == 'wOFF' || tag == 'wOF2') {
    return '这是网页字体（WOFF / WOFF2），手机上不能直接使用；请导入 TTF 或 OTF 格式的字体文件';
  }
  final ok =
      (b[0] == 0 && b[1] == 1 && b[2] == 0 && b[3] == 0) ||
      tag == 'OTTO' ||
      tag == 'true' ||
      tag == 'ttcf';
  return ok ? null : '不是字体文件；请导入 TTF 或 OTF 格式的字体文件';
}

/// 把字体存进 App 的文档目录并注册，返回可以保存进外观的 [FontChoice]
Future<FontChoice> installFont(
  FontSlot slot,
  String name,
  Uint8List bytes,
) async {
  final err = checkFontBytes(bytes);
  if (err != null) throw FormatException(err);
  final dir = Directory(
    '${(await getApplicationDocumentsDirectory()).path}/fonts',
  );
  if (!await dir.exists()) await dir.create(recursive: true);
  final stamp = DateTime.now().millisecondsSinceEpoch;
  final file = File('${dir.path}/${slot.name}-$stamp.font');
  await file.writeAsBytes(bytes, flush: true);
  final f = FontChoice(
    name: name,
    path: file.path,
    family: 'Hiana${slot.name}$stamp',
  );
  if (!await registerFont(f)) {
    await file.delete();
    throw const FormatException('字体文件读不出来，请换一个文件');
  }
  return f;
}

/// 启动时读好的外观（main() 里赋值）；之后由 [lookProvider] 管
Look initialLook = const Look();

class LookNotifier extends Notifier<Look> {
  @override
  Look build() => initialLook;

  void _set(Look next) {
    final old = state;
    state = next;
    next.save();
    // 换掉的字体文件删掉，免得越存越多
    for (final slot in FontSlot.values) {
      final a = old.font(slot), b = next.font(slot);
      if (a != null && a.path != b?.path) {
        File(a.path).delete().catchError((_) => File(a.path));
      }
    }
  }

  void setPalette(String id) => _set(state.copyWith(paletteId: id));

  /// 导入的配色：加进列表并直接使用
  void addPalette(Palette p) =>
      _set(state.copyWith(customs: [...state.customs, p], paletteId: p.id));

  void removePalette(String id) => _set(
    state.copyWith(
      customs: state.customs.where((p) => p.id != id).toList(),
      paletteId: state.paletteId == id ? kDefaultPaletteId : null,
    ),
  );

  void setFont(FontSlot slot, FontChoice f) => _set(
    slot == FontSlot.sans ? state.copyWith(sans: f) : state.copyWith(mono: f),
  );

  void clearFont(FontSlot slot) => _set(
    slot == FontSlot.sans
        ? state.copyWith(clearSans: true)
        : state.copyWith(clearMono: true),
  );

  void setScale(double s) => _set(state.copyWith(textScale: s));
}

final lookProvider = NotifierProvider<LookNotifier, Look>(LookNotifier.new);
