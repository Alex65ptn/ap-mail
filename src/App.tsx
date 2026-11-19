import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspaceStore } from './stores/workspaceStore';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { FolderTree } from './components/FolderTree';
import { SearchBar } from './components/SearchBar';
import { VirtualMessageList } from './components/VirtualMessageList';
import { MessageView } from './components/MessageView';
import { ImportModal } from './components/ImportModal';
import { RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const { setWorkspaces, setActiveWorkspace, activeWorkspaceId, setFolders } = useWorkspaceStore();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadWorkspaces = async () => {
    try {
      const list: any[] = await invoke('list_workspaces');
      setWorkspaces(list);
      if (list.length > 0 && !activeWorkspaceId) {
        setActiveWorkspace(list[0].workspace_id);
      }
    } catch (e) {
      console.error('Errore caricamento workspaces:', e);
    }
  };

  const loadFolders = async () => {
    if (!activeWorkspaceId) return;
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
    } catch (e) {
      console.error('Errore sincronizzazione:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* 1. Barra Workspace / Vault (Slack-like) */}
      <WorkspaceSidebar onOpenImportModal={() => setIsImportModalOpen(true)} />

      {/* 2. Barra Albero Cartelle */}
      <FolderTree />

      {/* 3. Colonna Principale: Barra Ricerca + Virtual List + Visualizzatore */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header superiore con Ricerca & Sincronizzazione */}
        <header className="h-12 border-b border-slate-800 bg-slate-900/60 px-4 flex items-center justify-between">
          <SearchBar />

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSyncNow}
              disabled={isSyncing || !activeWorkspaceId}
              title="Sincronizza IMAP / PEC"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
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
    </div>
  );
};
