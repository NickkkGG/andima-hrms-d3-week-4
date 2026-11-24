"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { language } = useLanguage();
  const copy = language === "id"
    ? { title: "Halaman belum dapat dimuat", description: "Terjadi gangguan saat memuat data. Silakan coba lagi.", retry: "Coba lagi" }
    : { title: "This page could not be loaded", description: "Something went wrong while loading the data. Please try again.", retry: "Try again" };
  return (
    <main className="grid min-h-screen place-items-center bg-white px-6 py-10">
      <section className="max-w-md text-center">
        <div className="flex items-center justify-center gap-2.5 text-[#0b2548]">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-ANDIMA-wzx4gpZx20EFE5IYcH3jqabixELIo3.png"
            alt="Andima"
            className="size-10 object-contain"
          />
          <span className="font-[family:var(--font-poppins)] text-xl font-semibold tracking-[-0.03em]">ANDIMA HRMS</span>
        </div>
        <h1 className="mt-10 font-[family:var(--font-poppins)] text-2xl font-semibold text-[#172033]">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#4d5f81]">{copy.description}</p>
        <button type="button" onClick={reset} className="mt-7 inline-flex h-10 items-center rounded-lg bg-[#0c68d5] px-5 text-sm font-semibold text-white transition hover:bg-[#0958b8] focus-visible:outline-offset-4">{copy.retry}</button>
      </section>
    </main>
  );
}
