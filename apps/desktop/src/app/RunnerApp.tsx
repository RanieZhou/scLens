import { invoke } from "@tauri-apps/api/core";
import { Badge, ConfigProvider, Layout, Menu, Typography } from "antd";
import { useEffect, useState } from "react";
import { PairingPage } from "../pages/PairingPage.js";
import { SystemInfoPage } from "../pages/SystemInfoPage.js";
import { TaskPage } from "../pages/TaskPage.js";

type Tab = "pairing" | "system" | "tasks";

export function RunnerApp() {
  const [tab, setTab] = useState<Tab>("pairing");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const poll = async () => {
      try {
        const isPaired = await invoke<boolean>("is_paired").catch(() => false);
        if (!isPaired) return;
        const tasks = await invoke<unknown[]>("fetch_pending_tasks").catch(() => []);
        setPendingCount(Array.isArray(tasks) ? tasks.length : 0);
      } catch {
        // ignore
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <ConfigProvider>
      <Layout style={{ minHeight: "100vh" }}>
        <Layout.Header style={{ display: "flex", alignItems: "center", gap: 24, paddingInline: 24 }}>
          <Typography.Text style={{ color: "#fff", fontWeight: 700, fontSize: 16, whiteSpace: "nowrap" }}>
            scLens Runner
          </Typography.Text>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[tab]}
            onClick={(e) => setTab(e.key as Tab)}
            style={{ flex: 1, minWidth: 0 }}
            items={[
              { key: "pairing", label: "Pairing" },
              { key: "system", label: "System Info" },
              {
                key: "tasks",
                label: (
                  <Badge count={pendingCount} size="small" offset={[6, -2]}>
                    <span style={{ color: "inherit" }}>Tasks</span>
                  </Badge>
                )
              },
            ]}
          />
        </Layout.Header>
        <Layout.Content style={{ padding: 24 }}>
          {tab === "pairing" && <PairingPage onPaired={() => setTab("tasks")} />}
          {tab === "system" && <SystemInfoPage />}
          {tab === "tasks" && <TaskPage />}
        </Layout.Content>
      </Layout>
    </ConfigProvider>
  );
}
