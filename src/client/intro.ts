/**
 * 开场动画（public/intro/，源文件在 intro/）。游客第一次打开首页时先播一遍，以后不再自动跳。
 * 动画页自己也会写这个键（intro/src/app.js 里的 SEEN_KEY），两边要一致。
 */
export const INTRO_SEEN_KEY = "hiana.intro.seen";

let decided: boolean | null = null;

/**
 * 这次该不该自动跳到开场。跳之前先记下“看过了”，所以中途关掉也不会再跳；
 * 隐私模式下 localStorage 读写会报错，这时当作看过了，不让人卡在动画里。
 * 结果在这次页面加载里固定下来，重复渲染不会变。
 */
export function shouldPlayIntro(): boolean {
  if (decided !== null) return decided;
  try {
    if (localStorage.getItem(INTRO_SEEN_KEY) === "1") decided = false;
    else {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
      decided = localStorage.getItem(INTRO_SEEN_KEY) === "1";
    }
  } catch {
    decided = false;
  }
  return decided;
}
