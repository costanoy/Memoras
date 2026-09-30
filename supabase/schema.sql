-- Memoras: rode este arquivo no SQL Editor do projeto Supabase.
-- O servidor só guarda texto cifrado. A chave do diário nunca sai do aparelho em claro.

create table if not exists public.vaults (
  user_id uuid primary key references auth.users on delete cascade,
  dk_id text not null,        -- identifica a chave do diário em uso
  wrapped_pw text not null,   -- chave do diário cifrada com a senha
  wrapped_rk text not null,   -- chave do diário cifrada com a chave de recuperação
  prefs text,                 -- nome do diário e cor, cifrados
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id uuid not null,
  data text not null,         -- anotação cifrada (AES-GCM)
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists notes_user_updated on public.notes (user_id, updated_at);

create or replace function public.memoras_touch() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists vaults_touch on public.vaults;
create trigger vaults_touch before update on public.vaults
  for each row execute function public.memoras_touch();

drop trigger if exists notes_touch on public.notes;
create trigger notes_touch before insert or update on public.notes
  for each row execute function public.memoras_touch();

alter table public.vaults enable row level security;
alter table public.notes enable row level security;

drop policy if exists "vault do dono" on public.vaults;
create policy "vault do dono" on public.vaults for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notas do dono" on public.notes;
create policy "notas do dono" on public.notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
