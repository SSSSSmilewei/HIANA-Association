import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';

/// 页面里成组内容的外框：HyperOS 设置页那种左右留白的圆角卡片。
class Section extends StatelessWidget {
  const Section({super.key, this.title, required this.children, this.padding = EdgeInsets.zero});
  final String? title;
  final List<Widget> children;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (title != null) MiuixSmallTitle(title!),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          child: MiuixCard(insideMargin: padding, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children)),
        ),
      ],
    );
  }
}

/// 提示卡片：同步失败、网络错误这类需要人看见的状态。
/// 参考 KernelSU 管理器 Miuix 主题里的 WarningCard：颜色走主题的 error 角色，文案说清楚怎么办。
class NoticeCard extends StatelessWidget {
  const NoticeCard({super.key, required this.message, this.actionLabel, this.onAction, this.warning = true});
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;
  final bool warning;

  @override
  Widget build(BuildContext context) {
    final c = MiuixTheme.of(context).colors;
    final bg = warning ? c.errorContainer : c.secondaryContainer;
    final fg = warning ? c.onErrorContainer : c.onSecondaryContainer;
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      child: MiuixCard(
        colors: MiuixCardColors(color: bg, contentColor: fg),
        insideMargin: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        onPressed: onAction,
        child: Row(
          children: [
            Expanded(child: MiuixText(message, color: fg)),
            if (actionLabel != null) ...[
              const SizedBox(width: 12),
              MiuixText(actionLabel!, color: fg, fontWeight: FontWeight.w600),
            ],
          ],
        ),
      ),
    );
  }
}

/// 加载中：居中的小转圈，不占满整屏。
class LoadingBlock extends StatelessWidget {
  const LoadingBlock({super.key});

  @override
  Widget build(BuildContext context) =>
      const Padding(padding: EdgeInsets.symmetric(vertical: 48), child: Center(child: MiuixCircularProgressIndicator()));
}

/// 整行宽的按钮：MiuixButton 默认贴内容尺寸（skill 避坑清单第 1 条）。
class WideButton extends StatelessWidget {
  const WideButton({super.key, required this.text, required this.onPressed, this.primary = true, this.enabled = true});
  final String text;
  final VoidCallback onPressed;
  final bool primary;
  final bool enabled;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: double.infinity,
        child: MiuixTextButton(
          text,
          onPressed: onPressed,
          enabled: enabled,
          colors: primary ? MiuixButtonDefaults.buttonColorsPrimary(context) : null,
        ),
      );
}

/// 毫秒时间戳 → "21:05"（北京时间）。
String hhmm(int ms) {
  final t = DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true).add(const Duration(hours: 8));
  return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
}

/// 毫秒时间戳 → "今天 21:05" / "10月20日 23:30"。
String whenText(int ms, String today) {
  final t = DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true).add(const Duration(hours: 8));
  final day = t.toIso8601String().substring(0, 10);
  return day == today ? '今天 ${hhmm(ms)}' : '${t.month}月${t.day}日 ${hhmm(ms)}';
}
