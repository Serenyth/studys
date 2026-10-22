/* ============================================================
   PacketFlow · core.js
   命名空间 / 图标系统 / DOM 助手 / 动画工具 / 组件构建器
   ============================================================ */
(function (w) {
  "use strict";

  var PF = w.PF = {};
  PF.stages = [];
  PF.VIZ = {};

  /* ---------------- 基础助手 ---------------- */
  PF.esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };
  PF.$ = function (sel, root) { return (root || document).querySelector(sel); };
  PF.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  /* 只在内容真正变化时写入 innerHTML。
     动画循环里每帧重写 DOM 会不断重启子元素的入场动画（导致元素停在 opacity:0）、
     让文本无法选中、并造成每帧样式重算。 */
  PF.dom = function (node, html) {
    if (!node || node._pfHtml === html) return;
    node._pfHtml = html;
    node.innerHTML = html;
  };
  PF.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  PF.lerp = function (a, b, t) { return a + (b - a) * t; };
  PF.pad = function (n, len) { n = String(n); while (n.length < (len || 2)) n = "0" + n; return n; };

  /* 富文本：**粗体** `代码` [[术语::解释]] ++高亮++ */
  PF.rich = function (s) {
    if (!s) return "";
    var t = PF.esc(s);
    return PF.md(t);
  };

  /* 同 PF.rich，但不做 HTML 转义 —— 用于「已经包含标签」的片段 */
  PF.md = function (s) {
    if (!s) return "";
    return String(s)
      .replace(/\[\[([^\]|:：]+)[:：]{2}([^\]]+)\]\]/g, function (m, a, b) {
        return '<span class="term" data-def="' + PF.esc(b) + '">' + a + "</span>";
      })
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\+\+([^+]+)\+\+/g, '<span class="hl">$1</span>');
  };

  /* ---------------- 主题色（供 Canvas / SVG 使用） ----------------
     Canvas 里无法用 CSS 变量，必须读到实际色值。主题切换时自动失效重读。 */
  var _tc = { mode: null, v: {} };
  var _toneCache = {};
  PF.T = function (k, fb) {
    var mode = document.documentElement.getAttribute("data-theme") || "dark";
    if (_tc.mode !== mode) {
      var cs = getComputedStyle(document.documentElement);
      var g = function (n, d) { return (cs.getPropertyValue(n) || "").trim() || d; };
      _tc.mode = mode;
      _toneCache = {};
      _tc.v = {
        ink: g("--ink", "#e9eff9"), ink2: g("--ink-2", "#b9c5d8"),
        muted: g("--muted", "#7f8da3"), dim: g("--dim", "#5b6879"),
        line: g("--line-2", "rgba(120,150,190,.26)"),
        grid: g("--line", "rgba(120,150,190,.14)"),
        panel: g("--panel-2", "#151d2a"),
        cyan: g("--c-cyan", "#35e5d4"), blue: g("--c-blue", "#4d8dff"),
        violet: g("--c-violet", "#9b8cff"), amber: g("--c-amber", "#ffb454"),
        green: g("--c-green", "#57e08a"), red: g("--c-red", "#ff6b6b"),
        pink: g("--c-pink", "#ff6aa2"), teal: g("--c-teal", "#2dd4bf")
      };
    }
    return _tc.v[k] || fb;
  };
  /* 深色系强调色 → 当前主题的同义色 */
  var CMAP = {
    "#35e5d4": "cyan", "#4d8dff": "blue", "#9b8cff": "violet", "#ffb454": "amber",
    "#57e08a": "green", "#ff6b6b": "red", "#ff6aa2": "pink", "#2dd4bf": "teal"
  };
  PF.C = function (h) {
    var k = CMAP[String(h).toLowerCase()];
    return k ? PF.T(k, h) : h;
  };
  /* 给颜色加透明度（支持 #rgb / #rrggbb / rgb() / rgba()） */
  PF.alpha = function (c, a) {
    c = String(c || "#888").trim();
    if (a == null || a >= 1) return c;
    if (c.charAt(0) === "#") {
      if (c.length === 4) c = "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
      var n = parseInt(c.slice(1), 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
    var m = /^rgba?\(([^)]+)\)$/.exec(c);
    if (m) {
      var p = m[1].split(",");
      return "rgba(" + p[0].trim() + "," + p[1].trim() + "," + p[2].trim() + "," + a + ")";
    }
    return c;
  };
  /* 主题色 + 透明度（结果缓存，避免逐帧拼字符串） */
  PF.tone = function (k, a) {
    var key = k + "|" + (a == null ? 1 : a);
    if (_toneCache[key] === undefined) _toneCache[key] = PF.alpha(PF.T(k), a);
    return _toneCache[key];
  };
  PF.hexA = PF.alpha;

  /* ---------------- 图标系统 ---------------- */
  var P = {
    layers: '<path d="M12 3 3 7.8l9 4.8 9-4.8L12 3Z"/><path d="M3 12.4l9 4.8 9-4.8"/><path d="M3 16.9l9 4.8 9-4.8"/>',
    signal: '<path d="M4 20v-6M9 20V9.5M14 20V4.5M19 20v-9"/>',
    route: '<circle cx="6" cy="18.5" r="2.2"/><circle cx="18" cy="5.5" r="2.2"/><path d="M8.2 18.5h5.3a3.5 3.5 0 0 0 0-7h-3a3.5 3.5 0 0 1 0-7h5.3"/>',
    plug: '<path d="M9 3v5.5M15 3v5.5M6.5 8.5h11v3.2a5.5 5.5 0 0 1-11 0V8.5ZM12 17.2V21"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15.5 15.5 0 0 1 0 18 15.5 15.5 0 0 1 0-18Z"/>',
    shield: '<path d="M12 3 5 5.8v5.4c0 4.6 3 8.2 7 9.8 4-1.6 7-5.2 7-9.8V5.8L12 3Z"/>',
    "shield-check": '<path d="M12 3 5 5.8v5.4c0 4.6 3 8.2 7 9.8 4-1.6 7-5.2 7-9.8V5.8L12 3Z"/><path d="m8.8 11.8 2.2 2.2 4.2-4.4"/>',
    network: '<rect x="9" y="2.8" width="6" height="5" rx="1.4"/><rect x="2.5" y="16.2" width="6" height="5" rx="1.4"/><rect x="15.5" y="16.2" width="6" height="5" rx="1.4"/><path d="M12 7.8v4.4M5.5 16.2v-2.1h13v2.1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-3.9-3.9"/>',
    moon: '<path d="M20.5 14.6A8.4 8.4 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z"/>',
    sun: '<circle cx="12" cy="12" r="4.3"/><path d="M12 2.2v2.2M12 19.6v2.2M2.2 12h2.2M19.6 12h2.2M5 5l1.6 1.6M17.4 17.4 19 19M19 5l-1.6 1.6M6.6 17.4 5 19"/>',
    refresh: '<path d="M20.4 12a8.4 8.4 0 1 1-2.5-6"/><path d="M20.4 4.2v5.4H15"/>',
    "arrow-up": '<path d="M12 19.5V5M5.8 11.2 12 5l6.2 6.2"/>',
    "arrow-right": '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
    "arrow-left": '<path d="M19.5 12h-15M10.5 6l-6 6 6 6"/>',
    "arrow-down": '<path d="M12 4.5V19M5.8 12.8 12 19l6.2-6.2"/>',
    "chevron-right": '<path d="m9 5 7 7-7 7"/>',
    "chevron-down": '<path d="m5 9 7 7 7-7"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    alert: '<path d="M12 3.2 2.4 20h19.2L12 3.2Z"/><path d="M12 9.4v4.6M12 17.2v.6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.2M12 7.6v.6"/>',
    bulb: '<path d="M9.2 18.2h5.6M10.2 21h3.6M12 3a6 6 0 0 1 3.6 10.8v2.4H8.4v-2.4A6 6 0 0 1 12 3Z"/>',
    book: '<path d="M4 5.2A2.2 2.2 0 0 1 6.2 3H20v15.4H6.2A2.2 2.2 0 0 0 4 20.6V5.2Z"/><path d="M4 20.6A2.2 2.2 0 0 1 6.2 18.4H20"/>',
    zap: '<path d="M13.4 2.5 4 14h6.8l-1.2 7.5L19 10h-6.8l1.2-7.5Z"/>',
    play: '<path d="M7.5 4.8 19 12 7.5 19.2V4.8Z"/>',
    pause: '<path d="M8.5 5v14M15.5 5v14"/>',
    reset: '<path d="M3.4 12a8.6 8.6 0 1 0 2.9-6.4"/><path d="M3.4 4.4v5.2h5.2"/>',
    cpu: '<rect x="6.5" y="6.5" width="11" height="11" rx="2.2"/><rect x="9.8" y="9.8" width="4.4" height="4.4" rx="1"/><path d="M9.5 2.6v3M14.5 2.6v3M9.5 18.4v3M14.5 18.4v3M2.6 9.5h3M2.6 14.5h3M18.4 9.5h3M18.4 14.5h3"/>',
    server: '<rect x="3" y="3.8" width="18" height="7" rx="2.2"/><rect x="3" y="13.2" width="18" height="7" rx="2.2"/><path d="M7 7.3h.02M7 16.7h.02"/>',
    wifi: '<path d="M2.6 9.2a14.5 14.5 0 0 1 18.8 0M5.6 12.6a10 10 0 0 1 12.8 0M8.6 16a5.2 5.2 0 0 1 6.8 0"/><path d="M12 19.4h.02"/>',
    lock: '<rect x="4.6" y="10.2" width="14.8" height="10.6" rx="2.6"/><path d="M8.2 10.2V7.4a3.8 3.8 0 0 1 7.6 0v2.8"/>',
    unlock: '<rect x="4.6" y="10.2" width="14.8" height="10.6" rx="2.6"/><path d="M8.2 10.2V7.4a3.8 3.8 0 0 1 7.3-1.2"/>',
    key: '<circle cx="8" cy="15" r="4.2"/><path d="m11 12 8.4-8.4M16.4 3.6 19.8 7M14.4 5.6l3.4 3.4"/>',
    hash: '<path d="M5 9.2h14M5 14.8h14M10.2 3.8 8 20.2M16 3.8l-2.2 16.4"/>',
    eye: '<path d="M2.2 12S6 5.4 12 5.4 21.8 12 21.8 12 18 18.6 12 18.6 2.2 12 2.2 12Z"/><circle cx="12" cy="12" r="3"/>',
    database: '<ellipse cx="12" cy="6" rx="8" ry="3.1"/><path d="M4 6v12c0 1.7 3.6 3.1 8 3.1s8-1.4 8-3.1V6M4 12c0 1.7 3.6 3.1 8 3.1s8-1.4 8-3.1"/>',
    "git-branch": '<circle cx="6.5" cy="6" r="2.6"/><circle cx="6.5" cy="18" r="2.6"/><circle cx="17.5" cy="9" r="2.6"/><path d="M6.5 8.6v6.8M9.1 6h5.8a2.6 2.6 0 0 1 2.6 2.6v0"/>',
    box: '<path d="M12 3 3 7.6v8.8L12 21l9-4.6V7.6L12 3Z"/><path d="M3 7.6 12 12l9-4.4M12 12v9"/>',
    cloud: '<path d="M7.4 18.4a4.4 4.4 0 0 1-.5-8.7 5.8 5.8 0 0 1 11.1 1.5 3.7 3.7 0 0 1-.4 7.2H7.4Z"/>',
    terminal: '<rect x="3" y="4.2" width="18" height="15.6" rx="2.4"/><path d="m7.2 9.4 3.2 3.2-3.2 3.2M13 15.8h4"/>',
    activity: '<path d="M3 12.4h3.8L9.6 4.8l4.4 14.4 2.4-6.8H21"/>',
    target: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.1"/>',
    users: '<circle cx="9.4" cy="8" r="3.6"/><path d="M2.6 20a6.8 6.8 0 0 1 13.6 0M16.4 5.2a3.6 3.6 0 0 1 0 6.9M17.4 20a6.8 6.8 0 0 0-2.1-4.9"/>',
    filter: '<path d="M3 5h18l-7.2 8.2v5.9l-3.6 1.9v-7.8L3 5Z"/>',
    shuffle: '<path d="M16.8 3.2h4.4v4.4M21.2 3.2 15 9.4M3 20.8l6.2-6.2M16.8 20.8h4.4v-4.4M3 3.2l5.6 5.6"/>',
    clock: '<circle cx="12" cy="12" r="8.8"/><path d="M12 7v5.2l3.6 2.1"/>',
    code: '<path d="m8 8-4.6 4L8 16M16 8l4.6 4L16 16M13.6 4.8l-3.2 14.4"/>',
    list: '<path d="M8.5 6h12M8.5 12h12M8.5 18h12M3.8 6h.02M3.8 12h.02M3.8 18h.02"/>',
    grid: '<rect x="3" y="3" width="7.4" height="7.4" rx="1.8"/><rect x="13.6" y="3" width="7.4" height="7.4" rx="1.8"/><rect x="3" y="13.6" width="7.4" height="7.4" rx="1.8"/><rect x="13.6" y="13.6" width="7.4" height="7.4" rx="1.8"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.4"/><path d="m3.8 7 8.2 5.8L20.2 7"/>',
    monitor: '<rect x="2.6" y="4" width="18.8" height="12.6" rx="2.2"/><path d="M9 20.6h6M12 16.6v4"/>',
    link: '<path d="M10 13.4a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1L11.4 4.9"/><path d="M14 10.6a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.6-1.6"/>',
    bug: '<rect x="7.2" y="8" width="9.6" height="12" rx="4.8"/><path d="M12 8V5.2M9.2 5.4 7.6 3.2M14.8 5.4l1.6-2.2M7.2 12H3.2M20.8 12h-4M7.6 16.4l-3 2M16.4 16.4l3 2"/>',
    award: '<circle cx="12" cy="9" r="5.6"/><path d="m8.6 13.6-1.4 7.2L12 18.6l4.8 2.2-1.4-7.2"/>',
    exchange: '<path d="M6.6 4 3.4 7.2 6.6 10.4M3.4 7.2h11.2a4 4 0 0 1 0 8h-1.2"/><path d="M17.4 20l3.2-3.2-3.2-3.2M20.6 16.8H9.4a4 4 0 0 1 0-8h1.2"/>',
    copy: '<rect x="8.4" y="8.4" width="12" height="12" rx="2.2"/><path d="M15.6 8.4V5.8a2.2 2.2 0 0 0-2.2-2.2H5.8A2.2 2.2 0 0 0 3.6 5.8v7.6a2.2 2.2 0 0 0 2.2 2.2h2.6"/>',
    expand: '<path d="M9 3.6H3.6V9M15 3.6h5.4V9M9 20.4H3.6V15M15 20.4h5.4V15"/>',
    layers3: '<path d="M12 3 3 7.6l9 4.6 9-4.6L12 3Z"/><path d="m3 12.2 9 4.6 9-4.6"/>',
    flow: '<circle cx="5.5" cy="6" r="2.4"/><circle cx="18.5" cy="12" r="2.4"/><circle cx="5.5" cy="18" r="2.4"/><path d="M7.9 6h5.6a2.4 2.4 0 0 1 2.4 2.4v1.2M7.9 18h5.6a2.4 2.4 0 0 0 2.4-2.4v-1.2"/>',
    bookmark: '<path d="M6.4 3.6h11.2v17L12 16.6l-5.6 4V3.6Z"/>',
    sparkle: '<path d="M12 3.2 13.8 9l5.8 1.8-5.8 1.8L12 18.4l-1.8-5.8L4.4 10.8 10.2 9 12 3.2Z"/>',
    warning: '<path d="M12 3.2 2.4 20h19.2L12 3.2Z"/><path d="M12 9.4v4.6M12 17.2v.6"/>',
    scale: '<path d="M12 3.6v16.8M7 20.4h10M4.6 7.2 12 4.6l7.4 2.6M4.6 7.2 2 13.4h5.2L4.6 7.2ZM19.4 7.2l-2.6 6.2H22l-2.6-6.2Z"/>',
    scissors: '<circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M8.2 7.6 20 18M20 6 8.2 16.4"/>',
    radio: '<circle cx="12" cy="12" r="2.2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>'
  };

  PF.icon = function (name, cls) {
    var d = P[name] || P.info;
    return '<svg class="ic ' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  };
  PF.hydrateIcons = function (root) {
    PF.$$("[data-icon]", root || document).forEach(function (n) {
      if (n.dataset.iconDone) return;
      n.dataset.iconDone = "1";
      n.insertAdjacentHTML("afterbegin", PF.icon(n.dataset.icon));
    });
  };

  /* 品牌标识 */
  PF.brandMark = function () {
    return '<svg viewBox="0 0 40 40" fill="none">' +
      '<defs><linearGradient id="pfg" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#35e5d4"/><stop offset="1" stop-color="#9b8cff"/></linearGradient></defs>' +
      '<path d="M20 3.4 34 11.6v16.8L20 36.6 6 28.4V11.6L20 3.4Z" stroke="url(#pfg)" stroke-width="1.7" opacity=".85"/>' +
      '<path d="M13 24.4V15.6l7 4.2 7-4.2v8.8" stroke="url(#pfg)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="13" cy="15.6" r="2.1" fill="#35e5d4"/><circle cx="27" cy="15.6" r="2.1" fill="#9b8cff"/>' +
      '<circle cx="20" cy="19.8" r="2.1" fill="#35e5d4"/>' +
      "</svg>";
  };

  /* ---------------- 动画工具 ---------------- */
  PF.ease = {
    linear: function (t) { return t; },
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOutCubic: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    outQuint: function (t) { return 1 - Math.pow(1 - t, 5); },
    outBack: function (t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    outElastic: function (t) {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1;
    }
  };

  /* Canvas 场景管理器：自动 DPR / 尺寸 / 可见性暂停 */
  PF._scenes = [];
  PF.cleanup = function () {
    PF._scenes.forEach(function (s) { try { s.destroy(); } catch (e) { } });
    PF._scenes = [];
  };
  PF.Scene = function (canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d");
    var S = { canvas: canvas, ctx: ctx, W: 0, H: 0, t: 0, running: false, visible: true };
    var raf = 0, last = 0;

    S.resize = function () {
      var rect = canvas.getBoundingClientRect();
      var w = Math.max(1, Math.round(rect.width));
      var h = Math.max(1, Math.round(opts.height || rect.height || 260));
      var dpr = Math.min(w.devicePixelRatio || w.devicePixelRatio || 1, 2);
      dpr = Math.min(w ? (window.devicePixelRatio || 1) : 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      S.W = w; S.H = h;
      if (opts.onResize) opts.onResize(S);
    };
    S.frame = function (now) {
      if (!S.running) return;
      var dt = Math.min(50, now - (last || now));
      last = now; S.t += dt;
      if (opts.draw) opts.draw(S, S.t, dt);
      raf = requestAnimationFrame(S.frame);
    };
    S.start = function () { if (S.running || !S.visible) return; S.running = true; last = 0; raf = requestAnimationFrame(S.frame); };
    S.stop = function () { S.running = false; cancelAnimationFrame(raf); };
    S.render = function () { if (opts.draw) opts.draw(S, S.t, 0); };
    S.resize();
    if (opts.draw) S.render();
    if (opts.autoStart !== false) S.start();

    var ro = new ResizeObserver(function () { S.resize(); if (!S.running) S.render(); });
    ro.observe(canvas);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        S.visible = e.isIntersecting;
        if (S.visible && opts.autoStart !== false) S.start(); else S.stop();
      });
    }, { rootMargin: "120px" });
    io.observe(canvas);

    S.destroy = function () { S.stop(); ro.disconnect(); io.disconnect(); };
    PF._scenes.push(S);
    return S;
  };

  /* 值过渡（用于数值动画） */
  PF.Anim = function (opts) {
    var from = opts.from, to = opts.to, dur = opts.dur || 600,
      ease = opts.ease || PF.ease.outCubic, on = opts.on, done = opts.done;
    var raf = 0, t0 = 0, alive = true;
    function step(now) {
      if (!alive) return;
      if (!t0) t0 = now;
      var t = PF.clamp((now - t0) / dur, 0, 1);
      on(from + (to - from) * ease(t), t);
      if (t < 1) raf = requestAnimationFrame(step); else if (done) done();
    }
    raf = requestAnimationFrame(step);
    return { cancel: function () { alive = false; cancelAnimationFrame(raf); } };
  };

  /* 数字滚动 */
  PF.countTo = function (node, to, dur, fmt) {
    var from = 0;
    PF.Anim({
      from: from, to: to, dur: dur || 1100, ease: PF.ease.outQuint,
      on: function (v) { node.textContent = fmt ? fmt(v) : Math.round(v).toLocaleString(); }
    });
  };

  /* 滚动揭示 */
  PF.revealInit = function (root) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: .12, rootMargin: "0px 0px -40px 0px" });
    PF.$$(".reveal", root || document).forEach(function (n) { io.observe(n); });
  };

  /* ---------------- 播放控制器（暂停 / 上一步 / 下一步 / 重置 + 步骤进度条） ----------------
     用于「循环播放的 Canvas 场景」，让学习者能一步步看清。

     opts = {
       scene:  PF.Scene 实例（可选；给了才能暂停/继续）
       after:  把控制器插到这个元素之后（通常传 .viz-stage）；不传则用 wrap 追加
       wrap:   兜底容器
       count:  步骤数
       labels: ['递归查询', ...]                进度条上每步的名字
       mode:   'steps' 每步独占 D 毫秒          （stepOf = ⌊t/D⌋ % count）
               'cycle' 一个循环 D 毫秒内含 count 步（stepOf = ⌊(t%D)/D·count⌋）
       D:      时长 ms（配合 mode）
       lead:   「下一步 / 点进度条」停在该步的哪个进度，默认 .7（直接看到该步结果）
       onStep: function (i) {}  步骤变化回调
     }
     返回 { sync, step, goto, pause, resume }；把 sync() 放进 draw() 即可自动跟随进度。 */
  PF.player = function (o) {
    var scene = o.scene, n = o.count, D = o.D || 1000, lead = o.lead == null ? .7 : o.lead;
    var wrap = o.wrap, cycle = o.mode === "cycle";

    function stepOf() {
      var t = scene ? (scene.t || 0) : 0;
      return cycle
        ? Math.min(n - 1, Math.floor(((t % D) / D) * n))
        : Math.floor(t / D) % n;
    }
    function timeOf(i, atLead) {
      return cycle ? ((i + (atLead ? lead : 0)) / n) * D
        : i * D + (atLead ? D * lead : 0);
    }

    var bar = document.createElement("div");
    bar.className = "sbar";
    bar.innerHTML = (o.labels || []).map(function (t, i) {
      return '<button type="button" class="sbar-seg" data-i="' + i + '">' +
        "<i></i><b>" + (i + 1) + "</b><span>" + PF.esc(t) + "</span></button>";
    }).join("");
    var ctl = document.createElement("div");
    ctl.className = "viz-ctrl";
    ctl.innerHTML =
      '<button class="ctrl-btn" data-act="play">' + PF.icon("pause") + "暂停</button>" +
      '<button class="ctrl-btn" data-act="prev">' + PF.icon("arrow-left") + "上一步</button>" +
      '<button class="ctrl-btn" data-act="next">' + PF.icon("arrow-right") + "下一步</button>" +
      '<button class="ctrl-btn" data-act="reset">' + PF.icon("reset") + "重置</button>" +
      '<span class="ctrl-field" style="margin-left:auto"><span>进度</span>' +
      '<b class="pl-num" style="font-family:var(--font-mono);color:var(--c-cyan)">1 / ' + n + "</b></span>";
    /* 插到 after 之后（通常是 .viz-stage），顺序为：画布 → 进度条 → 按钮 → 说明 */
    if (o.after && o.after.parentNode) {
      o.after.parentNode.insertBefore(bar, o.after.nextSibling);
      o.after.parentNode.insertBefore(ctl, bar.nextSibling);
    } else {
      wrap.appendChild(bar);
      wrap.appendChild(ctl);
    }

    var num = PF.$(".pl-num", ctl), playBtn = PF.$('[data-act="play"]', ctl);
    var segs = PF.$$(".sbar-seg", bar);
    var paused = false, shown = -1;

    function paint(i) {
      if (i === shown) return;
      shown = i;
      segs.forEach(function (el, k) {
        el.classList.toggle("cur", k === i);
        el.classList.toggle("done", k < i);
      });
      num.textContent = (i + 1) + " / " + n;
      if (o.onStep) o.onStep(i);
    }
    function pause() {
      paused = true;
      if (scene) scene.stop();
      playBtn.innerHTML = PF.icon("play") + "继续";
    }
    function resume() {
      paused = false;
      if (scene) scene.start();
      playBtn.innerHTML = PF.icon("pause") + "暂停";
    }
    function goto(i, atLead) {
      if (!scene) return;
      i = ((i % n) + n) % n;
      scene.t = timeOf(i, atLead);
      scene.render();
      paint(stepOf());
    }

    ctl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      var a = b.dataset.act;
      if (a === "play") { paused ? resume() : pause(); }
      if (a === "next") { pause(); goto(stepOf() + 1, true); }
      if (a === "prev") { pause(); goto(stepOf() - 1, true); }
      if (a === "reset") { pause(); goto(0, false); }
    });
    bar.addEventListener("click", function (e) {
      var b = e.target.closest(".sbar-seg"); if (!b) return;
      pause(); goto(+b.dataset.i, true);
    });

    paint(stepOf());
    return {
      /* 放进 draw()：播放时进度条自动跟随（内部按步去重，逐帧调用无开销） */
      sync: function () {
        if (paused) { if (scene && scene.running) scene.stop(); return; }
        paint(stepOf());
      },
      step: stepOf, goto: goto, pause: pause, resume: resume
    };
  };

  /* ---------------- 组件构建器 ---------------- */
  var U = PF.ui = {};

  U.eyebrow = function (txt) { return '<div class="sec-eyebrow">' + PF.esc(txt) + "</div>"; };

  U.callout = function (kind, title, body) {
    var ic = { tip: "bulb", warn: "alert", danger: "alert", key: "key", ok: "check", info: "info" }[kind] || "info";
    return '<div class="callout ' + kind + '"><div class="co-ic">' + PF.icon(ic) + "</div>" +
      '<div class="co-body">' + (title ? "<b>" + PF.esc(title) + "</b>" : "") + PF.rich(body) + "</div></div>";
  };

  U.table = function (head, rows, cls) {
    var h = '<div class="tbl-wrap"><div class="tbl-scroll"><table class="tbl ' + (cls || "") + '"><thead><tr>' +
      head.map(function (x) { return "<th>" + PF.rich(x) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) {
        return "<tr>" + r.map(function (c) { return "<td>" + PF.rich(c) + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div></div>";
    return h;
  };

  U.code = function (title, code) {
    var body = PF.esc(code)
      .replace(/(#|\/\/)[^\n]*/g, '<span class="c">$&</span>')
      .replace(/\b(display|interface|ip|ping|arp|vlan|stp|show|enable|configure|hostname|exit|quit|sudo|openssl|curl|dig|nmap|bcrypt|import|if|print|return|const|let|function)\b/g, '<span class="k">$1</span>')
      .replace(/(\d+\.\d+\.\d+\.\d+(?:\/\d+)?)/g, '<span class="n">$1</span>');
    return '<div class="code"><div class="code-bar"><span class="cb-dots"><i></i><i></i><i></i></span>' +
      '<span class="cb-title">' + PF.esc(title || "terminal") + '</span></div><pre>' + body + "</pre></div>";
  };

  U.formula = function (label, expr) {
    return '<div class="formula">' + (label ? '<span class="fl">' + PF.esc(label) + "</span>" : "") + PF.rich(expr) + "</div>";
  };

  U.termGrid = function (items) {
    return '<div class="term-grid">' + items.map(function (t) {
      return '<div class="term-card"><b>' + PF.esc(t.t) + (t.en ? "<em>" + PF.esc(t.en) + "</em>" : "") +
        "</b><p>" + PF.rich(t.d) + "</p></div>";
    }).join("") + "</div>";
  };

  U.accordion = function (items) {
    return '<div class="acc">' + items.map(function (it, i) {
      return '<div class="acc-item' + (i === 0 ? " open" : "") + '"><div class="acc-head" data-acc>' +
        '<span class="ah-ic">' + PF.icon(it.icon || "info") + "</span>" + PF.rich(it.t) +
        '<span class="ah-arrow">' + PF.icon("chevron-right") + "</span></div>" +
        '<div class="acc-body"><div class="acc-body-inner">' + PF.rich(it.x) + "</div></div></div>";
    }).join("") + "</div>";
  };

  U.tabs = function (items) {
    var id = "tb" + Math.random().toString(36).slice(2, 7);
    return '<div class="tabs" data-tabs="' + id + '"><div class="tab-bar">' +
      items.map(function (it, i) {
        return '<button class="tab-btn' + (i === 0 ? " active" : "") + '" data-tab="' + i + '">' + PF.esc(it.t) + "</button>";
      }).join("") + '</div><div class="tab-body">' +
      items.map(function (it, i) {
        return '<div class="tab-pane' + (i === 0 ? " active" : "") + '" data-pane="' + i + '">' + it.x + "</div>";
      }).join("") + "</div></div>";
  };

  U.pitfalls = function (items) {
    return '<div class="pit-grid">' + items.map(function (p) {
      return '<div class="pit"><div class="p-x">' + PF.icon("x") + PF.rich(p.t) + "</div><p>" + PF.rich(p.x) + "</p></div>";
    }).join("") + "</div>";
  };

  U.quiz = function (qs, stageId) {
    return '<div class="quiz" data-quiz="' + stageId + '">' + qs.map(function (q, i) {
      var letters = ["A", "B", "C", "D", "E"];
      return '<div class="quiz-q" data-answer="' + q.a + '"><div class="qq-head"><span class="qq-idx">' + (i + 1) +
        '</span><span class="qq-text">' + PF.rich(q.q) + "</span></div><div class=\"qq-opts\">" +
        q.o.map(function (o, j) {
          return '<button class="qq-opt" data-i="' + j + '"><span class="qo-mark">' + letters[j] + "</span><span>" + PF.rich(o) + "</span></button>";
        }).join("") + '</div><div class="qq-explain">' + PF.rich(q.e || "") + "</div></div>";
    }).join("") + "</div>";
  };

  U.steps = function (items) {
    return '<div class="steps-track">' + items.map(function (s, i) {
      return '<div class="step-node" data-sn="' + i + '"><span class="sn-line"></span><span class="sn-dot">' + (i + 1) +
        '</span><span class="sn-label">' + PF.esc(s) + "</span></div>";
    }).join("") + "</div>";
  };

  U.timeline = function (items) {
    return '<div class="timeline">' + items.map(function (it) {
      return '<div class="tl-item"><b>' + PF.rich(it.t) + "</b><p>" + PF.rich(it.x) + "</p></div>";
    }).join("") + "</div>";
  };

  /* 可视化外壳 */
  U.viz = function (o) {
    return '<div class="viz" data-viz-id="' + o.id + '"><div class="viz-head">' +
      '<span class="vh-ic">' + PF.icon(o.icon || "sparkle") + "</span>" +
      '<span class="vh-txt"><b>' + PF.esc(o.title) + "</b><span>" + PF.esc(o.sub || "") + "</span></span>" +
      (o.tag ? '<span class="vh-tag">' + PF.esc(o.tag) + "</span>" : "") +
      '</div><div class="viz-stage" data-viz-stage></div>' +
      (o.note ? '<div class="viz-note">' + PF.rich(o.note) + "</div>" : "") + "</div>";
  };

  /* 区块渲染 */
  PF.renderBlocks = function (blocks) {
    if (!blocks) return "";
    return blocks.map(function (b) {
      switch (b.t) {
        case "p": return '<p class="prose">' + PF.rich(b.x) + "</p>";
        case "prose": return '<div class="prose">' + PF.rich(b.x) + "</div>";
        case "ul": return '<ul class="prose' + (b.check ? " check" : "") + '">' +
          b.items.map(function (i) { return "<li>" + PF.rich(i) + "</li>"; }).join("") + "</ul>";
        case "ol": return '<ol class="prose">' + b.items.map(function (i) { return "<li>" + PF.rich(i) + "</li>"; }).join("") + "</ol>";
        case "callout": return U.callout(b.kind || "info", b.title, b.x);
        case "table": return U.table(b.head, b.rows);
        case "code": return U.code(b.title, b.x);
        case "formula": return U.formula(b.label, b.x);
        case "terms": return U.termGrid(b.items);
        case "acc": return U.accordion(b.items);
        case "tabs": return U.tabs(b.items);
        case "pitfalls": return U.pitfalls(b.items);
        case "quiz": return U.quiz(b.items, b.stage);
        case "timeline": return U.timeline(b.items);
        case "viz": return U.viz(b);
        case "html": return b.x;
        default: return "";
      }
    }).join("");
  };

  PF.renderSection = function (sec, idx) {
    var head = '<div class="block-head"><span class="block-title"><span class="bh-ic">' +
      PF.icon(sec.icon || "book") + "</span>" + PF.esc(sec.title) + "</span><span class=\"bh-line\"></span></div>";
    return '<div class="block reveal" id="' + (sec.id || ("sec" + idx)) + '">' + head +
      (sec.sub ? '<div class="block-sub">' + PF.esc(sec.sub) + "</div>" : "") +
      PF.renderBlocks(sec.blocks) + "</div>";
  };

  /* ---------------- 可视化挂载 ---------------- */
  PF.mountViz = function (root) {
    PF.$$("[data-viz-id]", root || document).forEach(function (node) {
      if (node.dataset.mounted) return;
      node.dataset.mounted = "1";
      var id = node.dataset.vizId;
      var fn = PF.VIZ[id];
      var stage = PF.$("[data-viz-stage]", node);
      if (typeof fn === "function" && stage) {
        try { fn(stage, node); } catch (e) { stage.innerHTML = '<p class="muted">可视化加载失败：' + PF.esc(e.message) + "</p>"; }
      }
    });
  };

  /* 阶段注册 */
  PF.register = function (s) { PF.stages.push(s); };

})(window);
