import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/hiana_page.dart';
import '../../app/page_transition.dart';
import '../../app/tokens.dart';
import '../../data/api_client.dart';
import '../../data/local_library.dart';
import '../../data/providers.dart';
import '../../widgets/kit.dart';
import '../../widgets/ui.dart';
import '../admin/admin_home.dart';
import '../web/web_page.dart';
import 'course_page.dart';

/// 本机导入的课（标题、slug），课程页底部的“导入到本机的课”用
final localCoursesProvider = FutureProvider<List<Map<String, dynamic>>>(
  (ref) => ref.read(apiProvider).local.list(),
);

/// 导入课程包（对照网页 components/ImportCourse.tsx）：粘贴 hiana-course@1 格式的 JSON，
/// 存到这台手机上学（只有自己能看到）；管理员还可以直接发布给所有人。
class ImportCoursePage extends ConsumerStatefulWidget {
  const ImportCoursePage({super.key});

  @override
  ConsumerState<ImportCoursePage> createState() => _ImportCoursePageState();
}

class _ImportCoursePageState extends ConsumerState<ImportCoursePage> {
  final _text = TextEditingController();
  Map<String, dynamic>? _pkg;
  List<String>? _errors;
  bool _busy = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  void _check() {
    setState(() {
      _pkg = null;
      _errors = null;
    });
    Object? raw;
    try {
      raw = jsonDecode(_text.text);
    } on FormatException catch (e) {
      setState(() => _errors = ['不是有效的 JSON：${e.message}']);
      return;
    }
    final errs = LocalLibrary.check(raw);
    setState(() {
      if (errs.isEmpty) {
        _pkg = raw as Map<String, dynamic>;
      } else {
        _errors = errs;
      }
    });
  }

  Future<void> _keep() async {
    final pkg = _pkg;
    if (pkg == null) return;
    setState(() => _busy = true);
    try {
      final slug = await ref.read(apiProvider).local.save(pkg);
      ref.invalidate(localCoursesProvider);
      ref.invalidate(courseProvider(slug));
      ref.invalidate(packageProvider(slug));
      if (!mounted) return;
      showHxToast(context, '已存到这台手机');
      Navigator.of(context).pushReplacement(
        MiuixPageRoute<void>(builder: (_) => CoursePage(slug: slug)),
      );
    } catch (e) {
      if (mounted) showHxToast(context, '保存失败：$e', error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _publish() async {
    final pkg = _pkg;
    if (pkg == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(adminApiProvider).publishPackage(pkg);
      ref.invalidate(coursesProvider);
      ref.invalidate(courseProvider(pkg['slug'] as String));
      ref.invalidate(packageProvider(pkg['slug'] as String));
      if (!mounted) return;
      showHxToast(context, '已发布');
      Navigator.of(context).pushReplacement(
        MiuixPageRoute<void>(
          builder: (_) => CoursePage(slug: pkg['slug'] as String),
        ),
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _errors = e.message.split('\n'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final admin = ref.watch(
      sessionProvider.select((s) => s.valueOrNull?.isAdmin ?? false),
    );
    final pkg = _pkg;
    final items = pkg == null
        ? const []
        : [
            for (final m in (pkg['modules'] as List))
              ...((m as Map)['items'] as List? ?? const []),
          ];
    final practice = items.fold<int>(
      0,
      (n, it) => n + (((it as Map)['practice'] as List?)?.length ?? 0),
    );
    return HianaPage(
      title: '导入课程包',
      showBack: true,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
          child: Text(
            '课程包是 hiana-course@1 格式的 JSON 文件。把文件内容复制后粘贴到下面；格式说明里有给 AI 用的整理提示词，可以把一门公开课的资料整理成课程包。',
            style: TextStyle(fontSize: 14, height: 1.55, color: h.sub),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: HxCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                MiuixTextField(
                  controller: _text,
                  label: '课程包 JSON',
                  useLabelAsPlaceholder: true,
                  minLines: 6,
                  maxLines: 12,
                  onChanged: (_) {
                    if (_pkg != null || _errors != null) {
                      setState(() {
                        _pkg = null;
                        _errors = null;
                      });
                    }
                  },
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
                          if (d?.text == null || d!.text!.isEmpty) {
                            if (context.mounted) {
                              showHxToast(context, '剪贴板是空的', error: true);
                            }
                            return;
                          }
                          _text.text = d.text!;
                          _check();
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: HxButton('检查', onTap: _check)),
                  ],
                ),
              ],
            ),
          ),
        ),
        if (_errors != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: HxCard(
              color: h.badBg,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '课程包有问题',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: h.badInk,
                    ),
                  ),
                  const SizedBox(height: 6),
                  for (final e in _errors!)
                    Text(
                      e,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.5,
                        color: h.badInk,
                      ),
                    ),
                ],
              ),
            ),
          ),
        if (pkg != null) ...[
          const SectionHead('检查通过'),
          RowGroup(
            children: [
              ListRow(title: '课程', trailing: _V('${pkg['title']}')),
              ListRow(title: 'slug', trailing: _V('${pkg['slug']}')),
              ListRow(
                title: '内容',
                trailing: _V(
                  '${(pkg['modules'] as List).length} 个模块，${items.length} 个条目，$practice 道练手题',
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: HxButton(
              '存到这台手机',
              expand: true,
              busy: _busy,
              enabled: !_busy,
              onTap: _keep,
            ),
          ),
          if (admin)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: HxButton(
                '发布给所有人',
                kind: HxButtonKind.soft,
                expand: true,
                enabled: !_busy,
                onTap: _publish,
              ),
            ),
          const FootNote(
            '存到这台手机的课只有你能看到，进度也只记在这台手机上。发布后所有人都能看到，同一 slug 再次发布会覆盖。',
          ),
        ],
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: RowGroup(
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
        ),
      ],
    );
  }
}

class _V extends StatelessWidget {
  const _V(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: const BoxConstraints(maxWidth: 220),
    child: Text(
      text,
      textAlign: TextAlign.end,
      style: TextStyle(fontSize: 14, color: Hx.of(context).sub),
    ),
  );
}
