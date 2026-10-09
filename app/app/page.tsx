import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPatron, getRestaurant } from "@/lib/session";
import { abonnementActif } from "@/lib/abonnement";
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
  const { supabase } = await getPatron();
  const { count: enAttente } = await supabase.from("demandes").select("id", { count: "exact", head: true }).eq("statut", "en_attente");

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Bonjour 👋</h1>
      {bienvenue && <Message type="ok">{restaurant.nom} est créé. Prochaine étape : ton équipe.</Message>}
      {!abonnementActif(restaurant.abonnement) && (
        <Link href="/app/abonnement" className="flex items-center justify-between gap-3 rounded-[18px] bg-blue-soft px-5 py-4 font-bold text-blue no-underline">
          <span>{restaurant.abonnement === "inactif" ? "Ton abonnement est arrêté : réactive-le pour publier" : "Publie tes plannings : ton 1er mois est offert"}</span>
          <span aria-hidden="true">→</span>
        </Link>
      )}
      {(enAttente ?? 0) > 0 && (
        <Link href="/app/demandes" className="flex items-center justify-between gap-3 rounded-[18px] bg-bad-bg px-5 py-4 font-bold text-bad no-underline">
          <span>{enAttente} {enAttente === 1 ? "absence à traiter" : "absences à traiter"}</span>
          <span aria-hidden="true">→</span>
        </Link>
      )}
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
