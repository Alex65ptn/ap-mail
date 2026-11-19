import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { X, Send, ShieldCheck, Paperclip, AlertCircle, Save, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { workspaces, activeWorkspaceId, triggerRefresh } = useWorkspaceStore();
  const currentWs = workspaces.find((w) => w.workspace_id === activeWorkspaceId);

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null);
  const [draftSavedToast, setDraftSavedToast] = useState(false);

  // Chiave storage univoca per la casella attiva
  const draftStorageKey = activeWorkspaceId ? `ap_mail_draft_${activeWorkspaceId}` : null;

  // 1. Ripristina la bozza non appena si apre la modale
  useEffect(() => {
    if (isOpen && draftStorageKey) {
      try {
        const saved = localStorage.getItem(draftStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.to) setTo(parsed.to);
          if (parsed.subject) setSubject(parsed.subject);
          if (parsed.body) setBody(parsed.body);
          if (parsed.timestamp) {
            const d = new Date(parsed.timestamp);
            setLastAutoSavedTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`);
          }
        }
      } catch (e) {
        console.error('Errore ripristino bozza:', e);
      }
    }
  }, [isOpen, draftStorageKey]);

  // 2. Salvataggio automatico continuo in locale ad ogni digitazione
  useEffect(() => {
    if (!draftStorageKey || (!to && !subject && !body)) return;

    const timer = setTimeout(() => {
      try {
        const payload = {
          to,
          subject,
          body,
          timestamp: Date.now(),
        };
        localStorage.setItem(draftStorageKey, JSON.stringify(payload));
        const now = new Date();
        setLastAutoSavedTime(
          `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
        );
      } catch (e) {
        console.error('Errore salvataggio automatico bozza:', e);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [to, subject, body, draftStorageKey]);

  if (!isOpen) return null;

  // 3. Salvataggio esplicito come Bozza nel Vault CAS / DB
  const handleSaveDraftExplicitly = async () => {
    if (!activeWorkspaceId) return;
    setIsSavingDraft(true);
    setErrorMsg(null);

    try {
      await invoke('save_draft_email', {
        params: {
          workspace_id: activeWorkspaceId,
          to: to.trim(),
          subject: subject.trim() || '(Bozza)',
          body: body.trim(),
        },
      });

      // Salva anche nel localStorage
      if (draftStorageKey) {
        localStorage.setItem(
          draftStorageKey,
          JSON.stringify({ to, subject, body, timestamp: Date.now() })
        );
      }

      setDraftSavedToast(true);
      setTimeout(() => setDraftSavedToast(false), 2500);
      triggerRefresh();
      onSuccess(); // Ricarica cartelle per aggiornare conteggio Bozze
    } catch (err: any) {
      setErrorMsg(typeof err === 'string' ? err : err?.message || 'Errore salvataggio bozza');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // 4. Invio messaggio
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) {
      setErrorMsg('Nessuna casella attiva selezionata.');
      return;
    }
    if (!to.trim()) {
      setErrorMsg('Inserisci un indirizzo destinatario valido.');
      return;
    }

    setIsSending(true);
    setErrorMsg(null);

    try {
      await invoke('send_or_save_email', {
        params: {
          workspace_id: activeWorkspaceId,
          to: to.trim(),
          subject: subject.trim() || '(Nessun oggetto)',
          body: body.trim(),
        },
      });

      // Solo dopo che l'invio è confermato dal server, eliminiamo la bozza
      if (draftStorageKey) {
        localStorage.removeItem(draftStorageKey);
      }
      setTo('');
      setSubject('');
      setBody('');
      triggerRefresh();
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(typeof err === 'string' ? err : err?.message || 'Errore durante l\'invio del messaggio.');
    } finally {
      setIsSending(false);
    }
  };

  const isPec = currentWs?.is_pec;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modale */}
        <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPec ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
              {isPec ? <ShieldCheck className="w-4 h-4 text-amber-700" /> : <Send className="w-4 h-4 text-slate-700" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {isPec ? 'Nuovo Messaggio PEC Certificato' : 'Nuovo Messaggio Email'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Da: <span className="font-semibold text-slate-700">{currentWs?.email_address || currentWs?.name || 'Casella corrente'}</span>
                {lastAutoSavedTime && (
                  <span className="ml-2 text-emerald-600 font-medium">
                    • Salvato autom. {lastAutoSavedTime}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Invio */}
        <form onSubmit={handleSend} className="p-6 flex-1 flex flex-col space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {draftSavedToast && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Bozza archiviata con successo nel Vault e nella cartella Bozze.</span>
            </div>
          )}

          {/* Campo Destinatario */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              A (Destinatario)
            </label>
            <input
              type="email"
              required
              placeholder={isPec ? "destinatario@pec.it" : "destinatario@dominio.com"}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Campo Oggetto */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Oggetto
            </label>
            <input
              type="text"
              placeholder="Inserisci l'oggetto del messaggio..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Corpo del Messaggio */}
          <div className="flex-1 flex flex-col min-h-[220px]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Messaggio
            </label>
            <textarea
              required
              rows={9}
              placeholder="Scrivi qui il contenuto della tua comunicazione..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full flex-1 px-3.5 py-3 text-xs leading-relaxed rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-slate-900 placeholder:text-slate-400 resize-none font-sans"
            />
          </div>

          {/* Footer Azioni */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                <span>Allega file</span>
              </button>

              <button
                type="button"
                onClick={handleSaveDraftExplicitly}
                disabled={isSavingDraft || (!to && !subject && !body)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors border border-slate-200 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>{isSavingDraft ? 'Salvataggio...' : 'Salva Bozza'}</span>
              </button>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Chiudi
              </button>
              <button
                type="submit"
                disabled={isSending}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center space-x-2 transition-all ${
                  isPec
                    ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-600/20'
                    : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
                } disabled:opacity-50`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Invio in corso...' : isPec ? 'Invia PEC' : 'Invia Messaggio'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
