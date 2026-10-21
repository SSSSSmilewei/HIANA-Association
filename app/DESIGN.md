# 界面设计说明

界面以 miuix / HyperOS 规范为准：颜色、字号、圆角、动效都用 flutter_miuix 的主题角色，不自己写色值。下面是在规范之内做的取舍。

## 力气花在哪

整个 App 只有一个“花力气”的视觉元素：**学习热力图**。

协会不排连续打卡、不搞排行，热力图是学员唯一能看到“自己这段时间做了什么”的地方。首页放 17 周的迷你版，“我的”页放总览加分平台的小图，点格子能看当天的次数。颜色取主题主色的五档深浅，跟着深浅色模式和壁纸取色一起变。

其余界面保持 HyperOS 原样：设置页式的分组卡片、可折叠大标题、底部三个标签。不加渐变、阴影和装饰插图。

## 页面骨架

所有页面都套 `HianaPage`（参考 NexioSchedule 的 DocumentPageScaffold）：

- 大标题顶栏和列表共用一个滚动行为，否则折叠不联动
- 左右两侧让出刘海和挖孔的安全区；标签页的底部让出导航栏高度
- 需要时带下拉刷新

主界面的三个标签放在横向分页器里，左右滑动也能切换（参考 NexioSchedule）。

## 文案

- 按钮写清楚会发生什么：“打卡”“激活账号”“绑定并同步”“解除绑定”，前后用同一个词。成功提示对应地写“打卡成功”“已绑定”。
- 错误直接显示后端返回的中文说明，它们已经写了怎么办，例如“现在不在打卡时间，晚自习打卡时间是 19:00 到 21:30”。
- 不写“请”“成功地”“简单”这类词，也不用感叹号。
- 提示卡片（`NoticeCard`）参考 KernelSU 管理器的 WarningCard：出错用主题的 error 角色，普通说明用 secondary 角色。

## 参考过的开源项目

只学了页面结构和交互，没有复制代码（它们是 GPL / AGPL，本仓库是 MIT）：

- [NexioSchedule](https://github.com/HaoZai000/NexioSchedule)：统一页面骨架、标签分页
- [KernelSU](https://github.com/tiann/KernelSU) 管理器的 Miuix 主题：警告卡片
- [Mishka](https://github.com/YuKongA/Mishka)：设置页分组
- 以及 [awesome-miuix](https://github.com/YuKongA/awesome-miuix) 清单里的其他项目
