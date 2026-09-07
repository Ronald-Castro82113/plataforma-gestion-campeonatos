CREATE OR REPLACE VIEW vista_posiciones_en_vivo AS
WITH estadisticas_partidos AS (
    -- Procesar partidos como LOCAL
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
    WHERE p.estado IN ('en_vivo', 'finalizado') AND p.equipo_local_id IS NOT NULL

    UNION ALL

    -- Procesar partidos como VISITA
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
    WHERE p.estado IN ('en_vivo', 'finalizado') AND p.equipo_visita_id IS NOT NULL
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

-- 2. Añadir las columnas para gestionar los penales
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS goles_penales_local INT DEFAULT NULL;
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS goles_penales_visita INT DEFAULT NULL;