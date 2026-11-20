import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { HardDrive, FolderOpen, Cloud, X, Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface StorageInfo {
  data_root: string;
  total_vaults: number;
  accounts: string[];
}

export const StorageLocationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      invoke('get_vault_storage_info')
        .then((data: any) => setInfo(data))
        .catch((e) => console.error('Errore get_vault_storage_info:', e));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenFinder = async () => {
    try {
      await invoke('reveal_vault_in_finder');
    } catch (e) {
      console.error('Errore apertura cartella:', e);
    }
  };

  const handleCopyPath = () => {
    if (info?.data_root) {
      navigator.clipboard.writeText(info.data_root);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="bg-white border border-slate-200/90 w-full max-w-xl rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Allocazione Mailbox & Google Drive</h2>
              <p className="text-xs text-slate-500">Percorsi di archiviazione locale e sincronizzazione Cloud</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Percorso Attuale */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Percorso Attuale di Archiviazione Mailbox (Vaults):
            </label>
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="font-mono text-slate-800 text-[11px] flex-1 truncate select-all">
                {info?.data_root || '/Users/.../Library/Application Support/com.apmail.desktop'}
              </span>
              <button
                onClick={handleCopyPath}
                className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors"
              >
                {copied ? 'Copiato!' : 'Copia Percorso'}
              </button>
              <button
                onClick={handleOpenFinder}
                className="px-3 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-slate-950" />
                <span>Apri nel Finder</span>
              </button>
            </div>
          </div>

          {/* Info Caselle Presenti */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-900 leading-relaxed">
              <strong>{info?.total_vaults || 0} Caselle allocate</strong> in questa cartella. Ciascuna casella contiene un file <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">index.db</code> (indice email) e la sottocartella <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">blobs/</code> con tutti i file <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.eml</code> originali.
            </div>
          </div>

          {/* Istruzioni Google Drive */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
              <Cloud className="w-4 h-4 text-sky-600" />
              <span>Come Sincronizzare o Spostare le Mailbox su Google Drive:</span>
            </div>
            
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px] leading-relaxed">
              <li>
                Clicca su <strong>"Apri nel Finder"</strong> qui sopra per visualizzare la cartella delle mailbox.
              </li>
              <li>
                <strong>Sincronizzazione Automatica:</strong> Crea un collegamento (Alias o Symlink) di questa cartella all'interno della cartella di <strong>Google Drive</strong> (es. <code>Google Drive/Il mio Drive/AP_Mail_Vaults</code>). In questo modo ogni nuova email scaricata verrà istantaneamente sincronizzata nel tuo cloud.
              </li>
              <li>
                <strong>Backup / Archiviazione Sicura:</strong> Puoi copiare l'intera cartella direttamente su Google Drive o su un disco esterno in qualsiasi momento a programma chiuso.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
