import React from 'react';
import { X, LogOut, Moon, Sun, Globe } from 'lucide-react';

export type Language = 'pt' | 'en';
export const translations = {
  pt: {
    settings: 'Definições', appearance: 'Aparência', darkMode: 'Modo Escuro', language: 'Idioma', account: 'Conta', logout: 'Terminar Sessão', logoutDesc: 'Sair da conta atual',
    diagnosisTab: 'Câmara', liveTab: 'Direto', historyTab: 'Arquivo', mapTab: 'Mapa', diagnosisTitle: 'Diagnóstico de Campo', liveTitle: 'Monitorização em Directo',
    offlineTip: 'Funciona sem rede. As capturas ficam guardadas e sobem automaticamente quando houver ligação.',
    gpsTip: 'As coordenadas são registadas com cada captura para mapear as ocorrências no terreno.',
    offlineMode: 'Modo Offline', gpsAuto: 'GPS Automático', mapSoon: 'Mapa de Ocorrências — em breve',
    offlineBanner: '📡 Sem rede — as capturas serão guardadas localmente e sincronizadas quando a ligação regressar.',
    howItWorks: 'Como funciona?', howItWorksDesc: 'Aponte a câmara para a planta e clique no botão central para uma análise instantânea baseada em IA.',
    quickDiagnosis: 'Diagnóstico Rápido', manualMode: 'Modo Manual', tip: 'Dica para um bom diagnóstico', tipDesc: 'Para melhores resultados, garanta que as folhas estão bem iluminadas e visíveis na área de foco.',
  },
  en: {
    settings: 'Settings', appearance: 'Appearance', darkMode: 'Dark Mode', language: 'Language', account: 'Account', logout: 'Sign Out', logoutDesc: 'Sign out of your current account',
    diagnosisTab: 'Camera', liveTab: 'Live', historyTab: 'Archive', mapTab: 'Map', diagnosisTitle: 'Field Diagnosis', liveTitle: 'Live Monitoring',
    offlineTip: 'Works without network. Captures are saved and uploaded automatically when connection returns.',
    gpsTip: 'Coordinates are recorded with each capture to map occurrences in the field.',
    offlineMode: 'Offline Mode', gpsAuto: 'Auto GPS', mapSoon: 'Occurrence Map — coming soon',
    offlineBanner: '📡 No network — captures will be saved locally and synced when connection returns.',
    howItWorks: 'How does it work?', howItWorksDesc: 'Point the camera at the plant and click the center button for an instant AI-based analysis.',
    quickDiagnosis: 'Quick Diagnosis', manualMode: 'Manual Mode', tip: 'Tip for a good diagnosis', tipDesc: 'For best results, ensure the leaves are well lit and visible in the focus area.',
  },
};

interface SettingsModalProps {
  onClose: () => void; darkMode: boolean; onToggleDarkMode: () => void; language: Language; onChangeLanguage: (lang: Language) => void;
  onLogout: () => void; isLoggedIn: boolean; t: typeof translations['pt'];
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, darkMode, onToggleDarkMode, language, onChangeLanguage, onLogout, isLoggedIn, t }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className={`w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-[#064E3B]'}`}>
        <div className={`flex items-center justify-between px-6 py-5 border-b ${darkMode ? 'border-gray-700' : 'border-emerald-100'}`}>
          <h2 className="text-lg font-black tracking-tight">{t.settings}</h2>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-emerald-50'}`}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-2">
          <p className={`text-[10px] font-black uppercase tracking-widest px-2 pb-1 ${darkMode ? 'text-gray-400' : 'text-emerald-600/60'}`}>{t.appearance}</p>
          <button onClick={onToggleDarkMode} className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-emerald-50 hover:bg-emerald-100'}`}>
            <div className="flex items-center gap-3">{darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}<span className="font-bold text-sm">{t.darkMode}</span></div>
            <div className={`w-11 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-emerald-500' : 'bg-gray-200'}`}><div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0.5'}`} /></div>
          </button>
          <div className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-emerald-50'}`}>
            <div className="flex items-center gap-3"><Globe className="w-5 h-5" /><span className="font-bold text-sm">{t.language}</span></div>
            <div className="flex gap-1">
              {(['pt', 'en'] as Language[]).map(lang => (
                <button key={lang} onClick={() => onChangeLanguage(lang)} className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-colors ${language === lang ? 'bg-[#064E3B] text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-emerald-700 hover:bg-emerald-100'}`}>{lang}</button>
              ))}
            </div>
          </div>
          {isLoggedIn && (
            <>
              <p className={`text-[10px] font-black uppercase tracking-widest px-2 pt-2 pb-1 ${darkMode ? 'text-gray-400' : 'text-emerald-600/60'}`}>{t.account}</p>
              <button onClick={() => { onLogout(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors">
                <LogOut className="w-5 h-5" /><div className="text-left"><p className="font-bold text-sm">{t.logout}</p><p className="text-xs opacity-70">{t.logoutDesc}</p></div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;