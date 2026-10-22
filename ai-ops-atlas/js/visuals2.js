/* ══════════════════════════════════════════════════════════
   可视化引擎 · 第二部分（阶段 4–6）
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const V = window.AIOPS_VIZ;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    cv.width = Math.round(w * dpr); cv.height = Math.round(height * dpr); cv.style.height = height + 'px';
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, height);
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
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016; last = t;
      frameFn(c, W, H, dt, t / 1000); raf = requestAnimationFrame(tick);
    }
    frameFn(c, W, H, 0.016, performance.now() / 1000);
    return function () { run = false; if (raf) cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y);
    c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  function txt(c, s, x, y, o) {
    o = o || {}; c.save();
    c.font = (o.w ? o.w + ' ' : '') + (o.sz || 11) + 'px ui-monospace, Consolas, monospace';
    c.fillStyle = o.col || TC('#8ba0b8'); c.textAlign = o.al || 'left'; c.textBaseline = o.bl || 'alphabetic';
    c.fillText(s, x, y); c.restore();
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ═══════════════ 阶段 4 · 容器 vs 虚拟机 ═══════════════ */
  V['container-vm'] = function (el, api) {
    const A = api.accent;
    el.innerHTML =
      '<div class="v-cvm">' +
        '<div class="v-cvm-cell"><h5>虚拟机 VM · 独立小房子</h5>' +
          '<div class="stack-box app">App A</div>' +
          '<div class="stack-box app">App B</div>' +
          '<div class="stack-box os">Guest OS（完整内核 + 系统）</div>' +
          '<div class="stack-box os">Guest OS（完整内核 + 系统）</div>' +
          '<div class="stack-box hv">Hypervisor / VMM</div>' +
          '<div class="stack-box hw">物理硬件 · 宿主内核</div>' +
          '<p style="font-size:12px;color:var(--txt-3);margin:12px 0 0">隔离强 · 体积 GB 级 · 启动分钟级 · 一台机器几十个</p>' +
        '</div>' +
        '<div class="v-cvm-cell"><h5>容器 Container · 合租房独立房间</h5>' +
          '<div class="stack-row"><div class="stack-box app">App A</div><div class="stack-box app">App B</div></div>' +
          '<div class="stack-box eng">Namespace 隔离 · Cgroups 限制</div>' +
          '<div class="stack-box eng">共享宿主机内核（同一个地基）</div>' +
          '<div class="stack-box hw">物理硬件</div>' +
          '<p style="font-size:12px;color:var(--txt-3);margin:12px 0 0">隔离较弱 · 体积 MB 级 · 启动秒级/毫秒级 · 一台机器几百个</p>' +
        '</div>' +
      '</div>' +
      '<div class="viz-ctrl"><span class="vc-label">启动速度对比</span>' +
        '<div style="flex:1;min-width:180px"><canvas id="cvRace" style="width:100%"></canvas></div>' +
        '<button class="vc-btn" id="cvGo"><svg class="ic"><use href="#i-play"/></svg>重新计时</button>' +
      '</div>' +
      '<div class="readouts" style="padding-top:0">' +
        '<dl class="readout good"><dt>VM 启动</dt><dd id="cvVm">—</dd></dl>' +
        '<dl class="readout hot"><dt>容器启动</dt><dd id="cvCtn">—</dd></dl>' +
        '<dl class="readout"><dt>密度比</dt><dd>1 : 10+</dd></dl>' +
      '</div>';
    const cv = el.querySelector('#cvRace');
    let t = 0, running = false;
    el.querySelector('#cvGo').addEventListener('click', function () { t = 0; running = true; });
    const stop = anim(el, cv, 54, function (c, W, H, dt) {
      if (running) t += dt;
      c.clearRect(0, 0, W, H);
      const vmT = clamp(t / 3.2, 0, 1), ctT = clamp(t / 0.32, 0, 1);
      const barW = W - 96;
      // VM
      c.fillStyle = RG('grid',.13); rr(c, 62, 6, barW, 14, 7); c.fill();
      c.fillStyle = TC('#34d399'); rr(c, 62, 6, barW * vmT, 14, 7); c.fill();
      txt(c, 'VM', 8, 17, { sz: 10, col: TC('#6b829c') });
      txt(c, vmT >= 1 ? '60s' : (vmT * 60).toFixed(0) + 's', W - 30, 17, { sz: 10, col: TC('#34d399') });
      // 容器
      c.fillStyle = RG('grid',.13); rr(c, 62, 32, barW, 14, 7); c.fill();
      c.fillStyle = A; rr(c, 62, 32, barW * ctT, 14, 7); c.fill();
      txt(c, '容器', 2, 43, { sz: 10, col: TC('#6b829c') });
      txt(c, ctT >= 1 ? '0.9s' : (ctT * 0.9).toFixed(1) + 's', W - 30, 43, { sz: 10, col: A });
      el.querySelector('#cvVm').innerHTML = vmT >= 1 ? '60<small>s</small>' : (vmT * 60).toFixed(0) + '<small>s</small>';
      el.querySelector('#cvCtn').innerHTML = ctT >= 1 ? '0.9<small>s</small>' : (ctT * 0.9).toFixed(1) + '<small>s</small>';
      if (vmT >= 1 && ctT >= 1) running = false;
    });
    el.querySelector('#cvGo').click();
    return stop;
  };

  /* ═══════════════ 阶段 4 · 镜像分层与 COW ═══════════════ */
  V['image-layers'] = function (el, api) {
    const A = api.accent;
    const LAYERS = [
      { i: '1', t: 'FROM python:3.11-slim', s: '基础镜像层', cls: '' },
      { i: '2', t: 'WORKDIR /app', s: '元数据层（几乎不占空间）', cls: '' },
      { i: '3', t: 'COPY requirements.txt .', s: '复制依赖清单（很少变）', cls: '' },
      { i: '4', t: 'RUN pip install -r requirements.txt', s: '安装依赖（缓存命中关键层）', cls: '' },
      { i: '5', t: 'COPY . .', s: '复制代码（经常变，放最后）', cls: '' }
    ];
    el.innerHTML =
      '<div class="v-layers-stage">' +
        '<div class="v-layers-list" id="lzList"></div>' +
        '<div class="v-layers-side">' +
          '<h4 style="font-family:var(--f-mono);font-size:12.5px;color:' + A + ';margin:0 0 10px">写时复制 COW</h4>' +
          '<p id="cowTxt">容器启动时在镜像之上加一个<b style="color:' + A + '">可写层</b>。读文件直接读镜像层；<b>改文件时先把文件复制到可写层再改</b> —— 原镜像层永不变。</p>' +
          '<div style="margin-top:auto;display:flex;flex-direction:column;gap:7px">' +
            '<button class="vc-btn" id="lzBuild"><svg class="ic"><use href="#i-layers"/></svg>构建镜像</button>' +
            '<button class="vc-btn" id="lzCow"><svg class="ic"><use href="#i-copy"/></svg>演示写时复制</button>' +
          '</div>' +
          '<p style="font-size:12px;color:var(--txt-4);margin-top:12px">把<b>不常变的指令放前面</b>、常变的放后面，构建时才能命中缓存。</p>' +
        '</div>' +
      '</div>';
    const list = el.querySelector('#lzList');
    function render(cow) {
      let html = '';
      if (cow) html += '<div class="layer w in" id="lzW"><span class="lz-i" style="background:#fbbf24">W</span><span class="lz-t">容器可写层（Container Layer）</span><span class="lz-s">app.py 已被修改 → 复制到这里</span></div>';
      for (let i = LAYERS.length - 1; i >= 0; i--) {
        const L = LAYERS[i];
        html += '<div class="layer in"><span class="lz-i" style="background:' + A + '">' + L.i + '</span><span class="lz-t">' + L.t + '</span><span class="lz-s">' + L.s + '</span></div>';
      }
      list.innerHTML = html;
      const items = list.querySelectorAll('.layer');
      items.forEach(function (n, i) { n.classList.remove('in'); setTimeout(function () { n.classList.add('in'); }, i * 90); });
    }
    render(false);
    el.querySelector('#lzBuild').addEventListener('click', function () { render(false); api.toast('镜像构建：5 层只读层叠加，多镜像可共享底层'); });
    el.querySelector('#lzCow').addEventListener('click', function () {
      render(true);
      el.querySelector('#cowTxt').innerHTML = '你修改了容器里的 <b>app.py</b> → 它被复制到可写层再修改。<b style="color:' + A + '">镜像层依旧只读不变</b>；删掉容器，可写层就没了 —— 所以数据要用数据卷持久化。';
    });
    return null;
  };

  /* ═══════════════ 阶段 4 · Pod 创建流程 ═══════════════ */
  V['pod-lifecycle'] = function (el, api) {
    const A = api.accent;
    const STEPS = [
      { n: 'kubectl', t: '提交', p: 'apply -f pod.yaml', log: '$ kubectl apply -f pod.yaml', d: '你声明"我要什么"（声明式）' },
      { n: 'api', t: '接收', p: '写入 etcd', log: 'pod/web created', d: 'apiserver 校验并写入 etcd' },
      { n: 'sched', t: '调度', p: '过滤 + 打分', log: 'scheduler: 0/3 nodes available → node01', d: '过滤（Filter）→ 打分（Score）→ 选定节点' },
      { n: 'kubelet', t: '干活', p: '调用 CRI', log: 'kubelet[node01]: Pulling image "nginx:1.25"', d: '目标节点 kubelet 监听到"该我干活了"' },
      { n: 'CRI', t: '起容器', p: 'containerd → runc', log: 'Successfully pulled image in 1.2s\nStarted container app', d: 'containerd → runc 真正调用内核创建容器' },
      { n: 'proxy', t: '网络', p: '更新转发规则', log: 'kube-proxy: syncing iptables rules', d: '如涉及 Service，kube-proxy 更新转发规则' },
      { n: 'etcd', t: '上报', p: '状态回写', log: 'pod/web status: Running  (1/1 Ready)', d: 'kubelet 上报状态 → apiserver → etcd，调谐闭环' }
    ];
    el.innerHTML =
      '<div class="v-pod-stage">' +
        '<div class="pod-track" id="podTrack"></div>' +
        '<div class="pod-log" id="podLog"></div>' +
      '</div>' +
      '<div class="viz-ctrl">' +
        '<button class="vc-btn" id="podPlay"><svg class="ic"><use href="#i-play"/></svg>播放</button>' +
        '<button class="vc-btn" id="podStep">单步</button>' +
        '<button class="vc-btn" id="podReset"><svg class="ic"><use href="#i-refresh"/></svg>重置</button>' +
        '<span class="vc-label" style="margin-left:auto" id="podNote">所有组件都围绕 apiserver + etcd 协作</span>' +
      '</div>';
    const track = el.querySelector('#podTrack');
    track.innerHTML = STEPS.map(function (s, i) {
      return '<div class="pod-step" data-i="' + i + '"><div class="pnode">' + (i + 1) + '</div><b>' + s.n + '</b><p>' + s.t + '</p></div>';
    }).join('');
    let cur = -1, timer = null;
    const logs = [];
    function sync() {
      track.querySelectorAll('.pod-step').forEach(function (n, i) {
        n.classList.toggle('on', i === cur);
        n.classList.toggle('done', i < cur);
      });
      if (cur >= 0) {
        logs.push('<span class="dim">[' + String(cur).padStart(2, '0') + ']</span> ' + STEPS[cur].log.replace(/\n/g, '<br>&nbsp;&nbsp;&nbsp;&nbsp;'));
        el.querySelector('#podLog').innerHTML = logs.join('<br>');
        el.querySelector('#podLog').scrollTop = 9999;
        el.querySelector('#podNote').textContent = STEPS[cur].d;
      }
    }
    el.querySelector('#podStep').addEventListener('click', function () {
      if (cur < STEPS.length - 1) { cur++; sync(); }
    });
    el.querySelector('#podReset').addEventListener('click', function () {
      cur = -1; logs.length = 0; if (timer) { clearInterval(timer); timer = null; }
      el.querySelector('#podLog').innerHTML = '<span class="dim">// 等待操作…</span>';
      el.querySelector('#podNote').textContent = '所有组件都围绕 apiserver + etcd 协作';
      sync();
    });
    el.querySelector('#podPlay').addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = null; this.innerHTML = '<svg class="ic"><use href="#i-play"/></svg>播放'; return; }
      cur = -1; logs.length = 0; el.querySelector('#podLog').innerHTML = '';
      this.innerHTML = '<svg class="ic"><use href="#i-close"/></svg>暂停';
      const self = this;
      timer = setInterval(function () {
        if (cur >= STEPS.length - 1) { clearInterval(timer); timer = null; self.innerHTML = '<svg class="ic"><use href="#i-play"/></svg>播放'; return; }
        cur++; sync();
      }, 950);
      cur++; sync();
    });
    el.querySelector('#podLog').innerHTML = '<span class="dim">// 等待操作…</span>';
    return function () { if (timer) clearInterval(timer); };
  };

  /* ═══════════════ 阶段 4 · GPU Device Plugin ═══════════════ */
  V['gpu-plugin'] = function (el, api) {
    const A = api.accent;
    const PIPE = [
      '① Device Plugin 启动，通过 Unix Socket 向 kubelet 注册',
      '② Plugin 上报本节点可用 GPU 数量与 ID（ListAndWatch）',
      '③ kubelet 上报 apiserver：nvidia.com/gpu = 8',
      '④ 用户创建 Pod 申请 nvidia.com/gpu: 1',
      '⑤ 调度器按资源可用性选出节点',
      '⑥ kubelet 调用 Plugin 的 Allocate 接口',
      '⑦ Plugin 返回设备节点路径 + 驱动库路径',
      '⑧ 容器启动，成功访问指定 GPU'
    ];
    el.innerHTML =
      '<div class="v-plugin">' +
        '<div class="pl-stage">' +
          '<div class="pl-col"><h5>kubelet（节点代理）</h5>' +
            '<div class="pl-node" data-k="0">DeviceManager</div>' +
            '<div class="pl-node" data-k="1">Socket: device-plugins/</div>' +
            '<div class="pl-node" data-k="2">上报 Capacity</div>' +
            '<div class="pl-node" data-k="3">调用 Allocate()</div>' +
          '</div>' +
          '<div class="pl-col"><h5>nvidia-device-plugin</h5>' +
            '<div class="pl-node" data-k="0">Register()</div>' +
            '<div class="pl-node" data-k="1">ListAndWatch()</div>' +
            '<div class="pl-node" data-k="2">基于 NVML 枚举 GPU</div>' +
            '<div class="pl-node" data-k="3">返回设备挂载清单</div>' +
          '</div>' +
          '<div class="pl-col"><h5>容器内</h5>' +
            '<div class="pl-node" data-k="0">请求 nvidia.com/gpu: 1</div>' +
            '<div class="pl-node" data-k="1">挂载 /dev/nvidia*</div>' +
            '<div class="pl-node" data-k="2">注入驱动库</div>' +
            '<div class="pl-node" data-k="3">nvidia-smi 可用 ✓</div>' +
          '</div>' +
        '</div>' +
        '<div class="pl-pipe" id="plPipe"></div>' +
      '</div>' +
      '<div class="viz-ctrl">' +
        '<button class="vc-btn" id="plPlay"><svg class="ic"><use href="#i-play"/></svg>播放流程</button>' +
        '<button class="vc-btn" id="plStep">单步</button>' +
        '<span class="vc-label" style="margin-left:auto" id="plNote">K8s 原生只认 CPU/内存，GPU 要靠 Device Plugin 接入</span>' +
      '</div>';
    const pipe = el.querySelector('#plPipe');
    pipe.innerHTML = PIPE.map(function (p, i) { return '<div class="pl-line" data-i="' + i + '"><span class="idx">' + (i + 1) + '</span>' + p.slice(2) + '</div>'; }).join('');
    let cur = -1, timer = null;
    function sync() {
      pipe.querySelectorAll('.pl-line').forEach(function (n, i) { n.classList.toggle('hi', i === cur); });
      el.querySelectorAll('.pl-node').forEach(function (n) {
        const k = +n.dataset.k;
        n.classList.toggle('hi', k === Math.min(3, Math.max(0, cur)) && cur >= 0);
      });
      if (cur >= 0) el.querySelector('#plNote').textContent = PIPE[cur].slice(2);
    }
    el.querySelector('#plStep').addEventListener('click', function () { cur = Math.min(PIPE.length - 1, cur + 1); sync(); });
    el.querySelector('#plPlay').addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = null; this.innerHTML = '<svg class="ic"><use href="#i-play"/></svg>播放流程'; return; }
      cur = -1; this.innerHTML = '<svg class="ic"><use href="#i-close"/></svg>暂停';
      const self = this;
      timer = setInterval(function () {
        if (cur >= PIPE.length - 1) { clearInterval(timer); timer = null; self.innerHTML = '<svg class="ic"><use href="#i-play"/></svg>播放流程'; return; }
        cur++; sync();
      }, 900);
      cur++; sync();
    });
    return function () { if (timer) clearInterval(timer); };
  };

  /* ═══════════════ 阶段 5 · Prometheus 拉取模型 ═══════════════ */
  V['prom-pull'] = function (el, api) {
    const A = api.accent;
    el.innerHTML =
      '<div class="v-prom"><canvas></canvas></div>' +
      '<div class="prom-grid">' +
        '<div class="prom-cell"><h6>抓取间隔</h6><div class="big" id="ppInt">15<small>s</small></div></div>' +
        '<div class="prom-cell"><h6>已抓取目标</h6><div class="big" id="ppTgt">0<small>次</small></div></div>' +
        '<div class="prom-cell"><h6>写入 TSDB</h6><div class="big" id="ppPts">0<small>点</small></div></div>' +
        '<div class="prom-cell"><h6>采集模型</h6><div class="big" style="font-size:17.5px">Pull<small>主动拉取</small></div></div>' +
      '</div>' +
      '<div class="viz-ctrl">' +
        '<span class="vc-label">抓取间隔</span>' +
        '<input type="range" id="ppR" min="1" max="8" value="3">' +
        '<span class="vc-val" id="ppV">3s</span>' +
        '<button class="vc-btn" id="ppScrape"><svg class="ic"><use href="#i-refresh"/></svg>立即抓取一次</button>' +
        '<span class="vc-label" style="margin-left:auto">Prometheus 主动访问目标的 /metrics</span>' +
      '</div>';
    const cv = el.querySelector('canvas');
    let interval = 3, timer = 0, scrapes = 0, pts = 0, beams = [];
    el.querySelector('#ppR').addEventListener('input', function () {
      interval = +this.value; el.querySelector('#ppV').textContent = interval + 's';
      el.querySelector('#ppInt').innerHTML = interval + '<small>s</small>';
    });
    const TARGETS = [
      { n: 'node_exporter', s: ':9100', d: 'CPU/内存/磁盘/网络' },
      { n: 'dcgm_exporter', s: ':9400', d: 'GPU 利用率/温度/ECC' },
      { n: 'blackbox', s: ':9115', d: 'HTTP/TCP 可用性' },
      { n: 'kube-state', s: ':8080', d: 'K8s 对象状态' }
    ];
    function fire() {
      scrapes++; pts += 4;
      el.querySelector('#ppTgt').innerHTML = scrapes + '<small>次</small>';
      el.querySelector('#ppPts').innerHTML = pts + '<small>点</small>';
      TARGETS.forEach(function (t, i) { beams.push({ i: i, t: 0 }); });
    }
    el.querySelector('#ppScrape').addEventListener('click', fire);
    return anim(el, cv, 300, function (c, W, H, dt) {
      timer += dt;
      if (timer >= interval) { timer = 0; fire(); }
      c.clearRect(0, 0, W, H);
      const cx = W * 0.5, cy = H * 0.46;
      // 中心 Prometheus
      const pulse = 1 + 0.04 * Math.sin(performance.now() / 320);
      c.fillStyle = hexA(A, 0.1);
      c.beginPath(); c.arc(cx, cy, 58 * pulse, 0, 6.283); c.fill();
      c.fillStyle = RG('panel-2',.95); rr(c, cx - 58, cy - 30, 116, 60, 12); c.fill();
      c.strokeStyle = A; c.lineWidth = 1.5; c.stroke();
      txt(c, 'Prometheus', cx, cy - 6, { sz: 12, col: TC('#fff'), al: 'center', w: '700' });
      txt(c, 'scrape → TSDB', cx, cy + 10, { sz: 9.5, col: A, al: 'center' });
      // 目标
      const positions = [
        { x: W * 0.16, y: H * 0.2 }, { x: W * 0.84, y: H * 0.2 },
        { x: W * 0.16, y: H * 0.78 }, { x: W * 0.84, y: H * 0.78 }
      ];
      TARGETS.forEach(function (t, i) {
        const p = positions[i];
        c.strokeStyle = hexA(A, 0.18); c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(cx, cy); c.stroke();
        c.fillStyle = RG('panel-2',.92); rr(c, p.x - 62, p.y - 24, 124, 48, 10); c.fill();
        c.strokeStyle = RG('grid',.3); c.lineWidth = 1.2; c.stroke();
        txt(c, t.n, p.x, p.y - 4, { sz: 10.5, col: TC('#dde8f5'), al: 'center', w: '700' });
        txt(c, t.s + '  ' + t.d.slice(0, 8), p.x, p.y + 11, { sz: 8.5, col: TC('#6b829c'), al: 'center' });
        // 进度环
        const q = (timer / interval);
        c.strokeStyle = hexA(A, 0.25); c.lineWidth = 2;
        c.beginPath(); c.arc(p.x - 74, p.y, 7, -1.57, 4.71); c.stroke();
        c.strokeStyle = A;
        c.beginPath(); c.arc(p.x - 74, p.y, 7, -1.57, -1.57 + 6.283 * q); c.stroke();
      });
      // 光束
      for (let i = beams.length - 1; i >= 0; i--) {
        const b = beams[i]; b.t += dt * 1.5;
        if (b.t >= 1) { beams.splice(i, 1); continue; }
        const p = positions[b.i];
        const x = p.x + (cx - p.x) * b.t, y = p.y + (cy - p.y) * b.t;
        const g = c.createRadialGradient(x, y, 0, x, y, 14);
        g.addColorStop(0, hexA(A, 0.95)); g.addColorStop(1, hexA(A, 0));
        c.fillStyle = g; c.beginPath(); c.arc(x, y, 14, 0, 6.283); c.fill();
        c.fillStyle = TC('#fff'); c.beginPath(); c.arc(x, y, 2.6, 0, 6.283); c.fill();
      }
      txt(c, '拉取模型（Pull）：Prometheus 主动定期去目标拉指标；对比 Zabbix 的 Agent 主动上报（Push）', W / 2, H - 8, { sz: 9.5, col: TC('#47596f'), al: 'center' });
    });
  };

  /* ═══════════════ 阶段 5 · 实时指标图表 ═══════════════ */
  V['metrics-chart'] = function (el, api) {
    const A = api.accent;
    el.innerHTML =
      '<div class="v-chart-stage"><canvas></canvas></div>' +
      '<div class="chart-legend">' +
        '<span><i style="background:' + A + '"></i>GPU 利用率 %</span>' +
        '<span><i style="background:#34d399"></i>CPU 使用率 %</span>' +
        '<span><i style="background:#a78bfa"></i>显存占用 %</span>' +
        '<span><i style="background:#fb7185;height:0;border-top:2px dashed #fb7185"></i>告警阈值 85%</span>' +
      '</div>' +
      '<div class="viz-ctrl">' +
        '<button class="vc-btn" id="mcInject"><svg class="ic"><use href="#i-bolt"/></svg>注入负载尖峰</button>' +
        '<span class="vc-label" style="margin-left:auto" id="mcNote">PromQL: rate(node_cpu_seconds_total{mode!="idle"}[5m])</span>' +
      '</div>' +
      '<div class="readouts" style="padding-top:0">' +
        '<dl class="readout hot"><dt>GPU 利用率</dt><dd id="mcG">0<small>%</small></dd></dl>' +
        '<dl class="readout good"><dt>CPU 使用率</dt><dd id="mcC">0<small>%</small></dd></dl>' +
        '<dl class="readout"><dt>显存占用</dt><dd id="mcM">0<small>%</small></dd></dl>' +
        '<dl class="readout" id="mcAl"><dt>告警状态</dt><dd id="mcAlV" style="font-size:15.5px">—</dd></dl>' +
      '</div>';
    const cv = el.querySelector('canvas');
    const N = 120;
    const series = [
      { col: A, data: [], v: 62, sp: 3, name: 'gpu' },
      { col: TC('#34d399'), data: [], v: 38, sp: 2, name: 'cpu' },
      { col: TC('#a78bfa'), data: [], v: 71, sp: 1.4, name: 'mem' }
    ];
    for (let i = 0; i < N; i++) series.forEach(function (s) { s.data.push(s.v); });
    let spike = 0, acc = 0;
    el.querySelector('#mcInject').addEventListener('click', function () { spike = 6; });
    return anim(el, cv, 250, function (c, W, H, dt, tm) {
      acc += dt;
      if (acc > 0.12) {
        acc = 0;
        spike = Math.max(0, spike - 0.12);
        series[0].v = clamp(series[0].v + (Math.random() - 0.48) * 7 + (spike > 0 ? 9 : 0), 8, 99);
        series[1].v = clamp(series[1].v + (Math.random() - 0.5) * 5 + (spike > 0 ? 4 : 0), 10, 96);
        series[2].v = clamp(series[2].v + (Math.random() - 0.5) * 3, 30, 98);
        series.forEach(function (s) { s.data.push(s.v); if (s.data.length > N) s.data.shift(); });
      }
      c.clearRect(0, 0, W, H);
      const padL = 40, padR = 12, padT = 14, padB = 22;
      const gw = W - padL - padR, gh = H - padT - padB;
      // 网格
      for (let i = 0; i <= 4; i++) {
        const y = padT + gh * i / 4;
        c.strokeStyle = RG('grid',.09); c.lineWidth = 1;
        c.beginPath(); c.moveTo(padL, y); c.lineTo(padL + gw, y); c.stroke();
        txt(c, (100 - i * 25) + '%', padL - 7, y + 3, { sz: 9, col: TC('#47596f'), al: 'right' });
      }
      // 阈值线
      const thY = padT + gh * (1 - 0.85);
      c.setLineDash([5, 4]); c.strokeStyle = 'rgba(251,113,133,.55)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(padL, thY); c.lineTo(padL + gw, thY); c.stroke(); c.setLineDash([]);
      // 曲线
      series.forEach(function (s) {
        c.beginPath();
        s.data.forEach(function (v, i) {
          const x = padL + gw * i / (N - 1), y = padT + gh * (1 - v / 100);
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        });
        c.strokeStyle = s.col; c.lineWidth = 1.8; c.lineJoin = 'round'; c.stroke();
        // 面积
        const last = s.data[s.data.length - 1];
        const lx = padL + gw, ly = padT + gh * (1 - last / 100);
        const g = c.createLinearGradient(0, padT, 0, padT + gh);
        g.addColorStop(0, hexA(s.col, 0.18)); g.addColorStop(1, hexA(s.col, 0));
        c.beginPath();
        s.data.forEach(function (v, i) { const x = padL + gw * i / (N - 1), y = padT + gh * (1 - v / 100); i ? c.lineTo(x, y) : c.moveTo(x, y); });
        c.lineTo(lx, padT + gh); c.lineTo(padL, padT + gh); c.closePath();
        c.fillStyle = g; c.fill();
        // 端点
        c.fillStyle = s.col; c.beginPath(); c.arc(lx, ly, 3.4, 0, 6.283); c.fill();
        c.fillStyle = hexA(s.col, 0.25); c.beginPath(); c.arc(lx, ly, 8 + 2 * Math.sin(tm * 3), 0, 6.283); c.fill();
      });
      const g = series[0].data[N - 1], cp = series[1].data[N - 1], m = series[2].data[N - 1];
      el.querySelector('#mcG').innerHTML = g.toFixed(0) + '<small>%</small>';
      el.querySelector('#mcC').innerHTML = cp.toFixed(0) + '<small>%</small>';
      el.querySelector('#mcM').innerHTML = m.toFixed(0) + '<small>%</small>';
      const firing = g > 85;
      el.querySelector('#mcAlV').textContent = firing ? 'FIRING' : '正常';
      el.querySelector('#mcAl').className = 'readout ' + (firing ? 'bad' : 'good');
      el.querySelector('#mcNote').textContent = firing
        ? 'GPU 利用率 > 85% 持续中 → 规则 for: 5m 后触发 NodeCPUHigh 类告警'
        : 'PromQL: rate(node_cpu_seconds_total{mode!="idle"}[5m])';
    });
  };

  /* ═══════════════ 阶段 5 · 告警流 ═══════════════ */
  V['alert-flow'] = function (el, api) {
    const A = api.accent;
    el.innerHTML =
      '<div class="v-alert"><div class="alert-flow">' +
        '<div class="af-col" id="afSrc"></div>' +
        '<div class="af-arrow"><svg class="ic"><use href="#i-arrow"/></svg></div>' +
        '<div class="af-col">' +
          '<div class="af-box" id="afAm"><b>Alertmanager</b>路由 / 分组 / 抑制 / 静默</div>' +
          '<div class="af-box" id="afRule"><b>Prometheus 规则</b>for: 5m 过滤抖动</div>' +
        '</div>' +
        '<div class="af-arrow"><svg class="ic"><use href="#i-arrow"/></svg></div>' +
        '<div class="af-col" id="afDst">' +
          '<div class="af-box"><b>oncall（P0）</b>电话 / 短信 / 企业微信</div>' +
          '<div class="af-box"><b>default（P1）</b>邮件</div>' +
          '<div class="af-box"><b>日报（P2）</b>汇总通知</div>' +
        '</div>' +
      '</div></div>' +
      '<div class="viz-ctrl">' +
        '<span class="vc-label">机制开关</span>' +
        '<button class="vc-btn" id="afG"><svg class="ic"><use href="#i-layers"/></svg>分组</button>' +
        '<button class="vc-btn" id="afI"><svg class="ic"><use href="#i-shield"/></svg>抑制</button>' +
        '<button class="vc-btn" id="afS"><svg class="ic"><use href="#i-clock"/></svg>静默</button>' +
        '<span class="vc-label" style="margin-left:auto" id="afNote">12 台机器同时磁盘告警，未分组 → 12 条告警轰炸</span>' +
      '</div>';
    el.querySelector('#afSrc').innerHTML =
      '<div class="af-box crit"><b>node03 磁盘 100%</b>critical</div>' +
      '<div class="af-box fire"><b>node01 CPU 91%</b>warning</div>' +
      '<div class="af-box crit"><b>node07 磁盘 96%</b>critical</div>' +
      '<div class="af-box crit"><b>node11 磁盘 98%</b>critical</div>';
    let grouped = false, inhibited = false, silenced = false;
    function sync() {
      const src = el.querySelector('#afSrc');
      src.querySelectorAll('.af-box').forEach(function (b, i) {
        const isDisk = b.textContent.indexOf('磁盘') >= 0;
        b.classList.toggle('grouped', grouped && isDisk);
        b.classList.toggle('mute', (silenced && isDisk) || (inhibited && i === 1));
        b.classList.toggle('crit', isDisk && !(silenced));
      });
      el.querySelector('#afAm').className = 'af-box' + (grouped || inhibited || silenced ? ' fire' : '');
      el.querySelector('#afNote').textContent = silenced ? '静默：计划内维护期间临时屏蔽该类告警，避免打扰'
        : inhibited ? '抑制：节点宕机时，抑制该节点上所有"服务不可用"告警 —— 根因已知，不必重复报警'
        : grouped ? '分组：12 条磁盘告警合并成 1 条，避免告警风暴'
        : '12 台机器同时磁盘告警，未分组 → 12 条告警轰炸';
    }
    el.querySelector('#afG').addEventListener('click', function () { grouped = !grouped; this.classList.toggle('on', grouped); sync(); });
    el.querySelector('#afI').addEventListener('click', function () { inhibited = !inhibited; this.classList.toggle('on', inhibited); sync(); });
    el.querySelector('#afS').addEventListener('click', function () { silenced = !silenced; this.classList.toggle('on', silenced); sync(); });
    sync();
    return null;
  };

  /* ═══════════════ 阶段 6 · 交付流水线 ═══════════════ */
  V['delivery-pipeline'] = function (el, api) {
    const A = api.accent;
    const P = [
      { n: '需求评估', d: '要跑什么模型？需要多少算力？预算多少？', c: '产出：算力规格与预算方案' },
      { n: '方案设计', d: 'GPU 选型、服务器配置、网络架构、存储方案', c: 'GPU 型号 / Spine-Leaf 拓扑 / 存储容量' },
      { n: '硬件采购', d: '下单、等货。高端卡周期长，必须提前规划。', c: '关注交期与到货批次' },
      { n: '到货验收', d: '开箱验机、核对清单、记录序列号 SN', c: 'sn.txt 资产台账' },
      { n: '上架部署', d: '装导轨、推入机柜、接线、理线、加电自检', c: '双电源分接 A/B 两路 PDU' },
      { n: '系统安装', d: 'BMC 配置、RAID、装 OS、驱动、网络', c: 'iDRAC/iBMC → RAID → OS' },
      { n: '集群基础', d: 'SSH 免密、主机名、hosts、NTP 时间同步', c: 'chrony · timedatectl set-timezone Asia/Shanghai' },
      { n: 'GPU 环境', d: '驱动、CUDA、NVIDIA Container Toolkit', c: 'nvidia-smi / nvcc -V 验证' },
      { n: '平台部署', d: 'containerd → kubeadm → CNI → Device Plugin / GPU Operator', c: 'kubectl describe node | grep nvidia.com/gpu' },
      { n: '监控日志', d: 'Prometheus + Grafana + DCGM Exporter + ELK', c: 'DCGM_FI_DEV_XID_ERRORS 告警' },
      { n: '测试验收', d: 'GPU 健康、拓扑、P2P、NCCL、稳定性', c: 'all_reduce_perf -b 8 -e 8G -f 2 -g 8' },
      { n: '交付文档', d: '部署手册、验收报告、运维手册、培训', c: '作品集 / 简历素材' }
    ];
    el.innerHTML =
      '<div class="v-pipe"><div class="pipe-rail" id="pipeRail"></div>' +
      '<div class="pipe-detail" id="pipeDetail"></div></div>' +
      '<div class="viz-ctrl">' +
        '<button class="vc-btn" id="pipePlay"><svg class="ic"><use href="#i-play"/></svg>自动走一遍</button>' +
        '<span class="vc-label" style="margin-left:auto">能完整讲出这条链路，你就超过了 80% 的应届生</span>' +
      '</div>';
    const rail = el.querySelector('#pipeRail');
    rail.innerHTML = P.map(function (p, i) {
      return '<div class="pipe-node" data-i="' + i + '"><div class="pn">' + (i + 1) + '</div><b>' + p.n + '</b></div>';
    }).join('');
    let cur = 0, timer = null;
    function sync() {
      rail.querySelectorAll('.pipe-node').forEach(function (n, i) { n.classList.toggle('on', i === cur); n.classList.toggle('done', i < cur); });
      const p = P[cur];
      el.querySelector('#pipeDetail').innerHTML = '<h5>' + String(cur + 1).padStart(2, '0') + ' · ' + p.n + '</h5><p>' + p.d + '</p><div class="cmd"><code>' + p.c + '</code></div>';
      const node = rail.querySelectorAll('.pipe-node')[cur];
      if (node && node.scrollIntoView) node.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
    rail.addEventListener('click', function (e) {
      const n = e.target.closest('.pipe-node'); if (!n) return;
      cur = +n.dataset.i; if (timer) { clearInterval(timer); timer = null; el.querySelector('#pipePlay').innerHTML = '<svg class="ic"><use href="#i-play"/></svg>自动走一遍'; }
      sync();
    });
    el.querySelector('#pipePlay').addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = null; this.innerHTML = '<svg class="ic"><use href="#i-play"/></svg>自动走一遍'; return; }
      cur = -1; this.innerHTML = '<svg class="ic"><use href="#i-close"/></svg>暂停';
      const self = this;
      timer = setInterval(function () {
        if (cur >= P.length - 1) { clearInterval(timer); timer = null; self.innerHTML = '<svg class="ic"><use href="#i-play"/></svg>自动走一遍'; return; }
        cur++; sync();
      }, 1200);
    });
    sync();
    return function () { if (timer) clearInterval(timer); };
  };

  /* ═══════════════ 阶段 6 · Ring AllReduce ═══════════════ */
  V['ring-allreduce'] = function (el, api) {
    const A = api.accent;
    el.innerHTML =
      '<div class="v-ring"><canvas></canvas>' +
      '<div class="v-ring-side">' +
        '<p><b style="color:#fff">Ring AllReduce</b> 把每个 GPU 的梯度切成 N 份，沿环分两个阶段传递，总通信量最优。</p>' +
        '<p><b style="color:' + A + '">阶段一 Scatter-Reduce</b><br>N−1 步，每步把一块分片归约后传给邻居。</p>' +
        '<p><b style="color:#a78bfa">阶段二 All-Gather</b><br>N−1 步，把归约完成的分片沿环广播回去。</p>' +
        '<dl class="readout hot" style="margin:0"><dt>当前阶段</dt><dd id="raPhase" style="font-size:15.5px">—</dd></dl>' +
        '<dl class="readout good" style="margin:0"><dt>busbw（总线带宽）</dt><dd id="raBw">—</dd></dl>' +
        '<p style="font-size:12px;color:var(--txt-4);margin:0">与理论带宽对比：H100 NVLink 双向约 900 GB/s，8 卡 AllReduce 的 busbw 应达到相当量级。远低于预期说明互联有问题。</p>' +
      '</div></div>' +
      '<div class="viz-ctrl">' +
        '<span class="vc-label">GPU 数量</span>' +
        '<div class="vc-seg" id="raSeg"><button data-n="4">4</button><button data-n="8" class="on">8</button></div>' +
        '<button class="vc-btn" id="raPlay"><svg class="ic"><use href="#i-play"/></svg>暂停</button>' +
        '<span class="vc-label" style="margin-left:auto" id="raNote">algbw 按数据量算，busbw 考虑算法后的实际总线利用率</span>' +
      '</div>';
    const cv = el.querySelector('canvas');
    let N = 8, t = 0, playing = true;
    el.querySelector('#raSeg').addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      N = +b.dataset.n; t = 0; this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
    });
    el.querySelector('#raPlay').addEventListener('click', function () {
      playing = !playing;
      this.innerHTML = playing ? '<svg class="ic"><use href="#i-play"/></svg>暂停' : '<svg class="ic"><use href="#i-play"/></svg>继续';
    });
    return anim(el, cv, 380, function (c, W, H, dt) {
      if (playing) t += dt * 0.42;
      c.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.33;
      const nodes = [];
      for (let i = 0; i < N; i++) {
        const ang = -Math.PI / 2 + i / N * 6.283;
        nodes.push({ x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R, ang: ang });
      }
      const steps = (N - 1) * 2;
      const phase = Math.min(steps - 1e-4, t % (steps + 1.2));
      const isGather = phase >= N - 1;
      const stepIdx = Math.floor(phase);
      const q = phase - stepIdx;
      // 环
      c.strokeStyle = 'rgba(125,175,225,.16)'; c.lineWidth = 2;
      c.beginPath(); c.arc(cx, cy, R, 0, 6.283); c.stroke();
      // 中心信息
      txt(c, isGather ? 'ALL-GATHER' : 'SCATTER-REDUCE', cx, cy - 6, { sz: 12.5, col: isGather ? '#a78bfa': A, al: 'center', w: '700' });
      txt(c, 'step ' + (stepIdx + 1) + ' / ' + (N - 1), cx, cy + 11, { sz: 10, col: TC('#6b829c'), al: 'center' });
      txt(c, (isGather ? '分片沿环广播' : '分片归约后传给邻居'), cx, cy + 27, { sz: 9.5, col: TC('#47596f'), al: 'center' });
      // 数据块移动
      const chunkOf = function (nodeIdx, step) { return (nodeIdx - step + N * 4) % N; };
      for (let i = 0; i < N; i++) {
        const from = nodes[i], to = nodes[(i + 1) % N];
        const ck = chunkOf(i, stepIdx);
        const x = from.x + (to.x - from.x) * q, y = from.y + (to.y - from.y) * q;
        const hue = isGather ? '#a78bfa': A;
        const g = c.createRadialGradient(x, y, 0, x, y, 15);
        g.addColorStop(0, hexA(hue, 0.85)); g.addColorStop(1, hexA(hue, 0));
        c.fillStyle = g; c.beginPath(); c.arc(x, y, 15, 0, 6.283); c.fill();
        c.fillStyle = hue;
        rr(c, x - 8, y - 8, 16, 16, 4); c.fill();
        txt(c, 'c' + ck, x, y + 3.5, { sz: 8.5, col: TC('#04141a'), al: 'center', w: '700' });
      }
      // GPU 节点
      for (let i = 0; i < N; i++) {
        const n = nodes[i];
        c.fillStyle = RG('panel-2',.95);
        rr(c, n.x - 27, n.y - 19, 54, 38, 9); c.fill();
        c.strokeStyle = hexA(A, 0.4); c.lineWidth = 1.3; c.stroke();
        txt(c, 'GPU' + i, n.x, n.y - 2, { sz: 10.5, col: TC('#fff'), al: 'center', w: '700' });
        // 分片条
        const done = isGather ? N : Math.min(N, stepIdx + 1);
        for (let k = 0; k < N; k++) {
          const bx = n.x - 21 + k * 5.6;
          c.fillStyle = k < done ? (isGather ? '#a78bfa': A) : 'rgba(125,175,225,.16)';
          c.fillRect(bx, n.y + 7, 4, 5);
        }
      }
      const busbw = (isGather ? 268 : 196) + Math.sin(t * 3) * 12;
      el.querySelector('#raPhase').textContent = isGather ? 'All-Gather' : 'Scatter-Reduce';
      el.querySelector('#raBw').innerHTML = busbw.toFixed(0) + '<small>GB/s</small>';
    });
  };

  /* ═══════════════ 阶段 0/6 · 3D 机柜 ═══════════════ */
  V['rack-3d'] = function (el, api) {
    el.innerHTML =
      '<div class="v-3d" id="rackWrap">' +
        '<div class="rack3d" id="rack3d">' +
          '<div class="rack-face rack-front" id="rackFront"></div>' +
          '<div class="rack-face rack-back"></div>' +
          '<div class="rack-face rack-left"></div>' +
          '<div class="rack-face rack-right"></div>' +
          '<div class="rack-face rack-top"></div>' +
          '<div class="rack-face rack-bottom"></div>' +
        '</div>' +
      '</div>' +
      '<div class="viz-ctrl">' +
        '<span class="vc-label">拖动旋转 · 滚轮缩放</span>' +
        '<button class="vc-btn" id="rackAuto">自动旋转</button>' +
        '<span class="vc-label" style="margin-left:auto">标准机柜 42U · 宽 19 英寸 · 1U = 44.45 mm</span>' +
      '</div>' +
      '<div class="rack-hint">GPU 服务器常见 4U / 8U 机型 —— 因为要塞下多张高功耗显卡，散热与供电都是硬约束</div>';
    const units = 12;
    const front = el.querySelector('#rackFront');
    let html = '';
    for (let i = 0; i < units; i++) {
      const gpu = i % 3 === 0;
      html += '<div class="ru ' + (gpu ? 'gpu' : '') + '"><span>' + (gpu ? 'GPU 4U' : '1U') + '</span><span class="leds"><i></i><i></i><i></i></span></div>';
    }
    front.innerHTML = html;

    const rack = el.querySelector('#rack3d');
    const wrap = el.querySelector('#rackWrap');
    let rx = -14, ry = -26, dragging = false, lx = 0, ly = 0, auto = true, raf = null;
    function apply() { rack.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)'; }
    apply();
    function loop() {
      if (auto && !dragging) { ry += 0.22; apply(); }
      raf = requestAnimationFrame(loop);
    }
    if (!REDUCED) loop();
    wrap.addEventListener('pointerdown', function (e) { dragging = true; lx = e.clientX; ly = e.clientY; wrap.setPointerCapture(e.pointerId); });
    wrap.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      ry += (e.clientX - lx) * 0.4; rx = Math.max(-70, Math.min(70, rx - (e.clientY - ly) * 0.3));
      lx = e.clientX; ly = e.clientY; apply();
    });
    wrap.addEventListener('pointerup', function () { dragging = false; });
    wrap.addEventListener('wheel', function (e) {
      e.preventDefault();
      const s = parseFloat(rack.dataset.s || '1') * (e.deltaY > 0 ? 0.94 : 1.06);
      const cs = Math.max(0.6, Math.min(1.7, s));
      rack.dataset.s = cs;
      rack.style.width = (210 * cs) + 'px'; rack.style.height = (340 * cs) + 'px';
    }, { passive: false });
    el.querySelector('#rackAuto').addEventListener('click', function () {
      auto = !auto; this.classList.toggle('on', auto);
      if (auto && !raf && !REDUCED) loop();
      if (!auto && raf) { cancelAnimationFrame(raf); raf = null; }
    });
    return function () { if (raf) cancelAnimationFrame(raf); };
  };

  /* ═══════════════ 阶段 6 · 5 Why 复盘树 ═══════════════ */
  V['five-why'] = function (el, api) {
    const A = api.accent;
    const CHAIN = [
      { q: '现象', a: '训练任务中断', k: 'root' },
      { q: 'Why 1', a: '为什么中断？→ 因为一个 Pod 被驱逐了' },
      { q: 'Why 2', a: '为什么被驱逐？→ 因为节点内存不足' },
      { q: 'Why 3', a: '为什么内存不足？→ 因为一个进程内存泄漏' },
      { q: 'Why 4', a: '为什么泄漏没被发现？→ 因为监控没配内存增长告警' },
      { q: 'Why 5', a: '为什么没配？→ 因为监控规则不完整', k: 'root' }
    ];
    el.innerHTML =
      '<div class="v-pod-stage"><div class="flow" id="whyFlow"></div></div>' +
      '<div class="viz-ctrl">' +
        '<button class="vc-btn" id="whyPlay"><svg class="ic"><use href="#i-play"/></svg>逐层追问</button>' +
        '<span class="vc-label" style="margin-left:auto" id="whyNote">停在表面现象 → 只是"重启一下"；追到根因 → 才有改进措施</span>' +
      '</div>' +
      '<div class="readouts" style="padding-top:0">' +
        '<dl class="readout hot"><dt>根因</dt><dd style="font-size:14.5px">监控规则缺失 + 应用内存泄漏</dd></dl>' +
        '<dl class="readout good"><dt>改进①</dt><dd style="font-size:14.5px">补充内存增长告警</dd></dl>' +
        '<dl class="readout good"><dt>改进②</dt><dd style="font-size:14.5px">反馈开发修复泄漏</dd></dl>' +
      '</div>';
    const flow = el.querySelector('#whyFlow');
    flow.innerHTML = CHAIN.map(function (c, i) {
      return '<div class="flow-item" data-i="' + i + '" style="opacity:.22;transition:opacity .5s">' +
        '<div class="flow-n">' + (i === 0 ? '!' : i) + '</div>' +
        '<div class="flow-c"><b>' + c.q + '</b><p>' + c.a + '</p></div></div>';
    }).join('');
    let cur = -1, timer = null;
    function sync() {
      flow.querySelectorAll('.flow-item').forEach(function (n, i) { n.style.opacity = i <= cur ? '1' : '.22'; });
      if (cur >= 0) el.querySelector('#whyNote').textContent = CHAIN[cur].a;
    }
    el.querySelector('#whyPlay').addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = null; this.innerHTML = '<svg class="ic"><use href="#i-play"/></svg>逐层追问'; return; }
      cur = -1; this.innerHTML = '<svg class="ic"><use href="#i-close"/></svg>暂停';
      const self = this;
      timer = setInterval(function () {
        if (cur >= CHAIN.length - 1) { clearInterval(timer); timer = null; self.innerHTML = '<svg class="ic"><use href="#i-play"/></svg>逐层追问'; return; }
        cur++; sync();
      }, 1000);
      cur++; sync();
    });
    sync();
    return function () { if (timer) clearInterval(timer); };
  };

  /* ═══════════════ 阶段 6 · 验收清单雷达 ═══════════════ */
  V['accept-radar'] = function (el, api) {
    const A = api.accent;
    const ITEMS = [
      { k: 'GPU 健康', c: 'nvidia-smi -q / Xid', w: 1 },
      { k: '拓扑', c: 'nvidia-smi topo -m', w: 1 },
      { k: 'P2P 带宽', c: 'nvbandwidth', w: 1 },
      { k: 'NCCL', c: 'all_reduce_perf', w: 1.15 },
      { k: '网络带宽', c: 'ib_write_bw / iperf3', w: 1 },
      { k: '磁盘 SMART', c: 'smartctl -H', w: 0.9 },
      { k: '内存 ECC', c: 'dmesg | grep edac', w: 0.9 },
      { k: '稳定性', c: 'gpu-burn 30min', w: 1.1 },
      { k: '监控接入', c: 'DCGM Exporter', w: 0.9 },
      { k: '文档齐全', c: '部署 + 验收报告', w: 0.85 }
    ];
    el.innerHTML = '<div class="v-chart-stage"><canvas></canvas></div>' +
      '<div class="viz-ctrl"><span class="vc-label">验收哲学</span>' +
      '<span style="font-size:13px;color:var(--txt-2)"><b style="color:' + A + '">nvidia-smi 能看到卡 ≠ 验收通过</b>。只能确认"设备可见"，还必须做集合通信与短任务测试，并与理论带宽对比建立基线。</span></div>';
    const cv = el.querySelector('canvas');
    let vals = ITEMS.map(function () { return 0.15; });
    let t = 0;
    return anim(el, cv, 330, function (c, W, H, dt) {
      t += dt;
      for (let i = 0; i < ITEMS.length; i++) {
        const target = clamp(0.62 + 0.38 * (0.5 + 0.5 * Math.sin(t * 1.1 + i * 0.9)), 0, 1) * ITEMS[i].w;
        vals[i] += (target - vals[i]) * Math.min(1, dt * 1.6);
      }
      c.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2 + 6, R = Math.min(W * 0.32, H * 0.4);
      const n = ITEMS.length;
      // 网格
      for (let ring = 1; ring <= 4; ring++) {
        c.strokeStyle = 'rgba(125,175,225,.1)'; c.lineWidth = 1;
        c.beginPath();
        for (let i = 0; i <= n; i++) {
          const ang = -Math.PI / 2 + i / n * 6.283, r = R * ring / 4;
          const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + i / n * 6.283;
        c.strokeStyle = 'rgba(125,175,225,.1)';
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R); c.stroke();
      }
      // 数据
      c.beginPath();
      for (let i = 0; i <= n; i++) {
        const k = i % n;
        const ang = -Math.PI / 2 + k / n * 6.283;
        const r = R * clamp(vals[k], 0, 1);
        const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
      c.fillStyle = hexA(A, 0.16); c.fill();
      c.strokeStyle = A; c.lineWidth = 1.8; c.stroke();
      // 标签
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + i / n * 6.283;
        const x = cx + Math.cos(ang) * (R + 22), y = cy + Math.sin(ang) * (R + 20);
        const al = Math.abs(Math.cos(ang)) < 0.25 ? 'center' : (Math.cos(ang) > 0 ? 'left' : 'right');
        txt(c, ITEMS[i].k, x, y, { sz: 9.5, col: TC('#9db1c9'), al: al });
        txt(c, ITEMS[i].c, x, y + 11, { sz: 8, col: TC('#47596f'), al: al });
      }
      // 顶点
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + i / n * 6.283;
        const r = R * clamp(vals[i], 0, 1);
        c.fillStyle = A; c.beginPath(); c.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 2.6, 0, 6.283); c.fill();
      }
      txt(c, '验收维度覆盖率（示意）', cx, H - 8, { sz: 9.5, col: TC('#47596f'), al: 'center' });
    });
  };
})();
