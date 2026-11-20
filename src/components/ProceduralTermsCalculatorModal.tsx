import React, { useState, useEffect } from 'react';
import { 
  ProceduralRite, 
  CalculatedTerm, 
  getProceduralTermsForRite 
} from '../utils/proceduralTerms';
import { useCalendarStore } from '../stores/calendarStore';
import { 
  X, 
  Scale, 
  Calendar, 
  CheckCircle2, 
  ShieldAlert
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  presetDate?: string;
  presetLegalReference?: string;
}

const RITE_OPTIONS: { id: ProceduralRite; label: string; dateLabel: string; isBackward: boolean }[] = [
  {
    id: 'cartabia_171ter',
    label: 'Rito Ordinario Cognizione — Memorie Integrative (Art. 171-ter c.p.c. - Riforma Cartabia)',
    dateLabel: 'Data Udienza di Prima Comparizione (Art. 183 c.p.c.)',
    isBackward: true,
  },
  {
    id: 'cartabia_166',
    label: 'Costituzione Convenuto Rito Ordinario (Art. 166 c.p.c. - 70 gg prima)',
    dateLabel: 'Data Udienza di Prima Comparizione',
    isBackward: true,
  },
  {
    id: 'trattazione_127',
    label: 'Note di Trattazione Scritta (Art. 127-ter c.p.c. - 15 gg prima)',
    dateLabel: 'Data Udienza Sostituita dalle Note',
    isBackward: true,
  },
  {
    id: 'decisione_190',
    label: 'Fase Decisoria — Comparse Conclusionali e Repliche (Art. 189 - 190 c.p.c.)',
    dateLabel: 'Data Udienza di Rimessione in Decisione',
    isBackward: false,
  },
  {
    id: 'appello_breve',
    label: 'Appello Civile — Termine Breve di Impugnazione (Art. 325 c.p.c. - 30 gg)',
    dateLabel: 'Data Notificazione Sentenza di Primo Grado',
    isBackward: false,
  },
  {
    id: 'cassazione_breve',
    label: 'Ricorso per Cassazione — Termine Breve (Art. 325 c.p.c. - 60 gg)',
    dateLabel: 'Data Notificazione Sentenza d\'Appello',
    isBackward: false,
  },
  {
    id: 'termine_lungo',
    label: 'Impugnazioni — Termine Lungo Decadenziale (Art. 327 c.p.c. - 6 mesi)',
    dateLabel: 'Data Pubblicazione Sentenza in Cancelleria',
    isBackward: false,
  },
  {
    id: 'lavoro_416',
    label: 'Rito del Lavoro — Costituzione Convenuto (Art. 416 c.p.c. - 10 gg prima)',
    dateLabel: 'Data Udienza di Discussione',
    isBackward: true,
  },
];

export const ProceduralTermsCalculatorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  presetDate,
  presetLegalReference,
}) => {
  const { addEvent } = useCalendarStore();

  const [selectedRite, setSelectedRite] = useState<ProceduralRite>('cartabia_171ter');
  const [baseDate, setBaseDate] = useState<string>('');
  const [applyFeriale, setApplyFeriale] = useState<boolean>(true);
  const [legalReference, setLegalReference] = useState<string>('');
  const [judge, setJudge] = useState<string>('');
  const [court, setCourt] = useState<string>('');
  const [calculatedTerms, setCalculatedTerms] = useState<CalculatedTerm[]>([]);
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);
  const [isSuccessFeedback, setIsSuccessFeedback] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      // Suggerisci una data udienza tra 3 mesi per default
      const defaultDate = new Date(today);
      defaultDate.setMonth(defaultDate.getMonth() + 3);
      const defStr = defaultDate.toISOString().split('T')[0];

      setBaseDate(presetDate || defStr);
      setLegalReference(presetLegalReference || '');
      setSelectedRite('cartabia_171ter');
      setApplyFeriale(true);
      setIsSuccessFeedback(false);
    }
  }, [isOpen, presetDate, presetLegalReference]);

  useEffect(() => {
    if (baseDate) {
      const terms = getProceduralTermsForRite(selectedRite, baseDate, applyFeriale);
      setCalculatedTerms(terms);
      setSelectedTermIds(terms.map((t) => t.id));
    } else {
      setCalculatedTerms([]);
      setSelectedTermIds([]);
    }
  }, [selectedRite, baseDate, applyFeriale]);

  if (!isOpen) return null;

  const currentRiteConfig = RITE_OPTIONS.find((r) => r.id === selectedRite) || RITE_OPTIONS[0];

  const handleToggleTerm = (id: string) => {
    setSelectedTermIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleAddAllToScadenzario = () => {
    const toAdd = calculatedTerms.filter((t) => selectedTermIds.includes(t.id));
    if (toAdd.length === 0) return;

    for (const term of toAdd) {
      addEvent({
        title: `${term.label} [${term.normReference}]`,
        category: 'termine_legale',
        startDate: `${term.calculatedDate}T13:00`,
        endDate: `${term.calculatedDate}T13:00`,
        allDay: true,
        legalReference: legalReference || undefined,
        judge: judge || undefined,
        location: court || undefined,
        notes: `Calcolo forense automatico conforme a ${term.normReference}.\nData base di riferimento: ${baseDate}\n${term.shiftExplanation}`,
        reminderMinutes: 4320, // 3 giorni prima per i termini perentori
      });
    }

    // Se è un'udienza futura e l'utente ha inserito una data udienza per rito a ritroso, aggiungi anche l'udienza stessa
    if (currentRiteConfig.isBackward && baseDate) {
      addEvent({
        title: `Udienza di Trattazione ${legalReference ? `(${legalReference})` : ''}`,
        category: 'udienza',
        startDate: `${baseDate}T09:30`,
        endDate: `${baseDate}T11:00`,
        legalReference: legalReference || undefined,
        judge: judge || undefined,
        location: court || undefined,
        notes: `Udienza di prima comparizione e trattazione collegata ai termini ex ${currentRiteConfig.label}`,
        reminderMinutes: 1440,
      });
    }

    setIsSuccessFeedback(true);
    setTimeout(() => {
      setIsSuccessFeedback(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Istituzionale */}
        <div className="px-7 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-xs">
              <Scale className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Calcolatore Termini Processuali Forensi
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                  Riforma Cartabia
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Computo automatico dei termini a ritroso, sospensione feriale e festività (ex artt. 155 e 171-ter c.p.c.)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form & Calcolo */}
        <div className="flex-1 overflow-y-auto p-7 space-y-6 text-sm text-slate-700 bg-slate-50/40">
          {/* 1. Selezione Rito & Tipologia */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Procedimento Giudiziario / Rito di Cognizione
              </label>
              <select
                value={selectedRite}
                onChange={(e) => setSelectedRite(e.target.value as ProceduralRite)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-900 font-semibold text-xs"
              >
                {RITE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Data di Partenza */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>{currentRiteConfig.dateLabel} *</span>
                </label>
                <input
                  type="date"
                  required
                  value={baseDate}
                  onChange={(e) => setBaseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              {/* Riferimento Fascicolo RG */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center space-x-1.5">
                  <Scale className="w-3.5 h-3.5 text-amber-600" />
                  <span>Fascicolo / Ruolo Generale (RG)</span>
                </label>
                <input
                  type="text"
                  value={legalReference}
                  onChange={(e) => setLegalReference(e.target.value)}
                  placeholder="Es. RG 51872/2021"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>

            {/* Tribunale & Giudice Opzionali */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Autorità Giudiziaria / Sede
                </label>
                <input
                  type="text"
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                  placeholder="Es. Tribunale Civile di Roma"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Giudice Istruttore / Relatore
                </label>
                <input
                  type="text"
                  value={judge}
                  onChange={(e) => setJudge(e.target.value)}
                  placeholder="Es. Dott.ssa Marini"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Opzioni di Legge: Sospensione Feriale & Regole di Calcolo */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={applyFeriale}
                  onChange={(e) => setApplyFeriale(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4"
                />
                <span>Applica Sospensione Feriale dei Termini (1° - 31 Agosto L. 742/1969)</span>
              </label>

              <span className="text-[11px] text-amber-800 bg-amber-50 font-medium px-2 py-0.5 rounded-md border border-amber-200/60">
                Proroga Festivi & Sabato Inclusa
              </span>
            </div>
          </div>

          {/* 2. Risultati dei Termini Calcolati */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Termini Perentori Calcolati ({calculatedTerms.length})</span>
              </span>
              <span className="text-xs text-slate-500">
                Seleziona i termini da inserire nello Scadenzario
              </span>
            </div>

            {calculatedTerms.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                Inserisci una data valida per generare le scadenze.
              </div>
            ) : (
              calculatedTerms.map((term) => {
                const isSelected = selectedTermIds.includes(term.id);
                const dayOfWeek = new Date(term.calculatedDate).toLocaleDateString('it-IT', { weekday: 'long' });

                return (
                  <div
                    key={term.id}
                    onClick={() => handleToggleTerm(term.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-amber-500/80 shadow-xs ring-1 ring-amber-400/30'
                        : 'bg-white/60 border-slate-200/80 text-slate-500 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleTerm(term.id)}
                          className="mt-1 rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-sm text-slate-950">
                              {term.label}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {term.normReference}
                            </span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                              {term.isBackward ? `-${term.daysOffset} giorni` : `+${term.daysOffset} giorni`}
                            </span>

                            {term.appliedFeriale && (
                              <span className="text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/60 font-medium">
                                Sospensione feriale applicata
                              </span>
                            )}

                            {term.appliedWeekendShift && (
                              <span className="text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-200/60 font-medium">
                                Slittamento festivo/sabato
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-400 mt-1 italic">
                            {term.shiftExplanation}
                          </p>
                        </div>
                      </div>

                      {/* Box Data Calcolata */}
                      <div className="text-right shrink-0 pl-4">
                        <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                          Scadenza Ufficiale
                        </div>
                        <div className="text-base font-extrabold font-mono text-slate-950 mt-0.5">
                          {term.calculatedDate}
                        </div>
                        <div className="text-[11px] font-semibold text-amber-700 capitalize">
                          {dayOfWeek}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Azioni */}
        <div className="px-7 py-4.5 border-t border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>I termini verranno registrati con promemoria 3 giorni prima del deposito.</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annulla
            </button>

            <button
              type="button"
              onClick={handleAddAllToScadenzario}
              disabled={selectedTermIds.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 disabled:opacity-40 transition-all flex items-center space-x-2 cursor-pointer hover:scale-[1.01]"
            >
              {isSuccessFeedback ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Scadenze Registrate!</span>
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4 stroke-[2.2]" />
                  <span>
                    Aggiungi {selectedTermIds.length} Scadenz{selectedTermIds.length === 1 ? 'a' : 'e'} al Calendario
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
