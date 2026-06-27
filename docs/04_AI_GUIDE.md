# AI 开发执行指南

版本：v0.3  
目标：让 AI 按阶段、按边界、按测试要求完成开发，避免自由发挥导致架构偏离

---

## 1. AI 工作方式

AI 每次实现功能前必须先阅读：

1. `docs/01_REQUIREMENTS.md`
2. `docs/02_DEVELOPMENT_GUIDE.md`
3. `docs/03_TEST_PLAN.md`
4. `docs/05_API_SCHEMA.md`

如文档之间冲突，优先级为：

```text
安全约束 > 需求文档 > 开发文档 > API 文档 > 测试文档 > README
```

---

## 2. 不允许 AI 自行改变的决策

禁止改变：

1. 前端技术栈：React + Vite + TypeScript；
2. 后端技术栈：Express + TypeScript + Prisma + MySQL；
3. 桌面端技术栈：Tauri + React；
4. 分析核心：Python CLI；
5. monorepo 结构；
6. 原始数据不上传；
7. 后端不下发任意命令；
8. Runner 不执行未知 pipeline；
9. API 统一响应格式；
10. 任务状态枚举。

如确需改变，必须先输出变更提案，不得直接改代码。

---

## 3. 代码生成原则

AI 生成代码必须满足：

1. 小步提交；
2. 每次只完成一个明确模块；
3. 先写类型和 schema；
4. 再写 service；
5. 再写 controller / route；
6. 最后写测试；
7. 不跳过错误处理；
8. 不跳过输入校验；
9. 不使用 `any`；
10. 不生成未使用代码。

---

## 4. 推荐任务拆分

### Phase 0：初始化项目

任务：

1. 初始化 pnpm workspace；
2. 初始化 apps/web；
3. 初始化 apps/backend；
4. 初始化 apps/desktop；
5. 初始化 python/analysis-core（包名 `sclens_core`）；
6. 初始化 docs；
7. 配置 lint、format、typecheck；
8. 配置 Docker Compose MySQL。

验收：

1. `pnpm install` 成功；
2. `pnpm lint` 成功；
3. `pnpm typecheck` 成功；
4. `docker compose up mysql` 成功。

---

### Phase 1：Backend 基础

任务：

1. Express app；
2. requestId middleware；
3. error middleware；
4. Zod validation middleware；
5. Prisma 初始化；
6. health API；
7. Project API。

验收：

1. health API 返回 OK；
2. Project CRUD 测试通过；
3. 错误响应格式统一。

---

### Phase 2：Pairing API

任务：

1. Runner 创建 pairing session；
2. 后端保存 pairCodeHash；
3. Web 输入 pairCode；
4. 后端匹配并绑定 project；
5. 生成 runnerAccessToken；
6. pairCode 过期和尝试次数限制。

验收：

1. 正确配对成功；
2. 错误配对失败；
3. 过期不可用；
4. 重复不可用；
5. 数据库没有明文 pairCode。

---

### Phase 3：Runner Profile API

任务：

1. heartbeat；
2. profile 上传；
3. Python 环境 JSON 保存；
4. Web 查询 project runners。

验收：

1. token 校验有效；
2. 绑定校验有效；
3. Web 能查询 runner profile。

---

### Phase 4：Web Console MVP

任务：

1. 项目列表；
2. 创建项目；
3. 项目详情；
4. 配对页面；
5. Runner profile 展示；
6. 任务列表；
7. 任务详情。

验收：

1. UI 有 loading、empty、error；
2. 表单校验有效；
3. API 错误有提示。

---

### Phase 5：Desktop Runner MVP

任务：

1. Tauri 项目初始化；
2. 生成 pairCode；
3. 注册 pairing session；
4. 轮询配对状态；
5. 保存 runner token；
6. 检测系统信息；
7. 检测 Python 环境；
8. 上传 profile。

验收：

1. Desktop 显示配对码；
2. Web 输入后配对成功；
3. Web 展示系统信息；
4. Web 展示 Python 环境。

---

### Phase 6：Analysis Core Inspect

任务：

1. 创建 Python CLI；
2. 读取 h5ad；
3. 生成 summary；
4. 生成 report.html；
5. 生成 provenance；
6. 写 progress.jsonl；
7. pytest。

验收：

1. synthetic h5ad 测试通过；
2. 输出文件结构正确；
3. CLI 返回码正确。

---

### Phase 7：Task Flow

任务：

1. 创建 task；
2. Runner 拉取 pending task；
3. Runner 执行 inspect CLI；
4. Runner 上传状态；
5. Runner 上传结果；
6. Web 展示 report。

验收：

1. 端到端 inspect 流程跑通；
2. 状态流正确；
3. 服务端不保存原始数据。

---

### Phase 8：Standard Pipeline

任务：

1. QC；
2. normalize；
3. log1p；
4. HVG；
5. PCA；
6. UMAP；
7. Leiden；
8. markers；
9. figures；
10. tables。

验收：

1. Python 测试通过；
2. Web 能展示图表和 marker 表；
3. provenance 记录完整。

---

## 5. 每次 AI 任务输出要求

AI 每次完成后必须输出：

1. 修改了哪些文件；
2. 实现了什么功能；
3. 如何运行；
4. 如何测试；
5. 是否有未完成项；
6. 是否改变了 API；
7. 是否涉及数据库 migration；
8. 是否存在安全影响。

---

## 6. 禁止生成的代码

禁止：

```text
eval
Function constructor
任意 shell command 执行
无白名单的文件上传
跳过 token 校验
跳过 Zod 校验
把 h5ad 上传到后端
把本地完整路径上传到后端
把 Python 分析逻辑写进 Express
把 Runner 任务执行写进 Web 前端
```

---

## 7. 推荐 AI Prompt 模板

### 7.1 实现模块 Prompt

```text
请阅读 docs/01_REQUIREMENTS.md、docs/02_DEVELOPMENT_GUIDE.md、docs/03_TEST_PLAN.md。

现在实现 Phase X 的 Y 模块。

约束：
- 不改变既定技术栈
- 不改变 monorepo 结构
- 不使用 any
- 所有输入使用 Zod 校验
- 保持 API 响应格式统一
- 添加必要测试
- 不实现文档范围外功能

完成后输出：
1. 修改文件列表
2. 功能说明
3. 运行方式
4. 测试方式
5. 未完成事项
```

### 7.2 修复 Bug Prompt

```text
请根据以下 Bug 描述修复问题。

Bug：
...

要求：
- 先定位原因
- 给出最小修改
- 添加回归测试
- 不重构无关模块
- 不改变 API 兼容性
```

### 7.3 代码审查 Prompt

```text
请审查当前改动是否符合 docs/02_DEVELOPMENT_GUIDE.md 和 docs/03_TEST_PLAN.md。

重点检查：
- 是否违反安全约束
- 是否跳过输入校验
- 是否上传原始数据
- 是否破坏任务状态机
- 是否有 any
- 是否缺少测试
```

---

## 8. AI 自检清单

每次提交前检查：

```text
[ ] 是否通过 lint
[ ] 是否通过 typecheck
[ ] 是否通过测试
[ ] 是否添加必要测试
[ ] 是否更新 API 文档
[ ] 是否更新数据库 migration
[ ] 是否没有上传原始数据
[ ] 是否没有任意命令执行
[ ] 是否没有明文 pairCode
[ ] 是否没有 token 日志
[ ] 是否没有使用 any
[ ] 是否符合目录结构
```
