create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 3 and 2000),
  created_at timestamptz not null default now()
);

alter table public.user_feedback enable row level security;

drop policy if exists "Users can submit own feedback" on public.user_feedback;
create policy "Users can submit own feedback"
  on public.user_feedback
  for insert
  to authenticated
  with check (auth.uid() = student_id);

drop policy if exists "Users can read own feedback" on public.user_feedback;
create policy "Users can read own feedback"
  on public.user_feedback
  for select
  to authenticated
  using (auth.uid() = student_id);