use tauri::State;
use crate::store::SharedState;
use crate::{python_probe, system_probe};

#[tauri::command]
pub async fn upload_profile(state: State<'_, SharedState>) -> Result<(), String> {
    let (runner_id, token, backend_url) = {
        let s = state.lock().unwrap();
        let token = s.runner_access_token.clone().ok_or("Not paired")?;
        (s.runner_id.clone(), token, s.backend_url.clone())
    };

    let sys = system_probe::probe();
    let envs = python_probe::probe_envs();

    let body = serde_json::json!({
        "hostname": sys.hostname,
        "os": sys.os,
        "arch": sys.arch,
        "cpuInfo": sys.cpu_info,
        "memoryInfo": sys.memory_info,
        "diskInfo": sys.disk_info,
        "gpuInfo": sys.gpu_info,
        "pythonEnvs": envs,
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/runners/{}/profile", backend_url, runner_id))
        .header("Authorization", format!("Bearer {}", token))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Backend error: {text}"));
    }

    Ok(())
}

#[tauri::command]
pub async fn send_heartbeat(state: State<'_, SharedState>) -> Result<(), String> {
    let (runner_id, token, backend_url) = {
        let s = state.lock().unwrap();
        let token = s.runner_access_token.clone().ok_or("Not paired")?;
        (s.runner_id.clone(), token, s.backend_url.clone())
    };

    let client = reqwest::Client::new();
    client
        .post(format!("{}/runners/{}/heartbeat", backend_url, runner_id))
        .header("Authorization", format!("Bearer {}", token))
        .json(&serde_json::json!({ "status": "online" }))
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn fetch_pending_tasks(state: State<'_, SharedState>) -> Result<serde_json::Value, String> {
    let (runner_id, token, backend_url) = {
        let s = state.lock().unwrap();
        let token = s.runner_access_token.clone().ok_or("Not paired")?;
        (s.runner_id.clone(), token, s.backend_url.clone())
    };

    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/runners/{}/tasks/pending", backend_url, runner_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Parse: {e}"))?;

    Ok(json.get("data").cloned().unwrap_or(serde_json::json!([])))
}

#[tauri::command]
pub async fn update_task_status(
    state: State<'_, SharedState>,
    task_id: String,
    status: String,
    progress: Option<u32>,
    current_stage: Option<String>,
    error_message: Option<String>,
) -> Result<(), String> {
    let (token, backend_url) = {
        let s = state.lock().unwrap();
        let token = s.runner_access_token.clone().ok_or("Not paired")?;
        (token, s.backend_url.clone())
    };

    let mut body = serde_json::json!({ "status": status });
    if let Some(p) = progress { body["progress"] = serde_json::json!(p); }
    if let Some(cs) = current_stage { body["currentStage"] = serde_json::json!(cs); }
    if let Some(em) = error_message { body["errorMessage"] = serde_json::json!(em); }

    let client = reqwest::Client::new();
    client
        .post(format!("{}/tasks/{}/status", backend_url, task_id))
        .header("Authorization", format!("Bearer {}", token))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    Ok(())
}
