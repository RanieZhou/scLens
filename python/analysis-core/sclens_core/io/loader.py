from __future__ import annotations

from pathlib import Path

import anndata as ad


def load_h5ad(path: Path) -> ad.AnnData:
    return ad.read_h5ad(path)
