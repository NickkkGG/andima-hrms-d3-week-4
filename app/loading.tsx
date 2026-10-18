export default function GlobalLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-6 py-10" aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-2.5 text-[#0b2548]">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-ANDIMA-wzx4gpZx20EFE5IYcH3jqabixELIo3.png"
            alt="Andima"
            className="size-10 object-contain"
          />
          <span className="font-[family:var(--font-poppins)] text-xl font-semibold tracking-[-0.03em]">ANDIMA HRMS</span>
        </div>
        <span className="mt-8 size-5 animate-spin rounded-full border-2 border-[#d7e5f7] border-t-[#0c68d5]" aria-hidden="true" />
        <p className="mt-3 text-sm text-[#4d5f81]">Memuat data…</p>
        <span className="sr-only">Memuat halaman</span>
      </div>
    </main>
  );
}
