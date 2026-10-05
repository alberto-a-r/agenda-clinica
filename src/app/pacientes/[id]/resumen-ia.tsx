"use client";

import { useActionState } from "react";
import { generarResumen } from "../../actions";

export function ResumenIA({ pacienteId }: { pacienteId: number }) {
  const [resultado, accion, pendiente] = useActionState(generarResumen, null);

  return (
    <section className="rounded border border-black/10 p-4 dark:border-white/15">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Resumen para la consulta</h2>
        <form action={accion}>
          <input type="hidden" name="pacienteId" value={pacienteId} />
          <button
            disabled={pendiente}
            className="rounded bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
          >
            {pendiente ? "Generando…" : "Generar con IA"}
          </button>
        </form>
      </div>
      {resultado?.ok && <p className="mt-3 whitespace-pre-wrap text-sm">{resultado.texto}</p>}
      {resultado && !resultado.ok && <p className="mt-3 text-sm text-red-600">{resultado.error}</p>}
      <p className="mt-3 text-xs opacity-60">
        Generado por IA a partir del historial. Debe ser revisado por el profesional tratante.
      </p>
    </section>
  );
}
