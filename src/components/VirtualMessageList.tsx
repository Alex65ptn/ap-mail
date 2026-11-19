import React, { useRef, useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { MessageItem } from '../types/mail';
import { Paperclip, ShieldAlert, ShieldCheck, Inbox, FileText, Send, Archive, Trash2, Mail } from 'lucide-react';

export const VirtualMessageList: React.FC = () => {
  const { 
    activeWorkspaceId, 
    activeFolderId, 
    searchQuery, 
    selectedMessage, 
    setSelectedMessage,
    refreshCounter,
    folders,
  } = useWorkspaceStore();
  
  const loadingRef = useRef(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);

  const currentFolder = folders.find((f) => f.id === activeFolderId);

  const getFolderIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('inbox') || lower.includes('arriv')) return <Inbox className="w-4 h-4 text-amber-600" />;
    if (lower.includes('sent') || lower.includes('inviat')) return <Send className="w-4 h-4 text-slate-600" />;
    if (lower.includes('draft') || lower.includes('bozz')) return <FileText className="w-4 h-4 text-amber-600" />;
    if (lower.includes('trash') || lower.includes('cestin')) return <Trash2 className="w-4 h-4 text-rose-500" />;
    if (lower.includes('archiv')) return <Archive className="w-4 h-4 text-slate-500" />;
    return <Mail className="w-4 h-4 text-slate-500" />;
  };

  const fetchMessages = useCallback(async () => {
    if (!activeWorkspaceId) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const res: { items: MessageItem[]; has_more: boolean } = await invoke('get_messages_keyset', {
        workspaceId: activeWorkspaceId,
        folderId: activeFolderId,
        query: searchQuery.trim() ? searchQuery.trim() : null,
        cursor: null,
        limit: 100,
      });

      setMessages(res.items || []);

      // Se c'è almeno un messaggio e nessuno è ancora selezionato, seleziona il primo in automatico
      if (res.items && res.items.length > 0 && !selectedMessage) {
        setSelectedMessage(res.items[0]);
      }
    } catch (err) {
      console.error('Errore recupero messaggi:', err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [activeWorkspaceId, activeFolderId, searchQuery, selectedMessage, setSelectedMessage]);

  useEffect(() => {
    fetchMessages();
  }, [activeWorkspaceId, activeFolderId, searchQuery, refreshCounter, fetchMessages]);

  return (
    <div className="w-[360px] min-w-[360px] max-w-[360px] shrink-0 border-r border-slate-200/80 h-full flex flex-col bg-white select-none">
      {/* Header Intestazione Lista */}
      <div className="px-4 py-3 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          {currentFolder ? getFolderIcon(currentFolder.name) : <Inbox className="w-4 h-4 text-amber-600" />}
          <span className="font-bold text-xs text-slate-900 truncate">
            {currentFolder ? (currentFolder.display_name || currentFolder.name) : 'Tutti i Messaggi'}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200/90 px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
          {messages.length} {messages.length === 1 ? 'messaggio' : 'messaggi'}
        </span>
      </div>

      {/* Corpo Lista */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading && messages.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-400 font-medium">
            Caricamento messaggi in corso...
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50/40">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 mb-3 shadow-xs">
              {currentFolder?.name.toLowerCase().includes('draft') || currentFolder?.name.toLowerCase().includes('bozz') ? (
                <FileText className="w-6 h-6" />
              ) : (
                <Inbox className="w-6 h-6" />
              )}
            </div>
            <div className="text-xs font-bold text-slate-800">
              {currentFolder ? `Nessun messaggio in "${currentFolder.display_name || currentFolder.name}"` : 'Nessun messaggio presente'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
              {currentFolder?.name.toLowerCase().includes('draft') || currentFolder?.name.toLowerCase().includes('bozz')
                ? 'I messaggi salvati come bozza compariranno qui.'
                : 'I messaggi scaricati o inviati compariranno qui.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelected = selectedMessage?.id === msg.id;
            return (
              <div
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className={`px-3.5 py-3 cursor-pointer flex flex-col justify-between transition-all border-l-3 ${
                  isSelected
                    ? 'bg-amber-500/[0.09] border-amber-500 shadow-2xs'
                    : 'hover:bg-slate-50/90 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={`truncate max-w-[190px] ${msg.is_read ? 'text-slate-600 font-normal' : 'text-slate-900 font-bold'}`}>
                    {msg.sender_name || msg.from_addr}
                  </span>
                  <span className="text-slate-400 text-[10px] font-medium shrink-0 ml-1">
                    {msg.date_utc ? new Date(msg.date_utc).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : ''}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 my-0.5">
                  {msg.is_pec && (
                    <span title={`PEC: ${msg.pec_type}`} className="shrink-0">
                      {msg.pec_type === 'AVVENUTA_CONSEGNA' || msg.pec_type === 'ACCETTAZIONE' ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ) : msg.pec_type === 'ERRORE_CONSEGNA' ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      ) : (
                        <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200/80 font-bold px-1 rounded">PEC</span>
                      )}
                    </span>
                  )}

                  <div className={`text-xs truncate flex-1 ${msg.is_read ? 'text-slate-700 font-medium' : 'text-slate-950 font-bold'}`}>
                    {msg.subject || '(Nessun Oggetto)'}
                  </div>

                  {msg.has_attachments && <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />}
                </div>

                <div className="text-[11px] text-slate-500 truncate font-normal mt-0.5">
                  {msg.snippet || 'Nessuna anteprima'}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
