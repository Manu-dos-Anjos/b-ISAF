-- Run once in the Supabase SQL Editor before publishing events with these fields.
alter table public.events
  add column if not exists registration_label text,
  add column if not exists registration_start date,
  add column if not exists registration_end date,
  add column if not exists media jsonb not null default '[]'::jsonb;-- Run once in the Supabase SQL Editor to support event registration periods and multiple media files.

alter table public.events
  add column if not exists registration_label text,
  add column if not exists registration_start date,
  add column if not exists registration_end date,
  add column if not exists media jsonb not null default '[]'::jsonb;