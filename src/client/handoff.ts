/**
 * 从开场动画（/intro/）点「进入平台」过来时的接力过渡。
 *
 * 动画最后让按钮铺满整屏白色，跳转前在 sessionStorage 留 hiana.intro.handoff；
 * index.html 开头的内联脚本（scripts/build.mjs）看到它，就给 <html> 加 data-handoff="hold"，
 * 用一整屏白色盖住加载过程，接住动画的最后一帧。等页面第一次画好，这里把它改成 "play"：
 * 白色淡出，侧边栏、底栏、页面内容依次滑进来（styles/handoff.css）。
 *
 * 平时直接打开网站、刷新、站内跳转都没有这个标记，不会播。系统设了“减少动态效果”也不播。
 */
let done = false;

export function playHandoff() {
  if (done) return;
  done = true;
  const root = document.documentElement;
  if (root.getAttribute("data-handoff") !== "hold") return;
  // 等两帧：确保页面已经画出来，再揭开白屏
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      root.setAttribute("data-handoff", "play");
      setTimeout(() => root.removeAttribute("data-handoff"), 1200);
    }),
  );
}
