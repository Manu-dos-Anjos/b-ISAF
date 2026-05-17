// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  GraduationCap,
  BookOpen,
  Users,
  Award,
} from "lucide-react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

type Mode = "login" | "reset";

/* ── Estatísticas decorativas ── */
const STATS = [
  { icon: Users,          value: "4 200+", label: "Estudantes activos"   },
  { icon: BookOpen,       value: "38",     label: "Disciplinas"           },
  { icon: GraduationCap,  value: "3",      label: "Cursos de licenciatura"},
  { icon: Award,          value: "15+",    label: "Anos de experiência"   },
];

export default function LoginPage() {
  const router = useRouter();
  const { supabase } = useSupabase();

  const [mode,     setMode]     = useState<Mode>("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<string | null>(null);

  /* ── Mensagens de erro legíveis ── */
  function friendlyError(msg: string): string {
    if (msg.includes("Invalid login credentials"))
      return "Email ou password incorrectos. Verifica e tenta novamente.";
    if (msg.includes("Email not confirmed"))
      return "O teu email ainda não foi confirmado. Verifica a caixa de entrada.";
    if (msg.includes("Too many requests"))
      return "Demasiadas tentativas. Aguarda alguns minutos.";
    if (msg.includes("User not found"))
      return "Não existe nenhuma conta com este email.";
    return "Ocorreu um erro. Tenta novamente.";
  }

  /* ── Login ── */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(friendlyError(msg));
    } finally {
      setLoading(false);
    }
  }

  /* ── Recuperar password ── */
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login/nova-password`,
      });
      if (error) throw error;
      setSuccess("Email enviado! Verifica a tua caixa de entrada.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(friendlyError(msg));
    } finally {
      setLoading(false);
    }
  }

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="flex min-h-screen bg-slate-950">

      {/* ══════════════════════════════════════════════════════
          COLUNA ESQUERDA — imagem + branding (só desktop)
      ══════════════════════════════════════════════════════ */}
      <div className="relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col">

        {/* Imagem de fundo */}
        <Image
          src="/images/login-bg.jpg"
          alt="ISAF campus"
          fill
          priority
          className="object-cover"
        />

        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/90 via-slate-950/80 to-slate-950/95" />

        {/* Padrão de pontos decorativo */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Conteúdo sobre a imagem */}
        <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">

          {/* Logo topo */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
              <Image
                src="/logo_dark.svg"
                alt="b-ISAF"
                width={28}
                height={28}
                className="h-7 w-7"
              />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-white">b-ISAF</p>
              <p className="text-[11px] text-blue-300/80">Plataforma académica</p>
            </div>
          </div>

          {/* Texto central */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-blue-300 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                Plataforma de e-learning
              </div>
              <h2 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
                O teu percurso
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  académico digital
                </span>
              </h2>
              <p className="max-w-sm text-base leading-relaxed text-slate-300/80">
                Acede às tuas disciplinas, horários, avaliações e materiais de
                estudo num único lugar.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {STATS.map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/15 text-blue-300">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-white leading-none">{value}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rodapé da coluna esquerda */}
          <div className="flex items-center justify-between border-t border-white/10 pt-6">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} ISAF · Angola
            </p>
            <div className="flex gap-4 text-xs text-slate-600">
              <span className="cursor-default hover:text-slate-400 transition">Privacidade</span>
              <span className="cursor-default hover:text-slate-400 transition">Termos</span>
              <span className="cursor-default hover:text-slate-400 transition">Suporte</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          COLUNA DIREITA — formulário
      ══════════════════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 lg:px-8 xl:px-16">

        {/* Logo mobile (só aparece em ecrãs pequenos) */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            <Image
              src="/logo_dark.svg"
              alt="b-ISAF"
              width={36}
              height={36}
              className="h-9 w-9"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">b-ISAF</h1>
            <p className="mt-1 text-sm text-slate-400">Plataforma académica do ISAF</p>
          </div>
        </div>

        {/* Caixa do formulário */}
        <div className="w-full max-w-md">

          {/* Título do formulário */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {mode === "login" ? "Bem-vindo de volta" : "Recuperar password"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {mode === "login"
                ? "Introduz as tuas credenciais para aceder à plataforma."
                : "Indica o teu email institucional para receberes o link de recuperação."}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-7 shadow-2xl shadow-black/40 backdrop-blur-sm">

            {/* Alerta de erro */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Sucesso (reset) */}
            {success && (
              <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {success}
              </div>
            )}

            <form
              onSubmit={mode === "login" ? handleLogin : handleReset}
              className="space-y-5"
            >

              {/* Email */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email institucional
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="250438@isaf.co.ao"
                    required
                    autoComplete="email"
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Password — só no modo login */}
              {mode === "login" && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { setMode("reset"); setError(null); setSuccess(null); }}
                      className="text-[11px] text-slate-500 transition hover:text-blue-400"
                    >
                      Esqueceste a password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-11 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                      aria-label={showPass ? "Ocultar password" : "Mostrar password"}
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Botão principal */}
              <button
                type="submit"
                disabled={loading}
                className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>A processar…</span>
                  </>
                ) : mode === "login" ? (
                  "Entrar na plataforma"
                ) : (
                  "Enviar email de recuperação"
                )}
              </button>
            </form>
          </div>

          {/* Link voltar ao login (modo reset) */}
          {mode === "reset" && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
                className="text-sm text-slate-500 transition hover:text-slate-300"
              >
                ← Voltar ao login
              </button>
            </div>
          )}

          {/* Rodapé mobile */}
          <p className="mt-8 text-center text-xs text-slate-600 lg:hidden">
            Instituto Superior de Administração e Finanças · Angola
          </p>
        </div>
      </div>
    </div>
  );
}