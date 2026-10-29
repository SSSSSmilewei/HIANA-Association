<!-- video: 8VYT9TcUmKs -->

编程中有一条金科玉律：代码不会做你期望它做的事，只会做你告诉它做的事。弥合这两者之间的差距有时相当困难。本讲将介绍应对有 bug、吃资源的代码的实用技术：调试（debugging）与性能分析（profiling）。

# 调试

## Printf 调试与日志

> “最有效的调试工具仍然是仔细的思考，再配上位置恰当的打印语句。”——Brian Kernighan，《Unix 初学者指南》（_Unix for Beginners_）。

调试程序的第一种方法，是在你发现问题的位置附近添加打印语句，并不断迭代，直到获得足够的信息，弄清楚是什么导致了问题。

第二种方法是在程序中使用日志（logging），而不是临时随手写的打印语句。日志本质上就是“更用心的打印”，通常借助日志框架完成，框架内置了对以下功能的支持：

- 可以把日志（或日志的子集）定向输出到其他位置；
- 可以设置严重级别（如 INFO、DEBUG、WARN、ERROR 等），并据此过滤输出；
- 支持对与日志条目相关的数据做结构化记录，事后更容易提取。

日志语句通常也是你在编程时就主动加上的，这样调试所需的数据说不定早已在那里了！事实上，用打印语句找到并修复问题之后，往往值得在删除它们之前先把这些打印改成规范的日志语句。这样，将来再出现类似的 bug 时，你不用修改代码就已经有了所需的诊断信息。

> <strong>第三方日志</strong>：许多程序支持 `-v` 或 `--verbose` 参数，运行时会输出更多信息，这有助于找出某条命令失败的原因。有些程序甚至允许重复该参数以获得更详细的输出。调试服务（数据库、Web 服务器等）的问题时，请查看它们的日志——在 Linux 上通常位于 `/var/log/`。使用 `journalctl -u <service>` 可以查看 systemd 服务的日志。对于第三方库，可以看看它们是否支持通过环境变量或配置开启调试日志。

## 调试器

当你清楚该打印什么、并且可以方便地修改和重新运行代码时，打印调试效果很好。而当你不确定需要哪些信息、bug 只在难以复现的条件下才出现，或者修改并重启程序代价高昂（启动时间长、需要重建复杂状态等）时，调试器就变得很有价值。

调试器是能让你在程序运行的过程中与其执行过程交互的程序，它可以让你：

- 在执行到某一行时暂停。
- 一次执行一条指令，单步前进。
- 在崩溃之后检查变量的值。
- 在满足给定条件时有条件地暂停执行。
- 以及更多高级功能。

大多数编程语言都支持（或自带）某种形式的调试器。最通用的是<strong>通用调试器</strong>，例如 [`gdb`](https://www.gnu.org/software/gdb/)（GNU 调试器）和 [`lldb`](https://lldb.llvm.org/)（LLVM 调试器），它们可以调试任何原生二进制文件。许多语言还有与运行时结合更紧密的<strong>语言专用调试器</strong>（如 Python 的 pdb 或 Java 的 jdb）。

`gdb` 是 C、C++、Rust 及其他编译型语言事实上的标准调试器。你几乎可以用它探查任何进程，并获取其当前的机器状态：寄存器、栈、程序计数器等等。

一些有用的 GDB 命令：

- `run` - 启动程序
- `b {function}` 或 `b {file}:{line}` - 设置断点
- `c` - 继续执行
- `step` / `next` / `finish` - 步入 / 步过 / 步出
- `p {variable}` - 打印变量的值
- `bt` - 显示回溯（调用栈）
- `watch {expression}` - 当值发生变化时中断

> 可以考虑使用 GDB 的 TUI 模式（`gdb -tui`，或在 GDB 内按 `Ctrl-x a`），它会以分屏方式同时显示源代码和命令提示符。

### 记录-回放调试

最令人沮丧的 bug 当属 _Heisenbug_（海森堡 bug）：当你试图观察它们时，它们就好像消失了，或者行为发生了变化。竞态条件、依赖时序的 bug，以及只在特定系统条件下才出现的问题都属于这一类。传统调试在这里往往没用，因为再次运行程序会产生不同的行为（例如，打印语句可能让代码慢到足以使竞态不再发生）。

<strong>记录-回放调试（record-replay debugging）</strong>通过记录程序的执行过程，让你可以按需确定性地回放任意多次，从而解决这个问题。更妙的是，你还可以沿着执行过程_反向_运行，准确找到问题出在哪里。

[rr](https://rr-project.org/) 是 Linux 上一个强大的工具，它可以记录程序执行，并支持带有完整调试能力的确定性回放。它与 GDB 配合使用，所以你已经熟悉它的界面了。

基本用法：

```bash
# Record a program execution
rr record ./my_program

# Replay the recording (opens GDB)
rr replay
```

奇妙之处发生在回放阶段。由于执行是确定性的，你可以使用<strong>反向调试</strong>命令：

- `reverse-continue`（`rc`）- 向后运行，直到遇到断点
- `reverse-step`（`rs`）- 向后单步一行
- `reverse-next`（`rn`）- 向后单步，跳过函数调用
- `reverse-finish` - 向后运行，直到进入当前函数

这对调试来说极其强大。假设程序崩溃了——与其猜测 bug 在哪里并设置断点，你可以：

1. 运行到崩溃处
2. 检查被破坏的状态
3. 在被破坏的变量上设置监视点（watchpoint）
4. 用 `reverse-continue` 准确找到它是在哪里被破坏的

<strong>何时使用 rr：</strong>
- 时好时坏、间歇性失败的测试（flaky tests）
- 竞态条件和多线程 bug
- 难以复现的崩溃
- 任何让你希望能“回到过去”的 bug

> 注意：rr 只能在 Linux 上运行，并且需要硬件性能计数器。在不暴露这些计数器的虚拟机中（例如大多数 AWS EC2 实例）无法使用，也不支持 GPU 访问。在 macOS 上，可以看看 [Warpspeed](https://warpspeed.dev/)。

> <strong>rr 与并发</strong>：由于 rr 以确定性的方式记录执行，它会把线程调度串行化。这意味着某些依赖特定时序的竞态条件在 rr 下可能不会出现。rr 对调试竞态仍然有用——一旦捕获到一次失败的运行，你就可以可靠地回放它——但你可能需要多次录制才能抓到一个间歇性的 bug。对于不涉及并发的 bug，rr 的威力最大：你总能复现完全相同的执行过程，并借助反向调试追查内存破坏。

## 系统调用跟踪

有时你需要了解程序是如何与操作系统交互的。程序通过[系统调用](https://en.wikipedia.org/wiki/System_call)向内核请求服务——打开文件、分配内存、创建进程等等。跟踪这些调用可以揭示程序为什么卡住、它试图访问哪些文件，或者它把时间花在哪里等待。

### strace（Linux）与 dtruss（macOS）

[`strace`](https://www.man7.org/linux/man-pages/man1/strace.1.html) 可以让你观察程序发出的每一个系统调用：

```bash
# Trace all system calls
# 跟踪所有系统调用

# Trace only file-related calls
# 只跟踪与文件相关的调用

# Follow child processes (important for programs that start other programs)
# 跟踪子进程（对会启动其他程序的程序很重要）

# Trace a running process
# 跟踪一个正在运行的进程

# Show timing information
# 显示耗时信息
```

> 在 macOS 和 BSD 上，可以使用 [`dtruss`](https://www.manpagez.com/man/1/dtruss/)（它封装了 `dtrace`）实现类似功能：

> 想深入了解 `strace`，请看 Julia Evans 出色的 [strace 小册子](https://jvns.ca/strace-zine-unfolded.pdf)。

### bpftrace 与 eBPF

[eBPF](https://ebpf.io/)（扩展的伯克利包过滤器，extended Berkeley Packet Filter）是 Linux 上一项强大的技术，允许在内核中运行沙箱化的程序。[`bpftrace`](https://github.com/iovisor/bpftrace) 提供了一种用于编写 eBPF 程序的高级语法。这些是在内核中运行的任意程序，因此表达能力极强（不过语法也有点笨拙，像 awk）。它们最常见的用途是调查正在发起哪些系统调用，包括做聚合统计（如次数或延迟统计），或者查看（甚至按其过滤）系统调用的参数。

```bash
# 在整个系统范围内跟踪文件打开操作（立即打印）
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_openat { printf("%s %s\n", comm, str(args->filename)); }'

# 按名称统计系统调用次数（按 Ctrl-C 时打印汇总）
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_* { @[probe] = count(); }'
```

不过，你也可以使用 [`bcc`](https://github.com/iovisor/bcc) 这类工具链，直接用 C 编写 eBPF 程序，它还附带了[许多好用的工具](https://www.brendangregg.com/blog/2015-09-22/bcc-linux-4.3-tracing.html)，比如用于打印磁盘操作延迟分布的 `biosnoop`，或用于打印所有被打开文件的 `opensnoop`。

`strace` 的好处是容易“直接上手”，而当你需要更低的开销、想跟踪内核函数、需要做任何形式的聚合等时，就该选用 `bpftrace`。不过请注意，`bpftrace` 必须以 `root` 身份运行，而且它通常监控整个内核，而不仅仅是某个特定进程。要针对特定程序，可以按命令名或 PID 过滤：

```bash
# 按命令名过滤（按 Ctrl-C 时打印汇总）
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_* /comm == "bash"/ { @[probe] = count(); }'

# 使用 -c 从启动开始跟踪某个特定命令（cpid = 子进程 PID）
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_* /pid == cpid/ { @[probe] = count(); }' -c 'ls -la'
```

`-c` 参数会运行指定的命令，并把 `cpid` 设为它的 PID，这对于从程序启动那一刻起就开始跟踪很有用。被跟踪的命令退出时，bpftrace 会打印聚合后的结果。

### 网络调试

对于网络问题，[`tcpdump`](https://www.man7.org/linux/man-pages/man1/tcpdump.1.html) 和 [Wireshark](https://www.wireshark.org/) 可以让你捕获并分析网络数据包：

```bash
# 捕获 80 端口上的数据包
sudo tcpdump -i any port 80

# 捕获并保存到文件，以便用 Wireshark 分析
sudo tcpdump -i any -w capture.pcap
```

对于 HTTPS 流量，加密使得 tcpdump 的作用有限。像 [mitmproxy](https://mitmproxy.org/) 这样的工具可以充当拦截代理，用来检查加密流量。浏览器开发者工具（Network 标签页）通常是调试 Web 应用 HTTPS 请求的最简便方式——它们会显示解密后的请求/响应数据、头部和耗时。

## 内存调试

内存 bug——缓冲区溢出、释放后使用（use-after-free）、内存泄漏——是最危险也最难调试的 bug 之一。它们往往不会立刻崩溃，而是以某种方式破坏内存，到很久以后才引发问题。

### Sanitizer（检测器）

查找内存 bug 的一种方法是使用 <strong>sanitizer</strong>，这是一类编译器功能，会对你的代码插桩，在运行时检测错误。例如，被广泛使用的 <strong>AddressSanitizer（ASan）</strong>可以检测：
- 缓冲区溢出（栈、堆和全局）
- 释放后使用
- 返回后使用（use-after-return）
- 内存泄漏

```bash
# 使用 AddressSanitizer 编译
gcc -fsanitize=address -g program.c -o program
./program
```

还有各种各样有用的 sanitizer：

- <strong>ThreadSanitizer（TSan）</strong>：检测多线程代码中的数据竞争（`-fsanitize=thread`）
- <strong>MemorySanitizer（MSan）</strong>：检测对未初始化内存的读取（`-fsanitize=memory`）
- <strong>UndefinedBehaviorSanitizer（UBSan）</strong>：检测整数溢出之类的未定义行为（`-fsanitize=undefined`）

Sanitizer 需要重新编译，但速度足够快，可以用在 CI 流水线和日常开发中。

### Valgrind：无法重新编译时

[Valgrind](https://valgrind.org/) 则是在类似虚拟机的环境中运行你的程序来检测内存错误。它比 sanitizer 慢，但不需要重新编译：

```bash
valgrind --leak-check=full ./my_program
```

在以下情况使用 Valgrind：
- 你没有源代码
- 你无法重新编译（第三方库）
- 你需要 sanitizer 中没有的特定工具

Valgrind 实际上是一个非常强大的受控执行环境，稍后讲到性能分析时我们还会再见到它！

## 用 AI 辅助调试

大语言模型已经成为出人意料地好用的调试助手。它们擅长某些能与传统工具互补的调试任务。

<strong>LLM 的长处：</strong>

- <strong>解释晦涩的错误信息</strong>：编译器错误，尤其是来自 C++ 模板或 Rust 借用检查器的错误，出了名地晦涩难懂。LLM 可以把它们翻译成通俗的语言并给出修复建议。

- <strong>跨越语言和抽象边界</strong>：如果你在调试一个跨越多种语言的问题（比如某个 C 库中的 bug 通过 Python 绑定表现出来），LLM 可以帮你理清不同的层次。它们尤其擅长理解 FFI 边界、构建系统问题以及跨语言调试（例如，我的程序报错了，但我怀疑是某个依赖库里的 bug）。

- <strong>把症状与根本原因关联起来</strong>：“我的程序运行正常，但内存占用比预期多了 10 倍”就是这类模糊的症状，LLM 可以帮助你展开调查，给出可能的原因以及该检查什么。

- <strong>分析崩溃转储和堆栈跟踪</strong>：贴上一段堆栈跟踪，问问可能是什么导致的。

> <strong>关于调试符号的说明</strong>：要获得有意义的堆栈跟踪并顺利调试，请确保你的二进制文件（以及所有链接的库）是带调试符号编译的（`-g` 参数）。调试信息通常以 DWARF 格式存储。此外，使用帧指针编译（`-fno-omit-frame-pointer`）能让堆栈跟踪更可靠，对性能分析工具尤其如此。没有这些，堆栈跟踪可能只显示内存地址，或者不完整。这对原生编译的程序（C++、Rust）比对 Python 或 Java 更重要。

<strong>需要牢记的局限：</strong>
- LLM 可能会产生听起来合理但实际错误的解释（幻觉）
- 它们给出的修复可能只是掩盖了 bug，而不是真正修复它
- 务必用真正的调试工具验证它们的建议
- 它们最适合作为理解代码的补充，而不是替代

> 这与开发环境一讲中介绍的[通用 AI 编程能力](/2026/development-environment/#ai-powered-development)不同。这里我们专门讨论把 LLM 用作调试辅助。

# 性能分析

即使你的代码在功能上表现符合预期，如果它占满了 CPU 或内存，这也可能不够好。算法课通常会教大 _O_ 记号，却不教如何找出程序中的热点。由于[过早优化是万恶之源](https://wiki.c2.com/?PrematureOptimization)，你应该了解性能分析器（profiler）和监控工具。它们能帮你弄清楚程序的哪些部分占用了大部分时间和/或资源，从而把精力集中在优化这些部分上。

## 计时

衡量性能最简单的办法就是计时。在很多场景下，直接打印代码在两点之间花费的时间就足够了。

不过，墙上时钟时间（wall clock time）可能具有误导性，因为你的计算机可能同时在运行其他进程，或者在等待某些事件发生。`time` 命令区分了 _Real_、_User_ 和 _Sys_ 时间：

- <strong>Real</strong> - 从开始到结束的墙上时钟时间，包括等待所花的时间
- <strong>User</strong> - CPU 上运行用户代码所花的时间
- <strong>Sys</strong> - CPU 上运行内核代码所花的时间

```bash
$ time curl https://missing.csail.mit.edu &> /dev/null
real	0m0.272s
user	0m0.079s
sys	    0m0.028s
```

这里请求花了近 300 毫秒（real 时间），但只用了 107ms 的 CPU 时间（user + sys）。其余时间都在等待网络。

## 资源监控

有时，分析程序性能的第一步是了解它实际消耗了多少资源。程序往往在资源受限时才运行缓慢。

- <strong>综合监控</strong>：[`htop`](https://htop.dev/) 是 `top` 的改进版，可展示当前运行进程的各种统计信息。有用的快捷键：`<F6>` 对进程排序，`t` 显示树状层级，`h` 切换线程显示。另外还有 [`btop`](https://github.com/aristocratos/btop)，它监控的东西 _多得多_。

- <strong>I/O 操作</strong>：[`iotop`](https://www.man7.org/linux/man-pages/man8/iotop.8.html) 实时显示 I/O 使用情况。

- <strong>内存使用</strong>：[`free`](https://www.man7.org/linux/man-pages/man1/free.1.html) 显示内存的总量、空闲量和已用量。

- <strong>打开的文件</strong>：[`lsof`](https://www.man7.org/linux/man-pages/man8/lsof.8.html) 列出进程所打开文件的信息。适合用来检查哪个进程打开了某个特定文件。

- <strong>网络连接</strong>：[`ss`](https://www.man7.org/linux/man-pages/man8/ss.8.html) 可以让你监控网络连接。常见用法是找出哪个进程在使用某个端口：`ss -tlnp | grep :8080`。

- <strong>网络使用</strong>：[`nethogs`](https://github.com/raboof/nethogs) 和 [`iftop`](https://pdw.ex-parrot.com/iftop/) 是不错的交互式命令行工具，可按进程监控网络使用情况。

## 性能数据可视化

人类在图表中发现规律的速度比在数字表格中快得多。分析性能时，把数据画成图往往能揭示出在原始数字中看不出来的趋势、尖峰和异常。

<strong>让数据便于绘图</strong>：在添加用于调试的打印或日志语句时，请考虑让输出的格式便于日后绘图。CSV 格式的简单时间戳加数值（`1705012345,42.5`）比一句话描述容易绘图得多。JSON 结构化的日志同样只需很少的工作量就能解析并绘图。换句话说，请[以整洁的方式](https://vita.had.co.nz/papers/tidy-data.pdf)记录你的数据。

<strong>用 gnuplot 快速绘图</strong>：对于简单的命令行绘图，[`gnuplot`](http://www.gnuplot.info/) 可以直接从数据文件生成图表：

```bash
# 绘制一个包含 timestamp,value 的简单 CSV
gnuplot -e "set datafile separator ','; plot 'latency.csv' using 1:2 with lines"
```

<strong>用 matplotlib 和 ggplot2 做迭代式探索</strong>：对于更深入的分析，Python 的 [`matplotlib`](https://matplotlib.org/) 和 R 的 [`ggplot2`](https://ggplot2.tidyverse.org/) 支持迭代式探索。与一次性的绘图不同，这些工具让你可以快速切分、变换数据来验证假设。ggplot2 的分面（facet）图尤其强大——你可以按类别（例如按端点或一天中的时段对请求延迟分面）把一个数据集拆分到多个子图中，找出否则会被隐藏的规律。

<strong>示例用例：</strong>
- 绘制请求延迟随时间的变化，可以揭示出周期性的变慢（垃圾回收、cron 任务、流量模式），而原始的百分位数会掩盖这些现象
- 可视化一个不断增长的数据结构的插入耗时，可以暴露算法复杂度问题——向量插入的图会在底层数组容量翻倍时出现特征性的尖峰
- 按不同维度（请求类型、用户群、服务器）对指标分面，常常会发现一个“全系统”的问题实际上只局限于某一个类别

## CPU 性能分析器

大多数时候，人们说 _profiler_ 指的是 _CPU 性能分析器_。主要有两种类型：

- <strong>跟踪型分析器（tracing profiler）</strong>记录程序发出的每一次函数调用
- <strong>采样型分析器（sampling profiler）</strong>周期性地（通常每毫秒一次）探测程序，并记录程序的调用栈

采样型分析器开销更低，通常更适合在生产环境中使用。

### perf：采样型分析器

[`perf`](https://www.man7.org/linux/man-pages/man1/perf.1.html) 是 Linux 上标准的性能分析器。它无需重新编译就能分析任何程序：

`perf stat` 可以让你快速了解时间都花在哪里：

```bash
$ perf stat ./slow_program

 Performance counter stats for './slow_program':

         3,210.45 msec task-clock                #    0.998 CPUs utilized
               12      context-switches          #    3.738 /sec
                0      cpu-migrations            #    0.000 /sec
              156      page-faults               #   48.587 /sec
   12,345,678,901      cycles                    #    3.845 GHz
    9,876,543,210      instructions              #    0.80  insn per cycle
    1,234,567,890      branches                  #  384.532 M/sec
       12,345,678      branch-misses             #    1.00% of all branches
```

真实世界程序的分析器输出会包含大量信息。人类是视觉动物，读大量数字的能力相当糟糕。[火焰图](https://www.brendangregg.com/flamegraphs.html)（Flame graph）是一种可视化方式，能让性能分析数据容易理解得多。

火焰图在 Y 轴上展示函数调用的层次结构，X 轴方向的宽度与耗时成正比。它们是可交互的——你可以点击放大程序的特定部分。

[![FlameGraph](https://www.brendangregg.com/FlameGraphs/cpu-bash-flamegraph.svg)](https://www.brendangregg.com/FlameGraphs/cpu-bash-flamegraph.svg)

用 `perf` 的数据生成火焰图：

```bash
# 记录性能数据
perf record -g ./my_program

# 生成火焰图（需要 flamegraph 脚本）
perf script | stackcollapse-perf.pl | flamegraph.pl > flamegraph.svg
```

> 可以考虑使用 [Speedscope](https://www.speedscope.app/) 作为基于 Web 的交互式火焰图查看器，或使用 [Perfetto](https://perfetto.dev/) 进行全面的系统级分析。

### Valgrind 的 Callgrind：跟踪型分析器

[`callgrind`](https://valgrind.org/docs/manual/cl-manual.html) 是一个性能分析工具，会记录程序的调用历史和指令计数。与采样型分析器不同，它能提供精确的调用次数，并能展示调用者与被调用者之间的关系：

```bash
# 用 callgrind 运行
valgrind --tool=callgrind ./my_program

# 用 callgrind_annotate（文本）或 kcachegrind（图形界面）分析
callgrind_annotate callgrind.out.<pid>
kcachegrind callgrind.out.<pid>
```

Callgrind 比采样型分析器慢，但能提供精确的调用次数，并且如果你需要的话，还可以（通过 `--cache-sim=yes`）选择性地模拟缓存行为。

> 如果你使用的是某种特定语言，可能有更专门的分析器。例如，Python 有 [`cProfile`](https://docs.python.org/3/library/profile.html) 和 [`py-spy`](https://github.com/benfred/py-spy)，Go 有 [`go tool pprof`](https://pkg.go.dev/cmd/pprof)，Rust 有 [`cargo-flamegraph`](https://github.com/flamegraph-rs/flamegraph)（它其实适用于任何编译型程序！）。

## 内存分析器

内存分析器帮助你了解程序随时间推移如何使用内存，并找出内存泄漏。

### Valgrind 的 Massif

[`massif`](https://valgrind.org/docs/manual/ms-manual.html) 分析堆内存的使用情况：

```bash
valgrind --tool=massif ./my_program
ms_print massif.out.<pid>
```

它会展示堆使用量随时间的变化，帮助识别内存泄漏和过度分配。

> 对于 Python，[`memory-profiler`](https://pypi.org/project/memory-profiler/) 提供逐行的内存使用信息。

## 基准测试

当你需要比较不同实现或工具的性能时，[`hyperfine`](https://github.com/sharkdp/hyperfine) 非常适合对命令行程序做基准测试：

```bash
$ hyperfine --warmup 3 'fd -e jpg' 'find . -iname "*.jpg"'
Benchmark #1: fd -e jpg
  Time (mean ± σ):      51.4 ms ±   2.9 ms    [User: 121.0 ms, System: 160.5 ms]
  Range (min … max):    44.2 ms …  60.1 ms    56 runs

Benchmark #2: find . -iname "*.jpg"
  Time (mean ± σ):      1.126 s ±  0.101 s    [User: 141.1 ms, System: 956.1 ms]
  Range (min … max):    0.975 s …  1.287 s    10 runs

Summary
  'fd -e jpg' ran
   21.89 ± 2.33 times faster than 'find . -iname "*.jpg"'
```

> 对于 Web 开发，浏览器开发者工具自带出色的分析器。请参阅 [Firefox Profiler](https://profiler.firefox.com/docs/) 和 [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools/rendering-tools) 的文档。

# 课后练习

## 调试

1. <strong>调试一个排序算法</strong>：下面的伪代码实现了归并排序，但含有一个 bug。请用你选择的语言实现它，然后使用调试器（gdb、lldb、pdb 或你所用 IDE 的调试器）找出并修复这个 bug。

   ```
   function merge_sort(arr):
       if length(arr) <= 1:
           return arr
       mid = length(arr) / 2
       left = merge_sort(arr[0..mid])
       right = merge_sort(arr[mid..end])
       return merge(left, right)

   function merge(left, right):
       result = []
       i = 0, j = 0
       while i < length(left) AND j < length(right):
           if left[i] <= right[j]:
               append result, left[i]
               i = i + 1
           else:
               append result, right[i]
               j = j + 1
       append remaining elements from left and right
       return result
   ```

   测试向量：`merge_sort([3, 1, 4, 1, 5, 9, 2, 6])` 应返回 `[1, 1, 2, 3, 4, 5, 6, 9]`。使用断点并单步执行 merge 函数，找出错误元素是在哪里被选中的。

1. 安装 [`rr`](https://rr-project.org/)，并使用反向调试找出一个内存破坏 bug。把下面这个程序保存为 `corruption.c`：

   ```c
   #include <stdio.h>

   typedef struct {
       int id;
       int scores[3];
   } Student;

   Student students[2];

   void init() {
       students[0].id = 1001;
       students[0].scores[0] = 85;
       students[0].scores[1] = 92;
       students[0].scores[2] = 78;

       students[1].id = 1002;
       students[1].scores[0] = 90;
       students[1].scores[1] = 88;
       students[1].scores[2] = 95;
   }

   void curve_scores(int student_idx, int curve) {
       for (int i = 0; i < 4; i++) {
           students[student_idx].scores[i] += curve;
       }
   }

   int main() {
       init();
       printf("=== Initial state ===\n");
       printf("Student 0: id=%d\n", students[0].id);
       printf("Student 1: id=%d\n", students[1].id);

       curve_scores(0, 5);

       printf("\n=== After curving ===\n");
       printf("Student 0: id=%d\n", students[0].id);
       printf("Student 1: id=%d\n", students[1].id);

       if (students[1].id != 1002) {
           printf("\nERROR: Student 1's ID was corrupted! Expected 1002, got %d\n",
                  students[1].id);
           return 1;
       }
       return 0;
   }
   ```

   用 `gcc -g corruption.c -o corruption` 编译并运行。Student 1 的 ID 会被破坏，但发生破坏的函数只会操作 student 0。使用 `rr record ./corruption` 和 `rr replay` 找出罪魁祸首。在 `students[1].id` 上设置监视点，并在破坏发生后使用 `reverse-continue`，准确找出是哪一行代码覆盖了它。

1. 使用 AddressSanitizer 调试一个内存错误。把下面的代码保存为 `uaf.c`：

   ```c
   #include <stdlib.h>
   #include <string.h>
   #include <stdio.h>

   int main() {
       char *greeting = malloc(32);
       strcpy(greeting, "Hello, world!");
       printf("%s\n", greeting);

       free(greeting);

       greeting[0] = 'J';
       printf("%s\n", greeting);

       return 0;
   }
   ```

   先不加 sanitizer 编译并运行：`gcc uaf.c -o uaf && ./uaf`。它看起来可能正常工作。现在用 AddressSanitizer 编译：`gcc -fsanitize=address -g uaf.c -o uaf && ./uaf`。阅读错误报告。ASan 发现了什么 bug？修复它指出的问题。

1. 使用 `strace`（Linux）或 `dtruss`（macOS）跟踪 `ls -l` 之类命令发出的系统调用。它发出了哪些系统调用？再试着跟踪一个更复杂的程序，看看它打开了哪些文件。

1. 使用 LLM 帮助调试一条晦涩的错误信息。试着复制一条编译器错误（尤其是来自 C++ 模板或 Rust 的），请它解释并给出修复方法。也可以试着把 `strace` 或 address sanitizer 的一些输出贴给它。

## 性能分析

1. 使用 `perf stat` 获取你选定的某个程序的基本性能统计数据。各个计数器分别是什么意思？

1. 使用 `perf record` 做性能分析。把下面的代码保存为 `slow.c`：

   ```c
   #include <math.h>
   #include <stdio.h>

   double slow_computation(int n) {
       double result = 0;
       for (int i = 0; i < n; i++) {
           for (int j = 0; j < 1000; j++) {
               result += sin(i * j) * cos(i + j);
           }
       }
       return result;
   }

   int main() {
       double r = 0;
       for (int i = 0; i < 100; i++) {
           r += slow_computation(1000);
       }
       printf("Result: %f\n", r);
       return 0;
   }
   ```

   用调试符号编译：`gcc -g -O2 slow.c -o slow -lm`。运行 `perf record -g ./slow`，然后用 `perf report` 查看时间花在哪里。试着用 flamegraph 脚本生成一张火焰图。

1. 使用 `hyperfine` 对同一任务的两种不同实现做基准测试（例如 `find` 对比 `fd`，`grep` 对比 `ripgrep`，或者你自己代码的两个版本）。

1. 使用 `htop` 在运行一个资源密集型程序时监控你的系统。试着用 `taskset` 限制进程可以使用的 CPU：`taskset --cpu-list 0,2 stress -c 3`。为什么 `stress` 没有使用三个 CPU？

1. 一个常见问题是，你想监听的端口已经被另一个进程占用了。学习如何找出那个进程：首先执行 `python -m http.server 4444`，在 4444 端口启动一个最简单的 Web 服务器。在另一个终端中运行 `ss -tlnp | grep 4444` 找到该进程。用 `kill <PID>` 终止它。
