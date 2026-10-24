/* ================================================================
   SEC·ATLAS · viz-l1.js
   阶段一可视化模块（8 个）:
     EncapViz      §01 数据封装动画
     TCPViz        §02 TCP 三次握手 / 四次挥手 / SYN Flood
     DNSViz        §03 DNS 迭代解析
     TLSViz        §04 TLS 1.3 握手 + RTT 对比
     PermViz       §05 Linux 权限位实验台
     ILViz         §06 Windows 完整性级别
     SQLViz        §07 SQL 注入实验室
     PipelineViz   §08 请求全链路管线
   依赖: utils.js · theme.js · sequence.js
   约定: 常驻按钮统一用 onclick 赋值（主题切换重绘时不会重复绑定）
   ================================================================ */
"use strict";

/* ================================================================
   §01 封装动画
   ================================================================ */
class EncapViz{
  constructor(){
    this.body = $("#encapBody");
    this.mode = "down";
    this.playing = false;
    /* 各层头部：颜色用调色板键 */
    this.headers = [
      {tag:"ETH", color:"vio", layer:"数据链路层", pdu:"帧"},
      {tag:"IP",  color:"cyn", layer:"网络层",     pdu:"包"},
      {tag:"TCP", color:"amb", layer:"传输层",     pdu:"段"},
    ];
    this.layers = [
      {name:"应用层", pdu:"报文"},
      {name:"传输层", pdu:"段"},
      {name:"网络层", pdu:"包"},
      {name:"数据链路层", pdu:"帧"},
    ];
    this.render(0);

    $("#encapPlay").onclick = () => this.play();
    $("#encapReset").onclick = () => { this.render(0); };
    $("#encapSeg").onclick = e => {
      const b = e.target.closest(".seg-btn");
      if(!b) return;
      $$("#encapSeg .seg-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      this.mode = b.dataset.mode;
      this.render(0);
    };
  }
  /* level 0..3 = 已加的头数（发送视角） */
  render(level){
    const isDown = this.mode === "down";
    const n = isDown ? level : 3 - level;
    let segs = [{tag:"DATA", color:"grn"}];
    for(let i=0;i<n;i++) segs.unshift(this.headers[i]);
    const layerIdx = isDown ? level : 3 - level;
    const pduName = this.layers[Math.min(layerIdx,3)].pdu;
    this.body.innerHTML = `
      <div class="encap-wrap">
        <div class="encap-layers">
          ${this.layers.map((L,i) => `<div class="elayer ${i===layerIdx?"on":""}"><span>${L.name}</span><span class="pdu">${L.pdu}</span></div>`).join("")}
        </div>
        <div class="encap-stage">
          <div class="pkt-bar">${segs.map(s => `<div class="pkt-seg" style="background:${PAL[s.color]||s.color}">${s.tag}</div>`).join("")}</div>
          <div class="encap-pdu">${isDown ? "↓ 发送方向 · " : "↑ 接收方向 · "}当前 PDU：<b>${pduName}</b></div>
        </div>
      </div>`;
  }
  async play(){
    if(this.playing) return;
    this.playing = true;
    const btn = $("#encapPlay");
    btn.disabled = true;
    for(const s of [1,2,3]){
      this.render(s);
      await wait(850);
    }
    btn.disabled = false;
    this.playing = false;
  }
}

/* ================================================================
   §02 TCP 时序（三种模式）
   ================================================================ */
const TCP_CFG = {
  hs: {
    height: 300,
    actors: [{id:"C",label:"客户端",sub:"CLIENT"},{id:"S",label:"服务器",sub:"SERVER"}],
    notes: [
      "客户端发送 SYN 并进入 SYN_SENT，携带初始序号 seq=x",
      "服务器回复 SYN+ACK，确认 x+1 并带上自己的 seq=y，进入 SYN_RCVD（半连接）",
      "客户端回 ACK 确认 y+1 —— 双方的收发能力都已确认，连接 ESTABLISHED"
    ],
    steps: [
      {from:"C",to:"S",label:"SYN  seq=x",color:"cyn",states:{C:["SYN_SENT"]},pre:v=>v.setState("S","LISTEN",true)},
      {from:"S",to:"C",label:"SYN+ACK  seq=y, ack=x+1",color:"grn",states:{S:["SYN_RCVD"]}},
      {from:"C",to:"S",label:"ACK  ack=y+1",color:"cyn",states:{C:["ESTABLISHED"],S:["ESTABLISHED"]}},
    ]
  },
  fv: {
    height: 340,
    actors: [{id:"C",label:"主动关闭方",sub:"ACTIVE CLOSE"},{id:"S",label:"被动关闭方",sub:"PASSIVE CLOSE"}],
    notes: [
      "为什么四次？TCP 是全双工，两个方向分别关闭",
      "服务器可能还有数据要发，先回 ACK，进入 CLOSE_WAIT 等应用调 close()",
      "服务器数据发完，发送自己的 FIN，进入 LAST_ACK",
      "客户端回最后 ACK 后进入 TIME_WAIT —— 等 2MSL 再彻底关闭"
    ],
    steps: [
      {from:"C",to:"S",label:"FIN  seq=u",color:"amb",states:{C:["FIN_WAIT_1"]}},
      {from:"S",to:"C",label:"ACK  ack=u+1",color:"grn",states:{C:["FIN_WAIT_2"],S:["CLOSE_WAIT"]}},
      {from:"S",to:"C",label:"FIN  seq=w",color:"amb",states:{S:["LAST_ACK"]}},
      {from:"C",to:"S",label:"ACK  ack=w+1",color:"cyn",states:{C:["TIME_WAIT 2MSL"],S:["CLOSED"]}},
    ]
  },
  flood: {
    height: 320,
    actors: [
      {id:"A",label:"攻击者",sub:"ATTACKER"},
      {id:"S",label:"服务器",sub:"SERVER"},
      {id:"V",label:"正常用户",sub:"VICTIM"}
    ],
    notes: [
      "攻击者伪造大量不存在的源 IP 发送 SYN —— 服务器为每个半连接分配状态、等待永远不会来的 ACK",
      "半连接队列被占满（红色指示条）—— 服务器再也无法接受新连接",
      "正常用户的 SYN 石沉大海：连接超时。这就是拒绝服务 —— 不需要攻破任何东西，只需耗尽资源"
    ],
    steps: [
      {
        from:"A",to:"S",color:"red",flood:{count:16},label:"SYN ×N (伪造源IP)",
        states:{S:["SYN_RCVD ×N"]},
        pre:v=>{
          const x = v.colX(1);
          const g = svgEl("g",{class:"sv-dyn"},v.svg);
          svgEl("rect",{x:x-52,y:64,width:104,height:8,rx:4,fill:"rgba(255,93,115,.15)",stroke:PAL.red,"stroke-width":1},g);
          const bar = svgEl("rect",{x:x-52,y:64,width:0,height:8,rx:4,fill:PAL.red},g);
          bar.style.transition = "width 2.6s linear";
          setTimeout(()=>bar.setAttribute("width",104),100);
          svgEl("text",{class:"sv-note-txt",x,y:60,"text-anchor":"middle",fill:PAL.red},g).textContent = "半连接队列";
        }
      },
      {from:"A",to:"S",color:"red",flood:{count:14},states:{S:["队列已满 ✗"]}},
      {from:"V",to:"S",label:"SYN（正常请求）",color:"grn",reject:2,states:{V:["超时 ✗"]}},
    ]
  }
};

class TCPViz{
  constructor(){
    this.body = $("#tcpBody");
    this.note = $("#tcpNote");
    this.mode = "hs";
    this.build("hs");

    $("#tcpSeg").onclick = e => {
      const b = e.target.closest(".seg-btn");
      if(!b) return;
      $$("#tcpSeg .seg-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      this.mode = b.dataset.mode;
      this.build(this.mode);
    };
    $("#tcpPlay").onclick = () => {
      if(!this.viz) return;
      this.viz.play((st,i) => {
        this.note.innerHTML = `<strong>${TCP_CFG[this.mode].notes[i]}</strong>`;
      });
    };
    $("#tcpReset").onclick = () => {
      this.viz.reset();
      this.note.textContent = "已重置。点击「播放」观察报文流动与状态机迁移。";
    };
  }
  build(mode){
    this.body.innerHTML = "";
    const cfg = TCP_CFG[mode];
    this.viz = new SequenceViz({mount:this.body, actors:cfg.actors, height:cfg.height, steps:cfg.steps});
    this.note.textContent = mode === "flood"
      ? "这个模式演示 SYN Flood：观察半连接队列如何被伪造的 SYN 占满，正常用户被拒之门外。"
      : "点击「播放」观察报文流动与双方状态机的迁移。";
  }
}

/* ================================================================
   §03 DNS 解析
   ================================================================ */
class DNSViz{
  constructor(){
    this.body = $("#dnsBody");
    this.note = $("#dnsNote");
    const actors = [
      {id:"B",label:"浏览器",sub:"CLIENT"},
      {id:"L",label:"本地DNS",sub:"RECURSIVE"},
      {id:"R",label:"根服务器",sub:"ROOT ."},
      {id:"T",label:".com",sub:"TLD"},
      {id:"Z",label:"权威DNS",sub:"AUTHORITATIVE"},
    ];
    const notes = [
      "① 浏览器缓存 / OS 缓存 / hosts 全部未命中，询问本地 DNS（<strong>递归查询</strong>：你帮我查到底）",
      "② 本地 DNS 也没有缓存，开始<strong>迭代查询</strong>：先问根服务器「.com 的服务器在哪？」",
      "③ 根服务器不认识 www.example.com，但它知道 .com 归谁管 —— 返回推荐（referral）",
      "④ 问 .com 顶级域服务器：example.com 的权威服务器在哪？",
      "⑤ .com 返回 example.com 权威 NS 的地址",
      "⑥ 终于问到权威服务器：www.example.com 的 A 记录是什么？",
      "⑦ 权威服务器返回 93.184.216.34；本地 DNS 按 TTL 缓存结果",
      "⑧ 本地 DNS 把 IP 返回浏览器 —— 之后才是 TCP 三次握手（§02）",
    ];
    const steps = [
      {from:"B",to:"L",label:"www.example.com?",color:"cyn",states:{L:["缓存 MISS"]}},
      {from:"L",to:"R",label:"迭代: 查 .com",color:"cyn"},
      {from:"R",to:"L",label:"→ 去问 .com",color:"grn"},
      {from:"L",to:"T",label:"查 example.com",color:"cyn"},
      {from:"T",to:"L",label:"→ 去问权威NS",color:"grn"},
      {from:"L",to:"Z",label:"www 的 A 记录?",color:"cyn"},
      {from:"Z",to:"L",label:"93.184.216.34",color:"grn",states:{L:["缓存 (TTL)"]}},
      {from:"L",to:"B",label:"93.184.216.34",color:"grn"},
    ];
    this.viz = new SequenceViz({mount:this.body, actors, height:420, steps});

    $("#dnsPlay").onclick = () => this.viz.play((st,i) => { this.note.innerHTML = notes[i]; });
    $("#dnsReset").onclick = () => {
      this.viz.reset();
      this.note.textContent = "已重置。点击「播放解析」开始旅程。";
    };
  }
}

/* ================================================================
   §04 TLS 握手 + RTT 对比
   ================================================================ */
class TLSViz{
  constructor(){
    this.body = $("#tlsBody");
    const actors = [
      {id:"C",label:"客户端",sub:"CLIENT"},
      {id:"S",label:"服务器",sub:"SERVER"}
    ];
    const steps = [
      {from:"C",to:"S",label:"ClientHello + key_share",color:"cyn",states:{C:["hello"]}},
      {from:"S",to:"C",label:"ServerHello + key_share",color:"grn"},
      {from:"S",to:"C",label:"{Certificate, Finished} 🔒",color:"vio",states:{S:["encrypted"]}},
      {from:"C",to:"S",label:"Finished 🔒",color:"vio",states:{C:["1-RTT ✓"]}},
      {from:"C",to:"S",label:"GET /product?id=42 🔒",color:"grn"},
    ];
    this.viz = new SequenceViz({mount:this.body, actors, height:360, steps});

    $("#tlsPlay").onclick = () => this.viz.play();
    $("#tlsReset").onclick = () => this.viz.reset();

    /* RTT 对比条（纯 CSS 上色，随主题切换） */
    $("#rttBars").innerHTML = `
      <div class="rtt-row"><span>tls 1.2</span><div class="rtt-bar" style="width:100%;background:var(--line2);box-shadow:none"></div><span>2-RTT</span></div>
      <div class="rtt-row"><span style="color:var(--grn)">tls 1.3</span><div class="rtt-bar" style="width:50%"></div><span style="color:var(--grn)">1-RTT</span></div>
      <div class="rtt-row"><span style="color:var(--cyn)">0-rtt 恢复</span><div class="rtt-bar" style="width:14%"></div><span style="color:var(--cyn)">0-RTT</span></div>`;
  }
}

/* ================================================================
   §05 权限实验台
   ================================================================ */
class PermViz{
  constructor(){
    this.body = $("#permBody");
    this.sp = {suid:0, sgid:0, sticky:0};
    this.bits = {owner:[1,1,1], group:[1,0,1], other:[1,0,0]};
    this.render();

    /* 事件委托 + onclick 赋值：重绘/主题切换都不会重复绑定 */
    this.body.onclick = e => {
      const b = e.target.closest("[data-bit]");
      if(!b) return;
      const [scope, idx] = b.dataset.bit.split(":");
      if(scope === "sp") this.sp[idx] ^= 1;
      else this.bits[scope][+idx] ^= 1;
      this.render();
    };
    $$("[data-preset]").forEach(btn => {
      btn.onclick = () => {
        const p = btn.dataset.preset;
        const s = p.length === 4 ? p[0] : "0";
        const o = p.length === 4 ? p.slice(1) : p;
        const spv = parseInt(s, 10);
        this.sp = {suid:(spv & 4)?1:0, sgid:(spv & 2)?1:0, sticky:(spv & 1)?1:0};
        const d = v => [(v & 4)?1:0, (v & 2)?1:0, (v & 1)?1:0];
        this.bits.owner = d(+o[0]);
        this.bits.group = d(+o[1]);
        this.bits.other = d(+o[2]);
        this.render();
      };
    });
  }
  octal(){
    const g = b => b[0]*4 + b[1]*2 + b[2]*1;
    const spv = this.sp.suid*4 + this.sp.sgid*2 + this.sp.sticky;
    return (spv ? String(spv) : "") + g(this.bits.owner) + g(this.bits.group) + g(this.bits.other);
  }
  lsStr(){
    const grp = (b, sp) => {
      let s = (b[0]?"r":"-") + (b[1]?"w":"-") + (b[2]?"x":"-");
      if(sp === "suid" || sp === "sgid") s = s.slice(0,2) + (b[2]?"s":"S");
      if(sp === "sticky") s = s.slice(0,2) + (b[2]?"t":"T");
      return s;
    };
    return "-" + grp(this.bits.owner, this.sp.suid ? "suid" : null)
             + grp(this.bits.group, this.sp.sgid ? "sgid" : null)
             + grp(this.bits.other, this.sp.sticky ? "sticky" : null);
  }
  flags(){
    const f = [];
    if(this.sp.suid) f.push(["⚠", "SUID：运行时 EUID = 属主。若属主为 root 且程序可被滥用（GTFOBins）= 直接 root Shell", "var(--red)"]);
    if(this.sp.sgid) f.push(["⚠", "SGID：进程有效组 = 文件属组；放在目录上则继承属组", "var(--amb)"]);
    if(this.sp.sticky) f.push(["✓", "Sticky：仅属主可删除/重命名 —— /tmp 的保护机制", "var(--grn)"]);
    if(this.bits.other[1]) f.push(["⚠", "other 可写：任何用户都能修改此文件 —— 常见错误配置", "var(--red)"]);
    if(!this.bits.other[0] && !this.bits.other[1] && !this.bits.other[2]){
      f.push(["✓", "other 无任何权限：仅属主与属组可访问（如 /etc/shadow 的思路）", "var(--grn)"]);
    }
    return f.slice(0, 4);
  }
  render(){
    const bitBtn = (scope, idx, label, on, sp) =>
      `<div class="pbit ${sp?"sp":""} ${on?"on":""}" data-bit="${scope}:${idx}">${label}</div>`;
    this.body.innerHTML = `
      <div class="perm-wrap">
        <div class="pgrid">
          <div class="prow"><span class="plab">特殊位</span>
            ${bitBtn("sp","suid","SUID",this.sp.suid,1)}${bitBtn("sp","sgid","SGID",this.sp.sgid,1)}${bitBtn("sp","sticky","Sticky",this.sp.sticky,1)}</div>
          <div class="prow"><span class="plab">owner 属主</span>
            ${["r","w","x"].map((l,i)=>bitBtn("owner",i,l,this.bits.owner[i])).join("")}</div>
          <div class="prow"><span class="plab">group 属组</span>
            ${["r","w","x"].map((l,i)=>bitBtn("group",i,l,this.bits.group[i])).join("")}</div>
          <div class="prow"><span class="plab">other 其他</span>
            ${["r","w","x"].map((l,i)=>bitBtn("other",i,l,this.bits.other[i])).join("")}</div>
        </div>
        <div>
          <div class="perm-sub">ls -l 显示</div>
          <div class="perm-ls">${this.lsStr()}</div>
          <div class="perm-sub" style="margin-top:14px">chmod 八进制</div>
          <div class="perm-oct">${this.octal()}</div>
          <div class="perm-flags">
            ${this.flags().map(f => `<div class="pf" style="color:${f[2]}"><span class="s">${f[0]}</span><span style="color:var(--tx2)">${f[1]}</span></div>`).join("")
              || `<div class="pf" style="color:var(--tx3)"><span class="s">·</span>无特殊标记 —— 常规权限组合</div>`}
          </div>
        </div>
      </div>`;
  }
}

/* ================================================================
   §06 完整性级别阶梯
   ================================================================ */
class ILViz{
  constructor(){
    const rows = [
      {n:"Untrusted · 0",   w:"14%",  k:"tx3", d:"极低信任"},
      {n:"Low · 4096",      w:"34%",  k:"cyn", d:"沙箱进程 · 浏览器渲染"},
      {n:"Medium · 8192",   w:"56%",  k:"grn", d:"普通用户进程（默认）"},
      {n:"High · 12288",    w:"78%",  k:"amb", d:"提权后的管理员"},
      {n:"System · 16384",  w:"100%", k:"red", d:"SYSTEM 服务 · LSASS(PPL)"},
    ];
    $("#ilLadder").innerHTML = rows.map((r,i) => `
      <div class="ilrow">
        <span class="ilname" style="color:${PAL[r.k]}">${r.n}</span>
        <div class="ilbar" style="width:${r.w};background:linear-gradient(90deg,${PAL[r.k]},transparent);animation-delay:${i*0.12}s"></div>
        <span class="ildesc">${r.d}</span>
      </div>`).join("") +
      `<div style="margin-top:14px;font-family:var(--f-mono);font-size:12px;color:var(--tx3)">
        ↑ 规则：<span style="color:var(--red)">低完整性进程 不能写 高完整性对象</span> —— 即使 ACL 允许</div>`;
  }
}

/* ================================================================
   §07 SQL 注入实验室
   ================================================================ */
class SQLViz{
  constructor(){
    this.body = $("#sqlBody");
    this.note = $("#sqlNote");
    this.mode = "normal";
    this.render();
    $("#sqlSeg").onclick = e => {
      const b = e.target.closest(".seg-btn");
      if(!b) return;
      $$("#sqlSeg .seg-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      this.mode = b.dataset.mode;
      this.render();
    };
  }
  render(){
    const kw = t => `<span class="sql-kw">${t}</span>`;
    if(this.mode === "normal"){
      this.body.innerHTML = `
        <div class="sql-box">${kw("SELECT * FROM")} users ${kw("WHERE")} id = <span class="sql-str">'42'</span></div>
        <div class="sql-res ok">→ 返回 1 行（id=42 的用户）✓ 输入只是一个值</div>`;
      this.note.innerHTML = "正常输入：<strong>42</strong> 被包在引号里，只是一段数据。";
    }else if(this.mode === "inject"){
      const input = "1' OR '1'='1";
      this.body.innerHTML = `
        <div class="sql-box">
          用户输入: <span class="sql-str">'${input}'</span><br>
          ${kw("SELECT * FROM")} users ${kw("WHERE")} id = '<span class="sql-str">1</span><span class="sql-inj">' OR '1'='1</span>'
        </div>
        <div class="sql-res bad">→ WHERE id='1' OR '1'='1' —— 恒真！返回<strong>全部用户</strong> ✗ 越权读取</div>`;
      this.note.innerHTML = "注入输入：第一个 <code>'</code> <strong>闭合了字符串</strong>，之后的 <code>OR '1'='1</code> 不再是数据——它被数据库当作<strong>代码</strong>执行（红色部分）。";
    }else{
      this.body.innerHTML = `
        <div class="sql-box">
          ${kw("SELECT * FROM")} users ${kw("WHERE")} id = <span class="sql-par">?</span><br>
          <span class="sql-note-dim">-- 绑定参数:</span> <span class="sql-str">'1' OR '1'='1'</span> <span class="sql-note-dim">（作为整体值）</span>
        </div>
        <div class="sql-res ok">→ 返回 0 行 ✓ 无论输入什么，它永远只是数据</div>`;
      this.note.innerHTML = "参数化查询：SQL <strong>结构</strong>与<strong>数据</strong>从根上分离。同样的恶意输入，现在只是一个找不到匹配的字符串。";
    }
  }
}

/* ================================================================
   §08 请求全链路
   ================================================================ */
class PipelineViz{
  constructor(){
    this.stages = [
      {icon:"globe",   name:"URL 解析", desc:"拆解协议 https、主机 shop.example.com、路径 /product、参数 id=42。", atk:["钓鱼链接","开放重定向"]},
      {icon:"book",    name:"DNS 解析", desc:"缓存 → hosts → 递归 → 根 → .com → 权威，拿到 IP 203.0.113.10（§03）。", atk:["DNS 劫持","缓存投毒","子域接管"]},
      {icon:"zap",     name:"TCP 建连", desc:"三次握手，目标端口 443（§02）。", atk:["SYN Flood","端口扫描"]},
      {icon:"lock",    name:"TLS 握手", desc:"ClientHello(key_share) → 证书链验证 → 密钥协商，1-RTT 建立加密通道（§04）。", atk:["降级攻击","中间人","证书伪造"]},
      {icon:"laptop",  name:"HTTP 请求", desc:"GET /product?id=42，携带 Cookie、User-Agent 等头部。", atk:["注入尝试","CSRF"]},
      {icon:"shield",  name:"WAF/CDN", desc:"云 WAF 检查特征、CDN 缓存静态资源、负载均衡分发到后端。", atk:["请求走私","路径穿越","XFF 伪造"]},
      {icon:"server",  name:"应用处理", desc:"路由匹配 → 鉴权（Session/Token）→ 业务逻辑 → 生成 SQL。", atk:["SQL 注入","XSS","越权 IDOR","逻辑漏洞"]},
      {icon:"database",name:"数据库", desc:"SELECT ... WHERE id = 42 —— B+ 树索引加速查询。", atk:["注入","未授权访问","备份泄露"]},
      {icon:"eye",     name:"浏览器渲染", desc:"解析 HTML → 加载 CSS/JS/图片（可能又是多次请求）→ 执行 JS → 渲染。", atk:["XSS","点击劫持","CORS 错配"]},
    ];
    this.idx = -1;
    this.timer = null;
    this.body = $("#pipeBody");
    this.body.innerHTML = `
      <div class="pipe-track" id="pipeTrack">
        ${this.stages.map((s,i) => `
          <div class="pipe-node" data-i="${i}">
            <div class="pn-dot">${iconSVG(s.icon,18)}</div>
            <div class="pn-num">0${i+1}</div>
            <div class="pn-name">${s.name}</div>
          </div>${i < this.stages.length-1 ? `<div class="pipe-link" data-l="${i}"></div>` : ""}`).join("")}
      </div>`;
    $$(".pipe-node", this.body).forEach(n => {
      n.onclick = () => { this.stop(); this.go(+n.dataset.i); };
    });
    $("#pipePrev").onclick = () => { this.stop(); this.go(Math.max(0, this.idx-1)); };
    $("#pipeNext").onclick = () => { this.stop(); this.go(Math.min(this.stages.length-1, this.idx+1)); };
    $("#pipeAuto").onclick = () => this.auto();
    this.go(0);
  }
  go(i){
    this.idx = i;
    $$(".pipe-node", this.body).forEach((n,k) => {
      n.classList.toggle("active", k === i);
      n.classList.toggle("done", k < i);
    });
    $$(".pipe-link", this.body).forEach(l => l.classList.toggle("lit", +l.dataset.l < i));
    const s = this.stages[i];
    $("#pipeDetail").innerHTML = `
      <div class="pipe-detail-title">0${i+1} · ${s.name}</div>
      <div class="pipe-detail-desc">${s.desc}</div>
      <div>${s.atk.map(a => `<span class="pipe-atk-tag">⚠ ${a}</span>`).join("")}</div>`;
  }
  auto(){
    if(this.timer){ this.stop(); return; }
    $("#pipeAuto").innerHTML = iconSVG("x",13) + "停止";
    this.timer = setInterval(() => this.go((this.idx+1) % this.stages.length), 2100);
  }
  stop(){
    if(this.timer){ clearInterval(this.timer); this.timer = null; }
    $("#pipeAuto").innerHTML = iconSVG("play",13) + "自动巡航";
  }
}
