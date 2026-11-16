// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Every answer is cached in memory for 60 seconds and revalidated with the
// ETag the API sends (If-None-Match; a 304 reuses the stored body). In-flight
// requests for the same path share one fetch, and a failed fetch falls back to
// the last good answer when one exists, so the app keeps working offline.

const API = 'https://make.fun/api';
const TTL_MS = 60_000;

/** path -> { etag, body, at } */
const cache = new Map();
/** path -> in-flight Promise */
const inflight = new Map();
/** paths currently served from a stale answer after a failed fetch */
const stale = new Set();

/** True when the last answer for this path came from a stale cache entry. */
export function servedStale(path) {
  return stale.has(path);
}

async function fetchJson(path) {
  const hit = cache.get(path);
  const headers = {};
  if (hit?.etag) headers['If-None-Match'] = hit.etag;
  let res;
  try {
    res = await fetch(API + path, { headers });
  } catch {
    // Offline or unreachable: serve the last good answer, if any.
    if (hit) {
      stale.add(path);
      return hit.body;
    }
    throw new Error('make.fun is unreachable — check your connection and retry.');
  }
  if (res.status === 304 && hit) {
    hit.at = Date.now();
    stale.delete(path);
    return hit.body;
  }
  if (!res.ok) {
    if (hit) {
      stale.add(path);
      return hit.body;
    }
    throw new Error(`make.fun returned ${res.status} for ${path}`);
  }
  const body = await res.json();
  cache.set(path, { etag: res.headers.get('ETag'), body, at: Date.now() });
  stale.delete(path);
  return body;
}

export function get(path) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.body);
  if (!inflight.has(path)) {
    inflight.set(
      path,
      fetchJson(path).finally(() => inflight.delete(path)),
    );
  }
  return inflight.get(path);
}

/** Warm the cache for a page the visitor is about to open. */
export function prefetch(path) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return;
  get(path).catch(() => {});
}

/** The board: open bounties, activity=times leaves out the activity a board does not show. */
export const getBounties = () => get('/competitions?status=open&activity=times');

/** One bounty, by its slug. submissions=summary keeps the entry list out: 99 KB instead of 2.3 MB. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}?submissions=summary`);

/** A bounty's leaderboard, in one view (overall, performance, cost or efficiency). */
export const getLeaderboard = (slug, view) =>
  get(`/competitions/${encodeURIComponent(slug)}/leaderboard${view ? `?view=${view}` : ''}`);

/** An account's public profile, by its handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);

/** The global rankings, by wins or by prize money paid. */
export const getRankings = (order) => get(`/rankings?order=${order}&limit=50`);
