/// 接口返回的数据结构，对照网页端 src/client/types.ts 一一写成。
/// 后端改了字段，这里和 types.ts 要一起改。
library;

import '../core/heatmap.dart';

int? _int(Object? v) => (v as num?)?.toInt();
List<T> _list<T>(Object? v, T Function(Map<String, dynamic>) f) =>
    (v as List? ?? const []).map((e) => f(e as Map<String, dynamic>)).toList();

/// 账号：校内（campus，学号登录，能签到）或校外（external，用户名或邮箱登录，不签到，看不到成员真名）。
class Member {
  const Member({
    required this.id,
    this.kind = 'campus',
    required this.studentNo,
    this.username,
    this.email,
    this.org,
    required this.name,
    this.displayName,
    this.className,
  });
  final String id;
  final String kind;
  final String studentNo; // 校外账号是空字符串
  final String? username;
  final String? email;
  final String? org; // 校外账号的学校 / 单位
  final String name; // 校内是真名，校外是昵称
  final String? displayName; // 首页欢迎语用的称呼，没设时为 null
  final String? className;

  bool get isExternal => kind == 'external';

  /// 登录用的账号：校内是学号，校外是用户名
  String get account => isExternal ? (username ?? '') : studentNo;

  factory Member.fromJson(Map<String, dynamic> j) => Member(
    id: j['id'] as String,
    kind: j['kind'] as String? ?? 'campus',
    studentNo: j['studentNo'] as String? ?? '',
    username: j['username'] as String?,
    email: j['email'] as String?,
    org: j['org'] as String?,
    name: j['name'] as String,
    displayName: j['displayName'] as String?,
    className: j['className'] as String?,
  );
}

/// `/api/auth/me` 以及登录、注册、重置密码的返回。
/// role 为 null 是游客（没登录）：能看首页、课程、公告。会长、老师也是 member，isAdmin 为 true（后台在网页上）。
class Me {
  const Me({required this.role, this.isAdmin = false, this.member});
  const Me.guest() : this(role: null);

  final String? role; // "member" | null
  final bool isAdmin;
  final Member? member;

  bool get isMember => role == 'member' && member != null;
  bool get isGuest => !isMember;

  factory Me.fromJson(Map<String, dynamic> j) => Me(
    role: j['role'] as String?,
    isAdmin: j['isAdmin'] as bool? ?? false,
    member: j['member'] == null
        ? null
        : Member.fromJson(j['member'] as Map<String, dynamic>),
  );
}

/// `GET /api/calendar`：教学周。
class CalendarInfo {
  const CalendarInfo({required this.today, this.week});
  final String today;
  final int? week;

  factory CalendarInfo.fromJson(Map<String, dynamic> j) =>
      CalendarInfo(today: j['today'] as String, week: _int(j['week']));
}

/* ---------- 签到 ---------- */

class EveningRecord {
  const EveningRecord({required this.inAt, this.outAt, required this.status});
  final int inAt;
  final int? outAt;
  final String status; // open | closed | auto_closed

  factory EveningRecord.fromJson(Map<String, dynamic> j) => EveningRecord(
    inAt: _int(j['in_at'])!,
    outAt: _int(j['out_at']),
    status: j['status'] as String,
  );
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
      record: j['record'] == null
          ? null
          : EveningRecord.fromJson(j['record'] as Map<String, dynamic>),
    );
  }
}

class AttendanceRecord {
  const AttendanceRecord({
    required this.id,
    required this.kind,
    required this.day,
    required this.inAt,
    this.outAt,
    required this.status,
  });
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

/* ---------- 课程（课程包 hiana-course@1，格式见网站 src/shared/package.ts） ---------- */

const kItemKindLabel = {
  'lecture': '讲义',
  'section': '讨论课',
  'reading': '阅读',
  'video': '视频',
  'assignment': '作业',
  'lab': '实验',
  'project': '项目',
  'quiz': '测验',
  'exam': '考试',
  'pset': '作业', // 旧版接口
};

const kLinkKindLabel = {
  'website': '课程网站',
  'video': '视频',
  'notes': '讲义',
  'slides': '幻灯片',
  'textbook': '教材',
  'assignments': '作业',
  'labs': '实验',
  'exams': '考试',
  'forum': '讨论区',
  'repo': '代码仓库',
  'translation': '中文资料',
  'other': '其他',
};

class CourseLink {
  const CourseLink(this.label, this.url, {this.kind = 'other'});
  final String label;
  final String url;
  final String kind;

  factory CourseLink.fromJson(Map<String, dynamic> j) => CourseLink(
    j['label'] as String,
    j['url'] as String,
    kind: j['kind'] as String? ?? 'other',
  );
}

/// 条目里的一页正文。body 只有发布的课程包里才有，仓库自带的课正文在 `/learn/<slug>/<id>.md`。
class LessonRef {
  const LessonRef(this.id, this.title, {this.body});
  final String id;
  final String title;
  final String? body;

  factory LessonRef.fromJson(Map<String, dynamic> j) => LessonRef(
    j['id'] as String,
    j['title'] as String,
    body: j['body'] as String?,
  );
}

/// 练手题。代码题（Python / SQL / JavaScript）在 App 里不判，跳到网页做。
class Practice {
  const Practice({
    required this.id,
    required this.type,
    this.title,
    required this.prompt,
    this.explain,
    this.options = const [],
    this.choiceAnswer = const {},
    this.multi = false,
    this.textAnswer = const [],
    this.lang,
    this.origin,
  });
  final String id;
  final String type; // choice | text | code
  final String? title;
  final String prompt;
  final String? explain;
  final List<String> options;
  final Set<int> choiceAnswer;
  final bool multi;
  final List<String> textAnswer;
  final String? lang;

  /// 出处：official = 官方习题改编，review = 复习题
  final String? origin;
  String? get originLabel => switch (origin) {
    'official' => '官方习题改编',
    'review' => '复习题',
    _ => null,
  };

  String get heading =>
      title ??
      switch (type) {
        'choice' => multi ? '多选' : '单选',
        'text' => '填空',
        _ =>
          const {
                'python': 'Python',
                'sql': 'SQL',
                'javascript': 'JavaScript',
              }[lang] ??
              '代码',
      };

  static String normalize(String s) =>
      s.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase();
  bool checkText(String v) =>
      textAnswer.any((a) => normalize(a) == normalize(v));

  factory Practice.fromJson(Map<String, dynamic> j) {
    final type = j['type'] as String;
    final a = j['answer'];
    return Practice(
      id: j['id'] as String,
      type: type,
      title: j['title'] as String?,
      prompt: j['prompt'] as String? ?? '',
      explain: j['explain'] as String?,
      options: type == 'choice'
          ? (j['options'] as List).cast<String>()
          : const [],
      choiceAnswer: type == 'choice'
          ? (a is List
                ? a.map((e) => (e as num).toInt()).toSet()
                : {(a as num).toInt()})
          : const {},
      multi: type == 'choice' && a is List,
      textAnswer: type == 'text' ? (a as List).cast<String>() : const [],
      lang: j['lang'] as String?,
      origin: j['origin'] as String?,
    );
  }
}

/// 条目：讲义、阅读、视频、作业、实验、项目、测验、考试。
/// 目录接口里只有练手题的数量（practiceCount），完整课程包里才有题目本身（practice）。
class CourseItem {
  const CourseItem({
    required this.id,
    required this.title,
    required this.kind,
    required this.periods,
    required this.pages,
    this.optional = false,
    this.videos = const [],
    this.links = const [],
    this.submit,
    this.practice = const [],
    this.practiceCount = 0,
  });
  final String id;
  final String title;
  final String kind;
  final int periods;
  final List<LessonRef> pages;

  /// 选学（例如 CS50 的 Section）
  final bool optional;
  final List<CourseLink> videos;
  final List<CourseLink> links;
  final CourseLink? submit;
  final List<Practice> practice;
  final int practiceCount;

  String get kindLabel => kItemKindLabel[kind] ?? kind;
  bool get isTask =>
      kind == 'assignment' ||
      kind == 'lab' ||
      kind == 'project' ||
      kind == 'pset';
  int get practiceTotal =>
      practice.isNotEmpty ? practice.length : practiceCount;

  /// 进入这个条目时打开的页：第一页，没有页就用条目 id
  String get entry => pages.isNotEmpty ? pages.first.id : id;

  factory CourseItem.fromJson(Map<String, dynamic> j) {
    final p = j['practice'];
    return CourseItem(
      id: j['id'] as String,
      title: j['title'] as String,
      kind: j['kind'] as String? ?? 'lecture',
      periods: _int(j['periods']) ?? 2,
      pages: _list(j['pages'], LessonRef.fromJson),
      optional: j['optional'] == true,
      videos: _list(j['videos'], CourseLink.fromJson),
      links: _list(j['links'], CourseLink.fromJson),
      submit: j['submit'] == null
          ? null
          : CourseLink.fromJson(j['submit'] as Map<String, dynamic>),
      practice: p is List ? _list(p, Practice.fromJson) : const [],
      practiceCount: p is num ? p.toInt() : (p is List ? p.length : 0),
    );
  }
}

class CourseModule {
  const CourseModule({
    required this.id,
    required this.title,
    required this.items,
    this.group,
  });
  final String id;
  final String title;
  final List<CourseItem> items;

  /// 模块上面一层的分组，例如 MIT 18.01 的“单元 1”
  final String? group;

  factory CourseModule.fromJson(Map<String, dynamic> j) => CourseModule(
    id: j['id'] as String,
    title: j['title'] as String,
    group: j['group'] as String?,
    items: _list(j['items'], CourseItem.fromJson),
  );
}

class Progress {
  const Progress({
    required this.doneItems,
    required this.items,
    required this.donePeriods,
    required this.totalPeriods,
    required this.ratio,
  });
  final int doneItems;
  final int items;
  final int donePeriods;
  final int totalPeriods;
  final double ratio;

  factory Progress.fromJson(Map<String, dynamic> j) => Progress(
    doneItems: _int(j['doneItems']) ?? _int(j['doneUnits']) ?? 0,
    items: _int(j['items']) ?? _int(j['units']) ?? 0,
    donePeriods: _int(j['donePeriods']) ?? 0,
    totalPeriods: _int(j['totalPeriods']) ?? 0,
    ratio: (j['ratio'] as num? ?? 0).toDouble(),
  );
}

/// 难度：csdiy 的星数，0 = 不适用
String stars(int n) =>
    n <= 0 ? '' : '★' * n.clamp(1, 5) + '☆' * (5 - n.clamp(1, 5));

/// 目录里的一门课（不带条目）。
class CourseSummary {
  const CourseSummary({
    required this.slug,
    required this.title,
    this.titleEn,
    required this.category,
    required this.provider,
    required this.difficulty,
    required this.hours,
    required this.summary,
    required this.language,
    required this.itemCount,
    required this.learners,
    required this.enrollStatus,
    required this.progress,
  });
  final String slug;
  final String title;
  final String? titleEn;
  final String category;
  final String provider;
  final int difficulty;
  final String hours;
  final String summary;
  final String language;
  final int itemCount;
  final int learners;
  final String? enrollStatus; // active | paused | done | dropped | null
  final Progress progress;

  bool get hosted => itemCount > 0;

  bool matches(String q) {
    if (q.isEmpty) return true;
    final hay = '$title ${titleEn ?? ''} $provider $category $language $summary'
        .toLowerCase();
    return q.toLowerCase().split(RegExp(r'\s+')).every(hay.contains);
  }

  factory CourseSummary.fromJson(Map<String, dynamic> j) => CourseSummary(
    slug: j['slug'] as String,
    title: j['title'] as String,
    titleEn: j['titleEn'] as String?,
    category: j['category'] as String? ?? '其他',
    provider: j['provider'] as String? ?? '',
    difficulty: _int(j['difficulty']) ?? 0,
    hours: j['hours'] as String? ?? '',
    summary: j['summary'] as String? ?? '',
    language: j['language'] as String? ?? '',
    itemCount: _int(j['itemCount']) ?? 0,
    learners: _int(j['learners']) ?? 0,
    enrollStatus:
        (j['enrollment'] as Map<String, dynamic>?)?['status'] as String?,
    progress: Progress.fromJson(j['progress'] as Map<String, dynamic>),
  );
}

/// `GET /api/courses/:slug`：目录信息（模块、条目、练手题数量）+ 我的进度
class CourseDetail {
  const CourseDetail({
    required this.slug,
    required this.title,
    this.titleEn,
    required this.category,
    required this.provider,
    required this.prerequisites,
    required this.language,
    required this.hours,
    required this.difficulty,
    required this.summary,
    required this.license,
    required this.links,
    required this.modules,
    required this.enrollStatus,
    required this.done,
    required this.solved,
    required this.peers,
  });
  final String slug;
  final String title;
  final String? titleEn;
  final String category;
  final String provider;
  final String prerequisites;
  final String language;
  final String hours;
  final int difficulty;
  final String summary;
  final String license;
  final List<CourseLink> links;
  final List<CourseModule> modules;
  final String? enrollStatus;
  final Set<String> done;
  final Map<String, Set<String>> solved;
  final List<String> peers;

  List<CourseItem> get items => [for (final m in modules) ...m.items];
  bool get hosted => items.isNotEmpty;
  int get totalPeriods => items.fold(0, (n, u) => n + u.periods);
  int get donePeriods =>
      items.where((u) => done.contains(u.id)).fold(0, (n, u) => n + u.periods);
  CourseItem? get next {
    for (final u in items) {
      if (!done.contains(u.id)) return u;
    }
    return null;
  }

  CourseDetail copyWith({
    Set<String>? done,
    String? enrollStatus,
    Map<String, Set<String>>? solved,
  }) => CourseDetail(
    slug: slug,
    title: title,
    titleEn: titleEn,
    category: category,
    provider: provider,
    prerequisites: prerequisites,
    language: language,
    hours: hours,
    difficulty: difficulty,
    summary: summary,
    license: license,
    links: links,
    modules: modules,
    enrollStatus: enrollStatus ?? this.enrollStatus,
    done: done ?? this.done,
    solved: solved ?? this.solved,
    peers: peers,
  );

  factory CourseDetail.fromJson(Map<String, dynamic> j) {
    final c = j['course'] as Map<String, dynamic>;
    return CourseDetail(
      slug: c['slug'] as String,
      title: c['title'] as String,
      titleEn: c['titleEn'] as String?,
      category: c['category'] as String? ?? '',
      provider: c['provider'] as String? ?? '',
      prerequisites: c['prerequisites'] as String? ?? '',
      language: c['language'] as String? ?? '',
      hours: c['hours'] as String? ?? '',
      difficulty: _int(c['difficulty']) ?? 0,
      summary: c['summary'] as String? ?? '',
      license: c['license'] as String? ?? '',
      links: _list(c['links'], CourseLink.fromJson),
      modules: _list(c['modules'], CourseModule.fromJson),
      enrollStatus:
          (j['enrollment'] as Map<String, dynamic>?)?['status'] as String?,
      done: (j['done'] as Map<String, dynamic>? ?? const {}).keys.toSet(),
      solved: {
        for (final e
            in (j['solved'] as Map<String, dynamic>? ?? const {}).entries)
          e.key: (e.value as List).cast<String>().toSet(),
      },
      peers: (j['peers'] as List? ?? const []).cast<String>(),
    );
  }
}

/// 完整课程包（`/learn/<slug>/course.json` 或 `/api/packages/<slug>`）：介绍、条目详情、练手题。
class CoursePackage {
  const CoursePackage({
    required this.slug,
    this.community,
    this.communitySource,
    this.official,
    this.officialSource,
    required this.modules,
  });
  final String slug;
  final String? community;
  final CourseLink? communitySource;
  final String? official;
  final CourseLink? officialSource;
  final List<CourseModule> modules;

  List<CourseItem> get items => [for (final m in modules) ...m.items];

  /// 路由里的页 id 可以是页面 id，也可以是没有页面的条目 id
  (CourseItem, LessonRef?)? locate(String id) {
    for (final it in items) {
      for (final p in it.pages) {
        if (p.id == id) return (it, p);
      }
      if (it.id == id && it.pages.isEmpty) return (it, null);
    }
    return null;
  }

  factory CoursePackage.fromJson(Map<String, dynamic> j) {
    final intro = j['intro'] as Map<String, dynamic>? ?? const {};
    CourseLink? link(Object? v) =>
        v == null ? null : CourseLink.fromJson(v as Map<String, dynamic>);
    return CoursePackage(
      slug: j['slug'] as String,
      community: intro['community'] as String?,
      communitySource: link(intro['communitySource']),
      official: intro['official'] as String?,
      officialSource: link(intro['officialSource']),
      modules: _list(j['modules'], CourseModule.fromJson),
    );
  }
}

/// 首页“接下来”的一项。只有介绍的课 next 为 null。
class NextItem {
  const NextItem({
    required this.slug,
    required this.title,
    this.next,
    required this.progress,
  });
  final String slug;
  final String title;
  final CourseItem? next;
  final Progress progress;

  bool get hosted => progress.items > 0;

  factory NextItem.fromJson(Map<String, dynamic> j) => NextItem(
    slug: j['slug'] as String,
    title: j['title'] as String,
    next: j['next'] == null
        ? null
        : CourseItem.fromJson(j['next'] as Map<String, dynamic>),
    progress: Progress.fromJson(j['progress'] as Map<String, dynamic>),
  );
}

/* ---------- 公告 ---------- */

class Entry {
  const Entry({required this.name, this.team, this.contact});
  final String name;
  final String? team;
  final String? contact;

  factory Entry.fromJson(Map<String, dynamic> j) => Entry(
    name: j['name'] as String,
    team: j['team'] as String?,
    contact: j['contact'] as String?,
  );
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
    required this.entryCount,
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
  final List<Entry> entries; // 报名名单；游客看不到（为空）
  final int entryCount; // 报名人数，游客也能看到
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
    entryCount:
        _int(j['entryCount']) ?? (j['entries'] as List? ?? const []).length,
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
  const BindingInfo({
    required this.source,
    required this.handle,
    required this.hasSecret,
    this.syncedAt,
    this.lastError,
  });
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
  const HeatmapPayload({
    required this.today,
    required this.series,
    required this.bindings,
    required this.providers,
  });
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

  factory AppVersion.fromJson(Map<String, dynamic> j) => AppVersion(
    latest: j['latest'] as String,
    min: j['min'] as String,
    apkUrl: j['apkUrl'] as String?,
  );
}

/// 比较 "1.2.10" 这样的版本号：a < b 返回负数。
int compareVersion(String a, String b) {
  List<int> parts(String v) =>
      v.split('+').first.split('.').map((p) => int.tryParse(p) ?? 0).toList();
  final x = parts(a), y = parts(b);
  for (var i = 0; i < 3; i++) {
    final d = (i < x.length ? x[i] : 0) - (i < y.length ? y[i] : 0);
    if (d != 0) return d;
  }
  return 0;
}

/* ---------- 协会介绍与学生成就 ---------- */

class Honor {
  const Honor({
    required this.rank,
    required this.national,
    required this.contest,
    this.detail,
    required this.people,
    required this.team,
    this.date,
  });
  final String rank;
  final bool national;
  final String contest;
  final String? detail;
  final List<String> people;
  final bool team;
  final String? date;

  factory Honor.fromJson(Map<String, dynamic> j) => Honor(
    rank: j['rank'] as String,
    national: j['level'] == 'national',
    contest: j['contest'] as String,
    detail: j['detail'] as String?,
    people: (j['people'] as List? ?? const []).cast<String>(),
    team: j['team'] as bool? ?? false,
    date: j['date'] as String?,
  );
}

/// `GET /api/association`
class Association {
  const Association({
    required this.name,
    required this.motto,
    required this.slogan,
    required this.school,
    required this.founded,
    required this.teachers,
    required this.directions,
    required this.departments,
    required this.year,
    required this.joinSteps,
    required this.honors,
  });
  final String name;
  final String motto;
  final String slogan;
  final String school;
  final String founded;
  final List<String> teachers;
  final List<(String, String)> directions;
  final List<(String, String)> departments;
  final List<(String, String)> year;
  final List<String> joinSteps;
  final List<Honor> honors;

  static List<(String, String)> _pairs(Object? v, String a, String b) =>
      (v as List? ?? const [])
          .map(
            (e) => ((e as Map<String, dynamic>)[a] as String, e[b] as String),
          )
          .toList();

  factory Association.fromJson(Map<String, dynamic> j) {
    final a = j['association'] as Map<String, dynamic>;
    return Association(
      name: a['name'] as String,
      motto: a['motto'] as String,
      slogan: a['slogan'] as String,
      school: a['school'] as String,
      founded: a['founded'] as String,
      teachers: (a['teachers'] as List? ?? const []).cast<String>(),
      directions: _pairs(j['directions'], 'title', 'body'),
      departments: _pairs(j['departments'], 'name', 'body'),
      year: _pairs(j['year'], 'title', 'body'),
      joinSteps: (j['joinSteps'] as List? ?? const []).cast<String>(),
      honors: _list(j['honors'], Honor.fromJson),
    );
  }
}
