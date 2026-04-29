import React, { useMemo } from 'react';
import { HistoryItem, PlantStatus, LightLevel } from '../types';
import { Leaf, Heart, Droplets, Sun, BarChart2, CheckCircle2, Clock, Award, Layers, AlertTriangle } from 'lucide-react';

interface StatsViewProps { history: HistoryItem[]; }
const lightLabel: Record<LightLevel, string> = { [LightLevel.LOW]: 'Baixa', [LightLevel.ADEQUATE]: 'Adequada', [LightLevel.HIGH]: 'Alta', [LightLevel.UNKNOWN]: 'Desconhecido' };
const formatDate = (ts: number) => new Date(ts).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });

function StatCard({ icon, label, value, sub, accent = 'emerald' }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string; }) {
  const accents: any = { emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100', rose: 'bg-rose-50 text-rose-600 border-rose-100', amber: 'bg-amber-50 text-amber-600 border-amber-100', violet: 'bg-violet-50 text-violet-600 border-violet-100', red: 'bg-red-50 text-red-600 border-red-100' };
  return (
    <div className="bg-white rounded-[1.75rem] border border-emerald-100 p-5 shadow-sm flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${accents[accent] ?? accents.emerald}`}>{icon}</div>
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
    history.forEach(h => { stCount[h.status]++; if (h.lightLevel && ltCount[h.lightLevel] !== undefined) ltCount[h.lightLevel]++; else ltCount[LightLevel.UNKNOWN]++; });
    const invasiveItems = history.filter(h => h.isInvasive);
    const invasiveCount = invasiveItems.length;
    const removedCount = invasiveItems.filter(h => !!h.removedAt).length;
    const spMap: Record<string, { count: number; lastSeen: number; lastStatus: PlantStatus; isInvasive: boolean }> = {};
    history.forEach(h => {
      const key = h.isInvasive ? (h.invasiveSpecies || h.species) : h.species;
      if (!spMap[key]) spMap[key] = { count: 0, lastSeen: h.timestamp, lastStatus: h.status, isInvasive: !!h.isInvasive };
      spMap[key].count++;
      if (h.timestamp > spMap[key].lastSeen) { spMap[key].lastSeen = h.timestamp; spMap[key].lastStatus = h.status; }
    });
    const topSpecies = Object.entries(spMap).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
    const invasiveSpeciesMap: Record<string, number> = {};
    invasiveItems.forEach(h => { const k = h.invasiveSpecies || h.species; invasiveSpeciesMap[k] = (invasiveSpeciesMap[k] || 0) + 1; });
    const healthyPct = Math.round((stCount[PlantStatus.HEALTHY] / total) * 100);
    const thirstyPct = Math.round((stCount[PlantStatus.THIRSTY] / total) * 100);
    const latest = [...history].sort((a, b) => b.timestamp - a.timestamp)[0];
    return { total, stCount, ltCount, thirstyPct, topSpecies, healthyPct, latest, invasiveCount, removedCount, invasiveSpeciesMap };
  }, [history]);

  const header = (
    <div className="flex items-center justify-between"><h2 className="text-2xl font-black tracking-tight">Estatísticas</h2><div className="flex items-center gap-2 px-3 py-1 bg-violet-100 rounded-full"><BarChart2 className="w-3 h-3 text-violet-600" /><span className="text-[10px] font-black uppercase tracking-widest text-violet-700">Dashboard</span></div></div>
  );

  if (!stats) return (
    <div className="space-y-8">{header}<div className="bg-white rounded-[2rem] border border-emerald-100 p-10 flex flex-col items-center gap-4 text-center"><div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center"><Leaf className="w-8 h-8 text-emerald-400" /></div><p className="font-black text-[#064E3B] text-lg">Ainda sem dados</p><p className="text-sm text-emerald-600/60">Faz o primeiro diagnóstico para ver as estatísticas.</p></div></div>
  );

  const { total, stCount, ltCount, thirstyPct, topSpecies, healthyPct, latest, invasiveCount, removedCount, invasiveSpeciesMap } = stats;
  const sickEucalyptus = stCount[PlantStatus.SICK] - invasiveCount < 0 ? 0 : stCount[PlantStatus.SICK] - invasiveCount;

  return (
    <div className="space-y-6">
      {header}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Layers className="w-5 h-5" />} label="Total" value={total} sub={`${total} diagnóstico${total !== 1 ? 's' : ''}`} accent="emerald" />
        <StatCard icon={<Heart className="w-5 h-5" />} label="Saudáveis" value={`${healthyPct}%`} sub={`${stCount[PlantStatus.HEALTHY]} plantas`} accent="rose" />
        <StatCard icon={<Award className="w-5 h-5" />} label="Espécies" value={topSpecies.length} sub="identificadas" accent="violet" />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Invasoras" value={invasiveCount} sub={removedCount > 0 ? `${removedCount} removidas` : 'detetadas'} accent={invasiveCount > 0 ? 'red' : 'emerald'} />
      </div>
      <div className="bg-white rounded-[2rem] border border-emerald-100 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><h3 className="font-black text-sm uppercase tracking-widest text-emerald-900">Estado Fitossanitário</h3></div>
        <StatusBar label="Saudável" count={stCount[PlantStatus.HEALTHY]} total={total} color="bg-emerald-500" />
        <StatusBar label="Em Stress" count={stCount[PlantStatus.THIRSTY]} total={total} color="bg-amber-400" />
        <StatusBar label="Doente" count={sickEucalyptus} total={total} color="bg-orange-500" />
        <StatusBar label="Invasora" count={invasiveCount} total={total} color="bg-red-500" />
        <StatusBar label="Inconclusivo" count={stCount[PlantStatus.UNKNOWN]} total={total} color="bg-gray-300" />
      </div>
      {invasiveCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-[2rem] p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /><h3 className="font-black text-sm uppercase tracking-widest text-red-800">Invasoras Detetadas</h3></div>
          {Object.entries(invasiveSpeciesMap).sort((a, b) => b[1] - a[1]).map(([sp, n]) => (
            <div key={sp} className="flex items-center justify-between"><span className="text-sm font-bold text-red-700 italic">{sp}</span><span className="text-xs font-black bg-red-100 text-red-800 px-2 py-0.5 rounded-full">{n}×</span></div>
          ))}
          <p className="text-[10px] text-red-600/70 font-medium pt-1">{removedCount} de {invasiveCount} marcadas como removidas</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-[2rem] border border-emerald-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2"><Droplets className="w-4 h-4 text-sky-500" /><h3 className="font-black text-[11px] uppercase tracking-widest text-emerald-900">Stress Hídrico</h3></div>
          <div className="flex flex-col items-center gap-2 pt-1">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90"><circle cx="40" cy="40" r="32" fill="none" stroke="#e0f2fe" strokeWidth="8" /><circle cx="40" cy="40" r="32" fill="none" stroke={thirstyPct > 50 ? '#f87171' : '#38bdf8'} strokeWidth="8" strokeDasharray={`${2 * Math.PI * 32}`} strokeDashoffset={`${2 * Math.PI * 32 * (1 - thirstyPct / 100)}`} strokeLinecap="round" /></svg>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-lg font-black text-[#064E3B]">{thirstyPct}%</span></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] border border-emerald-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2"><Sun className="w-4 h-4 text-amber-500" /><h3 className="font-black text-[11px] uppercase tracking-widest text-emerald-900">Luminosidade</h3></div>
          <div className="space-y-2 pt-1">
            {([{ k: LightLevel.LOW, c: 'bg-slate-400', l: 'Baixa' }, { k: LightLevel.ADEQUATE, c: 'bg-amber-400', l: 'Adequada' }, { k: LightLevel.HIGH, c: 'bg-amber-600', l: 'Alta' }] as { k: LightLevel; c: string; l: string }[]).map(({ k, c, l }) => (
              <div key={k} className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full shrink-0 ${c}`} /><span className="text-[10px] text-[#064E3B]/60 flex-1">{l}</span><span className="text-xs font-black text-[#064E3B]">{ltCount[k]}</span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-[2rem] border border-emerald-100 p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2"><Award className="w-4 h-4 text-violet-500" /><h3 className="font-black text-sm uppercase tracking-widest text-emerald-900">Top Espécies</h3></div>
        {topSpecies.map(([sp, data]: [string, any]) => (
          <div key={sp} className="flex items-center gap-3">
            <div className="flex-1 min-w-0"><p className="text-sm font-bold text-[#064E3B] italic truncate">{sp}</p></div>
            <div className="flex-1 h-2 bg-emerald-50 rounded-full overflow-hidden"><div className={`h-full rounded-full ${data.isInvasive ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${Math.round((data.count / total) * 100)}%` }} /></div>
            <span className="text-xs font-black text-[#064E3B] w-6 text-right">{data.count}</span>
          </div>
        ))}
      </div>
      <div className="bg-[#064E3B] rounded-[2rem] p-6 shadow-lg text-white space-y-3">
        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-300" /><h3 className="font-black text-[11px] uppercase tracking-widest text-emerald-300">Último Diagnóstico</h3></div>
        <div className="flex items-center gap-4">
          {latest.imageUrl && <img src={latest.imageUrl} className="w-14 h-14 rounded-2xl object-cover shrink-0 border-2 border-white/20" />}
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-base truncate italic">{latest.isInvasive ? (latest.invasiveSpecies || latest.species) : latest.species}</p>
            <p className="text-xs text-emerald-200/70 mt-0.5">{latest.healthStatus ?? latest.status} · {formatDate(latest.timestamp)}</p>
            {latest.isInvasive && <span className="text-[9px] font-black text-red-300 bg-red-900/40 px-2 py-0.5 rounded-full mt-1 inline-block">⚠ INVASORA</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
export default StatsView;