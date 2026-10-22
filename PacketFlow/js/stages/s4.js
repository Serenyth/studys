/* ============================================================
   阶段四 · 传输层与端到端通信
   ============================================================ */
(function () {
  "use strict";
  var PF = window.PF;
  var tone = PF.tone;   /* 主题感知的 Canvas 文本色 */
  var TC = PF.C;      /* 主题感知的强调色 */

  /* ============ 可视化 1：三次握手 / 四次挥手 ============ */
  PF.VIZ["s4-handshake"] = function (stage) {
    var HS = [
      { msg: null, cs: "CLOSED", ss: "LISTEN", d: "初始状态：客户端 CLOSED，服务端处于 LISTEN（监听）。" },
      { msg: { from: "c", to: "s", label: "SYN  seq = x", color: TC("#4d8dff") }, cs: "SYN_SENT", ss: "SYN_RCVD", d: "① 客户端发送 **SYN**（请求建连），带上自己的初始序号 x，随后进入 SYN_SENT。" },
      { msg: { from: "s", to: "c", label: "SYN + ACK  seq = y, ack = x+1", color: TC("#35e5d4") }, cs: "ESTABLISHED", ss: "SYN_RCVD", d: "② 服务端回 **SYN + ACK**：既确认对方的 SYN（ack = x+1），又发出自己的 SYN（seq = y）。" },
      { msg: { from: "c", to: "s", label: "ACK  ack = y+1", color: TC("#57e08a") }, cs: "ESTABLISHED", ss: "ESTABLISHED", d: "③ 客户端回 **ACK**。三次握手完成，双方进入 **ESTABLISHED**，可以传数据了。" }
    ];
    var FW = [
      { msg: null, cs: "ESTABLISHED", ss: "ESTABLISHED", d: "初始状态：连接已建立，双方正在传数据。" },
      { msg: { from: "c", to: "s", label: "FIN  seq = u", color: TC("#4d8dff") }, cs: "FIN_WAIT_1", ss: "ESTABLISHED", d: "① 客户端发 **FIN**（我没有数据要发了），进入 FIN_WAIT_1。**注意：这只是单向关闭。**" },
      { msg: { from: "s", to: "c", label: "ACK  ack = u+1", color: TC("#57e08a") }, cs: "FIN_WAIT_2", ss: "CLOSE_WAIT", d: "② 服务端回 **ACK**。客户端进入 FIN_WAIT_2；服务端进入 **CLOSE_WAIT**——**此时服务端可能还有数据要发**。" },
      { msg: { from: "s", to: "c", label: "FIN  seq = v", color: TC("#35e5d4") }, cs: "FIN_WAIT_2", ss: "LAST_ACK", d: "③ 服务端数据发完了，也发 **FIN**，进入 LAST_ACK。" },
      { msg: { from: "c", to: "s", label: "ACK  ack = v+1", color: TC("#57e08a") }, cs: "TIME_WAIT", ss: "CLOSED", d: "④ 客户端回 **ACK**，然后进入 **TIME_WAIT**，等待 **2MSL**（约 1～4 分钟）后才真正 CLOSED。" }
    ];

    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="hs-tabs"><button class="ctrl-btn on" data-mode="hs">三次握手</button>' +
      '<button class="ctrl-btn" data-mode="fw">四次挥手</button></div>' +
      '<svg viewBox="0 0 720 400" class="viz-canvas" style="height:400px"></svg>' +
      '<div class="hs-desc" id="hsDesc"></div>' +
      '<div class="viz-ctrl">' +
      '<button class="ctrl-btn" data-act="play">' + PF.icon("play") + "播放</button>" +
      '<button class="ctrl-btn" data-act="next">' + PF.icon("arrow-right") + "下一步</button>" +
      '<button class="ctrl-btn" data-act="reset">' + PF.icon("reset") + "重置</button>" +
      '<span class="ctrl-field" style="margin-left:auto"><span>步骤</span><b id="hsProg" style="font-family:var(--font-mono);color:var(--c-cyan)">0 / 3</b></span>' +
      "</div>";
    stage.appendChild(wrap);

    var svg = PF.$("svg", wrap), desc = PF.$("#hsDesc", wrap), prog = PF.$("#hsProg", wrap);
    var mode = "hs", step = 0, timer = null;
    var CX = 150, SX = 570, TOP = 74, BOT = 320;

    function cur() { return mode === "hs" ? HS : FW; }

    function draw() {
      var steps = cur(), st = steps[step];
      var o = [];
      o.push('<text x="' + CX + '" y="46" text-anchor="middle" class="lbl-b" style="font-size:13px">客户端</text>');
      o.push('<text x="' + SX + '" y="46" text-anchor="middle" class="lbl-b" style="font-size:13px">服务端</text>');
      o.push('<line x1="' + CX + '" y1="58" x2="' + CX + '" y2="' + (BOT + 20) + '" stroke="var(--line-2)" stroke-width="1.4"/>');
      o.push('<line x1="' + SX + '" y1="58" x2="' + SX + '" y2="' + (BOT + 20) + '" stroke="var(--line-2)" stroke-width="1.4"/>');
      // 状态标签
      o.push('<rect x="' + (CX - 62) + '" y="' + (BOT + 24) + '" width="124" height="30" rx="9" fill="var(--panel-2)" stroke="var(--line-2)"/>');
      o.push('<text x="' + CX + '" y="' + (BOT + 44) + '" text-anchor="middle" class="lbl-m" style="font-size:11px;fill:var(--c-cyan)">' + st.cs + "</text>");
      o.push('<rect x="' + (SX - 62) + '" y="' + (BOT + 24) + '" width="124" height="30" rx="9" fill="var(--panel-2)" stroke="var(--line-2)"/>');
      o.push('<text x="' + SX + '" y="' + (BOT + 44) + '" text-anchor="middle" class="lbl-m" style="font-size:11px;fill:var(--c-cyan)">' + st.ss + "</text>");
      // 已发生的消息
      var y = TOP + 22;
      for (var i = 1; i <= step; i++) {
        var m = steps[i].msg;
        var x1 = m.from === "c" ? CX : SX, x2 = m.from === "c" ? SX : CX;
        var dir = m.from === "c" ? 1 : -1;
        var isLast = i === step;
        o.push('<line x1="' + x1 + '" y1="' + y + '" x2="' + (x2 - dir * 12) + '" y2="' + y + '" stroke="' + m.color + '" stroke-width="' + (isLast ? 2.6 : 1.8) + '" opacity="' + (isLast ? 1 : .5) + '"/>');
        o.push('<path d="M' + (x2 - dir * 12) + ' ' + y + ' l' + (-dir * 11) + ' -5.5 l0 11 Z" fill="' + m.color + '" opacity="' + (isLast ? 1 : .5) + '"/>');
        o.push('<text x="' + ((x1 + x2) / 2) + '" y="' + (y - 9) + '" text-anchor="middle" style="font-family:var(--font-mono);font-size:10.5px;fill:' + m.color + '" opacity="' + (isLast ? 1 : .65) + '">' + m.label + "</text>");
        if (isLast) {
          o.push('<circle cx="' + x1 + '" cy="' + y + '" r="4" fill="' + m.color + '"/>');
        }
        y += 62;
      }
      svg.innerHTML = o.join("");
      desc.innerHTML = '<span class="chip ' + (mode === "hs" ? "solid" : "v") + '" style="flex-shrink:0">' + (mode === "hs" ? "握手" : "挥手") + "</span><span>" + PF.rich(st.d) + "</span>";
      prog.textContent = step + " / " + (steps.length - 1);
    }
    function setStep(s) { step = PF.clamp(s, 0, cur().length - 1); draw(); }
    function stop() { if (timer) { clearInterval(timer); timer = null; var b = PF.$('[data-act="play"]', wrap); if (b) b.innerHTML = PF.icon("play") + "播放"; } }
    function play() {
      if (timer) { stop(); return; }
      PF.$('[data-act="play"]', wrap).innerHTML = PF.icon("pause") + "暂停";
      if (step >= cur().length - 1) step = 0;
      timer = setInterval(function () {
        if (step >= cur().length - 1) { stop(); return; }
        setStep(step + 1);
      }, 1200);
    }
    wrap.addEventListener("click", function (e) {
      var m = e.target.closest("[data-mode]");
      if (m) {
        stop(); mode = m.dataset.mode; step = 0;
        PF.$$("[data-mode]", wrap).forEach(function (x) { x.classList.toggle("on", x === m); });
        draw(); return;
      }
      var b = e.target.closest("[data-act]");
      if (!b) return;
      if (b.dataset.act === "play") play();
      if (b.dataset.act === "next") { stop(); setStep(step + 1); }
      if (b.dataset.act === "reset") { stop(); setStep(0); }
    });
    draw();
  };

  /* ============ 可视化 2：滑动窗口 ============ */
  PF.VIZ["s4-window"] = function (stage) {
    var N = 24, W = 5;
    var base = 0, next = 0;
    stage.innerHTML =
      '<div class="win-wrap"><div class="win-track" id="winTrack"></div>' +
      '<div class="win-legend"><span><i style="background:var(--c-green)"></i>已确认</span><span><i style="background:var(--c-blue)"></i>已发送待确认</span><span><i style="background:var(--c-amber)"></i>可发送（窗口内）</span><span><i style="background:var(--panel-3);border:1px solid var(--line-2)"></i>窗口外</span></div>' +
      '<div class="readout" id="winOut" style="margin-top:16px"></div>' +
      '<div class="viz-ctrl">' +
      '<button class="ctrl-btn" data-w="send">' + PF.icon("arrow-right") + "发送一个报文段</button>" +
      '<button class="ctrl-btn" data-w="ack">' + PF.icon("check") + "收到累计 ACK</button>" +
      '<button class="ctrl-btn" data-w="auto">' + PF.icon("play") + "自动演示</button>" +
      '<button class="ctrl-btn" data-w="reset">' + PF.icon("reset") + "重置</button>" +
      "</div></div>";
    var track = PF.$("#winTrack", stage), out = PF.$("#winOut", stage);
    var timer = null;

    function render() {
      var html = "";
      for (var i = 0; i < N; i++) {
        var cls = "win-blk";
        if (i < base) cls += " acked";
        else if (i < next) cls += " sent";
        else if (i < base + W) cls += " avail";
        else cls += " out";
        html += '<span class="' + cls + '">' + i + "</span>";
      }
      track.innerHTML = html;
      out.innerHTML =
        ro("发送窗口大小", W + " 个段") +
        ro("窗口左沿 sendBase", base, "v") +
        ro("下一个待发送", next, "a") +
        ro("窗口右沿", base + W - 1, "g") +
        ro("在途未确认", next - base, "p") +
        ro("剩余可发", base + W - next);
    }
    function ro(l, v, k) { return '<div class="ro ' + (k || "") + '"><span>' + l + "</span><b>" + v + "</b></div>"; }
    function send() {
      if (next < base + W && next < N) { next++; render(); }
    }
    function ack() {
      if (next > base) { base = next; render(); }
      else if (base < N) { base = Math.min(N, base + 1); render(); }
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    stage.addEventListener("click", function (e) {
      var b = e.target.closest("[data-w]"); if (!b) return;
      var a = b.dataset.w;
      if (a === "send") send();
      if (a === "ack") ack();
      if (a === "reset") { stop(); base = 0; next = 0; render(); }
      if (a === "auto") {
        if (timer) { stop(); return; }
        timer = setInterval(function () {
          if (next < base + W && next < N) send();
          else if (base < N) ack();
          else { stop(); }
        }, 700);
      }
    });
    render();
  };

  /* ============ 可视化 3：拥塞控制曲线 ============ */
  PF.VIZ["s4-congestion"] = function (stage) {
    var cv = document.createElement("canvas");
    cv.className = "viz-canvas";
    stage.appendChild(cv);
    var info = document.createElement("div");
    info.className = "readout";
    info.id = "ccOut";
    stage.appendChild(info);
    var ctrl = document.createElement("div");
    ctrl.className = "viz-ctrl";
    ctrl.innerHTML =
      '<button class="ctrl-btn" data-c="timeout">' + PF.icon("alert") + "注入超时</button>" +
      '<button class="ctrl-btn" data-c="dup">' + PF.icon("zap") + "注入 3 个重复 ACK</button>" +
      '<button class="ctrl-btn" data-c="reset">' + PF.icon("reset") + "重置</button>" +
      '<button class="ctrl-btn" data-c="pause">' + PF.icon("pause") + "暂停</button>" +
      '<span class="ctrl-field" style="margin-left:auto"><span>阶段</span><b id="ccPhase" style="font-family:var(--font-display);color:var(--c-cyan)">慢启动</b></span>';
    stage.appendChild(ctrl);

    var st = { cwnd: 1, ssthresh: 32, phase: "slow", rtt: 0, hist: [], events: [], paused: false, max: 64 };
    var out = PF.$("#ccOut", stage), phEl = PF.$("#ccPhase", stage);

    function reset() { st = { cwnd: 1, ssthresh: 32, phase: "slow", rtt: 0, hist: [], events: [], paused: st.paused, max: 64 }; push(); }
    function push() { st.hist.push({ x: st.rtt, y: st.cwnd, phase: st.phase }); }

    function advance() {
      if (st.paused) return;
      st.rtt++;
      if (st.phase === "slow") {
        st.cwnd *= 2;
        if (st.cwnd >= st.ssthresh) { st.cwnd = st.ssthresh; st.phase = "avoid"; }
      } else if (st.phase === "avoid") {
        st.cwnd += 1;
      } else if (st.phase === "fr") {
        st.cwnd += 1;
      }
      st.max = Math.max(st.max, st.cwnd * 1.25);
      push();
      updateInfo();
    }
    function timeout() {
      st.events.push({ x: st.rtt, y: st.cwnd, t: "timeout" });
      st.ssthresh = Math.max(2, Math.floor(st.cwnd / 2));
      st.cwnd = 1; st.phase = "slow"; push(); updateInfo();
    }
    function dup() {
      st.events.push({ x: st.rtt, y: st.cwnd, t: "dup" });
      st.ssthresh = Math.max(2, Math.floor(st.cwnd / 2));
      st.cwnd = st.ssthresh + 3; st.phase = "fr"; push(); updateInfo();
      setTimeout(function () { st.phase = "avoid"; st.cwnd = st.ssthresh; }, 900);
    }
    function updateInfo() {
      var names = { slow: "慢启动（指数）", avoid: "拥塞避免（线性）", fr: "快速恢复" };
      phEl.textContent = names[st.phase];
      out.innerHTML =
        ro("拥塞窗口 cwnd", st.cwnd + " MSS") +
        ro("慢启动门限 ssthresh", st.ssthresh + " MSS", "v") +
        ro("已过 RTT", st.rtt + " 轮", "a") +
        ro("发送窗口 swnd", "min(cwnd, rwnd)", "g");
    }
    function ro(l, v, k) { return '<div class="ro ' + (k || "") + '"><span>' + l + "</span><b>" + v + "</b></div>"; }

    ctrl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-c]"); if (!b) return;
      var a = b.dataset.c;
      if (a === "timeout") timeout();
      if (a === "dup") dup();
      if (a === "reset") reset();
      if (a === "pause") { st.paused = !st.paused; b.innerHTML = PF.icon(st.paused ? "play" : "pause") + (st.paused ? "继续" : "暂停"); }
    });

    push(); updateInfo();
    setInterval(advance, 620);

    PF.Scene(cv, {
      height: 300,
      draw: function (s, t) {
        var ctx = s.ctx, W = s.W, H = s.H;
        ctx.clearRect(0, 0, W, H);
        var padL = 44, padR = 18, padT = 18, padB = 30;
        var gw = W - padL - padR, gh = H - padT - padB;
        var maxX = Math.max(20, st.hist.length - 1);
        var maxY = st.max;
        // 网格
        ctx.strokeStyle = tone("grid", .12); ctx.lineWidth = 1;
        for (var i = 0; i <= 4; i++) {
          var yy = padT + gh / 4 * i;
          ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(W - padR, yy); ctx.stroke();
          ctx.fillStyle = tone("muted", .8); ctx.font = "9.5px monospace"; ctx.textAlign = "right";
          ctx.fillText(Math.round(maxY * (1 - i / 4)), padL - 7, yy + 3);
        }
        ctx.fillStyle = tone("muted", .8); ctx.textAlign = "center";
        ctx.fillText("RTT →", W / 2, H - 8);
        ctx.textAlign = "left";
        ctx.fillText("cwnd", padL - 36, padT - 6);
        // ssthresh 线
        var sy = padT + gh * (1 - st.ssthresh / maxY);
        ctx.strokeStyle = "rgba(155,140,255,.7)"; ctx.lineWidth = 1.4; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(padL, sy); ctx.lineTo(W - padR, sy); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(155,140,255,.95)"; ctx.font = "10px monospace";
        ctx.fillText("ssthresh = " + st.ssthresh, padL + 6, sy - 6);
        // 曲线
        var X = function (x) { return padL + gw * (x / maxX); };
        var Y = function (y) { return padT + gh * (1 - y / maxY); };
        var colors = { slow: TC("#35e5d4"), avoid: TC("#4d8dff"), fr: TC("#ffb454") };
        ctx.lineWidth = 2.4;
        for (var k = 1; k < st.hist.length; k++) {
          var a = st.hist[k - 1], b = st.hist[k];
          ctx.strokeStyle = colors[b.phase] || TC("#35e5d4");
          ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(b.x), Y(b.y)); ctx.stroke();
        }
        // 当前点
        if (st.hist.length) {
          var last = st.hist[st.hist.length - 1];
          ctx.beginPath(); ctx.arc(X(last.x), Y(last.y), 4.5, 0, 6.2832);
          ctx.fillStyle = colors[last.phase]; ctx.fill();
        }
        // 事件标记
        st.events.forEach(function (ev) {
          var x = X(ev.x), y = Y(ev.y);
          ctx.strokeStyle = ev.t === "timeout" ? "rgba(255,107,107,.8)" : "rgba(255,180,84,.8)";
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + gh); ctx.stroke();
          ctx.fillStyle = ev.t === "timeout" ? TC("#ff6b6b") : TC("#ffb454");
          ctx.font = "10px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(ev.t === "timeout" ? "超时" : "3 个重复 ACK", x, padT + 11);
        });
        ctx.textAlign = "left";
      }
    });
  };

  /* ============ 注册阶段 ============ */
  PF.register({
    id: "s4", num: 4, title: "传输层与端到端通信", short: "传输层",
    icon: "exchange", accent: "var(--c-green)", difficulty: 3, duration: "2 周", level: "★★★☆☆",
    tagline: "IP 只做「尽力而为」，传输层用端口号补上「进程寻址」，再用 TCP 补上「可靠性」。三次握手、滑动窗口、拥塞控制——网络面试的必考区。",
    tags: ["TCP", "UDP", "三次握手", "滑动窗口", "拥塞控制"],
    lead: "网络层把数据送到「主机」，但主机上跑着几十个程序——**到底给谁？** 这就是传输层要解决的第一个问题。第二个问题是：IP 不保证送达、不保证顺序，**要不要补上可靠性？** TCP 和 UDP 就是这两条路的不同答案。",
    sections: [
      {
        id: "s4-1", title: "传输层要解决什么", icon: "exchange",
        blocks: [
          { t: "p", x: "网络层把数据送到了**主机**，但主机上同时跑着浏览器、微信、邮件客户端……**数据该交给哪个进程？** 传输层用 **端口号** 解决这个问题。同时，IP 只提供「尽力而为」的服务，**可靠性是可选项**——TCP 选择补上，UDP 选择不补。" },
          { t: "table", head: ["功能", "说明"], rows: [["**复用 / 分用**", "发送时多个应用的数据汇入一条 IP 通道（复用）；接收时按端口号分发给对应进程（分用）"], ["**端口寻址**", "16 位端口号（0～65535）标识主机上的具体进程"], ["**分段与重组**", "把上层数据切成合适大小的段"], ["**连接管理**", "建立、维护、释放连接（TCP）"], ["**可靠传输**", "确认、重传、排序（TCP）"], ["**流量控制**", "滑动窗口，照顾接收方"], ["**拥塞控制**", "慢启动、拥塞避免，照顾网络"]] },
          { t: "callout", kind: "key", title: "四元组：唯一标识一条 TCP 连接", x: "**源 IP + 源端口 + 目的 IP + 目的端口**。加上协议号就是**五元组**。所以同一个客户端可以用不同端口同时连同一台服务器的 443 端口——**连接由四元组区分，不是由 IP 区分**。" },
          { t: "table", head: ["端口范围", "名称", "说明"], rows: [["0 ～ 1023", "**知名端口**", "系统 / 标准服务，如 80、443、22、53"], ["1024 ～ 49151", "**注册端口**", "用户注册的应用，如 3306、6379"], ["49152 ～ 65535", "**动态 / 私有端口**", "客户端临时使用"]] },
          { t: "table", head: ["端口", "协议", "端口", "协议"], rows: [["22", "SSH", "53", "DNS"], ["25", "SMTP", "80", "HTTP"], ["443", "HTTPS", "3306", "MySQL"], ["3389", "RDP", "6379", "Redis"], ["27017", "MongoDB", "123", "NTP"]] }
        ]
      },
      {
        id: "s4-2", title: "UDP：简单直接", icon: "zap",
        blocks: [
          { t: "p", x: "**UDP 首部只有 8 字节**：源端口、目的端口、长度、校验和（各 16 位）。没有连接、没有确认、没有重传、没有拥塞控制——**把数据报原样发出去就不管了**。" },
          { t: "table", head: ["特性", "含义"], rows: [["**无连接**", "不发握手，直接发"], ["**不可靠**", "不确认、不重传、不排序"], ["**面向报文**", "保留消息边界，不合并不拆分"], ["**开销小**", "首部仅 8 字节，无需维护连接状态"]] },
          { t: "p", x: "**UDP 适合什么场景？** ① 对时延敏感、能容忍少量丢包（直播、语音、游戏）；② 请求 / 响应模式（DNS，一问一答）；③ 广播 / 组播；④ 想自己实现可靠性的场景（**QUIC 就是基于 UDP 的**）。" },
          { t: "callout", kind: "tip", title: "「不可靠」不等于「没用」", x: "很多现代协议（QUIC、WebRTC、HTTP/3）都在 UDP 之上**自己实现**可靠传输和拥塞控制。**UDP 只是一个更小的画布。**" }
        ]
      },
      {
        id: "s4-3", title: "TCP 报文段与可靠传输", icon: "shield-check",
        blocks: [
          { t: "p", x: "**TCP 首部固定 20 字节**（含选项最大 60）。关键字段：**源 / 目的端口**（各 16 位）、**序号 seq**（32 位，本报文段数据第一个字节的编号）、**确认号 ack**（32 位，期望收到的下一个字节编号）、**数据偏移**（单位 4 字节）、**窗口**（16 位）、**校验和**、**紧急指针**、**选项**。" },
          { t: "table", head: ["标志位", "含义"], rows: [["**SYN**", "请求建立连接"], ["**ACK**", "确认号有效"], ["**FIN**", "请求释放连接"], ["**RST**", "重置连接（异常时使用）"], ["**PSH**", "立即交付给应用层"], ["**URG**", "紧急指针有效"]] },
          { t: "p", x: "**面向字节流**是理解 TCP 的关键：TCP 把数据看成**没有边界的字节序列**，序号是「字节编号」而不是「报文编号」。**累计确认**：`ack = N` 表示 **N 之前的所有字节都已收到**。" },
          { t: "formula", label: "RTO 动态计算（Jacobson 算法）", x: "RTO = SRTT + 4 × RTTVAR" },
          { t: "table", head: ["机制", "作用"], rows: [["**超时重传**", "RTO 到期未收到 ACK 就重传；重传的报文段**不参与 RTT 计算**（Karn 算法）"], ["**快速重传**", "收到 **3 个重复 ACK** 立即重传，不必等超时"], ["**SACK**", "选择性确认，只重传真正丢失的段"], ["**D-SACK**", "告知发送方「这个重传包我早就收到了」，避免误判"], ["**校验和**", "覆盖首部 + 数据 + 伪首部，检错"]] },
          { t: "callout", kind: "warn", title: "TCP 可靠 ≠ 一定不丢数据", x: "如果连接被 RST、或重传达到上限仍失败，TCP 会**报错**而不是无限重试。**可靠性是有边界的。**" }
        ]
      },
      {
        id: "s4-4", title: "三次握手与四次挥手", icon: "git-branch",
        blocks: [
          { t: "viz", id: "s4-handshake", icon: "git-branch", title: "三次握手 / 四次挥手 · 状态机动画", sub: "切换模式，逐步观察报文与状态迁移", tag: "Step Player", note: "**为什么必须三次？** 两次无法防止「失效的连接请求」——客户端一个滞留的旧 SYN 到达服务器，服务器以为要建连并分配资源，但客户端根本不理它，**服务器资源被白白占用**。第三次 ACK 就是为了确认「客户端确实想连」。" },
          { t: "p", x: "**为什么挥手要四次？** 因为 TCP 是**全双工**的。客户端发 FIN 只表示「我没有数据要发了」，但**服务端可能还有数据要发**，所以服务端的 ACK 和 FIN 不能合并，必须分两次。" },
          { t: "callout", kind: "key", title: "TIME_WAIT 与 2MSL（重点）", x: "客户端发出最后一个 ACK 后进入 **TIME_WAIT**，等待 **2MSL**（约 1～4 分钟）才关闭。两个目的：**① 保证最后那个 ACK 能到达**——如果它丢了，服务端会重发 FIN，客户端还能在 TIME_WAIT 内重发 ACK；**② 让本连接的旧报文在网络中彻底消失**，避免影响后续用同样四元组的新连接。" },
          { t: "callout", kind: "danger", title: "CLOSE_WAIT 要警惕", x: "**TIME_WAIT 是主动关闭方**的正常状态，少量出现完全正常；**CLOSE_WAIT 是被动关闭方**的状态，它**不会自动消失，必须等应用层调用 `close()`**。如果服务器上出现**大量 CLOSE_WAIT**，几乎可以肯定是**代码里没有正确关闭连接**（连接泄漏）。" },
          { t: "table", head: ["攻击 / 问题", "原理", "防御"], rows: [["**SYN 洪泛**", "发大量伪造源 IP 的 SYN，服务器回 SYN+ACK 后等不到 ACK，**半连接队列被占满**", "**SYN Cookie**、SYN Proxy、限速"], ["**TCP 重置攻击**", "伪造 RST 报文强制断开连接", "序列号随机化、加密（TLS）"]] }
        ]
      },
      {
        id: "s4-5", title: "流量控制：滑动窗口", icon: "filter",
        blocks: [
          { t: "p", x: "如果发送方发得太快，接收方缓冲区会被淹没。**滑动窗口** 让接收方通过 TCP 首部的 **窗口字段（rwnd）** 告诉发送方：「我还能收多少字节」。发送方据此调整，**窗口会随着 ACK 到来不断向右滑动**。" },
          { t: "viz", id: "s4-window", icon: "filter", title: "滑动窗口 · 交互演示", sub: "点「发送」「收到 ACK」，看窗口如何滑动", tag: "Interactive", note: "窗口内的四个区域：**已确认（绿）**、**已发送待确认（蓝）**、**可发送（琥珀）**、**窗口外（灰）**。滑动窗口的意义在于：**不必等一个包确认再发下一个**，从而大幅提升吞吐量——这是它相对「停止-等待协议」的核心优势。" },
          { t: "table", head: ["机制", "说明"], rows: [["**零窗口**", "接收方缓冲区满，rwnd = 0，发送方停止发送并启动**窗口探测**定时器"], ["**糊涂窗口综合征 SWS**", "小窗口导致发送方频繁发小包，效率极低"], ["**Nagle 算法**", "缓存小数据，攒够 MSS 或收到 ACK 再发"], ["**延迟确认**", "收到数据后延迟约 200 ms 或捎带回 ACK"]] },
          { t: "callout", kind: "warn", title: "Nagle 与延迟确认的「相爱相杀」", x: "Nagle 等 ACK 才发小包，延迟确认等数据才回 ACK——两者同时开启可能导致**额外 200 ms 延迟**。对时延敏感的应用（如游戏）通常关闭 Nagle（`TCP_NODELAY`）。" }
        ]
      },
      {
        id: "s4-6", title: "拥塞控制", icon: "activity",
        blocks: [
          { t: "callout", kind: "key", title: "流量控制 vs 拥塞控制", x: "**流量控制**照顾的是**接收方**（rwnd，接收方告诉我能收多少）；**拥塞控制**照顾的是**网络**（cwnd，网络能承受多少）。**实际发送窗口 swnd = min(cwnd, rwnd)**。" },
          { t: "formula", label: "发送窗口", x: "swnd = min(cwnd, rwnd)" },
          { t: "viz", id: "s4-congestion", icon: "activity", title: "拥塞控制 · 实时曲线", sub: "注入丢包，观察 cwnd 与 ssthresh 如何变化", tag: "Simulation", note: "**慢启动**：每收到一个 ACK 就 cwnd += 1 MSS，等价于**每 RTT 翻倍**（指数增长）；到达 ssthresh 后进入**拥塞避免**，每 RTT 只 +1 MSS（线性增长）。发生超时 → `ssthresh = cwnd/2, cwnd = 1`，回到慢启动；收到 3 个重复 ACK → 快速重传 + **快速恢复**（`cwnd = ssthresh + 3`）。**这就是 AIMD（线性增、乘性减）。**" },
          { t: "table", head: ["算法", "核心思想"], rows: [["**Tahoe**", "丢包就回到 cwnd = 1（慢启动）"], ["**Reno**", "引入快速恢复，3 个重复 ACK 不必回到 1"], ["**CUBIC**", "用三次函数代替线性增长，高带宽长时延场景更好（Linux 默认）"], ["**BBR**", "不把丢包当拥塞信号，而是**测量带宽和 RTT**，主动控制发送速率"]] }
        ]
      },
      {
        id: "s4-7", title: "粘包问题与 TCP/UDP 选型", icon: "scissors",
        blocks: [
          { t: "p", x: "**粘包不是 TCP 的 bug**，而是「面向字节流」的必然结果：TCP 不保留消息边界，应用层连续写入的两条消息可能在接收方被一次读到。三种成因：**发送方连续写小数据被合并**、**接收方缓冲区未及时读走**、**Nagle 算法攒包**。" },
          { t: "table", head: ["解决方案", "做法"], rows: [["**固定长度**", "每条消息长度固定，简单但不灵活"], ["**分隔符**", "用特殊字符分隔（如 `\\r\\n`），需要转义"], ["**TLV / 长度字段**", "**最常用**：先发 4 字节长度，再发内容"], ["**自描述格式**", "用 JSON / Protobuf 等自带边界的格式"]] },
          { t: "table", head: ["对比项", "TCP", "UDP"], rows: [["连接", "面向连接", "无连接"], ["可靠性", "可靠（确认 + 重传）", "不可靠"], ["顺序", "保证顺序", "不保证"], ["传输方式", "面向字节流", "面向报文（保留边界）"], ["首部开销", "20～60 字节", "**8 字节**"], ["速度", "较慢", "**快**"], ["流量 / 拥塞控制", "有", "无"], ["适用场景", "文件传输、网页、邮件", "直播、语音、游戏、DNS、QUIC"]] },
          { t: "callout", kind: "tip", title: "选型一句话", x: "**要可靠、要顺序 → TCP；要实时、要快、能容忍丢包 → UDP；想要「又快又可靠」→ 在 UDP 上自己实现（QUIC）。**" }
        ]
      },
      { id: "s4-terms", title: "术语速查表", icon: "list", blocks: [{ t: "terms", items: [
        { t: "复用 / 分用", en: "Multiplexing", d: "多应用数据汇入一条 IP 通道 / 按端口号分发给对应进程" },
        { t: "四元组 / 五元组", en: "—", d: "源IP+源端口+目的IP+目的端口（+协议号），唯一标识一条连接" },
        { t: "Socket", en: "套接字", d: "IP + 端口号，应用与协议栈的接口" },
        { t: "序号 / 确认号", en: "Seq / Ack", d: "本报文段首字节编号 / 期望收到的下一个字节编号" },
        { t: "累计确认", en: "Cumulative ACK", d: "ack = N 表示 N 之前所有字节均已收到" },
        { t: "RTO", en: "Retransmission Timeout", d: "重传超时时间，动态计算 = SRTT + 4×RTTVAR" },
        { t: "快速重传", en: "Fast Retransmit", d: "收到 3 个重复 ACK 立即重传" },
        { t: "SACK / D-SACK", en: "—", d: "选择性确认 / 告知「重传包早收到」" },
        { t: "MSL / 2MSL", en: "—", d: "报文最大生存时间 / TIME_WAIT 等待时长" },
        { t: "rwnd / cwnd / swnd", en: "—", d: "接收窗口 / 拥塞窗口 / 发送窗口 = min(cwnd, rwnd)" },
        { t: "ssthresh", en: "—", d: "慢启动与拥塞避免的分界阈值" },
        { t: "SWS", en: "Silly Window Syndrome", d: "糊涂窗口综合征，小窗口导致发小包效率低" },
        { t: "Nagle 算法", en: "—", d: "缓存小数据、攒够 MSS 或收到 ACK 再发" },
        { t: "AIMD", en: "—", d: "线性增、乘性减，TCP 拥塞控制核心思想" },
        { t: "SYN Cookie", en: "—", d: "握手完成前不分配资源，防 SYN 洪泛" },
        { t: "TIME_WAIT / CLOSE_WAIT", en: "—", d: "主动关闭方等待 2MSL / 被动关闭方等待应用 close()" },
        { t: "队头阻塞", en: "Head-of-Line Blocking", d: "前面的包未到，后面的包不能交付" }
      ] }] },
      { id: "s4-pit", title: "八个常见误区", icon: "alert", blocks: [{ t: "pitfalls", items: [
        { t: "TCP 可靠，所以一定不丢数据", x: "**错误。** 连接被 RST 或重传失败会报错，**可靠性有边界**。" },
        { t: "慢启动真的很慢", x: "**错误。** 起点低（cwnd 从 1 或 10 开始），但**每 RTT 翻倍、指数增长**，很快就起来了。" },
        { t: "流量控制和拥塞控制是一回事", x: "**错误。** 前者照顾**接收方**（rwnd），后者照顾**网络**（cwnd），实际取二者最小值。" },
        { t: "TIME_WAIT 是故障，要尽快消除", x: "**错误。** 它是协议**必要状态**，少量正常。只有数量异常大时才需要优化。" },
        { t: "CLOSE_WAIT 和 TIME_WAIT 差不多，等等就没了", x: "**错误。** CLOSE_WAIT **不会自动消失**，必须等应用层 close()。大量出现 = **代码连接泄漏**。" },
        { t: "三次握手可以改成两次，效率更高", x: "**错误。** 无法防止失效连接请求造成服务器资源浪费。" },
        { t: "粘包是 TCP 的 bug", x: "**错误。** 它是**面向字节流的必然结果**，属应用层需自行定义边界的问题。" },
        { t: "UDP 不可靠，所以不能用在对数据有要求的场景", x: "**错误。** 可靠性可由应用层实现，**QUIC 就基于 UDP 且自带可靠传输、拥塞控制与 TLS**。" }
      ] }] },
      { id: "s4-quiz", title: "自测练习", icon: "target", blocks: [{ t: "quiz", stage: "s4", items: [
        { q: "TCP 为什么必须三次握手，而不能只握两次？", o: ["为了加密", "防止失效的旧连接请求占用服务器资源", "为了提高速度", "为了协商端口号"], a: 1, e: "如果只有两次，一个**滞留的旧 SYN** 到达服务器会让服务器误以为要建连并分配资源，而客户端根本不理它——**资源被白白占用**。第三次 ACK 确认了客户端的意愿。" },
        { q: "TIME_WAIT 状态存在的两个主要目的是？", o: ["加快重传、减少开销", "保证最后的 ACK 到达 + 让旧报文彻底消失", "防止 SYN 洪泛", "协商 MSS"], a: 1, e: "① 若最后那个 ACK 丢失，服务端会重发 FIN，客户端还能在 TIME_WAIT 内重发 ACK；② 让本连接的旧报文在网络中彻底消失，避免影响后续同四元组的新连接。" },
        { q: "慢启动阶段，cwnd 是如何变化的？", o: ["每 RTT 加 1 MSS", "每 RTT 翻倍（指数增长）", "保持不变", "每 RTT 减半"], a: 1, e: "慢启动阶段每收到一个 ACK 就 cwnd += 1 MSS，等价于**每 RTT 翻倍**。到达 ssthresh 后才转为拥塞避免（线性 +1）。" },
        { q: "收到 3 个重复 ACK 时，TCP 会做什么？", o: ["回到 cwnd = 1，重新慢启动", "立即重传丢失段并进入快速恢复", "断开连接", "什么都不做，等超时"], a: 1, e: "**快速重传 + 快速恢复**：`ssthresh = cwnd/2`，`cwnd = ssthresh + 3`，不必等超时、也不必回到 1。" },
        { q: "服务器上出现大量 CLOSE_WAIT 状态，最可能的原因是？", o: ["网络拥塞", "应用代码没有正确关闭连接", "遭受 DDoS 攻击", "TIME_WAIT 时间太短"], a: 1, e: "CLOSE_WAIT 是被动关闭方等待应用调用 `close()` 的状态，**不会自动消失**。大量出现基本可以断定是**连接泄漏**。" }
      ] }] }
    ]
  });

})();
