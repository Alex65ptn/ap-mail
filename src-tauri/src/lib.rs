pub mod error;
pub mod models;
pub mod vault;
pub mod pec;
pub mod imap;
pub mod state;
pub mod commands;

use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use crate::state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Cartella di archiviazione per i dati di AP Mail
            let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("./AP_Mail_Data"));
            fs::create_dir_all(&app_data_dir)?;
            
            let state = AppState::new(app_data_dir);
            app.manage(state);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_workspaces,
            commands::auto_detect_server,
            commands::add_imap_account,
            commands::list_folders,
            commands::get_messages_keyset,
            commands::get_message_details,
            commands::sync_workspace_now,
            commands::create_archive_vault_and_import,
            commands::open_or_export_attachment,
            commands::export_legal_evidence,
        ])
        .run(tauri::generate_context!())
        .expect("Errore durante l'esecuzione dell'applicazione AP Mail");
}
