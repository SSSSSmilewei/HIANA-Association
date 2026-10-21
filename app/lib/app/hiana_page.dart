import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';

import 'miuix_root.dart';

/// 底部导航页给标签页留出的底部空间（导航栏高度 + 系统手势条）。
/// 标签页里的 [HianaPage] 读它，避免内容被导航栏挡住；推入的二级页面没有它，用系统安全区。
class TabBottomInset extends InheritedWidget {
  const TabBottomInset({super.key, required this.bottom, required super.child});
  final double bottom;

  static double? of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<TabBottomInset>()?.bottom;

  @override
  bool updateShouldNotify(TabBottomInset old) => old.bottom != bottom;
}

/// 所有页面共用的骨架：大标题可折叠顶栏 + 共享滚动行为 + 安全区 + 可选的下拉刷新。
/// 参考 NexioSchedule 的 DocumentPageScaffold 思路：顶栏和内容必须用同一个滚动行为，
/// 否则折叠不联动（flutter-miuix skill 的避坑清单第 4 条）。
class HianaPage extends StatefulWidget {
  const HianaPage({
    super.key,
    required this.title,
    required this.children,
    this.onRefresh,
    this.showBack = false,
    this.collapsible = true,
    this.snackbar,
    this.overlays = const [],
  });

  final String title;
  final List<Widget> children;

  /// 传了就支持下拉刷新；Future 结束时收起刷新圈。
  final Future<void> Function()? onRefresh;
  final bool showBack;

  /// false 时用静态小标题（登录页这类短页面）。
  final bool collapsible;
  final MiuixSnackbarHostState? snackbar;

  /// 声明式弹层（MiuixOverlayDialog / MiuixOverlayBottomSheet），放在树里由 show 控制。
  final List<Widget> overlays;

  @override
  State<HianaPage> createState() => _HianaPageState();
}

class _HianaPageState extends State<HianaPage> {
  final _behavior = MiuixExitUntilCollapsedScrollBehavior();
  bool _refreshing = false;

  void _refresh() {
    final run = widget.onRefresh;
    if (run == null || _refreshing) return;
    setState(() => _refreshing = true);
    unawaited(
      run().whenComplete(() {
        if (mounted) setState(() => _refreshing = false);
      }),
    );
  }

  Widget? _backButton(BuildContext context) {
    if (!widget.showBack) return null;
    return MiuixIconButton(
      onPressed: () => Navigator.of(context).maybePop(),
      child: MiuixIcon(vector: MiuixIcons.extended.byName('back'), contentDescription: '返回'),
    );
  }

  @override
  Widget build(BuildContext context) {
    final system = MediaQuery.paddingOf(context);
    final tabBottom = TabBottomInset.of(context);
    final insets = tabBottom == null ? system : system.copyWith(bottom: tabBottom);

    final topBar = widget.collapsible
        ? MiuixTopAppBar(title: widget.title, scrollBehavior: _behavior, navigationIcon: _backButton(context))
        : MiuixSmallTopAppBar(title: widget.title, navigationIcon: _backButton(context));

    return MiuixScaffold(
      topBar: topBar,
      contentWindowInsets: insets,
      snackbarHost: widget.snackbar == null ? null : MiuixSnackbarHost(state: widget.snackbar!),
      content: (padding) {
        // 两侧留出刘海 / 挖孔的安全区，和 Nexio 的做法一致
        final listPadding = padding.copyWith(top: padding.top + 4, bottom: padding.bottom + 24);
        Widget list = ListView(
          padding: listPadding,
          physics: const AlwaysScrollableScrollPhysics(),
          children: widget.children,
        );
        if (widget.onRefresh != null) {
          list = MiuixPullToRefresh(
            isRefreshing: _refreshing,
            onRefresh: _refresh,
            topAppBarScrollBehavior: widget.collapsible ? _behavior : null,
            contentPadding: EdgeInsets.only(top: padding.top),
            child: list,
          );
        }
        if (widget.collapsible) list = MiuixScrollBehaviorListener(behavior: _behavior, child: list);
        // flutter_miuix 的输入框需要 Material 祖先（skill 心智模型第 5 条）
        return MaterialSurface(child: Stack(children: [Positioned.fill(child: list), ...widget.overlays]));
      },
    );
  }
}
