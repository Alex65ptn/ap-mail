import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { MessageItem } from '../types/mail';
import { 
  Paperclip, 
  ShieldCheck, 
  Inbox, 
  Send, 
  FileText,
  Archive, 
  Trash2, 
  Mail, 
  AlertOctagon, 
  Circle,
  Columns,
  Rows
} from 'lucide-react';

type FilterTag = 'all' | 'unread' | 'read' | 'pec' | 'attachments';
type SortField = 'date' | 'sender' | 'size' | 'read_status';
type SortDirection = 'desc' | 'asc';

interface Props {
  layoutMode?: 'classic' | 'split';
  onToggleLayout?: () => void;
}

export const formatAppleMailDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isToday) {
    return timeStr; // Es: 16:46, 16:36 identico ad Apple Mail
  }
  if (isYesterday) {
    return `Ieri ${timeStr}`;
  }
  
  if (d.getFullYear() === now.getFullYear()) {
    const day = d.getDate();
    const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
    return `${day} ${months[d.getMonth()]} ${timeStr}`; // Es: 19 nov 16:12
  }
  
  return `${d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} ${timeStr}`;
};

export const VirtualMessageList: React.FC<Props> = ({ layoutMode = 'classic', onToggleLayout }) => {
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
    <div className={`h-full flex flex-col bg-white select-none ${layoutMode === 'classic' ? 'w-full' : 'w-[390px] min-w-[390px] max-w-[390px] shrink-0 border-r border-slate-200/80'}`}>
      
      {/* 1. Header Intestazione Cartella con Contatore Reale, Filtri e Switcher Layout */}
      <div className="px-3.5 py-2 border-b border-slate-200/80 bg-slate-50/90 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          {currentFolder ? getFolderIcon(currentFolder.name) : <Inbox className="w-4 h-4 text-amber-600" />}
          <span className="font-bold text-xs text-slate-900 truncate">
            {currentFolder ? (currentFolder.display_name || currentFolder.name) : 'In entrata (tutte)'}
          </span>
          <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-mono shrink-0">
            {processedMessages.length} messaggi
          </span>
        </div>

        {/* Barra Filtri Rapidi (Tutte, Non lette, PEC, Allegati) */}
        <div className="flex items-center space-x-1 text-[10px] shrink-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            Tutte
          </button>

          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
              activeFilter === 'unread'
                ? 'bg-blue-600 text-white font-bold shadow-2xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Circle className="w-2 h-2 fill-current text-blue-500" />
            <span>Non lette</span>
            {unreadCount > 0 && <span className="font-bold">({unreadCount})</span>}
          </button>

          <button
            onClick={() => setActiveFilter('pec')}
            className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
              activeFilter === 'pec'
                ? 'bg-amber-600 text-white font-bold shadow-2xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-2.5 h-2.5 text-amber-500" />
            <span>PEC</span>
            {pecCount > 0 && <span>({pecCount})</span>}
          </button>

          <button
            onClick={() => setActiveFilter('attachments')}
            className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
              activeFilter === 'attachments'
                ? 'bg-slate-800 text-white font-bold shadow-2xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Paperclip className="w-2.5 h-2.5" />
            <span>Allegati</span>
            {attachmentsCount > 0 && <span>({attachmentsCount})</span>}
          </button>

          {/* Tasto Cambio Layout (Apple Mail Colonne vs 3 Colonne) */}
          {onToggleLayout && (
            <button
              onClick={onToggleLayout}
              title={layoutMode === 'classic' ? 'Passa alla visualizzazione a 3 colonne verticali' : 'Passa alla visualizzazione a colonne Apple Mail (Elenco sopra, Anteprima sotto)'}
              className="ml-1 p-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded cursor-pointer transition-colors"
            >
              {layoutMode === 'classic' ? <Columns className="w-3.5 h-3.5 text-slate-700" /> : <Rows className="w-3.5 h-3.5 text-amber-600" />}
            </button>
          )}
        </div>
      </div>

      {/* 2. LAYOUT A COLONNE APPLE MAIL (Stile nativo macOS dello screenshot) */}
      {layoutMode === 'classic' ? (
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          {/* Header Tabella Colonne Apple Mail */}
          <div className="flex items-center px-4 py-1.5 bg-slate-100/90 border-b border-slate-200 text-[11px] font-semibold text-slate-600 select-none shrink-0">
            {/* Colonna Icona Stato */}
            <div className="w-7 flex items-center justify-center shrink-0 text-slate-400">
              ⇅
            </div>

            {/* Colonna Da (Mittente) */}
            <div 
              onClick={() => handleSortClick('sender')} 
              className="w-56 cursor-pointer hover:text-slate-900 flex items-center space-x-1 shrink-0 pr-3"
              title="Clicca per ordinare alfabeticamente per mittente"
            >
              <span>Da</span>
              {sortField === 'sender' && <span className="text-amber-600 font-extrabold">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>}
            </div>

            {/* Colonna Data ricezione (Ordinata per data ora minuto con freccetta) */}
            <div 
              onClick={() => handleSortClick('date')} 
              className="w-40 cursor-pointer hover:text-slate-900 flex items-center space-x-1 shrink-0 pr-3"
              title="Clicca per ordinare per data, ora e minuto (più recenti in cima)"
            >
              <span>Data ricezione</span>
              <span className="text-slate-900 font-extrabold">{sortField === 'date' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}</span>
            </div>

            {/* Colonna Oggetto */}
            <div className="flex-1 min-w-0 pr-4">
              <span>Oggetto</span>
            </div>

            {/* Colonna Dimensione */}
            <div 
              onClick={() => handleSortClick('size')} 
              className="w-24 text-right pr-2 cursor-pointer hover:text-slate-900 flex items-center justify-end space-x-1 shrink-0"
              title="Clicca per ordinare per dimensione del messaggio"
            >
              <span>Dimensione</span>
              {sortField === 'size' && <span className="text-amber-600 font-extrabold">{sortDir === 'desc' ? ' ↓' : ' ↑'}</span>}
            </div>
          </div>

          {/* Righe Tabella Apple Mail con Selezione Blu e Scroll Fluido */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading && messages.length === 0 ? (
              <div className="h-28 flex items-center justify-center text-xs text-slate-400 font-medium">
                Caricamento messaggi in corso...
              </div>
            ) : processedMessages.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-xs text-slate-400 font-medium">
                Nessun messaggio presente in questa vista.
              </div>
            ) : (
              processedMessages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const sizeStr = formatFileSize(msg.size_bytes);
                const dateFormatted = formatAppleMailDate(msg.date_utc);

                return (
                  <div
                    key={msg.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(msg.id, el);
                      else itemRefs.current.delete(msg.id);
                    }}
                    onClick={() => handleSelectMessage(msg)}
                    onDoubleClick={() => handleOpenExternal(msg)}
                    className={`flex items-center px-4 py-1.5 text-xs cursor-pointer select-none transition-colors group ${
                      isSelected
                        ? 'bg-[#005fb8] text-white font-medium'
                        : !msg.is_read
                        ? 'bg-white hover:bg-slate-50 text-slate-950 font-bold'
                        : 'bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {/* 1. Icona Stato: Pallino blu se non letto, graffetta se allegato */}
                    <div className="w-7 flex items-center justify-center shrink-0">
                      {!msg.is_read ? (
                        <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-600 ring-2 ring-blue-100'}`} />
                      ) : msg.has_attachments ? (
                        <Paperclip className={`w-3.5 h-3.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`} />
                      ) : (
                        <span className="w-2.5 h-2.5" />
                      )}
                    </div>

                    {/* 2. Mittente (Da) */}
                    <div className="w-56 truncate pr-3 shrink-0 flex items-center space-x-1.5">
                      {msg.is_pec && (
                        <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-300' : 'text-amber-600'}`} />
                      )}
                      <span className="truncate">
                        {msg.sender_name || msg.from_addr}
                      </span>
                    </div>

                    {/* 3. Data Ricezione (Ora:Minuto per oggi: 16:46, 16:36, ecc.) */}
                    <div className={`w-40 shrink-0 text-xs ${isSelected ? 'text-white/90' : 'text-slate-500 font-mono'}`}>
                      {dateFormatted}
                    </div>

                    {/* 4. Oggetto */}
                    <div className="flex-1 min-w-0 truncate pr-4">
                      <span className="truncate">
                        {msg.subject || '(Nessun Oggetto)'}
                      </span>
                    </div>

                    {/* 5. Dimensione (es. 86 KB, 43 KB) */}
                    <div className={`w-24 text-right pr-2 shrink-0 font-mono text-[11px] ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                      {sizeStr || '—'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* 3. LAYOUT A SCHEDE VERTICALI (3 Colonne) */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Barra Ordinamento Istantaneo */}
          <div className="px-2.5 py-1.5 bg-white border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-600 shrink-0 gap-1 overflow-x-auto no-scrollbar">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-0.5">Ordina:</span>
            
            <button
              onClick={() => handleSortClick('date')}
              className={`px-2 py-1 rounded-md font-bold flex items-center space-x-0.5 transition-all cursor-pointer whitespace-nowrap ${
                sortField === 'date'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/70'
              }`}
            >
              <span>Data/Ora</span>
              <span className="text-amber-400 font-extrabold">{sortField === 'date' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}</span>
            </button>

            <button
              onClick={() => handleSortClick('sender')}
              className={`px-2 py-1 rounded-md font-bold flex items-center space-x-0.5 transition-all cursor-pointer whitespace-nowrap ${
                sortField === 'sender'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/70'
              }`}
            >
              <span>Da: A-Z</span>
              <span className="text-amber-400 font-extrabold">{sortField === 'sender' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}</span>
            </button>

            <button
              onClick={() => handleSortClick('size')}
              className={`px-2 py-1 rounded-md font-bold flex items-center space-x-0.5 transition-all cursor-pointer whitespace-nowrap ${
                sortField === 'size'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/70'
              }`}
            >
              <span>Dimensione</span>
              <span className="text-amber-400 font-extrabold">{sortField === 'size' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}</span>
            </button>
          </div>

          {/* Elenco Schede Verticali */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {processedMessages.map((msg) => {
              const isSelected = selectedMessage?.id === msg.id;
              const sizeStr = formatFileSize(msg.size_bytes);
              const dateFormatted = formatAppleMailDate(msg.date_utc);

              return (
                <div
                  key={msg.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(msg.id, el);
                    else itemRefs.current.delete(msg.id);
                  }}
                  onClick={() => handleSelectMessage(msg)}
                  onDoubleClick={() => handleOpenExternal(msg)}
                  className={`group px-3 py-2.5 cursor-pointer flex flex-col justify-between transition-all border-l-3 relative ${
                    isSelected
                      ? 'bg-amber-500/[0.09] border-amber-500 shadow-2xs'
                      : 'hover:bg-slate-50/90 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                      <button
                        onClick={(e) => handleToggleRead(msg, e)}
                        className="shrink-0 p-0.5 rounded-full hover:scale-115 transition-transform cursor-pointer"
                      >
                        {!msg.is_read ? (
                          <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-xs ring-2 ring-blue-100" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full border border-slate-300 group-hover:border-slate-400 transition-colors" />
                        )}
                      </button>

                      <span className={`truncate text-xs ${!msg.is_read ? 'text-slate-950 font-bold' : 'text-slate-700 font-semibold'}`}>
                        {msg.sender_name || msg.from_addr}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <span className="text-slate-500 text-[10px] font-mono font-medium">
                        {dateFormatted}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 my-0.5">
                    {msg.is_pec && (
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    )}
                    <div className={`text-xs truncate flex-1 ${!msg.is_read ? 'text-slate-950 font-semibold' : 'text-slate-700 font-normal'}`}>
                      {msg.subject || '(Nessun Oggetto)'}
                    </div>
                    {msg.has_attachments && <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                    <span className="truncate flex-1 mr-2 font-normal">
                      {msg.snippet || 'Nessuna anteprima'}
                    </span>
                    {sizeStr && (
                      <span className="text-[9px] font-mono text-slate-500 bg-slate-100 border border-slate-200/80 px-1 py-0.2 rounded font-semibold shrink-0">
                        {sizeStr}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
