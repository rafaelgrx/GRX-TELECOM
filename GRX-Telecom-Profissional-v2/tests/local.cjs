const path=require('path');const ROOT=path.resolve(__dirname,'..');const WORK=path.join(ROOT,'.test-output');require('fs').mkdirSync(WORK,{recursive:true});
const {chromium,firefox,webkit}=require('playwright');
const fs=require('fs');const assert=require('assert');
const report={app:'GRX 2.0',tests:[],limitations:['Sem projeto Supabase real; testes de API usam simulação quando indicados.','Navegadores automatizados não substituem testes em aparelhos físicos. WebKit encerrou ao iniciar neste ambiente e não foi validado.']};
function ok(name,detail=''){report.tests.push({name,status:'PASS',detail});console.log('PASS',name,detail);}
(async()=>{
for(const [engine,viewport] of [[chromium,{width:1440,height:1000}],[chromium,{width:390,height:844}],[firefox,{width:1366,height:900}]]){
 const browser=await engine.launch({headless:true});const context=await browser.newContext({viewport,acceptDownloads:true});const page=await context.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('http://localhost:8765/');await page.waitForSelector('#loginView:not([hidden])');const tag=engine.name()+' '+viewport.width;
 assert(await page.locator('details.first').getAttribute('open')!==null);await page.fill('#newPass','Grx-Teste-2026');await page.fill('#newPass2','Grx-Teste-2026');await page.click('#setPassForm button');await page.waitForFunction(()=>document.querySelector('details.first').hidden);ok(tag+' criar administrador');
 await page.fill('#loginEmail','rafael@grxtelecom.com.br');await page.fill('#loginPass','incorreta');await page.click('#loginBtn');await page.waitForSelector('#loginErr:not([hidden])');assert((await page.locator('#app').getAttribute('hidden'))!==null);ok(tag+' rejeitar senha incorreta');
 await page.fill('#loginPass','Grx-Teste-2026');await page.click('#loginBtn');await page.waitForSelector('#app:not([hidden])');ok(tag+' login correto');
 const options=await page.locator('#mVeiculo option').allTextContents();await page.selectOption('#mVeiculo',{label:options[1]});await page.fill('#mKm','123.456');await page.fill('#mValor','1.234,56');await page.click('[data-item="Combustível"]');await page.fill('#mObs','<script>alert(1)</script> teste seguro');await page.click('#mSave');await page.waitForSelector('#mList .rec');
 let records=await page.evaluate(()=>JSON.parse(localStorage.grx_regs));assert.strictEqual(records[0].valor,1234.56);assert.strictEqual(records[0].km,123456);assert((await page.locator('#mList').textContent()).includes('<script>'));ok(tag+' manutenção: valor, KM e XSS escapado');
 await page.click('#mList [data-edit]');await page.fill('#mValor','1.500,50');await page.click('#mSave');await page.waitForFunction(()=>JSON.parse(localStorage.grx_regs)[0].valor===1500.5);assert.strictEqual((await page.locator('#mList .rec').count()),1);ok(tag+' editar sem duplicar');
 await page.fill('#mKm','123,5');await page.fill('#mObs','Teste inválido');await page.click('#mSave');assert.strictEqual(await page.locator('#mList .rec').count(),1);ok(tag+' KM inválido recusado');await page.fill('#mKm','');await page.fill('#mObs','');
 await page.click('[data-nav="alim"]');await page.fill('#aValor','1e3');await page.click('#aSave');assert.strictEqual(await page.locator('#aList .rec').count(),0);await page.fill('#aValor','25,90');await page.fill('#aObs','Almoço na estrada');await page.click('#aSave');await page.waitForSelector('#aList .rec');ok(tag+' alimentação e valor inválido recusado');
 await page.click('[data-nav="cons"]');await page.fill('#cDe','2099-01-01');await page.locator('#cDe').dispatchEvent('change');assert((await page.locator('#cResumo').innerText()).startsWith('0 lançamentos'));await page.click('#cLimpar');assert((await page.locator('#cResumo').innerText()).startsWith('2 lançamentos'));ok(tag+' consulta e período');
 const csvEvent=page.waitForEvent('download');await page.click('[data-act="excel"]');const csv=await csvEvent;const csvPath=await csv.path();const content=fs.readFileSync(csvPath,'utf8');assert(content.includes('Veículo;Categoria / serviços;KM'));assert(content.includes('123456'));ok(tag+' CSV com veículo, KM e valor');
 await page.click('[data-nav="cad"]');const downloadEvent=page.waitForEvent('download');await page.click('#expBtn');const download=await downloadEvent;const data=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert(data.regs.length===2);assert(!JSON.stringify(data).includes('passHash'));ok(tag+' backup sem hashes de senha');
 fs.writeFileSync(path.join(WORK,'backup-test.json'),JSON.stringify(data));await page.setInputFiles('#impFile',path.join(WORK,'backup-test.json'));await page.waitForFunction(()=>document.querySelector('#toastTxt').textContent.includes('restaurado'));assert((await page.evaluate(()=>JSON.parse(localStorage.grx_cfg).users[0].passHash)).startsWith('pbkdf2$'));ok(tag+' importar preserva conta');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow);ok(tag+' sem rolagem horizontal');
 await page.screenshot({path:(WORK+path.sep)+tag.replaceAll(' ','-')+'-cad.png',fullPage:true});await page.click('[data-nav="manut"]');await page.screenshot({path:(WORK+path.sep)+tag.replaceAll(' ','-')+'.png',fullPage:true});
 await page.reload();await page.waitForSelector('#app:not([hidden])');assert(await page.locator('#mList .rec').count()===1);ok(tag+' persistência após recarregar');
 await page.click('#mList [data-del]');await page.click('#mList [data-del]');await page.waitForFunction(()=>JSON.parse(localStorage.grx_regs).length===1);ok(tag+' exclusão confirmada');
 await page.click('#logoffTop');await page.waitForSelector('#loginView:not([hidden])');assert(await page.locator('details.first').getAttribute('hidden')!==null);ok(tag+' logout e bloqueio de redefinição');
 assert.deepStrictEqual(errors,[]);ok(tag+' sem exceções JavaScript');
 await context.close();await browser.close();
}
fs.writeFileSync(path.join(WORK,'report.json'),JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(WORK,'report.json'),JSON.stringify({...report,error:String(e)},null,2));process.exit(1)});
