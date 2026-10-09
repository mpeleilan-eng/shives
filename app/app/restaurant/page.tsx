import type { Metadata } from "next";
import { getPatron, getRestaurant } from "@/lib/session";
import type { Besoin, Services } from "@/lib/types";
import { FormRestaurant } from "./FormRestaurant";

export const metadata: Metadata = { title: "Mon restaurant · Shives" };

const SERVICES_PAR_DEFAUT: Services = { midi: { start: "11:00", end: "15:00" }, soir: { start: "18:30", end: "23:00" } };

export default async function PageRestaurant() {
  const { supabase } = await getPatron();
  const restaurant = await getRestaurant();

  // Par défaut : ouvert du mardi au dimanche, midi et soir
  let ouverture = Array.from({ length: 7 }, (_, j) => ({ midi: j !== 0, soir: j !== 0 }));
  if (restaurant) {
    const { data } = await supabase.from("besoins").select("jour, service, ouvert").eq("restaurant_id", restaurant.id);
    if (data?.length) {
      ouverture = Array.from({ length: 7 }, () => ({ midi: false, soir: false }));
      for (const b of data as Pick<Besoin, "jour" | "service" | "ouvert">[]) ouverture[b.jour][b.service] = b.ouvert;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{restaurant ? "Mon restaurant" : "Crée ton restaurant"}</h1>
        {!restaurant && <p className="m-0 text-muted">Trois infos et c&apos;est parti. Tu pourras tout changer plus tard.</p>}
      </div>
      <FormRestaurant
        creation={!restaurant}
        nom={restaurant?.nom ?? ""}
        services={restaurant?.services ?? SERVICES_PAR_DEFAUT}
        ouverture={ouverture}
      />
    </div>
  );
}
