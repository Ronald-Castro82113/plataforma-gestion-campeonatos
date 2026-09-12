import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function OperadorHubPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Obtener el nombre completo del usuario desde la tabla perfiles_usuarios
  const { data: perfil } = await supabase
    .from('perfiles_usuarios')
    .select('nombre_completo')
    .eq('id', user.id)
    .single();

  const nombreUsuario = perfil?.nombre_completo || 'Operador';

  // 1. Obtener el campeonato asignado al operador
  const { data: opCamp } = await supabase
    .from('operadores_campeonatos')
    .select('campeonato_id, campeonatos(nombre_campeonato)')
    .eq('user_id', user.id)
    .single();

  if (!opCamp) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-sans">
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">⚠️</div>
          <h2 className="font-extrabold text-lg text-slate-900 mb-1">Sin campeonato asignado</h2>
          <p className="text-xs text-slate-500 font-medium">Tu cuenta de operador aún no está vinculada a ningún torneo. Contacta al administrador general.</p>
        </div>
      </div>
    );
  }

  const campeonatoId = opCamp.campeonato_id;
  const campeonatoNombre = (opCamp.campeonatos as { nombre_campeonato?: string })?.nombre_campeonato || 'Campeonato';

  // 2. Obtener todas las categorías de este campeonato
  const { data: categorias } = await supabase
    .from('categorias')
    .select('*')
    .eq('campeonato_id', campeonatoId);

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto">
        
        {/* Portada / Hero Banner Profesional */}
        <div className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-8 md:p-12 mb-10 shadow-2xl border border-slate-800">
          <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
          
          {/* SVG de Pelota de Fútbol Moderna */}
          <div className="absolute top-0 right-0 p-8 opacity-15 hidden md:block">
            <svg className="w-48 h-48 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm1 2.08V6.5l2.42 1.76L16.5 5.57a8.05 8.05 0 01-3.5-1.49zM6.57 6.5l2.08 2.69L11 7.42V4.08a8.05 8.05 0 01-4.43 2.42zM4.08 11h3.34l1.08 2.53L6.5 15.75a8.05 8.05 0 01-2.42-4.75zm3.83 7.5L10 16.5l2 1.45V20.9a8.05 8.05 0 01-4.09-2.4zM14 20.9v-2.95l2-1.45 2.09 2a8.05 8.05 0 01-4.09 2.4zm5.84-7.42l-2.5-2.22L18.43 8.7a8.05 8.05 0 011.49 3.5h-.08z"/>
            </svg>
          </div>
          
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              ¡Hola, {nombreUsuario}! Bienvenido
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3 text-white">{campeonatoNombre}</h1>
            <p className="text-sm md:text-base text-slate-400 font-medium leading-relaxed">
              Bienvenido al centro de operaciones en directo. Selecciona la categoría que deseas controlar para gestionar marcadores, tiempos y estadísticas al instante.
            </p>
          </div>
        </div>

        {/* Sección de Categorías */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">Categorías Disponibles</h2>
          <span className="text-xs font-bold text-slate-500 bg-slate-200/60 px-3 py-1 rounded-full">
            {categorias?.length || 0} {categorias?.length === 1 ? 'Categoría Activa' : 'Categorías Activas'}
          </span>
        </div>

        {categorias && categorias.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {categorias.map((cat: { id: string; nombre_categoria?: string; nombre?: string }) => (
              <div 
                key={cat.id} 
                className="group bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-600 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 font-black text-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-inner">
                      🏆
                    </div>
                    <span className="text-[10px] font-extrabold tracking-widest uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                      Listo para operar
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                    {cat.nombre_categoria || cat.nombre || 'Categoría sin nombre'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Control de mesa, faltas, goles y tiempos del partido.
                  </p>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Acceso directo</span>
                  <Link
                    href={`/dashboard/${campeonatoId}/categoria/${cat.id}/operar`}
                    className="bg-slate-900 text-white group-hover:bg-blue-600 px-5 py-2.5 rounded-xl text-xs font-extrabold transition shadow-sm flex items-center gap-2"
                  >
                    Abrir Mesa ➔
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
            <p className="text-base font-bold text-slate-700">No hay categorías registradas todavía</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Pídele al administrador del torneo que cree al menos una categoría en el panel principal para poder operar.</p>
          </div>
        )}

      </div>
    </div>
  );
}