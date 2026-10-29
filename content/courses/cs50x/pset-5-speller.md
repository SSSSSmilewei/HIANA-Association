# Speller

## 要解决的问题

在这道题中，你将使用哈希表（hash table）实现一个拼写检查程序，检查一个文件的拼写，效果如下所示。

## 演示

## 发行代码

这道题要求你扩展 CS50 课程组提供给你的代码的功能。

<details markdown="1"><summary>下载发行代码</summary>

登录 [cs50.dev](https://cs50.dev/)，点击你的终端窗口，单独执行 `cd`。你应该会发现终端窗口的提示符类似下面这样：

```
$
```

接着执行

```
wget https://cdn.cs50.net/2026/x/psets/5/speller.zip
```

把名为 `speller.zip` 的 ZIP 文件下载到你的 codespace 中。

然后执行

```
unzip speller.zip
```

创建一个名为 `speller` 的文件夹。你不再需要这个 ZIP 文件了，所以可以执行

```
rm speller.zip
```

并在提示时输入“y”后按回车，删除你下载的 ZIP 文件。

现在输入

```
cd speller
```

再按回车，进入（即打开）该目录。你的提示符现在应该类似下面这样。

```
speller/ $
```

单独执行 `ls`，你应该会看到几个文件和文件夹：

```
dictionaries/  dictionary.c  dictionary.h  keys/  Makefile  speller.c  speller50  texts/
```

如果遇到任何问题，请重新按这些步骤操作一遍，看看能否找出哪里出了错！

</details>

## 背景

> <strong>由于这个程序包含很多文件，开始之前务必把这一节完整读完。这样你就会知道该做什么，以及怎么做！</strong>

理论上，对于规模为 <em>n</em> 的输入，运行时间为 <em>n</em> 的算法与运行时间为 <em>2n</em> 的算法，用 <em>O</em> 来衡量是“渐近等价”的。的确，在描述一个算法的运行时间时，我们通常只关注占主导地位（即影响最大）的项（在这里就是 <em>n</em>，因为 <em>n</em> 可能比 2 大得多）。但在现实世界中，实际情况是 <em>2n</em> 感觉上就是比 <em>n</em> 慢一倍。

摆在你面前的挑战是，实现你所能做到的最快的拼写检查程序！不过，我们所说的“最快”指的是实际的“挂钟”时间，而不是渐近时间。

在 `speller.c` 中，我们编写了一个程序，它会先把一份单词词典从磁盘加载到内存，然后对某个文件进行拼写检查。而这个词典则是在名为 `dictionary.c` 的文件中实现的。（它本来也可以直接在 `speller.c` 中实现，但随着程序越来越复杂，把它们拆成多个文件通常会更方便。）其中各函数的原型（prototype）并没有定义在 `dictionary.c` 本身，而是定义在 `dictionary.h` 中。这样，`speller.c` 和 `dictionary.c` 都可以 `#include` 这个文件。遗憾的是，我们还没来得及实现加载的部分。检查的部分也没有。这两部分（以及更多内容）都留给你来做！不过在此之前，先来一次导览。

### 理解代码

#### `dictionary.h`

打开 `dictionary.h`，你会看到一些新的语法，包括几行提到 `DICTIONARY_H` 的代码。不必担心它们，不过如果你好奇的话，这几行只是确保：尽管 `dictionary.c` 和 `speller.c`（稍后你会看到）都 `#include` 了这个文件，`clang` 也只会编译它一次。

接下来注意我们 `#include` 了一个名为 `stdbool.h` 的文件。`bool` 本身就是在这个文件中定义的。你以前不需要它，因为 CS50 库过去替你 `#include` 了它。

还要注意我们使用了 `#define`，这是一条“预处理指令”（preprocessor directive），它定义了一个名为 `LENGTH`、值为 `45` 的“常量”。说它是常量，是因为你无法（意外地）在自己的代码中改变它。事实上，`clang` 会把你代码中所有提到 `LENGTH` 的地方原样替换成 `45`。换句话说，它不是变量，只是一种查找替换的技巧。

最后，注意五个函数的原型：`check`、`hash`、`load`、`size` 和 `unload`。注意其中三个函数如何通过 `*` 接受一个指针作为参数：

```
bool check(const char *word);
unsigned int hash(const char *word);
bool load(const char *dictionary);
```

回忆一下，`char *` 就是我们以前称为 `string` 的东西。所以这三个原型本质上就是：

```
bool check(const string word);
unsigned int hash(const string word);
bool load(const string dictionary);
```

而 `const` 只是表示这些字符串在作为参数传入时必须保持不变；无论是不小心还是有意，你都无法修改它们！

#### `dictionary.c`

现在打开 `dictionary.c`。注意文件顶部我们定义了一个名为 `node` 的 `struct`，它表示哈希表中的一个节点。我们还声明了一个全局指针数组 `table`，它（很快）将表示你用来记录词典中单词的哈希表。该数组包含 `N` 个节点指针，我们暂时把 `N` 设为 `26`，以便与下面所述的默认 `hash` 函数相匹配。根据你自己对 `hash` 的实现，你很可能想要把它增大。

接下来注意，我们已经实现了 `load`、`check`、`size` 和 `unload`，但只是勉强实现，刚好够代码能够编译。还要注意，我们用一个基于单词首字母的示例算法实现了 `hash`。你的任务，归根结底，是尽可能巧妙地重新实现这些函数，让这个拼写检查程序名副其实地工作。而且要快！

#### `speller.c`

好，接下来打开 `speller.c`，花些时间看看其中的代码和注释。你不需要修改这个文件中的任何内容，也不需要理解它的全部，但还是要试着了解它的功能。注意我们如何借助一个名为 `getrusage` 的函数，对你实现的 `check`、`load`、`size` 和 `unload` 进行“基准测试”（benchmarking，即计时它们的执行）。还要注意我们如何把待拼写检查的某个文件的内容，一个单词一个单词地传给 `check`。最后，我们会报告该文件中的每个拼写错误，以及一大堆统计数据。

顺带一提，注意我们把 `speller` 的用法定义为

```
Usage: speller [dictionary] text
```

其中 `dictionary` 被假定是一个包含小写单词列表的文件，每行一个单词，而 `text` 是要进行拼写检查的文件。正如方括号所暗示的，提供 `dictionary` 是可选的；如果省略这个参数，`speller` 默认会使用 `dictionaries/large`。换句话说，运行

```
./speller text
```

就等价于运行

```
./speller dictionaries/large text
```

其中 `text` 是你想要拼写检查的文件。不用说，前者更省事！（当然，在你实现 `dictionary.c` 中的 `load` 之前，`speller` 无法加载任何词典！在那之前，你会看到 `Could not load`。）

提醒一下，默认词典里有 143,091 个单词，所有这些单词都必须加载到内存中！不妨看一眼那个文件，了解它的结构和大小。注意该文件中的每个单词都是小写的（为简单起见，即使是专有名词和首字母缩写词也是如此）。文件从上到下按字典序排序，每行只有一个单词（每个单词都以 `\n` 结尾）。没有单词长于 45 个字符，也没有单词出现多于一次。开发过程中，你可能会发现给 `speller` 提供一个你自己的、单词少得多的 `dictionary` 会很有帮助，以免在调试内存中一个庞大的结构时吃力。`dictionaries/small` 就是这样一个词典。要使用它，执行

```
./speller dictionaries/small text
```

其中 `text` 是你想要拼写检查的文件。在确定你理解 `speller` 本身是如何工作的之前，不要继续往下做！

很可能，你没有花足够的时间看 `speller.c`。退回一格，再从头走一遍吧！

#### `texts/`

为了让你能测试自己实现的 `speller`，我们还给你提供了一大堆文本，其中有《爱乐之城》（<em>La La Land</em>）的剧本、《平价医疗法案》（Affordable Care Act）的文本、托尔斯泰的三百万字节文字、《联邦党人文集》（<em>The Federalist Papers</em>）和莎士比亚的一些节选，等等。为了让你心里有数，请打开并浏览这些文件，它们都在你的 `pset5` 目录下一个名为 `texts` 的目录中。

现在，正如你仔细读过 `speller.c` 后应该知道的，如果用，比如说，

```
./speller texts/lalaland.txt
```

来执行，`speller` 的输出最终会类似下面这样。

下面是你会看到的部分输出。为了让你了解情况，我们节选了一些“拼写错误”的例子。为了不剧透，我们暂时省略了我们自己的统计数据。

```
MISSPELLED WORDS

[...]
AHHHHHHHHHHHHHHHHHHHHHHHHHHHT
[...]
Shangri
[...]
fianc
[...]
Sebastian's
[...]

WORDS MISSPELLED:
WORDS IN DICTIONARY:
WORDS IN TEXT:
TIME IN load:
TIME IN check:
TIME IN size:
TIME IN unload:
TIME IN TOTAL:
```

`TIME IN load` 表示 `speller` 执行你实现的 `load` 所花的秒数。`TIME IN check` 表示 `speller` 执行你实现的 `check` 总共花的秒数。`TIME IN size` 表示 `speller` 执行你实现的 `size` 所花的秒数。`TIME IN unload` 表示 `speller` 执行你实现的 `unload` 所花的秒数。`TIME IN TOTAL` 是这四项测量值之和。

**请注意，即使你不改动代码，这些时间在多次运行 `speller` 时也可能有些差异，取决于你的 codespace 还在做别的什么事情。**

顺带说明一下，我们所说的“拼写错误”，仅仅是指某个单词不在所提供的 `dictionary` 中。

#### `Makefile`

最后，回忆一下，`make` 可以自动完成代码的编译，这样你就不必手动执行 `clang` 并带上一大堆开关。然而，随着程序规模变大，`make` 将无法再根据上下文推断如何编译你的代码；你需要开始告诉 `make` 如何编译你的程序，尤其是当程序涉及多个源文件（即 `.c` 文件）时，就像这道题的情况。因此我们会用到 `Makefile`，这是一个配置文件，用来确切地告诉 `make` 该做什么。打开 `Makefile`，你应该会看到四行：

1. 第一行告诉 `make`，每当你自己执行 `make speller`（或者只是 `make`）时，就执行后面的几行。
2. 第二行告诉 `make` 如何把 `speller.c` 编译成机器码（即 `speller.o`）。
3. 第三行告诉 `make` 如何把 `dictionary.c` 编译成机器码（即 `dictionary.o`）。
4. 第四行告诉 `make` 把 `speller.o` 和 `dictionary.o` 链接成一个名为 `speller` 的文件。

**请务必通过执行 `make speller`（或者只是 `make`）来编译 `speller`。执行 `make dictionary` 是行不通的！**

## 要求

好了，现在摆在你面前的挑战是，使用哈希表，依次实现 `load`、`hash`、`size`、`check` 和 `unload`，并尽可能高效，使得 `TIME IN load`、`TIME IN check`、`TIME IN size` 和 `TIME IN unload` 全都最小化。诚然，“最小化”究竟意味着什么并不显而易见，因为当你给 `speller` 提供不同的 `dictionary` 和 `text` 时，这些基准数据肯定会有变化。但挑战正在于此，如果说不上是乐趣的话。这道题是你展示设计能力的机会。虽然我们鼓励你尽量减少空间占用，但你最终的敌人是时间。不过在你一头扎进去之前，先看看我们的一些要求。

- 你不得修改 `speller.c` 或 `Makefile`。
- 你可以修改 `dictionary.c`（事实上，为了完成 `load`、`hash`、`size`、`check` 和 `unload` 的实现，你必须修改它），但你不得修改 `load`、`hash`、`size`、`check` 或 `unload` 的声明（即原型）。不过，你可以在 `dictionary.c` 中添加新的函数和（局部或全局）变量。
- 你可以修改 `dictionary.c` 中 `N` 的值，使你的哈希表可以有更多的桶（bucket）。
- 你可以修改 `dictionary.h`，但不得修改 `load`、`hash`、`size`、`check` 或 `unload` 的声明。
- 你实现的 `check` 必须不区分大小写。换句话说，如果 `foo` 在词典中，那么无论怎样的大小写组合，`check` 都应返回 true；`foo`、`foO`、`fOo`、`fOO`、`Foo`、`FoO`、`FOo` 和 `FOO` 都不应被视为拼写错误。
- 撇开大小写不谈，你实现的 `check` 应当只对确实在 `dictionary` 中的单词返回 `true`。小心不要把常见单词（例如 `the`）硬编码进去，以免我们传给你的实现一个不含这些单词的 `dictionary`。此外，唯一允许的所有格形式，是确实在 `dictionary` 中的那些。换句话说，即使 `foo` 在 `dictionary` 中，如果 `foo's` 不在 `dictionary` 中，那么给定 `foo's` 时，`check` 应返回 `false`。
- 你可以假设，传给你的程序的任何 `dictionary` 的结构都与我们的完全一样：从上到下按字母顺序排序，每行一个单词，每个单词以 `\n` 结尾。你还可以假设，`dictionary` 至少包含一个单词，没有单词长于 `LENGTH`（`dictionary.h` 中定义的一个常量）个字符，没有单词出现多于一次，每个单词只含小写字母，可能还有撇号，并且没有单词以撇号开头。
- 你可以假设，传给 `check` 的单词只包含（大写或小写）字母，可能还有撇号。
- 你的拼写检查程序只能接受 `text` 以及（可选的）`dictionary` 作为输入。虽然你可能想要（特别是对那些比较有把握的同学）对我们的默认词典做“预处理”，以推导出适合它的“理想哈希函数”，但你不得把任何此类预处理的输出保存到磁盘上，以便在拼写检查程序的后续运行中把它重新加载回内存而获得优势。
- 你的拼写检查程序不得泄漏任何内存。务必用 `valgrind` 检查是否有内存泄漏。
- <strong>你编写的哈希函数最终应当是你自己的，而不是你在网上搜来的。</strong>

好了，准备好了吗？

- 实现 `load`。
- 实现 `hash`。
- 实现 `size`。
- 实现 `check`。
- 实现 `unload`。

## 提示

<details markdown="1"><summary>实现 `load`</summary>

补全 `load` 函数。`load` 应把词典加载到内存中（具体来说，是加载到一个哈希表中！）。如果成功，`load` 应返回 `true`，否则返回 `false`。

想一想，这个问题其实是由更小的问题组成的：

1. 打开词典文件
2. 读取文件中的每个单词
   
   1. 把每个单词添加到哈希表中
3. 关闭词典文件

写一些伪代码来提醒自己做到这些：

```
bool load(const char *dictionary)
{
    // Open the dictionary file

    // Read each word in the file

        // Add each word to the hash table

    // Close the dictionary file
}
```

首先考虑如何打开词典文件。[`fopen`](https://manual.cs50.io/3/fopen) 是很自然的选择。你可以使用模式 `r`，因为你只需要从词典文件中<em>读取</em>单词（不需要<em>写入</em>或<em>追加</em>）。

```
bool load(const char *dictionary)
{
    // Open the dictionary file
    FILE *source = fopen(dictionary, "r");

    // Read each word in the file

        // Add each word to the hash table

    // Close the dictionary file
}
```

在继续之前，你应该编写代码来检查文件是否正确打开。这由你自己来完成！最好也确保关闭你打开的每一个文件，所以现在正是编写关闭词典文件的代码的好时机：

```
bool load(const char *dictionary)
{
    // Open the dictionary file
    FILE *source = fopen(dictionary, "r");

    // Read each word in the file

        // Add each word to the hash table

    // Close the dictionary file
    fclose(source);
}
```

剩下的就是读取文件中的每个单词，并把每个单词添加到哈希表中。整个操作成功时返回 `true`，一旦失败就返回 `false`。可以考虑跟着这道题的讲解视频走，并继续把子问题拆分成更小的问题。例如，把每个单词添加到哈希表中，可能只需要实现几个更小的步骤：

1. 为新的哈希表节点开辟空间
2. 把单词复制到新节点中
3. 对单词做哈希，得到它的哈希值
4. 把新节点插入哈希表（使用由其哈希值指定的索引）

当然，解决这个问题不止一种办法，每种办法都有各自的设计权衡。因此，其余的代码就由你自己来写了！

</details>

<details markdown="1"><summary>实现 `hash`</summary>

补全 `hash` 函数。`hash` 应接受一个字符串 `word` 作为输入，并返回一个正的（“无符号的”，unsigned）`int`。

给你的哈希函数会根据 `word` 的第一个字符，返回一个介于 0 和 25（含）之间的 `int`。不过，除了使用单词的第一个字符（或者说<em>前几个字符</em>）之外，实现哈希函数还有很多方式。可以考虑用 ASCII 值之和或单词长度的哈希函数。好的哈希函数会减少“冲突”（collision），并且（基本上！）在哈希表的各个“桶”之间分布均匀。

</details>

<details markdown="1"><summary>实现 `size`</summary>

补全 `size` 函数。`size` 应返回词典中已加载的单词数。针对这个问题，可以考虑两种方法：

- 在把每个单词加载进词典时就计数。调用 `size` 时返回这个计数。
- 每次调用 `size` 时，遍历哈希表中的单词并数一遍。返回这个计数。

你觉得哪种最高效？无论选哪种，代码都留给你来写。

</details>

<details markdown="1"><summary>实现 `check`</summary>

补全 `check` 函数。如果某个单词在词典中，`check` 应返回 `true`，否则返回 `false`。

想一想，这个问题同样是由更小的问题组成的。如果你已经实现了哈希表，查找一个单词只需要几个步骤：

1. 对单词做哈希，得到它的哈希值
2. 在哈希表中由该单词的哈希值指定的位置进行搜索
   
   1. 如果找到该单词，返回 `true`
3. 如果没有找到单词，返回 `false`

要不区分大小写地比较两个字符串，你可能会觉得 [`strcasecmp`](https://man.cs50.io/3/strcasecmp)（在 `strings.h` 中声明）很有用！你很可能还想确保你的哈希函数不区分大小写，使得 `foo` 和 `FOO` 具有相同的哈希值。

</details>

<details markdown="1"><summary>实现 `unload`</summary>

补全 `unload` 函数。务必在 `unload` 中 `free` 掉你在 `load` 中分配的所有内存！

回忆一下，`valgrind` 是你最新的好朋友。要知道，`valgrind` 是在你的程序实际运行时监视内存泄漏的，所以如果你想让 `valgrind` 在你使用某个特定的 `dictionary` 和/或文本时分析 `speller`，务必提供命令行参数，如下所示。不过最好使用较小的文本，否则 `valgrind` 可能要运行相当长的时间。

```
valgrind ./speller texts/cat.txt
```

如果你运行 `valgrind` 时没有为 `speller` 指定 `text`，你实现的 `load` 和 `unload` 实际上不会被调用（因此也不会被分析）。

如果不确定如何解读 `valgrind` 的输出，尽管向 `help50` 求助：

```
help50 valgrind ./speller texts/cat.txt
```

</details>

## 讲解视频

> <strong>请注意，这个播放列表里有 6 个视频。[在 YouTube 上打开](https://www.youtube.com/playlist?list=PLhQjrBD2T382T4b6jjwX_qbU23E_Unwcz)。</strong>

<!-- video: _z57x5PGF4w -->
[▶ 视频](https://www.youtube.com/watch?v=_z57x5PGF4w)

## 如何测试

如何检查你的程序输出的拼写错误单词是否正确？你可以随意参考“标准答案”，它们位于你的 `speller` 目录下的 `keys` 目录中。例如，`keys/lalaland.txt` 里是你的程序<em>应当</em>认为拼写错误的所有单词。

因此，你可以在一个窗口中对某个文本运行你的程序，如下所示。

```
./speller texts/lalaland.txt
```

然后你可以在另一个窗口中对同一个文本运行课程组的解答，如下所示。

```
./speller50 texts/lalaland.txt
```

然后你可以并排目测比较两个窗口。不过，这很快就会变得乏味。所以你可能更愿意把程序的输出“重定向”（redirect）到文件，如下所示。

```
./speller texts/lalaland.txt > student.txt
./speller50 texts/lalaland.txt > staff.txt
```

然后你可以用 `diff` 这样的程序在同一个窗口中并排比较这两个文件，如下所示。

```
diff -y student.txt staff.txt
```

或者，为了节省时间，你可以不运行课程组的解答，而是直接把你程序的输出（假设你把它重定向到了，比如 `student.txt`）与某个标准答案进行比较，如下所示。

```
diff -y student.txt keys/lalaland.txt
```

如果你程序的输出与课程组的一致，`diff` 会输出两列，除了底部的运行时间之外，这两列应当完全相同。但如果两列有差异，你会在有差异的地方看到 `>` 或 `|`。例如，如果你看到

```
MISSPELLED WORDS                                                MISSPELLED WORDS

TECHNO                                                          TECHNO
L                                                               L
                                                              > Thelonious
Prius                                                           Prius
                                                              > MIA
L                                                               L
```

这意味着你的程序（输出在左边）不认为 `Thelonious` 或 `MIA` 拼写错误，而课程组的输出（在右边）认为它们拼写错误，这从左列没有 `Thelonious` 而右列有 `Thelonious` 就可以看出。

最后，务必同时用默认的大词典和小词典进行测试。小心不要假设，如果你的解答在大词典下成功运行，它在小词典下也会成功运行。下面是尝试小词典的方法：

```
./speller dictionaries/small texts/cat.txt 
```

### 正确性

```
check50 cs50/problems/2026/x/speller
```

### 代码风格

```
style50 dictionary.c
```

## 课程组的解答

如何评估你的代码到底有多快（以及是否正确）？和往常一样，你可以随意试用课程组的解答，如下所示，并把它的数据与你的比较。

```
./speller50 texts/lalaland.txt
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/speller
```
