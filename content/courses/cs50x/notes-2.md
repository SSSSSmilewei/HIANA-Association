# 第 2 讲

## 欢迎！

- 上一讲我们学习了 C，一种基于文本的编程语言。
- 这一周，我们将更深入地了解更多基本构件，它们将帮助我们实现自底向上学习编程的目标。
- 从根本上说，除了编程的基础知识，本课程讲的是解决问题。因此，我们也会进一步关注如何着手解决计算机科学问题。
- 到课程结束时，你将学会如何运用上述这些构件，去解决一大批计算机科学问题。
- 计算机科学提供的许多解决方案，我们都习以为常了。

## 阅读难度等级

- 我们在本课程中要解决的现实问题之一，是理解阅读难度等级。
- 在你的一些同学的帮助下，我们展示了不同阅读难度等级的读物。
- 本周，我们将把量化阅读难度等级作为你众多编程挑战之一。

## 调试

- 每个人在写代码时都会犯错。
- <em>调试</em>（debugging）是在代码中找出并清除 bug 的过程。
- 本课程中你会用到的调试技巧之一叫做<em>小黄鸭调试法</em>（rubber duck debugging）：你可以对着一个没有生命的物体（或者自己）说话，帮助自己理清代码的思路，以及它为什么没有按预期工作。当你的代码遇到困难时，不妨想象一下，真的对着一只小黄鸭大声讲出代码的问题。如果你不想对着一只塑料小鸭子说话，也欢迎你对身边的人说！
- 我们打造了 CS50 Duck 和 [CS50.ai](https://cs50.ai)，作为可以帮助你调试代码的工具。
- 考虑下面的代码：
  
  ```
  // Missing #include for stdio.h
  
  int main(void)
  {
      printf("hello, world\n");
  }
  ```
  
  注意这里缺少 `stdio.h` 的 `#include` 指令。`printf` 函数要正常工作，需要这个头文件。没有它，编译器就无法识别 `printf` 函数，并会产生错误。
- 类似地，考虑下面的代码：
  
  ```
  // Misspelled stdio.h
  
  #include <studio.h>
  
  int main(void)
  {
      printf("hello, world\n");
  }
  ```
  
  注意 `stdio.h` 被误拼成了 `studio.h`。这个笔误会导致编译错误，因为编译器找不到名为 `studio.h` 的文件。正确的头文件名是 `stdio.h`，意思是“standard input/output”（标准输入/输出）。
- 我们可能会忘记声明变量的类型：
  
  ```
  // Missing cs50.h, variable's type, semicolon, %s, and second printf argument.
  
  #include <stdio.h>
  
  int main(void)
  {
      name = get_string("What's your name? ")
      printf("hello, world\n");
  }
  ```
  
  注意这里有多处错误。第一，没有声明 `name` 的类型。第二，缺少 `cs50.h` 库，导致无法使用 `string`。第三，`get_string` 调用后面缺少分号。第四，`printf` 语句实际上并没有使用 `name` 变量。
- 有些 bug 会引发错误信息。另一些是逻辑错误，不会产生任何信息，但会导致程序出现意外的行为。
- `printf` 语句可以用来调试你的代码。考虑下面的内容：
- 考虑上周的下面这张图：
  
  ![mario](https://cs50.harvard.edu/x/notes/2/cs50Week2Slide061.png)
- 考虑下面这段故意埋入了 bug 的代码：
  
  ```
  // Buggy example for printf
  
  #include <stdio.h>
  
  int main(void)
  {
      for (int i = 0; i <= 3; i++)
      {
          printf("#\n");
      }
  }
  ```
  
  注意这段代码打印的是四个方块，而不是三个。
- 在终端窗口中输入 `code buggy.c`，并写入上面的代码。
- 运行这段代码，会出现四块砖，而不是预期的三块。
- `printf` 是调试代码时非常有用的方法。你可以把代码修改如下：
  
  ```
  // Buggy example for printf
  
  #include <stdio.h>
  
  int main(void)
  {
      for (int i = 0; i <= 3; i++)
      {
          printf("i is %i\n", i);
          printf("#\n");
      }
  }
  ```
  
  注意这段代码在循环的每次迭代中都输出 `i` 的值，这样我们就可以调试代码了。
- 运行这段代码，你会看到许多语句，包括 `i is 0`、`i is 1`、`i is 2` 和 `i is 3`。看到这些之后，你可能会意识到需要把代码进一步修正如下：
  
  ```
  #include <stdio.h>
  
  int main(void)
  {
      for (int i = 0; i < 3; i++)
      {
          printf("#\n");
      }
  }
  ```
  
  注意 `<=` 已被替换为 `<`。
- 这段代码还可以进一步改进，如下：
  
  ```
  // Buggy example for debug50
  
  #include <cs50.h>
  #include <stdio.h>
  
  void print_column(int height);
  
  int main(void)
  {
      int h = get_int("Height: ");
      print_column(h);
  }
  
  void print_column(int height)
  {
      for (int i = 0; i <= height; i++)
      {
          printf("#\n");
      }
  }
  ```
  
  注意编译并运行这段代码，仍然会出现 bug。
- 为了解决这个 bug，我们将使用一个新工具。
- 调试的第二种工具叫做<em>调试器</em>（debugger），是程序员开发出来帮助追踪代码中 bug 的软件工具。
- 在 VS Code 中，已经为你提供了一个预先配置好的调试器，叫做 `debug50`。
- 要使用这个调试器，首先设置一个<em>断点</em>（breakpoint）：点击代码某一行的左边，就在行号的左侧。点击之后，你会看到出现一个红点。可以把它想象成一个停止标志，要求调试器暂停，这样你就可以思考代码的这一部分发生了什么。
  
  ![breakpoint](https://cs50.harvard.edu/x/notes/2/cs50Week2Debugging.png)
- 第二步，运行 `debug50 ./buggy`。你会注意到，调试器启动之后，你代码中的某一行会以类似金色的颜色高亮。从字面上说，代码已经在这一行<em>暂停</em>了。注意左上角显示了所有的局部变量，包括 `h`，它目前还没有值。在窗口顶部，你可以点击 `step over`（单步跳过）按钮，调试器就会继续往下执行你的代码。注意在逐步执行循环的过程中，`i` 的值是如何增加的。
- 虽然这个工具不会直接告诉你 bug 在哪里，但它能帮助你放慢速度，一步一步地看清代码是如何运行的。你可以使用 `step into`（单步进入），进一步查看有 bug 的代码的细节。
- 调试的第三种方法，是对着小黄鸭、无生命的物体或者某个人，描述你面临的问题，以及你为解决问题所采取的具体步骤，以此找出你的错误。
- 最后，CS50 Duck 也可以帮你调试代码。

## 编译

- 回想一下，上周你学习了<em>编译器</em>：一种专门的计算机程序，它把<em>源代码</em>转换成计算机能够理解的<em>机器码</em>。
- 我们用一种非常特殊的软件，即<em>编译器</em>，把<em>源代码</em>转换成机器码。今天，我们将向你介绍一个编译器，它可以把用 <em>C</em> 语言编写的源代码转换成机器码。
  
  ```mermaid
  flowchart LR
      in["source code"] --> BOX[" compiler "]
      BOX --> out["machine code"]
  ```
- 例如，你可能有一个这样的计算机程序：
  
  ```
  #include <stdio.h>
  
  int main(void)
  {
      printf("hello, world\n");
  }
  ```
- 编译器会把上面的代码转换成机器码，看起来可能像这样：
  
  ```
  01010100 01001000 01001001 01010011
  00100000 01001001 01010011 00100000
  01000011 01010011 00110101 00110000
  ```
  
  注意上面的内容仅作示意。上述程序的真实机器码要长得多。
- <em>VS Code</em>，也就是提供给你这位 CS50 学生的编程环境，使用的编译器叫做 `clang`（意思是“C Language Family Frontend”，C 语言家族前端）。
- 你可以在终端窗口输入下面的命令来编译代码：`clang -o hello hello.c`。
- <em>命令行参数</em>（command-line argument）是在命令行上提供给 `clang` 的，即 `-o hello hello.c`。
- 在终端窗口中运行 `./hello`，你的程序会按预期运行。
- 考虑上周的下面这段代码：
  
  ```
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      string name = get_string("What's your name? ");
      printf("hello, %s\n", name);
  }
  ```
- 要编译这段代码，你可以输入 `clang -o hello hello.c -lcs50`。
- 如果你输入 `make hello`，它会运行一条命令，调用 clang 生成一个输出文件，你作为用户就可以运行它。
- VS Code 已经预先设置好，使 `make` 在调用 clang 时会带上许多命令行参数，方便你使用。
- 上面这些只是用来说明，以便让你更深入地理解编译代码的过程和概念；在 CS50 中使用 `make` 完全没问题，也正是我们期望的做法！
- 编译包含四个主要步骤，如下：
- 第一步，<em>预处理</em>（preprocessing）：你代码中以 `#` 标记的头文件（例如 `#include <cs50.h>`）会被实际地复制并粘贴到你的文件中。在这一步中，`cs50.h` 中的代码被复制到你的程序里。同样，就像你的代码包含 `#include <stdio.h>` 一样，位于你电脑上某处的 `stdio.h` 中的代码也会被复制到你的程序里。这一步可以如下图示：
  
  ```
    string get_string(string prompt);
    int printf(string format, ...);
  
    int main(void)
    {
        string name = get_string("What's your name? ");
        printf("hello, %s\n", name);
    }
  ```
- 第二步，<em>编译</em>（compiling）：你的程序被转换成汇编代码。这一步可以如下图示：
  
  ```asm
  ...
  main:
      .cfi_startproc
  # BB#0:
      pushq    %rbp
  .Ltmp0:
      .cfi_def_cfa_offset 16
  .Ltmp1:
      .cfi_offset %rbp, -16
      movq    %rsp, %rbp
  .Ltmp2:
      .cfi_def_cfa_register %rbp
      subq    $16, %rsp
      xorl    %eax, %eax
      movl    %eax, %edi
      movabsq    $.L.str, %rsi
      movb    $0, %al
      callq    get_string
      movabsq    $.L.str.1, %rdi
      movq    %rax, -8(%rbp)
      movq    -8(%rbp), %rsi
      movb    $0, %al
      callq    printf
      ...
  ```
- 第三步，<em>汇编</em>（assembling）：由汇编器（编译器工具链中的一个工具）把你的汇编代码转换成机器码。这一步可以如下图示：
  
  ```
  01111111010001010100110001000110
  00000010000000010000000100000000
  00000000000000000000000000000000
  00000000000000000000000000000000
  00000001000000000011111000000000
  00000001000000000000000000000000
  00000000000000000000000000000000
  ...
  ```
- 最后，在<em>链接</em>（linking）这一步，你所引入的库中预先编译好的机器码会与你的代码合并在一起。然后输出最终的可执行文件。
  
  ```
  01111111010001010100110001000110
  00000010000000010000000100000000
  00000000000000000000000000000000
  00000000000000000000000000000000
  00000001000000000011111000000000
  00000001000000000000000000000000
  00000000000000000000000000000000
  00000000000000000000000000000000
  00000000000000000000000000000000
  00000000000000000000000000000000
  10100000000000100000000000000000
  00000000000000000000000000000000
  00000000000000000000000000000000
  01000000000000000000000000000000
  00000000000000000100000000000000
  00001010000000000000000100000000
  01010101010010001000100111100101
  01001000100000111110110000010000
  00110001110000001000100111000111
  01001000101111100000000000000000
  00000000000000000000000000000000
  00000000000000001011000000000000
  11101000000000000000000000000000
  00000000010010001011111100000000
  00000000000000000000000000000000
  00000000000000000000000001001000
  ...
  ```

## 数组

- 在第 0 周，我们谈到了<em>数据类型</em>，比如 `bool`、`int`、`char`、`string` 等。
- 每种数据类型都需要一定量的系统资源（以下是 CS50 环境中的典型大小）：
  
  - `bool` 1 字节
  - `int` 4 字节
  - `long` 8 字节
  - `float` 4 字节
  - `double` 8 字节
  - `char` 1 字节
  - `string` ? 字节
- 在你的计算机内部，可用的内存是有限的。
  
  ![memory](https://cs50.harvard.edu/x/notes/2/cs50Week2Slide084.png)
- 从物理上说，在计算机的内存中，你可以想象特定类型的数据是如何存储的。你可以想象，一个只需要 1 字节内存的 `char` 看起来可能像这样：
  
  ![1 byte](https://cs50.harvard.edu/x/notes/2/cs50Week2Slide087.png)
- 类似地，一个需要 4 字节的 `int` 可能是这样的：
  
  ![4 bytes](https://cs50.harvard.edu/x/notes/2/cs50Week2Slide088.png)
- 我们可以创建一个程序来探索这些概念。在终端中输入 `code scores.c`，并按如下方式编写代码：
  
  ```
  // Averages three (hardcoded) numbers
  
  #include <stdio.h>
  
  int main(void)
  {
      // Scores
      int score1 = 72;
      int score2 = 73;
      int score3 = 33;
  
      // Print average
      printf("Average: %f\n", (score1 + score2 + score3) / 3.0);
  }
  ```
  
  注意右边的数是浮点数 `3.0`，这样计算的最终结果就是一个浮点值。
- 运行 `make scores` 编译程序。然后运行 `./scores` 执行它。
- 你可以想象这些变量是如何存储在内存中的：
  
  ![scores in memory](https://cs50.harvard.edu/x/notes/2/cs50Week2Slide098.png)
- <em>数组</em>（array）是一系列背靠背地存储在内存中的值。
- `int scores[3]` 是告诉编译器，给你三个背靠背的、`int` 大小的内存位置，用来存放三个 `scores`。结合我们的程序，你可以把代码修改如下：
  
  ```
  // Averages three (hardcoded) numbers using an array
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Scores
      int scores[3];
      scores[0] = 72;
      scores[1] = 73;
      scores[2] = 33;
  
      // Print average
      printf("Average: %f\n", (scores[0] + scores[1] + scores[2]) / 3.0);
  }
  ```
  
  注意 `scores[0]` 是通过在名为 `scores` 的数组中，对位置 `0` 进行`索引`（indexing into），来查看内存这个位置上存储的值。
- 你可以看出，虽然上面的代码能用，但我们的代码仍有改进的余地。把你的代码修改如下：
  
  ```
  // Averages three numbers using an array and a loop
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Get scores
      int scores[3];
      for (int i = 0; i < 3; i++)
      {
          scores[i] = get_int("Score: ");
      }
  
      // Print average
      printf("Average: %f\n", (scores[0] + scores[1] + scores[2]) / 3.0);
  }
  ```
  
  注意我们用 `scores[i]` 来索引 `scores`，其中 `i` 由 `for` 循环提供。
- 我们可以简化平均值的计算，或者说把它<em>抽象</em>出去。把你的代码修改如下：
  
  ```
  // Averages three numbers using an array, a constant, and a helper function
  
  #include <cs50.h>
  #include <stdio.h>
  
  // Constant
  const int N = 3;
  
  // Prototype
  float average(int length, int array[]);
  
  int main(void)
  {
      // Get scores
      int scores[N];
      for (int i = 0; i < N; i++)
      {
          scores[i] = get_int("Score: ");
      }
  
      // Print average
      printf("Average: %f\n", average(N, scores));
  }
  
  float average(int length, int array[])
  {
      // Calculate average
      int sum = 0;
      for (int i = 0; i < length; i++)
      {
          sum += array[i];
      }
      return sum / (float) length;
  }
  ```
  
  注意这里声明了一个名为 `average` 的新函数。另外，注意声明了一个 `const`（常量）值 `N`。最重要的是，注意 `average` 函数接受 `int array[]`，这意味着该函数可以接收一个数组作为参数。
- 数组不仅可以作为容器，还可以在函数之间传递。

## 字符串

- `string` 其实就是由 `char` 类型的值组成的数组：一个字符数组。
- 为了探索 `char` 和 `string`，在终端窗口中输入 `code hi.c`，并按如下方式编写代码：
  
  ```
  // Prints chars
  
  #include <stdio.h>
  
  int main(void)
  {
      char c1 = 'H';
      char c2 = 'I';
      char c3 = '!';
  
      printf("%c%c%c\n", c1, c2, c3);
  }
  ```
  
  注意这会输出一串字符。
- 类似地，对你的代码做如下修改：
  
  ```
  // Prints chars' ASCII codes
  
  #include <stdio.h>
  
  int main(void)
  {
      char c1 = 'H';
      char c2 = 'I';
      char c3 = '!';
  
      printf("%i %i %i\n", c1, c2, c3);
  }
  ```
  
  注意把 `%c` 换成 `%i` 之后，打印出来的是 ASCII 码。
- 看看下面的图，你可以看到字符串是一个字符数组，它从第一个字符开始，以一个特殊字符 `NUL 字符`结束（注意：只有一个 L 的 NUL 是 ‘\0’ 字符，与有两个 L 的 NULL 不同）：
  
  ![hi with terminator](https://cs50.harvard.edu/x/notes/2/cs50Week2Slide116.png)
- 用十进制来想象，你的数组会是下面这样：
  
  ![hi with decimal](https://cs50.harvard.edu/x/notes/2/cs50Week2Slide117.png)
- 我们可以把上面的内容写成这样：
  
  ```
  // Prints string
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      string s = "HI!";
      printf("%s\n", s);
  }
  ```
  
  注意所有字符都包含在一个 `string` 中。
- 为了进一步理解 `string` 是如何工作的，把你的代码修改如下：
  
  ```
  // Treats string as array
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      string s = "HI!";
      printf("%c%c%c\n", s[0], s[1], s[2]);
  }
  ```
  
  注意 `printf` 语句输出了我们名为 `s` 的数组中的三个值。
- 和之前一样，我们可以把 `%c` 换成 `%i`，如下：
  
  ```
  // Prints string's ASCII codes, including NUL
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      string s = "HI!";
      printf("%i %i %i %i\n", s[0], s[1], s[2], s[3]);
  }
  ```
  
  注意这会打印出字符串的 ASCII 码，包括 NUL。
- 假设我们想同时说 `HI!` 和 `BYE!`。把你的代码修改如下：
  
  ```
  // Multiple strings
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      string s = "HI!";
      string t = "BYE!";
  
      printf("%s\n", s);
      printf("%s\n", t);
  }
  ```
  
  注意这个例子中声明并使用了两个字符串。
- 你可以这样直观地理解：
  
  ![hi and bye](https://cs50.harvard.edu/x/notes/2/cs50Week2Slide126.png)
- 我们可以进一步改进这段代码。把你的代码修改如下：
  
  ```
  // Array of strings
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      string words[2];
  
      words[0] = "HI!";
      words[1] = "BYE!";
  
      printf("%s\n", words[0]);
      printf("%s\n", words[1]);
  }
  ```
  
  注意这两个字符串都存放在同一个 `string` 类型的数组中。
- 我们可以把这两个字符串合并成一个字符串数组。
  
  ```
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      string words[2];
  
      words[0] = "HI!";
      words[1] = "BYE!";
  
      printf("%c%c%c\n", words[0][0], words[0][1], words[0][2]);
      printf("%c%c%c%c\n", words[1][0], words[1][1], words[1][2], words[1][3]);
  }
  ```
  
  注意这里创建了一个 `words` 数组。它是一个字符串数组。每个单词都存放在 `words` 中。

## 字符串长度

- 编程中，也许在 C 中尤其常见的一个问题，是求字符串的长度。我们该如何用代码实现呢？在终端窗口中输入 `code length.c`，并按如下方式编写代码：
  
  ```
  // Determines the length of a string
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Prompt for user's name
      string name = get_string("Name: ");
  
      // Count number of characters up until '\0' (aka NUL)
      int n = 0;
      while (name[n] != '\0')
      {
          n++;
      }
      printf("%i\n", n);
  }
  ```
  
  注意这段代码会一直循环，直到找到 NUL 字符。
- 可以把计数的部分抽象成一个函数来改进这段代码，如下：
  
  ```
  // Determines the length of a string using a function
  
  #include <cs50.h>
  #include <stdio.h>
  
  int string_length(string s);
  
  int main(void)
  {
      // Prompt for user's name
      string name = get_string("Name: ");
      int length = string_length(name);
      printf("%i\n", length);
  }
  
  int string_length(string s)
  {
      // Count number of characters up until '\0' (aka NUL)
      int n = 0;
      while (s[n] != '\0')
      {
          n++;
      }
      return n;
  }
  ```
  
  注意这里有一个名为 `string_length` 的新函数，它会数字符，直到找到 NUL。
- 由于这是编程中如此常见的问题，其他程序员已经在 `string.h` 库中写好了求字符串长度的代码。你可以把代码修改如下来求字符串的长度：
  
  ```
  // Determines the length of a string using a function
  
  #include <cs50.h>
  #include <stdio.h>
  #include <string.h>
  
  int main(void)
  {
      // Prompt for user's name
      string name = get_string("Name: ");
      int length = strlen(name);
      printf("%i\n", length);
  }
  ```
  
  注意这段代码使用了 `string.h` 库，它在文件顶部声明。另外，它还使用了该库中的一个函数 `strlen`，用来计算传给它的字符串的长度。
- 我们的代码可以站在前人程序员的肩膀上，使用他们创建的库。
- `ctype.h` 是另一个相当有用的库。假设我们想写一个把所有小写字符转换成大写字符的程序。在终端窗口中输入 `code uppercase.c`，并按如下方式编写代码：
  
  ```
  // Uppercases a string
  
  #include <cs50.h>
  #include <stdio.h>
  #include <string.h>
  
  int main(void)
  {
      string s = get_string("Before: ");
      printf("After:  ");
      for (int i = 0, n = strlen(s); i < n; i++)
      {
          if (s[i] >= 'a' && s[i] <= 'z')
          {
              printf("%c", s[i] - 32);
          }
          else
          {
              printf("%c", s[i]);
          }
      }
      printf("\n");
  }
  ```
  
  注意这段代码对字符串中的每个值进行<em>迭代</em>（iterate）。程序查看每一个字符。如果这个字符是小写，就从它的 ASCII 值中减去 32，把它转换成大写。
- 回想一下上周的内容，你可能还记得这张 ASCII 值对照表：
  
  | <strong>0</strong> | NUL | <strong>16</strong> | DLE | <strong>32</strong> | SP | <strong>48</strong> | 0 | <strong>64</strong> | @ | <strong>80</strong> | P | <strong>96</strong> | ` | <strong>112</strong> | p |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
  | <strong>1</strong> | SOH | <strong>17</strong> | DC1 | <strong>33</strong> | ! | <strong>49</strong> | 1 | <strong>65</strong> | A | <strong>81</strong> | Q | <strong>97</strong> | a | <strong>113</strong> | q |
  | <strong>2</strong> | STX | <strong>18</strong> | DC2 | <strong>34</strong> | ” | <strong>50</strong> | 2 | <strong>66</strong> | B | <strong>82</strong> | R | <strong>98</strong> | b | <strong>114</strong> | r |
  | <strong>3</strong> | ETX | <strong>19</strong> | DC3 | <strong>35</strong> | # | <strong>51</strong> | 3 | <strong>67</strong> | C | <strong>83</strong> | S | <strong>99</strong> | c | <strong>115</strong> | s |
  | <strong>4</strong> | EOT | <strong>20</strong> | DC4 | <strong>36</strong> | $ | <strong>52</strong> | 4 | <strong>68</strong> | D | <strong>84</strong> | T | <strong>100</strong> | d | <strong>116</strong> | t |
  | <strong>5</strong> | ENQ | <strong>21</strong> | NAK | <strong>37</strong> | % | <strong>53</strong> | 5 | <strong>69</strong> | E | <strong>85</strong> | U | <strong>101</strong> | e | <strong>117</strong> | u |
  | <strong>6</strong> | ACK | <strong>22</strong> | SYN | <strong>38</strong> | & | <strong>54</strong> | 6 | <strong>70</strong> | F | <strong>86</strong> | V | <strong>102</strong> | f | <strong>118</strong> | v |
  | <strong>7</strong> | BEL | <strong>23</strong> | ETB | <strong>39</strong> | ’ | <strong>55</strong> | 7 | <strong>71</strong> | G | <strong>87</strong> | W | <strong>103</strong> | g | <strong>119</strong> | w |
  | <strong>8</strong> | BS | <strong>24</strong> | CAN | <strong>40</strong> | ( | <strong>56</strong> | 8 | <strong>72</strong> | H | <strong>88</strong> | X | <strong>104</strong> | h | <strong>120</strong> | x |
  | <strong>9</strong> | HT | <strong>25</strong> | EM | <strong>41</strong> | ) | <strong>57</strong> | 9 | <strong>73</strong> | I | <strong>89</strong> | Y | <strong>105</strong> | i | <strong>121</strong> | y |
  | <strong>10</strong> | LF | <strong>26</strong> | SUB | <strong>42</strong> | * | <strong>58</strong> | : | <strong>74</strong> | J | <strong>90</strong> | Z | <strong>106</strong> | j | <strong>122</strong> | z |
  | <strong>11</strong> | VT | <strong>27</strong> | ESC | <strong>43</strong> | + | <strong>59</strong> | ; | <strong>75</strong> | K | <strong>91</strong> | [ | <strong>107</strong> | k | <strong>123</strong> | { |
  | <strong>12</strong> | FF | <strong>28</strong> | FS | <strong>44</strong> | , | <strong>60</strong> | < | <strong>76</strong> | L | <strong>92</strong> | \ | <strong>108</strong> | l | <strong>124</strong> | \| |
  | <strong>13</strong> | CR | <strong>29</strong> | GS | <strong>45</strong> | - | <strong>61</strong> | = | <strong>77</strong> | M | <strong>93</strong> | ] | <strong>109</strong> | m | <strong>125</strong> | } |
  | <strong>14</strong> | SO | <strong>30</strong> | RS | <strong>46</strong> | . | <strong>62</strong> | > | <strong>78</strong> | N | <strong>94</strong> | ^ | <strong>110</strong> | n | <strong>126</strong> | ~ |
  | <strong>15</strong> | SI | <strong>31</strong> | US | <strong>47</strong> | / | <strong>63</strong> | ? | <strong>79</strong> | O | <strong>95</strong> | _ | <strong>111</strong> | o | <strong>127</strong> | DEL |
- 当一个 ASCII 小写字母（a-z）减去 `32` 时，就得到同一个字母的大写形式。注意这只适用于 ASCII 字母 a-z，不适用于带重音符号的字符或非 ASCII 字符。
- 虽然这个程序达到了我们想要的效果，但用 `ctype.h` 库有更简单的方法。把你的程序修改如下：
  
  ```
  // Uppercases string using ctype library (and an unnecessary condition)
  
  #include <cs50.h>
  #include <ctype.h>
  #include <stdio.h>
  #include <string.h>
  
  int main(void)
  {
      string s = get_string("Before: ");
      printf("After:  ");
      for (int i = 0, n = strlen(s); i < n; i++)
      {
          if (islower(s[i]))
          {
              printf("%c", toupper(s[i]));
          }
          else
          {
              printf("%c", s[i]);
          }
      }
      printf("\n");
  }
  ```
  
  注意程序遍历字符串的每个字符。`toupper` 函数接收 `s[i]`。每个字符（如果是小写）都会被转换成大写。
- 值得一提的是，`toupper` 自己就知道只把小写字符转成大写。因此，你的代码可以简化如下：
  
  ```
  // Uppercases string using ctype library
  
  #include <cs50.h>
  #include <ctype.h>
  #include <stdio.h>
  #include <string.h>
  
  int main(void)
  {
      string s = get_string("Before: ");
      printf("After:  ");
      for (int i = 0, n = strlen(s); i < n; i++)
      {
          printf("%c", toupper(s[i]));
      }
      printf("\n");
  }
  ```
  
  注意这段代码使用 `ctype` 库把字符串转成了大写。
- 你可以在[手册页](https://manual.cs50.io/#ctype.h)上阅读 `ctype` 库的全部功能。

## 命令行参数

- `命令行参数`是在命令行上传给你的程序的参数。例如，你在 `clang` 之后输入的所有内容都算作命令行参数。你也可以在自己的程序中使用这些参数！
- 在终端窗口中输入 `code greet.c`，并按如下方式编写代码：
  
  ```
  // Uses get_string
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      string answer = get_string("What's your name? ");
      printf("hello, %s\n", answer);
  }
  ```
  
  注意这会对用户说 `hello`。
- 不过，如果能在程序运行之前就接收参数，岂不是更好？把你的代码修改如下：
  
  ```
  // Prints a command-line argument
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(int argc, string argv[])
  {
      if (argc == 2)
      {
          printf("hello, %s\n", argv[1]);
      }
      else
      {
          printf("hello, world\n");
      }
  }
  ```
  
  注意这个程序知道 `argc`，即命令行参数的个数，也知道 `argv`，即在命令行上作为参数传入的字符串数组。
- 因此，按照这个程序的语法，执行 `./greet David` 会让程序输出 `hello, David`。
- 你可以用下面的代码打印每一个命令行参数：
  
  ```
  // Prints command-line arguments
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(int argc, string argv[])
  {
      for (int i = 0; i < argc; i++)
      {
          printf("%s\n", argv[i]);
      }
  }
  ```
  
  注意这段代码把每个命令行参数各打印在一行上。第一个参数（argv[0]）始终是程序本身的名字，后面才是运行程序时你提供的参数。

## 退出状态

- 程序结束时，会向计算机提供一个特殊的退出码。
- 当程序正常退出、没有出错时，会向计算机提供状态码 `0`。通常，当发生错误导致程序结束时，会向计算机提供状态 `1`。
- 你可以写出下面的程序来说明这一点：输入 `code status.c`，并按如下方式编写代码：
  
  ```
  // Returns explicit value from main
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(int argc, string argv[])
  {
      if (argc != 2)
      {
          printf("Missing command-line argument\n");
          return 1;
      }
      printf("hello, %s\n", argv[1]);
      return 0;
  }
  ```
  
  注意如果你没有提供 `./status David`，退出状态就是 `1`。但如果你提供了 `./status David`，退出状态就是 `0`。
- 你可以在终端中输入 `echo $?`，查看上一条运行的命令的退出状态。
- 你可以想象如何利用上面这个程序的一部分，来检查用户是否提供了正确数量的命令行参数。

## 小结

在这一课中，你更详细地了解了编译，以及数据是如何存储在计算机内部的。具体来说，你学到了……

- 编译器大致是如何工作的。
- 如何用四种方法调试代码。
- 如何在代码中使用数组。
- 数组如何把数据存储在内存中背靠背的区域里。
- 字符串其实就是字符数组。
- 如何在代码中操作数组。
- 如何把命令行参数传给你的程序。

下次见！
