'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Goleador {
  jugador_id: string;
  nombre_jugador: string;
  nombre_equipo: string;
  goles: number;
}

interface JugadorGlobalRelacion {
  nombre: string | null;
  apellido: string | null;
}

interface EquipoRelacionGoles {
  nombre_equipo: string | null;
  categoria_id: string | null;
}

interface DetallePartidoRow {
  goles: number | null;
  jugador_id: string;
  jugadores_globales: JugadorGlobalRelacion | JugadorGlobalRelacion[] | null;
  equipos: EquipoRelacionGoles | EquipoRelacionGoles[] | null;
}

export default function OverlayGoleadoresPage() {
  const params = useParams();
  const categoriaId = params?.id as string;

  const [goleadores, setGoleadores] = useState<Goleador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoriaId) return;

    async function fetchGoleadores() {
      try {
        const { data, error } = await supabase
          .from('detalles_partidos')
          .select(`
            goles,
            jugador_id,
            jugadores_globales:jugador_id (nombre, apellido),
            equipos:equipo_id (nombre_equipo, categoria_id)
          `)
          .gt('goles', 0);

        if (error) throw error;

        const detalles = (data || []) as unknown as DetallePartidoRow[];
        const goleadoresMap: { [key: string]: Goleador } = {};

        detalles.forEach((item) => {
          const eqRel = item.equipos;
          const equipoObj = Array.isArray(eqRel) ? eqRel[0] : eqRel;

          if (equipoObj?.categoria_id === categoriaId) {
            const jId = item.jugador_id;
            const jugRel = item.jugadores_globales;
            const jugadorObj = Array.isArray(jugRel) ? jugRel[0] : jugRel;

            const nombreCompleto = `${jugadorObj?.nombre || ''}${jugadorObj?.apellido || ''}`;
            const equipoNombre = equipoObj?.nombre_equipo || 'Sin equipo';

            if (!goleadoresMap[jId]) {
              goleadoresMap[jId] = {
                jugador_id: jId,
                nombre_jugador: nombreCompleto.trim(),
                nombre_equipo: equipoNombre,
                goles: 0,
              };
            }
            goleadoresMap[jId].goles += item.goles || 0;
          }
        });

        const listaGoleadores = Object.values(goleadoresMap);
        listaGoleadores.sort((a, b) => b.goles - a.goles);

        setGoleadores(listaGoleadores.slice(0, 5));
      } catch (err) {
        console.error('Error al cargar goleadores:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchGoleadores();
  }, [categoriaId]);

  if (loading) return <div className="h-screen bg-transparent"></div>;

  return (
    <div className="flex items-center justify-center h-screen bg-transparent p-4">
      <div className="w-[450px] bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white font-sans p-4">
        <div className="text-center pb-3 border-b border-slate-800 mb-2">
          <h2 className="text-xs font-black uppercase tracking-widest text-emerald-500">Tabla de Goleadores</h2>
        </div>
        <div className="space-y-2">
          {goleadores.map((g, index) => (
            <div key={g.jugador_id} className="flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-500 text-xs">{index + 1}</span>
                <div>
                  <p className="text-xs font-bold uppercase">{g.nombre_jugador}</p>
                  <p className="text-[10px] text-slate-400 uppercase">{g.nombre_equipo}</p>
                </div>
              </div>
              <div className="bg-emerald-600/20 text-white font-black text-sm px-3 py-1 rounded-lg">
                {g.goles}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}