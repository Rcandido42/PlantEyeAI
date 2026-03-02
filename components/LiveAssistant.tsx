import React, { useEffect, useRef } from 'react';
import { ai, decodeBase64, decodeAudioData, encode } from '../services/gemini';
import { Modality, LiveServerMessage, Blob } from '@google/genai';

interface LiveAssistantProps {
  isActive: boolean;
  deviceId?: string;
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ isActive, deviceId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const intervalRef = useRef<any>(null);

  const stopAllSources = () => {
    sourcesRef.current.forEach(s => {
      try { 
        s.stop(); 
        s.disconnect();
      } catch(e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const createBlob = (data: Float32Array): Blob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      const s = Math.max(-1, Math.min(1, data[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  useEffect(() => {
    // 🛡️ A NOSSA PROTEÇÃO CONTRA LIGAÇÕES DUPLICADAS
    let isMounted = true; 

    if (!isActive) {
      stopAllSources();
      if (sessionRef.current) sessionRef.current.close();
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const startSession = async () => {
      stopAllSources();

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      const constraints: MediaStreamConstraints = { 
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Se o componente foi reiniciado enquanto a câmara abria, cancela imediatamente!
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        if (videoRef.current) videoRef.current.srcObject = stream;

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
            },
            systemInstruction: "Tu és o PlantEye, um assistente especializado para pessoas com deficiência visual. Ajuda-as a cuidar das suas plantas analisando o vídeo e o áudio. Sê descritivo mas extremamente conciso. Fala português de Portugal (pt-PT) e dá orientações práticas sobre rega, luz e saúde vegetal.",
          },
          callbacks: {
            onmessage: async (message: LiveServerMessage) => {
              const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (audioData && audioContextRef.current) {
                const buffer = await decodeAudioData(decodeBase64(audioData), audioContextRef.current);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContextRef.current.destination);
                
                const now = audioContextRef.current.currentTime;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
              }

              if (message.serverContent?.interrupted) {
                stopAllSources();
              }
            },
            onopen: () => {
              if (inputAudioContextRef.current) {
                const source = inputAudioContextRef.current.createMediaStreamSource(stream);
                const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                
                const muteNode = inputAudioContextRef.current.createGain();
                muteNode.gain.value = 0;

                scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                  const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                  const pcmBlob = createBlob(inputData);
                  sessionPromise.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                  });
                };

                source.connect(scriptProcessor);
                scriptProcessor.connect(muteNode);
                muteNode.connect(inputAudioContextRef.current.destination);
              }

              intervalRef.current = setInterval(() => {
                if (videoRef.current && canvasRef.current) {
                  const ctx = canvasRef.current.getContext('2d');
                  canvasRef.current.width = 320;
                  canvasRef.current.height = 240;
                  ctx?.drawImage(videoRef.current, 0, 0, 320, 240);
                  const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                  sessionPromise.then(s => s.sendRealtimeInput({
                    media: { data: base64, mimeType: 'image/jpeg' }
                  }));
                }
              }, 4000);
            }
          }
        });

        const session = await sessionPromise;
        
        // Se a ligação fantasma acabou de concluir a conexão à Google, nós fechamo-la de imediato!
        if (!isMounted) {
          session.close();
          return;
        }

        sessionRef.current = session;
      } catch (err) {
        console.error("Erro ao iniciar sessão Live:", err);
      }
    };

    startSession();

    return () => {
      // Quando o React tenta fechar o componente, sinalizamos que ele "morreu"
      isMounted = false; 
      
      stopAllSources();
      if (sessionRef.current) sessionRef.current.close();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (inputAudioContextRef.current) inputAudioContextRef.current.close();
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [isActive, deviceId]);

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-[3rem] overflow-hidden shadow-2xl bg-black border-4 border-[#064E3B]/20">
      <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/50 px-4 py-2 rounded-full border border-white/20 backdrop-blur-md">
        <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
        <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Fluxo Sensorial Activo</span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5 h-6">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 bg-emerald-400 rounded-full animate-wave" 
                style={{ 
                  animationDelay: `${i * 0.15}s`
                }} 
              />
            ))}
          </div>
          <p className="text-white font-bold text-sm tracking-wide">
            PlantEye está a ouvir e a observar
          </p>
        </div>
      </div>
      <style>{`
        @keyframes wave {
          0%, 100% { height: 40%; transform: scaleY(1); }
          50% { height: 100%; transform: scaleY(1.2); }
        }
        .animate-wave {
          animation: wave 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LiveAssistant;