// app/login/layout.tsx
// Layout separado — a página de login não usa o AppShell
// (sem sidebar, sem header, sem breadcrumbs)

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
