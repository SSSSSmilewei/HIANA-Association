import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app/tokens.dart';
import '../data/models.dart';
import '../data/updater.dart';
import 'ui.dart';

/// 有新版本时的弹窗：在 App 里下载安装包、显示进度，下完直接打开系统安装器。
/// 弹层是声明式的：[version] 为空时收起。[force] 为真时不能关掉（版本已停止支持）。
class UpdateDialog extends StatefulWidget {
  const UpdateDialog({
    super.key,
    required this.version,
    required this.current,
    this.force = false,
    this.onClose,
  });
  final AppVersion? version;
  final String current;
  final bool force;
  final VoidCallback? onClose;

  @override
  State<UpdateDialog> createState() => _UpdateDialogState();
}

class _UpdateDialogState extends State<UpdateDialog> {
  final _updater = Updater();
  double? _progress; // null：还没开始；-1：下载中但不知道总大小
  String? _file; // 下好的安装包，装失败时可以直接再装
  String? _error;

  @override
  void dispose() {
    _updater.cancel();
    super.dispose();
  }

  Future<void> _browser() async {
    final url = widget.version?.apkUrl;
    if (url == null) return;
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  Future<void> _start() async {
    final v = widget.version;
    if (v == null || v.apkUrl == null) return;
    if (!Updater.canInstall) return _browser();
    setState(() {
      _error = null;
      if (_file == null) _progress = 0;
    });
    try {
      final path =
          _file ??
          await _updater.download(
            v.apkUrl!,
            v.latest,
            onProgress: (r) {
              if (mounted) setState(() => _progress = r);
            },
          );
      if (!mounted) return;
      setState(() {
        _file = path;
        _progress = null;
      });
      await _updater.install(path);
    } on UpdateException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _progress = null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = '没能完成升级，可以改用浏览器下载';
          _progress = null;
        });
      }
    }
  }

  void _close() {
    _updater.cancel();
    setState(() => _progress = null);
    widget.onClose?.call();
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final v = widget.version;
    final p = _progress;
    final downloading = p != null;
    final summary = widget.force
        ? '当前版本 ${widget.current} 已经停止支持，更新到 ${v?.latest ?? '最新版'} 后才能继续使用。'
        : '当前 ${widget.current}，最新 ${v?.latest ?? ''}。在 App 里下载，下完直接安装，账号和设置都会保留。';
    return MiuixOverlayDialog(
      show: v != null,
      title: widget.force ? '需要更新 App' : '有新版本',
      summary: summary,
      onDismissRequest: widget.force || downloading ? null : _close,
      content: Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (p != null) ...[
              HxBar(p < 0 ? 0.5 : p, height: 6),
              const SizedBox(height: 8),
              Text(
                p < 0 ? '正在下载…' : '正在下载 ${(p * 100).floor()}%',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: h.sub),
              ),
              const SizedBox(height: 12),
            ],
            if (_error != null) ...[
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: h.badInk),
              ),
              const SizedBox(height: 12),
            ],
            if (v?.apkUrl == null)
              Text(
                '还没有安装包地址，找会长要安装包',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: h.sub),
              )
            else if (downloading)
              MiuixTextButton('取消下载', onPressed: _updater.cancel)
            else
              MiuixTextButton(
                _file != null
                    ? '安装'
                    : Updater.canInstall
                    ? '下载并安装'
                    : '去下载',
                colors: MiuixButtonDefaults.buttonColorsPrimary(context),
                onPressed: _start,
              ),
            if (!downloading && _error != null && v?.apkUrl != null) ...[
              const SizedBox(height: 8),
              MiuixTextButton('用浏览器下载', onPressed: _browser),
            ],
            if (!widget.force && !downloading) ...[
              const SizedBox(height: 8),
              MiuixTextButton('以后再说', onPressed: _close),
            ],
          ],
        ),
      ),
    );
  }
}
