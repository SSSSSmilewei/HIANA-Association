# 第 4 讲

## 欢迎！

- 今天，我们要拿掉你刚开始学这门课时用的许多“辅助轮”。
- 前几周，我们谈到图像是由叫做像素的更小的构件组成的。
- 这一周，我们会进一步深入探讨组成这些图像的 0 和 1。具体来说，我们会更深入地了解构成文件（包括图像）的基本构件。
- 此外，我们还会讨论如何访问存储在计算机内存中的底层数据。
- 在开始之前请知道，本讲涉及的概念可能需要一些时间才能真正“想通”。

## 像素画

- 像素是方形的、独立的色点，排列在一个上下左右的网格上。
- 你可以把一幅图像想象成由比特组成的地图，其中 0 代表黑色，1 代表白色。
  
  ![Zeros and ones being converted to a black and white smiley](https://cs50.harvard.edu/x/notes/4/cs50Week4Slide015.png)

## 十六进制

- <em>RGB</em>，即<em>红、绿、蓝（red, green, blue）</em>，是表示这三种颜色各自含量的数字。在 Adobe Photoshop 中，你可以看到这些设置，如下所示：
  
  ![A photoshop panel with RGB values and hexadecimal input](https://cs50.harvard.edu/x/notes/4/cs50Week4Slide016.png)
  
  注意，红、蓝、绿的含量不同，所选的颜色也随之改变。
- 从上图可以看出，颜色并不只是用三个值来表示。在窗口底部，有一个由数字和字符组成的特殊值。`255` 被表示为 `FF`。这是为什么呢？
- <em>十六进制（hexadecimal）</em>是一种有 16 个计数值的计数系统。它们是：
  
  ```
    0 1 2 3 4 5 6 7 8 9 A B C D E F
  ```
  
  注意，`F` 代表 `15`。
- 十六进制也称为<em>16 进制（base-16）</em>。
- 用十六进制计数时，每一列都是 16 的幂。
- 数字 `0` 表示为 `00`。
- 数字 `1` 表示为 `01`。
- 数字 `9` 表示为 `09`。
- 数字 `10` 表示为 `0A`。
- 数字 `15` 表示为 `0F`。
- 数字 `16` 表示为 `10`。
- 数字 `255` 表示为 `FF`，因为 16 x 15（也就是 `F`）等于 240，再加上 15 就是 255。这是用两位十六进制所能数到的最大数字。
- 十六进制很有用，因为它可以用更少的位数来表示。十六进制让我们能够更简洁地表示信息。

## 内存

- 你或许还记得前几周我们画的、一块接一块的内存示意图。给这些内存块都加上十六进制编号，你可以把它们想象成这样：
  
  ![Blocks of memory numbered in hex](https://cs50.harvard.edu/x/notes/4/cs50Week4Slide065.png)
- 你可以想象，上面标着 `10` 的那一块，到底是表示内存中的一个位置，还是表示数值 `10`，可能会让人混淆。因此，按照惯例，所有十六进制数通常都带有 `0x` 前缀，如下所示：
  
  ![blocks of memory numbered in hex with 0x](https://cs50.harvard.edu/x/notes/4/cs50Week4Slide066.png)
- 在终端窗口中输入 `code addresses.c`，并编写如下代码：
  
  ```
  // Prints an integer
  
  #include <stdio.h>
  
  int main(void)
  {
      int n = 50;
      printf("%i\n", n);
  }
  ```
  
  注意，`n` 以值 `50` 存储在内存中。
- 你可以这样想象这个程序是如何存储该值的：
  
  ![the value 50 stored in a memory location with hex](https://cs50.harvard.edu/x/notes/4/cs50Week4Slide070.png)

## 指针

- C 语言有两个与内存相关的强大运算符：
  
  ```
    & Provides the address of something stored in memory.
    * Instructs the compiler to go to a location in memory.
  ```
  
  （`&` 给出存储在内存中的某个东西的地址；`*` 指示编译器前往内存中的某个位置。）
- 我们可以利用这些知识，按如下方式修改代码：
  
  addresses0.c
  
  ```
  // Prints an integer's address
  
  #include <stdio.h>
  
  int main(void)
  {
      int n = 50;
      printf("%p\n", &n);
  }
  ```
  
  注意 `%p`，它让我们可以查看内存中某个位置的地址。`&n` 可以直译为“`n` 的地址”。执行这段代码会返回一个以 `0x` 开头的内存地址。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/addresses0.c?download)下载这段代码。
- <em>指针（pointer）</em>是存储某个东西的地址的变量。最简洁地说，指针就是计算机内存中的一个地址。
- 看下面的代码：
  
  ```
  int n = 50;
  int *p = &n;
  ```
  
  注意，`p` 是一个指针，里面存放着整数 `n` 的地址。
- 按如下方式修改代码：
  
  addresses1.c
  
  ```
  // Stores and prints an integer's address
  
  #include <stdio.h>
  
  int main(void)
  {
      int n = 50;
      int *p = &n;
      printf("%p\n", p);
  }
  ```
  
  注意，这段代码的效果与之前的代码相同。我们只是用上了刚学到的 `&` 和 `*` 运算符。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/addresses1.c?download)下载这段代码。
- 为了说明 `*` 运算符的用法，看下面的代码：
  
  addresses2.c
  
  ```
  // Stores and prints an integer's address
  
  #include <stdio.h>
  
  int main(void)
  {
      int n = 50;
      int *p = &n;
      printf("%p\n", p);
  }
  ```
  
  注意，`printf` 这一行打印的是这个整数的地址。`int *p` 创建了一个指针，它的任务是存储一个整数的内存地址。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/addresses2.c?download)下载这段代码。
- 你可以这样想象我们的代码：
  
  ![Same value of 50 in a memory location with a pointer value stored elsewhere](https://cs50.harvard.edu/x/notes/4/cs50Week4Slide078.png)
  
  注意，指针看起来相当大。事实上，指针通常存储为一个 8 字节的值。`p` 存储的是 `50` 的地址。
- 你可以把指针更准确地想象成一个地址指向另一个地址：
  
  ![A pointer as an arrow, pointing from one location of memory to another](https://cs50.harvard.edu/x/notes/4/cs50Week4Slide079.png)

## 字符串

- 现在我们对指针有了一个心智模型，就可以揭开课程早些时候做过的一层简化了。
- 按如下方式修改代码：
  
  addresses4.c
  
  ```
  // Prints a string
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      string s = "HI!";
      printf("%s\n", s);
  }
  ```
  
  注意，这里打印了一个字符串 `s`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/addresses4.c?download)下载这段代码。
- 回想一下，字符串其实就是字符数组。例如，`string s = "HI!"` 可以表示为：
  
  ![The string HI with an exclamation point stored in memory](https://cs50.harvard.edu/x/notes/4/cs50Week4Slide085.png)
- 但是，`s` 到底是什么？`s` 存储在内存的什么位置？你可以想象，`s` 也需要存储在某个地方。你可以这样想象 `s` 与字符串之间的关系：
  
  ![Same string HI with a pointer pointing to it](https://cs50.harvard.edu/x/notes/4/cs50Week4Slide086.png)
  
  注意，名为 `s` 的指针告诉编译器字符串的第一个字节在内存中的什么位置。
- 按如下方式修改代码：
  
  addresses5.c
  
  ```
  // Prints a string's address as well the addresses of its chars
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      string s = "HI!";
      printf("%p\n", s);
      printf("%p\n", &s[0]);
      printf("%p\n", &s[1]);
      printf("%p\n", &s[2]);
      printf("%p\n", &s[3]);
  }
  ```
  
  注意，上面的代码打印了字符串 `s` 中每个字符的内存位置。`&` 符号用来显示字符串中每个元素的地址。运行这段代码时，注意元素 `0`、`1`、`2` 和 `3` 在内存中是彼此相邻的。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/addresses5.c?download)下载这段代码。
- 同样，你可以按如下方式修改代码：
  
  addresses6.c
  
  ```
  // Declares a string with CS50 Library
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      string s = "HI!";
      printf("%s\n", s);
  }
  ```
  
  注意，这段代码使用 `cs50.h` 库创建了一个字符串。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/addresses6.c?download)下载这段代码。
- 现在拿掉辅助轮，你可以再次修改代码：
  
  addresses7.c
  
  ```
  // Declares a string without CS50 Library
  
  #include <stdio.h>
  
  int main(void)
  {
      char *s = "HI!";
      printf("%s\n", s);
  }
  ```
  
  注意，`cs50.h` 被去掉了。字符串被实现为 `char *`。这段代码会输出从 `s` 所指位置开始的字符串。这段代码实际上去掉了 `cs50.h` 提供的 `string` 数据类型这个辅助轮。这是原汁原味的 C 代码，没有 cs50 库的脚手架。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/addresses7.c?download)下载这段代码。
- 你可以想象 `string` 这样一种数据类型是怎么创建出来的。
- 上周，我们学习了如何用 struct 创建你自己的数据类型。
- cs50 库包含这样一条类型定义：`typedef char *string`
- 使用 cs50 库时，这条类型定义是一种简化的表示，让人们可以使用一个名为 `string` 的自定义数据类型。

## 指针运算

- 指针运算（pointer arithmetic）是指对内存位置进行数学运算的能力。
- 你可以按如下方式修改代码，打印出字符串中每个内存位置上的内容：
  
  addresses8.c
  
  ```
  // Prints a string's chars
  
  #include <stdio.h>
  
  int main(void)
  {
      char *s = "HI!";
      printf("%c\n", s[0]);
      printf("%c\n", s[1]);
      printf("%c\n", s[2]);
  }
  ```
  
  注意，我们打印的是 `s` 所指位置上的每个字符。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/addresses8.c?download)下载这段代码。
- 此外，你还可以按如下方式修改代码：
  
  addresses9.c
  
  ```
  // Prints a string's chars via pointer arithmetic
  
  #include <stdio.h>
  
  int main(void)
  {
      char *s = "HI!";
      printf("%c\n", *s);
      printf("%c\n", *(s + 1));
      printf("%c\n", *(s + 2));
  }
  ```
  
  注意，首先打印的是 `s` 所指位置上的第一个字符。然后打印位置 `s + 1` 上的字符，依此类推。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/addresses9.c?download)下载这段代码。
- 同样，看下面的代码：
  
  addresses10.c
  
  ```
  // Prints substrings via pointer arithmetic
  
  #include <stdio.h>
  
  int main(void)
  {
      char *s = "HI!";
      printf("%s\n", s);
      printf("%s\n", s + 1);
      printf("%s\n", s + 2);
  }
  ```
  
  注意，这段代码打印的是从 `s` 开始的各个内存位置上存储的值。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/addresses10.c?download)下载这段代码。

## 字符串比较

- 字符串其实就是一个字符数组，由它第一个字节的位置来标识。
- 在课程早些时候，我们考虑过整数的比较。我们可以在终端窗口中输入 `code compare.c`，用代码这样表示：
  
  compare0.c
  
  ```
  // Compares two integers
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Get two integers
      int i = get_int("i: ");
      int j = get_int("j: ");
  
      // Compare integers
      if (i == j)
      {
          printf("Same\n");
      }
      else
      {
          printf("Different\n");
      }
  }
  ```
  
  注意，这段代码从用户那里获取两个整数并比较它们。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/compare0.c?download)下载这段代码。
- 但是对于字符串，不能使用 `==` 运算符来比较两个字符串。
- 用 `==` 运算符去比较字符串，比较的其实是这两个字符串的内存位置，而不是其中的字符。因此，我们建议使用 `strcmp`。
- 为了说明这一点，按如下方式修改代码：
  
  compare1.c
  
  ```
  // Compares two strings' addresses
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Get two strings
      char *s = get_string("s: ");
      char *t = get_string("t: ");
  
      // Compare strings' addresses
      if (s == t)
      {
          printf("Same\n");
      }
      else
      {
          printf("Different\n");
      }
  }
  ```
  
  注意，即使两个字符串都输入 `HI!`，输出仍然是 `Different`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/compare1.c?download)下载这段代码。
- 为什么这两个字符串看起来不一样？你可以用下图来理解原因：
  
  ![two strings stored separately in memory](https://cs50.harvard.edu/x/notes/4/cs50Week4Slide115.png)
- 因此，上面 `compare.c` 的代码实际上是在检查内存地址是否不同，而不是字符串本身。
- 使用 `strcmp`，我们可以修正代码：
  
  compare2.c
  
  ```
  // Compares two strings using strcmp
  
  #include <cs50.h>
  #include <stdio.h>
  #include <string.h>
  
  int main(void)
  {
      // Get two strings
      char *s = get_string("s: ");
      char *t = get_string("t: ");
  
      // Compare strings
      if (strcmp(s, t) == 0)
      {
          printf("Same\n");
      }
      else
      {
          printf("Different\n");
      }
  }
  ```
  
  注意，如果两个字符串相同，`strcmp` 会返回 `0`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/compare2.c?download)下载这段代码。
- 为了进一步说明这两个字符串存放在两个位置，按如下方式修改代码：
  
  compare3.c
  
  ```
  // Prints two strings
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Get two strings
      char *s = get_string("s: ");
      char *t = get_string("t: ");
  
      // Print strings
      printf("%s\n", s);
      printf("%s\n", t);
  }
  ```
  
  注意，我们现在有两个独立的字符串，很可能存放在两个不同的位置。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/compare3.c?download)下载这段代码。
- 稍作修改，你就能看到这两个字符串存放的位置：
  
  compare4.c
  
  ```
  // Prints two strings' addresses
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Get two strings
      char *s = get_string("s: ");
      char *t = get_string("t: ");
  
      // Print strings' addresses
      printf("%p\n", s);
      printf("%p\n", t);
  }
  ```
  
  注意，打印语句中的 `%s` 已经改成了 `%p`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/compare4.c?download)下载这段代码。

## 复制与 malloc

- 编程中一个常见的需求是把一个字符串复制到另一个字符串。
- 在终端窗口中输入 `code copy.c`，并编写如下代码：
  
  copy0.c
  
  ```
  // Capitalizes a string
  
  #include <cs50.h>
  #include <ctype.h>
  #include <stdio.h>
  #include <string.h>
  
  int main(void)
  {
      // Get a string
      string s = get_string("s: ");
  
      // Copy string's address
      string t = s;
  
      // Capitalize first letter in string
      t[0] = toupper(t[0]);
  
      // Print string twice
      printf("s: %s\n", s);
      printf("t: %s\n", t);
  }
  ```
  
  注意，`string t = s` 把 `s` 的地址复制给了 `t`。这并没有达到我们想要的效果：字符串没有被复制，被复制的只是地址。另外，注意这里包含了 `ctype.h`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/copy0.c?download)下载这段代码。
- 你可以这样想象上面的代码：
  
  ![two pointers pointing at the same memory location with a string](https://cs50.harvard.edu/x/notes/4/cs50Week4Slide124.png)
  
  注意，`s` 和 `t` 仍然指向同一块内存。这不是对字符串的真正复制，而是两个指针指向同一个字符串。
- 在解决这个难题之前，首先要确保代码不会出现<em>段错误（segmentation fault）</em>，比如在把 `string s` 复制到 `string t`，而 `string t` 并不存在的情况下。我们可以像下面这样使用 `strlen` 函数来帮忙：
  
  copy1.c
  
  ```
  // Capitalizes a string, checking length first
  
  #include <cs50.h>
  #include <ctype.h>
  #include <stdio.h>
  #include <string.h>
  
  int main(void)
  {
      // Get a string
      string s = get_string("s: ");
  
      // Copy string's address
      string t = s;
  
      // Capitalize first letter in string
      if (strlen(t) > 0)
      {
          t[0] = toupper(t[0]);
      }
  
      // Print string twice
      printf("s: %s\n", s);
      printf("t: %s\n", t);
  }
  ```
  
  注意，这里用 `strlen` 来确保 `string t` 里有内容。如果没有内容，就什么也不会复制。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/copy1.c?download)下载这段代码。
- 要想真正复制一个字符串，我们需要引入两个新的构件。第一，`malloc` 允许你，也就是程序员，分配一块特定大小的内存。第二，`free` 允许你告诉编译器<em>释放</em>你之前分配的那块内存。
- 我们可以按如下方式修改代码，创建字符串的真正副本：
  
  copy2.c
  
  ```
  // Capitalizes a copy of a string
  
  #include <cs50.h>
  #include <ctype.h>
  #include <stdio.h>
  #include <stdlib.h>
  #include <string.h>
  
  int main(void)
  {
      // Get a string
      char *s = get_string("s: ");
  
      // Allocate memory for another string
      char *t = malloc(strlen(s) + 1);
  
      // Copy string into memory, including '\0'
      for (int i = 0; i <= strlen(s); i++)
      {
          t[i] = s[i];
      }
  
      // Capitalize copy
      t[0] = toupper(t[0]);
  
      // Print strings
      printf("s: %s\n", s);
      printf("t: %s\n", t);
  }
  ```
  
  注意，`malloc(strlen(s) + 1)` 创建了一块长度为字符串 `s` 的长度加一的内存。这样我们最终复制出的字符串里就能包含<em>空字符（null）</em>`\0`。然后，`for` 循环遍历字符串 `s`，把每个值赋给字符串 `t` 中相同的位置。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/copy2.c?download)下载这段代码。
- 事实证明，我们的代码效率不高。按如下方式修改代码：
  
  copy3.c
  
  ```
  // Capitalizes a copy of a string, defining n in loop too
  
  #include <cs50.h>
  #include <ctype.h>
  #include <stdio.h>
  #include <stdlib.h>
  #include <string.h>
  
  int main(void)
  {
      // Get a string
      char *s = get_string("s: ");
  
      // Allocate memory for another string
      char *t = malloc(strlen(s) + 1);
  
      // Copy string into memory, including '\0'
      for (int i = 0, n = strlen(s); i <= n; i++)
      {
          t[i] = s[i];
      }
  
      // Capitalize copy
      t[0] = toupper(t[0]);
  
      // Print strings
      printf("s: %s\n", s);
      printf("t: %s\n", t);
  }
  ```
  
  注意，`n = strlen(s)` 现在定义在了 `for` 循环的左侧。最好不要在 `for` 循环的中间条件里调用不必要的函数，因为它会一遍又一遍地运行。把 `n = strlen(s)` 移到左侧后，`strlen` 函数只会运行一次。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/copy3.c?download)下载这段代码。
- `C` 语言有一个内置的字符串复制函数，叫做 `strcpy`。可以这样实现：
  
  copy4.c
  
  ```
  // Capitalizes a copy of a string using strcpy
  
  #include <cs50.h>
  #include <ctype.h>
  #include <stdio.h>
  #include <stdlib.h>
  #include <string.h>
  
  int main(void)
  {
      // Get a string
      char *s = get_string("s: ");
  
      // Allocate memory for another string
      char *t = malloc(strlen(s) + 1);
  
      // Copy string into memory
      strcpy(t, s);
  
      // Capitalize copy
      t[0] = toupper(t[0]);
  
      // Print strings
      printf("s: %s\n", s);
      printf("t: %s\n", t);
  }
  ```
  
  注意，`strcpy` 做的工作与我们之前的 `for` 循环相同。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/copy4.c?download)下载这段代码。
- 如果出了问题，`get_string` 和 `malloc` 都会返回 `NULL`，这是内存中的一个特殊值。你可以编写代码来检查这种 `NULL` 情况，如下所示：
  
  copy5.c
  
  ```
  // Capitalizes a copy of a string without memory errors
  
  #include <cs50.h>
  #include <ctype.h>
  #include <stdio.h>
  #include <stdlib.h>
  #include <string.h>
  
  int main(void)
  {
      // Get a string
      char *s = get_string("s: ");
      if (s == NULL)
      {
          return 1;
      }
  
      // Allocate memory for another string
      char *t = malloc(strlen(s) + 1);
      if (t == NULL)
      {
          return 1;
      }
  
      // Copy string into memory
      strcpy(t, s);
  
      // Capitalize copy
      if (strlen(t) > 0)
      {
          t[0] = toupper(t[0]);
      }
  
      // Print strings
      printf("s: %s\n", s);
      printf("t: %s\n", t);
  
      // Free memory
      free(t);
      return 0;
  }
  ```
  
  注意，如果获取到的字符串长度为 `0`，或者 malloc 失败，就会返回 `NULL`。另外，注意 `free` 让计算机知道你已经用完了通过 `malloc` 创建的这块内存。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/copy5.c?download)下载这段代码。

## Valgrind

- <em>Valgrind</em> 是一个工具，可以检查你使用了 `malloc` 的程序是否存在与内存相关的问题。具体来说，它会检查你是否 `free` 了所有分配过的内存。
- 看下面 `memory.c` 的代码：
  
  memory.c
  
  ```
  // Demonstrates memory errors via valgrind
  
  #include <stdio.h>
  #include <stdlib.h>
  
  int main(void)
  {
      int *x = malloc(3 * sizeof(int));
      x[1] = 72;
      x[2] = 73;
      x[3] = 33;
  }
  ```
  
  注意，运行这个程序不会引发任何错误。虽然用 `malloc` 为数组分配了足够的内存，但代码没有 `free` 这块分配的内存。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/memory.c?download)下载这段代码。
- 如果你输入 `make memory`，然后输入 `valgrind ./memory`，valgrind 会给出一份报告，指出你的程序导致内存在哪里丢失。valgrind 揭示的一个错误是：我们试图把值 `33` 赋给 `x` 的第 `3` 个元素，而我们只分配了大小为 `3` 的数组（`x[0]`、`x[1]` 和 `x[2]`）。另一个错误是我们从未释放 `x`。
- 你可以按如下方式修改代码来释放 `x` 的内存：
  
  ```
  // Demonstrates memory errors via valgrind
  
  #include <stdio.h>
  #include <stdlib.h>
  
  int main(void)
  {
      int *x = malloc(3 * sizeof(int));
      x[0] = 72;
      x[1] = 73;
      x[2] = 33;
      free(x);
  }
  ```
  
  注意，再次运行 valgrind，现在不会出现内存泄漏或错误了。

## 垃圾值

- 当你向编译器申请一块内存时，并不能保证这块内存是空的。
- 你分配到的内存很可能之前被计算机用过。因此，你可能会看到<em>垃圾值（junk / garbage values）</em>。这是因为你拿到了一块内存，却没有对它进行初始化。例如，看下面 `garbage.c` 的代码：
  
  garbage.c
  
  ```
  #include <stdio.h>
  #include <stdlib.h>
  
  int main(void)
  {
      int scores[1024];
      for (int i = 0; i < 1024; i++)
      {
          printf("%i\n", scores[i]);
      }
  }
  ```
  
  注意，运行这段代码会为你的数组在内存中分配 `1024` 个位置，但 `for` 循环很可能会显示其中的值并不全是 `0`。当你没有把内存块初始化为零或其他值时，始终要意识到可能出现垃圾值，这是最佳实践。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/garbage.c?download)下载这段代码。

## Binky 的指针乐趣

- 我们观看了一段[斯坦福大学的视频](https://www.youtube.com/watch?v=5VnDaHBi8dM)，它帮助我们直观地理解指针。

## 交换

- 在现实世界中，编程里一个常见的需求是交换两个值。很自然地，没有一个临时存放的空间，就很难交换两个变量。实际操作中，你可以输入 `code swap.c`，并编写如下代码来看看效果：
  
  swap0.c
  
  ```
  // Fails to swap two integers
  
  #include <stdio.h>
  
  void swap(int a, int b);
  
  int main(void)
  {
      int x = 1;
      int y = 2;
  
      printf("x is %i, y is %i\n", x, y);
      swap(x, y);
      printf("x is %i, y is %i\n", x, y);
  }
  
  void swap(int a, int b)
  {
      int tmp = a;
      a = b;
      b = tmp;
  }
  ```
  
  注意，这段代码虽然能运行，却不起作用。即使把值传给了 `swap` 函数，它们也没有被交换。为什么？你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/swap0.c?download)下载这段代码。
- 当你把值传给函数时，你提供的只是副本。按目前这样写的代码，`x` 和 `y` 的<em>作用域（scope）</em>仅限于 main 函数。也就是说，在 `main` 函数的花括号 `{}` 中创建的 `x` 和 `y` 的值，只在 `main` 函数的作用域内有效。在上面的代码里，`x` 和 `y` 是按<em>值（value）</em>传递的。
- 看下面这张图：
  
  ![a rectangle with machine code at top followed by globals heap and stack](https://cs50.harvard.edu/x/notes/4/cs50Week4Slide163.png)
  
  注意，<em>全局（global）</em>变量（我们在这门课里还没用过）位于内存中的一个地方。各个函数则存放在内存另一块区域的 `stack`（栈）中。
- 现在，看下面这张图：
  
  ![a rectangle with main function at bottom and swap function directly above it](https://cs50.harvard.edu/x/notes/4/cs50Week4Slide167.png)
  
  注意，`main` 和 `swap` 有两个各自独立的<em>栈帧（frame）</em>，也就是内存区域。因此，我们不能简单地把值从一个函数传到另一个函数来修改它们。
- 按如下方式修改代码：
  
  swap1.c
  
  ```
  // Swaps two integers using pointers
  
  #include <stdio.h>
  
  void swap(int *a, int *b);
  
  int main(void)
  {
      int x = 1;
      int y = 2;
  
      printf("x is %i, y is %i\n", x, y);
      swap(&x, &y);
      printf("x is %i, y is %i\n", x, y);
  }
  
  void swap(int *a, int *b)
  {
      int tmp = *a;
      *a = *b;
      *b = tmp;
  }
  ```
  
  注意，变量不再按<em>值</em>传递，而是按<em>引用（reference）</em>传递。也就是说，传给函数的是 `x` 和 `y` 的地址。因此，`swap` 函数就能知道该在哪里修改 main 函数中真正的 `x` 和 `y`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/swap1.c?download)下载这段代码。
- 你可以这样想象：
  
  ![x and y stored in main function being passed by reference to the swap function](https://cs50.harvard.edu/x/notes/4/cs50Week4Slide198.png)

## 溢出

- <em>堆溢出（heap overflow）</em>是指你溢出了堆，触碰了不该触碰的内存区域。
- <em>栈溢出（stack overflow）</em>是指调用了太多函数，耗尽了可用的内存。
- 这两者都属于<em>缓冲区溢出（buffer overflow）</em>。

## `scanf`

- 在 CS50 中，我们创建了 `get_int` 这样的函数来简化从用户那里获取输入的操作。
- `scanf` 是一个可以获取用户输入的内置函数。
- 我们可以很容易地用 `scanf` 重新实现 `get_int`，如下所示：
  
  get1.c
  
  ```
  // Gets an int from user using scanf
  
  #include <stdio.h>
  
  int main(void)
  {
      int n;
      printf("n: ");
      scanf("%i", &n);
      printf("n: %i\n", n);
  }
  ```
  
  注意，在 `scanf("%i", &n)` 这一行中，`n` 的值被存储到了 `n` 所在的位置。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/get1.c?download)下载这段代码。
- 然而，要重新实现 `get_string` 就不那么容易了。看下面的代码：
  
  get3.c
  
  ```
  // Dangerously gets a string from user using scanf with array
  
  #include <stdio.h>
  
  int main(void)
  {
      char s[4];
      printf("s: ");
      scanf("%s", s);
      printf("s: %s\n", s);
  }
  ```
  
  注意，这里不需要 `&`，因为 C 中的数组名起到指针的作用。不过，这个程序并不是每次运行都能正常工作。程序里没有任何地方为我们想要的字符串分配足够的内存。事实上，我们根本不知道用户会输入多长的字符串！而且，我们也不知道那个内存位置上可能存在什么垃圾值。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/get3.c?download)下载这段代码。
- 你的代码还可以这样修改。不过，我们必须为字符串预先分配一定量的内存：
  
  ```
  // Using malloc
  
  #include <stdio.h>
  #include <stdlib.h>
  
  int main(void)
  {
      char *s = malloc(4);
      if (s == NULL)
      {
          return 1;
      }
      printf("s: ");
      scanf("%s", s);
      printf("s: %s\n", s);
      free(s);
      return 0;
  }
  ```
  
  注意，如果输入的字符串有四个字节，你<em>可能</em>会遇到错误。
- 把代码简化成下面这样，我们可以进一步理解预分配这个根本问题：
  
  ```
  #include <stdio.h>
  
  int main(void)
  {
      char s[4];
      printf("s: ");
      scanf("%s", s);
      printf("s: %s\n", s);
  }
  ```
  
  注意，如果我们预先分配一个大小为 `4` 的数组，输入 `cat` 程序可以正常工作。但是，比这更长的字符串<em>可能</em>会造成错误。
- 有时，编译器或运行它的系统可能会分配比我们指定的更多的内存。但从根本上说，上面的代码是不安全的。我们不能相信用户输入的字符串一定能装进我们预先分配的内存里。

## 文件 I/O

- 你可以读取和操作文件。这个主题将在以后的某一周进一步讨论，现在先看 `phonebook.c` 的代码：
  
  phonebook0.c
  
  ```
  // Saves names and numbers to a CSV file
  
  #include <cs50.h>
  #include <stdio.h>
  #include <string.h>
  
  int main(void)
  {
      // Open CSV file
      FILE *file = fopen("phonebook.csv", "a");
  
      // Get name and number
      char *name = get_string("Name: ");
      char *number = get_string("Number: ");
  
      // Print to file
      fprintf(file, "%s,%s\n", name, number);
  
      // Close file
      fclose(file);
  }
  ```
  
  注意，这段代码使用指针来访问文件。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/phonebook0.c?download)下载这段代码。
- 你可以在运行上面的代码之前预先创建一个名为 `phonebook.csv` 的文件，或者下载 [phonebook.csv](https://cdn.cs50.net/2025/fall/lectures/4/src4/phonebook.csv?download)。运行上面的程序并输入姓名和电话号码后，你会发现这些数据保存在了你的 CSV 文件中。
- 如果我们想确保运行程序之前 `phonebook.csv` 存在，可以按如下方式修改代码：
  
  phonebook1.c
  
  ```
  // Saves names and numbers to a CSV file, checking for NULL
  
  #include <cs50.h>
  #include <stdio.h>
  #include <string.h>
  
  int main(void)
  {
      // Open CSV file
      FILE *file = fopen("phonebook.csv", "a");
      if (file == NULL)
      {
          return 1;
      }
  
      // Get name and number
      char *name = get_string("Name: ");
      char *number = get_string("Number: ");
  
      // Print to file
      fprintf(file, "%s,%s\n", name, number);
  
      // Close file
      fclose(file);
  }
  ```
  
  注意，这个程序通过调用 `return 1` 来防范 `NULL` 指针。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/phonebook1.c?download)下载这段代码。
- 我们可以输入 `code cp.c` 并编写如下代码，实现我们自己的复制程序：
  
  cp.c
  
  ```
  // Copies a file
  
  #include <stdio.h>
  
  typedef unsigned char BYTE;
  
  int main(int argc, char *argv[])
  {
      FILE *src = fopen(argv[1], "rb");
      FILE *dst = fopen(argv[2], "wb");
  
      BYTE b;
  
      while (fread(&b, sizeof(b), 1, src) != 0)
      {
          fwrite(&b, sizeof(b), 1, dst);
      }
  
      fclose(dst);
      fclose(src);
  }
  ```
  
  注意，这个文件创建了我们自己的数据类型 BYTE，它与 uint8_t 的大小相同。然后，程序读取一个 `BYTE` 并把它写入文件。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/4/src4/cp.c?download)下载这段代码。
- BMP 也是一种数据的集合，我们可以对它们进行检查和操作。这一周，你将在习题集中做的正是这件事！

## 小结

在这节课中，你学习了指针，它让你能够访问和操作特定内存位置上的数据。具体来说，我们深入探讨了……

- 像素画
- 十六进制
- 内存
- 指针
- 字符串
- 指针运算
- 字符串比较
- 复制
- malloc 与 Valgrind
- 垃圾值
- 交换
- 溢出
- `scanf`
- 文件 I/O

下次再见！
