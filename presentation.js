// A separate, reversible demonstration session. The working prototype is restored on exit.
var PRESENTATION={active:false,index:0,playing:false,delay:6000,timer:null,saved:null,error:'',lang:typeof document!=='undefined'&&document.documentElement&&document.documentElement.getAttribute&&document.documentElement.getAttribute('data-presentation-lang')==='en'?'en':'tr'};
function presentationSeed(){
  var state=initial();state.ops=new Warehouse(catalog(),function(){return 1800702000000;});state.reqs=state.ops.requests;
  state.lang=PRESENTATION.lang;state.view=null;state.sel=null;state.k.mode='idle';state.k.cart=[];state.k.code=null;state.k.selectedSize=null;
  return state;
}
function presentationFound(code,tag){var r=req(code);S.ops.scanFound(code,{id:tag,ref:r.ref,color:r.color,size:r.size});}
function applyPresentationStep(id){
  var o=S.ops,k=S.k;
  if(id==='entry'){k.mode='entry';k.productRef='2298/047';}
  else if(id==='stock')selectProduct('2298/047','L','tag');
  else if(id==='no-stock')k.selectedSize='XS';
  else if(id==='request'){k.selectedSize='L';kioskCreate('L');}
  else if(id==='basket'){
    selectProduct('4387/242','M');kioskCreate('M');selectProduct('1200/001','6-7');kioskCreate('6-7');
  }
  else if(id==='contact')k.mode='notify';
  else if(id==='qr'){k.mode='created';k.pair=true;}
  else if(id==='app'){kioskPair();S.view='W-1';}
  else if(id==='lookup'){k.mode='result';k.found='W-1';}
  else if(id==='queue')S.sel='W-1';
  else if(id==='search'){o.start('W-1');}
  else if(id==='found'){o.offset+=4*60000;presentationFound('W-1','SUNUM-W1');}
  else if(id==='cart'){var c=o.createCart('W');o.load('W-1',c.id,'SUNUM-W1');S.o.tab='carts';}
  else if(id==='transit'){o.offset+=2*60000;o.dispatch('AR-1');}
  else if(id==='ready'){o.offset+=3*60000;o.arrive('AR-1','W');}
  else if(id==='delivered'){o.deliver('W-1');}
  else if(id==='collection-timeout'){
    var r=o.request(inventoryKey('W','L'),1);r.notify='app';o.start(r.code);presentationFound(r.code,'SUNUM-W2');
    var c=o.createCart('W');o.load(r.code,c.id,'SUNUM-W2');o.dispatch(c.id);o.arrive(c.id,'W');o.offset+=21*60000;o.expire(r.code);S.sel=r.code;S.view=r.code;
  }
  else if(id==='returned')o.returnUnit('W-2','SUNUM-W2');
  else if(id==='reasons'){o.start('M-1');S.sel='M-1';S.view='M-1';}
  else if(id==='other-note'){S.o.issueEditor='M-1';S.o.fields['issue-note-M-1']='Ürünün etiketi okunamadı. Referans ve beden tekrar kontrol edilecek.';}
  else if(id==='second-search'){
    o.reportIssue('M-1','other',S.o.fields['issue-note-M-1']);S.o.issueEditor=null;o.secondSearch('M-1');
  }
  else if(id==='unavailable'){o.reportIssue('M-1','stock');o.closeUnavailable('M-1');}
  else if(id==='count'){o.resolveTask('KONTROL-1',0,'Fiziksel sayım tamamlandı. Ürün depoda bulunamadı.');S.o.tab='controls';}
  else if(id==='floor-check'){o.start('K-1');o.reportIssue('K-1','floor');o.assign('K-1','Destek ekibi');S.sel='K-1';S.view='K-1';}
  else if(id==='damaged'){
    var r=o.request(inventoryKey('M','L'),1);r.notify='app';o.start(r.code);o.reportIssue(r.code,'defect');o.closeUnavailable(r.code);S.view=r.code;
  }
  else if(id==='manager-queue'){
    o.request(inventoryKey('W','XXL'),1);o.request(inventoryKey('M','S'),1);o.offset+=12*60000;S.o.tab='queue';
  }
  else if(id==='capacity'){S.busy=true;S.closed=true;}
  else if(id==='online'){S.busy=false;S.closed=false;o.reserveOnline(inventoryKey('W','XXL'),1,'WEB-ORNEK-1');S.o.tab='stock';}
  else if(id==='replenish'){o.replenish(inventoryKey('W','M'),1,'W1T1');S.o.tab='replenish';}
  else if(id==='replenished'){o.completeReplenishment('REYON-1','W1T1');selectProduct('2298/047','M');}
  else if(id==='handover'){o.handover('Sabah','Akşam','K-1 için reyon kontrolü sürüyor. Hasarlı erkek ürünü için stok kontrolü açık.');S.o.tab='handover';}
  else if(id==='accepted'){o.acceptHandover('DEVIR-1','Akşam');}
  else if(id==='app-product')S.app=newAppState();
  else if(id==='app-basket'){appAdd();S.app.dept='M';S.app.size='S';appAdd();}
  else if(id==='app-wifi')S.app.network={verified:true,storeId:STORE_CONTEXT.id,account:'demo-zara-account'};
  else if(id==='app-submit')appSubmit();
  else if(id==='app-queue'){S.sel=S.app.sent[0];S.view=S.sel;}
  else if(id==='app-ready'){
    var code=S.app.sent[0];o.start(code);presentationFound(code,'SUNUM-APP-W');var cart=o.createCart('W');o.load(code,cart.id,'SUNUM-APP-W');o.dispatch(cart.id);o.arrive(cart.id,'W');
  }
  else if(id==='app-delivered')o.deliver(S.app.sent[0]);
  else if(id==='app-limit'){
    var now=Date.now();S.app.rateMemory=JSON.stringify({version:1,account:'demo-zara-account',lastAt:now,events:[{at:now-60000,qty:8,storeId:STORE_CONTEXT.id},{at:now,qty:2,storeId:STORE_CONTEXT.id}]});
    S.app.dept='W';S.app.size='L';appAdd();
  }
}
function presentationPanel(id,className){return '<div class="'+className+'">'+document.getElementById(id).innerHTML+'</div>';}
function presentationPitch(key){return esc(PRESENTATION_COPY.page[key][PRESENTATION.lang==='en'?1:0]);}
function presentationWifi(){return '<aside class="pitch-wifi"><strong>'+presentationPitch('wifiTitle')+'</strong><p>'+presentationPitch('wifiBody')+'</p></aside>';}
function presentationView(slide){
  if(slide.view==='direct-app')return directAppMarkup();
  if(slide.view==='options')return '<div class="pitch-options"><article><small>'+appText('1. SEÇENEK','OPTION 1')+'</small><h3>'+appText('Mağazadaki ekran','In-store screen')+'</h3><p>'+appText('Etiket veya referansla kolay başlangıç. Bildirim tercihi müşteride. Uygulama kullanmayan müşteriler için de erişim.','An easy start with a label or reference. Customers choose how to receive updates. Access remains available without the app.')+'</p></article><article><small>'+appText('2. SEÇENEK','OPTION 2')+'</small><h3>'+appText('Zara uygulaması','Zara app')+'</h3><p>'+appText('Mevcut hesapla, yeniden kişisel bilgi girmeden. Depoya gönderim yalnızca ilgili mağazanın doğrulanmış Zara Wi-Fi bağlantısıyla.','Use an existing account without entering personal details again. Submission requires verified Zara Wi-Fi at the selected store.')+'</p></article></div>'+presentationWifi();
  if(slide.view==='adviser')return '<div class="pitch-adviser"><h3>'+appText('Satış danışmanından müşteriye','From the sales adviser to the customer')+'</h3><blockquote>'+presentationPitch('adviserQuote')+'</blockquote><p>'+appText('Müşteri kendi hesabıyla ilerler. Danışman ihtiyaç olduğunda destek verir; müşterinin hesabına giriş yapmaz.','Customers use their own accounts. Advisers help when needed without signing into the customer’s account.')+'</p></div>';
  if(slide.view==='overview')return '<div class="pitch-next"><h3>'+appText('İki giriş, ortak takip.','Two ways in. One shared record.')+'</h3><div class="pitch-value-list">'+['customer','adviser','manager'].map(function(key){return '<article><strong>'+presentationPitch(key+'ValueTitle')+'</strong><p>'+presentationPitch(key+'Value')+'</p></article>';}).join('')+'</div>'+presentationWifi()+'<p class="pitch-footnote">'+appText('Hedeflenen kazanımlar mağaza denemesinde ölçülecektir.','The intended benefits will be measured in a store trial.')+'</p></div>';
  if(slide.view==='brand-fit')return '<div class="pitch-next pitch-fit"><h3>'+presentationPitch('fitHeading')+'</h3><dl><div><dt>'+appText('Mevcut hizmetler','Existing services')+'</dt><dd>'+appText('Zara Wi-Fi: cihaz sertifikasıyla bağlantı.<br>Click and Find: ürünün mağaza krokisindeki yeri.','Zara Wi-Fi: a device-certificate connection.<br>Click and Find: the item’s location on the store map.')+'</dd></div><div><dt>'+appText('Önerilen katkı','Proposed addition')+'</dt><dd>'+appText('Depodan ürün talebi ve durum takibi.<br>Ortak iş sırası ve kapasite kontrolü.','Stockroom requests and status tracking.<br>A shared queue and capacity controls.')+'</dd></div></dl><p class="pitch-footnote">'+presentationPitch('fitNote')+'</p><p class="pitch-footnote">'+appText('Kaynak: Zara Wi-Fi (Türkiye), Store Mode (Malezya). Hizmet kapsamı mağaza ve pazara göre doğrulanmalıdır.','Sources: Zara Wi-Fi (Türkiye), Store Mode (Malaysia). Service availability must be checked for each store and market.')+'</p></div>';
  if(slide.view==='next')return '<div class="pitch-next"><h3>'+appText('Tek bölümde, ölçülebilir bir deneme.','A measurable trial in one department.')+'</h3><dl><div><dt>'+appText('Müşteri ve danışman','Customer and adviser')+'</dt><dd>'+appText('Bekleme deneyimi<br>Tekrar eden durum soruları<br>Doğru noktaya yönlendirme','Waiting experience<br>Repeated status questions<br>Correct collection-point guidance')+'</dd></div><div><dt>'+appText('Depo ve yönetim','Stockroom and management')+'</dt><dd>'+appText('Arama ve teslim süresi<br>Tekrar eden stok sorunları<br>Vardiyada devreden işler','Search and collection time<br>Recurring stock issues<br>Tasks carried over between shifts')+'</dd></div></dl><p>'+appText('Başlangıç koşulları: onaylı stok ve hesap bağlantısı, mağaza Wi-Fi doğrulaması, merkezi 15 dakika / 10 ürün kontrolü.','Prerequisites: approved stock and account integration, store Wi-Fi verification and a central limit of 10 items in 15 minutes.')+'</p><p class="pitch-end">'+appText('Hedefim, müşteriye daha anlaşılır bir hizmet sunarken mağaza ekibinin işini kolaylaştırmak.','My aim is clearer service for customers and a simpler process for the store team.')+'</p></div>';
  if(slide.view==='map')return '<div class="presentation-map">'+routeDetails(mapRoute(null,currentMapLocations(),true))+referenceMapSvg()+'</div>';
  if(slide.view==='kiosk')return presentationPanel('kmain','kmain presentation-kiosk');
  if(slide.view==='phone')return presentationPanel('phone','phone');
  if(slide.view==='hh'||slide.view==='reasons')return '<div class="hh">'+presentationPanel('hh','scr')+'</div>';
  if(slide.view==='search')return '<div class="presentation-pair"><div class="hh">'+presentationPanel('hh','scr')+'</div>'+presentationPanel('phone','phone')+'</div>';
  if(slide.view==='notification')return '<div class="presentation-pair">'+presentationPanel('phone','phone')+presentationPanel('notif','notif')+'</div>';
  if(slide.view==='manager'){
    var source=document.getElementById('ops');
    if(!source.querySelector)return '<div class="operations">'+source.innerHTML+'</div>';
    var panel=source.querySelector('.op-panel').cloneNode(true),metrics=source.querySelector('.op-metrics');
    panel.querySelectorAll('.op-split').forEach(function(el){el.remove();});
    // Keep the relevant completed operation in view during automatic playback.
    if(slide.id==='online'){
      panel.querySelectorAll('tbody tr').forEach(function(row){if(!row.textContent.includes('2298/047')||!row.textContent.includes('XXL'))row.remove();});
      panel.querySelector('.op-form.inline').remove();
    }
    if(slide.id==='replenish')panel.querySelector('.op-cards').remove();
    if(slide.id==='handover'||slide.id==='accepted')panel.querySelector('.op-form.inline').remove();
    return '<div class="presentation-ops operations">'+(slide.id==='manager-queue'?metrics.outerHTML:'')+panel.outerHTML+'</div>';
  }
  return '';
}
function clearPresentationTimer(){if(PRESENTATION.timer!==null)clearTimeout(PRESENTATION.timer);PRESENTATION.timer=null;}
function schedulePresentation(){
  clearPresentationTimer();if(!PRESENTATION.active||!PRESENTATION.playing)return;
  PRESENTATION.timer=setTimeout(function(){
    if(PRESENTATION.index<PRESENTATION_SLIDES.length-1)goPresentation(PRESENTATION.index+1);
    else {PRESENTATION.playing=false;renderPresentationControls();}
  },PRESENTATION.delay);
}
function renderPresentationControls(){
  var p=PRESENTATION,dialog=document.getElementById('presentation-dialog'),count=PRESENTATION_SLIDES.length;
  document.getElementById('presentation-toggle').textContent=p.playing?appText('Duraklat','Pause'):p.index===count-1?appText('Baştan oynat','Restart'):appText('Devam et','Resume');
  document.getElementById('presentation-position').textContent=(p.index+1)+' / '+count+(p.index===count-1?appText(' · Sunum tamamlandı',' · Presentation complete'):p.playing?appText(' · Oynatılıyor',' · Playing'):appText(' · Duraklatıldı',' · Paused'));
  document.getElementById('presentation-jump').value=String(p.index);
  document.getElementById('presentation-speed').value=String(p.delay);
  var progress=document.getElementById('presentation-progress');progress.setAttribute('aria-valuemin','1');progress.setAttribute('aria-valuemax',String(count));progress.setAttribute('aria-valuenow',String(p.index+1));
  if(progress.querySelector)progress.querySelector('span').style.width=(p.index+1)/count*100+'%';
  if(dialog.querySelector){dialog.querySelector('[data-presentation="previous"]').disabled=p.index===0;dialog.querySelector('[data-presentation="next"]').disabled=p.index===count-1;}
}
function goPresentation(index){
  var p=PRESENTATION;if(!p.active||!Number.isInteger(index)||index<0||index>=PRESENTATION_SLIDES.length)return;
  clearPresentationTimer();stopKioskTransition();stopProductScanner(false);if(idleT)clearTimeout(idleT);
  try{
    S=presentationSeed();for(var i=0;i<=index;i++)applyPresentationStep(PRESENTATION_SLIDES[i].id);
    p.index=index;p.error='';renderAll(false);
    var slide=presentationSlide(index);
    document.getElementById('presentation-chapter').textContent=slide.chapter;
    document.getElementById('presentation-title').textContent=slide.title;
    document.getElementById('presentation-body').textContent=slide.body;
    document.getElementById('presentation-screen-label').textContent=slide.label;
    var stage=document.getElementById('presentation-stage');stage.innerHTML=presentationView(slide);translatePresentationStage(stage);
    if(stage.querySelectorAll){
      stage.querySelectorAll('[id]').forEach(function(el){el.removeAttribute('id');});
      stage.querySelectorAll('dialog').forEach(function(el){el.remove();});
      if(slide.view==='reasons')stage.querySelectorAll('details').forEach(function(el){el.open=true;});
      if(slide.id==='accepted')stage.querySelectorAll('details').forEach(function(el){el.open=true;});
      stage.scrollTop=0;if(stage.parentElement)stage.parentElement.scrollTop=0;
    }
    if(index===PRESENTATION_SLIDES.length-1)p.playing=false;
    renderPresentationControls();schedulePresentation();
  }catch(error){p.playing=false;p.error=error.message;document.getElementById('presentation-body').textContent=appText('Bu adım açılamadı. Önceki adıma dönebilir veya sunumdan çıkabilirsiniz.','This slide could not be opened. Go back or exit the presentation.');renderPresentationControls();}
}
function startPresentation(){
  var p=PRESENTATION;if(p.active)return;
  stopProductScanner(false);stopKioskTransition();if(idleT)clearTimeout(idleT);
  p.saved=S;p.active=true;p.playing=true;p.index=0;p.error='';
  var dialog=document.getElementById('presentation-dialog');
  if(typeof dialog.showModal==='function')dialog.showModal();
  goPresentation(0);
}
function stopPresentation(){
  var p=PRESENTATION;if(!p.active)return;
  clearPresentationTimer();p.active=false;p.playing=false;
  var dialog=document.getElementById('presentation-dialog');if(typeof dialog.close==='function'&&dialog.open)dialog.close();
  if(p.ownsFullscreen&&document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(function(){});
  p.ownsFullscreen=false;if(dialog.classList)dialog.classList.remove('presentation-expanded');
  document.getElementById('presentation-stage').innerHTML='';
  if(p.saved){S=p.saved;p.saved=null;renderAll();}
  var play=document.getElementById('play');if(play.focus)play.focus({preventScroll:true});
}
function presentationAction(action){
  var p=PRESENTATION;if(!p.active)return;
  if(action==='close'){stopPresentation();return;}
  if(action==='fullscreen'){
    var el=document.getElementById('presentation-dialog'),root=document.documentElement;
    if(document.fullscreenElement){document.exitFullscreen().catch(function(){});p.ownsFullscreen=false;}
    else if(el.classList.contains('presentation-expanded'))el.classList.remove('presentation-expanded');
    else if(root.requestFullscreen){
      root.requestFullscreen().then(function(){
        if(!p.active){if(document.fullscreenElement===root)document.exitFullscreen().catch(function(){});return;}
        p.ownsFullscreen=true;
        // Restore the modal above the newly added fullscreen layer.
        var focused=document.activeElement;
        if(el.open){el.close();el.showModal();if(focused&&el.contains(focused))focused.focus({preventScroll:true});}
      }).catch(function(){if(p.active)el.classList.add('presentation-expanded');});
    }
    else el.classList.add('presentation-expanded');
    return;
  }
  if(action==='previous'||action==='next'){p.playing=false;goPresentation(p.index+(action==='next'?1:-1));return;}
  if(action==='toggle'){
    if(p.index===PRESENTATION_SLIDES.length-1){p.playing=true;goPresentation(0);return;}
    p.playing=!p.playing;renderPresentationControls();schedulePresentation();
  }
}
function initializePresentation(){
  initializePresentationLanguage();
  var select=document.getElementById('presentation-jump');
  var dialog=document.getElementById('presentation-dialog');
  dialog.addEventListener('click',function(e){var button=e.target.closest('[data-presentation]');if(button)presentationAction(button.dataset.presentation);});
  dialog.addEventListener('cancel',function(e){e.preventDefault();stopPresentation();});
  dialog.addEventListener('keydown',function(e){
    if(e.target.closest('select,input,textarea'))return;
    if(e.key===' '&&e.target.closest('button'))return;
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'||e.key===' '){e.preventDefault();presentationAction(e.key===' '?'toggle':e.key==='ArrowRight'?'next':'previous');}
  });
  document.getElementById('presentation-speed').addEventListener('change',function(e){var delay=Number(e.target.value);if([6000,10000,15000].indexOf(delay)<0)return;PRESENTATION.delay=delay;schedulePresentation();});
  select.addEventListener('change',function(e){PRESENTATION.playing=false;goPresentation(Number(e.target.value));});
  document.addEventListener('visibilitychange',function(){if(document.hidden&&PRESENTATION.active){PRESENTATION.playing=false;clearPresentationTimer();renderPresentationControls();}});
}
