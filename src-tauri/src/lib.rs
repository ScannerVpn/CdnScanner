use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|_app| {
            // Static frontend is loaded automatically from `frontendDist` (../out).
            // The client-side scanner inside the webview does all the work —
            // no Rust-side networking needed (browser fetch is enough).
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
