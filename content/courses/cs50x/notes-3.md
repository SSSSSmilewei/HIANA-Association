# 第 3 讲

## 欢迎！

- 在第 0 周，我们介绍了<em>算法（algorithm）</em>的概念：一个黑盒子，可以接收输入并产生输出。
- 这一周，我们将通过伪代码，进一步深入理解算法，并走向真正的代码。
- 同时，我们还要考虑这些算法的效率。事实上，我们会在上周讨论过的一些概念的基础上，继续学习如何构建算法。
- 请看下面的图：
  
  
  <div class="figure"><svg style="display:block" viewbox="0 0 960 540" width="100%" xmlns="http://www.w3.org/2000/svg"><rect fill="#000" height="540" width="960"></rect><line stroke="#777" stroke-width="2" x1="80" x2="80" y1="60" y2="480"></line><line stroke="#777" stroke-width="2" x1="80" x2="900" y1="480" y2="480"></line><text fill="#fff" font-family="system-ui,-apple-system,Segoe UI,Roboto" font-size="22" text-anchor="middle" x="490" y="515">问题规模</text><text dominant-baseline="middle" fill="#fff" font-family="system-ui,-apple-system,Segoe UI,Roboto" font-size="22" text-anchor="middle" transform="rotate(-90 40 270)" x="40" y="270">求解时间</text><line stroke="#e10600" stroke-linecap="round" stroke-width="6" x1="80" x2="240" y1="480" y2="90"></line><text fill="#fff" font-family="system-ui,-apple-system,Segoe UI,Roboto" font-size="26" x="250" y="90">n</text><line stroke="#ffe66d" stroke-linecap="round" stroke-width="6" x1="80" x2="340" y1="480" y2="120"></line><text fill="#fff" font-family="system-ui,-apple-system,Segoe UI,Roboto" font-size="26" x="350" y="120">n/2</text><path d="M80,480 C120,380 260,340 520,320 C700,306 820,302 900,300" fill="none" stroke="#39d353" stroke-linecap="round" stroke-width="6"></path><text fill="#fff" font-family="system-ui,-apple-system,Segoe UI,Roboto" font-size="28" text-anchor="end" x="892" y="335">log₂ n</text></svg></div>
- 算法可能很慢，时间和处理成本很高；也可能很快，时间和处理成本很低。
- 进入这一周时，你要想到：算法处理问题的方式，可能决定了解决问题所需的时间！算法可以被设计得越来越高效，直到某个极限。
- 今天，我们将重点关注算法的设计，以及如何衡量它们的效率。

## 线性搜索

- 回想一下，上周你学到了<em>数组（array）</em>的概念，也就是一块块连续的内存：彼此紧挨着。
- 你可以把数组比喻成一排七个红色的储物柜，如下所示：
  
  Seven red lockers side by side
  
  |  |  |  |  |  |  |  |
  |---|---|---|---|---|---|---|
  | [0] | [1] | [2] | [3] | [4] | [5] | [6] |
- 最左边的位置叫做<em>位置 0</em>，或者<em>数组的开头</em>。最右边的位置是<em>位置 6</em>，或者<em>数组的末尾</em>。
- 我们可以设想一个基本的问题：想知道“数字 `50` 在不在这个数组里？”计算机必须查看每一个储物柜，才能知道 `50` 是否在里面。我们把查找这样一个数字、字符、字符串或其他项目的过程称为<em>搜索（searching）</em>。
- 我们可以把数组交给一个算法，由算法在我们的储物柜中搜索，看 `50` 是否在某扇门后面，并返回 `true` 或 `false`。
- 我们可以设想，为了完成这个任务，可以给算法提供如下各种指令：
  
  ```
  For each door from left to right
      If 50 is behind door
          Return true
  Return false
  ```
  
  注意，上面这些指令叫做<em>伪代码（pseudocode）</em>：一种人类可读的、可以交给计算机的指令版本。
- 计算机科学家可能会把这段伪代码翻译成这样：
  
  ```
  For i from 0 to n-1
      If 50 is behind doors[i]
          Return true
  Return false
  ```
  
  注意，上面仍然不是代码，但已经相当接近最终代码的样子了。

## 二分搜索

- <em>二分搜索（binary search）</em>是另一种可以用来寻找 `50` 的<em>搜索算法</em>。
- 假设储物柜中的值已经按从小到大的顺序排列好，二分搜索的伪代码如下：
  
  ```
  If no doors left
      Return false
  If 50 is behind middle door
      Return true
  Else if 50 < middle door
      Search left half
  Else if 50 > middle door
      Search right half
  ```
- 用代码的写法，我们可以把算法进一步改成这样：
  
  ```
  If no doors left
      Return false
  If 50 is behind doors[middle]
      Return true
  Else if 50 < doors[middle]
      Search doors[0] through doors[middle - 1]
  Else if 50 > doors[middle]
      Search doors[middle + 1] through doors[n - 1]
  ```
  
  注意，看着这段近似代码，你几乎可以想象出真正的代码会是什么样子。

## 运行时间

- 你可以考虑一个算法解决问题需要多少时间。
- <em>运行时间（running time）</em>涉及使用<em>大 O（big O）</em>记号进行分析。请看下面的图：
  
  
  <div class="figure"><svg style="display:block" viewbox="0 0 960 540" width="100%" xmlns="http://www.w3.org/2000/svg"><rect fill="#000" height="540" width="960"></rect><line stroke="#777" stroke-width="2" x1="80" x2="80" y1="60" y2="480"></line><line stroke="#777" stroke-width="2" x1="80" x2="900" y1="480" y2="480"></line><text fill="#fff" font-family="system-ui,-apple-system,Segoe UI,Roboto" font-size="22" text-anchor="middle" x="490" y="515">问题规模</text><text dominant-baseline="middle" fill="#fff" font-family="system-ui,-apple-system,Segoe UI,Roboto" font-size="22" text-anchor="middle" transform="rotate(-90 40 270)" x="40" y="270">求解时间</text><line stroke="#e10600" stroke-linecap="round" stroke-width="6" x1="80" x2="240" y1="480" y2="90"></line><text fill="#fff" font-family="system-ui,-apple-system,Segoe UI,Roboto" font-size="26" x="250" y="90">O(n)</text><line stroke="#ffe66d" stroke-linecap="round" stroke-width="6" x1="80" x2="340" y1="480" y2="120"></line><text fill="#fff" font-family="system-ui,-apple-system,Segoe UI,Roboto" font-size="26" x="350" y="120">O(n/2)</text><path d="M80,480 C120,380 260,340 520,320 C700,306 820,302 900,300" fill="none" stroke="#39d353" stroke-linecap="round" stroke-width="6"></path><text fill="#fff" font-family="system-ui,-apple-system,Segoe UI,Roboto" font-size="28" text-anchor="end" x="892" y="335">O(log₂ n)</text></svg></div>
- 计算机科学家并不去精确计算算法在数学上的效率，而是用各种运行时间的<em>量级（order of）</em>来讨论效率。
- 在上图中，第一个算法是 \(O(n)\)，即<em>n 的量级</em>。第二个也是 \(O(n)\)，因为在大 O 记号中常数会被忽略。第三个是 \(O(\log n)\)。
- 曲线的形状体现了算法的效率。我们可能会看到的一些常见运行时间有：
  
  - \(O(n^2)\)
  - \(O(n \log n)\)
  - \(O(n)\)
  - \(O(\log n)\)
  - \(O(1)\)
- 在上面这些运行时间中，\(O(n^2)\) 被认为是最慢的，\(O(1)\) 是最快的。
- 线性搜索的量级是 \(O(n)\)，因为在最坏情况下它可能需要 <em>n</em> 步才能运行完。
- 二分搜索的量级是 \(O(\log n)\)，因为即使在最坏情况下，它需要的步骤也会越来越少。
- 程序员既关心最坏情况，即<em>上界（upper bound）</em>，也关心最好情况，即<em>下界（lower bound）</em>。
- 符号 \(\Omega\) 用来表示算法的最好情况，例如 \(\Omega(\log n)\)。
- 符号 \(\Theta\) 用来表示上界和下界相同的情形：也就是最好情况和最坏情况的运行时间相同。
- <em>渐近记号（asymptotic notation）</em>用来衡量随着输入越来越大，算法的表现如何。
- 随着你在计算机科学上的知识不断积累，你会在以后的课程中更深入地探讨这些主题。

## search.c

- 你可以在终端窗口中输入 `code search.c`，并编写如下代码来实现线性搜索：
  
  ```
  // Implements linear search for integers
  
  #include <cs50.h>
  #include <stdio.h>
  
  int main(void)
  {
      // An array of integers
      int numbers[] = {20, 500, 10, 5, 100, 1, 50};
  
      // Search for number
      int n = get_int("Number: ");
      for (int i = 0; i < 7; i++)
      {
          if (numbers[i] == n)
          {
              printf("Found\n");
              return 0;
          }
      }
      printf("Not found\n");
      return 1;
  }
  ```
  
  注意，以 `int numbers[]` 开头的那一行允许我们在创建数组的同时定义每个元素的值。然后，在 `for` 循环中，就是线性搜索的实现。`return 0` 用来表示成功并退出程序，`return 1` 用来表示出错（失败）并退出程序。
- 我们现在已经用 C 自己实现了线性搜索！
- 如果想在数组中搜索字符串呢？按如下方式修改代码：
  
  ```
  // Implements linear search for strings
  
  #include <cs50.h>
  #include <stdio.h>
  #include <string.h>
  
  int main(void)
  {
      // An array of strings
      string strings[] = {"battleship", "boot", "cannon", "iron", "thimble", "top hat"};
  
      // Search for string
      string s = get_string("String: ");
      for (int i = 0; i < 6; i++)
      {
          if (strcmp(strings[i], s) == 0)
          {
              printf("Found\n");
              return 0;
          }
      }
      printf("Not found\n");
      return 1;
  }
  ```
  
  注意，我们不能像之前那个版本的程序那样使用 `==`。取而代之的是 `strcmp`，它来自 `string.h` 库。如果两个字符串相同，`strcmp` 会返回 `0`。另外还要注意，数组长度 `6` 是硬编码的，这不是良好的编程习惯。
- 运行这段代码，确实可以遍历这个字符串数组，看某个字符串是否在其中。不过，如果你看到了<em>段错误（segmentation fault）</em>，也就是你的程序碰了它不该访问的那部分内存，请确认你写的是上面的 `i < 6`，而不是 `i < 7`。
- 你可以在 [CS50 手册页](https://manual.cs50.io/3/strcmp)了解更多关于 `strcmp` 的内容。

## phonebook.c

- 我们可以把数字和字符串这两种想法结合到同一个程序里。在终端窗口中输入 `code phonebook.c`，并编写如下代码：
  
  ```
  // Implements a phone book without structs
  
  #include <cs50.h>
  #include <stdio.h>
  #include <string.h>
  
  int main(void)
  {
      // Arrays of strings
      string names[] = {"Kelly", "David", "John"};
      string numbers[] = {"+1-617-495-1000", "+1-617-495-1000", "+1-949-468-2750"};
  
      // Search for name
      string name = get_string("Name: ");
      for (int i = 0; i < 3; i++)
      {
          if (strcmp(names[i], name) == 0)
          {
              printf("Found %s\n", numbers[i]);
              return 0;
          }
      }
      printf("Not found\n");
      return 1;
  }
  ```
  
  注意，Kelly 的号码以 `+1-617` 开头，David 的电话号码以 `+1-617` 开头，John 的号码以 `+1-949` 开头。因此，`names[0]` 是 Kelly，`numbers[0]` 就是 Kelly 的号码。这段代码让我们可以在电话簿中搜索某个人的具体号码。
- 虽然这段代码能用，但存在不少低效之处。事实上，姓名和电话号码有可能对不上。要是能创建我们自己的数据类型，把一个人和他的电话号码关联起来，岂不是很好？

## 结构体

- 事实上，C 允许我们通过 `struct` 创建自己的数据类型。
- 如果能创建一个叫做 `person` 的数据类型，里面包含 `name` 和 `number`，不是很有用吗？请看：
  
  ```
  typedef struct
  {
      string name;
      string number;
  } person;
  ```
  
  注意，这就表示了我们自己的数据类型 `person`，它有一个叫 `name` 的字符串和另一个叫 `number` 的字符串。
- 我们可以按如下方式修改电话簿程序，改进之前的代码：
  
  ```
  // Implements a phone book with structs
  
  #include <cs50.h>
  #include <stdio.h>
  #include <string.h>
  
  typedef struct
  {
      string name;
      string number;
  } person;
  
  int main(void)
  {
      person people[3];
  
      people[0].name = "Kelly";
      people[0].number = "+1-617-495-1000";
  
      people[1].name = "David";
      people[1].number = "+1-617-495-1000";
  
      people[2].name = "John";
      people[2].number = "+1-949-468-2750";
  
      // Search for name
      string name = get_string("Name: ");
      for (int i = 0; i < 3; i++)
      {
          if (strcmp(people[i].name, name) == 0)
          {
              printf("Found %s\n", people[i].number);
              return 0;
          }
      }
      printf("Not found\n");
      return 1;
  }
  ```
  
  注意，代码以 `typedef struct` 开头，在这里定义了一个叫 `person` 的新数据类型。`person` 里面有一个叫 `name` 的字符串和一个叫 `number` 的 `string`。在 `main` 函数中，我们首先创建了一个名为 `people` 的数组，类型是 `person`，大小为 3。然后，我们更新 `people` 数组中三个人的姓名和电话号码。最重要的是，注意<em>点记号（dot notation）</em>，例如 `people[0].name`，让我们可以访问第 0 个位置上的 `person`，并给这个人赋一个名字。

## 排序与选择排序

- <em>排序（sorting）</em>就是把一个无序的值列表变成有序列表。
- 列表有序之后，在其中搜索对计算机来说轻松得多。回想一下，我们可以对有序列表使用二分搜索，但不能对无序列表使用。
- 事实证明，排序算法有很多种。
- <em>选择排序（selection sort）</em>就是其中一种排序算法。
- 我们可以这样表示一个数组：
  
  Seven red lockers side by side with the last labeled as n-1
  
  |  |  |  |  |  |  |  |
  |---|---|---|---|---|---|---|
  | [0] | [1] | [2] | [...] | [n-3] | [n-2] | [n-1] |
- 选择排序算法的伪代码是：
  
  ```
  For i from 0 to n–1
      Find smallest number between numbers[i] and numbers[n-1]
      Swap smallest number with numbers[i]
  ```
- 总结这些步骤：第一次遍历列表需要 `n - 1` 步，第二次需要 `n - 2` 步。依此类推，所需的步数可以表示为：
  
  ```
  (n - 1) + (n - 2) + (n - 3) + ... + 1
  ```
- 这可以化简为 n(n-1)/2，或者更简单地说，\(O(n^2)\)。在最坏情况（上界）下，选择排序的量级是 \(O(n^2)\)。在最好情况（下界）下，选择排序的量级是 \(\Omega(n^2)\)。

## 冒泡排序

- <em>冒泡排序（bubble sort）</em>是另一种排序算法，它通过反复交换元素，把较大的元素“冒泡”到末尾。
- 冒泡排序的伪代码是：
  
  ```
  Repeat n-1 times
      For i from 0 to n–2
          If numbers[i] and numbers[i+1] out of order
              Swap them
      If no swaps
          Quit
  ```
- 随着排序的推进，我们知道数组越来越多的部分已经有序，所以只需要查看那些还没排好序的相邻数对。
- 冒泡排序可以这样分析：
  
  - \((n - 1) \times (n - 1)\)
  - \(n^2 - n - n + 1\)
  - \(n^2 - 2n + 1\)
  - 或者更简单地说，\(O(n^2)\)。
- 在最坏情况（上界）下，冒泡排序的量级是 \(O(n^2)\)。在最好情况（下界）下，冒泡排序的量级是 \(\Omega(n)\)。
- 你可以通过[可视化](https://www.cs.usfca.edu/~galles/visualization/ComparisonSort.html)来比较这些算法。

## 递归

- 我们怎样才能提高排序的效率呢？
- <em>递归（recursion）</em>是编程中的一个概念，指一个函数调用它自己。我们之前已经见过了……
  
  ```
  If no doors left
      Return false
  If number behind middle door
      Return true
  Else if number < middle door
      Search left half
  Else if number > middle door
      Search right half
  ```
  
  注意，我们是在这个问题越来越小的版本上调用 `search`。
- 类似地，在第 0 周的伪代码中，你可以看到递归的用法：
  
  ```
  1  Pick up phone book
  2  Open to middle of phone book
  3  Look at page
  4  If person is on page
  5      Call person
  6  Else if person is earlier in book
  7      Open to middle of left half of book
  8      Go back to line 3
  9  Else if person is later in book
  10     Open to middle of right half of book
  11     Go back to line 3
  12 Else
  13     Quit
  ```
- 这段代码本可以被简化，以突出它的递归特性，如下所示：
  
  ```
  1  Pick up phone book
  2  Open to middle of phone book
  3  Look at page
  4  If person is on page
  5      Call person
  6  Else if person is earlier in book
  7      Search left half of book
  9  Else if person is later in book
  10     Search right half of book
  12 Else
  13     Quit
  ```
- <em>基本情况（base case）</em>指的是阻止递归无限继续下去的条件，防止出现无限循环。
- <em>递归情况（recursive case）</em>指的是递归函数中用修改过的输入调用自身的那部分，它朝着基本情况推进。
- 回想第 1 周，我们想创建这样一个金字塔结构：
  
  ```
    #
    ##
    ###
    ####
  ```
- 在终端窗口中输入 `code iteration.c`，并编写如下代码：
  
  ```
  // Draws a pyramid using iteration
  
  #include <cs50.h>
  #include <stdio.h>
  
  void draw(int n);
  
  int main(void)
  {
      // Get height of pyramid
      int height = get_int("Height: ");
  
      // Draw pyramid
      draw(height);
  }
  
  void draw(int n)
  {
      // Draw pyramid of height n
      for (int i = 0; i < n; i++)
      {
          for (int j = 0; j < i + 1; j++)
          {
              printf("#");
          }
          printf("\n");
      }
  }
  ```
  
  注意，这段代码是通过循环来构建金字塔的。
- 要用递归来实现，在终端窗口中输入 `code recursion.c`，并编写如下代码：
  
  ```
  // Draws a pyramid using recursion
  
  #include <cs50.h>
  #include <stdio.h>
  
  void draw(int n);
  
  int main(void)
  {
      // Get height of pyramid
      int height = get_int("Height: ");
  
      // Draw pyramid
      draw(height);
  }
  
  void draw(int n)
  {
      // If nothing to draw
      if (n <= 0)
      {
          return;
      }
  
      // Draw pyramid of height n - 1
      draw(n - 1);
  
      // Draw one more row of width n
      for (int i = 0; i < n; i++)
      {
          printf("#");
      }
      printf("\n");
  }
  ```
  
  注意，基本情况会确保代码不会一直运行下去。`if (n <= 0)` 这一行终止了递归，因为问题已经解决。每次 `draw` 调用自己时，传入的都是 `n-1`。到某个时刻，`n-1` 会等于 `0`，使 `draw` 函数返回，程序随之结束。

## 归并排序

- 现在我们可以利用递归，去寻找更高效的排序算法，实现所谓的<em>归并排序（merge sort）</em>，这是一种非常高效的排序算法。
- 归并排序的伪代码非常简短：
  
  ```
  If only one number
      Quit
  Else
      Sort left half of numbers
      Sort right half of numbers
      Merge sorted halves
  ```
- 看下面这个数字列表：
  
  ```
    6341
  ```
- 第一步，归并排序问：“这是一个数字吗？”答案是“不是”，所以算法继续。
  
  ```
    6341
  ```
- 第二步，归并排序会把这些数字从中间（或者尽量接近中间的位置）切开，并对左半部分的数字进行排序。
  
  ```
    63|41
  ```
- 第三步，归并排序会查看左边的这些数字，问：“这是一个数字吗？”由于答案是否定的，它会再把左边的数字从中间切开。
  
  ```
    6|3
  ```
- 第四步，归并排序再次问：“这是一个数字吗？”这一次答案是肯定的！于是它结束这个任务，回到此刻之前正在运行的上一个任务：
  
  ```
    63|41
  ```
- 第五步，归并排序会对左边的数字进行排序。
  
  ```
    36|41
  ```
- 现在，左半边已经排好序了，我们回到伪代码中上次中断的位置。右边的数字会经历与第 3 到 5 步类似的过程，结果是：
  
  ```
    36|14
  ```
- 两半现在都已排好序。最后，算法会把两边合并起来。它会查看左边的第一个数字和右边的第一个数字，把较小的放在最前面，然后是第二小的。算法会对所有数字重复这个过程，结果是：
  
  ```
    1346
  ```
- 归并排序完成，程序退出。
- 归并排序是一种非常高效的排序算法，最坏情况为 \(O(n \log n)\)。最好情况仍然是 \(\Omega(n \log n)\)，因为算法仍然必须访问列表中的每个位置。因此，归并排序也是 \(\Theta(n \log n)\)，因为最好情况和最坏情况相同。
- 课上最后分享了一个[可视化演示](https://www.youtube.com/watch?v=ZZuD6iUe3Pc)。

## 小结

在这节课中，你学习了算法思维，以及如何构建自己的数据类型。具体来说，你学到了……

- 算法。
- 大 <em>O</em> 记号。
- 二分搜索和线性搜索。
- 多种排序算法，包括冒泡排序、选择排序和归并排序。
- 递归。

下次再见！
