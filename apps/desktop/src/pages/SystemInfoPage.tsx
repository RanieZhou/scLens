import { invoke } from "@tauri-apps/api/core";
import { Badge, Button, Card, Descriptions, Input, Space, Table, Tag, Typography } from "antd";
import { useEffect, useState } from "react";

interface CpuInfo { model: string; physicalCores: number; logicalCores: number }
interface MemoryInfo { totalGb: number; availableGb: number }
interface DiskInfo { freeGb: number }
interface GpuInfo { vendor: string; name: string }
interface SystemInfo {
  hostname: string; os: string; arch: string;
  cpuInfo: CpuInfo; memoryInfo: MemoryInfo; diskInfo: DiskInfo;
  gpuInfo: GpuInfo[];
}

interface PythonEnv {
  envId: string; type: string; name: string | null;
  pythonPathMasked: string; pythonVersion: string | null;
  packages: Record<string, string>; status: string;
  missing: string[]; recommended: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  READY: "green",
  MISSING_PACKAGES: "orange",
  PYTHON_VERSION_UNSUPPORTED: "red",
  BROKEN: "red",
};

export function SystemInfoPage() {
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [envs, setEnvs] = useState<PythonEnv[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendUrl, setBackendUrl] = useState("");
  const [urlEditing, setUrlEditing] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlSaving, setUrlSaving] = useState(false);

  useEffect(() => {
    void load();
    void invoke<string>("get_backend_url").then((u) => { setBackendUrl(u); setUrlInput(u); });
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [sys, pyEnvs] = await Promise.all([
        invoke<SystemInfo>("get_system_info"),
        invoke<PythonEnv[]>("get_python_envs"),
      ]);
      setSysInfo(sys);
      setEnvs(pyEnvs);
    } finally {
      setLoading(false);
    }
  }

  async function saveUrl() {
    setUrlSaving(true);
    try {
      await invoke("set_backend_url", { url: urlInput });
      setBackendUrl(urlInput);
      setUrlEditing(false);
    } finally {
      setUrlSaving(false);
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card title="Backend Connection" size="small">
        {urlEditing ? (
          <Space>
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              style={{ width: 320 }}
              placeholder="http://localhost:3001/api"
            />
            <Button type="primary" loading={urlSaving} onClick={() => void saveUrl()}>Save</Button>
            <Button onClick={() => { setUrlEditing(false); setUrlInput(backendUrl); }}>Cancel</Button>
          </Space>
        ) : (
          <Space>
            <Typography.Text code>{backendUrl}</Typography.Text>
            <Button size="small" onClick={() => setUrlEditing(true)}>Edit</Button>
          </Space>
        )}
      </Card>

      {sysInfo && (
        <Card title="System" size="small">
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="Hostname">{sysInfo.hostname}</Descriptions.Item>
            <Descriptions.Item label="OS">{sysInfo.os}</Descriptions.Item>
            <Descriptions.Item label="Arch">{sysInfo.arch}</Descriptions.Item>
            <Descriptions.Item label="CPU">{sysInfo.cpuInfo.model}</Descriptions.Item>
            <Descriptions.Item label="Cores">
              {sysInfo.cpuInfo.physicalCores}p / {sysInfo.cpuInfo.logicalCores}l
            </Descriptions.Item>
            <Descriptions.Item label="Memory">
              {sysInfo.memoryInfo.availableGb.toFixed(1)} GB free / {sysInfo.memoryInfo.totalGb.toFixed(1)} GB total
            </Descriptions.Item>
            <Descriptions.Item label="Disk Free">
              {sysInfo.diskInfo.freeGb.toFixed(1)} GB
            </Descriptions.Item>
            {sysInfo.gpuInfo.length > 0 && (
              <Descriptions.Item label="GPU">
                {sysInfo.gpuInfo.map((g) => `${g.vendor} ${g.name}`).join(", ")}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      <Card
        title="Python Environments"
        size="small"
        extra={<Button size="small" onClick={() => void load()} loading={loading}>Rescan</Button>}
      >
        <Table<PythonEnv>
          dataSource={envs}
          rowKey="envId"
          size="small"
          pagination={false}
          loading={loading}
          columns={[
            {
              title: "Name / ID",
              key: "name",
              render: (_, r) => (
                <Space>
                  {r.recommended && <Badge status="success" />}
                  <span>{r.name ?? r.envId}</span>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>{r.type}</Typography.Text>
                </Space>
              ),
            },
            {
              title: "Python",
              dataIndex: "pythonVersion",
              render: (v: string | null) => v ?? "—",
            },
            {
              title: "Path",
              dataIndex: "pythonPathMasked",
              render: (v: string) => <Typography.Text code style={{ fontSize: 11 }}>{v}</Typography.Text>,
            },
            {
              title: "Status",
              dataIndex: "status",
              render: (v: string) => <Tag color={STATUS_COLORS[v] ?? "default"}>{v}</Tag>,
            },
            {
              title: "Missing",
              dataIndex: "missing",
              render: (v: string[]) =>
                v.length === 0
                  ? <Typography.Text type="success">All installed</Typography.Text>
                  : <Typography.Text type="danger">{v.join(", ")}</Typography.Text>,
            },
          ]}
        />
      </Card>
    </Space>
  );
}
