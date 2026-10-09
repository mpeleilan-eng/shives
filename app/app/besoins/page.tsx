import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPatron, getRestaurant } from "@/lib/session";
import { reglesCompletes, type GrilleBesoins } from "@/lib/besoins";
import { SERVICES, type Besoin, type ServiceKey } from "@/lib/types";
import { EditeurBesoins } from "./EditeurBesoins";

export const metadata: Metadata = { title: "Besoins et règles · Shives" };

const enMinutes = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

export default async function PageBesoins() {
  const { supabase } = await getPatron();
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");

  const [{ data: besoins }, { data: employes }] = await Promise.all([
    supabase.from("besoins").select("*").eq("restaurant_id", restaurant.id),
    supabase.from("employes").select("contrat_heures").eq("restaurant_id", restaurant.id).eq("actif", true),
  ]);

  const grille: GrilleBesoins = Array.from({ length: 7 }, () => ({
    midi: { cuisine: 0, salle: 0, plonge: 0 },
    soir: { cuisine: 0, salle: 0, plonge: 0 },
  }));
  const ouverture = Array.from({ length: 7 }, () => ({ midi: true, soir: true }));
  for (const b of (besoins ?? []) as Besoin[]) {
    grille[b.jour][b.service] = { cuisine: b.cuisine, salle: b.salle, plonge: b.plonge };
    ouverture[b.jour][b.service] = b.ouvert;
  }

  const duree = Object.fromEntries(
    SERVICES.map((s) => [s, enMinutes(restaurant.services[s].end) - enMinutes(restaurant.services[s].start)]),
  ) as Record<ServiceKey, number>;
  const heuresContrats = (employes ?? []).reduce((t, e) => t + Number(e.contrat_heures), 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Besoins et règles</h1>
        <p className="m-0 text-muted">Combien de personnes il te faut à chaque service, et les règles à respecter.</p>
      </div>
      <EditeurBesoins
        grilleInitiale={grille}
        ouverture={ouverture}
        services={restaurant.services}
        duree={duree}
        reglesInitiales={reglesCompletes(restaurant.regles)}
        heuresContrats={heuresContrats}
      />
    </div>
  );
}
