"use client";

import { Eye, EyeOff, LockKeyhole, Mail, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setMessage("Email dan password wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        setMessage("Email atau password tidak sesuai.");
        return;
      }

      const { data: access, error: accessError } = await supabase
        .from("d3_user_access")
        .select("app_role")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

      if (accessError || !access) {
        await supabase.auth.signOut();
        setMessage("Akun ini belum dipetakan ke akses HRMS D3. Hubungi HR Admin.");
        return;
      }

      const view = access.app_role === "EMPLOYEE" ? "employee" : "manager";
      router.replace(`/employee-report-ticket?view=${view}`);
      router.refresh();
    } catch {
      setMessage("Koneksi login belum siap. Periksa .env.local lalu coba kembali.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-[#031126] px-5 py-12 text-white">
      <Image
        src="/images/andima-login-warehouse.png"
        alt="Aktivitas gudang PT Andima Transportindo"
        fill
        priority
        className="-z-20 object-cover object-center opacity-90"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(2,12,29,0.47),rgba(2,12,29,0.78))]" />

      <section className="w-full max-w-[420px] text-center">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl border border-white/25 bg-white/12 shadow-[0_12px_36px_rgba(0,0,0,0.26)] backdrop-blur-sm">
          <Truck size={28} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <p className="text-[11px] font-bold tracking-[0.28em] text-[#87d7ff]">INTEGRATED HRMS</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-[34px]">PT ANDIMA TRANSPORTINDO</h1>
        <p className="mt-2 text-sm font-medium text-slate-200">Sign in to access your workspace</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-4 text-left" noValidate>
          <label className="group flex h-14 items-center gap-3 rounded-full border border-white/50 bg-white/95 px-5 text-slate-700 shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition focus-within:border-[#0793ef] focus-within:ring-4 focus-within:ring-[#0793ef]/25">
            <Mail size={18} className="text-[#037fd8]" aria-hidden="true" />
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Email / username"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
              disabled={isSubmitting}
            />
          </label>
          <label className="group flex h-14 items-center gap-3 rounded-full border border-white/50 bg-white/95 px-5 text-slate-700 shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition focus-within:border-[#0793ef] focus-within:ring-4 focus-within:ring-[#0793ef]/25">
            <LockKeyhole size={18} className="text-[#037fd8]" aria-hidden="true" />
            <input
              name="password"
              type={isPasswordVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setIsPasswordVisible((visible) => !visible)}
              className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-[#037fd8]"
              aria-label={isPasswordVisible ? "Sembunyikan password" : "Tampilkan password"}
            >
              {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>

          {message && <p role="alert" className="rounded-xl border border-red-200/45 bg-[#290b15]/75 px-4 py-3 text-center text-xs font-semibold text-red-100 shadow-lg backdrop-blur-sm">{message}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-14 w-full rounded-full bg-[#078be4] text-sm font-extrabold tracking-[0.08em] text-white shadow-[0_12px_24px_rgba(3,126,216,0.36)] transition hover:bg-[#037fd8] focus:outline-none focus:ring-4 focus:ring-[#55b9fa]/40 disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting ? "MEMERIKSA AKUN..." : "LOGIN"}
          </button>
        </form>

        <p className="mt-6 text-sm font-medium text-slate-100">
          Not login? <Link href="/register" className="font-bold text-[#8ed5ff] underline-offset-4 hover:underline">Register</Link>
        </p>
      </section>
    </main>
  );
}
