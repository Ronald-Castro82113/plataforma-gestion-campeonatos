'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Fase {
  id: string;
  nombre_fase: string;
  tipo_formato: string;
}

interface Grupo {
  id: string;
  nombre_grupo: string;
}

interface Equipo {
  id: string;
  nombre_equipo: string;
}

interface EquipoEnGrupo {
  id: string;
  grupo_id: string;
  equipos: {
    id: string;
    nombre_equipo: string;
  } | null;
}

interface Partido {
  id: string;
  numero_fecha: number | string;
  orden: number;
  goles_local: number | null;
  goles_visita: number | null;
  estado: string;
  equipo_local: { id: string; nombre_equipo: string } | null;
  equipo_visita: { id: string; nombre_equipo: string } | null;
}

interface PartidoInsertar {
  fase_id: string;
  grupo_id: string | null;
  equipo_local_id: string;
  equipo_visita_id: string;
  numero_fecha: number | string;
  orden?: number;
  estado: string;
  lugar: string;
}

export default function ConfigurarTorneoPage({ params }: { params: Promise<{ id: string; categoriaId: string }> }) {
  const { id: campeonatoId, categoriaId } = use(params);
  const router = useRouter();

  // Estados Base
  const [fases, setFases] = useState<Fase[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [equiposTotales, setEquiposTotales] = useState<Equipo[]>([]);
  const [relacionesGrupos, setRelacionesGrupos] = useState<EquipoEnGrupo[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);

  // Formulario Formato
  const [nombreFase, setNombreFase] = useState('Primera Etapa');
  const [formato, setFormato] = useState('grupos');
  const [tipoRondaPlayoff, setTipoRondaPlayoff] = useState<'8' | '4' | '2' | '1'>('2');

  // Sorteo Cabezas de Serie
  const [campeonId, setCampeonId] = useState('');
  const [vicecampeonId, setVicecampeonId] = useState('');

  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);

  // Estado para alertas modernas
  const [mensajeAlerta, setMensajeAlerta] = useState<string | null>(null);

  const refrescarTodoElTorneo = async () => {
    try {
      const { data: fasesData } = await supabase
        .from('fases')
        .select('id, nombre_fase, tipo_formato')
        .eq('categoria_id', categoriaId);
      setFases(fasesData || []);

      const { data: eqData } = await supabase
        .from('equipos')
        .select('id, nombre_equipo')
        .eq('categoria_id', categoriaId);
      setEquiposTotales(eqData || []);

      if (fasesData && fasesData.length > 0) {
        const faseActiva = fasesData[0];

        const { data: gruposData } = await supabase
          .from('grupos')
          .select('id, nombre_grupo')
          .eq('fase_id', faseActiva.id)
          .order('nombre_grupo', { ascending: true });
        setGrupos(gruposData || []);

        if (gruposData && gruposData.length > 0) {
          const listaIds = gruposData.map((g: Grupo) => g.id);
          const { data: relData } = await supabase
            .from('grupos_equipos')
            .select('id, grupo_id, equipos:equipo_id (id, nombre_equipo)')
            .in('grupo_id', listaIds);
          setRelacionesGrupos((relData as unknown as EquipoEnGrupo[]) || []);
        }

        // CORRECCIÓN: Se eliminó created_at para evitar errores de columnas inexistentes en la tabla partidos
        const { data: partidosData } = await supabase
          .from('partidos')
          .select('id, numero_fecha, orden, goles_local, goles_visita, estado, equipo_local:equipo_local_id (id, nombre_equipo), equipo_visita:equipo_visita_id (id, nombre_equipo)')
          .eq('fase_id', faseActiva.id)
          .order('orden', { ascending: true });

        setPartidos((partidosData as unknown as Partido[]) || []);
      }
    } catch (error: unknown) {
      console.error('Error al actualizar la pizarra unificada', error);
    }
  };

  useEffect(() => {
    const cargarDatosIniciales = async () => {
      setLoading(true);
      await refrescarTodoElTorneo();
      setLoading(false);
    };
    cargarDatosIniciales();
  }, [categoriaId]);

  const guardarEstructuraYCrearGrupos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreFase.trim()) return;

    setBtnLoading(true);
    try {
      const { data: nuevaFase, error: errFase } = await supabase
        .from('fases')
        .insert([{ categoria_id: categoriaId, nombre_fase: nombreFase.trim(), tipo_formato: formato }])
        .select()
        .single();

      if (errFase) throw errFase;

      if (formato === 'grupos' && nuevaFase) {
        await supabase.from('grupos').insert([
          { fase_id: nuevaFase.id, nombre_grupo: 'Grupo A' },
          { fase_id: nuevaFase.id, nombre_grupo: 'Grupo B' }
        ]);
      }

      await refrescarTodoElTorneo();
      setMensajeAlerta('¡Estructura de campeonato inicializada correctamente!');
    } catch (error: unknown) {
      console.error(error);
      setMensajeAlerta('Error definiendo el sistema de juego.');
    } finally {
      setBtnLoading(false);
    }
  };

  const ejecutarSorteoYCalendario = async () => {
    if (fases.length === 0) {
      setMensajeAlerta('Primero debes establecer el sistema de juego y la estructura de la fase.');
      return;
    }
    const faseActiva = fases[0];

    if (faseActiva.tipo_formato === 'grupos') {
      if (!campeonId || !vicecampeonId) {
        setMensajeAlerta('Por favor, selecciona los cabezas de serie para balancear los grupos.');
        return;
      }
      if (campeonId === vicecampeonId) {
        setMensajeAlerta('El Campeón y el Vicecampeón no pueden ser el mismo club.');
        return;
      }
      if (grupos.length < 2) {
        setMensajeAlerta('Se necesitan al menos 2 grupos creados para la Fase de Grupos.');
        return;
      }
    }

    setBtnLoading(true);
    try {
      if (grupos.length > 0) {
        const listaGruposIds = grupos.map((g: Grupo) => g.id);
        await supabase.from('grupos_equipos').delete().in('grupo_id', listaGruposIds);
      }
      await supabase.from('partidos').delete().eq('fase_id', faseActiva.id);

      const partidosAInsertar: PartidoInsertar[] = [];

      if (faseActiva.tipo_formato === 'grupos' && grupos.length >= 2) {
        const grupoA = grupos[0];
        const grupoB = grupos[1];

        await supabase.from('grupos_equipos').insert([
          { grupo_id: grupoA.id, equipo_id: campeonId },
          { grupo_id: grupoB.id, equipo_id: vicecampeonId }
        ]);

        const restantes = equiposTotales.filter((e: Equipo) => e.id !== campeonId && e.id !== vicecampeonId);
        const restantesMezclados = [...restantes].sort(() => Math.random() - 0.5);

        const relacionesMasa = restantesMezclados.map((equipo: Equipo, index: number) => ({
          grupo_id: grupos[index % grupos.length].id,
          equipo_id: equipo.id
        }));

        if (relacionesMasa.length > 0) {
          await supabase.from('grupos_equipos').insert(relacionesMasa);
        }

        const listaGruposIds = grupos.map((g: Grupo) => g.id);
        const { data: relFrescas } = await supabase
          .from('grupos_equipos')
          .select('grupo_id, equipo_id')
          .in('grupo_id', listaGruposIds);

        grupos.forEach((grupo: Grupo) => {
          let equiposDelGrupo: (string | null)[] = ((relFrescas as Array<{ grupo_id: string; equipo_id: string }> | null) || [])
            .filter((r) => r.grupo_id === grupo.id)
            .map((r) => r.equipo_id);

          if (grupo.id === grupoA.id) {
            const sinCampeon = equiposDelGrupo.filter((id): id is string => id !== null && id !== campeonId);
            const conCampeonId = equiposDelGrupo.find((id) => id === campeonId);

            if (conCampeonId && sinCampeon.length > 0) {
              equiposDelGrupo = [sinCampeon[0], conCampeonId, ...sinCampeon.slice(1)];
            } else if (conCampeonId) {
              equiposDelGrupo = [conCampeonId];
            }
          }

          if (equiposDelGrupo.length < 2) return;
          if (equiposDelGrupo.length % 2 !== 0) equiposDelGrupo.push(null);

          const numEquipos = equiposDelGrupo.length;
          const numRondas = numEquipos - 1;

          for (let ronda = 0; ronda < numRondas; ronda++) {
            for (let p = 0; p < numEquipos / 2; p++) {
              const localIdx = (ronda + p) % (numEquipos - 1);
              let visitaIdx = (numEquipos - 1 - p + ronda) % (numEquipos - 1);
              if (p === 0) visitaIdx = numEquipos - 1;

              const localId = equiposDelGrupo[localIdx];
              const visitaId = equiposDelGrupo[visitaIdx];

              if (localId && visitaId) {
                partidosAInsertar.push({
                  fase_id: faseActiva.id,
                  grupo_id: grupo.id,
                  equipo_local_id: localId,
                  equipo_visita_id: visitaId,
                  numero_fecha: ronda + 1,
                  estado: 'programado',
                  lugar: 'Cancha Central Principal'
                });
              }
            }
          }
        });

        // ORDENAMIENTO ESTRICTO: Forzar que el primer partido de la Fecha 1 sea el del Campeón
        partidosAInsertar.sort((a, b) => {
          const fechaA = typeof a.numero_fecha === 'number' ? a.numero_fecha : 999;
          const fechaB = typeof b.numero_fecha === 'number' ? b.numero_fecha : 999;
          if (fechaA !== fechaB) return fechaA - fechaB;

          if (fechaA === 1) {
            const aEsCampeon = a.equipo_local_id === campeonId || a.equipo_visita_id === campeonId;
            const bEsCampeon = b.equipo_local_id === campeonId || b.equipo_visita_id === campeonId;
            if (aEsCampeon && !bEsCampeon) return -1;
            if (!aEsCampeon && bEsCampeon) return 1;
          }
          return 0;
        });

      } 
      else if (faseActiva.tipo_formato === 'liga') {
        const listaEquipos: (string | null)[] = equiposTotales.map((e: Equipo) => e.id);
        if (listaEquipos.length < 2) {
          setMensajeAlerta('Se necesitan mínimo 2 equipos inscritos.');
          setBtnLoading(false);
          return;
        }
        if (listaEquipos.length % 2 !== 0) listaEquipos.push(null);

        const numEquipos = listaEquipos.length;
        const numRondas = numEquipos - 1;

        for (let ronda = 0; ronda < numRondas; ronda++) {
          for (let p = 0; p < numEquipos / 2; p++) {
            const localIdx = (ronda + p) % (numEquipos - 1);
            let visitaIdx = (numEquipos - 1 - p + ronda) % (numEquipos - 1);
            if (p === 0) visitaIdx = numEquipos - 1;

            const localId = listaEquipos[localIdx];
            const visitaId = listaEquipos[visitaIdx];

            if (localId && visitaId) {
              partidosAInsertar.push({
                fase_id: faseActiva.id,
                grupo_id: null,
                equipo_local_id: localId,
                equipo_visita_id: visitaId,
                numero_fecha: ronda + 1,
                estado: 'programado',
                lugar: 'Cancha Central Principal'
              });
            }
          }
        }
      }
      else if (faseActiva.tipo_formato === 'eliminacion') {
        let numLlaves = 2;
        let nombreJornada = 'Semifinal';
        if (tipoRondaPlayoff === '8') { numLlaves = 8; nombreJornada = 'Octavos de Final'; }
        if (tipoRondaPlayoff === '4') { numLlaves = 4; nombreJornada = 'Cuartos de Final'; }
        if (tipoRondaPlayoff === '2') { numLlaves = 2; nombreJornada = 'Semifinal'; }
        if (tipoRondaPlayoff === '1') { numLlaves = 1; nombreJornada = 'Gran Final'; }

        const equiposDisponibles = [...equiposTotales].sort(() => Math.random() - 0.5);
        const totalRequerido = numLlaves * 2;

        if (equiposDisponibles.length < totalRequerido) {
          setMensajeAlerta(`Se requieren al menos ${totalRequerido} equipos inscritos para generar ${nombreJornada}.`);
          setBtnLoading(false);
          return;
        }

        for (let i = 0; i < numLlaves; i++) {
          const local = equiposDisponibles[i];
          const visita = equiposDisponibles[totalRequerido - 1 - i];

          partidosAInsertar.push({
            fase_id: faseActiva.id,
            grupo_id: null,
            equipo_local_id: local.id,
            equipo_visita_id: visita.id,
            numero_fecha: nombreJornada,
            estado: 'programado',
            lugar: 'Cancha Central Principal'
          });
        }
      }

      partidosAInsertar.forEach((p, idx) => {
        p.orden = idx + 1;
      });

      if (partidosAInsertar.length > 0) {
        const { error: insertError } = await supabase.from('partidos').insert(partidosAInsertar);
        if (insertError) throw insertError;
      } else {
        setMensajeAlerta('No se pudieron generar partidos. Comprueba que existan equipos suficientes.');
        setBtnLoading(false);
        return;
      }

      await refrescarTodoElTorneo();
      setMensajeAlerta('🏆 ¡Proceso Completo! Formato aplicado, sorteo ejecutado y fixture guardado con total flexibilidad.');

    } catch (error: unknown) {
      console.error(error);
      setMensajeAlerta('Error en el motor automatizado.');
    } finally {
      setBtnLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans text-slate-500 font-medium">
        Unificando sistemas de competición...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative">
      {/* <nav className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex justify-between items-center">
        <Link href="/dashboard" className="text-xl font-bold text-slate-900 tracking-tight">
          Indor<span className="text-blue-600">SaaS</span>
        </Link>
        <Link 
          href={`/dashboard/${campeonatoId}/categoria/${categoriaId}/operar`} 
          className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition shadow"
        >
          🎙️ Ir a Mesa de Control (Cargar Goles)
        </Link>
        <Link href={`/dashboard/${campeonatoId}/categoria/${categoriaId}`} className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-2 rounded-lg transition hover:text-blue-600">
          ← Volver a Inscripciones
        </Link>
      </nav> */}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Panel Maestro Unificado</span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Estructura & Calendario Flexible de Juego</h2>
          <p className="text-sm text-slate-500 mt-1">Configura fases de grupos, ligas o playoffs con total adaptabilidad a las reglas de tu torneo.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">1. Sistema de Competición</h3>
              {fases.length === 0 ? (
                <form onSubmit={guardarEstructuraYCrearGrupos} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nombre de Etapa</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none"
                      value={nombreFase}
                      onChange={(e) => setNombreFase(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Formato Flexible</label>
                    <select 
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none font-medium"
                      value={formato}
                      onChange={(e) => setFormato(e.target.value)}
                    >
                      <option value="grupos">Fase de Grupos (Con cabezas de serie)</option>
                      {/* <option value="liga">Liga Directa (Todos contra todos)</option>
                      <option value="eliminacion">Eliminación Directa (Playoffs)</option> */}
                    </select>
                  </div>

                  {formato === 'eliminacion' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Instancia Inicial de Playoffs</label>
                      <select 
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none font-medium"
                        value={tipoRondaPlayoff}
                        onChange={(e) => setTipoRondaPlayoff(e.target.value as '8' | '4' | '2' | '1')}
                      >
                        <option value="8">Octavos de Final (16 equipos - 8 llaves)</option>
                        <option value="4">Cuartos de Final (8 equipos - 4 llaves)</option>
                        <option value="2">Semifinales (4 equipos - 2 llaves)</option>
                        <option value="1">Final Única (2 equipos - 1 llave)</option>
                      </select>
                    </div>
                  )}

                  <button type="submit" disabled={btnLoading} className="w-full rounded-xl bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 transition">
                    Establecer Formato
                  </button>
                </form>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{fases[0].nombre_fase}</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-mono font-bold mt-0.5">{fases[0].tipo_formato}</p>
                  </div>
                  <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Activo</span>
                </div>
              )}
            </div>

            {fases.length > 0 && fases[0].tipo_formato === 'grupos' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Bombos y Cabezas de Serie</h3>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">👑 Campeón (Grupo A - Abre Fixture)</label>
                  <select 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs"
                    value={campeonId}
                    onChange={(e) => setCampeonId(e.target.value)}
                  >
                    <option value="">-- Elige un Club --</option>
                    {equiposTotales.map((e: Equipo) => <option key={e.id} value={e.id}>{e.nombre_equipo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">🥈 Vicecampeón (Grupo B)</label>
                  <select 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs"
                    value={vicecampeonId}
                    onChange={(e) => setVicecampeonId(e.target.value)}
                  >
                    <option value="">-- Elige un Club --</option>
                    {equiposTotales.map((e: Equipo) => <option key={e.id} value={e.id}>{e.nombre_equipo}</option>)}
                  </select>
                </div>
              </div>
            )}

            {fases.length > 0 && (
              <button
                onClick={ejecutarSorteoYCalendario}
                disabled={btnLoading}
                className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-600/10"
              >
                {btnLoading ? 'Calculando Competición...' : '⚡ Generar Sorteo y Fixture Completo'}
              </button>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {fases.length > 0 && fases[0].tipo_formato === 'grupos' && grupos.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Distribución por Series</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {grupos.map((g: Grupo) => {
                    const deEsteGrupo = relacionesGrupos.filter((r: EquipoEnGrupo) => r.grupo_id === g.id);
                    return (
                      <div key={g.id} className="border border-slate-100 rounded-xl bg-slate-50/50 overflow-hidden">
                        <div className="bg-blue-200/30 px-3 py-2 font-bold text-xs text-slate-700 flex justify-between">
                          <span>{g.nombre_grupo}</span>
                          <span>{deEsteGrupo.length} Clubes</span>
                        </div>
                        <div className="p-3 space-y-1.5 text-xs">
                          {deEsteGrupo.length === 0 ? (
                            <p className="text-slate-400 italic text-center py-2">Serie vacía</p>
                          ) : (
                            deEsteGrupo.map((r: EquipoEnGrupo) => (
                              <div key={r.id} className="bg-white p-2 rounded-lg border border-slate-200/60 font-medium">
                                🏃‍♂️ {r.equipos?.nombre_equipo} {r.equipos?.id === campeonId ? '⭐ (Campeón)' : ''}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Calendario Oficial de Partidos</h3>
              {partidos.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  📅 El calendario está vacío. Configura el formato y pulsa el botón verde para generarlo.
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {partidos.map((p: Partido) => (
                    <div key={p.id} className="border border-slate-100 bg-slate-50/30 p-3 rounded-xl flex justify-between items-center text-xs">
                      <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        {typeof p.numero_fecha === 'number' ? `Fecha ${p.numero_fecha}` : p.numero_fecha}
                      </span>
                      <div className="flex-1 flex justify-center items-center gap-2 font-bold px-4">
                        <span className="w-1/2 text-right truncate">{p.equipo_local?.nombre_equipo}</span>
                        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-0.5 rounded font-mono">
                          {p.goles_local !== null ? `${p.goles_local} - ${p.goles_visita}` : 'vs'}
                        </span>
                        <span className="w-1/2 text-left truncate">{p.equipo_visita?.nombre_equipo}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">{p.estado}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {mensajeAlerta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-xl font-bold">
              ℹ️
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Aviso del Sistema</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{mensajeAlerta}</p>
            </div>
            <button
              onClick={() => setMensajeAlerta(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}