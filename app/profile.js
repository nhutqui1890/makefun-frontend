// The public profile page and the global rankings page.
// Loaded on demand (imported only when the route opens), so they cost the
// first load nothing. One API request per page.

import { getProfile, getRankings } from './api.js';
import { date, esc, money, num, pctMicro, shortAddr } from './format.js';

const API_ORIGIN = 'https://make.fun';

function recordStats(r) {
  const cells = [
    ['Entered', num(r.competitions_entered)],
    ['Placed', num(r.competitions_placed)],
    ['Won', num(r.competitions_won)],
    ['Podiums', num(r.podium_finishes)],
    ['Best place', r.best_placement ? `#${num(r.best_placement)}` : '—'],
    ['Prize money', money(r.prize_usd)],
  ];
  return `<dl class="facts">${cells.map(([k, v]) => `<div><dt>${k}</dt><dd class="big">${v}</dd></div>`).join('')}</dl>`;
}

function solutionsTable(solutions) {
  if (!solutions.length) return '<p>No public entries yet.</p>';
  return `<table class="solutions">
    <thead><tr><th scope="col">Entry</th><th scope="col">Bounty</th><th scope="col">Place</th><th scope="col">Prize</th><th scope="col">Score</th></tr></thead>
    <tbody>${solutions
      .map(
        (s) => `<tr>
      <td data-label="Entry">${esc(s.title ?? '—')}</td>
      <td data-label="Bounty"><a href="#/bounty/${encodeURIComponent(s.competition.slug)}">${esc(s.competition.title)}</a></td>
      <td data-label="Place" class="num">${s.placement ? `#${num(s.placement)}` : '—'}</td>
      <td data-label="Prize" class="num">${s.prize_usd ? money(s.prize_usd) : '—'}</td>
      <td data-label="Score" class="num">${s.score ? `${esc(s.score.column?.title ?? 'Score')}: ${pctMicro(s.score.value)}` : '—'}</td>
    </tr>`,
      )
      .join('')}</tbody>
  </table>`;
}

function payoutsTable(payouts) {
  if (!payouts.length) return '';
  return `<h2>Payouts</h2>
  <table class="payouts">
    <thead><tr><th scope="col">Bounty</th><th scope="col">Place</th><th scope="col">Amount</th><th scope="col">Paid</th><th scope="col">Receipt</th></tr></thead>
    <tbody>${payouts
      .map(
        (p) => `<tr>
      <td data-label="Bounty"><a href="#/bounty/${encodeURIComponent(p.competition.slug)}">${esc(p.competition.title)}</a></td>
      <td data-label="Place" class="num">#${num(p.place)}</td>
      <td data-label="Amount" class="num pot">${money(p.amount_usd)}</td>
      <td data-label="Paid">${date(p.paid_at)}</td>
      <td data-label="Receipt">${p.explorer_url ? `<a href="${esc(p.explorer_url)}">Solana ↗</a>` : '—'}</td>
    </tr>`,
      )
      .join('')}</tbody>
  </table>`;
}

/** Render one account's public profile into root; returns the page title. */
export async function showProfile(root, handle) {
  const p = await getProfile(handle);
  const name = p.display_name ?? `@${p.handle}`;
  const img = p.image ?? p.avatar?.url;
  const links = [
    p.github_login ? `<a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub ↗</a>` : '',
    p.x ? `<a href="https://x.com/${encodeURIComponent(typeof p.x === 'string' ? p.x : p.x.username ?? '')}">X ↗</a>` : '',
    p.discord?.url ? `<a href="${esc(p.discord.url)}">Discord ↗</a>` : '',
    p.wallet?.explorer_url
      ? `<a href="${esc(p.wallet.explorer_url)}">Wallet ${shortAddr(p.wallet.address)} ↗</a>`
      : '',
  ].filter(Boolean);

  root.innerHTML = `<div class="profile-head">
    ${img ? `<img class="avatar" src="${esc(img.startsWith('/') ? API_ORIGIN + img : img)}" alt="" width="72" height="72" loading="lazy">` : ''}
    <div>
      <h1 tabindex="-1">${esc(name)}</h1>
      <p class="handle">@${esc(p.handle)} · joined ${date(p.joined_at)}</p>
      ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
      ${links.length ? `<p class="links">${links.join(' · ')}</p>` : ''}
    </div>
  </div>
  ${recordStats(p.record ?? {})}
  <h2>Entries</h2>
  ${solutionsTable(p.solutions ?? [])}
  ${payoutsTable(p.payouts ?? [])}`;
  return `${name} | make.fun profiles`;
}

/** Render the global rankings into root; returns the page title. */
export async function showRankings(root, order) {
  const data = await getRankings(order);
  const items = data.items ?? [];
  root.innerHTML = `<h1 tabindex="-1">Rankings</h1>
  <p class="lede">Accounts ranked by ${order === 'paid' ? 'prize money paid out' : 'competitions won'} — top ${num(items.length)} of ${num(data.total)}.</p>
  <p class="views" role="group" aria-label="Rank by">
    <a href="#/rankings?order=wins"${order !== 'paid' ? ' aria-current="true"' : ''}>Most wins</a>
    <a href="#/rankings?order=paid"${order === 'paid' ? ' aria-current="true"' : ''}>Most paid</a>
  </p>
  <table class="rankings">
    <thead><tr><th scope="col">Rank</th><th scope="col">Account</th><th scope="col">Entered</th><th scope="col">Placed</th><th scope="col">Won</th><th scope="col">Prize money</th></tr></thead>
    <tbody>${items
      .map(
        (a) => `<tr>
      <td data-label="Rank" class="num">${num(a.rank)}</td>
      <td data-label="Account"><a href="#/u/${encodeURIComponent(a.handle)}">@${esc(a.handle)}</a>${a.display_name ? ` <span class="muted">${esc(a.display_name)}</span>` : ''}</td>
      <td data-label="Entered" class="num">${num(a.record.competitions_entered)}</td>
      <td data-label="Placed" class="num">${num(a.record.competitions_placed)}</td>
      <td data-label="Won" class="num">${num(a.record.competitions_won)}</td>
      <td data-label="Prize money" class="num pot">${money(a.record.prize_usd)}</td>
    </tr>`,
      )
      .join('')}</tbody>
  </table>`;
  return 'Rankings';
}
