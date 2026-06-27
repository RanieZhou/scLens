/// Minimal in-memory runner state.
/// In production this would persist to a local config file; for MVP we keep it in-process.
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;

pub struct RunnerState {
    pub runner_id: String,
    pub runner_secret: String,
    pub runner_access_token: Option<String>,
    pub backend_url: String,
    /// Full local path of the .h5ad file selected by the user — never sent to server.
    pub selected_file_path: Option<PathBuf>,
    /// envId of the selected Python env (e.g. "conda:scrna") — full path resolved in Rust.
    pub selected_env_id: Option<String>,
}

impl RunnerState {
    pub fn new() -> Self {
        RunnerState {
            runner_id: format!("runner_{}", Uuid::new_v4().simple()),
            runner_secret: hex::encode(rand::random::<[u8; 32]>()),
            runner_access_token: None,
            backend_url: "http://localhost:3001/api".to_string(),
            selected_file_path: None,
            selected_env_id: None,
        }
    }
}

pub type SharedState = Mutex<RunnerState>;

pub fn init() -> SharedState {
    Mutex::new(RunnerState::new())
}
