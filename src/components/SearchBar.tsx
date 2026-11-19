import React, { useState } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Search, X, HelpCircle } from 'lucide-react';

export const SearchBar: React.FC = () => {
  const { searchQuery, setSearchQuery } = useWorkspaceStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showHelp, setShowHelp] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localQuery);
  };

  const handleClear = () => {
    setLocalQuery('');
    setSearchQuery('');
  };

  return (
    <div className="relative flex-1 max-w-xl">
      <form onSubmit={handleSearch} className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder='Cerca nell&apos;archivio... (es. ha:allegati tipo:pdf allegato:"citazione")'
          className="w-full pl-9 pr-16 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-amber-500/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all shadow-inner"
        />
        <div className="absolute right-2.5 flex items-center space-x-1">
          {localQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            title="Sintassi operatori di ricerca FTS5"
            className="p-1 text-slate-400 hover:text-amber-700 rounded-md"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Popover Aiuto FTS5 */}
      {showHelp && (
        <div className="absolute left-0 right-0 top-10 mt-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] z-50 text-xs text-slate-600 space-y-2 select-text">
          <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1.5">
            Operatori di Ricerca Specialistica FTS5:
          </div>
          <div><code className="text-amber-800 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded font-mono">ha:allegati</code> - Solo messaggi con documenti allegati</div>
          <div><code className="text-amber-800 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded font-mono">tipo:pdf</code> / <code className="text-amber-800 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded font-mono">ext:p7m</code> - Filtra per estensione file</div>
          <div><code className="text-amber-800 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded font-mono">da:rossi</code> / <code className="text-amber-800 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded font-mono">a:tribunale</code> - Filtra per mittente o destinatario</div>
          <div><code className="text-amber-800 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded font-mono">allegato:"ricorso"</code> - Cerca direttamente nel testo interno di PDF, DOCX, XLSX</div>
          <div><code className="text-amber-800 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded font-mono">is:pec</code> - Visualizza esclusivamente messaggi PEC</div>
        </div>
      )}
    </div>
  );
};
