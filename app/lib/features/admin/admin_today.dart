import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../data/admin.dart';
import '../../data/api_client.dart';
import '../../data/providers.dart';
import '../../widgets/kit.dart';
import '../../widgets/ui.dart';
import '../web/web_page.dart';
import 'admin_home.dart';

final adminTodayProvider = FutureProvider.autoDispose<TodayAttendance>(
  (ref) => ref.watch(adminApiProvider).today(),
);
final adminCertsProvider = FutureProvider.autoDispose<List<AdminCertificate>>(
  (ref) => ref.watch(adminApiProvider).certificates(),
);
final adminIdleProvider = FutureProvider.autoDispose<List<AdminMember>>(
  (ref) => ref.watch(adminApiProvider).idle(days: 14),
);

/// 今日签到（对照网页 /admin）：晚自习人数、场地在场、现场口令、待确认的 CS50x 证书、
/// 今天的签到记录（点缩略图看照片）、两周没动静的成员、导出给学校的签到表。
class AdminTodayPage extends ConsumerStatefulWidget {
  const AdminTodayPage({super.key});

  @override
  ConsumerState<AdminTodayPage> createState() => _AdminTodayPageState();
}

class _AdminTodayPageState extends ConsumerState<AdminTodayPage> {
  (String, String)? _photo; // (文件, 标题)
  AdminCertificate? _rejecting;
  final _note = TextEditingController();
  bool _export = false;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(adminCertsProvider);
    ref.invalidate(adminIdleProvider);
    await ref.refresh(adminTodayProvider.future).then((_) {}, onError: (_) {});
  }

  Future<void> _flipCode(TodayAttendance d) async {
    final next = !d.rule.requireCode;
    try {
      await ref
          .read(adminApiProvider)
          .saveEveningRule(
            days: d.rule.days.join(','),
            window: d.rule.window.join('-'),
            requireCode: next,
          );
      ref.invalidate(adminTodayProvider);
      ref.invalidate(attendanceProvider);
      if (mounted) {
        showHxToast(context, next ? '现场口令已开启' : '现场口令已关闭，学员拍照即可签到');
      }
    } on ApiException catch (e) {
      if (mounted) showHxToast(context, e.message, error: true);
    }
  }

  Future<void> _review(AdminCertificate c, bool approve, [String? note]) async {
    try {
      await ref
          .read(adminApiProvider)
          .reviewCertificate(
            c.cert.course,
            c.userId,
            approve: approve,
            note: note,
          );
      ref.invalidate(adminCertsProvider);
      if (mounted) {
        showHxToast(context, approve ? '已确认${c.name}的证书' : '已退回${c.name}的证书');
      }
    } on ApiException catch (e) {
      if (mounted) showHxToast(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final today = ref.watch(adminTodayProvider);
    final certs = ref.watch(adminCertsProvider);
    final idle = ref.watch(adminIdleProvider);
    final d = today.valueOrNull;

    return HianaPage(
      title: '今日签到',
      showBack: true,
      onRefresh: _refresh,
      overlays: [
        MiuixOverlayDialog(
          show: _photo != null,
          title: _photo?.$2 ?? '',
          onDismissRequest: () => setState(() => _photo = null),
          content: _photo == null
              ? const SizedBox.shrink()
              : Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: AuthImage(_photo!.$1, fit: BoxFit.contain, radius: 16),
                ),
        ),
        ConfirmDialog(
          show: _rejecting != null,
          title: '退回${_rejecting?.name ?? ''}的证书？',
          summary: '学员会看到退回原因，修改后可以重新提交。',
          okText: '退回',
          onCancel: () => setState(() => _rejecting = null),
          onOk: () {
            final c = _rejecting!;
            setState(() => _rejecting = null);
            _review(c, false, _note.text.trim());
          },
          child: MiuixTextField(
            controller: _note,
            label: '退回原因（选填）',
            singleLine: true,
          ),
        ),
        _ExportSheet(
          show: _export,
          onClose: () => setState(() => _export = false),
        ),
      ],
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
          child: Text(
            d == null
                ? ' '
                : '${longDay(d.today)} · ${d.isEveningDay ? '晚自习 ${d.rule.window.first} – ${d.rule.window.last}' : '今天没有晚自习'}',
            style: TextStyle(fontSize: 14, color: h.sub),
          ),
        ),
        if (today.hasError && d == null)
          Padding(
            padding: const EdgeInsets.all(12),
            child: ErrorCard(
              error: today.error!,
              onRetry: () => ref.invalidate(adminTodayProvider),
            ),
          )
        else if (d == null)
          const Padding(
            padding: EdgeInsets.all(12),
            child: Skeleton(height: 140, radius: 22),
          )
        else ...[
          _Stats(d: d),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: HxCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '现场口令',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: h.ink,
                          ),
                        ),
                      ),
                      MiuixSwitch(
                        value: d.rule.requireCode,
                        onChanged: (_) => _flipCode(d),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (d.rule.requireCode)
                    Text(
                      d.code.split('').join(' '),
                      style: TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 4,
                        color: h.accentText,
                        fontFeatures: kTabular,
                      ),
                    ),
                  Text(
                    d.rule.requireCode ? '每天自动更换；晚自习签到时需要填写。' : '已关闭，学员拍照即可签到。',
                    style: TextStyle(fontSize: 13, color: h.sub),
                  ),
                ],
              ),
            ),
          ),
        ],
        SectionHead(
          '待确认的 CS50x 证书',
          trailing: Text(
            '${certs.valueOrNull?.where((c) => c.cert.pending).length ?? 0} 份',
            style: TextStyle(fontSize: 13, color: h.sub),
          ),
        ),
        ...certs.when(
          loading: () => [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: Skeleton(height: 80, radius: 22),
            ),
          ],
          error: (e, _) => [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: ErrorCard(
                error: e,
                onRetry: () => ref.invalidate(adminCertsProvider),
              ),
            ),
          ],
          data: (list) {
            final pending = list.where((c) => c.cert.pending).toList();
            final reviewed = list
                .where((c) => !c.cert.pending)
                .take(10)
                .toList();
            return [
              if (pending.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: EmptyCard(title: '没有待确认的证书'),
                )
              else
                for (final c in pending)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                    child: HxCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            [
                              c.name,
                              if (c.studentNo != null) c.studentNo!,
                            ].join(' · '),
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: h.ink,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '提交于 ${dayTime(c.cert.submittedAt)}',
                            style: TextStyle(fontSize: 12, color: h.sub),
                          ),
                          const SizedBox(height: 6),
                          Pressable(
                            onTap: () => launchUrl(
                              Uri.parse(c.cert.url),
                              mode: LaunchMode.externalApplication,
                            ),
                            child: Text(
                              c.cert.url,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                color: h.accentText,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: HxButton(
                                  '退回',
                                  kind: HxButtonKind.ghost,
                                  height: 40,
                                  onTap: () {
                                    _note.clear();
                                    setState(() => _rejecting = c);
                                  },
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: HxButton(
                                  '通过',
                                  height: 40,
                                  onTap: () => _review(c, true),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
              if (reviewed.isNotEmpty) ...[
                const SizedBox(height: 4),
                RowGroup(
                  children: [
                    for (final c in reviewed)
                      ListRow(
                        title: c.name,
                        subtitle: [
                          c.cert.statusLabel,
                          if (c.cert.note != null && c.cert.note!.isNotEmpty)
                            '原因：${c.cert.note}',
                        ].join(' · '),
                        trailing: StateTag(
                          c.cert.approved ? '已通过' : '已退回',
                          tone: c.cert.approved ? 'ok' : 'bad',
                        ),
                        onTap: () => launchUrl(
                          Uri.parse(c.cert.url),
                          mode: LaunchMode.externalApplication,
                        ),
                      ),
                  ],
                ),
              ],
            ];
          },
        ),
        SectionHead(
          '签到记录',
          trailing: Pressable(
            onTap: () => setState(() => _export = true),
            child: Text(
              '导出给学校',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: h.accentText,
              ),
            ),
          ),
        ),
        if (d != null)
          if (d.records.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: EmptyCard(title: '今天还没有人签到'),
            )
          else
            RowGroup(
              children: [
                for (final r in d.records)
                  _RecordRow(
                    r: r,
                    onPhoto: (key, label) =>
                        setState(() => _photo = (key, label)),
                  ),
              ],
            ),
        const SectionHead('两周没有动静'),
        ...idle.when(
          loading: () => [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: Skeleton(height: 80, radius: 22),
            ),
          ],
          error: (e, _) => [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: ErrorCard(
                error: e,
                onRetry: () => ref.invalidate(adminIdleProvider),
              ),
            ),
          ],
          data: (list) => [
            if (list.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: EmptyCard(title: '所有成员近期都有学习记录'),
              )
            else
              RowGroup(
                children: [
                  for (final m in list)
                    ListRow(
                      title: m.name,
                      subtitle: m.lastActiveDay != null
                          ? '最后一次：${longDay(m.lastActiveDay!, weekday: false)}'
                          : m.hasPassword
                          ? '还没有学习记录'
                          : '尚未激活账号',
                    ),
                ],
              ),
          ],
        ),
      ],
    );
  }
}

class _Stats extends StatelessWidget {
  const _Stats({required this.d});
  final TodayAttendance d;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final evening = d.records.where((r) => r.kind == 'evening').length;
    final venue = d.records
        .where((r) => r.kind == 'venue' && r.status == 'open')
        .length;
    Widget box(String label, String big, String unit, Widget? extra) =>
        Expanded(
          child: HxCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(fontSize: 13, color: h.sub)),
                const SizedBox(height: 6),
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: big,
                        style: TextStyle(
                          fontSize: 30,
                          fontWeight: FontWeight.w700,
                          color: h.ink,
                        ),
                      ),
                      TextSpan(
                        text: ' $unit',
                        style: TextStyle(fontSize: 14, color: h.sub),
                      ),
                    ],
                  ),
                  style: const TextStyle(fontFeatures: kTabular),
                ),
                if (extra != null) ...[const SizedBox(height: 8), extra],
              ],
            ),
          ),
        );
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            box(
              '晚自习已签到',
              '$evening',
              '/ ${d.members} 人',
              HxBar(
                d.members == 0
                    ? 0
                    : (evening / d.members).clamp(0, 1).toDouble(),
              ),
            ),
            const SizedBox(width: 10),
            box(
              '大创场地在场',
              '$venue',
              '人',
              Text('23:59 自动结束', style: TextStyle(fontSize: 12, color: h.sub)),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecordRow extends StatelessWidget {
  const _RecordRow({required this.r, required this.onPhoto});
  final AdminRecord r;
  final void Function(String key, String label) onPhoto;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final (label, tone) = switch (r.status) {
      'open' => ('学习中', 'accent'),
      'closed' => ('已签退', 'muted'),
      _ => ('未签退', 'bad'),
    };
    Widget thumb(String? key, String what) => key == null
        ? const SizedBox.shrink()
        : Padding(
            padding: const EdgeInsets.only(right: 6),
            child: Pressable(
              onTap: () => onPhoto(key, '${r.name} 的$what照片'),
              semanticLabel: '查看${r.name}的$what照片',
              child: AuthImage(key, width: 40, height: 40, radius: 10),
            ),
          );
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          thumb(r.inPhoto, '签到'),
          thumb(r.outPhoto, '签退'),
          const SizedBox(width: 4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${r.name} · ${r.kindLabel}',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: h.ink,
                  ),
                ),
                Text(
                  '${r.studentNo}  ${hhmm(r.inAt)} – ${r.outAt == null ? '—' : hhmm(r.outAt!)}',
                  style: TextStyle(
                    fontSize: 12,
                    color: h.sub,
                    fontFeatures: kTabular,
                  ),
                ),
              ],
            ),
          ),
          StateTag(label, tone: tone),
        ],
      ),
    );
  }
}

/// 导出给学校：选日期范围和场景，看可打印的签到表（内嵌网页）或下载 CSV 表格。
class _ExportSheet extends ConsumerStatefulWidget {
  const _ExportSheet({required this.show, required this.onClose});
  final bool show;
  final VoidCallback onClose;

  @override
  ConsumerState<_ExportSheet> createState() => _ExportSheetState();
}

class _ExportSheetState extends ConsumerState<_ExportSheet> {
  final _from = TextEditingController();
  final _to = TextEditingController();
  String _kind = '';
  String? _error;

  @override
  void initState() {
    super.initState();
    final today = cnToday();
    _to.text = today;
    _from.text = DateTime.parse(
      '${today}T00:00:00Z',
    ).subtract(const Duration(days: 30)).toIso8601String().substring(0, 10);
  }

  @override
  void dispose() {
    _from.dispose();
    _to.dispose();
    super.dispose();
  }

  String? get _qs {
    final re = RegExp(r'^\d{4}-\d{2}-\d{2}$');
    final f = _from.text.trim(), t = _to.text.trim();
    if (!re.hasMatch(f) || !re.hasMatch(t)) {
      setState(() => _error = '日期格式为 2026-11-05');
      return null;
    }
    setState(() => _error = null);
    return 'from=$f&to=$t${_kind.isEmpty ? '' : '&kind=$_kind'}';
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return MiuixOverlayBottomSheet(
      show: widget.show,
      title: '导出给学校',
      onDismissRequest: widget.onClose,
      content: Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: MiuixTextField(
                    controller: _from,
                    label: '开始日期',
                    singleLine: true,
                    keyboardType: TextInputType.datetime,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: MiuixTextField(
                    controller: _to,
                    label: '结束日期',
                    singleLine: true,
                    keyboardType: TextInputType.datetime,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            HxSeg<String>(
              options: const [
                ('', '全部'),
                ('evening', '晚自习'),
                ('venue', '大创场地'),
              ],
              value: _kind,
              onChanged: (v) => setState(() => _kind = v),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: TextStyle(fontSize: 13, color: h.badInk)),
            ],
            const SizedBox(height: 16),
            HxButton(
              '查看签到表（可打印）',
              expand: true,
              onTap: () {
                final qs = _qs;
                if (qs == null) return;
                widget.onClose();
                context.pushPage(
                  WebPage(
                    title: '签到表',
                    path: '/admin/report?$qs',
                    stayPrefix: '/admin/report',
                    note: '打印或存为 PDF：点右上角在浏览器中打开（浏览器中需要登录一次），再使用浏览器的打印功能。',
                  ),
                );
              },
            ),
            const SizedBox(height: 8),
            HxButton(
              '下载 CSV 表格',
              kind: HxButtonKind.soft,
              expand: true,
              onTap: () {
                final qs = _qs;
                if (qs == null) return;
                HapticFeedback.lightImpact();
                widget.onClose();
                downloadAndOpen(
                  context,
                  ref,
                  '/api/admin/attendance.csv?$qs',
                  '签到记录_${_from.text.trim()}_${_to.text.trim()}.csv',
                );
              },
            ),
            const SizedBox(height: 8),
            Text(
              '晚自习的时间、日期和现场口令在“设置与课程包”中修改。',
              style: TextStyle(fontSize: 12, color: h.sub),
            ),
          ],
        ),
      ),
    );
  }
}
