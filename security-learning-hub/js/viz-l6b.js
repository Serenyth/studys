/* ================================================================
   SEC·ATLAS · viz-l6b.js
   L6 应急响应与取证 可视化（二）：§67–§71
   依赖: utils.js（$/$$）、viz-kit.js、theme.js（PAL）
   ================================================================ */
"use strict";

/* ================= §67 网络取证：TRAFFIC LENS ================= */
class NetViz{
  constructor(){
    this.body = $("#netBody");
    this.src = "flow";
    this.beacon = false;
    this.srcs = {
      flow: { nm:"NetFlow / IPFIX", keep:"30–90 天", size:"极小（元数据）",
        see:["五元组与流量方向","字节数 / 包数 / 会话时长","横向扫描（一对多短会话）","数据外传量级"],
        blind:["具体请求内容","文件名与 URL 路径","User-Agent 与证书细节"],
        use:"长期回溯：谁在什么时候跟谁说了多少话" },
      pcap: { nm:"全流量 pcap", keep:"3–7 天", size:"极大（TB/天）",
        see:["完整应用层内容","可提取样本与文件","协议异常与畸形包","加密握手的全部字段"],
        blind:["超过留存窗口的历史（已经滚掉了）","全链路加密后的载荷"],
        use:"深度分析：挖那一段的具体内容" },
      dns: { nm:"DNS 查询日志", keep:"30–180 天", size:"小",
        see:["域名解析行为","DGA 特征（高熵、超长）","TXT 隧道 / DoH 绕过迹象","首次出现的域名（NOD）"],
        blind:["直连 IP 不查 DNS 的通信","加密 DNS 内部内容"],
        use:"C2 域名发现：成本最低、覆盖面最广的一层" },
      tls: { nm:"TLS 元数据（JA3/JA3S/SNI）", keep:"7–30 天", size:"小",
        see:["SNI 明文域名","客户端 / 服务端指纹","证书签发者与有效期","握手版本与套件"],
        blind:["加密后的内容","使用域前置（Domain Fronting）时的真实目标"],
        use:"加密流量识别：域名换了，指纹不变" },
    };
    this.render();
    this.body.onclick = e => {
      const s = e.target.closest("[data-src]");
      if(s){ this.src = s.dataset.src; this.render(); return; }
      const b = e.target.closest("[data-beacon]");
      if(b){ this.beacon = !this.beacon; this.render(); }
    };
  }
  /* 心跳时序图：固定间隔 vs 带抖动 */
  drawBeacon(cv){
    if(!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth || 560, H = 86;
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext("2d");
    g.setTransform(dpr,0,0,dpr,0,0);
    g.clearRect(0,0,W,H);

    /* 基线 */
    g.strokeStyle = PAL.line2; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, H-18); g.lineTo(W, H-18); g.stroke();

    const n = 14, pad = 14;
    const span = (W - pad*2);
    const col = this.beacon ? PAL.amb : PAL.red;
    const jit = this.beacon ? 0.34 : 0;

    for(let i = 0; i < n; i++){
      /* 固定间隔 + 抖动：beacon 模式下时间点被随机推开，周期不再整齐 */
      const base = i / (n-1);
      const off = (Math.sin(i*2.7) * jit) / (n-1);
      const x = pad + span * Math.min(1, Math.max(0, base + off));
      const h = 12 + (i%3)*5;
      g.fillStyle = col;
      g.globalAlpha = this.beacon ? .55 : .9;
      g.fillRect(x-1.5, H-18-h, 3, h);
      g.globalAlpha = 1;
    }
    /* 周期标注 */
    g.fillStyle = PAL.tx3; g.font = "11px monospace";
    g.fillText(this.beacon ? "jitter: 周期不再整齐 → 靠固定间隔的规则抓不到" : "固定 60s 心跳 → 周期性本身就是特征", pad, 16);
  }
  render(){
    const keys = Object.keys(this.srcs);
    const tabs = keys.map(k => `<button type="button" class="mp ${this.src===k?"on":""}" data-src="${k}">${this.srcs[k].nm}</button>`).join("");
    const s = this.srcs[this.src];

    const seeList = s.see.map(x => `<div class="nl-li good"><span class="mk">✓</span>${x}</div>`).join("");
    const blindList = s.blind.map(x => `<div class="nl-li bad"><span class="mk">✕</span>${x}</div>`).join("");

    this.body.innerHTML = `<div class="kit">
      <div class="mp-row">${tabs}</div>
      <div class="nl-meta">
        <div><span class="lb">留存</span><b>${s.keep}</b></div>
        <div><span class="lb">体量</span><b>${s.size}</b></div>
        <div><span class="lb">主要用途</span><b>${s.use}</b></div>
      </div>
      <div class="l6-two">
        <div class="kcard">
          <div class="cmp good"><div class="ch">看得见</div><div class="cb">${seeList}</div></div>
          <div class="cmp bad"><div class="ch">看不见</div><div class="cb">${blindList}</div></div>
        </div>
        <div>
          <div class="k-h"><b>心跳检测</b> · 同一段 C2 流量，两种节律</div>
          <canvas class="nl-cv" height="86"></canvas>
          <button type="button" class="tl-btn ${this.beacon?"on":""}" data-beacon="1">
            ${this.beacon ? "恢复固定间隔心跳" : "让攻击者加上抖动（jitter）"}
          </button>
          <div class="nl-note">
            ${this.beacon
              ? "<b>加了抖动之后</b>，「每 60 秒一次」这种规则立刻失效。但抖动改不了别的东西：<b>包大小分布、上下行字节比、TLS 指纹、目标域名的熵</b>。所以检测要往这些维度挪——这就是为什么加密流量检测的核心不是「解密」，而是「<b>行为形状</b>」。"
              : "<b>固定间隔心跳</b>是最好抓的一类 C2：周期本身就是签名。真实 APT 都会加抖动（Cobalt Strike 默认就有），所以规则要留容差窗口，但窗口一放宽，误报就上来了——这是检测工程里永恒的拉扯。"}
          </div>
          <div class="ksub">一句话总结：<b>加密改不了包大小与时序。</b>这是加密流量检测能成立的唯一理由。</div>
        </div>
      </div>
    </div>`;
    this.drawBeacon($(".nl-cv", this.body));
  }
}

/* ================= §68 威胁情报：INTEL PYRAMID ================= */
class IntelViz{
  constructor(){
    this.body = $("#intelBody");
    this.cur = 3;
    this.levels = [
      { nm:"哈希（Hash）", half:"几天", pain:18, w:100,
        why:"改一个字节就全废。攻击者重新编译一次，成本接近零。",
        land:["可直接做阻断","误报极低","但只对「这一个样本」有效"] },
      { nm:"IP 地址", half:"数天～数周", pain:34, w:82,
        why:"换个 VPS 就行。云上开机器是按分钟计费的。",
        land:["可做防火墙阻断","需注意 CDN / 云厂商共享 IP 的误伤"] },
      { nm:"域名", half:"数周～数月", pain:52, w:64,
        why:"注册一个域名几十块，但要养信誉、过证书，比换 IP 贵一点。",
        land:["DNS sinkhole","代理层阻断","注意 DGA 与域前置绕过"] },
      { nm:"工具指纹（JA3 / 命名管道 / 特征串）", half:"数月～数年", pain:74, w:46,
        why:"换工具要重新开发、重新测试、重新过免杀——成本陡增。",
        land:["网络侧 JA3 规则","主机侧命名管道 / 互斥体检测","YARA"] },
      { nm:"TTP（战术与技术）", half:"数年（伴随攻击者职业生涯）", pain:96, w:28,
        why:"「用 certutil 下载」「创建服务横向」——这些是攻击者<b>不得不做</b>的事。",
        land:["Sigma 规则","狩猎假设","紫队演练场景","攻击链建模"] },
    ];
    this.render();
    this.body.onclick = e => {
      const b = e.target.closest("[data-lv]");
      if(!b) return;
      this.cur = +b.dataset.lv;
      this.render();
    };
  }
  render(){
    const rows = this.levels.map((l,i) => `
      <button type="button" class="ip-row ${i===this.cur?"on":""}" data-lv="${i}"
        style="--w:${l.w}%">
        <span class="ip-bar"></span>
        <span class="ip-nm">${l.nm}</span>
        <span class="ip-half">${l.half}</span>
      </button>`).join("");

    const l = this.levels[this.cur];
    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>痛苦金字塔</b> · 越往下，攻击者越难改，你的检测越值钱</div>
      <div class="ip-pyramid">${rows}</div>
      <div class="l6-two" style="margin-top:18px">
        <div class="kpanel">
          <div class="p-ti">${l.nm}</div>
          <div class="p-de">半衰期：<b>${l.half}</b></div>
          <div class="p-rows">
            <div class="kp-row"><span class="kp-k">为什么</span><span class="kp-v">${l.why}</span></div>
            <div class="kp-row"><span class="kp-k">痛苦值</span><span class="kp-v ${l.pain>70?"good":l.pain>40?"amb":"bad"}">${l.pain} / 100</span></div>
          </div>
        </div>
        <div>
          <div class="k-h"><b>四条落地路径</b> · 走不通就只是读物</div>
          <div class="ip-land">
            ${l.land.map(x => `<div class="li"><span class="mk">▸</span>${x}</div>`).join("")}
          </div>
          <div class="ip-verdict ${l.pain>70?"good":l.pain>40?"amb":"bad"}">
            ${l.pain > 70
              ? "这类情报值得写进规则库与狩猎计划——它描述的是<b>行为</b>，攻击者换基础设施也带不走。"
              : l.pain > 40
              ? "可以做阻断，但要有心理准备：几周后它就失效了。<b>当消耗品用，别当资产存。</b>"
              : "只适合「已经确认是这次事件」时的快速排查，不适合作为长期检测的主干。"}
          </div>
        </div>
      </div>
      <div class="ksub"><b>把 IOC 当消耗品，把 TTP 当资产。</b>很多团队的情报订阅买了一堆 IP 列表，最后只能做防火墙黑名单——这是把最贵的东西用成了最便宜的方式。</div>
    </div>`;
  }
}

/* ================= §69 威胁狩猎：HUNT LAB ================= */
class HuntViz{
  constructor(){
    this.body = $("#huntBody");
    this.sel = { subj:0, src:0, feat:0, thr:0 };
    this.slots = {
      subj: { t:"主体", opts:[
        { v:"域内所有主机", ok:2, why:"范围清晰，可查" },
        { v:"全部流量", ok:1, why:"范围过大，查询成本高但可行" },
        { v:"「可疑的东西」", ok:0, why:"<b>不可定义，无法写查询</b>" },
      ]},
      src: { t:"数据源", opts:[
        { v:"安全日志 4688 / Sysmon 1（进程创建）", ok:2, why:"细粒度、含命令行，最适合行为假设" },
        { v:"NetFlow 元数据", ok:1, why:"只有元数据，能验证「有没有连」，不能验证「做了什么」" },
        { v:"「所有日志」", ok:0, why:"<b>没有具体数据源 = 无法执行</b>" },
      ]},
      feat: { t:"行为特征", opts:[
        { v:"服务名随机 + ImagePath 指向 ADMIN$", ok:2, why:"具体、稳定、有判别力" },
        { v:"「异常的进程」", ok:0, why:"<b>「异常」没有基线定义，不可判定</b>" },
        { v:"父进程为 services.exe 但无签名", ok:2, why:"可判定，但需注意正常服务的干扰" },
      ]},
      thr: { t:"判定阈值", opts:[
        { v:"单次出现即命中（高价值低频率）", ok:2, why:"这类行为正常环境几乎不出现，单次即可" },
        { v:"30 分钟内 ≥5 台主机", ok:2, why:"适合横向移动，用频率压误报" },
        { v:"「看起来很多」", ok:0, why:"<b>没有数字 = 不可证伪</b>" },
      ]},
    };
    this.render();
    this.body.onclick = e => {
      const o = e.target.closest("[data-slot]");
      if(o){ this.sel[o.dataset.slot] = +o.dataset.ix; this.render(); return; }
      const r = e.target.closest("[data-run]");
      if(r){ this.ran = true; this.render(); }
    };
    this.ran = false;
  }
  score(){
    return Object.keys(this.slots).reduce((a,k) =>
      a + this.slots[k].opts[this.sel[k]].ok, 0);
  }
  render(){
    const blocks = Object.keys(this.slots).map(k => {
      const s = this.slots[k];
      const opts = s.opts.map((o,i) =>
        `<button type="button" class="hl-opt ${this.sel[k]===i?"on":""}" data-slot="${k}" data-ix="${i}">${o.v}</button>`).join("");
      return `<div class="hl-slot"><div class="hl-t">${s.t}</div><div class="hl-opts">${opts}</div></div>`;
    }).join("");

    const sc = this.score();   /* 0..8 */
    const pct = Math.round(sc / 8 * 100);
    const verdict = sc >= 7 ? ["可执行 · 可证伪","good"] : sc >= 5 ? ["勉强能跑，但会误报","amb"] : ["这不是假设，是愿望","bad"];

    const hyp = `如果 <b>${this.slots.subj.opts[this.sel.subj].v}</b> 在 <b>${this.slots.src.opts[this.sel.src].v}</b> 中
      出现 <b>${this.slots.feat.opts[this.sel.feat].v}</b>，且 <b>${this.slots.thr.opts[this.sel.thr].v}</b>，则可能存在横向移动。`;

    const reasons = Object.keys(this.slots).map(k => {
      const o = this.slots[k].opts[this.sel[k]];
      return `<div class="kp-row"><span class="kp-k">${this.slots[k].t}</span>
        <span class="kp-v ${o.ok===2?"good":o.ok===1?"amb":"bad"}">${o.why}</span></div>`;
    }).join("");

    const result = !this.ran ? "" : (sc >= 7
      ? `<div class="hl-res good"><b>查询跑完 · 命中 3 台主机</b>
          <p>产出不是「抓到 3 台」，而是三件事：① 确认这 3 台要按事件处置；② 把这条查询<b>沉淀成 Sigma 规则</b>（下次自动响）；③ 记下「为什么之前没发现」——是没日志，还是有日志没规则。</p></div>`
      : `<div class="hl-res bad"><b>查询跑完 · 命中 4,812 条</b>
          <p>这就是不可证伪假设的代价：结果多到无法研判，等于没查。而且你无法判断「哪条是真的」——<b>因为假设本身没定义什么算异常</b>。回到上面，把「可疑」「异常」「很多」换成具体的行为和数字。</p></div>`);

    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>拼一个狩猎假设</b> · 四个槽位，每个都必须是「能被数据判定」的</div>
      <div class="hl-grid">${blocks}</div>
      <div class="hl-hyp">
        <div class="hl-hyp-h">假设预览 <span class="hl-sc ${verdict[1]}">${pct} · ${verdict[0]}</span></div>
        <p>${hyp}</p>
      </div>
      <div class="kpanel" style="margin-top:14px">
        <div class="p-ti">逐项判读</div>
        <div class="p-de">为什么这样选是好的 / 不好的</div>
        <div class="p-rows">${reasons}</div>
      </div>
      <button type="button" class="hl-run" data-run="1">▶ 跑这条查询</button>
      ${result}
      <div class="ksub">狩猎最难的从来不是查询语法，而是<b>把「我觉得有问题」翻译成「可被数据判定真假的句子」</b>。翻译不出来的，就不是假设。</div>
    </div>`;
  }
}

/* ================= §70 检测工程：DETECTION PIPELINE ================= */
class DetViz{
  constructor(){
    this.body = $("#detEngBody");
    this.log = 0;
    this.cond = new Set([0,1]);
    this.covered = new Set(["T1059","T1105","T1543"]);
    this.logs = [
      { nm:"process_creation · windows", d:"进程创建（含命令行）", tags:["T1059","T1105","T1543","T1003"],
        fps:"中：命令行匹配容易误伤运维脚本" },
      { nm:"file_event · windows", d:"文件创建 / 改名", tags:["T1486","T1105","T1074"],
        fps:"低：但要注意备份软件与编译输出" },
      { nm:"network_connection · windows", d:"网络连接", tags:["T1071","T1105","T1571"],
        fps:"高：正常业务外联量大，需配合目的画像" },
    ];
    this.conds = [
      { v:"Image|endswith: '\\certutil.exe'", w:34 },
      { v:"CommandLine|contains: 'urlcache'", w:30 },
      { v:"CommandLine|contains: 'http'", w:22 },
      { v:"ParentImage|endswith: '\\winword.exe'", w:14 },
    ];
    this.tech = [
      ["T1059","命令与脚本解释器"],["T1105","入口工具传输"],["T1543","创建或修改系统服务"],
      ["T1003","凭据转储"],["T1486","数据加密（勒索）"],["T1071","应用层协议 C2"],
      ["T1021","远程服务（横向）"],["T1566","钓鱼"],["T1055","进程注入"],["T1074","数据暂存"],
    ];
    this.render();
    this.body.onclick = e => {
      const l = e.target.closest("[data-log]");
      if(l){ this.log = +l.dataset.log; this.render(); return; }
      const c = e.target.closest("[data-cond]");
      if(c){
        const i = +c.dataset.cond;
        if(this.cond.has(i)) this.cond.delete(i); else this.cond.add(i);
        this.render(); return;
      }
      const t = e.target.closest("[data-tech]");
      if(t){
        const k = t.dataset.tech;
        if(this.covered.has(k)) this.covered.delete(k); else this.covered.add(k);
        this.render();
      }
    };
  }
  render(){
    const logTabs = this.logs.map((l,i) =>
      `<button type="button" class="mp ${this.log===i?"on":""}" data-log="${i}">${l.nm}</button>`).join("");

    const condList = this.conds.map((c,i) => {
      const on = this.cond.has(i);
      return `<button type="button" class="dp-cond ${on?"on":""}" data-cond="${i}">
        <span class="box ${on?"on":""}">${on?"✓":""}</span><code>${c.v}</code></button>`;
    }).join("");

    const sel = [...this.cond].sort();
    const yaml = `title: 通过 certutil 下载远程文件
logsource:
  category: process_creation
  product: windows
detection:
  selection:
${sel.map(i => "    - " + this.conds[i].v.replace("Image|endswith: ","Image|endswith: ")).join("\n") || "    # 未选择任何条件"}
  condition: ${sel.length ? (sel.length > 1 ? "all of selection" : "selection") : "# 空"}
level: ${sel.length >= 3 ? "high" : sel.length === 2 ? "medium" : "low"}
tags:
  - attack.${this.logs[this.log].tags[0].toLowerCase()}`;

    const strength = sel.reduce((a,i) => a + this.conds[i].w, 0);
    const fp = strength >= 80 ? "低" : strength >= 50 ? "中" : "高（条件太少）";

    const grid = this.tech.map(([k,n]) => {
      const on = this.covered.has(k);
      return `<button type="button" class="dp-cell ${on?"on":""}" data-tech="${k}" title="${n}">
        <span class="k">${k}</span><span class="n">${n}</span></button>`;
    }).join("");
    const covPct = Math.round(this.covered.size / this.tech.length * 100);

    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>拼一条 Sigma 规则</b> · 选数据源 + 勾条件，右侧实时生成</div>
      <div class="mp-row">${logTabs}</div>
      <div class="l6-two">
        <div>
          <div class="dp-h">选择匹配条件（多条件 = 更精准，但更容易被变体绕过）</div>
          <div class="dp-conds">${condList}</div>
          <div class="dp-meta">
            <span>判别强度 <b class="${strength>=80?"good":strength>=50?"amb":"bad"}">${strength}</b></span>
            <span>预计误报 <b class="${fp==="低"?"good":fp==="中"?"amb":"bad"}">${fp}</b></span>
            <span>数据源误报倾向 <b>${this.logs[this.log].fps}</b></span>
          </div>
        </div>
        <div class="dp-yaml"><div class="yh">GENERATED · Sigma</div><pre>${yaml}</pre></div>
      </div>

      <div class="dp-attack">
        <div class="dp-attack-h"><b>ATT&amp;CK 覆盖热力图</b><span>已覆盖 ${this.covered.size} / ${this.tech.length} · ${covPct}%（点格子切换）</span></div>
        <div class="dp-grid">${grid}</div>
        <div class="dp-attack-n">热力图上标「已覆盖」不等于规则真的会响。<b>没被验证过的覆盖，只是纸面上的覆盖</b>——每格都该有一条原子测试能证明它触发过。</div>
      </div>
      <div class="ksub">合理的检测配比是 <b>TTP 70% / IOC 20% / 异常 10%</b>。注意上面的规则里<b>没有出现任何 IP、域名或哈希</b>——它只描述「<b>谁、用什么参数、做了什么</b>」，所以攻击者换基础设施也绕不过去。</div>
    </div>`;
  }
}

/* ================= §71 演练台：RUNBOOK DRILL ================= */
class DrillViz{
  constructor(){
    this.body = $("#drillBody");
    this.sc = 0;      /* 当前场景 */
    this.step = 0;    /* 当前步骤 */
    this.pick = null; /* 当前选择 */
    this.score = 0;
    this.done = false;
    this.scenes = [
      {
        id:"ransom", nm:"勒索软件", tag:"业务已中断",
        brief:"09:40 收到告警：财务文件服务器出现大量 .locked 后缀文件，桌面出现 README.txt。EDR 显示 <code>vssadmin.exe delete shadows /all /quiet</code> 已执行。该服务器是财务共享盘，200+ 人在用。",
        steps:[
          { t:"T+0 · 前 15 分钟", q:"第一件事做什么？",
            opts:[
              { v:"立刻关机，防止继续加密", ok:0, why:"关机确实能停止加密，但<b>内存里的加密密钥、C2 地址、注入进程全部丢失</b>——而这些往往是你唯一能不解密就恢复数据的机会。" },
              { v:"先采内存，同时用 EDR 隔离网络", ok:2, why:"正确。<b>先取易失证据，再做网络层隔离</b>。EDR 隔离保留管理通道，你能继续观测，攻击者出不去。" },
              { v:"先通知全公司改密码", ok:0, why:"顺序错。改密不阻止正在进行的加密，反而会惊动攻击者触发破坏逻辑，且大规模改密本身会引发二次混乱。" },
            ]},
          { t:"T+15 分钟 · 研判", q:"范围该往哪个方向先查？",
            opts:[
              { v:"只处理这台财务服务器", ok:0, why:"勒索几乎不会只在一台上。这台很可能只是<b>加密阶段</b>的起点，横向早就发生了。" },
              { v:"查同网段 SMB 445 连接与 7045 服务创建", ok:2, why:"对。<b>横向移动的证据在网络流与安全日志里</b>。勒索的传播路径通常是 SMB + 服务创建，这两个数据源最直接。" },
              { v:"先看勒索信内容，找解密工具", ok:1, why:"不是没用（可用于识别家族），但优先级不该高于范围评估——你还在被扩散的时候找解密工具，等于边救火边找保险单。" },
            ]},
          { t:"T+1 小时 · 遏制", q:"备份服务器也要隔离吗？",
            opts:[
              { v:"不用，备份是干净的", ok:0, why:"现代勒索<b>优先攻击备份</b>。如果备份服务器与被感染主机在同一域、同一网段，它极可能已经被拿下——而备份是最后的恢复手段。" },
              { v:"立即检查备份是否被访问，并隔离备份管理面", ok:2, why:"对。先确认备份完整性（有没有被加密/删除），再隔离管理接口。<b>恢复能力本身就是攻击目标</b>。" },
              { v:"把备份恢复到生产，先救业务", ok:0, why:"在根除之前恢复，等于把可能被感染的备份重新引入——而且攻击者若还在，会立刻再加密一次。" },
            ]},
          { t:"T+24 小时 · 恢复与复盘", q:"业务恢复了，接下来最重要的一件事？",
            opts:[
              { v:"写复盘报告归档", ok:1, why:"要写，但归档不是终点。报告的价值在于<b>改进项被排进计划并有人负责</b>，否则半年后同样的事会再来一遍。" },
              { v:"重装受影响主机，并从可信基线重建", ok:2, why:"对。勒索常伴随持久化与凭据窃取，<b>「清理干净」无法被证明</b>，重装把不确定性归零。同时必须改掉所有在该主机登录过的凭据。" },
              { v:"加强员工安全意识培训", ok:0, why:"这是万能答案，也是最没用的答案。在根因未确认前谈培训，等于用「人的问题」掩盖「架构与检测的问题」。" },
            ]},
        ],
      },
      {
        id:"miner", nm:"挖矿木马", tag:"性能异常但业务未断",
        brief:"运维反馈某台 Web 服务器 CPU 长期 100%，重启后恢复、几小时后复发。安全团队看到该主机有对外连接 <code>pool.minexmr.com:4444</code>，进程名为 <code>kdevtmpfsi</code>。",
        steps:[
          { t:"T+0 · 前 15 分钟", q:"先做什么？",
            opts:[
              { v:"直接 kill 掉进程，观察是否复发", ok:0, why:"kill 只清结果。<b>挖矿必有持久化</b>（cron / systemd / 守护进程互拉），杀掉主进程，守护进程几秒后把它拉起来——这正是「重启后恢复、几小时后复发」的原因。" },
              { v:"保留现场：抓进程树、cron、systemd、网络连接，再隔离", ok:2, why:"对。挖矿主机通常<b>还开着别的口子</b>（Redis 未授权、Web 漏洞、SSH 弱口令），先取证才能找到入口。" },
              { v:"立即重装系统", ok:0, why:"方向对但顺序错。重装会销毁<b>入口证据</b>——不找到入口，重装完照样被打。" },
            ]},
          { t:"T+15 分钟 · 找入口", q:"最该先查哪里？",
            opts:[
              { v:"查 Web 应用日志与上传目录", ok:2, why:"对。Web 服务器被挖矿，最常见入口就是<b>应用漏洞 → 命令执行 → 下载矿机</b>。日志里的异常 POST、可疑 UA、上传文件名是关键。" },
              { v:"查邮件网关", ok:0, why:"方向错。这是服务器不是终端，邮件不是主路径（除非它是邮件服务器）。" },
              { v:"查 DNS 日志找矿池域名", ok:1, why:"能确认外联，但那是<b>结果</b>不是<b>入口</b>。挖矿域名只是「它现在在干什么」。" },
            ]},
          { t:"T+1 小时 · 根除", q:"发现是 Redis 未授权访问导致写入 cron。怎么处理？",
            opts:[
              { v:"删掉恶意 cron 项即可", ok:0, why:"不够。Redis 未授权意味着攻击者<b>随时可以再写一次</b>，而且他可能已经用同样的方式在其他机器上留了后门。" },
              { v:"清持久化 + 封 Redis 端口/加认证 + 排查同网段所有 Redis", ok:2, why:"对。<b>根除 = 清结果 + 堵入口 + 查同面</b>。同网段其他 Redis 大概率也被扫过，只是还没被利用。" },
              { v:"只加防火墙规则封 4444 出站", ok:0, why:"封矿池端口只能让它换个端口。这是「治症状」的典型做法，攻击者改一个字符就绕过了。" },
            ]},
          { t:"T+24 小时 · 复盘", q:"这次事件最该沉淀什么？",
            opts:[
              { v:"一条「Redis 未授权访问」的检测规则 + 一份资产暴露面清单", ok:2, why:"对。挖矿的技术含量低，但它的<b>入口往往是最基础的配置问题</b>。把「哪些 Redis 暴露在公网」变成一张持续更新的清单，比写十份报告有用。" },
              { v:"把矿池域名加入黑名单", ok:0, why:"矿池域名有上千个，且随时新增。<b>黑名单永远追不上</b>。" },
              { v:"限制服务器 CPU 使用率", ok:0, why:"这是把问题藏起来——CPU 不飙了，但矿机还在跑，而且它可能已经在做别的事（横向、留后门）。" },
            ]},
        ],
      },
      {
        id:"bec", nm:"账号失陷", tag:"无恶意文件",
        brief:"财务总监收到「CEO」邮件，要求紧急转账 48 万到一个新账户。邮件来自外部域名但显示名完全相同。同时 IT 发现该 CEO 邮箱有异常登录（境外 IP，成功），且邮箱规则里新增了一条「把含 invoice 的邮件移到 RSS 文件夹」。",
        steps:[
          { t:"T+0 · 前 15 分钟", q:"第一步？",
            opts:[
              { v:"先冻结 CEO 账号会话并强制重置凭据 + MFA", ok:2, why:"对。BEC 的核心是<b>账号控制权</b>，先夺回来。同时保留会话记录——攻击者可能正在实时读邮件。" },
              { v:"先删掉那条邮箱规则", ok:0, why:"删规则等于告诉攻击者「你被发现了」，他会立刻做最后一步（比如再发一轮诈骗或删证据）。应先取证再清理。" },
              { v:"先追那 48 万有没有转出去", ok:1, why:"紧急但不是技术侧第一步——资金拦截走的是<b>业务与银行通道</b>，应与技术处置<b>并行</b>，而不是排队。" },
            ]},
          { t:"T+15 分钟 · 取证", q:"这种事件最关键的证据是什么？",
            opts:[
              { v:"登录日志（IP / UA / 时间 / MFA 结果）与邮箱规则、发件记录", ok:2, why:"对。无恶意文件的事件里，<b>日志就是全部证据</b>：怎么进来的（撞库？钓鱼？OAuth 授权？）、做了什么（读邮件、建规则、发信）。" },
              { v:"对 CEO 电脑做磁盘镜像", ok:1, why:"可以做，但优先级低——BEC 常常<b>根本不碰终端</b>，全程在云邮箱里操作。" },
              { v:"查有没有勒索病毒", ok:0, why:"方向完全错。BEC 的特征恰恰是<b>没有恶意文件</b>，找病毒会一无所获并浪费时间。" },
            ]},
          { t:"T+1 小时 · 扩范围", q:"还要查什么？",
            opts:[
              { v:"查是否有其他账号也被同样方式登录，以及是否有 OAuth 应用被授权", ok:2, why:"对。攻击者拿到一个高管邮箱后，通常<b>用它去钓更多高管</b>；OAuth 授权则是「改密码也踢不掉」的持久化。" },
              { v:"只处理 CEO 一个账号", ok:0, why:"单账号处置几乎总是漏的。BEC 是<b>批量化</b>的攻击——同一批泄露凭据往往覆盖多个账号。" },
              { v:"查全公司邮箱有没有转发规则", ok:1, why:"思路对，范围过大。应先按「高管 + 财务 + 近期异常登录」缩小，再逐步扩。" },
            ]},
          { t:"T+24 小时 · 复盘", q:"最该改的是什么？",
            opts:[
              { v:"加强反钓鱼培训", ok:0, why:"又是万能答案。这封邮件的破绽在<b>域名</b>，不在员工眼力——显示名相同、域名差一个字符，人眼很难稳定识别。" },
              { v:"强制 MFA + 条件访问（异地/新设备）+ 邮件外部发件人标识", ok:2, why:"对。这三条都是<b>技术性阻断</b>：MFA 让撞库失效，条件访问让异地登录要额外验证，外部标识让「显示名冒充」在界面上直接露馅。" },
              { v:"禁止所有外部邮件", ok:0, why:"业务上不可行。安全措施如果不能落地，就等于没有——这是最常见的「纸面加固」。" },
            ]},
        ],
      },
    ];
    this.render();
    this.body.onclick = e => {
      const s = e.target.closest("[data-sc]");
      if(s){ this.sc = +s.dataset.sc; this.step = 0; this.pick = null; this.score = 0; this.done = false; this.render(); return; }
      const o = e.target.closest("[data-opt]");
      if(o && this.pick === null){
        this.pick = +o.dataset.opt;
        this.score += this.scenes[this.sc].steps[this.step].opts[this.pick].ok;
        this.render(); return;
      }
      const n = e.target.closest("[data-next]");
      if(n){
        if(this.step < 3){ this.step++; this.pick = null; }
        else { this.done = true; }
        this.render();
      }
    };
  }
  render(){
    const tabs = this.scenes.map((s,i) =>
      `<button type="button" class="dr-tab ${this.sc===i?"on":""}" data-sc="${i}">
        <b>${s.nm}</b><span>${s.tag}</span></button>`).join("");

    const sc = this.scenes[this.sc];
    const st = sc.steps[this.step];

    const prog = sc.steps.map((_,i) =>
      `<span class="dr-p ${i<this.step?"done":i===this.step?"cur":""}">${i+1}</span>`).join("");

    const opts = st.opts.map((o,i) => {
      let cls = "";
      if(this.pick !== null){
        if(i === this.pick) cls = o.ok === 2 ? "right" : o.ok === 1 ? "half" : "wrong";
      }
      return `<button type="button" class="dr-opt ${cls}" data-opt="${i}">
        <span class="mk">${this.pick===null?"?":(o.ok===2?"✓":o.ok===1?"~":"✕")}</span>
        <span class="tx">${o.v}</span></button>`;
    }).join("");

    const fb = this.pick === null ? "" : (() => {
      const o = st.opts[this.pick];
      const tone = o.ok === 2 ? "good" : o.ok === 1 ? "amb" : "bad";
      const head = o.ok === 2 ? "这一步做对了" : o.ok === 1 ? "不算错，但不是最优" : "这一步会付出代价";
      return `<div class="dr-fb ${tone}"><b>${head}</b><p>${o.why}</p></div>`;
    })();

    const isLast = this.step === 3;
    const nextBtn = this.pick === null ? "" :
      `<button type="button" class="dr-next" data-next="1">${isLast ? "查看演练结果 ▸" : "下一步 ▸"}</button>`;

    const summary = this.done ? (() => {
      const max = 8, p = this.score;
      const v = p >= 7 ? ["处置顺序基本正确","good"] : p >= 5 ? ["方向对，但有关键步骤可优化","amb"] : ["顺序问题较多，真实事件中会付出代价","bad"];
      return `<div class="dr-sum ${v[1]}">
        <div class="ds-v">${p} / ${max}</div>
        <div class="ds-l">${v[0]}</div>
        <p>演练里失分最多的从来不是「不知道某个工具」，而是<b>顺序</b>：先取证还是先隔离、先清结果还是先堵入口、先冻结账号还是先删规则。
        真实事件中这些顺序决定了你最后手里还有没有证据、业务停了多久、会不会二次失陷。</p>
      </div>`;
    })() : "";

    this.body.innerHTML = `<div class="kit">
      <div class="dr-tabs">${tabs}</div>
      <div class="dr-brief"><span class="lb">场景</span><p>${sc.brief}</p></div>
      <div class="dr-prog">${prog}</div>
      <div class="dr-q"><span class="t">${st.t}</span><b>${st.q}</b></div>
      <div class="dr-opts">${opts}</div>
      ${fb}
      ${nextBtn}
      ${summary}
    </div>`;
  }
}
