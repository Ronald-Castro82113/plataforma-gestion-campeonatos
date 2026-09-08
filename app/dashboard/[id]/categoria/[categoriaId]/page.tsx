'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Equipo {
  id: string;
  nombre_equipo: string;
  logo_url: string | null;
  creado_at: string;
}

interface Categoria {
  id: string;
  nombre_categoria: string;
  campeonato_id: string;
}

export default function GestionEquiposPage({ 
  params 
}: { 
  params: Promise<{ id: string; categoriaId: string }> 
}) {
  const { id: campeonatoId, categoriaId } = use(params);

  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [nuevoNombreEquipo, setNuevoNombreEquipo] = useState('');
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const cargarEquiposYCategoria = async () => {
      try {
        setLoading(true);

        const { data: catData, error: errCat } = await supabase
          .from('categorias')
          .select('id, nombre_categoria, campeonato_id')
          .eq('id', categoriaId)
          .single();

        if (errCat) throw errCat;
        setCategoria(catData);

        const { data: equiposData, error: errEquipos } = await supabase
          .from('equipos')
          .select('id, nombre_equipo, logo_url, creado_at')
          .eq('categoria_id', categoriaId)
          .order('nombre_equipo', { ascending: true });

        if (errEquipos) throw errEquipos;
        setEquipos(equiposData || []);

      } catch (_error) {
        router.push(`/dashboard/${campeonatoId}`);
      } finally {
        setLoading(false);
      }
    };

    cargarEquiposYCategoria();
  }, [campeonatoId, categoriaId, router]);

  const registrarEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombreEquipo.trim()) return;

    setBtnLoading(true);
    try {
      const { error: errInsert } = await supabase
        .from('equipos')
        .insert([
          {
            categoria_id: categoriaId,
            nombre_equipo: nuevoNombreEquipo.trim(),
            logo_url: null
          }
        ]);

      if (errInsert) throw errInsert;

      setNuevoNombreEquipo('');

      const { data: nuevosEquipos } = await supabase
        .from('equipos')
        .select('id, nombre_equipo, logo_url, creado_at')
        .eq('categoria_id', categoriaId)
        .order('nombre_equipo', { ascending: true });

      setEquipos(nuevosEquipos || []);

    } catch (_error) {
      alert('Error al guardar el equipo.');
    } finally {
      setBtnLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans text-slate-500 font-medium">
        Cargando equipos de la categoría...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Navbar */}
      {/* <nav className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex justify-between items-center">
        <Link href="/dashboard" className="text-xl font-bold text-slate-900 tracking-tight">
          Indor<span className="text-blue-600">SaaS</span>
        </Link>
        <Link 
          href={`/dashboard/${campeonatoId}`} 
          className="text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-100 px-3 py-2 rounded-lg transition"
        >
          ← Volver a Categorías
        </Link>
      </nav> */}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {/* Cabecera Limpia */}
        <div className="mb-8 border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Inscripciones abiertas</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">
              Categoría: {categoria?.nombre_categoria}
            </h2>
            <p className="text-sm text-slate-500 mt-1">Registra los clubes y equipos de barrio que participarán en este grupo.</p>
          </div>
          
          {/* BOTÓN DE CONTROL ADMINISTRATIVO ÚNICO */}
          <Link 
            href={`/dashboard/${campeonatoId}`} 
            className="text-xs font-semibold text-white bg-emerald-600  hover:bg-emerald-700 px-3 py-2 rounded-lg transition"
          >
            ← Volver a Categorías
          </Link>
          {/* <div className="flex flex-wrap gap-2">
            <Link 
              href={`/dashboard/${campeonatoId}/categoria/${categoriaId}/fixture`}
              className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition shadow-sm"
            >
              ⚙️ Configurar Torneo / Fixture
            </Link>
          </div> */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Formulario de Registro */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Inscribir Equipo</h3>
            <form onSubmit={registrarEquipo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre del Club / Equipo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ebenezer F.C."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  value={nuevoNombreEquipo}
                  onChange={(e) => setNuevoNombreEquipo(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={btnLoading}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {btnLoading ? 'Inscribiendo...' : '⚽ Registrar Equipo'}
              </button>
            </form>
          </div>

          {/* Listado de Equipos */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Equipos Inscritos ({equipos.length})</h3>

            {equipos.length === 0 ? (
              <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <span className="text-2xl block mb-2">🛡️</span>
                <p className="text-slate-500 text-sm font-medium">No hay equipos en esta categoría todavía.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {equipos.map((equipo) => (
                  <div 
                    key={equipo.id} 
                    className="bg-blue-100/40 border border-slate-200 rounded-xl p-5 shadow-sm flex justify-between items-center hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      {/* Contenedor del escudo */}
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                        <svg 
                          viewBox="0 0 24 24" 
                          className="w-6 h-6 text-blue-600" 
                          fill="currentColor" 
                          stroke="none" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{equipo.nombre_equipo}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Listo para el torneo</p>
                      </div>
                    </div>
                    <Link 
                      href={`/dashboard/${campeonatoId}/categoria/${categoriaId}/equipo/${equipo.id}`}
                      className="text-xs font-bold text-blue-600 hover:bg-blue-100 bg-white border border-blue-100 px-3 py-2 rounded-lg transition text-center"
                    >
                      Fichar →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}