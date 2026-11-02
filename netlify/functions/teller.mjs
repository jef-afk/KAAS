// Publiek: hoeveel inschrijvingen er per gemeente zijn. Enkel aantallen, nooit namen of adressen.
import { alleRecords } from "../lib/kern.mjs";

const VAST = ["Kalmthout", "Essen", "Stabroek", "Kapellen", "Brasschaat"];

export default async () => {
  const records = (await alleRecords()).filter((r) => r.status !== "geannuleerd");
  const per = Object.fromEntries(VAST.map((g) => [g, 0]));
  let andere = 0;
  for (const r of records) {
    if (VAST.includes(r.gemeente)) per[r.gemeente]++;
    else andere++;
  }
  const gemeenten = VAST.map((naam) => ({ naam, aantal: per[naam] }));
  if (andere) gemeenten.push({ naam: "Andere gemeenten", aantal: andere });
  return new Response(JSON.stringify({ totaal: records.length, gemeenten }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60" },
  });
};

export const config = { path: "/api/teller" };
