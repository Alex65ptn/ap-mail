import React, { useState } from 'react';
import { useCalendarStore } from '../stores/calendarStore';
import { CalendarEvent, CalendarCategory } from '../types/calendar';
import { CalendarModal } from './CalendarModal';
import { ProceduralTermsCalculatorModal } from './ProceduralTermsCalculatorModal';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Scale, 
  MapPin, 
  Download, 
  CalendarDays,
  Gavel,
  Briefcase
} from 'lucide-react';

const CATEGORY_THEME: Record<CalendarCategory, { 
  label: string; 
  bg: string; 
  text: string; 
  border: string; 
  dot: string; 
  badge: string;
  pill: string;
}> = {
  udienza: {
    label: 'Udienze & Cause',
    bg: 'bg-rose-50/80',
    text: 'text-rose-950',
    border: 'border-l-[3px] border-rose-600',
    dot: 'bg-rose-600',
    badge: 'bg-rose-100 text-rose-800 border border-rose-200/80',
    pill: 'bg-rose-50 text-rose-900 border-rose-200',
  },
  termine_legale: {
    label: 'Termini Memorie',
    bg: 'bg-amber-50/80',
    text: 'text-amber-950',
    border: 'border-l-[3px] border-amber-500',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-900 border border-amber-200/80',
    pill: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  fiscale: {
    label: 'Fiscale & F24',
    bg: 'bg-emerald-50/80',
    text: 'text-emerald-950',
    border: 'border-l-[3px] border-emerald-600',
    dot: 'bg-emerald-600',
    badge: 'bg-emerald-100 text-emerald-900 border border-emerald-200/80',
    pill: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  },
  riunione: {
    label: 'CDA & Riunioni',
    bg: 'bg-sky-50/80',
    text: 'text-sky-950',
    border: 'border-l-[3px] border-sky-600',
    dot: 'bg-sky-600',
    badge: 'bg-sky-100 text-sky-900 border border-sky-200/80',
    pill: 'bg-sky-50 text-sky-900 border-sky-200',
  },
  personale: {
    label: 'Attività & Task',
    bg: 'bg-indigo-50/80',
    text: 'text-indigo-950',
    border: 'border-l-[3px] border-indigo-600',
    dot: 'bg-indigo-600',
    badge: 'bg-indigo-100 text-indigo-900 border border-indigo-200/80',
    pill: 'bg-indigo-50 text-indigo-900 border-indigo-200',
  },
};

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const WEEK_DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export const CalendarView: React.FC = () => {
  const {
    events,
    viewMode,
    currentDate,
    selectedCategories,
    setViewMode,
    setCurrentDate,
    toggleCategory,
    toggleCompleted,
    exportToICS,
  } = useCalendarStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
  const [calculatorPresetDate, setCalculatorPresetDate] = useState<string | undefined>(undefined);
  const [scadenzarioFilter, setScadenzarioFilter] = useState<'all' | 'udienza' | 'termine_legale' | 'fiscale' | 'completed'>('all');

  const currDateObj = new Date(currentDate);
  const currentYear = currDateObj.getFullYear();
  const currentMonth = currDateObj.getMonth();

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredEvents = events.filter((e) => selectedCategories.includes(e.category));

  // Navigazione
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'day') {
      d.setDate(d.getDate() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'day') {
      d.setDate(d.getDate() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setCurrentDate(new Date().toISOString().split('T')[0]);
  };

  const handleOpenNewEvent = (presetDate?: string) => {
    setSelectedEvent(presetDate ? ({ startDate: `${presetDate}T09:30`, endDate: `${presetDate}T11:00` } as any) : null);
    setIsModalOpen(true);
  };

  const handleExportICS = () => {
    const icsContent = exportToICS();
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ap_mail_calendario_${currentDate}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper date calcolo griglia mese
  const getMonthGridDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, d);
      days.push({
        dateStr: prevDate.toISOString().split('T')[0],
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({
        dateStr: `${currentYear}-${mStr}-${dStr}`,
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining + (days.length <= 35 ? 7 : 0); d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      days.push({
        dateStr: nextDate.toISOString().split('T')[0],
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    return days;
  };

  // Calcolo giorni settimana
  const getWeekDays = (workWeekOnly: boolean) => {
    const d = new Date(currentDate);
    let dayOfWeek = d.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;
    
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek);

    const count = workWeekOnly ? 5 : 7;
    const week: { dateStr: string; dayName: string; dayNum: number }[] = [];
    for (let i = 0; i < count; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      week.push({
        dateStr: dayDate.toISOString().split('T')[0],
        dayName: WEEK_DAYS_SHORT[i],
        dayNum: dayDate.getDate(),
      });
    }
    return week;
  };

  // Prossime scadenze urgenti
  const upcomingDeadlines = [...filteredEvents]
    .filter((e) => !e.completed)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 5);

  // Metriche per lo Scadenzario
  const totalActive = events.filter((e) => !e.completed).length;
  const totalUdienze = events.filter((e) => e.category === 'udienza' && !e.completed).length;
  const totalTermini = events.filter((e) => e.category === 'termine_legale' && !e.completed).length;
  const totalFiscali = events.filter((e) => e.category === 'fiscale' && !e.completed).length;

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50/60 select-none font-sans">
      {/* 1. Sidebar Sinistra - Navigatore Elegante & Mini Calendar */}
      <aside className="w-72 bg-white/70 backdrop-blur-md border-r border-slate-200/70 flex flex-col p-4 space-y-4 overflow-y-auto">
        {/* Pulsante Principale Executive con Sfumatura Ambra */}
        <div className="space-y-2">
          <button
            onClick={() => handleOpenNewEvent()}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-sm shadow-amber-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuova Scadenza / Evento</span>
          </button>

          {/* Calcolo Termini Processuali c.p.c. & Cartabia */}
          <button
            onClick={() => {
              setCalculatorPresetDate(currentDate);
              setIsCalculatorModalOpen(true);
            }}
            title="Calcola a ritroso o in avanti i termini ex art. 171-ter, 166, 127-ter, 190 c.p.c."
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition-all hover:scale-[1.01] cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 text-amber-400 stroke-[2.2]" />
            <span>Calcolo Termini Cartabia</span>
          </button>
        </div>

        {/* Mini Calendario Raffinato Apple/Linear Style */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2.5 px-1">
            <span className="tracking-tight">{MONTH_NAMES[currentMonth]} {currentYear}</span>
            <div className="flex items-center space-x-0.5">
              <button 
                onClick={handlePrev} 
                className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleNext} 
                className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">
            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {getMonthGridDays().slice(0, 35).map((cell, idx) => {
              const isSelected = cell.dateStr === currentDate;
              const isToday = cell.dateStr === todayStr;
              const hasEvents = events.some((e) => e.startDate.startsWith(cell.dateStr));

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentDate(cell.dateStr)}
                  className={`h-7 w-7 mx-auto rounded-full flex flex-col items-center justify-center relative font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white font-bold shadow-xs'
                      : isToday
                      ? 'bg-amber-100 text-amber-950 font-bold ring-1 ring-amber-400'
                      : cell.isCurrentMonth
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-[11px]">{cell.dayNum}</span>
                  {hasEvents && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-amber-500 absolute bottom-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categorie e Filtri con Pill Eleganti */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              I Miei Calendari
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {filteredEvents.length} eventi
            </span>
          </div>

          <div className="space-y-1">
            {(Object.keys(CATEGORY_THEME) as CalendarCategory[]).map((catKey) => {
              const conf = CATEGORY_THEME[catKey];
              const isChecked = selectedCategories.includes(catKey);
              const count = events.filter((e) => e.category === catKey && !e.completed).length;

              return (
                <button
                  key={catKey}
                  onClick={() => toggleCategory(catKey)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-white border border-slate-200/80 shadow-2xs text-slate-900 font-semibold'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${conf.dot} ${isChecked ? 'ring-2 ring-white' : 'opacity-40'}`} />
                    <span className="text-xs">{conf.label}</span>
                  </div>
                  <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-md ${
                    isChecked ? 'bg-slate-100 text-slate-600 font-medium' : 'text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scadenze Imminenti - Card di Prestigio */}
        <div className="space-y-2 pt-2 border-t border-slate-200/70">
          <div className="flex items-center space-x-1.5 px-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Scadenze Imminenti
            </span>
          </div>

          <div className="space-y-2">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-1">Nessuna scadenza a breve termine.</p>
            ) : (
              upcomingDeadlines.map((ev) => {
                const conf = CATEGORY_THEME[ev.category];
                const datePart = ev.startDate.split('T')[0];
                const timePart = ev.startDate.split('T')[1]?.substring(0, 5) || '';
                const isToday = datePart === todayStr;

                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setSelectedEvent(ev);
                      setIsModalOpen(true);
                    }}
                    className={`p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-amber-400/80 hover:shadow-xs cursor-pointer transition-all ${conf.border}`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isToday ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isToday ? 'Oggi' : datePart}
                      </span>
                      {timePart && <span className="text-slate-400 font-mono text-[11px]">{timePart}</span>}
                    </div>

                    <p className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2">
                      {ev.title}
                    </p>

                    {ev.legalReference && (
                      <div className="mt-1.5 flex items-center space-x-1 text-[11px] text-amber-800 font-medium">
                        <Scale className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">{ev.legalReference}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Esportazione Standard iCal */}
        <div className="pt-2">
          <button
            onClick={handleExportICS}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-medium flex items-center justify-center space-x-2 cursor-pointer shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Esporta Calendario (.ics)</span>
          </button>
        </div>
      </aside>

      {/* 2. Area Principale Calendario */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Barra Strumenti Superiore Moderna & Raffinata */}
        <header className="px-6 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-white/95 backdrop-blur-md">
          {/* Mese / Anno & Pulsanti Navigazione */}
          <div className="flex items-center space-x-4">
            <div className="flex items-baseline space-x-2">
              <h1 className="text-xl font-extrabold text-slate-950 tracking-tight">
                {MONTH_NAMES[currentMonth]}
              </h1>
              <span className="text-sm font-medium text-slate-400">
                {currentYear}
              </span>
            </div>

            {/* Segmented Controller: [ < ] [ Oggi ] [ > ] */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70 shadow-2xs">
              <button
                onClick={handlePrev}
                title="Periodo Precedente"
                className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1 text-xs font-bold text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                Oggi
              </button>
              <button
                onClick={handleNext}
                title="Periodo Successivo"
                className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Switcher Viste (Outlook / Apple Style) */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 text-xs font-semibold text-slate-600">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-white text-slate-950 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Mese
              </button>
              <button
                onClick={() => setViewMode('work_week')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'work_week'
                    ? 'bg-white text-slate-950 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Settimana Lav.
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-white text-slate-950 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Settimana
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'day'
                    ? 'bg-white text-slate-950 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Giorno
              </button>
              <button
                onClick={() => setViewMode('scadenzario')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'scadenzario'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'hover:text-slate-900 text-slate-700'
                }`}
              >
                <Scale className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Scadenzario Legale</span>
                {totalActive > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    viewMode === 'scadenzario' ? 'bg-slate-950 text-white' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {totalActive}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* 3. Render Contenuto in base a viewMode */}
        <div className="flex-1 overflow-y-auto">
          {/* A. VISTA MESE RAFFINATA */}
          {viewMode === 'month' && (
            <div className="h-full flex flex-col min-h-[640px]">
              {/* Header Giorni Settimana */}
              <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center py-2.5">
                {WEEK_DAYS_SHORT.map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>

              {/* Griglia Giorni Mese */}
              <div className="flex-1 grid grid-cols-7 grid-rows-5 border-l border-t border-slate-200/70">
                {getMonthGridDays().map((cell, idx) => {
                  const dayEvents = filteredEvents.filter((e) => e.startDate.startsWith(cell.dateStr));
                  const isToday = cell.dateStr === todayStr;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleOpenNewEvent(cell.dateStr)}
                      className={`min-h-[115px] border-r border-b border-slate-200/70 p-2 flex flex-col transition-colors cursor-pointer group ${
                        cell.isCurrentMonth ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/40 text-slate-300'
                      }`}
                    >
                      {/* Giorno Numero */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                            isToday
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                              : cell.isCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-300'
                          }`}
                        >
                          {cell.dayNum}
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-600 text-xs font-bold transition-opacity">
                          +
                        </span>
                      </div>

                      {/* Lista Eventi del Giorno */}
                      <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[95px] pr-0.5">
                        {dayEvents.map((ev) => {
                          const conf = CATEGORY_THEME[ev.category];
                          const timeStr = ev.allDay ? 'Tutto il giorno' : ev.startDate.split('T')[1]?.substring(0, 5);

                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(ev);
                                setIsModalOpen(true);
                              }}
                              className={`p-1.5 rounded-lg text-[11px] font-medium leading-tight shadow-2xs truncate transition-all hover:scale-[1.01] hover:shadow-xs ${conf.bg} ${conf.text} ${conf.border}`}
                              title={`${ev.title} (${timeStr})`}
                            >
                              <div className="flex items-center space-x-1.5 truncate">
                                {ev.completed ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                ) : (
                                  <span className={`w-1.5 h-1.5 rounded-full ${conf.dot} shrink-0`} />
                                )}
                                {!ev.allDay && <span className="font-bold text-[10px] shrink-0 font-mono">{timeStr}</span>}
                                <span className="truncate font-semibold">{ev.title}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* B. VISTA SETTIMANA / SETTIMANA LAVORATIVA */}
          {(viewMode === 'week' || viewMode === 'work_week') && (
            <div className="h-full flex flex-col">
              {/* Header Colonne Settimana */}
              <div
                className={`grid border-b border-slate-200/80 bg-slate-50/80 py-3 text-center text-xs font-semibold text-slate-700 ${
                  viewMode === 'work_week' ? 'grid-cols-5' : 'grid-cols-7'
                }`}
              >
                {getWeekDays(viewMode === 'work_week').map((d, i) => {
                  const isToday = d.dateStr === todayStr;
                  return (
                    <div key={i} className="flex flex-col items-center">
                      <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold">{d.dayName}</span>
                      <span
                        className={`text-sm font-extrabold mt-1 w-7 h-7 flex items-center justify-center rounded-full ${
                          isToday ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-800'
                        }`}
                      >
                        {d.dayNum}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Griglia Oraria Settimana */}
              <div className="flex-1 overflow-y-auto">
                <div
                  className={`grid divide-x divide-slate-200/80 min-h-[700px] ${
                    viewMode === 'work_week' ? 'grid-cols-5' : 'grid-cols-7'
                  }`}
                >
                  {getWeekDays(viewMode === 'work_week').map((day, dIdx) => {
                    const dayEvents = filteredEvents.filter((e) => e.startDate.startsWith(day.dateStr));

                    return (
                      <div
                        key={dIdx}
                        onClick={() => handleOpenNewEvent(day.dateStr)}
                        className="p-2.5 space-y-2.5 bg-white hover:bg-slate-50/50 transition-colors cursor-pointer"
                      >
                        {dayEvents.map((ev) => {
                          const conf = CATEGORY_THEME[ev.category];
                          const timeStr = ev.allDay
                            ? 'Tutto il giorno'
                            : `${ev.startDate.split('T')[1]?.substring(0, 5)} - ${ev.endDate.split('T')[1]?.substring(0, 5)}`;

                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(ev);
                                setIsModalOpen(true);
                              }}
                              className={`p-3 rounded-xl border text-xs shadow-2xs hover:shadow-xs transition-all ${conf.bg} ${conf.text} ${conf.border}`}
                            >
                              <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                                <span className="font-mono text-[10px]">{timeStr}</span>
                                {ev.legalReference && (
                                  <span className="text-[10px] bg-white/90 px-1.5 py-0.2 rounded font-bold border border-slate-200/50">
                                    {ev.legalReference}
                                  </span>
                                )}
                              </div>
                              <p className="font-bold text-sm leading-snug">{ev.title}</p>
                              {ev.location && (
                                <p className="text-[11px] opacity-80 flex items-center space-x-1 mt-1.5">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{ev.location}</span>
                                </p>
                              )}
                              {ev.judge && (
                                <p className="text-[11px] opacity-80 mt-0.5">
                                  Giudice: <span className="font-semibold">{ev.judge}</span>
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* C. VISTA GIORNO */}
          {viewMode === 'day' && (
            <div className="h-full flex flex-col p-8 max-w-4xl mx-auto overflow-y-auto">
              <div className="border-b border-slate-200/80 pb-5 mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight">
                    {new Date(currentDate).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pianificazione giornaliera dettagliata udienze, appuntamenti e adempimenti.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenNewEvent(currentDate)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Aggiungi per oggi</span>
                </button>
              </div>

              {/* Lista Eventi del Giorno */}
              <div className="space-y-3.5">
                {filteredEvents.filter((e) => e.startDate.startsWith(currentDate)).length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                    <CalendarDays className="w-12 h-12 mx-auto text-slate-300 mb-2.5" />
                    <p className="text-sm font-semibold text-slate-600">Nessuna udienza o scadenza programmata per questo giorno.</p>
                    <p className="text-xs text-slate-400 mt-1">Fai clic su "Aggiungi per oggi" per fissare un nuovo impegno.</p>
                  </div>
                ) : (
                  filteredEvents
                    .filter((e) => e.startDate.startsWith(currentDate))
                    .map((ev) => {
                      const conf = CATEGORY_THEME[ev.category];
                      const timeStr = ev.allDay
                        ? 'Tutto il giorno'
                        : `${ev.startDate.split('T')[1]?.substring(0, 5)} - ${ev.endDate.split('T')[1]?.substring(0, 5)}`;

                      return (
                        <div
                          key={ev.id}
                          onClick={() => {
                            setSelectedEvent(ev);
                            setIsModalOpen(true);
                          }}
                          className={`p-5 rounded-2xl border shadow-xs hover:border-amber-400 transition-all cursor-pointer ${conf.bg} ${conf.text} ${conf.border}`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider">{conf.label}</span>
                            <span className="text-xs font-bold font-mono bg-white/90 px-2.5 py-0.5 rounded-full border border-slate-200/50">
                              {timeStr}
                            </span>
                          </div>

                          <h3 className="text-base font-extrabold text-slate-950">{ev.title}</h3>

                          {ev.legalReference && (
                            <div className="mt-2.5 flex items-center space-x-2 text-xs font-semibold text-amber-900">
                              <Scale className="w-4 h-4 text-amber-600" />
                              <span>Fascicolo / Causa: {ev.legalReference}</span>
                              {ev.judge && <span>• Giudice: {ev.judge}</span>}
                            </div>
                          )}

                          {ev.location && (
                            <div className="mt-1.5 flex items-center space-x-1.5 text-xs text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{ev.location}</span>
                            </div>
                          )}

                          {ev.notes && (
                            <p className="mt-3 text-xs text-slate-700 bg-white/80 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                              {ev.notes}
                            </p>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* D. VISTA SCADENZARIO LEGALE & FISCALE (Agenda Ufficiale Executive) */}
          {viewMode === 'scadenzario' && (
            <div className="p-8 max-w-6xl mx-auto space-y-6">
              {/* Header con Titolo & Bottone */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-5">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-950 flex items-center space-x-2.5 tracking-tight">
                    <Scale className="w-7 h-7 text-amber-600 stroke-[2.2]" />
                    <span>Scadenzario Legale & Giudiziario Ufficiale</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Controllo perentorio dei termini processuali (udienze, memorie art. 183 c.p.c., note scritte art. 127-ter e versamenti).
                  </p>
                </div>
                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={() => {
                      setCalculatorPresetDate(currentDate);
                      setIsCalculatorModalOpen(true);
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
                  >
                    <Scale className="w-4 h-4 text-amber-400 stroke-[2.2]" />
                    <span>Calcolo Termini Cartabia</span>
                  </button>

                  <button
                    onClick={() => handleOpenNewEvent()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Nuova Scadenza Giudiziaria</span>
                  </button>
                </div>
              </div>

              {/* 4 Card di Riepilogo Statistiche / KPI Scadenziario */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Scadenze Attive</span>
                  <div className="text-2xl font-extrabold text-slate-950 mt-1">{totalActive}</div>
                  <span className="text-[11px] text-amber-600 font-semibold mt-0.5 inline-block">Adempimenti da evadere</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center space-x-1">
                    <Gavel className="w-3.5 h-3.5 text-rose-600" />
                    <span>Udienze a Ruolo</span>
                  </span>
                  <div className="text-2xl font-extrabold text-rose-950 mt-1">{totalUdienze}</div>
                  <span className="text-[11px] text-rose-700 font-semibold mt-0.5 inline-block">Cause e trattazioni</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Termini Memorie</span>
                  </span>
                  <div className="text-2xl font-extrabold text-amber-950 mt-1">{totalTermini}</div>
                  <span className="text-[11px] text-amber-700 font-semibold mt-0.5 inline-block">Termini perentori</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Scadenze Fiscali</span>
                  </span>
                  <div className="text-2xl font-extrabold text-emerald-950 mt-1">{totalFiscali}</div>
                  <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 inline-block">F24, IVA, Bilancio</span>
                </div>
              </div>

              {/* Barra Filtri Scadenzario */}
              <div className="flex items-center space-x-2 border-b border-slate-200/70 pb-3">
                <button
                  onClick={() => setScadenzarioFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scadenzarioFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tutte le Scadenze ({events.filter((e) => !e.completed).length})
                </button>
                <button
                  onClick={() => setScadenzarioFilter('udienza')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scadenzarioFilter === 'udienza'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-900 hover:bg-rose-50'
                  }`}
                >
                  Solo Udienze ({totalUdienze})
                </button>
                <button
                  onClick={() => setScadenzarioFilter('termine_legale')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scadenzarioFilter === 'termine_legale'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-amber-900 hover:bg-amber-50'
                  }`}
                >
                  Termini Memorie ({totalTermini})
                </button>
                <button
                  onClick={() => setScadenzarioFilter('fiscale')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scadenzarioFilter === 'fiscale'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  Fiscali & Bilanci ({totalFiscali})
                </button>
                <button
                  onClick={() => setScadenzarioFilter('completed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scadenzarioFilter === 'completed'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Completate / Archiviate ({events.filter((e) => e.completed).length})
                </button>
              </div>

              {/* Tabella Scadenzario Elegante */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 border-b border-slate-200/80 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4 w-12 text-center">Stato</th>
                      <th className="py-3.5 px-4">Data & Scadenza</th>
                      <th className="py-3.5 px-4">Tipologia</th>
                      <th className="py-3.5 px-4">Oggetto / Causa</th>
                      <th className="py-3.5 px-4">Rif. Giudiziario / Sede</th>
                      <th className="py-3.5 px-4 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...events]
                      .filter((e) => {
                        if (scadenzarioFilter === 'completed') return e.completed;
                        if (e.completed) return false;
                        if (scadenzarioFilter === 'all') return true;
                        return e.category === scadenzarioFilter;
                      })
                      .sort((a, b) => a.startDate.localeCompare(b.startDate))
                      .map((ev) => {
                        const conf = CATEGORY_THEME[ev.category];
                        const datePart = ev.startDate.split('T')[0];
                        const timePart = ev.allDay ? 'Tutto il giorno' : ev.startDate.split('T')[1]?.substring(0, 5);

                        const diffDays = Math.ceil(
                          (new Date(datePart).getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24)
                        );

                        return (
                          <tr
                            key={ev.id}
                            className={`hover:bg-slate-50/90 transition-colors ${
                              ev.completed ? 'opacity-40 bg-slate-50/40 line-through' : ''
                            }`}
                          >
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => toggleCompleted(ev.id)}
                                title={ev.completed ? 'Riapri Scadenza' : 'Segna come completata'}
                                className="cursor-pointer transition-transform hover:scale-110"
                              >
                                {ev.completed ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                ) : (
                                  <Circle className="w-5 h-5 text-slate-300 hover:text-amber-500" />
                                )}
                              </button>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-slate-900 font-mono text-xs">{datePart}</span>
                                {!ev.completed && (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                      diffDays < 0
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                        : diffDays === 0
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'
                                        : diffDays <= 3
                                        ? 'bg-orange-100 text-orange-900 border border-orange-200'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {diffDays < 0
                                      ? 'Scaduto'
                                      : diffDays === 0
                                      ? 'Oggi'
                                      : diffDays <= 3
                                      ? `Entro ${diffDays} gg`
                                      : `Tra ${diffDays} gg`}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{timePart}</div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${conf.badge}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
                                <span>{conf.label}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4 max-w-sm">
                              <div className="font-bold text-slate-900 text-sm leading-snug">{ev.title}</div>
                              {ev.notes && (
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">{ev.notes}</div>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              {ev.legalReference && (
                                <div className="font-bold text-amber-800 text-xs flex items-center space-x-1">
                                  <Scale className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>{ev.legalReference}</span>
                                </div>
                              )}
                              {ev.location && <div className="text-slate-500 text-[11px] mt-0.5">{ev.location}</div>}
                              {ev.judge && <div className="text-slate-400 text-[10px]">Giudice: {ev.judge}</div>}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedEvent(ev);
                                  setIsModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                              >
                                Dettaglio
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modale Dettaglio / Nuovo Evento */}
      <CalendarModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
        }}
        initialData={selectedEvent}
      />

      {/* Modale Calcolatore Termini Processuali Forensi c.p.c. & Riforma Cartabia */}
      <ProceduralTermsCalculatorModal
        isOpen={isCalculatorModalOpen}
        onClose={() => {
          setIsCalculatorModalOpen(false);
          setCalculatorPresetDate(undefined);
        }}
        presetDate={calculatorPresetDate}
      />
    </div>
  );
};
