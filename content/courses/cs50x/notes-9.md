# 第 9 讲

## 欢迎！

- 前几周，你学了许多种编程语言、技巧和策略。
- 事实上，这门课与其说是一门 <em>C 语言课</em>或 <em>Python 课</em>，不如说是一门<em>编程课</em>，这样你才能跟上未来的趋势。
- 在过去这几周里，你学会了如何<em>学习</em>编程。
- 今天，我们将从 HTML 和 CSS 出发，把 HTML、CSS、SQL、Python 和 JavaScript 结合起来，让你能创建自己的 Web 应用。
- 你可以考虑用这一周学到的技能来做你的期末项目。

## http-server

- 到目前为止，你见过的所有 HTML 都是事先写好的、静态的。
- 过去，当你访问一个页面时，浏览器会下载一个 HTML 页面，然后你就能查看它。这类页面被称为<em>静态</em>页面，因为 HTML 里编写的内容，就恰好是用户看到的、并下载到<em>客户端</em>浏览器里的内容。
- 动态页面指的是 Python 及类似语言可以即时生成 HTML。因此，网页可以由代码在<em>服务器端</em>根据用户的输入或行为生成。
- 你以前用过 `http-server` 来提供你的网页。今天，我们要用一种新的服务器，它可以解析网址，并根据所给的 URL 执行相应的操作。
- 另外，上周你见过这样的 URL：
  
  ```
  https://www.example.com/folder/file.html
  ```
  
  注意，`file.html` 是 `example.com` 上名为 `folder` 的文件夹里的一个 HTML 文件。

## Flask

- 这一周，我们引入了处理<em>路由（route）</em>的能力，比如 `https://www.example.com/route?key=value`，服务器可以根据 URL 中提供的键和值生成特定的功能。
- <em>Flask</em> 是一个第三方库，让你可以在 Python 中使用 Flask 框架（一种微框架）来托管 Web 应用。
- 你可以在 [cs50.dev](https://cs50.dev) 的终端窗口中执行 `flask run` 来运行 Flask。
- 为此，你需要一个名为 `app.py` 的文件和另一个名为 `requirements.txt` 的文件。`app.py` 包含告诉 Flask 如何运行你的 Web 应用的代码。`requirements.txt` 列出了你的 Flask 应用运行所需的库。
- 下面是一个 `requirements.txt` 的示例：
  
  ```
  Flask
  ```
  
  注意这个文件里只有 `Flask`。这是因为运行 Flask 应用需要 Flask。
- 下面是 `app.py` 中一个非常简单的 Flask 应用：
  
  src9/hello0/app.py
  
  ```
  # Says hello to world by returning a string of text
  
  from flask import Flask
  
  app = Flask(__name__)
  
  
  @app.route("/")
  def index():
      return "hello, world"
  ```
  
  注意，`/` 路由只是返回文本 `hello, world`。
- 我们也可以编写返回 HTML 的代码：
  
  src9/hello1/app.py
  
  ```
  # Says hello to world by returning a string of HTML
  
  from flask import Flask
  
  app = Flask(__name__)
  
  
  @app.route("/")
  def index():
      return '<!DOCTYPE html><html lang="en"><head><title>hello</title></head><body>hello, world</body></html>'
  ```
  
  注意，这里返回的不是简单的文本，而是 HTML。
- 改进我们的应用，我们还可以基于模板提供 HTML：创建一个名为 `templates` 的文件夹，并在该文件夹中创建一个名为 `index.html` 的文件，内容如下：
  
  src9/hello2/templates/index.html
  
  ```
  <!DOCTYPE html>
  
  <html lang="en">
  
      <head>
          <title>hello</title>
      </head>
  
      <body>
          hello, world
      </body>
  
  </html>
    
  ```
- 然后，在 `templates` 文件夹所在的同一个文件夹里，创建一个名为 `app.py` 的文件，加入下面的代码：
  
  src9/hello5/app.py
  
  ```
  # Uses request.args.get
  
  from flask import Flask, render_template, request
  
  app = Flask(__name__)
  
  
  @app.route("/")
  def index():
      name = request.args.get("name", "world")
      return render_template("index.html", name=name)
  ```
  
  注意，这段代码把 `app` 定义为 Flask 应用。然后，它把 `app` 的 `/` 路由定义为返回 `index.html` 的内容，并带上参数 `name`。默认情况下，`request.args.get` 函数会查找用户提供的 `name`。如果没有提供名字，就默认为 `world`。`@app.route` 也叫作装饰器（decorator）。
- 你可以在终端窗口中输入 `flask run` 来运行这个 Web 应用。如果 Flask 跑不起来，请确认上面每个文件的语法都正确。另外，如果 Flask 仍然无法运行，请确保你的文件按如下方式组织：
  
  ```
  /templates
      index.html
  app.py
  requirements.txt
  ```
- 运行起来后，你会被提示点击一个链接。打开那个网页后，试着在浏览器地址栏的基础 URL 后面加上 `?name=[你的名字]`。

## 表单

- 改进我们的程序：我们知道，大多数用户不会往地址栏里输入参数。程序员更多是让用户填写网页上的表单。因此，我们可以像这样修改 `index.html`：
  
  src9/hello6/templates/index.html
  
  ```
  <!DOCTYPE html>
  
  <html lang="en">
  
      <head>
          <title>hello</title>
      </head>
  
      <body>
          <form action="/greet" method="get">
              <input autocomplete="off" autofocus name="name" placeholder="Name" type="text">
              <button type="submit">Greet</button>
          </form>
      </body>
  
  </html>
  ```
  
  注意，现在创建了一个表单，它接收用户的名字，然后把它交给名为 `/greet` 的路由。`autocomplete` 被关闭了。另外，还加入了一个文本为 `name` 的 `placeholder`（占位符）。
- 此外，我们可以像这样修改 `app.py`：
  
  src9/hello6/app.py
  
  ```
  # Adds a form, second route
  
  from flask import Flask, render_template, request
  
  app = Flask(__name__)
  
  
  @app.route("/")
  def index():
      return render_template("index.html")
  
  
  @app.route("/greet")
  def greet():
      return render_template("greet.html", name=request.args.get("name", "world"))
  ```
  
  注意，默认路径会显示一个让用户输入名字的表单。`/greet` 路由会把 `name` 传给那个网页。
- 要完成这个实现，你还需要在 `templates` 文件夹里再建一个 `greet.html` 模板，内容如下：
  
  src9/hello6/templates/greet.html
  
  ```
  <!DOCTYPE html>
  
  <html lang="en">
  
      <head>
          <meta name="viewport" content="initial-scale=1, width=device-width">
          <title>hello</title>
      </head>
  
      <body>
          hello, {{ name }}
      </body>
  
  </html>
  ```
  
  注意，这个路由现在会向用户显示问候语，后面跟着他们的名字。

## 模板

- 我们的两个网页 `index.html` 和 `greet.html` 有很多相同的内容。如果能让正文各不相同，而各个页面共用同一套布局，是不是很好？
- 首先，创建一个名为 `layout.html` 的新模板，写下如下代码：
  
  src9/hello7/templates/layout.html
  
  ```
  <!DOCTYPE html>
  
  <html lang="en">
  
      <head>
          <title>hello</title>
      </head>
  
      <body>
          {% block body %}{% endblock %}
      </body>
  
  </html>
  ```
  
  注意，`{% block body %}{% endblock %}` 允许插入来自其他 HTML 文件的代码。
- 然后，像这样修改你的 `index.html`：
  
  src9/hello7/templates/index.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
  
      <form action="/greet" method="get">
          <input autocomplete="off" autofocus name="name" placeholder="Name" type="text">
          <button type="submit">Greet</button>
      </form>
  
  {% endblock %}
  ```
  
  注意，`{% extends "layout.html" %}` 这一行告诉服务器从哪里获取这个页面的布局。然后，`{% block body %}{% endblock %}` 说明要把哪些代码插入 `layout.html`。
- 最后，像这样修改 `greet.html`：
  
  src9/hello7/templates/greet.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
      hello, {{ name }}
  {% endblock %}
  ```
  
  注意这段代码更短、更紧凑了。

## 请求方法

- 你可以想象，有些场景下使用 `get` 是不安全的，因为用户名和密码会出现在 URL 里。
- 我们可以用 `post` 方法来解决这个问题，像这样修改 `app.py`：
  
  src9/hello8/app.py
  
  ```
  # Switches to POST
  
  from flask import Flask, render_template, request
  
  app = Flask(__name__)
  
  
  @app.route("/")
  def index():
      return render_template("index.html")
  
  
  @app.route("/greet", methods=["POST"])
  def greet():
      return render_template("greet.html", name=request.form.get("name", "world"))
  ```
  
  注意，`/greet` 路由加上了 `POST`，并且我们用的是 `request.form.get`，而不是 `request.args.get`。
- 这告诉服务器去虚拟信封的<em>更深处</em>查找，而不在 URL 中暴露 `post` 里的内容。
- 不过，这段代码还可以进一步改进：让 `get` 和 `post` 共用同一个路由。为此，像这样修改 `app.py`：
  
  src9/hello9/app.py
  
  ```
  # Uses a single route
  
  from flask import Flask, render_template, request
  
  app = Flask(__name__)
  
  
  @app.route("/", methods=["GET", "POST"])
  def index():
      if request.method == "POST":
          return render_template("greet.html", name=request.form.get("name", "world"))
      return render_template("index.html")
  ```
  
  注意，`get` 和 `post` 都在同一个路由中处理。不过，这里用 `request.method` 根据用户请求的类型来正确地分流。
- 相应地，你可以像这样修改 `index.html`：
  
  src9/hello9/templates/index.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
  
      <form action="/" method="post">
          <input autocomplete="off" autofocus name="name" placeholder="Name" type="text">
          <button type="submit">Greet</button>
      </form>
  
  {% endblock %}
  ```
  
  注意，表单的 `action` 改了。
- 不过，这段代码里还有一个 bug。在我们的新实现中，如果有人没在表单里输入名字，显示的就是没有名字的 `Hello, `。我们可以像这样编辑 `app.py` 来改进代码：
  
  src9/hello10/app.py
  
  ```
  # Moves default value to template
  
  from flask import Flask, render_template, request
  
  app = Flask(__name__)
  
  
  @app.route("/", methods=["GET", "POST"])
  def index():
      if request.method == "POST":
          return render_template("greet.html", name=request.form.get("name"))
      return render_template("index.html")
  ```
  
  注意，`name=request.form.get("name"))` 被改了。
- 最后，像这样修改 `greet.html`：
  
  src9/hello10/templates/greet.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
  
      hello,
      {% if name %}
          {{ name }}
      {% else %}
          world
      {% endif %}
  
  {% endblock %}
  ```
  
  注意，`hello, {{ name }}` 被修改了，使得在没有识别到名字时有一个默认的输出。
- 由于我们改了很多文件，你可能想把自己的最终代码与[我们的最终代码](https://cdn.cs50.net/2025/fall/lectures/9/src9/hello10/)对照一下。

## Frosh IMs

- Frosh IMs，即 <em>froshims</em>，是一个让学生报名参加校内体育比赛的 Web 应用。
- 关闭所有与 `hello` 相关的窗口，在终端窗口中输入 `mkdir froshims` 创建一个文件夹。然后输入 `cd froshims` 进入这个文件夹。在里面输入 `mkdir templates`，创建一个名为 templates 的目录。
- 接着，在 `froshims` 文件夹中输入 `code requirements.txt`，写入如下内容：
  
  ```
  Flask
  ```
  
  和之前一样，运行 Flask 应用需要 Flask。
- 最后，输入 `code app.py`，写下如下代码：
  
  src9/froshims1/app.py
  
  ```
  # Implements a registration form using a select menu, validating sport server-side
  
  from flask import Flask, render_template, request
  
  app = Flask(__name__)
  
  SPORTS = [
      "Basketball",
      "Soccer",
      "Ultimate Frisbee"
  ]
  
  
  @app.route("/")
  def index():
      return render_template("index.html", sports=SPORTS)
  
  
  @app.route("/register", methods=["POST"])
  def register():
  
      # Validate submission
      if not request.form.get("name") or request.form.get("sport") not in SPORTS:
          return render_template("failure.html")
  
      # Confirm registration
      return render_template("success.html")
  ```
  
  注意，这里提供了一个 `failure` 分支：如果 `name` 或 `sport` 字段没有正确填写，就会向用户显示失败信息。
- 接着，输入 `code templates/index.html`，在 `templates` 文件夹中创建一个名为 `index.html` 的文件，写下如下代码：
  
  src9/froshims1/templates/index.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
      <h1>Register</h1>
      <form action="/register" method="post">
          <input autocomplete="off" autofocus name="name" placeholder="Name" type="text">
          <select name="sport">
              <option selected value="">Sport</option>
              {% for sport in sports %}
                  <option value="{{ sport }}">{{ sport }}</option>
              {% endfor %}
          </select>
          <button type="submit">Register</button>
      </form>
  {% endblock %}
    
  ```
- 接着，输入 `code templates/layout.html`，创建一个名为 `layout.html` 的文件，写下如下代码：
  
  src9/froshims1/templates/layout.html
  
  ```
  <!DOCTYPE html>
  
  <html lang="en">
  
      <head>
          <meta name="viewport" content="initial-scale=1, width=device-width">
          <title>froshims</title>
      </head>
  
      <body>
          {% block body %}{% endblock %}
      </body>
  
  </html>
  ```
- 第四，在 templates 中创建一个名为 `success.html` 的文件，内容如下：
  
  src9/froshims1/templates/success.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
      You are registered!
  {% endblock %}
  ```
- 最后，在 templates 中创建一个名为 `failure.html` 的文件，内容如下：
  
  src9/froshims1/templates/failure.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
      You are not registered!
  {% endblock %}
  ```
- 执行 `flask run`，看看此时的应用。
- 你可以想象，我们也许想用单选按钮来展示各个报名选项。我们可以像这样改进 `index.html`：
  
  src9/froshims2/templates/index.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
      <h1>Register</h1>
      <form action="/register" method="post">
          <input autocomplete="off" autofocus name="name" placeholder="Name" type="text">
          {% for sport in sports %}
              <input name="sport" type="radio" value="{{ sport }}"> {{ sport }}
          {% endfor %}
          <button type="submit">Register</button>
      </form>
  {% endblock %}
  ```
  
  注意，`type` 被改成了 `radio`。
- 再次执行 `flask run`，你会看到界面已经变了。
- 你可以想象，我们也许想接受许多不同报名者的报名。我们可以像这样改进 `app.py`：
  
  src9/froshims4/app.py
  
  ```
  # Implements a registration form, storing registrants in a dictionary, with error messages
  
  from flask import Flask, redirect, render_template, request
  
  app = Flask(__name__)
  
  REGISTRANTS = {}
  
  SPORTS = [
      "Basketball",
      "Soccer",
      "Ultimate Frisbee"
  ]
  
  
  @app.route("/")
  def index():
      return render_template("index.html", sports=SPORTS)
  
  
  @app.route("/register", methods=["POST"])
  def register():
  
      # Validate name
      name = request.form.get("name")
      if not name:
          return render_template("error.html", message="Missing name")
  
      # Validate sport
      sport = request.form.get("sport")
      if not sport:
          return render_template("error.html", message="Missing sport")
      if sport not in SPORTS:
          return render_template("error.html", message="Invalid sport")
  
      # Remember registrant
      REGISTRANTS[name] = sport
  
      # Confirm registration
      return redirect("/registrants")
  
  
  @app.route("/registrants")
  def registrants():
      return render_template("registrants.html", registrants=REGISTRANTS)
  ```
  
  注意，这里用了一个名为 `REGISTRANTS` 的字典，通过 `REGISTRANTS[name]` 记录所选的 `sport`。另外，注意 `registrants=REGISTRANTS` 把这个字典传给了模板。
- 此外，我们可以实现 `error.html`：
  
  src9/froshims4/templates/error.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
      <h1>Error</h1>
      <p>{{ message }}</p>
      <img alt="Grumpy Cat" src="/static/cat.jpg">
  {% endblock %}
  ```
- 再创建一个名为 `registrants.html` 的新模板，内容如下：
  
  src9/froshims4/templates/registrants.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
      <h1>Registrants</h1>
      <table>
          <thead>
              <tr>
                  <th>Name</th>
                  <th>Sport</th>
              </tr>
          </thead>
          <tbody>
              {% for name in registrants %}
                  <tr>
                      <td>{{ name }}</td>
                      <td>{{ registrants[name] }}</td>
                  </tr>
              {% endfor %}
          </tbody>
      </table>
  {% endblock %}
  ```
  
  注意，`{% for name in registrants %}...{% endfor %}` 会遍历每一位报名者。能够在动态网页上做迭代，真是太强大了！
- 最后，在 `app.py` 所在的文件夹里创建一个名为 `static` 的文件夹。把下面这张[猫](https://cdn.cs50.net/2025/fall/lectures/9/src9/froshims4/static/cat.jpg)的图片上传到那里。
- 执行 `flask run`，玩一玩这个应用。
- 现在你有了一个 Web 应用！不过，它存在一些安全缺陷！因为所有东西都保存在内存里，攻击者可以修改 HTML 并<em>入侵</em>这个网站。此外，如果服务器关闭，这些数据也不会保留。有没有办法让数据在服务器重启后依然保留呢？

## Flask 与 SQL

- 正如我们已经看到 Python 可以与 SQL 数据库对接一样，我们可以结合 Flask、Python 和 SQL 的力量，创建一个数据能持久保存的 Web 应用！
- 要实现这一点，你需要完成几个步骤。
- 首先，把下面这个 [SQL 数据库](https://cdn.cs50.net/2025/fall/lectures/9/src9/froshims7/froshims.db)下载到你的 `froshims` 文件夹中。
- 在终端中执行 `sqlite3 froshims.db`，输入 `.schema` 查看数据库文件的结构。再输入 `SELECT * FROM registrants;` 查看其中的内容。你会发现这个文件里目前没有任何报名记录。
- 接着，像这样修改 `requirements.txt`：
  
  ```
  cs50
  Flask
  ```
- 像这样修改 `index.html`：
  
  src9/froshims7/templates/index.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
      <h1>Register</h1>
      <form action="/register" method="post">
          <input autocomplete="off" autofocus name="name" placeholder="Name" type="text">
          {% for sport in sports %}
              <input name="sport" type="checkbox" value="{{ sport }}"> {{ sport }}
          {% endfor %}
          <button type="submit">Register</button>
      </form>
  {% endblock %}
  ```
- 像这样修改 `layout.html`：
  
  src9/froshims7/templates/layout.html
  
  ```
  <!DOCTYPE html>
  
  <html lang="en">
  
      <head>
          <meta name="viewport" content="initial-scale=1, width=device-width">
          <title>froshims</title>
      </head>
  
      <body>
          {% block body %}{% endblock %}
      </body>
  
  </html>
  ```
- 确保 `error.html` 如下所示：
  
  src9/froshims7/templates/error.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
      <h1>Error</h1>
      <p>{{ message }}</p>
      <img alt="Grumpy Cat" src="/static/cat.jpg">
  {% endblock %}
  ```
- 把 `registrants.html` 修改成如下所示：
  
  src9/froshims7/templates/registrants.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
      <h1>Registrants</h1>
      <table>
          <thead>
              <tr>
                  <th>Name</th>
                  <th>Sport</th>
                  <th></th>
              </tr>
          </thead>
          <tbody>
              {% for registrant in registrants %}
                  <tr>
                      <td>{{ registrant.name }}</td>
                      <td>{{ registrant.sport }}</td>
                      <td>
                          <form action="/deregister" method="post">
                              <input name="id" type="hidden" value="{{ registrant.id }}">
                              <button type="submit">Deregister</button>
                          </form>
                      </td>
                  </tr>
              {% endfor %}
          </tbody>
      </table>
  {% endblock %}
  ```
  
  注意，这里包含了一个隐藏值 `registrant.id`，这样之后就可以在 `app.py` 中使用这个 `id`。
- 最后，像这样修改 `app.py`：
  
  src9/froshims7/app.py
  
  ```
  # Implements a registration form, storing registrants in a SQLite database, with support for multiple sports and deregistration
  
  from cs50 import SQL
  from flask import Flask, redirect, render_template, request
  
  app = Flask(__name__)
  
  db = SQL("sqlite:///froshims.db")
  
  SPORTS = [
      "Basketball",
      "Soccer",
      "Ultimate Frisbee"
  ]
  
  
  @app.route("/")
  def index():
      return render_template("index.html", sports=SPORTS)
  
  
  @app.route("/deregister", methods=["POST"])
  def deregister():
  
      # Forget registrant
      id = request.form.get("id")
      if id:
          db.execute("DELETE FROM registrants WHERE id = ?", id)
      return redirect("/registrants")
  
  
  @app.route("/register", methods=["POST"])
  def register():
  
      # Validate name
      name = request.form.get("name")
      if not name:
          return render_template("error.html", message="Missing name")
  
      # Validate sports
      sports = request.form.getlist("sport")
      if not sports:
          return render_template("error.html", message="Missing sport")
      for sport in sports:
          if sport not in SPORTS:
              return render_template("error.html", message="Invalid sport")
  
      # Remember registrant
      for sport in sports:
          db.execute("INSERT INTO registrants (name, sport) VALUES(?, ?)", name, sport)
  
      # Confirm registration
      return redirect("/registrants")
  
  
  @app.route("/registrants")
  def registrants():
      registrants = db.execute("SELECT * FROM registrants")
      return render_template("registrants.html", registrants=registrants)
  ```
  
  注意，这里使用了 `cs50` 库。`register` 有一个处理 `post` 方法的路由。这个路由会取出报名表单中的名字和运动项目，并执行一条 SQL 查询，把 `name` 和 `sport` 添加到 `registrants` 表中。`deregister` 路由会执行一条 SQL 查询，取得用户的 `id`，并利用这个信息取消此人的报名。
- 你可以执行 `flask run` 查看结果。
- 如果你想下载我们实现的 `froshims`，可以在[这里](https://cdn.cs50.net/2025/fall/lectures/9/src9/froshims7/)下载。
- 你可以在 [Flask 文档](https://flask.palletsprojects.com)中了解更多关于 Flask 的内容。

## Cookie 与 Session

- `app.py` 被视为<em>控制器（controller）</em>。<em>视图（view）</em>是用户所看到的内容。<em>模型（model）</em>是数据的存储和处理方式。合起来，这叫作 <em>MVC</em>（模型、视图、控制器）。
- 之前实现的 `froshims` 从管理的角度来看是有用的，后台管理员可以在数据库中添加和删除人员，但你可以想象，这段代码放在公共服务器上是不安全的。
- 一方面，恶意的人可以点击取消报名按钮，替其他用户做决定，实际上就是把别人记录在服务器上的答案删掉。
- 像 Google 这样的 Web 服务使用登录凭据来确保用户只能访问属于自己的数据。
- 我们其实也可以用 <em>cookie</em> 自己实现这一点。Cookie 是存储在浏览器中的一小段数据，浏览器可以借此与服务器沟通，相当于说：“我是一个已经登录过的授权用户。”通过这个 cookie 进行的授权叫作 <em>session</em>（会话）。
- Cookie 可能这样存储：
  
  ```
  GET / HTTP/2
  Host: accounts.google.com
  Cookie: session=value
  ```
  
  这里，一个 `session` id 与代表该会话的特定 `value` 一起被存储。
- 最简单的做法是：创建一个名为 `login` 的文件夹，然后添加下面这些文件。
- 首先，创建一个名为 `requirements.txt` 的文件，内容如下：
  
  ```
  Flask
  Flask-Session
  ```
  
  注意，除了 `Flask`，我们还加入了 `Flask-Session`，支持登录会话需要它。
- 第二，在 `templates` 文件夹中创建一个名为 `layout.html` 的文件，内容如下：
  
  src9/login/templates/layout.html
  
  ```
  <!DOCTYPE html>
  
  <html lang="en">
  
      <head>
          <meta name="viewport" content="initial-scale=1, width=device-width">
          <title>login</title>
      </head>
  
      <body>
          {% block body %}{% endblock %}
      </body>
  
  </html>
  ```
  
  注意，这提供了一个非常简单的布局，只有标题和正文。
- 第三，在 `templates` 文件夹中创建一个名为 `index.html` 的文件，内容如下：
  
  src9/login/templates/index.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
  
      {% if name %}
          You are logged in as {{ name }}. <a href="/logout">Log out</a>.
      {% else %}
          You are not logged in. <a href="/login">Log in</a>.
      {% endif %}
  
  {% endblock %}
  ```
  
  注意，这个文件会检查 `session["name"]` 是否存在（下面的 `app.py` 会进一步说明）。如果存在，就显示欢迎信息；如果不存在，就建议你去登录页面登录。
- 第四，创建一个名为 `login.html` 的文件，加入下面的代码：
  
  src9/login/templates/login.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
  
      <form action="/login" method="post">
          <input autocomplete="off" autofocus name="name" placeholder="Name" type="text">
          <button type="submit">Log In</button>
      </form>
  
  {% endblock %}
  ```
  
  注意，这是一个基本登录页面的布局。
- 最后，创建一个名为 `app.py` 的文件，写下如下代码：
  
  src9/login/app.py
  
  ```
  from flask import Flask, redirect, render_template, request, session
  from flask_session import Session
  
  # Configure app
  app = Flask(__name__)
  
  # Configure session
  app.config["SESSION_PERMANENT"] = False
  app.config["SESSION_TYPE"] = "filesystem"
  Session(app)
  
  
  @app.route("/")
  def index():
      return render_template("index.html", name=session.get("name"))
  
  
  @app.route("/login", methods=["GET", "POST"])
  def login():
      if request.method == "POST":
          session["name"] = request.form.get("name")
          return redirect("/")
      return render_template("login.html")
  
  
  @app.route("/logout")
  def logout():
      session.clear()
      return redirect("/")
  ```
  
  注意文件顶部修改过的 <em>import</em>，其中包括 `session`，它能让你支持会话。最重要的是，注意 `session["name"]` 在 `login` 和 `logout` 路由中是如何使用的。`login` 路由会把提供的登录名赋值给 `session["name"]`。而在 `logout` 路由中，登出是通过清空 `session` 的值来实现的。
- `session` 这个抽象让你能确保只有特定用户才能访问我们应用中的特定数据和功能。它让你确保没有人能代替别的用户行事，无论出于好意还是恶意！
- 如果你愿意，可以下载 `login` 的[我们的实现](https://cdn.cs50.net/2025/fall/lectures/9/src9/login/)。
- 你可以在 [Flask 文档](https://flask.palletsprojects.com/en/stable/api/#flask.session)中了解更多关于 session 的内容。

## 购物车

- 接下来是最后一个例子，用 Flask 的会话功能来实现。
- 我们查看了 `app.py` 中 `store` 的如下代码：
  
  src9/store/app.py
  
  ```
  from cs50 import SQL
  from flask import Flask, redirect, render_template, request, session
  from flask_session import Session
  
  # Configure app
  app = Flask(__name__)
  
  # Connect to database
  db = SQL("sqlite:///store.db")
  
  # Configure session
  app.config["SESSION_PERMANENT"] = False
  app.config["SESSION_TYPE"] = "filesystem"
  Session(app)
  
  
  @app.route("/")
  def index():
      books = db.execute("SELECT * FROM books")
      return render_template("books.html", books=books)
  
  
  @app.route("/cart", methods=["GET", "POST"])
  def cart():
  
      # Ensure cart exists
      if "cart" not in session:
          session["cart"] = []
  
      # POST
      if request.method == "POST":
          book_id = request.form.get("id")
          if book_id:
              session["cart"].append(book_id)
          return redirect("/cart")
  
      # GET
      books = db.execute("SELECT * FROM books WHERE id IN (?)", session["cart"])
      return render_template("cart.html", books=books)
  ```
  
  注意，`cart` 是用一个列表实现的。可以通过 `books.html` 中的 `Add to Cart` 按钮把商品加入这个列表。点击这样的按钮时，会调用 `post` 方法，把商品的 `id` 追加到 `cart` 中。查看购物车时，会调用 `get` 方法，执行 SQL 来显示购物车中的书籍列表。
- 我们还看了 `books.html` 的内容：
  
  src9/store/templates/books.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
  
      <h1>Books</h1>
      {% for book in books %}
          <h2>{{ book["title"] }}</h2>
          <form action="/cart" method="post">
              <input name="id" type="hidden" value="{{ book['id'] }}">
              <button type="submit">Add to Cart</button>
          </form>
      {% endfor %}
  
  {% endblock %}
  ```
  
  注意，这里通过 `for book in books` 为每本书都提供了 `Add to Cart` 的功能。
- 你可以在[源代码](https://cdn.cs50.net/2025/fall/lectures/9/src9/store/)中看到支撑这个 `flask` 实现的其余文件。

## Shows

- 我们看了一个事先设计好的程序 `shows`，在 `app.py` 中：
  
  src9/shows1/app.py
  
  ```
  # Searches for shows using LIKE
  
  from cs50 import SQL
  from flask import Flask, render_template, request
  
  app = Flask(__name__)
  
  db = SQL("sqlite:///shows.db")
  
  
  @app.route("/")
  def index():
      return render_template("index.html")
  
  
  @app.route("/search")
  def search():
      shows = db.execute("SELECT * FROM shows WHERE title LIKE ?", "%" + request.args.get("q") + "%")
      return render_template("search.html", shows=shows)
  ```
  
  注意，`search` 路由提供了一种搜索 `show` 的方式。这个搜索会查找标题与用户所给内容 `LIKE`（相似）的记录。
- 我们还查看了 `index.html`：
  
  src9/shows1/templates/index.html
  
  ```
  {% extends "layout.html" %}
  
  {% block body %}
  
      <form action="/search" method="get">
          <input autocomplete="off" autofocus name="q" placeholder="Query" type="search">
          <button type="submit">Search</button>
      </form>
  
  {% endblock %}
    
  ```
- 你可以在[源代码](https://cdn.cs50.net/2025/fall/lectures/9/src9/shows1/)中看到这个实现的其余文件。

## API

- <em>应用程序接口（application program interface）</em>，即 <em>API</em>，是一系列规范，让你能与另一个服务对接。例如，我们可以利用 IMDB 的 API 来对接他们的数据库。我们甚至可以集成一些 API，用来处理可从服务器下载的特定类型的数据。
- 改进 `shows`，我们看到了 `app.py` 的一个改进版本：
  
  src9/shows2/app.py
  
  ```
  # Searches for shows using Ajax
  
  from cs50 import SQL
  from flask import Flask, render_template, request
  
  app = Flask(__name__)
  
  db = SQL("sqlite:///shows.db")
  
  
  @app.route("/")
  def index():
      return render_template("index.html")
  
  
  @app.route("/search")
  def search():
      q = request.args.get("q")
      if q:
          shows = db.execute("SELECT * FROM shows WHERE title LIKE ? LIMIT 50", "%" + q + "%")
      else:
          shows = []
      return render_template("search.html", shows=shows)
  ```
  
  注意，`search` 路由会执行一条 SQL 查询。
- 看看 `search.html`，你会发现它非常简单：
  
  src9/shows2/templates/search.html
  
  ```
  {% for show in shows %}
      <li>{{ show["title"] }}</li>
  {% endfor %}
  ```
  
  注意，它提供的是一个项目符号列表。
- 最后，看看 `index.html`，注意搜索是用 <em>AJAX</em> 代码来驱动的：
  
  src9/shows2/templates/index.html
  
  ```
  <!DOCTYPE html>
  
  <html lang="en">
  
      <head>
          <meta name="viewport" content="initial-scale=1, width=device-width">
          <title>shows</title>
      </head>
  
      <body>
  
          <input autocomplete="off" autofocus placeholder="Query" type="search">
  
          <ul></ul>
  
          <script>
              let input = document.querySelector('input');
              input.addEventListener('input', async function() {
                  let response = await fetch('/search?q=' + input.value);
                  let shows = await response.text();
                  document.querySelector('ul').innerHTML = shows;
              });
          </script>
  
      </body>
  
  </html>
  ```
  
  注意，这里用了一个事件监听器（event listener），动态地向服务器发起查询，得到与所给标题匹配的列表。它会找到 HTML 中的 `ul` 标签，并相应地修改网页，把匹配项的列表放进去。
- 你可以在 [AJAX 文档](https://api.jquery.com/category/ajax/)中了解更多。

## JSON

- <em>JavaScript 对象表示法（JavaScript Object Notation）</em>，即 <em>JSON</em>，是一种由带键和值的字典构成的文本文件。这是一种原始的、对计算机友好的获取大量数据的方式。
- JSON 是从服务器取回数据的一种非常有用的方式。
- 你可以在我们一起查看过的 `index.html` 中看到它的实际应用：
  
  src9/shows3/templates/index.html
  
  ```
  <!DOCTYPE html>
  
  <html lang="en">
  
      <head>
          <meta name="viewport" content="initial-scale=1, width=device-width">
          <title>shows</title>
      </head>
  
      <body>
  
          <input autocomplete="off" autofocus placeholder="Query" type="text">
  
          <ul></ul>
  
          <script>
              let input = document.querySelector('input');
              input.addEventListener('input', async function() {
                  let response = await fetch('/search?q=' + input.value);
                  let shows = await response.json();
                  let html = '';
                  for (let i in shows) {
                      let title = shows[i].title.replace('<', '&lt;').replace('&', '&amp;');
                      html += '<li>' + title + '</li>';
                  }
                  document.querySelector('ul').innerHTML = html;
              });
          </script>
  
      </body>
  
  </html>
  ```
  
  上面的代码也许有点晦涩，但它为你提供了一个起点，让你自己去研究 JSON，看看如何在自己的 Web 应用中实现它。
- 此外，我们还查看了 `app.py`，看 JSON 响应是如何得到的：
  
  src9/shows3/app.py
  
  ```
  # Searches for shows using Ajax with JSON
  
  from cs50 import SQL
  from flask import Flask, jsonify, render_template, request
  
  app = Flask(__name__)
  
  db = SQL("sqlite:///shows.db")
  
  
  @app.route("/")
  def index():
      return render_template("index.html")
  
  
  @app.route("/search")
  def search():
      q = request.args.get("q")
      if q:
          shows = db.execute("SELECT * FROM shows WHERE title LIKE ? LIMIT 50", "%" + q + "%")
      else:
          shows = []
      return jsonify(shows)
  ```
  
  注意，这里用 `jsonify` 把结果转换成现代 Web 应用可以接受的、可读的格式。
- 你可以在 [JSON 文档](https://www.json.org/json-en.html)中了解更多。
- 总之，你现在已经有能力用 Python、Flask、HTML 和 SQL 完成自己的 Web 应用了。

## 小结

在这一讲中，你学习了如何使用 Python、SQL 和 Flask 创建 Web 应用。具体来说，我们讨论了……

- Flask
- 表单
- 模板
- 请求方法
- Flask 与 SQL
- Cookie 与 Session
- API
- JSON
