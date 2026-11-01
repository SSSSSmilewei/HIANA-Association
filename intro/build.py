"""把 v6 的几块拼成一个 HTML，并把字体切成子集内联进去。
用法：python3 intro/build.py public/intro/index.html（详见 intro/README.md）
  像素字 Fusion Pixel 12px：整套内联
  更纱黑体 / 等距更纱黑体（仓库 public/fonts/sarasa 里的分片）：只收标在 sarasa 记号之间的文字（终端、仿真的网站首页）
"""
import base64, io, os, re, sys
from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, ".."))
SAR = os.path.join(REPO, "public/fonts/sarasa")
PIXEL = os.path.join(HERE, "fonts/fusion-pixel-12px-proportional-sc-latin-400-normal.woff2")

def read(n): return open(os.path.join(HERE, "src", n), encoding="utf-8").read()
css, body, js = read("style.css"), read("body.html"), read("app.js")

def sub(path, chars):
    f = TTFont(path)
    cmap = f.getBestCmap()
    have = sorted(c for c in chars if ord(c) in cmap)
    if not have: return None, []
    opt = subset.Options(); opt.flavor = "woff2"; opt.layout_features = ["*"]; opt.hinting = False; opt.name_IDs = ["*"]
    s = subset.Subsetter(opt); s.populate(text="".join(have)); s.subset(f)
    out = io.BytesIO(); f.flavor = "woff2"; f.save(out)
    return base64.b64encode(out.getvalue()).decode(), have

def urange(cs):
    cps = sorted(ord(c) for c in cs); out = []; i = 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1: j += 1
        out.append(f"U+{cps[i]:X}" if i == j else f"U+{cps[i]:X}-{cps[j]:X}"); i = j + 1
    return ", ".join(out)

ascii_ = set(chr(i) for i in range(32, 127))
full = css + body + js
pix_chars = set(c for c in full if ord(c) > 127) | ascii_
# 像素字整套内联（约 600 KB）：报名表里用户打的任何字也是像素字
b = base64.b64encode(open(PIXEL, "rb").read()).decode()
css = css.replace("__PIXEL_FONT__", b)

mark = "".join(re.findall(r"<!--sarasa-->(.*?)<!--/sarasa-->", body, re.S)) + "".join(re.findall(r"/\*sarasa\*/(.*?)/\*/sarasa\*/", js, re.S))
sar_chars = set(c for c in mark if ord(c) > 127) | ascii_ | set("，。、：；！？…—·《》「」（）")
faces = []
for w in (400, 600):
    for i in range(15):
        p = os.path.join(SAR, f"gothic-{w}.{i}.woff2")
        if not os.path.exists(p): continue
        b, have = sub(p, sar_chars)
        if b: faces.append(f'@font-face{{font-family:"HianaSans";src:url(data:font/woff2;base64,{b}) format("woff2");font-weight:{w};font-display:block;unicode-range:{urange(have)}}}')
for w in (400, 700):
    b, have = sub(os.path.join(SAR, f"mono-{w}.0.woff2"), ascii_ | set("✓▸·—"))
    faces.append(f'@font-face{{font-family:"HianaMono";src:url(data:font/woff2;base64,{b}) format("woff2");font-weight:{w};font-display:block;unicode-range:{urange(have)}}}')
css = css.replace("/*__SANS_FACES__*/", "\n".join(faces))

html = body.replace("<!--sarasa-->", "").replace("<!--/sarasa-->", "")
# 独立页面（不是 artifact 了）：要有 doctype，否则浏览器按怪异模式排版
out = '<!doctype html>\n<html lang="zh-CN">\n' + css + "\n" + html + "\n<script>\n" + js.replace("/*sarasa*/", "").replace("/*/sarasa*/", "") + "\n</script>\n"
open(sys.argv[1], "w", encoding="utf-8").write(out)
print(f"{len(pix_chars)} pixel chars, {len(sar_chars)} sarasa chars, {len(faces)} sarasa faces, {len(out)//1024} KB")
