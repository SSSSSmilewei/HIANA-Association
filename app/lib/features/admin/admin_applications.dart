import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../data/admin.dart';
import '../../data/api_client.dart';
import '../../widgets/kit.dart';
import '../../widgets/ui.dart';
import 'admin_home.dart';

/// 列表的筛选条件：(状态, 搜索词)
final adminApplicationsProvider = FutureProvider.autoDispose
    .family<ApplicationList, (String?, String)>(
      (ref, f) =>
          ref.watch(adminApiProvider).applications(status: f.$1, q: f.$2),
    );

String _tone(String status) => switch (status) {
  'new' => 'accent',
  'accepted' => 'ok',
  'rejected' => 'bad',
  _ => 'muted',
};

/// 新生报名（对照网页 /admin/applications）：按状态筛选、搜索、开关招新、导出 CSV；点一条看详情。
class AdminApplicationsPage extends ConsumerStatefulWidget {
  const AdminApplicationsPage({super.key});

  @override
  ConsumerState<AdminApplicationsPage> createState() =>
      _AdminApplicationsPageState();
}

class _AdminApplicationsPageState extends ConsumerState<AdminApplicationsPage> {
  String? _status;
  final _q = TextEditingController();
  String _query = '';
  bool _closing = false; // 关闭招新的对话框
  final _message = TextEditingController();

  @override
  void dispose() {
    _q.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _setOpen(bool open, [String? message]) async {
    try {
      await ref
          .read(adminApiProvider)
          .saveRecruit(open: open, message: message);
      ref.invalidate(adminApplicationsProvider);
      if (mounted) showHxToast(context, open ? '招新已开启' : '招新已关闭');
    } on ApiException catch (e) {
      if (mounted) showHxToast(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final data = ref.watch(adminApplicationsProvider((_status, _query)));
    final d = data.valueOrNull;
    return HianaPage(
      title: '新生报名',
      showBack: true,
      onRefresh: () async => ref.invalidate(adminApplicationsProvider),
      overlays: [
        ConfirmDialog(
          show: _closing,
          title: '关闭招新？',
          summary: '关闭后协会介绍中不再显示“新生报名”，新提交的报名会被拒绝并显示下面的提示语。',
          okText: '关闭招新',
          onCancel: () => setState(() => _closing = false),
          onOk: () {
            setState(() => _closing = false);
            _setOpen(false, _message.text.trim());
          },
          child: MiuixTextField(
            controller: _message,
            label: '关闭时的提示语',
            singleLine: true,
          ),
        ),
      ],
      children: [
        if (d != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: HxCard(
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          d.settings.open ? '招新进行中' : '招新已关闭',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: h.ink,
                          ),
                        ),
                        Text(
                          d.settings.open
                              ? '协会介绍的结尾显示报名表。'
                              : '提示语：${d.settings.message}',
                          style: TextStyle(fontSize: 13, color: h.sub),
                        ),
                      ],
                    ),
                  ),
                  MiuixSwitch(
                    value: d.settings.open,
                    onChanged: (v) {
                      if (v) {
                        _setOpen(true);
                      } else {
                        _message.text = d.settings.message;
                        setState(() => _closing = true);
                      }
                    },
                  ),
                ],
              ),
            ),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
          child: MiuixTextField(
            controller: _q,
            label: '搜索姓名、学号或班级',
            useLabelAsPlaceholder: true,
            singleLine: true,
            textInputAction: TextInputAction.search,
            onSubmitted: (v) => setState(() => _query = v.trim()),
          ),
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
          child: Row(
            children: [
              for (final s in [null, ...kApplicationStatuses])
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: Pressable(
                    onTap: () => setState(() => _status = s),
                    child: HxTag(
                      '${s == null ? '全部' : kApplicationStatusLabel[s]} ${d?.counts[s ?? 'all'] ?? ''}',
                      bg: _status == s ? h.ink : h.well,
                      fg: _status == s ? h.bg : h.ink,
                      bold: _status == s,
                    ),
                  ),
                ),
            ],
          ),
        ),
        SectionHead(
          '报名列表',
          trailing: Pressable(
            onTap: () => downloadAndOpen(
              context,
              ref,
              '/api/admin/applications.csv',
              '新生报名_${cnToday()}.csv',
            ),
            child: Text(
              '导出 CSV',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: h.accentText,
              ),
            ),
          ),
        ),
        ...data.when(
          loading: () => [
            const Padding(
              padding: EdgeInsets.all(12),
              child: Skeleton(height: 240, radius: 22),
            ),
          ],
          error: (e, _) => [
            Padding(
              padding: const EdgeInsets.all(12),
              child: ErrorCard(
                error: e,
                onRetry: () => ref.invalidate(adminApplicationsProvider),
              ),
            ),
          ],
          data: (d) => [
            if (d.items.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: EmptyCard(title: '没有符合条件的报名'),
              )
            else
              RowGroup(
                children: [
                  for (final a in d.items)
                    ListRow(
                      title: a.name,
                      subtitle: [
                        a.className,
                        a.studentId,
                        dayTime(a.createdAt),
                        if (a.submitCount > 1) '提交 ${a.submitCount} 次',
                      ].join(' · '),
                      trailing: StateTag(a.statusLabel, tone: _tone(a.status)),
                      onTap: () =>
                          context.pushPage(ApplicationDetailPage(id: a.id)),
                    ),
                ],
              ),
            const FootNote('新报名会发送微信通知（不含手机号和 QQ）。同一学号再次提交会覆盖上一次。'),
          ],
        ),
      ],
    );
  }
}

final _detailProvider = FutureProvider.autoDispose
    .family<ApplicationDetail, String>(
      (ref, id) => ref.watch(adminApiProvider).application(id),
    );

class ApplicationDetailPage extends ConsumerStatefulWidget {
  const ApplicationDetailPage({super.key, required this.id});
  final String id;

  @override
  ConsumerState<ApplicationDetailPage> createState() =>
      _ApplicationDetailPageState();
}

class _ApplicationDetailPageState extends ConsumerState<ApplicationDetailPage> {
  final _note = TextEditingController();
  bool _noteLoaded = false;
  bool _deleting = false;
  bool _busy = false;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _patch({String? status, bool note = false}) async {
    setState(() => _busy = true);
    try {
      await ref
          .read(adminApiProvider)
          .updateApplication(
            widget.id,
            status: status,
            adminNote: note ? _note.text.trim() : null,
            setNote: note,
          );
      ref.invalidate(_detailProvider(widget.id));
      ref.invalidate(adminApplicationsProvider);
      if (mounted) {
        showHxToast(
          context,
          status != null ? '已改为“${kApplicationStatusLabel[status]}”' : '备注已保存',
        );
      }
    } on ApiException catch (e) {
      if (mounted) showHxToast(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _copy(String text, String what) {
    Clipboard.setData(ClipboardData(text: text));
    showHxToast(context, '$what已复制');
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final data = ref.watch(_detailProvider(widget.id));
    final d = data.valueOrNull;
    if (d != null && !_noteLoaded) {
      _note.text = d.adminNote ?? '';
      _noteLoaded = true;
    }
    return HianaPage(
      title: d?.summary.name ?? '报名详情',
      showBack: true,
      onRefresh: () => ref
          .refresh(_detailProvider(widget.id).future)
          .then((_) {}, onError: (_) {}),
      overlays: [
        ConfirmDialog(
          show: _deleting,
          title: '删除${d?.summary.name ?? ''}的报名？',
          summary: '删除后无法恢复。如果只是不录取，请把状态改为“未通过”。',
          okText: '删除',
          onCancel: () => setState(() => _deleting = false),
          onOk: () async {
            setState(() => _deleting = false);
            try {
              await ref.read(adminApiProvider).deleteApplication(widget.id);
              ref.invalidate(adminApplicationsProvider);
              if (context.mounted) {
                showHxToast(context, '已删除');
                Navigator.of(context).maybePop();
              }
            } on ApiException catch (e) {
              if (context.mounted) showHxToast(context, e.message, error: true);
            }
          },
        ),
      ],
      children: [
        if (d == null)
          Padding(
            padding: const EdgeInsets.all(12),
            child: data.hasError
                ? ErrorCard(
                    error: data.error!,
                    onRetry: () => ref.invalidate(_detailProvider(widget.id)),
                  )
                : const Skeleton(height: 400, radius: 22),
          )
        else ...[
          RowGroup(
            children: [
              ListRow(title: '班级', trailing: _Value(d.summary.className)),
              ListRow(title: '学号', trailing: _Value(d.summary.studentId)),
              ListRow(
                title: '手机号',
                subtitle: '点按复制',
                trailing: _Value(d.phone),
                arrow: false,
                onTap: () => _copy(d.phone, '手机号'),
              ),
              ListRow(
                title: 'QQ',
                subtitle: '点按复制',
                trailing: _Value(d.qq),
                arrow: false,
                onTap: () => _copy(d.qq, 'QQ 号'),
              ),
              ListRow(
                title: '提交时间',
                trailing: _Value(
                  d.summary.submitCount > 1
                      ? '${dayTime(d.summary.updatedAt)}（第 ${d.summary.submitCount} 次）'
                      : dayTime(d.summary.createdAt),
                ),
              ),
            ],
          ),
          const SectionHead('状态'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final s in kApplicationStatuses)
                  Pressable(
                    enabled: !_busy,
                    onTap: () {
                      if (s != d.summary.status) _patch(status: s);
                    },
                    child: HxTag(
                      kApplicationStatusLabel[s]!,
                      bg: s == d.summary.status ? h.ink : h.well,
                      fg: s == d.summary.status ? h.bg : h.ink,
                      bold: s == d.summary.status,
                    ),
                  ),
              ],
            ),
          ),
          const SectionHead('回答'),
          for (var i = 0; i < kApplicationQuestions.length; i++)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
              child: HxCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${i + 1}. ${kApplicationQuestions[i].$1}',
                      style: TextStyle(fontSize: 13, color: h.sub),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      (i < d.answers.length ? d.answers[i] : null) ?? '（未填写）',
                      style: TextStyle(fontSize: 15, height: 1.6, color: h.ink),
                    ),
                  ],
                ),
              ),
            ),
          const SectionHead('管理员备注'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: HxCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  MiuixTextField(
                    controller: _note,
                    label: '只有管理员能看到',
                    useLabelAsPlaceholder: true,
                    minLines: 3,
                  ),
                  const SizedBox(height: 12),
                  HxButton(
                    '保存备注',
                    kind: HxButtonKind.soft,
                    enabled: !_busy,
                    onTap: () => _patch(note: true),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: HxButton(
              '删除这条报名',
              kind: HxButtonKind.ghost,
              expand: true,
              onTap: () => setState(() => _deleting = true),
            ),
          ),
        ],
      ],
    );
  }
}

class _Value extends StatelessWidget {
  const _Value(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: const BoxConstraints(maxWidth: 200),
    child: Text(
      text,
      textAlign: TextAlign.end,
      style: TextStyle(
        fontSize: 14,
        color: Hx.of(context).sub,
        fontFeatures: kTabular,
      ),
    ),
  );
}
