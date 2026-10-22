/* ============================================================
   阶段三 · 网络层与 IP 编址
   ============================================================ */
(function () {
  "use strict";
  var PF = window.PF;
  var tone = PF.tone;   /* 主题感知的 Canvas 文本色 */
  var TC = PF.C;      /* 主题感知的强调色 */

  /* ---------- IP 工具 ---------- */
  function ip2int(a, b, c, d) { return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0; }
  function int2ip(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join("."); }
  function maskOf(p) { return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0; }
  function bin(n, p) { return (n >>> 0).toString(2).padStart(32, "0"); }

  /* ============ 可视化 1：子网划分计算器 ============ */
  PF.VIZ["s3-subnet"] = function (stage) {
    stage.innerHTML =
      '<div class="sub-row">' +
      '<span class="sub-lbl">IP 地址</span>' +
      '<div class="sub-ip">' + [0, 1, 2, 3].map(function (i) {
        return '<input type="number" min="0" max="255" value="' + [192, 168, 1, 10][i] + '" id="oc' + i + '">' +
          (i < 3 ? '<i>.</i>' : "");
      }).join("") + "</div>" +
      '<span class="sub-lbl" style="margin-left:8px">前缀</span>' +
      '<input type="range" id="pfx" min="8" max="30" value="24" style="max-width:180px">' +
      '<b class="mono" id="pfxV" style="color:var(--c-cyan)">/24</b>' +
      "</div>" +
      '<div class="bit-grid" id="bitGrid"></div>' +
      '<div class="bit-legend"><span><i style="background:var(--c-cyan)"></i>网络位（固定）</span><span><i style="background:var(--c-amber)"></i>主机位（可变）</span><span><i style="background:var(--c-violet)"></i>该字节被切分</span></div>' +
      '<div class="readout" id="subOut" style="margin-top:16px"></div>' +
      '<div class="block-ruler" id="blockRuler"></div>' +
      '<div class="viz-note" style="border:1px solid var(--line);border-radius:11px;margin-top:16px">' +
      "💡 <b>块大小法（心算神器）</b>：块大小 = 256 − 掩码最后一个非 255 字节的值。网络地址 = 不超过该 IP 的、块大小的最大整数倍；广播地址 = 网络地址 + 块大小 − 1。</div>";

    function read() {
      var o = [0, 1, 2, 3].map(function (i) { return PF.clamp(+PF.$("#oc" + i).value || 0, 0, 255); });
      var p = +PF.$("#pfx").value;
      return { ip: ip2int(o[0], o[1], o[2], o[3]), p: p, oct: o };
    }
    function render() {
      var s = read();
      PF.$("#pfxV").textContent = "/" + s.p;
      var m = maskOf(s.p), net = (s.ip & m) >>> 0, bcast = (net | (~m >>> 0)) >>> 0;
      var hostBits = 32 - s.p, hosts = Math.max(0, Math.pow(2, hostBits) - 2);
      // 位图
      var bits = bin(s.ip, s.p);
      var html = "";
      for (var i = 0; i < 32; i++) {
        var isNet = i < s.p;
        var split = (s.p % 8 !== 0) && Math.floor(i / 8) === Math.floor(s.p / 8);
        html += '<span class="bit ' + (isNet ? "net" : "host") + (split ? " split" : "") + '">' + bits[i] + "</span>";
        if (i % 8 === 7 && i < 31) html += '<i class="bit-dot">.</i>';
      }
      PF.$("#bitGrid").innerHTML = html;
      var maskStr = [maskOf(s.p) >>> 24, (maskOf(s.p) >>> 16) & 255, (maskOf(s.p) >>> 8) & 255, maskOf(s.p) & 255].join(".");
      PF.$("#subOut").innerHTML =
        ro("子网掩码", maskStr) +
        ro("网络地址", int2ip(net), "v") +
        ro("广播地址", int2ip(bcast), "a") +
        ro("可用主机范围", hosts > 0 ? int2ip(net + 1) + " ～ " + int2ip(bcast - 1) : "—", "g") +
        ro("可用主机数", hosts > 0 ? hosts.toLocaleString() + " 台" : "0 台") +
        ro("块大小", (s.p <= 24 ? Math.pow(2, 8 - (s.p % 8 || 8)) : Math.pow(2, 32 - s.p)) + "（第 " + Math.min(4, Math.ceil(s.p / 8) || 1) + " 字节）", "p");
      // 块标尺
      var lastOct = s.oct[3];
      var bs = 256 - (maskOf(s.p) & 255);
      if (s.p < 24) bs = 256;
      var marks = "";
      var n = Math.min(16, Math.round(256 / bs));
      for (var k = 0; k <= n && k * bs <= 255; k++) marks += '<span style="left:' + (k * bs / 255 * 100) + '%">' + (k * bs) + "</span>";
      var start = Math.floor(lastOct / bs) * bs;
      PF.$("#blockRuler").innerHTML =
        '<div class="br-head"><span>块大小标尺（第 4 字节 0～255）</span><b>本 IP 落在 ' + start + " ～ " + (start + bs - 1) + "</b></div>" +
        '<div class="br-track"><i style="left:' + (start / 255 * 100) + "%;width:" + ((bs - 1) / 255 * 100) + '%"></i>' + marks + "</div>";
    }
    function ro(l, v, k) { return '<div class="ro ' + (k || "") + '"><span>' + l + "</span><b>" + v + "</b></div>"; }
    [0, 1, 2, 3].forEach(function (i) {
      PF.$("#oc" + i).addEventListener("input", render);
    });
    PF.$("#pfx").addEventListener("input", render);
    render();
  };

  /* ============ 可视化 2：traceroute 逐跳 ============ */
  PF.VIZ["s3-traceroute"] = function (stage) {
    var HOPS = [
      { n: "本机网关", ip: "192.168.1.1" },
      { n: "城域网出口", ip: "10.20.3.1" },
      { n: "省级骨干", ip: "202.97.12.1" },
      { n: "国家级骨干", ip: "202.97.50.9" },
      { n: "目标服务器", ip: "110.242.68.66" }
    ];
    var cv = document.createElement("canvas");
    cv.className = "viz-canvas";
    stage.appendChild(cv);
    var cap = document.createElement("div");
    cap.className = "arp-cap";
    stage.appendChild(cap);
    var D = 5400;

    var scene = PF.Scene(cv, {
      height: 250,
      draw: function (s, t) {
        var ctx = s.ctx, W = s.W, H = s.H;
        ctx.clearRect(0, 0, W, H);
        var n = HOPS.length;
        var padL = 54, padR = 54, y = H * .56;
        var gap = (W - padL - padR) / (n - 1);
        var xs = HOPS.map(function (h, i) { return padL + gap * i; });
        var p = (t % D) / D;
        var round = Math.min(n - 1, Math.floor(p * n));
        var rp = (p * n) % 1;
        ctx.strokeStyle = tone("line", .22); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(xs[0], y); ctx.lineTo(xs[n - 1], y); ctx.stroke();
        HOPS.forEach(function (h, i) {
          var isLast = i === n - 1;
          var reached = i <= round;
          ctx.beginPath(); ctx.arc(xs[i], y, isLast ? 17 : 13, 0, 6.2832);
          ctx.fillStyle = reached ? (isLast ? "rgba(87,224,138,.2)" : "rgba(53,229,212,.16)") : tone("grid", .09);
          ctx.fill();
          ctx.strokeStyle = reached ? (isLast ? TC("#57e08a") : TC("#35e5d4")) : tone("line", .35);
          ctx.lineWidth = 1.6; ctx.stroke();
          ctx.fillStyle = reached ? tone("ink") : tone("muted", .8);
          ctx.font = "600 11px sans-serif"; ctx.textAlign = "center";
          ctx.fillText("R" + i, xs[i], y + 4);
          ctx.fillStyle = tone("muted", .9); ctx.font = "9.5px monospace";
          ctx.fillText(h.ip, xs[i], y + 34);
          ctx.fillStyle = tone("muted", .85); ctx.font = "10px sans-serif";
          ctx.fillText(h.n, xs[i], y - 28);
        });
        var from = xs[0], to = xs[round];
        if (rp < .5) {
          var q = rp / .5;
          var x = PF.lerp(from, to, q);
          dot(ctx, x, y, TC("#35e5d4"), "TTL=" + (round + 1));
        } else {
          var q2 = (rp - .5) / .5;
          var x2 = PF.lerp(to, from, q2);
          if (round < n - 1) dot(ctx, x2, y, TC("#ffb454"), "ICMP 超时");
          else dot(ctx, x2, y, TC("#57e08a"), "回显应答");
        }
        PF.dom(cap, PF.md(round < n - 1
          ? '<span class="chip a">第 ' + (round + 1) + ' 轮</span><span>发出 TTL = <b>' + (round + 1) + "</b> 的包 → 到第 " + (round + 1) + " 跳时 TTL 减到 0 → 该路由器丢弃并回 **ICMP Type 11（超时）**，于是我们「骗」出了它的 IP：<b>" + HOPS[round].ip + "</b>。</span>"
          : '<span class="chip g">到达</span><span>TTL 足够大，包抵达 <b>' + HOPS[n - 1].ip + "</b>。目标返回 **端口不可达（Type 3 Code 3）** 或回显应答，traceroute 结束。**注意：显示 `* * *` 不一定故障——有些设备就是不响应 ICMP。**</span>"));
        if (player) player.sync();
      }
    });
    var player = PF.player({
      scene: scene, after: stage, count: HOPS.length, D: D, mode: "cycle",
      labels: HOPS.map(function (h) { return h.n; })
    });
    function dot(ctx, x, y, c, label) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = .25; ctx.beginPath(); ctx.arc(x, y, 12, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = c; ctx.font = "600 10.5px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(label, x, y - 16);
    }
  };

  /* ============ 可视化 3：NAT / PAT 端口映射 ============ */
  PF.VIZ["s3-nat"] = function (stage) {
    var cv = document.createElement("canvas");
    cv.className = "viz-canvas";
    stage.appendChild(cv);
    var side = document.createElement("div");
    side.className = "sw-side";
    side.innerHTML = '<div class="sw-title">NAT 转换表（路由器）</div><div class="sw-table" id="natTable"></div>' +
      '<div class="sw-note" id="natNote"></div>';
    stage.appendChild(side);
    var table = PF.$("#natTable", side), note = PF.$("#natNote", side);

    var HOSTS = [
      { ip: "192.168.1.10", port: 3000, x: .08, y: .26 },
      { ip: "192.168.1.11", port: 3000, x: .08, y: .5 },
      { ip: "192.168.1.12", port: 3000, x: .08, y: .74 }
    ];
    var PUB = "203.0.113.8";
    var SERVER = "110.242.68.66";
    var D = 8000;

    var scene = PF.Scene(cv, {
      height: 300,
      draw: function (s, t) {
        var ctx = s.ctx, W = s.W, H = s.H;
        ctx.clearRect(0, 0, W, H);
        var rx = W * .48, ry = H * .5;
        var sx = W * .90;
        // 内网区域
        ctx.fillStyle = "rgba(77,141,255,.05)";
        rr(ctx, 6, 12, W * .36, H - 24, 12); ctx.fill();
        ctx.fillStyle = tone("muted", .8); ctx.font = "10px sans-serif"; ctx.textAlign = "left";
        ctx.fillText("内网（私有地址）", 16, 28);
        // 公网区域
        ctx.fillStyle = "rgba(255,180,84,.05)";
        rr(ctx, W * .62, 12, W * .36, H - 24, 12); ctx.fill();
        ctx.fillStyle = tone("muted", .8);
        ctx.fillText("公网", W * .64, 28);
        // 主机
        HOSTS.forEach(function (h, i) {
          var x = h.x * W, y = h.y * H;
          ctx.beginPath(); ctx.arc(x, y, 17, 0, 6.2832);
          ctx.fillStyle = "rgba(77,141,255,.16)"; ctx.fill();
          ctx.strokeStyle = TC("#4d8dff"); ctx.lineWidth = 1.4; ctx.stroke();
          ctx.fillStyle = tone("ink"); ctx.font = "600 10.5px monospace"; ctx.textAlign = "center";
          ctx.fillText(h.ip.split(".").slice(2).join("."), x, y + 3.5);
          ctx.fillStyle = tone("muted", .9); ctx.font = "9px monospace";
          ctx.fillText(":" + h.port, x, y + 30);
          ctx.strokeStyle = tone("line", .2); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(x + 17, y); ctx.lineTo(rx - 34, ry); ctx.stroke();
        });
        // 路由器
        ctx.fillStyle = "rgba(53,229,212,.1)"; ctx.strokeStyle = "rgba(53,229,212,.5)"; ctx.lineWidth = 1.6;
        rr(ctx, rx - 34, ry - 34, 68, 68, 14); ctx.fill(); ctx.stroke();
        ctx.fillStyle = TC("#35e5d4"); ctx.font = "600 11px 'Chakra Petch',sans-serif"; ctx.textAlign = "center";
        ctx.fillText("NAT", rx, ry - 4); ctx.fillText("路由器", rx, ry + 12);
        // 服务器
        var sy = ry;
        ctx.beginPath(); ctx.arc(sx, sy, 19, 0, 6.2832);
        ctx.fillStyle = "rgba(255,180,84,.16)"; ctx.fill();
        ctx.strokeStyle = TC("#ffb454"); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = tone("ink"); ctx.font = "600 10px monospace"; ctx.textAlign = "center";
        ctx.fillText("服务器", sx, sy + 3.5);
        ctx.fillStyle = tone("muted", .9); ctx.font = "9px monospace";
        ctx.fillText(SERVER, sx, sy + 32);
        ctx.strokeStyle = tone("line", .2); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(rx + 34, ry); ctx.lineTo(sx - 19, sy); ctx.stroke();

        var p = (t % D) / D;
        var idx = Math.min(2, Math.floor(p * 3));
        var lp = (p * 3) % 1;
        var h = HOSTS[idx];
        var hx = h.x * W, hy = h.y * H;
        if (lp < .4) {
          var q = lp / .4;
          packet(ctx, PF.lerp(hx + 17, rx - 34, q), PF.lerp(hy, ry, q), TC("#4d8dff"), h.ip + ":" + h.port);
        } else if (lp < .6) {
          packet(ctx, rx, ry - 48, TC("#9b8cff"), "改写源地址 →", .9);
        } else {
          var q2 = (lp - .6) / .4;
          var outPort = 50000 + idx;
          packet(ctx, PF.lerp(rx + 34, sx - 19, q2), PF.lerp(ry, sy, q2), TC("#57e08a"), PUB + ":" + outPort);
        }
        var rows = "";
        for (var i = 0; i <= idx; i++) {
          rows += '<div class="mtab-row' + (i === idx ? " new" : "") + '"><b>' + HOSTS[i].ip + ":" + HOSTS[i].port +
            "</b><span>→ " + PUB + ":" + (50000 + i) + "</span></div>";
        }
        PF.dom(table, rows);
        PF.dom(note, PF.md('<span class="chip solid">PAT</span><span>三台内网主机都从 3000 端口发起，路由器把源地址统一改写为公网 IP <b>' + PUB + "</b>，并用**不同的源端口**（50000 / 50001 / 50002）区分不同连接。这就是 **NAPT（多对一）**——最常用的 NAT 形式。</span>"));
        if (player) player.sync();
      }
    });
    var player = PF.player({
      scene: scene, after: stage, count: HOSTS.length, D: D, mode: "cycle",
      labels: HOSTS.map(function (h) { return h.ip + " 建连"; })
    });
    function packet(ctx, x, y, c, label) {
      ctx.fillStyle = c; rr(ctx, x - 52, y - 11, 104, 22, 7); ctx.fill();
      ctx.fillStyle = "#06121a"; ctx.font = "600 9px monospace"; ctx.textAlign = "center";
      ctx.fillText(label, x, y + 3.5);
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
    id: "s3", num: 3, title: "网络层与 IP 编址", short: "网络层与 IP",
    icon: "route", accent: "var(--c-violet)", difficulty: 3, duration: "2 周", level: "★★★☆☆",
    tagline: "整个学习路径的重点和难点。IP 地址怎么算、子网怎么划、路由表怎么查——这一阶段把「数据包怎么一跳跳走出去」彻底讲透。",
    tags: ["子网划分", "CIDR", "路由表", "NAT", "ICMP", "IPv6"],
    lead: "数据链路层只能解决「同一条链路上」的通信，一旦跨越网段就无能为力。**网络层的使命是「跨网络」**——用逻辑地址标识每一台机器，用路由算法决定走哪条路。这一阶段的公式最多，也最值得动手算。",
    sections: [
      {
        id: "s3-1", title: "网络层的三大职责", icon: "route",
        blocks: [
          { t: "p", x: "数据链路层用 MAC 地址在同一链路内找邻居，但 MAC 地址**没有层次结构、无法聚合**——如果全世界的交换机都要记住所有 MAC，路由表会爆炸。所以需要**网络层**：用**有层次的逻辑地址（IP）** 把设备组织成网络，再在**网络之间**做转发。" },
          { t: "table", head: ["职责", "做什么", "关键点"], rows: [["**逻辑寻址**", "分配 IP 地址", "IP 是**逻辑的、可变的**，和硬件无关"], ["**路由选择**", "为数据包选择路径", "由路由协议（RIP / OSPF / BGP）完成"], ["**分组转发**", "把数据包从入接口转到出接口", "查路由表，逐跳转发"], ["**分片与重组**", "数据包超过链路 MTU 时切分", "IPv4 路由器可分片，IPv6 只由源主机分片"], ["**差错与控制**", "ICMP 报告错误与探测", "ping、traceroute 的基础"]] },
          { t: "p", x: "**网络层协议全景**：**IP**（核心，负责寻址与转发）、**ICMP**（差错与控制报文，ping / traceroute 靠它）、**IGMP**（组播管理）、**ARP**（把 IP 解析成 MAC，常被归为「第 2.5 层」）、**路由协议**（RIP / OSPF / BGP）。" },
          { t: "callout", kind: "key", title: "一句话记住网络层的定位", x: "**数据链路层负责「这一跳」，网络层负责「全程」。** IP 地址全程不变，MAC 地址每一跳都重写。" }
        ]
      },
      {
        id: "s3-2", title: "IPv4 地址基础", icon: "hash",
        blocks: [
          { t: "p", x: "**IPv4 地址是 32 位二进制**，写成点分十进制（4 组 0～255）。注意一个常被忽略的事实：**IP 地址是分配给「网络接口」的，不是分配给设备的**——一台路由器有多个接口就有多个 IP。" },
          { t: "table", head: ["类别", "首位", "范围", "默认掩码", "可用主机数"], rows: [["**A 类**", "0", "1.0.0.0 ～ 126.255.255.255", "/8", "2²⁴ − 2 = 16,777,214"], ["**B 类**", "10", "128.0.0.0 ～ 191.255.255.255", "/16", "2¹⁶ − 2 = 65,534"], ["**C 类**", "110", "192.0.0.0 ～ 223.255.255.255", "/24", "2⁸ − 2 = 254"], ["**D 类**", "1110", "224.0.0.0 ～ 239.255.255.255", "—", "组播地址"], ["**E 类**", "1111", "240.0.0.0 ～ 255.255.255.255", "—", "保留实验"]] },
          { t: "callout", kind: "warn", title: "两个常见错误", x: "① **A 类可用范围是 1～126**，不是 0～127——`0.0.0.0/8` 与 `127.0.0.0/8` 被保留（后者是环回）。② **私有地址 172.16.0.0/12 只到 172.31.255.255**，172.32 以后是公网地址。" },
          { t: "table", head: ["私有地址段", "范围", "可用主机数"], rows: [["10.0.0.0/8", "10.0.0.0 ～ 10.255.255.255", "约 1677 万"], ["172.16.0.0/12", "172.16.0.0 ～ 172.31.255.255", "约 104 万"], ["192.168.0.0/16", "192.168.0.0 ～ 192.168.255.255", "约 6.5 万"]] },
          { t: "p", x: "**子网掩码** 是一串「网络位全 1、主机位全 0 且 1 连续」的 32 位数。**IP AND 掩码 = 网络地址**（主机位全部清零）。**网络地址**（主机位全 0）代表整个网段，**广播地址**（主机位全 1）代表全网段广播——**这两个地址都不能分配给主机**，所以可用主机数 = 2^主机位 − 2。" },
          { t: "formula", label: "可用主机数", x: "可用主机数 = 2^主机位数 − 2" },
          { t: "table", head: ["特殊地址", "含义"], rows: [["`0.0.0.0`", "本网络本主机（仅作源地址，DHCP 请求时用）"], ["`127.0.0.0/8`", "环回地址，`127.0.0.1` 测本机协议栈"], ["`169.254.0.0/16`", "**APIPA**，DHCP 失败时自动分配"], ["`255.255.255.255`", "受限广播地址（不出本网段）"], ["`0.0.0.0/0`", "默认路由，匹配任何目的地址"]] }
        ]
      },
      {
        id: "s3-3", title: "子网划分（重点中的重点）", icon: "scissors",
        blocks: [
          { t: "p", x: "子网划分的本质是**借位**：从主机位里「借」若干位当作子网位。借 n 位 → 子网数 2ⁿ；剩下的主机位 h 必须满足 `2^h − 2 ≥ 需求主机数`。**借得越多，子网越多，但每个子网的主机越少，且至少要留 2 位主机位（/30）。**" },
          { t: "p", x: "**五步法**：① 确定要划分的网段 ② 确定需要多少子网（算借几位）③ 算出新掩码 ④ 列出每个子网的网络地址 / 广播地址 / 可用范围 ⑤ 检查是否满足主机数需求。" },
          { t: "viz", id: "s3-subnet", icon: "scissors", title: "子网划分 · 实时计算器", sub: "改 IP 或拖动前缀，观察网络位与主机位如何切分", tag: "Calculator", note: "上半部分是 **32 位地址的位视图**——青色是网络位（固定），琥珀色是主机位（可变）。下半部分是**块大小标尺**，直接告诉你这个 IP 落在哪个块里、网络地址和广播地址分别是多少。" },
          { t: "callout", kind: "key", title: "块大小法：不用二进制也能算", x: "**块大小 = 2^(32 − 前缀长度) = 256 − 掩码最后一个非 255 字节的值**。举例：`/26` 的掩码是 255.255.255.192，块大小 = 256 − 192 = **64**。那么 `192.168.1.100/26` 落在 64 的倍数区间 `64 ～ 127` 里，**网络地址 = 192.168.1.64，广播地址 = 192.168.1.127**。" },
          { t: "table", head: ["前缀", "掩码末字节", "块大小", "可用主机数"], rows: [["/24", "0", "256", "254"], ["/25", "128", "128", "126"], ["/26", "192", "64", "62"], ["/27", "224", "32", "30"], ["/28", "240", "16", "14"], ["/29", "248", "8", "6"], ["/30", "252", "4", "2"]] },
          { t: "p", x: "**VLSM（可变长子网掩码）** 允许在同一网段内使用不同长度的掩码，按实际需求分配——这是工程主流。**CIDR（无类域间路由）** 则用 `/n` 表示前缀，取消 A/B/C 类的固定划分，并支持**路由聚合**（把多条连续路由合并成一条）。" }
        ]
      },
      {
        id: "s3-4", title: "IP 数据报与分片", icon: "box",
        blocks: [
          { t: "p", x: "**IPv4 首部固定 20 字节**（含选项最大 60 字节）。关键字段：**总长度**（最大 65535）、**标识（Identification）**、**标志（DF / MF）**、**片偏移（Fragment Offset）**、**TTL**、**协议号**、**首部校验和**。" },
          { t: "table", head: ["字段", "作用"], rows: [["**TTL**", "跳数上限，每经过一个路由器减 1，减到 0 就丢弃并回报 ICMP——**防止包在环路中无限转圈**"], ["**DF / MF**", "DF=1 禁止分片；MF=1 表示后面还有分片"], ["**片偏移**", "本片数据在原包中的位置，**单位是 8 字节**"], ["**协议号**", "1=ICMP、2=IGMP、6=TCP、17=UDP、89=OSPF"], ["**标识**", "同一数据报的所有分片共用同一个标识，用于重组"]] },
          { t: "formula", label: "分片规则", x: "每片数据上限 = MTU − 20（IP 首部），且必须为 8 的整数倍" },
          { t: "formula", label: "片偏移", x: "片偏移 = 该片起始字节 ÷ 8" },
          { t: "callout", kind: "tip", title: "MTU 不一致是经典疑难故障", x: "小包（ping）能通，大包不通、网页打不开——因为小包不需要分片，大包需要分片却被某台设备丢弃了。排查时用 `ping -l 1472 -f`（Windows）或 `ping -s 1472 -M do`（Linux）来测（1472 + 20 + 8 = 1500）。" }
        ]
      },
      {
        id: "s3-5", title: "路由原理与路由表", icon: "git-branch",
        blocks: [
          { t: "p", x: "路由器的核心工作是**逐跳转发**：收到包 → 提取目的 IP → 查路由表 → 找到匹配的表项 → 从对应出接口转发。路由表的关键字段：**目的网络 / 掩码、下一跳、出接口、度量值、优先级**。" },
          { t: "callout", kind: "key", title: "最长前缀匹配（Longest Prefix Match）", x: "当多条路由都能匹配同一个目的 IP 时，**选择前缀最长（最具体）的那一条**。比如目的 `192.168.1.100` 同时匹配 `/24`、`/26`、`0.0.0.0/0`，则选 `/26`。**这就是「越具体越优先」。**" },
          { t: "table", head: ["协议", "类型", "算法", "特点"], rows: [["**RIP**", "距离矢量", "贝尔曼-福特", "以跳数为度量，**最大 15 跳**，16 表示不可达；收敛慢；UDP 520"], ["**OSPF**", "链路状态", "Dijkstra 最短路径", "**广播链路状态建全网拓扑**；`Cost = 10⁸ ÷ 带宽`；Area 0 骨干；IP 协议号 89"], ["**BGP**", "路径矢量", "策略路由", "**AS 之间**的路由协议；TCP 179；互联网的「粘合剂」"]] },
          { t: "p", x: "**管理距离（AD，思科）/ 优先级（Preference，华为）** 表示路由的可信度，**越小越优**。常见取值：直连 0、静态 1（华为 60）、EBGP 20、OSPF 110（华为 10）、RIP 120（华为 100）。" },
          { t: "table", head: ["类型", "说明", "适用场景"], rows: [["**静态路由**", "管理员手工配置，不随拓扑变化", "小型网络、末梢网络"], ["**默认路由**", "`0.0.0.0/0`，匹配任何目的地址", "出口设备指向运营商"], ["**动态路由**", "协议自动学习，拓扑变化自动收敛", "中大型网络"]] }
        ]
      },
      {
        id: "s3-6", title: "NAT：让私有地址上网", icon: "exchange",
        blocks: [
          { t: "p", x: "私有地址不能在公网路由，那内网设备怎么上网？答案是 **NAT（网络地址转换）**——在边界设备上修改源 / 目的 IP 地址。" },
          { t: "table", head: ["类型", "映射关系", "说明"], rows: [["**静态 NAT**", "一对一", "一个内网 IP 永久映射一个公网 IP"], ["**动态 NAT**", "多对多", "从公网地址池里动态分配"], ["**PAT / NAPT**", "**多对一**", "**同时转换端口**，多台内网主机共享一个公网 IP——**最常用**"], ["**Easy IP**", "多对一", "直接借用出接口的 IP 做 NAT（华为叫法）"], ["**NAT Server**", "一对一（反向）", "把公网 IP 的某端口映射到内网服务器，供外部访问"]] },
          { t: "viz", id: "s3-nat", icon: "exchange", title: "PAT 端口映射 · 多对一", sub: "看三台内网主机如何共享一个公网 IP", tag: "Animation", note: "**NAT 的代价**：破坏了端到端通信（外网无法主动访问内网）、增加了转发开销、给 P2P 和 VoIP 带来麻烦。**但它极大延缓了 IPv4 地址枯竭。**" }
        ]
      },
      {
        id: "s3-7", title: "ICMP、ping 与 traceroute", icon: "target",
        blocks: [
          { t: "p", x: "**ICMP** 是网络层的辅助协议，用来传递**差错报告**和**控制信息**。它没有端口，直接封装在 IP 包里（协议号 1）。常见 Type / Code：" },
          { t: "table", head: ["Type", "名称", "用途"], rows: [["0 / 8", "回显应答 / 回显请求", "**ping 的基础**"], ["3", "目的不可达", "Code 3 = 端口不可达（traceroute 结束标志）；Code 4 = 需要分片但 DF 置位"], ["11", "超时", "**TTL 减到 0**——traceroute 靠它逐跳发现路径"], ["5", "重定向", "告诉主机「有更好的下一跳」"]] },
          { t: "viz", id: "s3-traceroute", icon: "target", title: "traceroute · TTL 逐跳探测", sub: "用一个「会爆炸的包」骗出每一跳的 IP", tag: "Animation", note: "**核心技巧**：先发 TTL=1 的包，第 1 跳路由器把 TTL 减到 0，丢弃并回 **ICMP 超时**，于是我们知道了第 1 跳的 IP；再发 TTL=2 …… 逐跳推进。**这就是 traceroute 的全部原理。**" },
          { t: "callout", kind: "warn", title: "关于 ICMP 与安全", x: "ICMP 常被用于**探测和扫描**，所以很多防火墙会限制 ICMP。但**完全禁掉 ICMP 会破坏 PMTUD（路径 MTU 发现）**，导致大包被静默丢弃——这是很多「网页打不开但能 ping 通」故障的根因。" }
        ]
      },
      {
        id: "s3-8", title: "IPv6：不只是地址变长", icon: "globe",
        blocks: [
          { t: "p", x: "IPv4 只有约 **43 亿**个地址，早已耗尽。**IPv6 是 128 位**，地址数量约 **3.4×10³⁸**。但 IPv6 的改进远不止「变长」：" },
          { t: "ul", items: ["**取消广播**，改用组播和任播", "**取消首部校验和**（交给上层），减轻路由器负担", "**路由器不再分片**，只由源主机分片（靠 PMTUD）", "**固定 40 字节首部**，用扩展首部实现可选功能", "**原生支持地址自动配置（SLAAC）** 和 **IPSec**"] },
          { t: "table", head: ["类型", "前缀", "说明"], rows: [["**GUA** 全球单播", "2000::/3", "全球可路由的公网地址"], ["**LLA** 链路本地", "FE80::/10", "同一链路上自动生成，不可路由"], ["**ULA** 唯一本地", "FC00::/7", "类似 IPv4 私有地址"], ["**组播**", "FF00::/8", "替代 IPv4 的广播"]] },
          { t: "p", x: "**缩写规则**：① 每段前导 0 可省略；② 连续的 0 段可用 `::` 代替，**但一个地址里只能出现一次**。例如 `2001:0db8:0000:0000:0000:ff00:0042:8329` → `2001:db8::ff00:42:8329`。" },
          { t: "callout", kind: "info", title: "EUI-64：从 MAC 生成接口 ID", x: "把 48 位 MAC 从中间劈开，**插入 FFFE**，再把**首字节的第 7 位（U/L 位）取反**，就得到 64 位接口 ID。配合 `FE80::/10` 或路由通告的前缀，主机可自动生成完整地址。" },
          { t: "table", head: ["对比项", "IPv4", "IPv6"], rows: [["地址长度", "32 位", "128 位"], ["首部长度", "20～60 字节，可变", "**固定 40 字节**"], ["校验和", "有（首部校验和）", "**取消**"], ["分片", "路由器可分片", "**只由源主机分片**"], ["广播", "有", "**取消**，用组播替代"], ["邻居发现", "ARP（广播）", "NDP（组播，基于 ICMPv6）"], ["地址配置", "DHCP / 手工", "**SLAAC 无状态自动配置** / DHCPv6"]] }
        ]
      },
      { id: "s3-terms", title: "术语速查表", icon: "list", blocks: [{ t: "terms", items: [
        { t: "子网掩码", en: "Subnet Mask", d: "网络位全 1、主机位全 0 且 1 连续的 32 位数" },
        { t: "网络地址 / 广播地址", en: "Network / Broadcast", d: "主机位全 0 / 全 1，均不可分配给主机" },
        { t: "CIDR", en: "Classless Inter-Domain Routing", d: "无类域间路由，用 /n 表示前缀并支持路由聚合" },
        { t: "VLSM", en: "Variable Length Subnet Mask", d: "可变长子网掩码，按需分配不同长度，工程主流" },
        { t: "块大小", en: "Block Size", d: "2^主机位数 = 256 − 掩码末字节值，子网心算核心" },
        { t: "反掩码", en: "Wildcard Mask", d: "0 匹配 1 忽略，= 255.255.255.255 − 子网掩码" },
        { t: "TTL", en: "Time To Live", d: "跳数上限，每跳减 1，减到 0 丢弃并回报" },
        { t: "片偏移", en: "Fragment Offset", d: "分片在原包中的位置，单位 8 字节" },
        { t: "最长前缀匹配", en: "Longest Prefix Match", d: "多条匹配时选前缀最长（最具体）的那条" },
        { t: "管理距离 / 优先级", en: "AD / Preference", d: "路由可信度，越小越优（思科 / 华为数值不同）" },
        { t: "距离矢量 / 链路状态", en: "Distance Vector / Link State", d: "只知「有多远」/ 广播链路状态建全网拓扑" },
        { t: "AS 自治系统", en: "Autonomous System", d: "统一管理的网络集合，全球唯一 ASN" },
        { t: "PAT / NAPT", en: "Port Address Translation", d: "同时转换端口，多对一，最常用的 NAT" },
        { t: "traceroute", en: "—", d: "靠 TTL 递增逐跳发现路径" },
        { t: "GUA / LLA / ULA", en: "IPv6 地址类型", d: "2000::/3 全球单播 / FE80::/10 链路本地 / FC00::/7 唯一本地" },
        { t: "EUI-64", en: "—", d: "由 48 位 MAC 生成 64 位接口 ID（插 FFFE + U/L 位取反）" },
        { t: "SLAAC / NDP", en: "—", d: "IPv6 无状态自动配置 / 邻居发现（替代 ARP）" },
        { t: "APIPA", en: "Automatic Private IP Addressing", d: "169.254.0.0/16，DHCP 失败时自动分配" }
      ] }] },
      { id: "s3-pit", title: "八个常见误区", icon: "alert", blocks: [{ t: "pitfalls", items: [
        { t: "IP 地址是分配给设备的", x: "**错误。** IP 地址是分配给**网络接口**的，一台设备有多个接口就有多个 IP。" },
        { t: "172.16.0.0 到 172.255.0.0 都是私有地址", x: "**错误。** 私有段是 `172.16.0.0/12`，只到 **172.31.255.255**，172.32 以后是公网。" },
        { t: "A 类地址范围是 0～127", x: "**错误。** 可用范围是 **1～126**，`0.0.0.0/8` 与 `127.0.0.0/8` 被保留。" },
        { t: "子网划分时借的位数越多越好", x: "**错误。** 借得越多子网越多，但每网主机越少，且**至少留 2 位主机位（/30）**。" },
        { t: "路由器转发时 IP 和 MAC 地址都不变", x: "**错误。** **IP 不变、MAC 每跳重写**（源和目的 MAC 都换成下一跳的）。" },
        { t: "traceroute 显示 `* * *` 说明网络故障", x: "**不一定。** 很多设备出于安全考虑不响应 ICMP，这是正常现象。" },
        { t: "IPv6 只是把地址变长了", x: "**错误。** 还取消广播、取消校验和、路由器不分片、原生支持自动配置等。" },
        { t: "有了 NAT 就不需要 IPv6 了", x: "**错误。** NAT 只是「续命」，它破坏了端到端通信。IPv6 才是根本解法。" }
      ] }] },
      { id: "s3-quiz", title: "自测练习", icon: "target", blocks: [{ t: "quiz", stage: "s3", items: [
        { q: "`192.168.1.100/26` 的网络地址和广播地址分别是？", o: ["192.168.1.0 / 192.168.1.63", "192.168.1.64 / 192.168.1.127", "192.168.1.96 / 192.168.1.159", "192.168.1.128 / 192.168.1.191"], a: 1, e: "/26 掩码末字节 192，块大小 = 256 − 192 = **64**。100 落在 64 的倍数区间 `64～127`：网络地址 **.64**，广播地址 **.127**。" },
        { q: "一个 /28 的子网最多能容纳多少台可用主机？", o: ["16 台", "14 台", "30 台", "6 台"], a: 1, e: "主机位 = 32 − 28 = 4，2⁴ − 2 = **14 台**（减去网络地址与广播地址）。" },
        { q: "当多条路由都匹配目的 IP 时，路由器会选择哪一条？", o: ["管理距离最小的", "前缀最长的", "度量值最小的", "最先配置的"], a: 1, e: "**最长前缀匹配**：选择前缀最长（最具体）的那条路由。管理距离只在**同一前缀长度的不同来源**之间比较。" },
        { q: "PAT 与动态 NAT 的核心区别是？", o: ["PAT 用公网地址池", "PAT 同时转换端口，实现多对一", "PAT 只用于 IPv6", "动态 NAT 更省公网 IP"], a: 1, e: "PAT（NAPT）**同时改写源端口**，所以多台内网主机可以共享**同一个公网 IP**；动态 NAT 是多对多，仍需要地址池。" },
        { q: "traceroute 靠什么机制逐跳发现路径？", o: ["靠 ARP 广播", "靠 TTL 递增与 ICMP 超时报文", "靠 DNS 查询", "靠 TCP 三次握手"], a: 1, e: "先发 TTL=1 的包，第 1 跳把 TTL 减到 0 并回 **ICMP Type 11 超时**；再发 TTL=2 …… 逐跳推进，从而拿到每一跳的 IP。" }
      ] }] }
    ]
  });

})();
