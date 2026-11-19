use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use tokio_rustls::rustls::pki_types::ServerName;
use tokio_rustls::rustls::ClientConfig;
use tokio_rustls::TlsConnector;

use crate::error::{AppError, Result};

pub enum PopStream {
    Plain(BufReader<TcpStream>),
    Tls(BufReader<tokio_rustls::client::TlsStream<TcpStream>>),
}

impl PopStream {
    pub async fn read_line_resp(&mut self) -> Result<String> {
        let mut line = String::new();
        match self {
            PopStream::Plain(s) => s.read_line(&mut line).await?,
            PopStream::Tls(s) => s.read_line(&mut line).await?,
        };
        if line.is_empty() {
            return Err(AppError::Vault("Connessione chiusa prematuramente dal server POP3".into()));
        }
        Ok(line)
    }

    pub async fn send_cmd(&mut self, cmd: &str) -> Result<String> {
        let full_cmd = format!("{}\r\n", cmd);
        match self {
            PopStream::Plain(s) => {
                s.get_mut().write_all(full_cmd.as_bytes()).await?;
                s.get_mut().flush().await?;
            }
            PopStream::Tls(s) => {
                s.get_mut().write_all(full_cmd.as_bytes()).await?;
                s.get_mut().flush().await?;
            }
        }
        let resp = self.read_line_resp().await?;
        if !resp.starts_with("+OK") {
            return Err(AppError::Vault(format!("Errore POP3 su comando '{}': {}", cmd, resp.trim())));
        }
        Ok(resp)
    }

    pub async fn read_multiline(&mut self) -> Result<Vec<u8>> {
        let mut result = Vec::new();
        let mut line = String::new();

        loop {
            line.clear();
            let n = match self {
                PopStream::Plain(s) => s.read_line(&mut line).await?,
                PopStream::Tls(s) => s.read_line(&mut line).await?,
            };
            if n == 0 {
                break;
            }

            let trimmed = line.trim_end_matches(['\r', '\n']);
            if trimmed == "." {
                break;
            }

            // Byte unstuffing: se una riga inizia con "..", il primo punto va rimosso
            let content = if line.starts_with("..") {
                &line[1..]
            } else {
                &line[..]
            };
            result.extend_from_slice(content.as_bytes());
        }

        Ok(result)
    }
}

pub struct Pop3Client {
    stream: PopStream,
}

impl Pop3Client {
    pub async fn connect(host: &str, port: u16, use_tls: bool) -> Result<Self> {
        let tcp = TcpStream::connect((host, port)).await
            .map_err(|e| AppError::Vault(format!("Impossibile connettersi al server POP3 {}:{}: {}", host, port, e)))?;

        let stream = if use_tls {
            let mut roots = tokio_rustls::rustls::RootCertStore::empty();
            let native_certs = rustls_native_certs::load_native_certs();
            for cert in native_certs.certs {
                let _ = roots.add(cert);
            }

            // Permetti il bypass dei certificati se si usa un IP locale o self-signed
            let is_ip = host.parse::<std::net::IpAddr>().is_ok();
            
            let config = if is_ip {
                // Configurazione con verifica permissiva per IP locali
                ClientConfig::builder()
                    .dangerous()
                    .with_custom_certificate_verifier(Arc::new(DangerousNoVerifier))
                    .with_no_client_auth()
            } else {
                ClientConfig::builder()
                    .with_root_certificates(roots)
                    .with_no_client_auth()
            };

            let connector = TlsConnector::from(Arc::new(config));
            let domain_str = if is_ip { "mail.local" } else { host };
            let server_name = ServerName::try_from(domain_str.to_string())
                .unwrap_or_else(|_| ServerName::try_from("localhost".to_string()).unwrap());

            let tls_stream = connector.connect(server_name, tcp).await
                .map_err(|e| AppError::Vault(format!("Errore handshake TLS POP3 su {}:{}: {}", host, port, e)))?;

            PopStream::Tls(BufReader::new(tls_stream))
        } else {
            PopStream::Plain(BufReader::new(tcp))
        };

        let mut client = Self { stream };
        // Leggi il banner iniziale +OK
        let greeting = client.stream.read_line_resp().await?;
        if !greeting.starts_with("+OK") {
            return Err(AppError::Vault(format!("Risposta banner POP3 non valida: {}", greeting.trim())));
        }

        Ok(client)
    }

    pub async fn login(&mut self, username: &str, password: &str) -> Result<()> {
        self.stream.send_cmd(&format!("USER {}", username)).await?;
        self.stream.send_cmd(&format!("PASS {}", password)).await?;
        Ok(())
    }

    pub async fn get_uidl_list(&mut self) -> Result<Vec<(u32, String)>> {
        self.stream.send_cmd("UIDL").await?;
        let multiline = self.stream.read_multiline().await?;
        let text = String::from_utf8_lossy(&multiline);

        let mut items = Vec::new();
        for line in text.lines() {
            let mut parts = line.split_whitespace();
            if let (Some(num_str), Some(uidl)) = (parts.next(), parts.next()) {
                if let Ok(num) = num_str.parse::<u32>() {
                    items.push((num, uidl.to_string()));
                }
            }
        }
        Ok(items)
    }

    pub async fn retrieve_message(&mut self, msg_num: u32) -> Result<Vec<u8>> {
        self.stream.send_cmd(&format!("RETR {}", msg_num)).await?;
        let eml_bytes = self.stream.read_multiline().await?;
        Ok(eml_bytes)
    }

    pub async fn delete_message(&mut self, msg_num: u32) -> Result<()> {
        self.stream.send_cmd(&format!("DELE {}", msg_num)).await?;
        Ok(())
    }

    pub async fn quit(&mut self) -> Result<()> {
        let _ = self.stream.send_cmd("QUIT").await;
        Ok(())
    }
}

// Verificatore TLS permissivo per connessioni a IP locali LAN (es. 172.30.1.100)
#[derive(Debug)]
struct DangerousNoVerifier;

impl tokio_rustls::rustls::client::danger::ServerCertVerifier for DangerousNoVerifier {
    fn verify_server_cert(
        &self,
        _end_entity: &tokio_rustls::rustls::pki_types::CertificateDer<'_>,
        _intermediates: &[tokio_rustls::rustls::pki_types::CertificateDer<'_>],
        _server_name: &ServerName<'_>,
        _ocsp_response: &[u8],
        _now: tokio_rustls::rustls::pki_types::UnixTime,
    ) -> std::result::Result<tokio_rustls::rustls::client::danger::ServerCertVerified, tokio_rustls::rustls::Error> {
        Ok(tokio_rustls::rustls::client::danger::ServerCertVerified::assertion())
    }

    fn verify_tls12_signature(
        &self,
        _message: &[u8],
        _cert: &tokio_rustls::rustls::pki_types::CertificateDer<'_>,
        _dss: &tokio_rustls::rustls::DigitallySignedStruct,
    ) -> std::result::Result<tokio_rustls::rustls::client::danger::HandshakeSignatureValid, tokio_rustls::rustls::Error> {
        Ok(tokio_rustls::rustls::client::danger::HandshakeSignatureValid::assertion())
    }

    fn verify_tls13_signature(
        &self,
        _message: &[u8],
        _cert: &tokio_rustls::rustls::pki_types::CertificateDer<'_>,
        _dss: &tokio_rustls::rustls::DigitallySignedStruct,
    ) -> std::result::Result<tokio_rustls::rustls::client::danger::HandshakeSignatureValid, tokio_rustls::rustls::Error> {
        Ok(tokio_rustls::rustls::client::danger::HandshakeSignatureValid::assertion())
    }

    fn supported_verify_schemes(&self) -> Vec<tokio_rustls::rustls::SignatureScheme> {
        vec![
            tokio_rustls::rustls::SignatureScheme::RSA_PKCS1_SHA256,
            tokio_rustls::rustls::SignatureScheme::ECDSA_NISTP256_SHA256,
            tokio_rustls::rustls::SignatureScheme::ED25519,
        ]
    }
}
