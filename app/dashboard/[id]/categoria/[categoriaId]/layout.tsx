'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../../../lib/supabase';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { crearOperadorParaCampeonato } from '../../../acciones';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string; categoriaId: string }>;
}

export default function CategoriaLayout({ children, params }: LayoutProps) {
  const { id: campeonatoId, categoriaId } = use(params);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [nombreUsuario, setNombreUsuario] = useState('Usuario');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [esOperador, setEsOperador] = useState(false);
  const [nombreCategoria, setNombreCategoria] = useState('Categoría');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // NUEVOS ESTADOS: Para ver/ocultar contraseña y para la alerta de éxito elegante
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [modalExito, setModalExito] = useState(false);

  useEffect(() => {
    const cargarDatosLayout = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (user.user_metadata?.nombre) {
          setNombreUsuario(user.user_metadata.nombre);
        } else if (user.email) {
          setNombreUsuario(user.email.split('@')[0]);
        }

        const { data: perfil } = await supabase
          .from('perfiles_usuarios')
          .select('nombre_completo')
          .eq('id', user.id)
          .maybeSingle();
        
        if (perfil?.nombre_completo) {
          setNombreUsuario(perfil.nombre_completo);
        }

        const { data: operadorData } = await supabase
          .from('operadores_campeonatos')
          .select('*')
          .eq('user_id', user.id)
          .eq('campeonato_id', campeonatoId)
          .maybeSingle();

        if (operadorData) {
          setEsOperador(true);
        }
      }

      const { data: catData } = await supabase
        .from('categorias')
        .select('*')
        .eq('id', categoriaId)
        .maybeSingle();

      if (catData) {
        setNombreCategoria(catData.nombre || catData.nombre_categoria || 'Categoría');
      }
    };

    cargarDatosLayout();
  }, [campeonatoId, categoriaId]);

  useEffect(() => {
    let seccionActual = "Equipos";

    if (pathname.includes("/fixture")) {
      seccionActual = "Fixture";
    } else if (pathname.includes("/operar")) {
      seccionActual = "Mesa de Control";
    } else if (pathname.includes("/posiciones")) {
      seccionActual = "Posiciones y Llaves";
    }

    document.title = `${seccionActual}`;
  }, [pathname, nombreCategoria]);

  const handleCerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const todasLasPestañas = [
    { nombre: 'Equipos', ruta: `/dashboard/${campeonatoId}/categoria/${categoriaId}` },
    { nombre: 'Fixture', ruta: `/dashboard/${campeonatoId}/categoria/${categoriaId}/fixture` },
    { nombre: 'Operar (Mesa)', ruta: `/dashboard/${campeonatoId}/categoria/${categoriaId}/operar` },
    { nombre: 'Posiciones y Llaves', ruta: `/dashboard/${campeonatoId}/categoria/${categoriaId}/posiciones` },
    { nombre: 'Crear Operador', ruta: `/dashboard/${campeonatoId}/operadores` },
  ];

  const pestañasOperador = [
    { nombre: 'Inicio', ruta: '/dashboard/operador' },
    { nombre: 'Operar (Mesa)', ruta: `/dashboard/${campeonatoId}/categoria/${categoriaId}/operar` },
  ];

  const pestañas = esOperador ? pestañasOperador : todasLasPestañas;

  const esActivo = (rutaTab: string) => {
    if (rutaTab.endsWith(categoriaId)) {
      return pathname === rutaTab;
    }
    return pathname.startsWith(rutaTab);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* Barra Superior */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3 shrink-0">
          <Link href={esOperador ? "/dashboard/operador" : `/dashboard/${campeonatoId}`} className="text-sm font-black text-slate-900 hover:text-blue-600 transition">
            <img src="/logo_casmi_sports.png" alt="Casmi Sports" className="h-10 w-auto object-contain"/>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</span>
          <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider bg-emerald-600/20 px-2.5 py-1 rounded-md border border-slate-200">
            {nombreCategoria}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <nav className="flex items-center gap-6">
            {pestañas.map((tab) => {
              const activo = esActivo(tab.ruta);
              const esOperadorTab = tab.nombre === 'Crear Operador';

              if (esOperadorTab) {
                return (
                  <button
                    key={tab.ruta}
                    onClick={() => setIsModalOpen(true)}
                    className="text-xs font-black uppercase tracking-wider transition pb-0.5 border-b-2 border-transparent text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {tab.nombre}
                  </button>
                );
              }

              return (
                <Link
                  key={tab.ruta}
                  href={tab.ruta}
                  className={`text-xs font-black uppercase tracking-wider transition pb-0.5 border-b-2 ${
                    activo 
                      ? 'border-cyan-600 text-cyan-800' 
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {tab.nombre}
                </Link>
              );
            })}
          </nav>

          <div className="h-4 w-px bg-slate-200"></div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs overflow-hidden border border-slate-200 shadow-sm">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  nombreUsuario.charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-xs font-extrabold text-slate-700">{nombreUsuario}</span>
            </div>

            <button
              onClick={handleCerrarSesion}
              title="Cerrar Sesión"
              className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition flex items-center gap-1 text-xs font-bold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={handleCerrarSesion}
            className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Menú de Pestañas Adaptable (Móvil) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2.5 flex gap-3 overflow-x-auto shadow-xs">
        {pestañas.map((tab) => {
          const activo = esActivo(tab.ruta);
          const esOperadorTab = tab.nombre === 'Crear Operador';

          if (esOperadorTab) {
            return (
              <button
                key={tab.ruta}
                onClick={() => setIsModalOpen(true)}
                className="text-[11px] font-black uppercase tracking-wider whitespace-nowrap px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              >
                {tab.nombre}
              </button>
            );
          }

          return (
            <Link
              key={tab.ruta}
              href={tab.ruta}
              className={`text-[11px] font-black uppercase tracking-wider whitespace-nowrap px-3 py-1.5 rounded-lg transition ${
                activo 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
               {tab.nombre}
            </Link>
          );
        })}
      </div>

      {/* Modal Moderno para Crear Operador */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-8 relative overflow-hidden">
            
            <button
              onClick={() => {
                setIsModalOpen(false);
                setModalError(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Crear Nuevo Operador</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">
                El operador recibirá un correo de invitación para verificar su cuenta y establecer su contraseña.
              </p>
            </div>

            {modalError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                {modalError}
              </div>
            )}

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setModalError(null);
                setIsModalLoading(true);

                const formData = new FormData(e.currentTarget);
                const resultado = await crearOperadorParaCampeonato(formData);

                setIsModalLoading(false);

                if (resultado && !resultado.success) {
                  setModalError(resultado.error || 'Ocurrió un error.');
                } else {
                  setIsModalOpen(false);
                  setModalError(null);
                  setModalExito(true);
                }
              }} 
              className="space-y-4"
            >
              <input type="hidden" name="campeonatoId" value={campeonatoId} />

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nombre Completo
                </label>
                <input
                  name="nombre"
                  type="text"
                  required
                  className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition"
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition"
                  placeholder="operador@correo.com"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalError(null);
                  }}
                  className="w-1/3 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isModalLoading}
                  className="w-2/3 bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {isModalLoading ? 'Creando operador...' : 'Crear Operador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ÉXITO */}
      {modalExito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-8 text-center relative">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">¡Invitación Enviada!</h3>
            
            <p className="text-sm font-medium text-slate-600 mt-2.5 leading-relaxed">
              Hemos enviado un correo electrónico al operador. Deberá abrirlo, confirmar su cuenta, crear su contraseña y luego podrá ingresar desde el login principal.
            </p>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => {
                  setModalExito(false);
                  router.refresh();
                }}
                className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-slate-800 transition shadow-lg shadow-slate-900/10"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenido de la Página Activa */}
      <main className="flex-1">
        {children}
      </main>

    </div>
  );
}