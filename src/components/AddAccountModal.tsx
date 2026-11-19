import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ShieldCheck, Mail, Lock, Server, Check, ArrowRight, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProviderPreset {
  name: string;
  server: string;
  port: number;
  isPec: boolean;
  badge: string;
}

const PRESETS: ProviderPreset[] = [
  { name: 'Aruba PEC', server: 'imaps.pec.aruba.it', port: 993, isPec: true, badge: 'PEC' },
  { name: 'Legalmail (InfoCert)', server: 'mail.legalmail.it', port: 993, isPec: true, badge: 'PEC' },
  { name: 'PosteCert', server: 'mail.postecert.it', port: 993, isPec: true, badge: 'PEC' },
  { name: 'Namirial PEC', server: 'imap.sicurezzapostale.it', port: 993, isPec: true, badge: 'PEC' },
  { name: 'IMAP Personalizzato / Gmail', server: 'imap.gmail.com', port: 993, isPec: false, badge: 'EMAIL' },
];

export const AddAccountModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [accountName, setAccountName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [imapServer, setImapServer] = useState(PRESETS[0].server);
  const [imapPort, setImapPort] = useState(993);
  const [isPec, setIsPec] = useState(true);
  const [autoDeleteOnServer, setAutoDeleteOnServer] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0].name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSelectPreset = (p: ProviderPreset) => {
    setSelectedPreset(p.name);
    setImapServer(p.server);
    setImapPort(p.port);
    setIsPec(p.isPec);
    if (!accountName || PRESETS.some((pr) => pr.name === accountName)) {
      setAccountName(p.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAddress || !password) {
      setErrorMsg('Inserisci indirizzo email e password');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await invoke('add_imap_account', {
        name: accountName || emailAddress,
        emailAddress,
        password,
        imapServer,
        imapPort,
        isPec,
        autoDeleteOnServer,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(typeof err === 'string' ? err : 'Errore durante la connessione al server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="bg-white border border-slate-200/80 w-full max-w-xl rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden">
        {/* Header Elegante con Stile AP Consulting */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-white to-amber-50/30 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Collega Nuova Casella</h2>
              <p className="text-xs text-slate-500">Configurazione IMAP & PEC con crittografia nativa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Preset 1-Click Gestori Italiani */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
              Seleziona il Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const isSelected = selectedPreset === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 text-amber-900 font-semibold shadow-sm ring-1 ring-amber-500/30'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50/80 hover:border-slate-300'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                      p.isPec ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {p.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dati Account */}
          <div className="space-y-3.5 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Nome Workspace</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="es. PEC Studio"
                  className="w-full px-3 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Indirizzo Email / PEC</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="avvocato@pec.it"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Protetto: la password viene cifrata nel Portachiavi di sistema (macOS Keychain)
              </span>
            </div>

            {/* Dettagli Server */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-700 block mb-1">Server IMAP</label>
                <div className="relative">
                  <Server className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={imapServer}
                    onChange={(e) => setImapServer(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Porta (SSL/TLS)</label>
                <input
                  type="number"
                  value={imapPort}
                  onChange={(e) => setImapPort(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Opzioni Speciali Studio Legale */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPec}
                onChange={(e) => setIsPec(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="text-xs font-medium text-slate-800">Casella PEC Certificata</span>
                <p className="text-[11px] text-slate-500">
                  Attiva il parser daticert.xml e la correlazione legale di Ricevute di Accettazione e Consegna.
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDeleteOnServer}
                onChange={(e) => setAutoDeleteOnServer(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="text-xs font-medium text-slate-800">Libera spazio su server (Atomic Expunge)</span>
                <p className="text-[11px] text-slate-500">
                  Cancella la posta dal server solo dopo la conferma del salvataggio locale e verifica dell'hash SHA-256.
                </p>
              </div>
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Azioni */}
          <div className="flex items-center justify-end space-x-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Annulla
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-xs flex items-center space-x-2 shadow-sm transition-all disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Verifica Connessione...' : 'Collega & Sincronizza'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
