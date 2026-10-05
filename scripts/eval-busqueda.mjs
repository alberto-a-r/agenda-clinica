// Evaluación mínima de la recuperación: para cada pregunta, en qué posición queda
// el registro que debería encontrar. Sirve para comparar cambios (modelo, normalización).
// Uso: npm run eval:busqueda

import { pipeline } from "@huggingface/transformers";

const REGISTROS = [
  "CONTROL ONCOLOGIA. PACIENTE REFIERE CANSANCIO LEVE. SE SOLICITA HEMOGRAMA.",
  "RESULTADO HEMOGRAMA: HB 11.2 (BAJO). SE INDICA SUPLEMENTO DE FIERRO.",
  "CONTROL. MEJORIA DEL CANSANCIO. HB 12.4. CONTINUA TRATAMIENTO.",
  "PRIMERA CONSULTA. ANTECEDENTE FAMILIAR DE CANCER DE MAMA. SE SOLICITA MAMOGRAFIA.",
  "MAMOGRAFIA BIRADS 2. HALLAZGO BENIGNO. CONTROL ANUAL.",
  "CONTROL POST QUIMIOTERAPIA CICLO 4. NAUSEAS GRADO 1.",
  "CICLO 5 SIN INCIDENTES.",
  "CICLO 6 COMPLETADO. SE SOLICITA TAC DE CONTROL.",
  "TAC SIN EVIDENCIA DE ENFERMEDAD ACTIVA. CONTROL CADA 3 MESES.",
];

// pregunta -> índice del registro esperado
const CASOS = {
  "¿Quién ha tenido anemia?": 1,
  "riesgo de cáncer de mama": 3,
  "pacientes en remisión": 8,
  "efectos adversos de la quimioterapia": 5,
};

const K = 5; // fragmentos que recibe el modelo de lenguaje

const extractor = await pipeline("feature-extraction", "Xenova/multilingual-e5-small", { dtype: "q8" });
const embed = async (textos) => (await extractor(textos, { pooling: "mean", normalize: true })).tolist();
const producto = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

const docs = await embed(REGISTROS.map((r) => `passage: ${r.toLowerCase()}`));
let enTopK = 0;
for (const [pregunta, esperado] of Object.entries(CASOS)) {
  const [q] = await embed([`query: ${pregunta.toLowerCase()}`]);
  const orden = docs
    .map((d, i) => [producto(q, d), i])
    .sort((a, b) => b[0] - a[0])
    .map(([, i]) => i);
  const posicion = orden.indexOf(esperado) + 1;
  if (posicion <= K) enTopK++;
  console.log(`${posicion <= K ? "OK " : "MAL"} posición ${posicion}  ${pregunta}`);
}
console.log(`\n${enTopK}/${Object.keys(CASOS).length} casos con el registro esperado en el top ${K}`);
