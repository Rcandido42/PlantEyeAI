import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Loader2, AlertTriangle, Navigation } from 'lucide-react';
import { analyzePlantImage } from '../services/gemini';
import { AnalysisResult, PlantStatus, LightLevel, GpsCoords } from '../types';

interface PlantScannerProps { onResult: (result: AnalysisResult, image: string, coords: GpsCoords | null) => void; isAnalyzing: boolean; setIsAnalyzing: (val: boolean) => void; deviceId?: string; onGeminiError?: (error: unknown) => boolean; }
type GpsState = 'acquiring' | 'ready' | 'denied' | 'unavailable';

const PlantScanner: React.FC<PlantScannerProps> = ({ onResult, isAnalyzing, setIsAnalyzing, deviceId, onGeminiError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [gpsState, setGpsState] = useState<GpsState>('acquiring');
  const [coords, setCoords] = useState<GpsCoords | null>(null);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' } });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch { setError('Não foi possível aceder à câmara selecionada.'); }
    };
    startCamera();
    return () => { if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); };
  }, [deviceId]);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsState('unavailable'); return; }
    setGpsState('acquiring');
    const watchId = navigator.geolocation.watchPosition(
      (pos) => { setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }); setGpsState('ready'); },
      (err) => { if (err.code === GeolocationPositionError.PERMISSION_DENIED) setGpsState('denied'); else setGpsState('unavailable'); setCoords(null); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    setIsAnalyzing(true); setError(null); setOfflineSaved(false);
    const video = videoRef.current; const canvas = canvasRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64 = dataUrl.split(',')[1];
      if (!navigator.onLine) {
        const offlineResult: AnalysisResult = { species: 'Diagnóstico Pendente', status: PlantStatus.UNKNOWN, healthStatus: 'Desconhecido' as AnalysisResult['healthStatus'], threatDetected: 'nenhuma', severityLevel: 0, forestryRisk: 'Baixo', recommendations: ['Imagem guardada localmente.'], recommendation: '', raizReference: '', summary: 'Captura offline. GPS registado.', lightLevel: LightLevel.UNKNOWN, confidence: 0, isInvasive: false, invasiveSpecies: null, isPending: true, imageBase64: base64 };
        onResult(offlineResult, dataUrl, coords);
        setLastResult(offlineResult);
        setOfflineSaved(true); setTimeout(() => setOfflineSaved(false), 4000); setIsAnalyzing(false); return;
      }
      try { const result = await analyzePlantImage(base64); onResult(result, dataUrl, coords); setLastResult(result); } catch (err) { if (!onGeminiError?.(err)) setError('Falha ao analisar a imagem.'); } finally { setIsAnalyzing(false); }
    }
  }, [isAnalyzing, onResult, setIsAnalyzing, onGeminiError, gpsState, coords]);

  const GpsIndicator = () => {
    if (gpsState === 'ready') return <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 backdrop-blur-sm rounded-full border border-emerald-400/30"><Navigation className="w-3.5 h-3.5 text-emerald-300" /><span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">GPS ±{Math.round(coords?.accuracy ?? 0)}m</span></div>;
    if (gpsState === 'acquiring') return <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 backdrop-blur-sm rounded-full border border-amber-400/30"><Loader2 className="w-3.5 h-3.5 text-amber-300 animate-spin" /><span className="text-[10px] font-black text-amber-300 uppercase tracking-widest">A obter GPS…</span></div>;
    return <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 backdrop-blur-sm rounded-full border border-red-400/30"><AlertTriangle className="w-3.5 h-3.5 text-red-300" /><span className="text-[10px] font-black text-red-300 uppercase tracking-widest">{gpsState === 'denied' ? 'GPS Bloqueado' : 'GPS Indisponível'}</span></div>;
  };

  const ResultBadge = () => {
    if (!lastResult) return null;
    if (lastResult.isInvasive) return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-600/90 backdrop-blur-sm rounded-2xl border border-red-400/40 shadow-xl animate-pulse">
        <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />
        <div><p className="text-[9px] font-black text-red-200 uppercase tracking-widest">⚠ Invasora Detetada</p><p className="text-xs font-black text-white italic">{lastResult.invasiveSpecies || lastResult.species}</p></div>
      </div>
    );
    const healthColors: Record<string, string> = { 'Saudável': 'bg-emerald-600/90 border-emerald-400/40', 'Em Stress': 'bg-amber-600/90 border-amber-400/40', 'Doente': 'bg-orange-600/90 border-orange-400/40', 'Crítico': 'bg-red-600/90 border-red-400/40' };
    const cls = healthColors[lastResult.healthStatus ?? ''] || 'bg-gray-600/90 border-gray-400/40';
    return (
      <div className={`flex items-center gap-2 px-4 py-2 ${cls} backdrop-blur-sm rounded-2xl border shadow-xl`}>
        <div><p className="text-[9px] font-black text-white/70 uppercase tracking-widest">Saúde da Planta</p><p className="text-xs font-black text-white">{lastResult.healthStatus || 'Desconhecida'} · <span className="italic">{lastResult.species}</span></p></div>
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto overflow-hidden rounded-[2rem] bg-black aspect-square shadow-2xl ring-4 ring-green-600/10">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" aria-label="Feed da Câmara" />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute inset-0 border-4 border-dashed border-white/20 pointer-events-none rounded-[2rem] m-6" />
      <div className="absolute top-5 left-0 right-0 flex justify-center"><GpsIndicator /></div>
      {(gpsState === 'denied' || gpsState === 'unavailable') && (
        <div className="absolute top-14 left-0 right-0 flex justify-center z-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/80 backdrop-blur-sm rounded-full border border-orange-400/40 shadow">
            <AlertTriangle className="w-3 h-3 text-white" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{gpsState === 'denied' ? 'GPS Bloqueado — Sem Coordenadas' : 'GPS Indisponível'}</span>
          </div>
        </div>
      )}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center px-6 gap-4">
        {offlineSaved && <div className="bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2"><span>📥</span><span>Guardado offline</span></div>}
        {error && <div className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold animate-bounce shadow-xl">{error}</div>}
        <ResultBadge />
        <button onClick={captureAndAnalyze} disabled={isAnalyzing} className={`w-20 h-20 rounded-full border-[6px] border-white flex items-center justify-center transition-all transform active:scale-95 shadow-2xl ${!isAnalyzing ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 border-gray-400 cursor-not-allowed'}`}>
          {isAnalyzing ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" /> : <div className="w-5 h-5 bg-white rounded-full shadow-inner" />}
        </button>
        <p className="text-white text-sm font-black tracking-widest uppercase drop-shadow-md bg-black/30 px-4 py-1 rounded-full backdrop-blur-sm">{isAnalyzing ? 'A analisar...' : gpsState === 'acquiring' ? 'A obter GPS…' : 'Clique para Diagnosticar'}</p>
      </div>
    </div>
  );
};

export default PlantScanner;