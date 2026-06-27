from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class InspectParams:
    mito_prefix: str = "MT-"
    random_seed: int = 42


@dataclass
class StandardParams:
    mito_prefix: str = "MT-"
    min_genes: int = 200
    min_cells: int = 3
    max_pct_mito: float = 20.0
    n_top_genes: int = 2000
    target_sum: float = 1e4
    n_pcs: int = 50
    n_neighbors: int = 15
    resolution: float = 0.8
    n_marker_genes: int = 50
    marker_method: str = "wilcoxon"
    random_seed: int = 42
