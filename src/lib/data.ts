export type TimelineEventType =
  | "publish"
  | "question_deadline"
  | "amendment"
  | "application_deadline"
  | "opening"
  | "result";

export interface TimelineEvent {
  type: TimelineEventType;
  label: string;
  date: string;
  completed: boolean;
  note?: string;
}

export interface TenderDocument {
  name: string;
  size: string;
  category: "sartname" | "teknik" | "sozlesme" | "diger";
}

export interface Tender {
  id: string;
  title: string;
  institution: string;
  institutionType: "belediye" | "bakanlik" | "universite" | "kit" | "diger";
  city: string;
  category: string;
  type: string;
  estimatedCost: string;
  estimatedCostValue: number;
  publishDate: string;
  deadline: string;
  status: "active" | "closed" | "upcoming";
  description: string;
  ekapNo: string;
  documents: TenderDocument[];
  timeline: TimelineEvent[];
  /** lat,lng for map display */
  coordinates?: { lat: number; lng: number };
}

export const institutionTypes = [
  { value: "belediye", label: "Belediye" },
  { value: "bakanlik", label: "Bakanlık" },
  { value: "universite", label: "Üniversite" },
  { value: "kit", label: "KİT" },
  { value: "diger", label: "Diğer" },
] as const;

export const categories = [
  { name: "Yapım İşleri", slug: "yapim", count: 1245, icon: "Building2" },
  { name: "Mal Alımı", slug: "mal-alimi", count: 892, icon: "Package" },
  { name: "Hizmet Alımı", slug: "hizmet", count: 1567, icon: "Briefcase" },
  { name: "Danışmanlık", slug: "danismanlik", count: 324, icon: "Users" },
  { name: "Bilişim", slug: "bilisim", count: 456, icon: "Monitor" },
  { name: "Sağlık", slug: "saglik", count: 678, icon: "Heart" },
  { name: "Eğitim", slug: "egitim", count: 345, icon: "GraduationCap" },
  { name: "Ulaşım", slug: "ulasim", count: 234, icon: "Truck" },
];

export const cities = [
  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Aksaray",
  "Amasya",
  "Ankara",
  "Antalya",
  "Ardahan",
  "Artvin",
  "Aydın",
  "Balıkesir",
  "Bartın",
  "Batman",
  "Bayburt",
  "Bilecik",
  "Bingöl",
  "Bitlis",
  "Bolu",
  "Burdur",
  "Bursa",
  "Çanakkale",
  "Çankırı",
  "Çorum",
  "Denizli",
  "Diyarbakır",
  "Düzce",
  "Edirne",
  "Elazığ",
  "Erzincan",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Giresun",
  "Gümüşhane",
  "Hakkari",
  "Hatay",
  "Iğdır",
  "Isparta",
  "İstanbul",
  "İzmir",
  "Kahramanmaraş",
  "Karabük",
  "Karaman",
  "Kars",
  "Kastamonu",
  "Kayseri",
  "Kilis",
  "Kırıkkale",
  "Kırklareli",
  "Kırşehir",
  "Kocaeli",
  "Konya",
  "Kütahya",
  "Malatya",
  "Manisa",
  "Mardin",
  "Mersin",
  "Muğla",
  "Muş",
  "Nevşehir",
  "Niğde",
  "Ordu",
  "Osmaniye",
  "Rize",
  "Sakarya",
  "Samsun",
  "Şanlıurfa",
  "Siirt",
  "Sinop",
  "Sivas",
  "Şırnak",
  "Tekirdağ",
  "Tokat",
  "Trabzon",
  "Tunceli",
  "Uşak",
  "Van",
  "Yalova",
  "Yozgat",
  "Zonguldak",
];

/** City coordinates for map embeds */
export const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  Adana: { lat: 37.0, lng: 35.3213 },
  Ankara: { lat: 39.9334, lng: 32.8597 },
  Antalya: { lat: 36.8969, lng: 30.7133 },
  Balıkesir: { lat: 39.6484, lng: 27.8826 },
  Bursa: { lat: 40.1885, lng: 29.0610 },
  Denizli: { lat: 37.7765, lng: 29.0864 },
  Diyarbakır: { lat: 37.9144, lng: 40.2306 },
  Erzurum: { lat: 39.9043, lng: 41.2679 },
  Eskişehir: { lat: 39.7667, lng: 30.5256 },
  Gaziantep: { lat: 37.0662, lng: 37.3833 },
  Hatay: { lat: 36.4018, lng: 36.3498 },
  İstanbul: { lat: 41.0082, lng: 28.9784 },
  İzmir: { lat: 38.4192, lng: 27.1287 },
  Kayseri: { lat: 38.7312, lng: 35.4787 },
  Kocaeli: { lat: 40.8533, lng: 29.8815 },
  Konya: { lat: 37.8746, lng: 32.4932 },
  Mersin: { lat: 36.8121, lng: 34.6415 },
  Muğla: { lat: 37.2153, lng: 28.3636 },
  Samsun: { lat: 41.2928, lng: 36.3313 },
  Şanlıurfa: { lat: 37.1591, lng: 38.7969 },
  Tekirdağ: { lat: 40.9781, lng: 27.5126 },
  Trabzon: { lat: 41.0027, lng: 39.7168 },
};

/** Generate a standard timeline for a tender */
function genTimeline(
  publishDate: string,
  deadline: string,
  status: "active" | "closed" | "upcoming"
): TimelineEvent[] {
  const pub = new Date(publishDate);
  const dl = new Date(deadline);
  const now = Date.now();

  const questionDeadline = new Date(pub.getTime() + (dl.getTime() - pub.getTime()) * 0.4);
  const amendmentDate = new Date(pub.getTime() + (dl.getTime() - pub.getTime()) * 0.5);
  const openingDate = new Date(dl.getTime() + 3 * 24 * 60 * 60 * 1000);
  const resultDate = new Date(dl.getTime() + 14 * 24 * 60 * 60 * 1000);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  return [
    {
      type: "publish" as TimelineEventType,
      label: "İlan Tarihi",
      date: publishDate,
      completed: now >= pub.getTime(),
    },
    {
      type: "question_deadline" as TimelineEventType,
      label: "Son Soru Sorma Tarihi",
      date: fmt(questionDeadline),
      completed: now >= questionDeadline.getTime(),
    },
    {
      type: "amendment" as TimelineEventType,
      label: "Zeyilname / Düzeltme",
      date: fmt(amendmentDate),
      completed: now >= amendmentDate.getTime(),
      note: status === "closed" ? "Zeyilname yayınlandı" : undefined,
    },
    {
      type: "application_deadline" as TimelineEventType,
      label: "Son Başvuru Tarihi",
      date: deadline,
      completed: now >= dl.getTime(),
    },
    {
      type: "opening" as TimelineEventType,
      label: "İhale Açıklama Tarihi",
      date: fmt(openingDate),
      completed: status === "closed" && now >= openingDate.getTime(),
    },
    {
      type: "result" as TimelineEventType,
      label: "Sonuç Açıklama",
      date: fmt(resultDate),
      completed: status === "closed" && now >= resultDate.getTime(),
      note: status === "closed" ? "Sonuçlar açıklandı" : undefined,
    },
  ];
}

/** Add category info to documents */
function categorizeDoc(name: string): TenderDocument["category"] {
  const n = name.toLowerCase();
  if (n.includes("teknik")) return "teknik";
  if (n.includes("sözleşme") || n.includes("sozlesme")) return "sozlesme";
  if (n.includes("şartname") || n.includes("idari") || n.includes("ihale doküman") || n.includes("ihale şartname")) return "sartname";
  return "diger";
}

const _rawTenders: (Omit<Tender, "timeline" | "coordinates" | "documents"> & {
  documents: { name: string; size: string }[];
})[] = [
  {
    id: "1",
    title: "Ankara-Sivas YHT Hattı 2. Etap Yapım İşi",
    institution: "T.C. Ulaştırma ve Altyapı Bakanlığı",
    institutionType: "bakanlik",
    city: "Ankara",
    category: "Yapım İşleri",
    type: "Açık İhale",
    estimatedCost: "2.450.000.000 ₺",
    estimatedCostValue: 2450000000,
    publishDate: "2026-03-20",
    deadline: "2026-04-15",
    status: "active",
    ekapNo: "2026/100234",
    description:
      "Ankara-Sivas Yüksek Hızlı Tren Hattı Projesi kapsamında 2. etap yapım işleri. İş kapsamında yaklaşık 180 km'lik demiryolu hattı inşaatı, tünel ve viyadük yapımı bulunmaktadır.",
    documents: [
      { name: "İhale Şartnamesi.pdf", size: "2.4 MB" },
      { name: "Teknik Şartname.pdf", size: "15.8 MB" },
      { name: "Birim Fiyat Cetveli.xlsx", size: "1.2 MB" },
    ],
  },
  {
    id: "2",
    title: "İstanbul Havalimanı Terminal Genişletme Projesi",
    institution: "İGA Havalimanı İşletmesi A.Ş.",
    institutionType: "kit",
    city: "İstanbul",
    category: "Yapım İşleri",
    type: "Belli İstekliler Arası",
    estimatedCost: "5.780.000.000 ₺",
    estimatedCostValue: 5780000000,
    publishDate: "2026-03-18",
    deadline: "2026-04-20",
    status: "active",
    ekapNo: "2026/100456",
    description:
      "İstanbul Havalimanı yeni terminal binası genişletme projesi. Yolcu kapasitesinin artırılması amacıyla yeni terminal alanı, pist bağlantı yolları ve apron genişletme işlerini kapsamaktadır.",
    documents: [
      { name: "Proje Dosyası.pdf", size: "45.2 MB" },
      { name: "İdari Şartname.pdf", size: "3.1 MB" },
    ],
  },
  {
    id: "3",
    title: "Sağlık Bakanlığı Tıbbi Cihaz Alımı",
    institution: "T.C. Sağlık Bakanlığı",
    institutionType: "bakanlik",
    city: "Ankara",
    category: "Mal Alımı",
    type: "Açık İhale",
    estimatedCost: "450.000.000 ₺",
    estimatedCostValue: 450000000,
    publishDate: "2026-03-22",
    deadline: "2026-04-10",
    status: "active",
    ekapNo: "2026/100789",
    description:
      "81 il genelindeki devlet hastanelerine MR, BT ve ultrason cihazları alımı. Toplam 250 adet tıbbi görüntüleme cihazının temini, kurulumu ve 5 yıllık bakım anlaşmasını kapsamaktadır.",
    documents: [
      { name: "Teknik Şartname.pdf", size: "8.5 MB" },
      { name: "İdari Şartname.pdf", size: "2.3 MB" },
      { name: "Sözleşme Taslağı.pdf", size: "1.8 MB" },
    ],
  },
  {
    id: "4",
    title: "Milli Eğitim Bakanlığı Bilişim Altyapısı",
    institution: "T.C. Milli Eğitim Bakanlığı",
    institutionType: "bakanlik",
    city: "Ankara",
    category: "Bilişim",
    type: "Açık İhale",
    estimatedCost: "320.000.000 ₺",
    estimatedCostValue: 320000000,
    publishDate: "2026-03-19",
    deadline: "2026-04-08",
    status: "active",
    ekapNo: "2026/101012",
    description:
      "Türkiye genelindeki okullarda dijital dönüşüm projesi kapsamında bilişim altyapısının güncellenmesi, sunucu ve ağ ekipmanlarının temini.",
    documents: [
      { name: "Teknik Şartname.pdf", size: "12.3 MB" },
      { name: "İhale Dokümanı.pdf", size: "4.5 MB" },
    ],
  },
  {
    id: "5",
    title: "İzmir Büyükşehir Belediyesi Toplu Taşıma Hizmeti",
    institution: "İzmir Büyükşehir Belediyesi",
    institutionType: "belediye",
    city: "İzmir",
    category: "Hizmet Alımı",
    type: "Açık İhale",
    estimatedCost: "180.000.000 ₺",
    estimatedCostValue: 180000000,
    publishDate: "2026-03-21",
    deadline: "2026-04-12",
    status: "active",
    ekapNo: "2026/101345",
    description:
      "İzmir ili genelinde 3 yıl süreli toplu taşıma hizmet alımı. 500 adet otobüs ile kent içi yolcu taşımacılığı hizmetini kapsamaktadır.",
    documents: [
      { name: "İdari Şartname.pdf", size: "3.2 MB" },
      { name: "Teknik Şartname.pdf", size: "6.7 MB" },
    ],
  },
  {
    id: "6",
    title: "Karayolları Genel Müdürlüğü Asfalt Yapım İşi",
    institution: "Karayolları Genel Müdürlüğü",
    institutionType: "kit",
    city: "Bursa",
    category: "Yapım İşleri",
    type: "Açık İhale",
    estimatedCost: "95.000.000 ₺",
    estimatedCostValue: 95000000,
    publishDate: "2026-03-15",
    deadline: "2026-04-05",
    status: "active",
    ekapNo: "2026/101678",
    description:
      "Bursa-Yalova karayolu güzergahında asfalt yenileme ve yol genişletme çalışmaları.",
    documents: [
      { name: "İhale Şartnamesi.pdf", size: "2.1 MB" },
      { name: "Teknik Şartname.pdf", size: "4.3 MB" },
    ],
  },
  {
    id: "7",
    title: "DSİ Baraj İnşaatı Danışmanlık Hizmeti",
    institution: "Devlet Su İşleri Genel Müdürlüğü",
    institutionType: "kit",
    city: "Trabzon",
    category: "Danışmanlık",
    type: "Belli İstekliler Arası",
    estimatedCost: "45.000.000 ₺",
    estimatedCostValue: 45000000,
    publishDate: "2026-03-10",
    deadline: "2026-03-30",
    status: "closed",
    ekapNo: "2026/101901",
    description:
      "Trabzon ili Çaykara ilçesinde yapılacak baraj projesi için mühendislik danışmanlık hizmeti alımı.",
    documents: [
      { name: "Danışmanlık Şartnamesi.pdf", size: "5.4 MB" },
    ],
  },
  {
    id: "8",
    title: "Üniversite Kampüs Güvenlik Hizmeti Alımı",
    institution: "İstanbul Teknik Üniversitesi",
    institutionType: "universite",
    city: "İstanbul",
    category: "Hizmet Alımı",
    type: "Açık İhale",
    estimatedCost: "28.000.000 ₺",
    estimatedCostValue: 28000000,
    publishDate: "2026-03-23",
    deadline: "2026-04-18",
    status: "active",
    ekapNo: "2026/102234",
    description:
      "İTÜ Maslak ve Ayazağa kampüslerinde 2 yıl süreli özel güvenlik hizmeti alımı. 150 güvenlik personeli istihdamını kapsamaktadır.",
    documents: [
      { name: "İhale Dokümanı.pdf", size: "2.8 MB" },
      { name: "Teknik Şartname.pdf", size: "1.5 MB" },
    ],
  },
  {
    id: "9",
    title: "Antalya Büyükşehir Belediyesi Yol Yapım İşi",
    institution: "Antalya Büyükşehir Belediyesi",
    institutionType: "belediye",
    city: "Antalya",
    category: "Yapım İşleri",
    type: "Açık İhale",
    estimatedCost: "125.000.000 ₺",
    estimatedCostValue: 125000000,
    publishDate: "2026-03-17",
    deadline: "2026-04-14",
    status: "active",
    ekapNo: "2026/102567",
    description:
      "Antalya ili genelinde 45 km'lik yeni yol yapım ve mevcut yolların rehabilitasyonu işi.",
    documents: [
      { name: "İhale Şartnamesi.pdf", size: "3.5 MB" },
      { name: "Teknik Şartname.pdf", size: "8.2 MB" },
    ],
  },
  {
    id: "10",
    title: "Konya Şehir Hastanesi Medikal Gaz Sistemi",
    institution: "T.C. Sağlık Bakanlığı",
    institutionType: "bakanlik",
    city: "Konya",
    category: "Mal Alımı",
    type: "Açık İhale",
    estimatedCost: "38.500.000 ₺",
    estimatedCostValue: 38500000,
    publishDate: "2026-03-16",
    deadline: "2026-04-06",
    status: "active",
    ekapNo: "2026/102890",
    description:
      "Konya Şehir Hastanesi için merkezi medikal gaz sistemi ve tıbbi gaz tesisatı kurulumu.",
    documents: [
      { name: "Teknik Şartname.pdf", size: "5.1 MB" },
    ],
  },
  {
    id: "11",
    title: "Gaziantep Organize Sanayi Bölgesi Altyapı",
    institution: "Gaziantep Organize Sanayi Bölge Müdürlüğü",
    institutionType: "kit",
    city: "Gaziantep",
    category: "Yapım İşleri",
    type: "Açık İhale",
    estimatedCost: "210.000.000 ₺",
    estimatedCostValue: 210000000,
    publishDate: "2026-03-14",
    deadline: "2026-04-11",
    status: "active",
    ekapNo: "2026/103123",
    description:
      "Gaziantep 6. Organize Sanayi Bölgesi altyapı ve üstyapı inşaat işleri.",
    documents: [
      { name: "İhale Dokümanı.pdf", size: "7.8 MB" },
      { name: "Teknik Şartname.pdf", size: "12.5 MB" },
    ],
  },
  {
    id: "12",
    title: "Mersin Limanı Konteyner Terminali Genişletme",
    institution: "MIP Mersin Uluslararası Liman İşletmeciliği",
    institutionType: "kit",
    city: "Mersin",
    category: "Yapım İşleri",
    type: "Belli İstekliler Arası",
    estimatedCost: "1.850.000.000 ₺",
    estimatedCostValue: 1850000000,
    publishDate: "2026-03-12",
    deadline: "2026-04-09",
    status: "active",
    ekapNo: "2026/103456",
    description:
      "Mersin Uluslararası Limanı konteyner terminali genişletme ve modernizasyon projesi.",
    documents: [
      { name: "Proje Dokümanı.pdf", size: "22.3 MB" },
      { name: "Teknik Şartname.pdf", size: "9.6 MB" },
    ],
  },
  {
    id: "13",
    title: "Diyarbakır Belediyesi Temizlik Hizmeti Alımı",
    institution: "Diyarbakır Büyükşehir Belediyesi",
    institutionType: "belediye",
    city: "Diyarbakır",
    category: "Hizmet Alımı",
    type: "Açık İhale",
    estimatedCost: "67.000.000 ₺",
    estimatedCostValue: 67000000,
    publishDate: "2026-03-19",
    deadline: "2026-04-16",
    status: "active",
    ekapNo: "2026/103789",
    description:
      "Diyarbakır ili genelinde 2 yıl süreli kent temizliği ve çöp toplama hizmeti alımı.",
    documents: [
      { name: "İdari Şartname.pdf", size: "2.9 MB" },
      { name: "Teknik Şartname.pdf", size: "4.1 MB" },
    ],
  },
  {
    id: "14",
    title: "ODTÜ Bilgi İşlem Sunucu Alımı",
    institution: "Orta Doğu Teknik Üniversitesi",
    institutionType: "universite",
    city: "Ankara",
    category: "Bilişim",
    type: "Açık İhale",
    estimatedCost: "12.500.000 ₺",
    estimatedCostValue: 12500000,
    publishDate: "2026-03-22",
    deadline: "2026-04-19",
    status: "active",
    ekapNo: "2026/104012",
    description:
      "ODTÜ Bilgi İşlem Daire Başkanlığı için yüksek performanslı sunucu ve depolama sistemi alımı.",
    documents: [
      { name: "Teknik Şartname.pdf", size: "6.3 MB" },
    ],
  },
  {
    id: "15",
    title: "Ege Üniversitesi Laboratuvar Malzemesi Alımı",
    institution: "Ege Üniversitesi",
    institutionType: "universite",
    city: "İzmir",
    category: "Mal Alımı",
    type: "Açık İhale",
    estimatedCost: "8.750.000 ₺",
    estimatedCostValue: 8750000,
    publishDate: "2026-03-21",
    deadline: "2026-04-17",
    status: "active",
    ekapNo: "2026/104345",
    description:
      "Ege Üniversitesi Fen Fakültesi ve Mühendislik Fakültesi laboratuvarları için kimyasal ve araç-gereç alımı.",
    documents: [
      { name: "Teknik Şartname.pdf", size: "3.4 MB" },
      { name: "İhale Dokümanı.pdf", size: "1.8 MB" },
    ],
  },
  {
    id: "16",
    title: "Kayseri Belediyesi Tramvay Hattı Uzatma",
    institution: "Kayseri Büyükşehir Belediyesi",
    institutionType: "belediye",
    city: "Kayseri",
    category: "Ulaşım",
    type: "Açık İhale",
    estimatedCost: "780.000.000 ₺",
    estimatedCostValue: 780000000,
    publishDate: "2026-03-13",
    deadline: "2026-04-13",
    status: "active",
    ekapNo: "2026/104678",
    description:
      "Kayseri tramvay hattının 12 km uzatılması, yeni istasyonlar ve enerji tesisatı yapım işi.",
    documents: [
      { name: "Proje Dosyası.pdf", size: "35.7 MB" },
      { name: "Teknik Şartname.pdf", size: "11.2 MB" },
    ],
  },
  {
    id: "17",
    title: "Adana Belediyesi Park ve Bahçe Düzenlemesi",
    institution: "Adana Büyükşehir Belediyesi",
    institutionType: "belediye",
    city: "Adana",
    category: "Yapım İşleri",
    type: "Açık İhale",
    estimatedCost: "22.000.000 ₺",
    estimatedCostValue: 22000000,
    publishDate: "2026-03-20",
    deadline: "2026-04-15",
    status: "active",
    ekapNo: "2026/104901",
    description:
      "Adana ili merkez ilçelerinde 15 adet yeni park yapımı ve mevcut parkların peyzaj düzenlemesi.",
    documents: [
      { name: "İhale Şartnamesi.pdf", size: "2.6 MB" },
    ],
  },
  {
    id: "18",
    title: "Türk Telekom Fiber Optik Altyapı Genişletme",
    institution: "Türk Telekom A.Ş.",
    institutionType: "kit",
    city: "İstanbul",
    category: "Bilişim",
    type: "Belli İstekliler Arası",
    estimatedCost: "520.000.000 ₺",
    estimatedCostValue: 520000000,
    publishDate: "2026-03-11",
    deadline: "2026-04-07",
    status: "active",
    ekapNo: "2026/105234",
    description:
      "İstanbul Anadolu Yakası genelinde fiber optik altyapı genişletme ve FTTH kurulum projesi.",
    documents: [
      { name: "Teknik Şartname.pdf", size: "14.8 MB" },
      { name: "İdari Şartname.pdf", size: "5.2 MB" },
    ],
  },
  {
    id: "19",
    title: "Atatürk Üniversitesi Yurt Binası Yapımı",
    institution: "Atatürk Üniversitesi",
    institutionType: "universite",
    city: "Erzurum",
    category: "Yapım İşleri",
    type: "Açık İhale",
    estimatedCost: "165.000.000 ₺",
    estimatedCostValue: 165000000,
    publishDate: "2026-03-18",
    deadline: "2026-04-22",
    status: "active",
    ekapNo: "2026/105567",
    description:
      "Atatürk Üniversitesi kampüsünde 2000 kişi kapasiteli yeni öğrenci yurt binası yapım işi.",
    documents: [
      { name: "Proje Dosyası.pdf", size: "18.4 MB" },
      { name: "Teknik Şartname.pdf", size: "7.9 MB" },
    ],
  },
  {
    id: "20",
    title: "Samsun Belediyesi Akıllı Kent Projesi",
    institution: "Samsun Büyükşehir Belediyesi",
    institutionType: "belediye",
    city: "Samsun",
    category: "Bilişim",
    type: "Açık İhale",
    estimatedCost: "42.000.000 ₺",
    estimatedCostValue: 42000000,
    publishDate: "2026-03-15",
    deadline: "2026-04-10",
    status: "active",
    ekapNo: "2026/105890",
    description:
      "Samsun kent genelinde akıllı şehir uygulamaları kapsamında IoT sensör ağı, trafik yönetimi ve çevre izleme sistemi kurulumu.",
    documents: [
      { name: "Teknik Şartname.pdf", size: "9.7 MB" },
      { name: "İdari Şartname.pdf", size: "3.8 MB" },
    ],
  },
  {
    id: "21",
    title: "Çevre ve Şehircilik Bakanlığı Kentsel Dönüşüm",
    institution: "T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı",
    institutionType: "bakanlik",
    city: "Hatay",
    category: "Yapım İşleri",
    type: "Açık İhale",
    estimatedCost: "3.200.000.000 ₺",
    estimatedCostValue: 3200000000,
    publishDate: "2026-03-08",
    deadline: "2026-04-02",
    status: "closed",
    ekapNo: "2026/106123",
    description:
      "Hatay ili deprem sonrası kentsel dönüşüm projesi kapsamında konut ve altyapı inşaat işleri.",
    documents: [
      { name: "Proje Dosyası.pdf", size: "52.1 MB" },
    ],
  },
  {
    id: "22",
    title: "Tarım ve Orman Bakanlığı Sulama Projesi",
    institution: "T.C. Tarım ve Orman Bakanlığı",
    institutionType: "bakanlik",
    city: "Şanlıurfa",
    category: "Yapım İşleri",
    type: "Açık İhale",
    estimatedCost: "890.000.000 ₺",
    estimatedCostValue: 890000000,
    publishDate: "2026-03-05",
    deadline: "2026-03-28",
    status: "closed",
    ekapNo: "2026/106456",
    description:
      "Şanlıurfa ili GAP projesi kapsamında modern damla sulama sistemi kurulumu.",
    documents: [
      { name: "Teknik Şartname.pdf", size: "11.3 MB" },
    ],
  },
  {
    id: "23",
    title: "Eskişehir Belediyesi Otobüs Alımı",
    institution: "Eskişehir Büyükşehir Belediyesi",
    institutionType: "belediye",
    city: "Eskişehir",
    category: "Mal Alımı",
    type: "Açık İhale",
    estimatedCost: "56.000.000 ₺",
    estimatedCostValue: 56000000,
    publishDate: "2026-03-24",
    deadline: "2026-04-21",
    status: "upcoming",
    ekapNo: "2026/106789",
    description:
      "Eskişehir toplu taşıma filosu için 30 adet CNG yakıtlı şehir içi otobüs alımı.",
    documents: [
      { name: "Teknik Şartname.pdf", size: "4.7 MB" },
    ],
  },
  {
    id: "24",
    title: "Muğla Belediyesi Atık Su Arıtma Tesisi",
    institution: "Muğla Büyükşehir Belediyesi",
    institutionType: "belediye",
    city: "Muğla",
    category: "Yapım İşleri",
    type: "Açık İhale",
    estimatedCost: "145.000.000 ₺",
    estimatedCostValue: 145000000,
    publishDate: "2026-03-25",
    deadline: "2026-04-25",
    status: "upcoming",
    ekapNo: "2026/107012",
    description:
      "Muğla Bodrum ilçesinde günlük 50.000 m³ kapasiteli ileri biyolojik atık su arıtma tesisi yapımı.",
    documents: [
      { name: "Proje Dosyası.pdf", size: "28.6 MB" },
      { name: "Teknik Şartname.pdf", size: "15.3 MB" },
    ],
  },
  {
    id: "25",
    title: "Denizli Belediyesi Jeotermal Isıtma Sistemi",
    institution: "Denizli Büyükşehir Belediyesi",
    institutionType: "belediye",
    city: "Denizli",
    category: "Yapım İşleri",
    type: "Açık İhale",
    estimatedCost: "78.000.000 ₺",
    estimatedCostValue: 78000000,
    publishDate: "2026-03-23",
    deadline: "2026-04-20",
    status: "active",
    ekapNo: "2026/107345",
    description:
      "Denizli merkez ilçede 5.000 konutluk jeotermal merkezi ısıtma sistemi kurulumu.",
    documents: [
      { name: "Teknik Şartname.pdf", size: "7.2 MB" },
    ],
  },
  {
    id: "26",
    title: "Hacettepe Üniversitesi Tıp Fakültesi Tadilat",
    institution: "Hacettepe Üniversitesi",
    institutionType: "universite",
    city: "Ankara",
    category: "Yapım İşleri",
    type: "Açık İhale",
    estimatedCost: "35.000.000 ₺",
    estimatedCostValue: 35000000,
    publishDate: "2026-03-20",
    deadline: "2026-04-16",
    status: "active",
    ekapNo: "2026/107678",
    description:
      "Hacettepe Üniversitesi Tıp Fakültesi hastane binası A Blok tadilat ve güçlendirme işi.",
    documents: [
      { name: "İhale Şartnamesi.pdf", size: "4.5 MB" },
    ],
  },
  {
    id: "27",
    title: "BOTAŞ Doğalgaz Boru Hattı Yapımı",
    institution: "BOTAŞ Boru Hatları ile Petrol Taşıma A.Ş.",
    institutionType: "kit",
    city: "Kocaeli",
    category: "Yapım İşleri",
    type: "Belli İstekliler Arası",
    estimatedCost: "2.100.000.000 ₺",
    estimatedCostValue: 2100000000,
    publishDate: "2026-03-09",
    deadline: "2026-04-03",
    status: "closed",
    ekapNo: "2026/107901",
    description:
      "Kocaeli-Sakarya arası 85 km'lik doğalgaz iletim boru hattı yapım işi.",
    documents: [
      { name: "Teknik Şartname.pdf", size: "19.8 MB" },
    ],
  },
  {
    id: "28",
    title: "Balıkesir Belediyesi Sosyal Tesis Yapımı",
    institution: "Balıkesir Büyükşehir Belediyesi",
    institutionType: "belediye",
    city: "Balıkesir",
    category: "Yapım İşleri",
    type: "Açık İhale",
    estimatedCost: "18.500.000 ₺",
    estimatedCostValue: 18500000,
    publishDate: "2026-03-22",
    deadline: "2026-04-18",
    status: "active",
    ekapNo: "2026/108234",
    description:
      "Balıkesir merkez ve Bandırma ilçelerinde toplam 3 adet sosyal tesis ve kültür merkezi yapımı.",
    documents: [
      { name: "İhale Dokümanı.pdf", size: "5.6 MB" },
    ],
  },
  {
    id: "29",
    title: "Milli Savunma Bakanlığı Yazılım Geliştirme",
    institution: "T.C. Milli Savunma Bakanlığı",
    institutionType: "bakanlik",
    city: "Ankara",
    category: "Danışmanlık",
    type: "Belli İstekliler Arası",
    estimatedCost: "95.000.000 ₺",
    estimatedCostValue: 95000000,
    publishDate: "2026-03-24",
    deadline: "2026-04-24",
    status: "upcoming",
    ekapNo: "2026/108567",
    description:
      "Milli Savunma Bakanlığı bünyesinde kullanılacak kurumsal kaynak planlama yazılımı geliştirme danışmanlık hizmeti.",
    documents: [
      { name: "Teknik Şartname.pdf", size: "8.3 MB" },
    ],
  },
  {
    id: "30",
    title: "Tekirdağ Belediyesi Yağmur Suyu Hatları",
    institution: "Tekirdağ Büyükşehir Belediyesi",
    institutionType: "belediye",
    city: "Tekirdağ",
    category: "Yapım İşleri",
    type: "Açık İhale",
    estimatedCost: "54.000.000 ₺",
    estimatedCostValue: 54000000,
    publishDate: "2026-03-21",
    deadline: "2026-04-17",
    status: "active",
    ekapNo: "2026/108890",
    description:
      "Tekirdağ Çorlu ve Çerkezköy ilçelerinde yağmur suyu toplama ve drenaj hatları yapım işi.",
    documents: [
      { name: "Teknik Şartname.pdf", size: "6.8 MB" },
      { name: "İdari Şartname.pdf", size: "2.4 MB" },
    ],
  },
];

/** Transform raw tenders: add timeline, coordinates, and categorize docs */
export const tenders: Tender[] = _rawTenders.map((t) => ({
  ...t,
  documents: t.documents.map((d) => ({
    ...d,
    category: categorizeDoc(d.name),
  })),
  timeline: genTimeline(t.publishDate, t.deadline, t.status),
  coordinates: cityCoordinates[t.city],
}));

export const stats = [
  { label: "Aktif İhale", value: "12.450+" },
  { label: "Kayıtlı Firma", value: "8.200+" },
  { label: "Kurum", value: "3.500+" },
  { label: "Şehir", value: "81" },
];
