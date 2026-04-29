import { useState, useCallback, useRef, useEffect } from 'react';
import { keyManager, KeyRotationEvent } from '../services/keyManager';

export interface QuotaAlertState {
  isVisible: boolean;
  message: string;
  type: 'quota_exhausted' | 'rate_limited' | 'api_error' | 'key_rotated';
}

/**
 * Hook global para gerir alertas de quota/tokens da API Gemini.
 * Integra com o KeyManager para mostrar notificações de rotação de chaves.
 */
export function useQuotaAlert() {
  const [alert, setAlert] = useState<QuotaAlertState | null>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback((state: QuotaAlertState) => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }
    setAlert(state);

    // Auto-dismiss para alertas de rotação bem-sucedida (5 segundos)
    if (state.type === 'key_rotated') {
      dismissTimeoutRef.current = setTimeout(() => {
        setAlert(null);
      }, 5000);
    }
  }, []);

  const dismissAlert = useCallback(() => {
    setAlert(null);
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }
  }, []);

  // 🔄 Escuta eventos de rotação do KeyManager
  useEffect(() => {
    const unsubscribe = keyManager.onRotation((event: KeyRotationEvent) => {
      if (event.type === 'rotated') {
        showAlert({
          isVisible: true,
          message: `Chave ${event.fromIndex} esgotada. Trocou automaticamente para a chave ${event.toIndex} de ${event.totalKeys}. Restam ${event.remainingKeys} chave(s) disponíveis.`,
          type: 'key_rotated',
        });
      } else if (event.type === 'all_exhausted') {
        showAlert({
          isVisible: true,
          message: `Todas as ${event.totalKeys} chave(s) da API Gemini foram esgotadas. Adiciona mais chaves no ficheiro .env ou aguarda que a quota seja reposta.`,
          type: 'quota_exhausted',
        });
      }
    });

    return unsubscribe;
  }, [showAlert]);

  /**
   * Analisa um erro da API Gemini e, se for um problema de quota/tokens,
   * ativa o alerta automaticamente. Retorna true se o erro era de quota.
   */
  const handleGeminiError = useCallback((error: unknown): boolean => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = errorMessage.toLowerCase();

    // Detetar erros de quota esgotada
    if (
      errorString.includes('429') ||
      errorString.includes('resource exhausted') ||
      errorString.includes('quota') ||
      errorString.includes('rate limit') ||
      errorString.includes('too many requests') ||
      errorString.includes('resource_exhausted')
    ) {
      // Se o keyManager já tratou (todas esgotadas), o listener acima já mostrou o alerta.
      // Mas se só há 1 chave, mostramos aqui.
      if (keyManager.totalKeys <= 1 || keyManager.allExhausted) {
        const isRateLimit = errorString.includes('rate limit') || errorString.includes('too many requests');
        
        showAlert({
          isVisible: true,
          message: isRateLimit
            ? 'Estás a fazer pedidos demasiado rápido. Aguarda uns segundos e tenta novamente.'
            : keyManager.totalKeys > 1
              ? `Todas as ${keyManager.totalKeys} chaves da API Gemini foram esgotadas. Adiciona mais chaves ou aguarda.`
              : 'A quota de tokens da API Gemini foi esgotada. Adiciona mais chaves no .env ou aguarda até a quota ser reposta.',
          type: isRateLimit ? 'rate_limited' : 'quota_exhausted',
        });
      }
      return true;
    }

    // Detetar erros de sobrecarga do Google (503)
    if (
      errorString.includes('503') ||
      errorString.includes('high demand') ||
      errorString.includes('unavailable')
    ) {
      showAlert({
        isVisible: true,
        message: 'Os servidores da Google estão sobrecarregados neste momento (Erro 503). Por favor, tenta novamente dentro de alguns segundos.',
        type: 'api_error',
      });
      return true;
    }

    // Detetar erros genéricos de API (chave inválida, etc.)
    if (
      errorString.includes('api key') ||
      errorString.includes('401') ||
      errorString.includes('403') ||
      errorString.includes('permission denied') ||
      errorString.includes('invalid')
    ) {
      showAlert({
        isVisible: true,
        message: 'Problema com a chave da API Gemini. Verifica se a chave é válida e está corretamente configurada.',
        type: 'api_error',
      });
      return true;
    }

    return false;
  }, [showAlert]);

  return {
    quotaAlert: alert,
    showQuotaAlert: showAlert,
    dismissQuotaAlert: dismissAlert,
    handleGeminiError,
  };
}
