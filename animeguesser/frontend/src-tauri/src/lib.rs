use tauri::Manager;

// ── Commandes Tauri exposées au frontend JS ──────────────────────────────────

/// Retourne l'URL de base de l'API backend.
/// En desktop/mobile, l'URL du serveur est injectée à la compilation
/// via la variable d'environnement ANIMEGUESSER_API_URL.
/// Valeur par défaut : http://localhost:8080/api
#[tauri::command]
fn get_api_url() -> String {
    option_env!("ANIMEGUESSER_API_URL")
        .unwrap_or("http://localhost:8080/api")
        .to_string()
}

/// Retourne la version courante de l'application (lue depuis Cargo.toml).
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// ── Point d'entrée de la lib (partagé desktop + mobile) ──────────────────────
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_api_url,
            get_app_version,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Erreur au démarrage de l'application Tauri");
}
