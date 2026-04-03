export type AudioItem = {
  id: string
  title: string
  subject: string
  duration: string
  progress: number
  cover: string
}

export type SlideItem = {
  id: string
  title: string
  subject: string
  thumbnail: string
}

export type QuizItem = {
  id: string
  title: string
  progress: number
  questions: number
}

export type HomeData = {
  continueListening: AudioItem[]
  featuredSlides: SlideItem[]
  continueQuizzes: QuizItem[]
}

export async function getHomeData(userId: string): Promise<HomeData> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  return {
    continueListening: [
      {
        id: "audio-1",
        title: "Economia I - Balanços",
        subject: "Economia",
        duration: "32:15",
        progress: 45,
        cover: "/images/audio-cover.jpg",
      },
      {
        id: "audio-2",
        title: "Matemática - Funções",
        subject: "Matemática",
        duration: "28:40",
        progress: 30,
        cover: "/images/audio-cover.jpg",
      },
      {
        id: "audio-3",
        title: "Física - Mecânica",
        subject: "Física",
        duration: "25:10",
        progress: 30,
        cover: "/images/audio-cover.jpg",
      },
    ],
    featuredSlides: [
      {
        id: "slide-1",
        title: "Macroeconomia",
        subject: "Economia",
        thumbnail: "/images/slide-thumb.jpg",
      },
      {
        id: "slide-2",
        title: "Derivadas",
        subject: "Matemática",
        thumbnail: "/images/slide-thumb.jpg",
      },
      {
        id: "slide-3",
        title: "Lei de Newton",
        subject: "Física",
        thumbnail: "/images/slide-thumb.jpg",
      },
    ],
    continueQuizzes: [
      {
        id: "quiz-1",
        title: "Questionário - Microeconomia",
        progress: 45,
        questions: 20,
      },
      {
        id: "quiz-2",
        title: "Questionário - Cálculo",
        progress: 45,
        questions: 20,
      },
      {
        id: "quiz-3",
        title: "Questionário - Lógica",
        progress: 45,
        questions: 20,
      },
    ],
  }
}