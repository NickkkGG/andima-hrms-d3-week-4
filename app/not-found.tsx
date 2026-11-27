import Link from "next/link";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { pageMetadata } from "@/lib/page-metadata";
import { buttonClass, pageTitleClass, pageBgClass } from "@/components/ui/styles";

export const generateMetadata = () => pageMetadata("notFound");

export default function NotFound() {
  return (
    <main className={`grid min-h-screen place-items-center ${pageBgClass} px-6 py-10`}>
      <section className="max-w-md text-center">
        <div className="flex items-center justify-center gap-2.5 text-slate-900">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-ANDIMA-wzx4gpZx20EFE5IYcH3jqabixELIo3.png"
            alt="Andima"
            className="size-10 object-contain"
          />
          <span className="font-[family:var(--font-poppins)] text-xl font-semibold tracking-[-0.03em]">ANDIMA HRMS</span>
        </div>
        <p className={`mt-10 ${pageTitleClass.eyebrow}`}>404</p>
        <h1 className={`mt-2 ${pageTitleClass.title}`}><LocalizedText id="Halaman tidak tersedia" en="Page not found" /></h1>
        <p className="mt-3 text-sm leading-6 text-slate-500"><LocalizedText id="Alamat yang Anda buka tidak tersedia atau telah dipindahkan." en="The address you opened does not exist or has moved." /></p>
        <Link href="/face-biometric-attendance" className={buttonClass("primary", "md", "mt-7")}><LocalizedText id="Kembali ke HRMS" en="Back to HRMS" /></Link>
      </section>
    </main>
  );
}
