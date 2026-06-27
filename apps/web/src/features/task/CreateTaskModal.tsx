import { useMutation } from "@tanstack/react-query";
import { Alert, Divider, Form, Input, InputNumber, Modal, Select } from "antd";
import { projectsApi } from "../../api/projects.js";

type Props = {
  open: boolean;
  projectId: string;
  runners: Record<string, unknown>[];
  onClose: () => void;
  onCreated: () => void;
};

const PIPELINE_OPTIONS = [
  { label: "Data Profile (sc_profile_basic)", value: "sc_profile_basic" },
  { label: "Standard Analysis (sc_standard_analysis)", value: "sc_standard_analysis" },
];

// Mirrors the config shape expected by the backend and Python CLI
function buildConfig(values: Record<string, unknown>, pipeline: string): Record<string, unknown> {
  const qc = (values["steps"] as Record<string, unknown> | undefined)?.["qc"] as Record<string, unknown> | undefined;
  const pre = (values["steps"] as Record<string, unknown> | undefined)?.["preprocess"] as Record<string, unknown> | undefined;
  const dim = (values["steps"] as Record<string, unknown> | undefined)?.["dimensionReduction"] as Record<string, unknown> | undefined;
  const clust = (values["steps"] as Record<string, unknown> | undefined)?.["clustering"] as Record<string, unknown> | undefined;
  const markers = (values["steps"] as Record<string, unknown> | undefined)?.["markers"] as Record<string, unknown> | undefined;
  const params = values["params"] as Record<string, unknown> | undefined;

  if (pipeline === "sc_standard_analysis") {
    return {
      input: { type: "h5ad", localFileRequired: true, uploadRawData: false },
      steps: {
        qc: {
          enabled: true,
          minGenes: qc?.["minGenes"] ?? 200,
          minCells: qc?.["minCells"] ?? 3,
          maxPercentMito: qc?.["maxPercentMito"] ?? 20,
          mitoGenePrefix: qc?.["mitoGenePrefix"] ?? "MT-",
        },
        preprocess: {
          normalizeTotal: true,
          targetSum: 10000,
          log1p: true,
          nTopGenes: pre?.["nTopGenes"] ?? 2000,
          highlyVariableGenes: true,
        },
        dimensionReduction: {
          pca: true,
          nPcs: dim?.["nPcs"] ?? 50,
          neighbors: true,
          nNeighbors: dim?.["nNeighbors"] ?? 15,
          umap: true,
        },
        clustering: { enabled: true, method: "leiden", resolution: clust?.["resolution"] ?? 0.8 },
        markers: { enabled: true, method: "wilcoxon", nGenes: markers?.["nGenes"] ?? 50 },
      },
      params: { randomSeed: params?.["randomSeed"] ?? 42 },
      outputs: {
        upload: { summaryJson: true, reportHtml: true, figures: true, markersCsv: true, rawData: false },
      },
    };
  }

  return {
    input: { type: "h5ad", localFileRequired: true, uploadRawData: false },
    steps: {
      inspect: { enabled: true },
      qc: { enabled: true, mitoGenePrefix: qc?.["mitoGenePrefix"] ?? "MT-" },
    },
    outputs: { upload: { summaryJson: true, reportHtml: true, figures: true, rawData: false } },
  };
}

export function CreateTaskModal({ open, projectId, runners, onClose, onCreated }: Props) {
  const [form] = Form.useForm<Record<string, unknown>>();
  const pipeline = Form.useWatch("pipeline", form) as string | undefined;

  const createMut = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const pl = values["pipeline"] as string;
      return projectsApi.createTask(projectId, {
        name: values["name"] as string,
        pipeline: pl,
        runnerId: values["runnerId"] as string,
        config: buildConfig(values, pl),
      });
    },
    onSuccess: () => {
      onCreated();
      onClose();
      form.resetFields();
    },
  });

  const runnerOptions = runners.map((r) => ({
    label:
      (r["profile"] as Record<string, unknown> | null)?.["hostname"] as string ??
      (r["id"] as string),
    value: r["id"] as string,
  }));

  return (
    <Modal
      title="Create Task"
      open={open}
      onCancel={() => { onClose(); form.resetFields(); }}
      onOk={() => form.submit()}
      confirmLoading={createMut.isPending}
      width={560}
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
    >
      {createMut.isError && (
        <Alert type="error" message={createMut.error?.message} style={{ marginBottom: 12 }} />
      )}

      <Form form={form} layout="vertical" onFinish={(v) => createMut.mutate(v)}>
        <Form.Item name="name" label="Task name" rules={[{ required: true }]}>
          <Input placeholder="PBMC3k basic profile" />
        </Form.Item>
        <Form.Item name="pipeline" label="Pipeline" rules={[{ required: true }]}>
          <Select options={PIPELINE_OPTIONS} />
        </Form.Item>
        <Form.Item name="runnerId" label="Runner" rules={[{ required: true }]}>
          <Select options={runnerOptions} />
        </Form.Item>

        {/* sc_profile_basic params */}
        {pipeline === "sc_profile_basic" && (
          <>
            <Divider style={{ marginTop: 12, marginBottom: 12 }} />
            <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>QC 过滤设置 (QC Settings)</div>
            <Form.Item
              name={["steps", "qc", "mitoGenePrefix"]}
              label="Mitochondrial gene prefix"
              initialValue="MT-"
              tooltip="Gene names starting with this prefix are counted as mitochondrial."
            >
              <Input style={{ width: 160 }} />
            </Form.Item>
          </>
        )}

        {/* sc_standard_analysis params */}
        {pipeline === "sc_standard_analysis" && (
          <>
            <Divider style={{ marginTop: 12, marginBottom: 12 }} />
            <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>QC 细胞过滤参数 (QC Filtering)</div>
            <Form.Item
              name={["steps", "qc", "minGenes"]}
              label="Min genes per cell"
              initialValue={200}
              tooltip="Cells with fewer genes are removed."
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name={["steps", "qc", "minCells"]}
              label="Min cells per gene"
              initialValue={3}
              tooltip="Genes expressed in fewer cells are removed."
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name={["steps", "qc", "maxPercentMito"]}
              label="Max % mitochondrial counts"
              initialValue={20}
              tooltip="Cells above this threshold are removed."
            >
              <InputNumber min={0} max={100} step={1} style={{ width: "100%" }} addonAfter="%" />
            </Form.Item>
            <Form.Item
              name={["steps", "qc", "mitoGenePrefix"]}
              label="Mitochondrial gene prefix"
              initialValue="MT-"
            >
              <Input style={{ width: 160 }} />
            </Form.Item>

            <Divider style={{ marginTop: 12, marginBottom: 12 }} />
            <div style={{ fontSize: 11, color: "#8b5cf6", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>数据标准化与高变基因 (Preprocessing)</div>
            <Form.Item
              name={["steps", "preprocess", "nTopGenes"]}
              label="Highly variable genes"
              initialValue={2000}
              tooltip="Number of top highly variable genes selected for downstream analysis."
            >
              <InputNumber min={100} max={20000} style={{ width: "100%" }} />
            </Form.Item>

            <Divider style={{ marginTop: 12, marginBottom: 12 }} />
            <div style={{ fontSize: 11, color: "#06b6d4", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>PCA 降维与邻近图 (Dimension Reduction)</div>
            <Form.Item
              name={["steps", "dimensionReduction", "nPcs"]}
              label="PCA components"
              initialValue={50}
            >
              <InputNumber min={5} max={200} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name={["steps", "dimensionReduction", "nNeighbors"]}
              label="Neighbors (k)"
              initialValue={15}
            >
              <InputNumber min={3} max={100} style={{ width: "100%" }} />
            </Form.Item>

            <Divider style={{ marginTop: 12, marginBottom: 12 }} />
            <div style={{ fontSize: 11, color: "#c084fc", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Leiden 聚类与差异分析 (Clustering & Markers)</div>
            <Form.Item
              name={["steps", "clustering", "resolution"]}
              label="Leiden resolution"
              initialValue={0.8}
              tooltip="Higher values give more clusters."
            >
              <InputNumber min={0.1} max={5} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name={["steps", "markers", "nGenes"]}
              label="Marker genes per cluster"
              initialValue={50}
            >
              <InputNumber min={1} max={500} style={{ width: "100%" }} />
            </Form.Item>

            <Divider style={{ marginTop: 12, marginBottom: 12 }} />
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>可重复性设置 (Reproducibility)</div>
            <Form.Item
              name={["params", "randomSeed"]}
              label="Random seed"
              initialValue={42}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
