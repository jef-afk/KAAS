// Een inschrijving bijwerken. Wat mag, hangt af van je rol (zie magWijzigen in kern.mjs).
// Admin kan zonder id ook een nieuwe klant toevoegen.
import crypto from "node:crypto";
import { store, json, fout, leesJson, wieIsHet, magWijzigen, pasToe, zichtVoor, KLANTVELDEN, schoon } from "../lib/kern.mjs";

export default async (req) => {
  if (req.method !== "POST") return fout("Gebruik POST.", 405);
  const wie = wieIsHet(req);
  if (!wie) return fout("Je bent niet (meer) aangemeld.", 401);
  const body = await leesJson(req);
  if (!body || typeof body.wijzigingen !== "object" || !body.wijzigingen) return fout("Ongeldige aanvraag.");
  const s = store();

  if (!body.id) {
    if (wie.rol !== "admin") return fout("Alleen de beheerder kan klanten toevoegen.", 403);
    const nu = new Date().toISOString();
    const id = crypto.randomUUID();
    const leeg = { id, datum: nu, status: "interesse", leverdatum: "", notitie_levering: "", ophaaldatum: "", notitie_ophaling: "", notitie_admin: "", geschiedenis: [] };
    for (const k of KLANTVELDEN) leeg[k] = "";
    const probleem = magWijzigen("admin", leeg, body.wijzigingen);
    if (probleem) return fout(probleem, 403);
    const nieuw = pasToe(leeg, body.wijzigingen, wie.naam);
    if (!schoon("voornaam", nieuw.voornaam) && !schoon("achternaam", nieuw.achternaam)) return fout("Vul minstens een naam in.");
    nieuw.geschiedenis = [{ t: nu, door: wie.naam, actie: "toegevoegd door beheer" }];
    await s.setJSON(id, nieuw);
    return json({ ok: true, item: nieuw });
  }

  const record = await s.get(String(body.id), { type: "json" });
  if (!record) return fout("Deze inschrijving bestaat niet meer.", 404);
  const probleem = magWijzigen(wie.rol, record, body.wijzigingen);
  if (probleem) return fout(probleem, 403);
  const nieuw = pasToe(record, body.wijzigingen, wie.naam);
  await s.setJSON(record.id, nieuw);
  return json({ ok: true, item: zichtVoor(wie.rol, nieuw) });
};

export const config = { path: "/api/bijwerken" };
