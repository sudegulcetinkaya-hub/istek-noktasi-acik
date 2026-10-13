// Prototype integration: one shared inventory and request model for every screen.
var S, idleT=null, timer=null;
var REASONS=[
  {k:'stock',t:'Stok hatasından dolayı ürün bulunamadı'},
  {k:'floor',t:'Depo konumu güncel değil; ürün reyonda olabilir'},
  {k:'defect',t:'Hasarlı veya satışa uygun değil'},
  {k:'other',t:'Diğer…'}
];
var STATUS={received:'Alındı',searching:'Aranıyor',found:'Bulundu',tour:'Yolda',ready:'İstek noktasında',return_pending:'Depoya dönüş bekliyor',returned:'Depoya döndü',delivered:'Teslim edildi',cancelled:'Temin edilemedi'};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function inventoryKey(dept,size){return dept+':'+PRODUCTS[dept].ref+':'+size;}
function catalog(){
  var rows=[];
  Object.keys(PRODUCTS).forEach(function(dept){var product=PRODUCTS[dept];product.sizes.forEach(function(z){rows.push({key:inventoryKey(dept,z.s),dept:dept,ref:product.ref,color:product.color||I18N.tr['color_'+dept],size:z.s,warehouse:Number(z.warehouse)||0,floor:z.floor||[],bin:z.bin||('D-'+dept+'-01')});});});
  if(typeof window==='undefined'||!window.ISTEK_STORE_DATA){
    [['5644/305','M',2],['0264/120','38',1],['1165/033','XS',3]].forEach(function(x){rows.push({key:'W:'+x[0]+':'+x[1],dept:'W',ref:x[0],color:'Siyah',size:x[1],warehouse:x[2],floor:[],bin:'D-W-02'});});
  }
  return rows;
}
function initial(){
  var ops=new Warehouse(catalog());
  var s={lang:'tr',busy:false,closed:false,view:null,sel:null,reasonMode:false,toast:'',log:[],ops:ops,reqs:ops.requests,
    app:newAppState(),
    o:{dept:'',tab:'queue',fields:{},notice:'',error:false},
    k:{selectedSize:null,cart:[],category:'W',phone:'',error:'',mode:'idle',code:null,input:'',prefix:'W',msg:'',pair:false,alt:null,found:null,fromZara:false,mapExpanded:false,mapZoom:1,productRef:'',inputSource:'manual'}};
  if(typeof window==='undefined'||!window.ISTEK_STORE_DATA){
    function ago(n){ops.offset=-n*60000;}
    ago(40);var a=ops.request('W:5644/305:M',1);ago(38);ops.start(a.code);
    ago(30);ops.scanFound(a.code,{id:'DEMO-W1',ref:a.ref,color:a.color,size:a.size});
    var c=ops.createCart('W');ops.load(a.code,c.id,'DEMO-W1');ago(27);ops.dispatch(c.id);ago(22);ops.arrive(c.id,'W');
    ago(8);var b=ops.request(inventoryKey('W','S'),1);b.notify='app';
    ago(12);var d=ops.request('W:0264/120:38',1,'personel');d.notify='wa';ago(10);ops.start(d.code);ago(4);ops.reportIssue(d.code,'stock');
    ago(7);var m=ops.request(inventoryKey('M','L'),1);ago(4);ops.start(m.code);
    ago(9);var e=ops.request('W:1165/033:XS',2,'personel');e.notify='sms';ago(7);ops.start(e.code);ago(2);
    ops.scanFound(e.code,{id:'DEMO-W4-A',ref:e.ref,color:e.color,size:e.size});ops.scanFound(e.code,{id:'DEMO-W4-B',ref:e.ref,color:e.color,size:e.size});
    ops.offset=0;s.view='W-2';
  }
  applyIncomingStoreContext(s);
  return s;
}
function req(code){return S.reqs.find(function(r){return r.code===code;})||null;}
function reason(key){return REASONS.find(function(r){return r.k===key;})||{t:'Kontrol gerekli'};}
function issueText(issue){return reason(issue.reason).t+(issue.note?' — '+issue.note:'');}
function issueNotes(task){return (task.notes||[]).map(function(n){return '<p class="issue-note"><b>'+esc(n.code)+' · Diğer</b><br>'+esc(n.note)+'</p>';}).join('');}
function renderOtherIssue(code){
  if(S.o.issueEditor!==code)return '';
  return '<div class="op-form other-issue-form"><label class="op-field" for="other-issue-note">Özel durumu açıklayın<textarea id="other-issue-note" data-field="issue-note-'+esc(code)+'" rows="4" maxlength="500" required aria-describedby="other-issue-help other-issue-error" aria-invalid="'+Boolean(S.o.issueError)+'">'+esc(field('issue-note-'+code))+'</textarea></label><small id="other-issue-help">En fazla 500 karakter.</small><p id="other-issue-error" role="alert">'+esc(S.o.issueError||'')+'</p>'+opButton('issue-save','Açıklamayı kaydet',code)+opButton('issue-cancel','Vazgeç',code)+'</div>';
}
function open(r){return S.ops.isOpen(r);}
function nextCode(p){return p+'-'+(S.reqs.filter(function(r){return r.code.charAt(0)===p;}).reduce(function(n,r){return Math.max(n,Number(r.code.split('-')[1])||0);},0)+1);}
function availableForSize(dept,z){var key=inventoryKey(dept,z.s);return S.ops.underReview(key)?0:S.ops.available(key);}
function currentFloorQuantity(dept,z){return floorQuantity(S.ops.item(inventoryKey(dept,z.s)));}
function log(message){S.log.push(message);if(S.log.length>6)S.log.shift();}
function startSearch(code){S.ops.start(code);}
function deliver(code){S.ops.deliver(code);}
function expire(code){S.ops.expire(code);}
function clearSession(){stopProductScanner(false);S.k.cart=[];S.k.phone='';S.k.error='';S.k.code=null;S.k.pair=false;S.k.selectedSize=null;S.k.fromZara=false;S.k.mapExpanded=false;S.k.mapZoom=1;S.k.productRef='';S.k.inputSource='manual';}
function selectProduct(reference,size,source){
  var normalize=function(value){return String(value||'').replace(/[\s\/-]/g,'').toUpperCase();};
  var departments=Object.keys(PRODUCTS).filter(function(dept){return normalize(PRODUCTS[dept].ref)===normalize(reference);});
  if(departments.length!==1||(size&&!PRODUCTS[departments[0]].sizes.some(function(z){return z.s===size;}))){S.k.error='referenceError';return false;}
  stopProductScanner(false);S.k.category=departments[0];S.k.productRef=PRODUCTS[S.k.category].ref;S.k.selectedSize=size||null;S.k.mode='scan';S.k.error='';S.k.msg='';S.k.fromZara=false;S.k.inputSource=source||'manual';S.k.mapExpanded=false;return true;
}
function receiveProductTag(payload){
  if(S.k.mode!=='idle'&&S.k.mode!=='entry')return false;
  S.k.mode='entry';
  var tag=typeof payload==='string'?{ref:payload}:payload;
  if(!tag||typeof tag.ref!=='string'||(tag.storeId&&tag.storeId!==STORE_CONTEXT.id)){S.k.error='referenceError';renderKiosk();return false;}
  var found=selectProduct(tag.ref,tag.size,'tag');renderAll();return found;
}
if(typeof window!=='undefined')window.ISTEK_PRODUCT_READER={receive:receiveProductTag};
function kioskCreate(size){
  if(S.closed)return;
  var z=PRODUCTS[S.k.category].sizes.find(function(z){return z.s===size;});if(!z)return;
  try{
    var r=S.ops.request(inventoryKey(S.k.category,size),1,S.k.fromZara==='connected'?'zara-konum':S.k.inputSource==='tag'?'etiket':'ekran');r.fromKiosk=true;r.storeId=STORE_CONTEXT.id;r.storeName=STORE_CONTEXT.name;
    S.k.cart.push(r.code);S.k.mode='created';S.k.code=r.code;S.k.pair=false;S.k.msg='';S.k.error='';S.view=r.code;log(r.code+' isteği alındı.');
  }catch(error){S.k.error='stockChanged';}
}
function finishCart(channel){
  var codes=S.k.cart.slice();codes.forEach(function(code){var r=req(code);if(r)r.notify=channel;});
  clearSession();S.k.mode='idle';S.k.msg={key:'done_'+channel,values:{codes:codes.join(', ')}};
}
function kioskPair(){if(S.k.mode==='created'&&S.k.pair&&S.k.cart.length)finishCart('app');}
function kioskNotify(channel){
  if(S.k.mode!=='notify'||!S.k.cart.length||['sms','wa'].indexOf(channel)<0)return;
  var digits=S.k.phone.replace(/[٠-٩]/g,function(d){return d.charCodeAt(0)-1632;}).replace(/[۰-۹]/g,function(d){return d.charCodeAt(0)-1776;}).replace(/\D/g,'');
  if(digits.length===12&&digits.slice(0,2)==='90')digits=digits.slice(2);
  if(digits.length===11&&digits.charAt(0)==='0')digits=digits.slice(1);
  if(!/^5[0-9]{9}$/.test(digits)){S.k.error='phoneError';return;}
  // No actual message is sent; the prototype discards the phone number.
  finishCart(channel);
}
function touch(){if(idleT)clearTimeout(idleT);if(typeof PRESENTATION!=='undefined'&&PRESENTATION.active)return;if(S.k.mode!=='idle')idleT=setTimeout(function(){clearSession();S.k.mode='idle';S.k.input='';S.k.msg={key:'timeout'};renderKiosk();document.getElementById('simulateAccountScan').hidden=true;},60000);}
function field(name,fallback){return Object.prototype.hasOwnProperty.call(S.o.fields,name)?S.o.fields[name]:(fallback==null?'':fallback);}
function inputField(name,label,value,type){return '<label class="op-field">'+esc(label)+'<input data-field="'+esc(name)+'" value="'+esc(field(name,value))+'" type="'+(type||'text')+'"'+(type==='number'?' min="0" step="1"':'')+'></label>';}
function selectField(name,label,options,value){var chosen=field(name,value);return '<label class="op-field">'+esc(label)+'<select data-field="'+esc(name)+'">'+options.map(function(o){return '<option value="'+esc(o[0])+'"'+(o[0]===chosen?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select></label>';}
function opButton(action,label,id,disabled){return '<button type="button" data-op="'+action+'" data-id="'+esc(id||'')+'"'+(disabled?' disabled':'')+'>'+esc(label)+'</button>';}
function detail(r){return r.ref+' · '+r.color+' · '+r.size+' · '+r.qty+' adet';}
function renderPick(){
  var order=['W','M','K'];
  var sorted=S.reqs.slice().sort(function(a,b){return order.indexOf(a.dept)-order.indexOf(b.dept)||Number(a.code.split('-')[1])-Number(b.code.split('-')[1]);});
  document.getElementById('pickWrap').innerHTML='<span class="pick-title">İstek önizlemesi</span>'+order.map(function(dept){
    var rows=sorted.filter(function(r){return r.dept===dept;});if(!rows.length)return '';
    return '<div class="pick-group" role="group" aria-label="'+esc(tr(dept))+'"><span>'+esc(tr(dept))+'</span>'+rows.map(function(r){return '<button type="button" data-view="'+r.code+'" aria-pressed="'+(S.view===r.code)+'">'+codeText(r.code)+'</button>';}).join('')+'</div>';
  }).join('');
}
function renderHH(){
  var sel=req(S.sel),h='<div class="bar"><span>Depo · W / M / K</span><div class="tog"><button type="button" data-tog="busy" aria-pressed="'+S.busy+'">Yoğun</button><button type="button" data-tog="closed" aria-pressed="'+S.closed+'">İstek almıyor</button></div></div>';
  h+='<ul class="rows">'+S.reqs.filter(open).map(function(r){return '<li data-sel="'+r.code+'" aria-selected="'+(S.sel===r.code)+'"><span class="c">'+r.code+'</span><span class="r">'+esc(r.ref)+' · '+esc(r.size)+' ×'+r.qty+'<small>'+LABELS[r.dept]+'</small></span><span class="chip">'+(r.issue?'Kontrol gerekli':STATUS[r.status])+'</span></li>';}).join('')+'</ul>';
  if(sel&&open(sel)){
    h+='<div class="sel"><b>'+sel.code+'</b> · '+esc(detail(sel))+'<br>Depo konumu: '+esc(S.ops.item(sel.key).bin)+'<br>'+esc(sel.owner)+' · '+Math.floor(S.ops.stageMinutes(sel))+' dk</div>';
    if(sel.status==='received')h+=opButton('start','Aramaya başladım',sel.code);
    if(sel.status==='searching'&&sel.issue){h+='<div class="op-issue">'+esc(issueText(sel.issue))+'</div>'+opButton('second','İkinci kontrolü başlat',sel.code)+opButton('close','Temin edilemiyor · kapat',sel.code);}
    if(sel.status==='searching'&&!sel.issue){
      h+='<div class="op-form">'+inputField('scan-'+sel.code,'Etiket: tekil kod | referans | renk | beden','')+opButton('scan','Ürünü doğrula',sel.code)+opButton('sample','Demo etiketi okut',sel.code)+'</div><p class="note">'+sel.unitIds.length+'/'+sel.qty+' adet doğrulandı. Gerçek kullanımda etiket okuyucudan alınır.</p>';
      if(!sel.unitIds.length)h+='<details class="op-details"'+(S.o.issueEditor===sel.code?' open':'')+'><summary>Arama sorunu bildir</summary><div class="reasons">'+REASONS.map(function(x){return opButton('issue',x.t,sel.code+':'+x.k);}).join('')+'</div>'+renderOtherIssue(sel.code)+'</details>';
    }
    if(sel.status==='found')h+='<p class="note">Ürünler doğrulandı. Aşağıdaki müdür panelinin Arabalar sekmesinden uygun arabaya yükleyin.</p>';
    if(sel.status==='return_pending')h+=inputField('return-'+sel.code,'Depoya dönen tekil etiket','')+opButton('return','Depoya dönüşü doğrula',sel.code)+'<p class="note">Doğrulanacak etiketler: '+sel.unitIds.map(esc).join(', ')+' · '+sel.returnedUnits.length+'/'+sel.qty+' okutuldu.</p>';
  }else h+='<p class="note">İşleme başlamak için bir istek seçin.</p>';
  if(S.toast)h+='<div class="toast" role="status">'+esc(S.toast)+'</div>';
  document.getElementById('hh').innerHTML=h;
}
function renderAdv(){
  var h='<table><thead><tr><th>Kod / ürün</th><th>Durum / teslim</th></tr></thead><tbody>';
  S.reqs.forEach(function(r){var say=r.issue?'Kontrol sürüyor · '+issueText(r.issue):STATUS[r.status];h+='<tr><td><b>'+r.code+'</b><br><span class="say">'+esc(r.ref)+' · '+esc(r.size)+'</span></td><td>'+esc(say)+(r.status==='ready'?'<br>'+LABELS[r.dept]+' · '+r.rack+'<br>'+opButton('deliver','Teslim et',r.code)+opButton('expire','Teslim süresi doldu',r.code,S.ops.stageMinutes(r)<20):'')+'</td></tr>';});
  document.getElementById('adv').innerHTML=h+'</tbody></table>';
}
function renderOps(){
  if(typeof renderDashboard==='function'){renderDashboard();return;}
  var m=S.ops.metrics(S.o.dept);document.getElementById('ops').innerHTML='<div class="hd"><h2>Depo müdürü · canlı iş takibi</h2><span class="ex">Bu oturumun verileri</span></div><p>'+m.open+' açık istek · '+m.overdue.length+' geciken iş</p><div class="op-cards">'+S.reqs.filter(open).map(function(r){return '<article><b>'+r.code+'</b> '+esc(detail(r))+'<br>'+STATUS[r.status]+'</article>';}).join('')+'</div>';
}
function renderLog(){document.getElementById('log').innerHTML=S.ops.audit.slice(-4).map(function(e){return '<span>'+esc(e.message)+'</span>';}).join('');}
function renderAll(customerActivity){document.getElementById('simulateAccountScan').hidden=!(S.k.mode==='created'&&S.k.pair);renderKiosk(customerActivity);renderPick();renderPhone();renderHH();renderNotif();renderAdv();renderOps();renderLog();renderDirectApp();}
function performOperation(t){
  var a=t.dataset.op,id=t.dataset.id,r=req(id),ops=S.ops;
  if(a==='start')ops.start(id);
  else if(a==='scan'){var parts=field('scan-'+id).split('|').map(function(x){return x.trim();});if(parts.length!==4)throw Error('Etiketi tekil kod | referans | renk | beden biçiminde okutun.');ops.scanFound(id,{id:parts[0],ref:parts[1],color:parts[2],size:parts[3]});S.o.fields['scan-'+id]='';}
  else if(a==='sample')ops.scanFound(id,{id:'DEMO-'+id+'-'+(r.unitIds.length+1),ref:r.ref,color:r.color,size:r.size});
  else if(a==='issue'){var parts=id.split(':');ops.reportIssue(parts[0],parts[1]);delete S.o.fields['issue-note-'+parts[0]];S.o.issueEditor=null;S.o.issueError='';}
  else if(a==='issue-save'){ops.reportIssue(id,'other',field('issue-note-'+id));delete S.o.fields['issue-note-'+id];S.o.issueEditor=null;S.o.issueError='';}
  else if(a==='second')ops.secondSearch(id);
  else if(a==='close')ops.closeUnavailable(id);
  else if(a==='return'){ops.returnUnit(id,field('return-'+id).trim());S.o.fields['return-'+id]='';}
  else if(a==='deliver')ops.deliver(id);
  else if(a==='expire'){if(ops.stageMinutes(r)<20)throw Error('Teslim için ayrılan 20 dakika henüz dolmadı.');ops.expire(id);}
  else if(typeof dashboardOperation==='function'&&dashboardOperation(a,id))return;
  else throw Error('İşlem tanınmadı.');
}
document.addEventListener('input',function(e){
  if(e.target.id==='product-reference'){S.k.productRef=e.target.value;S.k.error='';document.getElementById('reference-error').textContent='';e.target.setAttribute('aria-invalid','false');touch();}
  if(e.target.dataset&&e.target.dataset.appField==='product'&&PRODUCTS[e.target.value]){S.app.dept=e.target.value;S.app.size=PRODUCTS[e.target.value].sizes[0].s;S.app.notice='';renderDirectApp();return;}if(e.target.dataset&&e.target.dataset.field)S.o.fields[e.target.dataset.field]=e.target.value;
  if(e.target.id==='other-issue-note'&&S.o.issueError&&e.target.value.trim()&&e.target.value.trim().length<=500){
    S.o.issueError='';document.getElementById('other-issue-error').textContent='';e.target.setAttribute('aria-invalid','false');
    S.o.error=false;S.o.notice='';renderOps();
  }
  if(e.target.id==='contact-phone'){S.k.phone=e.target.value;S.k.error='';document.getElementById('phone-error').textContent='';e.target.setAttribute('aria-invalid','false');touch();}
});
document.addEventListener('change',function(e){if(e.target.dataset&&e.target.dataset.appField==='product'&&PRODUCTS[e.target.value]){S.app.dept=e.target.value;S.app.size=PRODUCTS[e.target.value].sizes[0].s;S.app.notice='';renderDirectApp();return;}if(e.target.dataset&&e.target.dataset.field)S.o.fields[e.target.dataset.field]=e.target.value;});
document.addEventListener('click',function(e){
  var t=e.target.closest('button,li');if(!t||t.disabled)return;if(t.dataset.app){directAppAction(t);return;}var k=S.k;
  if(t.dataset.mapAction){handleMapAction(t.dataset.mapAction);return;}
  if(t.dataset.op==='issue'&&t.dataset.id.endsWith(':other')){
    var code=t.dataset.id.split(':')[0],r=req(code);if(!r||r.status!=='searching'||r.issue||r.unitIds.length)return;
    S.sel=code;S.o.issueEditor=code;S.o.issueError='';S.toast='';renderHH();
    var note=document.getElementById('other-issue-note');if(note&&note.focus)note.focus();return;
  }
  if(t.dataset.op==='issue-cancel'){delete S.o.fields['issue-note-'+t.dataset.id];S.o.issueEditor=null;S.o.issueError='';S.o.error=false;S.o.notice='';S.toast='';renderHH();renderOps();return;}
  if(t.dataset.op){try{performOperation(t);S.o.error=false;S.o.notice='İşlem kaydedildi.';S.toast='İşlem kaydedildi.';}catch(error){S.o.error=true;S.o.notice=error.message;S.toast=error.message;if(t.dataset.op==='issue-save'){S.o.issueError=error.message;S.toast='';}}renderAll(false);return;}
  if(t.dataset.tab){S.o.tab=t.dataset.tab;S.o.notice='';renderOps();return;}
  if(t.dataset.filter!==undefined){S.o.dept=t.dataset.filter;renderOps();return;}
  if(t.dataset.demo==='account-qr'){kioskPair();renderAll();return;}
  if(t.dataset.lang&&I18N[t.dataset.lang]){S.lang=t.dataset.lang;renderAll();return;}
  if(t.dataset.k){
    var a=t.dataset.k;
    if(a==='scan'){if(k.mode==='entry')selectProduct(k.productRef);}
    else if(a==='entry'||a==='add'||a==='change-product'){k.mode='entry';k.selectedSize=null;k.error='';k.productRef='';k.mapExpanded=false;k.fromZara=false;k.msg='';}
    else if(a==='request'){if(k.mode==='scan')kioskCreate(k.selectedSize);}
    else if(a==='finish'){finishCart('none');}
    else if(a==='lookup'){k.mode='lookup';k.input='';k.found=null;k.msg='';}
    else if(a==='idle'){if((k.mode==='scan'||k.mode==='entry')&&k.cart.length)k.mode='created';else{clearSession();k.mode='idle';}k.input='';k.found=null;}
    else if(a==='pair'){k.pair=true;}
    else if(a==='created'){k.mode='created';k.pair=false;}
    else if(a==='notify'){k.mode='notify';}
    else if(a==='find'){var r=req(k.prefix+'-'+k.input);if(r){k.mode='result';k.found=r.code;}else k.found='none';}
    else if(a==='tag')k.found='tag';
    renderAll();return;
  }
  if(t.dataset.size){var z=PRODUCTS[k.category].sizes.find(function(z){return z.s===t.dataset.size;});if(!z||k.mode!=='scan')return;k.selectedSize=z.s;k.error='';k.mapExpanded=false;renderAll();return;}
  if(t.dataset.ch){kioskNotify(t.dataset.ch);renderAll();return;}
  if(t.dataset.pre){k.prefix=t.dataset.pre;k.found=null;renderKiosk();return;}
  if(t.dataset.d){if(t.dataset.d==='del')k.input=k.input.slice(0,-1);else if(k.input.length<9)k.input+=t.dataset.d;k.found=null;renderKiosk();return;}
  if(t.dataset.res){k.mode='result';k.found=t.dataset.res;renderKiosk();return;}
  if(t.dataset.view){S.view=t.dataset.view;renderAll(false);return;}
  if(t.dataset.tog){S[t.dataset.tog]=!S[t.dataset.tog];renderAll(false);return;}
  if(t.dataset.sel){S.sel=t.dataset.sel;S.toast='';renderHH();return;}
});
function stop(){stopPresentation();if(timer){clearTimeout(timer);timer=null;}document.getElementById('play').disabled=false;}
document.getElementById('reset').addEventListener('click',function(){stop();stopProductScanner(false);if(idleT)clearTimeout(idleT);S=initial();renderAll();});
document.getElementById('play').addEventListener('click',function(){
  startPresentation();
});
  S=initial(); renderAll();
initializePresentation();
setInterval(function(){
  var focused=document.activeElement;
  if(focused&&focused.closest&&focused.closest('input,select,textarea'))return;
  if(document.querySelector&&document.querySelector('#ops details[open]'))return;
  renderOps();renderAdv();if(!PRESENTATION.active)renderDirectApp();
},30000);
if(typeof window!=='undefined'&&window.addEventListener)window.addEventListener('storage',function(e){if(e.key===APP_REQUEST_RULE.key&&!PRESENTATION.active)renderDirectApp();});
