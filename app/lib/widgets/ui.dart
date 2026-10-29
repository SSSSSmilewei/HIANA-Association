import 'dart:ui' show ImageFilter;

import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';

import '../app/tokens.dart';
import 'hx_icons.dart';

/// 液态玻璃：背景模糊 + 半透明白 + 一圈亮边。只用在导航、标签栏和浮在内容上的控件。
class Glass extends StatelessWidget {
  const Glass({
    super.key,
    required this.child,
    this.radius = 24,
    this.padding = EdgeInsets.zero,
    this.strong = false,
    this.shadow = true,
  });
  final Widget child;
  final double radius;
  final EdgeInsets padding;
  final bool strong;
  final bool shadow;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final r = BorderRadius.circular(radius);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: r,
        boxShadow: shadow
            ? [
                BoxShadow(
                  color: h.glassShadow,
                  blurRadius: 32,
                  offset: const Offset(0, 12),
                ),
              ]
            : null,
      ),
      child: ClipRRect(
        borderRadius: r,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: strong ? h.glassStrong : h.glass,
              borderRadius: r,
              border: Border.all(color: h.glassEdge),
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.center,
                colors: [
                  h.glassHi.withValues(alpha: h.dark ? 0.06 : 0.35),
                  const Color(0x00FFFFFF),
                ],
              ),
            ),
            child: Padding(padding: padding, child: child),
          ),
        ),
      ),
    );
  }
}

/// 实心卡片：内容都放在这里，读起来不累。
class HxCard extends StatelessWidget {
  const HxCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.radius = 22,
    this.color,
    this.onTap,
  });
  final Widget child;
  final EdgeInsets padding;
  final double radius;
  final Color? color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final box = DecoratedBox(
      decoration: BoxDecoration(
        color: color ?? h.surface,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: h.line),
      ),
      child: Padding(padding: padding, child: child),
    );
    if (onTap == null) return box;
    return Pressable(onTap: onTap!, child: box);
  }
}

/// 按下缩到 0.97，松手弹回；所有能点的大块都用它。
class Pressable extends StatefulWidget {
  const Pressable({
    super.key,
    required this.child,
    required this.onTap,
    this.scale = 0.97,
    this.enabled = true,
    this.semanticLabel,
  });
  final Widget child;
  final VoidCallback onTap;
  final double scale;
  final bool enabled;
  final String? semanticLabel;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: widget.enabled,
      label: widget.semanticLabel,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: widget.enabled ? (_) => setState(() => _down = true) : null,
        onTapUp: widget.enabled ? (_) => setState(() => _down = false) : null,
        onTapCancel: () => setState(() => _down = false),
        onTap: widget.enabled ? widget.onTap : null,
        child: AnimatedScale(
          scale: _down ? widget.scale : 1,
          duration: _down ? HxMotion.fast : const Duration(milliseconds: 420),
          curve: _down ? HxMotion.ease : Curves.elasticOut,
          child: AnimatedOpacity(
            opacity: widget.enabled ? 1 : 0.5,
            duration: HxMotion.mid,
            child: widget.child,
          ),
        ),
      ),
    );
  }
}

enum HxButtonKind { primary, soft, ghost, quiet, ink }

/// 按钮。primary 是橙色实心，soft 是浅橙底，ghost 是描边。
class HxButton extends StatelessWidget {
  const HxButton(
    this.text, {
    super.key,
    required this.onTap,
    this.kind = HxButtonKind.primary,
    this.icon,
    this.height = 48,
    this.expand = false,
    this.enabled = true,
    this.busy = false,
  });
  final String text;
  final VoidCallback onTap;
  final HxButtonKind kind;
  final HxIcon? icon;
  final double height;
  final bool expand;
  final bool enabled;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final (Color bg, Color fg, Border? border) = switch (kind) {
      HxButtonKind.primary => (h.cta, const Color(0xFFFFFFFF), null),
      HxButtonKind.soft => (h.tint, h.accentText, null),
      HxButtonKind.ghost => (h.surface, h.ink, Border.all(color: h.line)),
      HxButtonKind.quiet => (
        const Color(0x00000000),
        h.sub,
        Border.all(color: h.line),
      ),
      HxButtonKind.ink => (h.ink, h.bg, null),
    };
    final content = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (busy)
          SizedBox(
            width: 18,
            height: 18,
            child: MiuixCircularProgressIndicator(size: 18, strokeWidth: 2.2),
          )
        else ...[
          if (icon != null) ...[
            HxIconView(icon!, size: height >= 52 ? 22 : 19, color: fg),
            const SizedBox(width: 8),
          ],
          Text(
            text,
            style: TextStyle(
              color: fg,
              fontSize: height >= 52 ? 17 : 15,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ],
    );
    return Pressable(
      onTap: onTap,
      enabled: enabled && !busy,
      semanticLabel: text,
      child: Container(
        height: height,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(height >= 52 ? 18 : 16),
          border: border,
          boxShadow: kind == HxButtonKind.primary
              ? [
                  BoxShadow(
                    color: h.ctaShadow,
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ]
              : null,
        ),
        child: ExcludeSemantics(child: content),
      ),
    );
  }
}

/// 圆形图标按钮（44×44 起）。
class HxIconButton extends StatelessWidget {
  const HxIconButton({
    super.key,
    required this.icon,
    required this.onTap,
    required this.label,
    this.size = 44,
    this.glass = false,
  });
  final HxIcon icon;
  final VoidCallback onTap;
  final String label;
  final double size;
  final bool glass;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final inner = SizedBox(
      width: size,
      height: size,
      child: Center(child: HxIconView(icon, size: 20, color: h.ink)),
    );
    return Pressable(
      onTap: onTap,
      scale: 0.92,
      semanticLabel: label,
      child: glass
          ? Glass(radius: size / 2, shadow: false, child: inner)
          : DecoratedBox(
              decoration: BoxDecoration(
                color: h.surface,
                shape: BoxShape.circle,
                border: Border.all(color: h.line),
              ),
              child: inner,
            ),
    );
  }
}

/// 小标签。
class HxTag extends StatelessWidget {
  const HxTag(
    this.text, {
    super.key,
    this.bg,
    this.fg,
    this.dot,
    this.bold = false,
  });
  final String text;
  final Color? bg;
  final Color? fg;
  final Color? dot;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: bg ?? h.well,
        borderRadius: BorderRadius.circular(9),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dot != null) ...[LiveDot(color: dot!), const SizedBox(width: 6)],
          Text(
            text,
            style: TextStyle(
              color: fg ?? h.sub,
              fontSize: 12,
              height: 1.4,
              fontWeight: bold ? FontWeight.w600 : FontWeight.w400,
            ),
          ),
        ],
      ),
    );
  }
}

/// 一闪一闪的小圆点：“进行中”。
class LiveDot extends StatefulWidget {
  const LiveDot({super.key, required this.color, this.size = 7});
  final Color color;
  final double size;

  @override
  State<LiveDot> createState() => _LiveDotState();
}

class _LiveDotState extends State<LiveDot> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2400),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.disableAnimationsOf(context);
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) {
        final t = reduce ? 0.0 : _c.value;
        final ring = t < 0.5 ? t * 2 : 0.0;
        return Container(
          width: widget.size,
          height: widget.size,
          decoration: BoxDecoration(
            color: widget.color,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: widget.color.withValues(alpha: 0.45 * (1 - ring)),
                spreadRadius: 6 * ring,
              ),
            ],
          ),
        );
      },
    );
  }
}

/// 细进度条。
class HxBar extends StatelessWidget {
  const HxBar(this.ratio, {super.key, this.height = 4});
  final double ratio;
  final double height;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return ClipRRect(
      borderRadius: BorderRadius.circular(height / 2),
      child: SizedBox(
        height: height,
        child: Stack(
          children: [
            Positioned.fill(child: ColoredBox(color: h.track)),
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: ratio.clamp(0.0, 1.0)),
              duration: HxMotion.slow,
              curve: HxMotion.ease,
              builder: (context, v, _) => FractionallySizedBox(
                widthFactor: v,
                child: ColoredBox(color: h.accent),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 进度环。
class HxRing extends StatelessWidget {
  const HxRing({
    super.key,
    required this.ratio,
    this.size = 40,
    this.stroke = 4,
    this.child,
  });
  final double ratio;
  final double size;
  final double stroke;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: ratio.clamp(0.0, 1.0)),
      duration: const Duration(milliseconds: 520),
      curve: HxMotion.ease,
      builder: (context, v, c) => CustomPaint(
        size: Size.square(size),
        painter: _RingPainter(v, h.track, h.accent, stroke),
        child: SizedBox(
          width: size,
          height: size,
          child: Center(child: c),
        ),
      ),
      child: child,
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.v, this.track, this.color, this.stroke);
  final double v;
  final Color track;
  final Color color;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromLTWH(
      stroke / 2,
      stroke / 2,
      size.width - stroke,
      size.height - stroke,
    );
    final p = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, 0, 6.2832, false, p..color = track);
    if (v > 0) {
      canvas.drawArc(rect, -1.5708, 6.2832 * v, false, p..color = color);
    }
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.v != v || old.color != color || old.track != track;
}

/// 分段选择：选中的胶囊滑过去。
class HxSeg<T> extends StatelessWidget {
  const HxSeg({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
    this.flat = false,
  });
  final List<(T, String)> options;
  final T value;
  final ValueChanged<T> onChanged;
  final bool flat;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final found = options.indexWhere((o) => o.$1 == value);
    final i = found < 0 ? 0 : found;
    final row = LayoutBuilder(
      builder: (context, box) {
        final w = (box.maxWidth - 8) / options.length;
        return SizedBox(
          height: 48,
          child: Stack(
            children: [
              AnimatedPositioned(
                duration: HxMotion.slow,
                curve: Curves.easeOutBack,
                left: 4 + w * i,
                top: 4,
                bottom: 4,
                width: w,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: flat ? h.surface : h.pill,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: h.glassShadow,
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                ),
              ),
              Row(
                children: [
                  const SizedBox(width: 4),
                  for (var k = 0; k < options.length; k++)
                    SizedBox(
                      width: w,
                      child: Semantics(
                        button: true,
                        selected: k == i,
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () => onChanged(options[k].$1),
                          child: Center(
                            child: AnimatedDefaultTextStyle(
                              duration: HxMotion.mid,
                              style: TextStyle(
                                color: k == i ? h.ink : h.navIdle,
                                fontSize: 14,
                                fontWeight: k == i
                                    ? FontWeight.w600
                                    : FontWeight.w400,
                              ),
                              child: Text(options[k].$2),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        );
      },
    );
    if (flat) {
      return DecoratedBox(
        decoration: BoxDecoration(
          color: h.well,
          borderRadius: BorderRadius.circular(18),
        ),
        child: row,
      );
    }
    return Glass(radius: 18, shadow: false, child: row);
  }
}

/// 骨架屏：第一次加载时代替转圈。
class Skeleton extends StatefulWidget {
  const Skeleton({super.key, this.height = 20, this.width, this.radius = 12});
  final double height;
  final double? width;
  final double radius;

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton>
    with SingleTickerProviderStateMixin {
  late final _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) => Container(
        height: widget.height,
        width: widget.width,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(widget.radius),
          gradient: LinearGradient(
            begin: Alignment(-1 + 3 * _c.value - 1, 0),
            end: Alignment(1 + 3 * _c.value - 1, 0),
            colors: [h.well, h.line, h.well],
          ),
        ),
      ),
    );
  }
}

/// 出错了：说清楚原因，给一个重试。
class ErrorCard extends StatelessWidget {
  const ErrorCard({super.key, required this.error, required this.onRetry});
  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return HxCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '没加载出来',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: h.ink,
            ),
          ),
          const SizedBox(height: 4),
          Text('$error', style: TextStyle(fontSize: 13, color: h.sub)),
          const SizedBox(height: 12),
          HxButton(
            '再试一次',
            onTap: onRetry,
            kind: HxButtonKind.ghost,
            height: 40,
          ),
        ],
      ),
    );
  }
}

/// 空状态。
class EmptyCard extends StatelessWidget {
  const EmptyCard({super.key, required this.title, this.body, this.action});
  final String title;
  final String? body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return HxCard(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      child: Column(
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: h.ink,
            ),
          ),
          if (body != null) ...[
            const SizedBox(height: 6),
            Text(
              body!,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: h.sub, height: 1.5),
            ),
          ],
          if (action != null) ...[const SizedBox(height: 14), action!],
        ],
      ),
    );
  }
}

/// 分区标题。
class SectionHead extends StatelessWidget {
  const SectionHead(this.title, {super.key, this.trailing});
  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 22, 16, 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: h.ink,
              ),
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// 进场：从下面浮上来一点，按 [index] 错开 40ms。
class Rise extends StatelessWidget {
  const Rise({super.key, required this.child, this.index = 0});
  final Widget child;
  final int index;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 420 + index * 40),
      curve: Interval(
        (index * 40) / (420 + index * 40),
        1,
        curve: HxMotion.ease,
      ),
      builder: (context, v, c) => Opacity(
        opacity: v,
        child: Transform.translate(offset: Offset(0, 12 * (1 - v)), child: c),
      ),
      child: child,
    );
  }
}

/* ---------- 时间 ---------- */

DateTime _cn(int ms) => DateTime.fromMillisecondsSinceEpoch(
  ms,
  isUtc: true,
).add(const Duration(hours: 8));

/// 毫秒时间戳 → "21:05"（北京时间）。
String hhmm(int ms) {
  final t = _cn(ms);
  return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
}

const _weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

String weekdayOf(String day) =>
    _weekdays[DateTime.parse('${day}T00:00:00Z').weekday - 1];

/// "2026-10-21" → "10 月 21 日 周三"
String longDay(String day, {bool weekday = true}) {
  final d = DateTime.parse('${day}T00:00:00Z');
  return '${d.month} 月 ${d.day} 日${weekday ? ' ${_weekdays[d.weekday - 1]}' : ''}';
}

/// "2026-10-21" → "10/21"
String shortDay(String day) => '${day.substring(5, 7)}/${day.substring(8, 10)}';

int daysBetween(String from, String to) => DateTime.parse(
  '${to}T00:00:00Z',
).difference(DateTime.parse('${from}T00:00:00Z')).inDays;

String cnToday() => _cn(
  DateTime.now().millisecondsSinceEpoch,
).toIso8601String().substring(0, 10);

String greeting() {
  final h = _cn(DateTime.now().millisecondsSinceEpoch).hour;
  if (h < 5) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 13) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

String minutesText(int min) {
  if (min < 60) return '$min 分钟';
  final hh = min ~/ 60, mm = min % 60;
  return mm == 0 ? '$hh 小时' : '$hh 小时 $mm 分';
}

String dayOfMs(int ms) => _cn(ms).toIso8601String().substring(0, 10);

/* ---------- 提示条 ---------- */

OverlayEntry? _toastEntry;

/// 底部浮出一条玻璃提示，几秒后自己消失。
void showHxToast(BuildContext context, String text, {bool error = false}) {
  final overlay = Overlay.maybeOf(context, rootOverlay: true);
  if (overlay == null) return;
  _toastEntry?.remove();
  late OverlayEntry entry;
  entry = OverlayEntry(
    builder: (context) => _Toast(
      text: text,
      error: error,
      onDone: () {
        if (_toastEntry == entry) _toastEntry = null;
        entry.remove();
      },
    ),
  );
  _toastEntry = entry;
  overlay.insert(entry);
}

class _Toast extends StatefulWidget {
  const _Toast({required this.text, required this.error, required this.onDone});
  final String text;
  final bool error;
  final VoidCallback onDone;

  @override
  State<_Toast> createState() => _ToastState();
}

class _ToastState extends State<_Toast> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 360),
    reverseDuration: const Duration(milliseconds: 200),
  );
  bool _removed = false;

  @override
  void initState() {
    super.initState();
    _c.forward();
    Future.delayed(
      Duration(milliseconds: widget.error ? 4000 : 2600),
      () async {
        if (!mounted) return;
        await _c.reverse();
        if (mounted && !_removed) {
          _removed = true;
          widget.onDone();
        }
      },
    );
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final bottom = MediaQuery.paddingOf(context).bottom + 96;
    return Positioned(
      left: 24,
      right: 24,
      bottom: bottom,
      child: IgnorePointer(
        child: AnimatedBuilder(
          animation: _c,
          builder: (context, child) {
            final v = Curves.easeOutBack.transform(_c.value.clamp(0.0, 1.0));
            return Opacity(
              opacity: _c.value,
              child: Transform.translate(
                offset: Offset(0, 14 * (1 - v)),
                child: child,
              ),
            );
          },
          child: Center(
            child: Glass(
              radius: 18,
              strong: true,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (!widget.error) ...[
                    HxIconView(
                      HxIcon.check,
                      size: 18,
                      color: h.accentText,
                      stroke: 2.2,
                    ),
                    const SizedBox(width: 8),
                  ],
                  Flexible(
                    child: Text(
                      widget.text,
                      style: TextStyle(
                        fontSize: 14,
                        color: widget.error ? h.badInk : h.ink,
                        decoration: TextDecoration.none,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
