# 第 5 讲

## 欢迎！

- 课程前几周向你介绍了编程的基本构件。
- 你在 C 语言中学到的一切，将使你能够在 Python 这类更高级的编程语言中实现这些构件。
- 每一周，概念都变得越来越有挑战性，就像一座坡度越来越陡的山。这一周，随着我们探索数据结构，挑战的难度将趋于平缓。
- 到目前为止，你已经了解了数组如何在内存中组织数据。
- 今天，我们将讨论如何在内存中组织数据，以及随着你的知识不断增长而出现的各种设计可能性。

## Jack 学习事实

- 我们观看了 Elon 大学 Shannon Duvall 教授制作的视频[《Jack 学习事实》（Jack Learns the Facts）](https://www.youtube.com/watch?v=ItAG3s6KIEI)。

## 数据结构

- <em>数据结构（data structure）</em>本质上就是在内存中组织数据的各种形式。
- 在内存中组织数据有许多方式。
- <em>抽象数据类型（abstract data type）</em>是我们可以在概念上想象的那些类型。学习计算机科学时，从这些概念性的数据结构入手通常很有用。学会这些之后，以后会更容易理解如何实现更具体的数据结构。

## 队列

- <em>队列（queue）</em>是抽象数据结构的一种形式。
- 队列有特定的性质。也就是说，它们是 <em>FIFO</em>，即“先进先出（first in first out）”。你可以想象自己在游乐园排队等着玩某个项目：排在队伍最前面的人最先上，排在最后的人最后上。
- 队列有与之相关的特定操作。例如，一个元素可以<em>入队（enqueue）</em>，也就是加入队伍或队列。此外，一个元素到达队首后可以<em>出队（dequeue）</em>，也就是离开队列。
- 在代码中，你可以这样想象队列：
  
  ```
  const int CAPACITY = 50;
  
  typedef struct
  {
      person people[CAPACITY];
      int size;
  }
  queue;
  ```
  
  注意，名为 `people` 的数组，其类型是 `person`。`CAPACITY` 是队列最多能有多长。整数 `size` 是队列实际有多满，不管它<em>能</em>容纳多少。

## 栈

- 与队列相对的是<em>栈（stack）</em>。从根本上说，栈的性质与队列不同。具体来说，它是 <em>LIFO</em>，即“后进先出（last in first out）”。就像食堂里叠放的托盘，最后放到叠上的托盘，最先被拿走。
- 栈有与之相关的特定操作。例如，<em>push</em>（压栈）是把某个东西放到栈顶。<em>Pop</em>（出栈）是从栈顶移除某个东西。
- 在代码中，你可以这样想象栈：
  
  ```
  const int CAPACITY = 50;
  
  typedef struct
  {
      person people[CAPACITY];
      int size;
  }
  stack;
  ```
  
  注意，名为 `people` 的数组，其类型是 `person`。`CAPACITY` 是栈最多能有多高。整数 `size` 是栈实际有多满，不管它<em>可以</em>容纳多少。注意，这段代码与队列的代码是一样的。
- 你可能会想到，上面的代码有一个局限，因为在这段代码里数组的容量总是预先确定的。因此，栈可能总是过大。你可以想象，5000 个位置里只用到了一个。
- 如果我们的栈是动态的就好了——可以随着元素的加入而增长。

## 数组

- 回到第 2 周，我们向你介绍了第一种数据结构。
- 数组是一块连续的内存。
- 你可以把数组想象成这样：
  
  ![three boxes with 1 2 3](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide019.png)
- 在终端中输入 `code list.c`，并编写如下代码：
  
  list0.c
  
  ```
  // Implements a list of numbers with an array of fixed size
  
  #include <stdio.h>
  
  int main(void)
  {
      // List of size 3
      int list[3];
  
      // Initialize list with numbers
      list[0] = 1;
      list[1] = 2;
      list[2] = 3;
  
      // Print list
      for (int i = 0; i < 3; i++)
      {
          printf("%i\n", list[i]);
      }
  }
  ```
  
  注意，上面的内容与我们在课程早些时候学到的非常相似。内存是为三个元素预先分配好的。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/5/src5/list0.c?download)下载这段代码。
- 如果我们能把 `4` 放在内存中的别处，岂不是很好？按定义，这就不再是数组了，因为 `4` 不再位于连续的内存中。我们怎样才能把内存中不同的位置连接起来呢？
- 内存里还存放着其他程序、函数和变量的值。其中许多可能是未被使用的垃圾值，它们曾经被用过，但现在可以重新使用。
  
  ![three boxes with 1 2 3 among lots of other memory elements](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide022.png)
- 假设你想在数组中存放第四个值 `4`。需要做的是：分配一块新的内存区域，并把旧数组移到新的区域中。最初，这块新内存区域里全是垃圾值。
  
  ![Three boxes with 1 2 3 above four boxes with garbage values](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide025.png)
- 随着值被加入这块新的内存区域，旧的垃圾值会被覆盖。
  
  ![Three boxes with 1 2 3 above four boxes with 1 2 3 and a garbage value](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide026.png)
- 最终，所有旧的垃圾值都会被我们的新数据覆盖。
  
  ![Three boxes with 1 2 3 above four boxes with 1 2 3 4](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide027.png)
- 这种做法的缺点之一是设计不好：每添加一个数字，我们都要把数组逐个元素地复制一遍。
- 基于我们最近学到的知识，可以利用对指针的理解，在这段代码中做出更好的设计。按如下方式修改代码：
  
  list1.c
  
  ```
  // Implements a list of numbers with an array of dynamic size
  
  #include <stdio.h>
  #include <stdlib.h>
  
  int main(void)
  {
      // List of size 3
      int *list = malloc(3 * sizeof(int));
      if (list == NULL)
      {
          return 1;
      }
  
      // Initialize list of size 3 with numbers
      list[0] = 1;
      list[1] = 2;
      list[2] = 3;
  
      // List of size 4
      int *tmp = malloc(4 * sizeof(int));
      if (tmp == NULL)
      {
          free(list);
          return 1;
      }
  
      // Copy list of size 3 into list of size 4
      for (int i = 0; i < 3; i++)
      {
          tmp[i] = list[i];
      }
  
      // Add number to list of size 4
      tmp[3] = 4;
  
      // Free list of size 3
      free(list);
  
      // Remember list of size 4
      list = tmp;
  
      // Print list
      for (int i = 0; i < 4; i++)
      {
          printf("%i\n", list[i]);
      }
  
      // Free list
      free(list);
      return 0;
  }
  ```
  
  注意，这里创建了一个能容纳三个整数的列表。然后，三个内存地址可以被赋值为 `1`、`2` 和 `3`。接着，创建一个容纳四个整数的列表。然后，把列表从第一个复制到第二个，并把 `4` 这个值加到 `tmp` 列表中。由于 `list` 所指向的那块内存不再使用，就用命令 `free(list)` 把它释放掉。最后，让 `list` 指针指向 `tmp` 所指向的那块内存。`list` 的内容被打印出来，然后被释放。另外，注意这里包含了 `stdlib.h`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/5/src5/list1.c?download)下载这段代码。
- 可以把 `list` 和 `tmp` 都想成指向某块内存的路牌。就像上面的例子，`list` 一度<em>指向</em>一个大小为 3 的数组。到最后，`list` 被告知去指向一块大小为 4 的内存。严格来说，到上面代码的末尾，`tmp` 和 `list` 都指向同一块内存。
- 不用 for 循环也能复制数组的一种方法是使用 `realloc`：
  
  list2.c
  
  ```
  // Implements a list of numbers with an array of dynamic size using realloc
  
  #include <stdio.h>
  #include <stdlib.h>
  
  int main(void)
  {
      // List of size 3
      int *list = malloc(3 * sizeof(int));
      if (list == NULL)
      {
          return 1;
      }
  
      // Initialize list of size 3 with numbers
      list[0] = 1;
      list[1] = 2;
      list[2] = 3;
  
      // Resize list to be of size 4
      int *tmp = realloc(list, 4 * sizeof(int));
      if (tmp == NULL)
      {
          free(list);
          return 1;
      }
      list = tmp;
  
      // Add number to list
      list[3] = 4;
  
      // Print list
      for (int i = 0; i < 4; i++)
      {
          printf("%i\n", list[i]);
      }
  
      // Free list
      free(list);
      return 0;
  }
  ```
  
  注意，列表通过 `realloc` 被重新分配成了一个新数组。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/5/src5/list2.c?download)下载这段代码。
- 有人可能会想为列表分配远多于所需的内存，比如不是需要 3 或 4 个元素，而是直接分配 30 个。但这是糟糕的设计，因为它会在可能并不需要的时候占用系统资源。而且，也几乎无法保证最终会需要超过 30 个元素的内存。

## 链表

- 最近几周，你学习了三个有用的基本要素。`struct` 是你可以自己定义的数据类型。<em>点记号（dot notation）</em>中的 `.` 让你可以访问该结构内部的变量。`*` 运算符用来声明指针或对变量解引用。
- 今天，我们向你介绍 `->` 运算符。它是一个箭头。这个运算符会前往一个地址，并查看结构内部。
- <em>链表（linked list）</em>是 C 语言中最强大的数据结构之一。链表允许你包含位于内存中不同区域的值。此外，它们还允许你按需动态地增长和缩减列表。
- 你可以把三个值想象成存储在内存的三个不同区域，如下所示：
  
  ![Three boxes with 1 2 3 in separate areas of memory](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide036.png)
- 怎样才能把这些值串成一个列表呢？
- 我们可以把上图中的数据想象成这样：
  
  ![Three boxes with 1 2 3 in separate areas of memory with smaller boxes attached](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide037.png)
- 我们可以多用一些内存，用指针来记录下一个元素在哪里。
  
  ![Three boxes with 1 2 3 in separate areas of memory with smaller boxes attached where memory addresses are in those attached boxes](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide041.png)
  
  注意，NULL 用来表示列表中<em>后面</em>没有别的元素了。
- 按照惯例，我们还会在内存中再保留一个元素，也就是一个指针，用来记录列表中的第一个元素，称为列表的<em>头（head）</em>。
  
  ![Three boxes with 1 2 3 in separate areas of memory with smaller boxes attached where memory addresses are in those attached boxes now with a final box with the memory address of the first box](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide042.png)
- 把内存地址抽象掉之后，列表看起来是这样的：
  
  ![Three boxes in separate areas of memory with smaller boxes with a final box where the one box points to another and another until the end of the boxes](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide043.png)
- 这些方框叫做<em>节点（node）</em>。一个<em>节点</em>既包含一个<em>元素（item）</em>，也包含一个叫 <em>next</em> 的指针。在代码中，你可以这样想象节点：
  
  ```
  typedef struct node
  {
      int number;
      struct node *next;
  }
  node;
  ```
  
  注意，这个节点中包含的元素是一个叫 `number` 的整数。其次，还包含一个指向节点的指针 `next`，它会指向内存中某处的另一个节点。
- 我们可以重写 `list.c`，让它使用链表：
  
  list3.c
  
  ```
  // Start to build a linked list by prepending nodes
  
  #include <cs50.h>
  #include <stdio.h>
  #include <stdlib.h>
  
  typedef struct node
  {
      int number;
      struct node *next;
  } node;
  
  int main(void)
  {
      // Memory for numbers
      node *list = NULL;
  
      // Build list
      for (int i = 0; i < 3; i++)
      {
          // Allocate node for number
          node *n = malloc(sizeof(node));
          if (n == NULL)
          {
              return 1;
          }
          n->number = get_int("Number: ");
          n->next = NULL;
  
          // Prepend node to list
          n->next = list;
          list = n;
      }
      return 0;
  }
  ```
  
  首先，`node` 被定义为一个 `struct`。对于列表中的每个元素，都会通过 `malloc` 分配一个节点大小的内存。`n->number`（即 `n` 的 number 字段）被赋予一个整数。`n->next`（即 `n` 的 next 字段）被赋为 `NULL`。然后，这个节点被放在列表的开头，也就是内存位置 `list`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/5/src5/list3.c?download)下载这段代码。
- 从概念上，我们可以想象创建链表的过程。首先，声明了 `node *list`，但它里面是垃圾值。
  
  ![One garbage value](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide055.png)
- 接下来，在内存中分配一个叫 `n` 的节点。
  
  ![One garbage value called n with another pointer called list](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide059.png)
- 接下来，该节点的 `number` 被赋值为 `1`。
  
  ![n pointing to a node with 1 as the number and garbage value as the next](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide064.png)
- 接下来，该节点的 `next` 字段被赋为 `NULL`。
  
  ![n pointing to a node with 1 as the number and null as the value of next](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide066.png)
- 接下来，让 `list` 指向 `n` 所指的内存位置。`n` 和 `list` 现在指向同一个地方。
  
  ![n and list both pointing to a node with 1 as the number and null as the value of next](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide068.png)
- 然后创建一个新节点。它的 `number` 和 `next` 字段里都是垃圾值。
  
  ![list pointing to a node with 1 as the number and null as the value of next and n pointing to a new node with garbage values](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide073.png)
- `n` 所指节点（也就是新节点）的 `number` 值被更新为 `2`。
  
  ![list pointing to a node with 1 as the number and null as the value of next and n pointing to a new node with 2 as the number and garbage as the next](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide075.png)
- 同样，`next` 字段也被更新。
  
  ![list pointing to a node with 1 as the number and null as the value of next and n pointing to a new node with 2 as the number and null as the next](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide077.png)
- 最重要的是，我们不希望丢失与任何一个节点的联系，否则它们会永远丢失。因此，`n` 的 `next` 字段被指向与 `list` 相同的内存位置。
  
  ![list pointing to a node with 1 as the number and null as the value of next and n pointing to a new node with 2 as the number and null as the next](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide084.png)
- 最后，`list` 被更新为指向 `n`。现在我们有了一个包含两个元素的链表。
  
  ![list pointing to a node with 2 as the number and its next field pointing to a node with 1 as the number and null as the next](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide086.png)
- 看我们画的列表示意图，可以发现最后添加的数字成了列表中第一个出现的数字。因此，如果从第一个节点开始按顺序打印列表，列表看起来会是乱序的。
- 我们可以按如下方式以正确的顺序打印列表：
  
  list4.c
  
  ```
  // Print nodes in a linked list with a while loop
  
  #include <cs50.h>
  #include <stdio.h>
  #include <stdlib.h>
  
  typedef struct node
  {
      int number;
      struct node *next;
  } node;
  
  int main(void)
  {
      // Memory for numbers
      node *list = NULL;
  
      // Build list
      for (int i = 0; i < 3; i++)
      {
          // Allocate node for number
          node *n = malloc(sizeof(node));
          if (n == NULL)
          {
              return 1;
          }
          n->number = get_int("Number: ");
          n->next = NULL;
  
          // Prepend node to list
          n->next = list;
          list = n;
      }
  
      // Print numbers
      node *ptr = list;
      while (ptr != NULL)
      {
          printf("%i\n", ptr->number);
          ptr = ptr->next;
      }
      return 0;
  }
  ```
  
  注意，`node *ptr = list` 创建了一个临时变量，它指向与 `list` 所指相同的位置。`while` 循环打印 `ptr` 所指节点的内容，然后更新 `ptr`，让它指向列表中的 `next` 节点。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/5/src5/list4.c?download)下载这段代码。
- 在这个例子中，向列表中插入元素的量级始终是 \(O(1)\)，因为在列表前端插入只需要很少的几步。
- 考虑搜索这个列表所需的时间，它的量级是 \(O(n)\)，因为在最坏情况下，必须搜遍整个列表才能找到一个元素。向列表中添加新元素的时间复杂度取决于该元素被添加到哪里。下面的例子会说明这一点。
- 链表不是存储在一块连续的内存中。只要系统资源足够，它们可以增长到你想要的任意大小。然而，缺点是比起数组，跟踪链表需要更多的内存。对每个元素，你不仅要存储元素本身的值，还要存储指向下一个节点的指针。此外，链表不能像数组那样通过下标直接访问，因为要找到第 \(n\) 个元素的位置，我们需要先经过前 \(n - 1\) 个元素。因此，上面这样的列表必须线性搜索。所以，在上面这样构建的列表中，二分搜索是不可能的。
- 此外，你还可以把数字放到列表的末尾，如下面的代码所示：
  
  list7.c
  
  ```
  // Appends numbers to a link list
  
  #include <cs50.h>
  #include <stdio.h>
  #include <stdlib.h>
  
  typedef struct node
  {
      int number;
      struct node *next;
  } node;
  
  int main(void)
  {
      // Memory for numbers
      node *list = NULL;
  
      // Build list
      for (int i = 0; i < 3; i++)
      {
          // Allocate node for number
          node *n = malloc(sizeof(node));
          if (n == NULL)
          {
              return 1;
          }
          n->number = get_int("Number: ");
          n->next = NULL;
  
          // If list is empty
          if (list == NULL)
          {
              // This node is the whole list
              list = n;
          }
  
          // If list has numbers already
          else
          {
              // Iterate over nodes in list
              for (node *ptr = list; ptr != NULL; ptr = ptr->next)
              {
                  // If at end of list
                  if (ptr->next == NULL)
                  {
                      // Append node
                      ptr->next = n;
                      break;
                  }
              }
          }
      }
  
      // Print numbers
      for (node *ptr = list; ptr != NULL; ptr = ptr->next)
      {
          printf("%i\n", ptr->number);
      }
  
      // Free memory
      node *ptr = list;
      while (ptr != NULL)
      {
          node *next = ptr->next;
          free(ptr);
          ptr = next;
      }
      return 0;
  }
  ```
  
  注意，这段代码是如何沿着列表<em>一路走下去</em>，找到末尾的。追加一个元素（添加到列表末尾）时，我们的代码运行时间是 \(O(n)\)，因为必须先走完整个列表，才能添加最后一个元素。另外，注意这里用了一个叫 `next` 的临时变量来记录 `ptr->next`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/5/src5/list7.c?download)下载这段代码。
- 此外，你还可以在添加元素的同时对列表排序：
  
  list8.c
  
  ```
  // Implements a sorted linked list of numbers
  
  #include <cs50.h>
  #include <stdio.h>
  #include <stdlib.h>
  
  typedef struct node
  {
      int number;
      struct node *next;
  } node;
  
  int main(void)
  {
      // Memory for numbers
      node *list = NULL;
  
      // Build list
      for (int i = 0; i < 3; i++)
      {
          // Allocate node for number
          node *n = malloc(sizeof(node));
          if (n == NULL)
          {
              return 1;
          }
          n->number = get_int("Number: ");
          n->next = NULL;
  
          // If list is empty
          if (list == NULL)
          {
              list = n;
          }
  
          // If number belongs at beginning of list
          else if (n->number < list->number)
          {
              n->next = list;
              list = n; 
          }
  
          // If number belongs later in list
          else
          {
              // Iterate over nodes in list
              for (node *ptr = list; ptr != NULL; ptr = ptr->next)
              {
                  // If at end of list
                  if (ptr->next == NULL)
                  {
                      // Append node
                      ptr->next = n;
                      break;
                  }
  
                  // If in middle of list
                  if (n->number < ptr->next->number)
                  {
                      n->next = ptr->next;
                      ptr->next = n;
                      break;
                  }
              }
          }
      }
  
      // Print numbers
      for (node *ptr = list; ptr != NULL; ptr = ptr->next)
      {
          printf("%i\n", ptr->number);
      }
  
      // Free memory
      node *ptr = list;
      while (ptr != NULL)
      {
          node *next = ptr->next;
          free(ptr);
          ptr = next;
      }
      return 0;
  }
  ```
  
  注意，这个列表是在构建的过程中就排好序的。要按这个特定的顺序插入一个元素，我们的代码每次插入仍然需要 \(O(n)\) 的时间，因为在最坏情况下，我们必须查看当前所有的元素。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/5/src5/list8.c?download)下载这段代码。
- 最后再润色一下，可以创建一个函数来卸载（释放）链表：
  
  list9.c
  
  ```
  // Frees memory in cases of error too
  
  #include <cs50.h>
  #include <stdio.h>
  #include <stdlib.h>
  
  typedef struct node
  {
      int number;
      struct node *next;
  } node;
  
  void unload(node *list);
  
  int main(void)
  {
      // Memory for numbers
      node *list = NULL;
  
      // Build list
      for (int i = 0; i < 3; i++)
      {
          // Allocate node for number
          node *n = malloc(sizeof(node));
          if (n == NULL)
          {
              unload(list);
              return 1;
          }
          n->number = get_int("Number: ");
          n->next = NULL;
  
          // If list is empty
          if (list == NULL)
          {
              list = n;
          }
  
          // If number belongs at beginning of list
          else if (n->number < list->number)
          {
              n->next = list;
              list = n; 
          }
  
          // If number belongs later in list
          else
          {
              // Iterate over nodes in list
              for (node *ptr = list; ptr != NULL; ptr = ptr->next)
              {
                  // If at end of list
                  if (ptr->next == NULL)
                  {
                      // Append node
                      ptr->next = n;
                      break;
                  }
  
                  // If in middle of list
                  if (n->number < ptr->next->number)
                  {
                      n->next = ptr->next;
                      ptr->next = n;
                      break;
                  }
              }
          }
      }
  
      // Print numbers
      for (node *ptr = list; ptr != NULL; ptr = ptr->next)
      {
          printf("%i\n", ptr->number);
      }
  
      // Free memory
      unload(list);
      return 0;
  }
  
  void unload(node *list)
  {
      node *ptr = list;
      while (ptr != NULL)
      {
          node *next = ptr->next;
          free(ptr);
          ptr = next;
      }
  }
  ```
  
  注意，`unload` 函数会释放整个列表。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/5/src5/list9.c?download)下载这段代码。
- 这段代码可能看起来很复杂。不过请注意，借助指针和上面的语法，我们可以把内存中不同位置的数据串联起来。

## 树

- 数组提供了可以被快速搜索的连续内存。数组还提供了进行二分搜索的机会。
- 我们能否把数组和链表二者的优点结合起来？
- <em>二叉搜索树（binary search tree）</em>是另一种数据结构，可以更高效地存储数据，使其便于搜索和检索。
- 你可以想象一个已排序的数字序列。
  
  ![1 2 3 4 5 6 7 in boxes next to each other](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide118.png)
- 然后想象中间的值成为一棵树的顶端。比这个值小的放在左边，比这个值大的放在右边。
  
  ![1 2 3 4 5 6 7 in boxes arranged in a hierarchy 4 is at the top 3 and 5 are below that and 1 2 6 7 are below those](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide119.png)
- 然后可以用指针指向每块内存区域的正确位置，从而把这些节点连接起来。
  
  ![1 2 3 4 5 6 7 in boxes arranged in a hierarchy 4 is at the top 3 and 5 are below that and 1 2 6 7 are below those arrows connect them in a tree formation](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide120.png)
- 在代码中，搜索这样一棵树可以这样实现：
  
  ```
  bool search(node *tree, int number)
  {
      if (tree == NULL)
      {
          return false;
      }
      else if (number < tree->number)
      {
          return search(tree->left, number);
      }
      else if (number > tree->number)
      {
          return search(tree->right, number);
      }
      else if (number == tree->number)
      {
          return true;
      }
  }
  ```
  
  注意，这个 search 函数是如何递归地搜索这棵树的。如果要找的数字小于当前节点的数字，就搜索左子树；如果大于，就搜索右子树。当树是平衡的时，这种递归方法可以实现高效的搜索，时间复杂度为 O(log n)。
- 树提供了数组所不具备的动态性。它可以按我们的需要增长和缩减。
- 此外，当树是平衡的时，这种结构的搜索时间为 \(O(log n)\)。

## 哈希与哈希表

* <em>字典（dictionary）</em>是另一种数据结构。 * 字典就像真实的纸质字典那样，有一个单词和一个释义，也就是有一个<em>键（key）</em>和一个<em>值（value）</em>。 * 字典可以通过哈希（hashing）提供这样的访问速度。

- 算法时间复杂度的<em>圣杯（holy grail）</em>是 \(O(1)\)，即<em>常数时间（constant time）</em>。也就是说，终极目标是让访问瞬间完成。
  
  ![a graph of various time complexities where O of log n is second best and O of 1 is best](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide151.png)
- <em>哈希（hashing）</em>是这样一种想法：取一个值，并能输出另一个值，这个输出的值日后成为找到它的捷径。
- 例如，对 <em>apple</em> 做哈希，得到的值可能是 `1`，而 <em>berry</em> 被哈希后可能是 `2`。于是，要找到 <em>apple</em>，只需问<em>哈希</em>算法 <em>apple</em> 存放在哪里就行了。虽然从设计上看并不理想（本质上是把所有以 <em>a</em> 开头的放进一个桶，所有以 <em>b</em> 开头的放进另一个桶），但这种把哈希值<em>分桶（bucketizing）</em>的概念说明了这个思想的用法：哈希值可以作为找到某个值的捷径。
- <em>哈希函数（hash function）</em>是一种把较大的值缩减为某种小而可预测的值的算法。通常，这个函数接收你想添加到哈希表中的元素，并返回一个整数，表示该元素应当放入的数组下标。
- <em>哈希表（hash table）</em>是数组与链表的绝妙结合。用代码实现时，哈希表是一个由指向<em>节点</em>的<em>指针</em>组成的<em>数组</em>。
- 哈希表可以想象成这样：
  
  ![a vertical column of 26 boxes one for each letter of the alphabet](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide157.png)
  
  注意，这是一个数组，字母表中的每个字母对应其中的一个位置。
- 然后，在数组的每个位置上，用一个链表来记录存放在那里的每个值：
  
  ![a vertical column of 26 boxes one for each letter of the alphabet with various names from the mario universe emerging to the right luigi is with l and mario is with m](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide169.png)
- <em>冲突（collision）</em>是指你向哈希表中添加值时，哈希得到的位置上已经有东西了。在上面的例子中，冲突的值只是被追加到链表的末尾。
- 通过更好地设计哈希表和哈希算法，可以减少冲突。你可以想象对上面的做法做如下改进：
  
  ![a vertical column of various boxes arranged by L A K and L I N with Lakitu emerging from L A K and link emerging from L I N](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide184.png)
- 看下面这个哈希算法的例子：
  
  ![luigi being given to a hash algorithm outputting 11](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide173.png)
- 这可以用代码实现如下：
  
  ```
  #include <ctype.h>
  
  unsigned int hash(const char *word)
  {
      return toupper(word[0]) - 'A';
  }
  ```
  
  注意，这个哈希函数返回的是 `toupper(word[0]) - 'A'` 的值。
- 作为程序员，你必须做出权衡：是多用内存、使用一个大的哈希表，从而可能缩短搜索时间；还是少用内存，从而可能增加搜索时间。
- 这种结构的搜索时间为 \(O(n)\)。

## 字典树

- <em>字典树（trie）</em>是另一种数据结构。字典树是由数组构成的树。
- <em>字典树</em>总是可以在常数时间内搜索。
- 字典树的一个缺点是它们往往会占用大量内存。注意，光是存储 <em>Toad</em> 就需要 \(26 \times 4 = 104\) 个节点！
- <em>Toad</em> 会这样存储：
  
  ![toad being spelled with one letter at a time where one letter is associated with one list T from one list O from another and so on ](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide207.png)
- 然后 <em>Tom</em> 会这样存储：
  
  ![toad being spelled with one letter at a time where one letter is associated with one list T from one list O from another and so on and tom being spelled similarly where toad and tom share two common letters T and O](https://cs50.harvard.edu/x/notes/5/cs50Week5Slide209.png)
- 这种结构的搜索时间为 \(O(1)\)。
- 这种结构的缺点是使用它需要消耗大量资源。

## 小结

在这节课中，你学习了如何使用指针构建新的数据结构。具体来说，我们深入探讨了……

- 数据结构
- 栈与队列
- 链表
- 哈希与哈希表
- 字典树

下次再见！
