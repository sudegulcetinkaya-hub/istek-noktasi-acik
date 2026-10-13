function presentationSlide(index){var slide=PRESENTATION_SLIDES[index];return PRESENTATION.lang==='en'?Object.assign({},slide,PRESENTATION_EN[slide.id]):slide;}
function translatePresentationStage(stage){
  if(PRESENTATION.lang!=='en'||!document.createTreeWalker)return;
  var entries=Object.keys(PRESENTATION_COPY.stage).sort(function(a,b){return b.length-a.length;});
  var pattern=new RegExp('(?<![\\p{L}])(?:'+entries.map(function(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}).join('|')+')(?![\\p{L}])','gu');
  function translate(text){return text.replace(pattern,function(s){return PRESENTATION_COPY.stage[s];}).replace(/\b1 units\b/g,'1 unit').replace(/\b1 verified items\b/g,'1 verified item').replace(/\b1 reports\b/g,'1 report').replace(/\b1 online allocations\b/g,'1 online allocation').replace(/\b(\d+)\. search\b/g,'Search $1');}
  var walker=document.createTreeWalker(stage,4),node;while(node=walker.nextNode())node.nodeValue=translate(node.nodeValue);
  stage.querySelectorAll('[aria-label],[placeholder],[title]').forEach(function(el){['aria-label','placeholder','title'].forEach(function(attr){if(el.hasAttribute(attr))el.setAttribute(attr,translate(el.getAttribute(attr)));});});
}
function updatePresentationLanguage(){
  var en=PRESENTATION.lang==='en',index=en?1:0;
  if(document.documentElement){document.documentElement.setAttribute('data-presentation-lang',PRESENTATION.lang);document.documentElement.setAttribute('lang',PRESENTATION.lang);}
  if(document.querySelectorAll){
    document.querySelectorAll('[data-pitch]').forEach(function(el){var copy=PRESENTATION_COPY.page[el.dataset.pitch];if(copy){el.textContent=copy[index];if(el.hasAttribute('aria-label'))el.setAttribute('aria-label',copy[index]);}});
    document.querySelectorAll('[data-presentation-language]').forEach(function(el){el.setAttribute('aria-pressed',String(el.dataset.presentationLanguage===PRESENTATION.lang));});
    var link=document.querySelector('.project-actions a');if(link)link.setAttribute('href',en?'#direct-app-section':'#interactive-prototype');
    document.getElementById('presentation-locale').value=PRESENTATION.lang;
    document.querySelectorAll('#presentation-speed option').forEach(function(el){el.textContent=Number(el.value)/1000+(en?' seconds':' saniye');});
    document.getElementById('presentation-dialog').setAttribute('lang',PRESENTATION.lang);
    document.getElementById('presentation-progress').setAttribute('aria-label',en?'Presentation progress':'Sunum ilerlemesi');
  }
  document.getElementById('presentation-jump').innerHTML=PRESENTATION_SLIDES.map(function(_,i){return '<option value="'+i+'">'+(i+1)+'. '+esc(presentationSlide(i).title)+'</option>';}).join('');
  document.getElementById('presentation-duration').textContent=PRESENTATION_SLIDES.length+(en?' slides · 6 seconds each · about ':' adım · her adım 6 saniye · yaklaşık ')+Math.ceil(PRESENTATION_SLIDES.length/10)+(en?' minutes':' dakika');
}
function setPresentationLanguage(lang){
  if(!['tr','en'].includes(lang))return;
  PRESENTATION.lang=lang;updatePresentationLanguage();
  if(PRESENTATION.active)goPresentation(PRESENTATION.index);
  else {S.lang=lang;renderAll(false);}
}
function initializePresentationLanguage(){
  updatePresentationLanguage();S.lang=PRESENTATION.lang;renderAll(false);
  if(!document.querySelectorAll)return;
  document.querySelectorAll('[data-presentation-language]').forEach(function(el){el.addEventListener('click',function(){setPresentationLanguage(el.dataset.presentationLanguage);});});
  document.getElementById('presentation-locale').addEventListener('change',function(e){setPresentationLanguage(e.target.value);});
}
