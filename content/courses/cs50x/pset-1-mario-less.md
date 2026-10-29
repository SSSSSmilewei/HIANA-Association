# Mario

<!-- video: cWOkHQXw0JQ -->
[▶ 视频](https://www.youtube.com/watch?v=cWOkHQXw0JQ)

## 要解决的问题

在任天堂的[《超级马力欧兄弟》](https://en.wikipedia.org/wiki/Super_Mario_Bros.)第 1-1 关接近结尾处，马力欧必须爬上一座右对齐的砖块金字塔，如下图所示。

![screenshot of Mario jumping up a right-aligned pyramid](https://cs50.harvard.edu/x/psets/1/mario/less/pyramid.png)

在名为 `mario-less` 的文件夹中，创建名为 `mario.c` 的文件，用 C 语言实现一个程序，用井号（`#`）当作砖块来重现那个金字塔，如下所示：

```
       #
      ##
     ###
    ####
   #####
  ######
 #######
########
```

不过要提示用户输入一个 `int` 作为金字塔的实际高度，这样程序也能输出更矮的金字塔，比如下面这个：

```
  #
 ##
###
```

如果用户的输入不大于 0，或者根本不是 `int`，就一次又一次地重新提示，直到输入合格为止。

<details markdown="1"><summary>提示</summary>

- 回忆一下，你可以用 `get_int` 从用户那里获得一个 `int`，它声明在 `cs50.h` 中。
- 回忆一下，你可以用 `printf` 打印一个 `string`，它声明在 `stdio.h` 中。

</details>

## 演示

## 建议

<details markdown="1"><summary>先写一些你确定能编译的代码</summary>

虽然这个程序什么都不会做，但至少应该能用 `make` 编译通过！

```
#include <cs50.h>
#include <stdio.h>

int main(void)
{

}
```

</details>

<details markdown="1"><summary>在写更多代码之前先写一些伪代码</summary>

如果不确定怎么解决问题本身，就把它拆成你多半能先解决的小问题。例如，这道题其实是两个问题：

1. 提示用户输入金字塔的高度
2. 打印该高度的金字塔

所以写一些伪代码作为注释，提醒自己做这两件事：

```
#include <cs50.h>
#include <stdio.h>

int main(void)
{
    // Prompt the user for the pyramid's height

    // Print a pyramid of that height
}
```

</details>

<details markdown="1"><summary>把伪代码转换成代码</summary>

首先，考虑如何提示用户输入金字塔的高度。回忆一下，当你想让某件事至少做一次、并且可能一遍又一遍地做时，`do while` 循环就很有用，如下所示：

```
#include <cs50.h>
#include <stdio.h>

int main(void)
{
    // Prompt the user for the pyramid's height
    int n;
    do
    {
        n = get_int("Height: ");
    }
    while (n < 1);

    // Print a pyramid of that height
}
```

其次，考虑如何从上到下打印该高度的金字塔。注意第一行应该有一块砖，第二行应该有两块砖，依此类推。即使你还（暂时！）不确定循环里该放什么，你多半也会需要一个循环，如下所示。所以先把更多伪代码作为注释加进去：

```
#include <cs50.h>
#include <stdio.h>

int main(void)
{
    // Prompt the user for the pyramid's height
    int n;
    do
    {
        n = get_int("Height: ");
    }
    while (n < 1);

    // Print a pyramid of that height
    for (int i = 0; i < n; i++)
    {
        // Print row of bricks
    }
}
```

怎么打印那一行砖块呢？要是有一个叫 `print_row` 的函数正好能做这件事，岂不是很好？我们假设有这样一个函数：

```
#include <cs50.h>
#include <stdio.h>

void print_row(int bricks);

int main(void)
{
    // Prompt the user for the pyramid's height
    int n;
    do
    {
        n = get_int("Height: ");
    }
    while (n < 1);

    // Print a pyramid of that height
    for (int i = 0; i < n; i++)
    {
        // Print row of bricks
    }
}

void print_row(int bricks)
{
    // Print row of bricks
}
```

然后我们就可以在 `main` 中调用这个函数，如下所示：

```
#include <cs50.h>
#include <stdio.h>

void print_row(int bricks);

int main(void)
{
    // Prompt the user for the pyramid's height
    int n;
    do
    {
        n = get_int("Height: ");
    }
    while (n < 1);

    // Print a pyramid of that height
    for (int i = 0; i < n; i++)
    {
        // Print row of bricks
        print_row(i + 1);
    }
}

void print_row(int bricks)
{
    // Print row of bricks
}
```

不过，为什么是 `i + 1` 呢？

现在来实现 `print_row`：

```
#include <cs50.h>
#include <stdio.h>

void print_row(int bricks);

int main(void)
{
    // Prompt the user for the pyramid's height
    int n;
    do
    {
        n = get_int("Height: ");
    }
    while (n < 1);

    // Print a pyramid of that height
    for (int i = 0; i < n; i++)
    {
        // Print row of bricks
        print_row(i + 1);
    }
}

void print_row(int bricks)
{
    for (int i = 0; i < bricks; i++)
    {
        printf("#");
    }
    printf("\n");
}
```

不过，末尾为什么要有 `\n` 呢？

可惜，这段代码打印的是左对齐的金字塔，而你需要的是右对齐的！也许我们应该在某些砖块前面打印一些空格，把它们推到右边？让我们按下面的方式修改 `print_row`，让它既能打印空格也能打印砖块：

```
#include <cs50.h>
#include <stdio.h>

void print_row(int spaces, int bricks);

int main(void)
{
    // Prompt the user for the pyramid's height
    int n;
    do
    {
        n = get_int("Height: ");
    }
    while (n < 1);

    // Print a pyramid of that height
    for (int i = 0; i < n; i++)
    {
        // Print row of bricks
    }
}

void print_row(int spaces, int bricks)
{
    // Print spaces

    // Print bricks
}
```

现在 `main` 和 `print_row` 中都还剩一些伪代码，这就留给你来完成了！

还可以考虑，能不能把 `main` 中的一部分代码提取到一个 `get_height` 函数里，让它返回你需要的 `int`！

</details>

## 讲解视频

> 注意，这个讲解视频规定你的程序应该提示用户输入金字塔的高度，并且在用户输入小于 1 或大于 8 的值时<em>重新</em>提示。而题目要求只需要你在用户输入小于 1 的值时重新提示。

<!-- video: NAs4FIWkJ4s -->
[▶ 视频](https://www.youtube.com/watch?v=NAs4FIWkJ4s)

## 如何测试

当你输入下面这些内容时，你的代码是否按要求工作：

- `-1` 或其他负数？
- `0`？
- `1` 或其他正数？
- 字母或单词？
- 什么都不输入，只按回车？

### 正确性

```
check50 cs50/problems/2026/x/mario/less
```

### 代码风格

```
style50 mario.c
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/mario/less
```
