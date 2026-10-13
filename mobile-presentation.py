"""Standalone portrait PDF presentation for sharing as a phone-readable file."""
from pathlib import Path
import json
from shutil import copyfile
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from PIL import Image
from pypdf import PdfReader

ROOT=Path(__file__).parent
OUT=ROOT/'output/pdf'; OUT.mkdir(parents=True,exist_ok=True)
SHARE=ROOT/'paylasim'; SHARE.mkdir(exist_ok=True)
W,H=432,864
M=32; CW=W-2*M
INK='#141416'; MUTED='#66666B'; ACCENT='#722A3B'; RULE='#DEDCDA'
pdfmetrics.registerFont(TTFont('MobileUI','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('MobileBold','C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('MobileUI',normal='MobileUI',bold='MobileBold')

def bi(tr,en): return [tr,en]
def block(trh,enh,trb,enb):return {'title':bi(trh,enh),'body':bi(trb,enb)}
slides=[]
def add(section,title,body=None,**kw):
 slides.append(dict(section=section,title=title,body=body,**kw))

add(bi('PROJE SUNUMU','PROJECT PRESENTATION'),bi('İstek\nNoktası','Request\nPoint'),kind='cover')
add(bi('AMAÇ','PURPOSE'),bi('Müşteriye açık bilgi, ekibe takip edilebilir iş','Clear information for customers. Traceable work for staff.'),
 bi('Bu projeyi, müşterinin beklerken bilgiye ulaşması ve mağaza ekibinin aynı isteği birlikte yönetebilmesi için hazırladım.','I designed this project to keep customers informed while the store team manages the same request together.'),blocks=[
 block('Müşteri','Customer','Ürünün nerede olduğunu, isteğinin durumunu ve teslim noktasını görebilir.','See item availability, request progress and the collection point.'),
 block('Satış danışmanı','Sales adviser','Tekrarlanan bilgi girişini ve durum sorularını azaltarak müşteriyle daha fazla ilgilenebilir.','Less repeated data entry and fewer status questions can leave more time for personal service.'),
 block('Depo müdürü','Stockroom manager','İş yükünü, gecikmeleri ve tekrar eden stok sorunlarını aynı kayıtlardan izleyebilir.','Use shared records to track workload, delays and recurring stock issues.')],foot=bi('Hedeflenen kazanımlar mağaza denemesinde ölçülecektir.','The intended benefits will be measured in a store trial.'))
add(bi('İKİ SEÇENEK','TWO OPTIONS'),bi('Müşteri seçer, ekip aynı akışla ilerler','Customer choice, one shared workflow'),blocks=[
 block('01  Mağaza ekranı','01  In-store screen','Etiket veya referansla istek oluşturulur. Bildirim tercihi müşteri tarafından seçilir.','Start a request with a label or reference. The customer chooses how to receive updates.'),
 block('02  Zara uygulaması','02  Zara app','Müşteri mevcut hesabıyla ilerler; kişisel bilgilerini tekrar girmez. Depoya gönderim için ilgili mağazanın Zara Wi-Fi bağlantısı doğrulanır.','Use an existing account without entering personal details again. Submission requires verified Zara Wi-Fi at the selected store.'),
 block('Ortak depo ve teslim süreci','Shared stockroom and collection process','İki seçenek de aynı iş sırasına bağlanır. Uygulamayı tercih etmeyen müşteriler mağaza ekranını kullanabilir.','Both options feed into one queue. Customers who prefer not to use the app can use the in-store screen.')])
add(bi('01 / MAĞAZA EKRANI','01 / IN-STORE SCREEN'),bi('Kolay başlangıç','An easy start'),bi('Yeni ürün için “İstek oluştur”, mevcut kayıt için “İsteğimi sorgula”. Büyük düğmeler ve sade dil, her yaştan müşterinin kullanımını kolaylaştırır.','“Create request” starts a new request; “Track my request” opens an existing one. Large buttons and plain language make the screen easier to use.'),image='home')
add(bi('ÜRÜN SEÇİMİ','ITEM SELECTION'),bi('Etiketi okut veya referansı yaz','Scan the label or enter the reference'),bi('Referans alanının yanındaki tarayıcı kamera okumasını açar. Müşteri isterse ürün kodunu elle girebilir.','The scanner beside the reference field opens the camera. Customers can also enter the product reference manually.'),image='entry',capture=True)
add(bi('STOK BİLGİSİ','AVAILABILITY'),bi('Reyon ve depo birlikte görünür','Floor and stockroom stock together'),bi('Beden seçildiğinde iki adet ayrı gösterilir. Ürün reyonda olsa da uygun depo stoğu varsa istek oluşturulabilir.','After selecting a size, both quantities are shown separately. An item on the shop floor can still be requested if stockroom stock is available.'),image='stock',foot=bi('İki yerde de stok yoksa açıkça belirtilir ve istek alınmaz.','If neither location has stock, the screen says so and does not accept a request.'))
add(bi('MAĞAZADA YÖN BULMA','FINDING THE ITEM'),bi('Ürünün konumu krokide','The item’s location on the map'),bi('“Konumunu görüntüle” büyük krokide ürün alanını ve yolu açar. Masa, duvar veya askı bilgisi konumu açıklığa kavuşturur.','“View location” opens a larger map with the item area and route. Table, wall or rail details clarify where to look.'),image='map',foot=bi('Bu örnekte rota ortadan başlar. Gerçek girişler, cihaz yeri ve yürüyüş yolu mağaza planıyla doğrulanacaktır.','The sample route starts at the centre. Actual entrances, device position and walking routes need store validation.'))
add(bi('İSTEK ALINDI','REQUEST RECEIVED'),bi('Bekleme süresi baştan anlaşılır','Set expectations from the start'),metric=bi('20-25','20-25'),metricLabel=bi('dakika / tahmini süre','minutes / estimated time'),body=bi('“İsteğiniz alınmıştır. Ürününüz, bulunması hâlinde ilgili bölümün istek noktasına tahmini 20-25 dakika içinde ulaştırılacaktır.”','“Your request has been received. If found, your item is expected at the relevant department’s request point within 20-25 minutes.”'),blocks=[
 block('Bildirim tercihi','Update preference','Müşteri, bulunma ve teslim bilgisini hangi kanaldan almak istediğini seçer. Her ürün kendi bölümünün istek noktasına gelir.','The customer chooses how to receive search and collection updates. Each item goes to its own department’s request point.')])
add(bi('BİRDEN FAZLA ÜRÜN','MULTIPLE ITEMS'),bi('Bir sepet, ayrı ürün kayıtları','One basket, separate item records'),bi('“+ Ürün ekle” ile farklı bölümlerden ürünler aynı sepete alınır. İletişim bilgisi her ürün için tekrar istenmez.','“+ Add an item” brings different departments into the same basket, without asking for contact details for every item.'),image='basket',foot=bi('Kadın: W-1, W-2…  Erkek: M-1, M-2…\nÇocuk: K-1, K-2…  Sıra her bölümde ayrı ilerler.','Women: W-1, W-2…  Men: M-1, M-2…\nKids: K-1, K-2…  Each department has its own sequence.'))
add(bi('İLETİŞİM TERCİHİ','CONTACT PREFERENCE'),bi('Mevcut hesapla eşleştirme','Link to the existing account'),bi('Müşteri, Zara uygulamasındaki mevcut hesap QR’ını okuyucuya gösterir. Yeni QR üretilmez; sepetin aynı hesaba bağlanması önerilir.','The customer shows the existing Zara account QR to the reader. No new QR is generated; the proposed flow links the basket to that account.'),image='qr',blocks=[
 block('Diğer seçenekler','Other choices','WhatsApp veya SMS için numara bir kez girilir. Bildirim istemeyen müşteri istek koduyla sorgulama yapar.','A phone number is entered once for WhatsApp or SMS. Customers who do not want notifications can track by request code.')],foot=bi('Gerçek hesap eşleştirmesi yetkili entegrasyon gerektirir.','Live account linking requires authorised integration.'))
add(bi('DURUM TAKİBİ','REQUEST TRACKING'),bi('Müşteri sıradaki adımı bilir','Customers know what happens next'),blocks=[
 block('İstek alındı','Request received','Ürün depoda arama sırasına girer.','The item enters the stockroom search queue.'),
 block('Depoda aranıyor','Searching the stockroom','Arama başladığında müşteri ekranı güncellenir.','The customer’s screen updates when the search begins.'),
 block('Ürün bulundu / Getiriliyor','Found / On the way','Bulunan ürün doğrulanır ve istek noktasına sevk edilir.','The item is verified and sent to the request point.'),
 block('Teslime hazır','Ready to collect','Hazır bilgisi ancak ürünün varışı doğrulandığında görünür.','The ready update appears only after arrival is confirmed.')],foot=bi('Telefon kullanmayan müşteri, mağaza ekranından bölüm ve istek koduyla sorgulayabilir.','Customers without a phone can track using the department and request code on the in-store screen.'))
add(bi('DEPO / ARAMA','STOCKROOM / SEARCH'),bi('Doğru ürün, doğru beden','The right item and size'),bi('Depo çalışanı aramayı başlatır. Bulunan etiket; referans, renk ve bedenle eşleştirilir. Yanlış ürün hazırlığa alınmaz.','Staff start the search, then match the label to the reference, colour and size. A mismatched item cannot move into preparation.'),image='found',capture=True)
add(bi('DEPO / SEVK','STOCKROOM / DISPATCH'),bi('Ürünün hareketi kayıt altında','Track the item’s movement'),bi('Doğrulanan ürün kendi bölümünün arabasına yüklenir. Tüm adetler yüklenmeden sevk tamamlanamaz.','Verified items are loaded onto the department’s trolley. Dispatch cannot complete until every requested unit is loaded.'),image='cart',capture=True,foot=bi('Sevkte “Getiriliyor” bilgisi görünür. Müşteri henüz teslim noktasına çağrılmaz.','Dispatch shows “On the way”. Customers are not yet called to collection.'))
add(bi('TESLİM NOKTASI','COLLECTION'),bi('Hazır olduğunda net yönlendirme','Clear guidance when ready'),bi('Varış doğrulanınca ilgili bölümün istek noktası bildirilir. Raf adı verilmez ve müşteriden kod göstermesi istenmez.','Confirmed arrival triggers an update naming the department’s request point. Customers are not given shelf names or asked to show a code.'),image='ready')
add(bi('TESLİM VE DÖNÜŞ','COLLECTION AND RETURN'),bi('Her sonuç tamamlanır','Close every outcome'),blocks=[
 block('Teslim edildi','Collected','Personel teslimi kaydeder. Müşteri ekranı güncellenir ve istek açık iş listesinden çıkar.','Staff record collection. The customer’s screen updates and the request leaves the open queue.'),
 block('Alınmadı','Not collected','Önerilen akışta, hazır olduktan sonra 20 dakika alınmayan ürün depoya dönüşe yönlendirilir.','In the proposed flow, an item not collected within 20 minutes of being ready enters the return process.'),
 block('Depoya döndü','Returned to the stockroom','Etiket okutularak dönüş doğrulanır. Kullanılabilir stok ancak bu aşamada güncellenir.','A label scan confirms the return. Available stock updates only at this point.')])
add(bi('ÜRÜN BULUNAMAZSA','IF AN ITEM IS NOT FOUND'),bi('Dört açık neden','Four clear reasons'),bi('Kısa seçim listesi çalışanın kaydını kolaylaştırır. Yönetici aynı nedenin tekrar edip etmediğini görebilir.','A short list makes reporting easier for staff and helps managers see recurring issues.'),image='reasons',blocks=[
 block('Sonraki işlem','Next action','Stok hatası ve “Diğer” kaydında ikinci kontrol yapılır. Ürün yine bulunamazsa müşteri sade bir açıklamayla bilgilendirilir.','Stock discrepancies and “Other” trigger a second check. If the item is still unavailable, the customer receives a simple explanation.')])
add(bi('ÖZEL DURUMLAR','SPECIAL CASES'),bi('“Diğer” için kısa açıklama','A short note for “Other”'),bi('Açılan kutuya özel durum yazılır. Not kontrol kaydına ve vardiya devrine geçer; müşteriye gönderilmez.','Staff enter the special case in the text field. The note stays in control and handover records and is not sent to the customer.'),image='other',blocks=[
 block('Bilgi kaybı olmadan yeniden arama','Search again with the same context','İkinci aramayı devralan ekip önceki notları görür. Müşterinin talebini yeniden anlatmasına gerek kalmaz.','The team taking over the second search sees earlier notes. The customer does not need to repeat the request.')])
add(bi('STOK KONTROLÜ','STOCK CONTROL'),bi('Sorun tekrar etmeden müdahale','Act before the issue repeats'),blocks=[
 block('Stok hatası','Stock discrepancy','Fiziksel sayım ve sonuç kaydedilir. Sorun çözülene kadar aynı stoktan yeni ayırma yapılmaz.','Record the physical count and outcome. New allocations stop until the issue is resolved.'),
 block('Depo konumu güncel değil','Outdated stockroom location','Ürün reyonda olabilir. İstek ve notları destek ekibine devredilerek konum kontrolü sürdürülür.','The item may be on the shop floor. The request and notes can pass to a support team for a location check.'),
 block('Hasarlı / satışa uygun değil','Damaged / unsuitable for sale','Ürün müşteriye gönderilmez. Neden kaydı ve stok kontrol işi açık tutulur.','The item is not sent to the customer. A reason and stock control task keep the issue traceable.')])
add(bi('DEPO MÜDÜRÜ','STOCKROOM MANAGER'),bi('Öncelik, bekleyen işe göre','Prioritise the work that is waiting'),bi('Bekleme süresi, geciken aşama ve sorumlu ekip birlikte görünür. Müdür desteği ihtiyaç olan işe yönlendirebilir.','Waiting time, delayed stage and responsible team appear together. Managers can direct support where it is needed.'),image='queue',foot=bi('Görev devri, ikinci kontrol ve aşama uyarı süreleri aynı kayıt üzerinden yönetilir.','Reassignment, second checks and stage warnings use the same record.'))
add(bi('KAPASİTE VE STOK','CAPACITY AND STOCK'),bi('İş yükünü dengeli yönetmek','Manage the workload'),blocks=[
 block('Yoğunluk görünür','Make workload visible','Yoğunluk bildirimi ile yeni istek alımını durdurma ayrı yönetilir. Açık işler takip edilmeye devam eder.','Workload status and pausing new requests are separate controls. Existing work remains active.'),
 block('Aynı ürün iki kez ayrılmaz','Do not allocate the same item twice','Mağaza isteği, online sipariş ve reyon görevi ortak stoktan pay alır. Yeni istek yalnızca serbest adet üzerinden açılır.','Store requests, online orders and floor tasks share stock allocations. New requests use only unallocated units.')],foot=bi('Amaç, ekibin kapasitesini korumak ve karşılanamayacak müşteri beklentilerini azaltmaktır.','The aim is to protect team capacity and avoid customer expectations the team cannot meet.'))
add(bi('REYON TAMAMLAMA','REPLENISHMENT'),bi('Talep, reyon planına yansır','Use demand to inform replenishment'),bi('İstek sayısı ve reyon adedi tamamlama kararını destekler. Görev açılınca depoda gereken miktar ayrılır.','Request demand and floor quantity inform replenishment. Creating a task reserves the required stockroom quantity.'),image='replenish',foot=bi('Hedef konumda okutulunca reyon adedi güncellenir; müşteri ekranı da yeni durumu gösterir.','A scan at the destination updates floor stock and the customer screen.'))
add(bi('VARDİYA DEVRİ','SHIFT HANDOVER'),bi('Vardiya değişir, bilgi korunur','Keep the context at shift change'),bi('Açık istekler, sorun notları, arabalar ve tamamlama işleri devir kaydında toplanır. Yeni ekip devri kabul eder; zaman kaydedilir.','Open requests, issue notes, trolleys and replenishment tasks share one handover record. The incoming team accepts it and the time is recorded.'),image='handover',foot=bi('Müdür, hangi işlerin bırakıldığını ve ne zaman devralındığını görebilir.','Managers can see which tasks were handed over and when they were accepted.'))
add(bi('02 / ZARA UYGULAMASI','02 / ZARA APP'),bi('Müşterinin kendi telefonundan','From the customer’s own phone'),bi('Mevcut hesapla ürün ve beden seçilir. Reyon ile depo adedi birlikte görünür.','Select an item and size in the existing account. View both shop-floor and stockroom availability.'),image='app-product',foot=bi('Bu ekran, uygulama için önerilen akışı gösterir.','This screen demonstrates the proposed app flow.'))
add(bi('UYGULAMA / SEPET','APP / BASKET'),bi('Kişisel bilgileri tekrar girmeden','Without entering details again'),bi('Ürünler tek sepette toplanır. Telefon, e-posta, isim veya hesap QR’ı yeniden istenmez.','Add items to one basket. No extra phone number, email, name or account QR is required.'),image='app-basket',foot=bi('Danışman yönlendirir; müşteri kendi hesabında ilerler.','The adviser provides guidance; customers use their own accounts.'))
add(bi('UYGULAMA / MAĞAZA BAĞLANTISI','APP / STORE CONNECTION'),bi('Zara Wi-Fi bağlantısı gerekli','Zara Wi-Fi is required'),bi('Her gönderimde ilgili mağazanın bağlantısı doğrulanır. Amaç mağaza dışından açılan isteklerin depo iş yükünü artırmasını sınırlamaktır.','Each submission verifies the selected store’s connection. This is intended to limit stockroom work from off-site requests.'),image='app-wifi',foot=bi('Ağ adı tek başına yeterli değildir. Gerçek doğrulama Zara altyapısından gelmelidir; burada örnek gösterilir.','A network name alone is not enough. Live verification must come from Zara’s infrastructure; this is a demonstration.'))
add(bi('UYGULAMA / TAKİP','APP / TRACKING'),bi('Aynı hesapta durum ve teslim','Track and collect with the same account'),bi('İstek ortak depo sırasına girer. Varışta hazır bilgisi görünür; personel teslimi kaydedince kayıt tamamlanır.','The request enters the shared queue. Arrival triggers the ready update; recording collection completes the request.'),image='app-ready',foot=bi('Bildirim izni kapalı olsa da İsteklerim ekranından takip sürer.','My Requests remains available even when notifications are disabled.'))
add(bi('UYGULAMA / İSTEK SINIRI','APP / REQUEST LIMIT'),bi('Diğer müşterilerin hizmetini korumak','Protect service for other customers'),metric=bi('10','10'),metricLabel=bi('ürün / son 15 dakika / hesap başına','items / any 15 minutes / per account'),body=bi('Sepetteki her ürün ayrı sayılır. Sınır, yalnızca aktif istekleri değil, son 15 dakikada açılan toplam ürünü kapsar.','Each item counts separately. The limit covers all items requested in the past 15 minutes, not just active requests.'),blocks=[
 block('İptal etmek hakkı geri vermez','Cancellation does not restore the allowance','İptal ve teslim sayacı azaltmaz. Sayfayı yenilemek veya uygulamayı kapatmak sayacı sıfırlamaz.','Cancellation or collection does not reduce the count. Refreshing or closing the app does not reset it.'),
 block('Süre doldukça hak açılır','Allowance returns as entries expire','15 dakikayı dolduran ürünler sayımdan çıkar. Canlı kullanımda kural hesap genelinde merkezi sistemle uygulanmalıdır.','Items leave the count after 15 minutes. Live enforcement must apply centrally across the account.')])
add(bi('ZARA HİZMETLERİYLE BAĞLANTI','CONNECTION TO ZARA SERVICES'),bi('Mevcut deneyimi tamamlayan öneri','A proposal that builds on existing services'),blocks=[
 block('Zara Wi-Fi','Zara Wi-Fi','Zara’nın yayımladığı hizmet, cihazla ilişkili sertifika üzerinden mağaza bağlantısı sunuyor.','Zara’s published service provides a store connection through a device-linked certificate.'),
 block('Store Mode / Click and Find','Store Mode / Click and Find','Ürünün mağaza krokisindeki konumunu gösteriyor. İstek Noktası, bu deneyime depodan talep ve takip adımını eklemeyi amaçlıyor.','Shows the item’s location on the store map. Request Point would add stockroom requests and tracking.'),
 block('Canlı kullanım öncesi','Before live use','Operasyon, bilgi güvenliği ve kişisel veri süreçleri Zara’nın yetkili ekipleriyle değerlendirilmelidir. Wi-Fi şartı ve 10 ürün sınırı bu projenin önerileridir.','Zara’s authorised teams need to review operations, security and personal data handling. The Wi-Fi requirement and item limit are proposed project rules.')],sources=True,foot=bi('Bu sunum şirket onayı veya iç politikalara uygunluk teyidi değildir. Hizmet kapsamı mağaza ve pazara göre doğrulanmalıdır.','This presentation does not confirm company approval or internal policy compliance. Service availability must be checked for each store and market.'))
add(bi('MAĞAZADA DENEME','STORE TRIAL'),bi('Ölçerek başlayalım, ekiple geliştirelim','Start with evidence and improve with the team'),bi('Gerekli bağlantılar onaylandıktan sonra tek bölümde deneme yapmayı öneriyorum. Sonuçları mevcut işleyişle karşılaştıralım.','After the required integrations are approved, I propose a trial in one department and a comparison with the current process.'),blocks=[
 block('Müşteri ve danışman','Customer and adviser','Bekleme deneyimi, tekrar eden durum soruları ve doğru istek noktasına yönlenme.','Waiting experience, repeated status questions and guidance to the correct request point.'),
 block('Depo ve yönetim','Stockroom and management','Arama ve teslim süresi, tekrar eden stok sorunları ve vardiyada devreden işler.','Search and collection time, recurring stock issues and tasks passed between shifts.')],closing=True)

class Deck:
 def __init__(self,lang):
  self.lang=lang;self.i=0 if lang=='tr' else 1
  self.name='Istek-Noktasi-Telefon-Sunumu.pdf' if lang=='tr' else 'Request-Point-Mobile-Presentation.pdf'
  self.c=canvas.Canvas(str(OUT/self.name),pagesize=(W,H),pageCompression=1)
  self.c.setTitle('İstek Noktası | Telefon Sunumu' if lang=='tr' else 'Request Point | Mobile Presentation')
  self.c.setAuthor('Sude Gül Çetinkaya');self.c.setSubject('Mağaza ekranı ve Zara uygulaması için proje önerisi')
  self.c.setViewerPreference('FitWindow','true')
  self.records=[]
 def pick(self,s):return s[self.i] if isinstance(s,list) else s
 def para(self,text,top,size=18,leading=None,font='MobileUI',color=INK,width=CW,x=M,maxbottom=800):
  value=self.pick(text).replace('–','-').replace('—','-')
  value=escape(value).replace('\n','<br/>')
  p=Paragraph(value,ParagraphStyle('text',fontName=font,fontSize=size,leading=leading or size*1.38,textColor=HexColor(color)))
  _,height=p.wrap(width,H)
  assert top+height<=maxbottom,(self.lang,self.page,'text overflow',self.pick(text),top,height)
  p.drawOn(self.c,x,H-top-height)
  self.records.append({'page':self.page,'kind':'text','top':round(top,2),'bottom':round(top+height,2),'size':size,'text':self.pick(text)})
  return top+height
 def rule(self,top,width=CW,color=RULE):
  self.c.setStrokeColor(HexColor(color));self.c.setLineWidth(.6);self.c.line(M,H-top,M+width,H-top)
 def screenshot(self,name,top,bottom,capture=False):
  prefix='mobile-deck' if capture else 'pdf'
  path=ROOT/'ekran-goruntuleri'/f'{prefix}-{self.lang}-{name}.png'
  iw,ih=Image.open(path).size
  scale=min(CW/iw,(bottom-top)/ih)
  dw,dh=iw*scale,ih*scale
  assert dh>100,(name,top,bottom)
  self.c.drawImage(str(path),M+(CW-dw)/2,H-top-dh,width=dw,height=dh,mask='auto')
  self.records.append({'page':self.page,'kind':'image','name':name,'top':top,'bottom':top+dh,'width':dw})
  return top+dh
 def footer(self):
  self.rule(817)
  self.para('Sude Gül Çetinkaya',829,size=10,color=ACCENT,maxbottom=853,width=280)
  self.c.setFillColor(HexColor(MUTED));self.c.setFont('MobileUI',10)
  self.c.drawRightString(W-M,24,f'{self.page} / {len(slides)}')
 def render(self):
  for page,s in enumerate(slides,1):
   self.page=page;self.c.bookmarkPage('page-'+str(page));self.c.addOutlineEntry(self.pick(s['title']).replace('\n',' '),'page-'+str(page),0)
   if s.get('kind')=='cover':
    self.rule(46,width=35,color=ACCENT)
    self.para(s['section'],74,size=12,color=ACCENT)
    self.para(s['title'],157,size=57,leading=62)
    self.para(bi('Mağaza ekranı ve Zara uygulaması için ürün istek önerisi','An item request proposal for the in-store screen and Zara app'),325,size=23,leading=32)
    self.para(bi('Hazırlayan','Prepared by'),482,size=12,color=MUTED)
    self.para('Sude Gül Çetinkaya',507,size=22,font='MobileBold')
    self.rule(600)
    self.para(bi('Müşterinin beklerken bilgiye ulaşması ve ekibin aynı isteği birlikte yönetmesi için.','To keep customers informed while the team manages the same request together.'),627,size=18)
    self.para(bi('Proje önerisi · Örnek ekranlar\nGerçek mağaza, hesap, Wi-Fi ve bildirim bağlantısı yoktur.','Project proposal · Sample screens\nLive store, account, Wi-Fi and notification services are not connected.'),744,size=12,color=MUTED)
   else:
    self.para(s['section'],34,size=11,color=ACCENT)
    top=self.para(s['title'],69,size=30,leading=35)+23
    if s.get('metric'):
     top=self.para(s['metric'],top+10,size=77,leading=83,color=ACCENT)+2
     top=self.para(s['metricLabel'],top,size=16,color=MUTED)+28
    if s.get('body'):top=self.para(s['body'],top,size=18)+23
    blocks=s.get('blocks',[])
    # Reserve fixed space for phone-readable notes below each screenshot.
    foot=s.get('foot');foot_top=721 if foot else 791
    if s.get('sources'):foot_top=735
    if s.get('image'):
     if blocks:
      image_bottom=min(top+230,480)
     else:
      image_bottom=foot_top-36
     top=self.screenshot(s['image'],top,image_bottom,s.get('capture',False))+27
    if blocks:
     # Compact only dense text-only pages; keep the body at 17 pt or larger.
     gap=25 if len(blocks)>=3 else 31
     body_size=17 if len(blocks)>=3 or s.get('metric') else 18
     for b in blocks:
      top=self.para(b['title'],top,size=18,font='MobileBold',color=ACCENT)+9
      top=self.para(b['body'],top,size=body_size)+gap
    if s.get('sources'):
     assert top<686,(self.lang,'sources overflow',top)
     labels=bi(['Zara Wi-Fi · Türkiye','Store Mode · Malezya'],['Zara Wi-Fi · Türkiye','Store Mode · Malaysia'])[self.i]
     for j,(label,url) in enumerate(zip(labels,['https://www.zara.com/tr/tr/help-center/ZaraWifi','https://www.zara.com/my/en/help-center/StoreMode'])):
      y=690+j*20
      self.para(label,y,size=12,color=ACCENT)
      self.c.linkURL(url,(M,H-y-17,W-M,H-y),relative=0,thickness=0)
    if foot:
     assert top<=foot_top,(self.lang,self.page,'foot overlap',top,foot_top)
     self.rule(foot_top-14)
     self.para(foot,foot_top,size=14,leading=20,color=MUTED)
    if s.get('closing'):
     top=max(top+24,647)
     self.rule(top-17)
     self.para(bi('Sude Gül Çetinkaya','Sude Gül Çetinkaya'),top,size=23)
     self.para(bi('İstek Noktası / Proje önerisi','Request Point / Project proposal'),top+43,size=13,color=MUTED)
   self.footer();self.c.showPage()
  self.c.save();copyfile(OUT/self.name,SHARE/self.name)
  r=PdfReader(OUT/self.name)
  assert len(r.pages)==len(slides)
  for p in r.pages:assert 'Sude Gül Çetinkaya' in p.extract_text()
  print(json.dumps({'file':str(SHARE/self.name),'pages':len(r.pages),'bytes':(OUT/self.name).stat().st_size},ensure_ascii=False))
  return self.records

if __name__=='__main__':
 report={lang:Deck(lang).render() for lang in ['tr','en']}
 (ROOT/'tmp/pdfs/mobile-layout.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
