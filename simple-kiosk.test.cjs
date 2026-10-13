const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
function boot(){
  let js=fs.readFileSync('İstek Noktası.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const elements={},handlers={};
  const document={getElementById(id){return elements[id]??={innerHTML:'',setAttribute(){},addEventListener(){}};},addEventListener(type,fn){handlers[type]=fn;}};
  js=js.replace('  S=initial(); renderAll();','  S=initial(); renderAll();globalThis.test={get state(){return S;},receiveProductTag,renderAll,I18N};');
  const context={document,console,setTimeout(){},clearTimeout(){},setInterval(){}};vm.runInNewContext(js,context);
  return {t:context.test,elements,click(dataset){handlers.click({target:{closest(){return {dataset};}}});},input(value){handlers.input({target:{id:'product-reference',value,dataset:{},setAttribute(){}}});}};
}
test('reference entry reveals a location link only for floor stock and opens a clean reference-titled map',()=>{
  const {t,elements,click,input}=boot();
  assert.ok(elements.kmain.innerHTML.includes('data-k="entry"'));
  assert.ok(elements.kmain.innerHTML.includes('data-k="lookup"'));
  assert.ok(!elements.kmain.innerHTML.includes('id="product-reference"'));
  click({k:'lookup'});assert.equal(t.state.k.mode,'lookup');
  click({k:'idle'});click({k:'entry'});
  assert.ok(elements.kmain.innerHTML.includes('Ürün bilgisi'));
  assert.ok(elements.kmain.innerHTML.includes('id="product-reference"'));
  assert.ok(!elements.kmain.innerHTML.includes('zara-location'));
  input('2298/047');click({k:'scan'});assert.equal(t.state.k.mode,'scan');
  assert.ok(elements.kmain.innerHTML.includes('Konumunu görüntüle'));
  assert.ok(!elements.kmain.innerHTML.includes('<svg'),'map must stay closed until tapped');
  click({size:'M'});assert.ok(!elements.kmain.innerHTML.includes('data-map-action="expand"'));
  click({mapAction:'expand'});assert.equal(t.state.k.mapExpanded,false);
  click({size:'L'});assert.ok(elements.kmain.innerHTML.includes('data-map-action="expand"'));
  click({mapAction:'expand'});assert.equal(t.state.k.mapExpanded,true);
  assert.ok(elements.kmain.innerHTML.includes('2298/047 numaralı ürünün konumu'));
  assert.ok(elements.kmain.innerHTML.includes('data-door="1"'));
  assert.ok(!/Paylaştığınız|Ceketin|örnek veri|mağaza tarafından doğrulanmadı/.test(elements.kmain.innerHTML));
  click({mapAction:'close'});click({k:'request'});assert.equal(t.state.k.code,'W-5');
});
test('unknown references stay on search and compact reference entry selects the correct product',()=>{
  const {t,elements,click,input}=boot();click({k:'entry'});input('9999/999');click({k:'scan'});
  assert.equal(t.state.k.mode,'entry');assert.equal(t.state.k.error,'referenceError');
  assert.ok(elements.kmain.innerHTML.includes('Ürün bulunamadı'));
  input('2298047');click({k:'scan'});assert.equal(t.state.k.mode,'scan');assert.equal(t.state.k.category,'W');
  assert.equal(t.state.k.selectedSize,null);
});
test('tag reads validate store and size, preserve the basket, and require a separate request action',()=>{
  const {t,click}=boot();const initial=t.state.reqs.length;
  assert.equal(t.receiveProductTag({ref:'2298/047',storeId:'wrong'}),false);
  assert.equal(t.receiveProductTag({ref:'2298/047',size:'NO-SIZE'}),false);
  assert.equal(t.receiveProductTag({ref:'2298/047',size:'L',storeId:'zorlu-demo'}),true);
  assert.equal(t.state.reqs.length,initial);assert.equal(t.state.k.selectedSize,'L');
  assert.equal(t.receiveProductTag('4387/242'),false);
  click({k:'request'});assert.equal(t.state.reqs.at(-1).source,'etiket');
  click({k:'add'});assert.equal(t.state.k.mode,'entry');assert.equal(t.state.k.cart.length,1);
  assert.equal(t.receiveProductTag({ref:'4387/242',size:'M'}),true);click({k:'request'});
  assert.equal(t.state.k.cart.length,2);assert.equal(t.state.k.code,'M-2');
});
