// The screenshot is a reference image, never a source of live SKU/stock data.
var STORE_CONTEXT=(typeof window!=='undefined'&&window.ISTEK_STORE_DATA&&window.ISTEK_STORE_DATA.store)||{id:'zorlu-demo',name:'Zorlu Center',demo:true};
function sharedReferenceAvailable(){return STORE_CONTEXT.demo===true&&(typeof window==='undefined'||!window.ISTEK_STORE_DATA);}
function sharedLocationActive(){return sharedReferenceAvailable()&&S.k.category==='W'&&PRODUCTS.W.ref==='2298/047';}
function currentMapLocations(){
  var k=S.k,product=PRODUCTS[k.category];if(k.mode!=='scan'||!product)return [];
  var sizes=k.selectedSize?product.sizes.filter(function(z){return z.s===k.selectedSize;}):product.sizes;
  var grouped={};sizes.forEach(function(z){var item=S.ops.item(inventoryKey(k.category,z.s));(item&&item.floor||[]).forEach(function(loc){if(Number(loc.qty)>0)grouped[loc.code]=(grouped[loc.code]||0)+Number(loc.qty);});});
  return Object.keys(grouped).map(function(code){return {code:code,qty:grouped[code]};});
}
function productLocationTitle(){return tr('productLocationTitle',{ref:PRODUCTS[S.k.category].ref});}
function applyIncomingStoreContext(state){
  var data=typeof window!=='undefined'&&window.ISTEK_STORE_DATA,context=data&&data.context;if(!context)return;
  var product=PRODUCTS[context.department];
  if(!STORE_CONTEXT.id||!STORE_CONTEXT.name||context.storeId!==STORE_CONTEXT.id||!product||context.ref!==product.ref||!product.sizes.some(function(z){return z.s===context.size;})){
    state.k.msg={key:'contextMismatch'};return;
  }
  state.k.mode='scan';state.k.category=context.department;state.k.selectedSize=context.size;state.k.fromZara='connected';state.k.productRef=context.ref;
}
function scopedStorePlan(){
  if(!STORE_PLAN||STORE_PLAN.sample)return STORE_PLAN;
  if(STORE_PLAN.storeId!==STORE_CONTEXT.id||STORE_PLAN.department!==S.k.category)return null;
  return STORE_PLAN;
}
function storeLine(floor,department){return esc(tr('storeContext',{store:STORE_CONTEXT.name,floor:floor,department:tr(department)}));}
// Demo origins are temporary. Connected plans must supply store-approved paths.
function mapRoute(plan,locations,reference){
  if(reference)return {sample:true,origin:{x:344,y:598},points:[{x:344,y:598},{x:290,y:598},{x:290,y:674},{x:226,y:674},{x:226,y:747}]};
  if(!plan)return null;
  var fixtures=Array.isArray(plan.fixtures)?plan.fixtures:[];
  var matched=locations.filter(function(loc){return Number(loc.qty)>0&&fixtures.some(function(f){return String(f.code).toUpperCase()===String(loc.code).toUpperCase();});});
  if(plan.sample&&sharedReferenceAvailable()){
    var loc=matched[0];if(!loc)return null;
    var f=fixtures.find(function(f){return f.code.toUpperCase()===loc.code.toUpperCase();}),parsed=parseLocation(loc.code);
    if(!parsed)return null;
    var origin={x:300,y:195},x=f.x+f.width/2,y=f.y+f.height+8,points=[origin];
    if(parsed.type==='rail')points.push({x:x,y:195},{x:x,y:f.y-8});
    else if(parsed.type==='table')points.push({x:x,y:195},{x:x,y:y});
    else {var aisle=f.x+f.width+20;points.push({x:aisle,y:195},{x:aisle,y:y},{x:x,y:y});}
    return {sample:true,origin:origin,points:points};
  }
  var nav=plan.navigation,width=Number(plan.width),height=Number(plan.height);
  if(!nav||nav.verified!==true||!Array.isArray(nav.routes)||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
  function valid(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height;}
  if(!valid(nav.origin))return null;
  for(var i=0;i<nav.routes.length;i++){
    var route=nav.routes[i];if(!route||typeof route.locationCode!=='string')continue;
    var target=matched.find(function(loc){return loc.code.toUpperCase()===route.locationCode.toUpperCase();}),points=route.points;
    if(!target||!Array.isArray(points)||points.length<2||points.length>100||!points.every(valid))continue;
    if(points[0].x!==nav.origin.x||points[0].y!==nav.origin.y)continue;
    var end=points[points.length-1],fixture=fixtures.find(function(f){return f.code.toUpperCase()===route.locationCode.toUpperCase();});
    var coords=[fixture.x,fixture.y,fixture.width,fixture.height];if(!coords.every(Number.isFinite)||fixture.width<=0||fixture.height<=0)continue;
    var dx=Math.max(fixture.x-end.x,0,end.x-fixture.x-fixture.width),dy=Math.max(fixture.y-end.y,0,end.y-fixture.y-fixture.height);
    if(Math.hypot(dx,dy)>Math.max(width,height)*.04||!points.some(function(p){return p.x!==nav.origin.x||p.y!==nav.origin.y;}))continue;
    return {sample:false,origin:nav.origin,points:points};
  }
  return null;
}
function routeSvg(route,plan){
  if(!route)return '';
  var d=route.points.map(function(p,i){return (i?'L':'M')+p.x+' '+p.y;}).join(' '),o=route.origin,end=route.points[route.points.length-1];
  var width=plan&&Number(plan.width)||738,labelWidth=190,labelX=Math.max(8,Math.min(width-labelWidth-8,o.x+20)),labelY=Math.max(8,o.y-38);
  return '<g class="map-route" data-route-origin="'+o.x+','+o.y+'"><path d="'+d+'" fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round"/>'+
    '<path class="route-line" d="'+d+'" fill="none" stroke="#722A3B" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>'+
    '<path class="route-motion" d="'+d+'" pathLength="100" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'+
    '<circle cx="'+end.x+'" cy="'+end.y+'" r="8" fill="#722A3B" stroke="#fff" stroke-width="3"/>'+
    '<circle cx="'+o.x+'" cy="'+o.y+'" r="11" fill="#121316" stroke="#fff" stroke-width="4"/>'+
    '<rect x="'+labelX+'" y="'+labelY+'" width="'+labelWidth+'" height="30" rx="4" fill="#121316"/>'+
    '<text x="'+(labelX+labelWidth/2)+'" y="'+(labelY+21)+'" text-anchor="middle" font-size="16" fill="#fff">'+esc(tr('youAreHere'))+'</text></g>';
}
function routeDetails(route){
  return route?'<div class="route-caption"><span>'+esc(tr('routeSummary'))+'</span>'+(route.sample?'<small>'+esc(tr('routeExample'))+'</small>':'')+'</div>':'<p class="map-note">'+esc(tr('routeUnavailable'))+'</p>';
}
function referenceMapSvg(){
  var h='<svg class="floor-plan reference-plan" viewBox="55 340 635 605" role="img" aria-label="'+esc(productLocationTitle()+' · '+tr('doorLabel',{n:1})+' · '+tr('doorLabel',{n:2}))+'" dir="ltr">';
  h+='<svg x="55" y="340" width="635" height="605" viewBox="55 340 635 605" overflow="hidden"><image href="'+SHARED_ZARA_IMAGE+'" x="0" y="0" width="738" height="1600"/></svg>';
  // Outline follows only the pale-blue area already visible in the supplied image.
  h+='<path class="reference-highlight" d="M204 632 L255 632 L255 833 L238 841 L205 832 L198 814 L198 709 L204 691 Z" fill="var(--accent)" fill-opacity=".12" stroke="var(--accent)" stroke-width="3"/>';
  h+=routeSvg(mapRoute(null,currentMapLocations(),true));
  h+='<g class="product-map-pin"><circle cx="226" cy="747" r="18" fill="var(--accent)"/><circle cx="226" cy="747" r="6" fill="#fff"/><path d="M246 747H277" stroke="var(--accent)" stroke-width="2"/><rect x="277" y="730" width="175" height="34" rx="2" fill="#fff"/><text x="364" y="752" text-anchor="middle" fill="#57202E" font-size="15">'+esc(tr('productArea'))+'</text></g>';
  [{n:1,x:227,y:843,lx:77,ly:889},{n:2,x:343,y:846,lx:367,ly:889}].forEach(function(d){
    h+='<g class="entrance-marker" data-door="'+d.n+'"><path d="M'+d.x+' '+(d.y+18)+' L'+(d.lx+104)+' '+d.ly+'" fill="none" stroke="#121316" stroke-width="2"/><circle cx="'+d.x+'" cy="'+d.y+'" r="18" fill="#121316" stroke="#fff" stroke-width="3"/><text x="'+d.x+'" y="'+(d.y+6)+'" text-anchor="middle" fill="#fff" font-size="18" font-weight="700">'+d.n+'</text><rect x="'+d.lx+'" y="'+d.ly+'" width="208" height="34" rx="2" fill="#121316"/><text x="'+(d.lx+104)+'" y="'+(d.ly+23)+'" text-anchor="middle" fill="#fff" font-size="15">'+esc(tr('doorLabel',{n:d.n}))+'</text></g>';
  });
  return h+'</svg>';
}
function mapButton(action,text,disabled){return '<button type="button" data-map-action="'+action+'"'+(disabled?' disabled':'')+'>'+esc(text)+'</button>';}
function mapDialog(svg,details,route){
  if(!S.k.mapExpanded)return '';
  var zoom=S.k.mapZoom||1;
  return '<dialog id="location-dialog" class="location-dialog" aria-labelledby="location-dialog-title"><div class="location-dialog-head"><b id="location-dialog-title">'+esc(productLocationTitle())+'</b>'+mapButton('close',tr('closeMap'))+'</div>'+(details||'')+(svg?routeDetails(route)+'<div class="map-zoom-tools">'+(route?mapButton('replay',tr('routeReplay')):'')+mapButton('out','− '+tr('zoomOut'),zoom<=1)+mapButton('reset',tr('resetMap'))+mapButton('in','+ '+tr('zoomIn'),zoom>=3)+'</div><div class="map-scroll" dir="ltr"><div style="width:'+zoom*100+'%;--map-zoom:'+zoom+'">'+svg+'</div></div>':'')+'</dialog>';
}
function renderSharedMap(){
  return mapDialog(referenceMapSvg(),'<p class="map-store-line">'+storeLine('P0','W')+'</p>',mapRoute(null,currentMapLocations(),true));
}
function entranceMarkers(plan){
  var width=Number(plan.width)||600,height=Number(plan.height)||360;
  var doors=(plan.entrances||[]).filter(function(d){return Number.isFinite(d.x)&&Number.isFinite(d.y)&&d.x>=0&&d.x<=width&&d.y>=0&&d.y<=height;});
  return doors.map(function(d,i){
    var size=Math.min(20,Math.max(12,width/34)),labelX=Math.max(size*5,Math.min(width-size*5,d.x)),labelY=d.y>height-size*5?d.y-size*3:d.y+size*3;
    var label=d.labelTranslations&&d.labelTranslations[S.lang]||tr('doorLabel',{n:i+1});
    return '<g class="entrance-marker" data-door="'+esc(d.id||String(i+1))+'"><circle cx="'+d.x+'" cy="'+d.y+'" r="'+size+'" fill="#121316" stroke="#fff" stroke-width="3"/><text x="'+d.x+'" y="'+(d.y+size*.35)+'" font-size="'+size+'" text-anchor="middle" fill="#fff">'+(i+1)+'</text><path d="M'+d.x+' '+d.y+'L'+labelX+' '+labelY+'" stroke="#121316" stroke-width="1"/><rect x="'+(labelX-size*5)+'" y="'+(labelY-size)+'" width="'+size*10+'" height="'+size*1.6+'" fill="#fff"/><text x="'+labelX+'" y="'+labelY+'" font-size="'+size*.8+'" text-anchor="middle" fill="#121316">'+esc(label)+'</text></g>';
  }).join('');
}
function renderMap(locations){
  if(!S.k.mapExpanded||!locations.length)return '';
  if(sharedLocationActive())return renderSharedMap();
  var plan=scopedStorePlan();
  if(!plan)return mapDialog('','<p class="map-note">'+tr('missingMap')+'</p>');
  var h=renderFixtureMap(locations),svg=h.match(/<svg[\s\S]*?<\/svg>/);
  var details=locations.map(function(loc){return '<p class="location-line">'+esc(locationLabel(loc))+' · <strong>'+esc(tr('units',{n:loc.qty}))+'</strong></p>';}).join('');
  if(!svg)return mapDialog('',details+'<p class="map-note">'+tr('missingMap')+'</p>');
  var route=mapRoute(plan,locations,false);
  return mapDialog(svg[0].replace('</svg>',(plan.sample?'':entranceMarkers(plan))+routeSvg(route,plan)+'</svg>'),details,route);
}
function handleMapAction(action){
  if(action==='expand'){if(!currentMapLocations().length)return;S.k.mapExpanded=true;S.k.mapZoom=1;}
  else if(action==='close'){S.k.mapExpanded=false;}
  else if(action==='in')S.k.mapZoom=Math.min(3,(S.k.mapZoom||1)+.5);
  else if(action==='out')S.k.mapZoom=Math.max(1,(S.k.mapZoom||1)-.5);
  else if(action==='reset')S.k.mapZoom=1;
  renderKiosk();
  var dialog=document.getElementById('location-dialog');
  if(S.k.mapExpanded&&dialog&&dialog.querySelector){var control=dialog.querySelector('[data-map-action="'+action+'"]:not(:disabled)')||dialog.querySelector('button');if(control)control.focus();}
  else if(document.querySelector){var opener=document.querySelector('[data-map-action="expand"]');if(opener)opener.focus();}
}
function showMapDialog(){var dialog=document.getElementById('location-dialog');if(S.k.mapExpanded&&dialog&&typeof dialog.showModal==='function'&&!dialog.open)dialog.showModal();}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&S.k.mapExpanded){e.preventDefault();handleMapAction('close');}
  if(e.key==='Enter'&&e.target&&e.target.id==='product-reference'&&S.k.mode==='entry'){e.preventDefault();S.k.productRef=e.target.value;selectProduct(S.k.productRef);renderAll();}
});
