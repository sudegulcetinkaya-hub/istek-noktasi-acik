# Zara konumu → istek noktası

Bu klasör yerel bir prototiptir. Zara uygulamasına kod yüklenmedi; gerçek ürün, hesap, stok, bildirim veya mağaza servislerine bağlantı kurulmadı.

## Paylaşılan ekran görüntüsü

Mağaza referans görüntüsü bu açık kopyada yer almaz (harita zemini boş görünür); HTML dosyası tek başına açılabilir. Harita bölgesi ekranda büyütülür; ürün alanı ve iki kapı simgesi üst katmanda belirginleştirilir. Kapıların anlamı ve konumu mağaza tarafından doğrulanmış sayılmaz. Görselde olmayan ürün referansı, beden, mobilya türü ve stok bilgisi çıkarılmaz.

Ana ekran iki seçenek sunar: **İstek oluştur** ve **İsteğimi sorgula**. İstek oluştur seçilince **Ürün bilgisi** ekranında referans kodu girilir veya etiket okutulur. Reyon stoğu varsa **Konumunu görüntüle ↗** bağlantısı gösterilir; kroki yalnızca bu bağlantıya dokununca açılır. Beden seçildiğinde bağlantı o bedenin reyon stoğuna göre güncellenir. Başlık ürünün referans kodunu kullanır. Yerel demoda `2298/047` bu görselle ilişkilendirilmiştir; bu eşleştirme, ürün ve stok örnektir. Gerçek konum verisi sağlandığında kodun ikinci harfi mobilya türünü belirler: `W2W3` → Kadın, 2. bölüm, 3. duvar; `W1T1` → Kadın, 1. bölüm, 1. masa; `K1C2` → Çocuk, 1. bölüm, 2. askılık. Koddan kroki koordinatı hesaplanmaz; mağaza planındaki eşleştirme kullanılır.

Referans alanının yanındaki tarama düğmesi kamera izni isteyip canlı barkod taraması açar. Barkodlar cihazda ZXing ile çözülür; görüntü sunucuya gönderilmez. Doğrudan katalogdaki referansı içeren barkodlar açılır. EAN gibi ayrı barkod numaraları için yetkili mağaza bağlantısı `window.ISTEK_STORE_DATA.barcodes` eşleştirmesini sağlamalıdır:

```js
barcodes: {
  'MAGAZANIN_GERCEK_BARKODU': { ref: 'JACKET-001', size: 'L', storeId: 'STORE-001' }
}
```

Barkod numarasından ürün veya beden tahmin edilmez. Bilinmeyen barkod kullanıcıya bildirilir; tarama veya elle giriş ile devam edilebilir. Etiket okuyucu bağlantısı ayrıca `window.ISTEK_PRODUCT_READER.receive({ref, size, storeId})` çağrısını kullanır; `size` ve `storeId` isteğe bağlıdır. Klavye gibi çalışan okuyucu referans alanına yazıp Enter gönderebilir. Bilinmeyen referans, beden veya yanlış mağaza reddedilir. Okuma ürünü açar, istek oluşturmaz. Kamera kapatma, başarılı okuma, zaman aşımı ve sayfa gizlenmesi kamera akışını durdurur. Kamera için tarayıcı izni ve güvenilir bir bağlam (HTTPS / localhost veya desteklenen yerel dosya) gerekir. Kurumsal RFID okuyucu ve Zara'nın gerçek barkod kataloğu bağlı değildir.

## Yazı tipi ve tarayıcı kaynağı

23 Eylül 2026 tarihinde Zara Türkiye sitesinin gerçek stil ve font yüklemeleri incelendi. Arayüzün fontu **Helvetica Now Text**; 300, 400, 500 ve 700 ağırlıkları yerel prototipe gömülüdür. Kaynak URL'ler `fetch-ui-assets.cjs` içindedir. Fontlar [Zara'nın resmî sitesinden](https://www.zara.com/tr/) alınmıştır; bu kayıt yeniden dağıtım lisansı vermez.

Kamera tarayıcısı `@zxing/browser` 0.1.5 kullanır. Kütüphane ve lisansları `assets/` altında, bağımsız HTML içinde de gömülüdür. Kaynak: [ZXing Browser](https://github.com/zxing-js/browser).

## Veri aktarımı

Yetkili mağaza bağlantısı, ana HTML betiğinden önce aşağıdaki yapıyı `window.ISTEK_STORE_DATA` olarak vermelidir. Bu bir Zara API adresi veya QR çözümleme yöntemi değildir; prototipin veri giriş sözleşmesidir. Örnek değerler temsildir.

```js
window.ISTEK_STORE_DATA = {
  store: { id: 'STORE-001', name: 'Zorlu Center' },
  context: {
    storeId: 'STORE-001',
    department: 'W',
    ref: 'JACKET-001',
    size: 'L'
  },
  products: {
    W: {
      ref: 'JACKET-001',
      nameTranslations: { tr: 'Ceket', en: 'Jacket' },
      color: 'Siyah',
      sizes: [{
        s: 'L', warehouse: 3, bin: 'D-W-01',
        floor: [{ code: 'W2W3', qty: 2 }]
      }]
    }
  },
  plan: {
    sample: false,
    storeId: 'STORE-001',
    department: 'W',
    floor: 'P0',
    width: 600, height: 400,
    imageUrl: 'magazanin-yetkili-plan-gorseli',
    fixtures: [{ code: 'W2W3', x: 200, y: 120, width: 100, height: 20 }],
    entrances: [{ id: 'main-door', x: 80, y: 340 }],
    navigation: {
      verified: true, // Sadece mağaza tarafından onaylanmış geçiş yolları
      origin: { x: 300, y: 200 }, // İstek ekranının gerçek konumu
      routes: [{
        locationCode: 'W2W3',
        points: [{ x: 300, y: 200 }, { x: 300, y: 150 }]
      }]
    }
  }
};
```

Mağaza kimliği, bölüm, referans ve beden uyuşmazsa uygulamadan gelen seçim açılmaz. Başka mağaza veya bölümün planı gösterilmez. Oluşan istek `storeId`, `storeName`, ürün referansı, beden ve `source: 'zara-konum'` bilgilerini taşır. Sayfadaki sepet, bildirim seçimi ve depo işlemleri aynı kayıtla devam eder.

Bu sürüm bir mağaza ve seçili bölümün planını yükler; mağazalar arası canlı katalog veya kat seçimi servisi sağlamaz. Üretimde mağaza değişince doğru mağazanın ürün ve plan verileri birlikte yüklenmeli, stok ayırma merkezi sunucuda yapılmalıdır. Kapı ve mobilya koordinatları aynı planın koordinat sisteminde verilmelidir. Konum veya giriş bilgisi yoksa ekran bunu açıkça belirtir.

## Animasyonlu yol gösterimi

Kroki açılınca “Buradasınız” işaretinden ürün alanına doğru 4 saniyelik bir hareket gösterilir. Yol çizgisi ekranda kalır; “Yolu tekrar göster” düğmesi animasyonu yeniden başlatır. Cihazda hareket azaltma tercihi açıksa sabit yol gösterilir. Reyon stoğu olmayan bedenler için kroki veya rota açılmaz.

Kullanıcının tercihiyle demodaki başlangıç şimdilik krokinin orta noktasıdır. Zorlu görselinde `(344, 598)`, temsili bölüm krokisinde `(300, 195)` kullanılır. Başlangıç, ürün eşleştirmesi ve çizilen yol örnektir; “Örnek rota” olarak belirtilir. Bu çizgiler mağazada doğrulanmış yürüyüş yolu değildir ve canlı müşteri konumu ölçülmez.

Yetkili veri bağlantısında örnek başlangıç veya yol üretilmez. `navigation.verified` yalnızca mağaza cihaz konumunu ve geçilebilir yolu doğruladıktan sonra `true` olmalıdır. Noktalar planla aynı koordinat sisteminde, plan sınırları içinde olmalı; ilk nokta `origin` ile aynı, son nokta ilgili mobilyanın yanında olmalıdır. Rota yalnızca seçili bedenin pozitif reyon stoğundaki `locationCode` için gösterilir. Birden fazla uygun rota varsa gelen listedeki ilk geçerli rota kullanılır; en kısa yol hesaplandığı iddia edilmez. Yol verisi yoksa veya geçersizse ürünün konumu gösterilir ve yol bilgisinin mevcut olmadığı belirtilir.

## Müşteri metinleri ve önizleme

Ana ekrandaki iki kutuya dokunulduğunda 860 ms süren yana kayma geçişi gösterilir. Ortadaki beyaz geçiş katmanında ZARA logosu kısa süre görünür. Hedef ekran gecikmesiz hazırlanır; animasyon yalnızca görünümü değiştirir. Arapçada yön tersine döner. Hareket azaltma tercihinde animasyon atlanır. Yeni ekran çizimi, sıfırlama veya sayfadan ayrılma geçişi temizler; bitince klavye odağı ilgili başlığa / bölüm seçimine geçer.

Marka logosu bu açık kopyada yer almaz; yerinde "LOGO" yer tutucusu görünür. Bu uygulanan geçiş prototipe aittir; Zara uygulamasının gerçek animasyon kodu kullanılmamıştır.

Teslime hazır bildiriminde yalnızca ilgili bölümün istek noktası ve 20 dakikalık teslim süresi belirtilir. Müşteriden kod göstermesi istenmez; raf / depo konumları müşteri bildirimlerine aktarılmaz. W/M/K kodları durum takibi için korunur. İstek önizlemesi W, M, K gruplarında sayısal sıra kullanır (`W-2`, `W-10`dan önce gelir). Bu görünüm depo iş sırasını veya atanmış kodları değiştirmez.

## Yönetici sunumu ve paylaşım

`project-intro.html`, `presentation-content.json`, `presentation.js` ve `presentation.css` sunum katmanını oluşturur. 47 adım; mağaza ekranı, depo, teslim, ürün bulunamaması, stok kontrolü, ortak ayırmalar, reyon tamamlama, vardiya devri ve ikinci seçenek olan uygulamadan isteği kapsar. Başlangıç süresi 6 saniyedir; 10 ve 15 saniye, duraklatma, önceki/sonraki adım, tam ekran ve bölüm seçimi vardır. Son adımda oynatma durur; yeniden başlatılabilir. Başka sekmeye geçildiğinde otomatik oynatma duraklar. `presentation-en.json`, `presentation-copy.json` ve `presentation-language.js` ile açıklamalar, örnek ekranlar ve kontroller Türkçe / İngilizce değişir. İngilizce dosyada çevrilmemiş ana personel panelleri gizlenir; bu panellerin İngilizce örnekleri sunumda yer alır.

Sunum ayrı örnek kayıtlarla açılır. Çıkışta önceki prototip durumu ve sepet geri yüklenir. Adım değişimi işlemleri tekrarlayıp mevcut sepeti değiştirmez. Sağdaki ekranlar gösterim içindir; gerçek düğmeleri kullanmak için sunumdan çıkılır. Stok ve reyon örneklerinde yalnızca anlatılan işlemin ilgili kayıtları gösterilir. Prototipin kendisinde tam listeler korunur.

`node share.cjs` bağımsız `paylasim/Istek-Noktasi-Prototip.html`, İngilizce açılan `paylasim/Request-Point-Presentation-EN.html` ve `paylasim/WhatsApp-Mesaji.txt` dosyalarını üretir. Yazı tipleri, kroki, logo ve tarama kitaplığı HTML içinde gömülüdür. Sunumun açılması için harici dosya indirilmez.

`share-preview.py`, prototip ekranlarının `ekran-goruntuleri/pdf-tr-*.png` görüntülerinden 12 sayfalık yatay A4 PDF üretir. `--en` seçeneği, İngilizce ekranları ve `pdf-en.json` metinlerini kullanarak İngilizce PDF üretir. Ekranlar önceki 2x yerine 4x çözünürlükle, tamamı görünürken alınmıştır; açıklamalar PDF içinde vektör metindir. Bu değişiklik kaynak kroki görselinin gerçek ayrıntısını artırmaz. PDF'ler `output/pdf/` ve `paylasim/` içine aynı içerikle yazılır. PDF kamera veya canlı entegrasyon sağlamaz; işlemleri denemek için HTML kullanılır. Kamera izni ve gerçek etiket okuma ayrıca hedef cihazda denenmelidir.

## İkinci seçenek: Zara uygulamasından istek

`direct-app.js`, `direct-app-section.html` ve `direct-app.css`, müşterinin kendi telefonunda oturumu açık Zara hesabından istek oluşturması önerisini gösterir. Satış danışmanı uygulama seçeneğini anlatır; müşterinin hesabına giriş yapmaz. Ürün / beden seçimi, sepet ve durum takibi aynı ekrandadır. İsim, e-posta, telefon veya hesap QR'ı istenmez. Birinci seçenekteki mağaza ekranı ve bildirim tercihi korunur.

Bu ekran gerçek Zara uygulamasına veya hesabına bağlı değildir. `signedIn` ve `accountLinked` yalnızca örnek durum alanlarıdır; kimlik doğrulaması sayılmaz. Canlı kullanımda yetkili hesap oturumu, mağaza kimliği ve merkezi sunucu doğrulaması gerekir. Hesap kimlik bilgileri bu prototipte toplanmaz.

Sepete eklemek stok ayırmaz. Gönderimde tüm satırların stok ve kontrol durumları birlikte doğrulanır; bir satır uygun değilse hiçbir istek oluşturulmaz. Başarılı gönderimde `source: 'zara-app'`, mağaza ve bölüm bilgileri kaydedilir. W/M/K numaraları ve stok ayırmaları mağaza ekranıyla ortaktır. Çift gönderim boşaltılmış sepetten yeni kayıt üretmez. Sunumda uygulama kanalının W-4 / M-4 ile devam etmesi bu ortak sırayı gösterir. Üretimde bu işlem sunucuda tek işlem olarak yürütülmelidir.

## Güncel doğrulama

### Wi-Fi ve kısa süreli istek sınırı — güncel sürüm

Uygulamadan gönderim için seçili mağaza ve örnek hesapla eşleşen Wi-Fi doğrulaması gerekir. Ürün seçme ve sepete ekleme bağlantısız yapılabilir; stok ayrılmaz. Mevcut isteği izlemek için yeni Wi-Fi doğrulaması aranmaz. Bağlantı her yeni gönderimde kontrol edilir. Mağaza ekranındaki birinci seçenek korunur.

Kullanıcının seçtiği sınır **hesap başına, kayan 15 dakikalık süre içinde toplam 10 ürün**dür. Sepetteki her ürün ayrı sayılır. Mağaza veya bölüm değiştirmek yeni hak açmaz. Başarılı oluşturma anı kaydedilir; iptal, teslim ve ekrandaki örneği sıfırlama bu geçmişi azaltmaz. Sepet mevcut hakkı aşıyorsa tamamı bekletilir; kısmi istek açılmaz. Her kaydın 15 dakikası dolunca yalnızca o kaydın miktarı hesaptan düşer.

`app-request-policy.js` örnek geçmişi `istek-demo-app-request-history-v1` anahtarında tarayıcı depolamasına yazar. Her gönderimde yeniden okur; aynı kaynağı paylaşan sekmelerde Web Locks ile sırayla kontrol eder. Saklama başarısız veya kayıt bozuksa gönderimi kapatır; son kayıt zamanından geriye giden cihaz saati de kabul edilmez. Kalıcı kayıt başarısız olursa yeni depo kayıtları geri alınır. Sunum ayrı bir bellek sayacı kullanır; izlemek veya tekrar oynatmak kullanıcının deneme hakkını tüketmez. Yenilemede Wi-Fi doğrulaması sıfırlanır, istek sayacı korunur.

**Bu yerel koruma üretim güvenliği değildir.** Tarayıcı verisini silmek, başka tarayıcı / cihaz / dosya kullanmak veya istemci kodunu değiştirmek yerel sayacı aşabilir. Hesap örnektir; gerçek Zara hesabı değildir. Yerel HTML dosyalarının depolama kapsamı tarayıcıya göre değişebilir. Yeniden açılış aynı tarayıcı ve aynı dosya / kaynak içindir. Depo kayıtlarının kendisi hâlâ örnek oturum verisidir; bu ekleme tüm iş kayıtlarını kalıcı sunucuya dönüştürmez.

Gerçek kullanım için Zara'nın yetkili merkezi servisinde aşağıdakiler gerekir:

- Ağ altyapısından gelen güncel bağlantı kanıtını gerçek mağaza, oturum ve cihazla eşleştirme. Ağ adı, telefonun çevrimiçi olması veya istemcinin `verified` alanı kanıt olarak kabul edilmez.
- Her gönderimde bağlantı kanıtının geçerliliğini ve tekrar kullanımını kontrol etme. Wi-Fi bağlantısı ile doğrulama arasındaki veri bağlantısı yetkili Zara entegrasyonuyla sağlanmalıdır.
- Sunucu saatiyle tutulan, hesap genelinde tüm mağaza / bölüm / cihazlardan gelen ürünleri kapsayan 15 dakika / 10 ürün geçmişi. İptal veya teslim bu geçmişi geri almaz.
- Sepetin stok ayırması, sayaç tüketimi ve istek oluşturması tek bir sunucu işlemi olmalı. Aynı gönderimin tekrarı yeni kayıt veya ikinci sayaç tüketimi yaratmamalı.
- Yetkilendirme servisi veya sayaç kullanılamadığında yeni gönderimi kapatma; mevcut istek takibini ve mağaza ekranı alternatifini koruma.

Prototip gerçek Zara Wi-Fi ağına bağlanmaz. Telefonun dışındaki “Prototip · Bağlantı denemesi” alanı yalnızca örnek doğrulamayı açıp kapatır. `window.ISTEK_STORE_DATA` sağlanan mağaza veri modunda bu örnek doğrulama kapalıdır; gerçek servis bağlıymış gibi davranılmaz.

Güncel sunum **47 adım**, PDF'ler **12'şer sayfa**dır. Wi-Fi doğrulaması ve sınıra ulaşma ekranları Türkçe / İngilizce eklenmiştir. 4x ekran görüntüleri ve Sude Gül Çetinkaya hazırlayan bilgisi korunur. Güncel ek test: `node --test app-request-policy.test.cjs direct-app.test.cjs presentation.test.cjs`.

`node --test direct-app.test.cjs presentation.test.cjs operations.test.cjs integration.test.cjs store-location.test.cjs customer-message.test.cjs simple-kiosk.test.cjs product-scanner.test.cjs` sunum ve işlem kontrollerini çalıştırır.

`node build.cjs`, kaynakları ve görüntüyü bağımsız HTML dosyasına gömer.

`node test.cjs` ve `node --test operations.test.cjs integration.test.cjs store-location.test.cjs customer-message.test.cjs simple-kiosk.test.cjs product-scanner.test.cjs` ile müşteri, depo, kamera ve konum aktarımı kontrolleri çalıştırılır.


## Sunum metinlerinin son düzenlemesi - 24 Eylül 2026

Açılış, iki seçenek karşılaştırması ve uygulama anlatımında mağazaya ait doğrulanmış Zara Wi-Fi şartı açıkça yer alır. Metinler müşteri, satış danışmanı, depo çalışanı ve depo müdürünün hedeflenen kazanımları etrafında düzenlendi. Kazanımlar ölçülmüş sonuç olarak verilmez; pilotta mevcut işleyişle karşılaştırılır.

47. adımla biten sunumda, sondan bir önceki bölüm Zara Wi-Fi (Türkiye) ve Store Mode / Click and Find (Malezya) resmî yardım sayfalarına dayanır. Hizmet kapsamının mağaza ve pazara göre doğrulanması gerektiği belirtilir. Projenin Wi-Fi şartı ve 15 dakika / 10 ürün sınırı Zara politikası olarak sunulmaz. Canlı kullanım için yetkili ekiplerin operasyon, güvenlik ve kişisel veri değerlendirmesi gerekir. Kaynak bağlantıları HTML içinde ve 12 sayfalık iki PDF’nin 11. sayfasında bulunur.
