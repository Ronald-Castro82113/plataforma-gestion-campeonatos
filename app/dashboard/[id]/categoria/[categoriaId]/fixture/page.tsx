'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Fase {
  id: string;
  nombre_fase: string;
  tipo_formato: string;
  modo_organizacion: 'automatico' | 'manual';
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
  orden_sorteo: number | null;
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

   // Modo de organización del torneo
  const [modoOrganizacion, setModoOrganizacion] = useState<'seleccion' | 'automatico' | 'manual'>('seleccion');

  // Sorteo Cabezas de Serie
  const [campeonId, setCampeonId] = useState('');
  const [vicecampeonId, setVicecampeonId] = useState('');

  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);

  // Estado para alertas modernas
  const [mensajeAlerta, setMensajeAlerta] = useState<string | null>(null);
  
  const [nombreNuevoGrupo, setNombreNuevoGrupo] = useState('');
  const [equipoSeleccionadoPorGrupo, setEquipoSeleccionadoPorGrupo] = useState<Record<string, string>>({});

  const [fechaManual, setFechaManual] = useState('1');
  const [localManual, setLocalManual] = useState('');
  const [visitaManual, setVisitaManual] = useState('');
  const [grupoFixtureManual, setGrupoFixtureManual] = useState('');

  const refrescarTodoElTorneo = async () => {
    try {
      const { data: fasesData } = await supabase
        .from('fases')
        .select('id, nombre_fase, tipo_formato, modo_organizacion')
        .eq('categoria_id', categoriaId);
      setFases(fasesData || []);

      if (fasesData && fasesData.length > 0) {
        setModoOrganizacion(fasesData[0].modo_organizacion);
      }

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
            .select('id, grupo_id, orden_sorteo, equipos:equipo_id (id, nombre_equipo)')
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

  const guardarEstructuraYCrearGrupos = async () => {
    if (!nombreFase.trim()) {
      setMensajeAlerta('Debes indicar el nombre de la etapa.');
      return;
    }

    setBtnLoading(true);
    try {
      const { data: nuevaFase, error: errFase } = await supabase
        .from('fases')
        .insert([{ categoria_id: categoriaId, nombre_fase: nombreFase.trim(), tipo_formato: formato, modo_organizacion: modoOrganizacion }])
        .select()
        .single();

      if (errFase) throw errFase;

      if (formato === 'grupos' && nuevaFase && modoOrganizacion === 'automatico') {
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

  const agregarGrupoManual = async () => {
    const nombre = nombreNuevoGrupo.trim();

    if (!nombre) {
      setMensajeAlerta('Debes indicar el nombre del grupo.');
      return;
    }

    if (fases.length === 0) {
      setMensajeAlerta('Primero debes crear la fase del torneo.');
      return;
    }

    const faseActiva = fases[0];

    if (faseActiva.modo_organizacion !== 'manual') {
      setMensajeAlerta('Esta fase no está configurada para organización manual.');
      return;
    }

    setBtnLoading(true);

    try {
      const { error } = await supabase
        .from('grupos')
        .insert([{
          fase_id: faseActiva.id,
          nombre_grupo: nombre
        }]);

      if (error) throw error;

      setNombreNuevoGrupo('');

      await refrescarTodoElTorneo();

      setMensajeAlerta(`Grupo "${nombre}" creado correctamente.`);
    } catch (error: unknown) {
      console.error(error);
      setMensajeAlerta('No se pudo crear el grupo.');
    } finally {
      setBtnLoading(false);
    }
  };

  const agregarEquipoAlGrupoManual = async (grupoId: string) => {
    const equipoId = equipoSeleccionadoPorGrupo[grupoId];

    if (!equipoId) {
      setMensajeAlerta('Selecciona un equipo antes de agregarlo al grupo.');
      return;
    }

    const yaEstaAsignado = relacionesGrupos.some(
      (relacion: EquipoEnGrupo) => relacion.equipos?.id === equipoId
    );

    if (yaEstaAsignado) {
      setMensajeAlerta('Ese equipo ya está asignado a un grupo.');
      return;
    }

    setBtnLoading(true);

    try {
      const equiposDelGrupo = relacionesGrupos.filter(
        (relacion: EquipoEnGrupo) => relacion.grupo_id === grupoId
      );

      const siguienteOrdenSorteo =
        equiposDelGrupo.reduce(
          (maximo, relacion) =>
            Math.max(maximo, relacion.orden_sorteo ?? 0),
          0
        ) + 1;

      const { error } = await supabase
        .from('grupos_equipos')
        .insert([
          {
            grupo_id: grupoId,
            equipo_id: equipoId,
            orden_sorteo: siguienteOrdenSorteo
          }
        ]);

      if (error) throw error;

      setEquipoSeleccionadoPorGrupo((actual) => ({
        ...actual,
        [grupoId]: ''
      }));

      await refrescarTodoElTorneo();

    } catch (error: unknown) {
      console.error(error);
      setMensajeAlerta('No se pudo agregar el equipo al grupo.');
    } finally {
      setBtnLoading(false);
    }
  };

  const agregarPartidoManual = async () => {
    if (fases.length === 0) {
      setMensajeAlerta('Primero debes crear la fase del torneo.');
      return;
    }

    if (!grupoFixtureManual) {
      setMensajeAlerta('Selecciona el grupo del partido.');
      return;
    }

    if (!localManual || !visitaManual) {
      setMensajeAlerta('Selecciona los dos equipos del partido.');
      return;
    }

    if (localManual === visitaManual) {
      setMensajeAlerta('Un equipo no puede jugar contra sí mismo.');
      return;
    }

    const equiposDelGrupo = relacionesGrupos.filter(
      (relacion: EquipoEnGrupo) => relacion.grupo_id === grupoFixtureManual
    );

    const pertenecenAlGrupo = equiposDelGrupo.some(
      (relacion: EquipoEnGrupo) => relacion.equipos?.id === localManual
    ) && equiposDelGrupo.some(
      (relacion: EquipoEnGrupo) => relacion.equipos?.id === visitaManual
    );

    if (!pertenecenAlGrupo) {
      setMensajeAlerta('Los dos equipos deben pertenecer al grupo seleccionado.');
      return;
    }

    const existePartido = partidos.some(
      (partido: Partido) =>
        String(partido.numero_fecha) === fechaManual &&
        (
          (
            partido.equipo_local?.id === localManual &&
            partido.equipo_visita?.id === visitaManual
          ) ||
          (
            partido.equipo_local?.id === visitaManual &&
            partido.equipo_visita?.id === localManual
          )
        )
    );

    if (existePartido) {
      setMensajeAlerta('Ese partido ya existe en esa fecha.');
      return;
    }

    setBtnLoading(true);

    try {
      const siguienteOrden =
        partidos.reduce(
          (maximo, partido) =>
            Math.max(maximo, partido.orden || 0),
          0
        ) + 1;

      const { error } = await supabase
        .from('partidos')
        .insert([
          {
            fase_id: fases[0].id,
            grupo_id: grupoFixtureManual,
            equipo_local_id: localManual,
            equipo_visita_id: visitaManual,
            numero_fecha: fechaManual,
            orden: siguienteOrden,
            estado: 'programado',
            lugar: 'Cancha Central Principal'
          }
        ]);

      if (error) throw error;

      setLocalManual('');
      setVisitaManual('');

      await refrescarTodoElTorneo();

    } catch (error: unknown) {
      console.error(error);
      setMensajeAlerta('No se pudo guardar el partido.');
    } finally {
      setBtnLoading(false);
    }
  };

  const eliminarPartidoManual = async (partidoId: string) => {
    const partido = partidos.find(
      (item: Partido) => item.id === partidoId
    );

    if (!partido) {
      setMensajeAlerta('No se encontró el partido.');
      return;
    }

    if (partido.estado !== 'programado') {
      setMensajeAlerta('Este partido ya no puede eliminarse porque no está programado.');
      return;
    }

    const confirmar = window.confirm(
      '¿Seguro que deseas eliminar este partido del fixture?'
    );

    if (!confirmar) {
      return;
    }

    setBtnLoading(true);

    try {
      const { error } = await supabase
        .from('partidos')
        .delete()
        .eq('id', partidoId);

      if (error) {
        console.error('ERROR AL ELIMINAR PARTIDO:', error);
        setMensajeAlerta(`Error al eliminar: ${error.message}`);
        return;
      }

      await refrescarTodoElTorneo();

      setMensajeAlerta('Partido eliminado correctamente.');
    } catch (error: unknown) {
      console.error(error);
      setMensajeAlerta('No se pudo eliminar el partido.');
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
          <span className="text-xs font-bold uppercase tracking-wider text-blue-900">Panel Maestro Unificado</span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Estructura & Calendario Flexible de Juego</h2>
          <p className="text-sm text-slate-500 mt-1">Configura fases de grupos, ligas o playoffs con total adaptabilidad a las reglas de tu torneo.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-sm font-bold">
                    1
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Sistema de Competición
                  </h3>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Elige cómo deseas organizar los grupos y construir el calendario
                  de partidos.
                </p>
              </div>

              {fases.length === 0 ? (
                <div className="space-y-4">

                  {/* OPCIÓN AUTOMÁTICA */}
                  <button
                    type="button"
                    onClick={() => setModoOrganizacion('automatico')}
                    className={`w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 ${
                      modoOrganizacion === 'automatico'
                        ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-500/10'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                          modoOrganizacion === 'automatico'
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        🪄
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-extrabold text-slate-900">
                            Automático
                          </h4>

                          {modoOrganizacion === 'automatico' && (
                            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white">
                              Seleccionado
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          El sistema realiza la distribución de los equipos y genera
                          automáticamente el fixture.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* OPCIÓN MANUAL */}
                  <button
                    type="button"
                    onClick={() => setModoOrganizacion('manual')}
                    className={`w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 ${
                      modoOrganizacion === 'manual'
                        ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10'
                        : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                          modoOrganizacion === 'manual'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        🎲
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-extrabold text-slate-900">
                            Sorteo Manual
                          </h4>

                          {modoOrganizacion === 'manual' && (
                            <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white">
                              Seleccionado
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          Organiza los grupos y construye el fixture exactamente
                          como se realizó el sorteo presencial.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* CONFIGURACIÓN DEL FORMATO */}
                  {modoOrganizacion !== 'seleccion' && (
                    <div className="border-t border-slate-100 pt-5 mt-2 space-y-4">

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Nombre de Etapa
                        </label>

                        <input
                          type="text"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={nombreFase}
                          onChange={(e) => setNombreFase(e.target.value)}
                          placeholder="Ej. Primera Etapa"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Formato de Competición
                        </label>

                        <select
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-medium"
                          value={formato}
                          onChange={(e) => setFormato(e.target.value)}
                        >
                          <option value="grupos">
                            Fase de Grupos
                          </option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={guardarEstructuraYCrearGrupos}
                        disabled={btnLoading}
                        className="w-full rounded-xl bg-cyan-900 py-3 text-xs font-bold text-white hover:bg-cyan-700 transition disabled:opacity-50"
                      >
                        {btnLoading
                          ? 'Guardando configuración...'
                          : modoOrganizacion === 'manual'
                            ? ' Crear Configuración Manual'
                            : ' Establecer Formato Automático'}
                      </button>

                    </div>
                  )}
                </div>
              ) : (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {fases[0].nombre_fase}
                        </h4>

                        <p className="text-[10px] text-slate-400 uppercase font-mono font-bold mt-1">
                          {fases[0].tipo_formato}
                        </p>
                      </div>

                      <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-1 rounded-full">
                        Activo
                      </span>
                    </div>

                    <div
                      className={`rounded-xl border p-3 ${
                        fases[0].modo_organizacion === 'manual'
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xl">
                          {fases[0].modo_organizacion === 'manual' ? '🎲' : '🪄'}
                        </div>

                        <div>
                          <p className="text-xs font-extrabold text-slate-900">
                            {fases[0].modo_organizacion === 'manual'
                              ? 'Sorteo Manual'
                              : 'Organización Automática'}
                          </p>

                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {fases[0].modo_organizacion === 'manual'
                              ? 'Los grupos y el fixture serán organizados manualmente.'
                              : 'El sistema distribuirá los equipos y generará el fixture automáticamente.'}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
              )}
            </div>

            {fases.length > 0 && fases[0].tipo_formato === 'grupos' && modoOrganizacion === 'automatico' && (
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

            {fases.length > 0 &&
              fases[0].tipo_formato === 'grupos' &&
              modoOrganizacion === 'manual' && (
                <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm space-y-5">

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      2. Configuración del Sorteo Manual
                    </h3>

                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Crea los grupos exactamente como fueron definidos en el sorteo
                      presencial. Luego podrás colocar los equipos dentro de cada grupo.
                    </p>
                  </div>

                  {/* CREAR GRUPO */}
                  <div className="border-t border-slate-100 pt-4">

                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Nombre del nuevo grupo
                    </label>

                    <div className="flex gap-2">

                      <input
                        type="text"
                        value={nombreNuevoGrupo}
                        onChange={(e) => setNombreNuevoGrupo(e.target.value)}
                        placeholder={`Ej. Grupo ${String.fromCharCode(65 + grupos.length)}`}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />

                      <button
                        type="button"
                        onClick={agregarGrupoManual}
                        disabled={btnLoading}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        + Crear Grupo
                      </button>

                    </div>
                  </div>

                  {/* GRUPOS EXISTENTES */}
                  <div className="border-t border-slate-100 pt-4">

                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Grupos creados
                    </h4>

                    {grupos.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                        <p className="text-xs text-slate-400">
                          Todavía no has creado ningún grupo.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">

                        {grupos.map((grupo: Grupo) => {
                          const equiposDelGrupo = relacionesGrupos.filter(
                            (relacion: EquipoEnGrupo) => relacion.grupo_id === grupo.id
                          );

                          return (
                            <div
                              key={grupo.id}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-extrabold text-slate-800">
                                    {grupo.nombre_grupo}
                                  </p>

                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {equiposDelGrupo.length} equipos asignados
                                  </p>
                                </div>

                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
                                  Manual
                                </span>
                              </div>

                              {/* EQUIPOS DEL GRUPO */}
                              {equiposDelGrupo.length > 0 && (
                                <div className="space-y-1.5">
                                  {equiposDelGrupo.map((relacion: EquipoEnGrupo, index: number) => (
                                    <div
                                      key={relacion.id}
                                      className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2"
                                    >
                                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                                        {index + 1}
                                      </span>

                                      <span className="text-xs font-medium text-slate-700">
                                        {relacion.equipos?.nombre_equipo}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* SELECTOR DE EQUIPO */}
                              <div className="flex gap-2 pt-1">

                                <select
                                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                  value={equipoSeleccionadoPorGrupo[grupo.id] || ''}
                                  onChange={(e) =>
                                    setEquipoSeleccionadoPorGrupo((actual) => ({
                                      ...actual,
                                      [grupo.id]: e.target.value
                                    }))
                                  }
                                >
                                  <option value="">
                                    + Seleccionar equipo
                                  </option>

                                  {equiposTotales
                                    .filter(
                                      (equipo: Equipo) =>
                                        !relacionesGrupos.some(
                                          (relacion: EquipoEnGrupo) =>
                                            relacion.equipos?.id === equipo.id
                                        )
                                    )
                                    .map((equipo: Equipo) => (
                                      <option key={equipo.id} value={equipo.id}>
                                        {equipo.nombre_equipo}
                                      </option>
                                    ))}
                                </select>

                                <button
                                  type="button"
                                  onClick={() => agregarEquipoAlGrupoManual(grupo.id)}
                                  disabled={btnLoading}
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                  + Agregar
                                </button>

                              </div>
                            </div>
                          );
                        })}

                      </div>
                    )}

                  </div>

                </div>
              )}  

            {fases.length > 0 &&
              fases[0].tipo_formato === 'grupos' &&
              modoOrganizacion === 'manual' &&
              grupos.length > 0 &&
              relacionesGrupos.length > 0 && (
                <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm space-y-5">

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      3. Construir Fixture Manual
                    </h3>

                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Construye cada partido según el orden definido en el sorteo
                      presencial. Puedes decidir libremente qué equipos se enfrentan
                      en cada fecha.
                    </p>
                  </div>

                  {/* GRUPO */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Grupo
                    </label>

                    <select
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs"
                      value={grupoFixtureManual}
                      onChange={(e) => {
                        setGrupoFixtureManual(e.target.value);
                        setLocalManual('');
                        setVisitaManual('');
                      }}
                    >
                      <option value="">
                        -- Selecciona un grupo --
                      </option>

                      {grupos.map((grupo: Grupo) => (
                        <option key={grupo.id} value={grupo.id}>
                          {grupo.nombre_grupo}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* FECHA */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Fecha / Jornada
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={fechaManual}
                      onChange={(e) => setFechaManual(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs"
                    />
                  </div>

                  {/* EQUIPOS */}
                  {grupoFixtureManual && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Equipo Local
                        </label>

                        <select
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs"
                          value={localManual}
                          onChange={(e) => setLocalManual(e.target.value)}
                        >
                          <option value="">
                            -- Local --
                          </option>

                          {relacionesGrupos
                            .filter(
                              (relacion: EquipoEnGrupo) =>
                                relacion.grupo_id === grupoFixtureManual
                            )
                            .map((relacion: EquipoEnGrupo) => (
                              <option
                                key={relacion.equipos?.id}
                                value={relacion.equipos?.id || ''}
                              >
                                {relacion.equipos?.nombre_equipo}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Equipo Visitante
                        </label>

                        <select
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs"
                          value={visitaManual}
                          onChange={(e) => setVisitaManual(e.target.value)}
                        >
                          <option value="">
                            -- Visitante --
                          </option>

                          {relacionesGrupos
                            .filter(
                              (relacion: EquipoEnGrupo) =>
                                relacion.grupo_id === grupoFixtureManual &&
                                relacion.equipos?.id !== localManual
                            )
                            .map((relacion: EquipoEnGrupo) => (
                              <option
                                key={relacion.equipos?.id}
                                value={relacion.equipos?.id || ''}
                              >
                                {relacion.equipos?.nombre_equipo}
                              </option>
                            ))}
                        </select>
                      </div>

                    </div>
                  )}

                  <button
                    type="button"
                    onClick={agregarPartidoManual}
                    disabled={btnLoading}
                    className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    {btnLoading ? 'Guardando partido...' : '+ Agregar partido al fixture'}
                  </button>

                </div>
              )}  

            {fases.length > 0 && modoOrganizacion === 'automatico' && (
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
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {p.estado}
                        </span>

                        {modoOrganizacion === 'manual' && p.estado === 'programado' && (
                          <button
                            type="button"
                            onClick={() => eliminarPartidoManual(p.id)}
                            disabled={btnLoading}
                            className="text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded-lg hover:bg-red-50 transition"
                            title="Eliminar partido"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
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