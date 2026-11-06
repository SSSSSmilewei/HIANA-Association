import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../data/api_client.dart';
import '../../data/providers.dart';
import '../../widgets/kit.dart';
import '../../widgets/ui.dart';
import '../web/web_page.dart';
import 'admin_home.dart';
import 'admin_today.dart';

final adminSettingsProvider = FutureProvider.autoDispose<Map<String, String?>>(
  (ref) => ref.watch(adminApiProvider).settings(),
);

/// 设置与课程包（对照网页 /admin/settings 和课程页的“发布课程包”）：
/// 晚自习日期、时间和现场口令；开学日期、注册开关、App 版本；发布或撤下课程包。
class AdminSettingsPage extends ConsumerStatefulWidget {
  const AdminSettingsPage({super.key});

  @override
  ConsumerState<AdminSettingsPage> createState() => _AdminSettingsPageState();
}

class _AdminSettingsPageState extends ConsumerState<AdminSettingsPage> {
  // 晚自习
  final _days = TextEditingController();
  final _window = TextEditingController();
  bool _requireCode = false;
  bool _ruleLoaded = false;
  // 学期、注册与 App
  final _semester = TextEditingController();
  final _latest = TextEditingController();
  final _min = TextEditingController();
  final _apk = TextEditingController();
  bool _registration = true;
  bool _settingsLoaded = false;
  // 课程包
  final _pkg = TextEditingController();
  final _withdraw = TextEditingController();
  bool _confirmWithdraw = false;
  String? _busy; // 正在保存哪一块

  @override
  void dispose() {
    for (final c in [
      _days,
      _window,
      _semester,
      _latest,
      _min,
      _apk,
      _pkg,
      _withdraw,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _do(String what, Future<void> Function() fn, String ok) async {
    setState(() => _busy = what);
    try {
      await fn();
      if (mounted) showHxToast(context, ok);
    } on ApiException catch (e) {
      if (mounted) showHxToast(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final today = ref.watch(adminTodayProvider).valueOrNull;
    final settings = ref.watch(adminSettingsProvider).valueOrNull;
    if (today != null && !_ruleLoaded) {
      _days.text = today.rule.days.join(',');
      _window.text = today.rule.window.join('-');
      _requireCode = today.rule.requireCode;
      _ruleLoaded = true;
    }
    if (settings != null && !_settingsLoaded) {
      _semester.text = settings['semester_start'] ?? '';
      _latest.text = settings['app_latest_version'] ?? '';
      _min.text = settings['app_min_version'] ?? '';
      _apk.text = settings['app_apk_url'] ?? '';
      _registration = settings['registration_open'] != '0';
      _settingsLoaded = true;
    }
    Widget field(
      TextEditingController c,
      String label, {
      TextInputType? type,
    }) => Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: MiuixTextField(
        controller: c,
        label: label,
        singleLine: true,
        keyboardType: type,
      ),
    );
    Widget switchRow(String title, String sub, bool v, ValueChanged<bool> on) =>
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: TextStyle(fontSize: 15, color: h.ink)),
                    Text(sub, style: TextStyle(fontSize: 12, color: h.sub)),
                  ],
                ),
              ),
              MiuixSwitch(value: v, onChanged: on),
            ],
          ),
        );

    return HianaPage(
      title: '设置与课程包',
      showBack: true,
      overlays: [
        ConfirmDialog(
          show: _confirmWithdraw,
          title: '撤下课程包「${_withdraw.text.trim()}」？',
          summary: '所有人都看不到这门课了，学员的进度记录保留。',
          okText: '撤下',
          onCancel: () => setState(() => _confirmWithdraw = false),
          onOk: () {
            setState(() => _confirmWithdraw = false);
            final slug = _withdraw.text.trim();
            _do('withdraw', () async {
              await ref.read(adminApiProvider).deletePackage(slug);
              ref.invalidate(coursesProvider);
              _withdraw.clear();
            }, '已撤下');
          },
        ),
      ],
      children: [
        const SectionHead('晚自习'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: HxCard(
            child: today == null
                ? const Skeleton(height: 160)
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      field(_days, '晚自习日期（1 是周一，7 是周日，例如 1,2,4）'),
                      field(_window, '时间段（例如 19:00-20:40）'),
                      switchRow(
                        '现场口令',
                        '开启后晚自习签到需要填写当天的口令',
                        _requireCode,
                        (v) => setState(() => _requireCode = v),
                      ),
                      HxButton(
                        '保存晚自习设置',
                        busy: _busy == 'rule',
                        enabled: _busy == null,
                        onTap: () => _do('rule', () async {
                          await ref
                              .read(adminApiProvider)
                              .saveEveningRule(
                                days: _days.text.trim(),
                                window: _window.text.trim(),
                                requireCode: _requireCode,
                              );
                          ref.invalidate(adminTodayProvider);
                          ref.invalidate(attendanceProvider);
                        }, '晚自习设置已保存'),
                      ),
                    ],
                  ),
          ),
        ),
        const SectionHead('学期、注册与 App'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: HxCard(
            child: settings == null
                ? const Skeleton(height: 260)
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      field(
                        _semester,
                        '开学日期（第 1 周的周一，例如 2026-09-07）',
                        type: TextInputType.datetime,
                      ),
                      switchRow(
                        '开放注册',
                        '关闭后即使有邀请码也不能注册',
                        _registration,
                        (v) => setState(() => _registration = v),
                      ),
                      field(_latest, 'App 最新版本（例如 0.5.0）'),
                      field(_min, 'App 最低可用版本（低于它会要求更新）'),
                      field(_apk, '安装包下载地址（https://）', type: TextInputType.url),
                      HxButton(
                        '保存',
                        busy: _busy == 'settings',
                        enabled: _busy == null,
                        onTap: () => _do('settings', () async {
                          final v = <String, String>{
                            'registration_open': _registration ? '1' : '0',
                            for (final (k, c) in [
                              ('semester_start', _semester),
                              ('app_latest_version', _latest),
                              ('app_min_version', _min),
                              ('app_apk_url', _apk),
                            ])
                              if (c.text.trim().isNotEmpty) k: c.text.trim(),
                          };
                          await ref.read(adminApiProvider).saveSettings(v);
                          ref.invalidate(adminSettingsProvider);
                          ref.invalidate(calendarProvider);
                        }, '已保存'),
                      ),
                    ],
                  ),
          ),
        ),
        const SectionHead('课程包'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: HxCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  '把课程包（hiana-course@1 格式的 JSON）粘贴到下面，发布后所有人都能看到这门课；同一 slug 再次发布会覆盖。',
                  style: TextStyle(fontSize: 13, height: 1.5, color: h.sub),
                ),
                const SizedBox(height: 10),
                MiuixTextField(
                  controller: _pkg,
                  label: '课程包 JSON',
                  useLabelAsPlaceholder: true,
                  minLines: 5,
                  maxLines: 10,
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: HxButton(
                        '从剪贴板粘贴',
                        kind: HxButtonKind.soft,
                        onTap: () async {
                          final d = await Clipboard.getData(
                            Clipboard.kTextPlain,
                          );
                          if (d?.text != null) _pkg.text = d!.text!;
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: HxButton(
                        '发布',
                        busy: _busy == 'publish',
                        enabled: _busy == null,
                        onTap: () {
                          final Object? json;
                          try {
                            json = jsonDecode(_pkg.text);
                          } on FormatException catch (e) {
                            showHxToast(
                              context,
                              '不是有效的 JSON：${e.message}',
                              error: true,
                            );
                            return;
                          }
                          if (json is! Map<String, dynamic>) {
                            showHxToast(
                              context,
                              '课程包应该是一个 JSON 对象',
                              error: true,
                            );
                            return;
                          }
                          _do('publish', () async {
                            await ref
                                .read(adminApiProvider)
                                .publishPackage(json as Map<String, dynamic>);
                            ref.invalidate(coursesProvider);
                            _pkg.clear();
                          }, '已发布「${json['title'] ?? json['slug'] ?? ''}」');
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                MiuixTextField(
                  controller: _withdraw,
                  label: '要撤下的课程 slug（例如 my-course）',
                  useLabelAsPlaceholder: true,
                  singleLine: true,
                ),
                const SizedBox(height: 10),
                HxButton(
                  '撤下课程包',
                  kind: HxButtonKind.ghost,
                  busy: _busy == 'withdraw',
                  enabled: _busy == null,
                  onTap: () {
                    if (_withdraw.text.trim().isEmpty) return;
                    setState(() => _confirmWithdraw = true);
                  },
                ),
              ],
            ),
          ),
        ),
        RowGroup(
          children: [
            ListRow(
              title: '课程包格式说明',
              subtitle: '字段说明、示例和给 AI 用的整理提示词',
              onTap: () => context.pushPage(
                const WebPage(
                  title: '课程包格式说明',
                  path: '/courses/format',
                  stayPrefix: '/courses/format',
                ),
              ),
            ),
          ],
        ),
        const FootNote('只能撤下管理员发布的课程包；仓库自带的课程需要修改仓库内容。'),
      ],
    );
  }
}
