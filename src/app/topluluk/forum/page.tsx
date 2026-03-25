import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Forum | Topluluk | İhalePro",
  description: "İhale forumu - sorular, tartışmalar ve bilgi paylaşımı",
};

export default function ForumPage() {
  redirect("/topluluk");
}
