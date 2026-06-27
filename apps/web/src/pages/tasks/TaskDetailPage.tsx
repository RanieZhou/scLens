import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Badge,
  Card,
  Col,
  Descriptions,
  Row,
  Space,
  Spin,
  Steps,
  Tag,
  Typography,
  Progress,
  Collapse,
  Breadcrumb
} from "antd";
import { Link, useParams } from "react-router-dom";
import type { ResultFile, Task, TaskLog } from "@sclens/api-client";
import { tasksApi } from "../../api/tasks.js";
import { ResultList } from "../../features/result/ResultList.js";

const PIPELINE_LABELS: Record<string, string> = {
  sc_profile_basic: "数据画像 (Profile)",
  sc_standard_analysis: "标准分析 (Standard)",
};

function getObj(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function fmtVal(obj: Record<string, unknown> | null, key: string, suffix = ""): string | null {
  const v = obj?.[key];
  return v != null ? String(v) + suffix : null;
}

function fmtDuration(start: Date, end: Date): string {
  const s = Math.round((end.getTime() - start.getTime()) / 1000);
  if (s < 60) return `${s}秒`;
  return `${Math.floor(s / 60)}分 ${s % 60}秒`;
}

function ConfigParams({ config, pipeline }: { config: unknown; pipeline: string }) {
  const cfg = getObj(config);
  if (!cfg) return null;

  const stepsObj = getObj(cfg["steps"]);
  const paramsObj = getObj(cfg["params"]);
  const qc = getObj(stepsObj?.["qc"]);

  let rows: [string, string | null][];

  if (pipeline === "sc_standard_analysis") {
    const pre   = getObj(stepsObj?.["preprocess"]);
    const dim   = getObj(stepsObj?.["dimensionReduction"]);
    const clust = getObj(stepsObj?.["clustering"]);
    const mark  = getObj(stepsObj?.["markers"]);
    rows = [
      ["最少表达基因数/细胞 (Min genes)",       fmtVal(qc, "minGenes")],
      ["最少含有基因细胞数 (Min cells)",       fmtVal(qc, "minCells")],
      ["最大线粒体含量百分比 (Max % mito)",     fmtVal(qc, "maxPercentMito", "%")],
      ["线粒体基因前缀 (Mito prefix)",         fmtVal(qc, "mitoGenePrefix")],
      ["高变基因数 (Highly variable genes)",  fmtVal(pre, "nTopGenes")],
      ["PCA 主成分数 (PCA components)",         fmtVal(dim, "nPcs")],
      ["K近邻数 (Neighbors k)",            fmtVal(dim, "nNeighbors")],
      ["Leiden 分群分辨率 (Resolution)",      fmtVal(clust, "resolution")],
      ["每群差异基因输出数 (Marker genes)", fmtVal(mark, "nGenes")],
      ["随机种子 (Random seed)",            fmtVal(paramsObj, "randomSeed")],
    ];
  } else {
    // sc_profile_basic
    rows = [
      ["线粒体基因前缀 (Mito prefix)", fmtVal(qc, "mitoGenePrefix")],
    ];
  }

  const filtered = rows.filter((r): r is [string, string] => r[1] !== null);
  if (filtered.length === 0) return null;

  return (
    <Descriptions column={1} size="small" layout="horizontal" labelStyle={{ color: "#64748b" }} contentStyle={{ color: "#f8fafc", fontWeight: 500 }}>
      {filtered.map(([label, value]) => (
        <Descriptions.Item key={label} label={label}>{value}</Descriptions.Item>
      ))}
    </Descriptions>
  );
}

const STATUS_ORDER = [
  "CREATED",
  "WAITING_FOR_LOCAL_RUNNER",
  "RUNNER_CONNECTED",
  "WAITING_FOR_LOCAL_FILE",
  "ENV_CHECKING",
  "ENV_READY",
  "INSTALLING_DEPENDENCIES",
  "QUEUED_LOCAL",
  "RUNNING",
  "UPLOADING_RESULTS",
  "COMPLETED"
];

const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

function isActive(task: Task): boolean {
  return !TERMINAL.has(task.status);
}

export function TaskDetailPage() {
  const { taskId } = useParams() as { taskId: string };

  const taskQ = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => tasksApi.get(taskId),
    refetchInterval: (q) => {
      const t = q.state.data as Task | undefined;
      return t && isActive(t) ? 3_000 : false;
    }
  });

  const logsQ = useQuery({
    queryKey: ["task-logs", taskId],
    queryFn: () => tasksApi.getLogs(taskId),
    refetchInterval: () => (taskQ.data && isActive(taskQ.data) ? 3_000 : false)
  });

  const resultsQ = useQuery({
    queryKey: ["task-results", taskId],
    queryFn: () => tasksApi.getResults(taskId),
    enabled: taskQ.data?.status === "COMPLETED"
  });

  if (taskQ.isLoading) return <Spin tip="正在加载任务进度..." style={{ display: "block", marginTop: 120 }} />;
  if (taskQ.isError || !taskQ.data) {
    return (
      <Alert
        type="error"
        showIcon
        message="未找到任务"
        description="无法检索当前任务的分析细节，可能该任务已被删除或网络请求失败。"
      />
    );
  }

  const task = taskQ.data;
  const logs = (logsQ.data ?? []) as TaskLog[];
  const results = (resultsQ.data ?? []) as ResultFile[];
  const currentStep = STATUS_ORDER.indexOf(task.status);
  const isTerminal = TERMINAL.has(task.status);

  const startedAt = task.startedAt ? new Date(task.startedAt) : null;
  const finishedAt = task.finishedAt ? new Date(task.finishedAt) : null;

  return (
    <>
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { title: <Link to="/" style={{ color: "#64748b" }}>分析项目列表</Link> },
          { title: <Link to={`/projects/${task.projectId}`} style={{ color: "#64748b" }}>项目详情</Link> },
          { title: <span style={{ color: "#f8fafc" }}>任务监控</span> }
        ]}
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[24, 24]}>
        {/* Left Side: Overview Progress, Execution Node & Steps (1/3 width) */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            
            {/* Overview Circular Progress Card */}
            <Card
              className="premium-card"
              style={{ border: "1px solid #1e293b" }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0 24px" }}>
                <Progress
                  type="dashboard"
                  percent={task.progress}
                  strokeColor={{ "0%": "#3b82f6", "100%": "#8b5cf6" }}
                  trailColor="rgba(255, 255, 255, 0.05)"
                  width={140}
                  status={task.status === "FAILED" ? "exception" : task.status === "COMPLETED" ? "success" : "active"}
                />
                <Typography.Title level={4} style={{ margin: "16px 0 4px", color: "#f8fafc", fontWeight: 700 }}>
                  {task.name}
                </Typography.Title>
                <Tag
                  color="rgba(59, 130, 246, 0.08)"
                  style={{
                    borderRadius: 6,
                    color: "#60a5fa",
                    borderColor: "rgba(59, 130, 246, 0.2)",
                    fontSize: 12,
                    fontWeight: 500
                  }}
                >
                  {PIPELINE_LABELS[task.pipeline] ?? task.pipeline}
                </Tag>
              </div>

              <Descriptions column={1} size="small" layout="horizontal" labelStyle={{ color: "#64748b" }} contentStyle={{ color: "#e2e8f0" }}>
                <Descriptions.Item label="状态">
                  <Badge
                    status={
                      task.status === "COMPLETED" ? "success"
                      : task.status === "FAILED" ? "error"
                      : task.status === "CANCELLED" ? "default"
                      : "processing"
                    }
                    text={
                      <span style={{ fontWeight: 600, color: task.status === "COMPLETED" ? "#10b981" : task.status === "FAILED" ? "#ef4444" : "#e2e8f0" }}>
                        {task.status}
                      </span>
                    }
                  />
                </Descriptions.Item>
                {task.currentStage && !isTerminal && (
                  <Descriptions.Item label="当前阶段">
                    <span style={{ color: "#06b6d4", fontWeight: 600 }}>{task.currentStage}</span>
                  </Descriptions.Item>
                )}
                {startedAt && (
                  <Descriptions.Item label="启动时间">{startedAt.toLocaleString()}</Descriptions.Item>
                )}
                {finishedAt && (
                  <Descriptions.Item label="结束时间">{finishedAt.toLocaleString()}</Descriptions.Item>
                )}
                {startedAt && finishedAt && (
                  <Descriptions.Item label="总运行耗时">
                    <span style={{ fontWeight: 600, color: "#8b5cf6" }}>
                      {fmtDuration(startedAt, finishedAt)}
                    </span>
                  </Descriptions.Item>
                )}
              </Descriptions>

              {task.errorMessage && (
                <div style={{ marginTop: 16 }}>
                  <Alert
                    type="error"
                    message="任务运行错误"
                    description={task.errorMessage}
                    showIcon
                    style={{ borderRadius: 8 }}
                  />
                </div>
              )}
            </Card>

            {/* Execution Steps Card */}
            <Card
              title="运行日志节点"
              className="premium-card"
              style={{ border: "1px solid #1e293b" }}
            >
              {task.status === "FAILED" || task.status === "CANCELLED" ? (
                <Alert
                  type={task.status === "FAILED" ? "error" : "warning"}
                  message={`计算流已中断 (${task.status})`}
                  style={{ borderRadius: 8 }}
                />
              ) : (
                <div style={{ maxHeight: 240, overflowY: "auto", paddingRight: 8, marginTop: 4 }}>
                  <Steps
                    current={Math.max(0, currentStep)}
                    size="small"
                    items={STATUS_ORDER.map((s) => ({ title: s.replace(/_/g, " ") }))}
                    direction="vertical"
                  />
                </div>
              )}
            </Card>

            {/* Parameters Settings Card */}
            {task.config != null && (
              <Collapse
                ghost
                expandIconPosition="end"
                className="premium-card"
                style={{ border: "1px solid #1e293b", borderRadius: 10, overflow: "hidden" }}
                items={[{
                  key: "params",
                  label: <span style={{ color: "#f8fafc", fontWeight: 600, fontSize: 13 }}>查看分析参数配置</span>,
                  children: <ConfigParams config={task.config} pipeline={task.pipeline} />
                }]}
              />
            )}

          </Space>
        </Col>

        {/* Right Side: Analysis Results and Console Logs (2/3 width) */}
        <Col xs={24} lg={16}>
          <Space direction="vertical" size={24} style={{ width: "100%" }}>
            
            {/* Results Component (Only visible if files exist) */}
            {results.length > 0 && (
              <ResultList taskId={taskId} files={results} />
            )}

            {/* Live Terminal Log Board */}
            {logs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {/* Terminal Header */}
                <div style={{
                  backgroundColor: "#080c14",
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  padding: "10px 16px",
                  border: "1px solid #1f2937",
                  borderBottom: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <Space size={6}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ef4444", display: "inline-block" }} />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#eab308", display: "inline-block" }} />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block" }} />
                    <span style={{ marginLeft: 8, color: "#64748b", fontSize: 11, fontFamily: "monospace" }}>bash - runner_console.log</span>
                  </Space>
                  <Tag
                    color="rgba(16, 185, 129, 0.08)"
                    style={{
                      color: "#10b981",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      margin: 0
                    }}
                  >
                    实时监控
                  </Tag>
                </div>

                {/* Terminal Content */}
                <div
                  className="cyber-terminal"
                  style={{
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    maxHeight: 480,
                    overflowY: "auto",
                    boxShadow: "inset 0 4px 20px rgba(0, 0, 0, 0.8)",
                    border: "1px solid #1f2937"
                  }}
                >
                  {logs.slice(-100).map((l) => {
                    const isError = l.level === "error";
                    const isWarn = l.level === "warn";
                    const color = isError ? "#ef4444" : isWarn ? "#f59e0b" : "#94a3b8";
                    return (
                      <div
                        key={l.id}
                        className="cyber-terminal-line"
                        style={{
                          color: color,
                          borderLeftColor: isError ? "#ef4444" : isWarn ? "#f59e0b" : "transparent"
                        }}
                      >
                        <span style={{ color: "#475569", marginRight: 8, userSelect: "none" }}>
                          [{new Date(l.createdAt).toLocaleTimeString()}]
                        </span>
                        <span style={{
                          color: isError ? "#f87171" : isWarn ? "#fbbf24" : "#38bdf8",
                          fontWeight: 600,
                          marginRight: 6,
                          fontSize: 10
                        }}>
                          [{l.level.toUpperCase()}]
                        </span>
                        {l.stage && (
                          <span style={{ color: "#a78bfa", marginRight: 6 }}>
                            [{l.stage}]
                          </span>
                        )}
                        <span style={{ color: isError ? "#fca5a5" : isWarn ? "#fde047" : "#e2e8f0" }}>
                          {l.message}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </Space>
        </Col>
      </Row>
    </>
  );
}

