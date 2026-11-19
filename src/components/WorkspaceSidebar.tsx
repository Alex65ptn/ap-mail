import React from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { ShieldCheck, Mail, Archive, Plus } from 'lucide-react';

interface Props {
  onOpenImportModal: () => void;
}

export const WorkspaceSidebar: React.FC<Props> = ({ onOpenImportModal }) => {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  return (
    <aside className="w-16 bg-slate-950 flex flex-col items-center py-3 space-y-4 border-r border-slate-800 select-none">
      {/* Brand Logo AP Consulting */}
      <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 p-1 flex items-center justify-center shadow-md">
        <img src="/logo.png" alt="AP Mail" className="w-8 h-8 object-contain" />
      </div>

      <div className="w-8 h-[1px] bg-slate-800" />
      
      {/* Lista Workspace / Vault */}
      <div className="flex-1 w-full flex flex-col items-center space-y-3 overflow-y-auto">
        {workspaces.map((ws) => {
          const isActive = ws.workspace_id === activeWorkspaceId;
          return (
            <button
              key={ws.workspace_id}
              onClick={() => setActiveWorkspace(ws.workspace_id)}
              title={`${ws.name} ${ws.is_pec ? '(PEC)' : ''}`}
              className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-amber-500/20 border border-amber-500/60 text-amber-300 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {isActive && (
                <span className="absolute -left-2 w-1 h-6 bg-amber-500 rounded-r-full" />
              )}
              
              {ws.is_pec ? (
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              ) : ws.workspace_type === 'ARCHIVIO_LOCALE' ? (
                <Archive className="w-5 h-5" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tasto Ingestione / Nuovo Archivio */}
      <button
        onClick={onOpenImportModal}
        title="Importa Archivio Storico (PST, MBOX, EML)"
        className="w-11 h-11 rounded-xl bg-slate-900 border border-dashed border-slate-700 text-slate-400 hover:text-amber-300 hover:border-amber-500 flex items-center justify-center transition-all"
      >
        <Plus className="w-5 h-5" />
      </button>
    </aside>
  );
};
