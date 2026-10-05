import { notFound } from "next/navigation";
import { connection } from "next/server";
import { citasDePaciente, obtenerPaciente } from "@/lib/db";
import { obtenerHistorialLegado } from "@/lib/legacy";

export default async function PacientePage({ params }: PageProps<"/pacientes/[id]">) {
  await connection();
  const { id } = await params;
  const paciente = await obtenerPaciente(Number(id));
  if (!paciente) notFound();

  const [historial, citas] = await Promise.all([
    obtenerHistorialLegado(paciente.legacy_id),
    citasDePaciente(paciente.id),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">
          {paciente.nombre} {paciente.apellidos}
        </h1>
        <p className="text-sm opacity-70">
          RUT {paciente.rut} · {paciente.prevision} · nacimiento{" "}
          {paciente.fecha_nacimiento} · código legado {paciente.legacy_id}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Historial (sistema legado)</h2>
        {historial.length === 0 ? (
          <p className="opacity-70">Sin registros.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {historial.map((r, i) => (
              <li key={i}>
                <span className="font-mono">{r.fecha}</span> {r.texto}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Citas (sistema nuevo)</h2>
        {citas.length === 0 ? (
          <p className="opacity-70">Sin citas.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {citas.map((c) => (
              <li key={c.id}>
                {c.inicio.toLocaleString("es-CL", { timeZone: "America/Santiago" })} · {c.especialidad} ·{" "}
                {c.estado}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
