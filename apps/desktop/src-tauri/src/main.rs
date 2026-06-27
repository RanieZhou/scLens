#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod pairing;
mod python_probe;
mod store;
mod system_probe;

fn main() {
    tauri::Builder::default()
        .manage(store::init())
        .invoke_handler(tauri::generate_handler![
            commands::system::get_system_info,
            commands::system::get_python_envs,
            commands::system::get_runner_id,
            commands::system::get_backend_url,
            commands::system::set_backend_url,
            commands::pairing::create_pairing_session,
            commands::pairing::poll_pairing_status,
            commands::pairing::is_paired,
            commands::runner::upload_profile,
            commands::runner::send_heartbeat,
            commands::runner::fetch_pending_tasks,
            commands::runner::update_task_status,
            commands::pipeline::select_local_file,
            commands::pipeline::set_python_env,
            commands::pipeline::run_pipeline,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run scLens Runner");
}
