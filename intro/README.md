# 开场动画 / 协会介绍

小螃蟹沿着地图讲完 13 站，最后停在结尾面板（「新生报名」「直接进入平台」）。网站上的地址是 `/intro/`。

| 文件 | 说明 |
|---|---|
| `src/app.js` | 全部脚本（原生 JS，没有依赖）：地图、台词、详细介绍、报名表、接网站 |
| `src/style.css` | 样式（开头是 `<meta>` 和 `<title>`，打包时原样放在最前面） |
| `src/body.html` | 页面结构（报名表、结尾面板等） |
| `build.py` | 把上面三个文件拼成一个独立 HTML，并内联字体 |
| `fonts/` | 像素字 Fusion Pixel 12px（SIL OFL 1.1，授权文件 `Fusion-Pixel-LICENSE.txt` 要一起保留） |
| `demo.html` | 接入之前的演示版（假首页、报名表不发送），只留作对照，网站不用它 |
| `全部文案.md` | 全部文案（ver. 0.15），以它为准；动画里的台词和文字介绍不要自己改 |

## 改了以后怎么发布

Cloudflare 自动构建的环境里没有 Python，所以**打包好的 `public/intro/index.html` 要提交进仓库**。改了 `src/` 里任何一个文件，都要在本地重新打包：

```bash
pip install fonttools brotli          # 第一次
python3 intro/build.py public/intro/index.html
npm run build                         # scripts/build.mjs 会把 public/ 原样复制到 dist/client
```

然后把 `intro/src/` 和 `public/intro/index.html` 一起提交。

- 像素字整套内联（约 600 KB），终端和刷题记录用的更纱黑体从 `public/fonts/sarasa` 里按用到的字切子集，整页约 1 MB。**不要把字体拆出去，也不要从外网加载任何资源**（国内访问不稳定）。
- 打包出来的字体二进制和别人机器上的可能有几个字节不同（fonttools 版本不同），不影响显示。

## 三种用法

| 地址 | 用途 |
|---|---|
| `/intro/` | 游客第一次打开首页时自动跳过来（只跳一次，见 `src/client/intro.ts`），从头播开场 |
| `/intro/?view=map&from=/about` | 协会页的「打开协会介绍」：不播开场，直接是看完一遍之后的地图；「回到平台」回到 `from`（只认站内路径，没有就回首页） |
| `/intro/?view=map` | 首页「协会介绍与学生成就」、App 的「打开协会介绍」 |

## 和网站接的地方

- **localStorage**：`hiana.intro.seen`（来过这一页，首页不再自动跳；和 `src/client/intro.ts` 一致）、`hiana.intro.draft`（报名表收起时的草稿，提交成功后清掉）。读写都包了 `try/catch`，隐私模式下当作看过了。
- **接口**：
  - `GET /api/auth/me`：已登录的成员不显示「新生报名」。
  - `GET /api/applications/status`：招新关闭时不显示「新生报名」，面板上写关闭的提示语。
  - `POST /api/applications`：提交报名，服务器会再校验一遍；同一学号再交一次是覆盖上一次。
- **进入平台**：「直接进入平台」「回到平台」「进入海纳协会」都会让按钮（或报名表）铺满整屏，然后 `location.href` 跳到网站。原来演示用的假首页（`#site`）已经删掉了。
- 报名表里有一个看不见的蜜罐输入框 `#f-website`，有值的提交服务器会假装收下、但不入库。
