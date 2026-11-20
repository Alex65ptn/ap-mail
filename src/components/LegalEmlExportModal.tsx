import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Scale, CheckCircle2, Copy, Check, FolderOpen, ExternalLink, X, ShieldCheck } from 'lucide-react';

export interface EmlExportData {
  success: boolean;
  file_path: string;
  filename: string;
  size_bytes: number;
  sha256_hash: string;
  date_iso: string;
  subject: string;
  sender: string;
  legal_attestation: string;
}

interface Props {
  data: EmlExportData | null;
  onClose: () => void;
  workspaceId: string;
  messageId: number;
}

export const LegalEmlExportModal: React.FC<Props> = ({ data, onClose, workspaceId, messageId }) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedAttestation, setCopiedAttestation] = useState(false);

  if (!data) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(data.sha256_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopyAttestation = () => {
    navigator.clipboard.writeText(data.legal_attestation);
    setCopiedAttestation(true);
    setTimeout(() => setCopiedAttestation(false), 2000);
  };

  const handleRevealInFinder = () => {
    invoke('reveal_vault_in_finder').catch(() => {});
  };

  const handleOpenExternal = () => {
    invoke('open_message_external', {
      workspaceId,
      messageId,
    }).catch((err) => console.error("Errore apertura esterna:", err));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Modal Executive */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between border-b border-slate-700/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base tracking-tight text-white">File .EML Pronto per il Deposito Telematico</h3>
                <span className="text-[10px] bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>CONFORME PCT / PAT</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Copia originale integra con intestazioni MIME, firme PEC e allegati intatti
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Modal con Dettagli File & Impronta */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Card Info Principali File */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span>Nome File:</span>
              <span className="font-mono font-bold text-slate-900 select-all">{data.filename}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Destinazione salvataggio:</span>
              <span className="font-mono text-slate-700 truncate max-w-[400px] select-all" title={data.file_path}>
                {data.file_path}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Dimensione file:</span>
              <span className="font-medium text-slate-700">{(data.size_bytes / 1024).toFixed(1)} KB ({data.size_bytes} byte)</span>
            </div>
          </div>

          {/* Impronta Crittografica SHA-256 */}
          <div className="p-4 bg-amber-500/[0.06] border border-amber-300/70 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-slate-900 text-xs">Impronta Digitale di Hash SHA-256 (per Deposito & Notifiche)</span>
              </div>
              <button
                onClick={handleCopyHash}
                className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedHash ? 'Copiato!' : 'Copia SHA-256'}</span>
              </button>
            </div>
            <div className="font-mono text-[11px] text-slate-800 bg-white/80 p-2.5 rounded-lg border border-amber-200/80 break-all select-all font-semibold">
              {data.sha256_hash}
            </div>
          </div>

          {/* Attestazione di Conformità ex art. 19-ter CAD */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs">
                Attestazione di Conformità (Art. 19-ter CAD & D.L. 179/2012)
              </span>
              <button
                onClick={handleCopyAttestation}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg flex items-center space-x-1.5 transition-colors border border-slate-300 shadow-2xs cursor-pointer"
              >
                {copiedAttestation ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAttestation ? 'Attestazione Copiata!' : 'Copia Testo per Relata/Atto'}</span>
              </button>
            </div>
            <textarea
              readOnly
              value={data.legal_attestation}
              rows={7}
              className="w-full p-3 font-mono text-[11px] bg-slate-900 text-slate-200 rounded-xl border border-slate-700/80 leading-relaxed resize-none focus:outline-none select-all"
            />
          </div>
        </div>

        {/* Footer con Azioni Rapide */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenExternal}
              title="Apri questo file .eml fuori dal client con l'applicazione di sistema macOS"
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs flex items-center space-x-1.5 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              <span>Apri Fuori dal Client</span>
            </button>

            <button
              onClick={handleRevealInFinder}
              title="Mostra la cartella del file nel Finder di macOS"
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs flex items-center space-x-1.5 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-600" />
              <span>Mostra nel Finder</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
};
