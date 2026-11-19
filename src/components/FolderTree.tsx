import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Folder as FolderIcon, Inbox, Send, Trash2, Archive, FileText, PenSquare, ShieldCheck, Settings } from 'lucide-react';

interface Props {
  onOpenCompose: () => void;
  onOpenSettings: () => void;
  onRefreshWorkspaces: () => void;
}

export const FolderTree: React.FC<Props> = ({ onOpenCompose, onOpenSettings, onRefreshWorkspaces }) => {
  const { folders, activeFolderId, setActiveFolder, workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const currentWs = workspaces.find((w) => w.workspace_id === activeWorkspaceId);
  const [isDeleting, setIsDeleting] = useState(false);

  const getFolderIcon = (name: string, isSelected: boolean) => {
    const lower = name.toLowerCase();
    const colorClass = isSelected ? 'text-amber-800' : 'text-slate-500';
    if (lower.includes('inbox') || lower.includes('arriv')) return <Inbox className={`w-4 h-4 ${colorClass}`} />;
    if (lower.includes('sent') || lower.includes('inviat')) return <Send className={`w-4 h-4 ${colorClass}`} />;
    if (lower.includes('trash') || lower.includes('cestin')) return <Trash2 className={`w-4 h-4 ${colorClass}`} />;
    if (lower.includes('draft') || lower.includes('bozz')) return <FileText className={`w-4 h-4 ${colorClass}`} />;
    if (lower.includes('archiv')) return <Archive className={`w-4 h-4 ${colorClass}`} />;
    return <FolderIcon className={`w-4 h-4 ${colorClass}`} />;
  };

  const handleDeleteCurrentWorkspace = async () => {
    if (!activeWorkspaceId || !currentWs) return;
    const confirm = window.confirm(`Sei sicuro di voler eliminare definitivamente la casella "${currentWs.name}"?\nI dati archiviati localmente per questa casella verranno rimossi.`);
    if (!confirm) return;

    setIsDeleting(true);
    try {
      await invoke('delete_workspace', { workspaceId: activeWorkspaceId });
      setActiveWorkspace(null);
      onRefreshWorkspaces();
    } catch (e) {
      console.error('Errore durante la cancellazione della casella:', e);
      alert('Impossibile eliminare la casella.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-64 bg-slate-50/90 border-r border-slate-200/80 flex flex-col h-full select-none">
      {/* Intestazione Account Attivo */}
      <div className="p-3.5 border-b border-slate-200/60 bg-white/70">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Casella Attiva</div>
          {currentWs && (
            <div className="flex items-center space-x-1">
              <button
                onClick={onOpenSettings}
                title="Impostazioni casella"
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDeleteCurrentWorkspace}
                disabled={isDeleting}
                title="Elimina questa casella"
                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <div className="text-xs font-semibold text-slate-900 truncate mt-0.5" title={currentWs?.email_address || currentWs?.name}>
          {currentWs ? (currentWs.name || currentWs.email_address) : 'Nessuna Casella Selezionata'}
        </div>
        {currentWs?.is_pec ? (
          <div className="inline-flex items-center space-x-1 mt-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            <span>Posta Certificata</span>
          </div>
        ) : currentWs && (
          <div className="text-[11px] text-slate-400 truncate mt-0.5">
            {currentWs.email_address}
          </div>
        )}
      </div>

      {/* Tasto Azione Scrivi / Nuovo Messaggio */}
      <div className="p-3 border-b border-slate-200/50">
        <button
          onClick={onOpenCompose}
          disabled={!activeWorkspaceId}
          className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-xs"
        >
          <PenSquare className="w-4 h-4 text-slate-950" />
          <span>{currentWs?.is_pec ? 'Scrivi Nuova PEC' : 'Scrivi Messaggio'}</span>
        </button>
      </div>

      {/* Lista Cartelle */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {(() => {
          const grandTotal = folders.reduce((sum, f) => sum + (f.total_count || 0), 0);
          const grandUnread = folders.reduce((sum, f) => sum + (f.unread_count || 0), 0);
          return (
            <button
              onClick={() => setActiveFolder(null)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeFolderId === null
                  ? 'bg-amber-500/10 text-amber-900 font-semibold border border-amber-500/20 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Inbox className={`w-4 h-4 ${activeFolderId === null ? 'text-amber-800' : 'text-slate-500'}`} />
                <span>Tutti i Messaggi</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {grandUnread > 0 && (
                  <span className="text-[10px] font-bold bg-amber-500 text-slate-950 rounded-full px-1.5 py-0.2 shadow-xs">
                    {grandUnread}
                  </span>
                )}
                {grandTotal > 0 && (
                  <span className={`text-[10px] font-medium ${activeFolderId === null ? 'text-amber-800/80 font-semibold' : 'text-slate-400'}`}>
                    {grandTotal}
                  </span>
                )}
              </div>
            </button>
          );
        })()}

        {folders.map((f) => {
          const isSelected = activeFolderId === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFolder(f.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-amber-500/10 text-amber-900 font-semibold border border-amber-500/20 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                {getFolderIcon(f.name, isSelected)}
                <span className="truncate">{f.display_name || f.name}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {f.unread_count > 0 && (
                  <span className="text-[10px] font-bold bg-amber-500 text-slate-950 rounded-full px-1.5 py-0.2 shadow-xs">
                    {f.unread_count}
                  </span>
                )}
                {f.total_count > 0 && (
                  <span className={`text-[10px] font-medium ${isSelected ? 'text-amber-800/80 font-semibold' : 'text-slate-400'}`}>
                    {f.total_count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
