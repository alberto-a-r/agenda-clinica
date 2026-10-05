import "server-only";
import { Pool, types } from "pg";

// DATE (oid 1082) como string "YYYY-MM-DD": evita corrimientos de día por zona horaria
types.setTypeParser(1082, (valor) => valor);

// En desarrollo Next recarga módulos; guardamos el pool en globalThis
// para no abrir conexiones nuevas en cada recarga.
const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export type Paciente = {
  id: number;
  legacy_id: string;
  rut: string;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string;
  prevision: "FONASA" | "ISAPRE" | "PARTICULAR";
  sincronizado_en: Date;
};

export type Cita = {
  id: number;
  paciente_id: number;
  inicio: Date;
  especialidad: string;
  motivo: string | null;
  estado: "agendada" | "confirmada" | "atendida" | "cancelada";
};

export type CitaConPaciente = Cita & { nombre: string; apellidos: string };

export async function listarPacientes(): Promise<Paciente[]> {
  const { rows } = await pool.query<Paciente>(
    "SELECT * FROM pacientes ORDER BY apellidos, nombre",
  );
  return rows;
}

export async function obtenerPaciente(id: number): Promise<Paciente | null> {
  const { rows } = await pool.query<Paciente>("SELECT * FROM pacientes WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function proximasCitas(): Promise<CitaConPaciente[]> {
  const { rows } = await pool.query<CitaConPaciente>(
    `SELECT c.*, p.nombre, p.apellidos
       FROM citas c JOIN pacientes p ON p.id = c.paciente_id
      WHERE c.inicio >= now() - interval '1 day' AND c.estado <> 'cancelada'
      ORDER BY c.inicio
      LIMIT 50`,
  );
  return rows;
}

export async function citasDePaciente(pacienteId: number): Promise<Cita[]> {
  const { rows } = await pool.query<Cita>(
    "SELECT * FROM citas WHERE paciente_id = $1 ORDER BY inicio DESC",
    [pacienteId],
  );
  return rows;
}
