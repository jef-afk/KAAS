// Publiek: nieuwe inschrijving op de interesselijst.
import crypto from "node:crypto";
import { store, json, fout, leesJson, schoon, KLANTVELDEN } from "../lib/kern.mjs";

const GEMEENTEN = ["Kalmthout", "Essen", "Stabroek", "Kapellen", "Brasschaat", "Andere"];
const HOOGTES = ["1,50 m", "2 m", "3 m", "4 m", "Weet ik nog niet"];
const PAKKETTEN = ["Geen", "Winterzilver", "Naturel", "Bordeaux", "Zuurstok"];

export default async (req) => {
  if (req.method !== "POST") return fout("Gebruik POST.", 405);
  const body = await leesJson(req);
  if (!body || typeof body !== "object") return fout("Ongeldige aanvraag.");
  if (body.website) return json({ ok: true }); // honeypot: bots krijgen een vals "ok"

  const r = {};
  for (const k of KLANTVELDEN) r[k] = schoon(k, body[k]);

  if (!GEMEENTEN.includes(r.gemeente)) return fout("Kies je gemeente.");
  if (r.gemeente === "Andere" && !r.andere_gemeente) return fout("Vul je gemeente in.");
  if (r.gemeente !== "Andere") r.andere_gemeente = "";
  for (const [k, l] of [["voornaam", "je voornaam"], ["achternaam", "je achternaam"], ["straat", "je straat"], ["huisnummer", "je huisnummer"]]) {
    if (!r[k]) return fout(`Vul ${l} in.`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) return fout("Vul een geldig e-mailadres in.");
  if (!HOOGTES.includes(r.hoogte)) r.hoogte = "Weet ik nog niet";
  if (!PAKKETTEN.includes(r.versierpakket)) r.versierpakket = "Geen";
  if (body.interesse !== "ja" || body.toestemming !== "ja") return fout("Vink beide vakjes onderaan aan.");

  const nu = new Date().toISOString();
  const id = crypto.randomUUID();
  const record = {
    ...r, id, datum: nu, status: "interesse",
    leverdatum: "", notitie_levering: "", ophaaldatum: "", notitie_ophaling: "", notitie_admin: "",
    geschiedenis: [{ t: nu, door: "website", actie: "ingeschreven" }],
  };
  await store().setJSON(id, record);
  return json({ ok: true });
};

export const config = { path: "/api/inschrijven" };
