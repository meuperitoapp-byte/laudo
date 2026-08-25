import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Só usada em título de página/seção (ver globals.css) — mais condensada,
// pra diferenciar hierarquia sem trocar de família tipográfica.
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  weight: ["600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Laudos Periciais",
  description: "Geração de laudos médico-periciais — uso interno, acesso restrito.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${interTight.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
