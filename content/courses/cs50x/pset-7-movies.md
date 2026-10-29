# Movies

> <strong>2026 年的变化：</strong> `5.sql` 现在要求匹配以 “Harry Potter and the ” 开头的电影（而不只是 “Harry Potter”）。`9.sql` 现在要求输出<strong>两列</strong>（每个人的 ID 和姓名），而不只是姓名。如果你在 2026 年之前就开始做这道题，请务必相应地更新你的查询！

![IMDb Logo](https://cs50.harvard.edu/x/psets/7/movies/imdb.png)

## 要解决的问题

课程提供给你的是一个名为 `movies.db` 的文件，这是一个 SQLite 数据库，存储着来自 [IMDb](https://www.imdb.com/) 的数据，涉及电影、导演和主演这些电影的人，以及电影的评分。编写 SQL 查询，回答关于这个电影数据库的问题。

## 演示

## 开始

这道题会用到 CS50 课程组提供给你的数据库。

<details markdown="1"><summary>下载发行代码</summary>

登录 [cs50.dev](https://cs50.dev/)，点击你的终端窗口，单独执行 `cd`。你应该会发现终端窗口的提示符类似下面这样：

```
$
```

接着执行

```
wget https://cdn.cs50.net/2026/x/psets/7/movies.zip
```

把名为 `movies.zip` 的 ZIP 文件下载到你的 codespace 中。

然后执行

```
unzip movies.zip
```

创建一个名为 `movies` 的文件夹。你不再需要这个 ZIP 文件了，所以可以执行

```
rm movies.zip
```

并在提示时输入“y”后按回车，删除你下载的 ZIP 文件。

现在输入

```
cd movies
```

再按回车，进入（即打开）该目录。你的提示符现在应该类似下面这样。

```
movies/ $
```

单独执行 `ls`，你应该会看到 13 个 .sql 文件，以及 `movies.db`。

如果遇到任何问题，请重新按这些步骤操作一遍，看看能否找出哪里出了错！

</details>

## 要求

对于下面的每个问题，你都应编写一条 SQL 查询，输出该问题所指定的结果。你的答案必须是单独一条 SQL 查询，不过你可以在查询内部嵌套其他查询。你<strong>不应</strong>对任何特定电影或人物的 `id` 做任何假设：即使某部电影或某个人的 `id` 不同，你的查询也应当是正确的。最后，每条查询应只返回回答问题所需的数据：例如，如果题目只要求你输出电影名称，那么你的查询就不应同时输出每部电影的上映年份。

欢迎你拿查询结果与 [IMDb](https://www.imdb.com/) 本身核对，但要知道，网站上的评分可能与 `movies.db` 中的不同，因为自从我们下载数据以来，可能又有更多人投了票！

1. 在
   
   1.sql
   
   中，编写一条 SQL 查询，列出 2008 年上映的所有电影的标题。
   
   - 你的查询应输出一个表，只有一列，即每部电影的标题。
2. 在
   
   2.sql
   
   中，编写一条 SQL 查询，求出 Emma Stone 的出生年份。
   
   - 你的查询应输出一个表，只有一列一行（不含表头），内容是 Emma Stone 的出生年份。
   - 你可以假设数据库中名为 Emma Stone 的人只有一个。
3. 在
   
   3.sql
   
   中，编写一条 SQL 查询，按字母顺序列出上映日期在 2018 年或之后的所有电影的标题。
   
   - 你的查询应输出一个表，只有一列，即每部电影的标题。
   - 2018 年上映的电影应当包括在内，上映日期在未来的电影也应包括在内。
4. 在
   
   4.sql
   
   中，编写一条 SQL 查询，求出 IMDb 评分为 10.0 的电影数量。
   
   - 你的查询应输出一个表，只有一列一行（不含表头），内容是评分为 10.0 的电影数量。
5. 在
   
   5.sql
   
   中，编写一条 SQL 查询，按时间顺序列出所有 Harry Potter 电影的标题和上映年份。
   
   - 你的查询应输出一个表，有两列，一列是每部电影的标题，一列是每部电影的上映年份。
   - 你可以假设所有 Harry Potter 电影的标题都以 “Harry Potter and the ” 开头，并且如果一部电影的标题以 “Harry Potter and the ” 开头，它就是一部 Harry Potter 电影。
6. 在
   
   6.sql
   
   中，编写一条 SQL 查询，求出 2012 年上映的所有电影的平均评分。
   
   - 你的查询应输出一个表，只有一列一行（不含表头），内容是平均评分。
7. 在
   
   7.sql
   
   中，编写一条 SQL 查询，列出 2010 年上映的所有电影及其评分，按评分降序排列。评分相同的电影，按标题字母顺序排列。
   
   - 你的查询应输出一个表，有两列，一列是每部电影的标题，一列是每部电影的评分。
   - 没有评分的电影不应包含在结果中。
8. 在
   
   8.sql
   
   中，编写一条 SQL 查询，列出所有主演 Toy Story 的人的姓名。
   
   - 你的查询应输出一个表，只有一列，即每个人的姓名。
   - 你可以假设数据库中标题为 Toy Story 的电影只有一部。
9. 在
   
   9.sql
   
   中，编写一条 SQL 查询，列出所有主演过 2004 年上映的电影的人的 ID 和姓名，按出生年份排序。
   
   - 你的查询应输出一个表，有两列：一列是 ID，一列是每个人的姓名。
   - 出生年份相同的人可以按任意顺序列出。
   - 不必担心没有登记出生年份的人，只要有出生年份的人是按顺序列出的即可。
   - 如果某人在 2004 年出演了不止一部电影，他在你的结果中应只出现一次。
10. 在
    
    10.sql
    
    中，编写一条 SQL 查询，列出所有执导过评分至少为 9.0 的电影的人的姓名。
    
    - 你的查询应输出一个表，只有一列，即每个人的姓名。
    - 如果某人执导了不止一部评分至少为 9.0 的电影，他在你的结果中应只出现一次。
11. 在
    
    11.sql
    
    中，编写一条 SQL 查询，列出 Chadwick Boseman 主演的评分最高的五部电影的标题（按顺序），从评分最高的开始。
    
    - 你的查询应输出一个表，只有一列，即每部电影的标题。
    - 你可以假设数据库中名为 Chadwick Boseman 的人只有一个。
12. 在
    
    12.sql
    
    中，编写一条 SQL 查询，列出 Bradley Cooper 和 Jennifer Lawrence 同时主演的所有电影的标题。
    
    - 你的查询应输出一个表，只有一列，即每部电影的标题。
    - 你可以假设数据库中名为 Bradley Cooper 的人只有一个。
    - 你可以假设数据库中名为 Jennifer Lawrence 的人只有一个。
13. 在
    
    13.sql
    
    中，编写一条 SQL 查询，列出所有与 Kevin Bacon 共同主演过同一部电影的人的姓名。
    
    - 你的查询应输出一个表，只有一列，即每个人的姓名。
    - 数据库中可能有多个名为 Kevin Bacon 的人。请务必只选取 1958 年出生的那位 Kevin Bacon。
    - Kevin Bacon 本人不应出现在结果列表中。

## 提示

<details markdown="1"><summary>理解 `movies.db` 的模式（schema）</summary>

每当你接触一个新的数据库时，最好先理解它的<em>模式</em>（schema）。在终端窗口中运行 `sqlite3 movies.db`，就可以开始对数据库执行查询了。

首先，当 `sqlite3` 提示你输入查询时，输入 `.schema` 并按回车。这会输出用来创建数据库中每个表的 `CREATE TABLE` 语句。通过查看这些语句，你可以了解每个表中有哪些列。

注意，`movies` 表有一个唯一标识每部电影的 `id` 列，还有表示电影 `title`（标题）和上映 `year`（年份）的列。`people` 表也有一个 `id` 列，另外还有表示每个人的 `name`（姓名）和 `birth`（出生年份）的列。

电影评分则存储在 `ratings` 表中。该表的第一列是 `movie_id`：一个外键（foreign key），引用 `movies` 表的 `id`。这一行的其余部分包含每部电影的 `rating`（评分）以及该电影在 IMDb 上获得的 `votes`（投票数）的数据。

最后，`stars` 和 `directors` 表把人与他们出演或执导的电影对应起来。（只包含[主要](https://www.imdb.com/interfaces/)演员和导演。）每个表只有两列：`movie_id` 和 `person_id`，分别引用特定的电影和人物。

摆在你面前的挑战是，通过从其中一个或多个表中选取数据，编写 SQL 查询来回答各种不同的问题。

</details>

<details markdown="1"><summary>保持查询风格一致</summary>

关于 SQL 良好风格的要点，请参阅 [sqlstyle.guide](https://www.sqlstyle.guide/)，尤其是当你的查询变得更复杂时！

</details>

<details markdown="1"><summary>列出 2008 年上映的所有电影的标题</summary>

回忆一下，你可以用 `SELECT` 从数据库中选取一列（或多列），如下例所示，

```
SELECT column0, column1 FROM table;
```

其中 `column0` 是某一列的名称，`column1` 是另一列的名称。

还要回忆一下，你可以用 `WHERE` 关键字加一个条件，来过滤查询返回的行。你也可以使用 `=`、`>`、`<` 以及[其他运算符](https://www.w3schools.com/sql/sql_operators.asp)。

```
SELECT column FROM table
WHERE condition;
```

参阅[这份 SQL 关键字参考](https://www.w3schools.com/sql/sql_ref_keywords.asp)，了解一些可能有用的 SQL 语法！

</details>

<details markdown="1"><summary>求 Emma Stone 的出生年份</summary>

回忆一下，`WHERE` 子句不仅可以对数字求值判断条件，也可以对字符串这样做。

</details>

<details markdown="1"><summary>按字母顺序列出上映日期在 2018 年或之后的所有电影的标题</summary>

试着把这条查询分成两步。首先，找出上映日期在 2018 年或之后的电影。然后，把这些电影的标题按字母顺序排列。

要找出上映日期在 2018 年或之后的电影，回忆一下，SQL 中的条件支持使用许多常见的[比较运算符](https://www.w3schools.com/sql/sql_operators.asp)，包括表示“大于或等于”的 `>=`。对照[如何测试](/courses/cs50x/learn/pset-7-movies#how-to-test)，检查你的查询是否返回了正确数量的电影。

最后，把查询结果按标题的字母顺序排序。回忆一下，`ORDER BY` 可以按结果中的某一列对数据排序，如下例所示。

```
...
ORDER BY column;
```

</details>

<details markdown="1"><summary>求 IMDb 评分为 10.0 的电影数量</summary>

注意，这个问题要的不是评分为 10.0 的<em>单独</em>每部电影，而是这类电影的<em>数量</em>。换句话说，你应当把查询的结果收集（“聚合”，aggregate）成一个数（行数）。回忆一下，SQL 支持一个叫 `COUNT` 的“聚合函数”，你可以把它用在某一列上，如下例所示。

```
SELECT COUNT(column)
FROM table;
```

</details>

<details markdown="1"><summary>按时间顺序列出所有 Harry Potter 电影的标题和上映年份</summary>

对于这条查询，你很可能想用到 SQL 的 `LIKE` 关键字。回忆一下，`LIKE` 可以使用所谓的“通配符”，比如 `%`，它能匹配任意字符（或字符序列）。

```
SELECT column0, column1
FROM table
WHERE column1 LIKE pattern;
```

</details>

<details markdown="1"><summary>求 2012 年上映的所有电影的平均评分</summary>

这是另一个需要聚合数据的查询的例子。考虑用 SQL 的 `AVG` 聚合函数来计算平均值。

还要考虑到，这条查询用到了存储在两个独立的表 `ratings` 和 `movies` 中的数据。回忆一下，只要一个表有一个外键与另一个表中的某一列相匹配，你就可以用 SQL 的 `JOIN` 关键字把两个表合并起来。要使用 `JOIN` 关键字，你应指定要合并的表，以及合并所依据的列。

```
SELECT column0
FROM table0
JOIN table1 ON table0.column1 = table1.column2
```

</details>

<details markdown="1"><summary>列出 2010 年上映的所有电影及其评分，按评分降序排列</summary>

回忆一下，`ORDER BY` 并不总是按升序排序。你可以在后面加上 `DESC`，指定结果按<em>降序</em>排序。

```
...
ORDER BY column DESC;
```

</details>

<details markdown="1"><summary>列出所有主演 Toy Story 的人的姓名</summary>

当你看到像这样比较复杂的查询时，最好把它拆成更小的部分。最终，你的查询应得到一份姓名列表，如下所示。

```
-- Select names
SELECT name
FROM people
WHERE ...
```

但是，怎样才能最好地得到主演 Toy Story 的那些人的姓名呢？想一想，光靠 `people` 表并没有这些信息（但 `stars` 表可能有！）。的确，`stars` 表合并了两列，`person_id` 和 `movie_id`：任何 `person_id` 与 Toy Story 的 `movie_id` 相关联的人，都主演了 Toy Story。

```
-- Select names
SELECT name
FROM people
WHERE ...

-- Select person IDs
SELECT person_id
FROM stars
WHERE movie_id = ...
```

那么，自然的下一步就是找到 Toy Story 的电影 ID。

```
-- Select names
SELECT name
FROM people
WHERE ...

-- Select person IDs
SELECT person_id
FROM stars
WHERE movie_id = ...

-- Find Toy Story's ID
SELECT id
FROM movies
WHERE title = 'Toy Story';
```

当然，你目前写出了三条<em>独立的</em>查询。但请注意，有些查询（前两条）只要把紧接在它们下面的那条查询的结果包含进来，就完整了。让一条查询依赖于“子查询”（subquery）的结果，这个过程称为“嵌套”（nesting）查询。这几乎就是答案了，不过下面是嵌套上述查询的一种方法！

```
-- Select names
SELECT name
FROM people
WHERE id IN
(
    -- Select person IDs
    SELECT person_id
    FROM stars
    WHERE movie_id = (

        -- Select Toy Story's ID
        SELECT id
        FROM movies
        WHERE title = 'Toy Story'
    )
);
```

</details>

<details markdown="1"><summary>列出所有主演过 2004 年上映的电影的人的 ID 和姓名，按出生年份排序</summary>

注意，这条查询和上一条一样，需要你使用来自多个表的数据。回忆一下，你可以在 SQL 中“嵌套”查询，这样就能把一条较大的查询拆成较小的查询。也许你可以编写查询来……

1. 找出 2004 年上映的电影的 ID
2. 找出主演这些电影的人的 ID
3. 找出这些人 ID 对应的人的 ID 和姓名

然后，试着把这些查询嵌套起来，得到一条返回所有主演过 2004 年上映的电影的人的 ID 和姓名的查询。再想一想你该如何对查询结果排序。

最后提醒一点，要记住多个人可能同名。虽然每个人在你的结果中应只出现一次，但两位主演同名并不一定意味着他们是同一个人。

</details>

<details markdown="1"><summary>列出所有执导过评分至少为 9.0 的电影的人的姓名</summary>

注意，这条查询和上一条一样，需要你使用来自多个表的数据。回忆一下，你可以在 SQL 中“嵌套”查询，这样就能把一条较大的查询拆成较小的查询。也许你可以编写查询来……

1. 找出评分至少为 9.0 的电影的 ID
2. 找出执导这些电影的人的 ID
3. 找出这些人 ID 对应的人的姓名

然后，试着把这些查询嵌套起来，得到一条返回所有执导过评分至少为 9.0 的电影的人的姓名的查询。

</details>

<details markdown="1"><summary>列出 Chadwick Boseman 主演的评分最高的五部电影的标题（按顺序），从评分最高的开始</summary>

注意，这条查询和上一条一样，需要你使用来自多个表的数据。回忆一下，你可以在 SQL 中“嵌套”查询，这样就能把一条较大的查询拆成较小的查询。也许你可以编写查询来……

1. 找出 Chadwick Boseman 的 ID
2. 找出与 Chadwick Boseman 的 ID 相关联的电影的 ID
3. 找出这些电影 ID 对应的电影标题

然后，试着把这些查询嵌套起来，得到一条返回 Chadwick Boseman 的电影标题的查询。

接下来，你需要确定这些电影的评分，并把这些标题按评分降序排序。想一想你可以如何合并一个相关的表（很可能是 `ratings`！），并按相关的列对结果排序。

最后，了解一下 SQL 的 [`LIMIT`](https://www.sqlitetutorial.net/sqlite-limit/) 关键字，它会返回查询结果的前 \(n\) 行。

</details>

<details markdown="1"><summary>列出 Bradley Cooper 和 Jennifer Lawrence 同时主演的所有电影的标题</summary>

注意，这条查询和上一条一样，需要你使用来自多个表的数据。回忆一下，你可以在 SQL 中“嵌套”查询，这样就能把一条较大的查询拆成较小的查询。也许你可以编写查询来……

1. 找出 Bradley Cooper 的 ID
2. 找出 Jennifer Lawrence 的 ID
3. 找出与 Bradley Cooper 的 ID 相关联的电影的 ID
4. 找出与 Jennifer Lawrence 的 ID 相关联的电影的 ID
5. 从同时与 Bradley Cooper 和 Jennifer Lawrence <em>两人</em>相关联的电影 ID 中找出电影标题

然后，试着把这些查询嵌套起来，得到一条返回 Bradley Cooper 和 Jennifer Lawrence 同时主演的电影的查询。

回忆一下，你可以在 SQL 中用 `AND` 或 `OR` 构建复合条件。

</details>

<details markdown="1"><summary>列出所有与 Kevin Bacon 共同主演过同一部电影的人的姓名</summary>

注意，这条查询和上一条一样，需要你使用来自多个表的数据。回忆一下，你可以在 SQL 中“嵌套”查询，这样就能把一条较大的查询拆成较小的查询。也许你可以编写查询来……

1. 找出 Kevin Bacon 的 ID（1958 年出生的那位！）
2. 找出与 Kevin Bacon 的 ID 相关联的电影的 ID
3. 找出与这些电影 ID 相关联的人的 ID
4. 找出这些人 ID 对应的人的姓名

然后，试着把这些查询嵌套起来，得到一条返回所有与 Kevin Bacon 共同主演过同一部电影的人的姓名的查询。<strong>记住，你需要把 Kevin Bacon 本人从结果中排除！</strong>

</details>

## 讲解视频

<!-- video: v5_A3giDlQs -->
[▶ 视频](https://www.youtube.com/watch?v=v5_A3giDlQs)

## 用法

要在 VS Code 中测试你的查询，可以运行

```
$ cat filename.sql | sqlite3 movies.db
```

来查询数据库，其中 `filename.sql` 是包含你的 SQL 查询的文件。

你也可以运行

```
$ cat filename.sql | sqlite3 movies.db > output.txt
```

把查询的输出重定向到名为 `output.txt` 的文本文件。（这对检查你的查询返回了多少行很有用！）

## 如何测试

虽然这道题可以使用 `check50`，但我们鼓励你改为先自己针对下面每一项测试你的代码。你可以运行 `sqlite3 movies.db` 对数据库执行额外的查询，以确保你的结果是正确的。

如果你使用的是本习题集发行代码中提供的 `movies.db` 数据库，你应该会发现

- 执行 `1.sql` 得到一个 1 列 10,647 行的表。
- 执行 `2.sql` 得到一个 1 列 1 行的表。
- 执行 `3.sql` 得到一个 1 列 154,665 行的表。
- 执行 `4.sql` 得到一个 1 列 1 行的表。
- 执行 `5.sql` 得到一个 2 列 18 行的表。
- 执行 `6.sql` 得到一个 1 列 1 行的表。
- 执行 `7.sql` 得到一个 2 列 7,386 行的表。
- 执行 `8.sql` 得到一个 1 列 10 行的表。
- 执行 `9.sql` 得到一个 2 列 36,219 行的表。
- 执行 `10.sql` 得到一个 1 列 4,675 行的表。
- 执行 `11.sql` 得到一个 1 列 5 行的表。
- 执行 `12.sql` 得到一个 1 列 4 行的表。
- 执行 `13.sql` 得到一个 1 列 550 行的表。

请注意，行数不包括只显示列名的表头行。

如果你的查询返回的行数与预期输出略有不同，请确保你正确处理了重复项！对于要求列出姓名的查询，同一个人不应被列出两次，但两个同名的不同的人应当各自被列出。

### 正确性

```
check50 cs50/problems/2026/x/movies
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/movies
```

## 致谢

信息由 IMDb（[imdb.com](https://www.imdb.com)）提供，经许可使用。
