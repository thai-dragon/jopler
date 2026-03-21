import { NextRequest, NextResponse } from "next/server";
import { getLogs, getLogsSince } from "@/lib/log-store";

export async function GET(req: NextRequest) {
  try {
    const since = req.nextUrl.searchParams.get("since");
    if (since) {
      return NextResponse.json(getLogsSince(parseInt(since, 10)));
    }
    return NextResponse.json(getLogs());
  } catch (err) {
    console.error("[API /logs] error:", err);
    return NextResponse.json({ logs: [], status: "idle", startedAt: null });
  }
}
