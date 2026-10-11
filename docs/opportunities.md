# Opportunities archive and manual sync

- Supabase: opportunities.items (source + external_id unique), opportunities.sync_history (last successful run).
- API GET /owner/opportunities/feed?source=support|events|bids&q=&skill=&sort=recent|oldest|title&page=1 reads from DB only. Returns 20 records per page and total count.
- API POST /owner/opportunities/sync?source=support|events|bids requires owner login, retrieves just the selected upstream source, and UPSERTs records. No background cron or automatic upstream fetch during page view.
- Server DB connection: OPPORTUNITIES_DATABASE_URL or existing BOOKMARKS_DATABASE_URL, role mushi_core_api with limited opportunities schema privileges.
- React /opportunities has search, skill tags, sort, pagination and manual sync with last successful time.
- Data source constraints: Nara service currently collects last 48h, first 100 listings, title-matched developer/IT only. Increase page coverage in a later iteration.
- Stored records persist across application restart; no deletion of old items during sync.
