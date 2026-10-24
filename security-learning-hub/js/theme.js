/* ================================================================
   SEC·ATLAS · theme.js
   日间/夜间主题管理:
   - PAL: 从 CSS 变量读取的运行时调色板（所有 JS 可视化统一取色）
   - 切换: 持久化到 localStorage，派发 themechange 事件
   加载顺序: 最先加载（在所有可视化模块之前）
   ================================================================ */
"use strict";

/* 需要暴露给 JS 可视化的调色板键 */
const PAL_KEYS = ["grn","cyn","amb","red","vio","blu","bg0","bg1","bg2","bg3","line","line2","tx","tx2","tx3","txStrong"];

/* 兜底色表：与 css/base.css 的两套令牌保持一致。
   正常情况下 PAL 由 CSS 变量覆盖；若环境无法解析变量，用这里的值保证配色正确。 */
const PAL_FALLBACK = {
  dark: {
    grn:"#31ffb0", cyn:"#54d9ff", amb:"#ffb454", red:"#ff5d73", vio:"#a78bfa", blu:"#6ea8ff",
    bg0:"#04070d", bg1:"#080d17", bg2:"#0c1424", bg3:"#12203a",
    line:"#16243f", line2:"#24395f", tx:"#c9d7ea", tx2:"#8ba0c0", tx3:"#5a7096", txStrong:"#f2f8ff",
  },
  light: {
    grn:"#00915f", cyn:"#0b7cb0", amb:"#b26a00", red:"#d02946", vio:"#6f52e0", blu:"#1c56c4",
    bg0:"#edf1f7", bg1:"#f7f9fc", bg2:"#ffffff", bg3:"#e7edf6",
    line:"#d9e2ef", line2:"#c2cfe4", tx:"#2b3a52", tx2:"#54677f", tx3:"#8090a8", txStrong:"#101d33",
  },
};

/* 运行时调色板 */
const PAL = Object.assign({}, PAL_FALLBACK.dark);

const THEME = (() => {
  const KEY = "sec-atlas-theme";

  function hexToRgb(hex){
    const h = (hex || "").replace("#","").trim();
    if(h.length !== 6) return [49,255,176];
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }

  /* 从 CSS 变量刷新 PAL（变量缺失时回退到 PAL_FALLBACK） */
  function refreshPal(){
    const cs = getComputedStyle(document.documentElement);
    const base = PAL_FALLBACK[current()] || PAL_FALLBACK.dark;
    PAL_KEYS.forEach(k => {
      const v = cs.getPropertyValue("--" + (k === "txStrong" ? "tx-strong" : k)).trim();
      PAL[k] = v || base[k];
    });
    PAL.grnRGB = hexToRgb(PAL.grn);
    PAL.cynRGB = hexToRgb(PAL.cyn);
    PAL.redRGB = hexToRgb(PAL.red);
  }

  function current(){
    return document.documentElement.dataset.theme || "dark";
  }

  function apply(name){
    document.documentElement.dataset.theme = name;
    try{ localStorage.setItem(KEY, name); }catch(e){}
    refreshPal();
    /* 更新所有切换按钮文案 */
    document.querySelectorAll(".theme-toggle").forEach(btn => {
      btn.textContent = name === "light" ? "🌙 夜间模式" : "☀️ 日间模式";
    });
    /* 通知可视化模块重绘 */
    window.dispatchEvent(new CustomEvent("themechange", {detail:{theme:name}}));
  }

  function toggle(){ apply(current() === "light" ? "dark" : "light"); }

  function init(){
    refreshPal();
    document.querySelectorAll(".theme-toggle").forEach(btn => {
      btn.onclick = toggle; /* onclick 赋值 = 可重复绑定不叠加 */
      btn.textContent = current() === "light" ? "🌙 夜间模式" : "☀️ 日间模式";
    });
  }

  return { init, apply, toggle, current, refreshPal, PAL };
})();
