"""sc_profile_basic pipeline — data structure inspection and QC profile."""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import scipy.sparse

from ..io.loader import load_h5ad
from ..plotting.figures import plot_violin_qc
from ..progress import ProgressWriter
from ..provenance import build_provenance
from ..qc.metrics import compute_qc
from ..report.render import encode_figures_b64, render_html
from ..schemas.params import InspectParams
from ..utils.checksum import sha256_file


def run_inspect(
    file_path: Path,
    task_id: str,
    output_dir: Path,
    display_name: str,
    params: InspectParams,
) -> None:
    started_at = datetime.now(timezone.utc)
    output_dir.mkdir(parents=True, exist_ok=True)
    figs_dir = output_dir / "figures"
    figs_dir.mkdir(exist_ok=True)

    pw = ProgressWriter(output_dir)

    try:
        pw.emit("loading", 0, "Computing input checksum")
        input_checksum = sha256_file(file_path)

        pw.emit("loading", 5, "Loading h5ad file")
        adata = load_h5ad(file_path)
        n_obs, n_vars = adata.n_obs, adata.n_vars
        pw.emit("loading", 15, f"Loaded {n_obs} cells × {n_vars} genes")

        pw.emit("inspect", 20, "Computing QC metrics")
        compute_qc(adata, params.mito_prefix)
        pw.emit("inspect", 40, "QC metrics computed")

        # Detect structure
        has_pca = "X_pca" in adata.obsm
        has_umap = "X_umap" in adata.obsm
        cluster_key: str | None = None
        for key in ("leiden", "louvain", "cluster", "celltype"):
            if key in adata.obs.columns:
                cluster_key = key
                break

        # Sparsity
        if scipy.sparse.issparse(adata.X):
            nnz = int(adata.X.nnz)
        else:
            nnz = int(np.count_nonzero(adata.X))
        total = n_obs * n_vars
        sparsity = 1.0 - nnz / total if total > 0 else 0.0

        pw.emit("figures", 50, "Generating QC violin plot")
        fig_path = figs_dir / "violin_qc.png"
        plot_violin_qc(adata, fig_path)
        pw.emit("figures", 65, "QC violin plot saved")

        summary: dict[str, Any] = {
            "pipeline": "sc_profile_basic",
            "taskId": task_id,
            "nObs": n_obs,
            "nVars": n_vars,
            "sparsity": round(sparsity, 4),
            "hasX": adata.X is not None,
            "layers": list(adata.layers.keys()),
            "obsFields": list(adata.obs.columns.tolist()),
            "varFields": list(adata.var.columns.tolist()),
            "obsm": list(adata.obsm.keys()),
            "uns": list(adata.uns.keys()),
            "hasPca": has_pca,
            "hasUmap": has_umap,
            "hasClusters": cluster_key is not None,
            "clusterKey": cluster_key,
            "nClusters": int(adata.obs[cluster_key].nunique()) if cluster_key else None,
            "qc": {
                "medianGenes": int(adata.obs["n_genes_by_counts"].median())
                if "n_genes_by_counts" in adata.obs
                else 0,
                "medianCounts": int(adata.obs["total_counts"].median())
                if "total_counts" in adata.obs
                else 0,
                "medianPctMt": round(float(adata.obs["pct_counts_mito"].median()), 2)
                if "pct_counts_mito" in adata.obs
                else 0.0,
            },
            "figures": ["figures/violin_qc.png"],
        }

        pw.emit("report", 75, "Writing summary.json")
        summary_path = output_dir / "summary.json"
        summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

        pw.emit("report", 85, "Rendering HTML report")
        report_path = output_dir / "report.html"
        figures_b64 = encode_figures_b64(output_dir, summary["figures"])
        render_html("inspect_report.html.j2", {"summary": summary, "figures_b64": figures_b64}, report_path)

        finished_at = datetime.now(timezone.utc)

        output_files: list[dict[str, Any]] = [
            {
                "fileType": "summary_json",
                "fileName": "summary.json",
                "sizeBytes": summary_path.stat().st_size,
                "checksum": sha256_file(summary_path),
            },
            {
                "fileType": "report_html",
                "fileName": "report.html",
                "sizeBytes": report_path.stat().st_size,
                "checksum": sha256_file(report_path),
            },
            {
                "fileType": "figure",
                "fileName": "figures/violin_qc.png",
                "sizeBytes": fig_path.stat().st_size,
                "checksum": sha256_file(fig_path),
            },
        ]

        pw.emit("provenance", 95, "Writing provenance.json")
        prov = build_provenance(
            task_id=task_id,
            pipeline="sc_profile_basic",
            params={"mitoPrefix": params.mito_prefix},
            random_seed=params.random_seed,
            input_display_name=display_name,
            input_format="h5ad",
            n_obs=n_obs,
            n_vars=n_vars,
            input_checksum=input_checksum,
            started_at=started_at,
            finished_at=finished_at,
            output_files=output_files,
        )
        prov_path = output_dir / "provenance.json"
        prov_path.write_text(json.dumps(prov, indent=2, ensure_ascii=False), encoding="utf-8")

        pw.emit("done", 100, "Inspection complete")

    except Exception as exc:
        pw.emit("error", -1, str(exc))
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
