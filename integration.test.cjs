const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
function boot(){
  let js=fs.readFileSync('İstek Noktası.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const elements={},listeners={},timers=[],intervals=[];
  const document={getElementById(id){return elements[id]??={innerHTML:'',attributes:{},addEventListener(type,fn){this[type]=fn;},setAttribute(k,v){this.attributes[k]=v;},classList:{toggle(){}},style:{}};},addEventListener(type,fn){(listeners[type]??=[]).push(fn);},documentElement:{setAttribute(){}}};
  js=js.replace('  S=initial(); renderAll();','  S=initial(); renderAll(); globalThis.test={get state(){return S;},req,initial,kioskCreate,renderAll,renderPick,parseLocation,tr,PRODUCTS,STORE_PLAN,I18N,touch};');
  const context={document,console,setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},setInterval(fn){intervals.push(fn);},clearInterval(){}};
  vm.runInNewContext(js,context);
  return {t:context.test,elements,timers,intervals,search(ref='2298/047'){(listeners.click||[]).forEach(fn=>fn({target:{closest(){return {dataset:{k:'entry'}};}}}));(listeners.input||[]).forEach(fn=>fn({target:{id:'product-reference',value:ref,setAttribute(){}}}));(listeners.click||[]).forEach(fn=>fn({target:{closest(){return {dataset:{k:'scan'}};}}}));},click(dataset){(listeners.click||[]).forEach(fn=>fn({target:{closest(){return {dataset};}}}));},input(name,value){const target={dataset:{field:name},id:name==='reference'?'product-reference':name==='phone'?'contact-phone':'',value,setAttribute(){}};(listeners.input||[]).forEach(fn=>fn({target}));},reset(){elements.reset.click();}};
}
module.exports={boot};
test('request preview sorts department codes numerically without changing the work queue',()=>{
  const {t,elements,click}=boot();
  const codes=()=>Array.from(elements.pickWrap.innerHTML.matchAll(/data-view="([WMK]-\d+)"/g),m=>m[1]);
  assert.deepEqual(codes(),['W-1','W-2','W-3','W-4','M-1']);
  click({view:'W-1'});assert.ok(elements.phone.innerHTML.includes('W-1'));
  t.state.reqs.push({code:'K-2',dept:'K'},{code:'W-10',dept:'W'},{code:'K-1',dept:'K'});
  const before=Array.from(t.state.reqs,r=>r.code);t.renderPick();
  assert.deepEqual(codes(),['W-1','W-2','W-3','W-4','W-10','M-1','K-1','K-2']);
  assert.deepEqual(Array.from(t.state.reqs,r=>r.code),before);
});
test('collection messages keep tracking identifiers but never expose shelf details or ask to show a code',()=>{
  const {t,elements,click}=boot();const ready=t.req('W-1');ready.rack='PRIVATE-RACK-99';
  for(const lang of ['tr','en','es','ru','ar']){
    click({lang});click({view:'W-1'});
    assert.ok(elements.notif.innerHTML.includes('W-1'));
    assert.ok(!elements.notif.innerHTML.includes('PRIVATE-RACK-99'));
    assert.ok(!t.I18N[lang].readyText.includes('{rack}'));
    assert.ok(elements.phone.innerHTML.includes('20'));
  }
  click({lang:'tr'});assert.ok(!elements.notif.innerHTML.includes('kodunuzu gösterin'));
  assert.ok(!t.I18N.tr.createdFoot.includes('gösterin'));
});
test('staff choose four reasons and save an escaped other note visible only to staff',()=>{
  const {t,click,input,elements}=boot();click({op:'start',id:'W-2'});click({sel:'W-2'});
  assert.equal((elements.hh.innerHTML.match(/data-op="issue"/g)||[]).length,4);
  click({op:'issue',id:'W-2:other'});assert.equal(t.req('W-2').issue,null);
  assert.ok(elements.hh.innerHTML.includes('<textarea'));
  click({op:'issue-save',id:'W-2'});assert.equal(t.req('W-2').issue,null);
  assert.ok(elements.hh.innerHTML.includes('Açıklama yazın'));
  const note='Özel kontrol <b>alanı</b> kapalı.';
  input('issue-note-W-2',note);click({op:'issue-save',id:'W-2'});
  assert.equal(t.req('W-2').issue.note,note);
  assert.ok(elements.hh.innerHTML.includes('&lt;b&gt;alanı&lt;/b&gt;'));
  assert.ok(elements.ops.innerHTML.includes('&lt;b&gt;alanı&lt;/b&gt;'));
  assert.ok(!elements.phone.innerHTML.includes(note));
  click({op:'second',id:'W-2'});click({sel:'W-2'});click({op:'issue',id:'W-2:other'});
  input('issue-note-W-2','Kaydedilmeyecek');click({op:'issue-cancel',id:'W-2'});
  assert.equal(t.req('W-2').issue,null);assert.ok(!elements.hh.innerHTML.includes('<textarea'));
  click({tab:'controls'});assert.ok(elements.ops.innerHTML.includes('&lt;b&gt;alanı&lt;/b&gt;'));
});
test('elapsed times refresh without extending the customer inactivity timer',()=>{
  const {t,click,timers,intervals,elements,search}=boot();search();const before=timers.length;
  t.state.ops.offset+=120000;assert.equal(intervals.length,1);intervals[0]();
  assert.ok(elements.ops.innerHTML.includes('24 dk'));assert.equal(timers.length,before);
  click({op:'start',id:'W-2'});assert.equal(timers.length,before,'staff actions must not extend customer inactivity');
});
test('customer requests reserve live warehouse stock and show the conditional arrival estimate',()=>{
  const {t,click,elements,search}=boot();
  assert.ok(t.state.ops,'customer and warehouse must share an operations model');
  const item=t.state.ops.stock.find(s=>s.dept==='W'&&s.size==='M'&&s.ref==='2298/047');
  const before=t.state.ops.available(item.key);
  search();click({size:'M'});click({k:'request'});
  assert.equal(t.state.k.code,'W-5');assert.equal(t.state.ops.available(item.key),before-1);
  assert.ok(elements.kmain.innerHTML.includes('İsteğiniz alınmıştır.'));
  assert.ok(elements.kmain.innerHTML.includes('20–25 dakika'));assert.ok(elements.kmain.innerHTML.includes('hangi kanaldan'));
  assert.ok(elements.ops.innerHTML.includes('W-5'),'new request must appear in manager queue');
});
test('manager can reassign work, record a second search, reconcile stock and accept a handover',()=>{
  const {t,click,input,elements,search}=boot();
  input('owner-W-3','Destek ekibi');click({op:'assign',id:'W-3'});
  assert.equal(t.req('W-3').owner,'Destek ekibi');
  click({op:'close',id:'W-3'});assert.equal(t.req('W-3').status,'searching');assert.equal(t.state.o.error,true);
  click({op:'second',id:'W-3'});click({op:'issue',id:'W-3:stock'});click({op:'close',id:'W-3'});
  assert.equal(t.req('W-3').status,'cancelled');
  click({tab:'controls'});input('count-KONTROL-1','0');input('note-KONTROL-1','Raf ve iade alanı sayıldı.');click({op:'resolve',id:'KONTROL-1'});
  assert.equal(t.state.ops.tasks[0].status,'resolved');assert.equal(t.state.ops.item(t.req('W-3').key).warehouse,0);
  input('shift-from','Sabah');input('shift-to','Akşam');input('handover-note','Geciken istekler kontrol edilecek.');click({op:'handover'});
  assert.equal(t.state.ops.handovers.length,1);assert.equal(t.state.ops.handovers[0].requests.length,4);
  input('accept-DEVIR-1','Akşam');click({op:'accept',id:'DEVIR-1'});assert.ok(t.state.ops.handovers[0].acceptedAt);
  click({filter:'K'});assert.ok(elements.ops.innerHTML.includes('0 açık istek'));
});
test('cart actions move only loaded units and require matching arrival and return scans',()=>{
  const {t,click,input}=boot();
  input('cart-dept','W');click({op:'create-cart'});const cart=t.state.ops.carts.at(-1);assert.equal(cart.id,'AR-2');
  input('load-'+cart.id,'DEMO-W4-A');click({op:'load',id:cart.id});click({op:'dispatch',id:cart.id});
  assert.equal(cart.status,'loading');assert.equal(t.state.o.error,true);
  input('load-'+cart.id,'DEMO-W4-B');click({op:'load',id:cart.id});click({op:'dispatch',id:cart.id});
  assert.equal(t.req('W-4').status,'tour');assert.equal(t.req('M-1').status,'searching');
  input('point-'+cart.id,'M');click({op:'arrive',id:cart.id});assert.equal(cart.status,'transit');
  input('point-'+cart.id,'W');click({op:'arrive',id:cart.id});assert.equal(t.req('W-4').status,'ready');
  click({op:'expire',id:'W-4'});assert.equal(t.req('W-4').status,'ready','must respect collection window');
  click({op:'expire',id:'W-1'});assert.equal(t.req('W-1').status,'return_pending');
  input('return-W-1','BAD');click({op:'return',id:'W-1'});assert.equal(t.req('W-1').status,'return_pending');
  input('return-W-1','DEMO-W1');click({op:'return',id:'W-1'});assert.equal(t.req('W-1').status,'returned');
});
test('manager allocations change customer availability and confirmed replenishment changes the floor map',()=>{
  const {t,click,input,elements,search}=boot();const key='W:2298/047:M';
  input('online-key',key);input('online-qty','3');input('online-id','WEB-42');click({op:'reserve-online'});
  assert.equal(t.state.ops.available(key),0);
  search();click({size:'M'});assert.ok(/data-k="request" disabled/.test(elements.kmain.innerHTML));
  assert.ok(elements.kmain.innerHTML.includes('diğer işlemler için ayrılmıştır'),'reserved stock must not be described as nonexistent');
  click({op:'release-online',id:'WEB-42'});assert.equal(t.state.ops.available(key),3);
  input('repl-qty-'+key,'2');input('repl-location-'+key,'W1T1');click({op:'replenish',id:key});
  assert.equal(t.state.ops.available(key),1);assert.equal(t.state.ops.replenishments.length,1);
  input('confirm-REYON-1','W1C1');click({op:'complete-repl',id:'REYON-1'});assert.equal(t.state.o.error,true);
  input('confirm-REYON-1','W1T1');click({op:'complete-repl',id:'REYON-1'});
  assert.equal(t.state.ops.item(key).floor[0].qty,2);assert.ok(elements.kmain.innerHTML.includes('Konumunu görüntüle'));click({mapAction:'expand'});assert.ok(elements.kmain.innerHTML.includes('reference-highlight'));click({mapAction:'close'});
  click({size:'M'});assert.ok(!/data-k="request" disabled/.test(elements.kmain.innerHTML));
  input('repl-qty-'+key,'1');click({op:'replenish',id:key});click({op:'cancel-repl',id:'REYON-2'});assert.equal(t.state.ops.available(key),1);
});
test('customer stock stays blocked while a stock discrepancy is awaiting a count',()=>{
  const {t,click,elements,search}=boot();search();click({size:'M'});click({k:'request'});
  click({op:'start',id:'W-5'});click({op:'issue',id:'W-5:stock'});click({k:'add'});search();click({size:'M'});
  assert.ok(/data-k="request" disabled/.test(elements.kmain.innerHTML));
  assert.ok(elements.kmain.innerHTML.includes('Depo stoğu kontrol ediliyor'));
});
