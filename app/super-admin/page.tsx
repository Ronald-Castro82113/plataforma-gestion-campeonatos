'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

interface Perfil {
  id: string;
  nombre_completo: string;
  rol: string;
  estado: string;
}

interface Campeonato {
  id?: string;
  campeonato_id?: string;
  nombre_campeonato?: string;
  nombre?: string;
  titulo?: string;
  anio?: number;
  destacado_principal?: boolean;
  [key: string]: string | number | boolean | undefined | null;
}

interface Categoria {
  id?: string;
  categoria_id?: string;
  nombre_categoria?: string;
  nombre?: string;
  [key: string]: string | number | boolean | undefined | null;
}

interface Partido {
  id: string;
  numero_fecha: string;
  lugar: string;
  goles_local: number | null;
  goles_visita: number | null;
  equipo_local?: { nombre_equipo: string };
  equipo_visita?: { nombre_equipo: string };
}

export default function SuperAdminPage() {
  const [pestanaActiva, setPestanaActiva] = useState<'solicitudes' | 'obs' | 'campeonatos'>('solicitudes');
  
  const [solicitudes, setSolicitudes] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  
  const [campeonatoSeleccionado, setCampeonatoSeleccionado] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [linkTransmision, setLinkTransmision] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastText, setToastText] = useState('');

  const router = useRouter();

  // Función para cerrar sesión de Super Admin
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.refresh();
    window.location.href = '/super-admin/login';
  };

  useEffect(() => {
    async function cargarDatosIniciales() {
      try {
        const { data: solData, error: solError } = await supabase
          .from('perfiles_usuarios')
          .select('*')
          .eq('estado', 'pendiente');

        if (solError) throw solError;
        setSolicitudes(solData || []);

        const { data: campData, error: campError } = await supabase.from('campeonatos').select('*');
        if (campError) throw campError;
        if (campData) setCampeonatos(campData as Campeonato[]);
      } catch (error) {
        if (error instanceof Error) setErrorMsg(`Error al cargar datos: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }

    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    if (!campeonatoSeleccionado) return;

    const fetchCategorias = async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('campeonato_id', campeonatoSeleccionado);
      
      if (error) {
        console.error('Error al cargar categorías:', error.message);
        setCategorias([]);
        return;
      }
      setCategorias((data as Categoria[]) || []);
    };
    fetchCategorias();
  }, [campeonatoSeleccionado]);

  // useEffect limpio sin llamadas síncronas de setState en su cuerpo
  useEffect(() => {
    if (!categoriaSeleccionada) return;

    const fetchDatosCategoria = async () => {
      const { data: partidosData } = await supabase
        .from('partidos')
        .select(`
          id,
          numero_fecha,
          lugar,
          goles_local,
          goles_visita,
          equipo_local:equipos!partidos_equipo_local_id_fkey(nombre_equipo),
          equipo_visita:equipos!partidos_equipo_visita_id_fkey(nombre_equipo)
        `)
        .eq('categoria_id', categoriaSeleccionada);
      
      setPartidos((partidosData as unknown as Partido[]) || []);

      const { data: catData, error: catError } = await supabase
        .from('categorias')
        .select('url_transmision')
        .eq('id', categoriaSeleccionada)
        .single();

      if (!catError && catData) {
        setLinkTransmision(catData.url_transmision || '');
      }
    };

    fetchDatosCategoria();
  }, [categoriaSeleccionada]);

  const asignarPrincipal = async (campeonatoId: string, estadoActual: boolean) => {
    try {
      // 1. Opcional: Quitamos el destacado a todos los demás campeonatos si solo quieres uno principal a la vez
      await supabase
        .from('campeonatos')
        .update({ destacado_principal: false })
        .neq('id', campeonatoId);

      // 2. Alternamos el estado del campeonato seleccionado
      const { error } = await supabase
        .from('campeonatos')
        .update({ destacado_principal: !estadoActual })
        .eq('id', campeonatoId);

      if (error) throw error;

      // 3. Actualizamos el estado local para reflejar el cambio al instante sin recargar la página
      setCampeonatos(
        campeonatos.map((camp) => {
          const cId = camp.id || camp.campeonato_id;
          if (cId === campeonatoId) {
            return { ...camp, destacado_principal: !estadoActual };
          }
          return { ...camp, destacado_principal: false }; // Los demás pasan a false
        })
      );

      setToastText('¡Vista principal actualizada con éxito!');
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3500);
    } catch (error) {
      if (error instanceof Error) alert(`Error al actualizar destacado: ${error.message}`);
    }
  };

  const guardarLinkTransmision = async () => {
    if (!categoriaSeleccionada) return;
    try {
      const { error } = await supabase
        .from('categorias')
        .update({ url_transmision: linkTransmision })
        .eq('id', categoriaSeleccionada);

      if (error) throw error;

      setToastText('¡Enlace de transmisión guardado con éxito!');
      setToastVisible(true);
      setTimeout(() => {
        setToastVisible(false);
      }, 3500);
    } catch (error) {
      if (error instanceof Error) alert(`Error al guardar: ${error.message}`);
    }
  };

  const autorizarUsuario = async (id: string) => {
    try {
      const { error } = await supabase
        .from('perfiles_usuarios')
        .update({ estado: 'autorizado' })
        .eq('id', id);

      if (error) throw error;
      setSolicitudes(solicitudes.filter((user) => user.id !== id));
    } catch (error) {
      if (error instanceof Error) alert(`No se pudo autorizar: ${error.message}`);
    }
  };

  const copiarLinkOBS = (tipo: 'marcador' | 'posiciones' | 'goleadores') => {
    if (!categoriaSeleccionada) return;
    // El marcador está en la raíz [id], los demás tienen su subcarpeta
    const urlOverlay = tipo === 'marcador'
      ? `${window.location.origin}/overlay/${categoriaSeleccionada}`
      : `${window.location.origin}/overlay/${categoriaSeleccionada}/${tipo}`;

    navigator.clipboard.writeText(urlOverlay);
    
    setToastText(`¡Link de ${tipo.toUpperCase()} copiado al portapapeles!`);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 3500);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative">
      
      {toastVisible && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 border border-slate-700 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-bounce">
          <span className="text-emerald-400 text-xl font-bold">✓</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Portapapeles</p>
            <p className="text-sm font-semibold">{toastText}</p>
          </div>
        </div>
      )}

      <nav className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Casmi <span className="text-emerald-700">Sports</span> <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md ml-2">Super Admin</span>
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setPestanaActiva('solicitudes')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                pestanaActiva === 'solicitudes' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Solicitudes ({solicitudes.length})
            </button>
            <button
              onClick={() => setPestanaActiva('obs')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                pestanaActiva === 'obs' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🎥 Centro de Streaming OBS
            </button>

            {/* BOTÓN DE CERRAR SESIÓN */}
            <button
              onClick={cerrarSesion}
              className="ml-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition flex items-center gap-1.5"
            >
              <span>🚪</span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {pestanaActiva === 'solicitudes' ? (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Solicitudes de Organizadores</h2>
              <p className="text-sm text-slate-500 mt-1">Prueba y autoriza las nuevas cuentas para que puedan gestionar sus torneos.</p>
            </div>

            {errorMsg && (
              <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 font-medium">
                {errorMsg}
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-slate-500 font-medium">Cargando solicitudes...</div>
            ) : solicitudes.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <span className="text-4xl block mb-2">🎉</span>
                <p className="text-slate-600 font-semibold">¡Al día! No hay solicitudes pendientes.</p>
                <p className="text-xs text-slate-400 mt-1">Todos los organizadores han sido procesados.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-4">Nombre Completo</th>
                        <th className="px-6 py-4">Rol Solicitado</th>
                        <th className="px-6 py-4">Estado Actual</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {solicitudes.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/40 transition">
                          <td className="px-6 py-4 font-semibold text-slate-900">{user.nombre_completo}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200/50">
                              {user.rol}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200/60">
                              {user.estado}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => autorizarUsuario(user.id)}
                              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/10 transition hover:bg-emerald-700"
                            >
                              Aprobar Cuenta
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : pestanaActiva === 'obs' ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Centro de Transmisión Permanente (OBS)</h2>
              <p className="text-sm text-slate-500 mt-1">Configura los enlaces para tus fuentes de navegador en OBS.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Seleccionar Campeonato</label>
                <select
                  value={campeonatoSeleccionado}
                  onChange={(e) => {
                    setCampeonatoSeleccionado(e.target.value);
                    setCategoriaSeleccionada('');
                    setCategorias([]);
                    setPartidos([]);
                    setLinkTransmision('');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Seleccione un campeonato --</option>
                  {campeonatos.map((c) => {
                    const campeonatoId = c.id || c.campeonato_id || '';
                    const campeonatoNombre = c.nombre_campeonato || c.nombre || c.titulo || 'Campeonato sin nombre';
                    return (
                      <option key={campeonatoId} value={campeonatoId}>
                        {campeonatoNombre}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Seleccionar Categoría</label>
                <select
                  value={categoriaSeleccionada}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setCategoriaSeleccionada(valor);
                    if (!valor) {
                      setPartidos([]);
                      setLinkTransmision('');
                    }
                  }}
                  disabled={!campeonatoSeleccionado}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                >
                  <option value="">-- Seleccione una categoría --</option>
                  {categorias.map((cat) => {
                    const catId = cat.id || cat.categoria_id || '';
                    const catNombre = cat.nombre_categoria || cat.nombre || 'Categoría sin nombre';
                    return (
                      <option key={catId} value={catId}>
                        {catNombre}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {categoriaSeleccionada && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Marcador */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                    <div>
                      <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                        Widget OBS
                      </span>
                      <h3 className="text-base font-bold mt-2">Marcador en Vivo</h3>
                      <p className="text-xs text-slate-400 mt-1">Muestra el marcador y periodo actual del partido activo.</p>
                    </div>
                    <button
                      onClick={() => copiarLinkOBS('marcador')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition"
                    >
                      <span>🔗</span>
                      <span>Copiar Link Marcador</span>
                    </button>
                  </div>

                  {/* Posiciones */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                    <div>
                      <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                        Widget OBS
                      </span>
                      <h3 className="text-base font-bold mt-2">Tabla de Posiciones</h3>
                      <p className="text-xs text-slate-400 mt-1">Muestra la tabla ordenada por grupos automáticamente.</p>
                    </div>
                    <button
                      onClick={() => copiarLinkOBS('posiciones')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition"
                    >
                      <span>🔗</span>
                      <span>Copiar Link Posiciones</span>
                    </button>
                  </div>

                  {/* Goleadores */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                    <div>
                      <span className="bg-purple-500/20 text-purple-400 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                        Widget OBS
                      </span>
                      <h3 className="text-base font-bold mt-2">Top Goleadores</h3>
                      <p className="text-xs text-slate-400 mt-1">Muestra el listado de los máximos anotadores.</p>
                    </div>
                    <button
                      onClick={() => copiarLinkOBS('goleadores')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow transition"
                    >
                      <span>🔗</span>
                      <span>Copiar Link Goleadores</span>
                    </button>
                  </div>
                </div>

                <div className="bg-blue-600/20 p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    🔗 Link de Transmisión en Vivo (YouTube / Facebook / Twitch)
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={linkTransmision}
                      onChange={(e) => setLinkTransmision(e.target.value)}
                      placeholder="Ej. https://www.youtube.com/watch?v=..."
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      onClick={guardarLinkTransmision}
                      className="bg-blue-900 hover:bg-blue-950 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow"
                    >
                      Guardar Link
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Este enlace se conectará automáticamente con la vista pública de esta categoría.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* NUEVA SECCIÓN DE GESTIÓN DE CAMPEONATOS DESTACADOS */
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Gestión de Campeonato Destacado</h2>
              <p className="text-sm text-slate-500 mt-1">Elige qué campeonato aparecerá como principal o destacado en la vista pública.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campeonatos.map((c) => {
                const idCamp = c.id || c.campeonato_id || '';
                const nombreCamp = c.nombre_campeonato || c.nombre || c.titulo || 'Sin nombre';
                const esPrincipal = c.destacado_principal || false;

                return (
                  <div 
                    key={idCamp} 
                    className={`p-5 rounded-2xl border flex flex-col justify-between shadow-sm transition ${
                      esPrincipal 
                        ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20' 
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-400">Año: {c.anio || 'N/D'}</span>
                        {esPrincipal && (
                          <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                            ⭐ Principal Activo
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{nombreCamp}</h3>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => asignarPrincipal(idCamp, esPrincipal)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
                          esPrincipal
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {esPrincipal ? 'Quitar Destacado Principal' : 'Marcar como Principal ⭐'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}