use serde::Serialize;
use tauri::State;
use crate::pairing::{generate_nonce, generate_pair_code, hash_pair_code, hash_secret};
use crate::store::SharedState;

#[derive(Serialize)]
pub struct PairCodeInfo {
    pub pair_code: String,
    pub session_id: String,
    pub expires_in: u64,
}

#[tauri::command]
pub async fn create_pairing_session(
    state: State<'_, SharedState>,
) -> Result<PairCodeInfo, String> {
    let (runner_id, runner_secret, backend_url) = {
        let s = state.lock().unwrap();
        (s.runner_id.clone(), s.runner_secret.clone(), s.backend_url.clone())
    };

    let pair_code = generate_pair_code();
    let nonce = generate_nonce();
    let pair_code_hash = hash_pair_code(&pair_code, &nonce);
    let runner_secret_hash = hash_secret(&runner_secret);

    let body = serde_json::json!({
        "runnerId": runner_id,
        "pairCodeHash": pair_code_hash,
        "pairNonce": nonce,
        "runnerSecretHash": runner_secret_hash,
        "expiresIn": 600
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/runners/pairing-sessions", backend_url))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Backend error: {text}"));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| format!("Parse: {e}"))?;
    let session_id = json
        .get("data")
        .and_then(|d| d.get("pairingSessionId"))
        .and_then(|s| s.as_str())
        .ok_or("Missing pairingSessionId in response")?
        .to_string();

    Ok(PairCodeInfo { pair_code, session_id, expires_in: 600 })
}

#[derive(Serialize)]
pub struct PollResult {
    pub status: String,
    pub runner_access_token: Option<String>,
}

#[tauri::command]
pub async fn poll_pairing_status(
    state: State<'_, SharedState>,
    session_id: String,
) -> Result<PollResult, String> {
    let (runner_secret, backend_url) = {
        let s = state.lock().unwrap();
        (s.runner_secret.clone(), s.backend_url.clone())
    };

    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/runners/pairing-sessions/{}", backend_url, session_id))
        .header("x-runner-secret", &runner_secret)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    let json: serde_json::Value = resp.json().await.map_err(|e| format!("Parse: {e}"))?;
    let data = json.get("data").ok_or("No data")?;
    let status = data.get("status")
        .and_then(|s| s.as_str())
        .unwrap_or("UNKNOWN")
        .to_string();
    let token = data.get("runnerAccessToken")
        .and_then(|t| t.as_str())
        .map(|t| t.to_string());

    if let Some(ref t) = token {
        state.lock().unwrap().runner_access_token = Some(t.clone());
    }

    Ok(PollResult { status, runner_access_token: token })
}

#[tauri::command]
pub fn is_paired(state: State<SharedState>) -> bool {
    state.lock().unwrap().runner_access_token.is_some()
}
