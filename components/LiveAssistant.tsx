import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getAI, keyManager, decodeBase64, decodeAudioData, encode } from '../services/gemini';
import { Modality, Blob } from '@google/genai';
import { AnalysisResult, PlantStatus, LightLevel } from '../types';
import { RefreshCw, WifiOff, Zap } from 'lucide-react';

interface LiveAssistantProps { isActive: boolean; deviceId?: string; onGeminiError?: (error: unknown) => boolean; onSessionEnd?: (result: AnalysisResult, imageDataUrl: string) => void; }
type ConnState = 'idle' | 'connecting' | 'active' | 'error' | 'closed';

const LiveAssistant: React.FC<LiveAssistantProps> = ({ isActive, deviceId, onGeminiError, onSessionEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartRef = useRef(0);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const intervalRef = useRef<any>(null);
  const lastFrameRef = useRef<string | null>(null);
  const reportDoneRef = useRef(false);
  const retryTimerRef = useRef<any>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const [connState, setConnState] = useState<ConnState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopAllSources = () => {
    sourcesRef.current.forEach(s => { try { s.stop(); s.disconnect(); } catch {}});
    sourcesRef.current.clear();
    nextStartRef.current = 0;
  };

  const closeSession = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    stopAllSources();
    if (sessionRef.current) { try { sessionRef.current.close(); } catch {} sessionRef.current = null; }
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
    if (inputAudioCtxRef.current) { try { inputAudioCtxRef.current.close(); } catch {} inputAudioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }, []);

  const createBlob = (data: Float32Array): Blob => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) { const s = Math.max(-1, Math.min(1, data[i])); int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF; }
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  };

  const generateReport = async (imageDataUrl: string) => {
    if (reportDoneRef.current || !imageDataUrl) return;
    reportDoneRef.current = true;
    try {
      const base64 = imageDataUrl.split(',')[1];
      const result = await keyManager.withRetry(async (ai) => {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ inlineData: { data: base64, mimeType: 'image/jpeg' } }, { text: `Analisa esta imagem de uma planta. Responde APENAS com um JSON válido: {"species": "...", "status": "HEALTHY"|"THIRSTY"|"SICK"|"UNKNOWN", "lightLevel": "...", "healthStatus": "Saudável"|"Em Stress"|"Doente"|"Crítico", "summary": "...", "recommendation": "...", "isInvasive": false, "invasiveSpecies": null, "threatDetected": "nenhuma", "severityLevel": 0, "forestryRisk": "Baixo", "recommendations": [], "raizReference": "PlantEye Live", "confidence": 0}` }] }]
        });
        const parsed = JSON.parse((response.candidates?.[0]?.content?.parts?.[0]?.text ?? '').replace(/```json|```/g, '').trim());
        return {
          species: parsed.species ?? 'Desconhecida', status: (parsed.status as PlantStatus) ?? PlantStatus.UNKNOWN,
          lightLevel: (parsed.lightLevel as LightLevel) ?? LightLevel.UNKNOWN, healthStatus: parsed.healthStatus ?? 'Desconhecida',
          summary: parsed.summary ?? '', recommendation: parsed.recommendation ?? '', confidence: parsed.confidence ?? 0,
          isInvasive: parsed.isInvasive ?? false, invasiveSpecies: parsed.invasiveSpecies ?? null,
          threatDetected: parsed.threatDetected ?? 'nenhuma', severityLevel: parsed.severityLevel ?? 0,
          forestryRisk: parsed.forestryRisk ?? 'Baixo', recommendations: parsed.recommendations ?? [parsed.recommendation ?? ''],
          raizReference: parsed.raizReference ?? 'PlantEye Live'
        } as AnalysisResult;
      });
      onSessionEnd?.(result, imageDataUrl);
    } catch (err) {}
  };

  const startSession = useCallback(async () => {
    if (!isMountedRef.current) return;
    setConnState('connecting'); setErrorMsg(null);
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' } });
      let audioStream: MediaStream | null = null;
      try { audioStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); } catch {}
      const combined = new MediaStream([...videoStream.getVideoTracks(), ...(audioStream ? audioStream.getAudioTracks() : [])]);
      streamRef.current = combined;
      if (!isMountedRef.current) { combined.getTracks().forEach(t => t.stop()); return; }
      if (videoRef.current) { videoRef.current.srcObject = combined; videoRef.current.play().catch(() => {}); }

      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume().catch(() => {});
      if (inputAudioCtxRef.current.state === 'suspended') await inputAudioCtxRef.current.resume().catch(() => {});

      const session = await getAI().live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
          systemInstruction: `És o PlantEye, assistente de diagnóstico fitossanitário de eucaliptos. Fala sempre em português de Portugal (pt-PT). Analisa o que vês na câmara e reporta em tempo real: espécie, saúde, ameaças detetadas. Sê conciso e técnico.`
        },
        callbacks: {
          onmessage: async (msg: any) => {
            const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && audioCtxRef.current) {
              try {
                const buffer = await decodeAudioData(decodeBase64(audio), audioCtxRef.current);
                const source = audioCtxRef.current.createBufferSource();
                source.buffer = buffer; source.connect(audioCtxRef.current.destination);
                const now = audioCtxRef.current.currentTime;
                nextStartRef.current = Math.max(nextStartRef.current, now);
                source.start(nextStartRef.current); nextStartRef.current += buffer.duration;
                sourcesRef.current.add(source); source.onended = () => sourcesRef.current.delete(source);
              } catch {}
            }
            if (msg.serverContent?.interrupted) stopAllSources();
          },
          onopen: () => {
            if (!isMountedRef.current) return;
            retryCountRef.current = 0;
            setConnState('active');
            if (inputAudioCtxRef.current && audioStream) {
              try {
                const src = inputAudioCtxRef.current.createMediaStreamSource(combined);
                const proc = inputAudioCtxRef.current.createScriptProcessor(4096, 1, 1);
                proc.onaudioprocess = (e) => { if (sessionRef.current) sessionRef.current.sendRealtimeInput({ media: createBlob(e.inputBuffer.getChannelData(0)) }); };
                src.connect(proc); proc.connect(inputAudioCtxRef.current.destination);
              } catch {}
            }
            intervalRef.current = setInterval(() => {
              if (videoRef.current && canvasRef.current && sessionRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                canvasRef.current.width = 320; canvasRef.current.height = 240;
                ctx?.drawImage(videoRef.current, 0, 0, 320, 240);
                const b64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                lastFrameRef.current = canvasRef.current.toDataURL('image/jpeg', 0.8);
                try { sessionRef.current.sendRealtimeInput({ media: { data: b64, mimeType: 'image/jpeg' } }); } catch {}
              }
            }, 4000);
          },
          onerror: (err: any) => {
            if (!isMountedRef.current) return;
            setConnState('error'); setErrorMsg('Erro de ligação. A tentar reconectar…');
            scheduleReconnect();
          },
          onclose: () => {
            if (!isMountedRef.current) return;
            if (lastFrameRef.current) generateReport(lastFrameRef.current);
            if (retryCountRef.current < 3) { setConnState('error'); setErrorMsg('Sessão terminada. A reconectar…'); scheduleReconnect(); }
            else { setConnState('closed'); setErrorMsg('Sessão encerrada. Clique para reiniciar.'); }
          }
        }
      });
      if (!isMountedRef.current) { session.close(); return; }
      sessionRef.current = session;
    } catch (err) {
      if (!isMountedRef.current) return;
      const handled = onGeminiError?.(err);
      if (!handled) { setConnState('error'); setErrorMsg('Não foi possível iniciar a sessão.'); }
      if (retryCountRef.current < 2) scheduleReconnect();
      else setConnState('closed');
    }
  }, [deviceId, onGeminiError, onSessionEnd]);

  const scheduleReconnect = useCallback(() => {
    retryCountRef.current += 1;
    const delay = Math.min(2000 * retryCountRef.current, 10000);
    retryTimerRef.current = setTimeout(() => { if (isMountedRef.current) startSession(); }, delay);
  }, [startSession]);

  const handleManualRestart = useCallback(() => {
    retryCountRef.current = 0; reportDoneRef.current = false;
    closeSession(); startSession();
  }, [closeSession, startSession]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!isActive) {
      if (lastFrameRef.current && !reportDoneRef.current) generateReport(lastFrameRef.current);
      closeSession(); setConnState('idle');
      return;
    }
    reportDoneRef.current = false; retryCountRef.current = 0;
    startSession();
    return () => { isMountedRef.current = false; closeSession(); };
  }, [isActive, deviceId]);

  const stateLabel: Record<ConnState, string> = { idle: 'Inativo', connecting: 'A ligar…', active: 'Fluxo Sensorial Activo', error: errorMsg ?? 'Erro', closed: errorMsg ?? 'Sessão encerrada' };
  const stateDot: Record<ConnState, string> = { idle: 'bg-gray-400', connecting: 'bg-amber-400 animate-pulse', active: 'bg-rose-500 animate-pulse', error: 'bg-red-500', closed: 'bg-gray-500' };

  return (
    <div className="relative w-full mx-auto rounded-[2rem] overflow-hidden shadow-2xl bg-black border-4 border-[#064E3B]/20" style={{ minHeight: 'min(70vh, 500px)', aspectRatio: '4/3' }}>
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover absolute inset-0" />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-md">
          <div className={`w-2.5 h-2.5 rounded-full ${stateDot[connState]}`} />
          <span className="text-white text-[10px] font-black uppercase tracking-[0.15em] truncate max-w-[180px]">{stateLabel[connState]}</span>
        </div>
        {(connState === 'error' || connState === 'closed' || connState === 'connecting') && (
          <button onClick={handleManualRestart} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full border border-white/30 backdrop-blur-md transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 text-white ${connState === 'connecting' ? 'animate-spin' : ''}`} />
            <span className="text-white text-[10px] font-black uppercase tracking-wider">Reiniciar</span>
          </button>
        )}
      </div>
      {(connState === 'error' || connState === 'closed') && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 px-8">
          <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center border border-red-400/30">
            <WifiOff className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-white font-bold text-center text-sm">{errorMsg}</p>
          <button onClick={handleManualRestart} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl transition-colors shadow-xl">
            Reiniciar Sessão
          </button>
        </div>
      )}
      {connState === 'connecting' && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-white font-bold text-sm">A estabelecer ligação…</p>
        </div>
      )}
      {connState === 'active' && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 h-6">
              {[...Array(6)].map((_, i) => <div key={i} className="w-1.5 bg-emerald-400 rounded-full animate-wave" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-emerald-300" />
              <p className="text-white font-bold text-xs tracking-wide">PlantEye está a ouvir e a observar</p>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes wave { 0%, 100% { height: 40%; } 50% { height: 100%; } } .animate-wave { animation: wave 1.2s ease-in-out infinite; }`}</style>
    </div>
  );
};

export default LiveAssistant;