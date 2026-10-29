# Tideman

## 要解决的问题

你已经了解相对多数选举，它用一个非常简单的算法来决定选举的获胜者：每位选民有一票，得票最多的候选人获胜。

但相对多数投票确实有一些缺点。比如，在一场有三位候选人的选举中，如果投出了下面这些选票，会发生什么？

![Five ballots, tie betweeen Alice and Bob](https://cs50.harvard.edu/x/psets/3/fptp_ballot_1.png)

相对多数投票在这里会宣布 Alice 和 Bob 打平，因为两人各得两票。但这是正确的结果吗？

还有另一种投票制度，叫作排序选择投票制（ranked-choice voting）。在排序选择制中，选民可以投票给不止一位候选人。他们不是只投给自己的首选，而是可以按偏好顺序给候选人排序。这样得到的选票看起来可能像下面这样。

![Five ballots, with ranked preferences](https://cs50.harvard.edu/x/psets/3/ranked_ballot_1.png)

在这里，每位选民除了指明第一偏好的候选人之外，还标明了第二和第三选择。这样一来，原本平局的选举现在可能就有了获胜者。比赛起初是 Alice 和 Bob 平局。但选了 Charlie 的那位选民更喜欢 Alice 而不是 Bob，所以这里可以宣布 Alice 获胜。

排序选择投票还能解决相对多数投票的另一个潜在缺点。看看下面这些选票。

![Nine ballots, with ranked preferences](https://cs50.harvard.edu/x/psets/3/condorcet_1.png)

这场选举应该谁赢？在每位选民只选第一偏好的相对多数投票中，Charlie 以四票获胜，Bob 只有三票，Alice 只有两票。（注意，如果你熟悉即时决选投票制，在那种制度下 Charlie 在这里同样获胜。）然而，Alice 完全可以合理地主张，获胜的应该是她而不是 Charlie：毕竟，在九位选民中，多数（其中五位）更喜欢 Alice 而不是 Charlie，所以大多数人会更乐意让 Alice 而不是 Charlie 当选。

在这场选举中，Alice 就是所谓的“孔多塞获胜者”（Condorcet winner）：即在与任何其他候选人的一对一较量中都会获胜的人。如果这场选举只有 Alice 和 Bob，或者只有 Alice 和 Charlie，Alice 都会获胜。

Tideman 投票方法（也称“排序配对”，ranked pairs）是一种排序选择投票方法，只要孔多塞获胜者存在，它就一定能选出该获胜者。请在名为 `tideman` 的文件夹里，一个名为 `tideman.c` 的文件中，创建一个用 Tideman 投票方法模拟选举的程序。

## 演示

## 发行代码

<details markdown="1"><summary>下载发行代码</summary>

登录 [cs50.dev](https://cs50.dev/)，点击你的终端窗口，然后单独执行 `cd`。你应该会发现终端窗口的提示符类似下面这样：

```
$
```

接着执行

```
wget https://cdn.cs50.net/2026/x/psets/3/tideman.zip
```

把一个名为 `tideman.zip` 的 ZIP 文件下载到你的 codespace 中。

然后执行

```
unzip tideman.zip
```

创建一个名为 `tideman` 的文件夹。你已经不再需要这个 ZIP 文件了，所以可以执行

```
rm tideman.zip
```

并在提示处输入“y”再按 Enter，删除你下载的 ZIP 文件。

现在输入

```
cd tideman
```

再按 Enter，进入（也就是打开）该目录。你的提示符现在应该类似下面这样。

```
tideman/ $
```

如果一切顺利，你应该执行

```
ls
```

并看到一个名为 `tideman.c` 的文件。执行 `code tideman.c` 应该会打开这个文件，你将在其中输入这道习题的代码。如果没有，请回头检查你的步骤，看看哪里出了错！

</details>

## 背景

一般来说，Tideman 方法的原理是构造一个候选人的“图”（graph），其中从候选人 A 指向候选人 B 的箭头（即边）表示候选人 A 在一对一较量中战胜候选人 B。因此，上面那场选举的图看起来会像下面这样。

![Nine ballots, with ranked preferences](https://cs50.harvard.edu/x/psets/3/condorcet_graph_1.png)

从 Alice 指向 Bob 的箭头表示，更多选民偏好 Alice 而不是 Bob（5 人偏好 Alice，4 人偏好 Bob）。同样，其他箭头表示更多选民偏好 Alice 而不是 Charlie，以及更多选民偏好 Charlie 而不是 Bob。

看这张图，Tideman 方法认为选举的获胜者应该是图的“源点”（source），也就是没有箭头指向它的候选人。在这个例子中，源点是 Alice：只有 Alice 没有箭头指向她，这意味着在一对一较量中，没有人比 Alice 更受偏好。因此 Alice 被宣布为选举获胜者。

然而，画出箭头之后，也有可能不存在孔多塞获胜者。看看下面这些选票。

![Nine ballots, with ranked preferences](https://cs50.harvard.edu/x/psets/3/no_condorcet_1.png)

在 Alice 和 Bob 之间，Alice 以 7 比 2 的差距更受偏好。在 Bob 和 Charlie 之间，Bob 以 5 比 4 的差距更受偏好。但在 Charlie 和 Alice 之间，Charlie 以 6 比 3 的差距更受偏好。如果我们把图画出来，就没有源点了！我们得到了一个候选人构成的环：Alice 胜 Bob，Bob 胜 Charlie，Charlie 又胜 Alice（很像石头剪刀布游戏）。在这种情况下，似乎没有办法选出获胜者。

为了解决这个问题，Tideman 算法必须小心避免在候选人图中产生环。它是怎么做到的？该算法先锁定最强的边，因为可以说它们最重要。具体来说，Tideman 算法规定，要根据胜利的“强度”（越多人偏好某位候选人胜过其对手，这场胜利就越强），把各场较量的边一条一条地“锁定”到图中。只要某条边锁定进图中不会产生环，这条边就会被加入；否则，这条边就被忽略。

在上面这些选票的情形下，这会怎样进行呢？嗯，一对候选人中最大的胜利差距是 Alice 战胜 Bob，因为有 7 位选民偏好 Alice 而不是 Bob（没有其他一对一较量中，获胜者被超过 7 位选民偏好）。所以 Alice 到 Bob 的箭头最先被锁定到图中。下一个最大的胜利差距是 Charlie 以 6 比 3 战胜 Alice，所以这个箭头接着被锁定。

接下来是 Bob 以 5 比 4 战胜 Charlie。但请注意：如果我们现在加上一个从 Bob 到 Charlie 的箭头，就会产生一个环！既然图中不允许有环，我们就应该跳过这条边，完全不把它加入图中。如果还有更多箭头要考虑，我们会接着看它们，但这已经是最后一个箭头了，所以图就完成了。

这个逐步的过程如下图所示，最终的图在右边。

![Nine ballots, with ranked preferences](https://cs50.harvard.edu/x/psets/3/lockin.png)

根据得到的图，Charlie 是源点（没有箭头指向 Charlie），所以 Charlie 被宣布为这场选举的获胜者。

更正式地说，Tideman 投票方法包含三个部分：

- <strong>统计（Tally）</strong>：所有选民都表明了自己的全部偏好之后，对每一对候选人，确定哪位候选人更受偏好，以及领先多少。
- <strong>排序（Sort）</strong>：把候选人对按胜利强度从大到小排序，其中胜利强度定义为偏好获胜候选人的选民人数。
- <strong>锁定（Lock）</strong>：从最强的一对开始，按顺序遍历候选人对，只要锁定某一对不会在图中产生环，就把这一对“锁定”到候选人图中。

图完成之后，图的源点（没有边指向它的那一位）就是获胜者！

## 理解代码

我们来看看 `tideman.c`。

首先，注意二维数组 `preferences`。整数 `preferences[i][j]` 表示偏好候选人 `i` 胜过候选人 `j` 的选民人数。

文件还定义了另一个二维数组 `locked`，它表示候选人图。`locked` 是一个布尔数组，所以 `locked[i][j]` 为 `true` 表示存在一条从候选人 `i` 指向候选人 `j` 的边；`false` 表示没有边。（如果你好奇的话，这种图的表示方法叫作“邻接矩阵”。）

接下来是一个叫 `pair` 的 `struct`，用来表示一对候选人：每一对包含获胜者（`winner`）的候选人下标和失败者（`loser`）的候选人下标。

候选人本身存储在数组 `candidates` 中，这是一个由 `string` 组成的数组，表示每位候选人的姓名。还有一个 `pairs` 数组，它将表示选举中所有（其中一方更受偏好的）候选人对。

程序还有两个全局变量：`pair_count` 和 `candidate_count`，分别表示数组 `pairs` 和 `candidates` 中的候选人对数量和候选人数量。

现在来看 `main`。注意，在确定候选人数量之后，程序会遍历 `locked` 图，并把所有值初始设为 `false`，这意味着我们最初的图中没有任何边。

接下来，程序遍历所有选民，把他们的偏好收集到一个名为 `ranks` 的数组中（通过调用 `vote`），其中 `ranks[i]` 是该选民第 `i` 偏好的候选人的下标。这些排名会被传给 `record_preference` 函数，它的工作是接收这些排名并更新全局变量 `preferences`。

所有投票都收齐之后，通过调用 `add_pairs` 把候选人对添加到 `pairs` 数组中，通过调用 `sort_pairs` 对它们排序，再通过调用 `lock_pairs` 把它们锁定到图中。最后，调用 `print_winner` 打印出选举获胜者的姓名！

在文件更靠下的地方，你会看到函数 `vote`、`record_preference`、`add_pairs`、`sort_pairs`、`lock_pairs` 和 `print_winner` 都是空着的。这就交给你了！

## 要求

完成 `tideman.c` 的实现，使它能模拟一场 Tideman 选举。

- 完成

  vote

  函数。

  - 该函数接受参数 `rank`、`name` 和 `ranks`。如果 `name` 与某位有效候选人的姓名匹配，那么你应该更新 `ranks` 数组，表明该选民把这位候选人作为其第 `rank` 偏好（其中 `0` 是第一偏好，`1` 是第二偏好，依此类推）。
  - 回忆一下，这里的 `ranks[i]` 表示用户的第 `i` 偏好。
  - 如果排名被成功记录，函数应该返回 `true`，否则返回 `false`（比如 `name` 不是任何一位候选人的姓名时）。
  - 你可以假定没有两位候选人同名。
- 完成

  record_preferences

  函数。

  - 该函数对每位选民调用一次，接受 `ranks` 数组作为参数（回忆一下，`ranks[i]` 是选民的第 `i` 偏好，其中 `ranks[0]` 是第一偏好）。
  - 该函数应该更新全局数组 `preferences`，加上当前选民的偏好。回忆一下，`preferences[i][j]` 应该表示偏好候选人 `i` 胜过候选人 `j` 的选民人数。
  - 你可以假定每位选民都会给所有候选人排名。
- 完成

  add_pairs

  函数。

  - 该函数应该把所有一方更受偏好的候选人对添加到 `pairs` 数组中。平局的候选人对（一方并不比另一方更受偏好）不应被添加到数组中。
  - 该函数应该更新全局变量 `pair_count`，使其等于候选人对的数量。（因此所有候选人对都应存储在 `pairs[0]` 到 `pairs[pair_count - 1]`（含）之间。）
- 完成

  sort_pairs

  函数。

  - 该函数应该把 `pairs` 数组按胜利强度从大到小排序，其中胜利强度定义为偏好获胜候选人的选民人数。如果多个候选人对的胜利强度相同，你可以假定它们的顺序无关紧要。
- 完成

  lock_pairs

  函数。

  - 该函数应该创建 `locked` 图，按胜利强度从大到小的顺序添加所有的边，只要这条边不会产生环。
- 完成

  print_winner

  函数。

  - 该函数应该打印出作为图的源点的那位候选人的姓名。你可以假定源点不会多于一个。

除了 `vote`、`record_preferences`、`add_pairs`、`sort_pairs`、`lock_pairs` 和 `print_winner` 这些函数的实现（以及你想额外包含的头文件）之外，你不应该修改 `tideman.c` 中的其他任何内容。你可以在 `tideman.c` 中添加额外的函数，只要不改动任何现有函数的声明即可。

## 讲解视频

<!-- video: kb83NwyYI68 -->
[▶ 视频](https://www.youtube.com/watch?v=kb83NwyYI68)

## 如何测试

请务必测试你的代码，确保它能处理……

- 任意数量候选人的选举（最多 `MAX`，即 `9` 人）
- 按姓名为候选人投票
- 为不在选票上的候选人投出的无效票
- 打印选举的获胜者

### 正确性

```
check50 cs50/problems/2026/x/tideman
```

### 代码风格

```
style50 tideman.c
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/tideman
```
