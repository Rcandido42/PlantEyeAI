import React, { useState, useEffect, useRef } from 'react';
import { Camera, ChevronDown, Check } from 'lucide-react';

interface CameraSelectorProps { onDeviceSelect: (deviceId: string) => void; }

const CameraSelector: React.FC<CameraSelectorProps> = ({ onDeviceSelect }) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const videoDevices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0 && !activeDeviceId) {
          const defaultDevice = videoDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment')) || videoDevices[0];
          setActiveDeviceId(defaultDevice.deviceId); onDeviceSelect(defaultDevice.deviceId);
        }
      } catch (e) {}
    };
    getDevices();
  }, [onDeviceSelect, activeDeviceId]);

  const handleSelect = (id: string) => { setActiveDeviceId(id); onDeviceSelect(id); setIsOpen(false); };
  if (devices.length === 0) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-2.5 rounded-full bg-emerald-50 text-[#064E3B] hover:bg-emerald-100 transition-colors shadow-sm"><Camera className="w-5 h-5" /><ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} /></button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 bg-emerald-50/50 border-b border-emerald-50"><span className="text-xs font-black uppercase tracking-widest text-[#064E3B]">Selecione a Câmara</span></div>
          <div className="max-h-60 overflow-y-auto p-2 flex flex-col gap-1">
            {devices.map((d, i) => (
              <button key={d.deviceId} onClick={() => handleSelect(d.deviceId)} className={`flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left ${activeDeviceId === d.deviceId ? 'bg-[#064E3B] text-white' : 'hover:bg-emerald-50 text-emerald-900'}`}><span className="truncate pr-2">{d.label || `Câmara ${i + 1}`}</span>{activeDeviceId === d.deviceId && <Check className="w-4 h-4 flex-shrink-0" />}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraSelector;
