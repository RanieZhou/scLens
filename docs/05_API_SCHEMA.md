# API 与 Schema 文档

版本：v0.3  
目标：统一前后端、Runner、AI 对接口和数据结构的理解

---

## 1. 通用约定

### 1.1 Base URL

开发环境：

```text
http://localhost:3001/api
```

生产环境：

```text
/api
```

### 1.2 响应格式

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

---

## 2. 枚举

### 2.1 TaskStatus

```ts
export type TaskStatus =
  | "CREATED"
  | "WAITING_FOR_LOCAL_RUNNER"
  | "RUNNER_CONNECTED"
  | "WAITING_FOR_LOCAL_FILE"
  | "ENV_CHECKING"
  | "ENV_READY"
  | "INSTALLING_DEPENDENCIES"
  | "QUEUED_LOCAL"
  | "RUNNING"
  | "UPLOADING_RESULTS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";
```

### 2.2 RunnerStatus

```ts
export type RunnerStatus =
  | "offline"
  | "online"
  | "paired"
  | "busy"
  | "error";
```

### 2.3 PairingStatus

```ts
export type PairingStatus =
  | "WAITING"
  | "PAIRED"
  | "EXPIRED"
  | "FAILED";
```

### 2.4 Pipeline

```ts
export type Pipeline =
  | "sc_profile_basic"
  | "sc_standard_analysis";
```

---

## 3. Project API

### 3.1 创建项目

```http
POST /api/projects
```

请求：

```json
{
  "name": "PBMC Demo",
  "description": "PBMC 10k analysis"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "id": "project_xxx",
    "name": "PBMC Demo",
    "description": "PBMC 10k analysis",
    "status": "active",
    "createdAt": "2026-06-27T10:00:00.000Z",
    "updatedAt": "2026-06-27T10:00:00.000Z"
  },
  "requestId": "req_xxx"
}
```

### 3.2 获取项目列表

```http
GET /api/projects
```

### 3.3 获取项目详情

```http
GET /api/projects/:projectId
```

### 3.4 更新项目

```http
PATCH /api/projects/:projectId
```

### 3.5 删除项目

```http
DELETE /api/projects/:projectId
```

---

## 4. Pairing API

### 4.1 Runner 创建配对会话

```http
POST /api/runners/pairing-sessions
```

请求：

```json
{
  "runnerId": "runner_xxx",
  "pairCodeHash": "hash_xxx",
  "pairNonce": "nonce_xxx",
  "runnerSecretHash": "sha256(runnerSecret)",
  "expiresIn": 600
}
```

> `runnerSecret` 由 Runner 本地生成、**永不上传明文**；这里只提交其 sha256。后端将该 hash 存入 `RunnerPairingSession.runnerSecretHash`，用于后续轮询时鉴权。

响应：

```json
{
  "success": true,
  "data": {
    "pairingSessionId": "session_xxx",
    "status": "WAITING",
    "expiresAt": "2026-06-27T10:10:00.000Z"
  },
  "requestId": "req_xxx"
}
```

### 4.2 Runner 查询配对状态

```http
GET /api/runners/pairing-sessions/:pairingSessionId
X-Runner-Secret: <runnerSecret 明文>
```

> 轮询必须携带 `X-Runner-Secret`。后端用 `sha256(X-Runner-Secret)` 与会话存储的 `runnerSecretHash` 比对，不匹配返回 `403 FORBIDDEN`。**仅在匹配时**才下发 `runnerAccessToken`，防止仅凭 `pairingSessionId` 就窃取 token。

响应（已配对且密钥匹配）：

```json
{
  "success": true,
  "data": {
    "status": "PAIRED",
    "runnerAccessToken": "token_xxx"
  },
  "requestId": "req_xxx"
}
```

未配对时 `status` 为 `WAITING`，且**不返回** `runnerAccessToken`。

### 4.3 Web 输入配对码

```http
POST /api/projects/:projectId/pair-runner
```

请求：

```json
{
  "pairCode": "K7Q4-M9XA"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "status": "PAIRED",
    "runnerId": "runner_xxx"
  },
  "requestId": "req_xxx"
}
```

---

## 5. Runner API

### 5.1 Heartbeat

```http
POST /api/runners/:runnerId/heartbeat
Authorization: Bearer <runnerAccessToken>
```

请求：

```json
{
  "status": "online"
}
```

### 5.2 上传 Runner Profile

```http
POST /api/runners/:runnerId/profile
Authorization: Bearer <runnerAccessToken>
```

请求：

```json
{
  "hostname": "DESKTOP-ABC",
  "os": "Windows 11",
  "arch": "x86_64",
  "cpuInfo": {
    "model": "Intel i7",
    "physicalCores": 8,
    "logicalCores": 16
  },
  "memoryInfo": {
    "totalGb": 32,
    "availableGb": 18
  },
  "gpuInfo": [
    {
      "vendor": "NVIDIA",
      "name": "RTX 4060",
      "vramGb": 8,
      "cudaAvailable": true
    }
  ],
  "diskInfo": {
    "freeGb": 420
  },
  "pythonEnvs": [
    {
      "envId": "conda:scrna",
      "type": "conda",
      "name": "scrna",
      "pythonPathMasked": ".../envs/scrna/python",
      "pythonVersion": "3.10.x",
      "packages": {
        "scanpy": "installed",
        "anndata": "installed"
      },
      "status": "READY",
      "missing": [],
      "recommended": true
    }
  ]
}
```

### 5.3 获取项目绑定的 Runner

```http
GET /api/projects/:projectId/runners
```

---

## 6. Task API

### 6.1 创建任务

```http
POST /api/projects/:projectId/tasks
```

请求：

```json
{
  "name": "PBMC basic profile",
  "pipeline": "sc_profile_basic",
  "runnerId": "runner_xxx",
  "config": {
    "input": {
      "type": "h5ad",
      "localFileRequired": true,
      "uploadRawData": false
    },
    "steps": {
      "inspect": {
        "enabled": true
      },
      "qc": {
        "enabled": true,
        "mitoGenePrefix": "MT-"
      }
    },
    "outputs": {
      "upload": {
        "summaryJson": true,
        "reportHtml": true,
        "figures": true,
        "rawData": false
      }
    }
  }
}
```

### 6.2 Runner 获取待执行任务

```http
GET /api/runners/:runnerId/tasks/pending
Authorization: Bearer <runnerAccessToken>
```

响应：

```json
{
  "success": true,
  "data": [
    {
      "id": "task_xxx",
      "projectId": "project_xxx",
      "runnerId": "runner_xxx",
      "name": "PBMC basic profile",
      "pipeline": "sc_profile_basic",
      "status": "CREATED",
      "config": {}
    }
  ],
  "requestId": "req_xxx"
}
```

### 6.3 更新任务状态

```http
POST /api/tasks/:taskId/status
Authorization: Bearer <runnerAccessToken>
```

请求：

```json
{
  "status": "RUNNING",
  "progress": 45,
  "currentStage": "pca",
  "message": "Running PCA"
}
```

### 6.4 上传任务日志

```http
POST /api/tasks/:taskId/logs
Authorization: Bearer <runnerAccessToken>
```

请求：

```json
{
  "level": "info",
  "message": "Running PCA",
  "stage": "pca",
  "timestamp": "2026-06-27T10:00:00.000Z"
}
```

### 6.5 上传结果文件

```http
POST /api/tasks/:taskId/results
Authorization: Bearer <runnerAccessToken>
Content-Type: multipart/form-data
```

字段：

```text
file: binary
fileType: summary_json | report_html | figure | table | log | provenance
```

### 6.6 查询任务结果

```http
GET /api/tasks/:taskId/results
```

---

## 7. Analysis Core Task Config

### 7.1 sc_profile_basic

```yaml
taskId: task_xxx
pipeline: sc_profile_basic
input:
  type: h5ad
  localFileRequired: true
  uploadRawData: false
steps:
  inspect:
    enabled: true
  qc:
    enabled: true
    mitoGenePrefix: "MT-"
outputs:
  upload:
    summaryJson: true
    reportHtml: true
    figures: true
    rawData: false
```

### 7.2 sc_standard_analysis

```yaml
taskId: task_xxx
pipeline: sc_standard_analysis
params:
  randomSeed: 42
steps:
  qc:
    enabled: true
    minGenes: 200
    minCells: 3
    maxPercentMito: 20
    mitoGenePrefix: "MT-"
  preprocess:
    enabled: true
    normalizeTotal: true
    targetSum: 10000
    log1p: true
    highlyVariableGenes: true
    nTopGenes: 2000
  dimensionReduction:
    pca: true
    nPcs: 50
    neighbors: true
    nNeighbors: 15
    umap: true
  clustering:
    enabled: true
    method: leiden
    resolution: 0.8
  markers:
    enabled: true
    method: wilcoxon
    nGenes: 50
outputs:
  upload:
    summaryJson: true
    reportHtml: true
    figures: true
    markersCsv: true
    embeddings: true
    rawData: false
```

---

## 8. Result File Types

```ts
export type ResultFileType =
  | "summary_json"
  | "report_html"
  | "figure"
  | "table"
  | "log"
  | "provenance"
  | "embedding";
```

---

## 9. Provenance Schema（provenance.json）

由 Python Analysis Core 在 `output_dir/provenance.json` 生成，作为可复现性凭证上传（`fileType=provenance`）。必须覆盖需求 10.3 列出的全部记录项。**不得包含本地完整路径、用户目录或任何原始数据。**

```json
{
  "schemaVersion": "1.0",
  "taskId": "task_xxx",
  "pipeline": "sc_standard_analysis",
  "analysisCoreVersion": "0.1.0",
  "randomSeed": 42,
  "params": {
    "qc": { "minGenes": 200, "minCells": 3, "maxPercentMito": 20, "mitoGenePrefix": "MT-" },
    "preprocess": { "normalizeTotal": true, "targetSum": 10000, "log1p": true, "nTopGenes": 2000 },
    "dimensionReduction": { "nPcs": 50, "nNeighbors": 15 },
    "clustering": { "method": "leiden", "resolution": 0.8 },
    "markers": { "method": "wilcoxon", "nGenes": 50 }
  },
  "environment": {
    "pythonVersion": "3.10.13",
    "os": "Windows 11",
    "platform": "win32",
    "packages": {
      "scanpy": "1.9.6",
      "anndata": "0.10.3",
      "numpy": "1.26.2",
      "pandas": "2.1.4",
      "scipy": "1.11.4",
      "scikit-learn": "1.3.2",
      "leidenalg": "0.10.1",
      "igraph": "0.11.3"
    }
  },
  "input": {
    "format": "h5ad",
    "displayName": "pbmc3k.h5ad",
    "nObs": 2700,
    "nVars": 32738,
    "checksum": "sha256:..."
  },
  "timing": {
    "startedAt": "2026-06-27T10:00:00.000Z",
    "finishedAt": "2026-06-27T10:03:21.000Z",
    "durationSeconds": 201
  },
  "outputs": [
    { "fileType": "summary_json", "fileName": "summary.json", "sizeBytes": 1234, "checksum": "sha256:..." },
    { "fileType": "report_html",  "fileName": "report.html",  "sizeBytes": 45678, "checksum": "sha256:..." },
    { "fileType": "figure",       "fileName": "figures/umap.png", "sizeBytes": 88123, "checksum": "sha256:..." },
    { "fileType": "table",        "fileName": "tables/markers.csv", "sizeBytes": 20480, "checksum": "sha256:..." }
  ]
}
```

字段约定：

1. `schemaVersion`：provenance 结构版本，破坏性变更时递增；
2. `analysisCoreVersion`：`sclens_core` 包版本（来自 `pyproject.toml`）；
3. `params`：**实际生效的解析后参数**（含默认值回填），而非原始请求；
4. `environment.packages`：实际导入的关键依赖版本，由运行时探测，不得硬编码；
5. `input.checksum`：本地输入文件的 sha256，仅哈希值，**不含路径**；
6. `outputs[].checksum`：每个产物文件的 sha256，供 Web 端校验完整性。

`sc_profile_basic` 复用同一结构，`params` 仅含其启用的步骤（如 `inspect`、`qc`），其余字段同上。

---

## 10. Error Codes

```ts
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "PAIR_CODE_EXPIRED"
  | "PAIR_CODE_INVALID"
  | "PAIR_CODE_ATTEMPT_LIMIT"
  | "STATE_CONFLICT"
  | "UNSUPPORTED_FILE_TYPE"
  | "UPLOAD_REJECTED"
  | "INTERNAL_ERROR";
```
