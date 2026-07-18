# EKAP Demo Veri Seti Yaşam Döngüsü Tamlığı

Denetim tarihi: `2026-07-18`

## Kapsam ve sayım kuralları

- Kaynak kod içindeki sabit demo/seed kayıtları tarandı; tarayıcı `localStorage` içinde sonradan oluşabilecek kullanıcı verileri kapsama dahil edilmedi.
- Ana vaka kümesi: `src/lib/data.ts` içindeki **30** ihale ve **50** doküman.
- Teklif kümesi: `src/lib/bid-store.ts` içindeki **2** `seedBids` kaydı. İhale bağlantısı tanımlı yabancı anahtar olan `Bid.tenderId -> Tender.id` ile kuruldu.
- Sonuç/istekli desteği: `src/lib/companies.ts` içindeki mevcut ihale ID'lerine bağlı **15** firma geçmişi; yalnız `result=won` olanlar kazanan sayıldı.
- Olay desteği: `src/lib/store.ts` içindeki **6** seed bildirim. `amendment` bildirimi zeyilname kanıtı sayıldı; tahminî istekliler ve analitik mock toplamlar kayıt sayılmadı.
- `lifecycle_depth`, aradaki state'ler boş olsa da pozitif veri bulunan **en yüksek** state'tir; ardışık doluluk puanı değildir.
- En derin YAPIM/HİZMET seçimi ham kategori değerleri olan `Yapım İşleri` ve `Hizmet Alımı` üzerinden yapıldı; `Danışmanlık` ayrı kategori tutuldu.
- `genTimeline` tarafından üretilmiş zeyilname/açılış işaretleri `*` ile gösterildi. Bunlar ayrı EKAP tutanağı veya değerlendirme içeriği değildir.
- `result` timeline işareti tek başına kazanan sayılmadı. Kazanan için firma geçmişinde `result=won` arandı.
- `Sözleşme Taslağı.pdf` bir dokümandır; imzalı sözleşme veya sözleşme bedeli sayılmadı.

State sırası: `ilan(1) < dokuman(2) < zeyilname(3) < yeterlik/teklif(4) < eteklif/teminat(5) < acilis(6) < sinir_deger(7) < ihale_karari(8) < sikayet(9) < sozlesme(10) < uygulama(11)`.

## 1. Özet tablo (lifecycle_depth azalan)

| IKN | tur | usul | lifecycle_depth | teklif# | kazanan? | sozlesme? |
|---|---|---|---:|---:|---|---|
| 2026/101678 | Yapım İşleri | Açık İhale | 8 (ihale_karari) | 1 | VAR | YOK |
| 2026/101901 | Danışmanlık | Belli İstekliler Arası | 8 (ihale_karari) | 0 | VAR | YOK |
| 2026/106123 | Yapım İşleri | Açık İhale | 6 (acilis) | 0 | YOK | YOK |
| 2026/106456 | Yapım İşleri | Açık İhale | 6 (acilis) | 0 | YOK | YOK |
| 2026/107901 | Yapım İşleri | Belli İstekliler Arası | 6 (acilis) | 0 | YOK | YOK |
| 2026/100234 | Yapım İşleri | Açık İhale | 4 (yeterlik/teklif) | 1 | YOK | YOK |
| 2026/100456 | Yapım İşleri | Belli İstekliler Arası | 3 (zeyilname) | 0 | YOK | YOK |
| 2026/100789 | Mal Alımı | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/101012 | Bilişim | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/101345 | Hizmet Alımı | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/102234 | Hizmet Alımı | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/102567 | Yapım İşleri | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/102890 | Mal Alımı | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/103123 | Yapım İşleri | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/103456 | Yapım İşleri | Belli İstekliler Arası | 2 (dokuman) | 0 | YOK | YOK |
| 2026/103789 | Hizmet Alımı | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/104012 | Bilişim | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/104345 | Mal Alımı | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/104678 | Ulaşım | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/104901 | Yapım İşleri | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/105234 | Bilişim | Belli İstekliler Arası | 2 (dokuman) | 0 | YOK | YOK |
| 2026/105567 | Yapım İşleri | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/105890 | Bilişim | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/106789 | Mal Alımı | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/107012 | Yapım İşleri | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/107345 | Yapım İşleri | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/107678 | Yapım İşleri | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/108234 | Yapım İşleri | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |
| 2026/108567 | Danışmanlık | Belli İstekliler Arası | 2 (dokuman) | 0 | YOK | YOK |
| 2026/108890 | Yapım İşleri | Açık İhale | 2 (dokuman) | 0 | YOK | YOK |

## 2. Vaka bazında VAR/YOK ve adet

| IKN | dokuman# | teklif/istekli# | zeyilname | acilis/degerlendirme | sonuc: kazanan | sozlesme (bedel dahil) | kurul/itirazen sikayet |
|---|---:|---:|---|---|---|---|---|
| 2026/100234 | 3 | 1 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/100456 | 2 | 0 | VAR (1: bildirim) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/100789 | 3 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/101012 | 2 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/101345 | 2 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/101678 | 2 | 1 | YOK (0) | YOK (0) | VAR (1) | YOK (0) | YOK (0) |
| 2026/101901 | 1 | 0 | VAR (1*) | VAR (1)* | VAR (1) | YOK (0) | YOK (0) |
| 2026/102234 | 2 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/102567 | 2 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/102890 | 1 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/103123 | 2 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/103456 | 2 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/103789 | 2 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/104012 | 1 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/104345 | 2 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/104678 | 2 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/104901 | 1 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/105234 | 2 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/105567 | 2 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/105890 | 2 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/106123 | 1 | 0 | VAR (1*) | VAR (1)* | YOK (0) | YOK (0) | YOK (0) |
| 2026/106456 | 1 | 0 | VAR (1*) | VAR (1)* | YOK (0) | YOK (0) | YOK (0) |
| 2026/106789 | 1 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/107012 | 2 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/107345 | 1 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/107678 | 1 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/107901 | 1 | 0 | VAR (1*) | VAR (1)* | YOK (0) | YOK (0) | YOK (0) |
| 2026/108234 | 1 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/108567 | 1 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |
| 2026/108890 | 2 | 0 | YOK (0) | YOK (0) | YOK (0) | YOK (0) | YOK (0) |

`*` = `genTimeline` tarafından üretilen tamamlanmış olay işareti; ayrı açılış/değerlendirme tutanağı değildir.

## 3. State bazında kapsama

| State | Pozitif kanıt bulunan vaka# |
|---|---:|
| 1 — ilan | 30 |
| 2 — dokuman | 30 |
| 3 — zeyilname | 5 |
| 4 — yeterlik/teklif | 2 |
| 5 — eteklif/teminat | 1 |
| 6 — acilis | 4 |
| 7 — sinir_deger | 0 |
| 8 — ihale_karari | 2 |
| 9 — sikayet | 0 |
| 10 — sozlesme | 0 |
| 11 — uygulama | 0 |

## 4. En derin vakalar

- **En derin YAPIM vakası:** `2026/101678` — 8 (ihale_karari).
- **En derin HİZMET vakası:** `2026/101345` — 2 (dokuman), `2026/102234` — 2 (dokuman), `2026/103789` — 2 (dokuman).

Kazanan kaydı bulunan vakalar:

- `2026/101678`: Anadolu İnşaat A.Ş. (result=won)
- `2026/101901`: Karadeniz Enerji ve Altyapı A.Ş. (result=won)

## 5. Açık hüküm

- **Set genelinde teklif taşıyan kayıt: VAR.** Toplam 2 seed teklif, 2 ihale vakasına bağlanıyor.
- **Set genelinde sonuç/kazanan taşıyan kayıt: VAR.** Toplam 2 `result=won` kaydı var.
- **Set genelinde teklif/sonuç taşıyan kayıt: VAR.**
- **Set genelinde imzalı sözleşme ve sözleşme bedeli taşıyan kayıt: YOK.**
- **Set genelinde Kurul kararı / itirazen şikâyet kaydı: YOK.**

## 6. Veri bütünlüğü notları

- `bid-seed-2`: `tenderId=6` ile bağlandığı vaka `2026/101678`, fakat teklif içindeki kopya `ekapNo=2026/100239`. Teklif vaka sayımında `tenderId` kullanıldı; uyuşmazlık gizlenmedi.
- `2026/101678`: ana ihale durumu `active`, fakat firma geçmişinde `result=won` var.
- `2026/101901`: seed bildirimde iptal, firma geçmişinde ise `result=won` bulunuyor; iki demo kaydı çelişkili.
- 4 kapalı vakada sentetik `timeline.result` işareti var (`2026/101901`, `2026/106123`, `2026/106456`, `2026/107901`); kazanan/karar içeriği olmayanlar state 8 sayılmadı.
- `analytics-data.ts` içindeki rastgele/aggregate sayılar ve `predictBidders` çıktıları İKN bazlı gerçek kayıt olmadığı için sayımlara eklenmedi.

## Makine doğrulama özeti

- İhale: 30
- Benzersiz IKN: 30
- Doküman: 50
- Teklif: 2
- Açılış timeline işareti: 4
- Kazanan sonucu: 2
- İmzalı sözleşme: 0
- Kurul/itirazen şikâyet: 0
