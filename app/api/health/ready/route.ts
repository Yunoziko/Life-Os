import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, status: "ready", database: "ok" });
  } catch {
    return NextResponse.json({ ok: false, status: "not_ready", database: "error" }, { status: 503 });
  }
}
