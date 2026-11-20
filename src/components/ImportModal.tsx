import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { ImportProgressEvent } from '../types/mail';
import { HardDriveDownload, X, RefreshCw, FolderSearch, ArrowRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface DiscoveredMailbox {
  name: string;
  path: string;
  format: string; // 'PST' | 'MBOX' | 'OST'
  size_bytes: number;
  size_human: string;
  category: string;
}

export const ImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [archiveName, setArchiveName] = useState('');
  const [sourceType, setSourceType] = useState<'pst' | 'mbox' | 'eml_folder'>('mbox');
  const [sourcePath, setSourcePath] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgressEvent | null>(null);

  // Auto-discovery state
  const [discoveredList, setDiscoveredList] = useState<DiscoveredMailbox[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

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

  // Avvia scansione automatica
  const handleAutoScan = async () => {
    setIsScanning(true);
    setHasScanned(false);
    try {
      const results: DiscoveredMailbox[] = await invoke('scan_for_importable_mailboxes');
      setDiscoveredList(results || []);
      setHasScanned(true);
    } catch (e) {
      console.error('Errore durante scansione automatica dischi:', e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectDiscovered = (item: DiscoveredMailbox) => {
    setSourcePath(item.path);
    const lowerFmt = item.format.toLowerCase();
    if (lowerFmt === 'pst' || lowerFmt === 'ost') {
      setSourceType('pst');
    } else {
      setSourceType('mbox');
    }
    const cleanName = item.name.replace(/\.(mbox|pst|ost)$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    setArchiveName(`Archivio_${cleanName}`);
  };

  const handleSelectFile = async () => {
    const selected = await open({
      multiple: false,
      directory: sourceType === 'eml_folder',
      filters: sourceType === 'pst' ? [{ name: 'Outlook PST', extensions: ['pst', 'ost'] }] : undefined,
    });
    if (selected && typeof selected === 'string') {
      setSourcePath(selected);
      const name = selected.split('/').pop() || 'Archivio';
      setArchiveName(`Archivio_${name.replace(/\.(mbox|pst|ost)$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_')}`);
    }
  };

  const handleStartImport = async () => {
    if (!archiveName || !sourcePath) return;
    setIsImporting(true);
    try {
      await invoke('create_archive_vault_and_import', {
        archiveName,
        sourceType,
        sourcePath,
        mboxVariant: 'auto',
      });
      setTimeout(() => {
        setIsImporting(false);
        onSuccess();
        onClose();
      }, 1500);
    } catch (e) {
      console.error('Errore avvio importazione:', e);
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const filteredDiscovered = discoveredList.filter((d) =>
    d.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    d.path.toLowerCase().includes(filterQuery.toLowerCase()) ||
    d.category.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="bg-white border border-slate-200/90 w-full max-w-2xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Importa Archivio Storico Mailbox</h2>
              <p className="text-xs text-slate-500">Ricerca automatica su dischi interni/esterni o selezione manuale</p>
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
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Sezione Scansione Automatica */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center space-x-2">
                  <FolderSearch className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Ricerca Automatica nei Dischi (PST, MBOX, Apple Mail, Outlook)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoScan}
                  disabled={isScanning}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Scansione dischi in corso...' : 'Avvia Scansione Automatica'}</span>
                </button>
              </div>

              {hasScanned && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Trovate <strong>{discoveredList.length}</strong> caselle su computer e dischi esterni:</span>
                    <input
                      type="text"
                      placeholder="Filtra caselle..."
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      className="px-2 py-0.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-1.5 bg-white">
                    {filteredDiscovered.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">Nessuna casella corrispondente</div>
                    ) : (
                      filteredDiscovered.map((item, idx) => {
                        const isSelected = sourcePath === item.path;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleSelectDiscovered(item)}
                            className={`p-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all border ${
                              isSelected
                                ? 'bg-amber-50 border-amber-400 shadow-xs'
                                : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 truncate flex-1 pr-3">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.format === 'PST' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {item.format}
                              </span>
                              <div className="truncate">
                                <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                                <div className="text-[10px] text-slate-400 truncate">{item.path}</div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                {item.size_human}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectDiscovered(item);
                                }}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {isSelected ? 'Selezionato' : 'Scegli'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dettagli Importazione */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Percorso File / Cartella Selezionata
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={sourcePath}
                    placeholder="Seleziona dalla lista sopra o clicca Sfoglia..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs truncate"
                  />
                  <button
                    type="button"
                    onClick={handleSelectFile}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-medium transition-colors shrink-0"
                  >
                    Sfoglia Manuale...
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Nome del Nuovo Vault Archivio</label>
                  <input
                    type="text"
                    value={archiveName}
                    onChange={(e) => setArchiveName(e.target.value)}
                    placeholder="es. Archivio_MPA_2024"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Formato</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['pst', 'mbox', 'eml_folder'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setSourceType(t); }}
                        className={`py-2 text-[11px] font-semibold rounded-xl border transition-all ${
                          sourceType === t
                            ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {t === 'eml_folder' ? 'EML' : t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Azioni */}
            <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100 shrink-0">
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
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Avvia Ingestione in AP Mail</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-6 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
            <div>
              <div className="text-sm font-bold text-slate-900">Ingestione Archivio in Corso...</div>
              <p className="text-xs text-slate-500 mt-1">Creazione contenitore forense e indicizzazione a zero-RAM</p>
            </div>
            <div className="text-xs font-mono text-amber-800 bg-amber-50 py-2 px-3 rounded-xl border border-amber-200 inline-block">
              {sourcePath}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
