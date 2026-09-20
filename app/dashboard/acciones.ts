'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

export async function crearOperadorParaCampeonato(formData: FormData) {
  const nombre = formData.get('nombre') as string;
  const email = formData.get('email') as string;
  const campeonatoId = formData.get('campeonatoId') as string;

  try {
    // 1. Buscamos el campeonato actual para saber quién es el administrador
    const { data: campeonatoActual, error: campError } = await supabaseAdmin
      .from('campeonatos')
      .select('*')
      .eq('id', campeonatoId)
      .single();

    if (campError || !campeonatoActual) {
      return {
        success: false,
        error: 'No se encontró el campeonato de referencia.'
      };
    }

    const adminId = campeonatoActual.creado_by;

    // 2. Enviamos INVITACIÓN por correo y creamos el usuario
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          nombre: nombre,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
      });

    if (authError) {
      return {
        success: false,
        error: authError.message
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'No se pudo crear el usuario operador.'
      };
    }

    const userId = authData.user.id;

    // 3. Creamos el perfil del operador
    const { error: perfilError } = await supabaseAdmin
      .from('perfiles_usuarios')
      .upsert({
        id: userId,
        nombre_completo: nombre,
        rol: 'operador',
        estado: 'autorizado',
        admin_id: adminId,
      });

    if (perfilError) {
      // Si falla el perfil, eliminamos el usuario creado
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return {
        success: false,
        error: perfilError.message
      };
    }

    // 4. Buscamos TODOS los campeonatos del administrador
    const { data: campeonatosAdmin, error: campeonatosError } =
      await supabaseAdmin
        .from('campeonatos')
        .select('id')
        .eq('creado_by', adminId);

    if (campeonatosError) {
      return {
        success: false,
        error: campeonatosError.message
      };
    }

    // 5. Asignamos todos los campeonatos al operador
    if (campeonatosAdmin && campeonatosAdmin.length > 0) {
      const relaciones = campeonatosAdmin.map((camp) => ({
        user_id: userId,
        campeonato_id: camp.id,
      }));

      const { error: relacionesError } = await supabaseAdmin
        .from('operadores_campeonatos')
        .upsert(relaciones, {
          onConflict: 'user_id, campeonato_id'
        });

      if (relacionesError) {
        console.error(
          'Error asignando campeonatos al operador:',
          relacionesError
        );

        return {
          success: false,
          error: relacionesError.message
        };
      }
    }

    return {
      success: true,
      campeonatoId
    };

  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido';

    return {
      success: false,
      error: message
    };
  }
}