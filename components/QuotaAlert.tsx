import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, Zap, ShieldAlert, RefreshCw, ArrowRightLeft, CheckCircle } from 'lucide-react';
import { QuotaAlertState } from '../hooks/useQuotaAlert';

interface QuotaAlertProps { alert: QuotaAlertState; onDismiss: () => void; }

const QuotaAlert: React.FC<QuotaAlertProps> = ({ alert, onDismiss }) => {
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  useEffect(() => { const t = setTimeout(() => setIsEntering(true), 10); return () => clearTimeout(t); }, []);
  const handleDismiss = () => { setIsExiting(true); setTimeout(onDismiss, 400); };
  const config = {
    key_rotated: { icon: <ArrowRightLeft />, title: 'Chave Rodada', gradient: 'from-emerald-500 to-teal-500', glow: 'shadow-emerald-500/30', border: 'border-emerald-400/30', bg: 'bg-emerald-950/95', iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-300', pulse: 'bg-emerald-400', status: <CheckCircle /> },
    quota_exhausted: { icon: <Zap />, title: 'Tokens Esgotados', gradient: 'from-amber-500 to-red-500', glow: 'shadow-orange-500/30', border: 'border-orange-400/30', bg: 'bg-orange-950/95', iconBg: 'bg-orange-500/20', iconColor: 'text-orange-300', pulse: 'bg-orange-400', status: <AlertTriangle /> },
    rate_limited: { icon: <RefreshCw />, title: 'Muitos Pedidos', gradient: 'from-yellow-500 to-orange-500', glow: 'shadow-yellow-500/30', border: 'border-yellow-400/30', bg: 'bg-yellow-950/95', iconBg: 'bg-yellow-500/20', iconColor: 'text-yellow-300', pulse: 'bg-yellow-400', status: <RefreshCw /> },
    api_error: { icon: <ShieldAlert />, title: 'Erro API', gradient: 'from-red-500 to-pink-500', glow: 'shadow-red-500/30', border: 'border-red-400/30', bg: 'bg-red-950/95', iconBg: 'bg-red-500/20', iconColor: 'text-red-300', pulse: 'bg-red-400', status: <ShieldAlert /> }
  };
  const c = config[alert.type];
  return (
    <>
      {alert.type !== 'key_rotated' && <div className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[100] transition-opacity ${isEntering && !isExiting ? 'opacity-100' : 'opacity-0'}`} onClick={handleDismiss} />}
      <div className={`fixed ${alert.type === 'key_rotated' ? 'top-20' : 'top-6'} left-4 right-4 z-[101] max-w-lg mx-auto transition-all duration-500 ${isEntering && !isExiting ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-95'}`}>
        <div className={`absolute -inset-1 bg-gradient-to-r ${c.gradient} rounded-[2rem] blur-xl opacity-40 ${alert.type === 'key_rotated' ? '' : 'animate-pulse'}`} />
        <div className={`relative ${c.bg} backdrop-blur-xl rounded-[1.75rem] border ${c.border} shadow-2xl ${c.glow} overflow-hidden p-5`}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 relative"><div className={`absolute inset-0 ${c.pulse} rounded-2xl opacity-20 ${alert.type === 'key_rotated' ? 'animate-pulse' : 'animate-ping'}`} /><div className={`relative w-12 h-12 ${c.iconBg} rounded-2xl flex items-center justify-center ${c.iconColor}`}>{React.cloneElement(c.icon as React.ReactElement, { className: "w-6 h-6" })}</div></div>
            <div className="flex-1 min-w-0 pt-0.5"><div className="flex items-center gap-2 mb-1.5"><h3 className="text-white font-black text-base tracking-tight">{c.title}</h3><div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10"><div className={`w-1.5 h-1.5 ${c.pulse} rounded-full animate-pulse`} /><span className="text-white/50 text-[9px] font-black uppercase tracking-widest">{alert.type === 'key_rotated' ? 'Rotação' : 'API'}</span></div></div><p className="text-white/70 text-sm leading-relaxed">{alert.message}</p></div>
            <button onClick={handleDismiss} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-all active:scale-90"><X className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </>
  );
};
export default QuotaAlert;
