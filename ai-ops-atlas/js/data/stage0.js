(window.AIOPS_STAGES = window.AIOPS_STAGES || []).push({
  id: 's0', num: 0, title: '认知与环境', icon: 'eye', accent: '#22d3ee', weeks: '第 1 周',
  desc: '建立全局认知地图：算力、AIDC、PUE、机柜与 U、BMC 带外管理，并亲手搭好一套可长期使用的 Linux 实验环境。',
  timeline: '搞清楚这个行业、这个岗位到底在做什么，然后搭好虚拟机 + SSH 免密的实验环境。',
  tags: ['AIDC', 'PUE', '机柜 U', 'BMC/IPMI', '虚拟机网络', 'SSH 免密', 'Git'],
  quote: '整个 16 周路径的起点。不追求"学得多深"，而是先建立全局认知地图 —— 搞清楚这个行业、这个岗位到底在做什么，然后亲手搭好一套可以长期使用的实验环境。',
  deliverables: [
    '一份"行业 + 岗位"认知笔记',
    '至少 1 台可正常运行的 Linux 虚拟机',
    '能通过 SSH 免密登录这台虚拟机',
    '一个用于记录学习笔记的 Git 仓库'
  ],
  sections: [
    {
      id: 's0-industry', chapter: '一、行业认知：AI 算力基础设施是什么', chaptericon: 'grid',
      chSub: '先记住三个词：算力、算法、数据。你应聘的岗位站在"算力"这一侧。',
      kind: 'cards', title: 'AI 的三大核心要素', icon: 'grid',
      items: [
        { icon: 'code', t: '算法 Algorithm', d: '模型结构、训练方法，属于**软件层面**。' },
        { icon: 'disk', t: '数据 Data', d: '训练语料、标注数据，属于**资源层面**。' },
        { icon: 'bolt', t: '算力 Computing Power', d: '把算法和数据"跑起来"的计算能力，属于**硬件层面**。大模型时代，算力成了最稀缺、最昂贵的资源。' }
      ]
    },
    {
      kind: 'callout', tone: 'key', title: '算力单位：FLOPS', icon: 'gauge',
      html: '**FLOPS = Floating-point Operations Per Second**，每秒浮点运算次数。**PFLOPS** = 10¹⁵，**EFLOPS** = 10¹⁸。AI 训练动辄需要数千张 GPU 同时工作，算力单位常以 PFLOPS 甚至 EFLOPS 计。算法科学家在"用"算力，而你负责"造"和"养"算力。'
    },
    {
      kind: 'table', title: 'AI 数据中心（AIDC）vs 传统数据中心（IDC）', icon: 'server',
      head: ['对比项', '传统数据中心', 'AI 数据中心'],
      rows: [
        ['单机柜功率', '约 5–15 kW', '**30 kW 起步，可达 100 kW 以上**'],
        ['核心设备', '通用 CPU 服务器', 'GPU 服务器 / AI 计算节点'],
        ['散热方式', '风冷为主', '风冷 + **液冷**（冷板式 / 浸没式）'],
        ['网络要求', '普通以太网', '**高速互联**（InfiniBand / RoCE）'],
        ['典型业务', 'Web、数据库、存储', '大模型训练、推理']
      ],
      note: '为什么功率密度这么重要？一张高端 GPU 功耗可达 700 W 以上，一台 8 卡 GPU 服务器轻松突破 5–10 kW。一个机柜塞几台，功率就飙到几十千瓦 —— 传统风冷已经"吹不动"了，这就是液冷成为刚需的原因。'
    },
    {
      kind: 'callout', tone: 'info', title: 'PUE：数据中心能效比', icon: 'gauge',
      html: '**PUE = Power Usage Effectiveness = 数据中心总能耗 ÷ IT 设备能耗**。PUE 是大于 1 的数值，**越接近 1 越省电**。我国要求新建大型及以上数据中心 PUE 降到 **1.3 以下**；行业平均约 1.5，优秀绿色数据中心可低至 1.2 甚至 1.1。'
    },
    {
      id: 's0-cluster', chapter: '二、一个 AI 集群是怎么"堆"起来的', icon: 'layers',
      chSub: '从一颗芯片到一座数据中心，层次是这样的。你未来每天的现场工作，基本都发生在"服务器"和"集群"这两层。',
      kind: 'flow', title: '从芯片到算力网络', icon: 'layers',
      steps: [
        { n: '①', t: '芯片（GPU / AI 加速卡）', d: '一切算力的源头。8 张卡 + 2 颗 CPU + 内存 + 硬盘 →' },
        { n: '②', t: 'AI 服务器（GPU 服务器 / AI 计算节点）', d: '多台服务器通过高速网络互联 →' },
        { n: '③', t: 'AI 集群', d: '几十到上万台节点，共享存储 + 高速互联 →' },
        { n: '④', t: 'AI 数据中心（AIDC / 智算中心）', d: '集群放进机柜、机柜放进机房 →' },
        { n: '⑤', t: '算力网络 / 算力中心集群', d: '多中心通过骨干网互联' }
      ]
    },
    {
      kind: 'cards', title: '行业现状与趋势（2025–2026）', icon: 'activity',
      items: [
        { icon: 'bolt', t: '算力需求爆发', d: '大模型参数从千亿走向万亿，训练集群规模持续扩大，对 GPU 服务器和高速互联的需求猛增。' },
        { icon: 'cable', t: '高速光互联成关键', d: '芯片、服务器、数据中心之间的连接，越来越依赖高速光模块与光互联方案。' },
        { icon: 'drop', t: '液冷加速普及', d: 'AI 机柜功率密度飙升，冷板式、浸没式液冷从"可选"变"必选"。' },
        { icon: 'chip', t: '国产算力崛起', d: '国产 GPU + 指令集 + 编译器 + 框架的全栈技术加速成熟，国产算力走廊陆续交付。' },
        { icon: 'shield', t: '绿色低碳', d: 'PUE 成为硬指标，能效优化是长期课题。' },
        { icon: 'rocket', t: '岗位成长路径', d: '运维助理 → **AI 运维工程师** → 高级运维/运维专家 → 运维架构师/SRE/DevOps → 技术经理/运维总监。' }
      ]
    },
    {
      id: 's0-dc', chapter: '三、数据中心认知', icon: 'server',
      chSub: '一个机房由哪几大子系统组成？机柜、供电、制冷、布线、动环监控。',
      kind: 'table', title: '数据中心的六大子系统', icon: 'server',
      head: ['子系统', '作用', '常见设备 / 名词'],
      rows: [
        ['**机柜与通道**', '承载并保护 IT 设备，隔离冷热气流', '机柜、冷通道、热通道、盲板'],
        ['**供配电**', '提供稳定电力，防止断电', '市电、UPS、PDU、双路供电'],
        ['**制冷**', '带走设备产生的热量', '精密空调、风冷、液冷、CDU'],
        ['**综合布线**', '连接设备之间的网络与电力线路', '网线、光模块、光纤跳线、配线架'],
        ['**监控（动环）**', '监控环境与设备状态', 'DCIM、温湿度、门禁、漏水检测'],
        ['**安防消防**', '保障人身与设备安全', '门禁、视频监控、气体灭火']
      ],
      note: '动环监控 = 动力环境监控，对机房动力系统（供电）和环境系统（温湿度、漏水、烟雾）实时监控，异常时告警。'
    },
    {
      kind: 'kv', title: '机柜与 "U"：服务器尺寸的通用语言', icon: 'grid',
      items: [
        { k: '1U', v: '**1.75 英寸 = 44.45 mm**' },
        { k: '2U / 4U', v: '8.89 cm / 17.78 cm' },
        { k: '机柜宽度', v: '标准 **19 英寸 = 482.6 mm**' },
        { k: '常见机柜高度', v: '**42U**（约 1.87 m 可用），也有 22U / 32U / 47U' },
        { k: 'GPU 服务器', v: '常见 **4U / 8U** 机型 —— 因为要塞下多张高功耗显卡' }
      ]
    },
    {
      kind: 'cards', title: '供电系统：市电、UPS、PDU', icon: 'bolt',
      items: [
        { icon: 'bolt', t: '市电', d: '城市电网供电，主电源。重要机房采用**双路市电**（两路独立电源互备）。' },
        { icon: 'shield', t: 'UPS 不间断电源', d: '市电中断时靠电池继续供电，给系统争取切换或安全关机的时间。' },
        { icon: 'grid', t: 'PDU 电源分配单元', d: '机柜里的"插排升级版"，把电力分配到每台服务器，通常带电流监控。' },
        { icon: 'alert', t: '现场常识', d: '服务器一般是**双电源**，分别接到 A、B 两路 PDU。**接线时两路要分开走** —— 这是最基本的可靠性原则。' }
      ]
    },
    {
      kind: 'viz', id: 's0-thermal', viz: 'rack-thermal', icon: 'drop', title: '机柜散热：风冷 → 冷板液冷 → 浸没液冷',
      hint: '拖动滑块调功率，切换散热方案',
      caption: '液冷的导热效率是空气的 **25 倍以上**，换热系数是风冷的 **1000–3000 倍**，所以它能支撑 100 kW 以上的超高密度机柜。机柜把设备"面对面、背对背"摆放形成**冷通道 / 热通道**，避免冷热气流混合。'
    },
    {
      kind: 'viz', id: 's0-rack3d', viz: 'rack-3d', icon: 'cube', title: '3D 机柜：42U 里塞了些什么',
      hint: '拖动旋转 · 滚轮缩放',
      caption: '标准机柜 **42U**、宽 19 英寸。GPU 服务器常见 4U/8U 机型，一台整机 30–50 kg 以上，上架需两人配合 + 升降车。'
    },
    {
      id: 's0-server', chapter: '四、服务器认知与带外管理', icon: 'chip',
      chSub: '服务器是"7×24 小时不关机、坏了不能停"的电脑。而 BMC 是它区别于 PC 的灵魂功能。',
      kind: 'compare', title: '服务器 vs 普通 PC', icon: 'server',
      left: { title: '普通 PC', items: ['用就开、不用就关', '可靠性一般，无冗余设计', '无可管理性', '扩展性有限', '坏了自己修'] },
      right: { title: '服务器', items: ['**7×24 小时**长期运行', '冗余设计（双电源、ECC 内存、RAID）', '**有 BMC 带外管理**', '支持多 CPU、大内存、多硬盘、多 PCIe', '现场运维、**热插拔**更换部件'] }
    },
    {
      kind: 'table', title: '服务器的"五脏六腑"', icon: 'memory',
      head: ['部件', '作用', '运维关注点'],
      rows: [
        ['CPU', '计算与逻辑控制', '型号、核心数、温度'],
        ['内存', '临时数据存储', '**ECC 纠错**、报错定位、通道插法'],
        ['硬盘 / SSD / NVMe', '持久化存储', 'RAID、坏盘、**热插拔**'],
        ['电源', '供电', '冗余、双路、故障灯'],
        ['风扇', '散热', '转速、噪音、告警、积灰'],
        ['PCIe', '扩展总线', '插 GPU、网卡；**通道数与代数决定带宽**'],
        ['BMC', '带外管理', '**远程管理入口**']
      ]
    },
    {
      kind: 'terms', title: '带外管理：BMC 与 IPMI', icon: 'shield',
      items: [
        { t: 'BMC', full: 'Baseboard Management Controller', d: '集成在服务器主板上的**独立小芯片**，独立于主操作系统运行。**只要插着电（哪怕关机），BMC 就一直工作。**' },
        { t: 'IPMI', full: 'Intelligent Platform Management Interface', d: '让外部系统通过 BMC 管理服务器的**规范/协议**。用 `ipmitool` 操作。' },
        { t: 'Redfish', full: '—', d: '新一代带外管理标准，基于 **RESTful API + HTTPS + JSON**，易自动化 —— 能很方便地写脚本批量管理上千台服务器。' },
        { t: 'SEL', full: 'System Event Log', d: 'BMC 记录的硬件事件日志（内存 ECC 报错、风扇异常、电源故障）。**硬件排查第一站就是看 SEL。**' },
        { t: 'KVM over IP', full: 'Keyboard / Video / Mouse', d: '把服务器的键鼠显示器通过网络重定向到你的电脑。**远程装系统就靠它。**' },
        { t: '带外管理', full: 'Out-of-Band', d: '通过独立于业务系统的专用通道管理设备。**一句话：不管系统死活都能连上服务器的保命通道。**' }
      ]
    },
    {
      kind: 'code', title: 'ipmitool 常用命令', icon: 'terminal', file: 'ipmitool', lang: 'bash',
      code: '# 安装\nsudo apt install ipmitool        # Debian/Ubuntu\nsudo dnf install ipmitool        # RHEL/Rocky\n\n# 本地操作\nsudo ipmitool sensor list        # 所有传感器（温度/电压/风扇）\nsudo ipmitool sdr list           # 传感器数据记录\nsudo ipmitool sel list           # 系统事件日志（排障核心）\nsudo ipmitool chassis status     # 机箱电源状态\nsudo ipmitool power status       # 电源状态\nsudo ipmitool power on/off/reset/cycle   # 远程开关机/重启\nsudo ipmitool fru print          # FRU 信息（型号/序列号）\n\n# 远程操作（-H BMC地址 -U 用户 -P 密码）\nipmitool -H 192.168.1.100 -U admin -P password sensor list\nipmitool -H 192.168.1.100 -U admin -P password sel list',
      note: 'BMC 常见厂商：Dell **iDRAC**、HPE **iLO**、联想 **XClarity**、浪潮 **BMC**、华为 **iBMC**、超微 **IPMI**。上架前先查清楚机型对应的默认 IP 和账号，否则第一步就卡住。'
    },
    {
      kind: 'callout', tone: 'danger', title: 'BMC 是服务器最容易被忽视的攻击面', icon: 'shield',
      html: '历史上多次出现 BMC 固件高危漏洞。防护建议：BMC **不直接暴露到公网**，只在管理网内访问；**修改默认密码**；及时**打固件补丁**；管理网做 **ACL / 防火墙**；关闭不用的服务（如不必要的 IPMI over LAN）。'
    },
    {
      id: 's0-vm', chapter: '五、虚拟化与 Linux 环境搭建', icon: 'cube',
      chSub: '不可能一开始就买物理服务器。虚拟机能在你的电脑上"模拟"出多台电脑 —— 这是学习运维最理想的沙盒。',
      kind: 'table', title: '虚拟机三种网络模式（重点）', icon: 'network',
      head: ['对比项', '桥接 Bridged', 'NAT（默认推荐）', '仅主机 Host-Only'],
      rows: [
        ['虚拟机能否上外网', '能', '能', '**不能**'],
        ['外网能否访问虚拟机', '能', '不能（需端口转发）', '不能'],
        ['与主机通信', '能', '能', '能'],
        ['虚拟机 IP 来源', '路由器 DHCP', '虚拟 NAT 的 DHCP', '虚拟 DHCP'],
        ['隔离性', '低', '中', '**高**'],
        ['适用场景', '当独立服务器', '**日常学习首选**', '隔离实验']
      ],
      note: '实操建议：初学阶段用 NAT；等要做"多机集群、互相访问"的实验时，给虚拟机加**双网卡** —— 一张 NAT 上网，一张 Host-Only 做内网互通。这也是真实生产环境的常见做法（业务网 + 管理网分离）。'
    },
    {
      kind: 'cards', title: '提高效率的两个关键动作', icon: 'refresh',
      items: [
        { icon: 'copy', t: '快照 Snapshot', d: '把虚拟机当前状态"存档"，搞坏了可以一键回滚。**装系统后、做危险操作前，先打快照。**' },
        { icon: 'layers', t: '克隆 Clone', d: '复制一台完整虚拟机，快速得到多台节点。**搭集群时，装好一台再克隆，能省大量时间。** 完整克隆独立、链接克隆省空间但依赖母机。' },
        { icon: 'alert', t: 'CentOS 已停更', d: 'CentOS 7 已于 2024 年 6 月 EOL。替代方案：**Rocky Linux**（最接近原 CentOS）、**AlmaLinux**、CentOS Stream（滚动预览，不适合生产）。建议 Ubuntu 和 Rocky 各装一台。' }
      ]
    },
    {
      id: 's0-ssh', chapter: '六、打通网络：SSH 远程登录与免密', icon: 'lock',
      chSub: '免密登录（SSH 密钥登录）是集群管理的地基 —— 没有它，自动化无从谈起。',
      kind: 'flow', title: '密钥登录原理（先理解，再操作）', icon: 'lock',
      steps: [
        { n: '①', t: '客户端请求登录', d: '客户端持有**私钥** `~/.ssh/id_ed25519`（保密，权限 600），服务器只存**公钥**（在 `authorized_keys` 里）。' },
        { n: '②', t: '服务器发随机挑战', d: '服务器用公钥加密一段随机数发给客户端。' },
        { n: '③', t: '客户端用私钥签名', d: '客户端解密后用私钥签名，把签名发回 —— **全程私钥不离开客户端**。' },
        { n: '④', t: '服务器用公钥验签', d: '匹配就放行。密码可能被暴力破解，**密钥几乎不可能被猜中**。' }
      ]
    },
    {
      kind: 'code', title: '三步搞定免密登录', icon: 'terminal', file: 'ssh-keygen', lang: 'bash',
      code: '# Step 1 · 生成密钥对（推荐 ed25519，比 RSA 更安全更短更快）\nssh-keygen -t ed25519 -C "my-laptop-2026"\n# → ~/.ssh/id_ed25519     私钥（保密！权限 600）\n# → ~/.ssh/id_ed25519.pub 公钥（分发给服务器）\n\n# Step 2 · 把公钥分发给服务器\nssh-copy-id 用户名@服务器IP\n\n# 没有 ssh-copy-id 时手动追加：\ncat ~/.ssh/id_ed25519.pub        # 复制内容，登录服务器后：\necho "刚才复制的公钥内容" >> ~/.ssh/authorized_keys\nchmod 700 ~/.ssh\nchmod 600 ~/.ssh/authorized_keys\n\n# Step 3 · 测试（不再提示输密码即成功）\nssh 用户名@服务器IP\n\n# 集群第一步：配置主机名与 hosts\nsudo hostnamectl set-hostname node01\nsudo vim /etc/hosts\n# 192.168.1.101   node01\n# 192.168.1.102   node02\n# 192.168.1.103   node03',
      note: '禁用密码登录前，**务必确认免密已经能正常登录**，否则可能把自己锁在门外：`PasswordAuthentication no` → `sudo systemctl restart sshd`。'
    },
    {
      kind: 'table', title: 'SSH 常见问题排查', icon: 'search',
      head: ['现象', '可能原因', '排查方法'],
      rows: [
        ['Connection refused', 'SSH 服务没启动 / 端口不对', '服务器上 `systemctl status sshd`'],
        ['Connection timed out', '网络不通 / 防火墙拦截', '`ping` 测试、检查防火墙'],
        ['Permission denied', '公钥没配对 / 权限不对', '检查 `authorized_keys` 内容与 `~/.ssh` 权限'],
        ['仍要求输密码', '公钥认证未生效', '检查 `sshd_config` 与目录权限（必须 700/600）'],
        ['主机名 ping 不通', 'hosts 没配 / 网络模式不对', '检查 `/etc/hosts` 与虚拟机网络模式']
      ]
    },
    {
      kind: 'code', title: 'Git 笔记库：把你的经验变成资产', icon: 'git', file: 'git', lang: 'bash',
      code: 'sudo apt update && sudo apt install -y git\n\ngit config --global user.name "你的名字"\ngit config --global user.email "你的邮箱"\n\nmkdir -p ~/notes/ai-ops && cd ~/notes/ai-ops\ngit init\necho "# AI 运维学习笔记" > README.md\ngit add .\ngit commit -m "init: 建立学习笔记库"',
      note: '笔记目录建议：`00-认知与环境/`、`01-Linux基础/`、`02-服务器硬件与GPU/`、`03-网络与高速互联/`、`04-容器与K8s/`、`05-自动化与监控/`、`99-面试与复盘/`。面试时这就是你的作品集。'
    }
  ],
  checklist: [
    { t: '第 1 周 · 环境搭建', items: [
      '安装虚拟化软件（VMware Workstation 或 VirtualBox）',
      '下载 Ubuntu Server LTS ISO 镜像（22.04 / 24.04）',
      '创建虚拟机并完成 Ubuntu Server 安装（**记得勾选 OpenSSH server**）',
      '再装一台 Rocky Linux（体验 Red Hat 系）',
      '用 `ip addr` 查到虚拟机 IP，用 `ping` 测通外网',
      '把虚拟机网络模式在 NAT / 桥接 / 仅主机之间切换体验一次',
      '给装好的系统打一个快照'
    ]},
    { t: '第 1 周 · 打通集群基础', items: [
      '生成 SSH 密钥对，配置免密登录并测试成功',
      '修改主机名为 `node01`，配置 `/etc/hosts`',
      '克隆一台虚拟机作为 `node02`，测试两台机器互通',
      '创建 Git 笔记仓库，提交第一份笔记'
    ]}
  ],
  quiz: [
    { q: 'AI 基础设施包含哪两部分？你应聘的岗位属于哪一部分？', a: '包含**硬件层**（GPU、专用 AI 芯片、数据中心、高速网络）和**软件层**（机器学习框架、算法平台、调度与运维平台）。岗位在**算力这一侧** —— 算法科学家"用"算力，你负责"造"和"养"算力。' },
    { q: 'AI 数据中心和传统数据中心最大的区别是什么？', a: '**功率密度**。传统 IDC 单机柜 5–15 kW，AIDC 30 kW 起步、可达 100 kW 以上；由此带来液冷、高速互联（IB/RoCE）等一系列差异。' },
    { q: 'PUE 是什么？怎么算？多少算好？', a: '`PUE = 数据中心总能耗 ÷ IT 设备能耗`。大于 1，**越接近 1 越省电**。我国要求新建大型及以上数据中心降到 **1.3 以下**，优秀绿色数据中心可低至 1.1。' },
    { q: '1U 等于多少毫米？标准机柜多高？', a: '**1U = 44.45 mm**（1.75 英寸）；机柜标准宽度 **19 英寸 = 482.6 mm**，常见高度 **42U**（约 1.87 m 可用）。' },
    { q: '服务器为什么需要 BMC？它和 SSH 有什么区别？', a: 'BMC 是主板上的独立芯片，**只要插着电就一直工作**，即使系统崩溃或关机也能连上（带外管理）。SSH 属于带内管理，系统挂了就断了。**BMC 是"不管系统死活都能连上"的保命通道。**' },
    { q: '虚拟机的三种网络模式分别是什么？各自特点？', a: '**桥接**：像局域网里独立电脑，双向可达；**NAT**：能上网，外网无法主动访问（新手首选）；**仅主机**：只能和主机通信，完全隔离，上不了外网。' },
    { q: '什么是 NAT？它解决什么问题？', a: '**Network Address Translation**，把私有 IP 转成公网 IP。解决了 IPv4 地址不够用的问题，代价是外部无法直接访问内部设备。' },
    { q: 'SSH 免密登录的原理是什么？公钥和私钥分别放在哪？', a: '非对称加密。服务器发随机挑战 → 客户端用**私钥**签名 → 服务器用**公钥**验签。**私钥只留在客户端**（`~/.ssh/id_ed25519`，权限 600），**公钥放在服务器的 `~/.ssh/authorized_keys`**。' },
    { q: '为什么集群里要配置主机名和 hosts？', a: '机器之间靠**主机名**互相访问比记 IP 方便得多，也是后续批量管理（Ansible、K8s）的基础。小集群用 `/etc/hosts` 就够，大集群才需要 DNS。' },
    { q: 'CentOS 现在还能用吗？替代方案有哪些？', a: 'CentOS 7 已于 2024 年 6 月 **EOL**，继续用会缺安全补丁。替代：**Rocky Linux**（最接近原 CentOS）、**AlmaLinux**、CentOS Stream（滚动预览，不适合生产）。' },
    { q: '私有 IP 地址有哪三段？', a: '`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`（RFC 1918）。' }
  ],
  glossary: [
    { t: 'IDC', d: '互联网数据中心，传统通用业务的数据中心。' },
    { t: 'AIDC', d: 'AI 数据中心 / 智算中心，专为 AI 训练推理设计的高性能算力设施。' },
    { t: 'PUE', d: '数据中心能效比，总能耗 ÷ IT 能耗，越接近 1 越好。' },
    { t: 'FLOPS', d: '每秒浮点运算次数，算力单位。' },
    { t: 'U', d: '机架单位，1U = 44.45 mm。' },
    { t: 'UPS', d: '不间断电源，断电时续命。' },
    { t: 'PDU', d: '机柜电源分配单元。' },
    { t: 'CDU', d: '液冷系统的冷却液分配单元。' },
    { t: 'BMC', d: '基板管理控制器，服务器带外管理芯片。' },
    { t: 'IPMI', d: '通过 BMC 管理服务器的传统规范。' },
    { t: 'Redfish', d: '基于 RESTful API + JSON 的现代带外管理标准。' },
    { t: 'SEL', d: '系统事件日志，硬件排查第一站。' },
    { t: 'KVM over IP', d: '远程键盘/显示/鼠标重定向。' },
    { t: 'PCIe', d: '高速串行扩展总线，插 GPU / 网卡。' },
    { t: 'ECC', d: '内存纠错技术，服务器必配。' },
    { t: 'Hypervisor', d: '提供虚拟化能力的软件层（Type 1 裸金属 / Type 2 宿主型）。' },
    { t: 'Snapshot', d: '虚拟机状态存档，可回滚。' },
    { t: 'NAT', d: '私有 IP ↔ 公网 IP 的地址转换。' },
    { t: 'SSH', d: '加密的远程登录协议，默认 22 端口。' },
    { t: 'hostname', d: '主机名，集群中每台机器必须唯一且规范。' },
    { t: 'DHCP', d: '动态主机配置协议，自动分配 IP。' },
    { t: 'EOL', d: 'End of Life，停止维护不再更新补丁。' },
    { t: 'LTS', d: 'Long Term Support，长期支持版本。' },
    { t: 'Git', d: '分布式版本控制系统。' }
  ]
});
