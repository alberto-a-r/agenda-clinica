# Agenda Clínica

Demo de un sistema nuevo de agenda de pacientes que **convive con un sistema legado**, con un resumen
clínico generado por IA antes de cada consulta y búsqueda semántica (RAG) sobre los historiales.

> **Todos los datos son ficticios.** Ningún dato corresponde a pacientes reales.

## Qué muestra

| Problema real | Cómo lo resuelve el proyecto |
|---|---|
| Un sistema antiguo que no se puede reemplazar de golpe | El legado sigue siendo la fuente de pacientes e historial; el sistema nuevo solo maneja citas |
| Formatos incompatibles entre sistemas | Un adaptador (`src/lib/legacy.ts`) traduce RUT, nombres, fechas y previsión al modelo nuevo |
| Re-sincronizar sin duplicar | Upsert por `legacy_id` dentro de una transacción |
| Médicos sin tiempo para leer historiales largos | Resumen con IA (Claude) del historial + citas, con aviso de que debe ser revisado por el profesional |
| Encontrar información en historiales escritos con abreviaturas | Búsqueda semántica con embeddings + pgvector, y respuesta de Claude citando cada fragmento (RAG) |

## Arquitectura

```
┌──────────────────────┐   HTTP (formato antiguo)   ┌───────────────────────┐
│ Sistema legado       │ ─────────────────────────▶ │ src/lib/legacy.ts     │
│ legacy-mock/         │   pacientes + historial    │ (adaptador/traductor) │
└──────────────────────┘                            └──────────┬────────────┘
                                                               │ modelo normalizado
┌──────────────────────┐   Server Actions           ┌──────────▼────────────┐
│ Next.js (App Router) │ ◀────────────────────────▶ │ PostgreSQL + pgvector │
│ src/app/             │                            │ pacientes, citas,     │
│                      │                            │ historial_fragmentos  │
└──────────┬───────────┘                            └───────────────────────┘
           │ historial + citas
┌──────────▼───────────┐
│ src/lib/resumen.ts   │ ── Claude API ──▶ resumen para la consulta
│ src/lib/busqueda.ts  │ ── pgvector + Claude API ──▶ respuesta citada
└──────────────────────┘
```

### Cómo funciona la búsqueda (RAG)

1. **Indexación** (al sincronizar): cada registro del historial legado se convierte en un vector con
   `multilingual-e5-small`, un modelo de embeddings que corre **localmente** (el historial no sale del
   servidor para indexarse). Solo se indexan registros nuevos.
2. **Recuperación**: la pregunta se convierte en vector y PostgreSQL devuelve los 5 fragmentos más
   parecidos por similitud coseno (índice HNSW de pgvector), opcionalmente filtrando por paciente.
3. **Generación**: Claude responde usando solo esos fragmentos y cita cada afirmación con `[n]`.
   Si no hay API key, la página muestra igual los fragmentos encontrados.

- **`src/app/`**: páginas como Server Components (leen la base directo) y Server Actions para mutar
  (`sincronizarPacientes`, `crearCita`, `generarResumen`, `buscar`). Solo los formularios con estado
  (resumen y búsqueda) son Client Components.
- **`src/lib/legacy.ts`**: único lugar que conoce el formato antiguo. Si el legado cambia, se toca solo esto.
- **`src/lib/db.ts`**: acceso a PostgreSQL con SQL explícito (`pg`), sin ORM.
- **`db/init/`**: esquema SQL que Docker ejecuta al crear la base.

## Decisiones

- **SQL directo en vez de ORM**: el esquema es chico y así las consultas quedan visibles y revisables.
- **El legado no se escribe**: el sistema nuevo solo lee de él. Reduce el riesgo durante la migración.
- **IA con esfuerzo bajo** (`effort: "low"`): un resumen corto no necesita razonamiento profundo.
  Usa respaldo automático (`fallbacks: "default"`) si el modelo declina por política.
- **Embeddings locales en vez de una API**: no requiere otra API key y no envía datos clínicos a un
  tercero para indexar. A cambio, la primera ejecución descarga el modelo (~120 MB, versión cuantizada).
- **Un fragmento por registro**: los registros del legado son cortos, así que no hace falta dividirlos.
- **Texto en minúsculas antes de vectorizar**: el legado escribe en mayúsculas y eso empeoraba la
  recuperación. Medido con `npm run eval:busqueda` ("anemia" pasó de la posición 3 a la 1; hoy 4/4
  casos quedan en el top 5). Cualquier cambio de modelo o normalización se compara con ese script.
- **Fechas `DATE` como texto**: evita que la fecha de nacimiento cambie de día por zona horaria.

## Cómo correrlo

Requisitos: Node 20+, Docker.

```bash
cp .env.example .env.local   # y completa ANTHROPIC_API_KEY
npm install
npm run db                   # PostgreSQL + pgvector en el puerto 5433
npm run legacy               # sistema legado simulado en el puerto 4001 (otra terminal)
npm run dev                  # http://localhost:3000 (otra terminal)
```

Luego, en `/pacientes`, presiona **Sincronizar desde sistema legado** (la primera vez tarda más porque
descarga el modelo de embeddings). Después prueba `/buscar` con, por ejemplo, "¿quién ha tenido anemia?".

Si ya tenías la base creada antes de la búsqueda, aplica la migración una vez:

```bash
docker compose exec -T db psql -U agenda < db/init/02_busqueda.sql
```

Sin `ANTHROPIC_API_KEY` todo funciona excepto el resumen, que muestra un aviso.

## Flujo de trabajo (Git Flow)

- `main`: solo versiones estables, etiquetadas (`v0.1.0`, ...).
- `develop`: integración.
- `feature/<nombre>`: una rama por funcionalidad, con PR hacia `develop`.
- `release/<versión>` y `hotfix/<nombre>` según Git Flow.

## Privacidad

En un sistema real con datos clínicos (Ley 19.628 y Ley 20.584 en Chile):
- Cada Server Action debe verificar sesión y permisos (este demo **no tiene autenticación**).
- Enviar datos clínicos a un proveedor de IA requiere base legal y acuerdos de tratamiento de datos;
  idealmente anonimizar antes de enviar.
- Registrar quién accede a cada ficha (auditoría).

## Pendiente

- Autenticación y roles (médico, administrativo).
- Interpretar la hora de las citas siempre en `America/Santiago` (hoy usa la zona del servidor).
- Tests del adaptador legado (casos de RUT y fechas mal formadas).
- Estados de cita editables y confirmación por el paciente.
