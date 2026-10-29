"""把更纱黑体切成网页用的 woff2 分片，输出到 public/fonts/sarasa/，并生成 src/client/styles/fonts.css。

字体太大（每个字重 13 MB），只收 GB2312 全部汉字 + 站内用到的字 + 拉丁字母和常用符号：
  - 第 0 片：拉丁字母、标点、箭头、制表符
  - 第 1–2 片：站内文字里出现频率最高的汉字（大部分页面只用这两片）
  - 其余：剩下的字按码位连续分块
浏览器按 unicode-range 只下载页面用到的分片。

用法（需要 fonttools 和 brotli）：
  python3 scripts/subset-fonts.py <放 SarasaGothicSC-*.ttf 和 SarasaMonoSC-*.ttf 的目录>
字体：https://github.com/be5invis/Sarasa-Gothic（SIL OFL 1.1）
"""
import os, sys, collections
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = sys.argv[1]
OUT = os.path.join(ROOT, "public/fonts/sarasa")
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith(".woff2"): os.remove(os.path.join(OUT, f))

LATIN = [(0x20, 0x7E), (0xA0, 0x24F), (0x2000, 0x206F), (0x20A0, 0x20CF), (0x2100, 0x218F), (0x2190, 0x21FF), (0x2200, 0x22FF), (0x2300, 0x23FF), (0x2460, 0x24FF), (0x2500, 0x259F), (0x25A0, 0x25FF), (0x2600, 0x26FF), (0x2700, 0x27BF)]
CJK_SYM = [(0x3000, 0x303F), (0xFF00, 0xFFEF), (0x3200, 0x32FF)]

def gb2312():
    out = set()
    for hi in range(0xB0, 0xF8):
        for lo in range(0xA1, 0xFF):
            try: out.add(ord(bytes([hi, lo]).decode("gb2312")))
            except UnicodeDecodeError: pass
    return out

def site_freq():
    c = collections.Counter()
    for base in ("src", "content", "app/lib"):
        for d, _, fs in os.walk(os.path.join(ROOT, base)):
            for f in fs:
                if f.endswith((".ts", ".tsx", ".json", ".md", ".dart")):
                    for ch in open(os.path.join(d, f), encoding="utf-8", errors="ignore").read():
                        if "一" <= ch <= "鿿" or "㐀" <= ch <= "䶿": c[ch] += 1
    return c

def ranges(cps):
    cps = sorted(cps)
    out, start, prev = [], None, None
    for cp in cps:
        if start is None: start = prev = cp
        elif cp == prev + 1: prev = cp
        else: out.append((start, prev)); start = prev = cp
    if start is not None: out.append((start, prev))
    return out

def urange(rs):
    return ", ".join(f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in rs)

cmap = TTFont(os.path.join(SRC, "SarasaGothicSC-Regular.ttf")).getBestCmap()
freq = site_freq()
han = (gb2312() | set(map(ord, freq))) & set(cmap)
by_freq = [ord(ch) for ch, _ in freq.most_common() if ord(ch) in cmap]
hot1, hot2 = set(by_freq[:900]), set(by_freq[900:2600])
rest = sorted(han - hot1 - hot2)

slices = [("0", [r for r in LATIN + CJK_SYM])]
slices.append(("1", ranges(hot1)))
slices.append(("2", ranges(hot2)))
CHUNK = 420
for i in range(0, len(rest), CHUNK):
    part = rest[i : i + CHUNK]
    # 按码位连续分块：unicode-range 写成一整段，中间夹着的热门字已经在前两片里，重复声明没关系
    slices.append((str(3 + i // CHUNK), [(part[0], part[-1])]))

def cps_of(rs, allowed):
    s = set()
    for a, b in rs: s.update(cp for cp in range(a, b + 1) if cp in allowed)
    return s

FACES = [
    ("Sarasa Gothic SC", "SarasaGothicSC-Regular.ttf", "gothic-400", "400", None),
    ("Sarasa Gothic SC", "SarasaGothicSC-SemiBold.ttf", "gothic-600", "500 800", None),
    ("Sarasa Mono SC", "SarasaMonoSC-Regular.ttf", "mono-400", "400", ["0"]),
    ("Sarasa Mono SC", "SarasaMonoSC-Bold.ttf", "mono-700", "500 800", ["0"]),
]
css = ["/* 由 scripts/subset-fonts.py 生成，不要手改。更纱黑体 Sarasa Gothic，SIL OFL 1.1 */"]
total = 0
for family, ttf, name, weight, only in FACES:
    path = os.path.join(SRC, ttf)
    fcmap = TTFont(path).getBestCmap()
    for sid, rs in slices:
        if only and sid not in only: continue
        if sid == "1": cps = hot1
        elif sid == "2": cps = hot2
        else: cps = cps_of(rs, set(fcmap)) - (hot1 | hot2 if sid not in ("0",) else set())
        cps &= set(fcmap)
        if not cps: continue
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["kern", "liga", "calt", "locl", "vert", "palt", "halt"] if sid == "0" else ["locl", "vert"]
        opts.name_IDs = []
        opts.notdef_outline = False
        opts.hinting = False
        opts.desubroutinize = True
        opts.drop_tables += ["gasp", "DSIG", "hdmx", "VDMX", "LTSH"]
        font = TTFont(path)
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=cps)
        sub.subset(font)
        fn = f"{name}.{sid}.woff2"
        font.flavor = "woff2"
        font.save(os.path.join(OUT, fn))
        size = os.path.getsize(os.path.join(OUT, fn))
        total += size
        ur = urange(ranges(cps)) if sid in ("1", "2") else urange(rs)
        css.append(f'@font-face{{font-family:"{family}";src:url("/fonts/sarasa/{fn}") format("woff2");font-weight:{weight};font-display:swap;unicode-range:{ur}}}')
    print(name, "done")
open(os.path.join(ROOT, "src/client/styles/fonts.css"), "w").write("\n".join(css) + "\n")
print(f"{len(slices)} 片，共 {total / 1024 / 1024:.1f} MB")
