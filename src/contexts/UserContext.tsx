// app/lib/context/UserContext.tsx
"use client";

import { createContext, useContext } from "react";

/* ================================================================
   TIPOS
   ================================================================ */

export type AcademicInfo = {
  year:          string; // "1º Ano"
  semester:      string; // "1º Semestre"
  course:        string; // "Informática de Gestão Financeira"
  studentNumber: string;
  institution:   string;
};

export type AppUser = {
  name:      string;
  email:     string;
  avatarUrl?: string | null;
  academic:  AcademicInfo;
  status: {
    label: string;
    tone:  "success" | "warning" | "error" | "info";
  };
};

type UserContextType = {
  user:    AppUser | null;
  setUser: (user: AppUser | null) => void;
};

/* ================================================================
   CONTEXTO
   ================================================================ */

export const UserContext = createContext<UserContextType>({
  user:    null,
  setUser: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

/* ================================================================
   DADOS MOCK (centralizados aqui para fácil substituição)
   Fase 2: substituir por dados reais do Supabase Auth + profiles
   ================================================================ */

export const MOCK_USER: AppUser = {
  name:      "Manuel dos Anjos",
  email:     "250438@isaf.co.ao",
  avatarUrl: null,
  academic: {
    year:          "1º Ano",
    semester:      "1º Semestre",
    course:        "Informática de Gestão Financeira",
    studentNumber: "250438",
    institution:   "Instituto Superior de Administração e Finanças",
  },
  status: { label: "Perfil Completo", tone: "success" },
};
