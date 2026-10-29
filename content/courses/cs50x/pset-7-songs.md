# Songs

![Spotify Wrapped '22 Logo](https://cs50.harvard.edu/x/psets/7/songs/wrapped.png)

## 要解决的问题

编写 SQL 查询，回答关于一个数据库的问题，该数据库收录了 2018 年 [Spotify](https://en.wikipedia.org/wiki/Spotify) 上播放量最高的 100 首歌曲。

## 演示

## 开始

这道题会用到 CS50 课程组提供给你的数据库。

<details markdown="1"><summary>下载发行代码</summary>

打开 [VS Code](https://cs50.dev/)。

先点击终端窗口内部，然后单独执行 `cd`。你应该会发现它的“提示符”类似下面这样。

```
$
```

点击该终端窗口内部，然后执行

```
wget https://cdn.cs50.net/2026/x/psets/7/songs.zip
```

再按回车，把名为 `songs.zip` 的 ZIP 文件下载到你的 codespace 中。注意不要漏掉 `wget` 和后面的 URL 之间的空格，也不要漏掉其他任何字符！

现在执行

```
unzip songs.zip
```

创建一个名为 `songs` 的文件夹。你不再需要这个 ZIP 文件了，所以可以执行

```
rm songs.zip
```

并在提示时输入“y”后按回车，删除你下载的 ZIP 文件。

现在输入

```
cd songs
```

再按回车，进入（即打开）该目录。你的提示符现在应该类似下面这样。

```
songs/ $
```

如果一切顺利，你应该执行

```
ls
```

然后会看到 8 个 .sql 文件、`songs.db` 和 `answers.txt`。

如果遇到任何问题，请重新按这些步骤操作一遍，看看能否找出哪里出了错！

</details>

## 了解数据

课程提供给你的是一个名为 `songs.db` 的文件，这是一个 SQLite 数据库，存储着来自 [Spotify](https://developer.spotify.com/documentation/web-api/) 的歌曲及其艺术家的数据。这个数据集包含 2018 年 Spotify 上播放量最高的 100 首歌曲。在终端窗口中运行 `sqlite3 songs.db`，就可以开始对数据库执行查询了。

首先，当 `sqlite3` 提示你输入查询时，输入 `.schema` 并按回车。这会输出用来创建数据库中每个表的 `CREATE TABLE` 语句。通过查看这些语句，你可以了解每个表中有哪些列。

注意，每位 `artist` 都有一个 `id` 和一个 `name`。还要注意，每首歌曲都有一个 `name`、一个 `artist_id`（对应这首歌曲的艺术家的 `id`），以及这首歌曲的可舞性（danceability）、能量（energy）、调（key）、响度（loudness）、言语性（speechiness，即曲目中出现口语内容的程度）、愉悦度（valence）、速度（tempo）和时长（以毫秒计）的取值。

摆在你面前的挑战是，通过从其中一个或多个表中选取数据，编写 SQL 查询来回答各种不同的问题。完成之后，你将思考 Spotify 可能如何在其年度 [Spotify Wrapped](https://en.wikipedia.org/wiki/Spotify_Wrapped) 活动中使用这些相同的数据来描绘听众的习惯。

## 实现细节

对于下面的每个问题，你都应编写一条 SQL 查询，输出该问题所指定的结果。你的答案必须是单独一条 SQL 查询，不过你可以在查询内部嵌套其他查询。你<strong>不应</strong>对任何特定歌曲或艺术家的 `id` 做任何假设：即使某首歌曲或某个人的 `id` 不同，你的查询也应当是正确的。最后，每条查询应只返回回答问题所需的数据：例如，如果题目只要求你输出歌曲名称，那么你的查询就不应同时输出每首歌曲的速度。

1. 在
   
   1.sql
   
   中，编写一条 SQL 查询，列出数据库中所有歌曲的名称。
   
   - 你的查询应输出一个表，只有一列，即每首歌曲的名称。
2. 在
   
   2.sql
   
   中，编写一条 SQL 查询，按速度从低到高列出所有歌曲的名称。
   
   - 你的查询应输出一个表，只有一列，即每首歌曲的名称。
3. 在
   
   3.sql
   
   中，编写一条 SQL 查询，按时长从长到短列出最长的 5 首歌曲的名称。
   
   - 你的查询应输出一个表，只有一列，即每首歌曲的名称。
4. 在
   
   4.sql
   
   中，编写一条 SQL 查询，列出可舞性、能量和愉悦度都大于 0.75 的歌曲的名称。
   
   - 你的查询应输出一个表，只有一列，即每首歌曲的名称。
5. 在
   
   5.sql
   
   中，编写一条 SQL 查询，返回所有歌曲的平均能量。
   
   - 你的查询应输出一个表，只有一列一行，内容是平均能量。
6. 在
   
   6.sql
   
   中，编写一条 SQL 查询，列出 Post Malone 演唱的歌曲的名称。
   
   - 你的查询应输出一个表，只有一列，即每首歌曲的名称。
   - 你不应对 Post Malone 的 `artist_id` 是多少做任何假设。
7. 在
   
   7.sql
   
   中，编写一条 SQL 查询，返回 Drake 演唱的歌曲的平均能量。
   
   - 你的查询应输出一个表，只有一列一行，内容是平均能量。
   - 你不应对 Drake 的 `artist_id` 是多少做任何假设。
8. 在
   
   8.sql
   
   中，编写一条 SQL 查询，列出有其他艺术家参与（feature）的歌曲的名称。
   
   - 有其他艺术家参与的歌曲，歌名中会包含“feat.”。
   - 你的查询应输出一个表，只有一列，即每首歌曲的名称。

## 提示

参阅[这份 SQL 关键字参考](https://www.w3schools.com/sql/sql_ref_keywords.asp)，了解一些可能有用的 SQL 语法！

<details markdown="1"><summary>列出数据库中所有歌曲的名称</summary>

回忆一下，要选取表中某一列的所有值，可以使用 SQL 的 `SELECT` 关键字。`SELECT` 后面跟着你想选取的列（一列或多列），再后面是 `FROM table`，其中 `table` 是你想从中选取数据的表的名称。

所以，在 `1.sql` 中，试着这样写：

```
-- All songs in the database.
SELECT name
FROM songs;
```

</details>

<details markdown="1"><summary>按速度从低到高列出所有歌曲的名称</summary>

回忆一下，SQL 有一个 `ORDER BY` 关键字，你可以用它按某一列的值对查询结果排序。例如，`ORDER BY tempo` 会按 `tempo` 这一列对结果排序。

所以，在 `2.sql` 中，试着这样写：

```
-- All songs in increasing order of tempo.
SELECT name
FROM songs
ORDER BY tempo;
```

</details>

<details markdown="1"><summary>按时长从长到短列出最长的 5 首歌曲的名称</summary>

回忆一下，`ORDER BY` 并不总是按升序排序。你可以在后面加上 `DESC`，指定结果按<em>降序</em>排序。例如，`ORDER BY duration_ms DESC` 会按时长降序列出结果。

还要回忆一下，`LIMIT n` 可以指定你只想要匹配某个查询的前 \(n\) 行。例如，`LIMIT 5` 只会返回查询的前五个结果。

所以，在 `3.sql` 中，试着这样写：

```
-- The names of the top 5 longest songs, in descending order of length.
SELECT name
FROM songs
ORDER BY duration_ms DESC
LIMIT 5;
```

</details>

<details markdown="1"><summary>列出可舞性、能量和愉悦度都大于 0.75 的歌曲的名称</summary>

回忆一下，你可以用 `WHERE` 子句在 SQL 中筛选结果，`WHERE` 后面跟着某个条件，通常用来测试一行中各列的值。

还要回忆一下，SQL 的运算符与 C 的运算符用法大体相同。例如，当左边的值大于右边的值时，`>` 的结果为“真”。你可以用 `AND` 或 `OR` 把这些表达式串联起来，组成一个更大的条件。

所以，在 `4.sql` 中，试着这样写：

```
-- The names of any songs that have danceability, energy, and valence greater than 0.75.
SELECT name
FROM songs
WHERE danceability > 0.75 AND energy > 0.75 AND valence > 0.75;
```

</details>

<details markdown="1"><summary>求所有歌曲的平均能量</summary>

回忆一下，SQL 支持的关键字不仅能选取特定的行，还能对这些行中的数据进行<em>聚合</em>。特别是，你可能会觉得 `AVG` 关键字（用来计算平均值）很有用。要对某一列的结果进行聚合，只需把聚合函数应用到那一列上。例如，`SELECT AVG(energy)` 会求出给定查询中 energy 列的值的平均数。

所以，在 `5.sql` 中，试着这样写：

```
-- The average energy of all the songs.
SELECT AVG(energy)
FROM songs;
```

</details>

<details markdown="1"><summary>列出 Post Malone 演唱的歌曲的名称</summary>

注意，如果你在 sqlite 提示符下执行 `.schema songs`，会发现 `songs` 表里有歌曲名称，但没有艺术家名称！取而代之的是，`songs` 有一个 `artist_id` 列。所以，要列出 Post Malone 演唱的歌曲的名称，你首先需要找出 Post Malone 的 artist id。

```
-- Identify Post Malone's artist id
SELECT id
FROM artists
WHERE name = 'Post Malone';
```

这条查询返回 54。现在，你可以在 `songs` 表中查询所有带有 Post Malone 的 id 的歌曲。

```
SELECT name
FROM songs
WHERE artist_id = 54;
```

但是，按照要求，你应当注意不要预设知道任何 id。你可以通过把这两条查询<em>嵌套</em>起来，改进这条查询的设计。

所以，在 `6.sql` 中，试着这样写：

```
-- The names of songs that are by Post Malone.
SELECT name
FROM songs
WHERE artist_id =
(
    SELECT id
    FROM artists
    WHERE name = 'Post Malone'
);
```

</details>

<details markdown="1"><summary>求 Drake 演唱的歌曲的平均能量</summary>

注意，与上一条查询类似，你需要合并多个表才能成功运行这条查询。你可以再次使用嵌套的子查询，不过也想一想另一种办法！

回忆一下，你可以用 SQL 的 `JOIN` 关键字把多个表合并成一个，只要你指定这些表中哪些列最终应当匹配。例如，下面的查询合并了 `songs` 和 `artists` 两个表，指明 `songs` 表中的 `artist_id` 列与 `artists` 表中的 `id` 列应当匹配：

```
SELECT *
FROM songs
JOIN artists ON songs.artist_id = artists.id
```

把这两个表合并之后，剩下的只是筛选你的选取结果，求出 Drake 演唱的歌曲的平均能量。

所以，在 `7.sql` 中，试着这样写：

```
-- The average energy of songs that are by Drake
SELECT AVG(energy)
FROM songs
JOIN artists ON songs.artist_id = artists.id
WHERE artists.name = 'Drake';
```

</details>

<details markdown="1"><summary>列出有其他艺术家参与的歌曲的名称</summary>

对于这条查询，请注意，有其他艺术家参与的歌曲，标题中通常会有“feat.”字样。回忆一下，SQL 的 `LIKE` 关键字可以用来匹配含有某些短语（比如“feat.”！）的字符串。为此，你可以使用 `%`：一个匹配任意字符序列的通配符。

所以，在 `8.sql` 中，试着这样写：

```
-- The names of songs that feature other artists.
SELECT name
FROM songs
WHERE name LIKE '%feat.%';
```

</details>

## 讲解视频

[https://video.cs50.io/wgKPUd_95AA](https://video.cs50.io/wgKPUd_95AA)

<details markdown="1"><summary>不知道怎么解决？</summary>

</details>

## Spotify Wrapped

[Spotify Wrapped](https://en.wikipedia.org/wiki/Spotify_Wrapped) 是一项功能，向 Spotify 用户展示他们过去一年播放次数最多的 100 首歌曲。2021 年，Spotify Wrapped 为每位用户计算了一个[“音频光环”（Audio Aura）](https://newsroom.spotify.com/2021-12-01/learn-more-about-the-audio-aura-in-your-spotify-2021-wrapped-with-aura-reader-mystic-michaela/)，即“根据[他们]全年最常听的歌曲和艺术家，解读[他们]最突出的两种情绪”。假设 Spotify 通过查看一个人过去一年最常听的 100 首歌曲的平均能量、愉悦度和可舞性来确定音频光环。请在 `answers.txt` 中思考下面的问题：

- 如果 `songs.db` 包含某位听众 2018 年最常听的 100 首歌曲，你会如何描述他们的音频光环？
- 请假设一下，为什么你计算这种光环的方式可能<em>不太</em>能代表这位听众？你会提议用哪些更好的方式来计算这种光环？

务必把 `answers.txt` 与你的每个 `.sql` 文件一起提交！

## 如何测试

### 正确性

```
check50 cs50/problems/2026/x/songs
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/songs
```
