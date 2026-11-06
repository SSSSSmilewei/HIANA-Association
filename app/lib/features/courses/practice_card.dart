import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';

import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../data/api_client.dart';
import '../../data/models.dart';
import '../../widgets/markdown_view.dart';
import '../../widgets/hx_icons.dart';
import '../../widgets/ui.dart';
import '../web/web_page.dart';
import 'lesson_page.dart';

/// 一道练手题。选择、填空在 App 里判；代码题（要跑 Python / SQL）在内嵌网页里做。
class PracticeCard extends StatefulWidget {
  const PracticeCard({
    super.key,
    required this.no,
    required this.q,
    required this.solved,
    required this.webUrl,
    required this.onSolved,
    this.onWebClosed,
  });
  final int no;
  final Practice q;
  final bool solved;
  final String webUrl;

  /// 从内嵌网页回来时调用（网页里做对的代码题已经记上了，刷新一下进度）
  final VoidCallback? onWebClosed;
  final VoidCallback onSolved;

  @override
  State<PracticeCard> createState() => _PracticeCardState();
}

class _PracticeCardState extends State<PracticeCard> {
  final _picked = <int>{};
  final _text = TextEditingController();
  bool? _ok;
  bool _showAnswer = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  void _check() {
    final q = widget.q;
    final ok = q.type == 'choice'
        ? (_picked.length == q.choiceAnswer.length &&
              _picked.every(q.choiceAnswer.contains))
        : q.checkText(_text.text);
    HapticFeedback.lightImpact();
    setState(() => _ok = ok);
    if (ok) widget.onSolved();
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final q = widget.q;
    void link(String href) => openHref(context, href);
    return HxCard(
      radius: 22,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 26,
                height: 26,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: h.well,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  '${widget.no}',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: h.ink,
                    fontFeatures: kTabular,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  q.heading,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: h.ink,
                  ),
                ),
              ),
              if (q.originLabel != null) ...[
                HxTag(q.originLabel!),
                const SizedBox(width: 6),
              ],
              if (widget.solved) HxTag('做对过', bg: h.okBg, fg: h.okInk),
            ],
          ),
          const SizedBox(height: 10),
          MarkdownView(source: q.prompt, onLink: link),
          const SizedBox(height: 10),
          if (q.type == 'choice') ...[
            for (var i = 0; i < q.options.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _Option(
                  mark: String.fromCharCode(65 + i),
                  text: q.options[i],
                  on: _picked.contains(i),
                  wrong:
                      _ok == false &&
                      _picked.contains(i) &&
                      !q.choiceAnswer.contains(i),
                  onTap: () => setState(() {
                    _ok = null;
                    if (q.multi) {
                      _picked.contains(i) ? _picked.remove(i) : _picked.add(i);
                    } else {
                      _picked
                        ..clear()
                        ..add(i);
                    }
                  }),
                ),
              ),
            HxButton(
              q.multi ? '检查（多选）' : '检查',
              expand: true,
              enabled: _picked.isNotEmpty,
              onTap: _check,
            ),
          ] else if (q.type == 'text') ...[
            MiuixTextField(
              controller: _text,
              label: '你的答案',
              useLabelAsPlaceholder: true,
              singleLine: true,
              onSubmitted: (_) => _check(),
            ),
            const SizedBox(height: 10),
            HxButton('检查', expand: true, onTap: _check),
          ] else ...[
            Text(
              '代码题在内嵌的网页中运行测试（Python、SQL、JavaScript），做对后自动记录。',
              style: TextStyle(fontSize: 14, height: 1.5, color: h.sub),
            ),
            const SizedBox(height: 10),
            HxButton(
              '打开代码编辑器',
              icon: HxIcon.code,
              kind: HxButtonKind.ghost,
              expand: true,
              onTap: () async {
                await Navigator.of(context).push(
                  MiuixPageRoute<void>(
                    builder: (_) => WebPage(
                      title: '练手题 ${widget.no}',
                      path: widget.webUrl.startsWith(kBaseUrl)
                          ? widget.webUrl.substring(kBaseUrl.length)
                          : widget.webUrl,
                      // 只在这一页做题；点网页里的导航就回到 App
                      stayPrefix: Uri.parse(widget.webUrl).path,
                    ),
                  ),
                );
                widget.onWebClosed?.call();
              },
            ),
          ],
          if (_ok != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
              decoration: BoxDecoration(
                color: h.well,
                borderRadius: BorderRadius.circular(14),
                border: Border(
                  left: BorderSide(color: _ok! ? h.accent : h.badInk, width: 3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _ok! ? '对了' : '还不对',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: _ok! ? h.ink : h.badInk,
                    ),
                  ),
                  if (_ok! && q.explain != null) ...[
                    const SizedBox(height: 6),
                    MarkdownView(source: q.explain!, onLink: link),
                  ],
                  if (!_ok! && q.type == 'text')
                    _showAnswer
                        ? Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              q.textAnswer.join(' / '),
                              style: TextStyle(
                                fontSize: 14,
                                color: h.ink,
                                fontFamily: 'monospace',
                              ),
                            ),
                          )
                        : Pressable(
                            onTap: () => setState(() => _showAnswer = true),
                            child: Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Text(
                                '看答案',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: h.accentText,
                                ),
                              ),
                            ),
                          ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Option extends StatelessWidget {
  const _Option({
    required this.mark,
    required this.text,
    required this.on,
    required this.wrong,
    required this.onTap,
  });
  final String mark;
  final String text;
  final bool on;
  final bool wrong;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final edge = wrong ? h.badInk : (on ? h.accent : h.line);
    return Pressable(
      onTap: onTap,
      scale: 0.99,
      semanticLabel: '选项 $mark',
      child: AnimatedContainer(
        duration: HxMotion.fast,
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        decoration: BoxDecoration(
          color: on ? (wrong ? h.badBg : h.tint) : null,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: edge),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 22,
              height: 22,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: on ? edge : null,
                border: Border.all(color: on ? edge : h.sub),
              ),
              child: Text(
                mark,
                style: TextStyle(
                  fontSize: 12,
                  color: on ? const Color(0xFFFFFFFF) : h.sub,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                text.replaceAll('`', ''),
                style: TextStyle(fontSize: 15, height: 1.45, color: h.ink),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
