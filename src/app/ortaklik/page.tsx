import { Metadata } from "next";
import OrtaklikClient from "./OrtaklikClient";

export const metadata: Metadata = {
  title: "İş Ortaklığı Eşleştirme | İhalePro",
  description: "İhale iş ortaklığı (JV) partner bulma ve eşleştirme platformu",
};

export default function OrtaklikPage() {
  return <OrtaklikClient />;
}
