// app/dashboard/[id]/categoria/[categoriaId]/layout.tsx
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

  useEffect(() => {
    const cargarDatosLayout = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fallback inicial usando metadatos de auth o el correo por si el perfil tarda o no existe
        if (user.user_metadata?.nombre) {
          setNombreUsuario(user.user_metadata.nombre);
        } else if (user.email) {
          setNombreUsuario(user.email.split('@')[0]);
        }

        // 1. Cargar perfil del usuario (nombre y avatar) desde la tabla
        const { data: perfil } = await supabase
          .from('perfiles_usuarios')
          .select('nombre_completo')
          .eq('id', user.id)
          .maybeSingle();
        
        if (perfil?.nombre_completo) {
          setNombreUsuario(perfil.nombre_completo);
        }

        // 2. Verificar si este usuario es operador en este campeonato
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

      // 3. Cargar el nombre de la categoría actual
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

  const handleCerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const todasLasPestañas = [
    { nombre: 'Equipos', ruta: `/dashboard/${campeonatoId}/categoria/${categoriaId}` },
    { nombre: 'Fixture', ruta: `/dashboard/${campeonatoId}/categoria/${categoriaId}/fixture` },
    { nombre: 'Operar (Mesa)', ruta: `/dashboard/${campeonatoId}/categoria/${categoriaId}/operar` },
    { nombre: 'Posiciones y Llaves', ruta: `/dashboard/${campeonatoId}/categoria/${categoriaId}/posiciones` },
    { nombre: 'Crear Operador', ruta: `/dashboard/${campeonatoId}/operadores` },
  ];

  // Pestañas específicas para el rol operador (incluye "Inicio" para volver al selector de categorías)
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
        
        {/* Izquierda: Logo y miga de pan dinámica */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href={esOperador ? "/dashboard/operador" : `/dashboard/${campeonatoId}`} className="text-sm font-black text-slate-900 hover:text-blue-600 transition">
            Indor<span className="text-blue-600">SaaS</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</span>
          <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider bg-emerald-600/20 px-2.5 py-1 rounded-md border border-slate-200">
            {nombreCategoria}
          </span>
        </div>

        {/* Derecha: Pestañas de Navegación, Usuario y Cerrar Sesión (Escritorio) */}
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
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {tab.nombre}
                </Link>
              );
            })}
          </nav>

          <div className="h-4 w-px bg-slate-200"></div>

          {/* Perfil y Cerrar Sesión */}
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

        {/* Botón de cerrar sesión rápido para vista móvil en la cabecera */}
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
            
            {/* Botón de cerrar */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Crear Operador para este Campeonato</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Crea una cuenta exclusiva para que este operador controle únicamente los partidos de este campeonato actual.
              </p>
            </div>

            <form action={crearOperadorParaCampeonato} onSubmit={() => setIsModalOpen(false)} className="space-y-4">
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Contraseña
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/3 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-blue-600 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                >
                  Registrar Operador
                </button>
              </div>
            </form>
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