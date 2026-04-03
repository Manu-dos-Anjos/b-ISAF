import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BookOpen,
  Bookmark,
  History,
  GraduationCap,
  ClipboardList,
  Pin,
  PinOff,
  User,
  ChevronRight,
  X,
} from "lucide-react";

const navItems = [
  { id: "home", label: "Início", icon: Home, path: "/" },
  { id: "disciplines", label: "Disciplinas", icon: BookOpen, path: "/disciplinas" },
  { id: "saved", label: "Guardados", icon: Bookmark, path: "/guardados" },
  { id: "history", label: "Histórico", icon: History, path: "/historico" },
  { id: "my-course", label: "Meu Curso", icon: GraduationCap, path: "/meu-curso" },
  { id: "assessments", label: "Avaliações", icon: ClipboardList, path: "/avaliacoes" },
];

type SidebarProps = {
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  pinned: boolean;
  setPinned: (value: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (value: boolean) => void;
};

export default function Sidebar({ expanded, setExpanded, pinned, setPinned, mobileOpen = false, setMobileOpen }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";

  const handleMouseEnter = () => {
    if (!pinned) setExpanded(true);
  };

  const handleMouseLeave = () => {
    if (!pinned) setExpanded(false);
  };

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`hidden md:flex fixed top-0 left-0 h-full z-50 flex-col transition-all duration-300 ease-in-out
          ${expanded ? "w-56" : "w-16"}
          bg-white dark:bg-gradient-to-b dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950
          border-r border-gray-200 dark:border-white/10
          shadow-lg dark:shadow-2xl
        `}
      >
      {/* Logo area */}
      <div className={`flex items-center gap-3 px-3 py-4 border-b border-gray-200 dark:border-white/10 min-h-[64px] ${expanded ? "justify-between" : "justify-center"}`}>
        <div className="flex items-center gap-4 overflow-hidden">
          <img
            src="/logo.svg"
            alt="b-ISAF Logo"
            className="w-8 h-8 flex-shrink-0"
          />
          {expanded && (
            <div className="overflow-hidden whitespace-nowrap">
              <span className="font-bold text-lg tracking-wide text-black dark:text-white">b-ISAF</span>
            </div>
          )}
        </div>
        {expanded && (
          <button
            onClick={() => setPinned(!pinned)}
            className="text-gray-400 hover:text-black dark:text-white/40 dark:hover:text-white/80 transition-colors flex-shrink-0"
            title={pinned ? "Desafixar sidebar" : "Fixar sidebar"}
          >
            {pinned ? <PinOff size={18} strokeWidth={2} /> : <Pin size={18} strokeWidth={2} />}
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 flex flex-col gap-2 overflow-hidden justify-center">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <div key={item.id} className="relative px-2">
              {/* Active bar on the left (collapsed state) */}
              {!expanded && active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-black dark:bg-white" />
              )}

              <button
                onClick={() => router.push(item.path)}
                className={`
                  w-full flex items-center gap-3 rounded-xl transition-all duration-200
                  ${expanded ? "px-3 py-2.5" : "px-2 py-2.5 justify-center"}
                  ${
                    active
                      ? expanded
                        ? "bg-gray-100 text-black dark:bg-white/15 dark:text-white"
                        : "bg-gray-100 text-black dark:bg-white/10 dark:text-white"
                      : "text-gray-600 hover:text-black hover:bg-gray-50 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/8"
                  }
                `}
                title={!expanded ? item.label : undefined}
              >
                <Icon
                  size={20}
                  className={`flex-shrink-0 transition-colors ${
                    active ? "text-black dark:text-white" : "text-gray-600 dark:text-white/60"
                  }`}
                />
                {expanded && (
                  <>
                    <span
                      className={`text-sm font-medium flex-1 text-left whitespace-nowrap ${
                        active ? "text-black dark:text-white" : "text-gray-700 dark:text-white/70"
                      }`}
                    >
                      {item.label}
                    </span>
                    {active && (
                      <ChevronRight size={14} className="text-gray-500 dark:text-white/60 flex-shrink-0" />
                    )}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className={`border-t border-gray-200 dark:border-white/10 p-3 ${expanded ? "" : "flex justify-center"}`}>
        <div
          className={`flex items-center gap-3 rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-white/8 cursor-pointer transition-colors ${
            !expanded ? "justify-center" : ""
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-white" />
          </div>
          {expanded && (
            <div className="overflow-hidden">
              <p className="text-black dark:text-white text-xs font-semibold whitespace-nowrap">Estudante</p>
              <p className="text-gray-600 dark:text-white/40 text-[10px] whitespace-nowrap">1º Ano · ISAF</p>
            </div>
          )}
        </div>
      </div>
    </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-50 flex md:hidden flex-col bg-white dark:bg-gradient-to-b dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950 border-r border-gray-200 dark:border-white/10 shadow-lg dark:shadow-2xl transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Logo area */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-4">
            <img
              src="/logo.svg"
              alt="b-ISAF Logo"
              className="w-8 h-8 flex-shrink-0"
            />
            <span className="font-bold text-lg tracking-wide text-black dark:text-white">b-ISAF</span>
          </div>
          <button
            onClick={() => setMobileOpen?.(false)}
            className="text-gray-600 dark:text-white/60 hover:text-black dark:hover:text-white"
            title="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mobile Nav items */}
        <nav className="flex-1 py-4 flex flex-col gap-2 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  router.push(item.path);
                  setMobileOpen?.(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? "bg-gray-100 text-black dark:bg-white/15 dark:text-white"
                    : "text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/8"
                }`}
              >
                <Icon
                  size={20}
                  className={active ? "text-black dark:text-white" : "text-gray-600 dark:text-white/60"}
                />
                <span className="font-medium text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile User footer */}
        <div className="border-t border-gray-200 dark:border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-black dark:text-white text-xs font-semibold whitespace-nowrap">Estudante</p>
              <p className="text-gray-600 dark:text-white/40 text-[10px] whitespace-nowrap">1º Ano · ISAF</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
