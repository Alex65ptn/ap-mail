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
import { RefreshCw, UserPlus, PenSquare } from 'lucide-react';

export const App: React.FC = () => {
  const { setWorkspaces, setActiveWorkspace, activeWorkspaceId, setFolders, triggerRefresh } = useWorkspaceStore();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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
    try {
      await invoke('sync_workspace_now', { workspaceId: activeWorkspaceId });
      await loadFolders();
      triggerRefresh();
    } catch (e) {
      console.error('Errore sincronizzazione:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900 select-none">
      {/* 1. Barra Dock Workspace / Vaults */}
      <WorkspaceSidebar
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenAddAccountModal={() => setIsAddAccountModalOpen(true)}
      />

      {/* 2. Barra Albero Cartelle */}
      <FolderTree
        onOpenCompose={() => setIsComposeModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onRefreshWorkspaces={loadWorkspaces}
      />

      {/* 3. Colonna Principale: Ricerca FTS5 + Virtual List + Visualizzatore Documenti */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header Superiore */}
        <header className="h-13 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-5 flex items-center justify-between">
          <SearchBar />

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setIsComposeModalOpen(true)}
              disabled={!activeWorkspaceId}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <PenSquare className="w-3.5 h-3.5" />
              <span>Scrivi</span>
            </button>

            <button
              onClick={() => setIsAddAccountModalOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-200"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-600" />
              <span>Nuova Casella</span>
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

        {/* Corpo diviso in 2 sezioni: Virtual List a sinistra, Dettaglio Messaggio a destra */}
        <div className="flex-1 flex overflow-hidden">
          <VirtualMessageList />
          <MessageView />
        </div>
      </div>

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
        onClose={() => setIsComposeModalOpen(false)}
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
    </div>
  );
};
