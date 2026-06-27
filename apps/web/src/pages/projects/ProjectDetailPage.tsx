import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Progress,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Breadcrumb
} from "antd";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Task } from "@sclens/api-client";
import { projectsApi } from "../../api/projects.js";
import { RunnerCard } from "../../features/runner/RunnerCard.js";
import { CreateTaskModal } from "../../features/task/CreateTaskModal.js";
import { useState } from "react";

const PIPELINE_LABELS: Record<string, string> = {
  sc_profile_basic: "数据画像 (Profile)",
  sc_standard_analysis: "标准分析 (Standard)",
};

const STATUS_BADGE: Record<string, "success" | "error" | "warning" | "processing" | "default"> = {
  COMPLETED:                 "success",
  FAILED:                    "error",
  CANCELLED:                 "default",
  RUNNING:                   "processing",
  UPLOADING_RESULTS:         "processing",
  QUEUED_LOCAL:              "processing",
  ENV_CHECKING:              "processing",
  ENV_READY:                 "processing",
  INSTALLING_DEPENDENCIES:   "processing",
  RUNNER_CONNECTED:          "warning",
  WAITING_FOR_LOCAL_RUNNER:  "warning",
  WAITING_FOR_LOCAL_FILE:    "warning",
  CREATED:                   "default",
};

export function ProjectDetailPage() {
  const { projectId } = useParams() as { projectId: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const projectQ = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.get(projectId)
  });

  const runnersQ = useQuery({
    queryKey: ["runners", projectId],
    queryFn: () => projectsApi.getRunners(projectId),
    refetchInterval: 5_000
  });

  const tasksQ = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => projectsApi.getTasks(projectId),
    refetchInterval: 3_000
  });

  const archiveMut = useMutation({
    mutationFn: () => projectsApi.update(projectId, { status: "archived" }),
    onSuccess: () => void navigate("/")
  });

  if (projectQ.isLoading) return <Spin tip="正在加载项目..." style={{ display: "block", marginTop: 120 }} />;
  if (projectQ.isError || !projectQ.data) {
    return (
      <Alert
        type="error"
        showIcon
        message="找不到项目"
        description="无法获取当前项目的详细数据，它可能已被删除或接口连接错误。"
      />
    );
  }

  const project = projectQ.data;
  const runners = (runnersQ.data ?? []) as Record<string, unknown>[];
  const tasks = (tasksQ.data ?? []) as Task[];

  const taskColumns = [
    {
      title: "任务名称",
      dataIndex: "name",
      key: "name",
      render: (name: string, t: Task) => (
        <Link to={`/tasks/${t.id}`} style={{ fontWeight: 600, color: "#3b82f6" }} onClick={(e) => e.stopPropagation()}>
          {name}
        </Link>
      )
    },
    {
      title: "分析流程 (Pipeline)",
      dataIndex: "pipeline",
      key: "pipeline",
      render: (p: string) => (
        <Tag
          style={{
            borderRadius: 6,
            backgroundColor: "rgba(139, 92, 246, 0.08)",
            color: "#c084fc",
            borderColor: "rgba(139, 92, 246, 0.2)",
            fontWeight: 500
          }}
        >
          {PIPELINE_LABELS[p] ?? p}
        </Tag>
      )
    },
    {
      title: "当前状态",
      dataIndex: "status",
      key: "status",
      render: (s: string) => {
        const badgeStatus = STATUS_BADGE[s] ?? "default";
        return (
          <Badge
            status={badgeStatus}
            text={
              <span style={{ fontSize: 13, color: badgeStatus === "success" ? "#10b981" : badgeStatus === "error" ? "#ef4444" : "#e2e8f0" }}>
                {s.replace(/_/g, " ")}
              </span>
            }
          />
        );
      }
    },
    {
      title: "计算进度",
      dataIndex: "progress",
      key: "progress",
      width: 160,
      render: (p: number, t: Task) => (
        <Progress
          percent={p}
          size="small"
          status={t.status === "FAILED" ? "exception" : t.status === "COMPLETED" ? "success" : "active"}
          strokeColor={t.status === "FAILED" ? "#ef4444" : t.status === "COMPLETED" ? "#10b981" : { "0%": "#3b82f6", "100%": "#8b5cf6" }}
          style={{ marginBottom: 0 }}
        />
      )
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d: string) => (
        <span style={{ color: "#94a3b8", fontSize: 12 }}>
          {new Date(d).toLocaleString()}
        </span>
      )
    }
  ];

  return (
    <>
      {/* Breadcrumbs & Dynamic Header */}
      <div style={{ marginBottom: 28 }}>
        <Breadcrumb
          items={[
            { title: <Link to="/" style={{ color: "#64748b" }}>分析项目列表</Link> },
            { title: <span style={{ color: "#f8fafc" }}>{project.name}</span> }
          ]}
          style={{ marginBottom: 12 }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Typography.Title level={3} style={{ margin: 0, fontWeight: 700, color: "#f8fafc" }}>
              {project.name}
            </Typography.Title>
            <Tag
              style={{
                borderRadius: 12,
                padding: "2px 10px",
                fontWeight: 500,
                backgroundColor: project.status === "active" ? "rgba(16, 185, 129, 0.08)" : "rgba(156, 163, 175, 0.08)",
                color: project.status === "active" ? "#10b981" : "#9ca3af",
                border: `1px solid ${project.status === "active" ? "rgba(16, 185, 129, 0.2)" : "rgba(156, 163, 175, 0.2)"}`
              }}
            >
              {project.status === "active" ? "进行中" : "已归档"}
            </Tag>
          </div>
          <Space size={12}>
            <Link to={`/projects/${projectId}/pair`}>
              <Button style={{ borderRadius: 8, borderColor: "#3b82f6", color: "#3b82f6", background: "transparent", fontWeight: 500 }}>
                配对 Runner
              </Button>
            </Link>
            <Button
              onClick={() => setCreateOpen(true)}
              type="primary"
              disabled={runners.length === 0}
              title={runners.length === 0 ? "Pair a runner first" : undefined}
              style={{
                background: runners.length === 0 ? undefined : "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                border: "none",
                boxShadow: runners.length === 0 ? "none" : "0 4px 12px rgba(59, 130, 246, 0.3)",
                fontWeight: 600,
                borderRadius: 8
              }}
            >
              新建分析任务
            </Button>
            <Button
              danger
              onClick={() => archiveMut.mutate()}
              loading={archiveMut.isPending}
              style={{ borderRadius: 8, opacity: 0.8 }}
            >
              归档项目
            </Button>
          </Space>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <Row gutter={[24, 24]}>
        {/* Left Side: Runner Monitoring and Meta Attributes (1/3 width) */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            
            {/* Meta Attributes Card */}
            <Card title="项目描述" className="premium-card" style={{ border: "1px solid #1e293b" }}>
              <Descriptions column={1} size="small" layout="vertical" style={{ marginBottom: -8 }}>
                <Descriptions.Item label={<span style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>创建于</span>}>
                  <span style={{ color: "#e2e8f0", fontSize: 13 }}>
                    {new Date(project.createdAt).toLocaleString()}
                  </span>
                </Descriptions.Item>
                {project.description && (
                  <Descriptions.Item label={<span style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>项目简介</span>}>
                    <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: "1.6", marginTop: 4 }}>
                      {project.description}
                    </div>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Runners List Card */}
            <Card
              title={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>环境 Runners ({runners.length})</span>
                  {runners.length === 0 && <span className="status-pulse-dot" style={{ backgroundColor: "#ef4444", marginRight: 0 }} />}
                </div>
              }
              className="premium-card"
              style={{ border: "1px solid #1e293b" }}
            >
              {runnersQ.isLoading && (
                <div style={{ textAlign: "center", padding: 24 }}>
                  <Spin tip="正在刷新 Runner 状态..." size="small" />
                </div>
              )}
              {!runnersQ.isLoading && runners.length === 0 && (
                <Alert
                  type="warning"
                  showIcon
                  message="无活动 Runner"
                  description={
                    <div style={{ marginTop: 4 }}>
                      为了运行分析流水线，必须先配对一个本地执行环境。
                      <Link to={`/projects/${projectId}/pair`} style={{ color: "#3b82f6", fontWeight: 600, display: "block", marginTop: 6 }}>
                        立即绑定 Runner →
                      </Link>
                    </div>
                  }
                  style={{ borderRadius: 8, background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.15)" }}
                />
              )}
              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                {runners.map((r, i) => <RunnerCard key={i} runner={r} />)}
              </Space>
            </Card>

          </Space>
        </Col>

        {/* Right Side: Tasks Grid (2/3 width) */}
        <Col xs={24} lg={16}>
          <Card
            title="数据分析任务"
            className="premium-card"
            styles={{ body: { padding: 0 } }}
            style={{ border: "1px solid #1e293b", overflow: "hidden" }}
          >
            {tasksQ.isLoading ? (
              <div style={{ textAlign: "center", padding: 80 }}>
                <Spin tip="加载任务列表中..." />
              </div>
            ) : (
              <Table
                dataSource={tasks}
                columns={taskColumns}
                rowKey="id"
                size="middle"
                locale={{ emptyText: '暂无分析任务，点击右上角“新建分析任务”运行单细胞数据流。' }}
                pagination={{ pageSize: 8, hideOnSinglePage: true }}
                onRow={(t) => ({ onClick: () => void navigate(`/tasks/${t.id}`) })}
                rowClassName={() => "cursor-pointer"}
              />
            )}
          </Card>
        </Col>
      </Row>

      <CreateTaskModal
        open={createOpen}
        projectId={projectId}
        runners={runners}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void qc.invalidateQueries({ queryKey: ["tasks", projectId] })}
      />
    </>
  );
}

