/*
 * Shives — moteur de génération de planning
 * ------------------------------------------
 * Conversion TypeScript de planning-engine.js, SANS changement de logique
 * (tests/planning-engine.test.ts vérifie que les deux donnent exactement le même résultat).
 *
 * Fonction pure : generatePlanning(config, seed) -> résultat
 * Même config + même seed = même planning. Change le seed pour une autre proposition.
 */

export type EnginePoste = "cuisine" | "salle" | "plonge";
export type EnginePosteEmploye = EnginePoste | "polyvalent";
export type EngineEffectifs = Partial<Record<EnginePoste, number>>;

export type EngineConfig = {
  /** ex. { midi: { start: '11:00', end: '15:00' }, soir: { start: '18:30', end: '23:00' } } */
  services: Record<string, { start: string; end: string }>;
  /** 7 jours, lundi -> dimanche ; chaque service : nombre de personnes par poste */
  days: ({ open: boolean } & Record<string, EngineEffectifs | boolean | undefined>)[];
  employees: { nom: string; poste: EnginePosteEmploye; contrat: number; indispos?: number[] }[];
  rules?: Partial<EngineRules>;
};

export type EngineRules = { maxJours: number; maxHeuresJour: number; reposMin: number; completerContrats: boolean };

export type EngineCreneau = { service: string; poste: EnginePoste; debut: string; fin: string };

export type EngineResult = {
  seed: number;
  jours: string[];
  employes: {
    nom: string;
    poste: EnginePosteEmploye;
    contrat: number;
    minutes: number;
    heures: string;
    /** planning[jour] = créneaux du jour, triés par heure de début */
    planning: EngineCreneau[][];
  }[];
  effectifs: Record<string, { present: number; besoin: number }>[];
  manques: { jour: string; service: string; poste: EnginePoste }[];
  alertes: { niveau: "manque" | "info"; texte: string }[];
};

export const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const POSTES: EnginePoste[] = ["cuisine", "salle", "plonge"];

export const toMin = (s: string) => { const [h, m] = String(s).split(":").map(Number); return h * 60 + (m || 0); };
export const fmtH = (min: number) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h + "h" + (m ? String(m).padStart(2, "0") : ""); };

// Petit générateur aléatoire reproductible (même seed = même résultat)
function rng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Emp = { i: number; nom: string; poste: EnginePosteEmploye; contrat: number; indispos: number[]; minutes: number; jours: Set<number> };
type Affectation = { service: string; poste: EnginePoste };
type Besoin = { d: number; k: string; p: EnginePoste };

export function generatePlanning(config: EngineConfig, seed = 1): EngineResult {
  const rand = rng(seed);
  const rules: EngineRules = Object.assign({ maxJours: 5, maxHeuresJour: 11, reposMin: 11, completerContrats: true }, config.rules || {});
  const services = config.services;
  const svcKeys = Object.keys(services);
  const len = (k: string) => toMin(services[k].end) - toMin(services[k].start);
  const need = (d: number, k: string, p: EnginePoste) =>
    config.days[d].open ? Number(((config.days[d][k] || {}) as EngineEffectifs)[p]) || 0 : 0;
  const needTotal = (d: number, k: string) => POSTES.reduce((t, p) => t + need(d, k, p), 0);

  const emps: Emp[] = config.employees.map((e, i) => ({
    i, nom: e.nom, poste: e.poste, contrat: Number(e.contrat) || 0,
    indispos: e.indispos || [], minutes: 0, jours: new Set<number>(),
  }));
  // affect[i][d] = liste de { service, poste }
  const affect: Affectation[][][] = emps.map(() => Array.from({ length: 7 }, () => []));

  const dayMinutes = (i: number, d: number) => affect[i][d].reduce((t, a) => t + len(a.service), 0);
  const bornes = (i: number, d: number, extra?: string) => {
    const ks = affect[i][d].map((a) => a.service).concat(extra ? [extra] : []);
    if (!ks.length) return null;
    return { s: Math.min(...ks.map((k) => toMin(services[k].start))), e: Math.max(...ks.map((k) => toMin(services[k].end))) };
  };
  const posteOk = (emp: Emp, p: EnginePoste) => emp.poste === p || emp.poste === "polyvalent";
  const staffed = (d: number, k: string, p?: EnginePoste) =>
    emps.filter((e) => affect[e.i][d].some((a) => a.service === k && (!p || a.poste === p))).length;

  function peutPrendre(emp: Emp, d: number, k: string) {
    if (!config.days[d].open) return false;
    if (emp.indispos.includes(d)) return false;
    if (affect[emp.i][d].some((a) => a.service === k)) return false;
    const st = toMin(services[k].start), en = toMin(services[k].end);
    if (affect[emp.i][d].some((a) => toMin(services[a.service].start) < en && toMin(services[a.service].end) > st)) return false;
    if (emp.minutes + len(k) > emp.contrat * 60) return false;
    if (dayMinutes(emp.i, d) + len(k) > rules.maxHeuresJour * 60) return false;
    if (!emp.jours.has(d) && emp.jours.size >= rules.maxJours) return false;
    const b = bornes(emp.i, d, k)!;
    const prev = d > 0 ? bornes(emp.i, d - 1) : null;
    if (prev && 1440 - prev.e + b.s < rules.reposMin * 60) return false;
    const next = d < 6 ? bornes(emp.i, d + 1) : null;
    if (next && 1440 - b.e + next.s < rules.reposMin * 60) return false;
    return true;
  }
  function affecter(emp: Emp, d: number, k: string, p: EnginePoste) {
    affect[emp.i][d].push({ service: k, poste: p });
    emp.minutes += len(k);
    emp.jours.add(d);
  }
  function score(emp: Emp, d: number, p: EnginePoste) {
    const reste = emp.contrat ? (emp.contrat * 60 - emp.minutes) / (emp.contrat * 60) : 0;
    return reste + (emp.poste === p ? 0.5 : 0) + (emp.jours.has(d) ? 0.15 : 0) + rand() * 0.2;
  }

  // 1) Remplir les besoins, en commençant toujours par le créneau le plus difficile à couvrir
  const besoins: Besoin[] = [];
  for (let d = 0; d < 7; d++) for (const k of svcKeys) for (const p of POSTES)
    for (let n = 0; n < need(d, k, p); n++) besoins.push({ d, k, p });
  const manques: Besoin[] = [];
  while (besoins.length) {
    let best: { b: Besoin; c: number } | null = null;
    for (const b of besoins) {
      const c = emps.filter((e) => posteOk(e, b.p) && peutPrendre(e, b.d, b.k)).length + rand() * 0.5;
      if (!best || c < best.c) best = { b, c };
    }
    const { b } = best!;
    besoins.splice(besoins.indexOf(b), 1);
    const cands = emps.filter((e) => posteOk(e, b.p) && peutPrendre(e, b.d, b.k));
    if (!cands.length) { manques.push(b); continue; }
    cands.sort((x, y) => score(y, b.d, b.p) - score(x, b.d, b.p));
    affecter(cands[0], b.d, b.k, b.p);
  }

  // 2) Compléter les contrats : ajouter des services en renfort, de préférence les plus chargés
  if (rules.completerContrats) {
    let ajoute = true;
    while (ajoute) {
      ajoute = false;
      const ordre = emps.filter((e) => e.contrat).sort((a, b) => (b.contrat * 60 - b.minutes) / b.contrat - (a.contrat * 60 - a.minutes) / a.contrat);
      for (const emp of ordre) {
        const options: { d: number; k: string; p: EnginePoste; s: number }[] = [];
        for (let d = 0; d < 7; d++) for (const k of svcKeys) {
          if (!needTotal(d, k) || !peutPrendre(emp, d, k)) continue;
          const p: EnginePoste = emp.poste === "polyvalent" ? POSTES.find((x) => need(d, k, x)) || "salle" : emp.poste;
          const surplus = staffed(d, k) - needTotal(d, k);
          options.push({ d, k, p, s: needTotal(d, k) - surplus * 1.5 + (emp.jours.has(d) ? 2 : 0) + rand() });
        }
        if (!options.length) continue;
        options.sort((a, b) => b.s - a.s);
        affecter(emp, options[0].d, options[0].k, options[0].p);
        ajoute = true;
        break;
      }
    }
  }

  // 3) Résultat lisible
  const alertes: EngineResult["alertes"] = [];
  manques.forEach((m) => alertes.push({ niveau: "manque", texte: `${JOURS[m.d]} ${m.k} : il manque 1 ${m.p}` }));
  emps.forEach((e) => {
    const ecart = e.contrat * 60 - e.minutes;
    if (ecart >= 120) alertes.push({ niveau: "info", texte: `${e.nom} : ${fmtH(e.minutes)} sur ${e.contrat}h (il manque ${fmtH(ecart)})` });
  });
  return {
    seed,
    jours: JOURS,
    employes: emps.map((e) => ({
      nom: e.nom, poste: e.poste, contrat: e.contrat, minutes: e.minutes, heures: fmtH(e.minutes),
      planning: affect[e.i].map((list) => list
        .slice().sort((a, b) => toMin(services[a.service].start) - toMin(services[b.service].start))
        .map((a) => ({ service: a.service, poste: a.poste, debut: services[a.service].start, fin: services[a.service].end }))),
    })),
    effectifs: Array.from({ length: 7 }, (_, d) => Object.fromEntries(svcKeys.map((k) => [k, { present: staffed(d, k), besoin: needTotal(d, k) }]))),
    manques: manques.map((m) => ({ jour: JOURS[m.d], service: m.k, poste: m.p })),
    alertes,
  };
}
