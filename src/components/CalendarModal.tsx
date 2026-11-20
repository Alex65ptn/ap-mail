import React, { useState, useEffect } from 'react';
import { CalendarEvent, CalendarCategory } from '../types/calendar';
import { useCalendarStore } from '../stores/calendarStore';
import { X, Calendar, Clock, MapPin, FileText, Scale, Bell, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<CalendarEvent> | null;
}

const CATEGORY_CONFIG: Record<CalendarCategory, { label: string; color: string; badge: string }> = {
  udienza: {
    label: 'Udienza & Causa Legale',
    color: 'border-rose-400 bg-rose-50 text-rose-800',
    badge: 'bg-rose-600 text-white',
  },
  termine_legale: {
    label: 'Termine Perentorio / Memorie',
    color: 'border-amber-400 bg-amber-50 text-amber-900',
    badge: 'bg-amber-600 text-white',
  },
  fiscale: {
    label: 'Scadenza Fiscale / F24 / Bilancio',
    color: 'border-emerald-400 bg-emerald-50 text-emerald-900',
    badge: 'bg-emerald-600 text-white',
  },
  riunione: {
    label: 'Riunione CDA / Consulenza',
    color: 'border-blue-400 bg-blue-50 text-blue-900',
    badge: 'bg-blue-600 text-white',
  },
  personale: {
    label: 'Promemoria & Personale',
    color: 'border-purple-400 bg-purple-50 text-purple-900',
    badge: 'bg-purple-600 text-white',
  },
};

export const CalendarModal: React.FC<Props> = ({ isOpen, onClose, initialData }) => {
  const { addEvent, updateEvent, deleteEvent } = useCalendarStore();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CalendarCategory>('udienza');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:30');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('11:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [legalReference, setLegalReference] = useState('');
  const [judge, setJudge] = useState('');
  const [notes, setNotes] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number>(1440);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setCategory(initialData.category || 'udienza');
        
        const startParts = (initialData.startDate || '').split('T');
        setStartDate(startParts[0] || new Date().toISOString().split('T')[0]);
        setStartTime(startParts[1]?.substring(0, 5) || '09:30');

        const endParts = (initialData.endDate || initialData.startDate || '').split('T');
        setEndDate(endParts[0] || startParts[0] || new Date().toISOString().split('T')[0]);
        setEndTime(endParts[1]?.substring(0, 5) || '11:00');

        setAllDay(initialData.allDay || false);
        setLocation(initialData.location || '');
        setLegalReference(initialData.legalReference || '');
        setJudge(initialData.judge || '');
        setNotes(initialData.notes || '');
        setReminderMinutes(initialData.reminderMinutes !== undefined ? initialData.reminderMinutes : 1440);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setTitle('');
        setCategory('udienza');
        setStartDate(today);
        setStartTime('09:30');
        setEndDate(today);
        setEndTime('11:00');
        setAllDay(false);
        setLocation('');
        setLegalReference('');
        setJudge('');
        setNotes('');
        setReminderMinutes(1440);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate) return;

    const start = allDay ? `${startDate}T00:00` : `${startDate}T${startTime}`;
    const end = allDay ? `${endDate || startDate}T23:59` : `${endDate || startDate}T${endTime}`;

    if (initialData?.id) {
      updateEvent(initialData.id, {
        title,
        category,
        startDate: start,
        endDate: end,
        allDay,
        location,
        legalReference,
        judge,
        notes,
        reminderMinutes,
      });
    } else {
      addEvent({
        title,
        category,
        startDate: start,
        endDate: end,
        allDay,
        location,
        legalReference,
        judge,
        notes,
        reminderMinutes,
        linkedEmailId: initialData?.linkedEmailId,
        linkedEmailSubject: initialData?.linkedEmailSubject,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (initialData?.id && confirm('Vuoi davvero eliminare questo evento dallo scadenzario?')) {
      deleteEvent(initialData.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {initialData?.id ? 'Modifica Evento / Scadenza' : 'Nuovo Evento o Scadenza Ufficiale'}
              </h2>
              <p className="text-xs text-slate-500">
                Calendario Aziendale & Scadenzario Legale Integrato
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-slate-700">
          {/* Titolo */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Oggetto / Titolo Scadenza *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Udienza di Trattazione o Deposito Memorie ex art. 183"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-900 font-medium"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tipologia & Categoria
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CATEGORY_CONFIG) as CalendarCategory[]).map((catKey) => {
                const conf = CATEGORY_CONFIG[catKey];
                const isSelected = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                      isSelected
                        ? `${conf.color} ring-2 ring-amber-500/40 font-semibold shadow-xs`
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${conf.badge}`} />
                    <span className="truncate">{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Orari */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Pianificazione Oraria</span>
              </span>
              <label className="flex items-center space-x-2 cursor-pointer text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                />
                <span>Tutto il giorno</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Data Inizio</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>

              {!allDay && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Ora Inizio</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                </div>
              )}
            </div>

            {!allDay && (
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/50">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Data Fine</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Ora Fine</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dati Legali / Giudiziari */}
          {(category === 'udienza' || category === 'termine_legale') && (
            <div className="grid grid-cols-2 gap-3 bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/60">
              <div>
                <label className="block text-[11px] font-semibold text-amber-900 mb-1 flex items-center space-x-1">
                  <Scale className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ruolo Generale (RG) / Fascicolo</span>
                </label>
                <input
                  type="text"
                  value={legalReference}
                  onChange={(e) => setLegalReference(e.target.value)}
                  placeholder="Es. RG 51872/2021"
                  className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-amber-900 mb-1">Giudice / Relatore</label>
                <input
                  type="text"
                  value={judge}
                  onChange={(e) => setJudge(e.target.value)}
                  placeholder="Es. Dott.ssa Marini"
                  className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-slate-900"
                />
              </div>
            </div>
          )}

          {/* Luogo & Promemoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Luogo / Aula / Collegamento</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Es. Aula 12 / Teams / Sede"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Bell className="w-3.5 h-3.5 text-slate-500" />
                <span>Preavviso / Promemoria</span>
              </label>
              <select
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              >
                <option value={0}>Nessun avviso</option>
                <option value={15}>15 minuti prima</option>
                <option value={60}>1 ora prima</option>
                <option value={1440}>1 giorno prima (Default)</option>
                <option value={4320}>3 giorni prima (Consigliato memorie)</option>
                <option value={10080}>1 settimana prima</option>
              </select>
            </div>
          </div>

          {/* Note / Dettagli */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Note Operative & Istruzioni</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Inserisci adempimenti istruttori, estremi atti, o link alla PEC di notifica..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>

          {/* Se collegata ad una email */}
          {initialData?.linkedEmailSubject && (
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-center space-x-2">
              <span className="font-semibold text-slate-700">Email collegata:</span>
              <span className="truncate italic">{initialData.linkedEmailSubject}</span>
            </div>
          )}

          {/* Footer Azioni */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {initialData?.id ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                Elimina Evento
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{initialData?.id ? 'Salva Modifiche' : 'Registra in Scadenzario'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
