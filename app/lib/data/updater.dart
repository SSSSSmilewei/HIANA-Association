import 'dart:io';

import 'package:dio/dio.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

/// 本地升级：在 App 里把新版安装包下到缓存目录，再交给系统安装器。
/// 不用跳浏览器、也不用去“下载”文件夹里找文件。
///
/// 安卓要有 REQUEST_INSTALL_PACKAGES 权限（构建时在 .github/workflows/app.yml 里加进清单）；
/// 第一次安装时系统会让用户允许“安装未知应用”，允许后回到 App 再点一次即可。
class Updater {
  Updater()
    : _dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 15)));

  final Dio _dio;
  CancelToken? _cancel;

  /// 只有安卓能直接装安装包；其他平台用浏览器打开下载地址。
  static bool get canInstall => Platform.isAndroid;

  /// 下载安装包。[onProgress] 给 0–1 的进度；服务器没给总大小时给 -1。
  /// 返回下好的文件路径。下载失败抛 [UpdateException]。
  Future<String> download(
    String url,
    String version, {
    required void Function(double ratio) onProgress,
  }) async {
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/hiana-$version.apk');
    final part = File('${file.path}.part');
    _cancel = CancelToken();
    try {
      await _dio.download(
        url,
        part.path,
        cancelToken: _cancel,
        deleteOnError: true,
        onReceiveProgress: (got, total) =>
            onProgress(total > 0 ? got / total : -1),
      );
    } on DioException catch (e) {
      if (CancelToken.isCancel(e)) throw const UpdateException('已取消下载');
      throw const UpdateException('下载失败，检查一下网络后再试');
    } finally {
      _cancel = null;
    }
    // 先下成 .part，下完才改名：中途断掉不会留下一个装不上的半截安装包
    if (await file.exists()) await file.delete();
    await part.rename(file.path);
    return file.path;
  }

  /// 打开系统安装器。
  Future<void> install(String path) async {
    final r = await OpenFilex.open(
      path,
      type: 'application/vnd.android.package-archive',
    );
    switch (r.type) {
      case ResultType.done:
        return;
      case ResultType.permissionDenied:
        throw const UpdateException(
          '要先在系统设置里允许海纳协会“安装未知应用”，再点一次安装',
        );
      case ResultType.fileNotFound:
        throw const UpdateException('安装包不见了，重新下载一次');
      default:
        throw UpdateException('没能打开安装器：${r.message}');
    }
  }

  void cancel() => _cancel?.cancel();
}

class UpdateException implements Exception {
  const UpdateException(this.message);
  final String message;

  @override
  String toString() => message;
}
