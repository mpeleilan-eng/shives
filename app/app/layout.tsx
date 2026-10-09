import { Logo } from "@/components/Logo";
import { NavApp } from "@/components/NavApp";
import { getPatron, getRestaurant } from "@/lib/session";
import { deconnexion } from "@/app/connexion/actions";

// Cadre de l'espace patron : en-tête + contenu centré, pensé téléphone d'abord.
export default async function LayoutApp({ children }: LayoutProps<"/app">) {
  const { user } = await getPatron();
  const restaurant = await getRestaurant();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-baseline gap-3">
            <Logo href="/app" className="text-2xl!" />
            {restaurant && <span className="truncate text-sm font-semibold text-muted">{restaurant.nom}</span>}
          </div>
          <form action={deconnexion}>
            <button type="submit" className="cursor-pointer text-sm font-semibold text-muted hover:text-ink" title={user.email}>
              Déconnexion
            </button>
          </form>
        </div>
        {restaurant && <NavApp />}
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-16">{children}</main>
    </div>
  );
}
