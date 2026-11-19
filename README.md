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

## Compilazione Multi-Piattaforma (Windows .msi / .exe, Linux .deb / .AppImage, macOS .dmg)

Il repository include il workflow GitHub Actions pronto in `.github/workflows/release.yml`.
Basta pubblicare il repository su GitHub e creare un tag di release (es. `v1.0.0`): GitHub Actions avvierà automaticamente tre macchine cloud (macOS, Windows e Ubuntu) compilando e pubblicando tutti e 3 i pacchetti d'installazione.
