import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { ImportProgressEvent } from '../types/mail';
import { HardDriveDownload, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [archiveName, setArchiveName] = useState('');
  const [sourceType, setSourceType] = useState<'pst' | 'mbox' | 'eml_folder'>('pst');
  const [sourcePath, setSourcePath] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgressEvent | null>(null);

  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    listen<ImportProgressEvent>('import-progress', (event) => {
      setProgress(event.payload);
      if (event.payload.is_completed) {
        setIsImporting(false);
        onSuccess();
      }
    }).then((fn) => { unlistenFn = fn; });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [onSuccess]);

  const handleSelectFile = async () => {
    const selected = await open({
      multiple: false,
      directory: sourceType === 'eml_folder',
      filters: sourceType === 'pst' ? [{ name: 'Outlook PST', extensions: ['pst'] }] : undefined,
    });
    if (selected && typeof selected === 'string') {
      setSourcePath(selected);
    }
  };

  const handleStartImport = async () => {
    if (!archiveName || !sourcePath) return;
    setIsImporting(true);
    await invoke('create_archive_vault_and_import', {
      archiveName,
      sourceType,
      sourcePath,
      mboxVariant: 'auto',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-lg rounded-2xl p-6 shadow-2xl">
        <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
          <HardDriveDownload className="w-5 h-5 text-amber-400" />
          <span>Importa Archivio Storico (Nuovo Vault)</span>
        </h2>

        {!isImporting && !progress?.is_completed ? (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Nome del Vault Archivio</label>
              <input
                type="text"
                value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
                placeholder="es. Archivio_Storico_2020"
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Formato Archivio</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(['pst', 'mbox', 'eml_folder'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setSourceType(t); setSourcePath(''); }}
                    className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                      sourceType === t
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t === 'eml_folder' ? 'CARTELLA EML' : t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Percorso File / Cartella</label>
              <div className="flex space-x-2 mt-1">
                <input
                  type="text"
                  readOnly
                  value={sourcePath}
                  placeholder="Seleziona il percorso su disco..."
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-xs"
                />
                <button
                  type="button"
                  onClick={handleSelectFile}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Sfoglia
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleStartImport}
                disabled={!archiveName || !sourcePath}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-lg shadow-amber-500/20"
              >
                Avvia Ingestione Streaming
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="text-xs text-slate-300 flex justify-between">
              <span>Cartella: <strong className="text-amber-400">{progress?.current_folder}</strong></span>
              <span>Importati: <strong>{progress?.imported_count}</strong></span>
            </div>

            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full w-full animate-pulse" />
            </div>

            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>Messaggi processati: {progress?.total_processed}</span>
              <span>Duplicati saltati: {progress?.duplicates_skipped}</span>
            </div>

            {progress?.is_completed && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-lg flex items-center space-x-2 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Ingestione completata con successo nel nuovo Vault!</span>
              </div>
            )}

            {progress?.is_completed && (
              <button
                type="button"
                onClick={onClose}
                className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
              >
                Chiudi
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
