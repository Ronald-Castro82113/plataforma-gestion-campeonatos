'use client';

import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const iniciarSesionMaestra = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Autenticar con Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // 2. Blindaje extra: Validar estrictamente que sea 'super_admin' en la tabla perfiles_usuarios
        const { data: perfil, error: perfilError } = await supabase
          .from('perfiles_usuarios')
          .select('rol')
          .eq('id', data.user.id)
          .single();

        if (perfilError || !perfil || perfil.rol !== 'super_admin') {
          // Si no es el dueño, cerramos sesión inmediatamente por seguridad
          await supabase.auth.signOut();
          setErrorMsg('Acceso denegado: Esta sección es exclusiva para el Propietario del SaaS.');
          return;
        }

        // 3. Todo OK, redirigir al Panel Maestro
        router.refresh();
        window.location.href = '/super-admin';
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMsg(`Error: ${error.message}`);
      } else {
        setErrorMsg('Error al iniciar sesión como Super Admin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 font-sans text-slate-100">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-2xl border border-slate-800">
        <div className="text-center mb-8">
          <span className="inline-flex items-center justify-center rounded-xl bg-amber-500/10 p-3 text-2xl mb-3 border border-amber-500/20">
            🛡️
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Panel <span className="text-amber-500">Master</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">Acceso exclusivo para el Propietario</p>
        </div>

        <form onSubmit={iniciarSesionMaestra} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Correo de Propietario
            </label>
            <input
              type="email"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-500 focus:bg-slate-800 focus:ring-4 focus:ring-amber-500/10"
              placeholder="tucorreo@admin.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Contraseña Maestra
            </label>
            <div className="relative">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 pr-16 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-500 focus:bg-slate-800 focus:ring-4 focus:ring-amber-500/10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-amber-500 hover:text-amber-400 text-xs font-bold transition"
              >
                {mostrarPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Verificando credenciales...' : 'Acceder al Panel Maestro'}
          </button>
        </form>

        {errorMsg && (
          <div className="mt-5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-center text-sm text-rose-400 font-medium">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}