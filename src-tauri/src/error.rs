use serde::{Serialize, Serializer};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("I/O Error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Database Error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("JSON Serialization Error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Vault Error: {0}")]
    Vault(String),

    #[error("Workspace non trovato: {0}")]
    WorkspaceNotFound(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
