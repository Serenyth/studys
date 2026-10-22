/* ============================================================
   阶段二 · 物理层与数据链路层
   ============================================================ */
(function () {
  "use strict";
  var PF = window.PF;
  var tone = PF.tone;   /* 主题感知的 Canvas 文本色 */
  var TC = PF.C;      /* 主题感知的强调色 */

  /* ============ 可视化 1：以太网帧结构解剖 ============ */
  PF.VIZ["s2-frame"] = function (stage) {
    var F = [
      { n: "前导码", len: "7 字节", flex: 7, phy: true, c: "#5b6879", d: "内容固定为 `10101010` 重复 7 次，**让接收方同步时钟**（一连串方波便于锁相）。属于物理层加的同步信息。" },
      { n: "SFD", len: "1 字节", flex: 1, phy: true, c: "#5b6879", d: "帧开始定界符，内容 `10101011`。最后两位 `11` 告诉接收方：**真正的帧要开始了**。同样不计入帧长。" },
      { n: "目的 MAC", len: "6 字节", flex: 6, c: TC("#35e5d4"), d: "接收方的 MAC 地址。若为 `FF:FF:FF:FF:FF:FF` 则为广播帧。" },
      { n: "源 MAC", len: "6 字节", flex: 6, c: TC("#4d8dff"), d: "发送方的 MAC 地址。**交换机只学源 MAC，转发才查目的 MAC。**" },
      { n: "类型 / 长度", len: "2 字节", flex: 2, c: TC("#9b8cff"), d: "值 ≥ `0x0600` 表示上层协议类型（`0x0800`=IPv4、`0x0806`=ARP、`0x86DD`=IPv6）；值 ≤ `0x05DC` 表示数据长度。" },
      { n: "数据 + 填充", len: "46～1500 字节", flex: 34, c: TC("#57e08a"), d: "上层交付的数据。**不足 46 字节要填充（Pad）**——因为帧不能小于 64 字节，否则 CSMA/CD 无法在发完前检测到冲突。" },
      { n: "FCS", len: "4 字节", flex: 4, c: TC("#ffb454"), d: "CRC-32 校验值。接收方重新计算比对，**不一致就整帧丢弃，不通知发送方**——这就是以太网「不可靠传输」的体现：只检错，不纠错，不重传。" }
    ];
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="fb-bar" id="fbBar">' + F.map(function (f, i) {
        return '<button class="fb-seg" data-i="' + i + '" style="flex:' + f.flex + ';--fc:' + f.c + '"><span>' + f.n + '</span><em>' + f.len + "</em></button>";
      }).join("") + "</div>" +
      '<div class="fb-scale"><span>↑ 这 8 字节由物理层添加，<b>不计入帧长</b></span><span>帧长计算从这里开始 → 到 FCS 结束</span></div>' +
      '<div class="fb-detail" id="fbDetail"></div>' +
      '<div class="readout" style="margin-top:16px">' +
      '<div class="ro"><span>最小帧长</span><b>64 B</b></div>' +
      '<div class="ro v"><span>最大帧长</span><b>1518 B</b></div>' +
      '<div class="ro a"><span>带 VLAN 标签</span><b>最大 1522 B</b></div>' +
      '<div class="ro g"><span>MTU（数据字段）</span><b>1500 B</b></div>' +
      "</div>";
    stage.appendChild(wrap);
    var bar = PF.$("#fbBar", wrap), det = PF.$("#fbDetail", wrap);
    function show(i) {
      PF.$$(".fb-seg", bar).forEach(function (b, j) { b.classList.toggle("on", j === i); });
      var f = F[i];
      det.innerHTML = '<div class="fbd-head"><span class="fbd-dot" style="background:' + f.c + '"></span><b>' + f.n +
        '</b><span class="chip">' + f.len + "</span>" + (f.phy ? '<span class="chip a">物理层 · 不计入帧长</span>' : "") +
        '</div><p>' + PF.rich(f.d) + "</p>";
    }
    bar.addEventListener("click", function (e) {
      var b = e.target.closest(".fb-seg"); if (b) show(+b.dataset.i);
    });
    show(4);
  };

  /* ============ 可视化 2：交换机自学习 ============ */
  PF.VIZ["s2-switch"] = function (stage) {
    var HOSTS = [
      { id: "A", mac: "00:1A:..:0A", port: 1, x: .12, y: .18 },
      { id: "B", mac: "00:1A:..:0B", port: 2, x: .88, y: .18 },
      { id: "C", mac: "00:1A:..:0C", port: 3, x: .12, y: .82 },
      { id: "D", mac: "00:1A:..:0D", port: 4, x: .88, y: .82 }
    ];
    var STEPS = [
      { from: "A", to: "B", act: "泛洪", note: "表里没有 B → 向除入端口外的所有端口泛洪" },
      { from: "B", to: "A", act: "单播", note: "表里已有 A（端口 1）→ 只从端口 1 转发" },
      { from: "C", to: "A", act: "单播", note: "学到 C↔端口 3；目的 A 已知 → 只发端口 1" },
      { from: "D", to: "C", act: "单播", note: "学到 D↔端口 4；目的 C 已知 → 只发端口 3" }
    ];
    var cv = document.createElement("canvas");
    cv.className = "viz-canvas";
    stage.appendChild(cv);
    var side = document.createElement("div");
    side.className = "sw-side";
    side.innerHTML = '<div class="sw-title">MAC 地址表（CAM 表）<span class="sw-count" id="swCount">0 / 4 条</span></div>' +
      '<div class="sw-table" id="swTable"></div>' +
      '<div class="sw-note" id="swNote"></div>';
    stage.appendChild(side);

    var table = PF.$("#swTable", side), note = PF.$("#swNote", side), count = PF.$("#swCount", side);
    var D = 2100;
    var lastSi = -1;

    PF.Scene(cv, {
      height: 330,
      draw: function (s, t) {
        var ctx = s.ctx, W = s.W, H = s.H;
        ctx.clearRect(0, 0, W, H);
        var swW = Math.min(170, W * .3), swH = 64;
        var swX = W / 2 - swW / 2, swY = H / 2 - swH / 2;
        var si = Math.floor(t / D) % STEPS.length, st = STEPS[si], p = (t % D) / D;
        var P = function (h) { return { x: h.x * W, y: h.y * H }; };
        var sp = function (port) {
          var m = { 1: [swX, swY + 14], 2: [swX + swW, swY + 14], 3: [swX, swY + swH - 14], 4: [swX + swW, swY + swH - 14] };
          return { x: m[port][0], y: m[port][1] };
        };
        HOSTS.forEach(function (h) {
          var hp = P(h), pt = sp(h.port);
          ctx.strokeStyle = tone("line", .25); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(hp.x, hp.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
        });
        ctx.fillStyle = "rgba(53,229,212,.09)"; ctx.strokeStyle = "rgba(53,229,212,.5)"; ctx.lineWidth = 1.6;
        rr(ctx, swX, swY, swW, swH, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = TC("#35e5d4"); ctx.font = "600 12px 'Chakra Petch',sans-serif"; ctx.textAlign = "center";
        ctx.fillText("交换机", W / 2, swY + swH / 2 + 4);
        for (var k = 1; k <= 4; k++) {
          var pt2 = sp(k);
          ctx.beginPath(); ctx.arc(pt2.x, pt2.y, 4, 0, 6.2832);
          ctx.fillStyle = "rgba(53,229,212,.9)"; ctx.fill();
          ctx.fillStyle = tone("muted", .9); ctx.font = "9px sans-serif";
          ctx.fillText(String(k), pt2.x + (k === 1 || k === 3 ? -12 : 12), pt2.y + 3);
        }
        HOSTS.forEach(function (h) {
          var hp = P(h);
          var isF = h.id === st.from, isT = h.id === st.to;
          ctx.beginPath(); ctx.arc(hp.x, hp.y, 22, 0, 6.2832);
          ctx.fillStyle = isF ? "rgba(77,141,255,.22)" : isT ? "rgba(87,224,138,.2)" : tone("grid", .1);
          ctx.fill();
          ctx.strokeStyle = isF ? TC("#4d8dff") : isT ? TC("#57e08a") : tone("line", .4);
          ctx.lineWidth = isF || isT ? 2 : 1.3; ctx.stroke();
          ctx.fillStyle = tone("ink"); ctx.font = "700 15px 'Chakra Petch',sans-serif"; ctx.textAlign = "center";
          ctx.fillText(h.id, hp.x, hp.y + 5);
          ctx.fillStyle = tone("muted", .9); ctx.font = "9.5px monospace";
          ctx.fillText(h.mac, hp.x, hp.y + 36);
        });
        var fromH = HOSTS.filter(function (h) { return h.id === st.from; })[0];
        var from = P(fromH), fromPort = sp(fromH.port);
        if (p < .42) {
          var q = p / .42;
          packet(ctx, PF.lerp(from.x, fromPort.x, q), PF.lerp(from.y, fromPort.y, q), TC("#4d8dff"), "帧");
        } else if (p < .56) {
          ctx.fillStyle = "rgba(155,140,255,.95)"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
          ctx.fillText("查表：目的 MAC " + st.to, W / 2, swY - 16);
          packet(ctx, fromPort.x, fromPort.y, TC("#9b8cff"), "查表");
        } else {
          var q2 = (p - .56) / .44;
          if (st.act === "泛洪") {
            HOSTS.forEach(function (h) {
              if (h.id === st.from) return;
              var tp = P(h), fp = sp(h.port);
              packet(ctx, PF.lerp(fp.x, tp.x, q2), PF.lerp(fp.y, tp.y, q2), TC("#ffb454"), "泛洪", .82);
            });
          } else {
            var th = HOSTS.filter(function (h) { return h.id === st.to; })[0];
            var tp2 = P(th), fp2 = sp(th.port);
            packet(ctx, PF.lerp(fp2.x, tp2.x, q2), PF.lerp(fp2.y, tp2.y, q2), TC("#57e08a"), "单播");
          }
        }
        if (si === lastSi) return;
        lastSi = si;
        var learned = {};
        for (var q3 = 0; q3 <= si; q3++) {
          var s3 = STEPS[q3];
          var fh = HOSTS.filter(function (h) { return h.id === s3.from; })[0];
          learned[fh.mac] = { port: fh.port, fresh: q3 === si };
        }
        var rows = HOSTS.filter(function (h) { return learned[h.mac]; }).map(function (h) {
          var v = learned[h.mac];
          return '<div class="mtab-row' + (v.fresh ? " new" : "") + '"><b>' + h.mac +
            "</b><span>端口 " + v.port + "</span></div>";
        }).join("");
        table.innerHTML = rows || '<div class="mtab-empty">表为空 —— 等待第一个帧…</div>';
        count.textContent = Object.keys(learned).length + " / " + HOSTS.length + " 条";
        note.innerHTML = '<span class="chip ' + (st.act === "泛洪" ? "a" : "g") + '">' + st.act + "</span><span>" +
          st.from + " → " + st.to + "：" + st.note + "</span>";
      }
    });
    function packet(ctx, x, y, c, label, alpha) {
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.fillStyle = c; rr(ctx, x - 16, y - 10, 32, 20, 6); ctx.fill();
      ctx.globalAlpha = 1;
      if (label) { ctx.fillStyle = "#06121a"; ctx.font = "600 9px sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x, y + 3.5); }
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

  /* ============ 可视化 3：ARP 请求与应答 ============ */
  PF.VIZ["s2-arp"] = function (stage) {
    var HOSTS = [
      { id: "A", ip: "192.168.1.10", x: .10, y: .5, is: "ask" },
      { id: "B", ip: "192.168.1.20", x: .40, y: .5, is: "ans" },
      { id: "C", ip: "192.168.1.30", x: .62, y: .5, is: "other" },
      { id: "D", ip: "192.168.1.40", x: .86, y: .5, is: "other" }
    ];
    var cv = document.createElement("canvas");
    cv.className = "viz-canvas";
    stage.appendChild(cv);
    var cap = document.createElement("div");
    cap.className = "arp-cap";
    stage.appendChild(cap);
    var D = 5600;

    PF.Scene(cv, {
      height: 250,
      draw: function (s, t) {
        var ctx = s.ctx, W = s.W, H = s.H;
        ctx.clearRect(0, 0, W, H);
        var y = H * .58;
        var swX = 54, swW = W - 108, swY = y - 76, swH = 30;
        ctx.fillStyle = "rgba(53,229,212,.07)"; ctx.strokeStyle = "rgba(53,229,212,.4)"; ctx.lineWidth = 1.4;
        rr(ctx, swX, swY, swW, swH, 9); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(53,229,212,.95)"; ctx.font = "600 11px 'Chakra Petch',sans-serif"; ctx.textAlign = "center";
        ctx.fillText("二层交换机 · 同一个广播域", W / 2, swY + 19);
        var p = (t % D) / D;
        HOSTS.forEach(function (h) {
          var x = h.x * W;
          ctx.strokeStyle = tone("line", .22); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(x, swY + swH); ctx.lineTo(x, y - 24); ctx.stroke();
          ctx.beginPath(); ctx.arc(x, y, 21, 0, 6.2832);
          ctx.fillStyle = h.is === "ask" ? "rgba(77,141,255,.18)" : h.is === "ans" ? "rgba(87,224,138,.18)" : tone("grid", .09);
          ctx.fill();
          ctx.strokeStyle = h.is === "ask" ? TC("#4d8dff") : h.is === "ans" ? TC("#57e08a") : tone("line", .35);
          ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = tone("ink"); ctx.font = "700 15px 'Chakra Petch',sans-serif"; ctx.textAlign = "center";
          ctx.fillText(h.id, x, y + 5);
          ctx.fillStyle = tone("muted", .95); ctx.font = "9.5px monospace";
          ctx.fillText(h.ip, x, y + 36);
        });
        var A = HOSTS[0].x * W, B = HOSTS[1].x * W;
        if (p < .5) {
          var q = p / .5;
          var xx = PF.lerp(A, W - 34, q);
          frame(ctx, A, xx, y - 44, TC("#ffb454"), "ARP 请求 · 广播");
          HOSTS.forEach(function (h, i) { if (i) ring(ctx, h.x * W, y, TC("#ffb454"), q); });
          PF.dom(cap, PF.md('<span class="chip a">广播</span><span>主机 A 问：<b>谁有 192.168.1.20？</b> 目标 MAC 字段填全 0，以太网帧目的地址为 `FF:FF:FF:FF:FF:FF`，交换机泛洪给所有端口。</span>'));
        } else {
          var q2 = (p - .5) / .5;
          var xx2 = PF.lerp(B, A, q2);
          frame(ctx, B, xx2, y - 44, TC("#57e08a"), "ARP 应答 · 单播");
          PF.dom(cap, '<span class="chip g">单播</span><span>主机 B 发现目标 IP 是自己，回 <b>单播</b>应答：<b>192.168.1.20 是我的 MAC</b>。其余主机丢弃这个请求。</span>');
        }
      }
    });
    function frame(ctx, fromX, x, y, c, label) {
      var a = Math.min(fromX, x), b = Math.max(fromX, x);
      ctx.strokeStyle = c; ctx.globalAlpha = .3; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(a, y + 11); ctx.lineTo(b, y + 11); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = c; rr(ctx, x - 9, y, 18, 22, 6); ctx.fill();
      ctx.fillStyle = c; ctx.font = "600 10.5px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(label, x, y - 9);
    }
    function ring(ctx, x, y, c, q) {
      ctx.beginPath(); ctx.arc(x, y, 21 + (1 - q) * 8, 0, 6.2832);
      ctx.strokeStyle = c; ctx.globalAlpha = .5 * (1 - q); ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
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
    id: "s2", num: 2, title: "物理层与数据链路层", short: "物理层与链路层",
    icon: "signal", accent: "var(--c-blue)", difficulty: 2, duration: "1 周", level: "★★☆☆☆",
    tagline: "开始往下钻——看最底下两层到底怎么工作。学完你会真正明白：比特怎么变成帧、MAC 地址怎么找到邻居、交换机凭什么知道该把数据发给哪个口。",
    tags: ["以太网帧", "MAC 地址", "VLAN", "STP", "ARP"],
    lead: "阶段一讲的是「网络分了几层」，这一阶段看最底下两层怎么把 0 和 1 变成可靠的、可寻址的数据。**排障第一原则就藏在这里：网络不通时先看物理层——物理层不通，上层配置再对也没用。**",
    sections: [
      {
        id: "s2-1", title: "物理层：四大特性与传输介质", icon: "plug",
        blocks: [
          { t: "p", x: "物理层的职责一句话概括：**把比特流（0 和 1）变成能在介质上传输的物理信号，并送到对面**。它不关心这些 0 和 1 代表什么意思，只关心四件事：" },
          { t: "table", head: ["特性", "管什么", "举例"], rows: [["机械特性", "接口的物理形状", "RJ-45 水晶头有 8 根针脚、什么形状"], ["电气特性", "电压范围、阻抗", "多少伏表示 1，多少伏表示 0"], ["功能特性", "每根线的作用", "第几根针脚负责发送、第几根负责接收"], ["规程特性", "信号变化的时序", "先拉高电平再发数据，持续多久"]] },
          { t: "p", x: "**双绞线**把两根绝缘铜线互相缠绕——++绞合能抵消电磁干扰和串扰++，绞得越密抗干扰越强，这就是不同「类别」线缆的核心差别。" },
          { t: "table", head: ["类别", "频率带宽", "支持速率", "典型场景"], rows: [["Cat 3", "16 MHz", "10 Mbps", "已淘汰"], ["Cat 5", "100 MHz", "100 Mbps", "百兆网络"], ["**Cat 5e**", "100 MHz", "1 Gbps", "千兆网络，目前最普及"], ["**Cat 6**", "250 MHz", "1 Gbps（100 m）/ 10 Gbps（55 m）", "千兆 / 短距万兆"], ["Cat 6a", "500 MHz", "10 Gbps（100 m）", "万兆网络"], ["Cat 8", "2000 MHz", "25 / 40 Gbps（30 m）", "机房短距互联"]] },
          { t: "callout", kind: "warn", title: "双绞线的 100 米限制是硬性规定", x: "不是建议。超过 100 米信号衰减和时延会导致链路不稳定。**要延长的正确做法是加交换机中继，而不是买「更好的线」。**" },
          { t: "p", x: "**线序标准**：RJ-45 有 8 根针脚，T568A 与 T568B 只是**橙、绿两对线位置对调**。中国和大多数地区实际都用 T568B，口诀是「**橙白橙、绿白蓝、蓝白绿、棕白棕**」。" },
          { t: "table", head: ["类型", "两端线序", "用途", "口诀"], rows: [["**直通线**", "两端相同（都 A 或都 B）", "连接**不同类**设备：PC—交换机、交换机—路由器", "「异类直通」"], ["**交叉线**", "一端 A、一端 B", "连接**同类**设备：PC—PC、交换机—交换机", "「同类交叉」"]] },
          { t: "p", x: "为什么要交叉？因为网卡的 1、2 针脚是「发送」，3、6 是「接收」。同类设备互联时，A 的发送要对上 B 的接收，所以必须把 1/2 和 3/6 对调。**现代设备基本都支持 Auto-MDIX 自动识别，所以现在直通线可以通用**，但考试仍会考。" },
          { t: "p", x: "**光纤**用玻璃或塑料纤芯传导光信号，核心优势是**带宽极高、传输距离极远、完全不受电磁干扰**。" },
          { t: "table", head: ["对比项", "多模光纤 MMF", "单模光纤 SMF"], rows: [["纤芯直径", "粗，50 或 62.5 μm", "极细，8～10 μm"], ["光的传播", "多种模式同时传播", "只允许一种模式传播"], ["光源", "LED / VCSEL（便宜）", "激光二极管（贵）"], ["常用波长", "850 nm / 1300 nm", "1310 nm / 1550 nm"], ["色散", "大（模式色散）", "小"], ["传输距离", "短，几百米～2 km", "长，10 km～上百 km"], ["典型场景", "楼内、机房内", "城际、跨楼、运营商骨干"]] },
          { t: "callout", kind: "tip", title: "为什么单模能传更远", x: "光脉冲传播时会逐渐「变宽」（**色散**），导致相邻脉冲糊在一起。多模光纤有多条光路同时传播、到达时间不一致，色散大；单模只有一条光路，色散小——**这就是单模能传更远的根本原因**。" },
          { t: "p", x: "**无线介质**常见频段：**2.4 GHz** 穿墙强但只有 3 个不重叠信道（1、6、11）、干扰严重；**5 GHz** 信道多、干扰少、速率高但穿墙弱；**6 GHz**（Wi-Fi 6E/7）更宽信道、干扰最少。" }
        ]
      },
      {
        id: "s2-2", title: "编码、信道极限与传输模式", icon: "activity",
        blocks: [
          { t: "p", x: "计算机产生的是数字信号。要把 0 和 1 变成线路上的电平变化，需要**编码**。四种常见编码方式各有取舍：" },
          { t: "table", head: ["编码", "原理", "优点", "缺点", "用在哪"], rows: [["**NRZ**", "高电平=1，低电平=0", "简单，效率高", "**长串 0 或 1 时无跳变，收方无法提取时钟**", "简单串口"], ["**曼彻斯特**", "每个码元**中间必跳变**", "自带时钟同步", "需要 2 倍带宽", "10M 以太网"], ["差分曼彻斯特", "中间跳变只提供时钟", "抗干扰更强", "同样需 2 倍带宽", "令牌环网"], ["**4B/5B**", "每 4 位数据映射成 5 位码", "效率较高（80%）", "需要映射表", "100M 以太网"]] },
          { t: "callout", kind: "key", title: "为什么「自带时钟」很重要", x: "收方必须知道「每个比特持续多久」才能正确采样。如果信号长时间不变（比如连发 100 个 1），收方就不知道边界在哪，会越数越偏。**曼彻斯特编码强制每个码元中间跳变一次，收方可以用这个跳变来校准时钟**——这就是它的核心价值。" },
          { t: "p", x: "一条线路最快能传多少数据？这不是靠「买更贵的设备」能突破的，有**理论天花板**——两个定理决定了这个上限：" },
          { t: "formula", label: "奈氏准则（理想无噪声信道）", x: "极限数据速率 = 2W × log₂V  (b/s)" },
          { t: "formula", label: "香农定理（有噪声的真实信道）", x: "C = W × log₂(1 + S/N)  (b/s)" },
          { t: "formula", label: "信噪比换算", x: "信噪比(dB) = 10 × log₁₀(S/N)" },
          { t: "table", head: ["对比项", "奈氏准则", "香农定理"], rows: [["适用信道", "理想无噪声", "有噪声的真实信道"], ["限制因素", "码间串扰", "噪声"], ["限制对象", "码元传输速率", "数据（比特）传输速率"], ["关键变量", "带宽 W、电平数 V", "带宽 W、信噪比 S/N"], ["能否靠「增加电平数」提升", "**能**（V 越大越快）", "不能（噪声限制了区分能力）"]] },
          { t: "callout", kind: "warn", title: "实战结论：两个定理都要算，取较小值", x: "现实信道既有噪声又受带宽限制，最终速率被两者中更严格的那个卡住。" },
          { t: "table", head: ["模式", "说明", "生活类比", "例子"], rows: [["**单工**", "只能单向传输", "广播电台", "收音机、电视广播"], ["**半双工**", "双向但不能同时", "对讲机", "早期集线器网络"], ["**全双工**", "双向可同时进行", "打电话", "现代交换机组网"]] },
          { t: "callout", kind: "danger", title: "一个常见的双工不匹配故障", x: "如果一端是自动协商、另一端强制全双工，可能协商成「一端全双工、一端半双工」。结果是一方发送时另一方正在发送，导致**大量 CRC 错误和丢包**。表现是「能通但极慢、大量错包」——这是排障时的经典陷阱。" }
        ]
      },
      {
        id: "s2-3", title: "以太网与帧结构", icon: "box",
        blocks: [
          { t: "p", x: "**以太网（Ethernet）** 是目前占据绝对统治地位的局域网技术，基于 **IEEE 802.3** 标准。它采用**无连接、不可靠**的传输（不确认、不重传，可靠性交给上层），速率从 10 Mbps 一路演进到 400 Gbps。**它赢在简单、便宜、开放。**" },
          { t: "viz", id: "s2-frame", icon: "box", title: "Ethernet II 帧结构 · 逐字段解剖", sub: "点击任意字段，查看长度与作用", tag: "Interactive", note: "**帧长（从目的 MAC 到 FCS）= 6 + 6 + 2 + 数据 + 4**。最小 64 字节、最大 1518 字节（带 VLAN 标签 1522）。" },
          { t: "callout", kind: "key", title: "为什么最小帧长是 64 字节", x: "这直接关系到 **CSMA/CD 能否正常工作**。发送方必须在**发完整个帧之前**检测到冲突，所以要求：**帧的发送时间 ≥ 信号在网络上跑一个来回的时间**。在 10 Mbps 以太网中，这个往返时间是 **51.2 μs**（叫**争用期**），`10 Mbps × 51.2 μs = 512 bit = 64 字节`。**所以帧不能小于 64 字节。**" },
          { t: "p", x: "为什么最大是 1500 字节？这是**权衡的结果**：帧太长 → 一个站长时间占用线路、时延变大；帧太短 → 帧头开销占比过高、效率变低。1500 字节是历史上多方博弈定下来的，后来成了事实标准，也就是今天的 **MTU**。" },
          { t: "table", head: ["标准", "别名", "速率", "介质"], rows: [["10BASE-T", "标准以太网", "10 Mbps", "双绞线"], ["100BASE-TX", "快速以太网", "100 Mbps", "双绞线（Cat5）"], ["1000BASE-T", "千兆以太网", "1 Gbps", "双绞线（Cat5e+）"], ["10GBASE-T", "万兆以太网", "10 Gbps", "双绞线（Cat6a+）/ 光纤"], ["40G / 100G", "—", "40 / 100 Gbps", "光纤（数据中心骨干）"]] },
          { t: "callout", kind: "tip", title: "CSMA/CD 现在基本「名存实亡」", x: "「**先听后发，边发边听，冲突停止，随机重发**」——但它只在**半双工**下需要。现代交换机组网全是全双工，收发走独立线对，不会冲突，所以 CSMA/CD 被自动关闭。**但它是理解以太网设计的关键，也是必考内容。** 冲突后重试用**二进制指数退避**：第 n 次冲突后从 `0 ~ 2ⁿ−1` 中随机取一个数，等 k 个争用期再重试。" }
        ]
      },
      {
        id: "s2-4", title: "MAC 地址与交换机工作原理", icon: "network",
        blocks: [
          { t: "p", x: "**MAC 地址**（物理地址 / 硬件地址）是 **48 位二进制**，通常写成 6 组十六进制。前 24 位是 **OUI**（组织唯一标识符，IEEE 分配给厂商），后 24 位是厂商自己分配的序列号——**所以看 MAC 地址前 3 字节就能猜出设备厂商**。" },
          { t: "table", head: ["类型", "特征", "举例", "交换机如何处理"], rows: [["**单播**", "I/G 位 = 0，指向某一台设备", "`00:1A:2B:3C:4D:5E`", "查表转发"], ["**组播**", "I/G 位 = 1，指向一组设备", "`01:00:5E:...`", "泛洪"], ["**广播**", "48 位全 1", "`FF:FF:FF:FF:FF:FF`", "泛洪到所有端口"]] },
          { t: "p", x: "**广播地址 `FF:FF:FF:FF:FF:FF` 是必须记住的**——ARP 请求、DHCP 发现都靠它。" },
          { t: "table", head: ["对比项", "MAC 地址", "IP 地址"], rows: [["所在层", "数据链路层（第 2 层）", "网络层（第 3 层）"], ["长度", "48 位", "IPv4 是 32 位"], ["性质", "**物理地址**，硬件固化", "**逻辑地址**，软件配置"], ["唯一性范围", "全球唯一（理论上）", "网络内唯一（不同网络可重复）"], ["作用范围", "同一链路 / 广播域内", "跨网络全局可路由"], ["类比", "身份证号", "门牌号（搬家就变）"]] },
          { t: "callout", kind: "key", title: "一句话总结", x: "**IP 地址负责「找到哪台机器」，MAC 地址负责「在同一段链路上找到那个物理接口」。** 数据包跨网络时，**IP 地址全程不变，MAC 地址每一跳都会重写**。" },
          { t: "p", x: "交换机内部维护一张 **MAC 地址表**（CAM 表），靠三个动作维护：**学习（Learning）** 收到帧时提取**源 MAC** 写入「源 MAC ↔ 入端口」；**转发（Forwarding）** 查**目的 MAC** 决定从哪个端口发出；**老化（Aging）** 超过 300 秒未更新的条目删除。" },
          { t: "callout", kind: "warn", title: "最容易记反的地方", x: "**学习的是「源 MAC」，转发查的是「目的 MAC」。** 三种转发行为：目的已知 → **单播转发**；目的未知 → **泛洪**；目的是广播 / 组播 → **泛洪**；目的在入端口 → **丢弃**。" },
          { t: "viz", id: "s2-switch", icon: "network", title: "交换机自学习 · 全过程动画", sub: "看 MAC 地址表如何被一帧一帧「喂」满", tag: "Animation", note: "交换机**不需要任何配置**，插上线自己就学会了——这叫「即插即用」，也是以太网能赢的重要原因。右侧表格中高亮的一行就是**当前这一步新学到的条目**。" },
          { t: "table", head: ["设备", "冲突域", "广播域", "说明"], rows: [["**集线器**", "**所有端口 1 个**", "1 个", "不隔离任何域"], ["**交换机**", "**每个端口 1 个**", "**所有端口 1 个**", "隔离冲突域，**不隔离广播域**"], ["**路由器**", "**每个接口 1 个**", "**每个接口 1 个**", "隔离冲突域，**也隔离广播域**"], ["**VLAN**", "—", "**每个 VLAN 1 个**", "逻辑上把 1 个交换机切成多个广播域"]] },
          { t: "callout", kind: "danger", title: "一个 24 口交换机 = 24 个冲突域 + 1 个广播域", x: "如果划分了 3 个 VLAN，就变成 24 个冲突域 + 3 个广播域。**为什么广播域不能太大？** 广播帧会被泛洪到所有端口，广播域越大，广播流量越多，占用的带宽和 CPU 越多。**划分 VLAN 的根本目的就是缩小广播域。**" }
        ]
      },
      {
        id: "s2-5", title: "VLAN、Trunk 与 STP", icon: "git-branch",
        blocks: [
          { t: "p", x: "**VLAN（虚拟局域网）** 是在物理交换机上通过配置逻辑划分出的多个虚拟局域网。**同一个 VLAN 内的设备在二层是互通的，不同 VLAN 之间在二层是隔离的**——就像它们接在不同的物理交换机上一样。" },
          { t: "ul", items: ["**缩小广播域**，抑制广播风暴", "**增强安全**：不同 VLAN 默认不能二层互通", "**简化管理**：按部门 / 功能划分，不受物理位置限制", "**降低成本**：不用为每个部门单独买交换机"] },
          { t: "p", x: "交换机之间用一条线连着，怎么区分不同 VLAN 的帧？答案是在帧里**插一个标签**——这就是 **IEEE 802.1Q**。标签插在**源 MAC 和类型字段之间，共 4 字节**：" },
          { t: "table", head: ["字段", "长度", "作用"], rows: [["**TPID**", "2 字节", "固定值 **0x8100**，表示「这是一个 802.1Q 标签帧」"], ["**PCP**", "3 bit", "0～7，7 最高，用于 802.1p QoS 优先级"], ["**CFI / DEI**", "1 bit", "规范格式指示符，0 = 以太网格式"], ["**VLAN ID**", "12 bit", "VLAN 编号，可用 1～4094"]] },
          { t: "callout", kind: "warn", title: "Tag 帧与 Untag 帧", x: "**Untag 帧**是普通以太网帧，**普通 PC 的网卡只认这种帧**；**Tag 帧**带 4 字节 802.1Q 标签，**普通 PC 网卡不认识，会直接丢弃**。所以交换机在把帧发给终端时**必须剥掉标签**，在交换机之间传递时**可以保留标签**——这就是 Access 口和 Trunk 口的本质区别。" },
          { t: "table", head: ["对比项", "Access", "Trunk", "Hybrid"], rows: [["所属 VLAN 数", "1 个", "多个", "多个"], ["收无标签帧", "打 PVID", "打 PVID", "打 PVID"], ["收带标签帧", "丢弃", "查允许列表", "查允许列表"], ["发帧时剥标签", "**总是剥**", "**只有 PVID 剥**", "**按配置逐个决定**"], ["典型用途", "接终端", "接交换机", "接终端 + 交换机"], ["思科是否支持", "支持", "支持", "**不支持**"]] },
          { t: "p", x: "**PVID（端口缺省 VLAN）** 指端口「默认属于哪个 VLAN」——当端口收到一个不带标签的帧时，就认为它属于 PVID 指定的 VLAN。**思科叫法**：Trunk 口上的 PVID 叫 **Native VLAN**（本征 VLAN）。" },
          { t: "p", x: "不同 VLAN 之间默认不能二层互通，要互通必须走三层。**现代网络基本都用三层交换机 + SVI（华为叫 VLANIF）**——转发在硬件芯片里完成，速度极快，没有单点瓶颈。单臂路由（Router-on-a-Stick）只在小型网络或教学实验中出现。" },
          { t: "p", x: "**STP 生成树协议** 要解决的是二层环路的致命问题。交换机对**广播帧、组播帧、未知单播帧（合称 BUM 帧）** 会泛洪，一旦有物理环路，泛洪的帧会在环里**永远转圈**，造成 **广播风暴** 与 **MAC 地址漂移**，几十秒就能让整个网络瘫痪。" },
          { t: "callout", kind: "key", title: "STP 的核心思想：留线不留环", x: "在存在物理环路的网络中，通过算法逻辑地「阻塞」部分端口，构造出一棵无环的树形拓扑。关键是「**逻辑阻塞**」——**物理链路还在，只是不转发数据**。一旦主链路故障，被阻塞的端口可以**自动激活**。既消除了环路，又保留了冗余。" },
          { t: "table", head: ["协议", "标准", "收敛速度", "核心改进"], rows: [["**STP**", "802.1D", "30～50 秒", "基础版本"], ["**RSTP**（快速生成树）", "802.1w", "**1 秒内**", "新增 Alternate / Backup 端口角色，用「提议-同意」机制取代计时器等待"], ["**MSTP**（多生成树）", "802.1s", "1 秒内", "**支持多实例**，不同 VLAN 走不同生成树，实现负载分担"]] },
          { t: "p", x: "**五步构建无环拓扑**：① 选举根桥（BID 最小）② 确定非根桥 ③ 每台非根桥选出一个**根端口**（到根桥最优）④ 每个冲突域选出一个**指定端口** ⑤ 既不是 RP 也不是 DP 的端口 → **阻塞**为备用端口。**三条铁律**：一个广播域只有一个根桥；一台非根桥只有一个根端口；一个冲突域只有一个指定端口。" }
        ]
      },
      {
        id: "s2-6", title: "ARP：把 IP 解析成 MAC", icon: "exchange",
        blocks: [
          { t: "p", x: "核心矛盾：发送数据时，**网络层**需要填目的 **IP 地址**（我知道对方 IP），但封装以太网帧时，**数据链路层**需要填目的 **MAC 地址**（我不知道对方 MAC）。**ARP 就是解决这个矛盾的桥梁。**" },
          { t: "callout", kind: "info", title: "ARP 的层次归属", x: "ARP 工作在**网络层与数据链路层之间**，教材上常称「**第 2.5 层**」。它的报文**没有 IP 首部**，而是**直接封装在以太网帧里**，帧类型字段值为 **0x0806**。**只在本网段（广播域）内工作，不能跨越路由器。**" },
          { t: "viz", id: "s2-arp", icon: "exchange", title: "ARP 请求（广播）与应答（单播）", sub: "看一个广播帧如何打扰全网，一个单播帧如何精准回应", tag: "Animation", note: "**高频考点：ARP 请求是广播，ARP 应答是单播。** 很多人误以为两者都是广播。原因很简单——B 已经从请求里知道了 A 的 MAC，不需要再广播。" },
          { t: "p", x: "**ARP 报文固定 28 字节**：前 5 个字段共 8 字节（硬件类型、协议类型、硬件地址长度、协议地址长度、操作类型），后 4 个地址字段共 20 字节（发送方 MAC/IP、目标 MAC/IP）。**一个精妙的设计**：请求报文里同时放了「请求者自己的 IP+MAC」和「被查询目标的 IP」，所以接收方处理请求时**顺便就能学到请求者的 IP-MAC 映射**。" },
          { t: "p", x: "**ARP 缓存表** 是操作系统维护的「IP ↔ MAC」映射表，避免每次通信都发广播。动态条目有生存时间（Windows 约 2 分钟），静态条目不过期不被覆盖，常用于绑定网关。" },
          { t: "p", x: "**免费 ARP（Gratuitous ARP）** 是主机主动广播的 ARP 请求，**目标 IP 就是自己的 IP**。它不是为了获取别人的 MAC，而是为了宣告自己的存在。两大作用：**① IP 地址冲突检测**（收到应答说明有人已在用这个 IP）；**② 更新网络中其他主机的 ARP 缓存**——最典型的应用是 **VRRP 主备切换**，新主路由器发免费 ARP 宣告「这个虚拟 IP 现在对应我的物理 MAC」，实现秒级切换。" },
          { t: "callout", kind: "danger", title: "ARP 欺骗：无状态、无认证的代价", x: "主机收到任何 ARP 应答，**无论自己有没有发过请求，都会更新缓存**。攻击者正是利用这一点伪造 ARP 应答，把「网关 IP」映射到自己的 MAC，从而**窃听、篡改、断网、中间人攻击**。防御手段：**静态 ARP 绑定**（终端侧）、**DHCP Snooping**（交换机侧，是其他防护的基础）、**DAI 动态 ARP 检测**（交换机侧，最有效）、**IP 源防护 IPSG**、**端口安全**。" },
          { t: "table", head: ["对比项", "IPv4 的 ARP", "IPv6 的 NDP"], rows: [["承载协议", "独立协议，直接封装在以太网帧", "基于 **ICMPv6**"], ["请求方式", "**广播**（FF:FF:FF:FF:FF:FF）", "**组播**（请求节点组播地址）"], ["请求 / 应答报文", "ARP Request / Reply", "**NS（邻居请求）/ NA（邻居通告）**"], ["效率", "广播打扰所有主机", "组播只打扰相关主机"], ["附加功能", "无", "还负责路由器发现、地址自动配置、重定向"]] }
        ]
      },
      { id: "s2-terms", title: "术语速查表", icon: "list", blocks: [{ t: "terms", items: [
        { t: "双绞线", en: "Twisted Pair", d: "两根铜线绞合以抵消干扰，最常见的有线介质" },
        { t: "单模 / 多模光纤", en: "SMF / MMF", d: "纤芯 8～10 μm 传一种光模式、距离远 / 纤芯 50~62.5 μm 多模式、距离短" },
        { t: "色散", en: "Dispersion", d: "光脉冲在光纤中变宽，导致信号糊在一起" },
        { t: "码元 / 波特率", en: "Symbol / Baud", d: "承载数据的基本信号单位 / 每秒传输的码元数" },
        { t: "曼彻斯特编码", en: "Manchester", d: "每码元中间必跳变，自带时钟同步" },
        { t: "奈氏准则 / 香农定理", en: "Nyquist / Shannon", d: "无噪声极限 2W·log₂V / 有噪声极限 W·log₂(1+S/N)" },
        { t: "前导码 / SFD", en: "Preamble / SFD", d: "7 字节 10101010 用于同步时钟 / 1 字节 10101011 标志帧开始" },
        { t: "FCS / CRC", en: "Frame Check Sequence", d: "4 字节 CRC-32 校验值，只检错不纠错" },
        { t: "CSMA/CD", en: "Carrier Sense Multiple Access", d: "先听后发、边发边听、冲突停止、随机重发" },
        { t: "争用期", en: "Contention Period", d: "2 倍端到端传播时延，10M 以太网为 51.2 μs" },
        { t: "OUI", en: "Organizationally Unique Identifier", d: "MAC 前 24 位，标识网卡厂商" },
        { t: "泛洪", en: "Flooding", d: "向除入端口外的所有端口转发" },
        { t: "冲突域 / 广播域", en: "Collision / Broadcast Domain", d: "可能冲突的范围 / 广播帧能到达的范围" },
        { t: "VLAN / PVID", en: "Virtual LAN / Port VLAN ID", d: "逻辑划分的虚拟局域网 / 端口缺省 VLAN" },
        { t: "Access / Trunk / Hybrid", en: "端口类型", d: "接终端不带标签 / 接交换机只有 PVID 剥标签 / 华为特有，可按 VLAN 逐个决定" },
        { t: "STP / RSTP / MSTP", en: "Spanning Tree", d: "802.1D 消环 / 802.1w 秒级收敛 / 802.1s 多实例负载分担" },
        { t: "BPDU / BID", en: "Bridge PDU / Bridge ID", d: "STP 协议报文 / 桥 ID = 16 位优先级 + 48 位 MAC，越小越优" },
        { t: "ARP", en: "Address Resolution Protocol", d: "把 IP 地址解析成 MAC 地址，RFC 826" },
        { t: "免费 ARP", en: "Gratuitous ARP", d: "目标 IP 是自己的 ARP 请求，用于冲突检测和刷新缓存" },
        { t: "DAI", en: "Dynamic ARP Inspection", d: "动态 ARP 检测，交换机校验 ARP 合法性" }
      ] }] },
      { id: "s2-pit", title: "八个常见误区", icon: "alert", blocks: [{ t: "pitfalls", items: [
        { t: "交换机隔离广播域", x: "**错误。** 交换机**隔离冲突域**，但所有端口仍在同一个广播域。要隔离广播域得用 **VLAN 或路由器**。" },
        { t: "ARP 请求和应答都是广播", x: "**错误。** **请求是广播**（不知道对方 MAC），**应答是单播**（已从请求里知道对方 MAC）。" },
        { t: "MAC 地址是永久不变的", x: "**基本正确但不绝对。** MAC 出厂固化，但**可以软件修改**，不能当作绝对可靠的身份标识。" },
        { t: "ARP 可以跨路由器工作", x: "**错误。** ARP 广播不能穿过路由器。跨网段时主机 ARP 解析的是**网关的 MAC**，**每一跳都独立进行 ARP**。" },
        { t: "VLAN 标签会一直带着传到终端", x: "**错误。** Access 端口发给终端的帧**会剥掉标签**（普通 PC 网卡不认 Tag 帧）。" },
        { t: "STP 阻塞端口就是把端口关掉了", x: "**错误。** 阻塞端口**物理上还是启用的**，只是不转发数据帧，**仍然接收和处理 BPDU**。" },
        { t: "网线超过 100 米换根好线就行", x: "**错误。** 100 米是**以太网标准规定的硬限制**，要延长只能加交换机中继。" },
        { t: "集线器和交换机差不多", x: "**错误。** 集线器是**物理层广播式复制**（共享带宽、同一冲突域、只能半双工）；交换机是**链路层定向转发**（独享带宽、独立冲突域、可全双工）。" }
      ] }] },
      { id: "s2-quiz", title: "自测练习", icon: "target", blocks: [{ t: "quiz", stage: "s2", items: [
        { q: "Ethernet II 帧的最大帧长（不含前导码与 SFD）是多少？", o: ["1500 字节", "1518 字节", "1522 字节", "64 字节"], a: 1, e: "6 + 6 + 2 + 1500 + 4 = **1518 字节**。带 802.1Q 标签时再加 4 字节 = 1522。" },
        { q: "交换机在转发帧时，学习的是哪个地址、查询的是哪个地址？", o: ["都学目的 MAC", "学习源 MAC，查询目的 MAC", "学习目的 MAC，查询源 MAC", "都学源 MAC"], a: 1, e: "**学习的是「源 MAC」，转发查的是「目的 MAC」**——这是最容易记反的地方。" },
        { q: "下面关于 ARP 的说法，正确的是？", o: ["请求和应答都是广播", "应答是广播，请求是单播", "请求是广播，应答是单播", "两者都只在路由器之间传递"], a: 2, e: "ARP 请求不知道对方 MAC，必须广播；应答方已经从请求中知道了请求者的 MAC，所以用**单播**回复。" },
        { q: "一个 24 口交换机，划分了 3 个 VLAN，那么它有多少个冲突域和广播域？", o: ["24 个冲突域，1 个广播域", "1 个冲突域，3 个广播域", "24 个冲突域，3 个广播域", "3 个冲突域，3 个广播域"], a: 2, e: "交换机**每个端口是独立冲突域**（24 个），**每个 VLAN 是一个广播域**（3 个）。" },
        { q: "关于 STP 阻塞端口，说法正确的是？", o: ["端口被物理关闭了", "端口仍接收并处理 BPDU，只是不转发数据", "端口会丢弃所有报文", "阻塞端口无法恢复"], a: 1, e: "**逻辑阻塞**：物理链路还在，只是不转发数据帧，**仍然接收和处理 BPDU**，主链路故障时可自动激活。" }
      ] }] }
    ]
  });

})();
