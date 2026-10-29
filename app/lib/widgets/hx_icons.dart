import 'dart:math' as math;

import 'package:flutter/widgets.dart';

/// 线条图标，和网页端 src/client/icons.tsx 同一套（24×24 网格，1.8 线宽）。
/// 自己画是因为 App 不用 Material 图标，miuix 的图标里也没有相机、喇叭这些。
enum HxIcon {
  home,
  book,
  camera,
  megaphone,
  user,
  check,
  arrowRight,
  back,
  close,
  play,
  terminal,
  pencil,
  flag,
  star,
  external,
  flip,
  bell,
  key,
  logout,
  plus,
  sun,
  video,
  code,
  pin,
}

class HxIconView extends StatelessWidget {
  const HxIconView(
    this.icon, {
    super.key,
    this.size = 22,
    this.color,
    this.stroke = 1.8,
    this.semanticLabel,
  });
  final HxIcon icon;
  final double size;
  final Color? color;
  final double stroke;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final c =
        color ??
        DefaultTextStyle.of(context).style.color ??
        const Color(0xFF1B1A19);
    final paint = CustomPaint(
      size: Size.square(size),
      painter: _IconPainter(icon, c, stroke),
    );
    if (semanticLabel == null) return ExcludeSemantics(child: paint);
    return Semantics(label: semanticLabel, child: paint);
  }
}

class _IconPainter extends CustomPainter {
  _IconPainter(this.icon, this.color, this.stroke);
  final HxIcon icon;
  final Color color;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 24);
    final p = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final fill = Paint()..color = color;
    final path = Path();
    void line(List<double> pts) {
      path.moveTo(pts[0], pts[1]);
      for (var i = 2; i < pts.length; i += 2) {
        path.lineTo(pts[i], pts[i + 1]);
      }
    }

    void circle(double cx, double cy, double r) =>
        path.addOval(Rect.fromCircle(center: Offset(cx, cy), radius: r));
    switch (icon) {
      case HxIcon.home:
        line([
          4,
          10.5,
          12,
          4,
          20,
          10.5,
          20,
          19,
          19,
          20,
          14.5,
          20,
          14.5,
          14.5,
          9.5,
          14.5,
          9.5,
          20,
          5,
          20,
          4,
          19,
        ]);
        path.close();
      case HxIcon.book:
        path.moveTo(4, 6.5);
        path.cubicTo(6.8, 5.5, 9.5, 5.5, 12, 7.3);
        path.cubicTo(14.5, 5.5, 17.2, 5.5, 20, 6.5);
        path.lineTo(20, 17.5);
        path.cubicTo(17.2, 16.5, 14.5, 16.5, 12, 18.3);
        path.cubicTo(9.5, 16.5, 6.8, 16.5, 4, 17.5);
        path.close();
        line([12, 7.3, 12, 18.3]);
      case HxIcon.camera:
        path.addRRect(
          RRect.fromLTRBR(4, 7, 20, 19, const Radius.circular(1.8)),
        );
        line([7.7, 7, 9.2, 5, 14.8, 5, 16.3, 7]);
        circle(12, 12.8, 3.4);
      case HxIcon.megaphone:
        line([4, 10, 4, 14, 7, 14, 15, 18.5, 15, 5.5, 7, 10]);
        path.close();
        path.moveTo(18, 9.2);
        path.quadraticBezierTo(20.6, 12, 18, 14.8);
      case HxIcon.user:
        circle(12, 8.5, 3.5);
        path.moveTo(5, 19.5);
        path.cubicTo(6.3, 16.5, 8.9, 15, 12, 15);
        path.cubicTo(15.1, 15, 17.7, 16.5, 19, 19.5);
      case HxIcon.check:
        line([5, 12.5, 9.5, 17, 19, 7.5]);
      case HxIcon.arrowRight:
        line([5, 12, 19, 12]);
        line([13, 6, 19, 12, 13, 18]);
      case HxIcon.back:
        line([15, 5, 8, 12, 15, 19]);
      case HxIcon.close:
        line([6, 6, 18, 18]);
        line([18, 6, 6, 18]);
      case HxIcon.play:
        final t = Path()
          ..moveTo(8, 6.5)
          ..lineTo(8, 17.5)
          ..lineTo(17, 12)
          ..close();
        canvas.drawPath(t, fill);
      case HxIcon.terminal:
        line([5, 8, 9, 12, 5, 16]);
        line([11.5, 16.5, 19, 16.5]);
      case HxIcon.pencil:
        line([4, 20, 8, 20, 18.5, 9.5, 14.5, 5.5, 4, 16]);
        path.close();
        line([12.5, 7.5, 16.5, 11.5]);
      case HxIcon.flag:
        line([6, 21, 6, 4]);
        line([6, 4, 17, 4, 15, 8, 17, 12, 6, 12]);
      case HxIcon.star:
        final pts = <double>[];
        for (var i = 0; i < 10; i++) {
          final r = i.isEven ? 8.5 : 3.8;
          final a = -math.pi / 2 + i * math.pi / 5;
          pts
            ..add(12 + r * math.cos(a))
            ..add(12.6 + r * math.sin(a));
        }
        line(pts);
        path.close();
      case HxIcon.external:
        line([8, 16, 16, 8]);
        line([10, 8, 16, 8, 16, 14]);
      case HxIcon.flip:
        path.moveTo(4, 9);
        path.arcToPoint(
          const Offset(18.5, 6),
          radius: const Radius.circular(8),
        );
        path.moveTo(20, 15);
        path.arcToPoint(
          const Offset(5.5, 18),
          radius: const Radius.circular(8),
        );
        line([18.5, 2.5, 18.5, 6, 15, 6]);
        line([5.5, 21.5, 5.5, 18, 9, 18]);
      case HxIcon.bell:
        path.moveTo(6, 16.5);
        path.lineTo(6, 11);
        path.arcToPoint(const Offset(18, 11), radius: const Radius.circular(6));
        path.lineTo(18, 16.5);
        path.lineTo(19.5, 18);
        path.lineTo(4.5, 18);
        path.close();
        path.moveTo(10, 20.5);
        path.quadraticBezierTo(12, 22.5, 14, 20.5);
      case HxIcon.key:
        circle(8.5, 12, 4);
        line([12.5, 12, 20, 12]);
        line([17, 12, 17, 15]);
        line([20, 12, 20, 14.5]);
      case HxIcon.logout:
        line([14, 4, 19, 4, 19, 20, 14, 20]);
        line([10, 8, 6, 12, 10, 16]);
        line([6, 12, 16, 12]);
      case HxIcon.plus:
        line([12, 5, 12, 19]);
        line([5, 12, 19, 12]);
      case HxIcon.sun:
        circle(12, 12, 4);
        for (var i = 0; i < 8; i++) {
          final a = i * math.pi / 4;
          line([
            12 + 7 * math.cos(a),
            12 + 7 * math.sin(a),
            12 + 9 * math.cos(a),
            12 + 9 * math.sin(a),
          ]);
        }
      case HxIcon.video:
        path.addRRect(
          RRect.fromLTRBR(3.5, 5.5, 20.5, 17.5, const Radius.circular(2.5)),
        );
        final t = Path()
          ..moveTo(10.5, 9.2)
          ..lineTo(10.5, 14.2)
          ..lineTo(14.5, 11.7)
          ..close();
        canvas.drawPath(t, fill);
      case HxIcon.code:
        line([9, 7, 4, 12, 9, 17]);
        line([15, 7, 20, 12, 15, 17]);
      case HxIcon.pin:
        line([9, 4, 15, 4, 14, 9, 17, 12, 7, 12, 10, 9]);
        path.close();
        line([12, 12, 12, 20]);
    }
    canvas.drawPath(path, p);
    canvas.restore();
  }

  @override
  bool shouldRepaint(_IconPainter old) =>
      old.icon != icon || old.color != color || old.stroke != stroke;
}

HxIcon kindIcon(String kind) => switch (kind) {
  'lecture' => HxIcon.play,
  'pset' || 'assignment' => HxIcon.pencil,
  'practice' || 'lab' => HxIcon.terminal,
  'project' => HxIcon.flag,
  _ => HxIcon.book,
};
