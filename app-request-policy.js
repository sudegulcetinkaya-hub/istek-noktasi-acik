// Prototype-only rolling ledger. Live enforcement requires a trusted server clock,
// authenticated account, store-network proof and an atomic server transaction.
var APP_REQUEST_RULE={limit:10,windowMs:15*60000,key:'istek-demo-app-request-history-v1'};
function AppRequestPolicy(storage,clock){this.storage=storage;this.clock=clock||Date.now;}
AppRequestPolicy.prototype.read=function(){
  var now=this.clock(),raw=this.storage.getItem(APP_REQUEST_RULE.key);
  if(!Number.isSafeInteger(now)||now<0)throw Error('clock');
  var data=raw===null?{version:1,account:'demo-zara-account',lastAt:0,events:[]}:JSON.parse(raw);
  if(!data||data.version!==1||data.account!=='demo-zara-account'||!Array.isArray(data.events)||!Number.isSafeInteger(data.lastAt)||data.lastAt<0||data.events.length>100)throw Error('storage');
  if(now<data.lastAt)throw Error('clock');
  data.events.forEach(function(e){if(!e||!Number.isSafeInteger(e.at)||e.at<0||e.at>data.lastAt||!Number.isSafeInteger(e.qty)||e.qty<1||e.qty>APP_REQUEST_RULE.limit||typeof e.storeId!=='string')throw Error('storage');});
  data.events=data.events.filter(function(e){return now-e.at<APP_REQUEST_RULE.windowMs;}).sort(function(a,b){return a.at-b.at;});
  return {data:data,now:now,raw:raw};
};
AppRequestPolicy.prototype.inspect=function(qty){
  try{
    if(!Number.isSafeInteger(qty)||qty<0)throw Error('quantity');
    var r=this.read(),used=r.data.events.reduce(function(n,e){return n+e.qty;},0),remaining=Math.max(0,APP_REQUEST_RULE.limit-used),need=used+qty-APP_REQUEST_RULE.limit,waitUntil=0;
    if(need>0)for(var i=0;i<r.data.events.length;i++){need-=r.data.events[i].qty;if(need<=0){waitUntil=r.data.events[i].at+APP_REQUEST_RULE.windowMs;break;}}
    return {ok:qty<=remaining,used:used,remaining:remaining,waitMs:Math.max(0,waitUntil-r.now),reason:qty>APP_REQUEST_RULE.limit?'basket':qty>remaining?'limit':'',record:r};
  }catch(e){return {ok:false,used:null,remaining:0,waitMs:0,reason:e.message==='clock'?'clock':'storage'};}
};
AppRequestPolicy.prototype.consume=function(qty,storeId){
  var check=this.inspect(qty);if(!check.ok||qty<1)return {ok:false,reason:check.reason||'quantity'};
  var data=check.record.data;data.lastAt=check.record.now;data.events.push({at:data.lastAt,qty:qty,storeId:storeId});
  try{var raw=JSON.stringify(data);this.storage.setItem(APP_REQUEST_RULE.key,raw);if(this.storage.getItem(APP_REQUEST_RULE.key)!==raw)throw Error('storage');return {ok:true};}
  catch(e){return {ok:false,reason:'storage'};}
};
function appIsDemo(){return typeof window==='undefined'||!window.ISTEK_STORE_DATA;}
function appPolicy(){
  if(typeof PRESENTATION!=='undefined'&&PRESENTATION.active){
    var a=S.app;return new AppRequestPolicy({getItem:function(){return a.rateMemory||null;},setItem:function(key,value){a.rateMemory=value;}});
  }
  return new AppRequestPolicy({getItem:function(key){return localStorage.getItem(key);},setItem:function(key,value){localStorage.setItem(key,value);}});
}
function appNetworkReady(){var a=S.app;return appIsDemo()&&a.signedIn&&a.network.verified===true&&a.network.storeId===STORE_CONTEXT.id&&a.network.account==='demo-zara-account';}
function appPolicyError(check){
  if(check.reason==='storage')return appText('İstek sınırı kaydedilemiyor. Tarayıcı depolamasını etkinleştirin veya mağazadaki istek ekranını kullanın.','The request limit cannot be saved. Enable browser storage or use the in-store request screen.');
  if(check.reason==='clock')return appText('Cihaz saatini kontrol edin. İstek sınırı şu anda doğrulanamıyor.','Check the device clock. The request limit cannot be verified right now.');
  if(check.reason==='basket')return appText('Bir gönderimde en fazla 10 ürün isteyebilirsiniz.','You can request up to 10 items in one submission.');
  return appText('Son 15 dakikada en fazla 10 ürün istenebilir. İptal edilenler de bu sınıra dahildir.','You can request up to 10 items in any 15-minute period. Cancelled requests also count.')+(check.waitMs?' '+appText('Bu sepet için yaklaşık '+Math.ceil(check.waitMs/60000)+' dakika sonra tekrar deneyin.','Try this basket again in about '+Math.ceil(check.waitMs/60000)+' minutes.'):'');
}
// Serialize submissions from tabs sharing this prototype origin. The demo never
// claims that localStorage or browser locks are a production security boundary.
function submitAppRequest(){
  if(S.app.submitting)return;
  var a=S.app;
  if(typeof navigator==='undefined'||!navigator.locks){a.error=true;a.notice=appText('Bu tarayıcıda güvenli gönderim kullanılamıyor. Güncel Chrome veya Edge kullanın.','Submission is unavailable in this browser. Use an up-to-date Chrome or Edge.');renderDirectApp();return;}
  a.submitting=true;renderDirectApp();
  navigator.locks.request(APP_REQUEST_RULE.key,function(){if(S.app===a&&!(typeof PRESENTATION!=='undefined'&&PRESENTATION.active))appSubmit();}).catch(function(){a.error=true;a.notice=appText('İstek gönderilemedi. Tekrar deneyin.','The request could not be sent. Please try again.');}).finally(function(){a.submitting=false;if(S.app===a)renderAll(false);});
}
