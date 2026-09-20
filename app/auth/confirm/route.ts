import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  // Verificamos que la invitación traiga los datos necesarios
  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL('/login?error=invalid_invitation', request.url)
    );
  }

  // Cliente Supabase del servidor
  const supabase = await createClient();

  // Validamos la invitación
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    console.error('Error verificando invitación:', error);

    return NextResponse.redirect(
      new URL('/login?error=expired_invitation', request.url)
    );
  }

  // La invitación fue aceptada.
  // La sesión queda guardada mediante las cookies de Supabase.
  return NextResponse.redirect(
    new URL('/establecer-password', request.url)
  );
}