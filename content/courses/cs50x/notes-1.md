# 第 1 讲

## 欢迎！

- 上一讲我们学习了 Scratch，一种可视化编程语言。
- 学习计算机科学的概念可能相当有挑战性，甚至会让你觉得像是在用嘴去接消防水管喷出的水。请记住：最终重要的，是你在接下来的几周、几个月里，通过在本课程中的努力和学习所获得的进步。
- 事实上，在 Scratch 中出现的所有基本编程概念，在你学习任何一门编程语言时都会用到。Scratch 里的函数、条件、循环和变量，是你在任何编程语言中都会遇到的基本构件。

## 源代码

- 回想一下，机器只能理解二进制。人类编写的是<em>源代码</em>（source code），也就是一份人类可读的、给计算机的指令列表；而机器只能理解我们现在可以称之为<em>机器码</em>（machine code）的东西。机器码是由一和零组成的模式，能产生我们想要的效果。
- 事实证明，我们可以用一种非常特殊的软件，即<em>编译器</em>（compiler），把<em>源代码</em>转换成机器码。今天，我们将向你介绍一个编译器，它可以把用 <em>C</em> 语言编写的源代码转换成机器码。
  
  ```mermaid
  flowchart LR
      in["source code"] --> BOX[" compiler "]
      BOX --> out["machine code"]
  ```
- 今天，除了学习如何编程，你还将学习如何写出好的代码。

## 用于 CS50 的 Visual Studio Code

- 本课程使用的文本编辑器是 <em>Visual Studio Code</em>，简称 <em>VS Code</em>，我们亲切地称之为 [cs50.dev](https://cs50.dev)，你可以通过同一个网址访问它。
- 我们使用 VS Code 的一个最重要的原因，是它已经预装了本课程所需的全部软件。本课程和这里的说明都是围绕 VS Code 设计的。
- 在自己的电脑上手动安装课程所需的软件，是一件麻烦又头疼的事。本课程的作业最好始终使用 VS Code。
- 你可以在 [cs50.dev](https://cs50.dev/) 打开 VS Code。
- 这个 IDE 可以分成几个区域：
  
  ![IDE](https://cs50.harvard.edu/x/notes/1/cs50Week1Slide017.png) 注意左侧有一个<em>文件资源管理器</em>（file explorer），你可以在这里找到自己的文件。另外，中间有一个叫做<em>文本编辑器</em>（text editor）的区域，你可以在这里编辑程序。最后是一个`命令行界面`，称为 <em>CLI</em>、<em>命令行</em>或<em>终端窗口</em>，我们可以通过它向云端的计算机发送命令。
- 你还会注意到，在图形用户界面（GUI）左侧的栏中，有各种工具和一个文件资源管理器。
- 因为这个 IDE 已经预先配置好了所有必需的软件，所以你应该用它来完成本课程的所有作业。

## Hello World

- 我们将用三条命令来编写、编译并运行我们的第一个程序：
  
  ```
  code hello.c
  
  make hello
  
  ./hello
  ```
  
  第一条命令 `code hello.c` 创建一个文件，并让我们为这个程序输入指令。第二条命令 `make hello` 把我们用 C 写的指令<em>编译</em>（compile）成一个名为 `hello` 的可执行文件。最后一条命令 `./hello` 运行名为 `hello` 的程序。
- 在终端窗口中输入 `code hello.c`，就可以开始构建你的第一个 C 程序。注意我们特意把整个文件名写成小写，并且带上了 `.c` 扩展名。然后，在出现的文本编辑器中，按如下方式编写代码：
  
  ```
  // A program that says hello to the world
  
  #include <stdio.h>
  
  int main(void)
  {
      printf("hello, world\n");
  }
  ```
  
  注意上面的每一个字符都有其作用。如果输错了，程序就无法运行。`printf` 是一个可以输出一行文本的函数。注意引号和分号的位置。另外，注意 `\n` 会在 `hello, world` 之后产生一个换行。
- 点回终端窗口，执行 `make hello` 就可以编译你的代码。注意我们省略了 `.c`。`make` 是一个构建工具，它会编译我们的 `hello.c` 文件，并把它变成一个名为 `hello` 的程序。如果执行这条命令没有出现错误，就可以继续。如果有错误，请仔细检查你的代码，确保它与上面的一致。
- 现在，输入 `./hello`，你的程序就会运行并输出 `hello, world`。
- 现在，打开左侧的文件资源管理器。你会发现现在既有一个叫 `hello.c` 的文件，也有一个叫 `hello` 的文件。`hello.c` 包含你的源代码，人类和编译器都能读懂。`hello` 是一个可执行文件，包含计算机可以直接运行的机器码。

## 从 Scratch 到 C

- 在 Scratch 中，我们使用 `say` 积木在屏幕上显示任何文本。实际上，在 C 中，有一个叫做 `printf` 的函数，做的正是同样的事。
- 注意我们的代码已经调用了这个函数：
  
  ```
  printf("hello, world\n");
  ```
  
  注意这里调用了 printf 函数。传给 printf 的参数是用双引号括起来的 `hello, world\n`。这条代码语句以 `;` 结束。
- 代码中出错是常有的事，尤其是分号、引号这类语法问题。把你的代码修改如下：
  
  ```
  // \n is missing
  
  #include <stdio.h>
  
  int main(void)
  {
      printf("hello, world");
  }
  ```
  
  注意 `\n` 现在不见了。
- 在终端窗口中运行 `make hello`。因为你修改了程序，所以必须重新编译。
- 在终端窗口中输入 `./hello`，你的程序有什么变化？这个 `\` 字符叫做<em>转义字符</em>（escape character），它告诉编译器 `\n` 是一个特殊指令，表示换行。
- 还有其他可以使用的转义字符：
  
  ```
  \n  create a new line
  \r  return to the start of a line
  \"  print a double quote
  \'  print a single quote
  \\  print a backslash
  ```
- 把你的程序恢复成下面这样：
  
  ```
  // A program that says hello to the world
  
  #include <stdio.h>
  
  int main(void)
  {
      printf("hello, world\n");
  }
  ```
  
  注意分号和 `\n` 已经恢复了。

## 头文件与 CS50 手册页

- 代码开头的语句 `#include <stdio.h>` 是一条非常特殊的命令，它告诉编译器你想使用名为 `stdio.h` 的<em>库</em>（library）的功能，这是一个<em>头文件</em>（header file）。这样你就可以使用 `printf` 函数，以及许多其他功能。注意，它不叫 <em>studio</em>，而是 `stdio.h`。
- <em>库</em>是别人编写的一组代码的集合。库就是别人过去写好的代码和函数的集合，我们可以在自己的代码中使用它们。
- 你可以在[手册页](https://manual.cs50.io)上阅读这个库的全部功能。手册页让你能更好地理解各种命令是做什么的、如何工作的。
- 事实上，CS50 有自己的库，叫做 `cs50.h`。其中包含许多函数，在你刚开始学习 C 时，它们就像<em>辅助轮</em>一样：
  
  ```
  get_char
  get_double
  get_float
  get_int
  get_long
  get_string
  ```
- 这些库已经为你预装在 [cs50.dev](https://cs50.dev) 上了。如果你想在自己的电脑上使用这些库，很可能需要自己安装。这就是为什么在本课程中你应该使用 [cs50.dev](https://cs50.dev)，因为它已经为你装好了所有必需的软件。
- 让我们在你的程序中使用这个库。

## Hello, You

- 回想一下，在 Scratch 中，我们可以询问用户“你叫什么名字？”，然后把这个名字拼在“hello”后面说出来。
- 在 C 中，我们也可以做同样的事。把你的代码修改如下：
  
  ```
  // get_string and printf with incorrect placeholder
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      string answer = get_string("What's your name? ");
      printf("hello, answer\n");
  }
  ```
  
  `get_string` 函数用来从用户那里获取一个字符串。然后，变量 `answer` 被传给 `printf` 函数。
- 在终端窗口中再次运行 `make hello`，注意会出现大量错误。
- 看看这些错误，编译器无法识别 `string` 和 `get_string`。我们需要通过添加一个名为 `cs50.h` 的库，把这些定义提供给编译器。另外我们还注意到，`answer` 并没有按我们的意图输出。把你的代码修改如下：
  
  ```
  // get_string and printf with %s
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      string answer = get_string("What's your name? ");
      printf("hello, %s\n", answer);
  }
  ```
  
  `get_string` 函数用来从用户那里获取一个字符串。然后，变量 `answer` 被传给 `printf` 函数。`%s` 告诉 `printf` 函数要准备好接收一个 `string`。
- 现在，在终端窗口中再次运行 `make hello`，然后输入 `./hello` 运行你的程序。程序现在会询问你的名字，然后如预期那样，在 hello 后面带上你的名字。
- `answer` 是一个特殊的存放位置，我们称之为<em>变量</em>（variable）。`answer` 的类型是 `string`，可以在其中存放任何字符串。有许多<em>数据类型</em>（data type），比如 `int`、`bool`、`char` 等等。
- `%s` 是一个占位符，叫做<em>格式码</em>（format code），告诉 `printf` 函数准备接收一个 `string`。`answer` 就是传给 `%s` 的 `string`。

## Linux

- 我们一直在用 CLI 来 `make` 和运行我们的程序。
- 在执行命令和处理文件时，CLI 通常比 GUI 更好用。
- 在终端窗口，也就是 CLI 中，我们可能会用到的一些常用命令包括：
  
  - `cd`，用于切换当前目录（文件夹）
  - `cp`，用于复制文件和目录
  - `ls`，用于列出目录中的文件
  - `mkdir`，用于创建目录
  - `mv`，用于移动（重命名）文件和目录
  - `rm`，用于删除文件
  - `rmdir`，用于删除目录
- 最常用的是 `ls`，它会列出当前目录中的所有文件。试着在终端窗口中输入 `ls` 并按下 `enter`。你会看到当前文件夹中的所有文件。

## 条件

- 你在 Scratch 中用过的另一个构件是<em>条件</em>（conditional）。例如，你可能想在 x 大于 y 时做一件事；而如果这个条件不满足，则做另一件事。
- 我们来看几个 Scratch 中的例子。
- 在 C 中，你可以这样比较两个值：
  
  ```
  // Conditionals that are mutually exclusive
  
  if (x < y)
  {
      printf("x is less than y\n");
  }
  else
  {
      printf("x is not less than y\n");
  }
  ```
  
  注意如果 `x < y`，就会出现一种结果；如果 `x` 不小于 `y`，就会出现另一种结果。
- 类似地，我们可以规划三种可能的结果：
  
  ```
  // Conditional that isn't necessary
  
  if (x < y)
  {
      printf("x is less than y\n");
  }
  else if (x > y)
  {
      printf("x is greater than y\n");
  }
  else if (x == y)
  {
      printf("x is equal to y\n");
  }
  ```
  
  注意并不是所有这些代码行都是必需的。我们怎样才能去掉上面多余的判断呢？
- 你可能已经猜到了，我们可以这样改进这段代码：
  
  ```
  // Compare integers
  
  if (x < y)
  {
      printf("x is less than y\n");
  }
  else if (x > y)
  {
      printf("x is greater than y\n");
  }
  else
  {
      printf("x is equal to y\n");
  }
  ```
  
  注意最后一条语句被替换成了 `else`。

## 类型

- C 中有许多可用的数据类型：
  
  ```
  bool
  char
  float
  int
  long
  string
  ...
  ```

## 格式码

- 你可能还记得，之前我们在 `printf` 中用占位符 `%s` 表示字符串。这个占位符叫做<em>格式码</em>。
- `printf` 支持很多格式码。下面是本课程中你可能用到的一些格式码（并不完整）：
  
  ```
  %c
  %f
  %i
  %li
  %s
  ```
  
  `%c` 用于 `char`（字符）变量。`%f` 用于 `float`（浮点数）变量。`%i` 用于 `int`（整数）变量。`%li` 用于 `long` 长整数变量。`%s` 用于 `string` 变量。你可以在[手册页](https://manual.cs50.io)上了解更多。
- 在整个课程中，我们会用到 C 的许多可用数据类型。

## 变量

- 在 C 中，你可以这样给 `int`（整数）赋值：
  
  ```
  int counter = 0;
  ```
  
  注意一个类型为 `int`、名为 `counter` 的变量被赋值为 `0`。
- 也可以用 C 编程，让 `counter` 加一：
  
  ```
  counter = counter + 1;
  ```
  
  注意 `counter` 的值加上了 `1`。
- 这也可以写成：
  
  ```
  counter += 1;
  ```
- 还可以进一步简化为：
  
  ```
  counter++;
  ```
  
  注意这里用 `++` 来加 1。
- 你也可以让 `counter` 减一：
  
  ```
  counter--;
  ```
  
  注意在这种写法中，`counter` 的值减去了 `1`。

## compare.c

- 有了这些关于给变量赋值的新知识，你就可以编写你的第一个条件语句了。
- 在终端窗口中输入 `code compare.c`，并按如下方式编写代码：
  
  ```
  // Conditional, Boolean expression, relational operator
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Prompt user for integers
      int x = get_int("What's x? ");
      int y = get_int("What's y? ");
  
      // Compare integers
      if (x < y)
      {
          printf("x is less than y\n");
      }
  }
  ```
  
  注意我们创建了两个变量，一个叫 `x` 的 `int`（整数），另一个叫 `y`。它们的值通过 `get_int` 函数获得。
- 你可以在终端窗口中执行 `make compare`，然后执行 `./compare` 来运行代码。如果出现任何错误信息，请检查你的代码有无错误。
- 我们可以按如下方式改进你的程序：
  
  ```
  // Conditionals
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Prompt user for integers
      int x = get_int("What's x? ");
      int y = get_int("What's y? ");
  
      // Compare integers
      if (x < y)
      {
          printf("x is less than y\n");
      }
      else if (x > y)
      {
          printf("x is greater than y\n");
      }
      else
      {
          printf("x is equal to y\n");
      }
  }
  ```
  
  注意现在所有可能的结果都考虑到了。
- 你可以重新 make 并重新运行程序，测试一下。
- 用各种流程图来审视这些程序，你可以看出我们代码设计决策的效率。几乎任何一段代码都可以转化为可视化的形式。

## agree.c

- 来看另一种数据类型 `char`，在终端窗口中输入 `code agree.c` 开始一个新程序。
- `string` 是一串字符，而 `char` 是单个字符。
- 在文本编辑器中，按如下方式编写代码：
  
  ```
  // Comparing against lowercase char
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Prompt user to agree
      char c = get_char("Do you agree? ");
  
      // Check whether agreed
      if (c == 'y')
      {
          printf("Agreed.\n");
      }
      else if (c == 'n')
      {
          printf("Not agreed.\n");
      }
  }
  ```
  
  注意单个字符（`char` 类型）使用单引号，而字符串使用双引号。另外，注意 `==` 用来判断某个东西<em>是否等于</em>另一个东西，而单个等号在 C 中的作用则完全不同。
- 你可以在终端窗口输入 `make agree`，然后输入 `./agree` 来测试代码。
- 我们还可以允许输入大写和小写字符：
  
  ```
  // Comparing against lowercase and uppercase char
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Prompt user to agree
      char c = get_char("Do you agree? ");
  
      // Check whether agreed
      if (c == 'y')
      {
          printf("Agreed.\n");
      }
      else if (c == 'Y')
      {
          printf("Agreed.\n");
      }
      else
      {
          printf("Not agreed.\n");
      }
  }
  ```
  
  注意现在提供了更多选项。不过，这样的代码效率并不高。
- 我们可以这样改进这段代码：
  
  ```
  // Logical operators
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Prompt user to agree
      char c = get_char("Do you agree? ");
  
      // Check whether agreed
      if (c == 'Y' || c == 'y')
      {
          printf("Agreed.\n");
      }
      else
      {
          printf("Not agreed.\n");
      }
  }
  ```
  
  注意 `||` 的实际含义是<em>或</em>。

## 循环与 meow.c

- 我们也可以在 C 程序中使用 Scratch 里的循环构件。
- 在终端窗口中输入 `code meow.c`，并按如下方式编写代码：
  
  ```
  // Opportunity for better design
  
  #include <stdio.h>
  
  int main(void)
  {
      printf("meow\n");
      printf("meow\n");
      printf("meow\n");
  }
  ```
  
  注意这样做达到了预期效果，但在设计上还有改进的余地。代码被一遍又一遍地重复。
- 我们可以把代码修改如下来改进程序：
  
  ```
  // Better design
  
  #include <stdio.h>
  
  int main(void)
  {
      int i = 3;
      while (i > 0)
      {
          printf("meow\n");
          i--;
      }
  }
  ```
  
  注意我们创建了一个名为 `i` 的 `int`，并赋值为 `3`。然后，我们创建了一个 `while` 循环，只要 `i > 0` 就会运行。接着循环运行。每次都用 `i--` 语句让 `i` 减去 `1`。
- 类似地，我们可以把代码修改如下，实现某种正向计数：
  
  ```
  // Print values of i
  
  #include <stdio.h>
  
  int main(void)
  {
      int i = 1;
      while (i <= 3)
      {
          printf("meow\n");
          i++;
      }
  }
  ```
  
  注意我们的计数器 `i` 从 `1` 开始。每次循环运行时，计数器都会加 `1`。一旦计数器大于 `3`，就会停止循环。
- 一般来说，在计算机科学中，我们从零开始计数。最好把你的代码修改如下：
  
  ```
  // Better design
  
  #include <stdio.h>
  
  int main(void)
  {
      int i = 0;
      while (i < 3)
      {
          printf("meow\n");
          i++;
      }
  }
  ```
  
  注意我们现在是从零开始计数。
- 我们工具箱里的另一种循环工具是 `for` 循环。
- 你可以用 `for` 循环进一步改进 `meow.c` 程序的设计。把你的代码修改如下：
  
  ```
  // Better design
  
  #include <stdio.h>
  
  int main(void)
  {
      for (int i = 0; i < 3; i++)
      {
          printf("meow\n");
      }
  }
  ```
  
  注意 `for` 循环包含三个部分。第一部分 `int i = 0` 让计数器从零开始。第二部分 `i < 3` 是被检查的条件。最后，`i++` 告诉循环每次运行时加一。
- 我们甚至可以用下面的代码让循环永远运行下去：
  
  ```
  // Infinite loop
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      while (true)
      {
          printf("meow\n");
      }
  }
  ```
  
  注意 `true` 永远成立。因此，这段代码会一直运行。运行这段代码会让你失去对终端窗口的控制。你可以在键盘上按 `control-C` 来跳出无限循环（这会发送一个 SIGINT 信号来终止程序）。
- 我们可以把代码修改如下，询问用户要喵几次：
  
  ```
  // Prompts user for n.
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      int n = get_int("What's n? ");
  
      for (int i = 0; i < n; i++)
      {
          printf("meow\n");
      }
  }
  ```
  
  注意 `n` 由用户定义。然后，就会喵 `n` 次。
- 如果用户输入了小于零的数，会发生什么？把你的代码修改如下：
  
  ```
  // Prompts user again if need be. (Poor design.)
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      int n = get_int("What's n? ");
      if (n < 0)
      {
          n = get_int("What's n? ");
      }
  
      for (int i = 0; i < n; i++)
      {
          printf("meow\n");
      }
  }
  ```
  
  注意这样也许能阻止用户输入一次小于零的数。但如果他们连续输入好几次呢？
- 按如下方式改进你的代码：
  
  ```
  // Uses a loop with continue/break.
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      int n;
      while (true)
      {
          n = get_int("What's n? ");
          if (n < 0)
          {
              continue;
          }
          else
          {
              break;
          }
      }
  
      for (int i = 0; i < n; i++)
      {
          printf("meow\n");
      }
  }
  ```
  
  注意这个 `while` 循环会一直运行，直到 `n` 大于或等于零。
- 不过，这段代码还可以进一步改进：
  
  ```
  // Uses a loop with just break.
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      int n;
      while (true)
      {
          n = get_int("What's n? ");
          if (n >= 0)
          {
              break;
          }
      }
  
      for (int i = 0; i < n; i++)
      {
          printf("meow\n");
      }
  }
  ```
  
  注意我们之前的代码被简化了，去掉了不必要的代码行。
- 与 `while` 循环类似，我们也可以用 `do-while` 循环来实现这段代码：
  
  ```
  // Uses a do-while loop instead.
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      int n;
      do
      {
          n = get_int("What's n? ");
      }
      while (n < 0);
  
      for (int i = 0; i < n; i++)
      {
          printf("meow\n");
      }
  }
  ```
  
  注意 `do` 部分总会至少运行一次。这部分代码会在 `n` 小于零时一直循环。
- 眼光挑剔的人可能会发现，我们可以把负责喵喵叫的那部分代码<em>抽象</em>出来。

## 函数

- 虽然我们之后会提供更多指导，但你可以在 C 中这样创建自己的函数：
  
  ```
  void meow(void)
  {
      printf("meow\n");
  }
  ```
  
  开头的 `void` 表示这个函数不返回任何值。`(void)` 表示没有值传给这个函数。
- 这个函数可以在 main 函数中这样使用：
  
  ```
  // Abstraction
  
  #include <stdio.h>
  
  void meow(void);
  
  int main(void)
  {
      for (int i = 0; i < 3; i++)
      {
          meow();
      }
  }
  
  // Meow once
  void meow(void)
  {
      printf("meow\n");
  }
  ```
  
  注意 `meow` 函数是通过 `meow()` 这条指令调用的。这之所以可行，是因为 `meow` 函数定义在代码底部，而该函数的<em>原型</em>（prototype）`void meow(void)` 写在代码顶部。
- 你的 `meow` 函数还可以进一步修改，使其接受输入：
  
  ```
  // Abstraction with parameterization
  
  #include <stdio.h>
  
  void meow(int n);
  
  int main(void)
  {
      meow(3);
  }
  
  // Meow some number of times
  void meow(int n)
  {
      for (int i = 0; i < n; i++)
      {
          printf("meow\n");
      }
  }
  ```
  
  注意原型已经变成了 `void meow(int n)`，表示 `meow` 接受一个 `int` 作为输入。
- 在使用变量和函数时，理解变量的<em>作用域</em>（scope）很重要。考虑下面的代码：
  
  ```
  // Demonstrates scope
  
  #include <stdio.h>
  
  void meow(int n);
  
  int main(void)
  {
      int n = 3;
      meow(n);
  }
  
  // Meow some number of times
  void meow(int n)
  {
      for (int i = 0; i < n; i++)
      {
          printf("meow\n");
      }
  }
  ```
  
  注意 `n` 是在 `main` 函数中定义的。因此，`n` 只在 `main` 函数的作用域内。`meow` 函数能用到 `n` 的唯一方式，是把 `n` 的一个副本传给 `meow` 函数。`meow` 用的不是 `main` 函数中原来的 `n`，而是它自己的 `n` 副本。
- 稍微修改一下代码，我们就可以获取用户输入：
  
  ```
  // User input
  
  #include <cs50.h>
  #include <stdio.h>
  
  void meow(int n);
  
  int main(void)
  {
      int n;
      do
      {
          n = get_int("Number: ");
      }
      while (n < 1);
      meow(n);
  }
  
  // Meow some number of times
  void meow(int n)
  {
      for (int i = 0; i < n; i++)
      {
          printf("meow\n");
      }
  }
  ```
  
  注意这里用 `get_int` 从用户那里获取一个数字。`n` 被传给 `meow`。
- 我们甚至可以检验用户提供的输入是否正确：
  
  ```
  // Return value
  
  #include <cs50.h>
  #include <stdio.h>
  
  int get_positive_int(void);
  void meow(int n);
  
  int main(void)
  {
      int n = get_positive_int();
      meow(n);
  }
  
  // Get number of meows
  int get_positive_int(void)
  {
      int n;
      do
      {
          n = get_int("Number: ");
      }
      while (n < 1);
      return n;
  }
  
  // Meow some number of times
  void meow(int n)
  {
      for (int i = 0; i < n; i++)
      {
          printf("meow\n");
      }
  }
  ```
  
  注意这里有一个名为 `get_positive_int` 的新函数，在 `n < 1` 时会不断向用户索要一个整数。在得到一个正整数之后，这个函数会把 `n` 用 `return n` 返回给 `main` 函数。

## 正确性、设计、代码风格

- 代码可以从三个维度来评价。
- 第一，<em>正确性</em>（correctness）指的是“代码是否按预期运行？”你可以用 `check50` 检查代码的正确性。
- 第二，<em>设计</em>（design）指的是“代码设计得有多好？”你可以用 `design50` 评估代码的设计。
- 最后，<em>风格</em>（style）指的是“代码在美观和一致性上如何？”你可以用 `style50` 评估代码的风格。

## Mario

- 我们今天讨论的所有内容，都集中在你作为一名初出茅庐的计算机科学家所需的各种基本构件上。
- 下面的内容将帮助你大致了解如何着手完成本课程的习题集：面对一个与计算机科学相关的问题，该怎么入手？
- 想象我们想模仿游戏《超级马里奥兄弟》的画面。看看图中的四个问号方块，我们该如何编写代码来大致表示这四个水平排列的方块？
  
  ![Mario Question Marks](https://cs50.harvard.edu/x/notes/1/cs50Week1Slide123.png)
- 在终端窗口中输入 `code mario.c`，并按如下方式编写代码：
  
  ```
  // Prints a row of 4 question marks
  
  #include <stdio.h>
  
  int main(void)
  {
      printf("????\n");
  }
  ```
  
  注意这里打印出了四个问号。
- 用循环，我们可以更高效地打印这些问号：
  
  ```
  // Prints a row of 4 question marks with a loop
  
  #include <stdio.h>
  
  int main(void)
  {
      for (int i = 0; i < 4; i++)
      {
          printf("?");
      }
      printf("\n");
  }
  ```
  
  注意这里是用循环打印出四个问号的。
- 类似地，我们可以用同样的逻辑创建三个垂直排列的方块。
  
  ![Mario Blocks](https://cs50.harvard.edu/x/notes/1/cs50Week1Slide125.png)
- 要做到这一点，把你的代码修改如下：
  
  ```
  // Prints a column of 3 bricks with a loop
  
  #include <stdio.h>
  
  int main(void)
  {
      for (int i = 0; i < 3; i++)
      {
          printf("#\n");
      }
  }
  ```
  
  注意这里是用循环打印出三块垂直排列的砖。
- 如果我们想把这些想法结合起来，创建一个三乘三的方块群，该怎么做？
  
  ![Mario Grid](https://cs50.harvard.edu/x/notes/1/cs50Week1Slide127.png)
- 我们可以沿着上面的逻辑，把同样的想法结合起来。把你的代码修改如下：
  
  ```
  // Prints a 3-by-3 grid of bricks with nested loops
  
  #include <stdio.h>
  
  int main(void)
  {
      for (int i = 0; i < 3; i++)
      {
          for (int j = 0; j < 3; j++)
          {
              printf("#");
          }
          printf("\n");
      }
  }
  ```
  
  注意一个循环在另一个循环里面。第一个循环决定当前打印的是哪一行。对每一行，会打印三列。每打印完一行，就打印一个换行。
- 如果我们想确保方块的数量是<em>常量</em>，也就是不可更改的，该怎么做？把你的代码修改如下：
  
  ```
  // Prints a 3-by-3 grid of bricks with nested loops using a constant
  
  #include <stdio.h>
  
  int main(void)
  {
      const int n = 3;
      for (int i = 0; i < n; i++)
      {
          for (int j = 0; j < n; j++)
          {
              printf("#");
          }
          printf("\n");
      }
  }
  ```
  
  注意 `n` 现在是一个常量，它永远不能被改变。
- 正如本讲前面所说明的，我们可以把功能<em>抽象</em>到函数中。考虑下面的代码：
  
  ```
  // Helper function
  
  #include <stdio.h>
  
  void print_row(int width);
    
  int main(void)
  {
      const int n = 3;
      for (int i = 0; i < n; i++)
      {
          print_row(n);
      }
  }
  
  void print_row(int width)
  {
      for (int i = 0; i < width; i++)
      {
          printf("#");
      }
      printf("\n");
  }
  ```
  
  注意打印一行是通过一个新函数完成的。

## 运算符

- <em>运算符</em>（operator）指的是编译器支持的数学运算。在 C 中，这些数学运算符包括：
  
  - `+` 表示加法
  - `-` 表示减法
  - `*` 表示乘法
  - `/` 表示除法
  - `%` 表示取余
- 本课程中我们会用到所有这些运算符。
- 让我们在终端中输入 `code calculator.c`，并按如下方式修改代码，来实现我们自己的计算器：
  
  ```
  // Addition with int
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Prompt user for x
      int x = get_int("What's x? ");
  
      // Prompt user for y
      int y = get_int("What's y? ");
  
      // Add numbers
      int z = x + y;
  
      // Perform addition
      printf("%i\n", z);
  }
  ```
  
  注意我们创建了第三个变量 `z` 来存放 `x` 与 `y` 的和，然后用 `%i`（整数的格式说明符）打印结果。
- 我们可以编写更高效的代码，如下：
  
  ```
  // Addition with int, without third variable
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Prompt user for x
      int x = get_int("What's x? ");
  
      // Prompt user for y
      int y = get_int("What's y? ");
  
      // Perform addition
      printf("%i\n", x + y);
  }
  ```
  
  注意我们直接在 `printf` 语句中做加法，从而省去了第三个变量 `z`，让代码更简洁。
- 我们还可以用乘法：
  
  ```
  // Doubles a number
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Prompt user for x
      int x = get_int("What's x? ");
  
      // Double it
      printf("%i\n", x * 2);
  }
  ```
  
  注意我们用乘法运算符 `*` 把输入值翻倍，展示了加法之外的另一种算术运算。
- `C` 中的整数能数到的数是有上限的。考虑下面的代码：
  
  ```
  // Overflow 
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      int dollars = 1;
      while (true)
      {
          char c = get_char("Here's $%i. Double it and give to next person? ", dollars);
          if (c == 'y')
          {
              dollars *= 2;
          }
          else
          {
              break;
          }
      }
      printf("Here's $%i.\n", dollars);
  }
  ```
  
  注意这个程序不断把美元数翻倍。最终，这个整数会超过它的最大值而“溢出”（overflow），回绕成一个负数或零。
- 整数溢出是指某次计算产生的值超过了该数据类型的最大存储容量，导致数值不可预测地回绕。
- C 的挑战之一在于：虽然它让你对内存的使用拥有极大的控制权，但程序员必须十分清楚内存管理中的潜在陷阱。
- 类型指的是变量中可以存储的数据。例如，`char` 是用来容纳单个字符的，比如 `a` 或 `2`。
- 类型非常重要，因为每种类型都有特定的限制。例如，由于内存的限制，有符号 `int` 的最大值通常是 `2147483647`，而无符号 `int` 可以达到 `4294967295`。如果你试图让一个 `int` 数得比它的最大值还大，就会发生<em>整数溢出</em>，这个变量里就会存入一个错误的值。
- 位数决定了我们能表示的数值范围。
- 这可能会在现实世界中造成灾难性的影响。
- 我们可以通过使用 `long` 变量类型来解决这个问题：
  
  ```
  // long
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      long dollars = 1;
      while (true)
      {
          char c = get_char("Here's $%li. Double it and give to next person? ", dollars);
          if (c == 'y')
          {
              dollars *= 2;
          }
          else
          {
              break;
          }
      }
      printf("Here's $%li.\n", dollars);
  }
  ```
  
  注意我们把 `int` 改成了 `long`，并在格式字符串中用 `%li` 代替了 `%i`。`long` 可以存储比 `int` 大得多的值，从而推迟了（但并没有消除）溢出问题。
- 你可能知道，整数和浮点数变量有一个显著的区别：能否表示小于 `1` 的数。考虑下面的代码：
  
  ```
  // Division with ints, demonstrating truncation
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Prompt user for x
      int x = get_int("What's x? ");
  
      // Prompt user for y
      int y = get_int("What's y? ");
  
      // Divide x by y
      printf("%i\n", x / y);
  }
  ```
  
  注意在两个整数相除时，C 执行的是整数除法，并截断（丢弃）小数部分。例如，7 / 2 会得到 3，而不是 3.5。
- <em>浮点数不精确</em>（floating point imprecision）说明了计算机计算数字的精度是有限的。
- 在编写代码时，要特别留意你所使用的变量类型，以避免代码中出问题。
- 我们看了一些因类型相关的错误而造成灾难的例子。
- 类似地，我们可以把一个整数<em>强制转换</em>（`cast`）为 `float`。考虑下面的代码：
  
  ```
  // Casting
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Prompt user for x
      int x = get_int("What's x? ");
  
      // Prompt user for y
      int y = get_int("What's y? ");
  
      // Divide x by y
      printf("%f\n", (float) x / y);
  }
  ```
  
  注意我们在除法之前用 `(float) x` 把 `x` 转换成了 `float`。这会把整数转换成浮点数，使除法产生带小数的结果，而不是被截断。
- 我们也可以全程使用 `float`：
  
  ```
  // Floats
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Prompt user for x
      float x = get_float("What's x? ");
  
      // Prompt user for y
      float y = get_float("What's y? ");
  
      // Divide x by y
      printf("%.50f\n", x / y);
  }
  ```
  
  注意我们用 `get_float` 获取输入，并用 `%.50f` 显示最多 50 位小数，这揭示了浮点数精度的局限：由于二进制表示的限制，结果可能会出现意想不到的数字。

## 小结

在这一课中，你学会了如何把在 Scratch 中学到的基本构件应用到 C 编程语言中。你学到了……

- 如何创建你的第一个 C 程序。
- 如何使用命令行。
- C 自带的预定义函数。
- 如何使用变量、条件和循环。
- 如何创建自己的函数，以简化和改进你的代码。
- 如何从三个维度评价你的代码：正确性、设计和风格。
- 如何在代码中加入注释。
- 如何使用类型和运算符，以及你的选择会带来的影响。

下次见！
