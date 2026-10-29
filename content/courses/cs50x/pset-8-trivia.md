# Trivia

编写一个网页，让用户回答问答题（trivia）。

![screenshot of trivia questions](https://cs50.harvard.edu/x/psets/8/trivia/questions.png)

## 开始

打开 [cs50.dev](https://cs50.dev)。

先点击终端窗口内部，然后单独执行 `cd`。你应该会发现它的“提示符”如下所示。

```
$
```

点击该终端窗口内部，然后执行

```
wget https://cdn.cs50.net/2025/fall/psets/8/trivia.zip
```

再按 Enter，把名为 `trivia.zip` 的 ZIP 文件下载到你的 codespace 中。注意不要漏掉 `wget` 与后面 URL 之间的空格，也不要漏掉其他任何字符！

现在执行

```
unzip trivia.zip
```

创建一个名为 `trivia` 的文件夹。你不再需要这个 ZIP 文件了，所以可以执行

```
rm trivia.zip
```

并在提示处输入“y”再按 Enter，删除你下载的 ZIP 文件。

现在输入

```
cd trivia
```

再按 Enter，进入（即打开）该目录。你的提示符现在应该如下所示。

```
trivia/ $
```

如果一切顺利，执行

```
ls
```

你应该会看到一个 `index.html` 文件和一个 `styles.css` 文件。

如果遇到任何问题，请把这些步骤重新做一遍，看看能否找出哪里出了错！

## 实现细节

使用 HTML、CSS 和 JavaScript 设计一个网页，让用户回答问答题。

- 在
  
  index.html
  
  中，用 HTML 在“Part 1”下面添加一道你自选的选择题。
  
  - 问题的文字应使用 `h3` 标题。
  - 每个可选答案应对应一个 `button`。至少要有三个选项，其中恰好有一个是正确的。
- 使用 JavaScript 添加逻辑，让用户点击按钮时按钮会变色。
  
  - 如果用户点击了错误答案的按钮，该按钮应变为红色，并且问题下方应出现文字“Incorrect”。
  - 如果用户点击了正确答案的按钮，该按钮应变为绿色，并且问题下方应出现文字“Correct!”。
- 在
  
  index.html
  
  中，用 HTML 在“Part 2”下面添加一道你自选的、需要输入文字作答的简答题。
  
  - 问题的文字应使用 `h3` 标题。
  - 应使用 `input` 字段让用户输入答案。
  - 应使用 `button` 让用户确认自己的答案。
- 使用 JavaScript 添加逻辑，让用户确认答案时文本框会变色。
  
  - 如果用户输入了错误答案并按下确认按钮，文本框应变为红色，并且问题下方应出现文字“Incorrect”。
  - 如果用户输入了正确答案并按下确认按钮，输入框应变为绿色，并且问题下方应出现文字“Correct!”。

你还可以选做：

- 编辑 `styles.css`，修改网页的 CSS！
- 如果愿意，可以为你的问答测验添加更多问题！

### 讲解视频

> 这段视频录制时，课程还在使用 CS50 IDE 来写代码。虽然界面可能与你的 codespace 不同，但两种环境的行为应该基本相似！

[https://video.cs50.io/WGd0Jx7rxUo](https://video.cs50.io/WGd0Jx7rxUo)

### 提示

- 使用 [`document.querySelector`](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector) 查询单个 HTML 元素。
- 使用 [`document.querySelectorAll`](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll) 查询所有符合条件的多个 HTML 元素。该函数返回一个包含所有匹配元素的数组。

<details markdown="1"><summary>不知道怎么解？</summary>

</details>

### 测试

这道题没有 `check50`，因为实现会随你出的问题而不同！但一定要对每道题分别测试错误和正确的回答，确保你的网页响应正确。

在你的 `trivia` 目录下，于终端中运行 `http-server`，启动一个提供你网页的 web 服务器。

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/trivia
```

想看教学团队的解法吗？这里有两种解决这道题的方法！

<details markdown="1"><summary>用 JavaScript 创建事件监听器</summary>

```
<!DOCTYPE html>

<html lang="en">
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500&display=swap" rel="stylesheet">
        <link href="styles.css" rel="stylesheet">
        <title>Trivia!</title>
        <script>

            // Wait for DOM content to load
            document.addEventListener('DOMContentLoaded', function() {

                // Get all elements with class "correct"
                let corrects = document.querySelectorAll('.correct');

                // Add event listeners to each correct button
                for (let i = 0; i < corrects.length; i++) {
                    corrects[i].addEventListener('click', function() {

                        // Set background color to green
                        corrects[i].style.backgroundColor = 'Green';

                        // Go to parent element of correct button and find the first element with class "feedback" which has that parent
                        corrects[i].parentElement.querySelector('.feedback').innerHTML = 'Correct!';
                    });
                }

                // When any incorrect answer is clicked, change color to red.
                let incorrects = document.querySelectorAll(".incorrect");
                for (let i = 0; i < incorrects.length; i++) {
                    incorrects[i].addEventListener('click', function() {

                        // Set background color to green
                        incorrects[i].style.backgroundColor = 'Red';

                        // Go to parent element of correct button and find the first element with class "feedback" which has that parent
                        incorrects[i].parentElement.querySelector('.feedback').innerHTML = 'Incorrect';
                    });
                }

                // Check free response submission
                document.querySelector('#check').addEventListener('click', function() {
                    let input = document.querySelector('input');
                    if (input.value === 'Switzerland') {
                        input.style.backgroundColor = 'green';
                        input.parentElement.querySelector('.feedback').innerHTML = 'Correct!';
                    }
                    else {
                        input.style.backgroundColor = 'red';
                        input.parentElement.querySelector('.feedback').innerHTML = 'Incorrect';
                    }
                });
            });
        </script>
    </head>
    <body>
        <div class="header">
            <h1>Trivia!</h1>
        </div>

        <div class="container">
            <div class="section">
                <h2>Part 1: Multiple Choice </h2>
                <hr>
                <h3>What is the approximate ratio of people to sheep in New Zealand?</h3>
                <button class="incorrect">6 people per 1 sheep</button>
                <button class="incorrect">3 people per 1 sheep</button>
                <button class="incorrect">1 person per 1 sheep</button>
                <button class="incorrect">1 person per 3 sheep</button>
                <button class="correct">1 person per 6 sheep</button>
                <p class="feedback"></p>
            </div>

            <div class="section">
                <h2>Part 2: Free Response</h2>
                <hr>
                <h3>In which country is it illegal to own only one guinea pig, as a lone guinea pig might get lonely?</h3>
                <input type="text"></input>
                <button id="check">Check Answer</button>
                <p class="feedback"></p>
            </div>
        </div>
    </body>
</html>
```

</details>

<details markdown="1"><summary>用 HTML 创建事件监听器</summary>

```
<!DOCTYPE html>

<html lang="en">
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500&display=swap" rel="stylesheet">
        <link href="styles.css" rel="stylesheet">
        <title>Trivia!</title>
        <script>
            function checkMultiChoice(event) {

                // Get the element which triggered the event
                let button = event.target;

                // Check if the element's inner HTML matches expected answer
                if (button.innerHTML == '1 person per 6 sheep') {
                    button.style.backgroundColor = 'Green';
                    button.parentElement.querySelector('.feedback').innerHTML = 'Correct!';
                }
                else {
                    button.style.backgroundColor = 'Red';
                    button.parentElement.querySelector('.feedback').innerHTML = 'Incorrect';
                }
            }

            function checkFreeResponse(event) {

                // Get the element which triggered the event
                let button = event.target;

                // Get the input element corresponding to the button
                let input = button.parentElement.querySelector('input');

                // Check for correct answer
                if (input.value === 'Switzerland') {
                    input.style.backgroundColor = 'Green';
                    input.parentElement.querySelector('.feedback').innerHTML = 'Correct!';
                }
                else {
                    input.style.backgroundColor = 'Red';
                    input.parentElement.querySelector('.feedback').innerHTML = 'Incorrect';
                }
            }
        </script>
    </head>
    <body>
        <div class="header">
            <h1>Trivia!</h1>
        </div>

        <div class="container">
            <div class="section">
                <h2>Part 1: Multiple Choice </h2>
                <hr>
                <h3>What is the approximate ratio of people to sheep in New Zealand?</h3>
                <button onclick="checkMultiChoice(event)">6 people per 1 sheep</button>
                <button onclick="checkMultiChoice(event)">3 people per 1 sheep</button>
                <button onclick="checkMultiChoice(event)">1 person per 1 sheep</button>
                <button onclick="checkMultiChoice(event)">1 person per 3 sheep</button>
                <button onclick="checkMultiChoice(event)">1 person per 6 sheep</button>
                <p class="feedback"></p>
            </div>

            <div class="section">
                <h2>Part 2: Free Response</h2>
                <hr>
                <h3>In which country is it illegal to own only one guinea pig, as a lone guinea pig might get lonely?</h3>
                <input type="text"></input>
                <button onclick="checkFreeResponse(event)">Check Answer</button>
                <p class="feedback"></p>
            </div>
        </div>
    </body>
</html>
```

</details>
