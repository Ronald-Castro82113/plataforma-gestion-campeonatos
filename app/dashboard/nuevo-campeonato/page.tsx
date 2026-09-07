'use client';

import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NuevoCampeonatoPage() {
  const [nombreCampeonato, setNombreCampeonato] = useState('');
  // Usamos el año actual por defecto
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const router = useRouter();

  const crearTorneo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje('');

    try {
      // 1. Obtenemos el ID del usuario logueado actualmente
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // 2. Insertamos usando exactamente las columnas de tu tabla original
      const { error } = await supabase
        .from('campeonatos')
        .insert([
          {
            nombre_campeonato: nombreCampeonato,
            anio: Number(anio),
            creado_by: user.id, // Conecta con perfiles_usuarios
            activo: true
          }
        ]);

      if (error) throw error;

      setMensaje('¡Campeonato registrado con éxito para el historial! Redirigiendo...');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (error) {
      const err = error as { message?: string };
      setMensaje(`Error: ${err.message || 'No se pudo crear el torneo'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
        
        <div className="mb-6">
          <Link href="/dashboard" className="text-xs font-semibold text-blue-600 hover:underline">
            ← Volver al Panel
          </Link>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-3">Configura tu Torneo</h2>
          <p className="text-sm text-slate-500 mt-1">Inicia un nuevo campeonato para comenzar a registrar categorías y equipos.</p>
        </div>

        <form onSubmit={crearTorneo} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Nombre del Campeonato
            </label>
            <input
              type="text"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              placeholder="Ej. Liga Profesional de Indor 2026"
              value={nombreCampeonato}
              onChange={(e) => setNombreCampeonato(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Año del Evento
            </label>
            <input
              type="number"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-blue-700/30 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Guardando en el sistema...' : '🏆 Registrar Campeonato'}
          </button>
        </form>

        {mensaje && (
          <div className="mt-5 rounded-xl bg-blue-50 border border-blue-200/60 p-4 text-center text-sm text-blue-800 font-medium">
            {mensaje}
          </div>
        )}
      </div>
    </div>
  );
}