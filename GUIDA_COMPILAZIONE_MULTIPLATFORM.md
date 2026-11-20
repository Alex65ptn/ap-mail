# AP Mail — Guida alla Compilazione Multipiattaforma (Windows, Linux, macOS)
**Prodotto di:** AP Consulting  
**Autore:** Alessandro Patanè  

---

## 1. Stato di Portabilità del Progetto
Tutti i componenti di **AP Mail** sono stati ingegnerizzati per essere **100% multipiattaforma**:
- **Motore Rust nativo**: utilizza librerie asincrone compatibili con Windows, Linux e macOS (Tokio, Lettre con TLS puro Rustls, rusqlite con SQLite compilato staticamente).
- **Icone di Sistema**:
  - macOS: `icon.icns` (512x512, 1024x1024 Retina)
  - Windows: `icon.ico` (multi-risoluzione 16x16, 32x32, 48x48, 64x64, 128x128, 256x256)
  - Linux: icone standard PNG (32x32, 128x128, 512x512)
- **Integrazione Esplora Risorse / File Manager**:
  - macOS: `open` e `open -R` (Finder)
  - Windows: `explorer.exe` e `explorer /select,[file]` (Esplora File)
  - Linux: `xdg-open` (Nautilus, Dolphin, Thunar)
- **Barre del Titolo**: le decorazioni e la trasparenza macOS sono protette con guardie condizionali `#[cfg(target_os = "macos")]`, garantendo le decorazioni native di sistema su Windows (Fluent/Win32) e Linux (GTK/Wayland/X11).

---

## 2. Compilazione Automatica Cloud (Metodo Consigliato: GitHub Actions)
È stato predisposto il file di workflow CI/CD `.github/workflows/build-all-platforms.yml`.

### Come avviare la compilazione di tutti i pacchetti con 1 clic:
1. Effettua il push del repository su GitHub.
2. Crea e invia un tag di versione (es. `v1.0.0`):
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
   *oppure* vai nella scheda **Actions** del repository GitHub e clicca su **"Run workflow"**.
3. I server GitHub (macOS, Windows e Ubuntu) compileranno in parallelo:
   - 🪟 **Windows**: `AP Mail_1.0.0_x64-setup.exe` (Installer NSIS in lingua italiana e inglese)
   - 🐧 **Linux**: `ap-mail_1.0.0_amd64.deb` e `AP Mail_1.0.0_amd64.AppImage`
   - 🍏 **macOS**: `AP Mail_1.0.0_universal.dmg` (Intel + Apple Silicon)
4. I file pronti per il download verranno allegati automaticamente alla sezione **Releases** del repository.

---

## 3. Compilazione Locale per Linux (.deb e .AppImage)

Su questo Mac (o su qualsiasi macchina con Docker installato):
```bash
cd /Applications/AP_Mail
./build_linux_docker.sh
```
Lo script scarica il compilatore Ubuntu 22.04 in un container pulito, installa le librerie WebKitGTK 4.1 e compila i file `.deb` e `.AppImage` salvandoli nella cartella `target_linux_packages/`.

---

## 4. Compilazione Locale su Macchina Windows nativa

Se disponi di un PC Windows 10 o Windows 11:
1. Clona o copia la cartella `/Applications/AP_Mail`.
2. Assicurati di avere installato:
   - Node.js (v20+)
   - Rust e il compilatore C++ (Visual Studio Build Tools con carico di lavoro C++)
   - NSIS (opzionale, Tauri lo gestisce autonomamente)
3. Apri il terminale (PowerShell o CMD) nella cartella del progetto ed esegui:
   ```powershell
   npm install
   npm run tauri -- build
   ```
4. Troverai l'installer eseguibile in:
   `src-tauri\target\release\bundle\nsis\AP Mail_1.0.0_x64-setup.exe`

---

## 5. Specifiche di Sistema dei Pacchetti

| Piattaforma | Formato Pacchetto | Architettura | Requisiti Minimi |
| :--- | :--- | :--- | :--- |
| **Windows** | Setup `.exe` (NSIS) | x64 (64-bit) | Windows 10 / Windows 11 (WebView2 preinstallato di sistema) |
| **Linux (Debian/Ubuntu/Mint)** | Pacchetto `.deb` | x64 (amd64) | Ubuntu 20.04+, Debian 11+, Mint 20+ (`libwebkit2gtk-4.1`) |
| **Linux (Tutte le distro)** | Standalone `.AppImage` | x64 (amd64) | Qualsiasi distribuzione Linux con glibc 2.31+ |
| **macOS** | Bundle `.app` e `.dmg` | Universal (ARM64 + x86_64) | macOS 10.15 Catalina o superiore |
