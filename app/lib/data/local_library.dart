import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

import 'models.dart';

/// 导入到本机的课程包（对照网页 src/client/library.ts 的 local 部分）。
/// 课程包只存在这台手机上，别人看不到；进度也只记在本机，不进热力图。
/// 地址里的 slug 加前缀 `local-`，和站内的课区分开。
const kLocalPrefix = 'local-';
bool isLocalSlug(String slug) => slug.startsWith(kLocalPrefix);

/// 课程包格式（与 src/shared/package.ts 的 FORMAT 一致）
const kPackageFormat = 'hiana-course@1';

class LocalLibrary {
  Directory? _dir;

  Future<Directory> _root() async {
    final d = _dir ??= Directory(
      '${(await getApplicationDocumentsDirectory()).path}/courses',
    );
    if (!await d.exists()) await d.create(recursive: true);
    return d;
  }

  Future<File> _pkgFile(String slug) async => File(
    '${(await _root()).path}/${slug.replaceFirst(kLocalPrefix, '')}.json',
  );

  Future<File> _stateFile() async =>
      File('${(await _root()).path}/_state.json');

  /// 本机的进度：{ "local-xxx": { "done": [...], "solved": { item: [...] } } }
  Future<Map<String, dynamic>> _state() async {
    final f = await _stateFile();
    if (!await f.exists()) return {};
    try {
      return jsonDecode(await f.readAsString()) as Map<String, dynamic>;
    } catch (_) {
      return {};
    }
  }

  Future<void> _saveState(Map<String, dynamic> s) async =>
      (await _stateFile()).writeAsString(jsonEncode(s));

  /// 粗查一遍格式；完整校验在发布时由服务器做。返回问题清单（空 = 可以导入）
  static List<String> check(Object? raw) {
    if (raw is! Map<String, dynamic>) return ['课程包应该是一个 JSON 对象'];
    final errs = <String>[];
    if (raw['format'] != kPackageFormat) {
      errs.add('format 应该是 "$kPackageFormat"');
    }
    final slug = raw['slug'];
    if (slug is! String ||
        !RegExp(r'^[a-z0-9][a-z0-9-]{1,59}$').hasMatch(slug)) {
      errs.add('slug 只能用小写字母、数字和连字符（2–60 个字符）');
    }
    if (raw['title'] is! String || (raw['title'] as String).trim().isEmpty) {
      errs.add('title（课程名）不能为空');
    }
    final modules = raw['modules'];
    if (modules is! List) {
      errs.add('modules 应该是数组');
    } else {
      for (var i = 0; i < modules.length; i++) {
        final m = modules[i];
        if (m is! Map || m['items'] is! List) {
          errs.add('modules.$i：缺少 items 数组');
        }
      }
    }
    return errs;
  }

  Future<List<Map<String, dynamic>>> list() async {
    final dir = await _root();
    final out = <Map<String, dynamic>>[];
    await for (final f in dir.list()) {
      if (f is! File ||
          !f.path.endsWith('.json') ||
          f.path.endsWith('/_state.json')) {
        continue;
      }
      try {
        out.add(jsonDecode(await f.readAsString()) as Map<String, dynamic>);
      } catch (_) {
        // 坏文件跳过
      }
    }
    out.sort((a, b) => '${a['title']}'.compareTo('${b['title']}'));
    return out;
  }

  /// 存进本机（同 slug 覆盖），返回本机地址用的 slug（带 local- 前缀）
  Future<String> save(Map<String, dynamic> pkg) async {
    await (await _pkgFile(
      pkg['slug'] as String,
    )).writeAsString(jsonEncode(pkg));
    return '$kLocalPrefix${pkg['slug']}';
  }

  Future<void> remove(String slug) async {
    final f = await _pkgFile(slug);
    if (await f.exists()) await f.delete();
    final s = await _state();
    s.remove(slug);
    await _saveState(s);
  }

  Future<Map<String, dynamic>> _raw(String slug) async {
    final f = await _pkgFile(slug);
    if (!await f.exists()) throw StateError('这台设备上没有这门课');
    return jsonDecode(await f.readAsString()) as Map<String, dynamic>;
  }

  /// 课程包原文（导出、发布用），slug 是原来的（不带前缀）
  Future<String> exportJson(String slug) async =>
      const JsonEncoder.withIndent('  ').convert(await _raw(slug));

  Future<CoursePackage> package(String slug) async {
    final raw = await _raw(slug);
    return CoursePackage.fromJson({...raw, 'slug': slug});
  }

  Future<CourseDetail> detail(String slug) async {
    final raw = await _raw(slug);
    final st = (await _state())[slug] as Map<String, dynamic>? ?? const {};
    return CourseDetail.fromJson({
      'course': {...raw, 'slug': slug},
      'enrollment': <String, dynamic>{'status': st['status'] ?? 'active'},
      'done': <String, dynamic>{
        for (final id in (st['done'] as List? ?? const [])) '$id': 0,
      },
      'solved': (st['solved'] as Map<String, dynamic>?) ?? <String, dynamic>{},
    });
  }

  Future<void> setDone(String slug, String itemId, bool done) async {
    final s = await _state();
    final st = (s[slug] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final list = {...(st['done'] as List? ?? const []).cast<String>()};
    done ? list.add(itemId) : list.remove(itemId);
    st['done'] = list.toList();
    s[slug] = st;
    await _saveState(s);
  }

  Future<void> solve(String slug, String itemId, String questionId) async {
    final s = await _state();
    final st = (s[slug] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final solved =
        (st['solved'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final qs = {
      ...(solved[itemId] as List? ?? const []).cast<String>(),
      questionId,
    };
    solved[itemId] = qs.toList();
    st['solved'] = solved;
    s[slug] = st;
    await _saveState(s);
  }

  Future<void> setStatus(String slug, String status) async {
    final s = await _state();
    final st = (s[slug] as Map<String, dynamic>?) ?? <String, dynamic>{};
    st['status'] = status;
    s[slug] = st;
    await _saveState(s);
  }
}
