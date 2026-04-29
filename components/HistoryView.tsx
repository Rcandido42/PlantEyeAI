import React, { useState, useMemo } from 'react';
import { History, Trash2, ChevronRight, Leaf, Filter, FileDown, X } from 'lucide-react';
import { HistoryItem, PlantStatus } from '../types';
import AnalysisResultView from './AnalysisResultView';
import { exportSinglePDF, exportAllPDF } from './PDFReport';

interface HistoryViewProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
}

type StatusFilter = 'ALL' | PlantStatus;
type DateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';

const HistoryView: React.FC<HistoryViewProps> = ({ history, onClearHistory, onDeleteItem }) => {
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(timestamp));
  };

  const translateStatus = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'HEALTHY': return 'Saudável';
      case 'THIRSTY': return 'Deficit Hídrico';
      case 'SICK': return 'Anomalia';
      default: return 'Inconclusivo';
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

  const filteredHistory = useMemo(() => {
    const now = Date.now();
    const day = 86400000;

    return history.filter(item => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      if (dateFilter === 'TODAY' && now - item.timestamp > day) return false;
      if (dateFilter === 'WEEK' && now - item.timestamp > day * 7) return false;
      if (dateFilter === 'MONTH' && now - item.timestamp > day * 30) return false;

      return true;
    });
  }, [history, statusFilter, dateFilter]);

  const activeFiltersCount = (statusFilter !== 'ALL' ? 1 : 0) + (dateFilter !== 'ALL' ? 1 : 0);

  if (history.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-emerald-200">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <History className="w-8 h-8 text-emerald-200" />
        </div>
        <p className="text-emerald-900 font-bold mb-2">Sem registos de campo</p>
        <p className="text-emerald-600/70 text-sm px-8">Os diagnósticos dos teus eucaliptos vão aparecer aqui após cada análise.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[#064E3B]">Registos de Campo</h2>
          <p className="text-xs text-emerald-600/50 font-medium mt-0.5">
            {filteredHistory.length} de {history.length} diagnóstico{history.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportAllPDF(filteredHistory)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#064E3B] text-white rounded-full text-xs font-black hover:bg-emerald-800 transition-colors"
            title="Exportar PDF"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2 rounded-full transition-colors ${showFilters ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-50'}`}
            title="Filtros"
          >
            <Filter className="w-5 h-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              if (window.confirm('Tem a certeza que quer apagar todos os registos de campo?')) {
                onClearHistory();
              }
            }}
            className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
            title="Limpar Registos"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-[2rem] border border-emerald-100 p-5 space-y-4 shadow-sm">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50 mb-2">Estado Fitossanitário</p>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'ALL', label: 'Todos' },
                { value: 'HEALTHY', label: 'Saudável' },
                { value: 'THIRSTY', label: 'Deficit Hídrico' },
                { value: 'SICK', label: 'Anomalia' },
              ] as { value: StatusFilter; label: string }[]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    statusFilter === value
                      ? 'bg-[#064E3B] text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50 mb-2">Período</p>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'ALL', label: 'Todos' },
                { value: 'TODAY', label: 'Hoje' },
                { value: 'WEEK', label: 'Esta semana' },
                { value: 'MONTH', label: 'Este mês' },
              ] as { value: DateFilter; label: string }[]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDateFilter(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    dateFilter === value
                      ? 'bg-[#064E3B] text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={() => { setStatusFilter('ALL'); setDateFilter('ALL'); }}
              className="flex items-center gap-1.5 text-xs text-rose-500 font-bold hover:text-rose-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {filteredHistory.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-emerald-200">
          <p className="text-emerald-900 font-bold mb-1">Sem resultados</p>
          <p className="text-emerald-600/70 text-sm">Tenta ajustar os filtros aplicados.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-[2rem] p-4 flex gap-4 items-center border border-emerald-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setSelectedItem(item)}
            >
              <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-emerald-50">
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
                <p className="text-xs text-emerald-600/70 mt-0.5">{formatDate(item.timestamp)}</p>
                <p className="text-[10px] text-emerald-500/60 font-medium mt-0.5 uppercase tracking-widest">Eucalyptus spp.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); exportSinglePDF(item); }}
                  className="p-1.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                  title="Exportar PDF"
                >
                  <FileDown className="w-4 h-4" />
                </button>
                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${getStatusColor(item.status)}`}>
                  {translateStatus(item.status)}
                </span>
                <ChevronRight className="w-5 h-5 text-emerald-200 group-hover:text-emerald-400 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

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