'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../../../../../lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface FilaPosicion {
  grupo_id: string;
  equipo_id: string;
  nombre_equipo: string;
  pts: number;
  dg: number;
  gf: number;
}

interface Grupo {
  id: string;
  nombre_grupo: string;
}

interface EquipoSimple {
  id: string;
  nombre_equipo: string;
}

interface Cruce {
  localId: string;
  visitaId: string;
}

export default function GenerarLlavesPage({ 
  params 
}: { 
  params: Promise<{ id: string; categoriaId: string }> 
}) {
  const { id: campeonatoId, categoriaId } = use(params);
  const router = useRouter();

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [posiciones, setPosiciones] = useState<FilaPosicion[]>([]);
  const [todosLosEquipos, setTodosLosEquipos] = useState<EquipoSimple[]>([]);
  const [faseIdDestino, setFaseIdDestino] = useState<string>('');
  
  // Opciones flexibles: Octavos ('8'), Cuartos ('4'), Semifinales ('2'), Final ('1')
  const [tipoRonda, setTipoRonda] = useState<'8' | '4' | '2' | '1'>('2');
  
  const [crucesManuales, setCrucesManuales] = useState<Cruce[]>([
    { localId: '', visitaId: '' },
    { localId: '', visitaId: '' }
  ]);
  const [guardando, setGuardando] = useState(false);

  const [notificacion, setNotificacion] = useState<{ mensaje: string; tipo: 'exito' | 'error' | 'advertencia' } | null>(null);

  const mostrarMensaje = (mensaje: string, tipo: 'exito' | 'error' | 'advertencia') => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 4000); // Se oculta sola tras 4 segundos
  };

  // Función para calcular automáticamente las llaves según la ronda y la tabla de posiciones
  const calcularLlavesAutomaticas = (ronda: '8' | '4' | '2' | '1', posData: FilaPosicion[], gruposData: Grupo[]) => {
    let numLlaves = 2;
    if (ronda === '8') numLlaves = 8;
    if (ronda === '4') numLlaves = 4;
    if (ronda === '2') numLlaves = 2;
    if (ronda === '1') numLlaves = 1;

    if (gruposData.length >= 2) {
      const gruposOrdenados = gruposData.map(g => {
        return posData
          .filter(p => p.grupo_id === g.id)
          .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);
      });

      const nuevosCruces: Cruce[] = [];

      if (ronda === '2' && gruposOrdenados.length >= 2) {
        nuevosCruces.push(
          { localId: gruposOrdenados[0][0]?.equipo_id || '', visitaId: gruposOrdenados[1][1]?.equipo_id || '' },
          { localId: gruposOrdenados[1][0]?.equipo_id || '', visitaId: gruposOrdenados[0][1]?.equipo_id || '' }
        );
      } else {
        // Algoritmo general de cruce basado en ranking general o cruces directos
        const todosClasificados = [...posData].sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);
        for (let i = 0; i < numLlaves; i++) {
          const local = todosClasificados[i]?.equipo_id || '';
          const visita = todosClasificados[(numLlaves * 2) - 1 - i]?.equipo_id || '';
          nuevosCruces.push({ localId: local, visitaId: visita });
        }
      }
      setCrucesManuales(nuevosCruces);
    } else {
      const todosClasificados = [...posData].sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);
      const nuevosCruces: Cruce[] = [];
      for (let i = 0; i < numLlaves; i++) {
        const local = todosClasificados[i]?.equipo_id || '';
        const visita = todosClasificados[(numLlaves * 2) - 1 - i]?.equipo_id || '';
        nuevosCruces.push({ localId: local, visitaId: visita });
      }
      setCrucesManuales(nuevosCruces);
    }
  };

  useEffect(() => {
    if (!categoriaId) return;

    const cargarDatosParaLlaves = async () => {
      const { data: fasesData } = await supabase
        .from('fases')
        .select('id, tipo_formato')
        .eq('categoria_id', categoriaId)
        .eq('activa', true);

      let gruposCargados: Grupo[] = [];
      let posicionesCargadas: FilaPosicion[] = [];

      if (fasesData && fasesData.length > 0) {
        setFaseIdDestino(fasesData[0].id);
        const faseIds = fasesData.map(f => f.id);

        const { data: gruposData } = await supabase
          .from('grupos')
          .select('id, nombre_grupo')
          .in('fase_id', faseIds);

        if (gruposData && gruposData.length > 0) {
          gruposCargados = gruposData;
          setGrupos(gruposData);
          const grupoIds = gruposData.map(g => g.id);
          
          const { data: posicionesData } = await supabase
            .from('vista_posiciones_en_vivo')
            .select('*')
            .in('grupo_id', grupoIds);

          if (posicionesData) {
            posicionesCargadas = posicionesData as FilaPosicion[];
            setPosiciones(posicionesCargadas);
          }
        }
      }

      const { data: equiposData } = await supabase
        .from('equipos')
        .select('id, nombre_equipo')
        .eq('categoria_id', categoriaId);
      
      if (equiposData) {
        setTodosLosEquipos(equiposData);
      }

      // Cálculo automático inicial al cargar los datos
      calcularLlavesAutomaticas('2', posicionesCargadas, gruposCargados);
    };

    cargarDatosParaLlaves();
  }, [categoriaId]);

  const manejarCambioRonda = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const valorRonda = e.target.value as '8' | '4' | '2' | '1';
    setTipoRonda(valorRonda);
    calcularLlavesAutomaticas(valorRonda, posiciones, grupos);
  };

  const manejarCambioCruce = (index: number, lado: keyof Cruce, valor: string) => {
    const copia = [...crucesManuales];
    copia[index][lado] = valor;
    setCrucesManuales(copia);
  };

  const guardarLlavesEnBaseDatos = async () => {
    const tieneVacios = crucesManuales.some(c => !c.localId || !c.visitaId);
    if (tieneVacios) {
      mostrarMensaje("Por favor, verifica que todos los enfrentamientos tengan equipos asignados.", "advertencia");
      return;
    }

    setGuardando(true);

    let nombreJornadaPlayoff = 'Playoffs';
    if (tipoRonda === '8') nombreJornadaPlayoff = 'Octavos de Final';
    if (tipoRonda === '4') nombreJornadaPlayoff = 'Cuartos de Final';
    if (tipoRonda === '2') nombreJornadaPlayoff = 'Semifinal';
    if (tipoRonda === '1') nombreJornadaPlayoff = 'Gran Final';

    const partidosParaInsertar = crucesManuales.map((cruce) => ({
      fase_id: faseIdDestino,
      grupo_id: null,
      equipo_local_id: cruce.localId,
      equipo_visita_id: cruce.visitaId,
      numero_fecha: nombreJornadaPlayoff,
      estado: 'programado',
    }));

    const { error } = await supabase
      .from('partidos')
      .insert(partidosParaInsertar);

    setGuardando(false);

    if (error) {
      mostrarMensaje(`Error al inyectar las llaves: ${error.message}`, "error");
    } else {
      mostrarMensaje(`¡Llaves creadas con total éxito para la jornada de ${nombreJornadaPlayoff}!`, "exito");
      setTimeout(() => {
        router.push(`/dashboard/${campeonatoId}/categoria/${categoriaId}/posiciones`);
      }, 1500); // Pequeño retraso para que el usuario alcance a leer el mensaje de éxito
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-900 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <h1 className="text-lg font-black text-gray-600 uppercase tracking-tight">Generador Automático de Playoffs</h1>
            <p className="text-xs text-blue-800/50 font-medium">Selecciona la instancia y el sistema calculará las llaves automáticamente basándose en la tabla.</p>
          </div>
          {/* <Link href={`/dashboard/${campeonatoId}/categoria/${categoriaId}/posiciones`} className="text-xs font-bold uppercase text-slate-400 hover:text-slate-900 transition">
            ❌ Cancelar
          </Link> */}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">Seleccionar Instancia / Ronda</label>
            <select 
              value={tipoRonda} 
              onChange={manejarCambioRonda}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="8">Octavos de Final (16 Equipos - 8 Llaves)</option>
              <option value="4">Cuartos de Final (8 Equipos - 4 Llaves)</option>
              <option value="2">Semifinales (4 Equipos - 2 Llaves)</option>
              <option value="1">Final Única (2 Equipos - 1 Llave)</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">⚡ Enfrentamientos Calculados (Flexibilidad de Ajuste Manual)</h2>
          
          {crucesManuales.map((cruce, index) => (
            <div key={index} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                L-{index + 1}
              </div>
              
              <div className="flex-1 w-full">
                <select
                  value={cruce.localId}
                  onChange={(e) => manejarCambioCruce(index, 'localId', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Seleccionar Equipo Local --</option>
                  {todosLosEquipos.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre_equipo}</option>
                  ))}
                </select>
              </div>

              <div className="text-xs font-black uppercase text-slate-400 px-2">VS</div>

              <div className="flex-1 w-full">
                <select
                  value={cruce.visitaId}
                  onChange={(e) => manejarCambioCruce(index, 'visitaId', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Seleccionar Equipo Visita --</option>
                  {todosLosEquipos.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre_equipo}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={guardarLlavesEnBaseDatos}
            disabled={guardando}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-2xl shadow-md transition"
          >
            {guardando ? 'Generando Fixture de Eliminatorias...' : '🚀 Lanzar Playoffs Oficiales'}
          </button>
            <Link href={`/dashboard/${campeonatoId}/categoria/${categoriaId}/posiciones`}
            className="w-full text-xs font-black text-center text-white hover:bg-red-600 bg-red-500 py-3.5 rounded-2xl shadow-md uppercase transition">
            ❌ Cancelar
          </Link>
        </div>
      </div>

      {/* Alerta flotante moderna */}
      {notificacion && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce transition-all duration-300">
          <div className={`px-5 py-4 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-black uppercase tracking-wider text-white ${
            notificacion.tipo === 'exito' ? 'bg-emerald-600 border-emerald-500' :
            notificacion.tipo === 'error' ? 'bg-rose-600 border-rose-500' : 'bg-amber-600 border-amber-500'
          }`}>
            <span>
              {notificacion.tipo === 'exito' && '✅ '}
              {notificacion.tipo === 'error' && '❌ '}
              {notificacion.tipo === 'advertencia' && '⚠️ '}
            </span>
            <span>{notificacion.mensaje}</span>
          </div>
        </div>
      )}
    </div>
  );
}