/* ================================================================
   SEC·ATLAS · viz-l2.js
   阶段二可视化模块（6 个）:
     CIAViz         §09 CIA 三元组（可点击三角）
     DiDViz         §11 纵深防御攻击波模拟
     AttackTreeViz  §12 攻击树（含最短路径高亮）
     DHViz          §13 Diffie-Hellman 调色类比（Canvas）
     ZTViz          §15 零信任 vs 边界模型对比
     AttackViz      §16 ATT&CK 14 战术链
   依赖: utils.js · theme.js
   约定: 常驻按钮统一用 onclick 赋值
   ================================================================ */
"use strict";

/* ================================================================
   §09 CIA 三元组
   ================================================================ */
class CIAViz{
  constructor(){
    this.data = {
      C:{name:"机密性", en:"CONFIDENTIALITY", k:"cyn",
         broken:"数据泄露、明文传输、越权读取、内网可随意访问",
         def:"加密（TLS/静态加密）、访问控制、脱敏",
         ex:"案例：数据库监听 0.0.0.0 且无认证 → 全网可读"},
      I:{name:"完整性", en:"INTEGRITY", k:"grn",
         broken:"数据被篡改、固件被植入后门、日志被删除、转账金额被改",
         def:"哈希校验、数字签名、版本控制、WORM 存储",
         ex:"案例：价格参数由客户端传入且未服务端复核 → 0.01 元购物"},
      A:{name:"可用性", en:"AVAILABILITY", k:"amb",
         broken:"DDoS、勒索软件加密、机房断电、单点故障",
         def:"冗余、备份（异地！）、限流、抗 D 设备",
         ex:"案例：备份与生产库同一内网 → 勒索软件一次加密两份"},
    };
    const wrap = $("#ciaSvgWrap");
    const svg = svgEl("svg", {viewBox:"0 0 300 278", class:"seq-svg"}, null);
    this.pts = {C:[150,36], I:[42,220], A:[258,220]};

    svgEl("polygon", {
      points:"150,36 42,220 258,220", fill:"none",
      stroke:PAL.line2, "stroke-width":1.5
    }, svg);
    svgEl("text", {
      x:150, y:142, "text-anchor":"middle", fill:PAL.tx3,
      "font-size":"12", "font-family":"var(--f-mono)"
    }, svg).textContent = "CIA";

    this.nodes = {};
    for(const k in this.pts){
      const [x,y] = this.pts[k];
      const g = svgEl("g", {class:"cia-vertex"}, svg);
      svgEl("circle", {cx:x, cy:y, r:24, fill:PAL.bg2, stroke:PAL[this.data[k].k], "stroke-width":2}, g);
      svgEl("text", {x, y:y+5, "text-anchor":"middle", fill:PAL[this.data[k].k], "font-size":"15", "font-weight":"800"}, g).textContent = k;
      const lbl = {C:"机密性", I:"完整性", A:"可用性"}[k];
      const lx = k === "C" ? 150 : (k === "I" ? 42 : 258);
      svgEl("text", {x:lx, y:k === "C" ? 80 : 262, "text-anchor":"middle", fill:PAL.tx, "font-size":"12.5"}, g).textContent = lbl;
      g.onclick = () => this.select(k);
      this.nodes[k] = g;
    }
    wrap.appendChild(svg);
    this.panel = $("#ciaPanel");
    this.select("C");
  }
  select(k){
    for(const kk in this.nodes){
      const c = this.nodes[kk].querySelector("circle");
      c.setAttribute("r", kk === k ? 28 : 24);
      c.setAttribute("filter", kk === k ? "drop-shadow(0 0 12px " + PAL[this.data[kk].k] + ")" : "");
    }
    const d = this.data[k];
    this.panel.innerHTML = `
      <h4 style="color:${PAL[d.k]}">${d.name}</h4>
      <div class="en">${d.en}</div>
      <div class="row"><b style="color:var(--red)">被破坏的表现</b>${d.broken}</div>
      <div class="row"><b style="color:var(--grn)">典型防护</b>${d.def}</div>
      <div class="row"><b style="color:var(--amb)">一句话案例</b>${d.ex}</div>`;
  }
}

/* ================================================================
   §11 纵深防御模拟器
   ================================================================ */
class DiDViz{
  constructor(){
    this.body = $("#didBody");
    this.log = $("#didLog");
    this.W = 680; this.H = 352;
    this.cx = 424; this.cy = 176;
    this.layers = [
      {name:"边界", r:150, sub:"防火墙 / WAF / 抗D", k:"cyn"},
      {name:"网络", r:124, sub:"分段 / IDS / 微隔离", k:"cyn"},
      {name:"主机", r:98,  sub:"EDR / 加固基线",     k:"grn"},
      {name:"应用", r:72,  sub:"输入校验 / 鉴权",    k:"amb"},
      {name:"数据", r:46,  sub:"加密 / 脱敏 / DLP",  k:"vio"},
    ];
    this.core = {name:"身份·人员", r:20, sub:"MFA / 最小权限 / 培训"};
    /* 每类攻击被哪一层拦下：-1 = 全部突破（演示剩余风险） */
    this.attacks = [
      {name:"DDoS 洪水",    k:"cyn", block:0, why:"抗 D 设备在边界清洗"},
      {name:"SQL 注入",     k:"amb", block:3, why:"WAF+参数化在应用层拦截"},
      {name:"钓鱼邮件",     k:"vio", block:5, why:"安全意识培训 + MFA 挡住凭据滥用"},
      {name:"0day 利用",    k:"red", block:4, why:"WAF 无签名，直到数据层加密/脱敏降低影响"},
      {name:"弱口令爆破",   k:"amb", block:5, why:"MFA + 爆破锁定"},
      {name:"供应链投毒",   k:"grn", block:2, why:"主机层 EDR 行为检测拦截"},
      {name:"内部人员泄露", k:"red", block:-1, why:"突破了所有技术层 —— 剩余风险!"},
    ];

    this.svg = svgEl("svg", {viewBox:`0 0 ${this.W} ${this.H}`, class:"seq-svg"}, null);
    /* 同心防御环（不标注文字，避免与圆环/核心打架） */
    this.layers.forEach(L => {
      svgEl("circle", {cx:this.cx, cy:this.cy, r:L.r, fill:"none", stroke:PAL.line2,
        "stroke-width":1.4, "stroke-dasharray":"4 4", opacity:.9}, this.svg);
    });
    /* 左侧图例 */
    this.layers.forEach((L,i) => {
      const y = 64 + i*32;
      svgEl("line", {x1:20, y1:y-4, x2:42, y2:y-4, stroke:PAL[L.k],
        "stroke-width":2, "stroke-dasharray":"4 3"}, this.svg);
      const t = svgEl("text", {x:50, y, "font-size":"12", "font-family":"var(--f-mono)", fill:PAL.tx3}, this.svg);
      const nm = svgEl("tspan", {fill:PAL[L.k], "font-weight":"700"}, t);
      nm.textContent = L.name;
      const ds = svgEl("tspan", {dx:"6"}, t);
      ds.textContent = L.sub;
    });
    /* 核心 */
    svgEl("circle", {cx:this.cx, cy:this.cy, r:this.core.r, fill:"rgba(49,255,176,.1)",
      stroke:PAL.grn, "stroke-width":1.6}, this.svg);
    svgEl("text", {x:this.cx, y:this.cy+4, "text-anchor":"middle", fill:PAL.grn,
      "font-size":"12", "font-weight":"700"}, this.svg).textContent = "身份·人员";
    const coreY = 64 + 5*32;
    svgEl("circle", {cx:31, cy:coreY-4, r:5, fill:PAL.grn}, this.svg);
    const ct = svgEl("text", {x:50, y:coreY, "font-size":"12", "font-family":"var(--f-mono)", fill:PAL.tx3}, this.svg);
    const cn = svgEl("tspan", {fill:PAL.grn, "font-weight":"700"}, ct);
    cn.textContent = "身份";
    const cd = svgEl("tspan", {dx:"6"}, ct);
    cd.textContent = this.core.sub;
    this.body.appendChild(this.svg);

    this.running = false;
    $("#didAtk").onclick = () => this.run();
    $("#didReset").onclick = () => this.reset();
  }
  addLog(html, cls){
    const d = htmlEl(`<div class="lg-line"><span class="ts">${new Date().toLocaleTimeString("zh-CN",{hour12:false})}</span><span class="${cls}">${html}</span></div>`);
    this.log.appendChild(d);
    this.log.scrollTop = this.log.scrollHeight;
  }
  reset(){
    $$(".sv-dyn", this.svg).forEach(e => e.remove());
    this.log.innerHTML = `<div class="lg-line"><span class="ts">--</span><span class="info">已重置。点击「发起攻击波」。</span></div>`;
    $("#didSummary").textContent = "";
  }
  async run(){
    if(this.running) return;
    this.running = true;
    $$(".sv-dyn", this.svg).forEach(e => e.remove());
    this.addLog("◤ 攻击波开始 —— 7 类攻击同时逼近", "info");

    let blocked = 0, passed = 0;
    const tasks = this.attacks.map((atk, i) => (async () => {
      await wait(i * 260);
      const ang = (-90 + i * (360/this.attacks.length)) * Math.PI/180;
      const color = PAL[atk.k] || PAL.cyn;
      const dot = svgEl("circle", {class:"sv-dyn",
        cx:this.cx+Math.cos(ang)*164, cy:this.cy+Math.sin(ang)*164, r:5.5, fill:color}, this.svg);
      dot.style.color = color;

      let r = 164;
      const blockR = atk.block === 5 ? this.core.r : (atk.block >= 0 ? this.layers[atk.block].r : -1);
      while(r > (blockR > 0 ? blockR + 6 : this.core.r)){
        r -= 2.6;
        dot.setAttribute("cx", this.cx + Math.cos(ang)*r);
        dot.setAttribute("cy", this.cy + Math.sin(ang)*r);
        await wait(14);
      }

      if(atk.block >= 0){
        blocked++;
        /* 护盾闪光 */
        const flash = svgEl("circle", {class:"sv-dyn", cx:this.cx, cy:this.cy, r:blockR,
          fill:"none", stroke:color, "stroke-width":3, opacity:.9}, this.svg);
        const t0 = performance.now();
        const anim = now => {
          const p = (now-t0)/600;
          flash.setAttribute("r", blockR - p*10);
          flash.setAttribute("opacity", .9*(1-p));
          if(p < 1) requestAnimationFrame(anim); else flash.remove();
        };
        requestAnimationFrame(anim);
        dot.remove();
        const layerName = atk.block === 5 ? this.core.name : this.layers[atk.block].name;
        this.addLog(`<span style="color:${color}">${atk.name}</span> → 在 [${layerName}] 被拦截 ✓ ${atk.why}`, "ok");
      }else{
        passed++;
        dot.setAttribute("r", 7);
        this.svg.appendChild(dot); /* 置顶 */
        this.addLog(`<span style="color:${color}">${atk.name}</span> → <b>突破所有防线，抵达核心 ✗</b> ${atk.why}`, "bad");
      }
    })());

    await Promise.all(tasks);
    this.addLog(`◤ 攻击波结束 —— 拦截 ${blocked} / 突破 ${passed}`, passed ? "warn" : "ok");
    $("#didSummary").innerHTML = blocked && passed
      ? `<strong style="color:var(--amb)">剩余风险永远不为零。</strong>安全工作的目标不是消灭风险，而是把它降到可接受的水平 —— 并对突破的部分（如内部人员）用审计与响应兜底。`
      : `<strong style="color:var(--grn)">本轮全部拦截 —— 但不要庆祝：下一波可能带着 0day 来。</strong>持续验证每一层的有效性，才是纵深防御的第三特征。`;
    this.running = false;
  }
}

/* ================================================================
   §12 攻击树
   ================================================================ */
class AttackTreeViz{
  constructor(){
    this.body = $("#treeBody");
    this.note = $("#treeNote");
    this.defs = {
      root:"把「用户数据被拖库」作为威胁建模的根目标，沿着攻击树逐条加固 —— 每个叶子都是一个防御点。",
      sqli:"服务端参数化查询 + 数据库账号最小权限（WAF 只能缓解，不能依赖）",
      sqli1:"输入校验 + 错误信息脱敏（不留注入点线索）",
      sqli2:"WAF 会绕过 —— 参数化与最小权限才是兜底",
      cred:"密钥管理（KMS/Vault），禁止硬编码凭据",
      cred1:".git 目录禁止访问 + 私有仓库 + 密钥扫描（gitleaks）",
      cred2:"配置中心集中管理 + 严格权限 + 审计",
      direct:"数据库不暴露公网 + 网络分段（微隔离）",
      direct1:"只监听内网 + 安全组白名单",
      direct2:"强口令策略 + MFA + 爆破锁定",
    };
    const nodes = [
      {id:"root",    x:360, y:36,  w:150, label:"获取用户数据", core:1, gate:"OR"},
      {id:"sqli",    x:116, y:128, w:104, label:"SQL 注入", gate:"AND"},
      {id:"cred",    x:356, y:128, w:110, label:"窃取凭据", gate:"OR"},
      {id:"direct",  x:596, y:128, w:118, label:"直接访问DB", gate:"AND"},
      {id:"sqli1",   x:56,  y:226, w:100, label:"找到注入点"},
      {id:"sqli2",   x:176, y:226, w:100, label:"绕过 WAF"},
      {id:"cred1",   x:296, y:226, w:104, label:"代码仓库泄露"},
      {id:"cred2",   x:416, y:226, w:104, label:"配置文件读取"},
      {id:"direct1", x:536, y:226, w:100, label:"暴露公网"},
      {id:"direct2", x:656, y:226, w:96,  label:"弱口令"},
    ];
    const edges = [
      ["root","sqli"],["root","cred"],["root","direct"],
      ["sqli","sqli1"],["sqli","sqli2"],
      ["cred","cred1"],["cred","cred2"],
      ["direct","direct1"],["direct","direct2"],
    ];
    const P = {};
    nodes.forEach(n => P[n.id] = n);

    this.svg = svgEl("svg", {viewBox:"0 0 720 280", class:"seq-svg"}, null);
    this.edgeEls = {};
    edges.forEach(([a,b]) => {
      const A = P[a], B = P[b];
      const e = svgEl("line", {class:"tree-edge", x1:A.x, y1:A.y+16, x2:B.x, y2:B.y-16}, this.svg);
      this.edgeEls[a+"-"+b] = e;
    });
    nodes.forEach(n => {
      const g = svgEl("g", {class:"tree-node" + (n.core ? " core" : ""), id:"tn-"+n.id}, this.svg);
      svgEl("rect", {x:n.x-n.w/2, y:n.y-16, width:n.w, height:32, rx:8}, g);
      svgEl("text", {x:n.x, y:n.y+4, "text-anchor":"middle"}, g).textContent = n.label;
      /* 逻辑门标记放在节点外侧（父节点标注其子节点的组合方式） */
      if(n.gate){
        svgEl("text", {
          x:n.x + n.w/2 + 7, y:n.y + 4,
          fill: n.gate === "AND" ? PAL.amb : PAL.cyn,
          "font-size":"12", "font-family":"var(--f-mono)", "letter-spacing":".06em"
        }, g).textContent = n.gate;
      }
      g.onclick = () => {
        this.note.innerHTML = `<strong>${n.label}</strong> 的加固：${this.defs[n.id]}`;
        $$(".tree-node", this.svg).forEach(x => x.classList.remove("hl"));
        g.classList.add("hl");
      };
    });
    this.body.appendChild(this.svg);

    $("#treePath").onclick = () => {
      $$(".tree-node,.tree-edge", this.svg).forEach(x => x.classList.remove("hl"));
      ["direct","direct1","direct2"].forEach(id => {
        const el = $("#tn-"+id, this.svg);
        if(el) el.classList.add("hl");
      });
      ["root-direct","direct-direct1","direct-direct2"].forEach(k => {
        if(this.edgeEls[k]) this.edgeEls[k].classList.add("hl");
      });
      this.note.innerHTML = "<strong>最短路径：直接访问数据库</strong> —— 只需两个 AND 条件同时成立（暴露公网 + 弱口令）。加固优先级：把数据库收回内网，一个动作即可剪断整条路径。";
    };
  }
}

/* ================================================================
   §13 DH 密钥交换（Canvas 调色）
   ================================================================ */
class DHViz{
  constructor(){
    this.body = $("#dhBody");
    this.note = $("#dhNote");
    this.W = 640; this.H = 300;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.canvas.className = "dh-canvas";
    this.ctx = this.canvas.getContext("2d");
    this.body.appendChild(this.canvas);

    /* 颜料色（内容语义色，两主题一致） */
    this.C = {yellow:[255,213,79], alice:[77,217,255], bob:[255,93,115]};
    this.step = 0;
    this.playing = false;

    $("#dhPlay").onclick = () => this.play();
    $("#dhStep").onclick = () => {
      if(this.step < 4){ this.step++; this.draw(); this.setNote(); }
    };
    $("#dhReset").onclick = () => { this.step = 0; this.draw(); this.setNote(); };

    this.draw();
    this.setNote();
  }
  mix(a,b){ return [0,1,2].map(i => Math.round((a[i]+b[i])/2)); }
  rgb(c){ return `rgb(${c[0]},${c[1]},${c[2]})`; }
  roundRect(c,x,y,w,h,r){
    c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
  }
  pot(x,y,w,h,color,label,sub){
    const c = this.ctx;
    c.beginPath();
    this.roundRect(c,x,y,w,h,10);
    c.fillStyle = color ? this.rgb(color) : PAL.bg3;
    c.fill();
    c.strokeStyle = PAL.line2;
    c.lineWidth = 1.5;
    c.stroke();
    c.fillStyle = "rgba(4,7,13,.85)";
    c.font = "700 12px 'JetBrains Mono',monospace";
    c.textAlign = "center";
    c.fillText(label, x+w/2, y+h/2+2);
    if(sub){
      c.fillStyle = PAL.tx3;
      c.font = "10px 'JetBrains Mono',monospace";
      c.fillText(sub, x+w/2, y+h+16);
    }
  }
  arrow(x1,y1,x2,y2,color,progress){
    const c = this.ctx;
    const mx = x1+(x2-x1)*progress, my = y1+(y2-y1)*progress;
    c.beginPath();
    c.moveTo(x1,y1); c.lineTo(x2,y2);
    c.strokeStyle = PAL.line2;
    c.globalAlpha = .8;
    c.setLineDash([5,5]);
    c.lineWidth = 1.2;
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 1;
    c.beginPath(); c.arc(mx,my,7,0,7); c.fillStyle = this.rgb(color); c.fill();
    c.beginPath(); c.arc(mx,my,11,0,7);
    c.strokeStyle = this.rgb(color); c.globalAlpha = .4; c.stroke(); c.globalAlpha = 1;
  }
  text(t,x,y,color,size=11,align="center"){
    const c = this.ctx;
    c.fillStyle = color || PAL.tx2;
    c.font = `${size}px 'JetBrains Mono',monospace`;
    c.textAlign = align;
    c.fillText(t,x,y);
  }
  draw(progress=1, moving=null){
    const c = this.ctx, s = this.step;
    const alicePub = this.mix(this.C.yellow, this.C.alice);
    const bobPub = this.mix(this.C.yellow, this.C.bob);
    const finA = this.mix(bobPub, this.C.alice);
    const finB = this.mix(alicePub, this.C.bob);

    c.clearRect(0,0,this.W,this.H);
    this.text("ALICE", 100, 34, PAL.cyn, 12);
    this.text("公共信道（Eve 在听）", 320, 34, PAL.tx3, 11);
    this.text("BOB", 540, 34, PAL.red, 12);

    /* 公共底色 */
    this.pot(30, 56, 74, 46, this.C.yellow, "公共黄", "双方约定");
    this.pot(536, 56, 74, 46, this.C.yellow, "公共黄", "双方约定");
    /* 各自秘密色 */
    this.pot(118, 56, 50, 46, this.C.alice, "秘密", "仅Alice");
    this.pot(472, 56, 50, 46, this.C.bob, "秘密", "仅Bob");
    /* 未发生的步骤：虚线占位，预告流程 */
    const ghost = (x,y,w,h) => {
      c.beginPath();
      this.roundRect(c,x,y,w,h,10);
      c.setLineDash([5,5]);
      c.strokeStyle = PAL.line2;
      c.globalAlpha = .55;
      c.stroke();
      c.setLineDash([]);
      c.globalAlpha = 1;
      this.text("?", x+w/2, y+h/2+5, PAL.tx3, 14);
    };
    if(s < 3){
      c.beginPath();
      c.moveTo(150,155); c.lineTo(490,155);
      c.moveTo(490,175); c.lineTo(150,175);
      c.strokeStyle = PAL.line2;
      c.setLineDash([4,7]);
      c.globalAlpha = .3;
      c.lineWidth = 1.2;
      c.stroke();
      c.setLineDash([]);
      c.globalAlpha = 1;
    }
    if(s < 1) ghost(56, 128, 88, 54);
    if(s < 2) ghost(496, 128, 88, 54);
    if(s < 4){ ghost(180, 210, 96, 58); ghost(364, 210, 96, 58); }
    /* 混合结果 */
    if(s >= 1) this.pot(56, 128, 88, 54, alicePub, "黄+秘密", "公开传递");
    if(s >= 2) this.pot(496, 128, 88, 54, bobPub, "黄+秘密", "公开传递");
    /* 交换 */
    if(s >= 3){
      this.arrow(150, 155, 490, 155, alicePub, moving === "a" ? progress : 1);
      this.arrow(490, 175, 150, 175, bobPub, moving === "b" ? progress : 1);
    }
    /* 最终共享密钥 */
    if(s >= 4){
      this.pot(180, 210, 96, 58, finA, "收到+秘密", "→ 共享密钥");
      this.pot(364, 210, 96, 58, finB, "收到+秘密", "→ 共享密钥");
      c.beginPath();
      c.moveTo(282,239); c.lineTo(358,239);
      c.strokeStyle = PAL.grn;
      c.lineWidth = 2;
      c.setLineDash([2,3]);
      c.stroke();
      c.setLineDash([]);
      this.text("同一颜色 ✓", 320, 232, PAL.grn, 11);
      this.text("🔒 会话密钥协商完成", 320, 292, PAL.grn, 12);
    }
    /* 窃听者 */
    this.text("👁 EVE", 320, 196, PAL.red, 11);
    this.text(s >= 3 ? "看见了: 绿 + 橙 — 推不出任何一方的秘密色" : "正在监听…", 320, 214, PAL.tx3, 10);
  }
  setNote(){
    const notes = [
      "初始状态：双方公开约定<strong>公共颜色（黄）</strong>，各自持有<strong>绝对保密的秘密色</strong>。窃听者 Eve 能看到信道上的一切。",
      "Alice 把「黄 + 自己的秘密」混合 —— <strong>混合容易，分离极难</strong>（单向函数的类比）。",
      "Bob 同样混合出自己的公开色。注意两边的混合结果不同。",
      "双方<strong>公开交换</strong>混合色 —— Eve 全都看见了，但无法从混合色中还原出任何一方的秘密色。",
      "双方把收到的混合色再混入<strong>自己的秘密色</strong> —— 两边最终得到<strong>完全相同的颜色</strong>，这就是共享会话密钥。Eve 手里只有绿和橙，永远配不出这个颜色。ECDHE 的 E（临时）= 每次会话重新调色，用完即弃 —— 前向保密。",
    ];
    this.note.innerHTML = notes[this.step];
  }
  async animate(color, key){
    for(let p=0; p<=1.001; p+=0.02){
      this.draw(p, key);
      await wait(16);
    }
  }
  async play(){
    if(this.playing) return;
    this.playing = true;
    while(this.step < 4){
      this.step++;
      if(this.step === 3){
        await this.animate(this.C.alice, "a");
        await this.animate(this.C.bob, "b");
      }
      this.draw();
      this.setNote();
      await wait(1100);
    }
    this.playing = false;
  }
}

/* ================================================================
   §15 零信任 vs 边界模型
   ================================================================ */
class ZTViz{
  constructor(){
    this.body = $("#ztBody");
    this.W = 640; this.H = 310;
    this.svg = svgEl("svg", {viewBox:`0 0 ${this.W} ${this.H}`, class:"seq-svg"}, null);
    this.body.appendChild(this.svg);
    this.dyn = svgEl("g", {}, this.svg);
    this.buildStatic();
    this.createActors();
    $("#ztPlay").onclick = () => this.play();
    $("#ztReset").onclick = () => this.reset();
  }
  box(x,y,w,h,label,color){
    svgEl("rect", {x, y, width:w, height:h, rx:8, fill:PAL.bg2,
      stroke:color || PAL.tx3, "stroke-width":1.5}, this.svg);
    svgEl("text", {x:x+w/2, y:y+h/2+4, "text-anchor":"middle",
      fill:PAL.tx, "font-size":"12"}, this.svg).textContent = label;
  }
  buildStatic(){
    /* 左：传统边界 */
    svgEl("text", {x:160, y:26, "text-anchor":"middle", fill:PAL.amb,
      "font-size":"12", "font-family":"var(--f-mono)"}, this.svg).textContent = "传统边界模型";
    svgEl("circle", {cx:160, cy:150, r:105, fill:"none", stroke:PAL.amb,
      "stroke-width":1.5, "stroke-dasharray":"6 5", opacity:.55}, this.svg);
    this.box(115, 88, 90, 26, "VPN 网关", PAL.amb);
    this.box(105, 150, 50, 24, "文件服务器");
    this.box(160, 185, 50, 24, "数据库");
    this.box(215, 150, 50, 24, "OA 系统");
    svgEl("text", {x:160, y:278, "text-anchor":"middle", fill:PAL.tx3,
      "font-size":"12"}, this.svg).textContent = "「进入内网 = 可信」一次 VPN 认证，全网可达";

    /* 右：零信任 */
    svgEl("text", {x:480, y:26, "text-anchor":"middle", fill:PAL.grn,
      "font-size":"12", "font-family":"var(--f-mono)"}, this.svg).textContent = "零信任模型";
    const svrs = [[415,95,"文件服务器"],[480,150,"数据库"],[545,95,"OA 系统"]];
    this.ztGates = [];
    svrs.forEach(([x,y,l]) => {
      this.box(x-32, y, 64, 24, l);
      const gate = svgEl("g", {}, this.svg);
      svgEl("circle", {cx:x, cy:y-16, r:8, fill:"rgba(49,255,176,.12)",
        stroke:PAL.grn, "stroke-width":1.5}, gate);
      svgEl("text", {x, y:y-12, "text-anchor":"middle", fill:PAL.grn, "font-size":"12"}, gate).textContent = "✓";
      this.ztGates.push(gate);
    });
    svgEl("text", {x:480, y:278, "text-anchor":"middle", fill:PAL.tx3,
      "font-size":"12"}, this.svg).textContent = "「永不信任，始终验证」每个资源独立校验身份+设备+上下文";
  }
  createActors(){
    this.bad = [];
    this.bad.push(svgEl("circle", {cx:160, cy:290, r:7, fill:PAL.red, opacity:0}, this.dyn));
    this.bad.push(svgEl("circle", {cx:480, cy:290, r:7, fill:PAL.red, opacity:0}, this.dyn));
    /* 复位验证门 */
    this.ztGates.forEach(g => {
      const t = g.querySelector("text");
      t.textContent = "✓";
      t.setAttribute("fill", PAL.grn);
      g.querySelector("circle").setAttribute("stroke", PAL.grn);
    });
  }
  cap(x,y,t,color){
    const g = svgEl("g", {}, this.dyn);
    const txt = svgEl("text", {x, y, "text-anchor":"middle", fill:color,
      "font-size":"12", "font-family":"var(--f-mono)"}, g);
    txt.textContent = t;
    return g;
  }
  tween(dot, x1,y1,x2,y2,dur){
    return new Promise(res => {
      dot.setAttribute("opacity", 1);
      const t0 = performance.now();
      const mv = now => {
        const p = Math.min(1,(now-t0)/dur);
        const e = p < .5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2;
        dot.setAttribute("cx", x1+(x2-x1)*e);
        dot.setAttribute("cy", y1+(y2-y1)*e);
        p < 1 ? requestAnimationFrame(mv) : res();
      };
      requestAnimationFrame(mv);
    });
  }
  flashGate(i, ok){
    const target = this.ztGates[i];
    if(!target) return;
    const txt = target.querySelector("text");
    txt.textContent = ok ? "✓" : "✗";
    txt.setAttribute("fill", ok ? PAL.grn : PAL.red);
    target.querySelector("circle").setAttribute("stroke", ok ? PAL.grn : PAL.red);
  }
  reset(){
    this.dyn.innerHTML = "";
    this.createActors();
  }
  async play(){
    this.reset();
    const [L, R] = this.bad;

    /* 左：长驱直入 */
    this.cap(160, 305, "攻击者带着窃取的 VPN 凭据…", PAL.red);
    await this.tween(L, 160,290, 160,120, 900);
    this.cap(120, 60, "VPN 认证通过 ✓ 一次认证", PAL.amb);
    for(const [dx,dy,label] of [[130,163,"横向→文件服务器 ✗"],[185,197,"横向→数据库 ✗"],[240,163,"横向→OA ✗"]]){
      await this.tween(L, +L.getAttribute("cx"), +L.getAttribute("cy"), dx, dy, 550);
      this.cap(dx, dy-18, label, PAL.red);
      await wait(240);
    }
    this.cap(160, 40, "内网横向移动畅通无阻", PAL.red);

    /* 右：处处碰壁 */
    this.cap(480, 305, "同样的凭据，试试零信任…", PAL.red);
    await this.tween(R, 480,290, 480,175, 900);
    const gateOrder = [0, 2, 1]; /* 文件 / OA / 数据库 */
    const coords = [[415,79],[545,79],[480,134]];
    for(let i=0;i<3;i++){
      const [gx,gy] = coords[i];
      await this.tween(R, +R.getAttribute("cx"), +R.getAttribute("cy"), gx, gy+26, 500);
      this.flashGate(gateOrder[i], false);
      this.cap(gx, gy-30, "持续验证: 设备不合规 ✗", PAL.red);
      await wait(260);
    }
    this.cap(480, 45, "每次请求都被独立验证 —— 横向移动被阻断", PAL.grn);
    this.cap(480, 62, "⚠ 告警已触发: 异常访问模式 → 自动降权", PAL.amb);
  }
}

/* ================================================================
   §16 ATT&CK 战术链
   ================================================================ */
class AttackViz{
  constructor(){
    const data = [
      ["TA0043","侦察","收集目标信息 — OSINT、域名、员工"],
      ["TA0042","资源开发","准备基础设施：域名、服务器、工具、恶意签名"],
      ["TA0001","初始访问","进入目标网络：钓鱼、漏洞利用、供应链、有效账户"],
      ["TA0002","执行","运行恶意代码：恶意脚本、PowerShell、计划任务"],
      ["TA0003","持久化","维持访问：启动项、新服务、后门账号、映像劫持"],
      ["TA0004","权限提升","获取更高权限：SUID 滥用、令牌窃取、内核漏洞"],
      ["TA0005","防御规避","绕过检测：混淆、卸载 EDR、日志清除(1102!)"],
      ["TA0006","凭据访问","窃取凭据：LSASS 内存、Kerberoasting、密码喷洒"],
      ["TA0007","发现","探索环境：网络扫描、账号枚举、域信息收集"],
      ["TA0008","横向移动","跳板其他主机：Pass-the-Hash、RDP、WinRM、SMB"],
      ["TA0009","收集","汇聚目标数据：邮箱、共享、屏幕截图"],
      ["TA0011","命令与控制","与 C2 通信：DNS 隧道、加密信道、合法云服务"],
      ["TA0010","数据渗出","外传数据：压缩加密、分块、夹带在正常流量"],
      ["TA0040","影响","达成目的：勒索加密、破坏、挖矿、断服务"],
    ];
    const strip = $("#attackBody");
    this.note = $("#attackNote");
    /* 日间模式用更深的色相亮度，保证白底可读 */
    const L = document.documentElement.dataset.theme === "light" ? 32 : 70;
    strip.innerHTML = `<div class="atk-strip">${data.map(([id,name],i) => {
      const hue = 190 + i * (150/13);
      return `<div class="atk-chip" data-i="${i}" style="color:hsl(${hue},80%,${L}%)">
        <div class="an">${name}</div>
        <div class="at">${id}</div>
        <div class="az">${i+1}/14</div>
      </div>`;
    }).join("")}</div>`;

    $$(".atk-chip", strip).forEach(c => {
      c.onclick = () => {
        $$(".atk-chip", strip).forEach(x => x.classList.remove("active"));
        c.classList.add("active");
        const [id,name,desc] = data[+c.dataset.i];
        this.note.innerHTML = `<strong>${name} · ${id}</strong> —— ${desc}。检测价值：<strong>TTP 比 IOC 稳定</strong>，攻击者换 IP 容易，改行为模式很难。`;
      };
    });
  }
}
