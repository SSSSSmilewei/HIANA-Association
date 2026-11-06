import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';
import 'package:markdown/markdown.dart' as md;

import '../app/tokens.dart';
import '../data/pins.dart';

/// 讲义里一个能钉问题的内容块（和网页 components/Pins.tsx 的 tagAnchors 用同一套规则）：
/// 小标题用它的锚点 id，正文段落是“小标题/第几段”，列表按每一条算。
class PinAnchor {
  const PinAnchor({
    required this.key,
    required this.label,
    required this.snippet,
  });
  final String key;
  final String label;

  /// 这一段开头的文字（讲义改版后网页按它重新找位置）
  final String snippet;
}

/// 讲义上的蓝色钉子：长按一段钉问题，已有的钉子在段落右侧显示蓝点。
class PinLayer {
  const PinLayer({
    required this.pins,
    required this.onLongPress,
    required this.onOpen,
  });
  final List<Pin> pins;
  final void Function(PinAnchor anchor) onLongPress;
  final void Function(Pin pin) onOpen;
}

/// 标题锚点：保留中文，去掉标点（与 src/client/markdown.ts 的 headingId 一致）
String headingId(String text) {
  final id = text
      .toLowerCase()
      .replaceAll(RegExp(r'<[^>]+>'), '')
      .replaceAll(RegExp(r'&[a-z]+;'), '')
      .replaceAll(RegExp(r'[^\p{L}\p{N}\s_-]', unicode: true), '')
      .trim()
      .replaceAll(RegExp(r'\s+'), '-');
  return id.isEmpty ? 'section' : id;
}

/// 公告正文（与网页 components/NoticeBody.tsx 一致）：单独占一行的 `![说明](https://…)` 显示成图片，
/// 其余按纯文本原样显示（保留换行，不解析 Markdown）。
final _imgLine = RegExp(r'^!\[([^\]]*)\]\((https://[^)\s]+)\)$');

/// 不含图片的纯文字（折叠预览用，对应网页的 plainBody）
String plainText(String text) => text
    .split('\n')
    .where((l) => !_imgLine.hasMatch(l.trim()))
    .join('\n')
    .trim();

class NoticeBody extends StatelessWidget {
  const NoticeBody(this.text, {super.key, this.style});
  final String text;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final parts = <Widget>[];
    var buf = <String>[];
    void flush() {
      if (buf.isNotEmpty) {
        parts.add(
          Text(
            buf.join('\n'),
            style: style ?? TextStyle(fontSize: 14, height: 1.6, color: h.ink),
          ),
        );
      }
      buf = [];
    }

    for (final line in text.split('\n')) {
      final m = _imgLine.firstMatch(line.trim());
      if (m != null) {
        flush();
        parts.add(
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                m[2]!,
                cacheWidth: _screenPx(),
                fit: BoxFit.contain,
                semanticLabel: m[1],
                errorBuilder: (_, _, _) => Text(
                  '[图片：${m[1]}]',
                  style: TextStyle(fontSize: 13, color: h.sub),
                ),
              ),
            ),
          ),
        );
      } else {
        buf.add(line);
      }
    }
    flush();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: parts,
    );
  }
}

/// 图片按屏幕宽度解码：原图常有两三千像素宽，整张解码既占内存又让滑动卡顿
int _screenPx() {
  final views = WidgetsBinding.instance.platformDispatcher.views;
  return views.isEmpty ? 1080 : views.first.physicalSize.width.round();
}

String _norm(String s) => s.replaceAll(RegExp(r'\s+'), ' ').trim();

/// 讲义正文：把 Markdown 画成 widgets（不用 Material）。支持标题、段落、列表、代码块、引用、表格、图片、链接。
/// 原文里的 HTML 只认 `<details>` / `<summary>`（变成加粗的小标题）和视频注释，其余标签去掉、保留文字。
class MarkdownView extends StatelessWidget {
  const MarkdownView({
    super.key,
    required this.source,
    required this.onLink,
    this.pins,
  });
  final String source;

  /// 传了就能在段落上长按钉问题，并显示已有的钉子
  final PinLayer? pins;

  /// 点链接：站内地址（/courses/…）和外部网址都交给页面处理
  final void Function(String href) onLink;

  static String _prepare(String src) {
    return src
        .replaceAllMapped(
          RegExp(r'<!-- video: ([\w-]+) -->\s*(?:\[▶ 视频\]\([^)]*\)\s*)?'),
          (m) => '[▶ YouTube 视频](https://www.youtube.com/watch?v=${m[1]})\n\n',
        )
        .replaceAll(RegExp(r'<!--[\s\S]*?-->'), '')
        .replaceAll(RegExp(r'<div class="figure">[\s\S]*?</div>'), '')
        .replaceAll(RegExp(r'<(video|iframe)[\s\S]*?</\1>'), '')
        .replaceAllMapped(
          RegExp(r'<details[^>]*>\s*<summary>([\s\S]*?)</summary>'),
          (m) => '\n\n**▸ ${m[1]!.trim()}**\n\n',
        )
        .replaceAll(RegExp(r'</details>'), '\n')
        .replaceAll(RegExp(r'<br\s*/?>'), '  \n')
        .replaceAll(
          RegExp(r'</?(kbd|sup|sub|span|div|p|ul|li|strong|em|code|a)[^>]*>'),
          '',
        );
  }

  /// 解析结果按原文缓存：讲义页每次重建（钉子加载完、标记完成）都不用重新解析整篇
  static final _parsed = <String, List<md.Node>>{};

  static List<md.Node> _parse(String source) {
    final hit = _parsed.remove(source);
    if (hit != null) return _parsed[source] = hit; // 移到最近使用
    final nodes = md.Document(
      extensionSet: md.ExtensionSet.gitHubFlavored,
      encodeHtml: false,
    ).parseLines(_prepare(source).split('\n'));
    _parsed[source] = nodes;
    if (_parsed.length > 12) _parsed.remove(_parsed.keys.first);
    return nodes;
  }

  /// 一块一块的内容，给长讲义直接放进页面的列表里：列表只构建屏幕上看得到的几块，
  /// 打开长讲义和滑动都不用一次排版整篇（整篇放进一个 Column 是讲义页掉帧的主要原因）。
  /// [padding] 包在每一块外面。
  List<Widget> blocks(
    BuildContext context, {
    EdgeInsets padding = EdgeInsets.zero,
  }) {
    final nodes = _parse(source);
    final r = _Renderer(Hx.of(context), onLink);
    final layer = pins;
    final list = layer == null
        ? r.blocks(nodes)
        : _pinnable(context, r, nodes, layer);
    return [for (final w in list) Padding(padding: padding, child: w)];
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: blocks(context),
  );

  /// 按网页的规则给顶层内容块编位置，每块包一层长按和钉子标记
  List<Widget> _pinnable(
    BuildContext context,
    _Renderer r,
    List<md.Node> nodes,
    PinLayer layer,
  ) {
    final out = <Widget>[];
    final ids = <String, int>{};
    var heading = 'top';
    var headingText = '开头';
    var n = 0;
    final blocks = <(PinAnchor, Widget)>[];

    PinAnchor para(String text) {
      n++;
      return PinAnchor(
        key: '$heading/$n',
        label: '$headingText 第 $n 段',
        snippet: _norm(text).length > 80
            ? _norm(text).substring(0, 80)
            : _norm(text),
      );
    }

    for (final node in nodes) {
      if (node is md.Element && RegExp(r'^h[1-6]$').hasMatch(node.tag)) {
        final text = node.textContent;
        var id = headingId(text);
        final k = ids[id] ?? 0;
        ids[id] = k + 1;
        if (k > 0) id = '$id-$k';
        final w = r.block(node);
        if (int.parse(node.tag.substring(1)) <= 4) {
          heading = id;
          final t = _norm(text);
          headingText = t.isEmpty
              ? '小标题'
              : (t.length > 20 ? t.substring(0, 20) : t);
          n = 0;
          if (w != null) {
            blocks.add((PinAnchor(key: id, label: headingText, snippet: t), w));
          }
        } else if (w != null) {
          blocks.add((para(text), w));
        }
        continue;
      }
      if (node is md.Element && (node.tag == 'ul' || node.tag == 'ol')) {
        // 列表按每一条算：拆成一条一条的小列表，编号接着原来的
        final items = (node.children ?? const <md.Node>[])
            .whereType<md.Element>()
            .where((x) => x.tag == 'li')
            .toList();
        final start = int.tryParse(node.attributes['start'] ?? '') ?? 1;
        for (var i = 0; i < items.length; i++) {
          final one = md.Element(node.tag, [items[i]]);
          if (node.tag == 'ol') one.attributes['start'] = '${start + i}';
          final w = r.list(one, ordered: node.tag == 'ol', depth: 0);
          blocks.add((
            para(items[i].textContent),
            Padding(
              padding: EdgeInsets.only(bottom: i == items.length - 1 ? 12 : 0),
              child: w,
            ),
          ));
        }
        continue;
      }
      final w = r.block(node);
      if (w == null) continue;
      blocks.add((para(node.textContent), w));
    }

    // 钉子归到块上：先按位置标记，开头文字对不上时按文字重新找
    final byBlock = <int, List<Pin>>{};
    for (final p in layer.pins) {
      var at = blocks.indexWhere((b) => b.$1.key == p.anchorKey);
      final head = _norm(p.snippet ?? '');
      final h24 = head.length > 24 ? head.substring(0, 24) : head;
      if (at >= 0 && h24.isNotEmpty) {
        final t = blocks[at].$1.snippet;
        if (!t.startsWith(h24.length > 16 ? h24.substring(0, 16) : h24))
          at = -1;
      }
      if (at < 0 && h24.isNotEmpty) {
        at = blocks.indexWhere((b) => b.$1.snippet.contains(h24));
      }
      if (at < 0) continue; // 原文已变：只在页面底部的列表里
      (byBlock[at] ??= []).add(p);
    }

    for (var i = 0; i < blocks.length; i++) {
      out.add(
        _PinBlock(
          anchor: blocks[i].$1,
          pins: byBlock[i] ?? const [],
          layer: layer,
          child: blocks[i].$2,
        ),
      );
    }
    return out;
  }
}

class _Renderer {
  _Renderer(this.h, this.onLink);
  final Hx h;
  final void Function(String) onLink;

  TextStyle get _body => TextStyle(fontSize: 15.5, height: 1.75, color: h.ink);
  static const _mono = ['Sarasa Mono SC', 'monospace']; // 导入的代码字体缺字时的后备

  List<Widget> blocks(List<md.Node> nodes, {int depth = 0}) {
    final out = <Widget>[];
    for (final n in nodes) {
      final w = block(n, depth: depth);
      if (w != null) out.add(w);
    }
    return out;
  }

  Widget? block(md.Node n, {int depth = 0}) {
    if (n is md.Text) {
      final t = n.text.trim();
      if (t.isEmpty) return null;
      return _gap(Text(t, style: _body));
    }
    if (n is! md.Element) return null;
    switch (n.tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        final size = const {
          'h1': 24.0,
          'h2': 20.0,
          'h3': 17.5,
          'h4': 16.0,
          'h5': 15.0,
          'h6': 15.0,
        }[n.tag]!;
        return Padding(
          padding: EdgeInsets.only(
            top: n.tag == 'h1' || n.tag == 'h2' ? 22 : 16,
            bottom: 8,
          ),
          child: Text.rich(
            TextSpan(
              children: inline(
                n.children ?? const [],
                TextStyle(
                  fontSize: size,
                  height: 1.4,
                  fontWeight: FontWeight.w700,
                  color: h.ink,
                ),
              ),
            ),
          ),
        );
      case 'p':
        return paragraph(n);
      case 'ul':
      case 'ol':
        return _gap(list(n, ordered: n.tag == 'ol', depth: depth));
      case 'pre':
        final code =
            n.children?.isNotEmpty == true && n.children!.first is md.Element
            ? (n.children!.first as md.Element).textContent
            : n.textContent;
        return _gap(
          Container(
            decoration: BoxDecoration(
              color: h.well,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: h.line),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.all(12),
              child: Text(
                code.replaceAll(RegExp(r'\n$'), ''),
                style: TextStyle(
                  fontSize: 13,
                  height: 1.55,
                  color: h.ink,
                  fontFamily: h.mono,
                  fontFamilyFallback: _mono,
                ),
              ),
            ),
          ),
        );
      case 'blockquote':
        return _gap(
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
            decoration: BoxDecoration(
              color: h.well,
              border: Border(left: BorderSide(color: h.accent, width: 3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: blocks(n.children ?? const [], depth: depth),
            ),
          ),
        );
      case 'hr':
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Container(height: 1, color: h.line),
        );
      case 'table':
        return _gap(table(n));
      case 'img':
        return _gap(image(n));
      default:
        final kids = blocks(n.children ?? const [], depth: depth);
        if (kids.isEmpty) return null;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: kids,
        );
    }
  }

  Widget _gap(Widget w) =>
      Padding(padding: const EdgeInsets.only(bottom: 12), child: w);

  /// 段落：里面的图片单独成块，其余合成一段富文本
  Widget? paragraph(md.Element p) {
    final parts = <Widget>[];
    var run = <md.Node>[];
    void flush() {
      if (run.isEmpty) return;
      final spans = inline(run, _body);
      if (spans.isNotEmpty) parts.add(Text.rich(TextSpan(children: spans)));
      run = [];
    }

    for (final c in p.children ?? const <md.Node>[]) {
      if (c is md.Element && c.tag == 'img') {
        flush();
        parts.add(image(c));
      } else {
        run.add(c);
      }
    }
    flush();
    if (parts.isEmpty) return null;
    return _gap(
      parts.length == 1
          ? parts.first
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: parts,
            ),
    );
  }

  Widget image(md.Element e) {
    final src = e.attributes['src'] ?? '';
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Image.network(
        src,
        cacheWidth: _screenPx(),
        fit: BoxFit.contain,
        errorBuilder: (_, _, _) => Text(
          '[图片：${e.attributes['alt'] ?? ''}]',
          style: TextStyle(fontSize: 13, color: h.sub),
        ),
      ),
    );
  }

  Widget list(md.Element e, {required bool ordered, required int depth}) {
    final items = (e.children ?? const <md.Node>[])
        .whereType<md.Element>()
        .where((x) => x.tag == 'li')
        .toList();
    final start = int.tryParse(e.attributes['start'] ?? '') ?? 1;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < items.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: ordered ? 26 : 18,
                  child: Text(
                    ordered ? '${start + i}.' : (depth.isEven ? '•' : '◦'),
                    style: _body.copyWith(color: h.sub),
                  ),
                ),
                Expanded(child: listItem(items[i], depth)),
              ],
            ),
          ),
      ],
    );
  }

  Widget listItem(md.Element li, int depth) {
    final kids = li.children ?? const <md.Node>[];
    final hasBlock = kids.any(
      (k) =>
          k is md.Element &&
          const {'p', 'ul', 'ol', 'pre', 'blockquote', 'table'}.contains(k.tag),
    );
    if (!hasBlock) return Text.rich(TextSpan(children: inline(kids, _body)));
    final out = <Widget>[];
    var run = <md.Node>[];
    void flush() {
      if (run.isNotEmpty) {
        out.add(Text.rich(TextSpan(children: inline(run, _body))));
      }
      run = [];
    }

    for (final k in kids) {
      if (k is md.Element &&
          const {
            'p',
            'ul',
            'ol',
            'pre',
            'blockquote',
            'table',
          }.contains(k.tag)) {
        flush();
        final w = k.tag == 'p' ? paragraph(k) : block(k, depth: depth + 1);
        if (w != null) out.add(w);
      } else {
        run.add(k);
      }
    }
    flush();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: out,
    );
  }

  Widget table(md.Element t) {
    final rows = <List<md.Element>>[];
    void walk(md.Node n) {
      if (n is! md.Element) return;
      if (n.tag == 'tr') {
        rows.add(
          (n.children ?? const <md.Node>[]).whereType<md.Element>().toList(),
        );
      } else {
        for (final c in n.children ?? const <md.Node>[]) {
          walk(c);
        }
      }
    }

    walk(t);
    if (rows.isEmpty) return const SizedBox.shrink();
    final width = rows.map((r) => r.length).reduce((a, b) => a > b ? a : b);
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Table(
        defaultColumnWidth: const IntrinsicColumnWidth(),
        border: TableBorder.all(color: h.line),
        children: [
          for (var i = 0; i < rows.length; i++)
            TableRow(
              decoration: i == 0 ? BoxDecoration(color: h.well) : null,
              children: [
                for (var j = 0; j < width; j++)
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 260),
                      child: j < rows[i].length
                          ? Text.rich(
                              TextSpan(
                                children: inline(
                                  rows[i][j].children ?? const [],
                                  TextStyle(
                                    fontSize: 13.5,
                                    height: 1.5,
                                    color: h.ink,
                                    fontWeight: i == 0
                                        ? FontWeight.w600
                                        : FontWeight.w400,
                                  ),
                                ),
                              ),
                            )
                          : const SizedBox.shrink(),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }

  List<InlineSpan> inline(List<md.Node> nodes, TextStyle style) {
    final out = <InlineSpan>[];
    for (final n in nodes) {
      if (n is md.Text) {
        out.add(TextSpan(text: _unescape(n.text), style: style));
        continue;
      }
      if (n is! md.Element) continue;
      final kids = n.children ?? const <md.Node>[];
      switch (n.tag) {
        case 'strong':
          out.addAll(inline(kids, style.copyWith(fontWeight: FontWeight.w700)));
        case 'em':
          out.addAll(inline(kids, style.copyWith(fontStyle: FontStyle.italic)));
        case 'del':
          out.addAll(
            inline(
              kids,
              style.copyWith(decoration: TextDecoration.lineThrough),
            ),
          );
        case 'code':
          out.add(
            TextSpan(
              text: _unescape(n.textContent),
              style: style.copyWith(
                fontFamily: h.mono,
                fontFamilyFallback: _mono,
                fontSize: (style.fontSize ?? 15) * 0.9,
                backgroundColor: h.well,
              ),
            ),
          );
        case 'br':
          out.add(TextSpan(text: '\n', style: style));
        case 'a':
          final href = n.attributes['href'] ?? '';
          out.addAll(
            inline(
              kids,
              style.copyWith(
                color: h.accentText,
                decoration: TextDecoration.underline,
                decorationColor: h.accentText.withValues(alpha: 0.4),
              ),
            ).map((s) {
              if (s is TextSpan) {
                return TextSpan(
                  text: s.text,
                  style: s.style,
                  children: s.children,
                  recognizer: TapGestureRecognizer()
                    ..onTap = () => onLink(href),
                );
              }
              return s;
            }),
          );
        case 'img':
          out.add(
            TextSpan(
              text: '[${n.attributes['alt'] ?? '图片'}]',
              style: style.copyWith(color: h.sub),
            ),
          );
        default:
          out.addAll(inline(kids, style));
      }
    }
    return out;
  }

  static String _unescape(String s) => s
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&#39;', "'")
      .replaceAll('&amp;', '&');
}

class _PinBlock extends StatelessWidget {
  const _PinBlock({
    required this.anchor,
    required this.pins,
    required this.layer,
    required this.child,
  });
  final PinAnchor anchor;
  final List<Pin> pins;
  final PinLayer layer;
  final Widget child;

  static const _blue = Color(0xFF2563EB);

  @override
  Widget build(BuildContext context) {
    final body = GestureDetector(
      behavior: HitTestBehavior.translucent,
      onLongPress: () => layer.onLongPress(anchor),
      child: child,
    );
    if (pins.isEmpty) return body;
    final open = pins.where((p) => !p.resolved).length;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Padding(padding: const EdgeInsets.only(right: 22), child: body),
        Positioned(
          right: -6,
          top: 2,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => layer.onOpen(pins.first),
            child: Semantics(
              button: true,
              label: '这一段有 ${pins.length} 个钉子',
              child: Container(
                width: 26,
                height: 26,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: open > 0 ? _blue : const Color(0xFF9CA3AF),
                  border: Border.all(color: const Color(0xFFFFFFFF), width: 2),
                ),
                child: Text(
                  '${pins.length}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFFFFFFFF),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
