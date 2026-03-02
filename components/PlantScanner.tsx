import React, { useRef, useState, useCallback, useEffect } from 'react';
import { analyzePlantImage } from '../services/gemini';
import { AnalysisResult, PlantStatus } from '../types';

interface PlantScannerProps {
  onResult: (result: AnalysisResult, image: string) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (val: boolean) => void;
  deviceId?: string;
}

const PlantScanner: React.FC<PlantScannerProps> = ({ onResult, isAnalyzing, setIsAnalyzing, deviceId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        if (videoRef.current?.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }

        const constraints: MediaStreamConstraints = { 
          video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' } 
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("Não foi possível aceder à câmara selecionada.");
      }
    };
    
    startCamera();
    
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [deviceId]);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64 = dataUrl.split(',')[1];

      try {
        const result = await analyzePlantImage(base64);
        onResult(result, dataUrl);
      } catch (err) {
        setError("Falha ao analisar a imagem. Tente novamente.");
      } finally {
        setIsAnalyzing(false);
      }
    }
  }, [isAnalyzing, onResult, setIsAnalyzing]);

  return (
    <div className="relative w-full max-w-2xl mx-auto overflow-hidden rounded-[2rem] bg-black aspect-square shadow-2xl ring-4 ring-green-600/10">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="w-full h-full object-cover"
        aria-label="Feed da Câmara"
      />
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute inset-0 border-4 border-dashed border-white/20 pointer-events-none rounded-[2rem] m-6" />

      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center px-6 gap-4">
        {error && (
          <div className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold animate-bounce shadow-xl">
            {error}
          </div>
        )}
        
        <button
          onClick={captureAndAnalyze}
          disabled={isAnalyzing}
          className={`
            w-20 h-20 rounded-full border-[6px] border-white flex items-center justify-center
            transition-all transform active:scale-95 shadow-2xl
            ${isAnalyzing ? 'bg-gray-400 border-gray-300' : 'bg-green-500 hover:bg-green-600'}
          `}
          aria-label={isAnalyzing ? "A analisar..." : "Analisar Saúde"}
        >
          {isAnalyzing ? (
             <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="w-5 h-5 bg-white rounded-full shadow-inner" />
          )}
        </button>
        <p className="text-white text-sm font-black tracking-widest uppercase drop-shadow-md bg-black/30 px-4 py-1 rounded-full backdrop-blur-sm">
          {isAnalyzing ? "A analisar..." : "Clique para Diagnosticar"}
        </p>
      </div>
    </div>
  );
};

export default PlantScanner;