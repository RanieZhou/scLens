from __future__ import annotations

import importlib.metadata
import platform
import sys
from datetime import datetime
from typing import Any

TRACKED_PACKAGES = [
    "scanpy",
    "anndata",
    "numpy",
    "pandas",
    "scipy",
    "scikit-learn",
    "matplotlib",
    "h5py",
    "python-igraph",
    "leidenalg",
    "umap-learn",
    "pyarrow",
    "jinja2",
]


def _pkg_version(name: str) -> str:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return "unknown"


def build_provenance(
    task_id: str,
    pipeline: str,
    params: dict[str, Any],
    random_seed: int,
    input_display_name: str,
    input_format: str,
    n_obs: int,
    n_vars: int,
    input_checksum: str,
    started_at: datetime,
    finished_at: datetime,
    output_files: list[dict[str, Any]],
) -> dict[str, Any]:
    from sclens_core import __version__

    return {
        "schemaVersion": "1.0",
        "taskId": task_id,
        "pipeline": pipeline,
        "analysisCoreVersion": __version__,
        "randomSeed": random_seed,
        "params": params,
        "environment": {
            "pythonVersion": platform.python_version(),
            "os": f"{platform.system()} {platform.release()}",
            "platform": sys.platform,
            "packages": {p: _pkg_version(p) for p in TRACKED_PACKAGES},
        },
        "input": {
            "format": input_format,
            "displayName": input_display_name,
            "nObs": n_obs,
            "nVars": n_vars,
            "checksum": input_checksum,
        },
        "timing": {
            "startedAt": started_at.isoformat(),
            "finishedAt": finished_at.isoformat(),
            "durationSeconds": int((finished_at - started_at).total_seconds()),
        },
        "outputs": output_files,
    }
