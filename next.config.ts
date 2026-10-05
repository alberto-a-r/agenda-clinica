import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fija la raíz del proyecto: evita que Turbopack tome un lockfile de una carpeta superior
  turbopack: { root: process.cwd() },
};

export default nextConfig;
