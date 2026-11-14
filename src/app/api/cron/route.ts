import { NextResponse, type NextRequest } from "next/server";
import { addDays, utcDateKey } from "@/lib/dates";
import { getOrCreatePuzzle } from "@/lib/puzzles";

export const maxDuration = 300;

/** Vercel Cron: make sure today's and the next two days' puzzles exist before anyone needs them. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret ? auth !== `Bearer ${secret}` : process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = utcDateKey();
  const results: Record<string, string> = {};
  for (const date of [today, addDays(today, 1), addDays(today, 2)]) {
    try {
      const p = await getOrCreatePuzzle(date);
      results[date] = `#${p.number} ${p.acronym} (${p.source})`;
    } catch (err) {
      results[date] = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  return NextResponse.json({ ok: true, results });
}
