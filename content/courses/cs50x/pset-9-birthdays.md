# Birthdays

![screenshot of birthdays website](https://cs50.harvard.edu/x/psets/9/birthdays/birthdays.png)

## 要解决的问题

创建一个 web 应用，用来记录朋友们的生日。

## 开始

<details markdown="1"><summary>下载发布代码</summary>

打开 [cs50.dev](https://cs50.dev/)。

先点击终端窗口内部，然后单独执行 `cd`。你应该会发现它的“提示符”如下所示。

```
$
```

点击该终端窗口内部，然后执行

```
wget https://cdn.cs50.net/2026/x/psets/9/birthdays.zip
```

再按 Enter，把名为 `birthdays.zip` 的 ZIP 文件下载到你的 codespace 中。注意不要漏掉 `wget` 与后面 URL 之间的空格，也不要漏掉其他任何字符！

现在执行

```
unzip birthdays.zip
```

创建一个名为 `birthdays` 的文件夹。你不再需要这个 ZIP 文件了，所以可以执行

```
rm birthdays.zip
```

并在提示处输入“y”再按 Enter，删除你下载的 ZIP 文件。

现在输入

```
cd birthdays
```

再按 Enter，进入（即打开）该目录。你的提示符现在应该如下所示。

```
birthdays/ $
```

如果一切顺利，执行

```
ls
```

你应该会看到下列文件和文件夹：

```
app.py  birthdays.db  static/  templates/
```

如果遇到任何问题，请把这些步骤重新做一遍，看看能否找出哪里出了错！

</details>

## 理解代码

在 `app.py` 中，你会看到一个 Flask web 应用的雏形。这个应用有一个路由（`/`），同时接受 `POST` 请求（在 `if` 之后）和 `GET` 请求（在 `else` 之后）。目前，当通过 `GET` 请求 `/` 路由时，会渲染 `index.html` 模板。当通过 `POST` 请求 `/` 路由时，用户会通过 `GET` 被重定向回 `/`。

`birthdays.db` 是一个 SQLite 数据库，里面有一张表 `birthdays`，包含四列：`id`、`name`、`month` 和 `day`。表里已经有几行数据，不过最终你的 web 应用将支持向这张表插入新行！

`static` 目录中有一个 `styles.css` 文件，里面是这个 web 应用的 CSS 代码。不需要编辑这个文件，不过你想改也可以！

`templates` 目录中有一个 `index.html` 文件，当用户查看你的 web 应用时就会渲染它。

## 实现细节

完成这个 web 应用的实现，让用户可以存储并记录生日。

- 当通过
  
  GET
  
  请求
  
  /
  
  路由时，你的 web 应用应该用一张表格显示数据库中所有的人及其生日。
  
  - 首先，在 `app.py` 的 `GET` 请求处理中添加逻辑，查询 `birthdays.db` 数据库中的所有生日，并把全部数据传给你的 `index.html` 模板。
  - 然后，在 `index.html` 中添加逻辑，把每个生日渲染为表格中的一行。每一行应有两列：一列是此人的姓名，另一列是此人的生日。
- 当通过
  
  POST
  
  请求
  
  /
  
  路由时，你的 web 应用应该向数据库中添加一个新的生日，然后重新渲染首页。
  
  - 首先，在 `index.html` 中添加一个 HTML 表单。该表单应让用户输入姓名、生日的月份和生日的日期。务必让表单提交到 `/`（即它的“action”），方法（method）为 `post`。
  - 然后，在 `app.py` 的 `POST` 请求处理中添加逻辑，根据用户提交的数据，向 `birthdays` 表中 `INSERT` 一个新行。

你还可以选做：

- 添加删除和/或编辑生日条目的功能。
- 添加你自选的任何其他功能！

## 提示

<details markdown="1"><summary>创建一个供用户提交生日的表单</summary>

在 `index.html` 中，注意下面这个 TODO：

```
<!-- TODO: Create a form for users to submit a name, a month, and a day -->
```

回忆一下，要创建表单，可以使用 `form` HTML 元素。你可以用下面的开始和结束标签创建一个 `form` HTML 元素：

```
<form>
</form>
```

当然，表单还需要输入字段（以及一个供用户提交表单的按钮！）。回忆一下，HTML 的 `input` 元素可以在表单中创建输入框等控件。你可以指定它们的 `type` 属性，让它们接受 `text` 或 `number`。同时也要给 `input` 元素加上 `name` 属性，以便区分它们。

```
<form>
    <input name="name" type="text">
    <input name="month" type="number">
    <input name="day" type="number">
</form>
```

你的表单可能需要一个按钮，供用户点击来提交数据。添加一个 `submit` 类型的 `input` 元素，就可以做到。如果希望按钮本身带有说明文字，可以试试设置 `value` 属性。

```
<form>
    <input name="name" type="text">
    <input name="month" type="number">
    <input name="day" type="number">
    <input type="submit" value="Add Birthday">
</form>
```

用户的数据会提交到哪里呢？目前哪里也不会去！回忆一下，你可以指定表单的 `action` 属性，来决定表单提交之后应该请求哪个路由。表单数据会随着产生的请求一起提交。`method` 属性则指定提交表单时使用哪种 HTTP 请求方法。

```
<form action="/" method="post">
    <input name="name" type="text">
    <input name="month" type="number">
    <input name="day" type="number">
    <input type="submit" value="Add Birthday">
</form>
```

这样一来，你的表单应该就能正常工作了，不过还可以再改进！考虑加上 `placeholder` 值来美化一下：

```
<form action="/" method="post">
    <input name="name" placeholder="Name" type="text">
    <input name="month" placeholder="Month" type="number">
    <input name="day" placeholder="Day" type="number">
    <input type="submit" value="Add Birthday">
</form>
```

还可以考虑添加一些<em>客户端验证（client-side validation）</em>，确保用户按照表单的意图填写。例如，`number` 类型的 `input` 字段还可以指定 `min` 和 `max` 属性，用来限定用户可以输入的最小值和最大值。

```
<form action="/" method="post">
    <input name="name" placeholder="Name" type="text">
    <input name="month" placeholder="Month" type="number" min="1" max="12">
    <input name="day" placeholder="Day" type="number" min="1" max="31">
    <input type="submit" value="Add Birthday">
</form>
```

</details>

<details markdown="1"><summary>把用户提交的表单内容添加到数据库</summary>

在 `app.py` 中，注意下面这个 TODO：

```
# TODO: Add the user's entry into the database
```

回忆一下，Flask 提供了一些方便的方法来访问通过 `POST` 提交的表单数据！具体来说：

```
# Access form data
request.form.get(NAME)
```

其中 `NAME` 指的是提交了数据的那个 `input` 元素的 `name` 属性。如果你的 `input` 元素分别命名为 `name`、`month` 和 `day`，就可以用下面的方式分别访问（并保存！）它们的值：

```
# Access form data
name = request.form.get("name")
month = request.form.get("month")
day = request.form.get("day")
```

现在，用户在 `name`、`month` 和 `day` 这几个 input 元素中提交的值，就作为 Python 变量供你使用了。

下一步是把这些值添加到数据库中！多亏了这一行

```
db = SQL("sqlite:///birthdays.db")
```

`app.py` 已经以 `db` 为名建立了与 `birthdays.db` 的连接。现在你可以通过调用 `db.execute` 并传入合法的 SQL 查询来执行 SQL 语句。如果想添加 Carter 的生日（1 月 1 日），你可能会运行下面这条 SQL 语句：

```
INSERT INTO birthdays (name, month, day) VALUES('Carter', 1, 1);
```

让 `app.py` 运行同样的查询，只不过要插入的值换成占位符，如下所示：

```
# Access form data
name = request.form.get("name")
month = request.form.get("month")
day = request.form.get("day")

# Insert data into database
db.execute("INSERT INTO birthdays (name, month, day) VALUES(?, ?, ?)", name, month, day)
```

这样就行了！试着提交表单，然后打开 `birthdays.db`，用 `SELECT` 查询查看 `birthdays` 表的内容。你应该能看到刚刚提交的表单数据。

当你创建更复杂的应用时，还需要添加<em>服务器端验证（server-side validation）</em>：也就是说，在做其他任何事情<em>之前</em>，先检查用户的数据是否有效！你可能做的第一项验证，就是检查用户到底有没有提交数据！如果你用 `request.form.get` 获取表单数据，而用户没有提交任何内容，`request.form.get` 会返回空字符串。你可以像下面这样在 Python 中检查这个值：

```
# Access form data
name = request.form.get("name")
if not name:
    return redirect("/")

month = request.form.get("month")
if not month:
    return redirect("/")

day = request.form.get("day")
if not day:
    return redirect("/")

# Insert data into database
db.execute("INSERT INTO birthdays (name, month, day) VALUES(?, ?, ?)", name, month, day)
```

现在，只有确定用户提供了你需要的全部数据后，才会插入一行。

还有一些地方可能出错！如果用户提供的 `month` 或 `day` 实际上不是数字怎么办？一种检查方法是 `try` 用 `int` 把该值转换成整数，如果转换失败，就把用户重定向回首页。

```
# Access form data
name = request.form.get("name")
if not name:
    return redirect("/")

month = request.form.get("month")
if not month:
    return redirect("/")
try:
    month = int(month)
except ValueError:
    return redirect("/")

day = request.form.get("day")
if not day:
    return redirect("/")
try:
    day = int(day)
except ValueError:
    return redirect("/")

# Insert data into database
db.execute("INSERT INTO birthdays (name, month, day) VALUES(?, ?, ?)", name, month, day)
```

而且即使用户输入的是数字，最好也检查一下它是否在正确的范围内！

```
# Access form data
name = request.form.get("name")
if not name:
    return redirect("/")

month = request.form.get("month")
if not month:
    return redirect("/")
try:
    month = int(month)
except ValueError:
    return redirect("/")
if month < 1 or month > 12:
    return redirect("/")

day = request.form.get("day")
if not day:
    return redirect("/")
try:
    day = int(day)
except ValueError:
    return redirect("/")
if day < 1 or day > 31:
    return redirect("/")

# Insert data into database
db.execute("INSERT INTO birthdays (name, month, day) VALUES(?, ?, ?)", name, month, day)
```

</details>

<details markdown="1"><summary>渲染 `birthdays.db` 中的生日</summary>

一旦用户可以提交生日并把它们存入 `birthdays.db`，你的下一个任务就是确保这些生日在 `index.html` 中渲染出来。

首先，你需要从 `birthdays.db` 中获取所有生日。你可以用下面这条 SQL 查询来做到：

```
SELECT * FROM birthdays;
```

请看 `app.py` 中的下面这个 TODO：

```
# TODO: Display the entries in the database on index.html
```

考虑让 `app.py` 在每次用 `GET` 请求加载页面时，都运行这条 SQL 查询：

```
# Query for all birthdays
birthdays = db.execute("SELECT * FROM birthdays")
```

现在，`birthdays.db` 的 `birthdays` 表中的所有生日，都可以通过名为 `birthdays` 的 Python 变量使用了。具体来说，SQL 查询的结果被存储为一个由字典组成的列表。每个字典代表查询返回的一行，字典中的每个键对应 `birthdays` 表的一个列名（即“name”、“month”和“day”）。

要在 `index.html` 中渲染这些生日，可以借助 Flask 的 `render_template` 函数。你可以指定用 `birthdays` 变量来渲染 `index.html`：给它传一个同样叫 `birthdays` 的关键字参数，并让它等于你刚刚创建的 `birthdays` 变量。

```
# Query for all birthdays
birthdays = db.execute("SELECT * FROM birthdays")

# Render birthdays page
return render_template("index.html", birthdays=birthdays)
```

需要说明的是，`=` 左边的名字 `birthdays`，就是你在 `index.html` 内部访问生日数据时所用的名字。

现在 `index.html` 渲染时已经能访问生日数据了，你可以用 Jinja 来正确地渲染这些数据。Jinja 和 Python 一样，可以遍历列表中的元素。而且和 Python 一样，Jinja 也可以通过键来访问字典中的元素。在这里，Jinja 的写法是：字典的名字，后面跟一个 `.`，再跟要访问的键的名字。

```
{% for birthday in birthdays %}
    <tr>
        <td>{{ birthday.name }}</td>
        <td>{{ birthday.month }}/{{ birthday.day }}</td>
    </tr>
{% endfor %}
```

就这样！试着重新加载页面，看看渲染出来的生日。

</details>

### 讲解视频

> 这段视频录制时，课程还在使用 CS50 IDE 来写代码。虽然界面可能与你的 codespace 不同，但两种环境的行为应该基本相似！

[https://video.cs50.io/HXwvj8x1Fcs](https://video.cs50.io/HXwvj8x1Fcs)

<details markdown="1"><summary>不知道怎么解？</summary>

</details>

### 测试

这个习题集没有 `check50`！但一定要测试你的 web 应用：添加一些生日，确保数据按预期出现在你的表格中。

在你的 `birthdays` 目录下，于终端中运行 `flask run`，启动一个提供你的 Flask 应用的 web 服务器。

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/birthdays
```
