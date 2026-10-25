import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'models.dart';
import 'token_store.dart';

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());

final apiProvider = Provider<ApiClient>((ref) {
  final api = ApiClient(ref.watch(tokenStoreProvider));
  // 令牌过期或账号被停用：清掉令牌，回到登录页
  api.onUnauthorized = () => ref.read(sessionProvider.notifier).signedOut();
  return api;
});

/// 当前登录状态。启动时有令牌就用 /api/auth/me 确认一次。
class SessionNotifier extends AsyncNotifier<Me> {
  ApiClient get _api => ref.read(apiProvider);

  @override
  Future<Me> build() async {
    final token = await ref.read(tokenStoreProvider).read();
    if (token == null) return const Me.guest();
    try {
      final me = await _api.me();
      // App 只给学员用；会长令牌或失效的令牌都当作未登录
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

  Future<void> login(String studentNo, String password) async {
    state = AsyncData(await _api.login(studentNo, password));
  }

  Future<void> activate(String code) async {
    state = AsyncData(await _api.activate(code));
  }

  Future<void> setPassword({required String password, required String confirm, String? current}) async {
    await _api.setPassword(password: password, confirm: confirm, current: current);
    final me = state.valueOrNull;
    if (me != null && me.needsPassword) {
      state = AsyncData(Me(role: me.role, member: me.member));
    }
  }

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

final sessionProvider = AsyncNotifierProvider<SessionNotifier, Me>(SessionNotifier.new);

/* 下面的数据都跟着登录状态走：换账号或退出时自动重新加载 */

String? _uid(Ref ref) => ref.watch(sessionProvider.select((s) => s.valueOrNull?.member?.id));

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

final themeModeProvider = NotifierProvider<ThemeModeNotifier, MiuixColorSchemeMode>(ThemeModeNotifier.new);
