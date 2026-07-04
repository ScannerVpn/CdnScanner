use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|_app| {
            // For now, the app loads the dev URL or built static files
            // When packaged, it loads from the bundled out/ directory
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
