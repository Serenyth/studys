/* ================================================================
   SEC·ATLAS · viz-l6.js
   L6 应急响应与取证 可视化（一）：§61–§66
   依赖: utils.js（$/$$）、viz-kit.js（kpi/panel）、theme.js（PAL）
   ================================================================ */
"use strict";

/* ================= §61 事件响应框架：IR LOOP ================= */
class IrLoopViz{
  constructor(){
    this.body = $("#irLoopBody");
    this.sev = "P2";
    this.cur = 0;
    this.sevs = {
      P1: { nm:"P1 · 严重", t:"立即（15 分钟内）", who:"CTO + 安全负责人 + 法务 + PR", keep:"全程留证，对外口径统一", tone:"red",
            ex:"域控被拿下 / 核心数据正在外传 / 勒索已加密生产库" },
      P2: { nm:"P2 · 高", t:"1 小时内", who:"安全负责人 + 值班 + 系统 owner", keep:"留证，内部通报", tone:"amb",
            ex:"单台服务器确认失陷 / 高管账号异常登录" },
      P3: { nm:"P3 · 中", t:"4 小时内", who:"值班工程师", keep:"按常规留日志", tone:"cyn",
            ex:"可疑钓鱼邮件被点击但未执行 / 单机 EDR 告警已阻断" },
      P4: { nm:"P4 · 低", t:"1 个工作日内", who:"工单流转", keep:"无需专门留证", tone:"grn",
            ex:"扫描器误报 / 未成功的暴力破解" },
    };
    this.stages = [
      { k:"PREPARE", nm:"准备", q:"事发前你能用的东西，只有现在准备好的",
        out:["能力清单","工具包（离线可用）","Playbook + 授权人","联系人表（含法务/PR）"],
        bad:"没有离线工具包 → 断网后连采集工具都下不下来" },
      { k:"DETECT", nm:"检测与分析", q:"确认「真的发生了」并搞清「范围多大」",
        out:["事件确认（排除误报）","统一 UTC 的时间线","影响范围四向评估","攻击者所处阶段"],
        bad:"只看了告警那一台 → 漏掉跳板机与更早的入口" },
      { k:"CONTAIN", nm:"遏制·根除·恢复", q:"止损、清干净、让业务回来",
        out:["隔离（不是拔线）","持久化点清除","入口封堵","从可信基线重建"],
        bad:"只删样本不清持久化 → 攻击者第二天自动回来" },
      { k:"LEARN", nm:"事后活动", q:"把这次的钱，换成下次的准备",
        out:["复盘报告（时间线带证据源）","改进项分立即/一月/一季","检测规则沉淀","Playbook 修订"],
        bad:"报告写完就归档 → 同类事件半年后原样重演" },
    ];
    this.render();
    this.body.onclick = e => {
      const s = e.target.closest("[data-st]");
      if(s){ this.cur = +s.dataset.st; this.render(); return; }
      const b = e.target.closest("[data-sev]");
      if(b){ this.sev = b.dataset.sev; this.render(); }
    };
  }
  render(){
    const S = this.sevs[this.sev];
    const pill = `<div class="kpill">${Object.keys(this.sevs).map(k =>
      `<span class="pp ${this.sev===k?"on "+this.sevs[k].tone:""}" data-sev="${k}">${k}</span>`).join("")}</div>`;

    /* 环形四阶段：用绝对定位排布在圆上 */
    const R = 118, cx = 150, cy = 150;
    const nodes = this.stages.map((st,i) => {
      const a = (-90 + i*90) * Math.PI/180;
      const x = cx + R*Math.cos(a), y = cy + R*Math.sin(a);
      return `<button type="button" class="ir-node ${i===this.cur?"on":""}" data-st="${i}"
        style="left:${x}px;top:${y}px">
        <span class="ir-k">${st.k}</span><span class="ir-nm">${st.nm}</span></button>`;
    }).join("");

    const ring = `<svg class="ir-ring" viewBox="0 0 300 300" aria-hidden="true">
      <circle cx="150" cy="150" r="118" fill="none" stroke="${PAL.line2}" stroke-width="1.5" stroke-dasharray="4 6"/>
      <circle cx="150" cy="150" r="86" fill="none" stroke="${PAL.line}" stroke-width="1"/>
      <g class="ir-arrows">
        <path d="M150 32 A118 118 0 0 1 268 150" fill="none" stroke="${PAL.cyn}" stroke-width="2" opacity=".55"/>
        <path d="M268 150 A118 118 0 0 1 150 268" fill="none" stroke="${PAL.cyn}" stroke-width="2" opacity=".4"/>
        <path d="M150 268 A118 118 0 0 1 32 150" fill="none" stroke="${PAL.cyn}" stroke-width="2" opacity=".25"/>
        <path d="M32 150 A118 118 0 0 1 150 32" fill="none" stroke="${PAL.cyn}" stroke-width="2" opacity=".18"/>
      </g>
      <text x="150" y="142" text-anchor="middle" fill="${PAL.tx3}" font-size="11" font-family="monospace">INCIDENT</text>
      <text x="150" y="164" text-anchor="middle" fill="${PAL.cyn}" font-size="15" font-weight="700" font-family="monospace">LOOP</text>
    </svg>`;

    const st = this.stages[this.cur];
    const detail = `<div class="kpanel">
      <div class="p-ti">${st.k} · ${st.nm}</div>
      <div class="p-de">${st.q}</div>
      <div class="p-rows">
        ${st.out.map(o => `<div class="kp-row"><span class="kp-k">产出</span><span class="kp-v good">${o}</span></div>`).join("")}
      </div>
      <div class="ir-trap"><span class="lb">典型失手</span>${st.bad}</div>
    </div>`;

    this.body.innerHTML = `<div class="kit">
      <div class="ir-top">
        ${pill}
        <div class="ir-sev"><b class="t-${S.tone}">${S.nm}</b><span>${S.ex}</span></div>
      </div>
      <div class="ir-grid">
        <div class="ir-loop">${ring}${nodes}</div>
        <div class="ir-side">${detail}</div>
      </div>
      <div class="ir-meta">
        <div><span class="lb">响应时限</span><b>${S.t}</b></div>
        <div><span class="lb">谁被叫醒</span><b>${S.who}</b></div>
        <div><span class="lb">留证要求</span><b>${S.keep}</b></div>
      </div>
      <div class="ksub">分级不是"严重程度打分"，而是<b>决定谁被叫醒、多久必须动、能不能停机</b>。所以分级标准必须事前写死——事中再商量，等于把最贵的几分钟花在开会。</div>
    </div>`;
  }
}

/* ================= §62 准备阶段：READINESS SCORECARD ================= */
class ReadinessViz{
  constructor(){
    this.body = $("#readyBody");
    this.items = [
      { id:"asset", nm:"资产清单（含业务归属）", q:"出事时你知道该保护谁、该先救谁吗", w:14,
        miss:"无法判断影响范围，只能靠人回忆「这台机器是干嘛的」" },
      { id:"log", nm:"日志留存 ≥ 90 天", q:"攻击者三周前就进来了，你还有日志吗", w:16,
        miss:"只能看到最近几天，最关键的「入口」阶段永久丢失" },
      { id:"edr", nm:"EDR 覆盖率 ≥ 95%", q:"那 5% 没装的机器，恰好是跳板吗", w:14,
        miss:"进程级证据缺失，只能靠流量猜，时间线拼不完整" },
      { id:"flow", nm:"网络流量 / NetFlow 留存", q:"横向移动的证据在谁手里", w:11,
        miss:"无法证明「扩散到哪了」，范围评估只能靠猜" },
      { id:"tool", nm:"离线取证工具包（U 盘）", q:"断网之后，你的工具从哪来", w:11,
        miss:"现场只能「先重启试试」，内存证据全丢" },
      { id:"play", nm:"Playbook（≥3 类事件）", q:"凌晨三点，值班的人知道先做什么吗", w:12,
        miss:"每个人按自己理解操作，顺序错乱，二次破坏" },
      { id:"auth", nm:"决策授权人（写进 Playbook）", q:"谁敢拍板停机", w:10,
        miss:"没人敢决定，只能等天亮——而攻击者不等" },
      { id:"drill", nm:"近 12 个月演练过", q:"上一次真做是什么时候", w:12,
        miss:"纸上流程与真实操作脱节，第一次执行就在真实事件里" },
    ];
    this.on = new Set(["asset","log","edr","play"]);
    this.render();
    this.body.onclick = e => {
      const it = e.target.closest("[data-it]");
      if(!it) return;
      const id = it.dataset.it;
      if(this.on.has(id)) this.on.delete(id); else this.on.add(id);
      this.render();
    };
  }
  render(){
    const score = this.items.reduce((a,i) => a + (this.on.has(i.id) ? i.w : 0), 0);
    const lvl = score >= 85 ? ["可应战","good"] : score >= 60 ? ["勉强","amb"] : score >= 35 ? ["脆弱","amb"] : ["裸奔","bad"];

    const list = this.items.map(i => {
      const ok = this.on.has(i.id);
      return `<div class="ci ${ok?"on":""}" data-it="${i.id}">
        <span class="box ${ok?"on":""}">${ok?"✓":""}</span>
        <span class="ct">${i.nm}<small>${i.q}</small></span>
        <span class="lv">${i.w}</span>
      </div>`;
    }).join("");

    const gaps = this.items.filter(i => !this.on.has(i.id));
    const gapBox = gaps.length
      ? `<div class="l6-gap"><div class="gp-h">缺这一项，事中会发生什么</div>
          ${gaps.slice(0,3).map(g => `<div class="gp"><b>${g.nm}</b><span>${g.miss}</span></div>`).join("")}
          ${gaps.length > 3 ? `<div class="gp more">…还有 ${gaps.length-3} 项缺口</div>` : ""}</div>`
      : `<div class="l6-gap ok"><div class="gp-h">全部就位</div>
          <div class="gp"><b>接下来该做的不是加项，而是演练</b><span>清单齐全只说明「纸面上准备好了」，只有真跑一遍才知道第 3 步会不会卡住。</span></div></div>`;

    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>准备度自评</b> · 点条目切换「已就位 / 缺口」，看分数与后果</div>
      <div class="l6-two">
        <div class="kchk">${list}</div>
        <div class="l6-side">
          <div class="l6-score ${lvl[1]}">
            <div class="sc-v">${score}</div>
            <div class="sc-l">READINESS / 100</div>
            <div class="sc-b">${lvl[0]}</div>
          </div>
          ${gapBox}
        </div>
      </div>
      <div class="ksub">这 8 项里，<b>「日志留存」和「EDR 覆盖」权重最高</b>——因为它们是唯一「事后无法补救」的。工具包可以借，Playbook 可以临时写，但三周前的日志没了就是没了。</div>
    </div>`;
  }
}

/* ================= §63 检测与分析：TRIAGE & TIMELINE ================= */
class TriageViz{
  constructor(){
    this.body = $("#triageBody");
    this.cur = 0;
    this.utc = false;
    this.qs = [
      { q:"是真的吗", d:"先排除误报：是不是管理员在干活、是不是备份任务、是不是已知的业务行为",
        data:["告警原始字段","账号归属","同时间段的变更单"], out:"真 / 假 / 待定（不能确定就先按真的处理，但别惊动）" },
      { q:"哪台机器、什么时间", d:"资产重要性与时间点是否合理——凌晨三点财务机跑 PowerShell，和一个运维在加班跑脚本，权重完全不同",
        data:["CMDB 资产等级","登录时间基线","时区与 NTP 偏差"], out:"优先级 + 需要谁一起来看" },
      { q:"之前有没有相关告警", d:"单点还是链条。孤立告警可能是噪音，同一主机 30 分钟内三条不同类型的告警基本就是事件",
        data:["SIEM 关联查询","同主机 24h 告警","同账号 7d 登录"], out:"判断是否已进入攻击链中段" },
      { q:"主机上还有别的异常吗", d:"进程树、父进程、签名、命令行、外联地址、计划任务、新增账号——一次把主机侧证据扫完",
        data:["进程树 / 父进程","签名与命令行","计划任务与服务","外联连接"], out:"本地失陷的置信度与手法判断" },
      { q:"往外扩散了吗", d:"同网段、同账号、同漏洞面。这一步决定你是「处置一台」还是「处置一片」",
        data:["同网段扫描记录","同账号登录","SMB / RDP 连接","入口日志（Web/VPN/邮件）"], out:"影响范围 + 是否需要升级分级" },
    ];
    this.render();
    this.body.onclick = e => {
      const s = e.target.closest("[data-q]");
      if(s){ this.cur = +s.dataset.q; this.render(); return; }
      const t = e.target.closest("[data-utc]");
      if(t){ this.utc = !this.utc; this.render(); }
    };
  }
  /* 三台设备的时间偏差：统一 UTC 后顺序会翻转 */
  render(){
    const q = this.qs[this.cur];
    const steps = this.qs.map((x,i) => `
      <div class="tq ${i===this.cur?"on":""}" data-q="${i}">
        <span class="n">${i+1}</span><span class="t">${x.q}</span>
      </div>`).join("");

    /* 原始时间（本地时区 + 偏差） vs 统一 UTC */
    const ev = this.utc
      ? [["09:12:04","FW","防火墙放行 445 出站"],["09:12:31","DC","4624 类型 3 登录"],["09:13:02","WS","服务 7045 创建"]]
      : [["09:13:02","WS","服务 7045 创建"],["09:12:31","DC","4624 类型 3 登录"],["09:12:04","FW","防火墙放行 445 出站"]];

    const tl = ev.map((e,i) => `
      <div class="tl-row" style="animation-delay:${i*90}ms">
        <span class="tl-t">${e[0]}</span>
        <span class="tl-dot ${e[1]==="WS"?"hot":""}"></span>
        <span class="tl-src">${e[1]}</span>
        <span class="tl-ev">${e[2]}</span>
      </div>`).join("");

    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>研判五问</b> · 顺序不能乱：先确认「真的」，再谈「多大」</div>
      <div class="l6-two">
        <div class="tqs">${steps}</div>
        <div class="kpanel">
          <div class="p-ti">${q.q}</div>
          <div class="p-de">${q.d}</div>
          <div class="p-rows">
            ${q.data.map(d => `<div class="kp-row"><span class="kp-k">看这里</span><span class="kp-v">${d}</span></div>`).join("")}
          </div>
          <div class="ir-trap good"><span class="lb">产出</span>${q.out}</div>
        </div>
      </div>

      <div class="tl-wrap">
        <div class="tl-head">
          <b>时间线 · 三台设备同一段事件</b>
          <button type="button" class="tl-btn ${this.utc?"on":""}" data-utc="1">
            ${this.utc ? "已统一到 UTC" : "统一到 UTC"}
          </button>
        </div>
        <div class="tl">${tl}</div>
        <div class="tl-note ${this.utc?"ok":""}">
          ${this.utc
            ? "<b>统一之后：</b>防火墙先放行 445 → 域控记录登录 → 工作站创建服务。因果顺序是「横向移动 → 落地执行」，讲得通。"
            : "<b>没统一时：</b>看起来「工作站先创建服务，然后域控才登录，最后防火墙才放行」——因果完全讲反了。实际上只是工作站时钟快了 58 秒。<b>几分钟的偏差，足以把因果讲反。</b>"}
        </div>
      </div>

      <div class="ksub">三个陷阱里最阴的是<b>时钟偏差</b>：它不像时区那样一眼能看出来，而是让时间线「看起来完全合理、但顺序是错的」。处置办法很土但有效——<b>采集时就把每台机器的系统时间与 NTP 偏差一起记下来</b>，事后再补就无从考证了。</div>
    </div>`;
  }
}

/* ================= §64 遏制·根除·恢复：CONTAINMENT MATRIX ================= */
class ContainViz{
  constructor(){
    this.body = $("#containBody");
    this.cur = 2;
    this.opts = [
      { nm:"仅加强监控", block:12, cost:3, evid:0, lat:"秒级可逆",
        good:"不惊动攻击者，可以观察他的下一步；零业务影响",
        bad:"攻击者仍在外传数据、仍可横向——你只是在看",
        use:"还没确认范围、需要「放长线」摸清全貌时" },
      { nm:"账号禁用 / 改密", block:38, cost:22, evid:8, lat:"分钟级",
        good:"切断凭据复用，成本低；能立刻阻断横向的账号路径",
        bad:"攻击者若已建后门账号，禁一个不影响；改密会触发大面积重登",
        use:"确认是凭据滥用、且尚未确认主机层后门时" },
      { nm:"主机网络隔离（ACL/EDR 隔离）", block:82, cost:34, evid:14, lat:"分钟级可逆",
        good:"阻断 C2 与横向，同时保留 EDR 通道继续观测——「看得见地隔离」",
        bad:"若该主机是唯一入口/唯一数据库，业务会立刻受影响",
        use:"确认单机失陷、需要一边取证一边止损——<b>最常用的选择</b>" },
      { nm:"网段隔离", block:93, cost:62, evid:26, lat:"小时级",
        good:"阻断整片横向，适合已扩散但未定位到具体主机",
        bad:"影响面大，容易误伤；跨段业务中断需要业务方签字",
        use:"确认已多点失陷、单机隔离已不够时" },
      { nm:"拔网线 / 关机", block:100, cost:78, evid:88, lat:"不可逆",
        good:"绝对阻断；对勒索病毒的加密扩散最有效",
        bad:"内存证据全丢、攻击者被惊动会触发破坏逻辑；无法再观测",
        use:"<b>最后手段</b>：勒索正在加密、或攻击者正在实时破坏数据" },
    ];
    this.render();
    this.body.onclick = e => {
      const b = e.target.closest("[data-op]");
      if(!b) return;
      this.cur = +b.dataset.op;
      this.render();
    };
  }
  render(){
    const rows = this.opts.map((o,i) => `
      <button type="button" class="cm-row ${i===this.cur?"on":""}" data-op="${i}">
        <span class="cm-nm">${o.nm}</span>
        <span class="cm-bars">
          <i class="b1" style="width:${o.block}%"></i>
        </span>
        <span class="cm-bars"><i class="b2" style="width:${o.cost}%"></i></span>
        <span class="cm-bars"><i class="b3" style="width:${o.evid}%"></i></span>
      </button>`).join("");

    const o = this.opts[this.cur];
    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>遏制手段矩阵</b> · 点一行，看它的三重代价</div>
      <div class="cm-head">
        <span>手段</span><span class="h1">阻断力</span><span class="h2">业务代价</span><span class="h3">证据损失</span>
      </div>
      <div class="cm-list">${rows}</div>
      <div class="kpanel" style="margin-top:16px">
        <div class="p-ti">${o.nm}</div>
        <div class="p-de">可逆性：${o.lat}</div>
        <div class="p-rows">
          <div class="kp-row"><span class="kp-k">收益</span><span class="kp-v good">${o.good}</span></div>
          <div class="kp-row"><span class="kp-k">代价</span><span class="kp-v bad">${o.bad}</span></div>
          <div class="kp-row"><span class="kp-k">适用</span><span class="kp-v">${o.use}</span></div>
        </div>
      </div>
      <div class="ksub">注意第三列：<b>证据损失</b>。这是最容易被忽略的一栏——很多处置动作在「止损」上是对的，在「取证」上是灾难性的。<b>正确顺序永远是：先取易失证据，再遏制。</b>例外只有一个：攻击者正在实时加密或外传，此时止损优先于取证。</div>
    </div>`;
  }
}

/* ================= §65 主机取证：VOLATILITY LAB ================= */
class MemViz{
  constructor(){
    this.body = $("#memBody");
    this.hide = false;      /* 是否显示「已退出/隐藏」进程 */
    this.plug = "pslist";
    this.layers = [
      ["CPU 寄存器 / 缓存", "纳秒", 3],
      ["内存（RAM）", "断电即失", 12],
      ["网络连接 / ARP / 路由", "分钟～小时", 22],
      ["运行中的进程", "随进程结束", 32],
      ["磁盘（临时文件、日志）", "天～月", 62],
      ["远程日志 / SIEM", "月～年", 84],
      ["备份 / 归档", "年", 96],
    ];
    this.render();
    this.body.onclick = e => {
      const t = e.target.closest("[data-hide]");
      if(t){ this.hide = !this.hide; this.render(); return; }
      const p = e.target.closest("[data-plug]");
      if(p){ this.plug = p.dataset.plug; this.render(); }
    };
  }
  render(){
    const ladder = this.layers.map((l,i) => `
      <div class="ml-row" style="--w:${l[2]}%">
        <span class="ml-i">${i+1}</span>
        <span class="ml-n">${l[0]}</span>
        <span class="ml-b"><i style="width:${l[2]}%"></i></span>
        <span class="ml-v">${l[1]}</span>
      </div>`).join("");

    const procs = this.plug === "pslist"
      ? [
          ["712","svchost.exe","0x1a2b","正常"],
          ["1204","explorer.exe","0x2c3d","正常"],
          ["3388","chrome.exe","0x4e5f","正常"],
        ]
      : this.plug === "psscan"
      ? [
          ["712","svchost.exe","0x1a2b","正常"],
          ["1204","explorer.exe","0x2c3d","正常"],
          ["3388","chrome.exe","0x4e5f","正常"],
          ["—","rundll32.exe","0x7a91","<b class='bad'>已退出 · 结构体残留</b>"],
          ["—","powershell.exe","0x8b02","<b class='bad'>已退出 · 反射加载</b>"],
        ]
      : [
          ["3388","chrome.exe","0x4e5f","<b class='bad'>RWX 私有内存 + 无对应模块</b>"],
          ["1204","explorer.exe","0x2c3d","<b class='amb'>MZ 头出现在堆区</b>"],
        ];

    const tbl = `<div class="ml-tbl">
      <div class="ml-tr hd"><span>PID</span><span>Image</span><span>Offset</span><span>判读</span></div>
      ${procs.map(p => `<div class="ml-tr"><span>${p[0]}</span><span>${p[1]}</span><span class="mo">${p[2]}</span><span>${p[3]}</span></div>`).join("")}
    </div>`;

    const plugs = [["pslist","活动进程链表"],["psscan","内存池扫描"],["malfind","注入检测"]]
      .map(([k,n]) => `<button type="button" class="mp ${this.plug===k?"on":""}" data-plug="${k}">${k}<small>${n}</small></button>`).join("");

    const hint = this.plug === "pslist"
      ? "顺着活动进程链表走一遍——<b>已被摘链的进程看不到</b>。攻击者最常做的第一件事，就是把自己从链表里摘出去。"
      : this.plug === "psscan"
      ? "不依赖链表，直接扫内存池里的 <code>_EPROCESS</code> 结构体。<b>pslist 与 psscan 的差集，就是有人不想让你看到的进程。</b>"
      : "找「有执行权限但没有对应磁盘文件」的内存段。<b>磁盘上根本没有文件，杀软扫不到，只有内存里有。</b>";

    this.body.innerHTML = `<div class="kit">
      <div class="l6-two">
        <div>
          <div class="k-h"><b>易失性顺序</b> · 越上面，消失得越快</div>
          <div class="ml-ladder">${ladder}</div>
          <div class="ksub">RFC 3227 的顺序不是「建议」，是<b>物理事实</b>：内存断电即失，磁盘能放几年。所以采集顺序只有一个方向——<b>从最易失的往下走</b>。</div>
        </div>
        <div>
          <div class="k-h"><b>VOLATILITY 3</b> · 换插件看同一份内存的不同面</div>
          <div class="mp-row">${plugs}</div>
          ${tbl}
          <div class="ml-hint">${hint}</div>
          <button type="button" class="tl-btn ${this.hide?"on":""}" data-hide="1">
            ${this.hide ? "隐藏「已退出进程」" : "对比 pslist / psscan 的差集"}
          </button>
          ${this.hide ? `<div class="ml-ghost">
            <b>差集 = 2 个进程</b>：<code>rundll32.exe</code> 与 <code>powershell.exe</code> 都已退出，但 <code>_EPROCESS</code> 结构体还留在内存池里。
            这通常意味着<b>「跑完就退」的无文件载荷</b>——磁盘上永远找不到它，只有内存镜像能证明它存在过。
          </div>` : ""}
        </div>
      </div>
      <div class="ksub"><b>「先重启试试」是取证里最贵的四个字。</b>一次重启，上表里所有的东西全部归零——包括勒索软件的加密密钥，那往往是你唯一能不解密就恢复数据的机会。</div>
    </div>`;
  }
}

/* ================= §66 磁盘取证与证据链：ARTIFACT MAP ================= */
class DiskViz{
  constructor(){
    this.body = $("#diskBody");
    this.os = "win";
    this.tamp = false;
    this.cur = 0;
    this.data = {
      win: [
        { nm:"$MFT", p:"\\$MFT", prove:"文件存在过、大小、时间戳、父子关系", note:"即使文件被删，MFT 记录也可能未被复用" },
        { nm:"$UsnJrnl", p:"\\$Extend\\$UsnJrnl", prove:"文件被创建 / 改名 / 删除的<b>变更事件</b>", note:"补上「文件已删、MFT 已复用」的缺口" },
        { nm:"Prefetch", p:"C:\\Windows\\Prefetch\\*.pf", prove:"程序<b>被执行过</b>：次数、首次/末次时间、加载的 DLL", note:"文件删了，.pf 还在" },
        { nm:"Amcache / ShimCache", p:"注册表", prove:"程序曾出现在系统里（含已删除的）", note:"ShimCache 只证明「见过」，不证明「跑过」" },
        { nm:"事件日志", p:"C:\\Windows\\System32\\winevt\\Logs", prove:"登录、服务创建、进程创建、账户变更", note:"先看有没有被 <code>wevtutil cl</code> 清过" },
        { nm:"注册表持久化", p:"Run / Services / WMI", prove:"开机自启与驻留点", note:"根除阶段的主战场" },
        { nm:"浏览器 / 下载记录", p:"用户目录", prove:"钓鱼落地、文件下载来源", note:"常被忽略，但对「入口」判断极有价值" },
      ],
      linux: [
        { nm:"ext4 / xfs 元数据", p:"inode 表", prove:"文件存在、属主、时间戳、块指针", note:"删除后 inode 可能被复用" },
        { nm:"journal", p:"ext4 journal", prove:"元数据变更的<b>事务日志</b>", note:"比 inode 更能反映「刚刚发生了什么」" },
        { nm:"bash_history", p:"~/.bash_history", prove:"交互式命令（若未被清）", note:"攻击者常清空，但其他用户/root 的可能还在" },
        { nm:"auth.log / secure", p:"/var/log/", prove:"登录、sudo、SSH 认证", note:"重点看失败后的成功、异常来源 IP" },
        { nm:"systemd / cron", p:"/etc/systemd, /var/spool/cron", prove:"持久化点", note:"也包括 <code>ld.so.preload</code>、<code>rc.local</code>" },
        { nm:"authorized_keys", p:"~/.ssh/", prove:"免密登录后门", note:"比改密码更隐蔽，容易被漏查" },
        { nm:"包管理日志", p:"/var/log/dpkg.log, yum.log", prove:"装了什么工具（扫描器、隧道、挖矿）", note:"攻击者常懒得清这一份" },
      ],
    };
    this.render();
    this.body.onclick = e => {
      const o = e.target.closest("[data-os]");
      if(o){ this.os = o.dataset.os; this.cur = 0; this.render(); return; }
      const a = e.target.closest("[data-ar]");
      if(a){ this.cur = +a.dataset.ar; this.render(); return; }
      const t = e.target.closest("[data-tamp]");
      if(t){ this.tamp = !this.tamp; this.render(); }
    };
  }
  render(){
    const list = this.data[this.os];
    const tabs = [["win","Windows"],["linux","Linux"]].map(([k,n]) =>
      `<button type="button" class="mp ${this.os===k?"on":""}" data-os="${k}">${n}</button>`).join("");

    const rows = list.map((a,i) => `
      <button type="button" class="am-row ${i===this.cur?"on":""}" data-ar="${i}">
        <span class="am-nm">${a.nm}</span>
        <span class="am-p">${a.p}</span>
      </button>`).join("");

    const a = list[this.cur];

    /* 时间戳篡改演示：$SI 与 $FN 不一致 */
    const si = this.tamp ? "2019-03-14 08:22:10" : "2026-10-18 03:47:22";
    const fn = "2026-10-18 03:47:22";

    this.body.innerHTML = `<div class="kit">
      <div class="am-tabs">${tabs}</div>
      <div class="l6-two">
        <div class="am-list">${rows}</div>
        <div>
          <div class="kpanel">
            <div class="p-ti">${a.nm}</div>
            <div class="p-de"><code>${a.p}</code></div>
            <div class="p-rows">
              <div class="kp-row"><span class="kp-k">能证明</span><span class="kp-v good">${a.prove}</span></div>
              <div class="kp-row"><span class="kp-k">注意</span><span class="kp-v">${a.note}</span></div>
            </div>
          </div>
          <div class="ts-box">
            <div class="ts-head">
              <b>时间戳篡改（Timestomping）</b>
              <button type="button" class="tl-btn ${this.tamp?"on":""}" data-tamp="1">
                ${this.tamp ? "恢复正常时间戳" : "模拟攻击者篡改"}
              </button>
            </div>
            <div class="ts-rows">
              <div class="ts-r"><span class="k">$STANDARD_INFORMATION</span><span class="v ${this.tamp?"bad":"ok"}">${si}</span></div>
              <div class="ts-r"><span class="k">$FILE_NAME</span><span class="v ok">${fn}</span></div>
            </div>
            <div class="ts-note ${this.tamp?"bad":"ok"}">
              ${this.tamp
                ? "<b>两者不一致 → 强指标。</b>用户态 API（<code>SetFileTime</code>）只能改 <code>$STANDARD_INFORMATION</code>，改不动 <code>$FILE_NAME</code>。所以「看起来是 2019 年的系统文件，但 $FN 写着昨天」——这就是破绽。"
                : "正常情况下两者一致。攻击者为了让恶意文件混进「系统文件的年代」，会把它改成 2019 年——但只能改一半。"}
            </div>
          </div>
        </div>
      </div>
      <div class="ksub"><b>证据链不是流程洁癖，是「能不能用」的分界线。</b>哈希要在<b>采集的第一分钟</b>算——事后补算只能证明「现在这份文件是完整的」，证明不了「采集时就是这份文件」。这句话在法庭上和在对内复盘时，分量是一样的。</div>
    </div>`;
  }
}
