# 第 6 讲

## 欢迎！

- 在前几周，你已经了解了编程的基本构件。
- 你学习的是一门叫做 C 的较底层的编程语言。
- 今天，我们将使用一门更高层的编程语言，叫做 <em>Python</em>。
- 学习这门新语言的过程中，你会发现自己越来越有能力自学新的编程语言。

## Hello Python!

- 几十年来，人们逐渐看清了以往编程语言中的设计决策可以如何改进。
- Python 是一门建立在你已学过的 C 之上的编程语言。
- 此外，Python 还能使用大量由用户创建的库。
- C 是一门<em>编译型语言（compiled language）</em>，而 Python 是一门<em>解释型语言（interpreted language）</em>，你不需要单独编译程序，而是在 <em>Python 解释器（Python Interpreter）</em>中运行它。
- 到目前为止，代码看起来是这样的：
  
  1/hello0.c
  
  ```
  // A program that says hello to the world
  
  #include <stdio.h>
  
  int main(void)
  {
      printf("hello, world\n");
  }
  ```
  
  注意，这个 C 程序比下面的 Python 版本复杂得多。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/hello0.c?download)下载这段代码。
- 今天你会发现，编写和编译代码的过程被简化了。
- 例如，上面的代码用 Python 写出来是这样：
  
  1/hello0.py
  
  ```
  # A program that says hello to the world
  
  print("hello, world")
  ```
  
  注意分号不见了，也不需要任何库。你可以在终端中输入 `python hello.py` 来运行这个程序。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/hello0.py?download)下载这段代码。
- Python 能够相对简单地实现在 C 中相当复杂的事情。
- 本周的目标之一是<em>更适应“不适应”</em>：不确切知道如何解决问题，或不知道如何在语法上正确地实现解决方案时，自己去查找资源来帮助自己（当然要遵守本课程的学术诚信政策）！

## Speller

- 为了说明这种简洁，我们在终端窗口中输入 `code dictionary.py`，并编写如下代码：
  
  6/speller/dictionary.py
  
  ```
  # Words in dictionary
  words = set()
  
  
  def check(word):
      """Return true if word is in dictionary else false"""
      return word.lower() in words
  
  
  def load(dictionary):
      """Load dictionary into memory, returning true if successful else false"""
      with open(dictionary) as file:
          words.update(file.read().splitlines())
      return True
  
  
  def size():
      """Returns number of words in dictionary if loaded else 0 if not yet loaded"""
      return len(words)
  
  
  def unload():
      """Unloads dictionary from memory, returning true if successful else false"""
      return True
  ```
  
  注意上面有四个函数。在 `check` 函数中，如果 `word` 在 `words` 里，就返回 `True`。这比用 C 实现容易太多了！同样，在 `load` 函数中，字典文件被打开，文件中的每一行都被加入 `words`。使用 `rstrip` 可以去掉加入单词末尾的换行符。`size` 只需返回 `words` 的 `len`，也就是长度。`unload` 只需返回 `True`，因为 Python 会自己管理内存。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/6/speller/dictionary.py?download)下载这段代码。
- 上面的代码说明了高级语言存在的原因：简化流程，让你更轻松地写代码。
- 不过，速度是一种取舍。因为 C 允许你这个程序员自己决定内存管理，所以根据你的代码，它可能比 Python 运行得更快。C 只运行你写的那几行代码，而当你调用 Python 的内置函数时，Python 还会运行与之相伴的所有幕后代码。
- 你可以在 [Python 文档](https://docs.python.org/3/library/functions.html)中进一步了解这些函数。

## Filter

- 为了进一步说明这种简洁，在终端窗口中输入 `code blur.py` 创建一个新文件，并编写如下代码：
  
  6/filter/blur.py
  
  ```
  # Blurs an image
  
  from PIL import Image, ImageFilter
  
  # Blur image
  before = Image.open("bridge.bmp")
  after = before.filter(ImageFilter.BoxBlur(1))
  after.save("out.bmp")
  ```
  
  注意，这个程序从一个叫 `PIL` 的库中导入了 `Image` 和 `ImageFilter` 两个模块。它读取一个输入文件，并生成一个输出文件。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/6/filter/blur.py?download)下载这段代码。
- 再进一步，你可以新建一个叫 `edges.py` 的文件，内容如下：
  
  6/filter/edges.py
  
  ```
  # Blurs an image
  
  from PIL import Image, ImageFilter
  
  # Find edges
  before = Image.open("bridge.bmp")
  after = before.filter(ImageFilter.FIND_EDGES)
  after.save("out.bmp")
  ```
  
  注意，这段代码只是对你的 `blur` 代码做了一点小改动，却产生了截然不同的结果。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/6/filter/edges.py?download)下载这段代码。
- Python 让你可以把在 C 和其他<em>低级</em>编程语言中复杂得多的编程工作抽象掉。
- 使用 Python 的取舍之一是它是解释型语言，而不是（按我们之前严格定义的）编译型语言。因此，与编译型程序相比，会有一些（通常很小的）意料之外的速度下降。

## 函数

- 在 C 中，你可能见过这样的函数：
  
  ```
  printf("hello, world\n");
  ```
- 在 Python 中，函数是这样的：
  
  ```
  print("hello, world")
  ```

## 库、模块与包

- 和 C 一样，CS50 库也可以在 Python 中使用。
- 下面这些函数会特别有用：
  
  ```
    get_float
    get_int
    get_string
  ```
- 你可以这样导入 cs50 库：
  
  ```
  import cs50
  ```
- 你也可以只从 CS50 库中导入特定的函数：
  
  ```
  from cs50 import get_float, get_int, get_string
  ```

## 字符串

- 在 C 中，你也许还记得这段代码：
  
  1/hello1.c
  
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
  
  注意这个 C 程序是如何使用 CS50 库来获取用户输入的。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/hello1.c?download)下载这段代码。
- 这段代码在 Python 中变成：
  
  1/hello1.py
  
  ```
  # get_string and print, with concatenation
  
  from cs50 import get_string
  
  answer = get_string("What's your name? ")
  print("hello, " + answer)
  ```
  
  你可以在终端窗口执行 `code hello.py` 来写这段代码，然后运行 `python hello.py` 来执行它。注意 `+` 号把 `"hello, "` 和 `answer` 连接（concatenate）在了一起。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/hello1.py?download)下载这段代码。
- 同样，也可以不用连接来实现：
  
  ```
  # get_string and print, without concatenation
  
  from cs50 import get_string
  
  answer = get_string("What's your name? ")
  print("hello,", answer)
  ```
  
  注意，`print` 语句会自动在 `hello` 和 `answer` 之间加上一个空格。
- 类似地，你也可以把上面的代码写成：
  
  1/hello2.py
  
  ```
  # get_string and print, with format strings
  
  from cs50 import get_string
  
  answer  = get_string("What's your name? ")
  print(f"hello, {answer}")
  ```
  
  注意花括号让 `print` 函数能把 `answer` 插入（interpolate）到字符串中。必须有 `f`，才能正确地格式化 `answer`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/hello2.py?download)下载这段代码。

## 位置参数与具名参数

- C 中的 `fread`、`fwrite` 和 `printf` 等函数使用位置参数，即用逗号分隔参数。你这个程序员必须记住每个位置上是什么参数。这些叫做<em>位置参数（positional arguments）</em>。
- 在 Python 中，<em>具名参数（named parameters）</em>允许你提供参数时不必考虑位置。
- 你可以在[文档](https://docs.python.org/3/library/functions.html#print)中进一步了解 `print` 函数的参数。
- 查看这份文档，你会看到下面这样的内容：
  
  ```
  print(*objects, sep=' ', end='\n', file=None, flush=False)
  ```
  
  注意，可以给 print 传入多个对象。它提供了一个默认为单个空格的分隔符，当给 `print` 传入多个对象时就会显示出来。同样，`print` 语句末尾默认会输出一个换行。

## 变量

- 变量声明也被简化了。在 C 中，你可能写 `int counter = 0;`。在 Python 中，同样这一行写作 `counter = 0`。你不需要声明变量的类型。
- Python 提倡用 `counter += 1` 来加一，不再支持 C 中的 `counter++` 写法。

## 类型

- Python 中的数据类型不需要显式声明。例如，你看到上面的 `answer` 是字符串，但我们不必告诉解释器这一点：它自己就知道。
- 在 Python 中，常用的类型包括：
  
  ```
    bool
    float
    int
    str
  ```
  
  注意，这里没有 `long` 和 `double`。Python 会自己处理更大、更小的数字该用什么数据类型。
- Python 中的另一些数据类型包括：
  
  ```
  range   sequence of numbers
  list    sequence of mutable values
  tuple   sequence of immutable values
  dict    collection of key-value pairs
  set     collection of unique values
  ```
- 这些数据类型在 C 中都可以实现，但在 Python 中实现起来更简单。

## 计算器

- 你也许还记得课程早些时候的 `calculator.c`：
  
  1/calculator0.c
  
  ```
  // Addition with int
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // Prompt user for x
      int x = get_int("x: ");
  
      // Prompt user for y
      int y = get_int("y: ");
  
      // Perform addition
      printf("%i\n", x + y);
  }
  ```
  
  注意这个简单计算器的 C 实现。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/calculator0.c?download)下载这段代码。
- 我们可以像在 C 中那样实现一个简单的计算器。在终端窗口中输入 `code calculator.py`，并编写如下代码：
  
  1/calculator0.py
  
  ```
  # Addition with int [using get_int]
  
  from cs50 import get_int
  
  # Prompt user for x
  x = get_int("x: ")
  
  # Prompt user for y
  y = get_int("y: ")
  
  # Perform addition
  print(x + y)
  ```
  
  注意先导入了 CS50 库，然后从用户那里获取 `x` 和 `y`，最后打印结果。还要注意，C 程序中的 `main` 函数完全不见了！虽然你也可以使用 `main` 函数，但这不是必须的。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/calculator0.py?download)下载这段代码。
- 我们也可以拿掉 CS50 库这副“辅助轮”。把你的代码修改如下：
  
  ```
  # Addition with int [using input]
  
  # Prompt user for x
  x = input("x: ")
  
  # Prompt user for y
  y = input("y: ")
  
  # Perform addition
  print(x + y)
  ```
  
  注意，执行上面的代码会出现奇怪的程序行为。这是为什么呢？
- 你可能已经猜到了，解释器把 `x` 和 `y` 当成了字符串。你可以使用 `int` 函数来修复代码：
  
  1/calculator1.py
  
  ```
  # Addition with int [using input]
  
  # Prompt user for x
  x = int(input("x: "))
  
  # Prompt user for y
  y = int(input("y: "))
  
  # Perform addition
  print(x + y)
  ```
  
  注意，`x` 和 `y` 的输入被传给了 `int` 函数，它把输入转换成整数。如果不把 `x` 和 `y` 转换成整数，这些字符就会被连接在一起。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/calculator1.py?download)下载这段代码。

## 条件语句

- 在 C 中，你也许还记得这样的程序：
  
  1/compare3.c
  
  ```
  // Conditionals, Boolean expressions, relational operators
  
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
  
  注意条件语句在 C 中是怎么写的。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/compare3.c?download)下载这段代码。
- 在 Python 中，它是这样的：
  
  1/compare3.py
  
  ```
  # Conditionals, Boolean expressions, relational operators
  
  from cs50 import get_int
  
  # Prompt user for integers
  x = get_int("What's x? ")
  y = get_int("What's y? ")
  
  # Compare integers
  if x < y:
      print("x is less than y")
  elif x > y:
      print("x is greater than y")
  else:
      print("x is equal to y")
  ```
  
  注意，花括号没有了，取而代之的是缩进。其次，`if` 语句里用了冒号。再者，`elif` 取代了 `else if`。`if` 和 `elif` 语句中也不再需要圆括号。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/compare3.py?download)下载这段代码。
- 继续看比较运算，考虑下面这段 C 代码：
  
  1/agree2.c
  
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
  
  注意逻辑运算符在 C 中是怎么工作的。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/agree2.c?download)下载这段代码。
- 上面的代码可以这样实现：
  
  1/agree2.py
  
  ```
  # Logical operators
  
  from cs50 import get_string
  
  # Prompt user to agree
  s = get_string("Do you agree? ")
  
  # Check whether agreed
  if s == "Y" or s == "y":
      print("Agreed.")
  else:
      print("Not agreed.")
  ```
  
  注意，C 中用的两个竖线被换成了 `or`。确实，人们常常喜欢 Python，因为它对人来说更易读。还要注意，Python 中没有 `char`，取而代之的是 `str`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/agree2.py?download)下载这段代码。
- 同样的代码还可以用<em>列表（list）</em>这样实现：
  
  1/agree1.py
  
  ```
  # Logical operators, using lists
  
  from cs50 import get_string
  
  # Prompt user to agree
  s = get_string("Do you agree? ")
  
  # Check whether agreed
  if s in ["y", "yes"]:
      print("Agreed.")
  else:
      print("Not agreed.")
  ```
  
  注意，我们可以在一个 `list` 中表达多个关键词，比如 `y` 和 `yes`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/agree1.py?download)下载这段代码。

## 面向对象编程

- 某些类型的值不仅可以在内部拥有属性，还可以拥有函数。在 Python 中，这样的值称为<em>对象（object）</em>。
- 在 C 中，我们可以创建一个 `struct`，把多个变量关联在一个自定义的数据类型里。在 Python 中，我们不仅能做到这一点，还能在自定义的数据类型里包含函数。当一个函数属于某个特定的<em>对象</em>时，它就称为<em>方法（method）</em>。
- 例如，Python 中的 `str` 有内置的<em>方法</em>。因此，你可以把代码修改如下：
  
  1/agree2.py
  
  ```
  # Logical operators, using lists
  
  # Prompt user to agree
  s = input("Do you agree? ").lower()
  
  # Check whether agreed
  if s in ["y", "yes"]:
      print("Agreed.")
  else:
      print("Not agreed.")
  ```
  
  注意我们是如何使用 `s.lower()`，也就是 `str` 内置的 `lower` 方法，来规范化输入的。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/agree2.py?download)下载这段代码。
- 类似地，你也许还记得我们在 C 中是怎么复制字符串的：
  
  4/copy5.c
  
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
  
  注意代码的行数。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/4/copy5.c?download)下载这段代码。
- 我们可以在 Python 中这样实现上面的程序：
  
  4/copy.py
  
  ```
  # Capitalizes a copy of a string
  
  # Get a string
  s = input("s: ")
  
  # Capitalize copy of string
  t = s.capitalize()
  
  # Print strings
  print(f"s: {s}")
  print(f"t: {t}")
  ```
  
  注意这个程序比它的 C 版本短了多少。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/4/copy.py?download)下载这段代码。
- 在这门课里，我们只会触及 Python 的皮毛。因此，随着学习的深入，[Python 文档](https://docs.python.org)会变得尤其重要。
- 你可以在 [Python 文档](https://docs.python.org/3/library/stdtypes.html#string-methods)中进一步了解字符串方法。

## 循环

- Python 中的循环与 C 非常相似。你也许还记得下面这段 C 代码：
  
  ```
  // Demonstrates for loop
  
  #include <stdio.h>
  
  int main(void)
  {
      for (int i = 0; i < 3; i++)
      {
          printf("meow\n");
      }
  }
  ```
- `for` 循环在 Python 中可以这样实现：
  
  1/cat3.py
  
  ```
  # Better design
  
  for i in range(3):
      print("meow")
  ```
  
  注意，`i` 从未被显式使用，但 Python 仍会递增 `i` 的值。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/cat3.py?download)下载这段代码。
- 另外，`while` 循环可以这样实现：
  
  1/cat1.py
  
  ```
  # Demonstrates while loop
  
  i = 0
  while i < 3:
      print("meow")
      i += 1
  ```
  
  你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/cat1.py?download)下载这段代码。
- 为了进一步理解 Python 中的循环和迭代，我们新建一个叫 `uppercase.py` 的文件：
  
  2/uppercase0.py
  
  ```
  # Uppercases string one character at a time
  
  before = input("Before: ")
  print("After:  ", end="")
  for c in before:
      print(c.upper(), end="")
  print()
  ```
  
  注意这里用 `end=` 给 `print` 函数传了一个参数，让它在输出后不换行而继续留在同一行。这段代码每次处理一个字符。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/2/uppercase0.py?download)下载这段代码。
- 阅读文档后，我们发现 Python 有可以作用于整个字符串的方法，如下：
  
  2/uppercase1.py
  
  ```
  # Uppercases string all at once
  
  before = input("Before: ")
  after = before.upper()
  print(f"After:  {after}")
  ```
  
  注意 `.upper` 是应用于整个字符串的。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/2/uppercase1.py?download)下载这段代码。

## 抽象

- 正如我们今天早些时候所暗示的，你可以使用函数，把各种代码抽象成函数，来进一步改进代码。把你之前创建的 `meow.py` 修改如下：
  
  1/cat4.py
  
  ```
  # Abstraction
  
  def main():
      for i in range(3):
          meow()
  
  # Meow once
  def meow():
      print("meow")
  
  
  main()
  ```
  
  注意，`meow` 函数把 `print` 语句抽象了出去。另外，`main` 函数出现在文件的顶部，而在文件的底部调用了 `main` 函数。按照惯例，在 Python 中也应该创建一个 `main` 函数。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/cat4.py?download)下载这段代码。
- 当然，我们也可以在函数之间传递变量：
  
  1/cat5.py
  
  ```
  # Abstraction with parameterization
  
  def main():
      meow(3)
  
  
  # Meow some number of times
  def meow(n):
      for i in range(n):
          print("meow")
  
  
  main()
  ```
  
  注意，`meow` 现在接收一个变量 `n`。在 `main` 函数中，你可以调用 `meow` 并给它传一个值，比如 `3`。然后，`meow` 在 `for` 循环中使用 `n` 的值。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/cat5.py?download)下载这段代码。
- 读着上面的代码，你会发现，作为一名 C 程序员，你能相当轻松地看懂。虽然有些惯例不同，但你之前学过的构件在这门新的编程语言里依然清晰可见。

## 截断与浮点数不精确

- 回想一下，在 C 中我们遇到过截断：一个整数除以另一个整数，可能得到不精确的结果。
- 你可以通过修改 `calculator.py` 的代码，看看 Python 是如何处理这种除法的：
  
  1/calculator2.py
  
  ```
  # Division with integers, demonstration lack of truncation
  
  # Prompt user for x
  x = int(input("x: "))
  
  # Prompt user for y
  y = int(input("y: "))
  
  # Divide x by y
  z = x / y
  print(z)
  ```
  
  注意，执行这段代码会得到一个值，但如果你查看 `.333333` 之后更多的位数，就会发现我们面临着<em>浮点数不精确（floating-point imprecision）</em>。截断并没有发生。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/calculator2.py?download)下载这段代码。
- 稍微修改一下代码，就能把这种不精确显示出来：
  
  1/calculator3.py
  
  ```
  # Floating-point imprecision
  
  # Prompt user for x
  x = int(input("x: "))
  
  # Prompt user for y
  y = int(input("y: "))
  
  # Divide x by y
  z = x / y
  print(f"{z:.50f}")
  ```
  
  注意，这段代码揭示出了不精确性。Python 和 C 一样，仍然面临这个问题。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/calculator3.py?download)下载这段代码。

## 异常

- 让我们进一步探究运行 Python 代码时可能出现的异常（exception）。
- 修改 `integer.py` 如下：
  
  6/integer/integer1.py
  
  ```
  # Doesn't handle exception
  
  # Prompt user for an integer
  n = int(input("Input: "))
  print("Integer")
  ```
  
  注意，输入错误的数据可能导致错误。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/6/integer/integer1.py?download)下载这段代码。
- 我们可以通过修改代码，用 `try` 来尝试处理并<em>捕获（catch）</em>潜在的异常：
  
  6/integer/integer2.py
  
  ```
  # Handles exception
  
  # Prompt user for an integer
  try:
      n = int(input("Input: "))
      print("Integer.")
  except ValueError:
      print("Not integer.")
  ```
  
  注意，上面的代码会反复尝试获取正确类型的数据，需要时会提供额外的提示。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/6/integer/integer2.py?download)下载这段代码。

## Mario

- 回想几周前我们的挑战：像马力欧那样把三个方块垒在一起。
  
  ![three vertical blocks](https://cs50.harvard.edu/x/notes/6/cs50Week6Slide073.png)
- 在 Python 中，我们可以这样实现类似的效果：
  
  1/mario0.py
  
  ```
  # Prints a column of 3 bricks with a loop
  
  for i in range(3):
      print("#")
  ```
  
  这会打印出一列三块砖。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/mario0.py?download)下载这段代码。
- 在 C 中，我们可以使用 `do-while` 循环。但在 Python 中，由于没有 `do-while` 循环，习惯上使用 `while` 循环。你可以在一个叫 `mario.py` 的文件中编写如下代码：
  
  1/mario1.py
  
  ```
  # Prints a column of n bricks with a loop
  
  from cs50 import get_int
  
  while True:
      n = get_int("Height: ")
      if n > 0:
          break
  
  for i in range(n):
      print("#")
  ```
  
  注意，这里用 while 循环来获取高度。一旦输入了大于零的高度，循环就会中断。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/mario1.py?download)下载这段代码。
- 看下面这张图：
  
  ![four horizontal question blocks](https://cs50.harvard.edu/x/notes/6/cs50Week6Slide075.png)
- 在 Python 中，我们可以把代码修改如下来实现：
  
  1/mario2.py
  
  ```
  # Prints a row of 4 question marks with a loop
  
  for i in range(4):
      print("?", end="")
  print()
  ```
  
  注意，你可以改变 `print` 函数的行为，让它继续停留在上一次打印的同一行。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/mario2.py?download)下载这段代码。
- 和之前的几次迭代类似，我们可以进一步简化这个程序：
  
  1/mario3.py
  
  ```
  # Prints a row of 4 question marks without a loop
  
  print("?" * 4)
  ```
  
  注意，我们可以用 `*` 把要打印的内容重复 `4` 次。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/mario3.py?download)下载这段代码。
- 那一大块砖呢？
  
  ![three by three block of mario blocks](https://cs50.harvard.edu/x/notes/6/cs50Week6Slide078.png)
- 要实现上面的效果，你可以把代码修改如下：
  
  1/mario4.py
  
  ```
  # Prints a 3-by-3 grid of bricks with loops
  
  for i in range(3):
      for j in range(3):
          print("#", end="")
      print()
  ```
  
  注意，一个 `for` 循环嵌套在另一个里面。`print` 语句在每一行砖的末尾添加一个换行。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/1/mario4.py?download)下载这段代码。
- 你可以在 [Python 文档](https://docs.python.org/3/library/functions.html#print)中进一步了解 `print` 函数。

## 列表

- `list` 是 Python 中的一种数据结构。
- `list` 内部有内置的方法或函数。
- 例如，看下面这段代码：
  
  2/scores0.py
  
  ```
  # Averages three numbers using a list
  
  # Scores
  scores = [72, 73, 33]
  
  # Print average
  average = sum(scores) / len(scores)
  print(f"Average: {average}")
  ```
  
  注意，你可以使用内置的 `sum` 方法来计算平均值。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/2/scores0.py?download)下载这段代码。
- 你甚至可以用下面的语法从用户那里获取值：
  
  2/scores1.py
  
  ```
  # Averages three numbers using a list and a loop
  
  from cs50 import get_int
  
  # Get scores
  scores = []
  for i in range(3):
      score = get_int("Score: ")
      scores.append(score)
  
  # Print average
  average = sum(scores) / len(scores)
  print(f"Average: {average}")
  ```
  
  注意，这段代码使用了列表内置的 `append` 方法。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/2/scores1.py?download)下载这段代码。
- 你可以在 [Python 文档](https://docs.python.org/3/library/stdtypes.html#sequence-types-list-tuple-range)中进一步了解列表。
- 你也可以在 [Python 文档](https://docs.python.org/3/library/functions.html#len)中进一步了解 `len`。

## 搜索与字典

- 我们也可以在数据结构中进行搜索。
- 看一个叫 `phonebook.py` 的程序：
  
  3/phonebook0.py
  
  ```
  # Implements linear search for names using loop
  
  # A list of names
  names = ["Kelly", "David", "John"]
  
  # Ask for name
  name = input("Name: ")
  
  # Search for name
  for n in names:
      if name == n:
          print("Found")
          break
  else:
      print("Not found")
  ```
  
  注意，这里对每个名字都用了线性搜索。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/3/phonebook0.py?download)下载这段代码。
- 不过，我们不必遍历整个列表。在 Python 中，可以这样执行线性搜索：
  
  3/phonebook1.py
  
  ```
  # Implements linear search for names using `in`
  
  # A list of names
  names = ["Kelly", "David", "John"]
  
  # Ask for name
  name = input("Name: ")
  
  # Search for name
  if name in names:
      print("Found")
  else:
      print("Not found")
  ```
  
  注意，这里用 `in` 来实现线性搜索。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/3/phonebook1.py?download)下载这段代码。
- 这段代码仍然可以改进。
- 回想一下，<em>字典（dictionary）</em>，即 `dict`，是由<em>键（key）</em>和<em>值（value）</em>组成的键值对集合。
- 你可以在 Python 中这样实现字典：
  
  3/phonebook2.py
  
  ```
  # Implements a phone book as a list of dictionaries, without a variable
  
  from cs50 import get_string
  
  people = [
      {"name": "Kelly", "number": "+1-617-495-1000"},
      {"name": "David", "number": "+1-617-495-1000"},
      {"name": "John", "number": "+1-949-468-2750"},
  ]
  
  # Search for name
  name = get_string("Name: ")
  for person in people:
      if person["name"] == name:
          print(f"Found {person['number']}")
          break
  else:
      print("Not found")
  ```
  
  注意，这个字典的每个条目都同时包含 `name` 和 `number`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/3/phonebook2.py?download)下载这段代码。
- 更好的是，严格来说，我们并不需要同时有 `name` 和 `number`。我们可以把这段代码简化如下：
  
  3/phonebook4.py
  
  ```
  # Implements a phone book using a dictionary
  
  from cs50 import get_string
  
  people = {
      "Kelly": "+1-617-495-1000",
      "David": "+1-617-495-1000",
      "John": "+1-949-468-2750",
  }
  
  # Search for name
  name = get_string("Name: ")
  if name in people:
      print(f"Number: {people[name]}")
  else:
      print("Not found")
  ```
  
  注意，这个字典是用花括号实现的。然后，语句 `if name in people` 会查找 `name` 是否在 `people` 字典中。另外请注意，在 `print` 语句中，我们可以用 `name` 的值对 people 字典进行索引。非常有用！你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/3/phonebook4.py?download)下载这段代码。
- 类似地，也可以实现一个由字典组成的列表：
  
  3/phonebook3.py
  
  ```
  # Implements a phone book as a list of dictionaries
  
  people = [
      {"name": "Kelly", "number": "+1-617-495-1000"},
      {"name": "David", "number": "+1-617-495-1000"},
      {"name": "John", "number": "+1-949-468-2750"},
  ]
  
  # Search for name
  name = input("Name: ")
  for person in people:
      if person["name"] == name:
          number = person["number"]
          print(f"Found {number}")
          break
  else:
      print("Not found")
  ```
  
  注意，`people` 被实现为由字典组成的列表，各字典之间用逗号分隔。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/3/phonebook3.py?download)下载这段代码。
- Python 已经尽力通过其内置的搜索做到<em>常数时间（constant time）</em>。
- 你可以在 [Python 文档](https://docs.python.org/3/library/stdtypes.html#dict)中进一步了解字典。

## 命令行参数

- 和 C 一样，你也可以使用命令行参数。看下面的代码：
  
  2/greet.py
  
  ```
  # Prints a command-line argument
  
  from sys import argv
  
  if len(argv) == 2:
      print(f"hello, {argv[1]}")
  else:
      print("hello, world")
  ```
  
  注意，`argv[1]` 是通过<em>格式化字符串（formatted string）</em>打印的，也就是 `print` 语句中出现的那个 `f`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/2/greet.py?download)下载这段代码。
- 你可以在 [Python 文档](https://docs.python.org/3/library/sys.html)中进一步了解 `sys` 库。

## 退出状态

- `sys` 库也有内置的方法。我们可以用 `sys.exit(i)` 以特定的退出码退出程序：
  
  2/exit.py
  
  ```
  # Exits with explicit value, importing sys
  
  import sys
  
  if len(sys.argv) != 2:
      print("Missing command-line argument")
      sys.exit(1)
  
  print(f"hello, {sys.argv[1]}")
  sys.exit(0)
  ```
  
  注意，这里用点号表示法来使用 `sys` 的内置函数。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/2/exit.py?download)下载这段代码。

## CSV 文件

- Python 也内置了对 CSV 文件的支持。
- 把你的 `phonebook.py` 代码修改如下：
  
  4/phonebook0.py
  
  ```
  import csv
  
  file = open("phonebook.csv", "a")
  
  name = input("Name: ")
  number = input("Number: ")
  
  writer = csv.writer(file)
  writer.writerow([name,number])
  
  file.close()
  ```
  
  注意，`writerow` 会替我们在 CSV 文件中加上逗号。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/4/phonebook0.py?download)下载这段代码。
- 虽然 `file.close` 和 `file = open` 是 Python 中常用且可用的写法，但这段代码可以改进如下：
  
  4/phonebook1.py
  
  ```
  # Uses `with`
  
  import csv
  
  # Get name and number
  name = input("Name: ")
  number = input("Number: ")
  
  # Open CSV file
  with open("phonebook.csv", "a") as file:
  
      # Print to file
      writer = csv.writer(file)
      writer.writerow([name, number])
  ```
  
  注意，代码缩进在 `with` 语句之下。这样在结束时会自动关闭文件。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/4/phonebook1.py?download)下载这段代码。
- 类似地，我们可以这样把字典写入 CSV 文件：
  
  4/phonebook2.py
  
  ```
  import csv
  
  name = input("Name: ")
  number = input("Number: ")
  
  with open("phonebook.csv", "a") as file:
  
      writer = csv.DictWriter(file, fieldnames=["name", "number"])
      writer.writerow({"name": name, "number": number})
  ```
  
  注意，这段代码与我们前一个版本非常相似，只是换成了 `csv.DictWriter`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/6/src6/4/phonebook2.py?download)下载这段代码。

## 第三方库

- Python 的优势之一是它庞大的用户群，以及同样数量庞大的第三方库。
- 只要你已安装 [Python](https://python.org)，就可以在自己的电脑上输入 `pip install cs50` 来安装 CS50 库。
- 说到其他库，David 演示了 `cowsay` 和 `qrcode` 的使用。

## 小结

在这一讲中，你学习了前几讲的编程基本构件如何在 Python 中实现。此外，你还了解到 Python 如何让代码更简洁，也学会了如何使用各种 Python 库。最后，你明白了自己作为程序员的技能并不局限于某一门编程语言。你已经看到，通过这门课程，你正在发现一种新的学习方式，它可以帮助你学会任何一门编程语言，甚至，也许几乎任何一个领域的学习！具体来说，我们讨论了……

- Python
- 变量
- 条件语句
- 循环
- 类型
- 面向对象编程
- 截断与浮点数不精确
- 异常
- 字典
- 命令行参数
- 第三方库

下次再见！
