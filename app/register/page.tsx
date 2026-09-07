'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const registrarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { error: perfilError } = await supabase
          .from('perfiles_usuarios')
          .insert([
            {
              id: data.user.id,
              nombre_completo: nombre,
              rol: 'admin',
              estado: 'pendiente',
            },
          ]);

        if (perfilError) throw perfilError;

        setMensaje('¡Registro completado! Tu solicitud ha sido enviada al Super Admin.');
      }
    } catch (error) {
      const err = error as { message?: string; error_description?: string };
      // Esto te mostrará el error exacto flotando en la pantalla del celular
      setMensaje(`⚠️ Error al registrar: ${err.message || err.error_description || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/50 p-4 font-sans text-slate-800">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="text-center mb-8">
          <span className="inline-flex items-center justify-center rounded-xl bg-blue-50 p-3 text-2xl mb-3">
            ⚽
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Indor<span className="text-blue-600">SaaS</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">Crea tu cuenta de organizador y gestiona tus ligas</p>
        </div>
        
        <form onSubmit={registrarUsuario} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Nombre Completo
            </label>
            <input
              type="text"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              placeholder="Ej. Carlos Mendoza"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

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
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-blue-700/30 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Solicitar Acceso Administrativo'}
          </button>
        </form>

        {mensaje && (
          <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-200/60 p-4 text-center text-sm text-emerald-800 font-medium animate-fade-in">
            {mensaje}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-slate-500 border-t border-slate-100 pt-6">
          ¿Ya administras una liga?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
            Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
}