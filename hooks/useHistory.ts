import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { HistoryItem, AnalysisResult, GpsCoords } from '../types';
import { Session } from '@supabase/supabase-js';

const LS_KEY = 'planteye_history';
const LS_COUNT = 'planteye_analysis_counter';

const nextId = () => { const n = (parseInt(localStorage.getItem(LS_COUNT) || '0', 10)) + 1; localStorage.setItem(LS_COUNT, String(n)); return n; };
const readLocal = () => { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : []; } catch { return []; } };
const writeLocal = (i: HistoryItem[]) => { try { localStorage.setItem(LS_KEY, JSON.stringify(i.slice(0, 200))); } catch {} };

export function useHistory(session: Session | null) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const fetchHistory = useCallback(async () => {
    setHistory(readLocal());
    if (!session || !navigator.onLine) return;
    try {
      const { data } = await supabase.from('scan_history').select('*').eq('user_id', session.user.id).order('timestamp', { ascending: false });
      if (data) {
        const items: HistoryItem[] = data.map((r, i) => ({
          id: r.id, analysisId: r.analysis_id ?? (data.length - i), timestamp: r.timestamp, imageUrl: r.image_url, species: r.species ?? 'desconhecida', healthStatus: r.health_status ?? 'Saudável', threatDetected: r.threat_detected ?? 'nenhuma', severityLevel: r.severity_level ?? 0, forestryRisk: r.forestry_risk ?? 'Baixo', recommendations: r.recommendations || [r.recommendation], raizReference: r.raiz_reference, summary: r.summary, lightLevel: r.light_level, confidence: r.confidence, status: r.status, recommendation: r.recommendation, coords: r.latitude ? { latitude: r.latitude, longitude: r.longitude } : null, isInvasive: r.is_invasive, invasiveSpecies: r.invasive_species, removedAt: r.removed_at ? new Date(r.removed_at).getTime() : null
        } as HistoryItem));
        const maxId = items.reduce((max, item) => Math.max(max, item.analysisId ?? 0), parseInt(localStorage.getItem(LS_COUNT) || '0', 10));
        localStorage.setItem(LS_COUNT, String(maxId));
        setHistory(items); writeLocal(items);
      }
    } catch (err) { console.warn('[useHistory] fetch error:', err); }
  }, [session]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const addHistoryItem = useCallback(async (res: AnalysisResult, url: string, coords: GpsCoords | null) => {
    const aid = nextId();
    const item: HistoryItem = { id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, analysisId: aid, timestamp: Date.now(), imageUrl: url, coords, ...res };
    setHistory(p => { const u = [item, ...p]; writeLocal(u); return u; });
    if (session && navigator.onLine) {
      try {
        const row = { user_id: session.user.id, analysis_id: aid, species: res.species, status: res.status, health_status: res.healthStatus, threat_detected: res.threatDetected, severity_level: res.severityLevel, forestry_risk: res.forestryRisk, recommendations: res.recommendations, raiz_reference: res.raizReference, light_level: res.lightLevel, summary: res.summary, recommendation: res.recommendations?.[0] || '', confidence: res.confidence, image_url: url, timestamp: item.timestamp, latitude: coords?.latitude, longitude: coords?.longitude, is_invasive: res.isInvasive, invasive_species: res.invasiveSpecies };
        const { data, error } = await supabase.from('scan_history').insert(row).select().single();
        if (error) console.warn('[useHistory] addItem insert error:', error);
        if (data) setHistory(p => p.map(i => i.analysisId === aid ? { ...i, id: data.id } : i));
      } catch (err) { console.warn('[useHistory] addItem failed:', err); }
    }
    return item;
  }, [session]);

  const deleteHistoryItem = useCallback(async (id: string) => { setHistory(p => { const u = p.filter(i => i.id !== id); writeLocal(u); return u; }); if (session && navigator.onLine) await supabase.from('scan_history').delete().eq('id', id); }, [session]);
  const clearHistory = useCallback(async () => { setHistory([]); writeLocal([]); if (session && navigator.onLine) await supabase.from('scan_history').delete().eq('user_id', session.user.id); }, [session]);
  const markInvasiveRemoved = useCallback(async (id: string) => { const rat = Date.now(); setHistory(p => { const u = p.map(i => i.id === id ? { ...i, removedAt: rat } : i); writeLocal(u); return u; }); if (session && navigator.onLine) await supabase.from('scan_history').update({ removed_at: new Date(rat).toISOString() }).eq('id', id); }, [session]);
  const updateHistoryItem = useCallback(async (id: string, res: AnalysisResult) => {
    let uitem: HistoryItem | null = null;
    setHistory(p => {
      const u = p.map(i => {
        if (i.id !== id) return i;
        const updated = { ...i, ...res, isPending: false, imageBase64: undefined };
        uitem = updated;
        return updated;
      });
      writeLocal(u);
      return u;
    });
    // If the updater hasn't run synchronously, find the item from current state
    if (!uitem) {
      setHistory(p => { uitem = p.find(i => i.id === id) ?? null; return p; });
    }
    if (session && navigator.onLine && uitem) {
      const u = uitem as HistoryItem;
      const row = { species: u.species, status: u.status, health_status: u.healthStatus, threat_detected: u.threatDetected, severity_level: u.severityLevel, forestry_risk: u.forestryRisk, recommendations: u.recommendations, raiz_reference: u.raizReference, light_level: u.lightLevel, summary: u.summary, recommendation: u.recommendations?.[0] || '', confidence: u.confidence, is_invasive: u.isInvasive, invasive_species: u.invasiveSpecies };
      try {
        if (u.id.startsWith('local_')) {
          const { error } = await supabase.from('scan_history').insert({ ...row, user_id: session.user.id, analysis_id: u.analysisId, timestamp: u.timestamp, image_url: u.imageUrl, latitude: u.coords?.latitude, longitude: u.coords?.longitude });
          if (error) console.warn('[useHistory] insert error:', error);
        } else {
          const { error } = await supabase.from('scan_history').update(row).eq('id', u.id);
          if (error) console.warn('[useHistory] update error:', error);
        }
      } catch (err) { console.warn('[useHistory] DB save failed:', err); }
    }
  }, [session]);

  return { history, addHistoryItem, clearHistory, deleteHistoryItem, markInvasiveRemoved, updateHistoryItem, refetch: fetchHistory };
}
