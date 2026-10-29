# Homepage

使用 HTML、CSS 和 JavaScript 搭建一个简单的个人主页。

## 背景

互联网成就了许多了不起的事情：我们可以用搜索引擎查询任何想得到的东西，与世界各地的亲朋好友交流，玩游戏，上课，等等。不过，我们访问的几乎所有页面，都建立在三种核心语言之上，每一种的用途略有不同：

1. HTML，即 <em>HyperText Markup Language</em>（超文本标记语言），用来描述网站的内容；
2. CSS，<em>Cascading Style Sheets</em>（层叠样式表），用来描述网站的外观；
3. JavaScript，用来让网站具有交互性和动态效果。

请创建一个简单的主页，介绍你自己、你最喜欢的爱好或课外活动，或者任何你感兴趣的内容。

## 开始

登录 [cs50.dev](https://cs50.dev/)，点击你的终端窗口，单独执行 `cd`。你应该会发现终端窗口的提示符如下所示：

```
$
```

接下来执行

```
wget https://cdn.cs50.net/2026/x/psets/8/homepage.zip
```

以便把名为 `homepage.zip` 的 ZIP 文件下载到你的 codespace 中。

然后执行

```
unzip homepage.zip
```

创建一个名为 `homepage` 的文件夹。你不再需要这个 ZIP 文件了，所以可以执行

```
rm homepage.zip
```

并在提示处输入“y”再按 Enter，删除你下载的 ZIP 文件。

现在输入

```
cd homepage
```

再按 Enter，进入（即打开）该目录。你的提示符现在应该如下所示。

```
homepage/ $
```

单独执行 `ls`，你应该会看到几个文件：

```
index.html  styles.css
```

如果遇到任何问题，请把这些步骤重新做一遍，看看能否找出哪里出了错！你可以在终端窗口中运行

```
http-server
```

立即启动一个服务器来查看你的网站。然后，按住 command 键（Mac）或 control 键（PC）点击出现的第一个链接：

```
http-server running on LINK
```

其中 LINK 是你的服务器的地址。

## 要求

在你的 `homepage` 目录中实现一个网站，它必须：

- 包含至少四个不同的 `.html` 页面，其中至少有一个是 `index.html`（网站的主页面），并且应该可以通过点击一个或多个超链接，从网站的任何一个页面到达任何其他页面。
- 除了 `<html>`、`<head>`、`<body>` 和 `<title>` 之外，至少使用十（10）种不同的 HTML 标签。同一个标签（例如 `<p>`）使用多次，仍然只算这十种中的一（1）种！
- 在网站中集成 Bootstrap 的一项或多项功能。Bootstrap 是一个很流行的库（自带大量 CSS 类等内容），可以用来美化你的网站。请参阅 [Bootstrap 的文档](https://getbootstrap.com/docs/5.3/)入门。尤其是，你可能会对 [Bootstrap 的组件](https://getbootstrap.com/docs/5.3/components/)感兴趣。要把 Bootstrap 添加到你的网站，只需在页面的 `<head>` 中加入
  
  ```
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB" crossorigin="anonymous">
  <script src="https://code.jquery.com/jquery-4.0.0.js" integrity="sha256-9fsHeVnKBvqh3FB2HYu7g2xseAZ5MlN6Kz/qnkASV8U=" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js" integrity="sha384-FKyoEForCGlyvwx9Hj09JcYn3nv7wiPVlz7YYwJrWVcXK/BmnVDxM+D2scQbITxI" crossorigin="anonymous"></script>
  ```
  
  即可。在这几行下面，你还可以加入
  
  ```
  <link href="styles.css" rel="stylesheet">
  ```
  
  来链接你自己的 CSS。
- 至少有一个由你自己创建的样式表文件 `styles.css`，其中使用至少五（5）种不同的 CSS 选择器（例如标签选择器（`example`）、类选择器（`.example`）或 ID 选择器（`#example`）），并且文件中总共使用至少五（5）种不同的 CSS 属性，例如 `font-size` 或 `margin`；并且
- 在网站中集成 JavaScript 的一项或多项功能，让你的网站更具交互性。例如，你可以用 JavaScript 添加弹窗提示、让某个效果按固定间隔重复出现，或者为按钮、下拉菜单或表单增加交互。尽情发挥创意吧！
- 确保你的网站在移动设备以及笔记本电脑和台式机的浏览器上都好看。

你还应该创建一个文本文件 `specification.txt`，列出你用到的 10 个 HTML 标签和 5 个 CSS 属性，并用一句话简要说明你是如何使用 JavaScript 和 Bootstrap 的。

## 测试

如果想在制作过程中查看网站的效果，可以运行 `http-server`。按住 Command 或 Control 键点击 http-server 给出的第一个链接，就会在新标签页中打开你的网页。之后刷新这个标签页，就能看到你最新的改动。

还要记得，在 Google Chrome 中打开开发者工具（Developer Tools）后，点击开发者工具窗口中 <strong>Elements</strong> 左侧的手机形状图标，或者在开发者工具标签页已经打开的情况下，在 PC 上按 `Ctrl`+`Shift`+`M`、在 Mac 上按 `Cmd`+`Shift`+`M`，就可以<em>模拟</em>在移动设备上访问你的页面，而不需要另外用移动设备去访问你的网站！

## 评估

这次作业没有 `check50`！你的网站是否正确，将根据你是否满足上述要求，以及你的 HTML 是否格式良好且有效来评估。为确保你的页面符合这些条件，可以使用这个[标记验证服务（Markup Validation Service）](https://validator.w3.org/#validate_by_input)，把你的 HTML 直接复制粘贴到提供的文本框中。提交之前，请务必消除验证器提示的所有警告和错误！

还请考虑：

- 网站的美观程度是否能让用户直观、轻松地浏览；
- 你的 CSS 是否已经抽取到单独的 CSS 文件中；以及
- 你是否通过从父标签“层叠”样式属性，避免了重复和冗余。

很遗憾，`style50` 不支持 HTML 文件，所以需要你自己把 HTML 标签清晰地缩进、对齐。另外要知道，你可以这样创建 HTML 注释：

```
<!-- Comment goes here -->
```

不过，为 HTML 代码写注释，并不像为 C 或 Python 等语言的代码写注释那样必要。你也可以在 CSS 文件中这样为 CSS 写注释：

```
/* Comment goes here */
```

## 提示

想要系统地了解本题所涉及的这几种语言，可以参考下面这些教程：

- [HTML](https://www.w3schools.com/html/)
- [CSS](https://www.w3schools.com/css/)
- [JavaScript](https://www.w3schools.com/js/)

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/homepage
```
