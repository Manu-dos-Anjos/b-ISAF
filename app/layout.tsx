import "./globals.css";
import Providers from "./providers";
import type { Metadata } from "next";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/* Aplica o tema certo antes da primeira pintura, para não haver
            flash de escuro/claro errado ao carregar ou atualizar a página. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var stored = localStorage.getItem('theme');
                  var theme = stored === 'light' || stored === 'dark'
                    ? stored
                    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.classList.toggle('dark', theme === 'dark');
                  document.documentElement.style.colorScheme = theme;
                } catch (e) {}
              })();
            `,
          }}
        />
       <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f8fafc" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#13152A" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable"            content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style"   content="black-translucent" />
        <meta name="apple-mobile-web-app-title"              content="b-ISAF" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      
      <body className="overflow-x-hidden bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-[#050816] dark:text-slate-100">
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