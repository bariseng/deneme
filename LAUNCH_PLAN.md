# İhalePro — Soft Launch Planı

## Hafta 1: Internal Test (Ekip)
- [ ] Production checklist çalıştır: `npx ts-node scripts/production-check.ts`
- [ ] Tüm E2E testleri geçir: `npx playwright test`
- [ ] k6 load test çalıştır: `k6 run k6/load-test.js`
- [ ] Lighthouse audit: Performance >90, A11y >90, BP >90, SEO >90
- [ ] OWASP ZAP güvenlik taraması (kritik/yüksek bulgu yok)
- [ ] Feature flag'ler kapalı başla (USE_REAL_*_DATA=false)
- [ ] Cron job'ları aktifleştir (vercel.json)
- [ ] Sentry alert kuralları: hata oranı >%5 → email
- [ ] Ekip içi 10 kullanıcı ile fonksiyonel test

## Hafta 2: Beta Kullanıcılar (50 Firma)
- [ ] Feature flag'leri %10 rollout: USE_REAL_EKAP_DATA_ROLLOUT=10
- [ ] 50 beta firma davet et (sektör çeşitliliği sağla)
- [ ] Geri bildirim formu aktifleştir
- [ ] USE_REAL_EKAP_DATA=true, USE_REAL_TED_DATA=true
- [ ] İlk EKAP sync çalıştır: POST /api/cron/sync-ekap?mode=full
- [ ] Günlük metrik raporu oluştur (cache hit, API latency, error rate)
- [ ] KVKK aydınlatma metni ve açık rıza onayı kontrol

## Hafta 3: Geri Bildirim & Düzeltmeler
- [ ] Feature flag'leri %50 rollout
- [ ] Beta kullanıcı geri bildirimlerini derle
- [ ] Kritik bugfix'leri uygula
- [ ] Performance regresyon testi
- [ ] Ödeme sistemi test: iyzico sandbox → production
- [ ] USE_REAL_PAYMENTS=true (sandbox'tan çık)
- [ ] Fiyat endeksi verisi doğrula

## Hafta 4: Public Launch
- [ ] Feature flag'ler %100 rollout
- [ ] Google Search Console kayıt
- [ ] Google Analytics / Vercel Analytics aktif
- [ ] CDN cache warm-up (popüler sayfalar)
- [ ] Press release / sosyal medya duyurusu
- [ ] Destek kanalı aktif (email + in-app chat)
- [ ] SLA tanımla: %99.9 uptime hedefi

## Hafta 5-8: İteratif İyileştirme
- [ ] Haftalık metrik raporu (DAU, MAU, churn, NPS)
- [ ] A/B test altyapısı (feature flag ile)
- [ ] Kullanıcı segmentasyonu ve kişiselleştirme
- [ ] Yeni sektör/şehir ekleme (talebe göre)
- [ ] Mobile app değerlendirmesi (React Native / PWA iyileştirme)
- [ ] Partnerlik entegrasyonları (muhasebe yazılımları, bankalar)

---

## Rollback Prosedürü
1. **Hata tespit**: Sentry alert veya kullanıcı bildirimi
2. **Feature flag kapatma**: USE_REAL_*_DATA=false → anında mock veriye dönüş
3. **Rollback script**: `npx ts-node scripts/migrate-to-real-data.ts --rollback`
4. **İnceleme**: Root cause analizi, fix, re-deploy
5. **Yeniden açma**: Feature flag ile kademeli (%10 → %50 → %100)

## Kritik Metrikler
| Metrik | Hedef | Alert Eşiği |
|--------|-------|-------------|
| Sayfa yükleme | <2s | >3s |
| API yanıt süresi | <500ms | >1s |
| Hata oranı | <%1 | >%5 |
| Cache hit rate | >%70 | <%50 |
| Uptime | %99.9 | <%99 |
| Concurrent user | 100+ | N/A |
