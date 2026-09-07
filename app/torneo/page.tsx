'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import VistaPublicaTorneoPage from './[id]/page'; // Tu vista detallada del torneo
import VistaPublicaHome from './campeonato/page'; // Tu carrusel y buscador de campeonatos

function PortalContenido() {
  const searchParams = useSearchParams();
  const verSelector = searchParams.get('ver') === 'selector';

  // Si estamos en modo selector, no necesitamos cargar nada, iniciamos con cargando en false
  const [cargando, setCargando] = useState(!verSelector);
  const [campeonatoIdDestacado, setCampeonatoIdDestacado] = useState<string | null>(null);

  useEffect(() => {
    // Si es el selector, salimos de inmediato sin llamar a ningun setState sincrónico
    if (verSelector) return;

    async function verificarPrincipal() {
      try {
        const { data } = await supabase
          .from('campeonatos')
          .select('id')
          .eq('destacado_principal', true)
          .maybeSingle();

        if (data && data.id) {
          setCampeonatoIdDestacado(data.id);
        } else {
          setCampeonatoIdDestacado(null);
        }
      } catch (err) {
        console.error('Error al verificar campeonato principal:', err);
      } finally {
        setCargando(false);
      }
    }

    verificarPrincipal();
  }, [verSelector]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center font-black text-xs uppercase tracking-widest animate-pulse">
        Sincronizando portal deportivo...
      </div>
    );
  }

  // Si estamos en modo selector (o no hay torneo destacado), renderizamos el header unificado + el carrusel abajo
  if (verSelector || !campeonatoIdDestacado) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {/* NAV UNIFICADO */}
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 w-full lg:w-auto justify-between lg:justify-start">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase block">Portal Oficial</span>
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white">Selección de Campeonatos</h1>
                </div>
              </div>
            </div>

            {/* Botones de navegación fijos */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 justify-start lg:justify-end scrollbar-none">
              <Link
                href="/torneo?ver=selector"
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 text-white shadow-lg shadow-blue-600/25 transition-all shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 22h16" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
                <span>Torneos</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Contenido del carrusel */}
        <main className="flex-1">
          <VistaPublicaHome />
        </main>
      </div>
    );
  }

  // Si hay un campeonato principal asignado, muestra su vista normal con su propio menú integrado
  return <VistaPublicaTorneoPage params={Promise.resolve({ id: campeonatoIdDestacado })} />;
}

export default function PortalTorneoEnrutador() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-500 flex items-center justify-center">Cargando...</div>}>
      <PortalContenido />
    </Suspense>
  );
}