# Credit

## 要解决的问题

在名为 `sentimental-credit` 的文件夹中，创建名为 `credit.py` 的文件，编写一个程序：提示用户输入信用卡号，然后（通过 `print`）报告它是有效的 American Express、MasterCard 还是 Visa 卡号，就像你在[习题集 1](/courses/cs50x/learn/pset-1)中做的那样。这次你的程序要用 Python 来写！

## 演示

## 要求

- 为了让我们能自动化测试你的代码，我们要求你的程序的最后一行输出是 `AMEX\n`、`MASTERCARD\n`、`VISA\n` 或 `INVALID\n`，不多也不少。
- 为简单起见，你可以假设用户的输入全是数字（即不含连字符，而实际卡片上可能会印有连字符）。
- 最好使用 CS50 库中的 `get_int` 或 `get_string` 来获取用户输入，具体取决于你打算如何实现。

## 提示

- 可以使用正则表达式（regular expression）来验证用户输入。例如，你可以使用 Python 的 [`re`](https://docs.python.org/3/library/re.html) 模块，检查用户输入是否确实是长度正确的一串数字。

## 如何测试

虽然这道题可以使用 `check50`，但我们鼓励你先自己针对下面每一项测试你的代码。

- 以 `python credit.py` 运行你的程序，等待输入提示。输入 `378282246310005` 并按回车。你的程序应输出 `AMEX`。
- 以 `python credit.py` 运行你的程序，等待输入提示。输入 `371449635398431` 并按回车。你的程序应输出 `AMEX`。
- 以 `python credit.py` 运行你的程序，等待输入提示。输入 `5555555555554444` 并按回车。你的程序应输出 `MASTERCARD`。
- 以 `python credit.py` 运行你的程序，等待输入提示。输入 `5105105105105100` 并按回车。你的程序应输出 `MASTERCARD`。
- 以 `python credit.py` 运行你的程序，等待输入提示。输入 `4111111111111111` 并按回车。你的程序应输出 `VISA`。
- 以 `python credit.py` 运行你的程序，等待输入提示。输入 `4012888888881881` 并按回车。你的程序应输出 `VISA`。
- 以 `python credit.py` 运行你的程序，等待输入提示。输入 `1234567890` 并按回车。你的程序应输出 `INVALID`。

### 正确性

```
check50 cs50/problems/2026/x/sentimental/credit
```

### 代码风格

```
style50 credit.py
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/sentimental/credit
```
