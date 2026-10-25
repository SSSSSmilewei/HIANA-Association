import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../core/heatmap.dart';
import '../../data/api_client.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../widgets/heat.dart';
import '../../widgets/hx_icons.dart';
import '../../widgets/ui.dart';
import '../auth/set_password_page.dart';

/// 我的：一年的热力图（按来源开关、点格子看当天）、来源和绑定、外观、账号。
class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  final _off = <String>{};
  String? _selected;
  ProviderInfo? _binding; // 正在编辑的平台；非空时底部面板打开
  bool _confirmLogout = false;

  static const _modes = [(MiuixColorSchemeMode.light, '浅色'), (MiuixColorSchemeMode.dark, '深色'), (MiuixColorSchemeMode.system, '跟随系统')];

  Color _dot(Hx h, SourceSeries s) => switch (s.source) {
        'site:attendance' => h.heat[2],
        'site:reflection' => h.heat[1],
        'site:study' => h.heat[3],
        _ => h.sub,
      };

  Future<void> _checkUpdate() async {
    try {
      final info = await PackageInfo.fromPlatform();
      final v = await ref.read(apiProvider).appVersion();
      if (!mounted) return;
      if (compareVersion(info.version, v.latest) >= 0) {
        showHxToast(context, '已经是最新版本 ${info.version}');
      } else if (v.apkUrl != null) {
        await launchUrl(Uri.parse(v.apkUrl!), mode: LaunchMode.externalApplication);
      } else {
        showHxToast(context, '有新版本 ${v.latest}，找会长要安装包');
      }
    } on ApiException catch (e) {
      if (mounted) showHxToast(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final me = ref.watch(sessionProvider).valueOrNull?.member;
    final heat = ref.watch(heatmapProvider);
    final mode = ref.watch(themeModeProvider);

    return HianaPage(
      title: '我的',
      onRefresh: () => ref.refresh(heatmapProvider.future).then((_) {}, onError: (_) {}),
      overlays: [
        BindingSheet(
          provider: _binding,
          binding: _binding == null ? null : heat.valueOrNull?.bindingOf(_binding!.id),
          onClose: () => setState(() => _binding = null),
          onDone: (msg) {
            setState(() => _binding = null);
            showHxToast(context, msg);
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
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
            child: Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: h.tint, shape: BoxShape.circle),
                  child: Text(me.name.isEmpty ? '?' : me.name.substring(0, 1), style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: h.accentText)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    [if (me.className != null) me.className!, '学号 ${me.studentNo}'].join(' · '),
                    style: TextStyle(fontSize: 14, color: h.sub),
                  ),
                ),
              ],
            ),
          ),
        ...heat.when(
          loading: () => [const Padding(padding: EdgeInsets.all(12), child: Skeleton(height: 220, radius: 24))],
          error: (e, _) => [Padding(padding: const EdgeInsets.all(12), child: ErrorCard(error: e, onRetry: () => ref.invalidate(heatmapProvider)))],
          data: (p) => _heatBlocks(h, p),
        ),
        const SectionHead('外观'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: HxSeg<MiuixColorSchemeMode>(
            options: _modes,
            value: _modes.any((m) => m.$1 == mode) ? mode : MiuixColorSchemeMode.system,
            onChanged: (m) => ref.read(themeModeProvider.notifier).set(m),
          ),
        ),
        const SectionHead('账号'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: HxCard(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: [
                _Row(icon: HxIcon.key, title: '修改密码', onTap: () => context.pushPage(const SetPasswordPage())),
                _Row(icon: HxIcon.bell, title: '检查更新', onTap: _checkUpdate),
                _Row(icon: HxIcon.logout, title: '退出登录', danger: true, onTap: () => setState(() => _confirmLogout = true)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  List<Widget> _heatBlocks(Hx h, HeatmapPayload p) {
    final on = p.series.where((s) => !_off.contains(s.source) && s.error == null).toList();
    final grid = overview(on, p.today, weeks: 53);
    final day = _selected ?? p.today;
    final parts = [for (final s in on) if ((s.days[day] ?? 0) > 0) '${s.label} ${s.days[day]} ${s.unit}'];
    return [
      const SectionHead('一年的学习'),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: HxCard(
          radius: 24,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('过去一年有 ${grid.activeDays} 天在学。没有连续天数，哪天没来不会断。', style: TextStyle(fontSize: 13, color: h.sub)),
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final s in p.series)
                    Pressable(
                      onTap: () => setState(() => _off.contains(s.source) ? _off.remove(s.source) : _off.add(s.source)),
                      semanticLabel: s.label,
                      child: AnimatedContainer(
                        duration: HxMotion.mid,
                        height: 34,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: _off.contains(s.source) ? null : h.well,
                          borderRadius: BorderRadius.circular(17),
                          border: Border.all(color: _off.contains(s.source) ? h.lineStrong : h.line),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: _off.contains(s.source) ? null : _dot(h, s),
                                border: Border.all(color: _dot(h, s), width: 1.5),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(s.label, style: TextStyle(fontSize: 13, color: _off.contains(s.source) ? h.sub : h.ink)),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 14),
              HeatYear(grid: grid, today: p.today, selected: _selected, onSelect: (d) => setState(() => _selected = d)),
              const SizedBox(height: 10),
              Container(height: 1, color: h.line),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${day == p.today ? '今天 · ' : ''}${longDay(day)}', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: h.ink)),
                        Text(parts.isEmpty ? '这天没有记录' : parts.join('，'), style: TextStyle(fontSize: 12, color: h.sub)),
                      ],
                    ),
                  ),
                  const HeatLegend(),
                ],
              ),
            ],
          ),
        ),
      ),
      const SectionHead('来源'),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: HxCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final s in p.series) ...[
                Row(
                  children: [
                    Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: _dot(h, s))),
                    const SizedBox(width: 8),
                    Text(s.label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: h.ink)),
                    const Spacer(),
                    if (s.error != null) Text('同步失败', style: TextStyle(fontSize: 12, color: h.badInk)),
                  ],
                ),
                const SizedBox(height: 6),
                HeatStrip(grid: buildGrid(s.days, p.today, weeks: 26)),
                const SizedBox(height: 14),
              ],
              Text('绑定站外平台（每天夜里同步一次，只读公开数据）', style: TextStyle(fontSize: 12, color: h.sub)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final pr in p.providers.where((x) => x.available))
                    HxButton(
                      p.bindingOf(pr.id) == null ? pr.label : '${pr.label} ✓',
                      kind: p.bindingOf(pr.id) == null ? HxButtonKind.ghost : HxButtonKind.soft,
                      height: 36,
                      onTap: () => setState(() => _binding = pr),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    ];
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.title, required this.onTap, this.danger = false});
  final HxIcon icon;
  final String title;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final c = danger ? h.badInk : h.ink;
    return Pressable(
      onTap: onTap,
      scale: 0.985,
      semanticLabel: title,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            HxIconView(icon, size: 20, color: c),
            const SizedBox(width: 12),
            Expanded(child: Text(title, style: TextStyle(fontSize: 15, color: c))),
            HxIconView(HxIcon.arrowRight, size: 16, color: h.sub),
          ],
        ),
      ),
    );
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
                  HxButton(
                    _busy ? '正在同步…' : (widget.binding == null ? '绑定并同步' : '保存并同步'), expand: true,
                    enabled: !_busy,
                    onTap: () {
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
                    HxButton(
                      '解除绑定',
                      kind: HxButtonKind.quiet,
                      expand: true,
                      enabled: !_busy,
                      onTap: () => _run(() async {
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
