/// 接口返回的数据结构，对照网页端 src/shared/api.ts 与 src/shared/content.ts 一一写成。
/// 后端改了字段，这里和 api.ts 要一起改。
library;

import '../core/heatmap.dart';

class Member {
  const Member({required this.id, required this.studentNo, required this.name, this.className});
  final String id;
  final String studentNo;
  final String name;
  final String? className;

  factory Member.fromJson(Map<String, dynamic> j) => Member(
        id: j['id'] as String,
        studentNo: j['studentNo'] as String,
        name: j['name'] as String,
        className: j['className'] as String?,
      );
}

/// `/api/auth/me` 以及登录、激活的返回。App 只处理学员；会长后台留在网页。
class Me {
  const Me({required this.role, this.needsPassword = false, this.member});
  const Me.guest() : this(role: null);

  final String? role; // "member" | "admin" | null
  final bool needsPassword; // 刚用口令激活，还没设置自己的密码
  final Member? member;

  bool get isMember => role == 'member' && member != null;

  factory Me.fromJson(Map<String, dynamic> j) => Me(
        role: j['role'] as String?,
        needsPassword: j['needsPassword'] as bool? ?? false,
        member: j['member'] == null ? null : Member.fromJson(j['member'] as Map<String, dynamic>),
      );
}

class CourseTask {
  const CourseTask({required this.title, required this.detail, this.href});
  final String title;
  final String detail;
  final String? href;

  factory CourseTask.fromJson(Map<String, dynamic> j) =>
      CourseTask(title: j['title'] as String, detail: j['detail'] as String, href: j['href'] as String?);
}

class CourseWeek {
  const CourseWeek({
    required this.title,
    required this.summary,
    required this.lectureCn,
    required this.official,
    required this.tasks,
  });
  final String title;
  final String summary;
  final String lectureCn; // B 站搜索结果页：国内能打开
  final String official;
  final List<CourseTask> tasks;

  factory CourseWeek.fromJson(Map<String, dynamic> j) => CourseWeek(
        title: j['title'] as String,
        summary: j['summary'] as String,
        lectureCn: j['lectureCn'] as String,
        official: j['official'] as String,
        tasks: (j['tasks'] as List).map((t) => CourseTask.fromJson(t as Map<String, dynamic>)).toList(),
      );
}

/// `/api/course`
class Course {
  const Course({required this.name, required this.weeks, required this.currentWeek});
  final String name;
  final List<CourseWeek> weeks;
  final int currentWeek;

  CourseWeek? get thisWeek => currentWeek >= 0 && currentWeek < weeks.length ? weeks[currentWeek] : null;

  factory Course.fromJson(Map<String, dynamic> j) {
    final track = j['track'] as Map<String, dynamic>;
    return Course(
      name: track['name'] as String,
      weeks: (track['weeks'] as List).map((w) => CourseWeek.fromJson(w as Map<String, dynamic>)).toList(),
      currentWeek: (j['currentWeek'] as num).toInt(),
    );
  }
}

/// `GET /api/checkin`
class CheckinState {
  const CheckinState({
    required this.today,
    required this.window,
    required this.requireCode,
    required this.checkedAt,
    required this.total,
  });
  final String today;
  final String window; // 例如 "19:00-21:30"
  final bool requireCode;
  final int? checkedAt; // 毫秒时间戳；null 表示今晚还没打卡
  final int total;

  String get windowText => window.replaceAll('-', ' 到 ');

  factory CheckinState.fromJson(Map<String, dynamic> j) => CheckinState(
        today: j['today'] as String,
        window: j['window'] as String,
        requireCode: j['requireCode'] as bool,
        checkedAt: (j['checkedAt'] as num?)?.toInt(),
        total: (j['total'] as num).toInt(),
      );
}

/// `POST /api/checkin`：ok 或 already；时间外、口令不对由后端返回错误文案。
class CheckinResult {
  const CheckinResult({required this.ok, required this.at});
  final bool ok;
  final int at;

  factory CheckinResult.fromJson(Map<String, dynamic> j) =>
      CheckinResult(ok: j['ok'] as bool, at: (j['at'] as num).toInt());
}

class ProviderInfo {
  const ProviderInfo({
    required this.id,
    required this.label,
    required this.unit,
    required this.category,
    required this.status,
    required this.coverage,
    required this.handleHint,
    this.needsUserSecret,
  });
  final String id;
  final String label;
  final String unit;
  final String category; // code | algo | english
  final String status; // official | unofficial | pending
  final String coverage; // history | snapshot
  final String handleHint;
  final String? needsUserSecret; // 需要学员自己填令牌时，这里是提示文字

  bool get available => status != 'pending';

  factory ProviderInfo.fromJson(Map<String, dynamic> j) => ProviderInfo(
        id: j['id'] as String,
        label: j['label'] as String,
        unit: j['unit'] as String,
        category: j['category'] as String,
        status: j['status'] as String,
        coverage: j['coverage'] as String,
        handleHint: j['handleHint'] as String,
        needsUserSecret: j['needsUserSecret'] as String?,
      );
}

class BindingInfo {
  const BindingInfo({required this.source, required this.handle, required this.hasSecret, this.syncedAt, this.lastError});
  final String source;
  final String handle;
  final bool hasSecret;
  final int? syncedAt;
  final String? lastError;

  factory BindingInfo.fromJson(Map<String, dynamic> j) => BindingInfo(
        source: j['source'] as String,
        handle: j['handle'] as String,
        hasSecret: j['hasSecret'] as bool? ?? false,
        syncedAt: (j['syncedAt'] as num?)?.toInt(),
        lastError: j['lastError'] as String?,
      );
}

/// `GET /api/heatmap`
class HeatmapPayload {
  const HeatmapPayload({required this.today, required this.series, required this.bindings, required this.providers});
  final String today;
  final List<SourceSeries> series;
  final List<BindingInfo> bindings;
  final List<ProviderInfo> providers;

  BindingInfo? bindingOf(String source) {
    for (final b in bindings) {
      if (b.source == source) return b;
    }
    return null;
  }

  factory HeatmapPayload.fromJson(Map<String, dynamic> j) => HeatmapPayload(
        today: j['today'] as String,
        series: (j['series'] as List).map((s) => SourceSeries.fromJson(s as Map<String, dynamic>)).toList(),
        bindings: (j['bindings'] as List).map((b) => BindingInfo.fromJson(b as Map<String, dynamic>)).toList(),
        providers: (j['providers'] as List).map((p) => ProviderInfo.fromJson(p as Map<String, dynamic>)).toList(),
      );
}

/// `GET /api/app/version`
class AppVersion {
  const AppVersion({required this.latest, required this.min, this.apkUrl});
  final String latest;
  final String min; // 当前版本低于它时必须更新
  final String? apkUrl;

  factory AppVersion.fromJson(Map<String, dynamic> j) =>
      AppVersion(latest: j['latest'] as String, min: j['min'] as String, apkUrl: j['apkUrl'] as String?);
}

/// 比较 "1.2.10" 这样的版本号：a < b 返回负数。
int compareVersion(String a, String b) {
  List<int> parts(String v) => v.split('+').first.split('.').map((p) => int.tryParse(p) ?? 0).toList();
  final x = parts(a), y = parts(b);
  for (var i = 0; i < 3; i++) {
    final d = (i < x.length ? x[i] : 0) - (i < y.length ? y[i] : 0);
    if (d != 0) return d;
  }
  return 0;
}
