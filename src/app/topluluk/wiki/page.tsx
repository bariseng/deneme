import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Bilgi Bankası | Topluluk | İhalePro",
  description: "İhale bilgi bankası - makaleler ve rehberler",
};

export default function WikiPage() {
  redirect("/topluluk");
}
