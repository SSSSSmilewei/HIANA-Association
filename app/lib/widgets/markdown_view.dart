import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';
import 'package:markdown/markdown.dart' as md;

import '../app/tokens.dart';

/// 讲义正文：把 Markdown 画成 widgets（不用 Material）。支持标题、段落、列表、代码块、引用、表格、图片、链接。
/// 原文里的 HTML 只认 `<details>` / `<summary>`（变成加粗的小标题）和视频注释，其余标签去掉、保留文字。
class MarkdownView extends StatelessWidget {
  const MarkdownView({super.key, required this.source, required this.onLink});
  final String source;

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

  @override
  Widget build(BuildContext context) {
    final doc = md.Document(
      extensionSet: md.ExtensionSet.gitHubFlavored,
      encodeHtml: false,
    );
    final nodes = doc.parseLines(_prepare(source).split('\n'));
    final r = _Renderer(Hx.of(context), onLink);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: r.blocks(nodes),
    );
  }
}

class _Renderer {
  _Renderer(this.h, this.onLink);
  final Hx h;
  final void Function(String) onLink;

  TextStyle get _body => TextStyle(fontSize: 15.5, height: 1.75, color: h.ink);
  static const _mono = ['Sarasa Mono SC', 'monospace'];

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
                  fontFamily: 'monospace',
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
                fontFamily: 'monospace',
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
