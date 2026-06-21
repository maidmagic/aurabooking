import { CreditCard, Users, MapPin, Bell, Zap, Monitor, Star, Building2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SETTINGS_LINKS = [
  {
    href: "/settings/business-profile",
    icon: Building2,
    title: "Business Profile",
    description: "Business info, policies, and FAQs the AI uses to respond accurately.",
  },
  {
    href: "/settings/connections",
    icon: Zap,
    title: "Connections",
    description: "Monitor integration health and configure webhook access.",
  },
  {
    href: "/settings/billing",
    icon: CreditCard,
    title: "Billing",
    description: "Manage your subscription and payment history.",
  },
  {
    href: "/settings/team",
    icon: Users,
    title: "Team",
    description: "Manage team members and their roles.",
  },
  {
    href: "/settings/locations",
    icon: MapPin,
    title: "Locations",
    description: "Manage your business locations.",
  },
  {
    href: "/settings/reminders",
    icon: Bell,
    title: "Reminders",
    description: "Configure appointment reminder settings.",
  },
  {
    href: "/settings/pms",
    icon: Monitor,
    title: "PMS / EHR",
    description: "Connect your practice management software for real-time booking.",
  },
  {
    href: "/settings/reviews",
    icon: Star,
    title: "Reviews",
    description: "Automate Google Review requests after appointments.",
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and business settings.
        </p>
      </div>
      <div className="grid gap-4">
        {SETTINGS_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{link.title}</CardTitle>
                      <CardDescription>{link.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
