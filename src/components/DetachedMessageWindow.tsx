import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AttachmentItem } from '../types/mail';
import { 
  Archive, 
  Trash2, 
  Reply, 
  ReplyAll, 
  Forward, 
  Printer, 
  Flag, 
  FolderInput, 
  Scale, 
  ShieldCheck, 
  Building2, 
  Download, 
  FileCheck2,
  Folder,
  Sparkles
} from 'lucide-react';
import { LegalEmlExportModal, EmlExportData } from './LegalEmlExportModal';
import { LegalSuitePlusModal } from './LegalSuitePlusModal';

interface Props {
  workspaceId: string;
  messageId: number;
}

export const DetachedMessageWindow: React.FC<Props> = ({ workspaceId, messageId }) => {
  const [details, setDetails] = useState<any>(null);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [bodyHtml, setBodyHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [exportModalData, setExportModalData] = useState<EmlExportData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [isLegalSuiteOpen, setIsLegalSuiteOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Assicurati che lo stato sia marcato come letto all'apertura
    invoke('toggle_message_read_status', {
      workspaceId,
      messageId,
      isRead: true,
    }).catch(console.error);

    invoke('get_message_details', {
      workspaceId,
      messageId,
    })
      .then((res: any) => {
        setDetails(res);
        setIsFlagged(!!res.is_flagged);
        setAttachments(res.attachments || []);
        setBodyHtml(
          res.body_html ||
            `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; white-space: pre-wrap; color: #1e293b; padding: 28px; line-height: 1.6; font-size: 14px;">${res.body_text || ''}</div>`
        );
      })
      .catch((err) => {
        console.error("Errore recupero dettagli messaggio:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [workspaceId, messageId]);

  const handlePrint = () => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      window.print();
    }
  };

  const handleExportEml = async () => {
    setIsExporting(true);
    try {
      const res = await invoke<EmlExportData>('export_message_eml', {
        workspaceId,
        messageId,
        targetDir: null,
      });
      setExportModalData(res);
    } catch (err) {
      console.error("Errore esportazione EML per deposito:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleFlag = async () => {
    const nextFlag = !isFlagged;
    setIsFlagged(nextFlag);
    try {
      await invoke('toggle_message_flag_status', {
        workspaceId,
        messageId,
        isFlagged: nextFlag,
      });
    } catch (e) {
      console.error("Errore toggle flag:", e);
    }
  };

  if (loading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 font-sans">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <span className="text-xs font-semibold">Caricamento messaggio in corso...</span>
      </div>
    );
  }

  const subject = details?.subject || '(Nessun Oggetto)';
  const senderName = details?.sender_name || details?.sender_address || 'Mittente sconosciuto';
  const senderAddress = details?.sender_address || '';
  const recipient = details?.recipient || 'Alessandro Patanè';
  const folderName = details?.folder_name || 'In entrata';
  const accountEmail = details?.account_email || 'Exchange';
  const isPec = details?.is_pec || false;

  // Formattazione data orario stile Apple Mail
  let timeOrDate = '';
  if (details?.date_iso) {
    const d = new Date(details.date_iso);
    const today = new Date();
    const isSameDay = d.toDateString() === today.toDateString();
    if (isSameDay) {
      timeOrDate = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } else {
      timeOrDate = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-[#fbfcfd] text-slate-800 font-sans select-text overflow-hidden">
      
      {/* 1. TOP TOOLBAR STILE NATIVO APPLE MAIL (Con supporto drag region macOS) */}
      <div 
        data-tauri-drag-region
        className="h-11 px-4 bg-slate-100/90 border-b border-slate-200/90 flex items-center justify-between select-none shrink-0"
      >
        {/* Gruppo Azioni Sinistra (con padding a sinistra per traffic lights macOS se overlay) */}
        <div className="flex items-center space-x-1 pl-18">
          <button
            title="Archivia messaggio"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
          >
            <Archive className="w-4 h-4 stroke-[1.6]" />
          </button>
          <button
            title="Sposta nel cestino"
            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4 stroke-[1.6]" />
          </button>
          
          <div className="h-4 w-px bg-slate-300 mx-1"></div>

          <button
            title="Rispondi"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
          >
            <Reply className="w-4 h-4 stroke-[1.6]" />
          </button>
          <button
            title="Rispondi a tutti"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
          >
            <ReplyAll className="w-4 h-4 stroke-[1.6]" />
          </button>
          <button
            title="Inoltra"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
          >
            <Forward className="w-4 h-4 stroke-[1.6]" />
          </button>
        </div>

        {/* Gruppo Azioni Destra */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsLegalSuiteOpen(true)}
            title="AP Suite PLUS: Analisi Forense AI, Termini Cartabia, Interessi e Parcelle"
            className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-md text-[11px] flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer mr-1 group"
          >
            <Sparkles className="w-3.5 h-3.5 transition-transform group-hover:rotate-12" />
            <span>✦ Suite PLUS</span>
          </button>

          <button
            onClick={handleExportEml}
            disabled={isExporting}
            title="Salva file .EML con impronta SHA-256 e conformità CAD per depositi telematici (PCT/PAT/PTT)"
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-md text-[11px] flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer mr-1"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Esportazione...' : 'Salva .EML Deposito'}</span>
          </button>

          <button
            onClick={handlePrint}
            title="Stampa messaggio o esporta PDF"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 stroke-[1.6]" />
          </button>

          <button
            onClick={handleToggleFlag}
            title={isFlagged ? "Rimuovi contrassegno" : "Contrassegna come importante"}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isFlagged 
                ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
            }`}
          >
            <Flag className={`w-4 h-4 stroke-[1.6] ${isFlagged ? 'fill-rose-600 text-rose-600' : ''}`} />
          </button>

          <button
            title="Sposta in un'altra cartella"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
          >
            <FolderInput className="w-4 h-4 stroke-[1.6]" />
          </button>
        </div>
      </div>

      {/* 2. SUB-BAR SOTTO LA TOOLBAR (Stile Apple Mail con anteprima centrata) */}
      <div 
        data-tauri-drag-region
        className="py-1 px-4 text-center text-[11px] text-slate-500 bg-slate-50/70 border-b border-slate-200/60 truncate select-none shrink-0"
      >
        <span className="font-medium text-slate-700">{subject}</span>
        <span className="mx-1.5 text-slate-400">-</span>
        <span>{folderName} ({accountEmail})</span>
      </div>

      {/* 3. INTESTAZIONE MESSAGGIO NATIVO (Avatar, Mittente, Oggetto, Destinatario, Cartella, Orario) */}
      <div className="px-6 py-4 bg-white border-b border-slate-200/70 shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3.5">
            {/* Avatar / Icona Istituzionale o Profilo */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-sky-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
              {isPec ? (
                <ShieldCheck className="w-5 h-5 text-amber-300" />
              ) : senderName.toLowerCase().includes('universit') || senderName.toLowerCase().includes('scuola') ? (
                <Building2 className="w-5 h-5 text-white" />
              ) : (
                <span className="text-base font-semibold">{senderName.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="min-w-0">
              {/* Riga 1: Nome Mittente */}
              <div className="text-[14px] font-bold text-slate-950 flex items-center space-x-2">
                <span>{senderName}</span>
                {senderAddress && (
                  <span className="text-[11px] text-slate-400 font-normal font-mono">
                    &lt;{senderAddress}&gt;
                  </span>
                )}
              </div>

              {/* Riga 2: Oggetto Principale */}
              <h1 className="text-[15px] font-bold text-slate-900 tracking-tight mt-0.5 leading-snug">
                {subject}
              </h1>

              {/* Riga 3: Destinatari */}
              <div className="text-[12px] text-slate-500 mt-1 flex items-center space-x-1">
                <span className="text-slate-400">A:</span>
                <span className="text-slate-800 font-medium">{recipient}</span>
              </div>
            </div>
          </div>

          {/* Destra: Cartella e Orario */}
          <div className="text-right shrink-0 ml-4 flex flex-col items-end">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <Folder className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-700">{folderName} - {accountEmail}</span>
            </div>
            <div className="text-[12px] text-slate-400 mt-1 font-mono">
              {timeOrDate}
            </div>
          </div>
        </div>

        {/* Banner PEC AgID se Posta Certificata */}
        {isPec && (
          <div className="mt-3.5 p-2.5 bg-amber-500/10 border border-amber-300/80 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <span className="font-bold text-amber-950">Messaggio di Posta Elettronica Certificata (PEC)</span>
                <span className="text-amber-800/80 text-[11px] ml-2 font-mono">
                  {details?.pec_type || 'POSTA_CERTIFICATA'}
                </span>
                {details?.pec_identificativo && (
                  <span className="text-amber-800/70 text-[10px] ml-2 font-mono block">
                    ID AgID: {details.pec_identificativo}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleExportEml}
              className="text-[11px] bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 px-2.5 py-1 rounded-md font-semibold cursor-pointer shadow-2xs"
            >
              Verifica Impronta SHA-256
            </button>
          </div>
        )}
      </div>

      {/* 4. LISTA DOCUMENTI ALLEGATI (Se presenti) */}
      {attachments.length > 0 && (
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap gap-2 select-none shrink-0">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 shadow-2xs hover:border-slate-300 transition-colors"
            >
              {att.is_p7m ? (
                <span title="Busta con firma digitale CAdES (.p7m)"><FileCheck2 className="w-4 h-4 text-amber-600" /></span>
              ) : (
                <Download className="w-4 h-4 text-slate-400" />
              )}
              <span className="truncate max-w-[220px] font-medium">{att.filename}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({(att.size_bytes / 1024).toFixed(0)} KB)
              </span>
              <button
                onClick={() => invoke('open_or_export_attachment', { workspaceId, attachmentId: att.id })}
                className="text-amber-700 hover:text-amber-800 font-bold ml-1 hover:underline cursor-pointer"
              >
                Apri
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 5. CORPO EMAIL HTML (Rendering a tutto schermo con isolamento sicuro) */}
      <div className="flex-1 overflow-hidden bg-white flex flex-col">
        <iframe
          srcDoc={bodyHtml}
          sandbox="allow-same-origin allow-popups"
          title="Contenuto Messaggio"
          className="w-full h-full border-none"
        />
      </div>

      {/* Modal Esportazione Deposito Telematico PCT con Impronta SHA-256 */}
      <LegalEmlExportModal
        data={exportModalData}
        onClose={() => setExportModalData(null)}
        workspaceId={workspaceId}
        messageId={messageId}
      />

      {/* Modal AP Suite PLUS Forense */}
      <LegalSuitePlusModal
        isOpen={isLegalSuiteOpen}
        onClose={() => setIsLegalSuiteOpen(false)}
        presetSubject={subject}
        presetText={details?.body_text || ''}
      />
    </div>
  );
};
