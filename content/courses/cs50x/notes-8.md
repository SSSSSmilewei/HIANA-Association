# 第 8 讲

## 欢迎！

- 前几周，我们向你介绍了 Python，这是一门高级编程语言，使用的构件和我们在 C 中学到的相同。今天，我们将在 HTML、CSS 和 JavaScript 中进一步扩展这些构件。

## 互联网

- 互联网是我们所有人都在使用的技术，它把全世界的计算机互联在一起。
- 运用前几周学到的技能，我们可以构建自己的网页和应用。
- <em>ARPANET</em> 把互联网上最初的几个节点相互连接了起来。
- 两点之间的点可以看作<em>路由器（router）</em>。

## 路由器

- 要把数据从一个地方路由到另一个地方，我们需要做出<em>路由决策（routing decision）</em>。也就是说，需要有人来编写数据如何从 A 点传输到 B 点的程序。
- 你可以想象，数据从 A 点到 B 点可以有多条路径，这样当某个路由器拥堵时，数据可以从另一条路径流过。数据<em>包（packet）</em>从一个路由器传到另一个路由器，从一台计算机传到另一台计算机。
- <em>TCP/IP</em> 是让计算机之间能够通过互联网传输数据的两个协议。
- <em>IP</em>，即<em>互联网协议（internet protocol）</em>，是计算机在互联网上相互识别的一种方式。每台计算机在全世界都有一个唯一的地址。地址的形式如下：
  
  ```
  #.#.#.#
  ```
- 数字范围从 `0` 到 `255`。IP 地址是 32 位的（IPv4），这意味着这些地址可以容纳超过 40 亿个地址。更新版本的 IP 地址（如 IPv6）使用 128 位，可以容纳多得多的计算机！
- 在现实世界中，服务器为我们做了大量工作。
- 数据包的结构如下：
  
  ```
  0                   1                   2                   3  
  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 
  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  |Version|  IHL  |Type of Service|          Total Length         |
  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  |         Identification        |Flags|      Fragment Offset    |
  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  |  Time to Live |    Protocol   |         Header Checksum       |
  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  |                       Source Address                          |
  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  |                    Destination Address                        |
  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  |                    Options                    |    Padding    |
  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  ```
- 数据包是标准化的。每个数据包中都包含源地址和目的地址。
- <em>TCP</em>，即<em>传输控制协议（transmission control protocol）</em>，帮助跟踪所发送数据包的顺序。
- 此外，TCP 还用来区分不同的网络服务。例如，`80` 用来表示 HTTP，`443` 用来表示 HTTPS。这些数字是这些服务的默认<em>端口号（port number）</em>。
- 当信息从一个位置发送到另一个位置时，会同时发送源 IP 地址、目的 IP 地址和 TCP 端口号。
- 这些协议还用来把大文件分割成多个部分，即多个数据包。例如，一张很大的猫的照片可以分成多个数据包发送。当某个数据包丢失时，TCP/IP 可以向源服务器重新请求丢失的数据包。
- 当所有数据都已发送并接收完毕时，TCP 会予以确认。

## DNS

- 如果访问一个网站还得记住它的 IP 地址，那就太繁琐了。
- <em>DNS</em>，即<em>域名系统（domain name system）</em>，是互联网上的一组服务器，用来把像 <em>harvard.edu</em> 这样的网站地址路由到某个特定的 IP 地址。
- DNS 其实就是一张表或一个数据库，把特定的完整域名（fully qualified domain name）和特定的 IP 地址关联起来。

## DHCP

- <em>DHCP</em> 是一种为你的设备分配 IP 地址的协议。
- 此外，这个协议还定义了你的设备所使用的默认网关和域名服务器。
- 好了，关于我们这个比喻中“信封”外面的东西就讲到这里：让我们看看信封里面。

## HTTPS

- <em>HTTP</em>，即<em>超文本传输协议（hypertext transfer protocol）</em>，是一种应用层协议，开发者通过它把数据从一个地方传输到另一个地方，构建出强大而有用的东西。<em>HTTPS</em> 是这个协议的安全版本。
- 当你看到像 `https://www.example.com` 这样的地址时，实际上你是在隐式地访问末尾带有一个 `/` 的地址。
- <em>路径（path）</em>指的是斜杠后面的内容。例如，`https://www.example.com/folder/file.html` 会访问 `example.com`，进入 `folder` 目录，然后访问名为 `file.html` 的文件。
- `.com` 称为<em>顶级域名（top-level domain）</em>，用来表示与这个地址相关的位置或组织类型。
- 这个地址中的 `https` 是用来连接该网址的协议。这里所说的协议，指的是 HTTP 使用 `GET` 或 `POST` <em>请求（request）</em>向服务器索取信息。例如，你可以启动 Google Chrome，右键点击并选择 `inspect`（检查）。打开 `developer tools`（开发者工具）并进入 `Network`（网络），勾选 `Preserve log`（保留日志），你就会看到 `Request Headers`（请求标头）。你会看到提到 `GET`。在其他浏览器中也可以做到，只是方法略有不同。
- 例如，在发出 GET 请求时，你的计算机可能会向服务器发送以下内容：
  
  ```
  GET / HTTP/2
  Host: www.harvard.edu
  ```
  
  注意，这是通过 HTTP 请求 www.harvard.edu 上提供的内容。
- 通常，向服务器发出请求之后，你会在 `Response Headers`（响应标头）中收到以下内容：
  
  ```
  HTTP/2 200
  Content-Type: text/html
  ```
- 这种检查日志的方法可能比实际需要的要复杂一些。你可以在 [cs50.dev](https://cs50.dev) 上分析 HTTP 协议的工作。例如，在终端窗口中输入以下内容：
  
  ```
  curl -I https://www.harvard.edu/
  ```
  
  注意，这条命令的输出返回了服务器响应的所有标头值。
- 通过网页浏览器中的开发者工具，你可以看到浏览上述网站时的所有 HTTP 请求。
- 此外，在终端窗口中执行以下命令：
  
  ```
  curl -I https://harvard.edu
  ```
  
  注意，你会看到一个 `301` 响应，它向浏览器提示在哪里可以找到正确的网站。
- 类似地，在终端窗口中执行以下命令：
  
  ```
  curl -I http://www.harvard.edu/
  ```
  
  注意，`https` 中的 `s` 被去掉了。服务器的响应会显示为 `301`，意味着该网站已被永久移动。
- 与 `301` 类似，代码 `404` 表示未找到指定的 URL。还有许多其他响应码，例如：
  
  ```
  200 OK
  301 Moved Permanently
  302 Found
  304 Not Modified
  307 Temporary Redirect
  401 Unauthorized
  403 Forbidden
  404 Not Found
  418 I'm a Teapot
  500 Internal Server Error
  503 Service Unavailable
  ```
- 值得一提的是，当 `500` 错误涉及你自己创建的产品或应用时，通常是你作为开发者的问题。这对下周的习题集，以及你可能的期末项目来说尤其重要！不过，`500` 错误也可能是由基础设施问题和第三方服务问题导致的。

## HTML

- <em>HTML</em>，即<em>超文本标记语言（hypertext markup language）</em>，由<em>标签（tag）</em>组成，每个标签可以有一些描述它的<em>属性（attribute）</em>。
- 在终端中输入 `code hello.html`，并编写如下代码：
  
  hello0.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates HTML -->
  
  <html lang="en">
      <head>
          <title>hello, title</title>
      </head>
      <body>
          hello, body
      </body>
  </html>
  ```
  
  注意，`html` 标签既打开又关闭了整个文件。另外请注意 `lang` 属性，它修改了 `html` 标签的行为。还要注意，这里既有 `head` 标签，也有 `body` 标签。缩进不是必需的，但它暗示了层级关系。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/hello0.html?download)下载这段代码。
- 你可以输入 `http-server` 来提供你的代码。这些内容现在可以通过一个很长的 URL 访问。点击它，就可以访问由你自己的代码生成的网站。
- 访问这个 URL 时，注意文件名 `hello.html` 出现在 URL 的末尾。另外，从 URL 可以看出，服务器是通过 8080 端口提供服务的。
- 标签的层级可以表示如下：
  
  ![html code next to a hierarchy showing parent and child nodes](https://cs50.harvard.edu/x/notes/8/cs50Week8Slide065.png)
- 了解这种层级关系，在之后学习 JavaScript 时会很有用。
- 浏览器会从上到下、从左到右读取你的 HTML 文件。
- 因为 HTML 中空白和缩进实际上会被忽略，所以你需要用 `<p>` 段落标签来打开和关闭一个段落。看下面的例子：
  
  paragraphs.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates paragraphs -->
  
  <html lang="en">
      <head>
          <title>paragraphs</title>
      </head>
      <body>
          <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus convallis scelerisque quam, vel hendrerit lectus viverra eu. Praesent posuere eget lectus ut faucibus. Etiam eu velit laoreet, gravida lorem in, viverra est. Cras ut purus neque. In porttitor non lorem id lobortis. Mauris gravida metus libero, quis maximus dui porta at. Donec lacinia felis consectetur venenatis scelerisque. Nulla eu nisl sollicitudin, varius velit sit amet, vehicula erat. Curabitur sollicitudin felis sit amet orci mattis, a tempus nulla pulvinar. Aliquam erat volutpat.
          </p>
          <p>
              Mauris ut dui in eros semper hendrerit. Morbi vel elit mi. Sed sit amet ex non quam dignissim dignissim et vel arcu. Pellentesque eget elementum orci. Morbi ac cursus ex. Pellentesque quis turpis blandit orci dapibus semper sed non nunc. Nulla et dolor nec lacus finibus volutpat. Sed non lorem diam. Donec feugiat interdum interdum. Vivamus et justo in enim blandit fermentum vel at elit. Phasellus eu ante vitae ligula varius aliquet. Etiam id posuere nibh.
          </p>
          <p>
              Aenean venenatis convallis ante a rhoncus. Nullam in metus vel diam vehicula tincidunt. Donec lacinia metus sem, sit amet egestas elit blandit sit amet. Nunc egestas sem quis nisl mattis semper. Pellentesque ut magna congue lorem eleifend sodales. Donec tortor tortor, aliquam vitae mollis sed, interdum ut lectus. Mauris non purus quis ipsum lacinia tincidunt.
          </p>
          <p>
              Integer at justo lacinia libero blandit aliquam ut ut dui. Quisque tincidunt facilisis venenatis. Nullam dictum odio quis lorem luctus, vel malesuada dolor luctus. Aenean placerat faucibus enim a facilisis. Maecenas eleifend quis massa sed eleifend. Ut ultricies, dui ac vulputate hendrerit, ex metus iaculis diam, vitae fermentum libero dui et ante. Phasellus suscipit, arcu ut consequat sagittis, massa urna accumsan massa, eu aliquet nulla lorem vitae arcu. Pellentesque rutrum felis et metus porta semper. Nam ac consectetur mauris.
          </p>
          <p>
              Suspendisse rutrum vestibulum odio, sed venenatis purus condimentum sed. Morbi ornare tincidunt augue eu auctor. Vivamus sagittis ac lectus at aliquet. Nulla urna mauris, interdum non nibh in, vehicula porta enim. Donec et posuere sapien. Pellentesque ultrices scelerisque ipsum, vel fermentum nibh tincidunt et. Proin gravida porta ipsum nec scelerisque. Vestibulum fringilla erat at turpis laoreet, nec hendrerit nisi scelerisque.
          </p>
          <p>
              Sed quis malesuada mi. Nam id purus quis augue sagittis pharetra. Nulla facilisi. Maecenas vel fringilla ante. Cras tristique, arcu sit amet blandit auctor, urna elit ultricies lacus, a malesuada eros dui id massa. Aliquam sem odio, pretium vel cursus eget, scelerisque at urna. Vestibulum posuere a turpis consectetur consectetur. Cras consequat, risus quis tempor egestas, nulla ipsum ornare erat, nec accumsan nibh lorem nec risus. Integer at iaculis lacus. Integer congue nunc massa, quis molestie felis pellentesque vestibulum. Nulla odio tortor, aliquam nec quam in, ornare aliquet sapien.
          </p>
      </body>
  </html>
  ```
  
  注意，段落以 `<p>` 标签开始，以 `</p>` 标签结束。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/paragraphs.html?download)下载这段代码。
- HTML 可以表示标题：
  
  headings.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates headings (for chapters, sections, subsections, etc.) -->
  
  <html lang="en">
  
      <head>
          <title>headings</title>
      </head>
  
      <body>
  
          <h1>One</h1>
          <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus convallis scelerisque quam, vel hendrerit lectus viverra eu. Praesent posuere eget lectus ut faucibus. Etiam eu velit laoreet, gravida lorem in, viverra est. Cras ut purus neque. In porttitor non lorem id lobortis. Mauris gravida metus libero, quis maximus dui porta at. Donec lacinia felis consectetur venenatis scelerisque. Nulla eu nisl sollicitudin, varius velit sit amet, vehicula erat. Curabitur sollicitudin felis sit amet orci mattis, a tempus nulla pulvinar. Aliquam erat volutpat.
          </p>
  
          <h2>Two</h2>
          <p>
              Mauris ut dui in eros semper hendrerit. Morbi vel elit mi. Sed sit amet ex non quam dignissim dignissim et vel arcu. Pellentesque eget elementum orci. Morbi ac cursus ex. Pellentesque quis turpis blandit orci dapibus semper sed non nunc. Nulla et dolor nec lacus finibus volutpat. Sed non lorem diam. Donec feugiat interdum interdum. Vivamus et justo in enim blandit fermentum vel at elit. Phasellus eu ante vitae ligula varius aliquet. Etiam id posuere nibh.
          </p>
  
          <h3>Three</h3>
          <p>
              Aenean venenatis convallis ante a rhoncus. Nullam in metus vel diam vehicula tincidunt. Donec lacinia metus sem, sit amet egestas elit blandit sit amet. Nunc egestas sem quis nisl mattis semper. Pellentesque ut magna congue lorem eleifend sodales. Donec tortor tortor, aliquam vitae mollis sed, interdum ut lectus. Mauris non purus quis ipsum lacinia tincidunt.
          </p>
  
          <h4>Four</h4>
          <p>
              Integer at justo lacinia libero blandit aliquam ut ut dui. Quisque tincidunt facilisis venenatis. Nullam dictum odio quis lorem luctus, vel malesuada dolor luctus. Aenean placerat faucibus enim a facilisis. Maecenas eleifend quis massa sed eleifend. Ut ultricies, dui ac vulputate hendrerit, ex metus iaculis diam, vitae fermentum libero dui et ante. Phasellus suscipit, arcu ut consequat sagittis, massa urna accumsan massa, eu aliquet nulla lorem vitae arcu. Pellentesque rutrum felis et metus porta semper. Nam ac consectetur mauris.
          </p>
  
          <h5>Five</h5>
          <p>
              Suspendisse rutrum vestibulum odio, sed venenatis purus condimentum sed. Morbi ornare tincidunt augue eu auctor. Vivamus sagittis ac lectus at aliquet. Nulla urna mauris, interdum non nibh in, vehicula porta enim. Donec et posuere sapien. Pellentesque ultrices scelerisque ipsum, vel fermentum nibh tincidunt et. Proin gravida porta ipsum nec scelerisque. Vestibulum fringilla erat at turpis laoreet, nec hendrerit nisi scelerisque.
          </p>
  
          <h6>Six</h6>
          <p>
              Sed quis malesuada mi. Nam id purus quis augue sagittis pharetra. Nulla facilisi. Maecenas vel fringilla ante. Cras tristique, arcu sit amet blandit auctor, urna elit ultricies lacus, a malesuada eros dui id massa. Aliquam sem odio, pretium vel cursus eget, scelerisque at urna. Vestibulum posuere a turpis consectetur consectetur. Cras consequat, risus quis tempor egestas, nulla ipsum ornare erat, nec accumsan nibh lorem nec risus. Integer at iaculis lacus. Integer congue nunc massa, quis molestie felis pellentesque vestibulum. Nulla odio tortor, aliquam nec quam in, ornare aliquet sapien.
          </p>
  
      </body>
  
  </html>
  ```
  
  注意，`<h1>`、`<h2>` 和 `<h3>` 表示不同级别的标题。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/headings.html?download)下载这段代码。
- 我们还可以在 HTML 中创建无序列表：
  
  lists0.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates (unordered) lists -->
  
  <html lang="en">
      <head>
          <title>list</title>
      </head>
      <body>
          <ul>
              <li>foo</li>
              <li>bar</li>
              <li>baz</li>
          </ul>
      </body>
  </html>
  ```
  
  注意，`<ul>` 标签创建了一个包含三个条目的无序列表。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/lists0.html?download)下载这段代码。
- 我们也可以在 HTML 中创建有序列表：
  
  lists1.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates (ordered) lists -->
  
  <html lang="en">
      <head>
          <title>list</title>
      </head>
      <body>
          <ol>
              <li>foo</li>
              <li>bar</li>
              <li>baz</li>
          </ol>
      </body>
  </html>
  ```
  
  注意，`<ol>` 标签创建了一个包含三个条目的有序列表。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/lists1.html?download)下载这段代码。
- 我们还可以在 HTML 中创建表格：
  
  table.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates table -->
  
  <html lang="en">
      <head>
          <title>table</title>
      </head>
      <body>
          <table>
              <tr>
                  <td>1</td>
                  <td>2</td>
                  <td>3</td>
              </tr>
              <tr>
                  <td>4</td>
                  <td>5</td>
                  <td>6</td>
              </tr>
              <tr>
                  <td>7</td>
                  <td>8</td>
                  <td>9</td>
              </tr>
              <tr>
                  <td>*</td>
                  <td>0</td>
                  <td>#</td>
              </tr>
          </table>
      </body>
  </html>
  ```
  
  表格同样有标签来打开和关闭其中的每个元素。另外请注意 HTML 中注释的语法。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/table.html?download)下载这段代码。
- HTML 中也可以使用图片：
  
  image.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates image -->
  
  <html lang="en">
      <head>
          <title>image</title>
      </head>
      <body>
          <img alt="photo of bridge" src="bridge.png">
      </body>
  </html>
  ```
  
  注意，`src="bridge.png"` 指明了图片文件所在的路径。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/image.html?download)下载这段代码。
- HTML 中也可以包含视频：
  
  video.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates video -->
  
  <html lang="en">
      <head>
          <title>video</title>
      </head>
      <body>
          <video controls muted>
              <source src="video.mp4" type="video/mp4">
          </video>
      </body>
  </html>
  ```
  
  注意，`type` 属性指明这是一个 `mp4` 类型的视频。另外请注意 `controls` 和 `muted` 是如何传给 `video` 的。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/video.html?download)下载这段代码。
- 你还可以在不同网页之间建立链接：
  
  link0.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates link -->
  
  <html lang="en">
      <head>
          <title>link</title>
      </head>
      <body>
        Visit <a href="image.html">Harvard</a>.
      </body>
  </html>
  ```
  
  注意，`<a>`，即<em>锚点（anchor）</em>标签，被用来把 `Harvard` 变成可链接的文本。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/link0.html?download)下载这段代码。
- 你还可以创建让人联想到 Google 搜索的表单：
  
  search0.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates form -->
  
  <html lang="en">
      <head>
          <title>search</title>
      </head>
      <body>
          <form action="https://www.google.com/search" method="get">
              <input name="q" type="search">
              <input type="submit" value="Google Search">
          </form>
      </body>
  </html>
  ```
  
  注意，`form` 标签打开时提供了它将执行什么 `action` 的属性。其中包含 `input` 字段，传入了名字 `q` 和类型 `search`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/search0.html?download)下载这段代码。
- 我们可以这样让这个搜索更好用：
  
  search1.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates additional form attributes -->
  
  <html lang="en">
      <head>
          <title>search</title>
      </head>
      <body>
          <form action="https://www.google.com/search" method="get">
              <input autocomplete="off" autofocus name="q" placeholder="Query" type="search">
              <button>Google Search</button>
          </form>
      </body>
  </html>
  ```
  
  注意，`autocomplete` 被设为 `off`，`autofocus` 被启用。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/search1.html?download)下载这段代码。
- 我们只看了可以添加到网站上的众多 HTML 元素中的一小部分。如果你想在网站上添加某个我们还没见过的东西（比如按钮、音频文件等），试着用 Google 搜索“X in HTML”来找到正确的语法！同样，你也可以使用 [cs50.ai](https://cs50.ai) 帮你发现更多 HTML 功能！

## 正则表达式

- <em>正则表达式（regular expression）</em>，或称 <em>regex</em>，是确保用户提供的数据符合特定格式的一种手段。
- 我们可以这样实现自己的注册页面，并使用正则表达式：
  
  register0.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates type="email" -->
  
  <html lang="en">
      <head>
          <title>register</title>
      </head>
      <body>
          <form>
              <input autocomplete="off" autofocus name="email" placeholder="Email" type="email">
              <button>Register</button>
          </form>
      </body>
  </html>
  ```
  
  注意，`input` 标签包含的属性表明它的类型是 `email`。浏览器知道要检查输入的是否是电子邮件地址。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/register0.html?download)下载这段代码。
- 浏览器使用这些内置属性来检查电子邮件地址，而我们还可以添加 `pattern` 属性，确保只有特定的数据才能成为电子邮件地址：
  
  register1.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates pattern attribute for email -->
  
  <html lang="en">
      <head>
          <title>register</title>
      </head>
      <body>
          <form>
              <input autocomplete="off" autofocus name="email" pattern=".+@.+\.edu" placeholder="Email" type="email">
              <button>Register</button>
          </form>
      </body>
  </html>
  ```
  
  注意，`pattern` 属性被赋予一个正则表达式，表示电子邮件地址必须包含一个 `@` 符号和 `.edu`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/register1.html?download)下载这段代码。
- 你可以在 [Mozilla 的文档](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions)中进一步了解正则表达式。此外，你也可以向 [cs50.ai](https://cs50.ai) 询问获取提示。

## CSS

- `CSS`，即<em>层叠样式表（cascading style sheet）</em>，是一种样式表语言，让你可以精细调整 HTML 文件的外观。
- CSS 里充满了<em>属性（property）</em>，它们包含键值对。
- 在终端中输入 `code home.html`，并编写如下代码：
  
  home0.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates inline CSS with P tags -->
  
  <html lang="en">
      <head>
          <title>css</title>
      </head>
      <body>
          <p style="font-size: large; text-align: center;">
              John Harvard
          </p>
          <p style="font-size: medium; text-align: center;">
              Welcome to my home page!
          </p>
          <p style="font-size: small; text-align: center;">
              Copyright &#169; John Harvard
          </p>
      </body>
  </html>
  ```
  
  注意，`<p>` 标签被加上了一些 `style` 属性。`font-size` 被设为 `large`、`medium` 或 `small`，然后 `text-align` 被设为居中。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/home0.html?download)下载这段代码。
- 上面的写法虽然正确，但设计得并不好。我们可以把代码修改如下，以去除冗余：
  
  home3.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Removes outer DIV -->
  
  <html lang="en">
      <head>
          <title>css</title>
      </head>
      <body style="text-align: center">
          <div style="font-size: large">
              John Harvard
          </div>
          <div style="font-size: medium">
              Welcome to my home page!
          </div>
          <div style="font-size: small">
              Copyright &#169; John Harvard
          </div>
      </body>
  </html>
  ```
  
  注意，`<div>` 标签被用来把这个 HTML 文件划分成特定的区域。`text-align: center` 作用于整个 HTML 的 body。因为 `body` 里的一切都是 `body` 的子元素，所以 `center` 属性会层叠（cascade）下去，作用到这些子元素上。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/home3.html?download)下载这段代码。
- 事实上，HTML 中还有一些较新的语义化标签。我们可以把代码修改如下：
  
  home4.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates class selectors -->
  
  <html lang="en">
      <head>
          <style>
  
              .centered
              {
                  text-align: center;
              }
  
              .large
              {
                  font-size: large;
              }
  
              .medium
              {
                  font-size: medium;
              }
  
              .small
              {
                  font-size: small;
              }
  
          </style>
          <title>css</title>
      </head>
      <body class="centered">
          <header class="large">
              John Harvard
          </header>
          <main class="medium">
              Welcome to my home page!
          </main>
          <footer class="small">
              Copyright &#169; John Harvard
          </footer>
      </body>
  </html>
  ```
  
  注意，所有样式都放在了 `head` 里，包在 `style` 标签中。另外请注意，我们给元素分配了名为 `centered`、`large`、`medium` 和 `small` 的<em>类（class）</em>，并且通过在名字前加一个点来选中这些类，比如 `.centered`。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/home4.html?download)下载这段代码。
- 事实上，我们可以把所有样式代码移到一个特殊的文件中，叫做 <em>CSS</em> 文件。我们可以创建一个叫 `style.css` 的文件，把我们的类粘贴进去：
  
  home7.css
  
  ```
  .centered
  {
      text-align: center;
  }
  
  .large
  {
      font-size: large;
  }
  
  .medium
  {
      font-size: medium;
  }
  
  .small
  {
      font-size: small;
  }
  ```
  
  注意，这和我们 HTML 文件里原来的内容一字不差。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/home7.css?download)下载这段代码。
- 然后，我们可以告诉浏览器在哪里找到这个 HTML 文件对应的 CSS：
  
  home7.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates external stylesheets -->
  
  <html lang="en">
      <head>
          <link href="style.css" rel="stylesheet">
          <title>css</title>
      </head>
      <body class="centered">
          <header class="large">
              John Harvard
          </header>
          <main class="medium">
              Welcome to my home page!
          </main>
          <footer class="small">
              Copyright &#169; John Harvard
          </footer>
      </body>
  </html>
  ```
  
  注意，`style.css` 作为样式表被链接到这个 HTML 文件，告诉浏览器去哪里找到我们创建的样式。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/home7.html?download)下载这段代码。

## 框架

- 与我们可以在 Python 中使用的第三方库类似，也有一些第三方库叫做<em>框架（framework）</em>，可以用在我们的 HTML 文件中。
- <em>Bootstrap</em> 就是这类框架之一，我们可以用它来美化 HTML，并轻松完善设计元素，让页面更易读。
- 在 html 文件的 `head` 中加入下面的 `link` 标签，就可以使用 Bootstrap：
  
  ```
  <head>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB" crossorigin="anonymous">
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js" integrity="sha384-FKyoEForCGlyvwx9Hj09JcYn3nv7wiPVlz7YYwJrWVcXK/BmnVDxM+D2scQbITxI" crossorigin="anonymous"></script>
      <title>bootstrap</title>
  </head>
  ```
- 看下面的 HTML：
  
  phonebook0.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates table -->
  
  <html lang="en">
      <head>
          <title>phonebook</title>
      </head>
      <body>
          <table>
              <thead>
                  <tr>
                      <th>Name</th>
                      <th>Number</th>
                  </tr>
              </thead>
              <tbody>
                  <tr>
                      <td>Kelly</td>
                      <td>+1-617-495-1000</td>
                  </tr>
                  <tr>
                      <td>David</td>
                      <td>+1-617-495-1000</td>
                  </tr>
                  <tr>
                      <td>John</td>
                      <td>+1-949-468-2750</td>
                  </tr>
              </tbody>
          </table>
      </body>
  </html>
  ```
  
  注意，查看这个页面的服务版本时，它相当朴素。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/phonebook0.html?download)下载这段代码。
- 现在看下面这段使用了 Bootstrap 的 HTML：
  
  phonebook1.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates table with Bootstrap -->
  
  <html lang="en">
      <head>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB" crossorigin="anonymous">
          <title>phonebook</title>
      </head>
      <body>
          <table class="table">
              <thead>
                  <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Number</th>
                  </tr>
              </thead>
              <tbody>
                  <tr>
                      <td>Kelly</td>
                      <td>+1-617-495-1000</td>
                  </tr>
                  <tr>
                      <td>David</td>
                      <td>+1-949-468-2750</td>
                  </tr>
              </tbody>
          </table>
      </body>
  </html>
  ```
  
  注意，这个网站现在漂亮多了。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/phonebook1.html?download)下载这段代码。
- 你可以在 [Bootstrap 文档](https://getbootstrap.com/docs/)中进一步了解这方面的内容。

## JavaScript

- JavaScript 是另一门编程语言，它让网页具有交互性。
- 看下面这个同时包含 JavaScript 和 HTML 的 `hello.html` 实现：
  
  hello1.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates onsubmit -->
  
  <html lang="en">
      <head>
          <script>
  
              function greet()
              {
                  alert('hello, ' + document.querySelector('#name').value);
              }
  
          </script>
          <title>hello</title>
      </head>
      <body>
          <form onsubmit="greet(); return false;">
              <input autocomplete="off" autofocus id="name" placeholder="Name" type="text">
              <input type="submit">
          </form>
      </body>
  </html>
  ```
  
  注意，这个表单使用 `onsubmit` 属性来触发文件顶部的一段脚本。该脚本使用 alert 创建一个弹出提示框。`document.querySelector('#name').value` 选中页面上 `id` 为 `name` 的文本框，并获取用户输入的值。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/hello1.html?download)下载这段代码。
- 一般来说，把 onsubmit 和 JavaScript 混在一起被认为是糟糕的设计。我们可以把代码改进如下：
  
  hello3.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates DOMContentLoaded -->
  
  <html lang="en">
      <head>
          <script>
  
              document.addEventListener('DOMContentLoaded', function() {
                  document.querySelector('form').addEventListener('submit', function(e) {
                      alert('hello, ' + document.querySelector('#name').value);
                      e.preventDefault();
                  });
              });
  
          </script>
          <title>hello</title>
      </head>
      <body>
          <form>
              <input autocomplete="off" autofocus id="name" placeholder="Name" type="text">
              <input type="submit">
          </form>
      </body>
  </html>
  ```
  
  注意，这个版本的代码创建了一个 `addEventListener` 来监听表单的 `submit` 被触发。注意 `DOMContentLoaded` 确保整个页面加载完成后才执行 JavaScript。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/hello3.html?download)下载这段代码。
- 我们可以进一步改进这段代码：
  
  hello5.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates keyup and template literals -->
  
  <html lang="en">
      <head>
          <script>
  
              document.addEventListener('DOMContentLoaded', function() {
                  let input = document.querySelector('input');
                  input.addEventListener('keyup', function(event) {
                      let name = document.querySelector('p');
                      if (input.value) {
                          name.innerHTML = `hello, ${input.value}`;
                      }
                      else {
                          name.innerHTML = 'hello, whoever you are';
                      }
                  });
              });
  
          </script>
          <title>hello</title>
      </head>
      <body>
          <form>
              <input autocomplete="off" autofocus placeholder="Name" type="text">
          </form>
          <p></p>
      </body>
  </html>
  ```
  
  注意，当用户输入名字时，内存中的 DOM 会被动态更新。如果 `input` 中有值，那么在键盘 `keyup` 时，DOM 就会被更新；否则，显示默认文本。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/hello5.html?download)下载这段代码。
- JavaScript 让你可以动态地读取和修改加载到内存中的 html 文档，这样用户无需重新加载就能看到变化。
- 看下面的 HTML：
  
  background.html
  
  ```
  <!DOCTYPE html>
  
  <!-- Demonstrates programmatic changes to style -->
  
  <html lang="en">
      <head>
          <title>background</title>
      </head>
      <body>
          <button id="red">R</button>
          <button id="green">G</button>
          <button id="blue">B</button>
          <script>
  
              let body = document.querySelector('body');
              document.querySelector('#red').addEventListener('click', function() {
                  body.style.backgroundColor = 'red';
              });
              document.querySelector('#green').addEventListener('click', function() {
                  body.style.backgroundColor = 'green';
              });
              document.querySelector('#blue').addEventListener('click', function() {
                  body.style.backgroundColor = 'blue';
              });
  
          </script>
      </body>
  </html>
  ```
  
  注意，JavaScript 监听某个特定按钮何时被点击。发生这样的点击时，页面上的某些样式属性就会被改变。`body` 被定义为页面的 body。然后，一个事件监听器等待其中一个按钮被点击，接着 `body.style.backgroundColor` 被改变。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/background.html?download)下载这段代码。
- 类似地，看下面的例子：
  
  blink.html
  
  ```
  <!DOCTYPE html>
  
  <html lang="en">
      <head>
          <script>
  
              // Toggles visibility of greeting
              function blink()
              {
                  let body = document.querySelector('body');
                  if (body.style.visibility == 'hidden')
                  {
                      body.style.visibility = 'visible';
                  }
                  else
                  {
                      body.style.visibility = 'hidden';
                  }
              }
  
              // Blink every 500ms
              window.setInterval(blink, 500);
  
          </script>
          <title>blink</title>
      </head>
      <body>
          hello, world
      </body>
  </html>
  ```
  
  这个例子会让一段文字按设定的间隔闪烁。注意 `window.setInterval` 接收两个参数：要调用的函数，以及两次函数调用之间的等待时间（以毫秒为单位）。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/blink.html?download)下载这段代码。
- 看下面这个实现文本自动补全的 JavaScript：
  
  autocomplete.html
  
  ```
  <!DOCTYPE html>
  
  <html lang="en">
  
      <head>
          <title>autocomplete</title>
      </head>
  
      <body>
  
          <input autocomplete="off" autofocus placeholder="Query" type="text">
  
          <ul></ul>
  
          <script src="large.js"></script>
          <script>
        
              let input = document.querySelector('input');
              input.addEventListener('keyup', function(event) {
                  let html = '';
                  if (input.value) {
                      for (word of WORDS) {
                          if (word.startsWith(input.value)) {
                              html += `<li>${word}</li>`;
                          }
                      }
                  }
                  document.querySelector('ul').innerHTML = html;
              });
  
          </script>
  
      </body>
  </html>
  ```
  
  这是用 JavaScript 实现的自动补全。它从一个叫 `large.js` 的文件（此处未展示）中读取内容，该文件是一个单词列表。你可以在[这里](https://cdn.cs50.net/2025/fall/lectures/8/src8/autocomplete.html?download)下载这段代码。
- JavaScript 的功能非常多，可以在 [JavaScript 文档](https://developer.mozilla.org/en-US/docs/Web/JavaScript)中查阅。

## 小结

在这一讲中，你学习了如何创建自己的 HTML 文件、为它们添加样式、利用第三方框架，以及使用 JavaScript。具体来说，我们讨论了……

- 互联网
- 路由器
- DNS
- DHCP
- HTTPS
- HTML
- 正则表达式
- CSS
- 框架
- JavaScript

下次再见！
