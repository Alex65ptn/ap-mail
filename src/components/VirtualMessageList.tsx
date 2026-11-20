import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { MessageItem } from '../types/mail';
import { 
  Paperclip, 
  ShieldAlert, 
  ShieldCheck, 
  Inbox, 
  Send, 
  FileText,
  Archive, 
  Trash2, 
  Mail, 
  AlertOctagon, 
  ExternalLink,
  Circle,
  Filter
} from 'lucide-react';

type FilterTag = 'all' | 'unread' | 'read' | 'pec' | 'attachments';
type SortField = 'date' | 'sender' | 'size' | 'read_status';
type SortDirection = 'desc' | 'asc';

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

  // Filtri e Ordinamento specialistici stile Outlook
  const [activeFilter, setActiveFilter] = useState<FilterTag>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Mappa dei riferimenti DOM per scrollIntoView con tastiera
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const currentFolder = folders.find((f) => f.id === activeFolderId);

  // Sincronizza lo stato letto/non letto tra tutte le finestre tramite eventi Tauri
  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    listen<any>('message-read-status', (event) => {
      const { message_id, is_read } = event.payload || {};
      if (typeof message_id === 'number') {
        setMessages((prev) =>
          prev.map((m) => (m.id === message_id ? { ...m, is_read: !!is_read } : m))
        );
        if (selectedMessage?.id === message_id) {
          setSelectedMessage({ ...selectedMessage, is_read: !!is_read });
        }
      }
    }).then((unlisten) => {
      unlistenFn = unlisten;
    }).catch(console.error);

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  const handleOpenExternal = async (msg: MessageItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Aggiornamento immediato ottimistico sia nella lista che nel messaggio selezionato
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m))
    );
    if (selectedMessage?.id === msg.id) {
      setSelectedMessage({ ...selectedMessage, is_read: true });
    }
    try {
      await invoke('toggle_message_read_status', {
        workspaceId: msg.workspace_id || activeWorkspaceId,
        messageId: msg.id,
        isRead: true,
      });
      await invoke('open_message_external', {
        workspaceId: msg.workspace_id || activeWorkspaceId,
        messageId: msg.id,
      });
    } catch (err) {
      console.error("Errore apertura esterna messaggio:", err);
    }
  };

  const handleToggleRead = async (msg: MessageItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !msg.is_read;

    // Aggiornamento ottimistico immediato nella lista
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, is_read: newStatus } : m))
    );
    if (selectedMessage?.id === msg.id) {
      setSelectedMessage({ ...selectedMessage, is_read: newStatus });
    }

    try {
      await invoke('toggle_message_read_status', {
        workspaceId: msg.workspace_id || activeWorkspaceId,
        messageId: msg.id,
        isRead: newStatus,
      });
    } catch (err) {
      console.error("Errore modifica stato lettura:", err);
      // Ripristina in caso di errore
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_read: !newStatus } : m))
      );
    }
  };

  const handleSelectMessage = async (msg: MessageItem) => {
    setSelectedMessage({ ...msg, is_read: true });
    // Se è non letto, segnalo automaticamente come letto
    if (!msg.is_read) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m))
      );
      try {
        await invoke('toggle_message_read_status', {
          workspaceId: msg.workspace_id || activeWorkspaceId,
          messageId: msg.id,
          isRead: true,
        });
      } catch (err) {
        console.error("Errore marcatura letto on select:", err);
      }
    }
  };

  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      // Inverte direzione se clicchi sullo stesso campo
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      if (field === 'sender') {
        setSortDir('asc'); // Default alfabetico A -> Z
      } else {
        setSortDir('desc'); // Default più recente / più pesante / non lette prima
      }
    }
  };

  const getFolderIcon = (name?: string) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('inbox') || lower.includes('arriv')) return <Inbox className="w-4 h-4 text-amber-600" />;
    if (lower.includes('sent') || lower.includes('inviat')) return <Send className="w-4 h-4 text-slate-600" />;
    if (lower.includes('draft') || lower.includes('bozz')) return <FileText className="w-4 h-4 text-amber-600" />;
    if (lower.includes('trash') || lower.includes('cestin')) return <Trash2 className="w-4 h-4 text-rose-500" />;
    if (lower.includes('archiv')) return <Archive className="w-4 h-4 text-slate-500" />;
    if (lower.includes('junk') || lower.includes('spam') || lower.includes('indesiderat')) return <AlertOctagon className="w-4 h-4 text-amber-600" />;
    return <Mail className="w-4 h-4 text-slate-500" />;
  };

  const fetchMessages = useCallback(async () => {
    if (!activeWorkspaceId) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      // Carica tutte le mail della cartella senza limitazione artificiale a 100
      const res: { items: MessageItem[]; has_more: boolean } = await invoke('get_messages_keyset', {
        workspaceId: activeWorkspaceId,
        folderId: activeFolderId,
        query: searchQuery.trim() ? searchQuery.trim() : null,
        cursor: null,
        limit: 5000,
      });

      setMessages(res.items || []);

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

  // Conteggi per le pillole
  const unreadCount = useMemo(() => messages.filter((m) => !m.is_read).length, [messages]);
  const pecCount = useMemo(() => messages.filter((m) => m.is_pec).length, [messages]);
  const attachmentsCount = useMemo(() => messages.filter((m) => m.has_attachments).length, [messages]);

  // Filtraggio & Ordinamento Dinamico
  const processedMessages = useMemo(() => {
    let list = [...messages];

    // 1. Filtro attivo
    if (activeFilter === 'unread') {
      list = list.filter((m) => !m.is_read);
    } else if (activeFilter === 'read') {
      list = list.filter((m) => m.is_read);
    } else if (activeFilter === 'pec') {
      list = list.filter((m) => m.is_pec);
    } else if (activeFilter === 'attachments') {
      list = list.filter((m) => m.has_attachments);
    }

    // 2. Ordinamento multi-criterio
    list.sort((a, b) => {
      if (sortField === 'sender') {
        const sA = (a.sender_name || a.from_addr || '').toLowerCase();
        const sB = (b.sender_name || b.from_addr || '').toLowerCase();
        const cmp = sA.localeCompare(sB, 'it');
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'date') {
        const tA = new Date(a.date_utc).getTime() || 0;
        const tB = new Date(b.date_utc).getTime() || 0;
        return sortDir === 'desc' ? tB - tA : tA - tB;
      }
      if (sortField === 'size') {
        const sizeA = a.size_bytes || 0;
        const sizeB = b.size_bytes || 0;
        return sortDir === 'desc' ? sizeB - sizeA : sizeA - sizeB;
      }
      if (sortField === 'read_status') {
        const rA = a.is_read ? 1 : 0;
        const rB = b.is_read ? 1 : 0;
        return sortDir === 'desc' ? rA - rB : rB - rA;
      }
      return 0;
    });

    return list;
  }, [messages, activeFilter, sortField, sortDir]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Navigazione rapida da tastiera stile Outlook / Apple Mail (Frecce Su/Giù, j/k, Invio)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Non intercettare se il focus è su un input di ricerca, textarea o form
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'j') {
        if (processedMessages.length === 0) return;
        e.preventDefault();
        const currentIndex = processedMessages.findIndex((m) => m.id === selectedMessage?.id);
        let nextIndex = 0;
        if (currentIndex !== -1 && currentIndex < processedMessages.length - 1) {
          nextIndex = currentIndex + 1;
        } else if (currentIndex === -1) {
          nextIndex = 0;
        } else {
          return; // Già all'ultimo messaggio
        }
        const nextMsg = processedMessages[nextIndex];
        handleSelectMessage(nextMsg);
        const el = itemRefs.current.get(nextMsg.id);
        if (el) {
          el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        if (processedMessages.length === 0) return;
        e.preventDefault();
        const currentIndex = processedMessages.findIndex((m) => m.id === selectedMessage?.id);
        if (currentIndex > 0) {
          const prevMsg = processedMessages[currentIndex - 1];
          handleSelectMessage(prevMsg);
          const el = itemRefs.current.get(prevMsg.id);
          if (el) {
            el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          }
        }
      } else if (e.key === 'Enter') {
        if (selectedMessage) {
          e.preventDefault();
          handleOpenExternal(selectedMessage);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [processedMessages, selectedMessage]);

  return (
    <div className="w-[390px] min-w-[390px] max-w-[390px] shrink-0 border-r border-slate-200/80 h-full flex flex-col bg-white select-none">
      
      {/* 1. Header Intestazione Cartella con Contatore Totale Reale e Scorciatoie Tastiera */}
      <div className="px-3.5 py-2.5 border-b border-slate-200/80 bg-slate-50/90 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          {currentFolder ? getFolderIcon(currentFolder.name) : <Inbox className="w-4 h-4 text-amber-600" />}
          <span className="font-bold text-xs text-slate-900 truncate">
            {currentFolder ? (currentFolder.display_name || currentFolder.name) : 'Tutti i Messaggi'}
          </span>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-[9px] text-slate-400 font-medium mr-1 hidden sm:inline" title="Usa frecce su/giù per scorrere e segnare come letto al volo">
            ↑/↓ scorri • ↵ apri
          </span>
          <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200/90 px-2 py-0.5 rounded-full shadow-2xs font-mono">
            {processedMessages.length} di {messages.length}
          </span>
        </div>
      </div>

      {/* 2. Barra Filtri Rapidi di Stato stile Outlook (Pills) */}
      <div className="px-2.5 py-1.5 bg-slate-50/60 border-b border-slate-200/60 flex items-center space-x-1 overflow-x-auto no-scrollbar shrink-0 text-[10px]">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeFilter === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-2xs'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          Tutte ({messages.length})
        </button>

        <button
          onClick={() => setActiveFilter('unread')}
          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
            activeFilter === 'unread'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <Circle className="w-2 h-2 fill-current text-blue-500" />
          <span>Non lette</span>
          {unreadCount > 0 && (
            <span className={`ml-0.5 text-[9px] px-1 rounded-full font-bold ${activeFilter === 'unread' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'}`}>
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveFilter('pec')}
          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
            activeFilter === 'pec'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <ShieldCheck className="w-2.5 h-2.5 text-amber-500" />
          <span>PEC ({pecCount})</span>
        </button>

        <button
          onClick={() => setActiveFilter('attachments')}
          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
            activeFilter === 'attachments'
              ? 'bg-slate-800 text-white shadow-2xs'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <Paperclip className="w-2.5 h-2.5" />
          <span>Allegati ({attachmentsCount})</span>
        </button>
      </div>

      {/* 3. Barra Ordinamento Istantaneo stile Outlook a 4 Bottoni dedicati */}
      <div className="px-2.5 py-1.5 bg-white border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-600 shrink-0 gap-1 overflow-x-auto no-scrollbar">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-0.5">Ordina:</span>
        
        {/* Tasto Data */}
        <button
          onClick={() => handleSortClick('date')}
          title="Ordina per data di ricezione (clicca per invertire più recente / meno recente)"
          className={`px-2 py-1 rounded-md font-bold flex items-center space-x-0.5 transition-all cursor-pointer whitespace-nowrap ${
            sortField === 'date'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/70'
          }`}
        >
          <span>Data</span>
          <span className="text-amber-400 font-extrabold">{sortField === 'date' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}</span>
        </button>

        {/* Tasto Provenienza A-Z */}
        <button
          onClick={() => handleSortClick('sender')}
          title="Ordina alfabeticamente per mittente/provenienza (clicca per invertire A-Z / Z-A)"
          className={`px-2 py-1 rounded-md font-bold flex items-center space-x-0.5 transition-all cursor-pointer whitespace-nowrap ${
            sortField === 'sender'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/70'
          }`}
        >
          <span>Da: {sortField === 'sender' ? (sortDir === 'asc' ? 'A→Z' : 'Z→A') : 'A-Z'}</span>
          <span className="text-amber-400 font-extrabold">{sortField === 'sender' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}</span>
        </button>

        {/* Tasto Dimensione File */}
        <button
          onClick={() => handleSortClick('size')}
          title="Ordina per dimensione del messaggio/allegati (clicca per invertire più pesante / più leggero)"
          className={`px-2 py-1 rounded-md font-bold flex items-center space-x-0.5 transition-all cursor-pointer whitespace-nowrap ${
            sortField === 'size'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/70'
          }`}
        >
          <span>Dimensione</span>
          <span className="text-amber-400 font-extrabold">{sortField === 'size' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}</span>
        </button>

        {/* Tasto Non Lette in cima */}
        <button
          onClick={() => handleSortClick('read_status')}
          title="Porta tutte le email non lette in cima alla lista"
          className={`px-2 py-1 rounded-md font-bold flex items-center space-x-0.5 transition-all cursor-pointer whitespace-nowrap ${
            sortField === 'read_status'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/70'
          }`}
        >
          <span>Non lette</span>
          {sortField === 'read_status' && <span className="text-white font-extrabold"> ↑</span>}
        </button>
      </div>

      {/* 4. Corpo Lista Messaggi con Riconoscimento Tag, Provenienza e Dimensione */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading && messages.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-400 font-medium">
            Caricamento messaggi in corso...
          </div>
        ) : processedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50/40">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 mb-3 shadow-xs">
              <Filter className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-slate-800">
              Nessun messaggio corrisponde ai criteri
            </div>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
              Prova a cambiare il filtro rapido o la chiave di ricerca.
            </p>
          </div>
        ) : (
          processedMessages.map((msg) => {
            const isSelected = selectedMessage?.id === msg.id;
            const sizeStr = formatFileSize(msg.size_bytes);

            return (
              <div
                key={msg.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(msg.id, el);
                  else itemRefs.current.delete(msg.id);
                }}
                onClick={() => handleSelectMessage(msg)}
                onDoubleClick={() => handleOpenExternal(msg)}
                title="Clicca per selezionare. Doppio clic per aprire fuori dal client."
                className={`group px-3 py-2.5 cursor-pointer flex flex-col justify-between transition-all border-l-3 relative ${
                  isSelected
                    ? 'bg-amber-500/[0.09] border-amber-500 shadow-2xs'
                    : 'hover:bg-slate-50/90 border-transparent'
                }`}
              >
                {/* Riga 1: Tag Letto/Non Letto + Provenienza (Mittente) + Data */}
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                    {/* Tag Interattivo di Lettura: Pallino Blu Cliccabile stile Outlook */}
                    <button
                      onClick={(e) => handleToggleRead(msg, e)}
                      title={msg.is_read ? 'Segna come non letto' : 'Segna come letto'}
                      className="shrink-0 p-0.5 rounded-full hover:scale-115 transition-transform cursor-pointer"
                    >
                      {!msg.is_read ? (
                        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-xs ring-2 ring-blue-100" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full border border-slate-300 group-hover:border-slate-400 transition-colors" />
                      )}
                    </button>

                    {/* Provenienza / Mittente */}
                    <span className={`truncate text-xs ${!msg.is_read ? 'text-slate-950 font-bold' : 'text-slate-700 font-semibold'}`}>
                      {msg.sender_name || msg.from_addr}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <span className="text-slate-400 text-[10px] font-medium group-hover:hidden">
                      {msg.date_utc ? new Date(msg.date_utc).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : ''}
                    </span>
                    <button
                      onClick={(e) => handleOpenExternal(msg, e)}
                      title="Apri fuori dal client in finestra nativa"
                      className="hidden group-hover:flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-bold transition-all shadow-2xs"
                    >
                      <ExternalLink className="w-2.5 h-2.5 text-amber-400" />
                      <span>Apri</span>
                    </button>
                  </div>
                </div>

                {/* Riga 2: Badge PEC + Oggetto */}
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

                  <div className={`text-xs truncate flex-1 ${!msg.is_read ? 'text-slate-950 font-semibold' : 'text-slate-700 font-normal'}`}>
                    {msg.subject || '(Nessun Oggetto)'}
                  </div>

                  {msg.has_attachments && <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />}
                </div>

                {/* Riga 3: Snippet + Dimensione File */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                  <span className="truncate flex-1 mr-2 font-normal">
                    {msg.snippet || 'Nessuna anteprima'}
                  </span>

                  {/* Tag Dimensione File in font mono */}
                  {sizeStr && (
                    <span className="text-[9px] font-mono text-slate-500 bg-slate-100 border border-slate-200/80 px-1 py-0.2 rounded font-semibold shrink-0">
                      {sizeStr}
                    </span>
                  )}
                </div>

                {/* Etichetta Casella / Workspace */}
                {msg.workspace_name && (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[9px] font-medium text-slate-400 bg-slate-50 border border-slate-200/60 px-1.5 py-0.2 rounded truncate max-w-[200px]">
                      {msg.workspace_name}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
