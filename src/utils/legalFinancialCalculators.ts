// AP Mail PLUS - Motore di Calcolo Forense & Finanziario (Modello AvvocatoAndreani)
// AP Consulting - Autore: Alessandro Patanè

// ============================================================================
// 1. TABELLA TASSI INTERESSE LEGALE STORICO (DECRETI MEF DAL 1942 AL 2026)
// ============================================================================
export interface LegalRatePeriod {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  ratePercent: number;
  normReference: string;
}

export const LEGAL_INTEREST_RATES: LegalRatePeriod[] = [
  { startDate: '2025-01-01', endDate: '2026-12-31', ratePercent: 2.0, normReference: 'D.M. 11/12/2024' },
  { startDate: '2024-01-01', endDate: '2024-12-31', ratePercent: 2.5, normReference: 'D.M. 29/11/2023' },
  { startDate: '2023-01-01', endDate: '2023-12-31', ratePercent: 5.0, normReference: 'D.M. 13/12/2022' },
  { startDate: '2022-01-01', endDate: '2022-12-31', ratePercent: 1.25, normReference: 'D.M. 13/12/2021' },
  { startDate: '2021-01-01', endDate: '2021-12-31', ratePercent: 0.01, normReference: 'D.M. 11/12/2020' },
  { startDate: '2020-01-01', endDate: '2020-12-31', ratePercent: 0.05, normReference: 'D.M. 12/12/2019' },
  { startDate: '2019-01-01', endDate: '2019-12-31', ratePercent: 0.8, normReference: 'D.M. 12/12/2018' },
  { startDate: '2018-01-01', endDate: '2018-12-31', ratePercent: 0.3, normReference: 'D.M. 13/12/2017' },
  { startDate: '2017-01-01', endDate: '2017-12-31', ratePercent: 0.1, normReference: 'D.M. 07/12/2016' },
  { startDate: '2016-01-01', endDate: '2016-12-31', ratePercent: 0.2, normReference: 'D.M. 11/12/2015' },
  { startDate: '2015-01-01', endDate: '2015-12-31', ratePercent: 0.5, normReference: 'D.M. 11/12/2014' },
  { startDate: '2014-01-01', endDate: '2014-12-31', ratePercent: 1.0, normReference: 'D.M. 12/12/2013' },
  { startDate: '2012-01-01', endDate: '2013-12-31', ratePercent: 2.5, normReference: 'D.M. 12/12/2011' },
  { startDate: '2011-01-01', endDate: '2011-12-31', ratePercent: 1.5, normReference: 'D.M. 07/12/2010' },
  { startDate: '2010-01-01', endDate: '2010-12-31', ratePercent: 1.0, normReference: 'D.M. 04/12/2009' },
  { startDate: '2008-01-01', endDate: '2009-12-31', ratePercent: 3.0, normReference: 'D.M. 12/12/2007' },
  { startDate: '2004-01-01', endDate: '2007-12-31', ratePercent: 2.5, normReference: 'D.M. 01/12/2003' },
  { startDate: '2002-01-01', endDate: '2003-12-31', ratePercent: 3.0, normReference: 'D.M. 11/12/2001' },
  { startDate: '2001-01-01', endDate: '2001-12-31', ratePercent: 3.5, normReference: 'D.M. 11/12/2000' },
  { startDate: '1999-01-01', endDate: '2000-12-31', ratePercent: 2.5, normReference: 'D.M. 10/12/1998' },
  { startDate: '1997-01-01', endDate: '1998-12-31', ratePercent: 5.0, normReference: 'L. 662/1996' },
  { startDate: '1990-12-16', endDate: '1996-12-31', ratePercent: 10.0, normReference: 'L. 353/1990' },
  { startDate: '1942-04-21', endDate: '1990-12-15', ratePercent: 5.0, normReference: 'Art. 1284 c.c.' },
];

export interface InterestResultPeriod {
  periodLabel: string;
  startDate: string;
  endDate: string;
  days: number;
  ratePercent: number;
  interestAmount: number;
  progressiveCapital: number;
}

export interface InterestCalculationResult {
  initialCapital: number;
  totalInterest: number;
  finalTotal: number;
  periods: InterestResultPeriod[];
  revaluationAmount?: number;
}

// Calcolo Interessi Legali per scaglioni storici esatti
export function calculateLegalInterests(
  capital: number,
  startDateStr: string,
  endDateStr: string,
  applyAnatocismYearly: boolean = false
): InterestCalculationResult {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end || capital <= 0) {
    return {
      initialCapital: capital,
      totalInterest: 0,
      finalTotal: capital,
      periods: [],
    };
  }

  const periods: InterestResultPeriod[] = [];
  let currentCap = capital;
  let totalInterest = 0;

  for (const rate of LEGAL_INTEREST_RATES) {
    const rateStart = new Date(rate.startDate);
    const rateEnd = new Date(rate.endDate);

    // Trova sovrapposizione tra [start, end] e [rateStart, rateEnd]
    const segStart = new Date(Math.max(start.getTime(), rateStart.getTime()));
    const segEnd = new Date(Math.min(end.getTime(), rateEnd.getTime()));

    if (segStart <= segEnd) {
      const diffTime = segEnd.getTime() - segStart.getTime();
      const days = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const isLeapYear = (segStart.getFullYear() % 4 === 0 && (segStart.getFullYear() % 100 !== 0 || segStart.getFullYear() % 400 === 0));
      const yearDays = isLeapYear ? 366 : 365;

      const interest = (currentCap * (rate.ratePercent / 100) * days) / yearDays;
      totalInterest += interest;

      periods.push({
        periodLabel: `${rate.ratePercent}% (${rate.normReference})`,
        startDate: segStart.toISOString().split('T')[0],
        endDate: segEnd.toISOString().split('T')[0],
        days,
        ratePercent: rate.ratePercent,
        interestAmount: Number(interest.toFixed(2)),
        progressiveCapital: Number(currentCap.toFixed(2)),
      });

      if (applyAnatocismYearly) {
        currentCap += interest;
      }
    }
  }

  return {
    initialCapital: capital,
    totalInterest: Number(totalInterest.toFixed(2)),
    finalTotal: Number((capital + totalInterest).toFixed(2)),
    periods,
  };
}

// ============================================================================
// 2. PARCELLA FORENSE & PARAMETRI GIUDIZIALI (D.M. 55/2014 & D.M. 147/2022)
// ============================================================================
export interface ForensiValueBracket {
  id: string;
  label: string;
  faseStudio: number;
  faseIntroduttiva: number;
  faseIstruttoria: number;
  faseDecisionale: number;
}

export const PARAMETRI_TRIBUNALE_ORDINARIO: ForensiValueBracket[] = [
  { id: 'scaglione_1', label: 'Da € 0 a € 1.100', faseStudio: 130, faseIntroduttiva: 130, faseIstruttoria: 105, faseDecisionale: 175 },
  { id: 'scaglione_2', label: 'Da € 1.100,01 a € 5.200', faseStudio: 425, faseIntroduttiva: 425, faseIstruttoria: 400, faseDecisionale: 610 },
  { id: 'scaglione_3', label: 'Da € 5.200,01 a € 26.000', faseStudio: 920, faseIntroduttiva: 775, faseIstruttoria: 1140, faseDecisionale: 1140 },
  { id: 'scaglione_4', label: 'Da € 26.000,01 a € 52.000', faseStudio: 1700, faseIntroduttiva: 1210, faseIstruttoria: 1800, faseDecisionale: 1870 },
  { id: 'scaglione_5', label: 'Da € 52.000,01 a € 260.000', faseStudio: 2550, faseIntroduttiva: 1700, faseIstruttoria: 3100, faseDecisionale: 3300 },
  { id: 'scaglione_6', label: 'Da € 260.000,01 a € 520.000', faseStudio: 3750, faseIntroduttiva: 2500, faseIstruttoria: 4600, faseDecisionale: 4900 },
];

export interface ParcellaCalculationResult {
  compensoBase: number;
  speseForfettarie15: number;
  imponibileCpa: number;
  cpa4: number;
  imponibileIva: number;
  iva22: number;
  totaleFattura: number;
  ritenutaAcconto20: number;
  nettoACaricoOVersare: number;
}

export function calculateParcellaForense(
  scaglioneId: string,
  fasiSelezionate: { studio: boolean; introduttiva: boolean; istruttoria: boolean; decisionale: boolean },
  variazionePercentuale: number = 0 // -50% a +50%
): ParcellaCalculationResult {
  const bracket = PARAMETRI_TRIBUNALE_ORDINARIO.find((b) => b.id === scaglioneId) || PARAMETRI_TRIBUNALE_ORDINARIO[2];

  let compenso = 0;
  if (fasiSelezionate.studio) compenso += bracket.faseStudio;
  if (fasiSelezionate.introduttiva) compenso += bracket.faseIntroduttiva;
  if (fasiSelezionate.istruttoria) compenso += bracket.faseIstruttoria;
  if (fasiSelezionate.decisionale) compenso += bracket.faseDecisionale;

  // Applica eventuale aumento/riduzione discrezionale (+/- %)
  if (variazionePercentuale !== 0) {
    compenso += compenso * (variazionePercentuale / 100);
  }

  const speseForfettarie = compenso * 0.15;
  const imponibileCpa = compenso + speseForfettarie;
  const cpa = imponibileCpa * 0.04;
  const imponibileIva = imponibileCpa + cpa;
  const iva = imponibileIva * 0.22;
  const totaleFattura = imponibileIva + iva;
  const ritenutaAcconto = compenso * 0.20;
  const netto = totaleFattura - ritenutaAcconto;

  return {
    compensoBase: Number(compenso.toFixed(2)),
    speseForfettarie15: Number(speseForfettarie.toFixed(2)),
    imponibileCpa: Number(imponibileCpa.toFixed(2)),
    cpa4: Number(cpa.toFixed(2)),
    imponibileIva: Number(imponibileIva.toFixed(2)),
    iva22: Number(iva.toFixed(2)),
    totaleFattura: Number(totaleFattura.toFixed(2)),
    ritenutaAcconto20: Number(ritenutaAcconto.toFixed(2)),
    nettoACaricoOVersare: Number(netto.toFixed(2)),
  };
}

// ============================================================================
// 3. CONTRIBUTO UNIFICATO (ART. 13 D.P.R. 115/2002 E S.M.I.)
// ============================================================================
export interface ContributoUnificatoBracket {
  maxValore: number;
  importoOrdinario: number;
  importoLavoro: number; // dimezzato o esente se reddito basso
  importoRicorsoTAR: number;
}

export function calculateContributoUnificato(valoreCausa: number): { ordinario: number; lavoro: number; impugnazione: number } {
  let ord = 43;
  if (valoreCausa <= 1100) ord = 43;
  else if (valoreCausa <= 5200) ord = 98;
  else if (valoreCausa <= 26000) ord = 237;
  else if (valoreCausa <= 52000) ord = 518;
  else if (valoreCausa <= 260000) ord = 759;
  else if (valoreCausa <= 520000) ord = 1214;
  else ord = 1686;

  return {
    ordinario: ord,
    lavoro: Number((ord / 2).toFixed(2)),
    impugnazione: Number((ord * 1.5).toFixed(2)), // in appello aumento del 50%
  };
}
