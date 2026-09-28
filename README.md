# Osobný tréningový denník (PWA)

Jednoduchá tréningová aplikácia inšpirovaná ovládaním Hevy – iba pre osobné použitie.
Jedna codebase: funguje na iPhone (pridaná na plochu), na Macu/PC v prehliadači a **offline**.
Bez účtu, backendu, reklám, analytiky a platených služieb. Všetky dáta sú lokálne v IndexedDB.

React · TypeScript · Vite · Tailwind CSS · Dexie.js (IndexedDB) · vite-plugin-pwa (service worker) · Vitest

## Spustenie na Macu

```bash
cd fitness
npm install
npm run dev        # http://localhost:5173  (vývoj)
```

Produkčná verzia (s offline režimom): `npm run build && npm run preview` → http://localhost:4173

Vo vývojovej aj produkčnej verzii nájdeš v ľavom paneli **Mobilný náhľad** – tá istá aplikácia
a tie isté dáta v ráme 390 × 844 px (iframe, takže platí skutočný mobilný layout).

Kontroly: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Pridanie na plochu iPhonu

Service worker (offline režim) a inštalácia vyžadujú **HTTPS**; samotné `http://<ip-macu>:5173`
na iPhone offline fungovať nebude. Zverejni preto priečinok `dist/` (výsledok `npm run build`)
na ľubovoľnom bezplatnom statickom hostingu s HTTPS (GitHub Pages, Cloudflare Pages, Netlify…).
Appka používa hash routing a relatívne cesty, takže funguje aj v podadresári (napr. GitHub Pages).

1. Na iPhone otvor adresu v **Safari**.
2. Ťukni na Zdieľať → **Pridať na plochu**.
3. Spusti appku z plochy; po prvom načítaní funguje bez internetu.

Dáta sú viazané na adresu (origin) – na iPhone a na Macu sú to oddelené databázy.
Medzi zariadeniami ich prenášaj cez **Nastavenia → Exportovať / Importovať**.
Safari môže dáta webov, ktoré dlho nepoužívaš, zmazať, preto rob zálohy.

## Funkcie navyše (verzia 1.1)

- **Zálohy:** pripomienka na Domove po 7 dňoch, export cez zdieľanie (Súbory/iCloud), dátum poslednej zálohy.
- **Synchronizácia cez súbor:** Nastavenia → *Zlúčiť zálohu z iného zariadenia*. Zlúči podľa ID a času úpravy,
  zmazania sa prenášajú (`tombstones`), nastavenia a rozpracovaný tréning ostávajú lokálne. Nie je to živá
  synchronizácia – súbor treba preniesť ručne (napr. cez iCloud Drive/AirDrop).
- **Tréning:** poradie cvikov ťahaním, supersety, poznámky a mazanie sérií, premenovanie tréningu,
  zvuk na konci prestávky, návrh váhy (dvojitá progresia 8–12), kalkulačka kotúčov.
- **História:** zoznam / kalendár s týždenným plánom / štatistiky (týždne, série podľa partie, zaostávajúce partie).
- **Telo:** váha, tuk a obvody s grafom.
- **Knižnica cvikov** je preložená do slovenčiny (názvy aj návody).
- **Migrácia dát:** databáza v2 a formát zálohy v2; staré dáta a zálohy v1 sa prevedú bez straty.

## Architektúra

```
src/domain/   čistá logika bez závislostí na UI a DB: model, výpočty, štatistiky, zálohy, knižnica cvikov
src/db/       Dexie schéma + repozitár (jediné miesto, ktoré zapisuje do IndexedDB)
src/ui/       React komponenty, stránky, hooky (useLiveQuery), WorkoutContext
src/data/     exercises.json – vybraných 101 cvikov z Free Exercise DB (Unlicense)
```

- **Aktívny tréning** drží `WorkoutContext` v pamäti a zapisuje ho do IndexedDB po každej zmene
  (~40 ms), pri skrytí stránky aj pri zatvorení. Po reloade sa obnoví vrátane času a prestávky.
- **Migrácie:** schéma je verzovaná (`src/db/db.ts`); nové verzie sa pridávajú ako `version(n+1)`,
  záloha má vlastnú verziu (`BACKUP_VERSION`, `migrateBackup`).
- **Import** najprv celý súbor overí (`parseBackup`); pri chybe sa existujúce dáta nezmenia.

## Pravidlá výpočtov

- objem série = váha × opakovania
- objem tréningu = súčet **dokončených pracovných a drop** sérií; **zahrievacie série sa nezapočítavajú**
  (ani do rekordov)
- odhadované 1RM (Epley) = váha × (1 + opakovania / 30)
- osobný rekord = prekonanie doterajšieho maxima cviku vo váhe, 1RM alebo objeme série; prvý výkon je iba základ
- „Najbližší tréning“ = ďalšia rutina v poradí po naposledy odcvičenej

## Licencie

Cviky a návody: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (Unlicense / public domain).
Aplikácia neobsahuje žiadne obrázky ani médiá tretích strán. Ukážkové rutiny (Push, Pull, Legs) sú
označené „Ukážka“ a dajú sa odstrániť.
