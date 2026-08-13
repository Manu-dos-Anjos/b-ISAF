export const iconMap = {
  book: "book",
  video: "video",
  star: "star",
  code: "code",
} as const;

export type ContentType = "audio" | "slide" | "quiz";

export interface TopicContent {
  id: string;
  type: ContentType;
  title: string;
  url?: string;
  timeLimitSeconds?: number | null;
  durationSeconds?: number | null; // ✅ NOVO
}

export interface Topic {
  id: string;
  title: string;
  contents: TopicContent[];
}

export interface Chapter {
  id: string;
  title: string;
  status: "Concluído" | "Não concluído";
  topics: Topic[];
  quiz?: TopicContent | null;
}

export interface Discipline {
  id: string;
  title: string;
  professor: string;
  progress: number;
  lessonCount: number;
  icon: keyof typeof iconMap;
  coverUrl: string;
  href: string;
  introVideoUrl?: string;
  year: string;
  semester: string;
  course: string;
  chapters?: Chapter[];
}