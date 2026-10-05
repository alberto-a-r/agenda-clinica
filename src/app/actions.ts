"use server";

import { revalidatePath } from "next/cache";
import { citasDePaciente, obtenerPaciente, pool } from "@/lib/db";
import { obtenerHistorialLegado, obtenerPacientesLegado } from "@/lib/legacy";
import { resumirHistorial, type ResultadoResumen } from "@/lib/resumen";

// NOTA: proyecto de demostración sin autenticación. En un sistema real cada
// Server Action debe verificar sesión y permisos antes de tocar datos clínicos.

export async function sincronizarPacientes(): Promise<void> {
  const pacientes = await obtenerPacientesLegado();

  // Upsert por legacy_id: re-sincronizar actualiza en vez de duplicar.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const p of pacientes) {
      await client.query(
        `INSERT INTO pacientes (legacy_id, rut, nombre, apellidos, fecha_nacimiento, prevision)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (legacy_id) DO UPDATE SET
           rut = EXCLUDED.rut,
           nombre = EXCLUDED.nombre,
           apellidos = EXCLUDED.apellidos,
           fecha_nacimiento = EXCLUDED.fecha_nacimiento,
           prevision = EXCLUDED.prevision,
           sincronizado_en = now()`,
        [p.legacyId, p.rut, p.nombre, p.apellidos, p.fechaNacimiento, p.prevision],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  revalidatePath("/pacientes");
}

export async function crearCita(formData: FormData): Promise<void> {
  const pacienteId = Number(formData.get("pacienteId"));
  const inicio = String(formData.get("inicio") ?? "");
  const especialidad = String(formData.get("especialidad") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim() || null;

  if (!pacienteId || !inicio || !especialidad) {
    throw new Error("Faltan datos para crear la cita.");
  }

  await pool.query(
    "INSERT INTO citas (paciente_id, inicio, especialidad, motivo) VALUES ($1, $2, $3, $4)",
    [pacienteId, new Date(inicio), especialidad, motivo],
  );

  revalidatePath("/");
  revalidatePath(`/pacientes/${pacienteId}`);
}

export async function generarResumen(
  _estadoPrevio: ResultadoResumen | null,
  formData: FormData,
): Promise<ResultadoResumen> {
  const pacienteId = Number(formData.get("pacienteId"));
  const paciente = await obtenerPaciente(pacienteId);
  if (!paciente) return { ok: false, error: "Paciente no encontrado." };

  const [historial, citas] = await Promise.all([
    obtenerHistorialLegado(paciente.legacy_id),
    citasDePaciente(pacienteId),
  ]);

  return resumirHistorial(paciente, historial, citas);
}
