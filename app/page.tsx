"use client";

import { useEffect, useState } from "react";
import WelcomeBanner from "@/app/components/home/WelcomeBanner";
import SectionCarousel from "@/app/components/home/SectionCarousel";
import AudioCard from "@/app/components/home/AudioCard";
import SlideCard from "@/app/components/home/SlideCard";
import QuizCard from "@/app/components/home/QuizCard";
import { disciplinaImages } from "@/data/disciplinaImages";

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
        // ==================== FUTURO - API REAL ====================
        // const [audiosRes, slidesRes, quizzesRes] = await Promise.all([
        //   fetch("/api/user/history/audio"),
        //   fetch("/api/user/history/slides"),
        //   fetch("/api/user/history/quizzes"),
        // ]);

        // const audios = await audiosRes.json();
        // const slides = await slidesRes.json();
        // const quizzes = await quizzesRes.json();

        // setHistoricoAudios(audios);
        // setHistoricoSlides(slides);
        // setHistoricoQuizzes(quizzes);

        // ==================== MOCK TEMPORÁRIO (REMOVER DEPOIS) ====================
        const mockAudios: UserAudioHistory[] = [
          {
            id: 1,
            disciplina: "Fundamentos de Sistemas de Informação",
            tema: "Introdução aos Sistemas de Informação",
            duracao: "14:32",
            progress: 45,
          },
          {
            id: 2,
            disciplina: "Fundamentos de Sistemas de Informação",
            tema: "Componentes de um Sistema",
            duracao: "22:10",
            progress: 80,
          },
          {
            id: 3,
            disciplina: "Comunicação Pessoal e Empresarial",
            tema: "Comunicação Assertiva",
            duracao: "08:45",
            progress: 30,
          },
        ];

        const mockSlides: UserSlideHistory[] = [
          {
            id: 101,
            disciplina: "Fundamentos de Sistemas de Informação",
            tituloSlide: "Introdução aos Sistemas de Informação",
            slidesVistos: 12,
            totalSlides: 25,
            ultimaVisualizacao: "2 dias atrás",
          },
          {
            id: 102,
            disciplina: "Introdução aos Sistemas de Informação",
            tituloSlide: "Componentes de um Sistema",
            slidesVistos: 25,
            totalSlides: 25,
            ultimaVisualizacao: "Há 5 horas",
          },
          {
            id: 103,
            disciplina: "Comunicação Pessoal e Empresarial",
            tituloSlide: "Comunicação Assertiva",
            slidesVistos: 8,
            totalSlides: 18,
            ultimaVisualizacao: "Ontem",
          },
        ];

        const mockQuizzes: UserQuizHistory[] = [
          {
            id: 201,
            disciplina: "Introdução aos Sistemas de Informação",
            tituloQuiz: "Teste 1 - Sistemas de Informação",
            pontuacao: 14,
            totalPerguntas: 15,
            dataConclusao: "3 dias atrás",
          },
          {
            id: 202,
            disciplina: "Comunicação Pessoal e Empresarial",
            tituloQuiz: "Teste 2 - Comunicação no Trabalho",
            pontuacao: 9,
            totalPerguntas: 12,
            dataConclusao: "1 semana atrás",
          },
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
    <div className="space-y-6 md:space-y-10 p-8 md:p-8 pt-24 md:pt-24 max-w-7xl mx-auto">
      <WelcomeBanner userName="Manuel" />

      <SectionCarousel title="Continuar a ouvir">
        {loading ? (
          <p className="py-8 text-gray-500 dark:text-gray-400">A carregar áudios...</p>
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
          <p className="py-8 text-gray-500 dark:text-gray-400">Nenhum áudio no histórico.</p>
        )}
      </SectionCarousel>

      <SectionCarousel title="Slides lidos recentemente">
        {loading ? (
          <p className="py-8 text-gray-500 dark:text-gray-400">A carregar slides...</p>
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
          <p className="py-8 text-gray-500 dark:text-gray-400">Ainda não leste nenhum slide.</p>
        )}
      </SectionCarousel>

      <SectionCarousel title="Questionários em andamento">
        {loading ? (
          <p className="py-8 text-gray-500 dark:text-gray-400">A carregar questionários...</p>
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
          <p className="py-8 text-gray-500 dark:text-gray-400">Ainda não fizeste nenhum questionário.</p>
        )}
      </SectionCarousel>
    </div>
  );
}