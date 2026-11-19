import React from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { ShieldCheck, Mail, Archive, Plus, UserPlus } from 'lucide-react';

interface Props {
  onOpenImportModal: () => void;
  onOpenAddAccountModal: () => void;
}

export const WorkspaceSidebar: React.FC<Props> = ({ onOpenImportModal, onOpenAddAccountModal }) => {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  return (
    <aside className="w-16 bg-slate-100 flex flex-col items-center py-3 space-y-3 border-r border-slate-200 select-none">
      {/* Brand Logo AP Consulting */}
      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-sm">
        <img src="/logo.png" alt="AP Mail" className="w-8 h-8 object-contain" />
      </div>

      <div className="w-8 h-[1px] bg-slate-200" />
      
      {/* Lista Workspace / Vault */}
      <div className="flex-1 w-full flex flex-col items-center space-y-2.5 overflow-y-auto">
        {workspaces.map((ws) => {
          const isActive = ws.workspace_id === activeWorkspaceId;
          return (
            <button
              key={ws.workspace_id}
              onClick={() => setActiveWorkspace(ws.workspace_id)}
              title={`${ws.name} ${ws.is_pec ? '(PEC)' : ''}`}
              className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-amber-500/15 border-2 border-amber-500 text-amber-700 shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
              }`}
            >
              {isActive && (
                <span className="absolute -left-2 w-1 h-6 bg-amber-500 rounded-r-full" />
              )}
              
              {ws.is_pec ? (
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              ) : ws.workspace_type === 'ARCHIVIO_LOCALE' ? (
                <Archive className="w-5 h-5" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tasto Aggiungi Casella PEC / IMAP */}
      <button
        onClick={onOpenAddAccountModal}
        title="Collega nuova Casella PEC o Email"
        className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center justify-center transition-all shadow-sm"
      >
        <UserPlus className="w-5 h-5" />
      </button>

      {/* Tasto Ingestione / Nuovo Archivio Locale */}
      <button
        onClick={onOpenImportModal}
        title="Importa Archivio Storico (PST, MBOX, EML)"
        className="w-11 h-11 rounded-xl bg-white border border-dashed border-slate-300 text-slate-500 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center transition-all shadow-sm"
      >
        <Plus className="w-5 h-5" />
      </button>
    </aside>
  );
};
