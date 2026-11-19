use mail_parser::MimeHeaders;
use quick_xml::events::Event;
use quick_xml::reader::Reader;
use crate::error::{AppError, Result};
use crate::pec::models::{DatiCertMetadata, PecClassification, PecTipoRicevuta};

pub struct PecParser;

impl PecParser {
    pub fn classify_and_parse(eml_bytes: &[u8]) -> Result<PecClassification> {
        let parsed = mail_parser::MessageParser::default().parse(eml_bytes)
            .ok_or_else(|| AppError::Vault("Impossibile effettuare il parse MIME".into()))?;

        let mut daticert_bytes: Option<Vec<u8>> = None;
        let mut postacert_bytes: Option<Vec<u8>> = None;

        for part in parsed.attachments() {
            let filename = part.attachment_name().unwrap_or("").to_lowercase();
            if filename == "daticert.xml" || (filename.starts_with("daticert") && filename.ends_with(".xml")) {
                daticert_bytes = Some(part.contents().to_vec());
            } else if filename == "postacert.eml" {
                postacert_bytes = Some(part.contents().to_vec());
            }
        }

        if let Some(xml_data) = daticert_bytes {
            let xml_str = String::from_utf8_lossy(&xml_data).to_string();
            let metadata = Self::parse_daticert_xml(&xml_str)?;

            match metadata.tipo_ricevuta {
                PecTipoRicevuta::Accettazione
                | PecTipoRicevuta::AvvenutaConsegna
                | PecTipoRicevuta::MancataConsegna
                | PecTipoRicevuta::PreavvisoErroreConsegna
                | PecTipoRicevuta::RilevazioneVirus => {
                    return Ok(PecClassification::RicevutaCertificata {
                        metadata,
                        inner_eml_bytes: postacert_bytes,
                    });
                }
                PecTipoRicevuta::NonRiconosciuta => {
                    if let Some(inner_eml) = postacert_bytes {
                        return Ok(PecClassification::BustaTrasporto {
                            metadata,
                            inner_eml_bytes: inner_eml,
                        });
                    }
                }
            }
        }

        Ok(PecClassification::Ordinaria)
    }

    pub fn parse_daticert_xml(xml_content: &str) -> Result<DatiCertMetadata> {
        let mut reader = Reader::from_str(xml_content);
        reader.config_mut().trim_text(true);

        let mut identificativo = String::new();
        let mut tipo_ricevuta_str = String::new();
        let mut gestore_emittente = String::new();
        let mut giorno = String::new();
        let mut ora = String::new();
        let mut mittente = String::new();
        let mut destinatari = Vec::new();
        let mut oggetto = None;
        let mut msgid_originale = None;

        let mut current_tag = String::new();
        let mut buf = Vec::new();

        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(ref e)) => {
                    current_tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                    if current_tag == "tipo" {
                        for attr in e.attributes().flatten() {
                            if attr.key.as_ref() == b"tipo" {
                                tipo_ricevuta_str = String::from_utf8_lossy(&attr.value).to_string();
                            }
                        }
                    }
                }
                Ok(Event::Text(e)) => {
                    let text = e.unescape().unwrap_or_default().to_string();
                    match current_tag.as_str() {
                        "identificativo" => identificativo = text,
                        "gestore-emittente" => gestore_emittente = text,
                        "giorno" => giorno = text,
                        "ora" => ora = text,
                        "mittente" => mittente = text,
                        "destinatario" => destinatari.push(text),
                        "oggetto" => oggetto = Some(text),
                        "messaggio-originale" => msgid_originale = Some(text),
                        "tipo" if tipo_ricevuta_str.is_empty() => tipo_ricevuta_str = text,
                        _ => {}
                    }
                }
                Ok(Event::End(_)) => { current_tag.clear(); }
                Ok(Event::Eof) => break,
                Err(e) => return Err(AppError::Vault(format!("Errore XML daticert: {}", e))),
                _ => {}
            }
            buf.clear();
        }

        let tipo_ricevuta = match tipo_ricevuta_str.to_lowercase().as_str() {
            "accettazione" => PecTipoRicevuta::Accettazione,
            "avvenuta-consegna" => PecTipoRicevuta::AvvenutaConsegna,
            "errore-consegna" | "mancata-consegna" => PecTipoRicevuta::MancataConsegna,
            "preavviso-errore-consegna" => PecTipoRicevuta::PreavvisoErroreConsegna,
            "rilevazione-virus" => PecTipoRicevuta::RilevazioneVirus,
            _ => PecTipoRicevuta::NonRiconosciuta,
        };

        let data_iso = format!("{}T{}Z", giorno.trim(), ora.trim());

        Ok(DatiCertMetadata {
            identificativo,
            tipo_ricevuta,
            gestore_emittente,
            data_iso,
            mittente,
            destinatari,
            oggetto,
            msgid_originale,
            raw_xml: xml_content.to_string(),
        })
    }
}
