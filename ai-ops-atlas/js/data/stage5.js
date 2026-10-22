(window.AIOPS_STAGES = window.AIOPS_STAGES || []).push({
  id: 's5', num: 5, title: '自动化运维与监控', icon: 'activity', accent: '#fb7185', weeks: '第 13–14 周',
  desc: '从"一台台 SSH 上去改"进化到"一次编写、批量执行"；从"出事靠人救火"进化到"监控先发现、告警先通知"。这一阶段把运维从体力活变成工程活。',
  timeline: '先建立自动化与可观测的思维（IaC / 幂等 / 配置漂移），再吃透 Ansible 批量配置，然后搭建 Prometheus + Grafana + Alertmanager 监控告警体系，最后补上 ELK 日志与 GPU 监控。',
  tags: ['IaC', '幂等性', 'Ansible', 'Playbook', 'Prometheus', 'PromQL', 'Grafana', 'Alertmanager', 'Zabbix', 'ELK', 'DCGM'],
  quote: '"大部分线上事故，不是技术不行，是配置不一致。" 自动化运维的核心价值，就是消灭配置漂移；而监控的目的不是"看得见"，而是"来得及"。',
  deliverables: [
    '一套 Ansible 批量巡检 Playbook（检查磁盘/内存/服务）',
    '一个 Prometheus + Node Exporter + Grafana 的可用监控栈',
    '一份告警规则 + Alertmanager 路由配置（含分级与抑制）',
    '一套 DCGM Exporter 采集的 GPU 监控看板'
  ],
  sections: [
    {
      id: 's5-why', chapter: '一、为什么需要自动化运维', icon: 'bolt',
      chSub: '自动化运维的核心价值，是消灭配置漂移（Configuration Drift）—— 服务器配置在长期人工修改中逐渐偏离标准状态。',
      kind: 'compare', title: '手工时代 vs 自动化时代', icon: 'bolt',
      left: { title: '手工时代', items: ['一台台 SSH 上去改', '配置靠记忆、靠文档', '"测试环境正常，线上挂了"', '出故障靠人救火'] },
      right: { title: '自动化时代', items: ['一次编写，批量执行', '配置即代码，可版本管理', '环境一致，杜绝配置漂移', '监控先发现，告警先通知'] }
    },
    {
      kind: 'terms', title: '两个必须内化的概念', icon: 'book',
      items: [
        { t: 'IaC', full: 'Infrastructure as Code', d: '用**代码**描述和管理基础设施（服务器、网络、配置）。好处：可版本管理、可复用、可审计、可回滚。Ansible、Terraform、Puppet 都是 IaC 工具。' },
        { t: '幂等性', full: 'Idempotency', d: '同一个操作**执行一次和执行 N 次，结果相同**。这是配置管理工具的核心特性 —— 你可以放心地反复执行 Playbook，不会把系统搞乱。' },
        { t: '配置漂移', full: 'Configuration Drift', d: '服务器配置在长期人工修改中逐渐偏离标准状态。**漂移是事故的温床** —— 自动化配置管理能持续把配置"拉回"标准状态。' }
      ]
    },
    {
      kind: 'table', title: '运维自动化工具全景', icon: 'grid',
      head: ['层次', '工具', '作用'],
      rows: [
        ['**配置管理**', 'Ansible、SaltStack、Puppet', '批量配置服务器'],
        ['**基础设施编排**', 'Terraform、CloudFormation', '创建云资源'],
        ['**应用部署**', 'Helm、ArgoCD、Jenkins', '部署应用到 K8s'],
        ['**监控告警**', 'Prometheus、Zabbix、Grafana', '发现异常'],
        ['**日志分析**', 'ELK、Loki', '集中检索日志'],
        ['**CI/CD**', 'GitLab CI、Jenkins、ArgoCD', '持续集成与交付']
      ]
    },
    {
      id: 's5-ansible', chapter: '二、Ansible（第 13 周重点）', icon: 'git',
      chSub: 'Ansible = 无代理 + SSH + Python + YAML。Puppet/Salt 都需要在被管节点装 Agent，而 Ansible 只要 SSH 能连就能管。',
      kind: 'table', title: '为什么 Ansible 是入门首选', icon: 'rocket',
      head: ['优势', '说明'],
      rows: [
        ['**无代理 Agentless**', '不用装客户端，SSH 能连就能管'],
        ['**上手快**', 'YAML 语法，人类可读'],
        ['**幂等**', '反复执行结果一致'],
        ['**生态丰富**', '数千个现成模块'],
        ['**无需专用服务器**', '在任意一台机器上跑就行']
      ],
      note: '**前提**：控制节点到被管节点要配好 **SSH 免密登录** —— 阶段 0 学的技能在这里派上用场。'
    },
    {
      kind: 'table', title: 'Ansible 核心概念', icon: 'book',
      head: ['概念', '说明', '类比'],
      rows: [
        ['**Inventory**', '被管理主机的清单', '通讯录'],
        ['**Module**', '执行具体动作的单元（如装软件）', '工具'],
        ['**Task**', '调用一个模块完成一件事', '一步操作'],
        ['**Play**', '一组针对某些主机的 Task', '一个场景'],
        ['**Playbook**', '一个或多个 Play 组成的 YAML 文件', '剧本'],
        ['**Role**', '可复用的 Playbook 组织方式', '模块化的剧本'],
        ['**Handler**', '被 notify 触发的任务（如重启服务）', '事件响应']
      ],
      note: '**Handler 的价值**："配置变了才重启服务" —— 配置没变就不重启，避免无意义的中断。这是幂等思维在 Playbook 里的具体体现。'
    },
    {
      kind: 'code', title: 'Inventory 与 ansible.cfg', icon: 'code', lang: 'ini', file: 'hosts.ini',
      code: `[defaults]
inventory = ./hosts.ini
remote_user = root
host_key_checking = False          # 首次连接不检查指纹（测试环境方便）
forks = 10                         # 并发数

# ---- hosts.ini ----
[web]
web01 ansible_host=192.168.1.11
web02 ansible_host=192.168.1.12

[gpu_nodes]
gpu01 ansible_host=192.168.1.21 ansible_user=root
gpu02 ansible_host=192.168.1.22

[all:vars]                         # 所有主机共用的变量
ansible_user=root
ansible_ssh_private_key_file=~/.ssh/id_ed25519`,
      note: '常用 ad-hoc 命令：`ansible all -m ping`（连通性）、`ansible web -m shell -a "df -h"`（批量执行）、`ansible-playbook -i hosts.ini site.yml --check --diff`（空跑验证 + 看差异）。**Ansible Vault** 用来加密敏感信息（如密码文件）。'
    },
    {
      kind: 'code', title: '一个批量部署 Playbook', icon: 'code', lang: 'yaml', file: 'deploy-nginx.yml',
      code: `---
- name: 部署 Nginx 并配置
  hosts: web
  become: yes
  vars:
    nginx_port: 80
  tasks:
    - name: 安装 Nginx
      apt:
        name: nginx
        state: present
        update_cache: yes

    - name: 生成配置文件
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: 重启 Nginx            # 配置变了才触发 Handler

    - name: 启动并开机自启
      service:
        name: nginx
        state: started
        enabled: yes

  handlers:
    - name: 重启 Nginx
      service:
        name: nginx
        state: restarted`,
      note: '**template 模块**用 Jinja2 渲染模板（变量来自 `vars` / inventory / facts），实现"一套模板，多机差异化"。把 Playbook 按功能拆成 **Role**（`tasks/`、`handlers/`、`templates/`、`defaults/`、`vars/`），就能在不同项目里复用。'
    },
    {
      id: 's5-monitor', chapter: '三、监控体系设计（第 14 周重点）', icon: 'gauge',
      chSub: '监控的目的不是"看得见"，而是"来得及" —— 发现异常早于用户投诉、快速定位、容量规划、复盘改进。',
      kind: 'flow', title: '监控分层（从物理到业务）', icon: 'layers',
      steps: [
        { t: '硬件层', d: '温度、风扇、电源、GPU —— 物理视角。**AI 运维重点**。' },
        { t: '主机层', d: 'CPU、内存、磁盘、网络 —— 基础设施视角。**AI 运维重点**。' },
        { t: '中间件层', d: '数据库、缓存、消息队列 —— 组件视角。' },
        { t: '应用层', d: '接口延迟、错误率、连接数 —— 应用视角。**AI 运维重点**（训练任务状态）。' },
        { t: '业务层', d: '交易成功率、订单量、QPS —— 业务视角。' }
      ]
    },
    {
      kind: 'table', title: '四大黄金指标（Google SRE）', icon: 'target',
      head: ['指标', '含义', '例子'],
      rows: [
        ['**延迟 Latency**', '请求处理耗时', 'P99 响应时间'],
        ['**流量 Traffic**', '系统负载量', 'QPS、并发数'],
        ['**错误 Errors**', '失败请求比例', '5xx 比例'],
        ['**饱和度 Saturation**', '资源使用程度', 'CPU / 内存 / 磁盘使用率']
      ]
    },
    {
      kind: 'table', title: '两大监控方法论：USE 与 RED', icon: 'book',
      head: ['方法论', '适用对象', '三个维度'],
      rows: [
        ['**USE**', '**资源**（CPU、内存、磁盘、网络）', 'Utilization（使用率）、Saturation（饱和度）、Errors（错误）'],
        ['**RED**', '**服务**（微服务、API）', 'Rate（速率）、Errors（错误）、Duration（时长）']
      ],
      note: '**记住一句话**：排查资源问题用 **USE**，排查服务问题用 **RED**。'
    },
    {
      id: 's5-prom', chapter: '四、Prometheus + Grafana（重点）', icon: 'activity',
      chSub: '云原生时代最流行的开源监控与告警系统，CNCF 毕业项目，K8s 监控的事实标准。',
      kind: 'viz', viz: 'prom-pull', icon: 'refresh',
      title: 'Prometheus 拉取模型',
      hint: '观察 Prometheus 如何定期 scrape 各 Exporter',
      caption: '**拉取模型（Pull）**：Prometheus 主动定期访问目标的 `/metrics` 端点。与之相对的是 **推送模型（Push）**（如 Zabbix Agent 主动上报）。**Exporter** 就是把被监控对象的指标转换成 Prometheus 格式的小程序。'
    },
    {
      kind: 'table', title: '四种指标类型', icon: 'chart',
      head: ['类型', '说明', '例子'],
      rows: [
        ['**Counter（计数器）**', '只增不减的累计值', '请求总数、错误总数'],
        ['**Gauge（仪表盘）**', '可增可减的瞬时值', 'CPU 使用率、温度、内存占用'],
        ['**Histogram（直方图）**', '统计分布（分桶）', '请求延迟分布'],
        ['**Summary（摘要）**', '统计分布（分位数）', '请求延迟 P99']
      ],
      note: '**关键认知**：Counter 类型要用 `rate()` 算**每秒增长率**才有意义（如 `rate(http_requests_total[5m])`）。数据模型是"指标名 + 标签"：`node_cpu_seconds_total{cpu="0", mode="idle"} 12345.6 @1697000000` —— **标签是 Prometheus 强大的关键**，可以按任意维度聚合、筛选。'
    },
    {
      kind: 'table', title: 'Exporter 生态', icon: 'cube',
      head: ['Exporter', '监控对象'],
      rows: [
        ['**node_exporter**', 'Linux 主机（CPU / 内存 / 磁盘 / 网络）'],
        ['**dcgm_exporter**', '**NVIDIA GPU**（利用率 / 温度 / 显存 / ECC）'],
        ['**blackbox_exporter**', '黑盒探测（HTTP / TCP / ICMP 可用性）'],
        ['**mysqld_exporter**', 'MySQL'],
        ['**elasticsearch_exporter**', 'Elasticsearch'],
        ['**kube-state-metrics**', 'K8s 对象状态']
      ]
    },
    {
      kind: 'code', title: 'PromQL 基础', icon: 'code', lang: 'promql', file: 'queries.promql',
      code: `# 瞬时查询
node_cpu_seconds_total                        # 原始指标
node_cpu_seconds_total{mode="idle"}           # 按标签筛选
node_cpu_seconds_total{instance=~"node0.*"}   # 正则匹配

# 范围与速率
rate(node_cpu_seconds_total[5m])              # 5 分钟内的每秒增长率

# 聚合
sum(rate(node_cpu_seconds_total{mode!="idle"}[5m])) by (instance)   # 按实例求和
avg(node_memory_MemAvailable_bytes)
max(...) / min(...) / count(...)

# 常用计算
100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)   # CPU 使用率
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100   # 内存使用率
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))        # P99 延迟`,
      note: '常用函数：`rate()`、`irate()`、`increase()`、`sum()`、`avg()`、`max()`、`topk()`、`histogram_quantile()`、`delta()`。'
    },
    {
      kind: 'viz', viz: 'metrics-chart', icon: 'chart',
      title: '指标图表与阈值线',
      hint: '切换指标，观察 85% 阈值触发点',
      caption: 'Grafana 把 Prometheus 数据渲染成仪表盘（图表、热力图、单值面板）。**Dashboard 可导入导出**，社区有大量现成模板（Node Exporter Full、NVIDIA DCGM Dashboard）。**服务发现**让 Prometheus 自动发现监控目标 —— 容器环境下 Pod 频繁变化，这是刚需。'
    },
    {
      id: 's5-alert', chapter: '五、告警体系：Alertmanager', icon: 'alert',
      chSub: 'Prometheus 只负责"发现异常并触发告警"，怎么发、发给谁、怎么避免告警风暴，由 Alertmanager 负责。',
      kind: 'viz', viz: 'alert-flow', icon: 'alert',
      title: '告警处理流水线',
      hint: '观察分组 / 抑制 / 静默如何拦截告警',
      caption: '**路由**决定告警发给谁（按标签匹配）；**分组**把同类告警合并成一条，避免告警风暴；**抑制**在高级别告警出现时屏蔽低级别告警（根因已知，不必重复报警）；**静默**临时屏蔽某类告警（计划维护期间）。'
    },
    {
      kind: 'code', title: '告警规则与 Alertmanager 配置', icon: 'code', lang: 'yaml', file: 'rules/node.yml',
      code: `groups:
- name: node_alerts
  rules:
  - alert: NodeCPUHigh
    expr: 100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
    for: 5m                       # 持续 5 分钟才告警（避免抖动误报）
    labels:
      severity: warning
    annotations:
      summary: "{{ $labels.instance }} CPU 使用率过高"
      description: "CPU 使用率 {{ $value }}%，持续 5 分钟"

  - alert: NodeDiskFull
    expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 15
    for: 10m
    labels:
      severity: critical
    annotations:
      summary: "{{ $labels.instance }} 磁盘空间不足"

# ---- alertmanager.yml ----
route:
  group_by: ['alertname', 'instance']
  group_wait: 30s               # 等待 30s 再发，便于分组
  group_interval: 5m            # 同组新告警的间隔
  repeat_interval: 4h           # 重复告警间隔
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'oncall'
receivers:
  - name: 'default'
    email_configs:
      - to: 'ops@example.com'
  - name: 'oncall'
    webhook_configs:
      - url: 'https://qyapi.weixin.qq.com/...'    # 企业微信机器人`,
      note: '**关键字段 `for`**：持续满足条件一段时间才告警，过滤掉瞬时抖动 —— 这是减少误报的核心手段。'
    },
    {
      kind: 'table', title: '告警分级', icon: 'alert',
      head: ['级别', '含义', '响应'],
      rows: [
        ['**P0 / Critical**', '业务中断、集群不可用', '**立即**处理，电话 / 短信'],
        ['**P1 / Warning**', '影响性能、有风险', '尽快处理，IM 通知'],
        ['**P2 / Info**', '需关注但不紧急', '邮件 / 日报']
      ]
    },
    {
      kind: 'callout', tone: 'danger', title: '告警最佳实践',
      html: '①每条告警都要有**可执行的预案**，否则就是噪音；②告警要能反映**"用户受影响"** —— 不要只报"CPU 高"，要报"服务不可用"；③用 `for` 过滤抖动；④做好**分组与抑制**，避免告警风暴；⑤**定期复盘告警**，删掉无效告警、调整阈值；⑥告警分级，不同级别走不同通道。<br><br>**一句运维箴言："告警疲劳"比"没有告警"更危险** —— 当告警太多，人就会忽略它，真正的故障反而被淹没。'
    },
    {
      id: 's5-zabbix', chapter: '六、Zabbix', icon: 'server',
      chSub: '1998 年诞生的老牌企业级开源监控系统，功能全面、成熟稳定，采用 Agent 采集 + 数据库存储 + Web 界面的经典架构。',
      kind: 'table', title: 'Zabbix vs Prometheus', icon: 'target',
      head: ['对比', 'Zabbix', 'Prometheus'],
      rows: [
        ['**采集方式**', 'Agent 推送 / 被动采集', '**主动拉取（Pull）**'],
        ['**数据模型**', '相对固定（主机 + 监控项）', '**多维标签，极灵活**'],
        ['**查询语言**', '内置函数与触发器', '**PromQL**'],
        ['**动态环境**', '需手工维护主机', '**原生服务发现，适合 K8s**'],
        ['**适用场景**', '传统 IT 基础设施、网络设备', '云原生 / 容器 / AI 集群']
      ],
      note: '**选型建议**：传统 IT 与网络设备监控选 Zabbix；云原生、容器化、AI 集群选 Prometheus。两者也可以并存 —— Zabbix 管网络设备，Prometheus 管集群。'
    },
    {
      id: 's5-elk', chapter: '七、日志系统：ELK / Elastic Stack', icon: 'book',
      chSub: '传统方式"登录每台机器 tail -f 看日志"在 100 台机器面前彻底失效。集中式日志把所有机器的日志采集到一处，统一存储、检索、分析。',
      kind: 'table', title: 'ELK 四件套', icon: 'layers',
      head: ['组件', '角色', '作用'],
      rows: [
        ['**Elasticsearch（ES）**', '存储与检索', '分布式搜索引擎，存日志、快速检索'],
        ['**Logstash**', '数据处理管道', '采集、解析（Grok）、转换日志'],
        ['**Kibana**', '可视化', 'Web 界面，查询和展示日志'],
        ['**Beats / Filebeat**', '轻量采集器', '装在每台机器上采集日志']
      ],
      note: '**常见组合**：Filebeat（采集）→ Logstash（处理）→ Elasticsearch（存储）→ Kibana（展示）。Filebeat 比 Logstash 更轻量，通常部署在业务机器上；Logstash 功能更强，部署在中心节点做复杂处理。'
    },
    {
      kind: 'terms', title: 'Elasticsearch 核心概念', icon: 'book',
      items: [
        { t: 'Index', full: '索引', d: '文档的集合，类比数据库的"表"。' },
        { t: 'Document', full: '文档', d: '一条数据（JSON），类比一行记录。' },
        { t: 'Shard / Replica', d: '分片（索引的水平切分）与副本（分片的冗余），类比分表与主从。' },
        { t: '倒排索引', full: 'Inverted Index', d: '传统索引是"文档 → 内容"，倒排索引是**"词 → 包含它的文档列表"**。这让"搜索某个关键词"变得极快 —— **这就是 ES 能毫秒级检索海量日志的原因**。' },
        { t: 'NRT', full: 'Near Real-Time', d: '近实时。日志写入 ES 后默认 **1 秒内**可被检索到，不是"严格实时"但足够满足日志监控需求。' },
        { t: 'Grok', d: 'Logstash 用来**解析非结构化日志**的模式匹配语法，把一行日志拆成有意义的字段。例：`%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} \\[%{DATA:service}\\] %{GREEDYDATA:message}`。' }
      ]
    },
    {
      kind: 'flow', title: '日志数据流', icon: 'arrow',
      steps: [
        { t: '业务机器：应用日志', d: '应用把日志写到本地文件（**结构化 JSON 优先**，便于解析）。' },
        { t: 'Filebeat 采集', d: '轻量采集器读日志文件并转发，几乎不占资源。' },
        { t: 'Logstash 解析转换', d: '用 Grok 把非结构化日志拆成字段，清洗、丰富。' },
        { t: 'Elasticsearch 存储', d: '写入索引（分片 + 副本），建立倒排索引。' },
        { t: 'Kibana 检索展示', d: 'Discover 检索（KQL）、Visualize/Dashboard 图表、Alerting 基于日志告警。' }
      ]
    },
    {
      kind: 'callout', tone: 'key', title: '日志规范（运维基本功）',
      html: '好的日志应该：①**结构化**（JSON 优先），便于解析；②包含关键字段：时间戳、级别、服务名、**请求 ID**、错误堆栈；③分级清晰：DEBUG / INFO / WARN / ERROR / FATAL；④**有轮转** —— 用 logrotate 防止日志撑满磁盘。'
    },
    {
      id: 's5-gpu-mon', chapter: '八、AI 场景的监控', icon: 'chip',
      chSub: 'GPU 集群很贵，及时发现"卡住的训练任务"能省下大量算力成本 —— 这是 AI 运维区别于传统运维的核心价值点之一。',
      kind: 'table', title: 'DCGM Exporter 关键指标', icon: 'chip',
      head: ['指标', '含义'],
      rows: [
        ['`DCGM_FI_DEV_GPU_UTIL`', 'GPU 利用率'],
        ['`DCGM_FI_DEV_GPU_TEMP`', 'GPU 温度'],
        ['`DCGM_FI_DEV_FB_USED` / `FB_FREE`', '显存使用 / 空闲'],
        ['`DCGM_FI_DEV_POWER_USAGE`', '功耗'],
        ['`DCGM_FI_DEV_XID_ERRORS`', '**Xid 错误**（故障关键指标）'],
        ['`DCGM_FI_DEV_ECC_DBE_VOL_TOTAL`', '双比特 ECC 错误']
      ],
      note: '**AI 运维告警建议**：GPU 温度 > 85°C 告警；GPU 利用率长期为 0（卡被占但没干活）告警；**出现 Xid 错误 / ECC DBE 告警**（可能影响训练正确性）；显存接近上限告警。'
    },
    {
      kind: 'table', title: '集群监控要点', icon: 'grid',
      head: ['层面', '监控项'],
      rows: [
        ['**节点**', 'CPU、内存、磁盘、网络、温度'],
        ['**GPU**', '利用率、显存、温度、功耗、ECC、Xid'],
        ['**网络**', 'IB / RoCE 链路状态、带宽、错包'],
        ['**存储**', '容量、IO 延迟、吞吐'],
        ['**K8s**', 'Pod 状态、节点状态、GPU 分配率'],
        ['**任务**', '训练任务状态、进度、是否卡住']
      ]
    },
    {
      kind: 'cards', title: '训练任务监控四问', icon: 'target',
      items: [
        { icon: 'activity', t: '任务是否在跑', d: 'GPU 利用率是否持续 > 0。' },
        { icon: 'clock', t: '是否卡住', d: 'loss 是否还在下降、日志是否还在输出。' },
        { icon: 'alert', t: '是否失败', d: '任务退出码、异常日志。' },
        { icon: 'gauge', t: '资源效率', d: 'GPU 利用率是否偏低（说明有瓶颈，算力被浪费）。' }
      ]
    }
  ],
  checklist: [
    {
      t: '第 13 周 · Ansible',
      items: [
        '安装 Ansible，配置 `ansible.cfg` 和 `hosts.ini`',
        '用 `ansible all -m ping` 测试 3 台节点连通性',
        '用 ad-hoc 命令批量装软件、查磁盘、改文件',
        '写一个 Playbook：批量安装 Nginx + 启动服务 + 开机自启',
        '用 `template` 模块动态生成配置文件',
        '用 Handler 实现"配置变了才重启服务"',
        '把 Playbook 改造成 Role',
        '写一个批量巡检 Playbook（检查磁盘/内存/服务）',
        '用 `--check` 空跑验证，用 `--diff` 看差异',
        '用 Ansible Vault 加密一个密码文件'
      ]
    },
    {
      t: '第 14 周 · 监控与日志',
      items: [
        '部署 Prometheus + Node Exporter，采集主机指标',
        '在 Grafana 导入 Node Exporter Dashboard，看到图表',
        '写几条 PromQL（CPU 使用率、内存使用率、磁盘使用率）',
        '配置一条告警规则（如 CPU > 85%），用 `for` 过滤抖动',
        '部署 Alertmanager，配置告警路由到邮件/IM',
        '部署 DCGM Exporter，监控 GPU 指标',
        '搭建 ELK（或轻量版 Filebeat + ES + Kibana），集中检索日志',
        '配置 logrotate，防止日志撑满磁盘'
      ]
    }
  ],
  quiz: [
    { q: '什么是幂等性？为什么配置管理工具需要它？', a: '幂等性是同一操作执行一次和执行 N 次结果相同。配置管理工具需要它，才能让人放心地反复执行 Playbook —— 已经装好的软件不会重装、已经存在的配置不会重复追加，系统状态始终收敛到期望值，不会越跑越乱。' },
    { q: 'Ansible 为什么不需要在被管节点装 Agent？', a: '它基于 SSH 协议，控制节点把模块临时推送到被管节点执行（通常用 Python 解释器），执行完即清理，因此只要 SSH 能连通且被管节点有 Python 即可，无需常驻客户端。前提是配好 SSH 免密。' },
    { q: 'Inventory、Playbook、Role、Handler 分别是什么？', a: 'Inventory 是主机清单；Playbook 是一个或多个 Play 组成的 YAML 剧本；Role 是可复用的 Playbook 组织方式（tasks/handlers/templates/defaults/vars 目录结构）；Handler 是被 notify 触发的任务，如"配置变了才重启服务"。' },
    { q: 'Handler 有什么好处？为什么"配置没变就不重启"很重要？', a: 'Handler 只在被 notify 且任务状态为 changed 时才执行。配置没变就不重启，避免了无意义的中断 —— 对在线服务来说，一次多余重启就是一次可用性风险。这体现了幂等思维。' },
    { q: 'Ansible 的变量优先级是怎样的？', a: '大致从低到高：role defaults → inventory group_vars → inventory host_vars → play vars → task vars → 命令行 -e 传入的变量（extra vars，优先级最高）。记住"越具体、越靠近执行点，优先级越高"。' },
    { q: 'Ansible、SaltStack、Puppet 各有什么特点？怎么选？', a: 'Ansible 无代理、SSH + YAML，上手快，适合中小规模与快速落地；SaltStack 基于 ZeroMQ，需要 Agent，速度快，适合大规模；Puppet 需 Agent、DSL 描述式、成熟稳定，适合大型企业长期治理。**AI 运维优先学 Ansible**（学习成本低、无代理、够用）。' },
    { q: '监控的四大黄金指标是什么？USE 和 RED 分别用在哪？', a: '四大黄金指标：延迟、流量、错误、饱和度。USE 用于**资源**（Utilization 使用率、Saturation 饱和度、Errors 错误）；RED 用于**服务**（Rate 速率、Errors 错误、Duration 时长）。排查资源问题用 USE，排查服务问题用 RED。' },
    { q: 'Prometheus 的拉取模型和 Zabbix 的采集方式有什么区别？', a: 'Prometheus 是 Pull（主动定期 scrape 目标的 /metrics）；Zabbix 主要是 Agent 推送或被动的 Server 拉取。Pull 模型配合服务发现，更适合容器/云原生这种目标频繁变化的动态环境。' },
    { q: 'Counter 和 Gauge 有什么区别？为什么 Counter 要用 rate()？', a: 'Counter 是只增不减的累计值（请求总数），Gauge 是可增可减的瞬时值（温度、使用率）。Counter 的原始值本身没有意义（只增），必须用 rate() 算单位时间增长率，才能反映"当前每秒请求数"这类有意义的速率。' },
    { q: 'Prometheus 的数据模型（指标 + 标签）有什么优势？', a: '指标名描述"测什么"，标签描述"多维特征"（instance、job、cpu、mode 等）。优势是可以按任意标签维度做筛选、聚合、分组，无需预先定义固定表结构，非常灵活，特别适合多实例、多节点的动态环境。' },
    { q: '告警规则里的 `for` 字段起什么作用？', a: '`for` 要求条件**持续满足一段时间**才真正触发告警。它过滤掉瞬时抖动（如 CPU 一秒的尖峰），是减少误报的核心手段，避免告警风暴和告警疲劳。' },
    { q: 'Alertmanager 的路由、分组、抑制、静默分别解决什么问题？', a: '路由决定告警发给谁（按标签匹配接收者）；分组把同类告警合并成一条，避免告警风暴；抑制在高级别告警出现时屏蔽相关低级别告警（根因已知）；静默在计划维护期间临时屏蔽告警，避免打扰。' },
    { q: 'Zabbix 和 Prometheus 各自的适用场景是什么？', a: 'Zabbix 适合传统 IT 基础设施、网络设备、物理服务器监控，Agent + 数据库 + Web 架构成熟稳定；Prometheus 适合云原生、容器、K8s 与 AI 集群，标签模型灵活、原生服务发现、PromQL 强大。两者可并存。' },
    { q: 'ELK 各组件分别负责什么？', a: 'Elasticsearch 负责存储与检索（分布式搜索引擎）；Logstash 是数据处理管道（采集、Grok 解析、转换）；Kibana 提供可视化与检索界面；Beats/Filebeat 是装在业务机器上的轻量采集器。链路：Filebeat → Logstash → ES → Kibana。' },
    { q: '什么是倒排索引？为什么 ES 检索快？', a: '倒排索引是"词 → 包含该词的文档列表"的映射（相对传统"文档 → 内容"）。检索关键词时直接查这个词对应的文档列表，无需遍历所有文档，所以能在海量日志里做到毫秒级检索。' },
    { q: 'GPU 监控要关注哪些关键指标？为什么要特别关注 Xid？', a: '关注利用率、温度、显存使用、功耗、ECC 错误、Xid 错误。Xid 是 NVIDIA 驱动上报到内核日志的错误事件编号，往往意味着硬件或驱动层面出现故障（如 79/95 掉卡），可能导致训练任务失败或结果错误，必须立即告警处理。' },
    { q: '为什么说"告警疲劳"比"没有告警"更危险？', a: '告警过多、大量噪音时，运维人员会逐渐忽略告警通知，真正的严重故障就被淹没在噪音里，导致响应延迟甚至漏处理。所以要保证每条告警都有可执行预案、做好分组抑制与定期复盘，宁缺毋滥。' }
  ],
  glossary: [
    { t: 'IaC', d: 'Infrastructure as Code，基础设施即代码。' },
    { t: '幂等性', d: 'Idempotency，执行多次结果一致。' },
    { t: '配置漂移', d: 'Configuration Drift，配置偏离标准状态。' },
    { t: 'Ansible', d: '基于 Python 的无代理自动化配置管理工具。' },
    { t: 'Agentless', d: '无代理架构，只需 SSH 即可管理。' },
    { t: 'Inventory', d: 'Ansible 主机清单。' },
    { t: 'Playbook', d: 'Ansible 剧本（YAML）。' },
    { t: 'Role', d: 'Ansible 可复用角色，模块化组织 Playbook。' },
    { t: 'Handler', d: '被 notify 触发的任务（如重启服务）。' },
    { t: 'Jinja2', d: 'Ansible 模板引擎，template 模块底层。' },
    { t: 'Ad-hoc', d: '一次性命令（ansible -m）。' },
    { t: 'Ansible Vault', d: '敏感信息加密工具。' },
    { t: '黄金指标', d: 'Golden Signals：延迟 / 流量 / 错误 / 饱和度。' },
    { t: 'USE', d: 'Utilization / Saturation / Errors，资源监控方法论。' },
    { t: 'RED', d: 'Rate / Errors / Duration，服务监控方法论。' },
    { t: 'Prometheus', d: '云原生监控系统，CNCF 毕业项目。' },
    { t: 'Exporter', d: '把被监控对象的指标转换成 Prometheus 格式的程序。' },
    { t: 'TSDB', d: 'Time Series Database，时序数据库。' },
    { t: 'PromQL', d: 'Prometheus Query Language，查询语言。' },
    { t: 'Counter', d: '只增不减的累计计数器。' },
    { t: 'Gauge', d: '可增可减的瞬时值仪表盘。' },
    { t: 'Histogram', d: '直方图，统计分布（分桶）。' },
    { t: 'Summary', d: '摘要，统计分布（分位数）。' },
    { t: 'scrape', d: 'Prometheus 主动拉取指标的动作。' },
    { t: '服务发现', d: 'Service Discovery，自动发现监控目标。' },
    { t: 'Grafana', d: '开源可视化平台，渲染仪表盘。' },
    { t: 'Alertmanager', d: 'Prometheus 生态的告警处理组件。' },
    { t: '路由 / 分组 / 抑制 / 静默', d: 'Alertmanager 的告警四大机制。' },
    { t: 'Zabbix', d: '老牌企业级开源监控系统。' },
    { t: 'ELK', d: 'Elasticsearch / Logstash / Kibana 日志方案。' },
    { t: 'Elasticsearch', d: '分布式搜索引擎，存日志并快速检索。' },
    { t: 'Logstash', d: '日志处理管道（采集、解析、转换）。' },
    { t: 'Kibana', d: '日志可视化与检索界面。' },
    { t: 'Filebeat', d: '轻量日志采集器。' },
    { t: 'Index', d: 'ES 索引，文档的集合。' },
    { t: 'Shard / Replica', d: 'ES 分片 / 副本。' },
    { t: '倒排索引', d: 'Inverted Index，词 → 文档映射，ES 检索快的根本。' },
    { t: 'Grok', d: 'Logstash 的日志解析模式语法。' },
    { t: 'NRT', d: 'Near Real-Time，近实时（默认 1 秒内可检索）。' },
    { t: 'logrotate', d: '日志轮转工具，防止日志撑满磁盘。' },
    { t: 'DCGM', d: 'Data Center GPU Manager，GPU 监控与管理。' },
    { t: 'DCGM Exporter', d: '把 GPU 指标以 Prometheus 格式暴露。' },
    { t: 'Xid', d: 'NVIDIA 驱动上报的错误事件编号，GPU 故障关键指标。' }
  ]
});
