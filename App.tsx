import React, { useState, useEffect } from 'react';
import { Leaf, Camera, History, Settings, Info, AlertCircle, CheckCircle2, Droplets, Sun, Activity, Zap } from 'lucide-react';
import PlantScanner from './components/PlantScanner';
import LiveAssistant from './components/LiveAssistant';
import AnalysisResultView from './components/AnalysisResultView';
import VoiceFeedback from './components/VoiceFeedback';
import CameraSelector from './components/CameraSelector';
import { AnalysisResult } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'live' | 'history'>('scan');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#064E3B] font-sans pb-24">
      {/* Header */}
      {/* Header com Logótipo Ajustado (Flexbox) */}
      <header className="bg-white border-b border-emerald-100 px-6 py-6 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">

          {/* INÍCIO DO LOGÓTIPO */}
          <div className="flex items-center gap-3">
            {/* 1. A Caixa (PL + Folha + NT) */}
            {/* Usamos flex e gap-0.5 para a folha ficar entre as letras sem atropelar */}
            <div className="border-[3px] border-[#064E3B] px-3 py-1 flex items-center justify-center gap-0.5">
              <span className="text-3xl font-black tracking-tighter text-[#064E3B]">PL</span>

              {/* A folha agora é um elemento estático no fluxo, não absolute */}
              <Leaf className="w-7 h-7 text-[#064E3B] fill-current transform -rotate-12 flex-shrink-0 mt-0.5" />

              <span className="text-3xl font-black tracking-tighter text-[#064E3B]">NT</span>
            </div>

            {/* 2. O Texto EYE (Fora da caixa) */}
            <span className="text-3xl font-black tracking-tighter text-[#064E3B] leading-none">EYE</span>
          </div>
          {/* FIM DO LOGÓTIPO */}

          <div className="flex gap-3">
            <CameraSelector onDeviceSelect={setSelectedDeviceId} />
            <button className="p-2.5 rounded-full bg-emerald-50 text-[#064E3B] hover:bg-emerald-100 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {activeTab === 'scan' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight">Diagnóstico Rápido</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Modo Manual</span>
              </div>
            </div>

            <PlantScanner
              onResult={(result, image) => {
                setAnalysisResult(result);
                setCapturedImage(image);
              }}
              isAnalyzing={isAnalyzing}
              setIsAnalyzing={setIsAnalyzing}
              deviceId={selectedDeviceId}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-emerald-100 shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                  <Info className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-sm mb-1 text-emerald-900">Como funciona?</h3>
                <p className="text-xs text-emerald-700/70 leading-relaxed">
                  Aponte a câmara para a planta e clique no botão central para uma análise instantânea baseada em IA.
                </p>
              </div>
              <div className="bg-[#064E3B] p-6 rounded-[2rem] shadow-lg text-white">
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5 text-emerald-300" />
                </div>
                <h3 className="font-bold text-sm mb-1 text-emerald-50">Dica para um bom diagnóstico</h3>
                <p className="text-xs text-emerald-100/70 leading-relaxed">
                  Para melhores resultados, garanta que as folhas estão bem iluminadas e visíveis na área de foco.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'live' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight text-emerald-950">Monitorização em Directo</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-rose-100 rounded-full">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Tempo Real</span>
              </div>
            </div>
            <LiveAssistant isActive={activeTab === 'live'} deviceId={selectedDeviceId} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-emerald-200">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-emerald-200" />
            </div>
            <p className="text-emerald-300 font-bold uppercase tracking-widest text-xs">Histórico em breve</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-8 left-6 right-6 bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[2.5rem] p-2 z-50 max-w-lg mx-auto">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 flex flex-col items-center py-3 rounded-[2rem] transition-all duration-300 ${activeTab === 'scan' ? 'bg-[#064E3B] text-white shadow-lg scale-105' : 'text-emerald-800/40 hover:text-emerald-600'
              }`}
          >
            <Camera className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-black uppercase tracking-widest">Câmara</span>
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`flex-1 flex flex-col items-center py-3 rounded-[2rem] transition-all duration-300 ${activeTab === 'live' ? 'bg-[#064E3B] text-white shadow-lg scale-105' : 'text-emerald-800/40 hover:text-emerald-600'
              }`}
          >
            <Activity className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-black uppercase tracking-widest">Direto</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex flex-col items-center py-3 rounded-[2rem] transition-all duration-300 ${activeTab === 'history' ? 'bg-[#064E3B] text-white shadow-lg scale-105' : 'text-emerald-800/40 hover:text-emerald-600'
              }`}
          >
            <History className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-black uppercase tracking-widest">Arquivo</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      {analysisResult && capturedImage && (
        <AnalysisResultView
          result={analysisResult}
          image={capturedImage}
          onClose={() => {
            setAnalysisResult(null);
            setCapturedImage(null);
          }}
        />
      )}

      {analysisResult && (
        <VoiceFeedback text={`${analysisResult.species}. Diagnóstico: ${analysisResult.summary}. Recomendação: ${analysisResult.recommendation}`} trigger={analysisResult} />
      )}
    </div>
  );
}

export default App;