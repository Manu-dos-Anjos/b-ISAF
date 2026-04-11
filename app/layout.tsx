// app/layout.tsx

import type { Metadata } from "next";
import Providers from "@/app/providers";
import AppShell from "@/app/components/AppShell";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Biblioteca Virtual - ISAF",
  description: "Biblioteca Virtual ISAF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" suppressHydrationWarning className="scroll-smooth">
      <body
        suppressHydrationWarning
        // <<< ALTERAÇÃO: Cores restauradas conforme o seu pedido
        className="overflow-x-hidden bg-slate-950 text-white antialiased"
      >
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}