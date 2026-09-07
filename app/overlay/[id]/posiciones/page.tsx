'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface PosicionEquipo {
  equipo_id: string;
  nombre_equipo: string;
  puntos: number;
  jugados: number;
  goles_favor: number;
  goles_contra: number;
  diferencia_goles: number;
}

interface GrupoData {
  grupo_id: string;
  nombre_grupo: string;
  posiciones: PosicionEquipo[];
}

interface FaseRow {
  id: string;
}

interface GrupoRow {
  id: string;
  nombre_grupo: string;
}

interface EquipoRelacion {
  id: string;
  nombre_equipo: string;
}

interface GrupoEquipoRow {
  grupo_id: string;
  puntos_bonificacion: number | null;
  equipos: EquipoRelacion | EquipoRelacion[] | null;
}

interface PartidoRow {
  goles_local: number | null;
  goles_visita: number | null;
  estado: string | null;
  equipo_local_id: string;
  equipo_visita_id: string;
}

export default function OverlayPosicionesPage() {
  const params = useParams();
  const categoriaId = params?.id as string;

  const [gruposList, setGruposList] = useState<GrupoData[]>([]);
  const [activeGrupoIndex, setActiveGrupoIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoriaId) return;

    async function fetchPosicionesPorGrupos() {
      try {
        setLoading(true);

        const { data: fasesData, error: fasesError } = await supabase
          .from('fases')
          .select('id')
          .eq('categoria_id', categoriaId);

        if (fasesError) throw fasesError;
        if (!fasesData || fasesData.length === 0) {
          setLoading(false);
          return;
        }

        const faseIds = (fasesData as FaseRow[]).map(f => f.id);

        const { data: gruposData, error: gruposError } = await supabase
          .from('grupos')
          .select('id, nombre_grupo')
          .in('fase_id', faseIds);

        if (gruposError) throw gruposError;
        if (!gruposData || gruposData.length === 0) {
          setLoading(false);
          return;
        }

        const gruposRows = gruposData as GrupoRow[];
        const grupoIds = gruposRows.map(g => g.id);

        const { data: gruposEquiposData, error: geError } = await supabase
          .from('grupos_equipos')
          .select(`
            grupo_id,
            puntos_bonificacion,
            equipos:equipo_id (id, nombre_equipo)
          `)
          .in('grupo_id', grupoIds);

        if (geError) throw geError;

        const { data: partidosData, error: partError } = await supabase
          .from('partidos')
          .select(`
            goles_local,
            goles_visita,
            estado,
            equipo_local_id,
            equipo_visita_id,
            fases!inner(categoria_id)
          `)
          .eq('fases.categoria_id', categoriaId)
          .eq('estado', 'finalizado');

        if (partError) throw partError;

        const geRows = (gruposEquiposData || []) as unknown as GrupoEquipoRow[];
        const partidosList = (partidosData || []) as unknown as PartidoRow[];

        const processedGrupos: GrupoData[] = gruposRows.map(grupo => {
          const equiposEnGrupo = geRows.filter(ge => ge.grupo_id === grupo.id);
          const tablaMap: { [key: string]: PosicionEquipo } = {};

          equiposEnGrupo.forEach(ge => {
            const eqRel = ge.equipos;
            const eq = Array.isArray(eqRel) ? eqRel[0] : eqRel;
            if (eq) {
              tablaMap[eq.id] = {
                equipo_id: eq.id,
                nombre_equipo: eq.nombre_equipo,
                puntos: ge.puntos_bonificacion || 0,
                jugados: 0,
                goles_favor: 0,
                goles_contra: 0,
                diferencia_goles: 0,
              };
            }
          });

          const equipoIdsSet = new Set(Object.keys(tablaMap));

          partidosList.forEach(p => {
            const loc = p.equipo_local_id;
            const vis = p.equipo_visita_id;
            
            if (equipoIdsSet.has(loc) && equipoIdsSet.has(vis)) {
              const gLoc = p.goles_local || 0;
              const gVis = p.goles_visita || 0;

              if (tablaMap[loc]) {
                tablaMap[loc].jugados += 1;
                tablaMap[loc].goles_favor += gLoc;
                tablaMap[loc].goles_contra += gVis;
                if (gLoc > gVis) tablaMap[loc].puntos += 3;
                else if (gLoc === gVis) tablaMap[loc].puntos += 1;
              }

              if (tablaMap[vis]) {
                tablaMap[vis].jugados += 1;
                tablaMap[vis].goles_favor += gVis;
                tablaMap[vis].goles_contra += gLoc;
                if (gVis > gLoc) tablaMap[vis].puntos += 3;
                else if (gVis === gLoc) tablaMap[vis].puntos += 1;
              }
            }
          });

          const posicionesArray = Object.values(tablaMap).map(item => ({
            ...item,
            diferencia_goles: item.goles_favor - item.goles_contra,
          }));

          posicionesArray.sort((a, b) => {
            if (b.puntos !== a.puntos) return b.puntos - a.puntos;
            if (b.diferencia_goles !== a.diferencia_goles) return b.diferencia_goles - a.diferencia_goles;
            return b.goles_favor - a.goles_favor;
          });

          return {
            grupo_id: grupo.id,
            nombre_grupo: grupo.nombre_grupo,
            posiciones: posicionesArray,
          };
        });

        setGruposList(processedGrupos);
      } catch (err) {
        console.error('Error al calcular posiciones por grupos:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPosicionesPorGrupos();
  }, [categoriaId]);

  if (loading || gruposList.length === 0) {
    return <div className="h-screen bg-transparent"></div>;
  }

  const grupoActual = gruposList[activeGrupoIndex] || gruposList[0];

  return (
    <div className="flex items-center justify-center h-screen bg-transparent p-4">
      <div className="w-[500px] bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white font-sans p-4">
        
        <div className="pb-3 border-b border-slate-800 mb-3 flex flex-col items-center gap-2">
          <h2 className="text-xs font-black uppercase tracking-widest text-blue-400">Tabla de Posiciones</h2>
          
          {gruposList.length > 1 && (
            <div className="flex gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {gruposList.map((g, idx) => (
                <button
                  key={g.grupo_id}
                  onClick={() => setActiveGrupoIndex(idx)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all uppercase ${
                    activeGrupoIndex === idx 
                      ? 'bg-blue-600 text-white shadow' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {g.nombre_grupo}
                </button>
              ))}
            </div>
          )}

          {gruposList.length === 1 && (
            <span className="text-[11px] text-slate-400 uppercase font-semibold">{gruposList[0].nombre_grupo}</span>
          )}
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-800/60 uppercase">
              <th className="py-2 px-2">Pos</th>
              <th className="py-2 px-2">Equipo</th>
              <th className="py-2 px-2 text-center">PJ</th>
              <th className="py-2 px-2 text-center">DG</th>
              <th className="py-2 px-2 text-center font-bold text-white">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {grupoActual?.posiciones.map((item, index) => (
              <tr key={item.equipo_id} className="hover:bg-slate-900/40">
                <td className="py-2 px-2 font-black text-slate-500">{index + 1}</td>
                <td className="py-2 px-2 font-bold uppercase truncate max-w-[200px]">{item.nombre_equipo}</td>
                <td className="py-2 px-2 text-center text-slate-300">{item.jugados}</td>
                <td className="py-2 px-2 text-center text-slate-300">{item.diferencia_goles}</td>
                <td className="py-2 px-2 text-center font-black text-blue-400 text-sm">{item.puntos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}