"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Loader2, X } from "lucide-react";
import type { ProfileUpdate } from "@/src/types/database";

type AcademicPeriodPromptProps = {
  profile: {
    id: string;
    role: string;
    current_year: number;
    current_semester: number;
  } | null;
  maxYear?: number;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
};

type CurrentPeriod = {
  key: string;
  semester: 1 | 2;
  suggestedYear: number;
  label: string;
};

const PROMPT_STORAGE_KEY = "b-isaf:academic-period-prompt";

function getCurrentPeriod(currentYear: number, currentSemester: number, maxYear: number): CurrentPeriod | null {
  const now = new Date();
  const month = now.getMonth() + 1;
  const calendarYear = now.getFullYear();

  if (month >= 10) {
    return {
      key: `${calendarYear}-1`,
      semester: 1,
      suggestedYear: currentSemester === 2 ? Math.min(currentYear + 1, maxYear) : currentYear,
      label: "outubro a fevereiro",
    };
  }

  if (month >= 3 && month <= 6) {
    return {
      key: `${calendarYear}-2`,
      semester: 2,
      suggestedYear: currentYear,
      label: "março a junho",
    };
  }

  return null;
}

export default function AcademicPeriodPrompt({
  profile,
  maxYear = 4,
  updateProfile,
}: AcademicPeriodPromptProps) {
  const period = useMemo(
    () =>
      profile
        ? getCurrentPeriod(profile.current_year, profile.current_semester, maxYear)
        : null,
    [profile, maxYear]
  );
  const [visible, setVisible] = useState(false);
  const [year, setYear] = useState(profile?.current_year ?? 1);
  const [semester, setSemester] = useState<1 | 2>(
    (profile?.current_semester === 2 ? 2 : 1) as 1 | 2
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || profile.role !== "student" || !period) return;

    let seenPeriod: string | null = null;
    try {
      seenPeriod = localStorage.getItem(`${PROMPT_STORAGE_KEY}:${profile.id}`);
    } catch {
      // A indisponibilidade do storage não impede a atualização manual.
    }

    const alreadyUpdated =
      profile.current_year === period.suggestedYear &&
      profile.current_semester === period.semester;

    if (seenPeriod !== period.key && !alreadyUpdated) {
      setYear(period.suggestedYear);
      setSemester(period.semester);
      setVisible(true);
    }
  }, [period, profile]);

  if (!visible || !period || !profile) return null;

  const rememberDecision = () => {
    try {
      localStorage.setItem(`${PROMPT_STORAGE_KEY}:${profile.id}`, period.key);
    } catch {
      // A decisão continua válida nesta sessão.
    }
    setVisible(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ current_year: year, current_semester: semester });
      rememberDecision();
    } catch {
      setError("Não foi possível atualizar o período. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="academic-period-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <CalendarDays size={20} />
            </div>
            <div>
              <h2 id="academic-period-title" className="text-base font-bold text-slate-900 dark:text-white">
                Atualizar período académico?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                O novo semestre costuma decorrer de {period.label}. Confirma o ano e o semestre que vais frequentar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={rememberDecision}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Ano
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              disabled={saving}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
            >
              {Array.from({ length: maxYear }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>{value}º ano</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Semestre
            <select
              value={semester}
              onChange={(event) => setSemester(Number(event.target.value) as 1 | 2)}
              disabled={saving}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
            >
              <option value={1}>1º semestre</option>
              <option value={2}>2º semestre</option>
            </select>
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={rememberDecision}
            disabled={saving}
            className="rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-white/10"
          >
            Manter atual
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}
