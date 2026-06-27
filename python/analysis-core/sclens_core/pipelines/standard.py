"""sc_standard_analysis pipeline — full scRNA-seq processing workflow."""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import scanpy as sc

from ..io.loader import load_h5ad
from ..plotting.figures import plot_umap, plot_violin_qc
from ..progress import ProgressWriter
from ..provenance import build_provenance
from ..qc.metrics import compute_qc
from ..report.render import encode_figures_b64, render_html
from ..schemas.params import StandardParams
from ..utils.checksum import sha256_file


def run_standard(
    file_path: Path,
    task_id: str,
    output_dir: Path,
    display_name: str,
    params: StandardParams,
) -> None:
    started_at = datetime.now(timezone.utc)
    output_dir.mkdir(parents=True, exist_ok=True)
    figs_dir = output_dir / "figures"
    tables_dir = output_dir / "tables"
    figs_dir.mkdir(exist_ok=True)
    tables_dir.mkdir(exist_ok=True)

    pw = ProgressWriter(output_dir)

    try:
        pw.emit("loading", 0, "Computing input checksum")
        input_checksum = sha256_file(file_path)

        pw.emit("loading", 5, "Loading h5ad file")
        adata = load_h5ad(file_path)
        n_obs_in, n_vars_in = adata.n_obs, adata.n_vars
        pw.emit("loading", 10, f"Loaded {n_obs_in} cells × {n_vars_in} genes")

        # QC
        pw.emit("qc", 15, "Computing QC metrics")
        compute_qc(adata, params.mito_prefix)

        pw.emit("qc", 20, "Filtering cells and genes")
        sc.pp.filter_cells(adata, min_genes=params.min_genes)
        sc.pp.filter_genes(adata, min_cells=params.min_cells)
        if "pct_counts_mito" in adata.obs.columns:
            adata = adata[adata.obs["pct_counts_mito"] < params.max_pct_mito, :]
        n_obs_after_qc, n_vars_after_qc = adata.n_obs, adata.n_vars
        pw.emit("qc", 30, f"After QC: {n_obs_after_qc} cells × {n_vars_after_qc} genes")

        # Save QC violin before normalization (on raw counts)
        qc_fig_path = figs_dir / "violin_qc.png"
        plot_violin_qc(adata, qc_fig_path)

        # Normalize
        pw.emit("preprocess", 35, "Normalizing total counts and log1p")
        adata.layers["counts"] = adata.X.copy()
        sc.pp.normalize_total(adata, target_sum=params.target_sum)
        sc.pp.log1p(adata)

        # HVG
        pw.emit("preprocess", 42, f"Selecting {params.n_top_genes} highly variable genes")
        sc.pp.highly_variable_genes(adata, n_top_genes=params.n_top_genes)
        n_hvg = int(adata.var["highly_variable"].sum())
        adata = adata[:, adata.var["highly_variable"]]
        pw.emit("preprocess", 50, f"Selected {n_hvg} HVGs")

        # Scale
        sc.pp.scale(adata, max_value=10)

        # PCA
        n_comps = min(params.n_pcs, adata.n_obs - 1, adata.n_vars - 1)
        pw.emit("dim_reduction", 55, f"Running PCA (n_comps={n_comps})")
        sc.tl.pca(adata, n_comps=n_comps, random_state=params.random_seed)
        pw.emit("dim_reduction", 62, "PCA done")

        # Neighbors
        pw.emit("dim_reduction", 65, f"Computing neighbors (k={params.n_neighbors})")
        sc.pp.neighbors(
            adata,
            n_neighbors=params.n_neighbors,
            n_pcs=n_comps,
            random_state=params.random_seed,
        )

        # UMAP
        pw.emit("dim_reduction", 70, "Running UMAP")
        sc.tl.umap(adata, random_state=params.random_seed)
        pw.emit("dim_reduction", 77, "UMAP done")

        # Leiden
        pw.emit("clustering", 79, f"Leiden clustering (resolution={params.resolution})")
        sc.tl.leiden(adata, resolution=params.resolution, random_state=params.random_seed)
        n_clusters = int(adata.obs["leiden"].nunique())
        pw.emit("clustering", 83, f"Found {n_clusters} clusters")

        # Markers
        pw.emit("markers", 85, f"Computing marker genes (n={params.n_marker_genes})")
        sc.tl.rank_genes_groups(
            adata,
            groupby="leiden",
            method=params.marker_method,
            n_genes=params.n_marker_genes,
            key_added="rank_genes_groups",
        )
        markers_path = tables_dir / "markers.csv"
        _save_markers_csv(adata, markers_path, params.n_marker_genes)
        pw.emit("markers", 88, "Marker genes saved")

        # Figures
        pw.emit("figures", 90, "Generating UMAP figures")
        umap_path = figs_dir / "umap.png"
        plot_umap(adata, color=["total_counts"], output_path=umap_path)
        umap_clusters_path = figs_dir / "umap_clusters.png"
        plot_umap(adata, color=["leiden"], output_path=umap_clusters_path)
        pw.emit("figures", 93, "Figures saved")

        # Summary
        params_dict: dict[str, Any] = {
            "qc": {
                "minGenes": params.min_genes,
                "minCells": params.min_cells,
                "maxPercentMito": params.max_pct_mito,
                "mitoGenePrefix": params.mito_prefix,
            },
            "preprocess": {
                "normalizeTotal": True,
                "targetSum": params.target_sum,
                "log1p": True,
                "nTopGenes": params.n_top_genes,
            },
            "dimensionReduction": {"nPcs": n_comps, "nNeighbors": params.n_neighbors},
            "clustering": {"method": "leiden", "resolution": params.resolution},
            "markers": {"method": params.marker_method, "nGenes": params.n_marker_genes},
        }

        summary: dict[str, Any] = {
            "pipeline": "sc_standard_analysis",
            "taskId": task_id,
            "nObsInput": n_obs_in,
            "nVarsInput": n_vars_in,
            "nObsAfterQc": n_obs_after_qc,
            "nVarsAfterQc": n_vars_after_qc,
            "nHvg": n_hvg,
            "nClusters": n_clusters,
            "params": params_dict,
            "qc": {
                "cellsFiltered": n_obs_in - n_obs_after_qc,
                "genesFiltered": n_vars_in - n_vars_after_qc,
            },
            "figures": [
                "figures/violin_qc.png",
                "figures/umap.png",
                "figures/umap_clusters.png",
            ],
            "tables": ["tables/markers.csv"],
        }

        pw.emit("report", 94, "Writing summary.json")
        summary_path = output_dir / "summary.json"
        summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

        pw.emit("report", 96, "Rendering HTML report")
        report_path = output_dir / "report.html"
        figures_b64 = encode_figures_b64(output_dir, summary["figures"])
        render_html("standard_report.html.j2", {"summary": summary, "figures_b64": figures_b64}, report_path)

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
                "sizeBytes": qc_fig_path.stat().st_size,
                "checksum": sha256_file(qc_fig_path),
            },
            {
                "fileType": "figure",
                "fileName": "figures/umap.png",
                "sizeBytes": umap_path.stat().st_size,
                "checksum": sha256_file(umap_path),
            },
            {
                "fileType": "figure",
                "fileName": "figures/umap_clusters.png",
                "sizeBytes": umap_clusters_path.stat().st_size,
                "checksum": sha256_file(umap_clusters_path),
            },
            {
                "fileType": "table",
                "fileName": "tables/markers.csv",
                "sizeBytes": markers_path.stat().st_size,
                "checksum": sha256_file(markers_path),
            },
        ]

        pw.emit("provenance", 98, "Writing provenance.json")
        prov = build_provenance(
            task_id=task_id,
            pipeline="sc_standard_analysis",
            params=params_dict,
            random_seed=params.random_seed,
            input_display_name=display_name,
            input_format="h5ad",
            n_obs=n_obs_in,
            n_vars=n_vars_in,
            input_checksum=input_checksum,
            started_at=started_at,
            finished_at=finished_at,
            output_files=output_files,
        )
        prov_path = output_dir / "provenance.json"
        prov_path.write_text(json.dumps(prov, indent=2, ensure_ascii=False), encoding="utf-8")

        pw.emit("done", 100, "Standard analysis complete")

    except Exception as exc:
        pw.emit("error", -1, str(exc))
        print(f"ERROR: {exc}", file=sys.stderr)
        raise


def _save_markers_csv(adata: Any, path: Path, n_genes: int) -> None:
    result = adata.uns["rank_genes_groups"]
    groups: tuple[str, ...] = result["names"].dtype.names
    records: list[dict[str, Any]] = []
    for grp in groups:
        names = result["names"][grp][:n_genes]
        scores = result["scores"][grp][:n_genes]
        pvals = result["pvals"][grp][:n_genes]
        pvals_adj = result["pvals_adj"][grp][:n_genes]
        lfc = result["logfoldchanges"][grp][:n_genes]
        for rank, (gene, score, pval, padj, fc) in enumerate(
            zip(names, scores, pvals, pvals_adj, lfc), start=1
        ):
            records.append(
                {
                    "cluster": grp,
                    "gene": gene,
                    "score": float(score),
                    "logfoldchange": float(fc),
                    "pval": float(pval),
                    "pval_adj": float(padj),
                    "rank": rank,
                }
            )
    pd.DataFrame(records).to_csv(path, index=False)
