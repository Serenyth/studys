/* ============================================================
   阶段一 · 网络入门与分层模型
   ============================================================ */
(function () {
  "use strict";
  var PF = window.PF;
  var tone = PF.tone;   /* 主题感知的 Canvas 文本色 */
  var TC = PF.C;      /* 主题感知的强调色 */

  /* ============ 可视化 1：封装与解封装 ============ */
  PF.VIZ["s1-encap"] = function (stage) {
    var C = { data: TC("#35e5d4"), tcp: TC("#4d8dff"), ip: TC("#9b8cff"), frame: TC("#ffb454"), bit: TC("#ff6aa2") };
    var LAY = [
      { n: "应用层", pdu: "报文 Message", c: C.data },
      { n: "传输层", pdu: "段 Segment", c: C.tcp },
      { n: "网络层", pdu: "包 Packet", c: C.ip },
      { n: "数据链路层", pdu: "帧 Frame", c: C.frame },
      { n: "物理层", pdu: "比特 Bit", c: C.bit }
    ];
    var STEPS = [
      { tx: 0, segs: [["数据 Data", C.data, 128]], d: "应用层生成数据 —— 此时的 PDU 叫「报文」", tag: "封装" },
      { tx: 1, segs: [["TCP", C.tcp, 44], ["数据", C.data, 108]], d: "传输层加 TCP 首部（源/目的端口、序号）—— 变成「段」", tag: "封装" },
      { tx: 2, segs: [["IP", C.ip, 38], ["TCP", C.tcp, 44], ["数据", C.data, 100]], d: "网络层加 IP 首部（源/目的 IP、TTL）—— 变成「包」", tag: "封装" },
      { tx: 3, segs: [["帧头", C.frame, 44], ["IP", C.ip, 36], ["TCP", C.tcp, 42], ["数据", C.data, 84], ["帧尾", C.frame, 44]], d: "链路层加帧头 + 帧尾（源/目的 MAC、FCS）—— 变成「帧」", tag: "封装" },
      { tx: 4, segs: [["1011 0010 1101 0110 …", C.bit, 232]], d: "物理层把帧转成电/光信号 —— 变成「比特流」", tag: "封装" },
      { tx: -1, rx: -1, wire: true, segs: [["1011 0010 1101 0110 …", C.bit, 232]], d: "比特流沿着物理介质传到对端", tag: "传输" },
      { rx: 4, segs: [["1011 0010 1101 0110 …", C.bit, 232]], d: "接收方物理层收到信号，还原成帧", tag: "解封装" },
      { rx: 3, segs: [["帧头", C.frame, 44], ["IP", C.ip, 36], ["TCP", C.tcp, 42], ["数据", C.data, 84], ["帧尾", C.frame, 44]], d: "链路层剥掉帧头帧尾，校验 FCS —— 目的 MAC 是自己则上交", tag: "解封装" },
      { rx: 2, segs: [["IP", C.ip, 38], ["TCP", C.tcp, 44], ["数据", C.data, 100]], d: "网络层剥掉 IP 首部 —— 目的 IP 是自己则上交", tag: "解封装" },
      { rx: 1, segs: [["TCP", C.tcp, 44], ["数据", C.data, 108]], d: "传输层剥掉 TCP 首部 —— 按目的端口找到对应进程", tag: "解封装" },
      { rx: 0, segs: [["数据 Data", C.data, 128]], d: "应用层拿到原始数据 —— 交给浏览器 / 微信显示给用户", tag: "完成" }
    ];

    var svg = [];
    svg.push('<svg viewBox="0 0 720 330" class="viz-canvas" style="height:330px" preserveAspectRatio="xMidYMid meet">');
    svg.push('<text x="104" y="14" text-anchor="middle" class="lbl-b">发送方</text>');
    svg.push('<text x="616" y="14" text-anchor="middle" class="lbl-b">接收方</text>');
    for (var i = 0; i < 5; i++) {
      var y = 26 + i * 54;
      svg.push('<g class="enc-layer" data-side="tx" data-i="' + i + '">');
      svg.push('<rect x="20" y="' + y + '" width="168" height="42" rx="11" fill="var(--panel-2)" stroke="var(--line-2)" stroke-width="1.2"/>');
      svg.push('<text x="34" y="' + (y + 26) + '" class="lbl-b">' + LAY[i].n + "</text>");
      svg.push('<text x="176" y="' + (y + 26) + '" text-anchor="end" class="lbl-m">' + LAY[i].pdu + "</text>");
      svg.push("</g>");
      svg.push('<g class="enc-layer" data-side="rx" data-i="' + i + '">');
      svg.push('<rect x="532" y="' + y + '" width="168" height="42" rx="11" fill="var(--panel-2)" stroke="var(--line-2)" stroke-width="1.2"/>');
      svg.push('<text x="546" y="' + (y + 26) + '" class="lbl-b">' + LAY[i].n + "</text>");
      svg.push('<text x="688" y="' + (y + 26) + '" text-anchor="end" class="lbl-m">' + LAY[i].pdu + "</text>");
      svg.push("</g>");
    }
    svg.push('<path id="encWire" d="M104 296 L104 316 L616 316 L616 296" fill="none" stroke="var(--line-2)" stroke-width="1.5" stroke-dasharray="5 5"/>');
    svg.push('<circle id="encDot" cx="104" cy="316" r="4" fill="' + C.bit + '" opacity="0"/>');
    svg.push('<g id="encToken"></g>');
    svg.push("</svg>");
    stage.innerHTML = svg.join("");

    var token = PF.$("#encToken", stage);
    var dot = PF.$("#encDot", stage);
    var desc = document.createElement("div");
    desc.className = "enc-desc";
    desc.style.cssText = "margin-top:14px;padding:13px 16px;border-radius:11px;background:var(--panel-2);border:1px solid var(--line);font-size:13.4px;color:var(--ink-2);line-height:1.7;min-height:56px;display:flex;gap:12px;align-items:center";
    stage.appendChild(desc);

    var ctrl = document.createElement("div");
    ctrl.className = "viz-ctrl";
    ctrl.innerHTML =
      '<button class="ctrl-btn" data-act="play">' + PF.icon("play") + "播放</button>" +
      '<button class="ctrl-btn" data-act="step">' + PF.icon("arrow-right") + "下一步</button>" +
      '<button class="ctrl-btn" data-act="reset">' + PF.icon("reset") + "重置</button>" +
      '<span class="ctrl-field" style="margin-left:auto"><span>进度</span><b id="encProg" style="font-family:var(--font-mono);color:var(--c-cyan)">0 / ' + (STEPS.length - 1) + "</b></span>";
    stage.parentNode.appendChild(ctrl);

    var step = 0, timer = null;

    function paint() {
      var st = STEPS[step];
      PF.$$(".enc-layer", stage).forEach(function (g) {
        var side = g.dataset.side, i = +g.dataset.i;
        var rect = PF.$("rect", g);
        var on = (side === "tx" && st.tx === i) || (side === "rx" && st.rx === i);
        rect.setAttribute("fill", on ? LAY[i].c : "var(--panel-2)");
        rect.setAttribute("fill-opacity", on ? ".22" : "1");
        rect.setAttribute("stroke", on ? LAY[i].c : "var(--line-2)");
        rect.setAttribute("stroke-width", on ? "2" : "1.2");
      });
      // token
      var segs = st.segs, total = 0;
      segs.forEach(function (s) { total += s[2]; });
      var x0 = 360 - total / 2, html = "";
      html += '<rect x="' + (x0 - 8) + '" y="141" width="' + (total + 16) + '" height="42" rx="12" fill="var(--panel-solid)" stroke="var(--line-2)"/>';
      var cx = x0;
      segs.forEach(function (s) {
        html += '<rect x="' + cx + '" y="146" width="' + (s[2] - 3) + '" height="32" rx="7" fill="' + s[1] + '" fill-opacity=".2" stroke="' + s[1] + '" stroke-width="1.2"/>';
        if (s[2] > 52) html += '<text x="' + (cx + s[2] / 2 - 1.5) + '" y="166" text-anchor="middle" style="font-family:var(--font-mono);font-size:10.5px;fill:' + s[1] + '">' + s[0] + "</text>";
        cx += s[2];
      });
      token.innerHTML = html;
      desc.innerHTML = '<span class="chip ' + (st.tag === "封装" ? "solid" : st.tag === "解封装" ? "a" : st.tag === "传输" ? "v" : "g") + '" style="flex-shrink:0">' + st.tag + "</span><span>" + st.d + "</span>";
      dot.setAttribute("opacity", st.wire ? "1" : "0");
      var prog = PF.$("#encProg", ctrl);
      if (prog) prog.textContent = step + " / " + (STEPS.length - 1);
    }

    function setStep(s) { step = PF.clamp(s, 0, STEPS.length - 1); paint(); }
    function stop() { if (timer) { clearInterval(timer); timer = null; var b = PF.$('[data-act="play"]', ctrl); if (b) b.innerHTML = PF.icon("play") + "播放"; } }
    function play() {
      if (timer) { stop(); return; }
      var b = PF.$('[data-act="play"]', ctrl);
      b.innerHTML = PF.icon("pause") + "暂停";
      if (step >= STEPS.length - 1) step = 0;
      timer = setInterval(function () {
        if (step >= STEPS.length - 1) { stop(); return; }
        setStep(step + 1);
      }, 1050);
    }
    ctrl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      var a = b.dataset.act;
      if (a === "play") play();
      if (a === "step") { stop(); setStep(step + 1); }
      if (a === "reset") { stop(); setStep(0); }
    });
    paint();
  };

  /* ============ 可视化 2：OSI 七层交互 ============ */
  PF.VIZ["s1-osi"] = function (stage) {
    var L = [
      { n: "应用层", en: "Application", duty: "直接面向用户和应用程序，提供网络服务接口", pdu: "数据 Data", proto: "HTTP / HTTPS、FTP、SMTP、DNS、DHCP、SSH", dev: "网关、应用层防火墙", ana: "快递员把包裹交到你手上", c: "var(--c-pink)" },
      { n: "表示层", en: "Presentation", duty: "数据格式转换、加密解密、压缩解压", pdu: "数据 Data", proto: "JPEG、GIF、MPEG、ASCII/Unicode、TLS（部分）", dev: "—（现实中并入应用层）", ana: "把杯子用气泡膜包好、贴易碎标签", c: "var(--c-amber)" },
      { n: "会话层", en: "Session", duty: "建立、维持、终止两个应用之间的对话；同步检查点", pdu: "数据 Data", proto: "RPC、NetBIOS、SQL 会话、NFS", dev: "—（现实中并入应用层）", ana: "跟快递员约好上门取件时间", c: "var(--c-amber)" },
      { n: "传输层", en: "Transport", duty: "为两台主机的具体应用之间提供端到端通信", pdu: "段 Segment / 用户数据报", proto: "TCP、UDP", dev: "四层防火墙、四层负载均衡器", ana: "选「保价 + 签收」，确保完整送达", c: "var(--c-green)" },
      { n: "网络层", en: "Network", duty: "跨网络转发，决定数据包走哪条路", pdu: "分组 / 包 Packet", proto: "IP、ICMP、IGMP、RIP / OSPF / BGP", dev: "路由器、三层交换机", ana: "快递公司规划路线与中转城市", c: "var(--c-violet)" },
      { n: "数据链路层", en: "Data Link", duty: "把比特切成帧，用 MAC 地址在同一链路内找到邻居", pdu: "帧 Frame", proto: "以太网 802.3、Wi-Fi 802.11、PPP、VLAN 802.1Q", dev: "交换机、网桥、网卡", ana: "中转站扫描、分拣、贴标签", c: "var(--c-blue)" },
      { n: "物理层", en: "Physical", duty: "把 0 和 1 变成能在介质上跑的电压 / 光 / 电磁波", pdu: "比特 Bit", proto: "RS-232、RJ-45、光纤标准", dev: "中继器、集线器、网线、光纤、网卡（物理部分）", ana: "卡车在高速上实际跑", c: "var(--c-cyan)" }
    ];
    var TCPIP = [
      { n: "应用层", span: 3, c: "var(--c-pink)" },
      { n: "传输层", span: 1, c: "var(--c-green)" },
      { n: "网络层", span: 1, c: "var(--c-violet)" },
      { n: "网络接口层", span: 2, c: "var(--c-cyan)" }
    ];
    var wrap = document.createElement("div");
    wrap.className = "osi-wrap";
    var left = '<div class="osi-stack">' + L.map(function (l, i) {
      return '<button class="osi-row" data-i="' + i + '"><span class="osi-idx">' + (7 - i) + '</span><span class="osi-nm">' + l.n + "</span><span class=\"osi-en\">" + l.en + "</span></button>";
    }).join("") + "</div>";
    var mid = '<div class="osi-detail" id="osiDetail"></div>';
    var right = '<div class="osi-tcpip">' + TCPIP.map(function (t) {
      return '<div class="osi-tcp-item" style="grid-row:span ' + t.span + ';--tc:' + t.c + '"><b>' + t.n + "</b><span>" + t.span + " 层</span></div>";
    }).join("") + "</div>";
    wrap.innerHTML = '<div class="osi-cols"><div class="osi-col-h">OSI 七层</div><div class="osi-col-h">TCP/IP 四层</div></div>' +
      '<div class="osi-body">' + left + '<div class="osi-mid">' + mid + "</div>" + right + "</div>";
    stage.appendChild(wrap);

    var rows = PF.$$(".osi-row", wrap);
    function show(i) {
      rows.forEach(function (r, j) { r.classList.toggle("active", j === i); });
      var l = L[i];
      PF.$("#osiDetail", wrap).innerHTML =
        '<div class="od-head"><span class="od-idx" style="background:' + l.c + '">' + (7 - i) + "</span>" +
        '<div><b>' + l.n + '</b><em>' + l.en + "</em></div></div>" +
        '<p class="od-duty">' + l.duty + "</p>" +
        '<div class="od-grid">' +
        '<div><span>数据单元 PDU</span><b>' + l.pdu + "</b></div>" +
        '<div><span>典型设备</span><b>' + l.dev + "</b></div>" +
        '<div class="full"><span>典型协议 / 技术</span><b>' + l.proto + "</b></div>" +
        '<div class="full"><span>快递类比</span><b>' + l.ana + "</b></div>" +
        "</div>";
    }
    rows.forEach(function (r) { r.addEventListener("click", function () { show(+r.dataset.i); }); });
    show(0);
  };

  /* ============ 可视化 3：时延计算器 ============ */
  PF.VIZ["s1-delay"] = function (stage) {
    stage.innerHTML =
      '<div class="row wrap" style="gap:18px">' +
      '<label class="ctrl-field" style="flex:1;min-width:210px">数据长度 <input type="range" id="dLen" min="64" max="15000" step="64" value="1000"><b class="mono" id="dLenV" style="color:var(--c-cyan);min-width:76px;text-align:right">1000 B</b></label>' +
      '<label class="ctrl-field" style="flex:1;min-width:210px">链路带宽 <input type="range" id="dBw" min="1" max="10000" step="1" value="100"><b class="mono" id="dBwV" style="color:var(--c-cyan);min-width:76px;text-align:right">100 Mb/s</b></label>' +
      "</div>" +
      '<div class="row wrap" style="gap:18px;margin-top:14px">' +
      '<label class="ctrl-field" style="flex:1;min-width:210px">链路长度 <input type="range" id="dKm" min="1" max="20000" step="1" value="1000"><b class="mono" id="dKmV" style="color:var(--c-cyan);min-width:76px;text-align:right">1000 km</b></label>' +
      '<label class="ctrl-field" style="flex:1;min-width:210px">传播速度 <input type="range" id="dV" min="1" max="3" step="1" value="2"><b class="mono" id="dVV" style="color:var(--c-cyan);min-width:76px;text-align:right">2×10⁸ m/s</b></label>' +
      "</div>" +
      '<div class="delay-bars" id="dBars" style="margin-top:20px"></div>' +
      '<div class="readout" id="dOut" style="margin-top:18px"></div>' +
      '<div class="viz-note" style="border:1px solid var(--line);border-radius:11px;margin-top:16px">' +
      "💡 <b>核心区别</b>：发送时延只跟「数据量 ÷ 带宽」有关；传播时延只跟「距离 ÷ 光速」有关，++和带宽完全无关++。所以「带宽再大，也快不过光速」。</div>";

    var ids = ["dLen", "dBw", "dKm", "dV"];
    function fmt(v, d) { return v.toFixed(d); }
    function calc() {
      var bytes = +PF.$("#dLen").value, bwM = +PF.$("#dBw").value, km = +PF.$("#dKm").value, vx = +PF.$("#dV").value;
      PF.$("#dLenV").textContent = bytes + " B";
      PF.$("#dBwV").textContent = bwM + " Mb/s";
      PF.$("#dKmV").textContent = km + " km";
      PF.$("#dVV").textContent = vx + "×10⁸ m/s";
      var bits = bytes * 8;
      var bw = bwM * 1e6;
      var txMs = bits / bw * 1000;
      var propMs = (km * 1000) / (vx * 1e8) * 1000;
      var total = txMs + propMs;
      var bdp = propMs / 1000 * bw;
      var max = Math.max(txMs, propMs, 0.0001);
      PF.$("#dBars").innerHTML =
        bar("发送时延", txMs, max, "var(--c-cyan)") + bar("传播时延", propMs, max, "var(--c-violet)");
      PF.$("#dOut").innerHTML =
        ro("发送时延", fmt(txMs, 4) + " ms") +
        ro("传播时延", fmt(propMs, 4) + " ms", "v") +
        ro("总时延", fmt(total, 4) + " ms", "a") +
        ro("时延带宽积", bdp > 1e6 ? (bdp / 1e6).toFixed(2) + " Mbit" : Math.round(bdp) + " bit") +
        ro("RTT（约 2×传播）", fmt(propMs * 2, 4) + " ms", "p") +
        ro("主导因素", txMs > propMs ? "发送时延" : "传播时延", "g");
    }
    function bar(name, val, max, color) {
      var pct = PF.clamp(val / max * 100, 1, 100);
      return '<div class="dbar"><div class="dbar-top"><span>' + name + '</span><b class="mono">' + fmt(val, 4) + " ms</b></div>" +
        '<div class="dbar-track"><i style="width:' + pct + "%;background:" + color + '"></i></div></div>';
    }
    function ro(l, v, k) { return '<div class="ro ' + (k || "") + '"><span>' + l + "</span><b>" + v + "</b></div>"; }
    ids.forEach(function (id) { PF.$("#" + id).addEventListener("input", calc); });
    calc();
  };

  /* ============ 可视化 4：三种交换方式（Canvas） ============ */
  PF.VIZ["s1-switching"] = function (stage) {
    var cv = document.createElement("canvas");
    cv.className = "viz-canvas";
    stage.appendChild(cv);
    var LANES = [
      { n: "电路交换", sub: "先建独占通路 → 传输 → 释放", c: TC("#35e5d4") },
      { n: "报文交换", sub: "整块存储转发，一站一站等", c: TC("#ffb454") },
      { n: "分组交换", sub: "切成小分组，流水线并行", c: TC("#9b8cff") }
    ];
    var S = PF.Scene(cv, {
      height: 300,
      onResize: function (s) { s.nodes = null; },
      draw: function (s, t) {
        var ctx = s.ctx, W = s.W, H = s.H;
        ctx.clearRect(0, 0, W, H);
        var laneH = H / 3;
        var padL = 92, padR = 26;
        var x0 = padL, x3 = W - padR;
        var xs = [x0, x0 + (x3 - x0) * 0.34, x0 + (x3 - x0) * 0.66, x3];
        var names = ["源", "R1", "R2", "目的"];
        var P = 7000, p = (t % P) / P;

        for (var li = 0; li < 3; li++) {
          var cy = laneH * li + laneH / 2;
          var top = laneH * li + 8;
          // 泳道底
          ctx.fillStyle = tone("grid", .05);
          rr(ctx, 6, top, W - 12, laneH - 16, 12); ctx.fill();
          // 标签
          ctx.fillStyle = LANES[li].c;
          ctx.font = "600 12px 'Chakra Petch', sans-serif";
          ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
          ctx.fillText(LANES[li].n, 12, cy - 6);
          ctx.fillStyle = tone("muted", .85);
          ctx.font = "10px sans-serif";
          ctx.fillText(LANES[li].sub, 12, cy + 9);

          // 节点
          for (var k = 0; k < 4; k++) {
            ctx.beginPath();
            ctx.arc(xs[k], cy, k === 0 || k === 3 ? 15 : 12, 0, 6.2832);
            ctx.fillStyle = tone("grid", .1); ctx.fill();
            ctx.strokeStyle = tone("line", .4); ctx.lineWidth = 1.4; ctx.stroke();
            ctx.fillStyle = tone("ink2", .9);
            ctx.font = "9.5px sans-serif"; ctx.textAlign = "center";
            ctx.fillText(names[k], xs[k], cy + 27);
          }
          // 链路
          ctx.strokeStyle = tone("line", .22); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(xs[0], cy); ctx.lineTo(xs[3], cy); ctx.stroke();

          var pos = function (u) {
            u = PF.clamp(u, 0, 3);
            var i = Math.min(2, Math.floor(u)), f = u - i;
            return xs[i] + (xs[i + 1] - xs[i]) * f;
          };
          var unit = function (u, color, w, alpha) {
            if (u < -0.02 || u > 3.02) return;
            var x = pos(u);
            ctx.globalAlpha = alpha == null ? 1 : alpha;
            ctx.fillStyle = color;
            rr(ctx, x - w / 2, cy - 8, w, 16, 5); ctx.fill();
            ctx.globalAlpha = 1;
          };

          if (li === 0) {
            // 电路交换
            if (p < 0.18) {
              var g = p / 0.18;
              ctx.strokeStyle = LANES[0].c; ctx.lineWidth = 3; ctx.globalAlpha = .55;
              ctx.beginPath(); ctx.moveTo(xs[0], cy); ctx.lineTo(pos(g * 3), cy); ctx.stroke();
              ctx.globalAlpha = 1;
              ctx.fillStyle = "rgba(53,229,212,.9)"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
              ctx.fillText("建立独占通路…", (xs[0] + xs[3]) / 2, cy - 20);
            } else if (p < 0.86) {
              ctx.strokeStyle = LANES[0].c; ctx.lineWidth = 3; ctx.globalAlpha = .3;
              ctx.beginPath(); ctx.moveTo(xs[0], cy); ctx.lineTo(xs[3], cy); ctx.stroke();
              ctx.globalAlpha = 1;
              var flow = (p - 0.18) / 0.68;
              for (var i = 0; i < 7; i++) {
                var u = flow * 3.7 - i * 0.42;
                unit(u, LANES[0].c, 22);
              }
            } else {
              ctx.fillStyle = tone("muted", .8); ctx.font = "10px sans-serif"; ctx.textAlign = "center";
              ctx.fillText("释放线路", (xs[0] + xs[3]) / 2, cy - 20);
            }
          } else if (li === 1) {
            // 报文交换
            var u1 = p < 0.3 ? (p / 0.3) : p < 0.36 ? 1 : p < 0.62 ? 1 + (p - 0.36) / 0.26 : p < 0.68 ? 2 : p < 0.94 ? 2 + (p - 0.68) / 0.26 : 3;
            var bigW = 54;
            var xb = pos(u1);
            ctx.fillStyle = LANES[1].c; ctx.globalAlpha = .9;
            rr(ctx, xb - bigW / 2, cy - 11, bigW, 22, 6); ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = "#0a0e17"; ctx.font = "600 9.5px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("整个报文", xb, cy + 0.5); ctx.textBaseline = "alphabetic";
            if ((p > 0.3 && p < 0.36) || (p > 0.62 && p < 0.68)) {
              ctx.fillStyle = "rgba(255,180,84,.85)"; ctx.font = "10px sans-serif";
              ctx.fillText("等待收完…", xb, cy - 22);
            }
          } else {
            // 分组交换
            for (var j = 0; j < 7; j++) {
              var st = j * 0.075;
              var u2 = (p - st) / 0.42 * 3;
              unit(u2, LANES[2].c, 17, 0.95);
            }
          }
        }
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "left";
      }
    });
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
    id: "s1", num: 1, title: "网络入门与分层模型", short: "网络入门",
    icon: "layers", accent: "var(--c-cyan)", difficulty: 1, duration: "1 周", level: "★☆☆☆☆",
    tagline: "整个网络学习路径的地基。不追求「会用」，而追求「看懂」——看懂网络为什么要这么设计，看懂后面所有协议应该挂在哪一层。",
    tags: ["OSI 七层", "TCP/IP", "封装", "时延"],
    lead: "这一阶段解决的是最基础的一层：**大家约定好怎么说话**。你会弄清网络为什么必须分层、OSI 与 TCP/IP 怎么对应、数据在每一层被套上什么外壳，以及怎么用数字量化一条链路的好坏。",
    sections: [
      {
        id: "s1-1", title: "网络是什么：边缘、核心与三种交换", icon: "globe",
        blocks: [
          { t: "p", x: "**计算机网络**是把地理位置不同、具有独立功能的多台设备，通过通信线路连接起来，在协议的管理协调下实现资源共享与信息传递的系统。其中两个关键词是：`通信线路`（物理连接）与 `通信协议`（说话规矩）——**没有协议，连线等于没连**。" },
          { t: "table", head: ["组成", "说明", "例子"], rows: [["硬件", "负责「传」", "网卡、交换机、路由器、网线、光纤"], ["软件", "负责「管」", "操作系统网络栈、协议实现、网络管理软件"], ["协议", "负责「约」", "TCP/IP、HTTP、以太网协议"]] },
          { t: "p", x: "整个互联网可以切成两半：**网络边缘（Edge）** 是所有接入网络的终端设备，真正产生和消费数据；**网络核心（Core）** 是由路由器互联组成的骨干网络，++它不关心你传的是图片还是文字，只负责把数据从一头搬到另一头++。" },
          { t: "callout", kind: "tip", title: "主机 ≠ 服务器", x: "「主机（Host）」指网络中能收发数据的终端设备。你的手机、笔记本都是主机——它只是一个**角色**，不是某类设备。" },
          { t: "p", x: "网络核心到底怎么转发数据？历史上出现过三种方案，最终**分组交换**胜出：" },
          { t: "table", head: ["对比项", "电路交换", "报文交换", "分组交换"], rows: [["是否需建立连接", "需要", "不需要", "不需要"], ["资源占用", "独占", "共享", "共享"], ["时延特性", "固定、小", "大", "小但波动（有排队）"], ["线路利用率", "低", "中", "高"], ["典型场景", "传统电话网", "早期电报", "互联网"]] },
          { t: "viz", id: "s1-switching", icon: "shuffle", title: "三种交换方式对比", sub: "同一份数据，三种命运", tag: "Animation", note: "**电路交换**先建立独占通路再传输，资源利用率低；**报文交换**整块存储转发，时延大；**分组交换**把数据切成小分组独立转发，多用户共享链路（统计复用），这是互联网的基础。" }
        ]
      },
      {
        id: "s1-2", title: "为什么必须分层", icon: "layers3",
        blocks: [
          { t: "p", x: "理解分层最直观的方式是**寄快递**：你写好纸条（应用层）→ 用气泡膜包好（表示层）→ 约好上门时间（会话层）→ 选保价签收（传输层）→ 快递公司规划路线（网络层）→ 中转站贴分拣标签（数据链路层）→ 卡车在高速上跑（物理层）。" },
          { t: "p", x: "关键在于：**每一层只关心自己的事，不需要知道别的层怎么干**。你不需要知道卡车走哪条高速，快递公司不需要知道你寄的是杯子还是书，中转站只认标签不认内容。" },
          { t: "callout", kind: "key", title: "分层的全部精髓", x: "把复杂问题拆成若干个独立的小问题，每层只解决一个。带来的四个好处：**降低复杂度、标准化（不同厂商可互通）、易于更新、便于排障**。" },
          { t: "p", x: "分层有两条**铁律**，最容易理解错，务必记牢：" },
          { t: "ul", items: ["**铁律一（对等通信）**：不同设备的**同一层**之间，按照同一套协议进行**逻辑通信**。", "**铁律二（层间接口）**：同一设备内部，相邻层之间通过**接口**交互，上层只能调用直接下层的服务，**不能越层**。"] },
          { t: "callout", kind: "warn", title: "你的 HTTP 层绝不会直接跟服务器的 TCP 层说话", x: "看起来像「你的 HTTP 直接跟服务器 HTTP 通信」，但实际数据必须先一层层往下走，穿过物理介质，再一层层往上去。**协议是水平的（跨机器），接口是垂直的（同一台机器内）。**" },
          { t: "table", head: ["概念", "面向", "说明"], rows: [["**协议**", "水平（对等层之间）", "本层内部如何实现自己的功能"], ["**服务**", "垂直（下层向上层）", "下层为上层提供的能力，只有功能描述，不暴露实现"], ["**接口**", "垂直（相邻层之间）", "上层访问下层服务的入口"]] },
          { t: "p", x: "一个完整的协议必须包含**三要素**：**语法**（话怎么说——数据与控制信息的结构格式）、**语义**（话是什么意思——收到请求该回什么）、**时序**（什么时候说——先握手再传数据）。TCP 三次握手同时体现了这三者。" }
        ]
      },
      {
        id: "s1-3", title: "OSI 七层与 TCP/IP 四层", icon: "grid",
        blocks: [
          { t: "p", x: "1984 年 **ISO**（国际标准化组织）发布 **OSI 参考模型**，试图给全世界一套统一的网络体系标准。注意：**OSI 是「先有模型，后设计协议」**——理论指导实践；而真正统治互联网的 TCP/IP 是「先有协议，后总结模型」。" },
          { t: "callout", kind: "info", title: "别把 OSI 写成「ISO 七层模型」", x: "**ISO** 是制定标准的机构，**OSI** 是它发布的那套模型本身。这是常见笔误。" },
          { t: "viz", id: "s1-osi", icon: "layers", title: "OSI 七层 · 交互式解剖", sub: "点击任意一层，查看职责 / 协议 / 设备 / 类比", tag: "Interactive", note: "右边一列是 **TCP/IP 四层模型**，注意它把 OSI 的**应用层 + 表示层 + 会话层**合并成了应用层，把**数据链路层 + 物理层**合并成了网络接口层。**学网络时用五层模型最方便，理解架构时用 OSI，看实际协议时用 TCP/IP 四层。**" },
          { t: "table", head: ["OSI", "TCP/IP"], rows: [["应用层 + 表示层 + 会话层", "**应用层**"], ["传输层", "**传输层**"], ["网络层", "**网络层（网际层）**"], ["数据链路层 + 物理层", "**网络接口层**"]] },
          { t: "callout", kind: "key", title: "七层不是平等的：1-4 层 vs 5-7 层", x: "**低四层（物理/链路/网络/传输）** 关注数据传输——怎么把数据可靠地从 A 搬到 B，面向网络工程师；**高三层（会话/表示/应用）** 关注数据处理与服务，面向应用开发者。**记住这个分界，你就明白「四层负载均衡和七层负载均衡有什么区别」——前者只看 IP 和端口，后者能看懂 HTTP 内容。**" },
          { t: "table", head: ["对比项", "OSI", "TCP/IP"], rows: [["出现顺序", "先有模型，后有协议", "先有协议，后总结模型"], ["实用性", "理论完美，实现复杂", "实用优先，先跑起来再说"], ["会话/表示层", "独立成层，现实中无人实现", "合并进应用层，务实"], ["现状", "学习用的参考模型", "事实上的工业标准"]] }
        ]
      },
      {
        id: "s1-4", title: "数据封装与解封装（本阶段最核心）", icon: "box",
        blocks: [
          { t: "p", x: "如果说前面是「静态的层次图」，那么封装就是「动态的过程图」。**这一节理解了，后面学 HTTP、TCP、IP 会轻松十倍。** 核心规则只有一句：++数据每往下走一层，就在前面「套」一个该层的首部。++" },
          { t: "table", head: ["层次", "PDU 名称", "中文", "加什么"], rows: [["应用层", "Message", "报文", "—"], ["传输层（TCP）", "Segment", "段", "TCP 首部（端口、序号、标志位）"], ["网络层", "Packet", "分组 / 包", "IP 首部（源/目的 IP、TTL、协议号）"], ["数据链路层", "Frame", "帧", "帧头 + 帧尾（MAC、类型、CRC）"], ["物理层", "Bit", "比特", "不加首部，转成信号"]] },
          { t: "viz", id: "s1-encap", icon: "box", title: "封装 → 传输 → 解封装 全过程", sub: "点「播放」看数据被一层层包起来，再一层层剥开", tag: "Step Player", note: "发送方**封装**：每往下一层就加一个首部；接收方**解封装**：每往上一层就剥掉一个首部。**只有数据链路层既加首部又加尾部**（帧尾的 FCS 用于差错校验）。" },
          { t: "callout", kind: "warn", title: "封装是有代价的", x: "TCP 首部 20 字节 + IP 首部 20 字节 = **至少 40 字节**开销。以太网 MTU 是 1500 字节，所以每个包最多能装 **1460 字节**纯数据——这就是 **MSS**。`MSS = MTU − IP 首部 − TCP 首部 = 1500 − 20 − 20 = 1460`。**MTU 是链路层的限制，MSS 是传输层的限制。**" }
        ]
      },
      {
        id: "s1-5", title: "网络性能指标", icon: "activity",
        blocks: [
          { t: "p", x: "**速率（数据率 / 比特率）** 指每秒能传送多少比特，单位 `b/s`、`Mb/s`，换算用 **10 的幂**（1 Mb/s = 10⁶ b/s）。**带宽** 指网络设备支持的最高数据传输速率，是**理论最大值**，不是实际速度。" },
          { t: "callout", kind: "danger", title: "一个必须搞清的坑：bit 与 Byte", x: "**速率用 bit**（100 Mbps = 100 兆比特每秒），**存储用 Byte**（1 Byte = 8 bit）。所以 100 Mbps 宽带的**理论最大下载速度 = 100 ÷ 8 = 12.5 MB/s**。这就是为什么「100M 宽带」下载只有十几 MB/s——运营商说的是 bit，下载软件显示的是 Byte。" },
          { t: "p", x: "**吞吐量** 指单位时间内**实际通过**某个网络的数据量，**吞吐量 ≤ 带宽**。一句话区分：**带宽是「水管有多粗」，吞吐量是「实际流过去多少水」。**" },
          { t: "p", x: "**时延** 由四部分组成：**发送时延**（把所有比特推上链路的时间）、**传播时延**（电磁波跑完链路长度的时间）、**处理时延**（路由器处理分组）、**排队时延**（等待可用输出链路）。" },
          { t: "formula", label: "发送时延", x: "发送时延 = 数据长度 ÷ 信道带宽" },
          { t: "formula", label: "传播时延", x: "传播时延 = 链路长度 ÷ 电磁波传播速度" },
          { t: "formula", label: "时延带宽积（链路「管道容量」，单位 bit）", x: "时延带宽积 = 传播时延 × 带宽" },
          { t: "viz", id: "s1-delay", icon: "clock", title: "时延四要素 · 实时计算器", sub: "拖动滑块，观察发送时延与传播时延谁占主导", tag: "Calculator", note: "课本例题：链路长 1000 km、带宽 100 Mb/s、传播速度 2×10⁸ m/s，发一个 1000 Byte 的包 —— 发送时延只有 **0.08 ms**，传播时延却高达 **5 ms**。**在这个场景下传播时延占绝对主导**，这解释了为什么跨国访问的性能瓶颈往往是距离而不是带宽。" },
          { t: "callout", kind: "warn", title: "利用率越高，时延越大", x: "当利用率接近 100% 时，时延会**急剧上升**——这就是**网络拥塞**。所以网络设计不能追求「把带宽用满」，一般建议核心链路利用率控制在 70% 以下。" }
        ]
      },
      { id: "s1-terms", title: "术语速查表", icon: "list", blocks: [{ t: "terms", items: [
        { t: "端系统 / 主机", en: "End System / Host", d: "网络中能收发数据的终端设备，如 PC、手机、服务器" },
        { t: "协议", en: "Protocol", d: "通信双方必须遵守的规则集合，含语法、语义、时序三要素" },
        { t: "协议栈", en: "Protocol Stack", d: "按层次组织的一整套协议" },
        { t: "封装 / 解封装", en: "Encapsulation", d: "数据下行逐层加首部 / 上行逐层剥首部" },
        { t: "PDU", en: "Protocol Data Unit", d: "每层对其处理的数据块的称呼（比特/帧/包/段/报文）" },
        { t: "首部 / 尾部", en: "Header / Trailer", d: "加在数据前 / 后的控制信息，尾部主要用于校验" },
        { t: "MTU", en: "Maximum Transmission Unit", d: "链路层单个帧能承载的最大数据长度，以太网默认 1500 字节" },
        { t: "MSS", en: "Maximum Segment Size", d: "TCP 单个段能携带的最大数据量，以太网典型值 1460 字节" },
        { t: "分组交换", en: "Packet Switching", d: "把数据切成小分组独立转发，互联网的基础" },
        { t: "统计复用", en: "Statistical Multiplexing", d: "多用户按需共享链路资源，提高利用率" },
        { t: "RTT", en: "Round-Trip Time", d: "往返时延，从发出到收到确认的总时间" },
        { t: "时延带宽积", en: "Bandwidth-Delay Product", d: "传播时延 × 带宽，表示链路「管道容量」（bit）" }
      ] }] },
      { id: "s1-pit", title: "六个常见误区", icon: "alert", blocks: [{ t: "pitfalls", items: [
        { t: "带宽越大网速越快", x: "**部分错误。** 带宽只影响**发送时延**。若瓶颈在传播时延或服务器响应，加大带宽毫无用处。" },
        { t: "OSI 七层是实际使用的模型", x: "**错误。** OSI 是理论参考模型，现实中真正跑的是 TCP/IP。" },
        { t: "交换机是网络层设备", x: "**错误。** 普通二层交换机工作在**数据链路层**，只看 MAC。**三层交换机**才是网络层设备。" },
        { t: "应用层就是应用程序", x: "**错误。** 应用层是**协议**的集合（HTTP、DNS），Chrome 是应用程序，HTTP 才是应用层协议。" },
        { t: "100M 宽带下载速度就是 100MB/s", x: "**错误。** 100 Mbps = 100 ÷ 8 = **12.5 MB/s**，bit 和 Byte 差了 8 倍。" },
        { t: "发送时延和传播时延是一回事", x: "**错误。** 发送时延看**数据量和带宽**；传播时延看**距离和光速**，两者物理机制完全不同。" }
      ] }] },
      { id: "s1-quiz", title: "自测练习", icon: "target", blocks: [{ t: "quiz", stage: "s1", items: [
        { q: "100 Mbps 的宽带，理论最大下载速度约是多少？", o: ["100 MB/s", "12.5 MB/s", "10 MB/s", "8 MB/s"], a: 1, e: "速率用 bit、存储用 Byte，1 Byte = 8 bit。100 Mbps ÷ 8 = **12.5 MB/s**。" },
        { q: "下面哪一项**不是**分组交换的优点？", o: ["多用户可共享链路", "链路故障可绕路", "时延固定且小", "不必等整个报文到达"], a: 2, e: "时延固定且小是**电路交换**的优点。分组交换的时延小但会波动（有排队时延）。" },
        { q: "数据链路层的 PDU 叫什么？", o: ["报文 Message", "段 Segment", "包 Packet", "帧 Frame"], a: 3, e: "应用层=报文，传输层=段/用户数据报，网络层=包，**数据链路层=帧**，物理层=比特。" },
        { q: "关于「对等通信」和「层间接口」，说法正确的是？", o: ["本机 HTTP 层可直接与对端 TCP 层通信", "协议是垂直的，接口是水平的", "不同设备的同一层按同一协议进行逻辑通信", "上层可以越过直接下层调用更底层的服务"], a: 2, e: "**协议是水平的**（跨机器，对等层之间），**接口是垂直的**（同一台机器内，相邻层之间）。上层不能越层。" },
        { q: "一条链路长 1000 km、带宽 100 Mb/s、传播速度 2×10⁸ m/s，发送一个 1000 Byte 的包，总时延约为？", o: ["约 0.08 ms", "约 5.08 ms", "约 5.00 ms", "约 0.5 ms"], a: 1, e: "发送时延 = 8000 bit ÷ 10⁸ b/s = 0.08 ms；传播时延 = 10⁶ m ÷ 2×10⁸ m/s = 5 ms；合计 ≈ **5.08 ms**。" }
      ] }] }
    ]
  });

})();
