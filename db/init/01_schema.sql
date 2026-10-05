-- Esquema del sistema nuevo.
-- Los pacientes vienen del sistema legado; legacy_id guarda su código original
-- para poder re-sincronizar sin duplicar.

CREATE TABLE pacientes (
  id               SERIAL PRIMARY KEY,
  legacy_id        TEXT UNIQUE NOT NULL,
  rut              TEXT UNIQUE NOT NULL,          -- formato normalizado: 12345678-K
  nombre           TEXT NOT NULL,
  apellidos        TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  prevision        TEXT NOT NULL CHECK (prevision IN ('FONASA', 'ISAPRE', 'PARTICULAR')),
  sincronizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE citas (
  id           SERIAL PRIMARY KEY,
  paciente_id  INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  inicio       TIMESTAMPTZ NOT NULL,
  especialidad TEXT NOT NULL,
  motivo       TEXT,
  estado       TEXT NOT NULL DEFAULT 'agendada'
               CHECK (estado IN ('agendada', 'confirmada', 'atendida', 'cancelada')),
  creada_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX citas_inicio_idx ON citas (inicio);
CREATE INDEX citas_paciente_idx ON citas (paciente_id);
