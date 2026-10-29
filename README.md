# 海纳协会 · 学习平台

海纳协会（智慧网络算法协会）的学习平台，网址是 <https://study.shanmoew-denied.win>。四件事：

- **导学**：选课一样挑课，课程介绍、资源、讲义、练手题都在站内。
- **管理**：晚自习和场地签到，拍照为证。
- **交流**：公告、比赛报名组队。
- **规划**：还在做。

网站跑在 Cloudflare Workers + D1 上，另有学员端手机 App（`app/`）。

> 做到哪了、还差什么、接手要遵守的约定，见 [AGENTS.md](AGENTS.md)。

## 功能

### 课程
- 118 门课，按分类浏览、搜索。目录和介绍来自 [csdiy.wiki](https://csdiy.wiki/)，大部分课补了官方介绍的中文翻译。
- “CSDIY 的一切”：csdiy 的前言、使用指南、学习规划、必学工具、书单，合成一门课，适合入门前先读。
- 站内全文：CS50x（0–10 周讲义、AI 专题、全部习题、期末项目）、Missing Semester 2026 / 2020，都是中文，每个条目都有练手题。
- 练手题在浏览器里判：选择、填空、代码（Python、SQL、JavaScript）。作业和实验最后仍按原课程要求，在 GitHub、submit50 等处提交。
- 进度按条目记，完成的条目和做对的题计入热力图。
- **课程包**：每门课是一个 JSON 文件（格式 `hiana-course@1`）。
  - 谁都能导入到自己设备上学，管理员可以发布给所有人，每门课都能导出。
  - `/courses/format` 有格式说明、示例，以及给 AI 用的整理提示词：把一门公开课的资料交给 AI，整理成课程包就能学。

### 账号
- 注册要邀请码（管理员在后台生成，一次性，可设有效期）。
- **校内账号**：学号 + 真名，学号登录，能签到。
- **校外账号**：用户名 + 昵称，邮箱、学校/单位选填，用户名或邮箱登录。不签到，看不到成员真名，能报名比赛，能被设为管理员。
- 忘记密码：管理员生成重置码，在登录页设新密码。改密码后其他设备自动退出。
- 不登录也能看首页、课程、公告。

### 签到与管理
- 晚自习签到：默认周一、二、四 19:00–20:40，后台可改；可开“现场口令”防代签。
- 场地签到：平时用场地时签到、签退，都要拍照。
- 管理后台（`/admin`）：今日签到和照片、成员管理、邀请码、按日期导出签到表（CSV）、最近没动静的成员。

### 公告与比赛
- 比赛描述、官方文档、群聊信息、报名组队、重要公告的阅读确认。

### 热力图
站内学习记录，加上绑定的外部平台（GitHub、Codeforces、力扣、AtCoder、墨墨背单词等），每晚自动同步。

### 外观
- 两套风格：液态玻璃、经典直角；深浅色跟随系统。
- 11 套配色，也能导入 base16、VS Code 主题等。
- 默认字体更纱黑体，可以换。

## 手机 App

`app/` 是 Flutter 写的学员端（HyperOS 风格），说明见 [app/README.md](app/README.md)。改动推到 `main` 后，GitHub Actions 自动打包 APK 并发布到 Releases。

App 和网站共用接口，另外用到：

- 请求头带 `X-Hiana-Client: app` 时，登录接口在返回体里给 `token`，之后用 `Authorization: Bearer <token>`。
- `GET /learn/<课>/course.json`、`GET /learn/<课>/<页>.md`：课程包和讲义原文（发布的课程包走 `GET /api/packages/<课>`）。
- `GET /api/association`：协会介绍和学生成就。
- `GET /api/app/version`：检查更新。

## 本地开发

```bash
npm install
npm run dev:bun     # 构建前端，用 bun:sqlite 模拟 D1，http://localhost:8787
npm test            # bun test
npx tsc --noEmit -p .
npm run build
```

App：

```bash
cd app
flutter test
flutter analyze
bash tool/check_no_material.sh
```

## 目录

```
content/courses/<slug>/   课程源文件：course.json（正文留空）+ 每页一个 .md；顺序在 order.json
content/schema/           课程包 JSON Schema（由 scripts/schema.ts 生成）
scripts/build.mjs         构建：前端打包、课程目录、课程包、讲义
src/shared/               前后端共用：课程包格式（package.ts）、课程目录（courses.ts、light.ts）、热力图
src/worker/               接口：账号、签到、课程、公告、热力图；db.ts 是数据库结构（启动时自动迁移）
src/client/               网页（React）；practice/ 是练手题判题，styles/ 是设计变量和两套皮肤
app/                      手机 App（Flutter）
tests/                    bun test
```

## 部署

`main` 分支连着 Cloudflare 自动构建（构建命令 `npm install && npm run build`，部署命令 `npx wrangler deploy`），**推到 `main` 就会上线**。

Worker 的密钥（Cloudflare → Workers → 设置 → 变量和机密）：

| 名称 | 作用 |
|---|---|
| `FIRST_ADMIN_CODE` | 系统里还没有管理员时，学号 `254030411` 用它代替邀请码注册成管理员 |
| `GITHUB_TOKEN` | 热力图读 GitHub 贡献日历 |
| `AI_API_KEY` | 以后的 Agent 用 |
| `WXPUSHER_SPT` | 微信通知 |

`SESSION_SECRET` 不用填，第一次访问时自动生成。

## 许可

代码使用 MIT 许可。课程内容：

- 课程目录与介绍：[csdiy.wiki](https://github.com/PKUFlyingPig/cs-self-learning)，MIT 许可。
- CS50x 讲义与习题：© Harvard CS50，CC BY-NC-SA 4.0；中文翻译同协议。
- Missing Semester：© MIT，CC BY-NC-SA 4.0；中文翻译与习题解答来自 [missing-semester-cn](https://github.com/missing-semester-cn)，同协议。
- 更纱黑体 [Sarasa Gothic](https://github.com/be5invis/Sarasa-Gothic)：SIL OFL 1.1。

非商业使用，仅供协会学习。
