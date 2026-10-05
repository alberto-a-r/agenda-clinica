// Simula el sistema legado de la clínica: una API antigua con su propio formato.
// TODOS LOS DATOS SON FICTICIOS.
//
// Rarezas del formato que el sistema nuevo tiene que traducir:
//   - claves en mayúsculas con prefijos (COD_PAC, NOM_PAC...)
//   - RUT sin puntos ni guion ("12345678K")
//   - nombre como "APELLIDOS, NOMBRES" en mayúsculas
//   - fechas en DD/MM/YYYY
//   - previsión abreviada ("FON", "ISA", "PAR")
//   - historial como texto con fecha al inicio de cada línea

import http from "node:http";

const PORT = Number(process.env.LEGACY_PORT ?? 4001);

const PACIENTES = [
  { COD_PAC: "L-0001", RUT_PAC: "12345678K", NOM_PAC: "PEREZ SOTO, JUAN ANDRES", FEC_NAC: "03/05/1961", PREVISION: "FON" },
  { COD_PAC: "L-0002", RUT_PAC: "9876543-2", NOM_PAC: "MUNOZ ROJAS, MARIA JOSE", FEC_NAC: "21/11/1974", PREVISION: "ISA" },
  { COD_PAC: "L-0003", RUT_PAC: "15222333-4", NOM_PAC: "GONZALEZ DIAZ, CARLOS", FEC_NAC: "09/02/1958", PREVISION: "FON" },
  { COD_PAC: "L-0004", RUT_PAC: "200111225", NOM_PAC: "SILVA TAPIA, CAMILA", FEC_NAC: "30/07/1989", PREVISION: "PAR" },
];

const HISTORIAL = {
  "L-0001": [
    "12/01/2026 CONTROL ONCOLOGIA. PACIENTE REFIERE CANSANCIO LEVE. SE SOLICITA HEMOGRAMA.",
    "02/03/2026 RESULTADO HEMOGRAMA: HB 11.2 (BAJO). SE INDICA SUPLEMENTO DE FIERRO.",
    "15/06/2026 CONTROL. MEJORIA DEL CANSANCIO. HB 12.4. CONTINUA TRATAMIENTO.",
  ],
  "L-0002": [
    "05/04/2026 PRIMERA CONSULTA. ANTECEDENTE FAMILIAR DE CANCER DE MAMA. SE SOLICITA MAMOGRAFIA.",
    "20/04/2026 MAMOGRAFIA BIRADS 2. HALLAZGO BENIGNO. CONTROL ANUAL.",
  ],
  "L-0003": [
    "10/10/2025 CONTROL POST QUIMIOTERAPIA CICLO 4. NAUSEAS GRADO 1.",
    "14/11/2025 CICLO 5 SIN INCIDENTES.",
    "19/12/2025 CICLO 6 COMPLETADO. SE SOLICITA TAC DE CONTROL.",
    "30/01/2026 TAC SIN EVIDENCIA DE ENFERMEDAD ACTIVA. CONTROL CADA 3 MESES.",
  ],
  "L-0004": [],
};

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/api/pacientes") {
    return json(res, 200, { STATUS: "OK", PACIENTES });
  }

  const historial = url.pathname.match(/^\/api\/pacientes\/([^/]+)\/historial$/);
  if (req.method === "GET" && historial) {
    const cod = decodeURIComponent(historial[1]);
    if (!(cod in HISTORIAL)) return json(res, 404, { STATUS: "ERR", MSG: "PACIENTE NO EXISTE" });
    return json(res, 200, { STATUS: "OK", COD_PAC: cod, REGISTROS: HISTORIAL[cod] });
  }

  json(res, 404, { STATUS: "ERR", MSG: "RUTA NO EXISTE" });
});

server.listen(PORT, () => {
  console.log(`Sistema legado simulado en http://localhost:${PORT}`);
});
