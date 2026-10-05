import "server-only";

// Adaptador al sistema legado. Toda la traducción de formato vive aquí,
// así el resto de la app solo conoce el modelo nuevo.

const LEGACY_URL = process.env.LEGACY_API_URL ?? "http://localhost:4001";

type PacienteLegado = {
  COD_PAC: string;
  RUT_PAC: string;
  NOM_PAC: string;
  FEC_NAC: string;
  PREVISION: "FON" | "ISA" | "PAR";
};

export type PacienteNormalizado = {
  legacyId: string;
  rut: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string; // ISO YYYY-MM-DD
  prevision: "FONASA" | "ISAPRE" | "PARTICULAR";
};

export type RegistroHistorial = { fecha: string; texto: string };

const PREVISIONES = { FON: "FONASA", ISA: "ISAPRE", PAR: "PARTICULAR" } as const;

/** "12345678K" o "9876543-2" -> "12345678-K" */
export function normalizarRut(rut: string): string {
  const limpio = rut.replace(/[.\-\s]/g, "").toUpperCase();
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

/** "03/05/1961" -> "1961-05-03" */
export function fechaLegadoAIso(fecha: string): string {
  const [dia, mes, anio] = fecha.split("/");
  return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

/** "PEREZ SOTO, JUAN ANDRES" -> "Perez Soto" */
function capitalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function normalizarPaciente(p: PacienteLegado): PacienteNormalizado {
  const [apellidos, nombres = ""] = p.NOM_PAC.split(",");
  return {
    legacyId: p.COD_PAC,
    rut: normalizarRut(p.RUT_PAC),
    nombre: capitalizar(nombres),
    apellidos: capitalizar(apellidos),
    fechaNacimiento: fechaLegadoAIso(p.FEC_NAC),
    prevision: PREVISIONES[p.PREVISION],
  };
}

async function getLegado<T>(ruta: string): Promise<T> {
  const res = await fetch(`${LEGACY_URL}${ruta}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sistema legado respondió ${res.status} en ${ruta}`);
  return res.json() as Promise<T>;
}

export async function obtenerPacientesLegado(): Promise<PacienteNormalizado[]> {
  const data = await getLegado<{ PACIENTES: PacienteLegado[] }>("/api/pacientes");
  return data.PACIENTES.map(normalizarPaciente);
}

export async function obtenerHistorialLegado(legacyId: string): Promise<RegistroHistorial[]> {
  const data = await getLegado<{ REGISTROS: string[] }>(
    `/api/pacientes/${encodeURIComponent(legacyId)}/historial`,
  );
  // Cada registro: "DD/MM/YYYY TEXTO..."
  return data.REGISTROS.map((linea) => {
    const [fecha, ...resto] = linea.split(" ");
    return { fecha: fechaLegadoAIso(fecha), texto: resto.join(" ") };
  });
}
