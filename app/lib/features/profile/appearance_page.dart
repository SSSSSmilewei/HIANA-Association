import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../app/palettes.dart';
import '../../app/tokens.dart';
import '../../data/look.dart';
import '../../data/providers.dart';
import '../../widgets/kit.dart';
import '../../widgets/ui.dart';

/// 外观（对照网页的「外观」设置）：深浅、配色主题（网页的 13 套 + 导入的）、正文和代码字体、字号。
class AppearancePage extends ConsumerStatefulWidget {
  const AppearancePage({super.key});

  @override
  ConsumerState<AppearancePage> createState() => _AppearancePageState();
}

class _AppearancePageState extends ConsumerState<AppearancePage> {
  bool _importing = false; // 导入配色的面板
  final _paletteText = TextEditingController();
  String? _paletteError;
  FontSlot? _urlFor; // 从网址下载字体的面板
  final _fontUrl = TextEditingController();
  bool _busy = false;
  Palette? _removing;

  static const _modes = [
    (MiuixColorSchemeMode.light, '浅色'),
    (MiuixColorSchemeMode.dark, '深色'),
    (MiuixColorSchemeMode.system, '跟随系统'),
  ];

  @override
  void dispose() {
    _paletteText.dispose();
    _fontUrl.dispose();
    super.dispose();
  }

  LookNotifier get _look => ref.read(lookProvider.notifier);

  void _importPalette(String text, {String name = '自定义'}) {
    final p = parsePalette(
      text,
      id: 'custom-${DateTime.now().millisecondsSinceEpoch}',
      fallbackName: name,
    );
    if (p == null) {
      setState(
        () => _paletteError =
            '认不出这段配色。支持 HIANA JSON、base16 / base24、VS Code 颜色主题和 CSS 变量。',
      );
      return;
    }
    _look.addPalette(p);
    setState(() {
      _importing = false;
      _paletteError = null;
      _paletteText.clear();
    });
    showHxToast(context, '已导入并使用「${p.label}」');
  }

  Future<void> _pickPaletteFile() async {
    final r = await FilePicker.platform.pickFiles(withData: true);
    final f = r?.files.firstOrNull;
    if (f?.bytes == null) return;
    if (f!.bytes!.length > 1000000) {
      setState(() => _paletteError = '文件太大，配色文件一般只有几 KB');
      return;
    }
    _importPalette(
      utf8.decode(f.bytes!, allowMalformed: true),
      name: f.name.replaceAll(RegExp(r'\.[^.]+$'), ''),
    );
  }

  Future<void> _installFont(FontSlot slot, String name, Uint8List bytes) async {
    setState(() => _busy = true);
    try {
      final f = await installFont(slot, name, bytes);
      _look.setFont(slot, f);
      if (mounted) showHxToast(context, '已使用字体「$name」');
    } on FormatException catch (e) {
      if (mounted) showHxToast(context, e.message, error: true);
    } catch (e) {
      if (mounted) showHxToast(context, '导入失败：$e', error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickFont(FontSlot slot) async {
    final r = await FilePicker.platform.pickFiles(withData: true);
    final f = r?.files.firstOrNull;
    if (f?.bytes == null) return;
    await _installFont(slot, f!.name, f.bytes!);
  }

  Future<void> _downloadFont(FontSlot slot, String url) async {
    final u = Uri.tryParse(url.trim());
    if (u == null || u.scheme != 'https') {
      showHxToast(context, '请填写以 https:// 开头的字体文件地址', error: true);
      return;
    }
    setState(() => _urlFor = null);
    showHxToast(context, '正在下载字体');
    try {
      final res = await Dio().get<List<int>>(
        u.toString(),
        options: Options(
          responseType: ResponseType.bytes,
          receiveTimeout: const Duration(minutes: 2),
        ),
      );
      final name = u.pathSegments.isEmpty
          ? '字体'
          : Uri.decodeComponent(u.pathSegments.last);
      await _installFont(slot, name, Uint8List.fromList(res.data ?? const []));
    } on DioException catch (e) {
      if (mounted) {
        showHxToast(context, '下载失败：${e.message ?? e.type.name}', error: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final look = ref.watch(lookProvider);
    final mode = ref.watch(themeModeProvider);
    final dark = h.dark;
    return HianaPage(
      title: '外观',
      showBack: true,
      overlays: [
        MiuixOverlayBottomSheet(
          show: _importing,
          title: '导入配色',
          onDismissRequest: () => setState(() => _importing = false),
          content: Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  '支持 HIANA JSON（网页「导出配色」得到的）、base16 / base24、VS Code 颜色主题和 CSS 变量；只给一套颜色时深浅模式共用。',
                  style: TextStyle(fontSize: 13, height: 1.5, color: h.sub),
                ),
                const SizedBox(height: 12),
                MiuixTextField(
                  controller: _paletteText,
                  label: '粘贴配色内容',
                  minLines: 4,
                  maxLines: 8,
                ),
                if (_paletteError != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    _paletteError!,
                    style: TextStyle(fontSize: 13, color: h.badInk),
                  ),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: HxButton(
                        '从文件导入',
                        kind: HxButtonKind.soft,
                        onTap: _pickPaletteFile,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: HxButton(
                        '导入',
                        onTap: () => _importPalette(_paletteText.text),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        MiuixOverlayBottomSheet(
          show: _urlFor != null,
          title: '从网址下载字体',
          onDismissRequest: () => setState(() => _urlFor = null),
          content: Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  '填写 TTF 或 OTF 字体文件的地址（https://）。网页用的 WOFF / WOFF2 和 CSS 地址在手机上不能用。',
                  style: TextStyle(fontSize: 13, height: 1.5, color: h.sub),
                ),
                const SizedBox(height: 12),
                MiuixTextField(
                  controller: _fontUrl,
                  label: '字体文件地址',
                  singleLine: true,
                  keyboardType: TextInputType.url,
                ),
                const SizedBox(height: 12),
                HxButton(
                  '下载并使用',
                  onTap: () => _downloadFont(_urlFor!, _fontUrl.text),
                ),
              ],
            ),
          ),
        ),
        ConfirmDialog(
          show: _removing != null,
          title: '删除配色「${_removing?.label ?? ''}」？',
          okText: '删除',
          onCancel: () => setState(() => _removing = null),
          onOk: () {
            _look.removePalette(_removing!.id);
            setState(() => _removing = null);
          },
        ),
      ],
      children: [
        const SectionHead('深浅'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: HxSeg<MiuixColorSchemeMode>(
            options: _modes,
            value: _modes.any((m) => m.$1 == mode)
                ? mode
                : MiuixColorSchemeMode.system,
            onChanged: (m) => ref.read(themeModeProvider.notifier).set(m),
          ),
        ),
        SectionHead(
          '配色',
          trailing: Pressable(
            onTap: () => setState(() {
              _paletteError = null;
              _importing = true;
            }),
            child: Text(
              '导入配色',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: h.accentText,
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: LayoutBuilder(
            builder: (context, box) {
              final w = (box.maxWidth - 20) / 3;
              return Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final p in look.all)
                    SizedBox(
                      width: w,
                      child: _PaletteTile(
                        p: p,
                        dark: dark,
                        on: p.id == look.palette.id,
                        onTap: () => _look.setPalette(p.id),
                        onLongPress: p.custom
                            ? () => setState(() => _removing = p)
                            : null,
                      ),
                    ),
                ],
              );
            },
          ),
        ),
        RowGroup(
          children: [
            ListRow(
              title: '复制当前配色',
              subtitle: '导出成 HIANA JSON，可以在网页的外观设置里导入',
              onTap: () {
                Clipboard.setData(
                  ClipboardData(text: look.palette.exportJson()),
                );
                showHxToast(context, '配色已复制');
              },
            ),
          ],
        ),
        const FootNote('长按导入的配色可以删除。默认配色是 shanmoew-mizu，与网页一致。'),
        const SectionHead('字体'),
        RowGroup(
          children: [
            for (final (slot, label) in const [
              (FontSlot.sans, '正文字体'),
              (FontSlot.mono, '代码字体'),
            ])
              _FontRow(
                label: label,
                font: look.font(slot),
                busy: _busy,
                onFile: () => _pickFont(slot),
                onUrl: () => setState(() {
                  _fontUrl.clear();
                  _urlFor = slot;
                }),
                onReset: () => _look.clearFont(slot),
              ),
          ],
        ),
        const SectionHead('字号'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: HxSeg<double>(
            options: kTextScales,
            value: look.textScale,
            onChanged: _look.setScale,
          ),
        ),
        const SectionHead('预览'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: HxCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  '海纳百川，有容乃大',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: h.ink,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '正文示例：CS50x 是协会全体成员的第一门课程。',
                  style: TextStyle(fontSize: 15, color: h.sub),
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: h.well,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    'print("hello, world")',
                    style: TextStyle(
                      fontSize: 13,
                      fontFamily: h.mono,
                      color: h.ink,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const StateTag('标签', tone: 'accent'),
                    const SizedBox(width: 8),
                    const StateTag('已完成', tone: 'ok'),
                    const Spacer(),
                    HxButton('主按钮', height: 38, onTap: () {}),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    for (var i = 0; i < 4; i++)
                      Container(
                        width: 22,
                        height: 22,
                        margin: const EdgeInsets.only(right: 4),
                        decoration: BoxDecoration(
                          color: h.heat[i],
                          borderRadius: BorderRadius.circular(5),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _PaletteTile extends StatelessWidget {
  const _PaletteTile({
    required this.p,
    required this.dark,
    required this.on,
    required this.onTap,
    this.onLongPress,
  });
  final Palette p;
  final bool dark;
  final bool on;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final b = p.base(dark);
    return GestureDetector(
      onLongPress: onLongPress,
      child: Pressable(
        onTap: onTap,
        semanticLabel: '配色 ${p.label}${on ? '，正在使用' : ''}',
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: on ? h.accent : h.line, width: 2),
            color: on ? h.well : null,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 色块预览：底色、表面、文字、强调色（和网页的 Swatch 一样）
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: SizedBox(
                  height: 48,
                  child: Stack(
                    children: [
                      Positioned.fill(child: ColoredBox(color: b.bg)),
                      Positioned(
                        left: 6,
                        top: 6,
                        child: Container(width: 26, height: 4, color: b.ink),
                      ),
                      Positioned(
                        left: 6,
                        right: 6,
                        bottom: 6,
                        height: 16,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: b.surface,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                      Positioned(
                        right: 10,
                        bottom: 10,
                        child: Container(
                          width: 18,
                          height: 8,
                          decoration: BoxDecoration(
                            color: b.accent,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                p.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: on ? FontWeight.w700 : FontWeight.w500,
                  color: h.ink,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FontRow extends StatelessWidget {
  const _FontRow({
    required this.label,
    required this.font,
    required this.busy,
    required this.onFile,
    required this.onUrl,
    required this.onReset,
  });
  final String label;
  final FontChoice? font;
  final bool busy;
  final VoidCallback onFile;
  final VoidCallback onUrl;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: h.ink,
            ),
          ),
          Text(
            font?.name ?? '系统默认',
            style: TextStyle(
              fontSize: 13,
              color: h.sub,
              fontFamily: font?.family,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: HxButton(
                  '从文件导入',
                  kind: HxButtonKind.soft,
                  height: 36,
                  enabled: !busy,
                  onTap: onFile,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: HxButton(
                  '从网址下载',
                  kind: HxButtonKind.soft,
                  height: 36,
                  enabled: !busy,
                  onTap: onUrl,
                ),
              ),
              if (font != null) ...[
                const SizedBox(width: 8),
                Expanded(
                  child: HxButton(
                    '恢复默认',
                    kind: HxButtonKind.quiet,
                    height: 36,
                    onTap: onReset,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
