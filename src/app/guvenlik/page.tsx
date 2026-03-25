import { Metadata } from "next";
import SecurityClient from "./SecurityClient";

export const metadata: Metadata = {
  title: "Güvenlik, Denetim & Uyumluluk",
  description: "Denetim izi, KVKK uyumluluk, 2FA, IP kısıtlama, rol yönetimi, oturum yönetimi",
};

export default function SecurityPage() {
  return <SecurityClient />;
}
