import type { Metadata } from "next";
import ContactContent from "./ContactContent";

export const metadata: Metadata = {
  title: "İletişim",
  description:
    "İhalePro ile iletişime geçin. Sorularınız, önerileriniz ve destek talepleriniz için bize ulaşın.",
  openGraph: {
    title: "İletişim | İhalePro",
    description: "İhalePro ile iletişime geçin.",
  },
};

export default function ContactPage() {
  return <ContactContent />;
}
