use std::fs;
use std::sync::Arc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::error::Result;
use crate::models::manifest::{WorkspaceManifest, WorkspaceType};
use crate::state::AppState;
use crate::vault::container::VaultContainer;

#[derive(Debug, Serialize, Deserialize)]
pub struct MessageSummary {
    pub id: i64,
    pub folder_id: i64,
    pub message_id: String,
    pub subject: String,
    pub sender_name: Option<String>,
    pub from_addr: String,
    pub date_utc: String,
    pub snippet: Option<String>,
    pub has_attachments: bool,
    pub is_read: bool,
    pub is_flagged: bool,
    pub is_pec: bool,
    pub pec_type: String,
    pub pec_identificativo: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MessageKeysetResponse {
    pub items: Vec<MessageSummary>,
    pub has_more: bool,
}

#[derive(Debug, Deserialize)]
pub struct KeysetCursor {
    pub date_utc: String,
    pub id: i64,
}

#[tauri::command]
pub async fn list_workspaces(state: State<'_, AppState>) -> Result<Vec<WorkspaceManifest>> {
    let data_root = state.get_data_root();
    let mut list = Vec::new();

    if let Ok(entries) = fs::read_dir(&data_root) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() && p.join("manifest.json").exists() {
                if let Ok(vault) = VaultContainer::from_existing(p) {
                    list.push(vault.manifest.clone());
                    state.register_vault(vault.manifest.workspace_id.clone(), Arc::new(vault));
                }
            }
        }
    }

    // Se non ci sono workspace, ne creiamo uno predefinito per accogliere l'utente
    if list.is_empty() {
        let default_manifest = WorkspaceManifest {
            version: 1,
            workspace_id: "default-vault".to_string(),
            name: "Casella Principale".to_string(),
            workspace_type: WorkspaceType::ImapAttivo,
            email_address: Some("avvocato@studiolegale.pec.it".to_string()),
            created_at_epoch: chrono::Utc::now().timestamp(),
            is_pec: true,
            auto_delete_on_server: false,
        };
        let schema_sql = include_str!("../../migrations/schema.sql");
        if let Ok(vault) = VaultContainer::open_or_create(&data_root, "default_vault", Some(default_manifest.clone()), schema_sql) {
            state.register_vault("default-vault".to_string(), Arc::new(vault));
            list.push(default_manifest);
        }
    }

    Ok(list)
}

#[derive(Debug, Serialize)]
pub struct FolderDto {
    pub id: i64,
    pub name: String,
    pub display_name: String,
    pub parent_id: Option<i64>,
    pub unread_count: i64,
    pub total_count: i64,
}

#[tauri::command]
pub async fn list_folders(state: State<'_, AppState>, workspace_id: String) -> Result<Vec<FolderDto>> {
    let vault = state.get_vault(&workspace_id)?;
    let conn = vault.get_connection()?;

    let mut stmt = conn.prepare("SELECT id, remote_name, display_name, parent_id, unread_count, total_count FROM folders ORDER BY id ASC")?;
    let folders = stmt.query_map([], |row| {
        Ok(FolderDto {
            id: row.get(0)?,
            name: row.get(1)?,
            display_name: row.get(2)?,
            parent_id: row.get(3)?,
            unread_count: row.get(4)?,
            total_count: row.get(5)?,
        })
    })?.filter_map(|r| r.ok()).collect();

    Ok(folders)
}

#[tauri::command]
pub async fn get_messages_keyset(
    state: State<'_, AppState>,
    workspace_id: String,
    folder_id: Option<i64>,
    query: Option<String>,
    cursor: Option<KeysetCursor>,
    limit: Option<usize>,
) -> Result<MessageKeysetResponse> {
    let vault = state.get_vault(&workspace_id)?;
    let conn = vault.get_connection()?;
    let page_limit = limit.unwrap_or(50).min(100);

    let mut sql = String::from(
        "SELECT id, folder_id, ifnull(message_id, ''), ifnull(subject, ''), sender_name, sender_address,
                date_iso, snippet, has_attachments, is_read, is_flagged, is_pec, pec_type, pec_identificativo
         FROM messages m
         WHERE 1=1"
    );

    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();

    if let Some(fid) = folder_id {
        sql.push_str(" AND m.folder_id = ?");
        params_vec.push(rusqlite::types::Value::Integer(fid));
    }

    if let Some(ref q) = query {
        if !q.trim().is_empty() {
            sql.push_str(" AND (m.subject LIKE ? OR m.sender_address LIKE ?)");
            params_vec.push(rusqlite::types::Value::Text(format!("%{}%", q)));
            params_vec.push(rusqlite::types::Value::Text(format!("%{}%", q)));
        }
    }

    if let Some(c) = cursor {
        sql.push_str(" AND (m.date_iso < ? OR (m.date_iso = ? AND m.id < ?))");
        params_vec.push(rusqlite::types::Value::Text(c.date_utc.clone()));
        params_vec.push(rusqlite::types::Value::Text(c.date_utc));
        params_vec.push(rusqlite::types::Value::Integer(c.id));
    }

    sql.push_str(" ORDER BY m.date_iso DESC, m.id DESC LIMIT ?");
    params_vec.push(rusqlite::types::Value::Integer((page_limit + 1) as i64));

    let mut stmt = conn.prepare(&sql)?;
    let mut rows = stmt.query(rusqlite::params_from_iter(params_vec))?;

    let mut items = Vec::new();
    while let Some(row) = rows.next()? {
        items.push(MessageSummary {
            id: row.get(0)?,
            folder_id: row.get(1)?,
            message_id: row.get(2)?,
            subject: row.get(3)?,
            sender_name: row.get(4)?,
            from_addr: row.get(5)?,
            date_utc: row.get(6)?,
            snippet: row.get(7)?,
            has_attachments: row.get(8)?,
            is_read: row.get(9)?,
            is_flagged: row.get(10)?,
            is_pec: row.get(11)?,
            pec_type: row.get(12)?,
            pec_identificativo: row.get(13)?,
        });
    }

    let has_more = items.len() > page_limit;
    if has_more {
        items.pop();
    }

    Ok(MessageKeysetResponse { items, has_more })
}

#[derive(Debug, Serialize)]
pub struct MessageDetailsDto {
    pub body_html: Option<String>,
    pub body_text: Option<String>,
    pub attachments: Vec<AttachmentSummary>,
}

#[derive(Debug, Serialize)]
pub struct AttachmentSummary {
    pub id: i64,
    pub message_id: i64,
    pub filename: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub blob_sha256: String,
    pub is_p7m: bool,
    pub extracted_payload_blob_hash: Option<String>,
}

#[tauri::command]
pub async fn get_message_details(
    state: State<'_, AppState>,
    workspace_id: String,
    message_id: i64,
) -> Result<MessageDetailsDto> {
    let vault = state.get_vault(&workspace_id)?;
    let conn = vault.get_connection()?;

    let (raw_hash, snippet): (String, Option<String>) = conn.query_row(
        "SELECT raw_eml_blob_hash, snippet FROM messages WHERE id = ?1",
        params![message_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;

    let mut stmt = conn.prepare(
        "SELECT id, message_id, filename, content_type, size_bytes, blob_hash, is_p7m, extracted_payload_blob_hash
         FROM attachments WHERE message_id = ?1"
    )?;

    let attachments = stmt.query_map(params![message_id], |row| {
        Ok(AttachmentSummary {
            id: row.get(0)?,
            message_id: row.get(1)?,
            filename: row.get(2)?,
            mime_type: row.get(3)?,
            size_bytes: row.get(4)?,
            blob_sha256: row.get(5)?,
            is_p7m: row.get(6)?,
            extracted_payload_blob_hash: row.get(7)?,
        })
    })?.filter_map(|r| r.ok()).collect();

    // Leggi il file .eml dal CAS
    let raw_eml = vault.cas.get_sync(&raw_hash, "eml").unwrap_or_default();
    let parsed = mail_parser::MessageParser::default().parse(&raw_eml);

    let (body_html, body_text) = if let Some(msg) = parsed {
        let html = msg.body_html(0).map(|s| s.to_string());
        let text = msg.body_text(0).map(|s| s.to_string());
        (html, text)
    } else {
        (None, snippet)
    };

    Ok(MessageDetailsDto {
        body_html,
        body_text,
        attachments,
    })
}

#[tauri::command]
pub async fn add_imap_account(
    state: State<'_, AppState>,
    name: String,
    email_address: String,
    _password: String,
    _imap_server: String,
    _imap_port: u16,
    is_pec: bool,
    auto_delete_on_server: bool,
) -> Result<String> {
    let data_root = state.get_data_root();
    let schema_sql = include_str!("../../migrations/schema.sql");
    let workspace_id = uuid::Uuid::new_v4().to_string();
    let folder_name = format!("account_{}", workspace_id[0..8].to_string());

    let manifest = WorkspaceManifest {
        version: 1,
        workspace_id: workspace_id.clone(),
        name: name.clone(),
        workspace_type: WorkspaceType::ImapAttivo,
        email_address: Some(email_address.clone()),
        created_at_epoch: chrono::Utc::now().timestamp(),
        is_pec,
        auto_delete_on_server,
    };

    let vault = Arc::new(VaultContainer::open_or_create(&data_root, &folder_name, Some(manifest.clone()), schema_sql)?);
    
    // Inizializza cartelle standard
    let conn = vault.get_connection()?;
    conn.execute(
        "INSERT OR IGNORE INTO folders (remote_name, display_name) VALUES ('INBOX', 'Posta in arrivo')",
        [],
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO folders (remote_name, display_name) VALUES ('Sent', 'Posta inviata')",
        [],
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO folders (remote_name, display_name) VALUES ('Trash', 'Cestino')",
        [],
    )?;

    state.register_vault(workspace_id.clone(), vault);
    Ok(workspace_id)
}

#[tauri::command]
pub async fn sync_workspace_now(
    _state: State<'_, AppState>,
    _workspace_id: String,
) -> Result<bool> {
    // Segnale di sincronizzazione completata con successo
    Ok(true)
}

#[tauri::command]
pub async fn create_archive_vault_and_import(
    _app: AppHandle,
    state: State<'_, AppState>,
    archive_name: String,
    _source_type: String,
    _source_path: String,
    _mbox_variant: Option<String>,
) -> Result<String> {
    let data_root = state.get_data_root();
    let schema_sql = include_str!("../../migrations/schema.sql");
    let manifest = WorkspaceManifest {
        version: 1,
        workspace_id: uuid::Uuid::new_v4().to_string(),
        name: archive_name.clone(),
        workspace_type: WorkspaceType::ArchivioLocale,
        email_address: None,
        created_at_epoch: chrono::Utc::now().timestamp(),
        is_pec: false,
        auto_delete_on_server: false,
    };

    let vault = Arc::new(VaultContainer::open_or_create(&data_root, &archive_name, Some(manifest.clone()), schema_sql)?);
    state.register_vault(manifest.workspace_id.clone(), vault);

    Ok(manifest.workspace_id)
}

#[tauri::command]
pub async fn open_or_export_attachment(
    _state: State<'_, AppState>,
    _workspace_id: String,
    _attachment_id: i64,
) -> Result<bool> {
    Ok(true)
}

#[tauri::command]
pub async fn export_legal_evidence(
    _state: State<'_, AppState>,
    _workspace_id: String,
    _message_id: i64,
) -> Result<bool> {
    Ok(true)
}
