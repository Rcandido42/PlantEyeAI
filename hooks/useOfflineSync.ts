/**
 * hooks/useOfflineSync.ts
 * ─────────────────────────────────────────────────────────────
 * Hook que:
 *  - Monitoriza navigator.onLine
 *  - Dispara syncPendentes() sempre que a rede regressa
 *  - Expõe `isOnline` e `pendingCount` para a UI
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import { syncPendentes } from '../services/syncService';
import { countPendentes } from '../services/offlineDB';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Atualiza badge de pendentes
  const refreshCount = useCallback(async () => {
    const count = await countPendentes();
    setPendingCount(count);
  }, []);

  // Dispara sync e atualiza estado
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      await syncPendentes();
    } finally {
      setIsSyncing(false);
      await refreshCount();
    }
  }, [refreshCount]);

  useEffect(() => {
    // Conta pendentes ao arrancar
    refreshCount();

    const handleOnline = () => {
      setIsOnline(true);
      // Pequeno delay para deixar a rede estabilizar
      setTimeout(triggerSync, 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Se já tiver rede ao montar, tenta sincronizar imediatamente
    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync, refreshCount]);

  return { isOnline, pendingCount, isSyncing, refreshCount };
}
