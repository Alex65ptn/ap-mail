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
      setBodyHtml(res.body_html || `<div style="font-family: system-ui, sans-serif; white-space: pre-wrap; color: #334155; padding: 16px;">${res.body_text || ''}</div>`);
    }).catch((err) => {
      console.error("Errore recupero dettagli:", err);
    });
  }, [selectedMessage, activeWorkspaceId]);

  if (!selectedMessage) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center text-slate-500 text-sm select-none">
        <img src="/logo.png" alt="AP Mail" className="w-16 h-16 opacity-30 mb-3 object-contain" />
        <span>Seleziona un messaggio per visualizzarne il contenuto</span>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Header Email */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/40">
        <h1 className="text-base font-bold text-slate-100 mb-2">{selectedMessage.subject || '(Nessun Oggetto)'}</h1>
        
        <div className="flex justify-between items-start text-xs text-slate-400">
          <div>
            <span className="text-slate-500">Da: </span>
            <span className="text-slate-200 font-medium">{selectedMessage.sender_name} </span>
            <span className="text-slate-400">&lt;{selectedMessage.from_addr}&gt;</span>
          </div>
          <div>{selectedMessage.date_utc ? new Date(selectedMessage.date_utc).toLocaleString('it-IT') : ''}</div>
        </div>

        {/* Banner Metadati Legali PEC */}
        {selectedMessage.is_pec && (
          <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-xs font-semibold text-amber-200">
                  Posta Elettronica Certificata ({selectedMessage.pec_type})
                </div>
                <div className="text-[10px] text-amber-300/80 font-mono">
                  Identificativo: {selectedMessage.pec_identificativo || 'N/A'}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => invoke('export_legal_evidence', { workspaceId: activeWorkspaceId, messageId: selectedMessage.id })}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded text-xs flex items-center space-x-1.5 transition-colors border border-amber-500/40 font-medium"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Esporta Busta & XML</span>
            </button>
          </div>
        )}
      </div>

      {/* Lista Allegati con supporto P7M CAdES */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex flex-wrap gap-2 select-none">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center space-x-2 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/80 text-xs text-slate-300"
            >
              {att.is_p7m ? (
                <FileCheck2 className="w-4 h-4 text-amber-400" title="Firmato CAdES (.p7m)" />
              ) : (
                <Download className="w-4 h-4 text-slate-400" />
              )}
              <span className="truncate max-w-[200px] font-medium">{att.filename}</span>
              <span className="text-[10px] text-slate-500">
                ({(att.size_bytes / 1024).toFixed(0)} KB)
              </span>
              <button
                onClick={() => invoke('open_or_export_attachment', { workspaceId: activeWorkspaceId, attachmentId: att.id })}
                className="text-amber-400 hover:text-amber-300 font-semibold ml-1"
              >
                Apri
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Corpo Email protetto in iframe sandboxed */}
      <div className="flex-1 p-4 overflow-y-auto bg-white">
        <iframe
          srcDoc={bodyHtml}
          sandbox="allow-same-origin"
          title="Messaggio"
          className="w-full h-full border-none"
        />
      </div>
    </div>
  );
};
