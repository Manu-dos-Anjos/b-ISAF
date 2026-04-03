import WelcomeBanner from "@/app/components/home/WelcomeBanner";
import SectionCarousel from "@/app/components/home/SectionCarousel";

export default function HomePage() {
  return (
    <div className="space-y-8 p-4 md:p-8 pt-20 md:pt-24 max-w-7xl mx-auto">
      <WelcomeBanner userName="Manuel" />

      <SectionCarousel title="Continuar a ouvir">
        <div className="h-[110px] w-[250px] shrink-0 rounded-[22px] bg-slate-200 dark:bg-slate-700" />
        <div className="h-[110px] w-[250px] shrink-0 rounded-[22px] bg-slate-200 dark:bg-slate-700" />
        <div className="h-[110px] w-[250px] shrink-0 rounded-[22px] bg-slate-200 dark:bg-slate-700" />
        <div className="h-[110px] w-[250px] shrink-0 rounded-[22px] bg-slate-200 dark:bg-slate-700" />
        <div className="h-[110px] w-[250px] shrink-0 rounded-[22px] bg-slate-200 dark:bg-slate-700" />
      </SectionCarousel>
    </div>
  );
}