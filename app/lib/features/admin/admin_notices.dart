import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../data/api_client.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../widgets/kit.dart';
import '../../widgets/ui.dart';
import 'admin_home.dart';

/// 公告与比赛（对照网页 /admin/notices）：发布、编辑、删除。比赛会推送到群里。
class AdminNoticesPage extends ConsumerStatefulWidget {
  const AdminNoticesPage({super.key});

  @override
  ConsumerState<AdminNoticesPage> createState() => _AdminNoticesPageState();
}

class _AdminNoticesPageState extends ConsumerState<AdminNoticesPage> {
  Notice? _deleting;

  @override
  Widget build(BuildContext context) {
    final list = ref.watch(noticesProvider);
    return HianaPage(
      title: '公告与比赛',
      showBack: true,
      onRefresh: () =>
          ref.refresh(noticesProvider.future).then((_) {}, onError: (_) {}),
      overlays: [
        ConfirmDialog(
          show: _deleting != null,
          title: '删除「${_deleting?.title ?? ''}」？',
          summary: _deleting?.isCompetition ?? false ? '登记名单也会一起不再显示。' : null,
          okText: '删除',
          onCancel: () => setState(() => _deleting = null),
          onOk: () async {
            final n = _deleting!;
            setState(() => _deleting = null);
            try {
              await ref.read(adminApiProvider).deleteNotice(n.id);
              ref.invalidate(noticesProvider);
              if (context.mounted) showHxToast(context, '已删除');
            } on ApiException catch (e) {
              if (context.mounted) showHxToast(context, e.message, error: true);
            }
          },
        ),
      ],
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 0),
          child: Row(
            children: [
              Expanded(
                child: HxButton(
                  '发布公告',
                  onTap: () =>
                      context.pushPage(const NoticeEditorPage(kind: 'notice')),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: HxButton(
                  '发布比赛',
                  kind: HxButtonKind.soft,
                  onTap: () => context.pushPage(
                    const NoticeEditorPage(kind: 'competition'),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SectionHead('已发布'),
        ...list.when(
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
                onRetry: () => ref.invalidate(noticesProvider),
              ),
            ),
          ],
          data: (all) => [
            if (all.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: EmptyCard(title: '还没有发布过公告'),
              )
            else
              RowGroup(
                children: [
                  for (final n in all)
                    ListRow(
                      title: n.title,
                      subtitle: [
                        n.isCompetition ? '比赛' : '公告',
                        longDay(dayOfMs(n.createdAt), weekday: false),
                        if (n.isCompetition) '${n.entryCount} 人登记',
                        if (n.deadline != null) '截止 ${n.deadline}',
                      ].join(' · '),
                      trailing: n.pinned
                          ? const StateTag('置顶', tone: 'accent')
                          : null,
                      onTap: () => context.pushPage(
                        NoticeEditorPage(
                          kind: n.kind,
                          initial: n,
                          onDelete: () => setState(() => _deleting = n),
                        ),
                      ),
                    ),
                ],
              ),
            const FootNote('点一条公告进行编辑；删除在编辑页底部。'),
          ],
        ),
      ],
    );
  }
}

class NoticeEditorPage extends ConsumerStatefulWidget {
  const NoticeEditorPage({
    super.key,
    required this.kind,
    this.initial,
    this.onDelete,
  });
  final String kind;
  final Notice? initial;
  final VoidCallback? onDelete;

  @override
  ConsumerState<NoticeEditorPage> createState() => _NoticeEditorPageState();
}

class _NoticeEditorPageState extends ConsumerState<NoticeEditorPage> {
  late String _kind = widget.initial?.kind ?? widget.kind;
  late final _title = TextEditingController(text: widget.initial?.title);
  late final _body = TextEditingController(text: widget.initial?.body);
  late final _doc = TextEditingController(text: widget.initial?.docUrl);
  late final _group = TextEditingController(text: widget.initial?.groupInfo);
  late final _deadline = TextEditingController(text: widget.initial?.deadline);
  late final _tags = TextEditingController(
    text: widget.initial?.tags.join('，'),
  );
  late bool _pinned = widget.initial?.pinned ?? false;
  bool _busy = false;
  bool _uploading = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [_title, _body, _doc, _group, _deadline, _tags]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _addImage() async {
    final x = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 1600,
      imageQuality: 85,
    );
    if (x == null) return;
    setState(() => _uploading = true);
    try {
      final bytes = await x.readAsBytes();
      final url = await ref
          .read(adminApiProvider)
          .uploadNoticeImage(base64Encode(bytes));
      final t = _body.text;
      _body.text = '${t.isEmpty || t.endsWith('\n') ? t : '$t\n'}\n![]($url)\n';
      if (mounted) showHxToast(context, '图片已插入正文末尾');
    } on ApiException catch (e) {
      if (mounted) showHxToast(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _save() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final competition = _kind == 'competition';
    try {
      await ref
          .read(adminApiProvider)
          .saveNotice(
            id: widget.initial?.id,
            kind: _kind,
            title: _title.text.trim(),
            body: _body.text.trim(),
            docUrl: _doc.text.trim(),
            groupInfo: competition ? _group.text.trim() : '',
            deadline: competition ? _deadline.text.trim() : '',
            tags: _tags.text
                .split(RegExp(r'[,，、\s]+'))
                .map((t) => t.trim())
                .where((t) => t.isNotEmpty)
                .take(6)
                .toList(),
            pinned: _pinned,
          );
      ref.invalidate(noticesProvider);
      if (!mounted) return;
      showHxToast(
        context,
        widget.initial != null
            ? '已保存'
            : competition
            ? '比赛已发布，会推送到群里'
            : '已发布',
      );
      Navigator.of(context).maybePop();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final competition = _kind == 'competition';
    Widget field(
      TextEditingController c,
      String label, {
      int lines = 1,
      TextInputType? type,
    }) => Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: MiuixTextField(
        controller: c,
        label: label,
        singleLine: lines == 1,
        minLines: lines == 1 ? null : lines,
        maxLines: lines == 1 ? 1 : null,
        keyboardType: type,
      ),
    );
    return HianaPage(
      title: widget.initial == null ? (competition ? '发布比赛' : '发布公告') : '编辑',
      showBack: true,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: HxCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                HxSeg<String>(
                  options: const [('notice', '公告'), ('competition', '比赛')],
                  value: _kind,
                  onChanged: (v) => setState(() => _kind = v),
                ),
                const SizedBox(height: 12),
                field(_title, '标题'),
                field(
                  _body,
                  '正文（纯文本，换行会保留）',
                  lines: 8,
                  type: TextInputType.multiline,
                ),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '图片以 ![](地址) 单独成行的形式写入正文。',
                        style: TextStyle(fontSize: 12, color: h.sub),
                      ),
                    ),
                    HxButton(
                      '插入图片',
                      kind: HxButtonKind.soft,
                      height: 36,
                      busy: _uploading,
                      enabled: !_uploading,
                      onTap: _addImage,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                field(
                  _doc,
                  competition ? '官方文档链接（https://）' : '相关链接（https://，选填）',
                  type: TextInputType.url,
                ),
                if (competition) ...[
                  field(_group, '群聊信息（例如 QQ 群 123456）'),
                  field(
                    _deadline,
                    '报名截止日期（例如 2026-11-30）',
                    type: TextInputType.datetime,
                  ),
                ],
                field(_tags, '标签（用逗号隔开，例如：AI，视觉，团队赛）'),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '置顶',
                        style: TextStyle(fontSize: 15, color: h.ink),
                      ),
                    ),
                    MiuixSwitch(
                      value: _pinned,
                      onChanged: (v) => setState(() => _pinned = v),
                    ),
                  ],
                ),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    _error!,
                    style: TextStyle(fontSize: 13, color: h.badInk),
                  ),
                ],
                const SizedBox(height: 14),
                HxButton(
                  widget.initial == null ? '发布' : '保存',
                  busy: _busy,
                  enabled: !_busy,
                  onTap: _save,
                ),
              ],
            ),
          ),
        ),
        if (widget.initial != null && widget.onDelete != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: HxButton(
              '删除',
              kind: HxButtonKind.ghost,
              expand: true,
              onTap: () {
                Navigator.of(context).maybePop();
                widget.onDelete!();
              },
            ),
          ),
      ],
    );
  }
}
