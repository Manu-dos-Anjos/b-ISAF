// app/layout.tsx
// Layout raiz — só providers globais, SEM AppShell.
// O AppShell vive no grupo (app)/layout.tsx para não afectar o login.

import "./globals.css";
import Providers from "./providers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "b-ISAF — Plataforma de E-Learning",
  description: "Instituto Superior de Administração e Finanças — Angola",
  manifest: "/manifest.json",
  themeColor: "#4338ca",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "b-ISAF",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="dark scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4338ca" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="b-ISAF" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

        {/* Registar Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then(
                    (registration) => console.log('SW registado:', registration.scope),
                    (error) => console.log('SW falhou:', error)
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body className="overflow-x-hidden" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}