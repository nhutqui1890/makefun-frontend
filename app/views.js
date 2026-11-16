// The board and the bounty page: functions from API data to HTML.
// Filtering and sorting run on the fetched board in the browser, so they cost
// no extra request; only the table body is rebuilt when they change.

import { date, esc, money, num, timeLeft } from './format.js';

/** The reward as it stands now: the prize plus any entry fees paid into it. */
export const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
export const fee = (b) => (b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free');

/** Sort orders for the board. 'Closing soonest' keeps still-open bounties
 * first (the API's open list includes bounties whose deadline just passed,
 * in their final window) and ended ones after, each group by deadline. */
export const SORTS = {
  deadline: (a, b) => {
    const now = Date.now();
    const aEnded = new Date(a.deadline).getTime() <= now ? 1 : 0;
    const bEnded = new Date(b.deadline).getTime() <= now ? 1 : 0;
    return aEnded - bEnded || new Date(a.deadline) - new Date(b.deadline);
  },
  pot: (a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount),
  entries: (a, b) => (b.submissionCount ?? 0) - (a.submissionCount ?? 0),
  title: (a, b) => String(a.title).localeCompare(String(b.title)),
};

/** Filter by search text and category, then sort. Pure: easy to test, no DOM. */
export function filterBoard(items, { q = '', category = '', sort = 'deadline' } = {}) {
  const needle = q.trim().toLowerCase();
  const kept = items.filter((b) => {
    if (category && b.category !== category) return false;
    if (!needle) return true;
    return `${b.title} ${b.slug} ${b.category ?? ''} ${(b.skills ?? []).join(' ')}`
      .toLowerCase()
      .includes(needle);
  });
  return kept.sort(SORTS[sort] ?? SORTS.deadline);
}

/** The distinct categories on the board, for the filter. */
export function categoriesOf(items) {
  return [...new Set(items.map((b) => b.category).filter(Boolean))].sort();
}

function row(b) {
  return `<tr>
    <td data-label="Bounty"><a class="bounty-link" href="#/bounty/${encodeURIComponent(b.slug)}" data-slug="${esc(b.slug)}">${esc(b.title)}</a>
      <span class="slug">${esc(b.slug)}</span></td>
    <td data-label="Category">${esc(b.category ?? '—')}</td>
    <td data-label="Pot" class="pot">${pot(b)}</td>
    <td data-label="Entry fee">${fee(b)}</td>
    <td data-label="Time left"><span data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</span></td>
    <td data-label="Entries" class="num">${num(b.submissionCount)}</td>
  </tr>`;
}

/** Just the board's rows, so a filter change rebuilds the tbody only. */
export function boardRows(items) {
  if (!items.length) return '<tr><td colspan="6" class="empty">No bounties match — clear the search or pick another category.</td></tr>';
  return items.map(row).join('');
}

export function board(data, state) {
  const items = data.items ?? [];
  const cats = categoriesOf(items);
  return `<h1 tabindex="-1">Open bounties</h1>
  <p class="lede">${num(items.length)} open ${items.length === 1 ? 'bounty' : 'bounties'} — the pot is the live prize, fees included. Press <kbd>/</kbd> to search.</p>
  <form class="controls" id="board-controls" role="search" aria-label="Filter bounties">
    <label>Search <input type="search" id="board-q" name="q" value="${esc(state.q)}" placeholder="Title, slug or skill…" autocomplete="off"></label>
    <label>Category <select id="board-category" name="category">
      <option value="">All categories</option>
      ${cats.map((c) => `<option value="${esc(c)}"${c === state.category ? ' selected' : ''}>${esc(c)}</option>`).join('')}
    </select></label>
    <label>Sort by <select id="board-sort" name="sort">
      <option value="deadline"${state.sort === 'deadline' ? ' selected' : ''}>Closing soonest</option>
      <option value="pot"${state.sort === 'pot' ? ' selected' : ''}>Largest pot</option>
      <option value="entries"${state.sort === 'entries' ? ' selected' : ''}>Most entries</option>
      <option value="title"${state.sort === 'title' ? ' selected' : ''}>Title A–Z</option>
    </select></label>
  </form>
  <p class="result-count" aria-live="polite" id="board-count"></p>
  <table class="board">
    <thead><tr><th scope="col">Bounty</th><th scope="col">Category</th><th scope="col">Pot</th><th scope="col">Entry fee</th><th scope="col">Time left</th><th scope="col">Entries</th></tr></thead>
    <tbody id="board-body">${boardRows(filterBoard(items, state))}</tbody>
  </table>`;
}

function rewardsTable(b) {
  const rows = b.rewardsNow ?? [];
  if (!rows.length) return '';
  return `<h2>Rewards</h2>
  <table class="rewards">
    <thead><tr><th scope="col">Place</th><th scope="col">Prize</th></tr></thead>
    <tbody>${rows
      .map(
        (r) =>
          `<tr><td>${r.place === 1 ? '1st' : r.place === 2 ? '2nd' : r.place === 3 ? '3rd' : `${r.place}th`}</td><td class="pot">${money(r.amountUsd)}</td></tr>`,
      )
      .join('')}</tbody>
  </table>`;
}

function phasesList(b) {
  const phases = b.phases ?? [];
  if (!phases.length) return '';
  return `<h2>Phases</h2><ul class="phases">${phases
    .map(
      (p) =>
        `<li><strong>${esc(p.title)}</strong> — ${date(p.startsAt)} to ${date(p.endsAt)}${p.description ? `<br>${esc(p.description)}` : ''}</li>`,
    )
    .join('')}</ul>`;
}

export function bounty(b) {
  const ended = new Date(b.deadline).getTime() <= Date.now();
  return `<p class="crumbs"><a href="#/">← All bounties</a></p>
  <h1 tabindex="-1">${esc(b.title)}</h1>
  <p class="lede">${esc(b.summary ?? b.description?.split('\n')[0] ?? '')}</p>
  <dl class="facts">
    <div><dt>Live pot</dt><dd class="pot big">${pot(b)}</dd></div>
    <div><dt>Entry fee</dt><dd class="big">${fee(b)}</dd></div>
    <div><dt>Deadline</dt><dd>${date(b.deadline)}<br><strong class="${ended ? 'ended' : ''}" data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</strong></dd></div>
    <div><dt>Entries</dt><dd class="big">${num(b.submissionCount)}</dd></div>
    <div><dt>Category</dt><dd>${esc(b.category ?? '—')}</dd></div>
    <div><dt>Sponsor</dt><dd>${esc(b.sponsor?.name ?? '—')}</dd></div>
  </dl>
  <p class="actions">
    <a class="button" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard →</a>
    <a class="button ghost" href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">Open on make.fun ↗</a>
    <a class="button ghost" href="https://make.fun/c/${encodeURIComponent(b.slug)}/kit">Download the kit</a>
  </p>
  ${rewardsTable(b)}
  ${phasesList(b)}
  <h2>About this bounty</h2>
  <div class="description">${esc(b.description ?? '')}</div>
  ${(b.skills ?? []).length ? `<h2>Skills</h2><ul class="chips">${b.skills.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}`;
}
