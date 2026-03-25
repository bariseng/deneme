import { PrismaClient } from "../src/generated/prisma";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed verileri oluşturuluyor...");

  // ─── Firmalar ───
  const company1 = await prisma.company.upsert({
    where: { taxNumber: "1234567890" },
    update: {},
    create: {
      name: "Anadolu İnşaat A.Ş.",
      taxNumber: "1234567890",
      taxOffice: "Ankara Vergi Dairesi",
      address: "Kızılay Mah. Atatürk Blv. No:45, Çankaya",
      city: "Ankara",
      phone: "0312 425 00 00",
      email: "info@anadoluinsaat.com.tr",
      website: "https://anadoluinsaat.com.tr",
      sector: "Yapım İşleri",
      description: "1985 yılından beri altyapı ve üstyapı projeleri yürüten köklü inşaat firması.",
      foundedYear: 1985,
      employeeCount: 450,
    },
  });

  const company2 = await prisma.company.upsert({
    where: { taxNumber: "9876543210" },
    update: {},
    create: {
      name: "TeknoSoft Bilişim Ltd. Şti.",
      taxNumber: "9876543210",
      taxOffice: "İstanbul Vergi Dairesi",
      address: "Maslak Mah. AOS 55. Sok. No:2, Sarıyer",
      city: "İstanbul",
      phone: "0212 345 67 89",
      email: "info@teknosoft.com.tr",
      website: "https://teknosoft.com.tr",
      sector: "Bilişim ve Teknoloji",
      description: "Kamu kurumlarına yazılım ve IT altyapı hizmetleri sunan teknoloji şirketi.",
      foundedYear: 2005,
      employeeCount: 120,
    },
  });

  // ─── Kullanıcılar ───
  const adminPass = await bcryptjs.hash("admin12345", 12);
  const premiumPass = await bcryptjs.hash("premium123", 12);
  const userPass = await bcryptjs.hash("user12345", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ihalepro.com" },
    update: {},
    create: {
      name: "Ahmet Yılmaz",
      email: "admin@ihalepro.com",
      password: adminPass,
      phone: "0532 100 00 01",
      role: "ADMIN",
      plan: "ENTERPRISE",
      companyId: company1.id,
    },
  });

  const premiumUser = await prisma.user.upsert({
    where: { email: "premium@ihalepro.com" },
    update: {},
    create: {
      name: "Mehmet Demir",
      email: "premium@ihalepro.com",
      password: premiumPass,
      phone: "0533 200 00 02",
      role: "PREMIUM",
      plan: "PRO",
      companyId: company2.id,
    },
  });

  const normalUser = await prisma.user.upsert({
    where: { email: "kullanici@ihalepro.com" },
    update: {},
    create: {
      name: "Ayşe Kaya",
      email: "kullanici@ihalepro.com",
      password: userPass,
      phone: "0534 300 00 03",
      role: "USER",
      plan: "FREE",
    },
  });

  // ─── İhale Verileri ───
  const cities = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Gaziantep", "Konya", "Adana", "Kayseri", "Trabzon", "Eskişehir", "Samsun", "Diyarbakır", "Mersin", "Denizli"];
  const types: ("YAPIM" | "MAL_ALIMI" | "HIZMET" | "DANISMANLIK")[] = ["YAPIM", "MAL_ALIMI", "HIZMET", "DANISMANLIK"];
  const statuses: ("BASVURU_ACIK" | "DEGERLENDIRME" | "SONUCLANDI" | "YAKLASAN")[] = ["BASVURU_ACIK", "DEGERLENDIRME", "SONUCLANDI", "YAKLASAN"];

  const institutions = [
    "T.C. Ulaştırma ve Altyapı Bakanlığı",
    "T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı",
    "T.C. Sağlık Bakanlığı",
    "T.C. Milli Eğitim Bakanlığı",
    "Ankara Büyükşehir Belediyesi",
    "İstanbul Büyükşehir Belediyesi",
    "İzmir Büyükşehir Belediyesi",
    "Bursa Büyükşehir Belediyesi",
    "DSİ Genel Müdürlüğü",
    "Karayolları Genel Müdürlüğü",
    "THY Teknik A.Ş.",
    "TCDD Taşımacılık A.Ş.",
    "Türk Telekom",
    "TEİAŞ Genel Müdürlüğü",
    "İller Bankası A.Ş.",
  ];

  const tenderTitles = [
    { t: "Ankara-Sivas YHT Hattı 2. Etap Yapım İşi", type: "YAPIM" as const },
    { t: "İstanbul Havalimanı 3. Pist İnşaat İhalesi", type: "YAPIM" as const },
    { t: "Bilgi Teknolojileri Altyapı Yenileme Projesi", type: "HIZMET" as const },
    { t: "Hastane Tıbbi Cihaz Alım İhalesi", type: "MAL_ALIMI" as const },
    { t: "Okul Onarım ve Güçlendirme Yapım İşi", type: "YAPIM" as const },
    { t: "Kent İçi Ulaşım Master Planı Danışmanlık Hizmeti", type: "DANISMANLIK" as const },
    { t: "İçmesuyu Arıtma Tesisi Yapım İşi", type: "YAPIM" as const },
    { t: "Doğalgaz Dağıtım Şebekesi Genişletme İhalesi", type: "YAPIM" as const },
    { t: "E-Devlet Entegrasyon Yazılım Geliştirme", type: "HIZMET" as const },
    { t: "Güneş Enerjisi Santrali Kurulum İhalesi", type: "YAPIM" as const },
    { t: "Belediye Hizmet Binası Yapım İşi", type: "YAPIM" as const },
    { t: "Kamu Binası Güvenlik Sistemi Alım İhalesi", type: "MAL_ALIMI" as const },
    { t: "Otoyol Bakım ve Onarım Hizmet Alımı", type: "HIZMET" as const },
    { t: "Atıksu Toplama Hatları Yapım İşi", type: "YAPIM" as const },
    { t: "Dijital Dönüşüm Danışmanlık Hizmeti", type: "DANISMANLIK" as const },
    { t: "Toplu Konut Projesi 3. Etap Yapım İşi", type: "YAPIM" as const },
    { t: "Tıbbi Sarf Malzeme Alım İhalesi", type: "MAL_ALIMI" as const },
    { t: "Metro Hattı Uzatma Projesi Yapım İşi", type: "YAPIM" as const },
    { t: "Afet Konutları Yapım İşi", type: "YAPIM" as const },
    { t: "Çevre Etki Değerlendirmesi Danışmanlık Hizmeti", type: "DANISMANLIK" as const },
    { t: "Fiber Optik Altyapı Döşeme İhalesi", type: "YAPIM" as const },
    { t: "Okul Taşımacılık Hizmet Alımı", type: "HIZMET" as const },
    { t: "Yenilenebilir Enerji Fizibilite Danışmanlığı", type: "DANISMANLIK" as const },
    { t: "Havalimanı Terminal Genişletme Yapım İşi", type: "YAPIM" as const },
    { t: "Bilgisayar ve Donanım Alım İhalesi", type: "MAL_ALIMI" as const },
    { t: "Sulama Kanalı Rehabilitasyon Yapım İşi", type: "YAPIM" as const },
    { t: "Kamu Personeli Eğitim Hizmet Alımı", type: "HIZMET" as const },
    { t: "Köprü ve Viyadük Yapım İşi", type: "YAPIM" as const },
    { t: "Akıllı Şehir Projesi Danışmanlık Hizmeti", type: "DANISMANLIK" as const },
    { t: "İlaç ve Aşı Alım İhalesi", type: "MAL_ALIMI" as const },
    { t: "Demiryolu Hat Yenileme Yapım İşi", type: "YAPIM" as const },
    { t: "Lojistik Depo Yapım İşi", type: "YAPIM" as const },
    { t: "Siber Güvenlik Altyapı Kurulum Hizmeti", type: "HIZMET" as const },
    { t: "Park ve Peyzaj Düzenleme Yapım İşi", type: "YAPIM" as const },
    { t: "Laboratuvar Cihazları Alım İhalesi", type: "MAL_ALIMI" as const },
    { t: "Devlet Hastanesi Ek Bina Yapım İşi", type: "YAPIM" as const },
    { t: "Araç Filosu Kiralama Hizmet Alımı", type: "HIZMET" as const },
    { t: "Su Şebekesi Yenileme Yapım İşi", type: "YAPIM" as const },
    { t: "ERP Yazılım Lisans ve Kurulum İhalesi", type: "MAL_ALIMI" as const },
    { t: "Karayolu Tünel İnşaatı Yapım İşi", type: "YAPIM" as const },
    { t: "Organize Sanayi Bölgesi Altyapı Yapımı", type: "YAPIM" as const },
    { t: "Okul Mobilya ve Donatım Alım İhalesi", type: "MAL_ALIMI" as const },
    { t: "Kentsel Dönüşüm Projesi Danışmanlık Hizmeti", type: "DANISMANLIK" as const },
    { t: "Hava Kalitesi İzleme Sistemi Alımı", type: "MAL_ALIMI" as const },
    { t: "Yüksek Hızlı İnternet Altyapı Hizmeti", type: "HIZMET" as const },
    { t: "Baraj ve Gölet Yapım İşi", type: "YAPIM" as const },
    { t: "Sağlık Ocağı Yapım İşi", type: "YAPIM" as const },
    { t: "Toplu Taşıma Otobüs Alım İhalesi", type: "MAL_ALIMI" as const },
    { t: "Jeotermal Enerji Sondaj Yapım İşi", type: "YAPIM" as const },
    { t: "Kültür Merkezi Yapım İşi", type: "YAPIM" as const },
  ];

  const now = new Date();

  const tenders = [];
  for (let i = 0; i < 50; i++) {
    const item = tenderTitles[i];
    const city = cities[i % cities.length];
    const institution = institutions[i % institutions.length];
    const status = i < 30 ? statuses[i % 3] : statuses[3];
    const budget = Math.round((50000 + Math.random() * 49950000) / 1000) * 1000;
    const publishDaysAgo = Math.floor(Math.random() * 30);
    const deadlineDaysAhead = 15 + Math.floor(Math.random() * 30);

    const publishDate = new Date(now);
    publishDate.setDate(publishDate.getDate() - publishDaysAgo);

    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + deadlineDaysAhead);

    const lat = 36.5 + Math.random() * 5.5;
    const lng = 26.0 + Math.random() * 18.0;

    const tender = await prisma.tender.create({
      data: {
        title: `${city} ${item.t}`,
        institution,
        city,
        tenderType: item.type,
        status,
        ekapNo: `2026/${(100000 + i).toString()}`,
        ilanNo: `ILN-2026-${(50000 + i).toString()}`,
        description: `${city} ilinde ${institution} tarafından gerçekleştirilecek ${item.t.toLowerCase()} kapsamında ihale düzenlenmiştir. Detaylı bilgi için ihale dokümanlarını inceleyiniz.`,
        requirements: `İsteklilerin son 5 yılda benzer büyüklükte en az 2 iş deneyimine sahip olması gerekmektedir. İş deneyim belgesi, bilanço, banka referans mektubu ve teknik personel belgeleri ihale dosyasında sunulmalıdır.`,
        estimatedCost: budget,
        guaranteeRate: 6,
        publishDate,
        deadline,
        openingDate: new Date(deadline.getTime() + 86400000),
        latitude: lat,
        longitude: lng,
        contactPerson: ["Ali Yılmaz", "Fatma Demir", "Hasan Çelik", "Zeynep Aydın", "Can Özkan"][i % 5],
        contactPhone: `0${312 + (i % 10)} ${400 + i} ${10 + i} ${20 + i}`,
        contactEmail: `ihale${i + 1}@kurum.gov.tr`,
        viewCount: Math.floor(Math.random() * 500),
        isFeatured: i < 5,
      },
    });

    tenders.push(tender);

    // Dokümanlar
    const docCategories = ["İhale İlanı", "İdari Şartname", "Teknik Şartname", "Sözleşme Taslağı", "Standart Formlar"];
    const docCount = 2 + Math.floor(Math.random() * 2);
    for (let d = 0; d < docCount; d++) {
      await prisma.tenderDocument.create({
        data: {
          tenderId: tender.id,
          name: `${docCategories[d]}.pdf`,
          category: docCategories[d],
          fileSize: `${(500 + Math.floor(Math.random() * 4500))} KB`,
          mimeType: "application/pdf",
        },
      });
    }

    // Timeline
    const timelineEvents = [
      { title: "İhale İlanı Yayınlandı", date: publishDate, isCompleted: true },
      { title: "Şartname Satışa Açıldı", date: new Date(publishDate.getTime() + 86400000 * 2), isCompleted: true },
      { title: "Soru-Cevap Süresi Başlangıcı", date: new Date(publishDate.getTime() + 86400000 * 5), isCompleted: publishDaysAgo > 5 },
      { title: "Son Başvuru Tarihi", date: deadline, isCompleted: status === "SONUCLANDI" },
      { title: "İhale Açılış Tarihi", date: new Date(deadline.getTime() + 86400000), isCompleted: status === "SONUCLANDI" },
    ];

    for (const evt of timelineEvents) {
      await prisma.tenderTimeline.create({
        data: {
          tenderId: tender.id,
          title: evt.title,
          date: evt.date,
          isCompleted: evt.isCompleted,
          description: `${evt.title} - ${tender.title}`,
        },
      });
    }
  }

  // ─── İhale Sonuçları (10 ihale) ───
  const resultCompanies = [
    { name: "Anadolu İnşaat A.Ş.", taxNo: "1234567890" },
    { name: "Yıldız Yapı Ltd. Şti.", taxNo: "1112223334" },
    { name: "Ege Mühendislik A.Ş.", taxNo: "2223334445" },
    { name: "Karadeniz İnşaat Ltd.", taxNo: "3334445556" },
    { name: "TeknoSoft Bilişim Ltd. Şti.", taxNo: "9876543210" },
  ];

  const completedTenders = tenders.filter((t) => t.status === "SONUCLANDI");
  for (let i = 0; i < Math.min(10, completedTenders.length); i++) {
    const tender = completedTenders[i];
    const winner = resultCompanies[i % resultCompanies.length];
    const estimatedCost = Number(tender.estimatedCost) || 1000000;
    const discount = 0.7 + Math.random() * 0.25;

    await prisma.tenderResult.create({
      data: {
        tenderId: tender.id,
        winnerName: winner.name,
        winnerTaxNo: winner.taxNo,
        winnerAmount: Math.round(estimatedCost * discount),
        totalBidders: 3 + Math.floor(Math.random() * 8),
        resultDate: new Date(now.getTime() - Math.random() * 86400000 * 15),
      },
    });
  }

  // ─── Favoriler ───
  for (let i = 0; i < 5; i++) {
    await prisma.favorite.create({
      data: {
        userId: admin.id,
        tenderId: tenders[i].id,
      },
    });
  }
  for (let i = 2; i < 6; i++) {
    await prisma.favorite.create({
      data: {
        userId: premiumUser.id,
        tenderId: tenders[i].id,
      },
    });
  }

  // ─── Başvurular ───
  const appStatuses: ("TASLAK" | "GONDERILDI" | "DEGERLENDIRMEDE" | "KABUL_EDILDI" | "REDDEDILDI")[] = ["TASLAK", "GONDERILDI", "DEGERLENDIRMEDE", "KABUL_EDILDI", "REDDEDILDI"];
  for (let i = 0; i < 5; i++) {
    const tender = tenders[i * 3];
    const cost = Number(tender.estimatedCost) || 1000000;
    await prisma.application.create({
      data: {
        userId: admin.id,
        tenderId: tender.id,
        status: appStatuses[i],
        bidAmount: Math.round(cost * (0.75 + Math.random() * 0.2)),
        notes: `${tender.title} için başvuru notu`,
      },
    });
  }

  // ─── Bildirim Kuralları ───
  await prisma.notificationRule.createMany({
    data: [
      {
        userId: admin.id,
        name: "Ankara Yapım İhaleleri",
        cities: ["Ankara"],
        tenderTypes: ["YAPIM"],
        keywords: ["inşaat", "yapım"],
        budgetMin: 1000000,
        emailNotify: true,
        pushNotify: true,
      },
      {
        userId: admin.id,
        name: "Yüksek Bütçeli İhaleler",
        cities: [],
        tenderTypes: [],
        keywords: [],
        budgetMin: 10000000,
        emailNotify: true,
      },
      {
        userId: premiumUser.id,
        name: "Bilişim İhaleleri",
        cities: ["İstanbul", "Ankara"],
        tenderTypes: ["HIZMET", "MAL_ALIMI"],
        keywords: ["yazılım", "bilişim", "bilgisayar", "teknoloji"],
        emailNotify: true,
      },
      {
        userId: normalUser.id,
        name: "İzmir İhaleleri",
        cities: ["İzmir"],
        tenderTypes: [],
        keywords: [],
        emailNotify: true,
      },
      {
        userId: admin.id,
        name: "Danışmanlık İhaleleri",
        cities: [],
        tenderTypes: ["DANISMANLIK"],
        keywords: ["danışmanlık", "fizibilite", "proje"],
        budgetMin: 500000,
        emailNotify: true,
        pushNotify: true,
      },
    ],
  });

  // ─── Bildirimler ───
  const notifTypes: ("YENI_IHALE" | "SON_BASVURU" | "ZEYILNAME" | "SONUC" | "SISTEM")[] = ["YENI_IHALE", "SON_BASVURU", "ZEYILNAME", "SONUC", "SISTEM"];
  for (let i = 0; i < 15; i++) {
    const tender = tenders[i % tenders.length];
    await prisma.notification.create({
      data: {
        userId: admin.id,
        tenderId: tender.id,
        type: notifTypes[i % notifTypes.length],
        title: i % 5 === 0
          ? `Yeni İhale: ${tender.title.slice(0, 60)}`
          : i % 5 === 1
          ? `Son Başvuru Yaklaşıyor: ${tender.title.slice(0, 50)}`
          : i % 5 === 2
          ? `Zeyilname Yayınlandı: ${tender.title.slice(0, 50)}`
          : i % 5 === 3
          ? `İhale Sonuçlandı: ${tender.title.slice(0, 50)}`
          : "Sistem bakımı planlanmıştır",
        message: `${tender.title} hakkında bildirim mesajı.`,
        isRead: i > 5,
        link: `/ihaleler/${tender.id}`,
        createdAt: new Date(now.getTime() - i * 3600000 * 6),
      },
    });
  }

  // ─── Rakip Profilleri ───
  const competitors = [
    { name: "Yıldız Yapı Ltd. Şti.", taxNo: "1112223334", city: "İstanbul", sector: "Yapım İşleri", wins: 45, bids: 120, amount: 850000000 },
    { name: "Ege Mühendislik A.Ş.", taxNo: "2223334445", city: "İzmir", sector: "Yapım İşleri", wins: 32, bids: 85, amount: 620000000 },
    { name: "Karadeniz İnşaat Ltd.", taxNo: "3334445556", city: "Trabzon", sector: "Yapım İşleri", wins: 28, bids: 95, amount: 420000000 },
  ];

  for (const comp of competitors) {
    const profile = await prisma.competitorProfile.upsert({
      where: { taxNumber: comp.taxNo },
      update: {},
      create: {
        name: comp.name,
        taxNumber: comp.taxNo,
        city: comp.city,
        sector: comp.sector,
        totalWins: comp.wins,
        totalBids: comp.bids,
        totalAmount: comp.amount,
        avgBidAmount: Math.round(comp.amount / comp.wins),
        winRate: Math.round((comp.wins / comp.bids) * 100),
        lastActivity: new Date(now.getTime() - Math.random() * 86400000 * 30),
      },
    });

    // Deneyimler
    const expTitles = [
      "Okul Yapım İşi", "Hastane Onarım İhalesi", "Yol Genişletme Projesi",
      "Su Arıtma Tesisi", "Köprü İnşaatı", "Lojistik Merkezi Yapımı",
    ];
    for (let j = 0; j < 6; j++) {
      await prisma.competitorExperience.create({
        data: {
          competitorId: profile.id,
          tenderTitle: `${cities[j % cities.length]} ${expTitles[j]}`,
          institution: institutions[j % institutions.length],
          city: cities[j % cities.length],
          amount: 5000000 + Math.floor(Math.random() * 45000000),
          year: 2022 + Math.floor(j / 2),
          isWon: j < 4,
        },
      });
    }
  }

  // ─── Günlük İstatistikler (son 30 gün) ───
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    await prisma.dailyStats.upsert({
      where: { date },
      update: {},
      create: {
        date,
        totalTenders: 800 + Math.floor(Math.random() * 200),
        newTenders: 15 + Math.floor(Math.random() * 30),
        closingTenders: 5 + Math.floor(Math.random() * 15),
        totalBudget: BigInt(Math.round((500 + Math.random() * 500) * 1000000)),
        avgBudget: BigInt(Math.round((5 + Math.random() * 10) * 1000000)),
        totalUsers: 5000 + i * 10,
        activeUsers: 800 + Math.floor(Math.random() * 400),
        totalSearches: 2000 + Math.floor(Math.random() * 1000),
        totalPageViews: 15000 + Math.floor(Math.random() * 5000),
      },
    });
  }

  // ─── Sektör İstatistikleri ───
  const sectors = [
    "Yapım İşleri", "Mal Alımı", "Hizmet Alımı", "Danışmanlık",
    "Bilişim", "Sağlık", "Enerji", "Ulaşım",
  ];
  for (const sector of sectors) {
    await prisma.sectorStats.upsert({
      where: { month_sector: { month: "2026-03", sector } },
      update: {},
      create: {
        month: "2026-03",
        sector,
        tenderCount: 20 + Math.floor(Math.random() * 80),
        totalBudget: BigInt(Math.round((100 + Math.random() * 900) * 1000000)),
        avgBudget: BigInt(Math.round((2 + Math.random() * 15) * 1000000)),
      },
    });
  }

  // ─── Subscriptions ───
  await prisma.subscription.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      plan: "ENTERPRISE",
      status: "active",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2027-01-01"),
    },
  });

  await prisma.subscription.upsert({
    where: { userId: premiumUser.id },
    update: {},
    create: {
      userId: premiumUser.id,
      plan: "PRO",
      status: "active",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-08-01"),
    },
  });

  console.log("Seed verileri başarıyla oluşturuldu!");
  console.log(`  - 2 firma`);
  console.log(`  - 3 kullanıcı (admin, premium, normal)`);
  console.log(`  - 50 ihale (dokümanlar ve timeline ile)`);
  console.log(`  - 10 ihale sonucu`);
  console.log(`  - 5 bildirim kuralı`);
  console.log(`  - 15 bildirim`);
  console.log(`  - 3 rakip profili (deneyimler ile)`);
  console.log(`  - 30 günlük istatistik`);
  console.log(`  - 8 sektör istatistiği`);
}

main()
  .catch((e) => {
    console.error("Seed hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
