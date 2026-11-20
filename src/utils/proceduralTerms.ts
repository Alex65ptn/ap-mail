// Calcolatore Termini Processuali conforme alle norme del c.p.c. e alla Riforma Cartabia (D.Lgs. 149/2022)
// Motore di Calcolo Termini Processuali Forensi AP Mail

export interface CalculatedTerm {
  id: string;
  label: string;
  normReference: string;
  daysOffset: number;
  isBackward: boolean; // true = a ritroso (es. prima dell'udienza), false = in avanti (es. dalla notifica)
  calculatedDate: string; // YYYY-MM-DD
  originalDate: string;   // Data prima degli slittamenti festivi/sospensione
  appliedFeriale: boolean;
  appliedWeekendShift: boolean;
  shiftExplanation: string;
  category: 'udienza' | 'termine_legale';
}

export type ProceduralRite = 
  | 'cartabia_171ter' // Rito Ordinario Cognizione - Memorie Integrative (Art. 171-ter c.p.c.)
  | 'cartabia_166'    // Costituzione Convenuto Rito Ordinario (Art. 166 c.p.c. - 70 gg prima)
  | 'trattazione_127' // Note di Trattazione Scritta (Art. 127-ter c.p.c.)
  | 'decisione_190'   // Comparse Conclusionali e Repliche (Art. 189 - 190 c.p.c.)
  | 'appello_breve'   // Termine Breve Impugnazione Appello (Art. 325 c.p.c. - 30 gg)
  | 'cassazione_breve'// Termine Breve Ricorso Cassazione (Art. 325 c.p.c. - 60 gg)
  | 'termine_lungo'   // Termine Lungo Impugnazione (Art. 327 c.p.c. - 6 mesi)
  | 'lavoro_416';     // Rito del Lavoro - Costituzione Convenuto (-10 gg)

// Calcolo data di Pasqua (Metodo di Gauss)
function getEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

// Verifica se una data è festivo nazionale italiano
export function isItalianHoliday(date: Date): boolean {
  const day = date.getDate();
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();

  // Feste fisse nazionali
  if (month === 1 && (day === 1 || day === 6)) return true; // Capodanno, Epifania
  if (month === 4 && day === 25) return true; // Liberazione
  if (month === 5 && day === 1) return true; // Festa del Lavoro
  if (month === 6 && day === 2) return true; // Repubblica
  if (month === 8 && day === 15) return true; // Ferragosto
  if (month === 11 && day === 1) return true; // Ognissanti
  if (month === 12 && (day === 8 || day === 25 || day === 26)) return true; // Immacolata, Natale, S. Stefano

  // Pasquetta (Lunedì dell'Angelo)
  const easter = getEasterSunday(year);
  const easterDate = new Date(year, easter.month - 1, easter.day);
  const easterMonday = new Date(easterDate);
  easterMonday.setDate(easterMonday.getDate() + 1);

  if (month === (easterMonday.getMonth() + 1) && day === easterMonday.getDate()) {
    return true;
  }

  return false;
}

// Verifica se un giorno cade nel periodo di sospensione feriale (1° agosto - 31 agosto ex L. 742/1969)
export function isInSospensioneFeriale(date: Date): boolean {
  return date.getMonth() === 7; // Agosto è mese 7 (0-indexed)
}

// Formatta Date in YYYY-MM-DD
export function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Algoritmo di Calcolo Forense dei Termini
export function calculateLegalDeadline(
  baseDateStr: string,
  daysOffset: number,
  isBackward: boolean,
  applyFeriale: boolean = true
): {
  finalDate: string;
  originalDate: string;
  appliedFeriale: boolean;
  appliedWeekendShift: boolean;
  shiftExplanation: string;
} {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const base = new Date(y, m - 1, d, 12, 0, 0);

  let current = new Date(base);
  let explanations: string[] = [];
  let ferialeDetected = false;

  if (isBackward) {
    // CALCOLO A RITROSO (es. udienza - 40 giorni)
    // Se incontra il mese di agosto (1-31 agosto), il lasso di tempo di 31 giorni viene saltato
    let daysRemaining = daysOffset;

    while (daysRemaining > 0) {
      current.setDate(current.getDate() - 1);

      if (applyFeriale && isInSospensioneFeriale(current)) {
        ferialeDetected = true;
        // Non decrementiamo daysRemaining perché siamo in sospensione feriale
        continue;
      }
      daysRemaining--;
    }

    const unadjustedDate = new Date(current);

    // REGOLA CASSAZIONE SEZ. UNITE n. 14767/2020:
    // Per i termini a ritroso, se la scadenza finale cade di sabato, domenica o festivo,
    // il termine viene ANTICIPATO al primo giorno feriale precedente per garantire il pieno esercizio del diritto di difesa.
    let weekendShift = false;
    while (current.getDay() === 0 || current.getDay() === 6 || isItalianHoliday(current)) {
      weekendShift = true;
      const dayName = current.getDay() === 0 ? 'Domenica' : current.getDay() === 6 ? 'Sabato' : 'Giorno Festivo';
      current.setDate(current.getDate() - 1);
      explanations.push(`Cadeva di ${dayName} -> anticipato al feriale precedente ex Cass. SS.UU. 14767/2020`);
    }

    if (ferialeDetected) {
      explanations.unshift('Applicata sospensione feriale dei termini (1-31 agosto)');
    }

    return {
      finalDate: formatDateYMD(current),
      originalDate: formatDateYMD(unadjustedDate),
      appliedFeriale: ferialeDetected,
      appliedWeekendShift: weekendShift,
      shiftExplanation: explanations.join('; ') || 'Termine ordinario',
    };
  } else {
    // CALCOLO IN AVANTI (es. data notifica + 30 o 60 giorni)
    let daysRemaining = daysOffset;

    while (daysRemaining > 0) {
      current.setDate(current.getDate() + 1);

      if (applyFeriale && isInSospensioneFeriale(current)) {
        ferialeDetected = true;
        continue;
      }
      daysRemaining--;
    }

    const unadjustedDate = new Date(current);

    // Art. 155 comma 4 e 5 c.p.c.: proroga al primo giorno feriale successivo
    let weekendShift = false;
    while (current.getDay() === 0 || current.getDay() === 6 || isItalianHoliday(current)) {
      weekendShift = true;
      const dayName = current.getDay() === 0 ? 'Domenica' : current.getDay() === 6 ? 'Sabato' : 'Giorno Festivo';
      current.setDate(current.getDate() + 1);
      explanations.push(`Cadeva di ${dayName} -> prorogato al primo giorno feriale successivo ex art. 155 c.p.c.`);
    }

    if (ferialeDetected) {
      explanations.unshift('Applicata sospensione feriale dei termini (1-31 agosto)');
    }

    return {
      finalDate: formatDateYMD(current),
      originalDate: formatDateYMD(unadjustedDate),
      appliedFeriale: ferialeDetected,
      appliedWeekendShift: weekendShift,
      shiftExplanation: explanations.join('; ') || 'Termine ordinario',
    };
  }
}

// Calcolo per 6 mesi (Termine Lungo Impugnazione ex art. 327 c.p.c.)
export function calculateTermineLungo6Mesi(
  pubblicazioneDateStr: string,
  applyFeriale: boolean = true
): {
  finalDate: string;
  originalDate: string;
  appliedFeriale: boolean;
  appliedWeekendShift: boolean;
  shiftExplanation: string;
} {
  const [y, m, d] = pubblicazioneDateStr.split('-').map(Number);
  const base = new Date(y, m - 1, d, 12, 0, 0);

  // Aggiungi 6 mesi nominali
  let target = new Date(base);
  target.setMonth(target.getMonth() + 6);

  let explanations: string[] = [];
  let feriale = false;

  // Se il periodo intercorre sul mese di agosto, aggiungi 31 giorni
  if (applyFeriale) {
    // Verifichiamo se il range attraversa il mese di agosto
    const augStart = new Date(target.getFullYear(), 7, 1);
    const augEnd = new Date(target.getFullYear(), 7, 31);

    if (base <= augEnd && target >= augStart) {
      feriale = true;
      target.setDate(target.getDate() + 31);
      explanations.push('Aggiunti 31 giorni per sospensione feriale (1-31 agosto)');
    }
  }

  const unadjusted = new Date(target);

  // Proroga sabato e festivi
  let weekendShift = false;
  while (target.getDay() === 0 || target.getDay() === 6 || isItalianHoliday(target)) {
    weekendShift = true;
    const dayName = target.getDay() === 0 ? 'Domenica' : target.getDay() === 6 ? 'Sabato' : 'Giorno Festivo';
    target.setDate(target.getDate() + 1);
    explanations.push(`Cadeva di ${dayName} -> prorogato al lunedì/feriale successivo`);
  }

  return {
    finalDate: formatDateYMD(target),
    originalDate: formatDateYMD(unadjusted),
    appliedFeriale: feriale,
    appliedWeekendShift: weekendShift,
    shiftExplanation: explanations.join('; ') || 'Termine ordinario 6 mesi ex art. 327 c.p.c.',
  };
}

// Configurazione dei Riti e Calcolo Automatico
export function getProceduralTermsForRite(
  rite: ProceduralRite,
  baseDateStr: string,
  applyFeriale: boolean = true,
  customDays127?: number
): CalculatedTerm[] {
  if (!baseDateStr) return [];

  switch (rite) {
    case 'cartabia_171ter': {
      // Rito Ordinario Riforma Cartabia:
      // 1ª memoria: 40 giorni prima dell'udienza
      // 2ª memoria: 20 giorni prima dell'udienza
      // 3ª memoria: 10 giorni prima dell'udienza
      const m1 = calculateLegalDeadline(baseDateStr, 40, true, applyFeriale);
      const m2 = calculateLegalDeadline(baseDateStr, 20, true, applyFeriale);
      const m3 = calculateLegalDeadline(baseDateStr, 10, true, applyFeriale);

      return [
        {
          id: 'cartabia_171ter_1',
          label: '1ª Memoria Integrativa (-40 gg dall\'udienza)',
          normReference: 'Art. 171-ter, n. 1, c.p.c.',
          daysOffset: 40,
          isBackward: true,
          calculatedDate: m1.finalDate,
          originalDate: m1.originalDate,
          appliedFeriale: m1.appliedFeriale,
          appliedWeekendShift: m1.appliedWeekendShift,
          shiftExplanation: m1.shiftExplanation,
          category: 'termine_legale',
        },
        {
          id: 'cartabia_171ter_2',
          label: '2ª Memoria Istruttoria & Mezzi di Prova (-20 gg dall\'udienza)',
          normReference: 'Art. 171-ter, n. 2, c.p.c.',
          daysOffset: 20,
          isBackward: true,
          calculatedDate: m2.finalDate,
          originalDate: m2.originalDate,
          appliedFeriale: m2.appliedFeriale,
          appliedWeekendShift: m2.appliedWeekendShift,
          shiftExplanation: m2.shiftExplanation,
          category: 'termine_legale',
        },
        {
          id: 'cartabia_171ter_3',
          label: '3ª Memoria di Prova Contraria (-10 gg dall\'udienza)',
          normReference: 'Art. 171-ter, n. 3, c.p.c.',
          daysOffset: 10,
          isBackward: true,
          calculatedDate: m3.finalDate,
          originalDate: m3.originalDate,
          appliedFeriale: m3.appliedFeriale,
          appliedWeekendShift: m3.appliedWeekendShift,
          shiftExplanation: m3.shiftExplanation,
          category: 'termine_legale',
        },
      ];
    }

    case 'cartabia_166': {
      // Costituzione convenuto Cartabia: 70 giorni prima dell'udienza
      const cost = calculateLegalDeadline(baseDateStr, 70, true, applyFeriale);
      return [
        {
          id: 'cartabia_166_costituzione',
          label: 'Comparsa di Costituzione e Risposta con Domande Riconvenzionali (-70 gg)',
          normReference: 'Art. 166 c.p.c. (Riforma Cartabia)',
          daysOffset: 70,
          isBackward: true,
          calculatedDate: cost.finalDate,
          originalDate: cost.originalDate,
          appliedFeriale: cost.appliedFeriale,
          appliedWeekendShift: cost.appliedWeekendShift,
          shiftExplanation: cost.shiftExplanation,
          category: 'termine_legale',
        },
      ];
    }

    case 'trattazione_127': {
      // Note di trattazione scritta ex art. 127-ter: di default 15 giorni prima o termine assegnato
      const days = customDays127 || 15;
      const note = calculateLegalDeadline(baseDateStr, days, true, applyFeriale);
      return [
        {
          id: 'trattazione_127_ter',
          label: `Deposito Note di Trattazione Scritta (-${days} gg dall'udienza)`,
          normReference: 'Art. 127-ter c.p.c.',
          daysOffset: days,
          isBackward: true,
          calculatedDate: note.finalDate,
          originalDate: note.originalDate,
          appliedFeriale: note.appliedFeriale,
          appliedWeekendShift: note.appliedWeekendShift,
          shiftExplanation: note.shiftExplanation,
          category: 'termine_legale',
        },
      ];
    }

    case 'decisione_190': {
      // Comparse conclusionali (60 gg) e memorie di replica (20 gg successivi)
      const conc = calculateLegalDeadline(baseDateStr, 60, false, applyFeriale);
      const rep = calculateLegalDeadline(conc.finalDate, 20, false, applyFeriale);

      return [
        {
          id: 'decisione_190_conc',
          label: 'Deposito Comparse Conclusionali (+60 gg da rimessione in decisione)',
          normReference: 'Art. 189 - 190 c.p.c.',
          daysOffset: 60,
          isBackward: false,
          calculatedDate: conc.finalDate,
          originalDate: conc.originalDate,
          appliedFeriale: conc.appliedFeriale,
          appliedWeekendShift: conc.appliedWeekendShift,
          shiftExplanation: conc.shiftExplanation,
          category: 'termine_legale',
        },
        {
          id: 'decisione_190_rep',
          label: 'Deposito Memorie di Replica (+20 gg da conclusionali)',
          normReference: 'Art. 190 c.p.c.',
          daysOffset: 20,
          isBackward: false,
          calculatedDate: rep.finalDate,
          originalDate: rep.originalDate,
          appliedFeriale: rep.appliedFeriale,
          appliedWeekendShift: rep.appliedWeekendShift,
          shiftExplanation: rep.shiftExplanation,
          category: 'termine_legale',
        },
      ];
    }

    case 'appello_breve': {
      // Termine breve per appello: 30 giorni dalla notifica sentenza
      const app = calculateLegalDeadline(baseDateStr, 30, false, applyFeriale);
      return [
        {
          id: 'appello_325',
          label: 'Atto di Appello / Termine Breve (+30 gg da notificazione sentenza)',
          normReference: 'Art. 325 - 326 c.p.c.',
          daysOffset: 30,
          isBackward: false,
          calculatedDate: app.finalDate,
          originalDate: app.originalDate,
          appliedFeriale: app.appliedFeriale,
          appliedWeekendShift: app.appliedWeekendShift,
          shiftExplanation: app.shiftExplanation,
          category: 'termine_legale',
        },
      ];
    }

    case 'cassazione_breve': {
      // Termine breve per ricorso per cassazione: 60 giorni dalla notifica sentenza
      const cass = calculateLegalDeadline(baseDateStr, 60, false, applyFeriale);
      return [
        {
          id: 'cassazione_325',
          label: 'Ricorso per Cassazione / Termine Breve (+60 gg da notificazione)',
          normReference: 'Art. 325 - 326 c.p.c.',
          daysOffset: 60,
          isBackward: false,
          calculatedDate: cass.finalDate,
          originalDate: cass.originalDate,
          appliedFeriale: cass.appliedFeriale,
          appliedWeekendShift: cass.appliedWeekendShift,
          shiftExplanation: cass.shiftExplanation,
          category: 'termine_legale',
        },
      ];
    }

    case 'termine_lungo': {
      // Termine lungo: 6 mesi dalla pubblicazione della sentenza
      const res = calculateTermineLungo6Mesi(baseDateStr, applyFeriale);
      return [
        {
          id: 'impugnazione_lungo_327',
          label: 'Termine Lungo di Impugnazione (+6 mesi da pubblicazione sentenza)',
          normReference: 'Art. 327 c.p.c.',
          daysOffset: 180,
          isBackward: false,
          calculatedDate: res.finalDate,
          originalDate: res.originalDate,
          appliedFeriale: res.appliedFeriale,
          appliedWeekendShift: res.appliedWeekendShift,
          shiftExplanation: res.shiftExplanation,
          category: 'termine_legale',
        },
      ];
    }

    case 'lavoro_416': {
      // Rito del Lavoro: costituzione convenuto almeno 10 giorni prima dell'udienza
      const lav = calculateLegalDeadline(baseDateStr, 10, true, applyFeriale);
      return [
        {
          id: 'lavoro_416_costituzione',
          label: 'Memoria Difensiva con Domanda Riconvenzionale (-10 gg udienza lavoro)',
          normReference: 'Art. 416 c.p.c. (Rito del Lavoro)',
          daysOffset: 10,
          isBackward: true,
          calculatedDate: lav.finalDate,
          originalDate: lav.originalDate,
          appliedFeriale: lav.appliedFeriale,
          appliedWeekendShift: lav.appliedWeekendShift,
          shiftExplanation: lav.shiftExplanation,
          category: 'termine_legale',
        },
      ];
    }

    default:
      return [];
  }
}
