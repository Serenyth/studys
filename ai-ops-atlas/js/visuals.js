/* ══════════════════════════════════════════════════════════
   可视化引擎 · 第一部分（框架 + 阶段 0–3）
   每个可视化：mount(stageEl, api) -> cleanup
   ══════════════════════════════════════════════════════════ */
window.AIOPS_VIZ = (function () {
  'use strict';
  const V = {};
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ───────── 工具 ───────── */
  function hexA(hex, a) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || TC('#22d3ee'));
    if (!m) return 'rgba(34,211,238,' + a + ')';
    return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')';
  }

  /* ───────── 主题适配 ─────────
     Canvas 的 fillStyle 不解析 var()，所以这里把「深色底专用」的颜色字面量
     映射到当前主题的 CSS 令牌。深色主题下取回的就是原值，视觉零变化。 */
  const HEX2TOK = {
    '#47596f':'--txt-4', '#6b829c':'--txt-3', '#9db1c9':'--txt-2',
    '#dde8f5':'--txt',   '#8ba0b8':'--txt-3', '#3d4d61':'--txt-dim',
    '#ffffff':'--txt-hi','#fff':'--txt-hi',
    '#04141a':'--on-st',
    '#22d3ee':'--sig-cyan','#38bdf8':'--sig-cyan',
    '#a78bfa':'--sig-violet','#fbbf24':'--sig-amber',
    '#34d399':'--sig-green','#fb7185':'--sig-rose'
  };
  let _tKey = '', _tCache = {};
  function T(name){
    const key = document.documentElement.getAttribute('data-theme') || 'dark';
    if (key !== _tKey) { _tCache = {}; _tKey = key; }
    if (!(name in _tCache)) {
      let v = '';
      try { v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch (e) {}
      _tCache[name] = v || '#888888';
    }
    return _tCache[name];
  }
  function TC(hex){ const t = HEX2TOK[String(hex).toLowerCase()]; return t ? T(t) : hex; }
  function RG(name, a){ return 'rgba(' + T('--rgb-' + name) + ',' + a + ')'; }

  function fit(cv, height) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(240, cv.clientWidth || (cv.parentElement && cv.parentElement.clientWidth) || 640);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(height * dpr);
    cv.style.height = height + 'px';
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, height);
    return { c: c, w: w, h: height };
  }
  function anim(el, cv, height, frameFn) {
    let W = 0, H = height, c = null;
    function size() { const r = fit(cv, height); W = r.w; H = r.h; c = r.c; }
    size();
    const ro = new ResizeObserver(size); ro.observe(cv.parentElement || cv);
    let raf = null, last = 0, run = false;
    const io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { if (!run) { run = true; last = 0; raf = requestAnimationFrame(tick); } }
      else { run = false; if (raf) cancelAnimationFrame(raf); raf = null; }
    }, { threshold: 0.02 });
    io.observe(el);
    function tick(t) {
      if (!run) return;
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016;
      last = t;
      frameFn(c, W, H, dt, t / 1000);
      raf = requestAnimationFrame(tick);
    }
    function drawOnce() { frameFn(c, W, H, 0.016, performance.now() / 1000); }
    drawOnce();
    return function () { run = false; if (raf) cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }
  function txt(c, s, x, y, opt) {
    opt = opt || {};
    c.save();
    c.font = (opt.w ? opt.w + ' ' : '') + (opt.sz || 11) + 'px ' + (opt.mono === false ? 'inherit' : 'ui-monospace, Consolas, monospace');
    c.fillStyle = opt.col || TC('#8ba0b8');
    c.textAlign = opt.al || 'left';
    c.textBaseline = opt.bl || 'alphabetic';
    c.fillText(s, x, y);
    c.restore();
  }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ═══════════════════════════════════════════════════════
     首页 · 集群拓扑星图
     ═══════════════════════════════════════════════════════ */
  V.hero = function (cv, api) {
    const A = api.accent;
    const nodes = [];
    let packets = [];
    for (let i = 0; i < 46; i++) {
      nodes.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.4, ph: Math.random() * 6.28, hub: Math.random() < 0.16 });
    }
    const links = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (d < 0.16 && links.length < 96) links.push({ a: i, b: j, t: 0, sp: 0.25 + Math.random() * 0.7 });
      }
    }
    let px = 0.5, py = 0.5, tx = 0.5, ty = 0.5;
    if (!REDUCED) {
      window.addEventListener('mousemove', function (e) {
        tx = e.clientX / window.innerWidth; ty = e.clientY / window.innerHeight;
      }, { passive: true });
    }
    return anim(cv.parentElement, cv, cv.parentElement.clientHeight || 720, function (c, W, H, dt) {
      px += (tx - px) * 0.03; py += (ty - py) * 0.03;
      const ox = (px - 0.5) * 34, oy = (py - 0.5) * 24;
      c.clearRect(0, 0, W, H);
      const pts = nodes.map(function (n, i) {
        const wob = REDUCED ? 0 : Math.sin(performance.now() / 2600 + n.ph) * 7;
        return { x: n.x * W + ox * (n.hub ? 1.5 : 1) + wob, y: n.y * H + oy * (n.hub ? 1.5 : 1) + wob * 0.6, n: n, i: i };
      });
      // 连线
      for (let k = 0; k < links.length; k++) {
        const l = links[k], p1 = pts[l.a], p2 = pts[l.b];
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (d > 250) continue;
        const al = (1 - d / 250) * 0.3;
        c.strokeStyle = hexA(A, al); c.lineWidth = 1;
        c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.stroke();
        if (!REDUCED) {
          l.t += dt * l.sp; if (l.t > 1) l.t -= 1;
          const q = l.t;
          const mx = p1.x + (p2.x - p1.x) * q, my = p1.y + (p2.y - p1.y) * q;
          c.fillStyle = hexA(A, 0.85);
          c.beginPath(); c.arc(mx, my, 1.6, 0, 6.283); c.fill();
        }
      }
      // 节点
      for (let k = 0; k < pts.length; k++) {
        const p = pts[k], n = p.n;
        const pulse = REDUCED ? 1 : 0.7 + 0.3 * Math.sin(performance.now() / 900 + n.ph);
        if (n.hub) {
          const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 46);
          g.addColorStop(0, hexA(A, 0.5)); g.addColorStop(1, hexA(A, 0));
          c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, 46, 0, 6.283); c.fill();
          c.strokeStyle = hexA(A, 0.5); c.lineWidth = 1.2;
          c.beginPath(); c.arc(p.x, p.y, 9 * pulse, 0, 6.283); c.stroke();
        }
        c.fillStyle = n.hub ? '#ffffff': hexA(A, 0.85 * pulse);
        c.beginPath(); c.arc(p.x, p.y, n.r * (n.hub ? 1.7 : 1), 0, 6.283); c.fill();
      }
      // 扫描线
      if (!REDUCED) {
        const sy = ((performance.now() / 26) % (H + 300)) - 150;
        const g2 = c.createLinearGradient(0, sy - 90, 0, sy + 90);
        g2.addColorStop(0, hexA(A, 0)); g2.addColorStop(0.5, hexA(A, 0.06)); g2.addColorStop(1, hexA(A, 0));
        c.fillStyle = g2; c.fillRect(0, sy - 90, W, 180);
      }
    });
  };

  /* ═══════════════════════════════════════════════════════
     阶段 0 · 机柜散热（风冷 / 冷板 / 浸没）
     ═══════════════════════════════════════════════════════ */
  V['rack-thermal'] = function (el, api) {
    const A = api.accent;
    let mode = 'air';
    const MODES = { air: '风冷', plate: '冷板式液冷', immer: '浸没式液冷' };
    el.innerHTML =
      '<div class="v-rack">' +
        '<div><canvas></canvas></div>' +
        '<div class="v-rack-side">' +
          '<div class="gauge">' +
            '<svg viewBox="0 0 160 100">' +
              '<path d="M14 88 A66 66 0 0 1 146 88" fill="none" stroke="rgba(125,175,225,.16)" stroke-width="9" stroke-linecap="round"/>' +
              '<path id="pueArc" d="M14 88 A66 66 0 0 1 146 88" fill="none" stroke="' + A + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="207" stroke-dashoffset="207" style="transition:stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)"/>' +
            '</svg>' +
            '<div class="gv"><b id="pueVal">1.50</b><span>PUE 能效比</span></div>' +
          '</div>' +
          '<p class="pue-note" id="pueNote"></p>' +
          '<div style="margin-top:auto">' +
            '<dl class="readout hot" style="margin:0 0 9px"><dt>单机柜功率密度</dt><dd id="dens">8<small>kW</small></dd></dl>' +
            '<dl class="readout"><dt>散热能力上限</dt><dd id="cap">15<small>kW/柜</small></dd></dl>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="viz-ctrl">' +
        '<span class="vc-label">散热方案</span>' +
        '<div class="vc-seg" id="segMode">' +
          '<button data-m="air" class="on">风冷</button>' +
          '<button data-m="plate">冷板式液冷</button>' +
          '<button data-m="immer">浸没式液冷</button>' +
        '</div>' +
        '<span class="vc-label" style="margin-left:auto">机柜功率</span>' +
        '<input type="range" id="densR" min="6" max="120" value="8" step="2">' +
        '<span class="vc-val" id="densV">8 kW</span>' +
      '</div>';

    const cv = el.querySelector('canvas');
    const pueArc = el.querySelector('#pueArc');
    const densR = el.querySelector('#densR');
    const densV = el.querySelector('#densV');
    let density = 8;

    const CFG = {
      air: { pue: 1.5, cap: 15, note: '靠精密空调冷风带走热量。成熟、便宜，但单柜超过 15 kW 就"吹不动"了。' },
      plate: { pue: 1.2, cap: 100, note: '冷板贴在 GPU/CPU 上，液体循环带走热量。导热效率是空气的 25 倍以上，主流过渡方案。' },
      immer: { pue: 1.08, cap: 130, note: '整机浸在绝缘冷却液中。换热系数是风冷的 1000–3000 倍，可支撑 100 kW+ 超高密度。' }
    };
    function sync() {
      const cfg = CFG[mode];
      const over = density > cfg.cap;
      const pue = cfg.pue + (over ? (density - cfg.cap) / cfg.cap * 0.35 : 0);
      el.querySelector('#pueVal').textContent = pue.toFixed(2);
      const frac = clamp((pue - 1) / 1.0, 0, 1);
      pueArc.setAttribute('stroke-dashoffset', String(207 * (1 - frac)));
      pueArc.setAttribute('stroke', pue > 1.4 ? '#fb7185': pue > 1.25 ? '#fbbf24': TC('#34d399'));
      el.querySelector('#pueNote').innerHTML = cfg.note + (over ? ' <b style="color:#fb7185">⚠ 当前功率已超出该方案散热能力，会触发热降频。</b>' : '');
      el.querySelector('#dens').innerHTML = density + '<small>kW</small>';
      el.querySelector('#cap').innerHTML = cfg.cap + '<small>kW/柜</small>';
      el.querySelector('#cap').parentElement.className = 'readout ' + (over ? 'bad' : 'good');
      densV.textContent = density + ' kW';
    }
    el.querySelector('#segMode').addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      mode = b.dataset.m;
      this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      sync();
    });
    densR.addEventListener('input', function () { density = +this.value; sync(); });
    sync();

    const units = [];
    for (let i = 0; i < 9; i++) units.push({ heat: 0.3 + Math.random() * 0.7 });
    const heat = [];

    const stop = anim(el, cv, 330, function (c, W, H, dt, tm) {
      c.clearRect(0, 0, W, H);
      const rackX = 42, rackW = Math.min(190, W * 0.34), rackY = 26, rackH = H - 52;
      const over = density > CFG[mode].cap;

      // 机柜外框
      c.strokeStyle = hexA(A, 0.34); c.lineWidth = 1.4;
      rr(c, rackX, rackY, rackW, rackH, 8); c.stroke();
      c.fillStyle = RG('panel',.72); c.fill();
      const uh = (rackH - 16) / units.length;
      for (let i = 0; i < units.length; i++) {
        const y = rackY + 8 + i * uh;
        const isGpu = i % 3 === 0;
        c.fillStyle = isGpu ? hexA(A, 0.14) : 'rgba(125,175,225,.08)';
        rr(c, rackX + 7, y + 2, rackW - 14, uh - 4, 3); c.fill();
        c.strokeStyle = hexA(A, isGpu ? 0.4 : 0.16); c.lineWidth = 1; c.stroke();
        // LED
        for (let k = 0; k < 3; k++) {
          const blink = 0.35 + 0.65 * Math.abs(Math.sin(tm * 1.6 + i + k * 1.7));
          c.fillStyle = hexA(k === 0 ? '#34d399': k === 1 ? A : TC('#fbbf24'), blink);
          c.beginPath(); c.arc(rackX + rackW - 16 - k * 7, y + uh / 2, 1.6, 0, 6.283); c.fill();
        }
        if (isGpu) txt(c, 'GPU', rackX + 13, y + uh / 2 + 3, { sz: 8, col: hexA(A, 0.8) });
      }

      // 散热示意
      if (mode === 'air') {
        for (let i = 0; i < 60; i++) {
          if (heat.length <= i) heat.push({ x: 0, y: 0, v: 0, l: 0 });
          const h = heat[i];
          if (h.l <= 0) { h.l = 1; h.x = rackX + 8 + Math.random() * (rackW - 16); h.y = rackY + rackH - 6; h.v = 26 + Math.random() * 46; h.w = 0.5 + Math.random() * 0.6; }
          h.y -= h.v * dt; h.l -= dt * 0.42;
          if (h.y < rackY - 10) h.l = 0;
          c.fillStyle = over ? RG('hot', 0.42 * h.l) : RG('warm', 0.34 * h.l);
          c.beginPath(); c.arc(h.x, h.y, 2.6 * h.w + 1, 0, 6.283); c.fill();
        }
        // 冷风箭头
        for (let k = 0; k < 5; k++) {
          const y = rackY + 24 + k * ((rackH - 48) / 4);
          const off = (tm * 60 + k * 40) % 90;
          c.strokeStyle = hexA(TC('#38bdf8'), 0.32); c.lineWidth = 1.4;
          c.beginPath(); c.moveTo(rackX - 30 + off, y); c.lineTo(rackX - 12 + off, y); c.stroke();
          c.beginPath(); c.moveTo(rackX - 16 + off, y - 3.4); c.lineTo(rackX - 11 + off, y); c.lineTo(rackX - 16 + off, y + 3.4); c.stroke();
        }
        txt(c, '精密空调冷风', rackX - 30, rackY + 12, { sz: 9, col: hexA(TC('#38bdf8'), 0.75) });
      } else {
        // 液冷管路
        const loopX = rackX + rackW + 34;
        const isImmer = mode === 'immer';
        c.lineWidth = 3; c.lineCap = 'round';
        const g1 = c.createLinearGradient(0, rackY, 0, rackY + rackH);
        if (isImmer) { g1.addColorStop(0, RG('cool',.5)); g1.addColorStop(1, RG('hot',.45)); }
        else { g1.addColorStop(0, RG('cool',.55)); g1.addColorStop(0.5, RG('cool',.3)); g1.addColorStop(1, RG('hot',.5)); }
        c.strokeStyle = g1;
        c.beginPath(); c.moveTo(loopX, rackY + 10); c.lineTo(loopX, rackY + rackH - 10); c.stroke();
        // 冷却液流动
        for (let k = 0; k < 14; k++) {
          const q = ((tm * 0.28 + k / 14) % 1);
          const y = rackY + 10 + q * (rackH - 20);
          const hot = q > 0.5;
          c.fillStyle = hot ? RG('hot',.9) : RG('mist',.95);
          c.beginPath(); c.arc(loopX, y, 2.6, 0, 6.283); c.fill();
        }
        // 支管 + CDU
        for (let i = 0; i < units.length; i++) {
          if (i % 2) continue;
          const y = rackY + 8 + i * uh + uh / 2;
          c.strokeStyle = hexA(isImmer ? '#38bdf8': A, 0.4); c.lineWidth = 1.6;
          c.beginPath(); c.moveTo(rackX + rackW - 4, y); c.lineTo(loopX, y); c.stroke();
        }
        c.strokeStyle = hexA(A, 0.4); c.lineWidth = 1.4;
        rr(c, loopX + 16, rackY + rackH / 2 - 26, 40, 52, 7); c.stroke();
        c.fillStyle = RG('panel-2',.9); c.fill();
        txt(c, 'CDU', loopX + 36, rackY + rackH / 2 + 3, { sz: 10, col: hexA(A, 0.95), al: 'center' });
        txt(c, isImmer ? '整机浸没 · 相变换热' : '冷板贴芯片 · 液体循环', rackX, H - 8, { sz: 9.5, col: hexA(TC('#38bdf8'), 0.8) });
      }

      // 功率柱
      const bx = W - 118, bw = 26, by = rackY + 20, bh = rackH - 40;
      c.strokeStyle = RG('grid',.2); c.lineWidth = 1;
      rr(c, bx, by, bw, bh, 6); c.stroke();
      const frac = clamp(density / 130, 0, 1);
      const gh = bh * frac;
      const gg = c.createLinearGradient(0, by + bh, 0, by + bh - gh);
      gg.addColorStop(0, over ? '#fb7185': TC('#34d399')); gg.addColorStop(1, TC('#fbbf24'));
      c.fillStyle = gg; rr(c, bx + 2, by + bh - gh + 2, bw - 4, Math.max(2, gh - 4), 4); c.fill();
      txt(c, density + ' kW', bx + bw / 2, by + bh + 15, { sz: 10, col: TC('#fff'), al: 'center' });
      txt(c, '功率', bx + bw / 2, by - 6, { sz: 9, col: hexA(A, 0.8), al: 'center' });
    });
    return stop;
  };

  /* ═══════════════════════════════════════════════════════
     阶段 1 · Linux 目录树
     ═══════════════════════════════════════════════════════ */
  const FSDATA = [
    { d: '/etc', t: '系统与服务的配置文件', x: '改网络、改 SSH、改服务配置。几乎所有服务配置都在这。', cmd: 'ls /etc/ssh/sshd_config' },
    { d: '/var/log', t: '日志文件', x: '排障第一站。服务日志、系统日志、认证日志都在这里。', cmd: 'tail -f /var/log/syslog' },
    { d: '/home', t: '普通用户家目录', x: '/home/zhangsan 这样的用户数据区，权限默认 700。', cmd: 'ls -lh /home' },
    { d: '/root', t: 'root 用户家目录', x: '管理员操作区，普通用户无权进入。', cmd: 'sudo ls /root' },
    { d: '/proc', t: '内核与进程的虚拟文件系统', x: '不占磁盘，读它等于问内核。如 /proc/cpuinfo。', cmd: 'cat /proc/cpuinfo' },
    { d: '/dev', t: '设备文件', x: '一切皆文件：/dev/sda 是磁盘，/dev/null 是黑洞。', cmd: 'lsblk' },
    { d: '/usr', t: '用户程序与库', x: '/usr/bin 命令、/usr/lib 共享库、/usr/local 手动装的软件。', cmd: 'ls /usr/local' },
    { d: '/var', t: '可变数据', x: '日志、数据库、缓存、邮件队列——会不断增长的数据。', cmd: 'du -sh /var/*' },
    { d: '/tmp', t: '临时文件', x: '重启可能被清空，别放重要数据。', cmd: 'ls -la /tmp' },
    { d: '/boot', t: '内核与启动文件', x: 'vmlinuz 内核、grub 引导。内核升级相关。', cmd: 'ls /boot' },
    { d: '/opt', t: '第三方软件安装目录', x: '商业软件、大型独立应用常装在这里。', cmd: 'ls /opt' },
    { d: '/sys', t: '内核设备信息', x: '内核导出的设备与驱动信息虚拟文件系统。', cmd: 'ls /sys/class' }
  ];
  V['fs-tree'] = function (el, api) {
    const A = api.accent;
    el.innerHTML =
      '<div class="v-fs">' +
        '<div class="v-fs-tree" id="fsTree"></div>' +
        '<div class="v-fs-side">' +
          '<h4 id="fsPath">/etc</h4>' +
          '<p style="color:var(--txt-hi);font-weight:700;margin-bottom:6px" id="fsTitle"></p>' +
          '<p id="fsDesc"></p>' +
          '<div class="code" style="margin-top:14px"><div class="code-bar"><span class="dots"><i></i><i></i><i></i></span><span class="fname">示例命令</span></div><pre style="padding:11px 13px;font-size:12px"><code id="fsCmd"></code></pre></div>' +
          '<div class="kvmini"><span>FHS 标准</span><span style="margin-left:auto">一切皆文件</span></div>' +
        '</div>' +
      '</div>';
    const tree = el.querySelector('#fsTree');
    tree.innerHTML = '<div class="v-fs-node on" data-i="0"><i></i>/ <em>根</em></div>' +
      FSDATA.map(function (f, i) {
        return '<div class="v-fs-node" data-i="' + (i + 1) + '" style="margin-left:20px"><i></i>' + f.d + '<em>' + f.t.slice(0, 6) + '</em></div>';
      }).join('') +
      '<div class="v-fs-node" data-i="-1" style="margin-left:20px"><i></i>/bin → /usr/bin<em>UsrMerge</em></div>';
    function pick(i) {
      tree.querySelectorAll('.v-fs-node').forEach(function (n) { n.classList.toggle('on', +n.dataset.i === i); });
      const f = FSDATA[i - 1];
      if (!f) {
        el.querySelector('#fsPath').textContent = i === 0 ? '/' : '/bin → /usr/bin';
        el.querySelector('#fsTitle').textContent = i === 0 ? '根目录：一切的起点' : '符号链接（UsrMerge）';
        el.querySelector('#fsDesc').textContent = i === 0
          ? 'Linux 只有一个根目录，所有文件都从 / 延伸成一棵倒过来的树。和 Windows 的 C 盘 D 盘完全不同。'
          : '现代发行版把 /bin、/sbin、/lib 都变成了指向 /usr 下对应目录的符号链接，所以看到它们"内容一样"很正常。';
        el.querySelector('#fsCmd').textContent = i === 0 ? 'ls -l /' : 'ls -l /bin';
        return;
      }
      el.querySelector('#fsPath').textContent = f.d;
      el.querySelector('#fsTitle').textContent = f.t;
      el.querySelector('#fsDesc').textContent = f.x;
      el.querySelector('#fsCmd').textContent = f.cmd;
    }
    pick(1);
    tree.addEventListener('click', function (e) {
      const n = e.target.closest('.v-fs-node'); if (n) pick(+n.dataset.i);
    });
    return null;
  };

  /* ═══════════════════════════════════════════════════════
     阶段 1 · chmod 权限实验室
     ═══════════════════════════════════════════════════════ */
  V['chmod-lab'] = function (el, api) {
    const A = api.accent;
    const ROLES = [{ k: 'u', n: '属主 owner' }, { k: 'g', n: '属组 group' }, { k: 'o', n: '其他人 other' }];
    const PERMS = [{ k: 'r', v: 4 }, { k: 'w', v: 2 }, { k: 'x', v: 1 }];
    const st = { u: { r: 1, w: 1, x: 1 }, g: { r: 1, w: 0, x: 1 }, o: { r: 1, w: 0, x: 0 } };
    el.innerHTML =
      '<div class="v-chmod">' +
        '<div class="v-chmod-col"><h5>① 勾选权限位</h5><div id="permRows"></div></div>' +
        '<div class="v-chmod-col"><h5>② 得到八进制</h5>' +
          '<div class="octet"><div id="o0">7</div><div id="o1">5</div><div id="o2">4</div></div>' +
          '<div class="perm-str" id="permStr"></div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px" id="presets"></div>' +
        '</div>' +
        '<div class="v-chmod-col"><h5>③ 这条权限意味着什么</h5><div class="perm-hint" id="permHint"></div></div>' +
      '</div>';
    el.querySelector('#permRows').innerHTML = ROLES.map(function (r) {
      return '<div class="perm-row"><span>' + r.n + '</span><div class="perm-tog" data-r="' + r.k + '">' +
        PERMS.map(function (p) { return '<button data-p="' + p.k + '">' + p.k + '</button>'; }).join('') + '</div></div>';
    }).join('');
    el.querySelector('#presets').innerHTML = [['644', '普通文件'], ['755', '可执行脚本'], ['600', '私钥'], ['700', '.ssh 目录'], ['777', '危险！'], ['640', '生产配置']]
      .map(function (p) { return '<button class="vc-btn" data-o="' + p[0] + '">' + p[0] + ' <span style="opacity:.6">' + p[1] + '</span></button>'; }).join('');

    const HINTS = {
      644: '属主可读写，同组和其他人只能读。普通文本文件、网页资源的标准权限。',
      755: '属主可读写执行，其他人可读可执行。脚本、目录的常用权限。',
      600: '只有属主能读写。<b>SSH 私钥必须这样</b>，否则 ssh 会拒绝使用。',
      700: '只有属主能进入并操作。~/.ssh 目录的标配权限。',
      777: '所有人可读写执行。<b>生产环境绝不要用</b>——任何进程都能改你的文件。',
      640: '属主读写、同组只读、其他人无权。配合 umask 027 的生产配置常见形态。',
      754: '自定义组合。',
      750: '属主全权、同组可读可执行、其他人无权。',
      400: '只读，连属主都不能改——常用于存放证书。'
    };
    function sync() {
      let oct = '';
      ROLES.forEach(function (r, i) {
        let v = 0;
        PERMS.forEach(function (p) { if (st[r.k][p.k]) v += p.v; });
        oct += v;
        el.querySelector('#o' + i).textContent = v;
        el.querySelectorAll('.perm-tog[data-r="' + r.k + '"] button').forEach(function (b) {
          b.classList.toggle('on', !!st[r.k][b.dataset.p]);
        });
      });
      const sym = '-' + ROLES.map(function (r) { return PERMS.map(function (p) { return st[r.k][p.k] ? p.k : '-'; }).join(''); }).join('');
      el.querySelector('#permStr').innerHTML = '<em>' + sym.slice(0, 1) + '</em>' + sym.slice(1);
      el.querySelector('#permHint').innerHTML = HINTS[oct] || '自定义权限组合：属主 ' + oct[0] + '、属组 ' + oct[1] + '、其他人 ' + oct[2] + '。';
      el.querySelector('#permHint').innerHTML = el.querySelector('#permHint').innerHTML +
        '<br><span style="color:var(--txt-4);font-family:var(--f-mono);font-size:12px">$ chmod ' + oct + ' file</span>';
    }
    el.querySelector('#permRows').addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      const r = b.closest('.perm-tog').dataset.r;
      st[r][b.dataset.p] = st[r][b.dataset.p] ? 0 : 1;
      sync();
    });
    el.querySelector('#presets').addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      const o = b.dataset.o;
      ROLES.forEach(function (r, i) {
        const v = +o[i];
        st[r.k].r = v & 4 ? 1 : 0; st[r.k].w = v & 2 ? 1 : 0; st[r.k].x = v & 1 ? 1 : 0;
      });
      sync();
    });
    sync();
    return null;
  };

  /* ═══════════════════════════════════════════════════════
     阶段 2 · GPU 架构 + Tensor Core 矩阵乘
     ═══════════════════════════════════════════════════════ */
  V['gpu-die'] = function (el, api) {
    const A = api.accent;
    el.innerHTML =
      '<div class="v-gpu">' +
        '<div><canvas></canvas></div>' +
        '<div class="v-gpu-side">' +
          '<div class="legend-row"><i style="background:' + A + '"></i>SM 流式多处理器</div>' +
          '<div class="legend-row"><i style="background:#a78bfa"></i>CUDA Core（通用并行）</div>' +
          '<div class="legend-row"><i style="background:#fbbf24"></i>Tensor Core（矩阵乘加）</div>' +
          '<dl class="readout hot" style="margin-top:6px"><dt>当前计算</dt><dd id="gpuOp" style="font-size:15.5px">—</dd></dl>' +
          '<dl class="readout"><dt>单次 Tile 运算</dt><dd id="gpuTile" style="font-size:15.5px">4×4×4</dd></dl>' +
          '<dl class="readout good"><dt>吞吐倍率</dt><dd id="gpuTp">1×</dd></dl>' +
          '<p style="font-size:12.5px;color:var(--txt-3);line-height:1.72;margin:6px 0 0">Tensor Core 一次完成整个 tile 的矩阵乘加，而 CUDA Core 需要逐元素算 —— 这就是 AI 算力指标看 Tensor Core 的原因。</p>' +
        '</div>' +
      '</div>' +
      '<div class="viz-ctrl">' +
        '<span class="vc-label">计算模式</span>' +
        '<div class="vc-seg" id="gpuSeg"><button data-m="tc" class="on">Tensor Core</button><button data-m="cc">CUDA Core</button></div>' +
        '<span class="vc-label" style="margin-left:auto">速度</span>' +
        '<input type="range" id="gpuSpd" min="0.3" max="2.6" step="0.1" value="1.1">' +
      '</div>';

    const cv = el.querySelector('canvas');
    let mode = 'tc', speed = 1.1, t = 0;
    const N = 4;
    const Aarr = [], Barr = [];
    for (let i = 0; i < N; i++) { Aarr.push([]); Barr.push([]); for (let j = 0; j < N; j++) { Aarr[i].push(1 + Math.floor(Math.random() * 9)); Barr[i].push(1 + Math.floor(Math.random() * 9)); } }
    el.querySelector('#gpuSeg').addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      mode = b.dataset.m; this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      el.querySelector('#gpuOp').textContent = mode === 'tc' ? '矩阵乘加 (MMA)' : '逐元素 FMA';
      el.querySelector('#gpuTp').textContent = mode === 'tc' ? '8×' : '1×';
    });
    el.querySelector('#gpuSpd').addEventListener('input', function () { speed = +this.value; });

    return anim(el, cv, 372, function (c, W, H, dt) {
      t += dt * speed;
      c.clearRect(0, 0, W, H);
      const pad = 16;
      // ── 上部：SM 网格
      const gridH = 108;
      const cols = 14, rows = 4;
      const cw = (W - pad * 2) / cols, chh = gridH / rows;
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
        const x = pad + k * cw, y = pad + r * chh;
        const ph = (k * 0.7 + r * 1.3);
        const act = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.5 + ph));
        c.fillStyle = hexA(A, 0.06 + act * 0.12);
        rr(c, x + 1.5, y + 1.5, cw - 3, chh - 3, 3); c.fill();
        c.strokeStyle = hexA(A, 0.16 + act * 0.22); c.lineWidth = 1; c.stroke();
        // SM 内的小核
        for (let q = 0; q < 4; q++) {
          c.fillStyle = hexA(mode === 'tc' ? '#fbbf24': TC('#a78bfa'), 0.2 + act * 0.55);
          c.fillRect(x + 5 + (q % 2) * 7, y + 6 + Math.floor(q / 2) * 7, 4, 4);
        }
      }
      txt(c, 'SM 阵列 · ' + (cols * rows) + ' 个流式多处理器（示意）', pad, pad - 4, { sz: 9.5, col: hexA(A, 0.8) });

      // ── 下部：矩阵乘
      const my = gridH + pad + 22;
      const cell = Math.min(26, (W - pad * 2 - 120) / (N * 3 + 2));
      const gap = 5;
      const mw = N * cell + (N - 1) * gap;
      const startX = pad;
      const ax = startX, bx = startX + mw + 34, cx2 = startX + (mw + 34) * 2;
      const total = N * N;
      const prog = (t * 2.1) % (total + 1.4);
      const idx = Math.floor(prog);
      const frac = prog - idx;
      const ci = Math.min(N - 1, Math.floor(idx / N)), cj = idx % N;
      const cc = Aarr[ci][cj], cw2 = Barr[cj][ci];
      const result = Aarr[ci].reduce(function (s, v, k) { return s + v * Barr[k][cj]; }, 0);

      function mat(m, ox, oy, title, sub) {
        txt(c, title, ox, oy - 8, { sz: 10.5, col: TC('#fff'), w: '700' });
        txt(c, sub, ox, oy - 8 + 0, { sz: 9, col: TC('#47596f'), al: 'left' });
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
          const x = ox + j * (cell + gap), y = oy + i * (cell + gap);
          let hi = 0, col = A;
          if (title[0] === 'A') { hi = (i === ci && frac > 0.05) ? 1 : 0; col = TC('#a78bfa'); }
          else if (title[0] === 'B') { hi = (j === cj && frac > 0.05) ? 1 : 0; col = TC('#38bdf8'); }
          else {
            const done = i * N + j < idx;
            const cur = (i === ci && j === cj);
            hi = cur ? frac : (done ? 1 : 0); col = TC('#fbbf24');
          }
          c.fillStyle = hexA(col, 0.08 + hi * 0.42);
          rr(c, x, y, cell, cell, 4); c.fill();
          c.strokeStyle = hexA(col, 0.2 + hi * 0.65); c.lineWidth = hi > 0.3 ? 1.6 : 1; c.stroke();
          if (title[0] !== 'C') txt(c, String(m[i][j]), x + cell / 2, y + cell / 2 + 4, { sz: 11, col: hi ? '#fff': TC('#8ba0b8'), al: 'center' });
          else {
            const done = i * N + j < idx || (i === ci && j === cj);
            txt(c, done ? String(resultOf(i, j)) : '·', x + cell / 2, y + cell / 2 + 4, { sz: 11, col: done ? '#fff': TC('#3d4d61'), al: 'center' });
          }
        }
      }
      function resultOf(i, j) { return Aarr[i].reduce(function (s, v, k) { return s + v * Barr[k][j]; }, 0); }

      mat(Aarr, ax, my, 'A', 'M×K');
      mat(Barr, bx, my, 'B', 'K×N');
      mat([], cx2, my, 'C', 'M×N');
      txt(c, '×', ax + mw + 13, my + mw / 2 + 4, { sz: 16, col: hexA(A, 0.7), al: 'center' });
      txt(c, '=', bx + mw + 13, my + mw / 2 + 4, { sz: 16, col: hexA(A, 0.7), al: 'center' });

      // 运算说明
      if (mode === 'tc') {
        txt(c, 'Tensor Core：整个 4×4 tile 一次算完 → C[' + ci + '][' + cj + '] = ' + result, pad, my + mw + 26, { sz: 11, col: TC('#fbbf24') });
      } else {
        const kk = Math.min(N - 1, Math.floor(frac * N));
        txt(c, 'CUDA Core：逐元素累加 → 第 ' + (kk + 1) + ' 项 ' + cc + '×' + cw2 + '（共需 ' + N + ' 步）', pad, my + mw + 26, { sz: 11, col: TC('#a78bfa') });
      }
    });
  };

  /* ═══════════════════════════════════════════════════════
     阶段 2 · RAID 实验室
     ═══════════════════════════════════════════════════════ */
  V['raid-lab'] = function (el, api) {
    const A = api.accent;
    el.innerHTML =
      '<div class="v-raid-stage"><div class="disk-row" id="diskRow"></div></div>' +
      '<div class="raid-bars">' +
        '<div class="rbar"><span>可用容量</span><div class="track"><i id="barCap"></i></div><span class="v" id="vCap"></span></div>' +
        '<div class="rbar"><span>读性能</span><div class="track"><i id="barR"></i></div><span class="v" id="vR"></span></div>' +
        '<div class="rbar"><span>写性能</span><div class="track"><i id="barW"></i></div><span class="v" id="vW"></span></div>' +
        '<div class="rbar"><span>容错能力</span><div class="track"><i id="barT"></i></div><span class="v" id="vT"></span></div>' +
      '</div>' +
      '<div class="viz-ctrl">' +
        '<span class="vc-label">RAID 级别</span>' +
        '<div class="vc-seg" id="raidSeg"><button data-l="0">0</button><button data-l="1">1</button><button data-l="5" class="on">5</button><button data-l="6">6</button><button data-l="10">10</button></div>' +
        '<span class="vc-label" style="margin-left:auto">磁盘数</span>' +
        '<input type="range" id="raidN" min="4" max="12" value="6" step="1">' +
        '<span class="vc-val" id="raidNV">6</span>' +
        '<button class="vc-btn" id="raidFail"><svg class="ic"><use href="#i-bolt"/></svg>模拟坏盘</button>' +
      '</div>' +
      '<div class="readouts" style="padding-top:0">' +
        '<dl class="readout" id="roRaw"><dt>裸容量</dt><dd id="vRaw">—</dd></dl>' +
        '<dl class="readout hot" id="roUse"><dt>可用容量</dt><dd id="vUse">—</dd></dl>' +
        '<dl class="readout" id="roTol"><dt>可坏几块盘</dt><dd id="vTol">—</dd></dl>' +
        '<dl class="readout" id="roState"><dt>当前状态</dt><dd id="vState" style="font-size:14.5px">—</dd></dl>' +
      '</div>';

    const DISK_GB = 4;
    let level = '5', n = 6, dead = [];
    const INFO = {
      '0': { cap: 'n', tol: 0, r: 1.0, w: 1.0, desc: '条带化，无冗余。容量 100%，性能最好，但坏一块盘数据全丢。' },
      '1': { cap: 'n/2', tol: 1, r: 0.95, w: 0.5, desc: '镜像，两份完全相同。容量只有 50%，可靠性高。' },
      '5': { cap: 'n-1', tol: 1, r: 0.92, w: 0.62, desc: '条带 + 单份分布式校验。容量 N−1，可坏 1 块。随机写有"写惩罚"。' },
      '6': { cap: 'n-2', tol: 2, r: 0.9, w: 0.48, desc: '条带 + 双校验。容量 N−2，可坏 2 块。写惩罚更大，适合大容量重要数据。' },
      '10': { cap: 'n/2', tol: 1, r: 1.0, w: 0.85, desc: '先镜像再条带。容量 50%，读写都快，数据库/高 IO 首选。' }
    };
    function calc(lv, cnt) {
      const pairs = Math.floor(cnt / 2);
      switch (lv) {
        case '0': return { usable: cnt * DISK_GB, tol: 0 };
        case '1': return { usable: Math.floor(cnt / 2) * DISK_GB, tol: Math.floor(cnt / 2) };
        case '5': return { usable: (cnt - 1) * DISK_GB, tol: 1 };
        case '6': return { usable: (cnt - 2) * DISK_GB, tol: 2 };
        case '10': return { usable: pairs * DISK_GB, tol: pairs };
      }
      return { usable: 0, tol: 0 };
    }
    function roleOf(i, lv, cnt) {
      if (lv === '0') return 'data';
      if (lv === '1') return i % 2 === 0 ? 'data' : 'mirror';
      if (lv === '5') return i === cnt - 1 ? 'parity' : 'data';
      if (lv === '6') return i >= cnt - 2 ? 'parity' : 'data';
      if (lv === '10') return i % 2 === 0 ? 'data' : 'mirror';
      return 'data';
    }
    function render() {
      const c = calc(level, n), info = INFO[level];
      const deadN = dead.length;
      const broken = deadN > c.tol;
      const row = el.querySelector('#diskRow');
      let html = '';
      for (let i = 0; i < n; i++) {
        const role = roleOf(i, level, n);
        const isDead = dead.indexOf(i) >= 0;
        const fill = isDead ? 0 : (role === 'parity' ? 34 : 100);
        html += '<div class="disk ' + (role === 'parity' ? 'parity' : '') + (role === 'mirror' ? 'mirror' : '') + (isDead ? ' dead' : '') + '" data-i="' + i + '">' +
          '<div class="dfill" style="height:' + fill + '%"></div>' +
          '<span class="dn">' + (i + 1) + '</span>' +
          '<span class="drole">' + (isDead ? 'FAILED' : role === 'parity' ? 'PARITY' : role === 'mirror' ? 'MIRROR' : 'DATA') + '</span>' +
        '</div>';
      }
      row.innerHTML = html;
      const raw = n * DISK_GB;
      const maxRef = 48;
      el.querySelector('#vRaw').innerHTML = raw + '<small>GB</small>';
      el.querySelector('#vUse').innerHTML = c.usable + '<small>GB</small>';
      el.querySelector('#vTol').innerHTML = c.tol + '<small>块</small>';
      el.querySelector('#vCap').textContent = Math.round(c.usable / raw * 100) + '%';
      el.querySelector('#vR').textContent = Math.round(info.r * 100) + '%';
      el.querySelector('#vW').textContent = Math.round(info.w * 100) + '%';
      el.querySelector('#vT').textContent = c.tol === 0 ? '无' : c.tol + ' 块';
      el.querySelector('#barCap').style.width = (c.usable / maxRef * 100) + '%';
      el.querySelector('#barR').style.width = (info.r * 100) + '%';
      el.querySelector('#barW').style.width = (info.w * 100) + '%';
      el.querySelector('#barT').style.width = Math.min(100, c.tol * 33) + '%';
      el.querySelector('#vState').textContent = broken ? '数据已丢失' : deadN ? '降级运行 · 可重建' : '正常';
      el.querySelector('#roState').className = 'readout ' + (broken ? 'bad' : deadN ? 'warn' : 'good');
      el.querySelector('#vTol').parentElement.className = 'readout ' + (broken ? 'bad' : 'good');
      api.hint(info.desc + (deadN ? ' 已坏 ' + deadN + ' 块盘。' : ''));
    }
    el.querySelector('#raidSeg').addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      level = b.dataset.l; dead = [];
      this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      render();
    });
    el.querySelector('#raidN').addEventListener('input', function () {
      n = +this.value; dead = dead.filter(function (d) { return d < n; });
      el.querySelector('#raidNV').textContent = n; render();
    });
    el.querySelector('#raidFail').addEventListener('click', function () {
      const alive = [];
      for (let i = 0; i < n; i++) if (dead.indexOf(i) < 0) alive.push(i);
      if (!alive.length) { dead = []; }
      else { dead.push(alive[Math.floor(Math.random() * alive.length)]); }
      render();
    });
    el.querySelector('#diskRow').addEventListener('click', function (e) {
      const d = e.target.closest('.disk'); if (!d) return;
      const i = +d.dataset.i;
      const k = dead.indexOf(i);
      if (k >= 0) dead.splice(k, 1); else dead.push(i);
      render();
    });
    render();
    return null;
  };

  /* ═══════════════════════════════════════════════════════
     阶段 2 · PCIe 共享 vs NVSwitch 全互联
     ═══════════════════════════════════════════════════════ */
  V['topo-nvlink'] = function (el, api) {
    const A = api.accent;
    function svg(mode) {
      const W = 320, H = 250;
      const g = [0, 1, 2, 3].map(function (i) { return { x: 34 + (i % 2) * 156, y: 26 + Math.floor(i / 2) * 86 }; });
      let s = '<svg class="topo-svg" viewBox="0 0 ' + W + ' ' + H + '">';
      if (mode === 'pcie') {
        s += '<rect class="dg-node" x="96" y="118" width="128" height="34" rx="7"/>';
        s += '<text class="dg-t b" x="160" y="139" text-anchor="middle">PCIe Switch</text>';
        g.forEach(function (p, i) {
          s += '<rect class="dg-node" x="' + (p.x - 26) + '" y="' + p.y + '" width="96" height="40" rx="7"/>';
          s += '<text class="dg-t b" x="' + (p.x + 22) + '" y="' + (p.y + 18) + '" text-anchor="middle">GPU' + i + '</text>';
          s += '<text class="dg-t s" x="' + (p.x + 22) + '" y="' + (p.y + 31) + '" text-anchor="middle">x16 共享</text>';
          s += '<path class="dg-flow dash" d="M' + (p.x + 22) + ' ' + (p.y + 40) + ' L160 ' + (i < 2 ? 118 : 152) + '"/>';
        });
        s += '<text class="dg-t s" x="160" y="176" text-anchor="middle">带宽被 4 张卡瓜分 · 需经 CPU/PCIe 转发</text>';
      } else {
        s += '<rect class="dg-node" x="96" y="112" width="128" height="42" rx="8" style="stroke:#22d3ee"/>';
        s += '<text class="dg-t b" x="160" y="132" text-anchor="middle" style="fill:#22d3ee">NVSwitch</text>';
        s += '<text class="dg-t s" x="160" y="146" text-anchor="middle">无阻塞全互联</text>';
        g.forEach(function (p, i) {
          s += '<rect class="dg-node" x="' + (p.x - 26) + '" y="' + p.y + '" width="96" height="40" rx="7"/>';
          s += '<text class="dg-t b" x="' + (p.x + 22) + '" y="' + (p.y + 18) + '" text-anchor="middle">GPU' + i + '</text>';
          s += '<text class="dg-t s" x="' + (p.x + 22) + '" y="' + (p.y + 31) + '" text-anchor="middle">900 GB/s</text>';
          s += '<path class="dg-flow dash" d="M' + (p.x + 22) + ' ' + (p.y + 40) + ' L160 ' + (i < 2 ? 112 : 154) + '"/>';
        });
        s += '<text class="dg-t s" x="160" y="176" text-anchor="middle" style="fill:#22d3ee">任意两卡全带宽直连 · 梯度同步不等数据</text>';
      }
      s += '<text class="dg-t s" x="160" y="212" text-anchor="middle">' + (mode === 'pcie' ? 'A100 PCIe 卡：单向 ~32 GB/s（Gen4 x16）' : 'HGX 8 卡 + NVSwitch：A100 ~600 / H100 ~900 GB/s') + '</text>';
      s += '</svg>';
      return s;
    }
    el.innerHTML =
      '<div class="v-topo">' +
        '<div class="v-topo-cell"><h5>① PCIe 互联（共享带宽）</h5><p class="tp-sub">GPU 之间通信要经 PCIe 交换机转发，带宽被瓜分。</p>' + svg('pcie') + '</div>' +
        '<div class="v-topo-cell"><h5>② NVSwitch 全互联（全带宽）</h5><p class="tp-sub">专用交换芯片，任意两卡之间都是满带宽。</p>' + svg('nvswitch') + '</div>' +
      '</div>' +
      '<div class="viz-ctrl"><span class="vc-label">为什么重要</span>' +
      '<span style="font-size:13px;color:var(--txt-2)">大模型训练要频繁同步梯度，互联带宽不足 → GPU 再强也得"等数据"。这就是 <b style="color:' + A + '">NVLink / NVSwitch</b> 是 AI 服务器核心竞争力之一的原因。</span></div>';
    return null;
  };

  /* ═══════════════════════════════════════════════════════
     阶段 3 · 数据封装 / 解封装
     ═══════════════════════════════════════════════════════ */
  V['packet-encap'] = function (el, api) {
    const A = api.accent;
    const LAYERS = [
      { n: '应用层', h: null, d: 'HTTP 请求：GET /api/v1/train HTTP/1.1', cls: '' },
      { n: '传输层', h: 'TCP 头 20B', d: '源端口 / 目的端口 / 序号 / 校验和', cls: 'tcp' },
      { n: '网络层', h: 'IP 头 20B', d: '源 IP / 目的 IP / TTL / 协议号', cls: 'ip' },
      { n: '链路层', h: '以太网帧头 14B', d: '目的 MAC / 源 MAC / 类型', cls: 'eth' },
      { n: '物理层', h: '0101…', d: '电信号 / 光信号 在介质上传输', cls: 'eth' }
    ];
    el.innerHTML =
      '<div class="v-stack" id="encStack"></div>' +
      '<div class="viz-ctrl">' +
        '<button class="vc-btn" id="encPlay"><svg class="ic"><use href="#i-play"/></svg>播放封装</button>' +
        '<button class="vc-btn" id="encStep">下一步</button>' +
        '<button class="vc-btn" id="encDecap">反向：解封装</button>' +
        '<span class="vc-label" style="margin-left:auto" id="encInfo">点"播放"看数据如何被逐层加上头部</span>' +
      '</div>';
    const box = el.querySelector('#encStack');
    function render(active) {
      let inner = '';
      const segs = [];
      for (let i = 0; i <= active && i < LAYERS.length; i++) {
        if (LAYERS[i].h) segs.push('<div class="hdr ' + LAYERS[i].cls + '">' + LAYERS[i].h + '</div>');
      }
      if (active >= 0) segs.push('<div class="data">' + LAYERS[Math.min(active, LAYERS.length - 1)].d + '</div>');
      inner = '<div class="seg on"><div style="padding:0;display:flex;flex:1">' + segs.join('') + '</div><div class="lbl">' + (LAYERS[Math.min(active, LAYERS.length - 1)].n) + '</div></div>';
      box.innerHTML = inner;
      const prev = box.querySelectorAll('.seg');
      prev.forEach(function (s, i) { setTimeout(function () { s.classList.add('on'); }, i * 60); });
    }
    let active = 0;
    render(0);
    el.querySelector('#encStep').addEventListener('click', function () {
      active = Math.min(LAYERS.length - 1, active + 1);
      render(active);
      el.querySelector('#encInfo').textContent = active < LAYERS.length - 1 ? '已加 ' + active + ' 层头部，继续往上封装' : '封装完成：帧 → 比特流，发往介质';
    });
    el.querySelector('#encDecap').addEventListener('click', function () {
      active = Math.max(0, active - 1);
      render(active);
      el.querySelector('#encInfo').textContent = '接收端逐层拆头（解封装）：' + LAYERS[active].n + ' 已剥离上层头部';
    });
    let timer = null;
    el.querySelector('#encPlay').addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = null; this.innerHTML = '<svg class="ic"><use href="#i-play"/></svg>播放封装'; return; }
      active = 0; render(0);
      this.innerHTML = '<svg class="ic"><use href="#i-close"/></svg>停止';
      const self = this;
      timer = setInterval(function () {
        active++;
        if (active >= LAYERS.length) { active = LAYERS.length - 1; clearInterval(timer); timer = null; self.innerHTML = '<svg class="ic"><use href="#i-play"/></svg>播放封装'; el.querySelector('#encInfo').textContent = '封装完成：抓包时层层剥开，就能定位问题在哪一层。'; }
        render(active);
      }, 1000);
    });
    return function () { if (timer) clearInterval(timer); };
  };

  /* ═══════════════════════════════════════════════════════
     阶段 3 · TCP 三次握手 / 四次挥手
     ═══════════════════════════════════════════════════════ */
  V['handshake'] = function (el, api) {
    const A = api.accent;
    const SEQ = [
      { dir: 'f', p: 'SYN  seq=x', s: '客户端：我想连接', st: 'SYN_SENT' },
      { dir: 'r', p: 'SYN+ACK  seq=y ack=x+1', s: '服务器：收到，我也要连', st: 'SYN_RCVD' },
      { dir: 'f', p: 'ACK  ack=y+1', s: '客户端：确认，连接建立', st: 'ESTABLISHED ✓ 三次握手完成' },
      { dir: 'f', p: 'FIN', s: '客户端：我不发了（半关闭）', st: 'FIN_WAIT_1' },
      { dir: 'r', p: 'ACK', s: '服务器：知道了（可能还有数据要发）', st: 'CLOSE_WAIT' },
      { dir: 'r', p: 'FIN', s: '服务器：我也不发了', st: 'LAST_ACK' },
      { dir: 'f', p: 'ACK', s: '客户端：知道了，连接关闭', st: 'TIME_WAIT → CLOSED ✓ 四次挥手完成' }
    ];
    el.innerHTML =
      '<div class="v-hand">' +
        '<div class="hand-grid">' +
          '<div class="hand-col"><b>客户端 Client</b><span id="hcState">CLOSED</span></div>' +
          '<div class="hand-col"><b>服务器 Server</b><span id="hsState">LISTEN</span></div>' +
        '</div>' +
        '<div class="hand-rows" id="handRows"></div>' +
        '<div class="hand-state" id="handState">点击下方按钮，逐步观察状态机怎么走</div>' +
      '</div>' +
      '<div class="viz-ctrl">' +
        '<button class="vc-btn" id="hsStep">下一步</button>' +
        '<button class="vc-btn" id="hsPlay"><svg class="ic"><use href="#i-play"/></svg>自动播放</button>' +
        '<button class="vc-btn" id="hsReset"><svg class="ic"><use href="#i-refresh"/></svg>重置</button>' +
        '<span class="vc-label" style="margin-left:auto" id="hsNote">两次不够 —— 服务器无法确认客户端"能收到"</span>' +
      '</div>';
    const rows = el.querySelector('#handRows');
    rows.innerHTML = SEQ.map(function (m, i) {
      const left = m.dir === 'f' ? '' : 'SYN';
      return '<div class="hand-msg ' + (m.dir === 'r' ? 'rev' : '') + '" data-i="' + i + '">' +
        '<span class="who ' + (m.dir === 'f' ? '' : 'r') + '">' + (m.dir === 'f' ? '客户端' : '服务器') + '</span>' +
        '<span class="arrow" style="' + (m.dir === 'r' ? 'flex-direction:row-reverse' : '') + '"><span class="pkt" style="' + (m.dir === 'r' ? 'right:0' : 'left:0') + '">' + m.p + '</span></span>' +
        '<span class="who ' + (m.dir === 'f' ? 'r' : '') + '">' + (m.dir === 'f' ? '服务器' : '客户端') + '</span>' +
      '</div>';
    }).join('');
    let cur = -1, timer = null;
    function sync() {
      rows.querySelectorAll('.hand-msg').forEach(function (r, i) { r.classList.toggle('on', i <= cur); });
      if (cur < 0) { el.querySelector('#handState').textContent = '点击下方按钮，逐步观察状态机怎么走'; el.querySelector('#hcState').textContent = 'CLOSED'; el.querySelector('#hsState').textContent = 'LISTEN'; return; }
      const m = SEQ[cur];
      el.querySelector('#handState').textContent = m.s + '  →  ' + m.st;
      el.querySelector('#hcState').textContent = cur <= 2 ? (cur === 0 ? 'SYN_SENT' : cur === 1 ? 'SYN_SENT' : 'ESTABLISHED') : (cur >= 6 ? 'CLOSED' : cur >= 4 ? 'FIN_WAIT_2' : 'FIN_WAIT_1');
      el.querySelector('#hsState').textContent = cur <= 2 ? (cur <= 1 ? 'SYN_RCVD' : 'ESTABLISHED') : (cur >= 6 ? 'CLOSED' : cur >= 5 ? 'LAST_ACK' : 'CLOSE_WAIT');
      el.querySelector('#hsNote').textContent = cur < 3 ? '为什么是三次？两次不够——服务器无法确认客户端"能收到"。' : '为什么是四次？TCP 全双工，两个方向要分别关闭，②③之间可能还有数据要发完。';
    }
    el.querySelector('#hsStep').addEventListener('click', function () { cur = Math.min(SEQ.length - 1, cur + 1); sync(); });
    el.querySelector('#hsReset').addEventListener('click', function () { cur = -1; if (timer) { clearInterval(timer); timer = null; } sync(); });
    el.querySelector('#hsPlay').addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = null; this.innerHTML = '<svg class="ic"><use href="#i-play"/></svg>自动播放'; return; }
      if (cur >= SEQ.length - 1) cur = -1;
      this.innerHTML = '<svg class="ic"><use href="#i-close"/></svg>停止';
      const self = this;
      timer = setInterval(function () {
        cur++;
        if (cur >= SEQ.length) { clearInterval(timer); timer = null; self.innerHTML = '<svg class="ic"><use href="#i-play"/></svg>自动播放'; cur = SEQ.length - 1; sync(); return; }
        sync();
      }, 1100);
    });
    sync();
    return function () { if (timer) clearInterval(timer); };
  };

  /* ═══════════════════════════════════════════════════════
     阶段 3 · 子网计算器
     ═══════════════════════════════════════════════════════ */
  V['subnet-lab'] = function (el, api) {
    const A = api.accent;
    el.innerHTML =
      '<div class="v-subnet">' +
        '<div class="v-subnet-left">' +
          '<label class="vc-label" style="display:block;margin-bottom:7px">IP 地址</label>' +
          '<input type="text" id="snIp" value="192.168.1.10">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-top:14px">' +
            '<span class="vc-label">前缀长度</span>' +
            '<input type="range" id="snP" min="8" max="30" value="24">' +
            '<span class="vc-val" id="snPV">/24</span>' +
          '</div>' +
          '<div class="bits" id="snBits"></div>' +
        '</div>' +
        '<div class="v-subnet-right">' +
          '<div class="sn-row"><span>子网掩码</span><b id="snMask">—</b></div>' +
          '<div class="sn-row"><span>网络地址</span><b id="snNet">—</b></div>' +
          '<div class="sn-row"><span>广播地址</span><b id="snBc">—</b></div>' +
          '<div class="sn-row"><span>可用主机范围</span><b id="snRange">—</b></div>' +
          '<div class="sn-row"><span>可用主机数</span><b id="snCnt">—</b></div>' +
          '<div class="sn-row"><span>是否私有地址</span><b id="snPriv">—</b></div>' +
        '</div>' +
      '</div>' +
      '<div class="viz-ctrl"><span class="vc-label">判同子网</span>' +
        '<span style="font-size:13px;color:var(--txt-2)">IP <b style="color:' + A + '">按位与</b> 掩码，结果相同即同子网 → 同子网直接二层通信，跨子网必须经网关。</span>' +
      '</div>';
    const ipEl = el.querySelector('#snIp'), pEl = el.querySelector('#snP'), pvEl = el.querySelector('#snPV');
    function parse(s) {
      const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s.trim());
      if (!m) return null;
      const o = [+m[1], +m[2], +m[3], +m[4]];
      if (o.some(function (x) { return x > 255; })) return null;
      return o;
    }
    function calc() {
      const o = parse(ipEl.value) || [192, 168, 1, 10];
      const p = +pEl.value;
      pvEl.textContent = '/' + p;
      let ipN = (o[0] << 24 >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3];
      const maskN = p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0;
      const netN = (ipN & maskN) >>> 0;
      const bcN = (netN | (~maskN >>> 0)) >>> 0;
      const toStr = function (n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); };
      el.querySelector('#snMask').textContent = toStr(maskN);
      el.querySelector('#snNet').textContent = toStr(netN) + '/' + p;
      el.querySelector('#snBc').textContent = p >= 31 ? '—' : toStr(bcN);
      const first = p >= 31 ? netN : (netN + 1) >>> 0;
      const last = p >= 31 ? bcN : (bcN - 1) >>> 0;
      el.querySelector('#snRange').textContent = p >= 31 ? '—' : toStr(first) + ' – ' + toStr(last);
      const cnt = Math.max(0, Math.pow(2, 32 - p) - 2);
      el.querySelector('#snCnt').textContent = cnt.toLocaleString() + ' 台';
      const isPriv = o[0] === 10 || (o[0] === 172 && o[1] >= 16 && o[1] <= 31) || (o[0] === 192 && o[1] === 168);
      el.querySelector('#snPriv').textContent = isPriv ? '是（RFC 1918）' : '否（公网）';
      el.querySelector('#snPriv').style.color = isPriv ? '#34d399': TC('#fbbf24');
      // 位图
      const bits = [];
      for (let i = 31; i >= 0; i--) {
        const b = (ipN >>> i) & 1;
        bits.push('<i class="' + (i < 32 - p ? 'net' : '') + ' ' + (b ? 'on' : '') + '">' + b + '</i>');
        if (i % 8 === 0 && i !== 0) bits.push('<i class="dotsep"></i>');
      }
      el.querySelector('#snBits').innerHTML = bits.join('');
    }
    ipEl.addEventListener('input', calc);
    pEl.addEventListener('input', calc);
    calc();
    return null;
  };

  /* ═══════════════════════════════════════════════════════
     阶段 3 · Spine-Leaf + ECMP
     ═══════════════════════════════════════════════════════ */
  V['spine-leaf'] = function (el, api) {
    const A = api.accent;
    el.innerHTML =
      '<div class="v-spine"><canvas></canvas></div>' +
      '<div class="viz-ctrl">' +
        '<button class="vc-btn" id="spFail"><svg class="ic"><use href="#i-bolt"/></svg>模拟 Spine1 故障</button>' +
        '<span class="vc-label" style="margin-left:auto" id="spInfo">ECMP：4 条等价路径，流量自动分散</span>' +
      '</div>';
    const cv = el.querySelector('canvas');
    let fail = false;
    el.querySelector('#spFail').addEventListener('click', function () {
      fail = !fail;
      this.classList.toggle('on', fail);
      this.innerHTML = fail ? '<svg class="ic"><use href="#i-refresh"/></svg>恢复 Spine1' : '<svg class="ic"><use href="#i-bolt"/></svg>模拟 Spine1 故障';
      el.querySelector('#spInfo').textContent = fail ? 'Spine1 故障 → 流量全部改走 Spine2，业务不中断（高可用）' : 'ECMP：4 条等价路径，流量自动分散';
    });
    const packets = [];
    return anim(el, cv, 330, function (c, W, H, dt, tm) {
      c.clearRect(0, 0, W, H);
      const spines = [{ x: W * 0.34, y: 40, n: 'Spine1' }, { x: W * 0.66, y: 40, n: 'Spine2' }];
      const leafN = 4;
      const leaves = [];
      for (let i = 0; i < leafN; i++) leaves.push({ x: (W / (leafN + 1)) * (i + 1), y: H * 0.52, n: 'Leaf' + (i + 1) });
      const servers = [];
      for (let i = 0; i < leafN; i++) for (let k = 0; k < 2; k++) servers.push({ x: leaves[i].x + (k - 0.5) * 34, y: H - 40, l: i });

      // 链路
      leaves.forEach(function (lf) {
        spines.forEach(function (sp, si) {
          const dead = fail && si === 0;
          c.strokeStyle = dead ? 'rgba(251,113,133,.3)' : hexA(A, 0.2);
          c.lineWidth = 1.2;
          c.beginPath(); c.moveTo(lf.x, lf.y - 16); c.lineTo(sp.x, sp.y + 16); c.stroke();
          if (dead) { c.strokeStyle = RG('hot',.6); c.beginPath(); c.moveTo((lf.x + sp.x) / 2 - 5, (lf.y + sp.y) / 2 - 5); c.lineTo((lf.x + sp.x) / 2 + 5, (lf.y + sp.y) / 2 + 5); c.moveTo((lf.x + sp.x) / 2 + 5, (lf.y + sp.y) / 2 - 5); c.lineTo((lf.x + sp.x) / 2 - 5, (lf.y + sp.y) / 2 + 5); c.stroke(); }
        });
        servers.filter(function (s) { return s.l === leaves.indexOf(lf); }).forEach(function (sv) {
          c.strokeStyle = hexA(A, 0.16); c.lineWidth = 1;
          c.beginPath(); c.moveTo(sv.x, sv.y - 11); c.lineTo(lf.x, lf.y + 16); c.stroke();
        });
      });
      // 节点
      function node(x, y, w, h, label, sub, hot) {
        c.fillStyle = hot ? hexA(A, 0.16) : RG('panel-2',.92);
        rr(c, x - w / 2, y - h / 2, w, h, 7); c.fill();
        c.strokeStyle = hot ? A : RG('grid',.28); c.lineWidth = 1.3; c.stroke();
        txt(c, label, x, y - 1, { sz: 10, col: hot ? '#fff': TC('#dde8f5'), al: 'center', w: '700' });
        if (sub) txt(c, sub, x, y + 11, { sz: 8, col: TC('#6b829c'), al: 'center' });
      }
      spines.forEach(function (sp, i) { const dead = fail && i === 0; node(sp.x, sp.y, 74, 34, sp.n, dead ? 'FAULT' : '脊层', !dead); });
      leaves.forEach(function (lf) { node(lf.x, lf.y, 64, 30, lf.n, '叶层', false); });
      servers.forEach(function (sv) { c.fillStyle = hexA(A, 0.3); rr(c, sv.x - 11, sv.y - 11, 22, 22, 4); c.fill(); c.strokeStyle = hexA(A, 0.5); c.lineWidth = 1; c.stroke(); });
      txt(c, '服务器', W - 12, H - 40, { sz: 9, col: TC('#47596f'), al: 'right' });

      // 数据包：server → leaf → spine → leaf → server（东西向）
      if (!REDUCED) {
        if (packets.length < 26) packets.push(newPkt());
        for (let i = packets.length - 1; i >= 0; i--) {
          const p = packets[i];
          p.t += dt * p.sp;
          if (p.t >= 1) { packets.splice(i, 1); continue; }
          const src = servers[p.src], dst = servers[p.dst];
          const l1 = leaves[src.l], l2 = leaves[dst.l];
          const sp = spines[fail ? 1 : p.spineIdx];
          // 路径：src → l1 → sp → l2 → dst
          const seg = p.t * 4;
          let x, y;
          const k = Math.floor(seg), q = seg - k;
          const pts = [[src.x, src.y], [l1.x, l1.y], [sp.x, sp.y], [l2.x, l2.y], [dst.x, dst.y]];
          x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * q;
          y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * q;
          const g = c.createRadialGradient(x, y, 0, x, y, 9);
          g.addColorStop(0, hexA(A, 0.9)); g.addColorStop(1, hexA(A, 0));
          c.fillStyle = g; c.beginPath(); c.arc(x, y, 9, 0, 6.283); c.fill();
          c.fillStyle = TC('#fff'); c.beginPath(); c.arc(x, y, 2.2, 0, 6.283); c.fill();
        }
      }
      function newPkt() {
        return { src: Math.floor(Math.random() * servers.length), dst: Math.floor(Math.random() * servers.length), t: 0, sp: 0.5 + Math.random() * 0.5, spineIdx: Math.random() < 0.5 ? 0 : 1 };
      }
    });
  };

  return V;
})();
