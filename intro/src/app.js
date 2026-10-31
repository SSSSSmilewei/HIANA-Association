(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const OUT = "cubic-bezier(.2,.8,.2,1)", BACK = "cubic-bezier(.3,1.5,.5,1)", INOUT = "cubic-bezier(.65,0,.35,1)";
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tick0 = () => new Promise((r) => setTimeout(r, 0));
  const world = $("world"), view = $("view"), srLine = $("srLine");
  /* 颜色：和 CSS 里的变量是同一套 */
  const C = {
    line: "#2C6E87", ink: "#1D4B5E", sub: "#4D7686", aqua: "#00BFFF", mizu: "#BCE2E8", lb: "#ADD8E6", hana: "#AFDFE4",
    ag: "#88BFBF", wg: "#A5C9C1", pale: "#E3F2F5", pale2: "#C4E2E8", mist: "#F2FAFB", deep: "#0D2833",
    hl: "#FFF1A8", amber: "#D99A00", clay: "#D97757", ok: "#2F8F83", bad: "#C64B5A", white: "#FFFFFF",
  };

  /* ================= 声音：WebAudio 现场合成 ================= */
  const sfx = (() => {
    let ac = null, master = null, nbuf = null, muted = false;
    function A() {
      if (!ac) {
        try {
          ac = new (window.AudioContext || window.webkitAudioContext)();
          master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
          nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
          const d = nbuf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        } catch (e) { ac = null; }
      }
      if (ac && ac.state === "suspended") ac.resume();
      return ac;
    }
    function tone(f, d, o = {}) {
      const a = A(); if (!a || muted) return;
      const t = a.currentTime + (o.at || 0);
      const osc = a.createOscillator(), g = a.createGain();
      osc.type = o.type || "triangle";
      osc.frequency.setValueAtTime(f, t);
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(f * o.slide, t + d);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(o.vol || 0.1, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      osc.connect(g).connect(master);
      osc.start(t); osc.stop(t + d + 0.03);
    }
    function noise(d, o = {}) {
      const a = A(); if (!a || muted) return;
      const t = a.currentTime + (o.at || 0);
      const s = a.createBufferSource(); s.buffer = nbuf; s.loop = true;
      const f = a.createBiquadFilter(); f.type = o.type || "bandpass"; f.Q.value = o.q || 1;
      f.frequency.setValueAtTime(o.f || 1200, t);
      if (o.sweep) f.frequency.exponentialRampToValueAtTime((o.f || 1200) * o.sweep, t + d);
      const g = a.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(o.vol || 0.1, t + (o.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(f).connect(g).connect(master);
      s.start(t, Math.random() * 0.5); s.stop(t + d + 0.03);
    }
    return {
      unlock: A,
      ctx: () => A(),
      get master() { return master; },
      get nbuf() { return nbuf; },
      get muted() { return muted; },
      set muted(v) { muted = v; },
      blip: (who) => (who === "wall" ? tone(196, 0.05, { type: "square", vol: 0.03 }) : tone(622, 0.04, { type: "square", vol: 0.022 })),
      tok: (n) => { noise(0.07, { f: 2400, q: 2.5, vol: 0.22 }); tone(150 - n * 12, 0.14, { type: "sine", vol: 0.28, slide: 0.5 }); },
      crumble: () => { noise(1.1, { f: 900, q: 0.6, vol: 0.2, type: "lowpass", sweep: 0.3 }); tone(80, 0.6, { type: "sine", vol: 0.3, slide: 0.5 }); },
      seal: () => { noise(0.9, { f: 300, q: 0.6, vol: 0.14, type: "lowpass", sweep: 3 }); tone(60, 0.5, { type: "sine", vol: 0.22, slide: 1.6 }); },
      lift: () => tone(392, 0.05, { type: "square", vol: 0.016 }),
      pop: () => tone(700, 0.07, { type: "triangle", vol: 0.05, slide: 1.4 }),
      draw: () => noise(0.32, { f: 3200, q: 0.9, vol: 0.035, type: "highpass", attack: 0.08 }),
      whoosh: () => noise(0.7, { f: 360, q: 0.8, vol: 0.06, sweep: 3.5, attack: 0.2 }),
      rewind: () => { [988, 784, 622, 494].forEach((f, i) => tone(f, 0.05, { type: "square", vol: 0.018, at: i * 0.04 })); noise(0.3, { f: 2400, q: 1, vol: 0.03, sweep: 0.4 }); },
      erase: () => noise(0.09, { f: 1800 + Math.random() * 900, q: 1.4, vol: 0.06 }),
      chime: () => { tone(784, 0.3, { vol: 0.06 }); tone(1175, 0.42, { vol: 0.045, at: 0.09 }); },
      ok: () => { tone(523, 0.1, { vol: 0.06 }); tone(784, 0.16, { vol: 0.06, at: 0.09 }); },
      nope: () => { tone(220, 0.12, { type: "square", vol: 0.035 }); tone(165, 0.16, { type: "square", vol: 0.035, at: 0.1 }); },
      hop: () => tone(523, 0.08, { type: "square", vol: 0.018, slide: 1.5 }),
      step: (i) => tone(392 * Math.pow(1.122, i), 0.12, { type: "square", vol: 0.03 }),
      fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, { type: "square", vol: 0.03, at: i * 0.09 })),
      bell: () => { tone(330, 1.6, { type: "sine", vol: 0.12 }); tone(495, 1.2, { type: "sine", vol: 0.05, at: 0.02 }); },
    };
  })();
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  /* ================= 配乐：同样现场合成，按段落换氛围，在小节处交叉淡入 =================
     wall 黑屏里低低的心跳和长音；tour 主旅程，轻快的五声音阶；night 灯塔夜海，慢、小调、钟声；
     dawn 彼岸和结尾，明亮；form 填表和首页时安静的背景 */
  const music = (() => {
    const CH = {
      C: [36, 60, 64, 67, 72], Am: [45, 57, 60, 64, 69], F: [41, 57, 60, 65, 69], G: [43, 55, 59, 62, 67],
      Em: [40, 55, 59, 64, 67], Dm: [38, 57, 62, 65, 69],
      Cmaj7: [36, 60, 64, 67, 71], Am7: [45, 57, 60, 64, 67], Dm7: [38, 57, 60, 62, 65], G7: [43, 55, 59, 62, 65],
    };
    const _ = null;
    const MOODS = {
      wall: { bpm: 60, chords: ["Am", "Am", "F", "Em"], drone: true, glint: true },
      tour: {
        bpm: 104, chords: ["C", "Am", "F", "G", "C", "Am", "F", "G"], bass: [0, 4, 6], arp: [0, 1, 2, 3, 2, 1, 0, 1], arpType: "square", arpVol: 0.022, hat: true, kick: [0, 4],
        mel: [76, _, 79, _, 81, 79, 76, _, 84, _, 81, _, 79, _, 76, _, 74, _, 76, 79, _, 81, 79, _, 76, _, 74, _, _, _, _, _,
              76, _, 79, _, 81, 84, 81, _, 84, _, 86, _, 84, _, 81, _, 79, _, 81, 84, _, 81, 79, _, 72, _, 74, 76, 72, _, _, _],
        melFrom: 1,
      },
      night: {
        bpm: 70, chords: ["Am", "F", "C", "G"], pad: true, bass: [0], arp: [0, _, 2, _, 3, _, 2, _], arpType: "triangle", arpVol: 0.05,
        mel: [81, _, _, _, _, _, _, _, 77, _, _, _, 76, _, _, _, 79, _, _, _, _, _, _, _, 74, _, _, _, _, _, _, _], melType: "sine", melVol: 0.07, melLen: 6,
      },
      dawn: {
        bpm: 92, chords: ["F", "G", "Em", "Am", "F", "G", "C", "C"], pad: true, bass: [0, 3, 4], arp: [0, 1, 2, 3, 4, 3, 2, 1], arpType: "triangle", arpVol: 0.045, hat: true,
        mel: [81, _, 79, _, 77, _, 79, 81, 79, _, 74, _, 76, _, 79, _, 79, _, 76, _, 74, _, 72, _, 72, _, 76, _, 79, _, _, _,
              81, _, 84, _, 86, _, 84, 81, 79, _, 81, _, 79, 76, 74, _, 76, _, 79, _, 76, _, 74, _, 72, _, _, _, _, _, _, _],
      },
      form: { bpm: 84, chords: ["Cmaj7", "Am7", "Dm7", "G7"], bass: [0], arp: [0, _, 1, 2, _, 3, _, 2], arpType: "triangle", arpVol: 0.04, pad: true },
    };
    let out = null, cur = null, want = null, timer = null, slot = 0, t = 0, muted = false;
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    function voice(bus, midi, at, dur, type, vol, cut) {
      const a = sfx.ctx();
      const o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.value = hz(midi);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(vol, at + Math.min(0.02, dur / 4));
      g.gain.setTargetAtTime(0, at + dur * 0.6, dur * 0.25);
      let n = o;
      if (cut) { const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cut; o.connect(f); n = f; }
      n.connect(g).connect(bus);
      o.start(at); o.stop(at + dur * 1.6 + 0.1);
    }
    function hit(bus, at, kind) {
      const a = sfx.ctx();
      if (kind === "kick") {
        const o = a.createOscillator(), g = a.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(130, at); o.frequency.exponentialRampToValueAtTime(45, at + 0.12);
        g.gain.setValueAtTime(0.16, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
        o.connect(g).connect(bus); o.start(at); o.stop(at + 0.2);
        return;
      }
      const s = a.createBufferSource(); s.buffer = sfx.nbuf;
      const f = a.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
      const g = a.createGain(); g.gain.setValueAtTime(0.018, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
      s.connect(f).connect(g).connect(bus); s.start(at, Math.random() * 0.5); s.stop(at + 0.05);
    }
    function newBus(at) {
      const a = sfx.ctx();
      const g = a.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(1, at + 1.2);
      g.connect(out);
      return g;
    }
    function play(m, bus, s, at, e) {
      const bars = m.chords.length, bar = Math.floor(s / 8) % bars, k = s % 8;
      const ch = CH[m.chords[bar]];
      if (m.drone && k === 0) {
        voice(bus, ch[0] - 12, at, e * 9, "sine", 0.09);
        voice(bus, ch[0] - 5, at, e * 9, "sine", 0.04);
      }
      if (m.drone && (k === 0 || k === 1)) hit(bus, at + (k ? e * 0.4 : 0), "kick");
      if (m.glint && k === 5 && Math.random() < 0.5) voice(bus, ch[1 + Math.floor(Math.random() * 4)] + 12, at, e * 3, "sine", 0.025);
      if (m.pad && k === 0) ch.slice(1, 4).forEach((n) => voice(bus, n, at, e * 8, "sine", 0.022));
      if (m.bass && m.bass.includes(k)) voice(bus, ch[0], at, e * 1.6, "triangle", 0.11, 900);
      if (m.arp && m.arp[k] != null) voice(bus, ch[1 + (m.arp[k] % 4)] + (m.arp[k] >= 4 ? 12 : 0), at, e * 0.9, m.arpType, m.arpVol, 2200);
      if (m.hat && k % 2 === 1) hit(bus, at, "hat");
      if (m.kick && m.kick.includes(k)) hit(bus, at, "kick");
      const cycle = Math.floor(s / (bars * 8));
      if (m.mel && cycle >= (m.melFrom || 0)) {
        const i = s % m.mel.length, n = m.mel[i];
        if (n != null) {
          let len = 1; while (len < (m.melLen || 3) && m.mel[(i + len) % m.mel.length] == null) len++;
          voice(bus, n, at, e * len * 0.92, m.melType || "square", m.melVol || 0.03, 2600);
        }
      }
    }
    function tick() {
      const a = sfx.ctx(); if (!a || !cur) return;
      if (t < a.currentTime - 0.2) t = a.currentTime + 0.05; // 标签页切到后台回来，不补放积压的音符
      while (t < a.currentTime + 0.15) {
        const m = MOODS[cur.name], e = 60 / m.bpm / 2;
        if (want && want.name !== cur.name && (slot % 8 === 0 || want.now)) {
          cur.bus.gain.cancelScheduledValues(t); cur.bus.gain.setValueAtTime(cur.bus.gain.value, t); cur.bus.gain.linearRampToValueAtTime(0, t + 1.4);
          const old = cur.bus; setTimeout(() => old.disconnect(), 2500);
          cur = { name: want.name, bus: newBus(t) }; want = null; slot = 0;
          continue;
        }
        play(m, cur.bus, slot, t, e);
        slot++; t += e;
      }
    }
    function wake() {
      const a = sfx.ctx(); if (!a || !want) return;
      if (!out) { out = a.createGain(); out.gain.value = muted ? 0 : 0.5; out.connect(sfx.master); }
      if (!cur) { cur = { name: want.name, bus: newBus(a.currentTime) }; want = null; slot = 0; t = a.currentTime + 0.05; }
      if (!timer) timer = setInterval(tick, 25);
    }
    return {
      set(name, now) { if ((cur && cur.name === name && !want) || (want && want.name === name)) return; want = { name, now }; if (cur && cur.name === name) want = null; wake(); },
      wake,
      mute(v) { muted = v; if (out) out.gain.setTargetAtTime(v ? 0 : 0.5, sfx.ctx().currentTime, 0.1); },
    };
  })();
  function unlockAll() { sfx.unlock(); music.wake(); }

  /* ================= 像素小图 ================= */
  function pix(rows, pal, k, cls = "") {
    const h = rows.length, w = rows[0].length;
    let out = "";
    rows.forEach((row, y) => {
      let x = 0;
      while (x < w) {
        const c = row[x];
        if (!pal[c]) { x++; continue; }
        let x2 = x; while (x2 < w && row[x2] === c) x2++;
        out += `<rect x="${x}" y="${y}" width="${x2 - x}" height="1" fill="${pal[c]}"/>`;
        x = x2;
      }
    });
    return `<svg class="px ${cls}" width="${w * k}" height="${h * k}" viewBox="0 0 ${w} ${h}">${out}</svg>`;
  }
  const ICON = {
    trophy: ["yyyyyyyyyy", "y.yyyyyy.y", "y.yyyyyy.y", ".yyyyyyyy.", "..yyyyyy..", "...yyyy...", "....yy....", "....yy....", "..bbbbbb..", "..bbbbbb.."],
    wifi: [".llllllll.", "l........l", "..llllll..", ".l......l.", "...llll...", "..........", "....ll....", "....ll...."],
    cup: ["..........", "llllllll..", "lccccccll.", "lcccccclxl", "lcccccclxl", "lccccccll.", ".lccccl...", "..llll...."],
    mon: ["llllllllll", "lnnnnnnnnl", "lnaannnnnl", "lnnnnnnnnl", "lnnnnnnnnl", "llllllllll", "....ll....", "..llllll.."],
    heart: [".rr.rr.", "rrrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."],
    medal: ["bb....bb", ".bb..bb.", "..bbbb..", "..yyyy..", ".yyyyyy.", "yyywwyyy", "yywyywyy", "yyywwyyy", ".yyyyyy.", "..yyyy.."],
  };
  const PAL = { y: C.amber, b: C.line, l: C.line, c: "#8D6E63", x: C.line, n: C.deep, r: C.bad, w: C.hl, a: C.aqua };

  /* ================= 小螃蟹 ================= */
  const CL_ROWS = ["..bbbbbbbbbbbb..", "..bbebbbbbbebb..", "..bbebbbbbbebb..", "aabbbbbbbbbbbbrr", "aabbbbbbbbbbbbrr", "..bbbbbbbbbbbb..", "..bbbbbbbbbbbb..", "..l.m......l.m..", "..l.m......l.m.."];
  function runsOf(chars) {
    let out = "";
    CL_ROWS.forEach((row, y) => {
      let x = 0;
      while (x < 16) {
        if (!chars.includes(row[x])) { x++; continue; }
        let x2 = x; while (x2 < 16 && chars.includes(row[x2])) x2++;
        out += `<rect x="${x}" y="${y}" width="${x2 - x}" height="1"/>`;
        x = x2;
      }
    });
    return out;
  }
  const CL = { body: runsOf("be"), armL: runsOf("a"), armR: runsOf("r"), legA: runsOf("l"), legB: runsOf("m") };
  const COSTUME = {
    headset: { over: `<g fill="${C.ink}"><rect x="3" y="-1" width="10" height="1"/><rect x="2" y="-1" width="1" height="2"/><rect x="13" y="-1" width="1" height="2"/><rect x="1" y="1" width="2" height="2"/><rect x="13" y="1" width="2" height="2"/><rect x="14" y="3" width="1" height="1"/></g>` },
    hardhat: { over: `<g fill="${C.amber}"><rect x="4" y="-2" width="8" height="1"/><rect x="3" y="-1" width="10" height="1"/><rect x="1" y="0" width="14" height="1"/></g>` },
    lab: { under: `<rect x="2" y="4" width="12" height="3" fill="${C.hana}"/><rect x="7" y="4" width="2" height="3" fill="#FFFFFF"/><rect x="3" y="1" width="10" height="2" fill="${C.aqua}" opacity=".45"/>` },
    beret: { over: `<g fill="${C.bad}"><rect x="4" y="-2" width="7" height="1"/><rect x="3" y="-1" width="10" height="1"/><rect x="6" y="-3" width="1" height="1"/></g>`, armR: `<rect x="15" y="0" width="1" height="3" fill="${C.ink}"/><rect x="15" y="-1" width="1" height="1" fill="${C.aqua}"/>` },
    antenna: { over: `<rect x="7" y="-3" width="1" height="3" fill="${C.ink}"/><rect class="ant" x="6" y="-4" width="3" height="1" fill="${C.amber}"/>` },
    eraser: { armR: `<rect x="15" y="1" width="2" height="3" fill="#F4A6B4"/><rect x="15" y="1" width="2" height="1" fill="#FFFFFF"/>` },
  };
  function clawd(k = 3, costume, cls = "") {
    const c = COSTUME[costume] || {};
    return `<svg class="clawd ${cls}" width="${18 * k}" height="${13 * k}" viewBox="-1 -4 18 13">` +
      `<g class="bodyg"><g class="legA" fill="${C.clay}">${CL.legA}</g><g class="legB" fill="${C.clay}">${CL.legB}</g>` +
      `<g fill="${C.clay}">${CL.body}</g>${c.under || ""}` +
      `<g fill="${C.deep}"><rect class="eye" x="4" y="1" width="1" height="2"/><rect class="eye" x="11" y="1" width="1" height="2"/></g>` +
      `<g class="armL" fill="${C.clay}">${CL.armL}</g><g class="armR" fill="${C.clay}">${CL.armR}${c.armR || ""}</g>${c.over || ""}</g></svg>`;
  }

  /* ================= 布局与相机 ================= */
  // 竖窗口：竖卡片，地图 3 列 5 行；横窗口：卡片加宽（左边动画、右边文字介绍），地图转成 5 列 3 行
  const BH = 420, CH = 500, PAD = 40;
  let BW = 340, CW = 420, COLS = 3, ROWS = 5, WW = 0, WH = 0, wideB = false;
  const isWide = () => innerWidth >= 1100 && innerWidth >= innerHeight * 1.15 && innerHeight >= 560;
  function setGrid() {
    wideB = isWide();
    BW = wideB ? 680 : 340; CW = wideB ? 760 : 420; COLS = wideB ? 5 : 3; ROWS = wideB ? 3 : 5;
    WW = PAD * 2 + CW * COLS; WH = PAD * 2 + CH * ROWS;
    document.body.classList.toggle("wideb", wideB);
  }
  let vw = 0, vh = 0, dpr = 1, V = { x: 0, y: 0, w: 0, h: 0 }, side = false, dw = 0;
  const cam = { x: 0, y: 0, s: 1, anim: null, tx: 0, ty: 0 };
  function px(v) { return parseFloat(getComputedStyle(v).height) || 0; }
  function layout() {
    vw = innerWidth; vh = innerHeight; dpr = Math.min(3, devicePixelRatio || 1);
    // 横屏：手机横着拿，或者宽屏电脑。对话框和按钮放右边一栏，顶栏也收进那一栏，地图用满整个高度
    side = (vw > vh * 1.2 && vh < 560) || (vw >= 1100 && vw > vh * (wideB ? 1.15 : 1.3));
    const wide = vw >= 1100 && vw > vh * (wideB ? 1.15 : 1.3);
    const fs = wide ? 24 : side || dpr >= 2 ? 18 : 24;
    $("dlg").classList.toggle("wide", wide);
    document.documentElement.style.setProperty("--dfs", fs + "px");
    const sb = px($("probeB")), st = px($("probeT"));
    const d = $("dlg"), cta = $("cta"), sh = $("sheet"), tb = $("topbar"), dt = $("detail");
    tb.classList.toggle("side", side);
    d.classList.toggle("side", side); cta.classList.toggle("side", side); dt.classList.toggle("side", side); sh.classList.toggle("side", side);
    if (side) {
      dw = Math.min(vw >= 1100 ? 440 : 380, Math.round(vw * (wideB ? 0.3 : vw >= 1100 ? 0.34 : 0.42)));
      d.style.width = dw + "px"; cta.style.width = dw + "px"; dt.style.width = dw + "px";
      tb.style.width = dw + 16 + "px";
      V = { x: 0, y: 8 + st, w: vw - dw - 32, h: vh - 16 - st - sb };
    } else {
      d.style.width = ""; cta.style.width = ""; dt.style.width = ""; tb.style.width = "";
      let bottom;
      const pn = !dt.hidden ? dt : cta;
      if (phase === "end" && !pn.hidden) bottom = vh - pn.getBoundingClientRect().top + 10;
      else bottom = 30 + 30 + 3 * fs * 1.6 + 6 + 32 + sb;
      V = { x: 0, y: 52 + st, w: vw, h: Math.max(160, vh - 52 - st - bottom) };
    }
    const c = $("fx");
    c.width = Math.round(vw * dpr); c.height = Math.round(vh * dpr);
    c.style.width = vw + "px"; c.style.height = vh + "px";
    fxc.setTransform(dpr, 0, 0, dpr, 0, 0);
    bgSize();
  }
  function fitRect(x, y, w, h, pad = 16, max = 2) {
    let s = Math.min((V.w - pad * 2) / w, (V.h - pad * 2) / h, max);
    if (s >= 1) s = Math.floor(s * dpr * 2) / (dpr * 2); // 停住时尽量让像素字落在整像素上
    return { x: x + w / 2, y: y + h / 2, s };
  }
  function boardPos(st) { const [c, r] = wideB ? [st.cell[1], st.cell[0]] : st.cell; return { x: PAD + c * CW, y: PAD + r * CH }; }
  function fitBoard(st) { const p = boardPos(st); return side ? fitRect(p.x - 4, p.y - 42, BW + 12, BH + 50, 8) : fitRect(p.x - 4, p.y - 46, BW + 14, BH + 56); }
  function fitAll() { return fitRect(PAD - 20, PAD - 50, CW * COLS - (CW - BW) + 40, CH * ROWS - (CH - BH) + 70, 8); }
  function applyCam() {
    let tx = V.x + V.w / 2 - cam.x * cam.s, ty = V.y + V.h / 2 - cam.y * cam.s;
    if (!cam.anim && !drag.on) { tx = Math.round(tx * dpr) / dpr; ty = Math.round(ty * dpr) / dpr; }
    cam.tx = tx; cam.ty = ty;
    const t = `translate(${tx}px, ${ty}px) scale(${cam.s})`;
    if (t !== cam.last) { world.style.transform = t; cam.last = t; }
  }
  const toScreen = (x, y) => ({ x: cam.tx + x * cam.s, y: cam.ty + y * cam.s });
  const toWorld = (x, y) => ({ x: (x - cam.tx) / cam.s, y: (y - cam.ty) / cam.s });
  const camNear = (a, b) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2 && Math.abs(a.s - b.s) < 0.01;
  // 飞过去：中途稍微拉远一点，能看到上一站退开、下一站靠近
  function fly(to, dur) {
    if (FAST || reduce) { Object.assign(cam, { x: to.x, y: to.y, s: to.s, anim: null }); applyCam(); return Promise.resolve(); }
    const g = gen;
    return new Promise((res, rej) => {
      const from = { x: cam.x, y: cam.y, s: cam.s };
      const dist = Math.hypot(to.x - from.x, to.y - from.y) * Math.min(from.s, to.s);
      const dip = clamp(dist / (Math.max(V.w, V.h) * 2.2), 0, 0.42);
      dur = dur || clamp(700 + dist * 0.5, 800, 1600);
      cam.anim = { from, to, t0: performance.now(), dur, dip, done: () => (g === gen ? res() : rej(ABORT)) };
    });
  }
  function stepCam(now) {
    const a = cam.anim; if (!a) return;
    const t = clamp((now - a.t0) / a.dur), u = ease(t);
    cam.x = lerp(a.from.x, a.to.x, u); cam.y = lerp(a.from.y, a.to.y, u);
    cam.s = Math.exp(lerp(Math.log(a.from.s), Math.log(a.to.s), u)) * (1 - a.dip * Math.sin(Math.PI * t));
    if (t >= 1) { cam.anim = null; Object.assign(cam, { x: a.to.x, y: a.to.y, s: a.to.s }); a.done(); }
  }
  let shakeT = 0, shakeA = 0;
  function shake(a) { if (!reduce) { shakeA = a; shakeT = performance.now(); } }

  /* ---------- 结尾：拖动、缩放整张地图 ---------- */
  const drag = { on: false, pts: new Map(), moved: false };
  function clampCam() {
    cam.x = clamp(cam.x, 0, WW); cam.y = clamp(cam.y, 0, WH);
    cam.s = clamp(cam.s, fitAll().s * 0.75, 1.8);
  }
  function zoomAt(sx, sy, ns) {
    const p = toWorld(sx, sy);
    cam.s = clamp(ns, fitAll().s * 0.75, 1.8);
    cam.x = p.x - (sx - V.x - V.w / 2) / cam.s;
    cam.y = p.y - (sy - V.y - V.h / 2) / cam.s;
    clampCam();
  }

  /* ================= 粒子（屏幕坐标） ================= */
  const fxc = $("fx").getContext("2d");
  const P = [];
  function burst(x, y, n, o = {}) {
    if (reduce || FAST) return;
    const cols = o.colors || [C.line, C.aqua, "#FFFFFF"];
    for (let i = 0; i < n; i++) {
      const ang = (o.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
      const sp = (o.speed || 3) * (0.4 + Math.random() * 0.8);
      P.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: o.g ?? 0.18, life: (o.life || 0.9) * (0.6 + Math.random() * 0.6), t: 0, s: o.size || (2 + Math.floor(Math.random() * 3)) * (o.k || 1), c: cols[i % cols.length], kind: o.kind || "sq" });
    }
  }
  function burstW(x, y, n, o) { const p = toScreen(x, y); burst(p.x, p.y, n, o); }
  function stepFX(dt) {
    fxc.clearRect(0, 0, vw, vh);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.t += dt; p.vy += p.g * dt * 60; p.x += p.vx * dt * 60; p.y += p.vy * dt * 60;
      if (p.kind === "conf") p.vx *= 0.98;
      if (p.t >= p.life) { P.splice(i, 1); continue; }
      fxc.globalAlpha = 1 - Math.pow(p.t / p.life, 3);
      fxc.fillStyle = p.c;
      const s = p.kind === "conf" ? (Math.floor(p.t * 10) % 2 ? p.s : p.s / 2) : p.s;
      fxc.fillRect(Math.round(p.x), Math.round(p.y), s, p.kind === "conf" ? p.s : s);
    }
    fxc.globalAlpha = 1;
  }

  /* ================= 背景：会动的海（光柱、气泡、小鱼、浮游光点，跟着镜头有一点视差） ================= */
  let bgc = null, bgx = null;
  const FISH = [".....xx.", "x..xxxxx", "xxxxxx.x", "x..xxxxx", ".....xx."];
  const BG = { bubbles: [], fish: [], motes: [], night: 0, ptx: null, pty: null, w: 0, h: 0 };
  function bgSize() {
    if (!bgc) { bgc = $("bg"); bgx = bgc.getContext("2d"); }
    bgc.width = Math.round(vw * dpr); bgc.height = Math.round(vh * dpr);
    bgc.style.width = vw + "px"; bgc.style.height = vh + "px";
    bgx.setTransform(dpr, 0, 0, dpr, 0, 0);
    BG.w = vw; BG.h = vh;
    const area = vw * vh / 10000;
    const nb = Math.round(clamp(area * 0.55, 14, 60)), nm = Math.round(clamp(area * 0.7, 18, 80)), nf = vw > 900 ? 6 : 4;
    const rnd = (a, b) => a + Math.random() * (b - a);
    while (BG.bubbles.length < nb) BG.bubbles.push({ x: rnd(0, vw), y: rnd(0, vh), z: rnd(0.15, 1), ph: rnd(0, 6.3) });
    BG.bubbles.length = nb;
    while (BG.motes.length < nm) BG.motes.push({ x: rnd(0, vw), y: rnd(0, vh), z: rnd(0.05, 0.4), ph: rnd(0, 6.3), sp: rnd(0.6, 1.6) });
    BG.motes.length = nm;
    while (BG.fish.length < nf) { const d = Math.random() < 0.5 ? 1 : -1; BG.fish.push({ x: rnd(0, vw), y: rnd(vh * 0.18, vh * 0.85), d, z: rnd(0.3, 0.9), ph: rnd(0, 6.3), v: rnd(14, 30) }); }
    BG.fish.length = nf;
  }
  function stepBG(dt, now) {
    if (!BG.w || !bgx) return;
    const W = BG.w, H = BG.h, t = now / 1000;
    BG.night += ((document.body.classList.contains("night") ? 1 : 0) - BG.night) * Math.min(1, dt * 1.5);
    const n = BG.night;
    // 镜头挪了多少：远的东西挪得少，近的挪得多
    let dx = 0, dy = 0;
    if (BG.ptx !== null && Math.abs(cam.tx - BG.ptx) < W && Math.abs(cam.ty - BG.pty) < H) { dx = cam.tx - BG.ptx; dy = cam.ty - BG.pty; }
    BG.ptx = cam.tx; BG.pty = cam.ty;
    const still = reduce ? 0 : 1;
    const wrap = (p, m) => { if (p.x < -m) p.x += W + 2 * m; if (p.x > W + m) p.x -= W + 2 * m; if (p.y < -m) p.y += H + 2 * m; if (p.y > H + m) p.y -= H + 2 * m; };
    bgx.clearRect(0, 0, W, H);
    // 光柱：从水面斜着照下来，慢慢摆
    bgx.globalCompositeOperation = "source-over";
    for (let i = 0; i < 4; i++) {
      const sw = Math.sin(t * 0.13 * still + i * 1.7) * 0.5 + 0.5;
      const x0 = W * (0.12 + i * 0.27) + Math.sin(t * 0.09 * still + i) * 40 + (cam.tx * 0.02) % 60;
      const wTop = 30 + i * 8, wBot = 140 + sw * 90, lean = H * 0.35;
      const g = bgx.createLinearGradient(0, 0, 0, H * 0.9);
      const a = (0.14 + sw * 0.12) * (1 - n * 0.75);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, "rgba(255,255,255,0)");
      bgx.fillStyle = g;
      bgx.beginPath();
      bgx.moveTo(x0, -10); bgx.lineTo(x0 + wTop, -10); bgx.lineTo(x0 + wTop + lean + wBot, H * 0.9); bgx.lineTo(x0 + lean, H * 0.9);
      bgx.closePath(); bgx.fill();
    }
    // 浮游光点：一闪一闪，夜里变成会发光的
    for (const m of BG.motes) {
      m.x += (dx * m.z + Math.sin(t * 0.5 + m.ph) * 4 * dt) * 1; m.y += dy * m.z - 3 * dt * m.sp * still;
      wrap(m, 4);
      const tw = Math.sin(t * m.sp * 2 * still + m.ph) * 0.5 + 0.5;
      bgx.fillStyle = n > 0.5 ? `rgba(160,230,255,${(0.25 + tw * 0.55) * n})` : `rgba(255,255,255,${0.35 + tw * 0.4})`;
      const s = m.z > 0.25 ? 2 : 1;
      bgx.fillRect(Math.round(m.x), Math.round(m.y), s, s);
    }
    // 小鱼：像素剪影，近的大、深色一点
    for (const f of BG.fish) {
      f.x += (f.d * f.v * f.z * dt) * still + dx * f.z * 0.6; f.y += dy * f.z * 0.6 + Math.sin(t * 1.3 + f.ph) * 6 * dt * still;
      if (f.x < -60) { f.x = W + 40; f.d = -1; } else if (f.x > W + 60) { f.x = -40; f.d = 1; }
      if (f.y < -30) f.y += H + 60; else if (f.y > H + 30) f.y -= H + 60;
      const k = f.z > 0.6 ? 3 : 2, al = 0.2 + f.z * 0.22;
      bgx.fillStyle = n > 0.5 ? `rgba(120,200,230,${al * 0.9})` : `rgba(44,110,135,${al})`;
      const tail = Math.floor(t * 4 + f.ph) % 2;
      const fx0 = Math.round(f.x), fy0 = Math.round(f.y);
      FISH.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] !== "x") continue;
        if (rx === 0 && tail && (ry === 0 || ry === 4)) continue;
        const cx = f.d > 0 ? rx : row.length - 1 - rx;
        bgx.fillRect(fx0 + cx * k, fy0 + ry * k, k, k);
      } });
    }
    // 气泡：从下往上冒，左右轻轻晃，到水面就从底下重来
    for (const b of BG.bubbles) {
      b.y -= (14 + b.z * 30) * dt * still; b.y += dy * b.z * 0.8; b.x += dx * b.z * 0.8;
      wrap(b, 10);
      const s = b.z > 0.7 ? 4 : b.z > 0.4 ? 3 : 2;
      const x = Math.round(b.x + Math.sin(t * 1.4 + b.ph) * 4 * b.z), y = Math.round(b.y);
      bgx.fillStyle = n > 0.5 ? `rgba(170,230,250,${0.25 + b.z * 0.3})` : `rgba(255,255,255,${0.35 + b.z * 0.35})`;
      bgx.fillRect(x, y, s, s);
      if (s > 2) { bgx.fillStyle = n > 0.5 ? "rgba(44,110,135,.4)" : `rgba(44,110,135,${0.18 + b.z * 0.2})`; bgx.fillRect(x + s, y + 1, 1, s - 1); bgx.fillRect(x + 1, y + s, s - 1, 1); }
    }
  }

  /* ================= 时间、中断、快进 ================= */
  const ABORT = { abort: true };
  let gen = 0, FAST = false;
  const wait = (ms) => {
    if (FAST) return Promise.resolve();
    const g = gen;
    return new Promise((res, rej) => setTimeout(() => (g === gen ? res() : rej(ABORT)), reduce ? ms * 0.4 : ms));
  };
  const soft = (p) => Promise.resolve(p).catch((e) => { if (e !== ABORT) console.error(e); });
  const later = (fn, ms) => { if (FAST) fn(); else { const g = gen; setTimeout(() => { if (g === gen) fn(); }, ms); } };

  /* ================= 动效小工具：一律“先压下去，再抬起来” ================= */
  function anim(el, kf, o) { if (FAST || reduce) return null; return el.animate(kf, Object.assign({ fill: "backwards" }, o)); }
  function lift(el, d = 0, dist = 5) {
    if (!el) return; el.style.opacity = 1;
    anim(el, [{ offset: 0, opacity: 0, transform: `translate(${dist}px, ${dist}px)`, boxShadow: "0 0 0 rgba(44,110,135,0)" }], { duration: 380, delay: d, easing: OUT });
    if (!FAST) later(() => sfx.lift(), d);
  }
  function pop(el, d = 0, quiet) {
    if (!el) return; el.style.opacity = 1;
    anim(el, [{ offset: 0, opacity: 0, transform: "translateY(8px) scale(.9)" }], { duration: 360, delay: d, easing: BACK });
    if (!FAST && !quiet) later(() => sfx.pop(), d);
  }
  function stamp(el, d = 0) {
    if (!el) return; el.style.opacity = 1;
    anim(el, [{ offset: 0, opacity: 0, transform: "scale(1.16)", filter: "blur(2px)" }, { offset: 0.55, opacity: 1, transform: "scale(.985)", filter: "none" }], { duration: 440, delay: d, easing: OUT });
    if (!FAST) later(() => sfx.lift(), d + 120);
  }
  function fade(el, to = 1, d = 0, dur = 300) {
    if (!el) return;
    const from = getComputedStyle(el).opacity;
    el.style.opacity = to;
    anim(el, [{ opacity: from }, { opacity: to }], { duration: dur, delay: d, easing: OUT });
  }
  function wipe(el, d = 0, dur = 420, origin = "left") {
    if (!el) return; el.style.opacity = 1;
    el.style.transformOrigin = origin === "left" ? "0 50%" : origin === "bottom" ? "50% 100%" : "50% 0";
    anim(el, [{ offset: 0, transform: origin === "left" ? "scaleX(0)" : "scaleY(0)" }], { duration: dur, delay: d, easing: OUT });
  }
  function drawLine(el, d = 0, dur = 600) {
    if (!el) return; el.style.opacity = 1;
    el.setAttribute("pathLength", "1");
    el.style.strokeDasharray = "1 1";
    if (FAST || reduce) { el.style.strokeDashoffset = 0; return; }
    el.style.strokeDashoffset = 1;
    el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: dur, delay: d, easing: OUT, fill: "forwards" });
  }
  function typeText(el, text, cps = 40, d = 0) {
    if (!el) return Promise.resolve();
    el.style.opacity = 1;
    if (FAST || reduce) { el.textContent = text; return Promise.resolve(); }
    el.textContent = "";
    return new Promise((res) => {
      let i = 0;
      setTimeout(function tick() {
        el.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(tick, 1000 / cps); else res();
      }, d);
    });
  }
  function count(el, to, dur = 900, d = 0) {
    el.style.opacity = 1;
    if (FAST || reduce) { el.textContent = to; return; }
    const t0 = performance.now() + d;
    (function f(now) {
      const t = clamp((now - t0) / dur);
      el.textContent = Math.round(ease(t) * to);
      if (t < 1) requestAnimationFrame(f);
    })(t0);
  }

  /* ================= 对话框 ================= */
  const dlg = $("dlg"), dText = $("dText"), who = $("who");
  const PUNCT = "，。、：；！？…—";
  let line = null, tapWaiter = null;
  function setWho(w) {
    dlg.classList.toggle("wall", w === "wall");
    who.innerHTML = w === "wall" ? "<span>？？？</span>" : clawd(1.34, null, "") + "<span>CLAUDE</span>";
    who.style.display = "flex"; who.style.alignItems = "center"; who.style.gap = "6px";
    const s = who.querySelector(".clawd"); if (s) s.style.position = "static";
  }
  function showDlg() {
    if (!dlg.hidden) return;
    dlg.hidden = false;
    anim(dlg, [{ offset: 0, opacity: 0, transform: "translate(6px, 6px)", boxShadow: "0 0 0 rgba(44,110,135,0)" }], { duration: 320, easing: OUT });
  }
  function hideDlg() { dlg.hidden = true; }
  function killLine() {
    if (line && line.rej) line.rej(ABORT);
    line = null; tapWaiter = null;
    guideTalk(false);
  }
  // 打一句话：打完就 resolve；要不要等点击由调用的人决定。instant：直接整句显示（倒带回来时）
  function say(text, o = {}) {
    if (FAST) return Promise.resolve();
    killLine();
    const w = o.who || "claude";
    if (dlg.dataset.who !== w) { setWho(w); dlg.dataset.who = w; }
    showDlg();
    dlg.classList.remove("ready");
    dText.classList.remove("dim");
    srLine.textContent = text;
    syncBack();
    if (o.instant || reduce) {
      dText.textContent = text;
      anim(dText, [{ opacity: 0.2 }, { opacity: 1 }], { duration: 260, easing: OUT });
      if (o.ready !== false) dlg.classList.add("ready");
      return Promise.resolve();
    }
    guideTalk(w === "claude");
    return new Promise((res, rej) => {
      line = { text, i: 0, who: w, done: false, acc: 0, pause: 0, rej };
      line.finish = () => {
        if (!line || line.done) return;
        line.done = true; dText.textContent = text; guideTalk(false);
        if (o.ready !== false) dlg.classList.add("ready");
        line = null; res();
      };
      dText.textContent = "";
    });
  }
  function awaitTap() { const g = gen; return new Promise((res, rej) => { tapWaiter = () => (g === gen ? res() : rej(ABORT)); }); }
  function stepLine(dt) {
    if (!line || line.done) return;
    if (line.pause > 0) { line.pause -= dt; return; }
    line.acc += dt * 30;
    while (line.acc >= 1 && line.i < line.text.length) {
      line.acc -= 1;
      const ch = line.text[line.i++];
      dText.textContent = line.text.slice(0, line.i);
      if (ch.trim() && line.i % 2 === 1 && !PUNCT.includes(ch)) sfx.blip(line.who);
      if (PUNCT.includes(ch)) { line.pause = ch === "，" || ch === "、" ? 0.12 : 0.22; break; }
    }
    if (line.i >= line.text.length) line.finish();
  }
  function syncBack() {
    const can = (phase === "tour" || phase === "end") && K >= 1;
    $("back").disabled = !can;
    dlg.classList.toggle("hinting", phase === "tour" && K >= 1 && K <= 4);
  }

  /* ================= 引导的小螃蟹（住在地图上） ================= */
  let guide = null;
  const G = { x: 0, y: 0, hop: null, flip: false, el: null };
  function guideTalk(on) { if (guide) guide.classList.toggle("talk", on); }
  function guidePose(p) { if (!guide) return; ["wave", "up", "point"].forEach((c) => guide.classList.toggle(c, c === p)); }
  function perch(st) { const p = boardPos(st); return { x: p.x + BW - 78, y: p.y - 39 }; }
  function hopTo(to, dur, hops) {
    const dist = Math.hypot(to.x - G.x, to.y - G.y);
    if (FAST || reduce || dist < 1) { G.x = to.x; G.y = to.y; G.hop = null; placeGuide(); return Promise.resolve(); }
    const g = gen;
    hops = hops || Math.max(1, Math.round(dist / 140));
    if (Math.abs(to.x - G.x) > 4) G.flip = to.x < G.x;
    guide.classList.add("walk");
    return new Promise((res, rej) => {
      G.hop = { fx: G.x, fy: G.y, to, t0: performance.now(), dur: dur || clamp(dist * 1.6, 420, 1500), hops, h: clamp(dist / hops * 0.35, 14, 60), last: 0, done: () => (g === gen ? res() : rej(ABORT)) };
    });
  }
  function stepGuide(now) {
    const h = G.hop; if (!h) return;
    const t = clamp((now - h.t0) / h.dur), u = ease(t);
    const k = Math.floor(t * h.hops);
    if (k > h.last && t < 1) { h.last = k; sfx.hop(); }
    G.x = lerp(h.fx, h.to.x, u);
    G.y = lerp(h.fy, h.to.y, u) - Math.abs(Math.sin(Math.PI * t * h.hops)) * h.h;
    if (t >= 1) { G.hop = null; G.x = h.to.x; G.y = h.to.y; guide.classList.remove("walk"); h.done(); }
    placeGuide();
  }
  function placeGuide() { const w = G.el; if (!w) return; w.style.left = G.x + "px"; w.style.top = G.y + "px"; guide.classList.toggle("flip", G.flip); }

  /* ================= 路线：走过的路画成实线，最后绕回起点 ================= */
  let routeLen = [], routeDone = null, routeTotal = 0;
  function center(st) { const p = boardPos(st); return { x: p.x + BW / 2, y: p.y + BH / 2 }; }
  function buildRoute() {
    const pts = [...OWNERS, T_TITLE].map(center);
    const d = pts.map((p, i) => (i ? "L" : "M") + p.x + " " + p.y).join(" ");
    routeLen = [0];
    for (let i = 1; i < pts.length; i++) routeLen.push(routeLen[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    routeTotal = routeLen[routeLen.length - 1];
    const svg = `<svg id="route" width="${WW}" height="${WH}"><path class="ghostline" d="${d}"/><path class="done" d="${d}" stroke-dasharray="${routeTotal} ${routeTotal}" stroke-dashoffset="${routeTotal}"/></svg>`;
    world.insertAdjacentHTML("afterbegin", svg);
    routeDone = world.querySelector("#route .done");
  }
  function routeTo(i, dur = 900) {
    const off = routeTotal - routeLen[clamp(i, 0, routeLen.length - 1)];
    const from = parseFloat(routeDone.getAttribute("stroke-dashoffset"));
    routeDone.getAnimations().forEach((a) => a.cancel());
    routeDone.setAttribute("stroke-dashoffset", off);
    if (FAST || reduce || Math.abs(from - off) < 1) return;
    routeDone.animate([{ strokeDashoffset: from }, { strokeDashoffset: off }], { duration: dur, easing: INOUT });
  }

  /* ================= 每一站的卡片 ================= */
  const TOTAL = 13;
  function boardHTML(st, i) {
    const p = boardPos(st);
    return `<div class="board${wideB ? " wb" : ""}" id="b-${st.key}" style="left:${p.x}px;top:${p.y}px;width:${BW}px">` +
      `<svg class="frame" width="${BW}" height="${BH}"><rect x="1.5" y="1.5" width="${BW - 3}" height="${BH - 3}" pathLength="100"/></svg>` +
      `<div class="gno">${st.tag}<small>${st.name}</small></div>` +
      `<div class="bh"><span class="no">${st.tag}</span><span class="nm"></span><span class="rt">${st.rt || ""}</span></div>` +
      `<div class="bd">${st.html}</div>` + (wideB ? `<div class="bx"><span class="bxh">文字介绍</span>${infoHTML(st.key)}</div>` : "") + `</div>`;
  }
  function B(st) {
    const el = $("b-" + st.key);
    const bd = el.querySelector(".bd");
    return { st, el, bd, q: (s) => bd.querySelector(s), qa: (s) => [...bd.querySelectorAll(s)] };
  }
  function ghost(st, d = 0) {
    const el = $("b-" + st.key);
    if (el.classList.contains("ghost") || el.classList.contains("solid")) return;
    el.classList.add("ghost");
    anim(el, [{ offset: 0, opacity: 0, transform: "scale(.94)" }], { duration: 380, delay: d, easing: BACK });
  }
  // 搭一块卡片：描边 → 铺底 → 抬起投影 → 标题栏 → 标题字
  async function build(st) {
    const el = $("b-" + st.key);
    if (el.classList.contains("solid")) return;
    el.classList.add("ghost");
    const nm = el.querySelector(".nm");
    if (FAST || reduce) { el.classList.add("solid"); nm.textContent = st.name; return; }
    sfx.draw();
    el.querySelector(".frame rect").animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: 460, easing: "cubic-bezier(.6,0,.2,1)", fill: "forwards" });
    await wait(420);
    el.classList.add("solid");
    el.animate([{ offset: 0, transform: "translate(6px, 6px)", boxShadow: "0 0 0 rgba(44,110,135,0)", backgroundColor: "rgba(255,255,255,.3)" }], { duration: 360, easing: OUT });
    sfx.lift();
    const bh = el.querySelector(".bh");
    bh.animate([{ offset: 0, transform: "scaleX(0)" }], { duration: 300, delay: 60, easing: OUT, fill: "backwards" });
    typeText(nm, st.name, 30, 200);
    const bx = el.querySelector(".bx");
    if (bx) [...bx.children].forEach((e, i) => anim(e, [{ offset: 0, opacity: 0, transform: "translateY(6px)" }], { duration: 320, delay: 260 + i * 70, easing: OUT }));
    await wait(380);
  }
  function solidNow(st) {
    const el = $("b-" + st.key);
    el.classList.add("ghost", "solid");
    el.querySelector(".nm").textContent = st.name;
  }

  /* ---------- 00 海纳协会（开场和结尾都回到这里） ---------- */
  const T_TITLE = {
    key: "title", cell: [0, 2], tag: "00", name: "海纳协会", rt: "INAA",
    html: `
      <div class="t24 mid sub h" id="tl-sub" style="top:40px">智慧算法网络协会</div>
      <div class="t48 mid ttl h" id="tl-main" style="top:84px">海纳协会</div>
      <div class="t24 mid h" id="tl-en" style="top:146px;letter-spacing:.5em;text-indent:.5em;color:${C.line}">INAA</div>
      <div class="h" id="tl-rule" style="left:107px;top:184px;width:120px;height:3px;background:${C.line}"></div>
      <div class="h" id="tl-aq" style="left:147px;top:184px;width:40px;height:3px;background:${C.aqua}"></div>
      <div class="t24 mid h" id="tl-slogan" style="top:204px">海纳百川 · 有容乃大</div>
      <div class="t12 mid h" id="tl-motto" style="top:240px;color:${C.line}">用智慧驱动网络，以算法引领未来</div>
      <div class="t12 mid sub h" id="tl-school" style="top:264px">湖南涉外经济学院 · 信息与机电工程学院</div>
      <div class="chips c" style="top:300px"><span class="chip h tlc">2026.3 成立</span><span class="chip h tlc">4 个部门</span><span class="chip water h tlc">6教 513</span></div>`,
    beats: [
      ["呼，出来了。谢谢你。", null, { nobuild: true }],
      ["欢迎你呀，新同学！", (b) => lift(b.q("#tl-sub"), 300)],
      ["这里是湖南涉外经济学院智慧算法网络协会，简称 INAA。", (b) => { pop(b.q("#tl-en"), 0, true); wipe(b.q("#tl-rule"), 200, 400); wipe(b.q("#tl-aq"), 420, 300); }],
      ["大家更习惯叫它「海纳协会」。", (b) => {
        stamp(b.q("#tl-main"));
        later(() => burstW(...worldOf(b, 167, 108), 20, { colors: [C.line, C.aqua, C.hana, "#FFFFFF"], speed: 3.2, g: 0.1 }), 120);
      }],
      ["我是 Claude，也是你的向导。", null, { pose: "wave" }],
      ["我带着你，沿着这张地图，一起走一遍！", null, { reveal: true, focus: "all", cam: () => fitAll() }],
    ],
  };

  /* ---------- 01 名字 ---------- */
  const tiles = (str, top, cls) => [...str].map((c, i) => `<div class="card t24 h ${cls}" style="left:${14 + i * 52}px;top:${top}px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:${C.line}">${c}</div>`).join("");
  const S_NAME = {
    key: "name", cell: [0, 0], tag: "01", name: "名字的由来", rt: "HI + NA",
    html: `
      <div class="t12 sub h" id="nm-l1" style="left:14px;top:12px">学校 · 湖南涉外经济学院</div>
      ${tiles("HIEU", 32, "r1")}
      <div class="t12 sub h" id="nm-l2" style="left:14px;top:90px">协会 · 智慧算法网络协会</div>
      ${tiles("INAA", 110, "r2")}
      <div class="t12 h" id="nm-hint" style="left:238px;top:126px;color:${C.sub}">取 HI + NA</div>
      <svg class="h" id="nm-riv" width="334" height="384" style="left:0;top:0;overflow:visible">
        <path d="M36 54 C40 120 120 140 150 214" fill="none" stroke="${C.aqua}" stroke-width="3"/>
        <path d="M88 54 C96 110 140 150 160 214" fill="none" stroke="${C.aqua}" stroke-width="3"/>
        <path d="M140 54 C150 100 168 150 167 214" fill="none" stroke="${C.aqua}" stroke-width="3"/>
        <path d="M192 54 C200 120 190 160 176 214" fill="none" stroke="${C.aqua}" stroke-width="3"/>
        <path d="M36 132 C60 170 120 190 145 214" fill="none" stroke="${C.line}" stroke-width="2"/>
        <path d="M88 132 C110 170 150 190 158 214" fill="none" stroke="${C.line}" stroke-width="2"/>
        <path d="M140 132 C150 170 162 196 166 214" fill="none" stroke="${C.line}" stroke-width="2"/>
        <path d="M192 132 C200 170 186 196 172 214" fill="none" stroke="${C.line}" stroke-width="2"/>
        <path d="M310 30 C290 120 230 170 186 214" fill="none" stroke="${C.ag}" stroke-width="3"/>
        <path d="M290 160 C260 190 220 200 190 214" fill="none" stroke="${C.ag}" stroke-width="2"/>
      </svg>
      <div class="t48 mid ttl h" id="nm-hn" style="top:214px">海纳</div>
      <div class="t12 mid sub h" id="nm-py" style="top:270px;letter-spacing:.3em">HǎI · Nà</div>
      <div class="h" id="nm-sea" style="left:-3px;right:-3px;top:292px;bottom:0">
        <svg width="100%" height="98" viewBox="0 0 340 98" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0"><path d="M0 20 C40 8 80 32 120 20 S200 8 240 20 S320 32 340 18 L340 98 L0 98 Z" fill="${C.lb}"/><path d="M0 40 C50 52 90 28 150 42 S250 58 340 38 L340 98 L0 98 Z" fill="${C.ag}" opacity=".7"/></svg>
        <div class="t24 mid" style="position:absolute;top:52px;color:${C.ink}">海纳百川 · 有容乃大</div>
      </div>`,
    beats: [
      ["先来聊聊「海纳」这两个字吧。"],
      ["湖南涉外经济学院，简称 HIEU；", (b) => { pop(b.q("#nm-l1"), 0, true); b.qa(".r1").forEach((e, i) => lift(e, 120 + i * 110)); }],
      ["智慧算法网络协会，简称 INAA。", (b) => { pop(b.q("#nm-l2"), 0, true); b.qa(".r2").forEach((e, i) => lift(e, 120 + i * 110)); }],
      ["我们各取一半：HI 和 NA，", (b) => {
        const pick = [...b.qa(".r1").slice(0, 2), ...b.qa(".r2").slice(1, 3)];
        b.qa(".r1, .r2").forEach((e) => { if (!pick.includes(e)) fade(e, 0.25, 0, 260); });
        pop(b.q("#nm-hint"), 700, true);
        pick.forEach((e, i) => later(() => { e.style.background = C.hl; anim(e, [{ transform: "translateY(0)" }, { transform: "translateY(-6px)" }, { transform: "translateY(0)" }], { duration: 260, easing: OUT }); if (!FAST) sfx.pop(); }, 200 + i * 140));
      }],
      ["拼在一起，就是 HI·NA——海纳。", async (b) => {
        const pick = [...b.qa(".r1").slice(0, 2), ...b.qa(".r2").slice(1, 3)];
        fade(b.q("#nm-hint"), 0, 0, 200);
        // 四块字母从各自的位置滑到一排，中间留一个空隙
        pick.forEach((e, i) => {
          const c = e.cloneNode(true); c.classList.add("mg"); c.classList.remove("r1", "r2");
          b.bd.appendChild(c);
          const tx = 69 + i * 48 + (i > 1 ? 8 : 0), ty = 164;
          c.style.left = tx + "px"; c.style.top = ty + "px"; c.style.opacity = 1;
          anim(c, [{ offset: 0, transform: `translate(${parseFloat(e.style.left) - tx}px, ${parseFloat(e.style.top) - ty}px)` }], { duration: 640, delay: i * 70, easing: INOUT });
        });
        await wait(780);
        stamp(b.q("#nm-hn")); pop(b.q("#nm-py"), 260, true);
        burstW(...worldOf(b, 167, 236), 18, { colors: [C.aqua, C.line, C.hana], speed: 3.4, g: 0.12 });
      }],
      ["海纳百川，有容乃大。", async (b) => {
        b.qa(".r1, .r2, .mg").forEach((e) => fade(e, 0.12, 0, 400));
        fade(b.q("#nm-l1"), 0.3); fade(b.q("#nm-l2"), 0.3);
        const riv = b.q("#nm-riv"); riv.style.opacity = 1;
        [...riv.querySelectorAll("path")].forEach((p, i) => drawLine(p, i * 90, 900));
        if (!FAST) sfx.draw();
        await wait(900);
        wipe(b.q("#nm-sea"), 0, 520, "bottom");
      }],
      ["我们协会希望：不论专业，不论院系，甚至不论学校，都可以汇入这片海。"],
    ],
  };

  /* ---------- 02 开发者：终端用等距更纱黑体 ---------- */
  /*sarasa*/
  const CODE = ["fn main() {", "  let 海纳 = 协会::new();", "  海纳.学习(\"数据结构\");", "  海纳.做项目();", "  build()?;", "}"];
  const TERM_TITLE = "~/haina $ cargo run", TERM_OK = "✓ 编译通过";
  /*/sarasa*/
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  function hlCode(s) {
    return esc(s).replace(/("[^"]*")|\b(fn|let)\b|(\?)/g, (m, str, kw, q) => str ? `<span style="color:${C.ag}">${str}</span>` : kw ? `<span style="color:${C.aqua}">${kw}</span>` : `<span style="color:${C.hl}">${q}</span>`);
  }
  const heat = () => { let s = ""; for (let r = 0; r < 6; r++) for (let c = 0; c < 20; c++) s += `<i class="hc" data-k="${c + r * 0.6}" style="position:absolute;left:${c * 14}px;top:${r * 14}px;width:11px;height:11px;background:${C.pale}"></i>`; return s; };
  const S_DEV = {
    key: "dev", cell: [0, 1], tag: "02", name: "核心理念", rt: "BUILD",
    html: `
      <div class="dark h" id="dv-term" style="left:12px;top:10px;width:310px;height:150px">
        <div class="mono" style="position:absolute;left:0;right:0;top:0;height:22px;line-height:22px;padding-left:8px;background:${C.line};color:#fff;font-size:12px">${TERM_TITLE}<span class="h" id="dv-ok" style="position:absolute;right:8px;top:0;color:${C.hana}">${TERM_OK}</span></div>
        <div id="dv-code" class="mono" style="position:absolute;left:10px;top:28px;font-size:13px;line-height:19px;color:#CDEFF5;white-space:pre"></div>
        <i id="dv-cur" style="position:absolute;left:10px;top:31px;width:7px;height:13px;background:${C.aqua};animation:blinkc 1s steps(1) infinite"></i>
      </div>
      <div class="h" id="dv-mark" style="left:71px;top:186px;width:192px;height:10px;background:${C.hl}"></div>
      <div class="t24 mid h" id="dv-big" style="top:170px">培养真正的开发者</div>
      <div class="card h" id="dv-win" style="left:12px;top:212px;width:310px;height:166px">
        <div class="t12" style="position:absolute;left:0;right:0;top:0;height:22px;line-height:22px;padding-left:8px;background:${C.line};color:#fff">海纳学习系统</div>
        <div class="chips" style="position:absolute;left:8px;right:8px;top:30px;gap:6px"><span class="chip h dvc">选课</span><span class="chip h dvc">讲义</span><span class="chip h dvc">练手题</span><span class="chip solid h dvc">热力图</span><span class="chip h dvc">签到</span></div>
        <div id="dv-heat" style="position:absolute;left:14px;top:62px;width:280px;height:84px">${heat()}</div>
        <div class="t12 sub h" id="dv-cap" style="position:absolute;right:12px;top:146px">做对一题，亮一格</div>
      </div>`,
    beats: [
      ["「拒绝空谈，行动至上；专注实战，唯实惟先。」这是我们的宗旨。", async (b) => {
        lift(b.q("#dv-term"));
        const host = b.q("#dv-code"), cur = b.q("#dv-cur");
        for (const l of CODE) {
          const row = host.appendChild(document.createElement("div"));
          await typeText(row, l, 46, 0);
          row.innerHTML = hlCode(l) || " ";
          cur.style.top = 31 + host.children.length * 19 + "px";
          await wait(60);
        }
        cur.style.display = "none";
      }],
      ["培养真正的开发者，是我们协会一切努力奔赴的方向。", (b) => { wipe(b.q("#dv-mark"), 0, 380); stamp(b.q("#dv-big"), 120); }],
      ["我们希望同学们不止会解题，更要做出作品。所以一切学习围绕项目展开。", (b) => { pop(b.q("#dv-ok"), 300); }],
      ["你眼前的学习系统，由协会自主开发。", (b) => lift(b.q("#dv-win"))],
      ["它整合了很多高校的优秀学习体系，让每一位同学都能学有所获。", (b) => b.qa(".dvc").forEach((e, i) => pop(e, i * 120, i > 0))],
      ["每完成一项学习任务，热力图都会被点亮一格，还可以与不同的同学 PK。", (b) => {
        const shades = ["#D4EDF1", C.hana, C.ag, "#3F93A8", C.line];
        let seed = 7;
        b.qa(".hc").forEach((e) => {
          seed = (seed * 9301 + 49297) % 233280;
          const k = +e.dataset.k, lv = Math.floor((seed / 233280) * 6);
          if (lv === 0) return;
          const go = () => { e.style.background = shades[lv - 1]; anim(e, [{ transform: "scale(.2)" }, { transform: "scale(1.25)" }, { transform: "none" }], { duration: 260, easing: OUT }); };
          later(go, 700 + k * 60);
        });
        pop(b.q("#dv-cap"), 1800, true);
      }],
      ["在这里，学习靠的是兴趣，而不是任务。"],
    ],
  };

  // 四个部门在地图上占一个 2×2 的方块，总览和收尾时把镜头拉到这一块
  const DEPT_KEYS = ["net", "proj", "algo", "pub"];
  function deptCam() { const p0 = boardPos(S_NET); return fitRect(p0.x - 10, p0.y - 46, CW + BW + 20, CH + BH + 56, 12); }

  /* ---------- 04 网络部 ---------- */
  const NET_NODES = [[204, 30], [278, 30], [241, 92], [204, 154], [278, 154]];
  const NET_LINKS = [[0, 2], [1, 2], [2, 3], [2, 4], [0, 1], [3, 4]];
  const S_NET = {
    key: "net", cell: [1, 0], tag: "03", name: "综合网络部", rt: "NETWORK",
    html: `
      <div class="card h" id="nt-dio" style="left:12px;top:10px;width:310px;height:236px;background:${C.mist}">
        <div style="position:absolute;left:0;right:0;top:204px;height:2px;background:${C.line}"></div>
        <svg class="px" width="310" height="236" style="position:absolute;left:0;top:0">
          ${NET_LINKS.map(([a, c]) => `<path class="lk" d="M${NET_NODES[a][0] + 9} ${NET_NODES[a][1] + 9} L${NET_NODES[c][0] + 9} ${NET_NODES[c][1] + 9}" stroke="${C.line}" stroke-width="2" fill="none" style="opacity:0"/>`).join("")}
          <path d="M14 112 L118 112" stroke="${C.pale2}" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
        </svg>
        ${NET_NODES.map(([x, y], i) => `<div class="nd h" style="position:absolute;left:${x}px;top:${y}px;width:18px;height:18px;background:${i === 2 ? C.line : "#fff"};border:2px solid ${C.line};box-sizing:border-box"></div>`).join("")}
        <div class="t12 h" id="nt-5g" style="position:absolute;left:236px;top:116px;color:${C.line}">5G</div>
        <div class="pk h" style="position:absolute;left:0;top:0;width:6px;height:6px;background:${C.aqua};offset-path:path('M213 39 L250 101 L213 163');animation:pk 1.6s linear infinite"></div>
        <div class="pk h" style="position:absolute;left:0;top:0;width:6px;height:6px;background:${C.amber};offset-path:path('M287 163 L250 101 L287 39');animation:pk 1.9s .4s linear infinite"></div>
        <div style="position:absolute;left:66px;top:150px;width:96px;height:6px;background:${C.line}"></div>
        <div style="position:absolute;left:72px;top:156px;width:4px;height:48px;background:${C.line}"></div>
        <div style="position:absolute;left:152px;top:156px;width:4px;height:48px;background:${C.line}"></div>
        <div class="dark" style="position:absolute;left:94px;top:106px;width:56px;height:40px;box-shadow:none"><i style="position:absolute;left:6px;top:6px;width:6px;height:2px;background:${C.hana};animation:blinkc 1s steps(1) infinite"></i><i style="position:absolute;left:6px;top:14px;width:30px;height:2px;background:${C.aqua}"></i><i style="position:absolute;left:6px;top:20px;width:20px;height:2px;background:${C.aqua}"></i></div>
        <div style="position:absolute;left:116px;top:146px;width:12px;height:4px;background:${C.line}"></div>
        <div id="nt-cl" class="h" style="position:absolute;left:22px;top:165px">${clawd(3, "headset", "type")}</div>
        <div class="h" id="nt-fw" style="position:absolute;left:170px;top:62px;width:18px;height:84px;background:repeating-linear-gradient(0deg,${C.bad} 0 10px,#fff 10px 12px);border:2px solid #8E2B37;box-sizing:border-box"></div>
        <div class="t12 h" id="nt-fwt" style="position:absolute;left:152px;top:150px;color:${C.bad}">防火墙</div>
        <div class="atk h" style="position:absolute;left:300px;top:96px;width:6px;height:6px;background:${C.bad};animation:atk 1.1s ease-in infinite"></div>
        <div class="atk h" style="position:absolute;left:300px;top:118px;width:6px;height:6px;background:${C.bad};animation:atk 1.1s .5s ease-in infinite"></div>
      </div>
      <div class="chips" style="left:12px;right:12px;top:262px"><span class="chip h ntc">学习系统</span><span class="chip h ntc">赛事规划</span><span class="chip y h ntc">蓝桥杯 5G 赛项</span><span class="chip bad h" id="nt-sec">网络安全 · 攻防</span></div>
      <div class="note h" id="nt-note" style="left:12px;top:350px">▌每周「海纳百川」，分享见闻</div>`,
    beats: [
      ["协会有四个技术方向：算法设计、网络规划、人工智能开发、信息安全实践。", null, { nobuild: true, focus: DEPT_KEYS, cam: deptCam }],
      ["协会分为四个部门：综合网络部、项目部、算法部、宣传设计部。", null, { nobuild: true, focus: DEPT_KEYS, cam: deptCam }],
      ["先说综合网络部，它负责总揽协会的各种学习和训练。", (b) => { lift(b.q("#nt-dio")); pop(b.q("#nt-cl"), 300); }],
      ["各项赛事和学习培训的整理和规划，都在这里完成。", (b) => lift(b.qa(".ntc")[1], 100)],
      ["我们这套学习系统的运营和维护、各平台学习资源的分享，也诞生于这里。", (b) => lift(b.qa(".ntc")[0], 100)],
      ["我们还搭建了协会的网络技术交流平台，组织技术分享和技能交流活动。", (b) => {
        b.qa(".nd").forEach((e, i) => pop(e, 100 + i * 90, i > 0));
        b.qa(".lk").forEach((e, i) => drawLine(e, 500 + i * 110, 380));
      }],
      ["每周还有线下的课题讨论活动：「海纳百川」，", (b) => pop(b.q("#nt-note"), 0, true)],
      ["每个人都可以来分享这一周的学习和见闻。", (b) => { later(() => { if (!FAST) sfx.chime(); burstW(...worldOf(b, 167, 120), 12, { colors: [C.aqua, C.hl, "#FFFFFF"], speed: 2.6, g: 0.08 }); }, 100); }],
      ["网络类赛事的集训，比如蓝桥杯「5G 全网规划与建设」，也在这里。", (b) => {
        pop(b.q("#nt-5g"), 0, true);
        b.qa(".pk").forEach((e) => { e.style.opacity = 1; });
        lift(b.qa(".ntc")[2], 200);
      }],
      ["网络安全的基础与攻防练习，同样由我们组织。", (b) => {
        stamp(b.q("#nt-fw")); pop(b.q("#nt-fwt"), 200, true);
        b.qa(".atk").forEach((e) => { e.style.opacity = 1; });
        lift(b.q("#nt-sec"), 300);
      }],
    ],
  };

  /* ---------- 05 项目部 ---------- */
  const S_PROJ = {
    key: "proj", cell: [2, 0], tag: "04", name: "项目部", rt: "PROJECT",
    html: `
      <div class="card h" id="pj-dio" style="left:12px;top:10px;width:204px;height:236px;background:${C.mist}">
        <div style="position:absolute;left:0;right:0;top:204px;height:2px;background:${C.line}"></div>
        <div id="pj-c1" class="h" style="position:absolute;left:4px;top:108px">${clawd(3, "hardhat", "rub")}</div>
        <div id="pj-c2" class="h" style="position:absolute;left:146px;top:108px">${clawd(3, null, "rub flip")}</div>
        <div style="position:absolute;left:20px;top:140px;width:164px;height:8px;background:${C.line}"></div>
        <div style="position:absolute;left:28px;top:148px;width:4px;height:56px;background:${C.line}"></div>
        <div style="position:absolute;left:172px;top:148px;width:4px;height:56px;background:${C.line}"></div>
        <div class="h" id="pj-pcb" style="position:absolute;left:58px;top:108px;width:88px;height:32px;background:${C.ok};border:2px solid #1F6A61;box-sizing:border-box">
          <i style="position:absolute;left:30px;top:6px;width:22px;height:16px;background:${C.deep}"></i>
          ${[0, 1, 2, 3, 4, 5].map((i) => `<i style="position:absolute;left:${6 + i * 4}px;top:4px;width:2px;height:2px;background:${C.hl}"></i>`).join("")}
          <i style="position:absolute;left:6px;top:20px;width:16px;height:2px;background:${C.hana}"></i>
          <i id="pj-led" style="position:absolute;left:66px;top:8px;width:6px;height:6px;background:#0B3D33"></i>
        </div>
        <div class="spk" style="position:absolute;left:96px;top:92px;width:4px;height:4px;background:${C.amber};opacity:0"></div>
        <div class="spk" style="position:absolute;left:70px;top:96px;width:3px;height:3px;background:${C.aqua};opacity:0"></div>
        <div class="spk" style="position:absolute;left:128px;top:94px;width:3px;height:3px;background:${C.amber};opacity:0"></div>
      </div>
      <div class="card h" id="pj-ph" style="left:228px;top:10px;width:94px;height:236px;border-width:3px">
        <div class="h ph" style="position:absolute;left:6px;top:6px;width:76px;height:8px;background:${C.pale}"></div>
        <div class="h ph" style="position:absolute;left:6px;top:20px;width:76px;height:30px;background:${C.line}"></div>
        <div class="h ph" style="position:absolute;left:6px;top:58px;width:76px;height:46px;background:${C.mist};border:2px solid ${C.pale2};box-sizing:border-box"></div>
        <div class="h ph" style="position:absolute;left:6px;top:110px;width:76px;height:46px;background:${C.mist};border:2px solid ${C.pale2};box-sizing:border-box"></div>
        <div class="h ph" style="position:absolute;left:6px;top:166px;width:76px;height:24px;background:${C.aqua};border:2px solid ${C.line};box-sizing:border-box"></div>
        <div class="h ph" style="position:absolute;left:30px;top:206px;width:28px;height:4px;background:${C.line}"></div>
      </div>
      <div class="chips" style="left:12px;right:12px;top:262px"><span class="chip ok h pjc">嵌入式</span><span class="chip ok h pjc">开发板</span><span class="chip h pjc2">网站</span><span class="chip h pjc2">App</span></div>
      <div class="note h" id="pj-note" style="left:12px;top:312px">▌从一块板子，到一个产品</div>`,
    beats: [
      ["项目部，负责科创项目，是想动手做东西的同学的好去处。", (b) => { lift(b.q("#pj-dio")); pop(b.q("#pj-c1"), 280); pop(b.q("#pj-c2"), 420); }],
      ["比赛项目内容的立项、落地、研发、迭代，都在我们这里完成。"],
      ["无论是传统的软件项目设计，还是前沿的机器学习相关，亦或是极具实用价值的嵌入式产品，", (b) => {
        stamp(b.q("#pj-pcb"));
        b.q("#pj-led").style.animation = "led .8s steps(1) infinite";
        b.qa(".spk").forEach((e, i) => { e.style.animation = `spark 1.2s ${i * 0.3}s steps(3) infinite`; });
      }],
      ["在我们这里，都可以把你的小巧思变为现实。", (b) => {
        lift(b.q("#pj-ph"));
        b.qa(".ph").forEach((e, i) => pop(e, 250 + i * 130, i % 2 === 1));
      }],
      ["具体来说，我们常做两类项目："],
      ["硬件方面，有嵌入式和开发板；", (b) => { b.qa(".pjc").forEach((e, i) => lift(e, 100 + i * 150)); }],
      ["软件方面，有网站和 App。", (b) => { b.qa(".pjc2").forEach((e, i) => lift(e, 100 + i * 150)); pop(b.q("#pj-note"), 500, true); }],
    ],
  };

  /* ---------- 03 算法部（四个部门的第一站，先总览）：一层一层搭知识塔，刷题记录里错了再交 ---------- */
  const TOWER = ["基础语法", "排序 · 搜索", "数据结构", "动态规划", "图论"];
  /*sarasa*/
  const ALOG = [["#1", "排序", "AC"], ["#2", "二分查找", "AC"], ["#3", "BFS 搜索", "WA"], ["#4", "BFS 搜索", "AC"], ["#5", "背包 DP", "AC"]];
  const ALOG_TITLE = "提交记录";
  /*/sarasa*/
  const dispW = (s) => [...s].reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 2 : 1), 0);
  const padTo = (s, n) => s + " ".repeat(Math.max(0, n - dispW(s)));
  const S_ALGO = {
    key: "algo", cell: [2, 1], tag: "05", name: "算法部", rt: "ALGORITHM",
    html: `
      <div class="card h" id="ag-tw" style="left:12px;top:10px;width:160px;height:240px;background:${C.mist}">
        <div class="t12 sub" style="position:absolute;left:10px;top:10px">知识塔</div>
        <div style="position:absolute;left:8px;right:8px;top:222px;height:3px;background:${C.line}"></div>
        ${TOWER.map((t, i) => { const w = 140 - i * 14; return `<div class="h blk" style="position:absolute;left:${(160 - 4 - w) / 2}px;top:${190 - i * 34}px;width:${w}px;height:32px;background:${["#fff", C.hana, C.lb, "#fff", C.hl][i]};border:2px solid ${C.line};box-sizing:border-box;font-size:12px;line-height:28px;text-align:center;color:${C.ink};white-space:nowrap">${t}</div>`; }).join("")}
      </div>
      <div class="dark h" id="ag-log" style="left:182px;top:10px;width:140px;height:240px">
        <div class="mono" style="position:absolute;left:0;right:0;top:0;height:22px;line-height:22px;padding-left:8px;background:${C.line};color:#fff;font-size:12px">${ALOG_TITLE}</div>
        <div id="ag-rows" class="mono" style="position:absolute;left:8px;right:6px;top:30px;font-size:12px;line-height:22px;white-space:pre;color:#CDEFF5"></div>
        <div class="t12 h" id="ag-tip" style="position:absolute;left:8px;bottom:10px;color:${C.hana}">改完错题再交</div>
      </div>
      <div class="h" id="ag-cl" style="left:264px;top:320px">${clawd(3, "lab", "point flip")}</div>
      <div class="chips" style="left:12px;right:12px;top:266px"><span class="chip h agc">培训</span><span class="chip h agc">刷题</span><span class="chip y h agc">蓝桥杯</span></div>
      <div class="note h" id="ag-note" style="left:12px;top:316px">▌一层一层，搭起自己的知识塔</div>`,
    beats: [
      ["算法部，负责算法学习与竞赛，是刷题爱好者的大本营。", (b) => { lift(b.q("#ag-tw")); lift(b.q("#ag-log"), 160); pop(b.q("#ag-cl"), 420); }],
      ["我们会从零开始，由一道道题目构建数据结构的高楼。", async (b) => {
        b.qa(".blk").forEach((e, i) => {
          e.style.opacity = 1;
          anim(e, [{ offset: 0, opacity: 0, transform: "translateY(-46px)" }, { offset: 0.7, opacity: 1, transform: "translateY(3px)" }], { duration: 480, delay: 200 + i * 300, easing: "ease-in", fill: "backwards" });
          if (!FAST) later(() => { sfx.step(i); burstW(...worldOf(b, 12 + 80, 10 + 190 - i * 34 + 32), 6, { colors: [C.line, C.hana], speed: 1.6, g: 0.15, size: 3 }); }, 200 + i * 300 + 340);
        });
        b.qa(".agc").slice(0, 2).forEach((e, i) => lift(e, 600 + i * 140));
        const host = b.q("#ag-rows");
        await wait(500);
        for (const [n, t, v] of ALOG) {
          const row = host.appendChild(document.createElement("div"));
          row.innerHTML = `${esc(n)} ${esc(padTo(t, 9))}<span style="color:${v === "AC" ? C.ag : "#F28B97"}">${v}</span>`;
          anim(row, [{ opacity: 0, transform: "translateX(-6px)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: OUT });
          if (!FAST) (v === "AC" ? sfx.ok : sfx.nope)();
          if (v === "WA") pop(b.q("#ag-tip"), 200, true);
          await wait(v === "WA" ? 900 : 420);
        }
      }],
      ["也会不止于题目，带着同学们了解最前沿的学术和技术发展情景。", (b) => {
        const top = b.qa(".blk")[4];
        anim(top, [{ transform: "none" }, { transform: "scale(1.12)" }, { transform: "none" }], { duration: 500, easing: OUT });
        later(() => { if (!FAST) sfx.chime(); burstW(...worldOf(b, 12 + 80, 10 + 190 - 4 * 34), 16, { colors: [C.aqua, C.hl, "#FFFFFF"], speed: 3, g: 0.05 }); }, 150);
      }],
      ["对于优秀的成员，协会也会组队参加蓝桥杯等算法竞赛。", (b) => { lift(b.qa(".agc")[2]); pop(b.q("#ag-note"), 500, true); }],
    ],
  };

  /* ---------- 06 宣传部 ---------- */
  const S_PUB = {
    key: "pub", cell: [1, 1], tag: "06", name: "宣传设计部", rt: "MEDIA",
    html: `
      <div class="card h" id="pb-dio" style="left:12px;top:10px;width:310px;height:246px;background:${C.mist}">
        <div style="position:absolute;left:0;right:0;top:214px;height:2px;background:${C.line}"></div>
        <div style="position:absolute;left:150px;top:200px;width:4px;height:14px;background:${C.line};transform:skewX(-14deg)"></div>
        <div style="position:absolute;left:256px;top:200px;width:4px;height:14px;background:${C.line};transform:skewX(14deg)"></div>
        <div class="h" id="pb-cv" style="position:absolute;left:138px;top:20px;width:134px;height:180px;background:#fff;border:2px solid ${C.line};box-sizing:border-box;overflow:hidden">
          <div class="pl" style="position:absolute;left:0;right:0;top:0;height:96px;background:${C.mizu};clip-path:inset(0 100% 0 0)"></div>
          <div class="pl" style="position:absolute;left:0;right:0;top:96px;height:80px;background:${C.lb};clip-path:inset(0 100% 0 0)"></div>
          <div class="pl" style="position:absolute;left:0;right:0;top:118px;height:60px;background:${C.line};clip-path:inset(0 100% 0 0)"></div>
          <div class="pl t24" style="position:absolute;left:0;right:0;top:34px;text-align:center;color:${C.line};clip-path:inset(0 100% 0 0)">海纳</div>
          <div class="pl t12" style="position:absolute;left:0;right:0;top:68px;text-align:center;color:${C.ink};clip-path:inset(0 100% 0 0)">招新啦</div>
          <div class="pl" style="position:absolute;left:52px;top:136px;clip-path:inset(0 100% 0 0)">${clawd(2, null, "")}</div>
        </div>
        <div id="pb-cl" class="h" style="position:absolute;left:60px;top:175px">${clawd(3, "beret", "")}</div>
        <div class="chip h" id="pb-views" style="position:absolute;left:186px;top:186px">▶ <span id="pb-vn">0</span></div>
        <div id="pb-likes" style="position:absolute;left:0;top:0"></div>
      </div>
      <div class="chips" style="left:12px;right:12px;top:272px"><span class="chip h pbc">文案</span><span class="chip h pbc">设计</span><span class="chip h pbc">新媒体</span><span class="chip h pbc">活动保障</span></div>
      <div class="note h" id="pb-note" style="left:12px;top:322px">▌让协会做的事被更多人看见</div>`,
    beats: [
      ["宣传设计部，负责文案、设计与新媒体，", async (b) => {
        lift(b.q("#pb-dio")); pop(b.q("#pb-cl"), 260); lift(b.q("#pb-cv"), 380);
        b.qa(".pbc").forEach((e, i) => lift(e, 500 + i * 120));
        await wait(700);
        const brush = b.q("#pb-cl .clawd");
        brush.classList.add("paint");
        for (const e of b.qa(".pl")) {
          if (FAST || reduce) { e.style.clipPath = "none"; continue; }
          e.style.clipPath = "none";
          e.animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 420, easing: "steps(6)" });
          sfx.draw();
          await wait(380);
        }
        brush.classList.remove("paint");
      }],
      ["招新海报、网页、活动记录，都出自这里，"],
      ["让协会做的每一件事，都能被更多人看见。", (b) => {
        lift(b.q("#pb-views")); count(b.q("#pb-vn"), 1024, 2200, 200);
        pop(b.q("#pb-note"), 600, true);
        likesLoop(b);
      }],
      ["四个部门，各司其职，不同倾向，但都在同一片海洋里。", null, { focus: DEPT_KEYS, cam: deptCam }],
    ],
  };
  async function likesLoop(b) {
    if (reduce) return;
    const st = b.st, bg = st.bgen;
    if (st.likes === bg) return;
    st.likes = bg;
    const host = b.q("#pb-likes");
    for (let i = 0; bg === st.bgen; i++) {
      await sleep(i < 6 ? 260 : 900);
      if (bg !== st.bgen) return;
      if (phase !== "tour" || !STEPS[K] || STEPS[K].key !== "pub") { st.likes = 0; return; }
      const e = document.createElement("div");
      e.style.cssText = `position:absolute;left:${150 + Math.random() * 100}px;top:40px`;
      e.innerHTML = pix(ICON.heart, PAL, 2);
      host.appendChild(e);
      e.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: `translate(${(Math.random() - 0.5) * 30}px, -60px)`, opacity: 0 }], { duration: 1400, easing: "steps(10)" }).onfinish = () => e.remove();
    }
  }

  /* ---------- 07 AI：协会的特色 ---------- */
  const AI_TAGS = [["大模型", 14, 116], ["智能体", 122, 116], ["知识问答", 230, 116], ["计算机视觉", 14, 158], ["机器人", 122, 158], ["AI 编程", 230, 158]];
  const S_AI = {
    key: "ai", cell: [1, 2], tag: "07", name: "重点方向", rt: "AI",
    html: `
      <svg class="px" width="334" height="200" style="left:0;top:0">
        ${AI_TAGS.map(([, x, y]) => `<path class="ail" d="M167 84 L${x + 45} ${y}" stroke="${C.pale2}" stroke-width="2" fill="none" style="opacity:0"/>`).join("")}
      </svg>
      <div class="h ring" style="left:112px;top:14px;width:110px;height:70px;border:2px solid ${C.aqua};box-sizing:border-box"></div>
      <div class="h ring" style="left:112px;top:14px;width:110px;height:70px;border:2px solid ${C.aqua};box-sizing:border-box"></div>
      <div class="h" id="ai-core" style="left:112px;top:14px;width:110px;height:70px;background:${C.line};border:3px solid ${C.ink};box-shadow:5px 5px 0 ${C.ink};box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:#fff;font-size:48px;line-height:1">AI</div>
      ${AI_TAGS.map(([t, x, y]) => `<div class="chip h ait" style="left:${x}px;top:${y}px;width:90px;box-sizing:border-box;text-align:center">${t}</div>`).join("")}
      <div class="t12 mid sub h" id="ai-sub" style="top:204px">学 AI，也打 AI 赛</div>
      <div class="card h" id="ai-learn" style="left:12px;top:230px;width:150px;height:124px">
        <div class="t12" style="position:absolute;left:0;right:0;top:0;height:24px;line-height:24px;padding-left:8px;background:${C.line};color:#fff">学 AI</div>
        <div class="wrap12" style="position:absolute;left:10px;top:32px;width:128px">公开课入门，再做视觉与模型应用。</div>
      </div>
      <div class="card h" id="ai-race" style="left:172px;top:230px;width:150px;height:124px;border-color:${C.amber};box-shadow:4px 4px 0 ${C.amber}">
        <div class="t12" style="position:absolute;left:0;right:0;top:0;height:24px;line-height:24px;padding-left:8px;background:${C.amber};color:#fff">打 AI 赛</div>
        <div class="wrap12" style="position:absolute;left:10px;top:32px;width:128px;color:#7A5400">已参加睿抗等；更多 AI 赛事在规划中。</div>
      </div>`,
    beats: [
      ["在四个技术方向里，人工智能的学习和开发，是我们协会现在的重点。", (b) => {
        stamp(b.q("#ai-core"));
        b.qa(".ring").forEach((e, i) => { e.style.opacity = 1; if (!reduce) e.style.animation = `ring 2.4s ${0.5 + i * 1.2}s ease-out infinite`; else e.style.opacity = 0; });
      }],
      ["我们会带着同学了解什么是大模型、智能体、计算机视觉、机器人。", (b) => {
        b.qa(".ail").forEach((e, i) => drawLine(e, i * 120, 360));
        b.qa(".ait").forEach((e, i) => lift(e, 200 + i * 120));
        lift(b.q("#ai-learn"), 1000);
      }],
      ["而在比赛方面，我们已参加了睿抗等国内 AI 赛事，还有更多 AI 赛事在规划中。", (b) => {
        pop(b.q("#ai-sub"), 0, true);
        lift(b.q("#ai-race"), 200);
        later(() => { sfx.chime(); burstW(...worldOf(b, 247, 236), 14, { colors: [C.amber, C.hl, "#FFFFFF"], speed: 3, g: 0.1 }); }, 500);
      }],
    ],
  };

  /* ---------- 08 三件事 ---------- */
  const THREE = [
    ["1", "勤奋学习", "在协会里，只做与学习有关的事。", C.line],
    ["2", "积极参加各类赛事", "老师提供多项赛事活动，以赛促学。", C.ok],
    ["3", "熟练使用 AI 工具", "拥抱前沿的新工具，不止聊天，更要会用。", "#0A8FC2"],
  ];
  const S_THREE = {
    key: "three", cell: [0, 3], tag: "11", name: "三点期望", rt: "FROM DAY 1",
    html: THREE.map(([n, t, d, c], i) => `
      <div class="card h th" style="left:12px;top:${12 + i * 122}px;width:306px;height:106px;border-color:${c};box-shadow:4px 4px 0 ${c}">
        <div style="position:absolute;left:0;top:0;bottom:0;width:58px;background:${c};color:#fff;display:flex;align-items:center;justify-content:center;font-size:48px;line-height:1">${n}</div>
        <div class="t24" style="position:absolute;left:72px;top:14px">${t}</div>
        <div class="wrap12" style="position:absolute;left:72px;top:46px;width:222px">${d}</div>
      </div>`).join(""),
    beats: [
      ["我们不给成员定硬性指标，但对每位成员，协会有三点期望。"],
      ["一，勤奋学习，希望同学们在协会里只做与学习有关的事情，不要做其他的事情。", (b) => lift(b.qa(".th")[0])],
      ["二，积极参加各类赛事，老师会为同学们提供多项赛事活动，鼓励同学们以赛促学。", (b) => lift(b.qa(".th")[1])],
      ["三，熟练使用 AI 工具，要拥抱前沿的新工具。", (b) => lift(b.qa(".th")[2])],
    ],
  };

  /* ---------- 09 一级一级往上走 ---------- */
  const RUNGS = ["入门", "实践", "善用 AI", "项目攻坚", "独当一面"];
  const stepTop = (i) => 318 - i * 50;
  const S_LADDER = {
    key: "ladder", cell: [2, 2], tag: "08", name: "成长路径", rt: "LEVEL UP",
    html: `
      <div class="card h" id="ld-st" style="left:12px;top:10px;width:310px;height:62px">
        <div class="t12 sub" style="position:absolute;left:10px;top:10px">当前阶段</div>
        <div class="t24" id="ld-lv" style="position:absolute;left:10px;top:28px;color:${C.line}">LV 0 / 5</div>
        <div style="position:absolute;right:10px;top:24px;display:flex;gap:4px">${RUNGS.map(() => `<i class="ldp" style="width:20px;height:14px;background:${C.pale};border:2px solid ${C.line};box-sizing:border-box"></i>`).join("")}</div>
      </div>
      ${RUNGS.map((t, i) => `<div class="h rung" style="left:${12 + i * 62}px;top:${stepTop(i)}px;width:62px;height:${384 - stepTop(i)}px;background:${i % 2 ? "#fff" : C.mist};border:2px solid ${C.line};box-sizing:border-box;transition:background-color .3s"><div style="position:absolute;left:0;right:0;top:8px;font-size:12px;line-height:1.5;color:${C.ink};text-align:center;white-space:nowrap">${t}</div></div>`).join("")}
      <div class="h" id="ld-flag" style="left:${12 + 4 * 62 + 40}px;top:${stepTop(4) - 46}px;width:4px;height:46px;background:${C.line}"><i style="position:absolute;left:4px;top:0;width:18px;height:12px;background:${C.aqua}"></i></div>
      <div class="h" id="ld-cl" style="left:16px;top:${stepTop(0) - 39}px">${clawd(3, "antenna", "")}</div>`,
    beats: [
      ["我们对同学的培养会有五个阶段。", (b) => { lift(b.q("#ld-st")); b.qa(".rung").forEach((e, i) => lift(e, 200 + i * 120)); }],
      ["1. 入门：会有学长和老师带着你们手把手教学，学习很多基础工具。", (b) => climb(b, 1)],
      ["2. 实践：选一门课，跟着讲义和练手题亲手做，把基础打牢。", (b) => climb(b, 2)],
      ["3. 善用 AI：让 AI 帮你学、帮你写，理解概念，排查错误。", (b) => climb(b, 3)],
      ["4. 项目攻坚：跟着学长学姐，参与真实的项目与比赛。", (b) => climb(b, 4)],
      ["5. 独当一面：做出自己的作品，再回头带新同学成长。", (b) => climb(b, 5)],
    ],
  };
  function climb(b, k) {
    const cl = b.q("#ld-cl");
    const x = 16 + (k - 1) * 62, y = stepTop(k - 1) - 39;
    b.q("#ld-lv").textContent = `LV ${k} / 5`;
    b.qa(".ldp")[k - 1].style.background = C.aqua;
    b.qa(".rung")[k - 1].style.background = C.hl;
    if (k === 1) { cl.style.left = x + "px"; cl.style.top = y + "px"; pop(cl); }
    else {
      const fx = parseFloat(cl.style.left), fy = parseFloat(cl.style.top);
      cl.style.left = x + "px"; cl.style.top = y + "px";
      anim(cl, [{ transform: `translate(${fx - x}px, ${fy - y}px)` }, { offset: 0.5, transform: `translate(${(fx - x) / 2}px, ${(fy - y) / 2 - 40}px)` }, { transform: "none" }], { duration: 480, easing: "ease-out" });
    }
    if (!FAST) { sfx.step(k); later(() => burstW(...worldOf(b, x + 27, y + 39), 8, { colors: [C.hl, C.line], speed: 2, g: 0.12 }), 470); }
    if (k === 5) { wipe(b.q("#ld-flag"), 500, 420, "bottom"); if (!FAST) later(() => sfx.fanfare(), 600); }
  }

  /* ---------- 10 场地 ---------- */
  const floorTop = (f) => 262 - f * 36;
  const S_ROOM = {
    key: "room", cell: [2, 3], tag: "09", name: "协会提供", rt: "6教 513",
    html: `
      <div class="h" id="rm-bld" style="left:12px;top:16px;width:150px;height:248px">
        <div style="position:absolute;left:30px;top:0;width:90px;height:22px;background:${C.line};color:#fff;font-size:12px;line-height:22px;text-align:center">6 教</div>
        <div style="position:absolute;left:0;top:30px;width:150px;height:218px;background:#fff;border:3px solid ${C.line};box-shadow:5px 5px 0 ${C.line};box-sizing:border-box"></div>
        ${[1, 2, 3, 4, 5, 6].map((f) => `<div style="position:absolute;left:3px;right:3px;top:${floorTop(f) - 14}px;height:36px;border-top:${f < 6 ? `2px solid ${C.pale2}` : "0"};box-sizing:border-box">
          <span style="position:absolute;left:6px;top:12px;font-size:12px;color:${C.sub}">${f}F</span>
          ${[0, 1, 2].map((w) => `<i style="position:absolute;left:${36 + w * 24}px;top:10px;width:14px;height:14px;background:${f === 5 && w === 2 ? "transparent" : C.pale}"></i>`).join("")}
        </div>`).join("")}
        <div id="rm-door" style="position:absolute;left:84px;top:${floorTop(5) - 10}px;width:30px;height:30px;background:${C.deep};overflow:hidden">
          <div id="rm-light" style="position:absolute;inset:0;background:${C.hl};transform:scaleX(0);transform-origin:0 50%"></div>
          <div id="rm-peek" style="position:absolute;left:2px;top:12px;opacity:0">${clawd(1.5, null, "")}</div>
        </div>
        <div style="position:absolute;left:118px;top:${floorTop(5) - 18}px;font-size:12px;color:${C.line}">513</div>
        <div id="rm-lift" style="position:absolute;left:-10px;top:${floorTop(1) - 2}px;width:10px;height:10px;background:${C.aqua};border:1px solid ${C.line};transition:top .9s ${INOUT}"></div>
      </div>
      <div class="card h" id="rm-card" style="left:178px;top:16px;width:144px;height:112px">
        <div class="t24" style="position:absolute;left:10px;top:12px;color:${C.line}">6教 513</div>
        <div class="t12 sub" style="position:absolute;left:10px;top:46px">固定学习场地</div>
        <div class="wrap12" style="position:absolute;left:10px;top:66px;width:124px">六教五楼 · 活动室</div>
        <div class="t12 h" id="rm-ns" style="position:absolute;left:10px;top:88px;color:${C.line}">晚自习 · 一二四</div>
      </div>
      <div class="card h" id="rm-sr" style="left:178px;top:142px;width:144px;height:122px">
        <div style="position:absolute;left:0;right:0;top:0;height:22px;background:${C.line};color:#fff;font-size:12px;line-height:22px;padding-left:8px">学长学姐带学</div>
        <div style="position:absolute;left:16px;top:56px">${clawd(3, "hardhat", "point")}</div>
        <div style="position:absolute;left:86px;top:76px">${clawd(2, null, "up")}</div>
      </div>
      ${[["网络", "wifi"], ["咖啡", "cup"], ["设备", "mon"]].map(([t, ic], i) => `<div class="card h rmf" style="left:${12 + i * 104}px;top:282px;width:96px;height:90px">
        <div style="position:absolute;left:26px;top:14px">${pix(ICON[ic], PAL, 4)}</div>
        ${ic === "cup" ? `<i class="steam" style="position:absolute;left:36px;top:6px;width:4px;height:8px;background:${C.pale2}"></i><i class="steam" style="position:absolute;left:48px;top:4px;width:4px;height:8px;background:${C.pale2};animation-delay:.4s"></i>` : ""}
        <div class="t12" style="position:absolute;left:0;right:0;top:64px;text-align:center">${t}</div></div>`).join("")}`,
    beats: [
      ["接下来，说说协会能为你提供什么。", (b) => lift(b.q("#rm-bld"))],
      ["首先是一个固定的场地：6 教 513。", async (b) => {
        lift(b.q("#rm-card"), 200);
        const lf = b.q("#rm-lift");
        if (FAST || reduce) lf.style.transition = "none";
        await wait(300);
        lf.style.top = floorTop(5) - 2 + "px";
        if (!FAST) [0, 1, 2, 3].forEach((i) => later(() => sfx.step(i), i * 200));
      }],
      ["六教五楼，推开 513 的门，就是活动室。", async (b) => {
        const l = b.q("#rm-light");
        l.style.transform = "none";
        anim(l, [{ transform: "scaleX(0)" }, { transform: "none" }], { duration: 500, easing: "steps(5)" });
        await wait(520);
        const pk = b.q("#rm-peek"); pk.style.opacity = 1;
        anim(pk, [{ transform: "translateX(-14px)" }, { transform: "none" }], { duration: 300, easing: "steps(3)" });
        if (!FAST) sfx.chime();
      }],
      ["网络、咖啡、学习设备，一应俱全。", (b) => b.qa(".rmf").forEach((e, i) => lift(e, i * 160))],
      ["晚自习每周一、二、四开放，来了记得签到。", (b) => pop(b.q("#rm-ns"), 0, true)],
      ["高年级成员，会带着新同学一起学，有问题随时问。", (b) => lift(b.q("#rm-sr"))],
    ],
  };

  /* ---------- 11 平等 ---------- */
  const PYR = [["层层审批", 122, 30], ["论资排辈", 76, 72], ["开会盖章", 168, 72], ["形式主义", 30, 114], ["走流程", 122, 114], ["看脸色", 214, 114]];
  const S_EQ = {
    key: "eq", cell: [1, 3], tag: "10", name: "人人平等", rt: "NO 官僚",
    html: `
      ${PYR.map(([t, x, y]) => `<div class="h py" style="left:${x}px;top:${y}px;width:90px;height:36px;background:${C.pale};border:2px solid ${C.sub};box-sizing:border-box;font-size:12px;line-height:32px;text-align:center;color:${C.sub}">${t}</div>`).join("")}
      <div class="h" id="eq-x" style="left:20px;top:20px;width:294px;height:140px"><svg width="294" height="140" style="overflow:visible"><path d="M8 8 L286 132 M286 8 L8 132" stroke="${C.bad}" stroke-width="5" fill="none"/></svg></div>
      <div class="t36 mid h" id="eq-big" style="top:56px;color:${C.line}">人人平等</div>
      <div class="t12 mid sub h" id="eq-sub" style="top:108px">一切只为学习</div>
      <div class="h" id="eq-ground" style="left:12px;top:262px;width:310px;height:3px;background:${C.line}"></div>
      ${[0, 1, 2, 3, 4].map((i) => `<div class="h eqc" style="left:${14 + i * 62}px;top:223px">${clawd(3, ["headset", "hardhat", "lab", "beret", null][i], "")}</div>`).join("")}
      <div class="chips" style="left:12px;right:12px;top:290px"><span class="chip h eqt">没有官僚</span><span class="chip h eqt">平等</span><span class="chip h eqt">开放</span><span class="chip y h eqt">只为学习</span></div>`,
    beats: [
      ["还有一点：协会内部，没有官僚作风。", (b) => { b.qa(".py").forEach((e, i) => lift(e, i * 90)); }],
      ["不搞层层审批，不论资排辈，", async (b) => {
        stamp(b.q("#eq-x"));
        if (!FAST) { sfx.nope(); shake(4); }
        await wait(500);
        b.qa(".py").forEach((e, i) => {
          if (FAST || reduce) { e.style.opacity = 0; return; }
          const dx = (Math.random() - 0.5) * 80, r = (Math.random() - 0.5) * 70;
          e.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${dx}px, 380px) rotate(${r}deg)`, opacity: 0 }], { duration: 900, delay: i * 50, easing: "cubic-bezier(.5,0,.9,.5)", fill: "forwards" });
        });
        fade(b.q("#eq-x"), 0, 300, 400);
        if (!FAST) later(() => sfx.crumble(), 200);
      }],
      ["人人平等，一切只为学习。", (b) => {
        b.qa(".py").forEach((e) => { e.getAnimations().forEach((a) => a.finish()); e.style.opacity = 0; });
        stamp(b.q("#eq-big")); pop(b.q("#eq-sub"), 300, true);
        wipe(b.q("#eq-ground"), 200, 500);
        b.qa(".eqc").forEach((e, i) => {
          e.style.opacity = 1;
          anim(e, [{ offset: 0, transform: "translateY(-60px)", opacity: 0 }, { offset: 0.7, transform: "translateY(4px)", opacity: 1 }], { duration: 520, delay: 400 + i * 110, easing: "ease-in" });
          if (!FAST) later(() => sfx.hop(), 700 + i * 110);
        });
        b.qa(".eqt").forEach((e, i) => lift(e, 1000 + i * 120));
        later(() => burstW(...worldOf(b, 167, 200), 14, { colors: [C.aqua, C.hl, C.bad], speed: 2.4, g: 0.05, size: 4 }), 1100);
      }],
    ],
  };

  /* ---------- 12 比赛：奖项在这里讲；考研、复试、就业是并列的三条路 ---------- */
  const FAN = [["考研", 61], ["复试", 167], ["就业", 273]];
  // 成绩只在这里出现，一律用表格
  const AW_SUM = [["级别", "一等奖", "二等奖", "三等奖", "合计"], ["国家级", "2", "1", "8", "11"], ["省级及赛区", "5", "31", "50", "86"]];
  const AW_TOP = [["等级", "赛事", "获奖者"], ["国一", "蓝桥杯国赛", "李茂清"], ["国一", "数字素养大赛国赛", "周智杰"], ["国二", "蓝桥杯国赛", "李雄博"], ["国三", "天梯赛团队赛", "柳俊辉"], ["省二", "湖南省程序设计大赛", "赵治成等"]];
  const tblHTML = (rows, cls = "") => `<table class="tbl ${cls}">${rows.map((r, i) => `<tr>${r.map((c) => (i ? `<td>${c}</td>` : `<th>${c}</th>`)).join("")}</tr>`).join("")}</table>`;
  const S_COMP = {
    key: "comp", cell: [0, 4], tag: "12", name: "竞赛与荣誉", rt: "AWARDS",
    html: `
      <div class="h" id="cp-t1" style="left:12px;top:12px;width:310px">${tblHTML(AW_SUM, "sum")}</div>
      <div class="h" id="cp-t2" style="left:12px;top:106px;width:310px">${tblHTML(AW_TOP, "best")}</div>
      <svg width="334" height="64" style="left:0;top:284px;overflow:visible">
        ${FAN.map(([, x]) => `<path class="cpa" d="M167 10 L167 20 L${x} 20 L${x} 34" stroke="${C.line}" stroke-width="3" fill="none" style="opacity:0"/>`).join("")}
      </svg>
      <div class="chip solid h" id="cp-src" style="left:111px;top:264px;width:112px;box-sizing:border-box;text-align:center">竞赛经历</div>
      ${FAN.map(([t, x], i) => `<div class="chip h cpc ${i === 2 ? "water" : ""}" style="left:${x - 43}px;top:326px;width:86px;box-sizing:border-box;text-align:center;font-size:24px">${t}</div>`).join("")}`,
    beats: [
      ["说到比赛，协会会组织大家一起备赛，一起复盘。", (b) => { lift(b.q("#cp-t1")); later(() => sfx.chime(), 500); }],
      ["来看看我们的部分获奖情况吧。", (b) => { lift(b.q("#cp-t2")); later(() => burstW(...worldOf(b, 40, 120), 12, { colors: [C.amber, C.hl, "#FFFFFF"], speed: 3, g: 0.1 }), 300); }],
      ["竞赛经历，对考研、复试和就业，都有实实在在的帮助。", (b) => {
        pop(b.q("#cp-src"), 0, true);
        b.qa(".cpa").forEach((e) => drawLine(e, 300, 420));
        b.qa(".cpc").forEach((e, i) => lift(e, 680 + i * 60));
      }],
    ],
  };

  /* ---------- 13 灯塔 ---------- */
  const STARS = Array.from({ length: 22 }, (_, i) => [Math.round((i * 73 + 17) % 320), Math.round((i * 37 + 11) % 150), i % 3]);
  const S_LIGHT = {
    key: "light", cell: [1, 4], tag: "13", name: "灯塔", rt: "ACROSS THE DEEP SEA",
    html: `
      <div id="lt-sky" style="left:0;top:0;right:0;bottom:0;background:${C.deep}">
        <div id="lt-dawn" style="position:absolute;inset:0;background:linear-gradient(180deg,#E9F7F9 0%,${C.mizu} 55%,#FFEFC2 100%);opacity:0;transition:opacity 1.6s"></div>
        <div id="lt-stars" style="position:absolute;inset:0;transition:opacity 1.2s">${STARS.map(([x, y, k]) => `<i style="position:absolute;left:${x}px;top:${y}px;width:${k ? 2 : 3}px;height:${k ? 2 : 3}px;background:${C.hl};animation:twk ${1.4 + k}s ${k * 0.3}s steps(1) infinite"></i>`).join("")}</div>
        <div id="lt-sun" style="position:absolute;left:236px;top:150px;width:40px;height:40px;background:#F4B63F;box-shadow:0 0 0 6px rgba(244,182,63,.25);opacity:0"></div>
        <div id="lt-shore" style="position:absolute;right:0;top:220px;width:120px;height:60px;opacity:0">
          <div style="position:absolute;left:0;right:0;bottom:0;height:20px;background:${C.ag}"></div>
          <div style="position:absolute;left:20px;bottom:20px;width:20px;height:30px;background:#fff;border:2px solid ${C.line};box-sizing:border-box"></div>
          <div style="position:absolute;left:46px;bottom:20px;width:26px;height:44px;background:${C.line}"></div>
          <div style="position:absolute;left:80px;bottom:20px;width:6px;height:18px;background:#1F6A61"></div>
          <div style="position:absolute;left:74px;bottom:34px;width:18px;height:16px;background:${C.wg}"></div>
          <div class="chip ok" style="position:absolute;left:4px;top:-24px">彼岸</div>
        </div>
        <div id="lt-beam" style="position:absolute;left:57px;top:131px;width:320px;height:120px;transform-origin:0 0;opacity:0;pointer-events:none">
          <svg width="320" height="120" style="position:absolute;left:0;top:-60px;overflow:visible"><polygon points="0,60 320,0 320,120" fill="rgba(255,241,168,.3)"/></svg>
        </div>
        <svg class="px" id="lt-house" width="80" height="170" style="position:absolute;left:18px;top:122px;opacity:0" viewBox="0 0 80 170">
          <rect x="30" y="0" width="20" height="4" fill="${C.line}"/>
          <rect x="28" y="4" width="24" height="16" fill="${C.hl}"/>
          <rect x="24" y="20" width="32" height="5" fill="${C.line}"/>
          <polygon points="27,25 53,25 58,140 22,140" fill="#FFFFFF"/>
          <polygon points="26,46 54,46 55,64 25,64" fill="${C.bad}"/>
          <polygon points="24,86 56,86 57,104 23,104" fill="${C.bad}"/>
          <rect x="36" y="118" width="8" height="22" fill="${C.deep}"/>
          <rect x="4" y="140" width="72" height="30" fill="${C.ink}"/>
        </svg>
        <div style="position:absolute;left:0;right:0;bottom:0;height:120px;overflow:hidden">
          <svg class="sea s1" viewBox="0 0 680 120" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0;width:200%;height:100%"><path d="M0 40 C40 28 80 52 120 40 S200 28 240 40 S320 52 340 40 C380 28 420 52 460 40 S540 28 580 40 S660 52 680 40 L680 120 L0 120 Z" fill="rgba(44,110,135,.78)"/></svg>
          <div id="lt-boat" style="position:absolute;left:-60px;top:12px;transition:left 4s ${INOUT}">
            <div style="position:absolute;left:26px;top:6px">${clawd(2, null, "")}</div>
            ${pix(["....l.......", "....lw......", "....lww.....", "....lwww....", "....lwwww...", "....l.......", "bbbbbbbbbbbb", ".bbbbbbbbbb.", "..bbbbbbbb.."], { l: C.deep, w: "#FFFFFF", b: C.clay }, 5)}
          </div>
          <svg class="sea s2" viewBox="0 0 680 120" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0;width:200%;height:78%"><path d="M0 34 C50 50 90 22 150 36 S250 52 340 32 C390 50 430 22 490 36 S590 52 680 32 L680 120 L0 120 Z" fill="rgba(13,40,51,.9)"/></svg>
        </div>
        <div id="lt-rain" style="position:absolute;inset:0;opacity:0;background:repeating-linear-gradient(105deg,transparent 0 14px,rgba(196,226,232,.35) 14px 15px);animation:rain .5s linear infinite;transition:opacity .8s"></div>
        <div class="t12 mid h" id="lt-en" style="position:absolute;top:44px;letter-spacing:.3em;color:${C.pale2}">ACROSS THE DEEP SEA</div>
        <div class="t36 mid h" id="lt-cn" style="position:absolute;top:66px;color:#fff">穿过深海</div>
      </div>`,
    beats: [
      ["我们希望，海纳协会成为湖南涉外经济学院的一座灯塔，", async (b) => {
        const h = b.q("#lt-house"); h.style.opacity = 1;
        anim(h, [{ offset: 0, transform: "translateY(30px)", opacity: 0 }], { duration: 600, easing: OUT });
        await wait(600);
        const bm = b.q("#lt-beam"); bm.style.opacity = 1; if (!reduce) bm.style.animation = "sweep 5s ease-in-out infinite alternate";
        if (!FAST) sfx.bell();
      }],
      ["带大家穿过计算机科学最深的那片海，", (b) => {
        b.q("#lt-rain").style.opacity = 1;
        b.qa(".sea").forEach((e) => e.classList.add("storm"));
        b.q("#lt-boat").style.left = "40px";
        if (!FAST) sfx.whoosh();
      }],
      ["Across the deep sea.", (b) => { pop(b.q("#lt-en"), 0, true); stamp(b.q("#lt-cn"), 220); b.q("#lt-boat").style.left = "120px"; }],
      ["抵达彼岸：一个美妙、灵动、充满灵性的计算机科学世界。", (b) => {
        b.q("#lt-rain").style.opacity = 0;
        b.qa(".sea").forEach((e) => e.classList.remove("storm"));
        b.q("#lt-dawn").style.opacity = 1; b.q("#lt-stars").style.opacity = 0;
        b.q("#lt-cn").style.color = C.line; b.q("#lt-en").style.color = C.sub;
        b.q("#lt-beam").style.opacity = 0;
        const sun = b.q("#lt-sun"); sun.style.opacity = 1;
        anim(sun, [{ transform: "translateY(80px)" }, { transform: "none" }], { duration: 1600, easing: OUT });
        const sh = b.q("#lt-shore"); sh.style.opacity = 1;
        anim(sh, [{ offset: 0, transform: "translateX(40px)", opacity: 0 }], { duration: 900, delay: 300, easing: OUT });
        b.q("#lt-boat").style.left = "196px";
        later(() => sfx.chime(), 500);
      }],
    ],
  };

  /* ---------- 结尾：回到第一块卡片 ---------- */
  const S_FIN = {
    key: "fin", board: "title", tag: "00", name: "海纳协会",
    beats: [
      ["这就是海纳协会。", null, { focus: "all", cam: () => fitAll() }],
      ["海纳百川，有容乃大；用智慧驱动网络，以算法引领未来。", (b) => { lift(b.q("#tl-slogan")); pop(b.q("#tl-motto"), 300, true); pop(b.q("#tl-school"), 500, true); b.qa(".tlc").forEach((e, i) => lift(e, 800 + i * 150)); }],
      ["如果你对这里感兴趣，就填写报名表吧！", null, { pose: "wave", last: true }],
    ],
  };

  const OWNERS = [T_TITLE, S_NAME, S_DEV, S_NET, S_PROJ, S_ALGO, S_PUB, S_AI, S_LADDER, S_ROOM, S_EQ, S_THREE, S_COMP, S_LIGHT];
  const STOPS = [...OWNERS, S_FIN];
  const OWNER = Object.fromEntries(OWNERS.map((s) => [s.key, s]));
  /* ================= 每一站的文字介绍（取自章程、AI 方向建议案和竞赛统计表） ================= */
  const INFO = {
    title: ["智慧算法网络协会，也叫海纳协会，2026 年 3 月成立。", [
      ["宗旨", "拒绝空谈，行动至上；专注实战，唯实惟先。"],
      ["口号", "用智慧驱动网络，以算法引领未来。"],
      ["方向", "算法 · 网络 · 人工智能 · 信息安全"]]],
    name: ["HIEU 取 HI，INAA 取 NA，合为「海纳」。", [["取义", "海纳百川，有容乃大。不论专业，不论院系，甚至不论学校。"]]],
    dev: ["培养真正的开发者，一切学习围绕项目展开。", [
      ["平台", "协会自主开发，整合高校优秀课程与慕课。"],
      ["热力图", "完成学习任务，点亮一格。"]]],
    net: ["总揽各种学习和训练。", [
      ["平台", "学习系统的运营与维护。"],
      ["活动", "每周「海纳百川」线下课题讨论。"],
      ["赛事", "网络类赛事的集训。"]]],
    proj: ["负责科创项目。", [
      ["范围", "软件、机器学习、嵌入式。"],
      ["常年参与", "硬件：嵌入式与开发板；软件：网站与 App。"]]],
    algo: ["负责算法学习与竞赛。", [
      ["学习", "从零开始，由题目构建数据结构。"],
      ["日常", "培训、刷题。"],
      ["赛事", "蓝桥杯。"]]],
    pub: ["负责文案、设计与新媒体。", [["协作", "四个部门，不同倾向，都在同一片海洋里。"]]],
    ai: ["四个方向里，人工智能是现在的重点。", [
      ["学习", "大模型、智能体、计算机视觉、机器人。"],
      ["赛事", "已参加国内 AI 赛事，更多在规划中。"]]],
    three: ["不定硬性指标，只有三点期望。", [["一", "勤奋学习。"], ["二", "积极参加各类赛事。"], ["三", "熟练使用 AI 工具。"]]],
    ladder: ["入门 → 实践 → 善用 AI → 项目攻坚 → 独当一面。", [["训练营", "以高校课程与慕课为主，打卡、分享、答疑。"]]],
    room: ["固定场地：6 教 513。", [
      ["条件", "网络、咖啡、学习设备。"],
      ["晚自习", "每周一、二、四 19:00–20:40。"]]],
    eq: ["没有官僚作风，人人平等，一切只为学习。", []],
    comp: ["协会组织大家一起备赛，一起复盘。", [["对成长", "对考研、复试和就业，都有实实在在的帮助。"]]],
    light: ["成为一座灯塔，带大家穿过计算机科学最深的那片海。", [["报名", "仅限校内新生。"]]],
  };


  /* ================= 详细介绍：看完一遍动画以后，点任意一站，先读这里的文字。成绩只在「竞赛与荣誉」里，用表格 ================= */
  const AW_ALL = [["等级", "赛事 · 年份", "获奖者"],
    ["国一", "蓝桥杯全国总决赛 Java 本科 B 组 · 2022", "李茂清"],
    ["国一", "数字素养大赛 C 语言赛项国赛 · 2025", "周智杰"],
    ["国二", "蓝桥杯全国总决赛 Python 大学 B 组 · 2024", "李雄博"],
    ["国三", "蓝桥杯全国总决赛 C/C++ 本科 A 组 · 2023", "李茂清"],
    ["国三", "团体程序设计天梯赛团队赛 · 2026", "柳俊辉"],
    ["国三", "数字素养大赛国赛 6 项 · 2025—2026", "左宇佳、申子宇、赵梓瑜、杨嘉良、梁仁和、何文祺"],
    ["省一", "蓝桥杯湖南赛区 5 项 · 2022—2026", "李茂清、张莉晨、李雄博、柳俊辉"],
    ["省二", "湖南省大学生程序设计大赛 · 2026", "赵治成、邵祥盛、谢哲宇"],
    ["省三", "睿抗机器人大赛 AI 视觉赛道 · 2026", "赵治成"],
    ["省二", "华为 ICT 大赛网络赛道 · 2024", "刘梓轩、周锦涛、宁智辉"],
    ["省二", "蓝桥杯 5G 全网规划与建设 10 项 · 2024—2026", "常晶、张莉晨等"],
    ["省二", "中国大学生计算机设计大赛中南赛区 · 2026", "赵旭升团队"],
    ["省二", "湖南省大学生程序设计竞赛应用开发赛道 · 2023", "宋俊涛"]];
  const DETAIL = {
    title: [
      ["简介", "智慧算法网络协会（INAA），也叫海纳协会，隶属湖南涉外经济学院信息与机电工程学院，2026 年 3 月成立。"],
      ["宗旨", "拒绝空谈，行动至上；专注实战，唯实惟先。"],
      ["口号", "用智慧驱动网络，以算法引领未来。"],
      ["技术方向", "算法设计、网络规划、人工智能开发、信息安全实践。"],
      ["四个部门", "综合网络部、项目部、算法部、宣传设计部。\n指导老师：熊芳、余力。"]],
    name: [
      ["由来", "湖南涉外经济学院简称 HIEU，智慧算法网络协会简称 INAA，各取 HI 与 NA，合为 HI·NA，读作「海纳」。"],
      ["取义", "海纳百川，有容乃大。不论专业，不论院系，甚至不论学校，都可以汇入这片海。"]],
    dev: [
      ["目标", "培养真正的开发者。不止会解题，更要做出作品，所以一切学习围绕项目展开。"],
      ["学习系统", "协会自主开发，整合了很多高校的优秀课程与慕课，配有讲义和练手题，浏览器里即时判题，让每一位同学都能学有所获。"],
      ["热力图", "每完成一项学习任务，热力图就被点亮一格；还可以与不同的同学 PK。"],
      ["日常", "选课、晚自习签到、比赛报名，都在平台上完成。"],
      ["理念", "学习应该由兴趣驱动，而非任务驱动。"]],
    net: [
      ["职责", "总揽各种学习和训练；搭建协会网络技术交流平台，组织网络技术分享、技能交流活动。"],
      ["统筹", "各项赛事和学习培训的整理与规划，都在综合网络部。"],
      ["学习系统", "协会学习系统的运营与维护、各平台学习资源的分享，都诞生于这里。"],
      ["每周活动", "「海纳百川」线下课题讨论，分享这一周的学习和见闻。"],
      ["网络赛事", "组网、路由交换、5G 网络规划；赛前集训，赛后复盘。\n蓝桥杯「5G 全网规划与建设」、华为 ICT 大赛网络赛道。"],
      ["信息安全实践", "网络安全基础与攻防练习，也由这里组织。"]],
    proj: [
      ["职责", "负责科创项目。比赛项目内容的立项、落地、研发、迭代，都在这里完成。"],
      ["范围", "传统的软件项目设计、前沿的机器学习相关、极具实用价值的嵌入式产品，都可以做。在这里，把你的小巧思变为现实。"],
      ["常年参与", "硬件：嵌入式与开发板。\n软件：网站与 App。"],
      ["攻坚机制", "按项目动态组队，负责人带队，结束后重组。老成员带新人，定期展示进度，请老师指导。"]],
    algo: [
      ["职责", "算法学习与竞赛。"],
      ["学习", "从零开始，由一道道题目构建数据结构的高楼：从排序、搜索，到数据结构、动态规划、图论。"],
      ["拓展", "不止于题目，也带着同学们了解最前沿的学术和技术发展。"],
      ["活动", "培训、刷题。"],
      ["赛事", "优秀成员组队参加蓝桥杯、湖南省大学生程序设计竞赛等算法竞赛。"]],
    pub: [
      ["职责", "文案、设计、新媒体与活动保障，让协会的活动与成果被看见。"],
      ["工作", "招新海报、网页等物料，统一视觉风格；记录并发布协会活动。"],
      ["规范", "活动策划书审批通过前，不做任何宣传；线上内容提前报备（章程第十八条）。"],
      ["协作", "四个部门各司其职，不同倾向，但都在同一片海洋里；遇到重大比赛或项目，跨部门组建攻坚小组。"]],
    ai: [
      ["定位", "人工智能开发是章程列明的方向之一，也是协会现在的重点。"],
      ["缘由", "算法、项目两条赛道，校内已有成熟组织；AI 赛道正在扩容，校内还没有人系统耕耘。"],
      ["学习", "从公开课入门，了解什么是大模型、智能体、计算机视觉、机器人，以及怎样使用 AI 编程助手。"],
      ["赛事", "已参加睿抗机器人开发者大赛（AI 视觉赛道）。"],
      ["规划中", "华为 ICT 大赛 AI 赛道、阿里天池、火山引擎相关赛事、中国高校计算机大赛·人工智能创意赛。"]],
    three: [
      ["勤奋学习", "希望同学们在协会里，只做与学习有关的事情。"],
      ["积极参加各类赛事", "老师会为同学们提供多项赛事活动，鼓励以赛促学；有比赛，第一时间通知。"],
      ["熟练使用 AI 工具", "要拥抱前沿的新工具：不止聊天，更要会用 AI 编程助手辅助学习与开发。"],
      ["基础", "不定硬性指标，零基础也可以加入。"]],
    ladder: [
      ["五个阶段", "1. 入门：学长和老师手把手带着你，学习很多基础工具。\n2. 实践：选一门课，跟着讲义和练手题亲手做，把基础打牢。\n3. 善用 AI：让 AI 帮你学、帮你写，理解概念，排查错误。\n4. 项目攻坚：跟着学长学姐，参与真实的项目与比赛。\n5. 独当一面：做出自己的作品，再回头带新同学成长。"],
      ["新生路径", "百团大战招新 → 新生公开课 → 共学训练营 → 考核与分流。"],
      ["共学训练营", "以高校课程与慕课为主，自学为主；协会提供计划、打卡、分享与答疑。"],
      ["全年节奏", "磨合组队，技术筑基；项目孵化，做出雏形；全真模拟，冲刺比赛。"]],
    room: [
      ["场地", "6 教 513（六教五楼），协会的固定活动室。推开 513 的门，就是活动室。"],
      ["条件", "网络、咖啡、学习设备，一应俱全。"],
      ["晚自习", "每周一、二、四 19:00–20:40，签到签退拍照。"],
      ["带学", "高年级成员带着新同学一起学，有问题随时问。"]],
    eq: [
      ["没有官僚", "不搞层层审批、论资排辈、开会盖章、形式主义。"],
      ["人人平等", "成员之间不分高低，一切只为学习。"]],
    comp: [
      ["获奖汇总（2020 年至今）", { table: AW_SUM, cls: "sum" }],
      ["奖项一览", { table: AW_ALL, cls: "list" }],
      ["对成长的帮助", "竞赛经历，对考研、复试和就业，都有实实在在的帮助。"]],
    light: [
      ["愿景", "成为湖南涉外经济学院的一座灯塔，带大家穿过计算机科学最深、最难的那片海，抵达彼岸：一个美妙、灵动、充满灵性的计算机科学世界。"],
      ["加入", "仅限校内新生。进招新咨询群 → 填报名表 → 审核（部分部门面试）→ 入会建档。"],
      ["其他同学", "老师、校外同学和已有账号的成员，直接进入平台。"]],
  };
  const detailHTML = (key) => DETAIL[key].map(([h, t]) => `<h3>${h}</h3>` + (typeof t === "string" ? `<p>${t.replace(/\n/g, "<br>")}</p>` : tblHTML(t.table, t.cls))).join("");
  const infoHTML = (key) => { const [lead, items] = INFO[key]; return `<p class="lead">${lead}</p><dl>${items.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join("")}</dl>`; };

  function worldOf(b, x, y) { const p = boardPos(b.st); return [p.x + 3 + x, p.y + 33 + y]; }

  /* ================= 把每一句话排成一条线：第 k 步的画面完全由 0…k 决定，所以能随时倒回去 ================= */
  const STEPS = [{ wall: true, st: T_TITLE, owner: T_TITLE, key: "title", o: {} }];
  STOPS.forEach((st, si) => st.beats.forEach(([text, fn, o], bi) => {
    const owner = OWNER[st.board || st.key];
    STEPS.push({ st, si, bi, owner, key: owner.key, text, fn, o: o || {} });
  }));
  const LAST = STEPS.length - 1;
  const REVEAL = STEPS.findIndex((s) => s.o.reveal);
  const firstOf = (owner) => STEPS.findIndex((s) => !s.wall && s.key === owner.key && !s.o.nobuild);
  const progIdx = (s) => (s.st === S_FIN ? OWNERS.length : OWNERS.indexOf(s.st));
  const camOf = (k) => (STEPS[k].o.cam ? STEPS[k].o.cam() : fitBoard(STEPS[k].owner));
  const envOf = (k) => {
    const s = STEPS[k];
    if (s.wall) return { night: false, mood: "wall" };
    if (s.st === S_LIGHT) return { night: s.bi < 3, mood: s.bi < 3 ? "night" : "dawn" };
    if (s.st === S_FIN) return { night: false, mood: "dawn" };
    return { night: false, mood: "tour" };
  };

  /* 动画用到的关键帧 */
  const kfs = document.createElement("style");
  kfs.textContent = `
    @keyframes pk { from { offset-distance: 0%; } to { offset-distance: 100%; } }
    @keyframes atk { 0% { transform: none; opacity: 1; } 70% { transform: translateX(-108px); opacity: 1; } 85% { transform: translateX(-96px); opacity: .6; } 100% { transform: translateX(-104px); opacity: 0; } }
    @keyframes blinkc { 50% { opacity: 0; } }
    @keyframes led { 0% { background: #FFE07A; box-shadow: 0 0 6px 2px rgba(255,224,122,.7); } 50% { background: #0B3D33; box-shadow: none; } }
    @keyframes spark { 0% { opacity: 0; transform: none; } 33% { opacity: 1; } 100% { opacity: 0; transform: translateY(-14px); } }
    @keyframes twk { 50% { opacity: .2; } }
    @keyframes sweep { from { transform: rotate(-16deg); } to { transform: rotate(14deg); } }
    @keyframes rain { from { background-position: 0 0; } to { background-position: -12px 30px; } }
    @keyframes seaA { to { transform: translateX(-50%); } }
    @keyframes steam { 0% { transform: none; opacity: .9; } 100% { transform: translateY(-8px); opacity: 0; } }
    @keyframes ring { 0% { transform: scale(1); opacity: .9; } 100% { transform: scale(1.5, 1.8); opacity: 0; } }
    .sea.s1 { animation: seaA 9s linear infinite; }
    .sea.s2 { animation: seaA 6s linear infinite reverse; }
    .sea.storm { animation-duration: 2.4s; }
    .steam { animation: steam 1.2s steps(3) infinite; }
    .pk { offset-rotate: 0deg; }`;
  document.head.appendChild(kfs);

  /* ================= 场景渲染 ================= */
  function renderWorld() {
    world.innerHTML = "";
    world.style.width = WW + "px";
    world.style.height = WH + "px";
    buildRoute();
    world.insertAdjacentHTML("beforeend", OWNERS.map(boardHTML).join(""));
    world.insertAdjacentHTML("beforeend", `<div id="guide" style="position:absolute;left:0;top:0;opacity:0">${clawd(3)}</div>`);
    G.el = $("guide");
    guide = G.el.querySelector(".clawd");
    OWNERS.forEach((st) => { st.bgen = (st.bgen || 0) + 1; sig[st.key] = -1; });
  }
  function setProgress(i) {
    $("pNum").textContent = `${String(Math.min(i, TOTAL)).padStart(2, "0")} / ${TOTAL}`;
    $("pBar").style.width = (Math.min(i, TOTAL) / TOTAL) * 100 + "%";
    $("pName").textContent = i >= OWNERS.length ? "海纳协会" : OWNERS[i].name;
  }
  function setEnv(k) {
    const e = envOf(k);
    if (!info.hidden && STEPS[k].owner !== infoOf) info.hidden = true;
    document.body.classList.toggle("night", e.night);
    music.set(e.mood);
    setProgress(progIdx(STEPS[k]));
    const s = STEPS[k], focus = s.wall ? [] : s.o.focus === "all" ? OWNERS.map((o) => o.key) : s.o.focus || [s.key];
    OWNERS.forEach((st) => $("b-" + st.key).classList.toggle("cur", focus.includes(st.key)));
  }

  /* ================= 开场：黑屏、敲墙 ================= */
  const wall = $("wall"), spot = $("spot"), cracks = $("cracks"), hole = $("hole"), knockTip = $("knockTip");
  let knock = null;
  function spotXY() { return { x: Math.round(V.x + V.w / 2), y: Math.round(V.y + V.h * 0.5) }; }
  function placeSpot() {
    const p = spotXY();
    spot.style.left = p.x + "px"; spot.style.top = p.y + "px";
    knockTip.style.left = p.x + "px"; knockTip.style.top = p.y + "px";
    hole.style.left = p.x + "px"; hole.style.top = p.y + "px";
  }
  function crack(n) {
    const c = spotXY();
    const arms = 2 + n;
    for (let a = 0; a < arms; a++) {
      const ang = (a / arms) * Math.PI * 2 + n * 0.7 + Math.random() * 0.5;
      let x = c.x, y = c.y;
      const pts = [[x, y]];
      const len = 26 + n * 26 + Math.random() * 20;
      for (let s = 0; s < 4; s++) {
        const aa = ang + (Math.random() - 0.5) * 0.9;
        x += Math.cos(aa) * len / 4; y += Math.sin(aa) * len / 4;
        pts.push([Math.round(x), Math.round(y)]);
      }
      const pl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      pl.setAttribute("points", pts.map((p) => p.join(",")).join(" "));
      cracks.appendChild(pl);
      drawLine(pl, a * 30, 220);
    }
  }
  function knockPhase() {
    const g = gen;
    placeSpot();
    spot.classList.add("on"); knockTip.classList.add("on");
    return new Promise((res, rej) => {
      knock = { n: 0, busy: false, done: () => { knock = null; g === gen ? res() : rej(ABORT); } };
    });
  }
  const KNOCK_LINES = ["对，就是那里！", "再来一下！", "快了快了……"];
  function doKnock() {
    if (!knock || knock.busy) return;
    const n = ++knock.n;
    knockTip.classList.remove("on");
    const c = spotXY();
    sfx.tok(n); buzz(18 + n * 8); shake(3 + n * 2);
    crack(n);
    burst(c.x, c.y, 10 + n * 6, { colors: [C.mizu, C.aqua, C.line, "#FFFFFF"], speed: 2.4 + n * 0.6, g: 0.22, size: 3 });
    spot.style.transform = `scale(${1 + n * 0.5})`;
    if (n < 4) { soft(say(KNOCK_LINES[n - 1], { who: "wall", ready: false })); return; }
    knock.busy = true;
    knock.done();
  }
  function wallTiles() {
    const c = spotXY(), T = 40, cols = Math.ceil(vw / T), rows = Math.ceil(vh / T);
    const frag = document.createDocumentFragment(), list = [];
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const e = document.createElement("div");
      e.className = "tile";
      e.style.cssText = `left:${q * T}px;top:${r * T}px;width:${T + 1}px;height:${T + 1}px`;
      list.push([e, Math.hypot(q * T + T / 2 - c.x, r * T + T / 2 - c.y)]);
      frag.appendChild(e);
    }
    wall.appendChild(frag);
    return list;
  }
  async function breakWall() {
    const c = spotXY();
    spot.classList.remove("on"); spot.style.opacity = 0;
    hideDlg();
    // 先开一个小洞，光从洞里透出来
    hole.style.display = ""; hole.style.width = hole.style.height = "120px";
    if (!reduce) hole.animate([{ transform: "translate(-50%,-50%) scale(0)" }, { transform: "translate(-50%,-50%) scale(1)" }], { duration: 380, easing: OUT, fill: "forwards" });
    sfx.tok(5); buzz(40); shake(10);
    burst(c.x, c.y, 40, { colors: ["#FFFFFF", C.mizu, C.aqua, C.hana], speed: 5, g: 0.2, size: 4 });
    await wait(650);
    // 再从洞口往外，一圈一圈把黑墙剥掉
    const list = wallTiles();
    wall.classList.add("broken");
    cracks.innerHTML = "";
    hole.style.display = "none"; hole.getAnimations().forEach((a) => a.cancel());
    sfx.crumble(); music.set("tour", true);
    let maxD = 0;
    for (const [e, d] of list) {
      if (d < 70 || reduce) { e.remove(); continue; }
      const delay = (d - 70) * 1.15;
      maxD = Math.max(maxD, delay);
      e.animate([{ transform: "none", opacity: 1 }, { transform: `translateY(${10 + Math.random() * 16}px) scale(.15) rotate(${(Math.random() - 0.5) * 60}deg)`, opacity: 0 }], { duration: 460, delay, easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" });
    }
    await wait(reduce ? 50 : 200);
    // 小螃蟹从洞里跳出来
    const wp = toWorld(c.x - 27, c.y - 20);
    G.x = wp.x; G.y = wp.y; G.hop = null; placeGuide(); G.el.style.opacity = 1;
    anim(G.el, [{ offset: 0, transform: "scale(.2) translateY(20px)", opacity: 0 }, { offset: 0.6, transform: "scale(1.1) translateY(-6px)", opacity: 1 }], { duration: 480, easing: OUT });
    sfx.hop();
    await wait(Math.min(maxD, 900) + 300);
    await hopTo(perch(T_TITLE), 700, 2);
    await wait(Math.max(0, maxD - 1000));
    wall.hidden = true;
    wall.querySelectorAll(".tile").forEach((e) => e.remove());
  }
  // 倒回黑墙：碎块从外往里飞回来，小螃蟹钻回洞里
  async function sealWall() {
    const c = spotXY();
    wall.hidden = false; wall.classList.add("broken"); cracks.innerHTML = "";
    spot.style.transform = ""; spot.style.opacity = ""; spot.classList.remove("on");
    hole.style.display = "none";
    const list = wallTiles();
    const maxD = Math.max(...list.map(([, d]) => d));
    sfx.seal();
    const hp = toWorld(c.x - 27, c.y - 20);
    soft(hopTo(hp, 600, 2).then(() => { G.el.style.opacity = 0; }));
    if (!reduce) for (const [e, d] of list) {
      e.animate([{ transform: `translateY(${-14 - Math.random() * 14}px) scale(.15) rotate(${(Math.random() - 0.5) * 60}deg)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 420, delay: (maxD - d) * 0.9, easing: "cubic-bezier(.1,.4,.5,1)", fill: "backwards" });
    }
    await wait(reduce ? 50 : maxD * 0.9 + 440);
    wall.classList.remove("broken");
    wall.querySelectorAll(".tile").forEach((e) => e.remove());
    G.el.style.opacity = 0;
  }

  /* ================= 引擎 ================= */
  let K = -1, phase = "boot", moving = false, running = null;
  // 换镜头、跳步时把还在路上的飞行和跳跃收掉，让等着它们的 Promise 都有个结果
  function stopMotion() {
    const a = cam.anim, h = G.hop;
    cam.anim = null; G.hop = null;
    if (a) a.done(); if (h) h.done();
    if (guide) guide.classList.remove("walk");
  }
  const sig = {}; // 每块卡片当前停在第几步的样子
  const targetOf = (key, k) => { for (let i = k; i >= 1; i--) if (STEPS[i].key === key) return i; return -1; };
  const builtAt = (key, j) => { for (let i = 1; i <= j; i++) if (STEPS[i].key === key && !STEPS[i].o.nobuild) return true; return false; };
  const ghostAt = (key, k) => (key === "title" ? k >= 0 : k >= REVEAL);

  // 把所有卡片摆成第 k 步时的样子；变了的卡片做一下“倒带”
  async function applyBoards(k, rewind) {
    const changed = [];
    FAST = true;
    try {
      for (const st of OWNERS) {
        const el = $("b-" + st.key), j = targetOf(st.key, k);
        if (sig[st.key] !== j) {
          const was = el.classList.contains("solid");
          st.bgen++;
          el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
          el.querySelector(".bd").innerHTML = st.html;
          if (j < 0 || !builtAt(st.key, j)) {
            el.classList.remove("solid"); el.querySelector(".nm").textContent = "";
            if (was) changed.push([el, "unbuild"]);
          } else {
            solidNow(st);
            const b = B(st);
            // 按顺序等每一步做完：异步的那几步（灯塔、名字……）在快进时也不会串到后面
            for (let i = 1; i <= j; i++) if (STEPS[i].key === st.key && STEPS[i].fn) await soft(STEPS[i].fn(b));
            changed.push([el, "rewind"]);
          }
          sig[st.key] = j;
        }
        const gv = ghostAt(st.key, k);
        if (!el.classList.contains("solid")) el.classList.toggle("ghost", gv);
      }
      await tick0();
    } finally { FAST = false; }
    $("route").querySelector(".ghostline").classList.toggle("on", k >= REVEAL);
    if (rewind && !reduce) changed.forEach(([el, how]) => {
      if (how === "unbuild") el.animate([{ transform: "translate(-4px,-4px)", boxShadow: "6px 6px 0 rgba(44,110,135,.8)", background: "#fff" }, { transform: "none", boxShadow: "0 0 0 rgba(44,110,135,0)" }], { duration: 420, easing: OUT });
      else el.querySelector(".bd").animate([{ opacity: 0.2, transform: "translateX(-8px)", filter: "blur(1.5px)" }, { opacity: 1, transform: "none", filter: "none" }], { duration: 380, easing: "steps(5)" });
    });
  }

  // 往前走一步（带完整动画）
  async function forward() {
    if (moving || K >= LAST) return;
    moving = true;
    // 上一步的动画还没演完就往前点：先把那块卡片直接摆成演完的样子，免得后半段串进下一句
    if (running && !running.done) {
      gen++; stopMotion();
      sig[running.key] = NaN; running = null;
      await applyBoards(K);
    }
    const k = K + 1, p = STEPS[K], s = STEPS[k];
    K = k;
    const g = gen;
    try {
      setEnv(k); syncBack();
      const newBoard = !p || p.wall || p.key !== s.key;
      if (newBoard) dText.classList.add("dim");
      dlg.classList.remove("ready");
      const tasks = [];
      const to = camOf(k);
      if (!camNear(to, cam.anim ? cam.anim.to : cam)) { tasks.push(fly(to)); if (newBoard) sfx.whoosh(); }
      tasks.push(hopTo(perch(s.owner)));
      routeTo(progIdx(s));
      if (s.o.reveal) OWNERS.slice(1).forEach((st, i) => later(() => { ghost(st); if (!FAST) sfx.pop(); }, 500 + i * 110));
      $("route").querySelector(".ghostline").classList.toggle("on", k >= REVEAL);
      await Promise.all(tasks);
      if (g !== gen) return;
      sig[s.key] = k;
      if (!s.o.nobuild) await build(s.owner);
      if (g !== gen) return;
      guidePose(s.o.pose || null);
      if (s.fn) { const r = (running = { key: s.key, done: false }); soft(s.fn(B(s.owner))).finally(() => (r.done = true)); }
      moving = false;
      await say(s.text, { ready: k < LAST });
      if (k === LAST && g === gen) { await wait(500); showCTA(); }
    } catch (e) { if (e !== ABORT) console.error(e); }
    finally { if (g === gen) moving = false; }
  }

  // 直接跳到第 k 步：卡片按第 k 步摆好，相机和小螃蟹飞过去，那句话整句显示
  async function jump(k, o = {}) {
    gen++; const g = gen;
    killLine(); knock = null; moving = true; running = null;
    stopMotion();
    K = k; phase = "tour";
    document.body.classList.add("touring");
    try {
      setEnv(k); syncBack();
      await applyBoards(k, o.rewind);
      if (g !== gen) return;
      routeTo(progIdx(STEPS[k]), 700);
      guidePose(STEPS[k].o.pose || null);
      G.el.style.opacity = 1;
      if (o.rewind) sfx.rewind();
      await Promise.all([fly(camOf(k), o.dur || 760), hopTo(perch(STEPS[k].owner), 620)]);
      if (g !== gen) return;
      moving = false;
      await say(STEPS[k].text, { instant: true, ready: k < LAST });
      if (k === LAST) showCTA();
    } catch (e) { if (e !== ABORT) console.error(e); }
    finally { if (g === gen) moving = false; }
  }

  function next() {
    if (phase === "form" || phase === "home" || phase === "end" || phase === "boot") return;
    if (line && !line.done) { line.finish(); return; }
    if (tapWaiter) { const w = tapWaiter; tapWaiter = null; w(); return; }
    if (knock) { doKnock(); return; }
    if (phase === "tour") forward();
  }
  function back() {
    if (phase === "form" || phase === "home" || phase === "leaving" || phase === "wall" || phase === "boot") return;
    if (phase === "end") hideCTA();
    if (K <= 1) { soft(rewall()); return; }
    jump(K - 1, { rewind: true });
  }

  /* ---------- 黑墙这一段 ---------- */
  async function wallScene(again) {
    phase = "wall"; K = 0;
    document.body.classList.remove("touring");
    setEnv(0); syncBack();
    const g = gen;
    if (!again) {
      $("prog").style.opacity = 0;
      Object.assign(cam, fitBoard(T_TITLE)); applyCam();
      ghost(T_TITLE);
      wall.hidden = false; wall.classList.remove("broken"); cracks.innerHTML = ""; hole.style.display = "";
      spot.style.transform = ""; spot.style.opacity = "";
      placeSpot();
      await wait(900);
      spot.classList.add("on");
      await say("咚、咚……外面有人吗？", { who: "wall" }); await awaitTap();
      await say("这面墙太厚了，我一个人凿不开。", { who: "wall" }); await awaitTap();
      await say("帮我一把：敲一下发光的地方。", { who: "wall", ready: false });
    } else {
      placeSpot();
      spot.classList.add("on");
      await say("……又回到墙里面了。再帮我敲开一次？", { who: "wall", ready: false });
    }
    await knockPhase();
    await breakWall();
    if (g !== gen) return;
    $("prog").style.opacity = 1;
    phase = "tour";
    document.body.classList.add("touring");
    await forward();
  }
  async function rewall() {
    gen++; killLine(); moving = true; running = null; stopMotion();
    phase = "wall"; K = 0;
    document.body.classList.remove("touring");
    try {
      setEnv(0); syncBack();
      hideDlg();
      await applyBoards(0, true);
      $("prog").style.opacity = 0;
      sfx.rewind();
      await fly(fitBoard(T_TITLE), 600);
      await sealWall();
      moving = false;
      await wallScene(true);
    } catch (e) { if (e !== ABORT) console.error(e); }
  }
  // 跳过：墙直接拆掉，所有卡片搭好，停在最后一句
  function skip() {
    if (phase === "end" || phase === "form" || phase === "home") return;
    if (phase === "wall" || phase === "boot") {
      wall.hidden = true; wall.querySelectorAll(".tile").forEach((e) => e.remove()); knock = null;
      spot.classList.remove("on"); knockTip.classList.remove("on");
      $("prog").style.opacity = 1;
      const pp = perch(T_TITLE); G.x = pp.x; G.y = pp.y; placeGuide(); G.el.style.opacity = 1;
    }
    jump(LAST, { dur: 1200 });
  }
  function restart() {
    gen++; killLine(); knock = null; stopMotion(); P.length = 0; moving = false; running = null;
    $("cta").hidden = true; detail.hidden = true; detailKey = null; $("skip").hidden = false; document.body.classList.remove("endmode", "touring", "night", "detailing");
    hideDlg(); dlg.dataset.who = "";
    renderWorld();
    layout();
    soft(wallScene(false));
  }

  /* ================= 结尾的按钮，和可以拖的地图 ================= */
  /* ================= 接入网站 =================
     /intro/            第一次打开首页的游客，从头播开场
     /intro/?view=map   从网站的“协会介绍”进来：不播开场，直接停在结尾的地图上
     &from=/about       “回到平台”回到哪一页（只认站内路径），没有就回首页 */
  const QS = new URLSearchParams(location.search);
  const VIEW_MAP = QS.get("view") === "map";
  const BACK_TO = (() => { const f = QS.get("from") || "/"; return /^\/(?![\/\\])/.test(f) ? f : "/"; })();
  // 和网站 src/client/intro.ts 的 INTRO_SEEN_KEY 一致：来过这一页，首页就不再自动跳过来。隐私模式下读写会报错，不管它
  try { localStorage.setItem("hiana.intro.seen", "1"); } catch (e) {}
  // 已登录的成员：不显示“新生报名”；招新关闭：不显示“新生报名”，面板上写关闭的提示
  let member = false, closedMsg = null;
  fetch("/api/auth/me", { credentials: "same-origin" }).then((r) => r.json()).then((d) => { member = !!(d && d.role); if (phase === "end") syncCTA(); }).catch(() => {});
  fetch("/api/applications/status").then((r) => r.json()).then((d) => { if (d && d.open === false) { closedMsg = d.message || "本轮招新已结束"; if (phase === "end") syncCTA(); } }).catch(() => {});

  // 面板上的字：第一次看完是“报名”；从网站的“协会介绍”进来是“协会介绍”。报名只给校内新生
  let fromSite = VIEW_MAP, draft = false;
  const pill = $("formPill");
  $("idx").innerHTML = OWNERS.slice(1).map((st) => `<button class="ix" type="button" data-k="${st.key}"><b>${st.tag}</b>${st.name}</button>`).join("");
  $("idx").addEventListener("click", (e) => {
    const b = e.target.closest(".ix"); if (!b) return;
    unlockAll(); sfx.ok(); openDetail(OWNER[b.dataset.k]);
  });
  /* ---------- 详细介绍：看完一遍之后，点任意一站先看文字，想看动画再点「播放动画」 ---------- */
  const detail = $("detail");
  let detailKey = null;
  const endCam = () => fitBoard(detailKey ? OWNER[detailKey] : T_TITLE);
  function markCur(st) { OWNERS.forEach((o) => $("b-" + o.key).classList.toggle("cur", !st || o === st)); }
  function openDetail(st) {
    if (phase !== "end") return;
    const first = detail.hidden, i = OWNERS.indexOf(st);
    detailKey = st.key;
    $("dNo").textContent = st.tag; $("dTitle").textContent = st.name;
    $("dBody").innerHTML = detailHTML(st.key); $("dBody").scrollTop = 0;
    $("dPrev").disabled = i <= 0; $("dNext").disabled = i >= OWNERS.length - 1;
    $("cta").hidden = true; detail.hidden = false;
    document.body.classList.add("detailing");
    markCur(st);
    layout();
    drag.touched = false;
    if (first) anim(detail.querySelector(".panel"), [{ offset: 0, opacity: 0, transform: "translate(5px, 5px)", boxShadow: "0 0 0 rgba(44,110,135,0)" }], { duration: 340, easing: OUT });
    else anim($("dBody"), [{ opacity: 0.2 }, { opacity: 1 }], { duration: 260, easing: OUT });
    soft(fly(fitBoard(st), 700)); soft(hopTo(perch(st), 600));
    sfx.lift();
    $("dPlay").focus({ preventScroll: true });
  }
  function closeDetail(back) {
    if (detail.hidden) return;
    detail.hidden = true; detailKey = null;
    document.body.classList.remove("detailing"); markCur(null);
    if (back) { $("cta").hidden = false; layout(); soft(fly(fitBoard(T_TITLE), 700)); soft(hopTo(perch(T_TITLE), 600)); sfx.pop(); $("toForm").hidden ? $("toLogin").focus({ preventScroll: true }) : $("toForm").focus({ preventScroll: true }); }
  }
  const stepDetail = (d) => { const i = OWNERS.findIndex((o) => o.key === detailKey) + d; if (i >= 0 && i < OWNERS.length) { sfx.ok(); openDetail(OWNERS[i]); } };
  $("dPrev").addEventListener("click", () => { unlockAll(); stepDetail(-1); });
  $("dNext").addEventListener("click", () => { unlockAll(); stepDetail(1); });
  $("dClose").addEventListener("click", () => { unlockAll(); closeDetail(true); });
  $("dPlay").addEventListener("click", () => {
    unlockAll(); sfx.ok();
    const st = OWNER[detailKey]; if (!st) return;
    closeDetail(false); hideCTA();
    jump(firstOf(st), { rewind: true, dur: 1000 });
  });
  function syncCTA() {
    const submitted = formStep === 3, closed = !!closedMsg && !submitted;
    $("ctaTitle").textContent = fromSite ? "协会介绍" : "如果你对这里感兴趣，就填写报名表";
    $("toForm").hidden = submitted || member || closed;
    $("toForm").textContent = draft ? "继续填写报名表" : "新生报名";
    $("toLogin").textContent = fromSite ? "回到平台" : "直接进入平台";
    $("ctaNote").textContent = submitted ? "报名表已提交，我们会尽快与你联系。" : member ? "点任意一站，先看文字介绍，再看动画。" : closed ? closedMsg : "仅限校内新生报名；老师、校外同学和已有账号的成员，请直接进入平台。";
  }
  function showCTA() {
    phase = "end"; syncBack(); syncCTA();
    if (!detail.hidden) { detail.hidden = true; detailKey = null; document.body.classList.remove("detailing"); markCur(null); }
    document.body.classList.add("endmode"); document.body.classList.remove("touring");
    hideDlg();
    const c = $("cta"); c.hidden = false;
    layout();
    drag.touched = false;
    soft(fly(fitBoard(T_TITLE), 700));
    [c.querySelector(".panel"), ...c.querySelectorAll(".btn")].forEach((e, i) => anim(e, [{ offset: 0, opacity: 0, transform: "translate(5px, 5px)", boxShadow: "0 0 0 rgba(44,110,135,0)" }], { duration: 380, delay: i * 90, easing: OUT }));
    $("skip").hidden = true;
    ($("toForm").hidden ? $("toLogin") : $("toForm")).focus({ preventScroll: true });
  }
  function hideCTA() {
    $("cta").hidden = true;
    document.body.classList.remove("endmode");
    $("skip").hidden = false;
    layout();
  }
  view.addEventListener("pointerdown", (e) => {
    if (phase !== "end") return;
    view.setPointerCapture(e.pointerId);
    drag.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stopMotion(); drag.touched = true;
    if (drag.pts.size === 1) { drag.start = { x: e.clientX, y: e.clientY }; drag.cam0 = { x: cam.x, y: cam.y }; drag.moved = false; drag.target = e.target; }
    if (drag.pts.size === 2) { const [a, b] = [...drag.pts.values()]; drag.d0 = Math.hypot(a.x - b.x, a.y - b.y); drag.s0 = cam.s; drag.moved = true; }
    drag.on = true;
  });
  view.addEventListener("pointermove", (e) => {
    if (!drag.pts.has(e.pointerId)) return;
    drag.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (drag.pts.size === 1) {
      const dx = e.clientX - drag.start.x, dy = e.clientY - drag.start.y;
      if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; document.body.classList.add("dragging"); }
      if (drag.moved) { cam.x = drag.cam0.x - dx / cam.s; cam.y = drag.cam0.y - dy / cam.s; clampCam(); }
    } else if (drag.pts.size === 2) {
      const [a, b] = [...drag.pts.values()];
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, drag.s0 * Math.hypot(a.x - b.x, a.y - b.y) / drag.d0);
    }
  });
  function endDrag(e) {
    if (!drag.pts.has(e.pointerId)) return;
    drag.pts.delete(e.pointerId);
    if (drag.pts.size === 1) { const [p] = drag.pts.values(); drag.start = { ...p }; drag.cam0 = { x: cam.x, y: cam.y }; return; }
    if (drag.pts.size) return;
    drag.on = false; document.body.classList.remove("dragging");
    if (!drag.moved && e.type === "pointerup") {
      // 点一块卡片：倒回那一站，从头再讲
      const bEl = drag.target && drag.target.closest && drag.target.closest(".board.solid");
      const st = bEl && OWNERS.find((s) => "b-" + s.key === bEl.id);
      if (st) { unlockAll(); sfx.ok(); openDetail(st); }
    }
  }
  view.addEventListener("pointerup", endDrag);
  view.addEventListener("pointercancel", endDrag);
  view.addEventListener("wheel", (e) => {
    if (phase !== "end") return;
    e.preventDefault(); stopMotion(); drag.touched = true;
    zoomAt(e.clientX, e.clientY, cam.s * Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });

  /* ================= 文字介绍浮层（竖窗口；横窗口的文字就在卡片右半边） ================= */
  const info = $("info");
  let infoOf = null;
  function curOwner() { return STEPS[Math.max(1, K)].owner; }
  function openInfo(st) {
    st = st || curOwner(); infoOf = st;
    $("infoNo").textContent = st.tag; $("infoT").textContent = st.name;
    $("infoB").innerHTML = detailHTML(st.key);
    info.hidden = false; info.scrollTop = 0; $("infoB").scrollTop = 0;
    anim(info, [{ offset: 0, opacity: 0, transform: "translateY(12px)" }], { duration: 300, easing: OUT });
    sfx.lift();
    $("infoX").focus({ preventScroll: true });
  }
  function closeInfo() { if (info.hidden) return; info.hidden = true; sfx.pop(); }
  $("infoBtn").addEventListener("click", () => { unlockAll(); info.hidden ? openInfo() : closeInfo(); });
  $("infoX").addEventListener("click", () => closeInfo());

  /* ================= 每帧 ================= */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    stepCam(now);
    stepGuide(now);
    applyCam();
    if (shakeA > 0) {
      const t = (now - shakeT) / 1000, a = shakeA * Math.max(0, 1 - t * 4);
      const s = a > 0.2 ? `translate(${Math.round((Math.random() - 0.5) * a)}px, ${Math.round((Math.random() - 0.5) * a)}px)` : "";
      view.style.transform = s; wall.style.transform = s;
      if (a <= 0.2) shakeA = 0;
    }
    stepLine(dt);
    stepFX(dt);
    stepBG(dt, now);
    const pillOn = draft && !closedMsg && !member && (phase === "tour" || phase === "end");
    if (pill.hidden === pillOn) pill.hidden = !pillOn;
    const ib = $("infoBtn"), ibOn = !wideB && (phase === "tour" || phase === "end") && K >= 1;
    if (ib.hidden === ibOn) ib.hidden = !ibOn;
    if (!info.hidden && (wideB || phase === "form" || phase === "home" || phase === "wall")) info.hidden = true;
    requestAnimationFrame(frame);
  }

  /* ================= 输入：点一下往前，右滑 / ← 往回 ================= */
  const tap = { on: false };
  window.addEventListener("pointerdown", (e) => {
    if (!info.hidden && !e.target.closest("#info, #infoBtn")) { closeInfo(); tap.on = false; return; }
    if (e.target.closest("button, .sheet, input, textarea, #info, .cta .panel")) return;
    unlockAll();
    if (phase === "end" || phase === "form" || phase === "home") return;
    if (knock) { doKnock(); return; }
    tap.on = true; tap.x = e.clientX; tap.y = e.clientY; tap.t = performance.now();
  });
  window.addEventListener("pointerup", (e) => {
    if (!tap.on) return;
    tap.on = false;
    const dx = e.clientX - tap.x, dy = e.clientY - tap.y;
    if (dx > 64 && Math.abs(dy) < dx * 0.7) { back(); return; }
    if (dx < -64 && Math.abs(dy) < -dx * 0.7) { next(); return; }
    if (Math.hypot(dx, dy) < 14) next();
  });
  window.addEventListener("pointercancel", () => { tap.on = false; });
  window.addEventListener("keydown", (e) => {
    const a = document.activeElement;
    const typing = a && /^(INPUT|TEXTAREA)$/.test(a.tagName);
    if (!info.hidden) { if (e.key === "Escape") { e.preventDefault(); closeInfo(); } return; } // 浮层开着：方向键留给它自己滚
    if (detailKey && phase === "end") {
      if (e.key === "Escape") { e.preventDefault(); closeDetail(true); }
      else if (e.key === "ArrowRight") { e.preventDefault(); stepDetail(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); stepDetail(-1); }
      return;
    }
    if (e.key === "Escape" && phase === "form") { e.preventDefault(); minForm(); return; }
    if (typing || phase === "form" || phase === "home") return;
    const onBtn = a && a.tagName === "BUTTON";
    if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key) || (!onBtn && ["Enter", " "].includes(e.key))) { e.preventDefault(); unlockAll(); next(); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); unlockAll(); back(); }
  });
  let wheelAcc = 0, wheelT = 0;
  window.addEventListener("wheel", (e) => {
    if (phase !== "tour" || !info.hidden || e.target.closest(".sheet, #info, .cta")) return;
    const now = performance.now();
    if (now - wheelT < 520) return;
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 70) { wheelT = now; const d = wheelAcc; wheelAcc = 0; if (d > 0) next(); else back(); }
  }, { passive: true });
  $("back").addEventListener("click", () => { unlockAll(); back(); });
  $("backEnd").addEventListener("click", () => { unlockAll(); back(); });
  $("skip").addEventListener("click", () => { unlockAll(); skip(); });
  $("mute").addEventListener("click", (e) => { sfx.muted = !sfx.muted; music.mute(sfx.muted); e.currentTarget.textContent = sfx.muted ? "打开声音" : "关闭声音"; });
  $("toForm").addEventListener("click", () => { unlockAll(); sfx.ok(); openForm(); });
  $("toLogin").addEventListener("click", (e) => { unlockAll(); sfx.ok(); leave(e.currentTarget); });
  $("again").addEventListener("click", () => { unlockAll(); restart(); });
  // 窗口在横竖之间切换：地图重排，卡片按当前这一步重新摆好，那句话整句显示
  let remoding = false, remodeAgain = false;
  async function remode() {
    if (remoding) { remodeAgain = true; return; }
    remoding = true;
    const live = phase === "tour" || phase === "end";
    try {
      setGrid();
      if (live) { gen++; killLine(); running = null; moving = true; } // 重排完之前不接受往前点
      stopMotion();
      const g = gen;
      renderWorld();
      layout();
      if (phase === "boot" || phase === "wall") {
        placeSpot();
        $("b-title").classList.add("ghost");
        Object.assign(cam, fitBoard(T_TITLE));
        const pp = perch(T_TITLE); G.x = pp.x; G.y = pp.y; placeGuide();
        G.el.style.opacity = wall.hidden || wall.classList.contains("broken") ? 1 : 0;
        return;
      }
      await applyBoards(K);
      setEnv(K);
      routeTo(progIdx(STEPS[K]), 0);
      const pp = perch(STEPS[K].owner); G.x = pp.x; G.y = pp.y; placeGuide();
      G.el.style.opacity = phase === "form" || phase === "home" || phase === "leaving" ? 0 : 1;
      guidePose(STEPS[K].o.pose || null);
      if (phase === "end") { if (drag.touched) clampCam(); else Object.assign(cam, endCam()); }
      else Object.assign(cam, camOf(K));
      applyCam();
      if (live && g === gen) moving = false;
      if (phase === "tour" && g === gen) { await say(STEPS[K].text, { instant: true, ready: K < LAST }); if (K === LAST) showCTA(); }
    } catch (e) { if (e !== ABORT) console.error(e); }
    finally {
      remoding = false;
      if (live && moving && phase !== "tour" && phase !== "end") moving = false;
      if (remodeAgain) { remodeAgain = false; if (isWide() !== wideB) soft(remode()); else layout(); }
    }
  }
  window.addEventListener("resize", () => {
    if (isWide() !== wideB) { soft(remode()); return; }
    layout();
    if (!cam.anim && phase !== "home") {
      if (phase === "wall" && !wall.hidden) Object.assign(cam, fitBoard(T_TITLE));
      else if (phase === "end") { if (drag.touched) clampCam(); else Object.assign(cam, endCam()); }
      else if (K >= 1) Object.assign(cam, camOf(K));
    }
    placeSpot();
  });

  /* ================= 报名表 ================= */
  const form = $("form"), sheet = $("sheet"), bubble = $("bubble");
  let fcl = null, bubT = 0, bubHold = 0; // bubHold：出错提示还没说完之前，输入框的反应台词不盖掉它
  const REACT = {
    "f-name": ["你好呀！叫什么名字？", "wave"],
    "f-class": ["哪个班的？", null],
    "f-sid": ["我不看，我不看！", "cover"],
    "f-phone": ["放心，只给老师和会长看。", "cover"],
    "f-qq": ["加个 QQ，方便拉你进群。", "wave"],
    "f-fresh": ["新同学，欢迎！", "up"],
    q1: ["为什么想来呢？", "up"],
    q2: ["会什么写什么，不会也没关系。", "point"],
    q3: ["慢慢想，不着急。", null],
    q4: ["你觉得计算机科学是什么？", "up"],
    q5: ["想要什么，尽管写！", "wave"],
  };
  function fpose(p) { if (!fcl) return; ["wave", "up", "point", "cover", "type"].forEach((c) => fcl.classList.toggle(c, c === p)); }
  function fbub(text, ms = 2600) {
    bubble.textContent = text; bubble.classList.add("on"); srLine.textContent = text;
    clearTimeout(bubT); bubT = setTimeout(() => bubble.classList.remove("on"), ms);
  }
  function fhop() { if (fcl) anim(fcl, [{ transform: "none" }, { transform: "translateY(-10px)" }, { transform: "none" }], { duration: 300, easing: OUT }); sfx.hop(); }
  function setStep(n) {
    $("step1").hidden = n !== 1; $("step2").hidden = n !== 2; $("step3").hidden = n !== 3;
    $("shTitle").textContent = ["", "基本信息", "聊几个问题", "提交完成"][n];
    $("shNo").textContent = n + "/3";
    sheet.querySelectorAll(".steps i").forEach((e, i) => e.classList.toggle("on", i < n));
    form.scrollTop = 0;
    [...$("step" + n).children].forEach((e, i) => anim(e, [{ offset: 0, opacity: 0, transform: "translateY(8px)" }], { duration: 300, delay: i * 50, easing: OUT }));
  }
  let formStep = 1, formFrom = -1;
  // 报名表收起或擦掉以后：从旅程中间打开的，回到那一句；从结尾打开的，回到结尾
  function afterForm() {
    if (formFrom >= 1 && formFrom < LAST) { const k = formFrom; formFrom = -1; jump(k); }
    else showCTA();
  }
  // 小螃蟹沿着纸边走一遍：show=true 是一行一行画出来，false 是一行一行擦掉
  function sweepSheet(show) {
    const r = sheet.getBoundingClientRect();
    const rider = document.createElement("div");
    rider.style.cssText = "position:fixed;left:0;top:0;z-index:24;pointer-events:none";
    rider.innerHTML = clawd(3, show ? "beret" : "eraser", show ? "paint" : "erase");
    document.body.appendChild(rider);
    const dur = reduce ? 1 : 1000, t0 = performance.now();
    let lastErase = 0;
    return new Promise((res) => {
      (function f(now) {
        const t = clamp((now - t0) / dur), p = Math.round(t * 14) / 14;
        const edge = p * 100;
        sheet.style.clipPath = show ? `inset(0 0 ${100 - edge}% 0)` : `inset(${edge}% 0 0 0)`;
        const y = r.top + r.height * p, x = r.left + r.width * (0.5 + 0.42 * Math.sin(t * Math.PI * 5)) - 27;
        rider.style.transform = `translate(${Math.round(x)}px, ${Math.round(y - 30)}px)`;
        if (now - lastErase > 70 && t < 1) {
          lastErase = now;
          if (show) sfx.draw(); else sfx.erase();
          burst(x + 27, y, 5, { colors: show ? [C.aqua, C.hana, "#FFFFFF"] : ["#F4A6B4", "#FFFFFF", C.pale2], speed: 1.8, g: 0.25, size: 3, life: 0.6 });
        }
        if (t < 1) requestAnimationFrame(f); else res(rider);
      })(t0);
    });
  }
  async function openForm() {
    if (phase === "form") return;
    formFrom = phase === "tour" ? K : -1;
    if (phase === "tour") { gen++; killLine(); stopMotion(); moving = false; hideDlg(); }
    phase = "form";
    sheet.dataset.busy = "1";
    music.set("form");
    document.body.classList.add("inform"); document.body.classList.remove("endmode");
    $("cta").hidden = true;
    $("scrim").classList.add("on");
    sheet.hidden = false;
    if (!fcl) { sheet.insertAdjacentHTML("afterbegin", clawd(3, null, "fclawd")); fcl = sheet.querySelector(".fclawd"); }
    fcl.style.opacity = 0; bubble.classList.remove("on");
    G.el.style.opacity = 0;
    setStep(formStep);
    const rider = await sweepSheet(true);
    sheet.style.clipPath = "";
    const fr = fcl.getBoundingClientRect();
    await rider.animate([{ transform: `translate(${fr.left}px, ${fr.top}px)` }], { duration: reduce ? 1 : 380, easing: OUT, fill: "forwards" }).finished;
    rider.remove(); fcl.style.opacity = 1; fhop();
    delete sheet.dataset.busy;
    if (sheet.dataset.wantClose) { delete sheet.dataset.wantClose; closeForm(); return; }
    fbub(formStep === 1 ? "先填几项基本信息吧！" : "接着写就好。", 3000);
    const f = formStep === 1 ? $("f-name") : formStep === 2 ? $("q1") : $("enter");
    f.focus({ preventScroll: true });
  }
  async function closeForm() {
    if (phase !== "form") return;
    if (sheet.dataset.busy) { sheet.dataset.wantClose = "1"; return; } // 还在画，画完马上擦
    sheet.dataset.busy = "1";
    bubble.classList.remove("on");
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    fcl.style.opacity = 0;
    const rider = await sweepSheet(false);
    sheet.hidden = true; sheet.style.clipPath = ""; delete sheet.dataset.busy;
    $("scrim").classList.remove("on");
    document.body.classList.remove("inform");
    // 擦完，小螃蟹跳回地图上的位置
    const gp = toScreen(G.x, G.y);
    await rider.animate([{ transform: `translate(${gp.x}px, ${gp.y - 20}px)`, offset: 0.6 }, { transform: `translate(${gp.x}px, ${gp.y}px)` }], { duration: reduce ? 1 : 520, easing: OUT, fill: "forwards" }).finished;
    rider.remove(); G.el.style.opacity = 1;
    music.set("dawn");
    afterForm();
  }
  // 收起：报名表缩成左上角的小条，填过的字都留着；可以去翻前面的每一站，点小条接着填
  async function minForm() {
    if (phase !== "form" || sheet.dataset.busy) return;
    sheet.dataset.busy = "1";
    draft = formStep < 3;
    if (draft) saveDraft();
    bubble.classList.remove("on");
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    const r = sheet.getBoundingClientRect();
    pill.hidden = false;
    const pr = pill.getBoundingClientRect();
    pill.hidden = true;
    const box = document.createElement("div");
    box.style.cssText = `position:fixed;z-index:40;left:0;top:0;width:${r.width}px;height:${r.height}px;transform:translate(${r.left}px,${r.top}px);background:#fff;border:3px solid ${C.line};box-shadow:6px 6px 0 ${C.line};box-sizing:border-box;pointer-events:none`;
    document.body.appendChild(box);
    sheet.hidden = true;
    $("scrim").classList.remove("on");
    document.body.classList.remove("inform");
    sfx.whoosh();
    await box.animate([{}, { transform: `translate(${pr.left}px,${pr.top}px)`, width: pr.width + "px", height: pr.height + "px" }], { duration: reduce ? 1 : 420, easing: INOUT, fill: "forwards" }).finished;
    box.remove();
    delete sheet.dataset.busy;
    G.el.style.opacity = 1;
    music.set("dawn");
    afterForm();
    if (draft) anim(pill, [{ transform: "scale(1.15)" }, { transform: "none" }], { duration: 300, easing: OUT });
  }
  $("closeForm").addEventListener("click", () => { draft = false; clearDraft(); closeForm(); });
  $("minForm").addEventListener("click", () => minForm());
  pill.addEventListener("click", () => { unlockAll(); sfx.ok(); if (phase === "end") hideCTA(); openForm(); });
  form.addEventListener("focusin", (e) => {
    const r = REACT[e.target.id]; if (!r) return;
    if (performance.now() < bubHold) { fpose(r[1]); return; }
    fbub(r[0]); fpose(r[1]); fhop();
  });
  form.addEventListener("focusout", () => fpose(null));
  form.addEventListener("input", (e) => {
    const t = e.target, v = t.value || "";
    const r = REACT[t.id];
    if (r && r[1] !== "cover") { fpose("type"); clearTimeout(t._tt); t._tt = setTimeout(() => fpose(r[1]), 400); }
    if (t.tagName === "TEXTAREA" && v.length === 60) { fbub("写得真认真！"); fhop(); sfx.chime(); }
    const f = t.closest(".field");
    if (f) { f.classList.remove("bad"); const er = f.querySelector(".err"); if (er) er.textContent = ""; }
  });
  function bad(id, msg) { const f = $(id).closest(".field"); f.classList.add("bad"); f.querySelector(".err").textContent = msg; return false; }
  function check1() {
    let ok = true;
    const v = (id) => $(id).value.trim();
    if (!v("f-name")) ok = bad("f-name", "名字还没填");
    if (!v("f-class")) ok = bad("f-class", "班级还没填");
    if (!/^\d{6,15}$/.test(v("f-sid"))) ok = bad("f-sid", "学号是 6 到 15 位数字");
    if (!/^1\d{10}$/.test(v("f-phone"))) ok = bad("f-phone", "手机号是 1 开头的 11 位数字");
    if (!/^\d{5,11}$/.test(v("f-qq"))) ok = bad("f-qq", "QQ 号是 5 到 11 位数字");
    if (!$("f-fresh").checked) ok = bad("f-fresh", "报名表只给校内新生填写");
    return ok;
  }
  function shakeSheet() { anim(sheet, [{ translate: "0 0" }, { translate: "-6px 0" }, { translate: "6px 0" }, { translate: "0 0" }], { duration: 260, easing: "steps(4)" }); }
  $("next1").addEventListener("click", () => {
    if (!check1()) { shakeSheet(); fbub("还有几项没填好哦。"); sfx.nope(); const f = form.querySelector(".field.bad input"); if (f) f.focus(); return; }
    sfx.ok(); formStep = 2; setStep(2); fhop(); fbub("好！再聊几个问题。");
    setTimeout(() => $("q1").focus({ preventScroll: true }), 80);
  });
  $("back2").addEventListener("click", () => { sfx.lift(); formStep = 1; setStep(1); });
  /* ---------- 交到网站：POST /api/applications，服务器再查一遍；成功了才算收到 ---------- */
  const FIELDS = ["f-name", "f-class", "f-sid", "f-phone", "f-qq", "q1", "q2", "q3", "q4", "q5"];
  const DRAFT_KEY = "hiana.intro.draft";
  const store = (fn) => { try { return fn(localStorage); } catch (e) { return null; } }; // 隐私模式下 localStorage 会报错
  function saveDraft() {
    const d = { step: formStep, fresh: $("f-fresh").checked };
    FIELDS.forEach((id) => (d[id] = $(id).value));
    store((ls) => ls.setItem(DRAFT_KEY, JSON.stringify(d)));
  }
  const clearDraft = () => store((ls) => ls.removeItem(DRAFT_KEY));
  // 刷新以后：上次收起的草稿填回去，右下角的小胶囊接着填
  (() => {
    const raw = store((ls) => ls.getItem(DRAFT_KEY));
    if (!raw) return;
    let d; try { d = JSON.parse(raw); } catch (e) { clearDraft(); return; }
    if (!d || typeof d !== "object") return;
    FIELDS.forEach((id) => { if (typeof d[id] === "string") $(id).value = d[id]; });
    $("f-fresh").checked = d.fresh === true;
    formStep = d.step === 2 ? 2 : 1;
    draft = true;
  })();
  // 填到一半关掉或刷新页面：也先存一份
  window.addEventListener("pagehide", () => { if (draft || (phase === "form" && formStep < 3)) saveDraft(); });
  let sending = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if ($("step2").hidden || sending) return;
    if (!$("q1").value.trim()) { bad("q1", "说说为什么想来吧，一句话也行"); shakeSheet(); fbub("第一题写一句就好。"); sfx.nope(); $("q1").focus(); return; }
    const v = (id) => $(id).value.trim();
    const body = { name: v("f-name"), className: v("f-class"), studentId: v("f-sid"), phone: v("f-phone"), qq: v("f-qq"), fresh: $("f-fresh").checked, q1: v("q1"), q2: v("q2"), q3: v("q3"), q4: v("q4"), q5: v("q5"), website: $("f-website").value };
    const btn = $("submit");
    sending = true; btn.disabled = true; btn.textContent = "提交中…";
    let res = null, data = {};
    try {
      res = await fetch("/api/applications", { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) });
      data = await res.json().catch(() => ({}));
    } catch (err) { res = null; }
    sending = false; btn.disabled = false; btn.textContent = "提交";
    if (!res || !res.ok) {
      // 留在第 2 步，填过的字都在；小螃蟹说出哪里不对
      const msg = !res ? "网络好像断了，稍后再试试" : (data && data.error) || "服务器出了点问题，稍后再试试";
      if (res && res.status === 403) { closedMsg = msg; syncCTA(); }
      shakeSheet(); fbub(msg, 5200); sfx.nope(); bubHold = performance.now() + 5200;
      return;
    }
    clearDraft();
    $("dupNote").hidden = !(data && data.updated);
    formStep = 3; draft = false; setStep(3); fpose("up"); fhop(); fbub("谢谢你！", 3000); sfx.fanfare();
    const r = sheet.getBoundingClientRect();
    for (let i = 0; i < 5; i++) setTimeout(() => burst(r.left + Math.random() * r.width, r.top, 14, { kind: "conf", colors: [C.line, C.aqua, C.hana, C.hl, C.clay], speed: 3, g: 0.08, life: 2.4, size: 5, angle: -Math.PI / 2, spread: Math.PI * 0.9 }), i * 120);
    $("enter").focus({ preventScroll: true });
  });
  $("enter").addEventListener("click", () => leave(sheet));

  /* ================= 进入平台：地图退下去，按钮（或报名表）铺满整屏，再跳到网站 ================= */
  async function leave(srcEl) {
    if (phase === "home") return;
    phase = "home"; music.set("form");
    gen++; killLine(); stopMotion();
    bubble.classList.remove("on");
    const from = srcEl.getBoundingClientRect();
    const box = document.createElement("div");
    box.style.cssText = `position:fixed;z-index:40;left:0;top:0;width:${from.width}px;height:${from.height}px;transform:translate(${from.left}px,${from.top}px);background:#fff;border:3px solid ${C.line};box-shadow:6px 6px 0 ${C.line};box-sizing:border-box;pointer-events:none`;
    document.body.appendChild(box);
    sheet.hidden = true; $("scrim").classList.remove("on"); $("cta").hidden = true; detail.hidden = true; pill.hidden = true; hideDlg();
    document.body.classList.add("athome"); document.body.classList.remove("endmode", "inform", "touring", "detailing");
    view.animate([{ transform: "none", opacity: 1 }, { transform: "scale(.94)", opacity: 0 }], { duration: 640, easing: INOUT, fill: "forwards" });
    $("waves").style.transform = "translateY(110%)";
    G.el.style.opacity = 0;
    try {
      await box.animate([
        { transform: `translate(${from.left}px,${from.top}px)`, width: from.width + "px", height: from.height + "px", borderColor: C.line, borderWidth: "3px", boxShadow: `6px 6px 0 ${C.line}` },
        { transform: "translate(0px,0px)", width: innerWidth + "px", height: innerHeight + "px", borderColor: "#fff", borderWidth: "0px", boxShadow: "0 0 0 rgba(44,110,135,0)" },
      ], { duration: reduce ? 1 : 640, easing: INOUT, fill: "forwards" }).finished;
    } catch (e) {}
    location.href = BACK_TO;
  }
  // 从网站按“返回”回到这一页：浏览器可能直接拿出跳走前的样子（整屏白），换成地图
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && phase === "home") location.replace("/intro/?view=map" + (BACK_TO !== "/" ? "&from=" + encodeURIComponent(BACK_TO) : ""));
  });

  /* ================= 启动 ================= */
  const fontReady = Promise.race([document.fonts ? Promise.all([document.fonts.load('12px "HianaPixel"', "海纳协会"), document.fonts.load('13px "HianaMono"', "fn main")]) : Promise.resolve(), sleep(2500)]).catch(() => {});
  setGrid();
  renderWorld();
  layout();
  requestAnimationFrame(frame);
  fontReady.then(() => {
    if (phase !== "boot") return;
    if (VIEW_MAP) skip(); // 看过一遍之后的样子：墙拆掉、卡片搭好，停在结尾的地图
    else soft(wallScene(false));
  });
})();
