use std::fs::{self, File};
use std::path::{Path, PathBuf};
use rusqlite::Connection;
use crate::error::{AppError, Result};
use crate::models::manifest::WorkspaceManifest;
use crate::vault::cas::ContentAddressableStorage;

pub struct VaultContainer {
    pub root_path: PathBuf,
    pub manifest: WorkspaceManifest,
    pub cas: ContentAddressableStorage,
}

impl VaultContainer {
    pub fn open_or_create(
        data_root: &Path,
        workspace_folder_name: &str,
        manifest_if_create: Option<WorkspaceManifest>,
        schema_sql: &str,
    ) -> Result<Self> {
        let vault_root = data_root.join(workspace_folder_name);
        fs::create_dir_all(&vault_root)?;

        let manifest_path = vault_root.join("manifest.json");
        let manifest = if manifest_path.exists() {
            let file = File::open(&manifest_path)?;
            serde_json::from_reader(file)?
        } else if let Some(init_manifest) = manifest_if_create {
            let file = File::create(&manifest_path)?;
            serde_json::to_writer_pretty(file, &init_manifest)?;
            init_manifest
        } else {
            return Err(AppError::Vault(
                "Il manifest.json non esiste e non sono stati forniti dati".into(),
            ));
        };

        let cas = ContentAddressableStorage::new(&vault_root)?;
        let db_path = vault_root.join("index.db");
        Self::init_database(&db_path, schema_sql)?;

        Ok(Self {
            root_path: vault_root,
            manifest,
            cas,
        })
    }

    pub fn from_existing(vault_root: PathBuf) -> Result<Self> {
        let manifest_path = vault_root.join("manifest.json");
        let file = File::open(&manifest_path)?;
        let manifest: WorkspaceManifest = serde_json::from_reader(file)?;
        let cas = ContentAddressableStorage::new(&vault_root)?;
        Ok(Self {
            root_path: vault_root,
            manifest,
            cas,
        })
    }

    fn init_database(db_path: &Path, schema_sql: &str) -> Result<()> {
        let conn = Connection::open(db_path)?;
        let _: String = conn.query_row("PRAGMA journal_mode = WAL", [], |r| r.get(0))?;
        conn.execute_batch(
            "
            PRAGMA synchronous = FULL;
            PRAGMA foreign_keys = ON;
            PRAGMA temp_store = MEMORY;
            ",
        )?;
        conn.execute_batch(schema_sql)?;
        Ok(())
    }

    pub fn get_connection(&self) -> Result<Connection> {
        let db_path = self.root_path.join("index.db");
        let conn = Connection::open(db_path)?;
        let _: String = conn.query_row("PRAGMA journal_mode = WAL", [], |r| r.get(0))?;
        conn.execute_batch(
            "
            PRAGMA synchronous = FULL;
            PRAGMA foreign_keys = ON;
            ",
        )?;
        Ok(conn)
    }
}
