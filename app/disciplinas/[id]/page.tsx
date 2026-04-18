import { notFound } from "next/navigation";
import { getDisciplineById } from "@/app/lib/mockData";
import DisciplineClient from "./DisciplineClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  const discipline = getDisciplineById(id);

  if (!discipline) {
    notFound();
  }

  return <DisciplineClient discipline={discipline} />;
}