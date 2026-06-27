from __future__ import annotations

import anndata as ad
import scanpy as sc


def compute_qc(adata: ad.AnnData, mito_prefix: str = "MT-") -> None:
    """Add QC metrics to adata.obs in-place.

    Adds: n_genes_by_counts, total_counts, pct_counts_mito (if mito genes found).
    """
    adata.var["mito"] = adata.var_names.str.startswith(mito_prefix)
    sc.pp.calculate_qc_metrics(
        adata,
        qc_vars=["mito"],
        percent_top=None,
        log1p=False,
        inplace=True,
    )
