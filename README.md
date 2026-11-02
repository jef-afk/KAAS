# KAAS · Kerstboom-as-a-service

Publieke site met interesselijst, plus een partnerportaal op `/partner/` met drie rollen:

| Gebruikersnaam | Wie | Ziet | Kan |
|---|---|---|---|
| `philippo` | Philippo, levering en plaatsing | Bevestigde klanten (naam, adres, telefoon, hoogte, leverweekend, opmerking) en hoeveel bomen per hoogte nodig zijn | Een adres markeren als *geleverd en geplaatst*, met datum en notitie |
| `jan` | Jan Hassewer, ophaling en hakselen | Adressen waar een boom staat | Een adres markeren als *opgehaald en verhakseld*, met datum en notitie |
| `admin` | Beheerder | Alles, ook e-mailadressen en de geschiedenis van elke inschrijving | Klanten bevestigen, alles bewerken, klanten toevoegen of verwijderen, CSV kopiëren |

Philippo en Jan zien geen e-mailadressen en geen klanten die enkel interesse hebben. Dat wordt op de server gecontroleerd, niet alleen in de pagina.

## Versierpakketten

Klanten kunnen bij het inschrijven een versierpakket kiezen: Winterzilver, Naturel, Bordeaux of Zuurstok, te koop of te huur (ongeveer de helft, afgerond op ,99). Daarbij kunnen ze laten versieren (€ 40) en de versiering na de feesten laten afhalen (€ 40). Philippo ziet per adres het pakket, koop of huur, en of hij moet versieren. Jan ziet welke huurversiering hij moet terugnemen en waar hij de versiering eerst moet afhalen. De foto's staan in `public/img/`.

## Prijzen

Boom: 1,50 m € 60, 2 m € 80, 3 m € 150, 4 m € 220. Brengen en plaatsen op een houten kruis € 30. Ophalen en verhakselen € 30, optioneel (verplicht bij gehuurde versiering). Bomen zonder ophaling verschijnen niet op de lijst van Jan. De prijstabel staat op twee plaatsen: `netlify/lib/kern.mjs` (de server berekent daarmee het totaal) en onderaan `public/index.html` (voor de prijzen op de site). Pas een prijs altijd op beide plaatsen aan.

## Werkwijze

1. Iemand schrijft zich in → status **interesse**.
2. De beheerder klikt *Bevestig klant* → status **bevestigd**, de klant verschijnt bij Philippo.
3. Philippo levert → status **geleverd**, de klant verschijnt bij Jan.
4. Jan haalt op en hakselt → status **opgehaald**.

## Online zetten op Netlify

De partnerlogin heeft serverfuncties nodig. Slepen naar Netlify Drop volstaat daarom niet: gebruik GitHub of de Netlify CLI.

**Via GitHub (aanbevolen)**
1. Zet de inhoud van deze map in een GitHub-repository.
2. In Netlify: *Add new project → Import an existing project* → kies de repository. De instellingen komen uit `netlify.toml`.

**Of via de Netlify CLI**
```
npm install
npx netlify-cli deploy --prod
```

## Wachtwoorden instellen

In Netlify: *Project configuration → Environment variables*. Voeg toe:

| Variabele | Waarde |
|---|---|
| `KAAS_SECRET` | Een lange willekeurige tekst van minstens 32 tekens (nooit delen) |
| `KAAS_WW_PHILIPPO` | Wachtwoord van Philippo |
| `KAAS_WW_JAN` | Wachtwoord van Jan Hassewer |
| `KAAS_WW_ADMIN` | Wachtwoord van de beheerder |

Deploy daarna opnieuw (*Deploys → Trigger deploy*). Een aanmelding blijft 12 uur geldig. Wie je wachtwoord wijzigt, meldt die gebruiker meteen overal af.

## Gegevens

Inschrijvingen staan in Netlify Blobs (store `kaas-inschrijvingen`), alleen bereikbaar via de functies. Namen en adressen staan nergens publiek op de site.

## Foto's

De foto's komen van Unsplash en mogen gratis gebruikt worden onder de Unsplash-licentie. De namen van de fotografen staan in de footer. Wil je eigen foto's, vervang dan de `src`-adressen van de `<img>`-tags in `public/index.html`.
