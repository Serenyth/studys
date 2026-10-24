/* ================================================================
   SEC·ATLAS · effects.js
   Hero 氛围效果:
     ParticleNet  粒子网络（鼠标引力，配色随主题，离屏自动暂停）
     TypeTerm     终端打字机（增量写文本节点，不重建 DOM）
   依赖: theme.js（PAL）
   ================================================================ */
"use strict";

/* ================================================================
   粒子网络 Canvas
   —— 离屏暂停 + 限帧 30fps：滚到下面读正文时不再白烧 CPU
   ================================================================ */
class ParticleNet{
  constructor(canvas){
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.pts = [];
    this.mouse = {x:-9999, y:-9999};
    this.running = false;
    this.raf = 0;
    this.last = 0;
    this.resize();
    this.spawn();
    window.addEventListener("resize", () => { this.resize(); this.spawn(); });
    canvas.parentElement.addEventListener("mousemove", e => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    });
    canvas.parentElement.addEventListener("mouseleave", () => { this.mouse.x = -9999; });
    this.tick = this.tick.bind(this);

    /* 只在 Hero 可见时跑动画 */
    if("IntersectionObserver" in window){
      this.io = new IntersectionObserver(es => {
        es.forEach(en => en.isIntersecting ? this.start() : this.stop());
      }, {threshold:0});
      this.io.observe(canvas);
    }else{
      this.start();
    }
  }
  start(){
    if(this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.tick);
  }
  stop(){
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
  resize(){
    const p = this.c.parentElement;
    this.w = this.c.width = p.clientWidth;
    this.h = this.c.height = p.clientHeight;
  }
  spawn(){
    const n = Math.min(56, Math.floor(this.w * this.h / 26000));
    this.pts = Array.from({length:n}, () => ({
      x: Math.random()*this.w, y: Math.random()*this.h,
      vx: (Math.random()-.5)*.35, vy: (Math.random()-.5)*.35,
      r: Math.random()*1.6+.8,
      cool: Math.random() < .22   // 22% 用青色，其余绿色
    }));
  }
  tick(ts){
    if(!this.running) return;
    /* 限帧 ~30fps */
    if(ts - this.last < 33){ this.raf = requestAnimationFrame(this.tick); return; }
    this.last = ts;

    const {ctx, w, h, pts} = this;
    /* 每帧读取调色板 → 主题切换时自动换色，无需重建 */
    const grn = PAL.grnRGB || [49,255,176];
    const cyn = PAL.cynRGB || [84,217,255];
    ctx.clearRect(0,0,w,h);

    const grnFill = `rgba(${grn[0]},${grn[1]},${grn[2]},.75)`;
    const cynFill = `rgba(${cyn[0]},${cyn[1]},${cyn[2]},.75)`;
    for(const p of pts){
      p.x += p.vx; p.y += p.vy;
      if(p.x < 0 || p.x > w) p.vx *= -1;
      if(p.y < 0 || p.y > h) p.vy *= -1;
      const dm = Math.hypot(p.x-this.mouse.x, p.y-this.mouse.y);
      if(dm < 130){ // 鼠标引力
        p.x += (this.mouse.x-p.x)*.0022;
        p.y += (this.mouse.y-p.y)*.0022;
      }
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,7);
      ctx.fillStyle = p.cool ? cynFill : grnFill;
      ctx.fill();
    }
    const LINK = 110, LINK2 = LINK*LINK;
    ctx.lineWidth = 1;
    for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
      const a = pts[i], b = pts[j];
      const dx = a.x-b.x, dy = a.y-b.y;
      const d2 = dx*dx + dy*dy;
      if(d2 < LINK2){
        const d = Math.sqrt(d2);
        ctx.beginPath();
        ctx.moveTo(a.x,a.y);
        ctx.lineTo(b.x,b.y);
        ctx.strokeStyle = `rgba(${grn[0]},${grn[1]},${grn[2]},${(1-d/LINK)*.16})`;
        ctx.stroke();
      }
    }
    this.raf = requestAnimationFrame(this.tick);
  }
}

/* ================================================================
   终端打字机
   —— 只改最后一行的文本节点，不再每字符重建整块 innerHTML
   ================================================================ */
class TypeTerm{
  constructor(el){
    this.el = el;
    this.line = 0;
    this.char = 0;
    this.script = [
      {t:"cmd", s:"./start --roadmap=L1,L2,L3,L4,L5,L6 --mode=visual"},
      {t:"out", s:"▸ 加载 阶段一 · 计算机基础地基 …… OK"},
      {t:"out", s:"▸ 加载 阶段二 · 安全核心概念 …… OK"},
      {t:"out", s:"▸ 加载 阶段三 · 防御基础（蓝队）…… OK"},
      {t:"out", s:"▸ 加载 阶段四 · 渗透测试（红队）…… OK"},
      {t:"out", s:"▸ 加载 阶段五 · 专项方向深化 …… OK"},
      {t:"out", s:"▸ 加载 阶段六 · 应急响应与取证 …… OK"},
      {t:"ok",  s:"▸ 初始化 72 个章节 / 70 个原理动画"},
      {t:"cmd", s:"cat motto.txt"},
      {t:"out", s:"先有判断力，再有操作力。"},
      {t:"ok",  s:"▸ READY — 向下滚动开始学习 ▾"}
    ];
    /* 光标常驻，行插入到光标之前 */
    this.cursor = document.createElement("span");
    this.cursor.className = "tcursor";
    this.el.appendChild(this.cursor);
    this.curNode = null;
    /* 让首屏文字与可视化先落地，再开始打字 */
    setTimeout(() => this.step(), 240);
  }
  newLine(cls, prefix){
    const d = document.createElement("div");
    d.className = "tline " + cls;
    if(prefix){
      const p = document.createElement("span");
      p.className = "p";
      p.textContent = "$ ";
      d.appendChild(p);
    }
    const tn = document.createTextNode("");
    d.appendChild(tn);
    this.el.insertBefore(d, this.cursor);
    this.curNode = tn;
  }
  async step(){
    if(this.line >= this.script.length) return;
    const cur = this.script[this.line];
    const cls = cur.t === "cmd" ? "" : "out";
    this.newLine(cls, cur.t === "cmd");
    while(this.char < cur.s.length){
      this.char++;
      this.curNode.nodeValue = cur.s.slice(0, this.char);
      await wait(cur.t === "cmd" ? 26 : 9);
    }
    this.line++;
    this.char = 0;
    this.curNode = null;
    await wait(cur.t === "cmd" ? 300 : 160);
    this.step();
  }
}
