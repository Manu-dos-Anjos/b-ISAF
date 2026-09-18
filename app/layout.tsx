import "./globals.css";
import Providers from "./providers";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "b-ISAF",
  description: "Instituto Superior de Administração e Finanças — Angola",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "b-ISAF",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#13152A" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <html lang="pt" className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/*
          Aplica o tema certo antes da primeira pintura,
          evitando flash de tema claro/escuro incorreto.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var stored = localStorage.getItem('theme');
                  var theme =
                    stored === 'light' || stored === 'dark'
                      ? stored
                      : window.matchMedia('(prefers-color-scheme: dark)').matches
                        ? 'dark'
                        : 'light';

                  document.documentElement.classList.toggle('dark', theme === 'dark');
                  document.documentElement.style.colorScheme = theme;
                } catch (error) {}
              })();
            `,
          }}
        />

        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>

      <body className="overflow-x-hidden bg-slate-50 text-slate-900 antialiased transition-colors duration-300 dark:bg-[#050816] dark:text-slate-100">
        <Providers>{children}</Providers>

        {isProduction && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker
                      .register('/sw.js')
                      .then((registration) => {
                        console.log('Service Worker registado:', registration.scope);
                      })
                      .catch((error) => {
                        console.error('Erro ao registar Service Worker:', error);
                      });
                  });
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}