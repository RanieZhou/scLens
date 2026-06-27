import { Alert, Button, Card, Space, Spin, Tag, Typography } from "antd";
import { usePairing } from "../features/pairing/usePairing.js";

type Props = { onPaired: () => void };

export function PairingPage({ onPaired }: Props) {
  const { state, startSession } = usePairing(onPaired);

  const statusColor =
    state.status === "paired" ? "green"
    : state.status === "error" || state.status === "expired" ? "red"
    : state.status === "waiting" ? "blue"
    : "default";

  return (
    <Card style={{ maxWidth: 480, margin: "0 auto" }}>
      <Typography.Title level={3}>Runner Pairing</Typography.Title>
      <Typography.Paragraph type="secondary">
        Click <strong>Generate Code</strong> to get a one-time pairing code. Enter it in the
        scLens Web Console under the project's <em>Pair Runner</em> page.
      </Typography.Paragraph>

      {state.status !== "idle" && (
        <Tag color={statusColor} style={{ marginBottom: 16, fontSize: 13 }}>
          {state.status.toUpperCase()}
        </Tag>
      )}

      {state.error && (
        <Alert type="error" message={state.error} style={{ marginBottom: 16 }} />
      )}

      {state.pairCode && state.status === "waiting" && (
        <Card
          size="small"
          style={{ background: "#f6f8fa", marginBottom: 16, textAlign: "center" }}
        >
          <Typography.Text style={{ fontSize: 32, fontFamily: "monospace", letterSpacing: 8, fontWeight: 700 }}>
            {state.pairCode}
          </Typography.Text>
          <div style={{ marginTop: 8 }}>
            <Typography.Text type="secondary">
              Expires in {state.expiresIn}s
            </Typography.Text>
          </div>
          <Spin size="small" style={{ marginTop: 8 }} />
        </Card>
      )}

      {state.status === "paired" && (
        <Alert type="success" message="Paired successfully! Uploading system profile…" style={{ marginBottom: 16 }} />
      )}

      {state.status === "expired" && (
        <Alert type="warning" message="Pairing code expired. Generate a new one." style={{ marginBottom: 16 }} />
      )}

      <Space>
        <Button
          type="primary"
          onClick={() => void startSession()}
          disabled={state.status === "waiting"}
          loading={state.status === "waiting" && !state.pairCode}
        >
          {state.status === "expired" || state.status === "error" ? "Retry" : "Generate Code"}
        </Button>
      </Space>
    </Card>
  );
}
