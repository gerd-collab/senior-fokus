/**
 * Fokuspunkt – globale Musik-Schicht (Parent-App).
 *
 * Die Musik lebt ausschließlich hier im Parent, nicht in den Child-iframes.
 * Folge: Beim Wechsel der App läuft der Track nahtlos weiter.
 *
 * Child-Apps (andere Origin) koennen per postMessage steuern:
 *   window.parent.postMessage({ type: 'FOCUS_AUDIO', action: 'duck' }, '*');
 *   window.parent.postMessage({ type: 'FOCUS_AUDIO', action: 'resume' }, '*');
 * duck = Musik tritt hinter Sprachausgabe/Hinweise zurueck, resume = sie kommt
 * langsam zurueck. Zustand (an/aus, Lautstaerke) liegt in localStorage und
 * gilt damit fuer alle Apps gemeinsam.
 */

const LS_STATE = 'fokuspunkt-music';
const LS_VOLUME = 'fokuspunkt-music-volume';
const MANIFEST_URL = '/audio/music/manifest.json';
const DUCK_LEVEL = 0.08;
const XFADE_S = 5;
const PRELOAD_AHEAD_S = 7;

interface Track {
  file: string;
  seconds: number;
  title: string;
  category: string;
}

interface Manifest {
  tracks: Track[];
}

interface Deck extends HTMLAudioElement {
  trackIndex: number;
}

function makeDeck(): Deck {
  const el = document.createElement('audio') as Deck;
  el.preload = 'auto';
  el.trackIndex = -1;
  el.volume = 0;
  return el;
}

function shuffled(n: number, rng: () => number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class MusicEngine {
  private decks: [Deck, Deck];
  private active = 0;
  private tracks: Track[] = [];
  private order: number[] = [];
  private pos = 0;
  private lastPlayed = -1;
  playing = false;
  volume = 0.25;
  private ducked = false;
  private duckFactor = 1; // 1 = normale Lautstaerke, 0 = voll ge-duckt
  private fadeTimer: number | null = null;
  private crossfading = false;
  private cfStart = 0;
  ready = false;
  onTrack: (t: Track | null) => void = () => {};
  onPlaying: (p: boolean) => void = () => {};

  constructor() {
    this.decks = [makeDeck(), makeDeck()];
    for (const d of this.decks) {
      // Zeitsteuerung auf BEIDEN Decks: nach jedem Wechsel ist ein anderes aktiv.
      d.addEventListener('timeupdate', () => this.scheduleNext());
      d.addEventListener('error', () => {
        if (d === this.decks[this.active] && this.playing) this.next();
      });
    }
  }

  async load(): Promise<boolean> {
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
      if (!res.ok) return false;
      const data = (await res.json()) as Manifest;
      this.tracks = Array.isArray(data.tracks) ? data.tracks : [];
      this.ready = this.tracks.length > 0;
      return this.ready;
    } catch {
      return false;
    }
  }

  private pickNext(): number {
    if (this.order.length === 0 || this.pos >= this.order.length) {
      const again = shuffled(this.tracks.length, Math.random);
      if (again.length > 1 && again[0] === this.lastPlayed) {
        const j = Math.floor(Math.random() * again.length);
        [again[0], again[j]] = [again[j], again[0]];
      }
      this.order = again;
      this.pos = 0;
    }
    const idx = this.order[this.pos++];
    this.lastPlayed = idx;
    return idx;
  }

  private url(t: Track): string {
    return `/audio/music/${t.file}`;
  }

  /** Effektive Master-Lautstaerke inkl. Duck-Fade (duckFactor 1..0). */
  private currentLevel(): number {
    const duckFloor = Math.min(this.volume, DUCK_LEVEL);
    return duckFloor + (this.volume - duckFloor) * this.duckFactor;
  }

  /** Schreibt die Lautstaerke beider Decks (Master x Crossfade-Form). */
  private applyVolumes() {
    const master = this.playing ? this.currentLevel() : 0;
    for (let i = 0; i < 2; i++) {
      const d = this.decks[i];
      let shape = i === this.active ? 1 : 0;
      if (this.crossfading) {
        const el = (performance.now() - this.cfStart) / 1000;
        const k = Math.min(el / XFADE_S, 1);
        shape = i === this.active ? 1 - k : k;
        if (k >= 1) {
          this.finishCrossfade();
          break;
        }
      }
      d.volume = Math.max(0, Math.min(1, master * shape));
    }
  }

  private tick() {
    this.applyVolumes();
    if (this.crossfading) return;
    const goal = this.ducked ? 0 : 1;
    if (this.duckFactor === goal) {
      this.stopTimerIfIdle();
      return;
    }
    const step = 0.045; // bei 70 ms Tick ~1,6 s Duck-Fade
    this.duckFactor =
      goal === 0
        ? Math.max(goal, this.duckFactor - step)
        : Math.min(goal, this.duckFactor + step);
    this.applyVolumes();
    if (this.duckFactor === goal) this.stopTimerIfIdle();
  }

  private ensureTimer() {
    if (this.fadeTimer === null) {
      this.fadeTimer = window.setInterval(() => this.tick(), 70);
    }
  }

  private stopTimerIfIdle() {
    if (this.fadeTimer !== null && !this.crossfading && this.duckFactor === (this.ducked ? 0 : 1)) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  private finishCrossfade() {
    const old = this.decks[1 - this.active];
    this.crossfading = false;
    try {
      old.pause();
      old.currentTime = 0;
    } catch {
      /* Deck noch nicht bereitbar */
    }
    this.applyVolumes();
    this.stopTimerIfIdle();
  }

  /** Naechster Track: auf dem inaktiven Deck starten, linear crossgeblendet. */
  private next() {
    if (!this.ready || this.crossfading) return;
    const idx = this.pickNext();
    const track = this.tracks[idx];
    const to = this.decks[1 - this.active];
    to.src = this.url(track);
    to.trackIndex = idx;
    this.active = 1 - this.active;
    this.crossfading = true;
    this.cfStart = performance.now();
    this.ensureTimer();
    void to.play().catch(() => {
      /* Autoplay-Konte: Gesture-Handler versucht neu */
    });
    this.onTrack(track);
  }

  /** Zeitsteuerung des aktiven Decks: Wechsel kurz vor Trackende. */
  private scheduleNext() {
    const d = this.decks[this.active];
    if (!this.playing || this.crossfading || !d.duration || isNaN(d.duration)) return;
    if (d.duration - d.currentTime <= PRELOAD_AHEAD_S) this.next();
  }

  async start(): Promise<boolean> {
    if (!this.ready) return false;
    if (this.playing) return true;
    const idx = this.pickNext();
    const d = this.decks[this.active];
    d.src = this.url(this.tracks[idx]);
    d.trackIndex = idx;
    this.onTrack(this.tracks[idx]);
    this.playing = true;
    this.applyVolumes();
    try {
      await d.play();
    } catch {
      this.playing = false;
      this.applyVolumes();
      return false;
    }
    this.onPlaying(true);
    return true;
  }

  stop() {
    this.playing = false;
    this.crossfading = false;
    for (const d of this.decks) {
      try {
        d.pause();
      } catch {
        /* noop */
      }
      d.volume = 0;
    }
    this.onPlaying(false);
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
    localStorage.setItem(LS_VOLUME, String(this.volume));
  }

  /** Duck: Musik weicht Sprachausgabe/Hinweisen einer Child-App. */
  setDuck(on: boolean) {
    if (this.ducked === on) return;
    this.ducked = on;
    this.ensureTimer();
  }
}

export const music = new MusicEngine();

declare global {
  interface Window {
    fokuspunktMusic?: MusicEngine;
  }
}

// Debug- und Test-Seit; Child-Apps steuern ueber postMessage (s.o.).
window.fokuspunktMusic = music;

/* ------------------------------------------------------------------ UI --- */

const ICON_ON = `
  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 18V6l10-2v11.5"/>
    <circle cx="6.5" cy="18" r="2.6" fill="currentColor" stroke="none"/>
    <circle cx="16.5" cy="15.5" r="2.6" fill="currentColor" stroke="none"/>
  </svg>`;

const ICON_OFF = `
  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 18V6l10-2v11.5" opacity="0.45"/>
    <circle cx="6.5" cy="18" r="2.6" fill="currentColor" opacity="0.45" stroke="none"/>
    <circle cx="16.5" cy="15.5" r="2.6" fill="currentColor" opacity="0.45" stroke="none"/>
    <line x1="3.5" y1="21" x2="21" y2="3.5" stroke="#C75B12" stroke-width="2.4"/>
  </svg>`;

function buildPill(): {
  pill: HTMLElement;
  btn: HTMLButtonElement;
  slider: HTMLInputElement;
  title: HTMLElement;
} {
  const pill = document.createElement('div');
  pill.className = 'music-pill';
  pill.id = 'musicPill';
  pill.hidden = true;
  pill.innerHTML = `
    <button class="music-btn" type="button" aria-pressed="false"
            title="Hintergrundmusik an- oder ausschalten">${ICON_OFF}</button>
    <input class="music-vol" type="range" min="0" max="100" step="1"
           aria-label="Lautst\u00e4rke der Hintergrundmusik">
    <span class="music-title" aria-live="polite"></span>`;
  document.body.appendChild(pill);
  return {
    pill,
    btn: pill.querySelector('.music-btn') as HTMLButtonElement,
    slider: pill.querySelector('.music-vol') as HTMLInputElement,
    title: pill.querySelector('.music-title') as HTMLElement,
  };
}

export function initMusic(): void {
  const ui = buildPill();
  const savedVol = Number(localStorage.getItem(LS_VOLUME));
  music.volume = isFinite(savedVol) && savedVol > 0 ? Math.min(savedVol, 1) : 0.25;
  ui.slider.value = String(Math.round(music.volume * 100));
  music.setVolume(music.volume);

  const wantOn = localStorage.getItem(LS_STATE) === 'on';
  let userOn = wantOn;

  const paint = () => {
    ui.btn.innerHTML = music.playing ? ICON_ON : ICON_OFF;
    ui.btn.setAttribute('aria-pressed', music.playing ? 'true' : 'false');
    ui.btn.title = music.playing
      ? 'Hintergrundmusik pausieren'
      : 'Hintergrundmusik abspielen';
    ui.pill.classList.toggle('is-playing', music.playing);
  };

  music.onPlaying = () => paint();
  music.onTrack = (t) => {
    ui.title.textContent = t ? `${t.title} · ${t.category}` : '';
    ui.title.title = t ? `${t.title} (${t.category})` : '';
  };

  ui.btn.addEventListener('click', async () => {
    if (music.playing) {
      userOn = false;
      localStorage.setItem(LS_STATE, 'off');
      music.stop();
    } else {
      userOn = true;
      localStorage.setItem(LS_STATE, 'on');
      await music.start();
    }
    paint();
  });

  ui.slider.addEventListener('input', () => {
    music.setVolume(Number(ui.slider.value) / 100);
    if (!music.playing && Number(ui.slider.value) > 0 && userOn) {
      void music.start().then(paint);
    }
  });

  paint();

  void music.load().then(async (ok) => {
    if (!ok) return;
    ui.pill.hidden = false;
    if (userOn) {
      // Autoplay-Policy: erst nach der ersten Benutzer-Geste starten.
      const kick = () => {
        void music.start().then(paint);
        document.removeEventListener('pointerdown', kick, true);
        document.removeEventListener('keydown', kick, true);
      };
      document.addEventListener('pointerdown', kick, true);
      document.addEventListener('keydown', kick, true);
    }
  });

  // --- postMessage-API fuer Child-iframes: duck / resume -----------------
  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as { type?: string; action?: string; value?: number } | null;
    if (!data || data.type !== 'FOCUS_AUDIO') return;
    switch (data.action) {
      case 'duck':
        music.setDuck(true);
        break;
      case 'resume':
        music.setDuck(false);
        break;
      case 'set-volume':
        if (typeof data.value === 'number') {
          music.setVolume(data.value);
          ui.slider.value = String(Math.round(music.volume * 100));
        }
        break;
      case 'play':
        userOn = true;
        localStorage.setItem(LS_STATE, 'on');
        void music.start().then(paint);
        break;
      case 'pause':
        userOn = false;
        localStorage.setItem(LS_STATE, 'off');
        music.stop();
        paint();
        break;
    }
  });

  // --- Service Worker: Musik offline-cachen ------------------------------
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        /* Offline-Cache optiona */
      });
    });
  }
}
