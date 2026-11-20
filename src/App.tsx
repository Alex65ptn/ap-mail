import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspaceStore } from './stores/workspaceStore';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { FolderTree } from './components/FolderTree';
import { SearchBar } from './components/SearchBar';
import { VirtualMessageList } from './components/VirtualMessageList';
import { MessageView } from './components/MessageView';
import { ImportModal } from './components/ImportModal';
import { AddAccountModal } from './components/AddAccountModal';
import { ComposeModal } from './components/ComposeModal';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { StorageLocationModal } from './components/StorageLocationModal';
import { CalendarView } from './components/CalendarView';
import { CalendarModal } from './components/CalendarModal';
import { CalendarEvent } from './types/calendar';
import { RefreshCw, PenSquare } from 'lucide-react';
import { DetachedMessageWindow } from './components/DetachedMessageWindow';
import { HelpLegalModal } from './components/HelpLegalModal';
import { LegalSuitePlusModal } from './components/LegalSuitePlusModal';

export const App: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isDetachedMessage = urlParams.get('window') === 'detached-message';
  const detachedWs = urlParams.get('ws') || '';
  const detachedMsg = parseInt(urlParams.get('msg') || '0', 10);

  if (isDetachedMessage && detachedMsg > 0) {
    return <DetachedMessageWindow workspaceId={detachedWs} messageId={detachedMsg} />;
  }

  const { workspaces, setWorkspaces, setActiveWorkspace, activeWorkspaceId, setFolders, triggerRefresh } = useWorkspaceStore();
  const [activeAppTab, setActiveAppTab] = useState<'mail' | 'calendar'>('mail');
  const [layoutMode, setLayoutMode] = useState<'classic' | 'split'>('classic');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isLegalSuiteModalOpen, setIsLegalSuiteModalOpen] = useState(false);
  const [legalSuitePreset, setLegalSuitePreset] = useState<{ subject?: string; body?: string } | null>(null);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [composeInitialData, setComposeInitialData] = useState<{ to?: string; subject?: string; body?: string; draftId?: number } | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Per creare scadenze direttamente da una email/PEC
  const [calendarModalPreset, setCalendarModalPreset] = useState<Partial<CalendarEvent> | null>(null);
  const [isDirectCalendarModalOpen, setIsDirectCalendarModalOpen] = useState(false);

  const handleOpenCompose = (data?: { to?: string; subject?: string; body?: string; draftId?: number } | null) => {
    setComposeInitialData(data || null);
    setIsComposeModalOpen(true);
  };

  const handleAddToCalendarFromEmail = (msg: any) => {
    const today = new Date().toISOString().split('T')[0];
    const isPec = !!msg.is_pec;
    setCalendarModalPreset({
      title: `${isPec ? '[PEC] ' : ''}${msg.subject || 'Scadenza da Email'}`,
      category: isPec ? 'termine_legale' : 'riunione',
      startDate: `${today}T09:30`,
      endDate: `${today}T11:00`,
      notes: `Generato da messaggio di: ${msg.sender_name || ''} <${msg.from_addr}>\nData originale: ${msg.date_utc || ''}\nOggetto: ${msg.subject || ''}`,
      linkedEmailId: msg.id,
      linkedEmailSubject: msg.subject,
    });
    setIsDirectCalendarModalOpen(true);
  };

  // Auto-sync rimosso per garantire massima stabilita' ed evitare crash in background

  const loadWorkspaces = async () => {
    try {
      const list: any[] = await invoke('list_workspaces');
      setWorkspaces(list);
      if (list.length > 0) {
        // Se non c'è workspace attivo o quello attivo non esiste più nella lista
        const stillExists = list.some((w) => w.workspace_id === activeWorkspaceId);
        if (!activeWorkspaceId || !stillExists) {
          setActiveWorkspace(list[0].workspace_id);
        }
      } else {
        setActiveWorkspace(null);
      }
    } catch (e) {
      console.error('Errore caricamento workspaces:', e);
    }
  };

  const loadFolders = async () => {
    if (!activeWorkspaceId) {
      setFolders([]);
      return;
    }
    try {
      const fList: any[] = await invoke('list_folders', { workspaceId: activeWorkspaceId });
      setFolders(fList);
    } catch (e) {
      console.error('Errore caricamento cartelle:', e);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    loadFolders();
  }, [activeWorkspaceId]);

  const handleSyncNow = async () => {
    if (!activeWorkspaceId || isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      if (activeWorkspaceId === 'UNIFIED') {
        let totalCount = 0;
        for (const ws of workspaces) {
          try {
            const count: any = await invoke('sync_workspace_now', { workspaceId: ws.workspace_id });
            if (typeof count === 'number') totalCount += count;
          } catch (e) {
            console.warn(`Sync error for ${ws.name}:`, e);
          }
        }
        await loadFolders();
        triggerRefresh();
        setSyncFeedback({
          type: 'success',
          message: totalCount > 0
            ? `Sincronizzazione globale completata: scaricati ${totalCount} nuovi messaggi tra tutte le caselle.`
            : 'Sincronizzazione globale completata: nessun nuovo messaggio sul server.',
        });
        setTimeout(() => setSyncFeedback((prev) => prev?.type === 'success' ? null : prev), 5000);
        return;
      }

      const count: any = await invoke('sync_workspace_now', { workspaceId: activeWorkspaceId });
      await loadFolders();
      triggerRefresh();
      const num = typeof count === 'number' ? count : 0;
      setSyncFeedback({
        type: 'success',
        message: num > 0
          ? `Sincronizzazione completata con successo: scaricati ${num} nuovi messaggi.`
          : 'Sincronizzazione completata: nessun nuovo messaggio sul server.',
      });
      setTimeout(() => setSyncFeedback((prev) => prev?.type === 'success' ? null : prev), 5000);
    } catch (e: any) {
      console.error('Errore sincronizzazione:', e);
      const msg = typeof e === 'string' ? e : e?.message || 'Errore durante la sincronizzazione con il server.';
      setSyncFeedback({ type: 'error', message: msg });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900 select-none">
      {/* 1. Barra Dock Workspace / Switcher Posta & Calendario */}
      <WorkspaceSidebar
        activeTab={activeAppTab}
        onSelectTab={setActiveAppTab}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenAddAccountModal={() => setIsAddAccountModalOpen(true)}
        onOpenStorageModal={() => setIsStorageModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onOpenLegalSuitePlus={() => {
          setLegalSuitePreset(null);
          setIsLegalSuiteModalOpen(true);
        }}
      />

      {/* Render Condizionale: Posta vs Calendario Outlook */}
      {activeAppTab === 'mail' ? (
        <>
          {/* 2. Barra Albero Cartelle */}
          <FolderTree
            onOpenCompose={() => handleOpenCompose(null)}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onRefreshWorkspaces={loadWorkspaces}
            onSync={handleSyncNow}
            isSyncing={isSyncing}
          />

          {/* 3. Colonna Principale: Ricerca FTS5 + Virtual List + Visualizzatore Documenti */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header Superiore */}
            <header className="h-13 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-5 flex items-center justify-between">
              <SearchBar />

              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => handleOpenCompose(null)}
                  disabled={!activeWorkspaceId}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <PenSquare className="w-3.5 h-3.5" />
                  <span>Scrivi</span>
                </button>

                <button
                  onClick={handleSyncNow}
                  disabled={isSyncing || !activeWorkspaceId}
                  title="Sincronizza IMAP / PEC"
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-slate-300'}`} />
                  <span>{isSyncing ? 'Sincronizzazione...' : 'Sincronizza'}</span>
                </button>
              </div>
            </header>

            {/* Banner Feedback Sincronizzazione */}
            {syncFeedback && (
              <div className={`px-4 py-2.5 text-xs flex items-center justify-between border-b transition-all ${
                syncFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}>
                <span className="font-medium">{syncFeedback.message}</span>
                <button
                  onClick={() => setSyncFeedback(null)}
                  className="ml-3 text-slate-400 hover:text-slate-700 font-bold text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Corpo con layout configurabile: Classico Apple Mail (Elenco colonne in alto + Anteprima in basso) o 3 Colonne */}
            <div className={`flex-1 flex overflow-hidden ${layoutMode === 'classic' ? 'flex-col' : 'flex-row'}`}>
              <div className={`${layoutMode === 'classic' ? 'h-[46%] min-h-[200px] max-h-[70%] border-b border-slate-200/80 flex flex-col' : 'h-full flex'}`}>
                <VirtualMessageList 
                  layoutMode={layoutMode} 
                  onToggleLayout={() => setLayoutMode((prev) => (prev === 'classic' ? 'split' : 'classic'))} 
                />
              </div>
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                <MessageView 
                  onComposeAction={handleOpenCompose} 
                  onAddToCalendar={handleAddToCalendarFromEmail}
                  onOpenLegalSuitePlus={(data) => {
                    setLegalSuitePreset(data || null);
                    setIsLegalSuiteModalOpen(true);
                  }}
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <CalendarView />
      )}

      {/* Modale Scadenzario da Email */}
      <CalendarModal
        isOpen={isDirectCalendarModalOpen}
        onClose={() => {
          setIsDirectCalendarModalOpen(false);
          setCalendarModalPreset(null);
        }}
        initialData={calendarModalPreset}
      />

      {/* Modale Ingestione Storica */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          loadWorkspaces();
          setIsImportModalOpen(false);
        }}
      />

      {/* Modale Configurazione Nuova Casella PEC / IMAP */}
      <AddAccountModal
        isOpen={isAddAccountModalOpen}
        onClose={() => setIsAddAccountModalOpen(false)}
        onSuccess={() => {
          loadWorkspaces();
          setIsAddAccountModalOpen(false);
        }}
      />

      {/* Modale Scrittura Nuovo Messaggio / PEC */}
      <ComposeModal
        isOpen={isComposeModalOpen}
        initialData={composeInitialData}
        onClose={() => {
          setIsComposeModalOpen(false);
          setComposeInitialData(null);
        }}
        onSuccess={() => {
          loadFolders();
        }}
      />

      {/* Modale Impostazioni Casella Attiva */}
      <AccountSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSuccess={() => {
          loadWorkspaces();
        }}
        onDeleteCurrent={async () => {
          if (!activeWorkspaceId) return;
          try {
            await invoke('delete_workspace', { workspaceId: activeWorkspaceId });
            setActiveWorkspace(null);
            loadWorkspaces();
          } catch (e) {
            console.error('Errore cancellazione workspace:', e);
          }
        }}
      />

      {/* Modale Allocazione Storage & Google Drive */}
      <StorageLocationModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
      />

      {/* Modale Guida, Istruzioni Operative & Note Legali */}
      <HelpLegalModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Modale AP Suite PLUS (Legal & Financial Suite Forense) */}
      <LegalSuitePlusModal
        isOpen={isLegalSuiteModalOpen}
        onClose={() => {
          setIsLegalSuiteModalOpen(false);
          setLegalSuitePreset(null);
        }}
        presetSubject={legalSuitePreset?.subject}
        presetText={legalSuitePreset?.body}
        onOpenComposeWithDraft={(draftBody) => {
          setIsLegalSuiteModalOpen(false);
          handleOpenCompose({
            to: '',
            subject: legalSuitePreset?.subject ? `Riscontro: ${legalSuitePreset.subject}` : 'Riscontro legale',
            body: draftBody,
          });
        }}
      />
    </div>
  );
};
