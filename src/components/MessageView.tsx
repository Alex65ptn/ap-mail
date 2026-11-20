import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { AttachmentItem } from '../types/mail';
import { ShieldCheck, Download, FileCheck2, FileCode, Reply, Forward, RotateCcw, Printer, CalendarPlus, ExternalLink, Scale, Mail, MailOpen, Sparkles } from 'lucide-react';
import { LegalEmlExportModal, EmlExportData } from './LegalEmlExportModal';

interface Props {
  onComposeAction?: (data: { to?: string; subject?: string; body?: string; draftId?: number }) => void;
  onAddToCalendar?: (message: any) => void;
  onOpenLegalSuitePlus?: (data?: { subject?: string; body?: string }) => void;
}

export const MessageView: React.FC<Props> = ({ onComposeAction, onAddToCalendar, onOpenLegalSuitePlus }) => {
  const { activeWorkspaceId, selectedMessage, setSelectedMessage } = useWorkspaceStore();
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [bodyText, setBodyText] = useState<string>('');
  const [bodyHtml, setBodyHtml] = useState<string>('');
  const [exportModalData, setExportModalData] = useState<EmlExportData | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!selectedMessage || !activeWorkspaceId) return;

    invoke('get_message_details', {
      workspaceId: activeWorkspaceId,
      messageId: selectedMessage.id,
    }).then((res: any) => {
      setAttachments(res.attachments || []);
      setBodyText(res.body_text || '');
      setBodyHtml(res.body_html || `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; white-space: pre-wrap; color: #1e293b; padding: 20px; line-height: 1.6; font-size: 14px;">${res.body_text || ''}</div>`);
    }).catch((err) => {
      console.error("Errore recupero dettagli:", err);
    });
  }, [selectedMessage, activeWorkspaceId]);

  if (!selectedMessage) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center text-slate-400 text-sm select-none bg-slate-50/40">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200/80 p-2.5 shadow-sm flex items-center justify-center mb-3">
          <img src="/logo.png" alt="AP Consulting" className="w-11 h-11 object-contain opacity-85" />
        </div>
        <span className="font-medium text-slate-500">Seleziona un messaggio per visualizzarne il contenuto</span>
        <span className="text-xs text-slate-400 mt-1">AP Mail — Gestione Posta & PEC Forense</span>
      </div>
    );
  }

  const handleReply = () => {
    if (!onComposeAction || !selectedMessage) return;
    const subj = selectedMessage.subject || '';
    const cleanSubj = subj.toLowerCase().startsWith('re:') ? subj : `Re: ${subj}`;
    const dateFormatted = selectedMessage.date_utc ? new Date(selectedMessage.date_utc).toLocaleString('it-IT') : '';
    const quote = `\n\n\n--- Messaggio Originale ---\nDa: ${selectedMessage.sender_name || ''} <${selectedMessage.from_addr}>\nData: ${dateFormatted}\nOggetto: ${subj}\n\n${bodyText}`;
    onComposeAction({
      to: selectedMessage.from_addr,
      subject: cleanSubj,
      body: quote,
    });
  };

  const handleForward = () => {
    if (!onComposeAction || !selectedMessage) return;
    const subj = selectedMessage.subject || '';
    const cleanSubj = subj.toLowerCase().startsWith('fwd:') ? subj : `Fwd: ${subj}`;
    const dateFormatted = selectedMessage.date_utc ? new Date(selectedMessage.date_utc).toLocaleString('it-IT') : '';
    const quote = `\n\n\n--- Messaggio Inoltrato ---\nDa: ${selectedMessage.sender_name || ''} <${selectedMessage.from_addr}>\nData: ${dateFormatted}\nOggetto: ${subj}\n\n${bodyText}`;
    onComposeAction({
      to: '',
      subject: cleanSubj,
      body: quote,
    });
  };

  const handleResend = () => {
    if (!onComposeAction || !selectedMessage) return;
    onComposeAction({
      to: selectedMessage.from_addr,
      subject: selectedMessage.subject || '',
      body: bodyText,
      draftId: selectedMessage.id,
    });
  };

  const handlePrint = () => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      window.print();
    }
  };

  const handleOpenExternal = async () => {
    if (!selectedMessage || !activeWorkspaceId) return;
    try {
      await invoke('open_message_external', {
        workspaceId: selectedMessage.workspace_id || activeWorkspaceId,
        messageId: selectedMessage.id,
      });
    } catch (err) {
      console.error("Errore apertura messaggio fuori dal client:", err);
    }
  };

  const handleExportEml = async () => {
    if (!selectedMessage || !activeWorkspaceId) return;
    setIsExporting(true);
    try {
      const res = await invoke<EmlExportData>('export_message_eml', {
        workspaceId: selectedMessage.workspace_id || activeWorkspaceId,
        messageId: selectedMessage.id,
        targetDir: null,
      });
      setExportModalData(res);
    } catch (err) {
      console.error("Errore esportazione EML per deposito:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleRead = async () => {
    if (!selectedMessage || !activeWorkspaceId) return;
    const newStatus = !selectedMessage.is_read;
    setSelectedMessage({ ...selectedMessage, is_read: newStatus });
    try {
      await invoke('toggle_message_read_status', {
        workspaceId: selectedMessage.workspace_id || activeWorkspaceId,
        messageId: selectedMessage.id,
        isRead: newStatus,
      });
    } catch (err) {
      console.error("Errore modifica stato lettura:", err);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-white overflow-hidden">
      {/* Header Email Executive con Barra Azioni */}
      <div className="p-5 border-b border-slate-200/80 bg-white">
        
        {/* Barra Strumenti Azioni Rapide: Rispondi, Inoltra, Reinvia, Apri Fuori, Salva EML, Stampa */}
        <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100 flex-wrap">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReply}
              title="Rispondi al mittente"
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Reply className="w-3.5 h-3.5" />
              <span>Rispondi</span>
            </button>

            <button
              onClick={handleForward}
              title="Inoltra questa email ad altri destinatari"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-colors border border-slate-200 cursor-pointer"
            >
              <Forward className="w-3.5 h-3.5 text-slate-600" />
              <span>Inoltra</span>
            </button>

            <button
              onClick={handleResend}
              title="Spedisci di nuovo questo messaggio"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-colors border border-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span>Reinvia</span>
            </button>

            <button
              onClick={handleToggleRead}
              title={selectedMessage.is_read ? "Segna come NON LETTO (visto/non visto)" : "Segna come LETTO"}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-colors border border-slate-200 cursor-pointer"
            >
              {selectedMessage.is_read ? <Mail className="w-3.5 h-3.5 text-blue-600" /> : <MailOpen className="w-3.5 h-3.5 text-slate-500" />}
              <span>{selectedMessage.is_read ? "Segna non letto" : "Segna letto"}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tasto Apri Fuori dal Client (Finestra Esterna macOS) */}
            <button
              onClick={handleOpenExternal}
              title="Apri questo messaggio fuori dal client in una finestra nativa separata a schermo intero"
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Apri Fuori dal Client</span>
            </button>

            {/* Tasto AP Suite PLUS (AI Forense, Termini Cartabia, Interessi & Parcelle) */}
            {onOpenLegalSuitePlus && (
              <button
                onClick={() => onOpenLegalSuitePlus({ subject: selectedMessage.subject, body: bodyText })}
                title="✦ AP Suite PLUS: Analisi Forense AI offline, Scadenze Cartabia, Interessi Legali e Parcelle"
                className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer group"
              >
                <Sparkles className="w-3.5 h-3.5 transition-transform group-hover:rotate-12" />
                <span>✦ Suite PLUS</span>
              </button>
            )}

            {/* Tasto Salva .EML per Deposito Telematico PCT */}
            <button
              onClick={handleExportEml}
              disabled={isExporting}
              title="Salva file .EML nativo con impronta SHA-256 e attestazione per deposito telematico (PCT/PAT)"
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Esportazione...' : 'Salva .EML per Deposito'}</span>
            </button>

            {onAddToCalendar && (
              <button
                onClick={() => onAddToCalendar(selectedMessage)}
                title="Crea evento o scadenza in calendario da questa email/PEC"
                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-colors border border-amber-200 shadow-2xs cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-amber-700" />
                <span>Scadenzario</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              title="Stampa messaggio o salva come PDF"
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 font-medium rounded-lg text-xs flex items-center space-x-1.5 transition-colors border border-slate-200 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Stampa / PDF</span>
            </button>
          </div>
        </div>

        <h1 className="text-base font-bold text-slate-900 tracking-tight mb-2.5">
          {selectedMessage.subject || '(Nessun Oggetto)'}
        </h1>
        
        <div className="flex justify-between items-start text-xs text-slate-500">
          <div>
            <span className="text-slate-400">Mittente: </span>
            <span className="text-slate-900 font-semibold">{selectedMessage.sender_name} </span>
            <span className="text-slate-500 font-mono">&lt;{selectedMessage.from_addr}&gt;</span>
          </div>
          <div className="font-medium text-slate-400">
            {selectedMessage.date_utc ? new Date(selectedMessage.date_utc).toLocaleString('it-IT') : ''}
          </div>
        </div>

        {/* Sigillo / Banner Metadati Legali PEC */}
        {selectedMessage.is_pec && (
          <div className="mt-3.5 p-3 bg-gradient-to-r from-amber-50/90 to-amber-50/40 border border-amber-200/70 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-800">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-950">
                  Messaggio di Posta Elettronica Certificata ({selectedMessage.pec_type})
                </div>
                <div className="text-[10px] text-amber-800/80 font-mono">
                  Identificativo AgID: {selectedMessage.pec_identificativo || 'Incluso nei metadati certificati'}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => invoke('export_legal_evidence', { workspaceId: activeWorkspaceId, messageId: selectedMessage.id })}
              className="px-3 py-1.5 bg-white hover:bg-amber-100/50 text-amber-900 rounded-lg text-xs flex items-center space-x-1.5 transition-colors border border-amber-300 font-semibold shadow-xs"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-700" />
              <span>Esporta Busta & XML</span>
            </button>
          </div>
        )}
      </div>

      {/* Lista Documenti Allegati con supporto CAdES P7M */}
      {attachments.length > 0 && (
        <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap gap-2 select-none">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 shadow-2xs hover:border-slate-300 transition-colors"
            >
              {att.is_p7m ? (
                <span title="Firmato CAdES (.p7m)"><FileCheck2 className="w-4 h-4 text-amber-600" /></span>
              ) : (
                <Download className="w-4 h-4 text-slate-400" />
              )}
              <span className="truncate max-w-[220px] font-medium">{att.filename}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({(att.size_bytes / 1024).toFixed(0)} KB)
              </span>
              <button
                onClick={() => invoke('open_or_export_attachment', { workspaceId: activeWorkspaceId, attachmentId: att.id })}
                className="text-amber-700 hover:text-amber-800 font-bold ml-1 hover:underline"
              >
                Apri
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Iframe Contenuto Email Sandboxed */}
      <div className="flex-1 p-5 overflow-y-auto bg-white">
        <iframe
          srcDoc={bodyHtml}
          sandbox="allow-same-origin"
          title="Messaggio"
          className="w-full h-full border-none rounded-lg"
        />
      </div>

      {/* Modal Esportazione Deposito Telematico PCT */}
      <LegalEmlExportModal
        data={exportModalData}
        onClose={() => setExportModalData(null)}
        workspaceId={selectedMessage.workspace_id || activeWorkspaceId || ''}
        messageId={selectedMessage.id}
      />
    </div>
  );
};
