import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../data/api_client.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../widgets/hx_icons.dart';
import '../../widgets/ui.dart';
import 'attendance_phase.dart';
import 'done_page.dart';
import 'signature_page.dart';

/// 签到：晚自习（默认周一、二、四 19:00–20:40）和大创场地，签到签退各拍一张现场照片。
/// 只能用相机拍，不提供相册入口。不统计连续天数。
class CheckinPage extends ConsumerStatefulWidget {
  const CheckinPage({super.key, this.standalone = false, this.go});

  /// 从首页推进来的独立页面（带返回按钮）；标签页里为 false。
  final bool standalone;

  /// 进来就打开相机：evening / venue / out。
  final String? go;

  @override
  ConsumerState<CheckinPage> createState() => _CheckinPageState();
}

class _CheckinPageState extends ConsumerState<CheckinPage> {
  final _code = TextEditingController();
  String _kind = 'evening';
  bool _busy = false;
  bool _autoOpened = false;

  @override
  void initState() {
    super.initState();
    if (widget.go == 'venue') _kind = 'venue';
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  /// 打开系统相机拍一张，压到最长边 1280、质量 70，大概一两百 KB。
  Future<String?> _shoot() async {
    final x = await ImagePicker().pickImage(
      source: ImageSource.camera,
      preferredCameraDevice: CameraDevice.rear,
      maxWidth: 1280,
      maxHeight: 1280,
      imageQuality: 70,
    );
    if (x == null) return null;
    return base64Encode(await x.readAsBytes());
  }

  Future<void> _run(AttendanceState s, {required bool out}) async {
    if (_busy) return;
    final scene = s.isIn ? s.currentKind! : _kind;
    final needCode = !out && scene == 'evening' && s.evening.requireCode;
    if (needCode && _code.text.trim().length != 4) {
      showHxToast(context, '先输入屏幕上今天的 4 位口令', error: true);
      return;
    }
    setState(() => _busy = true);
    try {
      final photo = await _shoot();
      if (photo == null) return; // 没拍就返回了
      // 签到：拍完照接着手写签名
      String? signature;
      if (!out) {
        if (!mounted) return;
        signature = await context.pushPage<String>(
          SignaturePage(title: '${kindLabel(scene)}签到 · 签名'),
        );
        if (signature == null) return; // 没签就返回了
      }
      final api = ref.read(apiProvider);
      final at = out
          ? await api.signOut(photo: photo)
          : await api.signIn(
              kind: scene,
              photo: photo,
              signature: signature,
              code: needCode ? _code.text.trim() : null,
            );
      _code.clear();
      HapticFeedback.mediumImpact();
      ref.invalidate(attendanceProvider);
      ref.invalidate(heatmapProvider);
      if (!mounted) return;
      await Navigator.of(context).push(
        DonePage.route(
          title: out ? '签退成功' : '签到成功',
          sub: '${hhmm(at)} · ${kindLabel(scene)}',
        ),
      );
    } on ApiException catch (e) {
      if (mounted) showHxToast(context, e.message, error: true);
    } on PlatformException catch (_) {
      if (mounted) {
        showHxToast(context, '打不开相机。去系统设置里允许“海纳协会”使用相机', error: true);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _maybeAutoOpen(AttendanceState s) {
    if (_autoOpened || widget.go == null) return;
    _autoOpened = true;
    final p = phaseOf(s, DateTime.now().millisecondsSinceEpoch);
    final go = widget.go;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (go == 'out' && p is PhaseIn) _run(s, out: true);
      if (go == 'evening' && p is PhaseOpen && !s.evening.requireCode) {
        _run(s, out: false);
      }
      if (go == 'venue' && p is! PhaseIn) _run(s, out: false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final att = ref.watch(attendanceProvider);
    return HianaPage(
      title: '签到',
      showBack: widget.standalone,
      onRefresh: () =>
          ref.refresh(attendanceProvider.future).then((_) {}, onError: (_) {}),
      children: att.when(
        loading: () => [
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 12),
            child: Skeleton(height: 420, radius: 28),
          ),
        ],
        error: (e, _) => [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: ErrorCard(
              error: e,
              onRetry: () => ref.invalidate(attendanceProvider),
            ),
          ),
        ],
        data: (s) {
          _maybeAutoOpen(s);
          final p = phaseOf(s, DateTime.now().millisecondsSinceEpoch);
          return [
            Padding(
              padding: const EdgeInsets.fromLTRB(28, 0, 28, 12),
              child: Text(
                '${longDay(s.today)} · ${s.evening.isDay ? '晚自习日' : '没有晚自习'}',
                style: TextStyle(fontSize: 14, color: h.sub),
              ),
            ),
            if (p is! PhaseIn)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                child: HxSeg<String>(
                  options: const [('evening', '晚自习'), ('venue', '大创场地')],
                  value: _kind,
                  onChanged: (k) => setState(() => _kind = k),
                ),
              ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: HxCard(
                radius: 28,
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 22),
                child: _MainPanel(
                  s: s,
                  p: p,
                  kind: _kind,
                  busy: _busy,
                  code: _code,
                  run: (out) => _run(s, out: out),
                  toVenue: () => setState(() => _kind = 'venue'),
                ),
              ),
            ),
            SectionHead(
              '我的记录',
              trailing: Text(
                '晚自习 ${s.eveningTotal} 次 · 场地 ${s.venueTotal} 次',
                style: TextStyle(fontSize: 12, color: h.sub),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: s.recent.isEmpty
                  ? const EmptyCard(title: '还没有记录', body: '第一次签到之后，这里会列出最近的记录。')
                  : HxCard(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 4,
                      ),
                      child: Column(
                        children: [
                          for (var i = 0; i < s.recent.length; i++)
                            _RecordRow(r: s.recent[i], first: i == 0),
                        ],
                      ),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(28, 14, 28, 0),
              child: Text(
                '晚自习：每${daysText(s.evening.days)} ${s.evening.windowStart}–${s.evening.windowEnd} · 大创场地：随时，23:59 结束',
                style: TextStyle(fontSize: 13, height: 1.6, color: h.sub),
              ),
            ),
          ];
        },
      ),
    );
  }
}

class _MainPanel extends StatelessWidget {
  const _MainPanel({
    required this.s,
    required this.p,
    required this.kind,
    required this.busy,
    required this.code,
    required this.run,
    required this.toVenue,
  });
  final AttendanceState s;
  final Phase p;
  final String kind;
  final bool busy;
  final TextEditingController code;
  final void Function(bool out) run;
  final VoidCallback toVenue;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final p = this.p; // 字段不能做类型提升，先放进局部变量
    final ev = s.evening;
    final now = DateTime.now().millisecondsSinceEpoch;
    final evFrom = cnTime(s.today, ev.windowStart);
    final dayFrom = cnTime(s.today, '08:00');
    final dayTo = venueEnd(s.today);

    Widget status(Widget tag, String note) => Row(
      children: [
        tag,
        const Spacer(),
        Text(note, style: TextStyle(fontSize: 12, color: h.sub)),
      ],
    );
    Widget big(String n, String unit) => Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Text(
          n,
          style: TextStyle(
            fontSize: 56,
            height: 1.1,
            fontWeight: FontWeight.w700,
            color: h.ink,
            letterSpacing: -2,
            fontFeatures: kTabular,
          ),
        ),
        if (unit.isNotEmpty) ...[
          const SizedBox(width: 4),
          Text(unit, style: TextStyle(fontSize: 15, color: h.sub)),
        ],
      ],
    );
    Widget small(String t) => Text(
      t,
      style: TextStyle(fontSize: 13, color: h.sub, fontFeatures: kTabular),
    );
    Widget note(String t) => Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Text(
        t,
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 13, height: 1.5, color: h.sub),
      ),
    );

    final List<Widget> children;
    if (p is PhaseIn) {
      final isEv = p.scene == 'evening';
      children = [
        status(
          HxTag(
            '${kindLabel(p.scene)} · 学习中',
            bg: h.tint,
            fg: h.accentText,
            dot: h.accent,
            bold: true,
          ),
          isEv && ev.requireCode ? '现场口令已开启' : '只需拍照',
        ),
        _Dial(
          from: isEv ? evFrom : dayFrom,
          to: isEv ? ev.endsAt : dayTo,
          start: p.inAt,
          now: now,
          labels: isEv ? (ev.windowStart, ev.windowEnd) : ('08:00', '24:00'),
          center: [
            small('已学习'),
            big(
              p.minutes < 60
                  ? '${p.minutes}'
                  : (p.minutes / 60).toStringAsFixed(1),
              p.minutes < 60 ? '分钟' : '小时',
            ),
            small('${hhmm(p.inAt)} 签到 · ${hhmm(p.endsAt)} 结束'),
          ],
        ),
        HxButton(
          '拍照签退',
          icon: HxIcon.camera,
          height: 56,
          expand: true,
          busy: busy,
          onTap: () => run(true),
        ),
        note('到点自动结束'),
      ];
    } else if (kind == 'venue') {
      children = [
        status(const HxTag('大创场地'), '随时可以签'),
        _Dial(
          from: dayFrom,
          to: dayTo,
          start: null,
          now: now,
          labels: ('08:00', '24:00'),
          center: [small('现在'), big(hhmm(now), ''), small('23:59 自动结束')],
        ),
        HxButton(
          '拍照签到',
          icon: HxIcon.camera,
          height: 56,
          expand: true,
          busy: busy,
          onTap: () => run(false),
        ),
        note('进场拍一张，离开再拍一张签退。'),
      ];
    } else if (p is PhaseOpen) {
      children = [
        status(
          HxTag('晚自习进行中', bg: h.tint, fg: h.accentText, dot: h.now, bold: true),
          ev.requireCode ? '要输现场口令' : '只需拍照',
        ),
        _Dial(
          from: evFrom,
          to: ev.endsAt,
          start: null,
          now: now,
          labels: (ev.windowStart, ev.windowEnd),
          center: [
            small('还剩'),
            big('${p.remaining}', '分钟'),
            small('${ev.windowStart} – ${ev.windowEnd}'),
          ],
        ),
        if (ev.requireCode) ...[
          MaterialSurfaceField(controller: code),
          const SizedBox(height: 12),
        ],
        HxButton(
          '拍照签到',
          icon: HxIcon.camera,
          height: 56,
          expand: true,
          busy: busy,
          onTap: () => run(false),
        ),
        note(ev.requireCode ? '先输入屏幕上的 4 位数' : '到教室后拍一张现场照片。'),
      ];
    } else if (p is PhaseDone) {
      final end = p.outAt ?? ev.endsAt;
      children = [
        status(
          HxTag('今晚签到了', bg: h.okBg, fg: h.okInk),
          p.auto ? '这次没签退' : '已签退',
        ),
        _Dial(
          from: evFrom,
          to: ev.endsAt,
          start: p.inAt,
          now: end,
          labels: (ev.windowStart, ev.windowEnd),
          center: [
            small('今晚学了'),
            big('${math.max(0, ((end - p.inAt) / 60000).round())}', '分钟'),
            small(
              '${hhmm(p.inAt)} – ${p.outAt == null ? ev.windowEnd : hhmm(p.outAt!)}',
            ),
          ],
        ),
        HxButton('去大创场地继续学', kind: HxButtonKind.ghost, onTap: toVenue),
      ];
    } else if (p is PhaseLater) {
      children = [
        status(const HxTag('今晚有晚自习'), '${hhmm(p.opensAt)} 起可以签'),
        _Dial(
          from: evFrom,
          to: ev.endsAt,
          start: null,
          now: now,
          labels: (ev.windowStart, ev.windowEnd),
          center: [
            small('今晚'),
            big(ev.windowStart, ''),
            small('${hhmm(p.opensAt)} 起可以签到'),
          ],
        ),
        HxButton(
          '还没到签到时间',
          height: 56,
          expand: true,
          enabled: false,
          onTap: () {},
        ),
        const SizedBox(height: 10),
        HxButton('现在在大创场地？签场地', kind: HxButtonKind.quiet, onTap: toVenue),
      ];
    } else {
      final next = (p as PhaseNone).next;
      children = [
        status(
          const HxTag('今天没有晚自习'),
          next == null ? '' : '下次：$next ${ev.windowStart}',
        ),
        const SizedBox(height: 24),
        Text(
          '今天没有晚自习',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: h.ink,
          ),
        ),
        note('晚自习：每${daysText(ev.days)} ${ev.windowStart}–${ev.windowEnd}'),
        const SizedBox(height: 16),
        HxButton('去大创场地签到', icon: HxIcon.camera, onTap: toVenue),
        const SizedBox(height: 12),
      ];
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: children,
    );
  }
}

/// 现场口令输入框（4 位数字）。miuix 的输入框需要 Material 祖先，HianaPage 已经提供了。
class MaterialSurfaceField extends StatelessWidget {
  const MaterialSurfaceField({super.key, required this.controller});
  final TextEditingController controller;

  @override
  Widget build(BuildContext context) => MiuixTextField(
    controller: controller,
    label: '屏幕上今天的 4 位口令',
    useLabelAsPlaceholder: true,
    singleLine: true,
    keyboardType: TextInputType.number,
    textInputAction: TextInputAction.done,
  );
}

/// 表盘：270° 的弧，左下是开始、右下是结束；橙色弧是这次学了多久，红点是现在。
class _Dial extends StatefulWidget {
  const _Dial({
    required this.from,
    required this.to,
    required this.start,
    required this.now,
    required this.labels,
    required this.center,
  });
  final int from;
  final int to;
  final int? start;
  final int now;
  final (String, String) labels;
  final List<Widget> center;

  @override
  State<_Dial> createState() => _DialState();
}

class _DialState extends State<_Dial> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..forward();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: SizedBox(
        width: 280,
        height: 280,
        child: AnimatedBuilder(
          animation: _c,
          builder: (context, child) => CustomPaint(
            painter: _DialPainter(
              widget,
              h,
              MediaQuery.disableAnimationsOf(context)
                  ? 1
                  : HxMotion.ease.transform(_c.value),
            ),
            child: child,
          ),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: widget.center,
            ),
          ),
        ),
      ),
    );
  }
}

class _DialPainter extends CustomPainter {
  _DialPainter(this.d, this.h, this.t);
  final _Dial d;
  final Hx h;
  final double t;

  static const a0 = -135 * math.pi / 180;
  static const sweep = 270 * math.pi / 180;

  double _f(int ms) => ((ms - d.from) / (d.to - d.from)).clamp(0.0, 1.0);

  Offset _pt(Offset c, double r, double f) {
    final a = a0 + sweep * f;
    return Offset(c.dx + r * math.sin(a), c.dy - r * math.cos(a));
  }

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final r = size.width / 2 - 14;
    final rect = Rect.fromCircle(center: c, radius: r);
    // Flutter 的角度从 3 点钟方向起算，顺时针；我们的 0 在 7 点半方向
    const start = math.pi / 2 + math.pi / 4;
    final track = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12
      ..strokeCap = StrokeCap.round
      ..color = h.track;
    canvas.drawArc(rect, start, sweep, false, track);
    final tick = Paint()
      ..strokeWidth = 1.5
      ..strokeCap = StrokeCap.round
      ..color = h.lineStrong;
    for (var i = 0; i <= 10; i++) {
      canvas.drawLine(
        _pt(c, r - 18, i / 10),
        _pt(c, r - (i % 5 == 0 ? 28 : 24), i / 10),
        tick,
      );
    }
    final fNow = _f(d.now);
    if (d.start != null) {
      final fIn = _f(d.start!);
      if (fNow > fIn) {
        canvas.drawArc(
          rect,
          start + sweep * fIn,
          sweep * (fNow - fIn) * t,
          false,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 12
            ..strokeCap = StrokeCap.round
            ..color = h.accent,
        );
      }
      final p = _pt(c, r, fIn);
      canvas.drawCircle(p, 8, Paint()..color = h.surface);
      canvas.drawCircle(
        p,
        8,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3.5
          ..color = h.accent,
      );
    }
    if (d.now >= d.from && d.now <= d.to) {
      final p = _pt(c, r, fNow);
      canvas.drawCircle(p, 9, Paint()..color = h.surface);
      canvas.drawCircle(p, 7, Paint()..color = h.now);
    }
    void label(String text, double f, double dx) {
      final tp = TextPainter(
        text: TextSpan(
          text: text,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: h.sub,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      final p = _pt(c, r, f);
      tp.paint(canvas, Offset(p.dx - tp.width / 2 + dx, p.dy + 14));
    }

    label(d.labels.$1, 0, -6);
    label(d.labels.$2, 1, 6);
  }

  @override
  bool shouldRepaint(_DialPainter old) =>
      old.t != t || old.d.now != d.now || old.d.start != d.start || old.h != h;
}

class _RecordRow extends StatelessWidget {
  const _RecordRow({required this.r, required this.first});
  final AttendanceRecord r;
  final bool first;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final (String label, Color bg, Color fg) = switch (r.status) {
      'closed' => ('已签退', h.okBg, h.okInk),
      'open' => ('进行中', h.tint, h.accentText),
      _ => ('未签退', h.mutedBg, h.mutedInk),
    };
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 11),
      decoration: BoxDecoration(
        border: first ? null : Border(top: BorderSide(color: h.line)),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 52,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  shortDay(r.day),
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: h.ink,
                    fontFeatures: kTabular,
                  ),
                ),
                Text(
                  weekdayOf(r.day),
                  style: TextStyle(fontSize: 12, color: h.sub),
                ),
              ],
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  kindLabel(r.kind),
                  style: TextStyle(fontSize: 14, color: h.ink),
                ),
                Text(
                  '${hhmm(r.inAt)} – ${r.outAt == null ? '进行中' : hhmm(r.outAt!)}',
                  style: TextStyle(
                    fontSize: 12,
                    color: h.sub,
                    fontFeatures: kTabular,
                  ),
                ),
              ],
            ),
          ),
          HxTag(label, bg: bg, fg: fg),
        ],
      ),
    );
  }
}
