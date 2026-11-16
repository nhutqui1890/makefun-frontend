[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/nhutqui1890/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/nhutqui1890/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

# make.fun frontend — a fast, dependency-free client

An entry for [make.fun/bounty/makefun-frontend-01](https://make.fun/bounty/makefun-frontend-01): a fully working static web client for make.fun, reading its public API alone. No framework, no build step, no third-party code at all — plain HTML, ES modules and CSS.

## Surfaces

- **Board** (`#/`) — every open bounty with its live pot, entry fee, time left and entry count; search, category filter and sorting, all in the browser with no extra request.
- **Bounty page** (`#/bounty/<slug>`) — live pot, entry fee, deadline, rewards table, phases, description, kit link.
- **Leaderboard** (`#/bounty/<slug>/leaderboard`) — ranked entries, 25 to a page, with the competition's own columns and view switcher.
- **Profile** (`#/u/<handle>`) — an account's record, entries, payouts and links.
- **Rankings** (`#/rankings`) — the global rankings by wins or by prize money paid.

Every surface is reachable by a link and by its own URL.

## Performance

- First load is the shell plus five small modules (~25 KB raw, ~10 KB gzipped); the leaderboard and profile views load only when their route opens.
- API answers are cached for 60 seconds and revalidated with ETags (`If-None-Match`, 304 reuses the body); in-flight requests for the same path share one fetch; a failed fetch falls back to the last good answer.
- The bounty page asks for `?submissions=summary`, which cuts its answer from 2.3 MB to ~99 KB.
- Hovering or focusing a bounty link prefetches that bounty, so opening it feels instant.
- Time-left cells tick in place every 30 seconds; filters and paging rebuild only the table body, never the page.

## Accessibility

Skip link, semantic tables with real headers, focus moved to each page's heading on navigation, visible focus rings, `aria-live` status text, and a phone layout where tables become stacked cards (try it at 390 px wide).

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/app, out/screenshots, out/dossier.json
```

`main.ts` copies `app/` and `screenshots/` to the output and writes `dossier.json` with the kit's vendored `vendor/makefun-frontend.ts` library, unchanged.
