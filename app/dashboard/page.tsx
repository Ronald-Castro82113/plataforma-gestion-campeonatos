'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Definimos la estructura exacta de tu tabla de campeonatos
interface Campeonato {
  id: string;
  nombre_campeonato: string;
  anio: number;
  activo: boolean;
  creado_at: string;
}

export default function DashboardPage() {
  const [userName, setUserName] = useState('');
  const [campeonatos, setCamponeatos] = useState<Campeonato[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const cargarDatosDashboard = async () => {
      try {
        // 1. Verificar sesión del usuario
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        // 2. Traer el nombre completo del perfil del usuario
        const { data: perfil } = await supabase
          .from('perfiles_usuarios')
          .select('nombre_completo')
          .eq('id', user.id)
          .single();

        if (perfil) {
          setUserName(perfil.nombre_completo);
        }

        // 3. Traer los campeonatos creados por este usuario
        const { data: torneos, error: errorTorneos } = await supabase
          .from('campeonatos')
          .select('*')
          .eq('creado_by', user.id)
          .order('creado_at', { ascending: false });

        if (errorTorneos) throw errorTorneos;
        setCamponeatos(torneos || []);

      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatosDashboard();
  }, [router]);
  
  // Efecto para cambiar el título en la pestaña del navegador
  useEffect(() => {
    document.title = "Casmi Sports | Campeonatos";
  }, []);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans text-slate-500 font-medium">
        Cargando tu panel de control...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Navbar Superior */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex justify-between items-center">
        <img src="/logo_casmi_sports.png" alt="Casmi Sports" className="h-10 w-auto object-contain"/>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600">
            👋 Hola, <span className="font-bold text-slate-900">{userName}</span>
          </span>
          <button
            onClick={cerrarSesion}
            className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Contenido del Panel */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10">
        
        {/* Banner de Bienvenida */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm shadow-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="space-y-2">
            {/* Etiqueta pequeña para dar contexto */}
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-800 text-[10px] font-black uppercase tracking-widest rounded-full">
              Gestión Deportiva
            </span>
            
            {/* Título con mejor impacto */}
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              ¡Bienvenido a <span className="text-emerald-500">Casmi</span> <span className="text-cyan-900">Sports!</span>
            </h2>
            
            {/* Subtítulo con mejor peso visual */}
            <h3 className="text-lg font-medium text-slate-700">
              La plataforma definitiva para gestionar tu campeonato.
            </h3>
            
            {/* Párrafo con mejor legibilidad */}
            <p className="text-slate-500 text-sm md:text-base max-w-md leading-relaxed">
              Automatiza calendarios, tablas de posiciones y estadísticas en tiempo real. Todo lo que necesitas para llevar tu torneo al siguiente nivel.
            </p>
          </div>

          <Link 
            href="/dashboard/nuevo-campeonato"
            className="rounded-xl bg-cyan-900 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-cyan-700 hover:shadow-blue-700/30 active:scale-[0.98] whitespace-nowrap"
          >
            🏆 Crear Nuevo Campeonato
          </Link>
        </div>

        {/* Resumen en Números */}
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Resumen General</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <span className="text-slate-400 font-medium text-xs block uppercase tracking-wider">Mis Campeonatos</span>
            <span className="text-3xl font-extrabold text-slate-900 mt-2 block">{campeonatos.length}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <span className="text-slate-400 font-medium text-xs block uppercase tracking-wider">Estado de Suscripción</span>
            <span className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 inline-block mt-3">
              Activo / Autorizado
            </span>
          </div>
        </div>

        {/* Sección de Listado de Campeonatos */}
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Tus Torneos Registrados</h3>
        
        {campeonatos.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <p className="text-slate-500 font-medium">Aún no has creado ningún campeonato.</p>
            <p className="text-xs text-slate-400 mt-1">Haz clic en el botón de arriba para iniciar el historial de tu liga.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campeonatos.map((torneo) => (
              <div 
                key={torneo.id} 
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-blue-300 transition flex justify-between items-center"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">{torneo.nombre_campeonato}</h4>
                  <div className="flex gap-2 items-center mt-2">
                    <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      Año {torneo.anio}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${torneo.activo ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500'}`}>
                      {torneo.activo ? '● Activo' : 'Finalizado'}
                    </span>
                  </div>
                </div>
                
                {/* Botón dinámico para entrar a gestionar este campeonato específico */}
                <Link 
                  href={`/dashboard/${torneo.id}`}
                  className="text-xs font-bold bg-blue-50 text-blue-900 hover:bg-blue-100 px-4 py-2.5 rounded-lg border border-blue-100 transition text-center"
                >
                  Gestionar →
                </Link>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}