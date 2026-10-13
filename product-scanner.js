// Decode video locally. Product identity comes only from the loaded store catalogue.
var activeProductScanner=null;
function scannerIcon(){return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M7 7v10m3-10v10m4-10v10m3-10v10"/></svg>';}
function resolveProductBarcode(raw){
  if(typeof raw!=='string'||raw.length>2048)return null;
  var value=raw.trim(),data=typeof window!=='undefined'&&window.ISTEK_STORE_DATA;
  var map=data&&data.barcodes,tag=map&&Object.prototype.hasOwnProperty.call(map,value)?map[value]:{ref:value};
  if(typeof tag==='string')tag={ref:tag};
  if(!tag||typeof tag.ref!=='string'||(tag.storeId&&tag.storeId!==STORE_CONTEXT.id))return null;
  var normalize=function(ref){return ref.replace(/[\s\/-]/g,'').toUpperCase();};
  var products=Object.keys(PRODUCTS).map(function(key){return PRODUCTS[key];}).filter(function(p){return normalize(p.ref)===normalize(tag.ref);});
  if(products.length!==1||tag.size&&!products[0].sizes.some(function(z){return z.s===tag.size;}))return null;
  return {ref:products[0].ref,size:tag.size,storeId:STORE_CONTEXT.id};
}
function releaseScannerCamera(session){
  if(session.controls){session.controls.stop();session.controls=null;}
  if(session.stream){session.stream.getTracks().forEach(function(track){track.stop();});session.stream=null;}
}
function stopProductScanner(restoreFocus){
  var session=activeProductScanner;if(!session)return;
  activeProductScanner=null;releaseScannerCamera(session);
  var dialog=document.getElementById('product-scanner-dialog');if(dialog)dialog.remove();
  if(restoreFocus!==false){var field=document.getElementById('product-reference');if(field&&field.focus)field.focus();}
}
function scannerStatus(key,canRetry){
  var status=document.getElementById('scanner-status'),retry=document.getElementById('scanner-retry');
  if(status)status.textContent=tr(key);if(retry)retry.hidden=!canRetry;
}
function mountProductScanner(){
  var dialog=document.createElement('dialog');dialog.id='product-scanner-dialog';dialog.className='scanner-dialog';
  dialog.setAttribute('lang',S.lang);dialog.setAttribute('dir',S.lang==='ar'?'rtl':'ltr');dialog.setAttribute('aria-labelledby','scanner-title');
  dialog.innerHTML='<div class="scanner-head"><h2 id="scanner-title">'+tr('scannerTitle')+'</h2><button type="button" data-scanner="close">'+tr('close')+'</button></div><p>'+tr('scannerHelp')+'</p><div class="scanner-view"><video id="product-scanner-video" autoplay muted playsinline></video><div class="scanner-guide" aria-hidden="true"></div></div><p id="scanner-status" role="status" aria-live="polite">'+tr('scannerStarting')+'</p><div class="scanner-actions"><button type="button" id="scanner-retry" data-scanner="retry" hidden>'+tr('scannerRetry')+'</button><button type="button" data-scanner="close">'+tr('scannerManual')+'</button></div>';
  dialog.addEventListener('cancel',function(e){e.preventDefault();stopProductScanner();});
  document.body.appendChild(dialog);dialog.showModal();return document.getElementById('product-scanner-video');
}
async function openProductScanner(){
  if(S.k.mode!=='entry')return;
  stopProductScanner(false);
  var session={stream:null,controls:null};activeProductScanner=session;
  var video=mountProductScanner();touch();
  if(typeof navigator==='undefined'||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){scannerStatus('scannerUnsupported',true);return;}
  if(typeof window==='undefined'||!window.ZXingBrowser){scannerStatus('scannerUnavailable',true);return;}
  try{
    var stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
    if(activeProductScanner!==session){stream.getTracks().forEach(function(track){track.stop();});return;}
    session.stream=stream;video.muted=true;
    var reader=new window.ZXingBrowser.BrowserMultiFormatReader(undefined,{delayBetweenScanAttempts:180,delayBetweenScanSuccess:500});
    scannerStatus('scannerReady',false);
    var controls=await reader.decodeFromStream(stream,video,function(result){
      if(!result||activeProductScanner!==session)return;
      var tag=resolveProductBarcode(result.getText());
      if(!tag){scannerStatus('scannerUnknown',false);return;}
      stopProductScanner(false);receiveProductTag(tag);
    });
    if(activeProductScanner!==session){controls.stop();return;}
    session.controls=controls;
  }catch(error){
    if(activeProductScanner!==session)return;
    releaseScannerCamera(session);
    var key=error.name==='NotAllowedError'||error.name==='SecurityError'?'scannerDenied':error.name==='NotFoundError'||error.name==='OverconstrainedError'?'scannerNoCamera':error.name==='NotReadableError'?'scannerBusy':'scannerUnavailable';
    scannerStatus(key,true);
  }
}
document.addEventListener('click',function(e){
  var button=e.target.closest&&e.target.closest('[data-scanner]');if(!button||!button.dataset.scanner)return;
  if(button.dataset.scanner==='open'||button.dataset.scanner==='retry')openProductScanner();
  else if(button.dataset.scanner==='close')stopProductScanner();
});
document.addEventListener('visibilitychange',function(){if(document.hidden)stopProductScanner(false);});
if(typeof window!=='undefined'&&window.addEventListener)window.addEventListener('pagehide',function(){stopProductScanner(false);});
