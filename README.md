# İstek Noktası (Request Point)

**Canlı sürüm:** https://sudegulcetinkaya-hub.github.io/istek-noktasi-acik/
Tam ürün `index.html` dosyasıdır; indirip tarayıcıda açarak da çalıştırılabilir.

Hazırlayan: Sude Gül Çetinkaya.

Mağaza içinde müşteri isteği, depo ve teslim süreçlerini gösteren etkileşimli prototip ve proje sunumu. Ekranlar örnek veri kullanır; gerçek bir mağaza hesabına, stoğa, Wi-Fi'ye ya da bildirim hizmetine bağlı değildir.

## Yapı
- `İstek Noktası.html` — ana, tek dosyalık prototip.
- `customer-ui.js`, `operations*.js`, `product-scanner.js`, `store-location.js`, `direct-app.*`, `presentation*.js` — parçalar.
- `*-i18n.json`, `presentation-*.json`, `pdf-en.json` — metinler ve çeviriler.
- `build.cjs` — çevirileri ve arayüzü ana HTML'e gömer.
- `share.cjs`, `share-preview.py`, `mobile-presentation.py` — paylaşım HTML/PDF çıktıları (`paylasim/`).
- `STORE-INTEGRATION.md` — entegrasyon notları.
- `mobil-prototip/` (depoda yok) — paylaşılabilir mobil sürüm; ayrı yayın klasörü.

## Çalıştırma
```
node fetch-ui-assets.cjs   # dış varlıkları indirir (barkod okuyucu)
node build.cjs
node test.cjs              # ve *.test.cjs dosyaları
```

Not: Kaynak dosyalarda marka logosu, mağaza fotoğrafı ve lisanslı yazı tipi yer almaz; `node build.cjs` ile üretilen sürümde yerlerinde "LOGO" yer tutucusu, boş harita zemini ve sistem yazı tipi kullanılır. Canlı sürümde (`index.html`) bu varlıklar yalnızca görüntüleme amacıyla kodlanmış olarak bulunur ve yeniden kullanılamaz.

Zara adı, logosu ve ilgili görseller Industria de Diseño Textil, S.A. (Inditex) şirketine; Helvetica Now yazı tipi hak sahibine aittir. Bu prototip bağımsız bir proje önerisidir, Inditex ile resmi bir bağlantısı yoktur.
