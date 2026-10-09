import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { Carte } from "@/components/ui";
import { FormConnexion } from "./FormConnexion";

export const metadata: Metadata = { title: "Connexion · Shives" };

export default async function PageConnexion({ searchParams }: PageProps<"/connexion">) {
  const { erreur } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <Logo />
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold">Connexion</h1>
        <p className="m-0 text-muted">Nouveau sur Shives ? Même chemin : ton compte est créé automatiquement.</p>
      </div>
      <Carte>
        <FormConnexion erreurLien={erreur === "lien"} />
      </Carte>
    </main>
  );
}
