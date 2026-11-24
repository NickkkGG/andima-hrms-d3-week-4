import Link from "next/link";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { pageMetadata } from "@/lib/page-metadata";

export const generateMetadata = () => pageMetadata("notFound");

export default function NotFound() {
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
        <p className="mt-10 text-sm font-semibold tracking-[0.12em] text-[#0c68d5]">404</p>
        <h1 className="mt-2 font-[family:var(--font-poppins)] text-2xl font-semibold text-[#172033]"><LocalizedText id="Halaman tidak tersedia" en="Page not found" /></h1>
        <p className="mt-3 text-sm leading-6 text-[#4d5f81]"><LocalizedText id="Alamat yang Anda buka tidak tersedia atau telah dipindahkan." en="The address you opened does not exist or has moved." /></p>
        <Link href="/face-biometric-attendance" className="mt-7 inline-flex h-10 items-center rounded-lg bg-[#0c68d5] px-5 text-sm font-semibold text-white transition hover:bg-[#0958b8] focus-visible:outline-offset-4"><LocalizedText id="Kembali ke HRMS" en="Back to HRMS" /></Link>
      </section>
    </main>
  );
}
