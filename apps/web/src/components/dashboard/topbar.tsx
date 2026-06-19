"use client";

import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { FeedbackDialog } from "@/components/dashboard/feedback-dialog";

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/inbox": "Conversations",
  "/appointments": "Calendar",
  "/clients": "Clients",
  "/campaigns": "Campaigns",
  "/settings": "Settings",
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const title = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path)
  )?.[1] ?? "Dashboard";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <header className="h-16 flex-shrink-0 bg-white border-b border-slate-100 flex items-center justify-between px-8">
      <div className="flex items-center gap-3 md:hidden">
        <span className="font-editorial text-lg font-semibold">AuraBooking.</span>
      </div>
      <h1 className="text-lg font-medium tracking-tight text-slate-900">
        {title}
      </h1>

      <div className="flex items-center gap-4">
        <FeedbackDialog />
        <button className="text-sm font-medium text-slate-500 hover:text-black transition-colors">
          Support
        </button>
        <button
          onClick={handleSignOut}
          className="text-sm font-medium text-slate-500 hover:text-black transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
