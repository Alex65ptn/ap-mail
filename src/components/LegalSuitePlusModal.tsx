import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  Sparkles, 
  Calendar, 
  Receipt, 
  TrendingUp, 
  Landmark, 
  X, 
  CheckCircle2, 
  Copy, 
  Check, 
  Bot, 
  AlertTriangle,
  Play
} from 'lucide-react';
import { useCalendarStore } from '../stores/calendarStore';
import { 
  ProceduralRite, 
  getProceduralTermsForRite 
} from '../utils/proceduralTerms';
import { 
  calculateLegalInterests, 
  calculateParcellaForense, 
  calculateContributoUnificato, 
  PARAMETRI_TRIBUNALE_ORDINARIO,
  InterestCalculationResult,
  ParcellaCalculationResult
} from '../utils/legalFinancialCalculators';
import { 
  analyzeLegalCommunicationAi, 
  generateFormalLegalReplyDraft, 
  LegalExtractedData 
} from '../utils/localLegalAi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  presetText?: string;
  presetSubject?: string;
  onOpenComposeWithDraft?: (draftBody: string) => void;
}

type PlusTab = 'ai_assistant' | 'termini' | 'interessi' | 'parcella' | 'contributo';

export const LegalSuitePlusModal: React.FC<Props> = ({
  isOpen,
  onClose,
  presetText = '',
  presetSubject = '',
  onOpenComposeWithDraft,
}) => {
  const { addEvent } = useCalendarStore();
  const [activeTab, setActiveTab] = useState<PlusTab>('ai_assistant');

  // --- STATO AI ASSISTANT ---
  const [aiInputText, setAiInputText] = useState('');
  const [aiInputSubject, setAiInputSubject] = useState('');
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiResult, setAiResult] = useState<LegalExtractedData | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // --- STATO TERMINI PROCESSUALI ---
  const [selectedRite, setSelectedRite] = useState<ProceduralRite>('cartabia_171ter');
  const [terminiBaseDate, setTerminiBaseDate] = useState('');
  const [applyFeriale, setApplyFeriale] = useState(true);
  const [legalRef, setLegalRef] = useState('');
  const [terminiSuccessFeedback, setTerminiSuccessFeedback] = useState(false);

  // --- STATO INTERESSI LEGALI ---
  const [capitalInput, setCapitalInput] = useState<number>(10000);
  const [intStartDate, setIntStartDate] = useState('2023-01-01');
  const [intEndDate, setIntEndDate] = useState('2026-11-20');
  const [intAnatocism, setIntAnatocism] = useState(false);
  const [interestResult, setInterestResult] = useState<InterestCalculationResult | null>(null);

  // --- STATO PARCELLA FORENSE ---
  const [selectedScaglione, setSelectedScaglione] = useState('scaglione_3'); // 5.200 - 26.000
  const [fasiSelezionate, setFasiSelezionate] = useState({
    studio: true,
    introduttiva: true,
    istruttoria: true,
    decisionale: true,
  });
  const [percentVariazione, setPercentVariazione] = useState(0);
  const [parcellaResult, setParcellaResult] = useState<ParcellaCalculationResult | null>(null);

  // --- STATO CONTRIBUTO UNIFICATO ---
  const [valoreCausaCu, setValoreCausaCu] = useState<number>(15000);

  // Reset & Inizializzazione dati
  useEffect(() => {
    if (isOpen) {
      setAiInputText(presetText);
      setAiInputSubject(presetSubject);

      const today = new Date();
      const in3Months = new Date(today);
      in3Months.setMonth(in3Months.getMonth() + 3);
      setTerminiBaseDate(in3Months.toISOString().split('T')[0]);

      setIntEndDate(today.toISOString().split('T')[0]);

      // Esegui calcoli iniziali
      setInterestResult(calculateLegalInterests(capitalInput, intStartDate, today.toISOString().split('T')[0], intAnatocism));
      setParcellaResult(calculateParcellaForense(selectedScaglione, fasiSelezionate, percentVariazione));

      // Se c'è un testo presente, avvia analisi automatica AI
      if (presetText.trim()) {
        handleRunAiAnalysis(presetText, presetSubject);
      }
    }
  }, [isOpen, presetText, presetSubject]);

  if (!isOpen) return null;

  // Handler Analisi AI
  const handleRunAiAnalysis = async (textToAnalyze?: string, subjToAnalyze?: string) => {
    const txt = textToAnalyze !== undefined ? textToAnalyze : aiInputText;
    const sub = subjToAnalyze !== undefined ? subjToAnalyze : aiInputSubject;
    if (!txt.trim() && !sub.trim()) return;

    setIsAnalyzingAi(true);
    try {
      const res = await analyzeLegalCommunicationAi(txt, sub);
      setAiResult(res);

      if (res.suggestedBaseDate) {
        setTerminiBaseDate(res.suggestedBaseDate);
      }
      if (res.identifiedRite) {
        setSelectedRite(res.identifiedRite as ProceduralRite);
      }
      if (res.rgNumber) {
        setLegalRef(`R.G. ${res.rgNumber}${res.court ? ' c/o ' + res.court : ''}`);
      }
    } catch (err) {
      console.error('Errore analisi AI:', err);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Handler Generazione & Copia Bozza Risposta Formale
  const handleGenerateReply = () => {
    if (!aiResult) return;
    const draft = generateFormalLegalReplyDraft(
      'Egregio Collega',
      aiInputSubject || 'Comunicazione giudiziaria',
      aiResult.actType,
      aiResult.rgNumber,
      aiResult.court
    );

    if (onOpenComposeWithDraft) {
      onOpenComposeWithDraft(draft);
      onClose();
    } else {
      navigator.clipboard.writeText(draft);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2500);
    }
  };

  // Handler Aggiunta Termini al Calendario
  const handleAddTerminiToCalendar = () => {
    if (!terminiBaseDate) return;
    const terms = getProceduralTermsForRite(selectedRite, terminiBaseDate, applyFeriale);

    for (const term of terms) {
      addEvent({
        title: `${term.label} [${term.normReference}]`,
        category: 'termine_legale',
        startDate: `${term.calculatedDate}T13:00`,
        endDate: `${term.calculatedDate}T13:00`,
        allDay: true,
        legalReference: legalRef || undefined,
        notes: `Calcolato con AP Mail PLUS - Rito: ${selectedRite}\nBase: ${terminiBaseDate}\n${term.shiftExplanation}`,
      });
    }

    setTerminiSuccessFeedback(true);
    setTimeout(() => setTerminiSuccessFeedback(false), 3000);
  };

  // Ricalcolo Interessi
  const handleRecalculateInterests = () => {
    setInterestResult(calculateLegalInterests(capitalInput, intStartDate, intEndDate, intAnatocism));
  };

  // Ricalcolo Parcella
  const handleRecalculateParcella = (
    scaglione = selectedScaglione,
    fasi = fasiSelezionate,
    variazione = percentVariazione
  ) => {
    setParcellaResult(calculateParcellaForense(scaglione, fasi, variazione));
  };

  const calculatedCu = calculateContributoUnificato(valoreCausaCu);
  const calculatedTermsList = terminiBaseDate ? getProceduralTermsForRite(selectedRite, terminiBaseDate, applyFeriale) : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[88vh] max-h-[820px] flex flex-col overflow-hidden select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modale con Brand AP Mail PLUS */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-between border-b border-slate-800 select-none">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 flex items-center justify-center shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight text-white">AP Mail</span>
                <span className="text-[11px] bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                  PLUS
                </span>
                <span className="text-xs text-slate-400">• Suite Forense & AI Locale</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Calcolatori Legali (Modello AvvocatoAndreani) & Assistente AI Offline • 100% Riservato
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher dei 5 Strumenti PLUS */}
        <div className="px-6 bg-slate-100/90 border-b border-slate-200 flex items-center space-x-1 select-none overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('ai_assistant')}
            className={`py-3 px-4 font-bold text-xs flex items-center space-x-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ai_assistant'
                ? 'border-amber-500 text-slate-950 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bot className="w-4 h-4 text-amber-600" />
            <span>AP Legal AI (Assistente Locale)</span>
          </button>

          <button
            onClick={() => setActiveTab('termini')}
            className={`py-3 px-4 font-bold text-xs flex items-center space-x-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'termini'
                ? 'border-amber-500 text-slate-950 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scale className="w-4 h-4 text-amber-600" />
            <span>Termini Processuali & Cartabia</span>
          </button>

          <button
            onClick={() => setActiveTab('interessi')}
            className={`py-3 px-4 font-bold text-xs flex items-center space-x-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'interessi'
                ? 'border-amber-500 text-slate-950 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <span>Interessi Legali & Rivalutazione</span>
          </button>

          <button
            onClick={() => setActiveTab('parcella')}
            className={`py-3 px-4 font-bold text-xs flex items-center space-x-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'parcella'
                ? 'border-amber-500 text-slate-950 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4 text-amber-600" />
            <span>Parcella Forense (D.M. 147/2022)</span>
          </button>

          <button
            onClick={() => setActiveTab('contributo')}
            className={`py-3 px-4 font-bold text-xs flex items-center space-x-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'contributo'
                ? 'border-amber-500 text-slate-950 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Landmark className="w-4 h-4 text-amber-600" />
            <span>Contributo Unificato</span>
          </button>
        </div>

        {/* CONTENUTO SCHEDE */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 space-y-6 text-slate-700 text-xs">

          {/* ============================================================== */}
          {/* TAB 1: AP LEGAL AI (ASSISTENTE FORENSE OFFLINE)                */}
          {/* ============================================================== */}
          {activeTab === 'ai_assistant' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Badge Privacy & Stato AI Locale */}
              <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-300/80 p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                  <div>
                    <span className="font-bold text-emerald-950 text-xs">Motore AI Locale Operativo — Privacy Forense Garantita</span>
                    <span className="text-emerald-800/80 text-[11px] block">
                      Elaborazione 100% sulla macchina locale (Zero invio al cloud di terze parti • Conforme GDPR & Segreto Professionale).
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-white border border-emerald-300 text-emerald-800 font-bold px-2 py-0.5 rounded-full shadow-2xs font-mono">
                  OFFLINE ACTIVE
                </span>
              </div>

              {/* Riquadro Input Testo della PEC / Atto */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                    <Bot className="w-4 h-4 text-amber-600" />
                    <span>Testo dell'Atto Giudiziario, Notifica PEC o Comunicazione di Cancelleria</span>
                  </label>
                  <button
                    onClick={() => handleRunAiAnalysis()}
                    disabled={isAnalyzingAi || (!aiInputText.trim() && !aiInputSubject.trim())}
                    className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isAnalyzingAi ? 'Analisi Forense in Corso...' : 'Analizza con AI'}</span>
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Oggetto della comunicazione (es. Notificazione ex L. 53/1994 - Atto di citazione R.G. 1234/2026)"
                  value={aiInputSubject}
                  onChange={(e) => setAiInputSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-amber-500 outline-none transition-colors"
                />

                <textarea
                  rows={4}
                  placeholder="Incolla qui il testo del messaggio, della relata di notifica o del provvedimento giudiziario..."
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-amber-500 outline-none transition-colors font-mono"
                />
              </div>

              {/* Risultato dell'Analisi AI Forense */}
              {aiResult && (
                <div className="bg-white p-5 rounded-2xl border border-amber-300 shadow-sm space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs uppercase font-extrabold text-amber-800 tracking-wider">
                          Provvedimento Riconosciuto
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-900 border border-amber-300">
                          {aiResult.actType}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-950 mt-1">
                        {aiResult.court || 'Autorità Giudiziaria da Verificare'} {aiResult.rgNumber && `— ${aiResult.rgNumber}`}
                      </h4>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleGenerateReply}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[11px] flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        {copiedDraft ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{copiedDraft ? 'Bozza Copiata!' : 'Genera Bozza Risposta'}</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('termini')}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-[11px] flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>Visualizza Termini & Scadenzario</span>
                      </button>
                    </div>
                  </div>

                  {/* Sintesi in 3 punti */}
                  <div>
                    <span className="text-xs font-bold text-slate-900 block mb-2">Sommario Forense della Comunicazione:</span>
                    <ul className="space-y-1.5 pl-1">
                      {aiResult.summaryPoints.map((pt, i) => (
                        <li key={i} className="flex items-start space-x-2 text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Azione Raccomandata */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-950 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Azione Raccomandata per lo Studio:</span>
                      <p className="mt-0.5 text-[11px] text-amber-900/90">{aiResult.recommendedAction}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: CALCOLO TERMINI PROCESSUALI (RIFORMA CARTABIA & C.P.C.)  */}
          {/* ============================================================== */}
          {activeTab === 'termini' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-900 block mb-1">Rito Processuale / Adempimento</label>
                    <select
                      value={selectedRite}
                      onChange={(e) => setSelectedRite(e.target.value as ProceduralRite)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                    >
                      <option value="cartabia_171ter">Memorie Integrative Rito Ordinario (Art. 171-ter c.p.c. - Riforma Cartabia)</option>
                      <option value="cartabia_166">Costituzione Convenuto Rito Ordinario (Art. 166 c.p.c. - 70 gg prima)</option>
                      <option value="trattazione_127">Note di Trattazione Scritta (Art. 127-ter c.p.c. - 15 gg prima)</option>
                      <option value="decisione_190">Fase Decisoria — Comparse Conclusionali e Repliche (Art. 190 c.p.c.)</option>
                      <option value="appello_breve">Appello Civile — Termine Breve di Impugnazione (Art. 325 c.p.c. - 30 gg)</option>
                      <option value="cassazione_breve">Ricorso per Cassazione — Termine Breve (Art. 325 c.p.c. - 60 gg)</option>
                      <option value="termine_lungo">Impugnazioni — Termine Lungo Decadenziale (Art. 327 c.p.c. - 6 mesi)</option>
                      <option value="lavoro_416">Rito del Lavoro — Costituzione Convenuto (-10 gg prima)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-900 block mb-1">Data Base di Riferimento (Udienza / Notifica / Deposito)</label>
                    <input
                      type="date"
                      value={terminiBaseDate}
                      onChange={(e) => setTerminiBaseDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={applyFeriale}
                      onChange={(e) => setApplyFeriale(e.target.checked)}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                    />
                    <span>Applica Sospensione Feriale dei Termini (1 — 31 Agosto ex L. 742/1969)</span>
                  </label>

                  <button
                    onClick={handleAddTerminiToCalendar}
                    disabled={calculatedTermsList.length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {terminiSuccessFeedback ? 'Scadenze Registrate!' : `Iscrivi ${calculatedTermsList.length} Scadenze nel Calendario`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Elenco Termini Calcolati */}
              <div className="space-y-2.5">
                {calculatedTermsList.map((term) => (
                  <div key={term.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-950 text-xs">{term.label}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {term.normReference}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{term.shiftExplanation}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-extrabold font-mono text-slate-950">{term.calculatedDate}</div>
                      <div className="text-[10px] text-amber-700 font-semibold">{term.isBackward ? `-${term.daysOffset} gg` : `+${term.daysOffset} gg`}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: CALCOLO INTERESSI LEGALI & RIVALUTAZIONE (MEF 1942-2026)*/}
          {/* ============================================================== */}
          {activeTab === 'interessi' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="font-bold text-slate-900 block mb-1">Capitale Iniziale (€)</label>
                    <input
                      type="number"
                      value={capitalInput}
                      onChange={(e) => setCapitalInput(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-900 block mb-1">Data Inizio Decorrenza</label>
                    <input
                      type="date"
                      value={intStartDate}
                      onChange={(e) => setIntStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-900 block mb-1">Data Fine Calcolo</label>
                    <input
                      type="date"
                      value={intEndDate}
                      onChange={(e) => setIntEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={intAnatocism}
                      onChange={(e) => setIntAnatocism(e.target.checked)}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                    />
                    <span>Capitalizzazione Annuale degli Interessi (Anatocismo ex Art. 1283 c.c.)</span>
                  </label>

                  <button
                    onClick={handleRecalculateInterests}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Ricalcola Interessi
                  </button>
                </div>
              </div>

              {/* Risultato Totale Interessi */}
              {interestResult && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Capitale Base</span>
                    <span className="text-lg font-black text-slate-900 font-mono mt-1 block">€ {interestResult.initialCapital.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-2xs">
                    <span className="text-amber-800 text-[10px] uppercase font-bold tracking-wider block">Totale Interessi Maturati</span>
                    <span className="text-lg font-black text-amber-900 font-mono mt-1 block">+ € {interestResult.totalInterest.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-2xs">
                    <span className="text-amber-400 text-[10px] uppercase font-bold tracking-wider block">Importo Finale Complessivo</span>
                    <span className="text-lg font-black text-white font-mono mt-1 block">€ {interestResult.finalTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              {/* Dettaglio Periodi Storici Applicati */}
              {interestResult && interestResult.periods.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                        <th className="py-2.5 px-4 font-bold">Periodo Storico</th>
                        <th className="py-2.5 px-4 font-bold">Tasso Annuo</th>
                        <th className="py-2.5 px-4 font-bold text-center">Giorni</th>
                        <th className="py-2.5 px-4 font-bold text-right">Interesse Maturato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {interestResult.periods.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 text-slate-800">{p.startDate} — {p.endDate}</td>
                          <td className="py-2.5 px-4 font-bold text-amber-700">{p.periodLabel}</td>
                          <td className="py-2.5 px-4 text-center text-slate-600">{p.days}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900">€ {p.interestAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: PARCELLA FORENSE (D.M. 55/2014 & D.M. 147/2022)         */}
          {/* ============================================================== */}
          {activeTab === 'parcella' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-900 block mb-1">Scaglione di Valore della Causa (Tribunale Ordinario)</label>
                    <select
                      value={selectedScaglione}
                      onChange={(e) => {
                        setSelectedScaglione(e.target.value);
                        handleRecalculateParcella(e.target.value, fasiSelezionate, percentVariazione);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                    >
                      {PARAMETRI_TRIBUNALE_ORDINARIO.map((b) => (
                        <option key={b.id} value={b.id}>{b.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-900 block mb-1">Variazione Discrezionale dei Valori Medi: {percentVariazione}%</label>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="5"
                      value={percentVariazione}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setPercentVariazione(val);
                        handleRecalculateParcella(selectedScaglione, fasiSelezionate, val);
                      }}
                      className="w-full accent-amber-500 mt-2"
                    />
                  </div>
                </div>

                {/* Selezione Fasi Processuali Svolte */}
                <div>
                  <span className="font-bold text-slate-900 block mb-2">Fasi del Giudizio Svolte:</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {[
                      { key: 'studio', label: '1. Fase Studio' },
                      { key: 'introduttiva', label: '2. Fase Introduttiva' },
                      { key: 'istruttoria', label: '3. Fase Istruttoria' },
                      { key: 'decisionale', label: '4. Fase Decisionale' },
                    ].map((f) => (
                      <label key={f.key} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center space-x-2 cursor-pointer hover:bg-white transition-colors">
                        <input
                          type="checkbox"
                          checked={fasiSelezionate[f.key as keyof typeof fasiSelezionate]}
                          onChange={(e) => {
                            const newFasi = { ...fasiSelezionate, [f.key]: e.target.checked };
                            setFasiSelezionate(newFasi);
                            handleRecalculateParcella(selectedScaglione, newFasi, percentVariazione);
                          }}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800">{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Riepilogo Fattura Forense */}
              {parcellaResult && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 font-mono text-xs">
                  <div className="flex justify-between py-1 text-slate-700">
                    <span>Compenso Professionale Base:</span>
                    <span className="font-bold">€ {parcellaResult.compensoBase.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>+ Spese Generali Forfettarie (15%):</span>
                    <span>€ {parcellaResult.speseForfettarie15.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>+ Cassa Previdenza Avvocati CPA (4%):</span>
                    <span>€ {parcellaResult.cpa4.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>+ I.V.A. di Legge (22%):</span>
                    <span>€ {parcellaResult.iva22.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t border-slate-200 font-bold text-slate-900 text-sm">
                    <span>TOTALE FATTURA:</span>
                    <span>€ {parcellaResult.totaleFattura.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-rose-600">
                    <span>- Ritenuta d'Acconto (20% su compenso):</span>
                    <span>- € {parcellaResult.ritenutaAcconto20.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-t-2 border-slate-900 font-black text-slate-950 text-base bg-amber-50/70 px-3 rounded-xl">
                    <span>NETTO DA CORRISPONDERE:</span>
                    <span className="text-amber-900">€ {parcellaResult.nettoACaricoOVersare.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: CONTRIBUTO UNIFICATO (D.P.R. 115/2002)                  */}
          {/* ============================================================== */}
          {activeTab === 'contributo' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div>
                  <label className="font-bold text-slate-900 block mb-1">Valore della Lite / Domanda (€)</label>
                  <input
                    type="number"
                    value={valoreCausaCu}
                    onChange={(e) => setValoreCausaCu(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-amber-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Giudizio Ordinario Civile</span>
                  <span className="text-xl font-black text-slate-900 font-mono mt-1 block">€ {calculatedCu.ordinario.toFixed(2)}</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">Primo Grado (Tribunale / GdP)</span>
                </div>

                <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl shadow-2xs">
                  <span className="text-sky-800 text-[10px] uppercase font-bold tracking-wider block">Rito Lavoro & Previdenza</span>
                  <span className="text-xl font-black text-sky-950 font-mono mt-1 block">€ {calculatedCu.lavoro.toFixed(2)}</span>
                  <span className="text-[11px] text-sky-700 mt-1 block">Dimezzato ex lege (o esente)</span>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-2xs">
                  <span className="text-amber-800 text-[10px] uppercase font-bold tracking-wider block">Giudizio di Impugnazione / Appello</span>
                  <span className="text-xl font-black text-amber-950 font-mono mt-1 block">€ {calculatedCu.impugnazione.toFixed(2)}</span>
                  <span className="text-[11px] text-amber-800 mt-1 block">+50% per gradi successivi</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Modale */}
        <div className="px-6 py-3.5 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between select-none">
          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>AP Mail PLUS • Calcolatori Forensi & AI Locale (AP Consulting — Alessandro Patanè)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
