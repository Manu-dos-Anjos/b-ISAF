// app/login/page.tsx
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
const ROLE_STORAGE_KEY = "b-isaf:role";

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
  courseKey: CourseId | "";
  currentYear: (typeof YEARS)[number];
  currentSemester: (typeof SEMESTERS)[number];
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

/**
 * Decide o destino após autenticação.
 * - Admin/Superadmin → sempre `/admin/eventos` (role vence).
 * - Caso contrário → `?next=` se for um destino "real" (≠ `/`); senão `/`.
 */
function resolveDestination(role: string | null, explicitNext: string | null): string {
  const isAdminRole = role === "admin" || role === "superadmin";
  if (isAdminRole) return "/admin/eventos";
  return explicitNext && explicitNext !== "/" ? explicitNext : "/";
}

/** Persiste o role em localStorage para que a home saiba sincronamente quem é o utilizador. */
function persistRole(role: string | null | undefined): void {
  try {
    if (role) localStorage.setItem(ROLE_STORAGE_KEY, role);
  } catch {
    /* ignore */
  }
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { message?: string; status?: number; code?: string; name?: string };
    const msg = e.message ?? "";
    const status = e.status;
    const code = e.code;

    if (code === "invalid_credentials" || msg.includes("Invalid login credentials")) {
      return "Número de estudante ou password incorrectos.";
    }
    if (code === "email_not_confirmed" || msg.includes("Email not confirmed")) {
      return "Confirma o teu email antes de entrar.";
    }
    if (code === "user_already_exists" || msg.includes("User already registered")) {
      return "Já existe uma conta com este email.";
    }
    if (code === "weak_password" || msg.includes("Password should")) {
      return "A password não cumpre os requisitos de segurança.";
    }
    if (status === 429 || msg.toLowerCase().includes("too many requests") || msg.toLowerCase().includes("rate limit")) {
      return "Demasiadas tentativas. Aguarda alguns minutos antes de tentares novamente.";
    }
    if (
      e.name === "TypeError" ||
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError")
    ) {
      return "Sem ligação à internet. Verifica a rede e tenta novamente.";
    }
    if (typeof status === "number" && status >= 500) {
      return "O servidor está indisponível de momento. Tenta novamente dentro de instantes.";
    }

    console.error("Erro de autenticação:", err);
  } else {
    console.error("Erro de autenticação (formato inesperado):", err);
  }

  return "Não foi possível completar o pedido. Tenta novamente dentro de momentos.";
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
  "w-full rounded-lg border border-slate-300 bg-white text-xs text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-blue-500/60 dark:focus:bg-white/[0.07]";

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
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col justify-between p-9 xl:p-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
            <Image
              src="/logo_dark.svg"
              alt="b-ISAF"
              width={25}
              height={25}
              className="h-6 w-6"
            />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">b-ISAF</p>
            <p className="text-[10px] text-blue-300/80">Plataforma académica</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-blue-300 backdrop-blur-sm">
              <span className="h-1 w-1 animate-pulse rounded-full bg-blue-400" />
              Biblioteca Virtual · ISAF
            </div>

            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
              O teu percurso
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                académico digital
              </span>
            </h2>

            <p className="max-w-sm text-sm leading-relaxed text-slate-300/80">
              Acede às tuas disciplinas, horários, avaliações e materiais de
              estudo num único lugar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/15 text-blue-300">
                  <Icon size={14} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-none text-white">{value}</p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-400">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-5">
          <p className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} Todos os direitos reservados · Angola
          </p>
          <div className="flex gap-3.5 text-[11px] text-slate-600">
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
    <div className="relative h-48 w-full overflow-hidden sm:h-56 lg:hidden">
      <Image
        src="/images/login-bg.jpg"
        alt="ISAF campus"
        fill
        priority
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-slate-950/70 to-slate-950" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-5 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
          <Image
            src="/logo_dark.svg"
            alt="b-ISAF"
            width={32}
            height={32}
            className="h-8 w-8"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">b-ISAF</h1>
          <p className="mt-0.5 text-xs text-blue-300/80">Biblioteca Virtual · ISAF</p>
        </div>
      </div>
    </div>
  );
}

function MobileStats() {
  return (
    <div className="mb-5 grid w-full max-w-sm grid-cols-2 gap-1.5 lg:hidden">
      {STATS.map(({ icon: Icon, value, label }) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300">
            <Icon size={12} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-none text-slate-900 dark:text-white">
              {value}
            </p>
            <p className="mt-0.5 truncate text-[9px] text-slate-500 dark:text-slate-500">
              {label}
            </p>
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
    <div className="mb-3.5 space-y-1.5" aria-live="polite" aria-atomic="true">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
        >
          <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          {success}
        </div>
      )}
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
    >
      {children}
    </label>
  );
}

function PasswordChecklist({ password }: { password: string }) {
  if (!password) return null;

  const rules = validatePassword(password);

  return (
    <div
      className="mt-2 space-y-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-white/[0.08] dark:bg-white/[0.03]"
      aria-live="polite"
    >
      {PASSWORD_REQS.map(({ key, label }) => {
        const ok = rules[key];
        return (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-all ${
                ok ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-slate-200 dark:bg-white/5"
              }`}
            >
              <Check
                size={9}
                aria-hidden="true"
                className={`transition-colors ${
                  ok ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-600"
                }`}
              />
            </div>
            <span
              className={`text-[10px] transition-colors ${
                ok ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-500"
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

function PillOption({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex h-10 flex-1 items-center justify-center rounded-lg border text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? "border-blue-500 bg-blue-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/[0.08]"
      }`}
    >
      {label}
    </button>
  );
}

/* ================================================================
   COMPONENTE PRINCIPAL
================================================================ */

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase } = useSupabase();

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [loginStudentNumber, setLoginStudentNumber] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  const [resetEmail, setResetEmail] = useState("");

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
    <K extends keyof RegForm>(field: K, value: RegForm[K]) =>
      setRegForm((prev) => ({ ...prev, [field]: value })),
    []
  );

  function switchMode(next: Mode) {
    if (loading) return;
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

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    clearFeedback();

    const studentNumber = loginStudentNumber.trim();
    if (!studentNumber) {
      setError("Indica o número de estudante.");
      return;
    }

    setLoading(true);

    try {
      const email = studentNumberToEmail(studentNumber);

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (error) throw error;
      if (!authData.user) throw new Error("Utilizador não encontrado.");

      // Ler o papel
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();
      const role = (prof?.role as string | null) ?? "student";
      const isAdminRole = role === "admin" || role === "superadmin";

      // Persistir o role → a home sabe sincronamente quem és (sem flash)
      persistRole(role);

      // next só vence se NÃO for a home; para admin o role vence sempre
      const explicitNext = searchParams.get("next");
      const destination = resolveDestination(role, explicitNext);

      // replace (não push) → sem home no histórico
      router.replace(destination);
      router.refresh();
    } catch (err: unknown) {
      if (isMountedRef.current) setError(getErrorMessage(err));
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }

  async function handleReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    clearFeedback();

    const email = resetEmail.trim().toLowerCase();
    if (!email) {
      setError("Indica o teu email.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login/nova-password`,
      });

      if (error) throw error;
      if (isMountedRef.current) {
        setSuccess("Email enviado! Verifica a tua caixa de entrada.");
      }
    } catch (err: unknown) {
      if (isMountedRef.current) setError(getErrorMessage(err));
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }

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

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    const stepErr = validateStep();
    if (stepErr) {
      setError(stepErr);
      return;
    }

    const email = regForm.email.trim().toLowerCase();
    const fullName = regForm.fullName.trim();

    if (!isIsafEmail(email)) {
      setError(`O email institucional deve terminar em @${ISAF_DOMAIN}.`);
      return;
    }

    const courseId = regForm.courseKey ? COURSE_ID_MAP[regForm.courseKey] : null;
    if (!courseId) {
      setError("Selecciona um curso válido.");
      return;
    }

    clearFeedback();
    setLoading(true);

    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password: regForm.password,
        options: {
          data: {
            full_name: fullName,
            student_number: derivedStudentNumber,
            course_id: courseId,
            current_year: regForm.currentYear,
            current_semester: regForm.currentSemester,
          },
        },
      });

      if (authErr) throw authErr;
      if (!authData.user) throw new Error("Utilizador não criado.");

      if (authData.session) {
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            student_number: derivedStudentNumber || null,
            course_id: courseId,
            current_year: regForm.currentYear,
            current_semester: regForm.currentSemester,
            updated_at: new Date().toISOString(),
          })
          .eq("id", authData.user.id);

        if (profileErr) {
          console.error("Falha ao atualizar perfil após registo:", profileErr);
        }

        // ── Redirecionamento por papel (mesma lógica do login) ──
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .maybeSingle();
        const role = (prof?.role as string | null) ?? "student";

        persistRole(role);

        const explicitNext = searchParams.get("next");
        const destination = resolveDestination(role, explicitNext);

        router.replace(destination);
        router.refresh();
      } else if (isMountedRef.current) {
        setMode("login");
        setLoginStudentNumber(derivedStudentNumber);
        setLoginPassword("");
        setRegForm(REG_INIT);
        setSuccess("Conta criada! Verifica o teu email para confirmares e depois entra.");
      }
    } catch (err: unknown) {
      if (isMountedRef.current) setError(getErrorMessage(err));
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }

  /* ================================================================
     RENDER — LOGIN / RESET
  ================================================================ */
  function renderLoginReset() {
    return (
      <div className="w-full max-w-sm">
        <div className="mb-5">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {mode === "reset" ? "Recuperar password" : "Bem-vindo!"}
          </h2>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
            {mode === "reset"
              ? "Indica o teu email para receberes o link de recuperação."
              : "Introduz o teu número de estudante e a password para aceder à plataforma."}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60 sm:p-6 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-2xl dark:shadow-black/40 dark:backdrop-blur-sm">
          <Feedback error={error} success={success} />

          <form onSubmit={mode === "reset" ? handleReset : handleLogin} className="space-y-4" noValidate>
            {mode === "login" ? (
              <div>
                <FieldLabel htmlFor="login-student-number">Número de estudante</FieldLabel>
                <div className="relative">
                  <User
                    size={14}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  />
                  <input
                    id="login-student-number"
                    type="text"
                    value={loginStudentNumber}
                    onChange={(e) => setLoginStudentNumber(e.target.value)}
                    placeholder="000000"
                    required
                    inputMode="numeric"
                    autoComplete="username"
                    disabled={loading}
                    className={`${inputCls} h-11 pl-9 pr-3.5`}
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">
                  O sistema adiciona automaticamente{" "}
                  <span className="font-mono">@{ISAF_DOMAIN}</span>
                </p>
              </div>
            ) : (
              <div>
                <FieldLabel htmlFor="reset-email">Email institucional</FieldLabel>
                <div className="relative">
                  <Mail
                    size={14}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  />
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="000000@isaf.co.ao"
                    required
                    autoComplete="email"
                    disabled={loading}
                    className={`${inputCls} h-11 pl-9 pr-3.5`}
                  />
                </div>
              </div>
            )}

            {mode === "login" && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <FieldLabel htmlFor="login-password">Password</FieldLabel>
                  <button
                    type="button"
                    onClick={() => switchMode("reset")}
                    disabled={loading}
                    className="text-[10px] text-slate-500 transition hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-500 dark:hover:text-blue-400"
                  >
                    Esqueceste a password?
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    size={14}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  />
                  <input
                    id="login-password"
                    type={showLoginPass ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    className={`${inputCls} h-11 pl-9 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass((v) => !v)}
                    aria-label={showLoginPass ? "Ocultar password" : "Mostrar password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {showLoginPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white shadow-md shadow-blue-900/20 transition hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-blue-900/30"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  <span>A processar…</span>
                </>
              ) : mode === "reset" ? (
                "Enviar email de recuperação"
              ) : (
                "Entrar na plataforma"
              )}
            </button>
          </form>

          <div className="my-4 flex items-center gap-2.5">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <span className="text-[10px] text-slate-400 dark:text-slate-600">ou</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <button
            type="button"
            onClick={() => switchMode("register")}
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <User size={14} aria-hidden="true" className="text-blue-600 dark:text-blue-400" />
            Criar conta
            <ArrowRight size={13} aria-hidden="true" className="ml-auto text-slate-400 dark:text-slate-500" />
          </button>
        </div>

        {mode === "reset" && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => switchMode("login")}
              disabled={loading}
              className="text-xs text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-slate-300"
            >
              ← Voltar ao login
            </button>
          </div>
        )}

        <p className="mt-7 text-center text-[11px] text-slate-500 dark:text-slate-600">
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
      <div className="w-full max-w-sm">
        <div className="mb-5">
          <button
            type="button"
            onClick={() => switchMode("login")}
            disabled={loading}
            className="mb-2.5 flex items-center gap-1 text-[11px] text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-slate-300"
          >
            <ChevronLeft size={13} aria-hidden="true" />
            Voltar ao login
          </button>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Criar conta
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Preenche os teus dados para aceder à plataforma.
          </p>
        </div>

        <div className="mb-4 flex items-center gap-1.5" role="list" aria-label="Progresso do registo">
          {([1, 2, 3] as RegStep[]).map((s) => (
            <div key={s} role="listitem" className="flex flex-1 flex-col items-center gap-1">
              <div
                aria-current={s === regStep ? "step" : undefined}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                  s < regStep
                    ? "bg-emerald-500 text-white"
                    : s === regStep
                    ? "bg-blue-600 text-white ring-2 ring-blue-500/30"
                    : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-500"
                }`}
              >
                {s < regStep ? <Check size={12} aria-hidden="true" /> : s}
              </div>
              <p
                className={`text-[9px] font-medium ${
                  s === regStep
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-400 dark:text-slate-600"
                }`}
              >
                {STEP_LABELS[s]}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60 sm:p-6 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-2xl dark:shadow-black/40 dark:backdrop-blur-sm">
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
            className="space-y-3.5"
            noValidate
          >
            {regStep === 1 && (
              <>
                <div>
                  <FieldLabel htmlFor="reg-email">Email institucional</FieldLabel>
                  <div className="relative">
                    <Mail
                      size={14}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    />
                    <input
                      id="reg-email"
                      type="email"
                      value={regForm.email}
                      onChange={(e) => updateReg("email", e.target.value)}
                      placeholder="000000@isaf.co.ao"
                      required
                      autoComplete="email"
                      disabled={loading}
                      aria-invalid={Boolean(regForm.email) && !isIsafEmail(regForm.email)}
                      className={`${inputCls} h-10 pl-9 pr-3.5`}
                    />
                  </div>

                  {regForm.email && !isIsafEmail(regForm.email) && (
                    <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">
                      O email deve terminar em{" "}
                      <span className="font-mono">@{ISAF_DOMAIN}</span>
                    </p>
                  )}

                  {regForm.email && isIsafEmail(regForm.email) && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                      <Check size={10} aria-hidden="true" />
                      Email institucional válido.
                    </p>
                  )}
                </div>

                <div>
                  <FieldLabel htmlFor="reg-password">Password</FieldLabel>
                  <div className="relative">
                    <Lock
                      size={14}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    />
                    <input
                      id="reg-password"
                      type={showPass ? "text" : "password"}
                      value={regForm.password}
                      onChange={(e) => updateReg("password", e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      disabled={loading}
                      className={`${inputCls} h-10 pl-9 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      aria-label={showPass ? "Ocultar password" : "Mostrar password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  <PasswordChecklist password={regForm.password} />
                </div>

                <div>
                  <FieldLabel htmlFor="reg-confirm-password">Confirmar password</FieldLabel>
                  <div className="relative">
                    <Lock
                      size={14}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    />
                    <input
                      id="reg-confirm-password"
                      type={showPass ? "text" : "password"}
                      value={regForm.confirmPassword}
                      onChange={(e) => updateReg("confirmPassword", e.target.value)}
                      placeholder="Repete a password"
                      required
                      autoComplete="new-password"
                      disabled={loading}
                      aria-invalid={
                        Boolean(regForm.confirmPassword) &&
                        regForm.password !== regForm.confirmPassword
                      }
                      className={`${inputCls} h-10 pl-9 pr-3.5`}
                    />
                  </div>

                  {regForm.confirmPassword &&
                    regForm.password !== regForm.confirmPassword && (
                      <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">
                        As passwords não coincidem.
                      </p>
                    )}

                  {regForm.confirmPassword &&
                    regForm.password === regForm.confirmPassword &&
                    isPasswordValid(regForm.password) && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                        <Check size={10} aria-hidden="true" />
                        Passwords coincidem.
                      </p>
                    )}
                </div>
              </>
            )}

            {regStep === 2 && (
              <>
                <div>
                  <FieldLabel htmlFor="reg-full-name">Nome completo</FieldLabel>
                  <div className="relative">
                    <User
                      size={14}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    />
                    <input
                      id="reg-full-name"
                      type="text"
                      value={regForm.fullName}
                      onChange={(e) => updateReg("fullName", e.target.value)}
                      placeholder="O teu nome completo"
                      required
                      autoComplete="name"
                      disabled={loading}
                      className={`${inputCls} h-10 pl-9 pr-3.5`}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel htmlFor="reg-student-number">Número de estudante</FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                      #
                    </span>
                    <input
                      id="reg-student-number"
                      type="text"
                      value={derivedStudentNumber}
                      readOnly
                      className="h-10 w-full cursor-not-allowed rounded-lg border border-emerald-300 bg-emerald-50 pl-7 pr-9 text-xs text-slate-900 outline-none dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-white"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                      <Check size={10} aria-hidden="true" className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400/70">
                    Extraído automaticamente do email.
                  </p>
                </div>
              </>
            )}

            {regStep === 3 && (
              <>
                <div>
                  <FieldLabel>Curso</FieldLabel>
                  <div className="space-y-1.5" role="radiogroup" aria-label="Curso">
                    {COURSES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={regForm.courseKey === c.id}
                        onClick={() => updateReg("courseKey", c.id)}
                        disabled={loading}
                        className={`flex w-full items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                          regForm.courseKey === c.id
                            ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300 dark:border-blue-500/50 dark:bg-blue-500/10 dark:ring-blue-500/30"
                            : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/[0.08]"
                        }`}
                      >
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[9px] font-bold ${
                            regForm.courseKey === c.id
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                          }`}
                        >
                          {c.code}
                        </div>
                        <p
                          className={`flex-1 text-xs font-medium leading-snug ${
                            regForm.courseKey === c.id
                              ? "text-slate-900 dark:text-white"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {c.name}
                        </p>
                        {regForm.courseKey === c.id && (
                          <Check size={13} aria-hidden="true" className="shrink-0 text-blue-600 dark:text-blue-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <FieldLabel>Ano actual</FieldLabel>
                    <div className="flex gap-0.5" role="radiogroup" aria-label="Ano actual">
                      {YEARS.map((y) => (
                        <PillOption
                          key={y}
                          label={`${y}º`}
                          selected={regForm.currentYear === y}
                          onClick={() => updateReg("currentYear", y)}
                          disabled={loading}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Semestre</FieldLabel>
                    <div className="flex gap-0.5" role="radiogroup" aria-label="Semestre">
                      {SEMESTERS.map((s) => (
                        <PillOption
                          key={s}
                          label={`${s}º`}
                          selected={regForm.currentSemester === s}
                          onClick={() => updateReg("currentSemester", s)}
                          disabled={loading}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] text-amber-700 dark:border-amber-500/15 dark:bg-amber-500/[0.08] dark:text-amber-400">
                  <GraduationCap size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
                  <span>
                    Podes actualizar o ano e semestre a qualquer momento no teu perfil.
                  </span>
                </div>
              </>
            )}

            <div className="flex gap-2.5 pt-0.5">
              {regStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={loading}
                  className="flex h-10 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  <ChevronLeft size={13} aria-hidden="true" />
                  Voltar
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white shadow-md shadow-blue-900/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-blue-900/30"
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    A criar conta…
                  </>
                ) : regStep < 3 ? (
                  <>
                    <span>Continuar</span>
                    <ChevronRight size={13} aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <Check size={13} aria-hidden="true" />
                    <span>Criar conta</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-500 dark:text-slate-600">
          Instituto Superior de Administração e Finanças · Angola
        </p>
      </div>
    );
  }

  /* ================================================================
     RENDER PRINCIPAL
  ================================================================ */
  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 lg:flex-row">
      <MobileBanner />
      <LeftPanel />

      <div className="flex flex-1 flex-col items-center justify-start px-3.5 pb-10 pt-5 sm:justify-center sm:py-10 lg:justify-center lg:px-7 xl:px-14">
        {mode !== "register" && <MobileStats />}
        {mode === "register" ? renderRegister() : renderLoginReset()}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600 dark:bg-slate-950 dark:text-white">
          A carregar…
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}