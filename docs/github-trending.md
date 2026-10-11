# GitHub Trending archive

- UI: `/news` (GitHub 트렌딩).
- API: `GET /public/github-trending?date=YYYY-MM-DD` (date optional, defaults to today's `Asia/Seoul` date). No GitHub API key or scheduled job.
- Data: fetch `https://github.com/trending?since=daily` server-side, read the top 5 rows in displayed order, translate repository descriptions using MyMemory (machine translation, not generated summaries).
- Persistent store: Supabase `trending.daily_repositories` with `(trending_date, rank)` primary key and unique `(trending_date, repo_name)`. The migration `create_github_trending_archive` was applied on 2026-10-11.
- Reads: first check saved rows; for today only, if no complete five-row archive exists, fetch/translate/store/re-read. For past dates, show only saved results; never fabricate historical ranking.
- DB access: `TRENDING_DATABASE_URL` optional, defaults to existing `BOOKMARKS_DATABASE_URL` (restricted `mushi_core_api` user). No service-role key in browser. Supabase grants SELECT/INSERT only.
- UX: date navigator, language filter, original-English toggle, prominent #1 feature card + four compact cards. A lightweight CSS-only spotlight hover was adapted from the React Bits Spotlight Card visual concept; no additional dependency.
- Process memory de-duplicates simultaneous fetches. Browser query cache is keyed by date; manual refresh checks saved records again. Changes to the current-day ranking are not captured after first successful collection.
- Failures: API returns 503 if database or GitHub is unavailable; Korean translation can fall back to original English.
- Verification: `pnpm typecheck:api`, `pnpm test:api`, `pnpm build:web`, `pnpm lint:web`. Live local API returned five records on 2026-10-11; Supabase query verified five rows; subsequent request returned `source: archive`.

Other agents' dashboard files have not been modified by this feature.

## Magazine UI / metrics (2026-10-11)
- Fixed-height lead card (340px mobile / 320px desktop) and secondary cards (280px), with line clamps.
- React Bits-inspired animated Border Glow on #1, pointer Spotlight on all cards, star motion, animated relative-star bar, reduced-motion support. No heavy carousel library was added; five editorial cards remain simultaneously visible.
- GitHub REST repository metadata returns total stars and forks during new daily capture, both persisted to Supabase with nullable bigints. Older saved records are not silently substituted with present-day counts; missing metrics on the current date can be filled once on view. The relative-star bar compares the five recorded total-star counts and is not a time series.
- Supabase migrations: add_github_trending_metrics; grant_trending_metrics_backfill.

## News hub refactor
- Route /news now hosts the general News editorial hub; navigation label is 뉴스.
- GitHub Trending resides in apps/web/src/features/news/github-trending-section.tsx, mounted by Feature.tsx; its date navigation, API and Supabase archive are unchanged.
- Future slots are AI & Tech, Releases, and Developer Blogs, explicitly marked 준비 중 until real feeds exist.
- Browser layout has a general magazine masthead and section jump links; no fake news entries or additional scheduled jobs.

## Compact news hub layout
- GitHub TOP 5 is now a horizontally scrollable, snap-aligned preview row of uniform 246px-high cards (max width 325px).
- The shared News masthead and upcoming section placeholders have reduced vertical spacing so additional feeds can be stacked without oversized card walls.
- Repository metrics, date filter, existing Supabase archive and glow/spotlight effects remain.

## Carousel interaction polish
- Mouse pointer dragging now scrolls cards and suppresses link activation after a drag; touch/native scroll and arrow navigation are preserved.
- Removed upward card hover translation that clipped in overflow containers.
- Featured card glow uses an inset masked conic-gradient border rather than rotating an oversized painted layer.
- Metric details have a distinct footer panel; heading and description are line-clamped.

## Library-driven motion carousel
- Replaced custom pointer drag and CSS scroll snap with embla-carousel-react v8 for physics-based swipe, drag and snap.
- Uses the existing motion/react package for staggered entry of cards; respects reduced-motion preferences.
- Arrow controls and position indicators are driven by the Embla selected slide and available scroll bounds. No automatic autoplay or extra network requests.
- Web build and lint passed.
