(window.AIOPS_STAGES = window.AIOPS_STAGES || []).push({
  id: 's3', num: 3, title: '网络与高速互联', icon: 'network', accent: '#60a5fa', weeks: '第 8–9 周',
  desc: 'AI 集群的"血管"。从 OSI 分层到子网划分，从 tcpdump 抓包到 RDMA/IB/RoCE 无损网络，这一阶段决定你能不能扛住"网络排障"这类高频面试题。',
  timeline: '先建立分层思维（每层查什么），再吃透 IP/子网计算，然后掌握排查方法论，最后进入 AI 集群专属的 RDMA 与 Spine-Leaf。',
  tags: ['OSI/TCP-IP', '三次握手', '子网划分', 'CIDR', 'bonding', 'tcpdump', 'VLAN/Trunk', 'RDMA', 'IB/RoCE', 'Spine-Leaf'],
  quote: '网络是 AI 集群的血管。GPU 再快，网络跟不上就是一堆废铁 —— 大模型训练时成千上万张卡每秒同步无数次梯度，微秒级延迟与零丢包，是训练能否跑满的生死线。',
  deliverables: [
    '一份"分层排查"心法笔记（从物理层到应用层逐层查什么）',
    '一份子网划分计算练习（至少 8 道，能手算）',
    '一份网络排查案例集（8 个场景：现象 / 思路 / 结论）',
    '一份 IB vs RoCE 对比表 + 所在环境的网络分区图'
  ],
  sections: [
    {
      id: 's3-layers', chapter: '一、网络分层：从 OSI 到 TCP/IP', icon: 'grid',
      chSub: '排查网络问题的核心思路就是分层 —— 物理层通不通？链路层通不通？逐层往上查，哪一层断了问题就在哪。',
      kind: 'table', title: 'OSI 七层模型', icon: 'layers',
      tag: '理论标准答案',
      head: ['层', '名称', '核心职责', '典型协议', '数据单元', '典型设备'],
      rows: [
        ['7', '**应用层**', '为应用提供网络服务接口', 'HTTP、FTP、SMTP、DNS、SSH', '数据', '—'],
        ['6', '**表示层**', '数据格式转换、加密、压缩', 'TLS/SSL、JPEG、ASCII', '数据', '—'],
        ['5', '**会话层**', '建立、管理、终止会话', 'RPC、NetBIOS', '数据', '—'],
        ['4', '**传输层**', '端到端可靠传输、端口寻址', '**TCP、UDP**', '段 Segment', '—'],
        ['3', '**网络层**', '逻辑寻址与路由选择', '**IP、ICMP、ARP**', '包 Packet', '**路由器**'],
        ['2', '**数据链路层**', '物理寻址（MAC）、差错检测', 'Ethernet、VLAN、STP', '帧 Frame', '**交换机、网卡**'],
        ['1', '**物理层**', '传输比特流（电/光信号）', '—', '比特 Bit', '网线、光纤、中继器']
      ],
      note: '记忆口诀（从下往上）：**物 数 网 传 会 表 应**。行业黑话：二层设备=交换机（靠 MAC 转发）、三层设备=路由器（靠 IP 转发）、四层负载均衡=按 IP+端口转发（LVS）、七层负载均衡=看懂 HTTP 内容再转发（Nginx）。'
    },
    {
      id: 's3-tcpip', chapter: '二、数据封装与解封装', icon: 'layers',
      chSub: '发送时自上而下逐层加头部（封装），接收时自下而上逐层拆头部（解封装）。',
      kind: 'viz', viz: 'packet-encap', icon: 'layers',
      title: '数据封装流水线',
      hint: '点击发送，看头部一层层加上去',
      caption: '知道"每一层加了什么头"，就能理解为什么 tcpdump 能看到 IP 头、TCP 头、HTTP 内容 —— **层层剥开，定位问题在哪一层**。'
    },
    {
      id: 's3-ip', chapter: '三、TCP/IP 核心协议', icon: 'network',
      chSub: '第 8 周主线。IP 负责寻址与路由（尽力而为），TCP 负责可靠性（确认/重传/排序），UDP 负责快。',
      kind: 'table', title: 'IP 头部关键字段', icon: 'network',
      head: ['字段', '含义'],
      rows: [
        ['源/目的 IP', '谁发的、发给谁'],
        ['**TTL**', '生存时间，每过一个路由器减 1，减到 0 丢弃（防止无限循环）'],
        ['协议号', '上层是什么协议（TCP=6，UDP=17，ICMP=1）'],
        ['分片信息', '大包如何拆分']
      ],
      note: '**TTL 的妙用**：`traceroute` 故意发 TTL=1、2、3… 的包，让沿途每个路由器各回一个"超时"报文，从而探测路径上的每一跳。'
    },
    {
      id: 's3-handshake', chapter: '四、三次握手与四次挥手', icon: 'link',
      chSub: '建立连接要三次（双向确认发送与接收都正常），断开连接要四次（全双工，两个方向分别关闭）。',
      kind: 'viz', viz: 'handshake', icon: 'link',
      title: 'TCP 握手 / 挥手时序',
      hint: '切换 握手 / 挥手 两种模式',
      caption: '`ss -ant` 里看到的 `TIME_WAIT`、`CLOSE_WAIT`、`SYN_RECV` 就是这两个过程的不同阶段。**大量 TIME_WAIT = 短连接多；大量 CLOSE_WAIT = 程序没正确关闭连接**。'
    },
    {
      id: 's3-tcpudp', chapter: '五、TCP vs UDP 与常见端口', icon: 'cable',
      chSub: '可靠与快，是一对永恒的取舍。',
      kind: 'compare', title: 'TCP / UDP 对照', icon: 'cable',
      left: { title: 'TCP（可靠优先）', items: ['面向连接（三次握手）', '可靠：确认 + 重传', '保证顺序', '较慢，开销大', '头部 20 字节起', 'HTTP、SSH、FTP、数据库'] },
      right: { title: 'UDP（速度优先）', items: ['无连接', '不可靠：尽力而为', '不保证顺序', '快，开销小', '头部 8 字节', 'DNS、DHCP、视频流、**RoCE v2**'] }
    },
    {
      kind: 'table', title: '必须记住的端口', icon: 'grid',
      head: ['端口', '服务', '端口', '服务'],
      rows: [
        ['22', 'SSH', '443', 'HTTPS'],
        ['80', 'HTTP', '3306', 'MySQL'],
        ['53', 'DNS', '6379', 'Redis'],
        ['67/68', 'DHCP', '6443', '**K8s API Server**'],
        ['123', 'NTP（时间同步）', '4791', '**RoCE v2**']
      ],
      note: '**运维提示｜时间同步**：NTP（123）对集群极其重要。节点时间不同步会导致日志错乱、证书校验失败、K8s 节点异常 —— 上架后第一件事就是配 NTP。'
    },
    {
      kind: 'cards', title: '网络层的三个"配角"', icon: 'shield',
      items: [
        { icon: 'activity', t: 'ICMP', d: '控制与差错报告协议。`ping` 发 Echo Request、收 Echo Reply。**很多服务器禁 ICMP，所以"ping 不通"不代表服务挂了**。' },
        { icon: 'link', t: 'ARP', d: '同一局域网内把 IP 解析成 MAC。查看：`ip neigh`。**ARP 表异常（MAC 冲突、ARP 欺骗）是局域网故障的常见原因**。' },
        { icon: 'book', t: 'DNS', d: '域名 → IP 的"互联网电话簿"。解析顺序：`/etc/hosts` → 本地缓存 → `resolv.conf` 里的 DNS → 递归查询。' }
      ]
    },
    {
      kind: 'flow', title: 'DNS 解析顺序（Linux）', icon: 'book',
      steps: [
        { t: '查本地 hosts 文件', d: '`/etc/hosts` —— 优先级最高，排查时先看这里有没有被人写过。' },
        { t: '查本地 DNS 缓存', d: 'systemd-resolved / nscd 等缓存服务。' },
        { t: '查 resolv.conf 配置的 DNS', d: '`cat /etc/resolv.conf` 看用的是哪个 DNS 服务器。' },
        { t: 'DNS 服务器递归查询', d: '根域名 → 顶级域 → 权威域名，逐级问下去。' }
      ]
    },
    {
      id: 's3-subnet', chapter: '六、IP 地址与子网划分（重点）', icon: 'target',
      chSub: '面试与现场排障的高频考点。IPv4 是 32 位，由"网络号 + 主机号"组成，靠子网掩码划分。',
      kind: 'table', title: '传统地址分类', icon: 'grid',
      head: ['类别', '首字节范围', '默认掩码', '用途'],
      rows: [
        ['A 类', '1–126', '/8', '超大型网络'],
        ['B 类', '128–191', '/16', '中型网络'],
        ['C 类', '192–223', '/24', '小型网络'],
        ['D 类', '224–239', '—', '组播'],
        ['E 类', '240–255', '—', '保留']
      ]
    },
    {
      kind: 'table', title: '私有地址段（RFC 1918）与特殊地址', icon: 'lock',
      head: ['地址段 / 地址', 'CIDR', '说明'],
      rows: [
        ['10.0.0.0 – 10.255.255.255', '10.0.0.0/8', '约 1677 万可用主机'],
        ['172.16.0.0 – 172.31.255.255', '172.16.0.0/12', '约 104 万可用主机'],
        ['192.168.0.0 – 192.168.255.255', '192.168.0.0/16', '约 6.5 万可用主机'],
        ['`127.0.0.0/8`', '—', '回环地址（本机）'],
        ['`169.254.0.0/16`', '—', '链路本地地址，**DHCP 失败时自动分配 —— 看到它基本说明没拿到 IP**'],
        ['`0.0.0.0`', '—', '本机所有地址 / 默认路由'],
        ['`255.255.255.255`', '—', '广播地址']
      ]
    },
    {
      kind: 'table', title: '子网掩码速查', icon: 'target',
      head: ['CIDR', '子网掩码', '可用主机数', 'CIDR', '子网掩码', '可用主机数'],
      rows: [
        ['/24', '255.255.255.0', '254', '/27', '255.255.255.224', '30'],
        ['/25', '255.255.255.128', '126', '/28', '255.255.255.240', '14'],
        ['/26', '255.255.255.192', '62', '/16', '255.255.0.0', '65534']
      ],
      note: '为什么是"可用主机数"而不是总数？每个子网有两个地址不能用：**网络地址**（主机位全 0，代表网段本身）和**广播地址**（主机位全 1，用于广播）。所以 /24 的 256 个地址里，可用 254 个。'
    },
    {
      kind: 'code', title: '子网划分计算（核心公式）', icon: 'code', lang: 'bash', file: 'subnet.txt',
      code: `# 核心公式
#   借用 n 位主机位做子网  →  子网数 = 2^n
#   剩余 h 位主机位        →  每个子网可用主机数 = 2^h - 2

# 例题：把 192.168.1.0/24 划分为 4 个子网
#   需要 4 个子网 → 2^n >= 4 → n = 2（借 2 位）
#   新前缀 = 24 + 2 = 26 → /26
#   每个子网可用主机 = 2^(32-26) - 2 = 2^6 - 2 = 62

# 子网 1：192.168.1.0/26      可用 192.168.1.1   - 192.168.1.62
# 子网 2：192.168.1.64/26     可用 192.168.1.65  - 192.168.1.126
# 子网 3：192.168.1.128/26    可用 192.168.1.129 - 192.168.1.190
# 子网 4：192.168.1.192/26    可用 192.168.1.193 - 192.168.1.254`,
      note: '**CIDR**（无类别域间路由）用 `IP/前缀长度` 表示网段，打破了 A/B/C 类限制，划分更灵活、更省地址，还支持**路由聚合**（多条网段合成一条路由，减小路由表）。**VLSM** 则允许同一网络里用不同长度的掩码，按需分配。'
    },
    {
      kind: 'viz', viz: 'subnet-lab', icon: 'target',
      title: '子网计算器实验室',
      hint: '拖动前缀长度，实时看网段拆分',
      caption: '**运维价值**：跨子网通信要经过网关，同子网直接通信。所以"同网段两台机器不通"往往是**二层问题**（网线/交换机/VLAN），"跨网段不通"往往是**三层问题**（网关/路由）。'
    },
    {
      id: 's3-nic', chapter: '七、服务器网卡配置', icon: 'cable',
      chSub: '生产服务器几乎必配 bonding —— 冗余 + 带宽叠加，是硬件运维的基本功。',
      kind: 'table', title: '网卡命名规则', icon: 'cable',
      head: ['名字', '含义'],
      rows: [
        ['`eth0` / `eth1`', '传统命名'],
        ['`ens33` / `eno1`', '现代可预测命名（基于 BIOS/PCI 位置）'],
        ['`enp3s0`', '基于 PCI 插槽位置'],
        ['`bond0`', '绑定后的逻辑网卡'],
        ['`eth0.100`', 'VLAN 子接口'],
        ['`br0` / `lo`', '网桥 / 回环']
      ],
      note: '现代 Linux 不再用 `eth0/eth1`（可能因硬件顺序变化而改名），改用基于**物理位置**的名字。**排查时如果发现网卡名不是预期的，先确认是不是换了插槽。**'
    },
    {
      kind: 'table', title: '多网卡与多网段规划', icon: 'grid',
      head: ['网络', '用途', '典型配置'],
      rows: [
        ['**管理网**', 'BMC、SSH、监控、部署', '1G/10G 电口'],
        ['**业务网**', '用户业务流量、API 访问', '10G/25G 光口'],
        ['**存储网**', '存储数据读写、分布式存储同步', '25G/100G'],
        ['**计算网**', 'GPU 集群互联（IB/RoCE）', '100G/200G/400G']
      ],
      note: '**为什么分这么多网？** ①性能隔离：训练流量巨大，不能挤占管理带宽；②安全隔离：管理网不暴露；③故障隔离：一张网出问题不影响其他。'
    },
    {
      kind: 'table', title: 'bonding 常用模式', icon: 'link',
      head: ['模式', '名称', '原理', '特点'],
      rows: [
        ['mode=0', 'balance-rr', '轮询发送', '带宽叠加，但需交换机配合'],
        ['**mode=1**', '**active-backup**', '主备', '**最常用**，一主一备，故障自动切换'],
        ['**mode=4**', '**802.3ad (LACP)**', '动态聚合', '带宽叠加 + 冗余，**需交换机配置 LACP**']
      ]
    },
    {
      kind: 'code', title: 'netplan 配置 bonding（mode=1）', icon: 'code', lang: 'yaml', file: '/etc/netplan/01-netcfg.yaml',
      code: `network:
  version: 2
  renderer: networkd
  ethernets:
    ens33:
      dhcp4: no
    ens34:
      dhcp4: no
  bonds:
    bond0:
      interfaces: [ens33, ens34]
      addresses: [192.168.1.10/24]
      routes:
        - to: default
          via: 192.168.1.1
      parameters:
        mode: active-backup
        primary: ens33
        mii-monitor-interval: 100`,
      note: '应用与验证：`sudo netplan apply` → `cat /proc/net/bonding/bond0`（查看绑定状态与主备角色，**最关键**）。**现场提示**：mode=4（LACP）必须交换机两端都配，否则会形成环路或不通 —— 做 bonding 前先和网络工程师确认交换机配置。'
    },
    {
      kind: 'code', title: '常用网络命令速查', icon: 'terminal', lang: 'bash', file: 'net-cmds.sh',
      code: `ip addr / ip -br a        # 查看 IP
ip link set eth0 up/down  # 启停网卡
ip route                  # 查看路由表
ip neigh                  # ARP 表
ss -tulnp                 # 监听端口
ethtool eth0              # 网卡速率 / 双工 / 驱动
nmcli device status       # NetworkManager 状态

# VLAN 子接口（临时）
sudo ip link add link eth0 name eth0.100 type vlan id 100
sudo ip addr add 192.168.100.10/24 dev eth0.100
sudo ip link set eth0.100 up`
    },
    {
      id: 's3-debug', chapter: '八、网络排查方法论（第 9 周）', icon: 'search',
      chSub: '核心心法：从下往上、从近到远、先简后繁。先问"以前正常吗、改过什么"，再看"哪一层断"，最后"抓包定位"。',
      kind: 'flow', title: '分层排查思路（背下来）', icon: 'search',
      steps: [
        { t: '物理层', d: '网线插好没？光模块亮灯没？网卡 up 没？→ `ip link`、`ethtool`' },
        { t: '链路层', d: 'MAC 通不通？ARP 表正常吗？VLAN 对吗？→ `ip neigh`' },
        { t: '网络层', d: 'IP 配对吗？网关通吗？路由对吗？→ `ip addr`、`ip route`、ping 网关' },
        { t: '传输层', d: '端口监听没？防火墙拦了吗？→ `ss -tulnp`、telnet/nc' },
        { t: '应用层', d: '服务正常吗？日志报什么？→ `curl`、日志' }
      ]
    },
    {
      kind: 'code', title: '排查工具箱', icon: 'terminal', lang: 'bash', file: 'debug.sh',
      code: `# 连通性
ping -c 4 192.168.1.1        # 测网关
ping -c 4 8.8.8.8            # 测外网（绕过 DNS）
ping -c 4 www.baidu.com      # 测 DNS + 外网
traceroute -n www.baidu.com  # 追踪路径（-n 不解析域名，更快）
mtr www.baidu.com            # ping + traceroute，实时看每跳丢包

# 端口与服务
ss -tulnp                    # 监听端口（t TCP, u UDP, l 监听, n 数字, p 进程）
ss -tnp state established    # 已建立的连接
ss -s                        # 连接统计（TIME_WAIT 数量等）
nc -zv 192.168.1.10 22       # 测端口是否通
curl -I http://192.168.1.10  # 测 HTTP 服务

# 抓包（终极武器）
sudo tcpdump -i eth0 -nn port 80        # 抓 80 端口（-nn 不解析域名和端口名）
sudo tcpdump -i eth0 host 192.168.1.10  # 抓某主机
sudo tcpdump -i eth0 -w capture.pcap    # 存文件，用 Wireshark 分析

# 网卡与链路
ethtool eth0 / ethtool -S eth0 / ip -s link   # 速率、双工、错包统计
iftop -i eth0 / nload / sar -n DEV 1 5        # 实时带宽

# DNS
dig www.baidu.com / dig +short www.baidu.com
cat /etc/resolv.conf / cat /etc/hosts`,
      note: '**关键指标**：`RX errors`、`TX errors`、`dropped` 非 0 要警惕 —— 可能是网线质量、光模块故障、速率不匹配。**重要提醒**：ping 不通 ≠ 服务挂了（很多服务器禁 ICMP）；ping 通 ≠ 服务正常（可能 80 端口没开）。ping 只是"第一关"，不是结论。'
    },
    {
      kind: 'table', title: '排查案例集（8 个高频场景）', icon: 'alert',
      head: ['场景', '现象', '排查思路'],
      rows: [
        ['**服务器完全不通**', 'ping 不通', '①`ip link` 网卡 up 吗 → ②`ip addr` 有 IP 吗（169.254 说明没拿到）→ ③`ip neigh` ARP 正常吗 → ④交换机端口'],
        ['**能通内网不通外网**', 'ping 网关通，ping 8.8.8.8 不通', '检查**网关和默认路由** `ip route`'],
        ['**能上外网但域名不通**', 'ping 8.8.8.8 通，ping 域名不通', '**DNS 问题**，查 `/etc/resolv.conf` 和 `/etc/hosts`'],
        ['**服务访问不了**', 'IP 通但端口连不上', '`ss -tulnp` 看端口监听没 → **防火墙** → 服务进程'],
        ['**时通时断**', '间歇性丢包', '`mtr` 看哪一跳丢包 → 网线/光模块/交换机'],
        ['**速度慢**', '带宽上不去', '`ethtool` 看速率是否协商成 100M（应为 1000M+）→ 双工模式'],
        ['**大量 CLOSE_WAIT**', '连接堆积', '**应用没正确关闭连接**，查程序'],
        ['**大量 TIME_WAIT**', '端口耗尽', '短连接多，改长连接或调内核参数']
      ],
      note: '90% 的网络问题逃不出这个套路：**先问"以前正常吗、改过什么"，再看"哪一层断"，最后"抓包定位"**。'
    },
    {
      id: 's3-switch', chapter: '九、交换机基础', icon: 'network',
      chSub: '二层靠 MAC 转发，VLAN 做逻辑隔离，Trunk 口透传多 VLAN —— 这三件事吃透，机房里 80% 的"不通"都能定位。',
      kind: 'table', title: '集线器 / 交换机 / 路由器 / 三层交换机', icon: 'network',
      head: ['设备', '工作层', '转发依据', '说明'],
      rows: [
        ['**集线器**', '物理层', '广播', '已淘汰，所有口共享带宽'],
        ['**交换机**', '数据链路层（二层）', '**MAC 地址**', '每个口独立带宽，局域网核心'],
        ['**路由器**', '网络层（三层）', '**IP 地址**', '连接不同网络'],
        ['**三层交换机**', '二/三层', 'MAC + IP', '兼具交换和路由，数据中心常用']
      ]
    },
    {
      kind: 'terms', title: 'VLAN 与端口三兄弟', icon: 'layers',
      items: [
        { t: 'VLAN', full: 'Virtual LAN', d: '在一台物理交换机上划分出多个**逻辑局域网**。不同 VLAN 二层隔离，需三层路由才能互通。价值：隔离广播域、安全隔离、灵活组网。靠 802.1Q 标签（插入 4 字节，含 12 位 VID，范围 1–4094）标识。' },
        { t: 'Access 口', d: '接**终端设备**（服务器、PC）的端口，只属于一个 VLAN，发出的帧**不带标签**。' },
        { t: 'Trunk 口', d: '交换机之间**级联**的端口，可同时透传多个 VLAN，帧**带标签**传输。' },
        { t: 'PVID', full: 'Port VLAN ID', d: '端口的"默认 VLAN"。Access 口收到的**无标签帧**会打上 PVID 对应的 VLAN 标签。' },
        { t: 'MAC 地址表', d: '交换机维护的"MAC → 端口"映射表。收到帧后查表转发，查不到就**泛洪（flood）**到所有端口 —— 这就是交换机比集线器聪明的原因。' },
        { t: 'LACP', full: 'Link Aggregation Control Protocol', d: '交换机侧的链路聚合（IEEE 802.3ad），与服务器侧 bonding mode=4 对应。**两端必须都配且参数一致**。' },
        { t: 'STP', full: 'Spanning Tree Protocol', d: '通过逻辑阻塞某些端口，把有环拓扑变成无环的"树"，避免广播风暴。现代数据中心多用 Spine-Leaf + 路由（BGP/ECMP）处理环路。' }
      ]
    },
    {
      kind: 'code', title: '交换机查看命令（华为/华三风格）', icon: 'terminal', lang: 'bash', file: 'switch.txt',
      code: `display vlan                     # 查看 VLAN
display port vlan                # 查看端口 VLAN 配置
display interface brief          # 查看端口状态
display transceiver interface    # 查看光模块光功率`,
      note: '**最常踩的坑**：Trunk 口忘记放行对应 VLAN，导致跨交换机同 VLAN 设备不通。**配置完一定检查"允许通过的 VLAN 列表"。** 运维要点：端口状态（up/down、速率协商、错包计数）、光模块光功率、变更前备份配置、记录变更。'
    },
    {
      id: 's3-rdma', chapter: '十、高速互联：AI 集群的"血管"', icon: 'bolt',
      chSub: '第 9 周重点。传统 TCP/IP 延迟在毫秒级且吃 CPU；RDMA 把延迟压到微秒级并让 CPU 彻底解放。',
      kind: 'cards', title: 'RDMA 的三大特性', icon: 'bolt',
      items: [
        { icon: 'eye', t: '内核旁路 Kernel Bypass', d: '数据直接从网卡到应用内存，绕过操作系统内核网络栈，不再有中断与上下文切换开销。' },
        { icon: 'layers', t: '零拷贝 Zero-Copy', d: '数据不需要在用户态和内核态之间来回搬运，省掉多次内存拷贝。' },
        { icon: 'chip', t: 'CPU 卸载', d: '网络传输由网卡（RNIC）完成，CPU 不参与 —— 让 CPU 专心去调度 GPU。' }
      ]
    },
    {
      kind: 'table', title: 'RDMA 的三条实现路线', icon: 'link',
      head: ['路线', '说明'],
      rows: [
        ['**InfiniBand**', '专用网络，原生 RDMA，性能最强。需要 IB 网卡（HCA）+ IB 交换机，与以太网不兼容。'],
        ['**RoCE**', 'RDMA over Converged Ethernet —— 在以太网上跑 RDMA。成本更低、与现有网络融合更好。'],
        ['**iWARP**', '在 TCP/IP 上跑 RDMA，较少使用。']
      ]
    },
    {
      kind: 'table', title: 'InfiniBand vs RoCE v2 选型对比', icon: 'target',
      head: ['对比项', 'InfiniBand', 'RoCE v2'],
      rows: [
        ['网络类型', '专用网络', '以太网'],
        ['延迟', '**最低**（微秒级）', '低（略高于 IB）'],
        ['带宽', 'HDR/NDR/XDR（200/400/800G）', '100/200/400G'],
        ['成本', '高（专用设备）', '相对低（复用以太网）'],
        ['兼容性', '与以太网不兼容', '与以太网融合'],
        ['配置复杂度', '相对简单（原生支持）', '**复杂**（需配无损网络 PFC/ECN）'],
        ['运维难度', '需专门技能', '需懂以太网 + RDMA'],
        ['典型场景', '**大规模 AI 训练集群**', '中小规模 / 已有以太网基础设施']
      ],
      note: '**选型经验**：追求极致性能、预算充足、大规模训练 → **IB**；复用现有网络、控制成本、规模中等 → **RoCE**。**RoCE v2 跑在 UDP 4791 上**（v1 是二层，只能在同一个二层域内）。无论哪种，都要会看链路状态、会跑带宽/延迟测试、会查错包计数。'
    },
    {
      kind: 'callout', tone: 'warn', title: 'RoCE 的命门：无损网络（Lossless Network）',
      html: '传统以太网**允许丢包**（丢了让 TCP 重传），但 RDMA 对丢包极其敏感 —— 一旦丢包，性能断崖式下跌。所以 RoCE 要求网络尽量不丢包，靠两项技术实现：**PFC（优先级流控）**给特定优先级流量开"专用车道"，拥塞时发暂停帧而不是丢包；**ECN（显式拥塞通知）**让交换机在拥塞时标记数据包，通知发送方降速，从源头避免拥塞。**一句话：RoCE 的性能好不好，很大程度上取决于无损网络配置得好不好。**'
    },
    {
      kind: 'code', title: 'InfiniBand 常用工具', icon: 'terminal', lang: 'bash', file: 'ib-tools.sh',
      code: `ibstat                    # 查看 IB 网卡状态
ibv_devinfo               # 查看 IB 设备
ibstatus                  # IB 链路状态
perfquery                 # 性能计数器（错包、符号错误）
ib_write_bw               # 带宽测试
ib_send_lat               # 延迟测试`
    },
    {
      kind: 'viz', viz: 'spine-leaf', icon: 'network',
      title: 'Spine-Leaf 拓扑与 ECMP 多路径',
      hint: '观察流量如何在多条等价路径上分散',
      caption: '**优势**：任意两台服务器之间最多 3 跳（Leaf→Spine→Leaf）；全互联 + **ECMP（等价多路径）**让带宽被充分利用；加 Spine 提带宽、加 Leaf 接更多服务器；单条链路/单台 Spine 故障自动走其他路径。'
    },
    {
      kind: 'table', title: '光模块封装与光纤选型', icon: 'cable',
      head: ['封装 / 类型', '速率 / 规格', '场景'],
      rows: [
        ['SFP+', '10G', '万兆接入'],
        ['SFP28', '25G', '服务器接入'],
        ['QSFP28', '100G', '服务器 / 交换机上联'],
        ['QSFP-DD', '400G', '数据中心核心'],
        ['OSFP', '400G / 800G', '新一代高密度'],
        ['**多模 MMF**', '50/125 μm，850 nm，短距（几百米）', '机柜内 / 楼内短距 —— 便宜'],
        ['**单模 SMF**', '9/125 μm，1310/1550 nm，长距（数十公里）', '跨楼 / 跨园区 —— 贵但传得远']
      ],
      note: '选型分界线约 **300–500 米**。**现场提示**：光模块和光纤必须匹配（多模模块配多模光纤）；光模块有方向性（TX 接对端 RX），插反了不通；光功率过高/过低都会导致链路异常。'
    },
    {
      id: 's3-dc', chapter: '十一、数据中心网络架构', icon: 'grid',
      chSub: '排查问题时先问"是哪张网的问题" —— 管理网不通不影响业务，但业务网/计算网不通会直接影响训练。',
      kind: 'flow', title: 'AI 集群网络分区（物理隔离）', icon: 'grid',
      steps: [
        { n: '1', t: '管理网（1G/10G）', d: 'BMC / SSH / 监控 / 部署。独立交换机，不暴露公网。' },
        { n: '2', t: '业务网（10G/25G）', d: '用户业务流量、API 访问。' },
        { n: '3', t: '存储网（25G/100G）', d: '存储数据读写、分布式存储同步。' },
        { n: '4', t: '计算网（100G–400G）', d: 'GPU 训练通信（IB / RoCE），全互联 Spine-Leaf。' }
      ]
    },
    {
      kind: 'compare', title: '东西向 vs 南北向流量', icon: 'activity',
      left: { title: '南北向（North-South）', items: ['**服务器与外部**之间的流量', '用户访问网站', '传统数据中心流量主体', '流量相对小'] },
      right: { title: '东西向（East-West）', items: ['**服务器与服务器**之间的流量', 'GPU 同步梯度、读取训练数据', '**AI 集群的绝对主体**', '流量巨大，必须 Spine-Leaf + 高速互联才扛得住'] }
    },
    {
      kind: 'hflow', title: '网络架构演进', icon: 'arrow',
      steps: [
        { t: '传统三层', d: '接入-汇聚-核心。带宽瓶颈、扩展性差，跨汇聚流量成为瓶颈。' },
        { t: 'Spine-Leaf 扁平化', d: '全互联 + 跳数固定，解决带宽收敛比与扩展性问题。' },
        { t: 'IB / RoCE 无损网络', d: '加 ECMP 多路径，为 AI 训练提供微秒级低延迟。' },
        { t: '超大规模 GPU 集群', d: '面向 AI，万卡级互联，网络投资占比极高。' }
      ]
    }
  ],
  checklist: [
    {
      t: '第 8 周 · 基础与地址',
      items: [
        '用 `ip -br addr`、`ip route`、`ip neigh` 完整查看本机网络状态',
        '手工计算：把 `192.168.1.0/24` 划分为 8 个子网，写出每个子网范围',
        '用 `tcpdump` 抓一次 `ping` 的包，观察 ICMP 报文',
        '用 `ss -tulnp` 列出本机所有监听端口，识别每个服务',
        '修改 `/etc/hosts`，用主机名访问另一台虚拟机'
      ]
    },
    {
      t: '第 9 周 · 配置与排查',
      items: [
        '给一台虚拟机配置**双网卡**（一张 NAT 上网，一张 Host-Only 内网）',
        '配置 **bonding（mode=1 主备）**，拔掉一张网卡验证自动切换',
        '模拟 5 个网络故障（改错 IP、关网关、关 DNS、改错端口、防火墙拦截），写出排查过程',
        '用 `mtr` 分析一次网络抖动',
        '用 `ethtool` 查看网卡速率与错包计数',
        '整理一份网络排查案例集（8 个场景）'
      ]
    },
    {
      t: '高速互联（了解级，有设备则实操）',
      items: [
        '整理 IB vs RoCE 对比表',
        '如有 IB 设备：用 `ibstat`、`ib_write_bw` 查看状态与带宽',
        '画出所在实验室/公司的网络分区图'
      ]
    }
  ],
  quiz: [
    { q: 'OSI 七层和 TCP/IP 四层如何对应？各层典型设备是什么？', a: 'TCP/IP 应用层 = OSI 应用+表示+会话；传输层 = 传输层；网际层 = 网络层；网络接口层 = 数据链路+物理。典型设备：物理层（网线/中继器）、链路层（交换机/网卡）、网络层（路由器）。' },
    { q: '数据封装的过程是怎样的？为什么抓包能看到 HTTP 内容？', a: '发送时自上而下逐层加头部：数据 → 加 TCP 头成段 → 加 IP 头成包 → 加帧头帧尾成帧 → 转成比特。接收时反向拆头。tcpdump 抓的是帧，逐层剥开就能看到里面的 HTTP 载荷。' },
    { q: 'TCP 为什么要三次握手、四次挥手？', a: '三次握手才能让双方都确认"自己的发送和接收都正常"，同时防止历史重复连接；四次挥手是因为 TCP 全双工，两个方向要分别关闭，且服务器可能还有数据要发完，ACK 与 FIN 不能合并。' },
    { q: 'TCP 和 UDP 的区别？RoCE v2 为什么跑在 UDP 上？', a: 'TCP 面向连接、可靠、保证顺序、开销大；UDP 无连接、不可靠、快、开销小。RoCE v2 用 UDP 只是借以太网传输，可靠性与拥塞控制由 RDMA 层自己实现（端口 4791）。' },
    { q: '`ping 8.8.8.8` 通但 `ping www.baidu.com` 不通，问题在哪？', a: 'DNS 问题。8.8.8.8 是 IP 直连，能通说明网络层通；域名不通说明解析失败。先查 `/etc/resolv.conf`（DNS 服务器配置）和 `/etc/hosts`。' },
    { q: '私有 IP 地址有哪三段？`169.254.x.x` 说明什么？', a: '10.0.0.0/8、172.16.0.0/12、192.168.0.0/16。169.254.0.0/16 是链路本地地址，DHCP 失败时自动分配 —— 看到它基本说明没拿到 IP，先查网线、交换机端口、DHCP 服务。' },
    { q: '如何判断两台设备是否在同一子网？', a: '把 IP 与子网掩码做按位与（AND），结果相同则同子网。或把 IP 写成二进制，比较前 n 位（n = CIDR 数字）是否一致。' },
    { q: '`192.168.1.0/26` 的可用主机数是多少？广播地址是多少？', a: '主机位 32-26 = 6 位 → 2^6 - 2 = **62** 个可用主机。网络地址 192.168.1.0，广播地址是主机位全 1 → **192.168.1.63**。' },
    { q: 'bonding mode=1 和 mode=4 有什么区别？各自需要什么条件？', a: 'mode=1（active-backup）主备，一主一备故障自动切换，最常用，无需交换机特殊配置；mode=4（802.3ad/LACP）动态聚合，带宽叠加 + 冗余，**需要交换机两端都配 LACP 且参数一致**，否则环路或不通。' },
    { q: '一台服务器"完全不通"，你的分层排查顺序是什么？', a: '①物理层 `ip link` 看网卡 up、光模块亮灯；②链路层 `ip neigh` 看 ARP；③网络层 `ip addr`/`ip route`/ping 网关；④传输层 `ss -tulnp`/nc 测端口；⑤应用层 curl + 日志。从下往上、从近到远、先简后繁。' },
    { q: 'Access 口和 Trunk 口有什么区别？Trunk 最常见的配置错误是什么？', a: 'Access 口接终端、只属于一个 VLAN、帧不带标签；Trunk 口级联交换机、透传多 VLAN、帧带标签。最常见错误是 **Trunk 口忘记放行对应 VLAN**，导致跨交换机同 VLAN 设备不通。' },
    { q: 'RDMA 的三大特性是什么？它解决了什么问题？', a: '内核旁路、零拷贝、CPU 卸载。解决传统 TCP/IP 延迟高（毫秒级、经内核多次拷贝与中断）和 CPU 开销大的问题，把延迟降到微秒级并释放 CPU 去调度 GPU。' },
    { q: 'InfiniBand 和 RoCE 各有什么优劣？如何选型？', a: 'IB 延迟最低、带宽最高（HDR/NDR/XDR）、原生支持配置简单，但成本高、与以太网不兼容；RoCE 复用以太网、成本低、融合好，但配置复杂（需无损网络）。大规模训练选 IB，中小规模/已有以太网选 RoCE。' },
    { q: '为什么 RoCE 需要"无损网络"？PFC 和 ECN 分别起什么作用？', a: 'RDMA 对丢包极其敏感，丢包会导致性能断崖式下跌。PFC 给特定优先级流量做流控，拥塞时发暂停帧而不是丢包；ECN 让交换机标记拥塞包，通知发送方降速，从源头避免拥塞。' },
    { q: 'Spine-Leaf 架构相比传统三层有什么优势？', a: '跳数固定（最多 3 跳）、延迟低；全互联 + ECMP 带宽充足；加 Spine/Leaf 即可横向扩展；单链路或单 Spine 故障自动切换，高可用。传统三层跨汇聚流量成瓶颈、扩展性差。' },
    { q: '东西向流量和南北向流量有什么区别？为什么 AI 集群以前者为主？', a: '南北向是服务器与外部的流量（用户访问）；东西向是服务器之间的流量。AI 训练中 GPU 同步梯度、读训练数据都是东西向，流量巨大，所以 AI 集群以东西向为主，必须用 Spine-Leaf + 高速互联。' },
    { q: '多模和单模光纤怎么选？', a: '机柜内/楼内短距（约 300–500 米内）用多模（850 nm，便宜）；跨楼/跨园区长距用单模（1310/1550 nm，贵但传得远）。模块与光纤必须匹配，注意 TX/RX 方向。' }
  ],
  glossary: [
    { t: 'OSI', d: 'Open Systems Interconnection，七层网络参考模型。' },
    { t: 'TCP/IP', d: '实际使用的四层协议栈。' },
    { t: 'IP', d: '网际协议，负责逻辑寻址与路由转发，"尽力而为"。' },
    { t: 'TCP', d: '面向连接、可靠的传输层协议。' },
    { t: 'UDP', d: '无连接、快速的传输层协议。' },
    { t: 'ICMP', d: '控制与差错报告协议，ping 用它。' },
    { t: 'ARP', d: '地址解析协议，IP → MAC。' },
    { t: 'DNS', d: '域名系统，域名 → IP。' },
    { t: 'DHCP', d: '动态主机配置协议，自动分配 IP。' },
    { t: 'NTP', d: '网络时间协议，时间同步（123 端口）。' },
    { t: 'TTL', d: 'Time To Live，数据包生存时间，每跳减 1。' },
    { t: '端口', d: '0–65535，区分同一机器上的不同服务。' },
    { t: '子网掩码', d: '划分网络号与主机号，1 对应网络位。' },
    { t: 'CIDR', d: 'Classless Inter-Domain Routing，无类别域间路由，`/24` 写法。' },
    { t: 'VLSM', d: '可变长子网掩码，同网络里用不同长度掩码。' },
    { t: '私有地址', d: 'RFC 1918 定义的三段局域网专用地址。' },
    { t: '网关', d: '出本网段的"大门"。' },
    { t: 'MAC 地址', d: '网卡物理地址，48 位，全球唯一。' },
    { t: '回环地址', d: '127.0.0.1，本机。' },
    { t: '链路本地地址', d: '169.254.x.x，DHCP 失败时出现。' },
    { t: 'VLAN', d: 'Virtual LAN，虚拟局域网，二层逻辑隔离。' },
    { t: 'STP', d: '生成树协议，防环路与广播风暴。' },
    { t: 'LACP', d: '链路聚合控制协议，IEEE 802.3ad。' },
    { t: 'Access 口', d: '接终端的交换机端口，属于单一 VLAN，不带标签。' },
    { t: 'Trunk 口', d: '交换机级联端口，透传多 VLAN，带标签。' },
    { t: 'PVID', d: 'Port VLAN ID，端口默认 VLAN。' },
    { t: 'bonding', d: '网卡绑定，多张物理网卡合成一张逻辑网卡。' },
    { t: 'ECMP', d: 'Equal-Cost Multi-Path，等价多路径，流量分散。' },
    { t: 'RDMA', d: 'Remote Direct Memory Access，远程直接内存访问，内核旁路。' },
    { t: 'IB', d: 'InfiniBand，原生 RDMA 专用网络。' },
    { t: 'RoCE', d: 'RDMA over Converged Ethernet，以太网上的 RDMA（v2 用 UDP 4791）。' },
    { t: 'HCA', d: 'Host Channel Adapter，IB 网卡。' },
    { t: 'PFC', d: 'Priority Flow Control，优先级流控，无损网络关键。' },
    { t: 'ECN', d: 'Explicit Congestion Notification，显式拥塞通知。' },
    { t: 'Spine-Leaf', d: '叶脊架构，数据中心主流网络拓扑。' },
    { t: '东西向流量', d: 'East-West，服务器之间的流量，AI 集群主体。' },
    { t: '南北向流量', d: 'North-South，服务器与外部的流量。' },
    { t: '光模块', d: 'Optical Transceiver，光电转换模块。' },
    { t: '多模 / 单模', d: 'MMF / SMF，短距 / 长距光纤。' },
    { t: 'pcap', d: '抓包文件标准格式，可用 Wireshark 分析。' },
    { t: 'mtr', d: 'My Traceroute，ping + traceroute 结合，实时看每跳丢包。' }
  ]
});
