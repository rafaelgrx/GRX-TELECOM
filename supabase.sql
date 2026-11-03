-- GRX 2.0 — esquema seguro para uma equipe/projeto Supabase.
-- Este arquivo é compartilhado para execução manual pelo administrador no SQL Editor.
-- Faça backup e revise os impactos indicados no guia antes de executar em projeto existente.
-- NUNCA publique service_role, secret key ou senha do banco no navegador.
begin;
create table if not exists public.grx_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null unique check (email = lower(email)),
 admin boolean not null default false,
 active boolean not null default true
);
alter table public.grx_members enable row level security;
revoke all on public.grx_members from anon, authenticated;
grant select on public.grx_members to authenticated;
create or replace function public.grx_is_member() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.grx_members where user_id=(select auth.uid()) and active);
$$;
create or replace function public.grx_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.grx_members where user_id=(select auth.uid()) and active and admin);
$$;
revoke all on function public.grx_is_member() from public;
revoke all on function public.grx_is_admin() from public;
grant execute on function public.grx_is_member() to authenticated;
grant execute on function public.grx_is_admin() to authenticated;
drop policy if exists grx_members_read on public.grx_members;
create policy grx_members_read on public.grx_members for select to authenticated using (public.grx_is_member());
create table if not exists public.grx_regs_v2 (
 id text primary key check(id ~ '^[a-zA-Z0-9_-]{1,120}$'),
 tipo text not null check(tipo in ('manut','alim')),
 quando text not null check(quando ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}'),
 cidade text not null default '' check(length(cidade)<=160),
 pagamento text not null default '' check(length(pagamento)<=160),
 valor numeric(14,2) not null check(valor>=0 and valor<=999999999.99),
 obs text not null default '' check(length(obs)<=4000),
 usuario text not null,
 criado bigint not null,
 foto_path text,
 veiculo text check(length(veiculo)<=160),
 km bigint not null default 0 check(km>=0 and km<=999999999),
 itens jsonb not null default '[]'::jsonb check(jsonb_typeof(itens)='array'),
 cat text check(cat in ('lanche','almoco','viagem','outros')),
 deleted boolean not null default false,
 revision bigint not null default 1
);
alter table public.grx_regs_v2 enable row level security;
revoke all on public.grx_regs_v2 from anon, authenticated;
grant select, insert, update on public.grx_regs_v2 to authenticated;
create index if not exists grx_regs_v2_quando on public.grx_regs_v2(quando desc);
create or replace function public.grx_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
 if TG_OP='INSERT' then NEW.revision=1;
 else
  if NEW.id <> OLD.id or NEW.usuario <> OLD.usuario or NEW.criado <> OLD.criado then
   raise exception 'Identidade e autoria do registro sao imutaveis';
  end if;
  NEW.revision=OLD.revision+1;
 end if;
 return NEW;
end;
$$;
drop trigger if exists grx_revision on public.grx_regs_v2;
create trigger grx_revision before insert or update on public.grx_regs_v2 for each row execute function public.grx_revision();
drop policy if exists grx_regs_read on public.grx_regs_v2;
create policy grx_regs_read on public.grx_regs_v2 for select to authenticated using(public.grx_is_member());
drop policy if exists grx_regs_insert on public.grx_regs_v2;
create policy grx_regs_insert on public.grx_regs_v2 for insert to authenticated
 with check(public.grx_is_member() and (usuario=lower((select auth.jwt())->>'email') or public.grx_is_admin()));
drop policy if exists grx_regs_update on public.grx_regs_v2;
create policy grx_regs_update on public.grx_regs_v2 for update to authenticated
 using(public.grx_is_member() and (usuario=lower((select auth.jwt())->>'email') or public.grx_is_admin()))
 with check(public.grx_is_member() and (usuario=lower((select auth.jwt())->>'email') or public.grx_is_admin()));
-- No DELETE grant: tombstones propagate exclusions without resurrection.
create table if not exists public.grx_config_v2 (
 id text primary key check(id='listas'),
 data jsonb not null check(jsonb_typeof(data)='object'),
 updated bigint not null
);
alter table public.grx_config_v2 enable row level security;
revoke all on public.grx_config_v2 from anon, authenticated;
grant select, insert, update on public.grx_config_v2 to authenticated;
drop policy if exists grx_config_read on public.grx_config_v2;
create policy grx_config_read on public.grx_config_v2 for select to authenticated using(public.grx_is_member());
drop policy if exists grx_config_insert on public.grx_config_v2;
create policy grx_config_insert on public.grx_config_v2 for insert to authenticated with check(public.grx_is_admin());
drop policy if exists grx_config_update on public.grx_config_v2;
create policy grx_config_update on public.grx_config_v2 for update to authenticated using(public.grx_is_admin()) with check(public.grx_is_admin());
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 values ('grx-comprovantes-v2','grx-comprovantes-v2',false,6000000,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=false,file_size_limit=6000000,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists grx_v2_photo_read on storage.objects;
create policy grx_v2_photo_read on storage.objects for select to authenticated
 using(bucket_id='grx-comprovantes-v2' and public.grx_is_member());
drop policy if exists grx_v2_photo_insert on storage.objects;
create policy grx_v2_photo_insert on storage.objects for insert to authenticated
 with check(bucket_id='grx-comprovantes-v2' and public.grx_is_member() and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists grx_v2_photo_update on storage.objects;
create policy grx_v2_photo_update on storage.objects for update to authenticated
 using(bucket_id='grx-comprovantes-v2' and public.grx_is_member() and (storage.foldername(name))[1]=(select auth.uid())::text)
 with check(bucket_id='grx-comprovantes-v2' and public.grx_is_member() and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Restrictive guards prevent previous broad permissive policies from opening GRX buckets.
drop policy if exists grx_guard_anon on storage.objects;
create policy grx_guard_anon on storage.objects as restrictive for all to anon
 using(bucket_id not in ('grx-comprovantes','grx-comprovantes-v2'))
 with check(bucket_id not in ('grx-comprovantes','grx-comprovantes-v2'));
drop policy if exists grx_guard_auth on storage.objects;
create policy grx_guard_auth on storage.objects as restrictive for select to authenticated
 using(bucket_id not in ('grx-comprovantes','grx-comprovantes-v2') or public.grx_is_member());
drop policy if exists grx_guard_auth_insert on storage.objects;
create policy grx_guard_auth_insert on storage.objects as restrictive for insert to authenticated
 with check(bucket_id not in ('grx-comprovantes','grx-comprovantes-v2') or (public.grx_is_member() and (storage.foldername(name))[1]=(select auth.uid())::text));
drop policy if exists grx_guard_auth_update on storage.objects;
create policy grx_guard_auth_update on storage.objects as restrictive for update to authenticated
 using(bucket_id not in ('grx-comprovantes','grx-comprovantes-v2') or (public.grx_is_member() and (storage.foldername(name))[1]=(select auth.uid())::text))
 with check(bucket_id not in ('grx-comprovantes','grx-comprovantes-v2') or (public.grx_is_member() and (storage.foldername(name))[1]=(select auth.uid())::text));
drop policy if exists grx_guard_auth_delete on storage.objects;
create policy grx_guard_auth_delete on storage.objects as restrictive for delete to authenticated
 using(bucket_id not in ('grx-comprovantes','grx-comprovantes-v2'));
-- Contain legacy public tables without deleting their contents. The old app will lose API access.
do $$
begin
 if to_regclass('public.grx_regs') is not null then execute 'revoke all on public.grx_regs from anon, authenticated'; end if;
 if to_regclass('public.grx_config') is not null then execute 'revoke all on public.grx_config from anon, authenticated'; end if;
end $$;
update storage.buckets set public=false where id='grx-comprovantes';

-- Reclassifica viagens em novas gravações, inclusive de clientes antigos.
create or replace function public.grx_normalize_category() returns trigger
language plpgsql set search_path = '' as $$
begin
 if NEW.tipo = 'alim' and NEW.cat = 'viagem' then
  NEW.tipo = 'manut';
  if not (NEW.itens @> '["Viagem"]'::jsonb) then
   NEW.itens = NEW.itens || '["Viagem"]'::jsonb;
  end if;
 end if;
 if NEW.tipo = 'manut' then NEW.cat = null; end if;
 return NEW;
end;
$$;
drop trigger if exists grx_normalize_category on public.grx_regs_v2;
create trigger grx_normalize_category before insert or update on public.grx_regs_v2
 for each row execute function public.grx_normalize_category();

commit;

-- AFTER creating a user via Authentication > Users (email confirmed), authorize manually:
-- insert into public.grx_members(user_id,email,admin)
-- select id,lower(email),true from auth.users where lower(email)='rafael@grxtelecom.com.br'
-- on conflict(user_id) do update set email=excluded.email,admin=true,active=true;
-- For each collaborator, repeat with their email and admin=false.
-- Disable self-signups in Auth. Never let a browser grant membership/admin.
