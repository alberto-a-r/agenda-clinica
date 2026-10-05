import { connection } from "next/server";
import { FormularioBusqueda } from "./formulario";
import { listarPacientes } from "@/lib/db";

export default async function BuscarPage() {
  await connection();
  const pacientes = await listarPacientes();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Buscar en historiales</h1>
        <p className="text-sm opacity-70">
          Búsqueda semántica: encuentra registros por significado, no solo por palabras exactas
          (por ejemplo, &quot;anemia&quot; encuentra &quot;HB 11.2 BAJO&quot;).
        </p>
      </div>
      <FormularioBusqueda
        pacientes={pacientes.map((p) => ({ id: p.id, nombre: `${p.apellidos}, ${p.nombre}` }))}
      />
    </div>
  );
}
