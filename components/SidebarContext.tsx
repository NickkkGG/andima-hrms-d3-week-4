"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Sidebar open/closed state shared by the sidebar and the header burger.
// Desktop (>= 1024px): the burger hides or shows the whole sidebar, and the
// choice is remembered. Smaller screens: the same burger opens a drawer.
const storageKey = "andima_sidebar_collapsed";
const desktopQuery = "(min-width: 1024px)";

type SidebarContextValue = {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  closeMobileSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function isDesktop() {
  return window.matchMedia(desktopQuery).matches;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Read after mount: the server cannot know the stored choice.
  useEffect(() => {
    let stored = false;
    try {
      stored = window.localStorage.getItem(storageKey) === "true";
    } catch {
      // Blocked site data: keep the sidebar open.
    }
    if (!stored) return;
    const restore = window.setTimeout(() => setIsCollapsed(true), 0);
    return () => window.clearTimeout(restore);
  }, []);

  useEffect(() => {
    const media = window.matchMedia(desktopQuery);
    const closeDrawerOnDesktop = () => {
      if (media.matches) setIsMobileOpen(false);
    };
    media.addEventListener("change", closeDrawerOnDesktop);
    return () => media.removeEventListener("change", closeDrawerOnDesktop);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (!isDesktop()) {
      setIsMobileOpen((open) => !open);
      return;
    }
    setIsCollapsed((collapsed) => {
      const next = !collapsed;
      try {
        window.localStorage.setItem(storageKey, String(next));
      } catch {
        // Ignore: the toggle still works for this visit.
      }
      return next;
    });
  }, []);

  const closeMobileSidebar = useCallback(() => setIsMobileOpen(false), []);

  const value = useMemo(
    () => ({ isCollapsed, isMobileOpen, toggleSidebar, closeMobileSidebar }),
    [isCollapsed, isMobileOpen, toggleSidebar, closeMobileSidebar],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used inside SidebarProvider");
  return context;
}

// The blue three-bar button from the design system, used in the header and in
// the mobile drawer.
export function SidebarBurger({ onClick, label, className = "" }: { onClick: () => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex size-[28px] shrink-0 cursor-pointer flex-col items-center justify-center gap-[3.5px] rounded-[6px] bg-[#3B6FF5] shadow-2xs transition-colors hover:bg-[#2E61E6] active:bg-[#2554D1]${className ? ` ${className}` : ""}`}
    >
      <span className="block h-[1.75px] w-[14px] rounded-full bg-white" />
      <span className="block h-[1.75px] w-[14px] rounded-full bg-white" />
      <span className="block h-[1.75px] w-[14px] rounded-full bg-white" />
    </button>
  );
}
