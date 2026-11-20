export type CalendarCategory = 
  | 'udienza'        // Udienze & Procedimenti Legali (Rosso)
  | 'termine_legale' // Termini Perentori & Note di Trattazione (Ambra/Arancio)
  | 'fiscale'        // Scadenze Fiscali & Bilanci (Verde)
  | 'riunione'       // Incontri, CDA & Consulenze (Blu)
  | 'personale'      // Attività & Personale (Viola);

export interface CalendarEvent {
  id: string;
  title: string;
  category: CalendarCategory;
  startDate: string; // ISO string o YYYY-MM-DDTHH:mm
  endDate: string;   // ISO string o YYYY-MM-DDTHH:mm
  allDay?: boolean;
  location?: string;
  legalReference?: string; // Es. "RG 51872/2021 - Trib. Roma"
  judge?: string;          // Es. "Dott.ssa Rossi"
  notes?: string;
  reminderMinutes?: number; // 15, 60, 1440 (1 giorno), 4320 (3 giorni)
  completed?: boolean;
  linkedEmailId?: number;  // Eventuale ID email collegata
  linkedEmailSubject?: string;
}

export type CalendarViewMode = 'month' | 'work_week' | 'week' | 'day' | 'scadenzario';
