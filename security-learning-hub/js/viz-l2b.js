/* ================================================================
   SEC·ATLAS · viz-l2b.js
   L2 补充章节的可视化：
     §19 CvssViz       CVSS v3.1 基础指标计算器
     §21 BlockModeViz  分组模式对比（Canvas：ECB vs CBC）
   依赖: utils.js（$, $$）、theme.js（PAL）
   ================================================================ */
"use strict";

/* ================= §19 CVSS 3.1 ================= */
const CVSS_W = {
  AV:{ N:0.85, A:0.62, L:0.55, P:0.2 },
  AC:{ L:0.77, H:0.44 },
  PR:{ U:{ N:0.85, L:0.62, H:0.27 }, C:{ N:0.85, L:0.68, H:0.50 } },
  UI:{ N:0.85, R:0.62 },
  CIA:{ H:0.56, L:0.22, N:0 },
};
const CVSS_METRICS = [
  { k:"AV", name:"攻击向量", opts:[["N","网络"],["A","相邻"],["L","本地"],["P","物理"]] },
  { k:"AC", name:"攻击复杂度", opts:[["L","低"],["H","高"]] },
  { k:"PR", name:"所需权限", opts:[["N","无"],["L","低"],["H","高"]] },
  { k:"UI", name:"用户交互", opts:[["N","无"],["R","需要"]] },
  { k:"S",  name:"影响范围", opts:[["U","不变"],["C","改变"]] },
  { k:"C",  name:"机密性", opts:[["H","高"],["L","低"],["N","无"]] },
  { k:"I",  name:"完整性", opts:[["H","高"],["L","低"],["N","无"]] },
  { k:"A",  name:"可用性", opts:[["H","高"],["L","低"],["N","无"]] },
];
const CVSS_PRESETS = {
  "9.8": { AV:"N", AC:"L", PR:"N", UI:"N", S:"U", C:"H", I:"H", A:"H" },
  "7.5": { AV:"N", AC:"L", PR:"N", UI:"N", S:"U", C:"H", I:"N", A:"N" },
  "5.3": { AV:"N", AC:"L", PR:"N", UI:"N", S:"U", C:"L", I:"N", A:"N" },
};

function cvssScore(m){
  const cia = v => CVSS_W.CIA[v];
  const iss = 1 - (1 - cia(m.C)) * (1 - cia(m.I)) * (1 - cia(m.A));
  const impact = m.S === "U" ? 6.42 * iss : 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
  const expl = 8.22 * CVSS_W.AV[m.AV] * CVSS_W.AC[m.AC] * CVSS_W.PR[m.S][m.PR] * CVSS_W.UI[m.UI];
  if(impact <= 0) return 0;
  const raw = m.S === "U" ? Math.min(impact + expl, 10) : Math.min(1.08 * (impact + expl), 10);
  return Math.ceil(raw * 10) / 10;
}

class CvssViz{
  constructor(){
    this.body = $("#cvssBody");
    this.m = { AV:"N", AC:"L", PR:"N", UI:"N", S:"U", C:"H", I:"H", A:"H" };
    this.render();
    this.body.onclick = e => {
      const b = e.target.closest("[data-m]");
      if(!b) return;
      this.m[b.dataset.m] = b.dataset.v;
      this.render();
    };
    $$("[data-cvss]").forEach(b => {
      b.onclick = () => { this.m = Object.assign({}, CVSS_PRESETS[b.dataset.cvss]); this.render(); };
    });
  }
  sev(s){
    if(s === 0) return ["NONE", "var(--tx3)", "无影响"];
    if(s < 4) return ["LOW", "var(--cyn)", "低危"];
    if(s < 7) return ["MEDIUM", "var(--amb)", "中危"];
    if(s < 9) return ["HIGH", "var(--red)", "高危"];
    return ["CRITICAL", "var(--red)", "严重"];
  }
  render(){
    const s = cvssScore(this.m);
    const [lv, col, cn] = this.sev(s);
    const vec = "CVSS:3.1/" + CVSS_METRICS.map(d => d.k + ":" + this.m[d.k]).join("/");

    /* 为什么是这个分：拆成三块给用户看 */
    const cia = v => CVSS_W.CIA[v];
    const iss = 1 - (1 - cia(this.m.C)) * (1 - cia(this.m.I)) * (1 - cia(this.m.A));
    const expl = 8.22 * CVSS_W.AV[this.m.AV] * CVSS_W.AC[this.m.AC] * CVSS_W.PR[this.m.S][this.m.PR] * CVSS_W.UI[this.m.UI];

    this.body.innerHTML = `
      <div class="cvss-wrap">
        <div class="cvss-metrics">
          ${CVSS_METRICS.map(d => `
            <div class="cvm">
              <span class="cvm-n">${d.name}<em>${d.k}</em></span>
              <div class="seg">
                ${d.opts.map(o => `<button class="seg-btn ${this.m[d.k] === o[0] ? "active" : ""}" data-m="${d.k}" data-v="${o[0]}">${o[1]}</button>`).join("")}
              </div>
            </div>`).join("")}
        </div>
        <div class="cvss-out">
          <div class="cvss-score" style="color:${col};text-shadow:0 0 26px color-mix(in srgb,${col} 45%,transparent)">${s.toFixed(1)}</div>
          <div class="cvss-sev" style="color:${col}">${lv} · ${cn}</div>
          <div class="cvss-bar"><i style="width:${s * 10}%;background:${col}"></i></div>
          <div class="cvss-vec">${vec}</div>
          <div class="cvss-parts">
            <div><span>ISS 影响基数</span><b>${iss.toFixed(3)}</b></div>
            <div><span>可利用度</span><b>${expl.toFixed(2)}</b></div>
            <div><span>影响范围</span><b>${this.m.S === "U" ? "仅本组件" : "跨组件"}</b></div>
          </div>
          <div class="cvss-hint">${s >= 9
            ? "9.8 分不等于「今天有人打你」。还要看 KEV 是否收录、EPSS 概率、资产暴露面。"
            : s >= 7
            ? "高危。若该资产面向公网且已有公开 PoC，应当作「已被利用」来处理。"
            : s >= 4
            ? "中危。注意环境指标：同一漏洞在核心库与边缘系统上，实际风险差一个数量级。"
            : "低危或需苛刻前置条件。可以进常规迭代，但仍要记录。"}</div>
        </div>
      </div>`;
  }
}

/* ================= §21 分组模式（Canvas） ================= */
const BLK_PATTERN = [
  [0,0,1,1,1,1,0,0],
  [0,1,0,0,0,0,1,0],
  [0,1,0,0,0,0,1,0],
  [1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,1],
  [1,2,2,3,3,2,2,1],
  [1,2,2,3,3,2,2,1],
  [1,1,1,1,1,1,1,1],
];
/* 明文色 / ECB 密文色（固定映射，所以轮廓保留）/ CBC 密文色池 */
const BLK_PLAIN = ["#111a2b", "#54d9ff", "#ffb454", "#ff5d73"];
const BLK_ECB   = ["#111a2b", "#7b5cff", "#2bb3a3", "#ffd479"];
const BLK_CBC   = ["#7b5cff", "#2bb3a3", "#ffd479", "#ff5d73", "#54d9ff", "#a78bfa"];

class BlockModeViz{
  constructor(){
    this.body = $("#blkBody");
    this.iv = Math.floor(Math.random() * 97);
    this.body.innerHTML = `
      <div class="blk-wrap">
        <canvas id="blkCanvas"></canvas>
        <div class="blk-legend">
          <span class="li"><span class="sq" style="background:#54d9ff"></span>同一颜色 = 同一内容块</span>
          <span class="li"><span class="sq" style="background:#7b5cff"></span>密文块（颜色只是示意）</span>
        </div>
      </div>`;
    this.cv = $("#blkCanvas");
    this.animate();
    const btn = $("#blkReplay");
    if(btn) btn.onclick = () => { this.iv = Math.floor(Math.random() * 97); this.animate(); };
  }
  setup(){
    const W = 680, H = 268;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cv = this.cv;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = "100%"; cv.style.height = "auto";
    const c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    return { c, W, H };
  }
  animate(){
    const t0 = performance.now();
    const step = now => {
      if(!this.cv || !this.cv.isConnected) return;
      const p = Math.min((now - t0) / 720, 1);
      this.draw(p);
      if(p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  draw(p){
    const { c, W, H } = this.setup();
    const S = 15, G = 3, CELL = S + G, N = 8;
    const pw = N * CELL - G;
    const panels = [
      { x: 34, t: "明文", s: "8×8 的数据块" },
      { x: (W - pw) / 2, t: "ECB", s: "相同块 → 相同密文" },
      { x: W - pw - 34, t: "CBC", s: "相同块 → 不同密文" },
    ];
    const top = 62;

    panels.forEach((pn, pi) => {
      c.save();
      c.font = "700 13px 'JetBrains Mono', monospace";
      c.fillStyle = pi === 1 ? PAL.red : pi === 2 ? PAL.grn : PAL.cyn;
      c.textAlign = "left";
      c.fillText(pn.t, pn.x, 30);
      c.font = "11px 'JetBrains Mono', monospace";
      c.fillStyle = PAL.tx3;
      c.fillText(pn.s, pn.x, 48);

      for(let r = 0; r < N; r++){
        /* CBC：每行从 IV 派生一个初值，逐块向后链式混合 */
        let prev = (this.iv + r * 7) % BLK_CBC.length;
        for(let col = 0; col < N; col++){
          const v = BLK_PATTERN[r][col];
          /* 按列扫描出现 */
          const local = Math.max(0, Math.min(1, p * N - col));
          let fill;
          if(pi === 0){
            fill = BLK_PLAIN[v];
          }else if(pi === 1){
            fill = BLK_ECB[v];
          }else{
            const h = (v * 7 + prev * 13 + this.iv * 5 + col) % BLK_CBC.length;
            fill = BLK_CBC[h];
            prev = h;
          }
          if(local <= 0) continue;
          const x = pn.x + col * CELL, y = top + r * CELL;
          c.globalAlpha = local;
          c.fillStyle = fill;
          c.beginPath();
          c.roundRect(x, y, S, S, 3);
          c.fill();
        }
      }
      c.globalAlpha = 1;
      /* 分隔线（ECB 面板加红色警示框） */
      if(pi > 0){
        c.strokeStyle = pi === 1 ? "rgba(255,93,115,.45)" : "rgba(49,255,176,.35)";
        c.lineWidth = 1;
        c.setLineDash([4, 4]);
        c.strokeRect(pn.x - 8, top - 8, pw + 16, N * CELL + 8);
        c.setLineDash([]);
      }
      c.restore();
    });

    /* 底部结论 */
    c.font = "12px 'Noto Sans SC', sans-serif";
    c.fillStyle = PAL.tx2;
    c.textAlign = "center";
    c.fillText("ECB：企鹅图为什么能认出来 —— 形状由「相同块映射到相同色」保留下来", W / 2, H - 22);
  }
}
