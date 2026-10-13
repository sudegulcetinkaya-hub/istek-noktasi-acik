  // Customer screens. Staff tools and presentation notes retain their Turkish language.
  function tr(key, values){
    var dictionary=I18N[S.lang]||I18N.tr;
    var text=dictionary[key];
    if(typeof text!=='string')throw new Error('Missing translation: '+S.lang+'/'+key);
    return text.replace(/\{(\w+)\}/g,function(_,name){return values&&values[name]!==undefined?String(values[name]):'';});
  }
  function codeText(value){return '<bdi dir="ltr">'+esc(value)+'</bdi>';}
  function customerElement(id){
    var el=document.getElementById(id);
    el.setAttribute('lang',S.lang); el.setAttribute('dir',S.lang==='ar'?'rtl':'ltr');
    return el;
  }
  function localizedProduct(product,category,field){
    return product[field+'Translations']&&product[field+'Translations'][S.lang] || product[field] || tr((field==='name'?'product_':'color_')+category);
  }
  function parseLocation(code){
    var m=/^([WMK])(\d+)([WTC])(\d+)$/i.exec(String(code));
    if(!m||Number(m[2])<1||Number(m[4])<1)return null;
    return {department:m[1].toUpperCase(),section:Number(m[2]),type:{W:'wall',T:'table',C:'rail'}[m[3].toUpperCase()],number:Number(m[4]),code:m[0].toUpperCase()};
  }
  function locationLabel(location){
    var parsed=parseLocation(location.code);
    if(!parsed)return tr('locationUnknown');
    return tr('section',{dept:tr(parsed.department),n:parsed.section})+' · '+tr(parsed.type,{n:parsed.number});
  }
  function floorQuantity(size){return (size.floor||[]).reduce(function(sum,loc){return sum+Math.max(0,Number(loc.qty)||0);},0);}
  function selectedInventory(){var product=PRODUCTS[S.k.category];return product&&product.sizes.find(function(size){return size.s===S.k.selectedSize;});}
  function canRequest(size){return !!size&&!S.closed&&availableForSize(S.k.category,size)>0;}
  function renderFixtureMap(locations){
    var selected=locations.filter(function(loc){return Number(loc.qty)>0;});
    if(!selected.length)return '';
    var plan=STORE_PLAN;
    var fixtures=plan&&Array.isArray(plan.fixtures)?plan.fixtures:[];
    var matched=selected.filter(function(loc){return parseLocation(loc.code)&&fixtures.some(function(f){return String(f.code).toUpperCase()===String(loc.code).toUpperCase();});});
    var h='<div class="store-map"><b>'+tr('mapTitle')+'</b>';
    selected.forEach(function(loc){h+='<p class="location-line">'+esc(locationLabel(loc))+' · <strong>'+esc(tr('units',{n:loc.qty}))+'</strong></p>';});
    if(!plan||(!plan.sample&&!plan.imageUrl)||!matched.length){return h+'<p class="map-note">'+tr('missingMap')+'</p></div>';}
    var width=Number(plan.width)||600,height=Number(plan.height)||360;
    h+='<svg class="floor-plan" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+esc(tr('mapTitle')+': '+matched.map(locationLabel).join('; '))+'" dir="ltr">';
    if(plan.imageUrl){h+='<image href="'+esc(plan.imageUrl)+'" x="0" y="0" width="'+width+'" height="'+height+'" preserveAspectRatio="xMidYMid meet"/>';}
    else {
      h+='<rect x="8" y="8" width="584" height="344" rx="8" fill="#fff" stroke="#C9C9C2" stroke-width="3"/>';
      ['W','M','K'].forEach(function(p,i){var x=20+i*194;h+='<rect x="'+x+'" y="20" width="174" height="266" rx="4" fill="#F1F1ED"/><text x="'+(x+87)+'" y="47" text-anchor="middle" fill="#121316" font-size="17">'+esc(tr(p))+'</text>';});
      h+='<path d="M265 352H335" stroke="#fff" stroke-width="6"/><text x="300" y="328" text-anchor="middle" fill="#6B6C71" font-size="16">'+tr('entrance')+'</text>';
    }
    fixtures.forEach(function(f){
      var active=matched.some(function(loc){return String(loc.code).toUpperCase()===String(f.code).toUpperCase();});
      if(!active&&!plan.sample)return;
      var coords=[f.x,f.y,f.width,f.height].map(Number);
      if(!coords.every(Number.isFinite)||coords[2]<=0||coords[3]<=0)return;
      h+='<rect class="map-fixture'+(active?' active':'')+'" x="'+coords[0]+'" y="'+coords[1]+'" width="'+coords[2]+'" height="'+coords[3]+'" rx="3" fill="'+(active?'var(--accent)':'#DEDED8')+'" fill-opacity="'+(active&&!plan.sample?'.85':'1')+'" stroke="'+(active?'var(--accent)':'#B9B9B2')+'" stroke-width="'+(active?'3':'1')+'"/>';
      if(active)h+='<text x="'+(coords[0]+coords[2]/2)+'" y="'+(coords[1]+coords[3]/2+6)+'" text-anchor="middle" fill="#FFFFFF" font-size="20" font-weight="700">●</text>';
    });
    h+='</svg><div class="map-key"><i aria-hidden="true"></i>'+tr('highlight')+'</div>';
    if(matched.length!==selected.length)h+='<p class="map-note">'+tr('missingMap')+'</p>';
    return h+'</div>';
  }
  function kHead(){
    var names={tr:'Türkçe',en:'English',ar:'العربية',ru:'Русский',es:'Español'};
    return '<div class="khead"><span>'+tr('point')+'</span><div class="lang" role="group" aria-label="'+tr('language')+'" dir="ltr">'+Object.keys(names).map(function(lang){return '<button type="button" data-lang="'+lang+'" lang="'+lang+'" title="'+names[lang]+'" aria-label="'+names[lang]+'" aria-pressed="'+(S.lang===lang)+'">'+lang.toUpperCase()+'</button>';}).join('')+'</div></div>';
  }
  function customerStatusLine(r){
    if(r.status==='received')return tr('receivedText');
    if(r.issue&&r.status==='searching')return tr('reviewText');
    if(r.status==='found')return tr('foundText');
    if(r.status==='return_pending')return tr('returnPendingText');
    if(r.status==='returned')return tr('returnedText');
    if(r.status==='tour')return tr('tourText');
    if(r.status==='ready')return tr('readyText',{department:tr(r.dept)});
    if(r.status==='cancelled')return tr('reason_'+r.reason);
    if(r.status==='expired')return tr('expiredText');
    if(r.status==='delivered')return tr('deliveredText');
    return tr('waiting')+(S.busy?' '+tr('busy'):'');
  }
  function departmentButtons(attribute,prefix){
    return '<div class="kpre">'+['W','M','K'].filter(function(p){return attribute!=='category'||PRODUCTS[p];}).map(function(p){return '<button type="button" data-'+attribute+'="'+p+'" aria-pressed="'+(prefix===p)+'">'+p+'<small>'+tr(p)+'</small></button>';}).join('')+'</div>';
  }
  var kioskTransition=null;
  function stopKioskTransition(){if(kioskTransition)kioskTransition.finish(false);}
  function focusKioskDestination(el,mode){
    if(!el.querySelector)return;
    var target=el.querySelector(mode==='entry'?'.reference-search h2':'.kpre button');
    if(target){if(mode==='entry')target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
  }
  function renderKioskContent(el,html,mode){
    var previous=el.getAttribute&&el.getAttribute('data-screen');
    stopKioskTransition();
    var outgoingHtml=el.innerHTML;
    el.innerHTML=html;el.setAttribute('data-screen',mode);
    if(typeof PRESENTATION!=='undefined'&&PRESENTATION.active)return;
    if(previous!=='idle'||(mode!=='entry'&&mode!=='lookup'))return;
    if(typeof el.animate!=='function'||typeof window==='undefined'||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)){
      focusKioskDestination(el,mode);return;
    }
    var height=el.getBoundingClientRect().height;
    var incoming=document.createElement('div');incoming.className='kiosk-slide-incoming';
    while(el.firstChild)incoming.appendChild(el.firstChild);
    var outgoing=document.createElement('div');outgoing.className='kiosk-slide-outgoing';outgoing.innerHTML=outgoingHtml;outgoing.inert=true;outgoing.setAttribute('aria-hidden','true');
    var brand=document.createElement('div');brand.className='kiosk-slide-brand';brand.setAttribute('aria-hidden','true');brand.innerHTML='<img src="'+ZARA_TRANSITION_LOGO+'" alt="" width="1000" height="421" draggable="false">';
    var minHeight=el.style.minHeight;
    el.style.minHeight=height+'px';el.classList.add('kiosk-transitioning');el.inert=true;
    el.append(incoming,outgoing,brand);
    var animations=[],fallback,finished=false,transition={finish:function(focus){
      if(finished)return;finished=true;clearTimeout(fallback);
      animations.forEach(function(animation){animation.cancel();});
      outgoing.remove();brand.remove();
      while(incoming.firstChild)el.insertBefore(incoming.firstChild,incoming);
      incoming.remove();el.inert=false;el.classList.remove('kiosk-transitioning');el.style.minHeight=minHeight;
      if(kioskTransition===transition)kioskTransition=null;
      if(focus)focusKioskDestination(el,mode);
    }};
    kioskTransition=transition;
    // The destination is already rendered; the animation never creates or delays a request.
    var rtl=S.lang==='ar',enter=rtl?'-100%':'100%',leave=rtl?'100%':'-100%',ease='cubic-bezier(.22,.7,.2,1)',options={duration:860,easing:'linear',fill:'both'};
    try{
      animations.push(outgoing.animate([{transform:'translateX(0)',easing:ease},{transform:'translateX('+leave+')',offset:.64},{transform:'translateX('+leave+')'}],options));
      animations.push(brand.animate([{transform:'translateX('+enter+')',easing:ease},{transform:'translateX(0)',offset:.3},{transform:'translateX(0)',offset:.62,easing:ease},{transform:'translateX('+leave+')'}],options));
      animations.push(incoming.animate([{transform:'translateX('+enter+')'},{transform:'translateX('+enter+')',offset:.55,easing:ease},{transform:'translateX(0)'}],options));
      animations.push(brand.firstChild.animate([{opacity:0,transform:'scale(.96)'},{opacity:1,transform:'scale(1)',offset:.32},{opacity:1,offset:.7},{opacity:0}],options));
      Promise.all(animations.map(function(animation){return animation.finished;})).then(function(){transition.finish(true);},function(){transition.finish(false);});
      fallback=setTimeout(function(){transition.finish(true);},1100);
    }catch(error){transition.finish(true);}
  }
  if(typeof window!=='undefined'&&window.addEventListener)window.addEventListener('pagehide',stopKioskTransition);
  function renderKiosk(customerActivity){
    var el=customerElement('kmain'),k=S.k,product=PRODUCTS[k.category],h=kHead();
    document.getElementById('simulateAccountScan').hidden=!(k.mode==='created'&&k.pair);
    if(S.closed)h+='<div class="kbanner">'+tr('closed')+'</div>';
    if(k.mode==='idle'){
      if(k.msg)h+='<div class="kmsg" role="status">'+esc(tr(k.msg.key,k.msg.values))+'</div>';
      h+='<div class="kbig home-actions"><button type="button" class="home-request" data-k="entry"><strong>'+tr('request')+'</strong><small>'+tr('referenceHelp')+'</small></button><button type="button" data-k="lookup"><strong>'+tr('lookup')+'</strong><small>'+tr('lookupHelp')+'</small></button></div><div class="kfoot">'+tr('homeFoot')+'</div>';
    }
    else if(k.mode==='entry'){
      h+='<div class="reference-search"><h2>'+tr('referencePrompt')+'</h2><p>'+tr('referenceHelp')+'</p><label for="product-reference">'+tr('referenceLabel')+'</label><div class="reference-input-row"><input id="product-reference" type="text" inputmode="text" autocomplete="off" spellcheck="false" dir="ltr" maxlength="40" placeholder="2298/047" value="'+esc(k.productRef||'')+'" aria-describedby="reference-error" aria-invalid="'+(k.error==='referenceError')+'"><button type="button" class="scanner-trigger" data-scanner="open" aria-label="'+tr('scannerTitle')+'" title="'+tr('scannerTitle')+'" aria-haspopup="dialog">'+scannerIcon()+'</button></div><p id="reference-error" role="alert">'+(k.error==='referenceError'?tr('referenceError'):'')+'</p><button type="button" class="reference-submit" data-k="scan">'+tr('referenceSearch')+'</button></div>';
      if(k.cart.length)h+='<div class="kmsg">'+tr('cart',{n:k.cart.length})+'<div class="kacts"><button type="button" data-k="created">'+tr('back')+'</button></div></div>';
      else h+='<div class="kacts"><button type="button" data-k="idle">'+tr('back')+'</button></div>';
    }
    else if(k.mode==='scan'){
      h+='<div class="scan-grid"><div class="scan-selection">';
      if(k.cart.length)h+='<div class="kmsg">'+tr('cart',{n:k.cart.length})+' · '+k.cart.map(codeText).join(', ')+'</div>';
      h+='<div class="kprod"><div class="sw" aria-hidden="true"></div><div><b>'+esc(localizedProduct(product,k.category,'name'))+'</b><span>'+codeText(product.ref)+' · '+esc(localizedProduct(product,k.category,'color'))+'</span></div></div>';
      h+='<div class="sizes" data-count="'+product.sizes.length+'" role="group" aria-label="'+tr('size')+'">';
      product.sizes.forEach(function(z){
        var floor=currentFloorQuantity(k.category,z),warehouse=availableForSize(k.category,z);
        var text=warehouse>0&&floor>0?tr('bothStock'):warehouse>0?tr('warehouse'):floor>0?tr('floor'):S.ops.item(inventoryKey(k.category,z.s)).warehouse>0?tr('reserved'):tr('none');
        h+='<button type="button" class="'+(floor>0?'floor':warehouse>0?'':'off')+'" data-size="'+esc(z.s)+'" aria-pressed="'+(k.selectedSize===z.s)+'">'+codeText(z.s)+'<small>'+text+'</small></button>';
      });
      h+='</div><div class="inventory" aria-live="polite">';
      var z=selectedInventory();
      if(z){
        var floor=currentFloorQuantity(k.category,z),warehouse=availableForSize(k.category,z);
        h+='<dl class="stock-summary"><div class="stock-place'+(floor>0?'':' is-empty')+'" data-stock="floor"><dt>'+tr('stockFloor')+'</dt><dd>'+esc(tr('units',{n:floor}))+'</dd></div><div class="stock-place'+(warehouse>0?'':' is-empty')+'" data-stock="warehouse"><dt>'+tr('availableWarehouse')+'</dt><dd>'+esc(tr('units',{n:Math.max(0,warehouse)}))+'</dd></div></dl>';
        if(S.ops.underReview(inventoryKey(k.category,z.s)))h+='<div class="kmsg dash"><b>'+tr('stockUnderReview')+'</b></div>';
        else if(floor===0&&warehouse<=0)h+='<div class="kmsg dash"><b>'+tr(S.ops.item(inventoryKey(k.category,z.s)).warehouse>0?'reservedStock':'noStock')+'</b></div>';
      }else h+='<p class="ksub">'+tr('chooseSize')+'</p>';
      var locations=currentMapLocations();
      if(locations.length)h+='<button type="button" class="location-link" data-map-action="expand" aria-haspopup="dialog">'+tr('viewLocation')+' <span aria-hidden="true">↗</span></button>';
      if(k.error==='stockChanged')h+='<div class="kmsg" role="alert">'+tr('stockChanged')+'</div>';
      h+='</div><div class="kacts"><button type="button" class="solid" data-k="request" '+(canRequest(z)?'':'disabled')+'>'+tr('request')+'</button><button type="button" data-k="change-product">'+tr('changeProduct')+'</button></div></div></div>';
      if(k.mapExpanded)h+=renderMap(locations);
    }
    else if(k.mode==='created'){
      var r=req(k.code); if(!r){clearSession();k.mode='idle';renderKiosk();return;}
      h+='<div class="receipt-message" role="status"><b>'+tr('requestReceived')+'</b><p>'+tr('arrivalEstimate')+'</p></div>';
      if(r.storeName)h+='<p class="request-store">'+esc(tr('requestStore',{store:r.storeName}))+'</p>';
      h+='<div class="kcode">'+codeText(r.code)+'</div><div class="ksub">'+codeText(r.ref)+' · '+tr('size')+' '+codeText(r.size)+' · '+tr('codeHelp')+'</div>';
      h+='<div class="kmsg"><b>'+tr('cart',{n:k.cart.length})+'</b><ul>'+k.cart.map(function(code){var item=req(code);return '<li>'+codeText(code)+' · '+tr(code.charAt(0))+' · '+codeText(item.ref)+' · '+tr('size')+' '+codeText(item.size)+'</li>';}).join('')+'</ul><div class="kacts"><button type="button" data-k="add">'+tr('add')+'</button></div></div>';
      if(k.pair){h+='<section class="account-reader" aria-labelledby="account-reader-title"><div class="reader-target" aria-hidden="true"><span class="reader-phone"></span></div><div><b id="account-reader-title">'+tr('scanApp')+'</b><p>'+tr('pairText')+'</p><p class="reader-status" role="status"><i aria-hidden="true"></i>'+tr('readerWaiting')+'</p><p class="reader-hint">'+tr('readerHint')+'</p></div></section><div class="kacts"><button type="button" data-k="created">'+tr('back')+'</button></div>';}
      else h+='<p class="notification-question">'+tr('notificationQuestion')+'</p><div class="kopts"><button type="button" class="solid" data-k="pair">'+tr('pair')+'<small>'+tr('pairHelp')+'</small></button><button type="button" data-k="notify">'+tr('notify')+'<small>'+tr('notifyHelp')+'</small></button><button type="button" data-k="finish">'+tr('codesEnough')+'<small>'+tr('codesEnoughHelp')+'</small></button></div>';
      h+='<div class="kfoot">'+tr('createdFoot')+'</div>';
    }
    else if(k.mode==='notify'){
      h+='<div class="kcode" style="font-size:34px">'+codeText(k.code)+'</div><div class="ksub">'+tr('whereNotify')+'</div>';
      h+='<label for="contact-phone">'+tr('phoneLabel',{n:k.cart.length})+'</label><input class="kfield" id="contact-phone" type="tel" dir="ltr" inputmode="tel" autocomplete="off" maxlength="20" placeholder="+90 5XX XXX XX XX" value="'+esc(k.phone)+'" aria-invalid="'+Boolean(k.error)+'" aria-describedby="phone-info phone-error"><p class="aydin" id="phone-info">'+tr('phoneInfo')+'</p><p id="phone-error" role="alert">'+(k.error?tr(k.error):'')+'</p><div class="kacts"><button type="button" class="solid" data-ch="wa">'+tr('allWhatsApp')+'</button><button type="button" class="solid" data-ch="sms">'+tr('allSMS')+'</button><button type="button" data-k="created">'+tr('back')+'</button></div><div class="kfoot">'+tr('phoneFoot')+'</div>';
    }
    else if(k.mode==='lookup'){
      h+='<div class="klook"><div>'+departmentButtons('pre',k.prefix)+'<div class="kdisp" dir="ltr">'+esc(k.prefix+'-'+k.input)+'<span style="color:#C9C9C2">'+(k.input?'':'_')+'</span></div><div class="kpad" dir="ltr">';
      ['1','2','3','4','5','6','7','8','9'].forEach(function(d){h+='<button type="button" data-d="'+d+'">'+d+'</button>';});
      h+='<button type="button" data-d="del" aria-label="'+tr('delete')+'">⌫</button><button type="button" data-d="0">0</button><button type="button" class="solid" data-k="find">'+tr('find')+'</button></div></div><div><div class="kacts"><button type="button" data-k="tag">'+tr('scanTag')+'</button><button type="button" data-k="idle">'+tr('back')+'</button></div>';
      if(k.found==='none')h+='<div class="kmsg dash">'+tr('noRequest')+'</div>';
      if(k.found==='tag'){
        h+='<div class="ksub">'+tr('tagResults')+' · '+codeText(product.ref)+'</div><ul class="klist">';
        S.reqs.filter(function(r){return r.ref===product.ref;}).forEach(function(r){h+='<li><button type="button" data-res="'+r.code+'">'+codeText(r.code)+' · '+codeText(r.size)+' · '+tr(r.status)+'</button></li>';});
        h+='</ul>';
      }
      h+='</div></div><div class="kfoot">'+tr('lookupFoot')+'</div>';
    }
    else if(k.mode==='result'){
      var r=req(k.found);
      h+='<div class="kcode" style="font-size:44px">'+codeText(r.code)+'</div><div class="ksub">'+codeText(r.ref)+' · '+tr('size')+' '+codeText(r.size)+'</div><div class="kmsg"><b>'+tr(r.status)+'.</b> '+esc(customerStatusLine(r))+'</div><div class="kacts"><button type="button" data-k="idle">'+tr('close')+'</button></div><div class="kfoot">'+tr('resultFoot')+'</div>';
    }
    renderKioskContent(el,h,k.mode);
    if(el.parentElement)el.parentElement.classList.remove('location-open');
    showMapDialog();
    var b=customerElement('kboard');
    function boardCodes(status){return S.reqs.filter(function(r){return r.status===status;}).map(function(r){return '<span>'+codeText(r.code)+'</span>';}).join('')||'<span class="empty">—</span>';}
    b.innerHTML='<div class="t">'+tr('boardReady')+'</div><div class="row">'+boardCodes('ready')+'</div><div class="t">'+tr('boardTour')+'</div><div class="row">'+boardCodes('tour')+'</div><div class="foot">'+(S.busy?tr('busy')+' ':'')+tr('boardFoot')+'</div>';
    if(customerActivity!==false)touch();
  }
  function renderPhone(){
    var r=req(S.view),el=customerElement('phone');if(!r){el.innerHTML='';return;}
    var h='<div class="p-app"><span>Zara · '+tr('myRequests')+'</span><span>'+tr(r.code.charAt(0))+'</span></div>';
    if(r.notify!=='app')h+='<div class="p-note">'+tr('notPaired')+'</div>';
    h+='<div class="p-code">'+codeText(r.code)+'</div><div class="p-ref">'+codeText(r.ref)+' · '+tr('size')+' '+codeText(r.size)+'</div>';
    var steps=['received','searching','found','tour','ready'],index=steps.indexOf(r.status);
    h+='<ul class="tl">'+steps.map(function(status,i){return '<li class="'+(r.status==='delivered'||i<index?'done':i===index?'now':'')+'"><span class="d"></span><span>'+tr(status)+'</span></li>';}).join('')+'</ul><div class="p-box"><b>'+tr(r.status)+'</b><br>'+esc(customerStatusLine(r))+'</div><div class="p-foot">'+tr('onlyRequest')+'</div>';
    el.innerHTML=h;
  }
  function notifText(r){return tr('requestCode',{code:r.code})+': '+customerStatusLine(r);}
  function renderNotif(){
    var r=req(S.view),el=customerElement('notif');if(!r){el.innerHTML='';return;}
    el.innerHTML=[['app',tr('appNotification')],['wa','WhatsApp'],['sms','SMS']].map(function(channel){return '<div class="ncard"><div class="k"><span>'+channel[1]+'</span><span>'+(r.notify===channel[0]?tr('selected'):'')+'</span></div><div class="m">'+esc(notifText(r))+'</div></div>';}).join('')+(r.notify==='none'?'<div class="ncard">'+tr('noNotification')+'</div>':'');
  }
