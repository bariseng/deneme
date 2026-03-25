import { prisma } from "@/lib/prisma";

// ─── FORUM CATEGORIES ─────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { name: "Yapım İşleri", slug: "yapim-isleri", description: "İnşaat, altyapı, üstyapı ihaleleri hakkında tartışmalar", sortOrder: 1 },
  { name: "Hizmet Alımı", slug: "hizmet-alimi", description: "Hizmet alımı ihaleleri, danışmanlık ve outsourcing konuları", sortOrder: 2 },
  { name: "Mal Alımı", slug: "mal-alimi", description: "Mal alımı ihaleleri, tedarik zinciri ve fiyatlandırma", sortOrder: 3 },
  { name: "Danışmanlık", slug: "danismanlik", description: "Danışmanlık ihaleleri, proje yönetimi ve teknik konular", sortOrder: 4 },
  { name: "Mevzuat & Hukuk", slug: "mevzuat-hukuk", description: "Kamu İhale Kanunu, mevzuat değişiklikleri ve hukuki sorular", sortOrder: 5 },
  { name: "Genel Tartışma", slug: "genel", description: "İhale dünyasıyla ilgili genel konular ve deneyim paylaşımı", sortOrder: 6 },
];

export async function getOrCreateCategories() {
  const existing = await prisma.forumCategory.count();
  if (existing === 0) {
    await prisma.forumCategory.createMany({ data: DEFAULT_CATEGORIES });
  }
  const categories = await prisma.forumCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { threads: true } },
    },
  });
  return JSON.parse(JSON.stringify(categories));
}

// ─── FORUM THREADS ────────────────────────────────────────

export async function getThreadsByCategory(categoryId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [threads, total] = await Promise.all([
    prisma.forumThread.findMany({
      where: { categoryId },
      include: {
        author: { select: { id: true, name: true, image: true } },
        _count: { select: { replies: true } },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.forumThread.count({ where: { categoryId } }),
  ]);
  return { threads: JSON.parse(JSON.stringify(threads)), total, pages: Math.ceil(total / limit) };
}

export async function getLatestThreads(limit = 10) {
  const threads = await prisma.forumThread.findMany({
    include: {
      author: { select: { id: true, name: true, image: true } },
      category: { select: { name: true, slug: true } },
      _count: { select: { replies: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return JSON.parse(JSON.stringify(threads));
}

export async function createThread(authorId: string, categoryId: string, title: string, content: string) {
  const thread = await prisma.forumThread.create({
    data: { authorId, categoryId, title, content },
    include: {
      author: { select: { id: true, name: true, image: true } },
      category: { select: { name: true, slug: true } },
    },
  });
  return JSON.parse(JSON.stringify(thread));
}

export async function getThreadDetail(threadId: string) {
  // Increment view count
  await prisma.forumThread.update({
    where: { id: threadId },
    data: { viewCount: { increment: 1 } },
  });

  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    include: {
      author: { select: { id: true, name: true, image: true } },
      category: { select: { name: true, slug: true } },
      replies: {
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
        orderBy: [{ isAnswer: "desc" }, { upvotes: "desc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!thread) return null;
  return JSON.parse(JSON.stringify(thread));
}

// ─── FORUM REPLIES ────────────────────────────────────────

export async function addReply(threadId: string, authorId: string, content: string) {
  const reply = await prisma.forumReply.create({
    data: { threadId, authorId, content },
    include: {
      author: { select: { id: true, name: true, image: true } },
    },
  });
  return JSON.parse(JSON.stringify(reply));
}

export async function upvoteReply(replyId: string) {
  return prisma.forumReply.update({
    where: { id: replyId },
    data: { upvotes: { increment: 1 } },
  });
}

export async function markAsAnswer(replyId: string, threadId: string, userId: string) {
  // Only thread author can mark answer
  const thread = await prisma.forumThread.findUnique({ where: { id: threadId } });
  if (!thread || thread.authorId !== userId) throw new Error("Yetkiniz yok");

  // Reset all answers in thread, set this one
  await prisma.forumReply.updateMany({ where: { threadId }, data: { isAnswer: false } });
  return prisma.forumReply.update({ where: { id: replyId }, data: { isAnswer: true } });
}

// ─── WIKI ─────────────────────────────────────────────────

const DEFAULT_WIKI_ARTICLES = [
  {
    title: "Kısmi Teklif Nedir?",
    slug: "kismi-teklif-nedir",
    category: "genel",
    tags: ["kısmi teklif", "ihale usulü"],
    summary: "Kısmi teklif, bir ihalede birden fazla kısım için ayrı ayrı teklif verilmesine olanak tanıyan ihale yöntemidir.",
    content: `# Kısmi Teklif Nedir?\n\nKısmi teklif, Kamu İhale Kanunu'nun 27. maddesine göre idarelerin ihaleleri kısımlara ayırarak, isteklilerin bu kısımlardan bir veya birkaçına teklif vermelerine olanak sağlayan bir uygulamadır.\n\n## Avantajları\n\n- **Rekabet artışı**: Daha küçük firmaların da katılmasını sağlar\n- **Fiyat avantajı**: Uzmanlaşmış firmalar kendi alanlarında daha iyi fiyat verebilir\n- **Risk dağılımı**: İdare açısından tek firmaya bağımlılık azalır\n\n## Dikkat Edilmesi Gerekenler\n\n1. Her kısım için ayrı geçici teminat verilmelidir\n2. İş deneyim belgesi her kısım için ayrı değerlendirilir\n3. Toplam teklif tutarı değil, kısım bazlı değerlendirme yapılır\n\n## İlgili Mevzuat\n\n- 4734 Sayılı Kamu İhale Kanunu Madde 27\n- İhale Uygulama Yönetmeliği`,
  },
  {
    title: "Zeyilname Nasıl İşler?",
    slug: "zeyilname-nasil-isler",
    category: "süreç",
    tags: ["zeyilname", "ihale süreci", "düzeltme"],
    summary: "Zeyilname, ihale dokümanlarında yapılan değişikliklerin resmi olarak bildirilmesidir.",
    content: `# Zeyilname Nasıl İşler?\n\nZeyilname, ihale ilanı yapıldıktan sonra ihale dokümanlarında değişiklik yapılması gerektiğinde düzenlenen ek belgedir.\n\n## Zeyilname Çıkma Nedenleri\n\n- Teknik şartnamede değişiklik\n- İhale tarihinin ertelenmesi\n- Yaklaşık maliyette güncelleme\n- İsteklilerin sorularına cevaben düzeltme\n\n## Süreç\n\n1. İdare zeyilname düzenler\n2. EKAP üzerinden yayınlanır\n3. Tüm doküman alanlara bildirilir\n4. Son teklif verme tarihi en az 10 gün uzatılır (açık ihale)\n\n## Önemli Notlar\n\n- Zeyilname son teklif tarihinden en az 10 gün önce yapılmalıdır\n- İhale konusunu değiştirecek nitelikte zeyilname yapılamaz\n- Zeyilname ile yaklaşık maliyet %20'den fazla değişirse ihale iptal edilebilir`,
  },
  {
    title: "İş Deneyim Belgesi Hesaplama",
    slug: "is-deneyim-belgesi-hesaplama",
    category: "hesaplama",
    tags: ["iş deneyim", "hesaplama", "yeterlilik"],
    summary: "İş deneyim belgesi tutarının güncellenmesi ve hesaplama yöntemleri.",
    content: `# İş Deneyim Belgesi Hesaplama\n\n## Güncelleme Katsayısı\n\nİş deneyim belgeleri, belgenin düzenlendiği yıldan ihale yılına kadar Türkiye İstatistik Kurumu tarafından yayımlanan Yurt İçi Üretici Fiyat Endeksi (Yİ-ÜFE) kullanılarak güncellenir.\n\n## Formül\n\n**Güncellenmiş Tutar = Belge Tutarı × (İhale Yılı Yİ-ÜFE / Belge Yılı Yİ-ÜFE)**\n\n## Asgari Oranlar\n\n| İhale Türü | Asgari Oran |\n|---|---|\n| Yapım İşleri | %50 - %100 |\n| Mal Alımı | %10 - %40 |\n| Hizmet Alımı | %25 - %50 |\n\n## Dikkat Edilecekler\n\n- Son 15 yıl içindeki işler geçerlidir (yapım)\n- Son 5 yıl içindeki işler geçerlidir (mal/hizmet)\n- Alt yüklenici belgeleri %100 değil, sözleşme bedeline oranla kabul edilir`,
  },
  {
    title: "Geçici Teminat Mektubu",
    slug: "gecici-teminat-mektubu",
    category: "genel",
    tags: ["teminat", "geçici teminat", "banka"],
    summary: "Geçici teminat mektubu hakkında bilmeniz gereken her şey.",
    content: `# Geçici Teminat Mektubu\n\n## Nedir?\n\nGeçici teminat, ihaleye katılan isteklilerin teklif bedelinin en az %3'ü oranında sunması gereken teminattır.\n\n## Kabul Edilen Türler\n\n1. Tedavüldeki Türk Parası\n2. Bankalar tarafından verilen teminat mektupları\n3. Hazine Müsteşarlığınca ihraç edilen Devlet İç Borçlanma Senetleri\n\n## İade Koşulları\n\n- Kazanan firma dışındaki isteklilere sözleşme imzalandıktan sonra iade edilir\n- Kazanan firmaya kesin teminat mektubu sunulunca iade edilir\n- Geçici teminatı yatırmayan istekliler ihale dışı bırakılır\n\n## Geçerlilik Süresi\n\n- Teklif geçerlilik süresinden en az 30 gün fazla olmalıdır`,
  },
];

export async function getOrSeedWikiArticles(editorId?: string) {
  const existing = await prisma.wikiArticle.count();
  if (existing === 0 && editorId) {
    for (const article of DEFAULT_WIKI_ARTICLES) {
      await prisma.wikiArticle.create({
        data: { ...article, lastEditedBy: editorId },
      });
    }
  }
  const articles = await prisma.wikiArticle.findMany({
    where: { isPublished: true },
    include: {
      editor: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return JSON.parse(JSON.stringify(articles));
}

export async function getWikiBySlug(slug: string) {
  await prisma.wikiArticle.updateMany({
    where: { slug },
    data: { viewCount: { increment: 1 } },
  });
  const article = await prisma.wikiArticle.findUnique({
    where: { slug },
    include: {
      editor: { select: { id: true, name: true } },
    },
  });
  if (!article) return null;
  return JSON.parse(JSON.stringify(article));
}

export async function createWikiArticle(
  editorId: string,
  data: { title: string; slug: string; content: string; summary?: string; category?: string; tags?: string[] }
) {
  const article = await prisma.wikiArticle.create({
    data: {
      title: data.title,
      slug: data.slug,
      content: data.content,
      summary: data.summary,
      category: data.category,
      tags: data.tags || [],
      lastEditedBy: editorId,
    },
  });
  return JSON.parse(JSON.stringify(article));
}

export async function updateWikiArticle(
  slug: string,
  editorId: string,
  data: { title?: string; content?: string; summary?: string; category?: string; tags?: string[] }
) {
  const article = await prisma.wikiArticle.findUnique({ where: { slug } });
  if (!article) throw new Error("Makale bulunamadı");

  const updated = await prisma.wikiArticle.update({
    where: { slug },
    data: {
      ...data,
      lastEditedBy: editorId,
      version: { increment: 1 },
    },
  });
  return JSON.parse(JSON.stringify(updated));
}

export async function searchWiki(query: string) {
  const articles = await prisma.wikiArticle.findMany({
    where: {
      isPublished: true,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
        { tags: { has: query.toLowerCase() } },
      ],
    },
    include: {
      editor: { select: { id: true, name: true } },
    },
    orderBy: { viewCount: "desc" },
    take: 20,
  });
  return JSON.parse(JSON.stringify(articles));
}

// ─── VENDOR REVIEWS ───────────────────────────────────────

export async function getVendorReviews(vendorName?: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = vendorName ? { vendorName: { contains: vendorName, mode: "insensitive" as const } } : {};

  const [reviews, total] = await Promise.all([
    prisma.vendorReview.findMany({
      where,
      include: {
        reviewer: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.vendorReview.count({ where }),
  ]);

  // For anonymous reviews, hide reviewer info
  const sanitized = reviews.map((r) => ({
    ...r,
    reviewer: r.isAnonymous ? { id: "", name: "Anonim Kullanıcı", image: null } : r.reviewer,
    reviewerId: r.isAnonymous ? "" : r.reviewerId,
  }));

  return { reviews: JSON.parse(JSON.stringify(sanitized)), total, pages: Math.ceil(total / limit) };
}

export async function getVendorSummary() {
  const vendors = await prisma.vendorReview.groupBy({
    by: ["vendorName"],
    _avg: { rating: true, workQuality: true, timeliness: true, communication: true, pricePerformance: true },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 50,
  });
  return JSON.parse(JSON.stringify(vendors));
}

export async function createVendorReview(
  reviewerId: string,
  data: {
    vendorName: string;
    vendorTaxNo?: string;
    rating: number;
    workQuality?: number;
    timeliness?: number;
    communication?: number;
    pricePerformance?: number;
    comment?: string;
    projectType?: string;
    isAnonymous?: boolean;
  }
) {
  const review = await prisma.vendorReview.create({
    data: {
      reviewerId,
      vendorName: data.vendorName,
      vendorTaxNo: data.vendorTaxNo,
      rating: data.rating,
      workQuality: data.workQuality,
      timeliness: data.timeliness,
      communication: data.communication,
      pricePerformance: data.pricePerformance,
      comment: data.comment,
      projectType: data.projectType,
      isAnonymous: data.isAnonymous ?? true,
    },
  });
  return JSON.parse(JSON.stringify(review));
}

// ─── FORUM STATS ──────────────────────────────────────────

export async function getCommunityStats() {
  const [threadCount, replyCount, wikiCount, reviewCount] = await Promise.all([
    prisma.forumThread.count(),
    prisma.forumReply.count(),
    prisma.wikiArticle.count({ where: { isPublished: true } }),
    prisma.vendorReview.count(),
  ]);
  return { threadCount, replyCount, wikiCount, reviewCount };
}
