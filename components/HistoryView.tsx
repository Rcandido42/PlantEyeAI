import React, { useState } from 'react';
import { History, Trash2, ChevronRight, Leaf } from 'lucide-react';
import { HistoryItem } from '../types';
import AnalysisResultView from './AnalysisResultView';

interface HistoryViewProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onClearHistory, onDeleteItem }) => {
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  const translateStatus = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'HEALTHY': return 'Saudável';
      case 'THIRSTY': return 'Precisa de Água';
      case 'SICK': return 'Doente';
      default: return 'Desconhecido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'HEALTHY': return 'text-emerald-700 bg-emerald-100';
      case 'THIRSTY': return 'text-amber-700 bg-amber-100';
      case 'SICK': return 'text-rose-700 bg-rose-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-emerald-200">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <History className="w-8 h-8 text-emerald-200" />
        </div>
        <p className="text-emerald-900 font-bold mb-2">Sem histórico</p>
        <p className="text-emerald-600/70 text-sm">Os seus futuros diagnósticos vão aparecer aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight text-[#064E3B]">Arquivo</h2>
        <button 
          onClick={() => {
            if (window.confirm('Tem a certeza que quer apagar todo o histórico?')) {
              onClearHistory();
            }
          }}
          className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
          title="Limpar Histórico"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="grid gap-4">
        {history.map((item) => (
          <div 
            key={item.id}
            className="bg-white rounded-[2rem] p-4 flex gap-4 items-center border border-emerald-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => setSelectedItem(item)}
          >
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-emerald-50 relative">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.species} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-emerald-100 flex items-center justify-center">
                   <Leaf className="w-6 h-6 text-emerald-500" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[#064E3B] truncate">{item.species}</h3>
              <p className="text-xs text-emerald-600/70 mt-1">{formatDate(item.timestamp)}</p>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${getStatusColor(item.status)}`}>
                {translateStatus(item.status)}
              </span>
              <ChevronRight className="w-5 h-5 text-emerald-200 group-hover:text-emerald-400 transition-colors" />
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <AnalysisResultView 
          result={selectedItem} 
          image={selectedItem.imageUrl} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
};

export default HistoryView;
