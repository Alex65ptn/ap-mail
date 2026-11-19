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
        <Search className="absolute left-3 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder='Cerca... (es. ha:allegati tipo:pdf da:avv allegato:"citazione")'
          className="w-full pl-9 pr-16 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/80 transition-colors"
        />
        <div className="absolute right-2 flex items-center space-x-1">
          {localQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            title="Sintassi operatori di ricerca"
            className="p-1 text-slate-500 hover:text-amber-400"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Popover Aiuto Sintassi FTS5 */}
      {showHelp && (
        <div className="absolute left-0 right-0 top-10 mt-1 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl z-50 text-xs text-slate-300 space-y-1.5 select-text">
          <div className="font-bold text-amber-400 mb-1">Operatori di Ricerca Avanzata FTS5:</div>
          <div><code className="text-blue-300 bg-slate-800 px-1 py-0.5 rounded">ha:allegati</code> - Solo messaggi con documenti allegati</div>
          <div><code className="text-blue-300 bg-slate-800 px-1 py-0.5 rounded">tipo:pdf</code> / <code className="text-blue-300 bg-slate-800 px-1 py-0.5 rounded">ext:p7m</code> - Filtra per estensione allegato</div>
          <div><code className="text-blue-300 bg-slate-800 px-1 py-0.5 rounded">da:rossi</code> / <code className="text-blue-300 bg-slate-800 px-1 py-0.5 rounded">a:tribunale</code> - Mittente o destinatario</div>
          <div><code className="text-blue-300 bg-slate-800 px-1 py-0.5 rounded">allegato:"ricorso"</code> - Cerca dentro il testo estratto da PDF, DOCX, XLSX</div>
          <div><code className="text-blue-300 bg-slate-800 px-1 py-0.5 rounded">is:pec</code> - Solo messaggi PEC certificati</div>
        </div>
      )}
    </div>
  );
};
