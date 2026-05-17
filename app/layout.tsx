// app/layout.tsx
// Layout raiz — só providers globais, SEM AppShell.
// O AppShell vive no grupo (app)/layout.tsx para não afectar o login.

import "./globals.css";
import Providers from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="dark scroll-smooth" suppressHydrationWarning>
      <body className="overflow-x-hidden" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
