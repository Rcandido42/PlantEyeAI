import { GoogleGenAI } from "@google/genai";

/**
 * 🔑 KeyManager — Gestor de Rotação de Chaves da API Gemini
 * 
 * Mantém uma pool de chaves API e roda automaticamente para a próxima
 * quando uma chave é marcada como esgotada (quota/rate limit).
 * 
 * Uso:
 *   - keyManager.getAI()     → Devolve a instância GoogleGenAI ativa
 *   - keyManager.rotateKey() → Troca para a próxima chave disponível
 *   - keyManager.withRetry(fn) → Executa fn com retry automático em caso de quota
 */

export interface KeyRotationEvent {
  type: 'rotated' | 'all_exhausted';
  fromIndex: number;
  toIndex: number;
  totalKeys: number;
  remainingKeys: number;
}

type KeyRotationListener = (event: KeyRotationEvent) => void;

class KeyManager {
  private keys: string[] = [];
  private currentIndex = 0;
  private exhaustedKeys: Set<number> = new Set();
  private aiInstances: Map<number, GoogleGenAI> = new Map();
  private listeners: KeyRotationListener[] = [];

  constructor() {
    this.loadKeys();
  }

  /**
   * Carrega as chaves do ambiente.
   * Suporta:
   *   - GEMINI_API_KEYS (separadas por vírgula) — prioridade
   *   - GEMINI_API_KEY / API_KEY (chave única) — fallback
   */
  private loadKeys() {
    const keysString = (process.env.GEMINI_API_KEYS || '').trim();

    if (keysString) {
      this.keys = keysString
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
    }

    // Fallback para a chave única original
    if (this.keys.length === 0) {
      const singleKey = (process.env.API_KEY || process.env.GEMINI_API_KEY || '').trim();
      if (singleKey) {
        this.keys = [singleKey];
      }
    }

    if (this.keys.length === 0) {
      console.error('[KeyManager] ⚠️ Nenhuma chave API configurada!');
    } else {
      console.log(`[KeyManager] 🔑 ${this.keys.length} chave(s) API carregada(s)`);
    }
  }

  /** Regista um listener para eventos de rotação */
  onRotation(listener: KeyRotationListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(event: KeyRotationEvent) {
    this.listeners.forEach(l => {
      try { l(event); } catch (e) { console.error('[KeyManager] Listener error:', e); }
    });
  }

  /** Número total de chaves */
  get totalKeys(): number {
    return this.keys.length;
  }

  /** Número de chaves ainda disponíveis (não esgotadas) */
  get availableKeys(): number {
    return this.keys.length - this.exhaustedKeys.size;
  }

  /** Índice atual (1-based para exibição) */
  get currentKeyIndex(): number {
    return this.currentIndex + 1;
  }

  /** Verifica se todas as chaves estão esgotadas */
  get allExhausted(): boolean {
    return this.exhaustedKeys.size >= this.keys.length;
  }

  /** Devolve a instância GoogleGenAI para a chave ativa */
  getAI(): GoogleGenAI {
    if (this.keys.length === 0) {
      throw new Error('Nenhuma chave API Gemini configurada. Adiciona GEMINI_API_KEYS no .env');
    }

    if (!this.aiInstances.has(this.currentIndex)) {
      this.aiInstances.set(
        this.currentIndex,
        new GoogleGenAI({ apiKey: this.keys[this.currentIndex] })
      );
    }

    return this.aiInstances.get(this.currentIndex)!;
  }

  /**
   * Marca a chave atual como esgotada e roda para a próxima disponível.
   * Retorna true se conseguiu rodar, false se todas as chaves estão esgotadas.
   */
  rotateKey(): boolean {
    const fromIndex = this.currentIndex;
    this.exhaustedKeys.add(this.currentIndex);

    // Procura a próxima chave não esgotada
    for (let i = 1; i <= this.keys.length; i++) {
      const nextIndex = (this.currentIndex + i) % this.keys.length;
      if (!this.exhaustedKeys.has(nextIndex)) {
        this.currentIndex = nextIndex;
        console.log(`[KeyManager] 🔄 Chave rodada: ${fromIndex + 1} → ${nextIndex + 1} (${this.availableKeys} restantes)`);
        
        this.notifyListeners({
          type: 'rotated',
          fromIndex: fromIndex + 1,
          toIndex: nextIndex + 1,
          totalKeys: this.totalKeys,
          remainingKeys: this.availableKeys,
        });
        
        return true;
      }
    }

    // Todas esgotadas
    console.error('[KeyManager] ❌ Todas as chaves API estão esgotadas!');
    this.notifyListeners({
      type: 'all_exhausted',
      fromIndex: fromIndex + 1,
      toIndex: fromIndex + 1,
      totalKeys: this.totalKeys,
      remainingKeys: 0,
    });
    
    return false;
  }

  /**
   * Detecta se um erro é de quota/rate limit.
   */
  isQuotaError(error: unknown): boolean {
    const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
    return (
      msg.includes('429') ||
      msg.includes('resource exhausted') ||
      msg.includes('resource_exhausted') ||
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      msg.includes('too many requests')
    );
  }

  /**
   * Executa uma função com retry automático de rotação de chaves.
   * Se a chave atual falhar por quota, roda para a próxima e tenta de novo.
   * Continua até ter sucesso ou todas as chaves estarem esgotadas.
   */
  async withRetry<T>(fn: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
    let lastError: unknown;

    // Tenta com cada chave disponível
    for (let attempt = 0; attempt < this.keys.length; attempt++) {
      if (this.allExhausted) break;

      try {
        const ai = this.getAI();
        return await fn(ai);
      } catch (error) {
        lastError = error;

        if (this.isQuotaError(error)) {
          console.warn(`[KeyManager] ⚡ Chave ${this.currentKeyIndex} esgotada, a rodar...`);
          const rotated = this.rotateKey();
          if (!rotated) break; // Todas esgotadas
          continue; // Tenta com a próxima chave
        }

        // Erro não relacionado com quota — propaga imediatamente
        throw error;
      }
    }

    // Se chegámos aqui, todas as chaves falharam
    throw lastError;
  }

  /**
   * Reinicia todas as chaves (ex: para tentar novamente após um tempo).
   */
  resetAll() {
    this.exhaustedKeys.clear();
    this.currentIndex = 0;
    console.log('[KeyManager] ♻️ Todas as chaves repostas como disponíveis');
  }
}

// Singleton global
export const keyManager = new KeyManager();
