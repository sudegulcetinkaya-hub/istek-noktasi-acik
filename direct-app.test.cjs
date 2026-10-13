const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
function boot(storage){
  let code=fs.readFileSync('İstek Noktası.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const elements={},doc={getElementById(id){return elements[id]??={innerHTML:'',addEventListener(){},setAttribute(){}};},addEventListener(){}};
  code=code.replace('  S=initial(); renderAll();','  S=initial(); renderAll();globalThis.test={get state(){return S;},appAdd,appSubmit,appPolicy,directAppMarkup,player:PRESENTATION,slides:PRESENTATION_SLIDES,en:PRESENTATION_EN,startPresentation,goPresentation,stopPresentation};');
  const values=new Map();storage=storage||{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  const c={document:doc,localStorage:storage,console,setTimeout(){return 1;},clearTimeout(){},setInterval(){}};vm.runInNewContext(code,c);return c.test;
}
function connect(t){t.state.app.network={verified:true,storeId:'zorlu-demo',account:'demo-zara-account'};}
test('signed-in app requests share stock and numbering without collecting personal details',()=>{
  const t=boot(),s=t.state,kioskBefore=JSON.stringify(s.k),available=s.ops.available('W:2298/047:L');
  connect(t);
  assert.equal(t.appAdd(),true);assert.equal(s.ops.available('W:2298/047:L'),available,'basket is not a reservation');
  t.appAdd();assert.equal(s.app.cart.length,1,'repeated add does not duplicate item');
  s.app.dept='M';s.app.size='M';t.appAdd();assert.equal(t.appSubmit(),true);
  assert.deepEqual(Array.from(s.app.sent),['W-5','M-2']);assert.equal(s.ops.available('W:2298/047:L'),available-1);
  s.app.sent.forEach(code=>{const r=s.ops.get(code);assert.equal(r.source,'zara-app');assert.equal(r.notify,'app');assert.equal(r.accountLinked,true);assert.equal(r.storeId,'zorlu-demo');assert.ok(!('phone' in r));});
  const count=s.reqs.length;t.appSubmit();assert.equal(s.reqs.length,count,'double submit is idempotent');
  assert.equal(JSON.stringify(s.k),kioskBefore,'kiosk session is independent');assert.doesNotMatch(t.directAppMarkup(),/<input|<textarea|data-k="pair"/);
});
test('app rejects changed stock or a missing session before creating any requests',()=>{
  const t=boot(),s=t.state;t.appAdd();s.app.dept='M';s.app.size='M';t.appAdd();
  connect(t);
  const key='M:4387/242:M';s.ops.reserveOnline(key,s.ops.available(key),'RACE');const before=s.reqs.length;
  assert.equal(t.appSubmit(),false);assert.equal(s.reqs.length,before);assert.equal(s.app.cart.length,2);
  s.ops.releaseOnline('RACE');s.app.signedIn=false;assert.equal(t.appSubmit(),false);assert.equal(s.reqs.length,before);
  s.app.signedIn=true;s.closed=true;assert.equal(t.appSubmit(),false);assert.equal(s.reqs.length,before);
});
test('English presentation covers every slide and app delivery uses the common workflow',()=>{
  const t=boot();assert.equal(t.slides.length,47);
  t.slides.forEach(s=>['title','body','chapter','label'].forEach(k=>assert.ok(t.en[s.id][k],s.id+' '+k)));
  t.player.lang='en';t.startPresentation();
  for(let i=0;i<t.slides.length;i++){t.goPresentation(i);assert.equal(t.player.error,'',t.slides[i].id);assert.equal(t.state.lang,'en');}
  assert.deepEqual(Array.from(t.state.app.sent),['W-4','M-4']);assert.equal(t.state.ops.get('W-4').status,'delivered');assert.equal(t.state.ops.get('M-4').status,'received');
});

test('Wi-Fi must match the current store and account on every submission',()=>{
  const t=boot(),count=t.state.reqs.length;t.appAdd();assert.equal(t.appSubmit(),false);
  connect(t);t.state.app.network.storeId='another-store';assert.equal(t.appSubmit(),false);
  connect(t);t.state.app.network.account='another-account';assert.equal(t.appSubmit(),false);
  connect(t);assert.equal(t.appSubmit(),true);assert.equal(t.state.reqs.length,count+1);
  t.state.app.dept='M';t.state.app.size='S';t.appAdd();t.state.app.network.verified=false;
  assert.equal(t.appSubmit(),false);assert.equal(t.state.app.sent.length,1);assert.match(t.directAppMarkup(),/Mağaza Wi-Fi/);
});

test('reload and cancelled or completed records cannot reset the rolling count; presentation is isolated',()=>{
  const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  const first=boot(storage);connect(first);first.appAdd();first.appSubmit();
  const record=first.state.ops.get(first.state.app.sent[0]);record.status='cancelled';record.held=false;
  assert.equal(first.appPolicy().inspect(0).used,1);
  const next=boot(storage);assert.equal(next.appPolicy().inspect(0).used,1);assert.equal(next.state.app.network.verified,false);
  const before=[...values.entries()];next.startPresentation();next.goPresentation(45);next.stopPresentation();assert.deepEqual([...values.entries()],before);
  connect(next);next.appPolicy().consume(9,'other-store');next.appAdd();const stock=next.state.ops.available('W:2298/047:L'),count=next.state.reqs.length;
  assert.equal(next.appSubmit(),false);assert.equal(next.state.reqs.length,count);assert.equal(next.state.ops.available('W:2298/047:L'),stock);
});

test('failed persistent write rolls back warehouse creation and keeps the basket',()=>{
  const t=boot({getItem:()=>null,setItem(){throw Error('quota exceeded');}});connect(t);t.appAdd();const count=t.state.reqs.length;
  assert.equal(t.appSubmit(),false);assert.equal(t.state.reqs.length,count);assert.equal(t.state.app.cart.length,1);assert.equal(t.state.app.sent.length,0);
});

