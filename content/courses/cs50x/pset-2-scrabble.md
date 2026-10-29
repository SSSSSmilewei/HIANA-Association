# Scrabble

![Scrabble Board](https://cs50.harvard.edu/x/psets/2/scrabble/scrabble.png)

## 要解决的问题

在 [Scrabble](https://en.wikipedia.org/wiki/Scrabble) 游戏中，玩家拼出单词来得分，得分是单词中每个字母分值之和。

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T | U | V | W | X | Y | Z |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 3 | 3 | 2 | 1 | 4 | 2 | 4 | 1 | 8 | 5 | 1 | 3 | 1 | 1 | 3 | 10 | 1 | 1 | 1 | 1 | 4 | 4 | 8 | 4 | 10 |

例如，如果我们要给单词 “CODE” 计分，会注意到 ‘C’ 值 3 分，‘O’ 值 1 分，‘D’ 值 2 分，‘E’ 值 1 分。把它们加起来，就得到 “CODE” 值 7 分。

在名为 `scrabble` 的文件夹中，创建名为 `scrabble.c` 的文件，用 C 语言实现一个程序，判定一个类似 Scrabble 的小游戏的赢家。你的程序应该提示输入两次：一次让“Player 1”输入他们的单词，一次让“Player 2”输入他们的单词。然后，根据哪位玩家得分最高，你的程序应该打印 “Player 1 wins!”、“Player 2 wins!” 或 “Tie!”（两位玩家得分相等时）。

## 演示

## 建议与提示

<details markdown="1"><summary>先写一些你确定能编译的代码</summary>

```
#include <ctype.h>
#include <cs50.h>
#include <stdio.h>
#include <string.h>

int main(void)
{

}
```

注意，你现在已经包含了几个头文件，它们能让你使用一些可能有助于解决这道题的函数。

</details>

<details markdown="1"><summary>在写更多代码之前先写一些伪代码</summary>

如果不确定怎么解决问题本身，就把它拆成你多半能先解决的小问题。例如，这道题其实只是少数几个问题：

1. 提示用户输入两个单词
2. 计算每个单词的得分
3. 打印赢家

我们来写一些伪代码作为注释，提醒你照此去做：

```
#include <ctype.h>
#include <cs50.h>
#include <stdio.h>
#include <string.h>

int main(void)
{
    // Prompt the user for two words

    // Compute the score of each word

    // Print the winner
}
```

</details>

> 习题集中的某些题目，比如这一道，可能包含剧透（就像下一段那样），最终会带你走完整个解法。虽然你可以使用这些代码，但我们真心强烈建议你先自己动手试试！习题集中的其他题目不会有这种讲解，而且通常包含“完整剧透”的那道题，是你之后要攻克的那道更大的题目的热身版。

<details markdown="1"><summary>把伪代码转换成代码</summary>

首先，考虑如何提示用户输入两个单词。回忆一下，CS50 库中的函数 `get_string` 可以提示用户输入一个字符串。

```
#include <ctype.h>
#include <cs50.h>
#include <stdio.h>
#include <string.h>

int main(void)
{
    // Prompt the user for two words
    string word1 = get_string("Player 1: ");
    string word2 = get_string("Player 2: ");

    // Compute the score of each word

    // Print the winner
}
```

接下来，考虑如何计算每个单词的得分。由于两个单词用的是同一种计分算法，这正是运用<em>抽象</em>的好机会。这里我们定义一个名为 `compute_score` 的函数，它接受一个名为 `word` 的字符串作为输入，然后以 `int` 形式返回 `word` 的得分。

```
#include <ctype.h>
#include <cs50.h>
#include <stdio.h>
#include <string.h>

int compute_score(string word);

int main(void)
{
    // Prompt the user for two words
    string word1 = get_string("Player 1: ");
    string word2 = get_string("Player 2: ");

    // Compute the score of each word
    int score1 = compute_score(word1);
    int score2 = compute_score(word2);

    // Print the winner   
}

int compute_score(string word)
{
    // Compute and return score for word
}
```

现在转向实现 `compute_score`。要计算一个单词的得分，你需要知道单词中每个字母的分值。你可以用一个<em>数组</em>把字母和它们的分值关联起来。设想一个由 26 个 `int` 组成的数组，名为 `POINTS`，其中第一个数是 ‘A’ 的分值，第二个数是 ‘B’ 的分值，依此类推。如果在任何单个函数之外声明并初始化这样一个数组，就能确保任何函数（包括 `compute_score`）都可以访问它。

```
#include <ctype.h>
#include <cs50.h>
#include <stdio.h>
#include <string.h>

// Points assigned to each letter of the alphabet
int POINTS[] = {1, 3, 3, 2, 1, 4, 2, 4, 1, 8, 5, 1, 3, 1, 1, 3, 10, 1, 1, 1, 1, 4, 4, 8, 4, 10};

int compute_score(string word);

int main(void)
{
    // Prompt the user for two words
    string word1 = get_string("Player 1: ");
    string word2 = get_string("Player 2: ");

    // Compute the score of each word
    int score1 = compute_score(word1);
    int score2 = compute_score(word2);

    // Print the winner   
}

int compute_score(string word)
{
    // Compute and return score for word
}
```

要实现 `compute_score`，先试着求出 `word` 中单个字母的分值。

- 回忆一下，要找到字符串 `s` 的第 n 个下标处的字符，可以写 `s[n]`。所以比如 `word[0]` 会给你 `word` 的第一个字符。
- 再回忆一下，计算机用 ASCII 来表示字符，这是一种把每个字符表示为一个数字的标准。
- 还要记得，`POINTS` 的第 0 个下标 `POINTS[0]` 给出的是 ‘A’ 的分值。想想你该如何把 ‘A’ 的数字表示转换成它的分值所对应的下标。那么 ‘a’ 呢？你需要对大写和小写字母分别做不同的转换，所以你可能会发现函数 [`isupper`](https://manual.cs50.io/3/isupper) 和 [`islower`](https://manual.cs50.io/3/islower) 对你有帮助。
- 记住，<em>不是</em>字母的字符应该得零分。例如，`!` 值 0 分。

如果你能正确计算 `word` 中<em>一个</em>字符的分值，那么多半就能用循环把其余字符的分数加起来。等你自己尝试过上面的内容之后，再看下面这个（相当剧透的！）提示。

```
#include <ctype.h>
#include <cs50.h>
#include <stdio.h>
#include <string.h>

// Points assigned to each letter of the alphabet
int POINTS[] = {1, 3, 3, 2, 1, 4, 2, 4, 1, 8, 5, 1, 3, 1, 1, 3, 10, 1, 1, 1, 1, 4, 4, 8, 4, 10};

int compute_score(string word);

int main(void)
{
    // Prompt the user for two words
    string word1 = get_string("Player 1: ");
    string word2 = get_string("Player 2: ");

    // Compute the score of each word
    int score1 = compute_score(word1);
    int score2 = compute_score(word2);

    // Print the winner   
}

int compute_score(string word)
{
    // Keep track of score
    int score = 0;

    // Compute score for each character
    for (int i = 0, len = strlen(word); i < len; i++)
    {
        if (isupper(word[i]))
        {
            score += POINTS[word[i] - 'A'];
        }
        else if (islower(word[i]))
        {
            score += POINTS[word[i] - 'a'];
        }
    }

    return score;
}
```

最后，完成伪代码的最后一步：打印赢家。回忆一下，`if` 语句可以用来检查某个条件是否为真，再加上 `else if` 或 `else` 还可以检查其他（互斥的）条件。

```
if (/* Player 1 wins */)
{
    // ...
}
else if (/* Player 2 wins */)
{
    // ...
}
else
{
    // ...
}
```

等你自己尝试过上面的内容之后，可以随意看看下面的提示（或者说，完整解答！）。

```
#include <ctype.h>
#include <cs50.h>
#include <stdio.h>
#include <string.h>

// Points assigned to each letter of the alphabet
int POINTS[] = {1, 3, 3, 2, 1, 4, 2, 4, 1, 8, 5, 1, 3, 1, 1, 3, 10, 1, 1, 1, 1, 4, 4, 8, 4, 10};

int compute_score(string word);

int main(void)
{
    // Prompt the user for two words
    string word1 = get_string("Player 1: ");
    string word2 = get_string("Player 2: ");

    // Compute the score of each word
    int score1 = compute_score(word1);
    int score2 = compute_score(word2);

    // Print the winner   
    if (score1 > score2)
    {
        printf("Player 1 wins!\n");
    }
    else if (score1 < score2)
    {
        printf("Player 2 wins!\n");
    }
    else
    {
        printf("Tie!\n");
    }
}

int compute_score(string word)
{
    // Keep track of score
    int score = 0;

    // Compute score for each character
    for (int i = 0, len = strlen(word); i < len; i++)
    {
        if (isupper(word[i]))
        {
            score += POINTS[word[i] - 'A'];
        }
        else if (islower(word[i]))
        {
            score += POINTS[word[i] - 'a'];
        }
    }

    return score;
}
```

</details>

## 如何测试

你的程序的行为应当符合下面的示例。

```
$ ./scrabble
Player 1: Question?
Player 2: Question!
Tie!
```

```
$ ./scrabble
Player 1: red
Player 2: wheelbarrow
Player 2 wins!
```

```
$ ./scrabble
Player 1: COMPUTER
Player 2: science
Player 1 wins!
```

```
$ ./scrabble
Player 1: Scrabble
Player 2: wiNNeR
Player 1 wins!
```

### 正确性

```
check50 cs50/problems/2026/x/scrabble
```

### 代码风格

```
style50 scrabble.c
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/scrabble
```
