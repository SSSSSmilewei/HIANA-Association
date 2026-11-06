import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../data/api_client.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../widgets/hx_icons.dart';
import '../../widgets/kit.dart';
import '../../widgets/ui.dart';
import '../auth/guest.dart';
import '../courses/course_page.dart';
import '../courses/lesson_page.dart';

/// 新生任务：协会每位新成员都要完成的三项任务（对照网页 src/client/pages/Start.tsx）。
///  1. 阅读前言：CSDIY 前言 +《我的一些小想法》（写给同学的一段话，Across the Deep Sea 的第一篇）
///  2. CS50x：取得哈佛大学的课程证书（提交证书链接，管理员确认后才算完成）
///  3. Across the Deep Sea：协会自己编写的课程，正在筹备，没有“完成”状态
/// 首页最上方是 [StartCard]，[StartPage] 是完整的页面。

const kDeepSea = 'across-the-deep-sea';
const _prefaces = [
  ('csdiy', 'preface', 'CSDIY 前言'),
  (kDeepSea, 'preface', '我的一些小想法'),
];
const _stepTitles = ['阅读前言', 'CS50x：哈佛大学计算机科学导论', 'Across the Deep Sea'];

final certificatesProvider = FutureProvider<List<Certificate>>((ref) {
  ref.watch(sessionProvider.select((s) => s.valueOrNull?.member?.id));
  return ref.read(apiProvider).myCertificates();
});

class _StartState {
  const _StartState({
    required this.guest,
    required this.prefaceDone,
    required this.cs50,
    required this.cert,
  });
  final bool guest;
  final List<bool> prefaceDone;
  final CourseDetail cs50;
  final Certificate? cert;

  /// 当前进行到第几项（0–2）；前两项都完成后停在第 3 项
  int get current => !prefaceDone.every((x) => x)
      ? 0
      : !(cert?.approved ?? false)
      ? 1
      : 2;

  int get cs50Done => cs50.items.where((u) => cs50.done.contains(u.id)).length;
  double get cs50Ratio => cs50.items.isEmpty ? 0 : cs50Done / cs50.items.length;
}

/// 读齐四份数据；还在加载返回 null，出错时抛出第一个错误
AsyncValue<_StartState> _watchStart(WidgetRef ref) {
  final guest = ref.watch(isGuestProvider);
  final csdiy = ref.watch(courseProvider('csdiy'));
  final deep = ref.watch(courseProvider(kDeepSea));
  final cs50 = ref.watch(courseProvider('cs50x'));
  final certs = guest
      ? const AsyncValue<List<Certificate>>.data([])
      : ref.watch(certificatesProvider);
  final all = <AsyncValue<Object>>[csdiy, deep, cs50, certs];
  for (final a in all) {
    if (a.hasError) return AsyncValue.error(a.error!, a.stackTrace!);
  }
  if (all.any((a) => !a.hasValue)) return const AsyncValue.loading();
  final cert = certs.value!.where((c) => c.course == 'cs50x').firstOrNull;
  return AsyncValue.data(
    _StartState(
      guest: guest,
      prefaceDone: [
        csdiy.value!.done.contains('preface'),
        deep.value!.done.contains('preface'),
      ],
      cs50: cs50.value!,
      cert: cert,
    ),
  );
}

void _refreshStart(WidgetRef ref) {
  ref.invalidate(courseProvider('csdiy'));
  ref.invalidate(courseProvider(kDeepSea));
  ref.invalidate(courseProvider('cs50x'));
  ref.invalidate(certificatesProvider);
}

/// 首页最上方的卡片：当前任务和“继续”按钮。前两项完成后缩成一行。
class StartCard extends ConsumerWidget {
  const StartCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final h = Hx.of(context);
    final st = _watchStart(ref);
    if (st.hasError) return const SizedBox.shrink();
    final s = st.valueOrNull;
    if (s == null) {
      return const Padding(
        padding: EdgeInsets.fromLTRB(12, 0, 12, 12),
        child: Skeleton(height: 150, radius: 24),
      );
    }
    void open() => context.pushPage(const StartPage());
    if (!s.guest && s.current == 2) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        child: HxCard(
          onTap: open,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              const StateTag('新生任务', tone: 'ok'),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '前两项任务已完成，下一项：Across the Deep Sea',
                  style: TextStyle(fontSize: 14, color: h.ink),
                ),
              ),
              HxIconView(HxIcon.arrowRight, size: 16, color: h.sub),
            ],
          ),
        ),
      );
    }
    final n = s.guest ? 0 : s.current;
    final next = s.cs50.next;
    final unread = [
      for (var i = 0; i < _prefaces.length; i++)
        if (!s.prefaceDone[i]) _prefaces[i].$3,
    ];
    final sub = s.guest
        ? '协会新成员的入门任务共三项：阅读前言，完成 CS50x 课程并取得证书，学习协会课程 Across the Deep Sea。'
        : n == 0
        ? '尚未阅读：${unread.join('、')}'
        : s.cert?.pending ?? false
        ? '证书已提交，等待管理员确认'
        : next != null
        ? '下一项：${next.title}'
        : '站内内容已全部完成，请在 cs50.me 领取证书并提交链接';
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      child: HxCard(
        onTap: open,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              s.guest ? '智慧算法网络协会' : '新生任务 · 第 ${n + 1} 项，共 3 项',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: h.accentText,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              s.guest ? '新生任务' : _stepTitles[n],
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w700,
                color: h.ink,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              sub,
              style: TextStyle(fontSize: 14, height: 1.5, color: h.sub),
            ),
            if (!s.guest && n == 1) ...[
              const SizedBox(height: 12),
              HxBar(s.cs50Ratio),
              const SizedBox(height: 4),
              Text(
                'CS50x 站内进度 ${(s.cs50Ratio * 100).round()}%',
                style: TextStyle(
                  fontSize: 12,
                  color: h.sub,
                  fontFeatures: kTabular,
                ),
              ),
            ],
            const SizedBox(height: 14),
            HxButton(
              s.guest ? '查看新生任务' : '继续',
              icon: HxIcon.arrowRight,
              height: 42,
              onTap: open,
            ),
          ],
        ),
      ),
    );
  }
}

class StartPage extends ConsumerWidget {
  const StartPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final h = Hx.of(context);
    final st = _watchStart(ref);
    return HianaPage(
      title: '新生任务',
      showBack: true,
      onRefresh: () async => _refreshStart(ref),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
          child: Text(
            '协会每位新成员都需要按顺序完成以下三项任务。',
            style: TextStyle(fontSize: 14, height: 1.5, color: h.sub),
          ),
        ),
        ...st.when(
          loading: () => [
            const Padding(
              padding: EdgeInsets.all(12),
              child: Skeleton(height: 420, radius: 24),
            ),
          ],
          error: (e, _) => [
            Padding(
              padding: const EdgeInsets.all(12),
              child: ErrorCard(error: e, onRetry: () => _refreshStart(ref)),
            ),
          ],
          data: (s) => [
            _Step(
              n: 0,
              s: s,
              children: [
                const _Para(
                  '阅读《CS 自学指南》（csdiy.wiki）的前言，了解计算机科学的自学方法；再阅读写给协会同学的一段话《我的一些小想法》。',
                ),
                const SizedBox(height: 8),
                for (var i = 0; i < _prefaces.length; i++)
                  _ReadRow(
                    title: _prefaces[i].$3,
                    done: s.prefaceDone[i],
                    onTap: () => context.pushPage(
                      LessonPage(slug: _prefaces[i].$1, page: _prefaces[i].$2),
                    ),
                  ),
                if (!s.guest)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      '阅读完成后，请在讲义页底部点击“标记完成”。',
                      style: TextStyle(fontSize: 12, color: h.sub),
                    ),
                  ),
              ],
            ),
            _Step(
              n: 1,
              s: s,
              children: [
                const _Para(
                  'CS50x（CS50\'s Introduction to Computer Science，哈佛大学计算机科学导论）是协会全体成员的第一门课程。完成全部习题集和期末项目后，可以在 cs50.me 领取哈佛大学颁发的课程证书。提交证书链接并经管理员确认后，本项任务完成。',
                ),
                const SizedBox(height: 12),
                if (!s.guest) ...[
                  HxBar(s.cs50Ratio),
                  const SizedBox(height: 4),
                  Text(
                    '站内进度 ${s.cs50Done} / ${s.cs50.items.length}',
                    style: TextStyle(
                      fontSize: 12,
                      color: h.sub,
                      fontFeatures: kTabular,
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                _LinkLine(
                  text: !s.guest && s.cs50.next != null
                      ? '继续学习：${s.cs50.next!.title}'
                      : '打开课程',
                  onTap: () {
                    final next = s.cs50.next;
                    if (!s.guest && next != null) {
                      context.pushPage(
                        LessonPage(
                          slug: 'cs50x',
                          page: next.pages.isEmpty
                              ? next.id
                              : next.pages.first.id,
                        ),
                      );
                    } else {
                      context.pushPage(const CoursePage(slug: 'cs50x'));
                    }
                  },
                ),
                _LinkLine(
                  text: '在 cs50.me 领取证书',
                  external: true,
                  onTap: () => launchUrl(
                    Uri.parse('https://cs50.me/cs50x'),
                    mode: LaunchMode.externalApplication,
                  ),
                ),
                const SizedBox(height: 8),
                if (s.guest)
                  HxButton(
                    '登录后提交证书',
                    kind: HxButtonKind.soft,
                    height: 40,
                    onTap: () => requireLogin(context, ref),
                  )
                else
                  _CertForm(cert: s.cert),
              ],
            ),
            _Step(
              n: 2,
              s: s,
              preparing: true,
              children: [
                const _Para(
                  'Across the Deep Sea 是协会自行编写的课程，内容包括计算机领域的专题文章和竞赛相关资料。课程正在编写中，内容将陆续发布。',
                ),
                const SizedBox(height: 10),
                HxButton(
                  '查看课程',
                  kind: HxButtonKind.soft,
                  icon: HxIcon.arrowRight,
                  height: 40,
                  onTap: () =>
                      context.pushPage(const CoursePage(slug: kDeepSea)),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}

class _Para extends StatelessWidget {
  const _Para(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: TextStyle(fontSize: 14, height: 1.6, color: Hx.of(context).sub),
  );
}

class _Step extends StatelessWidget {
  const _Step({
    required this.n,
    required this.s,
    required this.children,
    this.preparing = false,
  });
  final int n;
  final _StartState s;
  final List<Widget> children;
  final bool preparing;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final done = !s.guest && n < s.current;
    final now = !s.guest && n == s.current;
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      child: HxCard(
        color: now ? null : null,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: done ? h.okBg : (now ? h.tint : h.well),
                    shape: BoxShape.circle,
                  ),
                  child: done
                      ? HxIconView(HxIcon.check, size: 16, color: h.okInk)
                      : Text(
                          '${n + 1}',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: now ? h.accentText : h.sub,
                          ),
                        ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _stepTitles[n],
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: h.ink,
                    ),
                  ),
                ),
                if (done)
                  const StateTag('已完成', tone: 'ok')
                else if (preparing)
                  const StateTag('筹备中')
                else if (now)
                  const StateTag('进行中', tone: 'accent'),
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _ReadRow extends StatelessWidget {
  const _ReadRow({
    required this.title,
    required this.done,
    required this.onTap,
  });
  final String title;
  final bool done;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return Pressable(
      onTap: onTap,
      semanticLabel: '$title，${done ? '已读' : '未读'}',
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        decoration: BoxDecoration(
          color: h.well,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Container(
              width: 20,
              height: 20,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: done ? h.okBg : null,
                shape: BoxShape.circle,
                border: done
                    ? null
                    : Border.all(color: h.lineStrong, width: 1.5),
              ),
              child: done
                  ? HxIconView(HxIcon.check, size: 12, color: h.okInk)
                  : null,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(title, style: TextStyle(fontSize: 15, color: h.ink)),
            ),
            HxIconView(HxIcon.arrowRight, size: 16, color: h.sub),
          ],
        ),
      ),
    );
  }
}

class _LinkLine extends StatelessWidget {
  const _LinkLine({
    required this.text,
    required this.onTap,
    this.external = false,
  });
  final String text;
  final VoidCallback onTap;
  final bool external;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return Pressable(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          children: [
            Flexible(
              child: Text(
                text,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: h.accentText,
                ),
              ),
            ),
            const SizedBox(width: 4),
            HxIconView(
              external ? HxIcon.external : HxIcon.arrowRight,
              size: 14,
              color: h.accentText,
            ),
          ],
        ),
      ),
    );
  }
}

/// 证书：没交或被退回时显示输入框；交了显示状态和“查看证书”。
class _CertForm extends ConsumerStatefulWidget {
  const _CertForm({required this.cert});
  final Certificate? cert;

  @override
  ConsumerState<_CertForm> createState() => _CertFormState();
}

class _CertFormState extends ConsumerState<_CertForm> {
  late final _url = TextEditingController(
    text: widget.cert?.rejected ?? false ? widget.cert!.url : '',
  );
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final url = _url.text.trim();
    if (url.isEmpty) {
      setState(() => _error = '请填写证书链接');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(apiProvider).submitCertificate('cs50x', url);
      ref.invalidate(certificatesProvider);
      if (mounted) showHxToast(context, '证书已提交，等待管理员确认');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final cert = widget.cert;
    if (cert != null && !cert.rejected) {
      return Row(
        children: [
          StateTag(cert.statusLabel, tone: cert.approved ? 'ok' : 'accent'),
          const SizedBox(width: 10),
          Pressable(
            onTap: () => launchUrl(
              Uri.parse(cert.url),
              mode: LaunchMode.externalApplication,
            ),
            child: Text(
              '查看证书',
              style: TextStyle(fontSize: 13, color: h.accentText),
            ),
          ),
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (cert?.rejected ?? false) ...[
          Row(
            children: [
              const StateTag('未通过确认', tone: 'bad'),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  cert!.note != null && cert.note!.isNotEmpty
                      ? '原因：${cert.note}。请修改后重新提交。'
                      : '请修改后重新提交。',
                  style: TextStyle(fontSize: 13, color: h.ink),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
        ],
        MiuixTextField(
          controller: _url,
          label: '证书链接（https://）',
          useLabelAsPlaceholder: true,
          singleLine: true,
          keyboardType: TextInputType.url,
        ),
        const SizedBox(height: 6),
        Text(
          '在 cs50.me 打开课程证书页面，复制该页面的链接。',
          style: TextStyle(fontSize: 12, color: h.sub),
        ),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: TextStyle(fontSize: 13, color: h.badInk)),
        ],
        const SizedBox(height: 12),
        HxButton('提交证书', busy: _busy, enabled: !_busy, onTap: _submit),
      ],
    );
  }
}
