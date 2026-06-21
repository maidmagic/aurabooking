import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ url: "https://buy.stripe.com/test_..." }, { status: 501 });
}
