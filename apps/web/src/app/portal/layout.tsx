import Link from "next/link";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-gray-900 antialiased">
      {/* Minimal top bar */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link href="/portal/inbox" className="font-serif text-lg tracking-tight text-gray-800">
              Aura
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/portal/inbox"
                className="rounded-md px-3 py-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
              >
                Inbox
              </Link>
              <Link
                href="/portal/analytics"
                className="rounded-md px-3 py-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
              >
                Analytics
              </Link>
            </nav>
          </div>
          <a
            href="/"
            className="text-xs text-gray-300 transition-colors hover:text-gray-500"
          >
            Settings
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        {children}
      </div>
    </div>
  );
}
