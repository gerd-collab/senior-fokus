import { APPS, CATEGORIES, type AppInfo, type CategoryId, type CategoryInfo } from './apps';

const appEl = document.getElementById('app') as HTMLElement;
const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  CategoryInfo
>;
let currentCategory: CategoryId | null = null;

function getParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

function isCategoryId(value: string | null): value is CategoryId {
  return value !== null && value in CATEGORY_BY_ID;
}

function setURL(appId: string | null, categoryId: CategoryId | null): void {
  const params = new URLSearchParams();
  if (appId) params.set('app', appId);
  else if (categoryId) params.set('bereich', categoryId);
  const query = params.toString();
  window.history.pushState({ app: appId, bereich: categoryId }, '', query ? `/?${query}` : '/');
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

function renderLanding(category: CategoryId | null): void {
  currentCategory = category;
  const active = category ? CATEGORY_BY_ID[category] : null;
  document.title = active ? `${active.title} – Fokuspunkt` : 'Fokuspunkt – Apps für Senioren';

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
      const cards = APPS.filter((a) => a.category === c.id).map((a) => appCard(a, c)).join('');
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
        <h1>Fokuspunkt</h1>
        <p class="motto">Ruhige Beschäftigung und Training – zum Auswählen und Mitmachen.</p>
        <div class="search-wrap">
          <input id="appSearch" class="app-search" type="search" autocomplete="off"
                 placeholder="Wonach suchen Sie? Zum Beispiel: Garten, Musik, Gedächtnis …"
                 aria-label="Apps durchsuchen">
        </div>
      </header>
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
      setURL(null, next);
      renderLanding(next);
    });
  });

  document.getElementById('allAreasBtn')?.addEventListener('click', () => {
    setURL(null, null);
    renderLanding(null);
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
    setURL(null, currentCategory);
    renderLanding(currentCategory);
  });
}

function openApp(id: string): void {
  const app = APPS.find((a) => a.id === id);
  if (!app) return;
  setURL(id, currentCategory);
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
  if (rawApp || (rawCategory && !isCategoryId(rawCategory))) {
    // Unknown app or area: clean URL without extra history entry
    window.history.replaceState({ app: null, bereich: null }, '', '/');
  }
  renderLanding(isCategoryId(rawCategory) ? rawCategory : null);
}

window.addEventListener('popstate', syncFromURL);

syncFromURL();
