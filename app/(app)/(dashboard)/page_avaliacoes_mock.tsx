import AvaliacoesClient from "./avaliacoes/AvaliacoesClient";
import {
  mockProfile,
  mockQuizItems,
  mockDisciplines,
} from "./avaliacoes/mockAvaliacoes";

export const metadata = {
  title: "Avaliações | B-ISAF",
};

export default function AvaliacoesPage() {
  return (
    <AvaliacoesClient
      profile={mockProfile}
      quizItems={mockQuizItems}
      disciplines={mockDisciplines}
    />
  );
}