import React, { useEffect, useRef } from 'react';
import { generateSpeech, decodeBase64, decodeAudioData } from '../services/gemini';

interface VoiceFeedbackProps { text: string; trigger: any; }

const VoiceFeedback: React.FC<VoiceFeedbackProps> = ({ text, trigger }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeRequestIdRef = useRef(0);

  const stop = () => { if (currentSourceRef.current) { try { currentSourceRef.current.stop(); currentSourceRef.current.disconnect(); } catch (e) {} currentSourceRef.current = null; } };

  useEffect(() => {
    if (!text || !trigger) return;
    const id = ++activeRequestIdRef.current;
    const speak = async () => {
      stop();
      try {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
        const b64 = await generateSpeech(text);
        if (id !== activeRequestIdRef.current) return;
        const buf = await decodeAudioData(decodeBase64(b64), audioContextRef.current);
        if (id !== activeRequestIdRef.current) return;
        const src = audioContextRef.current.createBufferSource();
        src.buffer = buf; src.connect(audioContextRef.current.destination);
        currentSourceRef.current = src; src.start(0);
        src.onended = () => { if (currentSourceRef.current === src) currentSourceRef.current = null; };
      } catch (e) {}
    };
    speak();
    return () => { activeRequestIdRef.current++; stop(); };
  }, [trigger, text]);

  return null;
};

export default VoiceFeedback;
