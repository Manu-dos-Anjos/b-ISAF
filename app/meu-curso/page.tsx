import MeuCursoPage from "@/app/components/meu-curso/MeuCursoPage";

export const metadata = { title: "Meu Curso · b-ISAF" };

export default function Page() {
  return (
    <MeuCursoPage
      courseId="informatica-gestao-financeira"
      currentYear={1}
      currentSemester={1}
      studentName="Manuel dos Anjos"
      studentNumber="250438"
    />
  );
}