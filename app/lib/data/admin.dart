/// 管理后台的接口和数据结构（只有管理员能调）。对照网页端 src/client/pages/Admin.tsx、
/// AdminApplications.tsx、AdminPins.tsx 和后端 src/worker/api/*.ts 写成；后端改了字段，这里要一起改。
library;

import 'api_client.dart';
import 'models.dart';
import 'pins.dart';

int? _int(Object? v) => (v as num?)?.toInt();
List<T> _list<T>(Object? v, T Function(Map<String, dynamic>) f) =>
    (v as List? ?? const []).map((e) => f(e as Map<String, dynamic>)).toList();

/* ---------- 今日签到 ---------- */

class AdminRecord {
  const AdminRecord({
    required this.id,
    required this.kind,
    required this.inAt,
    this.outAt,
    required this.status,
    this.inPhoto,
    this.outPhoto,
    required this.name,
    required this.studentNo,
  });
  final String id;
  final String kind; // evening | venue
  final int inAt;
  final int? outAt;
  final String status; // open | closed | auto
  final String? inPhoto;
  final String? outPhoto;
  final String name;
  final String studentNo;

  String get kindLabel => kind == 'evening' ? '晚自习' : '场地';

  factory AdminRecord.fromJson(Map<String, dynamic> j) => AdminRecord(
    id: j['id'] as String,
    kind: j['kind'] as String? ?? 'evening',
    inAt: _int(j['inAt']) ?? 0,
    outAt: _int(j['outAt']),
    status: j['status'] as String? ?? 'open',
    inPhoto: j['inPhoto'] as String?,
    outPhoto: j['outPhoto'] as String?,
    name: j['name'] as String? ?? '',
    studentNo: j['studentNo'] as String? ?? '',
  );
}

/// 晚自习规则：days 是 1–7（1 是周一），window 是 ["19:00", "20:40"]
class EveningRule {
  const EveningRule({
    required this.days,
    required this.window,
    required this.requireCode,
  });
  final List<int> days;
  final List<String> window;
  final bool requireCode;

  factory EveningRule.fromJson(Map<String, dynamic> j) => EveningRule(
    days: (j['days'] as List? ?? const [])
        .map((e) => (e as num).toInt())
        .toList(),
    window: (j['window'] as List? ?? const ['19:00', '20:40']).cast<String>(),
    requireCode: j['requireCode'] == true,
  );
}

class TodayAttendance {
  const TodayAttendance({
    required this.today,
    required this.rule,
    required this.isEveningDay,
    required this.code,
    required this.members,
    required this.records,
  });
  final String today;
  final EveningRule rule;
  final bool isEveningDay;
  final String code; // 今天的现场口令
  final int members; // 在册成员数
  final List<AdminRecord> records;

  factory TodayAttendance.fromJson(Map<String, dynamic> j) => TodayAttendance(
    today: j['today'] as String? ?? '',
    rule: EveningRule.fromJson(j['rule'] as Map<String, dynamic>? ?? const {}),
    isEveningDay: j['isEveningDay'] == true,
    code: j['code'] as String? ?? '',
    members: _int(j['members']) ?? 0,
    records: _list(j['records'], AdminRecord.fromJson),
  );
}

/* ---------- 证书 ---------- */

class AdminCertificate {
  const AdminCertificate({
    required this.cert,
    required this.userId,
    required this.name,
    this.studentNo,
  });
  final Certificate cert;
  final String userId;
  final String name;
  final String? studentNo; // 校外账号为 null

  factory AdminCertificate.fromJson(Map<String, dynamic> j) => AdminCertificate(
    cert: Certificate.fromJson(j),
    userId: j['userId'] as String,
    name: j['name'] as String? ?? '',
    studentNo: j['studentNo'] as String?,
  );
}

/* ---------- 成员和邀请码 ---------- */

class AdminMember {
  const AdminMember({
    required this.id,
    required this.kind,
    required this.studentNo,
    this.username,
    this.email,
    this.org,
    required this.name,
    this.className,
    required this.status,
    required this.role,
    required this.hasPassword,
    this.lastActiveDay,
  });
  final String id;
  final String kind;
  final String studentNo;
  final String? username;
  final String? email;
  final String? org;
  final String name;
  final String? className;
  final String status; // active | archived
  final String role; // member | admin
  final bool hasPassword;
  final String? lastActiveDay;

  bool get isExternal => kind == 'external';
  bool get isAdmin => role == 'admin';
  bool get archived => status == 'archived';
  String get account => isExternal ? (username ?? '') : studentNo;

  factory AdminMember.fromJson(Map<String, dynamic> j) => AdminMember(
    id: j['id'] as String,
    kind: j['kind'] as String? ?? 'campus',
    studentNo: j['studentNo'] as String? ?? '',
    username: j['username'] as String?,
    email: j['email'] as String?,
    org: j['org'] as String?,
    name: j['name'] as String? ?? '',
    className: j['className'] as String?,
    status: j['status'] as String? ?? 'active',
    role: j['role'] as String? ?? 'member',
    hasPassword: j['hasPassword'] == true,
    lastActiveDay: j['lastActiveDay'] as String?,
  );
}

class Invite {
  const Invite({
    required this.id,
    required this.kind,
    required this.hint,
    this.note,
    required this.createdAt,
    this.expiresAt,
    this.usedAt,
    this.usedByName,
    this.usedByAccount,
    required this.state,
  });
  final String id;
  final String kind; // campus | external
  final String hint; // 邀请码的最后四位
  final String? note;
  final int createdAt;
  final int? expiresAt;
  final int? usedAt;
  final String? usedByName;
  final String? usedByAccount;
  final String state; // unused | used | expired | revoked

  String get stateLabel => switch (state) {
    'used' => '已使用',
    'expired' => '已过期',
    'revoked' => '已作废',
    _ => '未使用',
  };

  factory Invite.fromJson(Map<String, dynamic> j) {
    final by = j['usedBy'] as Map<String, dynamic>?;
    return Invite(
      id: j['id'] as String,
      kind: j['kind'] as String? ?? 'campus',
      hint: j['hint'] as String? ?? '',
      note: j['note'] as String?,
      createdAt: _int(j['createdAt']) ?? 0,
      expiresAt: _int(j['expiresAt']),
      usedAt: _int(j['usedAt']),
      usedByName: by?['name'] as String?,
      usedByAccount: by?['studentNo'] as String?,
      state: j['state'] as String? ?? 'unused',
    );
  }
}

/* ---------- 新生报名 ---------- */

const kApplicationStatuses = [
  'new',
  'contacted',
  'interview',
  'accepted',
  'rejected',
];

/// 与 src/shared/applications.ts 的 APPLICATION_STATUS_LABEL 一致
const kApplicationStatusLabel = {
  'new': '新报名',
  'contacted': '已联系',
  'interview': '待面试',
  'accepted': '已通过',
  'rejected': '未通过',
};

/// 与 src/shared/applications.ts 的 APPLICATION_QUESTIONS 一致（第 1 题必答）
const kApplicationQuestions = [
  ('你为什么想加入我们的协会？', null),
  ('在计算机方面，你会哪些技术？', '会哪种写哪种都行。哪怕什么都不会，也不影响最后的考核。'),
  ('对大学的发展和未来规划，你有什么想法？', '没关系，哪怕还什么都不知道、没有任何规划，我们也欢迎你来。'),
  ('你对计算机科学这门学科有什么认识，对哪里感兴趣？', null),
  ('你希望在协会里得到些什么？', null),
];

class ApplicationSummary {
  const ApplicationSummary({
    required this.id,
    required this.studentId,
    required this.name,
    required this.className,
    required this.status,
    required this.submitCount,
    required this.createdAt,
    required this.updatedAt,
  });
  final String id;
  final String studentId;
  final String name;
  final String className;
  final String status;
  final int submitCount;
  final int createdAt;
  final int updatedAt;

  String get statusLabel => kApplicationStatusLabel[status] ?? status;

  factory ApplicationSummary.fromJson(Map<String, dynamic> j) =>
      ApplicationSummary(
        id: j['id'] as String,
        studentId: j['studentId'] as String? ?? '',
        name: j['name'] as String? ?? '',
        className: j['className'] as String? ?? '',
        status: j['status'] as String? ?? 'new',
        submitCount: _int(j['submitCount']) ?? 1,
        createdAt: _int(j['createdAt']) ?? 0,
        updatedAt: _int(j['updatedAt']) ?? 0,
      );
}

class ApplicationDetail {
  const ApplicationDetail({
    required this.summary,
    required this.phone,
    required this.qq,
    required this.answers,
    this.adminNote,
    this.handledAt,
  });
  final ApplicationSummary summary;
  final String phone;
  final String qq;
  final List<String?> answers;
  final String? adminNote;
  final int? handledAt;

  factory ApplicationDetail.fromJson(Map<String, dynamic> j) =>
      ApplicationDetail(
        summary: ApplicationSummary.fromJson(j),
        phone: j['phone'] as String? ?? '',
        qq: j['qq'] as String? ?? '',
        answers: (j['answers'] as List? ?? const []).cast<String?>(),
        adminNote: j['adminNote'] as String?,
        handledAt: _int(j['handledAt']),
      );
}

class RecruitSettings {
  const RecruitSettings({required this.open, required this.message});
  final bool open;
  final String message;

  factory RecruitSettings.fromJson(Map<String, dynamic> j) => RecruitSettings(
    open: j['open'] != false,
    message: j['message'] as String? ?? '本轮招新已结束',
  );
}

class ApplicationList {
  const ApplicationList({
    required this.items,
    required this.counts,
    required this.settings,
  });
  final List<ApplicationSummary> items;
  final Map<String, int> counts; // all、new、contacted……
  final RecruitSettings settings;

  factory ApplicationList.fromJson(Map<String, dynamic> j) => ApplicationList(
    items: _list(j['items'], ApplicationSummary.fromJson),
    counts: {
      for (final e
          in (j['counts'] as Map<String, dynamic>? ?? const {}).entries)
        e.key: (e.value as num).toInt(),
    },
    settings: RecruitSettings.fromJson(
      j['settings'] as Map<String, dynamic>? ?? const {},
    ),
  );
}

/* ---------- 蓝色钉子收件箱 ---------- */

class AdminPin {
  const AdminPin({
    required this.pin,
    required this.course,
    required this.page,
    required this.courseTitle,
    required this.itemTitle,
    required this.updatedAt,
  });
  final Pin pin;
  final String course;
  final String page;
  final String courseTitle;
  final String itemTitle;
  final int updatedAt;

  factory AdminPin.fromJson(Map<String, dynamic> j) => AdminPin(
    pin: Pin.fromJson(j),
    course: j['course'] as String? ?? '',
    page: j['page'] as String? ?? '',
    courseTitle: j['courseTitle'] as String? ?? '',
    itemTitle: j['itemTitle'] as String? ?? '',
    updatedAt: _int(j['updatedAt']) ?? 0,
  );
}

/* ---------- 接口 ---------- */

class AdminApi {
  const AdminApi(this._api);
  final ApiClient _api;

  // 今日签到
  Future<TodayAttendance> today() async => TodayAttendance.fromJson(
    await _api.send('GET', '/api/admin/attendance/today'),
  );

  /// days 写成 "1,2,4"，window 写成 "19:00-20:40"
  Future<void> saveEveningRule({
    required String days,
    required String window,
    required bool requireCode,
  }) => _api.send(
    'PUT',
    '/api/admin/attendance/settings',
    body: {'days': days, 'window': window, 'requireCode': requireCode},
  );

  // 证书
  Future<List<AdminCertificate>> certificates() async => _list(
    await _api.sendList('GET', '/api/admin/certificates'),
    AdminCertificate.fromJson,
  );

  Future<void> reviewCertificate(
    String course,
    String userId, {
    required bool approve,
    String? note,
  }) => _api.send(
    'PUT',
    '/api/admin/certificates/$course/$userId',
    body: {
      'status': approve ? 'approved' : 'rejected',
      if (note != null && note.isNotEmpty) 'note': note,
    },
  );

  // 成员
  Future<List<AdminMember>> members() async => _list(
    await _api.sendList('GET', '/api/admin/members'),
    AdminMember.fromJson,
  );

  /// 最近 [days] 天没动静的成员
  Future<List<AdminMember>> idle({int days = 7}) async => _list(
    await _api.sendList('GET', '/api/admin/idle?days=$days'),
    AdminMember.fromJson,
  );

  /// 生成一次性重置码；旧密码和已登录的设备马上失效。重置码只返回这一次
  Future<String> resetCode(String id) async =>
      (await _api.send(
            'POST',
            '/api/admin/members/$id/reset',
            body: const {},
          ))['code']
          as String;

  Future<void> setStatus(String id, {required bool active}) => _api.send(
    'POST',
    '/api/admin/members/$id/status',
    body: {'status': active ? 'active' : 'archived'},
  );

  Future<void> setRole(String id, {required bool admin}) => _api.send(
    'POST',
    '/api/admin/members/$id/role',
    body: {'role': admin ? 'admin' : 'member'},
  );

  // 邀请码
  Future<List<Invite>> invites() async =>
      _list(await _api.sendList('GET', '/api/admin/invites'), Invite.fromJson);

  /// 返回这次生成的邀请码（只显示这一次）
  Future<List<String>> createInvites({
    required int count,
    int? days,
    String? note,
    required String kind,
  }) async {
    final d = await _api.send(
      'POST',
      '/api/admin/invites',
      body: {
        'count': count,
        'days': days,
        if (note != null && note.isNotEmpty) 'note': note,
        'kind': kind,
      },
    );
    return (d['codes'] as List? ?? const []).cast<String>();
  }

  Future<void> revokeInvite(String id) =>
      _api.send('DELETE', '/api/admin/invites/$id');

  // 公告
  Future<void> saveNotice({
    String? id,
    required String kind,
    required String title,
    required String body,
    String? docUrl,
    String? groupInfo,
    String? deadline,
    required List<String> tags,
    required bool pinned,
  }) => _api.send(
    id == null ? 'POST' : 'PUT',
    id == null ? '/api/admin/notices' : '/api/admin/notices/$id',
    body: {
      'kind': kind,
      'title': title,
      'body': body,
      'docUrl': docUrl ?? '',
      'groupInfo': groupInfo ?? '',
      'deadline': deadline ?? '',
      'tags': tags,
      'pinned': pinned,
    },
  );

  Future<void> deleteNotice(String id) =>
      _api.send('DELETE', '/api/admin/notices/$id');

  /// 公告配图：base64 的 JPEG / PNG / WebP，返回能直接写进正文的图片地址
  Future<String> uploadNoticeImage(String base64) async =>
      (await _api.send(
            'POST',
            '/api/admin/notices/image',
            body: {'data': base64},
          ))['url']
          as String;

  // 新生报名
  Future<ApplicationList> applications({String? status, String? q}) async {
    final params = [
      if (status != null) 'status=$status',
      if (q != null && q.isNotEmpty) 'q=${Uri.encodeQueryComponent(q)}',
    ];
    return ApplicationList.fromJson(
      await _api.send(
        'GET',
        '/api/admin/applications${params.isEmpty ? '' : '?${params.join('&')}'}',
      ),
    );
  }

  Future<ApplicationDetail> application(String id) async =>
      ApplicationDetail.fromJson(
        await _api.send('GET', '/api/admin/applications/$id'),
      );

  Future<ApplicationDetail> updateApplication(
    String id, {
    String? status,
    String? adminNote,
    bool setNote = false,
  }) async => ApplicationDetail.fromJson(
    await _api.send(
      'PATCH',
      '/api/admin/applications/$id',
      body: {
        'status': ?status,
        if (setNote) 'adminNote': adminNote,
      },
    ),
  );

  Future<void> deleteApplication(String id) =>
      _api.send('DELETE', '/api/admin/applications/$id');

  Future<RecruitSettings> saveRecruit({
    required bool open,
    String? message,
  }) async => RecruitSettings.fromJson(
    await _api.send(
      'PUT',
      '/api/admin/applications/settings',
      body: {'open': open, 'message': ?message},
    ),
  );

  // 蓝色钉子
  Future<List<AdminPin>> pins() async =>
      _list(await _api.sendList('GET', '/api/admin/pins'), AdminPin.fromJson);

  // 设置
  Future<Map<String, String?>> settings() async {
    final d = await _api.send('GET', '/api/admin/settings');
    return {for (final e in d.entries) e.key: e.value as String?};
  }

  /// 只传要改的项；值为 null 的不改
  Future<void> saveSettings(Map<String, String> values) =>
      _api.send('PUT', '/api/admin/settings', body: values);

  // 课程包：发布（同 slug 覆盖）、撤下
  Future<void> publishPackage(Map<String, dynamic> pkg) =>
      _api.send('PUT', '/api/admin/packages', body: pkg);

  Future<void> deletePackage(String slug) =>
      _api.send('DELETE', '/api/admin/packages/$slug');
}
