import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Cita, Paciente } from "./db";
import type { RegistroHistorial } from "./legacy";

const client = new Anthropic();

const SYSTEM = `Eres un asistente para médicos de una clínica oncológica.
Recibes el historial clínico de un paciente (texto del sistema antiguo, en mayúsculas y abreviado)
y sus próximas citas. Escribe un resumen breve para que el médico lo lea antes de la consulta:
- 3 a 5 viñetas con lo clínicamente relevante, en orden cronológico.
- Una línea final "Para esta cita:" con qué revisar, basado solo en el historial.
No inventes datos que no estén en el historial. Si el historial está vacío, dilo.
Escribe en español de Chile, en tono profesional.`;

export type ResultadoResumen = { ok: true; texto: string } | { ok: false; error: string };

export async function resumirHistorial(
  paciente: Paciente,
  historial: RegistroHistorial[],
  citas: Cita[],
): Promise<ResultadoResumen> {
  // Sin credenciales el SDK lanza un Error genérico antes de llamar a la API
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return { ok: false, error: "Falta configurar ANTHROPIC_API_KEY en .env.local." };
  }

  const entrada = [
    `Paciente: ${paciente.nombre} ${paciente.apellidos}, nacido el ${paciente.fecha_nacimiento}, previsión ${paciente.prevision}.`,
    "",
    "Historial:",
    ...(historial.length ? historial.map((r) => `- ${r.fecha}: ${r.texto}`) : ["(sin registros)"]),
    "",
    "Citas registradas en el sistema nuevo:",
    ...(citas.length
      ? citas.map((c) => `- ${c.inicio.toISOString()} ${c.especialidad} (${c.estado}) ${c.motivo ?? ""}`)
      : ["(sin citas)"]),
  ].join("\n");

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low" }, // resumen corto: no necesita razonamiento profundo
      // Si el modelo declina por política, la API reintenta con un modelo de respaldo
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: entrada }],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: "El modelo no pudo generar este resumen." };
    }

    const texto = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return texto ? { ok: true, texto } : { ok: false, error: "Respuesta vacía del modelo." };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "Falta configurar ANTHROPIC_API_KEY." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Límite de uso alcanzado, intenta en un momento." };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: `Error de la API (${error.status}).` };
    }
    throw error;
  }
}
