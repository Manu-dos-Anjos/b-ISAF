// app/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Eye, EyeOff, Loader2, AlertCircle,
  Mail, Lock, User, GraduationCap,
  ChevronRight, ChevronLeft, Check,
} from "lucide-react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

/* ================================================================
   DADOS DOS CURSOS
   ================================================================ */

const COURSES = [
  { id: "igf-uuid",  name: "Informática de Gestão Financeira", code: "IGF" },
  { id: "cf-uuid",   name: "Contabilidade e Finanças",         code: "CF"  },
  { id: "gbs-uuid",  name: "Gestão Bancária & Seguros",        code: "GBS" },
] as const;

// Estes IDs serão os UUIDs reais da tabela courses
// Fase 3: buscar do Supabase dinamicamente

const YEARS    = [1, 2, 3, 4] as const;
const SEMESTERS = [1, 2] as const;

/* ================================================================
   TIPOS
   ================================================================ */

type Step = 1 | 2 | 3;

type FormData = {
  // Step 1 — Credenciais
  email:           string;
  password:        string;
  confirmPassword: string;
  // Step 2 — Dados pessoais
  fullName:        string;
  studentNumber:   string;
  // Step 3 — Dados académicos
  courseId:        string;
  currentYear:     number;
  currentSemester: number;
};

const INITIAL: FormData = {
  email:           "",
  password:        "",
  confirmPassword: "",
  fullName:        "",
  studentNumber:   "",
  courseId:        "",
  currentYear:     1,
  currentSemester: 1,
};

/* ================================================================
   HELPERS
   ================================================================ */

function friendlyError(msg: string): string {
  if (msg.includes("User already registered"))
    return "Já existe uma conta com este email.";
  if (msg.includes("Password should be"))
    return "A password deve ter pelo menos 6 caracteres.";
  if (msg.includes("Invalid email"))
    return "Email inválido.";
  if (msg.includes("Failed to fetch"))
    return "Sem ligação. Verifica a rede e tenta novamente.";
  return `Erro: ${msg}`;
}

/* ================================================================
   COMPONENTE
   ================================================================ */

export default function RegisterPage() {
  const router       = useRouter();
  const { supabase } = useSupabase();

  const [step,     setStep]     = useState<Step>(1);
  const [form,     setForm]     = useState<FormData>(INITIAL);
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const update = (field: keyof FormData, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  /* ── Validações por step ── */
  function validateStep(): string | null {
    if (step === 1) {
      if (!form.email.includes("@"))        return "Email inválido.";
      if (form.password.length < 6)         return "A password deve ter pelo menos 6 caracteres.";
      if (form.password !== form.confirmPassword) return "As passwords não coincidem.";
    }
    if (step === 2) {
      if (form.fullName.trim().length < 3)  return "O nome deve ter pelo menos 3 caracteres.";
      if (!form.studentNumber.trim())       return "O número de estudante é obrigatório.";
    }
    if (step === 3) {
      if (!form.courseId)                   return "Selecciona um curso.";
    }
    return null;
  }

  function nextStep() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => Math.min(s + 1, 3) as Step);
  }

  function prevStep() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1) as Step);
  }

  /* ── Submissão final ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateStep();
    if (err) { setError(err); return; }

    setLoading(true);
    setError(null);

    try {
      // 1. Criar utilizador no Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email:    form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
          },
        },
      });

      if (authErr) throw authErr;
      if (!authData.user) throw new Error("Utilizador não criado.");

      // 2. Actualizar o perfil com os dados académicos
      // (o trigger já criou o registo básico em profiles)
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name:        form.fullName,
          student_number:   form.studentNumber || null,
          course_id:        form.courseId      || null,
          current_year:     form.currentYear,
          current_semester: form.currentSemester,
        })
        .eq("id", authData.user.id);

      if (profileErr) throw profileErr;

      // 3. Redirecionar para a home (já autenticado)
      router.push("/");
      router.refresh();

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
  const stepLabels: Record<Step, string> = {
    1: "Credenciais",
    2: "Dados pessoais",
    3: "Dados académicos",
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            <Image src="/logo_dark.svg" alt="b-ISAF" width={36} height={36} className="h-9 w-9" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Criar conta</h1>
            <p className="mt-1 text-sm text-slate-400">b-ISAF · Plataforma académica</p>
          </div>
        </div>

        {/* Indicador de progresso */}
        <div className="mb-6 flex items-center gap-2">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                s < step  ? "bg-emerald-500 text-white" :
                s === step ? "bg-blue-600 text-white ring-2 ring-blue-500/30" :
                             "bg-white/10 text-slate-500"
              }`}>
                {s < step ? <Check size={14} /> : s}
              </div>
              <p className={`text-[10px] font-medium ${s === step ? "text-blue-400" : "text-slate-600"}`}>
                {stepLabels[s]}
              </p>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">

          {/* Erro */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}
            className="space-y-4">

            {/* ── STEP 1: Credenciais ── */}
            {step === 1 && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Email institucional
                  </label>
                  <div className="relative">
                    <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="000000@isaf.co.ao"
                      required
                      autoComplete="email"
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-11 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button type="button" onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Confirmar password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) => update("confirmPassword", e.target.value)}
                      placeholder="Repete a password"
                      required
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  {/* Indicador de força */}
                  {form.password && (
                    <div className="mt-2 flex gap-1">
                      {[1,2,3,4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                          form.password.length >= i * 3
                            ? i <= 1 ? "bg-rose-500"
                            : i <= 2 ? "bg-amber-500"
                            : i <= 3 ? "bg-blue-500"
                            : "bg-emerald-500"
                            : "bg-white/10"
                        }`} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── STEP 2: Dados pessoais ── */}
            {step === 2 && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Nome completo
                  </label>
                  <div className="relative">
                    <User size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      placeholder="O teu nome completo"
                      required
                      autoComplete="name"
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Número de estudante
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">#</span>
                    <input
                      type="text"
                      value={form.studentNumber}
                      onChange={(e) => update("studentNumber", e.target.value)}
                      placeholder="Ex: 250438"
                      required
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-600">
                    Encontras o teu número no cartão de estudante ou na secretaria.
                  </p>
                </div>
              </>
            )}

            {/* ── STEP 3: Dados académicos ── */}
            {step === 3 && (
              <>
                {/* Curso */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Curso
                  </label>
                  <div className="space-y-2">
                    {COURSES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => update("courseId", c.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                          form.courseId === c.id
                            ? "border-blue-500/50 bg-blue-500/10 ring-1 ring-blue-500/30"
                            : "border-white/10 bg-white/5 hover:bg-white/8"
                        }`}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                          form.courseId === c.id ? "bg-blue-600 text-white" : "bg-white/10 text-slate-400"
                        }`}>
                          {c.code}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium leading-snug ${form.courseId === c.id ? "text-white" : "text-slate-300"}`}>
                            {c.name}
                          </p>
                        </div>
                        {form.courseId === c.id && (
                          <Check size={16} className="ml-auto shrink-0 text-blue-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ano + Semestre */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Ano actual
                    </label>
                    <div className="flex gap-1.5">
                      {YEARS.map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => update("currentYear", y)}
                          className={`flex h-11 flex-1 items-center justify-center rounded-xl border text-sm font-semibold transition-all ${
                            form.currentYear === y
                              ? "border-blue-500/50 bg-blue-600 text-white"
                              : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/8"
                          }`}
                        >
                          {y}º
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Semestre actual
                    </label>
                    <div className="flex gap-1.5">
                      {SEMESTERS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => update("currentSemester", s)}
                          className={`flex h-11 flex-1 items-center justify-center rounded-xl border text-sm font-semibold transition-all ${
                            form.currentSemester === s
                              ? "border-blue-500/50 bg-blue-600 text-white"
                              : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/8"
                          }`}
                        >
                          {s}º
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Aviso semestre */}
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/15 bg-amber-500/8 px-3 py-2.5 text-[11px] text-amber-400">
                  <GraduationCap size={13} className="mt-0.5 shrink-0" />
                  <span>
                    Podes actualizar o teu ano e semestre a qualquer momento no perfil.
                    A plataforma avisa-te quando se aproxima o início do novo semestre.
                  </span>
                </div>
              </>
            )}

            {/* ── Botões de navegação ── */}
            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-300 transition hover:bg-white/10"
                >
                  <ChevronLeft size={16} />
                  Voltar
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 size={15} className="animate-spin" />A criar conta…</>
                ) : step < 3 ? (
                  <><span>Continuar</span><ChevronRight size={16} /></>
                ) : (
                  <><Check size={16} /><span>Criar conta</span></>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Link para login */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Já tens conta?{" "}
          <a href="/login" className="font-medium text-blue-400 transition hover:text-blue-300">
            Entrar
          </a>
        </p>
      </div>
    </div>
  );
}