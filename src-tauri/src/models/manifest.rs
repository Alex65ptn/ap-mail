use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WorkspaceType {
    ImapAttivo,
    ArchivioLocale,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceManifest {
    pub version: u32,
    pub workspace_id: String,
    pub name: String,
    pub workspace_type: WorkspaceType,
    pub email_address: Option<String>,
    pub created_at_epoch: i64,
    pub is_pec: bool,
    pub auto_delete_on_server: bool,
    
    #[serde(default)]
    pub imap_server: Option<String>,
    #[serde(default)]
    pub imap_port: Option<u16>,
    #[serde(default)]
    pub smtp_server: Option<String>,
    #[serde(default)]
    pub smtp_port: Option<u16>,
    #[serde(default)]
    pub smtp_username: Option<String>,
}
