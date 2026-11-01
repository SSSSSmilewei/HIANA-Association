import 'dart:convert';
import 'dart:ui' as ui;

import 'package:flutter/widgets.dart';

import '../../app/hiana_page.dart';
import '../../app/tokens.dart';
import '../../widgets/ui.dart';

/// 签到时的手写签名：拍完照接着签。返回白底黑字 PNG 的 base64；返回 null 表示没签就退出了。
/// 签名会和照片一起出现在给学校的签到表里（网站 /admin/report）。
class SignaturePage extends StatefulWidget {
  const SignaturePage({super.key, required this.title});
  final String title;

  @override
  State<SignaturePage> createState() => _SignaturePageState();
}

class _SignaturePageState extends State<SignaturePage> {
  final _strokes = <List<Offset>>[];
  Size _size = Size.zero;
  double _ink = 0;
  bool _busy = false;

  void _start(Offset p) => setState(() => _strokes.add([p]));

  void _move(Offset p) {
    if (_strokes.isEmpty) return;
    final s = _strokes.last;
    _ink += (p - s.last).distance;
    setState(() => s.add(p));
  }

  Future<void> _done() async {
    if (_ink < 40) {
      showHxToast(context, '签名太短了，写一下你的名字', error: true);
      return;
    }
    setState(() => _busy = true);
    const scale = 2.0;
    final rec = ui.PictureRecorder();
    final canvas = Canvas(rec)..scale(scale);
    canvas.drawRect(
      Offset.zero & _size,
      Paint()..color = const Color(0xFFFFFFFF),
    );
    _InkPainter(_strokes).paint(canvas, _size);
    final img = await rec.endRecording().toImage(
      (_size.width * scale).round(),
      (_size.height * scale).round(),
    );
    final bytes = await img.toByteData(format: ui.ImageByteFormat.png);
    if (!mounted) return;
    if (bytes == null) {
      setState(() => _busy = false);
      showHxToast(context, '签名保存失败，再试一次', error: true);
      return;
    }
    Navigator.of(context).pop(base64Encode(bytes.buffer.asUint8List()));
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return HianaPage(
      title: widget.title,
      showBack: true,
      collapsible: false,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
          child: Text(
            '在框里写下你的名字。签名会和照片一起出现在给学校的签到表里。',
            style: TextStyle(fontSize: 14, height: 1.5, color: h.sub),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: AspectRatio(
            aspectRatio: 2,
            child: LayoutBuilder(
              builder: (context, c) {
                _size = Size(c.maxWidth, c.maxHeight);
                return ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  // 用原始指针事件画线；再占住竖向拖动，免得写竖笔画时页面跟着滚
                  child: GestureDetector(
                    onVerticalDragUpdate: (_) {},
                    child: Listener(
                      onPointerDown: (e) => _start(e.localPosition),
                      onPointerMove: (e) => _move(e.localPosition),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFFFF),
                          border: Border.all(color: h.line, width: 1.5),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: CustomPaint(
                          painter: _InkPainter(_strokes),
                          size: Size.infinite,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 16, 12, 24),
          child: Row(
            children: [
              Expanded(
                child: HxButton(
                  '重写',
                  kind: HxButtonKind.ghost,
                  enabled: !_busy,
                  onTap: () => setState(() {
                    _strokes.clear();
                    _ink = 0;
                  }),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: HxButton('签好了，签到', busy: _busy, onTap: _done),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _InkPainter extends CustomPainter {
  _InkPainter(this.strokes);
  final List<List<Offset>> strokes;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF1B1A19)
      ..strokeWidth = 2.6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    for (final s in strokes) {
      if (s.length == 1) {
        canvas.drawCircle(s.first, 1.3, paint..style = PaintingStyle.fill);
        paint.style = PaintingStyle.stroke;
        continue;
      }
      final path = Path()..moveTo(s.first.dx, s.first.dy);
      for (final p in s.skip(1)) {
        path.lineTo(p.dx, p.dy);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_InkPainter old) => true;
}
