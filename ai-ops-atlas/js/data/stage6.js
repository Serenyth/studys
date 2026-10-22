(window.AIOPS_STAGES = window.AIOPS_STAGES || []).push({
  id: 's6', num: 6, title: 'AI 集群实战与求职冲刺', icon: 'rocket', accent: '#a3e635', weeks: '第 15–16 周',
  desc: '把前五个阶段的知识"串起来"，完成一次从部署到测试到监控的完整集群实战，并系统准备简历、面试题与职业规划。这一阶段的产出直接决定你能不能拿到 offer。',
  timeline: '先串起交付全流程，再动手搭一个 3 节点集群并做验收测试，然后设计故障演练、整理项目文档，最后打磨简历与面试表达。',
  tags: ['交付全流程', '验收测试', 'NCCL', 'AllReduce', '故障演练', '5 Why', 'STAR 法则', 'JD 匹配', '职业规划'],
  quote: '这套路径的价值不在"读完"，而在"做完"。能完整讲出 AI 集群交付全流程，你就超过了 80% 的应届生 —— 面试官最怕的是"只会敲命令，不知道整体流程"。',
  deliverables: [
    '一个跑通全流程的 3 节点 AI 集群（虚拟机 + 消费级卡也能跑通 90%）',
    '一份含 NCCL 测试数据的验收报告与性能基线',
    '一份 10 个场景的故障演练记录（现象 → 排查 → 根因 → 改进）',
    '一份匹配 JD 的简历 + 一套完整的项目文档（GitHub / 博客）'
  ],
  sections: [
    {
      id: 's6-delivery', chapter: '一、把知识串起来：AI 集群交付全流程', icon: 'rocket',
      chSub: '真实项目中，一个 AI 集群从无到有经过 12 个环节。能完整讲出这条链路，说明你有全局视角。',
      kind: 'viz', viz: 'delivery-pipeline', icon: 'rocket',
      title: 'AI 集群交付流水线',
      hint: '点击推进，看每个环节用到哪个阶段的技能',
      caption: '**面试价值**：能完整讲出这条链路，你就超过了 80% 的应届生。面试官最怕的是"只会敲命令，不知道整体流程"。'
    },
    {
      kind: 'table', title: '前五个阶段的知识分别用在哪', icon: 'grid',
      head: ['阶段', '技能', '在集群交付中的位置'],
      rows: [
        ['**阶段 0**', '认知与环境', '理解行业、搭建实验环境'],
        ['**阶段 1**', 'Linux 与 Shell', '系统安装、配置、脚本自动化（⑥⑦）'],
        ['**阶段 2**', '硬件与 GPU', '上架验收、硬件排障、GPU 环境（④⑤⑧⑪）'],
        ['**阶段 3**', '网络与高速互联', '网络规划、bonding、IB/RoCE（⑥⑦⑪）'],
        ['**阶段 4**', '容器与 K8s', '平台部署、GPU 调度（⑨）'],
        ['**阶段 5**', '自动化与监控', 'Ansible 批量管理、监控告警、日志（⑦⑩）']
      ],
      note: '**这张表就是你的"能力地图"** —— 面试时能这样表达，说明你具备全局视角，而不是零散知识点。'
    },
    {
      id: 's6-build', chapter: '二、实战：搭建一个 3 节点 AI 集群（第 15 周）', icon: 'server',
      chSub: '不是每个人都有真实 GPU 服务器。用虚拟机 + 一张消费级显卡（或云 GPU）也能跑通 90% 的流程 —— 重点是把流程走完、把文档写出来。',
      kind: 'table', title: '实验环境规划', icon: 'server',
      head: ['方案', '配置', '说明'],
      rows: [
        ['**方案 A（无 GPU）**', 'master 4C/8G/60G，node01/02 4C/8G/60G', '纯流程演练，跑通 90% 的步骤'],
        ['**方案 B（有 1 张 GPU）**', 'node01 挂载物理 GPU（或 PCI 直通）', '能实测 GPU 调度与监控'],
        ['**方案 C（云上）**', '买 1–2 台按量付费 GPU 云主机', '跑几小时做完测试就释放，成本可控']
      ],
      note: '**网络规划（练手版）**：管理网 `192.168.1.0/24`（master=101、node01=102、node02=103）；Pod 网 `10.244.0.0/16`（CNI）；Service 网 `10.96.0.0/12`。**Pod 网段与 Service 网段都不能和宿主机网段冲突**，这是 K8s 集群规划的基本要求。'
    },
    {
      kind: 'hflow', title: '七阶段部署顺序', icon: 'arrow',
      steps: [
        { t: '基础环境', d: '装 OS、统一主机名与静态 IP；配 NTP 时间同步；关 swap、设内核参数。' },
        { t: '存储与共享', d: 'LVM 建数据盘；NFS 做多节点共享存储。' },
        { t: '集群管理基础', d: 'SSH 免密、统一 hosts、Ansible 纳管。' },
        { t: 'GPU 环境', d: '驱动 + CUDA + Container Toolkit，验证容器能用 GPU。' },
        { t: '容器与 K8s', d: 'containerd + kubeadm 初始化集群 + CNI + GPU Device Plugin。' },
        { t: '监控与日志', d: 'Node Exporter + DCGM Exporter + Prometheus + Grafana + 告警 + 日志。' },
        { t: '测试与验收', d: 'GPU 健康、拓扑、P2P、NCCL、稳定性测试 + 交付文档。' }
      ]
    },
    {
      kind: 'code', title: '关键步骤命令（跨阶段技能串联）', icon: 'code', lang: 'bash', file: 'cluster-setup.sh',
      code: `# ① 基础环境（阶段 1）—— 时间同步是关键！
sudo timedatectl set-timezone Asia/Shanghai
sudo apt install -y chrony && sudo systemctl enable --now chrony
chronyc sources

# 关闭 swap（K8s 要求）
sudo swapoff -a && sudo sed -i '/swap/s/^/#/' /etc/fstab

# 内核参数
cat <<EOF | sudo tee /etc/sysctl.d/99-k8s.conf
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
EOF
sudo sysctl --system

# ② 存储（阶段 1）
sudo pvcreate /dev/sdb && sudo vgcreate vg_data /dev/sdb
sudo lvcreate -l 100%FREE -n lv_data vg_data
sudo mkfs.ext4 /dev/vg_data/lv_data && sudo mount /dev/vg_data/lv_data /data

# ③ GPU 环境（阶段 2）
nvidia-smi -L                          # ① 确认系统识别到 GPU
# ② 安装驱动 + CUDA，③ 安装 NVIDIA Container Toolkit
docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi

# ④ K8s（阶段 4）
kubeadm init --pod-network-cidr=10.244.0.0/16
kubectl apply -f <CNI 清单>
kubectl apply -f nvidia-device-plugin.yml

# ⑤ 监控（阶段 5）
# Node Exporter（所有节点）+ DCGM Exporter（GPU 节点）
# Prometheus + Grafana + 告警规则 + Alertmanager`,
      note: '**为什么时间同步这么重要**：节点时间不一致会导致**日志错乱、证书校验失败、K8s 节点异常**。这是上架后的第一件事。'
    },
    {
      id: 's6-accept', chapter: '三、集群测试与验收（重点）', icon: 'target',
      chSub: 'GPU 服务器很贵，交付前必须证明"它真的能跑满性能"。关键认知：**`nvidia-smi` 能看到卡 ≠ 验收通过**。',
      kind: 'viz', viz: 'accept-radar', icon: 'target',
      title: '验收能力雷达',
      hint: '逐项打分，看整体验收完成度',
      caption: '验收测试的价值：①发现隐藏的硬件/环境问题（某张卡异常、NVLink 降速）；②建立**性能基线**，后续可对比判断"是否变慢"；③给客户/团队一份**可量化、可追溯的交付证据**。'
    },
    {
      kind: 'code', title: 'GPU 健康检查与拓扑检查', icon: 'code', lang: 'bash', file: 'gpu-check.sh',
      code: `# 设备可见性
nvidia-smi -L

# 详细信息（温度、功耗、ECC）
nvidia-smi -q

# 健康状态（一条命令看关键字段）
nvidia-smi --query-gpu=index,name,temperature.gpu,power.draw,ecc.errors.uncorrected.volatile.total --format=csv

# 检查是否有 Xid 错误
dmesg -T | grep -i xid

# 拓扑检查（关键！）
nvidia-smi topo -m`,
      note: '**验收要点**：8 卡服务器应该是**全 NVLink 互联（NV#）**。如果出现大量 `SYS`，说明拓扑异常或卡插错位置。'
    },
    {
      kind: 'table', title: 'nvidia-smi topo -m 输出解读', icon: 'link',
      head: ['标识', '含义', '性能'],
      rows: [
        ['`NV#`', '通过 NVLink 连接', '**最好**'],
        ['`PIX`', '同一 PCIe 交换机下', '好'],
        ['`PXB`', '同一 PCIe 主机桥下', '中'],
        ['`PHB`', '同一 CPU 的 PCIe 主机桥', '一般'],
        ['`SYS`', '**跨 NUMA / 跨 CPU**', '**最差**']
      ]
    },
    {
      kind: 'viz', viz: 'ring-allreduce', icon: 'activity',
      title: 'NCCL AllReduce：Ring 算法',
      hint: '切换 Scatter-Reduce / All-Gather 两阶段',
      caption: '**AllReduce** 是分布式训练同步梯度的核心操作：所有 GPU 的数据汇总计算后再广播回每个 GPU。**NCCL** 是 NVIDIA 的集合通信库，分布式训练底层就靠它。'
    },
    {
      kind: 'code', title: 'NCCL 集合通信测试（核心）', icon: 'code', lang: 'bash', file: 'nccl-test.sh',
      code: `# ① 安装环境（驱动 + CUDA 就绪）
# ② 下载并编译 nccl-tests
git clone https://github.com/NVIDIA/nccl-tests.git
cd nccl-tests
make MPI=1 MPI_HOME=/usr/lib/x86_64-linux-gnu/openmpi    # 多机需 MPI

# ③ 单机 8 卡测试
./build/all_reduce_perf -b 8 -e 8G -f 2 -g 8

# ④ 多机测试（2 节点 × 8 卡）
mpirun -np 16 -H node01:8,node02:8 \\
  --allow-run-as-root -x LD_LIBRARY_PATH \\
  ./build/all_reduce_perf -b 8 -e 8G -f 2 -g 1

# P2P 带宽测试
./nvbandwidth -t device_to_device_memcpy_read_ce`,
      note: '**验收判断**：与理论带宽对比。比如 H100 的 NVLink 双向约 900 GB/s，8 卡 AllReduce 的 busbw 应达到相当量级；**如果远低于预期，说明互联有问题**。**测试一致性要求**：相同 GPU 型号、相同拓扑、相同 Driver/CUDA 版本、相同参数、相近空闲状态 —— 这样才能建立可复用的参考基线。'
    },
    {
      kind: 'table', title: 'NCCL 关键指标', icon: 'gauge',
      head: ['指标', '含义'],
      rows: [
        ['**algbw**（Algorithm Bandwidth）', '算法带宽，按数据量算出的有效带宽'],
        ['**busbw**（Bus Bandwidth）', '总线带宽，考虑通信算法的实际总线利用率'],
        ['**时间**', '完成一次操作耗时']
      ],
      note: '**扩展效率（Scaling Efficiency）**：多卡相对单卡的性能提升比例。理想情况 8 卡是 8 倍，实际受通信开销影响会打折。**扩展效率低说明通信是瓶颈** —— 这时要回头查网络与拓扑。'
    },
    {
      kind: 'flow', title: '稳定性测试', icon: 'shield',
      steps: [
        { t: 'GPU 压力测试', d: '`gpu-burn` 持续跑 30 分钟以上，观察温度、是否掉卡、是否降频。例：`docker run --rm --gpus all oguzpastirmaci/gpu-burn 300`。' },
        { t: '内存测试', d: '`memtester` 或厂商工具，验证内存无 ECC 错误。' },
        { t: '磁盘测试', d: '`fio` 测 IO 性能。' },
        { t: '长时间运行', d: '跑一个几小时的任务，观察是否稳定。' }
      ]
    },
    {
      kind: 'kv', title: '验收清单（14 项）', icon: 'check',
      items: [
        { k: '硬件核对', v: '型号、数量、SN 与清单一致' },
        { k: '部件识别', v: 'CPU、内存、磁盘、GPU、网卡全部识别' },
        { k: 'BMC 正常', v: '传感器、SEL 无异常告警' },
        { k: '固件版本', v: 'BIOS / BMC 为规定版本' },
        { k: '磁盘健康', v: 'SMART 无异常，RAID 正常' },
        { k: '内存健康', v: '无 ECC 错误' },
        { k: 'GPU 健康', v: '`nvidia-smi -q` 无异常，无 Xid 错误' },
        { k: '拓扑正确', v: '`nvidia-smi topo -m` 符合预期' },
        { k: 'P2P 测试', v: '带宽正常' },
        { k: 'NCCL 测试', v: 'AllReduce 带宽达标' },
        { k: '网络测试', v: '`ib_write_bw` / `iperf3` 带宽达标' },
        { k: '压力测试', v: 'gpu-burn 30 分钟稳定' },
        { k: '监控接入', v: '指标可见、告警正常' },
        { k: '文档齐全', v: '部署手册 + 验收报告' }
      ]
    },
    {
      id: 's6-drill', chapter: '四、故障演练（第 15 周）', icon: 'alert',
      chSub: '面试官最爱问"你处理过什么故障"。如果你能讲出"我主动设计并演练过 10 种故障，每种都有排查记录"，这比任何证书都有说服力。',
      kind: 'table', title: '10 个演练场景', icon: 'alert',
      head: ['编号', '场景', '模拟方式', '考察技能'],
      rows: [
        ['1', '网卡故障', '拔掉 / 禁用一张网卡', 'bonding 自动切换'],
        ['2', '磁盘满', '`dd` 写满磁盘', '定位大文件、清理'],
        ['3', '硬盘故障', '模拟坏盘（软 RAID 下）', 'RAID 重建'],
        ['4', '服务崩溃', '`kill` 关键进程', 'systemd 自愈'],
        ['5', 'Pod 崩溃', '制造 CrashLoopBackOff', 'K8s 排查四步法'],
        ['6', 'GPU 掉卡', '重载驱动 / 制造 Xid', 'GPU 排查'],
        ['7', '节点宕机', '关机一个节点', '集群自愈、Pod 漂移'],
        ['8', '时间漂移', '手动改时间', '发现时间同步问题'],
        ['9', '内存泄漏', '跑内存增长程序', 'OOMKilled 排查'],
        ['10', '网络不通', '改错 IP / 关网关', '分层排查']
      ]
    },
    {
      kind: 'flow', title: '演练流程', icon: 'refresh',
      steps: [
        { t: '设计场景', d: '明确"要模拟什么故障、验证什么能力"。' },
        { t: '记录基线', d: '记录故障前的正常状态（性能、日志、监控）。' },
        { t: '注入故障', d: '制造问题。' },
        { t: '观察现象', d: '通过监控 / 日志 / 命令行观察。' },
        { t: '定位与处理', d: '按排查方法论定位并恢复。' },
        { t: '记录全过程', d: '现象 → 排查 → 处理 → 结果。' },
        { t: '复盘改进', d: '根因是什么？如何预防？' }
      ]
    },
    {
      kind: 'viz', viz: 'five-why', icon: 'target',
      title: '5 Why 根因分析法',
      hint: '逐层追问，直到找到根因',
      caption: '**5 Why 分析法**：对一个问题连续问 5 次"为什么"，层层深入找到**根本原因**，而不是停在表面现象。复盘要点：**记录时间线 + 根因 + 改进措施 + 责任人** —— 这就是一份专业的事故报告。'
    },
    {
      id: 's6-doc', chapter: '五、项目文档与作品集', icon: 'book',
      chSub: '应届生最大的劣势是"没有工作经验"，最大的机会是"用项目证明能力"。一份完整的项目文档 = 你的能力证明。',
      kind: 'flow', title: '项目文档结构（推荐）', icon: 'book',
      steps: [
        { t: '01-项目背景与目标', d: '要解决什么问题、规模多大。' },
        { t: '02-方案设计', d: '硬件 / 网络 / 存储 / 软件选型及理由。' },
        { t: '03-环境规划', d: 'IP 规划、主机名、拓扑图。' },
        { t: '04-部署手册', d: '详细步骤（可复现，别人照着能做出来）。' },
        { t: '05-自动化脚本', d: 'Ansible Playbook、Shell 脚本。' },
        { t: '06-监控配置', d: 'Prometheus 规则、Grafana 面板。' },
        { t: '07-测试验收报告', d: 'NCCL 测试数据、对比基线。' },
        { t: '08-故障演练记录', d: '10 个场景的排查过程。' },
        { t: '09-问题与解决', d: '踩过的坑（**最有价值！**）。' },
        { t: 'README', d: '项目总览。' }
      ]
    },
    {
      kind: 'compare', title: '把项目写进简历：差 vs 好', icon: 'code',
      left: { title: '差的写法', items: ['"搭建了一个 Kubernetes 集群"', '"安装了 GPU 驱动"', '只有"做了"，没有"结果"', '看不出规模、看不出价值'] },
      right: { title: '好的写法', items: ['"基于 3 节点服务器（含 8×H100）完成 AI 算力集群交付"', '"NCCL 验证 8 卡 AllReduce 带宽达 XX GB/s（达理论值 XX%）"', '"搭建 Prometheus + DCGM 监控，实现 GPU 温度/显存/Xid 告警"', '"Ansible Playbook 将部署时间从 2 小时缩短至 20 分钟"'] }
    },
    {
      kind: 'callout', tone: 'key', title: '差距在哪：量化',
      html: '**具体型号、具体数据、具体价值** —— 这就是"量化"的威力。**"踩过的坑"最有价值**：面试官最想听的就是**你怎么解决问题**。把每个坑写清楚（现象 → 排查 → 根因 → 解决），就是最好的面试素材。'
    },
    {
      id: 's6-resume', chapter: '六、简历撰写（第 16 周）', icon: 'code',
      chSub: '原则：JD 提到的，简历里必须有；JD 强调的，简历里要突出。',
      kind: 'flow', title: '简历结构（应届生推荐）', icon: 'book',
      steps: [
        { t: '基本信息', d: '姓名、电话、邮箱、求职意向、GitHub / 博客。' },
        { t: '教育背景', d: '学校、专业、时间、GPA（好就写）、相关课程。' },
        { t: '专业技能', d: '★ 核心，按 JD 关键词组织，用"掌握程度 + 具体能力"表述。' },
        { t: '项目经验', d: '★ 核心，2–3 个，用 STAR + 量化。' },
        { t: '实习经历', d: '（有则写）' },
        { t: '证书 / 荣誉', d: '（有则写）' },
        { t: '自我评价', d: '简短，突出"动手能力 + 学习能力"。' }
      ]
    },
    {
      kind: 'table', title: '常见错误与改正', icon: 'alert',
      head: ['错误', '后果', '改正'],
      rows: [
        ['技能写得笼统', '看不出水平', '具体化 + 加程度词'],
        ['项目只有"做了"没有"结果"', '无说服力', '加量化数据'],
        ['堆砌技术名词', '面试一问就露馅', '只写真会的'],
        ['一份简历投所有岗位', '匹配度低', '针对 JD 定制'],
        ['格式花哨', '显得不专业', '简洁清晰'],
        ['有错别字', '印象分暴跌', '反复校对'],
        ['超过 1 页（应届）', '重点不突出', '控制在 1 页']
      ]
    },
    {
      kind: 'cards', title: '应届生的加分项', icon: 'target',
      items: [
        { icon: 'git', t: 'GitHub / 博客', d: '把项目文档、脚本放上去，**附链接**。' },
        { icon: 'eye', t: '动手证据', d: '截图、测试数据、监控面板截图。' },
        { icon: 'shield', t: '认证', d: 'RHCE、CKA（有则加分，非必需）。' },
        { icon: 'book', t: '对岗位的理解', d: '能讲清 AI 运维做什么、行业趋势。' }
      ]
    },
    {
      kind: 'callout', tone: 'warn', title: 'STAR 法则',
      html: '**S（Situation 背景）→ T（Task 任务）→ A（Action 行动）→ R（Result 结果）**。示例：**背景** —— 实验室新增 3 台 GPU 服务器（8×A100），需要搭建可调度、可监控的训练集群；**任务** —— 负责从硬件上架到平台交付的全流程部署，并建立监控告警体系；**行动** —— 上架布线 + BMC/RAID/系统安装、SSH 免密 + Ansible 批量管理、驱动/CUDA/Container Toolkit/K8s/GPU Operator、NCCL 验证带宽、Prometheus + DCGM 监控、10 个故障演练；**结果** —— 集群稳定运行、流程文档化、部署时间从 2 小时降至 20 分钟。**每个 bullet 都要有"具体做了什么 + 产生了什么价值"。**'
    },
    {
      id: 's6-interview', chapter: '七、面试准备（第 16 周）', icon: 'target',
      chSub: '答题模板：先讲思路（分层/分类）→ 再讲具体命令 → 最后讲如何验证。面试官要的是"思路"，不是"标准答案"。',
      kind: 'hflow', title: '面试流程与考察点', icon: 'arrow',
      steps: [
        { t: '一面 · 技术基础', d: 'Linux、网络、Shell、硬件基础。' },
        { t: '二面 · 技术深入', d: 'K8s、GPU、自动化、监控、项目深挖。' },
        { t: '三面 · 主管/HR', d: '项目经历、学习能力、职业规划、稳定性。' }
      ]
    },
    {
      kind: 'table', title: '不同层级的考察重点', icon: 'gauge',
      head: ['层级', '重点考察'],
      rows: [
        ['**初级运维**', 'Linux 命令、网络基础、Shell 脚本、Nginx 配置'],
        ['**中级运维**', 'K8s 原理与排错、CI/CD、Prometheus 监控、高可用、故障排查思路'],
        ['**高级 / SRE**', '架构设计、大规模集群管理、成本优化、自动化平台建设']
      ]
    },
    {
      kind: 'terms', title: '高频面试题分布（40 题）', icon: 'book',
      items: [
        { t: 'Linux 基础（6 题）', d: '查看 CPU/内存/磁盘/网络；文件删了磁盘没释放；系统负载高排查；`df` 有空间写不进；软硬链接区别；查找进程占用的文件。' },
        { t: '网络（5 题）', d: '三次握手四次挥手；ping IP 通域名不通；服务器 ping 不通排查思路；TIME_WAIT 过多；判断是否同网段。' },
        { t: '硬件与 GPU（9 题）', d: '服务器部件；RAID 0/1/5/10 选型；内存 ECC 排查；BMC 用法；装驱动与 CUDA；nvidia-smi 字段；GPU 掉卡与 Xid 79；NVLink vs PCIe；A800/H800 合规版。' },
        { t: '容器与 K8s（9 题）', d: '容器 vs 虚拟机；镜像分层与 COW；K8s 核心组件；Pod 创建流程；Pending 排查；CrashLoopBackOff / OOMKilled；GPU 接入 K8s；GPU Operator；requests vs limits。' },
        { t: '自动化与监控（6 题）', d: 'Ansible 无 Agent；Playbook/Role/Handler；Pull vs Push；设计监控告警体系；告警太多怎么办；四大黄金指标。' },
        { t: '场景题（5 题 · 最重要）', d: '客户说服务器连不上；训练任务突然中断；GPU 报 ECC 错误；磁盘空间告警；从零交付 8 卡服务器。' }
      ]
    },
    {
      kind: 'cards', title: '技术问答五技巧', icon: 'target',
      items: [
        { icon: 'layers', t: '结构化表达', d: '分点回答，"第一…第二…第三…"。' },
        { icon: 'grid', t: '先框架后细节', d: '先说整体思路，再补充细节。' },
        { icon: 'shield', t: '不会就承认', d: '说"这块我了解不深，我的理解是…，如果有误请指正" —— **比胡编强 100 倍**。' },
        { icon: 'link', t: '结合项目', d: '答完知识点，补一句"我在项目里遇到过类似情况…"。' },
        { icon: 'bolt', t: '主动展示思考', d: '如"我判断这里可能有两种原因…"。' }
      ]
    },
    {
      kind: 'flow', title: '项目讲述：3 分钟结构', icon: 'clock',
      steps: [
        { t: '项目背景（30 秒）', d: '为什么做、规模多大。' },
        { t: '我负责什么（30 秒）', d: '明确个人贡献，不要只说"我们"。' },
        { t: '关键动作（60 秒）', d: '2–3 个技术亮点。' },
        { t: '结果与收获（30 秒）', d: '量化成果 + 学到什么。' },
        { t: '遇到的坑（30 秒）', d: '**最能体现能力** —— 面试官往往顺着这里深挖。' }
      ],
      note: '**准备一个 3 分钟版本 + 一个 10 分钟版本**。模拟面试：找同学互相提问，或对着镜子/录音自己讲；把 40 道高频题全部口头答一遍，卡壳的记下来重练。**反问环节**可问：团队目前 AI 集群的规模和主要技术栈？这个岗位最有挑战的部分？团队对新人前 3 个月的期望？**不要问**：薪资福利（HR 环节再问）、加班多不多（负面）。'
    },
    {
      id: 's6-career', chapter: '八、职业规划', icon: 'rocket',
      chSub: 'AI 运维的独特优势：踩在算力风口上。AI 基础设施是当前最热的投入方向之一，经验积累的溢价很高。',
      kind: 'table', title: '入职前 3 个月的目标', icon: 'clock',
      head: ['目标', '做法'],
      rows: [
        ['**熟悉环境**', '摸清团队的技术栈、流程、规范'],
        ['**跟现场**', '多跟着前辈去机房，**动手看、动手做**'],
        ['**记笔记**', '每次故障都记录（现象 → 排查 → 解决）'],
        ['**补齐短板**', '工作中发现不会的，当天查明白'],
        ['**建立信任**', '小事做到位，让团队放心交给你活']
      ]
    },
    {
      kind: 'hflow', title: '1–3 年成长路径', icon: 'arrow',
      steps: [
        { t: '第 1 年', d: '能独立完成节点部署、日常巡检、常见故障处理。' },
        { t: '第 2 年', d: '能独立负责集群交付，掌握自动化与监控体系。' },
        { t: '第 3 年', d: '能优化集群性能、参与架构设计、带新人。' }
      ]
    },
    {
      kind: 'table', title: '3–5 年发展方向', icon: 'target',
      head: ['方向', '说明'],
      rows: [
        ['**技术专家线**', 'GPU / 集群性能优化专家、SRE'],
        ['**平台 / 架构线**', '运维架构师、AI 平台工程师'],
        ['**DevOps 线**', 'DevOps 工程师、云原生专家'],
        ['**管理线**', '技术经理、运维总监']
      ],
      note: '**关键动作**：深入一个方向（GPU 排障 / K8s 运维 / 自动化平台）；积累"别人不会"的技能（如 IB 网络调优、GPU 性能分析）；从"执行者"变"解决者" —— 不只按流程做，还能发现问题、提出改进。'
    },
    {
      kind: 'table', title: '认证建议', icon: 'shield',
      head: ['认证', '方向', '价值'],
      rows: [
        ['**RHCE**', 'Linux', 'Linux 方向硬通货'],
        ['**CKA / CKS**', 'K8s', '云原生方向权威'],
        ['**NVIDIA 认证**', 'AI 基础设施', 'AI 方向背书']
      ],
      note: '**应届生建议：项目 > 认证**。有精力再考，别为了证书耽误动手。**持续学习**：关注行业（AI 算力、液冷、高速互联、国产化）；动手不停（新工具先搭环境试试）；输出倒逼输入（写博客、做分享）；建立知识库；保持好奇 —— **运维的天花板，取决于你解决问题的深度**。'
    },
    {
      kind: 'callout', tone: 'key', title: '最后一句',
      html: '这套路径的价值不在"读完"，而在"做完"。**每完成一项动手任务，你就离 offer 近一步。** 能把这五个综合场景题讲清楚，你就准备好了：①客户交付 8 卡 H100 服务器，完整验收流程是什么？②训练集群突然大规模任务失败，排查顺序是什么？③一张 GPU 反复报 Xid 79，如何处理？④把 50 台服务器从手工管理改造成自动化管理，怎么做？⑤如何设计一套 GPU 集群的监控告警体系？'
    }
  ],
  checklist: [
    {
      t: '全路径能力自测 · 阶段 0–2',
      items: [
        '能讲清 AI 基础设施是什么、AI 数据中心与传统数据中心的区别',
        '能解释 PUE、机柜 U 单位、BMC 带外管理',
        '能独立搭建虚拟机并配置 SSH 免密',
        '能讲清 FHS 目录结构、权限机制、umask',
        '能排查"磁盘满""服务起不来""CPU 高"等常见问题',
        '能写 Shell 脚本完成自动化任务',
        '能讲清服务器八大部件与 RAID 各级别',
        '能通过 BMC/SEL 定位硬件故障',
        '能安装驱动/CUDA 并用 `nvidia-smi` 排障',
        '能解释 Xid 错误码、NVLink、HBM'
      ]
    },
    {
      t: '全路径能力自测 · 阶段 3–5',
      items: [
        '能讲清 TCP/IP 分层、三次握手',
        '能完成子网划分计算',
        '能配置 bonding、排查网络故障',
        '能解释 IB vs RoCE、Spine-Leaf 架构',
        '能讲清容器原理（Namespace + Cgroups）',
        '能讲清 K8s 架构与 Pod 创建流程',
        '能用 kubectl 排查 Pod 异常',
        '能解释 GPU 如何接入 K8s',
        '能写 Ansible Playbook 批量管理节点',
        '能搭建 Prometheus + Grafana + 告警',
        '能设计监控指标体系',
        '能搭建 ELK 检索日志'
      ]
    },
    {
      t: '第 15–16 周 · 实战与求职',
      items: [
        '搭起一个 3 节点集群并跑通七阶段部署',
        '完成 GPU 健康、拓扑、P2P、NCCL 测试并记录数据',
        '设计并执行 10 个故障演练场景，写出复盘报告',
        '整理一份完整的项目文档（9 个文件 + README）',
        '针对目标 JD 定制一份 1 页简历（含量化项目）',
        '把 40 道高频面试题全部口头答一遍',
        '准备 3 分钟与 10 分钟两个版本的项目讲述'
      ]
    }
  ],
  quiz: [
    { q: '客户交付 8 卡 H100 服务器，你的完整验收流程是什么？', a: '①硬件核对（型号/数量/SN 与清单一致）；②部件识别（CPU、内存、磁盘、GPU、网卡）；③BMC 与 SEL 检查；④固件版本核对；⑤磁盘 SMART 与 RAID 状态；⑥内存 ECC 检查；⑦GPU 健康（nvidia-smi -q、dmesg 查 Xid）；⑧拓扑检查（nvidia-smi topo -m 应为全 NV#）；⑨P2P 带宽测试；⑩NCCL AllReduce 测试并与理论带宽对比；⑪网络带宽测试（ib_write_bw / iperf3）；⑫gpu-burn 稳定性测试 30 分钟；⑬监控接入验证；⑭输出部署手册与验收报告。' },
    { q: '训练集群突然大规模任务失败，你的排查顺序是什么？', a: '①先看范围：是单个节点、单张卡还是全集群（决定是硬件问题还是共性问题）；②看监控：GPU 温度/利用率/显存、节点资源、网络错包、Xid 与 ECC 告警；③查日志：dmesg 查 Xid、K8s 事件、训练框架日志；④查网络：IB/RoCE 链路状态、NCCL 通信是否超时（通信瓶颈常导致批量失败）；⑤查时间同步（时间漂移会导致证书与调度异常）；⑥定位后隔离故障节点/卡，恢复任务并复盘根因。' },
    { q: '集群里一张 GPU 反复报 Xid 79，如何处理？', a: 'Xid 79 表示 GPU 从总线上掉卡（fell off the bus）。处理：①先记录并核对 dmesg 时间线；②尝试重置：`nvidia-smi --gpu-reset` 或重载驱动（可能需重启节点）；③若反复出现，检查供电、PCIe 插槽、散热与固件版本；④单卡可先隔离（cordoning 节点 / 打标签避开），保障其他卡继续训练；⑤确认硬件故障后走 RMA 换卡；⑥复盘：是否散热不足、供电不稳、固件过旧，并补充监控告警规则。' },
    { q: '让你把 50 台服务器从"手工管理"改造成"自动化管理"，你会怎么做？', a: '①先做现状梳理与标准化（统一 OS、主机名、IP、时间同步）；②打通 SSH 免密与统一 hosts；③用 Ansible Inventory 分组纳管，先跑 ad-hoc 验证连通性；④把重复操作（装软件、改配置、巡检）写成 Playbook，逐步改造成 Role；⑤用 template + 变量做差异化配置；⑥敏感信息用 Vault 加密；⑦接入监控告警（Node Exporter + Prometheus + Alertmanager）；⑧建立变更流程与配置基线，定期用 --check 检测配置漂移。' },
    { q: '如何设计一套 GPU 集群的监控告警体系？', a: '①分层设计：硬件层（温度/风扇/电源/GPU）、主机层（CPU/内存/磁盘/网络）、网络层（IB/RoCE 链路、带宽、错包）、平台层（K8s Pod/节点/GPU 分配率）、任务层（训练任务状态与进度）；②采集：Node Exporter + DCGM Exporter + kube-state-metrics；③存储与可视化：Prometheus + Grafana（导入 Node Exporter Full 与 DCGM 面板）；④告警规则：GPU 温度 > 85°C、利用率长期为 0、Xid/ECC DBE、显存接近上限，用 for 过滤抖动；⑤Alertmanager 做路由/分组/抑制/静默，分级通知；⑥定期复盘告警，删无效、调阈值，避免告警疲劳。' },
    { q: 'AI 集群交付全流程有哪 12 个环节？', a: '①需求评估；②方案设计；③硬件采购；④到货验收；⑤上架部署；⑥系统安装；⑦集群基础（SSH 免密、hostname、hosts、NTP）；⑧GPU 环境（驱动、CUDA、容器运行时）；⑨平台部署（Docker/K8s/GPU Operator）；⑩监控日志；⑪测试验收；⑫交付文档。' },
    { q: '为什么"nvidia-smi 能看到卡"不等于验收通过？', a: 'nvidia-smi 只能确认"设备可见"，说明驱动能识别 GPU，但不能证明卡与卡之间的数据通路正常、也不能证明性能达标。必须继续做拓扑检查、P2P 带宽测试、NCCL 集合通信测试与稳定性测试，并与理论带宽对比，才能证明"它真的能跑满性能"。' },
    { q: 'NCCL 测试中的 algbw 和 busbw 有什么区别？', a: 'algbw（算法带宽）是按数据量算出的有效带宽，反映应用视角的吞吐；busbw（总线带宽）考虑了通信算法的实际总线利用率，更能反映硬件互联的真实能力，常用于与理论带宽对比判断互联是否正常。' },
    { q: '什么是扩展效率？它低说明什么？', a: '扩展效率是多卡相对单卡的性能提升比例。理想情况 8 卡是 8 倍，实际受通信开销影响会打折。扩展效率低说明通信成为瓶颈，应回头检查网络（IB/RoCE 链路与错包）、GPU 拓扑（是否大量 SYS）以及集合通信配置。' },
    { q: 'nvidia-smi topo -m 里 NV# / PIX / PHB / SYS 分别代表什么？', a: 'NV# 表示通过 NVLink 连接（最好）；PIX 表示同一 PCIe 交换机下（好）；PXB 表示同一 PCIe 主机桥下（中）；PHB 表示同一 CPU 的 PCIe 主机桥（一般）；SYS 表示跨 NUMA/跨 CPU（最差）。8 卡服务器应为全 NVLink 互联，出现大量 SYS 说明拓扑异常或卡插错位置。' },
    { q: '5 Why 分析法是什么？举个例子。', a: '对一个问题连续问 5 次"为什么"，层层深入找到根本原因。例：训练任务中断 → 因为 Pod 被驱逐 → 因为节点内存不足 → 因为进程内存泄漏 → 因为监控没配内存增长告警 → 因为监控规则不完整。根因：监控规则缺失 + 应用内存泄漏；改进：补告警 + 反馈开发修泄漏。' },
    { q: '故障演练为什么对求职有价值？', a: '面试官最爱问"你处理过什么故障"。能讲出"我主动设计并演练过 10 种故障，每种都有现象→排查→根因→改进的完整记录"，证明你具备实战思维和排查方法论，比任何证书都有说服力，也是项目讲述里最能体现能力的部分。' },
    { q: '简历里项目经验怎么写才有说服力？', a: '用 STAR 法则（背景/任务/行动/结果）+ 量化。差的写法"搭建了一个 K8s 集群，安装了 GPU 驱动"；好的写法要给出**具体型号、具体数据、具体价值**，如"8×H100 集群交付，NCCL 验证 8 卡 AllReduce 带宽达 XX GB/s（达理论值 XX%），Ansible 将部署时间从 2 小时缩短至 20 分钟"。' },
    { q: '面试答题的推荐模板是什么？', a: '先讲思路（分层/分类，如网络问题按物理→链路→网络→传输→应用分层）→ 再讲具体命令（用什么工具怎么查）→ 最后讲如何验证（怎么确认问题解决）。面试官要的是"思路"，不是"标准答案"。另：结构化表达、先框架后细节、不会就承认、结合项目、主动展示思考。' },
    { q: 'AI 运维的职业发展方向有哪些？', a: '①技术专家线：GPU/集群性能优化专家、SRE；②平台/架构线：运维架构师、AI 平台工程师；③DevOps 线：DevOps 工程师、云原生专家；④管理线：技术经理、运维总监。核心动作：深入一个方向、积累"别人不会"的技能、从"执行者"变"解决者"。' },
    { q: '应届生应该优先考认证还是做项目？', a: '**项目 > 认证**。RHCE（Linux）、CKA/CKS（K8s）、NVIDIA 认证（AI 基础设施）都有价值，但有精力再考，别为了证书耽误动手。把项目文档、脚本放到 GitHub/博客并附链接，加上截图与测试数据，比证书更能证明能力。' }
  ],
  glossary: [
    { t: '交付', d: 'Delivery，把集群部署好并交给客户。' },
    { t: '验收', d: 'Acceptance，验证集群是否达标。' },
    { t: '基线', d: 'Baseline，性能参考标准，用于后续对比判断"是否变慢"。' },
    { t: 'P2P', d: 'Peer-to-Peer，GPU 点对点直接传输数据的能力。' },
    { t: 'NCCL', d: 'NVIDIA Collective Communications Library，集合通信库。' },
    { t: 'AllReduce', d: '集合通信操作，所有 GPU 汇总计算后再广播回各自，同步梯度的核心。' },
    { t: 'Ring AllReduce', d: '环形 AllReduce 算法，分 Scatter-Reduce 与 All-Gather 两阶段。' },
    { t: 'algbw', d: 'Algorithm Bandwidth，算法带宽。' },
    { t: 'busbw', d: 'Bus Bandwidth，总线带宽。' },
    { t: '扩展效率', d: 'Scaling Efficiency，多卡相对单卡的性能提升比。' },
    { t: 'gpu-burn', d: 'GPU 压力测试工具。' },
    { t: 'fio', d: 'Flexible I/O Tester，磁盘 IO 测试工具。' },
    { t: 'iperf3', d: '网络带宽测试工具。' },
    { t: 'nvbandwidth', d: 'NVIDIA 带宽测试工具。' },
    { t: 'NV# / PIX / PHB / SYS', d: 'nvidia-smi topo 的互联类型，NV# 最好，SYS 最差。' },
    { t: 'Pod 网段', d: 'CNI 给 Pod 分配的 IP 段，不能与宿主机网段冲突。' },
    { t: 'Service 网段', d: 'Service 的虚拟 IP 段，仅集群内可见。' },
    { t: 'chrony', d: 'NTP 时间同步实现，集群上架后第一件事。' },
    { t: 'JD', d: 'Job Description，岗位描述，简历关键词的来源。' },
    { t: 'STAR', d: 'Situation/Task/Action/Result，结构化描述经历的方法。' },
    { t: '量化', d: 'Quantification，用具体数据说明成果。' },
    { t: '匹配度', d: '简历与岗位要求的契合程度。' },
    { t: '5 Why', d: '连续追问找根因的方法。' },
    { t: '复盘', d: 'Retrospective，事后总结改进。' },
    { t: '模拟面试', d: 'Mock Interview，提前演练面试。' },
    { t: 'RHCE', d: '红帽认证工程师，Linux 方向硬通货。' },
    { t: 'CKA / CKS', d: 'K8s 管理员 / 安全专家认证，云原生方向权威。' },
    { t: 'SRE', d: 'Site Reliability Engineer，站点可靠性工程师。' }
  ]
});
