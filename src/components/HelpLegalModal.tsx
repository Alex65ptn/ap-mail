import React, { useState } from 'react';
import { 
  BookOpen, 
  Scale, 
  ShieldCheck, 
  Keyboard, 
  Lock, 
  X, 
  Check, 
  Copy, 
  FileCheck2, 
  Mail, 
  Calendar, 
  Sparkles,
  Layers
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'guida' | 'tastiera' | 'pct' | 'legale';

export const HelpLegalModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('guida');
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen) return null;

  const handleCopyAttestationTemplate = () => {
    const text = `ATTESTAZIONE DI CONFORMITÀ EX ART. 19-TER D.LGS. 82/2005
Il sottoscritto, in qualità di difensore/professionista, attesta ai sensi e per gli effetti degli artt. 16-bis, comma 9-bis e 16-undecies del D.L. 179/2012, nonché dell'art. 19-ter del D.Lgs. 82/2005 (CAD), che il presente messaggio di posta elettronica / PEC e i relativi allegati estratti da AP Mail sono conformi ai documenti informatici originali.
Impronta Crittografica (SHA-256): [INSERIRE HASH GENERATO DA AP MAIL]`;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[85vh] max-h-[780px] flex flex-col overflow-hidden select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modale con Brand AP Consulting */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700 select-none">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white p-1 flex items-center justify-center border border-amber-500/40 shadow-xs">
              <img src="/logo.png" alt="AP Consulting" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight text-white">AP Mail</span>
                <span className="text-[10px] bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Forense & Legale
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Software ideato e sviluppato da <strong className="text-white font-semibold">Alessandro Patanè</strong> sotto il marchio commerciale <strong className="text-amber-400 font-semibold">AP Consulting</strong>
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

        {/* Tab Switcher */}
        <div className="px-6 bg-slate-100 border-b border-slate-200 flex items-center space-x-1 select-none">
          <button
            onClick={() => setActiveTab('guida')}
            className={`py-3 px-4 font-bold text-xs flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'guida'
                ? 'border-amber-500 text-slate-950 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>Manuale & Funzionalità</span>
          </button>

          <button
            onClick={() => setActiveTab('tastiera')}
            className={`py-3 px-4 font-bold text-xs flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'tastiera'
                ? 'border-amber-500 text-slate-950 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Keyboard className="w-4 h-4 text-amber-600" />
            <span>Scorciatoie & Frecce</span>
          </button>

          <button
            onClick={() => setActiveTab('pct')}
            className={`py-3 px-4 font-bold text-xs flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'pct'
                ? 'border-amber-500 text-slate-950 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scale className="w-4 h-4 text-amber-600" />
            <span>Depositi PCT & CAD</span>
          </button>

          <button
            onClick={() => setActiveTab('legale')}
            className={`py-3 px-4 font-bold text-xs flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'legale'
                ? 'border-amber-500 text-slate-950 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Note Legali & Privacy</span>
          </button>
        </div>

        {/* Contenuto Tab */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 space-y-6 text-slate-700 text-xs leading-relaxed">
          
          {/* TAB 1: MANUALE & FUNZIONALITÀ */}
          {activeTab === 'guida' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-amber-600" />
                  <span>Architettura Multi-Account & Gestione PEC</span>
                </h3>
                <p className="text-slate-600 mb-3">
                  AP Mail è concepito per unire la semplicità d'uso di Microsoft Outlook con il rigore probatorio richiesto per le prove forensi e i depositi giudiziari.
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li><strong>Supporto Completo IMAP / POP3 / PEC</strong>: sincronizzazione sicura con protocolli TLS 1.3 senza memorizzazione su cloud esterni.</li>
                  <li><strong>Buste AgID Certificate</strong>: riconoscimento automatico di Accettazione, Avvenuta Consegna e tracciamento identificativo univoco AgID.</li>
                  <li><strong>Vista Unificata Globale (Icona Livelli)</strong>: visualizza in un solo flusso tutte le email arrivate su tutti i tuoi account configurati.</li>
                  <li><strong>Importazione Archivi Storici</strong>: ingestione rapida di file PST, MBOX ed EML senza limiti di dimensione.</li>
                </ul>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>Integrazione Scadenzario Legale & Calendario Forense</span>
                </h3>
                <p className="text-slate-600 mb-3">
                  Non rischiare mai la decadenza di un termine processuale o di una memoria difensiva:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li><strong>Aggiungi a Scadenzario</strong>: clicca sul pulsante <em>"Aggiungi a Scadenze"</em> in qualsiasi email per fissare udienze, termini perentori o adempimenti fiscali.</li>
                  <li><strong>Switch Rapido Stile Outlook</strong>: passa in un clic dalla posta al calendario tramite la barra laterale sinistra.</li>
                  <li><strong>Notifiche e Categorie</strong>: scadenze colorate per udienze, notifiche PEC, atti e riunioni.</li>
                </ul>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>Interrogazione Istantanea FTS5 & Ordinamento</span>
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li><strong>Ricerca Globale FTS5</strong>: motore SQLite Full-Text Search indicizzato su mittente, oggetto, testo e allegati in pochi millisecondi.</li>
                  <li><strong>Ordinamento Diretto</strong>: 4 pulsanti dedicati per ordinare istantaneamente per <em>Data</em>, <em>Mittente (A-Z)</em>, <em>Dimensione (KB/MB)</em> e <em>Non Lette in cima</em>.</li>
                  <li><strong>Filtri Rapidi a Pillola</strong>: visualizza solo le <em>Non lette</em>, solo le <em>PEC</em>, o solo i messaggi con <em>Allegati</em>.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: NAVIGAZIONE DA TASTIERA & SCORCIATOIE */}
          {activeTab === 'tastiera' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-amber-500/10 border border-amber-300 p-4 rounded-2xl">
                <div className="flex items-center space-x-2 text-amber-900 font-bold mb-1">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Navigazione Ultrarapida con le Frecce (Senza Mouse)</span>
                </div>
                <p className="text-amber-950 text-xs">
                  Per smarcare e leggere centinaia di email in arrivo, puoi utilizzare direttamente la tastiera con scorrimento automatico continuo.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                      <th className="py-2.5 px-4 font-bold">Comando / Tasto</th>
                      <th className="py-2.5 px-4 font-bold">Azione Svolta</th>
                      <th className="py-2.5 px-4 font-bold">Stato & Persistenza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 flex items-center space-x-1.5">
                        <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded shadow-2xs">↓</kbd>
                        <span>oppure</span>
                        <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded shadow-2xs">j</kbd>
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        Passa alla <strong>mail successiva</strong>, la visualizza a destra e fa scorrere la lista automaticamente.
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-semibold flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Segna subito come Letta</span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 flex items-center space-x-1.5">
                        <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded shadow-2xs">↑</kbd>
                        <span>oppure</span>
                        <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded shadow-2xs">k</kbd>
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        Passa alla <strong>mail precedente</strong> e fa scorrere la lista verso l'alto.
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-semibold flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Segna subito come Letta</span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 flex items-center space-x-1.5">
                        <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded shadow-2xs">↵ Invio</kbd>
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        Apre la mail selezionata nella <strong>finestra nativa dedicata</strong> (fuori dal client).
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        Apre viewer indipendente
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 flex items-center space-x-1.5">
                        <span className="text-blue-600">Pallino Blu</span>
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        Clicca sul pallino blu o grigio per invertire manualmente lo stato tra <strong>Letto</strong> e <strong>Non Letto</strong>.
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        Persistente in SQLite
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 flex items-center space-x-1.5">
                        <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded shadow-2xs">Doppio Clic</kbd>
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        Doppio clic su qualsiasi riga per aprire la finestra di lettura nativa a tutto schermo.
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-semibold flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Segna subito come Letta</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DEPOSITI TELEMATICI PCT & CAD */}
          {activeTab === 'pct' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center space-x-2">
                  <Scale className="w-4 h-4 text-amber-600" />
                  <span>Validità Legale nei Depositi Giudiziari Telematici (PCT / PAT / PTT)</span>
                </h3>
                <p className="text-slate-600 mb-3">
                  AP Mail include un motore dedicato all'estrazione probatoria delle comunicazioni PEC e degli allegati conformemente alle norme di legge:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1">Art. 19-ter D.Lgs. 82/2005 (CAD)</span>
                    Attestazione di conformità della copia informatica estratta rispetto al messaggio originale custodito nel repository.
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1">D.L. 179/2012 e D.M. 44/2011</span>
                    Regole tecniche per i depositi degli atti nel Processo Civile, Tributario e Amministrativo Telematico.
                  </div>
                </div>
              </div>

              {/* Riquadro Attestazione Pronta per Copia */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-amber-400 text-xs flex items-center space-x-1.5">
                    <FileCheck2 className="w-4 h-4" />
                    <span>Formula di Attestazione di Conformità (Art. 19-ter CAD)</span>
                  </span>
                  <button
                    onClick={handleCopyAttestationTemplate}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] flex items-center space-x-1 transition-all cursor-pointer shadow-xs"
                  >
                    {copiedText ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedText ? 'Copiato!' : 'Copia Formula'}</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap bg-slate-950/60 p-3 rounded-xl border border-slate-800">
{`"Il sottoscritto difensore attesta, ai sensi dell'art. 16-bis, comma 9-bis, e 16-undecies del D.L. 179/2012, nonché dell'art. 19-ter del D.Lgs. 82/2005, che il presente messaggio di posta elettronica / PEC (inclusi i file allegati e le ricevute di accettazione/consegna) estratto da AP Mail è conforme all'originale informatico. Impronta SHA-256 generata: [HASH_CALCOLATO]"`}
                </pre>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <h4 className="font-bold text-slate-900 mb-1">Verifica Firme Digitali (.p7m / CAdES)</h4>
                <p className="text-slate-600 text-[11px]">
                  Tutti gli allegati firmati digitalmente in formato <strong>CAdES (.p7m)</strong> vengono contrassegnati con l'apposito badge di certificazione. AP Mail consente l'apertura immediata e l'estrazione della busta crittografica originaria.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: NOTE LEGALI, RISERVATEZZA & AUTORE */}
          {activeTab === 'legale' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Box Proprietà Intellettuale & Paternità */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Diritti di Proprietà Intellettuale & Copyright</span>
                </h3>
                <p className="text-slate-700 leading-relaxed mb-3">
                  <strong>AP Mail</strong> è un software proprietario ideato, progettato e sviluppato da <strong>Alessandro Patanè</strong>, che ne detiene in via esclusiva la paternità e tutti i diritti morali ed economici di proprietà intellettuale. I software operano sotto il marchio commerciale <strong>AP Consulting</strong>, riconducibile ad Alessandro Patanè.
                </p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                  © 2026 Alessandro Patanè — Marchio AP Consulting. Tutti i diritti riservati.<br />
                  Ogni riproduzione, decompilazione, reverse-engineering o distribuzione non autorizzata è vietata ai sensi della Legge 22 aprile 1941, n. 633 sul diritto d'autore e delle normative comunitarie vigenti.
                </div>

                {/* Clausola di Esclusione d'Uso per violazione software AP Consulting */}
                <div className="mt-3.5 bg-rose-50 border border-rose-200/90 rounded-xl p-3.5 text-rose-950 text-xs">
                  <div className="font-bold text-rose-900 flex items-center space-x-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                    <span>DIVIETO ESPRESSO D'USO E CONDIZIONE VINCOLANTE DI LICENZA</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-900/90">
                    È fatto <strong>espresso, assoluto ed inderogabile divieto di utilizzo, detenzione, download, installazione o consultazione</strong> del presente software, in qualsiasi forma o ambiente, a qualunque persona fisica o giuridica, società, ente o studio che abbia direttamente o indirettamente violato, contraffatto, sottratto o illecitamente utilizzato i software, i codici sorgente, i segreti industriali o i diritti di proprietà intellettuale di <strong>Alessandro Patanè</strong> e/o dei software operanti sotto il marchio <strong>AP Consulting</strong>, nonché a <strong>tutte le imprese, enti o soggetti che abbiano collaborato con imprese ed enti che hanno violato i software di Alessandro Patanè e/o del marchio AP Consulting</strong>. Qualsiasi violazione comporta responsabilità civile e penale con richiesta di risarcimento del danno in tutte le competenti sedi giudiziarie.
                  </p>
                </div>
              </div>

              {/* Garanzia di Riservatezza & GDPR */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Tutela della Privacy & Custodia Esclusivamente Locale (GDPR)</span>
                </h3>
                <p className="text-slate-600 mb-2">
                  In conformità al <strong>Regolamento Generale sulla Protezione dei Dati (UE) 2016/679 (GDPR)</strong>:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-[11px]">
                  <li><strong>Zero Telemetria Esterna</strong>: nessun dato di posta, credenziale, allegato, indirizzo o statistica viene trasmesso o registrato su server cloud esterni.</li>
                  <li><strong>Storage Locale & Isolamento</strong>: l'archivio crittografico (CAS), il database relazionale (SQLite con PRAGMA WAL) e i file di configurazione risiedono esclusivamente sulla macchina dell'utente con permessi di accesso ristretti (<code>0600</code>).</li>
                  <li><strong>Segreto Professionale</strong>: l'architettura garantisce la totale riservatezza richiesta per la tutela del segreto professionale forense e aziendale.</li>
                </ul>
              </div>

              {/* Clausola di Esonero Responsabilità */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-500 text-[10px] leading-relaxed">
                <strong>LIMITAZIONE DI RESPONSABILITÀ:</strong> Il software viene fornito "così com'è" a supporto dell'attività di gestione documentale e consultazione della posta. Resta a carico del professionista e dell'utente la verifica finale della correttezza dei depositi telematici e del rispetto dei termini perentori di legge stabiliti dalle competenti autorità giudiziarie o amministrative.
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between select-none">
          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>AP Mail v1.0.0 • Sistema Operativo: macOS Nativo</span>
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
