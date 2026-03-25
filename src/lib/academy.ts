import { prisma } from "@/lib/prisma";
import type { CourseDifficulty } from "@/generated/prisma/client";

// ─── KURS CRUD ──────────────────────────────────────────────

export async function getCourses(filters?: {
  category?: string;
  difficulty?: CourseDifficulty;
  search?: string;
}) {
  const where: Record<string, unknown> = { isPublished: true };
  if (filters?.category) where.category = filters.category;
  if (filters?.difficulty) where.difficulty = filters.difficulty;
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.course.findMany({
    where,
    include: {
      _count: { select: { lessons: true, progress: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
}

export async function getCourseBySlug(slug: string) {
  return prisma.course.findUnique({
    where: { slug },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: { quiz: { select: { id: true, passingScore: true } } },
      },
      _count: { select: { progress: true, certificates: true } },
    },
  });
}

export async function getLessonBySlug(courseSlug: string, lessonSlug: string) {
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    select: { id: true },
  });
  if (!course) return null;

  return prisma.lesson.findUnique({
    where: { courseId_slug: { courseId: course.id, slug: lessonSlug } },
    include: {
      quiz: true,
      course: {
        select: { id: true, title: true, slug: true },
      },
    },
  });
}

// ─── İLERLEME ───────────────────────────────────────────────

export async function getUserProgress(userId: string) {
  return prisma.userCourseProgress.findMany({
    where: { userId },
    include: {
      course: {
        select: { id: true, title: true, slug: true, thumbnailUrl: true, category: true, difficulty: true },
        include: { _count: { select: { lessons: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCourseProgress(userId: string, courseId: string) {
  return prisma.userCourseProgress.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
}

export async function completeLesson(userId: string, courseId: string, lessonId: string) {
  const progress = await prisma.userCourseProgress.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: {
      userId,
      courseId,
      completedLessons: [lessonId],
    },
    update: {},
    select: { id: true, completedLessons: true },
  });

  // completedLessons'a ekle (duplicate yoksa)
  if (!progress.completedLessons.includes(lessonId)) {
    await prisma.userCourseProgress.update({
      where: { id: progress.id },
      data: {
        completedLessons: { push: lessonId },
      },
    });
  }

  // Tüm dersler tamamlandı mı kontrol et
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { lessons: { select: { id: true } } },
  });

  if (course) {
    const updatedProgress = await prisma.userCourseProgress.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    const allLessonIds = course.lessons.map((l) => l.id);
    const completed = updatedProgress?.completedLessons || [];
    const allDone = allLessonIds.every((id) => completed.includes(id));

    if (allDone && !updatedProgress?.completedAt) {
      // Sertifika oluştur
      const cert = await createCertificate(userId, courseId);

      await prisma.userCourseProgress.update({
        where: { userId_courseId: { userId, courseId } },
        data: {
          completedAt: new Date(),
          certificateId: cert.id,
        },
      });

      return { completed: true, certificate: cert };
    }
  }

  return { completed: false };
}

// ─── QUIZ ───────────────────────────────────────────────────

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export async function submitQuiz(
  userId: string,
  lessonId: string,
  answers: number[]
) {
  const quiz = await prisma.quiz.findUnique({
    where: { lessonId },
    include: { lesson: { select: { courseId: true } } },
  });

  if (!quiz) throw new Error("Quiz bulunamadı");

  const questions = quiz.questions as unknown as QuizQuestion[];
  let correct = 0;

  const results = questions.map((q, i) => {
    const isCorrect = answers[i] === q.correctIndex;
    if (isCorrect) correct++;
    return {
      question: q.question,
      selectedIndex: answers[i],
      correctIndex: q.correctIndex,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= quiz.passingScore;

  // Quiz skorunu kaydet
  const progress = await prisma.userCourseProgress.upsert({
    where: { userId_courseId: { userId, courseId: quiz.lesson.courseId } },
    create: {
      userId,
      courseId: quiz.lesson.courseId,
      completedLessons: [],
      quizScores: JSON.parse(JSON.stringify({ [lessonId]: score })),
    },
    update: {},
    select: { id: true, quizScores: true },
  });

  const existingScores = (progress.quizScores as Record<string, number>) || {};
  existingScores[lessonId] = score;

  await prisma.userCourseProgress.update({
    where: { id: progress.id },
    data: { quizScores: JSON.parse(JSON.stringify(existingScores)) },
  });

  return { score, passed, correct, total: questions.length, results };
}

// ─── SERTİFİKA ──────────────────────────────────────────────

function generateCertNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `CERT-${year}-${random}`;
}

export async function createCertificate(userId: string, courseId: string) {
  const certNumber = generateCertNumber();

  return prisma.certificate.create({
    data: {
      userId,
      courseId,
      certificateNumber: certNumber,
      verificationUrl: `/sertifika/${certNumber}`,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true, category: true } },
    },
  });
}

export async function verifyCertificate(number: string) {
  return prisma.certificate.findUnique({
    where: { certificateNumber: number },
    include: {
      user: { select: { name: true, image: true } },
      course: { select: { title: true, category: true, difficulty: true, durationMinutes: true } },
    },
  });
}

export async function getUserCertificates(userId: string) {
  return prisma.certificate.findMany({
    where: { userId },
    include: {
      course: { select: { title: true, slug: true, category: true, difficulty: true, thumbnailUrl: true } },
    },
    orderBy: { issuedAt: "desc" },
  });
}

// ─── İSTATİSTİKLER ──────────────────────────────────────────

export async function getAcademyStats(userId?: string) {
  const userWhere = userId ? { userId } : {};

  const [totalCourses, totalStudents, totalCertificates, userEnrolled, userCompleted] =
    await Promise.all([
      prisma.course.count({ where: { isPublished: true } }),
      prisma.userCourseProgress.groupBy({ by: ["userId"], _count: true }).then((r) => r.length),
      prisma.certificate.count(),
      userId ? prisma.userCourseProgress.count({ where: { userId } }) : Promise.resolve(0),
      userId ? prisma.userCourseProgress.count({ where: { userId, completedAt: { not: null } } }) : Promise.resolve(0),
    ]);

  return { totalCourses, totalStudents, totalCertificates, userEnrolled, userCompleted };
}

// ─── SEED DATA ──────────────────────────────────────────────

export async function seedAcademyCourses() {
  const count = await prisma.course.count();
  if (count > 0) return;

  const courses = [
    {
      title: "İhale Mevzuatına Giriş",
      slug: "ihale-mevzuatina-giris",
      description: "4734 ve 4735 sayılı kanunları, ihale usullerini ve temel kavramları öğrenin. EKAP kayıt süreçleri dahil.",
      category: "MEVZUAT",
      difficulty: "BASLANGIC" as const,
      durationMinutes: 120,
      isPremium: false,
      order: 1,
      instructorName: "Dr. Ahmet Yılmaz",
    },
    {
      title: "EKAP Sistemi Uygulamalı Eğitim",
      slug: "ekap-uygulamali-egitim",
      description: "EKAP üzerinde ihale arama, teklif hazırlama, belge yükleme ve e-imza süreçlerini adım adım öğrenin.",
      category: "EKAP",
      difficulty: "BASLANGIC" as const,
      durationMinutes: 90,
      isPremium: false,
      order: 2,
      instructorName: "Mehmet Kaya",
    },
    {
      title: "Teklif Hazırlama Teknikleri",
      slug: "teklif-hazirlama-teknikleri",
      description: "Kazanan teklifler nasıl hazırlanır? Fiyat analizi, birim fiyat teklif cetveli, iş deneyim belgesi hesaplama.",
      category: "TEKLIF",
      difficulty: "ORTA" as const,
      durationMinutes: 180,
      isPremium: true,
      price: 299,
      order: 3,
      instructorName: "Fatma Demir",
    },
    {
      title: "İhale Sözleşmeleri ve Hukuki Riskler",
      slug: "ihale-sozlesmeleri-hukuki-riskler",
      description: "Sözleşme türleri, fiyat farkı hesaplama, cezai şartlar, itiraz ve uyuşmazlık çözüm yolları.",
      category: "SOZLESME",
      difficulty: "ILERI" as const,
      durationMinutes: 240,
      isPremium: true,
      price: 499,
      order: 4,
      instructorName: "Av. Zeynep Aydın",
    },
    {
      title: "Teminat Mektubu ve İhale Finansmanı",
      slug: "teminat-mektubu-ihale-finansmani",
      description: "Geçici/kesin teminat, avans teminatı, banka ilişkileri ve ihale finansmanı stratejileri.",
      category: "FINANS",
      difficulty: "ORTA" as const,
      durationMinutes: 150,
      isPremium: false,
      order: 5,
      instructorName: "Ali Çelik",
    },
    {
      title: "Kamu İhale Uzmanı Sertifika Programı",
      slug: "kamu-ihale-uzmani-sertifika",
      description: "Kapsamlı uzman sertifika programı: mevzuat, uygulama, denetim ve etik. 40+ ders ve sınav.",
      category: "MEVZUAT",
      difficulty: "UZMAN" as const,
      durationMinutes: 600,
      isPremium: true,
      price: 999,
      order: 6,
      instructorName: "Prof. Dr. Hasan Arslan",
    },
  ];

  for (const course of courses) {
    const created = await prisma.course.create({ data: course });

    // Her kurs için örnek dersler oluştur
    const lessonCount = Math.floor(course.durationMinutes / 30) || 3;
    const lessons = [];
    for (let i = 1; i <= Math.min(lessonCount, 6); i++) {
      lessons.push({
        courseId: created.id,
        title: `${course.title} - Bölüm ${i}`,
        slug: `bolum-${i}`,
        content: generateLessonContent(course.category, i),
        durationMinutes: Math.floor(course.durationMinutes / lessonCount),
        order: i,
      });
    }

    const createdLessons = [];
    for (const lesson of lessons) {
      const l = await prisma.lesson.create({ data: lesson });
      createdLessons.push(l);
    }

    // Son derse quiz ekle
    if (createdLessons.length > 0) {
      const lastLesson = createdLessons[createdLessons.length - 1];
      await prisma.quiz.create({
        data: {
          lessonId: lastLesson.id,
          questions: JSON.parse(JSON.stringify(generateQuizQuestions(course.category))),
          passingScore: 70,
        },
      });
    }
  }
}

function generateLessonContent(category: string, part: number): string {
  const contents: Record<string, string[]> = {
    MEVZUAT: [
      "## 4734 Sayılı Kamu İhale Kanunu\n\nBu derste 4734 sayılı Kanun'un temel ilkelerini öğreneceksiniz.\n\n### Temel İlkeler\n- Saydamlık\n- Rekabet\n- Eşit muamele\n- Güvenirlik\n- Kamuoyu denetimi\n- İhtiyaçların uygun şartlarda karşılanması\n\n### Kapsam\nGenel bütçe kapsamındaki kamu idareleri, özel bütçeli idareler, sosyal güvenlik kurumları, il özel idareleri ve belediyelerin yapacağı ihaleler bu kanun kapsamındadır.",
      "## İhale Usulleri\n\n### Açık İhale\nBütün isteklilerin teklif verebileceği usuldür. En yaygın kullanılan ihale usulüdür.\n\n### Belli İstekliler Arasında İhale\nÖn yeterlik değerlendirmesi sonucu davet edilen isteklilerin teklif verebildiği usuldür.\n\n### Pazarlık Usulü\nKanunda belirtilen hallerde kullanılabilen özel bir usuldür.\n\n### Doğrudan Temin\nBelirli koşullarda ihale yapılmaksızın ihtiyaçların karşılanmasıdır.",
      "## İhale Sürecinin Aşamaları\n\n1. **İhtiyacın Belirlenmesi**: Teknik şartname hazırlanması\n2. **Yaklaşık Maliyet**: Piyasa araştırması ile maliyet hesabı\n3. **İhale İlanı**: EKAP üzerinden ilan\n4. **Teklif Alma**: Zarfların toplanması\n5. **Değerlendirme**: Yeterlik ve fiyat değerlendirmesi\n6. **İhale Kararı**: Komisyon kararı\n7. **Sözleşme**: İmza süreci",
    ],
    EKAP: [
      "## EKAP'a Giriş\n\nElektronik Kamu Alımları Platformu (EKAP), Kamu İhale Kurumu tarafından yönetilen dijital ihale platformudur.\n\n### EKAP Kayıt\n1. e-Devlet üzerinden giriş\n2. Firma bilgileri girişi\n3. Vergi kimlik doğrulama\n4. e-İmza/mobil imza tanımlama\n\n### Temel İşlevler\n- İhale arama ve takip\n- Teklif hazırlama ve gönderme\n- Belge yükleme\n- Sonuç sorgulama",
      "## EKAP'ta Teklif Hazırlama\n\n### Adım Adım Teklif Süreci\n1. İhaleyi EKAP'ta bulun\n2. İhale dokümanı satın alın\n3. Teklif zarfını oluşturun\n4. Birim fiyat teklif cetvelini doldurun\n5. Yeterlik belgelerini yükleyin\n6. e-İmza ile imzalayın\n7. Son tarihe kadar gönderin",
    ],
    TEKLIF: [
      "## Teklif Stratejileri\n\n### Fiyat Analizi\n- Piyasa fiyat araştırması\n- Birim fiyat analizi\n- Kar marjı hesaplama\n- Rakip analizi\n\n### Teklif Mektubu\nStandart teklif mektubu formatı KİK tarafından belirlenmiştir. Her kalem için birim fiyat ve toplam tutar belirtilmelidir.",
      "## İş Deneyim Belgesi\n\n### Hesaplama Yöntemi\n- Yapım işlerinde: sözleşme bedelinin %80'i\n- Hizmet alımlarında: sözleşme bedeli\n- Güncelleme katsayısı uygulanır\n\n### Dikkat Edilecek Hususlar\n- Belge tarihi ve güncelliği\n- Alt yüklenici belgeleri\n- Ortaklık durumunda pay oranı",
    ],
    SOZLESME: [
      "## Sözleşme Türleri\n\n### Anahtar Teslimi Götürü Bedel\nToplam bedel üzerinden sözleşme yapılır. En yaygın yapım işi sözleşme türüdür.\n\n### Birim Fiyat Sözleşme\nHer bir iş kalemi için birim fiyat belirlenir. Toplam bedel, gerçekleşen miktarlara göre hesaplanır.\n\n### Karma Sözleşme\nHer iki yöntemin birlikte kullanıldığı sözleşme türüdür.",
      "## Fiyat Farkı Hesaplama\n\n### Formül\nF = An x B x (Pn - 1)\n\n- F: Fiyat farkı tutarı\n- An: İlgili aydaki iş tutarı\n- B: Sabit katsayı\n- Pn: Fiyat farkı katsayısı",
    ],
    FINANS: [
      "## Teminat Mektubu\n\n### Türleri\n- **Geçici Teminat**: İhaleye katılım için (%3)\n- **Kesin Teminat**: Sözleşme imzası için (%6)\n- **Avans Teminatı**: Avans alınması durumunda\n\n### Banka İlişkileri\n- Kredi limiti\n- Teminat limiti\n- Faiz oranları\n- Komisyon hesaplama",
      "## İhale Finansmanı\n\n### Nakit Akışı Yönetimi\n- Hakediş tahsilatı planlaması\n- Malzeme alım zamanlaması\n- İşçilik giderleri\n\n### Alternatif Finansman\n- Faktoring\n- Forfaiting\n- Proje finansmanı",
    ],
  };

  const categoryContents = contents[category] || contents.MEVZUAT;
  return categoryContents[(part - 1) % categoryContents.length] || categoryContents[0];
}

function generateQuizQuestions(category: string) {
  const quizzes: Record<string, QuizQuestion[]> = {
    MEVZUAT: [
      { question: "4734 sayılı Kanun'un temel ilkeleri arasında hangisi yer almaz?", options: ["Saydamlık", "Rekabet", "Gizlilik", "Eşit muamele"], correctIndex: 2, explanation: "4734'ün temel ilkeleri: saydamlık, rekabet, eşit muamele, güvenirlik, kamuoyu denetimi ve uygun şartlarda karşılamadır." },
      { question: "Açık ihale usulünde kimler teklif verebilir?", options: ["Sadece davet edilenler", "Ön yeterlik alanlar", "Bütün istekliler", "Sadece yerli firmalar"], correctIndex: 2, explanation: "Açık ihalede bütün istekliler teklif verebilir." },
      { question: "Yaklaşık maliyet ne amaçla hesaplanır?", options: ["Vergi hesabı için", "İhale limitini belirlemek için", "Firma seçmek için", "Sözleşme bedeli olarak"], correctIndex: 1, explanation: "Yaklaşık maliyet, hangi ihale usulünün uygulanacağını ve eşik değerleri belirlemek için hesaplanır." },
      { question: "İhale komisyonu en az kaç kişiden oluşur?", options: ["3", "5", "7", "9"], correctIndex: 1, explanation: "İhale komisyonu, başkan dahil en az 5 kişiden oluşur." },
      { question: "Doğrudan temin hangi durumda kullanılabilir?", options: ["Her zaman", "Yaklaşık maliyet düşükse", "Kanunda belirtilen hallerde", "İdare isterse"], correctIndex: 2, explanation: "Doğrudan temin yalnızca 4734 sayılı Kanun'un 22. maddesinde belirtilen hallerde kullanılabilir." },
    ],
    EKAP: [
      { question: "EKAP'a giriş hangi yöntemle yapılır?", options: ["Kullanıcı adı/şifre", "e-Devlet", "SMS", "Telefon"], correctIndex: 1, explanation: "EKAP'a e-Devlet kapısı üzerinden giriş yapılır." },
      { question: "EKAP'ta ihale dokümanı bedeli nereye ödenir?", options: ["Bankaya", "İdareye", "EKAP'a", "KİK'e"], correctIndex: 2, explanation: "İhale dokümanı bedeli EKAP üzerinden elektronik olarak ödenir." },
      { question: "e-Teklif hangi araçla imzalanır?", options: ["Islak imza", "e-İmza/mobil imza", "Parmak izi", "Karekod"], correctIndex: 1, explanation: "e-Teklif, nitelikli elektronik imza veya mobil imza ile imzalanır." },
    ],
    TEKLIF: [
      { question: "Birim fiyat teklif cetvelinde ne belirtilir?", options: ["Sadece toplam", "Her kalem için birim fiyat", "Sadece KDV", "Firma bilgisi"], correctIndex: 1, explanation: "Birim fiyat teklif cetvelinde her bir iş kalemi için birim fiyat ve toplam tutar belirtilir." },
      { question: "İş deneyim belgesi güncellemesinde ne kullanılır?", options: ["Enflasyon oranı", "Döviz kuru", "Güncelleme katsayısı", "KDV oranı"], correctIndex: 2, explanation: "İş deneyim belgesi tutarları, KİK tarafından yayımlanan güncelleme katsayıları ile güncellenir." },
      { question: "Aşırı düşük teklif sınırı neye göre belirlenir?", options: ["İdarenin takdirine", "Matematiksel formüle", "En düşük teklife", "Bütçeye"], correctIndex: 1, explanation: "Aşırı düşük teklif sınır değeri, KİK mevzuatında belirtilen matematiksel yöntemlerle hesaplanır." },
    ],
    SOZLESME: [
      { question: "Anahtar teslimi götürü bedel sözleşmede bedel nasıl belirlenir?", options: ["Birim fiyatla", "Toplam bedel üzerinden", "Yüzdelik olarak", "Saatlik ücretle"], correctIndex: 1, explanation: "Anahtar teslimi götürü bedelde toplam bedel önceden belirlenir ve sözleşmeye yazılır." },
      { question: "Kesin teminat oranı sözleşme bedelinin yüzde kaçıdır?", options: ["%3", "%6", "%10", "%15"], correctIndex: 1, explanation: "Kesin teminat oranı sözleşme bedelinin %6'sıdır." },
      { question: "Fiyat farkı hesabında 'B' neyi temsil eder?", options: ["Baz endeks", "Sabit katsayı", "Birim fiyat", "Bütçe payı"], correctIndex: 1, explanation: "Fiyat farkı formülünde B, idarece belirlenen sabit katsayıdır." },
    ],
    FINANS: [
      { question: "Geçici teminat oranı en az yüzde kaçtır?", options: ["%1", "%3", "%5", "%10"], correctIndex: 1, explanation: "Geçici teminat, teklif edilen bedelin en az %3'ü oranında verilir." },
      { question: "Hangi teminat türü sözleşme imzasında istenir?", options: ["Geçici teminat", "Kesin teminat", "Avans teminatı", "Ek teminat"], correctIndex: 1, explanation: "Sözleşme imzalanmadan önce kesin teminat yatırılması zorunludur." },
      { question: "Teminat mektubu hangi kurumdan alınır?", options: ["Noterden", "Bankadan", "Mahkemeden", "Belediyeden"], correctIndex: 1, explanation: "Teminat mektupları bankalar veya özel finans kurumları tarafından düzenlenir." },
    ],
  };

  return quizzes[category] || quizzes.MEVZUAT;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// ─── SABİTLER ───────────────────────────────────────────────

export const CATEGORIES = [
  { value: "MEVZUAT", label: "Mevzuat" },
  { value: "EKAP", label: "EKAP" },
  { value: "TEKLIF", label: "Teklif Hazırlama" },
  { value: "SOZLESME", label: "Sözleşme" },
  { value: "FINANS", label: "Finans" },
];

export const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  BASLANGIC: { label: "Başlangıç", color: "bg-green-100 text-green-800" },
  ORTA: { label: "Orta", color: "bg-blue-100 text-blue-800" },
  ILERI: { label: "İleri", color: "bg-orange-100 text-orange-800" },
  UZMAN: { label: "Uzman", color: "bg-red-100 text-red-800" },
};
