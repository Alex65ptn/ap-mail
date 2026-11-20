import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Settings, ShieldCheck, Mail, Lock, Server, X, AlertCircle, CheckCircle2, Trash2, Send, Activity, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { ConnectionReportModal, ConnectionTestReport } from './ConnectionReportModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDeleteCurrent: () => void;
}

export const AccountSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  onDeleteCurrent,
}) => {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const currentWs = workspaces.find((w) => w.workspace_id === activeWorkspaceId);

  const [name, setName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [incomingProtocol, setIncomingProtocol] = useState<'IMAP' | 'POP3'>('IMAP');
  const [imapServer, setImapServer] = useState('');
  const [imapPort, setImapPort] = useState<number>(993);
  const [pop3Server, setPop3Server] = useState('');
  const [pop3Port, setPop3Port] = useState<number>(995);
  const [smtpServer, setSmtpServer] = useState('');
  const [smtpPort, setSmtpPort] = useState<number>(465);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [isPec, setIsPec] = useState(false);
  const [autoDeleteOnServer, setAutoDeleteOnServer] = useState(false);
  const [hasSavedPassword, setHasSavedPassword] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<ConnectionTestReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentWs) {
      setName(currentWs.name || '');
      setEmailAddress(currentWs.email_address || '');
      setShowPassword(false);

      if (currentWs.email_address) {
        invoke('get_account_password', { email: currentWs.email_address })
          .then((pwd: any) => {
            if (pwd && typeof pwd === 'string' && pwd.trim().length > 0) {
              setPassword(pwd);
              setHasSavedPassword(true);
            } else {
              setPassword('');
              setHasSavedPassword(false);
            }
          })
          .catch(() => {
            setPassword('');
            setHasSavedPassword(false);
          });
      } else {
        setPassword('');
        setHasSavedPassword(false);
      }
      const proto = (currentWs.incoming_protocol as any) || (currentWs.imap_port === 995 || currentWs.imap_port === 110 ? 'POP3' : 'IMAP');
      setIncomingProtocol(proto);
      setImapServer(currentWs.imap_server || (currentWs.email_address ? `mail.${currentWs.email_address.split('@')[1]}` : ''));
      setImapPort(currentWs.imap_port || 993);
      setPop3Server(currentWs.pop3_server || (currentWs.email_address ? `pop.${currentWs.email_address.split('@')[1]}` : ''));
      setPop3Port(currentWs.pop3_port || 995);
      setSmtpServer(currentWs.smtp_server || (currentWs.email_address ? `mail.${currentWs.email_address.split('@')[1]}` : ''));
      setSmtpPort(currentWs.smtp_port || (currentWs.is_pec ? 465 : 587));
      setSmtpUsername(currentWs.smtp_username || '');
      setIsPec(currentWs.is_pec || false);
      setAutoDeleteOnServer(currentWs.auto_delete_on_server || false);
      setErrorMsg(null);
      setSuccessMsg(null);
      setTestResult(null);
    }
  }, [currentWs, isOpen]);

  if (!isOpen || !currentWs) return null;

  const handleTestConnection = async () => {
    setIsReportOpen(true);
    setIsTesting(true);
    setTestResult(null);
    setReportError(null);
    setErrorMsg(null);

    const activeIncomingServer = incomingProtocol === 'POP3' 
      ? (pop3Server.trim() || (emailAddress ? `pop.${emailAddress.split('@')[1]}` : ''))
      : (imapServer.trim() || (emailAddress ? `mail.${emailAddress.split('@')[1]}` : ''));
    const activeIncomingPort = incomingProtocol === 'POP3' ? Number(pop3Port) : Number(imapPort);
    const activeOutgoingServer = smtpServer.trim() || (emailAddress ? `mail.${emailAddress.split('@')[1]}` : '');
    const activeOutgoingPort = Number(smtpPort);

    try {
      const res: any = await invoke('test_mail_connection', {
        params: {
          email_address: emailAddress.trim(),
          password: password.trim() ? password.trim() : null,
          incoming_protocol: incomingProtocol,
          incoming_server: activeIncomingServer,
          incoming_port: activeIncomingPort,
          outgoing_server: activeOutgoingServer,
          outgoing_port: activeOutgoingPort,
          outgoing_username: smtpUsername.trim() ? smtpUsername.trim() : null,
        },
      });
      setTestResult(res);
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || 'Errore durante il test di connessione.';
      setReportError(msg);
      setErrorMsg(msg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await invoke('update_workspace_settings', {
        params: {
          workspace_id: activeWorkspaceId,
          name: name.trim() || emailAddress.trim(),
          email_address: emailAddress.trim(),
          password: password.trim() ? password.trim() : null,
          incoming_protocol: incomingProtocol,
          imap_server: imapServer.trim(),
          imap_port: Number(imapPort),
          pop3_server: pop3Server.trim() ? pop3Server.trim() : null,
          pop3_port: pop3Port ? Number(pop3Port) : null,
          smtp_server: smtpServer.trim() ? smtpServer.trim() : null,
          smtp_port: smtpPort ? Number(smtpPort) : null,
          smtp_username: smtpUsername.trim() ? smtpUsername.trim() : null,
          is_pec: isPec,
          auto_delete_on_server: autoDeleteOnServer,
        },
      });

      setSuccessMsg('Impostazioni aggiornate con successo.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(typeof err === 'string' ? err : err?.message || 'Errore durante l\'aggiornamento.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modale */}
        <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 shadow-2xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Impostazioni Casella</h3>
              <p className="text-[11px] text-slate-500">Configura server IMAP/SMTP, credenziali e criteri PEC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Impostazioni */}
        <form onSubmit={handleSave} className="p-6 flex-1 flex flex-col space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Nome e Indirizzo */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Nome Casella
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Indirizzo Email / PEC
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Password (aggiornamento o inserimento) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Password Casella
              </label>
              {hasSavedPassword === true ? (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Password salvata nel Portachiavi</span>
                </span>
              ) : hasSavedPassword === false ? (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  <span>Nessuna password salvata: digitala qui</span>
                </span>
              ) : null}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={hasSavedPassword ? "Lascia vuoto per non modificare, oppure digita una nuova password..." : "Digita qui la password della casella..."}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-9 pr-9 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 transition-all text-slate-900 ${
                  !hasSavedPassword && !password
                    ? 'border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-400/30'
                    : 'border-slate-300 focus:border-amber-500 focus:ring-amber-500/40'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title={showPassword ? "Nascondi password" : "Mostra password"}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {hasSavedPassword
                ? "La password attuale è memorizzata in sicurezza nel Portachiavi macOS. Se la cambi, verrà aggiornata automaticamente."
                : "Importante: inserisci la password e clicca su 'Salva Impostazioni' per abilitare invio e ricezione."}
            </p>
          </div>

          {/* Nome Utente SMTP / IMAP */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Nome Utente per Autenticazione (lascia vuoto se coincide con l'email)
            </label>
            <input
              type="text"
              placeholder={emailAddress ? `${emailAddress} oppure ${emailAddress.split('@')[0]}` : "es. admin oppure i7"}
              value={smtpUsername}
              onChange={(e) => setSmtpUsername(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-slate-900 placeholder:text-slate-400 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Su server Postfix/Linux alcuni account usano la sola parte iniziale (es. "admin" o "i7") anziché l'email completa.
            </p>
          </div>

          <div className="border-t border-slate-100 my-1" />

          {/* Scelta Protocollo di Ricezione */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Protocollo di Ricezione Posta
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIncomingProtocol('IMAP')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  incomingProtocol === 'IMAP'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-900 shadow-2xs font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                IMAP (Sincronizzazione)
              </button>
              <button
                type="button"
                onClick={() => setIncomingProtocol('POP3')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  incomingProtocol === 'POP3'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-900 shadow-2xs font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                POP3 (Download Locale nel Vault)
              </button>
            </div>
          </div>

          {/* Parametri Ricezione (IMAP o POP3) */}
          {incomingProtocol === 'POP3' ? (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center space-x-1.5">
                <Server className="w-3.5 h-3.5 text-amber-600" />
                <span>Server Ricezione (POP3)</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <input
                    type="text"
                    required
                    placeholder="pop.dominio.com o 172.30.1.100"
                    value={pop3Server}
                    onChange={(e) => setPop3Server(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <select
                    value={pop3Port}
                    onChange={(e) => setPop3Port(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-slate-900 bg-white font-medium"
                  >
                    <option value={995}>995 (POP3s SSL)</option>
                    <option value={110}>110 (POP3 standard)</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center space-x-1.5">
                <Server className="w-3.5 h-3.5 text-slate-500" />
                <span>Server Ricezione (IMAP)</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <input
                    type="text"
                    required
                    placeholder="mail.dominio.com"
                    value={imapServer}
                    onChange={(e) => setImapServer(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <select
                    value={imapPort}
                    onChange={(e) => setImapPort(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-slate-900 bg-white"
                  >
                    <option value={993}>993 (SSL)</option>
                    <option value={143}>143 (STARTTLS)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Parametri SMTP */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center space-x-1.5">
              <Send className="w-3.5 h-3.5 text-slate-500" />
              <span>Server Invio (SMTP)</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="smtp.dominio.com"
                  value={smtpServer}
                  onChange={(e) => setSmtpServer(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-slate-900 font-mono"
                />
              </div>
              <div>
                <select
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-slate-900 bg-white"
                >
                  <option value={465}>465 (SSL)</option>
                  <option value={587}>587 (TLS)</option>
                  <option value={25}>25 (Standard)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 my-1" />

          {/* Opzioni PEC ed Expunge */}
          <div className="space-y-2.5">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPec}
                onChange={(e) => setIsPec(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded-md border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-900 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Casella PEC Certificata</span>
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Attiva il parsing automatico di daticert.xml e buste .p7m CAdES.
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDeleteOnServer}
                onChange={(e) => setAutoDeleteOnServer(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded-md border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-900">Libera spazio su server (Atomic Expunge)</span>
                <span className="text-[11px] text-slate-500 block">
                  Cancella dal server solo dopo la conferma del salvataggio locale e verifica SHA-256.
                </span>
              </div>
            </label>
          </div>

          {/* Indicatore di verifica in corso */}
          {isTesting && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center space-x-2.5 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Verifica di rete in corso...</span>
                <span className="block text-[11px] text-amber-800/80 mt-0.5">
                  Interrogazione socket su {incomingProtocol === 'POP3' ? (pop3Server || 'mail.apconsulting.it') : (imapServer || 'mail.apconsulting.it')}:{incomingProtocol === 'POP3' ? pop3Port : imapPort} e SMTP su {smtpServer || 'mail.apconsulting.it'}:{smtpPort}...
                </span>
              </div>
            </div>
          )}

          {/* Card Esito Test Connessione & Console Dettagliata */}
          {testResult && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden space-y-0 text-xs animate-in fade-in">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-amber-600" />
                  <span>Esito Test Connessione & Diagnostica di Rete</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-slate-500">Completato</span>
                </div>
              </div>

              {/* Box Riassuntivi */}
              <div className="p-3 grid grid-cols-2 gap-2 bg-slate-50/50">
                <div className={`p-2.5 rounded-lg border flex items-start space-x-2 ${
                  testResult.incoming.success 
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50/90 border-rose-200 text-rose-900'
                }`}>
                  {testResult.incoming.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[10px] uppercase tracking-wider">
                      Ricezione ({incomingProtocol})
                    </div>
                    <div className="text-[11px] mt-0.5 leading-snug line-clamp-2" title={testResult.incoming.message}>
                      {testResult.incoming.message}
                    </div>
                  </div>
                </div>

                <div className={`p-2.5 rounded-lg border flex items-start space-x-2 ${
                  testResult.outgoing.success 
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50/90 border-rose-200 text-rose-900'
                }`}>
                  {testResult.outgoing.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[10px] uppercase tracking-wider">
                      Invio (SMTP)
                    </div>
                    <div className="text-[11px] mt-0.5 leading-snug line-clamp-2" title={testResult.outgoing.message}>
                      {testResult.outgoing.message}
                    </div>
                  </div>
                </div>
              </div>

              {/* Console di Rete Monospace (Mostra esattamente cosa fa il test!) */}
              {testResult.logs && testResult.logs.length > 0 && (
                <div className="border-t border-slate-200 bg-slate-950 p-3 font-mono text-[10px] leading-relaxed max-h-48 overflow-y-auto select-text">
                  <div className="text-slate-400 font-bold mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1">
                    <span>LOG DI RETE DETTAGLIATO (Socket & Protocolli)</span>
                    <span className="text-slate-500">{testResult.logs.length} passaggi</span>
                  </div>
                  <div className="space-y-1">
                    {testResult.logs.map((log, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                        <span className={`shrink-0 font-bold ${
                          log.section === 'RICEZIONE' ? 'text-cyan-400' :
                          log.section === 'INVIO SMTP' ? 'text-amber-400' : 'text-purple-400'
                        }`}>
                          [{log.section}]
                        </span>
                        <span className={`flex-1 break-all ${
                          log.level === 'SUCCESS' ? 'text-emerald-400 font-medium' :
                          log.level === 'ERROR' ? 'text-rose-400 font-semibold' :
                          log.level === 'WARN' ? 'text-amber-300' : 'text-slate-300'
                        }`}>
                          {log.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Azioni */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onClose();
                onDeleteCurrent();
              }}
              className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-medium flex items-center space-x-1.5 transition-colors border border-transparent hover:border-rose-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Elimina Casella</span>
            </button>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || isSaving}
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

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSaving || isTesting}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {isSaving ? 'Salvataggio...' : 'Salva Impostazioni'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modale Report Connessione & Diagnostica di Rete */}
      <ConnectionReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        isTesting={isTesting}
        report={testResult}
        error={reportError}
        incomingProtocol={incomingProtocol}
        incomingHost={incomingProtocol === 'POP3' ? (pop3Server.trim() || 'mail.apconsulting.it') : (imapServer.trim() || 'mail.apconsulting.it')}
        incomingPort={incomingProtocol === 'POP3' ? Number(pop3Port) : Number(imapPort)}
        outgoingHost={smtpServer.trim() || 'mail.apconsulting.it'}
        outgoingPort={Number(smtpPort)}
        onRetry={handleTestConnection}
      />
    </div>
  );
};
