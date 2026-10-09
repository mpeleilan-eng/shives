import { redirect } from "next/navigation";
import { lundiProchain } from "@/lib/dates";

// /app/planning → la semaine à préparer (la semaine prochaine)
export default function PagePlanning() {
  redirect(`/app/planning/${lundiProchain()}`);
}
