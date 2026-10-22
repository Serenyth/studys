/* ============================================================
   阶段六 · 网络设备与拓扑结构
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
  /* 画一个圆角方盒节点 */
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

  /* ============================================================
     可视化 1：设备与工作层次总览（可交互）
     ============================================================ */
  PF.VIZ["s6-devices"] = function (stage) {
    var DEV = [
      { id: "nic", n: "网卡", en: "NIC", lay: "L1 + L2", c: "#4d8dff",
        unit: "比特 / MAC 帧", fn: "让主机接入网络：收发信号、封装解封帧、维护全球唯一的 MAC 地址",
        iso: "不隔离任何域（它属于终端自己）",
        note: "手机 / 笔记本的 WiFi 模块也是网卡——**有 MAC 地址的地方就有网卡**。" },
      { id: "rep", n: "中继器", en: "Repeater", lay: "L1 物理层", c: "#2dd4bf",
        unit: "电 / 光信号", fn: "把衰减的信号放大、整形后再转发，延长传输距离",
        iso: "❌ 不隔离冲突域　❌ 不隔离广播域",
        note: "**只管信号，不认数据。** 早期以太网有 **5-4-3 规则**限制级联层数。" },
      { id: "hub", n: "集线器", en: "Hub", lay: "L1 物理层", c: "#2dd4bf",
        unit: "电 / 光信号", fn: "本质是「多端口中继器」：任一端口收到的数据广播给所有其他端口",
        iso: "❌ 不隔离冲突域　❌ 不隔离广播域",
        note: "**共享总线 + 半双工**，同一时刻只能一台说话。已被交换机全面取代。" },
      { id: "modem", n: "调制解调器", en: "Modem / ONU", lay: "L1 物理层", c: "#2dd4bf",
        unit: "电信号 / 光信号", fn: "数字信号 ↔ 模拟信号（或光信号）的相互转换",
        iso: "❌ 不隔离冲突域　❌ 不隔离广播域",
        note: "家里的「猫」、光纤入户的「光猫（ONU）」都属于这一类。" },
      { id: "bridge", n: "网桥", en: "Bridge", lay: "L2 数据链路层", c: "#9b8cff",
        unit: "MAC 帧", fn: "基于 MAC 地址表转发帧，把一个冲突域切成两个",
        iso: "✅ 隔离冲突域　❌ 不隔离广播域",
        note: "网桥是交换机的「前身」，通常只有两个端口。" },
      { id: "switch", n: "二层交换机", en: "L2 Switch", lay: "L2 数据链路层", c: "#9b8cff",
        unit: "MAC 帧", fn: "多端口网桥，自学习 MAC 地址表，按目的地址定向转发",
        iso: "✅ 每个端口一个冲突域　❌ 整机一个广播域（可用 VLAN 划分）",
        note: "**内网的核心接入设备**。全双工、无冲突、硬件直转。" },
      { id: "l3sw", n: "三层交换机", en: "L3 Switch", lay: "L3 网络层", c: "#ffb454",
        unit: "IP 包", fn: "硬件高速路由 + 交换，是 VLAN 间通信与内网核心的主力",
        iso: "✅ 隔离冲突域　✅ 每个接口一个广播域",
        note: "**对内用三层交换机**——性能极高、端口密度大，但功能相对简单。" },
      { id: "router", n: "路由器", en: "Router", lay: "L3 网络层", c: "#ffb454",
        unit: "IP 包", fn: "跨网段选路转发，并承担 NAT、VPN、QoS、广域网接口",
        iso: "✅ 隔离冲突域　✅ 每个接口一个广播域",
        note: "**对外用路由器**——功能丰富，适合放在网络边界。" },
      { id: "gw", n: "网关", en: "Gateway", lay: "L4 及以上", c: "#57e08a",
        unit: "应用数据", fn: "做协议转换，把两种不同协议的网络连接起来",
        iso: "✅ 隔离冲突域　✅ 隔离广播域",
        note: "日常说的「默认网关」其实是路由器接口；**真正的网关是协议转换器**。" }
    ];

    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="dev-grid">' + DEV.map(function (d) {
        return '<button class="dev-btn" data-dev="' + d.id + '" style="--dc:' + C(d.c) + '">' +
          '<span class="dv-lay">' + d.lay + '</span><b>' + d.n + '</b><em>' + d.en + '</em></button>';
      }).join("") + '</div>' +
      '<div class="dev-detail" id="devDetail"></div>';
    stage.appendChild(wrap);

    var detail = PF.$("#devDetail", wrap);
    function show(id) {
      var d = DEV.filter(function (x) { return x.id === id; })[0];
      if (!d) return;
      PF.$$(".dev-btn", wrap).forEach(function (b) { b.classList.toggle("on", b.dataset.dev === id); });
      detail.style.setProperty("--dc", C(d.c));
      detail.innerHTML =
        '<div class="dd-head"><span class="dd-badge">' + d.lay + '</span>' +
        '<b>' + d.n + '</b><em>' + d.en + '</em></div>' +
        '<div class="dd-grid">' +
        '<div><span>识别单元（PDU）</span><b>' + d.unit + '</b></div>' +
        '<div><span>隔离冲突域 / 广播域</span><b>' + d.iso + '</b></div>' +
        '<div class="full"><span>核心功能</span><b>' + d.fn + '</b></div>' +
        '</div>' +
        '<div class="dd-note">' + PF.rich(d.note) + '</div>';
    }
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("[data-dev]"); if (b) show(b.dataset.dev);
    });
    show("hub");
  };

  /* ============================================================
     可视化 2：六种拓扑结构切换
     ============================================================ */
  PF.VIZ["s6-topo"] = function (stage) {
    var B = .36; // 总线 y
    var MODES = [
      {
        k: "bus", n: "总线型", c: "#4d8dff", bus: true,
        nodes: [[.10, .64], [.30, .64], [.50, .64], [.70, .64], [.90, .64]],
        labels: ["PC1", "PC2", "PC3", "PC4", "PC5"],
        links: [], flow: [[.10, B], [.90, B]], spof: "bus",
        pros: "成本最低、布线最简单、线缆最少",
        cons: "主干一断全网瘫；共享总线冲突多；故障难定位",
        use: "早期小型网络（已淘汰）"
      },
      {
        k: "star", n: "星型", c: "#35e5d4",
        nodes: [[.50, .46], [.50, .12], [.86, .46], [.50, .82], [.14, .46]],
        labels: ["交换机", "PC1", "PC2", "PC3", "PC4"],
        links: [[0, 1], [0, 2], [0, 3], [0, 4]], flow: [1, 0, 3], spof: 0,
        pros: "易安装维护；单节点故障不影响全网；故障易定位",
        cons: "中心节点故障 → 全网瘫（单点）；布线成本较高",
        use: "现代局域网（最常见）"
      },
      {
        k: "ring", n: "环型", c: "#9b8cff",
        nodes: [[.50, .14], [.83, .40], [.71, .78], [.29, .78], [.17, .40]],
        labels: ["PC1", "PC2", "PC3", "PC4", "PC5"],
        links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]], flow: [0, 1, 2, 3], spof: "ring",
        pros: "无数据冲突（令牌控制）；延迟可预测、效率高",
        cons: "单点故障 → 全网中断（除非双环）；加节点要断环",
        use: "令牌环网（历史技术）"
      },
      {
        k: "tree", n: "树型", c: "#ffb454",
        nodes: [[.50, .12], [.27, .42], [.73, .42], [.12, .76], [.40, .76], [.60, .76], [.88, .76]],
        labels: ["核心", "汇聚1", "汇聚2", "接入1", "接入2", "接入3", "接入4"],
        links: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]], flow: [3, 1, 0, 2, 5], spof: 0,
        pros: "易扩展（加分支方便）；分支间故障隔离好",
        cons: "上层节点故障影响下层；根节点仍是单点",
        use: "企业分层网络（接入/汇聚/核心）"
      },
      {
        k: "mesh", n: "网状", c: "#57e08a",
        nodes: [[.22, .20], [.78, .20], [.22, .78], [.78, .78]],
        labels: ["A", "B", "C", "D"],
        links: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]], flow: [0, 1, 3, 2], spof: null,
        pros: "冗余极高，一条路断走另一条；可靠性最强",
        cons: "布线复杂、端口消耗大、成本最高、维护困难",
        use: "广域网骨干、数据中心核心"
      },
      {
        k: "hybrid", n: "混合型", c: "#ff6aa2",
        nodes: [[.50, .12], [.18, .42], [.82, .42], [.06, .76], [.30, .76], [.70, .76], [.94, .76]],
        labels: ["核心A", "核心B", "核心C", "接入1", "接入2", "接入3", "接入4"],
        links: [[0, 1], [0, 2], [1, 2], [1, 3], [1, 4], [2, 5], [2, 6]], flow: [3, 1, 0, 2, 6], spof: null,
        pros: "取长补短：核心层网状保可靠，接入层星型省成本",
        cons: "设计复杂，需要清晰的分层规划",
        use: "几乎所有真实网络"
      }
    ];
    var cur = 0, spofOn = false, D = 3400;

    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="hs-tabs">' + MODES.map(function (m, i) {
        return '<button class="ctrl-btn' + (i === 0 ? " on" : "") + '" data-mode="' + i + '">' + m.n + "</button>";
      }).join("") + '</div>';
    stage.appendChild(wrap);
    var cv = document.createElement("canvas");
    cv.className = "viz-canvas";
    stage.appendChild(cv);
    var cap = document.createElement("div");
    cap.className = "arp-cap";
    stage.appendChild(cap);
    var ctl = document.createElement("div");
    ctl.className = "viz-ctrl";
    ctl.innerHTML = '<button class="ctrl-btn" data-act="spof">' + PF.icon("alert") + "显示单点故障</button>" +
      '<span class="ctrl-field" style="margin-left:auto"><span>数据包路径</span><b style="font-family:var(--font-mono);color:var(--c-cyan)">高亮节点</b></span>';
    stage.appendChild(ctl);

    function flowPts(m) { return m.bus ? m.flow : m.flow.map(function (i) { return m.nodes[i]; }); }

    var scene = PF.Scene(cv, {
      height: 320,
      draw: function (s, t) {
        var ctx = s.ctx, W = s.W, H = s.H;
        ctx.clearRect(0, 0, W, H);
        var m = MODES[cur], mc = C(m.c);
        var pad = 46, iw = W - pad * 2, ih = H - pad * 2;
        var px = function (p) { return pad + p[0] * iw; };
        var py = function (p) { return pad + p[1] * ih; };

        // 网格底
        ctx.strokeStyle = T("grid", "rgba(120,150,190,.14)"); ctx.lineWidth = 1;
        for (var gx = 0; gx <= 8; gx++) {
          ctx.globalAlpha = .35;
          ctx.beginPath(); ctx.moveTo(pad + gx * iw / 8, pad); ctx.lineTo(pad + gx * iw / 8, H - pad); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(pad, pad + gx * ih / 8); ctx.lineTo(W - pad, pad + gx * ih / 8); ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // 总线
        if (m.bus) {
          ctx.strokeStyle = hexA(mc, .55); ctx.lineWidth = 4; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(px([.06, B]), py([0, B])); ctx.lineTo(px([.94, B]), py([0, B])); ctx.stroke();
          ctx.lineWidth = 1.4;
          m.nodes.forEach(function (nd) {
            ctx.strokeStyle = hexA(mc, .35);
            ctx.beginPath(); ctx.moveTo(px(nd), py([0, B])); ctx.lineTo(px(nd), py(nd)); ctx.stroke();
          });
        }

        // 链路
        m.links.forEach(function (l) {
          var a = m.nodes[l[0]], b = m.nodes[l[1]];
          ctx.strokeStyle = T("line", "rgba(120,150,190,.26)"); ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(px(a), py(a)); ctx.lineTo(px(b), py(b)); ctx.stroke();
        });

        // 节点
        m.nodes.forEach(function (nd, i) {
          var isCore = i === 0 && !m.bus;
          box(ctx, px(nd), py(nd), isCore ? 74 : 62, 30, m.c, m.labels[i], null, isCore);
        });

        // 单点故障
        if (spofOn && m.spof !== null) {
          var pu = .5 + .5 * Math.sin(t / 260);
          var RED = T("red", "#ff6b6b");
          if (m.spof === "bus") {
            ctx.strokeStyle = hexA(RED, .35 + .4 * pu);
            ctx.lineWidth = 8; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(px([.06, B]), py([0, B])); ctx.lineTo(px([.94, B]), py([0, B])); ctx.stroke();
          } else if (m.spof === "ring") {
            ctx.strokeStyle = hexA(RED, .4 + .4 * pu); ctx.lineWidth = 5;
            m.links.forEach(function (l) {
              var a = m.nodes[l[0]], b = m.nodes[l[1]];
              ctx.beginPath(); ctx.moveTo(px(a), py(a)); ctx.lineTo(px(b), py(b)); ctx.stroke();
            });
          } else {
            var nd = m.nodes[m.spof];
            ctx.beginPath(); ctx.arc(px(nd), py(nd), 30 + 10 * pu, 0, 6.2832);
            ctx.strokeStyle = hexA(RED, .75 - .5 * pu); ctx.lineWidth = 2.5; ctx.stroke();
            ctx.fillStyle = RED; ctx.font = "600 10px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("单点故障", px(nd), py(nd) - 26);
          }
        }

        // 数据包
        var pts = flowPts(m), seg = [], total = 0;
        for (var i = 0; i < pts.length - 1; i++) {
          var d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
          seg.push(d); total += d;
        }
        var p = (t % D) / D;
        var q = PF.ease.inOutCubic(PF.clamp(p / .62, 0, 1));
        var trav = q * total, k = 0;
        while (k < seg.length - 1 && trav > seg[k]) { trav -= seg[k]; k++; }
        var tt = seg[k] ? trav / seg[k] : 0;
        var cx = PF.lerp(pts[k][0], pts[k + 1][0], tt), cy = PF.lerp(pts[k][1], pts[k + 1][1], tt);
        if (p < .78) {
          var CY = T("cyan", "#35e5d4");
          ctx.beginPath(); ctx.arc(px([cx, cy]), py([cx, cy]), 7, 0, 6.2832);
          ctx.fillStyle = CY; ctx.fill();
          ctx.beginPath(); ctx.arc(px([cx, cy]), py([cx, cy]), 12, 0, 6.2832);
          ctx.strokeStyle = hexA(CY, .45); ctx.lineWidth = 2; ctx.stroke();
        }

        // 说明
        var spofTxt = m.spof === null ? "**无单点故障**——任一条链路断了都能绕行。"
          : m.spof === "bus" ? "**单点故障：整条主干总线**——断一处全网瘫痪。"
            : "**单点故障：中心 / 核心节点**——它一挂，下游全部失联。";
        PF.dom(cap, PF.md('<span class="chip" style="flex-shrink:0;color:' + mc + ';border-color:' + hexA(mc, .4) + '">' + m.n + '</span>' +
          '<span><b>优点</b>：' + m.pros + '　<b>缺点</b>：' + m.cons + '　<b>典型场景</b>：' + m.use +
          (spofOn ? '<br>' + spofTxt : "") + "</span>"));
      }
    });

    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("[data-mode]"); if (!b) return;
      cur = +b.dataset.mode;
      PF.$$("[data-mode]", wrap).forEach(function (x) { x.classList.toggle("on", x === b); });
    });
    ctl.addEventListener("click", function (e) {
      var b = e.target.closest('[data-act="spof"]'); if (!b) return;
      spofOn = !spofOn;
      b.classList.toggle("on", spofOn);
      b.innerHTML = PF.icon("alert") + (spofOn ? "隐藏单点故障" : "显示单点故障");
      if (!scene.running) scene.render();
    });
  };

  /* ============================================================
     可视化 3：冲突域与广播域
     ============================================================ */
  PF.VIZ["s6-domain"] = function (stage) {
    var MODES = [
      {
        k: "hub", n: "集线器场景", c: "#ff6b6b", cd: 1, bd: 1,
        text: "所有设备挂在**同一条共享总线**上 → **只有 1 个冲突域**（同时只能一台说话），也**只有 1 个广播域**。任何一台发数据，全都会收到。"
      },
      {
        k: "sw", n: "交换机场景", c: "#9b8cff", cd: 4, bd: 1,
        text: "交换机的**每个端口是一个独立冲突域**（4 个），所以端口之间互不干扰、可全双工。但**广播帧仍会泛洪到所有端口**，所以整机还是 **1 个广播域**——**要划分广播域得靠 VLAN。**"
      },
      {
        k: "rt", n: "路由器场景", c: "#ffb454", cd: 6, bd: 2,
        text: "路由器**每个接口就是一个独立的广播域**（2 个）——广播帧**不会被路由器转发**。这就是「**隔离广播域靠三层**」的含义，也是限制广播风暴的根本手段。"
      }
    ];
    var cur = 0, D = 4200;
    var wrap = document.createElement("div");
    wrap.innerHTML = '<div class="hs-tabs">' + MODES.map(function (m, i) {
      return '<button class="ctrl-btn' + (i === 0 ? " on" : "") + '" data-dm="' + i + '">' + m.n + "</button>";
    }).join("") + '</div>';
    stage.appendChild(wrap);
    var cv = document.createElement("canvas");
    cv.className = "viz-canvas";
    stage.appendChild(cv);
    var cap = document.createElement("div");
    cap.className = "arp-cap";
    stage.appendChild(cap);
    var lg = document.createElement("div");
    lg.className = "legend";
    lg.innerHTML = '<span><i style="background:rgba(255,107,107,.55)"></i>冲突域</span>' +
      '<span><i style="background:rgba(77,141,255,.5)"></i>广播域</span>' +
      '<span><i style="background:var(--c-cyan)"></i>广播帧</span>';
    stage.appendChild(lg);

    PF.Scene(cv, {
      height: 300,
      draw: function (s, t) {
        var ctx = s.ctx, W = s.W, H = s.H;
        ctx.clearRect(0, 0, W, H);
        var m = MODES[cur], mc = C(m.c);
        var p = (t % D) / D;
        var RED = "#ff6b6b", BLUE = "#4d8dff", CY = T("cyan", "#35e5d4");

        if (m.k === "rt") {
          var rY = .17, sY = .50, pY = .84, rX = .5, sX = [.26, .74], pcs = [];
          sX.forEach(function (sx, gi) {
            for (var i = 0; i < 3; i++) pcs.push([sx + (i - 1) * .145, pY, gi]);
          });
          // 广播域
          [0, 1].forEach(function (gi) {
            ctx.fillStyle = hexA(BLUE, .07);
            rr(ctx, (sX[gi] - .27) * W, (sY - .11) * H, .54 * W, (pY - sY + .16) * H, 16); ctx.fill();
            ctx.strokeStyle = hexA(BLUE, .3); ctx.lineWidth = 1.4; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = hexA(C(BLUE), .95); ctx.font = "600 10.5px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("广播域 " + (gi + 1), sX[gi] * W, (sY - .14) * H);
          });
          // 冲突域
          pcs.forEach(function (pc) {
            ctx.strokeStyle = hexA(RED, .42); ctx.lineWidth = 1.3; ctx.setLineDash([3, 3]);
            rr(ctx, (pc[0] - .09) * W, (pc[1] - .11) * H, .18 * W, .22 * H, 12); ctx.stroke(); ctx.setLineDash([]);
          });
          // 链路
          ctx.strokeStyle = T("line", "rgba(120,150,190,.26)"); ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(rX * W, rY * H); ctx.lineTo(sX[0] * W, sY * H);
          ctx.moveTo(rX * W, rY * H); ctx.lineTo(sX[1] * W, sY * H);
          ctx.stroke();
          pcs.forEach(function (pc) {
            ctx.beginPath(); ctx.moveTo(sX[pc[2]] * W, sY * H); ctx.lineTo(pc[0] * W, pc[1] * H); ctx.stroke();
          });
          box(ctx, rX * W, rY * H, 100, 38, m.c, "路由器", "L3 · 隔离广播域", true);
          sX.forEach(function (sx) { box(ctx, sx * W, sY * H, 88, 34, "#9b8cff", "交换机", "L2 · 端口独立", false); });
          pcs.forEach(function (pc, i) {
            box(ctx, pc[0] * W, pc[1] * H, 52, 26, "#4d8dff", "PC" + (i % 3 + 1 + pc[2] * 3), null, false);
          });
          // 广播帧只在本广播域扩散
          if (p < .85) {
            var from = pcs[0], to = pcs[2];
            var q = PF.ease.outCubic(PF.clamp(p / .55, 0, 1));
            ctx.beginPath();
            ctx.arc(PF.lerp(from[0], to[0], q) * W, PF.lerp(from[1], to[1], q) * H, 7, 0, 6.2832);
            ctx.fillStyle = CY; ctx.fill();
          }
          if (p > .35 && p < .96) {
            ctx.fillStyle = C("#ff6b6b"); ctx.font = "600 10.5px sans-serif"; ctx.textAlign = "center";
            ctx.globalAlpha = .5 + .5 * Math.sin(t / 200);
            ctx.fillText("广播帧被路由器挡住，不会进入另一个广播域", W * .5, H * .32);
            ctx.globalAlpha = 1;
          }
        } else {
          var hub = m.k === "hub";
          var cY = .27, pY2 = .75, cx = .5, xs = [.14, .38, .62, .86];
          // 冲突域
          if (hub) {
            ctx.fillStyle = hexA(RED, .09);
            rr(ctx, .06 * W, .13 * H, .88 * W, .74 * H, 18); ctx.fill();
            ctx.strokeStyle = hexA(RED, .38); ctx.lineWidth = 1.4; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = C("#ff6b6b"); ctx.font = "600 11px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("1 个冲突域（共享总线 · 半双工）", .5 * W, .13 * H - 6);
          } else {
            xs.forEach(function (x) {
              ctx.strokeStyle = hexA(RED, .45); ctx.lineWidth = 1.3; ctx.setLineDash([3, 3]);
              rr(ctx, (x - .10) * W, (cY + .11) * H, .20 * W, (pY2 - cY + .12) * H, 12); ctx.stroke(); ctx.setLineDash([]);
            });
            ctx.fillStyle = C("#ff6b6b"); ctx.font = "600 11px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("4 个独立冲突域（每端口一个 · 全双工）", .5 * W, .13 * H - 6);
          }
          // 广播域
          ctx.fillStyle = hexA(BLUE, .06);
          rr(ctx, .05 * W, .18 * H, .90 * W, .70 * H, 16); ctx.fill();
          ctx.strokeStyle = hexA(BLUE, .32); ctx.lineWidth = 1.4; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = hexA(C(BLUE), .95); ctx.font = "600 10.5px sans-serif"; ctx.textAlign = "left";
          ctx.fillText("1 个广播域（广播帧泛洪到所有端口）", .06 * W, .88 * H);
          // 链路
          ctx.strokeStyle = T("line", "rgba(120,150,190,.26)"); ctx.lineWidth = 1.6;
          xs.forEach(function (x) {
            ctx.beginPath(); ctx.moveTo(cx * W, cY * H); ctx.lineTo(x * W, pY2 * H); ctx.stroke();
          });
          box(ctx, cx * W, cY * H, hub ? 96 : 108, 38, m.c, hub ? "集线器" : "交换机", hub ? "L1 · 广播转发" : "L2 · 定向转发", true);
          xs.forEach(function (x, i) { box(ctx, x * W, pY2 * H, 54, 28, "#4d8dff", "PC" + (i + 1), null, false); });
          // 广播帧
          if (p < .9) {
            var q2 = PF.ease.outCubic(PF.clamp(p / .5, 0, 1));
            xs.forEach(function (x, i) {
              var qq = PF.clamp((p - i * .06) / .5, 0, 1);
              if (qq <= 0) return;
              ctx.beginPath();
              ctx.arc(PF.lerp(cx, x, qq) * W, PF.lerp(cY, pY2, qq) * H, 7, 0, 6.2832);
              ctx.fillStyle = CY; ctx.globalAlpha = qq >= 1 ? .45 : 1; ctx.fill(); ctx.globalAlpha = 1;
            });
            ctx.beginPath(); ctx.arc(cx * W, cY * H, 8 + 26 * q2, 0, 6.2832);
            ctx.strokeStyle = hexA(CY, .6 * (1 - q2)); ctx.lineWidth = 2.5; ctx.stroke();
          }
          if (!hub && p > .55 && p < .95) {
            ctx.fillStyle = C("#ff6b6b"); ctx.font = "600 10.5px sans-serif"; ctx.textAlign = "center";
            ctx.globalAlpha = .55 + .45 * Math.sin(t / 200);
            ctx.fillText("定向转发：只有目的端口收到（冲突域被隔离）", .5 * W, .42 * H);
            ctx.globalAlpha = 1;
          }
        }

        PF.dom(cap, '<span class="chip r" style="flex-shrink:0">冲突域 ×' + m.cd + '　广播域 ×' + m.bd + "</span>" +
          "<span>" + PF.rich(m.text) + "</span>");
      }
    });

    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("[data-dm]"); if (!b) return;
      cur = +b.dataset.dm;
      PF.$$("[data-dm]", wrap).forEach(function (x) { x.classList.toggle("on", x === b); });
    });
  };

  /* ============================================================
     可视化 4：VRRP 主备切换（步骤播放器）
     ============================================================ */
  PF.VIZ["s6-vrrp"] = function (stage) {
    var STEPS = [
      { t: "双网关就绪", d: "两台路由器共享同一个**虚拟 IP（VIP）192.168.1.1**。A 优先级 120，B 优先级 100。终端的默认网关全都填这个 VIP。", a: "idle", b: "idle", vip: true },
      { t: "选举 Master", d: "按优先级选举：**A（120）胜出成为 Master**，实际转发流量；B 成为 Backup，只待命。**优先级默认 100，越大越优先。**", a: "master", b: "backup", vip: true },
      { t: "正常转发", d: "终端 → VIP → **A** → 外网。A 每隔 1 秒向 224.0.0.18 组播一条 **VRRP 通告**，告诉 B「我还活着」。", a: "master", b: "backup", vip: true, flow: true },
      { t: "Master 故障", d: "A 突然宕机，**通告中断**。此时终端仍然把包发往 VIP，但没人响应——**如果只有一台网关，网络就断了**。", a: "down", b: "backup", vip: false },
      { t: "Backup 接管", d: "B 连续 **3 个通告周期**（约 3 秒）收不到 A 的通告，判定 A 已失效，**自动升为 Master 并接管 VIP**。终端**网关 IP 没变、也没改任何配置**——切换对终端完全透明。", a: "down", b: "master", vip: true, flow: true }
    ];
    var step = 0, timer = null;
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<svg viewBox="0 0 720 340" class="viz-canvas" style="height:340px"></svg>' +
      '<div class="hs-desc" id="vrrpDesc"></div>' +
      '<div class="viz-ctrl">' +
      '<button class="ctrl-btn" data-act="play">' + PF.icon("play") + "播放</button>" +
      '<button class="ctrl-btn" data-act="next">' + PF.icon("arrow-right") + "下一步</button>" +
      '<button class="ctrl-btn" data-act="reset">' + PF.icon("reset") + "重置</button>" +
      '<span class="ctrl-field" style="margin-left:auto"><span>步骤</span><b id="vrrpProg" style="font-family:var(--font-mono);color:var(--c-cyan)">1 / 5</b></span>' +
      "</div>";
    stage.appendChild(wrap);
    var svg = PF.$("svg", wrap), desc = PF.$("#vrrpDesc", wrap), prog = PF.$("#vrrpProg", wrap);

    function rtr(o, p, name, prio, state, col) {
      var map = {
        idle: { s: "var(--line-2)", t: "待机", f: "var(--panel-2)" },
        master: { s: col, t: "MASTER · 转发中", f: "color-mix(in srgb," + col + " 15%,transparent)" },
        backup: { s: "var(--c-amber)", t: "BACKUP · 待命", f: "color-mix(in srgb,var(--c-amber) 10%,transparent)" },
        down: { s: "var(--c-red)", t: "故障", f: "color-mix(in srgb,var(--c-red) 10%,transparent)" }
      };
      var m = map[state];
      o.push('<rect x="' + (p.x - 62) + '" y="' + (p.y - 26) + '" width="124" height="52" rx="12" fill="' + m.f + '" stroke="' + m.s + '" stroke-width="1.8"/>');
      o.push('<text x="' + p.x + '" y="' + (p.y - 4) + '" text-anchor="middle" style="font-family:var(--font-display);font-size:12.5px;fill:var(--ink)">' + name + '</text>');
      o.push('<text x="' + p.x + '" y="' + (p.y + 12) + '" text-anchor="middle" style="font-family:var(--font-mono);font-size:10px;fill:var(--muted)">' + prio + '</text>');
      o.push('<text x="' + p.x + '" y="' + (p.y + 44) + '" text-anchor="middle" style="font-size:10.5px;font-weight:600;fill:' + m.s + '">' + m.t + '</text>');
    }
    function draw() {
      var st = STEPS[step], o = [];
      var A = { x: 210, y: 170 }, B = { x: 510, y: 170 };
      var VIP = { x: 360, y: 60 }, NET = { x: 636, y: 64 }, T0 = { x: 360, y: 296 };
      // 连线
      o.push('<line x1="' + VIP.x + '" y1="' + (VIP.y + 26) + '" x2="' + A.x + '" y2="' + (A.y - 26) + '" stroke="var(--line-2)" stroke-width="1.6"/>');
      o.push('<line x1="' + VIP.x + '" y1="' + (VIP.y + 26) + '" x2="' + B.x + '" y2="' + (B.y - 26) + '" stroke="var(--line-2)" stroke-width="1.6"/>');
      o.push('<line x1="' + (A.x + 26) + '" y1="' + (A.y + 22) + '" x2="' + (T0.x - 130) + '" y2="' + (T0.y - 18) + '" stroke="var(--line-2)" stroke-width="1.6"/>');
      o.push('<line x1="' + (B.x - 26) + '" y1="' + (B.y + 22) + '" x2="' + (T0.x + 130) + '" y2="' + (T0.y - 18) + '" stroke="var(--line-2)" stroke-width="1.6"/>');
      o.push('<line x1="' + (A.x + 62) + '" y1="' + (A.y - 6) + '" x2="' + (NET.x - 34) + '" y2="' + NET.y + '" stroke="var(--line-2)" stroke-width="1.6"/>');
      o.push('<line x1="' + (B.x + 62) + '" y1="' + (B.y - 6) + '" x2="' + (NET.x - 34) + '" y2="' + (NET.y + 26) + '" stroke="var(--line-2)" stroke-width="1.6"/>');
      // VIP
      o.push('<rect x="' + (VIP.x - 98) + '" y="' + (VIP.y - 26) + '" width="196" height="48" rx="12" fill="' +
        (st.vip ? "color-mix(in srgb,var(--c-cyan) 14%,transparent)" : "transparent") +
        '" stroke="' + (st.vip ? "var(--c-cyan)" : "var(--line-2)") + '" stroke-width="1.6" ' + (st.vip ? "" : 'stroke-dasharray="5 5"') + "/>");
      o.push('<text x="' + VIP.x + '" y="' + (VIP.y - 5) + '" text-anchor="middle" style="font-family:var(--font-display);font-size:12px;fill:var(--c-cyan)">虚拟网关 VIP</text>');
      o.push('<text x="' + VIP.x + '" y="' + (VIP.y + 13) + '" text-anchor="middle" style="font-family:var(--font-mono);font-size:12.5px;fill:var(--ink)">192.168.1.1</text>');
      rtr(o, A, "路由器 A", "优先级 120", st.a, "var(--c-cyan)");
      rtr(o, B, "路由器 B", "优先级 100", st.b, "var(--c-violet)");
      // 外网
      o.push('<rect x="' + (NET.x - 34) + '" y="' + (NET.y - 22) + '" width="112" height="48" rx="12" fill="var(--panel-2)" stroke="var(--line-2)"/>');
      o.push('<text x="' + (NET.x + 22) + '" y="' + (NET.y + 5) + '" text-anchor="middle" style="font-size:12px;fill:var(--ink-2)">外网 / 互联网</text>');
      // 终端
      o.push('<rect x="' + (T0.x - 152) + '" y="' + (T0.y - 24) + '" width="304" height="48" rx="12" fill="var(--panel-2)" stroke="var(--line-2)"/>');
      o.push('<text x="' + T0.x + '" y="' + (T0.y - 4) + '" text-anchor="middle" style="font-size:11.5px;fill:var(--ink-2)">内网终端（网关统一填 192.168.1.1）</text>');
      o.push('<text x="' + T0.x + '" y="' + (T0.y + 14) + '" text-anchor="middle" style="font-family:var(--font-mono);font-size:10.5px;fill:var(--dim)">192.168.1.10 / 11 / 12 …</text>');
      // 转发路径
      if (st.flow) {
        var masterIsA = st.a === "master";
        var act = masterIsA ? A : B;
        var col = masterIsA ? "var(--c-cyan)" : "var(--c-violet)";
        o.push('<path d="M' + (T0.x - 70) + ' ' + (T0.y - 24) + ' L' + (act.x - 34) + ' ' + (act.y + 30) + '" stroke="' + col + '" stroke-width="2.4" stroke-dasharray="7 6" style="animation:flowDash 1s linear infinite"/>');
        o.push('<path d="M' + (act.x + 44) + ' ' + (act.y - 18) + ' L' + (NET.x - 36) + ' ' + NET.y + '" stroke="' + col + '" stroke-width="2.4" stroke-dasharray="7 6" style="animation:flowDash 1s linear infinite"/>');
      }
      // 心跳 / 故障 / 接管
      if (step === 2) {
        o.push('<line x1="' + (A.x + 34) + '" y1="' + (A.y - 32) + '" x2="' + (B.x - 34) + '" y2="' + (B.y - 32) + '" stroke="var(--c-green)" stroke-width="2" stroke-dasharray="5 5" style="animation:flowDash 1s linear infinite"/>');
        o.push('<text x="360" y="' + (A.y - 40) + '" text-anchor="middle" style="font-family:var(--font-mono);font-size:10.5px;fill:var(--c-green)">VRRP 通告 · 每 1 秒</text>');
      }
      if (step === 3) {
        o.push('<text x="' + A.x + '" y="' + (A.y - 44) + '" text-anchor="middle" style="font-size:20px;fill:var(--c-red)">✕</text>');
        o.push('<text x="360" y="' + (A.y - 40) + '" text-anchor="middle" style="font-size:11px;fill:var(--c-red)">通告中断 —— 网关无人应答</text>');
      }
      if (step === 4) {
        o.push('<text x="360" y="' + (A.y - 40) + '" text-anchor="middle" style="font-family:var(--font-mono);font-size:10.5px;fill:var(--c-violet)">收不到通告 → 升级为 Master</text>');
      }
      svg.innerHTML = o.join("");
      desc.innerHTML = '<span class="chip solid" style="flex-shrink:0">' + st.t + "</span><span>" + PF.rich(st.d) + "</span>";
      prog.textContent = (step + 1) + " / 5";
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; PF.$('[data-act="play"]', wrap).innerHTML = PF.icon("play") + "播放"; } }
    function play() {
      if (timer) { stop(); return; }
      PF.$('[data-act="play"]', wrap).innerHTML = PF.icon("pause") + "暂停";
      if (step >= STEPS.length - 1) step = 0;
      timer = setInterval(function () { if (step >= STEPS.length - 1) { stop(); return; } step++; draw(); }, 1700);
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
     可视化 5：防火墙四代演进
     ============================================================ */
  PF.VIZ["s6-fw"] = function (stage) {
    var GENS = [
      {
        n: "第一代 · 包过滤", c: "#4d8dff", tag: "L3 / L4",
        see: ["源 / 目的 IP", "源 / 目的端口", "协议类型（TCP / UDP / ICMP）"],
        blind: "看不见「内容」，也记不住「上下文」。",
        pro: "速度极快，对性能几乎无影响。",
        con: "只看「信封」不看内容；无法识别应用；容易被端口伪装绕过。",
        fig: [["数据包", "box"], ["五元组匹配", "filter"], ["允许 / 拒绝", "check"]]
      },
      {
        n: "第二代 · 状态检测", c: "#35e5d4", tag: "Stateful",
        see: ["五元组", "**连接状态表**（会话）", "TCP 状态（SYN / ESTABLISHED）"],
        blind: "仍然不看应用层内容。",
        pro: "记住「谁先发起的连接」，只有回程包才放行。",
        con: "对应用层攻击（SQL 注入、恶意文件）无能为力。",
        fig: [["数据包", "box"], ["查连接状态表", "database"], ["建立 / 命中会话", "link"], ["允许 / 拒绝", "check"]]
      },
      {
        n: "第三代 · 应用层代理", c: "#9b8cff", tag: "L7 Proxy",
        see: ["HTTP / FTP 等应用层数据", "URL、方法、文件内容", "完整会话内容"],
        blind: "加密流量（HTTPS）无法深入，除非做中间人解密。",
        pro: "能深入检查内容，可做 URL 过滤、内容审计。",
        con: "**慢**（要拆到应用层重组）；代理模式改变了连接结构。",
        fig: [["数据包", "box"], ["重组到应用层", "layers"], ["内容检查", "eye"], ["允许 / 拒绝", "check"]]
      },
      {
        n: "第四代 · 下一代防火墙 NGFW", c: "#ffb454", tag: "NGFW",
        see: ["应用识别（不只看端口）", "用户 / 身份", "内容 + 威胁情报", "集成 IPS / 防病毒"],
        blind: "能力取决于授权与硬件算力。",
        pro: "一体化：应用识别 + 用户 + 内容 + 威胁防护 + IPS。",
        con: "配置复杂、成本高、对硬件性能要求高。",
        fig: [["数据包", "box"], ["应用 + 用户识别", "users"], ["IPS / AV 检测", "shield"], ["威胁情报比对", "cloud"], ["允许 / 拒绝", "check"]]
      }
    ];
    var wrap = document.createElement("div");
    wrap.innerHTML = PF.ui.tabs(GENS.map(function (g) {
      var gc = C(g.c);
      return {
        t: g.n.split(" · ")[0] + " · " + g.tag,
        x:
          '<div class="fw-fig">' + g.fig.map(function (f, i) {
            return (i ? '<span class="ff-arw">' + PF.icon("arrow-right") + "</span>" : "") +
              '<span class="ff-box" style="--fc:' + gc + '">' + PF.icon(f[1]) + "<b>" + f[0] + "</b></span>";
          }).join("") + "</div>" +
          '<div class="fw-head"><b style="color:' + gc + '">' + g.n + '</b><span class="chip" style="color:' + gc + ";border-color:" + hexA(gc, .4) + '">' + g.tag + "</span></div>" +
          '<div class="fw-cols">' +
          '<div class="fw-col"><span>能看到什么</span><ul>' + g.see.map(function (x) { return "<li>" + PF.rich(x) + "</li>"; }).join("") + "</ul></div>" +
          '<div class="fw-col"><span>看不到什么</span><p>' + PF.rich(g.blind) + "</p></div>" +
          "</div>" +
          '<div class="fw-pc"><div class="pc pro"><span>优势</span><p>' + PF.rich(g.pro) + '</p></div>' +
          '<div class="pc con"><span>局限</span><p>' + PF.rich(g.con) + "</p></div></div>"
      };
    }));
    stage.appendChild(wrap);
  };

  /* ============================================================
     可视化 6：正向代理 vs 反向代理
     ============================================================ */
  PF.VIZ["s6-proxy"] = function (stage) {
    var cv = document.createElement("canvas");
    cv.className = "viz-canvas";
    stage.appendChild(cv);
    var cap = document.createElement("div");
    cap.className = "arp-cap";
    stage.appendChild(cap);
    var D = 5200;

    PF.Scene(cv, {
      height: 330,
      draw: function (s, t) {
        var ctx = s.ctx, W = s.W, H = s.H;
        ctx.clearRect(0, 0, W, H);
        var p = (t % D) / D;
        var lanes = [
          { y: .27, c: "#4d8dff", t: "正向代理", sub: "代理客户端 · 服务器不知道真实客户端" },
          { y: .73, c: "#35e5d4", t: "反向代理", sub: "代理服务器 · 客户端不知道真实服务器" }
        ];
        lanes.forEach(function (L, li) {
          var lc = C(L.c);
          var cy = L.y * H;
          var x1 = W * .09, x2 = W * .38, x3 = W * .65, x4 = W * .90;
          ctx.fillStyle = T("grid", "rgba(120,150,190,.14)");
          ctx.globalAlpha = .55; rr(ctx, 6, cy - 62, W - 12, 124, 14); ctx.fill(); ctx.globalAlpha = 1;

          ctx.fillStyle = lc; ctx.font = "600 12.5px 'Chakra Petch',sans-serif"; ctx.textAlign = "left";
          ctx.fillText(L.t, 16, cy - 42);
          ctx.fillStyle = T("muted", "#7f8da3"); ctx.font = "10.5px sans-serif";
          ctx.fillText(L.sub, 16, cy - 28);

          ctx.strokeStyle = T("line", "rgba(120,150,190,.26)"); ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(x1 + 34, cy); ctx.lineTo(x2 - 42, cy);
          ctx.moveTo(x2 + 42, cy); ctx.lineTo(x3 - 40, cy);
          ctx.moveTo(x3 + 40, cy); ctx.lineTo(x4 - 36, cy);
          ctx.stroke();

          box(ctx, x1, cy, 68, 34, lc, "客户端", null, false);
          box(ctx, x2, cy, 80, 36, L.c, "代理", li === 0 ? "正向" : "反向", true);
          if (li === 0) {
            box(ctx, x3, cy, 86, 34, "#9b8cff", "源站服务器", null, false);
            box(ctx, x4, cy, 74, 30, "#7f8da3", "其他服务器", null, false);
          } else {
            box(ctx, x3, cy, 78, 34, "#9b8cff", "后端 1", null, false);
            box(ctx, x4, cy, 78, 34, "#9b8cff", "后端 2", null, false);
          }

          var path = li === 0 ? [x1, x2, x3, x4] : [x1, x2, x3, x4];
          var q = PF.clamp(p / .8, 0, 1);
          var n = path.length - 1, k = Math.min(n - 1, Math.floor(q * n)), tt = q * n - k;
          var pxx = PF.lerp(path[k], path[k + 1], tt);
          var CY = T("cyan", "#35e5d4");
          ctx.beginPath(); ctx.arc(pxx, cy, 7, 0, 6.2832); ctx.fillStyle = CY; ctx.fill();
          ctx.beginPath(); ctx.arc(pxx, cy, 12, 0, 6.2832);
          ctx.strokeStyle = hexA(CY, .4); ctx.lineWidth = 2; ctx.stroke();
        });
        PF.dom(cap, '<span class="chip solid" style="flex-shrink:0">核心区别</span><span>' +
          "<b>正向代理代理的是客户端</b>——客户端主动配置代理，服务器只看到代理的 IP（科学上网、企业上网审计、突破访问限制）；" +
          "<b>反向代理代理的是服务器</b>——客户端以为在直连服务器，实际由 Nginx / 负载均衡器接收请求再转发给后端（负载均衡、SSL 卸载、缓存、隐藏后端结构）。" +
          "<br><b>一句话：正向代理「客户端知道自己在用代理，服务器不知道」；反向代理「客户端不知道自己在用代理，服务器知道」。</b></span>");
      }
    });
  };

  /* ============ 注册阶段 ============ */
  PF.register({
    id: "s6", num: 6, title: "网络设备与拓扑结构", short: "设备与拓扑",
    icon: "network", accent: "var(--c-teal)", difficulty: 2, duration: "1.5 周", level: "★★★☆☆",
    tagline: "协议是「看不见的规则」，设备是「看得见的盒子」。这一阶段把前五阶段的逻辑，落到真实的硬件与连线上——看到设备就想到它工作在几层、能隔离什么域。",
    tags: ["交换机", "路由器", "防火墙", "拓扑", "VRRP"],
    lead: "**设备工作在哪一层，就「看得懂」那一层的数据。** 这一阶段的核心不是背设备清单，而是建立三张图：**层次图**（谁在哪层）、**拓扑图**（怎么连）、**组网图**（真实企业网长什么样）。",
    sections: [
      {
        id: "s6-1", title: "为什么单学协议还不够", icon: "bulb",
        blocks: [
          { t: "p", x: "前五个阶段学的都是**协议**——OSI 分层、TCP 握手、HTTP 报文……这些是「规则」，属于**逻辑**层面。但真实世界里，规则必须跑在**硬件设备**上：" },
          { t: "table", head: ["协议（逻辑）", "对应设备（物理）"], rows: [["IP 路由规则", "路由器 / 三层交换机"], ["MAC 转发规则", "交换机 / 网桥"], ["以太网信号", "网卡 / 集线器 / 中继器"], ["HTTP 报文", "服务器 / 负载均衡器"]] },
          { t: "callout", kind: "key", title: "核心记忆：设备工作在哪一层，就「看得懂」那一层的数据", x: "网卡 / 中继器 / 集线器只认**信号**；网桥 / 交换机认**MAC 帧**；路由器 / 三层交换机认**IP 包**；网关处理**应用数据**。**判断一台设备的能力，先问它在第几层。**" },
          { t: "p", x: "学完这一阶段，你应该能在脑子里建立**三张图**：" },
          { t: "table", head: ["图景", "回答什么问题"], rows: [["**层次图**", "每种设备工作在 OSI 哪一层？识别什么？能隔离什么域？"], ["**拓扑图**", "一堆设备怎么连？星型 / 环型 / 网状各自适合什么场景？"], ["**组网图**", "一个真实的企业网络，从终端到互联网，中间经过哪些设备？"]] },
          { t: "callout", kind: "tip", title: "学习心法", x: "**不要把设备当成孤立的知识点记**，而是「看到设备就想到它工作在几层、解决什么问题」。后面所有内容都是这个框架的展开。" }
        ]
      },
      {
        id: "s6-2", title: "设备与工作层次总览", icon: "layers",
        blocks: [
          { t: "p", x: "先建立全局印象：**点击下方任一设备，查看它工作在哪一层、识别什么、能隔离什么域。**" },
          { t: "viz", id: "s6-devices", icon: "layers", title: "设备 × OSI 层次 · 交互式总览", sub: "点击设备卡片，查看它的层次 / PDU / 隔离能力", tag: "Interactive", note: "**最容易混淆的三组**：① **集线器 vs 交换机**——前者「广播给所有人」，后者「只发给目标」；② **二层交换机 vs 三层交换机**——前者只认 MAC，后者还能路由 IP；③ **三层交换机 vs 路由器**——功能重叠，但「主内」还是「主外」不同。" },
          { t: "table", head: ["设备", "工作层次", "识别单元", "隔离冲突域", "隔离广播域"], rows: [["**网卡 NIC**", "L1 + L2", "比特 / MAC 帧", "—", "—"], ["**中继器**", "L1", "电 / 光信号", "❌", "❌"], ["**集线器 Hub**", "L1", "电 / 光信号", "❌", "❌"], ["**调制解调器**", "L1", "电信号", "❌", "❌"], ["**网桥 Bridge**", "L2", "MAC 帧", "✅", "❌"], ["**二层交换机**", "L2", "MAC 帧", "✅", "❌（可用 VLAN 划分）"], ["**三层交换机**", "L3", "IP 包", "✅", "✅"], ["**路由器**", "L3", "IP 包", "✅", "✅"], ["**网关**", "应用层及以上", "应用数据", "✅", "✅"]] },
          { t: "callout", kind: "info", title: "PDU（协议数据单元）速记", x: "物理层 = **比特**；数据链路层 = **帧**；网络层 = **包**；传输层 = **段 / 数据报**；应用层 = **报文**。**设备「看懂的 PDU」决定了它的工作层次。**" }
        ]
      },
      {
        id: "s6-3", title: "物理层设备：网卡、中继器、集线器", icon: "plug",
        blocks: [
          { t: "p", x: "**网卡（NIC）** 横跨物理层与数据链路层，是主机接入网络的接口。每块网卡都有**全球唯一的 MAC 地址**。它的职责：信号收发、MAC 地址、帧的封装解封、介质访问控制（CSMA/CD 或全双工控制）、FCS 校验。" },
          { t: "callout", kind: "tip", title: "有 MAC 地址的地方就有网卡", x: "手机、笔记本的 **WiFi 模块也是网卡**（无线网卡），只不过介质从双绞线换成了无线电波。" },
          { t: "p", x: "**中继器（Repeater）** 解决信号衰减问题：把衰减的信号**放大、整形后转发**，延长传输距离。**关键词：只管信号，不认数据。** 它不识别 MAC、不识别 IP，收到什么就原样放大转发什么。" },
          { t: "callout", kind: "warn", title: "5-4-3 规则", x: "早期共享式以太网的组网限制：**最多 5 个网段、4 个中继器、3 个网段可接设备**。原因是信号经多次中继后，往返时延会超过争用期（51.2 μs），CSMA/CD 就会失效。" },
          { t: "p", x: "**集线器（Hub）** 本质是「**多端口中继器**」，工作在物理层，所有端口**共享同一条总线**。核心行为：**任意端口收到的数据，会广播给所有其他端口。** 它是半双工设备——同一时刻只能有一台说话，否则冲突。" },
          { t: "table", head: ["对比项", "集线器 Hub（L1）", "交换机 Switch（L2）"], rows: [["转发方式", "**广播给所有端口**", "**只发给目的端口**（查 MAC 表）"], ["冲突域", "所有端口共享 **1 个**", "**每个端口 1 个**，互不干扰"], ["双工模式", "**半双工**（会冲突）", "**全双工**（可同时收发）"], ["带宽", "所有端口**共享**总带宽", "每个端口**独享**带宽"], ["现状", "已淘汰", "内网核心接入设备"]] },
          { t: "p", x: "**调制解调器（Modem）** 做**数字信号 ↔ 模拟信号**的转换。家里宽带用的「猫」、光纤入户的「光猫（ONU，光网络单元）」都属于这一类。" }
        ]
      },
      {
        id: "s6-4", title: "数据链路层设备：网桥与交换机", icon: "grid",
        blocks: [
          { t: "p", x: "**网桥（Bridge）** 工作在数据链路层，基于 **MAC 地址表**转发帧。它的历史意义在于**把一个冲突域切成两个**——只有需要跨网桥的帧才会被转发过去。" },
          { t: "p", x: "**二层交换机** 本质是「**多端口网桥**」。它通过**自学习**建立 MAC 地址表：收到帧时，把**源 MAC + 入端口**记下来；转发时查表找目的端口，找不到就**泛洪**。这就是为什么第一次通信总是「先泛洪、后定向」。" },
          { t: "table", head: ["交换机的三种转发行为", "触发条件", "动作"], rows: [["**泛洪 Flooding**", "目的 MAC 不在表中 / 是广播帧", "从**除入端口外**的所有端口发出"], ["**转发 Forwarding**", "目的 MAC 在表中，且端口 ≠ 入端口", "只从**对应端口**发出"], ["**丢弃 Filtering**", "目的 MAC 在表中，且端口 = 入端口", "**丢弃**（目标就在这个口，不用转发）"]] },
          { t: "callout", kind: "key", title: "MAC 地址表是有老化时间的", x: "表项默认老化时间约 **300 秒**。设备长时间不发帧，表项会被删除——下次再通信又会泛洪一次。**这是「重启网络后第一波流量变慢」的原因之一。**" },
          { t: "p", x: "**VLAN（虚拟局域网）** 是给二层交换机做「**逻辑分区**」：物理上是一台交换机，逻辑上被切成多个互不干扰的广播域。**VLAN 是隔离广播域最常用的手段**，也是「二层交换机不隔离广播域」这个缺陷的补丁。" },
          { t: "table", head: ["VLAN 相关概念", "说明"], rows: [["**Access 口**", "接终端，只属于一个 VLAN，进出都不带标签"], ["**Trunk 口**", "交换机之间互联，可承载多个 VLAN，用 **802.1Q 标签**区分"], ["**SVI**", "交换机虚拟接口，每个 VLAN 的网关（三层交换机上）"], ["**VLAN 间通信**", "二层隔离，必须经过**三层**（三层交换机或路由器）"]] }
        ]
      },
      {
        id: "s6-5", title: "网络层设备：路由器与三层交换机", icon: "route",
        blocks: [
          { t: "p", x: "**路由器（Router）** 工作在网络层，识别 **IP 包**。它的核心能力是**跨网段选路转发**：查路由表 → 决定下一跳 → 改 TTL → 重算校验和 → 重新封装二层帧。同时它还承担 **NAT、VPN、QoS、广域网接口** 等边界职能。" },
          { t: "table", head: ["对比项", "二层交换机", "三层交换机", "路由器"], rows: [["工作层次", "L2", "L3", "L3（+ L4 以上）"], ["识别", "MAC 帧", "IP 包", "IP 包"], ["转发性能", "硬件直转，**极高**", "硬件路由，**很高**", "相对低"], ["端口密度", "**高**", "**高**", "低"], ["功能丰富度", "低", "中", "**高**（NAT/VPN/QoS/WAN）"], ["定位", "接入层", "**内网核心**", "**网络边界**"]] },
          { t: "callout", kind: "key", title: "「对内三层交换机，对外路由器」", x: "三层交换机**性能极高、端口密度大，但功能相对简单**，适合内网高速转发；路由器**功能丰富但端口少**，适合放在出口做 NAT、VPN、策略。**两者不是替代关系，而是分工关系。**" },
          { t: "p", x: "**网关（Gateway）** 有两种含义：① 日常说的「**默认网关**」其实是路由器上的一个接口地址，是主机出网的第一跳；② 严格意义上的网关是**协议转换器**，用来连接两种不同协议的网络（如 IPX ↔ IP）。" }
        ]
      },
      {
        id: "s6-6", title: "冲突域与广播域", icon: "target",
        blocks: [
          { t: "p", x: "这两个概念是**设备与组网的分水岭**，必须彻底搞清。" },
          { t: "callout", kind: "info", title: "冲突域 vs 广播域", x: "**冲突域（Collision Domain）**：同一时间只允许**一台**设备发送数据的范围。多台同时发就会「碰撞」，数据损坏需重传——产生原因是**共享介质**。**广播域（Broadcast Domain）**：**广播帧能传播到的所有设备**的范围。广播域过大会引发**广播风暴**，占用大量带宽拖垮网络。" },
          { t: "viz", id: "s6-domain", icon: "target", title: "冲突域与广播域 · 三种场景对比", sub: "切换集线器 / 交换机 / 路由器，看域如何被切分", tag: "Interactive", note: "**一句话记忆**：**隔离冲突域靠「二层」**（交换机每端口独立冲突域）；**隔离广播域靠「三层」**（路由器 / 三层交换机每接口独立广播域）**或 VLAN**。" },
          { t: "table", head: ["设备", "隔离冲突域？", "隔离广播域？"], rows: [["中继器 / 集线器（L1）", "❌", "❌"], ["网桥 / 二层交换机（L2）", "✅（每端口一个）", "❌（整机一个，**可用 VLAN 划分**）"], ["路由器 / 三层交换机（L3）", "✅", "✅（**每接口一个**）"]] },
          { t: "callout", kind: "danger", title: "广播风暴（Broadcast Storm）", x: "当网络存在**二层环路**且没有 STP 时，广播帧会在环里**无限循环、不断复制**，瞬间耗尽带宽导致网络瘫痪。**这就是「隔离广播域」和「部署 STP」的根本原因。**" }
        ]
      },
      {
        id: "s6-7", title: "安全与优化设备", icon: "shield",
        blocks: [
          { t: "p", x: "前面讲的是「转发」设备，这里讲「**保护**」和「**加速**」的设备。" },
          { t: "p", x: "**防火墙** 部署在网络边界，按预设规则**允许或拒绝**流量。它经历了四代演进——**点击下方标签页，逐代查看它「能看到什么、看不到什么」。**" },
          { t: "viz", id: "s6-fw", icon: "shield", title: "防火墙四代演进 · 检查能力的递进", sub: "包过滤 → 状态检测 → 应用层代理 → NGFW", tag: "Tabs", note: "**记忆线索**：第一代看「信封」（IP / 端口），第二代加「记忆」（连接状态表），第三代看「内容」（应用层数据），第四代加「情报」（应用识别 + 用户 + 威胁情报 + IPS）。**检查越深，越安全，也越慢。**" },
          { t: "table", head: ["设备", "全称", "职责"], rows: [["**IDS**", "Intrusion Detection System", "检测攻击，**只告警不阻断**"], ["**IPS**", "Intrusion Prevention System", "检测**并阻断**攻击"], ["**WAF**", "Web Application Firewall", "专防 SQL 注入、XSS 等 Web 攻击"], ["**负载均衡器 LB**", "Load Balancer", "把请求分发到多台服务器；可做 **SSL 卸载**"], ["**VPN 网关**", "Virtual Private Network", "在公网上建立加密隧道"]] },
          { t: "p", x: "**正向代理 vs 反向代理** 是最容易被「方向」这个词带偏的一对概念。**核心区别不是方向，而是「代理谁」。**" },
          { t: "viz", id: "s6-proxy", icon: "exchange", title: "正向代理 vs 反向代理 · 谁在中间", sub: "同样的「中间人」，代理的对象完全不同", tag: "Animation", note: "**正向代理代理客户端**（服务器不知道真实客户端）；**反向代理代理服务器**（客户端不知道真实服务器）。**方向只是表象，代理对象才是本质。**" },
          { t: "callout", kind: "warn", title: "有了防火墙就不需要 IDS/IPS 了？", x: "**三者职责不同**：防火墙管「**能不能进**」（访问控制），IDS 只**检测告警**，IPS **检测并阻断**。现代常把它们融合在 NGFW 里，但**概念上不是一回事**。" }
        ]
      },
      {
        id: "s6-8", title: "无线网络设备", icon: "wifi",
        blocks: [
          { t: "p", x: "无线网络的两大件：**AP（接入点）** 负责把有线转成无线，**AC（无线控制器）** 负责集中管理一堆 AP。二者之间用 **CAPWAP 协议**通信（控制隧道 + 数据隧道）。" },
          { t: "table", head: ["类型", "特点", "适用场景"], rows: [["**胖 AP（Fat AP）**", "自带完整功能，**独立配置、各自为政**", "家庭、小办公室（几台 AP）"], ["**瘦 AP（Fit AP）**", "只负责收发，配置与策略**全部由 AC 下发**", "企业、商场、校园（几十上百台）"]] },
          { t: "p", x: "**PoE（以太网供电）** 让一根网线同时传数据和电——AP、摄像头不需要单独拉电源线，这是 AP 能装在天花板上的前提。" },
          { t: "p", x: "**无线组网拓扑**：**自治式**（每个胖 AP 独立）、**集中式**（AC + 瘦 AP，主流）、**分布式 / 云管理**（AC 功能上云）。" }
        ]
      },
      {
        id: "s6-9", title: "网络拓扑结构", icon: "shuffle",
        blocks: [
          { t: "p", x: "**拓扑结构（Topology）** 指设备之间的物理或逻辑连接方式。它决定了网络的**可靠性、成本、扩展性和故障影响范围**。**切换下方标签，观察六种拓扑的形状与数据包路径，还可以打开「单点故障」高亮。**" },
          { t: "viz", id: "s6-topo", icon: "shuffle", title: "六种基本拓扑 · 形态与单点故障", sub: "总线 / 星型 / 环型 / 树型 / 网状 / 混合", tag: "Animation", note: "**选择原则**：终端接入 → **星型**；企业分层 → **树型**；核心骨干 / 广域 → **网状**；真实网络 → **混合型**。**没有最好的拓扑，只有最合适的拓扑。**" },
          { t: "table", head: ["拓扑", "成本", "可靠性", "扩展性", "故障影响", "典型场景"], rows: [["**总线型**", "低", "低", "差", "主干断 → 全网瘫", "早期小型网"], ["**星型**", "中", "中", "好", "中心断 → 全网瘫", "**现代局域网**"], ["**环型**", "中", "中", "差", "单点断 → 全网中断", "令牌环网（历史）"], ["**树型**", "中高", "中高", "**好**", "上层断 → 影响下层", "**企业分层网**"], ["**网状**", "**高**", "**极高**", "中", "影响小", "**广域网骨干**"], ["**混合型**", "视组合", "高", "好", "视设计", "**几乎所有真实网络**"]] },
          { t: "callout", kind: "tip", title: "全互联 vs 部分互联", x: "**全互联（Full Mesh）**：每两个节点都直连，N 个节点需要 N(N−1)/2 条链路——成本极高，只用于极少数核心。**部分互联（Partial Mesh）**：关键节点多条路径、非关键节点单连——**性价比之选**，广域网核心与数据中心骨干常用。" }
        ]
      },
      {
        id: "s6-10", title: "层次化组网：接入 / 汇聚 / 核心", icon: "layers3",
        blocks: [
          { t: "p", x: "**三层网络架构（Three-Tier Architecture）** 把网络按功能分成三层，是园区网、校园网、企业内网的经典设计。" },
          { t: "table", head: ["层次", "职责", "典型设备", "关键点"], rows: [["**核心层 Core**", "**高速骨干转发**", "高性能三层交换机", "**只做高速转发，不做复杂策略**"], ["**汇聚层 Aggregation**", "**收敛流量、策略控制、网关**", "三层交换机", "**ACL、路由、安全策略、VLAN 网关下沉于此**"], ["**接入层 Access**", "**终端接入、端口安全**", "二层交换机、AP", "**端口密度大、成本敏感、PoE 供电**"]] },
          { t: "callout", kind: "key", title: "为什么核心层「不做复杂策略」", x: "核心层承载**全网流量**，任何一条策略匹配都会放大成全网延迟。**越简单越快。** 所以复杂策略要**下沉到汇聚层**，终端控制放在**接入层**——这就是「**核心只管快**」的含义。" },
          { t: "p", x: "**三层架构的优势**：模块化（每层职责清晰）、易扩展（横向加接入交换机即可）、故障域可控（分支故障不影响其他分支）、策略集中（汇聚层统一管控）。" },
          { t: "p", x: "**现代演进**：虚拟化与云数据中心推动了 **大二层 + VXLAN**。VXLAN 用 UDP 封装二层帧，在三层网络上构建**逻辑大二层**，突破了 VLAN 只有 4094 个的限制，并支持虚拟机跨机房迁移。" }
        ]
      },
      {
        id: "s6-11", title: "冗余与高可用", icon: "shield-check",
        blocks: [
          { t: "p", x: "**高可用（HA）** 的核心思想：**任何单点故障都不应该导致业务中断**。冗余可以在多个层次上做。" },
          { t: "table", head: ["技术", "冗余什么", "解决什么问题", "典型场景"], rows: [["**链路聚合**", "链路", "带宽不足 + 链路故障", "交换机间、服务器上联"], ["**堆叠 / M-LAG**", "设备", "单台设备故障 + 简化管理", "核心 / 汇聚双机"], ["**VRRP / HSRP**", "网关", "网关单点故障", "内网出口网关"], ["**双机热备**", "关键设备", "设备整体故障", "防火墙、负载均衡器"], ["**STP / MSTP**", "路径", "二层环路 + 链路冗余", "有冗余链路的二层网络"], ["**双上行**", "链路路径", "上联链路故障", "接入 → 汇聚"]] },
          { t: "callout", kind: "info", title: "链路聚合（Link Aggregation）", x: "把**多条物理链路捆成一条逻辑链路**，同时获得**带宽叠加**与**链路冗余**。标准协议是 **LACP**（思科叫 EtherChannel，华为叫 Eth-Trunk）。**注意：单个数据流仍走同一条物理链路**（受哈希算法限制），所以**单流速度不会叠加**——多条流才能跑满总带宽。" },
          { t: "p", x: "**堆叠（Stacking）** 把多台交换机**虚拟成一台**统一管理，简化运维并获得设备冗余。它的风险是「**一挂全挂**」——所以出现了 **M-LAG（跨设备链路聚合）**：两台独立交换机对下游表现为一台，兼顾设备冗余与链路聚合，**替代传统堆叠**。" },
          { t: "p", x: "**VRRP（虚拟路由冗余协议）** 解决网关单点故障：把多台路由器虚拟成一台，对外提供**一个虚拟 IP（VIP）**作为网关。主设备（Master）转发，备设备（Backup）待命，主故障时备**秒级接管**。**终端的网关 IP 永远不变，切换对终端透明。**" },
          { t: "viz", id: "s6-vrrp", icon: "route", title: "VRRP 主备切换 · 终端无感知的网关冗余", sub: "逐步播放，看 Master 故障后 Backup 如何接管", tag: "Step Player", note: "**关键机制**：**虚拟 IP（VIP）** 主备共享；**优先级** 高的当 Master（默认 100，越大越优先）；**抢占** 决定原主恢复后是否抢回角色；**心跳报文** 主设备周期性发送 VRRP 通告，备设备连续 3 个周期收不到就接管。**HSRP** 是思科的私有同类协议，**VRRP 是国际标准**，现在主流用 VRRP。" },
          { t: "callout", kind: "ok", title: "组合使用才是王道", x: "一个高可用企业网络往往**同时用**：「双核心堆叠 + 链路聚合 + VRRP 网关 + MSTP 防环」。**冗余不是单点技术，而是一整套设计。**" }
        ]
      },
      {
        id: "s6-12", title: "无线网络技术", icon: "radio",
        blocks: [
          { t: "p", x: "**802.11** 是无线局域网（WLAN，即 WiFi）的 IEEE 标准族。" },
          { t: "table", head: ["标准", "俗称", "频段", "理论速率", "关键特性"], rows: [["802.11n", "WiFi 4", "2.4 / 5 GHz", "600 Mbps", "引入 **MIMO** 多天线"], ["802.11ac", "WiFi 5", "5 GHz", "6.9 Gbps", "更宽信道、MU-MIMO 下行"], ["802.11ax", "WiFi 6", "2.4 / 5 GHz", "9.6 Gbps", "**OFDMA**、MU-MIMO 上下行、高密度优化"], ["802.11be", "WiFi 7", "2.4 / 5 / 6 GHz", "46 Gbps", "**MLO** 多链路聚合、4096-QAM"]] },
          { t: "table", head: ["频段", "特点"], rows: [["**2.4 GHz**", "穿墙强、覆盖广，但**只有 3 个互不重叠信道**（1 / 6 / 11），干扰严重、速率低"], ["**5 GHz**", "信道多（20+ 个）、干扰少、速率高，但**穿墙弱、覆盖小**"], ["**6 GHz**", "WiFi 6E / WiFi 7 使用，**完全干净**、信道极多，覆盖更小"]] },
          { t: "callout", kind: "tip", title: "2.4G 只规划 1 / 6 / 11", x: "2.4 GHz 频段相邻信道会互相重叠，**只有 1、6、11 三个信道完全不重叠**。多 AP 部署时必须错开这三个信道，否则会互相干扰——**这是无线调优的第一课**。" },
          { t: "table", head: ["无线加密", "安全性", "说明"], rows: [["**WEP**", "❌ **已被彻底攻破**", "几分钟即可破解，绝对不能用"], ["**WPA / TKIP**", "⚠️ 已不安全", "过渡方案，已被破解"], ["**WPA2 / AES-CCMP**", "✅ 安全", "长期主流标准，目前仍广泛使用"], ["**WPA3 / SAE**", "✅✅ 最安全", "抗离线字典攻击、前向保密、支持 192 位加密套件"]] },
          { t: "callout", kind: "warn", title: "隐藏 SSID 不是安全措施", x: "**隐藏 SSID 挡不住任何人。** 抓包工具能轻易发现隐藏的 SSID，因为管理帧里仍然带着它。**真正的安全靠 WPA2/WPA3 加密。**" }
        ]
      },
      {
        id: "s6-13", title: "广域网接入方式", icon: "globe",
        blocks: [
          { t: "table", head: ["接入方式", "介质", "特点"], rows: [["**以太网专线**", "光纤", "企业主流，带宽稳定、上下行对称"], ["**PON / 光纤入户**", "光纤", "家庭与中小企业主流，成本低"], ["**PPPoE 拨号**", "光纤 / 铜线", "家庭宽带，**认证 + 动态分配 IP**"], ["**MPLS VPN**", "运营商网络", "企业专网，**确定性低延迟、低抖动**"], ["**SD-WAN**", "多种线路叠加", "软件定义调度，智能选路、成本优化"], ["**4G / 5G 无线**", "无线电", "应急备份、移动场景、偏远地区"]] },
          { t: "p", x: "**PPPoE**：家庭宽带为什么「要拨号」？因为它把 **PPP 协议**（认证 + 会话管理）**封装在以太网上**。你输入的账号密码由运营商的 **BRAS（宽带远程接入服务器）** 验证，通过后分配一个公网 IP。**这既是认证手段，也是运营商的用户管理手段。**" },
          { t: "p", x: "**MPLS** 在企业专网里用「**标签转发**」代替逐跳查路由表：入口打标签，中间设备只按标签转发（速度极快），出口弹标签。它天然支持 **VPN 隔离**与 **流量工程**，能提供**确定性的低延迟、低抖动**——这是普通互联网线路做不到的。" },
          { t: "callout", kind: "warn", title: "SD-WAN ≠ 便宜的 MPLS", x: "**SD-WAN 是「管理调度体系」，不是线路本身。** 它的质量**取决于底层链路**。要**确定性（低延迟、低抖动）**，仍然需要专线 / MPLS。**现代做法是混合使用**：关键业务走专线，普通流量走宽带 / 4G，由 SD-WAN 统一调度。" }
        ]
      },
      { id: "s6-terms", title: "术语速查表", icon: "list", blocks: [{ t: "terms", items: [
        { t: "NIC", en: "Network Interface Card", d: "网卡，主机接入网络的接口，带全球唯一 MAC 地址" },
        { t: "Hub / Repeater", en: "—", d: "物理层设备；集线器是多端口中继器，广播转发" },
        { t: "Bridge / Switch", en: "—", d: "二层设备；网桥两端口，交换机多端口，按 MAC 表定向转发" },
        { t: "L3 Switch", en: "Layer 3 Switch", d: "三层交换机，兼具交换与路由，内网核心设备" },
        { t: "Router / Gateway", en: "—", d: "三层跨网段转发 / 协议转换设备（或默认出口）" },
        { t: "冲突域", en: "Collision Domain", d: "同一时刻只能一台设备发送的范围；二层设备隔离" },
        { t: "广播域", en: "Broadcast Domain", d: "广播帧能到达的范围；三层设备或 VLAN 隔离" },
        { t: "广播风暴", en: "Broadcast Storm", d: "二层环路导致广播帧无限复制，耗尽带宽" },
        { t: "VLAN / Trunk / SVI", en: "—", d: "逻辑分区 / 承载多 VLAN 的干道口 / 每个 VLAN 的三层网关接口" },
        { t: "STP / MSTP", en: "Spanning Tree Protocol", d: "生成树协议，通过阻塞冗余端口防二层环路" },
        { t: "链路聚合 / LACP", en: "Link Aggregation", d: "多条物理链路捆成一条，带宽叠加 + 链路冗余" },
        { t: "堆叠 / M-LAG", en: "Stacking", d: "多台设备虚拟成一台 / 跨设备链路聚合" },
        { t: "VRRP / HSRP", en: "Virtual Router Redundancy Protocol", d: "网关主备冗余，共享虚拟 IP；HSRP 为思科私有" },
        { t: "VIP", en: "Virtual IP", d: "VRRP / 负载均衡对外暴露的虚拟地址" },
        { t: "NGFW / IDS / IPS / WAF", en: "—", d: "下一代防火墙 / 只检测告警 / 检测并阻断 / Web 应用防火墙" },
        { t: "正向代理 / 反向代理", en: "Forward / Reverse Proxy", d: "代理客户端 / 代理服务器" },
        { t: "AP / AC / CAPWAP", en: "—", d: "无线接入点 / 无线控制器 / 二者之间的通信协议" },
        { t: "PoE", en: "Power over Ethernet", d: "一根网线同时传数据与供电" },
        { t: "胖 AP / 瘦 AP", en: "Fat / Fit AP", d: "自带全部功能、独立配置 / 由 AC 统一下发配置" },
        { t: "PPPoE / BRAS", en: "—", d: "以太网上的 PPP 拨号 / 运营商侧处理拨号认证的服务器" },
        { t: "MPLS", en: "Multi-Protocol Label Switching", d: "标签转发，企业专网，确定性低延迟" },
        { t: "SD-WAN", en: "Software-Defined WAN", d: "软件定义广域网，统一调度多种线路" },
        { t: "VXLAN", en: "Virtual Extensible LAN", d: "用 UDP 封装二层帧，构建大二层网络，突破 4094 个 VLAN 限制" }
      ] }] },
      { id: "s6-pit", title: "常见误区", icon: "alert", blocks: [{ t: "pitfalls", items: [
        { t: "集线器和交换机差不多，都是「分线器」", x: "**错误。** 集线器是**物理层**设备，广播转发、共享冲突域、半双工；交换机是**二层**设备，定向转发、端口独立冲突域、全双工。**性能天差地别。**" },
        { t: "路由器比交换机快", x: "**错误。** **同一网段内交换机远快于路由器**——交换机硬件直转只认 MAC，路由器要查路由表、改 TTL、重算校验和。**内网用交换机，跨网段才用路由器。**" },
        { t: "三层交换机就是「交换机 + 路由器」，完全一样", x: "**错误。** 三层交换机**性能极高但功能简单**，适合内网；路由器**功能丰富**（NAT / VPN / QoS / WAN 接口），适合边界。**「对内三层交换机，对外路由器」。**" },
        { t: "有了防火墙就不用 IDS/IPS 了", x: "**错误。** 防火墙管「能不能进」，IDS **只告警**，IPS **检测并阻断**。**三者职责不同。**" },
        { t: "正向代理和反向代理只是「方向不同」", x: "**错误。** 核心区别是**代理谁**——正向代理代理**客户端**，反向代理代理**服务器**。**方向只是表象。**" },
        { t: "链路聚合后，单个文件传输速度会变成 N 倍", x: "**错误。** 链路聚合提升的是**总吞吐量与可靠性**，**单个数据流仍走同一条物理链路**（哈希算法限制）。多条流才能跑满总带宽。" },
        { t: "堆叠和链路聚合是一回事", x: "**错误。** 堆叠是把多台**设备**变成一台；链路聚合是把多条**链路**变成一条。**冗余的层次不同。**" },
        { t: "隐藏 SSID 就能防止别人连我的 WiFi", x: "**错误。** 抓包工具能轻易发现隐藏的 SSID。**真正的安全靠 WPA2/WPA3 加密。**" },
        { t: "WEP 加密够用了", x: "**错误。** WEP **已被彻底攻破**，几分钟即可破解。必须用 **WPA2（AES）或 WPA3**。" },
        { t: "SD-WAN 可以完全替代专线", x: "**错误。** SD-WAN 是**调度体系不是线路**，质量取决于底层链路。要确定性仍需专线 / MPLS，现代做法是**混合使用**。" },
        { t: "网络拓扑里「网状」一定最好", x: "**错误。** 网状可靠性最高但**成本也最高**。终端接入用星型，分层网络用树型，核心骨干才用网状。**真实网络都是混合型。**" },
        { t: "核心层应该配最强的策略和最多的功能", x: "**错误。** 恰恰相反——核心层承载全网流量，**越简单越快**。复杂策略要**下沉到汇聚层**。「**核心只管快**」。" }
      ] }] },
      { id: "s6-quiz", title: "自测练习", icon: "target", blocks: [{ t: "quiz", stage: "s6", items: [
        { q: "下面哪台设备能隔离广播域？", o: ["集线器", "二层交换机", "路由器", "中继器"], a: 2, e: "**隔离广播域靠三层设备**（路由器 / 三层交换机，每个接口一个广播域）**或 VLAN**。二层设备只隔离冲突域，集线器和中继器什么都不隔离。" },
        { q: "集线器与交换机最本质的区别是？", o: ["端口数量不同", "集线器广播转发且共享冲突域，交换机定向转发且端口独立冲突域", "集线器更快", "交换机不需要 MAC 地址"], a: 1, e: "集线器工作在**物理层**，任一端口收到的数据广播给所有端口，所有端口共享一个冲突域、半双工；交换机工作在**二层**，查 MAC 表定向转发，每端口一个独立冲突域、全双工。" },
        { q: "VRRP 的核心作用是什么？", o: ["提高单台路由器的转发速度", "多台路由器虚拟成一个网关，实现网关冗余", "在二层防环", "把多条链路聚合起来"], a: 1, e: "VRRP 把多台路由器**虚拟成一台**，共享一个**虚拟 IP（VIP）**作为网关。主故障时备**秒级接管**，而**终端网关 IP 不变**，切换对终端透明。" },
        { q: "关于链路聚合，下面说法正确的是？", o: ["单个文件传输速度会变成 N 倍", "提升总吞吐量和可靠性，但单流仍走一条物理链路", "必须使用不同速率的链路", "它同时提供设备级冗余"], a: 1, e: "链路聚合把多条物理链路捆成一条**逻辑**链路，提升**总吞吐量与链路冗余**。但受哈希算法限制，**单个数据流仍走同一条物理链路**，单流速度不会叠加。设备级冗余靠**堆叠 / M-LAG**。" },
        { q: "正向代理与反向代理的核心区别是？", o: ["使用的端口不同", "代理的对象不同：一个代理客户端，一个代理服务器", "加密方式不同", "一个用 TCP 一个用 UDP"], a: 1, e: "**正向代理代理客户端**——服务器只看到代理的 IP（科学上网、上网审计）；**反向代理代理服务器**——客户端以为在直连服务器（负载均衡、SSL 卸载、缓存）。**方向只是表象，代理对象才是本质。**" }
      ] }] }
    ]
  });

})();
