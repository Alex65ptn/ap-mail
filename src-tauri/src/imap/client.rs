use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use tokio_rustls::rustls::pki_types::ServerName;
use tokio_rustls::rustls::ClientConfig;
use tokio_rustls::TlsConnector;

use crate::error::{AppError, Result};
use crate::pop3::client::DangerousNoVerifier;

pub enum ImapStream {
    Plain(BufReader<TcpStream>),
    Tls(BufReader<tokio_rustls::client::TlsStream<TcpStream>>),
}

impl ImapStream {
    pub async fn read_line_raw(&mut self) -> Result<String> {
        let mut line = String::new();
        match self {
            ImapStream::Plain(s) => s.read_line(&mut line).await?,
            ImapStream::Tls(s) => s.read_line(&mut line).await?,
        };
        if line.is_empty() {
            return Err(AppError::Vault("Connessione chiusa prematuramente dal server IMAP".into()));
        }
        Ok(line)
    }

    pub async fn write_all(&mut self, data: &[u8]) -> Result<()> {
        match self {
            ImapStream::Plain(s) => {
                s.get_mut().write_all(data).await?;
                s.get_mut().flush().await?;
            }
            ImapStream::Tls(s) => {
                s.get_mut().write_all(data).await?;
                s.get_mut().flush().await?;
            }
        }
        Ok(())
    }

    pub async fn read_exact_bytes(&mut self, count: usize) -> Result<Vec<u8>> {
        use tokio::io::AsyncReadExt;
        let mut buf = vec![0u8; count];
        match self {
            ImapStream::Plain(s) => s.read_exact(&mut buf).await?,
            ImapStream::Tls(s) => s.read_exact(&mut buf).await?,
        };
        Ok(buf)
    }
}

pub struct ImapClient {
    stream: ImapStream,
    tag_counter: u32,
}

impl ImapClient {
    pub async fn connect(host: &str, port: u16, use_tls: bool) -> Result<Self> {
        // Se la connessione normale fallisce (es. No route to host per IP locale stale in /etc/hosts),
        // prova a risolvere e connettersi all'IP pubblico di fallback (130.78.59.61) se applicabile.
        let tcp = match tokio::time::timeout(std::time::Duration::from_secs(3), TcpStream::connect((host, port))).await {
            Ok(Ok(t)) => t,
            _ => {
                // Fallback a IP pubblico se host appartiene a verindex o apconsulting
                if host.contains("verindex") || host.contains("apconsulting") || host.contains("e-karum") {
                    TcpStream::connect(("130.78.59.61", port)).await
                        .map_err(|e| AppError::Vault(format!("Impossibile connettersi al server IMAP {}:{} (anche con fallback): {}", host, port, e)))?
                } else {
                    return Err(AppError::Vault(format!("Impossibile connettersi al server IMAP {}:{}", host, port)));
                }
            }
        };

        let stream = if use_tls {
            let mut roots = tokio_rustls::rustls::RootCertStore::empty();
            let native_certs = rustls_native_certs::load_native_certs();
            for cert in native_certs.certs {
                let _ = roots.add(cert);
            }

            // ClientConfig con tolleranza per certificati self-signed o di staging
            let config = ClientConfig::builder()
                .dangerous()
                .with_custom_certificate_verifier(Arc::new(DangerousNoVerifier))
                .with_no_client_auth();

            let connector = TlsConnector::from(Arc::new(config));
            let server_name = ServerName::try_from(host.to_string())
                .unwrap_or_else(|_| ServerName::try_from("localhost".to_string()).unwrap());

            let tls_stream = connector.connect(server_name, tcp).await
                .map_err(|e| AppError::Vault(format!("Errore handshake TLS IMAP su {}:{}: {}", host, port, e)))?;

            ImapStream::Tls(BufReader::new(tls_stream))
        } else {
            ImapStream::Plain(BufReader::new(tcp))
        };

        let mut client = Self {
            stream,
            tag_counter: 1,
        };

        // Leggi banner iniziale (* OK Dovecot ready...)
        let banner = client.stream.read_line_raw().await?;
        if !banner.starts_with("* OK") && !banner.starts_with("* PREAUTH") {
            return Err(AppError::Vault(format!("Risposta banner IMAP non valida: {}", banner.trim())));
        }

        Ok(client)
    }

    fn next_tag(&mut self) -> String {
        let tag = format!("A{:04}", self.tag_counter);
        self.tag_counter += 1;
        tag
    }

    pub async fn execute_command(&mut self, cmd: &str) -> Result<(String, Vec<String>)> {
        let tag = self.next_tag();
        let full_cmd = format!("{} {}\r\n", tag, cmd);
        self.stream.write_all(full_cmd.as_bytes()).await?;

        let mut lines = Vec::new();
        loop {
            let line = self.stream.read_line_raw().await?;
            if line.starts_with(&tag) {
                // Riga di stato terminale (es. "A0001 OK ...", "A0001 NO ...")
                let trimmed = line.trim().to_string();
                if trimmed.contains("OK") {
                    return Ok((trimmed, lines));
                } else {
                    return Err(AppError::Vault(format!("Errore comando IMAP '{}': {}", cmd, trimmed)));
                }
            } else {
                lines.push(line);
            }
        }
    }

    pub async fn login(&mut self, user: &str, pass: &str) -> Result<()> {
        let escaped_user = user.replace('\\', "\\\\").replace('"', "\\\"");
        let escaped_pass = pass.replace('\\', "\\\\").replace('"', "\\\"");
        let cmd = format!("LOGIN \"{}\" \"{}\"", escaped_user, escaped_pass);
        self.execute_command(&cmd).await?;
        Ok(())
    }

    pub async fn select_inbox(&mut self) -> Result<u32> {
        let (_, lines) = self.execute_command("SELECT INBOX").await?;
        let mut exists_count = 0;
        for line in lines {
            if line.contains("EXISTS") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 && parts[0] == "*" && parts[2] == "EXISTS" {
                    if let Ok(num) = parts[1].parse::<u32>() {
                        exists_count = num;
                    }
                }
            }
        }
        Ok(exists_count)
    }

    pub async fn search_uids(&mut self) -> Result<Vec<u32>> {
        let (_, lines) = self.execute_command("UID SEARCH ALL").await?;
        let mut uids = Vec::new();
        for line in lines {
            if line.starts_with("* SEARCH") {
                for token in line.trim().split_whitespace().skip(2) {
                    if let Ok(uid) = token.parse::<u32>() {
                        uids.push(uid);
                    }
                }
            }
        }
        Ok(uids)
    }

    pub async fn fetch_message_rfc822(&mut self, uid: u32) -> Result<Vec<u8>> {
        let tag = self.next_tag();
        let cmd = format!("{} UID FETCH {} (BODY.PEEK[])\r\n", tag, uid);
        self.stream.write_all(cmd.as_bytes()).await?;

        let mut eml_bytes = Vec::new();
        let mut literal_size: Option<usize> = None;

        loop {
            if let Some(size) = literal_size.take() {
                // Leggi esattamente `size` byte per il contenuto MIME dell'email
                let payload = self.stream.read_exact_bytes(size).await?;
                eml_bytes = payload;
                // Leggi il \r\n di chiusura del literal
                let _ = self.stream.read_line_raw().await?;
                continue;
            }

            let line = self.stream.read_line_raw().await?;
            if line.starts_with(&tag) {
                if line.contains("OK") {
                    break;
                } else {
                    return Err(AppError::Vault(format!("Errore FETCH UID {}: {}", uid, line.trim())));
                }
            }

            // Rileva notazione literal IMAP {1234}\r\n
            if let Some(start_brace) = line.rfind('{') {
                if let Some(end_brace) = line[start_brace..].find('}') {
                    let num_str = &line[start_brace + 1..start_brace + end_brace];
                    if let Ok(size) = num_str.parse::<usize>() {
                        literal_size = Some(size);
                    }
                }
            }
        }

        Ok(eml_bytes)
    }

    pub async fn logout(&mut self) -> Result<()> {
        let _ = self.execute_command("LOGOUT").await;
        Ok(())
    }
}
