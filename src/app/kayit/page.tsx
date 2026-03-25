import type { Metadata } from "next";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Ücretsiz Kayıt",
  description:
    "İhalePro'ya ücretsiz kayıt olun ve Türkiye genelindeki ihaleleri takip etmeye başlayın.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
