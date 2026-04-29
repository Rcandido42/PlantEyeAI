import React, { useState } from 'react';
import { Leaf, Mail, Lock, Loader2 } from 'lucide-react';

interface AuthModalProps { onSignIn: (e: string, p: string) => Promise<any>; onSignUp: (e: string, p: string) => Promise<any>; }

export default function AuthModal({ onSignIn, onSignUp }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    setLoading(true); setError(''); setSuccess('');
    const err = await (mode === 'login' ? onSignIn : onSignUp)(email, password);
    if (err) setError(err.message);
    else if (mode === 'register') setSuccess('Conta criada! Verifica o teu email.');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-[2rem] p-8 w-full max-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-2"><div className="border-[3px] border-[#064E3B] px-2 py-0.5 flex items-center gap-0.5"><span className="text-xl font-black text-[#064E3B]">PL</span><Leaf className="w-5 h-5 text-[#064E3B] fill-current -rotate-12" /><span className="text-xl font-black text-[#064E3B]">NT</span></div><span className="text-xl font-black text-[#064E3B]">EYE</span></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50 mb-6">Monitorização Florestal</p>
        <h2 className="text-2xl font-black text-[#064E3B] mb-1">{mode === 'login' ? 'Bem-vindo' : 'Criar conta'}</h2>
        <p className="text-sm text-emerald-700/60 mb-6">{mode === 'login' ? 'Acede ao histórico.' : 'Regista-te para monitorizar.'}</p>
        <div className="space-y-3">
          <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600/50" /><input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-xl border border-emerald-100 bg-emerald-50/50 text-[#064E3B] text-sm font-medium outline-none focus:border-emerald-400 transition-colors" /></div>
          <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600/50" /><input type="password" placeholder="Palavra-passe" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} className="w-full pl-11 pr-4 py-3 rounded-xl border border-emerald-100 bg-emerald-50/50 text-[#064E3B] text-sm font-medium outline-none focus:border-emerald-400 transition-colors" /></div>
        </div>
        {error && <p className="mt-3 text-xs text-red-500 font-medium">{error}</p>}
        {success && <p className="mt-3 text-xs text-emerald-600 font-medium">{success}</p>}
        <button onClick={handleSubmit} disabled={loading || !email || !password} className="mt-5 w-full bg-[#064E3B] text-white py-3.5 rounded-xl font-black text-sm tracking-wide disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-emerald-800 transition-colors">{loading && <Loader2 className="w-4 h-4 animate-spin" />}{mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
        <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }} className="mt-4 w-full text-center text-xs text-emerald-700/50 hover:text-emerald-700 font-medium transition-colors">{mode === 'login' ? 'Não tens conta? Regista-te' : 'Já tens conta? Entra'}</button>
      </div>
    </div>
  );
}