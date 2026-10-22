(window.AIOPS_STAGES = window.AIOPS_STAGES || []).push({
  id: 's4', num: 4, title: '容器与 Kubernetes', icon: 'container', accent: '#a78bfa', weeks: '第 10–12 周',
  desc: '从"手工装环境"进化到"镜像一次构建、到处运行"，再用 K8s 在成百上千台机器上自动调度。对 AI 运维来说，最值钱的是第 12 周 —— GPU 如何接入 K8s。',
  timeline: 'Docker 打基础（镜像/容器/网络/卷）→ 理解运行时生态（OCI/CRI）→ K8s 架构与核心对象 → GPU Device Plugin 与 GPU Operator → 故障排查。',
  tags: ['Docker', 'COW', 'OCI/CRI', 'containerd', 'K8s', 'Pod', 'Deployment', 'Service', 'Device Plugin', 'GPU Operator'],
  quote: 'CUDA、PyTorch 版本极易冲突 —— 容器把环境固化，终结"依赖地狱"。而在 K8s 里，GPU 不是通用资源：它必须靠 Device Plugin 才能被调度器看见，这是 AI 运维区别于普通运维的分水岭。',
  deliverables: [
    '一个自己写的 Dockerfile 打出的镜像（含依赖分层优化）',
    '一个能跑通 Deployment + Service + 滚动更新的 K8s 集群',
    '一份 Pod 异常状态排查手册（Pending / CrashLoopBackOff / OOMKilled…）',
    '一套 GPU 接入 K8s 的验证记录（device-plugin + GPU Pod + DCGM 指标）'
  ],
  sections: [
    {
      id: 's4-why', chapter: '一、容器为什么出现', icon: 'cube',
      chSub: '容器解决的核心问题："在我机器上能跑，到你机器上就跑不起来" —— 把应用和依赖环境打包在一起，到哪都一致。',
      kind: 'compare', title: '虚拟机 vs 容器', icon: 'container',
      left: { title: '虚拟机（VM）', items: ['硬件级隔离（Hypervisor）', '**含完整 Guest OS**', '启动分钟级', '体积 GB 级', '资源开销大', '一台机器几十个', '隔离强度**强**'] },
      right: { title: '容器（Container）', items: ['进程级隔离（内核机制）', '**共享宿主机内核**', '启动**秒级甚至毫秒级**', '体积 MB 级', '资源开销小', '一台机器几百个', '隔离强度相对弱'] }
    },
    {
      kind: 'viz', viz: 'container-vm', icon: 'container',
      title: '虚拟机 vs 容器：架构与启动速度',
      hint: '点击"重新计时"，看两者启动速度差距',
      caption: '**一句话比喻**：虚拟机是"独立小房子"，容器是"合租房里的独立房间" —— 共享地基（内核），但各有独立空间。**Hypervisor** 是虚拟化层（VMM）：Type 1 裸金属（ESXi、KVM）直接跑在硬件上，Type 2 宿主型（VMware Workstation、VirtualBox）跑在操作系统上。'
    },
    {
      kind: 'table', title: '容器隔离的两大内核机制', icon: 'lock',
      head: ['机制', '作用', '隔离什么'],
      rows: [
        ['**Namespace（命名空间）**', '**隔离"看得见什么"**', 'PID、网络、挂载点、主机名、IPC、用户'],
        ['**Cgroups（控制组）**', '**限制"能用多少"**', 'CPU、内存、磁盘 IO、网络带宽']
      ],
      note: '**Namespace 管"看不见"，Cgroups 管"吃不下"** —— 两者合起来才是一个完整的容器。Docker 的 `--cpus`、`--memory` 底层就是在配置 Cgroups。'
    },
    {
      kind: 'cards', title: '为什么 AI 场景需要容器', icon: 'chip',
      items: [
        { icon: 'layers', t: '环境一致', d: 'CUDA、PyTorch 版本极易冲突，容器把环境固化，避免"依赖地狱"。' },
        { icon: 'rocket', t: '快速交付', d: '镜像一次构建、到处运行，交付效率高。' },
        { icon: 'grid', t: '资源调度', d: 'K8s 能统一调度 GPU 资源，提高利用率。' },
        { icon: 'activity', t: '弹性伸缩', d: '推理服务可随流量自动扩缩容。' },
        { icon: 'shield', t: '多租户', d: '一个集群给多个团队用，隔离且公平。' }
      ]
    },
    {
      id: 's4-image', chapter: '二、镜像分层与写时复制', icon: 'layers',
      chSub: '镜像 = 多个只读层叠加；容器 = 镜像 + 一个可写层。改文件时"先复制到可写层再改"，原镜像层不变。',
      kind: 'viz', viz: 'image-layers', icon: 'layers',
      title: '镜像分层与 COW',
      hint: '点击各层，看 Dockerfile 指令与缓存的关系',
      caption: '**容器 = 镜像（只读层）+ 容器层（可写层）**。容器里的一切修改都写在可写层，删掉容器可写层就没了 —— 所以数据必须用**数据卷**持久化。'
    },
    {
      kind: 'code', title: '一个规范的 Dockerfile', icon: 'code', lang: 'dockerfile', file: 'Dockerfile',
      code: `# 1. 基础镜像
FROM python:3.11-slim

# 2. 设置工作目录
WORKDIR /app

# 3. 先复制依赖清单（利用缓存）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. 再复制代码（代码常变，放后面）
COPY . .

# 5. 声明端口（仅文档作用）
EXPOSE 8000

# 6. 环境变量
ENV PYTHONUNBUFFERED=1

# 7. 启动命令（容器启动时执行）
CMD ["python", "app.py"]`,
      note: '**优化技巧**：把不常变的指令放前面（装依赖），常变的放后面（复制代码），构建时就能**命中缓存**，速度大幅提升。**关键区分**：`RUN` 在**构建时**执行并固化进层；`CMD` / `ENTRYPOINT` 在**容器启动时**执行。'
    },
    {
      id: 's4-runtime', chapter: '三、容器运行时与生态', icon: 'git',
      chSub: 'OCI 定标准，CRI 是 K8s 的接口，containerd 干活，runc 真正跑容器。',
      kind: 'terms', title: '从标准到实现', icon: 'git',
      items: [
        { t: 'OCI', full: 'Open Container Initiative', d: '容器开放标准，规定镜像格式与运行时规范，让容器生态"可互换"。' },
        { t: 'CRI', full: 'Container Runtime Interface', d: 'K8s 定义的高级运行时接口。kubelet 通过 CRI 调用运行时，不关心底层是 containerd 还是 CRI-O。' },
        { t: 'containerd', d: '主流的高级容器运行时，负责镜像管理、容器生命周期。**K8s 默认选择**。' },
        { t: 'CRI-O', d: '专为 K8s 设计的轻量运行时。' },
        { t: 'runc', d: '底层的 OCI 运行时，真正调用 Linux 内核机制创建容器进程。' }
      ]
    },
    {
      kind: 'callout', tone: 'warn', title: '为什么 K8s 弃用 Docker？',
      html: 'K8s 早期通过 **dockershim** 调用 Docker，但 Docker 本身不实现 CRI。K8s 1.24 起移除 dockershim，直接对接 containerd。**注意：Docker 构建的镜像仍然能用** —— 因为镜像格式遵循 OCI 标准，Docker 只是"构建工具"，不再是"运行时"。'
    },
    {
      id: 's4-arch', chapter: '四、Kubernetes 架构', icon: 'grid',
      chSub: 'K8s 解决的核心问题：在成百上千台机器上，自动部署、调度、扩缩容、自愈容器化应用。',
      kind: 'table', title: '控制平面组件（Control Plane）', icon: 'server',
      head: ['组件', '作用', '类比'],
      rows: [
        ['**kube-apiserver**', '集群的"唯一入口"，所有操作都经过它', '前台 / 总机'],
        ['**etcd**', '分布式键值存储，保存**集群所有状态**', '大脑记忆'],
        ['**kube-scheduler**', '决定 Pod 调度到哪个节点', '调度员'],
        ['**kube-controller-manager**', '运行各种控制器，维持期望状态', '管理者'],
        ['cloud-controller-manager', '对接云平台（可选）', '云接口']
      ],
      note: '**etcd 挂了，集群就瘫痪** —— 它是 K8s 的"唯一数据源"，生产环境必须做**多节点集群 + 定期备份**。**调度器三步走**：过滤（Filter）→ 打分（Score）→ 选择，综合考虑资源、亲和性、污点。'
    },
    {
      kind: 'table', title: '工作节点组件（Node）', icon: 'server',
      head: ['组件', '作用'],
      rows: [
        ['**kubelet**', '节点上的"代理"，负责管理本节点的 Pod 和容器，持续上报状态'],
        ['**kube-proxy**', '实现 Service 的网络转发规则（iptables / IPVS，IPVS 性能更好）'],
        ['**容器运行时**', 'containerd / CRI-O，真正跑容器']
      ]
    },
    {
      kind: 'hflow', title: '一次 Pod 创建的完整流程', icon: 'arrow',
      steps: [
        { t: 'kubectl apply', d: '`kubectl apply -f pod.yaml` 提交期望状态。' },
        { t: 'apiserver 写入 etcd', d: 'kube-apiserver 接收请求，写入 etcd 持久化。' },
        { t: 'scheduler 调度', d: 'kube-scheduler 监听到"有 Pod 待调度"，过滤 + 打分 → 选出节点 → 更新 etcd。' },
        { t: 'kubelet 创建容器', d: '目标节点的 kubelet 监听到"该我干活了"，调用 CRI 运行时创建容器。' },
        { t: 'kube-proxy 更新规则', d: '如有 Service，更新网络转发规则。' },
        { t: '状态上报', d: 'kubelet 上报 Pod 状态 → apiserver → etcd，完成闭环。' }
      ]
    },
    {
      kind: 'callout', tone: 'key', title: '声明式与调谐循环（Reconciliation Loop）',
      html: '你只**声明"我想要什么"**（如"我要 3 个 nginx 副本"），K8s 负责把现实变成你要的样子。它持续对比**期望状态**与**实际状态**，一旦不一致就自动调整 —— **这就是 K8s 自愈能力的根本原理**。'
    },
    {
      id: 's4-objects', chapter: '五、K8s 核心对象（重点）', icon: 'cube',
      chSub: 'Pod 是最小部署单元，但**不要直接创建裸 Pod** —— 挂了不会自动重建，生产环境用 Deployment / StatefulSet 管理。',
      kind: 'table', title: 'Pod 的核心特点', icon: 'cube',
      head: ['特点', '说明'],
      rows: [
        ['**原子调度单位**', '调度器以 Pod 为单位调度'],
        ['**共享网络**', '同 Pod 内容器共享 IP 和端口空间（用 localhost 通信）'],
        ['**共享存储**', '可以挂载同一个 Volume'],
        ['**生命周期短**', 'Pod 不是"宠物"是"牲口"，随时可能被销毁重建']
      ]
    },
    {
      kind: 'table', title: '工作负载（Workload）', icon: 'layers',
      head: ['对象', '用途', '特点'],
      rows: [
        ['**Deployment**', '**无状态应用**（最常用）', '管理 ReplicaSet，支持滚动更新 / 回滚'],
        ['**StatefulSet**', '**有状态应用**（数据库、分布式存储）', '稳定的网络标识、有序部署、独立存储'],
        ['**DaemonSet**', '**每个节点跑一个**', '日志采集、监控 Agent、GPU device-plugin'],
        ['**Job**', '**一次性任务**', '跑完就结束（如数据迁移）'],
        ['**CronJob**', '**定时任务**', '按 cron 表达式周期执行']
      ],
      note: '**滚动更新（Rolling Update）**：更新时逐个替换 Pod（先起新的，再停旧的），保证服务不中断；出问题可 `kubectl rollout undo` 一键回滚。'
    },
    {
      kind: 'table', title: 'Service 的四种类型', icon: 'link',
      head: ['类型', '说明', '场景'],
      rows: [
        ['**ClusterIP**', '集群内部虚拟 IP（默认）', '集群内服务互访'],
        ['**NodePort**', '在每个节点开一个端口暴露', '外部临时访问'],
        ['**LoadBalancer**', '通过云厂商负载均衡暴露', '生产对外服务'],
        ['**ExternalName**', '映射到外部域名', '访问集群外服务']
      ],
      note: '**Label 与 Selector 是 K8s 最核心的"关联机制"**：Label 是贴在对象上的键值对（`app=web`），Selector 按标签筛选 —— **Service 靠 Selector 找到它要代理的 Pod**。'
    },
    {
      kind: 'code', title: 'Deployment + Service 最小组合', icon: 'code', lang: 'yaml', file: 'web.yaml',
      code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3                  # 期望 3 个副本
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx:1.25
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web-svc
spec:
  selector:
    app: web               # 选中带 app=web 标签的 Pod
  ports:
  - port: 80               # Service 端口
    targetPort: 80         # 容器端口
  type: ClusterIP`,
      note: '**YAML 四个必填字段**：`apiVersion`、`kind`、`metadata`、`spec`。**Ingress** 是集群的"七层入口"，按域名/路径路由到不同 Service；但它只是**规则定义**，真正干活的是 **Ingress Controller**（Nginx Ingress / Traefik）。**存储三件套**：PV（存储资源）→ PVC（用户的申请）→ StorageClass（定义如何动态创建 PV）。**Secret 只是 Base64 编码，不是加密**，生产要配合 etcd 加密、RBAC、Vault。'
    },
    {
      id: 's4-pod', chapter: '六、Pod 生命周期', icon: 'refresh',
      chSub: '从 Pending 到 Running，再到 Terminating —— 每个阶段卡住，都对应一类典型故障。',
      kind: 'viz', viz: 'pod-lifecycle', icon: 'refresh',
      title: 'Pod 生命周期状态机',
      hint: '逐步推进，观察每个阶段的事件',
      caption: '理解这条状态机，排查时就能"按状态找原因"：Pending 看调度（资源/亲和性），ContainerCreating 看镜像与卷，Running 不 Ready 看探针，Terminating 卡住看 finalizer。'
    },
    {
      id: 's4-gpu', chapter: '七、GPU 与 Kubernetes（第 12 周重点）', icon: 'chip',
      chSub: '本阶段对 AI 运维最有价值的部分。GPU 不像 CPU/内存那样是"通用资源"，K8s 默认不认识它，需要额外机制接入。',
      kind: 'cards', title: '为什么 GPU 需要特殊处理', icon: 'chip',
      items: [
        { icon: 'cube', t: '扩展资源', d: 'K8s 原生只认 CPU、内存，GPU 需要**自定义资源**（如 `nvidia.com/gpu`）。' },
        { icon: 'bolt', t: '需要驱动与运行时', d: '容器里要用 GPU，必须把驱动库和 GPU 设备暴露给容器。' },
        { icon: 'target', t: '分配粒度特殊', d: 'GPU 通常**整卡分配**（不像 CPU 能切 0.1 核），所以只能写在 `limits` 里。' },
        { icon: 'shield', t: '需要健康感知', d: 'GPU 故障要能被识别并隔离（Xid 错误、ECC 错误）。' }
      ]
    },
    {
      kind: 'viz', viz: 'gpu-plugin', icon: 'chip',
      title: 'Device Plugin 接入流水线',
      hint: '点击播放，看 GPU 如何被调度器"看见"',
      caption: '**Device Plugin 是 K8s 调度器与底层硬件之间的"翻译层"**。关键接口：`Register`（注册）、`ListAndWatch`（上报设备与健康状态）、`Allocate`（分配设备给容器）；通过 `/var/lib/kubelet/device-plugins/` 下的 Unix Socket 与 kubelet 通信。'
    },
    {
      kind: 'code', title: '部署 nvidia-device-plugin 与 GPU Pod', icon: 'code', lang: 'bash', file: 'gpu.sh',
      code: `# 以 DaemonSet 方式部署（每个 GPU 节点一个）
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/main/nvidia-device-plugin.yml

# 验证节点上的 GPU 资源
kubectl describe node <gpu-node> | grep -A 5 "Capacity"
# 应看到: nvidia.com/gpu: 8`,
      note: '**NVML（NVIDIA Management Library）**：NVIDIA 的管理库，能查询 GPU 状态（温度、显存、ECC）。**device-plugin 底层靠 NVML 获取 GPU 信息** —— 你用的 `nvidia-smi` 也是基于它。'
    },
    {
      kind: 'code', title: 'GPU Pod 示例', icon: 'code', lang: 'yaml', file: 'gpu-test.yaml',
      code: `apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
spec:
  containers:
  - name: cuda
    image: nvidia/cuda:12.4.0-base-ubuntu22.04
    command: ["nvidia-smi"]
    resources:
      limits:
        nvidia.com/gpu: 1        # 申请 1 张 GPU（注意：GPU 只在 limits 里写）`,
      note: '**注意**：GPU 资源只能写在 `limits` 里（不能只写 requests），因为 GPU 不支持"部分分配"。**常见坑**：容器里报 `no CUDA-capable device is detected` → 通常是 **NVIDIA Container Toolkit 没装/没配**，或 **device-plugin 没正常工作**。'
    },
    {
      kind: 'table', title: 'GPU 共享方案', icon: 'layers',
      head: ['方案', '原理', '隔离级别', '说明'],
      rows: [
        ['**整卡**', '一张卡给一个 Pod', '最强', '默认方式'],
        ['**MPS**', 'Multi-Process Service，多进程共享一张卡', '中', '多个进程并发使用'],
        ['**Time-Slicing**', '时间片轮转共享', '弱', '**配置简单，最常用**'],
        ['**MIG**', 'Multi-Instance GPU，硬件级切分', '**强**', 'A100/H100 支持，把卡切成多个独立实例']
      ],
      note: '**MIG** 适合推理场景（多个小模型共享一张卡），每个实例有独立显存和计算单元，互相隔离。**Time-Slicing** 像 CPU 时间片，配置简单但隔离性弱（一个容器占满会影响其他）。'
    },
    {
      kind: 'table', title: 'GPU Operator 管理的关键组件', icon: 'grid',
      head: ['组件', '作用'],
      rows: [
        ['**NVIDIA Driver**', '容器化部署 GPU 驱动（裸金属场景）'],
        ['**Container Toolkit**', '让容器能用 GPU'],
        ['**Device Plugin**', '把 GPU 注册为可调度资源'],
        ['**DCGM Exporter**', '导出 GPU 监控指标给 Prometheus'],
        ['**GPU Feature Discovery (GFD)**', '给节点打上 GPU 特征标签（型号、显存等），便于调度'],
        ['**MIG Manager**', '管理 MIG 配置'],
        ['**Node Feature Discovery (NFD)**', '识别节点硬件特征'],
        ['**Validator**', '验证各组件是否正常']
      ],
      note: '**GPU Operator 用 CRD + 控制器的方式，自动化部署和管理整套 GPU 软件栈** —— 从驱动、容器运行时、device-plugin 到监控，一个 YAML 全搞定，**大幅降低 GPU 集群运维成本**，是大规模 AI 平台的标准做法。'
    },
    {
      kind: 'callout', tone: 'key', title: 'DCGM Exporter：GPU 监控标准方案',
      html: '把 **DCGM 采集的 GPU 指标**以 Prometheus 格式暴露。关键指标：`DCGM_FI_DEV_GPU_UTIL`（利用率）、`DCGM_FI_DEV_GPU_TEMP`（温度）、`DCGM_FI_DEV_FB_USED`（显存）、`DCGM_FI_DEV_XID_ERRORS`（Xid 错误）。安装：`helm install -n gpu-operator --create-namespace nvidia/gpu-operator`。'
    },
    {
      id: 's4-debug', chapter: '八、K8s 故障排查', icon: 'search',
      chSub: '排查四步法背下来：看状态 → 看事件 → 看日志 → 进容器。Events 里写了原因，是信息量最大的一步。',
      kind: 'flow', title: '排查四步法（背下来）', icon: 'search',
      steps: [
        { t: 'kubectl get pod', d: '看状态：Pending? CrashLoopBackOff? OOMKilled? —— 状态本身就是线索。' },
        { t: 'kubectl describe pod', d: '看 **Events**（关键！里面写了原因：调度失败、拉镜像失败、探针失败）。' },
        { t: 'kubectl logs pod', d: '看容器日志；崩溃过的用 `--previous` 看上一次崩溃的日志。' },
        { t: 'kubectl exec -it pod -- bash', d: '进容器内部排查（网络、文件、进程、配置）。' }
      ]
    },
    {
      kind: 'table', title: 'Pod 常见异常状态', icon: 'alert',
      head: ['状态', '含义', '常见原因', '排查方向'],
      rows: [
        ['**Pending**', '未被调度', '资源不足、无可用节点、亲和性不满足', '`describe` 看 Events'],
        ['**ContainerCreating**', '正在创建', '拉镜像慢、挂载卷失败', '`describe` 看事件'],
        ['**ImagePullBackOff / ErrImagePull**', '镜像拉取失败', '镜像名错、私有仓库认证失败、网络不通', '检查镜像名与 Secret'],
        ['**CrashLoopBackOff**', '反复崩溃重启', '**应用报错**、配置错误、资源限制过小', '`logs --previous` 看崩溃日志'],
        ['**Running 但 Not Ready**', '就绪探针失败', '健康检查路径 / 端口不对', '检查探针配置'],
        ['**OOMKilled**', '内存超限被杀', 'memory limit 太小 / 内存泄漏', '调大 limit 或修程序'],
        ['**Terminating 卡住**', '无法删除', 'finalizer、挂载卷卸载失败', '检查 finalizer'],
        ['**Evicted**', '被驱逐', '节点资源不足', '检查节点资源']
      ],
      note: '**CrashLoopBackOff**：容器反复启动又崩溃，K8s 用**指数退避**（10s、20s、40s…）延迟重启。**根因几乎都在应用本身** —— 看 `--previous` 日志。**OOMKilled**：内存超过 limit 被内核 OOM Killer 杀掉。'
    },
    {
      kind: 'table', title: 'GPU Pod 排查速查', icon: 'chip',
      head: ['现象', '原因', '解决'],
      rows: [
        ['Pod 一直 **Pending**', '申请了 GPU 但节点没资源', '`kubectl describe node` 看 `nvidia.com/gpu` 可用量'],
        ['容器内 `nvidia-smi` 报错', 'Container Toolkit 未配', '检查 GPU Operator / toolkit'],
        ['`no CUDA-capable device`', 'device-plugin 异常', '检查 device-plugin DaemonSet 日志'],
        ['调度到了无 GPU 的节点', '未加 nodeSelector', '加 `nodeSelector: nvidia.com/gpu.present: "true"`'],
        ['GPU 利用率低', '未做共享 / 调度不合理', '考虑 MPS / Time-Slicing']
      ]
    },
    {
      kind: 'code', title: '排查命令速查', icon: 'terminal', lang: 'bash', file: 'k8s-debug.sh',
      code: `# 查看
kubectl get pods -A -o wide          # 看 Pod 状态
kubectl describe pod X               # 看事件（关键）
kubectl logs X [--previous] [-f]     # 看日志
kubectl exec -it X -- bash           # 进容器
kubectl get endpoints X              # 看 Service 后端
kubectl top nodes / pods             # 资源使用

# 网络排查
kubectl exec -it pod1 -- curl pod2-ip        # 测 Pod 间连通性
kubectl exec -it pod1 -- nslookup svc-name   # 测 DNS 解析
kubectl get pods -n kube-system              # 检查 CoreDNS / CNI

# 节点排查（kubectl 查不出时深挖）
systemctl status kubelet / journalctl -u kubelet -f
crictl ps / crictl logs              # 面向 CRI 运行时的容器排查工具`,
      note: '**crictl** 是面向 CRI 运行时的命令行工具，当 kubectl 查不出问题时，登录节点用 crictl 深挖。**CoreDNS** 挂了，服务间按名字访问就会失败。'
    }
  ],
  checklist: [
    {
      t: '第 10 周 · Docker',
      items: [
        '安装 Docker，跑通 `docker run hello-world`',
        '写一个 Dockerfile，把一个小程序（如 Python Flask）打成镜像',
        '用 `docker run -d -p` 启动容器并访问',
        '用 `docker exec` 进入容器排查问题',
        '用数据卷持久化数据，验证容器删除后数据还在',
        '创建一个自定义 Docker 网络，让两个容器互相访问',
        '搭建一个 Harbor 私有仓库（可选）'
      ]
    },
    {
      t: '第 11 周 · K8s',
      items: [
        '用 minikube 或 kubeadm 搭一个集群',
        '用 `kubectl run` 跑第一个 Pod',
        '用 YAML 创建一个 Deployment（3 副本）+ Service，并访问',
        '体验滚动更新与回滚（`set image` → `rollout undo`）',
        '用 ConfigMap 注入配置',
        '故意制造一个 `CrashLoopBackOff`，用四步法排查出来',
        '用 `kubectl scale` 扩缩容'
      ]
    },
    {
      t: '第 12 周 · GPU on K8s',
      items: [
        '在 GPU 节点上部署 nvidia-device-plugin',
        '用 `kubectl describe node` 确认 `nvidia.com/gpu` 资源已注册',
        '部署一个 GPU Pod，运行 `nvidia-smi`',
        '（进阶）部署 GPU Operator，观察各组件',
        '配置一个 Time-Slicing 共享方案',
        '用 DCGM Exporter + Prometheus 采集 GPU 指标'
      ]
    }
  ],
  quiz: [
    { q: '容器和虚拟机的本质区别是什么？', a: '虚拟机是硬件级隔离，含完整 Guest OS，启动分钟级、体积 GB 级、隔离强；容器是进程级隔离，共享宿主机内核，靠 Namespace + Cgroups 实现，启动秒级、体积 MB 级、隔离相对弱。' },
    { q: 'Namespace 和 Cgroups 分别解决什么问题？', a: 'Namespace 隔离"看得见什么"（PID、NET、MNT、UTS、IPC、USER）；Cgroups 限制"能用多少"（CPU、内存、磁盘 IO、网络带宽）。Namespace 管"看不见"，Cgroups 管"吃不下"。' },
    { q: '镜像分层和写时复制是什么？为什么要这样设计？', a: '镜像由多个只读层叠加，每层是一次文件系统变更；多个镜像可共享相同底层，省空间。COW 指容器在镜像上加一个可写层，读直接读镜像层，修改时先复制到可写层再改，原镜像层不变。这样镜像可复用、容器改动不影响镜像。' },
    { q: '`CMD` 和 `ENTRYPOINT` 有什么区别？', a: '两者都在容器启动时执行。CMD 提供默认命令与参数，可被 `docker run` 后的命令覆盖；ENTRYPOINT 定义固定的入口，参数追加在后面。常用组合：ENTRYPOINT 定程序，CMD 定默认参数。' },
    { q: 'Docker 的 `bridge` 和 `host` 网络模式有什么区别？', a: 'bridge 是默认模式，容器有独立网络命名空间和虚拟网卡，通过 NAT 出网、端口映射暴露；host 模式下容器直接共享宿主机网络栈，无隔离、性能好但端口冲突风险高。' },
    { q: 'OCI、CRI、containerd、runc 分别是什么？它们什么关系？', a: 'OCI 是容器开放标准（镜像格式 + 运行时规范）；CRI 是 K8s 定义的高级运行时接口；containerd 是主流高级运行时（实现 CRI）；runc 是底层 OCI 运行时，真正调内核创建容器。层次：K8s → CRI → containerd → runc → 内核。' },
    { q: '为什么 K8s 移除了 dockershim？Docker 构建的镜像还能用吗？', a: 'Docker 本身不实现 CRI，K8s 需要额外维护 dockershim 适配层，所以 1.24 起移除，直接对接 containerd。镜像仍然能用，因为镜像格式遵循 OCI 标准，Docker 只是构建工具，不再是运行时。' },
    { q: '画出一次 Pod 从创建到运行的完整流程。', a: 'kubectl apply → apiserver 写入 etcd → scheduler 监听到待调度 Pod，过滤+打分选节点并更新 etcd → 目标节点 kubelet 监听到，调用 CRI 运行时创建容器 → kube-proxy 更新网络规则 → kubelet 上报 Pod 状态到 apiserver/etcd。' },
    { q: 'requests 和 limits 有什么区别？超过 limits 会怎样？', a: 'requests 是调度依据（节点至少要保证这么多资源），limits 是使用上限。CPU 超过 limits 会被限流（throttle），内存超过 limits 会被内核 OOM Killer 杀掉（OOMKilled）。' },
    { q: 'Deployment、StatefulSet、DaemonSet 分别适合什么场景？', a: 'Deployment 用于无状态应用，支持滚动更新/回滚；StatefulSet 用于有状态应用（数据库、分布式存储），提供稳定网络标识与有序部署；DaemonSet 保证每个节点跑一个（日志采集、监控 Agent、device-plugin）。' },
    { q: 'Service 的四种类型分别是什么？', a: 'ClusterIP（集群内虚拟 IP，默认）、NodePort（每个节点开端口暴露）、LoadBalancer（云厂商负载均衡）、ExternalName（映射到外部域名）。' },
    { q: 'Label 和 Selector 是如何把 Service 和 Pod 关联起来的？', a: 'Label 是贴在对象上的键值对（如 app=web）；Selector 按标签筛选对象。Service 的 spec.selector 匹配 Pod 的 labels，从而确定要代理哪些 Pod —— 这是 K8s 最核心的关联机制（松耦合）。' },
    { q: 'PV、PVC、StorageClass 三者是什么关系？', a: 'PV 是集群级存储资源（云盘、NFS 目录）；PVC 是用户对存储的申请（要多大、什么模式）；StorageClass 定义如何动态创建 PV。用户建 PVC → StorageClass 自动创建 PV → PVC 绑定 PV → Pod 挂载 PVC。' },
    { q: 'Device Plugin 是怎么把 GPU 接入 K8s 的？', a: 'Device Plugin 通过 Unix Socket 向 kubelet 注册 → 上报本节点 GPU 数量与 ID → kubelet 上报给 apiserver（nvidia.com/gpu: 8）→ 用户 Pod 申请 → 调度器按资源选节点 → kubelet 调 Allocate 接口获取设备节点与驱动库路径 → 容器启动可访问 GPU。关键接口：Register、ListAndWatch、Allocate。' },
    { q: 'GPU Operator 包含哪些组件？它解决了什么问题？', a: '包含 NVIDIA Driver、Container Toolkit、Device Plugin、DCGM Exporter、GFD、MIG Manager、NFD、Validator。它用 CRD + 控制器自动化部署和管理整套 GPU 软件栈，免去手工装驱动/配运行时/装插件，大幅降低 GPU 集群运维成本。' },
    { q: 'MIG、MPS、Time-Slicing 有什么区别？分别适合什么场景？', a: 'MIG 是硬件级切分（A100/H100），实例间显存与算力独立隔离，隔离最强，适合推理多小模型；MPS 是多进程共享一张卡，隔离中等；Time-Slicing 是时间片轮转，配置最简单但隔离最弱，一个容器占满会影响其他。' },
    { q: 'Pod 一直 Pending，你的排查步骤是什么？', a: '①`kubectl describe pod` 看 Events 找原因；②若是资源不足，`kubectl describe node` 看可分配资源；③检查亲和性/污点容忍是否满足；④GPU Pod 看 `nvidia.com/gpu` 是否已被占满；⑤检查 PVC 是否绑定成功。' },
    { q: '`CrashLoopBackOff` 和 `OOMKilled` 分别怎么排查？', a: 'CrashLoopBackOff 是容器反复崩溃，K8s 指数退避重启，根因几乎都在应用本身 —— 用 `kubectl logs --previous` 看上次崩溃日志、检查配置与启动命令。OOMKilled 是内存超 limit 被 OOM Killer 杀掉 —— 调大 memory limit 或排查内存泄漏，`kubectl describe pod` 能看到 Reason: OOMKilled。' }
  ],
  glossary: [
    { t: '镜像', d: 'Image，只读模板，分层存储。' },
    { t: '容器', d: 'Container，镜像的运行实例（镜像 + 可写层）。' },
    { t: '仓库', d: 'Registry，存放与分发镜像（Docker Hub、Harbor）。' },
    { t: 'Dockerfile', d: '构建镜像的脚本。' },
    { t: 'COW', d: 'Copy-on-Write，写时复制。' },
    { t: 'Namespace', d: '命名空间，内核隔离机制（管"看不见"）。' },
    { t: 'Cgroups', d: 'Control Groups，内核资源限制（管"吃不下"）。' },
    { t: 'OCI', d: 'Open Container Initiative，容器开放标准。' },
    { t: 'CRI', d: 'Container Runtime Interface，K8s 运行时接口。' },
    { t: 'containerd', d: '主流容器运行时，K8s 默认选择。' },
    { t: 'CRI-O', d: '为 K8s 设计的轻量运行时。' },
    { t: 'runc', d: '底层 OCI 运行时，真正创建容器进程。' },
    { t: '数据卷', d: 'Volume，容器外的持久化存储。' },
    { t: 'Harbor', d: '企业级私有镜像仓库。' },
    { t: 'K8s', d: 'Kubernetes，容器编排系统。' },
    { t: '控制平面', d: 'Control Plane，集群管理组件集合。' },
    { t: 'apiserver', d: 'kube-apiserver，集群唯一入口。' },
    { t: 'etcd', d: '分布式键值存储，集群状态数据库。' },
    { t: 'scheduler', d: 'kube-scheduler，决定 Pod 调度到哪。' },
    { t: 'controller-manager', d: 'kube-controller-manager，维持期望状态。' },
    { t: 'kubelet', d: '节点代理，管理本节点 Pod 与容器。' },
    { t: 'kube-proxy', d: 'Service 网络转发（iptables/IPVS）。' },
    { t: 'Pod', d: 'K8s 最小可部署单元。' },
    { t: 'Deployment', d: '无状态工作负载，支持滚动更新。' },
    { t: 'StatefulSet', d: '有状态工作负载。' },
    { t: 'DaemonSet', d: '每节点跑一个的工作负载。' },
    { t: 'Service', d: '稳定的访问入口与负载均衡。' },
    { t: 'Ingress', d: '集群七层入口，按域名/路径路由。' },
    { t: 'ConfigMap / Secret', d: '非敏感配置 / 敏感密钥（Base64 非加密）。' },
    { t: 'PV / PVC', d: 'PersistentVolume / Claim，持久卷 / 持久卷声明。' },
    { t: 'StorageClass', d: '定义如何动态创建 PV。' },
    { t: 'CNI', d: 'Container Network Interface，网络插件标准。' },
    { t: 'CoreDNS', d: '集群 DNS，把 Service 名解析成 ClusterIP。' },
    { t: 'Label / Selector', d: '标签 / 选择器，K8s 核心关联机制。' },
    { t: 'requests / limits', d: '资源请求（调度依据）/ 资源上限。' },
    { t: 'CRD', d: 'Custom Resource Definition，自定义资源定义。' },
    { t: 'Operator', d: '用 CRD + 控制器管理复杂应用的模式。' },
    { t: 'Device Plugin', d: '硬件资源（GPU/FPGA/网卡）接入 K8s 的机制。' },
    { t: 'nvidia-device-plugin', d: 'NVIDIA 官方设备插件。' },
    { t: 'Container Toolkit', d: 'NVIDIA Container Toolkit，让容器能用 GPU。' },
    { t: 'GPU Operator', d: '自动化部署管理整套 GPU 软件栈。' },
    { t: 'DCGM', d: 'Data Center GPU Manager，GPU 监控与管理。' },
    { t: 'MIG', d: 'Multi-Instance GPU，硬件级 GPU 切分。' },
    { t: 'MPS', d: 'Multi-Process Service，多进程共享 GPU。' },
    { t: 'Time-Slicing', d: '时间片共享 GPU，配置简单隔离弱。' },
    { t: 'GFD', d: 'GPU Feature Discovery，给节点打 GPU 特征标签。' },
    { t: 'NVML', d: 'NVIDIA Management Library，GPU 管理库。' },
    { t: 'crictl', d: '面向 CRI 运行时的容器排查工具。' },
    { t: 'CrashLoopBackOff', d: '容器反复崩溃重启，指数退避延迟。' },
    { t: 'OOMKilled', d: '内存超 limit 被内核 OOM Killer 杀掉。' }
  ]
});
