import React from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Folder as FolderIcon, Inbox, Send, Trash2, Archive, FileText } from 'lucide-react';

export const FolderTree: React.FC = () => {
  const { folders, activeFolderId, setActiveFolder, workspaces, activeWorkspaceId } = useWorkspaceStore();
  const currentWs = workspaces.find((w) => w.workspace_id === activeWorkspaceId);

  const getFolderIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('inbox') || lower.includes('arriv')) return <Inbox className="w-4 h-4 text-blue-400" />;
    if (lower.includes('sent') || lower.includes('inviat')) return <Send className="w-4 h-4 text-emerald-400" />;
    if (lower.includes('trash') || lower.includes('cestin')) return <Trash2 className="w-4 h-4 text-rose-400" />;
    if (lower.includes('draft') || lower.includes('bozz')) return <FileText className="w-4 h-4 text-amber-400" />;
    if (lower.includes('archiv')) return <Archive className="w-4 h-4 text-purple-400" />;
    return <FolderIcon className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col h-full select-none">
      {/* Intestazione Workspace Attivo */}
      <div className="p-4 border-b border-slate-800">
        <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Workspace</div>
        <div className="text-sm font-bold text-slate-100 truncate mt-0.5">
          {currentWs ? currentWs.name : 'Nessun Account'}
        </div>
        {currentWs?.is_pec && (
          <span className="inline-block mt-1 text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded">
            Posta Certificata
          </span>
        )}
      </div>

      {/* Lista Cartelle */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <button
          onClick={() => setActiveFolder(null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeFolderId === null
              ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
              : 'text-slate-300 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Inbox className="w-4 h-4" />
            <span>Tutti i Messaggi</span>
          </div>
        </button>

        {folders.map((f) => {
          const isSelected = activeFolderId === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFolder(f.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                {getFolderIcon(f.name)}
                <span className="truncate">{f.display_name || f.name}</span>
              </div>
              {f.unread_count > 0 && (
                <span className="ml-2 text-[10px] font-bold bg-blue-500 text-white rounded-full px-1.5 py-0.5">
                  {f.unread_count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
