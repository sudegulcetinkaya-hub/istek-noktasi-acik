const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
function boot(getUserMedia){
  let js=fs.readFileSync('İstek Noktası.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const elements={},events={};let stopped=0,callback;
  function element(id){return elements[id]??={innerHTML:'',textContent:'',hidden:false,setAttribute(){},addEventListener(){},focus(){},remove(){delete elements[id];},showModal(){this.open=true;}};}
  const document={hidden:false,body:{appendChild(){}},getElementById:element,createElement(){return element('product-scanner-dialog');},addEventListener(type,fn){(events[type]??=[]).push(fn);}};
  const stream={getTracks(){return [{stop(){stopped++;}}];}};
  const window={isSecureContext:true,addEventListener(){},ZXingBrowser:{BrowserMultiFormatReader:class{async decodeFromStream(s,v,fn){callback=fn;return {stop(){}};}}}};
  const context={document,window,navigator:{mediaDevices:{getUserMedia:getUserMedia||async function(){return stream;}}},console,setTimeout(){},clearTimeout(){},setInterval(){}};
  js=js.replace('  S=initial(); renderAll();','  S=initial(); renderAll();globalThis.test={get state(){return S;},open:typeof openProductScanner==="function"?openProductScanner:null,stop:typeof stopProductScanner==="function"?stopProductScanner:null,resolve:typeof resolveProductBarcode==="function"?resolveProductBarcode:null};');
  vm.runInNewContext(js,context);context.test.state.k.mode='entry';
  return {t:context.test,window,elements,stream,get stopped(){return stopped;},read(text){callback({getText(){return text;}});}};
}
test('camera scan selects a recognized product without creating a request and releases the camera',async()=>{
  const app=boot();assert.equal(typeof app.t.open,'function');const before=app.t.state.reqs.length;
  await app.t.open();app.read('2298/047');assert.equal(app.t.state.k.mode,'scan');
  assert.equal(app.t.state.k.productRef,'2298/047');assert.equal(app.t.state.k.inputSource,'tag');
  assert.equal(app.t.state.reqs.length,before);assert.ok(app.stopped>0);
});
test('unmapped barcode stays in scanner; mapped barcode keeps reference and size',async()=>{
  const app=boot();assert.equal(typeof app.t.open,'function');await app.t.open();app.read('9999999999999');
  assert.equal(app.t.state.k.mode,'entry');assert.equal(app.stopped,0);
  assert.ok(app.elements['scanner-status'].textContent.includes('eşleştirilemedi'));
  app.window.ISTEK_STORE_DATA={barcodes:{'1234567890123':{ref:'2298/047',size:'L',storeId:'zorlu-demo'}}};
  app.read('1234567890123');assert.equal(app.t.state.k.selectedSize,'L');assert.equal(app.t.state.k.mode,'scan');
});
test('camera permission denial keeps manual entry available',async()=>{
  const app=boot(async()=>{throw Object.assign(Error(),{name:'NotAllowedError'});});assert.equal(typeof app.t.open,'function');
  await app.t.open();assert.ok(app.elements['scanner-status'].textContent.includes('Kamera izni'));
  app.t.stop();assert.equal(app.t.state.k.mode,'entry');assert.equal(app.t.state.reqs.length,5);
});
test('closing while camera permission is pending stops a late stream',async()=>{
  let grant;const app=boot(()=>new Promise(resolve=>grant=resolve));assert.equal(typeof app.t.open,'function');
  const opening=app.t.open();app.t.stop();grant(app.stream);await opening;
  assert.ok(app.stopped>0);assert.equal(app.t.state.k.mode,'entry');
});
