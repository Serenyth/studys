/* ================================================================
   SEC·ATLAS · viz-l5b.js
   L5 专项方向深化 可视化（二）：§55–§60
   依赖: utils.js、viz-kit.js（kpi/panel）、theme.js（PAL）
   ================================================================ */
"use strict";

/* ================= §56 保护机制矩阵 ================= */
class MitigationViz{
  constructor(){
    this.body = $("#protBody");
    this.sw = { nx:true, aslr:true, pie:true, canary:true, relro:true };
    this.defs = [
      ["nx","NX / DEP"], ["aslr","ASLR"], ["pie","PIE"], ["canary","Canary"], ["relro","Full RELRO"]
    ];
    this.render();
    this.body.onclick = e => {
      const b = e.target.closest("[data-sw]");
      if(b){ this.sw[b.dataset.sw] = !this.sw[b.dataset.sw]; this.render(); return; }
      const p = e.target.closest("[data-preset]");
      if(p){
        const all = p.dataset.preset === "on";
        Object.keys(this.sw).forEach(k => this.sw[k] = all);
        this.render();
      }
    };
  }
  render(){
    const btns = this.defs.map(([k,nm]) =>
      `<button type="button" data-sw="${k}" class="${this.sw[k]?"on":""}">${nm}</button>`).join("");

    const rows = [];

    /* 1. 栈上执行 shellcode */
    rows.push(this.sw.nx
      ? { t:"在栈上写 shellcode，直接跳过去执行", s:"被堵", c:"block",
          d:"NX 把栈页标记为不可执行，跳过去立即段错误。这就是 DEP 的全部作用。" }
      : { t:"在栈上写 shellcode，直接跳过去执行", s:"可行", c:"ok",
          d:"NX 关闭：栈可执行，不需要 ROP，最省事的路径。" });

    /* 2. 跳到固定地址 */
    if(!this.sw.aslr && !this.sw.pie)
      rows.push({ t:"跳到 libc 里固定地址的 system / one_gadget", s:"可行", c:"ok",
        d:"ASLR 与 PIE 都关闭，地址每次运行都一样，可以写死。" });
    else if(!this.sw.aslr)
      rows.push({ t:"跳到 libc 里固定地址的 system / one_gadget", s:"可行", c:"ok",
        d:"ASLR 关闭：库基址固定。PIE 开着只影响程序自身代码段。" });
    else
      rows.push({ t:"跳到 libc 里固定地址的 system / one_gadget", s:"需绕", c:"warn",
        d:"ASLR 开启：每次运行基址随机，必须先拿到一次信息泄露（格式化字符串、越界读、未初始化栈）才能算地址。" });

    /* 3. 覆盖返回地址 */
    rows.push(this.sw.canary
      ? { t:"悄悄覆盖返回地址，ret 时劫持", s:"需绕", c:"warn",
          d:"Canary 挡在 buf 与 RBP 之间：任何越界写都必须先破坏它，函数返回前 __stack_chk_fail 会终止进程。必须先泄露 canary 原值，再把它原样写回去。" }
      : { t:"悄悄覆盖返回地址，ret 时劫持", s:"可行", c:"ok",
          d:"没有 Canary，溢出到返回地址即可，不需要知道任何额外值。" });

    /* 4. 改 GOT 表 */
    rows.push(this.sw.relro
      ? { t:"改写 GOT 表，把某个函数劫持到别处", s:"被堵", c:"block",
          d:"Full RELRO 在启动时就把 GOT 设为只读（BIND_NOW + mprotect），写它会触发段错误。" }
      : { t:"改写 GOT 表，把某个函数劫持到别处", s:"可行", c:"ok",
          d:"Partial / 无 RELRO：GOT 可写，把 printf 的地址改成 system，下一次调用就是 system。" });

    /* 5. ROP */
    rows.push(this.sw.nx
      ? { t:"ROP：用代码段里的 gadget 拼出任意逻辑", s:"需绕", c:"warn",
          d:"ROP 绕过 NX（每条指令都是合法代码），但需要 gadget 的真实地址——ASLR 开着就还得先泄露。链越长，出错概率越高。" }
      : { t:"ROP：用代码段里的 gadget 拼出任意逻辑", s:"可行", c:"ok",
          d:"NX 关闭时其实用不上 ROP——直接跳 shellcode 更简单。ROP 是「被逼出来」的技术。" });

    const okN = rows.filter(r => r.c === "ok").length;
    const blockedN = rows.filter(r => r.c === "block").length;

    const list = rows.map(r => `
      <div class="p ${r.c}">
        <div>${r.t}<small>${r.d}</small></div>
        <span class="st">${r.s}</span>
      </div>`).join("");

    let sum;
    if(okN === 0){
      sum = `<div class="l5-sum"><b>没有一条现成路径。</b>剩下的 ${rows.length} 条都必须先做一步额外工作：<b>泄露地址（破 ASLR）、拼 ROP（破 NX）、原样写回 Canary</b>——每一步都会留下痕迹：异常的信息泄露请求、异常的崩溃、异常的 gadget 访问。这就是"纵深防御"的真实含义：不是绝对防住，而是<b>把成本抬到不划算</b>。</div>`;
    }else if(blockedN >= 2){
      sum = `<div class="l5-sum"><b>还有 <span class="gd">${blockedN}</span> 条路被堵住，<span class="hi">${okN}</span> 条直接可行。</b>注意"需绕"不等于"不可能"——它只意味着攻击者要多做一步。真正危险的是那 ${okN} 条<b>不需要任何绕过</b>的路径。</div>`;
    }else{
      sum = `<div class="l5-sum"><b>保护太少：<span class="hi">${okN}</span> 条路径直接可行。</b>这种情况下 exploit 是"照着模板写"的难度。检查一个二进制开没开保护，一条命令就够：<code>checksec --file=./target</code>。</div>`;
    }

    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>开关保护（点击切换）</b></div>
      <div class="l5-sw">${btns}</div>
      <div class="l5-tabs" style="margin-top:12px">
        <button type="button" data-preset="on">全部开启</button>
        <button type="button" data-preset="off">全部关闭</button>
      </div>
      <div class="l5-path">${list}</div>
      ${sum}
      <div class="ksub">五种保护<b>各自堵一条路</b>，不是"随便开几个"：NX 堵"直接执行栈上代码"，ASLR/PIE 堵"写死地址"，Canary 堵"悄悄改返回地址"，RELRO 堵"改 GOT 表"。<b>Fuzzing</b> 负责找到崩溃点（覆盖率引导比随机变异高效一个数量级），<b>可利用性评估</b>负责判断这个崩溃值不值得做成 exploit——现实中 90% 的崩溃最后被判定为不可利用。</div>
    </div>`;
  }
}

/* ================= §57 IAM 提权图 ================= */
class IamViz{
  constructor(){
    this.body = $("#iamBody");
    this.perms = [
      { id:"s3get",    nm:"s3:GetObject",          de:"读对象存储" },
      { id:"s3put",    nm:"s3:PutObject",          de:"写对象存储" },
      { id:"lambda",   nm:"lambda:CreateFunction", de:"创建函数" },
      { id:"passrole", nm:"iam:PassRole",          de:"把角色交给服务" },
      { id:"policy",   nm:"iam:CreatePolicyVersion", de:"创建策略新版本" },
      { id:"runinst",  nm:"ec2:RunInstances",      de:"启动实例" },
      { id:"assume",   nm:"sts:AssumeRole",        de:"扮演角色" },
    ];
    this.on = { s3get:true, s3put:false, lambda:false, passrole:false, policy:false, runinst:false, assume:false };
    this.paths = [
      { nm:"直接给自己加管理员策略", need:["policy"], goal:"管理员",
        nodes:["当前身份","CreatePolicyVersion","给自己挂 AdministratorAccess","管理员"] },
      { nm:"用 Lambda 代跑管理员角色", need:["lambda","passrole"], goal:"管理员",
        nodes:["当前身份","CreateFunction","PassRole(管理员角色)","管理员"] },
      { nm:"起实例 + 实例角色取凭据", need:["runinst","passrole"], goal:"管理员",
        nodes:["当前身份","RunInstances","从 IMDS 取实例角色凭据","管理员"] },
      { nm:"扮演一个更高权限的角色", need:["assume"], goal:"提权",
        nodes:["当前身份","AssumeRole","目标角色权限","提权"] },
      { nm:"只读数据面", need:["s3get"], goal:"数据泄露",
        nodes:["当前身份","GetObject","读取桶内对象","数据泄露"] },
      { nm:"写入对象存储（投毒 / 覆盖）", need:["s3put"], goal:"数据篡改",
        nodes:["当前身份","PutObject","覆盖前端 JS / 配置","供应链投毒"] },
    ];
    this.render();
    this.body.onclick = e => {
      const c = e.target.closest("[data-p]");
      if(!c) return;
      this.on[c.dataset.p] = !this.on[c.dataset.p];
      this.render();
    };
  }
  render(){
    const chk = this.perms.map(p => `
      <div class="ci" data-p="${p.id}">
        <span class="box ${this.on[p.id]?"on":""}">${this.on[p.id]?"✓":""}</span>
        <span class="ct">${p.nm}<small>${p.de}</small></span>
      </div>`).join("");

    const done = this.paths.map(p => ({ ...p, ok: p.need.every(n => this.on[n]) }));
    const admin = done.filter(p => p.ok && (p.goal === "管理员" || p.goal === "提权"));

    const graphs = done.map(p => `
      <div class="g ${p.ok?"done":""}">
        ${p.nodes.map((n,i) => {
          const isLast = i === p.nodes.length - 1;
          const lit = p.ok;
          const cls = "n" + (lit ? " lit" : "") + (isLast && lit && p.goal === "管理员" ? " goal" : "");
          return (i ? `<span class="ar ${lit?"lit":""}">→</span>` : "") + `<span class="${cls}">${n}</span>`;
        }).join("")}
      </div>`).join("");

    const sum = admin.length
      ? `<div class="l5-sum"><b>当前身份可以提权到管理员——共 <span class="hi">${admin.length}</span> 条路径。</b>这就是云上最危险的一类配置：看起来每个权限都"有用"，组合起来等于超级管理员。用 <b>PMapper</b> / <b>Cloudsplaining</b> 把策略建成图跑一遍可达性，几秒就能列全。</div>`
      : `<div class="l5-sum"><b>暂时走不到管理员。</b>但只要有一条"数据面"路径（读/写对象存储），影响就已经足够大——泄露数据不需要管理员权限。<b>判断云账号成熟度最简单的指标：还有没有长期 AccessKey 在用。</b></div>`;

    this.body.innerHTML = `<div class="kit">
      <div class="l5-pe">
        <div>
          <div class="k-h"><b>勾选当前身份已有的权限</b></div>
          <div class="kchk">${chk}</div>
        </div>
        <div>
          <div class="k-h"><b>可达路径</b></div>
          <div class="l5-graph">${graphs}</div>
        </div>
      </div>
      ${sum}
      <div class="ksub">云上提权往往不是"打漏洞"，而是<b>找到一条权限链</b>。三条最经典的：<code>iam:CreatePolicyVersion</code> 直接改自己的策略；<code>lambda:CreateFunction</code> + <code>iam:PassRole</code> 让代码以管理员角色运行；<code>ec2:RunInstances</code> + <code>PassRole</code> 起一台绑定管理员角色的机器再去元数据服务取凭据。</div>
    </div>`;
  }
}

/* ================= §58 SSRF → IMDS ================= */
class ImdsViz{
  constructor(){
    this.body = $("#imdsBody");
    this.mode = "v1";
    this.steps = [
      ["SSRF 发起请求", "应用替我们请求 169.254.169.254 的元数据接口", "curl http://169.254.169.254/latest/meta-data/iam/security-credentials/"],
      ["拿到角色名", "响应体直接是角色名，例如 ec2-prod-app-role", "ec2-prod-app-role"],
      ["取临时凭据", "再请求 /<角色名>，返回 AccessKeyId / SecretAccessKey / Token", '{ "Code":"Success", "AccessKeyId":"ASIA…", "Token":"IQoJ…" }'],
      ["调用云 API", "用这组临时凭据签名，访问 s3 / ec2 / iam", "aws s3 ls --profile stolen"],
      ["接管资源", "按角色权限读数据、建后门、横向到其他账号", "→ 数据泄露 / 资源劫持"],
    ];
    this.render();
    this.body.onclick = e => {
      const b = e.target.closest("[data-mode]");
      if(b){ this.mode = b.dataset.mode; this.render(); }
    };
  }
  render(){
    const modes = [["v1","IMDSv1（默认旧配置）"],["v2","仅强制 IMDSv2"],["net","IMDSv2 + 应用层封禁"]];
    const tabs = `<div class="l5-tabs">${modes.map(([k,nm]) =>
      `<button type="button" data-mode="${k}" class="${this.mode===k?"on":""}">${nm}</button>`).join("")}</div>`;

    /* 断点位置：v1 不断；v2 断在第 1 步（需要 PUT 换 token）；net 断在第 0 步 */
    const brk = this.mode === "v1" ? -1 : this.mode === "v2" ? 1 : 0;

    const rows = this.steps.map((s,i) => {
      let cls = "pass", st = "通过";
      if(brk > -1 && i === brk){ cls = "brk"; st = "断点"; }
      else if(brk > -1 && i > brk){ cls = ""; st = "未达"; }
      return `<div class="p ${cls}">
        <div><b>${i+1}. ${s[0]}</b><small>${s[1]}</small></div>
        <span class="st">${st}</span>
      </div>`;
    }).join("");

    let detail = "";
    if(this.mode === "v1"){
      detail = `<pre class="l5-code"><span class="cm"># IMDSv1：一个 GET 就够</span>
GET /latest/meta-data/iam/security-credentials/ HTTP/1.1
Host: 169.254.169.254
<span class="bad">→ 200 OK，直接返回角色名与凭据</span></pre>`;
    }else if(this.mode === "v2"){
      detail = `<pre class="l5-code"><span class="cm"># IMDSv2：必须先 PUT 换 token</span>
PUT /latest/api/token HTTP/1.1
Host: 169.254.169.254
X-aws-ec2-metadata-token-ttl-seconds: 21600

<span class="cm"># 拿 token 之后再带头发 GET</span>
GET /latest/meta-data/iam/security-credentials/ HTTP/1.1
X-aws-ec2-metadata-token: AQAE…

<span class="bad">→ 纯 GET 型 SSRF：401 Unauthorized，链在第 2 步断掉</span></pre>`;
    }else{
      detail = `<pre class="l5-code"><span class="cm"># 应用层直接拒绝链路本地地址</span>
allow = !is_link_local(host) &amp;&amp; !is_private(host)
<span class="cm"># 169.254.169.254 命中 169.254.0.0/16 → 拒绝</span>
<span class="bad">→ 请求在发出前就被拦下，链在第 1 步断掉</span></pre>`;
    }

    const sum = this.mode === "v1"
      ? `<div class="l5-sum"><b>五步全通：<span class="hi">不需要任何漏洞利用</span>。</b>只需要一个"能替你发请求"的功能（图片代理、URL 预览、Webhook 测试、PDF 渲染）。这也是它成为云上最经典攻击链的原因。</div>`
      : this.mode === "v2"
      ? `<div class="l5-sum"><b>链在第 2 步断掉——但只对"纯 GET"的 SSRF 有效。</b>如果服务端请求库能自定义方法和请求头（<code>requests</code>、<code>curl</code>、<code>axios</code> 都能），照样能先 PUT 拿 token。所以 <span class="hi">只开 IMDSv2 还不够</span>。</div>`
      : `<div class="l5-sum"><b>链在第 1 步就断了。</b>这是三层叠加里最硬的一层：不管 SSRF 长什么样，请求根本到不了 169.254.169.254。<b>真正的防线 = 强制 v2 + 限制实例角色权限 + 应用层禁止访问链路本地地址。</b></div>`;

    this.body.innerHTML = `<div class="kit">
      ${tabs}
      <div class="l5-pe">
        <div>
          <div class="k-h"><b>攻击链 · 看它断在哪一步</b></div>
          <div class="l5-path">${rows}</div>
        </div>
        <div>
          <div class="k-h"><b>实际的请求长什么样</b></div>
          ${detail}
          <div class="l5-sum" style="margin-top:12px"><b>顺带一句：</b>IMDS 只是"元数据服务"的一个实例。同类的还有 GCP 的 <code>metadata.google.internal</code>、Azure 的 <code>169.254.169.254/metadata</code>（需要 <code>Metadata: true</code> 头）。换云不换思路。</div>
        </div>
      </div>
      ${sum}
      <div class="ksub"><b>容器不是虚拟机。</b>容器靠 Namespace 隔离"看得见什么"、cgroup 限制"能用多少"，但<b>与宿主机共享同一个内核</b>——所以逃逸不需要打 hypervisor，一个内核漏洞或一处配置错误（特权容器、挂载 docker.sock、CAP_SYS_ADMIN）就够了。<b>K8s 的 RBAC 配置就是它的边界</b>：一个过宽的 ClusterRoleBinding，等价于把节点交给租户。</div>
    </div>`;
  }
}

/* ================= §59 APK 检查器 ================= */
class ApkViz{
  constructor(){
    this.body = $("#apkBody");
    this.entries = [
      { nm:"AndroidManifest.xml", rk:"高", cls:"hi",
        de:"二进制 XML，用 apktool 反编译后可读。检查 debuggable / exported / allowBackup / 权限申请。",
        risk:"exported=true 且无权限保护的 Activity，可被任意 App 拉起并传参——越权操作、数据泄露，甚至通过 WebView 桥接造成 RCE。" },
      { nm:"classes.dex", rk:"高", cls:"hi",
        de:"Dalvik 字节码，jadx 直接反编译成 Java。多 dex 时注意 classes2.dex 等。",
        risk:"硬编码密钥（AES key、API Key、签名盐）通常就躺在 BuildConfig 或某个常量类里——搜 32 位十六进制串就能找到。" },
      { nm:"lib/arm64-v8a/*.so", rk:"中", cls:"mid",
        de:"native 库，IDA / Ghidra 打开。JNI 函数名形如 Java_com_x_y_Method。",
        risk:"关键校验被放到 native 层增加逆向成本，也常藏反调试与完整性校验。同时注意 .so 是否用了不安全的库函数。" },
      { nm:"assets/config.json", rk:"高", cls:"hi",
        de:"原始资源，不需要反编译就能读（unzip 即可）。",
        risk:"明文内网地址、测试环境 AccessKey、功能开关、第三方 SDK 密钥——这是最快出成果的位置。" },
      { nm:"res/xml/network_security_config.xml", rk:"中", cls:"mid",
        de:"网络安全配置，决定信任哪些 CA、是否开启证书固定。",
        risk:"未开启 pinning → 装上用户 CA 就能抓包。开了 pinning 就必须 hook 校验函数才能继续。" },
      { nm:"META-INF/", rk:"低", cls:"lo",
        de:"签名信息（v1 MANIFEST.MF / v2、v3 APK Signing Block）。",
        risk:"仅 v1 签名存在 Janus 类绕过风险；重打包后签名必然不匹配，所以「改包」要先过签名校验。" },
    ];
    this.sel = 0;
    this.hook = false;
    this.render();
    this.body.onclick = e => {
      const n = e.target.closest("[data-e]");
      if(n){ this.sel = +n.dataset.e; this.render(); return; }
      const h = e.target.closest("[data-hook]");
      if(h){ this.hook = h.dataset.hook === "1"; this.render(); }
    };
  }
  render(){
    const tree = this.entries.map((e,i) => `
      <div class="apk-n ${this.sel===i?"on":""}" data-e="${i}">
        <span class="ic">${i===0?"◈":"·"}</span>
        <span>${e.nm}</span>
        <span class="rk ${e.cls}">风险 ${e.rk}</span>
      </div>`).join("");

    const cur = this.entries[this.sel];
    const riskPanel = `<div class="kpanel" style="margin-top:0">
      <div class="p-ti">${cur.nm}</div>
      <div class="p-de">${cur.de}</div>
      <div class="p-rows">
        <div class="kp-row"><span class="kp-k">风险等级</span><span class="kp-v ${cur.cls==="hi"?"hot":cur.cls==="mid"?"amb":""}">${cur.rk}</span></div>
        <div class="kp-row"><span class="kp-k">典型问题</span><span class="kp-v">${cur.risk}</span></div>
      </div>
    </div>`;

    const hookTabs = `<div class="l5-tabs">
      <button type="button" data-hook="0" class="${!this.hook?"on":""}">未 hook</button>
      <button type="button" data-hook="1" class="${this.hook?"on":""}">Frida hook 校验函数</button>
    </div>`;

    const cap = this.hook
      ? `<pre class="l5-code"><span class="cm">// 绕过证书固定：hook 掉所有 TrustManager</span>
Java.perform(<span class="kw">function</span>(){
  <span class="kw">var</span> X509 = Java.use(<span class="st">"javax.net.ssl.X509TrustManager"</span>);
  X509.checkServerTrusted.implementation = <span class="kw">function</span>(){
    console.log(<span class="st">"[*] pinning bypassed"</span>);
  };
});
<span class="bad">→ TLS 仍是加密的，但 App 不再校验对端证书 → 中间人可解密</span>

POST /api/v1/login HTTP/1.1
{<span class="st">"phone"</span>:<span class="st">"13800138000"</span>,<span class="st">"password"</span>:<span class="st">"P@ssw0rd!"</span>}</pre>`
      : `<pre class="l5-code"><span class="cm"># 未绕过 pinning 时，Wireshark 看到的东西</span>
TLSv1.3 Application Data
  [Encrypted Application Data: 4a8f2c…]
  [Encrypted Application Data: 91b0e7…]

<span class="bad">→ 只有密文。抓到了包，但读不出任何内容</span></pre>`;

    const sum = this.hook
      ? `<div class="l5-sum"><b>pinning 被绕过 → 抓包成功。</b>这一步之后才是真正的测试：改参数、重放、越权、批量遍历。<b>能绕过 pinning，才算真正开始测这个 App。</b>反过来说，App 侧对抗 Frida 的手段（检测 27042 端口、扫描 /proc/self/maps 里的 frida-agent、校验函数下沉到 native）也只是把成本抬高，不是绝对防住。</div>`
      : `<div class="l5-sum"><b>抓不到包，后面的一切都做不了。</b>所以 App 的第一道防线通常是<b>证书固定</b>——它把"信任任何系统 CA"改成"只信任这一个证书"。绕过它的标准手段就是 Frida hook 掉校验函数或 <code>TrustManager</code>。切到右边看看绕过之后能看到什么。</div>`;

    this.body.innerHTML = `<div class="kit">
      <div class="l5-pe">
        <div>
          <div class="k-h"><b>包内条目 · 点击看风险</b></div>
          <div class="apk-tree">${tree}</div>
          ${riskPanel}
        </div>
        <div>
          <div class="k-h"><b>证书固定：抓包的第一道墙</b></div>
          ${hookTabs}
          ${cap}
          <div class="l5-sum" style="margin-top:12px"><b>固件分析三步：</b><code>file</code> / <code>binwalk</code> 识别类型 → <code>binwalk -e</code> 提取文件系统 → 看 <code>etc/passwd</code>、<code>shadow</code>、<code>grep -r password</code>。常见问题：硬编码 root 口令、未授权的 UART / JTAG 调试口、未签名固件更新、默认开 Telnet。</div>
        </div>
      </div>
      ${sum}
      <div class="ksub"><b>IoT 的特殊性：几乎无法打补丁。</b>用户不会主动升级固件、厂商可能已停止支持、设备寿命长达 10 年。所以 IoT 报告里最有价值的一条建议往往是<b>"把它放到独立 VLAN"</b>——因为补丁这条路，现实中走不通。安全设计要假设"设备一定会被攻破"。</div>
    </div>`;
  }
}

/* ================= §60 Purdue 模型 ================= */
class PurdueViz{
  constructor(){
    this.body = $("#purdueBody");
    this.layers = [
      { id:"L5",  nm:"外部网络",   cls:"it",  as:"互联网 · 远程运维",
        assets:"公网入口、VPN 网关、供应商远程通道",
        risk:"最容易被当作跳板：一个供应商的弱口令 VPN 账号，就能进入 L4。",
        fix:"多因素认证、按需开通、会话录制、供应商账号与员工账号隔离。" },
      { id:"L4",  nm:"企业 IT",    cls:"it",  as:"办公网 · 邮件 · ERP",
        assets:"员工终端、域控、邮件、OA、ERP",
        risk:"钓鱼邮件与勒索软件的主战场。这里沦陷几乎是常态，问题在于能不能被限制住。",
        fix:"终端 EDR、邮件网关、最小权限、**与下层零直连**。" },
      { id:"L3.5", nm:"工业 DMZ",  cls:"dmz", as:"跳板机 · 代理 · 镜像",
        assets:"反向代理、数据镜像、补丁服务器、跳板机",
        risk:"这一层最大的风险是**没有这一层**——很多现场为了「方便」，让 L4 直接访问 L2。",
        fix:"所有跨层通信必须经 DMZ 终结与重建，禁止透传；进出双向白名单。" },
      { id:"L3",  nm:"运营管理",   cls:"ot",  as:"历史库 · MES · 工程站",
        assets:" historians、MES、工程站（EWS）、资产管理系统",
        risk:"工程站上有 PLC 的组态与下装权限，是 OT 里权限最高、防护最弱的一环。",
        fix:"工程站专用、离线补丁、USB 管控、禁止接入办公网。" },
      { id:"L2",  nm:"监督控制",   cls:"ot",  as:"SCADA · HMI",
        assets:"SCADA 服务器、HMI、操作员站",
        risk:"操作员站往往跑着十年未更新的 Windows，且不能随便打补丁。",
        fix:"应用白名单、禁用 USB、只允许与 L1 的必要协议通信。" },
      { id:"L1",  nm:"基础控制",   cls:"ot",  as:"PLC · RTU · DCS",
        assets:"PLC、RTU、DCS 控制器、安全仪表系统（SIS）",
        risk:"**协议本身没有认证**（Modbus / S7comm / DNP3），能连上就能读写。",
        fix:"网络分段、只读镜像、写操作审计；SIS 必须物理/逻辑独立。" },
      { id:"L0",  nm:"物理过程",   cls:"ot",  as:"传感器 · 执行器 · 阀门",
        assets:"传感器、执行机构、阀门、电机",
        risk:"这一层没有「信息安全」，只有**功能安全**——错误的指令直接变成物理后果。",
        fix:"物理联锁、独立的安全仪表系统、变更必须走作业票。" },
    ];
    this.sel = 2;
    this.direct = false;
    this.render();
    this.body.onclick = e => {
      const l = e.target.closest("[data-l]");
      if(l){ this.sel = +l.dataset.l; this.render(); return; }
      const b = e.target.closest("[data-direct]");
      if(b){ this.direct = !this.direct; this.render(); }
    };
  }
  render(){
    const rows = this.layers.map((l,i) => {
      const hot = this.direct && (l.id === "L4" || l.id === "L2" || l.id === "L1" || l.id === "L0");
      return `<div class="pl ${l.cls} ${this.sel===i?"on":""} ${hot?"hot":""}" data-l="${i}">
        <span class="lv">${l.id}</span>
        <span>${l.nm}</span>
        <span class="as">${l.as.split(" · ")[0]}</span>
      </div>`;
    }).join("");

    const cur = this.layers[this.sel];
    const panelHtml = `<div class="kpanel" style="margin-top:0">
      <div class="p-ti">${cur.id} · ${cur.nm}</div>
      <div class="p-de">${cur.assets}</div>
      <div class="p-rows">
        <div class="kp-row"><span class="kp-k">主要风险</span><span class="kp-v hot">${cur.risk.replace(/\*\*/g,"")}</span></div>
        <div class="kp-row"><span class="kp-k">该做什么</span><span class="kp-v good">${cur.fix.replace(/\*\*/g,"")}</span></div>
      </div>
    </div>`;

    const sw = `<div class="l5-sw" style="margin-bottom:12px">
      <button type="button" data-direct="1" class="${this.direct?"on":""}">L4 ↔ L2 直连（图方便）</button>
    </div>`;

    const sum = this.direct
      ? `<div class="l5-sum"><b>DMZ 被绕过了：<span class="hi">一条直连 = 一条完整的攻击路径</span>。</b>L4 的勒索软件可以一路打到 L1 的 PLC、L0 的执行器。<b>这不是假设</b>——现实中绝大多数"勒索软件导致产线停机"的事故，根因都是这条为了省事而开的口子，或者 L3.5 压根没建。</div>`
      : `<div class="l5-sum"><b>层间隔离完整：攻击被限制在单层内。</b>L4 沦陷只影响办公网；要往下走必须穿过 DMZ，而 DMZ 只放行白名单内的协议与目的地。<b>这条规则的价值，只有在出事那天才体现出来。</b></div>`;

    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>Purdue 层级（点击看资产与风险）· 从上到下：IT → DMZ → OT</b></div>
      <div class="l5-purdue">${rows}</div>
      ${sw}
      ${panelHtml}
      ${sum}
      <div class="ksub"><b>IT 与 OT 的根本差异：</b>IT 首位是机密性，OT 首位是<b>可用性</b>——停机可能造成物理损害甚至人身伤害。所以 OT 里很多措施只能"监测不阻断"。这也是为什么<b>被动资产发现</b>是工控环境的标准做法：主动扫描（SYN 扫描、畸形探测包）可能让 2000 年代的老 PLC 直接锁死，而重启它需要停线。</div>
    </div>`;
  }
}

/* ================= §61 三个月排期 ================= */
class TrackViz{
  constructor(){
    this.body = $("#trackBody");
    this.dirs = [
      { id:"mal", nm:"恶意代码分析", art:"20 份样本分析报告 + 一套 YARA 规则集",
        wk:[
          ["W1–2","搭环境：FLARE VM / REMnux，Host-Only + INetSim，做三套不同配置的快照"],
          ["W3–4","静态：PE 结构、节表熵、导入表、CAPA，写 5 份初筛结论（每份 ≤1 页）"],
          ["W5–6","动态：Procmon + x64dbg 观察五维度，写 5 份完整行为报告"],
          ["W7–8","逆向：挑 3 个样本定位核心函数，还原配置解密算法"],
          ["W9–10","规则：把结论转成 YARA，拿 300 个正常文件测误报"],
          ["W11–12","汇总：20 份报告 + 规则集，写一篇同家族变种对比"],
        ] },
      { id:"rev", nm:"逆向与漏洞挖掘", art:"5 个 CVE 的复现分析 + 1 个自研 Fuzzing 项目",
        wk:[
          ["W1–2","补基础：汇编、调用约定、栈帧、编译优化（-O2 后的代码长什么样）"],
          ["W3–4","读程序：picoCTF reversing 10 题，全部手写 wp"],
          ["W5–6","保护机制：checksec 五件套，手写一次 ret2text + 一次 ret2libc"],
          ["W7–8","ROP：用 ROPgadget 拼一条链，理解「为什么能绕过 NX」"],
          ["W9–10","Fuzzing：afl-clang-fast 插桩跑一个开源解析器，收 crash"],
          ["W11–12","复现 5 个 CVE（选有公开 PoC 的），写清「补丁改了什么」"],
        ] },
      { id:"cloud", nm:"云安全", art:"CloudGoat 全通 + 一份云环境安全评估报告",
        wk:[
          ["W1–2","共享责任 + IAM 模型：策略、角色、信任关系，手写最小权限策略"],
          ["W3–4","CloudGoat 前 5 个场景（重点是 IAM 提权链）"],
          ["W5–6","元数据与容器：SSRF → IMDS、容器逃逸、K8s RBAC 提权"],
          ["W7–8","CloudGoat 剩余场景 + PMapper 跑一遍可达性分析"],
          ["W9–10","检测侧：CloudTrail / GuardDuty 日志，写 3 条 Sigma 规则"],
          ["W11–12","产出：一份真实（或仿真）环境的评估报告，含配置基线对照"],
        ] },
      { id:"iot", nm:"移动与 IoT", art:"3 个 App 的完整评估报告 + Frida 脚本集",
        wk:[
          ["W1–2","APK 解剖：apktool + jadx 反编译 3 个 App，列清单与硬编码密钥"],
          ["W3–4","动态：Frida 环境搭建，hook 掉 root 检测与模拟器检测"],
          ["W5–6","证书固定：绕过 pinning，抓包改包，验证越权"],
          ["W7–8","native 层：IDA 看 .so 里的校验逻辑，写对应 hook 脚本"],
          ["W9–10","固件：binwalk 提取一个家用路由固件，找硬编码口令与调试口"],
          ["W11–12","产出：3 份 App 报告 + Frida 脚本集 + 一份固件分析笔记"],
        ] },
      { id:"ics", nm:"工控与 OT", art:"一套仿真环境的流量分析 + 资产测绘报告",
        wk:[
          ["W1–2","OT 基础：Purdue 模型、IT/OT 差异、IEC 62443 的基本概念"],
          ["W3–4","协议：Modbus / S7comm / DNP3 报文结构，Wireshark 逐字段拆"],
          ["W5–6","搭环境：Conpot + OpenPLC，用 Modbus 读写寄存器"],
          ["W7–8","被动发现：抓一段真实（或仿真）流量，写资产识别脚本"],
          ["W9–10","攻击面：分析一个公开的 PLC 漏洞，说明「为什么不能打补丁」"],
          ["W11–12","产出：资产测绘报告 + 分段改造建议（含 DMZ 设计）"],
        ] },
    ];
    this.cur = "mal";
    this.render();
    this.body.onclick = e => {
      const b = e.target.closest("[data-d]");
      if(b){ this.cur = b.dataset.d; this.render(); }
    };
  }
  render(){
    const tabs = `<div class="l5-tabs">${this.dirs.map(d =>
      `<button type="button" data-d="${d.id}" class="${this.cur===d.id?"on":""}">${d.nm}</button>`).join("")}</div>`;

    const d = this.dirs.find(x => x.id === this.cur);
    const months = [
      ["第 1 个月 · 打基础", d.wk.slice(0,2)],
      ["第 2 个月 · 上手做", d.wk.slice(2,4)],
      ["第 3 个月 · 出作品", d.wk.slice(4,6)],
    ];
    const plan = months.map(([mh, items]) => `
      <div class="mo">
        <div class="mh">${mh}</div>
        <div class="mb">
          ${items.map(([w,t]) => `<div class="li wk">${w}</div><div class="li"><span class="d">▸</span><div>${t}</div></div>`).join("")}
        </div>
      </div>`).join("");

    this.body.innerHTML = `<div class="kit">
      ${tabs}
      <div class="l5-plan">${plan}</div>
      <div class="l5-sum" style="margin-top:14px"><b>可展示的作品：</b><span class="gd">${d.art}</span><br>
        <b>验收标准：</b>把这份作品给一个不熟悉该方向的人看，他能在 10 分钟内明白"你做了什么、为什么难、结论是什么"。做不到，说明还停在"用过工具"的层面。</div>
      <div class="ksub"><b>唯一一条规矩：三个月内不看其他方向的教程。</b>专项深化的最大风险不是"学不会"，而是<b>"学得太散"</b>——每个方向都停在"知道几个工具名"。三个月后你应该能回答那个问题：这个领域里，什么事情是只有做过大量实践的人才能做到的？<b>那就是你的护城河。</b></div>
    </div>`;
  }
}
