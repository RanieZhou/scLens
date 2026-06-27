"""Pure-Python unit tests — no scanpy/anndata required."""
from __future__ import annotations

import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import pytest
from typer.testing import CliRunner

from sclens_core import __version__
from sclens_core.cli import app


# ---------------------------------------------------------------------------
# CLI basics
# ---------------------------------------------------------------------------

def test_package_version_is_available() -> None:
    assert __version__ == "0.1.0"


def test_cli_version_command() -> None:
    runner = CliRunner()
    result = runner.invoke(app, ["version"])
    assert result.exit_code == 0
    assert "0.1.0" in result.stdout


def test_cli_help() -> None:
    runner = CliRunner()
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "inspect" in result.stdout
    assert "run-standard" in result.stdout


# ---------------------------------------------------------------------------
# checksum utility
# ---------------------------------------------------------------------------

def test_sha256_file() -> None:
    from sclens_core.utils.checksum import sha256_file

    with tempfile.NamedTemporaryFile(delete=False, suffix=".bin") as f:
        f.write(b"hello world")
        tmp = Path(f.name)
    try:
        result = sha256_file(tmp)
        assert result.startswith("sha256:")
        # hex SHA-256 is 64 chars
        assert len(result) == len("sha256:") + 64
        # deterministic
        assert result == sha256_file(tmp)
    finally:
        tmp.unlink()


def test_sha256_file_different_content() -> None:
    from sclens_core.utils.checksum import sha256_file

    with tempfile.NamedTemporaryFile(delete=False) as a, tempfile.NamedTemporaryFile(delete=False) as b:
        a.write(b"aaa")
        b.write(b"bbb")
        pa, pb = Path(a.name), Path(b.name)
    try:
        assert sha256_file(pa) != sha256_file(pb)
    finally:
        pa.unlink(); pb.unlink()


# ---------------------------------------------------------------------------
# ProgressWriter
# ---------------------------------------------------------------------------

def test_progress_writer_creates_file() -> None:
    from sclens_core.progress import ProgressWriter

    with tempfile.TemporaryDirectory() as tmpdir:
        pw = ProgressWriter(Path(tmpdir))
        progress_file = Path(tmpdir) / "progress.jsonl"
        assert progress_file.exists()


def test_progress_writer_records() -> None:
    from sclens_core.progress import ProgressWriter

    with tempfile.TemporaryDirectory() as tmpdir:
        pw = ProgressWriter(Path(tmpdir))
        pw.emit("loading", 0, "start")
        pw.emit("qc", 50, "halfway")
        pw.emit("done", 100, "finished")

        lines = (Path(tmpdir) / "progress.jsonl").read_text(encoding="utf-8").strip().splitlines()
        assert len(lines) == 3

        first = json.loads(lines[0])
        assert first["stage"] == "loading"
        assert first["progress"] == 0
        assert first["message"] == "start"

        last = json.loads(lines[-1])
        assert last["progress"] == 100


# ---------------------------------------------------------------------------
# Provenance builder
# ---------------------------------------------------------------------------

def test_build_provenance_schema() -> None:
    from sclens_core.provenance import build_provenance

    started = datetime(2026, 6, 27, 10, 0, 0, tzinfo=timezone.utc)
    finished = datetime(2026, 6, 27, 10, 3, 0, tzinfo=timezone.utc)
    prov = build_provenance(
        task_id="task_test_001",
        pipeline="sc_profile_basic",
        params={"mitoPrefix": "MT-"},
        random_seed=42,
        input_display_name="pbmc3k.h5ad",
        input_format="h5ad",
        n_obs=2700,
        n_vars=32738,
        input_checksum="sha256:abc",
        started_at=started,
        finished_at=finished,
        output_files=[],
    )
    assert prov["schemaVersion"] == "1.0"
    assert prov["taskId"] == "task_test_001"
    assert prov["pipeline"] == "sc_profile_basic"
    assert prov["randomSeed"] == 42
    assert prov["input"]["nObs"] == 2700
    assert prov["input"]["nVars"] == 32738
    assert prov["input"]["displayName"] == "pbmc3k.h5ad"
    assert prov["timing"]["durationSeconds"] == 180
    assert "pythonVersion" in prov["environment"]
    assert "packages" in prov["environment"]
    assert "outputs" in prov


def test_provenance_no_full_path() -> None:
    """Provenance must not leak full paths."""
    from sclens_core.provenance import build_provenance
    import os

    now = datetime.now(timezone.utc)
    prov = build_provenance(
        task_id="t1",
        pipeline="sc_profile_basic",
        params={},
        random_seed=42,
        input_display_name="data.h5ad",
        input_format="h5ad",
        n_obs=100,
        n_vars=200,
        input_checksum="sha256:xx",
        started_at=now,
        finished_at=now,
        output_files=[],
    )
    prov_str = json.dumps(prov)
    # Home directory must not appear
    home = os.path.expanduser("~")
    assert home not in prov_str


# ---------------------------------------------------------------------------
# Params dataclasses
# ---------------------------------------------------------------------------

def test_inspect_params_defaults() -> None:
    from sclens_core.schemas.params import InspectParams

    p = InspectParams()
    assert p.mito_prefix == "MT-"
    assert p.random_seed == 42


def test_standard_params_defaults() -> None:
    from sclens_core.schemas.params import StandardParams

    p = StandardParams()
    assert p.min_genes == 200
    assert p.min_cells == 3
    assert p.max_pct_mito == 20.0
    assert p.n_top_genes == 2000
    assert p.n_pcs == 50
    assert p.n_neighbors == 15
    assert p.resolution == 0.8
    assert p.random_seed == 42


# ---------------------------------------------------------------------------
# Integration tests (require scanpy/anndata — skipped if not installed)
# ---------------------------------------------------------------------------

def _make_tiny_adata(n_obs: int = 100, n_vars: int = 200) -> "anndata.AnnData":
    import numpy as np
    import pandas as pd
    import scipy.sparse as sp
    import anndata as ad

    np.random.seed(42)
    X = sp.random(n_obs, n_vars, density=0.4, format="csr").astype(np.float32)
    # Multiply by small integers to simulate count data
    X.data = (X.data * 10).astype(np.float32) + 1
    obs_names = [f"cell_{i}" for i in range(n_obs)]
    # Last 5 genes are "mito"
    var_names = [f"gene_{i}" for i in range(n_vars - 5)] + [f"MT-mt_{i}" for i in range(5)]
    return ad.AnnData(
        X=X,
        obs=pd.DataFrame(index=obs_names),
        var=pd.DataFrame(index=var_names),
    )


def test_inspect_pipeline(tmp_path: Path) -> None:
    pytest.importorskip("scanpy")
    import anndata as ad

    adata = _make_tiny_adata()
    h5ad_path = tmp_path / "test.h5ad"
    adata.write_h5ad(h5ad_path)

    from sclens_core.pipelines.inspect import run_inspect
    from sclens_core.schemas.params import InspectParams

    out = tmp_path / "inspect_out"
    run_inspect(
        file_path=h5ad_path,
        task_id="test_task_inspect",
        output_dir=out,
        display_name="test.h5ad",
        params=InspectParams(mito_prefix="MT-"),
    )

    assert (out / "summary.json").exists()
    assert (out / "report.html").exists()
    assert (out / "provenance.json").exists()
    assert (out / "figures" / "violin_qc.png").exists()
    assert (out / "progress.jsonl").exists()

    summary = json.loads((out / "summary.json").read_text())
    assert summary["nObs"] == 100
    assert summary["nVars"] == 200
    assert summary["pipeline"] == "sc_profile_basic"
    assert summary["taskId"] == "test_task_inspect"

    prov = json.loads((out / "provenance.json").read_text())
    assert prov["schemaVersion"] == "1.0"
    assert prov["input"]["displayName"] == "test.h5ad"

    # Verify full path is not in provenance
    import os
    home = os.path.expanduser("~")
    assert home not in json.dumps(prov)

    # Check progress ends at 100
    lines = (out / "progress.jsonl").read_text().strip().splitlines()
    last = json.loads(lines[-1])
    assert last["progress"] == 100
    assert last["stage"] == "done"


def test_standard_pipeline(tmp_path: Path) -> None:
    pytest.importorskip("scanpy")

    adata = _make_tiny_adata(n_obs=120, n_vars=300)
    h5ad_path = tmp_path / "test.h5ad"
    adata.write_h5ad(h5ad_path)

    from sclens_core.pipelines.standard import run_standard
    from sclens_core.schemas.params import StandardParams

    out = tmp_path / "standard_out"
    # Use permissive thresholds so tiny synthetic data survives QC
    params = StandardParams(
        min_genes=1,
        min_cells=1,
        max_pct_mito=100.0,
        n_top_genes=50,
        n_pcs=10,
        n_neighbors=5,
        resolution=0.5,
        n_marker_genes=5,
        random_seed=0,
    )
    run_standard(
        file_path=h5ad_path,
        task_id="test_task_standard",
        output_dir=out,
        display_name="test.h5ad",
        params=params,
    )

    assert (out / "summary.json").exists()
    assert (out / "report.html").exists()
    assert (out / "provenance.json").exists()
    assert (out / "figures" / "violin_qc.png").exists()
    assert (out / "figures" / "umap.png").exists()
    assert (out / "figures" / "umap_clusters.png").exists()
    assert (out / "tables" / "markers.csv").exists()

    summary = json.loads((out / "summary.json").read_text())
    assert summary["pipeline"] == "sc_standard_analysis"
    assert summary["nObsInput"] == 120
    assert summary["nClusters"] >= 1
