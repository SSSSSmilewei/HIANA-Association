import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';

import '../core/heatmap.dart';

/// 热力图：每列一周、周一在上，颜色取主题主色的五档深浅，深浅色模式自动适配。
/// 这是整个 App 唯一“花力气”的视觉元素，其余界面保持 HyperOS 原样。
/// 点一下格子，下方显示那天的日期和次数。
class HeatmapView extends StatefulWidget {
  const HeatmapView({super.key, required this.grid, this.unit = '次', this.showMonths = true, this.compact = false});

  final Grid grid;
  final String unit; // 例如“次提交”；总览行传“个来源有记录”
  final bool showMonths;
  final bool compact; // 首页和分平台的小图：格子更小，不显示点选说明

  @override
  State<HeatmapView> createState() => _HeatmapViewState();
}

class _HeatmapViewState extends State<HeatmapView> {
  Cell? _picked;

  static const _gapRatio = 0.22; // 格子间距占格子边长的比例

  @override
  Widget build(BuildContext context) {
    final theme = MiuixTheme.of(context);
    final c = theme.colors;
    final weeks = widget.grid.weeks.length;
    return LayoutBuilder(
      builder: (context, box) {
        final step = box.maxWidth / weeks; // 一列占的宽度
        final cell = (step / (1 + _gapRatio)).clamp(4.0, widget.compact ? 12.0 : 16.0);
        final gap = cell * _gapRatio;
        final labelH = widget.showMonths ? 18.0 : 0.0;
        final height = labelH + 7 * cell + 6 * gap;
        final painter = _HeatmapPainter(
          grid: widget.grid,
          cell: cell,
          gap: gap,
          labelH: labelH,
          base: c.primary,
          empty: c.onSurface.withValues(alpha: 0.07),
          labelStyle: theme.textStyles.footnote2.copyWith(color: c.onSurfaceVariantSummary),
          picked: _picked?.date,
          pickedStroke: c.onSurface,
        );
        final picture = GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: widget.compact
              ? null
              : (d) {
                  final w = (d.localPosition.dx / (cell + gap)).floor();
                  final r = ((d.localPosition.dy - labelH) / (cell + gap)).floor();
                  if (w < 0 || w >= weeks || r < 0 || r > 6) return;
                  final hit = widget.grid.weeks[w][r];
                  setState(() => _picked = hit.inRange && _picked?.date != hit.date ? hit : null);
                },
          child: CustomPaint(size: Size(weeks * (cell + gap), height), painter: painter),
        );
        if (widget.compact) return picture;
        final p = _picked;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            picture,
            const SizedBox(height: 8),
            MiuixText(
              p == null
                  ? '最近 $weeks 周有 ${widget.grid.activeDays} 天有记录，点格子看当天'
                  : '${int.parse(p.date.substring(5, 7))}月${int.parse(p.date.substring(8))}日：'
                      '${p.count == 0 ? '没有记录' : '${p.count} ${widget.unit}'}',
              fontSize: 13,
              color: c.onSurfaceVariantSummary,
            ),
          ],
        );
      },
    );
  }
}

class _HeatmapPainter extends CustomPainter {
  _HeatmapPainter({
    required this.grid,
    required this.cell,
    required this.gap,
    required this.labelH,
    required this.base,
    required this.empty,
    required this.labelStyle,
    required this.picked,
    required this.pickedStroke,
  });

  final Grid grid;
  final double cell, gap, labelH;
  final Color base, empty, pickedStroke;
  final TextStyle labelStyle;
  final String? picked;

  // 1–4 档的透明度：和网页端一样，越活跃越深
  static const _alpha = [0.0, 0.28, 0.5, 0.75, 1.0];

  @override
  void paint(Canvas canvas, Size size) {
    final radius = Radius.circular(cell * 0.28);
    final paint = Paint();
    for (var w = 0; w < grid.weeks.length; w++) {
      for (var d = 0; d < 7; d++) {
        final c = grid.weeks[w][d];
        if (!c.inRange) continue; // 还没到的日子不画
        paint.color = c.level == 0 ? empty : base.withValues(alpha: _alpha[c.level]);
        final rect = Rect.fromLTWH(w * (cell + gap), labelH + d * (cell + gap), cell, cell);
        canvas.drawRRect(RRect.fromRectAndRadius(rect, radius), paint);
        if (c.date == picked) {
          canvas.drawRRect(
            RRect.fromRectAndRadius(rect.inflate(1), radius),
            Paint()
              ..style = PaintingStyle.stroke
              ..strokeWidth = 1.5
              ..color = pickedStroke,
          );
        }
      }
    }
    if (labelH == 0) return;
    for (final m in grid.monthLabels) {
      final tp = TextPainter(text: TextSpan(text: m.label, style: labelStyle), textDirection: TextDirection.ltr)..layout();
      tp.paint(canvas, Offset(m.week * (cell + gap), 0));
    }
  }

  @override
  bool shouldRepaint(_HeatmapPainter old) =>
      old.grid != grid || old.picked != picked || old.base != base || old.empty != empty || old.cell != cell;
}
