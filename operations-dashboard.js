function scoped(dept){return !S.o.dept||S.o.dept===dept;}
function departmentOptions(blank){return (blank?[['','Bölüm seçin']]:[]).concat(['W','M','K'].map(function(d){return [d,LABELS[d]+' · '+d];}));}
function teamOptions(){return [['W depo ekibi','Kadın depo ekibi'],['M depo ekibi','Erkek depo ekibi'],['K depo ekibi','Çocuk depo ekibi'],['Destek ekibi','Destek ekibi'],['Depo sorumlusu','Depo sorumlusu']];}
function integerField(name,fallback){var value=String(field(name,fallback)).trim();if(!/^\d+$/.test(value))throw Error('Adedi tam sayı olarak girin.');return Number(value);}
function stamp(at){return new Date(at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});}
function empty(text){return '<p class="op-empty">'+esc(text)+'</p>';}
function renderQueue(){
  var rows=S.reqs.filter(function(r){return open(r)&&scoped(r.dept);}).sort(function(a,b){return a.stageAt-b.stageAt;});
  var h='<h3>Açık işler</h3><p class="op-caption">En uzun bekleyen aşama önce gösterilir. Süreler işlem kayıtlarından hesaplanır.</p>';
  if(!rows.length)return h+empty('Bu bölümde açık iş yok.');
  h+='<div class="scroll"><table><thead><tr><th>İstek / ürün</th><th>Aşama</th><th>Sorumlu ekip</th><th>İşlem</th></tr></thead><tbody>';
  rows.forEach(function(r){var late=S.ops.stageMinutes(r)>S.ops.limits[r.status];h+='<tr><td><b class="mono">'+r.code+'</b><br>'+esc(detail(r))+'<small>'+LABELS[r.dept]+' · '+esc(S.ops.item(r.key).bin)+'</small></td><td><span class="op-status'+(late?' overdue':'')+'">'+STATUS[r.status]+' · '+Math.floor(S.ops.stageMinutes(r))+' dk</span>'+(late?'<small class="op-warning">Aşama sınırı aşıldı</small>':'')+(r.issue?'<small>'+esc(issueText(r.issue))+' · '+r.searchAttempts+'. arama</small>':'')+'</td><td>'+selectField('owner-'+r.code,'Sorumlu',teamOptions(),r.owner)+opButton('assign','Görevi devret',r.code)+'</td><td>'+opButton('inspect','El cihazında aç',r.code)+(r.issue?opButton('second','İkinci kontrol',r.code)+opButton('close','Temin edilemiyor',r.code):'')+'</td></tr>';});
  return h+'</tbody></table></div>';
}
function renderControls(){
  var tasks=S.ops.tasks.filter(function(t){return scoped(S.ops.item(t.key).dept);});
  var h='<h3>Stok ve konum kontrolü</h3><p class="op-caption">Aynı ürünün tekrarlanan sorunları tek görevde toplanır. Fiziksel depo sayımını ve kontrol sonucunu kaydedin.</p>';
  if(!tasks.length)return h+empty('Açık stok kontrolü yok.');
  return h+'<div class="op-cards">'+tasks.map(function(t){var item=S.ops.item(t.key);return '<article><div class="op-card-top"><b>'+t.id+'</b><span class="op-status">'+(t.status==='open'?'Kontrol gerekli':'Çözüldü')+'</span></div><h4>'+esc(item.ref)+' · '+esc(item.color)+' · '+esc(item.size)+'</h4><p>'+t.occurrences+' bildirim · '+t.codes.map(esc).join(', ')+'<br>'+t.reasons.map(function(k){return esc(reason(k).t);}).join(' / ')+'</p>'+issueNotes(t)+(t.status==='open'?'<div class="op-form">'+inputField('count-'+t.id,'Sayımda bulunan depo adedi','','number')+inputField('note-'+t.id,'Kontrol sonucu','')+opButton('resolve','Sayımı kaydet ve kapat',t.id)+'</div><p class="op-caption">Açık ayırmaların altındaki sayım kaydedilemez. İlgili istek ve ayırmaları önce çözün.</p>':'<p>'+t.previousQty+' → '+t.actualQty+' adet · '+esc(t.note)+'</p>')+'</article>';}).join('')+'</div>';
}
function renderHandover(){
  var shifts=[['Sabah','Sabah'],['Ara','Ara'],['Akşam','Akşam']];
  var h='<h3>Vardiya devri</h3><p class="op-caption">Devir kaydı tüm bölümleri kapsar. Açık işler, stok sorunları, arabalar, reyon görevleri ve online ayırmalar o anki hâliyle saklanır.</p><div class="op-form inline">'+selectField('shift-from','Devreden vardiya',shifts,'Sabah')+selectField('shift-to','Devralan vardiya',shifts,'Akşam')+inputField('handover-note','Devir notu','')+opButton('handover','Devir kaydı oluştur')+'</div>';
  return h+'<div class="op-cards">'+S.ops.handovers.slice().reverse().map(function(x){return '<article><div class="op-card-top"><b>'+x.id+' · '+x.from+' → '+x.to+'</b><span>'+stamp(x.at)+'</span></div><p>'+x.requests.length+' açık istek · '+x.tasks.length+' stok sorunu · '+x.carts.length+' araba · '+x.replenishments.length+' reyon görevi · '+x.online.length+' online ayırma</p><p>'+esc(x.note)+'</p><details><summary>Devir anındaki işler</summary><ul>'+x.requests.map(function(r){return '<li>'+r.code+' · '+STATUS[r.status]+' · '+esc(r.owner)+' · '+r.stageMinutes+' dk'+(r.cartId?' · '+r.cartId:'')+(r.issue?'<br>'+esc(issueText(r.issue)):'')+'</li>';}).join('')+x.tasks.map(function(t){return '<li>'+t.id+' · '+esc(t.key)+' · '+t.occurrences+' bildirim'+issueNotes(t)+'</li>';}).join('')+x.carts.map(function(c){return '<li>'+c.id+' · '+LABELS[c.dept]+' · '+c.units.length+' ürün</li>';}).join('')+x.replenishments.map(function(j){return '<li>'+j.id+' · '+esc(j.location)+' · '+j.qty+' adet</li>';}).join('')+x.online.map(function(o){return '<li>'+esc(o.id)+' · '+o.qty+' adet ayrıldı</li>';}).join('')+'</ul></details>'+(x.acceptedAt?'<p class="op-status">'+x.to+' vardiyası devraldı · '+stamp(x.acceptedAt)+'</p>':'<div class="op-form inline">'+selectField('accept-'+x.id,'Devralan vardiya',[['','Vardiya seçin']].concat(shifts),'')+opButton('accept','Devri kabul et',x.id)+'</div>')+'</article>';}).join('')+'</div>';
}
function renderMeasures(m){
  var h='<div class="op-split"><section><h3>Ölçülen aşama süreleri</h3><p class="op-caption">Tamamlanan aşamaların ortalaması; henüz bitmeyen işler dahil değildir.</p><dl class="op-measures">';
  Object.keys(S.ops.limits).forEach(function(stage){h+='<div><dt>'+STATUS[stage]+'</dt><dd>'+(m.stageAverages[stage]!==undefined?m.stageAverages[stage]+' dk':'Henüz veri yok')+'</dd></div>';});
  h+='</dl></section><section><h3>Temin edilememe nedenleri</h3>';
  var keys=Object.keys(m.reasons);h+=keys.length?'<ul>'+keys.map(function(key){return '<li>'+esc(reason(key).t)+' · '+m.reasons[key]+'</li>';}).join('')+'</ul>':empty('Bu bölümde kapatılmış temin sorunu yok.');
  return h+'</section></div>';
}
function renderDashboard(){
  var ops=S.ops,m=ops.metrics(S.o.dept),h='<div class="hd"><div><span class="op-eyebrow">DEPO OPERASYONU</span><h2>İşler, stok ve vardiya</h2></div><span class="ex">Canlı demo · '+stamp(ops.now())+'</span></div>';
  h+='<p class="op-caption">Bu sayfadaki işlemler ortak örnek kayıtlara bağlıdır. Yenileme ve Sıfırla, örnek başlangıç verisine döner.</p><div class="op-filters">'+[['','Tüm bölümler'],['W','Kadın'],['M','Erkek'],['K','Çocuk']].map(function(d){return '<button type="button" data-filter="'+d[0]+'" aria-pressed="'+(S.o.dept===d[0])+'">'+d[1]+'</button>';}).join('')+'</div>';
  h+='<div class="op-metrics"><div><strong>'+m.open+'</strong><span>'+m.open+' açık istek · '+m.units+' ürün</span></div><div><strong>'+m.overdue.length+'</strong><span>Aşama sınırını aşan</span></div><div><strong>'+Math.floor(m.oldest)+'<small> dk</small></strong><span>En eski açık isteğin yaşı</span></div><div><strong>'+ops.tasks.filter(function(t){return t.status==='open'&&scoped(ops.item(t.key).dept);}).length+'</strong><span>Çözülmemiş stok kontrolü</span></div></div>';
  h+='<div class="op-stage-strip">'+['received','searching','found','tour','ready','return_pending'].map(function(key){return '<span>'+STATUS[key]+' <b>'+(m.counts[key]||0)+'</b></span>';}).join('')+'</div>';
  if(m.overdue.length)h+='<div class="op-alert">Öncelikli işler: '+m.overdue.map(function(r){return '<button type="button" data-op="inspect" data-id="'+r.code+'">'+r.code+' · '+STATUS[r.status]+' · '+Math.floor(ops.stageMinutes(r))+' dk</button>';}).join(' ')+'</div>';
  h+='<nav class="op-tabs" aria-label="Depo işlemleri">'+[['queue','İş sırası'],['controls','Stok kontrolü'],['carts','Arabalar'],['stock','Stok ayırmaları'],['replenish','Reyon tamamlama'],['handover','Vardiya devri']].map(function(t){return '<button type="button" data-tab="'+t[0]+'" aria-pressed="'+(S.o.tab===t[0])+'">'+t[1]+'</button>';}).join('')+'</nav>';
  if(S.o.notice)h+='<div class="op-notice'+(S.o.error?' error':'')+'" role="'+(S.o.error?'alert':'status')+'">'+esc(S.o.notice)+'</div>';
  h+='<div class="op-panel">';
  if(S.o.tab==='queue')h+=renderQueue()+renderMeasures(m);
  else if(S.o.tab==='controls')h+=renderControls();
  else if(S.o.tab==='handover')h+=renderHandover();
  else if(typeof renderLogistics==='function')h+=renderLogistics(S.o.tab);
  h+='</div><details class="op-settings"><summary>Aşama uyarı sınırları</summary><p class="op-caption">Bunlar ekip içi uyarı sınırlarıdır. Müşteriye verilen 20–25 dakikalık tahmini değiştirmez. Teslim noktasındaki bekletme süresi 20 dakikadır.</p><div class="op-form inline">';
  ['received','searching','found','tour','return_pending'].forEach(function(key){h+=inputField('limit-'+key,STATUS[key]+' (dk)',ops.limits[key],'number');});
  h+=opButton('limits','Sınırları kaydet')+'</div></details><details class="op-settings"><summary>Son işlem kayıtları</summary><ol>'+ops.audit.slice().sort(function(a,b){return b.at-a.at;}).slice(0,16).map(function(e){return '<li><time>'+stamp(e.at)+'</time> '+esc(e.message)+'</li>';}).join('')+'</ol></details>';
  document.getElementById('ops').innerHTML=h;
}
function dashboardOperation(a,id){
  var ops=S.ops;
  if(a==='assign')ops.assign(id,field('owner-'+id,req(id).owner));
  else if(a==='inspect'){S.sel=id;S.view=id;renderHH();var device=document.getElementById('hh');if(device.scrollIntoView)device.scrollIntoView({behavior:'smooth',block:'center'});}
  else if(a==='resolve')ops.resolveTask(id,integerField('count-'+id),field('note-'+id));
  else if(a==='handover'){ops.handover(field('shift-from','Sabah'),field('shift-to','Akşam'),field('handover-note'));S.o.tab='handover';}
  else if(a==='accept')ops.acceptHandover(id,field('accept-'+id));
  else if(a==='limits'){
    var updates={};['received','searching','found','tour','return_pending'].forEach(function(key){var n=integerField('limit-'+key,ops.limits[key]);if(n<1||n>120)throw Error('Uyarı sınırları 1–120 dakika arasında olmalıdır.');updates[key]=n;});Object.assign(ops.limits,updates);ops.record('Aşama uyarı sınırları güncellendi.');
  }else if(typeof logisticsOperation==='function')return logisticsOperation(a,id);
  else return false;
  return true;
}
function renderCarts(){
  var h='<h3>Araba yükleme ve teslim</h3><p class="op-caption">Yalnızca doğrulanmış ürünler yüklenir. Sevk ve varış işlemi seçilen arabanın içeriğini etkiler.</p><div class="op-form inline">'+selectField('cart-dept','Arabanın bölümü',departmentOptions(false),S.o.dept||'W')+opButton('create-cart','Yeni araba aç')+'</div>';
  var carts=S.ops.carts.filter(function(c){return scoped(c.dept);}).slice().reverse();
  return h+'<div class="op-cards">'+carts.map(function(c){
    var tags=[];S.reqs.filter(function(r){return r.status==='found'&&r.dept===c.dept&&(!r.cartId||r.cartId===c.id);}).forEach(function(r){r.unitIds.forEach(function(id){if(!c.units.some(function(u){return u.id===id;}))tags.push([id,r.code+' · '+r.ref+' · '+r.color+' · '+r.size+' · '+id]);});});
    var content='<article><div class="op-card-top"><h4>'+c.id+' · '+LABELS[c.dept]+'</h4><span class="op-status">'+({loading:'Yükleniyor',transit:'Yolda',arrived:'Teslim noktasında'})[c.status]+'</span></div><p>'+c.units.length+' doğrulanmış ürün</p><ul>'+c.units.map(function(u){return '<li>'+u.code+' · '+esc(u.id)+'</li>';}).join('')+'</ul>';
    if(c.status==='loading')content+='<div class="op-form">'+selectField('load-'+c.id,'Doğrulanmış ürün etiketi',[['','Ürün seçin']].concat(tags),'')+opButton('load','Arabaya yükle',c.id,!tags.length)+opButton('dispatch','Bu arabayı sevk et',c.id,!c.units.length)+'</div>';
    if(c.status==='transit')content+='<div class="op-form">'+selectField('point-'+c.id,'Varış noktasında okutulan bölüm',departmentOptions(true),'')+opButton('arrive','Noktaya varışı doğrula',c.id)+'</div>';
    return content+'</article>';
  }).join('')+'</div>'+(carts.length?'':empty('Bu bölümde henüz araba yok.'));
}
function renderStock(){
  var ops=S.ops,items=ops.stock.filter(function(i){return scoped(i.dept);});
  var h='<h3>Ortak stok ayırmaları</h3><p class="op-caption">Depodaki fiziksel adet, ayrılan adet ve yeni istek için serbest adet ayrı gösterilir. Online sipariş alanı entegrasyonu canlandırır; gerçek sipariş oluşturmaz.</p><div class="scroll"><table><thead><tr><th>Ürün / beden</th><th>Depoda</th><th>İstek</th><th>Online</th><th>Reyon görevi</th><th>Serbest</th><th>Reyonda</th></tr></thead><tbody>';
  items.forEach(function(item){var sum=function(list,predicate){return list.filter(predicate).reduce(function(n,r){return n+r.qty;},0);};h+='<tr><td>'+LABELS[item.dept]+' · '+esc(item.ref)+'<small>'+esc(item.color)+' · '+esc(item.size)+'</small></td><td>'+item.warehouse+'</td><td>'+sum(ops.requests,function(r){return r.key===item.key&&r.held;})+'</td><td>'+sum(ops.online,function(r){return r.key===item.key&&r.status==='reserved';})+'</td><td>'+sum(ops.replenishments,function(r){return r.key===item.key&&r.status==='pending';})+'</td><td><b>'+ops.available(item.key)+'</b>'+(ops.underReview(item.key)?'<small class="op-warning">Stok kontrolü · ayırmaya kapalı</small>':'')+'</td><td>'+floorQuantity(item)+'</td></tr>';});
  h+='</tbody></table></div><h4>Online ayırma · demo</h4><div class="op-form inline">'+selectField('online-key','Ürün',[['','Ürün seçin']].concat(items.map(function(i){return [i.key,LABELS[i.dept]+' · '+i.ref+' · '+i.color+' · '+i.size];})), '')+inputField('online-id','Sipariş numarası','')+inputField('online-qty','Adet',1,'number')+opButton('reserve-online','Stok ayır')+'</div>';
  var orders=ops.online.filter(function(o){return o.status==='reserved'&&scoped(ops.item(o.key).dept);});
  h+='<div class="op-cards">'+orders.map(function(o){var item=ops.item(o.key);return '<article><b>'+esc(o.id)+'</b><p>'+esc(item.ref)+' · '+esc(item.size)+' · '+o.qty+' adet</p>'+opButton('release-online','Ayırmayı kaldır',o.id)+'</article>';}).join('')+'</div>';
  return h;
}
function renderReplenishment(){
  var ops=S.ops,suggestions=ops.suggestions().filter(function(s){return scoped(s.dept);});
  var h='<h3>Reyon tamamlama</h3><p class="op-caption">Son bir saatteki istek adedi ve düşük reyon stoğuna göre sıralanır. Örnek hedef her beden için 3 adettir. Görev açılınca depo stoğu ayrılır; hedef konum doğrulanınca reyona aktarılır.</p><div class="op-cards">';
  h+=suggestions.map(function(s){var item=ops.item(s.key),locations=(STORE_PLAN&&STORE_PLAN.fixtures||[]).filter(function(f){return f.code.charAt(0)===item.dept;}).map(function(f){return [f.code,f.code];});return '<article><h4>'+LABELS[item.dept]+' · '+esc(item.ref)+' · '+esc(item.size)+'</h4><p>Reyon: '+s.floor+' · Serbest depo: '+s.available+'<br>Son saat talebi: '+s.demand+' · Önerilen: '+s.qty+' adet</p><div class="op-form">'+inputField('repl-qty-'+s.key,'Gönderilecek adet',s.qty,'number')+selectField('repl-location-'+s.key,'Hedef reyon konumu',[['','Konum seçin']].concat(locations),'')+opButton('replenish','Tamamlama görevi aç',s.key)+'</div></article>';}).join('');
  h+='</div>'+(suggestions.length?'':empty('Serbest stok ve reyon hedefi için tamamlama önerisi yok.'))+'<h4>Açılan görevler</h4><div class="op-cards">';
  h+=ops.replenishments.filter(function(j){return scoped(ops.item(j.key).dept);}).slice().reverse().map(function(j){var item=ops.item(j.key);return '<article><div class="op-card-top"><b>'+j.id+'</b><span class="op-status">'+({pending:'Tamamlama bekliyor',completed:'Tamamlandı',cancelled:'İptal edildi'})[j.status]+'</span></div><p>'+esc(item.ref)+' · '+esc(item.size)+' · '+j.qty+' adet → '+esc(j.location)+'</p>'+(j.status==='pending'?'<div class="op-form">'+inputField('confirm-'+j.id,'Hedefte okutulan konum','')+opButton('complete-repl','Reyona yerleşimi doğrula',j.id)+opButton('cancel-repl','Görevi iptal et',j.id)+'</div>':'')+'</article>';}).join('');
  return h+'</div>';
}
function renderLogistics(tab){if(tab==='carts')return renderCarts();if(tab==='stock')return renderStock();if(tab==='replenish')return renderReplenishment();return '';}
function logisticsOperation(a,id){
  var ops=S.ops;
  if(a==='create-cart'){ops.createCart(field('cart-dept',S.o.dept||'W'));S.o.tab='carts';}
  else if(a==='load'){var unit=field('load-'+id),r=S.reqs.find(function(r){return r.status==='found'&&r.unitIds.indexOf(unit)>=0;});if(!r)throw Error('Yüklenecek doğrulanmış ürünü seçin.');ops.load(r.code,id,unit);S.o.fields['load-'+id]='';}
  else if(a==='dispatch')ops.dispatch(id);
  else if(a==='arrive')ops.arrive(id,field('point-'+id));
  else if(a==='reserve-online'){ops.reserveOnline(field('online-key'),integerField('online-qty',1),field('online-id').trim());S.o.fields['online-id']='';S.o.tab='stock';}
  else if(a==='release-online')ops.releaseOnline(id);
  else if(a==='replenish'){
    var location=field('repl-location-'+id);if(!STORE_PLAN||!STORE_PLAN.fixtures.some(function(f){return f.code===location;}))throw Error('Mağaza planında tanımlı bir konum seçin.');
    var suggestion=ops.suggestions().find(function(s){return s.key===id;});ops.replenish(id,integerField('repl-qty-'+id,suggestion?suggestion.qty:1),location);delete S.o.fields['repl-qty-'+id];S.o.tab='replenish';
  }
  else if(a==='complete-repl')ops.completeReplenishment(id,field('confirm-'+id).trim().toUpperCase());
  else if(a==='cancel-repl')ops.cancelReplenishment(id);
  else return false;
  return true;
}
