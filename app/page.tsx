import type { ReactNode } from "react";
import "./vitrine.css";
import { DemoForm } from "@/components/vitrine/DemoForm";

// Exemple de planning (calculé par le moteur Shives sur une équipe de 6 personnes)
const EXEMPLE = [
  { n: "Léa", p: "cuisine", h: "34h", d: ["ms", "", "ms", "s", "ms", "m"] },
  { n: "Karim", p: "cuisine", h: "33h30", d: ["m", "ms", "", "ms", "ms", "m"] },
  { n: "Sofia", p: "salle", h: "34h", d: ["", "ms", "ms", "ms", "s", "m"] },
  { n: "Tom", p: "salle", h: "21h", d: ["ms", "", "", "", "ms", "m"] },
  { n: "Inès", p: "salle", h: "17h", d: ["", "", "", "s", "ms", "m"] },
  { n: "Hugo", p: "plonge", h: "17h", d: ["", "", "", "s", "ms", "m"] },
];
const JOURS_EXEMPLE = ["Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const ICONES: Record<string, ReactNode> = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  swap: <path d="M7 7h12l-3-3M17 17H5l3 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M11 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3 19c.8-3.2 3.2-5 6-5s5.2 1.8 6 5M16 5.5a3 3 0 0 1 0 5.6M18 14c1.6.6 2.6 2.4 3 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  table: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3 10h18M9 4v16" stroke="currentColor" strokeWidth="2" />
    </>
  ),
};

const FONCTIONS = [
  ["check", "Contrats respectés", "Chacun fait ses heures : 35 h, 24 h ou 20 h. Shives te prévient s'il manque des heures à quelqu'un."],
  ["moon", "Repos garantis", "Deux jours de repos par semaine et 11 h minimum entre la fermeture et la reprise."],
  ["users", "Effectifs au bon niveau", "Tu fixes le nombre de personnes en cuisine, en salle et à la plonge pour chaque service."],
  ["swap", "Absences sans prise de tête", "Un empêchement ? Shives propose les remplaçants disponibles, tu valides en un clic."],
  ["phone", "Sur le téléphone de l'équipe", "Un lien personnel par employé. Pas d'appli, pas de compte, pas de groupe WhatsApp."],
  ["table", "Bientôt : export pour la paie", "Tu pourras copier les heures de la semaine dans Excel ou les envoyer à ton comptable."],
];

const FAQ = [
  ["Mes employés doivent-ils installer une appli ?", "Non. Chaque employé reçoit un lien personnel qui s'ouvre sur son téléphone, sans compte ni téléchargement."],
  ["Shives respecte-t-il le code du travail ?", "Shives applique les règles que tu règles : jours de repos par semaine, heures maximum par jour, repos minimum entre deux journées. Les valeurs par défaut suivent les usages de la restauration. Vérifie-les avec ta convention collective."],
  ["Je peux modifier le planning après la génération ?", "Oui. Tu cliques sur une case pour ajouter ou retirer un créneau, et les alertes se recalculent tout de suite."],
  ["Que se passe-t-il quand quelqu'un est absent ?", "L'employé le signale depuis son lien. Tu reçois la demande avec la liste des remplaçants disponibles, classés selon les heures qui leur restent au contrat."],
  ["Combien de temps pour démarrer ?", "Une dizaine de minutes : tu entres ton équipe et tes besoins par service, puis tu génères ta première semaine."],
];

function Logo({ size }: { size?: number }) {
  return (
    <a href="#top" aria-label="Shives, accueil" className="font-display font-extrabold tracking-[-0.03em] no-underline" style={{ fontSize: size ?? 28 }}>
      Shives<span className="text-sun">.</span>
    </a>
  );
}

export default function Home() {
  return (
    <div className="vitrine">
      <header className="nav">
        <div className="container">
          <Logo />
          <nav className="links" aria-label="Navigation">
            <a className="hide-m" href="#comment">Comment ça marche</a>
            <a className="hide-m" href="#tarifs">Tarifs</a>
            <a className="hide-m" href="#faq">FAQ</a>
            <a className="btn primary small" href="#demo">Demander une démo</a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="container">
            <div className="copy">
              <span className="eyebrow">Planning pour restaurants indépendants</span>
              <h1>
                Le planning de ton resto, <em>fait en un clic.</em>
              </h1>
              <p className="lead">
                Shives crée le planning de la semaine en respectant les contrats de chacun, les repos et tes besoins du midi et du soir. Ton équipe le reçoit sur son téléphone.
              </p>
              <div className="ctas">
                <a className="btn primary" href="#demo">Demander une démo</a>
                <a className="btn ghost" href="#comment">Voir comment ça marche</a>
              </div>
              <div className="proof">
                <span>Prêt en 10 minutes</span>
                <span>Sans appli pour l&apos;équipe</span>
                <span>Sans engagement</span>
              </div>
            </div>
            <div className="mock" aria-label="Exemple de planning généré par Shives">
              <div className="mock-top">
                <b>Semaine du 12 octobre</b>
                <span className="pill ok">Effectifs complets</span>
              </div>
              <div className="mock-scroll">
                <table className="mini">
                  <thead>
                    <tr>
                      <th className="n"></th>
                      {JOURS_EXEMPLE.map((j) => <th key={j}>{j}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {EXEMPLE.map((e) => (
                      <tr key={e.n}>
                        <th className="n">{e.n}</th>
                        {e.d.map((s, i) => (
                          <td key={i}>
                            <div className="c">
                              {s ? s.split("").map((x) => <span key={x} className={`b ${e.p}`}>{x === "m" ? "Midi" : "Soir"}</span>) : <span className="o" />}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mock-foot">
                {EXEMPLE.map((e) => (
                  <span key={e.n} className="hrs"><b>{e.h}</b> {e.n}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="pain">
          <div className="container">
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <span className="eyebrow">Dimanche, 23 h</span>
              <h2>Le planning n&apos;est toujours pas fait.</h2>
              <p>
                Les échanges de dernière minute sur WhatsApp, les heures à recompter à la main, le samedi soir où il manque quelqu&apos;un… Chaque semaine, le patron y passe des heures, souvent après le service.
              </p>
            </div>
            <div className="bubbles" aria-hidden="true">
              <div className="bubble"><i style={{ background: "#B5651D" }}>K</i><div><b>Karim</b><span>Je peux pas samedi soir…</span></div><small>23:04</small></div>
              <div className="bubble"><i style={{ background: "#2A64A6" }}>S</i><div><b>Sofia</b><span>On échange mardi ?</span></div><small>23:05</small></div>
              <div className="bubble"><i style={{ background: "#3F7363" }}>T</i><div><b>Tom</b><span>J&apos;ai combien d&apos;heures cette semaine ?</span></div><small>23:05</small></div>
            </div>
          </div>
        </section>

        <section className="how" id="comment">
          <div className="container">
            <video src="/pub-shives.mp4" poster="/poster.jpg" controls playsInline muted preload="metadata" aria-label="Vidéo de présentation de Shives" />
            <div>
              <span className="eyebrow">Comment ça marche</span>
              <h2 style={{ marginTop: 10 }}>Trois étapes, une seule fois par semaine.</h2>
              <div className="steps">
                <div className="step"><div className="num">1</div><div><h3>Tu entres ton équipe</h3><p>Le nom, le poste (cuisine, salle, plonge) et les heures au contrat de chacun : 35 h, 24 h, 20 h. Une seule fois.</p></div></div>
                <div className="step"><div className="num">2</div><div><h3>Shives génère la semaine</h3><p>Le planning respecte les contrats, les jours de repos, les indisponibilités et le nombre de personnes qu&apos;il te faut à chaque service.</p></div></div>
                <div className="step"><div className="num">3</div><div><h3>Ton équipe le reçoit</h3><p>Chaque employé ouvre son planning avec un simple lien. En cas d&apos;empêchement, il le signale et tu choisis un remplaçant en un clic.</p></div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="container">
            <span className="eyebrow">Ce que Shives fait pour toi</span>
            <h2 style={{ marginTop: 10 }}>Moins de calculs, plus de service.</h2>
            <div className="feat-grid">
              {FONCTIONS.map(([icone, titre, texte]) => (
                <div key={titre} className="feat">
                  <span className="ic"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONES[icone]}</svg></span>
                  <h3>{titre}</h3>
                  <p>{texte}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 44 }}>
              <h3 style={{ fontSize: 24 }}>Fait pour les petites équipes</h3>
              <div className="who">
                {["Crêperies", "Bistrots", "Pizzerias", "Brasseries", "Food trucks", "Cafés", "De 1 à 15 salariés"].map((t) => <span key={t}>{t}</span>)}
              </div>
            </div>
          </div>
        </section>

        <section id="tarifs">
          <div className="container">
            <span className="eyebrow">Tarifs</span>
            <h2 style={{ marginTop: 10 }}>Un prix fixe, sans surprise.</h2>
            <div className="plans">
              <div className="plan">
                <div className="top"><h3>Solo</h3></div>
                <div className="price">19 €<small> / mois HT</small></div>
                <ul><li>Jusqu&apos;à 8 salariés</li><li>Planning généré en un clic</li><li>Lien personnel pour chaque employé</li><li>Absences et remplacements</li></ul>
                <a className="btn ghost" href="#demo">Demander une démo</a>
              </div>
              <div className="plan best">
                <div className="top"><h3>Équipe</h3><span className="tag">Le plus choisi</span></div>
                <div className="price">39 €<small> / mois HT</small></div>
                <ul><li>Jusqu&apos;à 20 salariés</li><li>Tout ce qu&apos;il y a dans Solo</li><li>Bientôt : export des heures pour la paie</li><li>Plusieurs plannings types</li></ul>
                <a className="btn primary" href="#demo">Demander une démo</a>
              </div>
            </div>
            <p className="note">Premier mois offert. Sans engagement, résiliable à tout moment.</p>
          </div>
        </section>

        <section id="faq" style={{ paddingTop: 0 }}>
          <div className="container">
            <span className="eyebrow">Questions fréquentes</span>
            <h2 style={{ marginTop: 10 }}>Tu te demandes peut-être…</h2>
            <div className="faq">
              {FAQ.map(([q, r]) => (
                <details key={q}><summary>{q}</summary><p>{r}</p></details>
              ))}
            </div>
          </div>
        </section>

        <section className="cta" id="demo">
          <div className="container">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <span className="eyebrow">Démo gratuite</span>
              <h2>On te montre Shives avec ton équipe.</h2>
              <p>Laisse tes coordonnées : on prépare ton premier planning avec tes vrais horaires, et on te le présente en 15 minutes.</p>
            </div>
            <DemoForm />
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <Logo size={22} />
          <span>Le planning des petits restos.</span>
        </div>
      </footer>
    </div>
  );
}
