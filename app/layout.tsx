import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/inter";
import "@fontsource/poppins/600.css";
import AppShell from "@/components/AppShell";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { getServerLanguage } from "@/lib/i18n-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "ANDIMA HRMS | Employee Report & Ticket",
  description: "Employee Report & Ticket untuk PT Andima Transportindo.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const language = await getServerLanguage();
  return (
    <html
      lang={language}
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col"><LanguageProvider initialLanguage={language}><AppShell>{children}</AppShell></LanguageProvider></body>
    </html>
  );
}
