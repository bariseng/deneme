"use client";

import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageSquare,
} from "lucide-react";

const contactInfo = [
  {
    icon: Phone,
    title: "Telefon",
    details: ["0850 123 45 67", "0212 987 65 43"],
  },
  {
    icon: Mail,
    title: "E-posta",
    details: ["info@ihalepro.com", "destek@ihalepro.com"],
  },
  {
    icon: MapPin,
    title: "Adres",
    details: ["Levent Mah. İhale Sok. No:42", "Beşiktaş / İstanbul"],
  },
  {
    icon: Clock,
    title: "Çalışma Saatleri",
    details: ["Pazartesi - Cuma: 09:00 - 18:00", "Cumartesi: 10:00 - 14:00"],
  },
];

export default function ContactContent() {
  return (
    <div className="bg-background-alt">
      {/* Hero */}
      <section className="bg-gradient-to-r from-background-dark to-primary py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            İletişim
          </h1>
          <p className="text-lg text-blue-100 max-w-xl mx-auto">
            Sorularınız, önerileriniz veya destek talepleriniz için bize
            ulaşabilirsiniz.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact info cards */}
          <div className="space-y-4">
            {contactInfo.map((info) => (
              <div
                key={info.title}
                className="bg-white rounded-xl border border-border p-5 flex items-start gap-4"
              >
                <div className="w-11 h-11 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <info.icon size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    {info.title}
                  </h3>
                  {info.details.map((detail) => (
                    <p
                      key={detail}
                      className="text-sm text-foreground-light"
                    >
                      {detail}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-border p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare size={24} className="text-primary" />
                <h2 className="text-xl font-bold text-foreground">
                  Bize Yazın
                </h2>
              </div>

              <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="contactName"
                      className="block text-sm font-medium text-foreground mb-1.5"
                    >
                      Ad Soyad
                    </label>
                    <input
                      id="contactName"
                      type="text"
                      placeholder="Adınız Soyadınız"
                      className="w-full h-11 px-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contactEmail"
                      className="block text-sm font-medium text-foreground mb-1.5"
                    >
                      E-posta
                    </label>
                    <input
                      id="contactEmail"
                      type="email"
                      placeholder="ornek@email.com"
                      className="w-full h-11 px-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contactPhone"
                    className="block text-sm font-medium text-foreground mb-1.5"
                  >
                    Telefon (Opsiyonel)
                  </label>
                  <input
                    id="contactPhone"
                    type="tel"
                    placeholder="05XX XXX XX XX"
                    className="w-full h-11 px-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-foreground mb-1.5"
                  >
                    Konu
                  </label>
                  <select
                    id="subject"
                    className="w-full h-11 px-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                    required
                  >
                    <option value="">Konu seçin</option>
                    <option value="genel">Genel Bilgi</option>
                    <option value="destek">Teknik Destek</option>
                    <option value="satis">Satış &amp; Fiyatlandırma</option>
                    <option value="isbirligi">İş Birliği</option>
                    <option value="sikayet">Şikayet &amp; Öneri</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-foreground mb-1.5"
                  >
                    Mesajınız
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    placeholder="Mesajınızı buraya yazın..."
                    className="w-full px-4 py-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 h-12 px-8 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors"
                >
                  <Send size={18} />
                  Mesaj Gönder
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Map placeholder */}
        <div className="mt-12 bg-white rounded-2xl border border-border overflow-hidden">
          <div className="h-64 md:h-80 bg-gray-200 flex items-center justify-center">
            <div className="text-center">
              <MapPin size={48} className="mx-auto text-foreground-light mb-2" />
              <p className="text-foreground-light">
                Harita burada görüntülenecektir
              </p>
              <p className="text-sm text-foreground-light">
                Levent Mah. İhale Sok. No:42, Beşiktaş / İstanbul
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
