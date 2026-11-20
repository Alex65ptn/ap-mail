pub mod error;
pub mod models;
pub mod vault;
pub mod pec;
pub mod imap;
pub mod pop3;
pub mod state;
pub mod commands;

use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use crate::state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 1. Inizializza il CryptoProvider predefinito per Rustls 0.23 (evita panic e SIGABRT)
    let _ = tokio_rustls::rustls::crypto::ring::default_provider().install_default();

    // 2. Panic hook per logging sicuro senza crash silenzioso
    std::panic::set_hook(Box::new(|info| {
        eprintln!("AP Mail Handled Panic: {:?}", info);
    }));

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
            commands::delete_workspace,
            commands::update_workspace_settings,
            commands::check_account_password_status,
            commands::get_account_password,
            commands::test_mail_connection,
            commands::send_or_save_email,
            commands::save_draft_email,
            commands::list_folders,
            commands::get_messages_keyset,
            commands::toggle_message_read_status,
            commands::get_message_details,
            commands::sync_workspace_now,
            commands::create_archive_vault_and_import,
            commands::open_or_export_attachment,
            commands::export_legal_evidence,
            commands::open_message_external,
            commands::open_message_in_new_window,
            commands::open_message_in_apple_mail,
            commands::export_message_eml,
            commands::get_vault_storage_info,
            commands::reveal_vault_in_finder,
            commands::scan_for_importable_mailboxes,
        ])
        .run(tauri::generate_context!())
        .expect("Errore durante l'esecuzione dell'applicazione AP Mail");
}
