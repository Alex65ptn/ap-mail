// AP Mail PLUS - Motore AI Forense Locale Offline & Analizzatore Atti
// AP Consulting - Autore: Alessandro Patanè

export interface LegalExtractedData {
  actType: string;
  identifiedRite: string;
  suggestedBaseDate: string; // YYYY-MM-DD
  dateType: 'udienza' | 'notifica' | 'deposito';
  rgNumber?: string;
  court?: string;
  judge?: string;
  plaintiff?: string; // Attore / Ricorrente
  defendant?: string; // Convenuto / Resistente
  summaryPoints: string[];
  recommendedAction: string;
  calculatedDeadlines: {
    label: string;
    date: string;
    norm: string;
  }[];
  usedEngine: 'ollama_local' | 'heuristic_engine';
}

// Verifica se Ollama è raggiungibile in locale
export async function checkLocalAiServerAvailable(endpoint: string = 'http://127.0.0.1:11434'): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${endpoint}/api/tags`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

// Analizzatore Euristico Forense (Istantaneo, 100% Offline, Zero Dipendenze)
export function analyzeLegalTextHeuristic(text: string, subject: string = ''): LegalExtractedData {
  const fullText = `${subject}\n${text}`;
  const lower = fullText.toLowerCase();

  // 1. Riconoscimento R.G. (Ruolo Generale)
  const rgMatch = fullText.match(/(?:R\.?G\.?|ruolo generale|n\.)\s*(?:n\.?|affari contenziosi)?\s*([0-9]{1,6}\s*[\/\-]\s*[0-9]{2,4})/i);
  const rgNumber = rgMatch ? rgMatch[1].replace(/\s+/g, '') : undefined;

  // 2. Riconoscimento Autorità Giudiziaria
  let court: string | undefined;
  if (lower.includes('corte d\'appello') || lower.includes('corte di appello')) {
    court = 'Corte d\'Appello';
  } else if (lower.includes('giudice di pace')) {
    court = 'Giudice di Pace';
  } else if (lower.includes('corte di cassazione') || lower.includes('suprema corte')) {
    court = 'Corte di Cassazione';
  } else if (lower.includes('tar') || lower.includes('tribunale amministrativo')) {
    court = 'Tribunale Amministrativo Regionale (TAR)';
  } else if (lower.includes('tribunale ordinario') || lower.includes('tribunale')) {
    const cityMatch = fullText.match(/tribunale\s+(?:ordinario\s+)?(?:di\s+)?([A-Z][a-zàèìòù]+)/i);
    court = cityMatch ? `Tribunale di ${cityMatch[1]}` : 'Tribunale Ordinario';
  }

  // 3. Riconoscimento Date (Formato Italiano GG/MM/AAAA o ISO)
  const dateRegex = /\b([0-3]?[0-9])[\/\.\-]([0-1]?[0-9])[\/\.\-](202[3-9]|203[0-9])\b/g;
  const datesFound: string[] = [];
  let dMatch;
  while ((dMatch = dateRegex.exec(fullText)) !== null) {
    const d = parseInt(dMatch[1], 10);
    const m = parseInt(dMatch[2], 10);
    const y = parseInt(dMatch[3], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      datesFound.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
  }

  // Seleziona la data più probabile (la più futura se udienza, o odierna se notifica)
  const todayStr = new Date().toISOString().split('T')[0];
  let suggestedDate = datesFound.length > 0 ? datesFound[0] : todayStr;

  // 4. Identificazione Tipo di Atto & Rito Processuale
  let actType = 'Comunicazione Forense Generica';
  let identifiedRite = 'cartabia_171ter';
  let dateType: 'udienza' | 'notifica' | 'deposito' = 'udienza';
  const summaryPoints: string[] = [];
  let recommendedAction = 'Verificare i documenti allegati e calendarizzare le memorie difensive.';
  const calculatedDeadlines: { label: string; date: string; norm: string }[] = [];

  if (lower.includes('decreto ingiuntivo') || lower.includes('ricorso per d.i.')) {
    actType = 'Decreto Ingiuntivo Notificato (Opposizione a D.I.)';
    identifiedRite = 'opposizione_di';
    dateType = 'notifica';
    summaryPoints.push('Notificato provvedimento monitorio / decreto ingiuntivo telematico.');
    summaryPoints.push('Termine perentorio di 40 giorni per la notifica dell\'atto di opposizione.');
    summaryPoints.push('Rischio di esecutività definitiva in caso di mancata tempestiva opposizione.');
    recommendedAction = 'Predisporre atto di citazione o ricorso in opposizione a decreto ingiuntivo entro 40 giorni.';
  } else if (lower.includes('atto di citazione') || lower.includes('cita')) {
    actType = 'Atto di Citazione a Giudizio (Riforma Cartabia)';
    identifiedRite = 'cartabia_171ter';
    dateType = 'udienza';
    summaryPoints.push('Notificato atto di citazione introduttivo di giudizio ordinario di cognizione.');
    summaryPoints.push('Costituzione convenuto obbligatoria almeno 70 giorni prima dell\'udienza (Art. 166 c.p.c.).');
    summaryPoints.push('Termine memorie integrative ex Art. 171-ter c.p.c. (40, 20 e 10 giorni prima).');
    recommendedAction = 'Iscrivere al calendario il termine di costituzione convenuto (-70 gg) e le memorie 171-ter.';
  } else if (lower.includes('sentenza') || lower.includes('dispositivo')) {
    actType = 'Notificazione Sentenza per Termini di Impugnazione';
    identifiedRite = 'appello_breve';
    dateType = 'notifica';
    summaryPoints.push('Notificata sentenza definitoria o parziale ai fini della decorrenza del termine breve.');
    summaryPoints.push('Termine perentorio di 30 giorni per la notifica dell\'atto di appello (Art. 325 c.p.c.).');
    recommendedAction = 'Valutare i motivi di impugnazione e redigere l\'atto di appello entro 30 giorni.';
  } else if (lower.includes('127-ter') || lower.includes('trattazione scritta') || lower.includes('note scritte')) {
    actType = 'Ordinanza di Trattazione Scritta (Art. 127-ter c.p.c.)';
    identifiedRite = 'trattazione_127';
    dateType = 'udienza';
    summaryPoints.push('Il Giudice ha disposto la sostituzione dell\'udienza in presenza con note di trattazione scritta.');
    summaryPoints.push('Deposito note telematiche entro il termine perentorio assegnato.');
    recommendedAction = 'Depositare le note di trattazione scritta nel fascicolo telematico entro il termine.';
  } else if (lower.includes('conclusionali') || lower.includes('190 c.p.c.')) {
    actType = 'Rimessione in Decisione — Comparse Conclusionali e Repliche';
    identifiedRite = 'decisione_190';
    dateType = 'deposito';
    summaryPoints.push('La causa è stata trattenuta in decisione con concessione dei termini ex Art. 190 c.p.c.');
    summaryPoints.push('Termine di 60 giorni per il deposito delle comparse conclusionali.');
    summaryPoints.push('Termine di ulteriori 20 giorni per il deposito delle memorie di replica.');
    recommendedAction = 'Calendarizzare il termine a 60 gg per le conclusionali e a 80 gg per le repliche.';
  } else {
    summaryPoints.push(`Comunicazione pervenuta avente ad oggetto: ${subject || 'Atto giudiziario'}`);
    summaryPoints.push('Rilevate date di riferimento all\'interno del testo.');
    summaryPoints.push('Possibilità di collegare la scadenza direttamente al calendario forense.');
  }

  return {
    actType,
    identifiedRite,
    suggestedBaseDate: suggestedDate,
    dateType,
    rgNumber,
    court,
    summaryPoints,
    recommendedAction,
    calculatedDeadlines,
    usedEngine: 'heuristic_engine',
  };
}

// Analizzatore AI Completo (interroga Ollama se presente, altrimenti fallback euristico)
export async function analyzeLegalCommunicationAi(
  text: string,
  subject: string = '',
  ollamaEndpoint: string = 'http://127.0.0.1:11434',
  modelName: string = 'llama3.2'
): Promise<LegalExtractedData> {
  const isServerUp = await checkLocalAiServerAvailable(ollamaEndpoint);

  if (!isServerUp) {
    return analyzeLegalTextHeuristic(text, subject);
  }

  try {
    const prompt = `Sei un assistente legale esperto di diritto processuale civile italiano (Riforma Cartabia, c.p.c., c.p.p.).
Analizza il seguente messaggio/atto giudiziario e restituisci ESCLUSIVAMENTE un JSON valido con questa struttura:
{
  "actType": "string",
  "identifiedRite": "cartabia_171ter|cartabia_166|trattazione_127|decisione_190|appello_breve|cassazione_breve|termine_lungo",
  "suggestedBaseDate": "YYYY-MM-DD",
  "dateType": "udienza|notifica|deposito",
  "rgNumber": "string o null",
  "court": "string o null",
  "summaryPoints": ["punto 1", "punto 2", "punto 3"],
  "recommendedAction": "string"
}

Testo da analizzare:
Oggetto: ${subject}
Corpo:
${text.slice(0, 3000)}`;

    const res = await fetch(`${ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt,
        stream: false,
        format: 'json',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const parsed = JSON.parse(data.response);
      return {
        ...parsed,
        usedEngine: 'ollama_local',
        calculatedDeadlines: [],
      };
    }
  } catch (err) {
    console.warn('Fallback ad analisi euristica per errore server locale LLM:', err);
  }

  return analyzeLegalTextHeuristic(text, subject);
}

// Generatore Bozza Risposta Formale Legale
export function generateFormalLegalReplyDraft(
  senderName: string,
  subject: string,
  actType: string,
  rgNumber?: string,
  court?: string
): string {
  const dateStr = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  const rgStr = rgNumber ? ` - R.G. n. ${rgNumber}` : '';
  const courtStr = court ? ` c/o ${court}` : '';

  return `Spett.le ${senderName || 'Collega / Ufficio'},

in relazione alla Vostra comunicazione del ${dateStr} avente ad oggetto:
"${subject}"${courtStr}${rgStr},

con la presente Vi comunico di aver preso formalmente visione della documentazione trasmessa e del relativo atto (${actType}).

I relativi termini perentori di legge e gli adempimenti processuali conseguenti sono stati debitamente assunti e registrati nel nostro scadenzario di studio.
Resto a disposizione per qualsiasi necessario coordinamento processuale o eventuale composizione bonaria della vertenza.

Distinti saluti.

Studio Legale & Consulenza Aziendale
AP Consulting — Avv. Alessandro Patanè`;
}
