import { useState, useCallback, useRef, useEffect } from 'react';
import { keyManager, KeyRotationEvent } from '../services/keyManager';

export interface QuotaAlertState { isVisible: boolean; message: string; type: 'quota_exhausted' | 'rate_limited' | 'api_error' | 'key_rotated'; }

export function useQuotaAlert() {
  const [alert, setAlert] = useState<QuotaAlertState | null>(null);
  const tRef = useRef<any>(null);

  const showAlert = useCallback((s: QuotaAlertState) => {
    if (tRef.current) clearTimeout(tRef.current);
    setAlert(s);
    if (s.type === 'key_rotated') tRef.current = setTimeout(() => setAlert(null), 5000);
  }, []);

  const dismissAlert = useCallback(() => { setAlert(null); if (tRef.current) clearTimeout(tRef.current); }, []);

  useEffect(() => {
    return keyManager.onRotation((e: KeyRotationEvent) => {
      if (e.type === 'rotated') showAlert({ isVisible: true, message: `Chave ${e.fromIndex} esgotada. Mudou para ${e.toIndex}. Restam ${e.remainingKeys}.`, type: 'key_rotated' });
      else if (e.type === 'all_exhausted') showAlert({ isVisible: true, message: `Todas as ${e.totalKeys} chaves esgotadas.`, type: 'quota_exhausted' });
    });
  }, [showAlert]);

  const handleGeminiError = useCallback((error: unknown): boolean => {
    const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
    if (msg.includes('429') || msg.includes('resource exhausted') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('resource_exhausted')) {
      if (keyManager.totalKeys <= 1 || keyManager.allExhausted) {
        const isRate = msg.includes('rate limit') || msg.includes('too many requests');
        showAlert({ isVisible: true, message: isRate ? 'Pedidos demasiado rápidos.' : 'Quota esgotada.', type: isRate ? 'rate_limited' : 'quota_exhausted' });
      }
      return true;
    }
    if (msg.includes('503') || msg.includes('high demand') || msg.includes('unavailable')) { showAlert({ isVisible: true, message: 'Servidores sobrecarregados (503).', type: 'api_error' }); return true; }
    if (msg.includes('api key') || msg.includes('401') || msg.includes('403') || msg.includes('permission denied') || msg.includes('invalid')) { showAlert({ isVisible: true, message: 'Problema com a chave API.', type: 'api_error' }); return true; }
    return false;
  }, [showAlert]);

  return { quotaAlert: alert, showQuotaAlert: showAlert, dismissQuotaAlert: dismissAlert, handleGeminiError };
}
