# C$50 Finance

实现一个网站，用户可以在上面“买入”和“卖出”股票，大致如下图所示。

![C$50 Finance](https://cs50.harvard.edu/x/psets/9/finance/finance_2024.png)

## 背景

如果你不太清楚买卖股票（即公司的股份）是什么意思，请看[这里](https://www.investopedia.com/articles/basics/06/invest1000.asp)的教程。

你即将实现 C$50 Finance，这是一个可以管理股票投资组合的 web 应用。这个工具不仅能让你查询真实股票的价格和投资组合的价值，还能通过查询股票价格，让你买入（好吧，是“买入”）和卖出（好吧，是“卖出”）股票。

确实有一些工具（其中一个叫 IEX）可以让你通过它们的 API（application programming interface，应用程序编程接口）下载股票报价，使用的 URL 形如 `https://api.iex.cloud/v1/data/core/quote/nflx?token=API_KEY`。注意 Netflix 的股票代码（NFLX）就嵌在这个 URL 里；IEX 就是靠它知道该返回谁的数据。这个链接实际上不会返回任何数据，因为 IEX 要求你使用 API key，但如果它真的返回了，你会看到 JSON（JavaScript Object Notation）格式的响应，像这样：

```
{
  "avgTotalVolume":6787785,
  "calculationPrice":"tops",
  "change":1.46,
  "changePercent":0.00336,
  "close":null,
  "closeSource":"official",
  "closeTime":null,
  "companyName":"Netflix Inc.",
  "currency":"USD",
  "delayedPrice":null,
  "delayedPriceTime":null,
  "extendedChange":null,
  "extendedChangePercent":null,
  "extendedPrice":null,
  "extendedPriceTime":null,
  "high":null,
  "highSource":"IEX real time price",
  "highTime":1699626600947,
  "iexAskPrice":460.87,
  "iexAskSize":123,
  "iexBidPrice":435,
  "iexBidSize":100,
  "iexClose":436.61,
  "iexCloseTime":1699626704609,
  "iexLastUpdated":1699626704609,
  "iexMarketPercent":0.00864679844447232,
  "iexOpen":437.37,
  "iexOpenTime":1699626600859,
  "iexRealtimePrice":436.61,
  "iexRealtimeSize":5,
  "iexVolume":965,
  "lastTradeTime":1699626704609,
  "latestPrice":436.61,
  "latestSource":"IEX real time price",
  "latestTime":"9:31:44 AM",
  "latestUpdate":1699626704609,
  "latestVolume":null,
  "low":null,
  "lowSource":"IEX real time price",
  "lowTime":1699626634509,
  "marketCap":192892118443,
  "oddLotDelayedPrice":null,
  "oddLotDelayedPriceTime":null,
  "open":null,
  "openTime":null,
  "openSource":"official",
  "peRatio":43.57,
  "previousClose":435.15,
  "previousVolume":2735507,
  "primaryExchange":"NASDAQ",
  "symbol":"NFLX",
  "volume":null,
  "week52High":485,
  "week52Low":271.56,
  "ytdChange":0.4790450244167119,
  "isUSMarketOpen":true
}
```

注意，在花括号之间是一个用逗号分隔的键值对列表，每个键与它的值之间用冒号隔开。我们要用自己的股票数据库 API 做非常类似的事情。

现在让我们来获取这道题的发布代码吧！

## 开始

登录 [cs50.dev](https://cs50.dev/)，点击你的终端窗口，单独执行 `cd`。你应该会发现终端窗口的提示符如下所示：

```
$
```

接下来执行

```
wget https://cdn.cs50.net/2026/x/psets/9/finance.zip
```

以便把名为 `finance.zip` 的 ZIP 文件下载到你的 codespace 中。

然后执行

```
unzip finance.zip
```

创建一个名为 `finance` 的文件夹。你不再需要这个 ZIP 文件了，所以可以执行

```
rm finance.zip
```

并在提示处输入“y”再按 Enter，删除你下载的 ZIP 文件。

现在输入

```
cd finance
```

再按 Enter，进入（即打开）该目录。你的提示符现在应该如下所示。

```
finance/ $
```

单独执行 `ls`，你应该会看到几个文件和文件夹：

```
app.py  finance.db  helpers.py  requirements.txt  static/  templates/
```

如果遇到任何问题，请把这些步骤重新做一遍，看看能否找出哪里出了错！

### 运行

启动 Flask 内置的 web 服务器（在 `finance/` 内）：

```
$ flask run
```

访问 `flask` 输出的 URL，看看发布代码的运行效果。不过现在你还无法登录或注册！

在 `finance/` 内运行 `sqlite3 finance.db`，用 `sqlite3` 打开 `finance.db`。如果在 SQLite 提示符下运行 `.schema`，你会注意到 `finance.db` 自带一张名为 `users` 的表。看看它的结构（即 schema）。注意，默认情况下，新用户会获得 $10,000 现金。但如果你运行 `SELECT * FROM users;`，会发现里面（目前！）还没有任何用户（即行）可供浏览。

查看 `finance.db` 的另一种方式是使用一个叫 phpLiteAdmin 的程序。在 codespace 的文件浏览器中点击 `finance.db`，然后点击文字“Please visit the following link to authorize GitHub Preview”下方显示的链接。你应该会看到数据库本身的信息，以及一张表 `users`，就像你在 `sqlite3` 提示符下用 `.schema` 看到的那样。

### 理解代码

#### `app.py`

打开 `app.py`。文件顶部是一堆 import，其中有 CS50 的 SQL 模块和几个辅助函数。稍后会详细介绍。

配置完 [Flask](https://flask.palletsprojects.com/en/stable/) 之后，注意这个文件禁用了响应的缓存（前提是你处于调试模式，而在你的 code50 codespace 中默认就是如此），以免你修改了某个文件而浏览器没有察觉。接下来注意，它为 [Jinja](https://jinja.palletsprojects.com/en/3.1.x/) 配置了一个自定义的“过滤器（filter）”`usd`，这是一个（定义在 `helpers.py` 中的）函数，可以更方便地把数值格式化为美元（USD）。然后它进一步配置 Flask，把[会话（session）](https://flask.palletsprojects.com/en/1.1.x/quickstart/#sessions)存储在本地文件系统（即磁盘）上，而不是 Flask 默认的存储在（经过数字签名的）cookie 中。随后文件配置 CS50 的 SQL 模块使用 `finance.db`。

之后是一大堆路由，其中只有两个是完整实现的：`login` 和 `logout`。先通读 `login` 的实现。注意它使用（CS50 库中的）`db.execute` 来查询 `finance.db`。还要注意它使用 `check_password_hash` 来比较用户密码的哈希值。另外注意，`login` 是通过把用户的 `user_id`（一个 INTEGER）存入 `session` 来“记住”用户已登录的。这样，该文件中的任何路由都可以检查当前登录的是哪位用户（如果有的话）。最后，注意用户成功登录后，`login` 会重定向到 `"/"`，把用户带到他或她的主页。与此同时，注意 `logout` 只是清空 `session`，相当于让用户登出。

注意大多数路由都用 `@login_required`（同样是定义在 `helpers.py` 中的函数）“装饰”。这个装饰器确保：如果用户试图访问其中任何一个路由，会先被重定向到 `login` 去登录。

还要注意，大多数路由都支持 GET 和 POST。即便如此，它们中的大多数（目前！）只是返回一个“apology”（道歉页面），因为它们还没有实现。

#### `helpers.py`

接下来看看 `helpers.py`。啊，这里有 `apology` 的实现。注意它最终渲染一个模板 `apology.html`。它还在自己内部定义了另一个函数 `escape`，仅用来替换 apology 中的特殊字符。因为把 `escape` 定义在 `apology` 内部，我们就把前者的作用域限定在了后者之内；其他函数既无法（也不需要）调用它。

文件中的下一个是 `login_required`。如果这个有点难懂也不用担心，不过如果你曾好奇函数怎么能返回另一个函数，这里就是一个例子！

之后是 `lookup`，这个函数接受一个 `symbol`（例如 NFLX），返回某家公司的股票报价，形式是一个有三个键的 `dict`：`name`，其值为 `str`；`price`，其值为 `float`；以及 `symbol`，其值为 `str`，是股票代码的规范化（大写）版本，不管传入 `lookup` 时该代码是怎样的大小写。请注意，这些并不是“实时”价格，但它们确实会随时间变化，就像现实世界一样！

文件中最后是 `usd`，一个简短的函数，仅仅把 `float` 格式化为美元（例如 `1234.56` 会被格式化为 `$1,234.56`）。

#### `requirements.txt`

接下来快速看一下 `requirements.txt`。该文件只是规定了这个应用所依赖的包。

#### `static/`

也瞥一眼 `static/`，里面有 `styles.css`。一些初始的 CSS 就放在那里。你可以随意修改它。

#### `templates/`

现在看看 `templates/`。`login.html` 本质上只是一个 HTML 表单，用 [Bootstrap](https://getbootstrap.com/) 做了样式。而 `apology.html` 则是 apology 的模板。回忆一下，`helpers.py` 中的 `apology` 接受两个参数：`message`，它作为 `bottom` 的值传给 `render_template`；以及可选的 `code`，它作为 `top` 的值传给 `render_template`。注意在 `apology.html` 中这些值最终是如何使用的！而且[这就是原因](https://github.com/jacebrowning/memegen) 0:-)

最后是 `layout.html`。它比通常的模板大一些，不过主要是因为它带有一个漂亮的、适配移动端的“navbar”（导航栏），同样基于 Bootstrap。注意它定义了一个块 `main`，各个模板（包括 `apology.html` 和 `login.html`）都放在这个块里。它还支持 Flask 的[消息闪现（message flashing）](https://flask.palletsprojects.com/en/1.1.x/quickstart/#message-flashing)，这样你就可以把消息从一个路由传递给另一个路由，展示给用户看。

## 要求

### `register`

完成 `register` 的实现，使用户可以通过表单注册账号。

- 要求用户输入用户名，实现为一个 text 字段，其
  
  name
  
  为
  
  username
  
  。如果用户的输入为空，或者用户名已存在，则渲染一个 apology。
  
  - 注意，如果你试图 `INSERT` 一个重复的用户名，[`cs50.SQL.execute`](https://cs50.readthedocs.io/libraries/cs50/python/#cs50.SQL) 会抛出 `ValueError` 异常，因为我们在 `users.username` 上创建了 `UNIQUE INDEX`。因此，务必使用 `try` 和 `except` 来判断用户名是否已存在。
- 要求用户输入密码，实现为一个 `name` 为 `password` 的 text 字段，然后再次输入同一个密码，实现为一个 `name` 为 `confirmation` 的 text 字段。如果任一输入为空，或者两次密码不一致，则渲染一个 apology。
- 通过 `POST` 把用户的输入提交到 `/register`。
- 把新用户 `INSERT` 到 `users` 中，存储的是用户密码的哈希值，而不是密码本身。使用 [`generate_password_hash`](https://werkzeug.palletsprojects.com/en/2.3.x/utils/#werkzeug.security.generate_password_hash) 对用户的密码进行哈希。你很可能会想创建一个与 `login.html` 非常相似的新模板（例如 `register.html`）。

正确实现 `register` 之后，你应该就能注册账号并登录了（因为 `login` 和 `logout` 已经可以工作）！并且你应该能通过 phpLiteAdmin 或 `sqlite3` 看到你的那些行。

### `quote`

完成 `quote` 的实现，使用户可以查询某只股票的当前价格。

- 要求用户输入股票代码，实现为一个 `name` 为 `symbol` 的 text 字段。
- 通过 `POST` 把用户的输入提交到 `/quote`。
- 你很可能会想创建两个新模板（例如 `quote.html` 和 `quoted.html`）。当用户通过 GET 访问 `/quote` 时，渲染其中一个模板，里面应有一个通过 POST 提交到 `/quote` 的 HTML 表单。响应 POST 时，`quote` 可以渲染第二个模板，并在其中嵌入来自 `lookup` 的一个或多个值。

### `buy`

完成 `buy` 的实现，使用户可以买入股票。

- 要求用户输入股票代码，实现为一个 `name` 为 `symbol` 的 text 字段。如果输入为空，或者该代码不存在（根据 `lookup` 的返回值判断），则渲染一个 apology。
- 要求用户输入股数，实现为一个 `name` 为 `shares` 的 text 字段。如果输入不是正整数，则渲染一个 apology。
- 通过 `POST` 把用户的输入提交到 `/buy`。
- 完成后，把用户重定向到主页。
- 你很可能会想调用 `lookup` 来查询股票的当前价格。
- 你很可能会想从 `users` 中 `SELECT` 出用户当前有多少现金。
- 向
  
  finance.db
  
  中添加一张或多张新表，用来记录这次购买。要存储足够的信息，使你能知道谁在什么时间以什么价格买了什么。
  
  - 使用合适的 SQLite 类型。
  - 对任何应当唯一的字段定义 `UNIQUE` 索引。
  - 对任何你会用来搜索的字段（例如通过带 `WHERE` 的 `SELECT`）定义（非 `UNIQUE` 的）索引。
- 如果用户按当前价格买不起这么多股，则渲染一个 apology，且不要完成购买。
- 你不需要担心竞态条件（race condition），也不需要使用事务（transaction）。

正确实现 `buy` 之后，你应该能通过 phpLiteAdmin 或 `sqlite3` 在你的新表中看到用户的购买记录。

### `index`

完成 `index` 的实现，使其显示一张 HTML 表格，为当前登录的用户汇总：用户拥有哪些股票、各拥有多少股、每只股票的当前价格，以及每项持仓的总价值（即股数乘以价格）。同时显示用户当前的现金余额，以及总计（即股票总价值加上现金）。

- 你很可能需要执行多条 `SELECT`。根据你对表的实现方式，你可能会觉得 [GROUP BY](https://www.google.com/search?q=SQLite+GROUP+BY)、[HAVING](https://www.google.com/search?q=SQLite+HAVING)、[SUM](https://www.google.com/search?q=SQLite+SUM) 和/或 [WHERE](https://www.google.com/search?q=SQLite+WHERE) 很有用。
- 你很可能需要对每只股票调用 `lookup`。

### `sell`

完成 `sell` 的实现，使用户可以卖出（他或她所持有的）股票。

- 要求用户输入股票代码，实现为一个 `name` 为 `symbol` 的 `select` 菜单。如果用户没有选择股票，或者（提交之后，不知怎么回事）用户并不持有该股票的任何股份，则渲染一个 apology。
- 要求用户输入股数，实现为一个 `name` 为 `shares` 的 text 字段。如果输入不是正整数，或者用户并不持有这么多该股票的股份，则渲染一个 apology。
- 通过 `POST` 把用户的输入提交到 `/sell`。
- 完成后，把用户重定向到主页。
- 你不需要担心竞态条件（race condition），也不需要使用事务（transaction）。

### `history`

完成 `history` 的实现，使其显示一张 HTML 表格，汇总用户有史以来的所有交易，逐行列出每一笔买入和每一笔卖出。

- 每一行要清楚地表明是买入还是卖出，并包含股票代码、（买入或卖出的）价格、买入或卖出的股数，以及交易发生的日期和时间。
- 你可能需要修改你为 `buy` 创建的表，或者再增加一张表来补充。尽量减少冗余。

### 个性化功能

至少实现一项你自选的个性化功能：

- 允许用户修改密码。
- 允许用户向自己的账户添加额外现金。
- 允许用户直接在 `index` 页面上买入更多已有股票的股份或卖出股份，而不必手动输入股票代码。
- 实现其他规模相当的功能。

## 讲解视频

<!-- video: 7wPTAwT-6bA -->
[▶ 视频](https://www.youtube.com/watch?v=7wPTAwT-6bA)

## 测试

务必手动测试你的 web 应用，例如

- 注册一个新用户，并验证其投资组合页面加载出了正确的信息，
- 使用有效的股票代码请求报价，
- 多次买入同一只股票，验证投资组合显示的总计正确，
- 卖出某只股票的全部或部分股份，同样验证投资组合，以及
- 验证你的 history 页面显示了当前登录用户的所有交易。

还要测试一些意料之外的用法，例如

- 在只应输入数字的表单中输入字母字符串，
- 在只应输入正数的表单中输入零或负数，
- 在只应输入整数的表单中输入浮点数，
- 试图花掉比用户拥有的更多的现金，
- 试图卖出比用户拥有的更多的股份，
- 输入无效的股票代码，以及
- 在 SQL 查询中包含 `'` 和 `;` 这样潜在危险的字符。

你还可以点击每个页面页脚中的 <strong>I ♥ VALIDATOR</strong> 按钮来检查 HTML 的有效性，它会把你的 HTML 通过 POST 提交到 [validator.w3.org](https://validator.w3.org/)。

满意之后，要用 `check50` 测试你的代码，请执行下面的命令。

```
check50 cs50/problems/2026/x/finance
```

> 请注意，`check50` 会把你的整个程序作为一个整体来测试。如果你在完成所有必需的函数<strong>之前</strong>就运行它，它可能会对实际上正确、但依赖于其他函数的函数报告错误。

## 代码风格

```
style50 app.py
```

## 教学团队的解法

你可以随意为自己的应用设计不同的样式，不过教学团队的解法是这个样子的！

[https://finance.cs50.net/](https://finance.cs50.net/)

欢迎注册一个账号随便玩玩。<strong>不要</strong>使用你在其他网站上用过的密码。

查看教学团队的 HTML 和 CSS 是<strong>合理的</strong>。

## 提示

- 要把数值格式化为美元金额（保留两位小数的美分），可以在 Jinja 模板中使用 `usd` 过滤器（把值输出为 `{{ value | usd }}`，而不是 `{{ value }}`）。
- `cs50.SQL` 中有一个 `execute` 方法，它的第一个参数应是 SQL 的 `str`。如果该 `str` 中包含需要绑定值的问号参数，这些值可以作为额外的命名参数提供给 `execute`。`login` 的实现里就有这样的一个例子。`execute` 的返回值如下：
  
  - 如果 `str` 是 `SELECT`，那么 `execute` 返回由零个或多个 `dict` 对象组成的 `list`，其中的键和值分别代表表的字段和单元格。
  - 如果 `str` 是 `INSERT`，并且被插入数据的表包含自增的 `PRIMARY KEY`，那么 `execute` 返回新插入行的主键的值。
  - 如果 `str` 是 `DELETE` 或 `UPDATE`，那么 `execute` 返回被该语句删除或更新的行数。
- 记住，`cs50.SQL` 会把你通过 `execute` 执行的所有查询记录到终端窗口中（这样你就可以确认它们是否符合预期）。
- 调用 CS50 的 `execute` 方法时，务必使用问号绑定的参数（即 `named` 的 [paramstyle](https://www.python.org/dev/peps/pep-0249/#paramstyle)），形如 `WHERE ?`。<strong>不要</strong>使用 f-string、[`format`](https://docs.python.org/3/library/functions.html#format) 或 `+`（即字符串拼接），否则会有遭受 SQL 注入攻击的风险。
- 如果（且仅当）你已经熟悉 SQL，可以使用 [SQLAlchemy Core](https://docs.sqlalchemy.org/en/latest/index.html) 或 [Flask-SQLAlchemy](https://flask-sqlalchemy.readthedocs.io/en/stable/)（即 [SQLAlchemy ORM](https://docs.sqlalchemy.org/en/latest/index.html)）来代替 `cs50.SQL`。
- 记住，虽然你可以对 HTML 表单中输入的值进行验证，但精明的用户可能会绕过这些验证。务必同时在服务器端验证这些值。同样地，如果你在方案中选择使用 Javascript，请确保即使用户禁用了 Javascript，你的应用仍能正常工作。
- 你可以向 `static/` 中添加额外的静态文件。
- 如果在 `helpers.py` 中添加额外的函数，务必不要打开新的数据库连接。如果某个辅助函数需要使用数据库，请把它作为参数传入，而不是重新创建连接。
- 实现模板时，你很可能会想查阅 [Jinja 的文档](https://jinja.palletsprojects.com/en/3.1.x/)。
- 请别人试用你的网站（并试着触发错误）是<strong>合理的</strong>。
- 你可以修改这些网站的外观，例如通过
  
  - [bootswatch.com](https://bootswatch.com/)，
  - [getbootstrap.com/docs/5.1/content](https://getbootstrap.com/docs/5.1/content/)，
  - [getbootstrap.com/docs/5.1/components](https://getbootstrap.com/docs/5.1/components/)，和/或
  - [memegen.link](https://memegen.link/)。
- 你可能会发现 [Flask 的文档](https://flask.palletsprojects.com/en/1.1.x/quickstart/)和 [Jinja 的文档](https://jinja.palletsprojects.com/en/2.11.x/templates/)很有帮助！

## 常见问题

### ImportError: No module named ‘application’

默认情况下，`flask` 会在你当前工作目录中查找名为 `app.py` 的文件（因为我们已把环境变量 `FLASK_APP` 的值配置为 `app.py`）。如果看到这个错误，很可能是你在错误的目录下运行了 `flask`！

### OSError: [Errno 98] Address already in use

如果运行 `flask` 时看到这个错误，很可能是你（仍然）在另一个标签页中运行着 `flask`。启动 `flask` 之前，务必先终止那个进程，例如按 ctrl-c。如果你没有这样的其他标签页，请执行 `fuser -k 8080/tcp`，终止所有（仍然）在监听 TCP 8080 端口的进程。

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/finance
```

> ### 为什么我的提交通过了 check50，但运行 submit50 之后在 Gradebook 中显示“No results”？
> 
> 在某些情况下，`submit50` 可能不会给作业评分，原因可能是：(1) 你的 `app.py` 文件格式不一致，和/或 (2) 随习题集一起提交了多余的、不需要的文件。要解决这些问题，请在 `finance` 文件夹中运行 `style50 app.py`，并处理其中暴露的所有问题。接着，检查你的 `finance` 文件夹的内容，删除多余的文件，例如 flask 会话文件，或其他不属于你对该习题集实现的文件。此外，再次运行 `check50`，确保你的提交仍然能正常工作。最后，再次运行上面的 `submit50` 命令。你的结果会在几分钟内出现在你的 [Gradebook](https://cs50.me/cs50x) 中。
> 
> 请注意，如果在你的 [Gradebook](https://cs50.me/cs50x) 的 `submissions` 区域里，你的 finance 提交旁边有一个数字分数，那么上面讨论的流程不适用于你。很可能是你还没有完全满足习题集的要求，应当借助 `check50` 来找出还有哪些工作没做。
