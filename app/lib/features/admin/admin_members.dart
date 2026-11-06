import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../app/tokens.dart';
import '../../data/admin.dart';
import '../../data/api_client.dart';
import '../../data/providers.dart';
import '../../widgets/kit.dart';
import '../../widgets/ui.dart';
import 'admin_home.dart';

final adminMembersProvider = FutureProvider.autoDispose<List<AdminMember>>(
  (ref) => ref.watch(adminApiProvider).members(),
);
final adminInvitesProvider = FutureProvider.autoDispose<List<Invite>>(
  (ref) => ref.watch(adminApiProvider).invites(),
);

/// 成员与邀请码（对照网页 /admin/members）：搜索成员，重置密码、设为管理员、停用；生成和作废邀请码。
class AdminMembersPage extends ConsumerStatefulWidget {
  const AdminMembersPage({super.key});

  @override
  ConsumerState<AdminMembersPage> createState() => _AdminMembersPageState();
}

/// 对一个成员的操作
enum _Act { reset, admin, member, archive, restore }

class _AdminMembersPageState extends ConsumerState<AdminMembersPage> {
  int _tab = 0;
  final _q = TextEditingController();
  AdminMember? _picked; // 打开操作面板的成员
  (AdminMember, _Act)? _confirm;
  String? _resetCode; // 刚生成的重置码（只显示这一次）
  String _resetFor = '';
  List<String>? _newCodes; // 刚生成的邀请码
  Invite? _revoking;

  // 生成邀请码
  final _count = TextEditingController(text: '5');
  final _days = TextEditingController(text: '30');
  final _note = TextEditingController();
  String _kind = 'campus';
  bool _creating = false;

  @override
  void dispose() {
    for (final c in [_q, _count, _days, _note]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _run(AdminMember m, _Act a) async {
    final api = ref.read(adminApiProvider);
    try {
      switch (a) {
        case _Act.reset:
          final code = await api.resetCode(m.id);
          setState(() {
            _resetCode = code;
            _resetFor = m.name;
          });
        case _Act.admin || _Act.member:
          await api.setRole(m.id, admin: a == _Act.admin);
          if (mounted) {
            showHxToast(
              context,
              a == _Act.admin ? '${m.name} 现在是管理员' : '已取消 ${m.name} 的管理员',
            );
          }
        case _Act.archive || _Act.restore:
          await api.setStatus(m.id, active: a == _Act.restore);
          if (mounted) {
            showHxToast(
              context,
              a == _Act.archive ? '已停用 ${m.name}' : '已恢复 ${m.name}',
            );
          }
      }
      ref.invalidate(adminMembersProvider);
    } on ApiException catch (e) {
      if (mounted) showHxToast(context, e.message, error: true);
    }
  }

  Future<void> _createInvites() async {
    final count = int.tryParse(_count.text.trim());
    final daysText = _days.text.trim();
    final days = daysText.isEmpty ? null : int.tryParse(daysText);
    if (count == null || count < 1) {
      showHxToast(context, '数量请填写正整数', error: true);
      return;
    }
    if (daysText.isNotEmpty && (days == null || days < 1)) {
      showHxToast(context, '有效天数请填写 1–365 的整数，留空表示不过期', error: true);
      return;
    }
    setState(() => _creating = true);
    try {
      final codes = await ref
          .read(adminApiProvider)
          .createInvites(
            count: count,
            days: days,
            note: _note.text.trim(),
            kind: _kind,
          );
      ref.invalidate(adminInvitesProvider);
      setState(() => _newCodes = codes);
    } on ApiException catch (e) {
      if (mounted) showHxToast(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  void _copy(String text, String msg) {
    Clipboard.setData(ClipboardData(text: text));
    showHxToast(context, msg);
  }

  static const _texts = {
    _Act.reset: ('重置密码', '旧密码失效，已登录的设备会退出。生成的重置码在登录页“忘记密码”中使用。', '重置'),
    _Act.admin: ('设为管理员', '可以查看所有签到照片、管理成员、发布公告。', '设为管理员'),
    _Act.member: ('取消管理员', null, '取消管理员'),
    _Act.archive: ('停用账号', '停用后不能登录，不计入统计，记录保留。', '停用'),
    _Act.restore: ('恢复账号', null, '恢复'),
  };

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final selfId = ref.watch(sessionProvider).valueOrNull?.member?.id;
    final picked = _picked;
    final confirm = _confirm;
    return HianaPage(
      title: '成员与邀请码',
      showBack: true,
      onRefresh: () async {
        ref.invalidate(adminInvitesProvider);
        await ref
            .refresh(adminMembersProvider.future)
            .then((_) {}, onError: (_) {});
      },
      overlays: [
        MiuixOverlayBottomSheet(
          show: picked != null,
          title: picked?.name ?? '',
          onDismissRequest: () => setState(() => _picked = null),
          content: picked == null
              ? const SizedBox.shrink()
              : Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        [
                          picked.isExternal
                              ? '校外账号 ${picked.username ?? ''}'
                              : '学号 ${picked.studentNo}',
                          if (picked.className != null) picked.className!,
                          if (picked.org != null) picked.org!,
                          if (picked.email != null) picked.email!,
                        ].join(' · '),
                        style: TextStyle(fontSize: 13, color: h.sub),
                      ),
                      const SizedBox(height: 14),
                      for (final a in [
                        _Act.reset,
                        picked.isAdmin ? _Act.member : _Act.admin,
                        picked.archived ? _Act.restore : _Act.archive,
                      ])
                        if (!(picked.id == selfId &&
                            (a == _Act.member || a == _Act.archive)))
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: HxButton(
                              _texts[a]!.$1,
                              kind: a == _Act.archive
                                  ? HxButtonKind.ghost
                                  : HxButtonKind.soft,
                              expand: true,
                              onTap: () => setState(() {
                                _picked = null;
                                _confirm = (picked, a);
                              }),
                            ),
                          ),
                      if (picked.id == selfId)
                        Text(
                          '不能停用自己的账号，也不能取消自己的管理员身份，请让另一位管理员操作。',
                          style: TextStyle(fontSize: 12, color: h.sub),
                        ),
                    ],
                  ),
                ),
        ),
        ConfirmDialog(
          show: confirm != null,
          title: confirm == null
              ? ''
              : '${_texts[confirm.$2]!.$1}：${confirm.$1.name}？',
          summary: confirm == null ? null : _texts[confirm.$2]!.$2,
          okText: confirm == null ? '' : _texts[confirm.$2]!.$3,
          onCancel: () => setState(() => _confirm = null),
          onOk: () {
            final c = confirm!;
            setState(() => _confirm = null);
            _run(c.$1, c.$2);
          },
        ),
        _CodesDialog(
          show: _resetCode != null,
          title: '$_resetFor 的重置码',
          summary: '只显示这一次。请把重置码交给本人，在登录页“忘记密码”中设置新密码。',
          codes: [?_resetCode],
          onCopy: () => _copy(_resetCode!, '重置码已复制'),
          onClose: () => setState(() => _resetCode = null),
        ),
        _CodesDialog(
          show: _newCodes != null,
          title: '已生成 ${_newCodes?.length ?? 0} 个邀请码',
          summary: '邀请码只显示这一次，请复制保存。每个邀请码只能注册一个账号。',
          codes: _newCodes ?? const [],
          onCopy: () => _copy(_newCodes!.join('\n'), '邀请码已复制'),
          onClose: () => setState(() => _newCodes = null),
        ),
        ConfirmDialog(
          show: _revoking != null,
          title: '作废邀请码 …${_revoking?.hint ?? ''}？',
          summary: '作废后不能再用于注册。',
          okText: '作废',
          onCancel: () => setState(() => _revoking = null),
          onOk: () async {
            final inv = _revoking!;
            setState(() => _revoking = null);
            try {
              await ref.read(adminApiProvider).revokeInvite(inv.id);
              ref.invalidate(adminInvitesProvider);
              if (context.mounted) showHxToast(context, '已作废 …${inv.hint}');
            } on ApiException catch (e) {
              if (context.mounted) showHxToast(context, e.message, error: true);
            }
          },
        ),
      ],
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 4),
          child: HxSeg<int>(
            options: const [(0, '成员'), (1, '邀请码')],
            value: _tab,
            onChanged: (v) => setState(() => _tab = v),
          ),
        ),
        if (_tab == 0) ..._members(h) else ..._invites(h),
      ],
    );
  }

  List<Widget> _members(Hx h) {
    final list = ref.watch(adminMembersProvider);
    return [
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
        child: MiuixTextField(
          controller: _q,
          label: '搜索姓名、学号、用户名或班级',
          useLabelAsPlaceholder: true,
          singleLine: true,
          onChanged: (_) => setState(() {}),
        ),
      ),
      ...list.when(
        loading: () => [
          const Padding(
            padding: EdgeInsets.all(12),
            child: Skeleton(height: 300, radius: 22),
          ),
        ],
        error: (e, _) => [
          Padding(
            padding: const EdgeInsets.all(12),
            child: ErrorCard(
              error: e,
              onRetry: () => ref.invalidate(adminMembersProvider),
            ),
          ),
        ],
        data: (all) {
          final q = _q.text.trim().toLowerCase();
          final shown = q.isEmpty
              ? all
              : all
                    .where(
                      (m) => [
                        m.name,
                        m.studentNo,
                        m.username ?? '',
                        m.className ?? '',
                        m.email ?? '',
                      ].any((x) => x.toLowerCase().contains(q)),
                    )
                    .toList();
          final active = all.where((m) => !m.archived).length;
          return [
            SectionHead(
              '成员',
              trailing: Text(
                '在册 $active 人，共 ${all.length} 人',
                style: TextStyle(fontSize: 13, color: h.sub),
              ),
            ),
            if (shown.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: EmptyCard(title: '没有找到符合条件的成员'),
              )
            else
              RowGroup(
                children: [
                  for (final m in shown)
                    ListRow(
                      title: m.name,
                      subtitle: [
                        m.isExternal ? '校外 · ${m.username ?? ''}' : m.studentNo,
                        if (m.className != null) m.className!,
                        if (m.lastActiveDay != null)
                          '最近 ${longDay(m.lastActiveDay!, weekday: false)}'
                        else if (!m.hasPassword)
                          '尚未激活',
                      ].join(' · '),
                      trailing: m.archived
                          ? const StateTag('已停用', tone: 'bad')
                          : m.isAdmin
                          ? const StateTag('管理员', tone: 'accent')
                          : null,
                      onTap: () => setState(() => _picked = m),
                    ),
                ],
              ),
          ];
        },
      ),
    ];
  }

  List<Widget> _invites(Hx h) {
    final list = ref.watch(adminInvitesProvider);
    return [
      const SectionHead('生成邀请码'),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: HxCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              HxSeg<String>(
                options: const [('campus', '校内账号'), ('external', '校外账号')],
                value: _kind,
                onChanged: (v) => setState(() => _kind = v),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: MiuixTextField(
                      controller: _count,
                      label: '数量',
                      singleLine: true,
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: MiuixTextField(
                      controller: _days,
                      label: '有效天数（留空不过期）',
                      singleLine: true,
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              MiuixTextField(
                controller: _note,
                label: '备注（例如 2026 秋季招新）',
                useLabelAsPlaceholder: true,
                singleLine: true,
              ),
              const SizedBox(height: 14),
              HxButton(
                '生成',
                busy: _creating,
                enabled: !_creating,
                onTap: _createInvites,
              ),
            ],
          ),
        ),
      ),
      const SectionHead('已生成的邀请码'),
      ...list.when(
        loading: () => [
          const Padding(
            padding: EdgeInsets.all(12),
            child: Skeleton(height: 200, radius: 22),
          ),
        ],
        error: (e, _) => [
          Padding(
            padding: const EdgeInsets.all(12),
            child: ErrorCard(
              error: e,
              onRetry: () => ref.invalidate(adminInvitesProvider),
            ),
          ),
        ],
        data: (all) => [
          if (all.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: EmptyCard(title: '还没有生成过邀请码'),
            )
          else
            RowGroup(
              children: [
                for (final inv in all)
                  ListRow(
                    title:
                        '…${inv.hint}  ${inv.kind == 'external' ? '校外' : '校内'}',
                    subtitle: [
                      if (inv.note != null) inv.note!,
                      if (inv.usedByName != null)
                        '${inv.usedByName}（${inv.usedByAccount ?? ''}）'
                      else if (inv.expiresAt != null)
                        '${dayTime(inv.expiresAt!)} 过期'
                      else
                        '不过期',
                    ].join(' · '),
                    trailing: StateTag(
                      inv.stateLabel,
                      tone: switch (inv.state) {
                        'unused' => 'accent',
                        'used' => 'ok',
                        _ => 'muted',
                      },
                    ),
                    arrow: false,
                    onTap: inv.state == 'unused'
                        ? () => setState(() => _revoking = inv)
                        : null,
                  ),
              ],
            ),
          const FootNote('点未使用的邀请码可以作废。邀请码的完整内容只在生成时显示一次。'),
        ],
      ),
    ];
  }
}

class _CodesDialog extends StatelessWidget {
  const _CodesDialog({
    required this.show,
    required this.title,
    required this.summary,
    required this.codes,
    required this.onCopy,
    required this.onClose,
  });
  final bool show;
  final String title;
  final String summary;
  final List<String> codes;
  final VoidCallback onCopy;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return MiuixOverlayDialog(
      show: show,
      title: title,
      summary: summary,
      onDismissRequest: onClose,
      content: Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: h.well,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                codes.join('\n'),
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 18,
                  height: 1.6,
                  fontWeight: FontWeight.w600,
                  color: h.ink,
                  fontFamily: h.mono,
                ),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(child: MiuixTextButton('关闭', onPressed: onClose)),
                const SizedBox(width: 12),
                Expanded(
                  child: MiuixTextButton(
                    '复制',
                    colors: MiuixButtonDefaults.buttonColorsPrimary(context),
                    onPressed: onCopy,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
