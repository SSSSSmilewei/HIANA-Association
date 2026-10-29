# 第 7 讲

## 欢迎！

- 前几周，我们向你介绍了 Python，这是一门高级编程语言，使用的构件和我们在 C 中学到的相同。不过，我们引入这门新语言，并不是为了学习“又一门语言”，而是因为有些工具适合做某些工作，而不太适合做另一些！
- 本周，我们将继续学习更多与 Python 相关的语法。
- 此外，我们会把这些知识与数据结合起来。
- 最后，我们将讨论 <em>SQL</em>，即<em>结构化查询语言（Structured Query Language）</em>，这是一种用来与数据交互并修改数据的特定领域方式。
- 总的来说，这门课程的目标之一是学会通用的编程，而不仅仅是学会课程中所讲的这些语言的编程。

## 平面文件数据库

- 你可能已经见过，数据通常可以用行和列的模式来描述。
- 像 Microsoft Excel 和 Google Sheets 创建的电子表格，可以输出为 `csv`，即<em>逗号分隔值（comma-separated values）</em>文件。
- 如果你查看一个 `csv` 文件，会发现它是“平”的，因为我们所有的数据都存储在由一个文本文件表示的单个表中。我们把这种形式的数据称为<em>平面文件数据库（flat-file database）</em>。
- 所有数据都按行存储，每一列之间用逗号或其他值分隔。
- Python 原生支持 `csv` 文件。
- 首先，下载 [favorites.csv](https://cdn.cs50.net/2025/fall/lectures/7/src7/favorites/favorites.csv?download)，并把它上传到 [cs50.dev](https://cs50.dev) 的文件资源管理器中。其次，查看这份数据，注意第一行比较特殊，它定义了每一列。接下来，每条记录按行存储。
- 在终端窗口中输入 `code favorites.py`，并编写如下代码：
  
  favorites/favorites0.py
  
  ```
  # Prints all favorites in CSV using csv.reader
  
  import csv
  
  # Open CSV file
  with open("favorites.csv", "r") as file:
  
      # Create reader
      reader = csv.reader(file)
  
      # Skip header row
      next(reader)
  
      # Iterate over CSV file, printing each favorite
      for row in reader:
          print(row[1])
  ```
  
  注意，这里导入了 `csv` 库。此外，我们创建了一个 `reader` 来保存 `csv.reader(file)` 的结果。`csv.reader` 函数会从文件中读取每一行，在我们的代码中，我们把结果存入 `reader`。因此，`print(row[1])` 会打印 `favorites.csv` 文件中的语言。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/7/src7/favorites/favorites0.py?download)下载这段代码。
- 你可以这样改进代码：
  
  favorites/favorites1.py
  
  ```
  # Stores favorite in a variable
  
  import csv
  
  # Open CSV file
  with open("favorites.csv", "r") as file:
  
      # Create reader
      reader = csv.reader(file)
  
      # Skip header row
      next(reader)
  
      # Iterate over CSV file, printing each favorite
      for row in reader:
          favorite = row[1]
          print(favorite)
  ```
  
  注意，`favorite` 先被存储，然后再被打印。另外请注意，我们使用 `next` 函数让 reader 跳到下一行。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/7/src7/favorites/favorites1.py?download)下载这段代码。
- 上面这种方法的缺点之一是，我们假定 `row[1]` 永远是喜欢的语言。但是，如果各列的位置被调换了，会发生什么呢？
- 我们可以修复这个潜在的问题。Python 还允许你用键（key）来索引。把你的代码修改如下：
  
  favorites/favorites2.py
  
  ```
  # Prints all favorites in CSV using csv.DictReader
  
  import csv
  
  # Open CSV file
  with open("favorites.csv", "r") as file:
  
      # Create DictReader
      reader = csv.DictReader(file)
  
      # Iterate over CSV file, printing each favorite
      for row in reader:
          favorite = row["language"]
          print(favorite)
  ```
  
  注意，这个例子在 print 语句中直接使用了 `language` 这个键。`favorite` 被赋值为 `row["language"]`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/7/src7/favorites/favorites2.py?download)下载这段代码。
- 这还可以进一步简化为：
  
  favorites/favorites3.py
  
  ```
  # Prints all favorites in CSV using csv.DictReader
  
  import csv
  
  # Open CSV file
  with open("favorites.csv", "r") as file:
  
      # Create DictReader
      reader = csv.DictReader(file)
  
      # Iterate over CSV file, printing each favorite
      for row in reader:
          print(row["language"])
  ```
  
  你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/7/src7/favorites/favorites3.py?download)下载这段代码。
- 要统计 `csv` 文件中表达的各种喜欢的语言的数量，我们可以这样做：
  
  favorites/favorites4.py
  
  ```
  # Counts favorites using variables
  
  import csv
  
  # Open CSV file
  with open("favorites.csv", "r") as file:
  
      # Create DictReader
      reader = csv.DictReader(file)
  
      # Counts
      scratch, c, python = 0, 0, 0
  
      # Iterate over CSV file, counting favorites
      for row in reader:
          favorite = row["language"]
          if favorite == "Scratch":
              scratch += 1
          elif favorite == "C":
              c += 1
          elif favorite == "Python":
              python += 1
  
  # Print counts
  print(f"Scratch: {scratch}")
  print(f"C: {c}")
  print(f"Python: {python}")
  ```
  
  注意，每种语言都是用 `if` 语句来计数的。另外请注意这些 `if` 语句中的双等号 `==`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/7/src7/favorites/favorites4.py?download)下载这段代码。
- Python 允许我们用字典来统计每种语言的 `counts`。看看下面对代码的改进：
  
  favorites/favorites5.py
  
  ```
  # Counts favorites using dictionary
  
  import csv
  
  # Open CSV file
  with open("favorites.csv", "r") as file:
  
      # Create DictReader
      reader = csv.DictReader(file)
  
      # Counts
      counts = {}
  
      # Iterate over CSV file, counting favorites
      for row in reader:
          favorite = row["language"]
          if favorite in counts:
              counts[favorite] += 1
          else:
              counts[favorite] = 1
  
  # Print counts
  for favorite in counts:
      print(f"{favorite}: {counts[favorite]}")
  ```
  
  注意，当 `counts` 中键为 `favorite` 的值已经存在时，就把它加一；如果不存在，我们就定义 `counts[favorite]` 并把它设为 1。此外，格式化字符串也得到了改进，用来显示 `counts[favorite]`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/7/src7/favorites/favorites5.py?download)下载这段代码。
- 我们还可以用 `try` 和 `except` 来应对可能出现的异常：
  
  favorites/favorites6.py
  
  ```
  # Uses try/except instead
  
  import csv
  
  # Open CSV file
  with open("favorites.csv", "r") as file:
  
      # Create DictReader
      reader = csv.DictReader(file)
  
      # Counts
      counts = {}
  
      # Iterate over CSV file, counting favorites
      for row in reader:
          favorite = row["language"]
          try:
              counts[favorite] += 1
          except KeyError:
              counts[favorite] = 1
  
  # Print counts
  for favorite in counts:
      print(f"{favorite}: {counts[favorite]}")
  ```
  
  注意，`if` 和 `else` 被换成了 `try` 和 `except`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/7/src7/favorites/favorites6.py?download)下载这段代码。
- Python 还允许对 `counts` 排序。把你的代码改进如下：
  
  favorites/favorites7.py
  
  ```
  # Sorts favorites by key
  
  import csv
  
  # Open CSV file
  with open("favorites.csv", "r") as file:
  
      # Create DictReader
      reader = csv.DictReader(file)
  
      # Counts
      counts = {}
  
      # Iterate over CSV file, counting favorites
      for row in reader:
          favorite = row["language"]
          if favorite in counts:
              counts[favorite] += 1
          else:
              counts[favorite] = 1
  
  # Print counts
  for favorite in sorted(counts):
      print(f"{favorite}: {counts[favorite]}")
  ```
  
  注意代码底部的 `sorted(counts)`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/7/src7/favorites/favorites7.py?download)下载这段代码。
- 如果你在 Python 文档中查看 `sorted` 函数的参数，会发现它有许多内置参数。你可以这样利用其中一些：
  
  favorites/favorites8.py
  
  ```
  # Sorts favorites by value using .get
  
  import csv
  
  # Open CSV file
  with open("favorites.csv", "r") as file:
  
      # Create DictReader
      reader = csv.DictReader(file)
  
      # Counts
      counts = {}
  
      # Iterate over CSV file, counting favorites
      for row in reader:
          favorite = row["language"]
          if favorite in counts:
              counts[favorite] += 1
          else:
              counts[favorite] = 1
  
  # Print counts
  for favorite in sorted(counts, key=counts.get, reverse=True):
      print(f"{favorite}: {counts[favorite]}")
  ```
  
  注意传给 `sorted` 的参数。`key` 参数让你告诉 Python 用哪种方法对条目排序。在这里，`counts.get` 用来按值排序。`reverse=True` 告诉 `sorted` 从大到小排序。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/7/src7/favorites/favorites8.py?download)下载这段代码。
- 你可以在 [Python 文档](https://docs.python.org/3/howto/sorting.html)中进一步了解 [sorted](https://docs.python.org/3/howto/sorting.html)。

## 关系型数据库

- Google、X 和 Meta 都使用关系型数据库来大规模存储它们的信息。
- 关系型数据库把数据存储在称为<em>表（table）</em>的结构中，以行和列的形式组织。
- SQL 支持四类命令：
  
  ```
    Create 
    Read
    Update
    Delete
  ```
- 这四种操作被亲切地称为 <em>CRUD</em>。
- 我们可以用 SQL 语法 `CREATE TABLE table (column type, ...);` 来创建数据库。但是，这条命令要在哪里运行呢？
- `sqlite3` 是一种 SQL 数据库，具备本课程所需的核心功能。
- 我们可以在终端中输入 `sqlite3 favorites.db` 来创建一个 SQL 数据库。出现提示时，按 `y` 表示同意创建 `favorites.db`。
- 你会注意到提示符变了，因为我们现在使用的是一个叫 `sqlite` 的程序。
- 我们可以输入 `.mode csv` 让 `sqlite` 进入 `csv` 模式。然后，输入 `.import favorites.csv favorites`，就可以从 `csv` 文件导入数据。看起来什么都没有发生！
- 我们可以输入 `.schema` 来查看数据库的结构。
- 你可以用 `SELECT columns FROM table` 的语法从表中读取内容。
- 例如，你可以输入 `SELECT * FROM favorites;`，这会打印 `favorites` 中的每一行。
- 你可以用命令 `SELECT language FROM favorites;` 获取数据的一个子集。
- SQL 支持许多用于访问数据的命令，包括：
  
  ```SQL
    AVG
    COUNT
    DISTINCT
    LOWER
    MAX
    MIN
    UPPER
  ```
- 例如，你可以输入 `SELECT COUNT(*) FROM favorites;`。此外，你可以输入 `SELECT DISTINCT language FROM favorites;` 来获取数据库中各个不同语言的列表。你甚至可以输入 `SELECT COUNT(DISTINCT language) FROM favorites;` 来获取这些语言的数量。
- SQL 还提供了其他可以在查询中使用的命令：
  
  ```
    WHERE       -- adding a Boolean expression to filter our data
    LIKE        -- filtering responses more loosely
    ORDER BY    -- ordering responses
    LIMIT       -- limiting the number of responses
    GROUP BY    -- grouping responses together
  ```
  
  注意，我们用 `--` 在 SQL 中写注释。

## SELECT

- 例如，我们可以执行 `SELECT COUNT(*) FROM favorites WHERE language = 'C';`，会显示一个计数。
- 此外，我们可以输入 `SELECT COUNT(*) FROM favorites WHERE language = 'C' AND problem = 'Hello, World';`。注意这里用 `AND` 来缩小结果范围。
- 类似地，我们可以执行 `SELECT language, COUNT(*) FROM favorites GROUP BY language;`。这会给出一个临时表，显示语言及其数量。
- 我们可以输入 `SELECT language, COUNT(*) FROM favorites GROUP BY language ORDER BY COUNT(*);` 来改进它。这会让结果表按 `count` 排序。
- 同样，我们可以执行 `SELECT COUNT(*) FROM favorites WHERE language = 'C' AND (problem = 'Hello, World' OR problem = 'Hello, It''s Me');`。请注意这里有两个 `''`，这样就能使用单引号，而不会让 SQL 混淆。
- 另外，我们可以执行 `SELECT COUNT(*) FROM favorites WHERE language = 'C' AND problem LIKE 'Hello, %';`，找出所有以 `Hello, `（包括空格）开头的问题。
- 我们可以这样对输出排序：`SELECT language, COUNT(*) FROM favorites GROUP BY language ORDER BY COUNT(*) DESC;`。
- 我们甚至可以在查询中创建别名，就像变量一样：`SELECT language, COUNT(*) AS n FROM favorites GROUP BY language ORDER BY n DESC;`。
- 最后，我们可以把输出限制为 1 个或更多的值：`SELECT language, COUNT(*) AS n FROM favorites GROUP BY language ORDER BY n DESC LIMIT 1;`。
- 注意，按照惯例，SQL 关键字通常用大写字母书写。

## INSERT

- 我们也可以用 `INSERT INTO table (column...) VALUES(value, ...);` 的形式向 SQL 数据库中 `INSERT`（插入）数据。
- 我们可以执行 `INSERT INTO favorites (language, problem) VALUES ('SQL', 'Fiftyville');`。
- 你可以执行 `SELECT * FROM favorites;` 来验证这条喜好已被添加。

## DELETE

- `DELETE` 让你删除部分数据。例如，你可以执行 `DELETE FROM favorites WHERE Timestamp IS NULL;`。这会删除所有 `Timestamp` 为 `NULL` 的记录。

## UPDATE

- 我们也可以使用 `UPDATE` 命令来更新数据。
- 例如，你可以执行 `UPDATE favorites SET language = 'SQL', problem = 'Fiftyville';`。这会更新所有的行。
- 注意，这些查询威力巨大。因此，在真实环境中，你应该考虑谁有权限执行某些命令，以及是否有可用的备份！

## IMDb

- 设想我们想创建一个数据库来给各种电视节目编目。我们可以创建一个电子表格，列包括 `title`、`star`、`star`、`star`、`star`，以及更多的 star。这种做法的问题是浪费大量空间：有些节目可能只有一位主演，另一些可能有几十位。
- 我们可以把数据库拆分成多张表。我们可以有一张 `shows` 表、一张 `stars` 表和一张 `people` 表。在 `people` 表中，每个人可以有一个唯一的 `id`。在 `shows` 表中，每个节目也可以有一个唯一的 `id`。在名为 `stars` 的第三张表中，我们可以通过 `show_id` 和 `person_id` 把人和节目关联起来。虽然这是一种改进，但还不是理想的数据库。
- IMDb 提供了一个包含人物、节目、编剧、主演、类型和评分的数据库。这些表之间的关系如下：
  
  ![six boxes that represent various sql tables arrows are drawn to each showing their many relationships with one another](https://cs50.harvard.edu/x/notes/7/cs50Week7Slide025.png)
- 下载 [`shows.db`](https://cdn.cs50.net/2025/fall/lectures/7/src7/imdb/shows.db?download) 之后，你可以在终端窗口中执行 `sqlite3 shows.db`。
- 我们把注意力集中到数据库中名为 `shows` 和 `ratings` 的两张表之间的关系上。这两张表之间的关系可以图示如下：
  
  ![two boxes one called shows and the other called ratings](https://cs50.harvard.edu/x/notes/7/cs50Week7Slide032.png)
- 为了说明这两张表之间的关系，我们可以执行下面的命令：`SELECT * FROM ratings LIMIT 10;`。看过输出后，我们可以执行 `SELECT * FROM shows LIMIT 10;`。
- 比较 `shows` 和 `ratings`，我们可以看到它们是一对一的关系：一个节目对应一个评分。
- 要了解这个数据库，执行 `.schema` 后，你不仅能看到每一张表，还能看到每张表内部的各个字段。
- 更具体地，你可以执行 `.schema shows` 来了解 `shows` 里的字段，也可以执行 `.schema ratings` 来查看 `ratings` 里的字段。
- 所有表中都有对节目 id 的引用。在 `shows` 表中，它就叫 `id`。所有表中的这个共同字段称为<em>键（key）</em>。主键（primary key）用来标识表中唯一的一条记录。<em>外键（foreign key）</em>通过指向另一张表的主键来建立表与表之间的关系。你可以在 `ratings` 的 schema 中看到，`show_id` 是一个外键，引用 `shows` 中的 `id`。
- 像上面这样把数据存储在关系型数据库中，可以更高效地存储数据。
- 在 <em>sqlite</em> 中，有五种数据类型，包括：
  
  ```
    BLOB       -- binary large objects that are groups of ones and zeros
    INTEGER    -- an integer
    NUMERIC    -- for numbers that are formatted specially like dates
    REAL       -- like a float
    TEXT       -- for strings and the like
  ```
- 此外，还可以给列设置特殊的约束：
  
  ```
    NOT NULL
    UNIQUE
  ```
- 我们可以进一步摆弄这些数据来理解这些关系。执行 `SELECT * FROM ratings;`。评分有很多！
- 我们可以执行 `SELECT show_id FROM ratings WHERE rating >= 6.0 LIMIT 10;` 来进一步缩小数据范围。从这个查询中，你可以看到列出了 10 个节目。但是，我们不知道每个 `show_id` 代表哪个节目。
- 你可以执行 `SELECT * FROM shows WHERE id = 626124;` 来查出这些节目是什么。
- 我们可以通过执行下面的查询，让它更高效：
  
  ```
  SELECT title
  FROM shows
  WHERE id IN (
      SELECT show_id
      FROM ratings
      WHERE rating >= 6.0
      LIMIT 10
  );
  ```
  
  注意，这个查询嵌套了两个查询。内层查询被外层查询使用。

## `JOIN`

- 我们是在从 `shows` 和 `ratings` 中提取数据。注意，`shows` 和 `ratings` 都有一个共同的 `id`。
- 怎样才能临时合并表呢？可以用 `JOIN` 命令把表连接在一起。
- 执行下面的命令：
  
  ```
  SELECT * FROM shows
    JOIN ratings ON shows.id = ratings.show_id
    WHERE rating >= 6.0
    LIMIT 10;
  ```
  
  注意，这会得到一张比我们之前见过的更宽的表。
- 之前的查询展示了这些键之间的<em>一对一（one-to-one）</em>关系，现在我们来看一些<em>一对多（one-to-many）</em>关系。把重点放在 `genres` 表上，执行下面的命令：
  
  ```
  SELECT * FROM genres
  LIMIT 10;
  ```
  
  注意，这让我们对原始数据有了一个大致的了解。你可能会注意到，有一个节目对应三个值。这就是一对多的关系。
- 我们可以输入 `.schema genres` 来进一步了解 `genres` 表。
- 执行下面的命令，进一步了解数据库中的各种喜剧：
  
  ```
  SELECT title FROM shows
  WHERE id IN (
    SELECT show_id FROM genres
    WHERE genre = 'Comedy'
    LIMIT 10
  );
  ```
  
  注意，这会生成一个喜剧列表，其中包括 <em>Catweazle</em>。
- 我们可以通过连接多张表来进一步了解 Catweazle：
  
  ```
  SELECT * FROM shows
  JOIN genres
  ON shows.id = genres.show_id
  WHERE id = 63881;
  ```
  
  注意，这会得到一张临时表。出现重复的数据是没问题的。另外请注意，Catweazle（一个标题）被分配了<em>多个</em>类型，包括冒险、喜剧和家庭。
- 与一对一和一对多关系相对，还有<em>多对多（many-to-many）</em>关系。例如，很多人可以出现在很多节目中！
- 我们可以执行下面的命令，进一步了解节目 <em>The Office</em> 以及其中的演员：
  
  ```
  SELECT name FROM people WHERE id IN 
      (SELECT person_id FROM stars WHERE show_id = 
          (SELECT id FROM shows WHERE title = 'The Office' AND year = 2005));
  ```
  
  注意，这会通过嵌套查询得到一张包含各位主演姓名的表。
- 我们可以找出 Steve Carell 主演过的所有节目：
  
  ```
  SELECT title FROM shows WHERE id IN 
      (SELECT show_id FROM stars WHERE person_id = 
          (SELECT id FROM people WHERE name = 'Steve Carell'));
  ```
  
  这会得到 Steve Carell 主演过的节目标题列表。
- 这也可以用 `JOIN` 表达为：
  
  ```
  SELECT title FROM shows
  JOIN stars ON shows.id = stars.show_id
  JOIN people ON stars.person_id = people.id
  WHERE name = 'Steve Carell';
  ```
- 还可以这样表达：
  
  ```
  SELECT title FROM shows, stars, people 
  WHERE shows.id = stars.show_id
  AND people.id = stars.person_id
  AND name = 'Steve Carell';
  ```
- 通配符 `%` 可以用来找出所有名字以 `Steve C` 开头的人，语法如下：`SELECT * FROM people WHERE name LIKE 'Steve C%';`。

## 索引

- 虽然关系型数据库可以比使用 `CSV` 文件更快、更健壮，但表中的数据还可以通过<em>索引（index）</em>进一步优化。
- 索引可以用来加速我们的查询。
- 我们可以在 `sqlite3` 中执行 `.timer on` 来跟踪查询的耗时。
- 要理解索引如何加速查询，运行下面的查询：`SELECT * FROM shows WHERE title = 'The Office';` 注意查询执行完后显示的时间。
- 然后，我们可以用 `CREATE INDEX title_index ON shows (title);` 的语法创建索引。这告诉 `sqlite3` 创建一个索引，并对 `title` 这一列在底层做一些特殊的优化。
- 这会创建一种叫 <em>B 树（B Tree）</em>的数据结构，它看起来和二叉树相似。不过，与二叉树不同的是，它的子节点可以多于两个。
  
  ![one node at the top from which come four children and below that there are three children coming from one of the nodes and two from another two from another and three from another](https://cs50.harvard.edu/x/notes/7/cs50Week7Slide039.png)
- 此外，我们还可以这样创建索引：
  
  ```
  CREATE INDEX name_index ON people (name);
  CREATE INDEX person_index ON stars (person_id);
  ```
- 运行这个查询，你会发现它运行得快多了！
  
  ```
  SELECT title FROM shows WHERE id IN 
      (SELECT show_id FROM stars WHERE person_id = 
          (SELECT id FROM people WHERE name = 'Steve Carell'));
  ```
- 遗憾的是，给所有列都建索引会占用更多的存储空间。因此，速度的提升是有代价的。

## 在 Python 中使用 SQL

- 为了帮助你在本课程中使用 SQL，可以在代码中这样使用 CS50 库：
  
  ```
  from cs50 import SQL
  ```
- 与之前使用 CS50 库的情形类似，这个库会帮你处理在 Python 代码中使用 SQL 的复杂步骤。
- 你可以在[文档](https://cs50.readthedocs.io/libraries/cs50/python/#cs50.SQL)中进一步阅读 CS50 库的 SQL 功能。
- 有了新学到的知识，我们现在可以把 Python 和 SQL 结合起来使用了。
- 把你的 `favorites.py` 代码修改如下：
  
  favorites/favorites10.py
  
  ```
  # Searches database for popularity of a problem
  
  from cs50 import SQL
  
  # Open database
  db = SQL("sqlite:///favorites.db")
  
  # Prompt user for favorite
  favorite = input("Favorite: ")
  
  # Search for title
  rows = db.execute("SELECT COUNT(*) AS n FROM favorites WHERE problem = ?", favorite)
  
  # Get first (and only) row
  row = rows[0]
  
  # Print popularity
  print(row["n"])
  ```
  
  注意，`db = SQL("sqlite:///favorites.db")` 告诉 Python 数据库文件的位置。然后，以 `rows` 开头的那一行使用 `db.execute` 执行 SQL 命令。确实，这条命令把引号内的语法传给了 `db.execute` 函数。我们可以用这种语法发出任何 SQL 命令。另外请注意，`rows` 返回的是一个由字典组成的列表。在这个例子中，只有一个结果、一行，作为字典返回到 rows 列表中。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/7/src7/favorites/favorites10.py?download)下载这段代码。

## 竞态条件

- 使用 SQL 有时会带来一些问题。
- 你可以设想这样的情形：多个用户同时访问同一个数据库，并同时执行命令。
- 这可能导致故障：代码被其他人的操作打断，从而可能造成数据丢失。
- SQL 的内置功能，如 `BEGIN TRANSACTION`、`COMMIT` 和 `ROLLBACK`，有助于避免部分竞态条件（race condition）问题。

## SQL 注入攻击

- 回到上面的代码，你可能会好奇上面的 `?` 问号是做什么的。SQL 在现实应用中可能出现的问题之一，就是所谓的<em>注入攻击（injection attack）</em>。注入攻击是指恶意行为者可能输入恶意的 SQL 代码。
- 例如，考虑下面这样的登录界面：
  
  ![login screen with username and password fields](https://cs50.harvard.edu/x/notes/7/cs50Week7Slide051.png)
- 如果我们自己的代码没有适当的保护，坏人就可能运行恶意代码。看看下面这个例子：
  
  ```
  rows = db.execute("SELECT COUNT(*) FROM users WHERE username = ? AND password = ?", username, password)
  ```
  
  注意，因为用了 `?`，在查询盲目接受 `username` 和 `password` 之前，可以先对它们进行验证。
- 永远不要盲目相信用户的输入。
- 使用 CS50 库时，该库会对输入进行<em>净化（sanitize）</em>，移除任何可能有害的字符。

## 小结

在这一讲中，你学习了更多与 Python 相关的语法。此外，你还学习了如何把这些知识与平面文件数据库和关系型数据库形式的数据结合起来。最后，你了解了 <em>SQL</em>。具体来说，我们讨论了……

- 平面文件数据库
- 关系型数据库
- `SELECT`、`CREATE`、`INSERT`、`DELETE` 和 `UPDATE` 等 SQL 命令
- 主键与外键
- `JOIN`
- 索引
- 在 Python 中使用 SQL
- 竞态条件
- SQL 注入攻击

下次再见！
