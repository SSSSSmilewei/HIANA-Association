# Hello, It’s Me

<!-- video: YQHsXMglC9A -->
[▶ 视频](https://www.youtube.com/watch?v=YQHsXMglC9A)

## 要解决的问题

在名为 `me` 的文件夹中，创建名为 `hello.c` 的文件，用 C 语言实现一个程序：提示用户输入姓名，然后向该用户问好。例如，如果用户的名字是 Adele，你的程序应该打印 `hello, Adele\n`！

<details markdown="1"><summary>提示</summary>

- 回忆一下，你可以用 `get_string` 从用户那里获得一个 `string`，它声明在 `cs50.h` 中。
- 回忆一下，你可以用 `printf` 打印一个 `string`，它声明在 `stdio.h` 中。
- 回忆一下，你可以在 `printf` 中用 `%s` 来格式化一个 `string`。

</details>

## 演示

## 如何开始

在终端窗口中单独执行 `cd`。你应该会发现终端的提示符类似下面这样：

```
$
```

接着执行

```
mkdir me
```

在你的 codespace 中创建一个名为 `me` 的文件夹。

然后执行

```
cd me
```

切换到该文件夹。此时你应该看到终端提示符变成了 `me/ $`。现在你可以执行

```
code hello.c
```

来创建名为 `hello.c` 的文件，你可以在其中编写代码。

## 讲解视频

这是这道题的“讲解”（即导览），如果你想听一段口头概述，了解该做什么，可以看看！

<!-- video: wSk1KSDUEYA -->
[▶ 视频](https://www.youtube.com/watch?v=wSk1KSDUEYA)

## 如何测试

### 正确性

```
check50 cs50/problems/2026/x/me
```

### 代码风格

```
style50 hello.c
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/me
```
