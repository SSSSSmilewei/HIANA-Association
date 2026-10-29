<!-- video: KBMiB-8P4Ns -->

让代码按预期工作已经不容易，而让同一份代码在另一台机器上也能运行，往往更难。

发布代码（shipping code），指的是把你写的代码转换成一种可用的形式，让别人无需复刻你电脑的完整配置也能运行它。
发布代码有多种形式，取决于编程语言、系统库、操作系统等诸多因素的选择。
它还取决于你在构建什么：软件库、命令行工具和 Web 服务，各自有不同的要求和部署步骤。
尽管如此，所有这些场景都有一个共同的模式：我们需要明确交付物是什么——也就是所谓的<em>构件（artifact）</em>——以及它对周围环境做了哪些假设。

本讲将涵盖：

- [依赖与环境](#依赖与环境)
- [构件与打包](#构件与打包)
- [发布与版本管理](#发布与版本管理)
- [可复现性](#可复现性)
- [虚拟机与容器](#虚拟机与容器)
- [配置](#配置)
- [服务与编排](#服务与编排)
- [对外发布](#对外发布)

我们会通过 Python 生态中的例子来讲解这些概念，因为具体的例子有助于理解。虽然其他编程语言生态使用的工具不同，但概念在很大程度上是相通的。

# 依赖与环境

在现代软件开发中，抽象层无处不在。
程序自然而然地会把一部分逻辑交给其他库或服务来完成。
然而，这也在你的程序和它运行所需的库之间引入了一种<em>依赖（dependency）</em>关系。
例如在 Python 中，要获取某个网站的内容，我们通常这样写：

```python
import requests

response = requests.get("https://missing.csail.mit.edu")
```

但是 `requests` 库并不随 Python 运行时一起提供，所以如果在没有安装 `requests` 的情况下运行这段代码，Python 会报错：

```console
$ python fetch.py
Traceback (most recent call last):
  File "fetch.py", line 1, in <module>
    import requests
ModuleNotFoundError: No module named 'requests'
```

要让这个库可用，我们需要先运行 `pip install requests` 来安装它。
`pip` 是 Python 编程语言提供的、用于安装软件包的命令行工具。
执行 `pip install requests` 会依次进行以下操作：

1. 在 Python 包索引（Python Package Index，[PyPI](https://pypi.org/)）中搜索 requests
1. 搜索适用于我们当前运行平台的构件
1. 解析依赖——`requests` 库本身依赖其他软件包，因此安装器必须为所有传递依赖（transitive dependencies）找到彼此兼容的版本，并在此之前先把它们装好
1. 下载这些构件，然后解包并把文件复制到文件系统中的正确位置

```console
$ pip install requests
Collecting requests
  Downloading requests-2.32.3-py3-none-any.whl (64 kB)
Collecting charset-normalizer<4,>=2
  Downloading charset_normalizer-3.4.0-cp311-cp311-manylinux_x86_64.whl (142 kB)
Collecting idna<4,>=2.5
  Downloading idna-3.10-py3-none-any.whl (70 kB)
Collecting urllib3<3,>=1.21.1
  Downloading urllib3-2.2.3-py3-none-any.whl (126 kB)
Collecting certifi>=2017.4.17
  Downloading certifi-2024.8.30-py3-none-any.whl (167 kB)
Installing collected packages: urllib3, idna, charset-normalizer, certifi, requests
Successfully installed certifi-2024.8.30 charset-normalizer-3.4.0 idna-3.10 requests-2.32.3 urllib3-2.2.3
```

从中可以看到，`requests` 自己也有依赖，比如 `certifi` 和 `charset-normalizer`，而且必须先装好它们，才能安装 `requests`。
安装完成后，Python 运行时就能在导入时找到这个库了。

```console
$ python -c 'import requests; print(requests.__path__)'
['/usr/local/lib/python3.11/dist-packages/requests']

$ pip list | grep requests
requests        2.32.3
```

不同的编程语言在安装和发布库方面有不同的工具、约定和实践。
在 Rust 等一些语言中，工具链是统一的——`cargo` 负责构建、测试、依赖管理和发布。
在 Python 等另一些语言中，统一发生在规范层面——没有单一的工具，而是由标准化的规范来定义打包的工作方式，使得每项任务都可以有多个相互竞争的工具（`pip` 对比 [`uv`](https://docs.astral.sh/uv/)，`setuptools` 对比 [`hatch`](https://hatch.pypa.io/) 对比 [`poetry`](https://python-poetry.org/)）。
还有一些生态，比如 LaTeX，其发行版（如 TeX Live 或 MacTeX）自带预装好的数千个软件包。

引入依赖的同时也会引入依赖冲突。
当不同程序需要同一个依赖的互不兼容的版本时，就会产生冲突。
例如，如果 `tensorflow==2.3.0` 要求 `numpy>=1.16.0,<1.19.0`，而 `pandas==1.2.0` 要求 `numpy>=1.16.5`，那么任何满足 `numpy>=1.16.5,<1.19.0` 的版本都是有效的。
但如果你项目中的另一个包要求 `numpy>=1.19`，那就产生了冲突：不存在能满足所有约束的有效版本。

这种多个包对共享依赖要求互不兼容版本的情况，通常被称为<em>依赖地狱（dependency hell）</em>。
处理冲突的一种办法，是把每个程序的依赖隔离到各自的<em>环境（environment）</em>中。
在 Python 中，我们这样创建虚拟环境：

```console
$ which python
/usr/bin/python
$ pwd
/home/missingsemester
$ python -m venv venv
$ source venv/bin/activate
$ which python
/home/missingsemester/venv/bin/python
$ which pip
/home/missingsemester/venv/bin/pip
$ python -c 'import requests; print(requests.__path__)'
['/home/missingsemester/venv/lib/python3.11/site-packages/requests']

$ pip list
Package Version
------- -------
pip     24.0
```

你可以把环境看作是语言运行时的一个完整的、独立的版本，拥有自己的一套已安装软件包。
这个虚拟环境（virtual environment，简称 venv）把已安装的依赖与全局的 Python 安装隔离开来。
最好的做法是为每个项目建立一个虚拟环境，其中包含该项目所需的依赖。

> 虽然许多现代操作系统自带 Python 等编程语言运行时，但修改这些自带的安装是不明智的，因为操作系统自身的功能可能依赖它们。请优先使用独立的环境。

在某些语言中，安装协议并不是由某个工具定义的，而是以规范的形式存在。
在 Python 中，[PEP 517](https://peps.python.org/pep-0517/) 定义了构建系统接口，[PEP 621](https://peps.python.org/pep-0621/) 规定了项目元数据在 `pyproject.toml` 中的存储方式。
这使得开发者能够改进 `pip`，做出像 `uv` 这样更优化的工具。要安装 `uv`，只需执行 `pip install uv`。

使用 `uv` 代替 `pip` 时接口相同，但速度要快得多：

```console
$ uv pip install requests
Resolved 5 packages in 12ms
Prepared 5 packages in 0.45ms
Installed 5 packages in 8ms
 + certifi==2024.8.30
 + charset-normalizer==3.4.0
 + idna==3.10
 + requests==2.32.3
 + urllib3==2.2.3
```

> 我们强烈建议尽可能使用 `uv pip` 代替 `pip`，因为它能大幅缩短安装时间。

除了隔离依赖之外，环境还允许你使用不同版本的编程语言运行时。

```console
$ uv venv --python 3.12 venv312
Using CPython 3.12.7
Creating virtual environment at: venv312

$ source venv312/bin/activate && python --version
Python 3.12.7

$ uv venv --python 3.11 venv311
Using CPython 3.11.10
Creating virtual environment at: venv311

$ source venv311/bin/activate && python --version
Python 3.11.10
```

当你需要在多个 Python 版本上测试代码，或者某个项目要求特定版本时，这就很有用。

> 在某些编程语言中，每个项目会自动获得属于自己的依赖环境，而不需要你手动创建，但原理是一样的。如今大多数语言也都有在同一系统上管理多个语言版本的机制，并可以为各个项目指定使用哪个版本。

# 构件与打包

在软件开发中，我们区分源代码和构件。开发者编写和阅读源代码，而构件是由源代码生成的、经过打包的、可分发的产物——随时可以安装或部署。
构件可以简单到只是一个我们运行的代码文件，也可以复杂到包含某个应用所需全部零零碎碎东西的整台虚拟机。
来看这个例子，当前目录下有一个 Python 文件 `greet.py`：

```console
$ cat greet.py
def greet(name):
    return f"Hello, {name}!"

$ python -c "from greet import greet; print(greet('World'))"
Hello, World!

$ cd /tmp
$ python -c "from greet import greet; print(greet('World'))"
ModuleNotFoundError: No module named 'greet'
```

一旦切换到别的目录，导入就失败了，因为 Python 只会在特定位置查找模块（当前目录、已安装的软件包，以及 `PYTHONPATH` 中的路径）。打包通过把代码安装到一个已知的位置来解决这个问题。

在 Python 中，打包一个库意味着生成一个构件，供 `pip` 或 `uv` 这样的包安装器用来安装相关文件。
Python 的构件称为 <em>wheel</em>，包含安装一个包所需的全部信息：代码文件、关于该包的元数据（名称、版本、依赖），以及文件应放置在环境中何处的说明。
构建构件需要我们编写一个项目文件（通常也称为清单，manifest），详细说明项目的具体信息、所需依赖、包的版本以及其他信息。在 Python 中，我们用 `pyproject.toml` 来做这件事。

> `pyproject.toml` 是现代且推荐的方式。虽然 `requirements.txt` 或 `setup.py` 等较早的打包方式仍然受支持，但只要可能，你应该优先使用 `pyproject.toml`。

下面是一个最小的 `pyproject.toml`，它描述的库同时还提供一个命令行工具：

```toml
[project]
name = "greeting"
version = "0.1.0"
description = "A simple greeting library"
dependencies = ["typer>=0.9"]

[project.scripts]
greet = "greeting:main"

[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"
```

`typer` 库是一个流行的 Python 包，用于以极少的样板代码创建命令行界面。

以及对应的 `greeting.py`：

```python
import typer

def greet(name: str) -> str:
    return f"Hello, {name}!"

def main(name: str):
    print(greet(name))

if __name__ == "__main__":
    typer.run(main)
```

有了这些文件，我们现在就可以构建 wheel 了：

```console
$ uv build
Building source distribution...
Building wheel from source distribution...
Successfully built dist/greeting-0.1.0.tar.gz
Successfully built dist/greeting-0.1.0-py3-none-any.whl

$ ls dist/
greeting-0.1.0-py3-none-any.whl
greeting-0.1.0.tar.gz
```

`.whl` 文件就是 wheel（一个具有特定结构的 zip 压缩包），而 `.tar.gz` 是源码发行包，供需要从源码构建的系统使用。

你可以查看 wheel 的内容，了解里面打包了什么：

```console
$ unzip -l dist/greeting-0.1.0-py3-none-any.whl
Archive:  dist/greeting-0.1.0-py3-none-any.whl
  Length      Date    Time    Name
---------  ---------- -----   ----
      150  2024-01-15 10:30   greeting.py
      312  2024-01-15 10:30   greeting-0.1.0.dist-info/METADATA
       92  2024-01-15 10:30   greeting-0.1.0.dist-info/WHEEL
        9  2024-01-15 10:30   greeting-0.1.0.dist-info/top_level.txt
      435  2024-01-15 10:30   greeting-0.1.0.dist-info/RECORD
---------                     -------
      998                     5 files
```

现在，如果我们把这个 wheel 交给别人，他们就可以通过运行下面的命令来安装它：

```console
$ uv pip install ./greeting-0.1.0-py3-none-any.whl
$ greet Alice
Hello, Alice!
```

这会把我们之前构建的库安装到他们的环境中，包括 `greet` 这个命令行工具。

这种方式有其局限。特别是，如果我们的库依赖特定平台的库，例如用于 GPU 加速的 CUDA，那么我们的构件只能在安装了那些特定库的系统上工作，而且我们可能需要为不同的平台（Linux、macOS、Windows）和架构（x86、ARM）分别构建 wheel。

安装软件时，从源码安装和安装预编译的二进制文件有一个重要区别。从源码安装意味着下载原始代码并在你的机器上编译——这需要安装编译器和构建工具，而且对大型项目可能耗时很长。

安装预编译的二进制文件则意味着下载一个由别人事先编译好的构件——更快也更简单，但二进制文件必须与你的平台和架构相匹配。
例如，[ripgrep 的发布页面](https://github.com/BurntSushi/ripgrep/releases)提供了适用于 Linux（x86_64、ARM）、macOS（Intel、Apple Silicon）和 Windows 的预编译二进制文件。

# 发布与版本管理

代码是在持续的过程中构建出来的，但是以离散的方式发布的。
在软件开发中，开发环境和生产环境有着明确的区分。
代码需要先在开发环境中证明可以正常工作，然后才能被<em>发布（ship）</em>到生产环境。
发布流程包含许多步骤，包括测试、依赖管理、版本管理、配置、部署和发布。

软件库不是一成不变的，它们会随着时间演进，获得修复和新功能。
我们通过离散的版本标识符来追踪这种演进，每个版本标识符对应库在某个时间点的状态。
库行为的变化可以有很大差异：从修复非关键功能的补丁，到扩展其功能的新特性，再到破坏向后兼容性的变更。
变更日志（changelog）记录了某个版本引入了哪些变化——这是软件开发者用来传达与新版本相关变更的文档。

然而，追踪每一个依赖的持续变化是不切实际的，当我们考虑传递依赖——即依赖的依赖——时更是如此。

> 你可以用 `uv tree` 来可视化项目的整个依赖树，它会以树状格式显示所有软件包及其传递依赖。

为了简化这个问题，业界有一些关于如何给软件编版本号的约定，其中最流行的之一是[语义化版本](https://semver.org/)（Semantic Versioning，简称 SemVer）。
在语义化版本中，版本标识符的形式为 MAJOR.MINOR.PATCH（主版本号.次版本号.修订号），每个值都是一个整数。简而言之，升级时：

- PATCH（例如 1.2.3 → 1.2.4）应当只包含缺陷修复，并且完全向后兼容
- MINOR（例如 1.2.3 → 1.3.0）以向后兼容的方式增加新功能
- MAJOR（例如 1.2.3 → 2.0.0）表示存在破坏性变更，可能需要修改代码

> 这是一个简化的说法，我们鼓励你阅读完整的 SemVer 规范，以了解比如为什么从 0.1.3 升级到 0.2.0 可能带来破坏性变更，或者 `1.0.0-rc.1` 是什么意思。
Python 打包原生支持语义化版本，所以在指定依赖的版本时，我们可以使用各种限定符：

在 `pyproject.toml` 中，我们有多种方式来限制依赖的兼容版本范围：

```toml
[project]
dependencies = [
    "requests==2.32.3",  # Exact version - only this specific version
    "click>=8.0",        # Minimum version - 8.0 or newer
    "numpy>=1.24,<2.0",  # Range - at least 1.24 but less than 2.0
    "pandas~=2.1.0",     # Compatible release - >=2.1.0 and <2.2.0
]
```

版本限定符存在于许多包管理器中（npm、cargo 等），具体语义各有不同。`~=` 运算符是 Python 的“兼容版本”（compatible release）运算符——`~=2.1.0` 的意思是“任何与 2.1.0 兼容的版本”，即 `>=2.1.0` 且 `<2.2.0`。这大致相当于 npm 和 cargo 中的插入符（`^`）运算符，后者遵循 SemVer 的兼容性概念。

并非所有软件都使用语义化版本。一种常见的替代方案是日历版本（Calendar Versioning，CalVer），其版本号基于发布日期而非语义含义。例如，Ubuntu 使用 `24.04`（2024 年 4 月）和 `24.10`（2024 年 10 月）这样的版本号。CalVer 让人很容易看出一个版本有多旧，但它并不传达任何关于兼容性的信息。最后，语义化版本也并非万无一失，有时维护者会在次版本或修订版本的发布中无意间引入破坏性变更。

# 可复现性

在现代软件开发中，你编写的代码位于大量抽象层之上。
这包括编程语言运行时、第三方库、操作系统，甚至硬件本身。
这些层中任何一层的任何差异，都可能改变代码的行为，甚至使其无法按预期工作。
此外，即使是底层硬件的差异，也会影响你发布软件的能力。

固定（pinning）一个库，指的是指定一个确切的版本而不是一个范围，例如用 `requests==2.32.3` 而不是 `requests>=2.0`。

包管理器的部分工作，是考虑依赖——以及传递依赖——所提供的所有约束，然后产出一份能满足所有约束的有效版本列表。
这份具体的版本列表可以保存到文件中以实现可复现性；这类文件称为<em>锁文件（lock file）</em>。

```console
$ uv lock
Resolved 12 packages in 45ms

$ cat uv.lock | head -20
version = 1
requires-python = ">=3.11"

[[package]]
name = "certifi"
version = "2024.8.30"
source = { registry = "https://pypi.org/simple" }
sdist = { url = "https://files.pythonhosted.org/...", hash = "sha256:..." }
wheels = [
    { url = "https://files.pythonhosted.org/...", hash = "sha256:..." },
]
...
```

在处理依赖版本管理和可复现性时，有一个关键区别，即库与应用/服务之间的区别。
库是用来被其他代码导入和使用的，而那些代码可能有它们自己的依赖，所以指定过于严格的版本约束可能会与用户的其他依赖产生冲突。
相比之下，应用或服务是软件的最终使用者，它们通常通过用户界面或 API 而不是编程接口来提供功能。
对于库，好的做法是指定版本范围，以最大化与更广泛的软件包生态的兼容性。对于应用，固定确切版本能确保可复现性——所有运行该应用的人使用的依赖完全相同。

对于需要最大可复现性的项目，[Nix](https://nixos.org/) 和 [Bazel](https://bazel.build/) 等工具提供<em>密闭（hermetic）</em>构建——其中包括编译器、系统库乃至构建环境本身在内的每一项输入都被固定，并按内容寻址。这保证了无论构建在何时何地运行，输出都是逐位（bit-for-bit）完全一致的。

> 你甚至可以用 NixOS 来管理整台电脑的安装，这样你就能轻而易举地创建电脑配置的新副本，并通过受版本控制的配置文件来管理其完整配置。

软件开发中有一个永无止境的矛盾：新的软件版本有意或无意地带来破坏，而另一方面，旧的软件版本会随着时间推移因安全漏洞而变得不再安全。
我们可以通过持续集成（CI）流水线来应对这一问题（我们会在[代码质量与 CI](/2026/code-quality/)一讲中详细介绍），用它针对新的软件版本测试我们的应用，并配备自动化机制，在依赖发布新版本时及时发现，例如 [Dependabot](https://github.com/dependabot)。

即使有 CI 测试，升级软件版本时问题仍然会发生，这通常是因为开发环境和生产环境之间不可避免的不匹配。
在这种情况下，最好的做法是准备一个<em>回滚（rollback）</em>方案：撤销版本升级，重新部署一个已知良好的版本。

# 虚拟机与容器

随着你开始依赖更复杂的依赖项，代码的依赖很可能会超出包管理器能够处理的范围。
一个常见的原因是需要与特定的系统库或硬件驱动交互。
例如，在科学计算和 AI 领域，程序通常需要专门的库和驱动来利用 GPU 硬件。
许多系统级依赖（GPU 驱动、特定的编译器版本、OpenSSL 之类的共享库）仍然需要在系统范围内安装。

传统上，这种更广泛的依赖问题是用虚拟机（Virtual Machine，VM）来解决的。
VM 对整台计算机进行抽象，提供一个完全隔离的环境，拥有自己专用的操作系统。
更现代的方法是容器，它把应用连同其依赖、库和文件系统一起打包，但共享宿主机的操作系统内核，而不是虚拟化整台计算机。
容器比 VM 更轻量，因为它们共享内核，所以启动更快，运行效率也更高。

最流行的容器平台是 [Docker](https://www.docker.com/)。Docker 引入了一种标准化的方式来构建、分发和运行容器。在底层，Docker 使用 containerd 作为其容器运行时——这是一个行业标准，Kubernetes 等其他工具也在使用。

运行容器很简单。例如，要在容器内运行 Python 解释器，我们使用 `docker run`（`-it` 标志使容器带有终端并可交互。退出时，容器就会停止。）。

```console
$ docker run -it python:3.12 python
Python 3.12.7 (main, Nov  5 2024, 02:53:25) [GCC 12.2.0] on linux
>>> print("Hello from inside a container!")
Hello from inside a container!
```

实际上，你的程序可能依赖整个文件系统。
为了解决这个问题，我们可以使用容器镜像（container image），把应用的整个文件系统作为构件来发布。
容器镜像是通过编程方式创建的。使用 docker 时，我们用 Dockerfile 语法精确指定镜像的依赖、系统库和配置：

```dockerfile
FROM python:3.12
RUN apt-get update
RUN apt-get install -y gcc
RUN apt-get install -y libpq-dev
RUN pip install numpy
RUN pip install pandas
COPY . /app
WORKDIR /app
RUN pip install .
```

一个重要的区别：Docker <strong>镜像（image）</strong>是打包好的构件（类似模板），而<strong>容器（container）</strong>是该镜像的一个运行实例。你可以从同一个镜像运行多个容器。镜像是分层构建的，Dockerfile 中的每条指令（`FROM`、`RUN`、`COPY` 等）都会创建一个新层。Docker 会缓存这些层，所以如果你修改了 Dockerfile 中的某一行，只需要重新构建该层及其后的层。

前面的 Dockerfile 存在几个问题：它使用的是完整的 Python 镜像而不是精简（slim）版本，使用多条独立的 `RUN` 命令产生了不必要的层，没有固定版本，也没有清理包管理器的缓存，导致发布了不必要的文件。其他常见的错误还包括以 root 身份运行容器带来的安全隐患，以及不小心把密钥嵌入到镜像层中。

下面是改进后的版本

```dockerfile
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*
COPY pyproject.toml uv.lock ./
RUN uv pip install --system -r uv.lock
COPY . /app
```

在前面的例子中可以看到，我们没有从源码安装 `uv`，而是从 `ghcr.io/astral-sh/uv:latest` 镜像中复制预编译好的二进制文件。这被称为<em>构建器（builder）</em>模式。使用这种模式，我们不需要发布编译代码所需的全部工具，只需要运行应用所需的最终二进制文件（此处是 `uv`）。

Docker 有一些需要注意的重要局限。第一，容器镜像通常是与平台相关的——为 `linux/amd64` 构建的镜像无法在 `linux/arm64`（Apple Silicon Mac）上原生运行，必须借助模拟，而这很慢。第二，Docker 容器需要 Linux 内核，所以在 macOS 和 Windows 上，Docker 实际上在底层运行了一个轻量级 Linux VM，带来额外开销。第三，Docker 的隔离性比 VM 弱——容器共享宿主机内核，这在多租户环境中是一个安全隐患。

> 如今，也有越来越多的项目借助 nix，按项目来管理甚至“系统级”的库和应用，例如通过 [nix flakes](https://serokell.io/blog/practical-nix-flakes)。

# 配置

软件天生是可配置的。在[命令行环境](/2026/command-line-environment/)一讲中，我们看到程序通过标志、环境变量甚至配置文件（即 dotfiles）来接收选项。即便对于更复杂的应用，这一点同样成立，而且已经有成熟的模式用于大规模管理配置。
软件配置不应该嵌入代码中，而应在运行时提供。
常见的方式有环境变量和配置文件。

下面是一个通过环境变量配置的应用示例：

```python
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///local.db")
DEBUG = os.environ.get("DEBUG", "false").lower() == "true"
API_KEY = os.environ["API_KEY"]  # Required - will raise if not set
```

应用也可以通过配置文件来配置（例如，一个通过 `yaml.load` 加载配置的 Python 程序），`config.yaml`：

```yaml
database:
  url: "postgresql://localhost/myapp"
  pool_size: 5
server:
  host: "0.0.0.0"
  port: 8080
  debug: false
```

思考配置问题时有一条好用的经验法则：同一份代码库应当只需更改配置、而无需更改代码，就能部署到不同的环境（开发、预发布、生产）。

在众多配置项中，常常包含 API 密钥之类的敏感数据。
密钥（secret）必须小心处理，以免意外泄露，而且绝不能纳入版本控制。

# 服务与编排

现代应用很少孤立存在。一个典型的 Web 应用可能需要数据库来做持久化存储、缓存来提升性能、消息队列来处理后台任务，以及各种其他支撑服务。与其把所有东西打包进一个单体应用，现代架构通常会把功能拆分成独立的服务，这些服务可以各自独立地开发、部署和扩展。

举个例子，如果我们判断应用可以从缓存中受益，那么与其自己造轮子，不如利用现有的、久经考验的方案，比如 [Redis](https://redis.io/) 或 [Memcached](https://memcached.org/)。
我们可以把 Redis 构建进容器，作为应用依赖的一部分嵌入进去，但这意味着要协调 Redis 与我们的应用之间的所有依赖，这可能很有挑战，甚至不可行。
我们可以换一种做法：把每个应用分别部署在各自的容器中。
这通常被称为微服务架构，其中每个组件作为独立的服务运行，并通过网络通信，通常是通过 HTTP API。

[Docker Compose](https://docs.docker.com/compose/) 是一个用于定义和运行多容器应用的工具。你不必逐个管理容器，而是在一个 YAML 文件中声明所有服务，并将它们一起编排。现在，我们完整的应用包含不止一个容器：

```yaml
# docker-compose.yml
services:
  web:
    build: .
    ports:
      - "8080:8080"
    environment:
      - REDIS_URL=redis://cache:6379
    depends_on:
      - cache

  cache:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

执行 `docker compose up`，两个服务会一起启动，Web 应用可以使用主机名 `cache` 连接到 Redis（Docker 的内部 DNS 会自动解析服务名称）。
Docker Compose 让我们能够声明想要如何部署一个或多个服务，并负责编排工作：将它们一起启动、在它们之间建立网络，以及管理用于数据持久化的共享卷。

对于生产环境部署，你通常希望 docker compose 服务在开机时自动启动，并在失败时重启。一种常见的做法是使用 systemd 来管理 docker compose 部署：

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down

[Install]
WantedBy=multi-user.target
```

这个 systemd 单元文件确保你的应用在系统启动时（Docker 就绪之后）自动启动，并提供 `systemctl start myapp`、`systemctl stop myapp` 和 `systemctl status myapp` 等标准控制命令。

当部署需求变得更复杂时——需要跨多台机器的可扩展性、服务崩溃时的容错能力以及高可用性保证——组织就会转向复杂的容器编排平台，比如 Kubernetes（k8s），它可以管理机器集群中的数千个容器。话虽如此，Kubernetes 的学习曲线陡峭，运维开销也很大，所以对较小的项目来说往往是大材小用。

这种多容器的架构之所以部分可行，是因为现代服务之间通过标准化的 API 相互通信，即 HTTP REST API。例如，每当程序与 OpenAI 或 Anthropic 这样的 LLM 提供商交互时，底层其实就是向他们的服务器发送一个 HTTP 请求，然后解析响应：

```console
$ curl https://api.anthropic.com/v1/messages \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "content-type: application/json" \
    -H "anthropic-version: 2023-06-01" \
    -d '{"model": "claude-sonnet-4-20250514", "max_tokens": 256,
         "messages": [{"role": "user", "content": "Explain containers vs VMs in one sentence."}]}'
```

# 对外发布

一旦你证明了代码可以正常工作，你可能希望把它分发出去，供他人下载和安装。
分发有多种形式，并且与你所使用的编程语言和环境有着内在的联系。

最简单的分发形式，是上传构件供人们下载并在本地安装。
这种方式至今仍然常见，比如 [Ubuntu 的软件包归档](http://archive.ubuntu.com/ubuntu/pool/main/)，它本质上就是一个由 `.deb` 文件组成的 HTTP 目录列表。

如今，GitHub 已经成为发布源代码和构件事实上的标准平台。
虽然源代码通常是公开可见的，但 GitHub Releases 允许维护者把预编译的二进制文件和其他构件附加到带标签的版本上。

包管理器有时支持直接从 GitHub 安装，可以从源码安装，也可以从预构建的 wheel 安装：

```console
# Install from source (will clone and build)
$ pip install git+https://github.com/psf/requests.git

# Install from a specific tag/branch
$ pip install git+https://github.com/psf/requests.git@v2.32.3

# Install a wheel directly from a GitHub release
$ pip install https://github.com/user/repo/releases/download/v1.0/package-1.0-py3-none-any.whl
```

事实上，Go 等一些语言采用的是去中心化的分发模型——没有中央包仓库，Go 模块直接从其源代码仓库分发。
像 `github.com/gorilla/mux` 这样的模块路径指明了代码所在的位置，`go get` 直接从那里获取。不过，大多数包管理器，如 `pip`、`cargo` 或 `brew`，都有已打包项目的中央索引，以便于分发和安装。如果我们运行

```console
$ uv pip install requests --verbose --no-cache 2>&1 | grep -F '.whl'
DEBUG Selecting: requests==2.32.5 [compatible] (requests-2.32.5-py3-none-any.whl)
DEBUG No cache entry for: https://files.pythonhosted.org/packages/1e/db/4254e3eabe8020b458f1a747140d32277ec7a271daf1d235b70dc0b4e6e3/requests-2.32.5-py3-none-any.whl.metadata
DEBUG No cache entry for: https://files.pythonhosted.org/packages/1e/db/4254e3eabe8020b458f1a747140d32277ec7a271daf1d235b70dc0b4e6e3/requests-2.32.5-py3-none-any.whl
```

就能看到我们是从哪里获取 `requests` 的 wheel 的。请注意文件名中的 `py3-none-any`——这表示该 wheel 适用于任何 Python 3 版本、任何操作系统、任何架构。对于含有编译代码的包，wheel 是与平台相关的：

```console
$ uv pip install numpy --verbose --no-cache 2>&1 | grep -F '.whl'
DEBUG Selecting: numpy==2.2.1 [compatible] (numpy-2.2.1-cp312-cp312-macosx_14_0_arm64.whl)
```

这里的 `cp312-cp312-macosx_14_0_arm64` 表示这个 wheel 专门用于 macOS 14 及以上、ARM64（Apple Silicon）上的 CPython 3.12。如果你使用的是其他平台，`pip` 会下载另一个 wheel，或者从源码构建。

反过来，为了让别人能够找到我们创建的包，我们需要把它发布到这些注册中心（registry）之一。
在 Python 中，主要的注册中心是 [Python 包索引（PyPI）](https://pypi.org)。
与安装类似，发布包也有多种方式。`uv publish` 命令提供了一个上传包到 PyPI 的现代化接口：

```console
$ uv publish --publish-url https://test.pypi.org/legacy/
Publishing greeting-0.1.0.tar.gz
Publishing greeting-0.1.0-py3-none-any.whl
```

这里我们使用的是 [TestPyPI](https://test.pypi.org)——一个独立的包注册中心，用于测试你的发布流程，而不会污染真正的 PyPI。上传之后，你可以从 TestPyPI 安装：

```console
$ uv pip install --index-url https://test.pypi.org/simple/ greeting
```

发布软件时的一个关键考虑是信任。用户如何验证他们下载的包确实来自你，并且没有被篡改？包注册中心使用校验和来验证完整性，一些生态还支持包签名，以提供作者身份的密码学证明。

不同的语言有各自的包注册中心：Rust 有 [crates.io](https://crates.io)，JavaScript 有 [npm](https://www.npmjs.com)，Ruby 有 [RubyGems](https://rubygems.org)，容器镜像有 [Docker Hub](https://hub.docker.com)。与此同时，对于私有或内部的包，组织通常会部署自己的包仓库（例如私有 PyPI 服务器或私有 Docker 注册中心），或者使用云服务商提供的托管方案。

将 Web 服务部署到互联网上还涉及额外的基础设施：域名注册、把域名指向你的服务器的 DNS 配置，以及通常需要一个像 nginx 这样的反向代理来处理 HTTPS 并路由流量。对于文档或静态网站等较简单的用例，[GitHub Pages](https://pages.github.com/) 直接从仓库提供免费托管。

<!--
## Documentation

So far we have emphasized the deliverable _artifact_ as the main output of packaging and shipping code.
In addition to the artifact, we need to document for users the code's functionality, installation instructions, and usage examples.

Tools like [Sphinx](https://www.sphinx-doc.org/) (Python) and [MkDocs](https://www.mkdocs.org/) can automatically generate browsable documentation from docstrings and markdown files, often hosted on services like [Read the Docs](https://readthedocs.org/).
For HTTP-based APIs, the [OpenAPI specification](https://www.openapis.org/) (formerly Swagger) provides a standard format for describing API endpoints, which tools can use to generate interactive documentation and client libraries automatically. -->

# 课后练习

1. 用 `printenv` 把你的环境保存到文件，创建一个 venv 并激活它，再用 `printenv` 保存到另一个文件，然后执行 `diff before.txt after.txt`。环境发生了什么变化？为什么 Shell 会优先使用 venv？（提示：对比激活前后的 `$PATH`。）运行 `which deactivate`，并思考 deactivate 这个 bash 函数做了什么。
1. 创建一个带有 `pyproject.toml` 的 Python 包，并将其安装到虚拟环境中。创建一个锁文件并查看其内容。
1. 安装 Docker，并用它通过 docker compose 在本地构建 Missing Semester 课程网站。
1. 为一个简单的 Python 应用编写 Dockerfile。然后编写一个 `docker-compose.yml`，让你的应用与 Redis 缓存一起运行。
1. 把一个 Python 包发布到 TestPyPI（除非值得分享，否则不要发布到真正的 PyPI！）。然后用该包构建一个 Docker 镜像，并将其推送到 `ghcr.io`。
1. 使用 [GitHub Pages](https://docs.github.com/en/pages/quickstart) 做一个网站。额外（不计分）加分项：为它配置自定义域名。
