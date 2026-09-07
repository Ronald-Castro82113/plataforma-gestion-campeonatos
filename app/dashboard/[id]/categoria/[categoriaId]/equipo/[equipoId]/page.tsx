'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../../../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface JugadorFichado {
  id: string;
  jugador_id: string;
  dorsal_numero: number | null;
  jugadores_globales: {
    nombre: string;
    apellido: string;
    cedula_identidad: string;
  };
}

interface Equipo {
  id: string;
  nombre_equipo: string;
  categoria_id: string;
}

export default function GestionJugadoresPage({
  params
}: {
  params: Promise<{ id: string; categoriaId: string; equipoId: string }>
}) {
  const { id: campeonatoId, categoriaId, equipoId } = use(params);

  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [fichajes, setFichajes] = useState<JugadorFichado[]>([]);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cedula, setCedula] = useState('');
  const [dorsal, setDorsal] = useState('');
  const [editandoInscripcionId, setEditandoInscripcionId] = useState<string | null>(null);
  const [jugadorGlobalIdEdit, setJugadorGlobalIdEdit] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const cargarDatosPlantilla = async () => {
      try {
        setLoading(true);

        // 1. Obtener datos del equipo
        const { data: eqData, error: errEq } = await supabase
          .from('equipos')
          .select('id, nombre_equipo, categoria_id')
          .eq('id', equipoId)
          .single();

        if (errEq) throw errEq;
        setEquipo(eqData);

        // 2. Obtener los jugadores inscritos en este equipo trayendo sus datos globales
        const { data: inscripciones, error: errInsc } = await supabase
          .from('inscripciones_jugadores')
          .select(`
            id,
            jugador_id,
            dorsal_numero,
            jugadores_globales (
              nombre,
              apellido,
              cedula_identidad
            )
          `)
          .eq('equipo_id', equipoId);

        if (errInsc) throw errInsc;
        setFichajes((inscripciones as unknown as JugadorFichado[]) || []);

      } catch (_error) {
        router.push(`/dashboard/${campeonatoId}/categoria/${categoriaId}`);
      } finally {
        setLoading(false);
      }
    };

    cargarDatosPlantilla();
  }, [campeonatoId, categoriaId, equipoId, router]);

  const iniciarEdicion = (fichaje: JugadorFichado) => {
  setEditandoInscripcionId(fichaje.id);
    setJugadorGlobalIdEdit(fichaje.jugador_id);
    setNombre(fichaje.jugadores_globales.nombre);
    setApellido(fichaje.jugadores_globales.apellido);
    setCedula(fichaje.jugadores_globales.cedula_identidad);
    setDorsal(fichaje.dorsal_numero ? fichaje.dorsal_numero.toString() : '');
  };

  const cancelarEdicion = () => {
    setEditandoInscripcionId(null);
    setJugadorGlobalIdEdit(null);
    setNombre('');
    setApellido('');
    setCedula('');
    setDorsal('');
  };

  const guardarOActualizarJugador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !apellido.trim() || !cedula.trim()) return;

    setBtnLoading(true);
    try {
      if (editandoInscripcionId && jugadorGlobalIdEdit) {
        // MODO ACTUALIZAR
        const { error: errGlobal } = await supabase
          .from('jugadores_globales')
          .update({
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            cedula_identidad: cedula.trim()
          })
          .eq('id', jugadorGlobalIdEdit);

        if (errGlobal) throw errGlobal;

        const { error: errInsc } = await supabase
          .from('inscripciones_jugadores')
          .update({
            dorsal_numero: dorsal ? parseInt(dorsal) : null
          })
          .eq('id', editandoInscripcionId);

        if (errInsc) throw errInsc;

        cancelarEdicion();
      } else {
        // MODO CREAR (Tu lógica original de fichaje)
        let jugadorId = '';
        const { data: existente } = await supabase
          .from('jugadores_globales')
          .select('id')
          .eq('cedula_identidad', cedula.trim())
          .maybeSingle();

        if (existente) {
          jugadorId = existente.id;
        } else {
          const { data: nuevoJugador, error: errNuevo } = await supabase
            .from('jugadores_globales')
            .insert([{
              cedula_identidad: cedula.trim(),
              nombre: nombre.trim(),
              apellido: apellido.trim(),
              estado_suscripcion: 'inactivo'
            }])
            .select('id')
            .single();

          if (errNuevo) throw errNuevo;
          jugadorId = nuevoJugador.id;
        }

        const { error: errInscripcion } = await supabase
          .from('inscripciones_jugadores')
          .insert([{
            jugador_id: jugadorId,
            equipo_id: equipoId,
            categoria_id: categoriaId,
            dorsal_numero: dorsal ? parseInt(dorsal) : null
          }]);

        if (errInscripcion) {
          if (errInscripcion.code === '23505') {
            alert('¡Ups! Este jugador ya está fichado en otro equipo de esta categoría.');
          } else {
            throw errInscripcion;
          }
          return;
        }

        setNombre('');
        setApellido('');
        setCedula('');
        setDorsal('');
      }

      // Recargar lista
      const { data: inscripciones } = await supabase
        .from('inscripciones_jugadores')
        .select(`
          id,
          jugador_id,
          dorsal_numero,
          jugadores_globales (
            nombre,
            apellido,
            cedula_identidad
          )
        `)
        .eq('equipo_id', equipoId);

      setFichajes((inscripciones as unknown as JugadorFichado[]) || []);

    } catch (_error) {
      alert('Error al procesar la solicitud.');
    } finally {
      setBtnLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans text-slate-500 font-medium">
        Cargando plantilla del equipo...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex justify-between items-center">
        <Link href="/dashboard" className="text-xl font-bold text-slate-900 tracking-tight">
          Indor<span className="text-blue-600">SaaS</span>
        </Link>
        <Link 
          href={`/dashboard/${campeonatoId}/categoria/${categoriaId}`} 
          className="text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-100 px-3 py-2 rounded-lg transition"
        >
          ← Volver a Equipos
        </Link>
      </nav>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Historial de Fichajes</span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-1">
            Plantilla: {equipo?.nombre_equipo}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Busca o registra jugadores por cédula. El sistema guardará su historial para siempre.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Formulario */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
              {editandoInscripcionId ? '✏️ Editando Jugador' : 'Fichar Jugador'}
            </h3>
            <form onSubmit={guardarOActualizarJugador} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cédula de Identidad</label>
                <input
                  type="number"
                  required
                  maxLength={10}
                  placeholder="Ej. 0999999999"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  value={cedula}
                  onChange={(e) => {
                    // Valida que solo sea numeros
                    const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setCedula(soloNumeros);
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Moisés"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Apellido</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Caicedo"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Número de Camiseta</label>
                <input
                  type="number"
                  placeholder="Ej. 10"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  value={dorsal}
                  onChange={(e) => setDorsal(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={btnLoading}
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {btnLoading ? 'Guardando...' : (editandoInscripcionId ? '💾 Actualizar Datos' : '🏃‍♂️ Realizar Fichaje')}
                </button>

                {editandoInscripcionId && (
                  <button
                    type="button"
                    onClick={cancelarEdicion}
                    className="w-full rounded-xl bg-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 transition"
                  >
                    Cancelar Edición
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Listado de la plantilla */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Jugadores Fichados en esta Temporada ({fichajes.length})</h3>

            {fichajes.length === 0 ? (
              <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <span className="text-2xl block mb-2">📋</span>
                <p className="text-slate-500 text-sm font-medium">No hay jugadores inscritos todavía.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
                <table className="w-full min-w-[480px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-6 py-3 w-16 text-center">Dorsal</th>
                      <th className="px-6 py-3">Nombre Completo</th>
                      <th className="px-6 py-3">Cédula</th>
                      <th className="px-6 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {fichajes.map((fichaje) => (
                      <tr key={fichaje.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 text-center font-bold text-blue-600">
                          {fichaje.dorsal_numero ? `${fichaje.dorsal_numero}` : '-'}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {fichaje.jugadores_globales?.nombre} {fichaje.jugadores_globales?.apellido}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                          {fichaje.jugadores_globales?.cedula_identidad}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => iniciarEdicion(fichaje)}
                            className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}