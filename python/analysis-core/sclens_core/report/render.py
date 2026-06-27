from __future__ import annotations

import base64
from importlib.resources import files
from pathlib import Path
from typing import Any

from jinja2 import Environment, BaseLoader


def encode_figures_b64(output_dir: Path, figure_paths: list[str]) -> dict[str, str]:
    """Read figure files and return a dict mapping path → base64 data URI."""
    result: dict[str, str] = {}
    for rel_path in figure_paths:
        abs_path = output_dir / rel_path
        if abs_path.exists():
            ext = abs_path.suffix.lower().lstrip(".")
            mime = "image/png" if ext == "png" else f"image/{ext}"
            b64 = base64.b64encode(abs_path.read_bytes()).decode("ascii")
            result[rel_path] = f"data:{mime};base64,{b64}"
    return result


def render_html(template_name: str, context: dict[str, Any], output_path: Path) -> None:
    template_source = (
        files("sclens_core")
        .joinpath("templates")
        .joinpath(template_name)
        .read_text(encoding="utf-8")
    )
    env = Environment(loader=BaseLoader(), autoescape=True)
    tmpl = env.from_string(template_source)
    html = tmpl.render(**context)
    output_path.write_text(html, encoding="utf-8")
