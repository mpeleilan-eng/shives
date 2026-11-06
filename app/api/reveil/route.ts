import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/reveil : appelé une fois par jour par Vercel (vercel.json → crons).
 * Une petite lecture dans la base suffit pour que Supabase (offre gratuite)
 * ne mette pas le projet en pause faute d'activité. Ne renvoie aucune donnée.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Si CRON_SECRET est défini dans Vercel, seul Vercel peut déclencher le réveil
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { error } = await createAdminClient().from("restaurants").select("id", { head: true, count: "exact" }).limit(1);
  if (error) {
    console.error("reveil:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
