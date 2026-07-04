// app/login/page.tsx
"use client";

import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  User,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  Check,
  Users,
  BookOpen,
  Award,
  ArrowRight,
} from "lucide-react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

/* ================================================================
   CONSTANTES
================================================================ */

const STATS = [
  { icon: Users, value: "2 000+", label: "Estudantes activos" },
  { icon: BookOpen, value: "38", label: "Disciplinas" },
  { icon: GraduationCap, value: "3", label: "Cursos de licenciatura" },
  { icon: Award, value: "8+", label: "Anos de experiência" },
];

const COURSES = [
  { id: "igf", name: "Informática de Gestão Financeira", code: "IGF" },
  { id: "cf", name: "Contabilidade e Finanças", code: "CF" },
  { id: "gbs", name: "Gestão Bancária & Seguros", code: "GBS" },
] as const;

type CourseId = (typeof COURSES)[number]["id"];

const COURSE_ID_MAP: Record<CourseId, string> = {
  igf: "60313e51-2b89-4c1d-9737-6606c9d5e999",
  cf: "4c41b444-b985-40e0-8449-bdf3156cf3ab",
  gbs: "724e59d4-8acb-4235-9698-18a325f4ffe5",
};

const YEARS = [1, 2, 3, 4] as const;
const SEMESTERS = [1, 2] as const;

const STEP_LABELS: Record<1 | 2 | 3, string> = {
  1: "Credenciais",
  2: "Dados pessoais",
  3: "Curso",
};

const ISAF_DOMAIN = "isaf.co.ao";

/* ================================================================
   TIPOS
================================================================ */

type Mode = "login" | "reset" | "register";
type RegStep = 1 | 2 | 3;

type RegForm = {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  courseKey: string;
  currentYear: number;
  currentSemester: number;
};

const REG_INIT: RegForm = {
  email: "",
  password: "",
  confirmPassword: "",
  fullName: "",
  courseKey: "",
  currentYear: 1,
  currentSemester: 1,
};

/* ================================================================
   HELPERS
================================================================ */

function extractStudentNumber(email: string): string {
  return email.trim().split("@")[0]?.trim() ?? "";
}

function studentNumberToEmail(studentNumber: string): string {
  const value = studentNumber.trim().replace(/\s+/g, "");
  if (!value) return "";
  if (value.includes("@")) return value.toLowerCase();
  return `${value.toLowerCase()}@${ISAF_DOMAIN}`;
}

function isIsafEmail(email: string): boolean {
  const [local, domain] = email.trim().toLowerCase().split("@");
  return Boolean(local) && domain === ISAF_DOMAIN;
}

function friendlyError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Email ou password incorrectos.";
  if (msg.includes("Email not confirmed")) return "Confirma o teu email antes de entrar.";
  if (msg.includes("User already registered")) return "Já existe uma conta com este email.";
  if (msg.includes("Password should")) return "A password não cumpre os requisitos de segurança.";
  if (msg.includes("Too many requests")) return "Demasiadas tentativas. Aguarda alguns minutos.";
  if (msg.includes("Failed to fetch")) return "Sem ligação. Verifica a rede e tenta novamente.";
  return `Erro: ${msg}`;
}

type PasswordRules = {
  length: boolean;
  lower: boolean;
  upper: boolean;
  number: boolean;
  symbol: boolean;
};

function validatePassword(pw: string): PasswordRules {
  return {
    length: pw.length >= 8,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(pw),
  };
}

function isPasswordValid(pw: string): boolean {
  const r = validatePassword(pw);
  return r.length && r.lower && r.upper && r.number && r.symbol;
}

const PASSWORD_REQS: { key: keyof PasswordRules; label: string }[] = [
  { key: "length", label: "Mínimo 8 caracteres" },
  { key: "lower", label: "Uma letra minúscula (a-z)" },
  { key: "upper", label: "Uma letra maiúscula (A-Z)" },
  { key: "number", label: "Um número (0-9)" },
  { key: "symbol", label: "Um símbolo (!@#$%...)" },
];

/* ================================================================
   CLASSES REUTILIZÁVEIS
================================================================ */

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60";

/* ================================================================
   SUB-COMPONENTES ESTÁTICOS
================================================================ */

function LeftPanel() {
  return (
    <div className="relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col">
      <Image
        src="/images/login-bg.jpg"
        alt="ISAF campus"
        sizes="(max-width: 1024px) 100vw, 50vw"
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

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-blue-300 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
              Biblioteca Virtual · ISAF
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
                  <p className="text-base font-bold leading-none text-white">{value}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-6">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Manuel dos Anjos Quiconda João · Angola
          </p>
          <div className="flex gap-4 text-xs text-slate-600">
            {["Privacidade", "Termos", "Suporte"].map((t) => (
              <span key={t} className="cursor-default transition hover:text-slate-400">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileBanner() {
  return (
    <div className="relative h-52 w-full overflow-hidden sm:h-60 lg:hidden">
      <Image
        src="/images/login-bg.jpg"
        alt="ISAF campus"
        fill
        priority
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-slate-950/70 to-slate-950" />
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
      </div>
    </div>
  );
}

function MobileStats() {
  return (
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
            <p className="text-sm font-bold leading-none text-white">{value}</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Feedback({
  error,
  success,
}: {
  error: string | null;
  success: string | null;
}) {
  if (!error && !success) return null;

  return (
    <div className="mb-4 space-y-2">
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </label>
  );
}

function PasswordChecklist({ password }: { password: string }) {
  if (!password) return null;

  const rules = validatePassword(password);

  return (
    <div className="mt-2.5 space-y-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
      {PASSWORD_REQS.map(({ key, label }) => {
        const ok = rules[key];
        return (
          <div key={key} className="flex items-center gap-2">
            <div
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all ${
                ok ? "bg-emerald-500/20" : "bg-white/5"
              }`}
            >
              <Check
                size={10}
                className={`transition-colors ${
                  ok ? "text-emerald-400" : "text-slate-600"
                }`}
              />
            </div>
            <span
              className={`text-[11px] transition-colors ${
                ok ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================
   COMPONENTE PRINCIPAL
================================================================ */

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase } = useSupabase();

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // LOGIN
  const [loginStudentNumber, setLoginStudentNumber] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  // RESET
  const [resetEmail, setResetEmail] = useState("");

  // REGISTO
  const [regStep, setRegStep] = useState<RegStep>(1);
  const [regForm, setRegForm] = useState<RegForm>(REG_INIT);
  const [showPass, setShowPass] = useState(false);

  const derivedStudentNumber = useMemo(
    () => extractStudentNumber(regForm.email),
    [regForm.email]
  );

  const clearFeedback = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const updateReg = useCallback(
    (field: keyof RegForm, value: string | number) =>
      setRegForm((prev) => ({ ...prev, [field]: value })),
    []
  );

  function switchMode(next: Mode) {
    clearFeedback();
    setMode(next);

    if (next === "register") {
      setRegStep(1);
      setRegForm(REG_INIT);
      setShowPass(false);
    }

    if (next === "login") {
      setSuccess(null);
      setError(null);
    }
  }

  /* ================================================================
     LOGIN
  ================================================================ */
  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const email = studentNumberToEmail(loginStudentNumber);

      if (!loginStudentNumber.trim()) {
        throw new Error("Indica o número de estudante.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (error) throw error;

      const next = searchParams.get("next") ?? "/";
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  /* ================================================================
     RESET PASSWORD
  ================================================================ */
  async function handleReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/login/nova-password`,
      });

      if (error) throw error;
      setSuccess("Email enviado! Verifica a tua caixa de entrada.");
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  /* ================================================================
     REGISTO — validação
  ================================================================ */
  function validateStep(): string | null {
    if (regStep === 1) {
      if (!isIsafEmail(regForm.email)) {
        return `O email institucional deve terminar em @${ISAF_DOMAIN}.`;
      }
      if (!isPasswordValid(regForm.password)) {
        return "A password não cumpre os requisitos de segurança.";
      }
      if (regForm.password !== regForm.confirmPassword) {
        return "As passwords não coincidem.";
      }
    }

    if (regStep === 2) {
      if (regForm.fullName.trim().length < 3) {
        return "O nome deve ter pelo menos 3 caracteres.";
      }
      if (!derivedStudentNumber.trim()) {
        return "Não foi possível extrair o número de estudante. Verifica o email.";
      }
    }

    if (regStep === 3) {
      if (!regForm.courseKey) return "Selecciona um curso.";
    }

    return null;
  }

  function nextStep() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    clearFeedback();
    setRegStep((s) => Math.min(s + 1, 3) as RegStep);
  }

  function prevStep() {
    clearFeedback();
    setRegStep((s) => Math.max(s - 1, 1) as RegStep);
  }

  /* ================================================================
     REGISTO — submissão
  ================================================================ */
  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }

    if (!isIsafEmail(regForm.email)) {
      setError(`O email institucional deve terminar em @${ISAF_DOMAIN}.`);
      return;
    }

    clearFeedback();
    setLoading(true);

    try {
      const courseId = COURSE_ID_MAP[regForm.courseKey as CourseId];
      if (!courseId) throw new Error("Curso inválido.");

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: regForm.email,
        password: regForm.password,
        options: {
          data: {
            full_name: regForm.fullName,
            student_number: derivedStudentNumber,
          },
        },
      });

      if (authErr) throw authErr;
      if (!authData.user) throw new Error("Utilizador não criado.");

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: regForm.fullName,
          student_number: derivedStudentNumber || null,
          course_id: courseId,
          current_year: regForm.currentYear,
          current_semester: regForm.currentSemester,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authData.user.id);

      if (profileErr) throw profileErr;

      if (authData.session) {
        router.push(searchParams.get("next") ?? "/");
        router.refresh();
      } else {
        setMode("login");
        setLoginStudentNumber(derivedStudentNumber);
        setLoginPassword("");
        setRegForm(REG_INIT);
        setSuccess("Conta criada! Verifica o teu email para confirmares e depois entra.");
      }
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  /* ================================================================
     RENDER — LOGIN / RESET
  ================================================================ */
  function renderLoginReset() {
    return (
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {mode === "reset" ? "Recuperar password" : "Bem-vindo!"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {mode === "reset"
              ? "Indica o teu email para receberes o link de recuperação."
              : "Introduz o teu número de estudante e a password para aceder à plataforma."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-7">
          <Feedback error={error} success={success} />

          <form onSubmit={mode === "reset" ? handleReset : handleLogin} className="space-y-5">
            {mode === "login" ? (
              <div>
                <FieldLabel>Número de estudante</FieldLabel>
                <div className="relative">
                  <User
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    value={loginStudentNumber}
                    onChange={(e) => setLoginStudentNumber(e.target.value)}
                    placeholder="000000"
                    required
                    inputMode="numeric"
                    autoComplete="username"
                    disabled={loading}
                    className={`${inputCls} h-12 pl-10 pr-4`}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  O sistema adiciona automaticamente{" "}
                  <span className="font-mono">@{ISAF_DOMAIN}</span>
                </p>
              </div>
            ) : (
              <div>
                <FieldLabel>Email institucional</FieldLabel>
                <div className="relative">
                  <Mail
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="000000@isaf.co.ao"
                    required
                    autoComplete="email"
                    disabled={loading}
                    className={`${inputCls} h-12 pl-10 pr-4`}
                  />
                </div>
              </div>
            )}

            {mode === "login" && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <FieldLabel>Password</FieldLabel>
                  <button
                    type="button"
                    onClick={() => switchMode("reset")}
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
                    type={showLoginPass ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    className={`${inputCls} h-12 pl-10 pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass((v) => !v)}
                    aria-label={showLoginPass ? "Ocultar password" : "Mostrar password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                  >
                    {showLoginPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>A processar…</span>
                </>
              ) : mode === "reset" ? (
                "Enviar email de recuperação"
              ) : (
                "Entrar na plataforma"
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] text-slate-600">ou</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={() => switchMode("register")}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            <User size={16} className="text-blue-400" />
            Criar conta
            <ArrowRight size={15} className="ml-auto text-slate-500" />
          </button>
        </div>

        {mode === "reset" && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="text-sm text-slate-500 transition hover:text-slate-300"
            >
              ← Voltar ao login
            </button>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-600">
          Instituto Superior de Administração e Finanças · Angola
        </p>
      </div>
    );
  }

  /* ================================================================
     RENDER — REGISTO
  ================================================================ */
  function renderRegister() {
    return (
      <div className="w-full max-w-md">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="mb-3 flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
          >
            <ChevronLeft size={14} />
            Voltar ao login
          </button>
          <h2 className="text-2xl font-bold tracking-tight text-white">Criar conta</h2>
          <p className="mt-1 text-sm text-slate-400">
            Preenche os teus dados para aceder à plataforma.
          </p>
        </div>

        <div className="mb-5 flex items-center gap-2">
          {([1, 2, 3] as RegStep[]).map((s) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  s < regStep
                    ? "bg-emerald-500 text-white"
                    : s === regStep
                    ? "bg-blue-600 text-white ring-2 ring-blue-500/30"
                    : "bg-white/10 text-slate-500"
                }`}
              >
                {s < regStep ? <Check size={13} /> : s}
              </div>
              <p
                className={`text-[10px] font-medium ${
                  s === regStep ? "text-blue-400" : "text-slate-600"
                }`}
              >
                {STEP_LABELS[s]}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-7">
          <Feedback error={error} success={success} />

          <form
            onSubmit={
              regStep < 3
                ? (e) => {
                    e.preventDefault();
                    nextStep();
                  }
                : handleRegister
            }
            className="space-y-4"
          >
            {regStep === 1 && (
              <>
                <div>
                  <FieldLabel>Email institucional</FieldLabel>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="email"
                      value={regForm.email}
                      onChange={(e) => updateReg("email", e.target.value)}
                      placeholder="000000@isaf.co.ao"
                      required
                      autoComplete="email"
                      disabled={loading}
                      className={`${inputCls} h-11 pl-10 pr-4`}
                    />
                  </div>

                  {regForm.email && !isIsafEmail(regForm.email) && (
                    <p className="mt-1.5 text-[11px] text-rose-400">
                      O email deve terminar em{" "}
                      <span className="font-mono">@{ISAF_DOMAIN}</span>
                    </p>
                  )}

                  {regForm.email && isIsafEmail(regForm.email) && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-400">
                      <Check size={11} />
                      Email institucional válido.
                    </p>
                  )}
                </div>

                <div>
                  <FieldLabel>Password</FieldLabel>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type={showPass ? "text" : "password"}
                      value={regForm.password}
                      onChange={(e) => updateReg("password", e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      disabled={loading}
                      className={`${inputCls} h-11 pl-10 pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      aria-label={showPass ? "Ocultar" : "Mostrar"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  <PasswordChecklist password={regForm.password} />
                </div>

                <div>
                  <FieldLabel>Confirmar password</FieldLabel>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type={showPass ? "text" : "password"}
                      value={regForm.confirmPassword}
                      onChange={(e) => updateReg("confirmPassword", e.target.value)}
                      placeholder="Repete a password"
                      required
                      disabled={loading}
                      className={`${inputCls} h-11 pl-10 pr-4`}
                    />
                  </div>

                  {regForm.confirmPassword &&
                    regForm.password !== regForm.confirmPassword && (
                      <p className="mt-1.5 text-[11px] text-rose-400">
                        As passwords não coincidem.
                      </p>
                    )}

                  {regForm.confirmPassword &&
                    regForm.password === regForm.confirmPassword &&
                    isPasswordValid(regForm.password) && (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-400">
                        <Check size={11} />
                        Passwords coincidem.
                      </p>
                    )}
                </div>
              </>
            )}

            {regStep === 2 && (
              <>
                <div>
                  <FieldLabel>Nome completo</FieldLabel>
                  <div className="relative">
                    <User
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      value={regForm.fullName}
                      onChange={(e) => updateReg("fullName", e.target.value)}
                      placeholder="O teu nome completo"
                      required
                      autoComplete="name"
                      disabled={loading}
                      className={`${inputCls} h-11 pl-10 pr-4`}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Número de estudante</FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      #
                    </span>
                    <input
                      type="text"
                      value={derivedStudentNumber}
                      readOnly
                      className="h-11 w-full cursor-not-allowed rounded-xl border border-emerald-500/30 bg-emerald-500/5 pl-8 pr-10 text-sm text-white outline-none"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                      <Check size={11} className="text-emerald-400" />
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] text-emerald-400/70">
                    Extraído automaticamente do email.
                  </p>
                </div>
              </>
            )}

            {regStep === 3 && (
              <>
                <div>
                  <FieldLabel>Curso</FieldLabel>
                  <div className="space-y-2">
                    {COURSES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => updateReg("courseKey", c.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                          regForm.courseKey === c.id
                            ? "border-blue-500/50 bg-blue-500/10 ring-1 ring-blue-500/30"
                            : "border-white/10 bg-white/5 hover:bg-white/[0.08]"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                            regForm.courseKey === c.id
                              ? "bg-blue-600 text-white"
                              : "bg-white/10 text-slate-400"
                          }`}
                        >
                          {c.code}
                        </div>
                        <p
                          className={`flex-1 text-sm font-medium leading-snug ${
                            regForm.courseKey === c.id ? "text-white" : "text-slate-300"
                          }`}
                        >
                          {c.name}
                        </p>
                        {regForm.courseKey === c.id && (
                          <Check size={15} className="shrink-0 text-blue-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Ano actual</FieldLabel>
                    <div className="flex gap-1">
                      {YEARS.map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => updateReg("currentYear", y)}
                          className={`flex h-11 flex-1 items-center justify-center rounded-xl border text-sm font-semibold transition-all ${
                            regForm.currentYear === y
                              ? "border-blue-500/50 bg-blue-600 text-white"
                              : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/[0.08]"
                          }`}
                        >
                          {y}º
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Semestre</FieldLabel>
                    <div className="flex gap-1">
                      {SEMESTERS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateReg("currentSemester", s)}
                          className={`flex h-11 flex-1 items-center justify-center rounded-xl border text-sm font-semibold transition-all ${
                            regForm.currentSemester === s
                              ? "border-blue-500/50 bg-blue-600 text-white"
                              : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/[0.08]"
                          }`}
                        >
                          {s}º
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-xl border border-amber-500/15 bg-amber-500/[0.08] px-3 py-2.5 text-[11px] text-amber-400">
                  <GraduationCap size={13} className="mt-0.5 shrink-0" />
                  <span>
                    Podes actualizar o ano e semestre a qualquer momento no teu perfil.
                  </span>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-1">
              {regStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={loading}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                >
                  <ChevronLeft size={15} />
                  Voltar
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    A criar conta…
                  </>
                ) : regStep < 3 ? (
                  <>
                    <span>Continuar</span>
                    <ChevronRight size={15} />
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Criar conta</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Instituto Superior de Administração e Finanças · Angola
        </p>
      </div>
    );
  }

  /* ================================================================
     RENDER PRINCIPAL
  ================================================================ */
  return (
    <div className="relative flex min-h-screen flex-col bg-slate-950 lg:flex-row">
      <MobileBanner />
      <LeftPanel />

      <div className="flex flex-1 flex-col items-center justify-start px-4 pb-12 pt-6 sm:justify-center sm:py-12 lg:justify-center lg:px-8 xl:px-16">
        {mode !== "register" && <MobileStats />}
        {mode === "register" ? renderRegister() : renderLoginReset()}
      </div>
    </div>
  );
}