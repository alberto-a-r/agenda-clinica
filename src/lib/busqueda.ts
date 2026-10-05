import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { PoolClient } from "pg";
import { pool } from "./db";
import { aVectorSql, embedConsulta, embedFragmentos } from "./embeddings";
import type { RegistroHistorial } from "./legacy";

const client = new Anthropic();

export type Fragmento = {
  id: number;
  paciente_id: number;
  nombre: string;
  apellidos: string;
  fecha: string;
  texto: string;
  similitud: number;
};

export type ResultadoBusqueda =
  | { ok: true; respuesta: string | null; fuentes: Fragmento[]; aviso?: string }
  | { ok: false; error: string };

/** Indexa los registros nuevos del historial de un paciente (los existentes se saltan). */
export async function indexarHistorial(
  db: PoolClient,
  pacienteId: number,
  historial: RegistroHistorial[],
): Promise<number> {
  const { rows: existentes } = await db.query<{ fecha: string; texto: string }>(
    "SELECT fecha, texto FROM historial_fragmentos WHERE paciente_id = $1",
    [pacienteId],
  );
  const yaIndexados = new Set(existentes.map((r) => `${r.fecha}|${r.texto}`));
  const nuevos = historial.filter((r) => !yaIndexados.has(`${r.fecha}|${r.texto}`));
  if (nuevos.length === 0) return 0;

  const vectores = await embedFragmentos(nuevos.map((r) => r.texto));
  for (const [i, r] of nuevos.entries()) {
    await db.query(
      `INSERT INTO historial_fragmentos (paciente_id, fecha, texto, embedding)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (paciente_id, fecha, texto) DO NOTHING`,
      [pacienteId, r.fecha, r.texto, aVectorSql(vectores[i])],
    );
  }
  return nuevos.length;
}

/** Recupera los fragmentos más parecidos a la pregunta (similitud coseno). */
export async function recuperar(
  pregunta: string,
  pacienteId: number | null,
  k = 5,
): Promise<Fragmento[]> {
  const vector = aVectorSql(await embedConsulta(pregunta));
  const { rows } = await pool.query<Fragmento>(
    `SELECT f.id, f.paciente_id, p.nombre, p.apellidos, f.fecha, f.texto,
            1 - (f.embedding <=> $1::vector) AS similitud
       FROM historial_fragmentos f JOIN pacientes p ON p.id = f.paciente_id
      WHERE $2::int IS NULL OR f.paciente_id = $2
      ORDER BY f.embedding <=> $1::vector
      LIMIT $3`,
    [vector, pacienteId, k],
  );
  return rows;
}

const SYSTEM = `Respondes preguntas de médicos sobre historiales clínicos usando SOLO los fragmentos entregados.
- Cita cada afirmación con el número del fragmento entre corchetes, por ejemplo [2].
- Si los fragmentos no contienen la respuesta, dilo claramente; no completes con conocimiento general.
- Responde en español de Chile, breve y profesional.`;

/** RAG: recupera fragmentos y genera una respuesta citada. */
export async function buscarEnHistorial(
  pregunta: string,
  pacienteId: number | null,
): Promise<ResultadoBusqueda> {
  const fuentes = await recuperar(pregunta, pacienteId);
  if (fuentes.length === 0) {
    return { ok: true, respuesta: null, fuentes, aviso: "No hay historial indexado. Sincroniza los pacientes primero." };
  }

  // Sin credenciales devolvemos solo la recuperación: la búsqueda semántica igual sirve
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return { ok: true, respuesta: null, fuentes, aviso: "Sin ANTHROPIC_API_KEY: se muestran solo los fragmentos encontrados." };
  }

  const contexto = fuentes
    .map((f, i) => `[${i + 1}] ${f.nombre} ${f.apellidos} — ${f.fecha}: ${f.texto}`)
    .join("\n");

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: `Fragmentos:\n${contexto}\n\nPregunta: ${pregunta}` }],
    });

    if (response.stop_reason === "refusal") {
      return { ok: true, respuesta: null, fuentes, aviso: "El modelo no pudo responder; se muestran los fragmentos." };
    }

    const respuesta = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return { ok: true, respuesta: respuesta || null, fuentes };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return { ok: true, respuesta: null, fuentes, aviso: `Error de la API (${error.status}); se muestran los fragmentos.` };
    }
    throw error;
  }
}
