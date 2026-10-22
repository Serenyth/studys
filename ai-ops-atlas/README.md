# 算力控制台 · AI 运维工程师 16 周学习图谱

把 7 份 AI 运维工程师学习笔记（共 7500+ 行）重构为一个**可交互、可练习、可检索**的纯前端学习站点。
零依赖、零构建 —— 打开 `index.html` 即可运行。

## 快速开始

```bash
# 方式一：直接双击 index.html（file:// 协议可用）

# 方式二：本地起一个静态服务（推荐，字体与资源加载更稳）
python -m http.server 8765
# 然后访问 http://localhost:8765/index.html
```

## 目录结构

```
ai-ops-atlas/
├── index.html              # 入口：SVG 图标精灵（36 个 symbol）+ 页面骨架
├── css/
│   ├── main.css            # 设计令牌、蓝图网格背景、顶栏/侧栏/命令面板/响应式
│   ├── components.css      # 首页、阶段页、章节与内容组件（表格/代码/卡片/流程/对照…）
│   └── visuals.css         # 22 个可视化的专属样式（机柜、GPU 拓扑、告警流…）
└── js/
    ├── data/stage0-6.js    # 七个阶段的结构化内容数据（唯一需要维护的内容源）
    ├── visuals.js          # 可视化引擎 ①（阶段 0–3）
    ├── visuals2.js         # 可视化引擎 ②（阶段 4–6）
    ├── components.js       # 可复用渲染组件库 + 语法高亮 + 清单词典渲染
    └── app.js              # 路由、滚动监听、主题色切换、进度持久化、命令面板
```

## 设计系统

双主题（深色「机房控制台」/ 浅色「工程图纸」）共用同一套令牌，**只改变量值、不改结构**：

| 令牌 | 深色 | 浅色 | 用途 |
| --- | --- | --- | --- |
| `--bg` | `#05080e` | `#eef3f9` | 页面底色 |
| `--surface` | `#0b1220` | `#ffffff` | 面板底色 |
| `--a` | `#22d3ee` | `#0e7490` | 主信号青 |
| `--txt` → `--txt-4` | `#e7eff9` → `#7f96b0` | `#16202e` → `#5a6e85` | 四级文字层级（最小一档对比度 ≥ 4.5:1） |
| `--ok` / `--warn` / `--danger` | `#34d399` / `#fbbf24` / `#fb7185` | `#047857` / `#b45309` / `#be123c` | 状态色（浅底自动加深） |

字体：`Chakra Petch`（显示）+ `JetBrains Mono`（代码）+ 系统中文字体；正文 16px / 行高 1.8。
每个阶段有独立 accent 色（见下表），由 JS 写入 CSS 变量 `--st`，贯穿标题、表格头、滑块、图表；
**切换到浅色主题时阶段色会自动换成同色系的深色变体**（`js/app.js` 的 `LIGHT_ACCENT` 映射）。

### 主题相关文件

- `css/theme.css` —— `[data-theme="light"]` 的全部覆盖值 + 少量日间微调
- `index.html` `<head>` 内联脚本 —— 首帧前读 `localStorage` 定主题，避免闪白
- 顶栏「日/月」按钮或 `Ctrl/Cmd + Shift + L` 切换，选择写入 `aiops:theme`
- Canvas / SVG 里的颜色由 `js/visuals*.js` 的 `TC()` / `RG()` 适配层从 CSS 令牌读取
  （Canvas 的 `fillStyle` 不解析 `var()`），深色主题下取回的就是原值，视觉零变化
- **代码块与命令面板在两种主题下都保持深色**：既是「控制台」的视觉锚点，也让语法高亮对比度稳定

## 七个阶段

| 阶段 | 主题 | accent | 章节 | 可视化 | 清单 | 自测 | 术语 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 认知与环境 | `#22d3ee` | 22 | 2 | 11 | 11 | 24 |
| 1 | Linux 与 Shell 基础 | `#34d399` | 24 | 2 | 21 | 16 | 28 |
| 2 | 服务器硬件与 GPU | `#fbbf24` | 30 | 3 | 17 | 18 | 33 |
| 3 | 网络与高速互联 | `#60a5fa` | 34 | 4 | 14 | 17 | 41 |
| 4 | 容器与 Kubernetes | `#a78bfa` | 28 | 4 | 20 | 18 | 50 |
| 5 | 自动化运维与监控 | `#fb7185` | 27 | 3 | 18 | 17 | 43 |
| 6 | AI 集群实战与求职冲刺 | `#a3e635` | 33 | 4 | 29 | 16 | 28 |

合计：198 个章节、**21 个交互可视化**、64 张表格、39 段代码、130 项动手任务、113 道自测题、247 条术语。

## 交互可视化（21 个）

**硬件与基础设施**：`rack-thermal` 机柜散热（IDC / 板液冷 / 浸没对比）、`rack-3d` CSS 3D 可拖拽机柜、`gpu-die` SM/Tensor Core 矩阵乘、`topo-nvlink` PCIe/NVSwitch 拓扑、`raid-lab` RAID 0/1/5/6/10 容量与冗余演算

**Linux 与网络**：`fs-tree` 目录树、`chmod-lab` chmod 实验室、`packet-encap` 数据封装流水线、`handshake` TCP 握手/挥手时序、`subnet-lab` 子网计算器、`spine-leaf` Spine-Leaf + ECMP 多路径

**容器与 K8s**：`container-vm` 虚拟机 vs 容器（含启动速度赛跑）、`image-layers` 镜像分层与 COW、`pod-lifecycle` Pod 生命周期状态机、`gpu-plugin` Device Plugin 接入流水线

**自动化与监控**：`prom-pull` Prometheus 拉取模型、`metrics-chart` 指标图表 + 阈值线、`alert-flow` 告警分组/抑制/静默

**实战与求职**：`delivery-pipeline` AI 集群交付 12 环节、`ring-allreduce` NCCL Ring 算法（两阶段 + 实时带宽）、`accept-radar` 验收能力雷达、`five-why` 根因分析链

每个可视化都用统一的 `anim(el, cv, height, frameFn)` 引擎驱动：DPR 适配 + `ResizeObserver` 尺寸跟随 + `IntersectionObserver` 懒播（滚出视口自动停 rAF）。

## 可复用组件（`js/components.js`）

`renderSection()` 支持 10 种 `kind`：`prose` / `cards` / `table` / `code` / `callout` / `terms` / `flow` / `hflow` / `compare` / `kv` / `viz`。
另提供清单词典、自测题折叠、清单勾选、语法高亮（bash / yaml / dockerfile / promql / ini）。
行内标记：`` `code` ``、`**bold**`。

## 功能特性

- **路由**：`#/` 首页 · `#/stage/<num>` 阶段页 · `#/stage/<num>/<anchor>` 深链定位 · `#/map` 学习地图
- **命令面板**：`Ctrl/Cmd + K` 或 `/` 唤起，557 条索引（阶段 / 章节 / 术语 / 命令 / 可视化），↑↓ 选择、Enter 跳转
- **日间 / 夜间切换**：顶栏日/月按钮或 `Ctrl/Cmd + Shift + L`，写入 `localStorage`（键 `aiops:theme`），刷新与深链均保持
- **进度持久化**：清单勾选写入 `localStorage`（键 `aiops:check:<stageId>`），顶栏与侧栏进度条实时同步
- **主题联动**：切换阶段自动换 accent 色（`--st` / `--st-soft`）
- **响应式**：1180 / 900 / 560 三档断点，900px 以下侧栏抽屉化 + 汉堡菜单
- **无障碍**：`prefers-reduced-motion` 降级、`aria-label`、键盘可达

## 如何维护内容

只改 `js/data/stage*.js`。每个文件注册一个阶段对象：

```js
(window.AIOPS_STAGES = window.AIOPS_STAGES || []).push({
  id: 's3', num: 3, title: '网络与高速互联', icon: 'network', accent: '#60a5fa',
  weeks: '第 8–9 周', desc: '…', quote: '…', deliverables: ['…'],
  sections: [ { id, chapter, chSub, kind, title, icon, … } ],  // kind 见上文
  checklist: [ { t: '分组名', items: ['…'] } ],
  quiz: [ { q: '…', a: '…' } ],
  glossary: [ { t: '术语', d: '一句话解释' } ]
});
```

可用 `icon` 见 `index.html` 中的 sprite（`terminal` `server` `chip` `network` `container` `activity` `rocket` `chart` `layers` `link` `cable` `target` `lock` `shield` `book` `cube` `git` `gauge` `bolt` `alert` `check` `clock` `arrow` `code` `search` `refresh` `grid` `eye` `play` …）。

## 已验证项

- 9 个路由页面 × **日间/夜间双主题**共 18 种组合全部渲染，**0 JS 异常**
- 198 个章节、21 个可视化在两种主题下全部挂载成功，无“渲染出错/未找到”
- reveal 动画元素全部触发；滚动懒加载正常
- 命令面板：557 条索引，中文/英文/术语检索准确；清单勾选 + `localStorage` 持久化（刷新后保留）
- 主题切换后滚动位置保持，Canvas 可视化按新主题重绘
- 1920 / 1440 / 1180 / 900 / 768 / 430 六个断点**均无横向溢出**；移动端抽屉菜单开合正常
- 表格超宽时由 `.tbl-wrap` 内部横向滚动，不破坏页面布局
