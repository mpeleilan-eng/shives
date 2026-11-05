import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000"),
  ),
  title: "Shives · Logiciel de planning pour restaurants indépendants",
  description:
    "Shives crée le planning de ton restaurant en un clic : contrats respectés, repos garantis, effectifs midi et soir. Ton équipe le reçoit sur son téléphone, sans appli.",
  openGraph: {
    title: "Shives · Le planning de ton resto, fait en un clic",
    description: "Contrats respectés, repos garantis, effectifs midi et soir. Ton équipe le reçoit sur son téléphone, sans appli.",
    locale: "fr_FR",
    type: "website",
    siteName: "Shives",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F6F9" },
    { media: "(prefers-color-scheme: dark)", color: "#0E131A" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${figtree.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
