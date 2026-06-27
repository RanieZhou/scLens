import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Form, Input, Space, Typography, Breadcrumb } from "antd";
import { Link, useNavigate, useParams } from "react-router-dom";
import { projectsApi } from "../../api/projects.js";

// Custom Link Icon SVG
const LinkIcon = () => (
  <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
    <div style={{
      width: 64,
      height: 64,
      borderRadius: "50%",
      background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
      border: "1px solid rgba(59, 130, 246, 0.2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 0 15px rgba(59, 130, 246, 0.1)"
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 7h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-6 8H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-2zm-3-4h8v2H8v-2z" fill="url(#linkGrad)"/>
        <defs>
          <linearGradient id="linkGrad" x1="2" y1="7" x2="22" y2="17" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  </div>
);

export function PairingPage() {
  const { projectId } = useParams() as { projectId: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form] = Form.useForm<{ pairCode: string }>();

  const pairMut = useMutation({
    mutationFn: ({ pairCode }: { pairCode: string }) =>
      projectsApi.pairRunner(projectId, pairCode.replace(/\s/g, "")),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["runners", projectId] });
      void navigate(`/projects/${projectId}`);
    }
  });

  return (
    <>
      <Breadcrumb
        items={[
          { title: <Link to="/" style={{ color: "#64748b" }}>分析项目列表</Link> },
          { title: <Link to={`/projects/${projectId}`} style={{ color: "#64748b" }}>项目详情</Link> },
          { title: <span style={{ color: "#f8fafc" }}>配对环境</span> }
        ]}
        style={{ marginBottom: 24 }}
      />

      <Card
        className="premium-card"
        style={{ maxWidth: 460, margin: "40px auto 0", border: "1px solid #1e293b", padding: 8 }}
      >
        <LinkIcon />

        <Typography.Title level={3} style={{ textAlign: "center", marginTop: 0, fontWeight: 700, color: "#f8fafc" }}>
          配对本地分析环境 (Runner)
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", marginBottom: 24 }}>
          请在您的本地计算机上打开 scLens Desktop Runner。它会展示一个 8 位至 12 位的配对码，在下方输入以绑定到该项目。
        </Typography.Paragraph>

        {pairMut.isError && (
          <Alert type="error" message={pairMut.error?.message} style={{ marginBottom: 20, borderRadius: 8 }} />
        )}
        {pairMut.isSuccess && (
          <Alert type="success" message="配对成功！正在返回项目页面..." style={{ marginBottom: 20, borderRadius: 8 }} />
        )}

        <Form form={form} onFinish={(v) => pairMut.mutate(v)} layout="vertical">
          <Form.Item
            name="pairCode"
            label={<span style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Runner 配对码</span>}
            rules={[{ required: true, message: "请输入 Desktop Runner 上的配对码" }]}
          >
            <Input
              placeholder="K7Q4 - M9XA"
              size="large"
              style={{
                letterSpacing: 4,
                fontFamily: "monospace",
                textAlign: "center",
                fontSize: 20,
                fontWeight: 600,
                height: 52,
                borderRadius: 8,
                backgroundColor: "rgba(0,0,0,0.2)"
              }}
              maxLength={12}
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={pairMut.isPending}
            block
            size="large"
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              border: "none",
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
              fontWeight: 600,
              borderRadius: 8,
              height: 44,
              marginTop: 8
            }}
          >
            确认绑定环境
          </Button>
        </Form>
      </Card>
    </>
  );
}

