/* ============================================================
   阶段五 · 应用层协议族
   ============================================================ */
(function () {
  "use strict";
  var PF = window.PF;
  var tone = PF.tone;   /* 主题感知的 Canvas 文本色 */
  var TC = PF.C;      /* 主题感知的强调色 */

  /* ============ 可视化 1：DNS 递归 + 迭代查询 ============ */
  PF.VIZ["s5-dns"] = function (stage) {
    var NODES = [
      { id: "client", n: "客户端", sub: "浏览器", x: .07, c: TC("#4d8dff") },
      { id: "local", n: "本地 DNS", sub: "递归服务器", x: .29, c: TC("#35e5d4") },
      { id: "root", n: "根域名服务器", sub: "13 组，全球分布", x: .51, c: TC("#9b8cff") },
      { id: "tld", n: "顶级域服务器", sub: ".com / .cn", x: .72, c: TC("#ffb454") },
      { id: "auth", n: "权威服务器", sub: "example.com", x: .93, c: TC("#57e08a") }
    ];
    var STEPS = [
      { from: "client", to: "local", fwd: "查询 www.example.com", back: "稍等，我来查", d: "客户端 → 本地 DNS 是 **递归查询**：客户端只要最终结果，剩下的活全交给本地 DNS。", tag: "递归" },
      { from: "local", to: "root", fwd: "www.example.com 在哪？", back: "去问 .com 的 TLD 服务器", d: "本地 DNS → 根服务器是 **迭代查询**：根服务器不替你查，只给你「线索」（.com 的地址）。", tag: "迭代" },
      { from: "local", to: "tld", fwd: "www.example.com 在哪？", back: "去问 example.com 的权威服务器", d: "TLD 服务器同样只给线索：**example.com 的权威服务器地址**。", tag: "迭代" },
      { from: "local", to: "auth", fwd: "www.example.com 的 A 记录？", back: "A 93.184.216.34", d: "权威服务器给出**最终答案**：A 记录 93.184.216.34。", tag: "答案" },
      { from: "local", to: "client", fwd: "93.184.216.34", back: "", d: "本地 DNS 把结果返回客户端，并按 **TTL** 缓存起来——下次再问就直接命中缓存了。", tag: "缓存" }
    ];
    var cv = document.createElement("canvas");
    cv.className = "viz-canvas";
    stage.appendChild(cv);
    var cap = document.createElement("div");
    cap.className = "arp-cap";
    stage.appendChild(cap);
    var D = 3600;

    var scene = PF.Scene(cv, {
      height: 300,
      draw: function (s, t) {
        var ctx = s.ctx, W = s.W, H = s.H;
        ctx.clearRect(0, 0, W, H);
        var y = H * .45;
        var si = Math.floor(t / D) % STEPS.length, st = STEPS[si], p = (t % D) / D;
        // 连线
        for (var i = 0; i < NODES.length - 1; i++) {
          ctx.strokeStyle = tone("line", .2); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(NODES[i].x * W + 34, y); ctx.lineTo(NODES[i + 1].x * W - 34, y); ctx.stroke();
        }
        NODES.forEach(function (nd) {
          var x = nd.x * W;
          var on = nd.id === st.from || nd.id === st.to;
          ctx.beginPath(); ctx.arc(x, y, 32, 0, 6.2832);
          ctx.fillStyle = on ? "rgba(53,229,212,.14)" : tone("grid", .07);
          ctx.fill();
          ctx.strokeStyle = on ? nd.c : tone("line", .32);
          ctx.lineWidth = on ? 2 : 1.3; ctx.stroke();
          ctx.fillStyle = on ? tone("ink") : tone("ink2", .85);
          ctx.font = "600 11.5px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(nd.n, x, y + 4);
          ctx.fillStyle = tone("muted", .9); ctx.font = "10px sans-serif";
          ctx.fillText(nd.sub, x, y + 80);
        });
        var a = NODES.filter(function (n) { return n.id === st.from; })[0].x * W;
        var b = NODES.filter(function (n) { return n.id === st.to; })[0].x * W;
        /* 箭头文字放到节点圆的上/下方空白带，避免压住节点名 */
        if (p < .45) {
          var q = p / .45;
          arrow(ctx, a, b, PF.lerp(a, b, q), y - 16, TC("#4d8dff"), st.fwd, y - 48);
        } else if (p < .85 && st.back) {
          var q2 = (p - .45) / .4;
          arrow(ctx, b, a, PF.lerp(b, a, q2), y + 16, TC("#57e08a"), st.back, y + 52);
        } else if (!st.back) {
          var q3 = (p - .45) / .55;
          arrow(ctx, a, b, PF.lerp(a, b, q3), y - 16, TC("#4d8dff"), st.fwd, y - 48);
        }
        PF.dom(cap, '<span class="chip ' + (st.tag === "递归" ? "solid" : st.tag === "答案" ? "g" : st.tag === "缓存" ? "v" : "a") + '" style="flex-shrink:0">' + st.tag + "</span><span>" + PF.rich(st.d) + "</span>");
        if (player) player.sync();
      }
    });
    var player = PF.player({
      scene: scene, after: stage, count: STEPS.length, D: D, mode: "steps",
      labels: ["客户端 → 本地 DNS", "本地 DNS → 根", "本地 DNS → TLD", "本地 DNS → 权威", "本地 DNS → 客户端"]
    });
    function arrow(ctx, x1, x2, x, yy, c, label, ly) {
      var dir = x2 > x1 ? 1 : -1;
      ctx.strokeStyle = c; ctx.globalAlpha = .35; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(x1 + dir * 34, yy); ctx.lineTo(x, yy); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, yy, 5, 0, 6.2832); ctx.fill();
      ctx.font = "600 10.5px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(label, (x1 + x2) / 2, ly == null ? yy - 12 : ly);
    }
  };

  /* ============ 可视化 2：TLS 握手与证书链 ============ */
  PF.VIZ["s5-tls"] = function (stage) {
    var STEPS = [
      { who: "c", label: "ClientHello", sub: "支持的 TLS 版本、密码套件、随机数 R1", c: TC("#4d8dff"), d: "客户端说：我支持这些版本和加密套件，这是我的随机数 R1。" },
      { who: "s", label: "ServerHello + Certificate", sub: "选定套件、随机数 R2、**数字证书链**", c: TC("#35e5d4"), d: "服务端选定密码套件、给出随机数 R2，并下发**证书链**（站点证书 + 中间证书）。" },
      { who: "c", label: "验证证书", sub: "域名 / 有效期 / 签发者 / 吊销状态", c: TC("#ffb454"), d: "客户端用内置的**根 CA 公钥**逐级验签：域名匹配？有效期内？签发者可信？是否被吊销（CRL / OCSP）？**全部通过才会继续。**" },
      { who: "c", label: "密钥交换（ECDHE）", sub: "客户端算出预主密钥并加密发送", c: TC("#9b8cff"), d: "用 **ECDHE** 协商出预主密钥，再用 R1 + R2 + 预主密钥算出**会话密钥**。ECDHE 的临时密钥带来**前向保密**。" },
      { who: "s", label: "Finished", sub: "双方验证握手完整性", c: TC("#35e5d4"), d: "双方用会话密钥加密一条 Finished 消息互验，确认握手过程没有被篡改。" },
      { who: "b", label: "应用数据（对称加密）", sub: "AES-GCM / ChaCha20-Poly1305", c: TC("#57e08a"), d: "之后所有 HTTP 数据都用**对称加密**传输——**用慢的握手，换来快的全程加密。**" }
    ];
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<svg viewBox="0 0 720 330" class="viz-canvas" style="height:330px"></svg>' +
      '<div class="hs-desc" id="tlsDesc"></div>' +
      '<div class="cert-chain" id="certChain"></div>' +
      '<div class="viz-ctrl">' +
      '<button class="ctrl-btn" data-act="play">' + PF.icon("play") + "播放</button>" +
      '<button class="ctrl-btn" data-act="next">' + PF.icon("arrow-right") + "下一步</button>" +
      '<button class="ctrl-btn" data-act="reset">' + PF.icon("reset") + "重置</button>" +
      '<span class="ctrl-field" style="margin-left:auto"><span>步骤</span><b id="tlsProg" style="font-family:var(--font-mono);color:var(--c-cyan)">0 / 5</b></span>' +
      "</div>";
    stage.appendChild(wrap);
    var svg = PF.$("svg", wrap), desc = PF.$("#tlsDesc", wrap), chain = PF.$("#certChain", wrap), prog = PF.$("#tlsProg", wrap);
    var step = 0, timer = null;
    var CX = 150, SX = 570, TOP = 40;
    function draw() {
      var o = [];
      o.push('<text x="' + CX + '" y="24" text-anchor="middle" class="lbl-b" style="font-size:12.5px">客户端</text>');
      o.push('<text x="' + SX + '" y="24" text-anchor="middle" class="lbl-b" style="font-size:12.5px">服务端</text>');
      o.push('<line x1="' + CX + '" y1="34" x2="' + CX + '" y2="316" stroke="var(--line-2)" stroke-width="1.4"/>');
      o.push('<line x1="' + SX + '" y1="34" x2="' + SX + '" y2="316" stroke="var(--line-2)" stroke-width="1.4"/>');
      var y = TOP + 30;
      for (var i = 0; i <= step; i++) {
        var st = STEPS[i], last = i === step;
        var both = st.who === "b";
        var x1 = st.who === "s" ? SX : CX, x2 = st.who === "s" ? CX : SX;
        var dir = st.who === "s" ? -1 : 1;
        if (both) {
          o.push('<rect x="' + (CX + 30) + '" y="' + (y - 13) + '" width="' + (SX - CX - 60) + '" height="26" rx="8" fill="' + st.c + '" fill-opacity=".14" stroke="' + st.c + '"/>');
        } else {
          o.push('<line x1="' + x1 + '" y1="' + y + '" x2="' + (x2 - dir * 12) + '" y2="' + y + '" stroke="' + st.c + '" stroke-width="' + (last ? 2.6 : 1.6) + '" opacity="' + (last ? 1 : .45) + '"/>');
          o.push('<path d="M' + (x2 - dir * 12) + ' ' + y + ' l' + (-dir * 11) + ' -5.5 l0 11 Z" fill="' + st.c + '" opacity="' + (last ? 1 : .45) + '"/>');
        }
        o.push('<text x="360" y="' + (y - 10) + '" text-anchor="middle" style="font-family:var(--font-mono);font-size:10.5px;fill:' + st.c + '" opacity="' + (last ? 1 : .6) + '">' + st.label + "</text>");
        if (last) o.push('<circle cx="' + (st.who === "s" ? x1 : x1) + '" cy="' + y + '" r="4" fill="' + st.c + '"/>');
        y += 46;
      }
      svg.innerHTML = o.join("");
      desc.innerHTML = '<span class="chip solid" style="flex-shrink:0">' + STEPS[step].label + "</span><span>" + PF.rich(STEPS[step].d) + "</span>";
      prog.textContent = step + " / 5";
      // 证书链
      var show = step >= 1;
      chain.innerHTML = show ? '<div class="cc-title">证书链验证（自下而上）</div><div class="cc-list">' +
        cc("站点证书", "CN = www.example.com", "由中间 CA 签发", step >= 2) +
        cc("中间 CA 证书", "CN = Example Intermediate CA", "由根 CA 签发", step >= 2) +
        cc("根 CA 证书", "内置在操作系统 / 浏览器信任库", "自签名，离线保管", step >= 2) +
        '</div><div class="cc-note">' + (step >= 2 ? "✓ 验证通过：域名匹配、在有效期内、签发者可信、未被吊销 —— 地址栏亮起小锁 🔒" : "等待验证…") + "</div>" : "";
    }
    function cc(t, s, n, ok) {
      return '<div class="cc-item' + (ok ? " ok" : "") + '"><b>' + t + '</b><span>' + s + '</span><em>' + n + "</em></div>";
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; PF.$('[data-act="play"]', wrap).innerHTML = PF.icon("play") + "播放"; } }
    function play() {
      if (timer) { stop(); return; }
      PF.$('[data-act="play"]', wrap).innerHTML = PF.icon("pause") + "暂停";
      if (step >= STEPS.length - 1) step = 0;
      timer = setInterval(function () { if (step >= STEPS.length - 1) { stop(); return; } step++; draw(); }, 1400);
    }
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      if (b.dataset.act === "play") play();
      if (b.dataset.act === "next") { stop(); step = Math.min(STEPS.length - 1, step + 1); draw(); }
      if (b.dataset.act === "reset") { stop(); step = 0; draw(); }
    });
    draw();
  };

  /* ============ 可视化 3：HTTP 版本演进 ============ */
  PF.VIZ["s5-http"] = function (stage) {
    var cv = document.createElement("canvas");
    cv.className = "viz-canvas";
    stage.appendChild(cv);
    var cap = document.createElement("div");
    cap.className = "arp-cap";
    stage.appendChild(cap);
    var LANES = [
      { n: "HTTP/1.1", sub: "6 条 TCP 连接，队头阻塞", c: TC("#4d8dff"), mode: "h1" },
      { n: "HTTP/2", sub: "1 条 TCP，多路复用（仍有 TCP 层阻塞）", c: TC("#35e5d4"), mode: "h2" },
      { n: "HTTP/3", sub: "QUIC over UDP，丢包只卡一条流", c: TC("#9b8cff"), mode: "h3" }
    ];
    var D = 7000;
    PF.Scene(cv, {
      height: 320,
      draw: function (s, t) {
        var ctx = s.ctx, W = s.W, H = s.H;
        ctx.clearRect(0, 0, W, H);
        var laneH = H / 3;
        var p = (t % D) / D;
        for (var li = 0; li < 3; li++) {
          var cy = laneH * li + laneH / 2;
          var top = laneH * li + 6;
          ctx.fillStyle = tone("grid", .05);
          rr(ctx, 6, top, W - 12, laneH - 12, 12); ctx.fill();
          ctx.fillStyle = LANES[li].c; ctx.font = "600 12px 'Chakra Petch',sans-serif"; ctx.textAlign = "left";
          ctx.fillText(LANES[li].n, 16, cy - 6);
          ctx.fillStyle = tone("muted", .85); ctx.font = "10px sans-serif";
          ctx.fillText(LANES[li].sub, 16, cy + 9);
          var x0 = 200, x1 = W - 40;
          ctx.strokeStyle = tone("line", .2); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x1, cy); ctx.stroke();
          // 服务器
          ctx.beginPath(); ctx.arc(x1, cy, 9, 0, 6.2832);
          ctx.fillStyle = tone("grid", .14); ctx.fill();
          ctx.strokeStyle = tone("line", .45); ctx.stroke();
          var REQ = 6, travel = .5;
          if (LANES[li].mode === "h1") {
            for (var i = 0; i < REQ; i++) {
              var start = i * 0.13;
              var q = (p - start) / travel;
              if (q < 0 || q > 1.9) continue;
              var phase = q < 1 ? q : 2 - q;
              var xx = PF.lerp(x0, x1 - 14, phase);
              req(ctx, xx, cy, LANES[li].c, i, q > 1);
            }
          } else if (LANES[li].mode === "h2") {
            for (var j = 0; j < REQ; j++) {
              var st2 = j * 0.06;
              var q2 = (p - st2) / travel;
              if (q2 < 0 || q2 > 1.9) continue;
              var ph2 = q2 < 1 ? q2 : 2 - q2;
              req(ctx, PF.lerp(x0, x1 - 14, ph2), cy + (j % 2 ? -11 : 11) * .0, LANES[li].c, j, q2 > 1);
            }
            ctx.fillStyle = "rgba(53,229,212,.9)"; ctx.font = "9.5px monospace"; ctx.textAlign = "center";
            ctx.fillText("多路复用：一条连接并行跑多个流", (x0 + x1) / 2, cy + laneH / 2 - 16);
          } else {
            for (var k = 0; k < REQ; k++) {
              var st3 = k * 0.06;
              var q3 = (p - st3) / travel;
              if (q3 < 0 || q3 > 1.9) continue;
              var ph3 = q3 < 1 ? q3 : 2 - q3;
              req(ctx, PF.lerp(x0, x1 - 14, ph3), cy, LANES[li].c, k, q3 > 1);
            }
            // 丢包标记
            if (p > .62 && p < .72) {
              ctx.fillStyle = "rgba(255,107,107,.9)"; ctx.font = "600 10px sans-serif"; ctx.textAlign = "center";
              ctx.fillText("流 3 丢包 —— 只有它等待重传", (x0 + x1) / 2, cy + 22);
            }
          }
        }
        PF.dom(cap, PF.md('<span class="chip a">演进</span><span><b>HTTP/1.1</b> 用 6 条并行 TCP 连接缓解队头阻塞，但连接本身有开销；<b>HTTP/2</b> 用二进制分帧 + 多路复用把请求放进一条 TCP 连接，解决了**应用层**队头阻塞，但**TCP 层**丢包仍会卡住所有流；<b>HTTP/3</b> 直接换到 <b>QUIC（UDP）</b>，每个流独立，丢包只影响那一条流。</span>'));
      }
    });
    function req(ctx, x, y, c, i, back) {
      ctx.fillStyle = back ? TC("#57e08a") : c;
      ctx.globalAlpha = back ? .8 : 1;
      rr(ctx, x - 13, y - 9, 26, 18, 5); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#06121a"; ctx.font = "600 8.5px monospace"; ctx.textAlign = "center";
      ctx.fillText(back ? "R" + i : "Q" + i, x, y + 3);
    }
    function rr(ctx, x, y, w, h, r) {
      if (w <= 0 || h <= 0) { ctx.beginPath(); return; }
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  };

  /* ============ 注册阶段 ============ */
  PF.register({
    id: "s5", num: 5, title: "应用层协议族", short: "应用层协议",
    icon: "globe", accent: "var(--c-amber)", difficulty: 3, duration: "2 周", level: "★★★☆☆",
    tagline: "协议的「最后一公里」。HTTP、HTTPS、DNS、DHCP——你每天都在用它们，但未必真的懂它们。这一阶段把「输入网址到页面显示」的每一步都拆开。",
    tags: ["HTTP", "HTTPS/TLS", "DNS", "DHCP", "CDN"],
    lead: "应用层是唯一**直接面向用户**的一层。它不再关心「比特怎么传」，而是关心「用户要什么」。**HTTP 的语义、DNS 的层级、TLS 的信任链**——这三样东西构成了现代互联网的日常。",
    sections: [
      {
        id: "s5-1", title: "应用层与两大架构", icon: "globe",
        blocks: [
          { t: "p", x: "**应用层 ≠ 应用程序**。浏览器（Chrome）是应用程序，**HTTP 协议才是应用层协议**。应用层是「协议」的集合，不是「软件」的集合。" },
          { t: "table", head: ["架构", "工作方式", "优点", "缺点", "例子"], rows: [["**C/S**", "客户端主动请求，服务器被动响应", "管理集中、易维护", "服务器是瓶颈，成本高", "网站、微信"], ["**P2P**", "每台主机既是客户端又是服务器", "可扩展性强、成本低", "管理困难、安全性差", "BitTorrent、区块链"]] },
          { t: "callout", kind: "tip", title: "客户端与服务器是「角色」不是「设备」", x: "同一台电脑，你浏览网页时它是客户端，你用 Python 起一个 HTTP 服务时它就是服务器。**判断标准是「谁主动发起请求」。**" },
          { t: "p", x: "**反向代理** 是应用层的常见部署形态：客户端以为自己在直连服务器，实际请求先到 Nginx / 负载均衡器，再由它转发给后端。它的作用是**负载均衡、SSL 卸载、缓存、隐藏后端结构**。" }
        ]
      },
      {
        id: "s5-2", title: "HTTP 报文、方法与状态码", icon: "code",
        blocks: [
          { t: "p", x: "**HTTP 是无状态的应用层协议**，基于 TCP（默认 80 端口），采用「请求 / 响应」模型。报文格式分四段：**起始行 → 头部字段 → 空行（CRLF）→ 消息体**。" },
          { t: "code", title: "HTTP 请求与响应报文", x: "GET /index.html HTTP/1.1\nHost: www.example.com\nUser-Agent: Mozilla/5.0\nAccept: text/html\n\nHTTP/1.1 200 OK\nContent-Type: text/html; charset=utf-8\nContent-Length: 1234\nCache-Control: max-age=3600\n\n<html>...</html>" },
          { t: "table", head: ["方法", "语义", "幂等", "安全"], rows: [["**GET**", "获取资源", "✓", "✓"], ["**POST**", "提交数据 / 创建资源", "✗", "✗"], ["**PUT**", "整体替换资源", "✓", "✗"], ["**PATCH**", "局部更新", "✗", "✗"], ["**DELETE**", "删除资源", "✓", "✗"], ["**HEAD / OPTIONS**", "只取头部 / 查询支持的方法", "✓", "✓"]] },
          { t: "callout", kind: "warn", title: "GET 和 POST 的差别不只是「参数在哪」", x: "核心差别在**语义**：GET 是**安全且幂等**的（只读取，重复执行结果相同），POST 不是。这决定了**缓存、重试、爬虫、浏览器回退**的行为差异。" },
          { t: "table", head: ["状态码段", "含义", "必背例子"], rows: [["**1xx**", "信息", "101 Switching Protocols（WebSocket 升级）"], ["**2xx**", "成功", "200 OK、201 Created、204 No Content、206 Partial Content"], ["**3xx**", "重定向", "301 永久 / 302 临时 / 304 Not Modified / 307 / 308"], ["**4xx**", "客户端错误", "400、401、403、404、405、408、429 请求过多"], ["**5xx**", "服务器错误", "500、502 Bad Gateway、503、504 Gateway Timeout"]] },
          { t: "callout", kind: "key", title: "Host 头为什么必填", x: "**同一个 IP 上可能托管着几十个网站**（虚拟主机）。服务器靠 `Host` 头判断「你要访问的是哪个站点」。HTTP/1.1 起 Host 是**必填**的。" }
        ]
      },
      {
        id: "s5-3", title: "Cookie、Session 与 Token", icon: "key",
        blocks: [
          { t: "p", x: "HTTP 是**无状态**的——服务器默认不知道两次请求来自同一个人。于是有了三套补救方案：" },
          { t: "table", head: ["方案", "状态存在哪", "客户端携带什么", "特点"], rows: [["**Cookie**", "客户端", "服务器下发的键值对（自动回带）", "约 4 KB 上限；可设 HttpOnly / Secure / SameSite"], ["**Session**", "**服务器**", "只有一个 Session ID", "服务端有状态；分布式部署需要共享存储"], ["**JWT**", "客户端", "三段 Base64URL 的自包含令牌", "**无状态**、可跨服务；**仅防篡改不防读**"]] },
          { t: "callout", kind: "danger", title: "JWT 的 Payload 是明文可读的", x: "JWT 的 Payload 只是 **Base64URL 编码**，不是加密。**任何人都能解开看内容**，所以绝对不能把密码、身份证号等敏感信息放进去。它只保证「内容没被改过」。" }
        ]
      },
      {
        id: "s5-4", title: "HTTP 缓存机制", icon: "database",
        blocks: [
          { t: "p", x: "缓存分两层：**强缓存**（直接用本地，不发请求）与**协商缓存**（问服务器「变了吗」）。" },
          { t: "table", head: ["类型", "关键头部", "行为"], rows: [["**强缓存**", "`Cache-Control: max-age=3600`、`Expires`", "未过期就直接用本地副本，**不发请求**（200 from cache）"], ["**协商缓存**", "`ETag` / `If-None-Match`、`Last-Modified` / `If-Modified-Since`", "带标识问服务器；没变则返回 **304**，只回头部不回正文"]] },
          { t: "callout", kind: "key", title: "优先级与实战策略", x: "`Cache-Control` **优先于** `Expires`（后者是绝对时间，受客户端时钟影响）。**ETag 比 Last-Modified 更准**（内容指纹 vs 时间戳）。实战：**HTML 用 `no-cache`**（每次验证），**静态资源用 `max-age=31536000` + 文件名哈希**（内容变了文件名就变，永不过期）。" },
          { t: "callout", kind: "warn", title: "no-cache ≠ 不缓存", x: "`no-cache` 的意思是「**缓存但每次都要验证**」；真正不缓存是 **`no-store`**。这两个词坑过无数人。" }
        ]
      },
      {
        id: "s5-5", title: "HTTP 版本演进：1.1 → 2 → 3", icon: "zap",
        blocks: [
          { t: "viz", id: "s5-http", icon: "zap", title: "HTTP/1.1 vs 2 vs 3 · 同一条时间线", sub: "同样的 6 个请求，三种协议的不同命运", tag: "Animation", note: "**HTTP/1.0** 短连接（每请求一个 TCP）；**HTTP/1.1** 长连接 + Host 必填，但仍有**应用层队头阻塞**（同域最多 6 条连接）；**HTTP/2** 二进制分帧 + 多路复用 + HPACK 头部压缩，解决了应用层阻塞，**但 TCP 层丢包仍会卡住所有流**；**HTTP/3** 换用 **QUIC（基于 UDP）**，每个流独立，无传输层队头阻塞，还支持 **1-RTT / 0-RTT** 和**连接迁移**。" },
          { t: "table", head: ["版本", "解决什么", "遗留问题"], rows: [["**1.0**", "—", "每个请求都要新建 TCP 连接"], ["**1.1**", "长连接（Keep-Alive）、Host 必填、分块传输", "**应用层队头阻塞**；同域最多 6 连接"], ["**2**", "二进制分帧、多路复用、HPACK、服务器推送", "**TCP 层队头阻塞**"], ["**3**", "QUIC（UDP）、无传输层阻塞、0-RTT、连接迁移、QPACK", "UDP 可能被部分网络限制"]] }
        ]
      },
      {
        id: "s5-6", title: "HTTPS 与 TLS", icon: "lock",
        blocks: [
          { t: "p", x: "**HTTP 有三大安全缺陷**：明文传输（可被窃听）、无完整性校验（可被篡改）、无法验证身份（可被冒充）。**HTTPS = HTTP + TLS**，就是来补这三点的。" },
          { t: "table", head: ["加密方式", "原理", "优点", "缺点"], rows: [["**对称加密**", "加解密同一把密钥", "**快**，适合大数据量", "**密钥分发困难**"], ["**非对称加密**", "公钥加密 / 私钥解密（或私钥签名 / 公钥验签）", "**解决密钥分发**，支持签名", "**慢**，比对称慢几个数量级"], ["**混合加密**", "非对称协商会话密钥 + 对称加密数据", "兼顾安全与性能", "—（HTTPS 的方案）"]] },
          { t: "viz", id: "s5-tls", icon: "lock", title: "TLS 握手 · 证书链验证全过程", sub: "逐步播放，并观察证书链如何被逐级验签", tag: "Step Player", note: "**一句话总结**：「用慢的握手，换来快的全程加密，再用证书锁住身份。」**前向保密（PFS）**：ECDHE 的临时密钥意味着即使服务器长期私钥泄露，**历史会话也无法解密**。**TLS 1.3** 把握手从 2-RTT 降到 **1-RTT**（会话恢复可 0-RTT），并删除了所有不安全算法。" },
          { t: "callout", kind: "warn", title: "两个常见误解", x: "① **证书不是用来加密的**——证书只做**身份背书**（CA 用私钥对网站公钥签名），加密靠协商出的会话密钥。② **HTTPS 不代表网站可信**——它只保证「传输安全」和「你连的确实是这个域名」，不保证这个网站是好人。" }
        ]
      },
      {
        id: "s5-7", title: "DNS：互联网的电话簿", icon: "search",
        blocks: [
          { t: "p", x: "**DNS 把域名翻译成 IP**，是一个**分层、分布式**的系统。域名的层级从右到左：**根 → 顶级域（.com）→ 二级域（example.com）→ 主机（www）**。" },
          { t: "viz", id: "s5-dns", icon: "search", title: "DNS 递归 + 迭代查询全过程", sub: "看一次解析要问多少个服务器", tag: "Animation", note: "**客户端 → 本地 DNS 是递归查询**（客户端只要最终结果）；**本地 DNS → 根 / TLD / 权威服务器是迭代查询**（服务器只给线索，不给答案）。**这是最容易搞混的一点。**" },
          { t: "table", head: ["记录类型", "作用"], rows: [["**A / AAAA**", "域名 → IPv4 / IPv6 地址"], ["**CNAME**", "别名，指向另一个域名"], ["**MX**", "邮件服务器"], ["**NS**", "该域的权威服务器"], ["**TXT**", "文本记录，常用于 SPF / DKIM / DMARC 反垃圾邮件"], ["**PTR**", "反向解析（IP → 域名）"], ["**SOA / SRV / CAA**", "起始授权 / 服务发现 / 指定可签发证书的 CA"]] },
          { t: "p", x: "**DNS 的安全问题**：DNS 劫持（篡改解析结果）、缓存投毒（污染递归服务器缓存）、DNS 放大攻击（利用 DNS 响应比请求大得多来发动 DDoS）。防护手段：**DNSSEC**（对解析结果签名）、**DoH / DoT**（加密 DNS 查询，端口 443 / 853）。" }
        ]
      },
      {
        id: "s5-8", title: "DHCP 与其他常用协议", icon: "server",
        blocks: [
          { t: "p", x: "**DHCP** 让设备自动获得 IP、掩码、网关、DNS。核心是 **DORA 四步**：" },
          { t: "table", head: ["步骤", "方向", "说明"], rows: [["**D**iscover", "客户端 → 广播", "源 `0.0.0.0` → 目的 `255.255.255.255`：谁是 DHCP 服务器？"], ["**O**ffer", "服务器 → 单播 / 广播", "我能给你这个 IP，要不要？"], ["**R**equest", "客户端 → 广播", "我要这个 IP（广播是为了通知其他服务器「你们的 Offer 我不用了」）"], ["**A**CK", "服务器 → 单播 / 广播", "确认，租约生效"]] },
          { t: "p", x: "**租约与续约**：T1（租期 50%）单播续约，T2（87.5%）广播续约，100% 后重新跑 DORA。**拿不到 DHCP 时**，Windows 会自配 **APIPA（169.254.x.x）**——所以看到 169.254 开头的地址，说明**根本没拿到 DHCP**，不是「IP 冲突」。" },
          { t: "table", head: ["协议", "端口", "说明"], rows: [["**FTP**", "21（控制）/ 20（数据）", "双连接；**明文传输**，建议用 SFTP / FTPS"], ["**SMTP / POP3 / IMAP**", "25 / 110 / 143", "发邮件 / 收邮件（下载即删）/ 收邮件（服务器保留）"], ["**WebSocket**", "80 / 443", "一次 HTTP 握手**升级**为全双工持久连接，真正实时双向"], ["**CDN**", "—", "边缘节点就近缓存静态资源，降低时延、抗流量高峰"]] },
          { t: "callout", kind: "tip", title: "CDN 的本质", x: "**把内容搬到离用户更近的地方。** 用户访问时由 DNS 调度到最近的边缘节点，既降低了 RTT，又分散了源站压力——**这也是抗 DDoS 的重要手段。**" }
        ]
      },
      { id: "s5-terms", title: "术语速查表", icon: "list", blocks: [{ t: "terms", items: [
        { t: "HTTP / HTTPS", en: "—", d: "浏览器与服务器交换资源的请求 / 响应协议 / HTTP + TLS，默认 443" },
        { t: "CRLF", en: "—", d: "`\\r\\n`，报文行结束符，空行 = 单独一个 CRLF" },
        { t: "幂等 / 安全方法", en: "Idempotent / Safe", d: "执行一次与多次效果相同 / 不改变服务器状态" },
        { t: "Cookie / Session / JWT", en: "—", d: "状态存客户端 / 存服务器 / 自包含令牌（仅防篡改不防读）" },
        { t: "强缓存 / 协商缓存", en: "—", d: "未过期直接用本地 / 带 ETag 问服务器，304 复用" },
        { t: "Keep-Alive", en: "—", d: "一条 TCP 连接复用多个请求" },
        { t: "队头阻塞 / 多路复用", en: "HOL Blocking", d: "前面请求卡住后面全等 / HTTP/2 一条连接并行跑多个流" },
        { t: "QUIC", en: "—", d: "基于 UDP 的用户态传输协议，HTTP/3 的底座" },
        { t: "混合加密", en: "—", d: "非对称协商会话密钥，对称加密传数据" },
        { t: "前向保密", en: "PFS", d: "私钥泄露不影响历史会话，靠 ECDHE 实现" },
        { t: "CA / 数字证书 / 证书链", en: "—", d: "为公钥签名的可信第三方 / 公钥身份证 / 根→中间→站点的信任传递" },
        { t: "递归查询 / 迭代查询", en: "—", d: "要最终结果 / 只要线索，逐级去问" },
        { t: "DORA", en: "—", d: "DHCP 的 Discover → Offer → Request → ACK 四步" },
        { t: "APIPA", en: "—", d: "拿不到 DHCP 时自配 169.254.x.x" },
        { t: "WebSocket", en: "—", d: "一次 HTTP 握手升级为全双工持久连接" },
        { t: "CDN", en: "—", d: "边缘节点就近缓存静态资源" }
      ] }] },
      { id: "s5-pit", title: "常见误区", icon: "alert", blocks: [{ t: "pitfalls", items: [
        { t: "HTTP 与 HTTPS 只差一个 S", x: "**错误。** 实为多了 TLS 提供的**加密、认证、完整性**。" },
        { t: "GET 与 POST 只差参数位置", x: "**错误。** 核心差别在**语义**（幂等 / 安全），影响缓存与重试行为。" },
        { t: "JWT Payload 是加密的，可以放敏感信息", x: "**错误。** 只是 **Base64 编码**，明文可读。" },
        { t: "no-cache 就是不缓存", x: "**错误。** 它是「**缓存但每次验证**」；不存是 **no-store**。" },
        { t: "HTTP/2 已彻底解决队头阻塞", x: "**错误。** 只解决了**应用层**，**TCP 层**仍会阻塞（HTTP/3 才解决）。" },
        { t: "证书是用来加密的", x: "**错误。** 证书只做**身份背书**，加密靠协商出的会话密钥。" },
        { t: "看到 169.254.x.x 是 IP 冲突", x: "**错误。** 这是 **APIPA**，即 **DHCP 失败**。" },
        { t: "DNS 查询全程递归", x: "**错误。** 客户端到本地 DNS 是递归；本地 DNS 到权威服务器是**迭代**。" },
        { t: "域名分片 / 资源合并是好习惯", x: "**错误。** HTTP/2 之后这些反而成了**反模式**。" },
        { t: "HTTPS 就一定安全", x: "**错误。** 只保证传输安全，**不保证网站可信**。" }
      ] }] },
      { id: "s5-quiz", title: "自测练习", icon: "target", blocks: [{ t: "quiz", stage: "s5", items: [
        { q: "DNS 解析中，客户端到本地 DNS 服务器属于哪种查询？", o: ["迭代查询", "递归查询", "反向查询", "组播查询"], a: 1, e: "客户端只要**最终结果**，这是**递归查询**；本地 DNS 到根 / TLD / 权威服务器只要**线索**，是**迭代查询**。" },
        { q: "HTTP 状态码 304 表示什么？", o: ["资源已永久移动", "资源未修改，可继续用本地缓存", "服务器内部错误", "请求参数错误"], a: 1, e: "304 Not Modified 是**协商缓存**的结果：服务器告诉客户端「资源没变」，客户端继续用本地副本。" },
        { q: "HTTPS 为什么采用「混合加密」？", o: ["为了兼容老浏览器", "对称快但密钥难分发，非对称能分发但慢", "为了双重保险", "因为证书只能用非对称算法"], a: 1, e: "**对称加密快但送不出密钥，非对称加密能送密钥但慢**。所以用非对称协商出会话密钥，再用对称加密传输数据。" },
        { q: "关于 HTTP/2，下面说法正确的是？", o: ["彻底解决了队头阻塞", "用一条 TCP 连接多路复用多个流", "基于 UDP", "不再需要 TLS"], a: 1, e: "HTTP/2 用二进制分帧在**一条 TCP 连接**上多路复用，解决了**应用层**队头阻塞；但 **TCP 层**丢包仍会卡住所有流，这要靠 HTTP/3（QUIC）解决。" },
        { q: "设备自动获得 169.254.x.x 的地址，最可能的原因是？", o: ["IP 地址冲突", "DHCP 获取失败（APIPA）", "DNS 配置错误", "网关不可达"], a: 1, e: "169.254.0.0/16 是 **APIPA** 地址段，主机在**拿不到 DHCP 响应**时自动分配。" }
      ] }] }
    ]
  });

})();
