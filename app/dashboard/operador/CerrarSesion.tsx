'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function CerrarSesion() {
  const router = useRouter();
  const [cerrando, setCerrando] = useState(false);

  const handleCerrarSesion = async () => {
    if (cerrando) return;

    setCerrando(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error al cerrar sesión:', error);
      setCerrando(false);
      return;
    }

    router.push('/login');
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleCerrarSesion}
      disabled={cerrando}
      className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/35 border border-white/10 hover:border-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>

      {cerrando ? 'Cerrando sesión...' : 'Cerrar sesión'}
    </button>
  );
}