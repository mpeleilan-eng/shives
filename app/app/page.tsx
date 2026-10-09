import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getRestaurant } from "@/lib/session";
import { Message } from "@/components/ui";

export const metadata: Metadata = { title: "Accueil · Shives" };

const RACCOURCIS = [
  { href: "/app/restaurant", titre: "Mon restaurant", texte: "Nom, horaires, jours d'ouverture", pret: true },
  { href: "/app/equipe", titre: "Équipe", texte: "Ajoute tes employés et leurs contrats", pret: true },
  { href: "/app/besoins", titre: "Besoins et règles", texte: "Combien de personnes à chaque service", pret: true },
  { href: "/app/planning", titre: "Générer la semaine", texte: "Le planning en un clic", pret: true },
];

export default async function Accueil({ searchParams }: PageProps<"/app">) {
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");
  const { bienvenue } = await searchParams;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Bonjour 👋</h1>
      {bienvenue && <Message type="ok">{restaurant.nom} est créé. Prochaine étape : ton équipe.</Message>}
      <div className="grid gap-3 sm:grid-cols-2">
        {RACCOURCIS.map((r) =>
          r.pret ? (
            <Link key={r.href} href={r.href} className="flex flex-col gap-1 rounded-[18px] border border-line bg-surface p-5 no-underline hover:border-blue">
              <span className="font-display text-xl font-bold">{r.titre}</span>
              <span className="text-sm text-muted">{r.texte}</span>
            </Link>
          ) : (
            <div key={r.href} className="flex flex-col gap-1 rounded-[18px] border border-dashed border-line p-5 opacity-60">
              <span className="font-display text-xl font-bold">{r.titre}</span>
              <span className="text-sm text-muted">Bientôt disponible</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
