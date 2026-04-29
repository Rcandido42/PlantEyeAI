import React, { useMemo } from 'react';
import { HistoryItem, PlantStatus, LightLevel } from '../types';
import { Leaf, Heart, Droplets, Sun, TrendingUp, BarChart2, CheckCircle2, Clock, Award, Layers, Zap } from 'lucide-react';

interface StatsViewProps { history: HistoryItem[]; }
const statusLabel: Record<PlantStatus, string> = { [PlantStatus.HEALTHY]: 'Saudável', [PlantStatus.THIRSTY]: 'Com Sede', [PlantStatus.SICK]: 'Doente', [PlantStatus.UNKNOWN]: 'Desconhecido' };
const lightLabel: Record<LightLevel, string> = { [LightLevel.LOW]: 'Baixa', [LightLevel.ADEQUATE]: 'Adequada', [LightLevel.HIGH]: 'Alta', [LightLevel.UNKNOWN]: 'Desconhecido' };
const formatDate = (ts: number) => new Date(ts).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });

function StatCard({ icon, label, value, sub, accent = 'emerald' }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string; }) {
  const accents: any = { emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100', rose: 'bg-rose-50 text-rose-600 border-rose-100', amber: 'bg-amber-50 text-amber-600 border-amber-100', violet: 'bg-violet-50 text-violet-600 border-violet-100' };
  return (
    <div className="bg-white rounded-[1.75rem] border border-emerald-100 p-5 shadow-sm flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${accents[accent]}`}>{icon}</div>
      <div><p className="text-[11px] font-black uppercase tracking-widest text-emerald-700/50">{label}</p><p className="text-3xl font-black text-[#064E3B] leading-none mt-0.5">{value}</p>{sub && <p className="text-xs text-emerald-700/60 mt-1">{sub}</p>}</div>
    </div>
  );
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string; }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3"><span className="text-xs font-bold text-[#064E3B]/70 w-24 shrink-0">{label}</span><div className="flex-1 h-2.5 bg-emerald-50 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} /></div><span className="text-xs font-black text-[#064E3B] w-8 text-right">{count}</span></div>
  );
}

const StatsView: React.FC<StatsViewProps> = ({ history }) => {
  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const total = history.length;
    const stCount = { [PlantStatus.HEALTHY]: 0, [PlantStatus.THIRSTY]: 0, [PlantStatus.SICK]: 0, [PlantStatus.UNKNOWN]: 0 };
    const ltCount = { [LightLevel.LOW]: 0, [LightLevel.ADEQUATE]: 0, [LightLevel.HIGH]: 0, [LightLevel.UNKNOWN]: 0 };
    history.forEach(h => { stCount[h.status]++; ltCount[h.lightLevel]++; });
    const spMap: any = {};
    history.forEach(h => { if (!spMap[h.species]) spMap[h.species] = { count: 0, lastSeen: h.timestamp, lastStatus: h.status }; spMap[h.species].count++; if (h.timestamp > spMap[h.species].lastSeen) { spMap[h.species].lastSeen = h.timestamp; spMap[h.species].lastStatus = h.status; } });
    return { total, stCount, ltCount, thirstyPct: Math.round((stCount[PlantStatus.THIRSTY] / total) * 100), avgConf: Math.round(history.reduce((a, h) => a + (h.confidence ?? 0), 0) / total), species: Object.entries(spMap).sort((a: any, b: any) => b[1].count - a[1].count).slice(0, 5), healthyPct: Math.round((stCount[PlantStatus.HEALTHY] / total) * 100), latest: [...history].sort((a, b) => b.timestamp - a.timestamp)[0] };
  }, [history]);

  if (!stats) return <div className="space-y-8"><div className="flex items-center justify-between"><h2 className="text-2xl font-black tracking-tight">Estatísticas</h2><div className="flex items-center gap-2 px-3 py-1 bg-violet-100 rounded-full"><BarChart2 className="w-3 h-3 text-violet-600" /><span className="text-[10px] font-black uppercase tracking-widest text-violet-700">Dashboard</span></div></div><div className="bg-white rounded-[2rem] border border-emerald-100 p-10 flex flex-col items-center gap-4 text-center"><div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center"><Leaf className="w-8 h-8 text-emerald-400" /></div><div><p className="font-black text-[#064E3B] text-lg">Ainda sem dados</p></div></div></div>;
  const { total, stCount, ltCount, thirstyPct, avgConf, species, healthyPct, latest } = stats;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-black tracking-tight">Estatísticas</h2><div className="flex items-center gap-2 px-3 py-1 bg-violet-100 rounded-full"><BarChart2 className="w-3 h-3 text-violet-600" /><span className="text-[10px] font-black uppercase tracking-widest text-violet-700">Dashboard</span></div></div>
      <div className="grid grid-cols-2 gap-3"><StatCard icon={<Layers />} label="Total" value={total} accent="emerald" /><StatCard icon={<Heart />} label="Saúde" value={`${healthyPct}%`} accent="rose" /><StatCard icon={<Zap />} label="Confiança" value={`${avgConf}%`} accent="amber" /><StatCard icon={<Award />} label="Espécies" value={species.length} accent="violet" /></div>
      <div className="bg-white rounded-[2rem] border border-emerald-100 p-6 shadow-sm space-y-4"><div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><h3 className="font-black text-sm uppercase tracking-widest text-emerald-900">Estado</h3></div><StatusBar label="Saudável" count={stCount[PlantStatus.HEALTHY]} total={total} color="bg-emerald-500" /><StatusBar label="Sede" count={stCount[PlantStatus.THIRSTY]} total={total} color="bg-amber-400" /><StatusBar label="Doente" count={stCount[PlantStatus.SICK]} total={total} color="bg-rose-500" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-[2rem] border border-emerald-100 p-5 shadow-sm space-y-3"><div className="flex items-center gap-2"><Droplets className="w-4 h-4 text-sky-500" /><h3 className="font-black text-[11px] uppercase tracking-widest text-emerald-900">Sede</h3></div><div className="flex flex-col items-center gap-2 pt-1"><div className="relative w-20 h-20"><svg viewBox="0 0 80 80" className="w-full h-full -rotate-90"><circle cx="40" cy="40" r="32" fill="none" stroke="#e0f2fe" strokeWidth="8" /><circle cx="40" cy="40" r="32" fill="none" stroke={thirstyPct > 50 ? '#f87171' : '#38bdf8'} strokeWidth="8" strokeDasharray={`${2 * Math.PI * 32}`} strokeDashoffset={`${2 * Math.PI * 32 * (1 - thirstyPct / 100)}`} strokeLinecap="round" /></svg><div className="absolute inset-0 flex items-center justify-center"><span className="text-lg font-black text-[#064E3B]">{thirstyPct}%</span></div></div></div></div>
        <div className="bg-white rounded-[2rem] border border-emerald-100 p-5 shadow-sm space-y-3"><div className="flex items-center gap-2"><Sun className="w-4 h-4 text-amber-500" /><h3 className="font-black text-[11px] uppercase tracking-widest text-emerald-900">Luz</h3></div><div className="space-y-2 pt-1">{[{ k: LightLevel.LOW, c: 'bg-slate-400' }, { k: LightLevel.ADEQUATE, c: 'bg-amber-400' }, { k: LightLevel.HIGH, c: 'bg-amber-600' }].map(({ k, c }) => (<div key={k} className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full shrink-0 ${c}`} /><span className="text-[10px] text-[#064E3B]/60 flex-1">{lightLabel[k]}</span><span className="text-xs font-black text-[#064E3B]">{ltCount[k]}</span></div>))}</div></div>
      </div>
      <div className="bg-[#064E3B] rounded-[2rem] p-6 shadow-lg text-white space-y-3"><div className="flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-300" /><h3 className="font-black text-[11px] uppercase tracking-widest text-emerald-300">Última</h3></div><div className="flex items-center gap-4">{latest.imageUrl && <img src={latest.imageUrl} className="w-14 h-14 rounded-2xl object-cover shrink-0 border-2 border-white/20" />}<div className="flex-1 min-w-0"><p className="font-black text-white text-base truncate">{latest.species}</p><p className="text-xs text-emerald-200/70 mt-0.5">{statusLabel[latest.status]} · {formatDate(latest.timestamp)}</p></div></div></div>
    </div>
  );
};
export default StatsView;