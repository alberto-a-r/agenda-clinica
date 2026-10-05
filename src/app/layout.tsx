import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agenda Clínica",
  description: "Demo: agenda de pacientes integrada con un sistema legado y resumen con IA",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-black/10 dark:border-white/15">
          <nav className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
            <span className="font-semibold">Agenda Clínica</span>
            <Link href="/" className="hover:underline">Citas</Link>
            <Link href="/pacientes" className="hover:underline">Pacientes</Link>
            <span className="ml-auto text-xs opacity-60">Datos ficticios</span>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
