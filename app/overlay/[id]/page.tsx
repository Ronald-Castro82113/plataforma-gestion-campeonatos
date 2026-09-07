'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

interface Equipo {
  nombre_equipo: string;
}

interface Partido {
  id: string;
  goles_local: number | null;
  goles_visita: number | null;
  periodo_actual?: string;
  estado?: string;
  equipo_local: Equipo;
  equipo_visita: Equipo;
}

export default function OverlayCategoriaPage() {
  const params = useParams();
  const categoriaId = params?.id as string;

  const [partido, setPartido] = useState<Partido | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoriaId) return;

    async function fetchPartidoEnVivo() {
      try {
        // Buscamos estrictamente el partido que esté en juego (en_vivo) en esta categoría
        const { data, error } = await supabase
          .from('partidos')
          .select(`
            id,
            goles_local,
            goles_visita,
            periodo_actual,
            estado,
            fases!inner(categoria_id),
            equipo_local:equipos!partidos_equipo_local_id_fkey(nombre_equipo),
            equipo_visita:equipos!partidos_equipo_visita_id_fkey(nombre_equipo)
          `)
          .eq('fases.categoria_id', categoriaId)
          .eq('estado', 'en_vivo')
          .limit(1);

        if (error) throw error;

        // Si hay un partido en vivo, lo asignamos; si no, queda en null (desaparece el overlay)
        if (data && data.length > 0) {
          setPartido(data[0] as unknown as Partido);
        } else {
          setPartido(null);
        }
      } catch (err) {
        console.error('Error al buscar partido en vivo para OBS:', err);
        setPartido(null);
      } finally {
        setLoading(false);
      }
    }

    fetchPartidoEnVivo();

    // Suscripción en tiempo real: se actualiza automáticamente al iniciar o finalizar partidos
    const channel = supabase
      .channel(`obs-categoria-vivo-${categoriaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partidos',
        },
        () => {
          fetchPartidoEnVivo();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoriaId]);

  // Mientras carga la primera conexión (mantiene transparente para OBS)
  if (loading) {
    return <div className="h-screen bg-transparent"></div>;
  }

  // SI NO HAY PARTIDO EN VIVO, RETORNA VACIO (TRANSPARENTE PARA OBS)
  if (!partido) {
    return <div className="h-screen bg-transparent"></div>;
  }

  const nombreLocal = partido.equipo_local?.nombre_equipo || 'Local';
  const nombreVisita = partido.equipo_visita?.nombre_equipo || 'Visita';
  
  // Mapeo seguro de periodo_actual
  let textoPeriodo = '1T';
  if (partido.periodo_actual === '2T') textoPeriodo = '2T';
  else if (partido.periodo_actual === 'entretiempo') textoPeriodo = 'ET';
  else if (partido.periodo_actual === 'no_iniciado') textoPeriodo = '1T';

  return (
    <div className="flex items-center justify-center h-screen bg-transparent p-4">
      {/* Contenedor principal con ancho fijo para adaptar nombres proporcionalmente */}
      <div className="flex flex-col items-center gap-2 w-[440px]">
        
        {/* Marcador Principal */}
        <div className="w-full flex items-center justify-between bg-blue-950 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white font-sans px-4 py-3">
          
          {/* Equipo Local */}
          <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
            <span className="font-bold text-sm sm:text-base tracking-wide truncate text-right uppercase mr-5">
              {nombreLocal}
            </span>
            <div className="bg-blue-600/90 text-white font-black text-lg sm:text-xl px-3.5 py-1.5 rounded-xl shadow-inner min-w-[42px] text-center shrink-0">
              {partido.goles_local ?? 0}
            </div>
          </div>

          {/* VS */}
          <div className="bg-black/15 rounded-xl mr-2 ml-2 px-1 py-1 text-slate-500 font-black text-[10px] italic tracking-widest shrink-0">
            VS
          </div>

          {/* Equipo Visita */}
          <div className="flex items-center gap-3 flex-1 justify-start min-w-0">
            <div className="bg-blue-600/90 text-white font-black text-lg sm:text-xl px-3.5 py-1.5 rounded-xl shadow-inner min-w-[42px] text-center shrink-0">
              {partido.goles_visita ?? 0}
            </div>
            <span className="font-bold text-sm sm:text-base tracking-wide truncate text-left uppercase ml-5">
              {nombreVisita}
            </span>
          </div>

        </div>

        {/* Indicador de Periodo (Flotando ABAJO del marcador) */}
        <div className="bg-emerald-600/90 backdrop-blur-md border border-blue-500/40 px-3.5 py-0.5 rounded-full text-white text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5">
          <span className="animate-pulse h-2 w-2 rounded-full bg-white inline-block"></span>
          <span>{textoPeriodo}</span>
        </div>

      </div>
    </div>  
  );
}