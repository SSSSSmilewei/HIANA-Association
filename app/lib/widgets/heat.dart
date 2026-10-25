import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../app/tokens.dart';
import '../core/heatmap.dart';

/// 首页和登录页背后那面倾斜的“墙”：最近若干周的热力格子，按列从左到右浮现一次。
/// [grid] 为空时画一面装饰用的墙（登录页）。
class HeatWall extends StatefulWidget {
  const HeatWall({super.key, this.grid, this.cell = 36, this.gap = 4, this.angle = -5, this.rows = 7});
  final Grid? grid;
  final double cell;
  final double gap;
  final double angle; // 度
  final int rows;

  @override
  State<HeatWall> createState() => _HeatWallState();
}

class _HeatWallState extends State<HeatWall> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..forward();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final reduce = MediaQuery.disableAnimationsOf(context);
    return ClipRect(
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) => CustomPaint(
          painter: _WallPainter(
            grid: widget.grid,
            h: h,
            t: reduce ? 1 : _c.value,
            cell: widget.cell,
            gap: widget.gap,
            angle: widget.angle * math.pi / 180,
            rows: widget.rows,
          ),
          size: Size.infinite,
        ),
      ),
    );
  }
}

class _WallPainter extends CustomPainter {
  _WallPainter({required this.grid, required this.h, required this.t, required this.cell, required this.gap, required this.angle, required this.rows});
  final Grid? grid;
  final Hx h;
  final double t;
  final double cell;
  final double gap;
  final double angle;
  final int rows;

  int _decor(int col, int row, int cols) {
    final i = col * rows + row;
    final v = ((i * 2654435761) % 1000) / 1000 + (col / cols) * 0.5 - 0.35;
    return v < 0.2 ? 0 : v < 0.42 ? 1 : v < 0.62 ? 2 : v < 0.82 ? 3 : 4;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final step = cell + gap;
    final cols = (size.width / step).ceil() + 4;
    final totalRows = math.max(rows, (size.height / step).ceil() + 3);
    canvas.save();
    // 以右侧为轴转一点角度，最近的几周在右边
    canvas.translate(size.width + step, size.height / 2);
    canvas.rotate(angle);
    final weeks = grid?.weeks;
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = h.heatLine;
    for (var c = 0; c < cols; c++) {
      // 从右往左：c = 0 是最近的一周
      final appear = ((t * 1.6) - (cols - c) / cols * 0.6).clamp(0.0, 1.0);
      if (appear <= 0) continue;
      final x = -(c + 1) * step;
      for (var r = 0; r < totalRows; r++) {
        int level;
        bool show = true;
        if (weeks != null) {
          final w = weeks.length - 1 - c;
          // 数据只有 7 行（周一到周日），墙比它高时上下补空格
          final rr = r - (totalRows - 7) ~/ 2;
          if (w >= 0 && rr >= 0 && rr < 7) {
            final cellData = weeks[w][rr];
            show = cellData.inRange;
            level = cellData.level;
          } else {
            level = 0;
          }
        } else {
          level = _decor(c, r, cols);
        }
        if (!show) continue;
        final y = -totalRows * step / 2 + r * step;
        final s = cell * (0.6 + 0.4 * appear);
        final rect = RRect.fromRectAndRadius(
          Rect.fromCenter(center: Offset(x + cell / 2, y + cell / 2), width: s, height: s),
          Radius.circular(cell * 0.2),
        );
        final fill = h.heatColor(level);
        if (fill == null) {
          canvas.drawRRect(rect, stroke..color = h.heatLine.withValues(alpha: h.heatLine.a * appear));
        } else {
          canvas.drawRRect(rect, Paint()..color = fill.withValues(alpha: appear));
        }
      }
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_WallPainter old) => old.t != t || old.grid != grid || old.h != h;
}

/// 一年的热力图：每列一周、周一在上；能横向滑动，打开时滚到最右（最近）。点格子选中那天。
class HeatYear extends StatefulWidget {
  const HeatYear({super.key, required this.grid, required this.today, required this.selected, required this.onSelect});
  final Grid grid;
  final String today;
  final String? selected;
  final ValueChanged<String> onSelect;

  @override
  State<HeatYear> createState() => _HeatYearState();
}

class _HeatYearState extends State<HeatYear> {
  final _scroll = ScrollController();
  static const cell = 13.0;
  static const gap = 3.0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final weeks = widget.grid.weeks.length;
    final width = weeks * (cell + gap);
    const labelH = 18.0;
    final height = labelH + 7 * (cell + gap);
    return SingleChildScrollView(
      controller: _scroll,
      scrollDirection: Axis.horizontal,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (d) {
          final w = (d.localPosition.dx / (cell + gap)).floor();
          final r = ((d.localPosition.dy - labelH) / (cell + gap)).floor();
          if (w < 0 || w >= weeks || r < 0 || r > 6) return;
          final hit = widget.grid.weeks[w][r];
          if (hit.inRange) widget.onSelect(hit.date);
        },
        child: CustomPaint(
          size: Size(width, height),
          painter: _YearPainter(widget.grid, h, widget.today, widget.selected, labelH),
        ),
      ),
    );
  }
}

class _YearPainter extends CustomPainter {
  _YearPainter(this.grid, this.h, this.today, this.selected, this.labelH);
  final Grid grid;
  final Hx h;
  final String today;
  final String? selected;
  final double labelH;

  @override
  void paint(Canvas canvas, Size size) {
    const cell = _HeatYearState.cell, gap = _HeatYearState.gap, step = cell + gap;
    for (final m in grid.monthLabels) {
      final tp = TextPainter(
        text: TextSpan(text: m.label, style: TextStyle(fontSize: 11, color: h.sub)),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(m.week * step, 0));
    }
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = h.heatLine;
    for (var w = 0; w < grid.weeks.length; w++) {
      for (var d = 0; d < 7; d++) {
        final c = grid.weeks[w][d];
        if (!c.inRange) continue;
        final rect = RRect.fromRectAndRadius(Rect.fromLTWH(w * step, labelH + d * step, cell, cell), const Radius.circular(3));
        final fill = h.heatColor(c.level);
        if (fill == null) {
          canvas.drawRRect(rect.deflate(0.5), stroke);
        } else {
          canvas.drawRRect(rect, Paint()..color = fill);
        }
        final ring = c.date == selected ? h.ink : (c.date == today ? h.now : null);
        if (ring != null) {
          canvas.drawRRect(
            rect.inflate(2.5),
            Paint()
              ..style = PaintingStyle.stroke
              ..strokeWidth = 1.6
              ..color = ring,
          );
        }
      }
    }
  }

  @override
  bool shouldRepaint(_YearPainter old) => old.grid != grid || old.selected != selected || old.h != h;
}

/// 一条小热力带：最近 [weeks] 周压成一行，每格一周，取那周最深的一档。
class HeatStrip extends StatelessWidget {
  const HeatStrip({super.key, required this.grid, this.weeks = 26});
  final Grid grid;
  final int weeks;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final cols = grid.weeks.length > weeks ? grid.weeks.sublist(grid.weeks.length - weeks) : grid.weeks;
    return Row(
      children: [
        for (final col in cols)
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 1),
              child: AspectRatio(
                aspectRatio: 1,
                child: Builder(
                  builder: (context) {
                    final lv = col.fold<int>(0, (m, c) => c.inRange && c.level > m ? c.level : m);
                    final fill = h.heatColor(lv);
                    return DecoratedBox(
                      decoration: BoxDecoration(
                        color: fill,
                        borderRadius: BorderRadius.circular(2),
                        border: fill == null ? Border.all(color: h.heatLine) : null,
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// 图例：少 □■■■■ 多
class HeatLegend extends StatelessWidget {
  const HeatLegend({super.key});

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    Widget box(int lv) => Container(
          width: 10,
          height: 10,
          margin: const EdgeInsets.symmetric(horizontal: 1.5),
          decoration: BoxDecoration(
            color: h.heatColor(lv),
            borderRadius: BorderRadius.circular(3),
            border: lv == 0 ? Border.all(color: h.heatLine) : null,
          ),
        );
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('少 ', style: TextStyle(fontSize: 12, color: h.sub)),
        for (var i = 0; i <= 4; i++) box(i),
        Text(' 多', style: TextStyle(fontSize: 12, color: h.sub)),
      ],
    );
  }
}
