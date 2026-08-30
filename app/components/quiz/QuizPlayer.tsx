"use client";

import type { ReactNode } from "react";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Clock,
  Check,
  RotateCcw,
  Trophy,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  BarChart2,
  ArrowRight,
  WifiOff,
  AlertOctagon,
  ListChecks,
  ToggleLeft,
  HelpCircle,
  Square,
  CheckSquare,
  Maximize2,
  Minimize2,
  Bookmark,
} from "lucide-react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { useUser } from "@/app/lib/context/UserContext";
import { useQuizSession } from "@/app/lib/hooks/useQuizSession";
import { getQuizStats, type QuizStats } from "@/app/actions/quiz-stats";
import type {
  QuizResultInsert,
  QuizResultDetailInsert,
} from "@/src/types/database";
import { saveItem, removeSavedItem } from "@/app/actions/saved";
import { MathText } from "@/app/components/quiz/MathText";

import { GraphSVG } from "@/app/components/quiz/GraphSVG";
import type { GraphConfig } from "@/app/components/quiz/GraphSVG";

/* ================================================================
   CONFIG
   ================================================================ */

const QUESTIONS_PER_ATTEMPT = 20;
const HISTORY_LOOKBACK = 50;

/* ================================================================
   TIPOS
   ================================================================ */

export type QuizAnswerOption = {
  id: string;
  answer_text: string;
  is_correct: boolean;
  order_index: number;
  feedback: string | null;
  metadata: AnswerMetadata | null; // 👈 novo
};

// Novo tipo (pode ser importado de GraphViewer)
export type AnswerMetadata = {
  graph?: GraphConfig;
  image_url?: string;
};

export type QuizQuestionType =
  | "multiple_choice"
  | "true_false"
  | "association"
  | "integrative";

export type QuestionMetadata = {
  graph?: GraphConfig;
  image_url?: string;
};

export type QuizQuestion = {
  id: string;
  question_text: string;
  order_index: number;
  explanation: string | null;
  question_type: QuizQuestionType;
  metadata: QuestionMetadata | null;
  answers: QuizAnswerOption[];
};

type Phase =
  | "resume_prompt"
  | "playing"
  | "submitting"
  | "results"
  | "stats"
  | "error";

type SubmittedDetail = {
  questionId: string;
  questionText: string;
  kindLabel: string;
  selectedAnswerIds: string[];
  selectedAnswerTexts: string[];
  selectedAnswerFeedbacks: string[];
  correctAnswerIds: string[];
  correctAnswerTexts: string[];
  questionExplanation: string | null;
  isCorrect: boolean;
};

type FinalResult = {
  correct: number;
  total: number;
  pct: number;
  timeSecs: number | null;
};

type PendingSubmission = {
  result: QuizResultInsert & { id: string };
  details: (QuizResultDetailInsert & { id: string })[];
  queuedAt: string;
};

type PendingQueue = {
  items: PendingSubmission[];
};

type QuestionKind = "true_false" | "multiple_select" | "single_choice";

type QuestionKindInfo = {
  kind: QuestionKind;
  label: string;
  correctCount: number;
};

type UiPrefs = {
  isWide: boolean;
  isFullscreen: boolean;
};

/* ================================================================
   HELPERS
   ================================================================ */

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededShuffle<T>(array: T[], seed: string): T[] {
  const arr = [...array];
  let seedNum = hashCode(seed) || 1;

  for (let i = arr.length - 1; i > 0; i--) {
    seedNum = (seedNum * 9301 + 49297) % 233280;
    const j = Math.floor((seedNum / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getQuestionKind(q: QuizQuestion): QuestionKindInfo {
  const correctCount = q.answers.reduce((n, a) => n + (a.is_correct ? 1 : 0), 0);

  if (q.question_type === "true_false") {
    return { kind: "true_false", label: "Verdadeiro ou Falso", correctCount };
  }

  if (correctCount > 1) {
    return {
      kind: "multiple_select",
      label: `Múltipla escolha (${correctCount} certas)`,
      correctCount,
    };
  }

  return { kind: "single_choice", label: "Pergunta directa", correctCount };
}

function pendingQueueKey(contentId: string, studentId: string) {
  return `b-isaf:quiz:pending:${studentId}:${contentId}`;
}

function uiPrefsKey(contentId: string) {
  return `b-isaf:quiz:ui:${contentId}`;
}

function readPendingQueue(key: string): PendingQueue {
  try {
    if (typeof window === "undefined") return { items: [] };
    const raw = localStorage.getItem(key);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw) as PendingQueue | null;
    if (!parsed || !Array.isArray(parsed.items)) return { items: [] };
    return parsed;
  } catch {
    return { items: [] };
  }
}

function writePendingQueue(key: string, queue: PendingQueue) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

function clearPendingQueue(key: string) {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function readUiPrefs(contentId: string): UiPrefs {
  try {
    if (typeof window === "undefined") return { isWide: false, isFullscreen: false };
    const raw = localStorage.getItem(uiPrefsKey(contentId));
    if (!raw) return { isWide: false, isFullscreen: false };
    const parsed = JSON.parse(raw) as Partial<UiPrefs> | null;
    return {
      isWide: !!parsed?.isWide,
      isFullscreen: !!parsed?.isFullscreen,
    };
  } catch {
    return { isWide: false, isFullscreen: false };
  }
}

function writeUiPrefs(contentId: string, prefs: UiPrefs) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(uiPrefsKey(contentId), JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

/* ================================================================
   BADGE DE TIPO DE PERGUNTA
   ================================================================ */

function QuestionKindBadge({ info }: { info: QuestionKindInfo }) {
  const Icon =
    info.kind === "true_false"
      ? ToggleLeft
      : info.kind === "multiple_select"
      ? ListChecks
      : HelpCircle;

  const colorClasses =
    info.kind === "true_false"
      ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300"
      : info.kind === "multiple_select"
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
      : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${colorClasses}`}
    >
      <Icon size={11} />
      {info.label}
    </span>
  );
}

/* ================================================================
   PROPS
   ================================================================ */

type Props = {
  contentId: string;
  title: string;
  disciplineName: string;
  chapterTitle: string;
  timeLimitSeconds?: number | null;
  onClose: () => void;
};

/* ================================================================
   COMPONENTE
   ================================================================ */

export default function QuizPlayer({
  contentId,
  title,
  disciplineName,
  chapterTitle,
  timeLimitSeconds,
  onClose,
}: Props) {
  const { supabase } = useSupabase();
  const { profile } = useUser();

  const [isSaved, setIsSaved] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [shouldSaveOnClose, setShouldSaveOnClose] = useState(false);

  useEffect(() => {
    if (!profile?.id || !contentId) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("saved_items")
        .select("id")
        .eq("student_id", profile.id)
        .eq("content_id", contentId)
        .maybeSingle();

      if (!cancelled) setIsSaved(!!data?.id);
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, contentId, supabase]);

  const toggleSave = async () => {
    if (!profile?.id || !contentId || savingToggle) return;
    setSavingToggle(true);
    try {
      if (isSaved) {
        const { data } = await supabase
          .from("saved_items")
          .select("id")
          .eq("student_id", profile.id)
          .eq("content_id", contentId)
          .maybeSingle();

        if (data?.id) await removeSavedItem(data.id);
        setIsSaved(false);
      } else {
        await saveItem(profile.id, contentId);
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Erro ao guardar quiz:", err);
    } finally {
      setSavingToggle(false);
    }
  };

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");

  const {
    session,
    isLoading: sessionLoading,
    saveAnswer,
    setQuestion,
    setQuestionIds,
    tickTimer,
    clearSession,
    resetSession,
    loadSession,
  } = useQuizSession(contentId, timeLimitSeconds);

  const [stats, setStats] = useState<QuizStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [submittedDetails, setSubmittedDetails] = useState<SubmittedDetail[]>([]);
  const [submissionPending, setSubmissionPending] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  const [confirmedQuestions, setConfirmedQuestions] = useState<Set<string>>(new Set());
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isWide, setIsWide] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const resumeCheckRef = useRef(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    const prefs = readUiPrefs(contentId);
    setIsWide(prefs.isWide);
    setIsFullscreen(prefs.isFullscreen);
  }, [contentId]);

  useEffect(() => {
    writeUiPrefs(contentId, { isWide, isFullscreen });
  }, [contentId, isWide, isFullscreen]);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        type QuizQuestionRow = {
          id: string;
          question_text: string;
          order_index: number;
          explanation: string | null;
          question_type: string | null;
          metadata: QuestionMetadata | null;
        };

        type QuizAnswerRow = {
          id: string;
          question_id: string;
          answer_text: string;
          is_correct: boolean;
          order_index: number;
          feedback: string | null;
          metadata: AnswerMetadata | null;
        };

        let selectedIds: string[] = session?.questionIds ?? [];

        if (selectedIds.length === 0) {
          const { data: idRows, error: idErr } = await supabase
            .from("quiz_questions")
            .select("id")
            .eq("content_id", contentId)
            .eq("is_active", true);

          if (idErr) throw idErr;
          if (cancelled) return;

          const allIds = ((idRows ?? []) as { id: string }[]).map((r) => r.id);

          if (allIds.length === 0) {
            setQuestions([]);
            return;
          }

          let pool = allIds;

          if (profile) {
            const lookback = Math.min(HISTORY_LOOKBACK, allIds.length);

            const { data: historyRows } = await supabase
              .from("quiz_question_history")
              .select("question_id")
              .eq("student_id", profile.id)
              .eq("content_id", contentId)
              .order("seen_at", { ascending: false })
              .limit(lookback);

            if (cancelled) return;

            const recentIds = ((historyRows ?? []) as { question_id: string }[]).map(
              (r) => r.question_id
            );
            const recentSet = new Set(recentIds);

            let available = allIds.filter((id) => !recentSet.has(id));
            const target = Math.min(QUESTIONS_PER_ATTEMPT, allIds.length);

            if (available.length < target) {
              const need = target - available.length;
              const oldestFirst = [...recentIds].reverse();
              const extra = oldestFirst
                .filter((id) => !available.includes(id))
                .slice(0, need);
              available = [...available, ...extra];
            }

            pool = available;
          }

          const shuffledPool = shuffleArray(pool);
          selectedIds = shuffledPool.slice(0, Math.min(QUESTIONS_PER_ATTEMPT, allIds.length));

          if (cancelled) return;

          setQuestionIds(selectedIds);

          if (profile && selectedIds.length > 0) {
            void supabase.from("quiz_question_history").insert(
              selectedIds.map((qid) => ({
                student_id: profile.id,
                content_id: contentId,
                question_id: qid,
              }))
            );
          }
        }

        const { data: questionRows, error: questionError } = selectedIds.length
          ? await supabase
              .from("quiz_questions")
              .select("id, question_text, order_index, explanation, question_type, metadata")
              .in("id", selectedIds)
          : { data: [] as QuizQuestionRow[], error: null };

        if (questionError) throw questionError;
        if (cancelled) return;

        const questionsData = (questionRows ?? []) as QuizQuestionRow[];
        const questionIds = questionsData.map((q) => q.id);

        const { data: answerRows, error: answerError } = questionIds.length
          ? await supabase
              .from("quiz_answers")
.select("id, question_id, answer_text, is_correct, order_index, feedback, metadata")
              .in("question_id", questionIds)
              .eq("is_active", true)
              .order("order_index")
          : { data: [] as QuizAnswerRow[], error: null };

        if (answerError) throw answerError;
        if (cancelled) return;

        const answersData = (answerRows ?? []) as QuizAnswerRow[];
        const answersByQuestion = new Map<string, QuizAnswerOption[]>();

        for (const answer of answersData) {
          const list = answersByQuestion.get(answer.question_id) ?? [];
          list.push({
            id: answer.id,
            answer_text: answer.answer_text,
            is_correct: answer.is_correct,
            order_index: answer.order_index,
            feedback: answer.feedback,
            metadata: answer.metadata ?? null,
          });
          answersByQuestion.set(answer.question_id, list);
        }

        setQuestions(
          questionsData.map((q) => ({
            id: q.id,
            question_text: q.question_text,
            order_index: q.order_index,
            explanation: q.explanation,
            question_type: (q.question_type as QuizQuestionType) ?? "multiple_choice",
            metadata: q.metadata ?? null,
            answers: (answersByQuestion.get(q.id) ?? []).sort(
              (a, b) => a.order_index - b.order_index
            ),
          }))
        );
      } catch (err) {
        console.error("Erro ao carregar questões:", err);
        if (!cancelled) {
          setLoadError(
            "Não foi possível carregar o questionário. Verifica a tua ligação e tenta novamente."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, contentId, profile, sessionLoading, session?.attemptStartedAt]);

  useEffect(() => {
    if (loading || sessionLoading || resumeCheckRef.current) return;
    resumeCheckRef.current = true;

    async function check() {
      const existing = await loadSession();
      const answeredCount = Object.values(existing?.answers ?? {}).filter(
        (ids) => ids.length > 0
      ).length;

      if (existing && (existing.currentQuestionIndex > 0 || answeredCount > 0)) {
        setPhase("resume_prompt");
      }
    }

    void check();
  }, [loading, sessionLoading, loadSession]);

  useEffect(() => {
    resumeCheckRef.current = false;
  }, [contentId]);

  useEffect(() => {
    if (phase !== "playing" || !timeLimitSeconds || sessionLoading) return;

    timerRef.current = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, timeLimitSeconds, sessionLoading, tickTimer]);

  useEffect(() => {
    if (phase !== "playing" || !timeLimitSeconds) return;
    if ((session?.timeRemainingSeconds ?? null) !== 0) return;
    if (submittingRef.current) return;

    void submitQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, session?.timeRemainingSeconds, timeLimitSeconds]);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "pt-PT";
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = utt.onerror = () => setIsSpeaking(false);
    speechRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, []);

  const stopSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const orderedQuestions = useMemo(() => {
    if (questions.length === 0) return [];

    const seed = `${contentId}:${session?.attemptStartedAt ?? "seed"}`;
    const shuffledQuestions = seededShuffle(questions, seed);

    return shuffledQuestions.map((q) => ({
      ...q,
      answers: seededShuffle(q.answers, `${seed}:${q.id}`),
    }));
  }, [questions, contentId, session?.attemptStartedAt]);

  const speakCurrentQuestion = useCallback(() => {
    if (!session) return;
    const q = orderedQuestions[session.currentQuestionIndex];
    if (!q) return;

    const text = `${q.question_text}. ${q.answers
      .map((a, i) => `${String.fromCharCode(65 + i)}: ${a.answer_text}`)
      .join(". ")}`;

    speak(text);
  }, [session, orderedQuestions, speak]);

  const persistSubmission = useCallback(
    async (payload: PendingSubmission) => {
      if (!profile) return;

      const resultsTable = supabase.from("quiz_results") as any;
      const detailsTable = supabase.from("quiz_results_details") as any;

      const { error: resultError } = await resultsTable.upsert(payload.result, {
        onConflict: "id",
      });
      if (resultError) throw resultError;

      const { error: detailsError } = await detailsTable.upsert(payload.details, {
        onConflict: "id",
      });
      if (detailsError) throw detailsError;
    },
    [supabase, profile]
  );

  const enqueuePendingSubmission = useCallback(
    (payload: PendingSubmission) => {
      if (!profile) return;

      const key = pendingQueueKey(contentId, profile.id);
      const current = readPendingQueue(key);
      writePendingQueue(key, { items: [...current.items, payload] });
      setSubmissionPending(true);
    },
    [contentId, profile]
  );

  const flushPendingQueue = useCallback(async () => {
    if (!profile) return;

    const key = pendingQueueKey(contentId, profile.id);
    const queue = readPendingQueue(key);

    if (queue.items.length === 0) {
      setSubmissionPending(false);
      return;
    }

    const remaining: PendingSubmission[] = [];

    for (let i = 0; i < queue.items.length; i++) {
      try {
        await persistSubmission(queue.items[i]);
      } catch (e) {
        console.warn("Falha ao reenviar submissão pendente:", e);
        remaining.push(...queue.items.slice(i));
        break;
      }
    }

    if (remaining.length === 0) clearPendingQueue(key);
    else writePendingQueue(key, { items: remaining });

    setSubmissionPending(remaining.length > 0);
  }, [contentId, profile, persistSubmission]);

  useEffect(() => {
    void flushPendingQueue();
  }, [flushPendingQueue]);

  useEffect(() => {
    const handleOnline = () => void flushPendingQueue();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [flushPendingQueue]);

  const submitQuiz = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);
    stopSpeech();
    setPhase("submitting");

    const savedAnswers = session?.answers ?? {};
    const currentQuestions = orderedQuestions;

    let correct = 0;
    const details: SubmittedDetail[] = [];

    for (const q of currentQuestions) {
      const selected = savedAnswers[q.id] ?? [];
      const correctOpts = q.answers.filter((a) => a.is_correct);
      const correctIds = correctOpts.map((a) => a.id);

      const isCorrect =
        selected.length === correctIds.length &&
        correctIds.every((id) => selected.includes(id));

      if (isCorrect) correct++;

      const selectedOpts = q.answers.filter((a) => selected.includes(a.id));

      details.push({
        questionId: q.id,
        questionText: q.question_text,
        kindLabel: getQuestionKind(q).label,
        selectedAnswerIds: selected,
        selectedAnswerTexts: selectedOpts.map((a) => a.answer_text),
        selectedAnswerFeedbacks: selectedOpts
          .map((a) => a.feedback)
          .filter((f): f is string => !!f),
        correctAnswerIds: correctIds,
        correctAnswerTexts: correctOpts.map((a) => a.answer_text),
        questionExplanation: q.explanation ?? null,
        isCorrect,
      });
    }

    const total = currentQuestions.length;
    const score = total ? Math.round((correct / total) * 100) : 0;
    const timeSecs =
      timeLimitSeconds != null && session?.timeRemainingSeconds != null
        ? timeLimitSeconds - session.timeRemainingSeconds
        : null;

    const resultId = generateUUID();

    const resultPayload = {
      id: resultId,
      student_id: profile?.id,
      content_id: contentId,
      score,
      total_questions: total,
      correct_answers: correct,
      time_spent_seconds: timeSecs,
    } as QuizResultInsert & { id: string };

    const detailPayloads = details.map((d) => ({
      id: generateUUID(),
      result_id: resultId,
      question_id: d.questionId,
      selected_answer_id: d.selectedAnswerIds[0] ?? null,
      is_correct: d.isCorrect,
      time_spent_seconds: null,
    })) as (QuizResultDetailInsert & { id: string })[];

    setFinalResult({ correct, total, pct: score, timeSecs });
    setSubmittedDetails(details);

    try {
      if (profile) {
        await persistSubmission({
          result: resultPayload,
          details: detailPayloads,
          queuedAt: new Date().toISOString(),
        });
        setSubmissionPending(false);
      }
    } catch (e) {
      console.error("Erro ao guardar resultado:", e);
      if (profile) {
        enqueuePendingSubmission({
          result: resultPayload,
          details: detailPayloads,
          queuedAt: new Date().toISOString(),
        });
      }
    } finally {
      await clearSession();
      setPhase("results");
      submittingRef.current = false;
    }
  }, [
    session,
    orderedQuestions,
    profile,
    contentId,
    timeLimitSeconds,
    clearSession,
    stopSpeech,
    persistSubmission,
    enqueuePendingSubmission,
  ]);

  const restart = async () => {
    stopSpeech();
    setFinalResult(null);
    setSubmittedDetails([]);
    setSubmissionPending(false);
    setConfirmedQuestions(new Set());
    await resetSession();
    setPhase("playing");
  };

  const loadStats = async () => {
    setStatsLoading(true);
    setPhase("stats");
    try {
      const s = await getQuizStats(contentId);
      setStats(s);
    } finally {
      setStatsLoading(false);
    }
  };

  const currentIndex = session?.currentQuestionIndex ?? 0;
  const currentQ = orderedQuestions[currentIndex] ?? null;
  const selectedIds: string[] = currentQ ? session?.answers[currentQ.id] ?? [] : [];
  const timeLeft = session?.timeRemainingSeconds ?? null;
  const isLast = currentIndex === orderedQuestions.length - 1;

  const answeredCount = Object.values(session?.answers ?? {}).filter(
    (ids) => ids.length > 0
  ).length;
  const unansweredCount = orderedQuestions.length - answeredCount;

  const questionKind = currentQ ? getQuestionKind(currentQ) : null;
  const isMultiSelect = questionKind?.kind === "multiple_select";

  // 🔒 Uma vez escolhida uma opção (pergunta directa / V-F), a resposta fica bloqueada.
  // Para seleção múltipla, o bloqueio só acontece depois de "Confirmar respostas".
  const isOptionsLocked = currentQ
    ? isMultiSelect
      ? confirmedQuestions.has(currentQ.id)
      : selectedIds.length > 0
    : false;

  const currentCorrectAnswers = currentQ ? currentQ.answers.filter((a) => a.is_correct) : [];

  const isCurrentAnswerFullyCorrect =
    currentQ != null &&
    selectedIds.length === currentCorrectAnswers.length &&
    currentCorrectAnswers.every((a) => selectedIds.includes(a.id));

  const currentSelectedOption =
    !isMultiSelect && currentQ
      ? currentQ.answers.find((a) => a.id === selectedIds[0]) ?? null
      : null;

  const showFeedback = currentQ
    ? isMultiSelect
      ? confirmedQuestions.has(currentQ.id) && selectedIds.length > 0
      : selectedIds.length > 0
    : false;

  const finalSummary = finalResult;

  useEffect(() => {
    if (!showFeedback || !feedbackRef.current) return;
    const t = setTimeout(() => {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
    return () => clearTimeout(t);
  }, [showFeedback]);

  const handleRequestClose = useCallback(() => {
    if (phase === "playing" && answeredCount > 0) setShowCloseConfirm(true);
    else onClose();
  }, [phase, answeredCount, onClose]);

  const requestSubmit = useCallback(() => {
    if (unansweredCount > 0) setShowSubmitConfirm(true);
    else void submitQuiz();
  }, [unansweredCount, submitQuiz]);

  useEffect(() => {
    if (phase !== "playing" || !currentQ) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (showCloseConfirm || showSubmitConfirm) {
        if (e.key === "Escape") {
          setShowCloseConfirm(false);
          setShowSubmitConfirm(false);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        handleRequestClose();
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isLast) requestSubmit();
        else setQuestion(currentIndex + 1);
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentIndex > 0) setQuestion(currentIndex - 1);
        return;
      }

      if (isOptionsLocked) return;

      const numIdx = "123456789".indexOf(e.key);
      if (numIdx >= 0 && currentQ.answers[numIdx]) {
        e.preventDefault();
        saveAnswer(currentQ.id, currentQ.answers[numIdx].id, { multiple: isMultiSelect });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    phase,
    currentQ,
    currentIndex,
    isLast,
    isMultiSelect,
    isOptionsLocked,
    showCloseConfirm,
    showSubmitConfirm,
    handleRequestClose,
    requestSubmit,
    setQuestion,
    saveAnswer,
  ]);

  const overlay = (content: ReactNode) => (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 backdrop-blur-md dark:bg-slate-950/90 sm:items-center ${
        isFullscreen ? "p-0" : "p-0 sm:p-4"
      }`}
    >
      <div
        className={`relative flex flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 transition-[width,height,border-radius] duration-200 ${
          isFullscreen
            ? "h-[100dvh] w-[100vw] rounded-none"
            : isWide
            ? "h-[96dvh] w-full rounded-t-3xl sm:h-[94dvh] sm:w-[min(96vw,1600px)] sm:rounded-3xl"
            : "h-[95dvh] w-full rounded-t-3xl sm:h-[92dvh] sm:w-[min(92vw,1100px)] sm:max-w-2xl sm:rounded-3xl lg:max-w-3xl"
        }`}
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" />
        </div>

        {!isOnline && (
          <div className="flex shrink-0 items-center justify-center gap-2 bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">
            <WifiOff size={12} />
            Sem ligação — o teu progresso continua a ser guardado localmente
          </div>
        )}

        {content}

        {showCloseConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <AlertOctagon size={18} className="shrink-0 text-amber-500 dark:text-amber-400" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Sair do questionário?
                </p>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Já respondeste a {answeredCount} de {orderedQuestions.length} perguntas. O teu
                progresso fica guardado e podes continuar mais tarde.
              </p>

              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
                <input
                  type="checkbox"
                  checked={shouldSaveOnClose}
                  onChange={(e) => setShouldSaveOnClose(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 dark:border-white/15 dark:bg-white/10"
                />
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Bookmark
                    size={12}
                    className={isSaved ? "text-amber-600" : "text-slate-400"}
                    fill={isSaved ? "currentColor" : "none"}
                  />
                  Guardar este questionário para mais tarde
                </span>
              </label>

              <div className="flex gap-2.5">
                <button
                  onClick={() => {
                    setShowCloseConfirm(false);
                    setShouldSaveOnClose(false);
                  }}
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Continuar a responder
                </button>
                <button
                  onClick={async () => {
                    setShowCloseConfirm(false);
                    if (shouldSaveOnClose && !isSaved) {
                      await toggleSave();
                    }
                    setShouldSaveOnClose(false);
                    onClose();
                  }}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white transition hover:bg-rose-500"
                >
                  {shouldSaveOnClose && !isSaved ? "Guardar e sair" : "Sair"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showSubmitConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="shrink-0 text-amber-500 dark:text-amber-400" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Ainda tens perguntas por responder
                </p>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Faltam {unansweredCount} {unansweredCount === 1 ? "pergunta" : "perguntas"}. Queres
                terminar mesmo assim?
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Continuar a responder
                </button>
                <button
                  onClick={() => {
                    setShowSubmitConfirm(false);
                    void submitQuiz();
                  }}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500"
                >
                  Terminar mesmo assim
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const sizeControls = (
    <div className="hidden shrink-0 items-center gap-1 sm:flex">
      <button
        onClick={() => setIsWide((v) => !v)}
        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label={isWide ? "Reduzir largura" : "Ampliar largura"}
        title={isWide ? "Reduzir largura" : "Ampliar largura"}
      >
        {isWide ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
      <button
        onClick={() => setIsFullscreen((v) => !v)}
        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label={isFullscreen ? "Sair do ecrã completo" : "Ecrã completo"}
        title={isFullscreen ? "Sair do ecrã completo" : "Ecrã completo"}
      >
        {isFullscreen ? <Minimize2 size={14} className="rotate-90" /> : <Maximize2 size={14} className="rotate-90" />}
      </button>
    </div>
  );

  if (loadError) {
    return overlay(
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center sm:py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/15">
          <AlertOctagon size={24} className="text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Algo correu mal</p>
          <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">{loadError}</p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Fechar
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-500"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (loading || sessionLoading || (phase === "playing" && session === null)) {
    return overlay(
      <div className="flex flex-col items-center gap-4 py-16 sm:py-20">
        <Loader2 size={28} className="animate-spin text-blue-500 dark:text-blue-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">A carregar questionário…</p>
      </div>
    );
  }

  if (phase === "resume_prompt") {
    const savedAnswered = Object.values(session?.answers ?? {}).filter(
      (ids) => ids.length > 0
    ).length;
    const savedTotal = session?.questionIds?.length ?? 0;

    return overlay(
      <div className="space-y-4 p-5 sm:space-y-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {disciplineName} · {chapterTitle}
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          </div>
          <div className="flex items-center gap-1">
            {sizeControls}
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.08]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-amber-500 dark:text-amber-400" />
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              Sessão guardada encontrada
            </p>
          </div>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
            Já respondeste a {savedAnswered}
            {savedTotal ? ` de ${savedTotal}` : ""} perguntas. Queres retomar de onde ficaste?
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={async () => {
              await resetSession();
              setPhase("playing");
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-slate-50 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <RotateCcw size={14} /> Começar de novo
          </button>
          <button
            onClick={() => setPhase("playing")}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
          >
            Retomar <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  if (phase === "submitting")
    return overlay(
      <div className="flex flex-col items-center gap-4 py-16 sm:py-20">
        <Loader2 size={28} className="animate-spin text-blue-500 dark:text-blue-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">A calcular resultado…</p>
      </div>
    );

  if (phase === "results" && finalSummary) {
    const pass = finalSummary.pct >= 50;

    return overlay(
      <div className="flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 dark:border-white/10 sm:px-5 sm:py-4">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Resultado</p>
          <div className="flex items-center gap-1">
            {sizeControls}
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5 lg:p-6">
          {submissionPending && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/[0.08] dark:text-amber-200">
              <p className="font-semibold">Resultado guardado localmente</p>
              <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/70">
                A ligação falhou. Vou reenviar automaticamente quando a rede voltar.
              </p>
            </div>
          )}

          <div
            className={`rounded-2xl border p-5 text-center sm:p-6 ${
              pass
                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5"
                : "border-rose-300 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/5"
            }`}
          >
            <div
              className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full sm:h-16 sm:w-16 ${
                pass ? "bg-emerald-100 dark:bg-emerald-500/15" : "bg-rose-100 dark:bg-rose-500/15"
              }`}
            >
              <Trophy
                size={26}
                className={pass ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
              />
            </div>
            <p
              className={`text-4xl font-black tabular-nums sm:text-5xl ${
                pass ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {finalSummary.pct}%
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {finalSummary.correct} de {finalSummary.total} respostas correctas
            </p>
            {finalSummary.timeSecs != null && (
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <Clock size={11} /> Tempo: {formatTime(finalSummary.timeSecs)}
              </p>
            )}
            <p
              className={`mt-2 text-xs font-semibold ${
                pass ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
              }`}
            >
              {finalSummary.pct >= 90
                ? "Excelente! 🏆"
                : finalSummary.pct >= 70
                ? "Muito bem!"
                : finalSummary.pct >= 50
                ? "Aprovado!"
                : "Continua a estudar!"}
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                Revisão das respostas
              </p>
            </div>

            <div
              className={`overflow-y-auto p-0 ${
                isWide || isFullscreen ? "max-h-[55vh] lg:max-h-[60vh]" : "max-h-72"
              }`}
            >
              <div className={`divide-y divide-slate-200 dark:divide-white/5 ${isWide || isFullscreen ? "lg:grid lg:grid-cols-2 lg:divide-y-0 lg:divide-x" : ""}`}>
                {submittedDetails.map((detail, idx) => (
                  <div key={detail.questionId} className="px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          detail.isCorrect
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                        }`}
                      >
                        {detail.isCorrect ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                          {detail.kindLabel}
                        </p>
                        <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                          {idx + 1}. <MathText text={detail.questionText} />
                        </p>

                        <div className="mt-1 space-y-1">
                          {detail.selectedAnswerTexts.length > 0 ? (
                            <p className="text-[11px] text-rose-600 dark:text-rose-400">
                              A tua resposta:{" "}
                              {detail.selectedAnswerTexts.map((text, i) => (
                                <span key={i}>
                                  <MathText text={text} />
                                  {i < detail.selectedAnswerTexts.length - 1 ? " • " : ""}
                                </span>
                              ))}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-500 dark:text-slate-500">
                              Não respondeste a esta pergunta.
                            </p>
                          )}

                          {!detail.isCorrect && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                              Resposta correcta:{" "}
                              {detail.correctAnswerTexts.map((text, i) => (
                                <span key={i}>
                                  <MathText text={text} />
                                  {i < detail.correctAnswerTexts.length - 1 ? " • " : ""}
                                </span>
                              )) || "—"}
                            </p>
                          )}
                        </div>

                        {detail.selectedAnswerFeedbacks.length > 0 && (
                          <div className="mt-2 rounded-xl bg-white p-2 text-[11px] text-slate-600 shadow-sm dark:bg-white/5 dark:text-slate-400">
                            <p className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                              Feedback
                            </p>
                            <div className="mt-1 space-y-1 leading-relaxed">
                              {detail.selectedAnswerFeedbacks.map((fb, i) => (
                                <p key={i}>
                                  <MathText text={fb} />
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {detail.questionExplanation && (
                          <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-2 text-[11px] text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                            <p className="font-semibold uppercase tracking-wider text-blue-700/80 dark:text-blue-200/80">
                              Explicação
                            </p>
                            <p className="mt-1 leading-relaxed">
                              <MathText text={detail.questionExplanation} />
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={restart}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-slate-50 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <RotateCcw size={14} /> Repetir
            </button>
            <button
              onClick={loadStats}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-500"
            >
              <BarChart2 size={14} /> Estatísticas
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "stats")
    return overlay(
      <div className="flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 dark:border-white/10 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPhase("results")}
              className="rounded-xl p-1.5 text-slate-400 transition hover:text-slate-700 dark:text-slate-500 dark:hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Estatísticas da turma
            </p>
          </div>
          <div className="flex items-center gap-1">
            {sizeControls}
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5 lg:p-6">
          {statsLoading ? (
            <div className="flex items-center justify-center gap-2 py-12">
              <Loader2 size={20} className="animate-spin text-blue-500 dark:text-blue-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                A carregar estatísticas…
              </p>
            </div>
          ) : !stats ? (
            <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-500">
              Sem dados suficientes ainda.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { label: "Tentativas", value: stats.totalAttempts, color: "text-blue-600 dark:text-blue-400" },
                  { label: "Média", value: `${stats.avgScore}%`, color: "text-emerald-600 dark:text-emerald-400" },
                  {
                    label: "Tempo médio",
                    value: stats.avgTimeSecs ? formatTime(stats.avgTimeSecs) : "—",
                    color: "text-violet-600 dark:text-violet-400",
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-center dark:border-white/10 dark:bg-white/5 sm:p-3"
                  >
                    <p className={`text-base font-black sm:text-lg ${color}`}>{value}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              <div className={`space-y-3 ${isWide || isFullscreen ? "lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0" : ""}`}>
                {stats.questionStats.map((qs, idx) => (
                  <div
                    key={qs.questionId}
                    className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900"
                  >
                    <p className="text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-300">
                      {idx + 1}. <MathText text={qs.questionText} />
                    </p>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/5">
                          <div
                            className={`h-full rounded-full transition-all ${
                              qs.correctRate >= 60
                                ? "bg-emerald-500"
                                : qs.correctRate >= 40
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${qs.correctRate}%` }}
                          />
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-sm font-bold tabular-nums ${
                          qs.correctRate >= 60
                            ? "text-emerald-600 dark:text-emerald-400"
                            : qs.correctRate >= 40
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {qs.correctRate}%
                      </span>
                    </div>

                    {qs.correctRate < 50 && (
                      <p className="flex items-center gap-1 text-[11px] text-amber-600/90 dark:text-amber-400/80">
                        <AlertTriangle size={10} />
                        Muitos alunos erraram esta pergunta.
                      </p>
                    )}

                    {qs.topWrongAnswer && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-500">
                        Resposta errada mais escolhida:{" "}
                        <span className="text-rose-600 dark:text-rose-400">
                          <MathText text={qs.topWrongAnswer} />
                        </span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );

  if (!currentQ)
    return overlay(
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="font-semibold text-slate-700 dark:text-slate-300">
          Sem perguntas disponíveis.
        </p>
        <button onClick={onClose} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          Fechar
        </button>
      </div>
    );

  const showSidebar = isWide || isFullscreen;

  const questionContent = (
    <div key={currentQ.id} className="space-y-4 overflow-visible p-4 pb-24 sm:space-y-5 sm:p-5 sm:pb-6 lg:p-6">
      {questionKind && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <QuestionKindBadge info={questionKind} />
          {isMultiSelect && (
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              Seleciona {questionKind.correctCount} opções
            </span>
          )}
        </div>
      )}

      {/* Cartão da pergunta — destaca o enunciado e dá mais espaço a fórmulas/matrizes */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
        <h2 className="break-words text-base font-semibold leading-relaxed text-slate-900 [&_.katex-display]:my-2 [&_.katex]:text-[1.05em] dark:text-white sm:text-lg lg:text-xl">
          <MathText text={currentQ.question_text} />
        </h2>

        {currentQ.metadata?.graph && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950">
            <GraphSVG config={currentQ.metadata.graph} />
          </div>
        )}

        {currentQ.metadata?.image_url && (
          <img
            src={currentQ.metadata.image_url}
            alt="Diagrama da pergunta"
            className="mt-4 max-h-80 w-full rounded-xl border border-slate-200 bg-white object-contain p-2 dark:border-white/10 dark:bg-slate-950"
          />
        )}
      </div>

      <div
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3"
        role={isMultiSelect ? "group" : "radiogroup"}
        aria-label="Opções de resposta"
      >
        {currentQ.answers.map((ans, idx) => {
          const isSelected = selectedIds.includes(ans.id);
          const isCorrectAnswer = ans.is_correct;
          const isLocked = isOptionsLocked;

          let optionClasses =
            "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/[0.06]";
          let badgeClasses =
            "border-slate-300 text-slate-400 dark:border-white/15 dark:text-slate-500";

          if (showFeedback) {
            if (isCorrectAnswer) {
              optionClasses =
                "border-emerald-400 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20";
              badgeClasses =
                "border-emerald-400 bg-emerald-600 text-white dark:border-emerald-500/60";
            } else if (isSelected) {
              optionClasses =
                "border-rose-400 bg-rose-50 text-rose-900 ring-1 ring-rose-200 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20";
              badgeClasses = "border-rose-400 bg-rose-600 text-white dark:border-rose-500/60";
            } else {
              optionClasses =
                "border-slate-200 bg-white text-slate-400 opacity-60 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-500";
            }
          } else if (isSelected) {
            optionClasses =
              "border-blue-400 bg-blue-50 text-slate-900 ring-1 ring-blue-200 dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-white dark:ring-blue-500/30";
            badgeClasses = "border-blue-400 bg-blue-600 text-white dark:border-blue-500/60";
          }

          return (
            <button
              key={ans.id}
              role={isMultiSelect ? "checkbox" : "radio"}
              aria-checked={isSelected}
              disabled={isLocked}
              onClick={() => saveAnswer(currentQ.id, ans.id, { multiple: isMultiSelect })}
              className={`flex min-h-[3.25rem] w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm transition-all active:scale-[0.99] disabled:cursor-not-allowed sm:px-4 sm:py-3.5 lg:text-base ${optionClasses}`}
            >
              {isMultiSelect ? (
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${badgeClasses}`}>
                  {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                </span>
              ) : (
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold transition ${badgeClasses}`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
              )}
              <span className="min-w-0 flex-1 self-center break-words leading-snug [&_.katex-display]:my-1 [&_.katex]:text-[1.05em]">
                <MathText text={ans.answer_text} />

                {ans.metadata?.graph && (
                  <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-slate-950">
                    <GraphSVG config={ans.metadata.graph} />
                  </div>
                )}

                {ans.metadata?.image_url && (
                  <img
                    src={ans.metadata.image_url}
                    alt="Diagrama da resposta"
                    className="mt-2 max-h-40 w-full rounded-xl border border-slate-200 object-contain dark:border-white/10"
                  />
                )}
              </span>
              {showFeedback && isCorrectAnswer && (
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              {showFeedback && isSelected && !isCorrectAnswer && (
                <XCircle size={15} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              {!showFeedback && !isMultiSelect && isSelected && (
                <Check size={15} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
              )}
            </button>
          );
        })}
      </div>

      {isMultiSelect && !confirmedQuestions.has(currentQ.id) && (
        <button
          type="button"
          disabled={selectedIds.length === 0}
          onClick={() =>
            setConfirmedQuestions((prev) => new Set(prev).add(currentQ.id))
          }
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
        >
          <CheckSquare size={15} />
          Confirmar respostas ({selectedIds.length} selecionada{selectedIds.length === 1 ? "" : "s"})
        </button>
      )}

      {showFeedback && (
        <div
          ref={feedbackRef}
          role="status"
          aria-live="polite"
          className={`rounded-2xl border p-4 ${
            isMultiSelect
              ? isCurrentAnswerFullyCorrect
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5"
                : "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5"
              : currentSelectedOption?.is_correct
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5"
              : "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5"
          }`}
        >
          <div className="flex items-center gap-2">
            {(isMultiSelect ? isCurrentAnswerFullyCorrect : currentSelectedOption?.is_correct) ? (
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
            )}
            <p
              className={`text-sm font-semibold ${
                (isMultiSelect ? isCurrentAnswerFullyCorrect : currentSelectedOption?.is_correct)
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {isMultiSelect
                ? isCurrentAnswerFullyCorrect
                  ? "Todas as respostas certas seleccionadas"
                  : "Seleção incompleta ou incorrecta"
                : currentSelectedOption?.is_correct
                ? "Resposta correcta"
                : "Resposta incorrecta"}
            </p>
          </div>

          {!isMultiSelect && currentSelectedOption?.feedback && (
            <p className="mt-2 overflow-x-auto text-sm text-slate-700 [&_.katex]:text-[1.05em] dark:text-slate-300">
              <MathText text={currentSelectedOption.feedback} />
            </p>
          )}

          {isMultiSelect && (
            <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
              {currentQ.answers
                .filter((a) => a.feedback && (a.is_correct || selectedIds.includes(a.id)))
                .map((a) => (
                  <li key={a.id} className="overflow-x-auto leading-relaxed [&_.katex]:text-[1.05em]">
                    <span className="font-semibold">
                      <MathText text={a.answer_text} />
                    </span>
                    : <MathText text={a.feedback as string} />
                  </li>
                ))}
            </ul>
          )}

          {currentQ.explanation && (
            <div className="mt-3 overflow-x-auto rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 [&_.katex]:text-[1.05em] dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
              <p className="font-semibold">Explicação</p>
              <p className="mt-1 leading-relaxed">
                <MathText text={currentQ.explanation} />
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const desktopSidebar = (
    <aside className="hidden w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.02] lg:flex">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
          Navegação rápida
        </p>

        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {orderedQuestions.map((q, idx) => {
            const answered = (session?.answers[q.id]?.length ?? 0) > 0;
            return (
              <button
                key={q.id}
                onClick={() => setQuestion(idx)}
                aria-label={`Ir para pergunta ${idx + 1}`}
                className={`flex h-9 items-center justify-center rounded-lg text-xs font-bold transition ${
                  idx === currentIndex
                    ? "bg-blue-600 text-white"
                    : answered
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
          Estado
        </p>
        <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
          <p>
            Respondidas:{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {answeredCount}
            </span>{" "}
            / {orderedQuestions.length}
          </p>
          <p>
            Faltam:{" "}
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {unansweredCount}
            </span>
          </p>
          {timeLeft !== null && (
            <p className="flex items-center gap-1">
              <Clock size={12} /> Tempo restante: {formatTime(timeLeft)}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
          Atalhos de teclado
        </p>
        <ul className="mt-2 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          <li>
            <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] dark:border-white/15 dark:bg-white/10">
              ←
            </kbd>{" "}
            /{" "}
            <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] dark:border-white/15 dark:bg-white/10">
              →
            </kbd>{" "}
            navegar
          </li>
          <li>
            <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] dark:border-white/15 dark:bg-white/10">
              1–9
            </kbd>{" "}
            escolher resposta
          </li>
          <li>
            <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] dark:border-white/15 dark:bg-white/10">
              Esc
            </kbd>{" "}
            fechar / cancelar
          </li>
        </ul>
      </div>
    </aside>
  );

  return overlay(
    <div className="flex flex-col overflow-hidden" style={{ height: "100%" }}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={handleRequestClose}
            className="shrink-0 rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Fechar questionário"
          >
            <X size={16} />
          </button>

          <button
            onClick={() => void toggleSave()}
            disabled={savingToggle || !profile?.id}
            className={`rounded-xl p-2 transition disabled:opacity-40 ${
              isSaved
                ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/15"
                : "text-slate-400 hover:bg-slate-100 hover:text-amber-600 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-amber-400"
            }`}
            aria-label={isSaved ? "Remover dos guardados" : "Guardar para mais tarde"}
            title={isSaved ? "Remover dos guardados" : "Guardar para mais tarde"}
          >
            {savingToggle ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
            )}
          </button>

          <div className="min-w-0">
            <p className="truncate text-xs text-slate-500 dark:text-slate-500">
              {disciplineName} · {chapterTitle}
            </p>
            <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
              {title}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {timeLeft !== null && (
            <div
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold tabular-nums ${
                timeLeft < 60
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                  : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
              }`}
            >
              <Clock size={11} />
              {formatTime(timeLeft)}
            </div>
          )}

          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            {currentIndex + 1}/{orderedQuestions.length}
          </span>

          <button
            onClick={isSpeaking ? stopSpeech : speakCurrentQuestion}
            className={`rounded-xl p-2 transition ${
              isSpeaking
                ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
            }`}
            title={isSpeaking ? "Parar narração" : "Ler em voz alta"}
            aria-label={isSpeaking ? "Parar narração" : "Ler em voz alta"}
          >
            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          {sizeControls}
        </div>
      </div>

      <div className="h-1 shrink-0 bg-slate-200 dark:bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / orderedQuestions.length) * 100}%` }}
        />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto">{questionContent}</div>
        {showSidebar && desktopSidebar}
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/95">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuestion(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            aria-label="Pergunta anterior"
          >
            <ChevronLeft size={16} />
          </button>

          {isLast ? (
            <button
              onClick={requestSubmit}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-500 active:scale-[0.99]"
            >
              <Check size={15} />
              Terminar ({answeredCount}/{orderedQuestions.length})
            </button>
          ) : (
            <button
              onClick={() => setQuestion(currentIndex + 1)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-500 active:scale-[0.99]"
            >
              Próxima <ChevronRight size={15} />
            </button>
          )}

          {!isLast && (
            <button
              onClick={requestSubmit}
              className="flex h-11 shrink-0 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
              title="Terminar agora"
              aria-label="Terminar questionário agora"
            >
              <Check size={14} />
            </button>
          )}
        </div>

        {!showSidebar && (
          <div className="mt-2.5 flex justify-center gap-1">
            {orderedQuestions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setQuestion(idx)}
                aria-label={`Ir para pergunta ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex
                    ? "w-5 bg-blue-500"
                    : (session?.answers[q.id]?.length ?? 0) > 0
                    ? "w-1.5 bg-emerald-500/60"
                    : "w-1.5 bg-slate-300 dark:bg-white/15"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}