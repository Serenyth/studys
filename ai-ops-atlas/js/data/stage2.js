(window.AIOPS_STAGES = window.AIOPS_STAGES || []).push({
  id: 's2', num: 2, title: '服务器硬件与 GPU', icon: 'chip', accent: '#fbbf24', weeks: '第 5–7 周',
  desc: '从"管理一台 Linux"进阶到"看懂并维护一台 AI 服务器"。JD 里写的"硬件故障定位，包括 CPU、内存、GPU、存储、PCIe"就是这一阶段。',
  timeline: '服务器八大部件、RAID 选型、BMC 带外管理、固件升级、GPU 驱动/CUDA、nvidia-smi 排障。',
  tags: ['RAID', 'ECC', 'PCIe', 'BMC/IPMI', 'NVLink', 'CUDA', 'Xid', 'nvidia-smi'],
  quote: '一张 H100 就是几十万，操作必须谨慎；单卡功耗 400–700W，散热是硬约束；整机 30–50 kg 以上，上架需两人配合；一张卡故障可能导致整个训练任务失败 —— 这就是 GPU 服务器运维门槛更高的原因。',
  deliverables: [
    '一份"服务器硬件结构"思维导图 + 硬件名词笔记',
    '一份硬件故障排查手册（现象 / 定位思路 / 处理步骤）',
    '一台装好 NVIDIA 驱动 + CUDA 的 GPU 环境',
    '一份 nvidia-smi 输出解读笔记'
  ],
  sections: [
    {
      id: 's2-ai-server', chapter: '一、AI 服务器和普通服务器差在哪', icon: 'server',
      chSub: '通用服务器以 CPU 为核心；AI 服务器以 GPU 为核心，用 CPU 做调度指挥。',
      kind: 'table', title: '关键差异', icon: 'server',
      head: ['对比项', '通用服务器', 'AI 服务器'],
      rows: [
        ['计算核心', 'CPU 为主', '**GPU 为主**，CPU 辅助'],
        ['单机功耗', '300–800 W', '**3–10 kW**（8 卡机型）'],
        ['散热', '风冷足够', '高密度风冷 / **液冷**'],
        ['互联', '普通以太网', '**NVLink + 高速网卡**'],
        ['价格', '几万元', '**几十万到上百万元**'],
        ['故障影响', '单机业务', '**整集群训练中断**']
      ]
    },
    {
      kind: 'code', title: '一台典型 AI 服务器的配置', icon: 'chip', file: 'ai-server.txt', lang: 'text',
      code: '┌──────────────────────────────────────────────────────┐\n│              AI 服务器（以 8 卡机型为例）               │\n│                                                        │\n│   CPU × 2        内存 × 24~32 条      本地 NVMe × 2~8  │\n│  (Intel/AMD)    (ECC, 1~2 TB)        (系统 + 数据缓存) │\n│                                                        │\n│   GPU × 8  ◀── NVLink / NVSwitch ──▶  GPU × 8          │\n│  (A100/H100/H800…)                                     │\n│                                                        │\n│   高速网卡 × 2~8 (100G/200G/400G, IB 或 RoCE)          │\n│   RAID 卡 / HBA      电源 × 2~4 (冗余)    风扇 × 多组    │\n└──────────────────────────────────────────────────────┘'
    },
    {
      id: 's2-hw', chapter: '二、服务器硬件组成（第 5 周）', icon: 'memory',
      chSub: '八大部件：CPU、内存、主板、存储、RAID/HBA、电源、散热、网卡，加 BMC。',
      kind: 'cards', title: '硬件速查：作用与运维关注点', icon: 'grid',
      items: [
        { icon: 'chip', t: 'CPU', d: '计算与调度。关注**核心数、温度、降频**。主流 Intel Xeon / AMD EPYC。' },
        { icon: 'memory', t: '内存', d: '临时数据。关注 **ECC 报错**、**通道插法**（插错位置带宽减半）。' },
        { icon: 'grid', t: '主板 / PCH', d: '连接一切。决定支持几颗 CPU、几条内存、几个 PCIe 插槽。关注 **NUMA**。' },
        { icon: 'disk', t: '存储', d: 'HDD / SATA SSD / **NVMe**。关注坏盘、寿命、RAID 状态、**热插拔**。' },
        { icon: 'layers', t: 'RAID 卡 / HBA', d: '磁盘冗余管理。关注**电池（BBU/CacheVault）** —— 电池失效会导致写策略降级、性能骤降。' },
        { icon: 'bolt', t: '电源 PSU', d: '冗余供电。**冗余电源必须分别接到 A、B 两路 PDU**，否则冗余形同虚设。' },
        { icon: 'fan', t: '风扇', d: '散热。关注转速、温度、积灰。风扇故障 → 温度升高 → **自动降频**。' },
        { icon: 'cable', t: 'PCIe 总线', d: '扩展总线。**通道数和代数决定带宽**，8 卡服务器对通道需求极高。' },
        { icon: 'network', t: '网卡', d: '联网。关注速率、bonding、光模块。AI 集群靠 IB/RoCE 高速网卡。' },
        { icon: 'shield', t: 'BMC', d: '带外管理。独立网口、固件版本，是"不管系统死活都能连上"的入口。' }
      ]
    },
    {
      kind: 'terms', title: '内存与 CPU 的关键概念', icon: 'memory',
      items: [
        { t: 'ECC', full: 'Error Correcting Code', d: '内存中额外用 8 位校验位保护 64 位数据（共 72 位），能**自动检测并纠正单比特错误**。服务器必配 —— 内存错误可能导致数据损坏甚至宕机。' },
        { t: 'CE / UE', full: 'Correctable / Uncorrectable Error', d: '**CE 可纠正**（单比特，自动纠正、记录日志，偶发可观察、频繁需关注）；**UE 不可纠正**（多比特，无法纠正，通常导致系统崩溃，**必须立即处理**）。' },
        { t: '内存通道', full: 'Channel', d: 'CPU 与内存之间的并行数据通路。**内存条必须按通道均匀插满**才能发挥全部带宽，插错位置会导致带宽减半，AI 训练性能明显下降。' },
        { t: 'NUMA', full: 'Non-Uniform Memory Access', d: '双路服务器中每颗 CPU 有自己的本地内存，**跨 NUMA 访问会拖慢性能** —— 这也是 GPU 绑核（把进程绑到对应 CPU）成为优化手段的原因。' },
        { t: 'Thermal Throttling', full: '热降频', d: '芯片温度超阈值时自动降频减少发热。表现为"性能突然变慢"，根因往往是散热异常（风扇故障、积灰、机房温度高）。' }
      ]
    },
    {
      kind: 'table', title: 'PCIe 代数与带宽', icon: 'cable',
      head: ['代数', '单通道带宽', 'x16 带宽（理论）'],
      rows: [
        ['PCIe 3.0', '~1 GB/s', '~16 GB/s'],
        ['PCIe 4.0', '~2 GB/s', '~32 GB/s'],
        ['PCIe 5.0', '~4 GB/s', '~64 GB/s']
      ],
      note: '**x16 / x8 是插槽的"宽度"**，决定带宽上限。一张 GPU 插在 x8 插槽上带宽减半，性能受影响。**PCIe 拆分（Bifurcation）** 可把一个 x16 拆成两个 x8，需要主板/BIOS 支持。'
    },
    {
      id: 's2-raid', chapter: '三、RAID（重点）', icon: 'layers',
      chSub: '把多块硬盘组合成一个逻辑盘，实现性能提升和/或冗余容错。',
      kind: 'callout', tone: 'danger', title: 'RAID 不是备份！', icon: 'alert',
      html: '它只防"硬盘硬件故障"，防不了误删、病毒、火灾。数据安全永远靠 **3-2-1 原则**（3 份数据、2 种介质、1 份异地）。'
    },
    {
      kind: 'viz', viz: 'raid-lab', icon: 'layers', title: 'RAID 实验室：换级别、拖磁盘数、点盘模拟坏盘',
      hint: '点击磁盘可模拟故障',
      caption: '**RAID 5/6 的写惩罚**：每写一次数据需要"读旧数据 + 读旧校验 + 算新校验 + 写新数据 + 写新校验"，实际磁盘 IO 远大于 1 次，所以随机写性能较差 —— 这是它的固有代价。**重建期间若再坏一块盘，RAID 5 就会丢数据**。'
    },
    {
      kind: 'table', title: '硬 RAID vs 软 RAID', icon: 'grid',
      head: ['类型', '实现', '优点', '缺点'],
      rows: [
        ['**硬 RAID**', '独立 RAID 卡（带缓存和电池）', '性能好、不占 CPU、支持热插拔/在线重建', '成本高'],
        ['**软 RAID**', '操作系统软件（Linux `mdadm`）', '免费、灵活', '占 CPU、依赖系统']
      ],
      note: 'Linux 查看 RAID：`cat /proc/mdstat`（软 RAID）、`sudo mdadm --detail /dev/md0`、`lspci | grep -i raid`；硬件 RAID 用厂商工具 `storcli /c0 show all`、`MegaCli`、`perccli`。'
    },
    {
      id: 's2-oob', chapter: '四、带外管理：BMC / IPMI / Redfish（第 6 周重点）', icon: 'shield',
      chSub: '不管系统死活都能连上服务器的保命通道。',
      kind: 'cards', title: 'BMC 能做什么（运维日常）', icon: 'shield',
      items: [
        { icon: 'activity', t: '硬件监控', d: 'CPU 温度、风扇转速、电压、电源状态、内存/硬盘健康。' },
        { icon: 'bolt', t: '远程电源控制', d: '远程开机、关机、重启 —— **哪怕系统已经卡死**。' },
        { icon: 'eye', t: '远程控制台 KVM over IP', d: '像坐在机器前一样操作屏幕，**远程装系统就靠它**。' },
        { icon: 'search', t: '事件日志 SEL', d: '快速定位是内存、硬盘还是温度问题。**硬件排查第一站。**' },
        { icon: 'refresh', t: '固件升级', d: 'BIOS、BMC、CPLD 固件更新。' },
        { icon: 'disk', t: '虚拟介质', d: '把本地 ISO 挂载成服务器的"虚拟光驱"。' }
      ]
    },
    {
      kind: 'compare', title: 'IPMI vs Redfish', icon: 'link',
      left: { title: 'IPMI（传统协议）', items: ['基于命令，用 `ipmitool` 操作', '老但通用，几乎所有服务器都支持', '输出为文本，解析麻烦', '安全性与扩展性受限'] },
      right: { title: 'Redfish（现代协议）', items: ['基于 **RESTful API + HTTPS + JSON**', '像调用 Web API 一样简单', '**易自动化** —— 能写脚本批量管理上千台服务器', '现代服务器和自动化平台都要求支持'] }
    },
    {
      kind: 'code', title: 'Redfish 调用示例', icon: 'code', file: 'redfish.sh', lang: 'bash',
      code: '# 查询系统信息\ncurl -k -u admin:password https://192.168.1.100/redfish/v1/Systems/1\n\n# 查询处理器信息\ncurl -k -u admin:password https://192.168.1.100/redfish/v1/Systems/1/Processors',
      note: '**管理网 / 业务网分离**是安全与稳定的基本要求：业务网跑实际流量，管理网跑 BMC / 监控 / SSH。管理网不通不影响业务，也防止管理流量被攻击。'
    },
    {
      kind: 'flow', title: '固件升级：顺序错了会变砖', icon: 'refresh',
      steps: [
        { n: '①', t: '先升级 BMC', d: '因为 BIOS 通常由 BMC 负责刷写，**BMC 版本太旧可能不支持新 BIOS 的刷新方式**。升级 BMC 固件只需重启 BMC，**不影响业务**。' },
        { n: '②', t: '再升级 BIOS', d: '通常需要**重启服务器**，业务会中断，需提前协调。' },
        { n: '③', t: '必要时升级 CPLD', d: '复杂可编程逻辑器件，负责板级信号与电源时序。' }
      ]
    },
    {
      kind: 'callout', tone: 'danger', title: '固件升级避坑要点', icon: 'alert',
      html: '① **升级过程中绝对不能断电、不能重启 BMC** —— 刷一半断电可能变"砖"；② 升级前**备份当前配置**（BMC 配置、BIOS 设置）；③ 确认固件版本与机型**严格匹配**（刷错型号会变砖）；④ 升级后必要时清除 CMOS / 恢复默认设置。BMC Web 界面刷写成功率约 92%，是最常用的方式。'
    },
    {
      id: 's2-mount', chapter: '五、服务器上架与部署流程', icon: 'rocket',
      chSub: 'JD 里"现场安装、部署"说的就是这一节。',
      kind: 'hflow', title: '上架七步', icon: 'server',
      steps: [
        { t: '验机', d: '核对到货清单与实物，记录 SN' },
        { t: '装导轨', d: '左右不能混装，从下到上，用水平仪' },
        { t: '推入机柜', d: '两人配合，一前一后' },
        { t: '固定螺丝', d: '两侧各拧两颗，不要只拧单侧' },
        { t: '接线', d: '双电源分接 A/B 两路 PDU' },
        { t: '理线贴标签', d: '扎带整齐、标签清晰' },
        { t: '加电自检', d: '看指示灯、登 BMC 查 SEL' }
      ]
    },
    {
      kind: 'flow', title: '部署顺序总览', icon: 'layers',
      steps: [
        { n: '①', t: '物理上架与接线', d: '全程佩戴**防静电手环** —— 静电会击穿芯片。GPU 服务器很重，**严禁单人操作**。' },
        { n: '②', t: 'BMC 配置', d: 'IP、账号、固件版本确认。' },
        { n: '③', t: 'RAID 配置', d: '做 RAID，建虚拟盘。' },
        { n: '④', t: '安装操作系统', d: '用 BMC 虚拟介质挂 ISO。' },
        { n: '⑤', t: '驱动安装', d: '网卡、RAID、GPU 驱动。' },
        { n: '⑥', t: '系统配置', d: '静态 IP、主机名、hosts、安全加固。' },
        { n: '⑦', t: '加入集群', d: 'Ansible 纳管、监控接入。' }
      ]
    },
    {
      id: 's2-fault', chapter: '六、硬件故障定位（第 6 周重点）', icon: 'search',
      chSub: '从外到内、从简到繁、从硬件到软件。先判断是"硬件问题"还是"软件问题"。',
      kind: 'flow', title: '分层排查方法论（核心）', icon: 'target',
      steps: [
        { n: '①', t: '观察现象', d: '指示灯、告警、日志。' },
        { n: '②', t: '查 BMC', d: 'SEL 日志、传感器 —— **硬件问题优先看这里**，硬件故障基本都会在里面留痕。' },
        { n: '③', t: '查系统日志', d: '`dmesg -T`、`journalctl -k -p err`。' },
        { n: '④', t: '定位到具体部件', d: 'CPU / 内存 / 硬盘 / GPU / 电源 / 网卡。' },
        { n: '⑤', t: '隔离验证', d: '重插、换槽位、**替换法** —— 把疑似故障件换到别的位置，看错误是否"跟着它走"。' },
        { n: '⑥', t: '处理并记录', d: '重启 / 换件 / 报修，记录时间、部件、SN、处理人。' }
      ]
    },
    {
      kind: 'table', title: '故障定位速查表', icon: 'search',
      head: ['故障类型', '首查位置', '关键命令'],
      rows: [
        ['硬盘', 'SMART + RAID 状态', '`smartctl -a /dev/sda`、`storcli /c0 /eall /sall show`、`dmesg | grep -i -E "error|ata|scsi"`'],
        ['内存', 'EDAC 日志 + BMC', '`dmesg | grep -i -E "edac|ecc"`、`ipmitool sel list`、`dmidecode -t memory`'],
        ['电源', 'BMC 传感器 + 指示灯', '`ipmitool sensor list`、`ipmitool chassis status`'],
        ['风扇 / 温度', 'BMC 传感器', '`ipmitool sensor list`'],
        ['GPU', '`nvidia-smi` + dmesg', '`nvidia-smi -q`、`dmesg | grep -i -E "nvidia|xid"`'],
        ['网卡', '`ip` + `ethtool` + dmesg', '`ip link`、`ethtool eth0`、`lspci -tv`']
      ]
    },
    {
      kind: 'code', title: '硬盘故障：排查与处理', icon: 'disk', file: 'disk-fault.sh', lang: 'bash',
      code: '# 查看磁盘状态\nlsblk\nsmartctl -a /dev/sda          # SMART 健康信息（需 smartmontools）\nsmartctl -H /dev/sda          # 只看健康总评\n\n# 查看内核磁盘报错\ndmesg | grep -i -E "error|fail|ata|scsi"\njournalctl -k | grep -i disk\n\n# RAID 状态\ncat /proc/mdstat\nsudo storcli /c0 /eall /sall show    # 硬件 RAID 查物理盘状态',
      note: '关键 SMART 指标：`Reallocated_Sector_Ct`（重映射扇区）、`Current_Pending_Sector`（待处理扇区）、`Media_Wearout`（SSD 磨损）。**处理顺序**：① 确认 RAID 冗余还在 → ② 不要直接拔盘，先确认是哪块 → ③ 在 RAID 卡管理界面把盘设为 Failed / Offline 后再拔 → ④ 换新盘触发重建 → ⑤ **重建期间避免高负载**（重建很吃 IO）→ ⑥ 记录并观察进度。'
    },
    {
      id: 's2-gpu', chapter: '七、GPU 与 AI 计算（第 7 周重点）', icon: 'chip',
      chSub: 'GPU 有成千上万个简单核心，特别擅长"把同一个操作同时施加到海量数据上" —— 这正是 AI 训练需要的并行计算。',
      kind: 'compare', title: 'CPU vs GPU', icon: 'chip',
      left: { title: 'CPU（几个博士生）', items: ['核心数：几十个', '单核能力：**强**', '擅长串行、逻辑、控制', '负责调度数据、驱动 GPU、处理非并行任务'] },
      right: { title: 'GPU（几千个小学生同时算）', items: ['核心数：**几千到上万个**', '单核能力：弱', '擅长**并行、矩阵、向量**', 'AI 训练需要海量矩阵运算，正好是它的强项'] }
    },
    {
      kind: 'viz', viz: 'gpu-die', icon: 'chip', title: 'GPU 内部：SM 阵列与 Tensor Core 矩阵乘',
      hint: '切换 Tensor Core / CUDA Core 对比',
      caption: '**SM（Streaming Multiprocessor）** 是 GPU 的基本计算单元，H100 有 132 个 SM。**Tensor Core** 专为矩阵乘加设计，从 Volta 架构引入 —— **AI 算力指标（TFLOPS）主要看它**。CUDA Core 其实是营销术语，技术上是"流处理器"。'
    },
    {
      kind: 'terms', title: '显存：决定你能跑多大的模型', icon: 'memory',
      items: [
        { t: 'VRAM', full: '显存', d: 'GPU 专用高速内存，存放模型参数、中间激活值、训练数据。**显存容量直接决定能跑多大的模型** —— 不够就跑不起来或必须拆分。' },
        { t: '显存带宽', full: 'Memory Bandwidth', d: '显存每秒能传输的数据量（GB/s）。**大模型训练/推理常常是"带宽瓶颈"** —— 算力再强，数据喂不进去也白搭。这是 H100 相比 A100 的重点提升方向。' },
        { t: 'HBM', full: 'High Bandwidth Memory', d: '通过**硅中介层（Interposer）**与 GPU 核心封装在一起的堆叠式内存。带宽极高、功耗低；缺点是**不可单独更换** —— HBM 出问题通常要换整张卡。' },
        { t: 'GDDR6 / GDDR6X', full: '—', d: '消费级显卡常用显存类型。' }
      ]
    },
    {
      kind: 'table', title: '主流数据中心 GPU 型号对比', icon: 'grid',
      head: ['型号', '架构', '显存', '显存类型', 'FP16 算力（约）', '定位'],
      rows: [
        ['**A100**', 'Ampere', '40/80 GB', 'HBM2e', '~312 TFLOPS', '上一代主力'],
        ['**A800**', 'Ampere', '80 GB', 'HBM2e', '受限', 'A100 的合规版本'],
        ['**H100**', 'Hopper', '80 GB', 'HBM3', '~989 TFLOPS', '当前主力，支持 FP8'],
        ['**H800**', 'Hopper', '80 GB', 'HBM3', '互联带宽受限', 'H100 的合规版本'],
        ['**H200**', 'Hopper', '141 GB', 'HBM3e', '更高带宽', '大显存推理'],
        ['**B200 / GB200**', 'Blackwell', '192 GB+', 'HBM3e', '大幅提升', '新一代']
      ],
      note: '算力数据随精度（FP32/TF32/FP16/FP8）和稀疏/稠密模式不同而变化，表中为量级参考。**合规版本提示**：A800、H800、H20 是针对中国市场推出的**互联带宽受限**版本 —— 单卡算力接近原版，但 GPU 间/节点间互联带宽被限制，**大规模多卡协同训练效率会受影响**，这是国内 AI 集群运维需要特别理解的点。'
    },
    {
      kind: 'viz', viz: 'topo-nvlink', icon: 'network', title: 'GPU 互联：PCIe 共享带宽 vs NVSwitch 全互联',
      hint: '左右对比',
      caption: '**NVLink** 让 GPU 直接对话（A100 双向约 600 GB/s，H100 约 900 GB/s）；**NVSwitch** 是交换芯片，让 8 张卡之间**无阻塞全互联**。大模型训练要频繁同步梯度，**互联带宽不足，GPU 再强也要"等数据"**。'
    },
    {
      kind: 'code', title: '查看 GPU 拓扑与形态', icon: 'network', file: 'gpu-topo.sh', lang: 'bash',
      code: 'nvidia-smi topo -m       # 查看 GPU 之间的连接拓扑（NVLink / PCIe / SYS）\nlspci | grep -i nvidia   # 系统是否识别到 GPU\nnvidia-smi -L            # 列出所有 GPU 及 UUID',
      note: '拓扑输出里 **NV# = NVLink（最好）**、**PIX/PXB = 同 PCIe 交换机/主机桥（好/中）**、**PHB = 同 CPU 主机桥（一般）**、**SYS = 跨 NUMA/跨 CPU（最差）**。8 卡服务器应该是全 NVLink 互联，出现大量 `SYS` 说明拓扑异常或卡插错位置。**形态**：PCIe 卡受 PCIe 带宽限制；**SXM 模块**安装在 HGX 主板上，支持 NVLink 全带宽互联。'
    },
    {
      id: 's2-cuda', chapter: '八、GPU 环境搭建：驱动与 CUDA', icon: 'layers',
      chSub: '三层软件栈：框架 → cuDNN → CUDA Toolkit → 驱动 → GPU。版本匹配是新手最常踩的坑。',
      kind: 'flow', title: '软件栈自下而上', icon: 'layers',
      steps: [
        { n: '⑤', t: '应用框架 PyTorch / TensorFlow', d: '你写训练代码的地方，它决定"需要哪个 CUDA 版本"。' },
        { n: '④', t: 'cuDNN', d: 'CUDA Deep Neural Network library，为卷积、池化提供高度优化实现，PyTorch/TensorFlow 底层都依赖它。' },
        { n: '③', t: 'CUDA Toolkit', d: 'NVIDIA 的并行计算平台与编程模型，让开发者能用 GPU 做通用计算。**CUDA 是 AI 生态的基石。**' },
        { n: '②', t: 'NVIDIA 显卡驱动 Driver', d: '**驱动版本决定"最高能装哪个 CUDA"**，框架决定"需要哪个 CUDA"。' },
        { n: '①', t: '硬件：GPU', d: '一切的基础。' }
      ]
    },
    {
      kind: 'code', title: '驱动与 CUDA 安装', icon: 'terminal', file: 'cuda-install.sh', lang: 'bash',
      code: '# ---- 安装前检查 ----\nlspci | grep -i nvidia     # 系统是否识别到 GPU（看不到就是硬件层面没识别到）\nuname -r                   # 装驱动要对应内核\nnvidia-smi                 # 检查是否已装驱动\ngcc --version              # 确认有编译环境\n\n# ---- 方式一：包管理器（推荐，最省心）----\nsudo apt update\nsudo ubuntu-drivers devices          # 查看推荐的驱动版本\nsudo apt install -y nvidia-driver-550\nsudo reboot\nnvidia-smi                           # 能正常输出说明驱动 OK\n\n# ---- CUDA 安装（以 Ubuntu 为例）----\nwget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb\nsudo dpkg -i cuda-keyring_1.1-1_all.deb\nsudo apt update\nsudo apt install -y cuda-toolkit-12-4\n\n# ---- 配置环境变量（加入 ~/.bashrc）----\nexport PATH=/usr/local/cuda/bin:$PATH\nexport LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH\nsource ~/.bashrc\nnvcc -V                    # 验证 CUDA 编译器版本',
      note: '常见坑：**Secure Boot 未关闭** → 驱动模块加载失败；**已装 Nouveau 开源驱动** → 需先禁用（加入 blacklist）；**内核升级后驱动失效** → 用 DKMS 自动重建。注意：`nvidia-smi` 右上角的 "CUDA Version" 是**驱动支持的最高 CUDA 版本**，不是你装的版本，用 `nvcc -V` 看实际安装的版本。'
    },
    {
      kind: 'code', title: 'nvidia-smi 详解（GPU 运维最重要的命令）', icon: 'activity', file: 'nvidia-smi.sh', lang: 'bash',
      code: 'nvidia-smi                       # 概览\nnvidia-smi -L                    # 列出所有 GPU 及 UUID\nnvidia-smi -q                    # 详细查询（驱动/温度/功耗/ECC）\nnvidia-smi -q -d ECC             # 只看 ECC\nnvidia-smi -q -d TEMPERATURE     # 只看温度\nnvidia-smi -q -d POWER           # 只看功耗\nnvidia-smi -l 5                  # 每 5 秒刷新（监控用）\nnvidia-smi topo -m               # GPU 拓扑\nnvidia-smi -i 0                  # 指定第 0 号 GPU\n\n# 结构化输出（便于脚本处理）\nnvidia-smi --query-gpu=index,memory.used,memory.total,temperature.gpu,power.draw,utilization.gpu --format=csv\n\n# 生产建议设置\nsudo nvidia-smi -pm 1     # 开启持久化模式（驱动常驻，避免频繁初始化）\nsudo nvidia-smi -e 1      # 开启 ECC（略减少可用显存）\nsudo nvidia-smi -pl 500   # 设置功耗上限\nsudo nvidia-smi -c 3      # 计算模式设为独占（避免多进程干扰）',
      note: '输出关键字段：**Temp**（持续 >80°C 需关注散热）、**Perf**（P0 最高、P12 最低）、**Pwr:Usage/Cap**（接近 Cap 说明满载）、**Memory-Usage**（接近上限会 OOM）、**GPU-Util**（低说明没吃满或数据瓶颈）、**ECC**（非 0 需警惕）、**Persistence-M**（生产建议开启）。'
    },
    {
      id: 's2-gpufault', chapter: '九、GPU 故障排查', icon: 'alert',
      chSub: 'Xid 错误码是 GPU 排障的核心线索。',
      kind: 'table', title: '常见 Xid 错误码', icon: 'alert',
      head: ['Xid', '含义', '处理建议'],
      rows: [
        ['13', '图形引擎异常', '多为软件/驱动问题，可重试'],
        ['31', '显存访问错误', '检查应用逻辑，可能驱动问题'],
        ['43', 'GPU 停止处理任务', '常由驱动/硬件引起，重启实例'],
        ['48', '双比特 ECC 错误（DBE）', '敏感业务建议换卡'],
        ['63 / 64', 'ECC 相关错误', '显存问题，严重时换卡'],
        ['74', 'NVLink 错误', '检查 NVLink / 互联硬件'],
        ['**79**', '**GPU has fallen off the bus（掉卡）**', '驱动或硬件问题，先重启，仍存在需报修'],
        ['94', 'Contained ECC error（已隔离）', '记录观察'],
        ['**95**', '**Uncontained ECC error（未隔离）**', '**严重**，可能导致进程崩溃，需换卡']
      ],
      note: '处理原则：**Xid 79、94、95 属于严重级别**，通常需要重启或更换硬件；偶发 Xid 可先观察，频繁出现必须处理。查询：`dmesg -T | grep -i xid`、`journalctl -k | grep -i xid`。'
    },
    {
      kind: 'code', title: '掉卡排查与 ECC 处理', icon: 'search', file: 'gpu-debug.sh', lang: 'bash',
      code: '# ---- 掉卡排查 ----\n# 1. 确认是否真的掉卡\nnvidia-smi -L\nlspci | grep -i nvidia\n\n# 2. 查看内核日志\ndmesg -T | grep -i -E "nvidia|xid|fallen"\n\n# 3. 尝试重载驱动\nsudo rmmod nvidia_uvm nvidia_drm nvidia_modeset nvidia\nsudo modprobe nvidia\n\n# 4. 检查 GPU 辅助供电线是否松动（大功耗卡常见）\n# 5. 检查是否过热导致保护\n\n# ---- ECC 报错处理 ----\nnvidia-smi -q -d ECC             # 查看 ECC 错误计数\nnvidia-smi -q | grep -A 20 "ECC"\n\n# ---- 报修时提供完整诊断信息 ----\nsudo nvidia-bug-report.sh',
      note: '**排查顺序**：先软后硬（重载驱动 → 重启系统 → 看是否恢复）→ 检查供电 → 检查散热 → 查日志 Xid 号给方向 → 隔离验证（换槽位看问题是否跟随）→ 仍无法恢复则报修/换卡。**集群运维实践**：大规模 GPU 集群里，ECC 错误多的卡会被自动隔离（cordon），防止影响训练任务 —— 这是 K8s GPU 运维的重要一环。'
    },
    {
      kind: 'table', title: 'GPU 排查工具', icon: 'cube',
      head: ['工具', '用途'],
      rows: [
        ['`nvidia-smi`', '基础状态查询（温度/功耗/显存/ECC/利用率）'],
        ['`nvidia-smi topo -m`', '拓扑检查'],
        ['`dmesg` / `journalctl -k`', 'Xid 与驱动日志'],
        ['`lspci`', '系统是否识别 GPU'],
        ['**DCGM**（`dcgmi`）', '数据中心 GPU 监控与管理，集群级标准工具'],
        ['`nvidia-bug-report.sh`', '一键收集 GPU 诊断信息（报修用）'],
        ['`gpustat` / `nvitop`', '更友好的监控界面']
      ]
    }
  ],
  checklist: [
    { t: '第 5 周 · 硬件认知', items: [
      '用 `dmidecode` 读出本机（或虚拟机）的 CPU、内存、主板信息',
      '用 `lspci -tv` 查看 PCIe 设备树，找出 GPU、网卡、RAID 卡',
      '画一张"服务器八大部件"思维导图',
      '整理 RAID 0/1/5/6/10 对比表（容量、冗余、性能、场景）',
      '用 `lsblk`、`fdisk -l`、`smartctl` 查看磁盘信息'
    ]},
    { t: '第 6 周 · 带外管理与故障', items: [
      '登录一台服务器的 BMC（Web 或 ipmitool），查看传感器和 SEL 日志',
      '用 `ipmitool sensor list` 和 `ipmitool sel list` 输出一份硬件状态报告',
      '用 `dmidecode -t memory` 查看内存条与槽位信息',
      '模拟内存/硬盘告警，练习"查日志 → 定位 → 隔离验证"流程',
      '整理一份硬件故障排查手册'
    ]},
    { t: '第 7 周 · GPU', items: [
      '在一台有 GPU 的机器（或云 GPU）上安装 NVIDIA 驱动',
      '安装 CUDA Toolkit 并配置环境变量，用 `nvcc -V` 验证',
      '用 `nvidia-smi` 完整解读输出（温度、功耗、显存、ECC）',
      '用 `nvidia-smi topo -m` 查看 GPU 拓扑',
      '开启持久化模式（`nvidia-smi -pm 1`）',
      '用 `dmesg | grep -i nvidia` 查看驱动日志',
      '模拟/查阅一次 Xid 报错，写出排查思路'
    ]}
  ],
  quiz: [
    { q: 'CPU 和 GPU 在 AI 服务器里分别扮演什么角色？', a: 'CPU 是"总指挥" —— 负责调度数据、驱动 GPU、处理非并行任务（少核心、强逻辑）；GPU 是"干重活的" —— 成千上万个核心，擅长并行矩阵运算。**AI 服务器是典型的异构计算平台。**' },
    { q: 'ECC 内存的 CE 和 UE 有什么区别？分别怎么处理？', a: '**CE 可纠正错误**（单比特，自动纠正并记录日志）：偶发可观察，频繁需关注；**UE 不可纠正错误**（多比特，无法纠正）：通常导致系统崩溃，**必须立即处理**（重插 → 交换法定位 → 更换内存条）。' },
    { q: 'RAID 5 和 RAID 10 的容量利用率、冗余能力、适用场景分别是什么？', a: 'RAID 5：容量 N−1、可坏 1 块、随机写有惩罚 → 通用存储/文件服务器；RAID 10：容量 50%、每组可坏 1 块、读写都快 → **数据库/高 IO 场景**。' },
    { q: '为什么 RAID 不是备份？', a: 'RAID 只防"硬盘硬件故障"，**防不了误删、病毒、火灾、勒索软件**。数据安全永远靠 **3-2-1 原则**（3 份数据、2 种介质、1 份异地）。' },
    { q: '硬 RAID 和软 RAID 有什么区别？', a: '硬 RAID 用独立 RAID 卡（带缓存和电池），性能好、不占 CPU、支持热插拔/在线重建，但成本高；软 RAID 用操作系统软件（`mdadm`），免费灵活但占 CPU、依赖系统。' },
    { q: '双电源为什么要接 A/B 两路 PDU？', a: '如果两个电源插在同一个 PDU 上，一旦该 PDU 断电，**冗余就形同虚设**。分接两路才能实现真正的供电冗余。' },
    { q: 'PCIe 通道数和代数如何影响 GPU 性能？', a: 'PCIe 是"高速公路"，**车道数（通道数）和限速（代数）决定带宽**。一张 GPU 插在 x8 插槽上带宽减半；8 卡服务器对通道需求极高，**通道不够会让 GPU 间、GPU 与网卡间通信成为瓶颈**。' },
    { q: 'BMC 是什么？它和 SSH 有什么区别？为什么说它是"保命通道"？', a: 'BMC 是主板上的独立芯片，**只要插着电就一直工作**，即使系统崩溃或关机也能远程访问。SSH 属于带内管理，系统一挂就断了。所以 BMC 是"不管系统死活都能连上服务器"的保命通道。' },
    { q: 'IPMI 和 Redfish 有什么区别？为什么现代运维更推荐 Redfish？', a: 'IPMI 是传统命令式协议（`ipmitool`），老但通用；Redfish 基于 **RESTful API + HTTPS + JSON**，易自动化 —— 能很方便地写脚本批量管理上千台服务器。' },
    { q: '固件升级为什么要"先升 BMC 再升 BIOS"？升级时要注意什么？', a: '因为 **BIOS 通常由 BMC 负责刷写**，BMC 版本太旧可能不支持新 BIOS 的刷新方式。注意事项：**绝对不能断电/重启 BMC**（会变砖）、升级前备份配置、固件版本必须与机型严格匹配、升 BIOS 需重启（业务中断需协调）。' },
    { q: '硬盘故障的排查步骤是什么？重建期间要注意什么？', a: '步骤：`smartctl -H` 看健康 → `dmesg` 看报错 → 查 RAID 状态 → 确认冗余还在 → 设为 Failed/Offline 后拔盘 → 换新盘触发重建。**重建期间避免高负载**（重建很吃 IO），且**若再坏一块盘 RAID 5 就会丢数据**。' },
    { q: '内存报错如何定位到具体内存条？', a: '① `dmesg | grep -i edac` 拿到内存控制器/通道/DIMM 信息；② `ipmitool sel list | grep -i mem` 看 BMC 告警；③ `dmidecode -t memory` 对照槽位；④ **交换法** —— 把疑似故障条换到别的槽位，看错误是否"跟着内存条走"。' },
    { q: 'SM、CUDA Core、Tensor Core 分别是什么？', a: '**SM** 是流式多处理器，GPU 的基本计算单元（H100 有 132 个）；**CUDA Core** 是 SM 内负责通用浮点/整数运算的流处理器；**Tensor Core** 专为矩阵乘加设计，**AI 算力指标主要看它**。' },
    { q: 'NVLink 和 NVSwitch 解决了什么问题？', a: '传统 GPU 间通信要经 PCIe，带宽有限且被共享。**NVLink** 让 GPU 直连（H100 约 900 GB/s）；**NVSwitch** 是交换芯片，让 8 张卡实现**无阻塞全互联**。解决的是大模型训练**频繁同步梯度的带宽瓶颈**。' },
    { q: 'A800/H800 和 A100/H100 的主要差异是什么？对运维有什么影响？', a: 'A800/H800/H20 是**互联带宽受限**的合规版本。单卡算力接近原版，但 **GPU 间/节点间互联带宽被限制**，因此**大规模多卡协同训练效率会受影响** —— 这是国内 AI 集群运维要特别理解的点。' },
    { q: '`nvidia-smi` 里的 CUDA Version 和 `nvcc -V` 有什么区别？', a: '`nvidia-smi` 显示的 CUDA Version 是**驱动支持的最高 CUDA 版本**；`nvcc -V` 显示的是**实际安装的 CUDA Toolkit 版本**。两者不是一回事。' },
    { q: 'Xid 79、94、95 分别代表什么？严重程度如何？', a: '**79 = GPU has fallen off the bus（掉卡）**，先重启，仍存在需报修；**94 = Contained ECC error（已隔离）**，记录观察；**95 = Uncontained ECC error（未隔离）**，**严重**，可能导致进程崩溃，需换卡。这三个都属于严重级别。' },
    { q: '显存 OOM 可能有哪些原因？', a: '① **模型太大**超出显存；② **显存泄漏**（进程未释放）；③ batch size 过大；④ 多个进程争抢同一张卡。解决：减小 batch size、用梯度累积、设显存上限、换更大显存卡，或排查代码泄漏。' }
  ],
  glossary: [
    { t: 'ECC', d: '内存纠错码，服务器必配。' },
    { t: 'CE / UE', d: '可纠正 / 不可纠正错误。' },
    { t: 'DIMM', d: '内存条，必须按手册规定顺序插。' },
    { t: 'NUMA', d: '非统一内存访问，跨节点访问慢。' },
    { t: 'PCH', d: '平台控制器中枢，主板南桥芯片。' },
    { t: 'PSU', d: '电源单元，普遍冗余配置。' },
    { t: 'NVMe', d: 'SSD 走 PCIe 的接口规范，3–7 GB/s。' },
    { t: 'SAS / SATA', d: '两种磁盘接口，SAS 面向企业级。' },
    { t: 'SMART', d: '硬盘健康监测技术，要定期巡检。' },
    { t: 'RAID', d: '磁盘冗余阵列，0/1/5/6/10 是主流级别。' },
    { t: '写惩罚', d: 'RAID 5/6 每次写要读旧数据+旧校验再写，随机写性能差。' },
    { t: 'BBU', d: 'RAID 卡缓存电池，失效会导致写策略降级、性能骤降。' },
    { t: 'HBA', d: '主机总线适配器，接磁盘。' },
    { t: '热插拔', d: '不断电插拔硬件（硬盘/电源/风扇）。' },
    { t: 'BMC', d: '基板管理控制器，带外管理芯片。' },
    { t: 'IPMI / Redfish', d: '传统命令式 / 现代 RESTful 带外管理协议。' },
    { t: 'SEL', d: '系统事件日志，硬件排查第一站。' },
    { t: 'FRU', d: '现场可更换单元。' },
    { t: '固件', d: '硬件里的底层软件（BIOS / BMC / CPLD）。' },
    { t: 'SM', d: '流式多处理器，GPU 基本计算单元。' },
    { t: 'CUDA Core', d: '流处理器，通用并行运算单元。' },
    { t: 'Tensor Core', d: '张量核心，加速矩阵运算，AI 算力核心。' },
    { t: 'CUDA', d: 'NVIDIA 并行计算平台与编程模型。' },
    { t: 'cuDNN', d: '深度神经网络加速库。' },
    { t: 'VRAM / HBM', d: '显存 / 高带宽内存（与 GPU 封装在一起，不可单独更换）。' },
    { t: 'NVLink / NVSwitch', d: 'GPU 间高速直连 / 全互联交换芯片。' },
    { t: 'HGX / SXM', d: 'NVIDIA 8 卡 GPU 主板平台 / GPU 模块化封装形态。' },
    { t: 'Xid', d: 'NVIDIA 驱动上报到内核日志的错误事件编号。' },
    { t: 'DCGM', d: 'Data Center GPU Manager，集群级 GPU 监控工具。' },
    { t: 'TFLOPS', d: '每秒万亿次浮点运算。' },
    { t: 'Persistence Mode', d: 'GPU 驱动常驻模式，生产建议开启。' },
    { t: '光模块 / 光口', d: '光电转换模块 / 光纤接口。' },
    { t: '综合布线', d: '线缆的规范连接与排布，讲究整齐可追溯。' }
  ]
});
