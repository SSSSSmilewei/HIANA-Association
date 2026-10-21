import 'package:dio/dio.dart';

import 'models.dart';
import 'token_store.dart';

/// 后端地址。只请求这个域名：*.workers.dev 在国内经常打不开。
const kBaseUrl = String.fromEnvironment('HIANA_API', defaultValue: 'https://study.shanmoew-denied.win');

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
            receiveTimeout: const Duration(seconds: 30), // 绑定平台时后端要现场同步一次，会慢一些
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

  /// 已登录状态下收到 401（令牌过期或账号被停用）时调用，用来回到登录页。
  void Function()? onUnauthorized;

  Future<Map<String, dynamic>> _send(String method, String path, {Object? body, bool authCall = false}) async {
    final Response<dynamic> res;
    try {
      res = await _dio.request<dynamic>(path, data: body, options: Options(method: method));
    } on DioException catch (e) {
      throw ApiException(_networkMessage(e));
    }
    final status = res.statusCode ?? 0;
    final data = res.data;
    if (status >= 400) {
      final msg = data is Map && data['error'] is String ? data['error'] as String : '服务器返回了错误（$status），稍后再试';
      // 登录接口本身返回 401 只是密码或口令不对，不算掉线
      if (status == 401 && !authCall) onUnauthorized?.call();
      throw ApiException(msg, status: status);
    }
    if (data is Map<String, dynamic>) return data;
    throw const ApiException('服务器返回的内容看不懂，稍后再试');
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
  Future<Me> me() async => Me.fromJson(await _send('GET', '/api/auth/me', authCall: true));

  /// 日常登录：学号 + 自己设的密码。
  Future<Me> login(String studentNo, String password) =>
      _authenticate('/api/auth/member', {'studentNo': studentNo, 'password': password});

  /// 第一次使用：会长发的口令。激活后必须马上设置密码。
  Future<Me> activate(String code) => _authenticate('/api/auth/activate', {'code': code});

  Future<Me> _authenticate(String path, Map<String, String> body) async {
    final data = await _send('POST', path, body: body, authCall: true);
    final token = data['token'] as String?;
    if (token == null) throw const ApiException('服务器没有返回登录令牌，后端可能还没更新到支持 App 的版本');
    await _tokens.save(token);
    return Me.fromJson(data);
  }

  /// 设置或修改密码：已经有密码时要带上当前密码。
  Future<void> setPassword({required String password, required String confirm, String? current}) => _send(
        'POST',
        '/api/auth/password',
        body: {'password': password, 'confirm': confirm, if (current != null && current.isNotEmpty) 'current': current},
      );

  /// 令牌是无状态的，退出登录就是删掉本地令牌；顺带通知一下后端（失败也无所谓）。
  Future<void> logout() async {
    try {
      await _send('POST', '/api/auth/logout', authCall: true);
    } on ApiException {
      // 忽略
    }
    await _tokens.clear();
  }

  /* ---------- 课程、打卡、热力图 ---------- */

  Future<Course> course() async => Course.fromJson(await _send('GET', '/api/course'));

  Future<CheckinState> checkinState() async => CheckinState.fromJson(await _send('GET', '/api/checkin'));

  Future<CheckinResult> checkIn({String? code}) async =>
      CheckinResult.fromJson(await _send('POST', '/api/checkin', body: {if (code != null && code.isNotEmpty) 'code': code}));

  Future<HeatmapPayload> heatmap() async => HeatmapPayload.fromJson(await _send('GET', '/api/heatmap'));

  /// 绑定后后端会现场同步一次；返回同步失败的原因（成功时为 null）。
  Future<String?> bind({required String source, required String handle, String? secret}) async {
    final data = await _send(
      'POST',
      '/api/heatmap/bindings',
      body: {'source': source, 'handle': handle, if (secret != null && secret.isNotEmpty) 'secret': secret},
    );
    return data['error'] as String?;
  }

  Future<void> unbind(String source) => _send('DELETE', '/api/heatmap/bindings/${Uri.encodeComponent(source)}');

  Future<AppVersion> appVersion() async => AppVersion.fromJson(await _send('GET', '/api/app/version'));
}
