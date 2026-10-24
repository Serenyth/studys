/* ================================================================
   SEC·ATLAS · glossary.js
   §27 术语速查：可检索的名词表（合并两份笔记的术语速查表）
   ================================================================ */
"use strict";

const GLOSSARY = [
  { t:"AAA", f:"Authentication, Authorization, Accounting", d:"认证、授权、审计", c:"模型" },
  { t:"ABAC", f:"Attribute-Based Access Control", d:"基于属性的访问控制，按主体/资源/环境的属性实时判定", c:"模型" },
  { t:"AEAD", f:"Authenticated Encryption with Associated Data", d:"同时提供加密与完整性，如 GCM、ChaCha20-Poly1305", c:"密码学" },
  { t:"AFL", f:"American Fuzzy Lop", d:"覆盖率引导的模糊测试器；插桩反馈引导变异方向，效率比随机变异高一个数量级", c:"逆向" },
  { t:"APK", f:"Android Package", d:"安卓安装包，本质是 zip：classes.dex、AndroidManifest.xml、res/、lib/、META-INF/", c:"移动" },
  { t:"ARP", f:"Address Resolution Protocol", d:"把 IP 解析成 MAC；无认证，可被 ARP 欺骗做中间人", c:"网络" },
  { t:"ASLR", f:"Address Space Layout Randomization", d:"地址空间随机化：每次运行基址不同，挡住「写死地址」的利用", c:"逆向" },
  { t:"ATT&CK", f:"Adversarial Tactics, Techniques & Common Knowledge", d:"攻击行为知识库：战术 → 技术 → 子技术", c:"框架" },
  { t:"auditd", f:"Linux Audit Daemon", d:"内核级审计框架，Linux 上最接近 EDR 的原生能力", c:"系统" },
  { t:"CA", f:"Certificate Authority", d:"证书颁发机构，信任链的根", c:"密码学" },
  { t:"CAPA", f:"Capability Analysis（Mandiant）", d:"基于规则识别样本「能力」并映射 ATT&CK，不读汇编也能知道它会做什么", c:"恶意代码" },
  { t:"cgroup", f:"Control Group", d:"限制容器「能用多少」CPU/内存/IO；v1 的 release_agent 曾是逃逸路径", c:"云" },
  { t:"CIA", f:"Confidentiality, Integrity, Availability", d:"信息安全三要素：机密性、完整性、可用性", c:"模型" },
  { t:"CORS", f:"Cross-Origin Resource Sharing", d:"同源策略的受控放宽，靠响应头声明允许哪些源", c:"Web" },
  { t:"CSP", f:"Content-Security-Policy", d:"资源白名单响应头，缓解 XSS 的主力", c:"Web" },
  { t:"CSPRNG", f:"Cryptographically Secure PRNG", d:"密码学安全随机数生成器，用于密钥、IV、令牌", c:"密码学" },
  { t:"CVSS", f:"Common Vulnerability Scoring System", d:"漏洞严重性评分 0–10；基础分≠修复优先级", c:"框架" },
  { t:"DAC", f:"Discretionary Access Control", d:"自主访问控制，属主自行决定权限（Linux rwx）", c:"模型" },
  { t:"DAST", f:"Dynamic Application Security Testing", d:"运行时从外部测试，贴近真实攻击但覆盖不全", c:"框架" },
  { t:"DEX", f:"Dalvik Executable", d:"Android 字节码格式，jadx 可反编译成 Java", c:"移动" },
  { t:"DFD", f:"Data Flow Diagram", d:"数据流图，威胁建模的第一步：拆解系统", c:"模型" },
  { t:"DH / ECDHE", f:"(Elliptic Curve) Diffie-Hellman Ephemeral", d:"密钥交换；临时密钥提供前向保密", c:"密码学" },
  { t:"DIE", f:"Detect It Easy", d:"识别编译器、加壳器与文件类型，脱壳第一步", c:"恶意代码" },
  { t:"DMZ", f:"Demilitarized Zone", d:"隔离区；工控里指 L3.5 工业 DMZ，IT 与 OT 之间唯一允许的通道", c:"工控" },
  { t:"DNP3", f:"Distributed Network Protocol", d:"电力/水务常用协议，早期版本无认证", c:"工控" },
  { t:"DREAD", f:"Damage, Reproducibility, Exploitability, Affected users, Discoverability", d:"早期风险评级模型，主观性强，现多用于内部排序", c:"框架" },
  { t:"ECB", f:"Electronic Codebook", d:"每块独立加密，相同明文→相同密文，泄露数据轮廓", c:"密码学" },
  { t:"EPSS", f:"Exploit Prediction Scoring System", d:"0–1 概率，预测未来 30 天被在野利用的可能性", c:"框架" },
  { t:"FHS", f:"Filesystem Hierarchy Standard", d:"文件系统层次标准，让关键文件位置可预测", c:"系统" },
  { t:"HMAC", f:"Hash-based Message Authentication Code", d:"基于哈希的消息认证码；双方共享密钥，无不可否认性", c:"密码学" },
  { t:"HMI", f:"Human-Machine Interface", d:"操作员站界面，Purdue L2；常跑着多年未更新的 Windows", c:"工控" },
  { t:"HSTS", f:"HTTP Strict Transport Security", d:"强制浏览器后续只用 HTTPS，防 SSL Stripping", c:"Web" },
  { t:"IAM", f:"Identity and Access Management", d:"云上的身份与权限体系；云安全事件的主要根因区", c:"云" },
  { t:"IDOR", f:"Insecure Direct Object Reference", d:"水平越权：请求合法但对象不属于你，扫描器发现不了", c:"Web" },
  { t:"IdP / SP", f:"Identity Provider / Service Provider", d:"身份提供方 / 服务提供方", c:"模型" },
  { t:"IMDS", f:"Instance Metadata Service", d:"云实例元数据服务（169.254.169.254），可返回临时凭据，SSRF 的经典目标", c:"云" },
  { t:"IOC", f:"Indicator of Compromise", d:"失陷指标：IP、域名、哈希、注册表键；易变，不如 TTP 稳定", c:"恶意代码" },
  { t:"IV", f:"Initialization Vector", d:"初始化向量：不保密，只为让相同明文得到不同密文", c:"密码学" },
  { t:"JTAG / UART", f:"Joint Test Action Group / Universal Asynchronous Receiver-Transmitter", d:"硬件调试接口；固件设备上常未关闭，可直接拿 shell", c:"移动" },
  { t:"JWT", f:"JSON Web Token", d:"自包含令牌 Header.Payload.Signature；Payload 只是 Base64", c:"Web" },
  { t:"KDC", f:"Key Distribution Center", d:"密钥分发中心（Kerberos）", c:"密码学" },
  { t:"KDF", f:"Key Derivation Function", d:"慢哈希，用于口令存储（bcrypt / Argon2）", c:"密码学" },
  { t:"KEV", f:"Known Exploited Vulnerabilities", d:"CISA 的「已确认被利用」清单，确定性信号", c:"框架" },
  { t:"MAC", f:"Mandatory Access Control / Message Authentication Code", d:"强制访问控制（SELinux）/ 消息认证码", c:"模型" },
  { t:"MFA", f:"Multi-Factor Authentication", d:"多因素认证：知识、持有、生物特征", c:"模型" },
  { t:"NAT", f:"Network Address Translation", d:"地址转换；让内网主机共享公网 IP，也掩盖真实拓扑", c:"网络" },
  { t:"NX / DEP", f:"No-eXecute / Data Execution Prevention", d:"栈与堆不可执行，挡住「跳过去执行 shellcode」；绕过手段是 ROP", c:"逆向" },
  { t:"OCSP", f:"Online Certificate Status Protocol", d:"在线证书状态查询，比 CRL 实时", c:"密码学" },
  { t:"OEP", f:"Original Entry Point", d:"加壳程序的真实入口；脱壳的核心目标就是找到它", c:"恶意代码" },
  { t:"OIDC", f:"OpenID Connect", d:"基于 OAuth 2.0 的认证层，产出 id_token", c:"Web" },
  { t:"OPC UA", f:"Open Platform Communications Unified Architecture", d:"现代工控标准，支持加密与认证，但配置复杂易错", c:"工控" },
  { t:"OT", f:"Operational Technology", d:"运营技术（工控）；首要目标是可用性，而非机密性", c:"工控" },
  { t:"PE", f:"Portable Executable", d:"Windows 可执行文件格式；节表、导入表、熵是静态分析的主线", c:"恶意代码" },
  { t:"PIE", f:"Position Independent Executable", d:"位置无关可执行文件，让代码段也随机化", c:"逆向" },
  { t:"PKI", f:"Public Key Infrastructure", d:"公钥基础设施：CA、证书、吊销机制的整套体系", c:"密码学" },
  { t:"PLC", f:"Programmable Logic Controller", d:"可编程逻辑控制器，Purdue L1；收到畸形包可能直接锁死", c:"工控" },
  { t:"RBAC", f:"Role-Based Access Control", d:"基于角色的访问控制，最广泛使用的模型", c:"模型" },
  { t:"ReBAC", f:"Relationship-Based Access Control", d:"基于关系的访问控制（如「文档的协作者」）", c:"模型" },
  { t:"ROP", f:"Return-Oriented Programming", d:"用代码段里以 ret 结尾的 gadget 拼接逻辑，绕过 NX", c:"逆向" },
  { t:"RTU", f:"Remote Terminal Unit", d:"远程终端单元，常用于电力/水务的现场采集", c:"工控" },
  { t:"SAST", f:"Static Application Security Testing", d:"不运行代码扫源码，能定位到行但误报多", c:"框架" },
  { t:"SCA", f:"Software Composition Analysis", d:"分析第三方依赖的已知漏洞，对应供应链风险", c:"框架" },
  { t:"SCADA", f:"Supervisory Control and Data Acquisition", d:"数据采集与监视控制系统，Purdue L2", c:"工控" },
  { t:"SDL", f:"Security Development Lifecycle", d:"把安全活动嵌入开发每个阶段", c:"框架" },
  { t:"ServiceAccount", f:"Kubernetes Service Account", d:"Pod 内的服务账号；token 挂载在容器里，泄露即可调 API Server", c:"云" },
  { t:"SSO", f:"Single Sign-On", d:"单点登录；一次认证访问多个系统", c:"模型" },
  { t:"STRIDE", f:"Spoofing, Tampering, Repudiation, Information Disclosure, DoS, EoP", d:"威胁分类法，六个字母对应六类威胁", c:"框架" },
  { t:"TGT / TGS", f:"Ticket Granting Ticket / Service", d:"Kerberos 票据；TGT 是「通行证」，TGS 是「入场券」", c:"密码学" },
  { t:"TTP", f:"Tactics, Techniques, and Procedures", d:"攻击者的战术技术流程；比 IOC 稳定得多", c:"框架" },
  { t:"UAF", f:"Use After Free", d:"释放后仍被使用；攻击者可重新占用该内存，是浏览器漏洞的主力类型", c:"逆向" },
  { t:"XFF", f:"X-Forwarded-For", d:"代理追加的客户端 IP 头；无保护，可被伪造", c:"Web" },
  { t:"YARA", f:"YARA（模式匹配规则语言）", d:"用 meta/strings/condition 描述恶意样本特征，可落地到 EDR 与沙箱", c:"恶意代码" },
  { t:"零信任", f:"Zero Trust", d:"永不信任、始终验证；替代「一次认证、全内网可达」", c:"模型" },

  /* —— L6 应急响应与取证 —— */
  { t:"Chain of Custody", f:"证据链", d:"记录证据全生命周期的台账：谁、何时、从哪采、怎么移交；哈希是它的技术锚点", c:"应急取证" },
  { t:"C2", f:"Command and Control", d:"命令与控制通道；攻击者下发指令、回传数据的路径，也是检测的重点", c:"应急取证" },
  { t:"DFIR", f:"Digital Forensics and Incident Response", d:"数字取证与事件响应，蓝队的两项核心能力", c:"应急取证" },
  { t:"EDR", f:"Endpoint Detection and Response", d:"端点检测与响应：进程级遥测 + 行为检测 + 隔离处置，取证时的第一手证据源", c:"应急取证" },
  { t:"IOC", f:"Indicator of Compromise", d:"失陷指标（IP/域名/哈希）；半衰期以天计，只能抓「懒得换基础设施」的攻击者", c:"应急取证" },
  { t:"JA3 / JA3S", f:"TLS 客户端 / 服务端指纹", d:"把 ClientHello/ServerHello 的版本、套件、扩展拼串取 MD5；换域名换 IP 都改不掉", c:"应急取证" },
  { t:"KAPE", f:"Kroll Artifact Parser and Extractor", d:"快速证据采集工具：按目标批量拉取关键取证位置，几分钟出一包可分析数据", c:"应急取证" },
  { t:"LiME", f:"Linux Memory Extractor", d:"Linux 内存采集内核模块，输出可被 Volatility 直接解析的格式", c:"应急取证" },
  { t:"MFT", f:"Master File Table", d:"NTFS 主文件表：文件名、大小、时间戳、父子关系；文件删了记录也可能还在", c:"应急取证" },
  { t:"MISP", f:"Malware Information Sharing Platform", d:"开源威胁情报共享平台，用 STIX 表达、TAXII 传输", c:"应急取证" },
  { t:"NetFlow", f:"网络流统计", d:"只记五元组与字节/包数的元数据；体积极小可留数月，适合长期回溯与横向发现", c:"应急取证" },
  { t:"Playbook", f:"处置剧本", d:"某类事件的标准动作序列；必须含决策点与授权人，否则凌晨三点等于没有", c:"应急取证" },
  { t:"Prefetch", f:"Windows 程序执行记录", d:"证明某程序被执行过：次数、首次/末次时间、加载的 DLL；文件删了 .pf 还在", c:"应急取证" },
  { t:"STIX / TAXII", f:"Structured Threat Information Expression", d:"情报的标准表达格式与传输协议，让情报能在平台间自动流转", c:"应急取证" },
  { t:"TTP", f:"Tactics, Techniques, Procedures", d:"战术、技术、流程；描述「怎么做」，稳定性最高，是检测工程的主干", c:"应急取证" },
  { t:"USN Journal", f:"Update Sequence Number Journal", d:"NTFS 变更日志：记录文件的创建/改名/删除事件，补上「文件已删、MFT 已复用」的缺口", c:"应急取证" },
  { t:"Volatility", f:"内存取证框架", d:"插件式分析内存镜像；pslist 看链表、psscan 扫内存池、malfind 找注入", c:"应急取证" },
  { t:"Zeek", f:"原名 Bro · 流量分析框架", d:"把 pcap 解析成结构化连接/协议日志，适合大规模行为分析与狩猎", c:"应急取证" },
  { t:"时间戳篡改", f:"Timestomping", d:"改文件时间以混淆时间线；检测靠 $STANDARD_INFORMATION 与 $FILE_NAME 不一致", c:"应急取证" },
];

class GlossaryViz{
  constructor(){
    this.body = $("#glossBody");
    this.q = "";
    this.cat = "全部";
    this.cats = ["全部", ...Array.from(new Set(GLOSSARY.map(g => g.c))).sort()];
    this.render();
    this.body.onclick = e => {
      const b = e.target.closest("[data-cat]");
      if(!b) return;
      this.cat = b.dataset.cat;
      this.render();
    };
  }
  list(){
    const q = this.q.trim().toLowerCase();
    return GLOSSARY.filter(g => {
      if(this.cat !== "全部" && g.c !== this.cat) return false;
      if(!q) return true;
      return (g.t + " " + g.f + " " + g.d).toLowerCase().includes(q);
    });
  }
  render(){
    const rows = this.list();
    const cnt = $("#glossCount");
    if(cnt) cnt.textContent = `${rows.length} / ${GLOSSARY.length} 条`;

    this.body.innerHTML = `
      <div class="gls-wrap">
        <div class="gls-bar">
          <input id="glsInput" class="enc-input gls-input" placeholder="搜索术语 / 全称 / 解释…" value="${this.q.replace(/"/g, "&quot;")}" spellcheck="false">
          <div class="gls-cats">
            ${this.cats.map(c => `<button class="enc-chip ${c === this.cat ? "on" : ""}" data-cat="${c}">${c}</button>`).join("")}
          </div>
        </div>
        <div class="gls-list">
          ${rows.length ? rows.map(g => `
            <div class="gls-row">
              <span class="gr-t">${g.t}</span>
              <span class="gr-f">${g.f}</span>
              <span class="gr-d">${g.d}</span>
            </div>`).join("") : `<div class="gls-empty">没有匹配的术语，换个关键词试试。</div>`}
        </div>
      </div>`;

    const inp = $("#glsInput");
    if(inp){
      inp.oninput = () => {
        this.q = inp.value;
        this.render();
        const again = $("#glsInput");
        if(again){ again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
      };
    }
  }
}
