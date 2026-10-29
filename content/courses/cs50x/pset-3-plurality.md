# Plurality

## 要解决的问题

选举的形式五花八门。在英国，[首相](https://www.parliament.uk/education/about-your-parliament/general-elections/)由君主正式任命，君主通常会选择在下议院赢得最多席位的政党的领袖。美国则采用多步骤的[选举人团](https://www.archives.gov/federal-register/electoral-college/about.html)制度：公民投票决定各州如何分配选举人，再由选举人选出总统。

不过，举行选举最简单的方法或许是通常所说的“相对多数投票”（plurality vote，也叫“领先者当选”或“赢者通吃”）。在相对多数投票中，每位选民可以为一名候选人投票。选举结束时，得票最多的候选人当选。

在这个问题中，你要实现一个程序来进行相对多数选举，具体如下。

## 演示

## 发行代码

在这个问题中，你要扩展由 CS50 教学团队提供的“发行代码”的功能。

<details markdown="1"><summary>下载发行代码</summary>

登录 [cs50.dev](https://cs50.dev/)，点击你的终端窗口，然后单独执行 `cd`。你应该会发现终端窗口的提示符类似下面这样：

```
$
```

接着执行

```
wget https://cdn.cs50.net/2026/x/psets/3/plurality.zip
```

把一个名为 `plurality.zip` 的 ZIP 文件下载到你的 codespace 中。

然后执行

```
unzip plurality.zip
```

创建一个名为 `plurality` 的文件夹。你已经不再需要这个 ZIP 文件了，所以可以执行

```
rm plurality.zip
```

并在提示处输入“y”再按 Enter，删除你下载的 ZIP 文件。

现在输入

```
cd plurality
```

再按 Enter，进入（也就是打开）该目录。你的提示符现在应该类似下面这样。

```
plurality/ $
```

如果一切顺利，你应该执行

```
ls
```

并看到一个名为 `plurality.c` 的文件。执行 `code plurality.c` 应该会打开这个文件，你将在其中输入这道习题的代码。如果没有，请回头检查你的步骤，看看哪里出了错！

</details>

<details markdown="1"><summary>理解 `plurality.c` 中的代码</summary>

每当你要扩展已有代码的功能时，最好先确保自己理解它现在的样子。

先看文件顶部。`#define MAX 9` 这一行所用的语法，意思是 `MAX` 是一个（等于 `9` 的）常量，可以在整个程序中使用。这里，它表示一次选举最多可以有多少名候选人。

```
// Max number of candidates
#define MAX 9
```

注意，`plurality.c` 随后用这个常量定义了一个全局数组，也就是任何函数都可以访问的数组。

```
// Array of candidates
candidate candidates[MAX];
```

但在这里，`candidate` 是什么呢？在 `plurality.c` 中，`candidate` 是一个 `struct`。每个 `candidate` 有两个字段：一个名为 `name` 的 `string`，表示候选人的姓名；一个名为 `votes` 的 `int`，表示该候选人的得票数。

```
// Candidates have name and vote count
typedef struct
{
    string name;
    int votes;
}
candidate;
```

现在，看看 `main` 函数本身。看你能不能找到程序在哪里设置了全局变量 `candidate_count`，它表示这次选举中的候选人数量。

```
// Number of candidates
int candidate_count;
```

那么，它把命令行参数复制到数组 `candidates` 中的地方呢？

```
// Populate array of candidates
candidate_count = argc - 1;
if (candidate_count > MAX)
{
    printf("Maximum number of candidates is %i\n", MAX);
    return 2;
}
for (int i = 0; i < candidate_count; i++)
{
    candidates[i].name = argv[i + 1];
    candidates[i].votes = 0;
}
```

还有它让用户输入选民人数的地方呢？

```
int voter_count = get_int("Number of voters: ");
```

然后，程序让每位选民输入一次投票，并对每次投票所选的候选人调用 `vote` 函数。最后，`main` 调用 `print_winner` 函数，打印选举的获胜者（可能不止一位）。实现这部分功能的代码，就留给你自己去找了。

不过，如果你继续往文件下面看，会发现 `vote` 和 `print_winner` 这两个函数是空着的。

```
// Update vote totals given a new vote
bool vote(string name)
{
    // TODO
    return false;
}

// Print the winner (or winners) of the election
void print_winner(void)
{
    // TODO
    return;
}
```

这部分要由你来完成！**除了 `vote` 和 `print_winner` 这两个函数的实现（以及你想额外包含的头文件）之外，你不应该修改 `plurality.c` 中的其他任何内容。**

</details>

## 提示

点击下面的折叠项，阅读一些建议！

<details markdown="1"><summary>完成 `vote` 函数</summary>

接下来，完成 `vote` 函数。

- 注意 `vote` 的函数签名 `bool vote(string name)` 表明它接受一个参数，即一个名为 `name` 的 `string`，表示被投票的候选人的姓名。
- `vote` 应该返回一个 `bool`，其中 `true` 表示投票成功，`false` 表示投票未成功。

解决这个问题的一种方法是这样做：

1. 遍历每位候选人

   1. 检查该候选人的姓名是否与输入的

      name

      匹配

      1. 如果匹配，就把该候选人的得票数加一，并返回 `true`
      2. 如果不匹配，继续检查
2. 如果检查完每位候选人都没有匹配，返回 `false`

我们来写一些伪代码，提醒你这样去做：

```
// Update vote totals given a new vote
bool vote(string name)
{
    // Iterate over each candidate
        // Check if candidate's name matches given name
            // If yes, increment candidate's votes and return true

    // If no match, return false
}
```

不过，代码的实现就留给你自己了！

</details>

<details markdown="1"><summary>完成 `print_winner` 函数</summary>

最后，完成 `print_winner` 函数。

- 该函数应该打印出选举中得票最多的候选人的姓名，然后打印一个换行符。
- 如果有多名候选人都拿到最高票数，选举可能出现平局。这种情况下，你应该输出每位获胜候选人的姓名，每个姓名单独占一行。

你可能会觉得排序算法最适合解决这个问题：想象一下按得票总数给候选人排序，然后打印排在最前面的候选人（或多名候选人）。不过要记得，排序可能代价很高：即使是最快的排序算法之一归并排序，运行时间也是 \(O(N \space log(N))\)。

想想看，要解决这个问题，你只需要两条信息：

1. 最高票数
2. 拥有该票数的候选人（可能不止一位）

因此，一个好的解法可能只需要两次查找。写一些伪代码提醒自己这样去做：

```
// Print the winner (or winners) of the election
void print_winner(void)
{
    // Find the maximum number of votes

    // Print the candidate (or candidates) with maximum votes

}
```

不过，代码就留给你自己了！

</details>

## 讲解视频

<!-- video: ftOapzDjEb8 -->
[▶ 视频](https://www.youtube.com/watch?v=ftOapzDjEb8)

## 如何测试

请务必测试你的代码，确保它能处理……

- 任意数量候选人的选举（最多 `MAX`，即 `9` 人）
- 按姓名为候选人投票
- 为不在选票上的候选人投出的无效票
- 只有一位获胜者时，打印选举的获胜者
- 有多位获胜者时，打印选举的获胜者

### 正确性

```
check50 cs50/problems/2026/x/plurality
```

### 代码风格

```
style50 plurality.c
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/plurality
```
