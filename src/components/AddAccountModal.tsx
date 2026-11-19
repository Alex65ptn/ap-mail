import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ShieldCheck, Mail, Lock, Server, ArrowRight, X, Activity, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

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
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    incoming: { success: boolean; message: string };
    outgoing: { success: boolean; message: string };
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!emailAddress.trim()) {
      setErrorMsg('Inserisci un indirizzo email prima di testare.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    setErrorMsg('');

    const domain = emailAddress.split('@')[1] || 'localhost';
    const activeIncomingServer = imapServer.trim() || `mail.${domain}`;
    const activeOutgoingServer = isPec ? (imapServer.trim() || `mail.${domain}`) : `mail.${domain}`;
    const activeOutgoingPort = isPec ? 465 : 587;

    try {
      const res: any = await invoke('test_mail_connection', {
        params: {
          email_address: emailAddress.trim(),
          password: password.trim() ? password.trim() : null,
          incoming_protocol: 'IMAP',
          incoming_server: activeIncomingServer,
          incoming_port: Number(imapPort),
          outgoing_server: activeOutgoingServer,
          outgoing_port: activeOutgoingPort,
          outgoing_username: null,
        },
      });
      setTestResult(res);
    } catch (err: any) {
      setErrorMsg(typeof err === 'string' ? err : err?.message || 'Errore durante il test di connessione.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleEmailChange = async (val: string) => {
    setEmailAddress(val);
    if (val.includes('@') && val.includes('.')) {
      try {
        const detection: any = await invoke('auto_detect_server', { email: val });
        if (detection && detection.server) {
          setImapServer(detection.server);
          setImapPort(detection.port);
          setIsPec(detection.is_pec);
          setSelectedPreset(detection.provider_name);
          if (!accountName) {
            setAccountName(val.split('@')[0]);
          }
        }
      } catch (e) {
        // Fallback automatico
        const domain = val.split('@')[1];
        if (domain) {
          setImapServer(`mail.${domain}`);
        }
      }
    }
  };

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
                    onChange={(e) => handleEmailChange(e.target.value)}
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

          {/* Card Esito Test Connessione */}
          {testResult && (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2 text-xs animate-in fade-in">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-600" />
                  <span>Esito Test Connessione</span>
                </span>
                <span className="text-[10px] font-normal text-slate-400">Verificato adesso</span>
              </div>
              
              <div className={`p-2.5 rounded-lg border flex items-start space-x-2.5 ${
                testResult.incoming.success 
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50/90 border-rose-200 text-rose-900'
              }`}>
                {testResult.incoming.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-semibold text-[11px] uppercase tracking-wider">
                    Posta in Entrata (IMAP)
                  </div>
                  <div className="text-[11px] mt-0.5 leading-snug">
                    {testResult.incoming.message}
                  </div>
                </div>
              </div>

              <div className={`p-2.5 rounded-lg border flex items-start space-x-2.5 ${
                testResult.outgoing.success 
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50/90 border-rose-200 text-rose-900'
              }`}>
                {testResult.outgoing.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-semibold text-[11px] uppercase tracking-wider">
                    Posta in Uscita (SMTP)
                  </div>
                  <div className="text-[11px] mt-0.5 leading-snug">
                    {testResult.outgoing.message}
                  </div>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Azioni */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || isSubmitting}
              className="px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100/90 border border-amber-300/80 rounded-xl transition-all flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  <span>Verifica in corso...</span>
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5 text-amber-600" />
                  <span>Test Connessione</span>
                </>
              )}
            </button>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Annulla
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isTesting}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-xs flex items-center space-x-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>{isSubmitting ? 'Autenticazione automatica in corso...' : 'Collega & Sincronizza'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
