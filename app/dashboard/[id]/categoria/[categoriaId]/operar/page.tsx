'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../../../../lib/supabase';
import Link from 'next/link';

interface JugadorInscrito {
  id: string;
  nombre: string;
  apellido: string;
  dorsal: number | string;
  expulsado?: boolean;
}

interface SupabaseInscripcionRow {
  dorsal_numero?: number | string | null;
  jugador: {
    id: string;
    nombre: string;
    apellido: string;
  } | null;
}

interface Partido {
  id: string;
  fase_id: string;
  numero_fecha: string;
  orden: number;
  goles_local: number | null;
  goles_visita: number | null;
  goles_penales_local: number | null;
  goles_penales_visita: number | null;
  grupo_id: string | null;
  estado: 'programado' | 'en_vivo' | 'finalizado' | 'suspendido';
  periodo_actual: '1T' | 'entretiempo' | '2T' | 'no_iniciado';
  lugar: string | null;
  fecha_partido: string | null;
  equipo_local: { id: string; nombre_equipo: string } | null;
  equipo_visita: { id: string; nombre_equipo: string } | null;
}

interface EventoModalState {
  tipo: 'gol' | 'amarilla' | 'roja';
  equipoId: string;
  equipoNombre: string;
  partidoId: string;
}

interface DetalleEstadistica {
  id: string;
  goles: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
  equipo_id: string;
  jugador: {
    nombre: string;
    apellido: string;
  };
  equipo: {
    nombre_equipo: string;
  };
  nombreCompleto: string;
}

interface SupabaseDetalleRow {
  id: string;
  goles: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
  equipo_id: string;
  jugador: {
    nombre: string;
    apellido: string;
  } | null;
  equipo: {
    nombre_equipo: string;
  } | null;
}

interface CustomAlertState {
  titulo: string;
  mensaje: string;
  accion: () => void;
}

const obtenerFechaLocalStr = (fechaDado?: string | Date) => {
  const fecha = fechaDado ? new Date(fechaDado) : new Date();
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function MesaControlPage({ params }: { params: Promise<{ id: string; categoriaId: string }> }) {
  const { id: campeonatoId, categoriaId } = use(params);

  function determinarGanadorId(partido: Partido): string | null {
    const gLocal = partido.goles_local ?? 0;
    const gVisita = partido.goles_visita ?? 0;

    if (gLocal > gVisita) return partido.equipo_local?.id || null;
    if (gVisita > gLocal) return partido.equipo_visita?.id || null;

    const pLocal = partido.goles_penales_local ?? 0;
    const pVisita = partido.goles_penales_visita ?? 0;

    if (pLocal > pVisita) return partido.equipo_local?.id || null;
    if (pVisita > pLocal) return partido.equipo_visita?.id || null;

    return null;
  }

  // async function avanzarGanadorASiguienteRonda(partidoActual: Partido, ganadorId: string) {
  //   try {
  //     const etapaActual = (partidoActual.numero_fecha || '').toLowerCase().trim();
  //     let siguienteEtapa = '';

  //     if (etapaActual.includes('octavo')) {
  //       siguienteEtapa = 'Cuartos de Final';
  //     } else if (etapaActual.includes('cuarto')) {
  //       siguienteEtapa = 'Semifinales';
  //     } else if (etapaActual.includes('semi')) {
  //       siguienteEtapa = 'Gran Final';
  //     } else {
  //       return;
  //     }

  //     const { data: partidosSiguientes } = await supabase
  //       .from('partidos')
  //       .select('id, equipo_local_id, equipo_visita_id')
  //       .eq('fase_id', partidoActual.fase_id)
  //       .eq('numero_fecha', siguienteEtapa)
  //       .is('grupo_id', null)
  //       .or('equipo_local_id.is.null,equipo_visita_id.is.null')
  //       .limit(1);

  //     if (partidosSiguientes && partidosSiguientes.length > 0) {
  //       const partidoDestino = partidosSiguientes[0];

  //       if (partidoDestino.equipo_local_id === ganadorId || partidoDestino.equipo_visita_id === ganadorId) return;

  //       if (!partidoDestino.equipo_local_id) {
  //         await supabase
  //           .from('partidos')
  //           .update({ equipo_local_id: ganadorId })
  //           .eq('id', partidoDestino.id);
  //       } else if (!partidoDestino.equipo_visita_id) {
  //         await supabase
  //           .from('partidos')
  //           .update({ equipo_visita_id: ganadorId })
  //           .eq('id', partidoDestino.id);
  //       }
  //     } else {
  //       const { data: maxOrdenData } = await supabase
  //         .from('partidos')
  //         .select('orden')
  //         .eq('fase_id', partidoActual.fase_id)
  //         .order('orden', { ascending: false })
  //         .limit(1);

  //       const siguienteOrden = (maxOrdenData?.[0]?.orden ?? 0) + 1;


  //       await supabase.from('partidos').insert({
  //         fase_id: partidoActual.fase_id,
  //         grupo_id: null,
  //         equipo_local_id: ganadorId,
  //         equipo_visita_id: null,
  //         numero_fecha: siguienteEtapa,
  //         estado: 'programado',
  //         periodo_actual: 'no_iniciado',
  //         orden: siguienteOrden
  //       });
  //     }
  //   } catch (err) {
  //     console.error('Error al hacer avanzar al equipo:', err);
  //   }
  // }

  function determinarPerdedorId(partido: Partido): string | null {
    const ganadorId = determinarGanadorId(partido);
    if (!ganadorId) return null;
    if (ganadorId === partido.equipo_local?.id) return partido.equipo_visita?.id || null;
    if (ganadorId === partido.equipo_visita?.id) return partido.equipo_local?.id || null;
    return null;
  }

  async function avanzarGanadorASiguienteRonda(partidoActual: Partido, ganadorId: string) {
    try {
      const etapaActual = (partidoActual.numero_fecha || '').toLowerCase().trim();
      let siguienteEtapa = '';
      let etapaTercerPuesto = '';

      if (etapaActual.includes('octavo')) {
        siguienteEtapa = 'Cuartos de Final';
      } else if (etapaActual.includes('cuarto')) {
        siguienteEtapa = 'Semifinales';
      } else if (etapaActual.includes('semi')) {
        siguienteEtapa = 'Gran Final';
        etapaTercerPuesto = 'Tercer Puesto';
      } else {
        return;
      }

      // 1. Avanzar ganador a la siguiente ronda principal
      const { data: partidosSiguientes } = await supabase
        .from('partidos')
        .select('id, equipo_local_id, equipo_visita_id')
        .eq('fase_id', partidoActual.fase_id)
        .eq('numero_fecha', siguienteEtapa)
        .is('grupo_id', null)
        .or('equipo_local_id.is.null,equipo_visita_id.is.null')
        .limit(1);

      if (partidosSiguientes && partidosSiguientes.length > 0) {
        const partidoDestino = partidosSiguientes[0];
        if (partidoDestino.equipo_local_id !== ganadorId && partidoDestino.equipo_visita_id !== ganadorId) {
          if (!partidoDestino.equipo_local_id) {
            await supabase.from('partidos').update({ equipo_local_id: ganadorId }).eq('id', partidoDestino.id);
          } else if (!partidoDestino.equipo_visita_id) {
            await supabase.from('partidos').update({ equipo_visita_id: ganadorId }).eq('id', partidoDestino.id);
          }
        }
      } else {
        const { data: maxOrdenData } = await supabase
          .from('partidos')
          .select('orden')
          .eq('fase_id', partidoActual.fase_id)
          .order('orden', { ascending: false })
          .limit(1);

        const siguienteOrden = (maxOrdenData?.[0]?.orden ?? 0) + 1;

        await supabase.from('partidos').insert({
          fase_id: partidoActual.fase_id,
          grupo_id: null,
          equipo_local_id: ganadorId,
          equipo_visita_id: null,
          numero_fecha: siguienteEtapa,
          estado: 'programado',
          periodo_actual: 'no_iniciado',
          orden: siguienteOrden
        });
      }

      // 2. Si es semifinal, enviar al perdedor al partido de Tercer Puesto
      if (etapaTercerPuesto) {
        const perdedorId = determinarPerdedorId(partidoActual);
        if (!perdedorId) return;

        const { data: partidoTercerList } = await supabase
          .from('partidos')
          .select('id, equipo_local_id, equipo_visita_id')
          .eq('fase_id', partidoActual.fase_id)
          .eq('numero_fecha', etapaTercerPuesto)
          .is('grupo_id', null)
          .or('equipo_local_id.is.null,equipo_visita_id.is.null')
          .limit(1);

        if (partidoTercerList && partidoTercerList.length > 0) {
          const partidoTercer = partidoTercerList[0];
          if (partidoTercer.equipo_local_id !== perdedorId && partidoTercer.equipo_visita_id !== perdedorId) {
            if (!partidoTercer.equipo_local_id) {
              await supabase.from('partidos').update({ equipo_local_id: perdedorId }).eq('id', partidoTercer.id);
            } else if (!partidoTercer.equipo_visita_id) {
              await supabase.from('partidos').update({ equipo_visita_id: perdedorId }).eq('id', partidoTercer.id);
            }
          }
        } else {
          const { data: maxOrdenData } = await supabase
            .from('partidos')
            .select('orden')
            .eq('fase_id', partidoActual.fase_id)
            .order('orden', { ascending: false })
            .limit(1);

          const siguienteOrden = (maxOrdenData?.[0]?.orden ?? 0) + 1;

          await supabase.from('partidos').insert({
            fase_id: partidoActual.fase_id,
            grupo_id: null,
            equipo_local_id: perdedorId,
            equipo_visita_id: null,
            numero_fecha: etapaTercerPuesto,
            estado: 'programado',
            periodo_actual: 'no_iniciado',
            orden: siguienteOrden
          });
        }
      }
    } catch (err) {
      console.error('Error al hacer avanzar al equipo:', err);
    }
  }

  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [filtroHoy, setFiltroHoy] = useState(true);
  const [loading, setLoading] = useState(true);
  const [partidoManualId, setPartidoManualId] = useState<string | null>(null);

  const [penalesLocalInput, setPenalesLocalInput] = useState<number | ''>('');
  const [penalesVisitaInput, setPenalesVisitaInput] = useState<number | ''>('');

  const [modalEvento, setModalEvento] = useState<EventoModalState | null>(null);
  const [jugadoresOpciones, setJugadoresOpciones] = useState<JugadorInscrito[]>([]);
  const [buscandoJugadores, setBuscandoJugadores] = useState(false);
  const [customAlert, setCustomAlert] = useState<CustomAlertState | null>(null);

  const [partidoDetalle, setPartidoDetalle] = useState<Partido | null>(null);
  const [detallesLocal, setDetallesLocal] = useState<DetalleEstadistica[]>([]);
  const [detallesVisita, setDetallesVisita] = useState<DetalleEstadistica[]>([]);
  const [cargandoDetalles, setCargandoDetalles] = useState(false);

  const obtenerGoleadores = (lista: DetalleEstadistica[]) => lista.filter(j => j.goles > 0);
  const obtenerAmonestados = (lista: DetalleEstadistica[]) => lista.filter(j => j.tarjetas_amarillas > 0);
  const obtenerExpulsados = (lista: DetalleEstadistica[]) => lista.filter(j => j.tarjetas_rojas > 0);

  const cargarDatosMesa = async () => {
    try {
      const { data: fasesData } = await supabase
        .from('fases')
        .select('id')
        .eq('categoria_id', categoriaId);

      if (!fasesData || fasesData.length === 0) {
        setPartidos([]);
        return;
      }

      const faseIds = fasesData.map(f => f.id);

      const { data, error } = await supabase
        .from('partidos')
        .select(`
          id,
          fase_id,
          numero_fecha,
          orden,
          goles_local,
          goles_visita,
          goles_penales_local,
          goles_penales_visita,
          grupo_id,
          estado,
          periodo_actual,
          lugar,
          fecha_partido,
          equipo_local:equipo_local_id (id, nombre_equipo),
          equipo_visita:equipo_visita_id (id, nombre_equipo)
        `)
        .in('fase_id', faseIds)
        .order('orden', { ascending: true });

      if (error) throw error;
      const partidosCargados = (data as unknown as Partido[]) || [];
      partidosCargados.sort((a, b) => {
        if (a.orden !== b.orden) return (a.orden || 0) - (b.orden || 0);
        return a.id.localeCompare(b.id);
      });
      setPartidos(partidosCargados);
    } catch (error) {
      console.error('Error cargando partidos:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await cargarDatosMesa();
      setLoading(false);
    };
    init();
  }, [categoriaId]);

  useEffect(() => {
    const channel = supabase
      .channel(`mesa-control-${categoriaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partidos' },
        () => { cargarDatosMesa(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoriaId]);

  const cambiarPeriodo = async (nuevoPeriodo: '1T' | 'entretiempo' | '2T' | 'no_iniciado') => {
    if (!partidoEstrella) return;
    try {
      await supabase
        .from('partidos')
        .update({ periodo_actual: nuevoPeriodo })
        .eq('id', partidoEstrella.id);

      setPartidos(prev =>
        prev.map(p => p.id === partidoEstrella.id ? { ...p, periodo_actual: nuevoPeriodo } : p)
      );
    } catch (e) {
      console.error(e);
    }
  };

  const hoyStr = obtenerFechaLocalStr();

  const partidosDeHoy = partidos.filter(p => {
    const fechaPartLocal = p.fecha_partido ? obtenerFechaLocalStr(p.fecha_partido) : null;
    const esDeHoy = fechaPartLocal === hoyStr;
    return esDeHoy || p.estado === 'en_vivo';
  }).sort((a, b) => {
    // 1. Primero respeta estrictamente el orden lógico de las llaves de la BD
    if (a.orden !== b.orden) {
      return (a.orden || 0) - (b.orden || 0);
    }
    // 2. Si comparten orden, se mantiene el criterio de tiempo
    const timeA = a.fecha_partido ? new Date(a.fecha_partido).getTime() : 0;
    const timeB = b.fecha_partido ? new Date(b.fecha_partido).getTime() : 0;
    return timeA - timeB;
  });

  const partidoEstrella = 
    (partidoManualId ? partidosDeHoy.find(p => p.id === partidoManualId) : null) ||
    partidosDeHoy.find(p => p.estado === 'en_vivo') || 
    partidosDeHoy.find(p => p.estado === 'suspendido') || 
    partidosDeHoy.find(p => p.estado === 'programado') || 
    null;

  const esEliminacionDirecta = partidoEstrella ? !partidoEstrella.grupo_id : false;
  const hayEmpateReglamentario = partidoEstrella && 
    partidoEstrella.goles_local !== null && 
    partidoEstrella.goles_visita !== null && 
    partidoEstrella.goles_local === partidoEstrella.goles_visita;

  const requierePenales = esEliminacionDirecta && hayEmpateReglamentario;

  const partidosPorFecha = partidos.reduce((acc: { [key: string]: Partido[] }, partido) => {
    const numF = partido.numero_fecha || 'Otros';
    if (!acc[numF]) acc[numF] = [];
    acc[numF].push(partido);
    return acc;
  }, {});

  const ordenFases: { [key: string]: number } = {
    'dieciseisavos': 99,
    'dieciseisavos de final': 99,
    'octavos': 100,
    'octavos de final': 100,
    'cuartos': 101,
    'cuartos de final': 101,
    'semifinal': 102,
    'semifinales': 102,
    'tercer puesto': 103,
    'tercer y cuarto puesto': 103,
    'final': 104,
    'gran final': 104
  };

  const llavesOrdenadas = Object.keys(partidosPorFecha).sort((a, b) => {
    const lowerA = a.toLowerCase().trim();
    const lowerB = b.toLowerCase().trim();

    const priA = ordenFases[lowerA];
    const priB = ordenFases[lowerB];

    // Si ambas son fases de eliminación directa conocidas
    if (priA !== undefined && priB !== undefined) {
      return priA - priB;
    }
    // Las fases de grupos / jornadas numéricas van primero, las finales después
    if (priA !== undefined && priB === undefined) return 1;
    if (priA === undefined && priB !== undefined) return -1;

    // Extraer números de strings como "Fecha 1", "Jornada 2" o números directos "1", "2"
    const numA = parseInt(a.replace(/\D/g, ''), 10);
    const numB = parseInt(b.replace(/\D/g, ''), 10);

    const hasNumA = !isNaN(numA);
    const hasNumB = !isNaN(numB);

    if (hasNumA && hasNumB) {
      return numA - numB;
    }
    if (hasNumA) return -1;
    if (hasNumB) return 1;

    return a.localeCompare(b);
  });

  const abrirModalEvento = async (tipo: 'gol' | 'amarilla' | 'roja', equipoId: string, equipoNombre: string, partidoId: string) => {
    setModalEvento({ tipo, equipoId, equipoNombre, partidoId });
    setBuscandoJugadores(true);
    try {
      const { data: jugData, error: jugError } = await supabase
        .from('inscripciones_jugadores')
        .select(`dorsal_numero, jugador:jugador_id (id, nombre, apellido)`)
        .eq('equipo_id', equipoId);

      if (jugError) {
        console.error('Error al consultar inscripciones:', jugError);
      }

      const { data: incData } = await supabase
        .from('detalles_partidos')
        .select('jugador_id, tarjetas_amarillas, tarjetas_rojas')
        .eq('partido_id', partidoId);


      const listaCruda = (jugData as unknown as SupabaseInscripcionRow[]) || [];
      const transformado = listaCruda
        .filter(item => item.jugador !== null && item.jugador !== undefined)
        .map(item => {
          const jug = item.jugador!;
          const historialJugador = incData?.filter(i => i.jugador_id === jug.id) || [];
          const totalAmarillas = historialJugador.reduce((acc, curr) => acc + (curr.tarjetas_amarillas || 0), 0);
          const totalRojas = historialJugador.reduce((acc, curr) => acc + (curr.tarjetas_rojas || 0), 0);
          const expulsado = totalRojas > 0 || totalAmarillas >= 2;

          return {
            id: jug.id,
            nombre: jug.nombre,
            apellido: jug.apellido,
            dorsal: item.dorsal_numero ?? '',
            expulsado
          };
        });

      setJugadoresOpciones(transformado);
    } catch (e) {
      console.error(e);
    } finally {
      setBuscandoJugadores(false);
    }
  };

  const abrirDetallesPartido = async (partido: Partido) => {
    setPartidoDetalle(partido);
    setCargandoDetalles(true);
    try {
      const { data, error } = await supabase
        .from('detalles_partidos')
        .select(`
          id, goles, tarjetas_amarillas, tarjetas_rojas, equipo_id,
          jugador:jugador_id (nombre, apellido),
          equipo:equipo_id (nombre_equipo)
        `)
        .eq('partido_id', partido.id);

      if (error) throw error;

      const formateado = (data as unknown as SupabaseDetalleRow[] || [])
        .filter(item => item.jugador !== null && item.equipo !== null)
        .map(item => ({
          id: item.id,
          goles: item.goles,
          tarjetas_amarillas: item.tarjetas_amarillas,
          tarjetas_rojas: item.tarjetas_rojas,
          equipo_id: item.equipo_id,
          nombreCompleto: `${item.jugador!.nombre} ${item.jugador!.apellido}`,
          jugador: { nombre: item.jugador!.nombre, apellido: item.jugador!.apellido },
          equipo: { nombre_equipo: item.equipo!.nombre_equipo }
        }));

      setDetallesLocal(formateado.filter(f => f.equipo_id === partido.equipo_local?.id));
      setDetallesVisita(formateado.filter(f => f.equipo_id === partido.equipo_visita?.id));
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoDetalles(false);
    }
  };

  const registrarEventoJugador = async (jugadorId: string) => {
    if (!modalEvento || !partidoEstrella) return;

    try {
      const { data: existe } = await supabase
        .from('detalles_partidos')
        .select('id, goles, tarjetas_amarillas, tarjetas_rojas')
        .eq('partido_id', modalEvento.partidoId)
        .eq('jugador_id', jugadorId)
        .maybeSingle();

      const esLocal = modalEvento.equipoId === partidoEstrella.equipo_local?.id;
      let nuevoGolLocal = partidoEstrella.goles_local || 0;
      let nuevoGolVisita = partidoEstrella.goles_visita || 0;

      if (modalEvento.tipo === 'gol') {
        if (esLocal) nuevoGolLocal++;
        else nuevoGolVisita++;
      }

      if (existe) {
        const nuevasAmarillas = existe.tarjetas_amarillas + (modalEvento.tipo === 'amarilla' ? 1 : 0);
        const nuevaRoja = nuevasAmarillas >= 2 ? 1 : existe.tarjetas_rojas + (modalEvento.tipo === 'roja' ? 1 : 0);

        await supabase
          .from('detalles_partidos')
          .update({
            goles: existe.goles + (modalEvento.tipo === 'gol' ? 1 : 0),
            tarjetas_amarillas: nuevasAmarillas,
            tarjetas_rojas: nuevaRoja
          })
          .eq('id', existe.id);
      } else {
        await supabase
          .from('detalles_partidos')
          .insert({
            partido_id: modalEvento.partidoId,
            jugador_id: jugadorId,
            equipo_id: modalEvento.equipoId,
            goles: modalEvento.tipo === 'gol' ? 1 : 0,
            tarjetas_amarillas: modalEvento.tipo === 'amarilla' ? 1 : 0,
            tarjetas_rojas: modalEvento.tipo === 'roja' ? 1 : 0,
          });
      }

      await supabase
        .from('partidos')
        .update({ goles_local: nuevoGolLocal, goles_visita: nuevoGolVisita })
        .eq('id', modalEvento.partidoId);

      setPartidos(prev => prev.map(p => p.id === modalEvento.partidoId ? { ...p, goles_local: nuevoGolLocal, goles_visita: nuevoGolVisita } : p));
      setModalEvento(null);
    } catch (error) {
      console.error(error);
    }
  };

  const guardarPenalesEnBD = async (pLocal: number, pVisita: number) => {
    if (!partidoEstrella) return;
    await supabase
      .from('partidos')
      .update({
        goles_penales_local: pLocal,
        goles_penales_visita: pVisita
      })
      .eq('id', partidoEstrella.id);
  };

  const anularGol = async (detalle: DetalleEstadistica, partidoActual: Partido) => {
    if (detalle.goles <= 0) return;

    setCustomAlert({
      titulo: '⚠️ Advertencia: Anular Gol',
      mensaje: `¿Estás seguro de anular 1 gol a ${detalle.nombreCompleto} (${detalle.equipo.nombre_equipo})? Esta acción restará un gol en el marcador oficial del encuentro.`,
      accion: async () => {
        try {
          const nuevosGolesJugador = detalle.goles - 1;

          // 1. Actualizar el registro individual del jugador
          const { error: errDetalle } = await supabase
            .from('detalles_partidos')
            .update({ goles: nuevosGolesJugador })
            .eq('id', detalle.id);

          if (errDetalle) throw errDetalle;

          // 2. Calcular nuevo marcador global del partido
          const esLocal = detalle.equipo_id === partidoActual.equipo_local?.id;
          let nuevoGolLocal = partidoActual.goles_local || 0;
          let nuevoGolVisita = partidoActual.goles_visita || 0;

          if (esLocal) {
            nuevoGolLocal = Math.max(0, nuevoGolLocal - 1);
          } else {
            nuevoGolVisita = Math.max(0, nuevoGolVisita - 1);
          }

          // 3. Actualizar la tabla partidos
          const { error: errPartido } = await supabase
            .from('partidos')
            .update({ goles_local: nuevoGolLocal, goles_visita: nuevoGolVisita })
            .eq('id', partidoActual.id);

          if (errPartido) throw errPartido;

          // 4. Actualizar estados locales y recargar detalles del modal
          setPartidos(prev => prev.map(p => p.id === partidoActual.id ? { ...p, goles_local: nuevoGolLocal, goles_visita: nuevoGolVisita } : p));
          setPartidoDetalle(prev => prev ? { ...prev, goles_local: nuevoGolLocal, goles_visita: nuevoGolVisita } : null);
          
          await abrirDetallesPartido({ ...partidoActual, goles_local: nuevoGolLocal, goles_visita: nuevoGolVisita });
          setCustomAlert(null);
        } catch (e) {
          console.error(e);
          setCustomAlert({
            titulo: '❌ Error',
            mensaje: 'No se pudo anular el gol en la base de datos.',
            accion: () => setCustomAlert(null)
          });
        }
      }
    });
  };

  const cambiarEstadoPartido = async (
    nuevoEstado: 'en_vivo' | 'finalizado' | 'suspendido', 
    periodo?: '1T' | 'entretiempo' | '2T' | 'no_iniciado'
  ) => {
    if (!partidoEstrella) return;
    try {
      const datosActualizar: Partial<Partido> = { estado: nuevoEstado };
      
      if (nuevoEstado === 'en_vivo' && partidoEstrella.goles_local === null) {
        datosActualizar.goles_local = 0;
        datosActualizar.goles_visita = 0;
      }

      if (periodo) {
        datosActualizar.periodo_actual = periodo;
      }

      if (nuevoEstado === 'finalizado') {
        datosActualizar.periodo_actual = 'no_iniciado';

        let finalPenalesLocal = 0;
        let finalPenalesVisita = 0;

        if (requierePenales) {
          finalPenalesLocal = penalesLocalInput === '' ? 0 : Number(penalesLocalInput);
          finalPenalesVisita = penalesVisitaInput === '' ? 0 : Number(penalesVisitaInput);
          datosActualizar.goles_penales_local = finalPenalesLocal;
          datosActualizar.goles_penales_visita = finalPenalesVisita;
        }

        const partidoConDatosActuales: Partido = {
          ...partidoEstrella,
          ...datosActualizar,
          goles_local: partidoEstrella.goles_local ?? 0,
          goles_visita: partidoEstrella.goles_visita ?? 0,
          goles_penales_local: finalPenalesLocal,
          goles_penales_visita: finalPenalesVisita,
        };

        const ganadorId = determinarGanadorId(partidoConDatosActuales);

        if (ganadorId && partidoEstrella.grupo_id === null) {
          await avanzarGanadorASiguienteRonda(partidoEstrella, ganadorId);
        }
      }
      
      await supabase.from('partidos').update(datosActualizar).eq('id', partidoEstrella.id);
      
      if (nuevoEstado === 'finalizado') {
        setPenalesLocalInput('');
        setPenalesVisitaInput('');
        if (partidoManualId === partidoEstrella.id) {
          setPartidoManualId(null);
        }
      }

      await cargarDatosMesa();
      
    } catch (e) {
      console.error(e);
    }
  };

  const confirmarWO = (ganador: 'local' | 'visita') => {
    const nombreE = ganador === 'local' ? partidoEstrella?.equipo_local?.nombre_equipo : partidoEstrella?.equipo_visita?.nombre_equipo;
    setCustomAlert({
      titulo: '⚠️ Sanción por Walkover (W.O.)',
      mensaje: `¿Estás seguro de finalizar este encuentro dando como ganador reglamentario a ${nombreE} por un marcador de 3-0?`,
      accion: async () => {
        if (!partidoEstrella) return;
        const gL = ganador === 'local' ? 3 : 0;
        const gV = ganador === 'visita' ? 3 : 0;
        try {
          await supabase.from('partidos').update({ goles_local: gL, goles_visita: gV, estado: 'finalizado' }).eq('id', partidoEstrella.id);
          setPartidos(prev => prev.map(p => p.id === partidoEstrella.id ? { ...p, goles_local: gL, goles_visita: gV, estado: 'finalizado' } : p));
          cambiarPeriodo('no_iniciado');
        } catch (e) { console.error(e); }
        setCustomAlert(null);
      }
    });
  };

  const confirmarFinalizarPartido = () => {
    if (requierePenales) {
      if (penalesLocalInput === '' || penalesVisitaInput === '') {
        setCustomAlert({
          titulo: '⚠️ Penales Incompletos',
          mensaje: 'Este partido es de eliminación directa y requiere registrar el marcador de penales para definir al clasificado.',
          accion: () => setCustomAlert(null)
        });
        return;
      }

      if (Number(penalesLocalInput) === Number(penalesVisitaInput)) {
        setCustomAlert({
          titulo: '⚠️ Penales Empatados',
          mensaje: 'La tanda de penales no puede terminar en empate. Un equipo debe resultar ganador.',
          accion: () => setCustomAlert(null)
        });
        return;
      }
    }

    setCustomAlert({
      titulo: '🏁 Finalizar Encuentro Oficial',
      mensaje: '¿Deseas cerrar el acta de juego? El marcador y estadísticas se guardarán de forma permanente.',
      accion: () => {
        cambiarEstadoPartido('finalizado');
        setCustomAlert(null);
      }
    });
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans text-slate-500 font-bold">Sincronizando Consola de Arbitraje...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      <nav className="bg-white border-b border-slate-200 px-4 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-slate-900">Indor<span className="text-blue-600">SaaS</span></span>
          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Mesa Live</span>
        </div>
        <Link href={`/dashboard/${campeonatoId}/categoria/${categoriaId}/fixture`} className="text-xs font-bold text-slate-600 hover:text-blue-600 bg-slate-100 px-3 py-2 rounded-xl transition">
          ← Panel General
        </Link>
      </nav>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Estación de Control</h2>
            <p className="text-xs text-slate-400 font-medium">Gestión en tiempo real con bloqueo automatizado por disciplina.</p>
          </div>
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex gap-1 w-full sm:w-auto">
            <button onClick={() => setFiltroHoy(true)} className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition ${filtroHoy ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
              ⚡ Jornada de Hoy ({partidosDeHoy.length})
            </button>
            <button onClick={() => setFiltroHoy(false)} className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition ${!filtroHoy ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
              🌐 Fixture Completo
            </button>
            <Link 
              href={`/dashboard/${campeonatoId}/categoria/${categoriaId}/posiciones`}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase rounded-xl hover:bg-slate-100 transition"
            >
              📊 Tabla de Posiciones
            </Link>
          </div>
        </div>
        
        {filtroHoy ? (
          <div className="space-y-6">
            {partidoEstrella ? (
              <div className="bg-white border-2 border-slate-900 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900" />
                
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    {esEliminacionDirecta ? '🏆 Eliminación Directa' : 'Partido de Grupo'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${partidoEstrella.estado === 'en_vivo' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className="text-[11px] font-extrabold uppercase text-slate-600 tracking-wide">
                      {partidoEstrella.estado === 'en_vivo' ? `EN VIVO • ${partidoEstrella.periodo_actual}` : 'PROGRAMADO'}
                    </span>
                  </div>
                </div>

                {partidoEstrella.estado === 'suspendido' && (
                    <div className="mb-4 bg-amber-100 border-2 border-amber-300 text-amber-800 p-4 rounded-2xl text-center">
                        <p className="font-black text-lg">⏸️ PARTIDO SUSPENDIDO</p>
                        <p className="text-xs font-semibold mt-1">El encuentro fue detenido temporalmente.</p>
                    </div>
                )}

                <div className="flex flex-row justify-between items-center gap-2 sm:gap-4 py-4 bg-slate-900 text-white rounded-2xl px-3 sm:px-6 text-center">
                  <div className="w-5/12 py-2">
                    <p className="text-sm sm:text-xl font-black uppercase tracking-tight break-words">{partidoEstrella.equipo_local?.nombre_equipo}</p>
                  </div>
                  <div className="w-auto py-1 flex justify-center shrink-0">
                    <div className="bg-slate-950 border-2 border-slate-700 text-emerald-400 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl font-mono text-xl sm:text-4xl font-black tracking-widest min-w-[80px] sm:min-w-[120px]">
                      {partidoEstrella.goles_local !== null ? `${partidoEstrella.goles_local}-${partidoEstrella.goles_visita}` : '0-0'}
                    </div>
                  </div>
                  <div className="w-5/12 py-2">
                    <p className="text-sm sm:text-xl font-black uppercase tracking-tight break-words">{partidoEstrella.equipo_visita?.nombre_equipo}</p>
                  </div>
                </div>

                {requierePenales && (
                  <div className="mt-4 bg-emerald-600/20 p-4 rounded-2xl text-center space-y-2">
                    <span className="text-xs font-black text-emerald-700 uppercase tracking-widest block">
                      🥅 Definición por Penales (Empate Obligatorio de Desempate)
                    </span>
                    <div className="flex justify-center items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">{partidoEstrella.equipo_local?.nombre_equipo}</span>
                        <input
                          type="number"
                          min="0"
                          value={penalesLocalInput}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : parseInt(e.target.value);
                            setPenalesLocalInput(val);
                            if (val !== '' && penalesVisitaInput !== '') guardarPenalesEnBD(val, Number(penalesVisitaInput));
                          }}
                          className="w-14 h-10 text-center font-bold text-lg bg-white border border-slate-300 rounded-lg text-slate-900 shadow-sm focus:ring-2 focus:ring-amber-500"
                          placeholder="0"
                        />
                      </div>
                      <span className="font-black text-slate-400">-</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={penalesVisitaInput}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : parseInt(e.target.value);
                            setPenalesVisitaInput(val);
                            if (penalesLocalInput !== '' && val !== '') guardarPenalesEnBD(Number(penalesLocalInput), val);
                          }}
                          className="w-14 h-10 text-center font-bold text-lg bg-white border border-slate-300 rounded-lg text-slate-900 shadow-sm focus:ring-2 focus:ring-amber-500"
                          placeholder="0"
                        />
                        <span className="text-xs font-bold text-slate-700">{partidoEstrella.equipo_visita?.nombre_equipo}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-slate-100">
                  {partidoEstrella.estado === 'programado' && (
                    <div className="space-y-3">
                      <button onClick={() => cambiarEstadoPartido('en_vivo', '1T')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow transition">
                        ▶ Activar e Iniciar Primer Tiempo
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button onClick={() => confirmarWO('local')} className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2 rounded-xl text-[11px] border transition">
                          {partidoEstrella.equipo_local?.nombre_equipo} (3-0)
                        </button>
                        <button onClick={() => confirmarWO('visita')} className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2 rounded-xl text-[11px] border transition">
                          {partidoEstrella.equipo_visita?.nombre_equipo} (3-0)
                        </button>
                      </div>
                    </div>
                  )}

                  {partidoEstrella.estado === 'en_vivo' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                          <span className=" text-gray-500 font-bold ">Acciones para {partidoEstrella.equipo_local?.nombre_equipo}</span>
                          <button onClick={() => abrirModalEvento('gol', partidoEstrella.equipo_local!.id, partidoEstrella.equipo_local!.nombre_equipo, partidoEstrella.id)} className="w-full bg-blue-900 hover:bg-emerald-600 text-white font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition">
                            ⚽ Gol {partidoEstrella.equipo_local?.nombre_equipo}
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => abrirModalEvento('amarilla', partidoEstrella.equipo_local!.id, partidoEstrella.equipo_local!.nombre_equipo, partidoEstrella.id)} className="bg-gray-300 hover:bg-amber-500 text-black font-bold py-2 rounded-lg text-xs transition">
                              🟨 Tarjeta
                            </button>
                            <button onClick={() => abrirModalEvento('roja', partidoEstrella.equipo_local!.id, partidoEstrella.equipo_local!.nombre_equipo, partidoEstrella.id)} className="bg-gray-300 hover:bg-red-500 text-black font-bold py-2 rounded-lg text-xs transition">
                              🟥 Tarjeta
                            </button>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                          <span className="text-gray-500 font-bold ">Acciones para {partidoEstrella.equipo_visita?.nombre_equipo}</span>
                          <button onClick={() => abrirModalEvento('gol', partidoEstrella.equipo_visita!.id, partidoEstrella.equipo_visita!.nombre_equipo, partidoEstrella.id)} className="w-full bg-blue-900 hover:bg-emerald-600 text-white font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition">
                            ⚽ Gol {partidoEstrella.equipo_visita?.nombre_equipo}
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => abrirModalEvento('amarilla', partidoEstrella.equipo_visita!.id, partidoEstrella.equipo_visita!.nombre_equipo, partidoEstrella.id)} className="bg-gray-300 hover:bg-amber-500 text-slate-950 font-bold py-2 rounded-lg text-xs transition">
                              🟨 Tarjeta
                            </button>
                            <button onClick={() => abrirModalEvento('roja', partidoEstrella.equipo_visita!.id, partidoEstrella.equipo_visita!.nombre_equipo, partidoEstrella.id)} className="bg-gray-300 hover:bg-red-500 text-black font-bold py-2 rounded-lg text-xs transition">
                              🟥 Tarjeta
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 p-3 rounded-xl">
                        <div className="flex gap-2">
                          {partidoEstrella.periodo_actual === '1T' && (
                            <button onClick={() => cambiarPeriodo('entretiempo')} className="bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition hover:bg-slate-800">
                              ⏸️ Fin 1° Tiempo
                            </button>
                          )}
                          {partidoEstrella.periodo_actual === 'entretiempo' && (
                            <button onClick={() => cambiarPeriodo('2T')} className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition hover:bg-indigo-700">
                              ▶️ Iniciar 2° Tiempo
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setCustomAlert({
                                titulo: '⏸️ Suspender Partido',
                                mensaje: '¿Deseas suspender este encuentro temporalmente?',
                                accion: () => {
                                  cambiarEstadoPartido('suspendido');
                                  setCustomAlert(null);
                                }
                              });
                            }}
                            className="bg-blue-500 hover:bg-amber-600 text-white text-xs font-black px-4 py-2 rounded-lg transition uppercase tracking-wider shadow"
                          >
                            ⏸️ Suspender
                          </button>

                          <button
                            onClick={confirmarFinalizarPartido}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-black px-4 py-2 rounded-lg transition uppercase tracking-wider shadow"
                          >
                            🏁 Finalizar Partido
                          </button>

                        </div>
                      </div>
                    </div>
                  )}
                  {partidoEstrella.estado === 'suspendido' && (
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setCustomAlert({
                            titulo: '▶️ Reanudar Partido',
                            mensaje: '¿Deseas continuar este encuentro desde donde fue suspendido?',
                            accion: () => {
                              cambiarEstadoPartido('en_vivo');
                              setCustomAlert(null);
                            }
                          });
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow transition"
                      >
                        ▶️ Reanudar Partido
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl">
                <p className="text-slate-500 font-bold text-xs">No hay compromisos activos en este momento.</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Estado de la Fecha</h3>
                {partidoManualId && (
                  <button 
                    onClick={() => setPartidoManualId(null)}
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    🔄 Volver al automático
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {partidosDeHoy.map((partido) => {
                  const esFinalizado = partido.estado === 'finalizado';
                  const huboPenales = partido.goles_penales_local !== null && partido.goles_penales_visita !== null;
                  const enGestionActual = partidoEstrella?.id === partido.id;

                  return (
                    <div key={partido.id} className={`bg-white border p-3 rounded-xl flex flex-col justify-between gap-2.5 ${enGestionActual ? 'border-2 border-blue-600 shadow-md' : 'border-slate-200'} ${esFinalizado ? 'opacity-75' : ''}`}>
                      <div className="flex justify-between items-center text-xs font-black text-slate-800">
                        <span className="truncate max-w-[70px]">{partido.equipo_local?.nombre_equipo}</span>
                        <span className="font-mono text-blue-600 bg-slate-100 px-1 rounded">
                          {partido.goles_local !== null ? `${partido.goles_local}-${partido.goles_visita}` : 'vs'}
                          {huboPenales && ` (${partido.goles_penales_local}-${partido.goles_penales_visita})`}
                        </span>
                        <span className="truncate max-w-[70px]">{partido.equipo_visita?.nombre_equipo}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                        <button onClick={() => abrirDetallesPartido(partido)} className="text-[10px] text-slate-500 font-bold hover:text-blue-600">
                          📊 Ver Incidencias
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => setPartidoManualId(partido.id)} 
                            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg transition ${
                              enGestionActual 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {enGestionActual ? '🎯 Gestionando' : '⚙️ Gestionar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {llavesOrdenadas.map((numFecha) => {
              const partidosDeLaFase = [...(partidosPorFecha[numFecha] || [])].sort((a, b) => {
                if (a.orden !== b.orden) return (a.orden || 0) - (b.orden || 0);
                return a.id.localeCompare(b.id);
                });
              const esNumero = !isNaN(Number(numFecha.replace(/\D/g, '')));
              const esFinales = numFecha.toLowerCase().includes('final') || numFecha.toLowerCase().includes('tercer');
              const tituloJornada = esNumero && !isNaN(Number(numFecha)) ? `🗓️ Jornada ${numFecha}` : `🏆 ${numFecha}`;

              // Si es tercer puesto, podemos evaluar si se muestra o se oculta según una opción
              if (numFecha.toLowerCase().includes('tercer')) {
                return (
                  <div key={numFecha} className="bg-amber-50/50 border border-amber-200 p-4 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black text-amber-800 uppercase tracking-wider">
                        🥉 Partido del Tercer Puesto (Opcional)
                      </h3>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                        Flexible
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[...(partidosDeLaFase || [])].sort((a, b) => a.orden - b.orden).map((partido) => {
                        const fechaPartLocal = partido.fecha_partido ? obtenerFechaLocalStr(partido.fecha_partido) : null;
                        const estaAsignadoHoy = fechaPartLocal === hoyStr;
                        return (
                          <div key={partido.id} className="bg-white border border-amber-200 p-4 rounded-xl flex flex-col justify-between gap-3 shadow-sm">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                              <span>📍 {partido.lugar || 'Principal'}</span>
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{partido.estado}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-black text-slate-900">
                              <span className="truncate w-5/12">{partido.equipo_local?.nombre_equipo || 'Perdedor Semifinal 1'}</span>
                              <span className="font-mono text-blue-600 bg-slate-50 border px-2 py-0.5 rounded-lg">
                                {partido.goles_local !== null ? `${partido.goles_local}-${partido.goles_visita}` : 'vs'}
                              </span>
                              <span className="truncate w-5/12 text-right">{partido.equipo_visita?.nombre_equipo || 'Perdedor Semifinal 2'}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                              <button onClick={() => abrirDetallesPartido(partido)} className="text-[10px] text-slate-500 font-bold hover:text-blue-600">
                                📊 Ver Incidencias
                              </button>
                              {(partido.estado === 'programado' || partido.estado === 'suspendido') && (
                                <button
                                  disabled={!!estaAsignadoHoy}
                                  onClick={async () => {
                                    const timestampActual = new Date().toISOString();
                                    await supabase.from('partidos').update({ fecha_partido: timestampActual }).eq('id', partido.id);
                                    await cargarDatosMesa();
                                  }}
                                  className="text-[10px] font-black px-2.5 py-1 rounded-lg border bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 transition"
                                >
                                  {estaAsignadoHoy ? '✓ Asignado Hoy' : '⚡ Programar Tercer Puesto'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <div key={numFecha} className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    {tituloJornada}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {partidosDeLaFase.map((partido) => {
                      const fechaPartLocal = partido.fecha_partido ? obtenerFechaLocalStr(partido.fecha_partido) : null;
                      const estaAsignadoHoy = fechaPartLocal === hoyStr;
                      const huboPenales = partido.goles_penales_local !== null && partido.goles_penales_visita !== null;

                      return (
                        <div key={partido.id} className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between gap-3 shadow-sm">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                            <span>📍Cambiar a nombre del torneo {partido.lugar || 'Principal'}</span>
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{partido.estado}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-black text-slate-900">
                            <span className="truncate w-5/12">{partido.equipo_local?.nombre_equipo}</span>
                            <span className="font-mono text-blue-600 bg-slate-50 border px-2 py-0.5 rounded-lg">
                              {partido.goles_local !== null ? `${partido.goles_local}-${partido.goles_visita}` : 'vs'}
                              {huboPenales && <span className="text-[10px] text-amber-600 block text-center">({partido.goles_penales_local}-{partido.goles_penales_visita} pen.)</span>}
                            </span>
                            <span className="truncate w-5/12 text-right">{partido.equipo_visita?.nombre_equipo}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                            <button onClick={() => abrirDetallesPartido(partido)} className="text-[10px] text-slate-500 font-bold hover:text-blue-600">
                              📊 Ver Incidencias
                            </button>
                            {(partido.estado === 'programado' || partido.estado === 'suspendido') && (
                              <button
                                disabled={!!estaAsignadoHoy}
                                onClick={async () => {
                                  try {
                                    const timestampActual = new Date().toISOString();
                                    const { error } = await supabase
                                      .from('partidos')
                                      .update({ fecha_partido: timestampActual })
                                      .eq('id', partido.id);

                                    if (error) throw error;
                                    await cargarDatosMesa();
                                  } catch (e) { 
                                    const mensaje = e instanceof Error ? e.message : 'Error desconocido';
                                    setCustomAlert({
                                      titulo: '❌ Error en Base de Datos',
                                      mensaje,
                                      accion: () => setCustomAlert(null)
                                    });
                                  }
                                }}
                                className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition ${
                                  estaAsignadoHoy 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 cursor-not-allowed' 
                                    : partido.estado === 'suspendido'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {estaAsignadoHoy 
                                ? '✓ Asignado para Hoy' 
                                : partido.estado === 'suspendido'
                                ? '⚡ Reanudar Hoy'
                                : '⚡ Programar Hoy'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {modalEvento && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-100">
              <div className="text-center">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${modalEvento.tipo === 'gol' ? 'bg-blue-50 text-blue-600' : modalEvento.tipo === 'amarilla' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                  {modalEvento.tipo === 'gol' ? '⚽ Anotar Gol' : modalEvento.tipo === 'amarilla' ? '🟨 Amonestación' : '🟥 Expulsión Directa'}
                </span>
                <h4 className="text-xs font-black text-slate-500 mt-2 uppercase truncate">{modalEvento.equipoNombre}</h4>
              </div>

              <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-slate-50">
                {buscandoJugadores ? (
                  <p className="text-center py-4 text-xs font-bold text-slate-400">Buscando nómina...</p>
                ) : jugadoresOpciones.length === 0 ? (
                  <p className="text-center py-4 text-xs text-slate-400 font-medium">Sin jugadores inscritos.</p>
                ) : (
                  jugadoresOpciones.map((jugador) => (
                    <button
                      key={jugador.id}
                      disabled={jugador.expulsado}
                      onClick={() => registrarEventoJugador(jugador.id)}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex justify-between items-center ${jugador.expulsado ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'hover:bg-blue-600 hover:text-white text-slate-700'}`}
                    >
                      <span>
                        {jugador.dorsal !== '' && jugador.dorsal !== null && jugador.dorsal !== undefined ?
                        ( <span className=" bg-emerald-200 text-teal-950 px-1.5 py-0.5 rounded-md font-bold text-xs mr-2">{jugador.dorsal} </span> ) : ''}
                        {jugador.nombre} {jugador.apellido}
                      </span>
                      {jugador.expulsado && <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black uppercase">🚫 Suspendido</span>}
                    </button>
                  ))
                )}
              </div>
              <button onClick={() => setModalEvento(null)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-2xl text-xs transition">Cancelar</button>
            </div>
          </div>
        )}

        {partidoDetalle && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-2xl w-full rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-100">
              <div className="border-b pb-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">📊 Ficha Técnica de Eventos</h3>
                <p className="text-[10px] text-slate-400">Detalle dividido por escuadra competidora.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 max-h-80 overflow-y-auto">
                <div className="space-y-2 pr-0 sm:pr-2">
                  <h4 className="text-xs font-black text-blue-600 uppercase border-b pb-1 truncate">{partidoDetalle.equipo_local?.nombre_equipo}</h4>
                  {cargandoDetalles ? (
                    <p className="text-xs text-slate-400">Cargando...</p>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-black text-green-600 text-[11px] mb-1">⚽ GOLES</h5>
                        {obtenerGoleadores(detallesLocal).length === 0 ? (
                          <p className="text-[11px] text-slate-400">Sin goles.</p>
                        ) : (
                          obtenerGoleadores(detallesLocal).map(j => (
                            <div key={j.id} className="text-[11px] flex justify-between items-center py-1 border-b border-slate-100/60 last:border-0">
                              <span className="truncate max-w-[140px]">{j.nombreCompleto}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-green-600">⚽ x{j.goles}</span>
                                <button
                                  onClick={() => partidoDetalle && anularGol(j, partidoDetalle)}
                                  className="text-[9px] bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded border border-red-200 transition"
                                  title="Anular un gol a este jugador"
                                >
                                  Anular
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div>
                        <h5 className="font-black text-amber-600 text-[11px] mb-1">🟨 AMONESTADOS</h5>
                        {obtenerAmonestados(detallesLocal).map(j => (
                          <div key={`a-${j.id}`} className="text-[11px] flex justify-between">
                            <span>{j.nombreCompleto}</span>
                            <span>🟨 x{j.tarjetas_amarillas}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h5 className="font-black text-red-600 text-[11px] mb-1">🟥 EXPULSADOS</h5>
                        {obtenerExpulsados(detallesLocal).map(j => (
                          <div key={`r-${j.id}`} className="text-[11px] flex justify-between">
                            <span>{j.nombreCompleto}</span>
                            <span>{'🟥'.repeat(j.tarjetas_rojas)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 sm:pt-0 sm:pl-4">
                  <h4 className="text-xs font-black text-blue-600 uppercase border-b pb-1 truncate">{partidoDetalle.equipo_visita?.nombre_equipo}</h4>
                  {cargandoDetalles ? (
                    <p className="text-xs text-slate-400">Cargando...</p>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-black text-green-600 text-[11px] mb-1">⚽ GOLES</h5>
                        {obtenerGoleadores(detallesVisita).length === 0 ? (
                          <p className="text-[11px] text-slate-400">Sin goles.</p>
                        ) : (
                          obtenerGoleadores(detallesVisita).map(j => (
                            <div key={j.id} className="text-[11px] flex justify-between items-center py-1 border-b border-slate-100/60 last:border-0">
                              <span className="truncate max-w-[140px]">{j.nombreCompleto}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-green-600">⚽ x{j.goles}</span>
                                <button
                                  onClick={() => partidoDetalle && anularGol(j, partidoDetalle)}
                                  className="text-[9px] bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded border border-red-200 transition"
                                  title="Anular un gol a este jugador"
                                >
                                  Anular
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div>
                        <h5 className="font-black text-amber-600 text-[11px] mb-1">🟨 AMONESTADOS</h5>
                        {obtenerAmonestados(detallesVisita).map(j => (
                          <div key={`a-${j.id}`} className="text-[11px] flex justify-between">
                            <span>{j.nombreCompleto}</span>
                            <span>🟨 x{j.tarjetas_amarillas}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h5 className="font-black text-red-600 text-[11px] mb-1">🟥 EXPULSADOS</h5>
                        {obtenerExpulsados(detallesVisita).map(j => (
                          <div key={`r-${j.id}`} className="text-[11px] flex justify-between">
                            <span>{j.nombreCompleto}</span>
                            <span>{'🟥'.repeat(j.tarjetas_rojas)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button onClick={() => setPartidoDetalle(null)} className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-2xl text-xs transition hover:bg-slate-800">Cerrar Reporte</button>
            </div>
          </div>
        )}

        {customAlert && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-slate-100 max-w-sm w-full rounded-3xl p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold shadow-sm">
                🔔
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{customAlert.titulo}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{customAlert.mensaje}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setCustomAlert(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-2xl text-xs transition">
                  Cancelar
                </button>
                <button onClick={customAlert.accion} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-2xl text-xs shadow-md shadow-blue-600/20 transition">
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}