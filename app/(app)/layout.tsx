// app/(app)/layout.tsx
// Layout do grupo de páginas autenticadas.
// Todas as páginas aqui dentro têm sidebar + header + breadcrumbs.

import AppShell from "@/app/components/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
