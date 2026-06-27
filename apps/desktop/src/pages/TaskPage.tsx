import { invoke } from "@tauri-apps/api/core";
import {
  Alert,
  Badge,
  Button,
  Card,
  Progress,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { useEffect, useRef, useState } from "react";

interface PendingTask {
  id: string;
  name: string;
  status: string;
  pipeline: string;
  progress: number | null;
  currentStage: string | null;
  createdAt: string;
  project: { name: string } | null;
  config: Record<string, unknown> | null;
}

interface PythonEnv {
  envId: string;
  type: string;
  name: string | null;
  pythonPathMasked: string;
  status: string;
  recommended: boolean;
}

type ExecPhase =
  | { phase: "idle" }
  | { phase: "selecting" }
  | { phase: "ready"; displayName: string }
  | { phase: "running"; taskId: string; displayName: string }
  | { phase: "done"; taskId: string }
  | { phase: "error"; taskId: string; message: string };

const PIPELINE_LABELS: Record<string, string> = {
  sc_profile_basic: "Data Profile",
  sc_standard_analysis: "Standard Analysis",
};

export function TaskPage() {
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [envs, setEnvs] = useState<PythonEnv[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [paired, setPaired] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [heartbeatErr, setHeartbeatErr] = useState<string | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [exec, setExec] = useState<ExecPhase>({ phase: "idle" });

  const taskPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void init();
    return () => {
      if (taskPollRef.current) clearInterval(taskPollRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (autoClearRef.current) clearTimeout(autoClearRef.current);
    };
  }, []);

  async function init() {
    const isPaired = await invoke<boolean>("is_paired").catch(() => false);
    setPaired(isPaired);
    if (!isPaired) return;

    const pyEnvs = await invoke<PythonEnv[]>("get_python_envs").catch(() => []);
    setEnvs(pyEnvs);
    const ready = pyEnvs.find((e) => e.status === "READY");
    if (ready) {
      setSelectedEnvId(ready.envId);
      await invoke("set_python_env", { envId: ready.envId }).catch(() => {});
    }

    startPolling();
  }

  function startPolling() {
    void pollTasks();
    void heartbeat();
    if (taskPollRef.current) clearInterval(taskPollRef.current);
    taskPollRef.current = setInterval(() => void pollTasks(), 3000);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => void heartbeat(), 10000);
  }

  async function pollTasks() {
    try {
      const data = await invoke<PendingTask[]>("fetch_pending_tasks");
      setTasks(Array.isArray(data) ? data : []);
      setFetchErr(null);
    } catch (e) {
      setFetchErr(String(e));
    }
  }

  async function heartbeat() {
    try {
      await invoke("send_heartbeat");
      setLastHeartbeat(new Date());
      setHeartbeatErr(null);
    } catch (e) {
      setHeartbeatErr(String(e));
    }
  }

  async function handleSelectFile() {
    setExec({ phase: "selecting" });
    try {
      const name = await invoke<string | null>("select_local_file");
      if (name) {
        setExec({ phase: "ready", displayName: name });
      } else {
        setExec({ phase: "idle" });
      }
    } catch {
      setExec({ phase: "idle" });
    }
  }

  async function handleRun(task: PendingTask) {
    if (exec.phase !== "ready") return;
    const displayName = exec.displayName;
    setExec({ phase: "running", taskId: task.id, displayName });
    try {
      await invoke("run_pipeline", {
        taskId: task.id,
        pipeline: task.pipeline,
        paramsJson: JSON.stringify(task.config ?? {}),
      });
      setExec({ phase: "done", taskId: task.id });
      void pollTasks();
      // Auto-clear success banner after 30s
      autoClearRef.current = setTimeout(() => setExec({ phase: "idle" }), 30_000);
    } catch (e) {
      setExec({ phase: "error", taskId: task.id, message: String(e) });
    }
  }

  async function handleEnvChange(envId: string) {
    setSelectedEnvId(envId);
    await invoke("set_python_env", { envId }).catch(() => {});
  }

  if (!paired) {
    return (
      <Alert
        type="warning"
        message="Not paired"
        description="Go to the Pairing tab to connect this runner to a project first."
      />
    );
  }

  const readyEnvs = envs.filter((e) => e.status === "READY");
  const isRunning = exec.phase === "running";
  const runningTaskId = isRunning ? exec.taskId : null;

  // Find the running task in the polled list to get live progress
  const runningTask = runningTaskId ? tasks.find((t) => t.id === runningTaskId) : null;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* Status bar */}
      <Card size="small">
        <Space>
          <Badge status={heartbeatErr ? "error" : lastHeartbeat ? "success" : "default"} />
          <Typography.Text>
            {heartbeatErr
              ? `Heartbeat error: ${heartbeatErr}`
              : lastHeartbeat
              ? `Connected · last heartbeat ${lastHeartbeat.toLocaleTimeString()}`
              : "Connecting…"}
          </Typography.Text>
        </Space>
      </Card>

      {fetchErr && <Alert type="error" message={`Task poll error: ${fetchErr}`} />}

      {/* Running task — live progress */}
      {isRunning && (
        <Card
          size="small"
          title={
            <Space>
              <Tag color="blue">{PIPELINE_LABELS[runningTask?.pipeline ?? ""] ?? "Pipeline"}</Tag>
              <span>{runningTask?.name ?? exec.taskId.slice(0, 8)}</span>
            </Space>
          }
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Progress
              percent={runningTask?.progress ?? 0}
              status="active"
              format={(p) => `${p}%`}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {exec.displayName}
              {runningTask?.currentStage ? ` · ${runningTask.currentStage}` : ""}
            </Typography.Text>
          </Space>
        </Card>
      )}

      {/* Success / error feedback */}
      {exec.phase === "done" && (
        <Alert
          type="success"
          message="Pipeline completed"
          description={`Task ${exec.taskId.slice(0, 8)} finished. Open the Web Console to view results.`}
          closable
          onClose={() => setExec({ phase: "idle" })}
        />
      )}
      {exec.phase === "error" && (
        <Alert
          type="error"
          message="Pipeline failed"
          description={exec.message}
          closable
          onClose={() => setExec({ phase: "idle" })}
        />
      )}

      {/* Python env selector */}
      {readyEnvs.length > 0 && (
        <Card title="Python Environment" size="small">
          <Select
            style={{ width: "100%" }}
            value={selectedEnvId ?? undefined}
            onChange={(v) => { if (v) void handleEnvChange(v); }}
            disabled={isRunning}
            options={readyEnvs.map((e) => ({
              value: e.envId,
              label: `${e.name ?? e.envId} (${e.pythonPathMasked})`,
            }))}
          />
        </Card>
      )}
      {readyEnvs.length === 0 && (
        <Alert
          type="warning"
          message="No READY Python environments found"
          description="Install scanpy, anndata, leidenalg, jinja2 in a Python 3.9+ environment, then rescan in System Info."
        />
      )}

      {/* Pending tasks (not currently running) */}
      {!isRunning && tasks.length === 0 && exec.phase === "idle" && (
        <Card size="small">
          <Typography.Text type="secondary">No pending tasks — runner is idle.</Typography.Text>
        </Card>
      )}

      {!isRunning &&
        tasks.map((task) => {
          const fileReady = exec.phase === "ready";
          const fileDisplayName = exec.phase === "ready" ? exec.displayName : null;

          return (
            <Card
              key={task.id}
              size="small"
              title={
                <Space>
                  <Tag color="blue">{PIPELINE_LABELS[task.pipeline] ?? task.pipeline}</Tag>
                  <span style={{ fontWeight: 500 }}>{task.name}</span>
                  {task.project?.name && (
                    <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
                      {task.project.name}
                    </Typography.Text>
                  )}
                </Space>
              }
              extra={
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {task.id.slice(0, 8)}
                </Typography.Text>
              }
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                {fileDisplayName ? (
                  <Alert
                    type="info"
                    message={`Selected: ${fileDisplayName}`}
                    style={{ marginBottom: 4 }}
                  />
                ) : (
                  <Typography.Text type="secondary">
                    Select the local .h5ad file to analyse.
                  </Typography.Text>
                )}
                <Space>
                  <Button
                    onClick={() => void handleSelectFile()}
                    disabled={isRunning || exec.phase === "selecting"}
                    loading={exec.phase === "selecting"}
                  >
                    {fileDisplayName ? "Change file…" : "Select .h5ad file…"}
                  </Button>
                  <Button
                    type="primary"
                    disabled={!fileReady || isRunning || readyEnvs.length === 0}
                    onClick={() => void handleRun(task)}
                  >
                    Run
                  </Button>
                </Space>
              </Space>
            </Card>
          );
        })}
    </Space>
  );
}
