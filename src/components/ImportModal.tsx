import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { ImportProgressEvent } from '../types/mail';
import { HardDriveDownload, CheckCircle2, X } from 'lucide-react';

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
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="bg-white border border-slate-200/80 w-full max-w-lg rounded-2xl p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Importa Archivio Storico</h2>
              <p className="text-xs text-slate-500">Creazione Contenitore Locale dedicato a zero-RAM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isImporting && !progress?.is_completed ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600">Nome del Vault Archivio</label>
              <input
                type="text"
                value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
                placeholder="es. Archivio_Studio_2020"
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Formato Archivio</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(['pst', 'mbox', 'eml_folder'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setSourceType(t); setSourcePath(''); }}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                      sourceType === t
                        ? 'bg-amber-50 border-amber-500 text-amber-900 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {t === 'eml_folder' ? 'CARTELLA EML' : t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Percorso File / Cartella</label>
              <div className="flex space-x-2 mt-1">
                <input
                  type="text"
                  readOnly
                  value={sourcePath}
                  placeholder="Seleziona il percorso su disco..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs truncate"
                />
                <button
                  type="button"
                  onClick={handleSelectFile}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-medium transition-colors"
                >
                  Sfoglia
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-2.5 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleStartImport}
                disabled={!archiveName || !sourcePath}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium rounded-xl text-xs transition-colors shadow-sm"
              >
                Avvia Ingestione Streaming
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="text-xs text-slate-700 flex justify-between">
              <span>Cartella: <strong className="text-amber-800 font-mono">{progress?.current_folder}</strong></span>
              <span>Importati: <strong>{progress?.imported_count}</strong></span>
            </div>

            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full w-full animate-pulse" />
            </div>

            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>Messaggi processati: {progress?.total_processed}</span>
              <span>Duplicati saltati: {progress?.duplicates_skipped}</span>
            </div>

            {progress?.is_completed && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Ingestione completata con successo nel nuovo Vault!</span>
              </div>
            )}

            {progress?.is_completed && (
              <button
                type="button"
                onClick={onClose}
                className="w-full mt-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
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
