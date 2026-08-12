// app/meu-curso/page.tsx
import { Metadata } from "next";
import MeuCursoPageWrapper from "@/app/components/meu-curso/MeuCursoPageWrapper";

export const metadata: Metadata = { title: "Meu Curso | b-ISAF" };

export default function Page() {
  return <MeuCursoPageWrapper />;
}
