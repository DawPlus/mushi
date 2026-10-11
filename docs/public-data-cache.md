# Dashboard Public Data Cache

The owner-only dashboard public-data routes use `apps/api/src/public-data/persistent-cache.ts`.

- PostgreSQL schema/table: `public_data.cache` (`cache_key`, `payload` JSONB, `fetched_at`). Created in Supabase project via `create_public_data_cache` migration.
- Database connection: `PUBLIC_DATA_DATABASE_URL`, falling back to the existing `BOOKMARKS_DATABASE_URL` restricted `mushi_core_api` connection. The app role has only USAGE on the schema and SELECT/INSERT/UPDATE on this table.
- Requests check per-process memory, then persistent Supabase data. Cached data returns immediately. Once expired, refresh starts in the background on an incoming request (stale-while-revalidate), with same-process request deduplication. On first visit with no saved value, the API waits for a fetch and saves the result. Failed refresh leaves previously saved data available and retries are throttled to once per five minutes per process.
- Weather, air quality: one-hour age limit. Customs USD FX and KOSPI: 24-hour age limit. These are age-based freshness thresholds, not clock-bound scheduled jobs. There is no cron or automatic collection without visits.
- Existing weather and air-quality browser-level Open-Meteo fallback remains unchanged. No UI changes were made.
- The controller requires owner authorization before accessing cached data, including stale data.
- Verified: API typecheck, API tests 126/126, web build. DB permissions verified using Supabase SQL; live external API freshness was not individually checked.
