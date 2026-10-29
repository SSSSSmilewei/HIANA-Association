# Volume

![WAV file waveform](https://cs50.harvard.edu/x/psets/4/volume/wav_file.png)

## 要解决的问题

[WAV 文件](https://docs.fileformat.com/audio/wav/)是一种表示音频的常见文件格式。WAV 文件把音频存储为一系列“采样”（samples）：即表示某个音频信号在特定时间点取值的数字。WAV 文件以一个 44 字节的“头部”（header）开始，其中包含关于文件本身的信息，包括文件大小、每秒的采样数以及每个采样的大小。头部之后，WAV 文件包含一系列采样，每个采样是一个单独的 2 字节（16 位）整数，表示音频信号在特定时间点的取值。

把每个采样值按给定的系数缩放，就能改变音频的音量。例如，把每个采样值乘以 2.0，会使原始音频的音量加倍。而把每个采样乘以 0.5，则会使音量减半。

请在名为 `volume` 的文件夹里，一个名为 `volume.c` 的文件中，编写一个修改音频文件音量的程序。

## 演示

## 发行代码

在这个问题中，你要扩展由 CS50 教学团队提供的代码的功能。

<details markdown="1"><summary>下载发行代码</summary>

登录 [cs50.dev](https://cs50.dev/)，点击你的终端窗口，然后单独执行 `cd`。你应该会发现终端窗口的提示符类似下面这样：

```
$
```

接着执行

```
wget https://cdn.cs50.net/2026/x/psets/4/volume.zip
```

把一个名为 `volume.zip` 的 ZIP 文件下载到你的 codespace 中。

然后执行

```
unzip volume.zip
```

创建一个名为 `volume` 的文件夹。你已经不再需要这个 ZIP 文件了，所以可以执行

```
rm volume.zip
```

并在提示处输入“y”再按 Enter，删除你下载的 ZIP 文件。

现在输入

```
cd volume
```

再按 Enter，进入（也就是打开）该目录。你的提示符现在应该类似下面这样。

```
volume/ $
```

如果一切顺利，你应该执行

```
ls
```

并看到一个名为 `volume.c` 的文件。执行 `code volume.c` 应该会打开这个文件，你将在其中输入这道习题的代码。如果没有，请回头检查你的步骤，看看哪里出了错！

</details>

## 实现细节

完成 `volume.c` 的实现，使它能按给定的系数改变声音文件的音量。

- 该程序应该接受三个命令行参数。第一个是

  input

  ，表示原始音频文件的名称。第二个是

  output

  ，表示要生成的新音频文件的名称。第三个是

  factor

  ，表示原始音频文件的音量应该缩放的倍数。

  - 例如，如果 `factor` 是 `2.0`，那么你的程序应该把 `input` 中的音频文件音量加倍，并把新生成的音频文件保存到 `output` 中。
- 你的程序应该先从输入文件中读取头部，并把头部写入输出文件。
- 然后，你的程序应该读取 WAV 文件中的其余数据，每次读取一个 16 位（2 字节）的采样。你的程序应该把每个采样乘以

  factor

  ，并把新的采样写入输出文件。

  - 你可以假定 WAV 文件使用 16 位有符号值作为采样。实际上，WAV 文件每个采样的位数可能不同，但在这个问题中我们假定采样是 16 位的。
- 如果你的程序使用了 `malloc`，就不能有任何内存泄漏。

## 提示

<details markdown="1"><summary>理解 `volume.c` 中的代码</summary>

首先注意，`volume.c` 已经设置好接受三个命令行参数 `input`、`output` 和 `factor`。

- `main` 同时接受一个 `int` 类型的 `argc` 和一个由 `char *`（字符串！）组成的数组 `argv`。
- 如果 `argc`（命令行中包括程序本身在内的参数个数）不等于 4，程序会打印正确的用法，并以状态码 1 退出。

```
int main(int argc, char *argv[])
{
    // Check command-line arguments
    if (argc != 4)
    {
        printf("Usage: ./volume input.wav output.wav factor\n");
        return 1;
    }

    // ...
}
```

接下来，`volume.c` 使用 [`fopen`](https://manual.cs50.io/3/fopen) 打开作为命令行参数提供的两个文件。

- 最佳做法是检查调用 `fopen` 的结果是否为 `NULL`。如果是，说明文件没找到或无法打开。

```
// Open files and determine scaling factor
FILE *input = fopen(argv[1], "r");
if (input == NULL)
{
    printf("Could not open file.\n");
    return 1;
}

FILE *output = fopen(argv[2], "w");
if (output == NULL)
{
    printf("Could not open file.\n");
    return 1;
}
```

稍后，这些文件会用 `fclose` 关闭。每当你调用 `fopen`，之后都应该调用 `fclose`！

```
// Close files
fclose(input);
fclose(output);
```

不过，在关闭文件之前，注意我们还有几个 TODO。

```
// TODO: Copy header from input file to output file

// TODO: Read samples from input file and write updated data to output file
```

你很可能需要知道音量缩放的系数，所以 `volume.c` 已经替你把第三个命令行参数转换成了 `float`！

```
float factor = atof(argv[3]);
```

</details>

<details markdown="1"><summary>把 WAV 头部从输入文件复制到输出文件</summary>

你的第一个 TODO 是把 WAV 文件头部从 `input` 复制出来，写入 `output`。不过，首先你需要了解几种特殊的数据类型。

到目前为止，我们在 C 中已经见过许多不同的类型，包括 `int`、`bool`、`char`、`double`、`float` 和 `long`。不过，在名为 `stdint.h` 的头文件里，还声明了许多<em>其他</em>类型，它们让我们能非常精确地定义整数的大小（以位计）和符号（有符号或无符号）。其中有两种类型在处理 WAV 文件时会特别有用：

- `uint8_t` 是一种存储 8 位（所以是 `8`！）无符号（即非负）整数（所以是 `uint`！）的类型。我们可以把 WAV 文件头部的每个字节当作一个 `uint8_t` 值。
- `int16_t` 是一种存储 16 位有符号（即正数或负数）整数的类型。我们可以把 WAV 文件中的每个音频采样当作一个 `int16_t` 值。

你很可能想创建一个字节数组，来存储你要从输入文件中读取的 WAV 文件头部数据。用 `uint8_t` 类型表示一个字节，你可以用类似下面的语法，为头部创建一个包含 `n` 个字节的数组

```
uint8_t header[n];
```

把 `n` 替换成字节数即可。然后你可以把 `header` 作为参数传给 [`fread`](https://manual.cs50.io/3/fread) 或 [`fwrite`](https://manual.cs50.io/3/fwrite)，向 header 读入或从中写出。

回忆一下，WAV 文件的头部总是恰好 44 字节长。注意，`volume.c` 已经替你定义了一个名为 `HEADER_SIZE` 的变量，它等于头部的字节数。

下面是个相当大的提示，不过这就是你完成这个 TODO 的一种做法！

```
// Copy header from input file to output file
uint8_t header[HEADER_SIZE];
fread(header, HEADER_SIZE, 1, input);
fwrite(header, HEADER_SIZE, 1, output);
```

</details>

<details markdown="1"><summary>把更新后的数据写入输出文件</summary>

你的下一个 TODO 是从 `input` 读取采样，更新这些采样，并把更新后的采样写入 `output`。读取文件时，常见的做法是创建一个“缓冲区”（buffer），用来临时存放数据。在那里你可以修改数据，等准备好之后，再把缓冲区的数据写入新文件。

回忆一下，我们可以用 `int16_t` 类型表示 WAV 文件的一个采样。因此，要存储一个音频采样，你可以用类似下面的语法创建一个缓冲区变量：

```
// Create a buffer for a single sample
int16_t buffer;
```

有了存放采样的缓冲区，你现在可以每次一个采样地把数据读进去。试试用 `fread` 来完成这个任务！你可以把 `buffer` 的地址 `&buffer` 作为参数传给 `fread` 或 `fwrite`，向缓冲区读入或从中写出。（回忆一下，`&` 运算符用来获取变量的地址。）

```
// Create a buffer for a single sample
int16_t buffer;

// Read single sample into buffer
fread(&buffer, sizeof(int16_t), 1, input);
```

现在，要增大（或减小）一个采样的音量，你只需要把它乘以某个系数。

```
// Create a buffer for a single sample
int16_t buffer;

// Read single sample into buffer
fread(&buffer, sizeof(int16_t), 1, input);

// Update volume of sample
buffer *= factor;
```

最后，你可以把更新后的采样写入 `output`：

```
// Create a buffer for a single sample
int16_t buffer;

// Read single sample from input into buffer
fread(&buffer, sizeof(int16_t), 1, input);

// Update volume of sample
buffer *= factor;

// Write updated sample to new file
fwrite(&buffer, sizeof(int16_t), 1, output);
```

只有一个问题：只要还有采样可读，你就需要<em>继续</em>把一个采样读入缓冲区、更新它的音量，并把更新后的采样写入输出文件。

- 幸好，根据文档，`fread` 会返回成功读取的数据项个数。你可能会发现，这对检查是否已经读到文件末尾很有用！
- 请记住，你完全可以在

  while

  循环的条件中调用

  fread

  。例如，你可以像下面这样调用

  fread

  ：

  ```
  while (fread(...))
  {

  }
  ```

这提示相当明显了，不过下面是解决这个问题的一种高效写法：

```
// Create a buffer for a single sample
int16_t buffer;

// Read single sample from input into buffer while there are samples left to read
while (fread(&buffer, sizeof(int16_t), 1, input) != 0)
{
    // Update volume of sample
    buffer *= factor;

    // Write updated sample to new file
    fwrite(&buffer, sizeof(int16_t), 1, output);
}
```

因为你所用的 C 版本把非零值当作 `true`，把零值当作 `false`，所以你可以把上面的语法简化成下面这样：

```
// Create a buffer for a single sample
int16_t buffer;

// Read single sample from input into buffer while there are samples left to read
while (fread(&buffer, sizeof(int16_t), 1, input))
{
    // Update volume of sample
    buffer *= factor;

    // Write updated sample to new file
    fwrite(&buffer, sizeof(int16_t), 1, output);
}
```

</details>

## 讲解视频

<!-- video: LiGhjz9ColQ -->
[▶ 视频](https://www.youtube.com/watch?v=LiGhjz9ColQ)

<details markdown="1"><summary>不知道怎么解决？</summary>

</details>

## 如何测试

你的程序应该按下面的例子运行。

```
$ ./volume input.wav output.wav 2.0
```

当你听 `output.wav` 时（比如在文件浏览器中按住 control 点击 `output.wav`，选择 <strong>Download</strong>，然后在你电脑上的音频播放器中打开该文件），它的音量应该是 `input.wav` 的两倍！

```
$ ./volume input.wav output.wav 0.5
```

当你听 `output.wav` 时，它的音量应该是 `input.wav` 的一半！

### 正确性

```
check50 cs50/problems/2026/x/volume
```

### 代码风格

```
style50 volume.c
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/volume
```
