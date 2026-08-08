// app/components/quiz/QuizPlayer.tsx
"use client";

import {
  useEffect, useRef, useState, useCallback, useMemo,
} from "react";
import {
  X, ChevronLeft, ChevronRight, Volume2, VolumeX,
  Clock, Check, RotateCcw, Trophy, XCircle,
  CheckCircle2, AlertTriangle, Loader2, BarChart2,
  ArrowRight,
} from "lucide-react";
import { useSupabase }    from "@/app/lib/context/SupabaseContext";
import { useUser }        from "@/app/lib/context/UserContext";
import { useQuizSession } from "@/app/lib/hooks/useQuizSession";
import { getQuizStats, type QuizStats } from "@/app/actions/quiz-stats";
import type {
  Database,
  QuizResultInsert,
  QuizResultDetailInsert,
} from "@/src/types/database";

/* ================================================================
   TIPOS LOCAIS
   ================================================================ */

export type QuizAnswerOption = {
  id:          string
  answer_text: string
  is_correct:  boolean
  order_index: number
}

export type QuizQuestion = {
  id:            string
  question_text: string
  order_index:   number
  answers:       QuizAnswerOption[]
}

type Phase = "resume_prompt" | "playing" | "submitting" | "results" | "stats"

type DetailRow = {
  question_id:        string
  selected_answer_id: string | null
  is_correct:         boolean
}

/* ================================================================
   HELPER
   ================================================================ */

function formatTime(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

/* ================================================================
   PROPS
   ================================================================ */

type Props = {
  contentId:          string
  title:              string
  disciplineName:     string
  chapterTitle:       string
  timeLimitSeconds?:  number | null
  onClose:            () => void
}

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
  const { supabase } = useSupabase()
  const { profile }  = useUser()

  /* ── Dados ── */
  const [questions,  setQuestions]  = useState<QuizQuestion[]>([])
  const [loading,    setLoading]    = useState(true)
  const [phase,      setPhase]      = useState<Phase>("playing")

  /* ── Sessão ── */
  const {
    session,
    isLoading: sessionLoading,
    saveAnswer,
    setQuestion,
    tickTimer,
    clearSession,
    loadSession,
  } = useQuizSession(contentId, timeLimitSeconds)

  /* ── Resultados ── */
  const [stats,        setStats]        = useState<QuizStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  /* ── Narração ── */
  const [isSpeaking, setIsSpeaking] = useState(false)
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)

  /* ── Timer ── */
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── Carregar questões ── */
useEffect(() => {
  async function load() {
    setLoading(true)

    try {
      type QuizQuestionRow = {
        id: string
        question_text: string
        order_index: number
      }

      type QuizAnswerRow = {
        id: string
        question_id: string
        answer_text: string
        is_correct: boolean
        order_index: number
      }

      // 1) Buscar perguntas
      const { data: questionRows, error: questionError } = await supabase
        .from("quiz_questions")
        .select("id, question_text, order_index")
        .eq("content_id", contentId)
        .order("order_index")

      if (questionError) throw questionError

      const questionsData = (questionRows ?? []) as QuizQuestionRow[]
      const questionIds = questionsData.map((q) => q.id)

      // 2) Buscar respostas
      const { data: answerRows, error: answerError } = questionIds.length
        ? await supabase
            .from("quiz_answers")
            .select("id, question_id, answer_text, is_correct, order_index")
            .in("question_id", questionIds)
            .order("order_index")
        : { data: [] as QuizAnswerRow[], error: null }

      if (answerError) throw answerError

      const answersData = (answerRows ?? []) as QuizAnswerRow[]

      // 3) Agrupar respostas por pergunta
      const answersByQuestion = new Map<string, QuizAnswerOption[]>()

      for (const answer of answersData) {
        const list = answersByQuestion.get(answer.question_id) ?? []
        list.push({
          id: answer.id,
          answer_text: answer.answer_text,
          is_correct: answer.is_correct,
          order_index: answer.order_index,
        })
        answersByQuestion.set(answer.question_id, list)
      }

      // 4) Montar o array final
      setQuestions(
        questionsData.map((q) => ({
          id: q.id,
          question_text: q.question_text,
          order_index: q.order_index,
          answers: (answersByQuestion.get(q.id) ?? []).sort(
            (a, b) => a.order_index - b.order_index
          ),
        }))
      )
    } catch (err) {
      console.error("Erro ao carregar questões:", err)
    } finally {
      setLoading(false)
    }
  }

  void load()
}, [supabase, contentId])

  /* ── Verificar sessão activa ── */
  useEffect(() => {
    if (loading || sessionLoading) return
    async function check() {
      const existing = await loadSession()
      if (
        existing &&
        (existing.currentQuestionIndex > 0 ||
          Object.keys(existing.answers).length > 0)
      ) {
        setPhase("resume_prompt")
      }
    }
    void check()
  }, [loading, sessionLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Timer ── */
  useEffect(() => {
    if (phase !== "playing" || !timeLimitSeconds) return
    timerRef.current = setInterval(() => {
      tickTimer()
      if ((session?.timeRemainingSeconds ?? 1) <= 1) {
        if (timerRef.current) clearInterval(timerRef.current)
        void submitQuiz()
      }
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, timeLimitSeconds]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Narração ── */
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt  = new SpeechSynthesisUtterance(text)
    utt.lang   = "pt-PT"
    utt.onstart = () => setIsSpeaking(true)
    utt.onend = utt.onerror = () => setIsSpeaking(false)
    speechRef.current = utt
    window.speechSynthesis.speak(utt)
  }, [])

  const stopSpeech = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  const speakCurrentQuestion = useCallback(() => {
    if (!session) return
    const q = questions[session.currentQuestionIndex]
    if (!q) return
    const text = `${q.question_text}. ${q.answers
      .map((a, i) => `${String.fromCharCode(65 + i)}: ${a.answer_text}`)
      .join(". ")}`
    speak(text)
  }, [session, questions, speak])

  /* ── Submeter quiz ── */
  const submitQuiz = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    stopSpeech()
    setPhase("submitting")

    const savedAnswers = session?.answers ?? {}
    let correct = 0
    const details: DetailRow[] = []

    for (const q of questions) {
      const selectedId = savedAnswers[q.id] ?? null
      const correctOpt = q.answers.find((a) => a.is_correct)
      const isCorrect  = !!selectedId && selectedId === correctOpt?.id
      if (isCorrect) correct++
      details.push({
        question_id:        q.id,
        selected_answer_id: selectedId,
        is_correct:         isCorrect,
      })
    }

    const total    = questions.length
    const score    = total ? Math.round((correct / total) * 100) : 0
    const timeSecs =
      timeLimitSeconds != null && session?.timeRemainingSeconds != null
        ? timeLimitSeconds - session.timeRemainingSeconds
        : null

    try {
      if (profile) {
        /* ── Inserir resultado ── */
        // ── Inserir resultado ──
const resultPayload: QuizResultInsert = {
  student_id: profile.id,
  content_id: contentId,
  score,
  total_questions: total,
  correct_answers: correct,
  time_spent_seconds: timeSecs,
}

const resultsTable = supabase.from("quiz_results") as any

const { data: insertedResult, error: resultError } = await resultsTable
  .insert(resultPayload)
  .select("id")
  .single()

if (resultError || !insertedResult) {
  throw resultError ?? new Error("Falha ao criar resultado")
}

// ── Inserir detalhes ──
const detailRows: QuizResultDetailInsert[] = details.map((d) => ({
  result_id: insertedResult.id,
  question_id: d.question_id,
  selected_answer_id: d.selected_answer_id,
  is_correct: d.is_correct,
  time_spent_seconds: null,
}))

const detailsTable = supabase.from("quiz_results_details") as any
const { error: detailsError } = await detailsTable.insert(detailRows)

if (detailsError) {
  throw detailsError
}
      }
    } catch (e) {
      console.error("Erro ao guardar resultado:", e)
    } finally {
      await clearSession()
      setPhase("results")
    }
  }, [
    session,
    questions,
    profile,
    supabase,
    contentId,
    timeLimitSeconds,
    clearSession,
    stopSpeech,
  ])

  /* ── Reiniciar ── */
  const restart = async () => {
    stopSpeech()
    await clearSession()
    setPhase("playing")
  }

  /* ── Estatísticas ── */
  const loadStats = async () => {
    setStatsLoading(true)
    setPhase("stats")
    try {
      const s = await getQuizStats(contentId)
      setStats(s)
    } finally {
      setStatsLoading(false)
    }
  }

  /* ── Computed ── */
  const currentIndex  = session?.currentQuestionIndex ?? 0
  const currentQ      = questions[currentIndex] ?? null
  const selectedId    = currentQ ? (session?.answers[currentQ.id] ?? null) : null
  const timeLeft      = session?.timeRemainingSeconds ?? null
  const isLast        = currentIndex === questions.length - 1
  const answeredCount = Object.keys(session?.answers ?? {}).length

  const resultScore = useMemo(() => {
    if (phase !== "results") return null
    if (questions.length === 0) return { correct: 0, total: 0, pct: 0 }
    let correct = 0
    for (const q of questions) {
      const sel        = session?.answers[q.id]
      const correctOpt = q.answers.find((a) => a.is_correct)
      if (sel && sel === correctOpt?.id) correct++
    }
    return {
      correct,
      total: questions.length,
      pct:   Math.round((correct / questions.length) * 100),
    }
  }, [phase, questions, session?.answers])

  /* ================================================================
     OVERLAY WRAPPER
     ================================================================ */
  const overlay = (content: React.ReactNode) => (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 backdrop-blur-md dark:bg-slate-950/90 p-0 sm:items-center sm:p-4">
      <div
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:rounded-3xl"
        style={{ maxHeight: "95dvh" }}
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" />
        </div>
        {content}
      </div>
    </div>
  )

  /* ================================================================
     FASES
     ================================================================ */

  /* Loading */
  if (loading) return overlay(
    <div className="flex flex-col items-center gap-4 py-16 sm:py-20">
      <Loader2 size={28} className="animate-spin text-blue-500 dark:text-blue-400" />
      <p className="text-sm text-slate-500 dark:text-slate-400">A carregar questionário…</p>
    </div>
  )

  /* Retomar sessão */
  if (phase === "resume_prompt") return overlay(
    <div className="space-y-4 p-5 sm:space-y-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-500">{disciplineName} · {chapterTitle}</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.08]">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0 text-amber-500 dark:text-amber-400" />
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Sessão guardada encontrada</p>
        </div>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
          Tens um questionário por terminar. Queres retomar de onde ficaste?
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={async () => { await clearSession(); setPhase("playing") }}
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
  )

  /* A submeter */
  if (phase === "submitting") return overlay(
    <div className="flex flex-col items-center gap-4 py-16 sm:py-20">
      <Loader2 size={28} className="animate-spin text-blue-500 dark:text-blue-400" />
      <p className="text-sm text-slate-500 dark:text-slate-400">A calcular resultado…</p>
    </div>
  )

  /* Resultados */
  if (phase === "results" && resultScore) {
    const pass = resultScore.pct >= 50
    return overlay(
      <div className="flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 dark:border-white/10 sm:px-5 sm:py-4">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Resultado</p>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* Score */}
          <div className={`rounded-2xl border p-5 text-center sm:p-6 ${
            pass
              ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5"
              : "border-rose-300 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/5"
          }`}>
            <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full sm:h-16 sm:w-16 ${
              pass ? "bg-emerald-100 dark:bg-emerald-500/15" : "bg-rose-100 dark:bg-rose-500/15"
            }`}>
              <Trophy size={26} className={pass ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
            </div>
            <p className={`text-4xl font-black tabular-nums sm:text-5xl ${
              pass ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}>
              {resultScore.pct}%
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {resultScore.correct} de {resultScore.total} respostas correctas
            </p>
            <p className={`mt-2 text-xs font-semibold ${
              pass ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
            }`}>
              {resultScore.pct >= 90
                ? "Excelente! 🏆"
                : resultScore.pct >= 70
                ? "Muito bem!"
                : resultScore.pct >= 50
                ? "Aprovado!"
                : "Continua a estudar!"}
            </p>
          </div>

          {/* Revisão rápida */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                Revisão das respostas
              </p>
            </div>
            <div className="max-h-64 divide-y divide-slate-200 overflow-y-auto dark:divide-white/5">
              {questions.map((q, idx) => {
                const sel        = session?.answers[q.id] ?? null
                const correctOpt = q.answers.find((a) => a.is_correct)
                const isCorrect  = !!sel && sel === correctOpt?.id
                const selOption  = q.answers.find((a) => a.id === sel)
                return (
                  <div key={q.id} className="px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        isCorrect
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                          : "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                      }`}>
                        {isCorrect
                          ? <CheckCircle2 size={12} />
                          : <XCircle     size={12} />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                          {idx + 1}. {q.question_text}
                        </p>
                        {!isCorrect && (
                          <>
                            {selOption && (
                              <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                                A tua resposta: {selOption.answer_text}
                              </p>
                            )}
                            <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                              Resposta correcta: {correctOpt?.answer_text ?? "—"}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Acções */}
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
    )
  }

  /* Estatísticas */
  if (phase === "stats") return overlay(
    <div className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 dark:border-white/10 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPhase("results")}
            className="rounded-xl p-1.5 text-slate-400 transition hover:text-slate-700 dark:text-slate-500 dark:hover:text-white"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Estatísticas da turma</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {statsLoading ? (
          <div className="flex items-center justify-center gap-2 py-12">
            <Loader2 size={20} className="animate-spin text-blue-500 dark:text-blue-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">A carregar estatísticas…</p>
          </div>
        ) : !stats ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-500">
            Sem dados suficientes ainda.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "Tentativas",  value: stats.totalAttempts,                                    color: "text-blue-600 dark:text-blue-400"    },
                { label: "Média",       value: `${stats.avgScore}%`,                                   color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Tempo médio", value: stats.avgTimeSecs ? formatTime(stats.avgTimeSecs) : "—", color: "text-violet-600 dark:text-violet-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-center dark:border-white/10 dark:bg-white/5 sm:p-3">
                  <p className={`text-base font-black sm:text-lg ${color}`}>{value}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {stats.questionStats.map((qs, idx) => (
                <div
                  key={qs.questionId}
                  className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900"
                >
                  <p className="text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-300">
                    {idx + 1}. {qs.questionText}
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
                    <span className={`shrink-0 text-sm font-bold tabular-nums ${
                      qs.correctRate >= 60
                        ? "text-emerald-600 dark:text-emerald-400"
                        : qs.correctRate >= 40
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}>
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
                      <span className="text-rose-600 dark:text-rose-400">{qs.topWrongAnswer}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )

  /* Sem perguntas */
  if (!currentQ) return overlay(
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="font-semibold text-slate-700 dark:text-slate-300">Sem perguntas disponíveis.</p>
      <button
        onClick={onClose}
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        Fechar
      </button>
    </div>
  )

  /* ================================================================
     FASE PLAYING
     ================================================================ */
  return overlay(
    <div className="flex flex-col overflow-hidden" style={{ maxHeight: "95dvh" }}>

      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onClose}
            className="shrink-0 rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={16} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-500 dark:text-slate-500">
              {disciplineName} · {chapterTitle}
            </p>
            <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">{title}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {timeLeft !== null && (
            <div className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold tabular-nums ${
              timeLeft < 60
                ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
            }`}>
              <Clock size={11} />
              {formatTime(timeLeft)}
            </div>
          )}

          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            {currentIndex + 1}/{questions.length}
          </span>

          <button
            onClick={isSpeaking ? stopSpeech : speakCurrentQuestion}
            className={`rounded-xl p-2 transition ${
              isSpeaking
                ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
            }`}
            title={isSpeaking ? "Parar narração" : "Ler em voz alta"}
          >
            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 shrink-0 bg-slate-200 dark:bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Pergunta */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">
          <h2 className="text-base font-semibold leading-relaxed text-slate-900 dark:text-white sm:text-lg">
            {currentQ.question_text}
          </h2>

          <div className="space-y-2 sm:space-y-2.5">
            {currentQ.answers.map((ans, idx) => {
              const isSelected = selectedId === ans.id
              return (
                <button
                  key={ans.id}
                  onClick={() => saveAnswer(currentQ.id, ans.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm transition-all sm:px-4 sm:py-3.5 ${
                    isSelected
                      ? "border-blue-400 bg-blue-50 text-slate-900 ring-1 ring-blue-200 dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-white dark:ring-blue-500/30"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold transition ${
                    isSelected
                      ? "border-blue-400 bg-blue-600 text-white dark:border-blue-500/60"
                      : "border-slate-300 text-slate-400 dark:border-white/15 dark:text-slate-500"
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1 leading-snug">{ans.answer_text}</span>
                  {isSelected && <Check size={15} className="shrink-0 text-blue-600 dark:text-blue-400" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Navegação */}
      <div className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/95">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuestion(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <ChevronLeft size={16} />
          </button>

          {isLast ? (
            <button
              onClick={() => void submitQuiz()}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-500"
            >
              <Check size={15} />
              Terminar ({answeredCount}/{questions.length})
            </button>
          ) : (
            <button
              onClick={() => setQuestion(currentIndex + 1)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-500"
            >
              Próxima <ChevronRight size={15} />
            </button>
          )}

          {!isLast && (
            <button
              onClick={() => void submitQuiz()}
              className="flex h-11 shrink-0 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
              title="Terminar agora"
            >
              <Check size={14} />
            </button>
          )}
        </div>

        {/* Dots */}
        <div className="mt-2.5 flex justify-center gap-1">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setQuestion(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex
                  ? "w-5 bg-blue-500"
                  : session?.answers[q.id]
                  ? "w-1.5 bg-emerald-500/60"
                  : "w-1.5 bg-slate-300 dark:bg-white/15"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}