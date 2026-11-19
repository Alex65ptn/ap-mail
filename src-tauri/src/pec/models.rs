use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PecTipoRicevuta {
    Accettazione,
    AvvenutaConsegna,
    MancataConsegna,
    PreavvisoErroreConsegna,
    RilevazioneVirus,
    NonRiconosciuta,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatiCertMetadata {
    pub identificativo: String,
    pub tipo_ricevuta: PecTipoRicevuta,
    pub gestore_emittente: String,
    pub data_iso: String,
    pub mittente: String,
    pub destinatari: Vec<String>,
    pub oggetto: Option<String>,
    pub msgid_originale: Option<String>,
    pub raw_xml: String,
}

#[derive(Debug, Clone)]
pub enum PecClassification {
    Ordinaria,
    BustaTrasporto {
        metadata: DatiCertMetadata,
        inner_eml_bytes: Vec<u8>,
    },
    RicevutaCertificata {
        metadata: DatiCertMetadata,
        inner_eml_bytes: Option<Vec<u8>>,
    },
}
