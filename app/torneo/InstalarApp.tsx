'use client';

import { useEffect, useState } from 'react';
import { useInstall } from '@/components/InstallProvider';

export default function InstalarApp() {
  const { canInstall, install } = useInstall();

  const [esIOS, setEsIOS] = useState(false);
  const [yaInstalada, setYaInstalada] = useState(false);

  useEffect(() => {
    const navegador = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(navegador);

    const instalada =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator &&
        (window.navigator as Navigator & { standalone?: boolean })
          .standalone === true);

    setEsIOS(ios);
    setYaInstalada(instalada);
  }, []);

  if (yaInstalada) {
    return null;
  }

  if (esIOS) {
    return (
      <div className="mx-4 mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">📱</div>

          <div className="flex-1">
            <h3 className="font-bold text-slate-900">
              Instalar Casmi Sports
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              En tu iPhone, toca el botón
              <strong> Compartir</strong> y luego
              <strong> “Añadir a pantalla de inicio”</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!canInstall) {
    return null;
  }

  return (
    <div className="mx-4 mt-4">
      <button
        type="button"
        onClick={install}
        className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-blue-700"
      >
        Instalar Casmi Sports
      </button>
    </div>
  );
}