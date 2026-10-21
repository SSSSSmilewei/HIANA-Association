# 协会学习 App（学员端）

智慧网络算法协会学习平台的手机版，用 Flutter + [flutter_miuix](https://github.com/ChuxinNeko/flutter_miuix) 写成，界面遵循 [miuix](https://github.com/compose-miuix-ui/miuix) 规范，不使用 Material 控件。后端和网页端共用 `study.shanmoew-denied.win`。

第一版只做学员每天会用的四件事：登录与口令激活、首页本周主线、晚自习打卡、我的热力图与平台绑定。会长后台继续用网页。

> 这一版代码是在没有 Flutter 环境的地方写的，还没有编译和运行过。第一次跑起来时如果有报错，按报错改即可，大多会是组件参数名这类小问题。

## 第一次运行

仓库里只有 `lib/` 和配置，安卓 / iOS 工程目录需要本地生成一次（不会覆盖已有代码）：

```bash
cd app
flutter create . --org win.shanmoew --project-name hiana_app --platforms=android,ios
flutter pub get
flutter run
```

国内网络下拉依赖慢的话，先设镜像：

```bash
export PUB_HOSTED_URL=https://pub.flutter-io.cn
export FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn
```

连本地后端调试：先在仓库根目录 `npm run dev:bun`，再

```bash
flutter run --dart-define=HIANA_API=http://10.0.2.2:8787   # 安卓模拟器访问电脑上的 8787 端口
```

## 检查有没有用 Material 控件

```bash
./tool/check_no_material.sh
```

规则：只有 `lib/app/miuix_root.dart` 可以 import `material.dart`（`MaterialApp` 和透明 `Material` 只作底座，因为 flutter_miuix 的输入框依赖它们）。其他文件只 import `flutter/widgets.dart` 和 `flutter_miuix`。

## 写界面时查组件用法

`.claude/skills/flutter-miuix/` 是 flutter_miuix 官方附带的组件说明（Apache-2.0），Claude Code 和 Codex 都会读到。写组件参数前先查 `references/`，不要凭记忆猜。

## 目录

```
lib/
  main.dart
  app/
    miuix_root.dart     根组件：主题、MaterialApp 底座（唯一 import Material 的地方）
    hiana_page.dart     所有页面共用的骨架：可折叠大标题、下拉刷新、安全区
    home_shell.dart     底部导航 + 左右滑动切换标签；启动时检查强制更新
    page_transition.dart  HyperOS 式页面推入（Folme 弹簧）
  core/heatmap.dart     热力图日期与分档，移植自 src/shared/heatmap.ts
  data/                 接口模型、网络客户端、令牌存储、状态
  features/             auth（登录、设密码）、home、checkin、profile
  widgets/              分组卡片、提示卡片、热力图
```

## 发布

`.github/workflows/app.yml` 在打 `app-v*` 标签时构建 APK。发布后在数据库 `settings` 表里改三项，App 会提示更新：

| key | 含义 |
| --- | --- |
| `app_latest_version` | 最新版本号，例如 `1.0.1` |
| `app_min_version` | 低于它的版本会被要求强制更新 |
| `app_apk_url` | APK 下载地址（放 Workers 静态资源或 Gitee 发行版，国内能直接下载） |

## 还没做

- 平板和折叠屏展开时换成侧边导航栏（`MiuixNavigationRail`）
- iOS 只保证能在模拟器上跑，不上架
- 公告、讨论板、蓝点提问：等网页端做好后再移植
