-- APLICAR MANUALMENTE APENAS APÓS BACKUP. Não é executado pelo aplicativo.
-- Para projeto existente, este script corrige só a classificação; não altera permissões.
begin;

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

-- Reclassificação do histórico (o trigger grx_revision incrementa a revisão).
-- IDs, valores, datas, autoria e caminhos de comprovantes são preservados.
update public.grx_regs_v2
set tipo='manut', cat=null,
 itens=case when itens @> '["Viagem"]'::jsonb then itens else itens || '["Viagem"]'::jsonb end
where tipo='alim' and cat='viagem';
commit;
