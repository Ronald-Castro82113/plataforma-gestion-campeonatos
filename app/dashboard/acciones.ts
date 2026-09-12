'use server';

import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

export async function crearOperadorParaCampeonato(formData: FormData): Promise<void> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const nombre = formData.get('nombre') as string;
  const campeonatoId = formData.get('campeonatoId') as string;

  try {
    // 1. Crear el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No se pudo crear el usuario.');

    const userId = authData.user.id;

    // 2. Insertar perfil con rol 'operador'
    const { error: perfilError } = await supabaseAdmin
      .from('perfiles_usuarios')
      .upsert({
        id: userId,
        nombre_completo: nombre,
        rol: 'operador',
        estado: 'autorizado',
      });

    if (perfilError) throw perfilError;

    // 3. Vincular al campeonato correspondiente
    const { error: relacionError } = await supabaseAdmin
      .from('operadores_campeonatos')
      .insert({
        user_id: userId,
        campeonato_id: campeonatoId,
      });

    if (relacionError) throw relacionError;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error al crear operador:', message);
    throw new Error(message);
  }

  redirect('/dashboard?exito=operador_creado');
}