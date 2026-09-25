# Fokuspunkt

Interaktive Apps für Senioren (Vite + Vanilla TS): eine Übersichtsseite mit 36 Apps,
gegliedert nach fünf Tätigkeitsbereichen.

- Dev: `npm run dev`
- Build: `npm run build`
- Deep-Link in eine App: `/?app=<id>`
- Deep-Link in einen Bereich: `/?bereich=<denken|spielen|wahrnehmen|erinnern|entspannen>`
- Zielgruppen-Einstieg (privat / Einrichtungen): `/?ziel=<privat|einrichtung>`
- Bereiche, Apps und Details in `src/apps.ts`. Screenshots liegen in `public/app-screenshots/`.

Die Bereiche stehen in `CATEGORIES` (Reihenfolge, Titel, Zuschnitt, Suchbegriffe);
jede App in `APPS` trägt ihre `category`.


## Hintergrundmusik (globale Parent-Schicht)

Die Musik läuft ausschließlich im Parent (`src/music.ts`), nie in den
Child-iframes – beim App-Wechsel playing der Track daher nahtlos weiter.

- **Bibliothek:** 28 Meditationstracks (MP3, je 1–26 min, ~165 min
  Spielzeit) von Pixabay in `public/audio/music/pixabay/`, lautheits-
  normalisiert auf −20 LUFS. Playlist + Zufallsreihenfolge aus
  `manifest.json`, Quasi-Gapless per Crossfade von zwei Audio-Decks.
  Lizenznachweise: `public/audio/music/PIXABAY-LIZENZ.txt`.
- **UI:** Musik-Pill oben rechts (Vor/Zurück + Play + Lautstärke-Regler +
  Titel). Vor/Zurück nutzt eine Spielhistorie mit Forward-Stapel.
- **Zustand:** `localStorage` → gilt global für alle Apps
  (`fokuspunkt-music` = on/off, `fokuspunkt-music-volume` = 0..1).
- **Austauschen:** neue MP3s nach `public/audio/music/pixabay/` legen und
  `manifest.json` (Felder `file`, `seconds`, `title`, `category`)
  entsprechend aktualisieren.
- **Offline:** Service Worker (`public/sw.js`) cacht jede Audiodatei nach
  dem ersten Stream in Cache Storage; Range-Bitten werden aus dem Cache
  bedient.
- **API für Child-Apps (postMessage, any origin):**

  ```js
  // Hinweis/Sprachausgabe beginnt:
  window.parent.postMessage({ type: 'FOCUS_AUDIO', action: 'duck' }, '*');
  // …ist zu Ende:
  window.parent.postMessage({ type: 'FOCUS_AUDIO', action: 'resume' }, '*');
  ```

  `duck` fading die Musik auf max. 0,08 herunter, `resume` fades sanft
  zurück. Zusätzlich: `set-volume` (`value` 0..1), `play`, `pause`.

Deploy: Vercel, Framework-Preset "Vite" funktioniert direkt.
