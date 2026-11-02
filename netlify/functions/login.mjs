// Partnerlogin: Philippo (levering), Jan Hassewer (ophaling) of admin.
import { GEBRUIKERS, json, fout, leesJson, wachtwoordKlopt, maakToken, configOk } from "../lib/kern.mjs";

export default async (req) => {
  if (req.method !== "POST") return fout("Gebruik POST.", 405);
  if (!configOk()) return fout("De login is nog niet ingesteld. Zet KAAS_SECRET en de wachtwoorden in Netlify (zie README).", 503);
  const body = (await leesJson(req)) || {};
  const gebruiker = String(body.gebruiker || "").trim().toLowerCase();
  if (!wachtwoordKlopt(gebruiker, body.wachtwoord)) {
    await new Promise((r) => setTimeout(r, 700)); // vertraagt het raden van wachtwoorden
    return fout("Gebruikersnaam of wachtwoord klopt niet.", 401);
  }
  const token = maakToken(gebruiker);
  if (!token) return fout("De login is nog niet ingesteld.", 503);
  const { naam, rol } = GEBRUIKERS[gebruiker];
  return json({ token, naam, rol, gebruiker });
};

export const config = { path: "/api/login" };
