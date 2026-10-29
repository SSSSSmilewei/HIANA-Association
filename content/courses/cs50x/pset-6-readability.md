# Readability

## 要解决的问题

在名为 `sentimental-readability` 的文件夹中，创建名为 `readability.py` 的文件，编写一个程序：先让用户输入一段文字，然后根据 Coleman-Liau 公式输出这段文字的年级水平，就像你在[习题集 2](/courses/cs50x/learn/pset-2)中做的那样，不同的是这次你的程序要用 Python 来写。

## 演示

## 要求

- 回忆一下，Coleman-Liau 指数的计算公式是 `0.0588 * L - 0.296 * S - 15.8`，其中 `L` 是文本中平均每 100 个单词的字母数，`S` 是文本中平均每 100 个单词的句子数。
- 使用 CS50 库中的 `get_string` 获取用户的输入，并用 `print` 输出你的答案。
- 你的程序应统计文本中的字母数、单词数和句子数。你可以假设：任何从 `a` 到 `z` 的小写字符或从 `A` 到 `Z` 的大写字符都算作字母；任何由空格分隔的字符序列都算作一个单词；任何出现的句号、感叹号或问号都表示一个句子的结束。
- 你的程序应输出 `"Grade X"`，其中 `X` 是由 Coleman-Liau 公式算出的年级水平，四舍五入到最接近的整数。
- 如果得出的指数为 16 或更高（相当于或高于大学四年级的阅读水平），你的程序应输出 `"Grade 16+"`，而不是给出确切的指数。如果指数小于 1，你的程序应输出 `"Before Grade 1"`。

## 如何测试

虽然这道题可以使用 `check50`，但我们鼓励你先自己针对下面每一项测试你的代码。

- 以 `python readability.py` 运行你的程序，等待输入提示。输入 `One fish. Two fish. Red fish. Blue fish.` 并按回车。你的程序应输出 `Before Grade 1`。
- 以 `python readability.py` 运行你的程序，等待输入提示。输入 `Would you like them here or there? I would not like them here or there. I would not like them anywhere.` 并按回车。你的程序应输出 `Grade 2`。
- 以 `python readability.py` 运行你的程序，等待输入提示。输入 `Congratulations! Today is your day. You're off to Great Places! You're off and away!` 并按回车。你的程序应输出 `Grade 3`。
- 以 `python readability.py` 运行你的程序，等待输入提示。输入 `Harry Potter was a highly unusual boy in many ways. For one thing, he hated the summer holidays more than any other time of year. For another, he really wanted to do his homework, but was forced to do it in secret, in the dead of the night. And he also happened to be a wizard.` 并按回车。你的程序应输出 `Grade 5`。
- 以 `python readability.py` 运行你的程序，等待输入提示。输入 `In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.` 并按回车。你的程序应输出 `Grade 7`。
- 以 `python readability.py` 运行你的程序，等待输入提示。输入 `Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice "without pictures or conversation?"` 并按回车。你的程序应输出 `Grade 8`。
- 以 `python readability.py` 运行你的程序，等待输入提示。输入 `When he was nearly thirteen, my brother Jem got his arm badly broken at the elbow. When it healed, and Jem's fears of never being able to play football were assuaged, he was seldom self-conscious about his injury. His left arm was somewhat shorter than his right; when he stood or walked, the back of his hand was at right angles to his body, his thumb parallel to his thigh.` 并按回车。你的程序应输出 `Grade 8`。
- 以 `python readability.py` 运行你的程序，等待输入提示。输入 `There are more things in Heaven and Earth, Horatio, than are dreamt of in your philosophy.` 并按回车。你的程序应输出 `Grade 9`。
- 以 `python readability.py` 运行你的程序，等待输入提示。输入 `It was a bright cold day in April, and the clocks were striking thirteen. Winston Smith, his chin nuzzled into his breast in an effort to escape the vile wind, slipped quickly through the glass doors of Victory Mansions, though not quickly enough to prevent a swirl of gritty dust from entering along with him.` 并按回车。你的程序应输出 `Grade 10`。
- 以 `python readability.py` 运行你的程序，等待输入提示。输入 `A large class of computational problems involve the determination of properties of graphs, digraphs, integers, arrays of integers, finite families of finite sets, boolean formulas and elements of other countable domains.` 并按回车。你的程序应输出 `Grade 16+`。

### 正确性

```
check50 cs50/problems/2026/x/sentimental/readability
```

### 代码风格

```
style50 readability.py
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/sentimental/readability
```
