# Mario

<!-- video: cWOkHQXw0JQ -->
[▶ 视频](https://www.youtube.com/watch?v=cWOkHQXw0JQ)

## 要解决的问题

在任天堂《超级马力欧兄弟》第 1-1 关的开头附近，马力欧必须跳过相邻的方块金字塔，如下图所示。

![screenshot of Mario jumping over adjacent pyramids](https://cs50.harvard.edu/x/psets/1/mario/more/pyramids.png)

在名为 `mario-more` 的文件夹中，创建名为 `mario.c` 的文件，用 C 语言实现一个程序，用井号（`#`）当作砖块来重现那个金字塔，如下所示：

```
   #  #
  ##  ##
 ###  ###
####  ####
```

并且让用户来决定金字塔到底有多高：先提示他们输入一个介于 1 到 8（含）之间的正 `int`。

<details markdown="1"><summary>示例</summary>

如果用户在提示时输入 `8`，程序的运行情况可能如下：

```
$ ./mario
Height: 8
       #  #
      ##  ##
     ###  ###
    ####  ####
   #####  #####
  ######  ######
 #######  #######
########  ########
```

如果用户在提示时输入 `4`，程序的运行情况可能如下：

```
$ ./mario
Height: 4
   #  #
  ##  ##
 ###  ###
####  ####
```

如果用户在提示时输入 `2`，程序的运行情况可能如下：

```
$ ./mario
Height: 2
 #  #
##  ##
```

如果用户在提示时输入 `1`，程序的运行情况可能如下：

```
$ ./mario
Height: 1
#  #
```

如果用户在提示时输入的其实不是介于 1 到 8（含）之间的正整数，程序应该重新提示，直到他们配合为止：

```
$ ./mario
Height: -1
Height: 0
Height: 42
Height: 50
Height: 4
   #  #
  ##  ##
 ###  ###
####  ####
```

</details>

注意，相邻金字塔之间“间隙”的宽度等于两个井号的宽度，与金字塔的高度无关。

### 讲解视频

<!-- video: FzN9RAjYG_Q -->
[▶ 视频](https://www.youtube.com/watch?v=FzN9RAjYG_Q)

### 如何测试你的代码

当你输入下面这些内容时，你的代码是否按要求工作？

- `-1`（或其他负数）？
- `0`？
- `1` 到 `8`？
- `9` 或其他正数？
- 字母或单词？
- 什么都不输入，只按回车？

你也可以执行下面的命令，用 `check50` 评估代码的正确性。但一定也要自己编译并测试！

```
check50 cs50/problems/2026/x/mario/more
```

执行下面的命令，用 `style50` 评估你代码的风格。

```
style50 mario.c
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/mario/more
```
