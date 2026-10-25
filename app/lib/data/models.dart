/// 接口返回的数据结构，对照网页端 src/client/types.ts 一一写成。
/// 后端改了字段，这里和 types.ts 要一起改。
library;

import '../core/heatmap.dart';

int? _int(Object? v) => (v as num?)?.toInt();
List<T> _list<T>(Object? v, T Function(Map<String, dynamic>) f) =>
    (v as List? ?? const []).map((e) => f(e as Map<String, dynamic>)).toList();

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

/// `/api/auth/me` 以及登录、激活的返回。App 给学员用（会长、老师也是学员账号，后台留在网页）。
class Me {
  const Me({required this.role, this.needsPassword = false, this.isAdmin = false, this.member});
  const Me.guest() : this(role: null);

  final String? role; // "member" | "admin" | null
  final bool needsPassword; // 刚用口令激活，还没设置自己的密码
  final bool isAdmin;
  final Member? member;

  bool get isMember => role == 'member' && member != null;

  factory Me.fromJson(Map<String, dynamic> j) => Me(
        role: j['role'] as String?,
        needsPassword: j['needsPassword'] as bool? ?? false,
        isAdmin: j['isAdmin'] as bool? ?? false,
        member: j['member'] == null ? null : Member.fromJson(j['member'] as Map<String, dynamic>),
      );
}

/// `GET /api/calendar`：教学周。
class CalendarInfo {
  const CalendarInfo({required this.today, this.week});
  final String today;
  final int? week;

  factory CalendarInfo.fromJson(Map<String, dynamic> j) => CalendarInfo(today: j['today'] as String, week: _int(j['week']));
}

/* ---------- 签到 ---------- */

class EveningRecord {
  const EveningRecord({required this.inAt, this.outAt, required this.status});
  final int inAt;
  final int? outAt;
  final String status; // open | closed | auto_closed

  factory EveningRecord.fromJson(Map<String, dynamic> j) =>
      EveningRecord(inAt: _int(j['in_at'])!, outAt: _int(j['out_at']), status: j['status'] as String);
}

class Evening {
  const Evening({
    required this.days,
    required this.windowStart,
    required this.windowEnd,
    required this.isDay,
    required this.open,
    required this.opensAt,
    required this.endsAt,
    required this.requireCode,
    this.record,
  });
  final List<int> days; // 1 = 周一 … 7 = 周日
  final String windowStart;
  final String windowEnd;
  final bool isDay;
  final bool open;
  final int opensAt;
  final int endsAt;
  final bool requireCode;
  final EveningRecord? record;

  factory Evening.fromJson(Map<String, dynamic> j) {
    final w = (j['window'] as List).cast<String>();
    return Evening(
      days: (j['days'] as List).map((d) => (d as num).toInt()).toList(),
      windowStart: w[0],
      windowEnd: w[1],
      isDay: j['isDay'] as bool,
      open: j['open'] as bool,
      opensAt: _int(j['opensAt'])!,
      endsAt: _int(j['endsAt'])!,
      requireCode: j['requireCode'] as bool,
      record: j['record'] == null ? null : EveningRecord.fromJson(j['record'] as Map<String, dynamic>),
    );
  }
}

class AttendanceRecord {
  const AttendanceRecord({required this.id, required this.kind, required this.day, required this.inAt, this.outAt, required this.status});
  final String id;
  final String kind; // evening | venue
  final String day;
  final int inAt;
  final int? outAt;
  final String status;

  factory AttendanceRecord.fromJson(Map<String, dynamic> j) => AttendanceRecord(
        id: j['id'] as String,
        kind: j['kind'] as String,
        day: j['day'] as String,
        inAt: _int(j['inAt'])!,
        outAt: _int(j['outAt']),
        status: j['status'] as String,
      );
}

/// `GET /api/attendance`
class AttendanceState {
  const AttendanceState({
    required this.now,
    required this.today,
    required this.evening,
    this.currentKind,
    this.currentInAt,
    required this.recent,
    required this.eveningTotal,
    required this.venueTotal,
  });
  final int now;
  final String today;
  final Evening evening;
  final String? currentKind; // 进行中的签到：evening | venue
  final int? currentInAt;
  final List<AttendanceRecord> recent;
  final int eveningTotal;
  final int venueTotal;

  bool get isIn => currentKind != null;

  factory AttendanceState.fromJson(Map<String, dynamic> j) {
    final cur = j['current'] as Map<String, dynamic>?;
    final totals = j['totals'] as Map<String, dynamic>? ?? const {};
    return AttendanceState(
      now: _int(j['now'])!,
      today: j['today'] as String,
      evening: Evening.fromJson(j['evening'] as Map<String, dynamic>),
      currentKind: cur?['kind'] as String?,
      currentInAt: _int(cur?['inAt']),
      recent: _list(j['recent'], AttendanceRecord.fromJson),
      eveningTotal: _int(totals['evening']) ?? 0,
      venueTotal: _int(totals['venue']) ?? 0,
    );
  }
}

/* ---------- 课程 ---------- */

class CourseLink {
  const CourseLink(this.label, this.url);
  final String label;
  final String url;

  factory CourseLink.fromJson(Map<String, dynamic> j) => CourseLink(j['label'] as String, j['url'] as String);
}

class Unit {
  const Unit({required this.id, required this.title, required this.kind, required this.periods, required this.links, this.note});
  final String id;
  final String title;
  final String kind; // lecture | pset | practice | reading | project
  final int periods;
  final List<CourseLink> links;
  final String? note;

  String get kindLabel => const {'lecture': '讲座', 'pset': '习题', 'practice': '练习', 'reading': '阅读', 'project': '项目'}[kind] ?? kind;

  factory Unit.fromJson(Map<String, dynamic> j) => Unit(
        id: j['id'] as String,
        title: j['title'] as String,
        kind: j['kind'] as String,
        periods: _int(j['periods']) ?? 0,
        links: _list(j['links'], CourseLink.fromJson),
        note: j['note'] as String?,
      );
}

class Progress {
  const Progress({required this.doneUnits, required this.units, required this.donePeriods, required this.totalPeriods, required this.ratio});
  final int doneUnits;
  final int units;
  final int donePeriods;
  final int totalPeriods;
  final double ratio;

  factory Progress.fromJson(Map<String, dynamic> j) => Progress(
        doneUnits: _int(j['doneUnits']) ?? 0,
        units: _int(j['units']) ?? 0,
        donePeriods: _int(j['donePeriods']) ?? 0,
        totalPeriods: _int(j['totalPeriods']) ?? 0,
        ratio: (j['ratio'] as num? ?? 0).toDouble(),
      );
}

const kAreas = [('all', '全部'), ('tools', '开发者素养'), ('programming', '编程入门'), ('math', '数学基础'), ('systems', '计算机系统')];
const kDifficulty = ['', '入门', '中等', '较难', '难', '很难'];
const kAccess = {'good': '国内能顺利学', 'partial': '部分环节要软路由', 'hard': '需要软路由'};

/// 课程卡片上的小标签：学校 · 课号。
String courseCode(String slug, String university) {
  const uni = {'哈佛大学': 'HARVARD', 'MIT': 'MIT', 'UC Berkeley': 'BERKELEY', '协会自编': 'HIANA'};
  const short = {'missing-semester': 'MISSING SEMESTER', 'git': 'GIT', 'cs50x': 'CS50x', 'cs50p': 'CS50P', 'cs61a': 'CS61A', 'mit-1801': '18.01'};
  return '${uni[university] ?? university} · ${short[slug] ?? slug.toUpperCase()}';
}

/// 目录里的一门课（不带单元）。
class CourseSummary {
  const CourseSummary({
    required this.slug,
    required this.title,
    required this.university,
    required this.area,
    required this.difficulty,
    required this.required,
    required this.summary,
    required this.prerequisites,
    required this.accessLevel,
    required this.learners,
    required this.enrollStatus,
    required this.progress,
  });
  final String slug;
  final String title;
  final String university;
  final String area;
  final int difficulty;
  final bool required;
  final String summary;
  final String prerequisites;
  final String accessLevel;
  final int learners;
  final String? enrollStatus; // active | paused | done | dropped | null
  final Progress progress;

  String get code => courseCode(slug, university);

  factory CourseSummary.fromJson(Map<String, dynamic> j) => CourseSummary(
        slug: j['slug'] as String,
        title: j['title'] as String,
        university: j['university'] as String,
        area: j['area'] as String,
        difficulty: _int(j['difficulty']) ?? 1,
        required: j['required'] as bool? ?? false,
        summary: j['summary'] as String? ?? '',
        prerequisites: j['prerequisites'] as String? ?? '',
        accessLevel: (j['access'] as Map<String, dynamic>?)?['level'] as String? ?? 'good',
        learners: _int(j['learners']) ?? 0,
        enrollStatus: (j['enrollment'] as Map<String, dynamic>?)?['status'] as String?,
        progress: Progress.fromJson(j['progress'] as Map<String, dynamic>),
      );
}

/// `GET /api/courses/:slug`
class CourseDetail {
  const CourseDetail({
    required this.slug,
    required this.title,
    this.titleEn,
    required this.university,
    required this.summary,
    this.why,
    required this.video,
    required this.homework,
    required this.license,
    required this.units,
    required this.resources,
    required this.enrollStatus,
    required this.done,
    required this.peers,
  });
  final String slug;
  final String title;
  final String? titleEn;
  final String university;
  final String summary;
  final String? why;
  final String video;
  final String homework;
  final String license;
  final List<Unit> units;
  final List<CourseLink> resources;
  final String? enrollStatus;
  final Set<String> done;
  final List<String> peers;

  String get code => courseCode(slug, university);
  int get totalPeriods => units.fold(0, (n, u) => n + u.periods);
  int get donePeriods => units.where((u) => done.contains(u.id)).fold(0, (n, u) => n + u.periods);
  Unit? get next {
    for (final u in units) {
      if (!done.contains(u.id)) return u;
    }
    return null;
  }

  CourseDetail copyWith({Set<String>? done, String? enrollStatus}) => CourseDetail(
        slug: slug,
        title: title,
        titleEn: titleEn,
        university: university,
        summary: summary,
        why: why,
        video: video,
        homework: homework,
        license: license,
        units: units,
        resources: resources,
        enrollStatus: enrollStatus ?? this.enrollStatus,
        done: done ?? this.done,
        peers: peers,
      );

  factory CourseDetail.fromJson(Map<String, dynamic> j) {
    final c = j['course'] as Map<String, dynamic>;
    final access = c['access'] as Map<String, dynamic>? ?? const {};
    return CourseDetail(
      slug: c['slug'] as String,
      title: c['title'] as String,
      titleEn: c['titleEn'] as String?,
      university: c['university'] as String,
      summary: c['summary'] as String? ?? '',
      why: c['why'] as String?,
      video: access['video'] as String? ?? '',
      homework: access['homework'] as String? ?? '',
      license: c['license'] as String? ?? '',
      units: _list(c['units'], Unit.fromJson),
      resources: _list(c['resources'], CourseLink.fromJson),
      enrollStatus: (j['enrollment'] as Map<String, dynamic>?)?['status'] as String?,
      done: (j['done'] as Map<String, dynamic>? ?? const {}).keys.toSet(),
      peers: (j['peers'] as List? ?? const []).cast<String>(),
    );
  }
}

/// 首页“接下来”的一项。
class NextItem {
  const NextItem({required this.slug, required this.title, this.next, required this.progress});
  final String slug;
  final String title;
  final Unit? next;
  final Progress progress;

  factory NextItem.fromJson(Map<String, dynamic> j) => NextItem(
        slug: j['slug'] as String,
        title: j['title'] as String,
        next: j['next'] == null ? null : Unit.fromJson(j['next'] as Map<String, dynamic>),
        progress: Progress.fromJson(j['progress'] as Map<String, dynamic>),
      );
}

/* ---------- 公告 ---------- */

class Entry {
  const Entry({required this.name, this.team, this.contact});
  final String name;
  final String? team;
  final String? contact;

  factory Entry.fromJson(Map<String, dynamic> j) => Entry(name: j['name'] as String, team: j['team'] as String?, contact: j['contact'] as String?);
}

class Notice {
  const Notice({
    required this.id,
    required this.kind,
    required this.title,
    required this.body,
    this.docUrl,
    this.groupInfo,
    this.deadline,
    required this.tags,
    required this.pinned,
    this.author,
    required this.createdAt,
    required this.entries,
    required this.joined,
  });
  final String id;
  final String kind; // notice | competition
  final String title;
  final String body;
  final String? docUrl;
  final String? groupInfo;
  final String? deadline;
  final List<String> tags;
  final bool pinned;
  final String? author;
  final int createdAt;
  final List<Entry> entries;
  final bool joined;

  bool get isCompetition => kind == 'competition';

  factory Notice.fromJson(Map<String, dynamic> j) => Notice(
        id: j['id'] as String,
        kind: j['kind'] as String,
        title: j['title'] as String,
        body: j['body'] as String? ?? '',
        docUrl: j['docUrl'] as String?,
        groupInfo: j['groupInfo'] as String?,
        deadline: j['deadline'] as String?,
        tags: (j['tags'] as List? ?? const []).cast<String>(),
        pinned: j['pinned'] as bool? ?? false,
        author: j['author'] as String?,
        createdAt: _int(j['createdAt']) ?? 0,
        entries: _list(j['entries'], Entry.fromJson),
        joined: j['joined'] as bool? ?? false,
      );
}

/* ---------- 热力图 ---------- */

class ProviderInfo {
  const ProviderInfo({
    required this.id,
    required this.label,
    required this.unit,
    required this.category,
    required this.status,
    required this.handleHint,
    this.needsUserSecret,
  });
  final String id;
  final String label;
  final String unit;
  final String category; // code | algo | english
  final String status; // official | unofficial | pending
  final String handleHint;
  final String? needsUserSecret;

  bool get available => status != 'pending';

  factory ProviderInfo.fromJson(Map<String, dynamic> j) => ProviderInfo(
        id: j['id'] as String,
        label: j['label'] as String,
        unit: j['unit'] as String,
        category: j['category'] as String,
        status: j['status'] as String,
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
        syncedAt: _int(j['syncedAt']),
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
        series: _list(j['series'], SourceSeries.fromJson),
        bindings: _list(j['bindings'], BindingInfo.fromJson),
        providers: _list(j['providers'], ProviderInfo.fromJson),
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
