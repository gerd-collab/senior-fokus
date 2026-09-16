import { APPS, type AppInfo } from './apps';

const appEl = document.getElementById('app') as HTMLElement;
let currentId: string | null = null;

function getParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

function setURL(id: string | null): void {
  const url = id ? `/?app=${encodeURIComponent(id)}` : '/';
  window.history.pushState({ app: id }, '', url);
}

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function renderLanding(): void {
  document.title = 'Fokuspunkt – Apps für Senioren';
  const cards = APPS.map(
    (a) => `
    <button class="app-card" style="--card-accent: ${a.accent}" data-app="${a.id}"
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
    </button>`
  ).join('');

  appEl.innerHTML = `
    <div class="landing">
      <header class="landing-header">
        <h1>Fokuspunkt</h1>
        <p class="motto">Ruhige Beschäftigung und Training – zum Auswählen und Mitmachen.</p>
      </header>
      <main class="app-grid" role="list">${cards}</main>
      <footer class="landing-footer">
        Einfach eine Karte antippen. Ohne Anmeldung, ohne Werbung.
      </footer>
    </div>`;

  appEl.querySelectorAll<HTMLButtonElement>('[data-app]').forEach((btn) => {
    btn.addEventListener('click', () => openApp(btn.dataset.app ?? ''));
  });
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
    setURL(null);
    renderLanding();
  });
}

function openApp(id: string): void {
  const app = APPS.find((a) => a.id === id);
  if (!app) return;
  currentId = id;
  setURL(id);
  renderEmbed(app);
}

function syncFromURL(): void {
  const id = getParam('app');
  const app = APPS.find((a) => a.id === id);
  if (app) {
    currentId = app.id;
    renderEmbed(app);
  } else {
    currentId = null;
    if (id) {
      // Unknown app id: clean URL without extra history entry
      window.history.replaceState({ app: null }, '', '/');
    }
    renderLanding();
  }
}

window.addEventListener('popstate', syncFromURL);

syncFromURL();
