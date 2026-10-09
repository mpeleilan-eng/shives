import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/types";

/** Patron connecté, sinon renvoi vers /connexion. Mis en cache le temps d'une requête. */
export const getPatron = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/connexion");
  return { supabase, user: data.user };
});

/** Le restaurant du patron connecté (V1 : un seul restaurant par compte), ou null. */
export const getRestaurant = cache(async (): Promise<Restaurant | null> => {
  const { supabase } = await getPatron();
  const { data } = await supabase
    .from("restaurants")
    .select("*")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return data as Restaurant | null;
});
