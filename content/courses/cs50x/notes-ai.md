# 人工智能

## 欢迎！

- 在计算机科学和编程圈子里，<em>橡皮鸭调试</em>（<em>rubber ducking</em> 或 <em>rubber duck debugging</em>）指的是对着一个无生命的物体说话，把一个棘手的问题（比如代码里的 bug）<em>讲一遍</em>。
- 最近，CS50 在 [CS50.ai](https://cs50.ai) 上做了我们自己的橡皮鸭调试器，它用人工智能（AI）与学生互动，帮助他们解决自己遇到的难题。
- 使用这个工具的学生，可以开始体会 AI 能为世界带来什么。

## 生成式人工智能

- 许多 AI 工具使人工生成的图像有可能进入现实世界。
- 在前几年，这些工具生成的图像大多有不少破绽，旁观者可以据此看出图像是 AI 生成的。
- 然而，这些工具生成图像的能力正变得越来越强。
- 事实上，随着技术进步，很快就几乎（甚至完全）不可能用肉眼分辨出这类图像了。
- 生成式 AI 可以用来创作照片、视频、音乐和文本。

## 提示工程与 Copilot

- <em>提示工程（prompt engineering）</em>指的是一个人向 AI 提出好问题的方法。
- 我们用<em>系统提示（system prompt）</em>来教 AI 如何与用户交互。我们正是用这样的提示来教 AI 如何与学生合作的。
- <em>用户提示（user prompt）</em>是用户为了与 AI 交互而提供的提示。学生通过这些提示与 AI 互动。
- 我们可以用代码实现如下：
  
  chat3.py
  
  ```
  # Adds to system prompt.
  
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
  
  你可以用 `python chat.py` 运行这段代码。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/ai/src/chat3.py?download)下载这段代码。
- 生成式 AI 还可以用来生成代码！这类功能可以放大你作为一名不断成长、勤于练习的程序员的能力。
- Copilot 就是这样一种生成代码的工具。在 CS50 中，除课程自带的工具外，我们不允许使用生成式 AI。CS50 在我们的[学术诚信](https://cs50.harvard.edu/x/honesty/)政策中，为学生清楚说明了哪些 AI 用法算<em>合理</em>，哪些算<em>不合理</em>。

## AI

- AI 已经陪伴我们几十年了！软件早就在不断适应用户。算法会在垃圾邮件、手写识别、电影和视频推荐，以及玩游戏中寻找模式。
- 例如在游戏中，一步一步的指令就可以让电脑对手玩打砖块（Breakout）。

## 决策树

- 算法用<em>决策树（decision tree）</em>来决定做出什么决策。
- 例如在打砖块中，算法可以根据代码中的指令来考虑做出什么选择：
  
  ```
  While game is ongoing:
    If ball is left of paddle:
      Move paddle left
    Else if ball is right of paddle:
      Move paddle right
    Else:
      Don't move paddle
  ```
- 大多数游戏都会尽量减少所需的计算量，以便与玩家对抗。

## 极小极大算法

- AI 通常擅长玩游戏，因为它把走法和结果都化简成了数值。
- 你可以想象，算法会把结果分别打成正分、负分和零分。
- 在井字棋中，AI 可能把电脑获胜的棋盘看作 `1`，把电脑落败的棋盘看作 `-1`。
- 你可以想象，电脑会查看一棵由各种可能结果构成的决策树，并给每一种可能的走法打分。
- 电脑会通过让自己的得分最大化来争取获胜。
- 在井字棋的场景中，算法可以这样理解：
  
  ```
  If player is X:
    For each possible move:
      Calculate score for board
    Choose move with highest score
  
  Else if player is O:
      For each possible move:
          Calculate score for board
      Choose move with lowest score
  ```
- 可以用下图来表示：
  
  ![tictactoe with outcomes as 1 or -1 or 0](https://cs50.harvard.edu/x/notes/ai/cs50AiLectureSlide132.png)
- 由于计算机非常强大，它们能处理海量的可能结果。然而，我们口袋里或桌面上的计算机，未必能对越来越复杂的博弈树计算数万亿种选择。这时机器学习就能帮上忙。

## 机器学习

- 机器学习是计算机通过强化来学习的一种方式。
- 计算机可以学会如何翻煎饼。
- 计算机可以学会如何玩“地板是熔岩”游戏。
- 计算机一次又一次地反复试验，从而发现哪些行为应该重复，哪些不该重复。
- 在许多基于 AI 的算法里，都有<em>探索与利用（explore vs. exploit）</em>的概念：AI 可能会随机尝试一些看起来未必最优的做法。随机性可以带来更好的结果。用代码可以表示如下：
  
  ```
  epsilon = 0.10
  
  If random() < epsilon:
      Make a random move
  Else: 
      Make the move with the highest value
  ```
  
  注意，`epsilon` 表示随机的概率。

## 深度学习

- <em>监督学习（supervised learning）</em>是一种由人类与 AI 配合的学习方式。例如，你在邮件客户端里点击“垃圾邮件”按钮，就是在教 AI 哪些邮件应该被视为垃圾邮件。
- 然而，监督学习很难扩展到更大的问题上。因此，<em>无监督学习（unsupervised learning）</em>就成了让 AI 在极少人为干预下学习的一种手段。
- <em>深度学习（deep learning）</em>使用神经网络，在其中探索问题与解答。
- 例如，深度学习可能试图预测图上某个位置会出现蓝点还是红点。请看下面这张图：
  
  ![blue dots and red dots separated by a line](https://cs50.harvard.edu/x/notes/ai/cs50AiLectureSlide208.png)
- 已有的训练数据被用来预测结果。此外，AI 还可以自己生成更多训练数据，以发现更多模式。
- 深度学习会创建节点（如下图所示），把输入和输出关联起来。
  
  ![Nodes connected to nodes](https://cs50.harvard.edu/x/notes/ai/cs50AiLectureSlide210.png)

## 大语言模型

- <em>大语言模型（large language model，LLM）</em>是基于海量训练做出预测的庞大模型。
- 就在几年前，AI 还不太擅长补全和生成句子。Google 在 2017 年发表了一篇论文，讲的是如何让这些 AI 的<em>注意力（attention）</em>集中到各个词之间的关系上。
- 生成式预训练 Transformer（Generative Pre-trained Transformer，简称 GPT）是在词与词之间的关系上训练出来的。
- AI 把词编码成<em>嵌入（embedding）</em>，以找出词与词之间的关系。因此，经过海量训练，一个庞大的神经网络就能预测词与词之间的关联，这使得生成式 AI 能够生成内容，甚至与用户对话。
- 有时，LLM 会<em>幻觉（hallucinate）</em>，给出不正确的信息。

## 小结

在这一讲中，你了解了 [CS50.ai](https://CS50.ai) 背后的一些技术。具体来说，我们讨论了……

- 生成式人工智能
- 提示工程
- AI
- 决策树
- 极小极大算法
- 机器学习
- 深度学习
- 大语言模型

这就是 CS50！
