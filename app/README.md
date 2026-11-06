# 协会学习 App（学员端）

智慧算法网络协会学习平台的手机版，用 Flutter + [flutter_miuix](https://github.com/ChuxinNeko/flutter_miuix) 写成，界面遵循 [miuix](https://github.com/compose-miuix-ui/miuix) 规范，不使用 Material 控件。后端和网页端共用 `study.shanmoew-denied.win`。

学员每天会用的几件事：登录、用邀请码注册、找回密码（不登录也能以游客身份看首页、课程、公告），首页“接下来”、课程目录（csdiy 全部课程）和站内讲义阅读（CS50x、Missing Semester，App 内渲染 Markdown）、协会介绍与学生成就、晚自习打卡、我的热力图与平台绑定。

0.5.0 起，网页端的功能在 App 里都能用（外观也和网页一样：12 套配色、导入配色和字体、字号，见「我的 → 外观」）：新生任务（含 CS50x 证书提交）、公告阅读确认、首页称呼、长按讲义段落钉问题、导入 / 复制课程包，以及完整的管理后台（今日签到与证书确认、成员与邀请码、新生报名、蓝色钉子收件箱、公告与比赛、设置与课程包）。
只能在浏览器环境里运行的几样在 App 内嵌网页打开，并自动带上 App 的登录状态（`lib/features/web/web_page.dart` 把令牌写进 `hiana_s` Cookie）：代码题（Pyodide / sql.js）、协会介绍动画（结尾有新生报名表）、签到表、课程包格式说明。

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

`android/`、`.metadata` 这些 `flutter create` 生成的文件已经写进根目录的 `.gitignore`，CI 每次重新生成，不要提交。

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
  data/                 接口模型、网络客户端、令牌存储、状态；admin.dart 是后台接口，local_library.dart 是本机导入的课
  features/             auth（登录、设密码）、home、checkin、profile、courses（含导入课程包）、notices、pins、
                        start（新生任务）、admin（管理后台）、web（内嵌网页）、about
  widgets/              分组卡片、提示卡片、热力图；kit.dart 是列表行、确认框、要登录才能看的图片
```

## 发布

`.github/workflows/app.yml` 在 `main` 上（或打 `app-v*` 标签时）构建 APK：通用包 `app-release.apk` 加三个按芯片分的包，发布到 Releases。发布后在数据库 `settings` 表里改三项，App 会提示更新：

| key | 含义 |
| --- | --- |
| `app_latest_version` | 最新版本号，例如 `0.4.1`（内测期间都用 0.x.x） |
| `app_min_version` | 低于它的版本会被要求强制更新 |
| `app_apk_url` | APK 下载地址。**留空就行**：默认用本站的 `/api/app/apk`，从 GitHub Releases 取通用包经 Cloudflare 转发，国内也能下 |

App 有本地升级：「我的 → 检查更新」或启动时发现低于最低版本，会在 App 里下载安装包、显示进度，下完直接打开系统安装器（第一次要允许“安装未知应用”）。下载失败可以改用浏览器。

版本号：内测期间都是 `0.x.x`，`pubspec.yaml` 里 `+` 后面的构建号只能往上加（1.3.1+5 之后是 0.4.0+6），否则装不上覆盖升级。
以前的 1.x 版不带 `?scheme=0` 请求 `/api/app/version`，服务器会告诉它最新版本是 `1.99.0`，它就会照常提示下载新的 0.x 安装包。

## 还没做

- 平板和折叠屏展开时换成侧边导航栏（`MiuixNavigationRail`）
- iOS 只保证能在模拟器上跑，不上架
- 签到表的打印 / 存 PDF：安卓 WebView 不支持网页的打印，要在浏览器里打开（浏览器中需要登录一次）
- 导入课程包只能粘贴 JSON 文本，还不能直接选文件（要加文件选择的依赖）
