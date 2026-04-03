export default function SectionCarousel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-black dark:text-white">{title}</h2>
      <div className="flex overflow-x-auto gap-4 pb-2">
        {children}
      </div>
    </div>
  );
}