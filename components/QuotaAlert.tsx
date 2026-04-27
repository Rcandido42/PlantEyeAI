import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, Zap, ShieldAlert, RefreshCw } from 'lucide-react';
import { QuotaAlertState } from '../hooks/useQuotaAlert';

interface QuotaAlertProps {
  alert: QuotaAlertState;
  onDismiss: () => void;
}

const QuotaAlert: React.FC<QuotaAlertProps> = ({ alert, onDismiss }) => {
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animação de entrada
    const timer = setTimeout(() => setIsEntering(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 400);
  };

  const config = {
    quota_exhausted: {
      icon: <Zap className="w-6 h-6" />,
      title: 'Tokens Esgotados',
      gradient: 'from-amber-500 via-orange-500 to-red-500',
      glowColor: 'shadow-orange-500/30',
      borderColor: 'border-orange-400/30',
      bgOverlay: 'bg-gradient-to-br from-orange-950/95 to-red-950/95',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-300',
      pulseColor: 'bg-orange-400',
    },
    rate_limited: {
      icon: <RefreshCw className="w-6 h-6" />,
      title: 'Pedidos Demasiado Rápidos',
      gradient: 'from-yellow-500 via-amber-500 to-orange-500',
      glowColor: 'shadow-yellow-500/30',
      borderColor: 'border-yellow-400/30',
      bgOverlay: 'bg-gradient-to-br from-yellow-950/95 to-amber-950/95',
      iconBg: 'bg-yellow-500/20',
      iconColor: 'text-yellow-300',
      pulseColor: 'bg-yellow-400',
    },
    api_error: {
      icon: <ShieldAlert className="w-6 h-6" />,
      title: 'Erro da API',
      gradient: 'from-red-500 via-rose-500 to-pink-500',
      glowColor: 'shadow-red-500/30',
      borderColor: 'border-red-400/30',
      bgOverlay: 'bg-gradient-to-br from-red-950/95 to-rose-950/95',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-300',
      pulseColor: 'bg-red-400',
    },
  };

  const c = config[alert.type];

  return (
    <>
      {/* Backdrop escuro sutil */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[100] transition-opacity duration-400 ${
          isEntering && !isExiting ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleDismiss}
      />

      {/* Banner principal */}
      <div
        className={`fixed top-6 left-4 right-4 z-[101] max-w-lg mx-auto transition-all duration-500 ease-out ${
          isEntering && !isExiting
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-8 scale-95'
        }`}
      >
        {/* Glow exterior */}
        <div className={`absolute -inset-1 bg-gradient-to-r ${c.gradient} rounded-[2rem] blur-xl opacity-40 animate-pulse`} />

        {/* Card */}
        <div
          className={`relative ${c.bgOverlay} backdrop-blur-xl rounded-[1.75rem] border ${c.borderColor} shadow-2xl ${c.glowColor} overflow-hidden`}
        >
          {/* Linha de gradiente no topo */}
          <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${c.gradient}`} />

          {/* Partículas decorativas animadas */}
          <div className="absolute top-4 right-12 w-1.5 h-1.5 rounded-full bg-white/10 animate-float-slow" />
          <div className="absolute top-8 right-20 w-1 h-1 rounded-full bg-white/5 animate-float-slower" />
          <div className="absolute bottom-6 left-12 w-1 h-1 rounded-full bg-white/10 animate-float-slow" />

          <div className="relative p-5">
            <div className="flex items-start gap-4">
              {/* Ícone com animação de pulso */}
              <div className="flex-shrink-0 relative">
                <div className={`absolute inset-0 ${c.pulseColor} rounded-2xl opacity-20 animate-ping`} />
                <div className={`relative w-12 h-12 ${c.iconBg} rounded-2xl flex items-center justify-center ${c.iconColor}`}>
                  {c.icon}
                </div>
              </div>

              {/* Conteúdo de texto */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-white font-black text-base tracking-tight">
                    {c.title}
                  </h3>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    <div className={`w-1.5 h-1.5 ${c.pulseColor} rounded-full animate-pulse`} />
                    <span className="text-white/50 text-[9px] font-black uppercase tracking-[0.15em]">
                      Gemini API
                    </span>
                  </div>
                </div>
                <p className="text-white/70 text-sm leading-relaxed">
                  {alert.message}
                </p>
              </div>

              {/* Botão de fechar */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 flex items-center justify-center text-white/40 hover:text-white/80 transition-all duration-200 active:scale-90"
                aria-label="Fechar alerta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dica extra para quota esgotada */}
            {alert.type === 'quota_exhausted' && (
              <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0" />
                <span className="text-white/40 text-xs leading-snug">
                  Verifica a tua <span className="text-white/60 font-semibold">Google AI Studio</span> para mais detalhes sobre o consumo de tokens.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animações CSS */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-6px) scale(1.2); opacity: 0.6; }
        }
        @keyframes float-slower {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
          50% { transform: translateY(-10px) scale(1.3); opacity: 0.5; }
        }
        .animate-float-slow {
          animation: float-slow 3s ease-in-out infinite;
        }
        .animate-float-slower {
          animation: float-slower 4.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default QuotaAlert;
