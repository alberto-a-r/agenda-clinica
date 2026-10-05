"use client";

import Link from "next/link";
import { useActionState } from "react";
import { buscar } from "../actions";

export function FormularioBusqueda({ pacientes }: { pacientes: { id: number; nombre: string }[] }) {
  const [resultado, accion, pendiente] = useActionState(buscar, null);

  return (
    <div className="space-y-6">
      <form action={accion} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          name="pregunta"
          required
          placeholder="¿Qué pacientes han tenido anemia?"
          className="rounded border px-2 py-1"
        />
        <select name="pacienteId" className="rounded border px-2 py-1">
          <option value="">Todos los pacientes</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <button
          disabled={pendiente}
          className="rounded bg-foreground px-3 py-1.5 text-background disabled:opacity-50"
        >
          {pendiente ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {resultado && !resultado.ok && <p className="text-sm text-red-600">{resultado.error}</p>}

      {resultado?.ok && (
        <>
          {resultado.aviso && <p className="text-sm opacity-70">{resultado.aviso}</p>}

          {resultado.respuesta && (
            <section className="rounded border border-black/10 p-4 dark:border-white/15">
              <h2 className="mb-2 font-semibold">Respuesta</h2>
              <p className="whitespace-pre-wrap text-sm">{resultado.respuesta}</p>
              <p className="mt-3 text-xs opacity-60">
                Generada por IA solo a partir de los fragmentos citados. Verificar en la ficha.
              </p>
            </section>
          )}

          {resultado.fuentes.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold">Fragmentos encontrados</h2>
              <ol className="space-y-2 text-sm">
                {resultado.fuentes.map((f, i) => (
                  <li key={f.id}>
                    <span className="font-mono">[{i + 1}]</span>{" "}
                    <Link href={`/pacientes/${f.paciente_id}`} className="underline">
                      {f.nombre} {f.apellidos}
                    </Link>{" "}
                    · <span className="font-mono">{f.fecha}</span> · {f.texto}{" "}
                    <span className="opacity-60">(similitud {f.similitud.toFixed(2)})</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  );
}
