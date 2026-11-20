import React from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { ShieldCheck, Mail, Archive, Plus, UserPlus, Layers, HardDrive, Calendar, HelpCircle } from 'lucide-react';

interface Props {
  activeTab: 'mail' | 'calendar';
  onSelectTab: (tab: 'mail' | 'calendar') => void;
  onOpenImportModal: () => void;
  onOpenAddAccountModal: () => void;
  onOpenStorageModal?: () => void;
  onOpenHelpModal?: () => void;
}

export const WorkspaceSidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  onOpenImportModal,
  onOpenAddAccountModal,
  onOpenStorageModal,
  onOpenHelpModal,
}) => {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  return (
    <aside className="w-16 bg-slate-50/90 backdrop-blur-md flex flex-col items-center py-3.5 space-y-3.5 border-r border-slate-200/70 select-none">
      {/* Brand Logo AP Consulting con bordatura oro soft */}
      <div className="w-11 h-11 rounded-2xl bg-white border border-amber-500/30 p-1 flex items-center justify-center shadow-xs transition-transform hover:scale-105">
        <img src="/logo.png" alt="AP Consulting" className="w-9 h-9 object-contain" />
      </div>

      {/* Switcher Principale Stile Outlook: Posta vs Calendario */}
      <div className="bg-slate-200/60 p-1 rounded-2xl flex flex-col items-center space-y-1 border border-slate-200/80">
        {/* Tasto Posta */}
        <button
          onClick={() => onSelectTab('mail')}
          title="Posta Elettronica & PEC Forense"
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'mail'
              ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/30'
              : 'text-slate-500 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <Mail className="w-5 h-5 stroke-[2.2]" />
        </button>

        {/* Tasto Calendario & Scadenzario (Stile Outlook) */}
        <button
          onClick={() => onSelectTab('calendar')}
          title="Calendario Aziendale & Scadenzario Legale (Outlook Style)"
          className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/30'
              : 'text-slate-500 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <Calendar className="w-5 h-5 stroke-[2.2]" />
          <span className="absolute 1.5 top-1.5 right-1.5 w-2 h-2 bg-rose-600 rounded-full ring-2 ring-white" />
        </button>
      </div>

      <div className="w-8 h-[1px] bg-slate-200/80" />
      
      {/* Sezione Caselle / Workspace */}
      <div className="flex-1 w-full flex flex-col items-center space-y-2 overflow-y-auto px-1">
        {/* Pulsante Vista Unificata "Tutte le Caselle" */}
        <button
          onClick={() => {
            setActiveWorkspace('UNIFIED');
            if (activeTab !== 'mail') onSelectTab('mail');
          }}
          title="Tutte le Caselle (Vista Unificata Globale)"
          className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'mail' && activeWorkspaceId === 'UNIFIED'
              ? 'bg-amber-500/20 border-2 border-amber-500 text-amber-900 font-bold shadow-xs'
              : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-950 shadow-2xs'
          }`}
        >
          {activeTab === 'mail' && activeWorkspaceId === 'UNIFIED' && (
            <span className="absolute -left-2 w-1 h-5 bg-amber-500 rounded-r-full" />
          )}
          <Layers className="w-4 h-4" />
        </button>

        <div className="w-6 h-[1px] bg-slate-200/60 my-0.5" />

        {workspaces.map((ws) => {
          const isActive = activeTab === 'mail' && ws.workspace_id === activeWorkspaceId;
          return (
            <button
              key={ws.workspace_id}
              onClick={() => {
                setActiveWorkspace(ws.workspace_id);
                if (activeTab !== 'mail') onSelectTab('mail');
              }}
              title={`${ws.name} ${ws.is_pec ? '(PEC)' : ''}`}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500/15 border-2 border-amber-500 text-amber-800 shadow-2xs'
                  : 'bg-white border border-slate-200/80 text-slate-500 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
              }`}
            >
              {isActive && (
                <span className="absolute -left-2 w-1 h-5 bg-amber-500 rounded-r-full" />
              )}
              
              {ws.is_pec ? (
                <ShieldCheck className="w-4 h-4 text-amber-600" />
              ) : ws.workspace_type === 'ARCHIVIO_LOCALE' ? (
                <Archive className="w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tasto Aggiungi Casella PEC / IMAP */}
      <button
        onClick={onOpenAddAccountModal}
        title="Collega nuova Casella PEC o Email"
        className="w-10 h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 flex items-center justify-center transition-all shadow-xs cursor-pointer"
      >
        <UserPlus className="w-4 h-4" />
      </button>

      {/* Tasto Ingestione / Nuovo Archivio Locale */}
      <button
        onClick={onOpenImportModal}
        title="Importa Archivio Storico (PST, MBOX, EML)"
        className="w-10 h-10 rounded-xl bg-white border border-dashed border-slate-300 text-slate-500 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* Tasto Allocazione Vault / Google Drive */}
      {onOpenStorageModal && (
        <button
          onClick={onOpenStorageModal}
          title="Allocazione Cartella Mailbox & Google Drive"
          className="w-10 h-10 rounded-xl bg-slate-200/70 hover:bg-slate-300/80 text-slate-600 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
        >
          <HardDrive className="w-4 h-4 text-slate-600" />
        </button>
      )}

      {/* Tasto Guida, Istruzioni & Note Legali */}
      {onOpenHelpModal && (
        <button
          onClick={onOpenHelpModal}
          title="Aiuto, Istruzioni & Note Legali (AP Consulting - Alessandro Patanè)"
          className="w-10 h-10 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300/80 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-amber-700" />
        </button>
      )}
    </aside>
  );
};
