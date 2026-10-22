/* ============================================================
   阶段七 · 网络安全基础
   ============================================================ */
(function () {
  "use strict";
  var PF = window.PF;

  /* ---------- 主题色（Canvas / SVG 用，实现在 core.js） ---------- */
  var T = PF.T, C = PF.C, hexA = PF.hexA, tone = PF.tone;
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
  function box(ctx, x, y, w, h, c, title, sub, on) {
    c = C(c);
    rr(ctx, x - w / 2, y - h / 2, w, h, 9);
    ctx.fillStyle = on ? hexA(c, .16) : T("panel", "#151d2a");
    ctx.fill();
    ctx.strokeStyle = on ? c : T("grid", "rgba(120,150,190,.14)");
    ctx.lineWidth = on ? 2 : 1.3; ctx.stroke();
    ctx.textAlign = "center";
    if (title) {
      ctx.fillStyle = on ? c : T("ink2", "#b9c5d8");
      ctx.font = "600 11.5px 'Chakra Petch',sans-serif";
      ctx.fillText(title, x, sub ? y - 2 : y + 4);
    }
    if (sub) {
      ctx.fillStyle = T("muted", "#7f8da3"); ctx.font = "9.5px sans-serif";
      ctx.fillText(sub, x, y + 11);
    }
  }

  /* ---------- 纯 JS SHA-256（离线可用，无需 crypto.subtle） ---------- */
  var K256 = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
  function utf8Bytes(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0xd800 || c >= 0xe000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else {
        i++; var c2 = s.charCodeAt(i);
        var cp = 0x10000 + (((c & 0x3ff) << 10) | (c2 & 0x3ff));
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      }
    }
    return out;
  }
  function sha256Hex(str) {
    var bytes = utf8Bytes(str), l = bytes.length;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    var hi = Math.floor(l / 536870912), lo = (l * 8) >>> 0;
    bytes.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255);
    bytes.push((lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
    var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var w = new Array(64);
    for (var i = 0; i < bytes.length; i += 64) {
      for (var j = 0; j < 16; j++) {
        w[j] = (bytes[i + j * 4] << 24) | (bytes[i + j * 4 + 1] << 16) | (bytes[i + j * 4 + 2] << 8) | bytes[i + j * 4 + 3];
      }
      for (j = 16; j < 64; j++) {
        var s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        var s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (j = 0; j < 64; j++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (hh + S1 + ch + K256[j] + w[j]) | 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    return h.map(function (x) { return ("00000000" + (x >>> 0).toString(16)).slice(-8); }).join("");
  }

  /* ============================================================
     可视化 1：CIA 三要素（可交互三角）
     ============================================================ */
  PF.VIZ["s7-cia"] = function (stage) {
    var CIA = [
      {
        k: "C", n: "机密性", en: "Confidentiality", c: "#4d8dff",
        def: "信息**不被未授权者获取**。",
        bad: "数据泄露——密码、身份证、商业机密外流。",
        tech: ["对称 / 非对称加密", "访问控制（ACL / RBAC）", "数据脱敏、最小权限"],
        atk: ["窃听 / 流量分析", "数据泄露", "钓鱼窃取账号", "未授权访问"],
        x: 180, y: 66
      },
      {
        k: "I", n: "完整性", en: "Integrity", c: "#9b8cff",
        def: "信息**不被未授权篡改**。",
        bad: "数据被改——转账金额、订单内容、日志被抹。",
        tech: ["哈希 / 校验和", "数字签名 / HMAC", "AEAD 认证加密", "版本与审计"],
        atk: ["中间人篡改", "SQL 注入改数据", "ARP / DNS 欺骗", "文件替换"],
        x: 62, y: 252
      },
      {
        k: "A", n: "可用性", en: "Availability", c: "#ffb454",
        def: "授权用户**需要时能正常访问**。",
        bad: "服务瘫痪——DDoS、勒索软件、单点故障。",
        tech: ["冗余 / 集群 / 负载均衡", "备份与容灾", "抗 DDoS / 流量清洗", "限流与降级"],
        atk: ["DDoS / SYN Flood", "勒索软件", "资源耗尽", "物理破坏"],
        x: 298, y: 252
      }
    ];
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="cia-wrap">' +
      '<div class="cia-fig"><svg viewBox="0 0 360 320" class="cia-svg">' +
      '<polygon points="180,66 62,252 298,252" fill="none" stroke="var(--line-2)" stroke-width="1.6" stroke-dasharray="6 6"/>' +
      '<text x="180" y="176" text-anchor="middle" class="cia-cen">CIA</text>' +
      '<text x="180" y="196" text-anchor="middle" class="cia-cen-sub">信息安全三要素</text>' +
      CIA.map(function (d) {
        return '<g class="cia-node" data-cia="' + d.k + '">' +
          '<circle cx="' + d.x + '" cy="' + d.y + '" r="50" fill="' + hexA(C(d.c), .13) + '" stroke="' + C(d.c) + '" stroke-width="1.8"/>' +
          '<text x="' + d.x + '" y="' + (d.y - 4) + '" text-anchor="middle" class="cia-lbl" style="fill:' + C(d.c) + '">' + d.k + "</text>" +
          '<text x="' + d.x + '" y="' + (d.y + 16) + '" text-anchor="middle" class="cia-sub">' + d.n + "</text></g>";
      }).join("") +
      "</svg></div>" +
      '<div class="cia-detail" id="ciaDetail"></div>' +
      "</div>";
    stage.appendChild(wrap);

    var detail = PF.$("#ciaDetail", wrap);
    function show(k) {
      var d = CIA.filter(function (x) { return x.k === k; })[0];
      PF.$$(".cia-node", wrap).forEach(function (g) {
        g.classList.toggle("on", g.dataset.cia === k);
      });
      detail.style.setProperty("--dc", C(d.c));
      detail.innerHTML =
        '<div class="cia-head"><span class="cia-badge">' + d.k + '</span><b>' + d.n + '</b><em>' + d.en + "</em></div>" +
        '<p class="cia-def">' + PF.rich(d.def) + "</p>" +
        '<div class="cia-blk"><span>被破坏的后果</span><p>' + PF.rich(d.bad) + "</p></div>" +
        '<div class="cia-blk"><span>保障手段</span><ul>' + d.tech.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul></div>" +
        '<div class="cia-blk danger"><span>对应攻击</span><div class="cia-tags">' +
        d.atk.map(function (t) { return '<span class="cia-tag">' + t + "</span>"; }).join("") + "</div></div>";
    }
    wrap.addEventListener("click", function (e) {
      var g = e.target.closest("[data-cia]"); if (g) show(g.dataset.cia);
    });
    show("C");
  };

  /* ============================================================
     可视化 2：对称 / 非对称 / 数字签名 三条流程
     ============================================================ */
  PF.VIZ["s7-crypto"] = function (stage) {
    var cv = document.createElement("canvas");
    cv.className = "viz-canvas";
    stage.appendChild(cv);
    var cap = document.createElement("div");
    cap.className = "arp-cap";
    stage.appendChild(cap);
    var D = 6000;
    var LANES = [
      {
        n: "对称加密", c: "#35e5d4", sub: "同一把密钥加解密",
        lk: "共享密钥 K", lkc: "#35e5d4", rk: "共享密钥 K", rkc: "#35e5d4",
        out: "密文", note: "**快，但密钥怎么安全送达？**——这就是「密钥分发难题」。"
      },
      {
        n: "非对称加密", c: "#4d8dff", sub: "公钥加密 → 私钥解密（保机密）",
        lk: "接收方公钥", lkc: "#57e08a", rk: "接收方私钥", rkc: "#ff6b6b",
        out: "密文", note: "**公钥可以随便公开**，解决了密钥分发；但**慢**，不适合大数据量。"
      },
      {
        n: "数字签名", c: "#9b8cff", sub: "私钥签名 → 公钥验签（保身份 + 完整）",
        lk: "发送方私钥", lkc: "#ff6b6b", rk: "发送方公钥", rkc: "#57e08a",
        out: "消息 + 签名", note: "**只有你能签，谁都能验。** 提供身份认证、完整性、不可否认性。"
      }
    ];
    PF.Scene(cv, {
      height: 400,
      draw: function (s, t) {
        var ctx = s.ctx, W = s.W, H = s.H;
        ctx.clearRect(0, 0, W, H);
        var laneH = H / 3, p = (t % D) / D;
        LANES.forEach(function (L, li) {
          var lc = C(L.c);
          var cy = laneH * li + laneH / 2 + 8;
          var top = laneH * li + 6;
          ctx.fillStyle = T("grid", "rgba(120,150,190,.14)");
          ctx.globalAlpha = .5; rr(ctx, 6, top, W - 12, laneH - 12, 12); ctx.fill(); ctx.globalAlpha = 1;

          ctx.textAlign = "left";
          ctx.fillStyle = lc; ctx.font = "600 12.5px 'Chakra Petch',sans-serif";
          ctx.fillText(L.n, 16, top + 18);
          ctx.fillStyle = T("muted", "#7f8da3"); ctx.font = "10px sans-serif";
          ctx.fillText(L.sub, 16, top + 32);

          var x1 = W * .30, x2 = W * .78;
          ctx.strokeStyle = T("line", "rgba(120,150,190,.26)"); ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(x1 + 44, cy); ctx.lineTo(x2 - 44, cy); ctx.stroke();

          box(ctx, x1, cy, 88, 34, L.c, "发送方", null, false);
          box(ctx, x2, cy, 88, 34, L.c, "接收方", null, false);

          // 密钥标注
          ctx.textAlign = "center"; ctx.font = "600 9.5px sans-serif";
          ctx.fillStyle = C(L.lkc);
          ctx.fillText("🔑 " + L.lk, x1, cy + 30);
          ctx.fillStyle = C(L.rkc);
          ctx.fillText("🔑 " + L.rk, x2, cy + 30);

          // 数据包往返
          var q = PF.clamp(p / .78, 0, 1);
          var half = q < .5 ? q / .5 : 1 - (q - .5) / .5;
          var px = PF.lerp(x1 + 46, x2 - 46, half);
          var going = q < .5;
          var CY = T("cyan", "#35e5d4");
          ctx.beginPath(); ctx.arc(px, cy - 1, 7, 0, 6.2832);
          ctx.fillStyle = going ? CY : C("#57e08a"); ctx.fill();
          ctx.beginPath(); ctx.arc(px, cy - 1, 12, 0, 6.2832);
          ctx.strokeStyle = hexA(going ? CY : C("#57e08a"), .4); ctx.lineWidth = 2; ctx.stroke();

          ctx.font = "600 10px sans-serif";
          ctx.fillStyle = going ? CY : C("#57e08a");
          ctx.fillText(going ? "🔒 加密 → " + L.out : "🔓 解密 → 明文", (x1 + x2) / 2, cy - 26);
        });
        PF.dom(cap, '<span class="chip solid" style="flex-shrink:0">一句话</span><span>' +
          "<b>对称加密快，但送不出密钥；非对称加密能送密钥，但慢。</b>所以 HTTPS 用「<b>非对称协商会话密钥 + 对称加密数据</b>」的混合方案。" +
          "<b>签名则相反：用私钥签、公钥验</b>，解决的是「<b>证明是谁发的、有没有被改</b>」。" +
          "<br>三个口诀：对称——<b>「同一把钥匙」</b>；非对称——<b>「公钥锁、私钥开」</b>；签名——<b>「私钥签、公钥验」</b>。</span>");
      }
    });
  };

  /* ============================================================
     可视化 3：哈希与雪崩效应（实时计算）
     ============================================================ */
  PF.VIZ["s7-hash"] = function (stage) {
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="hash-in">' +
      '<span class="sub-lbl">输入</span>' +
      '<input type="text" id="hashIn" value="hello" spellcheck="false" autocomplete="off">' +
      '<button class="ctrl-btn" data-act="rand">' + PF.icon("shuffle") + "随机改一位</button>" +
      "</div>" +
      '<div class="hash-out" id="hashOut"></div>' +
      '<div class="hb-grid" id="hbGrid"></div>' +
      '<div class="hash-stat" id="hashStat"></div>' +
      '<div class="hash-salt" id="hashSalt"></div>';
    stage.appendChild(wrap);

    var inp = PF.$("#hashIn", wrap), out = PF.$("#hashOut", wrap),
      grid = PF.$("#hbGrid", wrap), stat = PF.$("#hashStat", wrap), salt = PF.$("#hashSalt", wrap);

    function paint() {
      var v = inp.value || "";
      var h1 = sha256Hex(v);
      var v2 = v.length ? v.slice(0, -1) + String.fromCharCode(v.charCodeAt(v.length - 1) ^ 1) : "a";
      var h2 = sha256Hex(v2);
      var diff = 0;
      for (var i = 0; i < 64; i++) if (h1[i] !== h2[i]) diff++;
      var cells = "";
      for (i = 0; i < 64; i++) {
        cells += '<span class="hb-cell ' + (h1[i] === h2[i] ? "same" : "diff") + '">' + h1[i] + "</span>";
      }
      grid.innerHTML = cells;
      out.innerHTML = '<span class="ho-lbl">SHA-256（' + v.length + ' 个字符 → 固定 256 位 / 64 个十六进制字符）</span>' +
        '<code class="ho-val">' + h1 + "</code>";
      stat.innerHTML = '<div class="hs-row"><span>改动后的输入</span><b class="mono">' + PF.esc(v2) + "</b></div>" +
        '<div class="hs-row"><span>改动后的哈希</span><b class="mono">' + h2 + "</b></div>" +
        '<div class="hs-big"><b>' + diff + " / 64</b> 个十六进制字符不同（约 " + Math.round(diff / 64 * 100) + "%）</div>" +
        '<p class="hs-note">只改了 <b>1 个字符</b>，输出却面目全非——这就是<b>雪崩效应</b>：输入的 1 比特变化，会导致输出约 <b>一半比特</b>变化。' +
        "<b>这是完整性校验的基础：内容一被改动，哈希立刻对不上。</b></p>";

      var s1 = "a7f3", s2 = "9c21";
      var p1 = "123456", p2 = "123456";
      salt.innerHTML = '<div class="hs-title">为什么密码必须「加盐 + 慢哈希」</div>' +
        '<div class="salt-row"><span class="sr-k">不加盐</span><code>' + sha256Hex(p1) + "</code></div>" +
        '<div class="salt-row"><span class="sr-k">盐 = ' + s1 + '</span><code>' + sha256Hex(p1 + s1) + "</code></div>" +
        '<div class="salt-row"><span class="sr-k">盐 = ' + s2 + '</span><code>' + sha256Hex(p2 + s2) + "</code></div>" +
        '<p class="hs-note"><b>同样的密码，盐不同 → 哈希完全不同</b>，彩虹表直接失效。' +
        "但 SHA-256 <b>算得太快</b>（GPU 每秒几十亿次），所以生产环境要用 <b>bcrypt / scrypt / Argon2</b> 这类<b>故意很慢</b>的哈希。</p>";
    }
    inp.addEventListener("input", paint);
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest('[data-act="rand"]'); if (!b) return;
      var v = inp.value || "hello";
      var i = Math.floor(Math.random() * v.length);
      var ch = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      inp.value = v.slice(0, i) + ch + v.slice(i + 1);
      paint();
    });
    paint();
  };

  /* ============================================================
     可视化 4：数字签名与证书链（步骤播放器）
     ============================================================ */
  PF.VIZ["s7-sign"] = function (stage) {
    var STEPS = [
      { t: "计算消息哈希", d: "发送方先对**消息**算一次哈希，得到一个固定长度的**摘要**。签名签的不是原文，而是这个**摘要**——因为原文太长，摘要更短更快。", who: "l" },
      { t: "用私钥加密摘要", d: "发送方用自己的**私钥**加密这个摘要，结果就是**数字签名**。**只有持有私钥的人能生成它。**", who: "l", lock: true },
      { t: "发送：消息 + 签名", d: "把**消息原文**和**签名**一起发出去。**消息不需要保密**（要保密就再叠加加密），签名的作用是「证明来源 + 防篡改」。", who: "b" },
      { t: "用公钥解密签名", d: "接收方用**发送方的公钥**解密签名，得到哈希值 **H1**。因为公钥只能解开私钥签的东西，**这就证明了消息确实来自私钥持有者**。", who: "r", lock: true },
      { t: "自己计算消息哈希", d: "接收方对**收到的消息**独立计算一次哈希，得到 **H2**。", who: "r" },
      { t: "比较 H1 与 H2", d: "**相同 → 验证通过**（来源真实 + 内容完整）；**不同 → 拒绝**（内容被篡改，或签名是伪造的）。这就是**身份认证 + 完整性 + 不可否认性**。", who: "b", ok: true }
    ];
    var step = 0, timer = null;
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<svg viewBox="0 0 720 320" class="viz-canvas" style="height:320px"></svg>' +
      '<div class="hs-desc" id="signDesc"></div>' +
      '<div class="cert-chain" id="signChain"></div>' +
      '<div class="viz-ctrl">' +
      '<button class="ctrl-btn" data-act="play">' + PF.icon("play") + "播放</button>" +
      '<button class="ctrl-btn" data-act="next">' + PF.icon("arrow-right") + "下一步</button>" +
      '<button class="ctrl-btn" data-act="reset">' + PF.icon("reset") + "重置</button>" +
      '<span class="ctrl-field" style="margin-left:auto"><span>步骤</span><b id="signProg" style="font-family:var(--font-mono);color:var(--c-cyan)">1 / 6</b></span>' +
      "</div>";
    stage.appendChild(wrap);
    var svg = PF.$("svg", wrap), desc = PF.$("#signDesc", wrap), chain = PF.$("#signChain", wrap), prog = PF.$("#signProg", wrap);
    var LX = 150, RX = 570;

    function draw() {
      var st = STEPS[step], o = [];
      o.push('<text x="' + LX + '" y="24" text-anchor="middle" style="font-family:var(--font-display);font-size:12.5px;fill:var(--ink)">发送方</text>');
      o.push('<text x="' + RX + '" y="24" text-anchor="middle" style="font-family:var(--font-display);font-size:12.5px;fill:var(--ink)">接收方</text>');
      o.push('<text x="' + LX + '" y="40" text-anchor="middle" style="font-family:var(--font-mono);font-size:10px;fill:var(--c-red)">🔑 私钥</text>');
      o.push('<text x="' + RX + '" y="40" text-anchor="middle" style="font-family:var(--font-mono);font-size:10px;fill:var(--c-green)">🔑 发送方公钥</text>');
      o.push('<line x1="' + LX + '" y1="50" x2="' + LX + '" y2="300" stroke="var(--line-2)" stroke-width="1.4"/>');
      o.push('<line x1="' + RX + '" y1="50" x2="' + RX + '" y2="300" stroke="var(--line-2)" stroke-width="1.4"/>');

      // 发送方侧
      var lOn = st.who === "l" || st.who === "b";
      var rOn = st.who === "r" || st.who === "b";
      o.push('<rect x="' + (LX - 108) + '" y="72" width="216" height="52" rx="11" fill="' +
        (lOn ? "color-mix(in srgb,var(--c-violet) 12%,transparent)" : "var(--panel-2)") +
        '" stroke="' + (lOn ? "var(--c-violet)" : "var(--line)") + '"/>');
      o.push('<text x="' + LX + '" y="93" text-anchor="middle" style="font-size:11.5px;fill:var(--ink-2)">消息 M</text>');
      o.push('<text x="' + LX + '" y="111" text-anchor="middle" style="font-family:var(--font-mono);font-size:10px;fill:var(--c-violet)">H(M) = 摘要</text>');
      o.push('<rect x="' + (RX - 108) + '" y="72" width="216" height="52" rx="11" fill="' +
        (rOn ? "color-mix(in srgb,var(--c-green) 12%,transparent)" : "var(--panel-2)") +
        '" stroke="' + (rOn ? "var(--c-green)" : "var(--line)") + '"/>');
      o.push('<text x="' + RX + '" y="93" text-anchor="middle" style="font-size:11.5px;fill:var(--ink-2)">收到 M + 签名</text>');
      o.push('<text x="' + RX + '" y="111" text-anchor="middle" style="font-family:var(--font-mono);font-size:10px;fill:var(--c-green)">H1 / H2 比对</text>');

      // 中间的传递箭头
      var arrows = [
        { y: 168, on: step >= 2, label: "消息 + 数字签名", c: "var(--c-violet)" },
        { y: 212, on: step >= 5, label: "✓ 验证通过（真实 + 完整）", c: "var(--c-green)" }
      ];
      arrows.forEach(function (a) {
        o.push('<line x1="' + (LX + 14) + '" y1="' + a.y + '" x2="' + (RX - 20) + '" y2="' + a.y +
          '" stroke="' + a.c + '" stroke-width="' + (a.on ? 2.4 : 1.4) + '" opacity="' + (a.on ? 1 : .3) +
          '"' + (a.on ? ' stroke-dasharray="7 6" style="animation:flowDash 1s linear infinite"' : "") + "/>");
        o.push('<path d="M' + (RX - 20) + ' ' + a.y + ' l-11 -5.5 l0 11 Z" fill="' + a.c + '" opacity="' + (a.on ? 1 : .3) + '"/>');
        o.push('<text x="360" y="' + (a.y - 10) + '" text-anchor="middle" style="font-size:10.5px;fill:' + a.c + '" opacity="' + (a.on ? 1 : .45) + '">' + a.label + "</text>");
      });
      // 签名示意
      if (step >= 1) {
        o.push('<rect x="' + (LX - 108) + '" y="244" width="216" height="42" rx="10" fill="color-mix(in srgb,var(--c-red) 11%,transparent)" stroke="var(--c-red)"/>');
        o.push('<text x="' + LX + '" y="261" text-anchor="middle" style="font-size:11px;fill:var(--c-red)">签名 = 私钥加密(H(M))</text>');
        o.push('<text x="' + LX + '" y="278" text-anchor="middle" style="font-family:var(--font-mono);font-size:9.5px;fill:var(--dim)">只有私钥持有者能生成</text>');
      }
      if (step >= 5) {
        o.push('<rect x="' + (RX - 108) + '" y="244" width="216" height="42" rx="10" fill="color-mix(in srgb,var(--c-green) 13%,transparent)" stroke="var(--c-green)"/>');
        o.push('<text x="' + RX + '" y="261" text-anchor="middle" style="font-size:11px;fill:var(--c-green)">H1 == H2 → 验证通过</text>');
        o.push('<text x="' + RX + '" y="278" text-anchor="middle" style="font-family:var(--font-mono);font-size:9.5px;fill:var(--dim)">来源真实 · 内容完整 · 不可否认</text>');
      }
      svg.innerHTML = o.join("");
      desc.innerHTML = '<span class="chip solid" style="flex-shrink:0">' + st.t + "</span><span>" + PF.rich(st.d) + "</span>";
      prog.textContent = (step + 1) + " / 6";

      // 证书链（步骤 4 之后出现）
      var show = step >= 3;
      chain.innerHTML = show ? '<div class="cc-title">数字证书 = CA 用私钥对「网站公钥」做的签名</div><div class="cc-list">' +
        cc("根 CA 证书", "自签名 · 内置于系统 / 浏览器信任库", "离线保管，极少直接签发", true) +
        cc("中间 CA 证书", "由根 CA 签发", "日常使用，可随时吊销", true) +
        cc("站点证书", "CN = www.example.com", "由中间 CA 签发，含网站公钥 + SAN", true) +
        '</div><div class="cc-note">✓ 浏览器用内置根 CA 公钥逐级验签 → 域名匹配 → 有效期 → 吊销状态（CRL / OCSP）→ 全部通过才亮小锁 🔒</div>' : "";
    }
    function cc(t, s, n, ok) {
      return '<div class="cc-item' + (ok ? " ok" : "") + '"><b>' + t + '</b><span>' + s + '</span><em>' + n + "</em></div>";
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; PF.$('[data-act="play"]', wrap).innerHTML = PF.icon("play") + "播放"; } }
    function play() {
      if (timer) { stop(); return; }
      PF.$('[data-act="play"]', wrap).innerHTML = PF.icon("pause") + "暂停";
      if (step >= STEPS.length - 1) step = 0;
      timer = setInterval(function () { if (step >= STEPS.length - 1) { stop(); return; } step++; draw(); }, 1500);
    }
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      if (b.dataset.act === "play") play();
      if (b.dataset.act === "next") { stop(); step = Math.min(STEPS.length - 1, step + 1); draw(); }
      if (b.dataset.act === "reset") { stop(); step = 0; draw(); }
    });
    draw();
  };

  /* ============================================================
     可视化 5：DMZ 三明治结构
     ============================================================ */
  PF.VIZ["s7-dmz"] = function (stage) {
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="dmz-stack">' +
      '<div class="dmz-lay net"><b>互联网</b><span>不可信区域</span></div>' +
      '<div class="dmz-fw-line"><span class="dmz-arw">▼</span><b>外网防火墙</b><em>只放行 80 / 443 等必要端口</em></div>' +
      '<div class="dmz-lay dmz"><b>DMZ · 隔离区</b><span>Web / 邮件 / FTP 等对外服务器</span>' +
      '<div class="dmz-chips"><span>Web 服务器</span><span>邮件网关</span><span>反向代理</span><span>WAF</span></div></div>' +
      '<div class="dmz-fw-line"><span class="dmz-arw">▼</span><b>内网防火墙</b><em>严格控制 DMZ → 内网的访问</em></div>' +
      '<div class="dmz-lay core"><b>核心内网</b><span>数据库 · 核心业务系统 · 办公终端</span></div>' +
      "</div>" +
      '<div class="dmz-note">' + PF.rich("**核心思想**：把「对外暴露的服务器」和「核心内网」隔开。**即使 DMZ 里的服务器被攻破，攻击者也进不了核心内网**——这就是**纵深防御**最经典的一层落地。") + "</div>" +
      '<div class="dmz-bad">' +
      '<div class="db-item"><span>❌ 常见错误</span><p>把 Web 服务器直接放在内网，用防火墙开一个 80 端口映射出去</p></div>' +
      '<div class="db-item"><span>✅ 正确做法</span><p>Web 服务器放 DMZ；内网防火墙只允许「Web → 数据库的特定端口」单向访问</p></div>' +
      "</div>";
    stage.appendChild(wrap);
  };

  /* ============================================================
     可视化 6：传统边界安全 vs 零信任
     ============================================================ */
  PF.VIZ["s7-zt"] = function (stage) {
    var ROWS = [
      ["信任假设", "内网可信，外网不可信", "**内外都不信**"],
      ["认证时机", "一次认证（进网就信）", "**持续验证**（每次访问都验）"],
      ["权限粒度", "粗粒度（进内网权限大）", "**最小权限**（按需授权）"],
      ["网络位置", "决定信任等级", "**不影响**（位置无关）"],
      ["授权依据", "按 IP / 网段授权", "按**会话 + 身份 + 设备**授权"],
      ["代表技术", "VPN、防火墙", "**IAM、微隔离、SDP、MFA**"],
      ["横向移动", "一旦突破可任意扩散", "**被微隔离限制在小块内**"]
    ];
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="zt-cols">' +
      '<div class="zt-col old"><h4>传统边界安全 · 「城堡与护城河」</h4>' +
      '<div class="zt-moat"><span class="zt-wall">防火墙 / VPN</span>' +
      '<div class="zt-inside">' + Array.from({ length: 12 }).map(function () { return '<i class="zt-host"></i>'; }).join("") + "</div>" +
      '<p class="zt-cap">一旦边界被突破，内网设备「全裸奔」——攻击者可任意<b>横向移动</b>。</p></div></div>' +
      '<div class="zt-col new"><h4>零信任 · 「永不信任，始终验证」</h4>' +
      '<div class="zt-moat">' +
      '<div class="zt-cells">' + Array.from({ length: 12 }).map(function (_, i) { return '<i class="zt-cell c' + (i % 4) + '"></i>'; }).join("") + "</div>" +
      '<p class="zt-cap">网络被切成许多<b>微隔离</b>小块，块间默认不通；每次访问都要验证身份 + 设备 + 权限。</p></div></div>' +
      "</div>" +
      '<div class="zt-tbl"><div class="zt-hd"><span class="zt-k"></span><span class="zt-o">传统边界</span><span class="zt-n">零信任</span></div>' + ROWS.map(function (r) {
        return '<div class="zt-row"><span class="zt-k">' + r[0] + "</span>" +
          '<span class="zt-o">' + r[1] + '</span><span class="zt-n">' + PF.rich(r[2]) + "</span></div>";
      }).join("") + "</div>" +
      '<div class="zt-note">' + PF.rich("**为什么传统边界过时了？** ① **内网 ≠ 安全**——一次钓鱼或一个漏洞，攻击者就能在内网任意横向移动；② **边界一破全暴露**——防火墙后面的设备全部失守；③ **身份冒充成本极低**——拿到一个账号就能在「信任区」畅通无阻。**零信任的答案：「不信任位置，只信任验证。」**") + "</div>";
    stage.appendChild(wrap);
  };

  /* ============================================================
     可视化 7：中间人攻击（MITM）
     ============================================================ */
  PF.VIZ["s7-mitm"] = function (stage) {
    var mode = 0; // 0 正常, 1 被劫持
    var wrap = document.createElement("div");
    wrap.innerHTML = '<div class="hs-tabs">' +
      '<button class="ctrl-btn on" data-mitm="0">正常通信</button>' +
      '<button class="ctrl-btn" data-mitm="1">被中间人劫持</button></div>';
    stage.appendChild(wrap);
    var cv = document.createElement("canvas");
    cv.className = "viz-canvas";
    stage.appendChild(cv);
    var cap = document.createElement("div");
    cap.className = "arp-cap";
    stage.appendChild(cap);
    var D = 4800;

    PF.Scene(cv, {
      height: 280,
      draw: function (s, t) {
        var ctx = s.ctx, W = s.W, H = s.H;
        ctx.clearRect(0, 0, W, H);
        var p = (t % D) / D;
        var y = H * .48;
        var cX = W * .12, mX = W * .5, sX = W * .88;
        var atk = mode === 1;

        // 链路
        ctx.strokeStyle = T("line", "rgba(120,150,190,.26)"); ctx.lineWidth = 1.6;
        if (!atk) {
          ctx.beginPath(); ctx.moveTo(cX + 46, y); ctx.lineTo(sX - 46, y); ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(cX + 46, y); ctx.lineTo(mX - 50, y);
          ctx.moveTo(mX + 50, y); ctx.lineTo(sX - 46, y);
          ctx.stroke();
        }

        box(ctx, cX, y, 92, 38, "#4d8dff", "客户端", "受害者", false);
        box(ctx, sX, y, 92, 38, "#57e08a", "真实服务器", "example.com", false);
        if (atk) {
          box(ctx, mX, y, 100, 42, "#ff6b6b", "攻击者", "中间人 MITM", true);
        }

        // 数据包
        var CY = T("cyan", "#35e5d4");
        var path = atk ? [cX + 46, mX - 50, mX + 50, sX - 46] : [cX + 46, sX - 46];
        var q = PF.clamp(p / .75, 0, 1);
        var n = path.length - 1, k = Math.min(n - 1, Math.floor(q * n)), tt = q * n - k;
        var pxx = PF.lerp(path[k], path[k + 1], tt);
        ctx.beginPath(); ctx.arc(pxx, y, 7, 0, 6.2832);
        ctx.fillStyle = atk && pxx > mX - 60 && pxx < mX + 60 ? C("#ff6b6b") : CY;
        ctx.fill();
        ctx.beginPath(); ctx.arc(pxx, y, 12, 0, 6.2832);
        ctx.strokeStyle = hexA(atk && pxx > mX - 60 && pxx < mX + 60 ? C("#ff6b6b") : CY, .4);
        ctx.lineWidth = 2; ctx.stroke();

        // 标注
        ctx.textAlign = "center"; ctx.font = "600 11px sans-serif";
        if (!atk) {
          ctx.fillStyle = C("#57e08a");
          ctx.fillText("🔒 TLS 加密 + 证书验证：攻击者看不懂、也冒充不了", W / 2, y - 46);
          ctx.fillStyle = T("muted", "#7f8da3"); ctx.font = "10px sans-serif";
          ctx.fillText("双方直接通信，端到端加密", W / 2, y + 46);
        } else {
          ctx.fillStyle = C("#ff6b6b");
          ctx.globalAlpha = .55 + .45 * Math.sin(t / 220);
          ctx.fillText("⚠ 全部流量被截获 / 篡改 —— 账号密码一览无余", W / 2, y - 48);
          ctx.globalAlpha = 1;
          ctx.fillStyle = T("muted", "#7f8da3"); ctx.font = "10px sans-serif";
          ctx.fillText("客户端以为在和服务器说话，服务器以为在跟客户端说话", W / 2, y + 50);
        }
        // 加锁提示
        ctx.textAlign = "left"; ctx.font = "10.5px sans-serif";
        ctx.fillStyle = atk ? C("#ff6b6b") : C("#57e08a");
        ctx.fillText(atk ? "攻击者伪造证书 → 浏览器告警" : "证书链验证通过 → 地址栏小锁", 14, H - 14);

        PF.dom(cap, '<span class="chip ' + (atk ? "r" : "g") + '" style="flex-shrink:0">' +
          (atk ? "被劫持" : "正常") + "</span><span>" +
          (atk
            ? PF.rich("**中间人攻击（MITM）**：攻击者在通信双方之间插入一个节点，**拦截、篡改、窃取**数据，而双方误以为在直接通信。**常见场景**：公共 WiFi、未加密的 HTTP、ARP 欺骗、DNS 劫持。**防御**：强制 HTTPS + 严格校验证书 + **HSTS**（强制浏览器只用 HTTPS，防降级攻击）+ VPN / 端到端加密。")
            : PF.rich("正常情况下，客户端与服务器**直接通信**，TLS 提供**机密性（对称加密）、完整性（AEAD 校验）、身份认证（数字证书）**三重保障。**攻击者既看不懂内容，也无法冒充服务器**——除非用户点掉证书告警。")) +
          "</span>");
      }
    });
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("[data-mitm]"); if (!b) return;
      mode = +b.dataset.mitm;
      PF.$$("[data-mitm]", wrap).forEach(function (x) { x.classList.toggle("on", x === b); });
    });
  };

  /* ============================================================
     可视化 8：DDoS / SYN Flood 与防御
     ============================================================ */
  PF.VIZ["s7-ddos"] = function (stage) {
    var defend = false, D = 7000;
    var wrap = document.createElement("div");
    wrap.innerHTML = '<div class="hs-tabs">' +
      '<button class="ctrl-btn on" data-dd="0">无防护</button>' +
      '<button class="ctrl-btn" data-dd="1">开启 SYN Cookie 防护</button></div>';
    stage.appendChild(wrap);
    var cv = document.createElement("canvas");
    cv.className = "viz-canvas";
    stage.appendChild(cv);
    var cap = document.createElement("div");
    cap.className = "arp-cap";
    stage.appendChild(cap);
    var rd = document.createElement("div");
    rd.className = "readout";
    rd.innerHTML = '<div class="ro r"><span>半连接队列占用</span><b id="ddQ">0%</b></div>' +
      '<div class="ro a"><span>恶意 SYN 速率</span><b id="ddR">—</b></div>' +
      '<div class="ro g"><span>正常用户</span><b id="ddU">—</b></div>';
    stage.appendChild(rd);
    var qEl = PF.$("#ddQ", rd), rEl = PF.$("#ddR", rd), uEl = PF.$("#ddU", rd);

    var BOTS = [];
    for (var i = 0; i < 24; i++) BOTS.push([.03 + (i % 6) * .035, .18 + Math.floor(i / 6) * .17]);

    PF.Scene(cv, {
      height: 320,
      draw: function (s, t) {
        var ctx = s.ctx, W = s.W, H = s.H;
        ctx.clearRect(0, 0, W, H);
        var p = (t % D) / D;
        var svX = W * .74, svY = H * .46;

        // 僵尸网络
        ctx.fillStyle = C("#ff6b6b"); ctx.font = "600 11.5px 'Chakra Petch',sans-serif"; ctx.textAlign = "left";
        ctx.fillText("僵尸网络 Botnet（肉鸡）", 14, 20);
        ctx.fillStyle = T("muted", "#7f8da3"); ctx.font = "10px sans-serif";
        ctx.fillText("被恶意软件控制的电脑 / 摄像头 / 路由器 / IoT", 14, 35);

        BOTS.forEach(function (b, i) {
          var x = b[0] * W, y = b[1] * H;
          ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.2832);
          ctx.fillStyle = hexA(C("#ff6b6b"), .22); ctx.fill();
          ctx.strokeStyle = hexA(C("#ff6b6b"), .6); ctx.lineWidth = 1.2; ctx.stroke();
          // SYN 包
          var off = (i * .037) % 1;
          var q = (p + off) % 1;
          if (q < .62) {
            var qq = q / .62;
            var tx = PF.lerp(x, svX - 40, qq), ty = PF.lerp(y, svY, qq);
            ctx.beginPath(); ctx.arc(tx, ty, 3, 0, 6.2832);
            ctx.fillStyle = hexA(C("#ff6b6b"), .85); ctx.fill();
          }
        });

        // 正常用户
        var uX = W * .74, uY = H * .88;
        ctx.beginPath(); ctx.arc(uX, uY, 15, 0, 6.2832);
        ctx.fillStyle = hexA(C("#57e08a"), .18); ctx.fill();
        ctx.strokeStyle = C("#57e08a"); ctx.lineWidth = 1.6; ctx.stroke();
        ctx.fillStyle = C("#57e08a"); ctx.font = "600 10px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("正常用户", uX, uY + 32);
        ctx.beginPath(); ctx.moveTo(uX, uY - 16); ctx.lineTo(svX, svY + 44); ctx.strokeStyle = hexA(C("#57e08a"), .45);
        ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);

        // 服务器
        box(ctx, svX, svY, 116, 52, "#4d8dff", "目标服务器", "SYN 半连接队列", true);

        // 队列条
        var qw = 150, qh = 12, qx = svX - qw / 2, qy = svY + 42;
        ctx.fillStyle = T("grid", "rgba(120,150,190,.14)");
        rr(ctx, qx, qy, qw, qh, 6); ctx.fill();
        var fill = defend ? .1 + .06 * Math.sin(t / 300) : PF.clamp(p * 1.5, 0, 1);
        ctx.fillStyle = fill > .8 ? C("#ff6b6b") : C("#ffb454");
        rr(ctx, qx, qy, Math.max(2, qw * fill), qh, 6); ctx.fill();
        ctx.strokeStyle = T("line", "rgba(120,150,190,.26)"); ctx.lineWidth = 1;
        rr(ctx, qx, qy, qw, qh, 6); ctx.stroke();
        ctx.fillStyle = T("muted", "#7f8da3"); ctx.font = "9.5px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("半连接队列", svX, qy + 26);

        // 结论
        ctx.textAlign = "left"; ctx.font = "600 11px sans-serif";
        if (!defend) {
          ctx.fillStyle = C("#ff6b6b");
          ctx.globalAlpha = .55 + .45 * Math.sin(t / 220);
          ctx.fillText("队列被占满 → 正常用户无法建立连接（服务不可用）", W * .30, H - 12);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = C("#57e08a");
          ctx.fillText("SYN Cookie：不占队列，验证通过才分配资源 → 正常用户照常访问", W * .30, H - 12);
        }

        // 读数
        var pct = Math.round(fill * 100);
        qEl.textContent = pct + "%";
        qEl.parentNode.className = "ro " + (pct > 80 ? "r" : "a");
        rEl.textContent = defend ? "已被清洗" : "120 万 pps";
        uEl.textContent = (defend ? "正常接入 ✓" : (p > .6 ? "超时 / 无法访问 ✗" : "尝试中…"));
        uEl.parentNode.className = "ro " + (defend ? "g" : "r");

        PF.dom(cap, '<span class="chip ' + (defend ? "g" : "r") + '" style="flex-shrink:0">' + (defend ? "有防护" : "无防护") + "</span><span>" +
          PF.rich(defend
            ? "**SYN Cookie / SYN Proxy**：服务器**不立即分配资源**，而是把连接信息编码进 SYN+ACK 的序列号里；只有收到正确的最终 ACK 才分配资源。**半连接队列不再被占满**，攻击失效。"
            : "**SYN Flood**：攻击者发送**大量伪造源 IP 的 SYN 包**，服务器回复 SYN+ACK 后**永远等不到最终 ACK**，**半连接队列被占满**，正常用户的连接请求被丢弃。") +
          "<br>" + PF.rich("**其他抗 DDoS 手段**：**流量清洗**（抗 DDoS 设备识别并过滤恶意流量）、**CDN 分散**（隐藏源站 IP、分散流量）、**负载均衡 + 集群**、**弹性扩容**、**限速与阈值**。") + "</span>");
      }
    });
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("[data-dd]"); if (!b) return;
      defend = b.dataset.dd === "1";
      PF.$$("[data-dd]", wrap).forEach(function (x) { x.classList.toggle("on", x === b); });
    });
  };

  /* ============ 注册阶段 ============ */
  PF.register({
    id: "s7", num: 7, title: "网络安全基础", short: "网络安全",
    icon: "shield-check", accent: "var(--c-red)", difficulty: 3, duration: "2.5 周", level: "★★★★☆",
    tagline: "前六个阶段教你怎么把数据从 A 送到 B；这一阶段教你——**怎么保证路上没人偷看、没人篡改、没人冒充**。安全不是一层设备，而是一整套思维。",
    tags: ["CIA", "密码学", "PKI", "TLS", "零信任"],
    lead: "**安全没有「全都要」的完美解，只有「按业务权衡」的合理解。** 这一阶段从 **CIA 三要素**出发，把密码学（对称 / 非对称 / 哈希 / 签名）、PKI 证书体系、TLS 与 IPSec、边界防护、身份与访问控制，以及常见攻击与防御串成一条完整的链。",
    sections: [
      {
        id: "s7-1", title: "为什么必须懂安全", icon: "bulb",
        blocks: [
          { t: "p", x: "**一个残酷的现实**：你前六个阶段学的所有协议，**在设计时大多没有考虑安全**——ARP 没有认证、DNS 没有签名、HTTP 是明文、TCP 默认不加密。**它们的目标是「连通」，不是「安全」。** 安全能力是在这些协议之上「补」出来的。" },
          { t: "callout", kind: "warn", title: "为什么「防御者」总是被动的", x: "**攻击者只需要找到一个洞，防御者必须堵住所有的洞。** 攻击者可以反复试错、可以在任何时间任何地点发起攻击；防御者必须 7×24 在线、必须覆盖所有资产、所有层次。**这就是「攻防不对称」。** 所以安全的目标不是「绝对安全」（做不到），而是**持续降低风险**。" },
          { t: "p", x: "这一阶段要建立的**核心认知**：**安全是一个体系，不是一个产品。** 买一台防火墙不等于安全，上一个 HTTPS 也不等于安全。**纵深防御（Defense in Depth）** 才是正解——每一层都可能被突破，但**多层叠加让攻击者的成本高到不划算**。" },
          { t: "callout", kind: "danger", title: "本阶段内容的用途声明", x: "本阶段涉及攻击原理的部分，**目的只有一个：理解攻击才能更好地防御**。所有实践必须**在自己拥有或明确授权的环境中进行**——未经授权扫描、渗透他人系统是**违法行为**。" }
        ]
      },
      {
        id: "s7-2", title: "CIA 三要素与安全思维", icon: "target",
        blocks: [
          { t: "p", x: "**CIA 三要素（CIA Triad）** 是所有安全工作的**出发点和衡量标准**。**点击下方三角中的任一要素，查看它的含义、破坏后果、保障手段与对应攻击。**" },
          { t: "viz", id: "s7-cia", icon: "target", title: "CIA 三要素 · 交互式三角", sub: "机密性 / 完整性 / 可用性，点击查看细节", tag: "Interactive", note: "**行业侧重不同（理解 CIA 的「权衡」）**：**金融**优先**完整性**（防篡改）+ **可用性**（高并发交易）；**军事**优先**机密性**（严防泄露），可用性可适度牺牲；**医疗**三者并重（病历加密 + 处方防篡改 + 急诊 7×24）。**安全没有「全都要」的完美解，只有「按业务权衡」的合理解。**" },
          { t: "p", x: "安全分析有三个关键词：**威胁（Threat）** = 谁想搞你；**脆弱性（Vulnerability）** = 哪里有洞；**风险（Risk）** = 可能出多大事。" },
          { t: "formula", label: "风险公式", x: "**风险 = 威胁 × 脆弱性 × 影响**" },
          { t: "callout", kind: "key", title: "安全的正确姿势", x: "**不是「消除所有威胁」（做不到），而是「持续降低风险」。** 流程是：**识别资产 → 评估威胁与脆弱性 → 计算风险 → 采取对应措施**。降低风险有三个方向：**减少威胁**（威慑、溯源）、**修补脆弱性**（打补丁、加固）、**降低影响**（备份、隔离）。" },
          { t: "table", head: ["核心安全原则", "含义", "例子"], rows: [["**最小权限**", "只给完成任务**必需的最小权限**", "数据库账号不给 DROP 权限"], ["**职责分离**", "关键操作**多人分管**", "财务付款需双人审批"], ["**默认拒绝**", "**白名单**思维，未明确允许的一律拒绝", "防火墙默认全禁，只放行必需端口"], ["**纵深防御**", "多层设防，不依赖单一防线", "防火墙 + WAF + 主机防护 + 加密"], ["**最小暴露面**", "只暴露**必需的服务**", "关掉不用的端口与服务"], ["**零信任**", "永不信任，持续验证", "每次访问都验身份 + 设备 + 权限"], ["**安全审计**", "关键操作**留痕可追溯**", "日志记录、操作审计"]] },
          { t: "callout", kind: "warn", title: "「默认拒绝」和「默认允许」的区别至关重要", x: "**默认允许**（黑名单）：先放行，发现坏人才拦 → **容易漏**。**默认拒绝**（白名单）：先全禁，只放行认识的 → **更安全**。**安全领域几乎都采用「默认拒绝」思维。**" }
        ]
      },
      {
        id: "s7-3", title: "密码学（一）：对称加密", icon: "key",
        blocks: [
          { t: "p", x: "**密码学**是网络安全的技术基石——HTTPS、VPN、SSH、数字签名，底层全是它。基本术语：**明文**（原始消息）、**密文**（加密后）、**加密 / 解密**、**密钥**（关键信息）、**算法**（规则方法）。" },
          { t: "callout", kind: "info", title: "对称加密（Symmetric Encryption）", x: "**加密和解密用同一把密钥**——像一把钥匙锁门、同一把钥匙开门。发送方 `明文 + 密钥 → 加密 → 密文`；接收方 `密文 + 密钥 → 解密 → 明文`。" },
          { t: "table", head: ["优点", "缺点"], rows: [["**速度快**，适合大数据量、数据流", "**密钥分发困难**——怎么安全地把密钥给对方？"], ["算法简单、密文紧凑", "密钥管理复杂：N 人两两通信需要 **N(N−1)/2** 个密钥"], ["硬件有加速指令（AES-NI）", "**无法解决身份认证**——无法证明「你就是你」"]] },
          { t: "viz", id: "s7-crypto", icon: "exchange", title: "对称 / 非对称 / 数字签名 · 三条流程对比", sub: "同一件事的三种做法，密钥用法完全不同", tag: "Animation", note: "**三个口诀**：对称——**「同一把钥匙」**；非对称——**「公钥锁、私钥开」**；签名——**「私钥签、公钥验」**。**对称加密的「死结」是密钥怎么安全送达**，这正是非对称加密要解决的问题。" },
          { t: "table", head: ["算法", "密钥长度", "分组大小", "安全性", "状态"], rows: [["**DES**", "56 位", "64 位", "**低**（已破解）", "❌ 淘汰"], ["**3DES**", "112 / 168 位", "64 位", "中", "⚠️ 逐步淘汰"], ["**AES-128**", "128 位", "128 位", "**高**", "✅ 主流"], ["**AES-256**", "256 位", "128 位", "**极高**", "✅ 推荐"], ["**RC4**", "40~2048 位", "流加密", "**低**", "❌ 淘汰"], ["**SM4**", "128 位", "128 位", "高（**国密**）", "✅ 国内合规"], ["**ChaCha20**", "256 位", "流加密", "高", "✅ 移动端首选"]] },
          { t: "callout", kind: "tip", title: "为什么 DES 被淘汰", x: "DES 的密钥只有 **56 位**，暴力穷举 2⁵⁶ 次在现代算力下几分钟就能破。**AES 分组 128 位，密钥 128 / 192 / 256 位，对应 10 / 12 / 14 轮加密，目前无有效破解方法。**" },
          { t: "table", head: ["分组模式", "特点", "安全性"], rows: [["**ECB**", "每块**独立**加密", "**低**——相同明文块产生相同密文块，能看出数据模式"], ["**CBC**", "每块与前一块**异或**后加密", "中高（**最常用**）"], ["**CTR**", "计数器流密码，可并行", "高"], ["**GCM**", "**认证加密**（加密 + 完整性）", "**高（推荐）**"]] },
          { t: "callout", kind: "danger", title: "ECB 模式绝对不能用", x: "经典例子：用 ECB 加密一张图片，**加密后仍能看出图片轮廓**（因为相同颜色的块加密结果相同）。**生产环境用 CBC 或 GCM。** 另外，**GCM / CCM / ChaCha20-Poly1305 这类「认证加密（AEAD）」既保证机密性又能检测篡改，是现代首选。**" }
        ]
      },
      {
        id: "s7-4", title: "密码学（二）：非对称加密与密钥交换", icon: "lock",
        blocks: [
          { t: "callout", kind: "key", title: "非对称加密（公钥加密）的两种用法 —— 极其重要", x: "使用**一对密钥**：**公钥**可以公开，**私钥**必须保密。① **加密**：**公钥加密 → 私钥解密**（保证机密性，谁都能加密，只有你能解）；② **签名**：**私钥签名 → 公钥验签**（保证身份与完整性，只有你能签，谁都能验）。**记混这两个方向，是初学者最常犯的错。**" },
          { t: "table", head: ["优点", "缺点"], rows: [["**解决密钥分发问题**（公钥可公开）", "**速度慢**——比对称加密慢几个数量级"], ["密钥管理简单（每人一对）", "密文膨胀（体积大）"], ["**支持数字签名和身份认证**", "**不适合大数据量加密**"]] },
          { t: "p", x: "**一句话**：**对称加密快但送不出密钥，非对称加密能送密钥但慢。所以 HTTPS 用「非对称协商密钥 + 对称加密数据」的混合方案。**" },
          { t: "table", head: ["算法", "密钥长度", "数学基础", "说明"], rows: [["**RSA**", "1024 / 2048 / 4096", "**大数分解难题**", "最经典，2048 位以上安全，但慢"], ["**ECC**", "160 / 256 / 384", "**椭圆曲线离散对数**", "**256 位 ECC ≈ 3072 位 RSA**，密钥短、运算快"], ["**ECDSA**", "256 / 384", "椭圆曲线", "ECC 的签名版本"], ["**SM2**", "256", "椭圆曲线（国密）", "国密标准"], ["**Ed25519**", "256", "扭曲爱德华兹曲线", "很快，现代推荐"]] },
          { t: "callout", kind: "warn", title: "量子计算的威胁", x: "**RSA 和 ECC 都能被量子计算机的 Shor 算法破解。** 所以业界正在研究**后量子密码（PQC）**。目前 **RSA-2048 / ECC-256 在经典计算机下仍然安全**，但「先存储、后解密」的威胁已经让迁移变得紧迫。" },
          { t: "p", x: "**密钥交换：Diffie-Hellman（DH）** 让双方在**不安全的信道上**协商出**共享密钥**，而**不需要直接传输密钥**。基于**离散对数难题**：双方各自生成私钥并算出公钥，交换公钥后，各自用「对方公钥 ^ 自己私钥」算出**同一个共享密钥 s**。攻击者知道 g、p、A、B，但要算出 s 需要解离散对数难题。" },
          { t: "callout", kind: "danger", title: "裸 DH 无法验证身份", x: "**DH 本身不认证对方身份**——中间人可以分别和双方协商出两把密钥，从而实施中间人攻击。**所以 DH 必须配合「证书认证」（确认公钥归属）才能防中间人。** 现代 TLS 用的是 **ECDHE**：椭圆曲线版本 + **临时密钥**，提供**前向保密（PFS）**——即使服务器长期私钥泄露，**历史会话也无法解密**。" }
        ]
      },
      {
        id: "s7-5", title: "密码学（三）：哈希、密码存储与数字签名", icon: "hash",
        blocks: [
          { t: "p", x: "**哈希算法（摘要算法）** 把**任意长度的输入**变成**固定长度的输出**，并且是**单向的**——能从明文算出哈希，但**几乎不可能从哈希反推明文**。" },
          { t: "table", head: ["五大特性", "含义"], rows: [["**单向性**", "从哈希值**无法反推**原文"], ["**确定性**", "相同输入**永远**产生相同输出"], ["**雪崩效应**", "输入**微小变化**，输出**完全不同**"], ["**抗碰撞性**", "很难找到**两个不同输入**产生**相同输出**"], ["**固定长度**", "输出长度固定，与输入长度无关"]] },
          { t: "p", x: "**在下面的输入框里随便改一个字符，观察哈希值如何「面目全非」。**" },
          { t: "viz", id: "s7-hash", icon: "hash", title: "SHA-256 实时计算 · 雪崩效应演示", sub: "改一个字符，看 256 位输出如何天翻地覆", tag: "Interactive", note: "**雪崩效应（Avalanche Effect）**：输入的**一个比特变化**，会导致输出的**约一半比特变化**。这保证了「改一个字符，哈希就面目全非」，是**完整性校验的基础**。**绿色格子 = 未变，红色格子 = 已变。**" },
          { t: "table", head: ["算法", "输出长度", "安全性", "状态"], rows: [["**MD5**", "128 位", "**低（已碰撞）**", "❌ 不推荐"], ["**SHA-1**", "160 位", "**低（已碰撞）**", "❌ 不推荐"], ["**SHA-256**", "256 位", "**高**", "✅ 推荐"], ["**SHA-512**", "512 位", "极高", "✅"], ["**SHA3-256**", "256 位", "高", "✅ 新标准"], ["**SM3**", "256 位", "高（**国密**）", "✅ 国内合规"]] },
          { t: "callout", kind: "danger", title: "MD5 为什么不安全，为什么绝不能用来存密码", x: "MD5 已被证明存在**碰撞攻击**：能构造出**两个不同的文件，MD5 值完全相同**。**2004 年王小云教授宣布找到 MD5 碰撞方法**，2008 年已可用于伪造 SSL 证书，现在用 GPU 几秒就能找到碰撞。**结论：MD5 / SHA-1 绝不能用于密码存储和数字签名。** 而且即使是 SHA-256，**直接存密码也不行**——因为它**太快了**（GPU 每秒几十亿次），配合**彩虹表**能快速破解。**正确做法：加盐 + 慢哈希。**" },
          { t: "table", head: ["慢哈希算法", "说明", "推荐度"], rows: [["**bcrypt**", "自适应密码哈希，可调 rounds", "★★★★★"], ["**scrypt**", "内存难解，抗 GPU / ASIC", "★★★★"], ["**Argon2**", "密码哈希竞赛冠军", "★★★★★"], ["**PBKDF2**", "基于 MAC 的密钥派生", "★★★"]] },
          { t: "code", title: "bcrypt 密码哈希（Python）", x: "# bcrypt：故意很慢，让暴力破解成本剧增\nimport bcrypt\n\npassword = \"mypassword\".encode('utf-8')\n# rounds 越大越慢越安全，每次生成的盐都不同\nhashed = bcrypt.hashpw(password, bcrypt.gensalt(rounds=12))\n\nif bcrypt.checkpw(password, hashed):\n    print(\"密码正确\")\n\n# 观察：同样的密码，两次 bcrypt 结果不同（因为盐不同）" },
          { t: "p", x: "**数字签名**：**用私钥签名，用公钥验证**。发送方先算消息哈希，再用**自己的私钥**加密这个哈希 → 得到签名；接收方用**发送方公钥**解密签名得到 H1，再自己对消息算哈希得到 H2，**比较 H1 与 H2**。" },
          { t: "viz", id: "s7-sign", icon: "shield-check", title: "数字签名与证书链 · 逐步播放", sub: "签名 → 传输 → 验签，以及证书链如何被逐级验证", tag: "Step Player", note: "**签名的三大作用**：**身份认证**（确认来自声称的发送者）、**完整性**（确认未被篡改）、**不可否认性**（发送者不能抵赖，因为只有他有私钥）。**数字证书就是「CA 用私钥对网站公钥做的签名」。**" },
          { t: "callout", kind: "warn", title: "签名 vs 加密（极易混淆）", x: "**加密**：目的是**保密**（不让别人看），用**接收方**公钥加密、接收方私钥解密，口诀「**只有你能看**」。**签名**：目的是**认证 + 完整性**（证明是谁、没被改），用**发送方**私钥签名、发送方公钥验签，口诀「**只有你能签**」。**一句话：加密锁的是内容，签名锁的是身份。**" },
          { t: "p", x: "**HMAC** 是「**带密钥的哈希**」：`HMAC = Hash(消息 + 密钥)`，用于验证完整性和来源。**HMAC 用对称密钥**（快，但双方都有密钥，无法「不可否认」）；**数字签名用非对称密钥**（慢，但支持「不可否认」）。" }
        ]
      },
      {
        id: "s7-6", title: "PKI 与数字证书体系", icon: "award",
        blocks: [
          { t: "p", x: "非对称加密解决了「密钥分发」，但**新问题来了**——**你怎么确认拿到的公钥真的属于对方？** 中间人可以冒充对方，把自己的公钥发给你。" },
          { t: "callout", kind: "info", title: "PKI（公钥基础设施）", x: "一整套**管理公钥和数字证书**的体系，包括 **CA（证书颁发机构）、证书、注册机构 RA、证书库、CRL / OCSP** 等。目的只有一个：**把「公钥」和「真实身份」绑定起来。**" },
          { t: "p", x: "**数字证书** 就是 CA 签发的「**公钥身份证**」：`证书 = 用户/网站信息 + 公钥 + CA 的数字签名`。" },
          { t: "table", head: ["X.509 核心字段", "内容"], rows: [["**签名算法**", "CA 用哪种算法签名"], ["**签发者 Issuer**", "哪个 CA 签的"], ["**有效期**", "起止时间"], ["**主体 Subject**", "证书归属的域名 / 组织"], ["**公钥**", "网站的公钥"], ["**SAN**", "该证书适用的所有域名列表（**验证域名匹配时看它**）"], ["**数字签名**", "CA 用私钥对以上内容的签名"]] },
          { t: "p", x: "**证书链** 是 `根证书 → 中间证书 → 站点证书` 的信任传递链：**根 CA 自签名、内置于操作系统 / 浏览器信任库、离线保管、极少直接签发**；**中间 CA 由根 CA 签发，日常使用、可随时吊销**；**站点证书发给具体网站**。" },
          { t: "p", x: "**证书验证过程**（浏览器依次检查）：① 用内置 CA 公钥**验签** → 证书是不是伪造的？② 检查证书**域名**与访问域名是否匹配（看 SAN）；③ 检查**有效期**；④ 查询**吊销状态**（CRL / OCSP）；⑤ **向上追溯证书链**，直到落在系统内置的信任根上。**全部通过 → 地址栏亮小锁 🔒；任一失败 → 证书告警。**" },
          { t: "table", head: ["证书格式", "扩展名", "说明"], rows: [["DER", ".der / .cer", "二进制格式"], ["**PEM**", ".pem / .crt / .cer", "**Base64 编码，最常用**"], ["PKCS#7", ".p7b / .p7c", "证书链格式"], ["**PKCS#12**", ".pfx / .p12", "**包含私钥 + 证书**，有密码保护"]] },
          { t: "callout", kind: "warn", title: "遇到证书告警的处理顺序", x: "① **先看域名匹配**（可能「连错了机器」）；② **再看签发者**（可能「信任链断了」或自签名）；③ **最后看有效期**（可能证书过期或**客户端时间错乱**）。**注意：自签名证书签发者 = 主体，浏览器不信任它，只适合内部测试。**" }
        ]
      },
      {
        id: "s7-7", title: "TLS 与 IPSec：传输层与网络层的安全", icon: "shield",
        blocks: [
          { t: "p", x: "阶段五已详讲 TLS 握手，这里从**安全视角**再提炼：TLS 解决的三大问题——**机密性**（对称加密 AES/GCM 加密数据）、**完整性**（MAC / AEAD 校验）、**身份认证**（数字证书 + CA）。" },
          { t: "callout", kind: "key", title: "混合加密的「三步走」", x: "① **非对称加密（握手阶段）**：安全协商出一把临时的**会话密钥**；② **对称加密（传输阶段）**：用会话密钥高效加密所有实际数据；③ **证书认证（贯穿全程）**：确认服务器身份，防中间人。**一句话：「用慢的握手，换来快的全程加密，再用证书锁住身份。」**" },
          { t: "table", head: ["特性", "TLS 1.2", "TLS 1.3"], rows: [["握手往返", "2-RTT", "**1-RTT**（会话恢复可 0-RTT）"], ["密钥交换", "RSA / DH 均可", "**强制 ECDHE**（前向保密）"], ["不安全算法", "仍可协商（如 RC4、SHA-1）", "**全部删除**"], ["加密范围", "部分握手消息明文", "**握手后半段即加密**"]] },
          { t: "p", x: "**IPSec** 是**网络层**的安全协议族，保护的是 **IP 包**——它让「**任何基于 IP 的流量**」都能被加密和认证，**对上层应用完全透明**。这与 TLS 形成互补：**TLS 保护单个应用连接，IPSec 保护整条网络路径。**" },
          { t: "table", head: ["组件", "作用"], rows: [["**AH**（认证头）", "提供**认证 + 完整性**，**不加密**"], ["**ESP**（封装安全载荷）", "提供**加密 + 认证**（最常用）"], ["**IKE**（互联网密钥交换）", "协商密钥与安全参数"], ["**SA**（安全联盟）", "IPSec 协商出的单向安全参数集合"]] },
          { t: "table", head: ["模式", "保护范围", "典型用途"], rows: [["**传输模式**", "只保护 IP 载荷，**保留原 IP 头**", "主机到主机（端到端）"], ["**隧道模式**", "**整个原 IP 包**被封装进新 IP 包", "**站点到站点 VPN**（网关到网关）"]] },
          { t: "p", x: "**其他 VPN 技术**：**SSL/TLS VPN**（基于浏览器，远程接入方便）、**WireGuard**（现代轻量、代码极简）、**L2TP / PPTP**（老旧，PPTP 已不安全）。**选择原则：站点互联用 IPSec，远程接入用 SSL VPN 或 WireGuard。**" }
        ]
      },
      {
        id: "s7-8", title: "边界防护：防火墙、IDS/IPS、WAF、DMZ", icon: "filter",
        blocks: [
          { t: "p", x: "边界防护是**纵深防御**的第一道也是最常被提及的一层。四类设备的职责完全不同，**不要混为一谈**。" },
          { t: "table", head: ["设备", "管什么", "部署方式", "行为"], rows: [["**防火墙**", "**能不能连**（IP / 端口 / 状态）", "串联", "允许 / 拒绝连接"], ["**IDS**", "流量里**有没有攻击特征**", "**旁路**（镜像流量）", "**只检测、告警**"], ["**IPS**", "流量里**有没有攻击特征**", "**串联**（流量经过它）", "**检测并阻断**"], ["**WAF**", "**Web 请求正不正常**（应用层）", "反向代理 / 透明 / 旁路", "拦 SQL 注入、XSS、CC 等"]] },
          { t: "callout", kind: "warn", title: "IDS 与 IPS 的检测方式各有短板", x: "**特征检测（Signature-based）**：匹配已知攻击特征 → 准，但**无法发现新攻击（0-day）**。**异常检测（Anomaly-based）**：对比「正常行为基线」发现异常 → 能发现新攻击，但**误报多**。**现代多用「特征 + 异常」结合。** 另外，**IPS 串联部署意味着误报会误杀正常流量**——这是它与 IDS 的核心权衡。" },
          { t: "p", x: "**DMZ（隔离区 / 非军事区）** 是边界防护里最经典的结构设计：位于**内网与外网之间**的一个**缓冲区**，用来放置**对外提供服务但安全性较低的服务器**（Web、邮件、FTP 等）。" },
          { t: "viz", id: "s7-dmz", icon: "filter", title: "DMZ 三明治结构 · 缓冲区设计", sub: "外网防火墙 → DMZ → 内网防火墙 → 核心内网", tag: "Diagram", note: "**核心思想**：**把「对外暴露的服务器」和「核心内网」隔开。** 三道防线：**外网防火墙**（只放行 80 / 443 等必要端口）、**内网防火墙**（严格控制 DMZ → 内网的访问）、**DMZ 内部**（服务器自身加固、最小化服务）。**即使 DMZ 被攻破，攻击者也进不了核心内网。**" },
          { t: "table", head: ["其他安全设备", "作用"], rows: [["**堡垒机（跳板机）**", "运维操作的**统一入口 + 审计录屏**，所有运维经它跳转"], ["**网闸（GAP）**", "**物理隔离**不同安全域，只允许特定数据摆渡"], ["**上网行为管理**", "流量审计、应用管控、行为记录"], ["**终端 EDR**", "终端检测与响应，监控终端异常行为"], ["**蜜罐（Honeypot）**", "**诱饵系统**，吸引攻击者、记录其手法，不涉及真实数据"], ["**SIEM / SOC**", "集中日志分析平台 / 安全监控与响应中枢"]] }
        ]
      },
      {
        id: "s7-9", title: "身份与访问控制：AAA、802.1X、零信任", icon: "users",
        blocks: [
          { t: "callout", kind: "info", title: "AAA：访问控制的三功能", x: "**认证（Authentication）**——**你是谁？**（账号密码 / 证书 / 指纹 / 短信）；**授权（Authorization）**——**你能干什么？**（权限策略、角色分配）；**计费 / 审计（Accounting）**——**你干了什么？**（日志记录、流量统计）。**RADIUS** 是 AAA 服务的事实标准协议（UDP 1812 认证 / 1813 计费），企业无线、VPN、交换机登录认证常用它。" },
          { t: "p", x: "**802.1X（基于端口的网络访问控制）** 是**接入认证标准**：设备**接入网络前必须先认证**，认证通过才放行流量。三个角色：**客户端（Supplicant）** 要接入的设备；**认证者（Authenticator）** 交换机 / AP（转发认证报文）；**认证服务器（Authentication Server）** 通常是 RADIUS 服务器（做实际认证）。" },
          { t: "callout", kind: "danger", title: "「内网 = 安全区」是最大的错觉", x: "传统边界安全假设「进了内网就安全」，但**一旦边界被突破，攻击者就能在内网横向移动、畅通无阻**。**一次钓鱼、一个漏洞，就可能导致全网沦陷。** 这正是**零信任**要解决的问题。" },
          { t: "viz", id: "s7-zt", icon: "users", title: "传统边界安全 vs 零信任 · 架构对比", sub: "从「城堡护城河」到「永不信任，始终验证」", tag: "Interactive", note: "**零信任的 NIST 三大原则**：① 所有数据源和计算服务都视为「资源」，必须保护；② 无论网络位置（内网 / 外网），所有通信都要安全；③ 每次访问都要授权——**按「会话」授权，不是按「IP」授权**。**一句话：「不信任位置，只信任验证。」**" },
          { t: "table", head: ["零信任三大组件", "作用"], rows: [["**IAM（身份与访问管理）**", "强认证（MFA）、最小权限——**管身份**"], ["**微隔离（Micro-segmentation）**", "把网络切成小块逐块隔离，块间默认不通——**管横向移动**"], ["**SDP（软件定义边界）**", "**隐藏服务**（不暴露 IP，验证后才可见）——**管隐身**，即「看不见 = 打不到」"]] },
          { t: "callout", kind: "tip", title: "零信任常见误区", x: "❌「零信任 = 某个产品」→ ✅ 它是**理念 + 体系**，靠 IAM + 微隔离 + SDP + MFA 等多种技术组合落地。❌「上了 VPN 就是零信任」→ ✅ **VPN 仍是边界思路**（进隧道就信任）。❌「零信任能防住所有攻击」→ ✅ 它是**降低风险**，不是绝对安全。**落地三步走：评估 → 试点 → 扩展。**" }
        ]
      },
      {
        id: "s7-10", title: "常见攻击与防御（上）：网络层", icon: "bug",
        blocks: [
          { t: "callout", kind: "danger", title: "用途声明", x: "以下内容**仅用于理解防御**。**禁止用于任何未授权的攻击行为**——未经授权扫描、渗透他人系统是**违法行为**。" },
          { t: "p", x: "**DoS / DDoS**：通过**大量恶意流量或请求**耗尽目标系统的**带宽、CPU、内存**等资源，使其**无法响应正常用户**。**DoS** 单点发起、规模有限、易被拦截；**DDoS** 利用大量**僵尸机（肉鸡）分布式发起**，规模可达数百 Gbps。" },
          { t: "table", head: ["DDoS 类型", "层次", "手段", "特点"], rows: [["**体积型**", "L3 / L4", "UDP Flood、ICMP Flood", "以 **Gbps / Tbps** 计，拼带宽"], ["**协议型**", "L4", "**SYN Flood**（耗尽半连接队列）", "利用协议缺陷"], ["**应用层**", "L7", "**CC 攻击**（模拟正常 HTTP 请求）", "**更难识别**（看起来像真实用户）"]] },
          { t: "viz", id: "s7-ddos", icon: "bug", title: "SYN Flood 与 SYN Cookie 防御", sub: "切换「无防护 / 有防护」，看半连接队列的命运", tag: "Interactive", note: "**SYN Flood**：攻击者发送**大量伪造源 IP 的 SYN 包**，服务器回复 SYN+ACK 后**永远等不到最终 ACK**，**半连接队列被占满**，正常用户被拒。**SYN Cookie / SYN Proxy**：服务器不立即分配资源，把连接信息编码进序列号，**收到正确的最终 ACK 才分配资源**——攻击失效。**其他手段：流量清洗、CDN 分散、负载均衡 + 集群、弹性扩容、限速与阈值。**" },
          { t: "p", x: "**中间人攻击（MITM）**：攻击者在通信双方**之间插入一个节点**，**拦截、篡改、窃取**数据，而双方**误以为在直接通信**。**常见场景**：公共 WiFi、未加密的 HTTP 连接、ARP 欺骗、DNS 劫持。" },
          { t: "viz", id: "s7-mitm", icon: "eye", title: "中间人攻击 · 正常通信 vs 被劫持", sub: "同样的「中间人」，在加密与不加密下的不同结局", tag: "Animation", note: "**防御手段**：**强制 HTTPS**（TLS 加密 + 证书验证服务器身份）、**HSTS**（服务器告诉浏览器「以后只用 HTTPS 访问我」，防降级攻击）、**严格校验证书**（过期、CA、域名）、**VPN / 端到端加密**。" },
          { t: "table", head: ["攻击", "原理", "防御"], rows: [["**ARP 欺骗**", "发送伪造 ARP 报文篡改目标 ARP 缓存，使流量绕经攻击者", "静态 ARP 绑定、**DHCP Snooping**、**DAI**（动态 ARP 检测）、VLAN 隔离"], ["**DNS 劫持 / 缓存投毒**", "篡改解析结果或污染 DNS 缓存，把用户导向钓鱼站", "**DNSSEC**（给 DNS 记录签名）、可信 DNS、随机化查询 ID / 端口"], ["**端口扫描**", "探测目标开放了哪些端口，推断服务与潜在漏洞（渗透第一步）", "最小暴露、防火墙只放行必需端口、入侵检测、蜜罐"]] },
          { t: "callout", kind: "warn", title: "DNSSEC 只保证「不被篡改」，不加密", x: "**DNSSEC 给 DNS 记录加数字签名**，让客户端能验证解析结果**未被篡改**——但它**不加密、不防监听**。要防监听要用 **DoH / DoT**（加密 DNS 查询，端口 443 / 853）。**两者解决的是不同问题，不要混淆。**" },
          { t: "callout", kind: "tip", title: "端口扫描的「另一面」", x: "**在授权范围内扫描自己的资产**是**安全自查**的重要手段。**关键是「授权」**——未经授权扫描他人系统**违法**。常见的端口状态：**open**（有服务监听）、**closed**（主机可达但端口关闭，会回 RST）、**filtered**（被防火墙过滤，无响应）。" }
        ]
      },
      {
        id: "s7-11", title: "常见攻击与防御（下）：应用层与社工", icon: "code",
        blocks: [
          { t: "p", x: "应用层攻击的共同点是：**它们攻击的不是网络协议，而是程序的「信任假设」**——程序错误地相信了用户的输入、错误地相信了浏览器的来源、错误地相信了请求的意图。" },
          { t: "table", head: ["攻击", "一句话原理", "核心防御"], rows: [["**SQL 注入**", "把**用户输入当成 SQL 代码**执行，从而读取 / 篡改数据库", "**参数化查询（预编译）**、输入校验、最小权限数据库账号、WAF"], ["**XSS（跨站脚本）**", "把**恶意 JS 注入页面**，在别人浏览器里执行，偷 Cookie / 冒充身份", "**输出编码**、输入过滤、**CSP**（内容安全策略）、Cookie 加 HttpOnly"], ["**CSRF（跨站请求伪造）**", "**借用用户已登录的身份**，诱导浏览器发出非本意请求", "**CSRF Token**、SameSite Cookie、校验 Origin / Referer"], ["**文件上传漏洞**", "上传可执行文件（如 WebShell）后获得服务器控制权", "白名单校验类型、重命名、上传目录禁止执行、隔离存储"], ["**越权访问**", "直接改 URL / ID 访问不属于自己的数据（水平 / 垂直越权）", "服务端逐次校验归属与权限，**不信任前端传参**"], ["**SSRF**", "让**服务器**替攻击者去请求内网资源", "白名单目标地址、禁止访问内网段、限制协议"]] },
          { t: "callout", kind: "key", title: "XSS 与 CSRF 不是一回事", x: "**XSS 是「注入代码偷身份」**——程序**信任了用户输入**，把恶意脚本当内容渲染。**CSRF 是「借用身份发请求」**——程序**信任了用户浏览器**，只要带着 Cookie 来的请求就当真。**防御手段完全不同：XSS 靠输出编码 + CSP，CSRF 靠 Token + SameSite。**" },
          { t: "callout", kind: "danger", title: "密码攻击与账号安全", x: "常见手段：**暴力破解**（穷举）、**字典攻击**（常见弱口令）、**撞库**（拿 A 站泄露的账号密码去试 B 站）、**彩虹表**（预计算哈希字典）、**凭证填充**。**防御**：**强密码策略 + 加盐慢哈希存储 + 多因素认证（MFA）+ 登录限速与锁定 + 异常登录检测**。**其中 MFA 的性价比最高——它能挡住绝大多数凭证泄露导致的入侵。**" },
          { t: "p", x: "**钓鱼攻击（Phishing）**：仿冒可信的网站 / 邮件 / 短信，诱导用户**主动交出凭证或点击恶意链接**。识别要点：**发件人域名是否与显示名一致**、**链接真实指向的域名**（不是显示的文字）、**制造紧迫感的措辞**（「账号将在 24 小时内被冻结」）、**要求提供密码 / 验证码**（正规机构永远不会索要）。" },
          { t: "p", x: "**社会工程学（Social Engineering）**：攻击的是**人**，不是系统。常见手法有**冒充身份**（假扮 IT 支持、领导、供应商）、** pretexting（编造可信场景）**、**尾随进入**、**诱导泄密**。**技术防护挡不住一个点错链接的人——所以安全意识培训是性价比最高的安全投入。**" },
          { t: "table", head: ["恶意软件类型", "特点"], rows: [["**病毒 / 蠕虫**", "自我复制传播；蠕虫可自主扩散（无需宿主）"], ["**木马**", "伪装成正常软件，植入后门"], ["**勒索软件**", "加密文件索要赎金——**离线备份是根本应对**"], ["**间谍软件 / 键盘记录**", "窃取信息与输入"], ["**挖矿木马**", "偷偷占用算力挖矿"], ["**无文件攻击**", "不落盘，直接在内存执行（如 PowerShell 脚本），更难检测"]] },
          { t: "callout", kind: "ok", title: "被勒索了要交赎金吗？", x: "**不要。** 交赎金**不保证能解密**（很多团伙收了钱也不给密钥），还**助长犯罪**、可能被二次勒索。**正确做法是平时做好离线备份（3-2-1 原则），被攻击后直接恢复。备份是应对勒索软件的根本。**" }
        ]
      },
      {
        id: "s7-12", title: "安全运维：日志、漏洞管理与应急响应", icon: "activity",
        blocks: [
          { t: "p", x: "**安全不是一次性的部署，而是持续的过程。** 这一章讲的是「日常怎么运转」。" },
          { t: "p", x: "**日志与审计**：所有关键操作都要**留痕可追溯**。日志要集中收集（SIEM）、要防篡改、要有足够长的保留期——**没有日志，就没有溯源与取证的能力**。重点关注的日志包括：认证日志（登录失败、异常 IP）、网络设备日志（ACL 命中、会话建立）、应用日志（异常请求、错误码）、主机日志（提权、计划任务、账号变更）。" },
          { t: "p", x: "**漏洞管理**：不是「打补丁」三个字，而是一个闭环流程——**资产盘点 → 漏洞扫描 → 风险评级 → 修复验证 → 复盘**。**CVE** 是漏洞的唯一编号，**CVSS** 是漏洞严重性评分（0–10 分）。**优先级判断不能只看 CVSS**，还要看**资产重要性**与**是否已被在野利用**（很多高危漏洞永远排不上修复，因为「评估了但不影响」）。" },
          { t: "table", head: ["应急响应六阶段", "做什么"], rows: [["**① 准备**", "预案、工具、人员、演练（**平时做的功夫决定战时能力**）"], ["**② 识别**", "发现并确认安全事件，判断影响范围"], ["**③ 遏制**", "**先止损**——隔离受影响主机 / 断网 / 封禁 IP"], ["**④ 根除**", "清除恶意程序、修复漏洞、重置凭证"], ["**⑤ 恢复**", "从备份恢复业务，持续监控确认无残留"], ["**⑥ 复盘**", "分析根因、更新预案、完善防护（**避免同类事件重演**）"]] },
          { t: "callout", kind: "key", title: "应急响应的第一原则：先遏制，再分析", x: "很多团队出事后第一反应是「先查清楚怎么回事」，结果**攻击者还在持续扩散**。正确顺序是**先隔离止损（遏制），再做取证分析**。**「快」比「全」重要**——保住还没被攻陷的部分。" },
          { t: "p", x: "**合规与等级保护**：在中国，**网络安全等级保护 2.0（等保 2.0）** 是法定要求，按系统重要性分为五级，常见的是**二级和三级**。等保的落地思路与本章的纵深防御一脉相承——**物理安全、网络安全、主机安全、应用安全、数据安全、安全管理**，每一层都有明确要求。" },
          { t: "callout", kind: "warn", title: "安全是持续的过程，不是一次性项目", x: "**「部署完就没事了」是最大的误解。** 要**持续监控、持续打补丁、持续更新策略、持续应急演练**。**「没有绝对安全，只有持续降低风险」**——这句话应该贯穿整个安全职业生涯。" }
        ]
      },
      { id: "s7-terms", title: "术语速查表", icon: "list", blocks: [{ t: "terms", items: [
        { t: "CIA 三要素", en: "CIA Triad", d: "机密性 / 完整性 / 可用性——信息安全三要素" },
        { t: "威胁 / 脆弱性 / 风险", en: "Threat / Vulnerability / Risk", d: "谁想搞你 / 哪里有洞 / 可能出多大事（风险 = 威胁 × 脆弱性 × 影响）" },
        { t: "最小权限 / 纵深防御", en: "Least Privilege / Defense in Depth", d: "只给必需权限 / 多层设防不依赖单一防线" },
        { t: "对称加密", en: "Symmetric Encryption", d: "加解密同一把密钥；快，但密钥分发困难" },
        { t: "AES / DES", en: "Advanced / Data Encryption Standard", d: "主流对称算法（128/192/256 位）/ 已淘汰的 56 位算法" },
        { t: "非对称加密", en: "Asymmetric Encryption", d: "公钥加密 → 私钥解密；解决密钥分发，但慢" },
        { t: "RSA / ECC", en: "—", d: "基于大数分解 / 椭圆曲线离散对数；256 位 ECC ≈ 3072 位 RSA" },
        { t: "DH / ECDHE", en: "Diffie-Hellman", d: "不安全信道上协商共享密钥 / 临时椭圆曲线版本，提供前向保密" },
        { t: "前向保密", en: "PFS", d: "私钥泄露不影响历史会话解密，靠 ECDHE 实现" },
        { t: "哈希 / 摘要", en: "Hash / Digest", d: "任意长度 → 固定长度，单向；五大特性含雪崩效应" },
        { t: "雪崩效应", en: "Avalanche Effect", d: "输入 1 比特变化 → 输出约一半比特变化" },
        { t: "SHA-256 / MD5", en: "Secure Hash Algorithm", d: "主流哈希 / 已被碰撞，绝不能用于密码与签名" },
        { t: "加盐 / 慢哈希", en: "Salt / Password Hashing", d: "拼接随机串让彩虹表失效 / bcrypt、scrypt、Argon2 故意很慢" },
        { t: "数字签名", en: "Digital Signature", d: "私钥签名 → 公钥验签；认证 + 完整性 + 不可否认" },
        { t: "HMAC", en: "Hash-based MAC", d: "带密钥的哈希，验证完整性与来源（对称）" },
        { t: "PKI / CA / RA", en: "Public Key Infrastructure", d: "管理证书与公钥的体系 / 签发机构 / 审核机构" },
        { t: "数字证书 / 证书链", en: "Digital Certificate", d: "CA 签发的公钥身份证 / 根 → 中间 → 站点的信任传递" },
        { t: "CRL / OCSP", en: "Certificate Revocation List", d: "已作废证书名单 / 实时查询证书状态" },
        { t: "TLS / HSTS", en: "Transport Layer Security", d: "HTTPS 的加密层 / 强制浏览器只用 HTTPS，防降级攻击" },
        { t: "IPSec / AH / ESP / IKE", en: "Internet Protocol Security", d: "网络层安全协议族 / 认证头 / 加密载荷 / 密钥协商" },
        { t: "DMZ", en: "Demilitarized Zone", d: "内外网之间的缓冲区，放对外服务器" },
        { t: "IDS / IPS / WAF", en: "—", d: "只检测告警 / 检测并阻断 / Web 应用防火墙" },
        { t: "AAA / RADIUS / 802.1X", en: "—", d: "认证授权审计 / AAA 标准协议 / 基于端口的接入认证" },
        { t: "MFA / SSO / IAM", en: "—", d: "多因素认证 / 单点登录 / 身份与访问管理" },
        { t: "零信任 / SDP / 微隔离", en: "Zero Trust", d: "永不信任始终验证 / 软件定义边界（服务隐身）/ 网络细分成小块" },
        { t: "DoS / DDoS / CC", en: "Denial of Service", d: "拒绝服务 / 分布式拒绝服务 / 应用层 DDoS" },
        { t: "Botnet", en: "Botnet", d: "僵尸网络，被控设备组成的攻击网络" },
        { t: "MITM", en: "Man-In-The-Middle", d: "中间人攻击，在通信双方之间插入节点" },
        { t: "ARP 欺骗 / DAI", en: "ARP Spoofing / Dynamic ARP Inspection", d: "伪造 ARP 报文篡改缓存 / 交换机上的防 ARP 欺骗检测" },
        { t: "DNSSEC / DoH", en: "DNS Security Extensions", d: "给 DNS 记录签名（防篡改）/ 加密 DNS 查询（防监听）" },
        { t: "SQL 注入 / XSS / CSRF", en: "—", d: "注入 SQL 代码 / 注入恶意 JS / 借用身份发请求" },
        { t: "CSP / SSRF", en: "—", d: "内容安全策略，限制脚本来源 / 让服务器发请求到内网" },
        { t: "钓鱼 / 社工", en: "Phishing / Social Engineering", d: "仿冒诱导窃取凭证 / 攻击「人」而非系统" },
        { t: "CVE / CVSS", en: "—", d: "漏洞唯一编号 / 漏洞严重性评分（0–10）" },
        { t: "EDR / 蜜罐 / SIEM", en: "—", d: "终端检测与响应 / 诱饵系统 / 集中日志分析平台" }
      ] }] },
      { id: "s7-pit", title: "常见误区", icon: "alert", blocks: [{ t: "pitfalls", items: [
        { t: "内网就是安全的，外网才危险", x: "**错误。** 「内网 = 安全区」是**最大的错觉**。内网横向移动是攻击的标配，一次沦陷可能导致全网沦陷。**这正是零信任要解决的问题。**" },
        { t: "装了防火墙就安全了", x: "**错误。** 防火墙只是**纵深防御的一层**。还需要 IDS/IPS、WAF、主机防护、加密、权限管理、安全意识等多层配合。**没有单一防线能防住所有攻击。**" },
        { t: "HTTPS 就一定安全", x: "**错误。** HTTPS 保证**传输安全**，但**不保证网站可信**——**钓鱼网站也能申请证书**。看到小锁 ≠ 网站可信，还要**看域名是否正确**。" },
        { t: "对称和非对称加密是对立的，选一个就行", x: "**错误。** 两者是**配合使用**的。HTTPS 用「**非对称协商密钥 + 对称加密数据**」的混合方案。**非对称解决密钥分发，对称解决性能。**" },
        { t: "MD5 可以用来存密码（只要够长）", x: "**错误。** MD5 **有碰撞漏洞且速度太快**，绝不能用于密码存储。应该用 **bcrypt / scrypt / Argon2** 等慢哈希 **+ 加盐**。" },
        { t: "加密就能保证完整性", x: "**错误。** **加密只保证机密性**，不保证完整性。要保证完整性需要**哈希 / MAC / 数字签名**。所以 HTTPS 用 **AEAD（如 GCM）** 同时提供两者。" },
        { t: "签名和加密是一回事", x: "**错误。** **目的不同**——加密是「**不让别人看**」（用接收方公钥），签名是「**证明是谁发的、没被改**」（用发送方私钥）。**数字证书就是 CA 的签名。**" },
        { t: "用了参数化查询就绝对安全了", x: "**错误。** 参数化查询能防 SQL 注入，但**不能防所有漏洞**。还需要输入验证、最小权限、WAF、错误处理等多层防护。" },
        { t: "XSS 和 CSRF 是一回事", x: "**错误。** **XSS 是「注入代码偷身份」**（信任了用户输入），**CSRF 是「借用身份发请求」**（信任了用户浏览器）。防御手段也不同。" },
        { t: "隐藏 SSID / 改默认端口就能防攻击", x: "**错误。** 这是「**隐晦式安全**」，**不是真正的防护**。抓包就能发现隐藏的 SSID，端口扫描能发现改过的端口。**真正的安全靠加密、认证、权限。**" },
        { t: "零信任就是买个产品 / 上了 VPN", x: "**错误。** 零信任是**理念 + 体系**，靠 IAM + 微隔离 + SDP + MFA 等多种技术组合落地。**VPN 仍是边界思路，不等于零信任。**" },
        { t: "安全是一次性的，部署完就没事了", x: "**错误。** **安全是持续的过程**——要持续监控、打补丁、更新策略、应急演练。**「没有绝对安全，只有持续降低风险」。**" },
        { t: "技术防护够强，就不需要安全意识培训了", x: "**错误。** **钓鱼和社会工程学攻击的是「人」**，技术防护挡不住一个点错链接的人。**安全意识培训是性价比最高的安全投入。**" },
        { t: "被勒索软件加密了就交赎金", x: "**错误。** **交赎金不保证能解密，还助长犯罪**。正确做法是**平时做好离线备份**，被攻击后直接恢复。**备份是应对勒索软件的根本。**" }
      ] }] },
      { id: "s7-quiz", title: "自测练习", icon: "target", blocks: [{ t: "quiz", stage: "s7", items: [
        { q: "下面哪个场景破坏的是「完整性」？", o: ["攻击者窃听了未加密的 HTTP 流量", "攻击者在传输途中修改了转账金额", "攻击者用 DDoS 让网站无法访问", "攻击者通过钓鱼拿到了用户密码"], a: 1, e: "**完整性 = 防篡改**。窃听和钓鱼破坏**机密性**，DDoS 破坏**可用性**，只有「篡改转账金额」破坏的是完整性。" },
        { q: "为什么 HTTPS 采用「混合加密」？", o: ["为了兼容老浏览器", "对称加密快但密钥难分发，非对称加密能分发密钥但慢", "为了双重保险更安全", "因为证书只能用非对称算法"], a: 1, e: "**对称加密快但送不出密钥，非对称加密能送密钥但慢。** 所以用非对称（如 ECDHE）协商出会话密钥，再用对称加密（如 AES-GCM）传输数据。" },
        { q: "数字签名的正确用法是？", o: ["用发送方公钥签名，用发送方私钥验签", "用发送方私钥签名，用发送方公钥验签", "用接收方公钥签名，用接收方私钥验签", "用接收方私钥签名，用接收方公钥验签"], a: 1, e: "**签名 = 私钥签、公钥验**，用的是**发送方**的密钥对——因为只有发送方持有私钥，所以能证明「是他签的」，并提供**不可否认性**。注意与「加密 = 接收方公钥加密、接收方私钥解密」区分。" },
        { q: "关于哈希的「雪崩效应」，下面说法正确的是？", o: ["输入变化越大，输出变化越大", "输入任意微小变化，输出都会发生约一半比特的变化", "哈希值可以反推出原文", "相同输入可能产生不同输出"], a: 1, e: "**雪崩效应**指输入的**一个比特变化**会导致输出**约一半比特**变化——输出与输入的差异**不成比例**。另外，哈希是**单向**的（不可反推），且**相同输入永远产生相同输出**（确定性）。" },
        { q: "零信任架构的核心理念是？", o: ["内网可信、外网不可信", "永不信任、始终验证，按会话授权", "上了 VPN 就实现了零信任", "用一台设备就能实现零信任"], a: 1, e: "零信任的核心是「**永不信任，始终验证**」——**内外都不信**，每次访问都要验证身份、设备、权限，并且**按「会话」授权而不是按「IP」授权**。它是**理念 + 体系**（IAM + 微隔离 + SDP + MFA），不是一个产品；**VPN 仍是边界思路**。" }
      ] }] }
    ]
  });

})();
