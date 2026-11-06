import 'package:flutter/widgets.dart';
import 'package:flutter_miuix/miuix.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../app/tokens.dart';
import '../../data/api_client.dart';
import '../../data/providers.dart';
import '../../widgets/hx_icons.dart';
import '../../widgets/ui.dart';

/// 网页的登录 Cookie 名（与 src/worker/session.ts 的 COOKIE 一致）。
/// 网页和 App 用的是同一个签名令牌，写进 Cookie 后内嵌网页就是登录状态。
const _sessionCookie = 'hiana_s';

/// App 内嵌的网页：代码题运行（Pyodide、sql.js 只能在浏览器里跑）、协会介绍动画、签到表。
/// [path] 是站内路径（例如 /intro/?view=map），打开前把 App 的登录令牌写进 Cookie。
/// 站外链接交给系统浏览器。
class WebPage extends ConsumerStatefulWidget {
  const WebPage({
    super.key,
    required this.title,
    required this.path,
    this.fullscreen = false,
    this.note,
    this.stayPrefix,
  });
  final String title;
  final String path;

  /// 设了以后只在这个路径下浏览；跳到站内别的页面（例如协会介绍里的“进入平台”）就关掉网页回到 App
  final String? stayPrefix;

  /// 协会介绍这类整屏页面：不要顶栏（网页自己有“跳过”“直接进入平台”，系统返回手势也能退出）
  final bool fullscreen;

  /// 顶栏下方的一行说明（例如“打印请在浏览器中打开”）
  final String? note;

  @override
  ConsumerState<WebPage> createState() => _WebPageState();
}

class _WebPageState extends ConsumerState<WebPage> {
  late final WebViewController _web;
  int _progress = 0;
  String? _error;

  Uri get _url => Uri.parse('$kBaseUrl${widget.path}');

  @override
  void initState() {
    super.initState();
    final base = Uri.parse(kBaseUrl);
    _web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (p) {
            if (mounted) setState(() => _progress = p);
          },
          onPageStarted: (_) {
            if (mounted) setState(() => _error = null);
          },
          onWebResourceError: (e) {
            // 只管主页面；图片、字体之类加载失败不打扰
            if (e.isForMainFrame == true && mounted) {
              setState(() => _error = '页面没有打开：${e.description}');
            }
          },
          onNavigationRequest: (req) {
            final u = Uri.tryParse(req.url);
            if (u == null) return NavigationDecision.prevent;
            final stay = widget.stayPrefix;
            if (stay != null &&
                u.host == base.host &&
                !u.path.startsWith(stay)) {
              // PopScope 拦着系统返回，这里直接 pop（maybePop 会被拦下）
              if (mounted) Navigator.of(context).pop();
              return NavigationDecision.prevent;
            }
            if (u.host == base.host ||
                u.scheme == 'about' ||
                u.scheme == 'data' ||
                u.scheme == 'blob') {
              return NavigationDecision.navigate;
            }
            launchUrl(u, mode: LaunchMode.externalApplication);
            return NavigationDecision.prevent;
          },
        ),
      );
    _open();
  }

  Future<void> _open() async {
    final base = Uri.parse(kBaseUrl);
    final token = await ref.read(apiProvider).token();
    final cookies = WebViewCookieManager();
    if (token != null) {
      await cookies.setCookie(
        WebViewCookie(
          name: _sessionCookie,
          value: token,
          domain: base.host,
          path: '/',
        ),
      );
    } else {
      await cookies.clearCookies();
    }
    await _web.loadRequest(_url);
  }

  Future<void> _back() async {
    if (await _web.canGoBack()) {
      await _web.goBack();
    } else if (mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = Hx.of(context);
    final view = Stack(
      children: [
        Positioned.fill(child: WebViewWidget(controller: _web)),
        if (_progress < 100)
          Positioned(
            left: 0,
            right: 0,
            top: 0,
            child: HxBar(_progress / 100, height: 2),
          ),
        if (_error != null)
          Positioned.fill(
            child: Container(
              color: h.bg,
              padding: const EdgeInsets.all(12),
              alignment: Alignment.topCenter,
              child: ErrorCard(error: _error!, onRetry: _open),
            ),
          ),
      ],
    );
    if (widget.fullscreen) {
      return PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) _back();
        },
        child: Container(color: const Color(0xFF0B1E3A), child: view),
      );
    }
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _back();
      },
      child: MiuixScaffold(
        topBar: MiuixSmallTopAppBar(
          title: widget.title,
          navigationIcon: Padding(
            padding: const EdgeInsets.only(left: 12),
            child: HxIconButton(
              icon: HxIcon.back,
              label: '返回',
              onTap: () => Navigator.of(context).pop(),
            ),
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: HxIconButton(
                icon: HxIcon.external,
                label: '在浏览器中打开',
                onTap: () =>
                    launchUrl(_url, mode: LaunchMode.externalApplication),
              ),
            ),
          ],
        ),
        content: (padding) => Padding(
          padding: EdgeInsets.only(top: padding.top, bottom: padding.bottom),
          child: Column(
            children: [
              if (widget.note != null)
                Container(
                  width: double.infinity,
                  color: h.well,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: Text(
                    widget.note!,
                    style: TextStyle(fontSize: 12, height: 1.5, color: h.sub),
                  ),
                ),
              Expanded(child: view),
            ],
          ),
        ),
      ),
    );
  }
}
