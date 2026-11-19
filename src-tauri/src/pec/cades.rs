use cms::content_info::ContentInfo;
use cms::signed_data::SignedData;
use der::{Decode, Encode};
use crate::error::{AppError, Result};

pub struct CadesExtractor;

impl CadesExtractor {
    pub fn extract_payload(p7m_bytes: &[u8]) -> Result<Vec<u8>> {
        let content_info = ContentInfo::from_der(p7m_bytes)
            .map_err(|e| AppError::Vault(format!("Errore ASN.1 ContentInfo: {}", e)))?;

        let signed_data_bytes = content_info.content.to_der()
            .map_err(|e| AppError::Vault(format!("Errore content DER: {}", e)))?;

        let signed_data = SignedData::from_der(&signed_data_bytes)
            .map_err(|e| AppError::Vault(format!("Errore SignedData: {}", e)))?;

        if let Some(econtent) = signed_data.encap_content_info.econtent {
            let inner_bytes = econtent.to_der()
                .map_err(|e| AppError::Vault(format!("Errore eContent DER: {}", e)))?;

            if inner_bytes.len() > 4 && inner_bytes[0] == 0x04 {
                let mut offset = 2;
                if inner_bytes[1] & 0x80 != 0 {
                    let num_octets = (inner_bytes[1] & 0x7F) as usize;
                    offset = 2 + num_octets;
                }
                if offset < inner_bytes.len() {
                    return Ok(inner_bytes[offset..].to_vec());
                }
            }

            Ok(inner_bytes)
        } else {
            Err(AppError::Vault("Busta CAdES detached (senza payload)".into()))
        }
    }
}
