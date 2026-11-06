import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

import '../../data/admin.dart';
import '../../data/api_client.dart';
import '../../data/providers.dart';
import '../../widgets/hx_icons.dart';
import '../../widgets/ui.dart';
import 'admin_applications.dart';
import 'admin_members.dart';
import 'admin_notices.dart';
import 'admin_pins.dart';
import 'admin_settings.dart';
import 'admin_today.dart';

/// 管理后台（只有管理员能看到入口）。功能与网页 /admin 下的各页一致，在 App 里原生实现；
/// 签到表的打印和 CSV 导出在 App 内嵌网页或浏览器里完成。
final adminApiProvider = Provider<AdminApi>(
  (ref) => AdminApi(ref.watch(apiProvider)),
);

class AdminPageEntry {
  const AdminPageEntry(this.title, this.icon, this.build);
  final String title;
  final HxIcon icon;
  final Widget Function() build;
}

final adminPages = <AdminPageEntry>[
  AdminPageEntry('今日签到与证书确认', HxIcon.camera, () => const AdminTodayPage()),
  AdminPageEntry('成员与邀请码', HxIcon.user, () => const AdminMembersPage()),
  AdminPageEntry('新生报名', HxIcon.flag, () => const AdminApplicationsPage()),
  AdminPageEntry('蓝色钉子收件箱', HxIcon.pin, () => const AdminPinsPage()),
  AdminPageEntry('公告与比赛', HxIcon.megaphone, () => const AdminNoticesPage()),
  AdminPageEntry('设置与课程包', HxIcon.key, () => const AdminSettingsPage()),
];

/// 下载要登录才能拿到的表格（CSV），存到缓存目录后交给系统用表格软件打开。
Future<void> downloadAndOpen(
  BuildContext context,
  WidgetRef ref,
  String path,
  String filename,
) async {
  showHxToast(context, '正在下载 $filename');
  try {
    final data = await ref.read(apiProvider).bytes(path);
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/$filename');
    await file.writeAsBytes(data, flush: true);
    var r = await OpenFilex.open(file.path, type: 'text/csv');
    // 没装表格软件时退一步，用能看文本的应用打开
    if (r.type == ResultType.noAppToOpen) {
      r = await OpenFilex.open(file.path, type: 'text/plain');
    }
    if (r.type != ResultType.done && context.mounted) {
      showHxToast(context, '没有能打开这个表格的应用（${r.message}），请在手机上安装 WPS 或其他表格软件', error: true);
    }
  } on ApiException catch (e) {
    if (context.mounted) showHxToast(context, e.message, error: true);
  }
}
