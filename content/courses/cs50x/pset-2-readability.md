# Readability

![Charlotte's Web Cover](https://cs50.harvard.edu/x/psets/2/readability/charlottes_web.jpg)

## 要解决的问题

根据 [Scholastic](https://www.scholastic.com/teachers/teaching-tools/collections/guided-reading-book-lists-for-every-level.html)，E.B. White 的《<em>Charlotte’s Web</em>》属于二到四年级的阅读水平，Lois Lowry 的《<em>The Giver</em>》属于八到十二年级的阅读水平。不过，一本书处于某个特定的阅读水平，到底是什么意思呢？

在很多情况下，是由人类专家读过一本书之后，判断他们认为这本书最适合哪个年级（即学年）。但算法很可能也能算出来！

在名为 `readability` 的文件夹中，创建名为 `readability.c` 的文件，你将实现一个程序，计算理解某段文本大约所需的年级水平。你的程序应该输出 “Grade X”，其中 “X” 是计算出的年级水平，四舍五入到最接近的整数。如果年级水平是 16 或更高（相当于或高于大学本科高年级的阅读水平），你的程序应该输出 “Grade 16+”，而不是给出确切的指数值。如果年级水平小于 1，你的程序应该输出 “Before Grade 1”。

## 演示

## 背景

那么，什么样的特征是较高阅读水平的标志呢？嗯，较长的单词可能与较高的阅读水平相关。同样，较长的句子也可能与较高的阅读水平相关。

多年来，人们开发了许多“可读性测试”，它们定义了计算文本阅读水平的公式。其中一种可读性测试是 <em>Coleman-Liau 指数</em>。一段文本的 Coleman-Liau 指数旨在输出理解该文本所需的（美国）年级水平。公式是

```
index = 0.0588 * L - 0.296 * S - 15.8
```

其中 `L` 是文本中平均每 100 个单词的字母数，`S` 是文本中平均每 100 个单词的句子数。

## 建议

<details markdown="1"><summary>先写一些你确定能编译的代码</summary>

```
#include <ctype.h>
#include <cs50.h>
#include <math.h>
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

1. 提示用户输入一些文本
2. 统计文本中字母、单词和句子的数量
3. 计算 Coleman-Liau 指数
4. 打印年级水平

我们来写一些伪代码作为注释，提醒你照此去做：

```
#include <ctype.h>
#include <cs50.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

int main(void)
{
    // Prompt the user for some text

    // Count the number of letters, words, and sentences in the text

    // Compute the Coleman-Liau index

    // Print the grade level
}
```

</details>

<details markdown="1"><summary>把伪代码转换成代码</summary>

首先，考虑如何提示用户输入一些文本。回忆一下，CS50 库中的函数 `get_string` 可以提示用户输入一个字符串。

```
#include <ctype.h>
#include <cs50.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

int main(void)
{
    // Prompt the user for some text
    string text = get_string("Text: ");

    // Count the number of letters, words, and sentences in the text

    // Compute the Coleman-Liau index

    // Print the grade level
}
```

既然你已经从用户那里收集到了输入，就可以开始分析这些输入了。首先，试着统计文本中字母的数量。把字母看作大写或小写的字母字符，而不是标点、数字或其他符号。

解决这个问题的一种方式是创建一个名为 `count_letters` 的函数，它接受一个字符串 `text` 作为输入，然后以 `int` 形式返回该文本中的字母数量。

```
int count_letters(string text)
{
    // Return the number of letters in text
}
```

你需要自己编写代码来统计文本中字母的数量。但是，比你经验更丰富的人可能已经写好了判断某个字符是否为字母的函数。这是使用 [CS50 手册](https://manual.cs50.io/) 的好机会，它收集了对 C 标准库中常用函数的说明。

你可以像下面这样，把 `count_letters` 整合进你已经写好的代码。

```
#include <ctype.h>
#include <cs50.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

int count_letters(string text);

int main(void)
{
    // Prompt the user for some text
    string text = get_string("Text: ");

    // Count the number of letters, words, and sentences in the text
    int letters = count_letters(text);

    // Compute the Coleman-Liau index

    // Print the grade level
}

int count_letters(string text)
{
    // Return the number of letters in text
}
```

接下来，编写一个函数来统计单词。

```
int count_words(string text)
{
    // Return the number of words in text
}
```

在这道题中，我们把任何由空格分隔的字符序列都看作一个单词（所以像 “sister-in-law” 这样带连字符的词应该算作一个单词，而不是三个）。你可以假设一个句子：

- 至少包含一个单词；
- 不会以空格开头或结尾；并且
- 不会有连续多个空格。

在这些假设下，你也许能找到单词数量和空格数量之间的关系。当然，也欢迎你尝试写出能容忍单词之间有多个空格、甚至没有单词的解法！

现在你可以像下面这样，把 `count_words` 整合进你的程序：

```
#include <ctype.h>
#include <cs50.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

int count_letters(string text);
int count_words(string text);

int main(void)
{
    // Prompt the user for some text
    string text = get_string("Text: ");

    // Count the number of letters, words, and sentences in the text
    int letters = count_letters(text);
    int words = count_words(text);

    // Compute the Coleman-Liau index

    // Print the grade level
}

int count_letters(string text)
{
    // Return the number of letters in text
}

int count_words(string text)
{
    // Return the number of words in text
}
```

最后，编写一个函数来统计句子。你可以把任何以 `.`、`!` 或 `?` 结尾的字符序列看作一个句子。

```
int count_sentences(string text)
{
    // Return the number of sentences in text
}
```

你可以像下面这样，把 `count_sentences` 整合进你的程序：

```
#include <ctype.h>
#include <cs50.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

int count_letters(string text);
int count_words(string text);
int count_sentences(string text);

int main(void)
{
    // Prompt the user for some text
    string text = get_string("Text: ");

    // Count the number of letters, words, and sentences in the text
    int letters = count_letters(text);
    int words = count_words(text);
    int sentences = count_sentences(text);

    // Compute the Coleman-Liau index

    // Print the grade level
}

int count_letters(string text)
{
    // Return the number of letters in text
}

int count_words(string text)
{
    // Return the number of words in text
}

int count_sentences(string text)
{
    // Return the number of sentences in text
}
```

最后，计算 Coleman-Liau 指数并打印得到的年级水平。

- 回忆一下，Coleman-Liau 指数的计算公式是 `index = 0.0588 * L - 0.296 * S - 15.8`
- `L` 是文本中平均每 100 个单词的字母数：也就是字母数除以单词数，再整体乘以 100。
- `S` 是文本中平均每 100 个单词的句子数：也就是句子数除以单词数，再整体乘以 100。
- 你需要把结果四舍五入到最接近的整数，所以回忆一下，根据 [manual.cs50.io](https://manual.cs50.io/)，`round` 声明在 `math.h` 中。
- 回忆一下，在 C 中对 `int` 类型的值做除法时，结果也是 `int`，余数（即小数点后的数字）会被丢弃。换句话说，结果会被“截断”。在计算 `L` 和 `S` 时，你可能需要在做除法之前把一个或多个值转换成 `float`！

如果得到的指数是 16 或更高（相当于或高于大学本科高年级的阅读水平），你的程序应该输出 “Grade 16+”，而不是输出确切的指数值。如果指数小于 1，你的程序应该输出 “Before Grade 1”。

</details>

## 讲解视频

<!-- video: AOVyZEh9zgE -->
[▶ 视频](https://www.youtube.com/watch?v=AOVyZEh9zgE)

## 如何测试

试着在下面这些文本上运行你的程序，确保看到指定的年级水平。务必只复制文本本身，不要带多余的空格。

- `One fish. Two fish. Red fish. Blue fish.` (Before Grade 1)
- `Would you like them here or there? I would not like them here or there. I would not like them anywhere.` (Grade 2)
- `Congratulations! Today is your day. You're off to Great Places! You're off and away!` (Grade 3)
- `Harry Potter was a highly unusual boy in many ways. For one thing, he hated the summer holidays more than any other time of year. For another, he really wanted to do his homework, but was forced to do it in secret, in the dead of the night. And he also happened to be a wizard.` (Grade 5)
- `In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.` (Grade 7)
- `Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice "without pictures or conversation?"` (Grade 8)
- `When he was nearly thirteen, my brother Jem got his arm badly broken at the elbow. When it healed, and Jem's fears of never being able to play football were assuaged, he was seldom self-conscious about his injury. His left arm was somewhat shorter than his right; when he stood or walked, the back of his hand was at right angles to his body, his thumb parallel to his thigh.` (Grade 8)
- `There are more things in Heaven and Earth, Horatio, than are dreamt of in your philosophy.` (Grade 9)
- `It was a bright cold day in April, and the clocks were striking thirteen. Winston Smith, his chin nuzzled into his breast in an effort to escape the vile wind, slipped quickly through the glass doors of Victory Mansions, though not quickly enough to prevent a swirl of gritty dust from entering along with him.` (Grade 10)
- `A large class of computational problems involve the determination of properties of graphs, digraphs, integers, arrays of integers, finite families of finite sets, boolean formulas and elements of other countable domains.` (Grade 16+)

### 正确性

```
check50 cs50/problems/2026/x/readability
```

### 代码风格

```
style50 readability.c
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/readability
```
