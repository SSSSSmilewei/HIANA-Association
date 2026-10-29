import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'models.dart';
import 'token_store.dart';

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());

final apiProvider = Provider<ApiClient>((ref) {
  final api = ApiClient(ref.watch(tokenStoreProvider));
  // 令牌过期、账号被停用或密码被重置：清掉令牌，回到游客状态
  api.onUnauthorized = () => ref.read(sessionProvider.notifier).signedOut();
  return api;
});

/// 当前登录状态。没有令牌就是游客；有令牌就用 /api/auth/me 确认一次。
class SessionNotifier extends AsyncNotifier<Me> {
  ApiClient get _api => ref.read(apiProvider);

  @override
  Future<Me> build() async {
    final token = await ref.read(tokenStoreProvider).read();
    if (token == null) return const Me.guest();
    try {
      final me = await _api.me();
      // 失效的令牌（以前的会长令牌、被停用的账号）当作游客
      if (!me.isMember) {
        await ref.read(tokenStoreProvider).clear();
        return const Me.guest();
      }
      return me;
    } on ApiException catch (e) {
      // 断网时不要把人踢出去：保留令牌，显示错误，让页面提供重试
      if (e.unauthorized) return const Me.guest();
      rethrow;
    }
  }

  /// account：学号、用户名或邮箱
  Future<void> login(String account, String password) async {
    state = AsyncData(await _api.login(account, password));
  }

  Future<void> register({
    required String studentNo,
    required String name,
    String? className,
    required String password,
    required String confirm,
    required String invite,
  }) async {
    state = AsyncData(
      await _api.register(
        studentNo: studentNo,
        name: name,
        className: className,
        password: password,
        confirm: confirm,
        invite: invite,
      ),
    );
  }

  Future<void> registerExternal({
    required String username,
    required String name,
    String? email,
    String? org,
    required String password,
    required String confirm,
    required String invite,
  }) async {
    state = AsyncData(
      await _api.registerExternal(
        username: username,
        name: name,
        email: email,
        org: org,
        password: password,
        confirm: confirm,
        invite: invite,
      ),
    );
  }

  Future<void> resetPassword({
    required String account,
    required String code,
    required String password,
    required String confirm,
  }) async {
    state = AsyncData(
      await _api.resetPassword(
        account: account,
        code: code,
        password: password,
        confirm: confirm,
      ),
    );
  }

  Future<void> setPassword({
    required String password,
    required String confirm,
    required String current,
  }) =>
      _api.setPassword(password: password, confirm: confirm, current: current);

  Future<void> logout() async {
    await _api.logout();
    signedOut();
  }

  void signedOut() {
    ref.read(tokenStoreProvider).clear();
    state = const AsyncData(Me.guest());
  }

  Future<void> retry() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(build);
  }
}

final sessionProvider = AsyncNotifierProvider<SessionNotifier, Me>(
  SessionNotifier.new,
);

/* 下面的数据都跟着登录状态走：换账号或退出时自动重新加载。
 * 签到、接下来、热力图只有登录后才有；游客状态下页面不要去读它们（会是 401）。 */

String? _uid(Ref ref) =>
    ref.watch(sessionProvider.select((s) => s.valueOrNull?.member?.id));

/// 是不是游客（没登录）。
final isGuestProvider = Provider<bool>(
  (ref) =>
      ref.watch(sessionProvider.select((s) => s.valueOrNull?.isGuest ?? true)),
);

/// 校内账号（能签到）。游客和校外账号都是 false
final isCampusProvider = Provider<bool>(
  (ref) => ref.watch(
    sessionProvider.select((s) {
      final m = s.valueOrNull?.member;
      return m != null && !m.isExternal;
    }),
  ),
);

final calendarProvider = FutureProvider<CalendarInfo>((ref) {
  _uid(ref);
  return ref.read(apiProvider).calendar();
});

final attendanceProvider = FutureProvider<AttendanceState>((ref) {
  _uid(ref);
  return ref.read(apiProvider).attendance();
});

final nextProvider = FutureProvider<List<NextItem>>((ref) {
  _uid(ref);
  return ref.read(apiProvider).learningNext();
});

final coursesProvider = FutureProvider<List<CourseSummary>>((ref) {
  _uid(ref);
  return ref.read(apiProvider).courses();
});

final courseProvider = FutureProvider.family<CourseDetail, String>((ref, slug) {
  _uid(ref);
  return ref.read(apiProvider).course(slug);
});

/// 完整课程包（介绍、条目详情、练手题），和登录状态无关
final packageProvider = FutureProvider.family<CoursePackage, String>(
  (ref, slug) => ref.read(apiProvider).coursePackage(slug),
);

final associationProvider = FutureProvider<Association>(
  (ref) => ref.read(apiProvider).association(),
);

/// 讲义原文，键是 "slug/page"。
final lessonProvider = FutureProvider.family<String, String>((ref, key) {
  final i = key.indexOf('/');
  return ref
      .read(apiProvider)
      .lesson(key.substring(0, i), key.substring(i + 1));
});

final noticesProvider = FutureProvider<List<Notice>>((ref) {
  _uid(ref);
  return ref.read(apiProvider).notices();
});

final heatmapProvider = FutureProvider<HeatmapPayload>((ref) {
  _uid(ref);
  return ref.read(apiProvider).heatmap();
});

/// 学习进度变了以后，相关页面一起刷新。
void refreshLearning(WidgetRef ref) {
  ref.invalidate(nextProvider);
  ref.invalidate(coursesProvider);
  ref.invalidate(heatmapProvider);
}

/* 深色模式：跟随系统 / 浅色 / 深色，存在本地 */

class ThemeModeNotifier extends Notifier<MiuixColorSchemeMode> {
  @override
  MiuixColorSchemeMode build() {
    ref.read(tokenStoreProvider).readTheme().then((saved) {
      for (final m in MiuixColorSchemeMode.values) {
        if (m.name == saved) state = m;
      }
    });
    return MiuixColorSchemeMode.system;
  }

  void set(MiuixColorSchemeMode mode) {
    state = mode;
    ref.read(tokenStoreProvider).saveTheme(mode.name);
  }
}

final themeModeProvider =
    NotifierProvider<ThemeModeNotifier, MiuixColorSchemeMode>(
      ThemeModeNotifier.new,
    );
