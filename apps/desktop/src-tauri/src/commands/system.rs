use tauri::State;
use crate::store::SharedState;
use crate::{python_probe, system_probe};

#[tauri::command]
pub fn get_system_info() -> serde_json::Value {
    serde_json::to_value(system_probe::probe()).unwrap_or(serde_json::json!({}))
}

#[tauri::command]
pub fn get_python_envs() -> serde_json::Value {
    serde_json::to_value(python_probe::probe_envs()).unwrap_or(serde_json::json!([]))
}

#[tauri::command]
pub fn get_runner_id(state: State<SharedState>) -> String {
    state.lock().unwrap().runner_id.clone()
}

#[tauri::command]
pub fn get_backend_url(state: State<SharedState>) -> String {
    state.lock().unwrap().backend_url.clone()
}

#[tauri::command]
pub fn set_backend_url(state: State<SharedState>, url: String) {
    state.lock().unwrap().backend_url = url;
}
