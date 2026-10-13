// Option two uses the same warehouse model, with a simulated signed-in account.
function newAppState(){var dept=PRODUCTS.W?'W':Object.keys(PRODUCTS)[0],sizes=PRODUCTS[dept].sizes;return {signedIn:true,dept:dept,size:sizes.some(function(z){return z.s==='L';})?'L':sizes[0].s,cart:[],sent:[],mode:'product',notice:'',error:false,network:{verified:false,storeId:null,account:null},rateMemory:null,submitting:false};}
function appText(turkish,english){return typeof PRESENTATION!=='undefined'&&PRESENTATION.lang==='en'?english:turkish;}
function appProductLabel(dept){return localizedProduct(PRODUCTS[dept],dept,'name');}
function appAdd(){
  var a=S.app,z=PRODUCTS[a.dept]&&PRODUCTS[a.dept].sizes.find(function(x){return x.s===a.size;});
  a.error=false;a.notice='';
  if(!z||S.closed||availableForSize(a.dept,z)<1){a.error=true;a.notice=appText('Bu ürün şu anda depodan istenemiyor.','This item cannot be requested from the stockroom right now.');return false;}
  var key=inventoryKey(a.dept,a.size);
  if(!a.cart.includes(key))a.cart.push(key);
  a.mode='basket';return true;
}
function appSubmit(){
  var a=S.app;a.error=false;a.notice='';
  if(!a.signedIn){a.error=true;a.notice=appText('Devam etmek için Zara hesabınıza giriş yapın.','Sign in to your Zara account to continue.');return false;}
  if(!a.cart.length)return false;
  if(!appNetworkReady()){a.error=true;a.notice=appText('İstek göndermek için bu mağazanın Zara Wi-Fi bağlantısı doğrulanmalıdır.','This store’s Zara Wi-Fi connection must be verified before submitting a request.');return false;}
  var policy=appPolicy(),check=policy.inspect(a.cart.length);
  if(!check.ok){a.error=true;a.notice=appPolicyError(check);return false;}
  if(S.closed||a.cart.some(function(key){return S.ops.underReview(key)||S.ops.available(key)<1;})){
    a.error=true;a.notice=appText('Stok veya istek alımı değişti. Sepetinizi kontrol edin; henüz istek oluşturulmadı.','Stock or request availability has changed. Review your basket; no requests have been created.');return false;
  }
  // All-or-nothing demo commit. Real stock, quota and network proof must share
  // one authenticated server transaction; the local ledger is only a preview.
  var length=S.ops.requests.length,auditLength=S.ops.audit.length,codes;
  try{
    codes=a.cart.map(function(key){var r=S.ops.request(key,1,'zara-app');r.notify='app';r.storeId=STORE_CONTEXT.id;r.storeName=STORE_CONTEXT.name;r.accountLinked=true;r.networkVerification='demo-store-wifi';return r.code;});
    var saved=policy.consume(a.cart.length,STORE_CONTEXT.id);if(!saved.ok)throw Error(saved.reason);
  }catch(error){S.ops.requests.splice(length);S.ops.audit.splice(auditLength);a.error=true;a.notice=appPolicyError({reason:error.message==='clock'?'clock':'storage'});return false;}
  a.sent=a.sent.concat(codes);a.cart=[];a.mode='tracking';S.view=codes[0];return true;
}
function appAccessMarkup(){
  var connected=appNetworkReady(),check=appPolicy().inspect(S.app.cart.length),h='<section class="app-access" aria-label="'+appText('Bağlantı ve istek sınırı','Connection and request limit')+'"><b>'+appText(connected?'Zara Wi-Fi · Doğrulandı (örnek)':'Mağaza Wi-Fi bağlantısı gerekli',connected?'Zara Wi-Fi · Verified (demo)':'Store Wi-Fi connection required')+'</b>';
  if(!connected)h+='<p>'+appText('Yeni istekler yalnızca bu mağazanın doğrulanmış Zara Wi-Fi bağlantısıyla gönderilir.','New requests require this store’s verified Zara Wi-Fi connection.')+'</p>';
  if(check.used!==null)h+='<small>'+appText('Son 15 dakika: '+check.used+' / 10 ürün. İptaller de sayılır.','Past 15 minutes: '+check.used+' / 10 items. Cancellations also count.')+'</small>';
  if(!check.ok&&(S.app.mode==='basket'||check.used===null))h+='<p class="app-limit-message" role="status">'+esc(appPolicyError(check))+'</p>';
  return h+'</section>';
}
function directAppMarkup(){
  var a=S.app,product=PRODUCTS[a.dept],h='<div class="app-concept phone"><div class="app-brand"><img src="'+ZARA_TRANSITION_LOGO+'" alt="ZARA"> <span>'+appText('MAĞAZA İSTEĞİ','STORE REQUEST')+'</span></div><div class="app-store">'+esc(STORE_CONTEXT.name)+'<small>'+appText('Örnek hesap · Oturum açık','Demo account · Signed in')+'</small></div>';
  h+='<nav class="app-nav" aria-label="'+appText('Uygulama bölümleri','App sections')+'">'+[['product',appText('Ürün','Item')],['basket',appText('Sepet','Basket')+' ('+a.cart.length+')'],['tracking',appText('İsteklerim','My requests')]].map(function(x){return '<button type="button" data-app="mode" data-mode="'+x[0]+'" aria-pressed="'+(a.mode===x[0])+'">'+x[1]+'</button>';}).join('')+'</nav>';
  h+=appAccessMarkup();
  if(a.notice)h+='<p class="app-notice'+(a.error?' error':'')+'" role="status">'+esc(a.notice)+'</p>';
  if(a.mode==='product'){
    h+='<label class="app-product-picker">'+appText('Ürün','Item')+'<select data-app-field="product">'+Object.keys(PRODUCTS).map(function(dept){return '<option value="'+dept+'"'+(dept===a.dept?' selected':'')+'>'+esc(PRODUCTS[dept].ref)+' · '+esc(appProductLabel(dept))+'</option>';}).join('')+'</select></label><h3>'+esc(appProductLabel(a.dept))+'</h3><p class="app-ref">'+esc(product.ref)+' · '+esc(tr('color_'+a.dept))+'</p><div class="app-sizes">';
    product.sizes.forEach(function(z){h+='<button type="button" data-app="size" data-size="'+esc(z.s)+'" aria-pressed="'+(a.size===z.s)+'">'+esc(z.s)+'</button>';});h+='</div>';
    var z=product.sizes.find(function(z){return z.s===a.size;});
    if(z){var item=S.ops.item(inventoryKey(a.dept,a.size));h+='<dl class="stock-summary"><div><dt>'+appText('Reyonda','On the shop floor')+'</dt><dd>'+floorQuantity(item)+'</dd></div><div><dt>'+appText('Depo · İstenebilir','Stockroom · Available')+'</dt><dd>'+availableForSize(a.dept,z)+'</dd></div></dl>';}
    h+='<button class="app-primary" type="button" data-app="add"'+(!z||S.closed||availableForSize(a.dept,z)<1?' disabled':'')+'>'+appText('İstek sepetine ekle','Add to request basket')+'</button><p class="app-foot">'+appText('Her ürün kendi bölümünün istek noktasına teslim edilir.','Each item is delivered to its department’s request point.')+'</p>';
  }else if(a.mode==='basket'){
    h+='<h3>'+appText('İstek sepetim','My request basket')+'</h3>';
    if(!a.cart.length)h+='<p>'+appText('Sepetiniz henüz boş.','Your basket is empty.')+'</p>';
    a.cart.forEach(function(key){var item=S.ops.item(key);h+='<div class="app-item"><div><b>'+esc(item.ref)+'</b><span>'+esc(tr(item.dept))+' · '+appText('Beden ','Size ')+esc(item.size)+'</span></div><button type="button" data-app="remove" data-key="'+esc(key)+'" aria-label="'+esc(item.ref)+' '+appText('ürününü çıkar','remove item')+'">×</button></div>';});
    h+='<button type="button" class="app-add" data-app="mode" data-mode="product">+ '+appText('Ürün ekle','Add another item')+'</button><p class="app-account-note">'+appText('İstekleriniz mevcut Zara hesabınıza bağlanır. Kişisel bilgilerinizi tekrar girmeniz veya QR okutmanız gerekmez.','Requests are linked to your existing Zara account. You do not need to enter your personal details again or scan an account QR code.')+'</p><button class="app-primary" type="button" data-app="submit"'+(!a.cart.length||a.submitting||!appNetworkReady()||!appPolicy().inspect(a.cart.length).ok?' disabled':'')+'>'+appText(a.submitting?'Gönderiliyor…':'İstek oluştur',a.submitting?'Submitting…':'Submit request')+'</button>';
  }else{
    h+='<h3>'+appText('İsteklerim','My requests')+'</h3>';
    if(!a.sent.length)h+='<p>'+appText('Henüz uygulamadan oluşturulmuş bir isteğiniz yok.','You have not made any requests in the app yet.')+'</p>';
    a.sent.forEach(function(code){var r=req(code);if(!r)return;h+='<article class="app-request"><div><b>'+esc(code)+'</b><span>'+esc(tr(r.status))+'</span></div><p>'+esc(r.ref)+' · '+appText('Beden ','Size ')+esc(r.size)+'</p><p>'+esc(customerStatusLine(r))+'</p></article>';});
    h+='<p class="app-foot">'+appText('Ürün bulunursa tahmini 20–25 dakika içinde ilgili istek noktasına gelir. Bulunma ve teslim bilgisi bu ekranda güncellenir.','If found, your item should reach its department’s request point in 20–25 minutes. Search and collection updates appear here.')+'</p>';
  }
  return h+'</div>';
}
function renderDirectApp(){var el=document.getElementById('direct-app');if(el){var previous=S.lang;S.lang=PRESENTATION.lang;try{
  var controls=appIsDemo()?'<aside class="app-demo-controls"><b>'+appText('Prototip · Bağlantı denemesi','Prototype · Connection demo')+'</b><p>'+appText('Gerçek ağ bağlantısı yapılmaz. Aşağıdan örnek bağlantıyı değiştirerek gönderim kuralını deneyebilirsiniz.','No real network connection is made. Change the demo connection below to try the submission rule.')+'</p><button type="button" data-app="network" data-connected="yes" aria-pressed="'+appNetworkReady()+'">'+appText('Zara Wi-Fi: örnek doğrulama','Zara Wi-Fi: demo verification')+'</button><button type="button" data-app="network" data-connected="no" aria-pressed="'+!appNetworkReady()+'">'+appText('Bağlantı yok','Disconnected')+'</button></aside>':'';
  el.innerHTML=controls+directAppMarkup();el.setAttribute('lang',S.lang);
}finally{S.lang=previous;}}}
function directAppAction(button){
  var a=S.app,d=button.dataset;
  if(d.app==='mode'&&['product','basket','tracking'].includes(d.mode)){a.mode=d.mode;a.notice='';}
  else if(d.app==='size'&&PRODUCTS[a.dept].sizes.some(function(z){return z.s===d.size;})){a.size=d.size;a.notice='';}
  else if(d.app==='add')appAdd();
  else if(d.app==='remove')a.cart=a.cart.filter(function(key){return key!==d.key;});
  else if(d.app==='submit'){submitAppRequest();return;}
  else if(d.app==='network'&&appIsDemo()){a.network={verified:d.connected==='yes',storeId:STORE_CONTEXT.id,account:'demo-zara-account'};a.notice='';}
  renderAll(false);
}
