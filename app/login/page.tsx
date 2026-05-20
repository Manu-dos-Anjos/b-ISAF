// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

const STATS = [
  { icon: Users,         value: "3 000+", label: "Estudantes activos"    },
  { icon: BookOpen,      value: "38",     label: "Disciplinas"            },
  { icon: GraduationCap, value: "3",      label: "Cursos de licenciatura" },
  { icon: Award,         value: "10+",    label: "Anos de experiência"    },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase } = useSupabase();

  const [mode,     setMode]     = useState<Mode>("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<string | null>(null);

  function friendlyError(msg: string): string {
    if (msg.includes("Invalid login credentials"))
      return "Email ou password incorrectos. Verifica e tenta novamente.";
    if (msg.includes("Email not confirmed"))
      return "O teu email ainda não foi confirmado. Verifica a caixa de entrada.";
    if (msg.includes("Too many requests"))
      return "Demasiadas tentativas. Aguarda alguns minutos.";
    if (msg.includes("Failed to fetch"))
      return "Sem ligação ao servidor. Verifica a tua rede e tenta novamente.";
    return `Erro: ${msg}`;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Redireciona para a rota original ou para a home
      const next = searchParams.get("next") ?? "/";
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(friendlyError(msg));
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-950 lg:flex-row">

      {/* ══════════════════════════════════════════════════════
          FUNDO — visível em mobile (topo) e desktop (coluna esquerda)
      ══════════════════════════════════════════════════════ */}

      {/* Mobile: banner de topo com imagem */}
      <div className="relative h-56 w-full overflow-hidden sm:h-64 lg:hidden">
        <Image
          src="/images/login-bg.jpg"
          alt="ISAF campus"
          fill
          priority
          className="object-cover object-center"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-slate-950/70 to-slate-950" />

        {/* Padrão de pontos */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Logo + título centrado sobre a imagem */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
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
            <p className="mt-1 text-sm text-blue-300/80">Biblioteca Virtual · ISAF</p>
          </div>

          {/* Badge */}
          <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-blue-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
            Plataforma académica digital
          </div>
        </div>
      </div>

      {/* Desktop: coluna esquerda (50%) */}
      <div className="relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col">
        <Image
          src="/images/login-bg.jpg"
          alt="ISAF campus"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/90 via-slate-950/80 to-slate-950/95" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
          {/* Logo topo */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
              <Image src="/logo_dark.svg" alt="b-ISAF" width={28} height={28} className="h-7 w-7" />
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
                Biblioteca Virtual - ISAF
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

          {/* Rodapé coluna esquerda */}
          <div className="flex items-center justify-between border-t border-white/10 pt-6">
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} Manuel dos Anjos Quiconda João · ISAF · Angola</p>
            <div className="flex gap-4 text-xs text-slate-600">
              <span className="cursor-default transition hover:text-slate-400">Privacidade</span>
              <span className="cursor-default transition hover:text-slate-400">Termos</span>
              <span className="cursor-default transition hover:text-slate-400">Suporte</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          COLUNA DIREITA — formulário
      ══════════════════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col items-center justify-start px-4 pb-12 pt-8 sm:justify-center sm:py-12 lg:justify-center lg:px-8 xl:px-16">

        {/* Stats mobile — abaixo da imagem, acima do formulário */}
        <div className="mb-6 grid w-full max-w-md grid-cols-2 gap-2 lg:hidden">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
                <Icon size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-none">{value}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Formulário */}
        <div className="w-full max-w-md">

          {/* Título */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {mode === "login" ? "Bem-vindo!" : "Recuperar password"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {mode === "login"
                ? "Introduz as tuas credenciais para aceder à plataforma."
                : "Indica o teu email institucional para receberes o link de recuperação."}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-7">

            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {success}
              </div>
            )}

            <form onSubmit={mode === "login" ? handleLogin : handleReset} className="space-y-5">

              {/* Email */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email institucional
                </label>
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="xxxxxx@isaf.co.ao"
                    required
                    autoComplete="email"
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Password */}
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
                    <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
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

              {/* Botão */}
              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /><span>A processar…</span></>
                ) : mode === "login" ? (
                  "Entrar na plataforma"
                ) : (
                  "Enviar email de recuperação"
                )}
              </button>
            </form>
          </div>

          {/* Voltar ao login */}
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

          {/* Rodapé */}
          <p className="mt-8 text-center text-xs text-slate-600">
            Instituto Superior de Administração e Finanças · Angola
          </p>
        </div>
      </div>
    </div>
  );
}