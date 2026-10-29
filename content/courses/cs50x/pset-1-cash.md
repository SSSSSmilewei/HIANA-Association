# Cash

http://mypieceofthe31415927.blogspot.com/2014/04/whats-wrong-with-these-us-coins.html

![US coins](https://cs50.harvard.edu/x/psets/1/cash/coins.jpg)

## 要解决的问题

假设你在一家商店工作，一位顾客给了你 1.00 美元（100 美分），买一块 0.50 美元（50 美分）的糖。你需要把他们的“找零”付给他们，也就是付完糖的价钱之后剩下的金额。找零时，你多半希望尽量减少给每位顾客的硬币数量，以免硬币用完（或惹恼顾客！）。在名为 `cash` 的文件夹中，创建名为 `cash.c` 的文件，用 C 语言实现一个程序，打印凑出给定找零金额（以美分为单位）所需的最少硬币数，如下所示：

```
Change owed: 25
1
```

不过要提示用户输入一个大于 0 的 `int`，这样程序对任何找零金额都能工作：

```
Change owed: 70
4
```

如果用户的输入不大于或等于 0（或者根本不是 `int`！），就一次又一次地重新提示，直到输入合格为止。

## 演示

## 贪心算法

幸运的是，计算机科学给了各地的收银员减少硬币数量的方法：贪心算法。

根据美国国家标准与技术研究院（NIST）的说法，贪心算法是指“在寻找答案的过程中，总是采取当下最好的（即局部的）解。对于某些优化问题，贪心算法能找到整体的（即全局的）最优解，但对于其他问题的某些实例，可能只能找到不是最优的解。”

这是什么意思呢？假设一位收银员要找给顾客一些零钱，而收银员的抽屉里有 25 美分硬币（quarter）、10 美分硬币（dime）、5 美分硬币（nickel）和 1 美分硬币（penny）。要解决的问题是：决定给顾客哪些硬币、各给多少个。可以把“贪心”的收银员想象成这样一个人：每从抽屉里拿出一枚硬币，都想尽可能多地啃掉问题的一大口。例如，如果要找给某位顾客 41 美分，那么第一口能咬下的最大一口（即当下最好的、局部的一口）是 25 美分。（这一口之所以“最好”，是因为它比任何其他硬币都能更快地让我们接近 0 美分。）注意，这么大的一口会把原来 41 美分的问题削减成 16 美分的问题，因为 41 - 25 = 16。也就是说，剩下的是一个类似但更小的问题。不用说，再来一口 25 美分就太大了（假设收银员不愿意亏钱），所以我们的贪心收银员会改咬 10 美分的一口，剩下 6 美分的问题。这时，贪心的做法是先咬一口 5 美分，再咬一口 1 美分，问题就解决了。顾客拿到一枚 25 美分、一枚 10 美分、一枚 5 美分和一枚 1 美分硬币：总共四枚硬币。

事实证明，对于美国的货币（以及欧盟的货币），这种贪心方法（即算法）不仅是局部最优的，也是全局最优的。也就是说，只要收银员每种硬币都足够，这种从大到小的方法就能得到尽可能少的硬币数。到底能少到多少？这就要你来告诉我们了！

## 建议

<details markdown="1"><summary>先写一些你确定能编译的代码</summary>

虽然这个程序什么都不会做，但至少应该能用 `make` 编译通过！

```
#include <cs50.h>
#include <stdio.h>

int main(void)
{

}
```

注意，你现在已经包含了 `cs50.h` 和 `stdio.h` 这两个“头文件”，它们能让你使用一些可能有助于解决这道题的函数。

</details>

<details markdown="1"><summary>在写更多代码之前先写一些伪代码</summary>

如果不确定怎么解决问题本身，就把它拆成你多半能先解决的小问题。例如，这道题其实只是少数几个问题：

1. 提示用户输入应找零的金额，以美分为单位。
2. 计算应该给顾客多少枚 <em>25 美分硬币</em>。从 cents 中减去这些 25 美分硬币的面值。
3. 计算应该给顾客多少枚 <em>10 美分硬币</em>。从剩余的 cents 中减去这些 10 美分硬币的面值。
4. 计算应该给顾客多少枚 <em>5 美分硬币</em>。从剩余的 cents 中减去这些 5 美分硬币的面值。
5. 计算应该给顾客多少枚 <em>1 美分硬币</em>。从剩余的 cents 中减去这些 1 美分硬币的面值。
6. 把用到的 25 美分、10 美分、5 美分和 1 美分硬币的数量相加。
7. 打印这个和。

这就是你可以用来解决这道题的贪心算法，所以我们来写一些伪代码作为注释，提醒你照此去做：

```
#include <cs50.h>
#include <stdio.h>

int main(void)
{
    // Prompt the user for change owed, in cents

    // Calculate how many quarters you should give customer
    // Subtract the value of those quarters from cents

    // Calculate how many dimes you should give customer
    // Subtract the value of those dimes from remaining cents

    // Calculate how many nickels you should give customer
    // Subtract the value of those nickels from remaining cents

    // Calculate how many pennies you should give customer
    // Subtract the value of those pennies from remaining cents

    // Sum the number of quarters, dimes, nickels, and pennies used
    // Print that sum
}
```

</details>

<details markdown="1"><summary>把伪代码转换成代码</summary>

首先，考虑如何提示用户输入他们应得的美分数。回忆一下，当你想让某件事至少做一次、并且可能一遍又一遍地做时，`do while` 循环就很有用，如下所示：

```
#include <cs50.h>
#include <stdio.h>

int main(void)
{
    // Prompt the user for change owed, in cents
    int cents;
    do
    {
        cents = get_int("Change owed: ");
    }
    while (cents < 0);
}
```

这里最好停一下，用 `make` 编译你的程序。测试一下，确保程序能编译，并且当你输入小于 0 的美分数（或输入像 “cat” 这样的内容）时它会重新提示你。

接下来，考虑如何计算应该给顾客多少枚 25 美分硬币。由于我们用的是贪心算法，这个问题就变成了“你最多能给他们多少枚 25 美分硬币？”。你<em>可以</em>直接在 `main` 函数里写出这个问题的解法。但是，写一个新函数，叫 `calculate_quarters`，可能会让你的思路更清晰。这样你就能更专注于计算 25 美分硬币数量的逻辑。之后，你再把这个函数整合进你更大的解决方案。

```
int calculate_quarters(int cents)
{
    // Calculate how many quarters you should give customer
}
```

注意，这个函数确实叫 `calculate_quarters`。根据括号里的 `int cents`，它接受一个名为 `cents` 的 `int` 作为输入。并且，根据名字前面的 `int`，它还应该“返回”一个 `int`。也就是说，这个函数的输出是一个整数：能放进 cents 的 25 美分硬币的枚数。

现在来看这种实现 `calculate_quarters` 的方式：不断增加 25 美分硬币的数量，直到没有剩余的美分可以换成 25 美分硬币为止：

```
int calculate_quarters(int cents)
{
    // Calculate how many quarters you should give customer
    int quarters = 0;
    while (cents >= 25)
    {
        quarters++;
        cents = cents - 25;
    }
    return quarters;
}
```

诚然，解决 `calculate_quarters` 这个问题至少还有一种更简单的方法。但这就留给你自己去想了！

等 `calculate_quarters` 按预期工作后，你就可以把这个函数整合进你的程序。注意要在 `main` 函数上方“声明”该函数的“签名”（即 `int calculate_quarters(int cents)`），这样你才能在 `main` 里使用 `calculate_quarters`，而把它的定义放在 `main` 下方。

```
#include <cs50.h>
#include <stdio.h>

int calculate_quarters(int cents);

int main(void)
{
    // Prompt the user for change owed, in cents
    int cents;
    do
    {
        cents = get_int("Change owed: ");
    }
    while (cents < 0);

    // Calculate how many quarters you should give customer
    int quarters = calculate_quarters(cents);

    // Subtract the value of those quarters from cents
    cents = cents - (quarters * 25);
}

int calculate_quarters(int cents)
{
    // Calculate how many quarters you should give customer
    int quarters = 0;
    while (cents >= 25)
    {
        quarters++;
        cents = cents - 25;
    }
    return quarters;
}
```

解决了几个问题，还剩几个！注意到这里有什么可以重复利用的模式了吗？

</details>

## 如何测试

对于这个程序，试着手动测试你的代码。这是个好习惯：

- 如果你输入 `-1`，你的程序会再次提示你吗？
- 如果你输入 `0`，你的程序会输出 `0` 吗？
- 如果你输入 `1`，你的程序会输出 `1`（即一枚 1 美分硬币）吗？
- 如果你输入 `4`，你的程序会输出 `4`（即四枚 1 美分硬币）吗？
- 如果你输入 `5`，你的程序会输出 `1`（即一枚 5 美分硬币）吗？
- 如果你输入 `24`，你的程序会输出 `6`（即两枚 10 美分硬币和四枚 1 美分硬币）吗？
- 如果你输入 `25`，你的程序会输出 `1`（即一枚 25 美分硬币）吗？
- 如果你输入 `26`，你的程序会输出 `2`（即一枚 25 美分硬币和一枚 1 美分硬币）吗？
- 如果你输入 `99`，你的程序会输出 `9`（即三枚 25 美分硬币、两枚 10 美分硬币和四枚 1 美分硬币）吗？

### 正确性

```
check50 cs50/problems/2026/x/cash
```

### 代码风格

```
style50 cash.c
```

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/cash
```
