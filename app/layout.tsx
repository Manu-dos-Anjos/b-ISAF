import "./globals.css";
import Providers from "./providers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "b-ISAF - Plataforma de E-Learning",
  description: "Instituto Superior de Administração e Finanças — Angola",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "b-ISAF",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="dark scroll-smooth">
      <head>
        <meta name="theme-color" content="#13152A" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable"            content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style"   content="black-translucent" />
        <meta name="apple-mobile-web-app-title"              content="b-ISAF" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>

      <body className="overflow-x-hidden bg-[#050816]">
        <Providers>{children}</Providers>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker
                    .register('/sw.js')
                    .then(r  => console.log('SW registado:', r.scope))
                    .catch(e => console.error('SW erro:', e));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}