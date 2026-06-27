# scLens Docs

版本：v0.3  
最后更新：2026-06-27

本目录包含单细胞数据分析平台 **scLens** 开发前基线文档。

## 命名约定（agent 必须遵守）

| 范围 | 名称 |
|---|---|
| 产品对外名 | scLens |
| monorepo 根目录 | `sclens/` |
| 前端 npm scope | `@sclens/web`、`@sclens/backend` 等 |
| Python 包 | `sclens_core` |
| Python CLI 命令 | `sclens` |

## 文档清单

1. `01_REQUIREMENTS.md`  
   产品需求文档，定义系统目标、功能范围、用户场景、MVP、验收标准和不做事项。

2. `02_DEVELOPMENT_GUIDE.md`  
   开发文档，定义技术栈、目录结构、编码规范、API 规范、数据库设计、任务流程和安全约束。

3. `03_TEST_PLAN.md`  
   测试计划，定义单元测试、集成测试、E2E 测试、验收测试、发布准入和回归清单。

4. `04_AI_GUIDE.md`  
   AI执行指南，定义自动开发代理的工作方式、禁止事项、开发阶段和 prompt 模板。

5. `05_API_SCHEMA.md`  
   API 与 Schema 文档，定义接口、枚举、任务配置和错误码。

## 推荐使用方式

开发前先让 Codex 阅读：

```text
docs/01_REQUIREMENTS.md
docs/02_DEVELOPMENT_GUIDE.md
docs/03_TEST_PLAN.md
docs/04_AI_GUIDE.md
docs/05_API_SCHEMA.md
```

然后按 `04_AI_GUIDE.md` 中的 Phase 拆分任务执行。
