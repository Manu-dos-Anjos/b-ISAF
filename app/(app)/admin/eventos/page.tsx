// app/(app)/admin/eventos/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar, Clock, MapPin, Star, Loader2, AlertTriangle, CheckCircle2,
  Sparkles, Trash2, Image as ImageIcon, ExternalLink, RefreshCw, X,
  Play, Link2, ClipboardList, ChevronRight,
} from "lucide-react";
import { useAdmin } from "@/app/lib/hooks/useAdmin";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import {
  parseWhatsAppEvent,
  type ParsedEvent,
  type EventLink,
} from "@/app/lib/events/parseWhatsAppEvent";
import { CATEGORY_META, type EventCategory } from "@/app/lib/events/classifyCategory";

/* ================================================================
   TIPOS
================================================================ */

type EventRow = {
  id: string;
  title: string;
  category: string;
  date_start: string | null;
  date_end: string | null;
  time_label: string | null;
  location: string | null;
  image_url: string | null;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
};

type Draft = {
  title: string;
  theme: string;
  category: EventCategory;
  description: string;
  dateLabel: string;
  dateStart: string;
  dateEnd: string;
  registrationLabel: string;
  registrationStart: string;
  registrationEnd: string;
  timeLabel: string;
  location: string;
  priceLabel: string;
  isFree: boolean | null;
  links: EventLink[];
  mediaImages: string[];
  mediaVideos: string[];
  isFeatured: boolean;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  theme: "",
  category: "comunidade",
  description: "",
  dateLabel: "",
  dateStart: "",
  dateEnd: "",
  registrationLabel: "",
  registrationStart: "",
  registrationEnd: "",
  timeLabel: "",
  location: "",
  priceLabel: "",
  isFree: null,
  links: [],
  mediaImages: [],
  mediaVideos: [],
  isFeatured: false,
};

/* ================================================================
   HELPERS
================================================================ */

const parseIso = (iso: string) => new Date(`${iso}T00:00:00`);

const todayStart = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return parseIso(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

function isExpired(ev: EventRow): boolean {
  const last = ev.date_end ?? ev.date_start;
  if (!last) return false;
  return parseIso(last) < todayStart();
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} d`;
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

const LINK_META: Record<EventLink["kind"], { label: string; icon: typeof MapPin }> = {
  map:    { label: "Mapa",   icon: MapPin },
  stream: { label: "Stream", icon: Play },
  apply:  { label: "Candidatura", icon: ClipboardList },
  info:   { label: "Info",   icon: Link2 },
};

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/5 dark:text-white";
const labelCls =
  "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";

/* ================================================================
   COMPONENTE
================================================================ */

export default function AdminEventosPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { supabase } = useSupabase();

  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [parsed, setParsed] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [imgInputKey, setImgInputKey] = useState(0);
  const [mediaInputKey, setMediaInputKey] = useState(0);

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishOk, setPublishOk] = useState(false);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  /* ── Carregar lista ── */
  const loadEvents = useCallback(async () => {
    setLoadingList(true);
    const { data } = await supabase
      .from("events")
      .select("id, title, theme, category, date_start, date_end, time_label, location, image_url, is_featured, is_published, created_at")
      .order("created_at", { ascending: false });
    setEvents((data as EventRow[]) ?? []);
    setLoadingList(false);
  }, [supabase]);

  useEffect(() => {
    if (isAdmin) void loadEvents();
  }, [isAdmin, loadEvents]);

  /* ── Imagem ── */
  const handleImage = (file: File | null) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  /* ── Analisar mensagem ── */
  const analyze = () => {
    const p: ParsedEvent = parseWhatsAppEvent(message);
    setDraft({
      title: p.title,
      theme: p.theme ?? "",
      category: p.category,
      description: p.description,
      dateLabel: p.dateLabel ?? "",
      dateStart: p.dateStart ?? "",
      dateEnd: p.dateEnd ?? "",
      registrationLabel: p.registrationLabel ?? "",
      registrationStart: p.registrationStart ?? "",
      registrationEnd: p.registrationEnd ?? "",
      timeLabel: p.timeLabel ?? "",
      location: p.location ?? "",
      priceLabel: p.priceLabel ?? "",
      isFree: p.isFree,
      links: p.links,
      mediaImages: p.images,
      mediaVideos: p.videos,
      isFeatured: false,
    });
    setWarnings(p.warnings);
    setParsed(true);
    setPublishOk(false);
  };

  const resetForm = () => {
    setDraft(EMPTY_DRAFT);
    setMessage("");
    setWarnings([]);
    setParsed(false);
    handleImage(null);
    setMediaFiles([]);
    setMediaInputKey((key) => key + 1);
    setImgInputKey((k) => k + 1);
    setPublishOk(false);
    setPublishError(null);
  };

  /* ── Publicar ── */
  const publish = async () => {
    setPublishing(true);
    setPublishError(null);
    setPublishOk(false);

    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        title: draft.title,
        theme: draft.theme || null,
        category: draft.category,
        description: draft.description || null,
        dateLabel: draft.dateLabel || null,
        dateStart: draft.dateStart || null,
        dateEnd: draft.dateEnd || null,
        registrationLabel: draft.registrationLabel || null,
        registrationStart: draft.registrationStart || null,
        registrationEnd: draft.registrationEnd || null,
        timeLabel: draft.timeLabel || null,
        location: draft.location || null,
        priceLabel: draft.priceLabel || null,
        isFree: draft.isFree,
        links: draft.links,
        mediaImages: draft.mediaImages,
        mediaVideos: draft.mediaVideos,
        isFeatured: draft.isFeatured,
      })
    );
    if (imageFile) form.append("image", imageFile);
    mediaFiles.forEach((file) => form.append("mediaFiles", file));

    try {
      const res = await fetch("/api/admin/events", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao publicar.");

      setPublishOk(true);
      resetForm();
      void loadEvents();
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Erro ao publicar.");
    } finally {
      setPublishing(false);
    }
  };

  /* ── Gerir lista ── */
  const toggleFeatured = async (ev: EventRow) => {
    setTogglingId(ev.id);
    await supabase.from("events").update({ is_featured: !ev.is_featured }).eq("id", ev.id);
    setTogglingId(null);
    void loadEvents();
  };

  const removeEvent = async (ev: EventRow) => {
    if (!confirm(`Apagar o evento "${ev.title}"? O banner no R2 também será apagado.`)) return;
    setDeletingId(ev.id);
    const res = await fetch(`/api/admin/events?id=${ev.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      alert(json.error ?? "Erro ao apagar.");
    }
    setDeletingId(null);
    void loadEvents();
  };

  /* ── Stats ── */
  const stats = useMemo(() => {
    const active = events.filter((e) => !isExpired(e) && e.is_published);
    return {
      total: events.length,
      active: active.length,
      featured: events.filter((e) => e.is_featured).length,
      expired: events.filter((e) => isExpired(e)).length,
    };
  }, [events]);

  if (adminLoading) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <AlertTriangle size={32} className="text-rose-500" />
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Área restrita</p>
      </div>
    );
  }

  const catMeta = CATEGORY_META[draft.category];

  return (
    <div className="space-y-4">
      {/* ── Cabeçalho ── */}
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-slate-950/50 dark:shadow-none sm:rounded-2xl sm:p-5 md:p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-slate-50 dark:from-violet-950/60 dark:via-slate-950/80 dark:to-slate-950" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-600/15 dark:text-violet-400">
              <Calendar size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">Gestão de Eventos</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cola a mensagem do WhatsApp, confirma os dados e publica.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              {stats.active} ativos
            </span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              {stats.featured} destacados
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {stats.expired} expirados
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* ══════════ COLUNA ESQUERDA: FORMULÁRIO ══════════ */}
        <div className="space-y-4">
          {/* 1 · Mensagem */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/40">
            <div className="mb-2 flex items-center justify-between">
              <label className={labelCls + " mb-0"}>1 · Mensagem do WhatsApp</label>
              {message && (
                <button
                  type="button"
                  onClick={() => { setMessage(""); setParsed(false); setWarnings([]); }}
                  className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X size={10} /> Limpar
                </button>
              )}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Cola aqui a mensagem completa do evento…"
              className={`${inputCls} resize-y font-mono text-xs leading-relaxed`}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                O parser extrai título, data, hora, local, preço, links e categoria.
              </p>
              <button
                type="button"
                onClick={analyze}
                disabled={message.trim().length < 10}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sparkles size={13} /> Analisar
              </button>
            </div>

            {warnings.length > 0 && (
              <div className="mt-3 space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/[0.08]">
                {warnings.map((w, i) => (
                  <p key={i} className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                    <AlertTriangle size={11} className="shrink-0" /> {w}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* 2 · Campos editáveis */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/40">
            <div className="flex items-center justify-between">
              <label className={labelCls + " mb-0"}>2 · Confirmar / corrigir dados</label>
              {parsed && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <CheckCircle2 size={10} /> Preenchido pelo parser
                </span>
              )}
            </div>

            <div>
              <label className={labelCls}>Título *</label>
              <input value={draft.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Categoria (sugerida)</label>
                <select
                  value={draft.category}
                  onChange={(e) => set("category", e.target.value as EventCategory)}
                  className={inputCls}
                >
                  {(Object.keys(CATEGORY_META) as EventCategory[]).map((c) => (
                    <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Tema (opcional)</label>
                <input
                  value={draft.theme}
                  onChange={(e) => set("theme", e.target.value)}
                  placeholder="Ex: Da Estruturação aos Resultados..."
                  className={inputCls}
                />
                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                  Extraído automaticamente do campo "Tema:" da mensagem. Aparece destacado nos cards.
                </p>
              </div>
              <div>
                <label className={labelCls}>Preço (opcional)</label>
                <select
                  value={
                    draft.isFree === null
                      ? "nao_especificado"
                      : draft.isFree ? "sim" : "nao"
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    set("isFree", val === "nao_especificado" ? null : val === "sim");
                  }}
                  className={inputCls}
                >
                  <option value="nao_especificado">Não especificado</option>
                  <option value="sim">Gratuito</option>
                  <option value="nao">Pago</option>
                </select>
                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                  Se não especificares, o parser tenta detetar automaticamente.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Início</label>
                <input type="date" value={draft.dateStart} onChange={(e) => set("dateStart", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fim (opcional)</label>
                <input type="date" value={draft.dateEnd} onChange={(e) => set("dateEnd", e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Data aproximada (quando só houver mês/ano)</label>
              <input value={draft.dateLabel} onChange={(e) => set("dateLabel", e.target.value)} placeholder="Ex.: Outubro 2026" className={inputCls} />
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Usa este campo se a divulgação não indicar o dia; o evento não será colocado num dia inventado.</p>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-white/10">
              <div>
                <label className={labelCls}>Prazo/período de inscrição (separado da data do evento)</label>
                <input value={draft.registrationLabel} onChange={(e) => set("registrationLabel", e.target.value)} placeholder="Ex.: Candidaturas até 4 de outubro" className={inputCls} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className={labelCls}>Início das inscrições (opcional)</label><input type="date" value={draft.registrationStart} onChange={(e) => set("registrationStart", e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Fim das inscrições (opcional)</label><input type="date" value={draft.registrationEnd} onChange={(e) => set("registrationEnd", e.target.value)} className={inputCls} /></div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Hora</label>
                <input value={draft.timeLabel} onChange={(e) => set("timeLabel", e.target.value)} placeholder="18:00" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Local</label>
                <input value={draft.location} onChange={(e) => set("location", e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Texto do preço (opcional)</label>
              <input value={draft.priceLabel} onChange={(e) => set("priceLabel", e.target.value)} placeholder="Gratuita" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Descrição</label>
              <textarea
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                rows={5}
                className={`${inputCls} resize-y`}
              />
            </div>

            {draft.links.length > 0 && (
              <div>
                <label className={labelCls}>Links detectados ({draft.links.length})</label>
                <div className="space-y-1.5">
                  {draft.links.map((l, i) => {
                    const lm = LINK_META[l.kind];
                    const Icon = lm.icon;
                    return (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
                        <Icon size={12} className="shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600 dark:text-slate-300">{l.url}</span>
                        <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          {lm.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(draft.mediaImages.length > 0 || draft.mediaVideos.length > 0) && (
              <div className="space-y-1.5">
                <label className={labelCls}>Mídia reconhecida no texto</label>
                {[...draft.mediaImages.map((url) => ({ url, type: "Imagem" })), ...draft.mediaVideos.map((url) => ({ url, type: "Vídeo" }))].map((media) => (
                  <div key={media.url} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] dark:border-white/10 dark:bg-white/5">
                    <span className="shrink-0 font-semibold text-slate-500">{media.type}</span><span className="min-w-0 truncate text-slate-600 dark:text-slate-300">{media.url}</span>
                  </div>
                ))}
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={draft.isFeatured}
                onChange={(e) => set("isFeatured", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Star size={12} className="text-amber-500" /> Destacar na página de eventos
            </label>
          </div>

          {/* 3 · Banner */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/40">
            <label className={labelCls}>3 · Banner / imagem (opcional)</label>
            <input
              key={imgInputKey}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
              className="hidden"
              id="event-banner-input"
            />
            {imagePreview ? (
              <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Pré-visualização do banner"
                  className="max-h-64 w-full object-contain bg-slate-100 dark:bg-slate-900"
                />
                <div className="absolute right-2 top-2 flex gap-1.5">
                  <a
                    href={imagePreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ampliar"
                    className="rounded-lg bg-black/50 p-1.5 text-white backdrop-blur transition hover:bg-black/70"
                  >
                    <ExternalLink size={12} />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleImage(null)}
                    title="Remover"
                    className="rounded-lg bg-black/50 p-1.5 text-white backdrop-blur transition hover:bg-rose-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="event-banner-input"
                className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8 text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-indigo-500/30"
              >
                <ImageIcon size={20} />
                <span className="text-xs font-medium">Escolher imagem (JPEG, PNG, WebP · máx 5 MB)</span>
              </label>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/40">
            <label htmlFor="event-media-input" className={labelCls}>4 · Imagens adicionais e vídeos (múltiplos)</label>
            <input
              key={mediaInputKey}
              id="event-media-input"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,video/3gpp"
              onChange={(event) => setMediaFiles((previous) => [...previous, ...Array.from(event.target.files ?? [])])}
              className="sr-only"
            />
            <label htmlFor="event-media-input" className="flex min-h-16 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-300 dark:hover:border-indigo-500/30">
              <ImageIcon size={18} /><span className="text-xs font-semibold">Adicionar imagens ou vídeos</span>
              <span className="text-[10px] text-slate-500">JPEG, PNG, WebP até 5 MB · MP4, WebM, MOV ou 3GP até 100 MB</span>
            </label>
            {mediaFiles.length > 0 && <div className="mt-2 space-y-1.5">{mediaFiles.map((file, index) => (
              <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] dark:border-white/10">
                <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{file.name}</span><span className="shrink-0 text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                <button type="button" onClick={() => setMediaFiles((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover ${file.name}`} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><X size={12} /></button>
              </div>
            ))}</div>}
          </div>

          {/* Acções */}
          <div className="space-y-2">
            {publishError && (
              <p className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                <AlertTriangle size={12} /> {publishError}
              </p>
            )}
            {publishOk && (
              <p className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 size={12} /> Evento publicado com sucesso.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => void publish()}
                disabled={publishing || !draft.title.trim()}
                className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {publishing ? <Loader2 size={15} className="animate-spin" /> : <Calendar size={15} />}
                {publishing ? "A publicar…" : "Publicar evento"}
              </button>
            </div>
          </div>
        </div>

        {/* ══════════ COLUNA DIREITA: PREVIEW + LISTA ══════════ */}
        <div className="space-y-4">
          {/* Preview */}
          <div>
            <p className={labelCls}>Pré-visualização</p>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/40">
              <div className="relative flex min-h-[9rem] items-center justify-center bg-slate-100 dark:bg-slate-900">
                {imagePreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Pré-visualização do cartaz"
                      className="max-h-56 w-full object-contain"
                    />
                    <a
                      href={imagePreview}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ampliar imagem"
                      className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 text-white backdrop-blur transition hover:bg-black/70"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </>
                ) : (
                  <div className="flex h-24 w-full flex-col items-center justify-center gap-1 text-slate-300 dark:text-slate-700">
                    <ImageIcon size={22} />
                    <span className="text-[10px] font-medium">Sem imagem</span>
                  </div>
                )}
              </div>
              <div className="space-y-2 p-3">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${catMeta.chipClasses}`}>
                  {catMeta.label}
                </span>
                <p className="text-sm font-bold leading-snug text-slate-900 dark:text-white">
                  {draft.title || "Título do evento"}
                </p>

                {draft.theme && (
                  <p className="line-clamp-2 text-[11px] italic leading-snug text-slate-600 dark:text-slate-400">
                    <span className="not-italic font-semibold text-amber-700 dark:text-amber-400">Tema:</span>{" "}
                    {draft.theme}
                  </p>
                )}

                <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {(draft.dateStart || draft.dateLabel) && (
                    <p className="flex items-center gap-1.5">
                      <Calendar size={11} />
                      {draft.dateStart
                        ? `${fmtDate(draft.dateStart)}${draft.dateEnd && draft.dateEnd !== draft.dateStart ? ` – ${fmtDate(draft.dateEnd)}` : ""}`
                        : draft.dateLabel}
                    </p>
                  )}
                  {draft.timeLabel && (
                    <p className="flex items-center gap-1.5"><Clock size={11} /> {draft.timeLabel}</p>
                  )}
                  {draft.location && (
                    <p className="flex items-center gap-1.5"><MapPin size={11} /> {draft.location}</p>
                  )}
                  {draft.isFree && (
                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      Gratuita
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Lista de eventos */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className={labelCls + " mb-0"}>Eventos publicados ({events.length})</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void loadEvents()}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
                  title="Atualizar"
                >
                  <RefreshCw size={13} className={loadingList ? "animate-spin" : ""} />
                </button>
                <Link
                  href="/eventos"
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                >
                  Ver página <ExternalLink size={10} />
                </Link>
              </div>
            </div>

            {loadingList ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex animate-pulse items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-white/10 dark:bg-slate-950/40">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-200 dark:bg-white/10" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
                      <div className="h-2.5 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.02]">
                Ainda não há eventos publicados.
              </p>
            ) : (
              <div className="space-y-2">
                {events.map((ev) => {
                  const meta = CATEGORY_META[catOf(ev.category)];
                  const expired = isExpired(ev);
                  return (
                    <div
                      key={ev.id}
                      className={`flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-white/10 dark:bg-slate-950/40 ${expired ? "opacity-60" : ""}`}
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
                        {ev.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={ev.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-300 dark:text-slate-700">
                            <ImageIcon size={14} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{ev.title}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                          <span className={`rounded-full border px-1.5 py-px font-semibold uppercase ${meta.chipClasses}`}>
                            {meta.label}
                          </span>
                          {ev.date_start && <span>{fmtDate(ev.date_start)}</span>}
                          <span className="text-slate-400">· Publicado {fmtRelative(ev.created_at)}</span>
                          {expired && (
                            <span className="rounded-full bg-slate-200 px-1.5 py-px font-semibold uppercase text-slate-600 dark:bg-white/10 dark:text-slate-300">
                              Expirado
                            </span>
                          )}
                        </p>
                        {(ev as any).theme && (
                          <p className="mt-0.5 line-clamp-1 text-[10px] italic text-slate-500 dark:text-slate-400">
                            {(ev as any).theme}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void toggleFeatured(ev)}
                          disabled={togglingId === ev.id}
                          title={ev.is_featured ? "Remover destaque" : "Destacar"}
                          className={`rounded-lg p-1.5 transition disabled:opacity-50 ${
                            ev.is_featured
                              ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/15"
                              : "text-slate-400 hover:bg-slate-100 hover:text-amber-500 dark:hover:bg-white/10"
                          }`}
                        >
                          {togglingId === ev.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Star size={13} fill={ev.is_featured ? "currentColor" : "none"} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeEvent(ev)}
                          disabled={deletingId === ev.id}
                          title="Apagar"
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/15"
                        >
                          {deletingId === ev.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helper local ── */
function catOf(c: string): EventCategory {
  return c in CATEGORY_META ? (c as EventCategory) : "comunidade";
}