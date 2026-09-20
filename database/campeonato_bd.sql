-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.perfiles_usuarios (
  id uuid NOT NULL,
  nombre_completo text NOT NULL,
  rol text DEFAULT 'admin'::text CHECK (rol = ANY (ARRAY['super_admin'::text, 'admin'::text, 'operador'::text])),
  estado text DEFAULT 'pendiente'::text CHECK (estado = ANY (ARRAY['pendiente'::text, 'autorizado'::text])),
  creado_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  telefono text,
  admin_id uuid,
  CONSTRAINT perfiles_usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT perfiles_usuarios_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.campeonatos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  creado_by uuid,
  nombre_campeonato text NOT NULL,
  anio integer NOT NULL,
  activo boolean DEFAULT true,
  creado_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  destacado_principal boolean DEFAULT false,
  CONSTRAINT campeonatos_pkey PRIMARY KEY (id),
  CONSTRAINT campeonatos_creado_by_fkey FOREIGN KEY (creado_by) REFERENCES public.perfiles_usuarios(id)
);
CREATE TABLE public.categorias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campeonato_id uuid NOT NULL,
  nombre_categoria text NOT NULL,
  creado_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  url_transmision text,
  CONSTRAINT categorias_pkey PRIMARY KEY (id),
  CONSTRAINT categorias_campeonato_id_fkey FOREIGN KEY (campeonato_id) REFERENCES public.campeonatos(id)
);
CREATE TABLE public.equipos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL,
  nombre_equipo text NOT NULL,
  logo_url text,
  creado_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT equipos_pkey PRIMARY KEY (id),
  CONSTRAINT equipos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id)
);
CREATE TABLE public.jugadores_globales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cedula_identidad text NOT NULL UNIQUE,
  nombre text NOT NULL,
  apellido text NOT NULL,
  estado_suscripcion text DEFAULT 'inactivo'::text CHECK (estado_suscripcion = ANY (ARRAY['activo'::text, 'inactivo'::text])),
  creado_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT jugadores_globales_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inscripciones_jugadores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  jugador_id uuid NOT NULL,
  equipo_id uuid NOT NULL,
  categoria_id uuid NOT NULL,
  dorsal_numero integer,
  creado_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT inscripciones_jugadores_pkey PRIMARY KEY (id),
  CONSTRAINT inscripciones_jugadores_jugador_id_fkey FOREIGN KEY (jugador_id) REFERENCES public.jugadores_globales(id),
  CONSTRAINT inscripciones_jugadores_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id),
  CONSTRAINT inscripciones_jugadores_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id)
);
CREATE TABLE public.fases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL,
  nombre_fase text NOT NULL,
  tipo_formato text DEFAULT 'grupos'::text CHECK (tipo_formato = ANY (ARRAY['grupos'::text, 'liga_directa'::text, 'eliminacion_directa'::text])),
  activa boolean DEFAULT true,
  creado_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT fases_pkey PRIMARY KEY (id),
  CONSTRAINT fases_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id)
);
CREATE TABLE public.grupos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fase_id uuid NOT NULL,
  nombre_grupo text NOT NULL,
  creado_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT grupos_pkey PRIMARY KEY (id),
  CONSTRAINT grupos_fase_id_fkey FOREIGN KEY (fase_id) REFERENCES public.fases(id)
);
CREATE TABLE public.grupos_equipos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL,
  equipo_id uuid NOT NULL,
  puntos_bonificacion integer DEFAULT 0,
  CONSTRAINT grupos_equipos_pkey PRIMARY KEY (id),
  CONSTRAINT grupos_equipos_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id),
  CONSTRAINT grupos_equipos_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id)
);
CREATE TABLE public.partidos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  grupo_id uuid,
  fase_id uuid NOT NULL,
  equipo_local_id uuid,
  equipo_visita_id uuid,
  goles_local integer,
  goles_visita integer,
  fecha_partido timestamp with time zone,
  lugar text,
  estado text DEFAULT 'programado'::text CHECK (estado = ANY (ARRAY['programado'::text, 'en_vivo'::text, 'finalizado'::text, 'suspendido'::text])),
  numero_fecha text NOT NULL,
  creado_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  periodo_actual text DEFAULT 'no_iniciado'::text CHECK (periodo_actual = ANY (ARRAY['no_iniciado'::text, '1T'::text, 'entretiempo'::text, '2T'::text])),
  goles_penales_local integer,
  goles_penales_visita integer,
  orden integer,
  CONSTRAINT partidos_pkey PRIMARY KEY (id),
  CONSTRAINT partidos_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id),
  CONSTRAINT partidos_fase_id_fkey FOREIGN KEY (fase_id) REFERENCES public.fases(id),
  CONSTRAINT partidos_equipo_local_id_fkey FOREIGN KEY (equipo_local_id) REFERENCES public.equipos(id),
  CONSTRAINT partidos_equipo_visita_id_fkey FOREIGN KEY (equipo_visita_id) REFERENCES public.equipos(id)
);
CREATE TABLE public.detalles_partidos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partido_id uuid NOT NULL,
  jugador_id uuid NOT NULL,
  equipo_id uuid NOT NULL,
  goles integer DEFAULT 0,
  tarjetas_amarillas integer DEFAULT 0,
  tarjetas_rojas integer DEFAULT 0,
  creado_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT detalles_partidos_pkey PRIMARY KEY (id),
  CONSTRAINT detalles_partidos_partido_id_fkey FOREIGN KEY (partido_id) REFERENCES public.partidos(id),
  CONSTRAINT detalles_partidos_jugador_id_fkey FOREIGN KEY (jugador_id) REFERENCES public.jugadores_globales(id),
  CONSTRAINT detalles_partidos_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipos(id)
);
CREATE TABLE public.operadores_campeonatos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  campeonato_id uuid,
  creado_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT operadores_campeonatos_pkey PRIMARY KEY (id),
  CONSTRAINT operadores_campeonatos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.perfiles_usuarios(id),
  CONSTRAINT operadores_campeonatos_campeonato_id_fkey FOREIGN KEY (campeonato_id) REFERENCES public.campeonatos(id)
);