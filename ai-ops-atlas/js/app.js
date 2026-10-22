/* ══════════════════════════════════════════════════════════
   应用：路由 · 侧栏 · 滚动监听 · 命令面板 · 进度
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const UI = window.AIOPS_UI;
  const VIZ = window.AIOPS_VIZ;
  const STAGES = (window.AIOPS_STAGES || []).slice().sort(function (a, b) { return a.num - b.num; });

  const view = document.getElementById('view');
  const sidebar = document.getElementById('sidebar');
  const sideScroll = document.getElementById('sideScroll');
  const topnav = document.getElementById('topnav');
  const ppNum = document.getElementById('ppNum');
  const ppBar = document.getElementById('ppBar');
  const scrollProg = document.getElementById('scrollProgress').firstElementChild;

  let cleanups = [];
  let spyObserver = null;
  let currentStage = null;
  let keepScrollY = null;

  /* ───────── 噪点层 ───────── */
  (function grain() {
    const d = document.createElement('div');
    d.id = 'grain';
    d.style.backgroundImage = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";
    document.body.appendChild(d);
  })();

  /* ───────── 日间 / 夜间 ───────── */
  const THEME_KEY = 'aiops:theme';
  function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }
  function setTheme(t, rerender) {
    if (t !== 'light') t = 'dark';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    const btn = document.getElementById('themeBtn');
    if (btn) btn.setAttribute('aria-label', t === 'light' ? '切换到夜间模式' : '切换到日间模式');
    if (rerender !== false) renderCurrent(true);
  }
  function toggleTheme() {
    const next = getTheme() === 'light' ? 'dark' : 'light';
    setTheme(next);
    window.AIOPS_APP.toast(next === 'light' ? '已切换到日间模式' : '已切换到夜间模式');
  }

  /* 阶段色在白底下必须加深，否则对比度不够 */
  const LIGHT_ACCENT = {
    '#22d3ee': '#0e7490', '#34d399': '#047857', '#fbbf24': '#b45309',
    '#60a5fa': '#1d4ed8', '#a78bfa': '#6d28d9', '#fb7185': '#be123c',
    '#a3e635': '#4d7c0f'
  };
  function accentOf(hex) {
    if (getTheme() === 'light' && LIGHT_ACCENT[hex]) return LIGHT_ACCENT[hex];
    return hex;
  }

  /* ───────── 主题色 ───────── */
  function setAccent(hex) {
    const a = accentOf(hex);
    document.documentElement.style.setProperty('--st', a);
    document.documentElement.style.setProperty('--st-soft', getTheme() === 'light' ? rgba(a, 0.12) : rgba(a, 0.14));
  }
  function rgba(hex, a) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return 'rgba(34,211,238,' + a + ')';
    return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')';
  }

  /* ───────── 进度 ───────── */
  function stageProgress(stage) {
    let total = 0, done = 0;
    (stage.checklist || []).forEach(function (g) {
      total += g.items.length;
      const saved = UI.getChecks(stage.id);
      g.items.forEach(function (_, i) { if (saved[g.t + '#' + i]) done++; });
    });
    return total ? Math.round(done / total * 100) : 0;
  }
  function refreshProgress() {
    let t = 0, d = 0;
    STAGES.forEach(function (s) {
      (s.checklist || []).forEach(function (g) {
        t += g.items.length;
        const saved = UI.getChecks(s.id);
        g.items.forEach(function (_, i) { if (saved[g.t + '#' + i]) d++; });
      });
    });
    const pct = t ? Math.round(d / t * 100) : 0;
    ppNum.textContent = pct + '%';
    ppBar.style.width = pct + '%';
    // 更新侧栏 mini 进度
    STAGES.forEach(function (s) {
      const el = sideScroll.querySelector('.side-mini[data-s="' + s.num + '"] i');
      if (el) el.style.width = stageProgress(s) + '%';
    });
    // 更新首页卡片
    if (location.hash === '' || location.hash === '#/' || location.hash === '#') {
      document.querySelectorAll('.stage-card').forEach(function (c) {
        const n = +c.getAttribute('href').split('/').pop();
        const st = STAGES.filter(function (s) { return s.num === n; })[0];
        if (!st) return;
        const p = stageProgress(st);
        const meta = c.querySelector('.pct'); if (meta) meta.textContent = p + '% 完成';
        const bar = c.querySelector('.mini-bar'); if (bar) bar.style.width = p + '%';
      });
    }
  }

  /* ───────── 侧栏 ───────── */
  function buildSidebar(stage) {
    let html = '<div class="side-group"><div class="side-label">学习路径</div>';
    html += '<a class="side-link ' + (!stage ? 'on' : '') + '" href="#/">' + UI.icon('grid') + '<span>控制台总览</span></a>';
    STAGES.forEach(function (s) {
      const on = stage && stage.num === s.num;
      html += '<a class="side-link ' + (on ? 'on' : '') + '" href="#/stage/' + s.num + '" style="--st:' + accentOf(s.accent) + ';--st-soft:' + rgba(accentOf(s.accent), getTheme() === 'light' ? .12 : .14) + '">' +
        '<span class="sl-num">' + String(s.num).padStart(2, '0') + '</span>' +
        UI.icon(s.icon) + '<span>' + UI.esc(s.title) + '</span></a>';
      if (on) {
        html += '<div class="side-sub">' + (s.sections || []).map(function (sec, i) {
          const sid = sec.id || ('sec' + i);
          return '<a href="#/stage/' + s.num + '/' + sid + '" data-sec="' + sid + '" class="' + (sec.kind === 'viz' ? 'viz-link' : '') + '">' + UI.esc(sec.title) + '</a>';
        }).join('') +
          '<a href="#/stage/' + s.num + '/checklist" data-sec="checklist">动手清单</a>' +
          '<a href="#/stage/' + s.num + '/quiz" data-sec="quiz">自测问题</a>' +
          '<a href="#/stage/' + s.num + '/glossary" data-sec="glossary">术语速查表</a>' +
          '</div>';
      }
    });
    html += '</div>';
    html += '<div class="side-group"><div class="side-label">进度</div>';
    STAGES.forEach(function (s) {
      html += '<div class="side-mini" data-s="' + s.num + '" style="--st:' + accentOf(s.accent) + '"><span>' + String(s.num).padStart(2, '0') + '</span><span class="bar"><i style="width:' + stageProgress(s) + '%"></i></span></div>';
    });
    html += '</div>';
    sideScroll.innerHTML = html;
  }

  function buildTopnav(stage) {
    const home = accentOf('#22d3ee');
    topnav.innerHTML = '<a href="#/" class="' + (!stage ? 'on' : '') + '" style="--st:' + home + ';--st-soft:' + rgba(home, getTheme() === 'light' ? .12 : .14) + '">总览</a>' +
      STAGES.map(function (s) {
        const a = accentOf(s.accent);
        return '<a href="#/stage/' + s.num + '" class="' + (stage && stage.num === s.num ? 'on' : '') + '" style="--st:' + a + ';--st-soft:' + rgba(a, getTheme() === 'light' ? .12 : .14) + '">S' + s.num + ' · ' + UI.esc(s.title) + '</a>';
      }).join('');
  }

  /* ───────── 出现动画 ───────── */
  function bindReveal(root) {
    const els = root.querySelectorAll('.chapter, .stage-card, .panel, .viz, .mini, .tl-row, .check-group, .qitem');
    els.forEach(function (e) { e.classList.add('rv'); });
    const io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) {
          const i = Array.prototype.indexOf.call(els, en.target) % 6;
          en.target.style.transitionDelay = (i * 55) + 'ms';
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
    els.forEach(function (e) { io.observe(e); });

    // 兜底：极少数环境（或深链直跳后）IO 可能漏触发，导致内容停在不可见态。
    // 3 秒后只补显"此刻已进入视口"的元素，不影响滚动出现的动效。
    setTimeout(function () {
      els.forEach(function (e) {
        if (e.classList.contains('in')) return;
        const r = e.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        if (r.top < vh * 0.92 && r.bottom > 0) { e.style.transitionDelay = '0ms'; e.classList.add('in'); }
      });
    }, 3000);
  }

  /* ───────── 可视化挂载 ───────── */
  function mountViz(root, stage) {
    root.querySelectorAll('figure.viz[data-viz]').forEach(function (fig) {
      const key = fig.dataset.viz;
      const stageEl = fig.querySelector('.viz-stage');
      const fn = VIZ[key];
      const hintEl = fig.querySelector('.viz-hint');
      const api = {
        accent: accentOf(stage ? stage.accent : '#22d3ee'),
        hint: function (t) { if (hintEl) hintEl.innerHTML = UI.icon('target', 'ic-sm') + UI.esc(t); },
        toast: toast
      };
      if (typeof fn !== 'function') {
        stageEl.innerHTML = '<div style="padding:30px;text-align:center;color:var(--txt-4);font-family:var(--f-mono);font-size:12.5px">可视化模块 “' + key + '” 未找到</div>';
        return;
      }
      try {
        const c = fn(stageEl, api);
        if (typeof c === 'function') cleanups.push(c);
      } catch (e) {
        stageEl.innerHTML = '<div style="padding:30px;text-align:center;color:var(--danger);font-family:var(--f-mono);font-size:12.5px">渲染出错：' + UI.esc(e.message) + '</div>';
      }
    });
    // 首页 hero
    const heroCv = root.querySelector('#heroCanvas');
    if (heroCv) {
      try { const c = VIZ.hero(heroCv, { accent: accentOf('#22d3ee') }); if (typeof c === 'function') cleanups.push(c); } catch (e) { }
    }
  }

  /* ───────── 代码复制 ───────── */
  function bindCopy(root) {
    root.querySelectorAll('.cp').forEach(function (b) {
      b.addEventListener('click', function () {
        const t = b.dataset.copy || '';
        if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('已复制到剪贴板'); }, function () { fallback(t); });
        else fallback(t);
        function fallback(txt) {
          const ta = document.createElement('textarea');
          ta.value = txt; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); toast('已复制到剪贴板'); } catch (e) { toast('复制失败，请手动选择'); }
          document.body.removeChild(ta);
        }
      });
    });
  }

  /* ───────── Toast ───────── */
  let toastTimer = null;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1900);
  }

  /* ───────── 滚动监听 ───────── */
  function bindSpy(stage) {
    if (spyObserver) { spyObserver.disconnect(); spyObserver = null; }
    if (!stage) return;
    const links = sideScroll.querySelectorAll('.side-sub a');
    if (!links.length) return;
    const map = {};
    links.forEach(function (a) { map[a.dataset.sec] = a; });
    const targets = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    spyObserver = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) { a.classList.remove('on'); });
          const a = map[en.target.id];
          if (a) a.classList.add('on');
        }
      });
    }, { rootMargin: '-72px 0px -68% 0px', threshold: 0 });
    targets.forEach(function (t) { spyObserver.observe(t); });
  }

  /* ───────── 渲染 ───────── */
  function renderHome() {
    setAccent('#22d3ee');
    view.innerHTML = UI.renderHome(STAGES);
    document.title = '算力控制台 · AI 运维工程师 16 周学习图谱';
  }
  function renderStage(num, anchor) {
    const idx = STAGES.map(function (s) { return s.num; }).indexOf(num);
    const stage = STAGES[idx];
    if (!stage) { location.hash = '#/'; return; }
    setAccent(stage.accent);
    currentStage = stage;
    view.innerHTML = UI.renderStage(stage, STAGES[idx - 1], STAGES[idx + 1]);
    document.title = '阶段 ' + stage.num + ' · ' + stage.title + ' · 算力控制台';
  }

  function afterRender(stage, anchor) {
    buildSidebar(stage);
    buildTopnav(stage);
    bindReveal(view);
    mountViz(view, stage);
    bindCopy(view);
    if (stage) { UI.bindChecklist(view, stage); UI.bindQuiz(view); }
    bindSpy(stage);
    refreshProgress();
    if (keepScrollY !== null) {
      // 主题切换等原地重渲染：保持滚动位置（分两次恢复，吸收懒加载可视化挂载导致的高度变化）
      const y = keepScrollY, t0 = performance.now();
      requestAnimationFrame(function () { scrollToY(y); });
      setTimeout(function () { if (performance.now() - t0 < 900) scrollToY(y); }, 340);
    } else if (anchor) {
      requestAnimationFrame(function () {
        const el = document.getElementById(anchor);
        if (el) {
          const y = el.getBoundingClientRect().top + window.pageYOffset - 74;
          // 注意：behavior:'auto' 会遵从 CSS 的 scroll-behavior:smooth 而变成平滑滚动，
          // 路由跳转必须瞬时到位，否则深链定位失效、懒加载的可视化也不会挂载。
          scrollToY(y);
        }
      });
    } else {
      scrollToY(0);
    }
  }

  /* 原地重渲染当前路由（主题切换时用：让 Canvas 按新主题重绘，且不丢滚动位置） */
  function renderCurrent(keepScroll) {
    keepScrollY = keepScroll ? window.pageYOffset : null;
    route();
    keepScrollY = null;
  }

  /* 瞬时滚动（绕过 html { scroll-behavior:smooth }） */
  function scrollToY(y) {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    try { window.scrollTo(0, y); } catch (e) { window.scrollTo(0, y); }
    document.documentElement.style.scrollBehavior = prev;
  }

  function cleanup() {
    cleanups.forEach(function (c) { try { c(); } catch (e) { } });
    cleanups = [];
    if (spyObserver) { spyObserver.disconnect(); spyObserver = null; }
    currentStage = null;
  }

  /* ───────── 路由 ───────── */
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    cleanup();
    document.body.classList.remove('nav-open');
    if (!h || h === '/') { renderHome(); afterRender(null, null); return; }
    const parts = h.split('/');
    if (parts[0] === 'stage' && parts[1] != null) {
      const num = parseInt(parts[1], 10);
      const anchor = parts[2] || null;
      const stage = STAGES.filter(function (s) { return s.num === num; })[0];
      renderStage(num, anchor);
      afterRender(stage, anchor);
      return;
    }
    if (h === 'map') { renderHome(); afterRender(null, 'map'); return; }
    location.hash = '#/';
  }
  window.addEventListener('hashchange', route);

  /* ───────── 命令面板 ───────── */
  const mask = document.getElementById('paletteMask');
  const pInput = document.getElementById('paletteInput');
  const pResults = document.getElementById('paletteResults');
  const pCount = document.getElementById('paletteCount');
  let index = [], sel = 0, filtered = [];

  function buildIndex() {
    index = [];
    index.push({ t: '控制台总览', s: '首页 · 学习地图', u: '#/', tag: 'PAGE', ic: 'grid' });
    STAGES.forEach(function (st) {
      index.push({ t: '阶段 ' + st.num + ' · ' + st.title, s: st.weeks + ' · ' + st.desc.slice(0, 34), u: '#/stage/' + st.num, tag: 'STAGE', ic: st.icon });
      (st.sections || []).forEach(function (sec, i) {
        const sid = sec.id || ('sec' + i);
        index.push({ t: sec.title, s: '阶段 ' + st.num + ' · ' + st.title + (sec.kind === 'viz' ? ' · 可视化' : ''), u: '#/stage/' + st.num + '/' + sid, tag: sec.kind === 'viz' ? 'VIZ' : 'SECTION', ic: sec.kind === 'viz' ? 'activity' : 'book', sec: sec });
      });
      index.push({ t: '动手清单 · 阶段 ' + st.num, s: st.title, u: '#/stage/' + st.num + '/checklist', tag: 'TODO', ic: 'check' });
      index.push({ t: '自测问题 · 阶段 ' + st.num, s: st.title, u: '#/stage/' + st.num + '/quiz', tag: 'QUIZ', ic: 'target' });
      (st.glossary || []).forEach(function (g) {
        index.push({ t: g.t, s: g.d.replace(/[`*\[\]]/g, '').slice(0, 44), u: '#/stage/' + st.num + '/glossary', tag: 'TERM', ic: 'layers' });
      });
      (st.sections || []).forEach(function (sec, i) {
        if (sec.kind === 'terms') (sec.items || []).forEach(function (t) {
          index.push({ t: t.t + (t.full ? ' · ' + t.full : ''), s: t.d.replace(/[`*]/g, '').slice(0, 44), u: '#/stage/' + st.num + '/' + (sec.id || ('sec' + i)), tag: 'TERM', ic: 'layers' });
        });
        if (sec.kind === 'code') {
          index.push({ t: (sec.title || '命令') + ' · ' + (sec.file || ''), s: '阶段 ' + st.num, u: '#/stage/' + st.num + '/' + (sec.id || ('sec' + i)), tag: 'CMD', ic: 'terminal' });
        }
      });
    });
    pCount.textContent = index.length + ' 条可检索内容';
  }
  function openPalette() {
    mask.hidden = false;
    pInput.value = ''; filterPalette(''); sel = 0;
    setTimeout(function () { pInput.focus(); }, 30);
  }
  function closePalette() { mask.hidden = true; }
  function filterPalette(q) {
    q = q.trim().toLowerCase();
    filtered = !q ? index.slice(0, 40) : index.filter(function (x) {
      return (x.t + ' ' + x.s + ' ' + x.tag).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 60);
    sel = 0;
    renderPalette();
  }
  function renderPalette() {
    if (!filtered.length) { pResults.innerHTML = '<div class="pal-empty">没有匹配的内容，换个关键词试试</div>'; return; }
    pResults.innerHTML = filtered.map(function (x, i) {
      return '<div class="pal-item ' + (i === sel ? 'sel' : '') + '" data-i="' + i + '">' + UI.icon(x.ic) +
        '<div class="pal-main"><div class="pal-title">' + UI.esc(x.t) + '</div><div class="pal-sub">' + UI.esc(x.s) + '</div></div>' +
        '<span class="pal-tag">' + x.tag + '</span></div>';
    }).join('');
    const selEl = pResults.querySelector('.pal-item.sel');
    if (selEl && selEl.scrollIntoView) selEl.scrollIntoView({ block: 'nearest' });
  }
  function go(i) {
    const x = filtered[i]; if (!x) return;
    closePalette();
    location.hash = x.u;
  }
  document.getElementById('paletteBtn').addEventListener('click', openPalette);
  mask.addEventListener('click', function (e) { if (e.target === mask) closePalette(); });
  pInput.addEventListener('input', function () { filterPalette(this.value); });
  pResults.addEventListener('click', function (e) {
    const it = e.target.closest('.pal-item'); if (it) go(+it.dataset.i);
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); mask.hidden ? openPalette() : closePalette(); return; }
    // Ctrl/Cmd + Shift + L：日间 / 夜间切换
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      if (!mask.hidden) closePalette();
      toggleTheme();
      return;
    }
    if (mask.hidden) {
      if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openPalette(); }
      return;
    }
    if (e.key === 'Escape') { closePalette(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(filtered.length - 1, sel + 1); renderPalette(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); renderPalette(); }
    else if (e.key === 'Enter') { e.preventDefault(); go(sel); }
  });

  /* ───────── 其它交互 ───────── */
  document.getElementById('themeBtn').addEventListener('click', toggleTheme);
  document.getElementById('menuBtn').addEventListener('click', function () {
    document.body.classList.toggle('nav-open');
  });
  window.addEventListener('scroll', function () {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
    scrollProg.style.width = (p * 100) + '%';
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) document.body.classList.remove('nav-open');
  });

  /* ───────── 启动 ───────── */
  const themeBtn0 = document.getElementById('themeBtn');
  if (themeBtn0) themeBtn0.setAttribute('aria-label', getTheme() === 'light' ? '切换到夜间模式' : '切换到日间模式');
  window.AIOPS_APP = { refreshProgress: refreshProgress, stageProgress: stageProgress, toast: toast, toggleTheme: toggleTheme, getTheme: getTheme };
  buildIndex();
  if (!location.hash) location.hash = '#/';
  route();
  setTimeout(function () {
    const hv = document.getElementById('hsViz');
    if (hv) hv.textContent = Object.keys(VIZ).length;
  }, 60);
})();
