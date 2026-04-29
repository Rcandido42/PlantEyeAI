import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getPendentes, updateStatus, removeDiagnostico, DiagnosticoPendente } from './offlineDB';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

let isSyncing = false;

export async function syncPendentes(): Promise<void> {
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;
  try {
    const pendentes = await getPendentes();
    if (pendentes.length === 0) return;
    for (const item of pendentes) await syncItem(item);
  } finally { isSyncing = false; }
}

async function syncItem(item: DiagnosticoPendente): Promise<void> {
  await updateStatus(item.id, 'sincronizando');
  try {
    const fileName = `${item.userId}/${item.id}.jpg`;
    const { error: storageError } = await supabase.storage.from('eucalyptus-images').upload(fileName, item.imageBlob, { contentType: 'image/jpeg', upsert: true });
    if (storageError) throw storageError;
    const { data: urlData } = supabase.storage.from('eucalyptus-images').getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;
    const locationWkt = item.coords ? `POINT(${item.coords.longitude} ${item.coords.latitude})` : null;
    const { error: dbError } = await supabase.from('diagnosticos').upsert({ id: item.id, user_id: item.userId, image_url: imageUrl, location_wkt: locationWkt, captured_at: item.timestamp, status: 'pendente', resultado_ia: null }, { onConflict: 'id' });
    if (dbError) throw dbError;
    supabase.functions.invoke('gemini-diagnose', { body: { diagnosticoId: item.id, imageUrl } });
    await removeDiagnostico(item.id);
  } catch (err) {
    console.error(`[Sync] Falha ao sincronizar ${item.id}:`, err);
    await updateStatus(item.id, 'erro', true);
  }
}
