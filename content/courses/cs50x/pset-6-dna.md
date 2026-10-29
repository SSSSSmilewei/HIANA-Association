# DNA

## 要解决的问题

DNA 是生物体内遗传信息的载体，数十年来一直被用于刑事司法。但 DNA 分析究竟是怎么运作的？给定一段 DNA 序列，法医调查人员如何确定它属于谁？

在名为 `dna` 的文件夹中，创建名为 `dna.py` 的文件，实现一个程序，识别一段 DNA 序列属于谁。

## 演示

## 发行代码

这道题要求你扩展 CS50 课程组提供给你的代码的功能。

<details markdown="1"><summary>下载发行代码</summary>

登录 [cs50.dev](https://cs50.dev/)，点击你的终端窗口，单独执行 `cd`。你应该会发现终端窗口的提示符类似下面这样：

```
$
```

接着执行

```
wget https://cdn.cs50.net/2026/x/psets/6/dna.zip
```

把名为 `dna.zip` 的 ZIP 文件下载到你的 codespace 中。

然后执行

```
unzip dna.zip
```

创建一个名为 `dna` 的文件夹。你不再需要这个 ZIP 文件了，所以可以执行

```
rm dna.zip
```

并在提示时输入“y”后按回车，删除你下载的 ZIP 文件。

现在输入

```
cd dna
```

再按回车，进入（即打开）该目录。你的提示符现在应该类似下面这样。

```
dna/ $
```

单独执行 `ls`，你应该会看到几个文件和文件夹：

```
databases/ dna.py sequences/
```

如果遇到任何问题，请重新按这些步骤操作一遍，看看能否找出哪里出了错！

</details>

## 背景

DNA 其实就是一串称为核苷酸（nucleotide）的分子序列，排列成特定的形状（双螺旋）。每个人体细胞里都有数十亿个按顺序排列的核苷酸。DNA 的每个核苷酸含有四种不同碱基之一：腺嘌呤（A）、胞嘧啶（C）、鸟嘌呤（G）或胸腺嘧啶（T）。这条序列（即基因组）的某些部分在几乎所有人身上都相同，或者至少非常相似，但序列的另一些部分具有更高的遗传多样性，因此在人群中的差异更大。

DNA 往往具有高遗传多样性的一个地方是短串联重复序列（Short Tandem Repeat，STR）。STR 是一小段 DNA 碱基序列，它往往在一个人 DNA 内部的特定位置连续重复很多次。某个特定 STR 的重复次数在不同个体之间差异很大。例如，在下面的 DNA 样本中，Alice 的 DNA 中 STR `AGAT` 重复了四次，而 Bob 的同一个 STR 重复了五次。

![Sample STRs](https://cs50.harvard.edu/x/psets/6/dna/strs.png)

使用多个 STR，而不是只用一个，可以提高 DNA 分析的准确度。如果两个人在单个 STR 上重复次数相同的概率是 5%，而分析员查看了 10 个不同的 STR，那么两份 DNA 样本纯属巧合而匹配的概率大约是一千万亿分之一（假设所有 STR 彼此独立）。所以，如果两份 DNA 样本在每个 STR 的重复次数上都匹配，分析员就可以相当有把握地认为它们来自同一个人。CODIS，即 FBI 的 [DNA 数据库](https://www.fbi.gov/services/laboratory/biometric-analysis/codis/codis-and-ndis-fact-sheet)，在其 DNA 分析过程中就使用了 20 个不同的 STR。

这样的 DNA 数据库可能是什么样子？最简单的形式下，你可以设想把 DNA 数据库格式化成一个 CSV 文件，其中每一行对应一个人，每一列对应一个特定的 STR。

```
name,AGAT,AATG,TATC
Alice,28,42,14
Bob,17,22,19
Charlie,36,18,25
```

上面文件中的数据表明，Alice 的 DNA 中某处序列 `AGAT` 连续重复了 28 次，序列 `AATG` 重复了 42 次，`TATC` 重复了 14 次。而 Bob 的这三个 STR 则分别重复了 17 次、22 次和 19 次。Charlie 的这三个 STR 则分别重复了 36 次、18 次和 25 次。

那么，给定一段 DNA 序列，你如何确定它属于谁呢？设想你在这段 DNA 序列中查找连续重复的 `AGAT` 的最长序列，发现最长的一段重复了 17 次。如果你接着发现 `AATG` 的最长序列重复了 22 次，`TATC` 的最长序列重复了 19 次，那就是相当有力的证据，说明这份 DNA 是 Bob 的。当然，也有可能在统计出每个 STR 的次数之后，发现它与你的 DNA 数据库中的任何人都不匹配，这时就是没有匹配。

在实际工作中，由于分析员知道 STR 会出现在 DNA 的哪条染色体、哪个位置，他们可以把搜索范围限定在一小段 DNA 上。不过在这道题中，我们会忽略这个细节。

你的任务是编写一个程序，它接收一段 DNA 序列和一个包含若干个人的 STR 次数的 CSV 文件，然后输出这份 DNA（最有可能）属于谁。

## 要求

- 程序应要求第一个命令行参数是一个 CSV 文件的名称，该文件包含若干个人的 STR 次数；并要求第二个命令行参数是一个文本文件的名称，该文件包含要识别的 DNA 序列。
  
  - 如果运行你的程序时命令行参数的个数不对，你的程序应（用 `print`）打印一条你自选的错误信息。如果提供了正确个数的参数，你可以假设第一个参数确实是有效 CSV 文件的文件名，第二个参数是有效文本文件的文件名。
- 你的程序应打开 CSV 文件，并把其内容读入内存。
  
  - 你可以假设 CSV 文件的第一行是列名。第一列是单词 `name`，其余各列是 STR 序列本身。
- 你的程序应打开 DNA 序列文件，并把其内容读入内存。
- 对于（CSV 文件第一行中的）每个 STR，你的程序应计算它在待识别的 DNA 序列中连续重复的最长次数。注意，我们已经为你定义了一个辅助函数 `longest_match`，它做的正是这件事！
- 如果 STR 次数与 CSV 文件中的某个人完全匹配，你的程序应打印出匹配者的名字。
  
  - 你可以假设 STR 次数不会同时匹配多个人。
  - 如果 STR 次数与 CSV 文件中的任何人都不完全匹配，你的程序应打印 `No match`。

## 提示

- 你可能会觉得 Python 的
  
  `csv`
  
  模块对把 CSV 文件读入内存很有帮助。特别有用的可能是
  
  `csv.DictReader`
  
  。
  
  - 例如，如果像
    
    foo.csv
    
    这样的文件有一个表头行，其中每个字符串都是某个字段的名称，那么你可以这样把这些
    
    字段名
    
    作为一个
    
    list
    
    打印出来：
    
    ```
    import csv
    
    with open("foo.csv") as file:
        reader = csv.DictReader(file)
        print(reader.fieldnames)
    ```
  - 而要把 CSV 中（其余的）所有行读入一个
    
    list
    
    ，其中每个元素是代表该行的一个
    
    dict
    
    ，可以这样做：
    
    ```
    import csv
    
    rows = []
    with open("foo.csv") as file:
        reader = csv.DictReader(file)
        for row in reader:
            rows.append(row)
    ```
- [`open`](https://docs.python.org/3/tutorial/inputoutput.html#reading-and-writing-files) 和 [`read`](https://docs.python.org/3/tutorial/inputoutput.html#methods-of-file-objects) 函数对把文本文件读入内存也可能有用。
- 想一想哪些数据结构可能有助于在程序中记录信息。[`list`](https://docs.python.org/3/tutorial/introduction.html#lists) 或 [`dict`](https://docs.python.org/3/tutorial/datastructures.html#dictionaries) 可能会派上用场。
- 记住，我们已经定义了一个函数（`longest_match`），给定一段 DNA 序列和一个 STR 作为输入，它会返回该 STR 重复的最大次数。你可以在程序的其他部分使用这个函数！

## 讲解视频

<!-- video: j84b_EgntcQ -->
[▶ 视频](https://www.youtube.com/watch?v=j84b_EgntcQ)

## 如何测试

虽然这道题可以使用 `check50`，但我们鼓励你先自己针对下面每一项测试你的代码。

- 以 `python dna.py databases/small.csv sequences/1.txt` 运行你的程序。你的程序应输出 `Bob`。
- 以 `python dna.py databases/small.csv sequences/2.txt` 运行你的程序。你的程序应输出 `No match`。
- 以 `python dna.py databases/small.csv sequences/3.txt` 运行你的程序。你的程序应输出 `No match`。
- 以 `python dna.py databases/small.csv sequences/4.txt` 运行你的程序。你的程序应输出 `Alice`。
- 以 `python dna.py databases/large.csv sequences/5.txt` 运行你的程序。你的程序应输出 `Lavender`。
- 以 `python dna.py databases/large.csv sequences/6.txt` 运行你的程序。你的程序应输出 `Luna`。
- 以 `python dna.py databases/large.csv sequences/7.txt` 运行你的程序。你的程序应输出 `Ron`。
- 以 `python dna.py databases/large.csv sequences/8.txt` 运行你的程序。你的程序应输出 `Ginny`。
- 以 `python dna.py databases/large.csv sequences/9.txt` 运行你的程序。你的程序应输出 `Draco`。
- 以 `python dna.py databases/large.csv sequences/10.txt` 运行你的程序。你的程序应输出 `Albus`。
- 以 `python dna.py databases/large.csv sequences/11.txt` 运行你的程序。你的程序应输出 `Hermione`。
- 以 `python dna.py databases/large.csv sequences/12.txt` 运行你的程序。你的程序应输出 `Lily`。
- 以 `python dna.py databases/large.csv sequences/13.txt` 运行你的程序。你的程序应输出 `No match`。
- 以 `python dna.py databases/large.csv sequences/14.txt` 运行你的程序。你的程序应输出 `Severus`。
- 以 `python dna.py databases/large.csv sequences/15.txt` 运行你的程序。你的程序应输出 `Sirius`。
- 以 `python dna.py databases/large.csv sequences/16.txt` 运行你的程序。你的程序应输出 `No match`。
- 以 `python dna.py databases/large.csv sequences/17.txt` 运行你的程序。你的程序应输出 `Harry`。
- 以 `python dna.py databases/large.csv sequences/18.txt` 运行你的程序。你的程序应输出 `No match`。
- 以 `python dna.py databases/large.csv sequences/19.txt` 运行你的程序。你的程序应输出 `Fred`。
- 以 `python dna.py databases/large.csv sequences/20.txt` 运行你的程序。你的程序应输出 `No match`。

### 正确性

```
check50 cs50/problems/2026/x/dna
```

### 代码风格

```
style50 dna.py
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/dna
```
