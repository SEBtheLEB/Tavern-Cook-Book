# Supabase Sync Setup

The Tavern Cook Book stores shared app state in Supabase through the app backend.
Images, sprite sheets, and large files stay in Google Drive. Supabase only stores JSON metadata such as characters, quests, art slot records, Drive file IDs, thumbnails, folder links, team access, and settings.

## 1. Create The Table

Run this migration in Supabase SQL Editor, or apply it through Supabase migrations:

`supabase/migrations/20260710000000_tavern_sync_documents.sql`

The table is:

`public.tavern_sync_documents`

It uses these document rows:

- `scope = published`, `document_key = team`: the shared team cookbook.
- `scope = settings`, `document_key = team`: team access/settings.
- `scope = user`, `document_key = <email>`: optional private drafts if live team sync is ever turned off.

## 2. Add Vercel Environment Variables

Add these to the Vercel project for Production, Preview, and Development:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
TAVERN_SUPABASE_SYNC_TABLE=tavern_sync_documents
```

Use the service role key only in Vercel/server environments. Do not expose it as a `VITE_` variable.

## 3. First Load Migration

If the old GitHub sync token is still configured and Supabase is empty, the backend will seed Supabase from the old GitHub sync document on the first successful read.

After Supabase is confirmed working, `TAVERN_SYNC_GITHUB_TOKEN` can stay as a fallback or be removed.

## 4. Health Check

After deployment, check:

```text
https://the-tavern-cook-book.vercel.app/api/sync?scope=health
```

Expected shape:

```json
{
  "ok": true,
  "configured": true,
  "provider": "supabase",
  "table": "tavern_sync_documents"
}
```
