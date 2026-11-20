import { create } from 'zustand';
import { CalendarEvent, CalendarCategory, CalendarViewMode } from '../types/calendar';

interface CalendarState {
  events: CalendarEvent[];
  viewMode: CalendarViewMode;
  currentDate: string; // YYYY-MM-DD
  selectedCategories: CalendarCategory[];
  setViewMode: (mode: CalendarViewMode) => void;
  setCurrentDate: (date: string) => void;
  toggleCategory: (category: CalendarCategory) => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  toggleCompleted: (id: string) => void;
  exportToICS: () => string;
}

const STORAGE_KEY = 'ap_mail_calendar_events_v2';

// Date di default relative alla data corrente per essere sempre attuali
const getInitialEvents = (): CalendarEvent[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Errore lettura calendario salvato:', e);
    }
  }

  const now = new Date();

  const addDays = (d: number) => {
    const target = new Date(now);
    target.setDate(target.getDate() + d);
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  };

  return [
    {
      id: 'demo-1',
      title: 'Udienza di Trattazione RG 51872/2021',
      category: 'udienza',
      startDate: `${addDays(2)}T09:30`,
      endDate: `${addDays(2)}T11:00`,
      location: 'Tribunale di Roma - Sez. III Civile, Aula 14',
      legalReference: 'RG 51872/2021',
      judge: 'Dott.ssa G. Marini',
      notes: 'Trattazione orale e precisazione delle conclusioni istruttorie. Presentarsi con fascicolo di parte cartaceo di cortesia.',
      reminderMinutes: 1440,
    },
    {
      id: 'demo-2',
      title: 'Termine Deposito Note di Trattazione Scritta ex art. 127-ter c.p.c.',
      category: 'termine_legale',
      startDate: `${addDays(4)}T13:00`,
      endDate: `${addDays(4)}T13:00`,
      allDay: true,
      legalReference: 'RG 14220/2022',
      notes: 'Termine perentorio fissato dal Giudice con ordinanza comunicata via PEC. Firma digitale PAdES richiesta.',
      reminderMinutes: 4320,
    },
    {
      id: 'demo-3',
      title: 'Versamento Periodico IVA & Ritenute d\'Acconto',
      category: 'fiscale',
      startDate: `${addDays(6)}T18:00`,
      endDate: `${addDays(6)}T18:00`,
      allDay: true,
      location: 'Canale Entratel / F24 Telematico',
      notes: 'Invio telematico modello F24 e quietanza versamento ritenute professionisti e collaboratori.',
      reminderMinutes: 1440,
    },
    {
      id: 'demo-4',
      title: 'Riunione CDA & Revisione Budget Q4',
      category: 'riunione',
      startDate: `${addDays(1)}T15:00`,
      endDate: `${addDays(1)}T17:00`,
      location: 'Sede AP Consulting - Sala Riunioni A',
      notes: 'Approvazione del piano investimenti e verifica liquidità. Collegamento Teams per consiglieri esterni.',
      reminderMinutes: 60,
    },
    {
      id: 'demo-5',
      title: 'Perizia Tecnica di Parte (CTP) - Sopralluogo',
      category: 'udienza',
      startDate: `${addDays(8)}T10:00`,
      endDate: `${addDays(8)}T13:00`,
      location: 'Presso stabilimento industriale / Perito Dott. Conti',
      legalReference: 'ATP RG 8891/2023',
      notes: 'Assistenza alle operazioni peritali collegiali del CTU.',
      reminderMinutes: 1440,
    },
  ];
};

export const useCalendarStore = create<CalendarState>((set, get) => {
  const initialEvents = getInitialEvents();
  const todayStr = new Date().toISOString().split('T')[0];

  return {
    events: initialEvents,
    viewMode: 'month',
    currentDate: todayStr,
    selectedCategories: ['udienza', 'termine_legale', 'fiscale', 'riunione', 'personale'],

    setViewMode: (mode) => set({ viewMode: mode }),
    setCurrentDate: (date) => set({ currentDate: date }),

    toggleCategory: (category) => {
      const current = get().selectedCategories;
      const next = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category];
      set({ selectedCategories: next });
    },

    addEvent: (eventData) => {
      const newEvent: CalendarEvent = {
        ...eventData,
        id: 'cal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      };
      const updated = [...get().events, newEvent];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      set({ events: updated });
    },

    updateEvent: (id, updates) => {
      const updated = get().events.map((e) => (e.id === id ? { ...e, ...updates } : e));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      set({ events: updated });
    },

    deleteEvent: (id) => {
      const updated = get().events.filter((e) => e.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      set({ events: updated });
    },

    toggleCompleted: (id) => {
      const updated = get().events.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      set({ events: updated });
    },

    exportToICS: () => {
      const { events } = get();
      let ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//AP Consulting//AP Mail Enterprise Calendar//IT',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
      ];

      for (const ev of events) {
        const start = ev.startDate.replace(/[-:]/g, '') + '00Z';
        const end = (ev.endDate || ev.startDate).replace(/[-:]/g, '') + '00Z';
        ics.push('BEGIN:VEVENT');
        ics.push(`UID:${ev.id}@apconsulting.it`);
        ics.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
        ics.push(`DTSTART:${start}`);
        ics.push(`DTEND:${end}`);
        ics.push(`SUMMARY:${ev.title}`);
        if (ev.location) ics.push(`LOCATION:${ev.location}`);
        if (ev.notes) ics.push(`DESCRIPTION:${ev.notes.replace(/\n/g, '\\n')}`);
        ics.push('END:VEVENT');
      }

      ics.push('END:VCALENDAR');
      return ics.join('\r\n');
    },
  };
});
