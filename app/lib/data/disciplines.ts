export type ContentType = "audio" | "slide" | "quiz";

export type TopicContent = {
  id: string;
  type: ContentType;
  title: string;
  href?: string;
};

export type Topic = {
  id: string;
  title: string;
  contents: TopicContent[];
};

export type Chapter = {
  id: string;
  title: string;
  status: "Concluído" | "Não concluído";
  topics: Topic[];
};

export type Discipline = {
  id: string;
  code: string;
  name: string;
  professor: string;
  year: string;
  semester: string;
  coverUrl?: string;
  chapters: Chapter[];
};

export const disciplines: Discipline[] = [];

export function getDisciplineById(id: string) {
  return disciplines.find((discipline) => discipline.id === id);
}