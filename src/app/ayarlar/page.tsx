import type { Metadata } from "next";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: "Ayarlar",
  description: "İhalePro hesap ayarları ve profil düzenleme.",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
