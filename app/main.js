// A make.fun frontend: the board, a bounty page, its leaderboard, public
// profiles and the global rankings, on hash routes — every surface reachable
// by a link and by its own URL:
//
//   #/                              the board of open bounties
//   #/bounty/<slug>                 one bounty
//   #/bounty/<slug>/leaderboard     its leaderboard (?view=overall|performance)
//   #/u/<handle>                    an account's public profile
//   #/rankings                      the global rankings (?order=wins|paid)
//
// The board and bounty views load with the first page; the leaderboard and
// profile views are imported only when their route opens, so the first load
// stays small. window.__shotReady is false while a page loads and true once
// its data is on screen, so a screenshot script knows when to capture.

import { getBounties, getBounty, prefetch, servedStale } from './api.js';
import { board, boardRows, bounty, filterBoard } from './views.js';

const app = document.getElementById('app');

/** The board's filter state, kept across route changes. */
const boardState = { q: '', category: '', sort: 'deadline' };
let boardData = null;
let countdown = null;

function startCountdown() {
  stopCountdown();
  countdown = setInterval(() => {
    // Update only the time-left cells, never rebuild the page.
    document.querySelectorAll('[data-deadline]').forEach((el) => {
      const ms = new Date(el.dataset.deadline).getTime() - Date.now();
      if (ms <= 0) {
        el.textContent = 'ended';
        return;
      }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      el.textContent = d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
    });
  }, 30000);
}

function stopCountdown() {
  if (countdown) clearInterval(countdown);
  countdown = null;
}

function staleNote(path) {
  return servedStale(path)
    ? '<p class="notice" role="status">Showing the last good data — make.fun did not answer just now.</p>'
    : '';
}

function refreshBoardRows() {
  const items = filterBoard(boardData.items ?? [], boardState);
  const body = document.getElementById('board-body');
  if (body) body.innerHTML = boardRows(items);
  const count = document.getElementById('board-count');
  if (count) {
    count.textContent =
      items.length === (boardData.items ?? []).length
        ? ''
        : `${items.length} of ${boardData.items.length} bounties match.`;
  }
}

function bindBoard() {
  const q = document.getElementById('board-q');
  const category = document.getElementById('board-category');
  const sort = document.getElementById('board-sort');
  q.addEventListener('input', () => {
    boardState.q = q.value;
    refreshBoardRows();
  });
  category.addEventListener('change', () => {
    boardState.category = category.value;
    refreshBoardRows();
  });
  sort.addEventListener('change', () => {
    boardState.sort = sort.value;
    refreshBoardRows();
  });
  // Warm the cache for the bounty the visitor is about to open.
  app.addEventListener('mouseover', (event) => {
    const link = event.target.closest('.bounty-link');
    if (link) prefetch(`/competitions/${encodeURIComponent(link.dataset.slug)}?submissions=summary`);
  });
  app.addEventListener('focusin', (event) => {
    const link = event.target.closest('.bounty-link');
    if (link) prefetch(`/competitions/${encodeURIComponent(link.dataset.slug)}?submissions=summary`);
  });
  refreshBoardRows();
}

function finish(title) {
  document.title = title;
  window.scrollTo(0, 0);
  const h1 = app.querySelector('h1');
  if (h1) h1.focus({ preventScroll: true });
  window.__shotReady = true;
}

async function render() {
  window.__shotReady = false;
  stopCountdown();
  const [pathPart, queryPart] = (location.hash.slice(1) || '/').split('?');
  const query = new URLSearchParams(queryPart ?? '');
  const path = pathPart || '/';
  app.innerHTML = '<p class="loading" role="status">Loading…</p>';
  try {
    let m;
    if (path === '/') {
      boardData = await getBounties();
      app.innerHTML = staleNote('/competitions?status=open&activity=times') + board(boardData, boardState);
      bindBoard();
      startCountdown();
      finish('make.fun bounties');
    } else if ((m = path.match(/^\/bounty\/([^/]+)\/leaderboard$/))) {
      const { showLeaderboard } = await import('./leaderboard.js');
      const title = await showLeaderboard(app, decodeURIComponent(m[1]), query.get('view') ?? undefined);
      finish(`${title} | make.fun bounties`);
    } else if ((m = path.match(/^\/bounty\/([^/]+)$/))) {
      const b = await getBounty(decodeURIComponent(m[1]));
      app.innerHTML =
        staleNote(`/competitions/${encodeURIComponent(m[1])}?submissions=summary`) + bounty(b);
      startCountdown();
      finish(`${b.title} | make.fun bounties`);
    } else if ((m = path.match(/^\/u\/([^/]+)$/))) {
      const { showProfile } = await import('./profile.js');
      const title = await showProfile(app, decodeURIComponent(m[1]));
      finish(title);
    } else if (path === '/rankings') {
      const { showRankings } = await import('./profile.js');
      const title = await showRankings(app, query.get('order') === 'paid' ? 'paid' : 'wins');
      finish(`${title} | make.fun bounties`);
    } else {
      app.innerHTML = `<h1 tabindex="-1">Page not found</h1><p>No such page here. <a href="#/">Back to the board</a>.</p>`;
      finish('Not found | make.fun bounties');
    }
  } catch (err) {
    app.innerHTML = `<h1 tabindex="-1">Something went wrong</h1>
      <p role="alert">${err.message}</p>
      <p><button type="button" id="retry">Retry</button> <a href="#/">Back to the board</a></p>`;
    document.getElementById('retry').addEventListener('click', render);
    finish('Error | make.fun bounties');
  }
}

// '/' focuses the board search, wherever you are on the board.
document.addEventListener('keydown', (event) => {
  if (event.key !== '/' || event.target.matches('input, select, textarea')) return;
  const q = document.getElementById('board-q');
  if (q) {
    event.preventDefault();
    q.focus();
  }
});

window.addEventListener('hashchange', render);
render();
