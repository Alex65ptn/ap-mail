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
    estimateSize: () => 82,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="w-80 border-r border-slate-800 h-full overflow-y-auto bg-slate-900/60 divide-y divide-slate-800 select-none">
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
                className="p-4 text-center text-xs text-slate-500"
              >
                Caricamento...
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
              className={`px-3 py-2 cursor-pointer flex flex-col justify-between transition-colors border-l-2 ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500'
                  : 'hover:bg-slate-800/50 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold truncate max-w-[170px] ${msg.is_read ? 'text-slate-400' : 'text-slate-100'}`}>
                  {msg.sender_name || msg.from_addr}
                </span>
                <span className="text-slate-500 text-[10px]">
                  {msg.date_utc ? new Date(msg.date_utc).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : ''}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 my-0.5">
                {msg.is_pec && (
                  <span title={`PEC: ${msg.pec_type}`} className="flex-shrink-0">
                    {msg.pec_type === 'AVVENUTA_CONSEGNA' || msg.pec_type === 'ACCETTAZIONE' ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    ) : msg.pec_type === 'ERRORE_CONSEGNA' ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 font-semibold px-1 rounded">PEC</span>
                    )}
                  </span>
                )}

                <div className={`text-xs truncate flex-1 ${msg.is_read ? 'text-slate-300' : 'text-white font-medium'}`}>
                  {msg.subject || '(Nessun Oggetto)'}
                </div>

                {msg.has_attachments && <Paperclip className="w-3 h-3 text-slate-500 flex-shrink-0" />}
              </div>

              <div className="text-[11px] text-slate-500 truncate">
                {msg.snippet || 'Nessuna anteprima'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
