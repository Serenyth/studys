/* ================================================================
   SEC·ATLAS · viz-l5.js
   L5 专项方向深化 可视化（一）：§49–§54
   依赖: utils.js、viz-kit.js（kpi/panel）、theme.js（PAL）
   ================================================================ */
"use strict";

/* ================= §50 方向选择器 ================= */
class PickViz{
  constructor(){
    this.body = $("#pickBody");
    this.v = { interest:7, base:5, market:6 };
    this.dims = [
      ["interest","兴趣","不看教程时你会主动研究什么"],
      ["base","基础","之前经验更贴近哪个方向"],
      ["market","市场","目标城市 / 行业有多少岗位"],
    ];
    /* 权重：兴趣 > 基础 > 市场（三者冲突时的优先级） */
    this.w = { interest:.45, base:.30, market:.25 };
    this.dirs = [
      { nm:"云安全",        a:{interest:.72, base:.80, market:.95}, tier:"岗位多 · 增长最快", cap:"高天花板",   why:"业务上云让配置面爆炸，需要系统性思考 + 自动化能力" },
      { nm:"恶意代码分析",  a:{interest:1.0, base:.55, market:.55}, tier:"岗位中 · 稳定需求", cap:"很高天花板", why:"长周期抽丝剥茧，靠耐心与积累，越老越值钱" },
      { nm:"逆向与漏洞挖掘",a:{interest:1.0, base:.40, market:.35}, tier:"岗位少 · 极稀缺",   cap:"极高天花板", why:"门槛最高、投入产出比最低，但稀缺性极强" },
      { nm:"移动与 IoT",    a:{interest:.70, base:.62, market:.60}, tier:"岗位中 · 分散",     cap:"中高天花板", why:"动手为主：拆包、拆固件、折腾硬件" },
      { nm:"工控与 OT",     a:{interest:.60, base:.50, market:.45}, tier:"岗位少但稀缺",      cap:"高天花板",   why:"需要行业背景与现场经验，替代性极低" },
    ];
    this.render();
  }
  render(){
    const sld = this.dims.map(([k,nm])=>`
      <div class="l5-sld">
        <span class="sl-k">${nm}</span>
        <input type="range" min="0" max="10" step="1" value="${this.v[k]}" data-k="${k}" aria-label="${nm}">
        <span class="sl-v" data-v="${k}">${this.v[k]}</span>
      </div>`).join("");
    const rows = this.dirs.map((d,i)=>`
      <div class="rk" data-r="${i}">
        <span class="ix" data-ix="${i}">—</span>
        <span class="nm">${d.nm}</span>
        <div class="bw"><i data-bar="${i}" style="width:0%"></i></div>
        <span class="sc" data-sc="${i}">0</span>
      </div>`).join("");
    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>三个维度 · 拖动滑块，看推荐结果怎么变</b></div>
      ${sld}
      <div class="l5-rank" style="margin-top:16px">${rows}</div>
      <div id="pickTop"></div>
      <div id="pickWarn"></div>
      <div class="ksub">推荐分数 = 各维度自评 × 该方向对该维度的依赖度 × 权重（兴趣 .45 / 基础 .30 / 市场 .25）。<b>权重不是"越高越好"，而是"冲突时听谁的"</b>——兴趣权重最高，因为安全是长周期行业。</div>
    </div>`;
    this.body.oninput = e => {
      const s = e.target.closest("[data-k]");
      if(!s) return;
      this.v[s.dataset.k] = +s.value;
      const lab = $(`[data-v="${s.dataset.k}"]`, this.body);
      if(lab) lab.textContent = s.value;
      this.update();
    };
    this.update();
  }
  update(){
    const raw = this.dirs.map((d,i) => ({
      i,
      s: Math.round(this.dims.reduce((acc,[k]) => acc + this.v[k]/10 * d.a[k] * this.w[k], 0) * 100)
    }));
    const sorted = [...raw].sort((a,b) => b.s - a.s);
    const rank = {};
    sorted.forEach((r,ix) => rank[r.i] = ix);
    const max = Math.max(...raw.map(r => r.s), 1);

    raw.forEach(r => {
      const row = $(`[data-r="${r.i}"]`, this.body);
      if(!row) return;
      row.classList.toggle("top", rank[r.i] === 0);
      $(`[data-ix="${r.i}"]`, this.body).textContent = "#" + (rank[r.i] + 1);
      $(`[data-sc="${r.i}"]`, this.body).textContent = r.s;
      $(`[data-bar="${r.i}"]`, this.body).style.width = Math.min(100, r.s / max * 100) + "%";
    });

    const top = this.dirs[sorted[0].i];
    const box = $("#pickTop", this.body);
    if(box) box.innerHTML = panel("推荐 · " + top.nm,
      top.why,
      [["岗位画像", top.tier, "amb"], ["天花板", top.cap, "good"],
       ["优先级", "兴趣 " + this.v.interest + " · 基础 " + this.v.base + " · 市场 " + this.v.market, ""]]);

    const wbox = $("#pickWarn", this.body);
    if(wbox){
      if(this.v.interest <= 3){
        wbox.innerHTML = `<div class="l5-warn"><b>注意：兴趣权重最低。</b>靠"市场热"驱动的人，通常在第二年就转行了——因为热门的岗位也会热门地卷。把兴趣调到 0、市场调到 10，推荐结果会变成"岗位多但天花板中等"的方向，这正是很多人三年后卡住的原因。</div>`;
      }else if(this.v.base <= 2 && this.v.interest >= 8){
        wbox.innerHTML = `<div class="l5-warn"><b>兴趣高但基础薄。</b>这是最好的组合，也是最慢的组合：入门期会比别人长 3–6 个月，但天花板由兴趣决定。用"两周验证"先确认痛苦是可忍受的，再投入。</div>`;
      }else{
        wbox.innerHTML = "";
      }
    }
  }
}

/* ================= §51 恶意代码分析流程 ================= */
class MalwareFlowViz{
  constructor(){
    this.body = $("#mflowBody");
    this.cur = "iso";
    this.data = {
      iso:{ ti:"① 隔离环境", de:"样本运行前先保证它跑不出这个盒子。",
        rows:[["输入","样本文件 + 干净的系统快照",""],
              ["产出","Host-Only 分析机、INetSim 假网络","good"],
              ["陷阱","忘了关共享目录 / 剪贴板——样本可以直接写到你的真实磁盘","hot"],
              ["耗时","20–30 分钟（一次性搭建）",""]] },
      tri:{ ti:"② 静态初筛", de:"三十秒拿到「值不值得深挖」的判断。",
        rows:[["输入","样本文件",""],
              ["产出","真实类型、哈希、可疑字符串、壳类型、CAPA 能力清单","good"],
              ["陷阱","相信扩展名；只看字符串就下结论","hot"],
              ["耗时","3–10 分钟",""]] },
      sand:{ ti:"③ 沙箱运行", de:"让它自己跑一遍，记录所有动作。",
        rows:[["输入","隔离机 + 假网络",""],
              ["产出","进程树、落地文件、注册表改动、网络连接","good"],
              ["陷阱","只跑一次就下结论——样本可能只是没醒","hot"],
              ["耗时","5–15 分钟（含复跑）",""]] },
      man:{ ti:"④ 手工动态分析", de:"沙箱只告诉你「发生了什么」，不告诉你「为什么」。",
        rows:[["输入","Procmon / API Monitor / x64dbg",""],
              ["产出","关键行为的确切参数：写了什么、连了哪里、解密出什么","good"],
              ["陷阱","不做快照，环境被样本污染，第二次结果不可比","hot"],
              ["耗时","1–4 小时",""]] },
      rev:{ ti:"⑤ 深度逆向", de:"定位核心函数，还原算法与协议。",
        rows:[["输入","IDA / Ghidra + 动态调试结论",""],
              ["产出","配置解密算法、C2 协议格式、持久化逻辑","good"],
              ["陷阱","一头钻进汇编，忘了目标是那三句话","hot"],
              ["耗时","数小时到数天",""]] },
      out:{ ti:"⑥ 输出结论", de:"分析的最后一步，也是最容易被跳过的一步。",
        rows:[["输入","前五步的全部记录",""],
              ["产出","报告 + IOC 清单 + YARA / Sigma 规则","good"],
              ["陷阱","只写行为不写检测——下一个人还得从头再来","hot"],
              ["耗时","1–2 小时",""]] },
    };
    this.order = ["iso","tri","sand","man","rev","out"];
    this.render();
    this.body.onclick = e => {
      const n = e.target.closest("[data-id]");
      if(n){ this.cur = n.dataset.id; this.render(); }
    };
  }
  render(){
    const short = { iso:"隔离", tri:"静态", sand:"沙箱", man:"动态", rev:"逆向", out:"输出" };
    const chain = this.order.map((k,i) =>
      `<div class="knode ${this.cur===k?"on":""}" data-id="${k}" style="min-width:88px">
        <div class="n-ix">S${i+1}</div><div class="n-ti">${short[k]}</div></div>`).join("");
    const d = this.data[this.cur];
    this.body.innerHTML = `<div class="kit">
      <div class="kchain">${chain}</div>
      ${panel(d.ti, d.de, d.rows)}
      <div class="ksub"><b>核心产出永远是三句话：</b>这是什么（家族/类型）、它做了什么（行为链）、怎么检测它（规则）。前五步都是为了凑齐这三句，第六步是把它们写下来。<b>跳过第六步的分析等于没做</b>——因为结论只存在你脑子里。</div>
    </div>`;
  }
}

/* ================= §52 PE 解剖 ================= */
class PeMapViz{
  constructor(){
    this.body = $("#peMapBody");
    this.secs = [
      { nm:".text",  ent:6.2,  vs:"0x1A000", raw:"0x19800", note:"代码段。熵 6.2 属于正常编译产物——优化过的代码熵通常在 5.5–6.5。" },
      { nm:".rdata", ent:4.9,  vs:"0x0C000", raw:"0x0BE00", note:"只读数据，导入表就在这里。如果这里熵很高，可能是加密过的字符串表。" },
      { nm:".data",  ent:3.1,  vs:"0x02000", raw:"0x01C00", note:"已初始化的全局变量。熵低是正常的——大部分是零填充。" },
      { nm:".rsrc",  ent:7.94, vs:"0x4E000", raw:"0x4DC00", note:"资源段熵 7.94 ≈ 8.0，说明里面塞了一段压缩或加密的数据——最常见的用法是藏一个完整的 PE 载荷。" },
      { nm:".reloc", ent:5.3,  vs:"0x04000", raw:"0x03E00", note:"重定位信息。加壳程序有时会刻意缩小或伪造这一段。" },
    ];
    this.sel = 3;
    this.combos = [
      { id:"exec",   apis:["VirtualAlloc","VirtualProtect","CreateThread"], cap:"在内存里申请可执行页并跑代码（无文件落地）", lv:"hot" },
      { id:"inject", apis:["CreateRemoteThread","WriteProcessMemory"],      cap:"进程注入——把代码写进别人的进程里执行",       lv:"hot" },
      { id:"dl",     apis:["URLDownloadToFile","WinExec"],                  cap:"下载并执行——典型的第一阶段加载器",           lv:"hot" },
      { id:"ransom", apis:["CryptEncrypt","FindFirstFile"],                 cap:"遍历文件并加密——勒索行为",                   lv:"hot" },
      { id:"anti",   apis:["IsDebuggerPresent","NtQueryInformationProcess"],cap:"反调试——样本预期自己会被分析",               lv:"amb" },
      { id:"dyn",    apis:["LoadLibrary","GetProcAddress"],                 cap:"运行时解析 API——导入表被刻意隐藏",            lv:"amb" },
    ];
    this.on = { exec:true, inject:false, dl:false, ransom:false, anti:false, dyn:true };
    this.render();
    this.body.onclick = e => {
      const s = e.target.closest("[data-sec]");
      if(s){ this.sel = +s.dataset.sec; this.render(); return; }
      const c = e.target.closest("[data-combo]");
      if(c){ this.on[c.dataset.combo] = !this.on[c.dataset.combo]; this.render(); }
    };
  }
  render(){
    const secRows = this.secs.map((s,i) => {
      const hi = s.ent >= 7.2;
      return `<div class="pe-sec ${this.sel===i?"on":""}" data-sec="${i}">
        <span class="nm">${s.nm}</span>
        <div class="eb"><i class="${hi?"hi":""}" style="width:${Math.round(s.ent/8*100)}%"></i></div>
        <span class="ev">${s.ent.toFixed(2)}</span>
      </div>`;
    }).join("");

    const cur = this.secs[this.sel];
    const flag = cur.ent >= 7.2 ? "异常 · 熵过高" : cur.ent >= 6.6 ? "偏高 · 需留意" : "正常";
    const flagCls = cur.ent >= 7.2 ? "hot" : cur.ent >= 6.6 ? "amb" : "good";
    const secPanel = panel("节区 · " + cur.nm, cur.note,
      [["虚拟大小", cur.vs, ""], ["原始大小", cur.raw, ""],
       ["熵", cur.ent.toFixed(2) + " / 8.00", flagCls], ["判定", flag, flagCls]]);

    const chk = this.combos.map(c => `
      <div class="ci" data-combo="${c.id}">
        <span class="box ${this.on[c.id]?"on":""}">${this.on[c.id]?"✓":""}</span>
        <span class="ct">${c.apis.join(" + ")}</span>
      </div>`).join("");

    const picked = this.combos.filter(c => this.on[c.id]);
    const capRows = picked.length
      ? picked.map((c,i) => ["#" + (i+1), c.cap, c.lv === "hot" ? "hot" : "amb"])
      : [["—", "未选择任何 API 组合", ""]];
    const capPanel = panel("推断能力（" + picked.length + " 项）",
      picked.length ? "只凭导入表就能写出的初判——这就是静态分析最有价值的地方。" : "勾选左侧的 API 组合，看能推断出什么。",
      capRows);

    this.body.innerHTML = `<div class="kit">
      <div class="l5-pe">
        <div>
          <div class="k-h"><b>节表 · 点击看熵与判定</b></div>
          ${secRows}
          <div style="margin-top:12px">${secPanel}</div>
        </div>
        <div>
          <div class="k-h"><b>导入表 · 勾选 API 组合推断意图</b></div>
          <div class="kchk">${chk}</div>
          <div style="margin-top:12px">${capPanel}</div>
        </div>
      </div>
      <div class="ksub">熵衡量随机性（0–8）：正常代码约 5–6，加密/压缩数据接近 7.5–8.0。<b>但高熵也可能是正常资源</b>（图标、压缩字符串表），所以要看"哪个节"高而不是"文件"高。另一个易漏点：<code>IsDebuggerPresent</code> 出现在导入表里本身就是情报——这个样本预期会被分析。</div>
    </div>`;
  }
}

/* ================= §53 沙箱对抗 ================= */
class SandboxViz{
  constructor(){
    this.body = $("#sandboxBody");
    this.checks = [
      ["用户名 / 计算机名含 sandbox、malware、cuckoo","沙箱镜像的常见命名，一行 if 就能识别"],
      ["进程列表出现 procmon / wireshark / x64dbg","分析工具一旦被发现，样本立刻退出"],
      ["CPU 核数 < 2、内存 < 2GB、磁盘 < 60GB","虚拟机常被配成低配，真实办公机不会"],
      ["检测虚拟化痕迹（VMware 注册表、MAC 00:0C:29）","最经典也最廉价的反沙箱手段"],
      ["鼠标从未移动、无任何用户交互","沙箱里没有人，样本等一次点击才触发"],
      ["Sleep 10 分钟以上再执行","超过沙箱默认观察窗口（常见 3–5 分钟）"],
      ["DNS 解析失败就直接退出","断网环境里它不触发任何行为"],
    ];
    this.def = [true,true,false,true,false,false,false];
    this.on = [...this.def];
    this.render();
    this.body.onclick = e => {
      const c = e.target.closest("[data-c]");
      if(c){ this.on[+c.dataset.c] = !this.on[+c.dataset.c]; this.render(); return; }
      const b = e.target.closest("[data-act]");
      if(b){
        this.on = b.dataset.act === "hard" ? this.checks.map(()=>false) : [...this.def];
        this.render();
      }
    };
  }
  render(){
    const hits = this.on.filter(Boolean).length;
    const chk = this.checks.map((c,i) => `
      <div class="ci" data-c="${i}">
        <span class="box ${this.on[i]?"on":""}">${this.on[i]?"✓":""}</span>
        <span class="ct">${c[0]}<small>${c[1]}</small></span>
        <span class="lv">${this.on[i]?"命中":"安全"}</span>
      </div>`).join("");

    const fired = this.checks.filter((c,i) => this.on[i]).map(c => c[0].split("（")[0]);
    const verdict = hits > 0
      ? `<div class="l5-verdict dead"><span class="vd">样本退出</span>
          <span class="vt">命中 <b>${hits}</b> 项检测 → 样本判断自己在沙箱里，<b>直接退出，一条行为都不产生</b>。你会得到一份"干净"的报告，然后误判它无害。命中项：${fired.join(" / ")}</span></div>`
      : `<div class="l5-verdict run"><span class="vd">样本执行</span>
          <span class="vt">全部检测通过 → 样本认为这是真实机器，<b>开始执行</b>。此时才轮到你观察五个维度：进程树 / 落地文件 / 注册表 / 网络 / 权限。</span></div>`;

    this.body.innerHTML = `<div class="kit">
      <div class="k-h"><b>勾选"当前环境会露出破绽的检测项"</b></div>
      <div class="kchk">${chk}</div>
      <div style="margin-top:12px;display:flex;gap:9px;flex-wrap:wrap">
        <div class="l5-tabs" style="margin:0">
          <button type="button" data-act="hard">加固环境（全部消除）</button>
          <button type="button" data-act="reset">还原默认配置</button>
        </div>
      </div>
      ${verdict}
      <div class="ksub"><b>"沙箱没报毒"不等于"样本无害"。</b>专业做法是换环境复跑：不同 CPU 核数、不同用户名、带鼠标移动、延长观察窗口。三次结果都不动，才有资格说"它在这个环境里不活跃"——而不是"它无害"。</div>
    </div>`;
  }
}

/* ================= §54 YARA 构建器 ================= */
class YaraViz{
  constructor(){
    this.body = $("#yaraBody");
    this.feats = [
      { id:"p1", line:'$p1 = "C:\\\\Users\\\\Public\\\\svchost.exe" ascii wide', nm:"固定落地路径",   lv:"稳定" },
      { id:"b1", line:'$b1 = { 8B 45 ?? 83 C0 0C 89 45 ?? }',                    nm:"算法常量字节序列", lv:"稳定" },
      { id:"ext",line:'$ext = ".locked" ascii nocase',                            nm:"勒索扩展名",       lv:"稳定" },
      { id:"p2", line:'$p2 = "%s%s%s%s%s%s" ascii',                               nm:"通用混淆格式串",   lv:"易误报" },
      { id:"ip", line:'$ip = "135.181." ascii',                                   nm:"C2 IP 前缀",       lv:"易变" },
    ];
    this.samples = [
      { nm:"家族A 变种1", note:"真实恶意 · 带 .locked 扩展名", bad:true,  f:["p1","b1","ext"] },
      { nm:"家族A 变种2", note:"真实恶意 · 同家族未改名",     bad:true,  f:["p1","b1"] },
      { nm:"家族B",       note:"另一个恶意家族",              bad:true,  f:["ip","p2"] },
      { nm:"notepad.exe", note:"系统正常程序",                bad:false, f:[] },
      { nm:"installer.exe", note:"正常安装包 · 含通用格式串", bad:false, f:["p2"] },
    ];
    this.on = { p1:true, b1:true, ext:false, p2:false, ip:false };
    this.render();
    this.body.onclick = e => {
      const c = e.target.closest("[data-f]");
      if(!c) return;
      this.on[c.dataset.f] = !this.on[c.dataset.f];
      this.render();
    };
  }
  render(){
    const sel = this.feats.filter(f => this.on[f.id]);
    const chk = this.feats.map(f => `
      <div class="ci" data-f="${f.id}">
        <span class="box ${this.on[f.id]?"on":""}">${this.on[f.id]?"✓":""}</span>
        <span class="ct">${f.nm}<small>${f.line.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</small></span>
        <span class="lv">${f.lv}</span>
      </div>`).join("");

    const strings = sel.map(f => "    " + f.line.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")).join("\n");
    const cond = sel.length ? sel.map(f => "$" + f.id).join(" and ") : "";
    const rule = `<span class="kw">rule</span> <span class="id">L5_Demo_Family</span> {
  <span class="kw">meta</span>:
    author = <span class="st">"analyst"</span>
    desc   = <span class="st">"browser-built demo rule"</span>
    date   = <span class="st">"2026-10"</span>
  <span class="kw">strings</span>:
${strings || '    <span class="cm">// 未选择任何特征</span>'}
  <span class="kw">condition</span>:
    uint16(0) == <span class="num">0x5A4D</span> and
    filesize &lt; <span class="num">5MB</span>${cond ? "\n    and " + cond : ""}
}`;

    const hits = this.samples.map(s => ({
      ...s,
      hit: sel.every(f => s.f.indexOf(f.id) > -1)
    }));
    const matched = hits.filter(h => h.hit);
    const fp = matched.filter(h => !h.bad).length;
    const tp = matched.filter(h => h.bad).length;

    const hitRows = hits.map(h => `
      <div class="h ${h.hit ? (h.bad ? "hit" : "fp") : ""}">
        <span class="hn">${h.nm}<small>${h.note}</small></span>
        <span class="tg">${h.hit ? (h.bad ? "命中" : "误报") : "未命中"}</span>
      </div>`).join("");

    const risk = fp === 0
      ? `<div class="l5-sum"><b>误报 0 条 · 可以上线。</b>当前规则命中 <span class="gd">${tp}</span> 个恶意样本、0 个正常文件。注意这只是 5 个文件的玩具验证——真实上线前要拿<b>几百个正常文件</b>跑一遍。</div>`
      : `<div class="l5-sum"><b>误报 ${fp} 条 · 上线前必须收敛。</b>规则命中 <span class="hi">${fp}</span> 个正常文件。一条误报规则可能让整个公司的终端告警爆炸，最终导致"规则被整体关掉"——<span class="hi">这比没有规则更糟</span>。</div>`;

    this.body.innerHTML = `<div class="kit">
      <div class="l5-pe">
        <div>
          <div class="k-h"><b>特征库 · 勾选拼规则</b></div>
          <div class="kchk">${chk}</div>
        </div>
        <div>
          <div class="k-h"><b>生成的规则</b></div>
          <pre class="l5-code">${rule}</pre>
          <div class="k-h" style="margin-top:14px"><b>在样本集上跑一遍</b></div>
          <div class="l5-hits">${hitRows}</div>
        </div>
      </div>
      ${risk}
      <div class="ksub">一条规则写出来只要十分钟，<b>验证误报要一整天</b>。好规则匹配<b>稳定的</b>特征（算法常量、独特路径）并组合多个条件；坏规则匹配易变的（C2 域名、IP）或只靠单字符串。<code>condition</code> 里 <code>N of ($s*)</code> 是常用写法——要求"至少命中 N 个特征"，能显著压低误报。</div>
    </div>`;
  }
}

/* ================= §55 栈帧实验室 ================= */
class StackFrameViz{
  constructor(){
    this.body = $("#stackBody");
    this.abi = "win";
    this.len = 40;
    this.BUF = 40;
    this.CAN = 8;
    this.RBP = 8;
    this.RET = 8;
    this.render();
  }
  render(){
    const regs = this.abi === "win"
      ? ["RCX","RDX","R8","R9"]
      : ["RDI","RSI","RDX","RCX","R8","R9"];
    const tabs = `<div class="l5-tabs">
      <button type="button" data-abi="win" class="${this.abi==="win"?"on":""}">Windows x64</button>
      <button type="button" data-abi="linux" class="${this.abi==="linux"?"on":""}">Linux x64</button>
    </div>`;

    const len = this.len;
    const inBuf = Math.min(len, this.BUF);
    const inCan = Math.max(0, Math.min(len - this.BUF, this.CAN));
    const inRbp = Math.max(0, Math.min(len - this.BUF - this.CAN, this.RBP));
    const inRet = Math.max(0, Math.min(len - this.BUF - this.CAN - this.RBP, this.RET));
    const overflow = Math.max(0, len - this.BUF);

    const cell = (ad, lb, pct, cls, filled) => `
      <div class="sf-cell">
        <span class="ad">${ad}</span>
        <div class="bx ${cls}"><span class="fill" style="width:${pct}%"></span><span class="lb">${lb}</span></div>
      </div>`;

    const bufPct = Math.round(inBuf / this.BUF * 100);
    const canPct = Math.round(inCan / this.CAN * 100);
    const rbpPct = Math.round(inRbp / this.RBP * 100);
    const retPct = Math.round(inRet / this.RET * 100);

    const retCell = cell("[rbp+0x08]", inRet > 0 ? `返回地址 ← 已被覆盖 ${inRet}/8 字节` : "返回地址（ret 从这里跳）", retPct, inRet > 0 ? "crit" : "", inRet > 0);
    const rbpCell = cell("[rbp+0x00]", inRbp > 0 ? `保存的 RBP ← 已被覆盖 ${inRbp}/8` : "保存的 RBP", rbpPct, inRbp > 0 ? "over" : "", inRbp > 0);
    const canCell = cell("[rbp-0x08]", inCan > 0 ? `Canary ← 已被破坏 ${inCan}/8` : "Canary（若开启）", canPct, inCan > 0 ? "over" : "", inCan > 0);
    const bufCell = cell("[rbp-0x30]", `buf[40] ← 已写入 ${inBuf}/40`, bufPct, "", false);

    const regBoxes = regs.map((r,i) =>
      `<span class="n ${i===0?"lit":""}">${r}</span>`).join(`<span class="ar lit">→</span>`);

    const asm = this.abi === "win"
      ? `push rbp
mov  rbp, rsp
sub  rsp, 0x40
lea  rcx, [rbp-0x30]   <span class="cm">; 第 1 个参数 → RCX</span>
call strcpy            <span class="cm">; 无边界检查</span>
leave
ret                    <span class="cm">; 从 [rbp+8] 取地址并跳转</span>`
      : `push rbp
mov  rbp, rsp
sub  rsp, 0x40
lea  rdi, [rbp-0x30]   <span class="cm">; 第 1 个参数 → RDI</span>
call strcpy            <span class="cm">; 无边界检查</span>
leave
ret                    <span class="cm">; 从 [rbp+8] 取地址并跳转</span>`;

    let verdict;
    if(inRet > 0){
      verdict = `<div class="l5-sum"><b>返回地址已被完全覆盖 → 控制流被劫持。</b>输入 ${len} 字节，溢出 <span class="hi">${overflow}</span> 字节，其中 <span class="hi">${inRet}</span> 字节落在返回地址上。程序 <code>ret</code> 时会跳到<b>你写的那 8 个字节</b>——这不是"程序崩了"，而是"程序按你写的地址跳了"。</div>`;
    }else if(inRbp > 0){
      verdict = `<div class="l5-sum"><b>已覆盖保存的 RBP，但还没碰到返回地址。</b>再写 <span class="hi">${this.BUF + this.CAN + this.RBP - len + 1}</span> 字节就能控制 <code>ret</code>。此时程序通常在 <code>leave</code> 时崩溃——栈基址被破坏。</div>`;
    }else if(inCan > 0){
      verdict = `<div class="l5-sum"><b>正在破坏 Canary。</b>如果程序开了栈保护，<code>__stack_chk_fail</code> 会立刻终止进程——你会看到 "stack smashing detected"。Canary 的作用就是<b>把"悄悄改返回地址"变成"立刻崩给你看"</b>。</div>`;
    }else{
      const rest = this.BUF - len;
      verdict = `<div class="l5-sum"><b>还在缓冲区范围内。</b>当前写入 ${len} / ${this.BUF} 字节。${rest === 0 ? "缓冲区刚好写满，<span class=\"hi\">下一个字节</span>就开始溢出" : "再写 <span class=\"hi\">" + rest + "</span> 字节就开始溢出"}，累计 <span class="hi">${this.BUF + this.CAN + this.RBP - len + 1}</span> 字节就能覆盖返回地址。</div>`;
    }

    this.body.innerHTML = `<div class="kit">
      ${tabs}
      <div class="k-h"><b>传参寄存器（前 ${regs.length} 个参数）</b></div>
      <div class="l5-graph"><div class="g">${regBoxes}<span class="ar">→ call</span></div></div>
      <div class="l5-sld" style="margin-top:16px">
        <span class="sl-k">输入长度</span>
        <input type="range" min="0" max="96" step="1" value="${len}" data-len aria-label="输入长度">
        <span class="sl-v" data-lenv>${len}</span>
      </div>
      <div class="sf-addr">↓ 高地址</div>
      <div class="sf-stack">
        ${retCell}
        ${rbpCell}
        ${canCell}
        ${bufCell}
      </div>
      <div class="sf-addr">↑ 低地址（栈向低地址生长）</div>
      ${verdict}
      <div class="l5-pe" style="margin-top:16px">
        <div><div class="k-h"><b>对应的汇编</b></div><pre class="l5-code">${asm}</pre></div>
        <div><div class="k-h"><b>栈帧结构的意义</b></div>
          <div class="l5-sum" style="margin-top:0"><b>返回地址和局部变量是邻居。</b><code>strcpy</code> 没有边界检查，所以一个"复制字符串"的动作，就能把<b>数据</b>写成<b>下一条指令的地址</b>。Canary 被放在 buf 与 RBP 之间，就是为了让任何越界写都必须先破坏它。</div>
        </div>
      </div>
      <div class="ksub">x64 Windows 前四个参数在 RCX / RDX / R8 / R9；Linux（System V）前六个在 RDI / RSI / RDX / RCX / R8 / R9。返回值都在 RAX。<b>为什么知道这个？</b>因为你读汇编时要靠它反推"这个函数在干什么"——参数从哪来，结果到哪去。</div>
    </div>`;

    /* 事件：只更新栈，不重建 DOM，避免拖动中断 */
    this.body.onclick = e => {
      const b = e.target.closest("[data-abi]");
      if(b){ this.abi = b.dataset.abi; this.render(); }
    };
    const sl = $("[data-len]", this.body);
    if(sl) sl.oninput = () => {
      this.len = +sl.value;
      const lv = $("[data-lenv]", this.body);
      if(lv) lv.textContent = this.len;
      this.paint();
    };
  }
  /* 拖动时轻量重绘：仅更新四个栈格与结论 */
  paint(){
    const len = this.len;
    const inBuf = Math.min(len, this.BUF);
    const inCan = Math.max(0, Math.min(len - this.BUF, this.CAN));
    const inRbp = Math.max(0, Math.min(len - this.BUF - this.CAN, this.RBP));
    const inRet = Math.max(0, Math.min(len - this.BUF - this.CAN - this.RBP, this.RET));
    const boxes = $$(".sf-cell .bx", this.body);
    const set = (i, pct, cls, label) => {
      const b = boxes[i];
      if(!b) return;
      b.className = "bx " + cls;
      const f = b.querySelector(".fill");
      if(f) f.style.width = pct + "%";
      const l = b.querySelector(".lb");
      if(l) l.textContent = label;
    };
    set(0, Math.round(inRet / this.RET * 100), inRet > 0 ? "crit" : "",
        inRet > 0 ? `返回地址 ← 已被覆盖 ${inRet}/8 字节` : "返回地址（ret 从这里跳）");
    set(1, Math.round(inRbp / this.RBP * 100), inRbp > 0 ? "over" : "",
        inRbp > 0 ? `保存的 RBP ← 已被覆盖 ${inRbp}/8` : "保存的 RBP");
    set(2, Math.round(inCan / this.CAN * 100), inCan > 0 ? "over" : "",
        inCan > 0 ? `Canary ← 已被破坏 ${inCan}/8` : "Canary（若开启）");
    set(3, Math.round(inBuf / this.BUF * 100), "",
        `buf[40] ← 已写入 ${inBuf}/40`);
    /* 结论条同步 */
    const sum = $(".l5-sum", this.body);
    if(sum){
      const overflow = Math.max(0, len - this.BUF);
      if(inRet > 0){
        sum.innerHTML = `<b>返回地址已被完全覆盖 → 控制流被劫持。</b>输入 ${len} 字节，溢出 <span class="hi">${overflow}</span> 字节，其中 <span class="hi">${inRet}</span> 字节落在返回地址上。程序 <code>ret</code> 时会跳到<b>你写的那 8 个字节</b>——这不是"程序崩了"，而是"程序按你写的地址跳了"。`;
      }else if(inRbp > 0){
        sum.innerHTML = `<b>已覆盖保存的 RBP，但还没碰到返回地址。</b>再写 <span class="hi">${this.BUF + this.CAN + this.RBP - len + 1}</span> 字节就能控制 <code>ret</code>。此时程序通常在 <code>leave</code> 时崩溃——栈基址被破坏。`;
      }else if(inCan > 0){
        sum.innerHTML = `<b>正在破坏 Canary。</b>如果程序开了栈保护，<code>__stack_chk_fail</code> 会立刻终止进程——你会看到 "stack smashing detected"。Canary 的作用就是<b>把"悄悄改返回地址"变成"立刻崩给你看"</b>。`;
      }else{
        const rest = this.BUF - len;
        sum.innerHTML = `<b>还在缓冲区范围内。</b>当前写入 ${len} / ${this.BUF} 字节。${rest === 0 ? "缓冲区刚好写满，<span class=\"hi\">下一个字节</span>就开始溢出" : "再写 <span class=\"hi\">" + rest + "</span> 字节就开始溢出"}，累计 <span class="hi">${this.BUF + this.CAN + this.RBP - len + 1}</span> 字节就能覆盖返回地址。`;
      }
    }
  }
}
