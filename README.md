# AP Mail - Client Email & PEC Forense ad Alte Prestazioni

Progettato da **AP Consulting** per studi legali e professionisti.

![Logo AP Consulting](public/logo.png)

## Caratteristiche Principali
- **Architettura a Contenitori (Vaults):** Nessuna casella unificata. Ogni account e archivio storico risiede in un contenitore isolato portabile (`manifest.json`, `index.db`, `/blobs`).
- **Verifica e Integrità PEC:** Download integrale, calcolo SHA-256 e commit prima dell'eliminazione dal server (`EXPUNGE` protetto). Correlazione automatica delle ricevute tramite `<identificativo>` di `daticert.xml`.
- **Buste CAdES (`.p7m`):** Conservazione del file originale per valore legale ed estrazione trasparente del documento interno per l'anteprima.
- **Ricerca Istantanea FTS5:** Full-text search sia nei messaggi che dentro il testo degli allegati (PDF, DOCX, XLSX, XML).
- **Lista Virtualizzata 60 FPS:** Basata su `@tanstack/react-virtual` per gestire cataloghi da 500.000+ email senza degradare le prestazioni.
- **Ingestione Streaming Storico:** Importazione a memoria RAM costante (< 100 MB) da vecchi archivi Outlook `.pst`, archivi `.mbox` e cartelle `.eml`.

---

## Compilazione Locale (macOS .dmg)

1. Installa il toolchain Rust (se non già presente):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source "$HOME/.cargo/env"
   ```

2. Installa le dipendenze npm:
   ```bash
   npm install
   ```

3. Compila il pacchetto nativo `.dmg`:
   ```bash
   npm run build
   npx tauri build
   ```
   Il pacchetto `.dmg` verrà generato in `src-tauri/target/release/bundle/dmg/AP Mail_1.0.0_aarch64.dmg`.

---

## Licenza, Proprietà Intellettuale & Condizioni d'Uso

Copyright © 2026 **AP Consulting** — **Alessandro Patanè**. Tutti i diritti riservati.

> ### ⚠️ DIVIETO ESPRESSO D'USO E CLAUSOLA DI ESCLUSIONE
> **È fatto espresso ed assoluto divieto di utilizzo, download, detenzione, installazione o distribuzione del presente software a qualunque soggetto (persona fisica o giuridica, società, ente o studio) che abbia direttamente o indirettamente violato, contraffatto, sottratto o illecitamente utilizzato i software, i codici sorgente, i segreti industriali o i diritti di proprietà intellettuale di AP Consulting e di Alessandro Patanè.**
> Qualsiasi uso in violazione della presente clausola costituisce atto illecito privo di autorizzazione ed è perseguibile a norma di legge.

Consultare [LICENSE.md](LICENSE.md) per i termini integrali.
