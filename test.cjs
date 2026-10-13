const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('İstek Noktası.html','utf8');
let js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements={},listeners={},timers=[];
const document={getElementById(id){return elements[id]??={innerHTML:'',attributes:{},addEventListener(){},setAttribute(k,v){this.attributes[k]=v;},classList:{toggle(){}},style:{}};},addEventListener(type,fn){listeners[type]=fn;},documentElement:{setAttribute(){}}};
js=js.replace('  S=initial(); renderAll();','  S=initial(); sharedLocationActive=function(){return false;};renderAll(); globalThis.test={get state(){return S;},reset(){S=initial();renderAll();},initial,nextCode,kioskCreate,kioskNotify,kioskPair,clearSession,renderAll,touch,parseLocation,tr,PRODUCTS,STORE_PLAN,I18N};');
const context={document,console,setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},setInterval(){}};
vm.runInNewContext(js,context);
const t=context.test;
function click(dataset){listeners.click({target:{closest(){return {dataset};}}});}
function search(ref='2298/047'){click({k:'entry'});listeners.input({target:{id:'product-reference',value:ref,setAttribute(){}}});click({k:'scan'});}
function input(value){listeners.input({target:{id:'contact-phone',value,setAttribute(){}}});}
function request(size){click({size});click({k:'request'});}
function requestDisabled(){return /data-k="request" disabled/.test(elements.kmain.innerHTML);}
assert.equal(t.nextCode('W'),'W-5');assert.equal(t.nextCode('M'),'M-2');assert.equal(t.nextCode('K'),'K-1');
search();assert.ok(requestDisabled());
const initialCount=t.state.reqs.length;
click({size:'XS'});assert.ok(requestDisabled());assert.ok(elements.kmain.innerHTML.includes('Stok yok.'));click({k:'request'});assert.equal(t.state.reqs.length,initialCount);
assert.equal((elements.kmain.innerHTML.match(/<dd>0 adet<\/dd>/g)||[]).length,2,'both zero stock counts must be visible');
for(const [size,type,qty] of [['L','masa',2],['XL','duvar',1],['XXL','askılık',3]]){
  click({size});assert.equal(requestDisabled(),size==='XL');assert.ok(elements.kmain.innerHTML.includes(qty+' adet'));
  click({mapAction:'expand'});assert.ok(elements.kmain.innerHTML.includes(type));assert.ok(elements.kmain.innerHTML.includes('map-fixture active'));
  assert.ok(!elements.kmain.innerHTML.includes('W1T1'));
  if(size==='XL'){assert.ok(elements.kmain.innerHTML.includes('<dd>0 adet</dd>'));click({k:'request'});}
  if(size==='L'){assert.ok(elements.kmain.innerHTML.includes('<dd>2 adet</dd>'));assert.ok(elements.kmain.innerHTML.includes('<dd>4 adet</dd>'));}
  click({mapAction:'close'});assert.equal(t.state.reqs.length,initialCount);
}
click({size:'M'});assert.ok(!requestDisabled());assert.equal(t.state.reqs.length,initialCount,'size selection must not create a request');
click({k:'request'});assert.equal(t.state.k.code,'W-5');
click({k:'add'});search('4387/242');assert.ok(requestDisabled());request('L');assert.equal(t.state.k.code,'M-2');
click({k:'add'});search('1200/001');request('6-7');assert.equal(t.state.k.code,'K-1');
click({k:'add'});search('1200/001');request('8-9');assert.equal(t.state.k.code,'K-2');assert.equal(t.state.k.cart.length,4);
click({k:'notify'});input('123');click({ch:'sms'});assert.equal(t.state.k.mode,'notify');assert.ok(t.state.k.error);
input('٠٥٥٥١٢٣٤٥٦٧');click({lang:'ar'});assert.equal(t.state.k.phone,'٠٥٥٥١٢٣٤٥٦٧');click({ch:'sms'});
assert.equal(t.state.k.mode,'idle');assert.equal(t.state.k.phone,'');assert.equal(t.state.k.cart.length,0);assert.ok(t.state.reqs.slice(-4).every(r=>r.notify==='sms'));
click({lang:'tr'});search();request('L');click({k:'notify'});input('05551234567');t.touch();timers.at(-1)();assert.equal(t.state.k.phone,'');assert.equal(t.state.k.mode,'idle');
t.state.closed=true;search();click({size:'M'});assert.ok(requestDisabled());let count=t.state.reqs.length;click({k:'request'});t.kioskCreate('M');assert.equal(t.state.reqs.length,count);
click({size:'L'});click({mapAction:'expand'});assert.ok(elements.kmain.innerHTML.includes('map-fixture active'),'closed warehouse must not block shop-floor map');t.state.closed=false;
// Inventory moved from the catalogue to the shared allocation model. Simulate a
// concurrent online allocation before submit instead of editing the stale catalogue.
click({size:'M'});const mixed=t.state.ops.item('W:2298/047:M');t.state.ops.reserveOnline(mixed.key,t.state.ops.available(mixed.key),'RACE');click({k:'request'});assert.equal(t.state.reqs.length,count,'recheck stock at submit');
t.state.ops.releaseOnline('RACE');mixed.floor=[{code:'W1C1',qty:1}];click({size:'M'});assert.ok(!requestDisabled());click({mapAction:'expand'});assert.ok(elements.kmain.innerHTML.includes('map-fixture active'));mixed.floor=[];
const large=t.state.ops.item('W:2298/047:L');large.floor=[{code:'W1T9',qty:2}];click({size:'L'});click({mapAction:'expand'});assert.ok(elements.kmain.innerHTML.includes('henüz eşleştirilmemiş'));assert.ok(!elements.kmain.innerHTML.includes('map-fixture active'));large.floor=[{code:'W1T1',qty:2}];
assert.equal(t.parseLocation('w1t1').type,'table');assert.equal(t.parseLocation('W2W3').type,'wall');assert.equal(t.parseLocation('K12C14').number,14);assert.equal(t.parseLocation('bad'),null);assert.equal(t.parseLocation('W0T1'),null);
const completeKeys=Object.keys(t.I18N.tr).sort().join(',');
// Scan the existing account QR at the reader; the kiosk never generates a QR.
assert.ok(!html.includes('function qr('));
t.reset();
click({k:'idle'});search();request('M');click({k:'add'});search('4387/242');request('M');
const accountCodes=t.state.k.cart.slice();
t.kioskPair();assert.equal(t.state.k.cart.length,2,'unsolicited reader completion must not pair');
click({k:'pair'});
for(const lang of ['tr','en','ar','ru','es']){
  click({lang});assert.ok(elements.kmain.innerHTML.includes(t.I18N[lang].scanApp));
  assert.ok(elements.kmain.innerHTML.includes('account-reader'));
  assert.ok(!elements.kmain.innerHTML.includes('<svg'),'no generated QR in the reader screen');
  assert.ok(!elements.kmain.innerHTML.includes('data-k="paired"'),'customer cannot confirm an unread QR');
  assert.equal(elements.simulateAccountScan.hidden,false);
}
click({demo:'account-qr'});assert.equal(t.state.k.mode,'idle');assert.equal(elements.simulateAccountScan.hidden,true);
assert.ok(accountCodes.every(code=>t.state.reqs.find(r=>r.code===code).notify==='app'));
search();request('M');click({k:'pair'});t.touch();timers.at(-1)();assert.equal(elements.simulateAccountScan.hidden,true,'timeout must stop the reader simulation');
search();click({size:'L'});click({mapAction:'expand'});
for(const lang of ['tr','en','ar','ru','es']){
  assert.equal(Object.keys(t.I18N[lang]).sort().join(','),completeKeys);
  click({lang});assert.equal(elements.kmain.attributes.lang,lang);assert.equal(elements.kmain.attributes.dir,lang==='ar'?'rtl':'ltr');
  assert.ok(elements.kmain.innerHTML.includes(t.I18N[lang].mapTitle));assert.ok(!elements.kmain.innerHTML.includes('undefined'));
for(const status of ['received','searching','found','tour','ready','delivered','return_pending','returned']){t.state.reqs[0].status=status;t.state.view=t.state.reqs[0].code;t.renderAll();}
  for(const reason of ['sold','online','other','defect','wrong','nf']){t.state.reqs[0].status='cancelled';t.state.reqs[0].reason=reason;t.renderAll();assert.ok(elements.phone.innerHTML.includes(t.I18N[lang]['reason_'+reason]));}
}
click({lang:'tr'});click({k:'idle'});search();request('L');assert.equal(t.state.k.mode,'created','shop-floor availability must not prevent a stockroom request');assert.equal(t.state.reqs.at(-1).size,'L');
t.state.reqs=[];assert.equal(t.nextCode('W'),'W-1');assert.equal(t.nextCode('M'),'M-1');assert.equal(t.nextCode('K'),'K-1');t.state.reqs.push({code:'K-100',status:'cancelled'});assert.equal(t.nextCode('K'),'K-101');
console.log('PASS: stock gating and recheck, floor quantities, table/wall/rail maps, unknown location, mixed inventory, separate submit, basket, notification, timeout, closed warehouse, W/M/K numbering, five languages and RTL.');
