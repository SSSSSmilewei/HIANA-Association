import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/models.dart';
import '../data/providers.dart';
import '../features/checkin/checkin_page.dart';
import '../features/home/home_page.dart';
import '../features/profile/profile_page.dart';
import 'hiana_page.dart';

/// 登录后的主界面：首页、打卡、我的三个标签。
/// 参考 NexioSchedule：标签页放在横向分页器里，左右滑动和点底部导航都能切换。
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  final _pager = PageController();
  int _index = 0;
  AppVersion? _forceUpdate;

  static const _tabs = [('首页', 'home'), ('打卡', 'tasks'), ('我的', 'contacts')];

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
      if (compareVersion(info.version, v.min) < 0 && mounted) setState(() => _forceUpdate = v);
    } catch (_) {
      // 检查失败不影响使用
    }
  }

  void _go(int i) {
    setState(() => _index = i);
    _pager.animateToPage(i, duration: const Duration(milliseconds: 320), curve: Curves.easeOutCubic);
  }

  @override
  Widget build(BuildContext context) {
    final update = _forceUpdate;
    return Stack(
      children: [
        MiuixScaffold(
          bottomBar: MiuixNavigationBar(
            children: [
              for (var i = 0; i < _tabs.length; i++)
                MiuixNavigationBarItem(
                  selected: _index == i,
                  onPressed: () => _go(i),
                  icon: MiuixIcon(vector: MiuixIcons.extended.byName(_tabs[i].$2)),
                  label: _tabs[i].$1,
                ),
            ],
          ),
          content: (padding) => TabBottomInset(
            bottom: padding.bottom,
            child: PageView(
              controller: _pager,
              onPageChanged: (i) => setState(() => _index = i),
              children: const [HomePage(), CheckinPage(), ProfilePage()],
            ),
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
                  if (url != null) launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                },
              ),
            ),
          ),
        ),
      ],
    );
  }
}
