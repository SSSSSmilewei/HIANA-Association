# Filter

![Harvard Yard in grayscale](https://cs50.harvard.edu/x/psets/4/filter/less/yard-grayscale.bmp)

## 要解决的问题

表示图像最简单的方法，或许就是用一个像素（即点）的网格，其中每个像素可以是不同的颜色。对于黑白图像，我们每个像素只需要 1 位，因为 0 可以表示黑色，1 可以表示白色，如下图所示。

![a simple bitmap](https://cs50.harvard.edu/x/psets/4/filter/less/bitmap.png)

从这个意义上说，图像不过就是一张位图（bitmap，即位的映射）。对于色彩更丰富的图像，你只需要每个像素有更多的位。支持“24 位色”的文件格式（如 [BMP](https://en.wikipedia.org/wiki/BMP_file_format)、[JPEG](https://en.wikipedia.org/wiki/JPEG) 或 [PNG](https://en.wikipedia.org/wiki/Portable_Network_Graphics)）每个像素使用 24 位。（BMP 实际上支持 1 位、4 位、8 位、16 位、24 位和 32 位色。）

24 位 BMP 用 8 位表示像素颜色中红色的量，8 位表示绿色的量，8 位表示蓝色的量。如果你听说过 RGB 颜色，没错，就是它：红（red）、绿（green）、蓝（blue）。

如果 BMP 中某个像素的 R、G、B 值用十六进制表示是 `0xff`、`0x00` 和 `0x00`，那么这个像素就是纯红色，因为 `0xff`（十进制也就是 `255`）意味着“很多红色”，而 `0x00` 和 `0x00` 分别意味着“没有绿色”和“没有蓝色”。在这个问题中，你将操作单个像素的这些 R、G、B 值，最终创造出你自己的图像滤镜。

请在名为 `filter-less` 的文件夹里，一个名为 `helpers.c` 的文件中，编写一个对 BMP 应用滤镜的程序。

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
wget https://cdn.cs50.net/2026/x/psets/4/filter-less.zip
```

把一个名为 `filter-less.zip` 的 ZIP 文件下载到你的 codespace 中。

然后执行

```
unzip filter-less.zip
```

创建一个名为 `filter-less` 的文件夹。你已经不再需要这个 ZIP 文件了，所以可以执行

```
rm filter-less.zip
```

并在提示处输入“y”再按 Enter，删除你下载的 ZIP 文件。

现在输入

```
cd filter-less
```

再按 Enter，进入（也就是打开）该目录。你的提示符现在应该类似下面这样。

```
filter-less/ $
```

单独执行 `ls`，你应该会看到几个文件：`bmp.h`、`filter.c`、`helpers.h`、`helpers.c` 和 `Makefile`。你还应该看到一个文件夹 `images/`，里面有四个 BMP 文件。如果遇到任何问题，再按同样的步骤做一遍，看看哪里出了错！

</details>

## 背景

### 再技术化一点的位图（Bit(map)）

回忆一下，文件不过是按某种方式排列的一串位。因此，24 位 BMP 文件本质上也只是一串位，其中（几乎）每 24 位恰好表示某个像素的颜色。但 BMP 文件还包含一些“元数据”（metadata），比如图像的高度和宽度等信息。这些元数据以两个数据结构的形式存放在文件开头，它们通常被称为“头部”（headers），不要与 C 的头文件混淆。（顺带一提，这些头部随时间发生了演变。这个问题使用的是微软 BMP 格式的最新版本 4.0，它随 Windows 95 首次亮相。）

这些头部中的第一个叫 `BITMAPFILEHEADER`，长 14 字节。（回忆一下，1 字节等于 8 位。）第二个叫 `BITMAPINFOHEADER`，长 40 字节。紧跟在这些头部之后的是真正的位图：一个字节数组，每三个字节表示一个像素的颜色。不过，BMP 把这些三元组倒着存放（即 BGR），先是 8 位蓝色，然后是 8 位绿色，最后是 8 位红色。（有些 BMP 还会把整个位图倒着存放，图像的最上面一行放在 BMP 文件的末尾。但我们存放这个习题集中的 BMP 时采用的是这里描述的方式，每个位图的最上面一行在最前，最下面一行在最后。）换句话说，如果我们把上面那个 1 位的笑脸转换成 24 位的笑脸，用红色代替黑色，24 位 BMP 会这样存储这个位图，其中 `0000ff` 表示红色，`ffffff` 表示白色；我们把所有的 `0000ff` 都用红色高亮了出来。

![red smile](https://cs50.harvard.edu/x/psets/4/filter/less/red_smile.png)

因为我们把这些位按从左到右、从上到下、每行 8 列的方式呈现，你退后一步其实就能看到那个红色的笑脸。

需要说明的是，回忆一下，一个十六进制数字表示 4 位。因此，十六进制的 `ffffff` 实际上表示二进制的 `111111111111111111111111`。

注意，你可以把位图表示为像素的二维数组：图像是一个由行组成的数组，每一行是一个由像素组成的数组。事实上，我们在这个问题中正是选择这样表示位图图像。

### 图像滤镜

对图像做“滤镜”究竟是什么意思？你可以把对图像做滤镜看成是：取某个原始图像的像素，并以某种方式修改每个像素，使得到的图像呈现出某种特定的效果。

## 要求

实现 `helpers.c` 中的函数，使用户可以对他们的图像应用灰度、棕褐色调、翻转或模糊滤镜。

- 函数 `grayscale` 应该接收一张图像，并把它变成同一张图像的黑白版本。
- 函数 `sepia` 应该接收一张图像，并把它变成同一张图像的棕褐色调（sepia）版本。
- 函数 `reflect` 应该接收一张图像，并把它水平翻转。
- 最后，函数 `blur` 应该接收一张图像，并把它变成同一张图像的方框模糊（box blur）版本。

你不应该修改任何函数签名，也不应该修改 `helpers.c` 之外的任何其他文件。

## 提示

<details markdown="1"><summary>理解发行代码</summary>

现在我们来看看作为发行代码提供给你的一些文件，了解其中的内容。

### `bmp.h`

打开 `bmp.h`（比如在文件浏览器中双击它）看一看。

你会看到我们提到过的那些头部（`BITMAPINFOHEADER` 和 `BITMAPFILEHEADER`）的定义。此外，该文件还定义了 `BYTE`、`DWORD`、`LONG` 和 `WORD`，这些是通常出现在 Windows 编程世界里的数据类型。注意它们只不过是你（希望）已经熟悉的基本类型的别名。看来 `BITMAPFILEHEADER` 和 `BITMAPINFOHEADER` 用到了这些类型。

对你来说或许最重要的是，这个文件还定义了一个名为 `RGBTRIPLE` 的 `struct`，它很简单地“封装”了三个字节：一个蓝色、一个绿色和一个红色（回忆一下，这就是我们预期在磁盘上实际找到 RGB 三元组的顺序）。

为什么这些 `struct` 有用呢？嗯，回忆一下，文件不过是磁盘上的一串字节（或者说，归根结底是一串位）。但这些字节通常是这样排列的：前几个表示某样东西，接下来几个表示另一样东西，依此类推。之所以存在“文件格式”，是因为全世界已经标准化了哪些字节表示什么。现在，我们可以把文件从磁盘读到 RAM 中，当作一个大的字节数组。我们可以只记住，位于 `array[i]` 的字节表示某一样东西，而位于 `array[j]` 的字节表示另一样东西。但为什么不给其中一些字节起名字，这样我们就能更容易地从内存中取出它们呢？这正是 `bmp.h` 中的 struct 让我们能够做到的。我们不必把某个文件看成一长串字节，而可以把它看成一串 `struct`。

### `filter.c`

现在，我们打开 `filter.c`。这个文件已经替你写好了，但有几个重点值得在这里指出。

首先，注意第 10 行 `filters` 的定义。这个字符串告诉程序，程序允许的命令行参数有哪些：`b`、`g`、`r` 和 `s`。它们各自指定了我们可能对图像应用的一种不同的滤镜：模糊（blur）、灰度（grayscale）、翻转（reflection）和棕褐色调（sepia）。

接下来的几行打开一个图像文件，确认它确实是 BMP 文件，并把所有像素信息读入一个名为 `image` 的二维数组。

向下滚动到第 101 行开始的 `switch` 语句。注意，根据我们选择的 `filter` 不同，会调用不同的函数：如果用户选择滤镜 `b`，程序就调用 `blur` 函数；如果是 `g`，就调用 `grayscale`；如果是 `r`，就调用 `reflect`；如果是 `s`，就调用 `sepia`。还要注意，这些函数都接受图像的高度、图像的宽度以及像素的二维数组作为参数。

这些就是你（马上！）要实现的函数。你可能想到了，目标是让这些函数各自编辑像素的二维数组，使所需的滤镜被应用到图像上。

程序其余的行则把得到的 `image` 写出到一个新的图像文件中。

### `helpers.h`

接下来，看看 `helpers.h`。这个文件相当短，只是提供了你之前看到的那些函数的函数原型。

在这里，请注意每个函数都接受一个名为 `image` 的二维数组作为参数，其中 `image` 是一个有 `height` 行的数组，每一行本身又是一个有 `width` 个 `RGBTRIPLE` 的数组。所以，如果 `image` 表示整幅图片，那么 `image[0]` 表示第一行，而 `image[0][0]` 表示图像左上角的像素。

### `helpers.c`

现在，打开 `helpers.c`。在 `helpers.h` 中声明的函数的实现就属于这里。但请注意，目前这些实现是缺失的！这部分要由你来完成。

### `Makefile`

最后，我们来看看 `Makefile`。这个文件指明了当我们运行 `make filter` 这样的终端命令时应该发生什么。你以前写过的程序仅限于一个文件，而 `filter` 似乎用到了多个文件：`filter.c` 和 `helpers.c`。所以我们需要告诉 `make` 如何编译这个文件。

试着自己编译 `filter`：到终端里运行

```
$ make filter
```

然后，你可以运行

```
$ ./filter -g images/yard.bmp out.bmp
```

来运行程序，它会读取 `images/yard.bmp` 处的图像，在让像素经过 `grayscale` 函数之后，生成一个名为 `out.bmp` 的新图像。不过 `grayscale` 目前还什么都没做，所以输出的图像应该和原来的 yard 一样。

</details>

<details markdown="1"><summary>实现 `grayscale`</summary>

一个常见的滤镜是“灰度”滤镜，我们把一张图像转换成黑白。这是怎么做到的呢？

- 回忆一下，如果红、绿、蓝的值都设为 `0x00`（`0` 的十六进制），那么这个像素是黑色的。而如果所有值都设为 `0xff`（`255` 的十六进制），那么这个像素是白色的。只要红、绿、蓝的值都相等，结果就会是黑白光谱上深浅不一的灰色，值越大颜色越浅（越接近白色），值越小颜色越深（越接近黑色）。
- 所以要把一个像素转换成灰度，你只需要确保红、绿、蓝的值都是同一个值。但你怎么知道要把它们设成什么值呢？嗯，可以合理地预期：如果原来的红、绿、蓝值都相当高，那么新值也应该相当高。而如果原来的值都很低，那么新值也应该很低。
- 事实上，为了确保新图像的每个像素仍然保持与旧图像大致相同的明暗程度，你可以取红、绿、蓝值的<strong>平均值</strong>，来决定新像素是什么灰度。

如果你对图像中的每个像素都应用上述算法，结果就是一张转换为灰度的图像。写一些伪代码来帮助你解决这个问题。

```
void grayscale(int height, int width, RGBTRIPLE image[height][width])
{
    // Loop over all pixels

        // Take average of red, green, and blue

        // Update pixel values
}
```

首先，你该如何遍历所有像素？回忆一下，图像的像素存储在二维数组 `image` 中。要遍历二维数组，你需要两层循环，一层嵌套在另一层里面。

```
void grayscale(int height, int width, RGBTRIPLE image[height][width])
{
    // Loop over all pixels
    for (int i = 0; i < height; i++)
    {
        for (int j = 0; j < width; j++)
        {
            // Take average of red, green, and blue

            // Update pixel values
        }
    }
}
```

现在，你可以用 `image[i][j]` 访问图像的任何一个像素。但如何求红、绿、蓝各分量的平均值呢？回忆一下，`image` 的每个元素都是一个 `RGBTRIPLE`，它是 `bmp.h` 中定义的、用来表示一个像素的 `struct`。访问 `struct` 成员的常规语法在这里适用：`image[i][j].rgbtRed` 会让你访问到该 `RGBTRIPLE` 的红色值，`image[i][j].rgbtGreen` 会让你访问到它的绿色值，依此类推。

计算平均值时，请记住像素的 `rgbtRed`、`rgbtGreen` 和 `rgbtBlue` 分量都是整数。所以，在把任何浮点数赋给像素值时，一定要把它[四舍五入](https://manual.cs50.io/3/round)到最接近的整数！另外，为什么你可能想用 3.0 而不是 3 去除这些整数之和呢？

一旦你把像素的红、绿、蓝值平均成了最终的灰度颜色，就可以更新像素的红、绿、蓝值了。到现在，你应该已经熟悉赋值的语法了！

</details>

<details markdown="1"><summary>实现 `sepia`</summary>

大多数图像编辑程序都支持“棕褐色调”（sepia）滤镜，它让整张图像看起来有点红棕色，从而赋予图像一种老照片的感觉。

- 把图像转换为棕褐色调的方法是：取每个像素，根据它原来的红、绿、蓝三个值，计算出新的红、绿、蓝值。
- 把图像转换为棕褐色调有许多算法，但在这个问题中，我们要求你使用下面的算法。对于每个像素，棕褐色调的颜色值应该根据原始颜色值按下式计算。

  ```
  sepiaRed = .393 * originalRed + .769 * originalGreen + .189 * originalBlue
  sepiaGreen = .349 * originalRed + .686 * originalGreen + .168 * originalBlue
  sepiaBlue = .272 * originalRed + .534 * originalGreen + .131 * originalBlue
  ```
- 当然，这些公式的结果不一定是整数，但每个值都可以四舍五入到最接近的整数。公式的结果也有可能是大于 255 的数，而 255 是 8 位颜色值的最大值。在这种情况下，红、绿、蓝值应该被限制在 255。这样，我们就能保证最终的红、绿、蓝值是介于 0 到 255（含）之间的整数。

写一些伪代码来帮助你解决这个问题，并回忆一下用嵌套的 `for` 循环访问每个像素的做法。

```
void sepia(int height, int width, RGBTRIPLE image[height][width])
{
    // Loop over all pixels
    for (int i = 0; i < height; i++)
    {
        for (int j = 0; j < width; j++)
        {
            // Compute sepia values

            // Update pixel with sepia values
        }
    }
}
```

要计算 `sepia` 的值，请重温上面的要点。你有了计算棕褐色调值的公式，但仍有几个需要注意的地方。具体来说，你需要……

- 把每次计算的结果四舍五入到最接近的整数
- 确保得到的值不大于 255

在实现 `sepia` 时，尤其是需要确保某个颜色的值不超过 255 时，一个返回两个整数中较小者的函数能怎样派上用场呢？欢迎你（但不强制）自己写一个辅助函数来做这件事！

</details>

<details markdown="1"><summary>实现 `reflect`</summary>

有些滤镜还可能移动像素。例如，翻转图像这种滤镜，得到的图像就好像你把原始图像放在镜子前所看到的那样。

- 图像左侧的任何像素最终都应该出现在右侧，反之亦然。
- 请注意，原始图像的所有像素在翻转后的图像中仍然存在，只不过这些像素可能被重新排列到了图像中的不同位置。

因此，在 `reflect` 函数中，你需要交换一行中位于相对两侧的像素的值。写一些伪代码帮助你开始：

```
void reflect(int height, int width, RGBTRIPLE image[height][width])
{
    // Loop over all pixels
    for (int i = 0; i < height; i++)
    {
        for (int j = 0; j < width; j++)
        {
            // Swap pixels
        }
    }
}
```

回忆一下我们在课上是如何用临时变量实现两个值的交换的。除非你愿意，否则不必为交换单独写一个函数！

现在正是思考你的嵌套 `for` 循环的好时机。外层 `for` 循环遍历每一行，而内层 `for` 循环遍历该行中的每个像素。不过，要成功翻转一行，你需要遍历其中的每个像素吗？

</details>

<details markdown="1"><summary>实现 `blur`</summary>

有许多方法可以制造出模糊或柔化图像的效果。在这个问题中，我们将使用“方框模糊”（box blur），它的原理是：对每个像素，针对每个颜色值，通过对相邻像素的颜色值取平均，给它一个新值。

- 考虑下面这个像素网格，其中我们给每个像素编了号。

  ![a grid of pixels](https://cs50.harvard.edu/x/psets/4/filter/less/grid.png)
- 每个像素的新值将是在原像素上下左右 1 行 1 列范围内（构成一个 3x3 的方框）的所有像素的值的平均数。例如，像素 6 的每个颜色值，都是通过对像素 1、2、3、5、6、7、9、10 和 11 的原始颜色值取平均得到的（注意像素 6 本身也包含在平均之中）。同样，像素 11 的颜色值是通过对像素 6、7、8、10、11、12、14、15 和 16 的颜色值取平均得到的。
- 对于位于边缘或角落的像素，比如像素 15，我们仍然寻找 1 行 1 列范围内的所有像素：在这个例子中，是像素 10、11、12、14、15 和 16。

在实现 `blur` 函数时，你可能会发现，对一个像素做模糊最终会影响另一个像素的模糊。最好的办法或许是创建 `image` 的一份副本，用类似 `RGBTRIPLE copy[height][width];` 的代码声明一个新的二维数组。然后用嵌套的 `for` 循环，逐像素地把 `image` 复制到 `copy` 中，像这样：

```
void blur(int height, int width, RGBTRIPLE image[height][width])
{
    // Create a copy of image
    RGBTRIPLE copy[height][width];
    for (int i = 0; i < height; i++)
    {
        for (int j = 0; j < width; j++)
        {
            copy[i][j] = image[i][j];
        }
    }
}
```

现在，你可以从 `copy` 中读取像素的颜色，而把像素的颜色写入（即修改）`image` 中！

</details>

## 讲解视频

<strong>请注意，这个播放列表中有 5 个视频。[在 YouTube 上打开](https://www.youtube.com/playlist?list=PLhQjrBD2T3837jmUt0ep7Tpmnxdv9NVut)。</strong>

<!-- video: K0v9byp9jd0 -->
[▶ 视频](https://www.youtube.com/watch?v=K0v9byp9jd0)

## 如何测试

请务必在提供的示例位图文件上测试你所有的滤镜！

### 正确性

```
check50 cs50/problems/2026/x/filter/less
```

### 代码风格

```
style50 helpers.c
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/filter/less
```
