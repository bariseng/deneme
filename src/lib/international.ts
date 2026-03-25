import { prisma } from "@/lib/prisma";
import { IntTenderStatus } from "@/generated/prisma/client";

// ─── MOCK EXCHANGE RATES ────────────────────────────────────

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 38.50,
  EUR: 41.20,
  GBP: 48.90,
  GEL: 13.50,  // Georgian Lari
  AZN: 22.65,  // Azerbaijani Manat
  KZT: 0.078,  // Kazakhstani Tenge
  QAR: 10.58,  // Qatari Riyal
  SAR: 10.27,  // Saudi Riyal
  LYD: 7.92,   // Libyan Dinar
  TMT: 11.00,  // Turkmen Manat
  RUB: 0.42,   // Russian Ruble
  AED: 10.48,  // UAE Dirham
};

export function convertToTRY(amount: number, currency: string): number {
  const rate = EXCHANGE_RATES[currency] || 1;
  return amount * rate;
}

export function formatCurrency(amount: number, currency: string): string {
  if (currency === "TRY") return `${amount.toLocaleString("tr-TR")} ₺`;
  const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", SAR: "﷼", QAR: "﷼" };
  const sym = symbols[currency] || currency;
  return `${sym} ${amount.toLocaleString("en-US")}`;
}

// ─── TRANSLATE (mock AI) ────────────────────────────────────

export function translateToTurkish(text: string): string {
  // Mock — in production would call AI API
  return text; // Already Turkish in seed data
}

// ─── QUERIES ────────────────────────────────────────────────

export async function getInternationalTenders(filters: {
  country?: string;
  sector?: string;
  status?: string;
  minBudget?: number;
  maxBudget?: number;
  page?: number;
  limit?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters.country) where.country = filters.country;
  if (filters.sector) where.sector = filters.sector;
  if (filters.status) where.status = filters.status as IntTenderStatus;
  if (filters.minBudget || filters.maxBudget) {
    where.estimatedBudget = {};
    if (filters.minBudget) (where.estimatedBudget as Record<string, unknown>).gte = filters.minBudget;
    if (filters.maxBudget) (where.estimatedBudget as Record<string, unknown>).lte = filters.maxBudget;
  }

  const page = filters.page || 1;
  const limit = filters.limit || 20;

  const [items, total] = await Promise.all([
    prisma.internationalTender.findMany({
      where,
      orderBy: { applicationDeadline: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.internationalTender.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getInternationalTenderById(id: string) {
  return prisma.internationalTender.findUnique({ where: { id } });
}

export async function getCountryProfiles() {
  return prisma.countryProfile.findMany({
    include: { riskIndicators: true },
    orderBy: { riskScore: "desc" },
  });
}

export async function getCountryByCode(code: string) {
  return prisma.countryProfile.findUnique({
    where: { countryCode: code },
    include: { riskIndicators: true },
  });
}

export async function getCountryTenderCount(country: string) {
  return prisma.internationalTender.count({
    where: { country, status: "OPEN" },
  });
}

// ─── SEED DATA ──────────────────────────────────────────────

const COUNTRIES_SEED = [
  {
    countryCode: "GE", name: "Georgia", nameTr: "Gürcistan", riskScore: 72,
    paymentReliability: "Orta-İyi", currency: "GEL", timezone: "UTC+4",
    flagUrl: "https://flagcdn.com/w80/ge.png",
    legalFramework: "Gürcistan kamu ihale mevzuatı AB standartlarına yakınlaştırılmıştır. Elektronik ihale sistemi (SPA) üzerinden başvurular yapılır. Yabancı firmalara eşit muamele ilkesi uygulanır.",
    visaRequirements: "Türk vatandaşları 1 yıla kadar vizesiz kalabilir. Çalışma izni ayrıca alınmalıdır.",
    indicators: { political_stability: 65, payment_risk: 35, currency_risk: 40, legal_risk: 30, security_risk: 25 },
  },
  {
    countryCode: "AZ", name: "Azerbaijan", nameTr: "Azerbaycan", riskScore: 68,
    paymentReliability: "İyi", currency: "AZN", timezone: "UTC+4",
    flagUrl: "https://flagcdn.com/w80/az.png",
    legalFramework: "SOFAZ (Devlet Petrol Fonu) projeleri uluslararası ihale ile gerçekleştirilir. Türk firmaları tercih edilmektedir.",
    visaRequirements: "Türk vatandaşları 90 güne kadar vizesiz. ASAN vize sistemi mevcuttur.",
    indicators: { political_stability: 55, payment_risk: 30, currency_risk: 35, legal_risk: 40, security_risk: 30 },
  },
  {
    countryCode: "KZ", name: "Kazakhstan", nameTr: "Kazakistan", riskScore: 70,
    paymentReliability: "İyi", currency: "KZT", timezone: "UTC+6",
    flagUrl: "https://flagcdn.com/w80/kz.png",
    legalFramework: "Samruk-Kazyna fonuna bağlı projeler özel ihale usulüne tabidir. Yerel ortaklık gereksinimi bulunabilir.",
    visaRequirements: "Türk vatandaşları 30 güne kadar vizesiz. Uzun süreli kalışlar için vize gerekir.",
    indicators: { political_stability: 60, payment_risk: 25, currency_risk: 45, legal_risk: 35, security_risk: 30 },
  },
  {
    countryCode: "QA", name: "Qatar", nameTr: "Katar", riskScore: 85,
    paymentReliability: "Çok İyi", currency: "QAR", timezone: "UTC+3",
    flagUrl: "https://flagcdn.com/w80/qa.png",
    legalFramework: "Kamu ihaleleri Merkezi İhale Komitesi tarafından yönetilir. FIFA 2022 sonrası altyapı projeleri devam etmektedir.",
    visaRequirements: "Türk vatandaşlarına havalimanında vize verilir. Çalışma vizesi sponsor gerektirir.",
    indicators: { political_stability: 80, payment_risk: 10, currency_risk: 15, legal_risk: 25, security_risk: 15 },
  },
  {
    countryCode: "SA", name: "Saudi Arabia", nameTr: "Suudi Arabistan", riskScore: 82,
    paymentReliability: "Çok İyi", currency: "SAR", timezone: "UTC+3",
    flagUrl: "https://flagcdn.com/w80/sa.png",
    legalFramework: "Vision 2030 kapsamında mega projeler (NEOM, The Line). Etimad portalı üzerinden elektronik ihale yapılır.",
    visaRequirements: "İş vizesi sponsor firma aracılığıyla alınır. e-Vize sistemi mevcuttur.",
    indicators: { political_stability: 70, payment_risk: 15, currency_risk: 10, legal_risk: 30, security_risk: 25 },
  },
  {
    countryCode: "LY", name: "Libya", nameTr: "Libya", riskScore: 35,
    paymentReliability: "Düşük", currency: "LYD", timezone: "UTC+2",
    flagUrl: "https://flagcdn.com/w80/ly.png",
    legalFramework: "Siyasi istikrarsızlık nedeniyle ihale süreçleri düzensizdir. Uluslararası kuruluşlar aracılığıyla projeler yürütülür.",
    visaRequirements: "Vize zorunlu. Güvenlik durumu nedeniyle seyahat uyarıları mevcuttur.",
    indicators: { political_stability: 20, payment_risk: 70, currency_risk: 60, legal_risk: 75, security_risk: 80 },
  },
  {
    countryCode: "TM", name: "Turkmenistan", nameTr: "Türkmenistan", riskScore: 55,
    paymentReliability: "Orta", currency: "TMT", timezone: "UTC+5",
    flagUrl: "https://flagcdn.com/w80/tm.png",
    legalFramework: "Devlet ihaleleri doğrudan hükümet kurumları tarafından yönetilir. Türk firmaları uzun süredir aktiftir.",
    visaRequirements: "Vize zorunlu. Davet mektubu gereklidir. Çalışma izni ayrıca alınır.",
    indicators: { political_stability: 45, payment_risk: 55, currency_risk: 65, legal_risk: 50, security_risk: 35 },
  },
  {
    countryCode: "IQ", name: "Iraq", nameTr: "Irak", riskScore: 42,
    paymentReliability: "Düşük-Orta", currency: "USD", timezone: "UTC+3",
    flagUrl: "https://flagcdn.com/w80/iq.png",
    legalFramework: "KBR ve uluslararası kuruluşlar aracılığıyla büyük altyapı projeleri. Erbil bölgesi daha stabil.",
    visaRequirements: "Havalimanında vize alınabilir. Güvenlik durumu bölgeye göre değişir.",
    indicators: { political_stability: 30, payment_risk: 55, currency_risk: 40, legal_risk: 60, security_risk: 70 },
  },
  {
    countryCode: "UZ", name: "Uzbekistan", nameTr: "Özbekistan", riskScore: 62,
    paymentReliability: "Orta", currency: "USD", timezone: "UTC+5",
    flagUrl: "https://flagcdn.com/w80/uz.png",
    legalFramework: "Ekonomik reform süreci ile yabancı yatırıma açılma politikası. E-ihale sistemi geliştirilmektedir.",
    visaRequirements: "Türk vatandaşları 30 güne kadar vizesiz. e-Vize sistemi mevcuttur.",
    indicators: { political_stability: 55, payment_risk: 40, currency_risk: 45, legal_risk: 45, security_risk: 30 },
  },
  {
    countryCode: "AE", name: "United Arab Emirates", nameTr: "Birleşik Arap Emirlikleri", riskScore: 90,
    paymentReliability: "Çok İyi", currency: "AED", timezone: "UTC+4",
    flagUrl: "https://flagcdn.com/w80/ae.png",
    legalFramework: "Dubai ve Abu Dhabi emirlikleri ayrı ihale sistemlerine sahiptir. Serbest bölgelerde farklı kurallar geçerlidir.",
    visaRequirements: "Türk vatandaşları 30 güne kadar vizesiz. Çalışma vizesi sponsor gerektirir.",
    indicators: { political_stability: 85, payment_risk: 10, currency_risk: 10, legal_risk: 20, security_risk: 10 },
  },
];

const TENDERS_SEED = [
  { title: "Tbilisi-Kutaisi Highway Expansion Project", titleTr: "Tiflis-Kutaisi Otoyol Genişletme Projesi", country: "GE", city: "Tbilisi", sector: "YAPIM", budget: 45000000, currency: "USD", platform: "SPA Georgia", deadline: 30, desc: "4 şeritli otoyol genişletme, 120 km, köprü ve tünel dahil.", descTr: "Tiflis-Kutaisi arası 120 km otoyolun 4 şeride genişletilmesi. 3 köprü ve 1 tünel inşaatı dahildir." },
  { title: "Baku Metro Line 4 Construction", titleTr: "Bakü Metro Hattı 4 İnşaatı", country: "AZ", city: "Baku", sector: "YAPIM", budget: 120000000, currency: "USD", platform: "SOFAZ Portal", deadline: 45, desc: "Yeni metro hattı, 8 istasyon, 15 km.", descTr: "Bakü'de 4. metro hattının inşası. 15 km güzergah üzerinde 8 istasyon." },
  { title: "Astana Smart City Infrastructure", titleTr: "Astana Akıllı Şehir Altyapısı", country: "KZ", city: "Astana", sector: "HIZMET", budget: 35000000, currency: "USD", platform: "Samruk-Kazyna", deadline: 60, desc: "IoT altyapısı, akıllı trafik sistemi, dijital belediye hizmetleri.", descTr: "Astana genelinde IoT sensör ağı, akıllı trafik yönetim sistemi ve dijital belediye hizmetleri altyapısı kurulumu." },
  { title: "Lusail City Residential Complex Phase 3", titleTr: "Lusail Konut Kompleksi 3. Faz", country: "QA", city: "Lusail", sector: "YAPIM", budget: 250000000, currency: "QAR", platform: "Ashghal Portal", deadline: 35, desc: "3000 konut, ticari alan, park ve altyapı.", descTr: "Lusail şehrinde 3000 konutluk kompleks, ticari alanlar, yeşil alanlar ve altyapı inşaatı." },
  { title: "NEOM Bay Industrial Zone", titleTr: "NEOM Körfez Endüstri Bölgesi", country: "SA", city: "NEOM", sector: "YAPIM", budget: 500000000, currency: "SAR", platform: "Etimad", deadline: 90, desc: "Endüstriyel üretim tesisleri, lojistik merkez, liman altyapısı.", descTr: "NEOM projesinin endüstri bölgesinde üretim tesisleri, lojistik merkez ve liman altyapısı inşaatı." },
  { title: "Riyadh Metro Station Fit-Out", titleTr: "Riyad Metro İstasyon İç Donanımı", country: "SA", city: "Riyadh", sector: "YAPIM", budget: 80000000, currency: "SAR", platform: "Etimad", deadline: 40, desc: "Metro istasyonları iç mekan tasarımı ve donanımı.", descTr: "Riyad metrosu 12 istasyonunun iç mekan tasarımı, havalandırma ve güvenlik sistemleri kurulumu." },
  { title: "Tripoli Airport Rehabilitation", titleTr: "Trablus Havalimanı Rehabilitasyonu", country: "LY", city: "Tripoli", sector: "YAPIM", budget: 65000000, currency: "USD", platform: "UN Procurement", deadline: 75, desc: "Havalimanı terminal yenileme ve pist onarımı.", descTr: "Trablus Uluslararası Havalimanı terminal binası yenileme, pist onarımı ve navigasyon sistemleri güncelleme projesi." },
  { title: "Ashgabat Olympic Complex Maintenance", titleTr: "Aşkabat Olimpik Kompleks Bakımı", country: "TM", city: "Ashgabat", sector: "HIZMET", budget: 15000000, currency: "USD", platform: "Turkmen Govt", deadline: 25, desc: "Olimpik tesis bakım ve işletme hizmetleri.", descTr: "Aşkabat Olimpik Kompleksi'nin 5 yıllık bakım, onarım ve işletme hizmet alımı." },
  { title: "Erbil International Trade Center", titleTr: "Erbil Uluslararası Ticaret Merkezi", country: "IQ", city: "Erbil", sector: "YAPIM", budget: 95000000, currency: "USD", platform: "KRG Procurement", deadline: 55, desc: "Uluslararası ticaret ve fuar merkezi inşaatı.", descTr: "Erbil'de 50.000 m2 kapalı alana sahip uluslararası ticaret ve fuar merkezi inşaatı." },
  { title: "Tashkent Water Treatment Plant", titleTr: "Taşkent Su Arıtma Tesisi", country: "UZ", city: "Tashkent", sector: "YAPIM", budget: 42000000, currency: "USD", platform: "EBRD Procurement", deadline: 65, desc: "Günlük 200.000 m3 kapasiteli su arıtma tesisi.", descTr: "Taşkent şehri için günlük 200.000 m3 kapasiteli modern su arıtma tesisi inşaatı." },
  { title: "Dubai Creek Harbour Infrastructure", titleTr: "Dubai Creek Harbour Altyapısı", country: "AE", city: "Dubai", sector: "YAPIM", budget: 180000000, currency: "AED", platform: "Dubai Govt", deadline: 50, desc: "Altyapı, yol, kanalizasyon ve peyzaj işleri.", descTr: "Dubai Creek Harbour projesinin altyapı, yol şebekesi, kanalizasyon ve peyzaj düzenleme işleri." },
  { title: "Abu Dhabi Solar Farm Phase 2", titleTr: "Abu Dabi Güneş Enerjisi Çiftliği 2. Faz", country: "AE", city: "Abu Dhabi", sector: "MAL_ALIMI", budget: 220000000, currency: "AED", platform: "ADNOC Portal", deadline: 70, desc: "500 MW güneş enerjisi santrali.", descTr: "Abu Dabi'de 500 MW kapasiteli güneş enerjisi santrali kurulumu. Panel tedarik ve montaj dahil." },
  { title: "Batumi Coastal Development", titleTr: "Batum Kıyı Geliştirme Projesi", country: "GE", city: "Batumi", sector: "YAPIM", budget: 28000000, currency: "USD", platform: "SPA Georgia", deadline: 40, desc: "Sahil şeridi düzenleme ve turizm altyapısı.", descTr: "Batum sahil şeridi düzenleme, yürüyüş yolu, bisiklet yolu ve turizm altyapısı projesi." },
  { title: "Kazakhstan Renewable Energy Hub", titleTr: "Kazakistan Yenilenebilir Enerji Merkezi", country: "KZ", city: "Almaty", sector: "YAPIM", budget: 75000000, currency: "USD", platform: "Samruk-Kazyna", deadline: 80, desc: "Rüzgar + güneş hibrit enerji tesisi.", descTr: "Almatı yakınlarında 200 MW rüzgar + 100 MW güneş hibrit enerji tesisi kurulumu." },
  { title: "Qatar Education City Expansion", titleTr: "Katar Eğitim Şehri Genişletme", country: "QA", city: "Doha", sector: "YAPIM", budget: 150000000, currency: "QAR", platform: "QF Procurement", deadline: 55, desc: "Yeni fakülte binaları ve laboratuvar kompleksi.", descTr: "Education City'de 4 yeni fakülte binası ve araştırma laboratuvarı kompleksi inşaatı." },
  { title: "Baku Water Supply Modernization", titleTr: "Bakü Su Şebekesi Modernizasyonu", country: "AZ", city: "Baku", sector: "YAPIM", budget: 55000000, currency: "USD", platform: "ADB Procurement", deadline: 60, desc: "Şehir su şebekesi yenileme.", descTr: "Bakü merkez ilçelerinde su şebekesi yenileme, pompa istasyonları ve SCADA sistemi kurulumu." },
  { title: "Misrata Port Expansion", titleTr: "Misrata Limanı Genişletme", country: "LY", city: "Misrata", sector: "YAPIM", budget: 85000000, currency: "USD", platform: "World Bank", deadline: 90, desc: "Liman genişletme ve konteyner terminali.", descTr: "Misrata limanı genişletme, yeni konteyner terminali ve liman vinçleri tedarik/kurulum projesi." },
  { title: "Turkmenistan Gas Pipeline Maintenance", titleTr: "Türkmenistan Gaz Boru Hattı Bakımı", country: "TM", city: "Mary", sector: "HIZMET", budget: 22000000, currency: "USD", platform: "Turkmengaz", deadline: 35, desc: "500 km gaz boru hattı bakım ve onarım.", descTr: "Mary-Aşkabat arası 500 km doğalgaz boru hattının bakım, onarım ve modernizasyon hizmetleri." },
  { title: "Basra Hospital Complex", titleTr: "Basra Hastane Kompleksi", country: "IQ", city: "Basra", sector: "YAPIM", budget: 110000000, currency: "USD", platform: "Iraq MOH", deadline: 85, desc: "500 yataklı hastane ve sağlık kampüsü.", descTr: "Basra'da 500 yataklı modern hastane, poliklinik ve sağlık kampüsü inşaatı." },
  { title: "Samarkand Tourism Infrastructure", titleTr: "Semerkant Turizm Altyapısı", country: "UZ", city: "Samarkand", sector: "YAPIM", budget: 30000000, currency: "USD", platform: "UZ Tourism Board", deadline: 45, desc: "Tarihi bölge çevre düzenlemesi ve otel.", descTr: "Semerkant tarihi bölgesi çevre düzenlemesi, turist yürüyüş yolları ve 200 odalı otel inşaatı." },
  { title: "Sharjah Industrial Zone Phase 4", titleTr: "Şarja Endüstri Bölgesi 4. Faz", country: "AE", city: "Sharjah", sector: "YAPIM", budget: 95000000, currency: "AED", platform: "Sharjah Govt", deadline: 60, desc: "Sanayi tesisleri ve lojistik altyapı.", descTr: "Şarja'da 200.000 m2 sanayi tesisi alanı, depolama ve lojistik altyapı inşaatı." },
  { title: "Jeddah Desalination Plant", titleTr: "Cidde Deniz Suyu Arıtma Tesisi", country: "SA", city: "Jeddah", sector: "YAPIM", budget: 300000000, currency: "SAR", platform: "Etimad", deadline: 100, desc: "Günlük 500.000 m3 kapasiteli arıtma tesisi.", descTr: "Cidde'de günlük 500.000 m3 kapasiteli ters ozmoz deniz suyu arıtma tesisi inşaatı." },
  { title: "Ganja Road Network Rehabilitation", titleTr: "Gence Yol Ağı Rehabilitasyonu", country: "AZ", city: "Ganja", sector: "YAPIM", budget: 32000000, currency: "USD", platform: "AzerRoadService", deadline: 50, desc: "Şehir içi yol ağı yenileme.", descTr: "Gence şehir merkezi 85 km yol ağı rehabilitasyonu, kaldırım, aydınlatma ve trafik sinyalizasyonu." },
  { title: "Doha Metro Green Line Extension", titleTr: "Doha Metro Yeşil Hat Uzatma", country: "QA", city: "Doha", sector: "YAPIM", budget: 180000000, currency: "QAR", platform: "Qatar Rail", deadline: 70, desc: "Metro hattı uzatma ve yeni istasyonlar.", descTr: "Doha metrosu yeşil hattının 8 km uzatılması ve 4 yeni istasyon inşaatı." },
  { title: "Batumi International School Campus", titleTr: "Batum Uluslararası Okul Kampüsü", country: "GE", city: "Batumi", sector: "YAPIM", budget: 18000000, currency: "USD", platform: "SPA Georgia", deadline: 35, desc: "K-12 uluslararası okul kampüsü.", descTr: "Batum'da 1000 öğrenci kapasiteli K-12 uluslararası okul kampüsü inşaatı." },
  { title: "Astana Convention Center", titleTr: "Astana Kongre Merkezi", country: "KZ", city: "Astana", sector: "YAPIM", budget: 60000000, currency: "USD", platform: "Samruk-Kazyna", deadline: 55, desc: "5000 kişilik kongre ve fuar merkezi.", descTr: "Astana'da 5000 kişi kapasiteli modern kongre ve fuar merkezi inşaatı." },
  { title: "Turkmenistan Textile Factory", titleTr: "Türkmenistan Tekstil Fabrikası", country: "TM", city: "Turkmenabat", sector: "YAPIM", budget: 40000000, currency: "USD", platform: "Turkmen Govt", deadline: 65, desc: "Modern tekstil üretim tesisi.", descTr: "Türkmenabat'ta yıllık 10.000 ton kapasiteli modern tekstil üretim tesisi inşaatı." },
  { title: "Uzbekistan Railway Modernization", titleTr: "Özbekistan Demiryolu Modernizasyonu", country: "UZ", city: "Tashkent", sector: "YAPIM", budget: 200000000, currency: "USD", platform: "ADB Procurement", deadline: 95, desc: "300 km demiryolu hattı modernizasyonu.", descTr: "Taşkent-Semerkant arası 300 km demiryolu hattının modernizasyonu, sinyalizasyon ve elektrifikasyon." },
  { title: "Libya Coastal Road Repair", titleTr: "Libya Sahil Yolu Onarımı", country: "LY", city: "Tripoli", sector: "YAPIM", budget: 45000000, currency: "USD", platform: "World Bank", deadline: 80, desc: "200 km sahil yolu onarım ve iyileştirme.", descTr: "Trablus-Misrata arası 200 km sahil yolunun onarımı, asfalt yenileme ve güvenlik bariyerleri." },
  { title: "Erbil Smart Grid Implementation", titleTr: "Erbil Akıllı Şebeke Kurulumu", country: "IQ", city: "Erbil", sector: "HIZMET", budget: 38000000, currency: "USD", platform: "KRG Energy", deadline: 50, desc: "Akıllı elektrik şebekesi kurulumu.", descTr: "Erbil şehrinde akıllı elektrik sayaçları, SCADA sistemi ve şebeke otomasyon altyapısı kurulumu." },
  { title: "Medina Heritage Restoration", titleTr: "Medine Tarihi Restorasyon", country: "SA", city: "Medina", sector: "YAPIM", budget: 120000000, currency: "SAR", platform: "Etimad", deadline: 75, desc: "Tarihi yapı restorasyon ve çevre düzenlemesi.", descTr: "Medine tarihi bölgesinde 15 yapının restorasyonu, çevre düzenlemesi ve ziyaretçi altyapısı." },
];

export async function seedInternationalData() {
  const countryCount = await prisma.countryProfile.count();
  if (countryCount > 0) return { countries: 0, tenders: 0 };

  // Seed countries
  for (const c of COUNTRIES_SEED) {
    const { indicators, ...data } = c;
    const country = await prisma.countryProfile.create({ data });
    // Seed risk indicators
    for (const [indicator, value] of Object.entries(indicators)) {
      await prisma.countryRiskIndicator.create({
        data: { countryId: country.id, indicator, value },
      });
    }
  }

  // Seed tenders
  const now = new Date();
  for (const t of TENDERS_SEED) {
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + t.deadline);

    await prisma.internationalTender.create({
      data: {
        title: t.title,
        titleTr: t.titleTr,
        country: t.country,
        city: t.city,
        sector: t.sector,
        estimatedBudget: t.budget,
        currency: t.currency,
        description: t.desc,
        descriptionTr: t.descTr,
        applicationDeadline: deadline,
        sourceUrl: `https://procurement.example.com/${t.country.toLowerCase()}/${Date.now()}`,
        sourcePlatform: t.platform,
        status: t.deadline < 30 ? "CLOSING_SOON" : "OPEN",
      },
    });
  }

  return { countries: COUNTRIES_SEED.length, tenders: TENDERS_SEED.length };
}

// ─── CONSTANTS ──────────────────────────────────────────────

export const SECTORS = [
  { value: "YAPIM", label: "Yapım İşleri" },
  { value: "HIZMET", label: "Hizmet Alımı" },
  { value: "MAL_ALIMI", label: "Mal Alımı" },
  { value: "DANISMANLIK", label: "Danışmanlık" },
];

export const RISK_INDICATOR_LABELS: Record<string, string> = {
  political_stability: "Siyasi İstikrar",
  payment_risk: "Ödeme Riski",
  currency_risk: "Kur Riski",
  legal_risk: "Hukuki Risk",
  security_risk: "Güvenlik Riski",
};
