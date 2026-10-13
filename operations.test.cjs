const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const context={};
if(fs.existsSync('operations.js'))vm.runInNewContext(fs.readFileSync('operations.js','utf8'),context);
function setup(){
  assert.equal(typeof context.Warehouse,'function','Warehouse operations model must exist');
  let time=1000000;
  const ops=new context.Warehouse([{key:'W:A:S',dept:'W',ref:'A',color:'Ecru',size:'S',warehouse:2,floor:[{code:'W1T1',qty:1}],bin:'D-W-01'},{key:'M:B:L',dept:'M',ref:'B',color:'White',size:'L',warehouse:3,floor:[],bin:'D-M-01'}],()=>time);
  return {ops,advance(minutes){time+=minutes*60000;}};
}
test('the last unit cannot be allocated to both an online order and a store request',()=>{
  const {ops}=setup();const r=ops.request('W:A:S',1);
  assert.equal(r.code,'W-1');assert.equal(ops.available('W:A:S'),1);
  const online=ops.reserveOnline('W:A:S',1,'WEB-1');
  assert.equal(online.id,'WEB-1');assert.equal(ops.available('W:A:S'),0);
  assert.throws(()=>ops.request('W:A:S',1),/stok/i);
  assert.throws(()=>ops.reserveOnline('W:A:S',1,'WEB-2'),/stok/i);
  ops.releaseOnline('WEB-1');assert.equal(ops.available('W:A:S'),1);
  assert.equal(ops.request('W:A:S',1).code,'W-2');
});
test('only verified units in the selected cart reach the correct department',()=>{
  const {ops}=setup();const a=ops.request('W:A:S',1),b=ops.request('M:B:L',1);
  const cart=ops.createCart('W');ops.start(a.code);ops.start(b.code);
  assert.throws(()=>ops.scanFound(a.code,{id:'U1',ref:'A',color:'White',size:'S'}),/eşleş/i);
  ops.scanFound(a.code,{id:'U1',ref:'A',color:'Ecru',size:'S'});
  assert.equal(a.status,'found');assert.equal(b.status,'searching');
  assert.throws(()=>ops.load(a.code,ops.createCart('M').id,'U1'),/bölüm/i);
  assert.throws(()=>ops.load(a.code,cart.id,'OTHER'),/doğrulan/i);
  ops.load(a.code,cart.id,'U1');assert.throws(()=>ops.load(a.code,cart.id,'U1'),/zaten/i);
  ops.dispatch(cart.id);assert.equal(a.status,'tour');assert.equal(b.status,'searching');
  assert.equal(ops.item(a.key).warehouse,1);
  assert.throws(()=>ops.arrive(cart.id,'M'),/bölüm/i);assert.equal(a.status,'tour');
  ops.arrive(cart.id,'W');assert.equal(a.status,'ready');assert.equal(a.rack,'W-B3');assert.equal(b.status,'searching');
});
test('expired collection restores stock only after every returned unit is scanned',()=>{
  const {ops}=setup();const r=ops.request('W:A:S',2);ops.start(r.code);
  for(const id of ['U1','U2'])ops.scanFound(r.code,{id,ref:'A',color:'Ecru',size:'S'});
  const cart=ops.createCart('W');ops.load(r.code,cart.id,'U1');assert.throws(()=>ops.dispatch(cart.id),/tüm adet/i);ops.load(r.code,cart.id,'U2');
  ops.dispatch(cart.id);ops.arrive(cart.id,'W');ops.expire(r.code);
  assert.equal(r.status,'return_pending');assert.equal(ops.available(r.key),0);
  assert.throws(()=>ops.returnUnit(r.code,'WRONG'),/eşleş/i);
  ops.returnUnit(r.code,'U1');assert.equal(ops.available(r.key),0);
  assert.throws(()=>ops.returnUnit(r.code,'U1'),/zaten/i);
  ops.returnUnit(r.code,'U2');assert.equal(r.status,'returned');assert.equal(ops.available(r.key),2);
  assert.throws(()=>ops.returnUnit(r.code,'U2'));
});
test('unresolved searches create traceable control tasks without premature cancellation',()=>{
  const {ops}=setup();const r=ops.request('W:A:S',1);ops.start(r.code);
  ops.reportIssue(r.code,'stock');assert.equal(r.status,'searching');assert.equal(ops.tasks.length,1);
  assert.throws(()=>ops.closeUnavailable(r.code),/ikinci/i);
  ops.assign(r.code,'Destek ekibi');assert.equal(r.owner,'Destek ekibi');
  ops.secondSearch(r.code);assert.equal(r.searchAttempts,2);assert.equal(r.issue,null);
  ops.reportIssue(r.code,'stock');assert.equal(ops.tasks.length,1);assert.equal(ops.tasks[0].occurrences,2);
  assert.throws(()=>ops.resolveTask(ops.tasks[0].id,0,'Sayım yapıldı'),/ayırma/i);
  ops.closeUnavailable(r.code);assert.equal(r.status,'cancelled');assert.equal(ops.available(r.key),2);
  ops.resolveTask(ops.tasks[0].id,0,'Raf ve iade alanı kontrol edildi.');assert.equal(ops.item(r.key).warehouse,0);assert.equal(ops.tasks[0].status,'resolved');
});
test('replenishment reserves free stock and updates both locations only on confirmation',()=>{
  const {ops}=setup();const suggestion=ops.suggestions().find(s=>s.key==='W:A:S');assert.equal(suggestion.qty,2);
  const job=ops.replenish('W:A:S',1,'W1T1');assert.equal(ops.available('W:A:S'),1);assert.equal(ops.item('W:A:S').floor[0].qty,1);
  ops.reserveOnline('W:A:S',1,'WEB-1');assert.throws(()=>ops.replenish('W:A:S',1,'W1T1'),/stok/i);
  assert.throws(()=>ops.completeReplenishment(job.id,'M1T1'),/konum/i);
  ops.completeReplenishment(job.id,'W1T1');assert.equal(ops.item('W:A:S').floor[0].qty,2);assert.equal(ops.item('W:A:S').warehouse,1);assert.equal(ops.available('W:A:S'),0);
  assert.throws(()=>ops.completeReplenishment(job.id,'W1T1'));
});
test('stage delays and immutable handovers are derived from real request events',()=>{
  const {ops,advance}=setup();const r=ops.request('W:A:S',1);advance(6);
  assert.equal(ops.metrics('W').overdue[0].code,r.code);assert.equal(ops.metrics('M').open,0);
  ops.start(r.code);advance(2);ops.reportIssue(r.code,'stock');
  const metrics=ops.metrics('W');assert.equal(metrics.stageAverages.received,6);assert.equal(metrics.open,1);
  const h=ops.handover('Sabah','Akşam','Kontrol görevi devredildi.');assert.equal(h.requests.length,1);assert.equal(h.tasks.length,1);
  ops.assign(r.code,'Destek ekibi');assert.notEqual(h.requests[0].owner,r.owner);
  ops.acceptHandover(h.id,'Akşam');assert.ok(h.acceptedAt);assert.throws(()=>ops.acceptHandover(h.id,'Akşam'));
});
test('suspected stock cannot be allocated again until the control task is resolved',()=>{
  const {ops}=setup();const r=ops.request('W:A:S',1);ops.start(r.code);ops.reportIssue(r.code,'stock');
  assert.throws(()=>ops.request(r.key,1),/kontrol/i);
  assert.throws(()=>ops.reserveOnline(r.key,1,'WEB-42'),/kontrol/i);
  assert.throws(()=>ops.replenish(r.key,1,'W1T1'),/kontrol/i);
  ops.secondSearch(r.code);ops.reportIssue(r.code,'stock');ops.closeUnavailable(r.code);
  assert.throws(()=>ops.request(r.key,1),/kontrol/i);
  ops.resolveTask('KONTROL-1',1,'Bir ürün diğer rafta bulundu.');assert.equal(ops.available(r.key),1);
  assert.equal(ops.request(r.key,1).code,'W-2');
});

test('other issues require an explanation and retain it through rechecks and handover',()=>{
  const {ops}=setup();const r=ops.request('W:A:S',1);ops.start(r.code);
  for(const note of ['', '   ', 'x'.repeat(501)])assert.throws(()=>ops.reportIssue(r.code,'other',note),/açıklama|500/i);
  assert.equal(r.issue,null);assert.equal(ops.tasks.length,0);
  ops.reportIssue(r.code,'other','  Güvenlik kontrolü nedeniyle alan kapalı.  ');
  assert.equal(r.issue.note,'Güvenlik kontrolü nedeniyle alan kapalı.');
  assert.equal(ops.tasks[0].notes[0].note,r.issue.note);
  assert.throws(()=>ops.closeUnavailable(r.code),/ikinci/i);
  const h=ops.handover('Sabah','Akşam','Kontrol sürüyor.');
  ops.secondSearch(r.code);assert.equal(r.issue,null);
  assert.equal(r.issueHistory[0].note,h.requests[0].issue.note);
  ops.reportIssue(r.code,'other','Alan hâlâ kapalı.');ops.closeUnavailable(r.code);
  assert.equal(r.reason,'other');assert.equal(r.reasonNote,'Alan hâlâ kapalı.');
  assert.equal(ops.tasks[0].notes.length,2);assert.equal(h.tasks[0].notes.length,1);
});
