import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/models.dart';
import '../data/providers.dart';
import '../features/auth/guest.dart';
import '../features/checkin/checkin_page.dart';
import '../features/courses/courses_page.dart';
import '../features/home/home_page.dart';
import '../features/profile/profile_page.dart';
import '../widgets/hx_icons.dart';
import '../widgets/ui.dart';
import 'hiana_page.dart';
import 'tokens.dart';

/// 切换到某个标签（首页的“去签到”“全部课程”用）。
class ShellTabs extends InheritedWidget {
  const ShellTabs({super.key, required this.go, required super.child});
  final void Function(int index) go;

  static void Function(int index)? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ShellTabs>()?.go;

  @override
  bool updateShouldNotify(ShellTabs old) => false;
}

/// 主界面：首页、课程、签到、我的四个标签，底部是浮动的玻璃标签栏。
/// 游客也进这里：首页、课程能看，签到显示登录提示，“我的”只有登录入口和外观。
/// 标签页放在横向分页器里，左右滑动和点标签栏都能切换。
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  final _pager = PageController();
  int _index = 0;
  AppVersion? _forceUpdate;

  static const _tabs = [
    ('首页', HxIcon.home),
    ('课程', HxIcon.book),
    ('签到', HxIcon.camera),
    ('我的', HxIcon.user),
  ];
  static const _barHeight = 64.0;

  @override
  void initState() {
    super.initState();
    _checkVersion();
  }

  @override
  void dispose() {
    _pager.dispose();
    super.dispose();
  }

  /// 启动时检查一次：低于最低可用版本就弹窗要求更新；普通新版本在“我的 → 检查更新”里提示。
  Future<void> _checkVersion() async {
    try {
      final info = await PackageInfo.fromPlatform();
      final v = await ref.read(apiProvider).appVersion();
      if (compareVersion(info.version, v.min) < 0 && mounted) {
        setState(() => _forceUpdate = v);
      }
    } catch (_) {
      // 检查失败不影响使用
    }
  }

  void _go(int i) {
    if (i == _index) return;
    HapticFeedback.selectionClick();
    setState(() => _index = i);
    _pager.animateToPage(
      i,
      duration: const Duration(milliseconds: 360),
      curve: HxMotion.ease,
    );
  }

  @override
  Widget build(BuildContext context) {
    final update = _forceUpdate;
    final bottom = MediaQuery.paddingOf(context).bottom;
    final guest = ref.watch(isGuestProvider);
    final campus = ref.watch(isCampusProvider);
    // 签到状态只有校内账号能看；游客和校外账号不去请求
    final att = campus ? ref.watch(attendanceProvider).valueOrNull : null;
    final live =
        att != null &&
        att.evening.open &&
        att.evening.record == null &&
        !att.isIn;
    return MiuixScaffold(
      content: (padding) => ShellTabs(
        go: _go,
        child: Stack(
          children: [
            Positioned.fill(
              child: TabBottomInset(
                bottom: bottom + _barHeight + 28,
                child: PageView(
                  controller: _pager,
                  onPageChanged: (i) => setState(() => _index = i),
                  children: [
                    const HomePage(),
                    const CoursesPage(),
                    guest
                        ? const GuestPrompt(title: '签到', body: '需要先登录')
                        : campus
                        ? const CheckinPage()
                        : const GuestPrompt(
                            title: '签到',
                            body: '校外账号不用签到',
                            showLogin: false,
                          ),
                    const ProfilePage(),
                  ],
                ),
              ),
            ),
            Positioned(
              left: 16,
              right: 16,
              bottom: bottom + 14,
              height: _barHeight,
              child: _GlassTabBar(
                index: _index,
                tabs: _tabs,
                onTap: _go,
                dotOn: live ? 2 : -1,
              ),
            ),
            MiuixOverlayDialog(
              show: update != null,
              title: '需要更新 App',
              summary: '这个版本已经停止支持，更新到 ${update?.latest ?? '最新版'} 后才能继续使用。',
              content: Padding(
                padding: const EdgeInsets.only(top: 12),
                child: SizedBox(
                  width: double.infinity,
                  child: MiuixTextButton(
                    '下载新版本',
                    colors: MiuixButtonDefaults.buttonColorsPrimary(context),
                    onPressed: () {
                      final url = update?.apkUrl;
                      if (url != null) {
                        launchUrl(
                          Uri.parse(url),
                          mode: LaunchMode.externalApplication,
                        );
                      }
                    },
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 浮动玻璃标签栏：选中的胶囊用弹簧滑过去。
class _GlassTabBar extends StatelessWidget {
  const _GlassTabBar({
    required this.index,
    required this.tabs,
    required this.onTap,
    required this.dotOn,
  });
  final int index;
  final List<(String, HxIcon)> tabs;
  final ValueChanged<int> onTap;
  final int dotOn; // 哪个标签上显示“进行中”的小红点；-1 不显示

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return Glass(
      radius: 32,
      child: LayoutBuilder(
        builder: (context, box) {
          final w = (box.maxWidth - 10) / tabs.length;
          return Stack(
            children: [
              AnimatedPositioned(
                duration: const Duration(milliseconds: 420),
                curve: Curves.easeOutBack,
                left: 5 + w * index,
                top: 5,
                bottom: 5,
                width: w,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: h.pill,
                    borderRadius: BorderRadius.circular(27),
                    boxShadow: h.dark
                        ? null
                        : [
                            BoxShadow(
                              color: h.glassShadow,
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                  ),
                ),
              ),
              Row(
                children: [
                  const SizedBox(width: 5),
                  for (var i = 0; i < tabs.length; i++)
                    SizedBox(
                      width: w,
                      child: Semantics(
                        button: true,
                        selected: i == index,
                        label: tabs[i].$1,
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () => onTap(i),
                          child: ExcludeSemantics(
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    TweenAnimationBuilder<Color?>(
                                      tween: ColorTween(
                                        end: i == index
                                            ? h.accentText
                                            : h.navIdle,
                                      ),
                                      duration: HxMotion.mid,
                                      builder: (context, c, _) => HxIconView(
                                        tabs[i].$2,
                                        size: 23,
                                        color: c,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      tabs[i].$1,
                                      style: TextStyle(
                                        fontSize: 11,
                                        height: 1.2,
                                        fontWeight: i == index
                                            ? FontWeight.w700
                                            : FontWeight.w500,
                                        color: i == index
                                            ? h.accentText
                                            : h.navIdle,
                                      ),
                                    ),
                                  ],
                                ),
                                if (i == dotOn)
                                  Positioned(
                                    top: 10,
                                    right: w / 2 - 18,
                                    child: LiveDot(color: h.now),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}
