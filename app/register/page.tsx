"use client";

import { LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Notice = { tone: "error" | "success"; text: string } | null;

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const phone = String(formData.get("phone") ?? "").trim();

    if (fullName.length < 3 || username.length < 3 || !email || password.length < 8) {
      setNotice({ tone: "error", text: "Nama dan username minimal 3 karakter; password minimal 8 karakter." });
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const emailRedirectTo = new URL("/auth/confirm?next=/login", window.location.origin).toString();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: fullName,
            username,
            phone_number: phone || null,
          },
        },
      });

      if (error) {
        const message = error.code === "email_address_invalid"
          ? "Alamat email ditolak. Pastikan tidak ada spasi atau karakter tambahan, lalu gunakan alamat email yang valid."
          : error.code === "over_email_send_rate_limit"
            ? "Terlalu banyak permintaan email konfirmasi. Tunggu beberapa saat lalu coba lagi; jangan submit berulang kali."
            : error.code === "user_already_exists"
              ? "Akun dengan email ini sudah dibuat. Gunakan halaman Login, bukan Register."
            : "Pendaftaran belum berhasil. Periksa data lalu coba kembali.";
        setNotice({ tone: "error", text: message });
        return;
      }

      if (data.session) await supabase.auth.signOut();
      setNotice({
        tone: "success",
        text: "Akun dibuat. Konfirmasi email terlebih dahulu, lalu minta HR Admin memetakan akun ke employee dan role D3.",
      });
      event.currentTarget.reset();
    } catch {
      setNotice({ tone: "error", text: "Koneksi pendaftaran belum siap. Periksa .env.local lalu coba kembali." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-y-auto bg-[#031126] px-5 py-8 text-white font-[family-name:var(--font-poppins)] sm:py-12">
      <div className="absolute inset-0 -z-20">
        <Image
          src="/images/andima-register-warehouse.png"
          alt="Area operasional PT Andima Transportindo"
          fill
          priority
          className="object-cover object-center opacity-90"
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(2,12,29,0.47),rgba(2,12,29,0.78))]" />

      <section className="w-full max-w-[420px] text-center">
        <p className="text-[10px] font-bold tracking-[0.25em] text-[#87d7ff]">INTEGRATED HRMS</p>
        <h1 className="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.04em] sm:text-3xl">PT ANDIMA TRANSPORTINDO</h1>
        <p className="mt-2 text-xs text-slate-200">Daftarkan akun uji coba. Akses aktif setelah HR Admin menetapkan role.</p>

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-2 text-left">
          <RegisterField label="Full Name" icon={<UserRound size={18} />} name="fullName" autoComplete="name" placeholder="Masukkan nama lengkap" disabled={isSubmitting} />
          <RegisterField label="Email" icon={<Mail size={18} />} name="email" type="email" autoComplete="email" placeholder="nama@email.com" disabled={isSubmitting} />
          <RegisterField label="Username" icon={<UserRound size={18} />} name="username" autoComplete="username" placeholder="Username untuk profil" disabled={isSubmitting} />
          <RegisterField label="Password" icon={<LockKeyhole size={18} />} name="password" type="password" autoComplete="new-password" placeholder="Minimal 8 karakter" disabled={isSubmitting} />
          <RegisterField label="Phone Number" icon={<Phone size={18} />} name="phone" type="tel" autoComplete="tel" placeholder="Contoh: 0812xxxx" disabled={isSubmitting} />

          {notice && (
            <p role="alert" className={`rounded-2xl border px-4 py-3 text-sm font-medium ${notice.tone === "success" ? "border-emerald-200/40 bg-emerald-950/50 text-emerald-100" : "border-red-200/40 bg-red-950/50 text-red-100"}`}>
              {notice.text}
            </p>
          )}

          <button type="submit" disabled={isSubmitting} className="mt-1 h-11 w-full rounded-full bg-[#078be4] text-sm font-semibold tracking-[0.08em] text-white shadow-[0_12px_24px_rgba(3,126,216,0.36)] transition hover:bg-[#037fd8] focus:outline-none focus:ring-4 focus:ring-[#55b9fa]/40 disabled:cursor-wait disabled:opacity-70">
            {isSubmitting ? "Registering..." : "Register"}
          </button>
          <p className="pt-1 text-center text-xs text-slate-200">Sudah punya akun? <Link href="/login" className="font-semibold text-[#8ed5ff] underline-offset-4 hover:underline">Login</Link></p>
        </form>
      </section>
    </main>
  );
}

function RegisterField({ label, icon, name, type = "text", autoComplete, placeholder, disabled }: { label: string; icon: React.ReactNode; name: string; type?: string; autoComplete: string; placeholder: string; disabled: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-slate-100">{label}</span>
      <span className="flex h-10 items-center gap-3 rounded-full border border-white/50 bg-white/95 px-4 text-slate-700 shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition focus-within:border-[#0793ef] focus-within:ring-4 focus-within:ring-[#0793ef]/25">
        <span className="text-[#037fd8]" aria-hidden="true">{icon}</span>
        <input name={name} type={type} autoComplete={autoComplete} placeholder={placeholder} disabled={disabled} required className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none placeholder:text-slate-400" />
      </span>
    </label>
  );
}
