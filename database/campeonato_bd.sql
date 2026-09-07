-- 1. TABLA: Perfiles de Usuarios y Roles (SaaS Multi-tenant)
CREATE TABLE perfiles_usuarios (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    nombre_completo TEXT NOT NULL,
    rol TEXT CHECK (rol IN ('super_admin', 'admin', 'operador')) DEFAULT 'admin',
    estado TEXT CHECK (estado IN ('pendiente', 'autorizado')) DEFAULT 'pendiente',
    creado_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABLA: Campeonatos (Por año para el historial)
CREATE TABLE campeonatos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creado_by UUID REFERENCES perfiles_usuarios(id) ON DELETE SET NULL,
    nombre_campeonato TEXT NOT NULL,
    anio INT NOT NULL,
    activo BOOLEAN DEFAULT true,
    creado_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TABLA: Categorías (Sénior, Sub-40, Femenino, etc.)
CREATE TABLE categorias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campeonato_id UUID REFERENCES campeonatos(id) ON DELETE CASCADE NOT NULL,
    nombre_categoria TEXT NOT NULL, -- Ej: "Sénior", "Sub-40"
    creado_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. TABLA: Equipos (Vinculados a una categoría y campeonato específico)
CREATE TABLE equipos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    categoria_id UUID REFERENCES categorias(id) ON DELETE CASCADE NOT NULL,
    nombre_equipo TEXT NOT NULL,
    logo_url TEXT, -- Para el escudo del equipo
    creado_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TABLA: Jugadores Globales (La base de datos maestra de personas)
CREATE TABLE jugadores_globales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cedula_identidad TEXT UNIQUE NOT NULL, -- Evita duplicados en el pueblo
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    estado_suscripcion TEXT CHECK (estado_suscripcion IN ('activo', 'inactivo')) DEFAULT 'inactivo',
    creado_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. TABLA: Inscripciones / Fichajes (El historial mágico)
CREATE TABLE inscripciones_jugadores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    jugador_id UUID REFERENCES jugadores_globales(id) ON DELETE CASCADE NOT NULL,
    equipo_id UUID REFERENCES equipos(id) ON DELETE CASCADE NOT NULL,
    categoria_id UUID REFERENCES categorias(id) ON DELETE CASCADE NOT NULL,
    dorsal_numero INT, -- El número de camiseta que usó ese año
    creado_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    -- Un jugador no puede estar en dos equipos de la misma categoría en el mismo año
    UNIQUE(jugador_id, categoria_id) 
);

-- 7. TABLA: Fases (Permite etapas: "Primera Etapa", "Octavos de Final", "Semifinal", etc.)
CREATE TABLE fases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    categoria_id UUID REFERENCES categorias(id) ON DELETE CASCADE NOT NULL,
    nombre_fase TEXT NOT NULL, -- Ej: "Fase de Grupos", "Playoffs"
    tipo_formato TEXT CHECK (tipo_formato IN ('grupos', 'liga_directa', 'eliminacion_directa')) DEFAULT 'grupos',
    activa BOOLEAN DEFAULT true,
    creado_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. TABLA: Grupos (Para albergar los equipos en cada fase si aplica)
CREATE TABLE grupos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fase_id UUID REFERENCES fases(id) ON DELETE CASCADE NOT NULL,
    nombre_grupo TEXT NOT NULL, -- Ej: "Grupo A", "Grupo B", "Grupo Único"
    creado_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. TABLA: Asignación de Equipos a Grupos (La relación mágica)
CREATE TABLE grupos_equipos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE NOT NULL,
    equipo_id UUID REFERENCES equipos(id) ON DELETE CASCADE NOT NULL,
    puntos_bonificacion INT DEFAULT 0, -- Por si el reglamento da puntos extra antes de empezar
    UNIQUE(grupo_id, equipo_id)
);

-- 10. TABLA: Partidos / Calendario (Válido para cualquier formato)
CREATE TABLE partidos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE, -- Puede ser NULL si es eliminación directa pura
    fase_id UUID REFERENCES fases(id) ON DELETE CASCADE NOT NULL,
    equipo_local_id UUID REFERENCES equipos(id) ON DELETE SET NULL,
    equipo_visita_id UUID REFERENCES equipos(id) ON DELETE SET NULL,
    goles_local INT DEFAULT NULL, -- NULL significa que el partido aún no se juega
    goles_visita INT DEFAULT NULL,
    fecha_partido TIMESTAMP WITH TIME ZONE,
    lugar TEXT, -- Ej: "Cancha Central", "Coliseo Municipal"
    estado TEXT CHECK (estado IN ('programado', 'en_vivo', 'finalizado', 'suspendido')) DEFAULT 'programado',
    numero_fecha INT NOT NULL, -- Ej: Fecha 1, Fecha 2, Jornada 3
    creado_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE partidos
ADD COLUMN periodo_actual TEXT
CHECK (periodo_actual IN ('no_iniciado', '1T', 'entretiempo', '2T'))
DEFAULT 'no_iniciado';

-- 11. TABLA: Estadísticas del Partido (Mina de oro para el historial premium del jugador)
CREATE TABLE detalles_partidos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partido_id UUID REFERENCES partidos(id) ON DELETE CASCADE NOT NULL,
    jugador_id UUID REFERENCES jugadores_globales(id) ON DELETE CASCADE NOT NULL,
    equipo_id UUID REFERENCES equipos(id) ON DELETE CASCADE NOT NULL,
    goles INT DEFAULT 0,
    tarjetas_amarillas INT DEFAULT 0,
    tarjetas_rojas INT DEFAULT 0,
    creado_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(partido_id, jugador_id) -- Un jugador solo registra una fila de estadísticas por partido
);

-- 1. Modificar la columna numero_fecha en la tabla partidos para que acepte TEXT
-- Primero cambiamos el tipo de dato convirtiendo los enteros existentes a texto de forma segura
ALTER TABLE partidos 
  ALTER COLUMN numero_fecha TYPE TEXT USING numero_fecha::text;

-- 2. Re-crear la vista de posiciones en vivo asegurando que NUNCA cuente los partidos de eliminación directa
CREATE OR REPLACE VIEW vista_posiciones_en_vivo AS
WITH estadisticas_partidos AS (
    -- Procesar partidos como LOCAL (Solo los que pertenecen a un grupo real)
    SELECT 
        p.grupo_id,
        p.equipo_local_id AS equipo_id,
        1 AS PJ,
        CASE 
            WHEN p.estado IN ('en_vivo', 'finalizado') AND COALESCE(p.goles_local, 0) > COALESCE(p.goles_visita, 0) THEN 1 
            ELSE 0 
        END AS PG,
        CASE 
            WHEN p.estado IN ('en_vivo', 'finalizado') AND COALESCE(p.goles_local, 0) = COALESCE(p.goles_visita, 0) THEN 1 
            ELSE 0 
        END AS PE,
        CASE 
            WHEN p.estado IN ('en_vivo', 'finalizado') AND COALESCE(p.goles_local, 0) < COALESCE(p.goles_visita, 0) THEN 1 
            ELSE 0 
        END AS PP,
        CASE WHEN p.estado IN ('en_vivo', 'finalizado') THEN COALESCE(p.goles_local, 0) ELSE 0 END AS GF,
        CASE WHEN p.estado IN ('en_vivo', 'finalizado') THEN COALESCE(p.goles_visita, 0) ELSE 0 END AS GC
    FROM partidos p
    WHERE p.estado IN ('en_vivo', 'finalizado') 
      AND p.equipo_local_id IS NOT NULL
      AND p.grupo_id IS NOT NULL -- 👈 FILTRO CRUCIAL: Ignora playoffs en la tabla del grupo

    UNION ALL

    -- Procesar partidos como VISITA (Solo los que pertenecen a un grupo real)
    SELECT 
        p.grupo_id,
        p.equipo_visita_id AS equipo_id,
        1 AS PJ,
        CASE 
            WHEN p.estado IN ('en_vivo', 'finalizado') AND COALESCE(p.goles_visita, 0) > COALESCE(p.goles_local, 0) THEN 1 
            ELSE 0 
        END AS PG,
        CASE 
            WHEN p.estado IN ('en_vivo', 'finalizado') AND COALESCE(p.goles_visita, 0) = COALESCE(p.goles_local, 0) THEN 1 
            ELSE 0 
        END AS PE,
        CASE 
            WHEN p.estado IN ('en_vivo', 'finalizado') AND COALESCE(p.goles_visita, 0) < COALESCE(p.goles_local, 0) THEN 1 
            ELSE 0 
        END AS PP,
        CASE WHEN p.estado IN ('en_vivo', 'finalizado') THEN COALESCE(p.goles_visita, 0) ELSE 0 END AS GF,
        CASE WHEN p.estado IN ('en_vivo', 'finalizado') THEN COALESCE(p.goles_local, 0) ELSE 0 END AS GC
    FROM partidos p
    WHERE p.estado IN ('en_vivo', 'finalizado') 
      AND p.equipo_visita_id IS NOT NULL
      AND p.grupo_id IS NOT NULL -- 👈 FILTRO CRUCIAL: Ignora playoffs en la tabla del grupo
),
resumen_agrupado AS (
    SELECT 
        ep.grupo_id,
        ep.equipo_id,
        SUM(ep.PJ) AS pj,
        SUM(ep.PG) AS pg,
        SUM(ep.PE) AS pe,
        SUM(ep.PP) AS pp,
        SUM(ep.GF) AS gf,
        SUM(ep.GC) AS gc,
        SUM(ep.GF) - SUM(ep.GC) AS dg,
        SUM((ep.PG * 3) + (ep.PE * 1)) AS pts_partidos
    FROM estadisticas_partidos ep
    GROUP BY ep.grupo_id, ep.equipo_id
)
SELECT 
    ge.grupo_id,
    e.id AS equipo_id,
    e.nombre_equipo,
    e.logo_url,
    COALESCE(r.pj, 0) AS pj,
    COALESCE(r.pg, 0) AS pg,
    COALESCE(r.pe, 0) AS pe,
    COALESCE(r.pp, 0) AS pp,
    COALESCE(r.gf, 0) AS gf,
    COALESCE(r.gc, 0) AS gc,
    COALESCE(r.dg, 0) AS dg,
    (COALESCE(r.pts_partidos, 0) + COALESCE(ge.puntos_bonificacion, 0)) AS pts
FROM grupos_equipos ge
JOIN equipos e ON ge.equipo_id = e.id
LEFT JOIN resumen_agrupado r ON r.grupo_id = ge.grupo_id AND r.equipo_id = e.id
ORDER BY ge.grupo_id, pts DESC, dg DESC, gf DESC;