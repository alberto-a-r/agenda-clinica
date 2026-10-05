import "server-only";
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// Modelo multilingüe que corre localmente: no envía el historial a un servicio externo
// para indexarlo. La primera vez descarga ~120 MB y queda en caché.
const MODELO = "Xenova/multilingual-e5-small";
export const DIMENSIONES = 384;

const globalForEmb = globalThis as unknown as { extractor?: Promise<FeatureExtractionPipeline> };

function extractor(): Promise<FeatureExtractionPipeline> {
  globalForEmb.extractor ??= pipeline("feature-extraction", MODELO, { dtype: "q8" });
  return globalForEmb.extractor;
}

async function embed(textos: string[]): Promise<number[][]> {
  if (textos.length === 0) return [];
  const salida = await (await extractor())(textos, { pooling: "mean", normalize: true });
  return salida.tolist() as number[][];
}

// El legado escribe todo en mayúsculas; en minúsculas el modelo recupera mejor
// (ver scripts/eval-busqueda.mjs).
const normalizar = (texto: string) => texto.toLowerCase();

// e5 espera prefijos distintos para documentos y consultas
export const embedFragmentos = (textos: string[]) =>
  embed(textos.map((t) => `passage: ${normalizar(t)}`));
export const embedConsulta = async (texto: string) =>
  (await embed([`query: ${normalizar(texto)}`]))[0];

/** Formato literal de pgvector: "[0.1,0.2,...]" */
export const aVectorSql = (v: number[]) => `[${v.join(",")}]`;
