# AGENTS.md · 给接手的人和 AI 看的工作说明

这个仓库是海纳协会（智慧算法网络协会，简称 INAA）的学习平台：网站（Cloudflare Workers + D1 + React）和学员端手机 App（Flutter + flutter_miuix）。
功能介绍和部署见 [README.md](README.md)。这份文件记录**工作约定、已经做完的事、还没做的事**。最后更新：2026-11-06（App 0.5.0：网页端功能全部移植到 App 之后）。

## 工作约定（必须遵守）

- 回复和文案一律用简体中文。
- 求稳：宁可少做，不要把线上弄坏。
- **不经同意不部署。** `main` 分支连着 Cloudflare 自动构建，推到 `main` 就等于上线，所以改动先推到别的分支，等负责人确认再合并。
- 不经同意不提交、不推送。
- App 里禁止用 Material 控件（`app/tool/check_no_material.sh` 会检查），统一用 flutter_miuix 和 `app/lib/widgets/ui.dart` 里的组件。
- **不要对整个 `app/lib` 跑 `dart format`**：原来的代码不是这个工具排的版，跑一次会把所有文件重新排版，对比记录全乱。只格式化自己改过的文件。
- 改了 `src/shared/package.ts`（课程包格式）或 `src/shared/blockSchema.ts`（知识块格式）后，要跑 `npx tsx scripts/schema.ts` 重新生成 `content/schema/` 下的 JSON Schema（测试会检查）。
- 课程内容改在 `content/courses/<slug>/`，不要改构建产物。
- 发布前的检查：`npm test`、`npx tsc --noEmit -p .`、`npm run build`；App：`flutter analyze`、`flutter test`、`bash tool/check_no_material.sh`。

## 已经做完的

### 课程（导学）
- 统一的课程包格式 `hiana-course@1`：基本信息、中文介绍（爱好者写的）、官方介绍中文翻译、分组资源链接、模块 → 条目（讲义 / 阅读 / 视频 / 作业 / 实验 / 项目 / 测验 / 考试）→ 正文、视频、正式提交地址、练手题。
- 118 门课按分类浏览；“CSDIY 的一切”一门课收齐 csdiy 的前言、使用指南、学习规划、必学工具、书单、后记。
- 89 门课补了官方介绍的中文翻译（由 AI 子任务抓取翻译，**未逐门人工核对**）。
- CS50x、Missing Semester 2026、Missing Semester 2020 全文在站内，每个条目都有练手题，共 342 道。
- 练手题在浏览器里判：选择、填空、代码（Python 用 Pyodide，SQL 用 sql.js，JavaScript）；做对记进热力图。
- 导入 / 导出课程包；任何人都能导入到自己设备上学，管理员能发布给所有人；`/courses/format` 有格式说明和给 AI 用的整理提示词。
- 进度按条目记；没有条目的课手动标记学完。

### 知识块（2026-10-29）
- 格式 `hiana-block@1`（`src/shared/blocks.ts` 计算，`blockSchema.ts` 校验），源文件 `content/blocks/`，构建时补上课程名和课时（`scripts/blocks.mjs`），引用不存在的课或条目会构建失败。
- 四个：新手、人工智能、嵌入式、考研。网页 `/blocks/<slug>`（宽屏导图、手机大纲树），课程页和首页有卡片；App 课程页有卡片和大纲页。
- 课程格式补了三处：模块 `group`（单元）、条目类型 `section`（讨论课）、条目 `optional`（选学）；练手题 `origin`（official / review）。

### 账号
- 邀请码注册、管理员可关闭注册；重置码找回密码；改密码后其他设备退出。
- 校内 / 校外两种账号：
  - 校内：学号登录，能签到。
  - 校外：用户名或邮箱登录，不签到，看不到成员真名，能报名比赛，能被设为管理员。
  - 邀请码分类型，用错了类型会提示。
  - 邮箱暂时不验证。
- 游客能看首页、课程、公告。

### 管理
- 晚自习签到（默认周一、二、四 19:00–20:40，可在后台改）和场地签到，签到签退都要拍照；现场口令防代签；按日期导出 CSV；“最近没动静”名单。
- 签到时手写签名（网页和 App 都有；旧版 App 签的没有签名，接口不强制）。
- 给学校的签到表 `/admin/report`：汇总、每次的照片和签名、晚自习未签到名单，可打印 / 存 PDF。
- 热力图第一行改成“协会学习时长”（分钟），规则在 `attendanceMinutes`。

### 新生任务（2026-11-04）
- 首页最上方是「新生任务」卡片，`/start` 列出三项任务：阅读前言（CSDIY 前言、《我的一些小想法》），完成 CS50x 并取得证书，学习 Across the Deep Sea。
- CS50x 证书：学员在 `/start` 提交证书链接，管理员在「今日签到」页的「待确认的 CS50x 证书」通过或退回（`src/worker/api/start.ts`，表 `certificates`）。
- Across the Deep Sea 是站内课 `content/courses/across-the-deep-sea/`，《我的一些小想法》在 `preface.md`（写给同学的一段话，署负责人的名字，不强调身份；现在是占位）；「竞赛」「专题」两个模块是空的，标「筹备中」。
- 界面文案用正式的书面语完整描述，不写口语，不压缩成极简短语；介绍课程时写全称并附中文翻译（负责人 2026-11-04 明确要求）。

### 规划
- 负责人的 CourseTable 负责课表 / 里课表 / 早晚一分钟。平台这边：课程页“加到里课表”，把没学完的条目复制成卡片（`planCards`），在 CourseTable 里粘贴。

### 交流
- 公告与比赛卡：比赛描述、官方文档、群聊、报名组队、阅读确认。
- 蓝色钉子（照 Math-Teach-Job）：表 `pins` / `pin_messages` / `pin_votes`（v10），接口 `src/worker/api/pins.ts`，网页 `components/Pins.tsx`、后台 `/admin/pins`。钉在讲义段落（列表按每一条）或练手题上，开头文字用来在改版后重新定位。游客能看，登录能钉、回复、“我也想问”；新问题走微信通知。App 里长按讲义段落或练手题就能钉（位置标记和网页同一套规则，见 `app/lib/widgets/markdown_view.dart`）。
- Agent：钉子上“请 AI 回答”（`/api/pins/:id/ai`），默认智谱 GLM-4-Flash，要在 Cloudflare 填 `AI_API_KEY` 才启用；每人每天 20 次、每颗钉子 3 次。

### 协会介绍与招新报名（2026-11-01）
- 开场动画是独立静态页：源文件 `intro/src/`，用 `intro/build.py` 打包成 `public/intro/index.html`（**打包结果要提交**，Cloudflare 构建环境没有 Python），流程见 `intro/README.md`。
- 三个入口：游客第一次打开 `/` 自动跳 `/intro/`（`localStorage` 的 `hiana.intro.seen`，只跳一次，读写出错当作看过了，登录的成员不跳）；协会页「打开协会介绍」→ `/intro/?view=map&from=/about`；首页「协会介绍与学生成就」→ `/intro/?view=map`。
- 演示版的假首页（`#site`）删掉了；「直接进入平台」「回到平台」「进入海纳协会」跳到真网站（`from` 只认站内路径）。
- 报名表接真实接口：`POST /api/applications`（服务器重新校验、蜜罐、每个 IP 每小时 10 次、同一学号覆盖、新报名发微信通知但不带手机号和 QQ），`GET /api/applications/status`（招新开关）。收起时草稿存 `localStorage`，提交成功后清掉。已登录成员和招新关闭时不显示「新生报名」。
- 表 `applications`、`application_hits`（v11）；管理员接口 `src/worker/api/applications.ts`；后台 `/admin/applications`（导航栏显示新报名数量）；招新开关存在 `settings` 的 `applications_open` / `applications_closed_message`。
- 测试 `tests/applications.test.ts`。本地开发服务器 `scripts/dev.ts` 改成和 Cloudflare 一样，目录先找里面的 `index.html`（否则 `/intro/` 会被网站吞掉）。

### 协会页（2026-11-04）
- `/about` 照「海纳协会新生介绍书」重写成长海报（`pages/About.tsx`、`styles/about.css`，只在 `.hn` 里生效，固定深海蓝，不跟皮肤走，不从外网加载字体）。
- `/about` 是**独立整页**：`App.tsx` 里不套 `Shell`（没有侧边栏和底栏），页面自己有吸顶的顶栏（HI·NA 回首页、「回到平台」、「协会介绍」）。在这一页时根元素底色设成深海蓝，离开时还原。
- 页面上的报名入口都是「播放协会介绍」→ `/intro/?from=/about`（从头播，结尾是报名表）；「直接看地图」→ `/intro/?view=map&from=/about`。`/honors` 仍跳到 `/about#honors`。
- 开场动画各站的详细介绍按负责人的培养方案文档补充过；获奖汇总用学校统计（2020.10—2026.6，国家级 12、省级 82、合计 94）。
- 从开场动画点「进入平台」：跳转时有接力过渡（白屏接住 → 揭开平台），只在从动画过来的那一次播，平时不播。做法见 `intro/README.md`。
- 开场动画掉帧已修：两张画布按 1 倍分辨率画（原来三倍屏上每帧画 9 倍像素）。
- 本地装依赖：锁文件里的地址是 `registry.npmmirror.com`，云端容器连不上时用 `npm ci --registry=https://registry.npmjs.org/ --replace-registry-host=registry.npmmirror.com`。

### 外观
- 两套皮肤：液态玻璃、经典直角。经典直角的结构线条用墨色，强调色只给主操作和当前状态，动效只回应操作。
- 七级字号阶梯（13 / 14 / 15 / 16 / 18 / 22 / 28），11 套配色可导入，默认更纱黑体。
- 名字已改成“海纳协会”（副标题“智慧算法网络协会”）。

### App
- 与网站同步：课程分类、课程页（介绍与资源 / 课程内容）、条目页（选择和填空题原生作答，代码题跳网页）、校内 / 校外账号、协会介绍。
- **版本号改成 0.x.x（内测）**：App 1.3.1+5 → 0.4.0+6，构建号只能往上加。服务器 `/api/app/version` 对不带 `?scheme=0` 的旧版 1.x 回 `latest: 1.99.0`，让旧版照常提示更新。GitHub 上已有的 `app-v1.3.x` 发行版没改。
- 0.4.0：本地升级（`lib/data/updater.dart`、`lib/widgets/update_dialog.dart`，用 `open_filex` 打开系统安装器，工作流给清单加了 `REQUEST_INSTALL_PACKAGES`）；管理员在「我的」看到「管理员」标记和「管理」一组，用浏览器打开网页后台。
- 协会页加了「打开协会介绍」，用系统浏览器打开 `/intro/?view=map`（还没发版，跟下一版一起出）。
- **0.5.0（2026-11-06，网页端功能全部移植到 App）**：
  - 学员：新生任务（首页卡片 + 页面，CS50x 证书提交）、登录后的公告阅读确认弹窗、首页称呼、长按讲义段落 / 练手题钉问题（段落右侧蓝点是已有的钉子；撤回问题、删除自己的回复）、导入课程包到本机（粘贴 JSON，进度存在手机上）、复制课程包。
  - 管理员（「我的 → 管理」，原生页面，不再跳浏览器）：今日签到与证书确认（照片、现场口令开关、通过 / 退回证书、两周没动静、导出给学校）、成员与邀请码（重置码、设为管理员、停用、生成 / 作废邀请码）、新生报名（筛选、搜索、改状态、备注、删除、开关招新、导出 CSV）、蓝色钉子收件箱、公告与比赛（发布、编辑、删除、插入图片）、设置与课程包（晚自习规则、开学日期、注册开关、App 版本、发布 / 撤下课程包）。
  - 内嵌网页（`lib/features/web/web_page.dart`，令牌写进 `hiana_s` Cookie，网页就是登录状态；`stayPrefix` 限定只在那一页，点网页导航就回到 App）：代码题、协会介绍动画、签到表、课程包格式说明。CSV 下载后交给系统的表格软件打开。
  - 外观（「我的 → 外观」，`lib/features/profile/appearance_page.dart`）：网页的 12 套配色（默认 shanmoew-mizu，与网页一致；原来的橙色是「海纳橙」），7 个基色按 palettes.css 的规则推导（`lib/app/palettes.dart`、`Hx.derive`）；导入配色（粘贴或选文件，格式同网页：HIANA JSON、base16、VS Code、CSS 变量）、复制当前配色；导入正文 / 代码字体（TTF、OTF，选文件或填网址）；字号四档。设置存在手机上（`lib/data/look.dart`），启动前读好，不闪。
  - 掉帧（2026-11-06）：四个标签页保活（切换时不重建；原来手指按着时页面被销毁，下拉刷新组件会报错）；讲义正文按块放进列表，只构建看得到的部分，解析结果缓存；“进行中”小红点只脉动三次（原来一直动，玻璃标签栏的模糊每帧重算）；图片按显示尺寸解码。帧耗时检查：`integration_test/scroll_perf_test.dart`（用法见文件开头）。
  - 依赖新增 `webview_flutter`、`file_picker`。本地 `flutter create` 生成的 `app/android/` 等已加进 `.gitignore`。
  - 调试：在本机安卓模拟器（`--dart-define=HIANA_API=http://10.0.2.2:8787` 连本地后端）逐页点过一遍。这台电脑上模拟器只有开窗口、`-gpu host` 时能稳定启动，无窗口模式会段错误。
- 0.3.0（原来叫 1.3.0）：知识块、签到手写签名、本页的钉子（看、回复、我也想问、请 AI 回答）、加到里课表、题目出处标签、单元分组和选学标记。

## 还没做的 / 待确认

### 负责人已确认（2026-10-29）
1. ✅ 协会全称是**智慧算法网络协会**（简称 INAA，也叫海纳协会；2026-10-31 确认，网站、App、README 已改）。
2. 知识块：一个方向的思维导图，把很多门课收在一起，比如新手、考研、人工智能、嵌入式。
3. 热力图 = 在协会的学习时长（签到到签退）+ 其他平台的热力图。现在按“事件次数”算，要改成按时长。
4. 签到要有照片和**手写签名**，导出表格，主要给学校看，方便晚自习请假。
5. 蓝色钉子：游客能看，评论要账号，Agent 的回答也留在讨论里。
6. 练手题优先从**官方作业**改编（CS50x 的习题集很好）；官方没有的课再出复习题。
7. 规划（表课表 / 里课表 / 拖拽 / 自动排 / 早晚一分钟）已经在负责人自己的仓库 [course-table](https://github.com/SSSSSmilewei/course-table)（Flutter，本地优先）里做了，平台这边做对接，不重做。

### 功能缺口（对照 2026-10-22 的方案）
| 方案里的点 | 现状 |
|---|---|
| 规划：导入课程表、“表课程表”和“理课程表”、拖拽安排 | ✅ 在 CourseTable 里；平台能复制卡片过去。以后可以做双向同步（CourseTable 里完成的卡片回写进度） |
| 主页：课程表（计划安排）、知识块 | ⚠️ 知识块有了；课程表在 CourseTable |
| 交流：蓝色钉子（在讲义上钉问题，和 Agent、同学讨论） | ✅ 网页和 App 都完整（App 长按段落钉） |
| 规划：早晚 1 分钟总结（冥想界面、推送） | ➡️ course-table 里有；平台有 `/api/reflections` 接口，可以同步过来 |
| 报告心得分享到朋友圈、QQ 空间、GitHub | ❌ |
| Agent | ⚠️ 只用在蓝色钉子上；还没填 `AI_API_KEY`。出题、优化心得等以后再加 |
| 练手题从官方作业出 | ⚠️ CS50x 作业题本来就是官方改编；Missing Semester 两版的题还是自编复习题，官方每讲有 Exercises，待改编 |
| 课程目录卡片上的“多少讲、多少作业、多少课时”概括 | ⚠️ 只显示条目数和学时 |
| 签到报表导成 Excel（带图片） | ⚠️ 现在是可打印的网页 + 纯文字 CSV |
| 课程 tags | ⚠️ 全部为空 |
| 官方书籍的文本放进站内 | ❌ 只有链接，开放许可的书要查许可 |
| 选课页的欢迎语 | ⚠️ 只在首页 |
| 邮箱验证、自助找回密码 | ❌ 需要先接发信服务 |
| APK 本地打包 | ✅ `cd app && flutter create . --org win.shanmoew --project-name hiana_app --platforms=android` 生成后就能 `flutter build apk`（生成的目录不进仓库） |

### 调研结论（2026-10-29，详见当天对话）
1. 课程官网：CS50x（周 → 讲座 / Section / Shorts / 习题集）、CS61A（讲座 / 讨论 / Lab / 作业 / 项目 / 往年考试）、MIT 18.01SC（单元 → 部分 → 节）。格式已补 group / section / optional。
2. 规划巧思：每日规划仪式、今日最重要的一件事、45 分钟上课铃专注、周回顾（拖延 3 次以上的卡片提示拆小）、错题间隔重复、估时校准。建议加进 CourseTable。
3. 课表导入：保持易班 xls，再支持 ICS 和 WakeUp 的 `.wakeup_schedule`；“真正一键”是内嵌网页登录教务后解析（小爱课程表的做法）。
4. 免费 AI：智谱 GLM-4.7-Flash / GLM-4-Flash 永久免费（首选）；Workers AI 每天 1 万 Neurons（备用）；硅基流动小模型免费；Gemini 免费层不稳且地区受限；OpenRouter 免费每天 50 次。
5. 推送：早晚一分钟用 App 本地通知（CourseTable 已有）；服务器消息用 WxPusher；安卓 Web Push 在国内不可用。
6. 分享：微信 / QQ 官方 SDK 要登记应用（部分能力 300 元认证），不划算；用分享图片 + 系统分享菜单；GitHub 用令牌把心得提交到自己的仓库。
7. 蓝色钉子：照 Math-Teach-Job 做了。

### 建议顺序（下一轮）
1. 负责人在 Cloudflare 填 `AI_API_KEY`（智谱），试用“请 AI 回答”。
2. Missing Semester 两版的练手题改成官方 Exercises 改编。
3. ✅ App 里在正文上钉问题（长按段落，0.5.0 已做）。
4. CourseTable 双向同步（完成的里课卡片回写平台进度和热力图）。
5. 早晚一分钟的心得分享（分享图片、提交到 GitHub）。

### 协会介绍与招新：待负责人决定（2026-11-01）
- `src/shared/association.ts` 的部门已改成和开场动画一致：综合网络部、项目部、算法部、宣传设计部（2026-11-04）。指导老师熊芳、余力（2026-11-01）。
- 报名草稿存在浏览器的 `localStorage` 里（含手机号、QQ），在公用电脑上填了一半不交，要点「擦掉」才会清掉。
- `intro/demo.html` 是接入前的演示版，只留作对照；确认不需要后可以删。
- 手机网页上管理员的底栏多了「管理」（以前手机上没有任何后台入口，侧边栏在手机上是藏起来的）；「我的」页也有「管理后台」按钮。进了后台底栏有 7 项（学习 + 6 个管理页），320 宽的屏幕上比较挤。

### 已知的小问题
- 已修（2026-11-06）：网页上 CSDIY 的一切、Across the Deep Sea 的讲义页白屏——这两门课的 course.json 省略了空的 `practice`，讲义页读 `practice.length` 报错。现在 `src/client/library.ts` 的 `withDefaults` 在加载课程包时补齐空数组（测试 `tests/packages.test.ts`）。
- 以前选过 git、vim 这类工具课的成员，这些选课不再显示（工具课并进了“CSDIY 的一切”）。
- 旧版 App（1.x，现在的 0.x 之前）：校内同学能照常用；校外同学要更新 App。
- 本地 `.staging/`（不进仓库）里有内容生成的中间文件、旧讲义目录 `old/lessons` 和截图工具，确认不用后可以删。
