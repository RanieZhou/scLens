use serde::Serialize;
use std::path::Path;
use tauri::State;
use crate::python_probe;
use crate::store::SharedState;

/// Pipeline whitelist — must match sclens CLI subcommands.
const ALLOWED_PIPELINES: &[(&str, &str)] = &[
    ("sc_profile_basic", "inspect"),
    ("sc_standard_analysis", "run-standard"),
];

/// Open a native file dialog and store the selected .h5ad path in state.
/// Returns the display name (filename only) or null if cancelled.
/// The full path never leaves Rust.
#[tauri::command]
pub async fn select_local_file(state: State<'_, SharedState>) -> Result<Option<String>, String> {
    let handle = rfd::AsyncFileDialog::new()
        .add_filter("h5ad files", &["h5ad"])
        .set_title("Select .h5ad data file")
        .pick_file()
        .await;

    match handle {
        None => Ok(None),
        Some(h) => {
            let path = h.path().to_path_buf();
            let display_name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "data.h5ad".to_string());
            state.lock().unwrap().selected_file_path = Some(path);
            Ok(Some(display_name))
        }
    }
}

/// Store the selected Python environment ID in state.
/// The actual binary path is resolved from env_id inside Rust only.
#[tauri::command]
pub fn set_python_env(state: State<'_, SharedState>, env_id: String) {
    state.lock().unwrap().selected_env_id = Some(env_id);
}

/// Execute a pipeline: validates whitelist, runs sclens CLI, polls progress,
/// uploads result files, and updates task status on the backend.
#[tauri::command]
pub async fn run_pipeline(
    state: State<'_, SharedState>,
    task_id: String,
    pipeline: String,
    params_json: String,
) -> Result<(), String> {
    // 1. Validate pipeline whitelist
    let cli_subcommand = ALLOWED_PIPELINES
        .iter()
        .find(|(p, _)| *p == pipeline.as_str())
        .map(|(_, sub)| *sub)
        .ok_or_else(|| format!("Pipeline '{pipeline}' is not in the allowed whitelist"))?;

    // 2. Snapshot required state
    let (file_path, env_id, token, backend_url) = {
        let s = state.lock().unwrap();
        let path = s.selected_file_path.clone().ok_or("No file selected — call select_local_file first")?;
        let eid = s.selected_env_id.clone().ok_or("No Python env selected — call set_python_env first")?;
        let tok = s.runner_access_token.clone().ok_or("Not paired")?;
        (path, eid, tok, s.backend_url.clone())
    };

    // 3. Resolve actual Python binary (never leaves Rust)
    let python_bin = python_probe::get_python_bin(&env_id)
        .ok_or_else(|| format!("Python env '{env_id}' not found or binary missing"))?;

    // 4. Display name — filename only, never the full path
    let display_name = file_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "data.h5ad".to_string());

    // 5. Create temp output directory
    let output_dir = std::env::temp_dir()
        .join(format!("sclens_{}_{}", &task_id[..8], uuid::Uuid::new_v4().simple()));
    tokio::fs::create_dir_all(&output_dir).await.map_err(|e| e.to_string())?;

    let client = reqwest::Client::new();

    // 6. Update task to RUNNING
    post_status(&client, &token, &backend_url, &task_id, "RUNNING", 0, Some("starting")).await;

    // 7. Build CLI args: python -m sclens_core.cli <subcommand> [options]
    let mut args = vec![
        "-m".to_string(),
        "sclens_core.cli".to_string(),
        cli_subcommand.to_string(),
        "--file".to_string(), file_path.to_string_lossy().to_string(),
        "--task-id".to_string(), task_id.clone(),
        "--output-dir".to_string(), output_dir.to_string_lossy().to_string(),
        "--display-name".to_string(), display_name,
    ];

    // Map nested config JSON → CLI flags for this pipeline
    if let Ok(config) = serde_json::from_str::<serde_json::Value>(&params_json) {
        config_to_cli_args(&pipeline, &mut args, &config);
    }

    // 8. Spawn subprocess
    let mut child = tokio::process::Command::new(&python_bin)
        .args(&args)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to launch Python: {e}"))?;

    // 9. Poll progress.jsonl while process runs
    let progress_path = output_dir.join("progress.jsonl");
    let mut last_progress: i64 = -1;

    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                if status.success() {
                    break;
                } else {
                    let stderr = child.wait_with_output().await
                        .ok()
                        .and_then(|o| String::from_utf8(o.stderr).ok())
                        .unwrap_or_default();
                    let msg = format!("Pipeline failed: {}", stderr.lines().last().unwrap_or("unknown error"));
                    post_status(&client, &token, &backend_url, &task_id, "FAILED", 0, Some(&msg)).await;
                    let _ = tokio::fs::remove_dir_all(&output_dir).await;
                    return Err(msg);
                }
            }
            Ok(None) => {
                // Still running — check progress
                if let Ok(content) = tokio::fs::read_to_string(&progress_path).await {
                    if let Some(last_line) = content.trim().lines().last() {
                        if let Ok(v) = serde_json::from_str::<serde_json::Value>(last_line) {
                            let prog = v.get("progress").and_then(|p| p.as_i64()).unwrap_or(-1);
                            if prog > last_progress {
                                last_progress = prog;
                                let stage = v.get("stage").and_then(|s| s.as_str()).unwrap_or("running");
                                post_status(&client, &token, &backend_url, &task_id, "RUNNING", prog as u32, Some(stage)).await;
                            }
                        }
                    }
                }
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            }
            Err(e) => {
                return Err(format!("Process wait error: {e}"));
            }
        }
    }

    // 10. Upload results
    post_status(&client, &token, &backend_url, &task_id, "UPLOADING_RESULTS", 100, Some("uploading")).await;
    upload_result_files(&client, &token, &backend_url, &task_id, &output_dir).await?;

    // 11. Mark COMPLETED
    post_status(&client, &token, &backend_url, &task_id, "COMPLETED", 100, None).await;

    // 12. Clean up temp dir
    let _ = tokio::fs::remove_dir_all(&output_dir).await;

    Ok(())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async fn post_status(
    client: &reqwest::Client,
    token: &str,
    backend_url: &str,
    task_id: &str,
    status: &str,
    progress: u32,
    stage: Option<&str>,
) {
    let mut body = serde_json::json!({ "status": status, "progress": progress });
    if let Some(s) = stage {
        body["currentStage"] = serde_json::json!(s);
    }
    let _ = client
        .post(format!("{}/tasks/{}/status", backend_url, task_id))
        .bearer_auth(token)
        .json(&body)
        .send()
        .await;
}

async fn upload_result_files(
    client: &reqwest::Client,
    token: &str,
    backend_url: &str,
    task_id: &str,
    output_dir: &Path,
) -> Result<(), String> {
    // (relative_path, fileType)
    let candidates: &[(&str, &str)] = &[
        ("summary.json", "summary_json"),
        ("report.html", "report_html"),
        ("provenance.json", "provenance"),
        ("figures/violin_qc.png", "figure"),
        ("figures/umap.png", "figure"),
        ("figures/umap_clusters.png", "figure"),
        ("tables/markers.csv", "table"),
    ];

    for (rel, file_type) in candidates {
        let full = output_dir.join(rel);
        if full.exists() {
            upload_one(client, token, backend_url, task_id, &full, rel, file_type).await?;
        }
    }
    Ok(())
}

async fn upload_one(
    client: &reqwest::Client,
    token: &str,
    backend_url: &str,
    task_id: &str,
    local_path: &Path,
    relative_name: &str,
    file_type: &str,
) -> Result<(), String> {
    let bytes = tokio::fs::read(local_path).await.map_err(|e| e.to_string())?;

    let mime_type = match local_path.extension().and_then(|e| e.to_str()) {
        Some("html") => "text/html",
        Some("png")  => "image/png",
        Some("svg")  => "image/svg+xml",
        Some("csv")  => "text/csv",
        Some("json") => "application/json",
        _            => "application/octet-stream",
    };

    // Use the relative path as filename so the backend stores it under the correct subdir
    // (e.g. "figures/violin_qc.png" → saved as STORAGE_ROOT/…/figures/violin_qc.png)
    let part = reqwest::multipart::Part::bytes(bytes)
        .file_name(relative_name.to_string())
        .mime_str(mime_type)
        .map_err(|e| e.to_string())?;

    let form = reqwest::multipart::Form::new()
        .text("fileType", file_type.to_string())
        .part("file", part);

    let resp = client
        .post(format!("{}/tasks/{}/results", backend_url, task_id))
        .bearer_auth(token)
        .multipart(form)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Upload failed for '{relative_name}': {text}"));
    }

    Ok(())
}

/// Map nested config JSON (from the Web task form) to sclens CLI flags.
/// Each pipeline knows its own schema — unknown pipelines produce no extra args.
fn config_to_cli_args(pipeline: &str, args: &mut Vec<String>, config: &serde_json::Value) {
    let steps = config.get("steps");
    let params = config.get("params");

    match pipeline {
        "sc_standard_analysis" => {
            let qc    = steps.and_then(|s| s.get("qc"));
            let pre   = steps.and_then(|s| s.get("preprocess"));
            let dim   = steps.and_then(|s| s.get("dimensionReduction"));
            let clust = steps.and_then(|s| s.get("clustering"));
            let mark  = steps.and_then(|s| s.get("markers"));

            push_num_arg(args, "--min-genes",      qc,    "minGenes");
            push_num_arg(args, "--min-cells",      qc,    "minCells");
            push_num_arg(args, "--max-pct-mito",   qc,    "maxPercentMito");
            push_str_arg(args, "--mito-prefix",    qc,    "mitoGenePrefix");
            push_num_arg(args, "--n-top-genes",    pre,   "nTopGenes");
            push_num_arg(args, "--n-pcs",          dim,   "nPcs");
            push_num_arg(args, "--n-neighbors",    dim,   "nNeighbors");
            push_num_arg(args, "--resolution",     clust, "resolution");
            push_num_arg(args, "--n-marker-genes", mark,  "nGenes");
            push_num_arg(args, "--random-seed",    params,"randomSeed");
        }
        "sc_profile_basic" => {
            let qc = steps.and_then(|s| s.get("qc"));
            push_str_arg(args, "--mito-prefix", qc, "mitoGenePrefix");
        }
        _ => {}
    }
}

fn push_num_arg(args: &mut Vec<String>, flag: &str, obj: Option<&serde_json::Value>, key: &str) {
    if let Some(v) = obj.and_then(|o| o.get(key)) {
        let s = if let Some(n) = v.as_i64() {
            n.to_string()
        } else if let Some(n) = v.as_f64() {
            // Format floats without unnecessary trailing zeros
            let formatted = format!("{n}");
            if formatted.contains('.') { formatted } else { format!("{n}.0") }
        } else {
            return;
        };
        args.push(flag.to_string());
        args.push(s);
    }
}

fn push_str_arg(args: &mut Vec<String>, flag: &str, obj: Option<&serde_json::Value>, key: &str) {
    if let Some(s) = obj.and_then(|o| o.get(key)).and_then(|v| v.as_str()) {
        if !s.is_empty() {
            args.push(flag.to_string());
            args.push(s.to_string());
        }
    }
}
