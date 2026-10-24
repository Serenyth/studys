/* ================================================================
   SEC·ATLAS · sequence.js
   SequenceViz —— 通用时序图动画引擎
   被复用: TCP 三次握手/四次挥手/SYN Flood · DNS 迭代解析 · TLS 1.3 握手
   依赖: utils.js · theme.js（PAL 取色，color 支持 "grn"/"cyn"/"red" 等键）
   ================================================================ */
"use strict";

class SequenceViz{
  /**
   * cfg = {
   *   mount:  容器元素,
   *   actors: [{id, label, sub}],
   *   height: SVG 高度,
   *   steps:  [{from,to,label,color,states,lock,flood,reject,pre,wait}]
   * }
   */
  constructor(cfg){
    this.cfg = cfg;
    this.mount = cfg.mount;
    this.playing = false;
    this.timers = [];
    this.build();
  }

  /* 颜色解析：调色板键 → 十六进制；已是颜色值则原样返回 */
  colorOf(c){
    return (c && PAL[c]) ? PAL[c] : (c || PAL.cyn);
  }

  build(){
    const actors = this.cfg.actors, n = actors.length;
    const W = 660, H = this.cfg.height || 380;
    this.W = W; this.H = H;
    const colX = i => 60 + i * ((W-120) / Math.max(n-1, 1));
    this.colX = colX;

    const svg = svgEl("svg", {class:"seq-svg", viewBox:`0 0 ${W} ${H}`}, null);
    this.svg = svg;

    /* actor 头 + 生命线 */
    actors.forEach((a,i) => {
      const x = colX(i);
      svgEl("rect", {class:"sv-actor-box", x:x-58, y:8, width:116, height:40, rx:9}, svg);
      svgEl("text", {class:"sv-actor-txt", x, y:25, "text-anchor":"middle"}, svg).textContent = a.label;
      svgEl("text", {class:"sv-actor-sub", x, y:40, "text-anchor":"middle"}, svg).textContent = a.sub || "";
      svgEl("line", {class:"sv-life", x1:x, y1:56, x2:x, y2:H-14}, svg);
    });

    /* 行布局 */
    this.stepY0 = 78;
    this.rowH = (H - this.stepY0 - 30) / Math.max(this.cfg.steps.length, 1);

    /* 状态徽章（靠右的 actor 徽章放左侧，防溢出） */
    this.stateEls = {};
    actors.forEach((a,i) => {
      const x = colX(i);
      const bx = x > W/2 ? x-112 : x+16;
      const g = svgEl("g", {opacity:0}, svg);
      const r = svgEl("rect", {class:"sv-state", x:bx, y:0, width:96, height:22, rx:7}, g);
      const t = svgEl("text", {class:"sv-state-txt", x:bx+48, y:14, "text-anchor":"middle"}, g);
      this.stateEls[a.id] = {g, r, t};
    });

    /* 空态提示（播放时隐藏） */
    this.hintEl = svgEl("text", {class:"sv-note-txt", x:W/2, y:H/2+10,
      "text-anchor":"middle", opacity:.7}, svg);
    this.hintEl.textContent = "▶ 点击「播放」开始演示";

    this.mount.appendChild(svg);
  }

  yOfStep(i){ return this.stepY0 + i * this.rowH; }

  setState(actorId, text, dim){
    const s = this.stateEls[actorId];
    if(!s || !text) return;
    s.g.setAttribute("opacity", 1);
    s.t.textContent = text;
    s.r.classList.toggle("dim", !!dim);
    s.t.classList.toggle("dim", !!dim);
  }
  clearStates(){
    Object.values(this.stateEls).forEach(s => s.g.setAttribute("opacity", 0));
  }

  reset(){
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.playing = false;
    [...this.svg.querySelectorAll(".sv-dyn")].forEach(e => e.remove());
    this.clearStates();
    if(this.hintEl) this.hintEl.setAttribute("opacity", .7);
  }

  /* 单步箭头 + 飞行包 */
  async arrow(step, i){
    const y = this.yOfStep(i);
    const x1 = this.colX(this.cfg.actors.findIndex(a => a.id === step.from));
    const x2 = this.colX(this.cfg.actors.findIndex(a => a.id === step.to));
    const color = this.colorOf(step.color);
    const g = svgEl("g", {class:"sv-dyn"}, this.svg);
    const line = svgEl("line", {class:"sv-msg", x1, y1:y, x2, y2:y, stroke:color, opacity:.75}, g);
    const len = Math.abs(x2-x1);
    line.setAttribute("stroke-dasharray", len);
    line.setAttribute("stroke-dashoffset", len);

    if(step.label){
      const t = svgEl("text", {class:"sv-label", x:(x1+x2)/2, y:y-8, "text-anchor":"middle", fill:color, opacity:0}, g);
      t.textContent = step.label + (step.lock ? " 🔒" : "");
      this.timers.push(setTimeout(() => t.setAttribute("opacity", 1), 120));
    }

    /* 飞行包 */
    const pkt = svgEl("circle", {class:"sv-pkt sv-dyn", r:5.5, fill:color, "fill-opacity":1}, this.svg);
    pkt.style.color = color;
    await this.animatePkt(pkt, x1, x2, y, step.flood ? 260 : 480);
    pkt.remove();

    line.style.transition = "stroke-dashoffset .3s ease";
    line.setAttribute("stroke-dashoffset", 0);

    if(step.arrowhead !== false){
      const dir = x2 > x1 ? 1 : -1;
      svgEl("path", {
        d:`M${x2-dir*10},${y-5} L${x2},${y} L${x2-dir*10},${y+5}`,
        stroke:color, fill:"none", "stroke-width":2
      }, g);
    }
  }

  animatePkt(pkt, x1, x2, y, dur){
    return new Promise(res => {
      const t0 = performance.now();
      const move = now => {
        const p = Math.min(1, (now-t0)/dur);
        const e = p < .5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2;  // easeInOutQuad
        pkt.setAttribute("cx", x1 + (x2-x1)*e);
        pkt.setAttribute("cy", y);
        if(p < 1) requestAnimationFrame(move); else res();
      };
      requestAnimationFrame(move);
    });
  }

  /* 被拒绝标记（X） */
  reject(i, fromIdx){
    const y = this.yOfStep(i);
    const x = this.colX(fromIdx);
    const g = svgEl("g", {class:"sv-dyn", opacity:0}, this.svg);
    svgEl("path", {
      d:`M${x-7},${y-7} L${x+7},${y+7} M${x+7},${y-7} L${x-7},${y+7}`,
      stroke:PAL.red, "stroke-width":3, "stroke-linecap":"round"
    }, g);
    g.style.transition = "opacity .25s";
    this.timers.push(setTimeout(() => g.setAttribute("opacity", 1), 60));
  }

  async play(onStep, onDone){
    if(this.playing) return;
    this.playing = true;
    if(this.hintEl) this.hintEl.setAttribute("opacity", 0);
    const steps = this.cfg.steps;
    for(let i=0;i<steps.length;i++){
      const st = steps[i];
      if(st.pre) st.pre(this, i);

      if(st.flood){
        /* 并发洪泛包 */
        const y = this.yOfStep(i);
        const x1 = this.colX(0), x2 = this.colX(1);
        const color = this.colorOf(st.color);
        const promises = [];
        for(let k=0;k<st.flood.count;k++){
          const pkt = svgEl("circle", {class:"sv-pkt sv-dyn", r:4, fill:color}, this.svg);
          pkt.style.color = color;
          promises.push(
            this.animatePkt(pkt, x1 + (Math.random()*40-20), x2, y + (Math.random()*16-8), 200 + Math.random()*260)
              .then(() => pkt.remove())
          );
          await wait(46);
        }
        await Promise.all(promises);
      }else{
        await this.arrow(st, i);
      }

      if(st.states) for(const id in st.states){
        const v = st.states[id];
        this.setState(id, v[0], v[1]);
      }
      if(st.reject !== undefined){
        this.reject(st.reject, this.cfg.actors.findIndex(a => a.id === st.from));
      }
      if(onStep) onStep(st, i);
      await wait(st.wait || 420);
    }
    this.playing = false;
    if(onDone) onDone();
  }
}
