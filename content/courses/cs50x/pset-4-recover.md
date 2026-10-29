# Recover

![Recovered image](https://cs50.harvard.edu/x/psets/4/recover/recovered_image.png)

## 要解决的问题

为了这道题，我们过去几天一直在校园里拍照，所有照片都以 JPEG 的形式保存在数码相机的存储卡上。不幸的是，我们不知怎么把它们全删了！好在，在计算机的世界里，“删除”往往与其说是“删掉了”，不如说是“忘记了”。尽管相机坚称这张卡现在是空的，但我们很确定事实并非如此。事实上，我们希望（呃，是期待！）你能写出一个程序，替我们把照片找回来！

请在名为 `recover` 的文件夹里，一个名为 `recover.c` 的文件中，编写一个从存储卡中恢复 JPEG 的程序。

## 发行代码

在这个问题中，你要扩展由 CS50 教学团队提供的代码的功能。

<details markdown="1"><summary>下载发行代码</summary>

登录 [cs50.dev](https://cs50.dev/)，点击你的终端窗口，然后单独执行 `cd`。你应该会发现终端窗口的提示符类似下面这样：

```
$
```

接着执行

```
wget https://cdn.cs50.net/2026/x/psets/4/recover.zip
```

把一个名为 `recover.zip` 的 ZIP 文件下载到你的 codespace 中。

然后执行

```
unzip recover.zip
```

创建一个名为 `recover` 的文件夹。你已经不再需要这个 ZIP 文件了，所以可以执行

```
rm recover.zip
```

并在提示处输入“y”再按 Enter，删除你下载的 ZIP 文件。

现在输入

```
cd recover
```

再按 Enter，进入（也就是打开）该目录。你的提示符现在应该类似下面这样。

```
recover/ $
```

单独执行 `ls`，你应该会看到两个文件：`recover.c` 和 `card.raw`。

</details>

## 背景

尽管 JPEG 比 BMP 复杂，但 JPEG 有“签名”（signatures），也就是可以把它们与其他文件格式区分开的字节模式。具体来说，JPEG 的前三个字节是

```
0xff 0xd8 0xff
```

从第一个字节到第三个字节，从左到右。而第四个字节则是 `0xe0`、`0xe1`、`0xe2`、`0xe3`、`0xe4`、`0xe5`、`0xe6`、`0xe7`、`0xe8`、`0xe9`、`0xea`、`0xeb`、`0xec`、`0xed`、`0xee` 或 `0xef` 之一。换句话说，第四个字节的前四位是 `1110`。

很可能，如果你在已知用来存储照片的介质（比如我的存储卡）上发现这四个字节的模式，它们就标示着一张 JPEG 的开始。公平地说，在某些磁盘上，你也可能纯属巧合地遇到这些模式，所以数据恢复并不是一门精确的科学。

幸运的是，数码相机往往把照片连续地存储在存储卡上，也就是说，每张照片紧挨着前一张拍摄的照片存储。因此，一张 JPEG 的开头通常标示着另一张的结尾。不过，数码相机通常用 FAT 文件系统初始化存储卡，其“块大小”（block size）为 512 字节（B）。这意味着这些相机只会以 512 B 为单位向这些卡写入数据。因此，一张 1 MB（即 1,048,576 B）的照片在存储卡上占用 1048576 ÷ 512 = 2048 个“块”。但一张比它小一个字节（即 1,048,575 B）的照片也同样占用 2048 个块！磁盘上被浪费的这部分空间叫作“松弛空间”（slack space）。取证调查人员常常查看松弛空间，寻找可疑数据的残留。

所有这些细节意味着，你作为调查人员，很可能可以写出一个程序，遍历我的存储卡的一份副本，寻找 JPEG 的签名。每当你找到一个签名，就可以打开一个新文件用于写入，并开始用我的存储卡中的字节填充这个文件，直到遇到下一个签名时才关闭该文件。此外，为了效率，你不必每次只读取我存储卡中的一个字节，而是可以每次把 512 个字节读入一个缓冲区。多亏了 FAT，你可以相信 JPEG 的签名是“块对齐”的。也就是说，你只需要在每个块的前四个字节里寻找这些签名。

当然，要意识到 JPEG 可以跨越相邻的多个块。否则，就没有 JPEG 能大于 512 B 了。但是 JPEG 的最后一个字节不一定恰好落在一个块的最末尾。回想一下松弛空间的可能性。不过不用担心。因为这张存储卡在我开始拍照时是全新的，它很可能已经被厂商“清零”了（即用 0 填满），这样的话，任何松弛空间都会被 0 填满。这些尾部的 0 最终留在你恢复的 JPEG 里也没关系；它们仍然应该能够正常查看。

现在，我只有一张存储卡，但你们人数众多！所以我已经事先创建了这张卡的“取证镜像”（forensic image），把它的内容逐字节地存储在一个名为 `card.raw` 的文件中。为了让你不必白白浪费时间遍历数百万个 0，我只对存储卡的前几兆字节做了镜像。但你最终应该会发现，这份镜像里包含 50 张 JPEG。

## 要求

实现一个名为 `recover` 的程序，从取证镜像中恢复 JPEG。

- 在名为 `recover` 的目录下的一个名为 `recover.c` 的文件中实现你的程序。
- 你的程序应该恰好接受一个命令行参数，即要从中恢复 JPEG 的取证镜像的名称。
- 如果你的程序运行时没有恰好带一个命令行参数，它应该提醒用户正确的用法，并且 `main` 应该返回 `1`。
- 如果取证镜像无法以读取方式打开，你的程序应该告知用户，并且 `main` 应该返回 `1`。
- 你生成的每个文件都应该命名为 `###.jpg`，其中 `###` 是一个三位十进制数，第一张图像从 `000` 开始，依次递增。
- 如果你的程序使用了 `malloc`，就不能有任何内存泄漏。

## 提示

<details markdown="1"><summary>在写更多代码之前，先写一些伪代码</summary>

如果不确定怎么解决大问题，就把它分解成你大概能先解决的小问题。例如，这个问题其实只是几个小问题：

1. 接受一个命令行参数：存储卡的名称
2. 打开存储卡
3. 只要存储卡中还有数据可读

   1. 用这些数据创建 JPEG

我们把一些伪代码写成注释，提醒你这样去做：

```
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char *argv[])
{
    // Accept a single command-line argument

    // Open the memory card

    // While there's still data left to read from the memory card

        // Create JPEGs from the data
}
```

</details>

<details markdown="1"><summary>把伪代码转换成代码</summary>

首先，考虑如何接受一个命令行参数。如果用户错误地使用了程序，你应该告诉他们程序的正确用法。

```
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char *argv[])
{
    // Accept a single command-line argument
    if (argc != 2)
    {
        printf("Usage: ./recover FILE\n");
        return 1;
    }

    // Open the memory card

    // While there's still data left to read from the memory card

        // Create JPEGs from the data
}
```

既然已经检查了用法是否正确，你就可以打开存储卡了。请记住，你可以像下面这样，用 `fopen` 以编程方式打开 `card.raw`。

```
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char *argv[])
{
    // Accept a single command-line argument
    if (argc != 2)
    {
        printf("Usage: ./recover FILE\n");
        return 1;
    }

    // Open the memory card
    FILE *card = fopen(argv[1], "r");

    // While there's still data left to read from the memory card

        // Create JPEGs from the data
}
```

当然，你应该检查文件是否被正确打开！如果没有，告诉用户并退出程序：这部分就留给你自己了。

接下来，你的程序应该从你打开的存储卡中读取数据，直到没有数据可读为止。在这个过程中，你的程序应该从 `card.raw` 中恢复每一张 JPEG，把每张都存成当前工作目录下的一个单独文件。

首先考虑如何把 `card.raw` 从头到尾读完。回忆一下，要从文件中读取数据，你需要把数据临时存放在一个“缓冲区”里。还要回忆，`card.raw` 以 512 字节为一块来存储数据。因此，你很可能想创建一个 512 字节的缓冲区，在按顺序读取数据时存放每一块。一种做法是使用 `stdint.h` 中的 `uint8_t` 类型，它恰好存储 8 位（1 字节）。这个类型之所以叫 `uint8_t`，是因为它存储的是需要 8 位空间（即一个字节）的无符号/正数/非负整数。

```
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char *argv[])
{
    // Accept a single command-line argument
    if (argc != 2)
    {
        printf("Usage: ./recover FILE\n");
        return 1;
    }

    // Open the memory card
    FILE *card = fopen(argv[1], "r");

    // Create a buffer for a block of data
    uint8_t buffer[512];

    // While there's still data left to read from the memory card

        // Create JPEGs from the data
}
```

不过，在这里把 512 当作[“魔法数字”](https://cs50.harvard.edu/x/shorts/magic_numbers/)可能<em>不是</em>个好主意。你很可能可以进一步改进这个设计！

现在，考虑如何从存储卡中读取数据。根据它的[手册页](https://man.cs50.io/3/fread)，`fread` 返回它读取的字节数，既然 `card.raw` 包含若干个 512 字节的块，它应该要么返回 `512`，要么返回 `0`。为了读取 `card.raw` 中的每一块，用 `fopen` 打开它之后，使用像下面这样的循环就足够了。

```
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char *argv[])
{
    // Accept a single command-line argument
    if (argc != 2)
    {
        printf("Usage: ./recover FILE\n");
        return 1;
    }

    // Open the memory card
    FILE *card = fopen(argv[1], "r");

    // Create a buffer for a block of data
    uint8_t buffer[512];

    // While there's still data left to read from the memory card
    while (fread(buffer, 1, 512, card) == 512)
    {
        // Create JPEGs from the data

    }
}
```

这样，一旦 `fread` 返回 `0`（实际上相当于 `false`），你的循环就会结束。

最后，在你继续读取 `card.raw` 的过程中，如何以编程方式创建 JPEG，就由你来决定了。为此，你可能会发现下面的[讲解视频](/courses/cs50x/learn/pset-4-recover#walkthrough)对你有用。

请记住，你的程序应该给输出的文件编号，把每个都命名为 `###.jpg`，其中 `###` 是从 `000` 开始往上的三位十进制数。去和 [`sprintf`](https://man.cs50.io/3/sprintf) 交个朋友吧，注意 `sprintf` 会把一个格式化的字符串存储到内存中的某个位置。既然 JPEG 的文件名规定了 `###.jpg` 这种格式，你应该为这个字符串分配多少字节？（别忘了 NUL 字符！）

要检查你的程序吐出来的 JPEG 是否正确，只需双击看一看！如果每张照片都完好无损，你的操作很可能就成功了！

当然，还要记得对你用 `fopen` 打开的每个文件调用 `fclose`！

</details>

<details markdown="1"><summary>保持工作目录整洁</summary>

你的代码初稿吐出来的 JPEG 很可能不会是正确的。（如果你打开它们什么也看不到，它们大概就是不正确的！）执行下面的命令，删除当前工作目录中的所有 JPEG。

```
rm *.jpg
```

如果你不想每次删除都被提示确认，可以改为执行下面的命令。

```
rm -f *.jpg
```

使用那个 `-f` 开关时要小心，因为它会“强制”删除，而不会提示你。

</details>

## 讲解视频

<!-- video: ooL0r_8N9ms -->
[▶ 视频](https://www.youtube.com/watch?v=ooL0r_8N9ms)

## 如何测试

### 运行程序

```
./recover card.raw
```

### 正确性

```
check50 cs50/problems/2026/x/recover
```

### 代码风格

```
style50 recover.c
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/recover
```
