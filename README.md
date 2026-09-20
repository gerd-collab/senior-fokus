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

Deploy: Vercel, Framework-Preset "Vite" funktioniert direkt.
