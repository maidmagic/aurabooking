"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "⌘" },
  { href: "/inbox", label: "Conversations", icon: "💬" },
  { href: "/onboarding", label: "Setup", icon: "🚀" },
  { href: "/appointments", label: "Calendar", icon: "📅" },
  { href: "/clients", label: "Clients", icon: "👥" },
  { href: "/campaigns", label: "Campaigns", icon: "⚡" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string; name?: string }>({});

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata;
      setUser({
        email: data.user?.email,
        name: meta?.full_name || meta?.name || data.user?.email,
      });
    });
  }, []);

  const initials = (user.name ?? "U")
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col justify-between hidden md:flex min-h-screen">
      <div>
        <div className="h-16 flex items-center px-6 border-b border-slate-50">
          <span className="font-editorial text-xl font-semibold tracking-tight">
            AuraBooking.
          </span>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-slate-100 text-black"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-50 space-y-1">
        <Link
          href="/portal/inbox"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            pathname.startsWith("/portal")
              ? "bg-slate-100 text-black"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <span className="text-base">✦</span>
          Simplified View
        </Link>
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            pathname.startsWith("/settings")
              ? "bg-slate-100 text-black"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <span className="text-base">⚙️</span>
          Settings
        </Link>
        <div className="mt-4 flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
          <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-medium">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-900">
              {user.name ?? "User"}
            </span>
            <span className="text-[10px] text-slate-500">
              {user.email ?? ""}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
