import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
  Row,
  Col,
  Radio,
  Empty
} from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Project } from "@sclens/api-client";
import { projectsApi } from "../../api/projects.js";

// Folder SVG Icon with gradient
const FolderIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 10, flexShrink: 0 }}>
    <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" fill="url(#folderGrad)"/>
    <defs>
      <linearGradient id="folderGrad" x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
  </svg>
);

export function ProjectListPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [form] = Form.useForm<{ name: string; description?: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
    refetchInterval: 5_000
  });

  const createMut = useMutation({
    mutationFn: (values: { name: string; description?: string }) => projectsApi.create(values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      form.resetFields();
    }
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["projects"] })
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16 }}>
        <Spin size="large" />
        <Typography.Text type="secondary">正在加载项目列表...</Typography.Text>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="加载失败"
        description="无法获取项目列表，请检查后端服务是否正常启动。"
        style={{ borderRadius: 8 }}
      />
    );
  }

  const filteredData = (data ?? []).filter((p: Project) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      {/* Page Header Area */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: "-0.5px" }}>
            数据分析项目
          </Typography.Title>
          <Typography.Text type="secondary">
            管理并监控您的单细胞测序数据分析流程与任务状态
          </Typography.Text>
        </div>
        <Button
          type="primary"
          onClick={() => setOpen(true)}
          size="large"
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            border: "none",
            boxShadow: "0 4px 15px rgba(59, 130, 246, 0.4)",
            fontWeight: 600,
            borderRadius: 8
          }}
        >
          新建项目
        </Button>
      </div>

      {/* Search and Filters */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <Input.Search
          placeholder="搜索项目名称或描述..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 320 }}
          allowClear
          size="large"
        />
        <Radio.Group
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as string)}
          optionType="button"
          buttonStyle="solid"
          size="large"
        >
          <Radio.Button value="all">全部</Radio.Button>
          <Radio.Button value="active">进行中</Radio.Button>
          <Radio.Button value="archived">已归档</Radio.Button>
        </Radio.Group>
      </div>

      {/* Projects Grid */}
      {filteredData.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "48px 0", background: "rgba(255,255,255,0.02)", border: "1px dashed #1e293b" }}>
          <Empty
            description={
              <Typography.Text type="secondary">
                {data && data.length === 0 ? "暂无项目，点击右上角创建一个吧！" : "没有找到符合过滤条件的项目"}
              </Typography.Text>
            }
          />
        </Card>
      ) : (
        <Row gutter={[20, 20]}>
          {filteredData.map((p: Project) => {
            const isActiveStatus = p.status === "active";
            return (
              <Col xs={24} sm={12} md={8} key={p.id}>
                <Card
                  className="premium-card"
                  styles={{ body: { padding: 20, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" } }}
                  style={{ height: "100%", border: "1px solid #1e293b" }}
                >
                  <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                    <div>
                      {/* Top status & actions */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <Tag
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            borderRadius: 12,
                            padding: "2px 10px",
                            fontSize: 11,
                            fontWeight: 500,
                            backgroundColor: isActiveStatus ? "rgba(16, 185, 129, 0.08)" : "rgba(156, 163, 175, 0.08)",
                            color: isActiveStatus ? "#10b981" : "#9ca3af",
                            border: `1px solid ${isActiveStatus ? "rgba(16, 185, 129, 0.2)" : "rgba(156, 163, 175, 0.2)"}`
                          }}
                        >
                          <span
                            className="status-pulse-dot"
                            style={{
                              backgroundColor: isActiveStatus ? "#10b981" : "#9ca3af",
                              boxShadow: isActiveStatus ? "0 0 8px rgba(16, 185, 129, 0.6)" : "none",
                              marginRight: 6
                            }}
                          />
                          {isActiveStatus ? "进行中" : "已归档"}
                        </Tag>

                        <Popconfirm
                          title="确定要删除这个项目吗？"
                          onConfirm={() => deleteMut.mutate(p.id)}
                          okText="删除"
                          okType="danger"
                          cancelText="取消"
                        >
                          <Button
                            size="small"
                            type="text"
                            danger
                            style={{ opacity: 0.5 }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = "0.5"}
                            onClick={(e) => e.stopPropagation()}
                          >
                            删除
                          </Button>
                        </Popconfirm>
                      </div>

                      {/* Title & Link */}
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                        <FolderIcon />
                        <Link
                          to={`/projects/${p.id}`}
                          style={{
                            fontSize: 17,
                            fontWeight: 600,
                            color: "#f8fafc",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1
                          }}
                        >
                          {p.name}
                        </Link>
                      </div>

                      {/* Description */}
                      <Typography.Paragraph
                        type="secondary"
                        ellipsis={{ rows: 2, tooltip: true }}
                        style={{ fontSize: 13, marginBottom: 16, color: "#94a3b8", height: 40, lineHeight: "20px" }}
                      >
                        {p.description || "无描述信息"}
                      </Typography.Paragraph>
                    </div>

                    <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: 12, display: "flex", justifyContent: "flex-end" }}>
                      <Link to={`/projects/${p.id}`} style={{ fontSize: 13, fontWeight: 500, color: "#3b82f6" }}>
                        进入项目 →
                      </Link>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* New Project Modal */}
      <Modal
        title={
          <span style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc" }}>
            新建分析项目
          </span>
        }
        open={open}
        onCancel={() => { setOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending}
        okText="创建"
        cancelText="取消"
        okButtonProps={{
          style: {
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            border: "none"
          }
        }}
      >
        {createMut.isError && (
          <Alert type="error" message={createMut.error?.message} style={{ marginBottom: 16, borderRadius: 8 }} />
        )}
        <Form form={form} layout="vertical" onFinish={(v) => createMut.mutate(v)} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: "请输入项目名称", min: 1 }]}
          >
            <Input placeholder="例如: 外周血单个核细胞 (PBMC) 10k" size="large" />
          </Form.Item>
          <Form.Item name="description" label="项目描述">
            <Input.TextArea rows={4} placeholder="描述此项目的样本来源、实验设计或分析目的..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

