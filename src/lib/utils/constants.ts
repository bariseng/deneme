export const CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya",
  "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir",
  "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis",
  "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum",
  "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane",
  "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir",
  "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu",
  "Kayseri", "Kırıkkale", "Kırklareli", "Kırşehir", "Kilis",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin",
  "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye",
  "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop",
  "Sivas", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli",
  "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
] as const;

export const TENDER_TYPE_LABELS: Record<string, string> = {
  YAPIM: "Yapım İşleri",
  MAL_ALIMI: "Mal Alımı",
  HIZMET: "Hizmet Alımı",
  DANISMANLIK: "Danışmanlık",
};

export const TENDER_STATUS_LABELS: Record<string, string> = {
  BASVURU_ACIK: "Başvuru Açık",
  DEGERLENDIRME: "Değerlendirme",
  SONUCLANDI: "Sonuçlandı",
  IPTAL: "İptal",
  YAKLASAN: "Yaklaşan",
};

export const TENDER_STATUS_COLORS: Record<string, string> = {
  BASVURU_ACIK: "bg-green-100 text-green-700",
  DEGERLENDIRME: "bg-yellow-100 text-yellow-700",
  SONUCLANDI: "bg-blue-100 text-blue-700",
  IPTAL: "bg-red-100 text-red-700",
  YAKLASAN: "bg-orange-100 text-orange-700",
};

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  TASLAK: "Taslak",
  GONDERILDI: "Gönderildi",
  DEGERLENDIRMEDE: "Değerlendirmede",
  KABUL_EDILDI: "Kabul Edildi",
  REDDEDILDI: "Reddedildi",
  IPTAL: "İptal",
};

export const BID_STATUS_LABELS: Record<string, string> = {
  TASLAK: "Taslak",
  TAMAMLANDI: "Tamamlandı",
  GONDERILDI: "Gönderildi",
};

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  YENI_IHALE: "Yeni İhale",
  SON_BASVURU: "Son Başvuru",
  ZEYILNAME: "Zeyilname",
  SONUC: "Sonuç",
  SISTEM: "Sistem",
};

export const SECTORS = [
  "Yapım İşleri",
  "Bilişim ve Teknoloji",
  "Sağlık",
  "Eğitim",
  "Ulaşım",
  "Enerji",
  "Savunma",
  "Çevre",
  "Gıda",
  "Tekstil",
] as const;
