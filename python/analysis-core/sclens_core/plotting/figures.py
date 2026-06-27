from __future__ import annotations

import os
from pathlib import Path
from typing import Sequence

os.environ.setdefault("MPLBACKEND", "Agg")

import matplotlib.pyplot as plt
import anndata as ad


def plot_violin_qc(adata: ad.AnnData, output_path: Path) -> None:
    """Save a 3-panel QC violin plot (n_genes, total_counts, pct_mito)."""
    cols = []
    labels = []
    if "n_genes_by_counts" in adata.obs:
        cols.append("n_genes_by_counts")
        labels.append("Genes per cell")
    if "total_counts" in adata.obs:
        cols.append("total_counts")
        labels.append("Total counts")
    if "pct_counts_mito" in adata.obs:
        cols.append("pct_counts_mito")
        labels.append("% mito counts")

    if not cols:
        fig, ax = plt.subplots(figsize=(4, 3))
        ax.text(0.5, 0.5, "No QC columns found", ha="center", va="center", transform=ax.transAxes)
        fig.savefig(output_path, dpi=120, bbox_inches="tight")
        plt.close(fig)
        return

    fig, axes = plt.subplots(1, len(cols), figsize=(4 * len(cols), 4))
    if len(cols) == 1:
        axes = [axes]

    for ax, col, label in zip(axes, cols, labels):
        data = adata.obs[col].dropna().to_numpy()
        parts = ax.violinplot(data, showmedians=True, showextrema=True)
        for pc in parts.get("bodies", []):
            pc.set_facecolor("#4C72B0")
            pc.set_alpha(0.7)
        ax.set_xticks([])
        ax.set_title(label, fontsize=10)
        ax.set_ylabel(col, fontsize=8)

    fig.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)


def plot_umap(adata: ad.AnnData, color: Sequence[str], output_path: Path) -> None:
    """Save a UMAP scatter colored by one or more obs columns."""
    import scanpy as sc

    try:
        fig = sc.pl.umap(adata, color=list(color), show=False, return_fig=True)
        fig.savefig(output_path, dpi=150, bbox_inches="tight")
        plt.close(fig)
    except Exception:
        fig, ax = plt.subplots(figsize=(5, 4))
        if "X_umap" in adata.obsm:
            emb = adata.obsm["X_umap"]
            ax.scatter(emb[:, 0], emb[:, 1], s=2, alpha=0.5)
        ax.set_xlabel("UMAP1")
        ax.set_ylabel("UMAP2")
        ax.set_title(", ".join(color))
        fig.savefig(output_path, dpi=150, bbox_inches="tight")
        plt.close(fig)
