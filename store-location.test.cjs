const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
function load(data){
  const html=fs.readFileSync('İstek Noktası.html','utf8');
  let js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const elements={},handlers={};
  const document={getElementById(id){return elements[id]??={innerHTML:'',setAttribute(){},addEventListener(){}};},addEventListener(type,fn){handlers[type]=fn;}};
  js=js.replace('  S=initial(); renderAll();','  S=initial(); renderAll();globalThis.test={get state(){return S;},renderAll,renderMap,STORE_PLAN,I18N};');
  const ctx={document,console,setTimeout(){},clearTimeout(){},setInterval(){}};
  if(data)ctx.window={ISTEK_STORE_DATA:data};
  vm.runInNewContext(js,ctx);
  return {t:ctx.test,elements,search(ref='2298/047'){handlers.click({target:{closest(){return {dataset:{k:'entry'}};}}});handlers.input({target:{id:'product-reference',value:ref,setAttribute(){}}});handlers.click({target:{closest(){return {dataset:{k:'scan'}};}}});},click(dataset){handlers.click({target:{closest(){return {dataset};}}});}};
}
test('reference search opens the shared map on demand with entrances and no invented fixture type',()=>{
  const {t,elements,click,search}=load();
  assert.ok(!elements.kmain.innerHTML.includes('data-k="zara-location"'));
  search();click({size:'L'});click({mapAction:'expand'});
  assert.equal(t.state.k.mode,'scan');assert.equal(t.state.k.category,'W');assert.equal(t.state.k.selectedSize,'L');
  assert.ok(elements.kmain.innerHTML.includes('Zorlu Center'));
  assert.ok(elements.kmain.innerHTML.includes('P0'));
  assert.ok(elements.kmain.innerHTML.includes('data-door="1"'));
  assert.ok(elements.kmain.innerHTML.includes('data-door="2"'));
  assert.ok(elements.kmain.innerHTML.includes('Giriş / çıkış'));
  assert.ok(!elements.kmain.innerHTML.includes('1. masa'),'screenshot does not establish a table');
  click({mapAction:'close'});click({k:'request'});assert.equal(t.state.k.code,'W-5');
  assert.equal(t.state.reqs.at(-1).storeId,'zorlu-demo');assert.equal(t.state.reqs.at(-1).source,'ekran');
  assert.ok(elements.kmain.innerHTML.includes('Zorlu Center'));
});
function connectedData(){return {store:{id:'ZRL-01',name:'Zorlu Center'},context:{storeId:'ZRL-01',department:'W',ref:'JACKET-001',size:'L'},products:{W:{ref:'JACKET-001',name:'Ceket',color:'Siyah',sizes:[{s:'L',warehouse:3,floor:[{code:'W2W3',qty:2}]}]}},plan:{sample:false,storeId:'ZRL-01',department:'W',floor:'P0',width:600,height:400,imageUrl:'data:image/svg+xml;base64,PHN2Zy8+',fixtures:[{code:'W2W3',x:200,y:120,width:120,height:20}],entrances:[{id:'main-door',x:80,y:340}]}};}
test('demo route animates from the temporary middle point and remains inside the opened map',()=>{
  const {elements,click,search}=load();search();click({size:'L'});
  assert.ok(!elements.kmain.innerHTML.includes('route-motion'));
  click({mapAction:'expand'});
  assert.ok(elements.kmain.innerHTML.includes('route-motion'));
  assert.ok(elements.kmain.innerHTML.includes('data-route-origin="344,598"'));
  assert.ok(elements.kmain.innerHTML.includes('Buradasınız'));
  assert.ok(elements.kmain.innerHTML.includes('Örnek rota'));
  click({mapAction:'replay'});assert.ok(elements.kmain.innerHTML.includes('route-motion'));
  click({mapAction:'close'});click({size:'S'});
  assert.ok(!elements.kmain.innerHTML.includes('route-motion'));
});
test('connected maps use only approved routes for the available location, never a guessed origin',()=>{
  const data=connectedData();let p=load(data);p.click({mapAction:'expand'});
  assert.ok(!p.elements.kmain.innerHTML.includes('route-motion'));
  assert.ok(p.elements.kmain.innerHTML.includes('Yol bilgisi henüz mevcut değil'));
  data.plan.navigation={verified:true,origin:{x:300,y:200},routes:[{locationCode:'W2W3',points:[{x:300,y:200},{x:300,y:150}]}]};
  p=load(data);p.click({mapAction:'expand'});assert.ok(p.elements.kmain.innerHTML.includes('route-motion'));
  for(const change of [d=>d.plan.navigation.verified=false,d=>d.plan.navigation.routes[0].points[0].x=301,d=>d.plan.navigation.routes[0].points[1].x=900,d=>d.plan.navigation.routes[0].locationCode='W1T1',d=>d.products.W.sizes[0].floor[0].qty=0]){
    const invalid=JSON.parse(JSON.stringify(data));change(invalid);p=load(invalid);p.click({mapAction:'expand'});
    assert.ok(!p.elements.kmain.innerHTML.includes('route-motion'));
  }
});
test('store context keeps the selected SKU and size, decodes wall placement and uses that store’s entrance data',()=>{
  const {t,elements,click}=load(connectedData());
  assert.equal(t.state.k.mode,'scan');assert.equal(t.state.k.selectedSize,'L');
  assert.ok(!elements.kmain.innerHTML.includes('<svg'));click({mapAction:'expand'});
  assert.ok(elements.kmain.innerHTML.includes('3. duvar'));
  assert.ok(elements.kmain.innerHTML.includes('data-door="main-door"'));
  assert.ok(!elements.kmain.innerHTML.includes('reference-plan'));
  assert.ok(!elements.kmain.innerHTML.includes('data-k="zara-location"'));
  click({mapAction:'close'});click({k:'request'});const r=t.state.reqs[0];
  assert.equal(r.ref,'JACKET-001');assert.equal(r.size,'L');assert.equal(r.storeId,'ZRL-01');assert.equal(r.source,'zara-konum');
});
test('foreign store context is rejected and another store’s map is never displayed',()=>{
  let data=connectedData();data.context.storeId='OTHER';let page=load(data);
  assert.equal(page.t.state.k.mode,'idle');assert.ok(page.elements.kmain.innerHTML.includes('doğrulanamadı'));
  data=connectedData();data.plan.storeId='OTHER';page=load(data);
  page.click({mapAction:'expand'});
  assert.ok(!page.elements.kmain.innerHTML.includes('data-door="main-door"'));
  assert.ok(!page.elements.kmain.innerHTML.includes('data:image/svg+xml'));
  assert.ok(page.elements.kmain.innerHTML.includes('henüz eşleştirilmemiş'));
  data=connectedData();data.context.ref='OTHER';page=load(data);assert.equal(page.t.state.k.mode,'idle');
});
test('shared map, doors, magnifier and request action are translated in all five languages',()=>{
  const {t,elements,click,search}=load();search();click({size:'L'});
  for(const lang of ['tr','en','es','ru','ar']){
    click({lang});assert.ok(elements.kmain.innerHTML.includes(t.I18N[lang].viewLocation));
    assert.ok(elements.kmain.innerHTML.includes(t.I18N[lang].request));
    click({mapAction:'expand'});assert.equal(t.state.k.mapExpanded,true);
    assert.ok(elements.kmain.innerHTML.includes(t.I18N[lang].productLocationTitle.replace('{ref}','2298/047')));
    assert.ok(!elements.kmain.innerHTML.includes(t.I18N[lang].sharedMapSource));
    click({mapAction:'in'});assert.equal(t.state.k.mapZoom,1.5);
    click({mapAction:'close'});assert.equal(t.state.k.mapExpanded,false);
  }
  click({k:'change-product'});search('4387/242');click({size:'XL'});click({mapAction:'expand'});assert.ok(!elements.kmain.innerHTML.includes('reference-plan'),'Woman screenshot must not label the Man department');
});
test('a single-department app context can start another request without switching to missing inventory',()=>{
  const data=connectedData();data.products.M=data.products.W;delete data.products.W;
  data.context.department='M';data.plan.department='M';data.products.M.sizes[0].floor=[{code:'M2W3',qty:2}];data.plan.fixtures[0].code='M2W3';
  const {t,click,elements,search}=load(data);click({k:'idle'});search('JACKET-001');
  assert.equal(t.state.k.category,'M');assert.ok(!elements.kmain.innerHTML.includes('data-category="W"'));
});
