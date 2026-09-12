'use client';

import { use } from 'react';
// Ajusta los puntos (../../) según los niveles que suba para llegar a app/dashboard/acciones.ts
import { crearOperadorParaCampeonato } from '../../acciones';

export default function GestionOperadoresCampeonatoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Extraemos automáticamente el ID del campeonato actual desde la URL
  const { id: campeonatoId } = use(params);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-200 mt-10">
      <h1 className="text-xl font-bold text-slate-800 mb-2">Crear Operador para este Campeonato</h1>
      <p className="text-sm text-slate-500 mb-6">
        Crea una cuenta exclusiva para que este operador controle únicamente los partidos de este campeonato actual.
      </p>

      <form action={crearOperadorParaCampeonato} className="space-y-4">
        {/* Input oculto que envía el ID del campeonato de forma automática */}
        <input type="hidden" name="campeonatoId" value={campeonatoId} />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
            Nombre Completo
          </label>
          <input
            name="nombre"
            type="text"
            required
            className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
            placeholder="Ej. Juan Pérez"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
            Correo Electrónico
          </label>
          <input
            name="email"
            type="email"
            required
            className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
            placeholder="operador@correo.com"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
            Contraseña
          </label>
          <input
            name="password"
            type="password"
            required
            className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-xl text-sm hover:bg-blue-700 transition"
        >
          Registrar Operador para este Campeonato
        </button>
      </form>
    </div>
  );
}