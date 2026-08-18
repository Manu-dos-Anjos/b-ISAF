// app/components/header/Header.tsx
"use client";

import Image from "next/image";
import {
  Search,
  SlidersHorizontal,
  Bell,
  Menu,
  X,
  BookOpen,
  Headphones,
  FileText,
  Trophy,
  Clock,
  Users,
  Loader2,
  Inbox,
  Megaphone,
  ChevronDown,
  ChevronLeft,
  Mail,
  Shield,
  PencilLine,
  LogOut,
  Check,
  Camera,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Sun,
  Moon,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import { useTheme } from "@/app/lib/hooks/useTheme";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { useUser } from "@/app/lib/context/UserContext";

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
  type: "audio" | "slide" | "quiz";
  title: string;
  disciplineId: string;
  disciplineName: string;
  chapterTitle: string;
  topicTitle: string;
  fileUrl?: string | null;
  durationSeconds?: number | null;
};

export type HeaderNotification = {
  id: string;
  type: "quiz" | "audio" | "slide" | "default";
  title: string;
  time: string;
  read: boolean;
  contentId?: string;
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
  { id: "all",         label: "Todos",         icon: BookOpen,   color: "text-slate-500",    description: "Todos os conteúdos" },
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
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
  }[size];

  return (
    <div className={`relative overflow-hidden rounded-full border border-slate-300 bg-slate-200 dark:border-white/10 dark:bg-slate-800 ${dims} ${className}`}>
      {src ? (
        <Image src={src} alt={name ?? "avatar"} fill className="object-cover" unoptimized />
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
      <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <Avatar src={user.avatarUrl} name={user.fullName} size="lg" className="rounded-2xl" />
            <span className={`absolute -bottom-1 -right-1 rounded-full border-2 border-white px-1.5 py-0.5 text-[9px] font-bold tracking-wide dark:border-slate-900 ${ROLE_BADGE[user.role]}`}>
              {ROLE_LABELS[user.role].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{user.fullName}</h3>
            {user.bio && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{user.bio}</p>
            )}
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Mail size={11} className="shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">Dados Académicos</p>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {[
            { label: "Curso", value: user.course },
            { label: "Ano", value: `${user.academicYear}º ano` },
            { label: "Semestre", value: `${user.semester}º semestre` },
            { label: "Nº aluno", value: user.studentNumber ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
              <span className="block text-slate-500">{label}</span>
              <span className="mt-0.5 block truncate font-medium text-slate-800 dark:text-slate-100">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-700 dark:border-amber-500/15 dark:bg-amber-500/[0.08] dark:text-amber-300">
          <Shield size={12} className="mt-0.5 shrink-0" />
          <span>Dados académicos são geridos pela secretaria e não podem ser alterados aqui.</span>
        </div>
        {profileSuccess && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-[11px] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Check size={12} className="shrink-0" />
            {profileSuccess}
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onEdit} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500">
            <PencilLine size={14} /> Editar perfil
          </button>
          {hasLogout && (
            <button type="button" onClick={onLogout} disabled={loggingOut} aria-label="Terminar sessão"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-300">
              {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
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
    <div className="space-y-4 px-5 py-4">
      <div>
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Foto de perfil</p>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar src={currentAvatarSrc} name={user.fullName} size="lg" className="rounded-2xl" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
              aria-label="Alterar foto" className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 transition-opacity hover:opacity-100 disabled:cursor-wait">
              {avatarUploading ? <Loader2 size={18} className="animate-spin text-white" /> : <Camera size={18} className="text-white" />}
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
              <Camera size={13} /> {avatarFile ? "Trocar imagem" : "Carregar foto"}
            </button>
            {avatarFile && <p className="mt-1.5 truncate text-[11px] text-slate-500">{avatarFile.name}</p>}
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-600">JPEG, PNG, WebP ou GIF · máx. {MAX_FILE_SIZE_MB} MB</p>
            {avatarError && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400">
                <AlertCircle size={10} /> {avatarError}
              </p>
            )}
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} onChange={onFileChange} className="sr-only" tabIndex={-1} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Nome de exibição <span className="text-rose-500 dark:text-rose-400">*</span></label>
        <input type="text" value={draft.fullName} onChange={(e) => onDraftChange({ ...draft, fullName: e.target.value })} maxLength={60}
          placeholder="O teu nome completo"
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600" />
        <p className="mt-1 text-right text-[10px] text-slate-500 dark:text-slate-600">{draft.fullName.length}/60</p>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Bio <span className="text-slate-400 dark:text-slate-600">(opcional)</span></label>
        <textarea value={draft.bio} onChange={(e) => onDraftChange({ ...draft, bio: e.target.value })} rows={3} maxLength={160}
          placeholder="Uma breve apresentação..."
          className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600" />
        <p className={`mt-0.5 text-right text-[10px] transition ${bioLength > 140 ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-600"}`}>{bioLength}/160</p>
      </div>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-600">Campos bloqueados</p>
        <div className="grid grid-cols-2 gap-2 text-[11px] opacity-70 dark:opacity-60">
          {[
            { label: "Curso", value: user.course },
            { label: "Ano", value: `${user.academicYear}º ano` },
            { label: "Semestre", value: `${user.semester}º semestre` },
            { label: "Perfil", value: ROLE_LABELS[user.role] },
          ].map(({ label, value }) => (
            <div key={label} className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/5 dark:bg-white/[0.03]">
              <span className="block text-slate-500 dark:text-slate-600">{label}</span>
              <span className="mt-0.5 block truncate font-medium text-slate-600 dark:text-slate-400">{value}</span>
            </div>
          ))}
        </div>
      </div>
      {profileError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-[11px] text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={12} className="mt-0.5 shrink-0" /> {profileError}
        </div>
      )}
      {!hasProfileSave && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-700 dark:border-amber-500/15 dark:bg-amber-500/[0.08] dark:text-amber-400">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span><strong>Dev:</strong> passa <code className="font-mono">onProfileSave</code> e <code className="font-mono">onAvatarUpload</code> para ligar ao Supabase.</span>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={saving}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
          Cancelar
        </button>
        <button type="button" onClick={onSave} disabled={saving || !hasProfileSave}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? <><Loader2 size={14} className="animate-spin" />A guardar...</> : <><Check size={14} />Guardar</>}
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
    <div className="space-y-4 p-5">
      <div className="flex items-start gap-4">
        <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
      </div>
      <Skeleton className="h-9 rounded-xl" />
    </div>
  );
});

const ProfileEmpty = memo(function ProfileEmpty() {
  return (
    <div className="p-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center dark:border-white/10 dark:bg-slate-950/40">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800">
          <Users size={20} className="text-slate-500 dark:text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Nenhum utilizador autenticado</p>
        <p className="mt-1 text-xs text-slate-500">Faça login para aceder ao seu perfil.</p>
      </div>
    </div>
  );
});

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

  /* ================================================================
     PESQUISA REAL
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

      let queryBuilder = supabase
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
        .limit(20);

      if (typeFilter) queryBuilder = queryBuilder.eq("type", typeFilter);

      const { data, error } = await queryBuilder;
      if (error) throw error;

      const results: SearchResult[] = (data ?? [])
        .filter((c: any) => c.topic?.chapter?.discipline)
        .map((c: any) => ({
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

      setSearchResults(results);
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

      for (const row of (quizRes.data ?? [])) {
        notifs.push({
          id: `quiz-${row.id}`,
          type: "quiz",
          title: `Quiz concluído: ${row.correct_answers}/${row.total_questions} respostas corretas`,
          time: formatRelativeTime(row.attempted_at),
          read: false,
          contentId: row.content_id,
        });
      }

      for (const row of (progressRes.data ?? [])) {
        if (row.completed) {
          notifs.push({
            id: `progress-${row.id}`,
            type: "slide",
            title: `Conteúdo concluído (${row.progress_percent}%)`,
            time: formatRelativeTime(row.updated_at),
            read: false,
            contentId: row.content_id,
          });
        }
      }

      notifs.sort((a, b) => a.time.localeCompare(b.time));
      setNotifications(notifs.slice(0, 15));
      setNotifLoadedOnce(true);
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
      setNotifError("Não foi possível carregar as notificações.");
    } finally {
      setNotifLoading(false);
    }
  }, [supabase, profile?.id, user?.id]);

  useEffect(() => {
    if (notifOpen) void fetchNotifs();
  }, [notifOpen, fetchNotifs]);

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
    try { await onLogout?.(); } finally {
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
    router.push(`/disciplinas/${result.disciplineId}?open${result.type === "quiz" ? "Quiz" : "Slide"}=${result.id}`);
  };

  /* ================================================================
     RENDER
  ================================================================ */
  return (
    <>
      <header className={`fixed top-0 z-40 h-16 border-b border-slate-200/70 bg-slate-100/80 backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-slate-950/80 right-0 left-0 ${expanded ? "md:left-56" : "md:left-16"}`}>
        <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4 md:px-6">

          {/* Esquerda */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button type="button" onClick={() => setMobileOpen?.(!mobileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-slate-300/60 dark:hover:bg-slate-800 md:hidden" aria-label="Abrir menu">
              <Menu size={22} className="text-slate-700 dark:text-slate-200" />
            </button>
            <span className="hidden text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 md:block">
              Biblioteca Virtual - ISAF
            </span>
          </div>

          {/* Centro: pesquisa desktop */}
          <div className="hidden min-w-0 flex-1 px-2 md:block md:px-6" ref={filterRef}>
            <div className="relative mx-auto max-w-xl">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
                placeholder="Pesquisar conteúdos..."
                className="h-10 w-full rounded-full border border-slate-300 bg-white pl-10 pr-12 text-sm text-slate-800 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-800" />
              <button type="button" onClick={() => { setFilterOpen(!filterOpen); setNotifOpen(false); setProfileOpen(false); }}
                className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition ${filterOpen ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}
                aria-label="Filtros">
                <SlidersHorizontal size={14} />
              </button>

              {/* Dropdown filtros */}
              <div className={`absolute right-0 top-full z-auto mt-2 w-80 origin-top-right transition-all ${filterOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}>
                <div className={`max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl border border-slate-300 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-slate-900 ${SCROLLBAR_THIN}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-700 dark:text-slate-300">Filtros Rápidos</h3>
                      <p className="text-xs text-slate-500">Seleciona o tipo de conteúdo</p>
                    </div>
                    <button type="button" onClick={() => setFilterOpen(false)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" aria-label="Fechar">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="mt-4 space-y-1">
                    {FILTER_OPTIONS.map(({ id, label, icon: Icon, color, description }) => (
                      <button key={id} type="button" onClick={() => { setSelectedFilter(id); setFilterOpen(false); }}
                        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedFilter === id ? "bg-blue-50 dark:bg-blue-950/40" : ""}`}>
                        <Icon size={17} className={`shrink-0 ${color}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
                          <p className="text-xs text-slate-500">{description}</p>
                        </div>
                        {selectedFilter === id && <Check size={14} className="shrink-0 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dropdown resultados */}
              {searchOpen && (
                <div ref={searchResultsRef} className={`absolute left-0 right-0 top-full z-50 mt-2 max-h-[400px] overflow-y-auto rounded-2xl border border-slate-300 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900 ${SCROLLBAR_THIN}`}>
                  {searchLoading ? (
                    <div className="flex items-center justify-center gap-2 p-6">
                      <Loader2 size={18} className="animate-spin text-blue-500" />
                      <span className="text-sm text-slate-500">A pesquisar...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-sm text-slate-500">Sem resultados para "{searchQuery}"</p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {searchResults.map((result) => {
                        const Icon = result.type === "audio" ? Headphones : result.type === "slide" ? FileText : Trophy;
                        return (
                          <button key={`${result.type}-${result.id}`} type="button" onClick={() => handleResultClick(result)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              result.type === "audio" ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                              : result.type === "slide" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"}`}>
                              <Icon size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{result.title}</p>
                              <p className="truncate text-xs text-slate-500">{result.disciplineName} · {result.chapterTitle} · {result.topicTitle}</p>
                            </div>
                            <ArrowRight size={14} className="shrink-0 text-slate-400" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Centro mobile */}
          <div className="flex flex-1 items-center justify-center overflow-hidden md:hidden">
            <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-300">Biblioteca ISAF</span>
          </div>

          {/* Direita */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => { setMobileSearchOpen(true); setNotifOpen(false); setProfileOpen(false); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white transition hover:bg-slate-100 dark:border-slate-700 dark:bg-transparent dark:hover:bg-slate-800 md:hidden" aria-label="Pesquisar">
              <Search size={18} className="text-slate-600 dark:text-slate-300" />
              {searchQuery && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-blue-500" />}
            </button>

            {/* Notificações */}
            <div className="relative" ref={notifRef}>
              <button type="button" onClick={() => { setNotifOpen(!notifOpen); setFilterOpen(false); setProfileOpen(false); setMobileSearchOpen(false); setSearchOpen(false); }}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white transition hover:bg-slate-100 dark:border-slate-700 dark:bg-transparent dark:hover:bg-slate-800" aria-label="Notificações">
                <Bell size={18} className="text-slate-600 dark:text-slate-300" />
                {hasNotifs && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow">
                    {dynamicCount > 9 ? "9+" : dynamicCount}
                  </span>
                )}
              </button>

              <div className={`fixed inset-x-4 top-[4.5rem] z-50 origin-top transition-all sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:z-auto sm:mt-2 sm:w-96 sm:origin-top-right ${notifOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}>
                <div className="max-h-[calc(100vh-5rem)] overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-white/10">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Notificações</h3>
                    <div className="flex items-center gap-2">
                      {hasNotifs && <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">{dynamicCount} nova{dynamicCount !== 1 ? "s" : ""}</span>}
                      <button type="button" onClick={() => void fetchNotifs()} title="Atualizar" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                        <RefreshCw size={13} className={notifLoading ? "animate-spin" : ""} />
                      </button>
                    </div>
                  </div>
                  <div className={`max-h-[400px] overflow-y-auto ${SCROLLBAR_THIN}`}>
                    {notifLoading && (
                      <div className="flex flex-col items-center justify-center gap-3 p-10">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        <p className="text-sm text-slate-500">A carregar...</p>
                      </div>
                    )}
                    {!notifLoading && notifError && (
                      <div className="flex flex-col items-center gap-3 p-10 text-center">
                        <AlertCircle size={24} className="text-rose-400" />
                        <p className="text-sm text-slate-600 dark:text-slate-300">{notifError}</p>
                        <button type="button" onClick={() => void fetchNotifs()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500">Tentar novamente</button>
                      </div>
                    )}
                    {!notifLoading && !notifError && notifications.length === 0 && (
                      <div className="flex flex-col items-center gap-3 p-10 text-center">
                        <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Tudo em dia!</p>
                          <p className="mt-0.5 text-xs text-slate-500">Quando houver novidades, aparecem aqui.</p>
                        </div>
                      </div>
                    )}
                    {!notifLoading && !notifError && notifications.map((n) => {
                      const Icon = getNotifIcon(n.type);
                      return (
                        <div key={n.id} className={`flex gap-4 border-b border-slate-100 px-5 py-4 last:border-none transition dark:border-white/10 ${!n.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""} hover:bg-slate-50 dark:hover:bg-slate-800/60`}>
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                            <Icon size={16} className="text-slate-500 dark:text-slate-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">{n.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{n.time}</p>
                          </div>
                          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Perfil */}
            <div className="relative" ref={profileRef}>
              <div className="flex h-10 items-center gap-0.5 rounded-full border border-slate-300 bg-white pl-1 pr-1.5 transition-colors dark:border-slate-700 dark:bg-slate-900">
                <button type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
                  title={theme === "dark" ? "Modo claro" : "Modo escuro"}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                  {themeReady && theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <span className="h-5 w-px shrink-0 bg-slate-300 dark:bg-slate-700" aria-hidden="true" />
                <button type="button" onClick={() => { setProfileOpen(!profileOpen); setFilterOpen(false); setNotifOpen(false); setMobileSearchOpen(false); setSearchOpen(false); }}
                  className="flex items-center gap-2 rounded-full py-1 pl-1.5 pr-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-haspopup="menu" aria-expanded={profileOpen} aria-label="Conta">
                  {userLoading ? <Skeleton className="h-8 w-8 rounded-full" /> : <Avatar src={user?.avatarUrl} name={user?.fullName} size="sm" className="rounded-full" />}
                  <div className="hidden min-w-0 max-w-[120px] text-left md:block">
                    {userLoading ? (
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-2.5 w-28" />
                      </div>
                    ) : (
                      <>
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{user?.fullName ?? "Utilizador"}</p>
                        <p className="truncate text-[11px] text-slate-600 dark:text-slate-500">{user ? `${user.course} · ${user.academicYear}º ano` : "Perfil"}</p>
                      </>
                    )}
                  </div>
                  <ChevronDown size={13} className={`shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${profileOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              <div className={`fixed inset-x-4 top-[4.5rem] z-50 origin-top transition-all sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:z-auto sm:mt-2 sm:w-[26rem] sm:origin-top-right ${profileOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}>
                <div className={`max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900 ${SCROLLBAR_THIN}`}>
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
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 px-3 dark:border-white/10">
          <button type="button" onClick={() => setMobileSearchOpen(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar pesquisa">
            <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input ref={mobileSearchInputRef} type="text" inputMode="search" enterKeyHint="search"
              value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") mobileSearchInputRef.current?.blur(); }}
              placeholder="Pesquisar conteúdos..."
              className="h-11 w-full rounded-full border border-slate-300 bg-slate-50 pl-10 pr-10 text-sm text-slate-800 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500" />
            {searchQuery && (
              <button type="button" onClick={() => { onSearchChange(""); mobileSearchInputRef.current?.focus(); }}
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700" aria-label="Limpar pesquisa">
                <X size={14} />
              </button>
            )}
          </div>
          <button type="button" onClick={() => setFilterOpen(!filterOpen)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${filterOpen ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
            aria-label="Filtros">
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {filterOpen && (
          <div className={`border-b border-slate-200 p-4 dark:border-white/10 max-h-[40vh] overflow-y-auto ${SCROLLBAR_THIN}`}>
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Filtros rápidos</p>
            <div className="space-y-1">
              {FILTER_OPTIONS.map(({ id, label, icon: Icon, color, description }) => (
                <button key={id} type="button" onClick={() => { setSelectedFilter(id); setFilterOpen(false); }}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedFilter === id ? "bg-blue-50 dark:bg-blue-950/40" : ""}`}>
                  <Icon size={17} className={`shrink-0 ${color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
                    <p className="text-xs text-slate-500">{description}</p>
                  </div>
                  {selectedFilter === id && <Check size={14} className="shrink-0 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto ${SCROLLBAR_THIN}`}>
          {searchLoading ? (
            <div className="flex items-center justify-center gap-2 p-6">
              <Loader2 size={18} className="animate-spin text-blue-500" />
              <span className="text-sm text-slate-500">A pesquisar...</span>
            </div>
          ) : searchResults.length === 0 ? (
            searchQuery.trim().length >= 2 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-slate-500">Sem resultados para "{searchQuery}"</p>
              </div>
            ) : null
          ) : (
            <div className="p-2">
              {searchResults.map((result) => {
                const Icon = result.type === "audio" ? Headphones : result.type === "slide" ? FileText : Trophy;
                return (
                  <button key={`${result.type}-${result.id}`} type="button" onClick={() => handleResultClick(result)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      result.type === "audio" ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                      : result.type === "slide" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{result.title}</p>
                      <p className="truncate text-xs text-slate-500">{result.disciplineName} · {result.chapterTitle} · {result.topicTitle}</p>
                    </div>
                    <ArrowRight size={14} className="shrink-0 text-slate-400" />
                  </button>
                );
              })}
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