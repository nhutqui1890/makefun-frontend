// The leaderboard page: a competition's ranked entries, 25 to a page.
// Loaded on demand (imported only when the route opens), so it costs the
// first load nothing. One API request per view; paging rebuilds the table
// body only, never the page.

import { getLeaderboard } from './api.js';
import { bytes, esc, num, pctMicro } from './format.js';

const PAGE_SIZE = 25;

/** A leaderboard cell, formatted by what its column measures. */
function cellValue(key, entry) {
  const v = entry.values?.[key];
  if (v == null) return '—';
  if (key === 'judge' || key === 'judge_low' || key === 'judge_high') return pctMicro(v);
  if (key === 'valid') return Number(v) ? '✓' : '—';
  if (key === 'bytes') return bytes(v);
  return esc(entry.display?.[key] ?? v);
}

function pageRows(lb, page) {
  const entries = lb.entries ?? [];
  const start = (page - 1) * PAGE_SIZE;
  const cols = (lb.columns ?? []).filter((c) => !c.hidden);
  return entries
    .slice(start, start + PAGE_SIZE)
    .map(
      (e) => `<tr>
      <td data-label="Rank" class="num">${num(e.rank)}</td>
      <td data-label="Entrant"><a href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a></td>
      <td data-label="Entry">${esc(e.title ?? '—')}${e.prize_rank ? ` <span class="prize">🏆 #${num(e.prize_rank)}</span>` : ''}</td>
      ${cols.map((c) => `<td data-label="${esc(c.title)}" class="num">${cellValue(c.key, e)}</td>`).join('')}
    </tr>`,
    )
    .join('');
}

function pager(lb, page) {
  const total = Math.ceil((lb.entries ?? []).length / PAGE_SIZE);
  if (total <= 1) return '';
  return `<nav class="pager" aria-label="Leaderboard pages">
    <button type="button" data-page="${page - 1}"${page <= 1 ? ' disabled' : ''}>← Previous</button>
    <span>Page ${num(page)} of ${num(total)}</span>
    <button type="button" data-page="${page + 1}"${page >= total ? ' disabled' : ''}>Next →</button>
  </nav>`;
}

/** Render the leaderboard for one competition into root; returns the page title. */
export async function showLeaderboard(root, slug, view) {
  const lb = await getLeaderboard(slug, view);
  const comp = lb.competition ?? {};
  const title = comp.title ?? lb.title ?? slug;
  const cols = (lb.columns ?? []).filter((c) => !c.hidden);
  const views = lb.views ?? [];
  let page = 1;

  root.innerHTML = `<p class="crumbs"><a href="#/bounty/${encodeURIComponent(slug)}">← ${esc(title)}</a></p>
  <h1 tabindex="-1">Leaderboard: ${esc(title)}</h1>
  <p class="lede">${num((lb.entries ?? []).length)} ranked ${((lb.entries ?? []).length === 1 ? 'entry' : 'entries')}${lb.phase?.title ? ` · ${esc(lb.phase.title)} phase` : ''}${lb.metrics_withheld ? ' · some metrics are withheld until the final heat' : ''}</p>
  ${views.length > 1 ? `<p class="views" role="group" aria-label="Leaderboard view">${views.map((v) => `<a href="#/bounty/${encodeURIComponent(slug)}/leaderboard?view=${v}"${v === lb.view ? ' aria-current="true"' : ''}>${esc(v)}</a>`).join('')}</p>` : ''}
  <table class="leaderboard">
    <thead><tr><th scope="col">Rank</th><th scope="col">Entrant</th><th scope="col">Entry</th>${cols.map((c) => `<th scope="col">${esc(c.title)}</th>`).join('')}</tr></thead>
    <tbody id="lb-body">${pageRows(lb, page)}</tbody>
  </table>
  <div id="lb-pager">${pager(lb, page)}</div>
  <p class="note">Rank by ${esc(lb.rank_key ?? 'score')}${lb.tie_break ? `, ties broken by ${esc(lb.tie_break.title ?? lb.tie_break.key)}` : ''}. One entry per entrant counts${lb.submission_rule ? ` (${esc(lb.submission_rule)})` : ''}.</p>`;

  root.querySelector('#lb-pager').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-page]');
    if (!btn || btn.disabled) return;
    page = Number(btn.dataset.page);
    root.querySelector('#lb-body').innerHTML = pageRows(lb, page);
    root.querySelector('#lb-pager').innerHTML = pager(lb, page);
  });
  return `Leaderboard: ${title}`;
}
