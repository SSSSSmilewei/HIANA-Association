# 智慧网络算法协会 · 学习平台

协会的学习辅助站：CS50x 为主线，配开发者素养（Git、命令行、Agent 使用）；学员看本周任务、晚自习打卡、在统一热力图上看到自己在协会平台和各学习平台上的记录；会长在后台管理成员、展示现场口令、导出打卡表格、看谁最近卡住了。

线上地址：<https://study.shanmoew-denied.win>

从 [Math-Teach-Job](https://github.com/SSSSSmilewei/Math-Teach-Job) 的工程骨架改出来，运行在 Cloudflare Workers + D1 上，免费额度足够协会使用。

## 现在有的功能

**学员**
- 首页：本周主线（CS50x 第几周）、路线进度、本周任务、今晚打卡、最近 17 周热力图
- 晚自习打卡：每晚一次；会长可以开启“现场口令”（每天自动换的 4 位数）防止代签。不统计连续天数，没有断签
- 我的热力图：协会平台的学习记录 + 绑定的平台，按“写代码 / 刷题 / 英语”分组；每晚 23:30 自动同步

**会长后台**（`/admin`）
- 今晚的现场口令和到场人数，打卡时间段设置
- 最近 7 天没有任何记录的成员（站内和外部平台都算）
- 从 Excel 粘贴“学号、姓名、班级”导入成员，自动生成口令（只显示一次）；重置口令、停用
- 按日期导出打卡表格（带 BOM 的 CSV，Excel 直接打开）

**热力图支持的平台**

| 平台 | 方式 | 说明 |
|---|---|---|
| GitHub | 官方 GraphQL | 需要在 Worker 设置里填 `GITHUB_TOKEN`（只读公开信息即可） |
| Codeforces | 官方 API | 不需要 key |
| 力扣、LeetCode 国际站 | 网页接口（非官方） | 上线后要实测 |
| AtCoder | 第三方 AtCoder Problems | |
| 墨墨背单词 | 官方开放 API | 学员在 App 里复制令牌；只有当天数据，平台每晚攒历史 |
| 不背单词 | 网页接口（非官方） | 只有最近几天，平台每晚攒历史 |
| 多邻国 | 网页接口（非官方） | 是否需要登录待实测 |
| Gitee、洛谷、扇贝、WakaTime | 暂不支持 | 接口还在测试 |

## 部署

数据库已经建好（`hiana-association-db`，亚太区），`wrangler.jsonc` 里写好了数据库和自定义域名 `study.shanmoew-denied.win`。

### 1. 连接 GitHub 自动构建
Cloudflare → **Workers 和 Pages** → **创建** → **导入存储库** → 选 `SSSSSmilewei/HIANA-Association`，生产分支选 `main`：
- 构建命令：`npm install && npm run build`
- 部署命令：`npx wrangler deploy`

部署时会自动把 `study.shanmoew-denied.win` 绑到这个 Worker（DNS 记录和证书由 Cloudflare 生成）。如果这个子域名已经有一条 CNAME 记录，要先在 DNS 里删掉。

### 2. 设置密钥（可选）
Worker → **设置** → **变量和机密**，类型选“密钥”：

| 名称 | 作用 |
|---|---|
| `ADMIN_PASSWORD` | 会长后台密码。不填时用数据库里存的密码摘要（已经设置好一个） |
| `GITHUB_TOKEN` | 热力图读 GitHub 贡献日历 |
| `AI_API_KEY` | 以后的 Agent 用 |
| `WXPUSHER_SPT` | 微信通知 |

`SESSION_SECRET` 不用填，第一次访问时自动生成并存进数据库。

### 3. 开始使用
打开 `/admin`，用会长密码登录 → 导入成员 → 把口令发给大家。

## 本地开发

```bash
npm install
npm run dev:bun     # 构建前端，用 bun:sqlite 模拟 D1，在 http://localhost:8787 运行
npm test            # bun test：热力图、打卡、成员、接口
npm run typecheck   # 后端类型检查
```

本地可以用环境变量 `HW_ADMIN_PASSWORD`、`HW_SESSION_SECRET` 代替 `.dev.vars`。

## 结构

```
src/
  shared/heatmap.ts      热力图合并与分档（北京时间、周一开头），前后端共用
  worker/
    http.ts              很小的路由层（不依赖框架）
    api.ts               全部接口
    session.ts           签名 Cookie 会话、登录限流
    members.ts           成员导入、口令、没动静名单
    checkin.ts           晚自习打卡、现场口令、导出表格
    activity.ts          站内学习记录
    heatmap/             各平台数据源、同步、存储
    secret-box.ts        学员令牌加密
    db.ts                数据库结构（启动时自动建表）
  client/                React 页面
tests/                   bun test
```

## 许可

代码使用 MIT 许可。课程内容改写自哈佛 CS50x，遵循 CC BY-NC-SA 4.0，仅供协会学习使用。
