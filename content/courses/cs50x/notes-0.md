# 第 0 讲

## 欢迎！

- 人工智能（AI）正在为计算机科学乃至整个世界带来新的进展和新的兴奋！
- AI 带来了巨大的进步，有时还能消除拖慢流程的人为瓶颈；但如果你能理解、编写并组织代码，你就能通过编程成为掌舵者、驾驶员，成为一个有能力的创造者。
- 因此，不要把 AI 看作可以让你不必学习基础知识的捷径，而要想一想：当你掌握了基础知识，又借助 AI 获得更大的能力时，会为你自己和你所服务的人带来怎样全新的机会。

## Visual Studio Code 与 chat.py

- VS Code 是一种 <em>IDE</em>，即集成开发环境（integrated development environment），可以在其中编写代码。
- 为了让你先尝尝后面的内容，我们来编写一个名为 `chat.py` 的聊天机器人。
- 在一个已经配置好 OpenAI 库的系统上，我们可以这样编写。
- 在文本编辑器中，可以输入下面的代码：
  
  ```
  from openai import OpenAI
  
  client = OpenAI()
  
  response = client.responses.create(
      input="In one sentence, what is CS50?",
      model="gpt-5"
  )
  
  print(response.output_text)
  ```
  
  注意这里导入了 OpenAI 的一个库，让我们能使用该库提供的功能。接着创建了一个聊天客户端。然后，一个名为 `input` 的问题被传给聊天 `client`，以获得回答。最后把 `response` 打印出来。
- 我们可以改进这段代码，让用户自己提问。把代码修改如下：
  
  ```
  from openai import OpenAI
  
  client = OpenAI()
  
  prompt = input("Prompt: ")
  
  response = client.responses.create(
      input=prompt,
      model="gpt-5"
  )
  
  print(response.output_text)
  ```
  
  注意现在创建了 `prompt`，让用户可以提出问题。
- 还可以进一步改进这个程序，提供一个 `system_prompt`，给聊天机器人补充一些背景信息和指令：
  
  ```
  from openai import OpenAI
  
  client = OpenAI()
  
  user_prompt = input("Prompt: ")
  system_prompt = "Limit your answer to one sentence. Pretend you're a cat."
  
  response = client.responses.create(
      input=user_prompt,
      instructions=system_prompt,
      model="gpt-5"
  )
  
  print(response.output_text)
  ```
  
  注意 `system_prompt` 是如何用来提供更多背景和指令的。
- 有了编程，你只用十行文本就能构建非常强大的程序！
- 我们打造了自己的<em>小黄鸭</em>（rubber duck），也就是 [CS50 Duck](https://cs50.ai)，帮助你完成本课程中的作业。
- 请牢记我们的[学术诚信政策](https://cs50.harvard.edu/x/syllabus/#academic-honesty)：除了 [CS50 Duck](https://cs50.ai) 之外，禁止使用任何其他 AI 工具。

## 计算机科学与解决问题

- 从本质上说，计算机编程就是接收一些输入并产生一些输出，从而解决一个问题。输入与输出之间发生的事情，我们可以称之为<em>黑箱</em>，正是本课程的重点。
  
  ```mermaid
  flowchart LR
      in["input"] --> BOX[" ??? "]
      BOX --> out["output"]
  ```
- 例如，我们可能需要为一堂课点名。可以用一种叫做<em>一进制</em>（unary，也叫 <em>base-1</em>）的系统，一次数一根手指。
- 如今的计算机使用一种叫做<em>二进制</em>（binary，也叫 <em>base-2</em>）的系统来计数。我们熟悉的 <em>bit</em>（比特）这个词，就来自 <em>binary digit</em>（二进制数位）。一个 <em>bit</em> 要么是零，要么是一：关，或者开。
- 计算机只用零和一来“说话”。零代表<em>关</em>，一代表<em>开</em>。计算机里有数百万、甚至数十亿个晶体管，不断地开开关关。
- 想象一个灯泡，一个灯泡只能从零数到一。
- 然而，如果你有三个灯泡，可选的方式就多了！
- 在你的 iPhone 或电脑这类设备内部，有数以百万计形象地说就是“灯泡”的东西，叫做<em>晶体管</em>（transistor），正是它们让你每天习以为常的各种操作成为可能。
- 作为一种启发式的想法，我们可以想象下面这些数值代表<em>二进制数</em>中的每一个位：
  
  ```
  4 2 1
  ```
- 用三个灯泡，下面这样可以表示零：
  
  ```
  4 2 1
  0 0 0
  ```
- 类似地，下面表示一：
  
  ```
  4 2 1
  0 0 1
  ```
- 按照这个逻辑，我们可以认为下面等于二：
  
  ```
  4 2 1
  0 1 0
  ```
- 继续推广，下面表示三：
  
  ```
  4 2 1
  0 1 1
  ```
- 四则是这样：
  
  ```
  4 2 1
  1 0 0
  ```
- 事实上，仅用三个灯泡，我们最高就能数到七！
  
  ```
  4 2 1
  1 1 1
  ```
- 计算机使用 base-2 来计数。可以这样来想象：
  
  ```
  2^2  2^1  2^0
  4    2    1
  ```
- 因此可以说，表示一个最大到七的数需要三个比特（四位、二位和一位）。
- 类似地，要数到八，数值要这样表示：
  
  ```
  8 4 2 1
  1 0 0 0
  ```
- 计算机通常用八个比特（也称为一个<em>字节</em>，byte）来表示一个数。例如，`00000101` 是二进制的数字 5，`11111111` 表示数字 255。零可以这样表示：
  
  | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1 |
  |---|---|---|---|---|---|---|---|
  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## ASCII

- 正如数字是由一和零构成的二进制模式，字母同样也用一和零来表示！
- 由于表示数字和表示字母的一和零会重叠，人们制定了 <em>ASCII</em> 标准，把特定的字母映射到特定的数字。
- 例如，字母 `A` 被规定映射到数字 65。`01000001` 在二进制中表示数字 65。可以这样直观地表示：
  
  | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1 |
  |---|---|---|---|---|---|---|---|
  | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
- 如果你收到一条短信，这条消息底层的二进制可能代表数字 72、73 和 33。把它们按 ASCII 映射出来，你的消息就是这样：
  
  ```
  H   I   !
  72  73  33
  ```
- 多亏有 ASCII 这样的标准，让我们能就这些值达成一致！
- 下面是 ASCII 值的扩展对照表：
  
  | <strong>0</strong> | NUL | <strong>16</strong> | DLE | <strong>32</strong> | SP | <strong>48</strong> | 0 | <strong>64</strong> | @ | <strong>80</strong> | P | <strong>96</strong> | ` | <strong>112</strong> | p |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
  | <strong>1</strong> | SOH | <strong>17</strong> | DC1 | <strong>33</strong> | ! | <strong>49</strong> | 1 | <strong>65</strong> | A | <strong>81</strong> | Q | <strong>97</strong> | a | <strong>113</strong> | q |
  | <strong>2</strong> | STX | <strong>18</strong> | DC2 | <strong>34</strong> | ” | <strong>50</strong> | 2 | <strong>66</strong> | B | <strong>82</strong> | R | <strong>98</strong> | b | <strong>114</strong> | r |
  | <strong>3</strong> | ETX | <strong>19</strong> | DC3 | <strong>35</strong> | # | <strong>51</strong> | 3 | <strong>67</strong> | C | <strong>83</strong> | S | <strong>99</strong> | c | <strong>115</strong> | s |
  | <strong>4</strong> | EOT | <strong>20</strong> | DC4 | <strong>36</strong> | $ | <strong>52</strong> | 4 | <strong>68</strong> | D | <strong>84</strong> | T | <strong>100</strong> | d | <strong>116</strong> | t |
  | <strong>5</strong> | ENQ | <strong>21</strong> | NAK | <strong>37</strong> | % | <strong>53</strong> | 5 | <strong>69</strong> | E | <strong>85</strong> | U | <strong>101</strong> | e | <strong>117</strong> | u |
  | <strong>6</strong> | ACK | <strong>22</strong> | SYN | <strong>38</strong> | & | <strong>54</strong> | 6 | <strong>70</strong> | F | <strong>86</strong> | V | <strong>102</strong> | f | <strong>118</strong> | v |
  | <strong>7</strong> | BEL | <strong>23</strong> | ETB | <strong>39</strong> | ’ | <strong>55</strong> | 7 | <strong>71</strong> | G | <strong>87</strong> | W | <strong>103</strong> | g | <strong>119</strong> | w |
  | <strong>8</strong> | BS | <strong>24</strong> | CAN | <strong>40</strong> | ( | <strong>56</strong> | 8 | <strong>72</strong> | H | <strong>88</strong> | X | <strong>104</strong> | h | <strong>120</strong> | x |
  | <strong>9</strong> | HT | <strong>25</strong> | EM | <strong>41</strong> | ) | <strong>57</strong> | 9 | <strong>73</strong> | I | <strong>89</strong> | Y | <strong>105</strong> | i | <strong>121</strong> | y |
  | <strong>10</strong> | LF | <strong>26</strong> | SUB | <strong>42</strong> | * | <strong>58</strong> | : | <strong>74</strong> | J | <strong>90</strong> | Z | <strong>106</strong> | j | <strong>122</strong> | z |
  | <strong>11</strong> | VT | <strong>27</strong> | ESC | <strong>43</strong> | + | <strong>59</strong> | ; | <strong>75</strong> | K | <strong>91</strong> | [ | <strong>107</strong> | k | <strong>123</strong> | { |
  | <strong>12</strong> | FF | <strong>28</strong> | FS | <strong>44</strong> | , | <strong>60</strong> | < | <strong>76</strong> | L | <strong>92</strong> | \ | <strong>108</strong> | l | <strong>124</strong> | \| |
  | <strong>13</strong> | CR | <strong>29</strong> | GS | <strong>45</strong> | - | <strong>61</strong> | = | <strong>77</strong> | M | <strong>93</strong> | ] | <strong>109</strong> | m | <strong>125</strong> | } |
  | <strong>14</strong> | SO | <strong>30</strong> | RS | <strong>46</strong> | . | <strong>62</strong> | > | <strong>78</strong> | N | <strong>94</strong> | ^ | <strong>110</strong> | n | <strong>126</strong> | ~ |
  | <strong>15</strong> | SI | <strong>31</strong> | US | <strong>47</strong> | / | <strong>63</strong> | ? | <strong>79</strong> | O | <strong>95</strong> | _ | <strong>111</strong> | o | <strong>127</strong> | DEL |
- 如果你愿意，可以进一步了解 [ASCII](https://en.wikipedia.org/wiki/ASCII)。
- 如果每个字符恰好存储在一个 8 位的字节里，最多能编码 256 个不同的字符码。ASCII 只用了其中的 128 个（0 到 127）。

## Unicode

- 随着时间推移，通过文字交流的方式越来越多。
- 由于二进制能表示的数值不足以涵盖人类可能用到的所有字符，<em>Unicode</em> 标准扩展了计算机可以传输和理解的位数。Unicode 不仅包含各种特殊字符，还包含 emoji 表情。
- 有一些 emoji 你可能每天都在用。下面这些你可能很眼熟：
  
  😀 😃 😄 😁 😆 😅 😂 🙂 🙃 😉 😊 😇 😍 😘 😗 😙 😚 😋 😛 😜 😝 🤑 🤓 😎 🤗 😏 😶 😐 😑 😒 🙄 😬 😕 ☹️ 😟 😮 😯 😲 😳 😦 😧 😨
- 虽然零和一的模式在 Unicode 中是标准化的，但各个设备厂商显示每个 emoji 的样子可能略有不同。
- Unicode 标准中正不断加入更多功能，以表示更多的字符和 emoji。
- 如果你愿意，可以进一步了解 [Unicode](https://en.wikipedia.org/wiki/Unicode)。
- 如果你愿意，可以进一步了解 [emoji](https://en.wikipedia.org/wiki/Emoji)。

## RGB

- 零和一也可以用来表示颜色。
- 红、绿、蓝（称为 `RGB`）是由三个数字组合而成的。
  
  三个带有数字 72 73 33 的彩色方块
- 拿我们之前用过的 72、73 和 33 来说，它们以文本形式表示 `HI!`，但被图像读取程序解释时，会是一种浅黄色。红色值是 72，绿色值是 73，蓝色值是 33。
  
  一个黄色方块
- 表示各种红、绿、蓝（即 <em>RGB</em>）颜色所需的三个字节，构成了任何数字图像中每个<em>像素</em>（pixel，即一个点）的颜色。图像不过是 RGB 值的集合。
- 零和一可以用来表示图像、视频和音乐！
- 视频是许多图像按顺序存储在一起的序列，就像翻页动画书一样。
- 音乐也可以用各种字节的组合类似地表示。

## 算法

- 解决问题是计算机科学和计算机编程的核心。<em>算法</em>（algorithm）是解决问题的一组分步骤指令。
- 想象一个基本的问题：在电话簿里找一个名字。
- 该怎么做呢？
- 一种做法是从第一页开始，一页接一页地读下去，直到最后一页。
- 另一种做法是一次查两页。
- 最后一种，也可能是更好的做法，是翻到电话簿的中间，问：“我要找的名字是在左边还是右边？”然后重复这个过程，把问题一半一半再一半地缩小。
- 这些做法都可以称为算法。每种算法的速度，可以用所谓的<em>大 O 表示法</em>（big-O notation）表示如下：
  
  大 O 表示法图表
  
  <div class="figure"><svg height="405" viewbox="0 0 720 405" width="720" xmlns="http://www.w3.org/2000/svg"><rect fill="#000" height="100%" width="100%"></rect><line stroke="#aaa" stroke-width="2" x1="60" x2="60" y1="40" y2="360"></line><line stroke="#aaa" stroke-width="2" x1="60" x2="690" y1="360" y2="360"></line><line stroke="#e74c3c" stroke-width="6" x1="60" x2="220" y1="360" y2="40"></line><text fill="#fff" font-size="22" x="235" y="55">n</text><line stroke="#f4e04d" stroke-width="6" x1="60" x2="320" y1="360" y2="40"></line><text fill="#fff" font-size="22" x="335" y="55">n/2</text><path d="M60 360 C 140 230, 280 170, 650 150" fill="none" stroke="#3bd16f" stroke-width="6"></path><text fill="#fff" font-size="22" x="660" y="160">log₂ n</text><text fill="#fff" font-size="20" x="345" y="395">问题规模</text><text fill="#fff" font-size="20" transform="rotate(-90)" x="-270" y="25">求解时间</text></svg></div>
  
  注意，第一种算法（用红色标出）的大 O 是 `n`，因为如果电话簿里有 100 个名字，最多可能要试 100 次才能找到正确的名字。第二种算法，即一次查两页，其大 O 是 `n/2`，因为我们翻页的速度快了一倍。最后一种算法的大 O 是 log<sub>2</sub>n，因为问题规模加倍时，只会多出一步来求解。
- 程序员把基于文字的、人类可读的指令转化为<em>代码</em>，以解决问题。

## 伪代码

- 伪代码（pseudocode）是人类可读的指令，通常用来描述算法的步骤。
- 能够写出<em>伪代码</em>，对你在本课程和编程中取得成功至关重要。
- 例如，针对上面的第三种算法，我们可以写出这样的伪代码：
  
  ```
  1  Pick up phone book
  2  Open to middle of phone book
  3  Look at page
  4  If person is on page
  5      Call person
  6  Else if person is earlier in book
  7      Open to middle of left half of book
  8      Go back to line 3
  9  Else if person is later in book
  10     Open to middle of right half of book
  11     Go back to line 3
  12 Else
  13     Quit
  ```
- 伪代码之所以是一项重要的技能，至少有两个原因。第一，在写正式代码之前先写伪代码，可以让你提前把问题的逻辑想清楚。第二，写了伪代码之后，你可以把这些信息提供给想要理解你的编码决策和代码工作原理的其他人。
- 注意我们的伪代码语言有一些独特之处。首先，其中有些行以动词开头，比如 <em>pick up</em>、<em>open</em>、<em>look at</em>。之后我们会把它们称为<em>函数</em>（function）。
- 其次，注意有些行包含 `if` 或 `else if` 这样的语句。这些称为<em>条件</em>（conditional）。
- 第三，注意有些表达式可以说是<em>真</em>或<em>假</em>，比如“person is earlier in the book”（此人在书的前半部分）。我们把它们称为<em>布尔表达式</em>（boolean expression）。
- 最后，注意有些语句像“go back to line 3”（回到第 3 行）。我们把它们称为<em>循环</em>（loop）。
- 这些构件是编程的基础。
- 在下面要讨论的 <em>Scratch</em> 中，我们将用到上述每一种编程的基本构件。

## 接下来的内容

- 本周你将学习 Scratch，一种可视化的编程语言。
- 之后的几周里，你将学习 C 语言。它看起来大概是这样：
  
  ```
  #include <stdio.h>
  
  int main(void)
  {
    printf("hello, world\n");
  }
  ```
- 学会了 C，你就能为将来学习 <em>Python</em> 等其他编程语言做好更充分的准备。
- 注意程序员是如何利用<em>抽象</em>（abstraction），在其他程序员的工作之上继续构建的。人们没有一直用一和零来编程，而是创造了编程语言，把用二进制编程这项极其艰巨的任务<em>抽象</em>掉，换成越来越易用的编程语言。我们可以站在前人的肩膀上！

## Scratch

- <em>Scratch</em> 是由 MIT 开发的一种可视化编程语言。
- [Scratch](https://scratch.mit.edu) 使用的，正是我们在本讲前面介绍过的那些基本编程构件。
- Scratch 是进入计算机编程的绝佳方式，因为它让你以可视化的方式摆弄这些构件，而不必操心花括号、分号、圆括号之类的语法。
- Scratch 的 `IDE`（集成开发环境）是这样的：
  
  ![scratch interface](https://cs50.harvard.edu/x/notes/0/cs50Week0Slide162.png)
  
  注意最左边是一个<em>积木</em>（building block）面板，里面是你编程时可以使用的积木。紧挨着积木右边是脚本区，你可以把积木拖到这里来搭建程序。再往右是<em>舞台</em>（stage），一只猫站在上面。舞台就是你的程序“活”起来的地方。
- Scratch 采用如下的坐标系：
  
  ![scratch coordinate system](https://cs50.harvard.edu/x/notes/0/cs50Week0Slide167.png)
  
  注意舞台的中心位于坐标 (0,0)。此刻，猫就在这个位置上。

## Hello World

- 首先，把“当绿旗被点击”积木拖到脚本区。然后，把 `say` 积木也拖到脚本区，接在前一个积木下面。
  
  ```scratch
  when green flag clicked
  say [hello, world]
  ```
  
  注意现在点击舞台上的绿旗，猫就会说：“hello, world”。
- 这很好地说明了我们之前讨论的关于编程的内容：
  
  ![scratch with black box](https://cs50.harvard.edu/x/notes/0/cs50Week0Slide172.png)
  
  注意输入 `hello, world` 被传给函数 `say`，该函数运行产生的<em>副作用</em>（side effect）就是猫说出 `hello, world`。

## Hello, You

- 我们可以让程序更有互动性，让猫对某个具体的人说 `hello`。把你的程序修改如下：
  
  ```scratch
  when green flag clicked
  ask [What's your name?] and wait
  say (join [hello,] (answer))
  ```
  
  注意当点击绿旗时，函数 `ask` 会运行。程序向你，也就是用户，提问 `What's your name?`，然后把这个名字存入一个叫做 `answer` 的<em>变量</em>（variable）中。接着程序把 `answer` 传给一个特殊的函数 `join`，它会把两段文本 `hello,` 和所提供的名字合并起来。`answer` 的值作为参数（argument）传给 `join`。这一整体再被传给 `say` 函数。猫会说 `Hello,` 和一个名字。现在你的程序有互动性了。
- 在整个课程中，你会向算法提供输入并得到输出。结合上面的程序，可以这样表示：
  
  ![scratch as algorithm](https://cs50.harvard.edu/x/notes/0/cs50Week0Slide169.png)
  
  注意输入 `hello,` 和 `answer` 被提供给 `join`，它返回 `hello, David`。这个返回值接着被传给 `say`，产生猫说话的<em>副作用</em>。
- 非常类似地，我们也可以把程序修改如下：
  
  ```scratch
  when green flag clicked
  ask [What's your name?] and wait
  speak (join [hello,] (answer))
  ```
  
  注意这个程序在点击绿旗时，把同样的变量与 `hello` 连接起来，传给一个叫做 `speak` 的函数。

## 喵、循环与抽象

- 与伪代码一样，<em>抽象</em>也是计算机编程中一项必不可少的技能和概念。
- 抽象就是把一个问题简化为越来越小的问题。
- 例如，如果你要为朋友们办一场盛大的晚宴，要做出整桌饭菜这个<em>问题</em>可能会让人不知所措！然而，如果你把做饭这件事分解成越来越小的任务（或问题），做出这顿美味大餐这个大任务似乎就没那么难了。
- 在编程中，甚至在 Scratch 里，我们都能看到抽象的作用。在你的脚本区，按如下方式编程：
  
  ```scratch
  when green flag clicked
  play sound (Meow v) until done
  wait (1) seconds
  play sound (Meow v) until done
  wait (1) seconds
  play sound (Meow v) until done
  ```
  
  注意你在一遍又一遍地做同样的事。事实上，如果你发现自己在反复编写相同的语句，那很可能意味着你可以编得更巧妙一些：把这些重复的代码抽象掉。
- 你可以把代码修改如下：
  
  ```scratch
  when green flag clicked
  repeat (3)
  play sound (Meow v) until done
  wait (1) seconds
  ```
  
  注意这个循环做的事和前一个程序完全一样。不过，通过把重复抽象成一个替我们<em>重复</em>执行代码的积木，问题被简化了。
- 我们还可以更进一步，使用 `define` 积木来创建你自己的积木（你自己的函数）！按如下方式编写代码：
  
  ```scratch
  define meow
  play sound (Meow v) until done
  wait (1) seconds
  
  when green flag clicked
  repeat (3)
  meow
  ```
  
  注意我们定义了自己的积木，叫做 `meow`。这个函数播放 `meow` 声音，然后等待一秒。在它下面你可以看到，当点击绿旗时，我们的 meow 函数被重复了三次。
- 我们甚至可以让这个函数接收一个输入 `n`，并重复相应的次数：
  
  ```scratch
  define meow n times
  repeat (n)
   play sound [meow v] until done
   wait (1) seconds
  ```
  
  注意 `n` 取自“meow n times”。`n` 通过 `define` 积木传给了 meow 函数。
- 总的来说，注意这种不断改进的过程是如何带来越来越好的代码设计的。此外，注意我们是如何创造出自己的算法来解决问题的。在本课程中，你会不断锻炼这两项技能。

## 条件

- <em>条件</em>是编程中必不可少的构件，程序据此检查某个特定条件是否满足。如果条件满足，程序就做某件事。
- 为了说明条件，按如下方式编写代码：
  
  ```scratch
  when green flag clicked
  forever
  if <touching (mouse-pointer v)?> then
  play sound (Meow v) until done
  ```
  
  注意这里用了 `forever` 积木，使 `if` 积木被一遍又一遍地触发，这样就能持续检查猫是否碰到了鼠标指针。
- 我们可以把程序修改如下，加入视频侦测：
  
  ```scratch
  when video motion > (10)
  play sound (Meow v) until done
  ```
- 记住，编程往往是一个反复试错的过程。如果你感到沮丧，花点时间自己跟自己把问题讲一遍。你现在要解决的具体问题是什么？哪些部分是正常的？哪些部分不正常？

## Oscartime

- <em>Oscartime</em> 是 David 自己做的 Scratch 程序之一，不过那段音乐可能会让他挥之不去，因为他在制作这个程序时听了太多个小时。花几分钟自己玩一玩 [Oscartime](https://scratch.mit.edu/projects/277537196) 这个游戏吧。
  
  嵌入的 Oscartime
  
  [https://scratch.mit.edu/projects/277537196/embed](https://scratch.mit.edu/projects/277537196/embed)
- 我们自己来做 Oscartime，首先添加路灯杆。
  
  ![oscartime interface](https://cs50.harvard.edu/x/notes/0/cs50Week0Scratch10.png)
- 然后，按如下方式编写代码：
  
  ```scratch
  when green flag clicked
  switch costume to (oscar1 v)
  forever
  if <touching (mouse-pointer v)?> then
  switch costume to (oscar2 v)
  else
  switch costume to (oscar1 v)
  ```
  
  注意把鼠标移到 Oscar 上，他的造型就会改变。你可以通过[查看这些代码积木](https://scratch.mit.edu/studios/50827060/)了解更多。
- 然后，把代码修改如下，做出一个下落的垃圾：
  
  ```scratch
  when green flag clicked
  set drag mode [draggable v]
  go to x: (pick random (0) to (240)) y: (180)
  forever
    change y by (-1)
  end
  ```
  
  注意垃圾的 y 轴位置总是从 180 开始，x 位置则是随机的。只要垃圾还在地面之上，它就每次下落 1 个像素。你可以通过[查看这些代码积木](https://scratch.mit.edu/projects/726782167)了解更多。
- 接下来，把代码修改如下，让垃圾可以被拖动。
  
  ```scratch
  when green flag clicked
  forever
    if <touching [Oscar v] ?> then
      go to x: (pick random (0) to (240)) y: (180)
    end
  end
  ```
  
  你可以通过[查看这些代码积木](https://scratch.mit.edu/projects/726780064)了解更多。
- 接下来，我们可以如下实现计分变量：
  
  ```scratch
  when green flag clicked
  set drag mode [draggable v]
  go to top
  forever
    change y by (-1)
  end
  ```
  
  ```scratch
  when green flag clicked
  forever
    if <touching [Oscar v] ?> then
      go to top
    end
  end
  ```
  
  ```scratch
  define go to top
    go to x: (pick random (0) to (240)) y: (180)
  ```
  
  你可以通过[查看这些代码积木](https://scratch.mit.edu/projects/726779570)了解更多。
- 去试玩完整的游戏 [Oscartime](https://scratch.mit.edu/projects/277537196) 吧。

## Ivy’s Hardest Game

- 离开 Oscartime，来看 Ivy’s Hardest Game，现在我们可以想一想如何在程序里实现移动。
- 我们的程序有三个主要部分。
- 首先，按如下方式编写代码：
  
  ```scratch
  when green flag clicked
  go to x: (0) y: (0)
  forever
  listen for keyboard
  feel for walls
  ```
  
  注意当点击绿旗时，我们的角色（sprite）移动到舞台中心，坐标为 (0,0)，然后永远监听键盘并检查是否碰到墙壁。
- 其次，添加这第二组代码积木：
  
  ```scratch
  define listen for keyboard
  if <key (up arrow v) pressed?> then
  change y by (1)
  end
  if <key (down arrow v) pressed?> then
  change y by (-1)
  end
  if <key (right arrow v) pressed?> then
  change x by (1)
  end
  if <key (left arrow v) pressed?> then
  change x by (-1)
  end
  ```
  
  注意我们创建了一个自定义的 `listen for keyboard` 脚本。键盘上的每个方向键都会让角色在屏幕上移动。
- 最后，添加这组代码积木：
  
  ```scratch
  define feel for walls
  if <touching (left wall v) ?> then
  change x by (1)
  end
  if <touching (right wall v) ?> then
  change x by (-1)
  end
  ```
  
  注意我们还有一个自定义的 `feel for walls` 脚本。当角色碰到墙壁时，会把它移回安全的位置，防止它走出屏幕。
- 你可以通过[查看这些代码积木](https://scratch.mit.edu/projects/577647301)了解更多。
- Scratch 允许屏幕上同时有许多角色。
- 再添加一个角色，把下面的代码积木加到你的程序中：
  
  ```scratch
  when green flag clicked
  go to x: (0) y: (0)
  point in direction (90)
  forever
  if <<touching (left wall v)?> or <touching (right wall v)?>> then
  turn right (180) degrees
  end
  move (1) steps
  end
  ```
  
  注意 Yale 角色来回移动，似乎在给 Harvard 角色添乱。它撞到墙就掉头，直到再次撞到墙。你可以通过[查看这些代码积木](https://scratch.mit.edu/projects/577647503)了解更多。
- 你甚至可以让一个角色跟随另一个角色。再添加一个角色，把下面的代码积木加到你的程序中：
  
  ```scratch
  when green flag clicked
  go to (random position v)
  forever
  point towards (Harvard v)
  move (1) steps
  ```
  
  注意 MIT 的标志现在似乎在跟着 Harvard 的标志到处跑。你可以通过[查看这些代码积木](https://scratch.mit.edu/projects/577647729)了解更多。
- 去试玩完整的游戏 [Ivy’s Hardest Game](https://scratch.mit.edu/projects/565742837) 吧。

## 小结

在这一课中，你了解了本课程在计算机科学和编程这个广阔世界中的位置。你学到了……

- 虽然 AI 能帮助消除人为瓶颈，但学习计算机科学的基础知识和编程的基本构件，会让你越来越好地运用新兴技术。
- 在本课程中，使用 AI 哪些方式是合理的，哪些是不合理的。
- 解决问题是计算机科学家工作的本质。
- 计算机如何理解和表示数字、文本、图像、音乐和视频。
- 编写伪代码这一基本的编程技能。
- 抽象将在你今后的课程学习中发挥怎样的作用。
- 编程的基本构件，包括函数、条件、循环和变量。
- 如何在 Scratch 中构建一个项目。

这就是 CS50！欢迎加入！下次见！
