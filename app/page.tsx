import { Logo } from "@/components/Logo";

// Page provisoire (étape 1). Elle sera remplacée par le site vitrine à l'étape 2.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-5 py-16">
      <Logo />
      <h1 className="text-5xl font-extrabold">
        Le planning de ton resto, <em className="not-italic text-blue">fait en un clic.</em>
      </h1>
      <p className="text-lg text-muted">Mise en place terminée. Le site arrive à l’étape 2.</p>
      <div className="flex flex-wrap gap-2 text-sm font-semibold">
        <span className="rounded-full bg-cuisine-bg px-3 py-1 text-cuisine">Cuisine</span>
        <span className="rounded-full bg-salle-bg px-3 py-1 text-salle">Salle</span>
        <span className="rounded-full bg-plonge-bg px-3 py-1 text-plonge">Plonge</span>
      </div>
    </main>
  );
}
