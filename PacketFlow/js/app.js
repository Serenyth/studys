/* ============================================================
   PacketFlow · app.js
   路由 / 首页 / 阶段页 / 搜索 / 进度 / 交互绑定
   ============================================================ */
(function () {
  "use strict";
  var PF = window.PF;

  /* ---------------- 进度存储 ---------------- */
  var KEY = "packetflow.progress.v1";
  var done = {};
  try { (JSON.parse(localStorage.getItem(KEY)) || []).forEach(function (k) { done[k] = 1; }); } catch (e) { }
  function saveProgress() {
    try { localStorage.setItem(KEY, JSON.stringify(Object.keys(done))); } catch (e) { }
    paintProgress();
  }
  function doneCount() { return Object.keys(done).filter(function (k) { return done[k]; }).length; }

  function paintProgress() {
    var total = PF.stages.length || 1;
    var pct = Math.round(doneCount() / total * 100);
    var ring = PF.$("#ringFg"), ringTxt = PF.$("#ringText");
    if (ring) ring.style.strokeDashoffset = String(103.7 * (1 - pct / 100));
    if (ringTxt) ringTxt.textContent = pct + "%";
    var spPct = PF.$("#spPct"), spFill = PF.$("#spFill"), spSub = PF.$("#spSub");
    if (spPct) spPct.textContent = pct + "%";
    if (spFill) spFill.style.width = pct + "%";
    if (spSub) spSub.textContent = "已完成 " + doneCount() + " / " + total + " 阶段";
    PF.$$(".side-item").forEach(function (n) {
      n.classList.toggle("done", !!done[n.dataset.stage]);
    });
    var db = PF.$(".done-toggle");
    if (db) db.classList.toggle("done", !!done[db.dataset.stage]);
  }

  /* ---------------- 侧边栏 ---------------- */
  function renderSidebar() {
    var nav = PF.$("#sideNav");
    var html = '<div class="side-group"><div class="side-label">总览</div>' +
      '<a class="side-item" href="#/home" data-link data-stage="_home">' +
      '<span class="si-ic">' + PF.icon("grid") + '</span><span class="si-txt">学习首页</span><span class="si-dot"></span></a></div>' +
      '<div class="side-group"><div class="side-label">七个阶段</div>';
    PF.stages.forEach(function (s) {
      html += '<a class="side-item" href="#/stage/' + s.id + '" data-link data-stage="' + s.id + '">' +
        '<span class="si-num">' + s.num + '</span><span class="si-txt">' + PF.esc(s.short) + '</span><span class="si-dot"></span></a>';
    });
    html += "</div>";
    nav.innerHTML = html;
  }
  function setActiveNav(id) {
    PF.$$(".side-item").forEach(function (n) {
      n.classList.toggle("active", n.dataset.stage === id);
    });
  }

  /* ---------------- 首页 ---------------- */
  function heroArt() {
    var L = ["应用层", "传输层", "网络层", "数据链路层", "物理层"];
    var g = ['<svg viewBox="0 0 400 360" fill="none">'];
    g.push('<defs><linearGradient id="pg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#35e5d4"/><stop offset="1" stop-color="#9b8cff"/></linearGradient>' +
      '<filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>');
    for (var i = 0; i < 5; i++) {
      var y = 22 + i * 62;
      g.push('<rect x="26" y="' + y + '" width="150" height="46" rx="12" fill="rgba(120,150,190,.07)" stroke="rgba(120,150,190,.28)"/>');
      g.push('<text x="42" y="' + (y + 29) + '" fill="#b9c5d8" font-size="12.5" font-family="sans-serif">' + L[i] + "</text>");
      g.push('<rect x="224" y="' + y + '" width="150" height="46" rx="12" fill="rgba(120,150,190,.07)" stroke="rgba(120,150,190,.28)"/>');
      g.push('<text x="240" y="' + (y + 29) + '" fill="#b9c5d8" font-size="12.5" font-family="sans-serif">' + L[i] + "</text>");
    }
    g.push('<path d="M101 45 L101 313 L299 313 L299 45" stroke="rgba(120,150,190,.25)" stroke-width="1.4" stroke-dasharray="5 6" fill="none"/>');
    g.push('<circle r="7" fill="url(#pg1)" filter="url(#glow)">' +
      '<animateMotion dur="7s" repeatCount="indefinite" keyPoints="0;0.38;0.5;0.88;1" keyTimes="0;0.38;0.5;0.88;1" calcMode="linear" path="M101 45 L101 313 L299 313 L299 45"/>' +
      "</circle>");
    g.push('<circle r="4" fill="#35e5d4" opacity=".8"><animateMotion dur="7s" begin="2.3s" repeatCount="indefinite" path="M101 45 L101 313 L299 313 L299 45"/></circle>');
    g.push('<circle r="4" fill="#ffb454" opacity=".8"><animateMotion dur="7s" begin="4.6s" repeatCount="indefinite" path="M101 45 L101 313 L299 313 L299 45"/></circle>');
    g.push("</svg>");
    return g.join("");
  }

  function renderHome() {
    var totalTerms = 0, totalViz = 0;
    PF.stages.forEach(function (s) {
      totalViz += (s.sections || []).reduce(function (a, x) {
        return a + (x.blocks || []).filter(function (b) { return b.t === "viz"; }).length;
      }, 0);
      totalTerms += (s.sections || []).reduce(function (a, x) {
        return a + (x.blocks || []).reduce(function (c, b) { return c + (b.t === "terms" ? b.items.length : 0); }, 0);
      }, 0);
    });

    var html = "";
    html += '<section class="hero"><div class="container"><div class="hero-grid">';
    html += '<div class="hero-copy reveal">' +
      '<div class="hero-badge"><span class="dot"></span>交互式学习 · 7 个阶段 · ' + totalViz + ' 个可视化实验</div>' +
      '<h1>把计算机网络<br><span class="grad">拆开来看</span></h1>' +
      '<p class="hero-sub">从「数据为什么要分层」，到「一个数据包怎么穿过十几个路由器」，再到「TLS 怎么保证你不被偷看」—— 用 <code>动画</code>、<code>Canvas</code> 和 <code>可交互模型</code>，把抽象协议变成看得见的过程。</p>' +
      '<div class="hero-cta">' +
      '<a class="btn btn-primary" href="#/stage/s1" data-link>' + PF.icon("play") + "从阶段一开始</a>" +
      '<a class="btn btn-ghost" href="#/stage/s7" data-link>' + PF.icon("shield") + "直接看网络安全</a>" +
      "</div>" +
      '<div class="hero-stats">' +
      '<div class="hstat"><b data-count="' + PF.stages.length + '">0</b><span>学习阶段</span></div>' +
      '<div class="hstat"><b data-count="' + totalViz + '">0</b><span>交互可视化</span></div>' +
      '<div class="hstat"><b data-count="' + totalTerms + '">0</b><span>核心术语</span></div>' +
      '<div class="hstat"><b data-count="35">0</b><span>自测题目</span></div>' +
      "</div></div>";
    html += '<div class="hero-art reveal d2">' + heroArt() + "</div>";
    html += "</div></div></section>";

    html += '<section class="sec"><div class="container">' +
      '<div class="sec-head reveal"><div><div class="sec-eyebrow">Learning Path</div>' +
      '<h2 class="sec-title">七个阶段，一条完整路径</h2>' +
      '<p class="sec-desc">从底层到顶层、从原理到攻防。每个阶段都配有可点击、可拖拽、可播放的交互模型。</p></div></div>' +
      '<div class="stage-grid">' + PF.stages.map(stageCard).join("") + "</div>" +
      "</div></section>";

    html += '<section class="sec"><div class="container">' +
      '<div class="sec-head reveal"><div><div class="sec-eyebrow">How to use</div><h2 class="sec-title">怎么用这个平台</h2></div></div>' +
      '<div class="stage-grid">' +
      useCard("book", "先读「一句话职责」", "每个知识点都用一句话点题，再展开细节。看不懂公式不要紧，先抓住「它解决什么问题」。", "var(--c-cyan)") +
      useCard("sparkle", "再玩「交互实验」", "带 <span class='chip solid'>Animation</span> <span class='chip v'>Interactive</span> 标记的区块都是可操作的：点播放、拖滑块、改输入，看结果怎么变。", "var(--c-violet)") +
      useCard("target", "最后做「自测」", "每个阶段末尾有自测题与误区清单。做完标记「完成本阶段」，左上角进度环会同步增长。", "var(--c-amber)") +
      "</div></div></section>";

    var v = PF.$("#viewHome");
    v.innerHTML = html;

    PF.hydrateIcons(v);
    PF.revealInit(v);
    // 数字滚动
    PF.$$("[data-count]", v).forEach(function (n) {
      PF.countTo(n, +n.dataset.count, 1200);
    });
  }

  function stageCard(s) {
    var dif = "";
    for (var i = 1; i <= 4; i++) dif += '<i class="' + (i <= s.difficulty ? "on" : "") + '"></i>';
    return '<article class="card stage-card hoverable reveal" data-goto="' + s.id + '" style="--accent:' + s.accent + '">' +
      '<div class="sc-top"><div class="sc-glow"></div>' +
      '<div class="sc-head"><span class="sc-num">STAGE 0' + s.num + '</span><span class="sc-ic">' + PF.icon(s.icon) + "</span></div>" +
      '<h3 class="sc-title">' + PF.esc(s.title) + "</h3>" +
      '<p class="sc-desc">' + PF.rich(s.tagline) + "</p>" +
      '<div class="sc-tags">' + s.tags.map(function (t) { return '<span class="chip">' + PF.esc(t) + "</span>"; }).join("") + "</div>" +
      "</div>" +
      '<div class="sc-foot"><span class="row" style="gap:9px"><span class="sc-diff">' + dif + "</span>" + PF.esc(s.duration) + "</span>" +
      '<span class="go">进入阶段 ' + PF.icon("arrow-right") + "</span></div></article>";
  }

  function useCard(icon, t, x, c) {
    return '<div class="card reveal" style="--accent:' + c + '">' +
      '<div class="sc-ic" style="margin-bottom:14px">' + PF.icon(icon) + "</div>" +
      '<h3 class="sc-title" style="font-size:16px">' + t + "</h3>" +
      '<p class="sc-desc" style="min-height:0">' + x + "</p></div>";
  }

  /* ---------------- 阶段页 ---------------- */
  function renderStage(id, targetSec) {
    var s = PF.stages.filter(function (x) { return x.id === id; })[0];
    if (!s) { renderHome(); return; }
    var idx = PF.stages.indexOf(s);
    var prev = PF.stages[idx - 1], next = PF.stages[idx + 1];

    var html = '<div class="stage-hero" style="--accent:' + s.accent + '"><div class="sh-glow"></div><div class="container">' +
      '<div class="crumb"><a href="#/home" data-link>首页</a>' + PF.icon("chevron-right") + "<span>阶段 " + s.num + "</span></div>" +
      '<h1>' + PF.esc(s.title) + "</h1>" +
      '<p class="lead">' + PF.rich(s.lead) + "</p>" +
      '<div class="stage-meta">' +
      '<span class="meta-pill">' + PF.icon(s.icon) + "STAGE 0" + s.num + "</span>" +
      '<span class="meta-pill">' + PF.icon("clock") + PF.esc(s.duration) + "</span>" +
      '<span class="meta-pill">' + PF.icon("activity") + "难度 " + s.level + "</span>" +
      s.tags.map(function (t) { return '<span class="meta-pill">' + PF.icon("bookmark") + PF.esc(t) + "</span>"; }).join("") +
      "</div></div></div>";

    html += '<div class="container" style="padding-bottom:60px">';
    s.sections.forEach(function (sec, i) { html += PF.renderSection(sec, i); });

    html += '<div class="done-bar reveal"><div class="db-txt"><b>学完这一阶段了吗？</b><span>标记后，首页进度环与侧边栏会同步更新。</span></div>' +
      '<button class="done-toggle" data-stage="' + s.id + '">' + PF.icon("check") + '<span data-done-label>标记为已完成</span></button></div>';

    html += '<div class="stage-nav">' +
      (prev ? '<a class="snav" href="#/stage/' + prev.id + '" data-link><span class="sn-ic">' + PF.icon("arrow-left") + "</span>" +
        '<span class="sn-txt"><span>上一阶段</span><b>' + PF.esc(prev.title) + "</b></span></a>"
        : '<span class="snav disabled"><span class="sn-ic">' + PF.icon("arrow-left") + '</span><span class="sn-txt"><span>上一阶段</span><b>没有了</b></span></span>') +
      (next ? '<a class="snav next" href="#/stage/' + next.id + '" data-link><span class="sn-ic">' + PF.icon("arrow-right") + "</span>" +
        '<span class="sn-txt"><span>下一阶段</span><b>' + PF.esc(next.title) + "</b></span></a>"
        : '<a class="snav next" href="#/home" data-link><span class="sn-ic">' + PF.icon("award") + '</span><span class="sn-txt"><span>全部完成</span><b>回到首页</b></span></a>') +
      "</div></div>";

    var v = PF.$("#viewStage");
    v.innerHTML = html;
    PF.hydrateIcons(v);
    PF.mountViz(v);
    PF.revealInit(v);
    paintProgress();

    var db = PF.$(".done-toggle", v);
    if (db) {
      var lab = PF.$("[data-done-label]", db);
      if (lab) lab.textContent = done[s.id] ? "已完成本阶段" : "标记为已完成";
      db.addEventListener("click", function () {
        if (done[s.id]) { delete done[s.id]; } else { done[s.id] = 1; }
        if (lab) lab.textContent = done[s.id] ? "已完成本阶段" : "标记为已完成";
        saveProgress();
      });
    }
    if (targetSec) {
      var t = PF.$("#" + targetSec);
      if (t) setTimeout(function () { t.scrollIntoView({ behavior: "smooth", block: "start" }); }, 260);
    }
  }

  /* ---------------- 路由 ---------------- */
  function route() {
    PF.cleanup();
    var h = (location.hash || "").replace(/^#\/?/, "");
    var parts = h.split("/");
    var targetSec = parts[2] || null;
    var view;
    if (parts[0] === "stage" && parts[1]) {
      PF.$("#viewHome").classList.remove("active");
      view = PF.$("#viewStage");
      renderStage(parts[1], targetSec);
      setActiveNav(parts[1]);
    } else {
      PF.$("#viewStage").classList.remove("active");
      view = PF.$("#viewHome");
      renderHome();
      setActiveNav("_home");
    }
    view.classList.add("active");
    document.body.classList.remove("nav-open");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* ---------------- 搜索 ---------------- */
  var INDEX = [];
  function buildIndex() {
    INDEX = [];
    PF.stages.forEach(function (st) {
      INDEX.push({ stage: st.id, badge: "阶段 " + st.num, title: st.title, sub: st.tagline, kw: (st.title + " " + st.short + " " + st.tags.join(" ")) });
      st.sections.forEach(function (sec) {
        INDEX.push({ stage: st.id, sec: sec.id, badge: "章节", title: sec.title, sub: sec.sub || "", kw: sec.title });
        (sec.blocks || []).forEach(function (b) {
          if (b.t === "terms") b.items.forEach(function (it) {
            INDEX.push({ stage: st.id, sec: sec.id, badge: "术语", title: it.t, sub: it.d, kw: it.t + " " + (it.en || "") + " " + it.d });
          });
          if (b.t === "pitfalls") b.items.forEach(function (it) {
            INDEX.push({ stage: st.id, sec: sec.id, badge: "误区", title: it.t, sub: it.x, kw: it.t + " " + it.x });
          });
          if (b.t === "viz") {
            INDEX.push({ stage: st.id, sec: sec.id, badge: "实验", title: b.title, sub: b.sub || "", kw: b.title + " " + (b.sub || "") });
          }
          if (b.t === "table") {
            b.rows.forEach(function (r) {
              var line = r.join(" ");
              INDEX.push({ stage: st.id, sec: sec.id, badge: "表格", title: r[0], sub: line, kw: line });
            });
          }
        });
      });
    });
  }
  function doSearch(q) {
    q = q.trim().toLowerCase();
    var box = PF.$("#searchResults");
    if (!q) { box.innerHTML = '<div class="sr-empty">输入关键词开始搜索 —— 例如「子网掩码」「三次握手」「VLAN」「TLS」</div>'; return; }
    var hits = INDEX.filter(function (it) { return it.kw.toLowerCase().indexOf(q) > -1; }).slice(0, 24);
    if (!hits.length) { box.innerHTML = '<div class="sr-empty">没有找到与「' + PF.esc(q) + "」相关的内容</div>"; return; }
    box.innerHTML = hits.map(function (it, i) {
      return '<div class="sr-item' + (i === 0 ? " sel" : "") + '" data-stage="' + it.stage + '" data-sec="' + (it.sec || "") + '">' +
        '<span class="si-badge">' + PF.esc(it.badge) + '</span><span class="si-body"><b>' + PF.esc(it.title) + "</b><span>" + PF.esc(it.sub || "") + "</span></span></div>";
    }).join("");
  }
  function openSearch() {
    PF.$("#searchPanel").classList.add("open");
    var inp = PF.$("#searchInput"); inp.value = ""; doSearch("");
    setTimeout(function () { inp.focus(); }, 40);
  }
  function closeSearch() { PF.$("#searchPanel").classList.remove("open"); }

  /* ---------------- 背景画布 ---------------- */
  function bgScene() {
    var cv = PF.$("#bgCanvas");
    var nodes = [], N = 0;
    function init(W, H) {
      N = Math.round(PF.clamp(W / 26, 26, 74));
      nodes = [];
      for (var i = 0; i < N; i++) {
        nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22, r: Math.random() * 1.6 + .9 });
      }
    }
    var S = PF.Scene(cv, {
      height: window.innerHeight,
      onResize: function (s) { init(s.W, s.H); cv.style.height = "100%"; },
      draw: function (s, t) {
        var ctx = s.ctx, W = s.W, H = s.H;
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < nodes.length; i++) {
          var a = nodes[i];
          a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > W) a.vx *= -1;
          if (a.y < 0 || a.y > H) a.vy *= -1;
        }
        for (var i2 = 0; i2 < nodes.length; i2++) {
          for (var j = i2 + 1; j < nodes.length; j++) {
            var dx = nodes[i2].x - nodes[j].x, dy = nodes[i2].y - nodes[j].y;
            var d2 = dx * dx + dy * dy;
            if (d2 < 26000) {
              var al = (1 - d2 / 26000) * .18;
              ctx.strokeStyle = "rgba(90,180,220," + al + ")";
              ctx.lineWidth = .8;
              ctx.beginPath(); ctx.moveTo(nodes[i2].x, nodes[i2].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
            }
          }
        }
        for (var k = 0; k < nodes.length; k++) {
          ctx.beginPath();
          ctx.arc(nodes[k].x, nodes[k].y, nodes[k].r, 0, 6.2832);
          ctx.fillStyle = "rgba(120,200,230,.42)";
          ctx.fill();
        }
        // 流动的数据包
        for (var m = 0; m < 3; m++) {
          var ph = ((t / 5200) + m * 0.33) % 1;
          var n1 = nodes[(m * 7 + 3) % nodes.length], n2 = nodes[(m * 11 + 9) % nodes.length];
          if (!n1 || !n2) continue;
          var px = PF.lerp(n1.x, n2.x, ph), py = PF.lerp(n1.y, n2.y, ph);
          ctx.beginPath(); ctx.arc(px, py, 2.4, 0, 6.2832);
          ctx.fillStyle = m === 0 ? "rgba(53,229,212,.85)" : m === 1 ? "rgba(155,140,255,.8)" : "rgba(255,180,84,.75)";
          ctx.fill();
        }
      }
    });
    S.resize();
  }

  /* ---------------- 全局交互 ---------------- */
  function bindGlobal() {
    // 主题
    var saved = null;
    try { saved = localStorage.getItem("packetflow.theme"); } catch (e) { }
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    PF.$("#themeToggle").addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") || "dark";
      var nx = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", nx);
      try { localStorage.setItem("packetflow.theme", nx); } catch (e) { }
      /* 重新挂载当前视图：Canvas 里存的是「算好的色值」，不重绘就还是旧主题的颜色 */
      var y = window.pageYOffset;
      route();
      bgScene();
      window.scrollTo({ top: y, behavior: "auto" });
    });

    // 移动端菜单
    PF.$("#navToggle").addEventListener("click", function () { document.body.classList.toggle("nav-open"); });
    PF.$("#scrim").addEventListener("click", function () { document.body.classList.remove("nav-open"); });

    // 搜索
    PF.$("#searchTrigger").addEventListener("click", openSearch);
    PF.$("#searchPanel").addEventListener("click", function (e) { if (e.target.id === "searchPanel") closeSearch(); });
    PF.$("#searchInput").addEventListener("input", function (e) { doSearch(e.target.value); });
    PF.$("#searchResults").addEventListener("click", function (e) {
      var it = e.target.closest(".sr-item"); if (!it) return;
      closeSearch();
      location.hash = "#/stage/" + it.dataset.stage + (it.dataset.sec ? "/" + it.dataset.sec : "");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeSearch(); document.body.classList.remove("nav-open"); }
      if (e.key === "/" && !/input|textarea/i.test((e.target.tagName || ""))) { e.preventDefault(); openSearch(); }
    });

    // 重置进度
    PF.$("#resetProgress").addEventListener("click", function () {
      done = {}; saveProgress();
    });

    // 回到顶部
    var toTop = PF.$("#toTop");
    toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

    // 滚动进度 + 顶栏状态
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var st = window.scrollY || document.documentElement.scrollTop;
        var h = document.documentElement.scrollHeight - window.innerHeight;
        var p = h > 0 ? st / h : 0;
        var sl = PF.$("#scrollLine");
        if (sl) sl.style.width = (p * 100) + "%";
        toTop.classList.toggle("show", st > 600);
        ticking = false;
      });
    }, { passive: true });

    // 卡片跳转
    document.addEventListener("click", function (e) {
      var card = e.target.closest("[data-goto]");
      if (card) { location.hash = "#/stage/" + card.dataset.goto; }
    });

    // 手风琴
    document.addEventListener("click", function (e) {
      var h = e.target.closest("[data-acc]");
      if (h) { h.parentNode.classList.toggle("open"); }
    });

    // 标签页
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-tab]");
      if (!b) return;
      var wrap = b.closest("[data-tabs]");
      PF.$$(".tab-btn", wrap).forEach(function (x) { x.classList.toggle("active", x === b); });
      PF.$$(".tab-pane", wrap).forEach(function (p) { p.classList.toggle("active", p.dataset.pane === b.dataset.tab); });
    });

    // 测验
    document.addEventListener("click", function (e) {
      var o = e.target.closest(".qq-opt"); if (!o) return;
      var q = o.closest(".quiz-q");
      if (q.dataset.done) return;
      q.dataset.done = "1";
      var ans = +q.dataset.answer;
      PF.$$(".qq-opt", q).forEach(function (x, i) {
        if (i === ans) x.classList.add("correct");
        else if (x === o) x.classList.add("wrong");
      });
      var ex = PF.$(".qq-explain", q);
      if (ex) ex.classList.add("show");
    });

    // 术语浮层
    var tip = PF.$("#tip"), tipOn = false;
    document.addEventListener("mouseover", function (e) {
      var t = e.target.closest(".term");
      if (!t || !t.dataset.def) return;
      tip.innerHTML = "<b>" + PF.esc(t.textContent) + "</b>" + PF.esc(t.dataset.def);
      tip.classList.add("show");
      var r = t.getBoundingClientRect();
      var tw = Math.min(300, tip.offsetWidth || 280);
      var x = PF.clamp(r.left + r.width / 2 - tw / 2, 12, window.innerWidth - tw - 12);
      var y = r.top - (tip.offsetHeight || 70) - 10;
      if (y < 8) y = r.bottom + 10;
      tip.style.left = x + "px"; tip.style.top = y + "px";
      tipOn = true;
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest(".term")) { tip.classList.remove("show"); tipOn = false; }
    });
    window.addEventListener("scroll", function () { if (tipOn) tip.classList.remove("show"); }, { passive: true });
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    PF.$("#brandMark").innerHTML = PF.brandMark();
    var fm = PF.$("#footMark"); if (fm) fm.innerHTML = PF.brandMark();
    renderSidebar();
    buildIndex();
    bindGlobal();
    bgScene();
    window.addEventListener("hashchange", route);
    if (!location.hash) location.hash = "#/home";
    route();
    PF.hydrateIcons(document);

    var vizN = 0, termN = 0;
    PF.stages.forEach(function (s) {
      (s.sections || []).forEach(function (x) {
        (x.blocks || []).forEach(function (b) {
          if (b.t === "viz") vizN++;
          if (b.t === "terms") termN += b.items.length;
        });
      });
    });
    var fs = PF.$("#footStat");
    if (fs) fs.textContent = termN + " 个术语 · " + vizN + " 个交互实验 · 7 个阶段";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
