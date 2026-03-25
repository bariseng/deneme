import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Firma Değerlendirmeleri | Topluluk | İhalePro",
  description: "Firma değerlendirmeleri ve puanlamaları",
};

export default function FirmalarPage() {
  redirect("/topluluk");
}
