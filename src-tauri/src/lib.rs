mod scanner;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![scanner::check_ip])
        .setup(|_app| {
            // Static frontend is loaded automatically from `frontendDist` (../out).
            // On Android / desktop Tauri the JS layer additionally calls our
            // `check_ip` command (src-tauri/src/scanner.rs) which performs
            // native TCP + HTTPS probes with custom SNI — this bypasses the
            // webview's TLS hostname validation that blocks direct-IP HTTPS.
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
