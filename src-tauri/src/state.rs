use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use crate::error::{AppError, Result};
use crate::vault::container::VaultContainer;

pub struct AppState {
    data_root: PathBuf,
    vaults: RwLock<HashMap<String, Arc<VaultContainer>>>,
}

impl AppState {
    pub fn new(data_root: PathBuf) -> Self {
        Self {
            data_root,
            vaults: RwLock::new(HashMap::new()),
        }
    }

    pub fn get_data_root(&self) -> PathBuf {
        self.data_root.clone()
    }

    pub fn register_vault(&self, workspace_id: String, vault: Arc<VaultContainer>) {
        let mut map = self.vaults.write().unwrap_or_else(|p| p.into_inner());
        map.insert(workspace_id, vault);
    }

    pub fn unregister_vault(&self, workspace_id: &str) {
        let mut map = self.vaults.write().unwrap_or_else(|p| p.into_inner());
        map.remove(workspace_id);
    }

    pub fn get_vault(&self, workspace_id: &str) -> Result<Arc<VaultContainer>> {
        let map = self.vaults.read().unwrap_or_else(|p| p.into_inner());
        map.get(workspace_id)
            .cloned()
            .ok_or_else(|| AppError::WorkspaceNotFound(workspace_id.to_string()))
    }

    pub fn get_all_vaults(&self) -> Vec<Arc<VaultContainer>> {
        let map = self.vaults.read().unwrap_or_else(|p| p.into_inner());
        map.values().cloned().collect()
    }
}
