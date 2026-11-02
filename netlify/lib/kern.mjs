// Gedeelde logica voor de KAAS-functies: opslag, login-tokens en wat elke rol mag zien en doen.
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

/* ---------- gebruikers en rollen ----------
   Wachtwoorden staan NIET in de code. Zet ze in Netlify bij
   Site configuration → Environment variables (zie README). */
export const GEBRUIKERS = {
  philippo: { naam: "Philippo", rol: "levering", env: "KAAS_WW_PHILIPPO" },
  jan: { naam: "Jan Hassewer", rol: "ophaling", env: "KAAS_WW_JAN" },
  admin: { naam: "Beheerder", rol: "admin", env: "KAAS_WW_ADMIN" },
};

export const STATUSSEN = ["interesse", "bevestigd", "geleverd", "opgehaald", "geannuleerd"];
export const KLANTVELDEN = ["gemeente", "andere_gemeente", "voornaam", "achternaam", "straat", "huisnummer", "email", "telefoon", "hoogte", "levering", "versierpakket", "opmerking"];
export const WERKVELDEN = ["leverdatum", "notitie_levering", "ophaaldatum", "notitie_ophaling", "notitie_admin"];

const LENGTE = { opmerking: 1000, notitie_levering: 1000, notitie_ophaling: 1000, notitie_admin: 2000 };

export function env(k) {
  try { const v = globalThis.Netlify?.env?.get(k); if (v) return v; } catch {}
  return process.env[k];
}

/* ---------- opslag (Netlify Blobs) ---------- */
let maakStore = () => getStore({ name: "kaas-inschrijvingen", consistency: "strong" });
export function zetStore(fn) { maakStore = fn; } // alleen voor tests
export const store = () => maakStore();

export async function alleRecords() {
  const s = store();
  const { blobs } = await s.list();
  const items = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })));
  return items.filter(Boolean);
}

/* ---------- antwoorden ---------- */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
export const fout = (bericht, status = 400) => json({ fout: bericht }, status);

export async function leesJson(req) {
  try { return await req.json(); } catch { return null; }
}

export function schoon(k, v) {
  if (v === undefined || v === null) return "";
  return String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, LENGTE[k] || 200);
}

/* ---------- login-tokens ----------
   Een token is "payload.handtekening", ondertekend met KAAS_SECRET en het
   huidige wachtwoord van de gebruiker. Wachtwoord veranderen = alle oude
   tokens van die gebruiker ongeldig. */
const GELDIG_MS = 12 * 60 * 60 * 1000;
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();

function handtekening(payload, gebruiker) {
  const secret = env("KAAS_SECRET");
  const ww = env(GEBRUIKERS[gebruiker]?.env || "");
  if (!secret || secret.length < 16 || !ww) return null;
  return crypto.createHmac("sha256", secret).update(payload + "|" + sha(ww).toString("hex")).digest("base64url");
}

export function wachtwoordKlopt(gebruiker, wachtwoord) {
  const g = GEBRUIKERS[gebruiker];
  const echt = g && env(g.env);
  if (!echt || typeof wachtwoord !== "string") return false;
  return crypto.timingSafeEqual(sha(echt), sha(wachtwoord));
}

export function maakToken(gebruiker) {
  const payload = Buffer.from(JSON.stringify({ g: gebruiker, exp: Date.now() + GELDIG_MS })).toString("base64url");
  const sig = handtekening(payload, gebruiker);
  return sig ? payload + "." + sig : null;
}

export function wieIsHet(req) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return null; }
  if (!data || !GEBRUIKERS[data.g] || !(data.exp > Date.now())) return null;
  const verwacht = handtekening(payload, data.g);
  if (!verwacht) return null;
  const a = Buffer.from(sig), b = Buffer.from(verwacht);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return { gebruiker: data.g, ...GEBRUIKERS[data.g] };
}

export function configOk() {
  const s = env("KAAS_SECRET");
  return !!(s && s.length >= 16);
}

/* ---------- wat elke rol ziet ---------- */
export function gemeenteVan(r) {
  return r.gemeente === "Andere" ? (r.andere_gemeente || "Andere") : r.gemeente;
}

export function zichtbaarVoor(rol, r) {
  if (rol === "admin") return true;
  if (rol === "levering") return r.status === "bevestigd" || r.status === "geleverd";
  if (rol === "ophaling") return r.status === "geleverd" || r.status === "opgehaald";
  return false;
}

export function zichtVoor(rol, r) {
  if (rol === "admin") return r;
  const basis = {
    id: r.id, status: r.status, gemeente: gemeenteVan(r),
    naam: `${r.voornaam || ""} ${r.achternaam || ""}`.trim(),
    straat: r.straat, huisnummer: r.huisnummer, telefoon: r.telefoon,
    hoogte: r.hoogte, versierpakket: r.versierpakket || "Geen", opmerking: r.opmerking,
    leverdatum: r.leverdatum || "", notitie_levering: r.notitie_levering || "",
  };
  if (rol === "levering") return { ...basis, levering: r.levering };
  if (rol === "ophaling") return { ...basis, ophaaldatum: r.ophaaldatum || "", notitie_ophaling: r.notitie_ophaling || "" };
  return null;
}

/* Wat leverancier en ophaler zien als planning: enkel aantallen, geen namen. */
export function planningVoor(rol, records) {
  const tel = (lijst, sleutel) => lijst.reduce((m, r) => { const k = sleutel(r) || "–"; m[k] = (m[k] || 0) + 1; return m; }, {});
  if (rol === "levering") {
    const open = records.filter((r) => r.status === "interesse" || r.status === "bevestigd");
    return {
      titel: "Bomen nodig (interesse + bevestigd)",
      totaal: open.length,
      perHoogte: tel(open, (r) => r.hoogte),
      perGemeente: tel(open, gemeenteVan),
      perWeekend: tel(open, (r) => r.levering),
      perPakket: tel(open.filter((r) => r.versierpakket && r.versierpakket !== "Geen"), (r) => r.versierpakket),
    };
  }
  if (rol === "ophaling") {
    const staan = records.filter((r) => r.status === "geleverd");
    return {
      titel: "Bomen die nu bij klanten staan",
      totaal: staan.length,
      perHoogte: tel(staan, (r) => r.hoogte),
      perGemeente: tel(staan, gemeenteVan),
    };
  }
  return null;
}

/* ---------- wat elke rol mag wijzigen ---------- */
export function magWijzigen(rol, record, wijzigingen) {
  const sleutels = Object.keys(wijzigingen || {});
  if (!sleutels.length) return "Er is niets om te wijzigen.";
  if (rol === "admin") {
    const ok = new Set([...KLANTVELDEN, ...WERKVELDEN, "status"]);
    const fouteSleutel = sleutels.find((k) => !ok.has(k));
    if (fouteSleutel) return `Het veld "${fouteSleutel}" bestaat niet.`;
    if ("status" in wijzigingen && !STATUSSEN.includes(wijzigingen.status)) return "Onbekende status.";
    return null;
  }
  if (rol === "levering") {
    if (!(record.status === "bevestigd" || record.status === "geleverd")) return "Deze boom staat niet op jouw leverlijst.";
    const ok = new Set(["status", "leverdatum", "notitie_levering"]);
    if (sleutels.some((k) => !ok.has(k))) return "Je kan enkel de levering bijwerken.";
    if ("status" in wijzigingen && !["bevestigd", "geleverd"].includes(wijzigingen.status)) return "Je kan een boom enkel als geleverd markeren of dat ongedaan maken.";
    return null;
  }
  if (rol === "ophaling") {
    if (!(record.status === "geleverd" || record.status === "opgehaald")) return "Deze boom staat niet op jouw ophaallijst.";
    const ok = new Set(["status", "ophaaldatum", "notitie_ophaling"]);
    if (sleutels.some((k) => !ok.has(k))) return "Je kan enkel de ophaling bijwerken.";
    if ("status" in wijzigingen && !["geleverd", "opgehaald"].includes(wijzigingen.status)) return "Je kan een boom enkel als opgehaald markeren of dat ongedaan maken.";
    return null;
  }
  return "Geen toegang.";
}

export const vandaag = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });

export function pasToe(record, wijzigingen, door) {
  const nieuw = { ...record };
  const veranderd = [];
  for (const [k, v] of Object.entries(wijzigingen)) {
    const w = k === "status" ? v : schoon(k, v);
    if (nieuw[k] !== w) { nieuw[k] = w; veranderd.push(k === "status" ? `status → ${w}` : k); }
  }
  if (wijzigingen.status === "geleverd" && !nieuw.leverdatum) nieuw.leverdatum = vandaag();
  if (wijzigingen.status === "opgehaald" && !nieuw.ophaaldatum) nieuw.ophaaldatum = vandaag();
  if (veranderd.length) {
    nieuw.geschiedenis = [...(record.geschiedenis || []), { t: new Date().toISOString(), door, actie: veranderd.join(", ") }].slice(-50);
    nieuw.bijgewerkt = new Date().toISOString();
  }
  return nieuw;
}
