import { useState, useCallback, useRef } from 'react';

export interface QuotaAlertState {
  isVisible: boolean;
  message: string;
  type: 'quota_exhausted' | 'rate_limited' | 'api_error';
}

/**
 * Hook global para gerir alertas de quota/tokens da API Gemini.
 * Expõe um estado de alerta e funções para o mostrar/esconder.
 */
export function useQuotaAlert() {
  const [alert, setAlert] = useState<QuotaAlertState | null>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback((state: QuotaAlertState) => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }
    setAlert(state);
  }, []);

  const dismissAlert = useCallback(() => {
    setAlert(null);
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }
  }, []);

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
      // Verificar se é rate limit temporário ou quota esgotada
      const isRateLimit = errorString.includes('rate limit') || errorString.includes('too many requests');
      
      showAlert({
        isVisible: true,
        message: isRateLimit
          ? 'Estás a fazer pedidos demasiado rápido. Aguarda uns segundos e tenta novamente.'
          : 'A quota de tokens da API Gemini foi esgotada. Verifica o teu plano ou aguarda até a quota ser reposta.',
        type: isRateLimit ? 'rate_limited' : 'quota_exhausted',
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
