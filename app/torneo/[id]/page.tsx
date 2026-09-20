'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import InstalarApp from '../InstalarApp';

interface Campeonato {
  id: string;
  nombre_campeonato: string;
  anio: number;
}

interface Categoria {
  id: string;
  nombre_categoria: string;
  url_transmision?: string | null;
}

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

interface DetalleIncidencia {
  jugador_nombre: string;
  goles: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
  equipo_id: string;
}

interface EquipoInfo {
  nombre_equipo: string;
  logo_url: string | null;
}

interface PartidoPublico {
  id: string;
  numero_fecha: string;
  orden: number;
  goles_local: number | null;
  goles_visita: number | null;
  goles_penales_local: number | null;
  goles_penales_visita: number | null;
  estado: 'programado' | 'en_vivo' | 'finalizado' | 'suspendido';
  periodo_actual: string;
  lugar: string | null;
  fecha_partido: string | null;
  grupo_id: string | null;
  equipo_local_id: string;
  equipo_visita_id: string;
  equipo_local: EquipoInfo | null;
  equipo_visita: EquipoInfo | null;
  detalles?: DetalleIncidencia[];
}

interface Goleador {
  nombre: string;
  equipo: string;
  logo: string | null;
  goles: number;
}

interface RawPartidoData {
  id: string;
  numero_fecha: string;
  orden: number;
  goles_local: number | null;
  goles_visita: number | null;
  goles_penales_local: number | null;
  goles_penales_visita: number | null;
  estado: 'programado' | 'en_vivo' | 'finalizado' | 'suspendido';
  periodo_actual: string;
  lugar: string | null;
  fecha_partido: string | null;
  grupo_id: string | null;
  equipo_local_id: string;
  equipo_visita_id: string;
  equipo_local: EquipoInfo | EquipoInfo[] | null;
  equipo_visita: EquipoInfo | EquipoInfo[] | null;
}

interface RawDetalleData {
  partido_id: string;
  goles: number | null;
  tarjetas_amarillas: number | null;
  tarjetas_rojas: number | null;
  equipo_id: string;
  jugadores_globales: { nombre: string; apellido: string } | { nombre: string; apellido: string }[] | null;
}

interface RawGoleadorData {
  goles: number | null;
  jugador_id: string;
  jugadores_globales: { nombre: string; apellido: string } | { nombre: string; apellido: string }[] | null;
  equipos: { nombre_equipo: string; logo_url: string | null } | { nombre_equipo: string; logo_url: string | null }[] | null;
}

interface CarruselPartidosProps {
  partidos: PartidoPublico[];
  nombreTorneo?: string;
}

// Función para ordenar lógicamente las fases en el carrusel y llaves
const obtenerPesoFasePublica = (nombreFecha: string): number => {
  const fase = (nombreFecha || '').toLowerCase().trim();
  if (fase.includes('dieciseisavos')) return 1;
  if (fase.includes('octavos')) return 2;
  if (fase.includes('cuartos')) return 3;
  if (fase.includes('semifinal')) return 4;
  if (fase.includes('tercer') || fase.includes('tercero')) return 5;
  if (fase.includes('final') && !fase.includes('semifinal')) return 6;
  return 0; // Para las jornadas normales de grupos (ej. "Jornada 1", "1", etc.)
};

function CarruselPartidos({ partidos, nombreTorneo }: CarruselPartidosProps) {
  const [partidoSeleccionadoModal, setPartidoSeleccionadoModal] = useState<PartidoPublico | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          {nombreTorneo ? `${nombreTorneo} · ` : ''}PARTIDOS DE LA JORNADA
        </h2>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:block">Desliza para ver más →</span>
      </div>

      {partidos.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">No hay partidos programados todavía en esta categoría.</p>
        </div>
      ) : (
        <div className="flex overflow-x-auto gap-5 pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900/40">
          {partidos.map((partido) => {
            const esVivo = partido.estado === 'en_vivo';
            const esFin = partido.estado === 'finalizado';
            const golesLocal = partido.goles_local;
            const golesVisita = partido.goles_visita;

            return (
              <div
                key={partido.id}
                className="min-w-[340px] max-w-[340px] shrink-0 snap-center"
              >
                <div
                  className={`relative rounded-2xl border backdrop-blur-sm overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                    esVivo
                      ? 'bg-gradient-to-br from-emerald-950/50 to-emerald-800 border-emerald-500/50 shadow-lg shadow-red-950/20'
                      : 'bg-slate-800/90 border-slate-700/80 hover:border-slate-600 shadow-md'
                  }`}
                >
                  {esVivo && (
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-green-500 to-transparent animate-pulse" />
                  )}

                  {/* Header de la tarjeta */}
                  <div className="px-4 py-3 flex justify-between items-center border-b border-slate-700/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      {partido.numero_fecha || 'Fecha'}
                    </span>
                    <span
                      className={`flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg shrink-0 ${
                        esVivo
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : esFin
                          ? 'bg-slate-700/80 text-slate-300 border border-slate-600/50'
                          : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {esVivo && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />}
                      {esVivo ? 'EN VIVO' : esFin ? 'FINALIZADO' : 'PROGRAMADO'}
                    </span>
                  </div>

                  {/* Cuerpo de equipos con más espacio y mejor contraste */}
                  <div className="p-4 space-y-3">
                    {/* Equipo Local */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {partido.equipo_local?.logo_url ? (
                            <img src={partido.equipo_local.logo_url} className="w-full h-full object-contain p-1" alt="" />
                          ) : (
                            <span className="text-xs font-bold text-blue-400">
                              {partido.equipo_local?.nombre_equipo?.charAt(0) || 'L'}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs font-bold uppercase truncate ${
                          esFin && (golesLocal ?? 0) < (golesVisita ?? 0) ? 'text-slate-400' : 'text-white'
                        }`}>
                          {partido.equipo_local?.nombre_equipo || 'Por definir'}
                        </span>
                      </div>
                      <span className="font-mono font-black text-sm text-white px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/50 min-w-[32px] text-center shadow-sm">
                        {golesLocal !== null ? golesLocal : '-'}
                      </span>
                    </div>

                    {/* Equipo Visita */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {partido.equipo_visita?.logo_url ? (
                            <img src={partido.equipo_visita.logo_url} className="w-full h-full object-contain p-1" alt="" />
                          ) : (
                            <span className="text-xs font-bold text-purple-400">
                              {partido.equipo_visita?.nombre_equipo?.charAt(0) || 'V'}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs font-bold uppercase truncate ${
                          esFin && (golesVisita ?? 0) < (golesLocal ?? 0) ? 'text-slate-400' : 'text-white'
                        }`}>
                          {partido.equipo_visita?.nombre_equipo || 'Por definir'}
                        </span>
                      </div>
                      <span className="font-mono font-black text-sm text-white px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/50 min-w-[32px] text-center shadow-sm">
                        {golesVisita !== null ? golesVisita : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Footer de la tarjeta */}
                  <div className="border-t border-slate-700/60 px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-300 bg-slate-800/50">
                    <span className="truncate flex items-center gap-1.5 font-medium">
                      {/* 📍 {partido.lugar || 'Cancha Central'} */}
                    </span>
                    <button 
                      onClick={() => setPartidoSeleccionadoModal(partido)}
                      className="text-blue-400 hover:text-blue-300 font-bold transition-colors cursor-pointer">
                      Detalles
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Modal de Incidencias del Partido */}
      {partidoSeleccionadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Incidencias del Partido</span>
                <h3 className="text-sm font-black text-white uppercase mt-0.5">
                  {partidoSeleccionadoModal.numero_fecha || 'Detalles'}
                </h3>
              </div>
              <button
                onClick={() => setPartidoSeleccionadoModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center p-1">
                    {partidoSeleccionadoModal.equipo_local?.logo_url ? (
                      <img src={partidoSeleccionadoModal.equipo_local.logo_url} className="w-full h-full object-contain" alt="" />
                    ) : (
                      <span>⚽</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase">{partidoSeleccionadoModal.equipo_local?.nombre_equipo || 'Local'}</p>
                  </div>
                </div>
                <div className="text-lg font-black font-mono text-white px-3 py-1 bg-slate-900 rounded-lg border border-slate-800">
                  {partidoSeleccionadoModal.goles_local ?? 0} - {partidoSeleccionadoModal.goles_visita ?? 0}
                </div>
                <div className="flex items-center gap-3 text-right flex-row-reverse">
                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center p-1">
                    {partidoSeleccionadoModal.equipo_visita?.logo_url ? (
                      <img src={partidoSeleccionadoModal.equipo_visita.logo_url} className="w-full h-full object-contain" alt="" />
                    ) : (
                      <span>⚽</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase">{partidoSeleccionadoModal.equipo_visita?.nombre_equipo || 'Visita'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Goles y Tarjetas</h4>
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 max-h-60 overflow-y-auto space-y-2 text-xs font-bold">
                  {(!partidoSeleccionadoModal.detalles || partidoSeleccionadoModal.detalles.length === 0) ? (
                    <p className="text-slate-500 text-center py-4 italic text-[11px]">No hay incidencias registradas en este encuentro.</p>
                  ) : (
                    partidoSeleccionadoModal.detalles.map((d, idx) => {
                      const esLocal = d.equipo_id === partidoSeleccionadoModal.equipo_local_id;
                      const nombreEquipo = esLocal 
                        ? partidoSeleccionadoModal.equipo_local?.nombre_equipo 
                        : partidoSeleccionadoModal.equipo_visita?.nombre_equipo;

                      return (
                        <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0">
                          <div className="flex items-center gap-2">
                            {d.goles > 0 && <span className="text-base">⚽</span>}
                            {d.tarjetas_amarillas > 0 && <span className="text-base">🟨</span>}
                            {d.tarjetas_rojas > 0 && <span className="text-base">🟥</span>}
                            <div>
                              <span className="text-white uppercase font-black">{d.jugador_nombre}</span>
                              <span className="text-[10px] text-slate-400 block">{nombreEquipo}</span>
                            </div>
                          </div>
                          <div className="text-slate-300 font-mono text-xs">
                            {d.goles > 0 && <span className="text-blue-400 font-black mr-2">+{d.goles} Gol{d.goles > 1 ? 'es' : ''}</span>}
                            {d.tarjetas_amarillas > 0 && <span className="text-yellow-400 font-bold">Tarjeta Amarilla</span>}
                            {d.tarjetas_rojas > 0 && <span className="text-red-400 font-bold">Tarjeta Roja</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setPartidoSeleccionadoModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VistaPublicaTorneoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campeonatoId } = use(params);

  const [campeonato, setCampeonato] = useState<Campeonato | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('');
  
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [posiciones, setPosiciones] = useState<FilaPosicion[]>([]);
  const [partidos, setPartidos] = useState<PartidoPublico[]>([]);
  const [goleadores, setGoleadores] = useState<Goleador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);

  const [seccionActiva, setSeccionActiva] = useState<'partidos' | 'posiciones' | 'goleadores' | 'stream'>('partidos');

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const cargarDatosGenerales = async () => {
      try {
        const { data: torneo } = await supabase
          .from('campeonatos')
          .select('id, nombre_campeonato, anio')
          .eq('id', campeonatoId)
          .single();

        if (torneo) setCampeonato(torneo);

        const { data: cats } = await supabase
          .from('categorias')
          .select('id, nombre_categoria, url_transmision')
          .eq('campeonato_id', campeonatoId);

        if (cats && cats.length > 0) {
          setCategorias(cats);
          setCategoriaSeleccionada(cats[0].id);
        }
      } catch (error) {
        console.error('Error al cargar datos públicos:', error);
      }
    };

    cargarDatosGenerales();
  }, [campeonatoId]);

  useEffect(() => {
    if (!categoriaSeleccionada) return;

    const cargarDatosCategoria = async (isInitial = false) => {
      if (isInitial) setCargando(true);
      try {
        const { data: fasesData } = await supabase
          .from('fases')
          .select('id')
          .eq('categoria_id', categoriaSeleccionada)
          .eq('activa', true);

        if (fasesData && fasesData.length > 0) {
          const faseIds = fasesData.map((f: { id: string }) => f.id);

          const { data: gruposData } = await supabase
            .from('grupos')
            .select('id, nombre_grupo')
            .in('fase_id', faseIds);

          if (gruposData && gruposData.length > 0) {
            setGrupos(gruposData);
            const grupoIds = gruposData.map((g: { id: string }) => g.id);
            const { data: posData } = await supabase
              .from('vista_posiciones_en_vivo')
              .select('*')
              .in('grupo_id', grupoIds);

            if (posData) setPosiciones(posData as FilaPosicion[]);
          } else {
            setGrupos([]);
            setPosiciones([]);
          }

          const { data: partidosData } = await supabase
            .from('partidos')
            .select(`
              id,
              numero_fecha,
              orden,
              goles_local,
              goles_visita,
              goles_penales_local,
              goles_penales_visita,
              estado,
              periodo_actual,
              lugar,
              fecha_partido,
              grupo_id,
              equipo_local_id,
              equipo_visita_id,
              equipo_local:equipo_local_id(nombre_equipo, logo_url),
              equipo_visita:equipo_visita_id(nombre_equipo, logo_url)
            `)
            .in('fase_id', faseIds)
            .order('orden', { ascending: true});

          if (partidosData) {
            const rawPartidos = partidosData as RawPartidoData[];
            const partidoIds = rawPartidos.map((p) => p.id);
            const detallesMap: Record<string, DetalleIncidencia[]> = {};

            if (partidoIds.length > 0) {
              const { data: detallesData } = await supabase
                .from('detalles_partidos')
                .select(`
                  partido_id,
                  goles,
                  tarjetas_amarillas,
                  tarjetas_rojas,
                  equipo_id,
                  jugadores_globales:jugador_id(nombre, apellido)
                `)
                .in('partido_id', partidoIds);

              if (detallesData) {
                const rawDetalles = detallesData as RawDetalleData[];
                rawDetalles.forEach((d) => {
                  if (!detallesMap[d.partido_id]) {
                    detallesMap[d.partido_id] = [];
                  }
                  const jRaw = d.jugadores_globales;
                  const j = Array.isArray(jRaw) ? jRaw[0] : jRaw;
                  const nombreJugador = j ? `${j.nombre} ${j.apellido}` : 'Jugador';

                  detallesMap[d.partido_id].push({
                    jugador_nombre: nombreJugador,
                    goles: d.goles || 0,
                    tarjetas_amarillas: d.tarjetas_amarillas || 0,
                    tarjetas_rojas: d.tarjetas_rojas || 0,
                    equipo_id: d.equipo_id
                  });
                });
              }
            }

            const partidosConDetalles: PartidoPublico[] = rawPartidos.map((p) => ({
              ...p,
              equipo_local: Array.isArray(p.equipo_local) ? p.equipo_local[0] : p.equipo_local,
              equipo_visita: Array.isArray(p.equipo_visita) ? p.equipo_visita[0] : p.equipo_visita,
              detalles: detallesMap[p.id] || []
            }));

            setPartidos(partidosConDetalles);

            if (partidoIds.length > 0) {
              const { data: todosDetalles } = await supabase
                .from('detalles_partidos')
                .select(`
                  goles,
                  jugador_id,
                  jugadores_globales:jugador_id(nombre, apellido),
                  equipos:equipo_id(nombre_equipo, logo_url)
                `)
                .in('partido_id', partidoIds);

              if (todosDetalles) {
                const rawTodosDetalles = todosDetalles as RawGoleadorData[];
                const mapGoleadores: Record<string, Goleador> = {};
                
                rawTodosDetalles.forEach((item) => {
                  const jRaw = item.jugadores_globales;
                  const j = Array.isArray(jRaw) ? jRaw[0] : jRaw;
                  const eqRaw = item.equipos;
                  const eq = Array.isArray(eqRaw) ? eqRaw[0] : eqRaw;

                  if (!j) return;
                  const nombreCompleto = `${j.nombre} ${j.apellido}`;
                  const equipoNombre = eq?.nombre_equipo || 'Sin equipo';
                  const equipoLogo = eq?.logo_url || null;

                  if (!mapGoleadores[item.jugador_id]) {
                    mapGoleadores[item.jugador_id] = {
                      nombre: nombreCompleto,
                      equipo: equipoNombre,
                      logo: equipoLogo,
                      goles: 0,
                    };
                  }
                  mapGoleadores[item.jugador_id].goles += item.goles || 0;
                });

                const listaOrdenada = Object.values(mapGoleadores)
                  .sort((a, b) => b.goles - a.goles)
                  .slice(0, 10);

                setGoleadores(listaOrdenada);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error al sincronizar categoría:', error);
      } finally {
        if (isInitial) setCargando(false);
      }
    };

    cargarDatosCategoria(true);

    const canalRealtime = supabase
      .channel(`publico-torneopro-rt-${categoriaSeleccionada}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
        cargarDatosCategoria(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detalles_partidos' }, () => {
        cargarDatosCategoria(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalRealtime);
    };
  }, [categoriaSeleccionada]);

  const partidosEnVivo = partidos.filter((p) => p.estado === 'en_vivo');
  const partidosEliminacion = partidos.filter((p) => p.grupo_id === null);
  const rondasExistentes = Array.from(new Set(partidosEliminacion.map((p) => p.numero_fecha))).sort((a, b) => {
    return obtenerPesoFasePublica(a) - obtenerPesoFasePublica(b);
  });

  const obtenerUrlEmbed = (url: string) => {
    if (!url) return '';
    
    // Soporte para YouTube con autoplay y silencio obligatorio
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0`;
    }
    
    // Soporte para Facebook Live / Videos con autoplay y silencio obligatorio
    if (url.includes('facebook.com')) {
      const encodedUrl = encodeURIComponent(url);
      return `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&autoplay=true&mute=0`;
    }

    return url;
  };

  const partidoFinal = partidosEliminacion.find((p) => {
    const nf = (p.numero_fecha || '').toLowerCase().trim();
    return (nf === 'final' || nf === 'gran final') && p.estado === 'finalizado';
  }) || partidosEliminacion.find((p) => (p.numero_fecha || '').toLowerCase().includes('final') && p.estado === 'finalizado');

  let nombreCampeon: string | null = null;
  if (partidoFinal) {
    const gL = Number(partidoFinal.goles_local) || 0;
    const gV = Number(partidoFinal.goles_visita) || 0;
    const pL = Number(partidoFinal.goles_penales_local) || 0;
    const pV = Number(partidoFinal.goles_penales_visita) || 0;

    if (gL > gV || (gL === gV && pL > pV)) {
      nombreCampeon = partidoFinal.equipo_local?.nombre_equipo || null;
    } else if (gV > gL || (gL === gV && pV > pL)) {
      nombreCampeon = partidoFinal.equipo_visita?.nombre_equipo || null;
    }
  }

  // 1. Filtrar el tercer puesto si no tiene equipos asignados
  const partidosFiltrados = partidos.filter((p) => {
    const nf = (p.numero_fecha || '').toLowerCase();
    if (nf.includes('tercer') || nf.includes('tercero')) {
      return p.fecha_partido !== null && p.fecha_partido !== '';
    }
    return true;
  });

  // 2. Ordenar los partidos estrictamente por jerarquía de fases
  const partidosOrdenadosCarrusel = [...partidosFiltrados].sort((a, b) => {
    const pesoA = obtenerPesoFasePublica(a.numero_fecha);
    const pesoB = obtenerPesoFasePublica(b.numero_fecha);

    if (pesoA !== pesoB) {
      return pesoA - pesoB;
    }
    return (a.orden || 0) - (b.orden || 0);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      <header className="bg-[#0f172a] backdrop-blur-md border-b border-slate-800/80 px-6 py-4 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
          {/* Izquierda: Icono, Subtítulo, Badge y Título */}
          <div className="flex items-center space-x-3.5 w-full lg:w-auto justify-start">
            <img src="/logo_cs_torneo.png" alt="Casmi Sports" className="h-10 w-auto object-contain"/>
            <div className="h-10 w-px bg-slate-600/70" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Portal Oficial del Campeonato</span>
                {/* <span className="px-2.5 py-0.5 text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full uppercase tracking-wider">Senior</span> */}
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white mt-0.5 flex items-center gap-2">
                {campeonato?.nombre_campeonato || 'Cargando Torneo...'} 
                <span className="text-slate-400 text-base font-normal">({campeonato?.anio})</span>
              </h1>
            </div>
          </div>

          {/* Derecha: Botones de navegación alineados horizontalmente */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 justify-start lg:justify-end scrollbar-none">
            {/* Botón para cambiar o seleccionar torneo */}
            <Link
              href="/torneo?ver=selector"
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-all shrink-0 border border-slate-700"
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
            <button
              onClick={() => setSeccionActiva('partidos')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                seccionActiva === 'partidos'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
              <span>Partidos</span>
            </button>

            <button
              onClick={() => setSeccionActiva('posiciones')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                seccionActiva === 'posiciones'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 3v18" />
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M3 15h18" />
              </svg>
              <span>Posiciones & Llaves</span>
            </button>

            <button
              onClick={() => setSeccionActiva('goleadores')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                seccionActiva === 'goleadores'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="6" />
                <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
              </svg>
              <span>Goleadores</span>
            </button>

            <button
              onClick={() => setSeccionActiva('stream')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative shrink-0 ${
                seccionActiva === 'stream'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
                <polyline points="17 2 12 7 7 2" />
              </svg>
              <span>Señal en Vivo</span>
            </button>
          </div>
        </div>

        {/*Barra de pestañas desplegable para seleccionar la categoría */}
        {categorias.length > 0 && (
          <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-3 overflow-x-auto scrollbar-none">
            <span className="text-[12px] font-black uppercase tracking-widest shrink-0 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Categoría:
            </span>
            <div className="flex items-center gap-2">
              {categorias.map((cat) => {
                const esActiva = categoriaSeleccionada === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaSeleccionada(cat.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all shrink-0 cursor-pointer ${
                      esActiva
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-blue-500/25 '
                        : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {cat.nombre_categoria}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <InstalarApp />
        {cargando ? (
          <div className="text-center py-24 text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">
            Sincronizando portal deportivo en tiempo real...
          </div>
        ) : (
          <>
            {nombreCampeon && (
              seccionActiva === 'partidos' && nombreCampeon && partidoFinal && partidoFinal.estado === 'finalizado' && (
                <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 rounded-2xl p-6 text-slate-950 shadow-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="bg-black/20 text-yellow-50 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
                      🏆 Torneo Concluido
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">¡EQUIPO CAMPEÓN!</h2>
                    <p className="text-yellow-100 text-xs sm:text-sm font-bold">
                      El club <span className="underline decoration-2 underline-offset-4 uppercase font-black text-white">{nombreCampeon}</span> se consagra campeón indiscutible.
                    </p>
                  </div>
                  <div className="text-4xl sm:text-6xl bg-white/20 p-4 rounded-2xl backdrop-blur-sm border border-white/30 shrink-0">
                    🏆
                  </div>
                </div>
              )
            )}

            {seccionActiva === 'partidos' && (
              <div className="space-y-8">
                {partidosEnVivo.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-emerald-600 animate-ping"></span>
                      <h2 className="text-xs font-black uppercase tracking-widest text-emerald-500">Partidos en Vivo Ahora</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      {partidosEnVivo.map((p) => {
                        const golesLocal = p.detalles?.filter(d => d.equipo_id === p.equipo_local_id && d.goles > 0) || [];
                        const golesVisita = p.detalles?.filter(d => d.equipo_id === p.equipo_visita_id && d.goles > 0) || [];
                        const amarillasLocal = p.detalles?.filter(d => d.equipo_id === p.equipo_local_id && d.tarjetas_amarillas > 0) || [];
                        const amarillasVisita = p.detalles?.filter(d => d.equipo_id === p.equipo_visita_id && d.tarjetas_amarillas > 0) || [];
                        const rojasLocal = p.detalles?.filter(d => d.equipo_id === p.equipo_local_id && d.tarjetas_rojas > 0) || [];
                        const rojasVisita = p.detalles?.filter(d => d.equipo_id === p.equipo_visita_id && d.tarjetas_rojas > 0) || [];

                        // Componente de escudo blanco genérico basado en la referencia
                        const ShieldIcon = ({ className = "w-6 h-6 text-white" }) => (
                          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"/>
                          </svg>
                        );

                        return (
                          <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden">
                            <div className="bg-slate-950/80 px-6 py-3 border-b border-slate-800 flex justify-between items-center text-xs font-black uppercase tracking-wider">
                              <span className="text-slate-400 flex items-center gap-2">
                                🏆 {campeonato?.nombre_campeonato || 'Torneo'} · Jornada {p.numero_fecha}
                              </span>
                              <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] flex items-center gap-1.5 shadow-sm">
                                <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
                                {p.periodo_actual || 'EN VIVO'}
                              </span>
                            </div>

                            {/* VISTA CELULAR (Escudo arriba del nombre y alineado verticalmente) */}
                            <div className="flex md:hidden items-center justify-between p-4 gap-2 bg-slate-900">
                              <div className="flex flex-col items-center text-center flex-1 min-w-0 space-y-1.5">
                                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-2 shadow-inner">
                                  {p.equipo_local?.logo_url ? (
                                    <img src={p.equipo_local.logo_url} className="w-full h-full object-contain" alt="" />
                                  ) : (
                                    <ShieldIcon className="w-6 h-6 text-white" />
                                  )}
                                </div>
                                <span className="font-black text-xs uppercase text-white truncate w-full">{p.equipo_local?.nombre_equipo || 'Local'}</span>
                              </div>

                              <div className="shrink-0 px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-lg font-black text-emerald-400 font-mono tracking-wider shadow-inner flex items-center gap-1">
                                <span>{p.goles_local ?? 0}</span>
                                <span className="text-slate-600 font-light">-</span>
                                <span>{p.goles_visita ?? 0}</span>
                              </div>

                              <div className="flex flex-col items-center text-center flex-1 min-w-0 space-y-1.5">
                                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-2 shadow-inner">
                                  {p.equipo_visita?.logo_url ? (
                                    <img src={p.equipo_visita.logo_url} className="w-full h-full object-contain" alt="" />
                                  ) : (
                                    <ShieldIcon className="w-6 h-6 text-white" />
                                  )}
                                </div>
                                <span className="font-black text-xs uppercase text-white truncate w-full">{p.equipo_visita?.nombre_equipo || 'Visita'}</span>
                              </div>
                            </div>

                            {/* VISTA LAPTOP (Diseño original con escudo blanco si no hay logo) */}
                            <div className="hidden md:grid grid-cols-3 items-center gap-6 p-8 text-center">
                              <div className="flex flex-col items-center space-y-3">
                                <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center p-3 shadow-inner">
                                  {p.equipo_local?.logo_url ? (
                                    <img src={p.equipo_local.logo_url} className="w-full h-full object-contain" alt="" />
                                  ) : (
                                    <ShieldIcon className="w-10 h-10 text-white" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-black text-base uppercase text-white tracking-tight">{p.equipo_local?.nombre_equipo || 'Local'}</h3>
                                </div>
                              </div>

                              <div className="flex flex-col items-center justify-center space-y-2">
                                <div className="flex items-center gap-3 text-5xl font-black text-white tracking-wider">
                                  <span>{p.goles_local ?? 0}</span>
                                  <span className="text-slate-600 font-light">:</span>
                                  <span>{p.goles_visita ?? 0}</span>
                                </div>
                              </div>

                              <div className="flex flex-col items-center space-y-3">
                                <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center p-3 shadow-inner">
                                  {p.equipo_visita?.logo_url ? (
                                    <img src={p.equipo_visita.logo_url} className="w-full h-full object-contain" alt="" />
                                  ) : (
                                    <ShieldIcon className="w-10 h-10 text-white" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-black text-base uppercase text-white tracking-tight">{p.equipo_visita?.nombre_equipo || 'Visita'}</h3>
                                </div>
                              </div>
                            </div>

                            {/* Incidencias perfectamente alineadas verticalmente con sus equipos */}
                            <div className="bg-slate-950/60 border-t border-slate-800 p-4 md:px-8">
                              {/* Laptop: 3 columnas (Col 1: Local, Col 2: Centro vacío, Col 3: Visita) */}
                              <div className="hidden md:grid grid-cols-3 gap-6 text-xs font-bold">
                                <div className="space-y-1.5 text-left">
                                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-2">Incidencias · {p.equipo_local?.nombre_equipo || 'Local'}</p>
                                  {golesLocal.length === 0 && amarillasLocal.length === 0 && rojasLocal.length === 0 ? (
                                    <span className="text-slate-600 italic text-[11px]">Sin incidencias registradas</span>
                                  ) : (
                                    <>
                                      {golesLocal.map((g, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 text-slate-300">
                                          <span>⚽</span>
                                          <span className="uppercase text-white font-black">{g.jugador_nombre}</span>
                                          {g.goles > 1 && <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1 rounded">x{g.goles}</span>}
                                        </div>
                                      ))}
                                      {amarillasLocal.map((a, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 text-yellow-400">
                                          <span>🟨</span>
                                          <span className="uppercase text-slate-200">{a.jugador_nombre}</span>
                                        </div>
                                      ))}
                                      {rojasLocal.map((r, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 text-red-400">
                                          <span>🟥</span>
                                          <span className="uppercase text-slate-200">{r.jugador_nombre}</span>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                </div>

                                <div></div>

                                <div className="space-y-1.5 text-left">
                                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-400 mb-2">Incidencias · {p.equipo_visita?.nombre_equipo || 'Visita'}</p>
                                  {golesVisita.length === 0 && amarillasVisita.length === 0 && rojasVisita.length === 0 ? (
                                    <span className="text-slate-600 italic text-[11px]">Sin incidencias registradas</span>
                                  ) : (
                                    <>
                                      {golesVisita.map((g, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 text-slate-300">
                                          <span>⚽</span>
                                          <span className="uppercase text-white font-black">{g.jugador_nombre}</span>
                                          {g.goles > 1 && <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1 rounded">x{g.goles}</span>}
                                        </div>
                                      ))}
                                      {amarillasVisita.map((a, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 text-yellow-400">
                                          <span>🟨</span>
                                          <span className="uppercase text-slate-200">{a.jugador_nombre}</span>
                                        </div>
                                      ))}
                                      {rojasVisita.map((r, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 text-red-400">
                                          <span>🟥</span>
                                          <span className="uppercase text-slate-200">{r.jugador_nombre}</span>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Celular: 2 columnas (Local izquierda, Visita derecha) alineadas bajo sus equipos */}
                              <div className="grid md:hidden grid-cols-2 gap-4 text-xs font-bold">
                                <div className="space-y-1.5 text-left pr-2 border-r border-slate-800/80">
                                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-2 truncate">Incidencias · {p.equipo_local?.nombre_equipo || 'Local'}</p>
                                  {golesLocal.length === 0 && amarillasLocal.length === 0 && rojasLocal.length === 0 ? (
                                    <span className="text-slate-600 italic text-[10px]">Sin incidencias</span>
                                  ) : (
                                    <>
                                      {golesLocal.map((g, idx) => (
                                        <div key={idx} className="flex items-center gap-1 text-slate-300 text-[11px]">
                                          <span>⚽</span>
                                          <span className="uppercase text-white font-black truncate">{g.jugador_nombre}</span>
                                          {g.goles > 1 && <span className="bg-blue-500/20 text-blue-400 text-[9px] px-1 rounded">x{g.goles}</span>}
                                        </div>
                                      ))}
                                      {amarillasLocal.map((a, idx) => (
                                        <div key={idx} className="flex items-center gap-1 text-yellow-400 text-[11px]">
                                          <span>🟨</span>
                                          <span className="uppercase text-slate-200 truncate">{a.jugador_nombre}</span>
                                        </div>
                                      ))}
                                      {rojasLocal.map((r, idx) => (
                                        <div key={idx} className="flex items-center gap-1 text-red-400 text-[11px]">
                                          <span>🟥</span>
                                          <span className="uppercase text-slate-200 truncate">{r.jugador_nombre}</span>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                </div>

                                <div className="space-y-1.5 text-left pl-1">
                                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-400 mb-2 truncate">Incidencias · {p.equipo_visita?.nombre_equipo || 'Visita'}</p>
                                  {golesVisita.length === 0 && amarillasVisita.length === 0 && rojasVisita.length === 0 ? (
                                    <span className="text-slate-600 italic text-[10px]">Sin incidencias</span>
                                  ) : (
                                    <>
                                      {golesVisita.map((g, idx) => (
                                        <div key={idx} className="flex items-center gap-1 text-slate-300 text-[11px]">
                                          <span>⚽</span>
                                          <span className="uppercase text-white font-black truncate">{g.jugador_nombre}</span>
                                          {g.goles > 1 && <span className="bg-blue-500/20 text-blue-400 text-[9px] px-1 rounded">x{g.goles}</span>}
                                        </div>
                                      ))}
                                      {amarillasVisita.map((a, idx) => (
                                        <div key={idx} className="flex items-center gap-1 text-yellow-400 text-[11px]">
                                          <span>🟨</span>
                                          <span className="uppercase text-slate-200 truncate">{a.jugador_nombre}</span>
                                        </div>
                                      ))}
                                      {rojasVisita.map((r, idx) => (
                                        <div key={idx} className="flex items-center gap-1 text-red-400 text-[11px]">
                                          <span>🟥</span>
                                          <span className="uppercase text-slate-200 truncate">{r.jugador_nombre}</span>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <CarruselPartidos partidos={partidosOrdenadosCarrusel} />
              </div>
            )}

            {seccionActiva === 'stream' && isPageVisible && (() => {
              const categoriaActual = categorias.find(c => c.id === categoriaSeleccionada);
              const urlTransmision = categoriaActual?.url_transmision;

              return(
                <div className="space-y-8">
                  <section className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 -mx-2 sm:mx-0">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-black uppercase tracking-widest text-green-100 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-ping"></span>
                        Transmisión Oficial en Vivo / Streaming
                      </h2>
                    </div>

                    {/* Contenedor con ID */}
                    <div id="contenedor-streaming" className="aspect-video w-full bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
                      
                      {/* Aviso flotante centrado en medio de la pantalla */}
                      <div id="aviso-rotacion" className="absolute inset-0 z-50 hidden flex items-center justify-center pointer-events-none px-4 transition-all duration-500">
                        <div className="bg-black/90 text-white px-4 py-3 rounded-xl backdrop-blur-md border border-white/20 flex items-center gap-3 shadow-2xl scale-105 animate-bounce">
                          <svg className="w-7 h-7 text-green-400 animate-spin shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ animationDuration: '4s' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                          </svg>
                          <div>
                            <p className="text-xs font-bold text-green-300">¡Gira tu celular a horizontal!</p>
                            <p className="text-[10px] text-slate-300">Activa la rotación automática para verlo en grande</p>
                          </div>
                        </div>
                      </div>

                      {urlTransmision ? (
                        <>
                          <iframe
                            src={obtenerUrlEmbed(urlTransmision)}
                            className="w-full h-full absolute inset-0 border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                            allowFullScreen
                          />

                          {/* Botón flotante alternador de pantalla completa para celulares */}
                          <button
                            onClick={() => {
                              const contenedor = document.getElementById('contenedor-streaming');
                              const aviso = document.getElementById('aviso-rotacion');
                              
                              const doc = document as Document & {
                                webkitFullscreenElement?: Element;
                                webkitExitFullscreen?: () => Promise<void>;
                              };
                              const el = contenedor as HTMLElement & {
                                webkitRequestFullscreen?: () => Promise<void>;
                              };

                              const estaEnFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement;

                              if (estaEnFullscreen) {
                                // Si ya está en pantalla completa, la salimos
                                if (doc.exitFullscreen) {
                                  doc.exitFullscreen();
                                } else if (doc.webkitExitFullscreen) {
                                  doc.webkitExitFullscreen();
                                }
                              } else {
                                // Si no está, la activamos y mostramos el aviso de rotación
                                if (el?.requestFullscreen) {
                                  el.requestFullscreen();
                                } else if (el?.webkitRequestFullscreen) {
                                  el.webkitRequestFullscreen();
                                }

                                if (aviso) {
                                  aviso.classList.remove('hidden');
                                  setTimeout(() => {
                                    aviso.classList.add('hidden');
                                  }, 6000);
                                }
                              }
                            }}
                            className="absolute bottom-3 right-3 z-30 bg-black/75 hover:bg-black text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-white/20 backdrop-blur-md flex items-center gap-1.5 shadow-xl sm:hidden active:scale-95 transition-transform"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m4.5 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15m-11.25 4.5h4.5m-4.5 0v-4.5m0 4.5L9 15" />
                            </svg>
                            Pantalla completa
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-6 space-y-2">
                          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 mx-auto shadow-lg shadow-red-500/10">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
                            </svg>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-300">El reproductor en vivo se conectará automáticamente durante las jornadas.</p>
                            <p className="text-[10px] text-slate-500">(Compatible con Facebook Live, YouTube y OBS Studio)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  <CarruselPartidos partidos={partidosOrdenadosCarrusel} />
                </div>
              );
            })()}

            {seccionActiva === 'posiciones' && (
              <div className="space-y-8">
                {grupos.length > 0 && (
                  <div className="space-y-6">
                    <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest">📊 Tabla de Posiciones en Vivo</h2>
                    {grupos.map((grupo) => {
                      const posicionesGrupo = posiciones.filter((p) => p.grupo_id === grupo.id);
                      return (
                        <div key={grupo.id} className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                          <div className="bg-slate-950 px-6 py-4 border-b border-slate-800">
                            <h3 className="text-xs font-black uppercase text-white tracking-wider">{grupo.nombre_grupo}</h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-950/50 border-b border-slate-800 text-[10px] uppercase font-black text-slate-400">
                                  <th className="py-3 px-4 text-center">Pos</th>
                                  <th className="py-3 px-4">Equipo</th>
                                  <th className="py-3 px-4 text-center">PJ</th>
                                  <th className="py-3 px-4 text-center">PG</th>
                                  <th className="py-3 px-4 text-center">PE</th>
                                  <th className="py-3 px-4 text-center">PP</th>
                                  <th className="py-3 px-4 text-center">GF</th>
                                  <th className="py-3 px-4 text-center">GC</th>
                                  <th className="py-3 px-4 text-center">DG</th>
                                  <th className="py-3 px-6 text-center text-blue-400">Pts</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 text-xs font-bold text-slate-300">
                                {posicionesGrupo.map((fila, index) => (
                                  <tr key={fila.equipo_id} className="hover:bg-slate-800/40 transition">
                                    <td className="py-3.5 px-4 text-center text-slate-400">{index + 1}</td>
                                    <td className="py-3.5 px-4 uppercase text-white">
                                      <div className="flex items-center gap-2.5">
                                        {fila.logo_url && <img src={fila.logo_url} className="w-5 h-5 object-contain" alt="" />}
                                        {fila.nombre_equipo}
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4 text-center">{fila.pj}</td>
                                    <td className="py-3.5 px-4 text-center text-emerald-400">{fila.pg}</td>
                                    <td className="py-3.5 px-4 text-center text-amber-400">{fila.pe}</td>
                                    <td className="py-3.5 px-4 text-center text-rose-400">{fila.pp}</td>
                                    <td className="py-3.5 px-4 text-center">{fila.gf}</td>
                                    <td className="py-3.5 px-4 text-center">{fila.gc}</td>
                                    <td className="py-3.5 px-4 text-center">{fila.dg}</td>
                                    <td className="py-3.5 px-6 text-center bg-blue-950/30 text-blue-400 font-black text-sm">
                                      {fila.pts}
                                    </td>
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
                    <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest">🏆 Fases de Eliminación y Finales</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                      {rondasExistentes.map((rondaNombre) => {
                        const partidosRonda = partidosEliminacion.filter((p) => p.numero_fecha === rondaNombre);
                        return (
                          <div key={rondaNombre} className="space-y-4">
                            <div className="bg-slate-800 text-slate-200 font-black uppercase text-[11px] text-center py-2.5 rounded-xl tracking-wider border border-slate-700">
                              {rondaNombre}
                            </div>
                            {partidosRonda.sort((a, b) => (a.orden || 0) - (b.orden || 0)).map((partido) => (
                              <div key={partido.id} className="bg-slate-900 rounded-xl p-4 border border-slate-800 shadow-md space-y-3">
                                <div className="flex justify-between items-center text-xs font-black uppercase">
                                  <div className="flex items-center gap-2 truncate text-white">
                                    {partido.equipo_local?.logo_url && <img src={partido.equipo_local.logo_url} className="w-4 h-4 object-contain" alt="" />}
                                    <span>{partido.equipo_local?.nombre_equipo || 'Por Clasificar'}</span>
                                  </div>
                                  <span className="text-sm font-black">{partido.goles_local ?? '-'}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-black uppercase border-t border-slate-800 pt-2">
                                  <div className="flex items-center gap-2 truncate text-white">
                                    {partido.equipo_visita?.logo_url && <img src={partido.equipo_visita.logo_url} className="w-4 h-4 object-contain" alt="" />}
                                    <span>{partido.equipo_visita?.nombre_equipo || 'Por Clasificar'}</span>
                                  </div>
                                  <span className="text-sm font-black">{partido.goles_visita ?? '-'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {seccionActiva === 'goleadores' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest">⚽ Tabla de Goleadores del Torneo</h2>
                </div>

                {goleadores.length === 0 ? (
                  <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
                    <span className="text-3xl block mb-2">⚽</span>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Aún no se han registrado goles en esta categoría.</p>
                  </div>
                ) : (
                  <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-[10px] uppercase font-black text-slate-400">
                          <th className="py-3 px-6 text-center w-16">Pos</th>
                          <th className="py-3 px-6">Jugador</th>
                          <th className="py-3 px-6">Equipo</th>
                          <th className="py-3 px-6 text-center text-blue-400">Goles</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs font-bold text-slate-200">
                        {goleadores.map((g, index) => (
                          <tr key={index} className="hover:bg-slate-800/40 transition">
                            <td className="py-4 px-6 text-center text-slate-400 font-black">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                            </td>
                            <td className="py-4 px-6 uppercase text-white font-black">{g.nombre}</td>
                            <td className="py-4 px-6 uppercase text-slate-400">
                              <div className="flex items-center gap-2">
                                {g.logo && <img src={g.logo} className="w-4 h-4 object-contain" alt="" />}
                                {g.equipo}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center text-blue-300 font-black text-base bg-blue-950/20">
                              {g.goles}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="mt-24 border-t border-slate-800 text-center py-6 text-xs text-slate-500">
        Plataforma oficial impulsada por <span className="font-bold text-slate-400">IndorSaaS</span> &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}