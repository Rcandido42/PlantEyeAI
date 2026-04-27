import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { HistoryItem, AnalysisResult } from '../types';
import { Session } from '@supabase/supabase-js';

export function useHistory(session: Session | null) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const fetchHistory = async () => {
    if (!session) { setHistory([]); return; }
    const { data } = await supabase
      .from('scan_history')
      .select('*')
      .eq('user_id', session.user.id)
      .order('timestamp', { ascending: false });

    if (data) {
      setHistory(data.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        imageUrl: row.image_url,
        species: row.species,
        status: row.status,
        lightLevel: row.light_level,
        summary: row.summary,
        recommendation: row.recommendation,
        confidence: row.confidence,
      })));
    }
  };

  useEffect(() => { fetchHistory(); }, [session]);

  const addHistoryItem = async (result: AnalysisResult, imageUrl: string) => {
    if (!session) return;
    const item = {
      user_id: session.user.id,
      species: result.species,
      status: result.status,
      light_level: result.lightLevel,
      summary: result.summary,
      recommendation: result.recommendation,
      confidence: result.confidence,
      image_url: imageUrl,
      timestamp: Date.now(),
    };
    const { data } = await supabase.from('scan_history').insert(item).select().single();
    if (data) {
      setHistory(prev => [{
        id: data.id,
        timestamp: data.timestamp,
        imageUrl: data.image_url,
        species: data.species,
        status: data.status,
        lightLevel: data.light_level,
        summary: data.summary,
        recommendation: data.recommendation,
        confidence: data.confidence,
      }, ...prev]);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    await supabase.from('scan_history').delete().eq('id', id);
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = async () => {
    if (!session) return;
    await supabase.from('scan_history').delete().eq('user_id', session.user.id);
    setHistory([]);
  };

  return { history, addHistoryItem, clearHistory, deleteHistoryItem };
}