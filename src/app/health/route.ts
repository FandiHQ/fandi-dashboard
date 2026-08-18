import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { status: "ok", service: "fandi-dashboard" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
