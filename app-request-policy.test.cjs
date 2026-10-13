const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
function setup(){const c={};vm.runInNewContext(fs.readFileSync('app-request-policy.js','utf8'),c);let now=1000000;const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};return {policy:new c.AppRequestPolicy(storage,()=>now),values,advance(ms){now+=ms;},key:c.APP_REQUEST_RULE.key};}
test('rolling 15-minute window counts units across stores and releases only expired units',()=>{
  const t=setup(),p=t.policy;assert.equal(p.consume(6,'store-a').ok,true);t.advance(60000);assert.equal(p.consume(4,'store-b').ok,true);
  assert.equal(p.inspect(1).ok,false);assert.equal(p.inspect(7).waitMs,900000);
  t.advance(840000);assert.equal(p.inspect(6).ok,true);assert.equal(p.inspect(7).ok,false);assert.equal(p.inspect(0).used,4);
  t.advance(60000);assert.equal(p.inspect(10).ok,true);assert.equal(p.inspect(11).reason,'basket');
});
test('an oversized basket is rejected as a whole and malformed storage or backwards clock fails closed',()=>{
  const t=setup(),p=t.policy;p.consume(9,'store-a');const before=[...t.values.entries()];assert.equal(p.consume(2,'store-a').ok,false);assert.deepEqual([...t.values.entries()],before);
  t.advance(-1);assert.equal(p.inspect(1).reason,'clock');t.advance(1);t.values.set(t.key,'broken');assert.equal(p.inspect(1).reason,'storage');
});
