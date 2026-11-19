import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { MessageItem } from '../types/mail';
import { Paperclip, ShieldAlert, ShieldCheck, Inbox, FileText } from 'lucide-react';

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
  const parentRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const currentFolder = folders.find((f) => f.id === activeFolderId);

  const fetchMessages = useCallback(async (isReset = false) => {
    if (!activeWorkspaceId || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const lastMsg = isReset ? null : messages[messages.length - 1];
      const cursor = lastMsg ? { date_utc: lastMsg.date_utc, id: lastMsg.id } : null;

      const res: { items: MessageItem[]; has_more: boolean } = await invoke('get_messages_keyset', {
        workspaceId: activeWorkspaceId,
        folderId: activeFolderId,
        query: searchQuery,
        cursor,
        limit: 50,
      });

      setMessages((prev) => (isReset ? res.items : [...prev, ...res.items]));
      setHasMore(res.has_more);
    } catch (err) {
      console.error('Errore recupero messaggi:', err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [activeWorkspaceId, activeFolderId, searchQuery, messages]);

  useEffect(() => {
    fetchMessages(true);
  }, [activeWorkspaceId, activeFolderId, searchQuery, refreshCounter]);

  const rowVirtualizer = useVirtualizer({
    count: hasMore ? messages.length + 1 : messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 84,
    overscan: 10,
  });

  if (!loading && messages.length === 0) {
    return (
      <div className="w-88 border-r border-slate-200/80 h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50/40 select-none">
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
            : 'I messaggi scaricati via POP3/IMAP o inviati compariranno qui.'}
        </p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="w-88 border-r border-slate-200/80 h-full overflow-y-auto bg-white divide-y divide-slate-100 select-none">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const isLoaderRow = virtualRow.index > messages.length - 1;
          const msg = messages[virtualRow.index];

          if (isLoaderRow) {
            if (!loading && hasMore) fetchMessages(false);
            return (
              <div
                key="loader"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="p-4 text-center text-xs text-slate-400 font-medium"
              >
                Caricamento email...
              </div>
            );
          }

          const isSelected = selectedMessage?.id === msg.id;

          return (
            <div
              key={msg.id}
              onClick={() => setSelectedMessage(msg)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={`px-3.5 py-2.5 cursor-pointer flex flex-col justify-between transition-all border-l-2 ${
                isSelected
                  ? 'bg-amber-500/[0.08] border-amber-500'
                  : 'hover:bg-slate-50/80 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={`truncate max-w-[180px] ${msg.is_read ? 'text-slate-600 font-normal' : 'text-slate-900 font-bold'}`}>
                  {msg.sender_name || msg.from_addr}
                </span>
                <span className="text-slate-400 text-[10px] font-medium">
                  {msg.date_utc ? new Date(msg.date_utc).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : ''}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 my-0.5">
                {msg.is_pec && (
                  <span title={`PEC: ${msg.pec_type}`} className="flex-shrink-0">
                    {msg.pec_type === 'AVVENUTA_CONSEGNA' || msg.pec_type === 'ACCETTAZIONE' ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    ) : msg.pec_type === 'ERRORE_CONSEGNA' ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200/80 font-bold px-1 rounded">PEC</span>
                    )}
                  </span>
                )}

                <div className={`text-xs truncate flex-1 ${msg.is_read ? 'text-slate-700' : 'text-slate-900 font-semibold'}`}>
                  {msg.subject || '(Nessun Oggetto)'}
                </div>

                {msg.has_attachments && <Paperclip className="w-3 h-3 text-slate-400 flex-shrink-0" />}
              </div>

              <div className="text-[11px] text-slate-500 truncate font-normal">
                {msg.snippet || 'Nessuna anteprima'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
