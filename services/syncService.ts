/**
 * services/syncService.ts
 * ─────────────────────────────────────────────────────────────
 * Sincroniza os diagnósticos guardados no IndexedDB com o Supabase
 * quando a rede volta a estar disponível.
 *
 * Fluxo:
 *  1. Lê itens 'pendente' / 'erro' (< 3 retries) do IndexedDB
 *  2. Faz upload do Blob para o Supabase Storage
 *  3. Insere/actualiza a linha na tabela `diagnosticos`
 *  4. Invoca a Edge Function `gemini-diagnose` (async, não bloqueia)
 *  5. Remove o item do IndexedDB após sucesso
 * ─────────────────────────────────────────────────────────────
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  getPendentes,
  updateStatus,
  removeDiagnostico,
  DiagnosticoPendente,
} from './offlineDB';

// ── Supabase client (singleton) ────────────────────────────────
// As variáveis de ambiente são injectadas pelo Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Mantém a sessão no localStorage para funcionar offline
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// ── Sincronização ──────────────────────────────────────────────

let isSyncing = false;

export async function syncPendentes(): Promise<void> {
  // Evita execuções paralelas
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;

  try {
    const pendentes = await getPendentes();
    if (pendentes.length === 0) return;

    console.log(`[Sync] ${pendentes.length} diagnóstico(s) para sincronizar.`);

    for (const item of pendentes) {
      await syncItem(item);
    }
  } finally {
    isSyncing = false;
  }
}

async function syncItem(item: DiagnosticoPendente): Promise<void> {
  await updateStatus(item.id, 'sincronizando');

  try {
    // 1. Upload da imagem para o Supabase Storage
    const fileName = `${item.userId}/${item.id}.jpg`;
    const { error: storageError } = await supabase.storage
      .from('eucalyptus-images')
      .upload(fileName, item.imageBlob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (storageError) throw storageError;

    const { data: urlData } = supabase.storage
      .from('eucalyptus-images')
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // 2. Inserir na tabela `diagnosticos`
    // A coluna `location` usa PostGIS — enviamos WKT para o Postgres fazer o parse
    const locationWkt = item.coords
      ? `POINT(${item.coords.longitude} ${item.coords.latitude})`
      : null;

    const { error: dbError } = await supabase.from('diagnosticos').upsert(
      {
        id: item.id,
        user_id: item.userId,
        image_url: imageUrl,
        // ST_GeomFromText é chamado no lado do Postgres via trigger/default
        // Aqui enviamos como texto simples; a coluna é TEXT temporariamente
        // até a Edge Function converter para geometry
        location_wkt: locationWkt,
        captured_at: item.timestamp,
        status: 'pendente',
        resultado_ia: null,
      },
      { onConflict: 'id' }
    );

    if (dbError) throw dbError;

    // 3. Invocar Edge Function de diagnóstico (fire-and-forget)
    //    A função atualiza `resultado_ia` e `status` de forma assíncrona
    supabase.functions.invoke('gemini-diagnose', {
      body: { diagnosticoId: item.id, imageUrl },
    });

    // 4. Remover do IndexedDB
    await removeDiagnostico(item.id);
    console.log(`[Sync] ✅ ${item.id} sincronizado com sucesso.`);
  } catch (err) {
    console.error(`[Sync] ❌ Falha ao sincronizar ${item.id}:`, err);
    await updateStatus(item.id, 'erro', true);
  }
}
