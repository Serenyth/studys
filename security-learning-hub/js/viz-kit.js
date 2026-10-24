/* ================================================================
   SEC·ATLAS · viz-kit.js
   L3 / L4 可视化复用工具：控件绑定 + 通用片段构造
   依赖: utils.js（$/$$）、theme.js（PAL）
   ================================================================ */
"use strict";

/* 找到某 viz-body 所属的 .viz 控制区（含 seg-btn / data-base 按钮） */
function vizCtrl(bodyEl){
  const v = bodyEl.closest(".viz");
  return v ? v.querySelector(".viz-ctrl") : null;
}

/* 绑定一个 viz 内的分段控件 / 预设按钮。
   initial 为初始模式（用于主题切换重建后复位按钮高亮），cb(mode) 在切换时调用。 */
function bindSeg(bodyEl, initial, cb){
  const ctrl = vizCtrl(bodyEl);
  if(!ctrl) return;
  if(initial != null) syncSeg(bodyEl, initial);
  ctrl.onclick = e => {
    const seg = e.target.closest(".seg-btn");
    if(seg){
      $$(".seg-btn", ctrl).forEach(x => x.classList.toggle("active", x === seg));
      cb(seg.dataset.mode);
      return;
    }
    const pre = e.target.closest("[data-base]");
    if(pre){
      $$("[data-base]", ctrl).forEach(x => x.classList.toggle("active", x === pre));
      cb(pre.dataset.base);
    }
  };
}

/* 复位控件高亮到指定模式（主题切换后 initViz 重建时调用） */
function syncSeg(bodyEl, mode){
  const ctrl = vizCtrl(bodyEl);
  if(!ctrl) return;
  $$(".seg-btn", ctrl).forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  $$("[data-base]", ctrl).forEach(b => b.classList.toggle("active", b.dataset.base === mode));
}

/* 通用：进度条行 */
function barRow(label, val, max, warn){
  const pct = Math.round(val / max * 100);
  return `<div class="kbar-row"><span>${label}</span>
    <div class="kbar"><i class="kfill ${warn ? "warn" : ""}" style="width:${pct}%"></i></div>
    <span class="kbar-val">${val}</span></div>`;
}

/* 通用：KPI */
function kpi(v, l, c){
  return `<div class="kpi"><div class="v ${c || ""}">${v}</div><div class="l">${l}</div></div>`;
}

/* 通用：详情面板 */
function panel(t, d, rows){
  const rs = rows.map(r =>
    `<div class="kp-row"><span class="kp-k">${r[0]}</span><span class="kp-v ${r[2]||""}">${r[1]}</span></div>`
  ).join("");
  return `<div class="kpanel"><div class="p-ti">${t}</div><div class="p-de">${d}</div>
    <div class="p-rows">${rs}</div></div>`;
}

/* 通用：柱图（攻击面增长） */
function growBar(nm, val, max){
  return `<div class="gr"><span class="nm">${nm}</span>
    <div class="bar"><i style="width:${Math.round(val/max*100)}%"></i></div></div>`;
}
