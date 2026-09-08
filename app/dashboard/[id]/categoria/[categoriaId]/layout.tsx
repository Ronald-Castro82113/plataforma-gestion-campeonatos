// app/dashboard/[id]/categoria/[categoriaId]/layout.tsx
'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../../../lib/supabase';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string; categoriaId: string }>;
}

export default function CategoriaLayout({ children, params }: LayoutProps) {
  const { id: campeonatoId, categoriaId } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const [nombreUsuario, setNombreUsuario] = useState('Usuario');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const cargarPerfilUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from('perfiles_usuarios')
          .select('nombre, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        
        if (perfil) {
          if (perfil.nombre) setNombreUsuario(perfil.nombre);
          if (perfil.avatar_url) setAvatarUrl(perfil.avatar_url);
        }
      }
    };
    cargarPerfilUsuario();
  }, []);

  const handleCerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const pestañas = [
    { nombre: 'Equipos', ruta: `/dashboard/${campeonatoId}/categoria/${categoriaId}` },
    { nombre: 'Fixture', ruta: `/dashboard/${campeonatoId}/categoria/${categoriaId}/fixture` },
    { nombre: 'Operar (Mesa)', ruta: `/dashboard/${campeonatoId}/categoria/${categoriaId}/operar` },
    { nombre: 'Posiciones y Llaves', ruta: `/dashboard/${campeonatoId}/categoria/${categoriaId}/posiciones` },
  ];

  const esActivo = (rutaTab: string) => {
    if (rutaTab.endsWith(categoriaId)) {
      return pathname === rutaTab;
    }
    return pathname.startsWith(rutaTab);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* Barra Superior */}
      <header className="bg-blue-100/40 border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-xs">
        
        {/* Izquierda: Logo y miga de pan */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/dashboard" className="text-sm font-black text-slate-900 hover:text-blue-600 transition">
            Indor<span className="text-blue-600">SaaS</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</span>
        </div>

        {/* Derecha: Pestañas de Navegación, Usuario y Cerrar Sesión (Escritorio) */}
        <div className="hidden md:flex items-center gap-8">
          <nav className="flex items-center gap-6">
            {pestañas.map((tab) => {
              const activo = esActivo(tab.ruta);
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

      {/* Contenido de la Página Activa */}
      <main className="flex-1">
        {children}
      </main>

    </div>
  );
}