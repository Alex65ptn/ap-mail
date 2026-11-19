import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { AttachmentItem } from '../types/mail';
import { ShieldCheck, Download, FileCheck2, FileCode } from 'lucide-react';

export const MessageView: React.FC = () => {
  const { activeWorkspaceId, selectedMessage } = useWorkspaceStore();
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [bodyHtml, setBodyHtml] = useState<string>('');

  useEffect(() => {
    if (!selectedMessage || !activeWorkspaceId) return;

    invoke('get_message_details', {
      workspaceId: activeWorkspaceId,
      messageId: selectedMessage.id,
    }).then((res: any) => {
      setAttachments(res.attachments || []);
      setBodyHtml(res.body_html || `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; white-space: pre-wrap; color: #1e293b; padding: 20px; line-height: 1.6; font-size: 14px;">${res.body_text || ''}</div>`);
    }).catch((err) => {
      console.error("Errore recupero dettagli:", err);
    });
  }, [selectedMessage, activeWorkspaceId]);

  if (!selectedMessage) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center text-slate-400 text-sm select-none bg-slate-50/40">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200/80 p-3 shadow-sm flex items-center justify-center mb-3">
          <img src="/logo.png" alt="AP Mail" className="w-10 h-10 object-contain opacity-60" />
        </div>
        <span className="font-medium text-slate-500">Seleziona un messaggio per visualizzarne il contenuto</span>
        <span className="text-xs text-slate-400 mt-1">AP Mail — Gestione Posta & PEC Forense</span>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-white overflow-hidden">
      {/* Header Email Executive */}
      <div className="p-5 border-b border-slate-200/80 bg-white">
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
                <FileCheck2 className="w-4 h-4 text-amber-600" title="Firmato CAdES (.p7m)" />
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
    </div>
  );
};
