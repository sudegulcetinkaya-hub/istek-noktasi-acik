// Refresh the embedded customer UI and translations. The HTML remains standalone.
const fs=require('fs');
const file='İstek Noktası.html';
let html=fs.readFileSync(file,'utf8');
const translations=JSON.parse(fs.readFileSync('customer-i18n.json','utf8'));
const locationTranslations=JSON.parse(fs.readFileSync('store-location-i18n.json','utf8'));
for(const language of Object.keys(translations))Object.assign(translations[language],locationTranslations[language]);
const keys=Object.keys(translations.tr).sort();
for(const [language,entries] of Object.entries(translations)){
  if(JSON.stringify(Object.keys(entries).sort())!==JSON.stringify(keys))throw Error('Incomplete language: '+language);
  for(const key of keys){
    if(typeof entries[key]!=='string'||!entries[key].trim())throw Error('Empty translation: '+language+'/'+key);
    const params=text=>(text.match(/\{\w+\}/g)||[]).sort().join(',');
    if(params(entries[key])!==params(translations.tr[key]))throw Error('Translation parameters differ: '+language+'/'+key);
  }
}
function embed(start,end,text){
  const a=html.indexOf(start),b=html.indexOf(end,a);
  if(a<0||b<0)throw Error('Missing embed markers');
  html=html.slice(0,a+start.length)+'\n'+text+'\n  '+html.slice(b);
}
// One-time migration from the original static report and independent demo actions.
if(!html.includes('/* OPERATIONS_MODEL_START */')){
  const reasonStart=html.indexOf('  var REASONS='),i18nStart=html.indexOf('  /* CUSTOMER_I18N_START */');
  html=html.slice(0,reasonStart)+html.slice(i18nStart);
  const stateStart=html.indexOf('  var S;'),scriptEnd=html.indexOf('})();',stateStart);
  html=html.slice(0,stateStart)+[
    '/* CUSTOMER_UI_START */','/* CUSTOMER_UI_END */',
    '/* OPERATIONS_MODEL_START */','/* OPERATIONS_MODEL_END */',
    '/* OPERATIONS_DASHBOARD_START */','/* OPERATIONS_DASHBOARD_END */',
    '/* OPERATIONS_APP_START */','/* OPERATIONS_APP_END */',''
  ].join('\n')+html.slice(scriptEnd);
  const reportStart=html.indexOf('<section class="rep">'),notesStart=html.indexOf('<section class="rep zara">',reportStart);
  html=html.slice(0,reportStart)+'<section class="rep operations" id="ops" aria-label="Depo müdürü paneli"></section>\n'+html.slice(notesStart);
  const styleEnd=html.lastIndexOf('</style>',html.indexOf('<div class="page">'));
  html=html.slice(0,styleEnd)+'/* OPERATIONS_CSS_START */\n/* OPERATIONS_CSS_END */\n'+html.slice(styleEnd);
}
embed('/* CUSTOMER_I18N_START */','/* CUSTOMER_I18N_END */','  var I18N='+JSON.stringify(translations,null,2)+';');
if(!html.includes('/* APP_FONTS_START */'))html=html.replace('/* OPERATIONS_CSS_START */','/* APP_FONTS_START */\n/* APP_FONTS_END */\n/* OPERATIONS_CSS_START */');
const fonts=()=>[300,400,500,700].map(weight=>'@font-face{font-family:"Helvetica Now Text";font-style:normal;font-weight:'+weight+';font-display:swap;src:url(data:font/woff2;base64,'+fs.readFileSync('assets/helvetica-now-'+weight+'.woff2').toString('base64')+') format("woff2");}').join('\n');
embed('/* APP_FONTS_START */','/* APP_FONTS_END */',fs.existsSync('assets/helvetica-now-400.woff2')?fonts()+'\n:root{--app-font:"Helvetica Now Text",Helvetica,Arial,sans-serif;}':':root{--app-font:Helvetica,Arial,sans-serif;}');
if(!html.includes('<!-- BARCODE_VENDOR_START -->'))html=html.replace('<script>','<!-- BARCODE_VENDOR_START -->\n<!-- BARCODE_VENDOR_END -->\n<script>');
const barcodeLicense='/* @zxing/browser 0.1.5\n'+fs.readFileSync('assets/zxing-browser-LICENSE','utf8')+'\n@zxing/library\n'+fs.readFileSync('assets/zxing-library-LICENSE','utf8')+'\n*/\n';
embed('<!-- BARCODE_VENDOR_START -->','<!-- BARCODE_VENDOR_END -->','<script src="data:application/javascript;base64,'+Buffer.from(barcodeLicense+fs.readFileSync('assets/zxing-browser.min.js','utf8')).toString('base64')+'"></script>');
if(!html.includes('/* PRODUCT_SCANNER_START */'))html=html.replace('/* CUSTOMER_UI_START */','/* PRODUCT_SCANNER_START */\n/* PRODUCT_SCANNER_END */\n/* CUSTOMER_UI_START */');
embed('/* PRODUCT_SCANNER_START */','/* PRODUCT_SCANNER_END */',fs.readFileSync('product-scanner.js','utf8'));
if(!html.includes('/* STORE_LOCATION_START */'))html=html.replace('/* CUSTOMER_UI_START */','/* STORE_LOCATION_START */\n/* STORE_LOCATION_END */\n/* CUSTOMER_UI_START */');
embed('/* STORE_LOCATION_START */','/* STORE_LOCATION_END */','var SHARED_ZARA_IMAGE="'+(fs.existsSync('assets/zorlu-zara-reference.png')?'data:image/png;base64,'+fs.readFileSync('assets/zorlu-zara-reference.png').toString('base64'):'')+'";\n'+fs.readFileSync('store-location.js','utf8'));
embed('/* CUSTOMER_UI_START */','/* CUSTOMER_UI_END */','var ZARA_TRANSITION_LOGO="'+(fs.existsSync('assets/zara-logo.svg')?'data:image/svg+xml;base64,'+fs.readFileSync('assets/zara-logo.svg').toString('base64'):'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAwIDQyMSI+PHRleHQgeD0iNTAwIiB5PSIyNjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJHZW9yZ2lhLHNlcmlmIiBmb250LXNpemU9IjIwMCIgbGV0dGVyLXNwYWNpbmc9Ii0xMCIgZmlsbD0iY3VycmVudENvbG9yIj5MT0dPPC90ZXh0Pjwvc3ZnPg==')+'";\n'+fs.readFileSync('customer-ui.js','utf8'));
embed('/* OPERATIONS_MODEL_START */','/* OPERATIONS_MODEL_END */',fs.readFileSync('operations.js','utf8'));
embed('/* OPERATIONS_DASHBOARD_START */','/* OPERATIONS_DASHBOARD_END */',fs.existsSync('operations-dashboard.js')?fs.readFileSync('operations-dashboard.js','utf8'):'');
embed('/* OPERATIONS_APP_START */','/* OPERATIONS_APP_END */',fs.readFileSync('operations-ui.js','utf8'));
if(!html.includes('/* PRESENTATION_START */'))html=html.replace('/* OPERATIONS_APP_START */','/* PRESENTATION_START */\n/* PRESENTATION_END */\n/* OPERATIONS_APP_START */');
embed('/* PRESENTATION_START */','/* PRESENTATION_END */','var PRESENTATION_SLIDES='+fs.readFileSync('presentation-content.json','utf8')+';\nvar PRESENTATION_EN='+fs.readFileSync('presentation-en.json','utf8')+';\nvar PRESENTATION_COPY='+fs.readFileSync('presentation-copy.json','utf8')+';\n'+fs.readFileSync('app-request-policy.js','utf8')+'\n'+fs.readFileSync('direct-app.js','utf8')+'\n'+fs.readFileSync('presentation-language.js','utf8')+'\n'+fs.readFileSync('presentation.js','utf8'));
embed('/* OPERATIONS_CSS_START */','/* OPERATIONS_CSS_END */',fs.readFileSync('operations.css','utf8')+'\n'+fs.readFileSync('product-scanner.css','utf8')+'\n'+fs.readFileSync('presentation.css','utf8')+'\n'+fs.readFileSync('direct-app.css','utf8'));
if(!html.includes('<!-- PROJECT_INTRO_START -->')){
  const start=html.indexOf('<div class="top">'),end=html.indexOf('<div class="grid2">',start);
  if(start<0||end<0)throw Error('Project header missing');
  html=html.slice(0,start)+'<!-- PROJECT_INTRO_START -->\n<!-- PROJECT_INTRO_END -->\n'+html.slice(end);
}
embed('<!-- PROJECT_INTRO_START -->','<!-- PROJECT_INTRO_END -->',fs.readFileSync('project-intro.html','utf8'));
if(!html.includes('<!-- DIRECT_APP_START -->'))html=html.replace('<section class="rep operations"','<!-- DIRECT_APP_START -->\n<!-- DIRECT_APP_END -->\n<section class="rep operations"');
embed('<!-- DIRECT_APP_START -->','<!-- DIRECT_APP_END -->',fs.readFileSync('direct-app-section.html','utf8'));
const notesStart=html.indexOf('<section class="rep zara">');
if(notesStart>=0){const notesEnd=html.indexOf('</section>',notesStart);html=html.slice(0,notesStart)+fs.readFileSync('integration-notes.html','utf8')+html.slice(notesEnd+'</section>'.length);}
html=html.replace(/font-family:(?:"Public Sans"|"IBM Plex Mono"|Georgia)[^;}]+/g,'font-family:var(--app-font)');
fs.writeFileSync(file,html);
console.log('Built standalone HTML with complete translations for '+Object.keys(translations).join(', '));
