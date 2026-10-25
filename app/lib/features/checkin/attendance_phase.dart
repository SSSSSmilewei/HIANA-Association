import 'dart:math' as math;

import '../../data/models.dart';

/// 把签到接口的状态归成几种情况，首页卡片和签到页共用（和网页端 src/client/attendance.ts 一致）。
sealed class Phase {
  const Phase();
}

/// 有进行中的签到。
class PhaseIn extends Phase {
  const PhaseIn({required this.scene, required this.inAt, required this.minutes, required this.endsAt});
  final String scene; // evening | venue
  final int inAt;
  final int minutes;
  final int endsAt;
}

/// 晚自习签到时间内，还没签。
class PhaseOpen extends Phase {
  const PhaseOpen({required this.remaining});
  final int remaining; // 分钟
}

/// 今晚已经签过。
class PhaseDone extends Phase {
  const PhaseDone({required this.inAt, this.outAt, required this.auto});
  final int inAt;
  final int? outAt;
  final bool auto; // 没签退，到点自动结束的
}

/// 今天有晚自习，还没到签到时间。
class PhaseLater extends Phase {
  const PhaseLater({required this.opensAt});
  final int opensAt;
}

/// 今天没有晚自习（或已经结束）。
class PhaseNone extends Phase {
  const PhaseNone({this.next});
  final String? next; // 下次是星期几
}

const _dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

String kindLabel(String kind) => kind == 'evening' ? '晚自习' : '大创场地';

String daysText(List<int> days) => days.map((d) => _dayNames[d]).join('、');

/// 当天 23:59:59（北京时间）：场地签到自动结束的时间。
int venueEnd(String day) => DateTime.parse('${day}T23:59:59+08:00').millisecondsSinceEpoch;

/// 某天某时刻（北京时间）的毫秒时间戳。
int cnTime(String day, String hhmm) => DateTime.parse('${day}T$hhmm:00+08:00').millisecondsSinceEpoch;

String? nextEvening(List<int> days, String today) {
  if (days.isEmpty) return null;
  final wd = DateTime.parse('${today}T00:00:00Z').weekday; // 1 = 周一
  for (var i = 1; i <= 7; i++) {
    final d = (wd - 1 + i) % 7 + 1;
    if (days.contains(d)) return i == 1 ? '明天' : _dayNames[d];
  }
  return null;
}

Phase phaseOf(AttendanceState s, int now) {
  if (s.isIn) {
    final endsAt = s.currentKind == 'evening' ? s.evening.endsAt : venueEnd(s.today);
    final inAt = s.currentInAt ?? now;
    return PhaseIn(scene: s.currentKind!, inAt: inAt, minutes: math.max(0, ((now - inAt) / 60000).floor()), endsAt: endsAt);
  }
  final ev = s.evening;
  final rec = ev.record;
  if (ev.isDay && rec != null) return PhaseDone(inAt: rec.inAt, outAt: rec.outAt, auto: rec.status == 'auto_closed');
  if (ev.isDay && now < ev.opensAt) return PhaseLater(opensAt: ev.opensAt);
  if (ev.isDay && now <= ev.endsAt) return PhaseOpen(remaining: math.max(0, ((ev.endsAt - now) / 60000).round()));
  return PhaseNone(next: nextEvening(ev.days, s.today));
}
