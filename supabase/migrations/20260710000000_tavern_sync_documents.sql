create table if not exists public.tavern_sync_documents (
  scope text not null,
  document_key text not null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by text not null default '',
  payload jsonb not null default '{}'::jsonb,
  constraint tavern_sync_documents_pkey primary key (scope, document_key),
  constraint tavern_sync_documents_scope_check check (scope in ('published', 'settings', 'user'))
);

create index if not exists tavern_sync_documents_updated_at_idx
  on public.tavern_sync_documents (updated_at desc);

alter table public.tavern_sync_documents enable row level security;

revoke all on table public.tavern_sync_documents from anon;
revoke all on table public.tavern_sync_documents from authenticated;

comment on table public.tavern_sync_documents is
  'Tavern Cook Book shared app state. Stores JSON metadata only; image files remain in Google Drive and are referenced by Drive IDs/links.';

comment on column public.tavern_sync_documents.scope is
  'Sync document family: published shared cookbook, settings, or per-user draft.';

comment on column public.tavern_sync_documents.document_key is
  'team for shared documents, normalized email for user drafts.';
