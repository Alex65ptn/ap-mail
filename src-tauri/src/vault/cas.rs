use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use sha2::{Digest, Sha256};
use tempfile::NamedTempFile;
use crate::error::{AppError, Result};

pub struct BlobResult {
    pub sha256_hash: String,
    pub relative_path: String,
    pub size_bytes: u64,
}

#[derive(Clone)]
pub struct ContentAddressableStorage {
    blobs_root: PathBuf,
}

impl ContentAddressableStorage {
    pub fn new(vault_root: &Path) -> Result<Self> {
        let blobs_root = vault_root.join("blobs");
        fs::create_dir_all(&blobs_root)?;
        Ok(Self { blobs_root })
    }

    pub fn store_stream<R: Read>(&self, mut reader: R, extension: &str) -> Result<BlobResult> {
        let mut temp_file = NamedTempFile::new_in(&self.blobs_root)?;
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 64 * 1024];
        let mut total_bytes = 0u64;

        loop {
            let bytes_read = reader.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }
            temp_file.write_all(&buffer[..bytes_read])?;
            hasher.update(&buffer[..bytes_read]);
            total_bytes += bytes_read as u64;
        }

        temp_file.flush()?;

        let hash_result = hasher.finalize();
        let sha256_hash = hex::encode(hash_result);

        let shard_1 = &sha256_hash[0..2];
        let shard_2 = &sha256_hash[2..4];
        let ext_normalized = extension.trim_start_matches('.');
        let filename = format!("{}.{}", sha256_hash, ext_normalized);

        let target_dir = self.blobs_root.join(shard_1).join(shard_2);
        fs::create_dir_all(&target_dir)?;

        let target_path = target_dir.join(&filename);
        let relative_path = format!("blobs/{}/{}/{}", shard_1, shard_2, filename);

        if target_path.exists() {
            drop(temp_file);
        } else {
            temp_file.persist(&target_path).map_err(|e| {
                AppError::Vault(format!("Impossibile salvare il blob: {}", e.error))
            })?;
        }

        Ok(BlobResult {
            sha256_hash,
            relative_path,
            size_bytes: total_bytes,
        })
    }

    pub fn store_bytes(&self, data: &[u8], extension: &str) -> Result<BlobResult> {
        self.store_stream(data, extension)
    }

    pub fn get_sync(&self, hash: &str, extension: &str) -> Result<Vec<u8>> {
        let shard_1 = &hash[0..2];
        let shard_2 = &hash[2..4];
        let filename = format!("{}.{}", hash, extension.trim_start_matches('.'));
        let path = self.blobs_root.join(shard_1).join(shard_2).join(filename);
        if !path.exists() {
            return Err(AppError::Vault(format!("Blob non trovato: {}", hash)));
        }
        let mut f = File::open(path)?;
        let mut buf = Vec::new();
        f.read_to_end(&mut buf)?;
        Ok(buf)
    }
}
