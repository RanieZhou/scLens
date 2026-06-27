import { Card, Descriptions, Space, Table, Tag, Typography, Progress } from "antd";

type CpuInfo = { model?: string; physicalCores?: number; logicalCores?: number };
type MemInfo = { totalGb?: number; availableGb?: number };
type DiskInfo = { freeGb?: number };
type PythonEnv = { envId: string; name?: string; type: string; pythonVersion?: string; status: string; recommended?: boolean };
type RunnerProfile = {
  hostname?: string | null;
  cpuInfo?: CpuInfo | null;
  memoryInfo?: MemInfo | null;
  diskInfo?: DiskInfo | null;
  pythonEnvs?: PythonEnv[] | null;
};
type RunnerRow = {
  id?: string;
  status?: string;
  os?: string | null;
  arch?: string | null;
  lastSeenAt?: string | null;
  profile?: RunnerProfile | null;
};

type Props = { runner: Record<string, unknown> };

export function RunnerCard({ runner }: Props) {
  const r = runner as RunnerRow;
  const profile = r.profile;
  const cpu = profile?.cpuInfo;
  const mem = profile?.memoryInfo;
  const disk = profile?.diskInfo;
  const envs = profile?.pythonEnvs ?? [];

  const isOnline = r.status === "online" || r.status === "paired";

  // Memory calculation for progress bar
  const memTotal = mem?.totalGb ?? 0;
  const memAvail = mem?.availableGb ?? 0;
  const memUsed = Math.max(0, memTotal - memAvail);
  const memPercent = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0;

  const envColumns = [
    {
      title: "环境名称",
      dataIndex: "name",
      key: "name",
      render: (n: string, e: PythonEnv) => (
        <span style={{ fontWeight: 500, fontSize: 12, color: "#f8fafc" }}>
          {n ?? e.envId}
        </span>
      )
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      render: (t: string) => (
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{t}</span>
      )
    },
    {
      title: "Python",
      dataIndex: "pythonVersion",
      key: "pythonVersion",
      render: (v: string) => (
        <code style={{ fontSize: 11, color: "#3b82f6" }}>{v || "—"}</code>
      )
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (s: string, e: PythonEnv) => (
        <Space size={4}>
          <Tag
            style={{
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              backgroundColor: s === "READY" ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
              color: s === "READY" ? "#10b981" : "#ef4444",
              border: `1px solid ${s === "READY" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
            }}
          >
            {s}
          </Tag>
          {e.recommended && (
            <Tag
              style={{
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                background: "linear-gradient(90deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))",
                color: "#a78bfa",
                border: "1px solid rgba(139, 92, 246, 0.3)"
              }}
            >
              推荐
            </Tag>
          )}
        </Space>
      )
    }
  ];

  return (
    <Card
      size="small"
      title={
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            className="status-pulse-dot"
            style={{
              backgroundColor: isOnline ? "#10b981" : "#9ca3af",
              boxShadow: isOnline ? "0 0 8px rgba(16, 185, 129, 0.6)" : "none",
              width: 8,
              height: 8,
              borderRadius: "50%",
              display: "inline-block",
              marginRight: 8
            }}
          />
          <span style={{ fontWeight: 600, color: "#f1f5f9", fontSize: 13 }}>
            {profile?.hostname ?? r.id ?? "Runner"}
          </span>
        </div>
      }
      style={{
        background: "rgba(15, 20, 34, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.04)"
      }}
      styles={{ body: { padding: 16 } }}
    >
      <Descriptions column={3} size="small" style={{ marginBottom: 12 }} layout="vertical">
        <Descriptions.Item label={<span style={{ color: "#64748b", fontSize: 11 }}>系统</span>}>
          <span style={{ color: "#e2e8f0", fontSize: 12 }}>{r.os ?? "—"} {r.arch ?? ""}</span>
        </Descriptions.Item>
        {cpu && (
          <Descriptions.Item label={<span style={{ color: "#64748b", fontSize: 11 }}>处理器 (CPU)</span>} span={2}>
            <span style={{ color: "#e2e8f0", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", display: "inline-block", maxWidth: 180 }} title={cpu.model}>
              {cpu.model ? cpu.model.split("@")[0] : "—"} ({cpu.physicalCores}C / {cpu.logicalCores}T)
            </span>
          </Descriptions.Item>
        )}
        {mem && (
          <Descriptions.Item label={<span style={{ color: "#64748b", fontSize: 11 }}>内存使用率 ({memPercent}%)</span>} span={2}>
            <div style={{ width: "90%", marginTop: 4 }}>
              <Progress
                percent={memPercent}
                size="small"
                showInfo={false}
                strokeColor={{ "0%": "#3b82f6", "100%": "#06b6d4" }}
                trailColor="rgba(255, 255, 255, 0.05)"
              />
              <span style={{ fontSize: 10, color: "#64748b", marginTop: 2, display: "block" }}>
                可用 {memAvail.toFixed(1)} GB / 共 {memTotal.toFixed(1)} GB
              </span>
            </div>
          </Descriptions.Item>
        )}
        {disk && (
          <Descriptions.Item label={<span style={{ color: "#64748b", fontSize: 11 }}>磁盘可用空间</span>}>
            <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 500 }}>
              {disk.freeGb?.toFixed(0)} GB
            </span>
          </Descriptions.Item>
        )}
      </Descriptions>

      {envs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text strong style={{ display: "block", marginBottom: 8, fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Python 环境列表
          </Typography.Text>
          <Table
            dataSource={envs}
            columns={envColumns}
            rowKey="envId"
            size="small"
            pagination={false}
            style={{ border: "1px solid rgba(255, 255, 255, 0.03)", borderRadius: 6, overflow: "hidden" }}
          />
        </div>
      )}
    </Card>
  );
}

