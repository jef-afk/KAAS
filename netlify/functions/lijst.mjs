// De lijst die je te zien krijgt, afhankelijk van je rol.
import { alleRecords, json, fout, wieIsHet, zichtbaarVoor, zichtVoor, planningVoor } from "../lib/kern.mjs";

export default async (req) => {
  const wie = wieIsHet(req);
  if (!wie) return fout("Je bent niet (meer) aangemeld.", 401);
  const records = await alleRecords();
  records.sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));
  const items = records.filter((r) => zichtbaarVoor(wie.rol, r)).map((r) => zichtVoor(wie.rol, r));
  return json({ gebruiker: { naam: wie.naam, rol: wie.rol }, items, planning: planningVoor(wie.rol, records) });
};

export const config = { path: "/api/lijst" };
