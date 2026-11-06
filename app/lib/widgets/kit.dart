import 'dart:typed_data';

import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../app/tokens.dart';
import '../data/providers.dart';
import 'hx_icons.dart';
import 'ui.dart';

/// 分组卡片里的一行：标题、说明、右侧的小字或箭头。管理后台和新生任务的列表都用它。
class ListRow extends StatelessWidget {
  const ListRow({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
    this.leading,
    this.onTap,
    this.danger = false,
    this.arrow = true,
  });
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Widget? leading;
  final VoidCallback? onTap;
  final bool danger;
  final bool arrow;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final row = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      child: Row(
        children: [
          if (leading != null) ...[leading!, const SizedBox(width: 12)],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: danger ? h.badInk : h.ink,
                  ),
                ),
                if (subtitle != null && subtitle!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      subtitle!,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.45,
                        color: h.sub,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (trailing != null) ...[const SizedBox(width: 8), trailing!],
          if (onTap != null && arrow) ...[
            const SizedBox(width: 6),
            HxIconView(HxIcon.arrowRight, size: 16, color: h.sub),
          ],
        ],
      ),
    );
    if (onTap == null) return row;
    return Pressable(
      onTap: onTap!,
      scale: 0.985,
      semanticLabel: title,
      child: row,
    );
  }
}

/// 一组 [ListRow] 放进一张卡片，行与行之间有细分隔线。
class RowGroup extends StatelessWidget {
  const RowGroup({super.key, required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: HxCard(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          children: [
            for (var i = 0; i < children.length; i++) ...[
              if (i > 0)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Container(height: 0.5, color: h.line),
                ),
              children[i],
            ],
          ],
        ),
      ),
    );
  }
}

/// 页面底部的说明文字（灰色小字）。
class FootNote extends StatelessWidget {
  const FootNote(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
    child: Text(
      text,
      style: TextStyle(fontSize: 12, height: 1.5, color: Hx.of(context).sub),
    ),
  );
}

/// 确认对话框（声明式：放进 HianaPage.overlays，由 [show] 控制）。
class ConfirmDialog extends StatelessWidget {
  const ConfirmDialog({
    super.key,
    required this.show,
    required this.title,
    this.summary,
    required this.okText,
    required this.onOk,
    required this.onCancel,
    this.child,
  });
  final bool show;
  final String title;
  final String? summary;
  final String okText;
  final VoidCallback onOk;
  final VoidCallback onCancel;

  /// 按钮上面多放的内容（例如退回原因的输入框）
  final Widget? child;

  @override
  Widget build(BuildContext context) => MiuixOverlayDialog(
    show: show,
    title: title,
    summary: summary,
    onDismissRequest: onCancel,
    content: Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (child != null) ...[child!, const SizedBox(height: 16)],
          Row(
            children: [
              Expanded(child: MiuixTextButton('取消', onPressed: onCancel)),
              const SizedBox(width: 12),
              Expanded(
                child: MiuixTextButton(
                  okText,
                  colors: MiuixButtonDefaults.buttonColorsPrimary(context),
                  onPressed: onOk,
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

/// 小号的状态标签：ok 绿、bad 红、accent 主色、其余灰。
class StateTag extends StatelessWidget {
  const StateTag(this.text, {super.key, this.tone = 'muted'});
  final String text;
  final String tone; // ok | bad | accent | muted

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final (bg, fg) = switch (tone) {
      'ok' => (h.okBg, h.okInk),
      'bad' => (h.badBg, h.badInk),
      'accent' => (h.tint, h.accentText),
      _ => (h.mutedBg, h.mutedInk),
    };
    return HxTag(text, bg: bg, fg: fg);
  }
}

/// 毫秒时间戳 → "11 月 5 日 21:05"（北京时间）
String dayTime(int ms) => '${longDay(dayOfMs(ms), weekday: false)} ${hhmm(ms)}';

final _fileCache = <String, Future<Uint8List>>{};

/// 要登录才能看的图片（签到照片、签名）：带令牌请求 `/api/files/<key>`，同一张只下载一次。
class AuthImage extends ConsumerWidget {
  const AuthImage(
    this.fileKey, {
    super.key,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.radius = 10,
    this.background,
  });
  final String fileKey;
  final double? width;
  final double? height;
  final BoxFit fit;
  final double radius;
  final Color? background;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final h = Hx.of(context);
    final future = _fileCache.putIfAbsent(
      fileKey,
      () => ref.read(apiProvider).fileBytes(fileKey),
    );
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: Container(
        width: width,
        height: height,
        color: background ?? h.well,
        child: FutureBuilder<Uint8List>(
          future: future,
          builder: (context, snap) {
            if (snap.hasError) {
              _fileCache.remove(fileKey);
              return Center(
                child: Text(
                  '加载失败',
                  style: TextStyle(fontSize: 12, color: h.sub),
                ),
              );
            }
            final bytes = snap.data;
            if (bytes == null) return const SizedBox.shrink();
            // 缩略图只按显示尺寸解码（签到照片原图很大）
            final dpr = MediaQuery.devicePixelRatioOf(context);
            return Image.memory(
              bytes,
              fit: fit,
              gaplessPlayback: true,
              cacheWidth: width == null ? null : (width! * dpr).round(),
            );
          },
        ),
      ),
    );
  }
}
