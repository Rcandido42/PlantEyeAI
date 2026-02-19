
import React, { useEffect, useRef } from 'react';
import { generateSpeech, decodeBase64, decodeAudioData } from '../services/gemini';

interface VoiceFeedbackProps {
  text: string;
  trigger: any;
}

const VoiceFeedback: React.FC<VoiceFeedbackProps> = ({ text, trigger }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeRequestIdRef = useRef(0);

  const stopCurrentAudio = () => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
        currentSourceRef.current.disconnect();
      } catch (e) {}
      currentSourceRef.current = null;
    }
  };

  useEffect(() => {
    if (!text || !trigger) return;

    const requestId = ++activeRequestIdRef.current;

    const speak = async () => {
      // Interrompe imediatamente qualquer áudio em curso
      stopCurrentAudio();

      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        // Primeiro check pós-chamada API (que é lenta)
        const base64Audio = await generateSpeech(text);
        if (requestId !== activeRequestIdRef.current) return;

        // Segundo check pós-decodificação
        const bytes = decodeBase64(base64Audio);
        const buffer = await decodeAudioData(bytes, audioContextRef.current);
        if (requestId !== activeRequestIdRef.current) return;
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        
        currentSourceRef.current = source;
        source.start(0);

        source.onended = () => {
          if (currentSourceRef.current === source) {
            currentSourceRef.current = null;
          }
        };
      } catch (err) {
        console.error("Speech failure:", err);
      }
    };

    speak();

    return () => {
      activeRequestIdRef.current++;
      stopCurrentAudio();
    };
  }, [trigger, text]);

  return null;
};

export default VoiceFeedback;
