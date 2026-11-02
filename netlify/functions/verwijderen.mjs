// Alleen admin: een inschrijving definitief verwijderen (bv. op vraag van de klant).
import { store, json, fout, leesJson, wieIsHet } from "../lib/kern.mjs";

export default async (req) => {
  if (req.method !== "POST") return fout("Gebruik POST.", 405);
  const wie = wieIsHet(req);
  if (!wie) return fout("Je bent niet (meer) aangemeld.", 401);
  if (wie.rol !== "admin") return fout("Alleen de beheerder kan inschrijvingen verwijderen.", 403);
  const body = (await leesJson(req)) || {};
  if (!body.id) return fout("Welke inschrijving?");
  await store().delete(String(body.id));
  return json({ ok: true });
};

export const config = { path: "/api/verwijderen" };
