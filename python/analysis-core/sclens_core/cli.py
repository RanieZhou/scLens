"""scLens Analysis Core CLI — sclens inspect / sclens run-standard."""
from __future__ import annotations

import os
# Must be set before any matplotlib import (scanpy imports matplotlib on startup)
os.environ.setdefault("MPLBACKEND", "Agg")

from pathlib import Path
from typing import Annotated

import typer

from sclens_core import __version__

app = typer.Typer(
    name="sclens",
    help="scLens Python Analysis Core",
    add_completion=False,
)


@app.command()
def version() -> None:
    """Print the version of sclens_core."""
    typer.echo(f"sclens-core {__version__}")


@app.command()
def inspect(
    file: Annotated[
        Path,
        typer.Option("--file", "-f", help="Path to .h5ad file", exists=True, file_okay=True, dir_okay=False),
    ],
    task_id: Annotated[str, typer.Option("--task-id", "-t", help="Task ID (for provenance)")],
    output_dir: Annotated[Path, typer.Option("--output-dir", "-o", help="Output directory")],
    display_name: Annotated[
        str,
        typer.Option("--display-name", "-n", help="File display name — no full path"),
    ] = "",
    mito_prefix: Annotated[str, typer.Option("--mito-prefix", help="Mitochondrial gene prefix")] = "MT-",
) -> None:
    """Run sc_profile_basic: inspect data structure and QC profile."""
    from sclens_core.pipelines.inspect import run_inspect
    from sclens_core.schemas.params import InspectParams

    params = InspectParams(mito_prefix=mito_prefix)
    run_inspect(
        file_path=file,
        task_id=task_id,
        output_dir=output_dir,
        display_name=display_name or file.name,
        params=params,
    )


@app.command(name="run-standard")
def run_standard(
    file: Annotated[
        Path,
        typer.Option("--file", "-f", help="Path to .h5ad file", exists=True, file_okay=True, dir_okay=False),
    ],
    task_id: Annotated[str, typer.Option("--task-id", "-t", help="Task ID (for provenance)")],
    output_dir: Annotated[Path, typer.Option("--output-dir", "-o", help="Output directory")],
    display_name: Annotated[
        str,
        typer.Option("--display-name", "-n", help="File display name — no full path"),
    ] = "",
    mito_prefix: Annotated[str, typer.Option("--mito-prefix")] = "MT-",
    min_genes: Annotated[int, typer.Option("--min-genes")] = 200,
    min_cells: Annotated[int, typer.Option("--min-cells")] = 3,
    max_pct_mito: Annotated[float, typer.Option("--max-pct-mito")] = 20.0,
    n_top_genes: Annotated[int, typer.Option("--n-top-genes")] = 2000,
    n_pcs: Annotated[int, typer.Option("--n-pcs")] = 50,
    n_neighbors: Annotated[int, typer.Option("--n-neighbors")] = 15,
    resolution: Annotated[float, typer.Option("--resolution")] = 0.8,
    n_marker_genes: Annotated[int, typer.Option("--n-marker-genes")] = 50,
    random_seed: Annotated[int, typer.Option("--random-seed")] = 42,
) -> None:
    """Run sc_standard_analysis: QC → normalize → HVG → PCA → UMAP → Leiden → markers."""
    from sclens_core.pipelines.standard import run_standard as _run
    from sclens_core.schemas.params import StandardParams

    params = StandardParams(
        mito_prefix=mito_prefix,
        min_genes=min_genes,
        min_cells=min_cells,
        max_pct_mito=max_pct_mito,
        n_top_genes=n_top_genes,
        n_pcs=n_pcs,
        n_neighbors=n_neighbors,
        resolution=resolution,
        n_marker_genes=n_marker_genes,
        random_seed=random_seed,
    )
    _run(
        file_path=file,
        task_id=task_id,
        output_dir=output_dir,
        display_name=display_name or file.name,
        params=params,
    )


if __name__ == "__main__":
    app()
