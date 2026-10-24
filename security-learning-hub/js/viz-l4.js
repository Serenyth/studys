/* ================================================================
   SEC·ATLAS · viz-l4.js
   L4 渗透测试（红队）阶段的可视化：§37–§48
   依赖: utils.js、$/$$、viz-kit.js（bindSeg/barRow/kpi/panel/growBar）、theme.js（PAL）
   ================================================================ */
"use strict";

/* ================= §37 PTES 七阶段 ================= */
class PtesViz{
  constructor(){
    this.body = $("#ptesBody");
    this.cur = "pre";
    this.data = {
      pre:{ ti:"① 前期交互", de:"明确目标、范围、授权边界与规则（RoE）。", rows:[["关键产出","授权书 / 范围清单 / 禁止动作","good"],["易错点","「不包含范围」没写清","red"]] },
      intel:{ ti:"② 情报收集", de:"被动+主动搜集目标资产、技术栈、人员信息。", rows:[["关键产出","资产清单 / 攻击面地图","good"],["易错点","只扫 IP 漏掉云/容器","amb"]] },
      model:{ ti:"③ 威胁建模", de:"把目标拆成可被利用的入口与路径。", rows:[["关键产出","攻击路径假设","good"],["易错点","没有假设就开扫","amb"]] },
      vuln:{ ti:"④ 漏洞分析", de:"验证扫描/手工发现的可利用性。", rows:[["关键产出","已验证的漏洞清单","good"],["易错点","把误报直接写进报告","red"]] },
      exploit:{ ti:"⑤ 漏洞利用", de:"建立访问通道（shell / 凭据）。", rows:[["关键产出","初始访问 + 通道","good"],["易错点","用不稳定手段打核心系统","amb"]] },
      post:{ ti:"⑥ 后渗透", de:"提权、横向、凭据收集、维持。", rows:[["关键产出","影响范围评估","good"],["易错点","越权做持久化（未授权）","red"]] },
      report:{ ti:"⑦ 报告", de:"把发现转化为可执行的修复指引。", rows:[["关键产出","风险评级 + 复现 + 建议","good"],["易错点","只写技术不写业务影响","red"]] },
    };
    this.render();
    this.body.onclick = e => { const n = e.target.closest("[data-id]"); if(n){ this.cur = n.dataset.id; this.render(); } };
  }
  render(){
    const order = ["pre","intel","model","vuln","exploit","post","report"];
    const chain = order.map((k,i) =>
      `<div class="knode ${this.cur===k?"on":""}" data-id="${k}">
        <div class="n-ix">P${i+1}</div><div class="n-ti">${this.data[k].ti.split(" ")[1]}</div></div>`).join("");
    const d = this.data[this.cur];
    this.body.innerHTML = `<div class="kit">
      <div class="kchain">${chain}</div>
      ${panel(d.ti, d.de, d.rows)}
      <div class="ksub"><b>Kill Chain</b>（攻击者视角，事中）描述一次攻击的步骤；<b>ATT&CK</b>（防御者视角，战术库）用于分类与检测覆盖。前者适合还原事件，后者适合建检测。</div>
    </div>`;
  }
}

/* ================= §38 信息收集 ================= */
class ReconViz{
  constructor(){
    this.body = $("#reconBody");
    // 攻击面随 reconnaissance 一层层长出来
    this.layers = [
      ["域名 / 主域名","1","已知一个域名"],
      ["证书透明度子域","23","crt.sh 枚举子域"],
      ["真实 IP（绕过 CDN）","8","历史解析 + 旁站"],
      ["开放端口","61","nmap 存活+端口"],
      ["暴露服务","19","指纹识别"],
      ["Web 应用 / 接口","12","目录探测"],
    ];
    this.on = this.layers.map(()=>true);
    this.render();
    this.body.onclick = e => {
      const l = e.target.closest("[data-l]");
      if(l){ const i=+l.dataset.l; this.on[i]=!this.on[i]; this.render(); }
    };
  }
  render(){
    const max = Math.max(...this.layers.map(l=>+l[1]));
    const rows = this.layers.map((l,i) =>
      `<div class="gr" data-l="${i}" style="cursor:pointer;opacity:${this.on[i]?1:.4}">
        <span class="nm">${l[0]}${this.on[i]?"":"（已收敛）"}</span>
        <div class="bar"><i style="width:${Math.round(+l[1]/max*100)}%"></i></div></div>`).join("");
    const total = this.layers.reduce((s,l,i)=> s + (this.on[i]?+l[1]:0), 0);
    this.body.innerHTML = `<div class="kit">
      <div class="kkpi">${kpi(total,"累计暴露面",total>50?"red":"amb")}${kpi("OSINT","被动·不碰目标","cyn")}${kpi("nmap","主动·触碰目标","grn")}</div>
      <div class="k-h" style="margin-top:16px"><b>攻击面是一点点长出来的（点击某层可模拟「该层已收敛」）</b></div>
      <div class="kgrow" style="margin-top:10px">${rows}</div>
      <div class="ksub">被动侦察（CT Log、DNS、搜索引擎、空间测绘）目标无感；主动侦察（端口扫描、目录爆破）会触碰目标。找真实 IP 的常见法：历史 DNS、证书、旁站、邮件头。</div>
    </div>`;
  }
}

/* ================= §39 OWASP Top 10:2025 ================= */
class Top10Viz{
  constructor(){
    this.body = $("#topBody");
    this.data = [
      ["A01","访问控制失效","越权、IDOR——最常见也最贵","最小权限 + 服务端校验对象归属"],
      ["A02","安全配置错误","默认凭据、目录列表、调试模式暴露","加固基线 + 关闭不必要功能"],
      ["A03","软件供应链失效","依赖/构建被污染","SBOM + 依赖扫描 + 签名校验"],
      ["A04","密码学失效","明文、弱算法、错误管理","TLS + 慢哈希 + 正确密钥管理"],
      ["A05","注入","SQL/命令/模板——数据当代码","参数化查询 + 输出编码"],
      ["A06","不安全设计","逻辑漏洞、缺安全控制","威胁建模 + 滥用用例设计"],
      ["A07","身份鉴别失效","弱口令、会话固定、MFA 缺失","MFA + 安全会话 + 防爆破"],
      ["A08","软件数据完整性","未校验更新/反序列化","签名 + 完整性校验"],
      ["A09","安全日志监控不足","无审计、无告警","结构化日志 + 检测规则"],
      ["A10","SSRF","服务端替你发请求","白名单 + 禁止内网/元数据"],
    ];
    this.cur = 0;
    this.render();
    this.body.onclick = e => { const c = e.target.closest("[data-i]"); if(c){ this.cur=+c.dataset.i; this.render(); } };
  }
  render(){
    const cells = this.data.map((d,i)=>
      `<div class="tc ${this.cur===i?"on":""}" data-i="${i}"><div class="no">${d[0]}</div><div class="nm">${d[1]}</div></div>`).join("");
    const d = this.data[this.cur];
    this.body.innerHTML = `<div class="kit">
      <div class="ktop">${cells}</div>
      ${panel(d[0]+" · "+d[1], d[2], [["核心风险", d[2],"hot"],["首选防御", d[3],"good"]])}
      <div class="ksub">相比 2021 版：A04 密码学前移强调、A08 数据完整性单列、A10 SSRF 独立——反映云与供应链时代的真实风险分布。</div>
    </div>`;
  }
}

/* ================= §40 越权与配置错误 ================= */
class AuthzViz{
  constructor(){
    this.body = $("#authzBody");
    this.swap = "id"; // id / obj / role / tenant
    this.all = false;
    this.render();
    this.body.onclick = e => {
      const s = e.target.closest("[data-swap]");
      if(s){ this.swap = s.dataset.swap; this.render(); }
      const a = e.target.closest("[data-check]");
      if(a){ this.all = !this.all; this.render(); }
    };
  }
  render(){
    const swaps = [
      ["id","换身份","用另一个登录账号访问","垂直越权 / 会话复用"],
      ["obj","换对象","把 orderId=1 改成 orderId=2","水平越权 / IDOR"],
      ["role","换角色","用普通账号调管理接口","权限边界缺失"],
      ["tenant","换租户","跨租户读他人数据","多租户隔离失效"],
    ];
    const btns = swaps.map(s=>`<span class="kbadge ${this.swap===s[0]?"grn":""}" style="cursor:pointer" data-swap="${s[0]}">换${s[1]}</span>`).join("");
    const cur = swaps.find(s=>s[0]===this.swap);
    const checks = this.all ? `
      <div class="ksub" style="margin-top:12px"><span class="kbadge grn">四个检查点</span>
        ① 当前用户是这个对象的所有者吗？ ② 这个操作需要的角色/权限，当前账号有吗？
        ③ 请求是否只在前端隐藏、后端没校验？ ④ 改 ID / 方法 / 路径 / 头，能否绕过？</div>`
      : `<div class="ksub" style="margin-top:12px"><span class="kbadge amb" style="cursor:pointer" data-check="1">说明每个检查点 ▾</span></div>`;
    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>越权的四个"换"：改一遍才知道</b></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">${btns}</div>
      <div class="kmini"><span class="cm"># 原始请求（来自已登录的普通用户 A）</span>
GET /api/order/<span class="hl">1001</span>  →  返回 A 的订单
<span class="cm"># 换${cur[1]}：</span>
GET /api/order/<span class="bd">1002</span>  →  <span class="bd">越权返回他人订单（IDOR）</span></div>
      <div class="k-h" style="margin-top:14px">${cur[2]}</div>
      ${checks}
      <div class="ksub">框架只提供认证（你是不是登录了），<b>不提供授权（你能不能看这个）</b>。授权必须开发者自己写——这正是最容易漏的地方。</div>
    </div>`;
  }
}

/* ================= §41 供应链与密码学失效 ================= */
class SupplyViz{
  constructor(){
    this.body = $("#supBody");
    this.cur = 0;
    this.chain = [
      ["开发者","写业务代码，可能引入不安全写法","凭据泄露 / 误提交秘钥"],
      ["源码仓库","Git 托管（GitHub/GitLab）","恶意 PR / 依赖混淆"],
      ["依赖包","npm/pypi/maven 第三方库","投毒包（同名 / typosquat）"],
      ["CI/CD","自动构建与测试","Pipeline 被注入 / 签名缺失"],
      ["制品仓库","镜像 / 二进制存储","制品被替换未校验"],
      ["部署","上线到生产","部署脚本拉取被污染源"],
    ];
    this.render();
    this.body.onclick = e => { const n = e.target.closest("[data-i]"); if(n){ this.cur=+n.dataset.i; this.render(); } };
  }
  render(){
    const chain = this.chain.map((c,i)=>
      `<div class="knode ${this.cur===i?"on":""}" data-i="${i}" style="min-width:130px">
        <div class="n-ix">NODE ${i+1}</div><div class="n-ti" style="font-size:12px">${c[0]}</div></div>`).join("");
    const c = this.chain[this.cur];
    this.body.innerHTML = `<div class="kit">
      <div class="kchain">${chain}</div>
      ${panel("信任链 · "+c[0], c[1], [["典型攻击", c[2],"hot"],["测试重点","版本指纹 + 已知漏洞匹配 + SBOM 缺失 + 前端依赖暴露","good"]])}
      <div class="ksub"><b>Log4Shell（CVE-2021-44228）是分水岭</b>：一个日志库的表达式求值，让无数 Java 应用可被远程接管。四件事要做：依赖清点（SBOM）、及时打补丁、限制 JNDI 出网、最小权限运行。</div>
    </div>`;
  }
}

/* ================= §42 注入：黑名单 vs 参数化 ================= */
class BypassViz{
  constructor(){
    this.body = $("#injBody");
    this.mode = "blacklist"; // blacklist / prepared
    this.render();
    bindSeg(this.body, "blacklist", m => { this.mode = m; this.render(); });
  }
  render(){
    const evasions = ["SeLeCt","SEL/**/ECT","/*!50000SELECT*/","' OR 1=1 --","0x53454c"];
    const evList = evasions.map(e=>{
      const blockShown = this.mode==="blacklist";
      return `<div class="kv" style="display:grid;grid-template-columns:1fr auto;gap:8px;padding:8px 11px;border:1px solid var(--line2);border-radius:9px;background:var(--bg2);font-family:var(--f-mono);font-size:12px">
        <span>${e}</span><span class="kbadge ${blockShown?"red":"grn"}">${blockShown?"绕过":"无关"}</span></div>`;
    }).join("");
    const head = this.mode==="blacklist"
      ? `<div class="ktwin" style="grid-template-columns:1fr">
          <div class="twin anom"><div class="tw-h"><span>黑名单过滤</span></div>
            <div class="kmini"><span class="cm"># 过滤 SELECT / OR / 空格……</span>
input = <span class="bd">${evasions[0]}</span>
<span class="kw">if</span>(blocklist.test(input)) <span class="bd">→ 拦截（但只拦了表面）</span></div>
            <div class="verdict drop">❌ 永远列不全，必然被绕过</div></div></div>`
      : `<div class="ktwin" style="grid-template-columns:1fr">
          <div class="twin sig"><div class="tw-h"><span>参数化查询</span></div>
            <div class="kmini"><span class="cm"># SQL 结构与数据在协议层分离</span>
query = <span class="hl">"SELECT * FROM t WHERE id = ?"</span>
param = <span class="st">"1 OR 1=1"</span>  <span class="cm">// 永远是数据</span></div>
            <div class="verdict pass">✓ 数据不可能被解析为语法</div></div></div>`;
    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>切换上方「黑名单 / 参数化」，看同一组 payload 的结局</b></div>
      ${head}
      <div class="k-h" style="margin-top:16px">黑名单追着语法跑（列几个就绕几个）</div>
      <div style="display:grid;gap:7px;margin-top:8px">${evList}</div>
      <div class="ksub">判断是否存在注入的经典四步：<b>① 输入改变逻辑的值 ② 看响应是否变化 ③ AND 1=1 正常 ④ AND 1=2 异常</b>。命令注入同理，用 <span class="kbadge amb">; | || && $() 反引号 换行</span> 垫在参数后。</div>
    </div>`;
  }
}

/* ================= §43 跨站脚本 XSS ================= */
class XssViz{
  constructor(){
    this.body = $("#xssBody");
    this.mode = "reflected"; // reflected / stored / dom
    this.render();
    bindSeg(this.body, "reflected", m => { this.mode = m; this.render(); });
  }
  render(){
    const data = {
      reflected:{ cls:"refl", path:[
        ["攻击者","构造特制链接"],["受害者","点击链接"],["服务器","把脚本拼进响应"],["受害者浏览器","执行脚本"]],
        note:"需要诱导点击，影响单次会话。" },
      stored:{ cls:"store", path:[
        ["攻击者","提交恶意评论到 DB"],["数据库","存储脚本"],["受害者","浏览该页面"],["受害浏览器","自动执行（可蠕虫）"]],
        note:"危害最高：存库后任何人访问即触发，无需诱导。" },
      dom:{ cls:"dom", path:[
        ["攻击者","构造 #fragment 链接"],["受害者","点击"],["客户端 JS","把 fragment 写入 DOM"],["受害浏览器","执行（服务端无感知）"]],
        note:"全程不经过服务端，WAF 根本看不到。" },
    };
    const d = data[this.mode];
    const rows = d.path.map((p,i)=>`
      <div class="row"><span class="who">${p[0]}</span>
        <div class="track"><span class="pk ${d.cls} go" style="left:${i*22}%;width:20%">${p[1]}</span></div></div>`).join("");
    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>三种 XSS 的数据通路</b></div>
      <div class="kxss" style="margin-top:10px">${rows}</div>
      <div class="ksub"><span class="kbadge red">${d.note}</span></div>
      <div class="ksub">核心成因：<b>用户输入被当作 HTML/JS 解析，而不是文本</b>。危险 Sink 如 <span class="kbadge amb">innerHTML / eval / document.write</span>；相对安全用 <span class="kbadge grn">textContent</span>。防御按上下文编码 + CSP + HttpOnly，输入白名单不能替代输出编码。</div>
    </div>`;
  }
}

/* ================= §44 SSRF 与文件类 ================= */
class SsrfViz{
  constructor(){
    this.body = $("#ssrfBody");
    this.mode = "normal"; // normal / local / meta / bypass
    this.render();
    bindSeg(this.body, "normal", m => { this.mode = m; this.render(); });
  }
  render(){
    const data = {
      normal:{ arr:"go", boxes:[["攻击者","提交 url"],["服务器","请求 example.com"],["example.com","返回图片"],["响应","正常显示"]], note:"正常功能：服务器替用户取图。" },
      local:{ arr:"block", boxes:[["攻击者","url=127.0.0.1:6379"],["服务器","请求本机 Redis"],["Redis","无认证→被操控"],["响应","Redis 被读写"]], note:"打到了内网/本机服务，绕过防火墙。" },
      meta:{ arr:"block", boxes:[["攻击者","url=169.254.169.254"],["服务器","请求元数据服务"],["元数据","返回 IAM 临时凭据"],["响应","云账号沦陷"]], note:"拿到凭据，以机器身份调云 API——SSRF 升级为云沦陷。" },
      bypass:{ arr:"go", boxes:[["攻击者","url=2130706433"],["服务器","解析成 127.0.0.1"],["校验","只挡了字符串 127.0.0.1"],["结果","绕过过滤"]], note:"IP 变形：十进制/十六进制/八进制/DNS 重绑定都让黑名单失效。" },
    };
    const d = data[this.mode];
    const boxes = d.boxes.map((b,i)=>{
      const arrBefore = i < d.boxes.length-1
        ? `<span class="arr ${i===0?"go":d.arr}">→</span>` : "";
      const cls = b[0]==="攻击者"?"amber":(d.arr==="block" && i>0 && i<3)?"bad":"";
      return `<div class="box ${cls}"><span>${b[0]}</span><span class="sub">${b[1]}</span></div>${arrBefore}`;
    }).join("");
    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>服务端替你伸手：四个场景</b></div>
      <div class="kpipe" style="margin-top:12px">${boxes}</div>
      <div class="ksub"><span class="kbadge red">${d.note}</span></div>
      <div class="ksub">根本防御：<b>白名单协议+主机+端口</b>，禁止请求内网与链路本地地址（169.254.169.254、127/8、::1）；对云启用 IMDSv2（要求 token、限制跳转）。文件类：上传目录移到 Web 根外、重命名、禁用脚本执行、白名单扩展名。</div>
    </div>`;
  }
}

/* ================= §45 业务逻辑漏洞 ================= */
class LogicViz{
  constructor(){
    this.body = $("#logicBody");
    this.cur = 0;
    this.data = [
      ["跳步","绕过必经步骤","跳过支付直接确认订单 / 跳过审核通过"],
      ["重放","重复提交","优惠券重复核销、重复领奖、重复提现"],
      ["替换","替换对象/身份","改 orderId、改 userId、改归属门店"],
      ["竞争","并发/乱序","超卖、余额双花、并发改状态"],
      ["异常","部分成功","支付成功但订单未创建、回滚不完整"],
    ];
    this.render();
    this.body.onclick = e => { const n = e.target.closest("[data-i]"); if(n){ this.cur=+n.dataset.i; this.render(); } };
  }
  render(){
    const chain = this.data.map((d,i)=>
      `<div class="knode ${this.cur===i?"on":""}" data-i="${i}" style="min-width:108px">
        <div class="n-ix">模式 ${i+1}</div><div class="n-ti" style="font-size:12px">${d[0]}</div></div>`).join("");
    const d = this.data[this.cur];
    this.body.innerHTML = `<div class="kit">
      <div class="kchain">${chain}</div>
      ${panel("五类滥用 · "+d[0], d[1], [["典型例子", d[2],"hot"],["高发区","钱 / 权 / 量 / 态","amb"]])}
      <div class="ksub">测试方法：先画流程图，再列对象（订单/优惠券/余额/库存/审批单）、标属性、画状态机，对每个状态转换问：能不能跳过、能不能重复、能不能并发——<b>这个值到底谁说了算？</b></div>
    </div>`;
  }
}

/* ================= §46 系统渗透与提权 ================= */
class PrivEscViz{
  constructor(){
    this.body = $("#peBody");
    this.cur = 0;
    this.data = [
      ["① sudo -l","最快的一招","看当前用户能以 root 运行什么——vim/less/find 都可逃逸 shell"],
      ["② SUID + GTFOBins","查特殊权限文件","find / -perm -4000；逐个查 GTFOBins 有无利用方式"],
      ["③ 定时任务/服务","配置错配","脚本可写 / PATH 劫持 / 通配符注入 / 服务文件可写"],
      ["④ 内核漏洞","最后才考虑","DirtyPipe / PwnKit——编译试错易搞崩机器"],
    ];
    this.render();
    this.body.onclick = e => { const n = e.target.closest("[data-i]"); if(n){ this.cur=+n.dataset.i; this.render(); } };
  }
  render(){
    const steps = this.data.map((d,i)=>`
      <div class="stp"><div class="ix ${this.cur===i?"on":""}" data-i="${i}">${i+1}</div>
        <div class="body"><div class="ti">${d[0]}</div><div class="de">${d[1]}</div>
          <div class="meta"><span class="m">${d[2]}</span></div></div></div>`).join("");
    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>Linux 提权排查顺序（配置类优先于内核）</b></div>
      <div class="ksteps" style="margin-top:8px">${steps}</div>
      <div class="ksub">提权不是找一个漏洞，是找一条路径。Windows 同理以配置错配为主：服务以 SYSTEM 运行但目录可写、计划任务脚本可改、注册表自启动键可写。<b>SeImpersonatePrivilege</b> 让进程模拟 SYSTEM 令牌——"土豆"系列核心思路。</div>
    </div>`;
  }
}

/* ================= §47 内网与域渗透 ================= */
class KerberosViz{
  constructor(){
    this.body = $("#krbBody");
    this.cur = 0;
    this.data = [
      ["普通域用户","出发点","任意域用户即可发起大部分攻击"],
      ["Kerberoasting","请求服务 TGS","票据用服务账号哈希加密，可离线破解"],
      ["离线破解","拿到服务账号口令","服务账号常长期不换、权限偏高"],
      ["DCSync","模拟域控同步","直接拉取域内全部账号哈希（含 krbtgt）"],
      ["黄金票据","伪造任意 TGT","用 krbtgt 哈希签名，域沦陷（需重置两次）"],
    ];
    this.render();
    this.body.onclick = e => { const n = e.target.closest("[data-i]"); if(n){ this.cur=+n.dataset.i; this.render(); } };
  }
  render(){
    const chain = this.data.map((d,i)=>`
      <div class="knode ${this.cur===i?"on":""}" data-i="${i}" style="min-width:120px">
        <div class="n-ix">${i===0?"START":i===4?"GOAL":"STEP "+i}</div>
        <div class="n-ti" style="font-size:12px">${d[0]}</div></div>`).join("");
    const d = this.data[this.cur];
    this.body.innerHTML = `<div class="kit">
      <div class="kchain">${chain}</div>
      ${panel("Kerberos 攻击链 · "+d[0], d[2], [["阶段定位", d[1],"amb"],["防御要点","禁用 NTLM / Credential Guard / 轮换 krbtgt 两次 / 限制 LSASS 读取","good"]])}
      <div class="ksub">票据即凭据：<b>PtH</b>（哈希直接认证，无需明文）、<b>PtT</b>（票据直接用）。BloodHound 把 AD 权限关系可视化成图，找到"普通用户→域管"的最短路径——很多是 4 层 ACL 串起来的隐形信任。</div>
    </div>`;
  }
}

/* ================= §48 报告撰写 ================= */
class ReportViz{
  constructor(){
    this.body = $("#reportBody");
    this.mode = "bad"; // bad / good
    this.render();
    bindSeg(this.body, "bad", m => { this.mode = m; this.render(); });
  }
  render(){
    const bad = `<div class="cmp bad"><div class="ch">✗ 糟糕的报告</div><div class="cb">
      <div class="li"><span class="mk">×</span><div>发现 SQL 注入漏洞，位于 /product?id=1，已获取数据库权限。</div></div>
      <div class="li"><span class="mk">×</span><div>客户不知道：有多严重？影响什么业务？怎么修？谁来修？</div></div></div></div>`;
    const good = `<div class="cmp good"><div class="ch">✓ 好的报告</div><div class="cb">
      <div class="li"><span class="mk">✓</span><div><b>漏洞：</b>商品详情页 SQL 注入　<b>等级：</b>严重</div></div>
      <div class="li"><span class="mk">✓</span><div><b>位置：</b>https://shop.example.com/product?id=1</div></div>
      <div class="li"><span class="mk">✓</span><div><b>复现：</b>① 访问…② 在 id 后加 ' ③ 页面回显数据库版本</div></div>
      <div class="li"><span class="mk">✓</span><div><b>影响：</b>可读全部订单与用户数据（含手机号），约 120 万用户</div></div>
      <div class="li"><span class="mk">✓</span><div><b>建议：</b>参数化查询 + 整数类型校验；短期 WAF 规则缓解</div></div></div></div>`;
    this.body.innerHTML = `<div class="kit">
      <div class="kcard">${this.mode==="bad"?bad+good:good+bad}</div>
      <div class="ksub">切换上方对比。<b>漏洞描述六要素：</b>名称 / 风险等级（CVSS+业务影响）/ 位置 / 复现步骤 / 影响（业务语言）/ 修复建议（分层）。常见失败：只写技术不写业务影响、虚高评级、建议写成"加强安全意识"、没有复现步骤。</div>
    </div>`;
  }
}
