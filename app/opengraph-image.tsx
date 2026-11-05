import { ImageResponse } from "next/og";

export const alt = "Shives · Le planning de ton resto, fait en un clic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const JOURS = ["Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
// M = midi, S = soir, MS = les deux, "" = repos
const EQUIPE: [string, string[]][] = [
  ["Léa", ["MS", "", "S", "MS", "MS", "M"]],
  ["Karim", ["M", "MS", "", "MS", "MS", "M"]],
  ["Sofia", ["", "MS", "MS", "MS", "S", "M"]],
  ["Tom", ["MS", "", "", "MS", "MS", "M"]],
];

/** Image d'aperçu partagée (LinkedIn, WhatsApp, Facebook…). */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#F5F6F9",
          fontFamily: "sans-serif",
          padding: "60px 64px",
          gap: 48,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 560 }}>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 800, color: "#0E131A" }}>
            Shives<span style={{ color: "#F2A93B" }}>.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1F4FC9", letterSpacing: 1 }}>
              PLANNING POUR RESTAURANTS INDÉPENDANTS
            </div>
            <div style={{ fontSize: 62, fontWeight: 800, color: "#0E131A", lineHeight: 1.08, marginTop: 18 }}>
              Le planning de ton resto, fait en un clic.
            </div>
            <div style={{ fontSize: 27, color: "#4B5563", marginTop: 22 }}>
              Contrats et repos respectés. L&apos;équipe le reçoit sur son téléphone.
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#6B7280" }}>Premier mois offert · Sans engagement</div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "white",
            borderRadius: 24,
            padding: "28px 26px",
            boxShadow: "0 20px 50px rgba(14,19,26,0.10)",
            alignSelf: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#0E131A" }}>Semaine du 12 octobre</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#15803D", background: "#DCFCE7", padding: "4px 12px", borderRadius: 999 }}>
              Effectifs complets
            </div>
          </div>
          <div style={{ display: "flex", marginLeft: 86, marginBottom: 8 }}>
            {JOURS.map((j) => (
              <div key={j} style={{ width: 70, fontSize: 17, color: "#6B7280", display: "flex", justifyContent: "center" }}>
                {j}
              </div>
            ))}
          </div>
          {EQUIPE.map(([nom, jours]) => (
            <div key={nom} style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <div style={{ width: 86, fontSize: 19, fontWeight: 600, color: "#0E131A" }}>{nom}</div>
              {jours.map((c, i) => (
                <div key={i} style={{ width: 70, display: "flex", flexDirection: "column", gap: 4, padding: "0 4px" }}>
                  <div style={{ height: 18, borderRadius: 6, background: c.includes("M") ? "#1F4FC9" : "#EEF1F6" }} />
                  <div style={{ height: 18, borderRadius: 6, background: c.includes("S") ? "#F2A93B" : "#EEF1F6" }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
