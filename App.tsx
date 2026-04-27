/**
 * App.tsx — EucalyptusEye (refactor com suporte offline)
 * ─────────────────────────────────────────────────────────────
 * Alterações face ao original PlantEye:
 *  - Tab 'scan' usa `handleCapture` que guarda no IndexedDB offline
 *  - Banner de estado online/offline + badge de pendentes
 *  - useOfflineSync monitoriza navigator.onLine e dispara sync
 * ─────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback } from 'react';
import {
  Leaf,
  Camera,
  History,
  Settings,
  Info,
  Activity,
  Zap,
  WifiOff,
  Wifi,
  RefreshCw,
  Map,
} from 'lucide-react';

import PlantScanner from './components/PlantScanner';
import LiveAssistant from './components/LiveAssistant';
import AnalysisResultView from './components/AnalysisResultView';
import VoiceFeedback from './components/VoiceFeedback';
import CameraSelector from './components/CameraSelector';
import HistoryView from './components/HistoryView';
// Novo componente (Fase 2)
// import MapView from './components/MapView';

import { useHistory } from './hooks/useHistory';
import { useOfflineSync } from './hooks/useOfflineSync';

import {
  saveDiagnosticoPendente,
  getCurrentPosition,
  generateLocalId,
} from './services/offlineDB';
import { supabase } from './services/syncService';

import { AnalysisResult } from './types';

// ── Tipos ──────────────────────────────────────────────────────

type ActiveTab = 'scan' | 'live' | 'history' | 'map';

// ── Componente ─────────────────────────────────────────────────

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('scan');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const { history, addHistoryItem, clearHistory, deleteHistoryItem } = useHistory();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  // Sessão Supabase (pode ser null se não autenticado)
  const userId = supabase.auth.getUser().then((r) => r.data.user?.id ?? 'anonimo');

  /**
   * handleCapture — chamado pelo PlantScanner quando o técnico tira foto.
   * Se offline → guarda no IndexedDB.
   * Se online → segue fluxo normal (AnalysisResult) e agenda sync.
   */
  const handleCapture = useCallback(
    async (result: AnalysisResult, imageDataUrl: string) => {
      setAnalysisResult(result);
      setCapturedImage(imageDataUrl);
      addHistoryItem(result, imageDataUrl);

      // Converte data URL → Blob para guardar no IndexedDB
      try {
        const res = await fetch(imageDataUrl);
        const blob = await res.blob();
        const coords = await getCurrentPosition();
        const uid = await userId;

        await saveDiagnosticoPendente({
          id: generateLocalId(),
          imageBlob: blob,
          coords,
          timestamp: new Date().toISOString(),
          userId: uid,
        });
      } catch (err) {
        // Falha silenciosa — o resultado de IA já foi mostrado ao utilizador
        console.warn('[Offline] Não foi possível guardar no IndexedDB:', err);
      }
    },
    [addHistoryItem, userId]
  );

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#064E3B] font-sans pb-24">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="bg-white border-b border-emerald-100 px-6 py-6 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Logótipo */}
          <div className="flex items-center gap-3">
            <div className="border-[3px] border-[#064E3B] px-3 py-1 flex items-center justify-center gap-0.5">
              <span className="text-3xl font-black tracking-tighter text-[#064E3B]">EU</span>
              <Leaf className="w-7 h-7 text-[#064E3B] fill-current transform -rotate-12 flex-shrink-0 mt-0.5" />
              <span className="text-3xl font-black tracking-tighter text-[#064E3B]">CA</span>
            </div>
            <span className="text-3xl font-black tracking-tighter text-[#064E3B] leading-none">
              EYE
            </span>
          </div>

          {/* Estado de rede + acções */}
          <div className="flex items-center gap-3">
            {/* Badge de pendentes */}
            {pendingCount > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 rounded-full">
                {isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                ) : (
                  <span className="text-[10px] font-black text-amber-700">{pendingCount}⬆</span>
                )}
              </div>
            )}

            {/* Indicador online/offline */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
            >
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}
              {isOnline ? 'Online' : 'Offline'}
            </div>

            <CameraSelector onDeviceSelect={setSelectedDeviceId} />
            <button className="p-2.5 rounded-full bg-emerald-50 text-[#064E3B] hover:bg-emerald-100 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Banner offline ──────────────────────────────── */}
      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-center">
          <p className="text-xs text-amber-800 font-medium">
            📡 Sem rede — as capturas serão guardadas localmente e sincronizadas quando a
            ligação regressar.
          </p>
        </div>
      )}

      {/* ── Conteúdo principal ──────────────────────────── */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Tab: Diagnóstico */}
        {activeTab === 'scan' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight">Diagnóstico de Campo</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                  Eucalyptus
                </span>
              </div>
            </div>

            <PlantScanner
              onResult={handleCapture}
              isAnalyzing={isAnalyzing}
              setIsAnalyzing={setIsAnalyzing}
              deviceId={selectedDeviceId}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-emerald-100 shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                  <Info className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-sm mb-1 text-emerald-900">Modo Offline</h3>
                <p className="text-xs text-emerald-700/70 leading-relaxed">
                  Funciona sem rede. As capturas ficam guardadas e sobem automaticamente
                  quando houver ligação.
                </p>
              </div>

              <div className="bg-[#064E3B] p-6 rounded-[2rem] shadow-lg text-white">
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5 text-emerald-300" />
                </div>
                <h3 className="font-bold text-sm mb-1 text-emerald-50">GPS Automático</h3>
                <p className="text-xs text-emerald-100/70 leading-relaxed">
                  As coordenadas são registadas com cada captura para mapear as ocorrências
                  no terreno.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Direto */}
        {activeTab === 'live' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight text-emerald-950">
                Monitorização em Directo
              </h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-rose-100 rounded-full">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">
                  Tempo Real
                </span>
              </div>
            </div>
            <LiveAssistant isActive={activeTab === 'live'} deviceId={selectedDeviceId} />
          </div>
        )}

        {/* Tab: Arquivo */}
        {activeTab === 'history' && (
          <HistoryView
            history={history}
            onClearHistory={clearHistory}
            onDeleteItem={deleteHistoryItem}
          />
        )}

        {/* Tab: Mapa (Fase 2) */}
        {activeTab === 'map' && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-emerald-400">
            <Map className="w-12 h-12" />
            <p className="text-sm font-medium">Mapa de Ocorrências — em breve</p>
          </div>
        )}
      </main>

      {/* ── Bottom Navigation ───────────────────────────── */}
      <nav className="fixed bottom-8 left-6 right-6 bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[2.5rem] p-2 z-50 max-w-lg mx-auto">
        <div className="flex justify-between items-center">
          {(
            [
              { key: 'scan', Icon: Camera, label: 'Câmara' },
              { key: 'live', Icon: Activity, label: 'Direto' },
              { key: 'history', Icon: History, label: 'Arquivo' },
              { key: 'map', Icon: Map, label: 'Mapa' },
            ] as const
          ).map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex flex-col items-center py-3 rounded-[2rem] transition-all duration-300 ${
                activeTab === key
                  ? 'bg-[#064E3B] text-white shadow-lg scale-105'
                  : 'text-emerald-800/40 hover:text-emerald-600'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── Modais ──────────────────────────────────────── */}
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
        <VoiceFeedback
          text={`${analysisResult.species}. Diagnóstico: ${analysisResult.summary}. Recomendação: ${analysisResult.recommendation}`}
          trigger={analysisResult}
        />
      )}
    </div>
  );
}

export default App;
