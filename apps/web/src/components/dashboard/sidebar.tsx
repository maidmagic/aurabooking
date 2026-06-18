"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Calendar,
  CalendarCheck,
  Plug,
  Settings,
  Bell,
  Flame,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/lead-engage", label: "Lead Engage", icon: Flame },
  { href: "/appointments", label: "Appointments", icon: CalendarCheck },
  { href: "/settings/reminders", label: "Reminders", icon: Bell },
  { href: "/ai-config", label: "AI Config", icon: Bot },
  { href: "/campaigns", label: "Campaigns", icon: Calendar },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card min-h-screen p-4 hidden lg:flex flex-col">
      <div className="mb-8 px-2">
        <h1 className="text-lg font-semibold text-foreground">AuraBooking</h1>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
