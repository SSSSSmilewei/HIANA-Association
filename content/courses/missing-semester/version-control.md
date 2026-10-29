<!-- video: 9K8lB61dl3Y -->

版本控制系统（Version Control System，VCS）是用来跟踪源代码（或其他文件和文件夹集合）变更的工具。
顾名思义，这些工具帮助我们维护变更历史；此外，它们还能促进协作。
从逻辑上讲，VCS 以一系列<em>快照（snapshot）</em>的形式跟踪某个文件夹及其内容的变化，
每个快照都封装了某个顶层目录下所有文件/文件夹的完整状态。
VCS 还会维护元数据，比如是谁创建了每个快照、每个快照附带的说明信息，等等。

版本控制为什么有用？即使你是一个人工作，它也能让你查看项目的旧快照、记录某些变更的原因、
在不同的分支上并行开发，等等。
和别人一起工作时，它更是不可或缺的工具：你可以看到其他人改了什么，也可以解决并发开发中产生的冲突。

现代 VCS 还能让你轻松（而且往往是自动地）回答这样的问题：

- 这个模块是谁写的？
- 这个文件的这一行是什么时候被修改的？是谁改的？为什么要改？
- 在过去的 1000 次修订中，某个单元测试是什么时候、因为什么不再正常工作的？

虽然还有其他 VCS，但 <strong>Git</strong> 是版本控制事实上的标准。
这幅 [XKCD 漫画](https://xkcd.com/1597/)道出了 Git 的名声：

![xkcd 1597](https://imgs.xkcd.com/comics/git.png)

由于 Git 的接口是一个有漏洞的抽象（leaky abstraction），自顶向下地学习 Git（从它的接口/命令行界面入手）很容易让人困惑。
你可能会死记硬背几条命令，把它们当成魔法咒语，一旦出了问题就照着上面那幅漫画里的办法来处理。

Git 的接口确实很丑陋，但它底层的设计和思想却很优美。
丑陋的接口只能靠<em>死记硬背</em>，而优美的设计则可以被<em>理解</em>。
因此，我们自底向上地讲解 Git，先从数据模型讲起，之后再介绍命令行界面。
一旦理解了数据模型，就能更好地从“命令如何操作底层数据模型”的角度来理解这些命令。

# Git 的数据模型

Git 的精妙之处在于它经过深思熟虑的数据模型，正是这个模型使得版本控制的各种优秀特性成为可能，
例如维护历史、支持分支以及促进协作。

## 快照

Git 把某个顶层目录下的一组文件和文件夹的历史建模为一系列快照。
用 Git 的术语来说，文件称为“blob”，它只是一堆字节。
目录称为“tree”，它把名称映射到 blob 或 tree（因此目录可以包含其他目录）。
快照就是被跟踪的顶层 tree。
例如，我们可能有这样一棵 tree：

```
<root> (tree)
|
+- foo (tree)
|  |
|  + bar.txt (blob, contents = "hello world")
|
+- baz.txt (blob, contents = "git is wonderful")
```

这个顶层 tree 包含两个元素：一个 tree “foo”（它本身包含一个元素，即 blob “bar.txt”），以及一个 blob “baz.txt”。

## 历史建模：关联快照

版本控制系统应该如何把快照关联起来？一种简单的模型是采用线性历史：历史就是按时间顺序排列的快照列表。
出于很多原因，Git 并没有使用这样简单的模型。

在 Git 中，历史是由快照构成的有向无环图（directed acyclic graph，DAG）。
这听起来可能像个花哨的数学名词，但不必被它吓到。
它的意思只是：Git 中的每个快照都会引用一组“父节点（parent）”，也就是在它之前的那些快照。
这里是一组父节点而不是单个父节点（线性历史中就是单个父节点），
是因为一个快照可能来自多个父节点，例如把两条并行的开发分支合并（merge）起来的时候。

Git 把这些快照称为“commit（提交）”。提交历史的可视化可能像下面这样：

```
o <-- o <-- o <-- o
            ^
             \
              --- o <-- o
```

在上面的 ASCII 图中，每个 `o` 对应一个提交（快照）。
箭头指向每个提交的父节点（这是“在……之前”的关系，而不是“在……之后”）。
在第三个提交之后，历史分成了两条独立的分支。
这可能对应着，比如说，两个独立的功能正在并行开发、互不影响。
将来，这两条分支可能会被合并，创建出一个同时包含这两个功能的新快照，
得到一份新的历史，如下所示，其中新创建的合并提交（merge commit）以粗体显示：

<pre class="highlight">
<code>
o <-- o <-- o <-- o <---- <strong>o</strong>
            ^            /
             \          v
              --- o <-- o
</code>
</pre>

Git 中的提交是不可变的（immutable）。
但这并不意味着错误无法纠正；只不过，对提交历史的“编辑”实际上是创建全新的提交，
然后更新引用（见下文）使其指向新的提交。

## 用伪代码表示数据模型

用伪代码把 Git 的数据模型写下来，或许会很有启发：

```
// a file is a bunch of bytes
type blob = array<byte>

// a directory contains named files and directories
type tree = map<string, tree | blob>

// a commit has parents, metadata, and the top-level tree
type commit = struct {
    parents: array<commit>
    author: string
    message: string
    snapshot: tree
}
```

这是一个简洁明了的历史模型。

## 对象与内容寻址

“对象（object）”可以是 blob、tree 或 commit：

```
type object = blob | tree | commit
```

在 Git 的数据存储中，所有对象都通过其 [SHA-1
哈希](https://en.wikipedia.org/wiki/SHA-1)进行内容寻址（content-addressed）。

```
objects = map<string, object>

def store(object):
    id = sha1(object)
    objects[id] = object

def load(id):
    return objects[id]
```

blob、tree 和 commit 以这种方式统一起来：它们都是对象。
当它们引用其他对象时，在磁盘上的表示中并不真正<em>包含</em>这些对象，而是通过哈希值来引用它们。

例如，上面[示例目录结构](#snapshots)对应的 tree
（可通过 `git cat-file -p 698281bc680d1995c5f4caaf3359721a5a58d48d` 查看）如下所示：

```
100644 blob 4448adbf7ecd394f42ae135bbeed9676e894af85    baz.txt
040000 tree c68d233a33c5c06e0340e4c224f0afca87c8ce87    foo
```

这个 tree 本身包含指向其内容的指针，即 `baz.txt`（一个 blob）和 `foo`（一个 tree）。
如果我们用 `git cat-file -p 4448adbf7ecd394f42ae135bbeed9676e894af85` 查看 baz.txt 对应哈希值所指向的内容，会得到：

```
git is wonderful
```

## 引用

现在，所有快照都可以通过各自的 SHA-1 哈希值来标识。
但这很不方便，因为人类并不擅长记住由 40 个十六进制字符组成的字符串。

Git 对这个问题的解决方案是给 SHA-1 哈希值起人类可读的名字，称为“引用（reference）”。
引用是指向提交的指针。
与不可变的对象不同，引用是可变的（可以更新为指向新的提交）。
例如，`master` 引用通常指向主分支上最新的提交。

```
references = map<string, string>

def update_reference(name, id):
    references[name] = id

def read_reference(name):
    return references[name]

def load_reference(name_or_id):
    if name_or_id in references:
        return load(references[name_or_id])
    else:
        return load(name_or_id)
```

有了这个机制，Git 就可以用“master”这样人类可读的名字来指代历史中的某个特定快照，而不必使用一长串十六进制字符。

还有一个细节：我们通常需要一个“我们当前在哪里”的概念，这样在创建新快照时，才知道它是相对于哪个快照的
（也就是如何设置提交的 `parents` 字段）。
在 Git 中，“我们当前所在的位置”是一个名为“HEAD”的特殊引用。

## 仓库

最后，我们可以（大致地）定义什么是 Git <em>仓库（repository）</em>：它就是数据 `objects` 和 `references`。

在磁盘上，Git 存储的全部内容就是对象和引用：这就是 Git 数据模型的全部。
所有 `git` 命令都对应于对提交 DAG 的某种操作，即添加对象以及添加/更新引用。

无论输入什么命令，都要想一想这条命令对底层的图数据结构做了什么操作。
反过来，如果你想对提交 DAG 做某种特定的修改，例如“丢弃未提交的更改，并让 ‘master’ 引用指向提交 `5d83f9e`”，
那很可能有对应的命令可以做到
（比如这个例子中是 `git checkout master; git reset
--hard 5d83f9e`）。

# 暂存区

这是另一个与数据模型相互独立的概念，但它是创建提交所用接口的一部分。

你可能会设想这样一种快照的实现方式：提供一个“创建快照”命令，基于工作目录的<em>当前状态</em>创建新快照。
有些版本控制工具就是这样工作的，但 Git 不是。
我们想要干净的快照，而基于当前状态创建快照并不总是理想的。
例如，假设你实现了两个独立的功能，并且想创建两个独立的提交，第一个引入第一个功能，下一个引入第二个功能。
又或者，假设你的代码里到处加了用于调试的打印语句，同时还有一个 bug 修复；
你希望提交这个 bug 修复，同时丢弃所有的打印语句。

Git 通过一种叫做“暂存区（staging area）”的机制来应对这些场景，
它允许你指定哪些修改应该包含在下一个快照中。

# Git 命令行界面

为避免重复信息，我们不会在这份讲义中详细解释下面的各条命令。
更多信息请参阅强烈推荐的 [Pro Git](https://git-scm.com/book/en/v2)，或者观看讲座视频。

## 基础

- `git help <command>`：获取 git 命令的帮助
- `git init`：创建一个新的 git 仓库，数据存储在 `.git` 目录中
- `git status`：告诉你当前的状态
- `git add <filename>`：将文件添加到暂存区
- `git commit`：创建一个新的提交
    - 请写[好的提交信息](https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)！
    - 还有更多写[好的提交信息](https://chris.beams.io/posts/git-commit/)的理由！
- `git log`：显示扁平化的历史日志
- `git log --all --graph --decorate`：将历史可视化为 DAG
- `git diff <filename>`：显示相对于暂存区你所做的更改
- `git diff <revision> <filename>`：显示某个文件在不同快照之间的差异
- `git checkout <revision>`：更新 HEAD（如果检出的是分支，则同时更新当前分支）

## 分支与合并

- `git branch`：显示分支
- `git branch <name>`：创建分支
- `git switch <name>`：切换到某个分支
- `git checkout -b <name>`：创建分支并切换到该分支
    - 等同于 `git branch <name>; git switch <name>`
- `git merge <revision>`：合并到当前分支
- `git mergetool`：使用一个好用的工具来帮助解决合并冲突
- `git rebase`：将一组补丁变基（rebase）到新的基底上

## 远程仓库

- `git remote`：列出远程仓库
- `git remote add <name> <url>`：添加一个远程仓库
- `git push <remote> <local branch>:<remote branch>`：把对象发送到远程仓库，并更新远程引用
- `git branch --set-upstream-to=<remote>/<remote branch>`：建立本地分支与远程分支之间的对应关系
- `git fetch`：从远程仓库获取对象/引用
- `git pull`：等同于 `git fetch; git merge`
- `git clone`：从远程仓库下载仓库

## 撤销

- `git commit --amend`：编辑提交的内容/信息
- `git reset <file>`：取消暂存某个文件
- `git restore`：丢弃更改

# Git 进阶

- `git config`：Git [高度可定制](https://git-scm.com/docs/git-config)
- `git clone --depth=1`：浅克隆，不包含完整的版本历史
- `git add -p`：交互式暂存
- `git rebase -i`：交互式变基
- `git blame`：显示每一行最后是由谁编辑的
- `git stash`：临时移除工作目录中的修改
- `git bisect`：对历史进行二分查找（例如用于定位回归问题）
- `git revert`：创建一个新的提交，抵消先前某个提交的影响
- `git worktree`：同时检出多个分支
- `.gitignore`：[指定](https://git-scm.com/docs/gitignore)需要有意不跟踪、应被忽略的文件

# 杂项

- <strong>图形界面</strong>：Git 有很多[图形界面客户端](https://git-scm.com/downloads/guis)。
我们个人不用它们，而是使用命令行界面。
- <strong>Shell 集成</strong>：把 Git 状态放进 shell 提示符中非常方便
（[zsh](https://github.com/olivierverdier/zsh-git-prompt)、
[bash](https://github.com/magicmonty/bash-git-prompt)）。
它通常包含在 [Oh My Zsh](https://github.com/ohmyzsh/ohmyzsh) 之类的框架中。
- <strong>编辑器集成</strong>：与上面类似，许多编辑器都提供了方便的集成，功能丰富。
[fugitive.vim](https://github.com/tpope/vim-fugitive) 是 Vim 的标准选择。
- <strong>工作流</strong>：我们讲了数据模型和一些基本命令；
但没有告诉你在大型项目中应该遵循什么样的实践
（而且有[很多](https://nvie.com/posts/a-successful-git-branching-model/)
[不同的](https://www.endoflineblog.com/gitflow-considered-harmful)
[做法](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)）。
- <strong>GitHub</strong>：Git 不等于 GitHub。GitHub 有一套向其他项目贡献代码的特定方式，叫做
[拉取请求（pull request）](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests)。
- <strong>其他 Git 托管服务</strong>：GitHub 并不特殊：还有许多 Git 仓库托管服务，比如
[GitLab](https://about.gitlab.com/) 和
[BitBucket](https://bitbucket.org/)。

# 资源

- 强烈推荐阅读 [Pro Git](https://git-scm.com/book/en/v2)。
既然你已经理解了数据模型，读完第 1--5 章应该就能学到熟练使用 Git 所需的大部分知识。
后面的章节还有一些有趣的进阶内容。
- [Oh Shit, Git!?!](https://ohshitgit.com/) 是一份简短的指南，介绍如何从一些常见的 Git 错误中恢复。
- [Git for Computer
Scientists](https://eagain.net/articles/git-for-computer-scientists/)
简短地讲解了 Git 的数据模型，与这份讲义相比，伪代码更少，图示更精美。
- [Git from the Bottom Up](https://jwiegley.github.io/git-from-the-bottom-up/)
详细讲解了 Git 在数据模型之外的实现细节，适合好奇的读者。
- [How to explain git in simple
words](https://smusamashah.github.io/blog/2017/10/14/explain-git-in-simple-words)
- [Learn Git Branching](https://learngitbranching.js.org/) 是一个基于浏览器的游戏，教你学习 Git。

# 课后练习

1. 如果你以前没有接触过 Git，可以试着阅读 [Pro Git](https://git-scm.com/book/en/v2) 的前几章，
   或者跟着 [Learn Git Branching](https://learngitbranching.js.org/) 之类的教程走一遍。
   学习过程中，请把 Git 命令与数据模型联系起来。
1. 克隆[课程网站的仓库](https://github.com/missing-semester/missing-semester)。
    1. 通过将版本历史可视化为图来探索它。
    1. 最后一个修改 `README.md` 的人是谁？（提示：给 `git log` 加上参数。）
    1. 最后一次修改 `_config.yml` 中 `collections:` 那一行时，对应的提交信息是什么？
       （提示：使用 `git blame` 和 `git
       show`。）
1. 学习 Git 时一个常见的错误是提交了不该由 Git 管理的大文件，或者添加了敏感信息。
   试着向仓库中添加一个文件，做几次提交，然后把该文件从<em>历史</em>中删除
   （而不仅仅是从最新的提交中删除）。
   你可以参考[这个](https://help.github.com/articles/removing-sensitive-data-from-a-repository/)。
1. 从 GitHub 克隆某个仓库，并修改其中一个已有的文件。
   执行 `git stash` 会发生什么？运行 `git log
   --all --oneline` 时你看到了什么？运行 `git stash pop` 来撤销你用 `git stash` 所做的操作。
   这在什么场景下可能有用？
1. 和许多命令行工具一样，Git 提供了一个配置文件（或称 dotfile），即 `~/.gitconfig`。
   在 `~/.gitconfig` 中创建一个别名（alias），使得运行 `git graph` 时，得到的是 `git log --all --graph --decorate
   --oneline` 的输出。
   你可以直接[编辑](https://git-scm.com/docs/git-config#Documentation/git-config.txt-alias) `~/.gitconfig` 文件，
   也可以使用 `git config` 命令来添加这个别名。
   关于 git 别名的信息可以在[这里](https://git-scm.com/book/en/v2/Git-Basics-Git-Aliases)找到。
1. 运行 `git config --global core.excludesfile ~/.gitignore_global` 之后，
   你可以在 `~/.gitignore_global` 中定义全局忽略规则。
   这会设置 Git 所使用的全局忽略文件的位置，但你仍然需要手动在该路径下创建这个文件。
   设置好你的全局 gitignore 文件，让它忽略特定于操作系统或编辑器的临时文件，比如 `.DS_Store`。
1. Fork [课程网站的仓库](https://github.com/missing-semester/missing-semester)，
   找出一个拼写错误或其他可以改进的地方，并在 GitHub 上提交一个拉取请求
   （你可能需要参考[这个](https://github.com/firstcontributions/first-contributions)）。
   请只提交有用的 PR（请不要向我们发垃圾 PR！）。
   如果你找不到可以改进的地方，可以跳过这道练习。
1. 通过模拟协作场景来练习解决合并冲突：
    1. 用 `git init` 创建一个新仓库，并创建一个名为 `recipe.txt` 的文件，写上几行内容（例如一份简单的食谱）。
    1. 提交它，然后创建两个分支：`git branch salty` 和 `git branch
       sweet`。
    1. 在 `salty` 分支中修改某一行（例如把“1 cup sugar”改成“1
       cup salt”）并提交。
    1. 在 `sweet` 分支中以不同的方式修改同一行（例如把“1
       cup sugar”改成“2 cups sugar”）并提交。
    1. 现在切换到 `master`，先尝试 `git merge salty`，再尝试 `git merge
       sweet`。会发生什么？看看 `recipe.txt` 的内容——`<<<<<<<`、`=======` 和 `>>>>>>>` 这些标记是什么意思？
    1. 通过编辑文件来解决冲突，保留你想要的内容，删除冲突标记，然后用 `git add` 和 `git commit`
       （或 `git merge --continue`）完成合并。
       或者，也可以试试使用 `git mergetool`，借助图形界面或终端界面的合并工具来解决冲突。
    1. 使用 `git log --graph --oneline` 将你刚刚创建的合并历史可视化。
