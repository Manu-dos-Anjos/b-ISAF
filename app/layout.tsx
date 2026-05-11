// app/layout.tsx
import "./globals.css";
import Providers from "./providers";
import AppShell from "@/app/components/AppShell";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="dark scroll-smooth" suppressHydrationWarning>
      <body className="overflow-x-hidden" suppressHydrationWarning>
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}