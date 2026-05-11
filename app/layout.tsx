// app/layout.tsx
import "./globals.css";
import { cookies } from "next/headers";
import Providers from "./providers";
import AppShell from "@/app/components/AppShell";



export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const pinnedCookie = (await cookieStore).get("sidebarPinned"); // "1" | "0" | undefined

  const hasPinnedCookie = !!pinnedCookie;
  const initialPinned = pinnedCookie ? pinnedCookie.value === "1" : true; // default true

  return (
    <html lang="pt" className="dark scroll-smooth" suppressHydrationWarning>
      <body className="overflow-x-hidden" suppressHydrationWarning>
        <Providers>
          <AppShell initialPinned={initialPinned} hasPinnedCookie={hasPinnedCookie}>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}