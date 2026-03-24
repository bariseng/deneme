export interface Tender {
  id: string;
  title: string;
  institution: string;
  city: string;
  category: string;
  type: string;
  estimatedCost: string;
  publishDate: string;
  deadline: string;
  status: "active" | "closed" | "upcoming";
  description: string;
  documents: { name: string; size: string }[];
}

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
  "İstanbul",
  "Ankara",
  "İzmir",
  "Bursa",
  "Antalya",
  "Adana",
  "Konya",
  "Gaziantep",
  "Şanlıurfa",
  "Kocaeli",
  "Mersin",
  "Diyarbakır",
  "Hatay",
  "Manisa",
  "Kayseri",
  "Samsun",
  "Balıkesir",
  "Tekirdağ",
  "Aydın",
  "Trabzon",
];

export const tenders: Tender[] = [
  {
    id: "1",
    title: "Ankara-Sivas YHT Hattı 2. Etap Yapım İşi",
    institution: "T.C. Ulaştırma ve Altyapı Bakanlığı",
    city: "Ankara",
    category: "Yapım İşleri",
    type: "Açık İhale",
    estimatedCost: "2.450.000.000 ₺",
    publishDate: "2026-03-20",
    deadline: "2026-04-15",
    status: "active",
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
    city: "İstanbul",
    category: "Yapım İşleri",
    type: "Belli İstekliler Arası",
    estimatedCost: "5.780.000.000 ₺",
    publishDate: "2026-03-18",
    deadline: "2026-04-20",
    status: "active",
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
    city: "Ankara",
    category: "Mal Alımı",
    type: "Açık İhale",
    estimatedCost: "450.000.000 ₺",
    publishDate: "2026-03-22",
    deadline: "2026-04-10",
    status: "active",
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
    city: "Ankara",
    category: "Bilişim",
    type: "Açık İhale",
    estimatedCost: "320.000.000 ₺",
    publishDate: "2026-03-19",
    deadline: "2026-04-08",
    status: "active",
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
    city: "İzmir",
    category: "Hizmet Alımı",
    type: "Açık İhale",
    estimatedCost: "180.000.000 ₺",
    publishDate: "2026-03-21",
    deadline: "2026-04-12",
    status: "active",
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
    city: "Bursa",
    category: "Yapım İşleri",
    type: "Açık İhale",
    estimatedCost: "95.000.000 ₺",
    publishDate: "2026-03-15",
    deadline: "2026-04-05",
    status: "active",
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
    city: "Trabzon",
    category: "Danışmanlık",
    type: "Belli İstekliler Arası",
    estimatedCost: "45.000.000 ₺",
    publishDate: "2026-03-10",
    deadline: "2026-03-30",
    status: "closed",
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
    city: "İstanbul",
    category: "Hizmet Alımı",
    type: "Açık İhale",
    estimatedCost: "28.000.000 ₺",
    publishDate: "2026-03-23",
    deadline: "2026-04-18",
    status: "active",
    description:
      "İTÜ Maslak ve Ayazağa kampüslerinde 2 yıl süreli özel güvenlik hizmeti alımı. 150 güvenlik personeli istihdamını kapsamaktadır.",
    documents: [
      { name: "İhale Dokümanı.pdf", size: "2.8 MB" },
      { name: "Teknik Şartname.pdf", size: "1.5 MB" },
    ],
  },
];

export const stats = [
  { label: "Aktif İhale", value: "12.450+" },
  { label: "Kayıtlı Firma", value: "8.200+" },
  { label: "Kurum", value: "3.500+" },
  { label: "Şehir", value: "81" },
];
