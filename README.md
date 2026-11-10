# Hammerslag – Retssalen (prototype)

Et retsdrama for 4 personer på hver sin telefon: **Dommer, Anklager, Forsvarer og Vidne**.
Dommeren styrer hele forløbet. De andre ser kun det, de skal bruge lige nu: om det er deres tur, billeder, stikord og en sætningsstarter. Selve samtalen foregår højt i rummet.

## Sådan kører I det

1. Installér **Node.js** (gratis) fra https://nodejs.org (vælg LTS).
2. Pak mappen ud.
3. Start serveren på en computer:
   - Windows: dobbeltklik `start-windows.bat` (tryk **Tillad**, hvis Windows Firewall spørger)
   - Mac: højreklik `start-mac.command` → Åbn
   - eller skriv `node server.js` i mappen
4. Vinduet viser en adresse, fx `http://192.168.1.23:3000`. Åbn den på **dommerens telefon**.
5. Dommeren trykker **Opret retssag**, vælger en sag og viser QR-koden.
6. De andre scanner koden, skriver deres navn og vælger en **ledig** rolle. Alle kan se, hvem der har hvilken rolle.
7. Når alle 4 roller er taget, trykker dommeren **Sæt retten**.

**Alle telefoner skal være på samme Wi-Fi som computeren.** Universitetsnet (fx eduroam) blokerer ofte dette. Lav i så fald et hotspot fra en telefon, og sæt computeren og alle telefoner på det.

## Hvem ser hvad

| | Ser |
|---|---|
| **Dommer** | Alle 12 trin, tekst at læse op, »Hvem har ordet?«, ur, indsigelser, notater om beviserne, dommen og sandheden |
| **Anklager / Forsvarer** | »Din tur« eller »Lyt«, stikord til tale og spørgsmål, egne beviser (»Fremlæg« viser dem på alle telefoner) og en indsigelsesknap |
| **Vidne** | Hvad hun så, hvad hun ved om hvert emne, en pinlig hemmelighed – og sit »store øjeblik« ved den nye afsløring |

Når dommeren trykker **Næste**, skifter alle telefoner automatisk. Når dommeren giver ordet til en person, skifter den persons telefon til **Din tur**.

## Ret i sagerne
Alle historier står i `data/cases.js` som stikord. Genstart serveren efter ændringer.

## Begrænsninger (prototype)
- Kører lokalt på én computer. Spillet kan senere lægges på en gratis server, så det virker over internettet.
- Lukkes serveren, forsvinder igangværende retssager.
- Skrifttyperne hentes fra internettet. Uden internet bruges en almindelig skrifttype.
