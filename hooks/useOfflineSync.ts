import { useState, useEffect, useCallback } from 'react';
import { syncPendentes } from '../services/syncService';
import { countPendentes } from '../services/offlineDB';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const refreshCount = useCallback(async () => { setPendingCount(await countPendentes()); }, []);
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try { await syncPendentes(); } finally { setIsSyncing(false); await refreshCount(); }
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();
    const onLine = () => { setIsOnline(true); setTimeout(triggerSync, 1500); };
    const offLine = () => setIsOnline(false);
    window.addEventListener('online', onLine); window.addEventListener('offline', offLine);
    if (navigator.onLine) triggerSync();
    return () => { window.removeEventListener('online', onLine); window.removeEventListener('offline', offLine); };
  }, [triggerSync, refreshCount]);

  return { isOnline, pendingCount, isSyncing, refreshCount };
}
