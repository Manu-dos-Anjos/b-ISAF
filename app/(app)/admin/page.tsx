// app/(app)/admin/page.tsx
"use client";

import Link from "next/link";
import {
  ShieldCheck, Calendar, BookOpen, Users, ScrollText,
  ChevronRight, Loader2, ShieldAlert,
} from "lucide-react";
import { useAdmin } from "@/app/lib/hooks/useAdmin";

const CARDS = [
  {
    href: "/admin/eventos",
    icon: Calendar,
    title: "Eventos",
    desc: "Publicar via mensagem do WhatsApp, destacar e apagar eventos.",
    ready: true,
  },
  {
    href: "/admin/disciplinas",
    icon: BookOpen,
    title: "Disciplinas & Conteúdos",
    desc: "Ler a árvore completa (capítulos → temas → conteúdos) e apagar qualquer nível.",
    ready: true,
  },
  {
    href: "#",
    icon: Users,
    title: "Utilizadores",
    desc: "Gerir estudantes, roles e suspensões.",
    ready: false,
  },
  {
    href: "#",
    icon: ScrollText,
    title: "Regulamentos",
    desc: "Editar documentos oficiais sem tocar em código.",
    ready: false,
  },
];

export default function AdminHubPage() {
  const { isAdmin, loading } = useAdmin();

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500 dark:text-slate-400">
        <Loader2 size={16} className="animate-spin" /> A verificar permissões…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <ShieldAlert size={32} className="text-rose-500" />
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Área restrita</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Não tens permissão de administrador para aceder a esta área.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho modo admin */}
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/50 sm:rounded-2xl sm:p-5">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-slate-50 dark:from-violet-950/50 dark:via-slate-950/80 dark:to-slate-950" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-600/15 dark:text-violet-400">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">Painel de Administração</h1>
              <span className="rounded-full border border-violet-300 bg-violet-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gestão total da plataforma: eventos, disciplinas, temas e conteúdos.
            </p>
          </div>
        </div>
      </section>

      {/* Cartões de privilégio */}
      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map(({ href, icon: Icon, title, desc, ready }) => {
          const body = (
            <>
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-violet-100 group-hover:text-violet-600 dark:bg-white/5 dark:text-slate-400 dark:group-hover:bg-violet-600/15 dark:group-hover:text-violet-400">
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {title}
                  {!ready && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-500 dark:bg-white/10 dark:text-slate-400">
                      Em breve
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
              </div>
              <ChevronRight size={14} className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500 dark:text-slate-600" />
            </>
          );
          const cls =
            "group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition dark:border-white/10 dark:bg-slate-950/40 dark:shadow-none " +
            (ready
              ? "hover:border-violet-300 hover:shadow-md dark:hover:border-violet-500/30"
              : "cursor-not-allowed opacity-60");

          return ready ? (
            <Link key={title} href={href} className={cls}>{body}</Link>
          ) : (
            <div key={title} className={cls}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}