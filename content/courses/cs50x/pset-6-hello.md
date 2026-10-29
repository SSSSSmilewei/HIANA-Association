# 再说 Hello

## 要解决的问题

在名为 `sentimental-hello` 的文件夹中，创建名为 `hello.py` 的文件，实现一个程序：提示用户输入姓名，然后打印 `hello, so-and-so`，其中 `so-and-so` 是用户输入的姓名，就像你在[习题集 1](/courses/cs50x/learn/pset-1)中做的那样。不同的是，这次你的程序要用 Python 来写！

<details markdown="1"><summary>提示</summary>

- 回忆一下，你可以用 `cs50` 库中声明的 `get_string` 从用户那里获取一个 `str`。
- 回忆一下，你可以用 `print` 打印一个 `str`。
- 回忆一下，在 Python 中，你可以在字符串前加上 `f` 来创建格式化字符串。例如，`f"{name}"` 会把变量 `name` 的值代入（“插值”）到你写下 `{name}` 的位置。

</details>

## 演示

## 如何测试

虽然这道题可以使用 `check50`，但我们鼓励你先自己针对下面每一项测试你的代码。

- 以 `python hello.py` 运行你的程序，等待输入提示。输入 `David` 并按回车。你的程序应输出 `hello, David`。
- 以 `python hello.py` 运行你的程序，等待输入提示。输入 `Inno` 并按回车。你的程序应输出 `hello, Inno`。
- 以 `python hello.py` 运行你的程序，等待输入提示。输入 `Kamryn` 并按回车。你的程序应输出 `hello, Kamryn`。

### 正确性

```
check50 cs50/problems/2026/x/sentimental/hello
```

### 代码风格

```
style50 hello.py
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/sentimental/hello
```
