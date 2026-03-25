// ─── OKAS → CPV Mapping ─────────────────────────────────────
// OKAS (Ortak Katalog Sistemi): Türkiye'nin 9 haneli kamu alım kodu
// CPV (Common Procurement Vocabulary): AB'nin 8 haneli kamu alım kodu
// Bu tablo uluslararası interoperability için kullanılır.

export interface OkasCpvEntry {
  okasCode: string;
  okasDescription: string;
  cpvCode: string;
  cpvDescription: string;
}

/** Top-level OKAS → CPV mapping (2-digit group level) */
export const OKAS_CPV_MAP: OkasCpvEntry[] = [
  // Yapım İşleri
  { okasCode: "45000000-0", okasDescription: "İnşaat işleri", cpvCode: "45000000-7", cpvDescription: "Construction work" },
  { okasCode: "45100000-1", okasDescription: "Arazi hazırlama", cpvCode: "45100000-8", cpvDescription: "Site preparation work" },
  { okasCode: "45200000-2", okasDescription: "Bina inşaatı", cpvCode: "45200000-9", cpvDescription: "Works for complete buildings" },
  { okasCode: "45300000-3", okasDescription: "Tesisat işleri", cpvCode: "45300000-0", cpvDescription: "Building installation work" },
  { okasCode: "45400000-4", okasDescription: "Bina tamamlama", cpvCode: "45400000-1", cpvDescription: "Building completion work" },
  { okasCode: "45500000-5", okasDescription: "Makine ve ekipman kiralama", cpvCode: "45500000-2", cpvDescription: "Hire of machinery" },

  // Mal Alımları
  { okasCode: "03000000-0", okasDescription: "Tarım ürünleri", cpvCode: "03000000-1", cpvDescription: "Agricultural products" },
  { okasCode: "09000000-0", okasDescription: "Petrol ürünleri, yakıt", cpvCode: "09000000-3", cpvDescription: "Petroleum products, fuel" },
  { okasCode: "15000000-0", okasDescription: "Gıda ürünleri", cpvCode: "15000000-8", cpvDescription: "Food, beverages, tobacco" },
  { okasCode: "22000000-0", okasDescription: "Basılı yayınlar", cpvCode: "22000000-0", cpvDescription: "Printed matter" },
  { okasCode: "30000000-0", okasDescription: "Büro makineleri", cpvCode: "30000000-9", cpvDescription: "Office machinery" },
  { okasCode: "31000000-0", okasDescription: "Elektrik makineleri", cpvCode: "31000000-6", cpvDescription: "Electrical machinery" },
  { okasCode: "33000000-0", okasDescription: "Tıbbi cihazlar", cpvCode: "33000000-0", cpvDescription: "Medical equipment" },
  { okasCode: "34000000-0", okasDescription: "Taşıma ekipmanı", cpvCode: "34000000-7", cpvDescription: "Transport equipment" },
  { okasCode: "39000000-0", okasDescription: "Mobilya", cpvCode: "39000000-2", cpvDescription: "Furniture" },
  { okasCode: "42000000-0", okasDescription: "Sanayi makineleri", cpvCode: "42000000-6", cpvDescription: "Industrial machinery" },
  { okasCode: "44000000-0", okasDescription: "Yapı malzemeleri", cpvCode: "44000000-0", cpvDescription: "Construction materials" },
  { okasCode: "48000000-0", okasDescription: "Yazılım paketleri", cpvCode: "48000000-8", cpvDescription: "Software package" },

  // Hizmet Alımları
  { okasCode: "50000000-0", okasDescription: "Bakım onarım hizmetleri", cpvCode: "50000000-5", cpvDescription: "Repair and maintenance" },
  { okasCode: "55000000-0", okasDescription: "Otelcilik ve yemek hizmetleri", cpvCode: "55000000-0", cpvDescription: "Hotel, restaurant services" },
  { okasCode: "60000000-0", okasDescription: "Ulaştırma hizmetleri", cpvCode: "60000000-8", cpvDescription: "Transport services" },
  { okasCode: "63000000-0", okasDescription: "Destek taşımacılık hizmetleri", cpvCode: "63000000-9", cpvDescription: "Supporting transport" },
  { okasCode: "64000000-0", okasDescription: "Posta ve telekomünikasyon", cpvCode: "64000000-6", cpvDescription: "Postal and telecom" },
  { okasCode: "66000000-0", okasDescription: "Finansal hizmetler", cpvCode: "66000000-0", cpvDescription: "Financial services" },
  { okasCode: "71000000-0", okasDescription: "Mimarlık ve mühendislik", cpvCode: "71000000-8", cpvDescription: "Architectural services" },
  { okasCode: "72000000-0", okasDescription: "BT hizmetleri", cpvCode: "72000000-5", cpvDescription: "IT services" },
  { okasCode: "77000000-0", okasDescription: "Tarımsal hizmetler", cpvCode: "77000000-0", cpvDescription: "Agricultural services" },
  { okasCode: "79000000-0", okasDescription: "İş hizmetleri", cpvCode: "79000000-4", cpvDescription: "Business services" },
  { okasCode: "85000000-0", okasDescription: "Sağlık hizmetleri", cpvCode: "85000000-9", cpvDescription: "Health services" },
  { okasCode: "90000000-0", okasDescription: "Çevre hizmetleri", cpvCode: "90000000-7", cpvDescription: "Sewage, refuse services" },
  { okasCode: "92000000-0", okasDescription: "Eğlence ve spor", cpvCode: "92000000-1", cpvDescription: "Recreational services" },
  { okasCode: "98000000-0", okasDescription: "Diğer hizmetler", cpvCode: "98000000-3", cpvDescription: "Other community services" },

  // Danışmanlık
  { okasCode: "73000000-0", okasDescription: "Ar-Ge hizmetleri", cpvCode: "73000000-2", cpvDescription: "R&D services" },
];

/** Look up CPV code from OKAS code (matches first 2 digits) */
export function okasToCpv(okasCode: string): OkasCpvEntry | null {
  // Try exact match first
  const exact = OKAS_CPV_MAP.find((e) => e.okasCode === okasCode);
  if (exact) return exact;

  // Try group-level match (first 2 digits)
  const prefix = okasCode.slice(0, 2);
  return OKAS_CPV_MAP.find((e) => e.okasCode.startsWith(prefix)) ?? null;
}

/** Convert list of OKAS codes to CPV codes */
export function okasListToCpv(okasCodes: string[]): OkasCpvEntry[] {
  return okasCodes
    .map(okasToCpv)
    .filter((entry): entry is OkasCpvEntry => entry !== null);
}
