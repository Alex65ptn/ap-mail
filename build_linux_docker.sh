#!/bin/bash
set -e

# ==============================================================================
# Script di Compilazione Locale Linux (Ubuntu/Debian .deb e .AppImage) via Docker
# AP Mail - AP Consulting (Autore: Alessandro Patanè)
# ==============================================================================

echo "===================================================================="
echo " Avvio compilazione pacchetti Linux (DEB e AppImage) per AP Mail    "
echo "===================================================================="

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${PROJECT_DIR}/target_linux_packages"
mkdir -p "${OUTPUT_DIR}"

# Verifica presenza Docker
if ! command -v docker &> /dev/null; then
    echo "ERRORE: Docker non trovato nel sistema. Avvia Docker Desktop per continuare."
    exit 1
fi

echo "1. Costruzione container di build Ubuntu 22.04..."
docker run --rm \
    -v "${PROJECT_DIR}:/workspace" \
    -w /workspace \
    ubuntu:22.04 /bin/bash -c "
        set -e
        export DEBIAN_FRONTEND=noninteractive
        apt-get update && apt-get install -y \
            curl \
            build-essential \
            libwebkit2gtk-4.1-dev \
            libappindicator3-dev \
            librsvg2-dev \
            patchelf \
            libssl-dev \
            file \
            pkg-config

        # Installa Node.js 20
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs

        # Installa Rust
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source \$HOME/.cargo/env

        # Compila Frontend & Tauri
        npm install
        npm run tauri -- build --bundles deb,appimage

        # Copia i pacchetti risultanti nella cartella di output
        cp -v src-tauri/target/release/bundle/deb/*.deb target_linux_packages/ 2>/dev/null || true
        cp -v src-tauri/target/release/bundle/appimage/*.AppImage target_linux_packages/ 2>/dev/null || true
    "

echo "===================================================================="
echo " Compilazione Linux completata con successo!                         "
echo " Pacchetti salvati in: ${OUTPUT_DIR}                                "
echo "===================================================================="
ls -lh "${OUTPUT_DIR}"
