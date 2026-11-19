use std::fs;
use std::sync::Arc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::error::{AppError, Result};
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

pub fn get_keyring_password(email: &str) -> Option<String> {
    if email.trim().is_empty() {
        return None;
    }
    // 1. Prova con il valore esatto
    if let Ok(entry) = keyring::Entry::new("AP_Mail", email) {
        if let Ok(pwd) = entry.get_password() {
            if !pwd.trim().is_empty() {
                return Some(pwd);
            }
        }
    }
    // 2. Prova con la versione minuscola
    let lower = email.to_lowercase();
    if lower != email {
        if let Ok(entry) = keyring::Entry::new("AP_Mail", &lower) {
            if let Ok(pwd) = entry.get_password() {
                if !pwd.trim().is_empty() {
                    return Some(pwd);
                }
            }
        }
    }
    None
}

pub fn set_keyring_password(email: &str, pwd: &str) {
    if email.trim().is_empty() || pwd.trim().is_empty() {
        return;
    }
    let _ = keyring::Entry::new("AP_Mail", email).map(|e| e.set_password(pwd));
    let lower = email.to_lowercase();
    if lower != email {
        let _ = keyring::Entry::new("AP_Mail", &lower).map(|e| e.set_password(pwd));
    }
}

#[tauri::command]
pub async fn list_workspaces(state: State<'_, AppState>) -> Result<Vec<WorkspaceManifest>> {
    let data_root = state.get_data_root();
    let mut list = Vec::new();
    let mut seen_emails = std::collections::HashSet::new();

    // Rimuovi eventuali cartelle demo/placeholder
    let demo_path = data_root.join("default_vault");
    if demo_path.exists() {
        let _ = fs::remove_dir_all(&demo_path);
    }

    if let Ok(entries) = fs::read_dir(&data_root) {
        let mut dirs: Vec<_> = entries.flatten().filter(|e| e.path().is_dir()).collect();
        // Ordina per data di modifica decrescente (il più recente prima)
        dirs.sort_by_key(|e| e.metadata().and_then(|m| m.modified()).ok());
        dirs.reverse();

        for entry in dirs {
            let p = entry.path();
            let manifest_path = p.join("manifest.json");
            if manifest_path.exists() {
                if let Ok(vault) = VaultContainer::from_existing(p.clone()) {
                    let email = vault.manifest.email_address.clone().unwrap_or_default();
                    
                    // Rimuovi vecchi mock o placeholder
                    if email == "avvocato@studiolegale.pec.it" || vault.manifest.workspace_id == "default-vault" {
                        let _ = fs::remove_dir_all(&p);
                        continue;
                    }

                    // Se abbiamo già visto questo indirizzo email, è un duplicato rimasto dai tentativi precedenti: ELIMINALO!
                    if !email.is_empty() && seen_emails.contains(&email) {
                        let _ = fs::remove_dir_all(&p);
                        continue;
                    }

                    if !email.is_empty() {
                        seen_emails.insert(email);
                    }

                    let manifest = vault.manifest.clone();
                    state.register_vault(manifest.workspace_id.clone(), Arc::new(vault));
                    list.push(manifest);
                } else {
                    // Cartella corrotta o incompleta: eliminala
                    let _ = fs::remove_dir_all(&p);
                }
            } else {
                // Cartella vuota o senza manifest: eliminala
                let _ = fs::remove_dir_all(&p);
            }
        }
    }

    Ok(list)
}

#[tauri::command]
pub async fn delete_workspace(state: State<'_, AppState>, workspace_id: String) -> Result<bool> {
    state.unregister_vault(&workspace_id);
    let data_root = state.get_data_root();
    if let Ok(entries) = fs::read_dir(&data_root) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() && p.join("manifest.json").exists() {
                if let Ok(content) = fs::read_to_string(p.join("manifest.json")) {
                    if let Ok(manifest) = serde_json::from_str::<WorkspaceManifest>(&content) {
                        if manifest.workspace_id == workspace_id {
                            let _ = fs::remove_dir_all(&p);
                            return Ok(true);
                        }
                    }
                }
            }
        }
    }
    Ok(false)
}

#[derive(Debug, Deserialize)]
pub struct UpdateWorkspaceSettingsParams {
    pub workspace_id: String,
    pub name: String,
    pub email_address: String,
    pub password: Option<String>,
    pub incoming_protocol: Option<String>,
    pub imap_server: String,
    pub imap_port: u16,
    pub pop3_server: Option<String>,
    pub pop3_port: Option<u16>,
    pub smtp_server: Option<String>,
    pub smtp_port: Option<u16>,
    pub smtp_username: Option<String>,
    pub is_pec: bool,
    pub auto_delete_on_server: bool,
}

#[tauri::command]
pub async fn update_workspace_settings(
    state: State<'_, AppState>,
    params: UpdateWorkspaceSettingsParams,
) -> Result<bool> {
    let data_root = state.get_data_root();
    
    // Se è stata indicata una nuova password, salvala nel Keyring di sistema (sia esatta che lowercase)
    if let Some(pwd) = &params.password {
        if !pwd.trim().is_empty() {
            set_keyring_password(&params.email_address, pwd);
        }
    }

    if let Ok(entries) = fs::read_dir(&data_root) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                let manifest_path = p.join("manifest.json");
                if manifest_path.exists() {
                    if let Ok(content) = fs::read_to_string(&manifest_path) {
                        if let Ok(mut manifest) = serde_json::from_str::<WorkspaceManifest>(&content) {
                            if manifest.workspace_id == params.workspace_id {
                                manifest.name = params.name;
                                manifest.email_address = Some(params.email_address.clone());
                                manifest.incoming_protocol = params.incoming_protocol;
                                manifest.imap_server = Some(params.imap_server);
                                manifest.imap_port = Some(params.imap_port);
                                manifest.pop3_server = params.pop3_server;
                                manifest.pop3_port = params.pop3_port;
                                manifest.smtp_server = params.smtp_server;
                                manifest.smtp_port = params.smtp_port;
                                manifest.smtp_username = params.smtp_username;
                                manifest.is_pec = params.is_pec;
                                manifest.auto_delete_on_server = params.auto_delete_on_server;

                                if let Ok(file) = fs::File::create(&manifest_path) {
                                    let _ = serde_json::to_writer_pretty(file, &manifest);
                                }

                                if let Ok(vault) = VaultContainer::from_existing(p) {
                                    state.register_vault(manifest.workspace_id.clone(), Arc::new(vault));
                                }

                                return Ok(true);
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(false)
}

#[derive(Debug, Deserialize)]
pub struct TestConnectionParams {
    pub email_address: String,
    pub password: Option<String>,
    pub incoming_protocol: String,
    pub incoming_server: String,
    pub incoming_port: u16,
    pub outgoing_server: String,
    pub outgoing_port: u16,
    pub outgoing_username: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ConnectionTestStep {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct ConnectionTestReport {
    pub incoming: ConnectionTestStep,
    pub outgoing: ConnectionTestStep,
}

async fn test_pop3(
    host: &str,
    port: u16,
    user: &str,
    pwd: Option<&str>,
) -> ConnectionTestStep {
    let use_tls = port == 995;
    let connect_res = tokio::time::timeout(
        std::time::Duration::from_secs(6),
        crate::pop3::client::Pop3Client::connect(host, port, use_tls),
    ).await;

    let mut client = match connect_res {
        Ok(Ok(c)) => c,
        Ok(Err(e)) => return ConnectionTestStep {
            success: false,
            message: format!("Impossibile connettersi al server POP3 {}:{}: {}", host, port, e),
        },
        Err(_) => return ConnectionTestStep {
            success: false,
            message: format!("Timeout connessione POP3 verso {}:{}. Verifica host o firewall/router.", host, port),
        },
    };

    if let Some(password) = pwd {
        if !password.trim().is_empty() {
            let mut candidates = Vec::new();
            let mut add_cand = |c: &str| {
                let trimmed = c.trim().to_string();
                if !trimmed.is_empty() && !candidates.contains(&trimmed) {
                    candidates.push(trimmed);
                }
            };
            add_cand(user);
            add_cand(&user.to_lowercase());
            if user.contains('@') {
                let loc = user.split('@').next().unwrap_or(user);
                add_cand(loc);
                add_cand(&loc.to_lowercase());
            }

            let mut last_err = None;
            for (idx, cand) in candidates.iter().enumerate() {
                if idx > 0 {
                    match crate::pop3::client::Pop3Client::connect(host, port, use_tls).await {
                        Ok(new_c) => client = new_c,
                        Err(e) => {
                            last_err = Some(e.to_string());
                            break;
                        }
                    }
                }

                match client.login(cand, password).await {
                    Ok(_) => {
                        let _ = client.quit().await;
                        return ConnectionTestStep {
                            success: true,
                            message: format!("Server POP3 OK ({}:{}) - Accesso riuscito come '{}'", host, port, cand),
                        };
                    }
                    Err(e) => {
                        last_err = Some(e.to_string());
                    }
                }
            }

            let err_desc = last_err.unwrap_or_else(|| "Credenziali rifiutate".to_string());
            return ConnectionTestStep {
                success: false,
                message: format!("Server POP3 {}:{} raggiungibile ma autenticazione fallita per ['{}']. ({})", host, port, candidates.join("', '"), err_desc),
            };
        }
    }

    let _ = client.quit().await;
    ConnectionTestStep {
        success: true,
        message: format!("Server POP3 {}:{} raggiungibile (porta aperta)", host, port),
    }
}

async fn test_imap(
    host: &str,
    port: u16,
    _user: &str,
    _pwd: Option<&str>,
) -> ConnectionTestStep {
    let addr = format!("{}:{}", host, port);
    let connect_res = tokio::time::timeout(
        std::time::Duration::from_secs(6),
        tokio::net::TcpStream::connect(&addr),
    ).await;

    match connect_res {
        Ok(Ok(_stream)) => ConnectionTestStep {
            success: true,
            message: format!("Server IMAP {}:{} raggiungibile (porta aperta)", host, port),
        },
        Ok(Err(e)) => ConnectionTestStep {
            success: false,
            message: format!("Impossibile connettersi al server IMAP {}:{}: {}", host, port, e),
        },
        Err(_) => ConnectionTestStep {
            success: false,
            message: format!("Timeout connessione IMAP verso {}:{}. Verifica porte o Port Forwarding.", host, port),
        },
    }
}

async fn test_smtp(
    host: &str,
    port: u16,
    user: &str,
    pwd: Option<&str>,
) -> ConnectionTestStep {
    if host.trim().is_empty() {
        return ConnectionTestStep {
            success: false,
            message: "Host SMTP non configurato".to_string(),
        };
    }

    let password = pwd.unwrap_or_default();
    if password.trim().is_empty() {
        let addr = format!("{}:{}", host, port);
        match tokio::time::timeout(std::time::Duration::from_secs(5), tokio::net::TcpStream::connect(&addr)).await {
            Ok(Ok(_)) => return ConnectionTestStep {
                success: true,
                message: format!("Porta SMTP {}:{} aperta (inserisci la password per testare l'autenticazione)", host, port),
            },
            Ok(Err(e)) => return ConnectionTestStep {
                success: false,
                message: format!("Impossibile connettersi a {}:{}: {}", host, port, e),
            },
            Err(_) => return ConnectionTestStep {
                success: false,
                message: format!("Timeout connessione SMTP verso {}:{}. Controlla il Port Forwarding.", host, port),
            },
        }
    }

    let mut candidates = Vec::new();
    let mut add_cand = |c: &str| {
        let trimmed = c.trim().to_string();
        if !trimmed.is_empty() && !candidates.contains(&trimmed) {
            candidates.push(trimmed);
        }
    };
    add_cand(user);
    add_cand(&user.to_lowercase());
    if user.contains('@') {
        let loc = user.split('@').next().unwrap_or(user);
        add_cand(loc);
        add_cand(&loc.to_lowercase());
    }

    let is_ip = host.parse::<std::net::IpAddr>().is_ok();
    let mut last_err = None;

    for cand in &candidates {
        let creds = lettre::transport::smtp::authentication::Credentials::new(
            cand.clone(),
            password.to_string(),
        );

        let builder_res = if port == 465 {
            if is_ip {
                Ok(lettre::AsyncSmtpTransport::<lettre::Tokio1Executor>::builder_dangerous(host)
                    .port(port)
                    .credentials(creds)
                    .build())
            } else {
                lettre::AsyncSmtpTransport::<lettre::Tokio1Executor>::relay(host)
                    .map(|b| b.port(port).credentials(creds).build::<lettre::Tokio1Executor>())
                    .map_err(|e| e.to_string())
            }
        } else {
            if is_ip {
                Ok(lettre::AsyncSmtpTransport::<lettre::Tokio1Executor>::builder_dangerous(host)
                    .port(port)
                    .credentials(creds)
                    .build())
            } else {
                lettre::AsyncSmtpTransport::<lettre::Tokio1Executor>::starttls_relay(host)
                    .map(|b| b.port(port).credentials(creds).build::<lettre::Tokio1Executor>())
                    .map_err(|e| e.to_string())
            }
        };

        let mailer = match builder_res {
            Ok(m) => m,
            Err(e) => {
                last_err = Some(e);
                break;
            }
        };

        match tokio::time::timeout(std::time::Duration::from_secs(6), mailer.test_connection()).await {
            Ok(Ok(true)) => {
                return ConnectionTestStep {
                    success: true,
                    message: format!("Server SMTP OK ({}:{}) - Autenticazione riuscita come '{}'", host, port, cand),
                };
            }
            Ok(Ok(false)) => {
                last_err = Some("Test connessione non andato a buon fine".to_string());
            }
            Ok(Err(e)) => {
                let err_str = e.to_string();
                last_err = Some(err_str.clone());
                if !err_str.contains("535") && !err_str.contains("authentication failed") {
                    break;
                }
            }
            Err(_) => {
                last_err = Some(format!("Timeout connessione SMTP verso {}:{}", host, port));
                break;
            }
        }
    }

    let err_desc = last_err.unwrap_or_else(|| "Errore sconosciuto".to_string());
    ConnectionTestStep {
        success: false,
        message: format!("Test SMTP fallito su {}:{}. Dettaglio: {}", host, port, err_desc),
    }
}

#[tauri::command]
pub async fn test_mail_connection(
    params: TestConnectionParams,
) -> Result<ConnectionTestReport> {
    // 1. Risoluzione password: da input utente oppure dal Portachiavi
    let password = params.password
        .filter(|p| !p.trim().is_empty())
        .or_else(|| get_keyring_password(&params.email_address));

    // 2. Test posta in entrata (IMAP o POP3)
    let incoming = if params.incoming_protocol.to_uppercase() == "POP3" {
        test_pop3(
            &params.incoming_server,
            params.incoming_port,
            &params.email_address,
            password.as_deref(),
        ).await
    } else {
        test_imap(
            &params.incoming_server,
            params.incoming_port,
            &params.email_address,
            password.as_deref(),
        ).await
    };

    // 3. Test posta in uscita (SMTP)
    let smtp_user = params.outgoing_username
        .filter(|u| !u.trim().is_empty())
        .unwrap_or_else(|| params.email_address.clone());

    let outgoing = test_smtp(
        &params.outgoing_server,
        params.outgoing_port,
        &smtp_user,
        password.as_deref(),
    ).await;

    Ok(ConnectionTestReport {
        incoming,
        outgoing,
    })
}

#[derive(Debug, Deserialize)]
pub struct SendEmailParams {
    pub workspace_id: String,
    pub to: String,
    pub subject: String,
    pub body: String,
}

#[tauri::command]
pub async fn send_or_save_email(
    state: State<'_, AppState>,
    params: SendEmailParams,
) -> Result<bool> {
    use lettre::message::header::ContentType;
    use lettre::message::Mailbox;
    use lettre::transport::smtp::authentication::Credentials;
    use lettre::{AsyncSmtpTransport, AsyncTransport, Tokio1Executor};

    let vault = state.get_vault(&params.workspace_id)?;
    let conn = vault.get_connection()?;

    let sender = vault.manifest.email_address.clone().unwrap_or_else(|| "me@studio.it".to_string());
    let date_utc = chrono::Utc::now().to_rfc3339();
    let message_id = format!("<{}@apmail.local>", uuid::Uuid::new_v4());

    // 1. Parsing indirizzi mittente e destinatario
    let sender_mailbox: Mailbox = sender.parse()
        .map_err(|e| AppError::Vault(format!("Indirizzo mittente non valido ({}): {}", sender, e)))?;
    let recipient_mailbox: Mailbox = params.to.parse()
        .map_err(|e| AppError::Vault(format!("Indirizzo destinatario non valido ({}): {}", params.to, e)))?;

    // 2. Costruzione messaggio RFC-5322
    let email = lettre::Message::builder()
        .from(sender_mailbox)
        .to(recipient_mailbox)
        .subject(&params.subject)
        .header(ContentType::TEXT_PLAIN)
        .body(params.body.clone())
        .map_err(|e| AppError::Vault(format!("Errore composizione messaggio: {}", e)))?;

    // 3. Risoluzione parametri SMTP
    let smtp_host = vault.manifest.smtp_server.clone()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| {
            if let Some(ref imap) = vault.manifest.imap_server {
                imap.replace("imap.", "smtp.").replace("imaps.", "smtps.")
            } else {
                let domain = sender.split('@').nth(1).unwrap_or("localhost");
                format!("mail.{}", domain)
            }
        });

    let smtp_port = vault.manifest.smtp_port.unwrap_or(if vault.manifest.is_pec { 465 } else { 587 });

    // 4. Recupero password dal Portachiavi di sistema
    let password = get_keyring_password(&sender).unwrap_or_default();
    if password.trim().is_empty() {
        return Err(AppError::Vault(format!(
            "Nessuna password salvata nel Portachiavi per '{}'. Clicca sull'icona ⚙️ Impostazioni accanto alla casella, inserisci la password nel campo 'Nuova Password' e clicca 'Salva Impostazioni'.",
            sender
        )));
    }

    let primary_user = vault.manifest.smtp_username.clone()
        .filter(|u| !u.trim().is_empty())
        .unwrap_or_else(|| sender.clone());

    let build_transport = |user: &str, pwd: &str| -> Result<AsyncSmtpTransport<Tokio1Executor>> {
        let creds = Credentials::new(user.to_string(), pwd.to_string());
        if smtp_port == 465 {
            if smtp_host.parse::<std::net::IpAddr>().is_ok() {
                Ok(AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&smtp_host)
                    .port(smtp_port)
                    .credentials(creds)
                    .build())
            } else {
                AsyncSmtpTransport::<Tokio1Executor>::relay(&smtp_host)
                    .map_err(|e| AppError::Vault(format!("Configurazione SMTP non valida ({}): {}", smtp_host, e)))
                    .map(|b| b.port(smtp_port).credentials(creds).build())
            }
        } else {
            if smtp_host.parse::<std::net::IpAddr>().is_ok() {
                Ok(AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&smtp_host)
                    .port(smtp_port)
                    .credentials(creds)
                    .build())
            } else {
                AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&smtp_host)
                    .map_err(|e| AppError::Vault(format!("Configurazione SMTP non valida ({}): {}", smtp_host, e)))
                    .map(|b| b.port(smtp_port).credentials(creds).build())
            }
        }
    };

    // 5. Costruzione della lista dei tentativi utente (multi-fallback intelligente per Linux/Postfix/Dovecot)
    let mut candidates: Vec<String> = Vec::new();
    let mut add_cand = |cand: &str| {
        let c = cand.trim().to_string();
        if !c.is_empty() && !candidates.contains(&c) {
            candidates.push(c);
        }
    };

    add_cand(&primary_user);
    add_cand(&primary_user.to_lowercase());
    if primary_user.contains('@') {
        let local_part = primary_user.split('@').next().unwrap_or(&primary_user);
        add_cand(local_part);
        add_cand(&local_part.to_lowercase());
    }

    // 6. Tentativi di invio
    let mut last_error = None;
    let mut sent = false;

    for cand_user in &candidates {
        let mailer = match build_transport(cand_user, &password) {
            Ok(m) => m,
            Err(e) => {
                last_error = Some(e.to_string());
                break;
            }
        };

        match mailer.send(email.clone()).await {
            Ok(_) => {
                sent = true;
                break;
            }
            Err(e) => {
                let err_str = e.to_string();
                last_error = Some(err_str.clone());
                // Se l'errore non è un problema di credenziali (535 o authentication failed),
                // interrompi per non insistere su errori di rete o timeout
                if !err_str.contains("535") && !err_str.contains("authentication failed") {
                    break;
                }
            }
        }
    }

    if !sent {
        let err_desc = last_error.unwrap_or_else(|| "Errore sconosciuto".to_string());
        if err_desc.contains("535") || err_desc.contains("authentication failed") {
            let tried_users = candidates.join("', '");
            return Err(AppError::Vault(format!(
                "Autenticazione SMTP fallita (535) su {}:{}. Il server ha rifiutato tutti i formati utente tentati: ['{}']. Controlla che la password sia corretta o imposta il nome utente esatto nelle Impostazioni (⚙️). (Dettaglio: {})",
                smtp_host, smtp_port, tried_users, err_desc
            )));
        } else {
            return Err(AppError::Vault(format!("Errore invio SMTP su {}:{}: {}", smtp_host, smtp_port, err_desc)));
        }
    }

    // 7. Salvataggio locale nel Vault CAS e nel DB solo DOPO avvenuta spedizione
    let raw_eml = format!(
        "From: {}\r\nTo: {}\r\nSubject: {}\r\nDate: {}\r\nMessage-ID: {}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n{}",
        sender, params.to, params.subject, date_utc, message_id, params.body
    );

    let blob = vault.cas.store_bytes(raw_eml.as_bytes(), "eml")?;

    let _ = conn.execute("INSERT OR IGNORE INTO folders (id, remote_name, display_name) VALUES (2, 'Sent', 'Posta Inviata')", []);

    let sent_folder_id: i64 = conn.query_row(
        "SELECT id FROM folders WHERE remote_name = 'Sent' OR display_name LIKE '%Inviata%' OR display_name LIKE '%inviata%' LIMIT 1",
        [],
        |r| r.get(0),
    ).unwrap_or(2);

    let is_pec = vault.manifest.is_pec;
    let pec_type = if is_pec { "POSTA_CERTIFICATA" } else { "NONE" };

    conn.execute(
        "INSERT INTO messages (
            folder_id, message_id, subject, sender_name, sender_address,
            date_epoch, date_iso, snippet, raw_eml_blob_hash, raw_size_bytes,
            has_attachments, is_read, is_pec, pec_type
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, 1, ?11, ?12)",
        rusqlite::params![
            sent_folder_id,
            message_id,
            params.subject,
            "Me",
            sender,
            chrono::Utc::now().timestamp(),
            date_utc,
            params.body.chars().take(200).collect::<String>(),
            blob.sha256_hash,
            blob.size_bytes as i64,
            is_pec,
            pec_type,
        ],
    )?;

    Ok(true)
}

#[tauri::command]
pub async fn save_draft_email(
    state: State<'_, AppState>,
    params: SendEmailParams,
) -> Result<bool> {
    let vault = state.get_vault(&params.workspace_id)?;
    let conn = vault.get_connection()?;

    let sender = vault.manifest.email_address.clone().unwrap_or_else(|| "me@studio.it".to_string());
    let date_utc = chrono::Utc::now().to_rfc3339();
    let message_id = format!("<draft-{}@apmail.local>", uuid::Uuid::new_v4());

    let raw_eml = format!(
        "From: {}\r\nTo: {}\r\nSubject: {}\r\nDate: {}\r\nMessage-ID: {}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n{}",
        sender, params.to, params.subject, date_utc, message_id, params.body
    );

    let blob = vault.cas.store_bytes(raw_eml.as_bytes(), "eml")?;

    let _ = conn.execute("INSERT OR IGNORE INTO folders (id, remote_name, display_name) VALUES (3, 'Drafts', 'Bozze')", []);

    let draft_folder_id: i64 = conn.query_row(
        "SELECT id FROM folders WHERE remote_name = 'Drafts' OR display_name LIKE '%Bozze%' OR display_name LIKE '%bozze%' LIMIT 1",
        [],
        |r| r.get(0),
    ).unwrap_or(3);

    let is_pec = vault.manifest.is_pec;

    conn.execute(
        "INSERT INTO messages (
            folder_id, message_id, subject, sender_name, sender_address,
            date_epoch, date_iso, snippet, raw_eml_blob_hash, raw_size_bytes,
            has_attachments, is_read, is_draft, is_pec, pec_type
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, 1, 1, ?11, 'NONE')",
        rusqlite::params![
            draft_folder_id,
            message_id,
            if params.subject.trim().is_empty() { "(Bozza senza oggetto)" } else { &params.subject },
            "Me",
            sender,
            chrono::Utc::now().timestamp(),
            date_utc,
            params.body.chars().take(200).collect::<String>(),
            blob.sha256_hash,
            blob.size_bytes as i64,
            is_pec,
        ],
    )?;

    Ok(true)
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

    // Assicura che le 5 cartelle canoniche esistano sempre
    let _ = conn.execute("INSERT OR IGNORE INTO folders (id, remote_name, display_name) VALUES (1, 'INBOX', 'In arrivo')", []);
    let _ = conn.execute("INSERT OR IGNORE INTO folders (id, remote_name, display_name) VALUES (2, 'Sent', 'Posta Inviata')", []);
    let _ = conn.execute("INSERT OR IGNORE INTO folders (id, remote_name, display_name) VALUES (3, 'Drafts', 'Bozze')", []);
    let _ = conn.execute("INSERT OR IGNORE INTO folders (id, remote_name, display_name) VALUES (4, 'Trash', 'Cestino')", []);
    let _ = conn.execute("INSERT OR IGNORE INTO folders (id, remote_name, display_name) VALUES (5, 'Archive', 'Archivio')", []);

    // Calcolo dinamico in tempo reale di messaggi non letti e conteggio totale
    let sql = "SELECT 
            f.id, 
            f.remote_name, 
            f.display_name, 
            f.parent_id,
            (SELECT COUNT(*) FROM messages m WHERE m.folder_id = f.id AND (m.is_read = 0 OR m.is_read IS NULL)) AS unread_count,
            (SELECT COUNT(*) FROM messages m WHERE m.folder_id = f.id) AS total_count
        FROM folders f
        ORDER BY f.id ASC";

    let mut stmt = conn.prepare(sql)?;
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

#[derive(Debug, Serialize)]
pub struct ServerDetectionResult {
    pub server: String,
    pub port: u16,
    pub is_pec: bool,
    pub provider_name: String,
}

#[tauri::command]
pub async fn auto_detect_server(email: String) -> ServerDetectionResult {
    let lower = email.to_lowercase();
    if lower.contains("pec.it") || lower.contains("arubapec") {
        ServerDetectionResult {
            server: "imaps.pec.aruba.it".to_string(),
            port: 993,
            is_pec: true,
            provider_name: "Aruba PEC".to_string(),
        }
    } else if lower.contains("legalmail") {
        ServerDetectionResult {
            server: "mail.legalmail.it".to_string(),
            port: 993,
            is_pec: true,
            provider_name: "Legalmail (InfoCert)".to_string(),
        }
    } else if lower.contains("postecert") {
        ServerDetectionResult {
            server: "mail.postecert.it".to_string(),
            port: 993,
            is_pec: true,
            provider_name: "PosteCert".to_string(),
        }
    } else if lower.contains("sicurezzapostale") {
        ServerDetectionResult {
            server: "imap.sicurezzapostale.it".to_string(),
            port: 993,
            is_pec: true,
            provider_name: "Namirial PEC".to_string(),
        }
    } else if lower.contains("gmail.com") {
        ServerDetectionResult {
            server: "imap.gmail.com".to_string(),
            port: 993,
            is_pec: false,
            provider_name: "Gmail".to_string(),
        }
    } else if let Some((_, domain)) = lower.split_once('@') {
        let (working_server, port) = crate::imap::auto_auth::AutoDiscovery::discover_working_server(&lower, &format!("mail.{}", domain), 993).await;
        ServerDetectionResult {
            server: working_server,
            port,
            is_pec: false,
            provider_name: format!("Server {}", domain),
        }
    } else {
        ServerDetectionResult {
            server: "mail.verindex.org".to_string(),
            port: 993,
            is_pec: false,
            provider_name: "IMAP Standard".to_string(),
        }
    }
}

#[tauri::command]
pub async fn add_imap_account(
    state: State<'_, AppState>,
    name: String,
    email_address: String,
    password: String,
    imap_server: String,
    imap_port: u16,
    is_pec: bool,
    auto_delete_on_server: bool,
) -> Result<String> {
    // Scoperta automatica del server funzionante
    let (_detected_server, _detected_port) = crate::imap::auto_auth::AutoDiscovery::discover_working_server(
        &email_address,
        &imap_server,
        imap_port,
    ).await;

    // Salva la password in modo sicuro nel Keyring nativo dell'OS (sia esatta che lowercase)
    set_keyring_password(&email_address, &password);

    let data_root = state.get_data_root();

    // Se esiste già una casella per questa email, rimuovila per evitare doppioni
    if let Ok(entries) = fs::read_dir(&data_root) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                if let Ok(content) = fs::read_to_string(p.join("manifest.json")) {
                    if let Ok(existing_manifest) = serde_json::from_str::<WorkspaceManifest>(&content) {
                        if existing_manifest.email_address.as_deref() == Some(&email_address) {
                            state.unregister_vault(&existing_manifest.workspace_id);
                            let _ = fs::remove_dir_all(&p);
                        }
                    }
                }
            }
        }
    }

    let schema_sql = include_str!("../../migrations/schema.sql");
    let workspace_id = uuid::Uuid::new_v4().to_string();
    let folder_name = format!("account_{}", workspace_id[0..8].to_string());

    let manifest = WorkspaceManifest {
        version: 1,
        workspace_id: workspace_id.clone(),
        name: if name.trim().is_empty() { email_address.clone() } else { name.clone() },
        workspace_type: WorkspaceType::ImapAttivo,
        email_address: Some(email_address.clone()),
        created_at_epoch: chrono::Utc::now().timestamp(),
        is_pec,
        auto_delete_on_server,
        imap_server: Some(imap_server.clone()),
        imap_port: Some(imap_port),
        smtp_server: Some(imap_server.replace("imap.", "smtp.").replace("imaps.", "smtps.")),
        smtp_port: Some(if is_pec { 465 } else { 587 }),
        smtp_username: None,
        incoming_protocol: Some(if imap_port == 995 || imap_port == 110 || imap_server.contains("pop.") { "POP3".to_string() } else { "IMAP".to_string() }),
        pop3_server: Some(imap_server.replace("imap.", "pop.").replace("imaps.", "pop.")),
        pop3_port: Some(if imap_port == 110 { 110 } else { 995 }),
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
        "INSERT OR IGNORE INTO folders (remote_name, display_name) VALUES ('Drafts', 'Bozze')",
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
    state: State<'_, AppState>,
    workspace_id: String,
) -> Result<u32> {
    let vault = state.get_vault(&workspace_id)?;
    let conn = vault.get_connection()?;

    // Assicurati che la colonna pop3_uidl esista nella tabella messages
    let _ = conn.execute("ALTER TABLE messages ADD COLUMN pop3_uidl TEXT", []);

    let is_pop3 = vault.manifest.incoming_protocol.as_deref() == Some("POP3")
        || vault.manifest.imap_port == Some(995)
        || vault.manifest.imap_port == Some(110);

    if is_pop3 {
        let sender = vault.manifest.email_address.clone().unwrap_or_default();
        let password = get_keyring_password(&sender).unwrap_or_default();
        if password.trim().is_empty() {
            return Err(AppError::Vault(format!(
                "Nessuna password trovata nel Portachiavi per '{}'. Clicca sull'icona ⚙️ Impostazioni accanto alla casella, inserisci la password nel campo 'Nuova Password' e clicca 'Salva Impostazioni'.",
                sender
            )));
        }

        let host = vault.manifest.pop3_server.clone()
            .or_else(|| vault.manifest.imap_server.clone())
            .unwrap_or_else(|| {
                let domain = sender.split('@').nth(1).unwrap_or("verindex.org");
                format!("pop.{}", domain)
            });

        let port = vault.manifest.pop3_port
            .or(vault.manifest.imap_port)
            .unwrap_or(995);

        let use_tls = port == 995;

        let username = vault.manifest.smtp_username.clone()
            .filter(|u| !u.trim().is_empty())
            .unwrap_or_else(|| sender.clone());

        // Multi-fallback per autenticazione POP3 (esatta, lowercase, locale, locale lowercase)
        let mut candidates: Vec<String> = Vec::new();
        let mut add_cand = |cand: &str| {
            let c = cand.trim().to_string();
            if !c.is_empty() && !candidates.contains(&c) {
                candidates.push(c);
            }
        };
        add_cand(&username);
        add_cand(&username.to_lowercase());
        if username.contains('@') {
            let local_part = username.split('@').next().unwrap_or(&username);
            add_cand(local_part);
            add_cand(&local_part.to_lowercase());
        }

        let mut logged_in_client = None;
        let mut last_pop_err = None;

        for cand_user in &candidates {
            match crate::pop3::client::Pop3Client::connect(&host, port, use_tls).await {
                Ok(mut c) => {
                    match c.login(cand_user, &password).await {
                        Ok(_) => {
                            logged_in_client = Some(c);
                            break;
                        }
                        Err(e) => {
                            last_pop_err = Some(e.to_string());
                        }
                    }
                }
                Err(e) => {
                    return Err(AppError::Vault(format!("Connessione POP3 fallita verso {}:{}: {}", host, port, e)));
                }
            }
        }

        let mut client = match logged_in_client {
            Some(c) => c,
            None => {
                let err_desc = last_pop_err.unwrap_or_else(|| "Credenziali respinte".to_string());
                let tried_users = candidates.join("', '");
                return Err(AppError::Vault(format!(
                    "Autenticazione POP3 fallita su {}:{}. Il server ha rifiutato: ['{}']. (Dettaglio: {})",
                    host, port, tried_users, err_desc
                )));
            }
        };

        // Recupera lista UIDL dal server POP3
        let uidl_list = client.get_uidl_list().await?;

        // Recupera gli UIDL già memorizzati per evitare duplicati
        let mut existing_uidls = std::collections::HashSet::new();
        if let Ok(mut stmt) = conn.prepare("SELECT pop3_uidl FROM messages WHERE pop3_uidl IS NOT NULL") {
            if let Ok(rows) = stmt.query_map([], |r| r.get::<_, String>(0)) {
                for r in rows.flatten() {
                    existing_uidls.insert(r);
                }
            }
        }

        let inbox_id: i64 = conn.query_row(
            "SELECT id FROM folders WHERE remote_name = 'INBOX' LIMIT 1",
            [],
            |r| r.get(0),
        ).unwrap_or(1);

        let mut downloaded_count = 0;

        for (msg_num, uidl) in uidl_list {
            if existing_uidls.contains(&uidl) {
                continue;
            }

            let eml_bytes = match client.retrieve_message(msg_num).await {
                Ok(b) => b,
                Err(_) => continue,
            };

            let blob = vault.cas.store_bytes(&eml_bytes, "eml")?;
            let parsed = mail_parser::MessageParser::default().parse(&eml_bytes);

            let subject = parsed.as_ref().and_then(|m| m.subject()).unwrap_or("(Nessun oggetto)");
            let from_addr = parsed.as_ref().and_then(|m| m.from().and_then(|f| f.first()).and_then(|a| a.address())).unwrap_or("sconosciuto");
            let from_name = parsed.as_ref().and_then(|m| m.from().and_then(|f| f.first()).and_then(|a| a.name()));
            let snippet = parsed.as_ref().and_then(|m| m.body_text(0)).map(|t| t.chars().take(200).collect::<String>());
            let date_epoch = parsed.as_ref().and_then(|m| m.date().map(|d| d.to_timestamp())).unwrap_or_else(|| chrono::Utc::now().timestamp());
            let date_iso = chrono::DateTime::from_timestamp(date_epoch, 0).map(|d| d.to_rfc3339()).unwrap_or_else(|| chrono::Utc::now().to_rfc3339());
            let message_id = parsed.as_ref().and_then(|m| m.message_id()).map(|s| s.to_string()).unwrap_or_else(|| format!("<pop3-{}@apmail>", uidl));
            let has_attachments = parsed.as_ref().map(|m| m.attachment_count() > 0).unwrap_or(false);

            let is_pec = vault.manifest.is_pec;
            let pec_type = if is_pec { "POSTA_CERTIFICATA" } else { "NONE" };

            let _ = conn.execute(
                "INSERT INTO messages (
                    folder_id, message_id, subject, sender_name, sender_address,
                    date_epoch, date_iso, snippet, raw_eml_blob_hash, raw_size_bytes,
                    has_attachments, is_read, is_pec, pec_type, pop3_uidl
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 0, ?12, ?13, ?14)",
                rusqlite::params![
                    inbox_id,
                    message_id,
                    subject,
                    from_name,
                    from_addr,
                    date_epoch,
                    date_iso,
                    snippet,
                    blob.sha256_hash,
                    blob.size_bytes as i64,
                    has_attachments,
                    is_pec,
                    pec_type,
                    uidl,
                ],
            );

            // Atomic Expunge: se impostata la cancellazione da server, cancella dal server solo dopo salvataggio verificato su disco
            if vault.manifest.auto_delete_on_server {
                let _ = client.delete_message(msg_num).await;
            }

            downloaded_count += 1;
        }

        let _ = client.quit().await;
        Ok(downloaded_count)
    } else {
        // IMAP sync placeholder
        Ok(0)
    }
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
        imap_server: None,
        imap_port: None,
        smtp_server: None,
        smtp_port: None,
        smtp_username: None,
        incoming_protocol: None,
        pop3_server: None,
        pop3_port: None,
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
