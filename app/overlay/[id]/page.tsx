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

  const nombreLocal = partido.equipo_local?.nombre_equipo || 'LOCAL';
  const nombreVisita = partido.equipo_visita?.nombre_equipo || 'VISITA';
  
  // Mapeo seguro de periodo_actual
  let textoPeriodo = '1T';
  if (partido.periodo_actual === '2T') textoPeriodo = '2T';
  else if (partido.periodo_actual === 'entretiempo') textoPeriodo = 'ET';
  else if (partido.periodo_actual === 'no_iniciado') textoPeriodo = '1T';

  return (
    <div className="flex items-center justify-center h-screen bg-transparent p-4 font-sans">
      {/* Contenedor Principal del Marcador */}
      <div className="flex flex-col items-center select-none">
        
        <div className="flex items-center relative">
          
          {/* LADO IZQUIERDO (Equipo Local) con capas de fondo decorativas */}
          <div className="relative mr-4">
            {/* Franja verde trasera */}
            <div className="absolute -top-1 -left-3 right-0 -bottom-2 bg-[#008f4c] rounded-l-[40px] z-0"></div>
            {/* Franja roja intermedia */}
            <div className="absolute -top-1 -left-2 right-0 -bottom-1 bg-[#bd1522] rounded-l-[35px] z-1"></div>

            {/* Caja principal equipo local */}
            <div className="relative z-10 bg-[#031b4e] flex items-center h-[100px] rounded-l-[35px] pl-8 shadow-2xl">
              <span className="text-white text-4xl sm:text-5xl font-black uppercase tracking-wider truncate max-w-[220px]">
                {nombreLocal}
              </span>
              <div className="bg-[#175be6] text-white text-4xl sm:text-5xl font-black w-24 h-full flex items-center justify-center rounded-l-[30px] ml-6 shrink-0 shadow-inner">
                {partido.goles_local ?? 0}
              </div>
            </div>
          </div>

          {/* LOGO CENTRAL (logo_copa) */}
          <div className="relative z-30 mx-[-20px] flex items-center justify-center shrink-0">
            <img 
              className="w-20 h-auto drop-shadow-lg object-contain" 
              src="/logo_copa.png" 
              alt="Logo Copa" 
              onError={(e) => {
                // Oculta la imagen de manera segura si todavía no se ha colocado el archivo en public/
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* LADO DERECHO (Equipo Visita) */}
          <div className="relative ml-4">
            <div className="relative z-10 bg-[#031b4e] flex items-center h-[100px] rounded-r-[35px] pr-8 shadow-2xl">
              <div className="bg-[#175be6] text-white text-4xl sm:text-5xl font-black w-24 h-full flex items-center justify-center rounded-r-[30px] mr-6 shrink-0 shadow-inner">
                {partido.goles_visita ?? 0}
              </div>
              <span className="text-white text-4xl sm:text-5xl font-black uppercase tracking-wider truncate max-w-[220px]">
                {nombreVisita}
              </span>
            </div>
          </div>

        </div>

        {/* INDICADOR DE TIEMPO (Flotando abajo del marcador) */}
        <div className="mt-4 bg-[#17a06c] text-white text-2xl font-black px-8 py-1.5 rounded-full flex items-center gap-3 shadow-xl uppercase tracking-widest border border-emerald-500/30">
          <span className="w-4 h-4 bg-[#b3eccf] rounded-full animate-pulse inline-block shadow-sm"></span>
          <span>{textoPeriodo}</span>
        </div>

      </div>
    </div>  
  );
}