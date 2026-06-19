import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { url } = await request.json();
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  // Extract business name from domain
  const domain = new URL(url).hostname.replace("www.", "");
  const nameParts = domain.split(".")[0].split(/[-_]/);
  const businessName = nameParts
    .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");

  // Simulate extraction from website
  const data = {
    business_name: businessName,
    services: [
      { name: "Haircut & Styling", duration: 45, price: 85 },
      { name: "Facial Treatment", duration: 60, price: 120 },
      { name: "Botox Injection", duration: 30, price: 250 },
      { name: "Deep Tissue Massage", duration: 60, price: 110 },
    ],
    business_hours: {
      monday: "9:00 AM - 6:00 PM",
      tuesday: "9:00 AM - 6:00 PM",
      wednesday: "9:00 AM - 6:00 PM",
      thursday: "9:00 AM - 7:00 PM",
      friday: "9:00 AM - 5:00 PM",
      saturday: "9:00 AM - 2:00 PM",
      sunday: "Closed",
    },
    faq: [
      { q: "What is your cancellation policy?", a: "We require 24 hours notice for cancellations." },
      { q: "Do you accept walk-ins?", a: "Yes, but appointments are recommended." },
    ],
  };

  return NextResponse.json({ data });
}
