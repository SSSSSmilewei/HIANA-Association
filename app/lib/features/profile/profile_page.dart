import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../core/heatmap.dart';
import '../../data/api_client.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../widgets/common.dart';
import '../../widgets/heatmap_view.dart';
import '../auth/set_password_page.dart';

/// 我的：学习热力图（总览 + 按写代码 / 刷题 / 英语分组）、平台绑定、设置。
class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  final _snackbar = MiuixSnackbarHostState();
  ProviderInfo? _binding; // 正在编辑的平台；非空时底部面板打开
  bool _confirmLogout = false;

  static const _groups = [('site', '协会平台'), ('code', '写代码'), ('algo', '刷题'), ('english', '英语')];
  static const _themeModes = [
    (MiuixColorSchemeMode.system, '跟随系统'),
    (MiuixColorSchemeMode.light, '浅色'),
    (MiuixColorSchemeMode.dark, '深色'),
    (MiuixColorSchemeMode.monetSystem, '跟随壁纸取色'),
  ];

  Future<void> _checkUpdate() async {
    try {
      final info = await PackageInfo.fromPlatform();
      final v = await ref.read(apiProvider).appVersion();
      if (compareVersion(info.version, v.latest) >= 0) {
        _snackbar.showSnackbar('已经是最新版本 ${info.version}');
      } else if (v.apkUrl != null) {
        await launchUrl(Uri.parse(v.apkUrl!), mode: LaunchMode.externalApplication);
      } else {
        _snackbar.showSnackbar('有新版本 ${v.latest}，找会长要安装包');
      }
    } on ApiException catch (e) {
      _snackbar.showSnackbar(e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(sessionProvider).valueOrNull?.member;
    final heatmap = ref.watch(heatmapProvider);
    final mode = ref.watch(themeModeProvider);
    final modeIndex = _themeModes.indexWhere((m) => m.$1 == mode);

    return HianaPage(
      title: '我的',
      snackbar: _snackbar,
      onRefresh: () => ref.refresh(heatmapProvider.future).then((_) {}, onError: (_) {}),
      overlays: [
        BindingSheet(
          provider: _binding,
          binding: _binding == null ? null : heatmap.valueOrNull?.bindingOf(_binding!.id),
          onClose: () => setState(() => _binding = null),
          onDone: (msg) {
            setState(() => _binding = null);
            _snackbar.showSnackbar(msg);
            ref.invalidate(heatmapProvider);
          },
        ),
        MiuixOverlayDialog(
          show: _confirmLogout,
          title: '退出登录',
          summary: '退出后要用学号和密码重新登录。',
          onDismissRequest: () => setState(() => _confirmLogout = false),
          content: Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Row(
              children: [
                Expanded(child: MiuixTextButton('取消', onPressed: () => setState(() => _confirmLogout = false))),
                const SizedBox(width: 12),
                Expanded(
                  child: MiuixTextButton(
                    '退出登录',
                    colors: MiuixButtonDefaults.buttonColorsPrimary(context),
                    onPressed: () {
                      setState(() => _confirmLogout = false);
                      ref.read(sessionProvider.notifier).logout();
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
      children: [
        if (me != null)
          Section(
            children: [
              MiuixBasicComponent(
                title: me.name,
                summary: [me.studentNo, if (me.className != null) me.className!].join('　'),
              ),
            ],
          ),
        ...heatmap.when(
          loading: () => const [LoadingBlock()],
          error: (e, _) => [NoticeCard(message: '$e', actionLabel: '重试', onAction: () => ref.invalidate(heatmapProvider))],
          data: _heatmapBlocks,
        ),
        Section(
          title: '设置',
          children: [
            MiuixOverlayDropdownPreference(
              title: '深色模式',
              items: [for (final m in _themeModes) m.$2],
              selectedIndex: modeIndex < 0 ? 0 : modeIndex,
              onSelectedIndexChange: (i) => ref.read(themeModeProvider.notifier).set(_themeModes[i].$1),
            ),
            MiuixArrowPreference(title: '修改密码', onClick: () => context.pushPage(const SetPasswordPage())),
            MiuixArrowPreference(title: '检查更新', onClick: _checkUpdate),
            MiuixArrowPreference(
              title: '退出登录',
              titleColor: MiuixBasicComponentColors(
                color: MiuixTheme.of(context).colors.error,
                disabledColor: MiuixTheme.of(context).colors.disabledOnSurface,
              ),
              onClick: () => setState(() => _confirmLogout = true),
            ),
          ],
        ),
      ],
    );
  }

  List<Widget> _heatmapBlocks(HeatmapPayload h) {
    final providers = {for (final p in h.providers) p.id: p};
    final failed = h.series.where((s) => s.error != null).toList();
    return [
      Section(
        title: '学习热力图',
        padding: const EdgeInsets.all(16),
        children: [HeatmapView(grid: overview(h.series, h.today, weeks: 17), unit: '个来源有记录')],
      ),
      for (final s in failed) NoticeCard(message: '${s.label} 同步失败：${s.error}'),
      for (final g in _groups)
        if (h.series.any((s) => s.error == null && (s.source == 'site' ? g.$1 == 'site' : providers[s.source]?.category == g.$1)))
          Section(
            title: g.$2,
            padding: const EdgeInsets.all(16),
            children: [
              for (final s in h.series.where(
                (s) => s.error == null && (s.source == 'site' ? g.$1 == 'site' : providers[s.source]?.category == g.$1),
              )) ...[
                MiuixText(s.label, fontSize: 13, color: MiuixTheme.of(context).colors.onSurfaceVariantSummary),
                const SizedBox(height: 6),
                HeatmapView(grid: buildGrid(s.days, h.today, weeks: 17), unit: s.unit, showMonths: false, compact: true),
                const SizedBox(height: 12),
              ],
            ],
          ),
      Section(
        title: '绑定学习平台',
        children: [
          for (final p in h.providers.where((p) => p.available))
            MiuixArrowPreference(
              title: p.label,
              summary: _bindingSummary(h.bindingOf(p.id), h.today),
              onClick: () => setState(() => _binding = p),
            ),
        ],
      ),
    ];
  }

  String _bindingSummary(BindingInfo? b, String today) {
    if (b == null) return '未绑定';
    if (b.lastError != null) return '${b.handle} · 上次同步失败';
    if (b.syncedAt == null) return '${b.handle} · 等待今晚 23:30 同步';
    return '${b.handle} · ${whenText(b.syncedAt!, today)} 同步';
  }
}

/// 绑定 / 修改 / 解绑一个学习平台的底部面板。弹层是声明式的：provider 为空时收起。
class BindingSheet extends ConsumerStatefulWidget {
  const BindingSheet({super.key, required this.provider, required this.binding, required this.onClose, required this.onDone});
  final ProviderInfo? provider;
  final BindingInfo? binding;
  final VoidCallback onClose;
  final ValueChanged<String> onDone;

  @override
  ConsumerState<BindingSheet> createState() => _BindingSheetState();
}

class _BindingSheetState extends ConsumerState<BindingSheet> {
  final _handle = TextEditingController();
  final _secret = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void didUpdateWidget(BindingSheet old) {
    super.didUpdateWidget(old);
    if (widget.provider?.id != old.provider?.id) {
      _handle.text = widget.binding?.handle ?? '';
      _secret.clear();
      _error = widget.binding?.lastError;
    }
  }

  @override
  void dispose() {
    _handle.dispose();
    _secret.dispose();
    super.dispose();
  }

  Future<void> _run(Future<String> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      widget.onDone(await action());
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.provider;
    final api = ref.read(apiProvider);
    final colors = MiuixTheme.of(context).colors;
    return MiuixOverlayBottomSheet(
      show: p != null,
      title: p == null ? '' : '绑定${p.label}',
      onDismissRequest: widget.onClose,
      content: p == null
          ? const SizedBox.shrink()
          : Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  MiuixText(p.handleHint, color: colors.onSurfaceVariantSummary, fontSize: 13),
                  if (p.status == 'unofficial') ...[
                    const SizedBox(height: 4),
                    MiuixText('这个平台用的是非官方接口，偶尔会同步失败。', color: colors.onSurfaceVariantSummary, fontSize: 13),
                  ],
                  const SizedBox(height: 12),
                  MiuixTextField(controller: _handle, label: '用户名', useLabelAsPlaceholder: true, singleLine: true),
                  if (p.needsUserSecret != null) ...[
                    const SizedBox(height: 12),
                    MiuixTextField(
                      controller: _secret,
                      label: widget.binding?.hasSecret == true ? '令牌（已保存，不改就留空）' : p.needsUserSecret!,
                      useLabelAsPlaceholder: true,
                      singleLine: true,
                      obscureText: true,
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    MiuixText(_error!, color: colors.error, fontSize: 13),
                  ],
                  const SizedBox(height: 16),
                  WideButton(
                    text: _busy ? '正在同步…' : (widget.binding == null ? '绑定并同步' : '保存并同步'),
                    enabled: !_busy,
                    onPressed: () {
                      if (_handle.text.trim().isEmpty) {
                        setState(() => _error = '填上你在${p.label}的用户名');
                        return;
                      }
                      _run(() async {
                        final err = await api.bind(source: p.id, handle: _handle.text.trim(), secret: _secret.text.trim());
                        return err == null ? '${p.label}已绑定' : '${p.label}已绑定，但这次同步失败：$err';
                      });
                    },
                  ),
                  if (widget.binding != null) ...[
                    const SizedBox(height: 8),
                    WideButton(
                      text: '解除绑定',
                      primary: false,
                      enabled: !_busy,
                      onPressed: () => _run(() async {
                        await api.unbind(p.id);
                        return '已解除${p.label}的绑定';
                      }),
                    ),
                  ],
                ],
              ),
            ),
    );
  }
}
