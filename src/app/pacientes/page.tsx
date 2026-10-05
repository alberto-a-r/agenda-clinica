import Link from "next/link";
import { connection } from "next/server";
import { sincronizarPacientes } from "../actions";
import { listarPacientes } from "@/lib/db";

export default async function PacientesPage() {
  await connection();
  const pacientes = await listarPacientes();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pacientes</h1>
        <form action={sincronizarPacientes}>
          <button className="rounded bg-foreground px-3 py-1.5 text-sm text-background">
            Sincronizar desde sistema legado
          </button>
        </form>
      </div>

      {pacientes.length === 0 ? (
        <p className="opacity-70">Aún no hay pacientes. Sincroniza para importarlos.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left opacity-70">
            <tr>
              <th className="py-1">Nombre</th>
              <th>RUT</th>
              <th>Previsión</th>
              <th>Código legado</th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map((p) => (
              <tr key={p.id} className="border-t border-black/10 dark:border-white/15">
                <td className="py-2">
                  <Link href={`/pacientes/${p.id}`} className="hover:underline">
                    {p.apellidos}, {p.nombre}
                  </Link>
                </td>
                <td>{p.rut}</td>
                <td>{p.prevision}</td>
                <td className="font-mono text-xs">{p.legacy_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
