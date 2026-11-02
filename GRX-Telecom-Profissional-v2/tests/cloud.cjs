const path=require('path');const ROOT=path.resolve(__dirname,'..');const WORK=path.join(ROOT,'.test-output');require('fs').mkdirSync(WORK,{recursive:true});
const {chromium}=require('playwright');const fs=require('fs'),assert=require('assert');
(async()=>{const tests=[];const ok=n=>{tests.push({name:n,status:'PASS'});console.log('PASS',n);};
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',acceptDownloads:true});const p=await context.newPage();let errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
const uid='11111111-1111-4111-8111-111111111111',email='rafael@grxtelecom.com.br';const user={id:uid,email,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:uid,email,exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),aud:'authenticated',role:'authenticated'})).toString('base64url')+'.mock';
let rows=[],failPhoto=true,uploads=0,failWrite=false;const session={access_token:token,refresh_token:'refresh-token-mock',expires_in:3600,token_type:'bearer',user};
await p.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:`window.GRX_CONFIG={url:'https://grx-test.supabase.co',anonKey:'public-test-key',bucket:'grx-comprovantes-v2',table:'grx_regs_v2',cfgTable:'grx_config_v2',cfgRow:'listas'};`}));
await p.route('https://grx-test.supabase.co/**',async route=>{const req=route.request(),u=new URL(req.url()),path=u.pathname,m=req.method();const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-expose-headers':'Content-Range','content-type':'application/json'};const send=(body,status=200,more={})=>route.fulfill({status,headers:{...headers,...more},body:JSON.stringify(body)});
if(m==='OPTIONS')return send({});
if(path==='/auth/v1/token')return send(session);
if(path==='/auth/v1/user')return send(user);
if(path==='/auth/v1/logout')return send({});
if(path==='/rest/v1/grx_members'){const member={email,admin:true};return send(req.headers()['accept']?.includes('object')?member:[member]);}
if(path==='/rest/v1/grx_config_v2')return send(m==='GET'?[]:{});
if(path==='/rest/v1/grx_regs_v2'){
if(m==='GET'){let list=rows.filter(x=>!u.searchParams.has('id')||u.searchParams.get('id')==='eq.'+x.id);return send(req.headers()['accept']?.includes('object')?(list[0]||null):list,200,{'content-range':`0-${Math.max(0,list.length-1)}/${list.length}`});}
if(failWrite)return send({message:'Falha simulada de gravação',code:'XX000'},503);
const body=JSON.parse(req.postData());if(m==='POST'){let row={...body,revision:1};rows.push(row);return send({revision:1},201);}
if(m==='PATCH'){let row=rows.find(x=>u.searchParams.get('id')==='eq.'+x.id);if(!row||u.searchParams.get('revision')!=='eq.'+row.revision)return send({code:'PGRST116',message:'Conflito'},406);Object.assign(row,body,{revision:row.revision+1});return send({revision:row.revision});}
}
if(path.startsWith('/storage/v1/object/sign/'))return send({signedURL:'/object/sign/grx-comprovantes-v2/mock.jpg?token=mock'});
if(path.startsWith('/storage/v1/object/')&&m==='POST'){uploads++;if(failPhoto)return send({message:'Falha simulada no upload',statusCode:503,error:'Unavailable'},503);return send({Key:'photo'});}
console.log('UNHANDLED',m,path);return send({message:'not found'},404);
});
await p.goto('http://localhost:8765/');await p.waitForSelector('#loginView:not([hidden])');assert(await p.locator('details.first').getAttribute('hidden')!==null);ok('Nuvem não permite criação de admin pelo navegador');
await p.fill('#loginEmail',email);await p.fill('#loginPass','senha-simulada');await p.click('#loginBtn');await p.waitForSelector('#app:not([hidden])');await p.waitForFunction(()=>document.querySelector('#cloudState').textContent==='Nuvem verificada');ok('Login Auth e verificação de membro com SDK real / API simulada');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64');
await p.selectOption('#mVeiculo',{index:1});await p.fill('#mValor','95,50');await p.fill('#mKm','123.456');await p.click('[data-item="Combustível"]');await p.setInputFiles('#mFoto',{name:'foto.png',mimeType:'image/png',buffer:png});await p.waitForSelector('#mPrev:not([hidden])');await p.click('#mSave');await p.waitForFunction(()=>JSON.parse(Object.keys(localStorage).filter(k=>k.startsWith('grx_cloud_regs_')).map(k=>localStorage[k])[0]).length===1);await p.waitForTimeout(1500);
const local=()=>p.evaluate(()=>JSON.parse(localStorage[Object.keys(localStorage).find(k=>k.startsWith('grx_cloud_regs_'))]));let records=await local();assert(records[0].pend===true);assert(rows.length===0);assert(uploads>0);ok('Upload falho mantém foto e registro pendentes sem falso envio');
await p.reload();await p.waitForSelector('#app:not([hidden])');await p.waitForTimeout(1500);records=await local();assert(records[0].pend);assert(records[0].fotoId);ok('Fila e comprovante sobrevivem a recarga');
failPhoto=false;await p.click('[data-nav="cad"]');await p.click('#syncBtn');await p.waitForFunction(()=>JSON.parse(localStorage[Object.keys(localStorage).find(k=>k.startsWith('grx_cloud_regs_'))])[0].pend===false);records=await local();assert(records[0].fotoPath);assert(rows.length===1);assert(rows[0].foto_path===records[0].fotoPath);await p.waitForFunction(()=>!document.querySelector('#syncBtn').disabled);ok('Retentativa envia foto antes do registro e confirma revisão');
await p.click('[data-nav="manut"]');await p.click('#mList [data-edit]');await p.fill('#mValor','100,50');await p.click('#mSave');await p.waitForFunction(()=>JSON.parse(localStorage[Object.keys(localStorage).find(k=>k.startsWith('grx_cloud_regs_'))])[0].revision===2);await p.waitForFunction(()=>!document.querySelector('#syncBtn').disabled);assert(rows[0].valor===100.5);ok('Edição sincronizada com revisão otimista');
// force a server-side change and verify stale edits cannot silently overwrite.
rows[0].revision++;rows[0].valor=200;await p.click('#mList [data-edit]');await p.fill('#mValor','110,00');await p.click('#mSave');await p.waitForTimeout(1500);records=await local();assert(records[0].pend);assert(rows[0].valor===200);ok('Conflito preserva pendência local sem sobrescrever servidor');
// restore matching revision for next deletion test.
await p.click('#mList [data-resolve]');await p.waitForSelector('#conflictDialog[open]');assert((await p.locator('#conflictCompare').textContent()).includes('200,00'));await p.click('#conflictLocal');await p.waitForFunction(()=>JSON.parse(localStorage[Object.keys(localStorage).find(k=>k.startsWith('grx_cloud_regs_'))])[0].pend===false);await p.waitForFunction(()=>!document.querySelector('#syncBtn').disabled);assert(rows[0].valor===110);ok('Resolver conflito explicitamente pela interface');
await p.click('[data-nav="manut"]');await p.click('#mList [data-del]');await p.click('#mList [data-del]');await p.waitForFunction(()=>JSON.parse(localStorage[Object.keys(localStorage).find(k=>k.startsWith('grx_cloud_regs_'))])[0].deleted&&JSON.parse(localStorage[Object.keys(localStorage).find(k=>k.startsWith('grx_cloud_regs_'))])[0].pend===false);assert(rows[0].deleted);ok('Exclusão lógica enviada e não ressuscita na leitura');
await p.reload();await p.waitForSelector('#app:not([hidden])');await p.waitForTimeout(1000);assert(await p.locator('#mList .rec').count()===0);ok('Recarregar não restaura registro excluído');
assert.deepStrictEqual(errors,[]);ok('Sem exceções JavaScript nos testes da nuvem simulada');fs.writeFileSync(path.join(WORK,'report-cloud.json'),JSON.stringify({environment:'SDK Supabase 2.57.4 real com respostas HTTP simuladas; sem credenciais de produção',tests},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
