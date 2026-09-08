# Shared Supabase runtime

For the shared studio backend, set `TAVERN_SUPABASE_SCHEMA=tavern`, `TAVERN_SUPABASE_URL`, `TAVERN_SUPABASE_PUBLISHABLE_KEY` and `TAVERN_SUPABASE_ACCESS_TOKEN`. The token's `stl_tavern_backend` role can access Tavern documents and the private `tavern-narration` bucket. Do not use the shared project's administrator key.

REST requests select the Tavern schema; Storage requests use its normal API without schema profile headers. Preserve OAuth, session, Speechify, Liveblocks and other existing settings. Copy the document rows and narration files before switching production. Existing public-schema configuration remains supported for rollback. Rotate the scoped token before its expiry.
