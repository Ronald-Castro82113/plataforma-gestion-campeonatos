import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // 1. Bloquear acceso a rutas protegidas sin sesión
  if (path.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Bloquear acceso al panel de Super Admin (/super-admin) sin sesión (excluyendo su login)
  if (path.startsWith('/super-admin') && path !== '/super-admin/login' && !user) {
    return NextResponse.redirect(new URL('/super-admin/login', request.url));
  }

  // 3. Bloquear páginas de login si ya hay sesión activa
  if (path === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (path === '/super-admin/login' && user) {
    return NextResponse.redirect(new URL('/super-admin', request.url));
  }

  // Control estricto de rutas para el operador
  if (user && path.startsWith('/dashboard')) {
    const { data: perfil } = await supabase
      .from('perfiles_usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (perfil?.rol === 'operador') {
      const esHubOperador = path === '/dashboard/operador';
      const esMesaOperar = path.includes('/operar');

      // Si el operador intenta entrar a otro lado que no sea su hub o su mesa, lo mandamos al hub
      if (!esHubOperador && !esMesaOperar) {
        return NextResponse.redirect(new URL('/dashboard/operador', request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/super-admin/:path*'],
};