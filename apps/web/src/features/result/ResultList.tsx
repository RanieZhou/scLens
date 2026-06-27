import { useEffect, useState } from "react";
import { Button, Card, Collapse, Image, Space, Table, Tag, Typography } from "antd";
import type { ResultFile } from "@sclens/api-client";
import { tasksApi } from "../../api/tasks.js";

type Props = { taskId: string; files: ResultFile[] };

const TYPE_COLOR: Record<string, string> = {
  report_html:  "purple",
  summary_json: "blue",
  figure:       "cyan",
  table:        "green",
  log:          "default",
  provenance:   "orange",
  embedding:    "geekblue",
};

const FIGURE_LABELS: Record<string, string> = {
  "violin_qc.png":      "质量控制小提琴图 (QC Violin)",
  "umap.png":           "单细胞 UMAP 降维图",
  "umap_clusters.png":  "Leiden 细胞分群图",
};

const SUMMARY_LABELS: Record<string, string> = {
  nObs:         "细胞总数 (Cells)",
  nVars:        "表达基因数 (Genes)",
  sparsity:     "矩阵稀疏度 (Sparsity)",
  hasPca:       "是否包含 PCA",
  hasUmap:      "是否包含 UMAP",
  nObsInput:    "输入细胞数 (Input Cells)",
  nVarsInput:   "输入基因数 (Input Genes)",
  nObsAfterQc:  "QC 后细胞数 (QC Cells)",
  nVarsAfterQc: "QC 后基因数 (QC Genes)",
  nHvg:         "高变基因数 (HVGs)",
  nClusters:    "细胞亚群数 (Clusters)",
  pipeline:     "计算管道",
};

const SUMMARY_HIDDEN = new Set(["taskId"]);

// Download SVG Icon
const DownloadIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, transform: "translateY(0.5px)" }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

function useSummaryJson(url: string | null) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (!url) return;
    fetch(url)
      .then((r) => r.json() as Promise<Record<string, unknown>>)
      .then(setData)
      .catch(() => {});
  }, [url]);
  return data;
}

function SummaryPanel({ summaryFile, taskId }: { summaryFile: ResultFile; taskId: string }) {
  const url = tasksApi.resultUrl(taskId, summaryFile.id);
  const data = useSummaryJson(url);
  if (!data) return null;

  const entries = Object.entries(data)
    .filter(([k, v]) =>
      (k in SUMMARY_LABELS) &&
      !SUMMARY_HIDDEN.has(k) &&
      v !== null && v !== undefined && typeof v !== "object"
    )
    .map(([k, v]) => {
      let displayVal = String(v);
      if (k === "sparsity" && typeof v === "number") {
        displayVal = `${(v * 100).toFixed(2)}%`;
      }
      return [SUMMARY_LABELS[k]!, displayVal] as [string, string];
    });

  if (entries.length === 0) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 4 }}>
      {entries.map(([label, value]) => (
        <div
          key={label}
          style={{
            background: "linear-gradient(135deg, #0e1322 0%, #151c2e 100%)",
            border: "1px solid rgba(59, 130, 246, 0.12)",
            borderRadius: 8,
            padding: "16px 20px",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.25)"
          }}
        >
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", marginBottom: 6, fontWeight: 500, letterSpacing: "0.2px" }}>
            {label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, background: "linear-gradient(90deg, #3b82f6, #00f0ff, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ResultList({ taskId, files }: Props) {
  const figures    = files.filter((f) => f.fileType === "figure");
  const htmlReport = files.find((f) => f.fileType === "report_html");
  const summaryFile = files.find((f) => f.fileType === "summary_json");
  const others     = files.filter(
    (f) => f.fileType !== "figure" && f.fileType !== "report_html" && f.fileType !== "summary_json"
  );

  const columns = [
    {
      title: "文件名",
      dataIndex: "fileName",
      key: "fileName",
      render: (v: string) => (
        <Typography.Text code style={{ fontSize: 11, background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.05)" }}>{v}</Typography.Text>
      ),
    },
    {
      title: "数据类型",
      dataIndex: "fileType",
      key: "fileType",
      render: (t: string) => <Tag color={TYPE_COLOR[t] ?? "default"} style={{ borderRadius: 4, fontWeight: 500, fontSize: 11 }}>{t.replace(/_/g, " ")}</Tag>,
    },
    {
      title: "大小",
      dataIndex: "sizeBytes",
      key: "size",
      render: (s: string | number | null) =>
        s != null ? `${(Number(s) / 1024).toFixed(1)} KB` : "—",
    },
    {
      title: "操作",
      key: "action",
      render: (_: unknown, f: ResultFile) => (
        <Button
          size="small"
          type="primary"
          ghost
          href={tasksApi.resultUrl(taskId, f.id)}
          target="_blank"
          style={{ borderRadius: 6, fontSize: 12, display: "inline-flex", alignItems: "center" }}
          download={f.fileType !== "report_html" ? f.fileName : undefined}
        >
          <DownloadIcon />
          下载
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* Summary stats */}
      {summaryFile && <SummaryPanel summaryFile={summaryFile} taskId={taskId} />}

      {/* Inline figures */}
      {figures.length > 0 && (
        <Card
          title="可视化分析图谱 (Figures)"
          className="premium-card"
          style={{ border: "1px solid #1e293b" }}
        >
          <Image.PreviewGroup>
            <Space wrap size={16}>
              {figures.map((f) => (
                <div key={f.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{
                    borderRadius: 6,
                    padding: 2,
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
                    overflow: "hidden",
                    transition: "transform 0.2s",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                  >
                    <Image
                      src={tasksApi.resultUrl(taskId, f.id)}
                      alt={f.fileName}
                      width={240}
                      style={{ borderRadius: 4, display: "block" }}
                    />
                  </div>
                  <Typography.Text type="secondary" style={{ fontSize: 11, color: "#64748b" }}>
                    {FIGURE_LABELS[f.fileName] ?? f.fileName}
                  </Typography.Text>
                </div>
              ))}
            </Space>
          </Image.PreviewGroup>
        </Card>
      )}

      {/* HTML report embed */}
      {htmlReport && (
        <Card
          title="网页分析报告"
          className="premium-card"
          size="small"
          style={{ border: "1px solid #1e293b" }}
          extra={
            <Button
              size="small"
              type="link"
              href={tasksApi.resultUrl(taskId, htmlReport.id)}
              target="_blank"
              style={{ fontWeight: 500 }}
            >
              全屏打开报告 ↗
            </Button>
          }
        >
          <iframe
            src={tasksApi.resultUrl(taskId, htmlReport.id)}
            style={{ width: "100%", minHeight: 520, border: "none", borderRadius: 6, background: "#fff" }}
            title="Analysis Report"
          />
        </Card>
      )}

      {/* Other files (provenance, tables, etc.) */}
      {others.length > 0 && (
        <Collapse
          ghost
          style={{ border: "1px solid #1e293b", borderRadius: 8, background: "rgba(15, 20, 34, 0.4)" }}
          items={[{
            key: "files",
            label: <span style={{ color: "#94a3b8", fontWeight: 600, fontSize: 12 }}>其他产出数据文件 ({others.length})</span>,
            children: (
              <Table
                dataSource={others}
                columns={columns}
                rowKey="id"
                size="small"
                pagination={false}
                style={{ background: "transparent" }}
              />
            ),
          }]}
        />
      )}
    </Space>
  );
}

