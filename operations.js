// Local prototype domain model. Production allocations must be atomic on the store server.
function Warehouse(catalog, clock){
  this.clock=clock||Date.now;this.offset=0;this.stock=JSON.parse(JSON.stringify(catalog));
  this.requests=[];this.online=[];this.tasks=[];this.carts=[];this.replenishments=[];this.handovers=[];this.audit=[];
  this.limits={received:5,searching:10,found:5,tour:5,ready:20,return_pending:5};
}
Warehouse.prototype.now=function(){return this.clock()+this.offset;};
Warehouse.prototype.item=function(key){var item=this.stock.find(function(s){return s.key===key;});if(!item)throw Error('Ürün kaydı bulunamadı.');return item;};
Warehouse.prototype.get=function(code){var r=this.requests.find(function(r){return r.code===code;});if(!r)throw Error('İstek bulunamadı.');return r;};
Warehouse.prototype.record=function(message){this.audit.push({at:this.now(),message:message});};
Warehouse.prototype.quantity=function(qty){if(!Number.isSafeInteger(qty)||qty<1)throw Error('Adet pozitif bir tam sayı olmalıdır.');};
Warehouse.prototype.underReview=function(key){return this.tasks.some(function(t){return t.key===key&&t.status==='open'&&t.reasons.some(function(reason){return ['stock','defect','other'].indexOf(reason)>=0;});});};
Warehouse.prototype.assertStockReady=function(key){if(this.underReview(key))throw Error('Bu ürünün stok kontrolü sürüyor. Yeni ayırma için sayım sonucunu kaydedin.');};
Warehouse.prototype.available=function(key){
  var item=this.item(key);
  var held=this.requests.filter(function(r){return r.key===key&&r.held;}).reduce(function(n,r){return n+r.qty;},0);
  held+=this.online.filter(function(o){return o.key===key&&o.status==='reserved';}).reduce(function(n,o){return n+o.qty;},0);
  held+=this.replenishments.filter(function(o){return o.key===key&&o.status==='pending';}).reduce(function(n,o){return n+o.qty;},0);
  return Math.max(0,item.warehouse-held);
};
Warehouse.prototype.request=function(key,qty,source){
  this.assertStockReady(key);
  this.quantity(qty);var item=this.item(key);if(this.available(key)<qty)throw Error('İstek için serbest depo stok miktarı yetersiz.');
  var next=this.requests.filter(function(r){return r.dept===item.dept;}).reduce(function(n,r){return Math.max(n,Number(r.code.split('-')[1])||0);},0)+1;
  var r={code:item.dept+'-'+next,key:key,ref:item.ref,color:item.color,size:item.size,dept:item.dept,qty:qty,held:true,status:'received',createdAt:this.now(),stageAt:this.now(),owner:item.dept+' depo ekibi',source:source||'ekran',notify:'none',rack:'',unitIds:[],returnedUnits:[],history:[],searchAttempts:0};
  this.requests.push(r);this.record(r.code+' oluşturuldu; '+qty+' adet ayrıldı.');return r;
};
Warehouse.prototype.reserveOnline=function(key,qty,id){
  this.assertStockReady(key);
  this.quantity(qty);if(typeof id!=='string'||!id.trim())throw Error('Online sipariş numarası gerekli.');
  if(this.online.some(function(o){return o.id===id;}))throw Error('Bu online sipariş numarası zaten kullanıldı.');
  if(this.available(key)<qty)throw Error('Online sipariş için serbest depo stok miktarı yetersiz.');
  var order={id:id,key:key,qty:qty,status:'reserved',at:this.now()};this.online.push(order);this.record(id+' online siparişi için '+qty+' adet ayrıldı.');return order;
};
Warehouse.prototype.releaseOnline=function(id){
  var order=this.online.find(function(o){return o.id===id;});if(!order||order.status!=='reserved')throw Error('Etkin online ayırma bulunamadı.');
  order.status='released';this.record(id+' online ayırması kaldırıldı.');
};
Warehouse.prototype.transition=function(r,status){
  r.history.push({from:r.status,to:status,at:this.now(),duration:Math.max(0,this.now()-r.stageAt)});
  r.status=status;r.stageAt=this.now();this.record(r.code+' → '+status);
};
Warehouse.prototype.start=function(code){
  var r=this.get(code);if(r.status!=='received'&&!(r.status==='searching'&&r.issue))throw Error('Bu istek aramaya alınamaz.');
  r.searchAttempts++;r.issue=null;this.transition(r,'searching');
};
Warehouse.prototype.scanFound=function(code,tag){
  var r=this.get(code);if(r.status!=='searching'||r.issue)throw Error('Önce aramayı başlatın veya ikinci kontrolü açın.');
  if(!tag||typeof tag.id!=='string'||!tag.id.trim())throw Error('Tekil ürün etiketi gerekli.');
  if(tag.ref!==r.ref||tag.color!==r.color||tag.size!==r.size)throw Error('Okutulan referans, renk veya beden istekle eşleşmiyor.');
  if(this.requests.some(function(other){return other.status!=='returned'&&other.unitIds.indexOf(tag.id)>=0;}))throw Error('Bu ürün etiketi zaten bir isteğe atanmış.');
  r.unitIds.push(tag.id);this.record(r.code+' ürün doğrulandı: '+tag.id);
  if(r.unitIds.length===r.qty)this.transition(r,'found');
};
Warehouse.prototype.createCart=function(dept){
  if(['W','M','K'].indexOf(dept)<0)throw Error('Geçerli bölüm seçin.');
  var cart={id:'AR-'+(this.carts.length+1),dept:dept,status:'loading',units:[],createdAt:this.now()};this.carts.push(cart);return cart;
};
Warehouse.prototype.cart=function(id){var c=this.carts.find(function(c){return c.id===id;});if(!c)throw Error('Araba bulunamadı.');return c;};
Warehouse.prototype.load=function(code,cartId,unitId){
  var r=this.get(code),cart=this.cart(cartId);
  if(r.status!=='found'||cart.status!=='loading')throw Error('Yalnızca bulunan ürün yüklemeye açık arabaya eklenebilir.');
  if(cart.dept!==r.dept)throw Error('Ürün ve araba bölümü eşleşmiyor.');
  if(r.unitIds.indexOf(unitId)<0)throw Error('Bu etiket istek için doğrulanmadı.');
  if(this.carts.some(function(c){return c.units.some(function(u){return u.id===unitId&&c.status!=='arrived';});}))throw Error('Ürün arabaya zaten yüklenmiş.');
  if(r.cartId&&r.cartId!==cartId)throw Error('Aynı isteğin ürünlerini aynı arabada toplayın.');
  cart.units.push({id:unitId,code:code});r.cartId=cartId;this.record(code+' '+cartId+' arabasına yüklendi.');
};
Warehouse.prototype.dispatch=function(cartId){
  var cart=this.cart(cartId),self=this;
  if(cart.status!=='loading'||!cart.units.length)throw Error('Sevk edilecek ürün yok.');
  var codes=Array.from(new Set(cart.units.map(function(u){return u.code;})));
  codes.forEach(function(code){var r=self.get(code);if(r.status!=='found'||cart.units.filter(function(u){return u.code===code;}).length!==r.qty)throw Error('İsteğin tüm adetleri arabaya yüklenmeden sevk edilemez.');});
  codes.forEach(function(code){var r=self.get(code);self.item(r.key).warehouse-=r.qty;r.held=false;self.transition(r,'tour');});
  cart.status='transit';cart.dispatchedAt=this.now();
};
Warehouse.prototype.arrive=function(cartId,pointDept){
  var cart=this.cart(cartId),self=this;if(cart.status!=='transit')throw Error('Araba yolda değil.');
  if(cart.dept!==pointDept)throw Error('Teslim noktası bölümü araba ile eşleşmiyor.');
  Array.from(new Set(cart.units.map(function(u){return u.code;}))).forEach(function(code){var r=self.get(code);r.rack=pointDept+'-B3';r.pointDept=pointDept;self.transition(r,'ready');});
  cart.status='arrived';cart.arrivedAt=this.now();
};
Warehouse.prototype.deliver=function(code){var r=this.get(code);if(r.status!=='ready')throw Error('Ürün teslim için hazır değil.');this.transition(r,'delivered');};
Warehouse.prototype.expire=function(code){var r=this.get(code);if(r.status!=='ready')throw Error('Yalnızca teslim noktasındaki ürün geri dönüşe alınabilir.');this.transition(r,'return_pending');};
Warehouse.prototype.returnUnit=function(code,unitId){
  var r=this.get(code);if(r.status!=='return_pending')throw Error('İstek geri dönüş beklemiyor.');
  if(r.unitIds.indexOf(unitId)<0)throw Error('Geri dönüş etiketi istekle eşleşmiyor.');
  if(r.returnedUnits.indexOf(unitId)>=0)throw Error('Bu etiket zaten depoda okutuldu.');
  r.returnedUnits.push(unitId);this.record(code+' depoya dönüş okutuldu: '+unitId);
  if(r.returnedUnits.length===r.qty){this.item(r.key).warehouse+=r.qty;this.transition(r,'returned');}
};
Warehouse.prototype.controlTask=function(key,code,reason){
  var task=this.tasks.find(function(t){return t.key===key&&t.status==='open';});
  if(!task){task={id:'KONTROL-'+(this.tasks.length+1),key:key,status:'open',codes:[],occurrences:0,reasons:[],at:this.now(),owner:'Depo sorumlusu'};this.tasks.push(task);}
  if(code&&task.codes.indexOf(code)<0)task.codes.push(code);
  task.occurrences++;if(task.reasons.indexOf(reason)<0)task.reasons.push(reason);this.record(task.id+' kontrol kaydı güncellendi.');return task;
};
Warehouse.prototype.reportIssue=function(code,reason,note){
  var r=this.get(code);if(r.status!=='searching'||r.unitIds.length)throw Error('Sorun, ürün doğrulanmadan arama aşamasında bildirilmelidir.');
  if(['stock','floor','defect','other'].indexOf(reason)<0)throw Error('Geçerli neden seçin.');
  if(r.issue)throw Error('Bu istek için açık sorun var; önce ikinci kontrol başlatın.');
  note=reason==='other'&&typeof note==='string'?note.trim():'';
  if(reason==='other'&&!note)throw Error('Açıklama yazın.');
  if(note.length>500)throw Error('Açıklama en fazla 500 karakter olabilir.');
  r.issue={reason:reason,note:note,at:this.now()};
  if(!r.issueHistory)r.issueHistory=[];r.issueHistory.push({reason:reason,note:note,at:r.issue.at});
  var task=this.controlTask(r.key,code,reason);
  if(note){if(!task.notes)task.notes=[];task.notes.push({code:code,note:note,at:r.issue.at});}
  this.record(code+' arama sorunu: '+reason+(note?' · '+note:''));
};
Warehouse.prototype.assign=function(code,owner){
  if(typeof owner!=='string'||!owner.trim()||owner.length>80)throw Error('Sorumlu ekip seçin.');
  var r=this.get(code);if(!this.isOpen(r))throw Error('Kapalı istek devredilemez.');r.owner=owner;this.record(code+' görevi '+owner+' ekibine devredildi.');
};
Warehouse.prototype.secondSearch=function(code){
  var r=this.get(code);if(r.status!=='searching'||!r.issue)throw Error('İkinci kontrol için açık bir arama sorunu gerekli.');
  this.start(code);this.record(code+' ikinci kontrol başlatıldı.');
};
Warehouse.prototype.closeUnavailable=function(code){
  var r=this.get(code);if(r.status!=='searching'||!r.issue||r.unitIds.length)throw Error('Kapatılabilecek bir arama sorunu yok.');
  if(['stock','other'].indexOf(r.issue.reason)>=0&&r.searchAttempts<2)throw Error('Önce ikinci kontrol yapılmalıdır.');
  if(r.issue.reason==='floor')throw Error('Ürün reyonda olabilir; ilgili ekibe yönlendirin ve kontrolü sürdürün.');
  r.reason=r.issue.reason;r.reasonNote=r.issue.note||'';r.held=false;this.transition(r,'cancelled');
};
Warehouse.prototype.resolveTask=function(id,actualQty,note){
  var task=this.tasks.find(function(t){return t.id===id;});if(!task||task.status!=='open')throw Error('Açık kontrol görevi bulunamadı.');
  if(!Number.isSafeInteger(actualQty)||actualQty<0)throw Error('Sayım adedi sıfır veya pozitif tam sayı olmalıdır.');
  if(typeof note!=='string'||note.trim().length<5)throw Error('Kontrol sonucunu kısa bir notla açıklayın.');
  var item=this.item(task.key),held=item.warehouse-this.available(task.key);
  if(actualQty<held)throw Error('Sayım açık ayırmaların altında. Önce ilgili istek ve ayırmaları çözün.');
  task.previousQty=item.warehouse;item.warehouse=actualQty;task.actualQty=actualQty;task.note=note.trim();task.status='resolved';task.resolvedAt=this.now();this.record(id+' kapatıldı; depo sayımı '+actualQty+'.');
};
Warehouse.prototype.isOpen=function(r){return ['delivered','cancelled','returned','expired'].indexOf(r.status)<0;};
Warehouse.prototype.suggestions=function(){
  var self=this;
  return this.stock.map(function(item){
    var floor=(item.floor||[]).reduce(function(n,l){return n+l.qty;},0);
    var pending=self.replenishments.filter(function(j){return j.key===item.key&&j.status==='pending';}).reduce(function(n,j){return n+j.qty;},0);
    var demand=self.requests.filter(function(r){return r.key===item.key&&self.now()-r.createdAt<=3600000;}).reduce(function(n,r){return n+r.qty;},0);
    return {key:item.key,dept:item.dept,floor:floor,available:self.available(item.key),demand:demand,qty:self.underReview(item.key)?0:Math.min(self.available(item.key),Math.max(0,(item.floorTarget||3)-floor-pending))};
  }).filter(function(s){return s.qty>0;}).sort(function(a,b){return b.demand-a.demand||a.floor-b.floor;});
};
Warehouse.prototype.replenish=function(key,qty,location){
  this.assertStockReady(key);
  this.quantity(qty);var item=this.item(key);
  if(!new RegExp('^'+item.dept+'[1-9][0-9]*[WTC][1-9][0-9]*$').test(location))throw Error('Geçerli bölüm konumu seçin.');
  if(this.available(key)<qty)throw Error('Reyon tamamlama için serbest stok yetersiz.');
  var job={id:'REYON-'+(this.replenishments.length+1),key:key,qty:qty,location:location,status:'pending',at:this.now(),owner:item.dept+' depo ekibi'};
  this.replenishments.push(job);this.record(job.id+' oluşturuldu; '+qty+' adet ayrıldı.');return job;
};
Warehouse.prototype.completeReplenishment=function(id,location){
  var job=this.replenishments.find(function(j){return j.id===id;});if(!job||job.status!=='pending')throw Error('Açık reyon tamamlama görevi yok.');
  if(job.location!==location)throw Error('Okutulan konum görevin hedefiyle eşleşmiyor.');
  var item=this.item(job.key),floor=item.floor.find(function(l){return l.code===location;});
  if(!floor){floor={code:location,qty:0};item.floor.push(floor);}
  item.warehouse-=job.qty;floor.qty+=job.qty;job.status='completed';job.completedAt=this.now();this.record(id+' konum doğrulandı; reyon stoğu güncellendi.');
};
Warehouse.prototype.cancelReplenishment=function(id){var job=this.replenishments.find(function(j){return j.id===id;});if(!job||job.status!=='pending')throw Error('Açık reyon görevi yok.');job.status='cancelled';this.record(id+' iptal edildi; ayırma serbest bırakıldı.');};
Warehouse.prototype.stageMinutes=function(r){return Math.max(0,(this.now()-r.stageAt)/60000);};
Warehouse.prototype.metrics=function(dept){
  var self=this,rows=this.requests.filter(function(r){return !dept||r.dept===dept;}),active=rows.filter(function(r){return self.isOpen(r);}),counts={},sum={},samples={};
  rows.forEach(function(r){counts[r.status]=(counts[r.status]||0)+1;r.history.forEach(function(e){sum[e.from]=(sum[e.from]||0)+e.duration/60000;samples[e.from]=(samples[e.from]||0)+1;});});
  var averages={};Object.keys(sum).forEach(function(key){averages[key]=Math.round(sum[key]/samples[key]*10)/10;});
  var overdue=active.filter(function(r){return self.stageMinutes(r)>(self.limits[r.status]||25);}).sort(function(a,b){return b.stageAt-a.stageAt;}).reverse();
  var reasons={};rows.filter(function(r){return r.status==='cancelled';}).forEach(function(r){reasons[r.reason]=(reasons[r.reason]||0)+1;});
  return {open:active.length,units:active.reduce(function(n,r){return n+r.qty;},0),total:rows.length,counts:counts,overdue:overdue,oldest:active.length?Math.max.apply(null,active.map(function(r){return (self.now()-r.createdAt)/60000;})):0,stageAverages:averages,reasons:reasons};
};
Warehouse.prototype.handover=function(from,to,note){
  if(!from||!to||from===to)throw Error('Farklı devir ve devralan vardiya seçin.');
  var self=this,snapshot={id:'DEVIR-'+(this.handovers.length+1),from:from,to:to,note:note||'',at:this.now(),acceptedAt:null,
    requests:this.requests.filter(function(r){return self.isOpen(r);}).map(function(r){return {code:r.code,status:r.status,owner:r.owner,cartId:r.cartId||'',stageMinutes:Math.round(self.stageMinutes(r)),issue:r.issue};}),
    tasks:this.tasks.filter(function(t){return t.status==='open';}),carts:this.carts.filter(function(c){return c.status!=='arrived';}),replenishments:this.replenishments.filter(function(j){return j.status==='pending';}),online:this.online.filter(function(o){return o.status==='reserved';})};
  var copy=JSON.parse(JSON.stringify(snapshot));this.handovers.push(copy);this.record(copy.id+' '+from+' → '+to+' oluşturuldu.');return copy;
};
Warehouse.prototype.acceptHandover=function(id,shift){
  var h=this.handovers.find(function(h){return h.id===id;});if(!h||h.acceptedAt||h.to!==shift)throw Error('Devir kaydı bu vardiya için kabul edilemiyor.');
  h.acceptedAt=this.now();this.record(id+' '+shift+' vardiyasınca devralındı.');
};
