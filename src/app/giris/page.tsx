import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Giriş Yap",
  description: "İhalePro hesabınıza giriş yaparak ihale takibine devam edin.",
};

export default function LoginPage() {
  return <LoginForm />;
}
