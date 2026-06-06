import AvaliacoesClient from "./AvaliacoesClient";
import {
  mockProfile,
  mockQuizItems,
  mockDisciplines,
} from "./mockAvaliacoes";

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