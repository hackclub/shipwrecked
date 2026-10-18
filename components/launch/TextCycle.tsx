export default function TextCycle({ views }: { views: string[] }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold mb-4 italic text-center text-[#3B2715]">{views[0]}</h1>
      <p className="text-xl italic text-center text-[#3B2715]">
        (Click the bottle or scroll to continue)
      </p>
    </div>
  );
}
