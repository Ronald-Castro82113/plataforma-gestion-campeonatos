'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';

interface Campeonato {
  id: string;
  nombre_campeonato: string;
  anio: number;
  activo: boolean;
  destacado_principal: boolean;
}

export default function VistaPublicaHome() {
  const [campeonatosActivos, setCampeonatosActivos] = useState<Campeonato[]>([]);
  const [campeonatosFinalizados, setCampeonatosFinalizados] = useState<Campeonato[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarCampeonatos = async () => {
      try {
        const { data, error } = await supabase
          .from('campeonatos')
          .select('*')
          .order('anio', { ascending: false });

        if (data) {
          // Separar activos y finalizados según el campo activo
          const activos = data.filter((c) => c.activo);
          const finalizados = data.filter((c) => !c.activo);

          // Si hay un campeonato destacado por el superadmin, lo ponemos al inicio del arreglo activo
          activos.sort((a, b) => (b.destacado_principal ? 1 : 0) - (a.destacado_principal ? 1 : 0));

          setCampeonatosActivos(activos);
          setCampeonatosFinalizados(finalizados);
        }
      } catch (err) {
        console.error('Error al cargar campeonatos:', err);
      } finally {
        setCargando(false);
      }
    };

    cargarCampeonatos();
  }, []);

  const finalizadosFiltrados = campeonatosFinalizados.filter((c) =>
    c.nombre_campeonato.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.anio.toString().includes(busqueda)
  );

  if (cargando) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Cargando portales...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-12 max-w-7xl mx-auto">
      <header className="text-center space-y-3 py-6">
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">Portal Oficial de Campeonatos</h1>
        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Selecciona un torneo activo o busca ediciones anteriores</p>
      </header>

      {/* Sección de Campeonatos Activos (Carrusel / Tarjetas Destacadas) */}
      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-ping"></span>
          Campeonatos Activos en Curso
        </h2>

        {campeonatosActivos.length === 0 ? (
          <p className="text-slate-500 text-xs italic">No hay campeonatos activos en este momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campeonatosActivos.map((camp) => (
              <div 
                key={camp.id} 
                className={`rounded-2xl p-6 border transition-all flex flex-col justify-between shadow-xl ${
                  camp.destacado_principal 
                    ? 'bg-gradient-to-br from-blue-950/80 to-slate-900 border-blue-500/80 ring-2 ring-blue-500/30' 
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  {camp.destacado_principal && (
                    <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-blue-500/30">
                      ⭐ Destacado en Vista Principal
                    </span>
                  )}
                  <h3 className="text-lg font-black uppercase text-white">{camp.nombre_campeonato}</h3>
                  <p className="text-xs text-slate-400 font-bold">Año: {camp.anio}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-end">
                  <Link
                    href={`/torneo/${camp.id}`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20"
                  >
                    Ver Torneo →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sección de Búsqueda de Campeonatos Finalizados */}
      <section className="space-y-4 pt-6 border-t border-slate-800">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">🔍 Buscar Campeonatos Finalizados</h2>
        <div className="max-w-md">
          <input
            type="text"
            placeholder="Buscar por nombre o año (ej. 2025)..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {finalizadosFiltrados.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-8 text-center">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">No se encontraron campeonatos finalizados con ese criterio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {finalizadosFiltrados.map((camp) => (
              <div key={camp.id} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="bg-slate-800 text-slate-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                    Finalizado
                  </span>
                  <h3 className="text-base font-bold uppercase text-slate-200">{camp.nombre_campeonato}</h3>
                  <p className="text-xs text-slate-500">Año: {camp.anio}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800/50 flex justify-end">
                  <Link
                    href={`/torneo/${camp.id}`}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                  >
                    Ver Historial →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}