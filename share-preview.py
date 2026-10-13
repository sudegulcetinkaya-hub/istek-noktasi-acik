from pathlib import Path
import sys, json
from shutil import copyfile
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from PIL import Image

ROOT=Path(__file__).parent
LANG='en' if '--en' in sys.argv else 'tr'
NAME='Request-Point-Presentation-EN.pdf' if LANG=='en' else 'Istek-Noktasi-Onizleme.pdf'
EN=json.loads((ROOT/'pdf-en.json').read_text(encoding='utf-8')) if LANG=='en' else {}
def T(value):
 if LANG=='tr': return value
 if value not in EN: raise ValueError('Missing PDF translation: '+value)
 return EN[value]
OUT=ROOT/'output/pdf'/NAME
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('UI','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('UIBold','C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('UI',normal='UI',bold='UIBold')
W,H=landscape(A4)
INK,MUTE,ACCENT=map(HexColor,['#121316','#606169','#722A3B'])
RULE=HexColor('#DDDDD7')
STYLES={
 'body':ParagraphStyle('body',fontName='UI',fontSize=11.5,leading=17,textColor=INK),
 'small':ParagraphStyle('small',fontName='UI',fontSize=9,leading=13,textColor=MUTE),
 'label':ParagraphStyle('label',fontName='UIBold',fontSize=13,leading=18,textColor=INK),
 'lead':ParagraphStyle('lead',fontName='UI',fontSize=19,leading=26,textColor=INK),
}
c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1)
c.setTitle('Request Point | Project Presentation' if LANG=='en' else 'İstek Noktası | Proje Sunumu')
c.setAuthor('Sude Gül Çetinkaya')
c.setSubject('In-store and in-app requests: a prototype proposal')
def text(value,x,top,width,style='body'):
 p=Paragraph(T(value),STYLES[style]);_,height=p.wrap(width,H)
 assert top+height<H-34,(value,top,height)
 p.drawOn(c,x,H-top-height);return height
def line(x,top,width):
 c.setStrokeColor(RULE);c.setLineWidth(.6);c.line(x,H-top,x+width,H-top)
def image(name,x,top,width,max_height):
 path=ROOT/'ekran-goruntuleri'/('pdf-'+LANG+'-'+name+'.png');iw,ih=Image.open(path).size
 scale=min(width/iw,max_height/ih);dw,dh=iw*scale,ih*scale
 assert top+dh<H-45
 c.drawImage(str(path),x+(width-dw)/2,H-top-dh,width=dw,height=dh,mask='auto');return dh
def header(number,section,title,subtitle):
 c.setFillColor(ACCENT);c.rect(40,H-39,20,3,fill=1,stroke=0)
 c.setFont('UIBold',9);c.drawString(70,H-41,('REQUEST POINT / '+T(section).upper() if LANG=='en' else 'İSTEK NOKTASI / '+section.replace('i','İ').upper()))
 c.setFillColor(INK);title=T(title);font_size=min(28,28*(W-80)/max(1,pdfmetrics.stringWidth(title,'UI',28)));c.setFont('UI',font_size);c.drawString(40,H-88,title)
 text(subtitle,40,103,W-80)
 line(40,H-38,W-80);c.setFillColor(MUTE);c.setFont('UI',8)
 c.drawString(40,23,T('Proje önerisi • Ekranlar örnek verilerle çalışır; gerçek mağaza ve hesap bağlantısı yoktur.'))
 c.drawRightString(W-40,23,f'{number} / 12')
 c.setFillColor(ACCENT);c.setFont('UI',8)
 c.drawString(40,11,T('Hazırlayan: Sude Gül Çetinkaya'))
def note(title,body,x,top,width):
 height=text(title,x,top,width,'label');return height+8+text(body,x,top+height+8,width)

header(1,'Fikir','Müşteri için netlik. Ekip için kontrol.',
 'Müşterinin bilgiye ulaşmasını, danışmanın hizmete odaklanmasını ve deponun işi tek kayıttan yönetmesini amaçlıyorum.')
text('İstek Noktası',40,174,330,'lead')
text('Hazırlayan: Sude Gül Çetinkaya',40,202,330,'small')
text('İki seçenek öneriyorum: mağaza ekranı ve müşterinin kendi Zara uygulaması. Her ikisi de aynı stok, istek ve teslim sürecine bağlanır.',40,219,325)
for i,(title,body) in enumerate([
 ('01  Müşteri','Stok, konum ve istek durumu birlikte.'),
 ('02  Mağaza ekibi','Daha az tekrar; müşteriye daha fazla zaman.'),
 ('03  Depo müdürü','Görünür iş yükü, gecikme ve stok sorunları.')]):
 top=310+i*68;text(title,40,top,325,'label');text(body,40,top+23,325,'small')
image('home',408,165,394,296)
text('Uygulamadan gönderimde Zara Wi-Fi şartı',408,477,394,'label')
text('İlgili mağazanın bağlantısı doğrulanır. Hesap başına son 15 dakikada en fazla 10 ürün; iptal etmek sayacı azaltmaz.',408,505,394,'small')
c.showPage()

header(2,'Müşteri','Ürünü bulmak ve karar vermek kolaylaşır.',
 'Etiketi okutma veya referans yazma seçenekleriyle müşteri kendi hızında ilerler. Stok ve konum için tekrar bilgi istemesi gerekmez.')
image('stock',40,161,355,292);image('map',426,161,376,292)
note('Reyon + depo','Müşteri reyon ve depo adedini ayrı görür. Uygun depo stoğu varsa istek açılır; ürün yoksa açık bilgi verilerek belirsiz bekleme önlenir.',40,470,355)
note('Konumunu görüntüle','İşaretli alan, hareketli rota ve masa / duvar / askı bilgisi yön bulmayı destekler. Örnek rota ortadan başlar; gerçek yol mağazada doğrulanacaktır.',426,441,376)
c.showPage()

header(3,'Müşteri','Tekrarlanan bilgi girişi azalır.',
 'Müşteri farklı bölümlerden ürünleri aynı sepete ekler. İletişim tercihi bir kez alınır; her ürün kendi kaydıyla takip edilir.')
image('basket',40,155,315,383)
note('Kodlar bölüm içinde ilerler','Kadın: <b>W-1, W-2...</b>  Erkek: <b>M-1, M-2...</b><br/>Çocuk: <b>K-1, K-2...</b><br/>Her ürün kendi bölümünün istek noktasına gelir.',395,163,407)
note('Mevcut Zara hesap QR’ı','Müşteri Hesabım bölümündeki QR’ı okuyucuya gösterir. Yeni QR üretilmez. Bu alan önerilen hesap bağlantısını canlandırır.',395,274,407)
image('qr',395,365,407,112)
text('Diğer seçenekler: WhatsApp, SMS veya yalnızca takip kodu. Tercih sepetteki tüm isteklere uygulanır.',395,495,407,'small')
c.showPage()

header(4,'Depo ve teslim','Doğru bilgi, doğru zamanda.',
 'Müşteri baştan tahmini süreyi bilir: ürün bulunursa 20-25 dakika. Aşama bilgisi, tekrar tekrar durum sorma ihtiyacını azaltmayı amaçlar.')
for top,title,body in [
 (163,'Arama ve doğrulama','Referans, renk ve beden etiketle doğrulanır. Yanlış ürünün müşteriye gitmesini ve yeniden bekleme ihtiyacını azaltmak hedeflenir.'),
 (260,'Arabaya yükleme ve sevk','Ürünün hangi arabada olduğu kayda geçer. Sevkte “Getiriliyor” bilgisi görünür; müşteri teslim noktasına erken yönlendirilmez.'),
 (357,'Varış ve teslim','Varış doğrulanınca hazır haberi çıkar. Müşteri ilgili bölümün istek noktasına gider; raf adı veya kod gösterme talebi verilmez.')]:
 note(title,body,40,top,385)
image('ready',483,155,270,337);line(40,481,385)
text('Hazır olduktan sonra 20 dakika alınmayan ürün dönüşe alınır. Stok, ürün gerçekten depoya dönüp okutulunca güncellenir.',40,495,385,'small')
text('Personel teslimi kaydeder; istek kapanır.',473,514,290,'small')
c.showPage()

header(5,'Ürün bulunamazsa','Kısa seçim, çözüme dönük kayıt.',
 'Dört neden seçeneği çalışanın işini kolaylaştırır. Yönetici tekrar eden sorunları görür; müşteri sade ve anlaşılır sonuç alır.')
image('reasons',40,163,355,170);image('other',40,355,315,179)
note('İkinci kontrol','Stok hatası veya “Diğer” kaydında ikinci arama gerekir. Yine bulunamazsa istek kapatılır ve müşteriye kısa bir bilgi verilir.',435,168,367)
note('Konum güncel değilse','Ürün reyonda olabilir. Arama, destek ekibine devredilebilir; istek ve önceki notlar korunur.',435,287,367)
note('Hasar ve stok sayımı','Satışa uygun olmayan ürün teslim edilmez. Stok sorunu için kontrol işi açılır; fiziksel sayım ve sonuç kaydedilir.',435,393,367)
c.showPage()

header(6,'Depo müdürü','Depo müdürü önceliği veriye göre belirler.',
 'Bekleme süresi, sorumlu ekip ve stok sorunları aynı görünümde. Amaç desteği doğru işe yönlendirmek ve gecikmeye zamanında müdahale etmek.')
image('queue',40,160,422,362)
note('Öncelik ve görev devri','En uzun bekleyen aşama öne gelir. Müdür görevi devredebilir, ikinci kontrolü başlatabilir ve aşama uyarı sürelerini ayarlayabilir.',496,166,306)
note('Yoğunluk ve istek alımı','Yoğunluk bilgisi ile yeni istek alımını durdurma ayrı seçeneklerdir. Mevcut işler takip edilmeye devam eder.',496,291,306)
note('Ortak stok','Mağaza isteği, online sipariş ve reyon görevi aynı adetten pay alır. Yeni istek yalnızca serbest stoktan açılır.',496,415,306)
c.showPage()

header(7,'Depo müdürü','Vardiya değişir, işin bilgisi korunur.',
 'Tamamlama ve devir kayıtları, yeni ekibin işi yeniden araştırmadan devam etmesini ve müşteriye tutarlı bilgi verilmesini destekler.')
image('replenish',40,165,366,233);image('handover',436,165,366,233)
note('Reyon tamamlama','Talep ve reyon adedine göre görev açılır. Depoda gereken miktar ayrılır. Hedef konumda okutulunca reyon adedi güncellenir.',40,425,366)
note('Vardiya devri','Açık istekler, sorun notları, arabalar ve ayırmalar devir kaydında tutulur. Yeni vardiya devri kabul eder; zamanı kaydedilir.',436,425,366)
c.showPage()

header(8,'2. seçenek','Kendi hesabından, Zara Wi-Fi bağlantısıyla.',
 'Müşterinin tekrar bilgi girmeden ilerlemesini, danışmanın da kişisel hizmete daha fazla zaman ayırabilmesini hedefliyorum.')
image('app-product',40,151,300,383)
note('Hesap zaten açık','Kişisel bilgiler yeniden istenmez. Sepet her yerden hazırlanabilir; depoya gönderim ilgili mağazanın doğrulanmış Zara Wi-Fi bağlantısıyla açılır.',385,160,417)
note('Satış danışmanının yönlendirmesi','“Dilerseniz mağazamızın Zara Wi-Fi ağına bağlanıp ürün isteğinizi uygulamadan oluşturabilirsiniz. Durumunu da aynı ekrandan takip edebilirsiniz.”',385,282,417)
note('İki seçenek birlikte kullanılabilir','Uygulamayı tercih etmeyen müşteriler için mağaza ekranı devam eder. İstek nereden gelirse gelsin aynı depo iş sırasına düşer.',385,425,417)
c.showPage()

header(9,'2. seçenek','Tek hesapta istek ve durum takibi.',
 'Mağaza bağlantısı, ürün sınırı ve stok kontrol edilir. Müşteri kendi telefonundan ilerler; depo aynı iş sırasını kullanır.')
image('app-wifi',40,156,330,376);image('app-ready',423,156,330,376)
text('Sepeti onayla. Hesaba bağlı istek oluştur.',40,531,350,'small')
text('Ürün gelince ilgili istek noktasından teslim al.',423,531,370,'small')
c.showPage()

header(10,'Bağlantı ve sınır','Ekibin zamanını ve hizmet sırasını korumak.',
 'Zara Wi-Fi şartı ve hesap başına ürün sınırı, mağaza dışından veya tekrar tekrar açılan isteklerin iş yükünü sınırlamak için önerilmiştir.')
image('app-limit',40,154,310,386)
note('Doğrulanmış Zara Wi-Fi','Ağ adı yeterli değildir. Zara altyapısı bağlantıyı ilgili mağaza ve hesap için doğrulamalıdır. Her yeni gönderimde kontrol tekrarlanır.',394,164,408)
note('15 dakikada toplam 10 ürün','Her ürün ayrı sayılır. İptal veya teslim sayacı azaltmaz. Sayfa yenilemek ve uygulamayı kapatmak hakkı yenilemez.',394,282,408)
note('Mevcut istek takibi devam eder','Bağlantı kesilince yeni gönderim bekler. Sepet korunur; mevcut isteklerin durumu takip edilebilir. Wi-Fi kullanılamıyorsa mağaza ekranından devam edilir.',394,388,408)
text('Bu ekran örnektir. Gerçek bağlantı ve hesap genelindeki kalıcı sayaç, merkezi sistemde doğrulanmalıdır.',394,508,408,'small')
c.showPage()


header(11,'Zara hizmetleriyle bağlantı','Mevcut deneyimi tamamlayan bir öneri.',
 'Zara’nın yayımladığı hizmetlerden yola çıktım; depodan ürün talebi ve takibi bu deneyimin devamı olarak tasarladım.')
note('Mevcut hizmetler','<b>Zara Wi-Fi:</b> cihazla ilişkili sertifika üzerinden mağaza bağlantısı.<br/><br/><b>Store Mode / Click and Find:</b> ürünün mağaza krokisi üzerinde görüntülenmesi.',40,168,355)
note('Önerdiğim katkı','Müşterinin aynı hesapla depodan ürün istemesi ve durumunu izlemesi.<br/><br/>Mağaza ekibinin ortak iş sırası, stok ayırma ve kapasite kontrolüyle ilerlemesi.',438,168,364)
line(40,340,W-80)
note('Politikalarla uyum için değerlendirme','Canlı kullanım öncesinde Zara’nın yetkili ekipleri operasyonu, bilgi güvenliğini ve kişisel veri süreçlerini değerlendirmelidir. Wi-Fi şartı ve 15 dakika / 10 ürün sınırı bu projeye ait önerilerdir; mevcut Zara politikası olarak sunulmamaktadır.',40,361,762)
text('Kaynaklar: Zara Wi-Fi (Türkiye) ve Store Mode (Malezya). Hizmet kapsamı mağaza ve pazara göre doğrulanmalıdır. Bu sunum şirket onayı veya iç politikalara uygunluk teyidi değildir.',40,469,762,'small')
text('<link href="https://www.zara.com/tr/tr/help-center/ZaraWifi" color="#722A3B">Zara Wi-Fi - resmî hizmet bilgisi</link>     |     <link href="https://www.zara.com/my/en/help-center/StoreMode" color="#722A3B">Store Mode - resmî hizmet bilgisi</link>',40,518,762,'small')
c.showPage()

header(12,'Mağazada deneme','Ölçerek başlayalım, ekiple geliştirelim.',
 'Onaylı bağlantılar tamamlandıktan sonra tek bölümde deneme öneriyorum. Hedeflenen faydaları mevcut işleyişle karşılaştırarak değerlendirelim.')
note('Takip etmek istediklerim','Müşterinin bekleme deneyimi.<br/>Danışmana gelen tekrar eden durum soruları.<br/>Depoda arama ve teslim süresi.<br/>Stok sorunları ve vardiyada devreden işler.',40,168,338)
note('Gerçek kullanım için gerekenler','Güncel stok, etiket ve onaylı kroki.<br/>Yetkili hesap ve mağaza Wi-Fi doğrulaması.<br/>Merkezi sistemde 15 dakika / 10 ürün sınırı.<br/>Bildirim servisi ve ortak kayıt sistemi.',438,168,364)
line(40,320,W-80)
note('Prototipi kendiniz deneyin','HTML dosyasını Chrome veya Edge ile açın. 47 adım yaklaşık 5 dakika sürer; her adım 6 saniyedir. TR / EN, tam ekran ve duraklatma seçenekleri vardır.',40,345,338)
note('Örnek ürünler','<b>2298/047</b> · Kadın, L beden: reyon + depo.<br/><b>4387/242</b> · Erkek.<br/><b>1200/001</b> · Çocuk.<br/>İkinci seçenek sayfanın alt kısmında denenebilir.',438,345,364)
text('Hedefim: müşteriye açık bilgi, ekibe takip edilebilir iş.',40,498,W-80,'lead')
c.showPage();c.save()
destination=ROOT/'paylasim'/NAME;copyfile(OUT,destination);print(destination)
