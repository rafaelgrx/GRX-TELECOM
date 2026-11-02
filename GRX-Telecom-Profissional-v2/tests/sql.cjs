const path=require('path');const ROOT=path.resolve(__dirname,'..');const WORK=path.join(ROOT,'.test-output');require('fs').mkdirSync(WORK,{recursive:true});
const {PGlite}=require('@electric-sql/pglite');const fs=require('fs');const assert=require('assert');
(async()=>{const db=new PGlite();let tests=[];function ok(n){tests.push({name:n,status:'PASS'});console.log('PASS',n);}
await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('email',current_setting('request.jwt.claim.email',true))$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
grant usage on schema public,auth,storage to anon,authenticated;
grant select,insert,update,delete on storage.objects to anon,authenticated;
grant execute on function auth.uid(),auth.jwt(),storage.foldername(text) to anon,authenticated;
create policy old_open on storage.objects for all to anon,authenticated using(true) with check(true);`);
const sql=fs.readFileSync(path.join(ROOT,'supabase.sql'),'utf8');await db.exec(sql);ok('SQL completo executa em PostgreSQL WASM (schemas Supabase simulados)');await db.exec(sql);ok('SQL pode ser reaplicado sem duplicar estruturas');
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333';
await db.exec(`insert into auth.users values('${a}','rafael@grxtelecom.com.br'),('${b}','equipe@grxtelecom.com.br'),('${c}','outsider@test.com');insert into public.grx_members values('${a}','rafael@grxtelecom.com.br',true,true),('${b}','equipe@grxtelecom.com.br',false,true);`);
async function as(uid,email){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${uid}',false);select set_config('request.jwt.claim.email','${email}',false);set role authenticated;`);}
async function denied(query,n){let failed=false;try{await db.exec(query);}catch(e){failed=true;}assert(failed,n);ok(n);}
await as(b,'equipe@grxtelecom.com.br');await db.exec(`insert into public.grx_regs_v2(id,tipo,quando,valor,usuario,criado) values('l1','alim','2026-11-02T14:00',10,'equipe@grxtelecom.com.br',1);`);ok('Membro grava autoria própria');
await denied(`insert into public.grx_regs_v2(id,tipo,quando,valor,usuario,criado) values('l2','alim','2026-11-02T14:00',10,'rafael@grxtelecom.com.br',1);`,'Membro não falsifica autoria');
await denied(`update public.grx_members set admin=true where user_id='${b}'`,'Cliente não concede privilégios admin');
await denied(`insert into public.grx_config_v2 values('listas','{}',1)`,'Cadastros compartilhados restritos a admin');
await db.exec(`insert into storage.objects(bucket_id,name) values('grx-comprovantes-v2','${b}/l1.jpg');`);ok('Upload no diretório próprio');
await denied(`insert into storage.objects(bucket_id,name) values('grx-comprovantes-v2','${a}/l1.jpg')`,'Upload em diretório alheio bloqueado mesmo com política antiga aberta');
await as(a,'rafael@grxtelecom.com.br');let r=await db.query(`update public.grx_regs_v2 set valor=20 where id='l1' and revision=1 returning revision`);assert(r.rows[0].revision===2);ok('Revisão incremental no servidor');r=await db.query(`update public.grx_regs_v2 set valor=30 where id='l1' and revision=1 returning revision`);assert(r.rows.length===0);ok('Atualização com versão antiga não sobrescreve');
await db.exec(`update public.grx_regs_v2 set deleted=true where id='l1';`);r=await db.query(`select deleted from public.grx_regs_v2 where id='l1'`);assert(r.rows[0].deleted);ok('Exclusão lógica mantém marcador propagável');
await denied(`delete from public.grx_regs_v2 where id='l1'`,'Exclusão física bloqueada ao cliente');
await as(c,'outsider@test.com');r=await db.query('select * from public.grx_regs_v2');assert(r.rows.length===0);r=await db.query('select * from storage.objects');assert(r.rows.length===0);ok('Usuário autenticado sem associação não lê dados nem fotos');
await db.exec('reset role;set role anon;');await denied('select * from public.grx_regs_v2','Anônimo sem acesso às tabelas');r=await db.query('select * from storage.objects');assert(r.rows.length===0);ok('Anônimo sem acesso aos comprovantes apesar da política antiga aberta');
await db.exec('reset role;');r=await db.query(`select public from storage.buckets where id='grx-comprovantes-v2'`);assert(r.rows[0].public===false);ok('Bucket privado');
fs.writeFileSync(path.join(WORK,'report-sql.json'),JSON.stringify({environment:'PGlite PostgreSQL WASM; schemas auth/storage simulados; não é um projeto Supabase real',tests},null,2));await db.close();})().catch(e=>{console.error(e);process.exit(1)});
