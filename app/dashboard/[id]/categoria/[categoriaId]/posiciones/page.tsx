'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../../../../lib/supabase';
import Link from 'next/link';

interface FilaPosicion {
  grupo_id: string;
  equipo_id: string;
  nombre_equipo: string;
  logo_url: string | null;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
}

interface Grupo {
  id: string;
  nombre_grupo: string;
}

interface PartidoEliminacion {
  id: string;
  numero_fecha: string;
  goles_local: number | null;
  goles_visita: number | null;
  goles_penales_local: number | null;
  goles_penales_visita: number | null;
  estado: string;
  equipo_local: { nombre_equipo: string; logo_url: string | null } | null;
  equipo_visita: { nombre_equipo: string; logo_url: string | null } | null;
}

export default function PosicionesCategoriaPage({ 
  params 
}: { 
  params: Promise<{ id: string; categoriaId: string }> 
}) {
  const { id: campeonatoId, categoriaId } = use(params);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [posiciones, setPosiciones] = useState<FilaPosicion[]>([]);
  const [partidosEliminacion, setPartidosEliminacion] = useState<PartidoEliminacion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!categoriaId) return;

    const cargarTodoElCampeonato = async () => {
      setCargando(true);
      const { data: fasesData } = await supabase
        .from('fases')
        .select('id, tipo_formato')
        .eq('categoria_id', categoriaId)
        .eq('activa', true);

      if (fasesData && fasesData.length > 0) {
        const faseIds = fasesData.map((f) => f.id);

        // FASE DE GRUPOS
        const { data: gruposData } = await supabase
          .from('grupos')
          .select('id, nombre_grupo')
          .in('fase_id', faseIds);

        if (gruposData && gruposData.length > 0) {
          setGrupos(gruposData);
          const grupoIds = gruposData.map((g) => g.id);
          const { data: posicionesData } = await supabase
            .from('vista_posiciones_en_vivo')
            .select('*')
            .in('grupo_id', grupoIds);

          if (posicionesData) setPosiciones(posicionesData as FilaPosicion[]);
        } else {
          setGrupos([]);
          setPosiciones([]);
        }

        // ELIMINACIÓN DIRECTA
        const { data: partidosData } = await supabase
          .from('partidos')
          .select(`
            id,
            numero_fecha,
            goles_local,
            goles_visita,
            goles_penales_local,
            goles_penales_visita,
            estado,
            equipo_local:equipo_local_id(nombre_equipo, logo_url),
            equipo_visita:equipo_visita_id(nombre_equipo, logo_url)
          `)
          .in('fase_id', faseIds)
          .is('grupo_id', null);

        if (partidosData) {
          setPartidosEliminacion(partidosData as unknown as PartidoEliminacion[]);
        }
      }
      setCargando(false);
    };

    cargarTodoElCampeonato();

    const canalRealtime = supabase
      .channel(`realtime-posiciones-llaves-${categoriaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
          cargarTodoElCampeonato();
      })
      .subscribe();

    return () => { supabase.removeChannel(canalRealtime); };
  }, [categoriaId]);

  // Orden lógico personalizado para las rondas de eliminación
  const ordenRondas: { [key: string]: number } = {
    'octavos': 1,
    'cuartos': 2,
    'semifinal': 3,
    'semifinales': 3,
    'tercer puesto': 4,
    'tercer y cuarto puesto': 4,
    'final': 5,
    'gran final': 5,
  };

  const rondasExistentes = Array.from(new Set(partidosEliminacion.map(p => p.numero_fecha))).sort((a, b) => {
    const valA = ordenRondas[a.toLowerCase().trim()] || 99;
    const valB = ordenRondas[b.toLowerCase().trim()] || 99;
    return valA - valB;
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                Camino al Título en Vivo
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Estadísticas dinámicas y fases de eliminación.
            </p>
          </div>
          <div className="flex gap-2">
            {/* <Link href={`/dashboard/${campeonatoId}/categoria/${categoriaId}/operar`} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-sm transition">
              ⬅️ Volver a Operar
            </Link> */}
            <Link href={`/dashboard/${campeonatoId}/categoria/${categoriaId}/posiciones/generar`} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-sm transition">
              🏆 Configurar Llaves Finales
            </Link>
          </div>
        </div>

        {cargando ? (
          <div className="text-center py-12 text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
            Sincronizando el estado del torneo en vivo...
          </div>
        ) : (
          <>
            {grupos.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-sm font-black uppercase text-slate-400 tracking-widest">📌 Tablas de Posiciones</h2>
                {grupos.map((grupo) => {
                  const posicionesGrupo = posiciones.filter((p) => p.grupo_id === grupo.id);
                  return (
                    <div key={grupo.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                      <div className="bg-slate-900 px-6 py-3.5"><h3 className="text-xs font-black uppercase text-white">{grupo.nombre_grupo}</h3></div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b text-[10px] uppercase font-black text-slate-400">
                              <th className="py-3 px-4 text-center">Pos</th><th className="py-3 px-4">Equipo</th>
                              <th className="py-3 px-4 text-center">PJ</th><th className="py-3 px-4 text-center">PG</th>
                              <th className="py-3 px-4 text-center">PE</th><th className="py-3 px-4 text-center">PP</th>
                              <th className="py-3 px-4 text-center">GF</th><th className="py-3 px-4 text-center">GC</th>
                              <th className="py-3 px-4 text-center">DG</th><th className="py-3 px-6 text-center text-blue-600">Pts</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y text-xs font-bold text-slate-700">
                            {posicionesGrupo.map((fila, index) => (
                              <tr key={fila.equipo_id} className="hover:bg-slate-50/50">
                                <td className="py-3 px-4 text-center">{index + 1}</td>
                                <td className="py-3 px-4 uppercase"><div className="flex items-center gap-2">{fila.logo_url && <img src={fila.logo_url} className="w-4 h-4 object-contain" alt=""/>} {fila.nombre_equipo}</div></td>
                                <td className="py-3 px-4 text-center">{fila.pj}</td><td className="py-3 px-4 text-center text-emerald-600">{fila.pg}</td>
                                <td className="py-3 px-4 text-center text-amber-600">{fila.pe}</td><td className="py-3 px-4 text-center text-rose-600">{fila.pp}</td>
                                <td className="py-3 px-4 text-center">{fila.gf}</td><td className="py-3 px-4 text-center">{fila.gc}</td>
                                <td className="py-3 px-4 text-center">{fila.dg}</td><td className="py-3 px-6 text-center bg-blue-50/20 text-blue-600 font-black">{fila.pts}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {partidosEliminacion.length > 0 && (
              <div className="space-y-6 pt-4">
                {/* --- BANNER AUTOMÁTICO DE CAMPEÓN --- */}
                {(() => {
                  const partidoFinal = partidosEliminacion.find(p => {
                    const numFecha = (p.numero_fecha || '').toLowerCase().trim();
                    const estadoPartido = (p.estado || '').toLowerCase().trim();
                    
                    // Excluimos explícitamente "semifinal" para evitar falsos positivos
                    const esFinalReal = numFecha.includes('final') && !numFecha.includes('semi');
                    return esFinalReal && estadoPartido === 'finalizado';
                  });

                  if (!partidoFinal) return null;

                  const gLocal = Number(partidoFinal.goles_local) || 0;
                  const gVisita = Number(partidoFinal.goles_visita) || 0;
                  const pLocal = Number(partidoFinal.goles_penales_local) || 0;
                  const pVisita = Number(partidoFinal.goles_penales_visita) || 0;

                  let esLocalGanador = false;
                  let esVisitaGanador = false;

                  if (gLocal > gVisita) {
                    esLocalGanador = true;
                  } else if (gVisita > gLocal) {
                    esVisitaGanador = true;
                  } else {
                    if (pLocal > pVisita) {
                      esLocalGanador = true;
                    } else if (pVisita > pLocal) {
                      esVisitaGanador = true;
                    }
                  }

                  let nombreCampeon = null;
                  if (esLocalGanador && partidoFinal.equipo_local) {
                    nombreCampeon = partidoFinal.equipo_local.nombre_equipo;
                  } else if (esVisitaGanador && partidoFinal.equipo_visita) {
                    nombreCampeon = partidoFinal.equipo_visita.nombre_equipo;
                  }

                  if (!nombreCampeon) return null;

                  return (
                    <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 rounded-2xl p-6 text-white shadow-xl flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="bg-black/20 text-yellow-100 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider">
                          🏆 Torneo Concluido
                        </span>
                        <h2 className="text-2xl font-black tracking-tight">¡EQUIPO CAMPEÓN!</h2>
                        <p className="text-yellow-100 text-xs sm:text-sm font-bold mt-1">
                          El club <span className="underline decoration-2 underline-offset-4 uppercase">{nombreCampeon}</span> se consagra campeón indiscutible de esta categoría.
                        </p>
                      </div>
                      <div className="text-4xl sm:text-5xl bg-white/15 p-3 sm:p-4 rounded-2xl backdrop-blur-sm border border-white/20 shrink-0">
                        🏆
                      </div>
                    </div>
                  );
                })()}
                {/* ------------------------------------- */}
                <h2 className="text-sm font-black uppercase text-slate-400 tracking-widest">🏆 Llaves de Eliminación Directa</h2>
                <div className="grid grid-col-1 md:grid-cols-3 gap-6 items-start">
                  {rondasExistentes.map((rondaNombre) => {
                    const partidosDeRonda = partidosEliminacion.filter(p => p.numero_fecha === rondaNombre);
                    return (
                      <div key={rondaNombre} className="space-y-4">
                        <div className="bg-slate-200/70 text-slate-700 font-black uppercase text-[11px] text-center py-2 rounded-xl tracking-wider">
                          {rondaNombre}
                        </div>
                        {partidosDeRonda.map((partido) => {
                          const esVivo = partido.estado === 'en_vivo';
                          const esFin = partido.estado === 'finalizado';
                          return (
                            <div key={partido.id} className={`bg-white rounded-xl p-4 border shadow-sm space-y-3 relative overflow-hidden ${esVivo ? 'ring-2 ring-red-500 bg-red-50/10' : 'border-slate-200'}`}>
                              {esVivo && (<span className="absolute top-2 right-2 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>)}
                              
                              {/* Equipo Local */}
                              <div className="flex justify-between items-center text-xs font-black uppercase">
                                <div className="flex items-center gap-2 truncate">
                                  {partido.equipo_local?.logo_url && <img src={partido.equipo_local.logo_url} className="w-4 h-4 object-contain" alt=""/>}
                                  <span className={esFin && (partido.goles_local ?? 0) < (partido.goles_visita ?? 0) ? 'text-slate-400' : 'text-slate-900'}>{partido.equipo_local?.nombre_equipo || 'Por Clasificar'}</span>
                                </div>
                                <div className="flex gap-2">
                                  {partido.goles_penales_local !== null && <span className="text-[10px] text-slate-400">({partido.goles_penales_local})</span>}
                                  <span className={`text-sm font-black ${esVivo ? 'text-red-600' : 'text-slate-900'}`}>{partido.goles_local !== null ? partido.goles_local : '-'}</span>
                                </div>
                              </div>

                              {/* Equipo Visita */}
                              <div className="flex justify-between items-center text-xs font-black uppercase border-t pt-2">
                                <div className="flex items-center gap-2 truncate">
                                  {partido.equipo_visita?.logo_url && <img src={partido.equipo_visita.logo_url} className="w-4 h-4 object-contain" alt=""/>}
                                  <span className={esFin && (partido.goles_visita ?? 0) < (partido.goles_local ?? 0) ? 'text-slate-400' : 'text-slate-900'}>{partido.equipo_visita?.nombre_equipo || 'Por Clasificar'}</span>
                                </div>
                                <div className="flex gap-2">
                                  {partido.goles_penales_visita !== null && <span className="text-[10px] text-slate-400">({partido.goles_penales_visita})</span>}
                                  <span className={`text-sm font-black ${esVivo ? 'text-red-600' : 'text-slate-900'}`}>{partido.goles_visita !== null ? partido.goles_visita : '-'}</span>
                                </div>
                              </div>
                              <div className="text-[10px] text-center font-bold tracking-widest text-slate-400 uppercase pt-1">{esVivo ? '🔥 EN VIVO' : esFin ? '🏁 FINALIZADO' : '⏳ PROGRAMADO'}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}