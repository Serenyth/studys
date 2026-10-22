(window.AIOPS_STAGES = window.AIOPS_STAGES || []).push({
  id: 's1', num: 1, title: 'Linux 与 Shell 基础', icon: 'terminal', accent: '#34d399', weeks: '第 2–4 周',
  desc: '从"能装系统"进阶到"能管理一台服务器"。Linux 是 AI 运维的地基 —— GPU 驱动、CUDA、容器、K8s 全都跑在它上面。',
  timeline: '文件系统、权限、进程服务、磁盘 LVM、网络配置，并写出你的第一个自动化脚本。',
  tags: ['FHS', '权限 rwx', 'systemd', 'LVM', '三剑客', 'Shell 脚本', 'Python 运维'],
  quote: 'Linux 是 AI 运维的地基 —— GPU 驱动、CUDA、容器、K8s 全都跑在它上面。地基不牢，后面全是空中楼阁。排障时你只能通过命令行去查，没有图形界面给你点。',
  deliverables: [
    '一份自己整理的 Linux 命令速查笔记',
    '3 个可运行的 Shell 自动化脚本',
    '1 个用 Python 写的系统巡检脚本',
    '一次完整的"磁盘扩容 + 服务部署"实操记录'
  ],
  sections: [
    {
      id: 's1-linux', chapter: '一、先建立认知：Linux 是什么', icon: 'terminal',
      chSub: '内核与发行版、两大家族、四条核心哲学。',
      kind: 'table', title: '两大家族：Debian 系 vs Red Hat 系', icon: 'grid',
      head: ['家族', '包格式', '包管理命令', '代表发行版'],
      rows: [
        ['**Debian 系**', '`.deb`', '`apt` / `dpkg`', 'Ubuntu、Debian'],
        ['**Red Hat 系**', '`.rpm`', '`yum` / `dnf` / `rpm`', 'RHEL、Rocky Linux、AlmaLinux']
      ],
      note: '两大家族的包管理命令、配置文件路径、服务管理细节略有不同。**AI 服务器现场两种都可能遇到，必须都熟悉。**'
    },
    {
      kind: 'cards', title: 'Linux 的四条核心哲学', icon: 'book',
      items: [
        { icon: 'link', t: '一切皆文件', d: '磁盘、网卡、进程信息都能用文件方式访问：`/dev/sda`、`/proc/cpuinfo`。' },
        { icon: 'cable', t: '小工具组合', d: '每个命令只做一件事，用管道 `|` 把多个命令串起来完成复杂任务。' },
        { icon: 'code', t: '配置即文本', d: '几乎所有配置都是纯文本文件，**改配置 = 改文件**。' },
        { icon: 'alert', t: '区分大小写', d: '`Root`、`root`、`ROOT` 是三个不同的东西。' }
      ]
    },
    {
      id: 's1-fs', chapter: '二、文件系统与目录结构', icon: 'layers',
      chSub: 'FHS 标准 + "倒树"结构。理解了 FHS，你在 Linux 里操作就从"背路径"变成"懂逻辑"。',
      kind: 'viz', viz: 'fs-tree', icon: 'grid', title: '点一点，看清每个目录到底放什么',
      hint: '点击左侧目录查看说明',
      caption: '和 Windows 的 C 盘 D 盘不同，**Linux 只有一个根目录 `/`**，所有文件都从根目录延伸出来形成一棵倒过来的树。现代发行版启用了 **UsrMerge**：`/bin`、`/sbin`、`/lib` 都成了指向 `/usr` 下对应目录的符号链接。'
    },
    {
      kind: 'terms', title: 'inode 与链接：一个高频面试点', icon: 'link',
      items: [
        { t: 'inode', full: 'Index Node', d: '每个文件都有一个 inode，记录权限、属主、大小、修改时间、数据块位置。**文件名只是指向 inode 的一个"标签"。** 这解释了常见现象：磁盘没满却提示"设备上没有空间" —— 很可能是 **inode 用完了**（小文件太多），用 `df -i` 查看。' },
        { t: '硬链接', full: 'Hard Link', d: '多个文件名指向**同一个 inode**，删掉其中一个数据还在（引用计数减 1）。不能跨文件系统、不能链接目录。' },
        { t: '软链接', full: 'Symbolic Link', d: '类似 Windows 快捷方式，是**独立文件**，内容是指向目标的路径。目标删了就"断链"。' },
        { t: '/dev/null', full: '黑洞设备', d: '写进去的数据被直接丢弃。`命令 > /dev/null 2>&1` 表示标准输出和错误输出都不要。' }
      ]
    },
    {
      id: 's1-cmd', chapter: '三、常用命令（第 2 周重点）', icon: 'code',
      chSub: '学习方法：不要背命令，而是围绕场景记命令 —— "我要干什么"。',
      kind: 'code', title: '文件 / 查看 / 查找 / 打包', icon: 'terminal', file: 'core-commands.sh', lang: 'bash',
      code: '# ---- 文件与目录 ----\npwd                 # 显示当前所在目录\nls -lh              # 列出文件（-l 详细，-h 人类可读大小）\nls -la              # 包含隐藏文件（以 . 开头）\nmkdir -p a/b/c      # 递归创建目录\ncp -a src dst       # 保留权限/时间戳复制（归档）\nmv old new          # 移动或重命名\nstat file           # 查看文件详细信息（含 inode）\nfile file           # 判断文件类型\n\n# ---- 查看内容（tail -f 是排障标配）----\nless file           # 大文件首选，q 退出，/ 搜索\ntail -f /var/log/syslog   # 实时跟踪日志\nwc -l file          # 统计行数\n\n# ---- 查找 ----\nfind /var/log -name "*.log"                     # 按名字\nfind /data -type f -size +500M                  # 大于 500M\nfind /data/logs -name "*.log" -mtime +30 -delete    # 30 天前的日志并删除\nfind /data -user nginx -exec ls -lh {} \\;       # 对每个结果执行命令\nwhich python3       # 命令的可执行文件路径\n\n# ---- 打包压缩（tar 只打包，gzip 才压缩）----\ntar -czvf backup.tar.gz /data     # 压缩：czvf\ntar -xzvf backup.tar.gz           # 解压：xzvf\ntar -tzvf backup.tar.gz           # 查看：tzvf\ntar -xzvf backup.tar.gz -C /opt   # 解压到指定目录\n\n# ---- 系统信息 ----\nuname -a / cat /etc/os-release / hostname\nuptime / free -h / df -h / history',
      note: '安全提醒：`rm -rf /` 是"删库跑路"级别的命令。**永远不要在根目录下执行带通配符的 rm**，生产环境删文件前先 `ls` 确认。'
    },
    {
      kind: 'table', title: 'vim 生存必备按键', icon: 'code',
      head: ['操作', '按键', '操作', '按键'],
      rows: [
        ['进入插入模式', '`i` / `a` / `o`', '退出插入模式', '`Esc`'],
        ['保存', '`:w`', '退出', '`:q`'],
        ['保存并退出', '`:wq` / `ZZ`', '强制退出不保存', '`:q!`'],
        ['删除一行', '`dd`', '复制 / 粘贴', '`yy` / `p`'],
        ['撤销', '`u`', '搜索', '`/关键字`，`n` 下一个'],
        ['行首 / 行尾', '`0` / `$`', '文件首 / 尾', '`gg` / `G`'],
        ['显示行号', '`:set nu`', '替换全部', '`:%s/old/new/g`']
      ],
      note: '服务器上没有图形编辑器，**vim 是改配置文件的唯一选择**。`vimtutor` 命令可以进入官方交互式教程。'
    },
    {
      id: 's1-perm', chapter: '四、用户、权限与安全（第 3 周）', icon: 'lock',
      chSub: '看懂 `ls -l` 的权限位，掌握 chmod / chown / umask 与特殊权限位。',
      kind: 'viz', viz: 'chmod-lab', icon: 'lock', title: 'chmod 权限实验室：勾一勾，看八进制怎么来的',
      hint: '点击 r/w/x 切换，或直接用预设',
      caption: '三位数字分别代表 **属主 / 属组 / 其他人** 的权限之和（r=4、w=2、x=1）。**目录的 `x` 权限是"能不能进去"** —— 没有 x 就算有 r 也进不去。'
    },
    {
      kind: 'table', title: '权限含义对照', icon: 'shield',
      head: ['权限', '字母', '数字', '对文件', '对目录'],
      rows: [
        ['读', '`r`', '4', '可查看内容', '可列出目录内容'],
        ['写', '`w`', '2', '可修改内容', '可在目录内增删文件'],
        ['执行', '`x`', '1', '可作为程序运行', '**可进入该目录**']
      ]
    },
    {
      kind: 'terms', title: 'umask 与特殊权限位', icon: 'shield',
      items: [
        { t: 'umask', full: '权限掩码', d: '新建文件/目录时，从最大权限里**减掉**掩码位。文件最大 666，目录最大 777。默认 umask **022** → 新建文件 `666-022=644`，新建目录 `777-022=755`。生产常用 `umask 027`（文件 640、目录 750）。' },
        { t: 'SUID', full: '数字 4', d: '执行时**临时获得属主权限**。典型例子 `/usr/bin/passwd` —— 普通用户改密码需要 root 权限。`ls -l` 会看到 `rws`。' },
        { t: 'SGID', full: '数字 2', d: '执行时获得属组权限；用在目录上则新建文件继承目录属组（共享目录常用）。' },
        { t: 'Sticky', full: '数字 1', d: '目录内文件**只有属主能删**。`/tmp` 的经典配置：`chmod 1777 /tmp`。' },
        { t: 'su vs sudo', full: '—', d: '`su` 要对方的密码（安全性差、无法精细授权）；`sudo` 用**自己的密码**、可按用户/命令精细授权并留日志。**生产环境用 sudo。**' }
      ]
    },
    {
      kind: 'code', title: '用户与权限操作', icon: 'terminal', file: 'user-perm.sh', lang: 'bash',
      code: 'useradd -m -s /bin/bash zhangsan    # 创建用户（-m 建家目录）\nusermod -aG sudo zhangsan           # 加入 sudo 组（-a 追加，很重要）\nuserdel -r zhangsan                 # 删除用户及其家目录\nid zhangsan                         # 查看 UID/GID/所属组\n\n# chmod 数字法（最常用）\nchmod 755 script.sh    # 属主 rwx，组 r-x，其他 r-x\nchmod 644 file.txt     # 普通文件\nchmod 600 id_rsa       # 私钥必须这样！\nchmod 700 ~/.ssh       # 只有属主可进入\nchmod -R 755 /data/www # -R 递归\n\n# chmod 符号法\nchmod u+x script.sh    # 给属主加执行权\nchmod o=r file         # 其他人只给读\nchmod a+r file         # 所有人加读\n\n# chown / chgrp\nchown zhangsan:devops file.txt\nchown -R www-data:www-data /var/www   # 部署网站常用\n\n# ACL：三档权限不够用时\nsetfacl -m u:lisi:rw /data/report.txt\ngetfacl /data/report.txt',
      note: '关键文件：`/etc/passwd`（用户信息）、`/etc/shadow`（密码哈希）、`/etc/group`（组信息）。**root 的 UID 是 0。**'
    },
    {
      id: 's1-proc', chapter: '五、进程与服务管理', icon: 'activity',
      chSub: 'systemd 是 PID 1，systemctl 是你指挥它的对讲机。',
      kind: 'code', title: '进程查看、信号与 systemctl', icon: 'activity', file: 'process.sh', lang: 'bash',
      code: '# ---- 查看进程 ----\nps aux                  # 所有进程（a 所有用户，u 用户格式，x 含无终端）\nps -ef                  # 另一种格式（含 PPID 父进程）\ntop                     # 实时监控（P 按 CPU 排序，M 按内存，q 退出）\npgrep -a nginx / pidof nginx\n\n# ---- 前后台与信号 ----\n命令 &                   # 后台运行\nnohup 命令 &             # 退出终端也不中断（日志写 nohup.out）\nkill 1234               # SIGTERM(15)：礼貌请求终止，可先清理\nkill -9 1234            # SIGKILL(9)：强制杀死，进程无法拒绝\npkill -f "python app.py"   # 按命令行匹配杀进程\n\n# ---- systemd（重点）----\nsystemctl start nginx       # 启动\nsystemctl reload nginx      # 平滑重载配置（不中断业务）\nsystemctl status nginx      # 重点看 active (running)\nsystemctl enable nginx      # 设置开机自启\nsystemctl list-units --type=service --state=running\nsystemctl daemon-reload     # 修改 unit 文件后重新加载',
      note: '高频面试：`restart` 和 `reload` 的区别？`restart` 完全重启、服务会中断；`reload` 重新读取配置、服务不中断。**生产环境优先用 reload。** 建议信号先用 15，杀不掉再用 9。'
    },
    {
      kind: 'code', title: '把脚本注册成 systemd 服务', icon: 'rocket', file: '/etc/systemd/system/myapp.service', lang: 'ini',
      code: '[Unit]\nDescription=My AI App\nAfter=network.target\n\n[Service]\nType=simple\nUser=appuser\nWorkingDirectory=/opt/myapp\nExecStart=/usr/bin/python3 /opt/myapp/main.py\nRestart=on-failure          # 异常退出自动重启\nRestartSec=5\n\n[Install]\nWantedBy=multi-user.target',
      note: '`sudo systemctl daemon-reload && sudo systemctl enable --now myapp`。把 AI 推理服务、巡检脚本注册成 systemd 服务，就能实现**崩溃自愈、开机自启、统一管理** —— 这是生产部署的标准做法。'
    },
    {
      kind: 'table', title: '日志三来源与排障思路', icon: 'search',
      head: ['来源', '命令', '用途'],
      rows: [
        ['systemd 日志', '`journalctl -u 服务名` / `-f` / `--since` / `-p err`', '服务日志、系统事件'],
        ['内核环形缓冲', '`dmesg -T` / `dmesg | grep -i -E "gpu|nvidia"`', '**硬件、驱动、内核问题**'],
        ['传统日志文件', '`/var/log/syslog`、`messages`、`secure`、`auth.log`', '应用与系统归档日志']
      ],
      note: '排障实战思路：① 服务起不来 → `systemctl status` 看报错 → `journalctl -u` 看详细日志；② 硬件/驱动异常 → `dmesg -T | tail -50`；③ 磁盘满 → `df -h` 找分区 → `du -sh /*` 逐层定位。日志越写越大由 **logrotate** 负责切割压缩，配置在 `/etc/logrotate.d/`。'
    },
    {
      id: 's1-pkg', chapter: '六、软件包管理', icon: 'cube',
      chSub: '两大阵营：apt 与 dnf。面试点：yum 与 dnf 的关系。',
      kind: 'code', title: 'apt 与 dnf 对照', icon: 'terminal', file: 'package.sh', lang: 'bash',
      code: '# ---- Debian / Ubuntu ----\nsudo apt update              # 更新软件包索引（先做这个！）\nsudo apt upgrade             # 升级已安装的软件\nsudo apt install -y nginx    # 安装（-y 自动确认）\nsudo apt purge nginx         # 卸载并删配置\nsudo apt autoremove          # 清理不再需要的依赖\ndpkg -l | grep nginx         # 底层查询\ndpkg -i pkg.deb              # 安装本地 deb 包\n\n# ---- RHEL / Rocky ----\nsudo dnf install -y nginx    # 安装（新版用 dnf）\nsudo dnf remove nginx\nsudo dnf provides /usr/bin/nginx   # 反查某文件属于哪个包\nrpm -qa | grep nginx         # 底层查询\nrpm -ivh pkg.rpm             # 安装本地 rpm 包\n\n# ---- 源码编译（仓库里没有时）----\n./configure --prefix=/usr/local/app\nmake && sudo make install',
      note: '`dnf` 是 `yum` 的下一代替代品（解决依赖更快更准），Rocky/Alma 8+ 默认已用 dnf。编译安装需要 gcc / make / 开发库，**不归包管理器管，卸载麻烦**，非必要优先用包管理器。'
    },
    {
      id: 's1-disk', chapter: '七、磁盘与存储管理', icon: 'disk',
      chSub: '分区 → 格式化 → 挂载三步走，以及 LVM 在线扩容。',
      kind: 'flow', title: '核心比喻：给一块地画地皮', icon: 'disk',
      steps: [
        { n: '①', t: '分区 = 给一块地画地皮', d: '`sudo fdisk /dev/sdb`（n 新建、d 删除、p 查看、w 保存）或 `parted`。' },
        { n: '②', t: '格式化 = 在地皮上修地基', d: '建立文件系统：`sudo mkfs.ext4 /dev/sdb1`，RHEL 系常用 `mkfs.xfs`。' },
        { n: '③', t: '挂载 = 给这块地开个门', d: '`sudo mkdir /data && sudo mount /dev/sdb1 /data`，用 `df -h | grep data` 验证。' },
        { n: '④', t: '持久挂载 = 写进 /etc/fstab', d: '先 `blkid /dev/sdb1` 拿 UUID（**推荐用 UUID，比设备名稳定**），改完必须 `sudo mount -a` 测试 —— 改错会开不了机。' }
      ]
    },
    {
      kind: 'table', title: 'MBR vs GPT', icon: 'disk',
      head: ['对比', 'MBR', 'GPT'],
      rows: [
        ['最大磁盘', '2 TB', '**远超 2 TB（EB 级）**'],
        ['分区数', '最多 4 个主分区', '最多 128 个'],
        ['兼容性', '老设备好', '现代主流'],
        ['工具', '`fdisk`', '`gdisk` / `parted`']
      ],
      note: 'AI 服务器提示：GPU 服务器常配大容量 NVMe，**基本都用 GPT**。'
    },
    {
      kind: 'code', title: 'LVM 逻辑卷：让磁盘空间像"橡皮泥"', icon: 'layers', file: 'lvm.sh', lang: 'bash',
      code: '# 三层结构：物理卷 PV → 卷组 VG → 逻辑卷 LV\n\n# 创建\nsudo pvcreate /dev/sdb                    # 建物理卷\nsudo vgcreate vg_data /dev/sdb            # 建卷组\nsudo lvcreate -L 100G -n lv_app vg_data   # 建 100G 逻辑卷\nsudo mkfs.ext4 /dev/vg_data/lv_app        # 格式化\nsudo mount /dev/vg_data/lv_app /app       # 挂载\n\n# 扩容（LVM 最大价值：在线扩容，不用停机）\nsudo lvextend -L +50G /dev/vg_data/lv_app   # 逻辑卷加 50G\nsudo resize2fs /dev/vg_data/lv_app          # ext4 文件系统扩容\n# xfs 用：sudo xfs_growfs /app\n\n# 查看\nsudo pvs / sudo vgs / sudo lvs\n\n# 磁盘排查\ndf -h          # 各分区使用率（关注 100% 的分区）\ndf -i          # inode 使用率（磁盘没满但报满，看这个）\ndu -sh * | sort -rh | head -10   # 当前目录 Top10 大目录\niostat -x 1    # 磁盘 IO（%util 高说明 IO 饱和）',
      note: '**AI 训练数据动辄几十 TB，LVM 在线扩容是避免"停机扩盘"的关键技能**，也是面试常考点。'
    },
    {
      id: 's1-net', chapter: '八、网络配置命令', icon: 'network',
      chSub: 'ip 命令是临时的，持久配置要看系统用哪套机制 —— 混用会导致配置失效。',
      kind: 'code', title: '临时配置与三套持久机制', icon: 'network', file: 'network.sh', lang: 'bash',
      code: '# ---- 临时配置（重启就没了）----\nip addr                       # 查看所有网卡与 IP（取代 ifconfig）\nip link set eth0 up           # 启用网卡\nip addr add 192.168.1.10/24 dev eth0\nip route                      # 查看路由表（默认网关在 default 行）\n\n# ---- 先判断系统用哪套 ----\nnmcli --version 2>/dev/null            # 有输出 → NetworkManager\nls /etc/netplan/ 2>/dev/null           # 有 yaml → netplan\nls /etc/sysconfig/network-scripts/     # 有 ifcfg-* → RHEL 传统\n\n# ---- 网络排查 ----\nping -c 4 8.8.8.8            # 测外网（绕过 DNS）\nping www.baidu.com           # 测 DNS 解析 + 连通性\ntraceroute -n www.baidu.com  # 追踪路径\nss -tulnp                    # 查看监听端口（t TCP, u UDP, l 监听, n 数字, p 进程）\ncurl -I https://www.baidu.com   # 测试 HTTP 服务\ndig www.baidu.com            # DNS 查询\nnc -zv 192.168.1.10 22       # 测端口是否通\ntcpdump -i eth0 port 22 -nn  # 抓包（排障利器）\nethtool eth0                 # 网卡速率、双工模式',
      note: '**排障思路（背下来）**：① `ip addr` 确认 IP 与网卡状态 → ② `ping 网关` 通说明局域网正常 → ③ `ping 8.8.8.8` 通说明路由 OK → ④ `ping 域名` 不通但上一步通 → **DNS 有问题** → ⑤ `ss -tulnp` 确认端口监听 → ⑥ `curl`/`nc` 测端口连通性。'
    },
    {
      kind: 'callout', tone: 'warn', title: 'CIDR 与 bonding', icon: 'link',
      html: '`192.168.1.10/24` 中的 `/24` 表示**子网掩码有 24 位是 1**，即 `255.255.255.0`。常见：`/24`=255.255.255.0、`/16`=255.255.0.0。**bonding（网卡绑定）** 把多张物理网卡绑成一张逻辑网卡实现冗余/带宽叠加：**mode=1 主备**（最常用，一张坏另一张顶上）、**mode=4 LACP**（需交换机配合，带宽叠加）。'
    },
    {
      id: 's1-shell', chapter: '九、Shell 脚本编程（第 4 周）', icon: 'code',
      chSub: '变量、判断、循环、函数 —— 以及三个能直接用的运维脚本模板。',
      kind: 'code', title: 'Shell 语法骨架', icon: 'terminal', file: 'basics.sh', lang: 'bash',
      code: '#!/bin/bash\n# shebang：告诉系统用哪个解释器执行\nset -euo pipefail        # 出错即停 / 未定义变量报错 / 管道错误也捕获\n\n# ---- 变量（等号两边不能有空格！）----\nAPP_NAME="ai-inference"\nNOW=$(date +%F)              # 命令替换\necho "应用：$APP_NAME，今天：$NOW"\nreadonly VERSION="1.0"       # 只读变量\nexport PATH=$PATH:/opt/app/bin   # 环境变量，子进程也能读到\n\n# ---- 位置参数与特殊变量 ----\necho "脚本名：$0  第一个参数：$1  参数个数：$#  所有参数：$@"\necho "上条命令退出码：$?"    # 0 表示成功，非 0 表示失败\necho "当前 PID：$$"\n\n# ---- 条件判断（[ ] 里空格极其重要！）----\nif [ -f "/etc/nginx/nginx.conf" ]; then\n    echo "配置文件存在"\nelif [ -d "/etc/nginx" ]; then\n    echo "目录存在但不是文件"\nelse\n    echo "不存在"\nfi\n# 常用判断符：-f 文件 -d 目录 -e 存在 -r 可读 -w 可写 -x 可执行\n#            -z 空串 -n 非空；-eq -ne -gt -lt -ge -le\nif [[ "$NAME" =~ ^ai-[0-9]+$ ]]; then echo "匹配 ai-数字"; fi\n\n# ---- 循环 ----\nfor svc in nginx docker kubelet; do echo "检查服务：$svc"; done\nfor i in {1..5}; do echo "第 $i 次"; done\ncount=1\nwhile [ $count -le 5 ]; do echo "计数：$count"; count=$((count + 1)); done\n\n# ---- 函数 ----\ncheck_service() {\n    local name="$1"                 # local 声明局部变量\n    if systemctl is-active --quiet "$name"; then\n        echo "[OK] $name 正在运行"; return 0\n    else\n        echo "[FAIL] $name 未运行"; return 1\n    fi\n}\ncheck_service nginx',
      note: '调试：`bash -x script.sh`（打印每条命令的执行过程）、`bash -n script.sh`（只检查语法）、`shellcheck script.sh`（静态检查，强烈推荐）。'
    },
    {
      kind: 'code', title: '三个可直接用的运维脚本模板', icon: 'rocket', file: 'ops-templates.sh', lang: 'bash',
      code: '# ① 服务健康巡检 —— health_check.sh\necho "===== 系统巡检 $(date \'+%F %T\') ====="\necho "--- CPU 负载 ---"; uptime\necho "--- 内存 ---"; free -h\necho "--- 磁盘 ---"; df -h | grep -v tmpfs\necho "--- 关键服务 ---"\nfor svc in sshd docker; do\n    systemctl is-active --quiet "$svc" \\\n        && echo "[OK] $svc" || echo "[FAIL] $svc"\ndone\n\n# ② 日志清理（保留 7 天）\nLOG_DIR="/var/log/myapp"\nfind "$LOG_DIR" -name "*.log" -mtime +7 -delete\necho "$(date \'+%F %T\') 清理完成" >> /var/log/cleanup.log\n\n# ③ 磁盘告警\nTHRESHOLD=85\ndf -h | awk \'NR>1 {print $5, $6}\' | while read usage mount; do\n    pct=${usage%\\%}\n    if [ "$pct" -ge "$THRESHOLD" ]; then\n        echo "告警：$mount 使用率 ${usage}"\n    fi\ndone\n\n# 进阶：注册成 cron 定时任务（每天凌晨 2 点）\n# crontab -e\n# 0 2 * * * /opt/scripts/health_check.sh >> /var/log/health.log 2>&1',
      note: '规范建议：开头加 `set -euo pipefail`；变量加引号 `"$VAR"` 避免空格问题；关键步骤加日志和错误处理；用 `shellcheck` 检查。'
    },
    {
      id: 's1-trio', chapter: '十、文本三剑客：grep / sed / awk', icon: 'search',
      chSub: '运维 80% 的时间在处理日志和文本。这三个命令是"日志分析三件套"。',
      kind: 'code', title: 'grep / sed / awk 与组合实战', icon: 'search', file: 'trio.sh', lang: 'bash',
      code: '# ---- grep：查找行 ----\ngrep -i "error" app.log           # 忽略大小写\ngrep -rn "TODO" ./src             # 递归搜索并显示行号\ngrep -c "ERROR" app.log           # 统计匹配行数\ngrep -v "DEBUG" app.log           # 反向：不包含 DEBUG 的行\ngrep -E "ERROR|WARN" app.log      # 扩展正则\ngrep -A 2 -B 2 "ERROR" app.log    # 显示匹配行前后各 2 行\ngrep -o "IP:[0-9.]*" app.log      # 只输出匹配的部分\n\n# ---- sed：流式编辑 ----\nsed -n \'5,10p\' file           # 打印 5-10 行（-n 抑制默认输出）\nsed -i.bak \'s/8080/9090/g\' file   # 改文件并留 .bak 备份\nsed \'/^$/d\' file              # 删除空行\nsed -i \'/^#/d\' config         # 删除所有注释行\n\n# ---- awk：按列处理 ----\nawk \'{print $1}\' file              # 打印第 1 列\nawk -F: \'{print $1}\' /etc/passwd   # 以 : 为分隔符取用户名\nawk \'$3 > 100 {print $0}\' data     # 第 3 列大于 100 的行\nawk \'END {print NR}\' file          # 统计总行数\nawk \'BEGIN {sum=0} {sum+=$2} END {print sum}\' data   # 求和\n\n# ---- 组合实战 ----\n# 统计访问日志里 Top10 的 IP\nawk \'{print $1}\' access.log | sort | uniq -c | sort -rn | head -10\n# 找出 500 错误并看请求路径\ngrep " 500 " access.log | awk \'{print $7}\' | sort | uniq -c | sort -rn',
      note: '**选型口诀：只要查找筛选 → grep 最快；要替换/删行 → sed；要按列统计计算 → awk。** awk 内置变量：`$0` 整行、`$1~$n` 第 n 列、`NR` 行号、`NF` 字段数、`BEGIN`/`END` 处理前后执行。'
    },
    {
      id: 's1-py', chapter: '十一、Python 运维脚本入门', icon: 'code',
      chSub: 'Shell 适合"短平快"，复杂逻辑、API 交互、数据处理交给 Python。',
      kind: 'table', title: '核心模块', icon: 'cube',
      head: ['模块', '用途', '常用函数'],
      rows: [
        ['`os`', '操作系统交互', '`os.listdir`、`os.rename`、`os.path.join`'],
        ['`shutil`', '文件/目录操作', '`shutil.copy`、`shutil.copytree`、`shutil.rmtree`'],
        ['`subprocess`', '执行系统命令', '`subprocess.run`'],
        ['`pathlib`', '现代路径操作', '`Path`'],
        ['`psutil`', '系统资源监控（需装）', 'CPU、内存、磁盘、进程'],
        ['`paramiko`', 'SSH 远程操作（需装）', '远程执行命令、传文件']
      ]
    },
    {
      kind: 'code', title: '系统巡检脚本 system_check.py', icon: 'terminal', file: 'system_check.py', lang: 'text',
      code: '#!/usr/bin/env python3\n"""system_check.py —— 系统资源巡检"""\nimport subprocess\nimport psutil\nfrom datetime import datetime\n\ndef run_cmd(cmd):\n    """执行 shell 命令并返回输出"""\n    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)\n    return result.stdout.strip()\n\ndef check_cpu():\n    usage = psutil.cpu_percent(interval=1)\n    return f"CPU 使用率：{usage}%"\n\ndef check_mem():\n    m = psutil.virtual_memory()\n    return f"内存：已用 {m.percent}%（{m.used//1024**3}G / {m.total//1024**3}G）"\n\ndef check_disk():\n    lines = []\n    for p in psutil.disk_partitions():\n        try:\n            u = psutil.disk_usage(p.mountpoint)\n            if u.percent >= 80:\n                lines.append(f"[告警] {p.mountpoint} 使用率 {u.percent}%")\n        except PermissionError:\n            continue\n    return "\\n".join(lines) if lines else "磁盘：正常"\n\ndef check_service(name):\n    status = run_cmd(f"systemctl is-active {name}")\n    return f"[{\'OK\' if status == \'active\' else \'FAIL\'}] 服务 {name}: {status}"\n\nif __name__ == "__main__":\n    print(f"===== 系统巡检 {datetime.now():%Y-%m-%d %H:%M:%S} =====")\n    print(check_cpu())\n    print(check_mem())\n    print(check_disk())\n    for svc in ["sshd", "docker"]:\n        print(check_service(svc))',
      note: '`subprocess.run(..., capture_output=True, text=True)` 是 Python 执行系统命令的标准写法 —— 捕获输出并以字符串返回。Ansible、SaltStack 本身就是 Python 写的，**会 Python 才玩得转自动化**。'
    }
  ],
  checklist: [
    { t: '第 2 周 · 文件与文本', items: [
      '用 `tree` 或 `ls` 浏览一遍根目录，理解每个目录的用途',
      '练习 `ls/cd/cp/mv/rm/mkdir`，包括 `-p`、`-r`、`-a` 等参数',
      '用 `find` 找出系统里大于 100MB 的文件',
      '用 `tar` 打包一个目录并解压到另一位置',
      '用 vim 创建一个脚本文件并保存退出（练习 `dd/yy/p/u/:wq`）',
      '整理一份自己的命令速查表'
    ]},
    { t: '第 3 周 · 权限 / 服务 / 磁盘', items: [
      '创建一个用户，加入 sudo 组，用该用户登录并执行 `sudo` 命令',
      '用 `chmod` 把脚本改为 755，把私钥改为 600，验证效果',
      '用 `umask 027` 观察新建文件的默认权限变化',
      '用 `systemctl` 启停一个服务，并设置/取消开机自启',
      '写一个自定义 `.service` 文件，把脚本注册成服务',
      '用 `journalctl -u` 和 `dmesg` 查看日志，找出一次报错',
      '用 `fdisk` 或 `parted` 给一块新虚拟磁盘分区 → 格式化 → 挂载 → 写入 fstab',
      '用 LVM 创建 PV/VG/LV，并完成一次在线扩容',
      '给虚拟机配置静态 IP（netplan 或 nmcli），重启验证生效'
    ]},
    { t: '第 4 周 · 脚本自动化', items: [
      '写一个服务巡检脚本（`if` + `for` + 函数）',
      '写一个日志清理脚本并用 `crontab` 定时执行',
      '用 `grep` + `awk` + `sort` + `uniq` 统计日志中 Top10 的 IP',
      '用 `sed -i` 批量修改一个配置文件（先备份）',
      '用 Python 写一个系统巡检脚本（`psutil` + `subprocess`）',
      '用 `shellcheck` 检查你的脚本并修复警告'
    ]}
  ],
  quiz: [
    { q: '`/etc`、`/var`、`/proc` 分别放什么？', a: '`/etc` 系统与服务配置；`/var` 可变数据（日志 `/var/log`、数据库、缓存）；`/proc` 内核与进程的虚拟文件系统（如 `/proc/cpuinfo`）。' },
    { q: '硬链接和软链接有什么区别？', a: '硬链接：多个文件名指向**同一个 inode**，删一个数据还在，不能跨文件系统、不能链接目录。软链接：**独立文件**，内容是目标路径，目标删了就断链。' },
    { q: '`chmod 644` 和 `755` 分别代表什么？为什么私钥要用 600？', a: '644 = 属主 rw、组 r、其他 r（普通文件）；755 = 属主 rwx、组 rx、其他 rx（脚本/目录）。私钥 600 因为**只有属主能读写** —— 否则 ssh 会认为权限过宽而拒绝使用。' },
    { q: '`umask 022` 时新建文件和目录的默认权限是多少？', a: '文件 `666-022=644`，目录 `777-022=755`。' },
    { q: '`restart` 和 `reload` 的区别？什么时候用哪个？', a: '`restart` 完全重启、服务会中断；`reload` 重新读取配置、服务不中断（需服务支持）。**生产环境优先 reload。**' },
    { q: '`systemctl` 和 `systemd` 是什么关系？', a: 'systemd 是初始化系统与服务管理器（PID 1，干活的管家）；systemctl 是与它交互的命令行工具（你指挥管家用的对讲机）。' },
    { q: '服务起不来，你的排查步骤是什么？', a: '① `systemctl status 服务名` 看报错与状态；② `journalctl -u 服务名` 看详细日志（必要时加 `-f`）；③ 检查配置文件语法；④ 检查端口是否被占用（`ss -tulnp`）；⑤ 检查权限与依赖。' },
    { q: '`df` 显示磁盘没满但写不进数据，可能是什么原因？', a: '大概率是 **inode 用完了**（小文件太多），用 `df -i` 查看。也可能是文件已删但进程仍持有句柄（`lsof | grep deleted`），需要重启进程释放。' },
    { q: 'MBR 和 GPT 有什么区别？大磁盘该用哪个？', a: 'MBR 最大 2 TB、最多 4 个主分区；GPT 支持 EB 级、最多 128 个分区。**大磁盘（尤其 NVMe）用 GPT**，工具用 `parted` / `gdisk`。' },
    { q: 'LVM 的三层结构是什么？扩容命令有哪些？', a: '**PV 物理卷 → VG 卷组 → LV 逻辑卷**。扩容：`lvextend -L +50G /dev/vg/lv` → `resize2fs`（ext4）或 `xfs_growfs`（xfs）。' },
    { q: '为什么 fstab 推荐用 UUID 而不是 `/dev/sdb1`？', a: '设备名可能因插拔顺序变化而不稳定；**UUID 是文件系统的唯一标识**，永远指向同一块设备。改完必须 `mount -a` 测试。' },
    { q: '`ip` 命令和 netplan/nmcli 的区别是什么？', a: '`ip` 是**临时配置**，重启就没了；netplan（Ubuntu 18.04+）、nmcli（NetworkManager）、ifcfg 文件才是**持久配置**。要先判断系统用哪套，混用会导致配置失效。' },
    { q: '`ping 8.8.8.8` 通但 `ping www.baidu.com` 不通，问题出在哪？', a: '**DNS 解析问题**。检查 `/etc/resolv.conf`（DNS 服务器配置）和 `/etc/hosts`。' },
    { q: '`$?`、`$#`、`$1` 分别是什么？', a: '`$?` 上条命令退出码（0 成功、非 0 失败）；`$#` 参数个数；`$1` 第一个位置参数。还有 `$0` 脚本名、`$@` 所有参数、`$$` 当前 PID。' },
    { q: '`[ -f file ]` 为什么空格不能少？', a: '因为 `[` 本身是一个**命令**（test 的别名），`]` 是它的最后一个参数。`[-f file]` 会被当成一个不存在的命令名，直接报错。' },
    { q: 'grep、sed、awk 分别最适合什么场景？', a: '**grep 查找筛选行**最快；**sed 做替换/删行**（`-i` 批量改配置）；**awk 按列统计计算**（求和、TopN、格式化输出）。' }
  ],
  glossary: [
    { t: 'Kernel', d: '操作系统核心，管理 CPU/内存/磁盘/网络等硬件资源。' },
    { t: 'FHS', d: '文件系统层级标准，规定每个目录该放什么。' },
    { t: 'inode', d: '记录文件元信息的数据结构，文件名只是它的标签。' },
    { t: 'shebang', d: '`#!` 脚本首行指定解释器。' },
    { t: 'umask', d: '新建文件的权限掩码，默认 022。' },
    { t: 'SUID / SGID / Sticky', d: '三种特殊权限位，数字 4 / 2 / 1。' },
    { t: 'PID 1', d: '系统第一个进程，现代 Linux 中是 systemd。' },
    { t: 'systemd', d: '初始化系统与服务管理器。' },
    { t: 'unit', d: 'systemd 管理的最小单位（.service/.socket/.target）。' },
    { t: 'SIGTERM(15) / SIGKILL(9)', d: '礼貌终止 / 强制杀死。先用 15，杀不掉再用 9。' },
    { t: 'Load Average', d: '过去 1/5/15 分钟的平均等待进程数，持续超过 CPU 核心数要警惕。' },
    { t: 'journalctl', d: '查看 systemd 日志的命令。' },
    { t: 'dmesg', d: '查看内核/硬件消息的命令，硬件排障核心。' },
    { t: 'logrotate', d: '日志自动切割、压缩、清理工具。' },
    { t: 'cron', d: '定时任务调度器，用 crontab 编辑。' },
    { t: 'MBR / GPT', d: '老/新分区表，GPT 支持超大磁盘。' },
    { t: 'LVM', d: '逻辑卷管理，支持在线扩容。' },
    { t: 'PV / VG / LV', d: 'LVM 的物理卷 / 卷组 / 逻辑卷三层结构。' },
    { t: 'UUID', d: '文件系统的唯一标识，fstab 推荐用它。' },
    { t: 'fstab', d: '开机自动挂载的配置文件。' },
    { t: 'CIDR', d: '用 /24 表示子网掩码的写法。' },
    { t: 'loopback', d: '127.0.0.1，永远指向本机。' },
    { t: 'bonding', d: '多网卡绑定，mode=1 主备、mode=4 LACP。' },
    { t: 'netplan / nmcli', d: 'Ubuntu / NetworkManager 的持久网络配置工具。' },
    { t: 'Exit Code', d: '退出码，0 成功、非 0 失败，用 `$?` 获取。' },
    { t: '三剑客', d: 'grep 查找、sed 编辑、awk 按列处理。' },
    { t: 'Pipe', d: '管道 `|`，把前一命令输出作为后一命令输入。' },
    { t: 'psutil / paramiko', d: 'Python 的系统监控库 / SSH 远程操作库。' }
  ]
});
