'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
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
          setErrorMsg('Tu cuenta está registrada, pero aún espera la aprobación de la administración.');
          return;
        }

        router.refresh();
        window.location.href = '/dashboard';
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

        <form onSubmit={iniciarSesion} className="space-y-5">
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
            <div className="relative">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pr-16 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 hover:text-blue-800 transition"
              >
                {mostrarPassword ? (
                  // Icono de "Ojo cerrado" (EyeSlash)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  // Icono de "Ojo abierto" (Eye)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
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