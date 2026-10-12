"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Notice = { tone: "error" | "success"; text: string } | null;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [greeting, setGreeting] = useState("Good Morning");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour >= 3 && hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!email.trim() || !password) {
      setNotice({ tone: "error", text: "Email dan password wajib diisi." });
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) {
        setNotice({ tone: "error", text: "Email atau password tidak sesuai." });
        return;
      }

      const { data: access, error: accessError } = await supabase
        .from("d3_user_access")
        .select("app_role")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

      if (accessError || !access) {
        await supabase.auth.signOut();
        setNotice({ tone: "error", text: "Akun ini belum dipetakan ke akses HRMS D3. Hubungi HR Admin." });
        return;
      }

      const isEmployee = access.app_role === "EMPLOYEE";
      setNotice({ tone: "success", text: "Login berhasil. Mengarahkan ke workspace Anda..." });
      window.setTimeout(() => {
        router.replace(isEmployee ? "/face-biometric-attendance" : "/employee-report-ticket?view=manager");
        router.refresh();
      }, 700);
    } catch {
      setNotice({ tone: "error", text: "Koneksi login belum siap. Periksa .env.local lalu coba kembali." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#07111f] text-[#0d1b2a] selection:bg-[#3b6ff5] selection:text-white">
      <div className="absolute inset-0 z-0">
        <img src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1600&auto=format&fit=crop" alt="Operasional logistik Andima" className="h-full w-full object-cover object-right opacity-60" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0d1b2a] via-[#0d1b2a]/85 via-40% to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07111f] via-transparent to-transparent" />
      </div>
      <div className="pointer-events-none absolute -left-20 -top-20 z-0 h-96 w-96 rounded-full bg-[#18c7c0]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 z-0 h-96 w-96 rounded-full bg-[#3b6ff5]/30 blur-3xl" />

      <aside className="pointer-events-none absolute right-8 top-1/2 z-20 hidden max-w-lg -translate-y-1/2 flex-col items-end text-right md:flex lg:right-16 xl:right-24">
        <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-ANDIMA-wzx4gpZx20EFE5IYcH3jqabixELIo3.png" alt="Logo Andima" className="mb-4 w-32 object-contain drop-shadow-lg sm:w-40 lg:w-48" />
        <h1 className="text-2xl font-extrabold leading-tight tracking-wider text-white drop-shadow-md sm:text-3xl lg:text-4xl">PT. ANDIMA<br />TRANSPORTINDO</h1>
      </aside>

      <section className="relative z-10 flex min-h-screen w-full items-center justify-start px-6 py-8 sm:px-12 lg:px-20">
        <div className="w-full max-w-xl">
          <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/85 via-white/70 to-white/60 p-8 shadow-[0_20px_50px_rgba(7,17,31,0.5),inset_0_2px_4px_rgba(255,255,255,0.9)] backdrop-blur-2xl sm:p-11">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-32 w-3/4 -translate-x-1/2 rounded-full bg-gradient-to-b from-white/80 to-transparent blur-md" />
            <div className="relative z-10 mb-7 text-left">
              <h2 className="text-xl font-bold tracking-tight text-[#0d1b2a] sm:text-2xl">{greeting},</h2>
              <p className="mt-1.5 text-sm font-medium text-[#334155]">Please sign in with your registered account to access the dashboard.</p>
            </div>

            <form onSubmit={handleSubmit} className="relative z-10 space-y-6" noValidate>
              <label className="block"><span className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-[#0f172a]">Username / Email</span><input type="email" placeholder="name@andima.co.id" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting} className="w-full rounded-xl border border-white/90 bg-white/70 px-4 py-3.5 text-sm font-medium text-[#0d1b2a] placeholder-[#64748b] shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] backdrop-blur-md transition-all focus:border-[#3b6ff5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b6ff5]/30 disabled:opacity-50" /></label>
              <label className="block"><span className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-[#0f172a]">Password</span><span className="relative block"><input type={showPassword ? "text" : "password"} placeholder="••••••••••••" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting} className="w-full rounded-xl border border-white/90 bg-white/70 py-3.5 pl-4 pr-12 text-sm font-medium text-[#0d1b2a] placeholder-[#64748b] shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] backdrop-blur-md transition-all focus:border-[#3b6ff5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b6ff5]/30 disabled:opacity-50" /><button type="button" onPointerDown={() => setShowPassword(true)} onPointerUp={() => setShowPassword(false)} onPointerLeave={() => setShowPassword(false)} disabled={isSubmitting} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#64748b] transition-colors hover:text-[#3b6ff5] disabled:opacity-50" aria-label="Tahan untuk melihat password"><EyeIcon hidden={!showPassword} /></button></span></label>
              {notice && <NoticeBanner notice={notice} />}
              <button type="submit" disabled={isSubmitting} className="mt-2 w-full rounded-xl bg-[#3b6ff5] px-5 py-4 text-sm font-extrabold tracking-wider text-white shadow-[0_8px_25px_rgba(59,111,245,0.4)] transition-all hover:bg-[#2b5ce5] active:scale-[0.99] disabled:cursor-wait disabled:opacity-50">{isSubmitting ? "SIGNING IN…" : "LOGIN"}</button>
            </form>
            <p className="relative z-10 mt-4 text-center text-sm text-[#334155]">Not registered? <Link href="/register" className="font-bold text-[#3b6ff5] hover:underline">Register</Link></p>
          </div>
        </div>
      </section>
    </main>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.3A10.8 10.8 0 0112 4.1c4.5 0 8.3 3 9.6 7.9a10.4 10.4 0 01-3.2 4.8M6.2 6.2A10.3 10.3 0 002.4 12C3.7 16.9 7.5 19.9 12 19.9c1.1 0 2.1-.2 3.1-.5" /></svg> : <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.5 12C3.8 7.9 7.5 5 12 5s8.2 2.9 9.5 7c-1.3 4.1-5 7-9.5 7s-8.2-2.9-9.5-7z" /></svg>;
}

function NoticeBanner({ notice }: { notice: Exclude<Notice, null> }) {
  const isSuccess = notice.tone === "success";
  return <p role={isSuccess ? "status" : "alert"} className={`rounded-xl border p-4 text-sm font-semibold ${isSuccess ? "border-[#059669]/30 bg-[#059669]/10 text-[#059669]" : "border-[#dc2626]/30 bg-[#dc2626]/10 text-[#dc2626]"}`}>{notice.text}</p>;
}
