const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
function boot(){
  let source=fs.readFileSync('İstek Noktası.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const elements={},timers=new Map();let next=0;
  const doc={getElementById(id){return elements[id]??={innerHTML:'',attributes:{},addEventListener(){},setAttribute(k,v){this.attributes[k]=v;}};},addEventListener(){}};
  source=source.replace('  S=initial(); renderAll();','  S=initial(); renderAll();globalThis.test={get state(){return S;},player:PRESENTATION,slides:PRESENTATION_SLIDES,startPresentation,stopPresentation,goPresentation,presentationAction,touch};');
  const context={document:doc,console,setInterval(){},setTimeout(fn,delay){timers.set(++next,{fn,delay});return next;},clearTimeout(id){timers.delete(id);}};
  vm.runInNewContext(source,context);return {t:context.test,elements,timers};
}
test('every slide reconstructs a valid state and covers delivery, return, exceptions and manager operations',()=>{
  const {t,elements}=boot();t.startPresentation();
  for(let i=0;i<t.slides.length;i++){
    t.goPresentation(i);assert.equal(t.player.error,'',t.slides[i].id);assert.equal(t.player.index,i);
    assert.ok(elements['presentation-stage'].innerHTML.length>20);
  }
  const s=t.state;
  assert.equal(s.ops.get('W-1').status,'delivered');assert.equal(s.ops.get('W-2').status,'returned');
  assert.equal(s.ops.get('M-1').status,'cancelled');assert.equal(s.ops.get('M-1').searchAttempts,2);
  assert.equal(s.ops.get('K-1').issue.reason,'floor');assert.equal(s.ops.get('K-1').owner,'Destek ekibi');
  assert.equal(s.ops.tasks[0].status,'resolved');assert.equal(s.ops.get('M-2').reason,'defect');
  assert.equal(s.ops.online.length,1);assert.equal(s.ops.replenishments[0].status,'completed');
  assert.ok(s.ops.handovers[0].acceptedAt);assert.equal(t.player.playing,false);
});
test('player uses six seconds, supports pause, replay and backtracking without duplicate operations',()=>{
  const {t,timers}=boot();t.startPresentation();assert.equal(t.player.delay,6000);
  assert.equal(timers.get(t.player.timer).delay,6000);
  const scheduled=timers.get(t.player.timer);scheduled.fn();assert.equal(t.player.index,1);
  t.presentationAction('toggle');assert.equal(t.player.playing,false);assert.equal(t.player.timer,null);
  t.goPresentation(7);const codes=Array.from(t.state.reqs,r=>r.code);assert.deepEqual(codes,['W-1','M-1','K-1']);
  t.presentationAction('previous');t.presentationAction('next');assert.deepEqual(Array.from(t.state.reqs,r=>r.code),codes);
  t.goPresentation(t.slides.length-1);t.presentationAction('toggle');assert.equal(t.player.index,0);assert.equal(t.player.playing,true);
});
test('a presentation cannot erase the current basket or expire while paused',()=>{
  const {t,timers}=boot(),before=t.state;before.k.mode='entry';before.k.cart=['W-2'];
  const codes=Array.from(before.reqs,r=>r.code);t.startPresentation();t.presentationAction('toggle');
  const count=timers.size;t.touch();assert.equal(timers.size,count,'presentation must not start kiosk timeout');
  t.goPresentation(17);t.stopPresentation();assert.equal(t.state,before);assert.deepEqual(Array.from(t.state.k.cart),['W-2']);
  assert.deepEqual(Array.from(t.state.reqs,r=>r.code),codes);assert.equal(t.player.saved,null);assert.equal(t.player.active,false);
});
