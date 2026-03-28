"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Bookmark,
  History,
  GraduationCap,
  ClipboardList,
  User,
} from "lucide-react";

const navItems = [
  { label: "Início", href: "/", icon: Home },
  { label: "Disciplinas", href: "/disciplinas", icon: BookOpen },
  { label: "Guardados", href: "/guardados", icon: Bookmark },
  { label: "Histórico", href: "/historico", icon: History },
  { label: "Meu Curso", href: "/meu-curso", icon: GraduationCap },
  { label: "Avaliações", href: "/avaliacoes", icon: ClipboardList },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden rounded-r-3xl border-r border-white/10 bg-[linear-gradient(180deg,#220B46_0%,#3248C8_48%,#744FF6_100%)] py-4 shadow-2xl transition-all duration-300 ease-in-out ${
        expanded ? "w-48 px-2.5" : "w-[64px] px-1.5"
      }`}
    >
      {/* Topo */}
      <div>
        <div
          className={`flex items-center transition-all duration-300 ${
            expanded ? "gap-2.5 px-2" : "justify-center"
          }`}
        >
          <Image
            src="/logo.svg"
            alt="b-ISAF"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />

          <div
            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
              expanded ? "max-w-[110px] opacity-100" : "max-w-0 opacity-0"
            }`}
          >
            <h1 className="text-base font-semibold leading-none text-white">
              b-ISAF
            </h1>
            <p className="mt-1 text-[10px] text-white/70">
              Biblioteca virtual
            </p>
          </div>
        </div>

        <div className="mt-4 h-px bg-white/10" />
      </div>

      {/* Menu centrado */}
      <div className="flex flex-1 items-center">
        <nav className="w-full space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex items-center text-sm font-medium transition-all duration-200 ${
                  expanded
                    ? "mx-1 h-11 gap-2.5 rounded-xl px-2.5"
                    : isActive
                    ? "mx-auto h-10 w-10 justify-center rounded-xl bg-white/12"
                    : "mx-auto h-10 w-10 justify-center rounded-xl"
                } ${
                  expanded
                    ? isActive
                      ? "bg-white/12 text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                    : isActive
                    ? "text-white"
                    : "text-white/85 hover:text-white"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white" />
                )}

                {/* Ícone */}
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                    expanded
                      ? isActive
                        ? "bg-white/12 ring-1 ring-white/10"
                        : "group-hover:bg-white/10"
                      : ""
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] text-white" />
                </span>

                {/* Texto */}
                <span
                  className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                    expanded ? "max-w-[100px] opacity-100" : "max-w-0 opacity-0"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Rodapé */}
      <div className="border-t border-white/10 pt-4">
        <div
          className={`flex items-center transition-all duration-300 ${
            expanded ? "gap-2.5 rounded-xl bg-white/10 p-2.5" : "justify-center"
          }`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#171225] text-white shadow-md">
            <User className="h-4 w-4" />
          </div>

          <div
            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
              expanded ? "max-w-[90px] opacity-100" : "max-w-0 opacity-0"
            }`}
          >
            <p className="text-sm font-semibold text-white">Nome</p>
            <p className="text-[11px] text-white/70">Estudante</p>
          </div>
        </div>
      </div>
    </aside>
  );
}