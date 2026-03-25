export interface CompanyTenderHistory {
  tenderId: string;
  tenderTitle: string;
  year: number;
  amount: number;
  category: string;
  city: string;
  result: "won" | "lost" | "pending";
}

export interface ExperienceCertificate {
  title: string;
  issuer: string;
  year: number;
  amount: number;
}

export interface Company {
  id: string;
  name: string;
  taxNo: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  foundedYear: number;
  employeeCount: number;
  sectors: string[];
  totalTenderAmount: number;
  wonTenderCount: number;
  lostTenderCount: number;
  activeTenderCount: number;
  tenderHistory: CompanyTenderHistory[];
  experienceCertificates: ExperienceCertificate[];
  /** Percentage of market share within their primary sector */
  sectorMarketShare: { sector: string; share: number }[];
  rating: number; // 1-5
}

export const companies: Company[] = [
  {
    id: "c1",
    name: "Anadolu İnşaat A.Ş.",
    taxNo: "1234567890",
    city: "İstanbul",
    address: "Levent Mah. İş Kuleleri No:12 Kat:15, Beşiktaş / İstanbul",
    phone: "0212 345 67 89",
    email: "info@anadoluinsaat.com.tr",
    website: "www.anadoluinsaat.com.tr",
    foundedYear: 1998,
    employeeCount: 2500,
    sectors: ["Yapım İşleri", "Ulaşım"],
    totalTenderAmount: 18_750_000_000,
    wonTenderCount: 45,
    lostTenderCount: 23,
    activeTenderCount: 5,
    tenderHistory: [
      {
        tenderId: "1",
        tenderTitle: "Ankara-Sivas YHT Hattı 2. Etap Yapım İşi",
        year: 2026,
        amount: 2_450_000_000,
        category: "Yapım İşleri",
        city: "Ankara",
        result: "pending",
      },
      {
        tenderId: "2",
        tenderTitle: "İstanbul Havalimanı Terminal Genişletme Projesi",
        year: 2026,
        amount: 5_780_000_000,
        category: "Yapım İşleri",
        city: "İstanbul",
        result: "pending",
      },
      {
        tenderId: "6",
        tenderTitle: "Karayolları Asfalt Yapım İşi",
        year: 2026,
        amount: 95_000_000,
        category: "Yapım İşleri",
        city: "Bursa",
        result: "won",
      },
      {
        tenderId: "",
        tenderTitle: "İstanbul-Bursa Otoyolu Kavşak İyileştirme",
        year: 2025,
        amount: 320_000_000,
        category: "Yapım İşleri",
        city: "İstanbul",
        result: "won",
      },
      {
        tenderId: "",
        tenderTitle: "Ankara Metro Hattı 3. Etap",
        year: 2025,
        amount: 1_200_000_000,
        category: "Ulaşım",
        city: "Ankara",
        result: "won",
      },
      {
        tenderId: "",
        tenderTitle: "Trabzon Havalimanı Pist Yenileme",
        year: 2024,
        amount: 180_000_000,
        category: "Yapım İşleri",
        city: "Trabzon",
        result: "won",
      },
      {
        tenderId: "",
        tenderTitle: "İzmir Otoyol Bağlantı Yolu",
        year: 2024,
        amount: 450_000_000,
        category: "Yapım İşleri",
        city: "İzmir",
        result: "lost",
      },
    ],
    experienceCertificates: [
      {
        title: "A Grubu Müteahhitlik Karnesi",
        issuer: "T.C. Çevre ve Şehircilik Bakanlığı",
        year: 2024,
        amount: 5_000_000_000,
      },
      {
        title: "ISO 9001:2015 Kalite Yönetim Sistemi",
        issuer: "TSE",
        year: 2023,
        amount: 0,
      },
      {
        title: "İş Deneyim Belgesi - Ankara Metro",
        issuer: "EGO Genel Müdürlüğü",
        year: 2025,
        amount: 1_200_000_000,
      },
    ],
    sectorMarketShare: [
      { sector: "Yapım İşleri", share: 8.2 },
      { sector: "Ulaşım", share: 12.5 },
    ],
    rating: 4.5,
  },
  {
    id: "c2",
    name: "Başkent Teknoloji Ltd. Şti.",
    taxNo: "9876543210",
    city: "Ankara",
    address: "ODTÜ Teknokent B Blok No:205, Çankaya / Ankara",
    phone: "0312 456 78 90",
    email: "info@baskentek.com.tr",
    website: "www.baskentek.com.tr",
    foundedYear: 2010,
    employeeCount: 180,
    sectors: ["Bilişim", "Danışmanlık"],
    totalTenderAmount: 2_150_000_000,
    wonTenderCount: 28,
    lostTenderCount: 15,
    activeTenderCount: 3,
    tenderHistory: [
      {
        tenderId: "4",
        tenderTitle: "Milli Eğitim Bakanlığı Bilişim Altyapısı",
        year: 2026,
        amount: 320_000_000,
        category: "Bilişim",
        city: "Ankara",
        result: "pending",
      },
      {
        tenderId: "14",
        tenderTitle: "ODTÜ Bilgi İşlem Sunucu Alımı",
        year: 2026,
        amount: 12_500_000,
        category: "Bilişim",
        city: "Ankara",
        result: "pending",
      },
      {
        tenderId: "20",
        tenderTitle: "Samsun Belediyesi Akıllı Kent Projesi",
        year: 2026,
        amount: 42_000_000,
        category: "Bilişim",
        city: "Samsun",
        result: "pending",
      },
      {
        tenderId: "",
        tenderTitle: "Adalet Bakanlığı UYAP Güncelleme",
        year: 2025,
        amount: 85_000_000,
        category: "Bilişim",
        city: "Ankara",
        result: "won",
      },
      {
        tenderId: "",
        tenderTitle: "SGK Veri Merkezi Modernizasyonu",
        year: 2025,
        amount: 120_000_000,
        category: "Bilişim",
        city: "Ankara",
        result: "won",
      },
      {
        tenderId: "",
        tenderTitle: "İstanbul Büyükşehir Akıllı Ulaşım",
        year: 2024,
        amount: 250_000_000,
        category: "Bilişim",
        city: "İstanbul",
        result: "lost",
      },
    ],
    experienceCertificates: [
      {
        title: "İş Deneyim Belgesi - UYAP",
        issuer: "T.C. Adalet Bakanlığı",
        year: 2025,
        amount: 85_000_000,
      },
      {
        title: "ISO 27001 Bilgi Güvenliği Sertifikası",
        issuer: "TSE",
        year: 2024,
        amount: 0,
      },
    ],
    sectorMarketShare: [
      { sector: "Bilişim", share: 5.8 },
      { sector: "Danışmanlık", share: 3.2 },
    ],
    rating: 4.2,
  },
  {
    id: "c3",
    name: "Ege Yapı Mühendislik A.Ş.",
    taxNo: "5678901234",
    city: "İzmir",
    address: "Alsancak Mah. Kıbrıs Şehitleri Cad. No:88, Konak / İzmir",
    phone: "0232 567 89 01",
    email: "info@egeyapi.com.tr",
    website: "www.egeyapi.com.tr",
    foundedYear: 2005,
    employeeCount: 850,
    sectors: ["Yapım İşleri", "Hizmet Alımı"],
    totalTenderAmount: 6_800_000_000,
    wonTenderCount: 35,
    lostTenderCount: 18,
    activeTenderCount: 4,
    tenderHistory: [
      {
        tenderId: "5",
        tenderTitle: "İzmir Büyükşehir Belediyesi Toplu Taşıma",
        year: 2026,
        amount: 180_000_000,
        category: "Hizmet Alımı",
        city: "İzmir",
        result: "pending",
      },
      {
        tenderId: "24",
        tenderTitle: "Muğla Atık Su Arıtma Tesisi",
        year: 2026,
        amount: 145_000_000,
        category: "Yapım İşleri",
        city: "Muğla",
        result: "pending",
      },
      {
        tenderId: "9",
        tenderTitle: "Antalya Yol Yapım İşi",
        year: 2026,
        amount: 125_000_000,
        category: "Yapım İşleri",
        city: "Antalya",
        result: "pending",
      },
      {
        tenderId: "",
        tenderTitle: "İzmir Metro 2. Aşama",
        year: 2025,
        amount: 890_000_000,
        category: "Yapım İşleri",
        city: "İzmir",
        result: "won",
      },
      {
        tenderId: "",
        tenderTitle: "Denizli Jeotermal Tesis",
        year: 2024,
        amount: 120_000_000,
        category: "Yapım İşleri",
        city: "Denizli",
        result: "won",
      },
      {
        tenderId: "",
        tenderTitle: "Aydın Hastane İnşaatı",
        year: 2024,
        amount: 340_000_000,
        category: "Yapım İşleri",
        city: "Aydın",
        result: "lost",
      },
    ],
    experienceCertificates: [
      {
        title: "B Grubu Müteahhitlik Karnesi",
        issuer: "T.C. Çevre ve Şehircilik Bakanlığı",
        year: 2024,
        amount: 2_000_000_000,
      },
      {
        title: "İş Deneyim Belgesi - İzmir Metro",
        issuer: "İzmir Büyükşehir Belediyesi",
        year: 2025,
        amount: 890_000_000,
      },
    ],
    sectorMarketShare: [
      { sector: "Yapım İşleri", share: 4.5 },
      { sector: "Hizmet Alımı", share: 6.1 },
    ],
    rating: 4.0,
  },
  {
    id: "c4",
    name: "Güney Medikal Sağlık Tic. A.Ş.",
    taxNo: "3456789012",
    city: "Ankara",
    address: "Kızılay Mah. Atatürk Blv. No:42, Çankaya / Ankara",
    phone: "0312 678 90 12",
    email: "info@guneymedikal.com.tr",
    website: "www.guneymedikal.com.tr",
    foundedYear: 2008,
    employeeCount: 320,
    sectors: ["Sağlık", "Mal Alımı"],
    totalTenderAmount: 3_200_000_000,
    wonTenderCount: 42,
    lostTenderCount: 20,
    activeTenderCount: 2,
    tenderHistory: [
      {
        tenderId: "3",
        tenderTitle: "Sağlık Bakanlığı Tıbbi Cihaz Alımı",
        year: 2026,
        amount: 450_000_000,
        category: "Mal Alımı",
        city: "Ankara",
        result: "pending",
      },
      {
        tenderId: "10",
        tenderTitle: "Konya Şehir Hastanesi Medikal Gaz",
        year: 2026,
        amount: 38_500_000,
        category: "Mal Alımı",
        city: "Konya",
        result: "pending",
      },
      {
        tenderId: "",
        tenderTitle: "Ankara Şehir Hastanesi MR Cihazları",
        year: 2025,
        amount: 180_000_000,
        category: "Mal Alımı",
        city: "Ankara",
        result: "won",
      },
      {
        tenderId: "",
        tenderTitle: "İstanbul Çam ve Sakura Hastanesi Ekipman",
        year: 2025,
        amount: 250_000_000,
        category: "Sağlık",
        city: "İstanbul",
        result: "won",
      },
      {
        tenderId: "",
        tenderTitle: "Diyarbakır Devlet Hastanesi Yenileme",
        year: 2024,
        amount: 95_000_000,
        category: "Sağlık",
        city: "Diyarbakır",
        result: "lost",
      },
    ],
    experienceCertificates: [
      {
        title: "İş Deneyim Belgesi - Ankara ŞH",
        issuer: "T.C. Sağlık Bakanlığı",
        year: 2025,
        amount: 180_000_000,
      },
      {
        title: "CE Belgesi - Tıbbi Cihaz",
        issuer: "TÜV SÜD",
        year: 2024,
        amount: 0,
      },
    ],
    sectorMarketShare: [
      { sector: "Sağlık", share: 9.3 },
      { sector: "Mal Alımı", share: 3.8 },
    ],
    rating: 4.3,
  },
  {
    id: "c5",
    name: "Karadeniz Enerji ve Altyapı A.Ş.",
    taxNo: "7890123456",
    city: "Trabzon",
    address: "Meydan Mah. Tanjant Yolu No:5, Ortahisar / Trabzon",
    phone: "0462 789 01 23",
    email: "info@karadenizenerji.com.tr",
    website: "www.karadenizenerji.com.tr",
    foundedYear: 2001,
    employeeCount: 600,
    sectors: ["Yapım İşleri", "Danışmanlık"],
    totalTenderAmount: 4_500_000_000,
    wonTenderCount: 30,
    lostTenderCount: 12,
    activeTenderCount: 2,
    tenderHistory: [
      {
        tenderId: "7",
        tenderTitle: "DSİ Baraj İnşaatı Danışmanlık",
        year: 2026,
        amount: 45_000_000,
        category: "Danışmanlık",
        city: "Trabzon",
        result: "won",
      },
      {
        tenderId: "19",
        tenderTitle: "Atatürk Üniversitesi Yurt Binası",
        year: 2026,
        amount: 165_000_000,
        category: "Yapım İşleri",
        city: "Erzurum",
        result: "pending",
      },
      {
        tenderId: "",
        tenderTitle: "Çoruh Nehri HES Projesi",
        year: 2025,
        amount: 780_000_000,
        category: "Yapım İşleri",
        city: "Artvin",
        result: "won",
      },
      {
        tenderId: "",
        tenderTitle: "Rize Çay Fabrikası İnşaatı",
        year: 2024,
        amount: 65_000_000,
        category: "Yapım İşleri",
        city: "Rize",
        result: "won",
      },
    ],
    experienceCertificates: [
      {
        title: "B Grubu Müteahhitlik Karnesi",
        issuer: "T.C. Çevre ve Şehircilik Bakanlığı",
        year: 2023,
        amount: 1_500_000_000,
      },
      {
        title: "İş Deneyim Belgesi - Çoruh HES",
        issuer: "DSİ Genel Müdürlüğü",
        year: 2025,
        amount: 780_000_000,
      },
    ],
    sectorMarketShare: [
      { sector: "Yapım İşleri", share: 3.1 },
      { sector: "Danışmanlık", share: 7.8 },
    ],
    rating: 4.1,
  },
  {
    id: "c6",
    name: "Marmara Hizmet Grubu A.Ş.",
    taxNo: "2345678901",
    city: "İstanbul",
    address: "Maslak Mah. Büyükdere Cad. No:255, Sarıyer / İstanbul",
    phone: "0212 890 12 34",
    email: "info@marmarahizmet.com.tr",
    website: "www.marmarahizmet.com.tr",
    foundedYear: 2003,
    employeeCount: 4200,
    sectors: ["Hizmet Alımı", "Eğitim"],
    totalTenderAmount: 5_100_000_000,
    wonTenderCount: 55,
    lostTenderCount: 25,
    activeTenderCount: 3,
    tenderHistory: [
      {
        tenderId: "8",
        tenderTitle: "İTÜ Kampüs Güvenlik Hizmeti",
        year: 2026,
        amount: 28_000_000,
        category: "Hizmet Alımı",
        city: "İstanbul",
        result: "pending",
      },
      {
        tenderId: "13",
        tenderTitle: "Diyarbakır Temizlik Hizmeti",
        year: 2026,
        amount: 67_000_000,
        category: "Hizmet Alımı",
        city: "Diyarbakır",
        result: "pending",
      },
      {
        tenderId: "",
        tenderTitle: "İstanbul Üniversitesi Yemekhane Hizmeti",
        year: 2025,
        amount: 45_000_000,
        category: "Hizmet Alımı",
        city: "İstanbul",
        result: "won",
      },
      {
        tenderId: "",
        tenderTitle: "Ankara Büyükşehir Temizlik İhalesi",
        year: 2025,
        amount: 120_000_000,
        category: "Hizmet Alımı",
        city: "Ankara",
        result: "won",
      },
      {
        tenderId: "",
        tenderTitle: "Bursa Kent Temizliği",
        year: 2024,
        amount: 85_000_000,
        category: "Hizmet Alımı",
        city: "Bursa",
        result: "lost",
      },
    ],
    experienceCertificates: [
      {
        title: "İş Deneyim Belgesi - Ankara Temizlik",
        issuer: "Ankara Büyükşehir Belediyesi",
        year: 2025,
        amount: 120_000_000,
      },
      {
        title: "ISO 14001 Çevre Yönetimi",
        issuer: "TSE",
        year: 2024,
        amount: 0,
      },
    ],
    sectorMarketShare: [
      { sector: "Hizmet Alımı", share: 7.2 },
      { sector: "Eğitim", share: 4.5 },
    ],
    rating: 3.9,
  },
];

/** Sector-wide market share data for pie chart */
export const sectorMarketData: Record<
  string,
  { company: string; share: number; color: string }[]
> = {
  "Yapım İşleri": [
    { company: "Anadolu İnşaat A.Ş.", share: 8.2, color: "#1a56db" },
    { company: "Ege Yapı Mühendislik A.Ş.", share: 4.5, color: "#3b82f6" },
    { company: "Karadeniz Enerji A.Ş.", share: 3.1, color: "#60a5fa" },
    { company: "Limak İnşaat", share: 11.3, color: "#93c5fd" },
    { company: "Kalyon İnşaat", share: 9.8, color: "#bfdbfe" },
    { company: "Diğer", share: 63.1, color: "#e2e8f0" },
  ],
  Bilişim: [
    { company: "Başkent Teknoloji Ltd.", share: 5.8, color: "#1a56db" },
    { company: "HAVELSAN", share: 15.2, color: "#3b82f6" },
    { company: "TÜBİTAK BİLGEM", share: 12.4, color: "#60a5fa" },
    { company: "STM Savunma", share: 8.9, color: "#93c5fd" },
    { company: "Diğer", share: 57.7, color: "#e2e8f0" },
  ],
  "Hizmet Alımı": [
    { company: "Marmara Hizmet Grubu", share: 7.2, color: "#1a56db" },
    { company: "Ege Yapı Mühendislik", share: 6.1, color: "#3b82f6" },
    { company: "Kolin İnşaat", share: 5.4, color: "#60a5fa" },
    { company: "ISS Tesis Yönetimi", share: 8.8, color: "#93c5fd" },
    { company: "Diğer", share: 72.5, color: "#e2e8f0" },
  ],
  Sağlık: [
    { company: "Güney Medikal", share: 9.3, color: "#1a56db" },
    { company: "Siemens Healthineers", share: 14.5, color: "#3b82f6" },
    { company: "GE Healthcare", share: 12.1, color: "#60a5fa" },
    { company: "Philips Sağlık", share: 10.2, color: "#93c5fd" },
    { company: "Diğer", share: 53.9, color: "#e2e8f0" },
  ],
  Danışmanlık: [
    { company: "Karadeniz Enerji", share: 7.8, color: "#1a56db" },
    { company: "Başkent Teknoloji", share: 3.2, color: "#3b82f6" },
    { company: "AECOM Türkiye", share: 11.5, color: "#60a5fa" },
    { company: "WSP Türkiye", share: 8.7, color: "#93c5fd" },
    { company: "Diğer", share: 68.8, color: "#e2e8f0" },
  ],
};

/** Which companies might bid on a tender, based on sector + city + budget match */
export function predictBidders(
  category: string,
  city: string,
  budgetValue: number
): Company[] {
  return companies.filter((c) => {
    const sectorMatch = c.sectors.some(
      (s) => s.toLowerCase() === category.toLowerCase()
    );
    const hasCapacity = c.totalTenderAmount >= budgetValue * 0.3;
    const cityOrNational =
      c.city === city ||
      c.tenderHistory.some((h) => h.city === city) ||
      c.wonTenderCount > 20;
    return sectorMatch && hasCapacity && cityOrNational;
  });
}
