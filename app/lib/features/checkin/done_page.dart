import 'dart:math' as math;

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/tokens.dart';
import '../../core/heatmap.dart';
import '../../data/providers.dart';
import '../../widgets/ui.dart';

/// 签到成功：圆盘弹出、外圈画满、对勾画出来，这周的格子里今天亮起。
/// 整个 App 唯一一处“庆祝”的动画。
class DonePage extends ConsumerStatefulWidget {
  const DonePage({super.key, required this.title, required this.sub});
  final String title;
  final String sub;

  static Route<void> route({required String title, required String sub}) => PageRouteBuilder<void>(
        opaque: true,
        transitionDuration: const Duration(milliseconds: 260),
        reverseTransitionDuration: const Duration(milliseconds: 200),
        pageBuilder: (_, __, ___) => DonePage(title: title, sub: sub),
        transitionsBuilder: (_, a, __, child) => FadeTransition(opacity: a, child: child),
      );

  @override
  ConsumerState<DonePage> createState() => _DonePageState();
}

class _DonePageState extends ConsumerState<DonePage> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))..forward();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  double _seg(double from, double to, Curve curve) {
    final v = ((_c.value - from) / (to - from)).clamp(0.0, 1.0);
    return curve.transform(v);
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final pad = MediaQuery.paddingOf(context);
    final reduce = MediaQuery.disableAnimationsOf(context);
    final heat = ref.watch(heatmapProvider).valueOrNull;
    final atts = heat?.series.where((s) => s.source == 'site:attendance').toList() ?? const <SourceSeries>[];
    final att = atts.isEmpty ? null : atts.first;
    final today = heat?.today ?? cnToday();
    final week = [for (var i = 6; i >= 0; i--) addDays(today, -i)];

    return ColoredBox(
      color: h.bg,
      child: Padding(
        padding: EdgeInsets.fromLTRB(24, pad.top + 72, 24, pad.bottom + 24),
        child: AnimatedBuilder(
          animation: _c,
          builder: (context, _) {
            final disk = reduce ? 1.0 : _seg(0.0, 0.38, Curves.easeOutBack);
            final ring = reduce ? 1.0 : _seg(0.06, 0.52, HxMotion.ease);
            final check = reduce ? 1.0 : _seg(0.25, 0.55, HxMotion.ease);
            final text = reduce ? 1.0 : _seg(0.35, 0.7, HxMotion.ease);
            final light = reduce ? 1.0 : _seg(0.6, 0.85, Curves.easeOutBack);
            return Column(
              children: [
                SizedBox(
                  width: 200,
                  height: 200,
                  child: CustomPaint(
                    painter: _BadgePainter(h: h, ring: ring, check: check),
                    child: Center(
                      child: Transform.scale(
                        scale: disk,
                        child: Container(
                          width: 136,
                          height: 136,
                          decoration: BoxDecoration(
                            color: h.cta,
                            shape: BoxShape.circle,
                            boxShadow: [BoxShadow(color: h.ctaShadow, blurRadius: 40, offset: const Offset(0, 18))],
                          ),
                          child: CustomPaint(painter: _CheckPainter(check)),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 28),
                Opacity(
                  opacity: text,
                  child: Transform.translate(
                    offset: Offset(0, 12 * (1 - text)),
                    child: Column(
                      children: [
                        Text(widget.title, style: TextStyle(fontSize: 30, fontWeight: FontWeight.w700, color: h.ink)),
                        const SizedBox(height: 6),
                        Text(widget.sub, style: TextStyle(fontSize: 15, color: h.sub, fontFeatures: kTabular)),
                        const SizedBox(height: 28),
                        HxCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('这周的签到', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: h.ink)),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  for (var i = 0; i < 7; i++)
                                    Expanded(
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(horizontal: 2),
                                        child: AspectRatio(
                                          aspectRatio: 1,
                                          child: Transform.scale(
                                            scale: i == 6 ? 0.8 + 0.2 * light : 1,
                                            child: DecoratedBox(
                                              decoration: BoxDecoration(
                                                color: i == 6
                                                    ? Color.lerp(h.surface, h.heat[2], light)
                                                    : (att?.days[week[i]] ?? 0) > 0
                                                        ? h.heat[2]
                                                        : null,
                                                borderRadius: BorderRadius.circular(6),
                                                border: i == 6
                                                    ? Border.all(color: h.now, width: 2)
                                                    : (att?.days[week[i]] ?? 0) > 0
                                                        ? null
                                                        : Border.all(color: h.heatLine),
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const Spacer(),
                HxButton('好的', kind: HxButtonKind.ink, height: 56, expand: true, onTap: () => Navigator.of(context).maybePop()),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _BadgePainter extends CustomPainter {
  _BadgePainter({required this.h, required this.ring, required this.check});
  final Hx h;
  final double ring;
  final double check;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final p = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(c, 86, p..color = h.track);
    canvas.drawArc(Rect.fromCircle(center: c, radius: 86), -math.pi / 2, 2 * math.pi * ring, false, p..color = h.accent);
    // 扩散的一圈波纹
    if (check > 0 && check < 1) {
      canvas.drawCircle(
        c,
        78 + 40 * check,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = h.accent.withValues(alpha: 0.5 * (1 - check)),
      );
    }
  }

  @override
  bool shouldRepaint(_BadgePainter old) => old.ring != ring || old.check != check;
}

class _CheckPainter extends CustomPainter {
  _CheckPainter(this.t);
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    if (t <= 0) return;
    final s = size.width / 24 * 0.5;
    final o = Offset(size.width * 0.25, size.height * 0.25);
    final pts = [const Offset(5, 12.5), const Offset(9.5, 17), const Offset(19, 7.5)];
    final l1 = (pts[1] - pts[0]).distance, l2 = (pts[2] - pts[1]).distance;
    final total = (l1 + l2) * t;
    final path = Path()..moveTo(o.dx + pts[0].dx * s, o.dy + pts[0].dy * s);
    if (total <= l1) {
      final q = Offset.lerp(pts[0], pts[1], total / l1)!;
      path.lineTo(o.dx + q.dx * s, o.dy + q.dy * s);
    } else {
      path.lineTo(o.dx + pts[1].dx * s, o.dy + pts[1].dy * s);
      final q = Offset.lerp(pts[1], pts[2], (total - l1) / l2)!;
      path.lineTo(o.dx + q.dx * s, o.dy + q.dy * s);
    }
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 5
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = const Color(0xFFFFFFFF),
    );
  }

  @override
  bool shouldRepaint(_CheckPainter old) => old.t != t;
}
