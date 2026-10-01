-- Run once in the Supabase SQL Editor to enable private donation receipt PDFs.

alter table public.user_feedback
  add column if not exists attachment_path text;

alter table public.user_feedback
  add column if not exists feedback_type text not null default 'platform';

alter table public.user_feedback
  add column if not exists donation_status text;

alter table public.user_feedback
  add column if not exists donation_validated_at timestamptz;

update public.user_feedback
set feedback_type = 'donation'
where feedback_type = 'platform'
  and message ilike 'Confirmação de doação voluntária%';

update public.user_feedback
set donation_status = 'pending'
where feedback_type = 'donation'
  and donation_status is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_feedback'::regclass
      and conname = 'user_feedback_feedback_type_check'
  ) then
    alter table public.user_feedback
      add constraint user_feedback_feedback_type_check
      check (feedback_type in ('platform', 'donation'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_feedback'::regclass
      and conname = 'user_feedback_donation_status_check'
  ) then
    alter table public.user_feedback
      add constraint user_feedback_donation_status_check
      check (donation_status is null or donation_status in ('pending', 'confirmed'));
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'donation-receipts',
  'donation-receipts',
  false,
  5242880,
  array['application/pdf']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['application/pdf']::text[];

drop policy if exists "Users upload own donation receipts" on storage.objects;
create policy "Users upload own donation receipts"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'donation-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own donation receipts" on storage.objects;
create policy "Users delete own donation receipts"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'donation-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users and admins read donation receipts" on storage.objects;
create policy "Users and admins read donation receipts"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'donation-receipts'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'superadmin')
      )
    )
  );

drop policy if exists "Admins delete donation receipts" on storage.objects;
create policy "Admins delete donation receipts"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'donation-receipts'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'superadmin')
    )
  );

drop policy if exists "Admins read user feedback" on public.user_feedback;
create policy "Admins read user feedback"
  on public.user_feedback
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'superadmin')
    )
  );

drop policy if exists "Admins update user feedback" on public.user_feedback;
create policy "Admins update user feedback"
  on public.user_feedback
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'superadmin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'superadmin')
    )
  );

drop policy if exists "Admins delete user feedback" on public.user_feedback;
create policy "Admins delete user feedback"
  on public.user_feedback
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'superadmin')
    )
  );