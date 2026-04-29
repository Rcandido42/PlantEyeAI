import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => (await supabase.auth.signInWithPassword({ email, password })).error;
  const signUp = async (email: string, password: string) => (await supabase.auth.signUp({ email, password })).error;
  const signOut = async () => { await supabase.auth.signOut(); };

  return { session, loading, signIn, signUp, signOut };
}