# 单细胞数据分析平台开发文档

版本：v0.3  
状态：开发前技术基线  
目标读者：AI、开发者、维护者  
核心目标：让 AI 能基于本文档分阶段生成可维护、可测试、可扩展的代码

---

## 1. 开发总原则

### 1.1 核心架构原则

1. Web 前端只负责交互、配置、状态展示和结果可视化；
2. Web 后端只负责任务编排、状态中转、元数据和结果索引；
3. Desktop Runner 负责本地资源检测、本地文件选择和本地任务执行；
4. Python Analysis Core 负责所有单细胞分析逻辑；
5. 原始数据不上传服务器；
6. 后端不得向 Runner 下发任意 shell 命令；
7. Runner 只能执行白名单 pipeline；
8. 所有任务配置必须结构化；
9. 所有输出结果必须带 provenance；
10. 代码优先保证可读性、可测试性和模块边界清晰。

---

## 2. 技术栈

### 2.1 Web Frontend

```text
React
Vite
TypeScript
React Router
TanStack Query
Zustand
Ant Design
ECharts
Plotly.js
Deck.gl，后续使用
```

### 2.2 Web Backend

```text
Node.js
Express
TypeScript
Prisma
MySQL
Zod
Pino
Multer / Busboy
jsonwebtoken 或 opaque token
```

### 2.3 Desktop Runner

```text
Tauri
React
TypeScript
Rust command bridge
```

### 2.4 Analysis Core

```text
Python
Typer 或 Click
Scanpy
AnnData
NumPy
Pandas
SciPy
scikit-learn
matplotlib
igraph
leidenalg
pyarrow
jinja2
```

### 2.5 DevOps

```text
pnpm workspace
Docker Compose
Nginx
MySQL
Local FS，MVP
MinIO，后续
```

---

## 3. Monorepo 结构

必须采用如下结构：

```text
sclens/
├── apps/
│   ├── web/
│   ├── backend/
│   └── desktop/
├── packages/
│   ├── shared-types/
│   ├── api-client/
│   └── ui/
├── python/
│   └── analysis-core/          # 内含 sclens_core 包
├── infra/
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── mysql/
├── docs/
│   ├── README.md
│   ├── 01_REQUIREMENTS.md
│   ├── 02_DEVELOPMENT_GUIDE.md
│   ├── 03_TEST_PLAN.md
│   ├── 04_AI_GUIDE.md
│   └── 05_API_SCHEMA.md
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 4. 命名规范

### 4.1 通用命名

| 类型 | 规范 | 示例 |
|---|---|---|
| 文件夹 | kebab-case | task-status |
| React 组件 | PascalCase | TaskStatusTimeline.tsx |
| TypeScript 类型 | PascalCase | TaskStatus |
| 变量 | camelCase | runnerId |
| 常量 | UPPER_SNAKE_CASE | TASK_STATUS |
| 数据库表 | snake_case | runner_profile |
| API 路径 | kebab-case | /pair-runner |
| Python 模块 | snake_case | inspect_pipeline.py |
| Python 函数 | snake_case | run_standard_pipeline |

### 4.2 ID 命名

统一使用：

```text
projectId
runnerId
taskId
resultFileId
pairingSessionId
```

数据库字段使用 snake_case：

```text
project_id
runner_id
task_id
result_file_id
pairing_session_id
```

API 返回给前端时使用 camelCase。

---

## 5. Git 与分支规范

### 5.1 分支

```text
main              稳定分支
develop           开发集成分支
feature/*         功能分支
fix/*             修复分支
docs/*            文档分支
```

### 5.2 Commit 规范

使用 Conventional Commits：

```text
feat: add runner pairing api
fix: prevent expired pair code reuse
docs: update test plan
test: add task status service tests
refactor: split task controller
chore: update docker compose
```

### 5.3 PR 要求

每个 PR 必须包含：

1. 变更说明；
2. 影响模块；
3. 测试结果；
4. 是否涉及数据库迁移；
5. 是否涉及 API 变更；
6. 是否涉及安全边界。

---

## 6. 前端开发规范

### 6.1 Web 目录结构

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── pages/
│   │   ├── projects/
│   │   ├── runners/
│   │   ├── tasks/
│   │   └── results/
│   ├── components/
│   ├── features/
│   │   ├── project/
│   │   ├── runner/
│   │   ├── pairing/
│   │   ├── task/
│   │   └── result/
│   ├── stores/
│   ├── api/
│   ├── types/
│   └── main.tsx
├── package.json
└── vite.config.ts
```

### 6.2 前端原则

1. 页面组件只做布局和组合；
2. 业务逻辑放在 `features/*`；
3. API 请求统一放在 `api/` 或 `packages/api-client`；
4. 服务端状态使用 TanStack Query；
5. 简单全局状态使用 Zustand；
6. 禁止在组件内硬编码 API URL；
7. 禁止直接在前端处理大型表达矩阵；
8. 所有任务状态必须使用统一枚举；
9. 所有表单必须做前端校验；
10. 所有 API 错误必须有用户可理解提示。

### 6.3 React 组件规范

组件示例：

```tsx
type RunnerProfileCardProps = {
  runner: RunnerProfile;
};

export function RunnerProfileCard({ runner }: RunnerProfileCardProps) {
  return null;
}
```

要求：

1. 组件必须有明确 Props 类型；
2. 不允许使用 `any`；
3. 不允许在展示组件中直接发请求；
4. 复杂组件必须拆分；
5. 图表组件必须支持 loading、empty、error 状态。

---

## 7. 后端开发规范

### 7.1 Backend 目录结构

```text
apps/backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   ├── env.ts
│   │   └── storage.ts
│   ├── db/
│   │   └── prisma.ts
│   ├── modules/
│   │   ├── project/
│   │   │   ├── project.routes.ts
│   │   │   ├── project.controller.ts
│   │   │   ├── project.service.ts
│   │   │   └── project.schema.ts
│   │   ├── runner/
│   │   ├── pairing/
│   │   ├── task/
│   │   ├── result/
│   │   └── auth/
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── request-id.middleware.ts
│   │   └── validate.middleware.ts
│   ├── utils/
│   └── types/
├── prisma/
│   └── schema.prisma
└── package.json
```

### 7.2 后端模块

必须按模块拆分：

1. project；
2. runner；
3. pairing；
4. task；
5. result；
6. auth；
7. health。

每个模块至少包含：

1. routes；
2. controller；
3. service；
4. schema；
5. tests。

### 7.3 Express 规范

1. `app.ts` 只注册中间件和路由；
2. `server.ts` 只启动 HTTP 服务；
3. controller 只处理 request / response；
4. service 处理业务逻辑；
5. database 操作通过 Prisma；
6. 所有输入必须经过 Zod 校验；
7. 所有错误统一进入 error middleware；
8. 所有日志使用 Pino；
9. 禁止在 controller 中写复杂业务；
10. 禁止把 SQL 字符串散落在业务代码中。

### 7.4 环境变量与运行配置

所有可配置项通过环境变量注入，`config/env.ts` 用 Zod 校验后导出强类型配置，**禁止在代码中硬编码**。仓库提供 `.env.example`，真实 `.env` 不入库。

#### Backend（`apps/backend`）

| 变量 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `PORT` | 否 | `3001` | HTTP 端口 |
| `DATABASE_URL` | 是 | — | Prisma MySQL 连接串 |
| `STORAGE_ROOT` | 否 | `./storage` | Local FS 结果存储根目录 |
| `RUNNER_TOKEN_SECRET` | 是 | — | 签发/校验 `runnerAccessToken` 的密钥 |
| `WEB_ACCESS_TOKEN` | 否 | 空 | 见需求 10.4；为空则 Web 接口不鉴权 |
| `PAIR_CODE_TTL_SECONDS` | 否 | `600` | 配对码有效期 |
| `PAIR_CODE_MAX_ATTEMPTS` | 否 | `5` | 配对码最大错误尝试次数 |
| `CORS_ORIGIN` | 否 | `http://localhost:5173` | 允许的 Web 源 |
| `LOG_LEVEL` | 否 | `info` | Pino 日志级别 |

#### Web（`apps/web`，Vite 前缀 `VITE_`）

| 变量 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `VITE_API_BASE_URL` | 否 | `http://localhost:3001/api` | 后端 API 地址 |
| `VITE_WEB_ACCESS_TOKEN` | 否 | 空 | 若后端启用 `WEB_ACCESS_TOKEN`，前端用它附带 Bearer 头 |

> Vite dev server 默认 `5173`，通过 `vite.config.ts` 的 `server.proxy` 把 `/api` 代理到后端，避免开发期 CORS。

#### Desktop Runner（`apps/desktop`）

后端地址不写死，由用户在 Runner UI 设置后持久化到本地配置；默认 `http://localhost:3001/api`。`runnerSecret`、`runnerAccessToken` 存本地安全存储，不入库、不打日志。

---

## 8. 数据库设计

使用 Prisma 管理 schema 和 migration。

### 8.1 核心模型

```prisma
model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  status      String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tasks       Task[]
  bindings    ProjectRunnerBinding[]
}

model Runner {
  id                String   @id @default(uuid())
  runnerName        String?
  deviceFingerprint String?
  os                String?
  arch              String?
  status            String   @default("offline")
  lastSeenAt         DateTime?
  createdAt          DateTime @default(now())

  profile           RunnerProfile?
  bindings          ProjectRunnerBinding[]
  tasks             Task[]
}

model RunnerProfile {
  id          String   @id @default(uuid())
  runnerId    String   @unique
  hostname    String?
  cpuInfo     Json?
  memoryInfo  Json?
  gpuInfo     Json?
  diskInfo    Json?
  pythonEnvs  Json?
  updatedAt   DateTime @updatedAt

  runner      Runner   @relation(fields: [runnerId], references: [id])
}

model RunnerPairingSession {
  id              String   @id @default(uuid())
  runnerId         String
  pairCodeHash     String
  pairNonce        String
  runnerSecretHash String   // sha256(runnerSecret)，用于轮询鉴权；不保存明文
  status           String
  expiresAt        DateTime
  pairedProjectId  String?
  pairedAt         DateTime?
  attemptCount     Int      @default(0)
  createdAt        DateTime @default(now())
}

model ProjectRunnerBinding {
  id          String   @id @default(uuid())
  projectId   String
  runnerId    String
  status      String   @default("active")
  createdAt   DateTime @default(now())

  project     Project  @relation(fields: [projectId], references: [id])
  runner      Runner   @relation(fields: [runnerId], references: [id])
}

model Task {
  id            String   @id @default(uuid())
  projectId     String
  runnerId      String?
  name          String
  pipeline      String
  status        String
  config        Json
  inputFileMeta Json?    // 仅文件显示名/大小/格式/数据摘要，绝不含本地完整路径
  progress      Int      @default(0)
  currentStage  String?
  errorMessage  String?
  startedAt     DateTime?
  finishedAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  project       Project  @relation(fields: [projectId], references: [id])
  runner        Runner?  @relation(fields: [runnerId], references: [id])
  resultFiles   ResultFile[]
  logs          TaskLog[]
}

model TaskLog {
  id          String   @id @default(uuid())
  taskId      String
  level       String   // info | warn | error
  stage       String?
  message     String   @db.Text
  createdAt   DateTime @default(now())

  task        Task     @relation(fields: [taskId], references: [id])
}

model ResultFile {
  id          String   @id @default(uuid())
  taskId      String
  fileType    String
  fileName    String
  objectKey   String
  sizeBytes   BigInt?
  checksum    String?
  createdAt   DateTime @default(now())

  task        Task     @relation(fields: [taskId], references: [id])
}
```

> **日志落库策略**：实时/结构化日志（`POST /api/tasks/:taskId/logs`）写入 `TaskLog` 表，仅供 Web 展示"最近日志"；完整 `run.log` 作为结果文件（`fileType=log`）走 `ResultFile` 存到 storage。两者不互相替代。`inputFileMeta` 示例：`{ "displayName": "pbmc3k.h5ad", "sizeBytes": 123456, "format": "h5ad", "summary": { "nObs": 2700, "nVars": 32738 } }`。

---

## 9. API 规范

### 9.1 通用响应格式

成功：

```json
{
  "success": true,
  "data": {},
  "requestId": "req_xxx"
}
```

失败：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {}
  },
  "requestId": "req_xxx"
}
```

### 9.2 HTTP 状态码

| 状态码 | 使用场景 |
|---|---|
| 200 | 查询成功 |
| 201 | 创建成功 |
| 400 | 参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 状态冲突 |
| 410 | 配对码过期 |
| 429 | 尝试次数过多 |
| 500 | 服务端错误 |

---

## 10. 核心 API

### 10.1 Project API

```http
POST /api/projects
GET /api/projects
GET /api/projects/:projectId
PATCH /api/projects/:projectId
DELETE /api/projects/:projectId
```

### 10.2 Pairing API

```http
POST /api/runners/pairing-sessions
GET /api/runners/pairing-sessions/:pairingSessionId
POST /api/projects/:projectId/pair-runner
```

### 10.3 Runner API

```http
POST /api/runners/:runnerId/heartbeat
POST /api/runners/:runnerId/profile
GET /api/projects/:projectId/runners
DELETE /api/projects/:projectId/runners/:runnerId
```

### 10.4 Task API

```http
POST /api/projects/:projectId/tasks
GET /api/projects/:projectId/tasks
GET /api/tasks/:taskId
GET /api/runners/:runnerId/tasks/pending
POST /api/tasks/:taskId/status
POST /api/tasks/:taskId/logs
POST /api/tasks/:taskId/results
GET /api/tasks/:taskId/results
```

---

## 11. 配对流程设计

### 11.1 Runner 端

Runner 本地生成：

```json
{
  "runnerId": "runner_xxx",
  "runnerSecret": "local_secret",
  "pairCode": "K7Q4-M9XA",
  "pairNonce": "nonce_xxx",
  "pairCodeHash": "sha256(pairCode + pairNonce)"
}
```

Runner 调用：

```http
POST /api/runners/pairing-sessions
```

提交 `pairCodeHash`、`pairNonce` 和 `runnerSecretHash = sha256(runnerSecret)`。后端只保存这些 hash，**不保存明文 pairCode，也不保存明文 runnerSecret**。

### 11.2 Web 端

Web 用户输入 pairCode：

```http
POST /api/projects/:projectId/pair-runner
```

后端遍历未过期 pairing sessions，通过 nonce 计算 hash 匹配。

成功后：

1. pairing session 置为 PAIRED；
2. 创建 project_runner_binding；
3. 生成 runnerAccessToken；
4. Runner 携带 `X-Runner-Secret` 轮询，密钥匹配后取得 `runnerAccessToken`（仅匹配时下发）；
5. Runner 上传 profile。

---

## 12. 任务状态机

### 12.1 完整合法迁移表

后端 `taskStateMachine` 必须以此表为唯一事实来源。任何不在表中的迁移一律拒绝并返回 `409 STATE_CONFLICT`。

| 当前状态 | 允许迁移到 | 谁可触发 |
|---|---|---|
| `CREATED` | `WAITING_FOR_LOCAL_RUNNER`, `CANCELLED` | Backend |
| `WAITING_FOR_LOCAL_RUNNER` | `RUNNER_CONNECTED`, `CANCELLED`, `FAILED` | Backend（Runner 拉取任务后由 Backend 置 `RUNNER_CONNECTED`） |
| `RUNNER_CONNECTED` | `WAITING_FOR_LOCAL_FILE`, `CANCELLED`, `FAILED` | Runner |
| `WAITING_FOR_LOCAL_FILE` | `ENV_CHECKING`, `CANCELLED`, `FAILED` | Runner（用户在桌面端选定本地文件后） |
| `ENV_CHECKING` | `ENV_READY`, `INSTALLING_DEPENDENCIES`, `FAILED`, `CANCELLED` | Runner |
| `INSTALLING_DEPENDENCIES` | `ENV_READY`, `FAILED`, `CANCELLED` | Runner |
| `ENV_READY` | `QUEUED_LOCAL`, `FAILED`, `CANCELLED` | Runner |
| `QUEUED_LOCAL` | `RUNNING`, `CANCELLED`, `FAILED` | Runner |
| `RUNNING` | `UPLOADING_RESULTS`, `FAILED`, `CANCELLED` | Runner |
| `UPLOADING_RESULTS` | `COMPLETED`, `FAILED`, `CANCELLED` | Runner |
| `COMPLETED` | —（终态） | — |
| `FAILED` | —（终态） | — |
| `CANCELLED` | —（终态） | — |

### 12.2 状态归属与握手

1. `CREATED`、`WAITING_FOR_LOCAL_RUNNER`、`RUNNER_CONNECTED` 由 **Backend** 写入：建任务即 `CREATED`，随后 `WAITING_FOR_LOCAL_RUNNER`；当目标 Runner 调用 `GET /tasks/pending` 拉到该任务时，Backend 置 `RUNNER_CONNECTED`。
2. 从 `RUNNER_CONNECTED` 起的所有推进由 **Runner** 通过 `POST /api/tasks/:taskId/status` 上报，Backend 按 12.1 校验后落库。
3. `WAITING_FOR_LOCAL_FILE` → `ENV_CHECKING` 由 Runner 在“用户已在桌面端选定本地文件”后触发；Web 端**不**参与选文件，只展示状态。
4. `CANCELLED` 可由用户从 Web 或桌面端发起，作用于任一非终态。
5. 终态（`COMPLETED` / `FAILED` / `CANCELLED`）不可再迁移；重试必须**新建任务**，不得复用旧任务 id。

### 12.3 不变量

1. 禁止从 `CREATED` 直接跳到 `COMPLETED`；
2. 禁止从任一终态回到非终态（含 `FAILED` → `RUNNING`）；
3. 进入 `FAILED` 必须同时写入 `errorMessage` 与失败时的 `currentStage`；
4. 进入 `COMPLETED` 必须写入 `finishedAt`。

---

## 13. Desktop Runner 开发规范

### 13.1 目录结构

```text
apps/desktop/
├── src/
│   ├── app/
│   ├── pages/
│   │   ├── PairingPage.tsx
│   │   ├── SystemInfoPage.tsx
│   │   ├── PythonEnvPage.tsx
│   │   └── TaskPage.tsx
│   ├── features/
│   │   ├── pairing/
│   │   ├── system-probe/
│   │   ├── python-env/
│   │   └── task-runner/
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── commands/
│   │   ├── system_probe.rs
│   │   ├── python_probe.rs
│   │   ├── task_runner.rs
│   │   └── main.rs
│   └── tauri.conf.json
```

### 13.2 Runner 原则

1. 不登录账号；
2. 只通过配对码绑定项目；
3. 主动连接后端；
4. 不开放本地 HTTP API 给浏览器调用，除非后续明确设计；
5. 不上传原始数据；
6. 不上传本地完整路径；
7. 不执行任意命令；
8. 所有本地命令必须在 Rust command 白名单中；
9. Python 进程必须捕获 stdout、stderr、exit code；
10. 用户可以取消任务。

### 13.3 轮询与心跳频率

为满足"任务状态刷新延迟 < 5s"（需求 10.1），MVP 采用轮询，默认间隔如下：

| 行为 | 默认间隔 | 说明 |
|---|---|---|
| Runner 拉取待执行任务 | 3s | `GET /api/runners/:runnerId/tasks/pending` |
| Runner 心跳 | 10s | `POST /api/runners/:runnerId/heartbeat`，后端据此更新 `lastSeenAt` |
| 后端判定 Runner 离线 | 30s 无心跳 | 超时将 `Runner.status` 置 `offline` |
| Web 任务详情刷新 | 3s | TanStack Query `refetchInterval`；任务进入终态后停止轮询 |
| Web 任务列表刷新 | 5s | 列表页较详情页可放宽 |

以上为默认值，后续可整体替换为 SSE / WebSocket 推送，**不改变现有 REST API 契约**。

---

## 14. Python Analysis Core 开发规范

### 14.1 目录结构

```text
python/analysis-core/
├── sclens_core/
│   ├── cli.py
│   ├── io/
│   │   ├── read_h5ad.py
│   │   ├── read_10x.py
│   │   └── inspect.py
│   ├── pipelines/
│   │   ├── inspect_pipeline.py
│   │   └── standard_pipeline.py
│   ├── qc/
│   ├── plotting/
│   ├── report/
│   ├── schemas/
│   └── utils/
├── tests/
├── pyproject.toml
└── README.md
```

### 14.2 CLI 命令

必须支持：

```bash
# pipeline sc_profile_basic ↔ CLI 子命令 inspect
sclens inspect \
  --input /path/to/data.h5ad \
  --output /path/to/output

# pipeline sc_standard_analysis ↔ CLI 子命令 run-standard
sclens run-standard \
  --input /path/to/data.h5ad \
  --config /path/to/task-config.yaml \
  --output /path/to/output
```

> CLI 子命令与 pipeline 白名单一一对应：`sc_profile_basic` → `inspect`，`sc_standard_analysis` → `run-standard`。Runner 只能按此映射调用，禁止接受后端下发的任意命令字符串。

### 14.3 输出目录

```text
output_dir/
├── summary.json
├── report.html
├── provenance.json
├── progress.jsonl
├── logs/
│   └── run.log
├── figures/
├── tables/
└── embeddings/
```

### 14.4 progress.jsonl

每行一个 JSON：

```json
{"stage":"inspect","progress":10,"message":"Inspecting AnnData"}
{"stage":"qc","progress":25,"message":"Computing QC metrics"}
{"stage":"pca","progress":50,"message":"Running PCA"}
{"stage":"done","progress":100,"message":"Completed"}
```

---

## 15. 文件存储规范

MVP 使用 Local FS：

```text
storage/
├── projects/
│   └── {projectId}/
│       └── tasks/
│           └── {taskId}/
│               ├── report.html
│               ├── summary.json
│               ├── figures/
│               ├── tables/
│               └── logs/
```

数据库只保存索引：

1. taskId；
2. fileType；
3. fileName；
4. objectKey；
5. sizeBytes；
6. checksum。

禁止把文件二进制直接存 MySQL。

---

## 16. 安全约束

### 16.1 禁止事项

严禁实现：

1. 后端下发 shell command；
2. Runner 执行非白名单命令；
3. Web 前端读取本地文件路径；
4. 上传原始 `.h5ad`；
5. 上传完整表达矩阵；
6. 把本地路径写入后端数据库；
7. 关闭输入校验；
8. 在日志中打印 token；
9. 在前端暴露密钥；
10. 在数据库保存明文 pairCode。

### 16.2 文件上传白名单

允许：

```text
.json
.html
.png
.svg
.csv
.tsv
.parquet
.log
.txt
```

默认拒绝：

```text
.h5ad
.mtx
.exe
.sh
.bat
.cmd
.ps1
.zip
.tar
```

---

## 17. 测试要求

每个模块必须有测试。

最低要求：

1. Backend service 单元测试；
2. Backend API 集成测试；
3. Frontend 关键组件测试；
4. Analysis Core Python 单元测试；
5. Runner 核心逻辑测试；
6. 端到端核心流程测试；
7. 文件上传安全测试；
8. 配对码安全测试。

详细见 `TEST_PLAN.md`。

---

## 18. AI开发约束

AI 必须遵守：

1. 不得修改已确认技术栈，除非明确要求；
2. 不得把 Python 分析逻辑写进 Express 后端；
3. 不得把本地 Runner 逻辑写进 Web 前端；
4. 不得创建未在文档中定义的新顶层目录；
5. 不得使用 `any` 逃避类型；
6. 不得跳过 Zod 校验；
7. 不得跳过测试；
8. 不得改变 API 响应格式；
9. 不得上传原始数据；
10. 不得实现任意命令执行。

---

## 19. 推荐开发顺序

```text
1. 初始化 monorepo
2. 创建 shared-types
3. 创建 backend 基础项目
4. 创建 Prisma schema
5. 实现 Project API
6. 实现 Pairing API
7. 实现 Runner Profile API
8. 创建 web 前端项目
9. 实现项目页面和配对页面
10. 创建 desktop Tauri 项目
11. 实现配对码生成和注册
12. 实现 Runner profile 检测
13. 创建 Python Analysis Core
14. 实现 inspect CLI
15. 实现任务创建、拉取和状态更新
16. 实现结果上传和展示
17. 实现 standard pipeline
18. 补齐测试
19. Docker Compose 部署
```

---

## 20. Definition of Done

每个功能完成必须满足：

1. 代码已实现；
2. 类型检查通过；
3. lint 通过；
4. 单元测试通过；
5. 相关集成测试通过；
6. API 文档或 schema 更新；
7. 无安全约束违反；
8. UI 有 loading / error / empty 状态；
9. 日志无敏感信息；
10. PR 描述清楚。
