import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/hiana_page.dart';
import '../../app/tokens.dart';
import '../../data/api_client.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../widgets/hx_icons.dart';
import '../../widgets/ui.dart';

/// 公告与比赛：会长和老师发布的通知；比赛卡有截止倒计时，可以登记、组队。
class NoticesPage extends ConsumerStatefulWidget {
  const NoticesPage({super.key});

  @override
  ConsumerState<NoticesPage> createState() => _NoticesPageState();
}

class _NoticesPageState extends ConsumerState<NoticesPage> {
  Notice? _joining; // 正在登记的比赛；非空时底部面板打开
  Notice? _leaving;
  final _team = TextEditingController();
  final _contact = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _team.dispose();
    _contact.dispose();
    super.dispose();
  }

  Future<void> _join() async {
    final n = _joining;
    if (n == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiProvider).joinCompetition(n.id, team: _team.text.trim(), contact: _contact.text.trim());
      if (!mounted) return;
      setState(() => _joining = null);
      showHxToast(context, n.joined ? '登记已更新' : '登记好了');
      ref.invalidate(noticesProvider);
    } on ApiException catch (e) {
      if (mounted) showHxToast(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _leave() async {
    final n = _leaving;
    if (n == null) return;
    setState(() => _leaving = null);
    try {
      await ref.read(apiProvider).leaveCompetition(n.id);
      if (mounted) showHxToast(context, '已取消登记');
      ref.invalidate(noticesProvider);
    } on ApiException catch (e) {
      if (mounted) showHxToast(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final list = ref.watch(noticesProvider);
    final today = cnToday();
    return HianaPage(
      title: '公告与比赛',
      showBack: true,
      onRefresh: () => ref.refresh(noticesProvider.future).then((_) {}, onError: (_) {}),
      overlays: [
        MiuixOverlayBottomSheet(
          show: _joining != null,
          title: '登记参赛',
          onDismissRequest: () => setState(() => _joining = null),
          content: Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(_joining?.title ?? '', style: TextStyle(fontSize: 14, color: h.sub)),
                const SizedBox(height: 12),
                MiuixTextField(controller: _team, label: '队伍名（还没组队可以不填）', useLabelAsPlaceholder: true, singleLine: true),
                const SizedBox(height: 12),
                MiuixTextField(controller: _contact, label: 'QQ 或微信号（登记名单里大家都看得到）', useLabelAsPlaceholder: true, singleLine: true),
                const SizedBox(height: 16),
                HxButton(_joining?.joined == true ? '保存' : '登记', expand: true, busy: _busy, onTap: _join),
              ],
            ),
          ),
        ),
        MiuixOverlayDialog(
          show: _leaving != null,
          title: '取消登记？',
          summary: '从「${_leaving?.title ?? ''}」的登记名单里去掉你。',
          onDismissRequest: () => setState(() => _leaving = null),
          content: Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Row(
              children: [
                Expanded(child: MiuixTextButton('不了', onPressed: () => setState(() => _leaving = null))),
                const SizedBox(width: 12),
                Expanded(child: MiuixTextButton('取消登记', colors: MiuixButtonDefaults.buttonColorsPrimary(context), onPressed: _leave)),
              ],
            ),
          ),
        ),
      ],
      children: list.when(
        loading: () => [const Padding(padding: EdgeInsets.all(12), child: Skeleton(height: 260, radius: 22))],
        error: (e, _) => [Padding(padding: const EdgeInsets.all(12), child: ErrorCard(error: e, onRetry: () => ref.invalidate(noticesProvider)))],
        data: (all) {
          if (all.isEmpty) return [const Padding(padding: EdgeInsets.all(12), child: EmptyCard(title: '还没有公告', body: '会长发布的通知和比赛都会出现在这里。'))];
          final plain = all.where((n) => !n.isCompetition).toList();
          final comps = all.where((n) => n.isCompetition).toList()
            ..sort((a, b) {
              final ea = a.deadline != null && a.deadline!.compareTo(today) < 0 ? 1 : 0;
              final eb = b.deadline != null && b.deadline!.compareTo(today) < 0 ? 1 : 0;
              return ea != eb ? ea - eb : (a.deadline ?? '9999').compareTo(b.deadline ?? '9999');
            });
          return [
            if (comps.isNotEmpty) ...[
              const SectionHead('比赛'),
              for (var i = 0; i < comps.length; i++)
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                  child: Rise(
                    index: i,
                    child: _CompetitionCard(
                      n: comps[i],
                      today: today,
                      onJoin: () {
                        final mine = comps[i].entries;
                        _team.text = '';
                        _contact.text = '';
                        if (comps[i].joined && mine.isNotEmpty) {
                          // 名单里看不出哪条是自己的，留空让用户重填
                        }
                        setState(() => _joining = comps[i]);
                      },
                      onLeave: () => setState(() => _leaving = comps[i]),
                    ),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(28, 0, 28, 4),
                child: Text('这里只是协会内部登记，方便找队友。正式报名按比赛资料里的流程走。', style: TextStyle(fontSize: 12, color: h.sub)),
              ),
            ],
            if (plain.isNotEmpty) ...[
              const SectionHead('公告'),
              for (var i = 0; i < plain.length; i++)
                Padding(padding: const EdgeInsets.fromLTRB(12, 0, 12, 12), child: Rise(index: i, child: _NoticeCard(n: plain[i]))),
            ],
          ];
        },
      ),
    );
  }
}

class _NoticeCard extends StatelessWidget {
  const _NoticeCard({required this.n});
  final Notice n;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return HxCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (n.pinned) ...[HxIconView(HxIcon.pin, size: 16, color: h.accentText), const SizedBox(width: 6)],
              Expanded(child: Text(n.title, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: h.ink))),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            [if (n.pinned) '置顶', longDay(dayOfMs(n.createdAt), weekday: false), if (n.author != null) n.author!].join(' · '),
            style: TextStyle(fontSize: 12, color: h.sub),
          ),
          if (n.body.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(n.body, style: TextStyle(fontSize: 14, height: 1.6, color: h.ink)),
          ],
          if (n.docUrl != null) ...[
            const SizedBox(height: 10),
            HxButton('相关链接', kind: HxButtonKind.soft, height: 38, icon: HxIcon.external, onTap: () => launchUrl(Uri.parse(n.docUrl!), mode: LaunchMode.externalApplication)),
          ],
        ],
      ),
    );
  }
}

class _CompetitionCard extends StatelessWidget {
  const _CompetitionCard({required this.n, required this.today, required this.onJoin, required this.onLeave});
  final Notice n;
  final String today;
  final VoidCallback onJoin;
  final VoidCallback onLeave;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final days = n.deadline == null ? null : daysBetween(today, n.deadline!);
    final ended = days != null && days < 0;
    final teams = n.entries.map((e) => e.team).whereType<String>().toSet();
    return Opacity(
      opacity: ended ? 0.6 : 1,
      child: HxCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: Wrap(spacing: 6, runSpacing: 6, children: [for (final t in n.tags) HxTag(t)])),
                if (days != null)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        ended ? '—' : '$days',
                        style: TextStyle(fontSize: 30, height: 1.1, fontWeight: FontWeight.w700, color: !ended && days <= 14 ? h.badInk : h.ink, fontFeatures: kTabular),
                      ),
                      Text(ended ? '已截止' : days == 0 ? '今天截止' : '天后截止', style: TextStyle(fontSize: 12, color: h.sub)),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 6),
            Text(n.title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: h.ink)),
            if (n.body.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(n.body, style: TextStyle(fontSize: 13, height: 1.6, color: h.sub)),
            ],
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                if (n.docUrl != null)
                  HxButton('比赛资料', kind: HxButtonKind.soft, height: 36, icon: HxIcon.external, onTap: () => launchUrl(Uri.parse(n.docUrl!), mode: LaunchMode.externalApplication)),
                if (n.groupInfo != null) HxTag(n.groupInfo!),
                if (n.deadline != null) HxTag('截止 ${longDay(n.deadline!, weekday: false)}'),
              ],
            ),
            if (n.entries.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text('${n.entries.length} 人登记${teams.isNotEmpty ? ' · ${teams.length} 支队' : ''}', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: h.ink)),
              const SizedBox(height: 4),
              Text(
                n.entries.map((e) => e.team == null ? e.name : '${e.name}（${e.team}）').join('、'),
                style: TextStyle(fontSize: 12, height: 1.5, color: h.sub),
              ),
            ],
            if (!ended) ...[
              const SizedBox(height: 14),
              Container(height: 1, color: h.line),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: Text(n.joined ? '你已登记' : '', style: TextStyle(fontSize: 13, color: h.sub))),
                  if (n.joined) ...[HxButton('取消', kind: HxButtonKind.quiet, height: 42, onTap: onLeave), const SizedBox(width: 8)],
                  HxButton(n.joined ? '修改登记' : '我要参加', kind: n.joined ? HxButtonKind.soft : HxButtonKind.primary, height: 42, onTap: onJoin),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
