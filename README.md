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

- **Bibliothek:** 120 generative Stücke (Opus, je ~2–4 min) in
  `public/audio/music/<kategorie>/`, Kategorien: `piano`, `ambient`,
  `acoustic`, `nature`, `light`. Playlist + Zufallsreihenfolge aus
  `manifest.json`, Quasi-Gapless per Crossfade von zwei Audio-Decks.
- **UI:** Musik-Pill oben rechts (Button + Lautstärke-Regler + Titel).
- **Zustand:** `localStorage` → gilt global für alle Apps
  (`fokuspunkt-music` = on/off, `fokuspunkt-music-volume` = 0..1).
- **Neu generieren:** `python3 tools/genmusic/gen.py --per 24
  --out public/audio/music --jobs 6` (rein numpy + ffmpeg, kein Modell).
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
