const fs=require('node:fs'),path=require('node:path');
require('./build.cjs');
const output='paylasim';fs.mkdirSync(output,{recursive:true});
let html=fs.readFileSync('İstek Noktası.html','utf8');
// A conventional document wrapper for opening the standalone file in browsers.
html=html.replace(/^[\s\S]*?<body>/,'<!doctype html><html lang="tr" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="İstek Noktası: müşteri, depo ve teslim süreçlerini gösteren etkileşimli prototip."><title>İstek Noktası | Etkileşimli Prototip</title></head><body>');
html=html.replace('<title>İstek Noktası Prototipi</title>','');
html=html.replace(/font-family:(?:"Public Sans"|"IBM Plex Mono")[^;}]+/g,'font-family:var(--app-font)');
html=html.replace('</head>','<style>[hidden]{display:none!important}</style></head>');
html=html.replace('</head>','<meta name="author" content="Sude Gül Çetinkaya"></head>');
const final=path.join(output,'Istek-Noktasi-Prototip.html');fs.writeFileSync(final,html);
const english=html.replace('<html lang="tr"','<html lang="en" data-presentation-lang="en"').replace('<title>İstek Noktası | Etkileşimli Prototip</title>','<title>Request Point | Project Presentation</title>').replace('İstek Noktası: müşteri, depo ve teslim süreçlerini gösteren etkileşimli prototip.','Request Point: two proposed request channels with a shared stockroom and collection process.');
fs.writeFileSync(path.join(output,'Request-Point-Presentation-EN.html'),english);
const external=[...html.matchAll(/<(?:script|link|img)\b[^>]*(?:src|href)="(https?:[^\"]+)"/g)].map(x=>x[1]);
if(external.length)throw Error('External loading dependency: '+external.join(', '));
fs.writeFileSync(path.join(output,'WhatsApp-Mesaji.txt'),"Merhaba, hazırladığım İstek Noktası projesini görüşünüze sunmak istiyorum. Amacım, müşterinin ürününü beklerken durumunu kolayca öğrenmesi, satış danışmanının müşteriyle daha fazla ilgilenebilmesi ve depo ekibinin istekleri tek kayıttan yönetebilmesi.\n\nİki seçenek hazırladım: mağazadaki istek ekranı ve müşterinin mevcut Zara hesabından istek oluşturması. Uygulama seçeneğinde depoya gönderim, ilgili mağazanın Zara Wi-Fi bağlantısı doğrulandıktan sonra açılıyor. Önerdiğim 15 dakikada 10 ürün sınırında iptaller de sayılıyor; amaç tekrar eden isteklerin ekibin ve diğer müşterilerin zamanını almasını sınırlamak.\n\nDepo müdürü için iş yükü, geciken işler, stok sorunları ve vardiya devri aynı akışta yer alıyor. Önerinin Zara’nın mevcut Wi-Fi ve mağaza içi ürün bulma hizmetleriyle bağlantısını da sunumda açıkladım.\n\nTürkçe ve İngilizce PDF’ler telefonda incelenebilir. Etkileşimli HTML sunumu bilgisayarda Chrome veya Edge ile açılıyor; 47 adım yaklaşık 5 dakika sürüyor. Hazırladığım ekranlar örnek verilerle çalışıyor. Uygun görülürse gerekli bağlantıları ve süreçleri ilgili ekiplerle değerlendirip tek bölümde denemeyi öneriyorum.\n\nSude Gül Çetinkaya\n");
console.log(final+' · '+(fs.statSync(final).size/1024/1024).toFixed(2)+' MB · embedded assets');
