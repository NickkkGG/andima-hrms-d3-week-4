"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type IdleSessionStatus = {
  status: "ACTIVE" | "EXPIRED" | "LOCATION_UNMAPPED" | "MISSING_SESSION" | "PROFILE_UNAVAILABLE";
  expires_at: string | null;
  time_zone: string | null;
  work_location: string | null;
  idle_timeout_seconds: number;
  warning_seconds: number;
};

type ActiveIdleSession = IdleSessionStatus & {
  status: "ACTIVE";
  expires_at: string;
  time_zone: string;
  work_location: string;
};

const activityEvents = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
const activityThrottleMs = 15_000;
const expiredStatusRetryMs = 15_000;
const sessionBroadcastChannel = "andima-d3-idle-session";

function firstStatus(data: unknown): IdleSessionStatus | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const value = data[0];
  if (!value || typeof value !== "object" || !("status" in value)) return null;
  return value as IdleSessionStatus;
}

function isActiveStatus(status: IdleSessionStatus | null): status is ActiveIdleSession {
  return Boolean(
    status
      && status.status === "ACTIVE"
      && typeof status.expires_at === "string"
      && typeof status.time_zone === "string"
      && typeof status.work_location === "string",
  );
}

function zoneLabel(timeZone: string) {
  if (timeZone === "Asia/Jakarta") return "WIB";
  if (timeZone === "Asia/Makassar") return "WITA";
  if (timeZone === "Asia/Jayapura") return "WIT";
  return timeZone;
}

function formatDeadline(expiresAt: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(expiresAt));
  } catch {
    return "-";
  }
}

export default function SessionIdleGuard() {
  const router = useRouter();
  const [session, setSession] = useState<ActiveIdleSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const lastTouchAt = useRef(0);
  const lastExpiredStatusCheckAt = useRef(0);
  const isSigningOut = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const signOutForPolicy = useCallback(async (reason: "idle" | "location" | "profile" = "idle") => {
    if (isSigningOut.current) return;
    isSigningOut.current = true;

    try {
      await createClient().auth.signOut({ scope: "local" });
    } finally {
      router.replace(`/login?reason=${reason}`);
      router.refresh();
    }
  }, [router]);

  const applyActiveSession = useCallback((next: ActiveIdleSession, broadcast = false) => {
    setSession(next);
    if (broadcast) {
      channelRef.current?.postMessage({ type: "session-updated", session: next });
    }
  }, []);

  const resolveCurrentStatus = useCallback(async () => {
    const { data, error } = await createClient().rpc("d3_get_idle_session_status");

    // A transient API error must not cause an unexpected logout. Route-level
    // enforcement will retry on the next navigation/request.
    if (error) return;

    const status = firstStatus(data);
    if (isActiveStatus(status)) {
      applyActiveSession(status);
      return;
    }

    if (status) {
      await signOutForPolicy(
        status.status === "LOCATION_UNMAPPED"
          ? "location"
          : status.status === "PROFILE_UNAVAILABLE"
            ? "profile"
            : "idle",
      );
    }
  }, [applyActiveSession, signOutForPolicy]);

  const touchSession = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastTouchAt.current < activityThrottleMs) return;
    lastTouchAt.current = now;

    const { data, error } = await createClient().rpc("d3_touch_idle_session");
    if (error) return;

    const status = firstStatus(data);
    if (isActiveStatus(status)) {
      applyActiveSession(status, true);
      return;
    }

    if (status) {
      await signOutForPolicy(
        status.status === "LOCATION_UNMAPPED"
          ? "location"
          : status.status === "PROFILE_UNAVAILABLE"
            ? "profile"
            : "idle",
      );
    }
  }, [applyActiveSession, signOutForPolicy]);

  useEffect(() => {
    void resolveCurrentStatus();
  }, [resolveCurrentStatus]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(sessionBroadcastChannel);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const payload = event.data;
      if (!payload || typeof payload !== "object" || !("session" in payload)) return;
      const next = (payload as { session: IdleSessionStatus }).session;
      if (isActiveStatus(next)) applyActiveSession(next);
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [applyActiveSession]);

  useEffect(() => {
    const onActivity = (event: Event) => {
      if (!event.isTrusted) return;
      void touchSession();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void resolveCurrentStatus();
    };

    activityEvents.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, onActivity));
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [resolveCurrentStatus, touchSession]);

  useEffect(() => {
    if (!session) return;

    const updateRemainingTime = () => {
      const nextRemaining = Math.max(0, Math.ceil((new Date(session.expires_at).getTime() - Date.now()) / 1000));
      setRemainingSeconds(nextRemaining);
      if (nextRemaining === 0 && Date.now() - lastExpiredStatusCheckAt.current >= expiredStatusRetryMs) {
        lastExpiredStatusCheckAt.current = Date.now();
        void resolveCurrentStatus();
      }
    };

    updateRemainingTime();
    const timer = window.setInterval(updateRemainingTime, 1000);
    return () => window.clearInterval(timer);
  }, [resolveCurrentStatus, session]);

  const isWarningVisible = Boolean(
    session
      && remainingSeconds !== null
      && remainingSeconds > 0
      && remainingSeconds <= session.warning_seconds,
  );

  if (!session || !isWarningVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="idle-session-title">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Peringatan sesi</p>
        <h2 id="idle-session-title" className="mt-2 text-xl font-bold text-slate-900">Sesi Anda akan berakhir</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Tidak ada aktivitas terdeteksi. Anda akan logout otomatis dalam <strong>{remainingSeconds} detik</strong>.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Batas sesi: {formatDeadline(session.expires_at, session.time_zone)} {zoneLabel(session.time_zone)} ({session.work_location}).
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => void signOutForPolicy()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Logout sekarang
          </button>
          <button
            type="button"
            onClick={() => void touchSession(true)}
            className="rounded-lg bg-[#155cfd] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#124bd0]"
          >
            Lanjutkan sesi
          </button>
        </div>
      </section>
    </div>
  );
}
