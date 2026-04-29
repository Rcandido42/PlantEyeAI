import { GoogleGenAI } from "@google/genai";

export interface KeyRotationEvent { type: 'rotated' | 'all_exhausted'; fromIndex: number; toIndex: number; totalKeys: number; remainingKeys: number; }
type KeyRotationListener = (event: KeyRotationEvent) => void;

class KeyManager {
  private keys: string[] = [];
  private currentIndex = 0;
  private exhaustedKeys: Set<number> = new Set();
  private aiInstances: Map<number, GoogleGenAI> = new Map();
  private listeners: KeyRotationListener[] = [];
  constructor() { this.loadKeys(); }
  private loadKeys() {
    const keysString = (process.env.GEMINI_API_KEYS || '').trim();
    if (keysString) this.keys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const singleKey = (process.env.API_KEY || process.env.GEMINI_API_KEY || '').trim();
    if (singleKey && !this.keys.includes(singleKey)) this.keys.push(singleKey);
    if (this.keys.length === 0) console.error('[KeyManager] ⚠️ Nenhuma chave API configurada!');
    else console.log(`[KeyManager] 🔑 ${this.keys.length} chave(s) API carregada(s)`);
  }
  onRotation(listener: KeyRotationListener) { this.listeners.push(listener); return () => { this.listeners = this.listeners.filter(l => l !== listener); }; }
  private notifyListeners(event: KeyRotationEvent) { this.listeners.forEach(l => { try { l(event); } catch (e) { console.error('[KeyManager] Listener error:', e); } }); }
  get totalKeys(): number { return this.keys.length; }
  get availableKeys(): number { return this.keys.length - this.exhaustedKeys.size; }
  get currentKeyIndex(): number { return this.currentIndex + 1; }
  get allExhausted(): boolean { return this.exhaustedKeys.size >= this.keys.length; }
  getAI(): GoogleGenAI {
    if (this.keys.length === 0) throw new Error('Nenhuma chave API Gemini configurada. Adiciona GEMINI_API_KEYS no .env');
    if (!this.aiInstances.has(this.currentIndex)) this.aiInstances.set(this.currentIndex, new GoogleGenAI({ apiKey: this.keys[this.currentIndex] }));
    return this.aiInstances.get(this.currentIndex)!;
  }
  rotateKey(): boolean {
    const fromIndex = this.currentIndex;
    this.exhaustedKeys.add(this.currentIndex);
    for (let i = 1; i <= this.keys.length; i++) {
      const nextIndex = (this.currentIndex + i) % this.keys.length;
      if (!this.exhaustedKeys.has(nextIndex)) {
        this.currentIndex = nextIndex;
        console.log(`[KeyManager] 🔄 Chave rodada: ${fromIndex + 1} → ${nextIndex + 1} (${this.availableKeys} restantes)`);
        this.notifyListeners({ type: 'rotated', fromIndex: fromIndex + 1, toIndex: nextIndex + 1, totalKeys: this.totalKeys, remainingKeys: this.availableKeys });
        return true;
      }
    }
    console.error('[KeyManager] ❌ Todas as chaves API estão esgotadas!');
    this.notifyListeners({ type: 'all_exhausted', fromIndex: fromIndex + 1, toIndex: fromIndex + 1, totalKeys: this.totalKeys, remainingKeys: 0 });
    return false;
  }
  isQuotaError(error: unknown): boolean {
    const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
    return msg.includes('429') || msg.includes('resource exhausted') || msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('too many requests');
  }
  async withRetry<T>(fn: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < this.keys.length; attempt++) {
      if (this.allExhausted) break;
      try { return await fn(this.getAI()); } catch (error) {
        lastError = error;
        if (this.isQuotaError(error)) {
          console.warn(`[KeyManager] ⚡ Chave ${this.currentKeyIndex} esgotada, a rodar...`);
          if (this.rotateKey()) continue;
          break;
        }
        throw error;
      }
    }
    throw lastError;
  }
  resetAll() { this.exhaustedKeys.clear(); this.currentIndex = 0; console.log('[KeyManager] ♻️ Todas as chaves repostas como disponíveis'); }
}

export const keyManager = new KeyManager();
