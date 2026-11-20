import React, { useState } from 'react';
import { Activity, CheckCircle2, AlertCircle, RefreshCw, X, Copy, Check, Server, Send } from 'lucide-react';

export interface ConnectionLogEntry {
  timestamp: string;
  section: string;
  level: string;
  text: string;
}

export interface ConnectionTestReport {
  incoming: { success: boolean; message: string };
  outgoing: { success: boolean; message: string };
  logs: ConnectionLogEntry[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isTesting: boolean;
  report: ConnectionTestReport | null;
  error: string | null;
  incomingProtocol: string;
  incomingHost: string;
  incomingPort: number;
  outgoingHost: string;
  outgoingPort: number;
  onRetry: () => void;
}

export const ConnectionReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  isTesting,
  report,
  error,
  incomingProtocol,
  incomingHost,
  incomingPort,
  outgoingHost,
  outgoingPort,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!report) return;
    const textReport = [
      `=== REPORT DIAGNOSTICO CONNESSIONE AP MAIL ===`,
      `Data: ${new Date().toLocaleString('it-IT')}`,
      `Ricezione (${incomingProtocol}): ${incomingHost}:${incomingPort} -> ${report.incoming.success ? 'OK' : 'FALLITO'} (${report.incoming.message})`,
      `Invio (SMTP): ${outgoingHost}:${outgoingPort} -> ${report.outgoing.success ? 'OK' : 'FALLITO'} (${report.outgoing.message})`,
      ``,
      `--- LOG DI RETE DETTAGLIATO ---`,
      ...(report.logs || []).map((l) => `[${l.timestamp}] [${l.section}] [${l.level}] ${l.text}`),
      `===============================================`,
    ].join('\n');

    navigator.clipboard.writeText(textReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Report Diagnostico Connessione</h3>
              <p className="text-[11px] text-slate-500">Verifica in tempo reale socket di rete, porte e autenticazione server</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo Modal */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* Se il test è in esecuzione */}
          {isTesting && (
            <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
              <div>
                <div className="text-xs font-bold text-slate-900">Verifica di rete in corso...</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Interrogazione socket parallela su <b>{incomingHost}:{incomingPort}</b> ({incomingProtocol}) e <b>{outgoingHost}:{outgoingPort}</b> (SMTP)...
                </p>
              </div>
            </div>
          )}

          {/* Errore bloccante prima del report */}
          {error && !isTesting && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Errore durante l'esecuzione del test:</div>
                <div className="mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {/* Risultati Report */}
          {report && !isTesting && (
            <>
              {/* Due Card Riassuntive Grandi */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Ricezione */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  report.incoming.success
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs'
                    : 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
                      <Server className="w-3.5 h-3.5 text-slate-600" />
                      <span>Posta in Entrata ({incomingProtocol})</span>
                    </span>
                    {report.incoming.success ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ATTIVA</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-bold">
                        <AlertCircle className="w-3 h-3" />
                        <span>NON ATTIVA</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold leading-relaxed">
                    {report.incoming.message}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-200/60">
                    Host: {incomingHost}:{incomingPort}
                  </div>
                </div>

                {/* Invio SMTP */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  report.outgoing.success
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs'
                    : 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
                      <Send className="w-3.5 h-3.5 text-slate-600" />
                      <span>Posta in Uscita (SMTP)</span>
                    </span>
                    {report.outgoing.success ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ATTIVA</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-bold">
                        <AlertCircle className="w-3 h-3" />
                        <span>NON ATTIVA</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold leading-relaxed">
                    {report.outgoing.message}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-200/60">
                    Host: {outgoingHost}:{outgoingPort}
                  </div>
                </div>
              </div>

              {/* Console di Rete con Log Dettagliati */}
              {report.logs && report.logs.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm">
                  <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>LOG DI RETE E RISPOSTE DEL SERVER</span>
                    </span>
                    <span className="text-slate-500">{report.logs.length} eventi registrati</span>
                  </div>
                  <div className="p-3.5 font-mono text-[10.5px] leading-relaxed max-h-56 overflow-y-auto space-y-1 select-text">
                    {report.logs.map((log, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                        <span className={`shrink-0 font-bold ${
                          log.section === 'RICEZIONE' ? 'text-cyan-400' :
                          log.section === 'INVIO SMTP' ? 'text-amber-400' : 'text-purple-400'
                        }`}>
                          [{log.section}]
                        </span>
                        <span className={`flex-1 break-all ${
                          log.level === 'SUCCESS' ? 'text-emerald-400 font-semibold' :
                          log.level === 'ERROR' ? 'text-rose-400 font-bold' :
                          log.level === 'WARN' ? 'text-amber-300' : 'text-slate-300'
                        }`}>
                          {log.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Modal con Azioni */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!report || isTesting}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center space-x-1.5 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copiato negli appunti!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copia Report Completo</span>
              </>
            )}
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onRetry}
              disabled={isTesting}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-40 flex items-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isTesting ? 'animate-spin' : ''}`} />
              <span>Ripeti Test</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Chiudi
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
