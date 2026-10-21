import 'package:flutter/physics.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';

/// 把 flutter_miuix 的 Folme 弹簧参数（[folmeSpring] 返回 SpringDescription）换成路由能用的 Curve。
/// 曲线在 [settle] 秒内走完，0 和 1 两端由 Curve 自己保证。
class FolmeCurve extends Curve {
  FolmeCurve({double damping = 0.9, double response = 0.4, this.settle = 0.45})
      : _sim = SpringSimulation(folmeSpring(damping: damping, response: response), 0, 1, 0);

  final SpringSimulation _sim;
  final double settle;

  @override
  double transformInternal(double t) => _sim.x(t * settle);
}

/// HyperOS 式的页面推入：新页面从右侧滑入，旧页面略微左移。
/// flutter_miuix 没有提供路由转场，这里用 Folme 弹簧自己写，代替 MaterialPageRoute。
class MiuixPageRoute<T> extends PageRouteBuilder<T> {
  MiuixPageRoute({required WidgetBuilder builder, super.settings})
      : super(
          transitionDuration: const Duration(milliseconds: 450),
          reverseTransitionDuration: const Duration(milliseconds: 380),
          pageBuilder: (context, _, __) => builder(context),
          transitionsBuilder: (context, animation, secondary, child) {
            final curve = FolmeCurve();
            final enter = CurvedAnimation(parent: animation, curve: curve, reverseCurve: curve.flipped);
            final leave = CurvedAnimation(parent: secondary, curve: curve, reverseCurve: curve.flipped);
            return SlideTransition(
              position: Tween(begin: Offset.zero, end: const Offset(-0.25, 0)).animate(leave),
              child: SlideTransition(
                position: Tween(begin: const Offset(1, 0), end: Offset.zero).animate(enter),
                child: child,
              ),
            );
          },
        );
}

extension MiuixNavigation on BuildContext {
  Future<T?> pushPage<T>(Widget page) => Navigator.of(this).push<T>(MiuixPageRoute<T>(builder: (_) => page));
}
