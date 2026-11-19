use std::time::Duration;
use tokio::net::TcpStream;

pub struct AutoDiscovery;

impl AutoDiscovery {
    /// Ricava i candidati host per un dominio email
    pub fn get_candidate_servers(email: &str, custom_server: Option<&str>) -> Vec<String> {
        let mut candidates = Vec::new();

        if let Some(s) = custom_server {
            let s_trim = s.trim();
            if !s_trim.is_empty() {
                candidates.push(s_trim.to_string());
            }
        }

        if let Some((_, domain)) = email.split_once('@') {
            let d = domain.trim().to_lowercase();
            match d.as_str() {
                "pec.it" | "arubapec.it" => candidates.push("imaps.pec.aruba.it".to_string()),
                "legalmail.it" => candidates.push("mail.legalmail.it".to_string()),
                "postecert.it" => candidates.push("mail.postecert.it".to_string()),
                "sicurezzapostale.it" => candidates.push("imap.sicurezzapostale.it".to_string()),
                "gmail.com" => candidates.push("imap.gmail.com".to_string()),
                "outlook.com" | "hotmail.com" => candidates.push("outlook.office365.com".to_string()),
                _ => {
                    candidates.push(format!("mail.{}", d));
                    candidates.push(format!("imap.{}", d));
                    candidates.push(d);
                }
            }
        }

        candidates.dedup();
        candidates
    }

    /// Testa se un server e porta sono raggiungibili via TCP
    pub async fn check_reachability(server: &str, port: u16) -> bool {
        let addr = format!("{}:{}", server, port);
        tokio::time::timeout(
            Duration::from_millis(2500),
            TcpStream::connect(&addr)
        ).await.map(|res| res.is_ok()).unwrap_or(false)
    }

    /// Trova il primo server raggiungibile tra i candidati
    pub async fn discover_working_server(email: &str, initial_server: &str, port: u16) -> (String, u16) {
        let candidates = Self::get_candidate_servers(email, Some(initial_server));
        
        for candidate in &candidates {
            if Self::check_reachability(candidate, port).await {
                return (candidate.clone(), port);
            }
        }

        // Se nessun test rapido risponde, mantieni il server specificato
        (initial_server.to_string(), port)
    }
}
