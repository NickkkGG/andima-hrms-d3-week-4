"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [greeting, setGreeting] = useState("Good Morning");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour >= 3 && hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening");
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("Employee accounts are prepared by HR Admin. Redirecting to login...");
    window.setTimeout(() => router.replace("/login"), 1600);
  }

  return (
    <main className="relative h-dvh w-full overflow-x-hidden overflow-y-auto bg-[#07111F] text-[#172033] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="relative z-10 flex min-h-full w-full flex-col justify-center p-4 sm:p-8 lg:w-1/2 lg:p-10">
        <div className="relative mx-auto w-full max-w-2xl shrink-0 overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/85 via-white/70 to-white/60 p-6 shadow-[0_20px_50px_rgba(7,17,31,0.5),inset_0_2px_4px_rgba(255,255,255,0.9)] backdrop-blur-2xl sm:p-9">
          <div className="relative z-10 mb-7 text-left">
            <h1 className="text-xl font-bold tracking-tight text-[#0D1B2A] sm:text-2xl">{greeting},</h1>
            <p className="mt-1.5 text-sm font-medium text-[#334155]">Please register with your identity.</p>
          </div>

          <form onSubmit={handleSubmit} className="relative z-10 w-full space-y-3.5 sm:space-y-4">
            <Input label="Full Name" placeholder="Enter your full name" required />
            <Input label="Email Address" type="email" placeholder="username@andima.co.id" required />

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#172033]">Password</span>
              <span className="relative block w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 10 chars (letters, numbers, symbols)"
                  required
                  minLength={10}
                  className="w-full rounded-2xl border border-[#172033]/15 bg-white/90 py-3 pl-4 pr-12 text-sm text-[#172033] placeholder-[#172033]/50 shadow-sm transition-all focus:border-[#3B6FF5] focus:outline-none focus:ring-2 focus:ring-[#3B6FF5]/30"
                />
                <button
                  type="button"
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  onTouchStart={() => setShowPassword(true)}
                  onTouchEnd={() => setShowPassword(false)}
                  tabIndex={-1}
                  aria-label="Show password while pressed"
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer select-none p-1 text-[#172033]/60 transition-colors hover:text-[#172033] focus:outline-none"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </span>
            </label>

            <Input label="Phone Number" placeholder="Max. 12 digits (e.g. 08123456789)" required />

            <Select label="Employment Status" placeholder="Select Status" options={["Probation", "Permanent"]} />
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Select label="Position" placeholder="Select Position" options={["Freight Forwarding Specialist", "HR Administrator", "Information Technology", "Director", "Accounting Associate", "Sales Executive"]} />
              <Select label="Department" placeholder="Select Department" options={["Human Resources", "Logistics & Shipment Operations", "Information Technology", "Finance, Accounting & Tax", "Commercial & Customer Success"]} />
            </div>

            {message && (
              <div role="status" className="rounded-2xl border border-[#16A37A]/30 bg-[#16A37A]/15 p-3 text-xs font-semibold text-[#16A37A] sm:text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`mt-4 w-full rounded-2xl px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-[0_6px_24px_rgba(59,111,245,0.4)] transition-all sm:text-base ${
                isLoading ? "cursor-not-allowed bg-gray-400 opacity-70" : "cursor-pointer bg-[#3B6FF5] hover:bg-[#2B5CE5] active:scale-[0.99]"
              }`}
            >
              {isLoading ? "Processing..." : "Register"}
            </button>
          </form>

          <div className="relative z-10 pt-4 text-center text-xs font-medium text-[#172033] sm:text-sm">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-[#172033] underline transition-opacity hover:opacity-80">
              Login
            </Link>
          </div>
        </div>
      </div>

      <aside className="pointer-events-none absolute right-8 top-1/2 z-20 hidden max-w-lg -translate-y-1/2 flex-col items-end text-right md:flex lg:right-16 xl:right-24">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-ANDIMA-wzx4gpZx20EFE5IYcH3jqabixELIo3.png"
          alt="Logo ANDIMA"
          className="mb-4 w-32 object-contain drop-shadow-lg sm:w-40 lg:w-48"
        />
        <h2 className="text-2xl font-extrabold leading-tight tracking-wider text-white drop-shadow-md sm:text-3xl lg:text-4xl">
          PT. ANDIMA<br />TRANSPORTINDO
        </h2>
      </aside>

      <div className="pointer-events-none fixed inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1600&auto=format&fit=crop"
          alt=""
          className="h-full w-full object-cover object-right opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D1B2A] via-[#0D1B2A]/85 via-40% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] via-transparent to-transparent" />
      </div>
    </main>
  );
}

function Input({ label, type = "text", placeholder, required = false }: { label: string; type?: string; placeholder: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#172033]">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-2xl border border-[#172033]/15 bg-white/90 px-4 py-3 text-sm text-[#172033] placeholder-[#172033]/50 shadow-sm transition-all focus:border-[#3B6FF5] focus:outline-none focus:ring-2 focus:ring-[#3B6FF5]/30"
      />
    </label>
  );
}

function Select({ label, placeholder, options = [] }: { label: string; placeholder: string; options?: string[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#172033]">{label}</span>
      <select
        required
        defaultValue=""
        className="w-full rounded-2xl border border-[#172033]/15 bg-white/90 px-4 py-3 text-sm text-[#172033] shadow-sm transition-all focus:border-[#3B6FF5] focus:outline-none focus:ring-2 focus:ring-[#3B6FF5]/30"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5 text-[#172033]">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.573 16.49 16.638 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5 text-[#172033]">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}
