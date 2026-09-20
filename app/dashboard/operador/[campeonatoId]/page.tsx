'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabase';

interface Campeonato {
  id: string;
  nombre_campeonato: string;
  anio: number;
}

interface Categoria {
  id: string;
  nombre_categoria: string;
  total_equipos: number;
}

interface CategoriaConEquiposQuery {
  id: string;
  nombre_categoria: string;
  equipos?: { id: string }[];
}

export default function OperadorCampeonatoPage({
  params,
}: {
  params: Promise<{ campeonatoId: string }>;
}) {
  const { campeonatoId } = use(params);

  const [campeonato, setCampeonato] = useState<Campeonato | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [sinAcceso, setSinAcceso] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setSinAcceso(false);

        // 1. Obtener el usuario actualmente conectado
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setSinAcceso(true);
          return;
        }

        // 2. Verificar que el operador tenga asignado este campeonato
        const { data: relacion, error: relacionError } = await supabase
          .from('operadores_campeonatos')
          .select('id')
          .eq('user_id', user.id)
          .eq('campeonato_id', campeonatoId)
          .maybeSingle();

        if (relacionError || !relacion) {
          setSinAcceso(true);
          return;
        }

        // 3. Obtener información del campeonato
        const { data: campeonatoData, error: campeonatoError } =
          await supabase
            .from('campeonatos')
            .select('id, nombre_campeonato, anio')
            .eq('id', campeonatoId)
            .single();

        if (campeonatoError || !campeonatoData) {
          setSinAcceso(true);
          return;
        }

        setCampeonato(campeonatoData);

        // 4. Obtener las categorías del campeonato
        const { data: categoriasData, error: categoriasError } =
          await supabase
            .from('categorias')
            .select('id, nombre_categoria, equipos (id)')
            .eq('campeonato_id', campeonatoId)
            .order('creado_at', { ascending: true });

        if (categoriasError) {
          throw categoriasError;
        }

        const categoriasConConteo: Categoria[] = (
          categoriasData || []
        ).map((categoria: CategoriaConEquiposQuery) => ({
          id: categoria.id,
          nombre_categoria: categoria.nombre_categoria,
          total_equipos: Array.isArray(categoria.equipos)
            ? categoria.equipos.length
            : 0,
        }));

        setCategorias(categoriasConConteo);
      } catch (error: unknown) {
        console.error('Error al cargar campeonato del operador:', error);
        setSinAcceso(true);
      } finally {
        setLoading(false);
      }
    };

    if (campeonatoId) {
      cargarDatos();
    }
  }, [campeonatoId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />

          <p className="text-sm font-semibold text-slate-600">
            Cargando campeonato...
          </p>
        </div>
      </div>
    );
  }

  if (sinAcceso || !campeonato) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔒</div>

          <h1 className="text-xl font-bold text-slate-900">
            Acceso no disponible
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            No tienes autorización para acceder a este campeonato.
          </p>

          <Link
            href="/dashboard/operador"
            className="inline-flex mt-6 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition"
          >
            ← Volver a mis campeonatos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Encabezado */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Operador
            </p>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
              {campeonato.nombre_campeonato}
            </h1>

            <p className="text-xs text-slate-500 mt-1">
              Temporada {campeonato.anio}
            </p>
          </div>

          <Link
            href="/dashboard/operador"
            className="shrink-0 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl transition"
          >
            ← Mis campeonatos
          </Link>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Selecciona una categoría
          </p>

          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
            Categorías
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Elige la categoría que deseas operar.
          </p>
        </div>

        {categorias.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center">
            <div className="text-4xl mb-3">📁</div>

            <h3 className="font-bold text-slate-800">
              No hay categorías disponibles
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Este campeonato todavía no tiene categorías configuradas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categorias.map((categoria) => (
              <div
                key={categoria.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                      Categoría
                    </p>

                    <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                      {categoria.nombre_categoria}
                    </h3>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    ⚽
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-3">
                    {categoria.total_equipos}{' '}
                    {categoria.total_equipos === 1
                      ? 'equipo registrado'
                      : 'equipos registrados'}
                  </p>

                  <Link
                    href={`/dashboard/${campeonatoId}/categoria/${categoria.id}/operar`}
                    className="w-full inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition"
                  >
                    Operar (Mesa) →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
