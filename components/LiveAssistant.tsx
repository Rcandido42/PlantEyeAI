import React, { useEffect, useRef } from 'react';
import { getAI, keyManager, decodeBase64, decodeAudioData, encode } from '../services/gemini';
import { Modality, LiveServerMessage, Blob } from '@google/genai';
import { AnalysisResult, PlantStatus, LightLevel } from '../types';

interface LiveAssistantProps { isActive: boolean; deviceId?: string; onGeminiError?: (error: unknown) => boolean; onSessionEnd?: (result: AnalysisResult, imageDataUrl: string) => void; }

const LiveAssistant: React.FC<LiveAssistantProps> = ({ isActive, deviceId, onGeminiError, onSessionEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const intervalRef = useRef<any>(null);
  const lastFrameRef = useRef<string | null>(null);
  const reportGeneratedRef = useRef(false);

  const stopAllSources = () => { sourcesRef.current.forEach(s => { try { s.stop(); s.disconnect(); } catch(e) {} }); sourcesRef.current.clear(); nextStartTimeRef.current = 0; };
  const createBlob = (data: Float32Array): Blob => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) { const s = Math.max(-1, Math.min(1, data[i])); int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF; }
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  };

  const generateReport = async (imageDataUrl: string) => {
    if (reportGeneratedRef.current || !imageDataUrl) return;
    reportGeneratedRef.current = true;
    try {
      const base64 = imageDataUrl.split(',')[1];
      const result = await keyManager.withRetry(async (ai) => {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [ { inlineData: { data: base64, mimeType: 'image/jpeg' } }, { text: `Analisa esta imagem de uma planta. Responde APENAS com um JSON válido: {"species": "...", "status": "HEALTHY"|"THIRSTY"|"SICK"|"UNKNOWN", "lightLevel": "...", "summary": "...", "recommendation": "...", "confidence": 0-1}` } ] }]
        });
        const parsed = JSON.parse((response.candidates?.[0]?.content?.parts?.[0]?.text ?? '').replace(/```json|```/g, '').trim());
        return { species: parsed.species ?? 'Desconhecida', status: (parsed.status as PlantStatus) ?? PlantStatus.UNKNOWN, lightLevel: (parsed.lightLevel as LightLevel) ?? LightLevel.UNKNOWN, summary: parsed.summary ?? '', recommendation: parsed.recommendation ?? '', confidence: parsed.confidence ?? 0 } as AnalysisResult;
      });
      onSessionEnd?.(result, imageDataUrl);
    } catch (err) { console.warn('[LiveAssistant] Erro relatório:', err); }
  };

  useEffect(() => {
    let isMounted = true;
    if (!isActive) { stopAllSources(); if (sessionRef.current) sessionRef.current.close(); if (intervalRef.current) clearInterval(intervalRef.current); if (lastFrameRef.current && onSessionEnd) generateReport(lastFrameRef.current); return; }
    reportGeneratedRef.current = false;
    const startSession = async () => {
      stopAllSources();
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' } });
        let audioStream: MediaStream | null = null;
        try { audioStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); } catch (e) {}
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const stream = new MediaStream([...videoStream.getVideoTracks(), ...(audioStream ? audioStream.getAudioTracks() : [])]);
        if (!isMounted) { stream.getTracks().forEach(t => t.stop()); return; }
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
        const connectWithRetry = async (): Promise<any> => {
          let lastError: unknown;
          for (let i = 0; i < keyManager.totalKeys; i++) {
            if (keyManager.allExhausted) break;
            try {
              return await getAI().live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { voiceName: 'Aoede' } }, systemInstruction: `És o PlantEye. Fala pt-PT. Sê conciso.` },
                callbacks: {
                  onmessage: async (msg) => {
                    const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audio && audioContextRef.current) {
                      const buffer = await decodeAudioData(decodeBase64(audio), audioContextRef.current);
                      const source = audioContextRef.current.createBufferSource(); source.buffer = buffer; source.connect(audioContextRef.current.destination);
                      const now = audioContextRef.current.currentTime; nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
                      source.start(nextStartTimeRef.current); nextStartTimeRef.current += buffer.duration;
                      sourcesRef.current.add(source); source.onended = () => sourcesRef.current.delete(source);
                    }
                    if (msg.serverContent?.interrupted) stopAllSources();
                  },
                  onopen: () => {
                    if (inputAudioContextRef.current) {
                      const audioSource = inputAudioContextRef.current.createMediaStreamSource(stream);
                      const proc = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                      proc.onaudioprocess = (e) => { if (sessionRef.current) sessionRef.current.sendRealtimeInput({ media: createBlob(e.inputBuffer.getChannelData(0)) }); };
                      audioSource.connect(proc); proc.connect(inputAudioContextRef.current.destination);
                    }
                    intervalRef.current = setInterval(() => {
                      if (videoRef.current && canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d'); canvasRef.current.width = 320; canvasRef.current.height = 240;
                        ctx?.drawImage(videoRef.current, 0, 0, 320, 240);
                        const b64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                        lastFrameRef.current = canvasRef.current.toDataURL('image/jpeg', 0.8);
                        if (sessionRef.current) sessionRef.current.sendRealtimeInput({ media: { data: b64, mimeType: 'image/jpeg' } });
                      }
                    }, 4000);
                  }
                }
              });
            } catch (err) { lastError = err; if (keyManager.isQuotaError(err)) { if (keyManager.rotateKey()) continue; break; } throw err; }
          }
          throw lastError;
        };
        const session = await connectWithRetry();
        if (!isMounted) { session.close(); return; }
        sessionRef.current = session;
      } catch (err) { onGeminiError?.(err); }
    };
    startSession();
    return () => {
      isMounted = false; stopAllSources(); if (sessionRef.current) sessionRef.current.close(); if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close(); if (inputAudioContextRef.current) inputAudioContextRef.current.close();
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, [isActive, deviceId]);

  return (
    <div className="relative w-full mx-auto rounded-[2rem] overflow-hidden shadow-2xl bg-black border-4 border-[#064E3B]/20" style={{ minHeight: '70vh' }}>
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover absolute inset-0" style={{ minHeight: '70vh' }} />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/50 px-4 py-2 rounded-full border border-white/20 backdrop-blur-md"><div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" /><span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Fluxo Sensorial Activo</span></div>
      <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent"><div className="flex flex-col items-center gap-3"><div className="flex items-center gap-1.5 h-6">{[...Array(6)].map((_, i) => (<div key={i} className="w-1.5 bg-emerald-400 rounded-full animate-wave" style={{ animationDelay: `${i * 0.15}s` }} />))}</div><p className="text-white font-bold text-sm tracking-wide">PlantEye está a ouvir e a observar</p></div></div>
      <style>{`@keyframes wave { 0%, 100% { height: 40%; transform: scaleY(1); } 50% { height: 100%; transform: scaleY(1.2); } } .animate-wave { animation: wave 1.2s ease-in-out infinite; }`}</style>
    </div>
  );
};

export default LiveAssistant;