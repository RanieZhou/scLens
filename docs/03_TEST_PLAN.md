# 单细胞数据分析平台测试计划

版本：v0.3  
状态：开发前测试基线  
目标：按照企业内部开发流程设计测试体系，保证系统可交付、可回归、可维护

---

## 1. 测试目标

测试目标：

1. 验证需求功能正确实现；
2. 验证 Web、Backend、Desktop Runner、Analysis Core 协作正确；
3. 验证配对码流程安全可靠；
4. 验证本地计算流程不上传原始数据；
5. 验证任务状态机稳定；
6. 验证结果上传、展示和下载可用；
7. 验证异常情况下系统有可理解反馈；
8. 为 Codex 自动开发提供明确验收边界。

---

## 2. 测试范围

### 2.1 纳入测试

1. Project API；
2. Runner pairing；
3. Runner profile；
4. Task API；
5. Result upload；
6. Web Console 页面；
7. Desktop Runner 配对和本机检测；
8. Python Analysis Core CLI；
9. 数据画像流程；
10. 标准分析流程；
11. 文件上传安全；
12. 任务状态机；
13. Docker Compose 本地部署。

### 2.2 暂不测试

1. 稀有细胞识别；
2. 自动细胞类型注释；
3. 多组学分析；
4. 大规模公网并发；
5. 企业级多租户权限；
6. HPC / SLURM 集成。

---

## 3. 测试层级

```text
Unit Test
  ↓
Integration Test
  ↓
API Test
  ↓
Component Test
  ↓
E2E Test
  ↓
Acceptance Test
  ↓
Regression Test
```

---

## 4. Backend 测试

### 4.1 工具

```text
Vitest 或 Jest
Supertest
Prisma test database
Zod
```

### 4.2 单元测试

必须覆盖：

1. pairingService；
2. taskService；
3. runnerService；
4. resultService；
5. tokenService；
6. fileValidation；
7. taskStateMachine。

### 4.3 API 集成测试

必须覆盖：

#### Project API

| 用例 | 预期 |
|---|---|
| 创建项目 | 返回 201 和项目详情 |
| 项目名为空 | 返回 400 |
| 获取项目列表 | 返回数组 |
| 获取不存在项目 | 返回 404 |
| 删除项目 | 状态变更或删除成功 |
| 未设置 WEB_ACCESS_TOKEN | 无 Bearer 也放行 |
| 设置 WEB_ACCESS_TOKEN 后无/错 Bearer | 返回 401 |

#### Pairing API

| 用例 | 预期 |
|---|---|
| Runner 创建 pairing session | 成功返回 sessionId |
| Web 输入正确 pairCode | 成功绑定 |
| Web 输入错误 pairCode | 返回 400 或 404 |
| pairCode 过期 | 返回 410 |
| pairCode 重复使用 | 返回 409 |
| 尝试次数超过限制 | 返回 429 |
| 后端不保存明文 pairCode | 数据库中不可查到明文 |
| 轮询缺少/错误 X-Runner-Secret | 返回 403，且不下发 runnerAccessToken |
| 后端不保存明文 runnerSecret | 数据库只有 runnerSecretHash |

#### Runner API

| 用例 | 预期 |
|---|---|
| 上传 profile | 成功保存 |
| 无 token 上传 profile | 返回 401 |
| 非绑定 Runner 更新任务 | 返回 403 |
| heartbeat | 更新 lastSeenAt |

#### Task API

| 用例 | 预期 |
|---|---|
| 创建任务 | 返回 taskId |
| Runner 拉取任务 | 只返回分配给自己的任务 |
| 状态更新合法 | 成功 |
| 状态更新非法 | 返回 409 |
| FAILED 状态保存 errorMessage | 成功 |
| COMPLETED 状态保存 finishedAt | 成功 |

#### Result API

| 用例 | 预期 |
|---|---|
| 上传 summary.json | 成功 |
| 上传 report.html | 成功 |
| 上传非法 .h5ad | 被拒绝 |
| 上传 .exe | 被拒绝 |
| 查询结果列表 | 返回 resultFiles |
| 下载结果文件 | 成功 |

---

## 5. Frontend 测试

### 5.1 工具

```text
Vitest
React Testing Library
Playwright
MSW
```

### 5.2 组件测试

必须覆盖：

1. ProjectList；
2. ProjectCreateForm；
3. PairingForm；
4. RunnerProfileCard；
5. PythonEnvTable；
6. TaskConfigForm；
7. TaskStatusTimeline；
8. ReportViewer；
9. ResultFileList。

### 5.3 页面测试

必须覆盖：

| 页面 | 测试点 |
|---|---|
| 项目列表 | loading、empty、error、success |
| 项目详情 | 正确展示项目和任务 |
| Runner 配对页 | 输入、提交、错误提示 |
| Runner profile 页 | 展示系统信息和 Python 环境 |
| 任务配置页 | 默认参数、参数校验 |
| 任务详情页 | 状态变化、日志、结果入口 |
| 结果页 | report、figures、tables 展示 |

---

## 6. Desktop Runner 测试

### 6.1 工具

```text
Vitest
Tauri test
Rust unit test
Mock backend server
```

### 6.2 测试范围

必须覆盖：

1. pairCode 生成；
2. pairCode 格式；
3. pairing session 注册；
4. polling 配对状态；
5. token 保存；
6. 系统资源检测；
7. Python 环境扫描；
8. 依赖检测；
9. 本地数据选择；
10. 调用 Python CLI；
11. 监听 progress.jsonl；
12. 上传状态；
13. 上传结果；
14. 任务取消；
15. Python 进程失败处理。

### 6.3 安全测试

必须覆盖：

1. Runner 不执行未知 pipeline；
2. Runner 不执行后端下发 command 字段；
3. Runner 不上传本地完整路径；
4. Runner 不上传原始数据；
5. token 不打印到日志。

---

## 7. Python Analysis Core 测试

### 7.1 工具

```text
pytest
pytest-cov
temporary files
small synthetic AnnData
```

### 7.2 单元测试

必须覆盖：

1. 读取 h5ad；
2. AnnData 结构解析；
3. obs / var 预览；
4. 稀疏度计算；
5. QC 指标计算；
6. report 生成；
7. provenance 生成；
8. progress.jsonl 写入；
9. standard pipeline 参数解析；
10. 异常处理。

### 7.3 测试数据

必须提供小型 synthetic AnnData：

```text
cells: 100
genes: 50
clusters: 3
format: .h5ad
```

测试数据要求：

1. 可快速生成；
2. 不依赖外部下载；
3. 不包含敏感数据；
4. 可用于 CI。

### 7.4 CLI 测试

必须覆盖：

```bash
sclens inspect --input test.h5ad --output output/
sclens run-standard --input test.h5ad --config config.yaml --output output/
```

验证输出：

1. summary.json 存在；
2. report.html 存在；
3. provenance.json 存在；
4. progress.jsonl 存在；
5. figures 目录存在；
6. tables 目录存在。

---

## 8. E2E 测试

### 8.1 工具

```text
Playwright
Mock Desktop Runner 或真实 Runner 测试模式
Test MySQL
Local FS storage
```

### 8.2 核心 E2E 流程

#### 流程一：配对

```text
打开 Web
创建项目
打开配对页面
Mock Runner 创建 pairing session
Web 输入 pairCode
绑定成功
Web 展示 Runner profile
```

#### 流程二：数据画像

```text
创建项目
绑定 Runner
创建 inspect task
Runner 拉取任务
Runner 执行 mock analysis
Runner 上传 summary 和 report
Web 展示 COMPLETED
Web 打开 report
```

#### 流程三：标准分析

```text
创建 standard task
配置参数
Runner 拉取任务
Runner 执行 synthetic h5ad 分析
上传结果
Web 展示 QC 图、UMAP 图、marker 表
```

---

## 9. 验收测试

### 9.1 MVP 1 验收清单

| 编号 | 验收项 | 通过标准 |
|---|---|---|
| A-001 | 创建项目 | Web 能创建并展示项目 |
| A-002 | Runner 生成配对码 | 桌面端显示有效配对码 |
| A-003 | Web 配对 | 输入配对码后绑定成功 |
| A-004 | Runner profile | Web 展示 CPU、内存、Python 环境 |
| A-005 | 本地选择 h5ad | Runner 能选择本地测试文件 |
| A-006 | 运行 inspect | Python CLI 成功执行 |
| A-007 | 上传轻量结果 | report 和 summary 存入 storage |
| A-008 | Web 查看报告 | 前端可查看 report.html |
| A-009 | 隐私检查 | 服务端不存在原始 h5ad |
| A-010 | 错误处理 | 无效文件有可理解错误提示 |

### 9.2 MVP 2 验收清单

| 编号 | 验收项 | 通过标准 |
|---|---|---|
| B-001 | 配置标准分析参数 | 前端表单可编辑并校验 |
| B-002 | 运行 standard pipeline | CLI 成功完成 |
| B-003 | QC 输出 | 生成 QC 图和指标 |
| B-004 | UMAP 输出 | 生成 UMAP 图 |
| B-005 | Leiden 输出 | 生成 cluster summary |
| B-006 | Marker 输出 | 生成 markers.csv |
| B-007 | Provenance | 保存版本和参数 |
| B-008 | 失败处理 | 失败任务显示错误阶段 |
| B-009 | 结果展示 | Web 能查看图表和表格 |
| B-010 | 回归通过 | 全部自动测试通过 |

---

## 10. CI 检查

每次提交必须执行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pytest
```

如果使用 GitHub Actions，建议 job：

1. frontend-test；
2. backend-test；
3. python-test；
4. e2e-test，后续；
5. docker-build，后续。

---

## 11. 测试数据策略

禁止使用真实敏感数据进入仓库。

允许：

1. synthetic h5ad；
2. 小型模拟矩阵；
3. 自动生成测试数据脚本。

目录：

```text
python/analysis-core/tests/fixtures/
```

推荐生成脚本：

```text
python/analysis-core/tests/create_synthetic_h5ad.py
```

---

## 12. 缺陷等级

| 等级 | 描述 | 示例 |
|---|---|---|
| P0 | 阻塞发布 | 原始数据被上传、任务无法运行 |
| P1 | 核心功能失败 | 配对失败、结果无法展示 |
| P2 | 一般功能异常 | 表格筛选错误、部分日志缺失 |
| P3 | 体验问题 | 文案不清晰、样式错位 |
| P4 | 优化建议 | 性能优化、交互改进 |

---

## 13. 发布准入

MVP 发布必须满足：

1. 所有 P0 / P1 缺陷清零；
2. 后端核心 API 测试通过；
3. 前端关键页面测试通过；
4. Python CLI 测试通过；
5. E2E 主流程通过；
6. Docker Compose 能启动；
7. README 有启动说明；
8. 不违反安全禁止事项；
9. 服务端确认无原始数据文件；
10. 关键功能完成验收清单。

---

## 14. 回归测试清单

每次重要修改后，必须回归：

1. 创建项目；
2. Runner 配对；
3. Runner profile 展示；
4. 创建 inspect task；
5. 任务状态更新；
6. 结果上传；
7. report 查看；
8. 非法文件上传拒绝；
9. pairCode 过期；
10. Python CLI 输出结构。
