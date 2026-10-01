// app/components/header/Header.tsx
"use client";

import Image from "next/image";
import {
  Search, SlidersHorizontal, Bell, Menu, X, BookOpen, Headphones,
  FileText, Trophy, Clock, Users, Loader2, Inbox, Megaphone,
  ChevronDown, ChevronLeft, Mail, Shield, PencilLine, LogOut, Check,
  Camera, AlertCircle, ChevronRight, RefreshCw, Sun, Moon, ArrowRight, Heart,
  Calendar,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import { useTheme } from "@/app/lib/hooks/useTheme";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { useUser } from "@/app/lib/context/UserContext";
import { isEventDateExpired } from "@/app/lib/events/eventVisibility";
import { OPEN_SUPPORT_PROMPT_EVENT } from "@/app/lib/supportPrompt";

/* ================================================================
   TIPOS PÚBLICOS
================================================================ */
export type UserRole = "student" | "teacher" | "admin";

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: UserRole;
  course: string;
  academicYear: number;
  semester: 1 | 2;
  studentNumber?: string | null;
  bio?: string | null;
};

export type ProfileUpdatePayload = {
  fullName: string;
  bio?: string | null;
};

export type SearchResult = {
  id: string;
  type: "audio" | "slide" | "quiz" | "event";
  title: string;
  isEvent?: boolean;
  disciplineId?: string;
  disciplineName?: string;
  chapterTitle?: string;
  topicTitle?: string;
  fileUrl?: string | null;
  durationSeconds?: number | null;
  dateStart?: string | null;
  timeLabel?: string | null;
  location?: string | null;
  category?: string;
  theme?: string | null;
  imageUrl?: string | null;
};

export type HeaderNotification = {
  id: string;
  type: "quiz" | "audio" | "slide" | "default" | "event" | "support" | "donation";
  title: string;
  time: string;
  createdAt: string;
  read: boolean;
  contentId?: string;
  eventId?: string;
};

export type HeaderProps = {
  expanded: boolean;
  mobileOpen?: boolean;
  setMobileOpen?: (value: boolean) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  notificationCount?: number;
  user?: UserProfile | null;
  userLoading?: boolean;
  onProfileSave?: (payload: ProfileUpdatePayload) => Promise<void>;
  onAvatarUpload?: (file: File) => Promise<string>;
  onLogout?: () => Promise<void> | void;
};

/* ================================================================
   TIPOS INTERNOS
================================================================ */
type ProfileDraft = { fullName: string; bio: string };

/* ================================================================
   CONSTANTES
================================================================ */
const FILTER_OPTIONS = [
  { id: "all",         label: "Todos",         icon: BookOpen,   color: "text-slate-500",    description: "Todos os conteúdos e eventos" },
  { id: "events",      label: "Eventos",       icon: Calendar,   color: "text-amber-500",    description: "Palestras, formações e iniciativas" },
  { id: "disciplinas", label: "Disciplinas",   icon: BookOpen,   color: "text-blue-500",    description: "Encontre por matéria" },
  { id: "slides",      label: "Slides",        icon: FileText,   color: "text-emerald-500", description: "Apresentações de aulas" },
  { id: "audios",      label: "Áudios",        icon: Headphones, color: "text-purple-500",  description: "Resumos e podcasts" },
  { id: "quizzes",     label: "Questionários", icon: Trophy,     color: "text-amber-500",   description: "Teste os seus conhecimentos" },
] as const;

const ROLE_LABELS: Record<UserRole, string> = {
  admin:   "Admin",
  teacher: "Docente",
  student: "Estudante",
};

const ROLE_BADGE: Record<UserRole, string> = {
  admin:   "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  teacher: "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  student: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300",
};

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_MB = 2;
const READ_NOTIFICATIONS_KEY = "b-isaf:header:read-notifications:v1";
const ROLE_STORAGE_KEY = "b-isaf:role";

const SCROLLBAR_THIN = "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300/60 hover:scrollbar-thumb-slate-400/80 dark:scrollbar-thumb-slate-700/40 dark:hover:scrollbar-thumb-slate-600/60 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/60 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/80 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/40 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/60";

/* ================================================================
   HELPERS
================================================================ */
function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getNotifIcon(type?: string) {
  switch (type) {
    case "quiz":   return Trophy;
    case "audio":  return Headphones;
    case "slide":  return FileText;
    case "event":  return Calendar;
    case "support": return Megaphone;
    case "donation": return Heart;
    case "class":  return Clock;
    case "invite": return Users;
    default:       return Bell;
  }
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "Agora mesmo";
  if (diffMin < 60) return `Há ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `Há ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `Há ${diffD} dias`;
  return new Date(iso).toLocaleDateString("pt-PT");
}

function getWeekStart(date: Date): string {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

/* ================================================================
   AVATAR
================================================================ */
function Avatar({
  src, name, size = "md", className = "",
}: {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = {
    sm: "h-7 w-7 shrink-0 aspect-square text-[10px]",
    md: "h-9 w-9 shrink-0 aspect-square text-xs",
    lg: "h-12 w-12 shrink-0 aspect-square text-sm",
  }[size];

  return (
    <div className={`relative overflow-hidden rounded-full border border-slate-300 bg-slate-200 dark:border-white/10 dark:bg-slate-800 ${dims} ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={name ?? "avatar"}
          fill
          sizes={size === "sm" ? "28px" : size === "md" ? "36px" : "48px"}
          className="object-cover object-center"
          unoptimized={src.startsWith("blob:") || src.startsWith("data:")}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 font-semibold text-white">
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 dark:bg-white/10 ${className}`} />;
}

/* ================================================================
   PROFILE VIEW
================================================================ */
interface ProfileViewProps {
  user: UserProfile;
  profileSuccess: string | null;
  loggingOut: boolean;
  onEdit: () => void;
  onLogout: () => void;
  hasLogout: boolean;
}

const ProfileView = memo(function ProfileView({
  user, profileSuccess, loggingOut, onEdit, onLogout, hasLogout,
}: ProfileViewProps) {
  return (
    <div>
      <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <Avatar src={user.avatarUrl} name={user.fullName} size="lg" className="rounded-xl" />
            <span className={`absolute -bottom-1 -right-1 rounded-full border-2 border-white px-1.5 py-0.5 text-[8px] font-bold tracking-wide dark:border-slate-900 ${ROLE_BADGE[user.role]}`}>
              {ROLE_LABELS[user.role].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user.fullName}</h3>
            {user.bio && (
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{user.bio}</p>
            )}
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Mail size={10} className="shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 py-3">
        {/* Dados Académicos — SÓ para estudantes/professores */}
        {user.role !== "admin" && (
          <>
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">
              Dados Académicos
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              {[
                { label: "Curso",     value: user.course },
                { label: "Ano",       value: `${user.academicYear}º ano` },
                { label: "Semestre",  value: `${user.semester}º semestre` },
                { label: "Nº aluno",  value: user.studentNumber ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                  <span className="block text-slate-500">{label}</span>
                  <span className="mt-0.5 block truncate font-medium text-slate-800 dark:text-slate-100">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-[10px] text-amber-700 dark:border-amber-500/15 dark:bg-amber-500/[0.08] dark:text-amber-300">
              <Shield size={11} className="mt-0.5 shrink-0" />
              <span>Dados académicos são geridos pela secretaria e não podem ser alterados aqui.</span>
            </div>
          </>
        )}

        {profileSuccess && (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-2 text-[10px] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Check size={11} className="shrink-0" />
            {profileSuccess}
          </div>
        )}

        <div className={`flex gap-1.5 ${user.role !== "admin" ? "mt-3" : ""}`}>
          <button type="button" onClick={onEdit} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-2 text-xs font-medium text-white transition hover:bg-blue-500">
            <PencilLine size={13} /> Editar perfil
          </button>
          {hasLogout && (
            <button type="button" onClick={onLogout} disabled={loggingOut} aria-label="Terminar sessão"
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-300">
              {loggingOut ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

/* ================================================================
   PROFILE EDIT
================================================================ */
interface ProfileEditProps {
  user: UserProfile;
  draft: ProfileDraft;
  onDraftChange: (draft: ProfileDraft) => void;
  avatarPreview: string | null;
  avatarFile: File | null;
  avatarUploading: boolean;
  avatarError: string | null;
  profileError: string | null;
  saving: boolean;
  hasProfileSave: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onCancel: () => void;
}

const ProfileEdit = memo(function ProfileEdit({
  user, draft, onDraftChange, avatarPreview, avatarFile, avatarUploading,
  avatarError, profileError, saving, hasProfileSave, fileInputRef,
  onFileChange, onSave, onCancel,
}: ProfileEditProps) {
  const currentAvatarSrc = avatarPreview ?? user.avatarUrl ?? undefined;
  const bioLength = draft.bio.length;

  return (
    <div className="space-y-3 px-4 py-3">
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">Foto de perfil</p>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar src={currentAvatarSrc} name={user.fullName} size="lg" className="rounded-xl" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
              aria-label="Alterar foto" className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity hover:opacity-100 disabled:cursor-wait">
              {avatarUploading ? <Loader2 size={16} className="animate-spin text-white" /> : <Camera size={16} className="text-white" />}
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
              <Camera size={12} /> {avatarFile ? "Trocar imagem" : "Carregar foto"}
            </button>
            {avatarFile && <p className="mt-1 truncate text-[10px] text-slate-500">{avatarFile.name}</p>}
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-600">JPEG, PNG, WebP ou GIF · máx. {MAX_FILE_SIZE_MB} MB</p>
            {avatarError && (
              <p className="mt-1 flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400">
                <AlertCircle size={9} /> {avatarError}
              </p>
            )}
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} onChange={onFileChange} className="sr-only" tabIndex={-1} />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">Nome de exibição <span className="text-rose-500 dark:text-rose-400">*</span></label>
        <input type="text" value={draft.fullName} onChange={(e) => onDraftChange({ ...draft, fullName: e.target.value })} maxLength={60}
          placeholder="O teu nome completo"
          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600" />
        <p className="mt-0.5 text-right text-[9px] text-slate-500 dark:text-slate-600">{draft.fullName.length}/60</p>
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">Bio <span className="text-slate-400 dark:text-slate-600">(opcional)</span></label>
        <textarea value={draft.bio} onChange={(e) => onDraftChange({ ...draft, bio: e.target.value })} rows={3} maxLength={160}
          placeholder="Uma breve apresentação..."
          className="w-full resize-none rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600" />
        <p className={`mt-0.5 text-right text-[9px] transition ${bioLength > 140 ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-600"}`}>{bioLength}/160</p>
      </div>

      {/* Campos bloqueados — SÓ para estudantes/professores */}
      {user.role !== "admin" && (
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-600">
            Campos bloqueados
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] opacity-70 dark:opacity-60">
            {[
              { label: "Curso",     value: user.course },
              { label: "Ano",       value: `${user.academicYear}º ano` },
              { label: "Semestre",  value: `${user.semester}º semestre` },
              { label: "Perfil",    value: ROLE_LABELS[user.role] },
            ].map(({ label, value }) => (
              <div key={label} className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-white/5 dark:bg-white/[0.03]">
                <span className="block text-slate-500 dark:text-slate-600">{label}</span>
                <span className="mt-0.5 block truncate font-medium text-slate-600 dark:text-slate-400">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {profileError && (
        <div className="flex items-start gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-2 text-[10px] text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={11} className="mt-0.5 shrink-0" /> {profileError}
        </div>
      )}
      {!hasProfileSave && (
        <div className="flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-[10px] text-amber-700 dark:border-amber-500/15 dark:bg-amber-500/[0.08] dark:text-amber-400">
          <AlertCircle size={11} className="mt-0.5 shrink-0" />
          <span><strong>Dev:</strong> passa <code className="font-mono">onProfileSave</code> e <code className="font-mono">onAvatarUpload</code> para ligar ao Supabase.</span>
        </div>
      )}
      <div className="flex gap-1.5 pt-0.5">
        <button type="button" onClick={onCancel} disabled={saving}
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
          Cancelar
        </button>
        <button type="button" onClick={onSave} disabled={saving || !hasProfileSave}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? <><Loader2 size={13} className="animate-spin" />A guardar...</> : <><Check size={13} />Guardar</>}
        </button>
      </div>
    </div>
  );
});

/* ================================================================
   SKELETON / EMPTY
================================================================ */
const ProfileSkeleton = memo(function ProfileSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-1.5 pt-1">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-2.5 w-48" />
          <div className="grid grid-cols-2 gap-1.5 pt-1.5">
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-11 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11 rounded-lg" />)}
      </div>
      <Skeleton className="h-8 rounded-lg" />
    </div>
  );
});

const ProfileEmpty = memo(function ProfileEmpty() {
  return (
    <div className="p-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-white/10 dark:bg-slate-950/40">
        <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800">
          <Users size={18} className="text-slate-500 dark:text-slate-400" />
        </div>
        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Nenhum utilizador autenticado</p>
        <p className="mt-0.5 text-[11px] text-slate-500">Faça login para aceder ao seu perfil.</p>
      </div>
    </div>
  );
});

/* ================================================================
   RENDER RESULTADO DE PESQUISA (partilhado)
================================================================ */
function SearchResultRow({
  result,
  onClick,
}: {
  result: SearchResult;
  onClick: (r: SearchResult) => void;
}) {
  const Icon = result.isEvent
    ? Calendar
    : result.type === "audio"
      ? Headphones
      : result.type === "slide"
        ? FileText
        : Trophy;

  const iconBg = result.isEvent
    ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
    : result.type === "audio"
      ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
      : result.type === "slide"
        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
        : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";

  const subtitle = result.isEvent
    ? [
        result.dateStart
          ? new Date(`${result.dateStart}T00:00:00`).toLocaleDateString("pt-PT", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "Data a definir",
        result.timeLabel,
        result.location,
      ]
        .filter(Boolean)
        .join(" · ")
    : [result.disciplineName, result.chapterTitle, result.topicTitle]
        .filter(Boolean)
        .join(" · ");

  return (
    <button
      key={`${result.type}-${result.id}`}
      type="button"
      onClick={() => onClick(result)}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${iconBg}`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">
          {result.title}
          {result.isEvent && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              Evento
            </span>
          )}
        </p>
        <p className="truncate text-[11px] text-slate-500">{subtitle}</p>
      </div>
      <ArrowRight size={13} className="shrink-0 text-slate-400" />
    </button>
  );
}

/* ================================================================
   HEADER PRINCIPAL
================================================================ */
const Header = memo(function Header({
  expanded, mobileOpen, setMobileOpen, searchQuery, onSearchChange,
  notificationCount = 0, user = null, userLoading = false,
  onProfileSave, onAvatarUpload, onLogout,
}: HeaderProps) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const { profile } = useUser() as any;

  const [filterOpen,  setFilterOpen]  = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMode, setProfileMode] = useState<"view" | "edit">("view");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [notifLoadedOnce, setNotifLoadedOnce] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  const [draft, setDraft] = useState<ProfileDraft>({ fullName: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const { theme, toggleTheme, themeReady } = useTheme();

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const searchTimeoutRef = useRef<number | null>(null);
  const searchResultsRef = useRef<HTMLDivElement | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const dynamicCount = notifLoadedOnce && !notifError
    ? notifications.filter((n) => !n.read).length
    : notificationCount;
  const hasNotifs = dynamicCount > 0;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(READ_NOTIFICATIONS_KEY) ?? "[]");
      if (Array.isArray(stored)) {
        // Sincroniza as notificações lidas persistidas no navegador.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReadNotificationIds(new Set(stored.filter((id): id is string => typeof id === "string")));
      }
    } catch {
      setReadNotificationIds(new Set());
    }
  }, []);

  /* ================================================================
     PESQUISA REAL (conteúdos + eventos)
  ================================================================ */
  const performSearch = useCallback(async (query: string, filter: string) => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    setSearchOpen(true);

    try {
      let typeFilter = "";
      if (filter === "slides") typeFilter = "slide";
      if (filter === "audios") typeFilter = "audio";
      if (filter === "quizzes") typeFilter = "quiz";

      const runContentSearch = filter !== "events";
      const runEventSearch   = filter === "all" || filter === "events";

      const [contentResult, eventResult] = await Promise.all([
        runContentSearch
          ? (async () => {
              let qb = supabase
                .from("contents")
                .select(`
                  id, type, title, file_url, duration_seconds, is_active,
                  topic:topics!inner (
                    id, title,
                    chapter:chapters!inner (
                      id, title,
                      discipline:disciplines!inner (id, name)
                    )
                  )
                `)
                .eq("is_active", true)
                .ilike("title", `%${term}%`)
                .limit(15);
              if (typeFilter) qb = qb.eq("type", typeFilter);
              return qb;
            })()
          : Promise.resolve({ data: null, error: null }),

        runEventSearch
          ? supabase
              .from("events")
              .select("id, title, theme, description, date_start, date_end, time_label, location, category, image_url, is_featured, is_published")
              .eq("is_published", true)
              .or(
                `title.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%,theme.ilike.%${term}%`
              )
              .order("date_start", { ascending: true, nullsFirst: false })
              .limit(10)
          : Promise.resolve({ data: null, error: null }),
      ]);

      const contentRows: SearchResult[] = ((contentResult.data ?? []) as any[])
        .filter((c) => c.topic?.chapter?.discipline)
        .map((c) => ({
          id: c.id,
          type: c.type,
          title: c.title,
          disciplineId: c.topic.chapter.discipline.id,
          disciplineName: c.topic.chapter.discipline.name,
          chapterTitle: c.topic.chapter.title,
          topicTitle: c.topic.title,
          fileUrl: c.file_url,
          durationSeconds: c.duration_seconds,
        }));

      const eventRows: SearchResult[] = ((eventResult.data ?? []) as any[])
        .filter((event) => !isEventDateExpired(event.date_start, event.date_end) || event.is_featured)
        .map(
          (e) => ({
            id: e.id,
            type: "event",
            isEvent: true,
            title: e.title,
            dateStart: e.date_start,
            timeLabel: e.time_label,
            location: e.location,
            category: e.category,
            theme: e.theme,
            imageUrl: e.image_url,
          })
        );

      setSearchResults([...eventRows, ...contentRows]);
    } catch (err) {
      console.error("Erro na pesquisa:", err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = window.setTimeout(() => {
      void performSearch(searchQuery, selectedFilter);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, selectedFilter, performSearch]);

  useEffect(() => {
    if (!searchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (searchResultsRef.current && !searchResultsRef.current.contains(t)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen]);

  /* ================================================================
     NOTIFICAÇÕES DE EVENTOS E AVISOS
  ================================================================ */
  const fetchEventNotifs = useCallback(async () => {
    const { data } = await supabase
      .from("events")
      .select("id, title, date_start, date_end, time_label, location, is_published, is_featured, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    const events = (data ?? []) as {
      id: string;
      title: string;
      date_start: string | null;
      date_end: string | null;
      time_label: string | null;
      location: string | null;
      is_published: boolean;
      is_featured: boolean;
      created_at: string;
    }[];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nowMs = Date.now();
    const noticeMaxAgeMs = 48 * 60 * 60 * 1000;

    const notifs: HeaderNotification[] = [];

    for (const ev of events) {
      const id = `event-${ev.id}`;
      let title = "";
      let createdAt = ev.created_at;

      if (!ev.date_start) {
        if (nowMs - new Date(ev.created_at).getTime() >= noticeMaxAgeMs) continue;
        title = `Novo aviso: ${ev.title}`;
      } else {
        const start = new Date(`${ev.date_start}T00:00:00`);
        const end = ev.date_end ? new Date(`${ev.date_end}T00:00:00`) : start;
        const startMs = start.getTime();
        const endMs = end.getTime();

        if (isEventDateExpired(ev.date_start, ev.date_end) && !ev.is_featured) continue;

        if (isEventDateExpired(ev.date_start, ev.date_end)) {
          title = `Evento destacado: ${ev.title}`;
          createdAt = ev.created_at;
        } else if (startMs === today.getTime() && endMs === today.getTime()) {
          title = `Hoje${ev.time_label ? ` às ${ev.time_label}` : ""}: ${ev.title}`;
          createdAt = new Date().toISOString();
        } else if (startMs <= today.getTime() && endMs >= today.getTime() && startMs < endMs) {
          title = `A decorrer: ${ev.title}`;
          createdAt = new Date().toISOString();
        } else {
          const daysUntil = Math.round((startMs - today.getTime()) / 86400000);
          if (daysUntil === 1) {
            title = `Amanhã${ev.time_label ? ` às ${ev.time_label}` : ""}: ${ev.title}`;
          } else if (daysUntil <= 7) {
            title = `Daqui a ${daysUntil} dias: ${ev.title}`;
          } else {
            const dateLabel = start.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
            title = `Próximo evento (${dateLabel}): ${ev.title}`;
          }
        }
      }

      if (ev.location) title += ` · ${ev.location}`;

      notifs.push({
        id,
        type: "event",
        title,
        time: formatRelativeTime(createdAt),
        createdAt,
        read: readNotificationIds.has(id),
        eventId: ev.id,
      });
    }

    return notifs;
  }, [supabase, readNotificationIds]);

  /* ================================================================
     NOTIFICAÇÕES REAIS
  ================================================================ */
  const fetchNotifs = useCallback(async () => {
    const studentId = profile?.id ?? user?.id;
    if (!studentId) return;
    setNotifLoading(true);
    setNotifError(null);
    try {
      const [quizRes, progressRes] = await Promise.all([
        supabase.from("quiz_results").select("id, content_id, correct_answers, total_questions, attempted_at")
          .eq("student_id", studentId).order("attempted_at", { ascending: false }).limit(10),
        supabase.from("student_progress").select("id, content_id, progress_percent, updated_at, completed")
          .eq("student_id", studentId).order("updated_at", { ascending: false }).limit(10),
      ]);

      const notifs: HeaderNotification[] = [];
      const latestQuizByContent = new Map<string, (typeof quizRes.data)[number]>();
      const latestProgressByContent = new Map<string, (typeof progressRes.data)[number]>();

      for (const row of (quizRes.data ?? [])) {
        if (!latestQuizByContent.has(row.content_id)) latestQuizByContent.set(row.content_id, row);
      }

      for (const row of (progressRes.data ?? [])) {
        if (row.completed && !latestProgressByContent.has(row.content_id)) latestProgressByContent.set(row.content_id, row);
      }

      for (const row of latestQuizByContent.values()) {
        const id = `quiz-${row.content_id}`;
        notifs.push({
          id,
          type: "quiz",
          title: `Quiz concluído: ${row.correct_answers}/${row.total_questions} respostas corretas`,
          time: formatRelativeTime(row.attempted_at),
          createdAt: row.attempted_at,
          read: readNotificationIds.has(id),
          contentId: row.content_id,
        });
      }

      for (const row of latestProgressByContent.values()) {
        const id = `progress-${row.content_id}`;
        notifs.push({
          id,
          type: "slide",
          title: `Conteúdo concluído (${row.progress_percent}%)`,
          time: formatRelativeTime(row.updated_at),
          createdAt: row.updated_at,
          read: readNotificationIds.has(id),
          contentId: row.content_id,
        });
      }

      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const eventNotifs = await fetchEventNotifs();
      const weekStart = getWeekStart(new Date());
      const isAdminViewer = profile?.role === "admin" || profile?.role === "superadmin";
      const supportAndDonationNotifs: HeaderNotification[] = [];

      if (isAdminViewer) {
        const { data: donationRows } = await supabase
          .from("user_feedback")
          .select("id, created_at, profiles(full_name)")
          .eq("feedback_type", "donation")
          .eq("donation_status", "pending")
          .order("created_at", { ascending: false })
          .limit(10);

        for (const row of donationRows ?? []) {
          const donation = row as { id: string; created_at: string; profiles: { full_name: string | null } | null };
          const id = `donation-${donation.id}`;
          supportAndDonationNotifs.push({
            id,
            type: "donation",
            title: `Doação para validar: ${donation.profiles?.full_name ?? "Utilizador"}`,
            time: formatRelativeTime(donation.created_at),
            createdAt: donation.created_at,
            read: readNotificationIds.has(id),
          });
        }
      } else {
        const { data: donationRows } = await supabase
          .from("user_feedback")
          .select("donation_status")
          .eq("student_id", studentId)
          .eq("feedback_type", "donation")
          .order("created_at", { ascending: false })
          .limit(1);
        const hasConfirmedDonation = donationRows?.[0]?.donation_status === "confirmed";

        if (!hasConfirmedDonation) {
          const supportId = `support-${studentId}-${weekStart}`;
          supportAndDonationNotifs.push({
            id: supportId,
            type: "support",
            title: "Ajude a plataforma a crescer: considere fazer uma doação voluntária. Não há cobrança nem pagamento automático.",
            time: "Esta semana",
            createdAt: new Date().toISOString(),
            read: readNotificationIds.has(supportId),
          });
        }
      }

      const all = [...eventNotifs, ...notifs, ...supportAndDonationNotifs];
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(all.slice(0, 20));
      setNotifLoadedOnce(true);
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
      setNotifError("Não foi possível carregar as notificações.");
    } finally {
      setNotifLoading(false);
    }
  }, [supabase, profile, user?.id, readNotificationIds, fetchEventNotifs]);

  useEffect(() => {
    if (!notifOpen) return;
    const timeoutId = window.setTimeout(() => void fetchNotifs(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [notifOpen, fetchNotifs]);

  useEffect(() => {
    const studentId = profile?.id ?? user?.id;
    if (!studentId) return;

    const initialFetchId = window.setTimeout(() => void fetchNotifs(), 0);
    const channel = supabase
      .channel(`header-events-${studentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        void fetchNotifs();
      })
      .subscribe();
    const refreshIntervalId = window.setInterval(() => void fetchNotifs(), 5 * 60 * 1000);

    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") void fetchNotifs();
    };
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      window.clearTimeout(initialFetchId);
      window.clearInterval(refreshIntervalId);
      document.removeEventListener("visibilitychange", refreshOnFocus);
      void supabase.removeChannel(channel);
    };
  }, [supabase, profile?.id, user?.id, fetchNotifs]);

  const markNotificationRead = (notificationId: string) => {
    setReadNotificationIds((previous) => {
      const next = new Set(previous);
      next.add(notificationId);
      try { localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
    setNotifications((previous) => previous.map((item) => item.id === notificationId ? { ...item, read: true } : item));
  };

  /* ================================================================
     FECHAR PAINÉIS
  ================================================================ */
  useEffect(() => {
    const closeAll = () => {
      setFilterOpen(false);
      setNotifOpen(false);
      setProfileOpen(false);
      setMobileSearchOpen(false);
      setSearchOpen(false);
    };
    const handleClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (filterRef.current && !filterRef.current.contains(t)) setFilterOpen(false);
      if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeAll(); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => {
    if (mobileSearchOpen) {
      const id = window.setTimeout(() => mobileSearchInputRef.current?.focus(), 50);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        window.clearTimeout(id);
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (!profileOpen) {
      setProfileMode("view");
      setProfileError(null);
      setAvatarPreview(null);
      setAvatarFile(null);
      setAvatarError(null);
    }
  }, [profileOpen]);

  useEffect(() => {
    if (profileOpen && profileMode === "edit" && user) {
      setDraft({ fullName: user.fullName ?? "", bio: user.bio ?? "" });
      setProfileError(null);
      setProfileSuccess(null);
    }
  }, [profileOpen, profileMode]); // eslint-disable-line

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setAvatarError("Formato não suportado. Use JPEG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setAvatarError(`O ficheiro excede ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !onAvatarUpload) {
      if (!onAvatarUpload) setAvatarError("Upload de avatar não está configurado.");
      return null;
    }
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      return await onAvatarUpload(avatarFile);
    } catch {
      setAvatarError("Falha ao fazer upload da imagem.");
      return null;
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const fullName = draft.fullName.trim().replace(/\s+/g, " ").slice(0, 60);
    if (fullName.length < 3) {
      setProfileError("O nome deve ter pelo menos 3 caracteres.");
      return;
    }
    const bio = draft.bio.trim().slice(0, 160) || null;
    setSaving(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      if (avatarFile) {
        const newUrl = await uploadAvatar();
        if (!newUrl) { setSaving(false); return; }
      }
      await onProfileSave?.({ fullName, bio });
      setProfileSuccess("Perfil atualizado com sucesso.");
      setAvatarFile(null);
      setAvatarPreview(null);
      setProfileMode("view");
    } catch {
      setProfileError("Não foi possível guardar as alterações. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await onLogout?.();
    } finally {
      // Limpar o role persistido — evita splash de admin em logins seguintes como estudante
      try { localStorage.removeItem(ROLE_STORAGE_KEY); } catch { /* ignore */ }
      setLoggingOut(false);
      router.replace("/login");
    }
  };

  const handleCancelEdit = () => {
    setProfileMode("view");
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarError(null);
  };

  const handleStartEdit = () => {
    setProfileError(null);
    setProfileSuccess(null);
    setProfileMode("edit");
  };

  const handleResultClick = (result: SearchResult) => {
    setSearchOpen(false);
    setFilterOpen(false);
    setMobileSearchOpen(false);
    onSearchChange("");

    if (result.isEvent) {
      router.push(`/eventos?open=${result.id}`);
      return;
    }
    router.push(
      `/disciplinas/${result.disciplineId}?open${result.type === "quiz" ? "Quiz" : "Slide"}=${result.id}`
    );
  };

  /* ================================================================
     RENDER
  ================================================================ */
  return (
    <>
      <header className={`fixed top-0 z-40 h-14 border-b border-slate-200/70 bg-slate-100/80 backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-slate-950/80 right-0 left-0 ${expanded ? "md:left-56" : "md:left-[65px]"}`}>
        <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between gap-1.5 px-2.5 sm:gap-2.5 sm:px-3.5 md:px-5">

          {/* Esquerda */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <button type="button" onClick={() => setMobileOpen?.(!mobileOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-slate-300/60 dark:hover:bg-slate-800 md:hidden" aria-label="Abrir menu">
              <Menu size={20} className="text-slate-700 dark:text-slate-200" />
            </button>
            <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 md:block">
              Biblioteca Virtual - ISAF
            </span>
          </div>

          {/* Centro: pesquisa desktop */}
          <div className="hidden min-w-0 flex-1 px-1.5 md:block md:px-5" ref={filterRef}>
            <div className="relative mx-auto max-w-xl">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
                placeholder="Pesquisar conteúdos e eventos..."
                className="h-9 w-full rounded-full border border-slate-300 bg-white pl-9 pr-11 text-xs text-slate-800 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-800" />
              <button type="button" onClick={() => { setFilterOpen(!filterOpen); setNotifOpen(false); setProfileOpen(false); }}
                className={`absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full transition ${filterOpen ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}
                aria-label="Filtros">
                <SlidersHorizontal size={13} />
              </button>

              {/* Dropdown filtros */}
              <div className={`absolute right-0 top-full z-auto mt-1.5 w-72 origin-top-right transition-all ${filterOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}>
                <div className={`max-h-[calc(100vh-4rem)] overflow-y-auto rounded-xl border border-slate-300 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-slate-900 ${SCROLLBAR_THIN}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filtros Rápidos</h3>
                      <p className="text-[11px] text-slate-500">Seleciona o tipo de conteúdo</p>
                    </div>
                    <button type="button" onClick={() => setFilterOpen(false)}
                      className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" aria-label="Fechar">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="mt-3 space-y-0.5">
                    {FILTER_OPTIONS.map(({ id, label, icon: Icon, color, description }) => (
                      <button key={id} type="button" onClick={() => { setSelectedFilter(id); setFilterOpen(false); }}
                        className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedFilter === id ? "bg-blue-50 dark:bg-blue-950/40" : ""}`}>
                        <Icon size={16} className={`shrink-0 ${color}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{label}</p>
                          <p className="text-[11px] text-slate-500">{description}</p>
                        </div>
                        {selectedFilter === id && <Check size={13} className="shrink-0 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dropdown resultados */}
              {searchOpen && (
                <div ref={searchResultsRef} className={`absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[360px] overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900 ${SCROLLBAR_THIN}`}>
                  {searchLoading ? (
                    <div className="flex items-center justify-center gap-2 p-5">
                      <Loader2 size={16} className="animate-spin text-blue-500" />
                      <span className="text-xs text-slate-500">A pesquisar...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-5 text-center">
                      <p className="text-xs text-slate-500">Sem resultados para "{searchQuery}"</p>
                    </div>
                  ) : (
                    <div className="p-1.5">
                      {searchResults.map((result) => (
                        <SearchResultRow key={`${result.type}-${result.id}`} result={result} onClick={handleResultClick} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Centro mobile */}
          <div className="flex flex-1 items-center justify-center overflow-hidden md:hidden">
            <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">Biblioteca ISAF</span>
          </div>

          {/* Direita */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <button type="button" onClick={() => { setMobileSearchOpen(true); setNotifOpen(false); setProfileOpen(false); }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white transition hover:bg-slate-100 dark:border-slate-700 dark:bg-transparent dark:hover:bg-slate-800 md:hidden" aria-label="Pesquisar">
              <Search size={16} className="text-slate-600 dark:text-slate-300" />
              {searchQuery && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-blue-500" />}
            </button>

            {/* Notificações */}
            <div className="relative" ref={notifRef}>
              <button type="button" onClick={() => { setNotifOpen(!notifOpen); setFilterOpen(false); setProfileOpen(false); setMobileSearchOpen(false); setSearchOpen(false); }}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white transition hover:bg-slate-100 dark:border-slate-700 dark:bg-transparent dark:hover:bg-slate-800" aria-label="Notificações">
                <Bell size={16} className="text-slate-600 dark:text-slate-300" />
                {hasNotifs && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow">
                    {dynamicCount > 9 ? "9+" : dynamicCount}
                  </span>
                )}
              </button>

              <div className={`fixed inset-x-3 top-[3.75rem] z-50 origin-top transition-all sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:z-auto sm:mt-1.5 sm:w-80 sm:origin-top-right ${notifOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}>
                <div className="max-h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notificações</h3>
                    <div className="flex items-center gap-1.5">
                      {hasNotifs && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">{dynamicCount} nova{dynamicCount !== 1 ? "s" : ""}</span>}
                      <button type="button" onClick={() => void fetchNotifs()} title="Atualizar" className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                        <RefreshCw size={12} className={notifLoading ? "animate-spin" : ""} />
                      </button>
                    </div>
                  </div>
                  <div className={`max-h-[360px] overflow-y-auto ${SCROLLBAR_THIN}`}>
                    {notifLoading && (
                      <div className="flex flex-col items-center justify-center gap-2.5 p-9">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        <p className="text-xs text-slate-500">A carregar...</p>
                      </div>
                    )}
                    {!notifLoading && notifError && (
                      <div className="flex flex-col items-center gap-2.5 p-9 text-center">
                        <AlertCircle size={22} className="text-rose-400" />
                        <p className="text-xs text-slate-600 dark:text-slate-300">{notifError}</p>
                        <button type="button" onClick={() => void fetchNotifs()} className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500">Tentar novamente</button>
                      </div>
                    )}
                    {!notifLoading && !notifError && notifications.length === 0 && (
                      <div className="flex flex-col items-center gap-2.5 p-9 text-center">
                        <Inbox className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                        <div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Tudo em dia!</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">Quando houver novidades, aparecem aqui.</p>
                        </div>
                      </div>
                    )}
                    {!notifLoading && !notifError && notifications.map((n) => {
                      const Icon = getNotifIcon(n.type);
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            markNotificationRead(n.id);
                            if (n.type === "event" && n.eventId) {
                              setNotifOpen(false);
                              router.push(`/eventos?open=${encodeURIComponent(n.eventId)}`);
                            } else if (n.type === "support") {
                              setNotifOpen(false);
                              window.dispatchEvent(new Event(OPEN_SUPPORT_PROMPT_EVENT));
                            } else if (n.type === "donation") {
                              setNotifOpen(false);
                              router.push("/admin/feedback#doacoes");
                            }
                          }}
                          className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-none transition dark:border-white/10 ${!n.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""} hover:bg-slate-50 dark:hover:bg-slate-800/60`}
                        >
                          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            n.type === "event"
                              ? "bg-amber-100 dark:bg-amber-500/15"
                              : n.type === "donation"
                                ? "bg-rose-100 dark:bg-rose-500/15"
                              : n.type === "quiz"
                                ? "bg-amber-50 dark:bg-amber-500/10"
                                : n.type === "slide"
                                  ? "bg-emerald-50 dark:bg-emerald-500/10"
                                  : "bg-slate-100 dark:bg-slate-800"
                          }`}>
                            <Icon size={15} className={
                              n.type === "event"
                                ? "text-amber-600 dark:text-amber-400"
                                : n.type === "donation"
                                  ? "text-rose-600 dark:text-rose-400"
                                : "text-slate-500 dark:text-slate-400"
                            } />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium leading-snug text-slate-800 dark:text-slate-100">{n.title}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{n.time}</p>
                          </div>
                          {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Perfil */}
            <div className="relative" ref={profileRef}>
              <div className="flex h-9 items-center gap-0.5 rounded-full border border-slate-300 bg-white pl-0.5 pr-1 transition-colors dark:border-slate-700 dark:bg-slate-900">
                <button type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
                  title={theme === "dark" ? "Modo claro" : "Modo escuro"}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                  {themeReady && theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                </button>
                <span className="h-4 w-px shrink-0 bg-slate-300 dark:bg-slate-700" aria-hidden="true" />
                <button type="button" onClick={() => { setProfileOpen(!profileOpen); setFilterOpen(false); setNotifOpen(false); setMobileSearchOpen(false); setSearchOpen(false); }}
                  className="flex items-center gap-1.5 rounded-full py-0.5 pl-1 pr-0.5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-haspopup="menu" aria-expanded={profileOpen} aria-label="Conta">
                  {userLoading ? <Skeleton className="h-7 w-7 rounded-full" /> : <Avatar src={user?.avatarUrl} name={user?.fullName} size="sm" className="rounded-full" />}
                  <div className="hidden min-w-0 max-w-[110px] text-left md:block">
                    {userLoading ? (
                      <div className="space-y-1">
                        <Skeleton className="h-2.5 w-20" />
                        <Skeleton className="h-2 w-24" />
                      </div>
                    ) : (
                      <>
                        <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">{user?.fullName ?? "Utilizador"}</p>
                        <p className="truncate text-[10px] text-slate-600 dark:text-slate-500">{user ? `${user.course} · ${user.academicYear}º ano` : "Perfil"}</p>
                      </>
                    )}
                  </div>
                  <ChevronDown size={12} className={`shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${profileOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              <div className={`fixed inset-x-3 top-[3.75rem] z-50 origin-top transition-all sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:z-auto sm:mt-1.5 sm:w-[24rem] sm:origin-top-right ${profileOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}>
                <div className={`max-h-[calc(100vh-4rem)] overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900 ${SCROLLBAR_THIN}`}>
                  {userLoading ? (
                    <ProfileSkeleton />
                  ) : !user ? (
                    <ProfileEmpty />
                  ) : profileMode === "view" ? (
                    <ProfileView user={user} profileSuccess={profileSuccess} loggingOut={loggingOut}
                      onEdit={handleStartEdit} onLogout={() => void handleLogout()} hasLogout={!!onLogout} />
                  ) : (
                    <ProfileEdit user={user} draft={draft} onDraftChange={setDraft}
                      avatarPreview={avatarPreview} avatarFile={avatarFile} avatarUploading={avatarUploading}
                      avatarError={avatarError} profileError={profileError} saving={saving}
                      hasProfileSave={!!onProfileSave} fileInputRef={fileInputRef}
                      onFileChange={handleAvatarFileChange} onSave={() => void handleSave()} onCancel={handleCancelEdit} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Overlay pesquisa mobile */}
      <div role="search" aria-hidden={!mobileSearchOpen}
        className={`fixed inset-0 z-50 flex flex-col bg-white transition-transform duration-200 dark:bg-slate-950 md:hidden ${mobileSearchOpen ? "translate-y-0" : "pointer-events-none -translate-y-full"}`}>
        <div className="flex h-14 shrink-0 items-center gap-1.5 border-b border-slate-200 px-2.5 dark:border-white/10">
          <button type="button" onClick={() => setMobileSearchOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar pesquisa">
            <ChevronLeft size={18} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input ref={mobileSearchInputRef} type="text" inputMode="search" enterKeyHint="search"
              value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") mobileSearchInputRef.current?.blur(); }}
              placeholder="Pesquisar conteúdos e eventos..."
              className="h-10 w-full rounded-full border border-slate-300 bg-slate-50 pl-9 pr-9 text-xs text-slate-800 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500" />
            {searchQuery && (
              <button type="button" onClick={() => { onSearchChange(""); mobileSearchInputRef.current?.focus(); }}
                className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700" aria-label="Limpar pesquisa">
                <X size={13} />
              </button>
            )}
          </div>
          <button type="button" onClick={() => setFilterOpen(!filterOpen)}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${filterOpen ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
            aria-label="Filtros">
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {filterOpen && (
          <div className={`border-b border-slate-200 p-3 dark:border-white/10 max-h-[40vh] overflow-y-auto ${SCROLLBAR_THIN}`}>
            <p className="mb-1.5 px-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-500">Filtros rápidos</p>
            <div className="space-y-0.5">
              {FILTER_OPTIONS.map(({ id, label, icon: Icon, color, description }) => (
                <button key={id} type="button" onClick={() => { setSelectedFilter(id); setFilterOpen(false); }}
                  className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedFilter === id ? "bg-blue-50 dark:bg-blue-950/40" : ""}`}>
                  <Icon size={16} className={`shrink-0 ${color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{label}</p>
                    <p className="text-[11px] text-slate-500">{description}</p>
                  </div>
                  {selectedFilter === id && <Check size={13} className="shrink-0 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto ${SCROLLBAR_THIN}`}>
          {searchLoading ? (
            <div className="flex items-center justify-center gap-2 p-5">
              <Loader2 size={16} className="animate-spin text-blue-500" />
              <span className="text-xs text-slate-500">A pesquisar...</span>
            </div>
          ) : searchResults.length === 0 ? (
            searchQuery.trim().length >= 2 ? (
              <div className="p-5 text-center">
                <p className="text-xs text-slate-500">Sem resultados para "{searchQuery}"</p>
              </div>
            ) : null
          ) : (
            <div className="p-1.5">
              {searchResults.map((result) => (
                <SearchResultRow key={`${result.type}-${result.id}`} result={result} onClick={handleResultClick} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Backdrop mobile */}
      <div onClick={() => { setFilterOpen(false); setNotifOpen(false); setProfileOpen(false); }}
        className={`fixed inset-0 z-30 bg-black/20 backdrop-blur-sm sm:hidden ${filterOpen || notifOpen || profileOpen ? "block" : "hidden"}`} />
    </>
  );
});

export default Header;