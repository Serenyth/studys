/* ================================================================
   SEC·ATLAS · main.js
   启动编排:
     - 一次性: 图标水合 / Hero 效果 / 滚动进度 / 显现 / Scrollspy / 侧栏
     - 懒挂载: watchViz() —— 可视化进入视口前 1000px 才实例化
     - 可重入: initViz() —— 主题切换时只重建「已挂载」的可视化
   加载顺序: 最后一个
   ================================================================ */
"use strict";

/* 可视化实例注册表（便于重建/销毁） */
const VIZ = {};

/* 选择器 → [实例键, 构造函数]；构造函数延迟到真正需要时才调用 */
const VIZ_DEFS = [
  /* —— L1 计算机基础 —— */
  ["#encapBody", "encap",  () => new EncapViz()],
  ["#tcpBody",   "tcp",    () => new TCPViz()],
  ["#dnsBody",   "dns",    () => new DNSViz()],
  ["#tlsBody",   "tls",    () => new TLSViz()],
  ["#permBody",  "perm",   () => new PermViz()],
  ["#sqlBody",   "sql",    () => new SQLViz()],
  ["#pipeBody",  "pipe",   () => new PipelineViz()],
  /* —— L2 安全核心 —— */
  ["#ciaSvgWrap","cia",    () => new CIAViz()],
  ["#didBody",   "did",    () => new DiDViz()],
  ["#treeBody",  "tree",   () => new AttackTreeViz()],
  ["#dhBody",    "dh",     () => new DHViz()],
  ["#ztBody",    "zt",     () => new ZTViz()],
  ["#attackBody","attack", () => new AttackViz()],
  /* —— L1 补充章节 —— */
  ["#fhsBody",   "fhs",    () => new FHSViz()],
  ["#hdrBody",   "hdr",    () => new HeaderLabViz()],
  ["#proxyBody", "proxy",  () => new ProxyChainViz()],
  ["#cookieBody","cookie", () => new CookieLabViz()],
  ["#encBody",   "enc",    () => new EncodingLabViz()],
  ["#shBody",    "sh",     () => new ShellInjectViz()],
  /* —— L2 补充 + 附录 —— */
  ["#cvssBody",  "cvss",   () => new CvssViz()],
  ["#blkBody",   "blk",    () => new BlockModeViz()],
  ["#glossBody", "gloss",  () => new GlossaryViz()],
  /* —— L3 防御基础（§27–§36） —— */
  ["#loopBody",  "loop",   () => new DefenseLoopViz()],
  ["#baseBody",  "base",   () => new BaselineLabViz()],
  ["#portBody",  "port",   () => new PortMapViz()],
  ["#integBody", "integ",  () => new IntegrityLabViz()],
  ["#fwBody",    "fw",     () => new FirewallBenchViz()],
  ["#detBody",   "det",    () => new DetectEngineViz()],
  ["#segBody",   "seg",    () => new SegmentationViz()],
  ["#sigmaBody", "sigma",  () => new SigmaBenchViz()],
  ["#priBody",   "pri",    () => new PriorityMatrixViz()],
  ["#edrBody",   "edr",    () => new EdrRetroViz()],
  /* —— L4 渗透测试（§37–§48） —— */
  ["#ptesBody",  "ptes",   () => new PtesViz()],
  ["#reconBody", "recon",  () => new ReconViz()],
  ["#topBody",   "top",    () => new Top10Viz()],
  ["#authzBody", "authz",  () => new AuthzViz()],
  ["#supBody",   "sup",    () => new SupplyViz()],
  ["#injBody",   "bypass", () => new BypassViz()],
  ["#xssBody",   "xss",    () => new XssViz()],
  ["#ssrfBody",  "ssrf",   () => new SsrfViz()],
  ["#logicBody", "logic",  () => new LogicViz()],
  ["#peBody",    "pe",     () => new PrivEscViz()],
  ["#krbBody",   "krb",    () => new KerberosViz()],
  ["#reportBody","report", () => new ReportViz()],
  /* —— L5 专项方向深化（§49–§60） —— */
  ["#pickBody",  "pick",   () => new PickViz()],
  ["#mflowBody", "mflow",  () => new MalwareFlowViz()],
  ["#peMapBody", "peMap",  () => new PeMapViz()],
  ["#sandboxBody","sand",  () => new SandboxViz()],
  ["#yaraBody",  "yara",   () => new YaraViz()],
  ["#stackBody", "stack",  () => new StackFrameViz()],
  ["#protBody",  "prot",   () => new MitigationViz()],
  ["#iamBody",   "iam",    () => new IamViz()],
  ["#imdsBody",  "imds",   () => new ImdsViz()],
  ["#apkBody",   "apk",    () => new ApkViz()],
  ["#purdueBody","purdue", () => new PurdueViz()],
  ["#trackBody", "track",  () => new TrackViz()],
  /* —— L6 应急响应与取证（§61–§71） —— */
  ["#irLoopBody","irLoop", () => new IrLoopViz()],
  ["#readyBody", "ready",  () => new ReadinessViz()],
  ["#triageBody","triage", () => new TriageViz()],
  ["#containBody","contain",() => new ContainViz()],
  ["#memBody",   "mem",    () => new MemViz()],
  ["#diskBody",  "disk",   () => new DiskViz()],
  ["#netBody",   "net",    () => new NetViz()],
  ["#intelBody", "intel",  () => new IntelViz()],
  ["#huntBody",  "hunt",   () => new HuntViz()],
  ["#detEngBody","detEng", () => new DetViz()],
  ["#drillBody", "drill",  () => new DrillViz()],
];

const VIZ_MAP = new Map(VIZ_DEFS.map(d => [d[0], d]));

/* 需要清空 / 观察的容器（#rttBars 由 TCPViz 顺带渲染，无独立实例） */
const VIZ_TARGETS = VIZ_DEFS.map(d => d[0]).concat(["#rttBars"]);

/* 已挂载的容器（主题切换时只重建这些） */
const VIZ_READY = new Set();

/* 每次重绘前需要复位的提示文案 */
const NOTE_DEFAULTS = {
  "#tcpNote": "点击「播放」观察报文流动与双方状态机的迁移。",
  "#dnsNote": "点击「播放解析」，跟随一个域名查询的完整旅程。",
  "#treeNote": "每个叶子节点都是一个可以加固的位置。<strong>OR</strong> 节点：任一子路径达成即成功；<strong>AND</strong> 节点：全部达成才成功。悬停节点查看对应的防御措施。",
  "#attackNote": "点击战术节点查看含义。相比 IOC（IP、域名、哈希），<strong>TTP 更稳定</strong>——攻击者换个 IP 很容易，改掉行为模式很难。基于 TTP 的检测比基于 IOC 的检测更持久。",
};

/* 实例化单个容器（幂等）；若容器整体在视口上方，补偿高度变化避免页面跳动 */
function ensureViz(sel){
  if(VIZ_READY.has(sel)) return;
  const def = VIZ_MAP.get(sel);
  if(!def) return;
  const el = $(sel);
  if(!el) return;
  VIZ_READY.add(sel);
  const r0 = el.getBoundingClientRect();
  try{ VIZ[def[1]] = def[2](); }
  catch(e){ console.error(def[1], e); return; }
  /* 内容插入后容器变高会把下方内容整体下推 —— 用户已经滚过它时要补回 */
  if(r0.bottom <= 0){
    const dh = el.getBoundingClientRect().height - r0.height;
    if(dh > 4) window.scrollBy(0, dh);
  }
}

/* 清空所有可视化容器，并停掉可能正在运行的定时器 */
function clearViz(){
  if(VIZ.pipe && VIZ.pipe.stop) VIZ.pipe.stop();
  if(VIZ.dh) VIZ.dh.playing = false;
  VIZ_TARGETS.forEach(sel => {
    const el = $(sel);
    if(el) el.innerHTML = "";
  });
  for(const sel in NOTE_DEFAULTS){
    const el = $(sel);
    if(el) el.innerHTML = NOTE_DEFAULTS[sel];
  }
}

/* 主题切换 → 只重建已挂载的可视化（配色由 PAL 决定） */
function initViz(){
  const ready = Array.from(VIZ_READY);
  clearViz();
  VIZ_READY.clear();
  ready.forEach(ensureViz);
}

/* 把「视口内 + 上下各 1200px」的容器立刻实例化 */
function initNearby(){
  const vh = window.innerHeight || 900;
  VIZ_TARGETS.forEach(sel => {
    if(VIZ_READY.has(sel)) return;
    const el = $(sel);
    if(!el) return;
    const r = el.getBoundingClientRect();
    if(r.top < vh + 1200 && r.bottom > -1200) ensureViz(sel);
  });
}

/* 懒挂载：首屏只建视口附近的，其余随滚动补扫（不依赖 IO，行为确定） */
function watchViz(){
  initNearby();

  let timer = 0;
  const kick = () => {
    if(VIZ_READY.size >= VIZ_TARGETS.length) return;
    if(timer) return;
    timer = setTimeout(() => { timer = 0; initNearby(); }, 90);
  };

  window.addEventListener("scroll", kick, {passive:true});
  window.addEventListener("resize", kick, {passive:true});
  /* 滚动停止后再扫一次（快速拖动滚动条时 90ms 节流可能漏掉） */
  window.addEventListener("scrollend", initNearby, {passive:true});

  /* 锚点跳转：容器陆续变高会把目标推下去，滚动结束后校正一次 */
  window.addEventListener("hashchange", () => {
    setTimeout(() => {
      const id = (location.hash || "").slice(1);
      const el = id && document.getElementById(id);
      if(!el) return;
      initNearby();
      const y = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({top:y, behavior:"instant"});
    }, 520);
  });

  /* 字体/图片落地后布局可能变，补扫一次 */
  setTimeout(initNearby, 600);
  setTimeout(initNearby, 2000);
}

/* ---------------- 页面框架 ---------------- */
function bootChrome(){
  /* 滚动进度条 */
  const prog = $("#progress");
  window.addEventListener("scroll", () => {
    const h = document.documentElement;
    prog.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + "%";
  }, {passive:true});

  /* 滚动显现（无 IO 环境直接显示） */
  if("IntersectionObserver" in window){
    const io = new IntersectionObserver(es => es.forEach(en => {
      if(en.isIntersecting){
        en.target.classList.add("in");
        io.unobserve(en.target);
      }
    }), {threshold:.1});
    $$(".rv").forEach(el => io.observe(el));
  }else{
    $$(".rv").forEach(el => el.classList.add("in"));
  }

  /* Scrollspy */
  const links = $$(".side-link");
  if("IntersectionObserver" in window){
    const spy = new IntersectionObserver(es => es.forEach(en => {
      if(en.isIntersecting){
        links.forEach(l => l.classList.toggle("active", l.dataset.spy === en.target.id));
      }
    }), {rootMargin:"-25% 0px -65% 0px"});
    $$("section.sec").forEach(s => spy.observe(s));
  }

  /* 侧栏：移动端抽屉 + 桌面端收纳 + 阶段分组折叠（状态持久化） */
  const LS_HIDE = "secatlas.sideHidden", LS_GRP = "secatlas.grpCollapsed";
  const store = {
    get(k, d){ try{ const v = localStorage.getItem(k); return v === null ? d : v; }catch(e){ return d; } },
    set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  };

  /* 桌面端整体收起 / 展开 */
  const collapse = $("#sideCollapse");
  const syncCollapse = () => {
    const hidden = document.body.classList.contains("side-hidden");
    if(collapse) collapse.setAttribute("aria-expanded", hidden ? "false" : "true");
  };
  if(store.get(LS_HIDE, "0") === "1") document.body.classList.add("side-hidden");
  syncCollapse();
  if(collapse) collapse.onclick = () => {
    const hidden = document.body.classList.toggle("side-hidden");
    store.set(LS_HIDE, hidden ? "1" : "0");
    syncCollapse();
  };

  /* 阶段分组折叠：点击阶段名切换，多组状态存成逗号列表 */
  const saved = (store.get(LS_GRP, "") || "").split(",").filter(Boolean);
  $$(".side-group").forEach(g => {
    const head = $(".glabel", g);
    const key = head && head.dataset.grp;
    if(!head || !key) return;
    if(saved.indexOf(key) > -1) g.classList.add("collapsed");
    head.setAttribute("aria-expanded", g.classList.contains("collapsed") ? "false" : "true");
    head.onclick = () => {
      const collapsed = g.classList.toggle("collapsed");
      head.setAttribute("aria-expanded", collapsed ? "false" : "true");
      const cur = $$(".side-group.collapsed .glabel").map(x => x.dataset.grp);
      store.set(LS_GRP, cur.join(","));
    };
  });

  /* 移动端抽屉 */
  const sideToggle = $("#sideToggle");
  if(sideToggle) sideToggle.onclick = () => document.body.classList.toggle("side-open");
  links.forEach(l => l.addEventListener("click", () => document.body.classList.remove("side-open")));
}

/* ---------------- 启动 ---------------- */
function boot(){
  hydrateIcons();
  THEME.init();
  bootChrome();

  /* 首屏先把文字画出来，可视化放到下一轮任务再挂载（避免阻塞首次渲染）
     注意：用 setTimeout 而不是 rAF —— 后台标签页 / 截图工具里 rAF 可能被暂停 */
  setTimeout(() => {
    try{ new ParticleNet($("#heroCanvas")); }catch(e){ console.error("ParticleNet", e); }
    try{ new TypeTerm($("#heroTerm")); }catch(e){ console.error("TypeTerm", e); }
    watchViz();
  }, 0);

  /* 主题切换 → 重建已挂载的可视化 */
  window.addEventListener("themechange", () => initViz());
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", boot)
  : boot();
