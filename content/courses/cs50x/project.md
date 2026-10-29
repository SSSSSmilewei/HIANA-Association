# 期末项目

这门课程的高潮是它的期末项目。期末项目是你把新近掌握的编程本领拿出来一试身手的机会，你要开发属于你自己的软件。只要你的项目运用了本课程所学的内容，项目的性质完全由你决定。你可以用任何语言来实现项目，也可以使用 CS50 Codespace 之外的基础设施。我们只要求你做出你感兴趣的东西，解决一个真实的问题，对你的社区产生影响，或者改变世界。努力做出能比这门课程活得更久的东西。

由于软件开发很少是一个人的工作，这次期末项目允许你与一两位同学合作。不用说，这样的小组里每位同学都应当对项目的设计与实现做出同等的贡献。此外，两人或三人小组的项目规模，应当分别是一般单人项目的两倍或三倍。要知道，单人项目所需的时间和精力，也应当多于课程中每个习题集所需的。

> 请注意，CS50 的教学团队会审查 CS50x 的提交，包括这次期末项目。被发现违反[学术诚信政策](https://cs50.harvard.edu/x/syllabus/#academic-honesty)的学生将被移出课程，并且失去获得证书的资格。已经完成 CS50x 的学生如果被发现违规，其 CS50 证书（以及 edX 证书，如适用）将被撤销。

## 点子

- 使用 JavaScript、Python 和 SQL 的 Web 应用
- 使用 Swift 的 iOS 应用
- 使用 Lua 和 LÖVE 的游戏
- 使用 Java 的 Android 应用
- 使用 JavaScript 的 Chrome 扩展
- 使用 C 的命令行程序
- 需要你为某个设备编程的硬件应用
- ……

## 开始

做出一整个项目可能看上去让人望而生畏。开始时，你应该想一想这些问题：

- 你的软件会做什么？它会有哪些功能？它如何运行？
- 你需要学习哪些新技能？需要研究哪些主题？
- 如果与一两位同学合作，谁负责什么？
- 在软件的世界里，几乎所有事情都比你预想的更耗时。所以，在固定的时间内完成的比你期望的少，并不罕见。你认为你的项目怎样算好的结果？更好的结果？最好的结果？

可以考虑设定阶段性目标，让自己保持在正轨上。

如果使用 CS50 Codespace，请创建一个名为 `project` 的目录，用来存放项目的源代码和其他文件。你也可以在 CS50 Codespace 之外开发你的项目。

> 对于你的期末项目（并且只有期末项目！），使用 CS50 自己的软件之外的 AI 软件（例如 ChatGPT、GitHub Copilot、Bing Chat 等）是合理的，但作品的核心必须仍然出自你自己。你已经学得足够多，可以把这类工具当作帮手来使用。要把这些工具当作放大你生产力的东西，而不是取代它。但你仍然必须在代码的注释中注明对这类工具的任何使用。

## 如何提交

> <strong>你必须在 [2027-06-30T23:59:00+00:00](https://time.cs50.io/20270630T235900Z) 之前完成全部三个步骤！</strong>

#### 第 1 步（共 3 步）

制作一段简短的视频（不超过 3 分钟），向全世界介绍你的项目。视频<strong>必须</strong>以一个开场部分开始，显示：

- 你的项目标题；
- 你的姓名；
- 你的 GitHub 和 edX 用户名；
- 你所在的城市和国家；
- 以及你录制这段视频的日期。

之后应当演示你的项目实际运行的样子，可以使用幻灯片、截图、配音和/或实拍。关于如何制作“屏幕录像（screencast）”，可参见 [howtogeek.com/205742/how-to-record-your-windows-mac-linux-android-or-ios-screen](https://www.howtogeek.com/205742/how-to-record-your-windows-mac-linux-android-or-ios-screen/) 中的建议，当然你也可以使用真正的摄像机。把视频上传到 YouTube（如果你所在的国家被屏蔽，可以用类似的网站），并记下它的 URL；可以把它设为“不公开列出（unlisted）”，但不要设为“私享（private）”。

提交[这份表单](https://forms.cs50.io/65ba090e-aba1-41de-a8f3-13f7701f399b)！

#### 第 2 步（共 3 步）

在你的 `project` 文件夹中创建一个文本文件 `README.md`（名字必须完全一致！），用来说明你的项目。这个文件应包含项目标题、视频的 URL（在上面第 1 步中创建）以及项目的描述。你可以用下面的模板。

```
# YOUR PROJECT TITLE
#### Video Demo:  <URL HERE>
#### Description:
TODO
```

如果你不熟悉 Markdown 语法，GitHub 的[基本写作和格式语法](https://docs.github.com/en/free-pro-team@latest/github/writing-on-github/basic-writing-and-formatting-syntax)可能对你有帮助。你也可以点击“预览”图标来预览你的 `.md` 文件，具体见：[Markdown Preview in vscode](https://code.visualstudio.com/docs/languages/markdown#_markdown-preview)。标准的软件项目 `README` 动辄长达数千甚至数万字；你的不必那么长，但至少应有几百字，把各方面描述详细！

> 你的 `README.md` 文件至少应有多个段落，应当说明你的项目是什么、你为项目编写的每个文件包含什么、起什么作用，并且如果你曾在某些设计选择之间反复斟酌，还要解释你为什么这样选择。请确保留出足够的时间和精力，写一份把项目记录得足够透彻的 `README.md`。为它感到自豪吧！一份 750 字左右的 `README.md` 大概足以描述你的项目及其功能的方方面面。如果达不到这个字数，那很可能说明你的项目不够复杂。

在你的 `project` 目录（或包含 `README.md` 文件和项目代码的任何目录，代码也必须一并提交）中执行下面的 `submit50` 命令，并在提示时用你的 GitHub 用户名和密码登录。出于安全考虑，你输入密码时看到的将是星号，而不是实际字符。

```
submit50 cs50/problems/2026/x/project
```

<details markdown="1"><summary>提交遇到问题？</summary>

如果因为项目太大而遇到问题，可以尝试把该目录中的所有内容（`README.md` 除外）打成 ZIP 压缩包，然后提交压缩包。如果仍然太大，可以尝试删除某些配置文件，把提交的大小缩减到 100MB 以下，或者尝试[通过 GitHub 的网页界面](https://docs.github.com/en/free-pro-team@latest/github/managing-files-in-a-repository/adding-a-file-to-a-repository)直接上传：访问 [github.com/me50/USERNAME](https://github.com/me50/USERNAME)（其中 `USERNAME` 是你自己的 GitHub 用户名），手动拖放文件夹，并确保上传到你的 `cs50/problems/2026/x/project` 分支，否则系统将无法检查！

</details>

#### 第 3 步（共 3 步）

提交几分钟后，务必访问你的成绩册 [cs50.me/cs50x](https://cs50.me/cs50x)。只有加载你的成绩册，系统才能检查你是否已完成课程；这也会触发免费 CS50 证书的（即时）生成，以及 edX 认证证书的（30 天内）生成，前提是你已完成所有其他作业。请务必在 [2027-06-30T23:59:00+00:00](https://time.cs50.io/20270630T235900Z) 之前领取你的免费证书（点击成绩册顶部的链接）。

> 不要跳过上面这一步！只有完成上述操作并看到表示你已完成课程的绿色横幅，课程才算完成。如果你没有在 [2027-06-30T23:59:00+00:00](https://time.cs50.io/20270630T235900Z) 之前完成上述操作，你在课程中的状态将适用常见问题中的[结转规则](https://cs50.harvard.edu/x/faqs/#deadlines)。该日期当天及之后，教学团队不会因为你漏掉这一步而做任何人工更正！

就这样！你的项目应该在几分钟内评分完毕。如果你在成绩册中没有看到任何结果，最好重新提交（再次运行上面的 `submit50` 命令），这次只提交你的 README.md 文件。不需要重新提交表单。

这就是 CS50x！
