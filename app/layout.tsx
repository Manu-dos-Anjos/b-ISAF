import type { Metadata } from "next";
import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/Header";
import "./globals.css";


export const metadata: Metadata = {
  title: "b-ISAF",
  description: "Biblioteca Virtual ISAF",
};

export default function Rootlayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className="bg-zinc-950 text-slate-100">
        <div className="flex">
          <Sidebar />
          <div className="flex-1 ml-20">
            <Header />
            <main className="p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}