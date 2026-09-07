'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: perfil, error: perfilError } = await supabase
          .from('perfiles_usuarios')
          .select('rol, estado')
          .eq('id', data.user.id)
          .single();

        if (perfilError) throw perfilError;

        if (perfil.estado !== 'autorizado') {
          await supabase.auth.signOut();
          setErrorMsg('Tu cuenta está registrada, pero aún espera la aprobación del Super Admin.');
          return;
        }

        router.push('/dashboard');
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMsg(`Error: ${error.message}`);
      } else {
        setErrorMsg('Error al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/50 p-4 font-sans text-slate-800">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="text-center mb-8">
          <span className="inline-flex items-center justify-center rounded-xl bg-blue-50 p-3 text-2xl mb-3">
            🏆
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Indor<span className="text-blue-600">SaaS</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">Panel de control de campeonatos</p>
        </div>

        <form onSubmit={ar => iniciarSesion(ar)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-blue-700/30 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Verificando credenciales...' : 'Ingresar al Sistema'}
          </button>
        </form>

        {errorMsg && (
          <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200/60 p-4 text-center text-sm text-amber-800 font-medium">
            {errorMsg}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-slate-500 border-t border-slate-100 pt-6">
          ¿Eres un organizador nuevo?{' '}
          <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
            Solicita tu plataforma aquí
          </Link>
        </div>
      </div>
    </div>
  );
}