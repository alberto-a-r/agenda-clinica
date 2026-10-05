import Link from "next/link";
import { connection } from "next/server";
import { crearCita } from "./actions";
import { listarPacientes, proximasCitas } from "@/lib/db";

const formatoFecha = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Santiago",
});

export default async function CitasPage() {
  await connection(); // datos en vivo: no prerenderizar
  const [citas, pacientes] = await Promise.all([proximasCitas(), listarPacientes()]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-3 text-2xl font-semibold">Próximas citas</h1>
        {citas.length === 0 ? (
          <p className="opacity-70">No hay citas agendadas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left opacity-70">
              <tr>
                <th className="py-1">Fecha</th>
                <th>Paciente</th>
                <th>Especialidad</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {citas.map((c) => (
                <tr key={c.id} className="border-t border-black/10 dark:border-white/15">
                  <td className="py-2">{formatoFecha.format(c.inicio)}</td>
                  <td>
                    <Link href={`/pacientes/${c.paciente_id}`} className="hover:underline">
                      {c.nombre} {c.apellidos}
                    </Link>
                  </td>
                  <td>{c.especialidad}</td>
                  <td>{c.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Agendar cita</h2>
        {pacientes.length === 0 ? (
          <p className="opacity-70">
            Primero <Link href="/pacientes" className="underline">sincroniza los pacientes</Link> desde
            el sistema legado.
          </p>
        ) : (
          <form action={crearCita} className="grid max-w-md gap-3">
            <select name="pacienteId" required className="rounded border px-2 py-1">
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellidos}, {p.nombre} ({p.rut})
                </option>
              ))}
            </select>
            <input type="datetime-local" name="inicio" required className="rounded border px-2 py-1" />
            <input name="especialidad" placeholder="Especialidad" required className="rounded border px-2 py-1" />
            <input name="motivo" placeholder="Motivo (opcional)" className="rounded border px-2 py-1" />
            <button className="rounded bg-foreground px-3 py-1.5 text-background">Agendar</button>
          </form>
        )}
      </section>
    </div>
  );
}
