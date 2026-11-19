import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { MessageItem } from '../types/mail';
import { Paperclip, ShieldAlert, ShieldCheck } from 'lucide-react';

export const VirtualMessageList: React.FC = () => {
  const { activeWorkspaceId, activeFolderId, searchQuery, selectedMessage, setSelectedMessage } = useWorkspaceStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchMessages = useCallback(async (isReset = false) => {
    if (!activeWorkspaceId || loading) return;
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
      setLoading(false);
    }
  }, [activeWorkspaceId, activeFolderId, searchQuery, messages, loading]);

  useEffect(() => {
    fetchMessages(true);
  }, [activeWorkspaceId, activeFolderId, searchQuery]);

  const rowVirtualizer = useVirtualizer({
    count: hasMore ? messages.length + 1 : messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 84,
    overscan: 10,
  });

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
