-- Búsqueda semántica (RAG) sobre el historial clínico.
-- Cada registro del historial legado se guarda como un fragmento con su embedding.
-- Idempotente: se puede volver a ejecutar sobre una base existente.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS historial_fragmentos (
  id          SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha       DATE NOT NULL,
  texto       TEXT NOT NULL,
  embedding   vector(384) NOT NULL,          -- multilingual-e5-small
  indexado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (paciente_id, fecha, texto)         -- re-sincronizar no duplica
);

CREATE INDEX IF NOT EXISTS historial_fragmentos_embedding_idx
  ON historial_fragmentos USING hnsw (embedding vector_cosine_ops);
