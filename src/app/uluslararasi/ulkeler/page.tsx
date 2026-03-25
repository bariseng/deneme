import { redirect } from "next/navigation";

export const metadata = {
  title: "Ülke Profilleri | Uluslararası Portal | İhalePro",
  description: "Ülke risk profilleri ve ihale fırsatları",
};

export default function UlkelerPage() {
  redirect("/uluslararasi");
}
