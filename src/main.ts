import { APPS, CATEGORIES, type AppInfo, type CategoryId, type CategoryInfo } from './apps';

type Audience = 'privat' | 'einrichtung';

interface AudienceInfo {
  readonly id: Audience;
  readonly icon: string;
  readonly title: string;
  readonly claim: string;
  readonly lead: string;
  readonly points: readonly string[];
}

const AUDIENCES: readonly AudienceInfo[] = [
  {
    id: 'privat',
    icon: '🏠',
    title: 'Für Senioren & Angehörige',
    claim: 'Zuhause ausprobieren und gemeinsam spielen',
    lead: 'App antippen und loslegen – keine Anmeldung, keine Installation.',
    points: [
      'Große Bedienflächen, keine komplizierten Menüs',
      'Kein Zeitdruck: Pausen sind jederzeit möglich',
      'Viele Apps lassen sich zu zweit an einem Gerät spielen'
    ]
  },
  {
    id: 'einrichtung',
    icon: '🏫',
    title: 'Für Einrichtungen',
    claim: 'Digitale Aktivierung für Gruppen und Einzelbetreuung',
    lead: 'Alles läuft im Browser, ohne Installation und ohne Anmeldung – der Bildschirm genügt.',
    points: [
      'Geeignet für Einzelbetreuung, Gruppenstunden und Besuchsdienste',
      'Spiele zu zweit oder zu mehreren an einem Gerät',
      'Auch für Menschen mit Demenz oder kognitiven Einschränkungen – als zusätzlicher Anwendungsfall neben Spiel, Wahrnehmung und Entspannung'
    ]
  }
];

/** Symbol des Titelbereichs: Fokuspunkt als Ring-Marke. */
const HERO_MARK = `
        <span class="hero-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64" focusable="false">
            <circle class="ring-outer" cx="32" cy="32" r="29" />
            <circle class="ring-inner" cx="32" cy="32" r="19" />
            <circle class="dot" cx="32" cy="32" r="9" />
          </svg>
        </span>`;

const appEl = document.getElementById('app') as HTMLElement;
const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  CategoryInfo
>;
let currentCategory: CategoryId | null = null;
let currentAudience: Audience | null = null;

function getParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

function isCategoryId(value: string | null): value is CategoryId {
  return value !== null && value in CATEGORY_BY_ID;
}

function isAudience(value: string | null): value is Audience {
  return value !== null && AUDIENCES.some((a) => a.id === value);
}

function setURL(
  appId: string | null,
  categoryId: CategoryId | null,
  audience: Audience | null
): void {
  const params = new URLSearchParams();
  if (appId) params.set('app', appId);
  if (categoryId) params.set('bereich', categoryId);
  if (audience) params.set('ziel', audience);
  const query = params.toString();
  window.history.pushState(
    { app: appId, bereich: categoryId, ziel: audience },
    '',
    query ? `/?${query}` : '/'
  );
}

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function appCard(a: AppInfo, category: CategoryInfo): string {
  const search = [a.title, a.subtitle, a.description, category.title, category.keywords].join(' ');
  return `
    <button class="app-card" style="--card-accent: ${a.accent}" data-app="${a.id}"
            data-search="${esc(norm(search))}"
            aria-label="${esc(a.title)} öffnen">
      <span class="app-preview">
        <img src="${esc(a.screenshot)}" alt="" loading="lazy">
      </span>
      <span class="card-heading">
        <span class="icon" aria-hidden="true">${a.icon}</span>
        <span class="title">${esc(a.title)}</span>
      </span>
      <span class="subtitle">${esc(a.subtitle)}</span>
      ${a.description ? `<span class="desc">${esc(a.description)}</span>` : ''}
    </button>`;
}

function bereichsLinks(): string {
  const origin = window.location.origin;
  const links = CATEGORIES.map(
    (c) => `
        <li>
          <span class="link-area">${esc(c.title)}</span>
          <code>${esc(`${origin}/?bereich=${c.id}`)}</code>
        </li>`
  ).join('');
  return `
      <div class="audience-links">
        <p class="audience-links-title">Bereichslinks zum Weitergeben</p>
        <p class="audience-links-hint">
          Jeder Bereich hat eine eigene Adresse. Link kopieren und an die Gruppe schicken –
          die Seite öffnet sich direkt im gewählten Bereich.
        </p>
        <ul>${links}</ul>
      </div>`;
}

function audiencePanel(audience: Audience | null): string {
  const info = AUDIENCES.find((a) => a.id === audience);
  if (!info) return '';
  const points = info.points.map((p) => `<li>${esc(p)}</li>`).join('');
  return `
      <div class="audience-panel">
        <p class="audience-lead">${esc(info.lead)}</p>
        <ul class="audience-points">${points}</ul>
        ${info.id === 'einrichtung' ? bereichsLinks() : ''}
      </div>`;
}

function renderLanding(category: CategoryId | null, audience: Audience | null): void {
  currentCategory = category;
  currentAudience = audience;
  const active = category ? CATEGORY_BY_ID[category] : null;
  document.title = active
    ? `${active.title} – Fokuspunkt`
    : 'Fokuspunkt – Interaktive Apps für Senioren';

  const [audienceLeft, audienceRight] = AUDIENCES.map(
    (a) => `
      <button class="audience-card" type="button" data-audience="${a.id}"
              aria-pressed="${a.id === audience}">
        <span class="audience-icon" aria-hidden="true">${a.icon}</span>
        <span class="audience-title">${esc(a.title)}</span>
        <span class="audience-claim">${esc(a.claim)}</span>
      </button>`
  );

  const tiles = CATEGORIES.map(
    (c) => `
      <button class="category-tile" type="button" data-category="${c.id}"
              style="--cat-accent: ${c.accent}" aria-pressed="${c.id === category}">
        <span class="cat-icon" aria-hidden="true">${c.icon}</span>
        <span class="cat-title">${esc(c.title)}</span>
        <span class="cat-claim">${esc(c.claim)}</span>
      </button>`
  ).join('');

  const sections = CATEGORIES.filter((c) => !category || c.id === category)
    .map((c) => {
      const cards = APPS.filter((a) => a.category === c.id)
        .map((a) => appCard(a, c))
        .join('');
      return `
      <section class="category-section" id="bereich-${c.id}" style="--cat-accent: ${c.accent}">
        <header class="category-header">
          <h2><span class="icon" aria-hidden="true">${c.icon}</span> ${esc(c.title)}</h2>
          <p class="category-claim">${esc(c.claim)}</p>
        </header>
        <div class="app-grid" role="list">${cards}</div>
      </section>`;
    })
    .join('');

  appEl.innerHTML = `
    <div class="landing">
      <header class="landing-header">
        ${HERO_MARK}
        <div class="hero-text">
          <h1>Fokuspunkt</h1>
          <p class="hero-lead">Spiele und Denkaufgaben für Senioren</p>
          <p class="motto">Einfach ausprobieren: Karte antippen und losspielen.</p>
          <ul class="usp-list">
            <li>Große Schaltflächen</li>
            <li>Ohne Anmeldung</li>
            <li>Kein Zeitdruck</li>
          </ul>
        </div>
      </header>
      <div class="head-bar">
        ${audienceLeft}
        <div class="search-wrap">
          <input id="appSearch" class="app-search" type="search" autocomplete="off"
                 placeholder="Wonach suchen Sie? Z. B. Garten, Musik …"
                 aria-label="Apps durchsuchen">
        </div>
        ${audienceRight}
      </div>
      ${audiencePanel(audience)}
      <p class="choice-question">Was möchten Sie heute machen?</p>
      <nav class="category-nav" aria-label="Bereiche">${tiles}</nav>
      ${
        category
          ? '<div class="all-areas"><button class="all-areas-btn" type="button" id="allAreasBtn">Alle Bereiche zeigen</button></div>'
          : ''
      }
      <main class="category-list">${sections}</main>
      <p class="no-results" hidden>Keine App gefunden. Bitte einen anderen Suchbegriff versuchen.</p>
      <footer class="landing-footer">
        Erst einen Bereich wählen, dann eine Karte antippen. Ohne Anmeldung, ohne Werbung.
      </footer>
    </div>`;

  appEl.querySelectorAll<HTMLButtonElement>('[data-app]').forEach((btn) => {
    btn.addEventListener('click', () => openApp(btn.dataset.app ?? ''));
  });

  appEl.querySelectorAll<HTMLButtonElement>('[data-category]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.category as CategoryId;
      const next = id === currentCategory ? null : id;
      setURL(null, next, currentAudience);
      renderLanding(next, currentAudience);
    });
  });

  appEl.querySelectorAll<HTMLButtonElement>('[data-audience]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.audience as Audience;
      const next = id === currentAudience ? null : id;
      setURL(null, currentCategory, next);
      renderLanding(currentCategory, next);
    });
  });

  document.getElementById('allAreasBtn')?.addEventListener('click', () => {
    setURL(null, null, currentAudience);
    renderLanding(null, currentAudience);
  });

  const search = appEl.querySelector<HTMLInputElement>('#appSearch');
  const noResults = appEl.querySelector<HTMLElement>('.no-results');
  if (search && noResults) {
    const sectionEls = Array.from(appEl.querySelectorAll<HTMLElement>('.category-section'));
    search.addEventListener('input', () => {
      const term = norm(search.value.trim());
      let visible = 0;
      sectionEls.forEach((section) => {
        let hits = 0;
        section.querySelectorAll<HTMLElement>('.app-card').forEach((card) => {
          const hit = !term || (card.dataset.search ?? '').includes(term);
          card.hidden = !hit;
          if (hit) hits++;
        });
        section.hidden = hits === 0;
        visible += hits;
      });
      noResults.hidden = visible > 0;
    });
  }
}

function renderEmbed(app: AppInfo): void {
  document.title = `${app.title} – Fokuspunkt`;
  appEl.innerHTML = `
    <div class="embed">
      <header class="embed-header">
        <button class="back-btn" id="backBtn">
          <span aria-hidden="true">←</span> Zurück
        </button>
        <h1 class="embed-title">
          <span class="icon" aria-hidden="true">${app.icon}</span>
          ${esc(app.title)}
        </h1>
        ${app.description ? `<p class="embed-subtitle">${esc(app.description)}</p>` : ''}
      </header>
      <iframe class="embed-frame" src="${esc(app.url)}"
              title="${esc(app.title)}" allow="fullscreen"
              referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>`;

  document.getElementById('backBtn')?.addEventListener('click', () => {
    setURL(null, currentCategory, currentAudience);
    renderLanding(currentCategory, currentAudience);
  });
}

function openApp(id: string): void {
  const app = APPS.find((a) => a.id === id);
  if (!app) return;
  setURL(id, currentCategory, currentAudience);
  renderEmbed(app);
}

function syncFromURL(): void {
  const rawApp = getParam('app');
  const app = rawApp ? APPS.find((a) => a.id === rawApp) : undefined;
  if (app) {
    renderEmbed(app);
    return;
  }
  const rawCategory = getParam('bereich');
  const rawAudience = getParam('ziel');
  const clean =
    (rawApp !== null && !app) ||
    (rawCategory !== null && !isCategoryId(rawCategory)) ||
    (rawAudience !== null && !isAudience(rawAudience));
  if (clean) {
    // Unknown app, area or audience: clean URL without extra history entry
    window.history.replaceState({ app: null, bereich: null, ziel: null }, '', '/');
  }
  renderLanding(
    isCategoryId(rawCategory) ? rawCategory : null,
    isAudience(rawAudience) ? rawAudience : null
  );
}

window.addEventListener('popstate', syncFromURL);

syncFromURL();
