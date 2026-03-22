import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperadmin } from "@/lib/config";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    return NextResponse.json({
      isSuperadmin: isSuperadmin(session?.user?.email),
    });
  } catch {
    return NextResponse.json({ isSuperadmin: false });
  }
}
