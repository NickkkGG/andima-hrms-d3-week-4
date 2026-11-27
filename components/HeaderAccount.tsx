"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { SkeletonBlock } from "@/components/hrms/Skeleton";

// The role is kept as the stored value and translated while rendering, so the
// header follows the language toggle without reloading the account.
type Account = {
  initials: string;
  name: string | null;
  appRole: AccountAccess["app_role"];
};

type AccountAccess = {
  app_role: "EMPLOYEE" | "HR" | "MANAGER" | null;
  full_name: string | null;
};

const fallbackAccount: Account = {
  initials: "AU",
  name: null,
  appRole: null,
};

function roleLabel(role: AccountAccess["app_role"], t: ReturnType<typeof useLanguage>["t"]) {
  if (role === "HR") return "HR";
  if (role === "MANAGER") return t("manager");
  if (role === "EMPLOYEE") return t("employee");
  return t("hrmsUser");
}

export default function HeaderAccount() {
  const { t } = useLanguage();
  // null while the session is read, so the header shows a skeleton instead of a
  // placeholder name.
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAccount() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!isMounted) return;
      if (!user) {
        setAccount(fallbackAccount);
        return;
      }

      const { data: access } = await supabase
        .from("b2_register")
        .select("app_role, full_name")
        .eq("auth_user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      const accountAccess = access as unknown as AccountAccess | null;
      const metadataName = user.user_metadata?.full_name;
      const registeredName = typeof metadataName === "string" && metadataName.trim()
        ? metadataName.trim()
        : user.email?.split("@")[0] ?? null;
      const name = accountAccess?.full_name?.trim() || registeredName;
      const initials = (name ?? "")
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || fallbackAccount.initials;

      if (isMounted) {
        setAccount({ initials, name, appRole: accountAccess?.app_role ?? null });
      }
    }

    // A failed lookup falls back to the generic label instead of a skeleton that never ends.
    void loadAccount().catch(() => {
      if (isMounted) setAccount((current) => current ?? fallbackAccount);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Account chip from the class design system: 32px initials circle, name and
  // role. Not clickable; logout lives in the sidebar.
  if (!account) {
    return (
      <div className="flex items-center gap-2.5">
        <SkeletonBlock className="size-8 rounded-full" />
        <div className="hidden space-y-1.5 sm:block"><SkeletonBlock className="h-3 w-24" /><SkeletonBlock className="h-2.5 w-14" /></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 select-none items-center justify-center rounded-full border border-[#BFDBFE] bg-[#DBEAFE] text-[13px] font-semibold text-[#121B2E]">
        {account.initials}
      </span>
      <div className="hidden min-w-0 flex-col text-left leading-tight sm:flex">
        <span className="max-w-36 truncate text-[12px] font-bold tracking-[-0.01em] text-[#121B2E]">{account.name ?? t("hrmsUser")}</span>
        <span className="mt-0.5 max-w-36 truncate text-[10.5px] font-normal text-[#64748B]">{roleLabel(account.appRole, t)}</span>
      </div>
    </div>
  );
}
