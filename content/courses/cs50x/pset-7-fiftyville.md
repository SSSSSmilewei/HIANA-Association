# Fiftyville

## 要解决的问题

CS50 小鸭被偷了！Fiftyville 镇请你来解开小鸭失窃之谜。当局认为，窃贼偷走小鸭后不久，就在同伙的帮助下搭乘航班离开了小镇。你的目标是查明：

- 窃贼是谁，
- 窃贼逃到了哪座城市，以及
- 帮助窃贼逃走的同伙是谁

你所知道的只有：盗窃案<strong>发生在 2025 年 7 月 28 日</strong>，并且<strong>发生在 Humphrey Street</strong>。

你打算怎样解开这个谜团呢？Fiftyville 当局收集了案发前后小镇的一些记录，并为你准备了一个 SQLite 数据库 `fiftyville.db`，里面包含小镇各处的数据表。你可以使用 SQL `SELECT` 查询来获取你感兴趣的数据。你的任务是只凭数据库中的信息解开这个谜团。

## 演示

## 开始

这道题会用到 CS50 课程组提供给你的数据库。

<details markdown="1"><summary>下载发行代码</summary>

登录 [cs50.dev](https://cs50.dev/)，点击你的终端窗口，单独执行 `cd`。你应该会发现终端窗口的提示符类似下面这样：

```
$
```

接着执行

```
wget https://cdn.cs50.net/2026/x/psets/7/fiftyville.zip
```

把名为 `fiftyville.zip` 的 ZIP 文件下载到你的 codespace 中。

然后执行

```
unzip fiftyville.zip
```

创建一个名为 `fiftyville` 的文件夹。你不再需要这个 ZIP 文件了，所以可以执行

```
rm fiftyville.zip
```

并在提示时输入“y”后按回车，删除你下载的 ZIP 文件。

现在输入

```
cd fiftyville
```

再按回车，进入（即打开）该目录。你的提示符现在应该类似下面这样。

```
fiftyville/ $
```

单独执行 `ls`，你应该会看到几个文件：

```
answers.txt  fiftyville.db  log.sql
```

如果遇到任何问题，请重新按这些步骤操作一遍，看看能否找出哪里出了错！

</details>

## 要求

对这道题来说，解开谜团的过程与解开谜团本身同样重要。在 `log.sql` 中，记录下你对数据库运行的所有 SQL 查询。在每条查询上方，用注释（在 SQL 中，以 `--` 开头的行就是注释）标明你为什么运行这条查询，和/或你希望从这条查询中得到什么信息。你可以在日志文件中用注释补充记录你解谜时的思考过程：最终，这个文件应当作为你查出窃贼所用过程的证据！

在编写查询的过程中，你可能会发现有些查询会变得相当复杂。为了让查询保持可读，请参考 [sqlstyle.guide](https://www.sqlstyle.guide) 上的良好风格原则。其中的[缩进](https://www.sqlstyle.guide/#indentation)一节可能特别有帮助！

解开谜团之后，补全 `answers.txt` 中的每一行：填入窃贼的姓名、窃贼逃往的城市，以及帮助窃贼逃离小镇的同伙的姓名。（注意不要修改文件中已有的任何文字，也不要往文件里添加其他行！）

最终，你应该同时提交 `log.sql` 和 `answers.txt` 两个文件。

## 讲解视频

<!-- video: YHhgEoJMDnU -->
[▶ 视频](https://www.youtube.com/watch?v=YHhgEoJMDnU)

## 提示

- 执行
  
  sqlite3 fiftyville.db
  
  开始对数据库运行查询。
  
  - 运行 `sqlite3` 时，执行 `.tables` 会列出数据库中的所有表。
  - 运行 `sqlite3` 时，执行 `.schema TABLE_NAME`（其中 `TABLE_NAME` 是数据库中某个表的名字）会显示创建该表所用的 `CREATE TABLE` 命令。这有助于你了解该查询哪些列！
- 你可能会觉得从 `crime_scene_reports` 表开始比较有帮助。先找一份与案发日期和地点相符的案发现场报告。
- 参阅[这份 SQL 关键字参考](https://www.w3schools.com/sql/sql_ref_keywords.asp)，了解一些可能有用的 SQL 语法！

## 如何测试

### 正确性

```
check50 cs50/problems/2026/x/fiftyville
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/fiftyville
```
