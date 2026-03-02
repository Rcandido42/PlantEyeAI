import React from 'react';
import { X, Leaf, Droplets, Sun, AlertTriangle, CheckCircle2, Info, Zap } from 'lucide-react';
import { AnalysisResult } from '../types';

interface AnalysisResultViewProps {
  result: AnalysisResult;
  image: string;
  onClose: () => void;
}

const AnalysisResultView: React.FC<AnalysisResultViewProps> = ({ result, image, onClose }) => {
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'HEALTHY': return 'text-emerald-700 bg-emerald-100 border-emerald-200';
      case 'THIRSTY': return 'text-amber-700 bg-amber-100 border-amber-200';
      case 'SICK': return 'text-rose-700 bg-rose-100 border-rose-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'HEALTHY': return <CheckCircle2 className="w-6 h-6" />;
      case 'THIRSTY': return <Droplets className="w-6 h-6" />;
      case 'SICK': return <AlertTriangle className="w-6 h-6" />;
      default: return <Info className="w-6 h-6" />;
    }
  };

  const getLightColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'HIGH': return 'text-amber-700 bg-amber-100 border-amber-200';
      case 'ADEQUATE': return 'text-emerald-700 bg-emerald-100 border-emerald-200';
      case 'LOW': return 'text-indigo-700 bg-indigo-100 border-indigo-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const translateStatus = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'HEALTHY': return 'Saudável';
      case 'THIRSTY': return 'Precisa de Água';
      case 'SICK': return 'Doente';
      default: return 'Desconhecido';
    }
  };

  const translateLight = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'HIGH': return 'Alta';
      case 'ADEQUATE': return 'Adequada';
      case 'LOW': return 'Baixa';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 duration-300">

        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-50 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <Leaf className="w-4 h-4 text-[#064E3B]" />
            </div>
            <h3 className="font-black text-[#064E3B] tracking-tight uppercase text-sm">Diagnóstico IA</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-emerald-50 rounded-full text-emerald-800 hover:bg-emerald-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          <div className="w-full aspect-video rounded-[2rem] overflow-hidden border-4 border-emerald-50 shadow-inner relative">
            <img src={image} alt="Planta analisada" className="w-full h-full object-cover" />
            <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest">
              Analisado por PlantEye
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-black text-[#064E3B] tracking-tighter leading-tight">{result.species}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`flex flex-col items-center justify-center p-4 rounded-[1.5rem] border ${getStatusColor(result.status)}`}>
              {getStatusIcon(result.status)}
              <span className="mt-2 text-[10px] font-black uppercase tracking-widest opacity-70">Saúde</span>
              <span className="font-bold tracking-tight">{translateStatus(result.status)}</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-4 rounded-[1.5rem] border ${getLightColor(result.lightLevel)}`}>
              <Sun className="w-6 h-6" />
              <span className="mt-2 text-[10px] font-black uppercase tracking-widest opacity-70">Luz</span>
              <span className="font-bold tracking-tight">{translateLight(result.lightLevel)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-emerald-50/50 p-5 rounded-[1.5rem] border border-emerald-100">
              <h4 className="flex items-center gap-2 font-bold text-emerald-900 mb-2">
                <Info className="w-4 h-4 text-emerald-500" />
                Resumo do Estado
              </h4>
              <p className="text-sm text-emerald-800 leading-relaxed font-medium">{result.summary}</p>
            </div>

            <div className="bg-[#064E3B] p-5 rounded-[1.5rem] text-white shadow-lg">
              <h4 className="flex items-center gap-2 font-bold text-emerald-50 mb-2">
                <Zap className="w-4 h-4 text-emerald-300" />
                O que fazer agora?
              </h4>
              <p className="text-sm text-emerald-100/90 leading-relaxed">{result.recommendation}</p>
            </div>
          </div>
        </div>

        <div className="p-6 pt-2 bg-white border-t border-emerald-50">
          <button onClick={onClose} className="w-full py-4 bg-[#064E3B] hover:bg-[#064E3B]/90 text-white rounded-[1.5rem] font-bold tracking-wide transition-all shadow-xl active:scale-95">
            Fechar e Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResultView;
