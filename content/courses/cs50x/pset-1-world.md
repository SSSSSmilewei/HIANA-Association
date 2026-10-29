# Hello, World

<!-- video: ufB53UE2Cvo -->
[▶ 视频](https://www.youtube.com/watch?v=ufB53UE2Cvo)

## 要解决的问题

多亏了 [Brian Kernighan](https://en.wikipedia.org/wiki/Brian_Kernighan) 教授（David 上 CS50 时就是他在教！），“hello, world” 已经被数百种语言实现过。让我们把你的实现也加进这个名单吧！

在名为 `world` 的文件夹中，创建名为 `hello.c` 的文件，用 C 语言实现一个程序，打印 `hello, world\n`，仅此而已！

<details markdown="1"><summary>提示</summary>

这就是你该写的实际代码！（这提示够直接了吧？）不过最好自己敲一遍，不要复制粘贴，这样你就能开始培养写代码的“肌肉记忆”。

```
#include <stdio.h>

int main(void)
{
    printf("hello, world\n");
}
```

</details>

## 演示

下面演示了编译并执行你的程序时应该出现的情况。

## 如何开始

在终端窗口中单独执行 `cd`。你应该会发现终端的提示符类似下面这样：

```
$
```

接着执行

```
mkdir world
```

在你的 codespace 中创建一个名为 `world` 的文件夹。

然后执行

```
cd world
```

切换到该文件夹。此时你应该看到终端提示符变成了 `world/ $`。现在你可以执行

```
code hello.c
```

来创建名为 `hello.c` 的文件，你可以在其中编写代码。

## 如何测试

回忆一下，你可以这样编译 `hello.c`：

```
make hello
```

如果没有看到错误信息，就说明编译成功了！你可以用

```
ls
```

来确认，它应该不仅列出 `hello.c`（源代码），还会列出 `hello`（机器码）。

如果看到了错误信息，请尝试修复代码并重新编译。如果你看不懂错误信息，就看它的下方：如果 `help50` 认得这个错误，会用黄色字给出提示；你也可以点击终端窗口顶部的 <strong>help50</strong> 按钮，向小鸭子求助。

代码编译成功后，你可以这样执行程序：

```
./hello
```

### 正确性

执行下面的命令，用 `check50` 评估你代码的正确性。这是一个命令行程序，你的代码每通过一项 CS50 的自动化测试，它就会输出一张笑脸，没通过就输出一张哭脸！

```
check50 cs50/problems/2026/x/world
```

### 代码风格

执行下面的命令，用 `style50` 评估你代码的风格。这是一个命令行程序，它会输出为改善风格你应该对程序做出的添加（绿色）和删除（红色）。如果你分辨不清这些颜色，`style50` 也支持其他[模式](https://cs50.readthedocs.io/style50/)！

```
style50 hello.c
```

## 如何提交

这道题不需要提交！只是一个练习！
