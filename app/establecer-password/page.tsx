'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function EstablecerPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const establecerPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMsg('');
    setSuccessMsg('');

    // Validación básica
    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmarPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      // Verificamos que exista una sesión
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMsg(
          'La invitación no es válida o la sesión ha expirado. Solicita una nueva invitación.'
        );
        return;
      }

      // Establecemos la nueva contraseña
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      setSuccessMsg(
        '¡Contraseña creada correctamente! Redirigiendo...'
      );

      // Pequeña pausa para mostrar el mensaje
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1200);

    } catch (error) {
      console.error('Error estableciendo contraseña:', error);

      setErrorMsg(
        'No se pudo establecer la contraseña. Inténtalo nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#f5f7fb',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '36px',
          boxShadow: '0 15px 45px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Encabezado */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '30px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 18px',
              borderRadius: '18px',
              background: '#eef7f4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '30px',
            }}
          >
            🔐
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '26px',
              fontWeight: 700,
              color: '#17202a',
            }}
          >
            Configura tu contraseña
          </h1>

          <p
            style={{
              marginTop: '10px',
              marginBottom: 0,
              color: '#667085',
              fontSize: '15px',
              lineHeight: 1.5,
            }}
          >
            Tu invitación fue aceptada.
            <br />
            Ahora crea una contraseña para acceder a tu cuenta.
          </p>
        </div>

        {/* Mensaje de error */}
        {errorMsg && (
          <div
            style={{
              marginBottom: '20px',
              padding: '13px 15px',
              borderRadius: '10px',
              background: '#fff1f1',
              color: '#c62828',
              fontSize: '14px',
              lineHeight: 1.4,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Mensaje de éxito */}
        {successMsg && (
          <div
            style={{
              marginBottom: '20px',
              padding: '13px 15px',
              borderRadius: '10px',
              background: '#ecfdf3',
              color: '#18794e',
              fontSize: '14px',
              lineHeight: 1.4,
            }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={establecerPassword}>
          {/* Nueva contraseña */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#344054',
              }}
            >
              Nueva contraseña
            </label>

            <div style={{ position: 'relative' }}>
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '13px 48px 13px 14px',
                  border: '1px solid #d0d5dd',
                  borderRadius: '10px',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />

              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                disabled={loading}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                {mostrarPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div style={{ marginBottom: '25px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#344054',
              }}
            >
              Confirmar contraseña
            </label>

            <div style={{ position: 'relative' }}>
              <input
                type={mostrarConfirmacion ? 'text' : 'password'}
                value={confirmarPassword}
                onChange={(e) =>
                  setConfirmarPassword(e.target.value)
                }
                placeholder="Repite tu contraseña"
                disabled={loading}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '13px 48px 13px 14px',
                  border: '1px solid #d0d5dd',
                  borderRadius: '10px',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setMostrarConfirmacion(!mostrarConfirmacion)
                }
                disabled={loading}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                {mostrarConfirmacion ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              border: 'none',
              borderRadius: '10px',
              background: loading ? '#98a6a1' : '#168a71',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creando contraseña...' : 'Crear contraseña'}
          </button>
        </form>

        <p
          style={{
            marginTop: '22px',
            textAlign: 'center',
            color: '#98a2b3',
            fontSize: '12px',
          }}
        >
          Esta contraseña será utilizada para ingresar a tu cuenta.
        </p>
      </div>
    </main>
  );
}