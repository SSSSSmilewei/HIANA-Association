# Runoff

## 要解决的问题

你已经了解相对多数选举，它用一个非常简单的算法来决定选举的获胜者：每位选民有一票，得票最多的候选人获胜。

但相对多数投票确实有一些缺点。比如，在一场有三位候选人的选举中，如果投出了下面这些选票，会发生什么？

![Five ballots, tie betweeen Alice and Bob](https://cs50.harvard.edu/x/psets/3/fptp_ballot_1.png)

相对多数投票在这里会宣布 Alice 和 Bob 打平，因为两人各得两票。但这是正确的结果吗？

还有另一种投票制度，叫作排序选择投票制（ranked-choice voting）。在排序选择制中，选民可以投票给不止一位候选人。他们不是只投给自己的首选，而是可以按偏好顺序给候选人排序。这样得到的选票看起来可能像下面这样。

![Five ballots, with ranked preferences](https://cs50.harvard.edu/x/psets/3/ranked_ballot_1.png)

在这里，每位选民除了指明第一偏好的候选人之外，还标明了第二和第三选择。这样一来，原本平局的选举现在可能就有了获胜者。比赛起初是 Alice 和 Bob 平局，所以 Charlie 出局了。但选了 Charlie 的那位选民更喜欢 Alice 而不是 Bob，所以这里可以宣布 Alice 获胜。

排序选择投票还能解决相对多数投票的另一个潜在缺点。看看下面这些选票。

![Nine ballots, with ranked preferences](https://cs50.harvard.edu/x/psets/3/ranked_ballot_3.png)

这场选举应该谁赢？在每位选民只选第一偏好的相对多数投票中，Charlie 以四票获胜，Bob 只有三票，Alice 只有两票。但大多数选民（9 人中的 5 人）无论是 Alice 还是 Bob 当选，都会比 Charlie 当选更满意。通过考虑排序偏好，投票制度或许能选出更能反映选民偏好的获胜者。

这样的排序选择投票制度之一是即时决选制（instant runoff）。在即时决选中，选民可以对任意多的候选人排序。如果有候选人获得了过半数（超过 50%）的第一偏好票，该候选人就被宣布为选举获胜者。

如果没有候选人的得票超过 50%，就会发生一次“即时决选”。得票最少的候选人被淘汰出局，原先把该候选人作为第一偏好的人，现在改为考虑他们的第二偏好。为什么要这样做？实际上，这是在模拟：如果最不受欢迎的候选人一开始就没有参选，结果会怎样。

这个过程不断重复：如果没有候选人获得过半数的票，最后一名的候选人就被淘汰，投给他们的人则改投他们的下一个偏好（该候选人自己尚未被淘汰）。一旦有候选人获得过半数，该候选人就被宣布为获胜者。

听起来比相对多数投票复杂一点，对吧？但可以说，它有一个好处：这种选举制度下的获胜者，能更准确地代表选民的偏好。请在名为 `runoff` 的文件夹里，一个名为 `runoff.c` 的文件中，创建一个模拟决选的程序。

## 演示

## 发行代码

<details markdown="1"><summary>下载发行代码</summary>

登录 [cs50.dev](https://cs50.dev/)，点击你的终端窗口，然后单独执行 `cd`。你应该会发现终端窗口的提示符类似下面这样：

```
$
```

接着执行

```
wget https://cdn.cs50.net/2026/x/psets/3/runoff.zip
```

把一个名为 `runoff.zip` 的 ZIP 文件下载到你的 codespace 中。

然后执行

```
unzip runoff.zip
```

创建一个名为 `runoff` 的文件夹。你已经不再需要这个 ZIP 文件了，所以可以执行

```
rm runoff.zip
```

并在提示处输入“y”再按 Enter，删除你下载的 ZIP 文件。

现在输入

```
cd runoff
```

再按 Enter，进入（也就是打开）该目录。你的提示符现在应该类似下面这样。

```
runoff/ $
```

如果一切顺利，你应该执行

```
ls
```

并看到一个名为 `runoff.c` 的文件。执行 `code runoff.c` 应该会打开这个文件，你将在其中输入这道习题的代码。如果没有，请回头检查你的步骤，看看哪里出了错！

</details>

<details markdown="1"><summary>理解 `runoff.c` 中的代码</summary>

每当你要扩展已有代码的功能时，最好先确保自己理解它现在的样子。

先看 `runoff.c` 的顶部。这里定义了两个常量：`MAX_CANDIDATES` 表示选举中候选人的最大数量，`MAX_VOTERS` 表示选举中选民的最大数量。

```
// Max voters and candidates
#define MAX_VOTERS 100
#define MAX_CANDIDATES 9
```

注意，`MAX_CANDIDATES` 被用来确定数组 `candidates` 的大小。

```
// Array of candidates
candidate candidates[MAX_CANDIDATES];
```

`candidates` 是一个由 `candidate` 组成的数组。在 `runoff.c` 中，`candidate` 是一个 `struct`。每个 `candidate` 有一个表示姓名 `name` 的 `string` 字段，一个表示当前得票数 `votes` 的 `int`，以及一个名为 `eliminated` 的 `bool` 值，表示该候选人是否已被淘汰出选举。数组 `candidates` 会记录选举中的所有候选人。

```
// Candidates have name, vote count, eliminated status
typedef struct
{
    string name;
    int votes;
    bool eliminated;
}
candidate;
```

现在你可以更好地理解二维数组 `preferences` 了。数组 `preferences[i]` 表示第 `i` 位选民的全部偏好。整数 `preferences[i][j]` 存储的是，在 `candidates` 数组中，作为第 `i` 位选民第 `j` 偏好的那位候选人的下标。

```
// preferences[i][j] is jth preference for voter i
int preferences[MAX_VOTERS][MAX_CANDIDATES];
```

程序还有两个全局变量：`voter_count` 和 `candidate_count`。

```
// Numbers of voters and candidates
int voter_count;
int candidate_count;
```

现在来看 `main`。注意，在确定候选人数量和选民人数之后，主投票循环开始，让每位选民都有机会投票。选民输入偏好时，会调用 `vote` 函数来记录所有偏好。如果在任何时候选票被判定为无效，程序就会退出。

所有投票都收齐后，另一个循环开始：它会不断循环执行决选的过程，即检查是否有获胜者、淘汰最后一名的候选人，直到产生获胜者为止。

这里首先调用的是一个叫 `tabulate` 的函数，它应该查看所有选民的偏好，通过查看每位选民尚未被淘汰的首选候选人，计算出当前的得票总数。接下来，`print_winner` 函数应该在有获胜者时打印出获胜者；如果有，程序就结束了。否则，程序需要确定仍在选举中的人里得票最少的是多少（通过调用 `find_min`）。如果结果发现选举中所有人的票数都相同（由 `is_tie` 函数判断），就宣布选举平局；否则，通过调用 `eliminate` 函数，淘汰最后一名的候选人（可能不止一位）。

如果你再往文件下面看一点，会看到其余的函数，即 `vote`、`tabulate`、`print_winner`、`find_min`、`is_tie` 和 `eliminate`，都留给你来完成！**不过，你只应该修改 runoff.c 中的这些函数，但你可以在 runoff.c 顶部 `#include` 额外的头文件。**

</details>

## 提示

点击下面的折叠项，阅读一些建议！

<details markdown="1"><summary>完成 `vote` 函数</summary>

完成 `vote` 函数。

- 该函数接受三个参数：`voter`、`rank` 和 `name`。
- 如果 `name` 与某位有效候选人的姓名匹配，那么你应该更新全局数组 preferences，表明选民 `voter` 把该候选人作为其第 `rank` 偏好。请记住，`0` 是第一偏好，`1` 是第二偏好，依此类推。你可以假定没有两位候选人同名。
- 如果偏好被成功记录，函数应该返回 `true`，否则应该返回 `false`。比如，想想 `name` 不是任何一位候选人姓名的情况。

在编写代码时，请考虑这些提示：

- 回忆一下，`candidate_count` 存储了选举中候选人的数量。
- 回忆一下，你可以用 [`strcmp`](https://man.cs50.io/3/strcmp) 来比较两个字符串。
- 回忆一下，`preferences[i][j]` 存储的是第 `i` 位选民第 `j` 偏好的那位候选人的下标。

</details>

<details markdown="1"><summary>完成 `tabulate` 函数</summary>

完成 `tabulate` 函数。

- 该函数应该更新决选在当前阶段每位候选人的 `votes` 数。
- 回忆一下，在决选的每个阶段，每位选民实际上是把票投给自己偏好最高且尚未被淘汰的候选人。

在编写代码时，请考虑这些提示：

- 回忆一下，`voter_count` 存储了选举中选民的人数，而且对我们选举中的每位选民，我们都要统计一张选票。
- 回忆一下，对于选民 `i`，他的首选候选人用 `preferences[i][0]` 表示，第二选择的候选人用 `preferences[i][1]` 表示，依此类推。
- 回忆一下，`candidate` 这个 `struct` 有一个名为 `eliminated` 的字段，如果该候选人已被淘汰出选举，它就是 `true`。
- 回忆一下，`candidate` 这个 `struct` 有一个名为 `votes` 的字段，你很可能需要为每位选民偏好的候选人更新它。
- 回忆一下，一旦你把票投给了某位选民第一个未被淘汰的候选人，就应该在那里停止，而不是继续往下处理他的选票。你可以在条件语句里使用 `break` 提前跳出循环。

</details>

<details markdown="1"><summary>完成 `print_winner` 函数</summary>

完成 `print_winner` 函数。

- 如果有任何候选人获得了超过半数的票，就应该打印他的姓名，并且函数应该返回 `true`。
- 如果还没有人赢得选举，函数应该返回 `false`。

在编写代码时，请考虑这个提示：

- 回忆一下，`voter_count` 存储了选举中选民的人数。据此，你会如何表示赢得选举所需的票数？

</details>

<details markdown="1"><summary>完成 `find_min` 函数</summary>

完成 `find_min` 函数。

- 该函数应该返回仍在选举中的候选人里最低的得票总数。

在编写代码时，请考虑这个提示：

- 你很可能需要遍历候选人，找出既仍在选举中、得票数又最少的那一位。在遍历候选人的过程中，你应该记录哪些信息？

</details>

<details markdown="1"><summary>完成 `is_tie` 函数</summary>

完成 `is_tie` 函数。

- 该函数接受一个参数 `min`，它是选举中任何人当前拥有的最低票数。
- 如果选举中剩下的每位候选人票数都相同，函数应该返回 `true`，否则应该返回 `false`。

在编写代码时，请考虑这个提示：

- 回忆一下，如果仍在选举中的每位候选人票数都相同，就出现了平局。还要注意，`is_tie` 函数接受一个参数 `min`，它是任何候选人当前拥有的最小票数。你可以怎样利用 `min` 来判断选举是否平局（或者反过来，不是平局）？

</details>

<details markdown="1"><summary>完成 `eliminate` 函数</summary>

完成 `eliminate` 函数。

- 该函数接受一个参数 `min`，它是选举中任何人当前拥有的最低票数。
- 该函数应该淘汰票数为 `min` 的候选人（可能不止一位）。

</details>

## 讲解视频

<!-- video: -Vc5aGywKxo -->
[▶ 视频](https://www.youtube.com/watch?v=-Vc5aGywKxo)

## 如何测试

请务必测试你的代码，确保它能处理……

- 任意数量候选人的选举（最多 `MAX`，即 `9` 人）
- 按姓名为候选人投票
- 为不在选票上的候选人投出的无效票
- 只有一位获胜者时，打印选举的获胜者
- 剩余所有候选人平局时，不淘汰任何人

### 正确性

```
check50 cs50/problems/2026/x/runoff
```

### 代码风格

```
style50 runoff.c
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/runoff
```
