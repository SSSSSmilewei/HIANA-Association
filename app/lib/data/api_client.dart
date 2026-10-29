import 'package:dio/dio.dart';

import 'models.dart';
import 'token_store.dart';

/// 后端地址。只请求这个域名：*.workers.dev 在国内经常打不开。
const kBaseUrl = String.fromEnvironment(
  'HIANA_API',
  defaultValue: 'https://study.shanmoew-denied.win',
);

/// 接口出错时抛出。[message] 直接是后端给的中文文案，页面可以原样显示。
class ApiException implements Exception {
  const ApiException(this.message, {this.status});
  final String message;
  final int? status;

  bool get unauthorized => status == 401;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient(this._tokens, {this.onUnauthorized})
    : _dio = Dio(
        BaseOptions(
          baseUrl: kBaseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(
            seconds: 30,
          ), // 绑定平台时后端要现场同步一次、上传照片也要一会儿
          headers: const {'X-Hiana-Client': 'app'},
          responseType: ResponseType.json,
          validateStatus: (_) => true, // 状态码自己判断，才能拿到后端的错误文案
        ),
      ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokens.read();
          if (token != null) options.headers['Authorization'] = 'Bearer $token';
          handler.next(options);
        },
      ),
    );
  }

  final Dio _dio;
  final TokenStore _tokens;

  /// 已登录状态下收到 401（令牌过期、账号被停用、密码被重置）时调用，用来回到游客状态。
  void Function()? onUnauthorized;

  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    Object? body,
    bool authCall = false,
  }) async {
    final data = await _raw(method, path, body: body, authCall: authCall);
    if (data is Map<String, dynamic>) return data;
    throw const ApiException('服务器返回的内容看不懂，稍后再试');
  }

  Future<List<dynamic>> _sendList(String method, String path) async {
    final data = await _raw(method, path);
    if (data is List) return data;
    throw const ApiException('服务器返回的内容看不懂，稍后再试');
  }

  Future<Object?> _raw(
    String method,
    String path, {
    Object? body,
    bool authCall = false,
  }) async {
    final Response<dynamic> res;
    try {
      res = await _dio.request<dynamic>(
        path,
        data: body,
        options: Options(method: method),
      );
    } on DioException catch (e) {
      throw ApiException(_networkMessage(e));
    }
    final status = res.statusCode ?? 0;
    final data = res.data;
    if (status >= 400) {
      final msg = data is Map && data['error'] is String
          ? data['error'] as String
          : '服务器返回了错误（$status），稍后再试';
      // 登录接口本身返回 401 只是密码不对，不算掉线
      if (status == 401 && !authCall) onUnauthorized?.call();
      throw ApiException(msg, status: status);
    }
    return data;
  }

  String _networkMessage(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        return '连接超时，检查一下网络后再试';
      case DioExceptionType.connectionError:
        return '连不上服务器，检查一下网络后再试';
      default:
        return '网络出了问题，稍后再试';
    }
  }

  /* ---------- 登录 ---------- */

  /// 启动时确认登录状态。401 由 SessionNotifier 自己处理，不走 onUnauthorized，
  /// 免得在会话还没初始化完时又去改它的状态。
  Future<Me> me() async =>
      Me.fromJson(await _send('GET', '/api/auth/me', authCall: true));

  /// 现在开不开放注册（管理员可以在网页后台关掉）。
  Future<bool> registrationOpen() async =>
      (await _send(
            'GET',
            '/api/auth/options',
            authCall: true,
          ))['registrationOpen']
          as bool? ??
      true;

  /// 登录：账号 + 密码。账号是学号（校内）、用户名或邮箱（校外）。会长、老师也一样。
  Future<Me> login(String account, String password) => _authenticate(
    '/api/auth/member',
    {'account': account, 'password': password},
  );

  /// 注册校内账号：学号（9 位数字）、姓名、密码、校内邀请码。成功后直接登录。
  Future<Me> register({
    required String studentNo,
    required String name,
    String? className,
    required String password,
    required String confirm,
    required String invite,
  }) => _authenticate('/api/auth/register', {
    'kind': 'campus',
    'studentNo': studentNo,
    'name': name,
    if (className != null && className.isNotEmpty) 'className': className,
    'password': password,
    'confirm': confirm,
    'invite': invite,
  });

  /// 注册校外账号：用户名、昵称、邮箱和学校 / 单位（选填）、密码、校外邀请码。成功后直接登录。
  Future<Me> registerExternal({
    required String username,
    required String name,
    String? email,
    String? org,
    required String password,
    required String confirm,
    required String invite,
  }) => _authenticate('/api/auth/register', {
    'kind': 'external',
    'username': username,
    'name': name,
    if (email != null && email.isNotEmpty) 'email': email,
    if (org != null && org.isNotEmpty) 'org': org,
    'password': password,
    'confirm': confirm,
    'invite': invite,
  });

  /// 忘记密码：账号 + 管理员给的重置码设新密码，成功后直接登录。
  Future<Me> resetPassword({
    required String account,
    required String code,
    required String password,
    required String confirm,
  }) => _authenticate('/api/auth/reset', {
    'account': account,
    'code': code,
    'password': password,
    'confirm': confirm,
  });

  Future<Me> _authenticate(String path, Map<String, String> body) async {
    final data = await _send('POST', path, body: body, authCall: true);
    final token = data['token'] as String?;
    if (token == null) {
      throw const ApiException('服务器没有返回登录令牌，后端可能还没更新到支持 App 的版本');
    }
    await _tokens.save(token);
    return Me.fromJson(data);
  }

  /// 修改密码：要先输当前密码。改完后其他设备退出登录，这台设备换用后端发的新令牌。
  Future<void> setPassword({
    required String password,
    required String confirm,
    required String current,
  }) async {
    final data = await _send(
      'POST',
      '/api/auth/password',
      body: {'password': password, 'confirm': confirm, 'current': current},
    );
    final token = data['token'] as String?;
    if (token != null) await _tokens.save(token);
  }

  /// 令牌是无状态的，退出登录就是删掉本地令牌；顺带通知一下后端（失败也无所谓）。
  Future<void> logout() async {
    try {
      await _send('POST', '/api/auth/logout', authCall: true);
    } on ApiException {
      // 忽略
    }
    await _tokens.clear();
  }

  /* ---------- 首页、签到 ---------- */

  Future<CalendarInfo> calendar() async =>
      CalendarInfo.fromJson(await _send('GET', '/api/calendar'));

  Future<AttendanceState> attendance() async =>
      AttendanceState.fromJson(await _send('GET', '/api/attendance'));

  /// 签到：[photo] 是 JPEG 的 base64；晚自习开了现场口令时带上 [code]。返回签到时间（毫秒）。
  Future<int> signIn({
    required String kind,
    required String photo,
    String? code,
  }) async {
    final d = await _send(
      'POST',
      '/api/attendance/in',
      body: {
        'kind': kind,
        'photo': photo,
        if (code != null && code.isNotEmpty) 'code': code,
      },
    );
    return (d['inAt'] as num).toInt();
  }

  Future<int> signOut({required String photo}) async {
    final d = await _send(
      'POST',
      '/api/attendance/out',
      body: {'photo': photo},
    );
    return (d['outAt'] as num).toInt();
  }

  /* ---------- 课程 ---------- */

  Future<List<CourseSummary>> courses() async {
    final d = await _sendList('GET', '/api/courses');
    return d
        .map((e) => CourseSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<CourseDetail> course(String slug) async =>
      CourseDetail.fromJson(await _send('GET', '/api/courses/$slug'));

  Future<List<NextItem>> learningNext() async {
    final d = await _send('GET', '/api/learning/next');
    return (d['items'] as List)
        .map((e) => NextItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// 标记条目完成或取消；返回下一个要学的条目（全部学完返回 null）。
  Future<CourseItem?> setItemDone(String slug, String itemId, bool done) async {
    final d = await _send(
      'PUT',
      '/api/courses/$slug/items/$itemId',
      body: {'done': done},
    );
    return d['next'] == null
        ? null
        : CourseItem.fromJson(d['next'] as Map<String, dynamic>);
  }

  /// 练手题做对了（记一条学习记录）
  Future<void> solvePractice(String slug, String itemId, String questionId) =>
      _send(
        'PUT',
        '/api/courses/$slug/practice/$itemId/$questionId',
        body: const {},
      );

  /// 完整课程包：仓库自带的课是静态文件，发布的课程包走接口
  Future<CoursePackage> coursePackage(String slug) async {
    try {
      final res = await _dio.get<Object>(
        '/learn/$slug/course.json',
        options: Options(responseType: ResponseType.json),
      );
      final data = res.data;
      if ((res.statusCode ?? 0) < 400 && data is Map<String, dynamic>) {
        return CoursePackage.fromJson(data);
      }
    } on DioException catch (e) {
      if (e.response == null) throw ApiException(_networkMessage(e));
    }
    return CoursePackage.fromJson(await _send('GET', '/api/packages/$slug'));
  }

  /// 选课 / 暂停 / 退课 / 标记学完：status 是 active、paused、dropped 或 done（done 只用于没有条目的课）。
  Future<void> setEnrollment(String slug, String status) =>
      _send('PUT', '/api/courses/$slug/enrollment', body: {'status': status});

  /// 讲义原文（Markdown）：构建时发布在 `/learn/<slug>/<page>.md`。不存在时静态资源会回退成网页首页。
  Future<String> lesson(String slug, String page) async {
    final Response<String> res;
    try {
      res = await _dio.get<String>(
        '/learn/$slug/$page.md',
        options: Options(responseType: ResponseType.plain),
      );
    } on DioException catch (e) {
      throw ApiException(_networkMessage(e));
    }
    final type = res.headers.value('content-type') ?? '';
    if ((res.statusCode ?? 0) >= 400 || type.contains('html')) {
      throw ApiException('没有这一页', status: res.statusCode);
    }
    return res.data ?? '';
  }

  Future<Association> association() async =>
      Association.fromJson(await _send('GET', '/api/association'));

  /* ---------- 公告与比赛 ---------- */

  Future<List<Notice>> notices() async {
    final d = await _sendList('GET', '/api/notices');
    return d.map((e) => Notice.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> joinCompetition(String id, {String? team, String? contact}) =>
      _send(
        'PUT',
        '/api/notices/$id/entry',
        body: {
          if (team != null && team.isNotEmpty) 'team': team,
          if (contact != null && contact.isNotEmpty) 'contact': contact,
        },
      );

  Future<void> leaveCompetition(String id) =>
      _send('DELETE', '/api/notices/$id/entry');

  /* ---------- 热力图 ---------- */

  Future<HeatmapPayload> heatmap() async =>
      HeatmapPayload.fromJson(await _send('GET', '/api/heatmap'));

  /// 绑定后后端会现场同步一次；返回同步失败的原因（成功时为 null）。
  Future<String?> bind({
    required String source,
    required String handle,
    String? secret,
  }) async {
    final data = await _send(
      'POST',
      '/api/heatmap/bindings',
      body: {
        'source': source,
        'handle': handle,
        if (secret != null && secret.isNotEmpty) 'secret': secret,
      },
    );
    return data['error'] as String?;
  }

  Future<void> unbind(String source) =>
      _send('DELETE', '/api/heatmap/bindings/${Uri.encodeComponent(source)}');

  Future<AppVersion> appVersion() async =>
      AppVersion.fromJson(await _send('GET', '/api/app/version'));
}
