// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import WelcomeBanner from "@/app/components/home/WelcomeBanner";
import SectionCarousel from "@/app/components/home/SectionCarousel";
import AudioCard from "@/app/components/home/AudioCard";
import SlideCard from "@/app/components/home/SlideCard";
import QuizCard from "@/app/components/home/QuizCard";
import { disciplinaImages } from "@/data/disciplinaImages";
import { useUser } from "@/app/lib/context/UserContext";

// ===================== TIPOS =====================
type UserAudioHistory = {
  id: string | number;
  disciplina: string;
  tema: string;
  duracao: string;
  progress?: number;
};

type UserSlideHistory = {
  id: string | number;
  disciplina: string;
  tituloSlide: string;
  slidesVistos: number;
  totalSlides?: number;
  ultimaVisualizacao?: string;
  progress?: number;
};

type UserQuizHistory = {
  id: string | number;
  disciplina: string;
  tituloQuiz: string;
  pontuacao: number;
  totalPerguntas: number;
  dataConclusao?: string;
};

// ===================== HOME PAGE =====================
export default function HomePage() {
  const { user } = useUser();
  const [historicoAudios, setHistoricoAudios] = useState<UserAudioHistory[]>([]);
  const [historicoSlides, setHistoricoSlides] = useState<UserSlideHistory[]>([]);
  const [historicoQuizzes, setHistoricoQuizzes] = useState<UserQuizHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const getThumbnail = (disciplina: string): string => {
    return (
      disciplinaImages[disciplina as keyof typeof disciplinaImages] ||
      disciplinaImages.default ||
      "/images/disciplinas/default.jpg"
    );
  };

  useEffect(() => {
    const loadUserHistory = async () => {
      setLoading(true);
      try {
        const mockAudios: UserAudioHistory[] = [
          { id: 1, disciplina: "Fundamentos de Sistemas de Informação", tema: "Introdução aos Sistemas de Informação", duracao: "14:32", progress: 45 },
          { id: 2, disciplina: "Metodologias de Investigação Científica", tema: "Ciencia e Pesquisa", duracao: "22:10", progress: 80 },
          { id: 3, disciplina: "Comunicação Pessoal e Empresarial", tema: "Comunicação Assertiva", duracao: "08:45", progress: 30 },
          { id: 4, disciplina: "Matemática I", tema: "Funções e Gráficos", duracao: "22:10", progress: 80 },
          { id: 5, disciplina: "Inglês I", tema: "The verbs 'to be' and 'to have'", duracao: "08:45", progress: 30 },
        ];

        const mockSlides: UserSlideHistory[] = [
          { id: 101, disciplina: "Fundamentos de Sistemas de Informação", tituloSlide: "Introdução aos Sistemas de Informação", slidesVistos: 12, totalSlides: 25, ultimaVisualizacao: "2 dias atrás" },
          { id: 102, disciplina: "Inglês I", tituloSlide: "Adjetivos e Advérbios", slidesVistos: 25, totalSlides: 25, ultimaVisualizacao: "Há 5 horas" },
          { id: 103, disciplina: "Comunicação Pessoal e Empresarial", tituloSlide: "Comunicação Assertiva", slidesVistos: 8, totalSlides: 18, ultimaVisualizacao: "Ontem" },
          { id: 104, disciplina: "Metodologias de Investigação Científica", tituloSlide: "Pesquisa Bibliográfica", slidesVistos: 25, totalSlides: 25, ultimaVisualizacao: "Há 5 horas" },
          { id: 105, disciplina: "Matemática I", tituloSlide: "Matrizes e Determinantes", slidesVistos: 8, totalSlides: 18, ultimaVisualizacao: "Ontem" },
        ];

        const mockQuizzes: UserQuizHistory[] = [
          { id: 201, disciplina: "Inglês I", tituloQuiz: "Teste 1 - Composição de Frases", pontuacao: 14, totalPerguntas: 15, dataConclusao: "3 dias atrás" },
          { id: 202, disciplina: "Matemática I", tituloQuiz: "Teste 2 - Matrizes e Determinantes", pontuacao: 9, totalPerguntas: 12, dataConclusao: "1 semana atrás" },
          { id: 203, disciplina: "Metodologias de Investigação Científica", tituloQuiz: "Teste 1 - Recolha de Dados", pontuacao: 14, totalPerguntas: 15, dataConclusao: "3 dias atrás" },
          { id: 204, disciplina: "Fundamentos de Sistemas de Informação", tituloQuiz: "Teste 3 - Componentes de um SI", pontuacao: 9, totalPerguntas: 12, dataConclusao: "1 semana atrás" },
          { id: 205, disciplina: "Comunicação Pessoal e Empresarial", tituloQuiz: "Teste 2 - Estilos de comunicação", pontuacao: 14, totalPerguntas: 15, dataConclusao: "3 dias atrás" },
        ];

        setHistoricoAudios(mockAudios);
        setHistoricoSlides(mockSlides);
        setHistoricoQuizzes(mockQuizzes);
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserHistory();
  }, []);

  return (
    // CORREÇÃO: Removido pt-18 md:pt-24 — o AppShell já trata do espaço com pt-16
    <div className="space-y-6 md:space-y-10">

      {/* Banner de boas-vindas */}
      <WelcomeBanner userName={user?.name?.split(" ")[0] ?? "Estudante"} />

      {/* ===================== TUTOR IA ===================== */}
      <section className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 md:p-5">
        <div className="flex flex-col gap-4">
          
          {/* Cabeçalho do card */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15">
              <Sparkles size={20} className="text-violet-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-white">Tutor IA</h2>
              {/* min-w-0 + break-words garantem que o texto não sai do card */}
              <p className="mt-0.5 break-words text-sm text-slate-400">
                Escolhe uma disciplina e um tema. A IA responde às tuas dúvidas
                com base nos conteúdos da cadeira.
              </p>
            </div>
          </div>

          {/* Botão — w-full no mobile, auto no desktop */}
          <a
            href="/disciplinas"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 sm:w-auto sm:self-end"
          >
            <Sparkles size={15} />
            Começar
          </a>
        </div>
      </section>

      {/* ===================== CARROSSÉIS ===================== */}
      <SectionCarousel title="Continuar a ouvir">
        {loading ? (
          <p className="py-8 text-sm text-slate-400">A carregar áudios...</p>
        ) : historicoAudios.length > 0 ? (
          historicoAudios.map((item) => (
            <AudioCard
              key={item.id}
              disciplina={item.disciplina}
              tema={item.tema}
              duracao={item.duracao}
              thumbnail={getThumbnail(item.disciplina)}
              progress={item.progress}
            />
          ))
        ) : (
          <p className="py-8 text-sm text-slate-400">Nenhum áudio no histórico.</p>
        )}
      </SectionCarousel>

      <SectionCarousel title="Slides lidos recentemente">
        {loading ? (
          <p className="py-8 text-sm text-slate-400">A carregar slides...</p>
        ) : historicoSlides.length > 0 ? (
          historicoSlides.map((item) => (
            <SlideCard
              key={item.id}
              id={item.id}
              disciplina={item.disciplina}
              tituloSlide={item.tituloSlide}
              slidesVistos={item.slidesVistos}
              totalSlides={item.totalSlides}
              ultimaVisualizacao={item.ultimaVisualizacao}
              thumbnail={getThumbnail(item.disciplina)}
              progress={item.progress}
            />
          ))
        ) : (
          <p className="py-8 text-sm text-slate-400">Ainda não leste nenhum slide.</p>
        )}
      </SectionCarousel>

      <SectionCarousel title="Questionários em andamento">
        {loading ? (
          <p className="py-8 text-sm text-slate-400">A carregar questionários...</p>
        ) : historicoQuizzes.length > 0 ? (
          historicoQuizzes.map((item) => (
            <QuizCard
              key={item.id}
              id={item.id}
              disciplina={item.disciplina}
              tituloQuiz={item.tituloQuiz}
              pontuacao={item.pontuacao}
              totalPerguntas={item.totalPerguntas}
              dataConclusao={item.dataConclusao}
              thumbnail={getThumbnail(item.disciplina)}
            />
          ))
        ) : (
          <p className="py-8 text-sm text-slate-400">Ainda não fizeste nenhum questionário.</p>
        )}
      </SectionCarousel>
    </div>
  );
}