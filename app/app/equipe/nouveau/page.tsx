import type { Metadata } from "next";
import Link from "next/link";
import { FormEmploye } from "../FormEmploye";

export const metadata: Metadata = { title: "Ajouter un employé · Shives" };

export default function PageNouvelEmploye() {
  return (
    <div className="flex flex-col gap-5">
      <Link href="/app/equipe" className="text-sm font-semibold text-muted no-underline hover:text-ink">← Équipe</Link>
      <h1 className="text-3xl font-extrabold sm:text-4xl">Ajouter un employé</h1>
      <FormEmploye />
    </div>
  );
}
