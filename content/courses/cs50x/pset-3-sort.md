# Sort

## 要解决的问题

回忆一下，课上我们见过几种对一列数字排序的算法：选择排序、冒泡排序和归并排序。

- 选择排序（selection sort）遍历列表中尚未排序的部分，每次选出最小的元素，并把它移到正确的位置。
- 冒泡排序（bubble sort）每次比较一对相邻的值，如果顺序不对就交换它们。这个过程一直持续到列表排好序为止。
- 归并排序（merge sort）递归地不断把列表一分为二，然后再按正确的顺序把较小的列表合并成较大的列表。

在这个问题中，你要分析三个（已编译好的！）排序程序，判断它们各自使用的是哪种算法。请在名为 `sort` 的文件夹里，一个名为 `answers.txt` 的文件中，填写标有 `TODO` 的空白，记录你的答案以及对每个程序的解释。

## 发行代码

这个问题需要一些“发行代码”，也就是由 CS50 教学团队编写的代码。我们提供了三个已经编译好的 C 程序 `sort1`、`sort2` 和 `sort3`，若干用作输入的 `.txt` 文件，以及另一个用来写答案的文件 `answers.txt`。`sort1`、`sort2` 和 `sort3` 各自实现了一种不同的排序算法：选择排序、冒泡排序或归并排序（不一定按这个顺序！）。你的任务是判断每个文件用的是哪种排序算法。先从下载这些文件开始。

<details markdown="1"><summary>下载发行文件</summary>

打开 [cs50.dev](https://cs50.dev/)。

先点击终端窗口内部，然后单独执行 `cd`。你应该会发现它的“提示符”类似下面这样。

```
$
```

点击该终端窗口内部，然后执行

```
wget https://cdn.cs50.net/2026/x/psets/3/sort.zip
```

再按 Enter，即可在你的 codespace 中下载一个名为 `sort.zip` 的 ZIP 文件。注意不要漏掉 `wget` 和后面 URL 之间的空格，也不要漏掉任何其他字符！

现在执行

```
unzip sort.zip
```

创建一个名为 `sort` 的文件夹。你已经不再需要这个 ZIP 文件了，所以可以执行

```
rm sort.zip
```

并在提示处输入“y”再按 Enter，删除你下载的 ZIP 文件。

</details>

## 提示

<details markdown="1"><summary>研究这些 `.txt` 文件</summary>

- 我们提供了多个

  .txt

  文件。这些文件包含

  n

  行数值，顺序要么是逆序的，要么是打乱的，要么是已排序的。

  - 例如，`reversed10000.txt` 包含 10,000 行从 `10000` 开始倒序排列的数字，而 `random50000.txt` 包含 50,000 行随机顺序的数字。
- 不同类型的 `.txt` 文件可能有助于你判断哪个是哪种排序。想想每种算法处理已经排好序的列表时表现如何。逆序的列表呢？打乱的列表呢？不妨对每种类型各取一个较小的列表，手动走一遍每种排序的过程。

</details>

<details markdown="1"><summary>用不同的输入给每个排序计时</summary>

- 要在文本文件上运行这些排序，请在终端中运行

  ./[program_name] [text_file.txt]

  。请确保已经用

  cd

  进入了

  sort

  目录！

  - 例如，要用 `sort1` 对 `reversed10000.txt` 排序，运行 `./sort1 reversed10000.txt`。
- 给排序计时可能会有帮助。为此，运行

  time ./[sort_file] [text_file.txt]

  。

  - 例如，你可以运行 `time ./sort1 reversed10000.txt`，让 `sort1` 处理 10,000 个逆序的数字。在终端输出的末尾，你可以查看 `real` 时间，了解程序运行实际花了多长时间。

</details>

## 讲解视频

[https://video.cs50.io/-Bhxxw6JKKY](https://video.cs50.io/-Bhxxw6JKKY)

<details markdown="1"><summary>不知道怎么解决？</summary>

</details>

## 如何测试

### 正确性

```
check50 cs50/problems/2026/x/sort
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/sort
```
