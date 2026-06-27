# 单细胞数据分析平台需求文档

版本：v0.3  
状态：开发前需求基线  
目标读者：项目开发者、AI、测试人员、后续维护者  
当前范围：数据理解层 + 标准分析层  
暂不包含：稀有细胞注释、稀有细胞识别算法、多组学分析、在线公开计算服务

---

## 1. 项目概述

本项目拟开发一个面向单细胞转录组数据理解与标准分析的 Web 应用。系统采用 **Web Console + Desktop Local Runner + Python Analysis Core** 的混合架构。

系统核心目标：

1. 帮助生信初学者快速理解单细胞数据结构；
2. 帮助研究者快速获得数据画像、质控结果和标准分析结果；
3. 避免大型单细胞数据上传服务器；
4. 通过本地桌面 Runner 在用户本机完成计算；
5. Web 端统一管理项目、任务状态、轻量结果和分析报告；
6. 为后续扩展稀有细胞识别、细胞类型注释、多组学分析预留架构空间。

---

## 2. 背景与问题

单细胞数据通常以 `.h5ad`、10x Genomics mtx 目录等格式存储。与传统 CSV 数据不同，单细胞数据往往包含：

1. 表达矩阵；
2. 细胞元数据；
3. 基因元数据；
4. 降维结果；
5. 聚类结果；
6. 图结构；
7. 分析参数和中间结果。

对于生信新手和跨专业研究者，主要痛点包括：

1. 不知道数据文件内部结构；
2. 不知道每个字段代表什么；
3. 不清楚数据是否已经标准化；
4. 不清楚是否已有 UMAP、PCA、cluster 等结果；
5. 不知道如何判断数据质量；
6. 不熟悉 Scanpy / AnnData 生态；
7. 数据文件较大，不适合直接上传服务器；
8. 服务器计算资源有限，不能开放大规模在线运行入口。

---

## 3. 产品定位

产品定位：

> 面向单细胞数据理解与标准分析的 Web Console + Local Runner 工具。

当前阶段不做“全能型生信云平台”，而是聚焦：

1. 数据结构解析；
2. 数据画像报告；
3. 基础质控；
4. 标准 scRNA-seq 分析流程；
5. 本地计算任务管理；
6. 轻量结果展示。

---

## 4. 用户角色

| 角色 | 描述 | 核心需求 |
|---|---|---|
| 生信初学者 | 刚进入课题组的新生 | 看懂数据结构，跑通基础分析 |
| 算法研究者 | 关注数据特征和后续算法构建 | 快速判断数据集是否可用 |
| 课题组成员 | 需要复用标准流程 | 规范化运行分析并导出报告 |
| 管理员 | 部署和维护系统 | 控制服务端资源、查看系统状态 |
| AI 开发代理 | 根据文档生成代码 | 明确边界、接口、规范、测试要求 |

---

## 5. 当前确认技术栈

### 5.1 Web 前端

```text
React + Vite + TypeScript
Ant Design
TanStack Query
Zustand
React Router
ECharts
Plotly.js
Deck.gl，后续用于大规模交互散点
```

### 5.2 Web 后端

```text
Node.js
Express
TypeScript
Prisma
MySQL
Zod
Pino
JWT 或 opaque token
Multer / Busboy
```

### 5.3 桌面端

```text
Tauri
React
TypeScript
Rust command bridge
```

### 5.4 分析核心

```text
Python CLI
Scanpy
AnnData
NumPy
Pandas
SciPy
scikit-learn
igraph
leidenalg
matplotlib
pyarrow
jinja2
typer 或 click
```

### 5.5 存储与部署

```text
MySQL：结构化数据
Local FS：MVP 文件存储
MinIO：后续对象存储
Docker Compose：本地和实验室部署
Nginx：前端静态资源和 API 反向代理
```

---

## 6. 系统组成

系统由四部分组成：

1. **Web Console**  
   项目管理、Runner 配对、任务配置、任务状态展示、结果展示。

2. **Web Backend**  
   API 服务、配对管理、任务管理、状态中转、结果索引、文件上传。

3. **Desktop Local Runner**  
   本地配对码生成、本机资源检测、Python 环境检测、本地数据选择、任务执行、状态回传、结果上传。

4. **Python Analysis Core**  
   独立 Python CLI，负责读取单细胞数据、执行数据画像和标准分析流程。

---

## 7. 运行模式

### 7.1 本地运行模式

当前默认并唯一对普通用户开放的运行模式。

流程：

```text
Web 创建项目
  ↓
Desktop Runner 生成配对码
  ↓
Web 输入配对码完成绑定
  ↓
Web 创建任务
  ↓
Runner 拉取任务
  ↓
Runner 本地选择数据文件
  ↓
Runner 调用 Python CLI 执行分析
  ↓
Runner 上传轻量结果
  ↓
Web 展示任务结果
```

### 7.2 在线运行模式

当前保留架构，不对普通用户开放。

后续仅管理员可使用。  
普通用户不能上传原始大型数据到服务器进行计算。

---

## 8. 功能需求

## 8.1 Web Console 功能

### 8.1.1 项目管理

必须支持：

1. 创建项目；
2. 查看项目列表；
3. 查看项目详情；
4. 编辑项目名称和描述；
5. 删除项目；
6. 查看项目下任务；
7. 查看项目绑定的 Runner；
8. 查看项目分析结果。

项目字段：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 项目 ID |
| name | string | 是 | 项目名称 |
| description | string | 否 | 项目描述 |
| status | string | 是 | active / archived |
| createdAt | datetime | 是 | 创建时间 |
| updatedAt | datetime | 是 | 更新时间 |

---

### 8.1.2 Local Runner 配对

Web 前端必须支持：

1. 输入 Desktop Runner 显示的配对码；
2. 提交配对请求；
3. 展示配对中、成功、失败、过期状态；
4. 配对成功后展示 Runner 信息；
5. 支持解绑 Runner。

配对码要求：

1. 8 到 10 位字符；
2. 分组显示，例如 `K7Q4-M9XA`；
3. 有效期 5 到 10 分钟；
4. 一次性使用；
5. 错误尝试次数限制；
6. 后端只保存 hash，不保存明文配对码；
7. 配对码不作为长期凭证。

---

### 8.1.3 Runner 信息展示

配对成功后，Web 前端展示：

1. Runner 名称；
2. Runner 在线状态；
3. 操作系统；
4. CPU 信息；
5. 内存信息；
6. GPU 信息；
7. 磁盘空间；
8. Python 环境列表；
9. 每个 Python 环境的依赖状态；
10. 推荐运行环境。

Python 环境状态：

| 状态 | 含义 |
|---|---|
| READY | 可直接运行 |
| MISSING_PACKAGES | 缺少依赖 |
| PYTHON_VERSION_UNSUPPORTED | Python 版本不支持 |
| BROKEN | 环境损坏或无法执行 |
| UNKNOWN | 无法判断 |

---

### 8.1.4 数据画像任务

数据画像任务用于快速理解数据集。

必须支持：

1. `.h5ad` 文件；
2. 10x mtx 目录，MVP 可后置；
3. 自动识别数据维度；
4. 自动解析 AnnData 结构；
5. 展示 `X`、`obs`、`var`、`layers`、`obsm`、`uns`；
6. 计算细胞数、基因数、稀疏度；
7. 展示 obs / var 字段预览；
8. 检测是否已有 PCA / UMAP / cluster；
9. 检测是否包含 raw counts；
10. 生成 HTML 报告；
11. 生成 summary JSON；
12. 上传轻量结果。

---

### 8.1.5 标准分析任务

标准分析任务用于运行 scRNA-seq 基础流程。

必须支持流程：

1. 读取数据；
2. 计算 QC 指标；
3. 细胞过滤；
4. 基因过滤；
5. normalize_total；
6. log1p；
7. 高变基因筛选；
8. PCA；
9. neighbors；
10. UMAP；
11. Leiden 聚类；
12. marker gene 计算；
13. 图表生成；
14. HTML 报告生成。

标准参数：

| 参数 | 默认值 | 说明 |
|---|---:|---|
| minGenes | 200 | 每个细胞最少基因数 |
| minCells | 3 | 每个基因至少出现的细胞数 |
| maxPercentMito | 20 | 线粒体比例上限 |
| nTopGenes | 2000 | 高变基因数量 |
| nPcs | 50 | PCA 主成分数 |
| nNeighbors | 15 | 邻居数量 |
| resolution | 0.8 | Leiden 聚类分辨率 |
| randomSeed | 42 | 随机种子 |

---

### 8.1.6 任务状态展示

Web 前端必须展示任务状态流。

任务状态：

```text
CREATED
WAITING_FOR_LOCAL_RUNNER
RUNNER_CONNECTED
WAITING_FOR_LOCAL_FILE
ENV_CHECKING
ENV_READY
INSTALLING_DEPENDENCIES
QUEUED_LOCAL
RUNNING
UPLOADING_RESULTS
COMPLETED
FAILED
CANCELLED
```

任务详情必须展示：

1. 当前状态；
2. 当前阶段；
3. 进度百分比；
4. 创建时间；
5. 开始时间；
6. 完成时间；
7. 失败原因；
8. 最近日志；
9. 结果入口。

---

### 8.1.7 结果展示

Web 前端必须支持：

1. 查看 summary；
2. 查看 HTML 报告；
3. 查看 QC 图；
4. 查看 UMAP 图；
5. 查看 cluster summary；
6. 查看 marker gene 表；
7. 下载轻量结果；
8. 查看 provenance；
9. 查看任务日志。

MVP 可使用静态图片和 HTML 报告。  
交互式 UMAP 可在 MVP 之后实现。

---

## 8.2 Desktop Local Runner 功能

### 8.2.1 配对码生成

Runner 启动后支持：

1. 生成本地 runnerId；
2. 生成 runnerSecret；
3. 生成一次性 pairCode；
4. 向后端注册 pairing session；
5. 显示 pairCode 和有效期；
6. 轮询配对状态；
7. 配对成功后保存 runner token；
8. 支持解除绑定或重新配对。

---

### 8.2.2 本机资源检测

Runner 必须检测：

1. OS；
2. CPU 型号；
3. CPU 物理核心数；
4. CPU 逻辑线程数；
5. 内存总量；
6. 可用内存；
7. GPU 信息；
8. CUDA 可用性；
9. 磁盘剩余空间。

---

### 8.2.3 Python 环境检测

Runner 必须检测：

1. PATH 中 Python；
2. Conda 环境；
3. venv / virtualenv；
4. 用户手动指定的 Python 路径。

必须检测依赖：

```text
scanpy
anndata
numpy
pandas
scipy
sklearn
matplotlib
h5py
igraph
leidenalg
umap
pyarrow
jinja2
```

---

### 8.2.4 环境准备

Runner 支持三种模式：

1. 自动创建独立环境，默认推荐；
2. 选择已有环境，仅检测；
3. 修改已有环境，高级选项。

禁止默认修改用户已有 Python 环境。  
禁止直接修改系统 Python。

---

### 8.2.5 本地数据选择

Runner 负责选择本地数据文件。

规则：

1. Web 前端不直接选择本地文件；
2. 本地完整路径不上传服务器；
3. 只上传文件显示名、文件大小、格式、数据摘要；
4. 原始数据文件不上传服务器。

---

### 8.2.6 本地任务执行

Runner 必须：

1. 拉取待执行任务；
2. 校验任务 pipeline 是否在白名单；
3. 确认本地数据文件；
4. 确认 Python 环境；
5. 调用 Python Analysis Core CLI；
6. 捕获 stdout / stderr；
7. 监听 progress.jsonl；
8. 上传状态；
9. 上传轻量结果；
10. 失败时上传错误摘要。

---

## 8.3 Backend 功能

Backend 必须支持：

1. 项目管理；
2. Runner 配对；
3. Runner profile 存储；
4. 任务管理；
5. 任务状态更新；
6. 结果文件上传；
7. 结果文件查询；
8. 日志保存；
9. token 鉴权；
10. 文件白名单校验。

---

## 9. 数据策略

### 9.1 服务器保存

服务器可保存：

1. 项目信息；
2. Runner profile；
3. Python 环境摘要；
4. 任务配置；
5. 任务状态；
6. summary.json；
7. report.html；
8. figures；
9. marker 表；
10. cluster summary；
11. obs / var 预览；
12. provenance.json；
13. run.log。

### 9.2 服务器默认不保存

服务器默认不保存：

1. 原始 `.h5ad`；
2. 原始 10x 矩阵；
3. 完整表达矩阵；
4. 完整输出 `.h5ad`；
5. 大型中间结果；
6. 本地完整文件路径；
7. 用户目录结构。

---

## 10. 非功能需求

### 10.1 性能

1. 普通 API 响应应小于 500ms；
2. 任务状态刷新延迟应小于 5 秒；
3. 数据画像应优先读取 metadata；
4. 大数据集不应默认全量上传 embedding；
5. Web 前端不能直接加载大型表达矩阵。

### 10.2 安全

1. 后端不能下发任意 shell 命令；
2. Runner 只能执行白名单 pipeline；
3. 配对码短期有效；
4. 配对码不可复用；
5. token 最小权限；
6. 上传文件类型白名单；
7. 原始数据默认不上传；
8. 本地路径默认不上传；
9. 所有输入必须校验；
10. 所有错误不能泄露服务端敏感路径。

### 10.3 可复现性

每个任务必须记录：

1. taskId；
2. pipeline；
3. 参数；
4. randomSeed；
5. Python 版本；
6. 包版本；
7. OS；
8. Analysis Core 版本；
9. 运行时间；
10. 输出文件清单。

### 10.4 认证与访问模型

当前阶段 scLens 定位为**单用户本地工具**，不实现注册、多用户、团队权限或项目级数据隔离（与第 13 节一致）。

1. **Web Console 用户侧**：MVP **默认不要求登录**。是否启用一层轻保护由环境变量 `WEB_ACCESS_TOKEN` 控制：
   - 未设置：所有 Web 接口直接放行（默认，适合本机/实验室内网）；
   - 已设置：所有 Web 接口（Project / Task 查询与创建等）必须携带 `Authorization: Bearer <WEB_ACCESS_TOKEN>`，否则返回 `401 UNAUTHORIZED`。
2. **Runner 侧**：与用户认证完全独立，始终使用配对后下发的 `runnerAccessToken`（见第 11 节配对流程），不受 `WEB_ACCESS_TOKEN` 影响。
3. Web 与 Runner 是**两套独立凭证**，互不复用。
4. 暂不做：登录页、用户表、密码哈希、会话续期、找回密码、RBAC。后续若要多用户，再在此基础上扩展，不影响 Runner 协议。

---

## 11. MVP 范围

### MVP 1：配对 + 数据画像

必须完成：

1. React Web Console 项目创建；
2. Express Backend 基础 API；
3. Tauri Runner 生成配对码；
4. Web 输入配对码完成绑定；
5. Runner 上传系统信息；
6. Runner 上传 Python 环境信息；
7. Web 展示 Runner profile；
8. Runner 本地选择 `.h5ad`；
9. Python CLI 生成数据画像报告；
10. Runner 上传 summary 和 report；
11. Web 展示报告。

### MVP 2：标准分析

必须完成：

1. Web 配置标准分析参数；
2. Runner 拉取标准分析任务；
3. Python CLI 完成 QC、HVG、PCA、UMAP、Leiden、marker；
4. Runner 上传图表和表格；
5. Web 展示任务结果。

### MVP 3：交互式结果浏览

后续完成：

1. 交互式 UMAP；
2. marker 表筛选；
3. obs / var 浏览；
4. 多任务对比；
5. 报告导出。

---

## 12. 验收标准

### 12.1 配对验收

1. Runner 能生成配对码；
2. Web 能输入配对码；
3. 后端能完成绑定；
4. Web 能显示 Runner 在线；
5. 配对码过期后不可使用；
6. 配对成功后不可复用。

### 12.2 数据画像验收

1. 给定测试 `.h5ad`，Runner 能读取；
2. 能输出细胞数和基因数；
3. 能输出 AnnData 结构；
4. 能输出 obs / var 字段；
5. 能生成 HTML 报告；
6. Web 能展示报告；
7. 服务器不保存原始数据。

### 12.3 标准分析验收

1. 能完成 QC；
2. 能完成 normalize；
3. 能完成 log1p；
4. 能完成 HVG；
5. 能完成 PCA；
6. 能完成 UMAP；
7. 能完成 Leiden；
8. 能生成 marker 表；
9. 能生成图表；
10. 能保存 provenance。

---

## 13. 明确不做

当前阶段不做：

1. 细胞类型自动注释；
2. 稀有细胞识别；
3. 多组学分析；
4. 公共数据平台；
5. 团队协作权限系统；
6. 云端大规模计算；
7. 浏览器直接读取本地 h5ad；
8. Web 端直接运行 Python；
9. 任意命令执行；
10. 原始数据云端托管。
