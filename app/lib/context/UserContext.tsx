// app/lib/context/UserContext.tsx
"use client";

import { createContext, useContext } from "react";

export type AcademicInfo = {
  year: string;
  semester: string;
  course: string;
  studentNumber: string;
  institution: string;
};

export type AppUser = {
  name: string;
  email: string;
  avatarUrl?: string;
  academic: AcademicInfo;
  status: {
    label: string;
    // Garante que o tone tem os mesmos valores que o Sidebar espera
    tone: "success" | "warning" | "error" | "info";
  };
};

type UserContextType = {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
};

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
});

export function useUser() {
  return useContext(UserContext);
}