'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../lib/supabase';
// import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Categoría {
  id: string;
  nombre_categoria: string;
  total_equipos?: number;
}

interface Campeonato {
  id: string;
  nombre_campeonato: string;
  anio: number;
}

interface CategoriaConEquiposQuery {
  id: string;
  nombre_categoria: string;
  equipos?: { id: string }[];
}

export default function GestionCampeonatoPage({ params }: { params: Promise<{ id: string }> }) {
  // Desenvuelve los params usando React.use() para Next.js moderno
  const { id: campeonatoId } = use(params);

  const [campeonato, setCampeonato] = useState<Campeonato | null>(null);
  const [categorias, setCategorias] = useState<Categoría[]>([]);
  const [nuevoNombreCategoria, setNuevoNombreCategoria] = useState('');
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  // const router = useRouter();

  // Función para cargar los detalles del torneo y sus categorías
  useEffect(() => {
    const cargarDetalles = async () => {
      try {
        setLoading(true);

        // 1. Obtener datos del campeonato
        const { data: torneo, error: errTorneo } = await supabase
          .from('campeonatos')
          .select('id, nombre_campeonato, anio')
          .eq('id', campeonatoId)
          .single();

        if (errTorneo) throw errTorneo;
        setCampeonato(torneo);

        // 2. Obtener las categorías de este campeonato
        const { data: categoriasData, error: errCat } = await supabase
          .from('categorias')
          .select('id, nombre_categoria, equipos (id)' )
          .eq('campeonato_id', campeonatoId)
          .order('creado_at', { ascending: true });

        if (errCat) throw errCat;
        // Mapear los datos para calcular el total de equipos de forma segura
        const categoriasConConteo = (categoriasData || []).map((cat: CategoriaConEquiposQuery) => ({
          id: cat.id,
          nombre_categoria: cat.nombre_categoria,
          total_equipos: Array.isArray(cat.equipos) ? cat.equipos.length : 0,
        }));
        
        setCategorias(categoriasConConteo);

      } catch (error) {
        console.error('Error al cargar detalles:', error);
        // router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (campeonatoId) {
      cargarDetalles();
    }
  }, [campeonatoId]);

  // Efecto para cambiar el título con el nombre real del campeonato
  useEffect(() => {
    if (campeonato?.nombre_campeonato) {
      document.title = `${campeonato.nombre_campeonato} - Categorías`;
    }
  }, [campeonato]);

  // Función para agregar una nueva categoría en la base de datos
  const agregarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombreCategoria.trim()) return;

    setBtnLoading(true);
    try {
      const { error } = await supabase
        .from('categorias')
        .insert([
          {
            campeonato_id: campeonatoId,
            nombre_categoria: nuevoNombreCategoria.trim(),
          },
        ]);

      if (error) throw error;

      setNuevoNombreCategoria('');
      // Recargar la lista de categorías
      const { data: cats } = await supabase
        .from('categorias')
        .select('id, nombre_categoria')
        .eq('campeonato_id', campeonatoId);
      
      setCategorias(cats || []);
    } catch (error) {
      alert('No se pudo guardar la categoría. Asegúrate de tener activa la política RLS en la tabla categorias.');
    } finally {
      setBtnLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans text-slate-500 font-medium">
        Cargando campeonato...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex justify-between items-center">
        <Link href="/dashboard" className="text-xl font-bold text-slate-900 tracking-tight">
          <img src="/logo_casmi_sports.png" alt="Casmi Sports" className="h-10 w-auto object-contain"/>
        </Link>
        <Link href="/dashboard" className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg transition">
          ← Volver al Panel Principal
        </Link>
      </nav>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {/* Cabecera del campeonato seleccionado */}
        <div className="mb-8 border-b border-slate-200 pb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Gestión de Torneo</span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-1">{campeonato?.nombre_campeonato}</h2>
          <p className="text-sm text-slate-500 mt-1">Temporada: <span className="font-semibold text-slate-700">{campeonato?.anio}</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Columna Izquierda: Formulario de Nueva Categoría */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Nueva Categoría</h3>
            <form onSubmit={agregarCategoria} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre (Ej: Sénior, Sub-40)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Máster de la noche"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  value={nuevoNombreCategoria}
                  onChange={(e) => setNuevoNombreCategoria(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={btnLoading}
                className="w-full rounded-xl bg-cyan-900 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/10 transition hover:bg-cyan-700 active:scale-[0.99] disabled:opacity-50"
              >
                {btnLoading ? 'Guardando...' : '➕ Crear Categoría'}
              </button>
            </form>
          </div>

          {/* Columna Derecha: Listado de Categorías actuales */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Categorías habilitadas en este año</h3>
            
            {categorias.length === 0 ? (
              <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <span className="text-2xl block mb-2">📁</span>
                <p className="text-slate-500 text-sm font-medium">No hay categorías configuradas todavía.</p>
                <p className="text-xs text-slate-400 mt-0.5">Agrega una en el panel izquierdo para inscribir equipos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categorias.map((cat) => (
                  <div key={cat.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex justify-between items-center hover:border-slate-300 transition">
                    <div>
                      <h4 className="font-bold text-slate-900">{cat.nombre_categoria}</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {cat.total_equipos ?? 0} {cat.total_equipos === 1 ? 'Equipo registrado': 'Equipos registrados'}</p>
                    </div>
                    <Link 
                      href={`/dashboard/${campeonatoId}/categoria/${cat.id}`}
                      className="text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-100 bg-blue-50/30 px-3 py-2 rounded-lg transition text-center"
                    >
                      INGRESAR →
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