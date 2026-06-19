import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-8 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
        <p>© 2026 AuraBooking. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link href="/gdpr" className="hover:text-foreground transition-colors">GDPR/CCPA</Link>
        </div>
      </div>
    </footer>
  );
}
