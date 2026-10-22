/* ══════════════════════════════════════════════════════════
   可复用组件渲染器
   ══════════════════════════════════════════════════════════ */
window.AIOPS_UI = (function () {
  'use strict';

  /* ───────── 基础工具 ───────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function icon(n, cls) { return '<svg class="ic ' + (cls || '') + '"><use href="#i-' + n + '"/></svg>'; }
  function md(s) {
    // 极简行内标记：`code`、**bold**、[[color]]
    return esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[\[([^\]]+)\]\]/g, '<b style="color:var(--st)">$1</b>')
      .replace(/\n/g, '<br>');
  }

  /* ───────── 代码高亮 ───────── */
  const CMDS = ('sudo apt apt-get dnf yum rpm dpkg systemctl systemd journalctl dmesg ipmitool smartctl storcli perccli megacli dmidecode lscpu lspci lsblk fdisk parted blkid mount umount mkfs mkfs.ext4 mkfs.xfs pvcreate vgcreate lvcreate lvextend resize2fs xfs_growfs pvs vgs lvs ' +
    'docker docker-compose kubectl kubeadm kubelet crictl helm ctr containerd runc ' +
    'ansible ansible-playbook ansible-vault ansible-galaxy ' +
    'ssh ssh-keygen ssh-copy-id scp rsync git vim vi nano tar gzip gunzip zip unzip ' +
    'ls cd pwd mkdir rmdir rm cp mv touch stat file find locate which whereis grep egrep sed awk sort uniq cut tr wc head tail less more tee diff ' +
    'chmod chown chgrp umask useradd usermod userdel groupadd passwd id whoami who groups su ' +
    'ps top htop kill killall pkill pgrep pidof nohup jobs fg bg free df du uptime hostname date history crontab ' +
    'ip ifconfig ss netstat ping traceroute mtr tcpdump curl wget dig nslookup nc telnet ethtool iperf3 nmcli netplan iftop nload sar vnstat ' +
    'nvidia-smi nvcc nvbandwidth nvidia-bug-report.sh dcgmi gpustat nvitop ' +
    'ibstat ibv_devinfo ibstatus perfquery ib_write_bw ib_send_lat ' +
    'python python3 pip pip3 make gcc configure cargo node npm helm promtool openssl ' +
    'export source echo printf cat sleep cd set unset readonly local return if then elif else fi for while until do done case esac function ' +
    'mpirun all_reduce_perf nvbandwidth gpu-burn memtester fio iostat vmstat mpstat lsof strace netperf ' +
    'timedatectl chronyc swapoff modprobe sysctl systemd-analyze tee xargs seq basename dirname realpath').split(/\s+/);

  function hl(src, lang) {
    lang = lang || 'bash';
    const lines = String(src).split('\n');
    const out = lines.map(function (line) {
      let code = line, comment = '';
      const hash = findComment(line);
      if (hash >= 0) { code = line.slice(0, hash); comment = line.slice(hash); }
      let h = esc(code);
      if (lang === 'yaml') {
        h = h.replace(/^(\s*)([\w.\-\/]+)(:)/, '$1<span class="tk-kw">$2</span>$3');
        h = h.replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g, '<span class="tk-st">$1</span>');
        h = h.replace(/\b(true|false|yes|no|none|null)\b/g, '<span class="tk-nu">$1</span>');
      } else if (lang === 'dockerfile') {
        h = h.replace(/^(\s*)([A-Z]+)(\s)/, '$1<span class="tk-hd">$2</span>$3');
        h = h.replace(/(&quot;[^&]*?&quot;)/g, '<span class="tk-st">$1</span>');
      } else if (lang === 'promql') {
        h = h.replace(/\b([a-zA-Z_][\w]*_total|node_[\w]+|DCGM_[\w]+|http_[\w]+)\b/g, '<span class="tk-fl">$1</span>');
        h = h.replace(/\b(rate|irate|increase|sum|avg|max|min|count|topk|histogram_quantile|delta|by|without|and|or|unless)\b/g, '<span class="tk-kw">$1</span>');
        h = h.replace(/(&quot;[^&]*?&quot;)/g, '<span class="tk-st">$1</span>');
      } else if (lang === 'ini' || lang === 'conf') {
        h = h.replace(/^(\s*)([A-Za-z_][\w]*)(\s*=)/, '$1<span class="tk-kw">$2</span>$3');
        h = h.replace(/^(\s*)\[([^\]]+)\]/, '$1<span class="tk-hd">[$2]</span>');
      } else if (lang === 'json') {
        h = h.replace(/(&quot;[^&]*?&quot;)(\s*:)/g, '<span class="tk-kw">$1</span>$2');
        h = h.replace(/\b(true|false|null)\b/g, '<span class="tk-nu">$1</span>');
      } else {
        // bash / shell / text
        h = h.replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g, '<span class="tk-st">$1</span>');
        h = h.replace(/(\$\([^)]*\)|\$\{[^}]*\}|\$[A-Za-z_][\w]*|\$\?|\$#|\$\d)/g, '<span class="tk-fl">$1</span>');
        h = h.replace(/(^|\s)(--?[A-Za-z][\w-]*)/g, '$1<span class="tk-fl">$2</span>');
        h = h.replace(/(\|\||\|&|\||&&|>>|>|<)/g, '<span class="tk-op">$1</span>');
        h = h.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tk-nu">$1</span>');
        const re = new RegExp('\\b(' + CMDS.join('|').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b', 'g');
        h = h.replace(re, function (m, p1, off, whole) {
          // 避免破坏已有标签
          const before = whole.slice(Math.max(0, off - 12), off);
          if (/<span class="tk-(st|fl|nu|op|kw|hd)"?$/.test(before) || /class="tk-/.test(before) && before.lastIndexOf('<') > before.lastIndexOf('>')) return m;
          return '<span class="tk-hd">' + m + '</span>';
        });
        h = h.replace(/^(\s*)#!(\/\w+\/\w+)/, '$1<span class="tk-cm">#!$2</span>');
      }
      if (comment) h += '<span class="tk-cm">' + esc(comment) + '</span>';
      return h;
    });
    return out.join('\n');
  }
  function findComment(line) {
    let inS = false, inD = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === "'" && !inD) inS = !inS;
      else if (ch === '"' && !inS) inD = !inD;
      else if (ch === '#' && !inS && !inD) {
        if (i === 0 || /\s/.test(line[i - 1])) return i;
      }
    }
    return -1;
  }

  /* ───────── 章节渲染 ───────── */
  function renderSection(sec) {
    const k = sec.kind || 'prose';
    switch (k) {
      case 'prose':
        return '<div class="panel">' + (sec.title ? head(sec) : '') + '<div>' + md(sec.html || '') + '</div></div>';

      case 'cards':
        return '<div class="panel">' + head(sec) + '<div class="cards">' + (sec.items || []).map(function (it) {
          return '<div class="mini"><div class="mini-ic">' + icon(it.icon || 'cube') + '</div><b>' + md(it.t) + '</b><p>' + md(it.d) + '</p></div>';
        }).join('') + '</div></div>';

      case 'table':
        return '<div class="panel">' + head(sec) + '<div class="tbl-wrap"><table><thead><tr>' +
          (sec.head || []).map(function (h) { return '<th>' + md(h) + '</th>'; }).join('') +
          '</tr></thead><tbody>' + (sec.rows || []).map(function (r) {
            return '<tr>' + r.map(function (c) { return '<td>' + md(c) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>' +
          (sec.note ? '<p class="tbl-note">' + md(sec.note) + '</p>' : '') + '</div>';

      case 'code':
        return '<div class="panel">' + head(sec) +
          '<div class="code"><div class="code-bar"><span class="dots"><i></i><i></i><i></i></span>' +
          '<span class="fname">' + esc(sec.file || 'terminal') + '</span>' +
          '<button class="cp" data-copy="' + esc(sec.code).replace(/"/g, '&quot;') + '">' + icon('copy', 'ic-sm') + '复制</button></div>' +
          '<pre><code>' + hl(sec.code, sec.lang) + '</code></pre></div>' +
          (sec.note ? '<p class="code-note">' + md(sec.note) + '</p>' : '') + '</div>';

      case 'callout':
        return '<div class="callout tone-' + (sec.tone || 'key') + '">' +
          '<div class="co-ic">' + icon(sec.icon || (sec.tone === 'warn' ? 'alert' : sec.tone === 'danger' ? 'alert' : 'target')) + '</div>' +
          '<div>' + (sec.title ? '<h4>' + md(sec.title) + '</h4>' : '') + '<p>' + md(sec.html || '') + '</p></div></div>';

      case 'terms':
        return '<div class="panel">' + head(sec) + '<div class="terms">' + (sec.items || []).map(function (t) {
          return '<div class="term"><div class="term-t"><b>' + esc(t.t) + '</b>' + (t.full ? '<span>' + esc(t.full) + '</span>' : '') + '</div><p>' + md(t.d) + '</p></div>';
        }).join('') + '</div></div>';

      case 'flow':
        return '<div class="panel">' + head(sec) + '<div class="flow">' + (sec.steps || []).map(function (s, i) {
          return '<div class="flow-item"><div class="flow-n">' + (s.n || i + 1) + '</div><div class="flow-c"><b>' + md(s.t) + '</b><p>' + md(s.d) + '</p></div></div>';
        }).join('') + '</div></div>';

      case 'hflow':
        return '<div class="panel">' + head(sec) + '<div class="hflow">' + (sec.steps || []).map(function (s, i) {
          return '<div class="hflow-item"><div class="n">' + String(i + 1).padStart(2, '0') + '</div><b>' + md(s.t) + '</b><p>' + md(s.d) + '</p></div>';
        }).join('') + '</div></div>';

      case 'compare':
        return '<div class="panel">' + head(sec) + '<div class="vs">' +
          '<div class="vs-col a"><h4>' + icon('chip') + md(sec.left.title) + '</h4><ul>' + (sec.left.items || []).map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul></div>' +
          '<div class="vs-mid">VS</div>' +
          '<div class="vs-col b"><h4>' + icon('chip') + md(sec.right.title) + '</h4><ul>' + (sec.right.items || []).map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul></div>' +
          '</div></div>';

      case 'kv':
        return '<div class="panel">' + head(sec) + '<dl class="kvgrid">' + (sec.items || []).map(function (x) {
          return '<div class="kv"><dt>' + esc(x.k) + '</dt><dd>' + md(x.v) + '</dd></div>';
        }).join('') + '</dl></div>';

      case 'viz':
        return '<figure class="viz" data-viz="' + esc(sec.viz) + '">' +
          '<div class="viz-h">' + icon(sec.icon || 'activity') + '<h3>' + md(sec.title) + '</h3>' +
          (sec.hint ? '<span class="viz-hint">' + icon('target', 'ic-sm') + esc(sec.hint) + '</span>' : '') + '</div>' +
          '<div class="viz-stage"></div>' +
          (sec.caption ? '<figcaption>' + md(sec.caption) + '</figcaption>' : '') + '</figure>';

      default:
        return '';
    }
  }
  function head(sec) {
    return '<div class="panel-h">' + icon(sec.icon || 'cube') + '<h3>' + md(sec.title) + '</h3>' +
      (sec.tag ? '<span class="tag">' + esc(sec.tag) + '</span>' : '') + '</div>';
  }

  /* ───────── 清单 ───────── */
  function checkKey(sid) { return 'aiops:check:' + sid; }
  function getChecks(sid) {
    try { return JSON.parse(localStorage.getItem(checkKey(sid)) || '{}'); } catch (e) { return {}; }
  }
  function setCheck(sid, id, v) {
    const o = getChecks(sid); o[id] = v;
    try { localStorage.setItem(checkKey(sid), JSON.stringify(o)); } catch (e) { }
  }
  function renderChecklist(stage) {
    const groups = stage.checklist || [];
    let total = 0;
    const saved = getChecks(stage.id);
    groups.forEach(function (g) { total += g.items.length; });
    let done = 0;
    groups.forEach(function (g) { g.items.forEach(function (it, i) { if (saved[g.t + '#' + i]) done++; }); });
    let html = '<div class="check-wrap">';
    html += '<div class="check-progress"><span id="ckPct">' + done + ' / ' + total + '</span><div class="bar"><i id="ckBar" style="width:' + (total ? done / total * 100 : 0) + '%"></i></div></div>';
    groups.forEach(function (g) {
      html += '<div class="check-group"><h4>' + esc(g.t) + '</h4><div class="check-list">';
      g.items.forEach(function (it, i) {
        const id = g.t + '#' + i;
        const on = !!saved[id];
        html += '<label class="check ' + (on ? 'done' : '') + '" data-k="' + esc(id) + '">' +
          '<span class="box">' + icon('check') + '</span>' +
          '<input type="checkbox" ' + (on ? 'checked' : '') + '>' +
          '<span class="txt">' + md(it) + '</span></label>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  }
  function bindChecklist(root, stage) {
    const boxes = root.querySelectorAll('.check');
    if (!boxes.length) return;
    boxes.forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        const k = b.dataset.k;
        const on = !b.classList.contains('done');
        b.classList.toggle('done', on);
        b.querySelector('input').checked = on;
        setCheck(stage.id, k, on);
        const all = root.querySelectorAll('.check');
        let d = 0; all.forEach(function (x) { if (x.classList.contains('done')) d++; });
        const bar = root.querySelector('#ckBar'), pct = root.querySelector('#ckPct');
        if (bar) bar.style.width = (d / all.length * 100) + '%';
        if (pct) pct.textContent = d + ' / ' + all.length;
        if (window.AIOPS_APP) window.AIOPS_APP.refreshProgress();
      });
    });
  }

  /* ───────── 自测题 ───────── */
  function renderQuiz(stage) {
    const q = stage.quiz || [];
    if (!q.length) return '';
    return '<div class="quiz">' + q.map(function (x, i) {
      const item = typeof x === 'string' ? { q: x, a: '（对照笔记自测，能口头答出来才算过关）' } : x;
      return '<div class="qitem" data-i="' + i + '"><div class="qhead">' +
        '<span class="qn">Q' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="qq">' + md(item.q) + '</span>' +
        '<span class="qcaret">' + icon('arrow', 'ic-sm') + '</span></div>' +
        '<div class="qans"><div class="qans-in">' + md(item.a) + '</div></div></div>';
    }).join('') + '</div>';
  }
  function bindQuiz(root) {
    root.querySelectorAll('.qitem').forEach(function (it) {
      it.querySelector('.qhead').addEventListener('click', function () { it.classList.toggle('open'); });
    });
  }

  /* ───────── 术语表 ───────── */
  function renderGloss(stage) {
    const g = stage.glossary || [];
    if (!g.length) return '';
    return '<div class="gloss">' + g.map(function (x) {
      return '<div class="gl"><b>' + esc(x.t) + '</b><span>' + md(x.d) + '</span></div>';
    }).join('') + '</div>';
  }

  /* ───────── 阶段页 ───────── */
  function renderStage(stage, prev, next) {
    let html = '';
    html += '<section class="stage-hero"><div class="wrap">';
    html += '<div class="sh-crumb"><a href="#/">控制台</a> ' + icon('arrow', 'ic-sm') + ' <span>阶段 ' + stage.num + '</span></div>';
    html += '<div class="sh-grid">';
    html += '<div class="sh-badge">' + icon(stage.icon) + '<b>' + stage.num + '</b></div>';
    html += '<div><h1>' + esc(stage.title) + '</h1>';
    html += '<p class="sh-quote">' + md(stage.quote) + '</p>';
    html += '<div class="sh-meta">' +
      '<span class="chip acc">' + icon('clock') + esc(stage.weeks) + '</span>' +
      '<span class="chip">' + icon('book') + (stage.sections || []).length + ' 个章节</span>' +
      '<span class="chip">' + icon('activity') + countViz(stage) + ' 个交互可视化</span>' +
      '<span class="chip">' + icon('check') + countChecks(stage) + ' 项动手任务</span></div>';
    if (stage.deliverables && stage.deliverables.length) {
      html += '<div class="deliver">' + stage.deliverables.map(function (d, i) {
        return '<div class="deliver-item"><i>' + String(i + 1).padStart(2, '0') + '</i><span>' + md(d) + '</span></div>';
      }).join('') + '</div>';
    }
    html += '</div></div></div></section>';

    html += '<div class="chapters"><div class="wrap">';
    html += '<div class="toc">' + (stage.sections || []).map(function (s, i) {
      return '<a href="#/stage/' + stage.num + '/' + (s.id || ('sec' + i)) + '">' + esc(s.title) + '</a>';
    }).join('') + '</div>';

    (stage.sections || []).forEach(function (s, i) {
      const sid = s.id || ('sec' + i);
      html += '<section class="chapter" id="' + sid + '">';
      if (s.chapter) {
        html += '<div class="ch-head"><span class="ch-idx">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<div><h2>' + md(s.chapter) + '</h2>' + (s.chSub ? '<p class="ch-sub">' + md(s.chSub) + '</p>' : '') + '</div></div>';
      }
      html += '<div class="ch-body">' + renderSection(s) + '</div></section>';
    });

    // 清单
    if ((stage.checklist || []).length) {
      html += '<section class="chapter" id="checklist"><div class="ch-head"><span class="ch-idx">✓</span><div><h2>动手清单</h2>' +
        '<p class="ch-sub">进度自动保存在本地。运维是"做会"的，不是"看会"的 —— 每完成一项，你就离 offer 近一步。</p></div></div>' +
        '<div class="ch-body"><div class="panel">' + renderChecklist(stage) + '</div></div></section>';
    }
    // 自测
    if ((stage.quiz || []).length) {
      html += '<section class="chapter" id="quiz"><div class="ch-head"><span class="ch-idx">?</span><div><h2>自测问题</h2>' +
        '<p class="ch-sub">点击展开参考答案。能不看笔记口头答出来，才算真的过关。</p></div></div>' +
        '<div class="ch-body"><div class="panel">' + renderQuiz(stage) + '</div></div></section>';
    }
    // 术语表
    if ((stage.glossary || []).length) {
      html += '<section class="chapter" id="glossary"><div class="ch-head"><span class="ch-idx">A→Z</span><div><h2>术语速查表</h2>' +
        '<p class="ch-sub">面试和现场都会用到，建议背熟。</p></div></div>' +
        '<div class="ch-body"><div class="panel">' + renderGloss(stage) + '</div></div></section>';
    }

    html += '</div></div>';

    html += '<div class="stage-foot"><div class="wrap"><div class="foot-nav">';
    if (prev) html += '<a class="foot-link" href="#/stage/' + prev.num + '">' + icon('arrow', 'ic-sm') + '<span><em>上一阶段</em><b>' + esc(prev.title) + '</b></span></a>';
    if (next) html += '<a class="foot-link next" href="#/stage/' + next.num + '"><span><em>下一阶段</em><b>' + esc(next.title) + '</b></span>' + icon('arrow', 'ic-sm') + '</a>';
    html += '</div></div></div>';
    return html;
  }
  function countViz(stage) { return (stage.sections || []).filter(function (s) { return s.kind === 'viz'; }).length; }
  function countChecks(stage) {
    let n = 0; (stage.checklist || []).forEach(function (g) { n += g.items.length; }); return n;
  }

  /* ───────── 首页 ───────── */
  function renderHome(stages) {
    const totalWeeks = 16;
    let html = '';
    html += '<section class="hero"><canvas class="hero-canvas" id="heroCanvas"></canvas><div class="hero-inner">';
    html += '<div class="eyebrow"><i></i>AI 算力基础设施 · 现场交付与运维</div>';
    html += '<h1><span class="ln"><span>从一颗芯片</span></span><span class="ln"><span class="h1-grad">到一座智算中心</span></span><span class="ln"><span>16 周走完这条路</span></span></h1>';
    html += '<p class="hero-lede">这份图谱把 <b>7 个阶段、16 周</b>的学习内容重组成一张可操作的<strong>算力控制台</strong>：每一个抽象概念都配了会动的图 —— 让 GPU 的 Tensor Core 自己算给你看，让 TCP 握手一步步走给你看，让 8 张卡的 Ring AllReduce 转起来。不是读笔记，是<strong>看懂系统</strong>。</p>';
    html += '<div class="hero-cta">' +
      '<a class="btn btn-primary" href="#/stage/0">' + icon('rocket') + '从阶段 0 开始</a>' +
      '<a class="btn btn-ghost" href="#/map">' + icon('grid') + '查看完整能力地图</a>' +
      '</div>';
    html += '<div class="hero-stats">' +
      '<div class="hstat"><b>7</b><span>STAGES</span></div>' +
      '<div class="hstat"><b>' + totalWeeks + '</b><span>WEEKS</span></div>' +
      '<div class="hstat"><b id="hsViz">20</b><span>可视化模块</span></div>' +
      '<div class="hstat"><b id="hsTerm">300+</b><span>知识点 / 术语</span></div>' +
      '<div class="hstat"><b id="hsCmd">150+</b><span>命令与配置</span></div>' +
      '</div>';
    html += '</div></section>';

    html += '<section class="chapter" id="map" style="border-top:0"><div class="wrap">';
    html += '<div class="section-head"><div><span class="kicker">LEARNING MAP</span><h2>七个阶段，一条交付链路</h2>' +
      '<p>每个阶段都在为最终的"AI 集群交付"服务：阶段 0 搭环境，1–2 练单机，3 连网络，4 跑平台，5 上自动化，6 装配成成品。</p></div></div>';
    html += '<div class="stage-grid">' + stages.map(function (s) {
      const pct = window.AIOPS_APP ? window.AIOPS_APP.stageProgress(s) : 0;
      return '<a class="stage-card" href="#/stage/' + s.num + '" style="--st:' + s.accent + ';--st-soft:' + hexA(s.accent, .14) + '">' +
        '<div class="sc-top"><span class="sc-num">' + String(s.num).padStart(2, '0') + '</span>' +
        '<span class="sc-ic">' + icon(s.icon) + '</span></div>' +
        '<h3>' + esc(s.title) + '</h3>' +
        '<p class="sc-desc">' + md(s.desc) + '</p>' +
        '<div class="sc-tags">' + (s.tags || []).slice(0, 5).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' +
        '<div class="sc-meta"><span>' + esc(s.weeks) + '</span><span class="pct">' + pct + '% 完成</span></div>' +
        '<i class="mini-bar" style="width:' + pct + '%"></i></a>';
    }).join('') + '</div>';
    html += '</div></section>';

    html += '<section class="chapter"><div class="wrap">';
    html += '<div class="section-head"><div><span class="kicker">16-WEEK TIMELINE</span><h2>时间轴</h2><p>每天 2–3 小时，节奏紧凑但不失控。</p></div></div>';
    html += '<div class="timeline">' + stages.map(function (s) {
      return '<div class="tl-row"><div class="tl-week">' + esc(s.weeks) + '</div>' +
        '<div class="tl-body"><b>阶段 ' + s.num + ' · ' + esc(s.title) + '</b><span>' + esc(s.timeline || s.desc) + '</span></div></div>';
    }).join('') + '</div>';
    html += '</div></section>';

    html += '<section class="chapter"><div class="wrap">';
    html += '<div class="section-head"><div><span class="kicker">HOW TO USE</span><h2>怎么用这份图谱</h2></div></div>';
    html += '<div class="cards">' +
      card('eye', '先看图，再读字', '每个阶段开头的可视化就是那一章的核心机制。看不懂文字时，回到图上看一遍。') +
      card('terminal', '命令要自己敲', '代码块右上角可一键复制。别只读，复制到终端里跑一遍，错误信息比正确输出更有价值。') +
      card('check', '清单打勾才算过', '每阶段的动手清单会自动保存进度。没做完清单，别急着进下一阶段。') +
      card('target', '用自测题验收', '把自测问题口头答一遍，卡壳的地方就是你的知识漏洞。') +
      card('search', 'Ctrl+K 全局搜索', '忘了某个术语在哪？按 Ctrl+K，直接搜章节、术语、命令。') +
      card('rocket', '最后装配成品', '阶段 6 会把前五个阶段的技能串成一条完整交付链路 —— 那就是你的作品集。') +
      '</div></div></section>';

    html += '<footer class="site-foot"><div class="wrap">' +
      '<p>算力控制台 · 基于《AI 运维工程师 16 周学习笔记》阶段 0–6 重构</p>' +
      '<p>纯前端 · 零依赖 · 全部动画由 Canvas / SVG / CSS 3D 生成</p></div></footer>';
    return html;
  }
  function card(ic, t, d) {
    return '<div class="mini"><div class="mini-ic">' + icon(ic) + '</div><b>' + esc(t) + '</b><p>' + esc(d) + '</p></div>';
  }
  function hexA(hex, a) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#22d3ee');
    if (!m) return 'rgba(34,211,238,' + a + ')';
    return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')';
  }

  return {
    esc: esc, md: md, icon: icon, hl: hl,
    renderSection: renderSection, renderStage: renderStage, renderHome: renderHome,
    bindChecklist: bindChecklist, bindQuiz: bindQuiz, getChecks: getChecks,
    countChecks: countChecks, countViz: countViz
  };
})();
